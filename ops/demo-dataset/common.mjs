import { createRequire } from 'node:module';

import pool from '../../apps/api/src/db/pool.js';
import { decrypt, encrypt, encryptJson, deriveLookupHash } from '../../apps/api/src/lib/encrypt.js';
import { buildDemoDataset } from './manifest.mjs';

const requireFromApiWorkspace = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const argon2 = requireFromApiWorkspace('argon2');
const mysql2 = requireFromApiWorkspace('mysql2');

const TENANT_SCOPED_PURGE_ORDER = Object.freeze([
  'sessions',
  'portal_sessions',
  'portal_password_resets',
  'payments',
  'superbills',
  'claims',
  'invoices',
  'offerings',
  'form_submissions',
  'form_assignments',
  'document_assignments',
  'portal_messages',
  'portal_message_threads',
  'portal_uploads',
  'portal_data_right_requests',
  'portal_appointment_requests',
  'portal_client_profiles',
  'portal_accounts',
  'reminders',
  'progress_notes',
  'appointment_series',
  'appointments',
  'waitlist_metadata',
  'faith_church_referrals',
  'inventory_assignments',
  'consent_records',
  'intake_packets',
  'treatment_plans',
  'client_addresses',
  'client_phones',
  'client_contacts',
  'client_insurance',
  'client_referring_providers',
  'client_diagnoses',
  'client_medications',
  'client_allergies',
  'client_clinical_history',
  'client_faith_profiles',
  'client_legal',
  'client_lifecycles',
  'availability_overrides',
  'availability_templates',
  'staff_licenses',
  'staff_certifications',
  'staff_specialty_profiles',
  'staff_employment',
  'staff_faith_profiles',
  'staff_accounts',
  'staff_members',
  'clients',
  'locations',
  'portal_resources',
  'portal_settings',
  'form_catalog',
  'fee_schedules',
  'service_codes',
]);

export function hasDbEnv() {
  return Boolean(process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_ENCRYPTION_KEY);
}

export function toSqlTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function toSqlDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function closeDemoDatasetPool() {
  await pool.end().catch(() => {});
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

function formatSqlStatement(sql, params = []) {
  return `${mysql2.format(sql, params).trim().replace(/;$/, '')};`;
}

function createSqlRecorder() {
  const statements = [];

  return {
    statements,
    connection: {
      async query(sql, params = []) {
        statements.push(formatSqlStatement(sql, params));
        return [[], []];
      },
    },
  };
}

function buildStaticResetStatements(dataset) {
  const skippedTenantDeletes = new Set(['payments', 'superbills', 'claims', 'portal_messages', 'document_assignments']);
  const statements = [
    formatSqlStatement(
      `DELETE FROM payments
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = ?
         ) AS seeded_invoices
       )`,
      [dataset.tenantId],
    ),
    formatSqlStatement(
      `DELETE FROM superbills
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = ?
         ) AS seeded_invoices
       )`,
      [dataset.tenantId],
    ),
    formatSqlStatement(
      `DELETE FROM claims
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = ?
         ) AS seeded_invoices
       )`,
      [dataset.tenantId],
    ),
    formatSqlStatement(
      `DELETE FROM portal_messages
       WHERE thread_id IN (
         SELECT id FROM (
           SELECT id FROM portal_message_threads WHERE tenant_id = ?
         ) AS seeded_threads
       )`,
      [dataset.tenantId],
    ),
    formatSqlStatement(
      `DELETE FROM document_assignments
       WHERE assignee_type = 'client'
         AND assignee_id IN (
           SELECT id FROM (
             SELECT id FROM clients WHERE tenant_id = ?
           ) AS seeded_clients
         )`,
      [dataset.tenantId],
    ),
  ];

  for (const table of TENANT_SCOPED_PURGE_ORDER) {
    if (skippedTenantDeletes.has(table)) continue;
    statements.push(formatSqlStatement(`DELETE FROM \`${table}\` WHERE tenant_id = ?`, [dataset.tenantId]));
  }

  return statements;
}

async function purgeTableByTenant(connection, table, tenantId) {
  const [result] = await connection.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenantId]);
  return result.affectedRows ?? 0;
}

async function deleteByIds(connection, table, idColumn, ids) {
  if (!ids.length) return 0;
  const [result] = await connection.query(
    `DELETE FROM ${table} WHERE ${idColumn} IN (${placeholders(ids)})`,
    ids,
  );
  return result.affectedRows ?? 0;
}

