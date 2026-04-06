-- Generated demo dataset reset SQL for FaithCounseling

-- Reference date: 2026-04-06T00:00:00.000Z

DELETE FROM payments
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = 'system'
         ) AS seeded_invoices
       );

DELETE FROM superbills
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = 'system'
         ) AS seeded_invoices
       );

DELETE FROM claims
       WHERE invoice_id IN (
         SELECT id FROM (
           SELECT id FROM invoices WHERE tenant_id = 'system'
         ) AS seeded_invoices
       );

DELETE FROM portal_messages
       WHERE thread_id IN (
         SELECT id FROM (
           SELECT id FROM portal_message_threads WHERE tenant_id = 'system'
         ) AS seeded_threads
       );

DELETE FROM document_assignments
       WHERE assignee_type = 'client'
         AND assignee_id IN (
           SELECT id FROM (
             SELECT id FROM clients WHERE tenant_id = 'system'
           ) AS seeded_clients
         );

DELETE FROM `sessions` WHERE tenant_id = 'system';

DELETE FROM `portal_sessions` WHERE tenant_id = 'system';

DELETE FROM `portal_password_resets` WHERE tenant_id = 'system';

DELETE FROM `invoices` WHERE tenant_id = 'system';

DELETE FROM `offerings` WHERE tenant_id = 'system';

DELETE FROM `form_submissions` WHERE tenant_id = 'system';

DELETE FROM `form_assignments` WHERE tenant_id = 'system';

DELETE FROM `portal_message_threads` WHERE tenant_id = 'system';

DELETE FROM `portal_uploads` WHERE tenant_id = 'system';

DELETE FROM `portal_data_right_requests` WHERE tenant_id = 'system';

DELETE FROM `portal_appointment_requests` WHERE tenant_id = 'system';

DELETE FROM `portal_client_profiles` WHERE tenant_id = 'system';

DELETE FROM `portal_accounts` WHERE tenant_id = 'system';

DELETE FROM `reminders` WHERE tenant_id = 'system';

DELETE FROM `progress_notes` WHERE tenant_id = 'system';

DELETE FROM `appointment_series` WHERE tenant_id = 'system';

DELETE FROM `appointments` WHERE tenant_id = 'system';

DELETE FROM `waitlist_metadata` WHERE tenant_id = 'system';

DELETE FROM `faith_church_referrals` WHERE tenant_id = 'system';

DELETE FROM `inventory_assignments` WHERE tenant_id = 'system';

DELETE FROM `consent_records` WHERE tenant_id = 'system';

DELETE FROM `intake_packets` WHERE tenant_id = 'system';

DELETE FROM `treatment_plans` WHERE tenant_id = 'system';

DELETE FROM `client_addresses` WHERE tenant_id = 'system';

DELETE FROM `client_phones` WHERE tenant_id = 'system';

DELETE FROM `client_contacts` WHERE tenant_id = 'system';

DELETE FROM `client_insurance` WHERE tenant_id = 'system';

DELETE FROM `client_referring_providers` WHERE tenant_id = 'system';

DELETE FROM `client_diagnoses` WHERE tenant_id = 'system';

DELETE FROM `client_medications` WHERE tenant_id = 'system';

DELETE FROM `client_allergies` WHERE tenant_id = 'system';

DELETE FROM `client_clinical_history` WHERE tenant_id = 'system';

DELETE FROM `client_faith_profiles` WHERE tenant_id = 'system';

DELETE FROM `client_legal` WHERE tenant_id = 'system';

DELETE FROM `client_lifecycles` WHERE tenant_id = 'system';

DELETE FROM `availability_overrides` WHERE tenant_id = 'system';

DELETE FROM `availability_templates` WHERE tenant_id = 'system';

DELETE FROM `staff_licenses` WHERE tenant_id = 'system';

DELETE FROM `staff_certifications` WHERE tenant_id = 'system';

DELETE FROM `staff_specialty_profiles` WHERE tenant_id = 'system';

DELETE FROM `staff_employment` WHERE tenant_id = 'system';

DELETE FROM `staff_faith_profiles` WHERE tenant_id = 'system';

DELETE FROM `staff_accounts` WHERE tenant_id = 'system';

DELETE FROM `staff_members` WHERE tenant_id = 'system';

DELETE FROM `clients` WHERE tenant_id = 'system';

DELETE FROM `locations` WHERE tenant_id = 'system';

DELETE FROM `portal_resources` WHERE tenant_id = 'system';

DELETE FROM `portal_settings` WHERE tenant_id = 'system';

DELETE FROM `form_catalog` WHERE tenant_id = 'system';

DELETE FROM `fee_schedules` WHERE tenant_id = 'system';

DELETE FROM `service_codes` WHERE tenant_id = 'system';