async function buildCredentialHashes(dataset) {
  const adminPasswordHash = await argon2.hash(dataset.staffPasswords.admin, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  const counselorPasswordHash = await argon2.hash(dataset.staffPasswords.counselor, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  const portalPasswordHash = await argon2.hash(dataset.portalPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  return { adminPasswordHash, counselorPasswordHash, portalPasswordHash };
}

async function resetSystemTenantData(connection, dataset) {
  const deleted = {};

  const [invoiceRows] = await connection.query(
    'SELECT id FROM invoices WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const invoiceIds = invoiceRows.map((row) => row.id);
  deleted.payments = await deleteByIds(connection, 'payments', 'invoice_id', invoiceIds);
  deleted.superbills = await deleteByIds(connection, 'superbills', 'invoice_id', invoiceIds);
  deleted.claims = await deleteByIds(connection, 'claims', 'invoice_id', invoiceIds);

  const [threadRows] = await connection.query(
    'SELECT id FROM portal_message_threads WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const threadIds = threadRows.map((row) => row.id);
  deleted.portal_messages = await deleteByIds(connection, 'portal_messages', 'thread_id', threadIds);

  const [clientRows] = await connection.query(
    'SELECT id FROM clients WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const clientIds = clientRows.map((row) => row.id);
  if (clientIds.length) {
    const [documentAssignmentResult] = await connection.query(
      `DELETE FROM document_assignments
        WHERE assignee_type = 'client'
          AND assignee_id IN (${placeholders(clientIds)})`,
      clientIds,
    );
    deleted.document_assignments = documentAssignmentResult.affectedRows ?? 0;
  } else {
    deleted.document_assignments = 0;
  }

  for (const table of TENANT_SCOPED_PURGE_ORDER) {
    if (deleted[table] !== undefined) continue;
    deleted[table] = await purgeTableByTenant(connection, table, dataset.tenantId);
  }

  return deleted;
}

async function insertTenantAndPractice(connection, dataset) {
  await connection.query(
    `INSERT INTO tenants (id, name, plan_type)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), plan_type = VALUES(plan_type)`,
    [dataset.tenantId, dataset.tenantName, 'standard'],
  );

  await connection.query(
    `INSERT INTO practices (id, tenant_id, name, practice_type, timezone)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       practice_type = VALUES(practice_type),
       timezone = VALUES(timezone)`,
    [
      dataset.practiceId,
      dataset.tenantId,
      dataset.practiceName,
      'solo',
      dataset.practiceTimezone,
    ],
  );

  await connection.query(
    `INSERT INTO locations (id, tenant_id, practice_id, name, address_enc, capacity, remote_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       practice_id = VALUES(practice_id),
       name = VALUES(name),
       address_enc = VALUES(address_enc),
       capacity = VALUES(capacity),
       remote_enabled = VALUES(remote_enabled)`,
    [
      dataset.locationId,
      dataset.tenantId,
      dataset.practiceId,
      dataset.locationName,
      encrypt('742 Shepherd Lane, Lakeland, FL 33813'),
      4,
      1,
    ],
  );
}

async function insertStaff(connection, dataset, hashes) {
  for (const staff of dataset.staff) {
    await connection.query(
      `INSERT INTO staff_members
         (id, tenant_id, role, first_name_enc, last_name_enc, license_type, license_number_enc, supervision_status, bio_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staff.id,
        dataset.tenantId,
        staff.role,
        encrypt(staff.firstName),
        encrypt(staff.lastName),
        staff.licenseType ?? null,
        encrypt(staff.licenseNumber ?? null),
        staff.supervisionStatus ?? 'not_required',
        encrypt(staff.bio ?? null),
      ],
    );

    await connection.query(
      `INSERT INTO staff_accounts
         (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 0)`,
      [
        staff.accountId,
        staff.id,
        dataset.tenantId,
        null,
        encrypt(staff.email),
        deriveLookupHash(staff.email, { lowercase: true }),
        staff.role === 'practice_admin' ? hashes.adminPasswordHash : hashes.counselorPasswordHash,
      ],
    );

    if (staff.role !== 'counselor') continue;

    await connection.query(
      `INSERT INTO staff_licenses
         (id, staff_id, tenant_id, license_type, license_number_enc, issuing_state, issuing_body, issue_date, expiry_date, status, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
      [
        `lic-${staff.id}`,
        staff.id,
        dataset.tenantId,
        staff.licenseType,
        encrypt(staff.licenseNumber),
        staff.licenseState,
        'Florida Board',
        '2019-01-15',
        '2027-12-31',
      ],
    );

    await connection.query(
      `INSERT INTO staff_certifications
         (id, staff_id, tenant_id, cert_name, issuing_body, issue_date, expiry_date, cert_number_enc, ceu_hours, is_ceu, notes_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `cert-${staff.id}`,
        staff.id,
        dataset.tenantId,
        'Trauma-Informed Care Certification',
        'Faith Counseling Institute',
        '2024-03-01',
        '2027-03-01',
        encrypt(`${staff.id.toUpperCase()}-CERT`),
        12,
        1,
        encrypt('Maintained for demo counselor profiles.'),
      ],
    );

    await connection.query(
      `INSERT INTO staff_specialty_profiles
         (id, staff_id, tenant_id, specialties, modalities, age_groups_served, languages, max_caseload, notes_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `spec-${staff.id}`,
        staff.id,
        dataset.tenantId,
        JSON.stringify(staff.specialties ?? []),
        JSON.stringify(staff.modalities ?? []),
        JSON.stringify(staff.ageGroupsServed ?? []),
        JSON.stringify(staff.languages ?? []),
        24,
        encrypt('Canonical human-testing counselor profile.'),
      ],
    );

    await connection.query(
      `INSERT INTO staff_employment
         (id, staff_id, tenant_id, employment_type, employment_status, hire_date, npi_number_enc, malpractice_insurer, malpractice_policy_enc, malpractice_expiry, direct_phone_enc, location_ids)
       VALUES (?, ?, ?, 'full_time', 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        `emp-${staff.id}`,
        staff.id,
        dataset.tenantId,
        '2021-06-01',
        encrypt(`${staff.id.toUpperCase()}-NPI`),
        'Shepherd Mutual',
        encrypt(`${staff.id.toUpperCase()}-POLICY`),
        '2027-06-30',
        encrypt(staff.directPhone),
        JSON.stringify([dataset.locationId]),
      ],
    );

    await connection.query(
      `INSERT INTO staff_faith_profiles
         (id, staff_id, tenant_id, faith_tradition, theological_approach_enc, ordained, ordaining_body, aacc_member, acbc_certified, ccca_member, other_faith_credentials_enc, prayer_integration, scripture_integration, spiritual_gifts_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `faith-${staff.id}`,
        staff.id,
        dataset.tenantId,
        staff.faithTradition,
        encrypt(staff.theologicalApproach),
        1,
        staff.ordainingBody,
        1,
        0,
        1,
        encrypt('Faith-based counseling credentialed for demo dataset.'),
        staff.prayerIntegration,
        staff.scriptureIntegration,
        encrypt('encouragement, discernment, hospitality'),
      ],
    );

    await connection.query(
      `INSERT INTO availability_templates
         (id, staff_id, tenant_id, slots)
       VALUES (?, ?, ?, ?)`,
      [
        `avail-${staff.id}`,
        staff.id,
        dataset.tenantId,
        JSON.stringify([
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', locationId: dataset.locationId, remoteAvailable: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', locationId: dataset.locationId, remoteAvailable: true },
          { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', locationId: dataset.locationId, remoteAvailable: true },
        ]),
      ],
    );
  }
}

async function insertFormCatalog(connection, dataset) {
  for (const item of dataset.formCatalog) {
    await connection.query(
      `INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        item.id,
        dataset.tenantId,
        item.formKey,
        item.title,
        item.category,
        item.isStandardOnSignup ? 1 : 0,
      ],
    );
  }
}

async function insertPortalSettingsAndResources(connection, dataset) {
  await connection.query(
    `INSERT INTO portal_settings
       (id, tenant_id, practice_name, logo_url, brand_color, accent_color, welcome_headline, welcome_message, help_message,
        support_email_enc, registration_mode, allow_create_account, allow_care_requests, allow_scheduling_requests,
        show_public_counselor_directory, financial_mode, suggested_offering_cents, offering_ministry_note, contact_preference_options, default_signup_form_keys)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'portal-settings-system',
      dataset.tenantId,
      dataset.practiceName,
      '',
      '#1f7a8c',
      '#f0f7f8',
      'Welcome back to Grace Counseling',
      'This human-testing dataset is reset after every verified fix so the practice stays predictable for walkthroughs.',
      'Use the portal to review forms, upcoming care tasks, and offerings history.',
      encrypt('support@churchcorecare.local'),
      'review_required',
      1,
      1,
      1,
      1,
      'offerings',
      5000,
      'Your gift helps sustain this counseling ministry and expand care for others.',
      JSON.stringify(['email', 'phone', 'portal_message']),
      JSON.stringify(dataset.defaultSignupFormKeys),
    ],
  );

  for (const item of dataset.portalResources) {
    await connection.query(
      `INSERT INTO portal_resources
         (id, tenant_id, title, content, resource_type, audience, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        dataset.tenantId,
        item.title,
        item.content,
        item.resourceType,
        item.audience,
        toSqlTimestamp(item.publishedAt),
      ],
    );
  }
}

async function insertBillingCatalog(connection, dataset) {
  for (const item of dataset.serviceCodes) {
    await connection.query(
      `INSERT INTO service_codes
         (id, tenant_id, code, name, category, default_duration_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        dataset.tenantId,
        item.code,
        item.name,
        item.category,
        item.defaultDurationMinutes,
        item.status,
      ],
    );
  }

  for (const item of dataset.feeSchedules) {
    await connection.query(
      `INSERT INTO fee_schedules
         (id, tenant_id, name, status, currency, schedule_lines)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        dataset.tenantId,
        item.name,
        item.status,
        item.currency,
        JSON.stringify(item.lines ?? []),
      ],
    );
  }
}

async function insertClientBundle(connection, dataset, client, hashes) {
  await connection.query(
    `INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      client.id,
      dataset.tenantId,
      encrypt(client.firstName),
      encrypt(client.lastName),
      client.faithBackground,
      client.highTouchpoint ? 1 : 0,
      client.counselorId,
    ],
  );

  await connection.query(
    `INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [
      `life-${client.id}`,
      client.id,
      dataset.tenantId,
      client.referralSourceDetail,
      encryptJson({
        name: client.contacts[0].name,
        relationship: client.contacts[0].relationship,
        phone: client.contacts[0].phone,
      }),
      JSON.stringify({
        readiness: 'stable',
        demoDataset: true,
      }),
    ],
  );

  await connection.query(
    `INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES (?, ?, ?, 'primary', ?, NULL, ?, ?, ?, 'US', 1)`,
    [
      `addr-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.addressLine1),
      encrypt(client.city),
      client.state,
      encrypt(client.postalCode),
    ],
  );

  await connection.query(
    `INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES (?, ?, ?, 'cell', ?, NULL, 1, 1, 1)`,
    [
      `phone-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.phone),
    ],
  );

  await connection.query(
    `INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      client.contacts[0].id,
      dataset.tenantId,
      client.id,
      client.isMinor ? 'guardian' : 'emergency',
      encrypt(client.contacts[0].name),
      client.contacts[0].relationship,
      encrypt(client.contacts[0].phone),
      encrypt(client.contacts[0].email),
      client.isMinor ? 1 : 0,
      encrypt('Canonical contact for the human-testing dataset.'),
    ],
  );

  await connection.query(
    `INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES (?, ?, ?, 'primary', ?, ?, ?, ?, ?, ?, 'self', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      `ins-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.insuranceCarrier),
      client.insurancePlan,
      encrypt(`${client.id.toUpperCase()}-MEMBER`),
      encrypt(`${client.id.toUpperCase()}-GROUP`),
      encrypt(`${client.firstName} ${client.lastName}`),
      encrypt(client.dob),
      encrypt(`AUTH-${client.id.toUpperCase()}`),
      12,
      '2026-12-31',
      encrypt(`REF-${client.id.toUpperCase()}`),
      2500,
      '2026-01-01',
      '2026-12-31',
      client.lastMonthDate,
      'demo-finalizer',
    ],
  );

  await connection.query(
    `INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `refprov-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.providerName),
      'Grace Family Medicine',
      `NPI${String(client.id).replace(/\D/g, '').padStart(10, '0')}`.slice(0, 10),
      encrypt(`555-510-${client.id.slice(-2).padStart(4, '0')}`),
      encrypt(`555-610-${client.id.slice(-2).padStart(4, '0')}`),
      encryptJson({
        line1: client.addressLine1,
        city: client.city,
        state: client.state,
        postal: client.postalCode,
        country: 'US',
      }),
      client.lastMonthDate,
      encrypt('Referred for counseling follow-up and coordinated care planning.'),
    ],
  );

  await connection.query(
    `INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES (?, ?, ?, 'DSM-5', ?, ?, ?, 'active', 1, ?, ?)`,
    [
      `diag-${client.id}`,
      dataset.tenantId,
      client.id,
      client.diagnosisCode,
      encrypt(client.diagnosisDescription),
      client.lastMonthDate,
      encrypt('Primary working diagnosis for canonical demo charting.'),
      client.counselorId,
    ],
  );

  await connection.query(
    `INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, 'oral', ?, ?, NULL, 1, ?, ?)`,
    [
      `med-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.medicationName),
      encrypt(client.medicationName === 'None' ? 'N/A' : '10 mg'),
      encrypt(client.medicationName === 'None' ? 'N/A' : 'daily'),
      encrypt(client.providerName),
      client.lastMonthDate,
      encrypt('Symptom support'),
      encrypt('Medication entry kept for demo chart completeness.'),
    ],
  );

  await connection.query(
    `INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES (?, ?, ?, ?, ?, 'moderate', 'drug', ?, 1)`,
    [
      `allergy-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.allergySubstance),
      encrypt('Hives and swelling'),
      client.lastMonthDate,
    ],
  );

  await connection.query(
    `INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES (?, ?, ?, 0, NULL, 0, NULL, ?, ?, ?, ?, ?, ?, 1, ?, 0, NULL, ?, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?)`,
    [
      `hist-${client.id}`,
      dataset.tenantId,
      client.id,
      encryptJson(['seasonal allergies', 'episodic insomnia']),
      encrypt(client.providerName),
      encrypt('Grace Family Medicine'),
      encrypt('555-710-1000'),
      encryptJson({
        name: 'WellCare Pharmacy',
        phone: '555-710-2000',
      }),
      encryptJson({
        alcohol: 'low',
        nicotine: 'none',
        otherSubstances: 'denied',
      }),
      encrypt('Brief counseling during prior life transition.'),
      encrypt(client.diagnosisDescription),
      encrypt('No acute safety concerns; protective factors include faith community and family support.'),
      toSqlTimestamp(client.timeline.noteAppointment.endsAt),
      client.counselorId,
    ],
  );

  // faith_integration_level: 'actively_integrated' for clients who opted in (triggers spiritual rules)
  const faithIntegrationLevel = client.faithIntegration ? 'actively_integrated' : 'open';
  await connection.query(
    `INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `cfaith-${client.id}`,
      dataset.tenantId,
      client.id,
      client.faithBackground,
      encrypt(client.churchName),
      encrypt('Pastor Daniel Hart'),
      encrypt('None assigned'),
      faithIntegrationLevel,
      encrypt('Wants counseling to reinforce hope, trust, and wise boundaries.'),
      encrypt('None reported'),
      encrypt('Prayer, worship, scripture reflection, and trusted church relationships.'),
    ],
  );

  await connection.query(
    `INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `legal-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.guardianName),
      client.guardianName ? 'parent' : null,
      encrypt(client.guardianName ? client.contacts[0].phone : null),
      encrypt(client.guardianName ? client.contacts[0].email : null),
      encryptJson(client.guardianName ? {
        line1: client.addressLine1,
        city: client.city,
        state: client.state,
        postal: client.postalCode,
        country: 'US',
      } : null),
      client.isMinor ? 1 : 0,
      encrypt(client.isMinor ? `COURT-${client.id.toUpperCase()}` : null),
      encryptJson(client.isMinor ? { contact: 'School support team', phone: '555-999-1100' } : null),
      client.isMinor ? '2026-12-31' : null,
      encrypt(client.isMinor ? 'Guardian participation approved for scheduling and treatment planning.' : null),
    ],
  );

  await connection.query(
    `INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES (?, ?, ?, 'informed_consent', 'signed', 'v1', ?, ?, ?)`,
    [
      `consent-${client.id}`,
      dataset.tenantId,
      client.id,
      toSqlTimestamp(client.timeline.completedAppointment.endsAt),
      toSqlTimestamp(client.timeline.noteAppointment.endsAt),
      toSqlTimestamp(client.timeline.completedAppointment.endsAt),
    ],
  );

  await connection.query(
    `INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES (?, ?, ?, 'completed', ?, ?)`,
    [
      `intake-${client.id}`,
      dataset.tenantId,
      client.id,
      JSON.stringify(client.assignedForms),
      toSqlTimestamp(client.intakeSubmittedAt),
    ],
  );

  // Enriched clients use goal objects { description, status, targetDate } so rules engine
  // can check g.status === 'completed' (discharge) and g.targetDate (overdue goals).
  // All other clients use simple string goals that are still clinically coherent.
  const treatmentPlanGoals = client.treatmentPlanGoals ?? [
    { description: 'Reduce symptom intensity by 30 percent over the next 90 days.', status: 'in_progress', targetDate: null },
    { description: 'Strengthen coping consistency between sessions.', status: 'in_progress', targetDate: null },
    { description: 'Integrate faith practices only where welcomed and clinically helpful.', status: 'in_progress', targetDate: null },
  ];
  await connection.query(
    `INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
    [
      `plan-${client.id}`,
      dataset.tenantId,
      client.id,
      encryptJson(treatmentPlanGoals),
      encryptJson([
        'Weekly counseling sessions',
        'Behavioral activation / grounding practice',
        'Homework review and support accountability',
      ]),
      client.treatmentPlanReviewCadence,
      toSqlTimestamp(client.treatmentPlanReviewedAt),
    ],
  );

  await connection.query(
    `INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 'active', 0)`,
    [
      `portal-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.email),
      deriveLookupHash(client.email, { lowercase: true }),
      hashes.portalPasswordHash,
    ],
  );

  await connection.query(
    `INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `profile-${client.id}`,
      dataset.tenantId,
      client.id,
      encrypt(client.preferredName),
      encrypt(client.email),
      encrypt(client.phone),
      encryptJson({
        preferred: ['email', 'phone'],
      }),
      encryptJson({
        counselorId: client.counselorId,
        languagePreference: client.languagePreference,
        faithBackground: client.faithBackground,
      }),
    ],
  );

  await connection.query(
    `INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)`,
    [
      `church-${client.id}`,
      dataset.tenantId,
      client.id,
      client.churchName,
      'Pastor Daniel Hart',
      'email',
      `${client.firstName} approved collaboration with church support for practical care follow-up.`,
    ],
  );

  for (const appointment of client.appointments) {
    await connection.query(
      `INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 50, ?, ?, ?, ?)`,
      [
        appointment.id,
        dataset.tenantId,
        client.id,
        client.counselorId,
        encrypt(`${client.firstName} ${client.lastName}`),
        encrypt(`${client.counselor.firstName} ${client.counselor.lastName}`),
        appointment.appointmentType,
        appointment.status,
        toSqlTimestamp(appointment.startsAt),
        toSqlTimestamp(appointment.endsAt),
        toSqlTimestamp(appointment.startsAt),
        dataset.locationId,
        dataset.locationName,
        dataset.practiceTimezone,
        appointment.id.endsWith('-note') ? 1 : 0,
      ],
    );
  }

  await connection.query(
    `INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES (?, ?, ?, ?, 'progress_note', ?, ?, 1, ?, ?)`,
    [
      `note-${client.id}`,
      dataset.tenantId,
      client.id,
      `appt-${client.id}-note`,
      encrypt(client.noteSummary),
      encrypt(client.noteInterventions.join('\n')),
      client.counselorId,
      toSqlTimestamp(client.noteSignedAt),
    ],
  );

  for (const form of client.formResponses) {
    const assignmentId = `form-${client.id}-${form.formKey}`;
    await connection.query(
      `INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES (?, ?, ?, ?, ?, 'account_signup', ?, NULL, 'completed', ?, ?, ?, ?)`,
      [
        assignmentId,
        dataset.tenantId,
        client.id,
        form.formKey,
        form.formTitle,
        toSqlTimestamp(client.timeline.completedAppointment.startsAt),
        'acct-001',
        'Automatically attached by the demo dataset finalizer.',
        toSqlTimestamp(client.timeline.noteAppointment.endsAt),
        toSqlTimestamp(client.timeline.noteAppointment.endsAt),
      ],
    );

    await connection.query(
      `INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'client', ?, ?, ?, ?, ?, ?)`,
      [
        `sub-${client.id}-${form.formKey}`,
        dataset.tenantId,
        assignmentId,
        client.id,
        form.formKey,
        form.formTitle,
        encryptJson(form.responses),
        form.scoreLabel,
        form.scoreValue,
        form.interpretationLabel,
        toSqlTimestamp(client.timeline.noteAppointment.endsAt),
        toSqlTimestamp(client.timeline.noteAppointment.endsAt),
      ],
    );
  }

  // Enriched assessment history: additional PHQ-9/GAD-7/PCL-5 submissions beyond the default 4.
  // These create the score trends the Faithful Workflows rules engine reads.
  // Stored as standalone form_submissions without a corresponding form_assignment.
  for (let i = 0; i < client.enrichedAssessmentHistory.length; i++) {
    const assessment = client.enrichedAssessmentHistory[i];
    const responses = {
      totalScore: assessment.scoreValue,
      completedAt: assessment.submittedAt,
      ...(assessment.item9Score != null ? { selfHarm: assessment.item9Score, item9Score: assessment.item9Score } : {}),
    };
    await connection.query(
      `INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, 1, 'client', ?, ?, ?, ?, ?, ?)`,
      [
        `sub-${client.id}-${assessment.formKey}-history-${i}`,
        dataset.tenantId,
        client.id,
        assessment.formKey,
        assessment.formTitle,
        encryptJson(responses),
        assessment.scoreLabel,
        assessment.scoreValue,
        assessment.interpretationLabel ?? null,
        toSqlTimestamp(assessment.submittedAt),
        toSqlTimestamp(assessment.submittedAt),
      ],
    );
  }

  for (const offering of client.offerings) {
    await connection.query(
      `INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offering.id,
        dataset.tenantId,
        client.id,
        client.counselorId,
        offering.amountCents,
        offering.receivedOn,
        offering.note,
        'acct-001',
      ],
    );
  }

  for (const invoice of client.invoices) {
    await connection.query(
      `INSERT INTO invoices
         (id, tenant_id, client_id, appointment_id, issued_at, due_at, status, line_items, insurance_enc, claim_status, subtotal, adjustments, total, amount_paid, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.id,
        dataset.tenantId,
        client.id,
        `appt-${client.id}-completed`,
        toSqlTimestamp(invoice.issuedAt),
        toSqlTimestamp(invoice.dueAt),
        invoice.status,
        JSON.stringify(invoice.lineItems),
        encryptJson(invoice.insurance),
        invoice.claimStatus,
        invoice.subtotal,
        invoice.adjustments,
        invoice.total,
        invoice.amountPaid,
        invoice.balance,
      ],
    );

    await connection.query(
      `INSERT INTO payments
         (id, tenant_id, invoice_id, client_id, amount, method, received_at, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.payment.id,
        dataset.tenantId,
        invoice.id,
        client.id,
        invoice.payment.amount,
        invoice.payment.method,
        toSqlTimestamp(invoice.payment.receivedAt),
        invoice.payment.reference,
        invoice.payment.notes,
      ],
    );
  }
}

function buildExpectedCounts(dataset) {
  const appointmentCount = dataset.clients.reduce((sum, client) => sum + client.appointments.length, 0);
  const noteCount = dataset.clients.length;
  const formAssignmentCount = dataset.clients.length * dataset.defaultSignupFormKeys.length;
  const additionalSubmissionCount = dataset.clients.reduce(
    (sum, client) => sum + (client.enrichedAssessmentHistory?.length ?? 0),
    0,
  );
  const offeringCount = dataset.clients.reduce((sum, client) => sum + client.offerings.length, 0);
  const invoiceCount = dataset.clients.reduce((sum, client) => sum + client.invoices.length, 0);
  const paymentCount = dataset.clients.reduce((sum, client) => sum + client.invoices.length, 0);

  return {
    staff: dataset.staff.length,
    counselors: dataset.counselors.length,
    clients: dataset.clients.length,
    appointments: appointmentCount,
    progressNotes: noteCount,
    formAssignments: formAssignmentCount,
    formSubmissions: formAssignmentCount + additionalSubmissionCount,
    offerings: offeringCount,
    invoices: invoiceCount,
    payments: paymentCount,
    portalAccounts: dataset.clients.length,
    portalProfiles: dataset.clients.length,
  };
}

async function collectVerification(connection, dataset) {
  const [staffRows] = await connection.query(
    `SELECT role, first_name_enc, last_name_enc
       FROM staff_members
      WHERE tenant_id = ?
      ORDER BY role ASC, id ASC`,
    [dataset.tenantId],
  );

  const [staffCountRows] = await connection.query(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'counselor' THEN 1 ELSE 0 END) AS counselors
       FROM staff_members
      WHERE tenant_id = ?`,
    [dataset.tenantId],
  );

  const [[clientCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM clients WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[appointmentCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM appointments WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[noteCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM progress_notes WHERE tenant_id = ? AND appointment_id IS NOT NULL',
    [dataset.tenantId],
  );
  const [[formAssignmentCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM form_assignments WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[formSubmissionCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM form_submissions WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[offeringCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM offerings WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[invoiceCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM invoices WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[paymentCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM payments WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[portalAccountCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM portal_accounts WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[portalProfileCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM portal_client_profiles WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[sessionCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM sessions WHERE tenant_id = ?',
    [dataset.tenantId],
  );
  const [[portalSessionCountRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM portal_sessions WHERE tenant_id = ?',
    [dataset.tenantId],
  );

  const [assignmentCoverageRows] = await connection.query(
    `SELECT client_id, COUNT(DISTINCT form_key) AS total
       FROM form_assignments
      WHERE tenant_id = ?
      GROUP BY client_id`,
    [dataset.tenantId],
  );
  const [submissionCoverageRows] = await connection.query(
    `SELECT client_id, COUNT(DISTINCT form_key) AS total
       FROM form_submissions
      WHERE tenant_id = ?
      GROUP BY client_id`,
    [dataset.tenantId],
  );

  const counselorRows = staffRows
    .filter((row) => row.role === 'counselor')
    .map((row) => `${requireDecrypt(row.first_name_enc)} ${requireDecrypt(row.last_name_enc)}`)
    .sort();

  const expectedCounts = buildExpectedCounts(dataset);
  const expectedCounselorNames = dataset.counselors
    .map((item) => `${item.firstName} ${item.lastName}`)
    .sort();
  const expectedClientIds = new Set(dataset.clients.map((item) => item.id));
  const assignmentCoverage = new Map(assignmentCoverageRows.map((row) => [row.client_id, Number(row.total)]));
  const submissionCoverage = new Map(submissionCoverageRows.map((row) => [row.client_id, Number(row.total)]));

  const [clientIdRows] = await connection.query(
    'SELECT id FROM clients WHERE tenant_id = ? ORDER BY id ASC',
    [dataset.tenantId],
  );
  const actualClientIds = clientIdRows.map((row) => row.id);

  const invariants = [
    {
      name: 'exact_staff_count',
      pass: Number(staffCountRows[0].total) === expectedCounts.staff,
      expected: expectedCounts.staff,
      actual: Number(staffCountRows[0].total),
    },
    {
      name: 'exact_counselor_count',
      pass: Number(staffCountRows[0].counselors) === expectedCounts.counselors,
      expected: expectedCounts.counselors,
      actual: Number(staffCountRows[0].counselors),
    },
    {
      name: 'exact_counselor_names',
      pass: JSON.stringify(counselorRows) === JSON.stringify(expectedCounselorNames),
      expected: expectedCounselorNames,
      actual: counselorRows,
    },
    {
      name: 'exact_client_count',
      pass: Number(clientCountRow.total) === expectedCounts.clients,
      expected: expectedCounts.clients,
      actual: Number(clientCountRow.total),
    },
    {
      name: 'exact_client_ids',
      pass: actualClientIds.length === expectedClientIds.size && actualClientIds.every((id) => expectedClientIds.has(id)),
      expected: [...expectedClientIds].sort(),
      actual: actualClientIds,
    },
    {
      name: 'exact_appointment_count',
      pass: Number(appointmentCountRow.total) === expectedCounts.appointments,
      expected: expectedCounts.appointments,
      actual: Number(appointmentCountRow.total),
    },
    {
      name: 'exact_progress_note_count',
      pass: Number(noteCountRow.total) === expectedCounts.progressNotes,
      expected: expectedCounts.progressNotes,
      actual: Number(noteCountRow.total),
    },
    {
      name: 'exact_form_assignment_count',
      pass: Number(formAssignmentCountRow.total) === expectedCounts.formAssignments,
      expected: expectedCounts.formAssignments,
      actual: Number(formAssignmentCountRow.total),
    },
    {
      name: 'exact_form_submission_count',
      pass: Number(formSubmissionCountRow.total) === expectedCounts.formSubmissions,
      expected: expectedCounts.formSubmissions,
      actual: Number(formSubmissionCountRow.total),
    },
    {
      name: 'every_client_has_default_form_assignments',
      pass: dataset.clients.every((client) => assignmentCoverage.get(client.id) === dataset.defaultSignupFormKeys.length),
      expected: dataset.defaultSignupFormKeys.length,
      actual: Object.fromEntries(dataset.clients.map((client) => [client.id, assignmentCoverage.get(client.id) ?? 0])),
    },
    {
      name: 'every_client_has_default_form_submissions',
      // Enriched clients have additional assessment history submissions (extra distinct form keys).
      // Invariant: each client has AT LEAST the 4 default signup form keys submitted.
      pass: dataset.clients.every((client) => (submissionCoverage.get(client.id) ?? 0) >= dataset.defaultSignupFormKeys.length),
      expected: `>= ${dataset.defaultSignupFormKeys.length}`,
      actual: Object.fromEntries(dataset.clients.map((client) => [client.id, submissionCoverage.get(client.id) ?? 0])),
    },
    {
      name: 'exact_offering_count',
      pass: Number(offeringCountRow.total) === expectedCounts.offerings,
      expected: expectedCounts.offerings,
      actual: Number(offeringCountRow.total),
    },
    {
      name: 'exact_invoice_count',
      pass: Number(invoiceCountRow.total) === expectedCounts.invoices,
      expected: expectedCounts.invoices,
      actual: Number(invoiceCountRow.total),
    },
    {
      name: 'exact_payment_count',
      pass: Number(paymentCountRow.total) === expectedCounts.payments,
      expected: expectedCounts.payments,
      actual: Number(paymentCountRow.total),
    },
    {
      name: 'exact_portal_account_count',
      pass: Number(portalAccountCountRow.total) === expectedCounts.portalAccounts,
      expected: expectedCounts.portalAccounts,
      actual: Number(portalAccountCountRow.total),
    },
    {
      name: 'exact_portal_profile_count',
      pass: Number(portalProfileCountRow.total) === expectedCounts.portalProfiles,
      expected: expectedCounts.portalProfiles,
      actual: Number(portalProfileCountRow.total),
    },
    {
      name: 'staff_sessions_cleared',
      pass: Number(sessionCountRow.total) === 0,
      expected: 0,
      actual: Number(sessionCountRow.total),
    },
    {
      name: 'portal_sessions_cleared',
      pass: Number(portalSessionCountRow.total) === 0,
      expected: 0,
      actual: Number(portalSessionCountRow.total),
    },
  ];

  return {
    tenantId: dataset.tenantId,
    referenceDate: dataset.referenceDate,
    expectedCounts,
    actualCounts: {
      staff: Number(staffCountRows[0].total),
      counselors: Number(staffCountRows[0].counselors),
      clients: Number(clientCountRow.total),
      appointments: Number(appointmentCountRow.total),
      progressNotes: Number(noteCountRow.total),
      formAssignments: Number(formAssignmentCountRow.total),
      formSubmissions: Number(formSubmissionCountRow.total),
      offerings: Number(offeringCountRow.total),
      invoices: Number(invoiceCountRow.total),
      payments: Number(paymentCountRow.total),
      portalAccounts: Number(portalAccountCountRow.total),
      portalProfiles: Number(portalProfileCountRow.total),
      staffSessions: Number(sessionCountRow.total),
      portalSessions: Number(portalSessionCountRow.total),
    },
    invariants,
    passed: invariants.every((item) => item.pass),
  };
}

function requireDecrypt(value) {
  return value ? decrypt(value) : '';
}

async function clearSessions(connection, tenantId) {
  await connection.query('DELETE FROM sessions WHERE tenant_id = ?', [tenantId]);
  await connection.query('DELETE FROM portal_sessions WHERE tenant_id = ?', [tenantId]);
  await connection.query('DELETE FROM portal_password_resets WHERE tenant_id = ?', [tenantId]);
}

export async function verifyDemoDataset({ connection = null, referenceDate = new Date() } = {}) {
  if (!hasDbEnv()) {
    return {
      skipped: true,
      reason: 'DB environment not configured',
    };
  }

  const dataset = buildDemoDataset(referenceDate);
  if (connection) {
    return collectVerification(connection, dataset);
  }

  const ownedConnection = await pool.getConnection();
  try {
    return await collectVerification(ownedConnection, dataset);
  } finally {
    ownedConnection.release();
  }
}

export async function applyDemoDataset({ referenceDate = new Date() } = {}) {
  if (!hasDbEnv()) {
    return {
      skipped: true,
      reason: 'DB environment not configured',
    };
  }

  const dataset = buildDemoDataset(referenceDate);
  const hashes = await buildCredentialHashes(dataset);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const deleted = await resetSystemTenantData(connection, dataset);

    await insertTenantAndPractice(connection, dataset);
    await insertStaff(connection, dataset, hashes);
    await insertFormCatalog(connection, dataset);
    await insertPortalSettingsAndResources(connection, dataset);
    await insertBillingCatalog(connection, dataset);

    for (const client of dataset.clients) {
      await insertClientBundle(connection, dataset, client, hashes);
    }

    await clearSessions(connection, dataset.tenantId);

    const verification = await verifyDemoDataset({ connection, referenceDate: dataset.referenceDate });
    if (!verification.passed) {
      const failed = verification.invariants.filter((item) => !item.pass).map((item) => item.name);
      throw new Error(`Demo dataset verification failed: ${failed.join(', ')}`);
    }

    await connection.commit();

    return {
      skipped: false,
      tenantId: dataset.tenantId,
      referenceDate: dataset.referenceDate,
      deleted,
      applied: buildExpectedCounts(dataset),
      verification,
      credentials: {
        practiceAdminEmail: 'admin@churchcorecare.local',
        practiceAdminPassword: dataset.staffPasswords.admin,
        counselorPassword: dataset.staffPasswords.counselor,
        portalPassword: dataset.portalPassword,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function generateDemoDatasetSql({ referenceDate = new Date() } = {}) {
  if (!hasDbEnv()) {
    return {
      skipped: true,
      reason: 'DB environment not configured',
    };
  }

  const dataset = buildDemoDataset(referenceDate);
  const hashes = await buildCredentialHashes(dataset);
  const resetStatements = buildStaticResetStatements(dataset);
  const recorder = createSqlRecorder();

  await insertTenantAndPractice(recorder.connection, dataset);
  await insertStaff(recorder.connection, dataset, hashes);
  await insertFormCatalog(recorder.connection, dataset);
  await insertPortalSettingsAndResources(recorder.connection, dataset);
  await insertBillingCatalog(recorder.connection, dataset);

  for (const client of dataset.clients) {
    await insertClientBundle(recorder.connection, dataset, client, hashes);
  }

  await clearSessions(recorder.connection, dataset.tenantId);

  const seedStatements = recorder.statements;
  const applySql = [
    '-- Generated demo dataset SQL for ChurchCore Care',
    `-- Reference date: ${dataset.referenceDate}`,
    'START TRANSACTION;',
    ...resetStatements,
    ...seedStatements,
    'COMMIT;',
  ].join('\n\n') + '\n';

  const resetSql = [
    '-- Generated demo dataset reset SQL for ChurchCore Care',
    `-- Reference date: ${dataset.referenceDate}`,
    ...resetStatements,
  ].join('\n\n') + '\n';

  const seedSql = [
    '-- Generated demo dataset seed SQL for ChurchCore Care',
    `-- Reference date: ${dataset.referenceDate}`,
    ...seedStatements,
  ].join('\n\n') + '\n';

  return {
    skipped: false,
    tenantId: dataset.tenantId,
    referenceDate: dataset.referenceDate,
    applied: buildExpectedCounts(dataset),
    files: {
      resetSql,
      seedSql,
      applySql,
    },
  };
}
