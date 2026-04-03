import http from 'node:http';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import {
  appointmentTypes,
  appointmentStatuses,
  caseStatuses,
  consentStates,
  consentTypes,
  clientStatuses,
  createAuditEvent,
  createConsentRecord,
  createDocumentAssignmentRecord,
  createDocumentTemplateRecord,
  createInventoryAssignmentRecord,
  createInventoryDefinitionRecord,
  createIntakePacketRecord,
  createLocationRecord,
  createProgressNoteRecord,
  createPracticeRecord,
  createStaffRecord,
  createTreatmentPlanRecord,
  documentAssignmentStatuses,
  documentAudienceTypes,
  documentTemplateTypes,
  inventoryAssignmentStatuses,
  inventoryCategories,
  inventoryScoringMethods,
  intakeStatuses,
  licenseTypes,
  progressNoteTypes,
  practiceTypes,
  staffRoles,
  supervisionStatuses,
  treatmentPlanStatuses,
} from '../../../packages/domain/src/index.js';
import { createServiceTelemetry, startNodeTelemetry } from '../../../packages/telemetry/src/index.js';
import { createI18nStore } from './lib/i18n-store.js';
import { featureFlags } from './lib/feature-flags.js';
import { buildIntakePreview } from './lib/intake-preview.js';
import { HttpError, readJsonBody, writeJson, assertShape } from './lib/http.js';
import { logError, logInfo, logWarn, serializeError } from './lib/log.js';
import { translateMessages } from './lib/translate.js';
import { handleCors, checkRateLimit, enforceRbac, enforceTenantScope, callerIdentity } from './lib/security.js';
import { searchDsm5TrDiagnoses } from './lib/dsm5-tr-reference.js';
import pool, { verifyConnection } from './db/pool.js';
import { encrypt, decrypt, encryptJson, decryptJson, deriveLookupHash } from './lib/encrypt.js';
import {
  login,
  logout,
  resolveSession,
  changePassword,
  changePortalPassword,
  requestPortalPasswordReset,
  completePortalPasswordReset,
  createStaffAccount,
  adminResetStaffPassword,
  adminUnlockStaffAccount,
  adminDeactivateStaffAccount,
  validatePasswordStrength,
} from './lib/auth.js';
import {
  listStaff, getStaffById, createStaff, updateStaff,
  listPractices, getPracticeById, createPractice, updatePractice,
  listLocations, getLocationById, createLocation, updateLocation, deleteLocation,
  listAvailabilityTemplates, upsertAvailabilityTemplate, deleteAvailabilityTemplate,
} from './db/queries/staff.js';
import {
  listStaffLicenses, getStaffLicenseById, createStaffLicense,
  updateStaffLicense, deleteStaffLicense,
} from './db/queries/staffLicenses.js';
import {
  listStaffCertifications, getStaffCertificationById, createStaffCertification,
  updateStaffCertification, deleteStaffCertification,
} from './db/queries/staffCertifications.js';
import { getStaffSpecialtyProfile, upsertStaffSpecialtyProfile } from './db/queries/staffSpecialtyProfiles.js';
import { getStaffEmployment, upsertStaffEmployment } from './db/queries/staffEmployment.js';
import { getStaffFaithProfile, upsertStaffFaithProfile } from './db/queries/staffFaithProfiles.js';
import {
  listAppointments, getAppointmentById, createAppointment, updateAppointment, deleteAppointment,
  listAppointmentsByDateRange,
  listReminders, createReminder, updateReminder,
  listWaitlist, createWaitlistEntry, updateWaitlistEntry,
  listAvailabilityOverrides, createAvailabilityOverride, updateAvailabilityOverride, deleteAvailabilityOverride,
  listSeries, createSeries, updateSeries,
  getUtilizationSummary,
} from './db/queries/appointments.js';
import {
  listServiceCodes, getServiceCodeById, createServiceCode, updateServiceCode,
  listFeeSchedules, getFeeScheduleById, createFeeSchedule, updateFeeSchedule,
  listInvoices, getInvoiceById, createInvoice, updateInvoice,
  listPayments, createPayment,
  listSuperbills, createSuperbill, updateSuperbill,
  listClaims, createClaim, updateClaim,
  getAgingReport,
} from './db/queries/billing.js';
import {
  getLifecycle, createLifecycle, updateLifecycle,
  listConsents, createConsent, updateConsent,
  getIntakePacket, createIntakePacket, updateIntakePacket,
  getTreatmentPlan, createTreatmentPlan, updateTreatmentPlan,
  listProgressNotes, createProgressNote, updateProgressNote,
  listInventoryDefinitions, createInventoryDefinition,
  listInventoryAssignments, createInventoryAssignment, updateInventoryAssignment,
} from './db/queries/clinical.js';
import {
  listDocumentTemplates, getDocumentTemplateById, createDocumentTemplate, updateDocumentTemplate,
  listDocumentAssignments, createDocumentAssignment, updateDocumentAssignment,
} from './db/queries/documents.js';
import {
  getPortalSettings, upsertPortalSettings,
  getPortalAccount, createPortalAccount, updatePortalAccount,
  getPortalClientProfile, upsertPortalClientProfile,
  listPortalResources, createPortalResource, updatePortalResource,
  listPortalUploads, createPortalUpload,
  listPortalDataRightRequests, createPortalDataRightRequest, updatePortalDataRightRequest,
  listPortalMessageThreads, getPortalMessageThread, createPortalMessageThread, updatePortalMessageThread,
  listPortalMessages, createPortalMessage,
  listPortalAppointmentRequests, createPortalAppointmentRequest, updatePortalAppointmentRequest,
} from './db/queries/portal.js';
import {
  listFormCatalog, createFormCatalogItem, updateFormCatalogItem, getFormCatalogItemByKey,
  listFormAssignments, createFormAssignment, updateFormAssignment, getFormAssignmentById,
  listFormSubmissions, createFormSubmission, getNextSubmissionVersion,
  listPortalRegistrationRequests, createPortalRegistrationRequest, updatePortalRegistrationRequest,
} from './db/queries/formWorkflows.js';
import {
  listFaithNoteTemplates, createFaithNoteTemplate, updateFaithNoteTemplate,
  listFaithGoalTemplates, createFaithGoalTemplate, updateFaithGoalTemplate,
  listFaithConsentVariants, createFaithConsentVariant, updateFaithConsentVariant,
  listFaithResources, createFaithResource, updateFaithResource,
  listFaithInventories, createFaithInventory,
  listFaithChurchReferrals, createFaithChurchReferral, updateFaithChurchReferral,
  getFaithLanguagePreferences, upsertFaithLanguagePreferences,
} from './db/queries/faith.js';
import {
  listTenantProvisioningRequests, createTenantProvisioningRequest, updateTenantProvisioningRequest,
  listImpersonationSessions, createImpersonationSession, endImpersonationSession,
  listDataExportJobs, createDataExportJob, updateDataExportJob,
  getRetentionPolicy, upsertRetentionPolicy,
} from './db/queries/platform.js';
import { listClientAddresses, getClientAddress, createClientAddress, updateClientAddress, deleteClientAddress } from './db/queries/clientAddresses.js';
import { listClientPhones, getClientPhone, createClientPhone, updateClientPhone, deleteClientPhone } from './db/queries/clientPhones.js';
import { listClientContacts, getClientContact, createClientContact, updateClientContact, deleteClientContact } from './db/queries/clientContacts.js';
import { listClientInsurance, getClientInsurance, createClientInsurance, updateClientInsurance, deleteClientInsurance } from './db/queries/clientInsurance.js';
import { listReferringProviders, getReferringProvider, createReferringProvider, updateReferringProvider, deleteReferringProvider } from './db/queries/clientReferringProviders.js';
import { listClientDiagnoses, getClientDiagnosis, createClientDiagnosis, updateClientDiagnosis, deleteClientDiagnosis } from './db/queries/clientDiagnoses.js';
import { listClientMedications, getClientMedication, createClientMedication, updateClientMedication, deleteClientMedication } from './db/queries/clientMedications.js';
import { listClientAllergies, getClientAllergy, createClientAllergy, updateClientAllergy, deleteClientAllergy } from './db/queries/clientAllergies.js';
import { getClientClinicalHistory, upsertClientClinicalHistory } from './db/queries/clientClinicalHistory.js';
import { getClientFaithProfile, upsertClientFaithProfile } from './db/queries/clientFaithProfiles.js';
import { getClientLegal, upsertClientLegal } from './db/queries/clientLegal.js';
import { createClient as createClientRecord } from './db/queries/clients.js';

const port = Number(process.env.PORT || 3001);
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const openApiSpecPath = path.resolve(currentDirPath, '../../../docs/api/openapi.yaml');
const openApiSpecYaml = await readFile(openApiSpecPath, 'utf8');
const standaloneHint = 'If the shared dev stack is already running, use `pnpm start:api:standalone`.';

await startNodeTelemetry({ serviceName: 'faith-api' });
const telemetry = createServiceTelemetry('faith-api');
const i18nStore = await createI18nStore();

// Verify DB connectivity at startup when DB_NAME is configured.
// Skipped if DB_NAME is unset (allows running without a DB in dev/CI).
if (process.env.DB_NAME) {
  try {
    await verifyConnection();
    logInfo('startup.db_connection_verified', {
      dbConfigured: true,
      mode: 'mysql',
    });
  } catch (error) {
    logError('startup.db_connection_failed', {
      dbConfigured: true,
      mode: 'mysql',
      error,
    });
    throw error;
  }
}

process.on('unhandledRejection', (reason) => {
  logError('process.unhandled_rejection', {
    error: reason instanceof Error ? reason : new Error(String(reason)),
  });
});

process.on('uncaughtException', (error) => {
  logError('process.uncaught_exception', { error });
  process.exit(1);
});

telemetry.updateHealth({
  serviceStatus: 2,
  dependencies: {
    db: {
      status: process.env.DB_NAME ? 2 : 1,
      observedAt: new Date().toISOString(),
    },
  },
  checks: {
    startup: {
      status: 2,
      observedAt: new Date().toISOString(),
      detail: process.env.DB_NAME ? 'database connection verified at startup' : 'running without DB_NAME configured',
    },
  },
});

const clients = [
  { id: 'c-001', tenantId: 'system', firstName: 'Sarah', lastName: 'Kim', status: 'active', faithBackground: 'Evangelical', highTouchpoint: true, primaryCounselorId: 's-001' },
  { id: 'c-002', tenantId: 'system', firstName: 'David', lastName: 'Miller', status: 'active', faithBackground: 'Baptist', highTouchpoint: false, primaryCounselorId: 's-001' },
  { id: 'c-003', tenantId: 'system', firstName: 'Emily', lastName: 'Reyes', status: 'waitlist', faithBackground: 'Catholic', highTouchpoint: true, primaryCounselorId: 's-002' },
  { id: 'c-004', tenantId: 'system', firstName: 'Michael', lastName: 'Owens', status: 'inactive', faithBackground: 'Non-denominational', highTouchpoint: false, primaryCounselorId: 's-001' },
  { id: 'c-005', tenantId: 'system', firstName: 'Olivia', lastName: 'Scott', status: 'discharged', faithBackground: 'Methodist', highTouchpoint: false, primaryCounselorId: 's-002' },
];

const clientLifecycles = {
  'c-001': {
    tenantId: 'system',
    clientId: 'c-001',
    caseStatus: 'active',
    referralSource: 'Church referral',
    emergencyContact: {
      name: 'Daniel Kim',
      relationship: 'Spouse',
      phone: '555-1010',
      authorized: true,
    },
    dischargeRecord: null,
    updatedAt: new Date().toISOString(),
  },
  'c-003': {
    tenantId: 'system',
    clientId: 'c-003',
    caseStatus: 'waitlist',
    referralSource: 'Primary care referral',
    emergencyContact: {
      name: 'Ana Reyes',
      relationship: 'Parent',
      phone: '555-2020',
      authorized: true,
    },
    dischargeRecord: null,
    updatedAt: new Date().toISOString(),
  },
};

const consentRecords = [
  { ...createConsentRecord({
    id: 'cons-001',
    tenantId: 'system',
    clientId: 'c-001',
    consentType: 'informed_consent',
    signatureState: 'signed',
    version: 'v2',
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
  }) },
];

const intakePackets = [
  { ...createIntakePacketRecord({
    id: 'ip-001',
    tenantId: 'system',
    clientId: 'c-001',
    status: 'completed',
    assignedForms: ['Demographics', 'Clinical History', 'Faith Preferences'],
    submittedAt: new Date().toISOString(),
  }) },
  { ...createIntakePacketRecord({
    id: 'ip-002',
    tenantId: 'system',
    clientId: 'c-003',
    status: 'assigned',
    assignedForms: ['Demographics', 'Consent Packet'],
    submittedAt: null,
  }) },
  { ...createIntakePacketRecord({
    id: 'ip-004',
    tenantId: 'system',
    clientId: 'c-004',
    status: 'completed',
    assignedForms: ['Long Intake Form', 'PHQ-9 Depression Screener', 'Anxiety Assessment'],
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }) },
];

const treatmentPlans = [
  { ...createTreatmentPlanRecord({
    id: 'tp-001',
    tenantId: 'system',
    clientId: 'c-001',
    status: 'active',
    goals: ['Reduce panic episodes', 'Improve sleep consistency'],
    interventions: ['CBT thought records', 'Breath prayer routine'],
    reviewCadence: 'monthly',
    reviewedAt: new Date().toISOString(),
  }) },
];

const progressNotes = [
  { ...createProgressNoteRecord({
    id: 'pn-001',
    tenantId: 'system',
    clientId: 'c-001',
    noteType: 'progress_note',
    summary: 'Client reported fewer panic symptoms this week and completed assigned journal prompts.',
    interventions: ['Review coping plan', 'Scripture reflection'],
    locked: false,
    signedBy: null,
    signedAt: null,
  }) },
];

const documentTemplates = [
  { ...createDocumentTemplateRecord({
    id: 'dt-001',
    tenantId: 'system',
    title: 'Informed Consent Intake Packet',
    templateType: 'consent_form',
    audience: 'client',
    templateKey: 'informed_consent_intake',
    versionNumber: 2,
    contentBlocks: ['Client rights summary', 'HIPAA privacy acknowledgment', 'Signature section'],
  }) },
  { ...createDocumentTemplateRecord({
    id: 'dt-002',
    tenantId: 'system',
    title: 'Faith-Integrated Progress Note',
    templateType: 'clinical_template',
    audience: 'staff',
    templateKey: 'faith_progress_note',
    versionNumber: 1,
    contentBlocks: ['Session summary', 'Clinical interventions', 'Spiritual integration notes'],
  }) },
];

const documentAssignments = [
  { ...createDocumentAssignmentRecord({
    id: 'da-001',
    tenantId: 'system',
    templateId: 'dt-001',
    assigneeType: 'client',
    assigneeId: 'c-001',
    status: 'signed',
    requiresSignature: true,
    dueAt: null,
    completedAt: new Date().toISOString(),
    accessHistory: [
      { action: 'viewed', at: new Date().toISOString(), actorRole: 'client' },
      { action: 'signed', at: new Date().toISOString(), actorRole: 'client' },
    ],
  }) },
];

const inventoryDefinitions = [
  { ...createInventoryDefinitionRecord({
    id: 'inv-001',
    tenantId: 'system',
    name: 'GAD-7 Anxiety Inventory',
    category: 'standard_counseling',
    scoringMethod: 'sum',
    versionNumber: 1,
    questionSchema: [
      { key: 'q1', prompt: 'Feeling nervous, anxious, or on edge', min: 0, max: 3 },
      { key: 'q2', prompt: 'Not being able to stop or control worrying', min: 0, max: 3 },
    ],
  }) },
  { ...createInventoryDefinitionRecord({
    id: 'inv-002',
    tenantId: 'system',
    name: 'Spiritual Formation Check-In',
    category: 'spiritual_assessment',
    scoringMethod: 'average',
    versionNumber: 1,
    questionSchema: [
      { key: 'q1', prompt: 'Sense of spiritual support this week', min: 1, max: 5 },
      { key: 'q2', prompt: 'Consistency in prayer or devotional rhythm', min: 1, max: 5 },
    ],
  }) },
];

const inventoryAssignments = [
  { ...createInventoryAssignmentRecord({
    id: 'ia-001',
    tenantId: 'system',
    inventoryId: 'inv-001',
    clientId: 'c-001',
    status: 'completed',
    responses: [
      { key: 'q1', value: 2 },
      { key: 'q2', value: 1 },
    ],
    score: 3,
    scoredAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }) },
];

const formCatalogRecords = [];

const formWorkflowAssignments = [
  {
    id: 'fa-001',
    tenantId: 'system',
    clientId: 'c-001',
    formKey: 'PHQ9',
    formTitle: 'PHQ-9 Depression Screener',
    assignmentType: 'next_session',
    scheduledFor: null,
    recurrenceRule: null,
    status: 'completed',
    assignedBy: 's-001',
    notes: 'Complete before next counseling visit.',
    dueAt: null,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const formWorkflowSubmissions = [
  {
    id: 'fs-001',
    tenantId: 'system',
    assignmentId: 'fa-001',
    clientId: 'c-001',
    formKey: 'PHQ9',
    formTitle: 'PHQ-9 Depression Screener',
    submissionVersion: 1,
    submittedByType: 'client',
    responses: { phq_1: '2', phq_2: '1', phq_3: '1' },
    scoreLabel: 'PHQ-9 Total',
    scoreValue: 9,
    interpretationLabel: 'Mild Depression',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fs-004',
    tenantId: 'system',
    assignmentId: 'fa-004',
    clientId: 'c-004',
    formKey: 'LongIntakeForm',
    formTitle: 'Long Intake Form',
    submissionVersion: 1,
    submittedByType: 'client',
    responses: {
      firstName: 'Michael',
      lastName: 'Owens',
      dob: '1990-08-14',
      gender: 'Male',
      pronouns: 'He / Him',
      city: 'Nashville',
      state: 'TN',
      maritalStatus: 'Married',
      livingSituation: 'With spouse / partner',
      occupation: 'Project manager',
      primaryConcern: 'Constant anxiety, panic at night, and grief after a recent miscarriage.',
      secondaryConcerns: 'Sleep disruption and tension with my spouse.',
      onsetDate: '3–6 months ago',
      precipitatingEvent: 'Symptoms worsened after a pregnancy loss and increased work pressure.',
      severity: 8,
      dailyImpact: 'Sleep is poor, concentration is down, and conflict at home has increased.',
      priorAttempts: 'Prayer, journaling, exercise, and trying to stay busy.',
      whatHelps: 'Prayer, walks, and talking with my wife when I can slow down enough to do it.',
      previousTherapy: 'No',
      psychiatricHospitalization: 'No',
      diagnosedConditions: 'No',
      generalHealth: 'Good',
      chronicConditions: '',
      christianIntegration: 'Yes, please',
      churchAffiliation: 'Yes, regularly',
      faithBackground: 'Evangelical Christian',
      faithImportance: '9',
      spiritualStrengths: 'Prayer, worship music, and a men’s Bible study.',
      selfHarmThoughts: 'No',
      suicidalThoughts: 'No',
      goals: 'Feel steady again, sleep through the night, and reconnect with my spouse and God.',
      successLooks: 'Less panic, better sleep, and less tension at home.',
    },
    scoreLabel: null,
    scoreValue: null,
    interpretationLabel: null,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'fs-005',
    tenantId: 'system',
    assignmentId: 'fa-005',
    clientId: 'c-004',
    formKey: 'PHQ9',
    formTitle: 'PHQ-9 Depression Screener',
    submissionVersion: 1,
    submittedByType: 'client',
    responses: {
      phq1: '2',
      phq2: '2',
      phq3: '2',
      phq4: '2',
      phq5: '1',
      phq6: '1',
      phq7: '1',
      phq8: '0',
      phq9: '0',
    },
    scoreLabel: 'PHQ-9 Score',
    scoreValue: 11,
    interpretationLabel: 'Moderate Depression',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'fs-006',
    tenantId: 'system',
    assignmentId: 'fa-006',
    clientId: 'c-004',
    formKey: 'AnxietyAssessment',
    formTitle: 'Anxiety Assessment',
    submissionVersion: 1,
    submittedByType: 'client',
    responses: {
      gad1: '2',
      gad2: '2',
      gad3: '2',
      gad4: '2',
      gad5: '1',
      gad6: '1',
      gad7: '2',
      anxietyTriggers: 'Nighttime quiet, work deadlines, and conversations about the loss.',
      panicAttacks: 'Yes',
      panicFrequency: 'Occasionally (monthly)',
      avoidance: 'Yes',
      avoidanceDetails: 'I avoid bedtime because that is when panic feels strongest.',
      anxietyDuration2: '1–6 months',
      functionalImpact: 'Very difficult',
    },
    scoreLabel: 'GAD-7 Score',
    scoreValue: 12,
    interpretationLabel: 'Moderate Anxiety',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const portalRegistrationRequests = [
  {
    id: 'pr-001',
    tenantId: 'system',
    requestType: 'care_request',
    firstName: 'Leah',
    lastName: 'Carter',
    email: 'leah.carter@example.test',
    phone: '555-0199',
    preferredContactMethod: 'email',
    preferredContactWindow: 'Weekday afternoons',
    requestedServices: ['care_request', 'individual', 'faith_integrated'],
    notes: 'Interested in beginning Christian counseling and open to virtual sessions.',
    status: 'requested',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

const appointments = [
  { id: 'a-001', tenantId: 'system', clientId: 'c-001', clientName: 'Sarah Kim', counselorId: 's-001', counselorName: 'Rachel Jordan', startsAt: atToday(9, 0), endsAt: atToday(9, 50), status: 'scheduled', appointmentType: 'individual_therapy', locationName: 'Cedar Room', remoteSession: false },
  { id: 'a-002', tenantId: 'system', clientId: 'c-002', clientName: 'David Miller', counselorId: 's-001', counselorName: 'Rachel Jordan', startsAt: atToday(10, 30), endsAt: atToday(11, 20), status: 'scheduled', appointmentType: 'couples_therapy', locationName: 'Remote Session', remoteSession: true },
  { id: 'a-003', tenantId: 'system', clientId: 'c-003', clientName: 'Emily Reyes', counselorId: 's-002', counselorName: 'Hannah Torres', startsAt: atToday(13, 0), endsAt: atToday(13, 50), status: 'checked_in', appointmentType: 'intake_assessment', locationName: 'Willow Room', remoteSession: false },
  { id: 'a-004', tenantId: 'system', clientId: 'c-001', clientName: 'Sarah Kim', counselorId: 's-001', counselorName: 'Rachel Jordan', startsAt: atToday(15, 15), endsAt: atToday(16, 0), status: 'scheduled', appointmentType: 'family_therapy', locationName: 'Remote Session', remoteSession: true },
];

const appointmentSeriesRecords = [
  {
    id: 'ser-001',
    tenantId: 'system',
    counselorId: 's-001',
    clientId: 'c-001',
    clientName: 'Sarah Kim',
    counselorName: 'Rachel Jordan',
    appointmentType: 'individual_therapy',
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    durationMinutes: 50,
    locationId: 'l-001',
    remoteSession: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ser-002',
    tenantId: 'system',
    counselorId: 's-002',
    clientId: 'c-003',
    clientName: 'Emily Reyes',
    counselorName: 'Hannah Torres',
    appointmentType: 'intake_assessment',
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    durationMinutes: 50,
    locationId: 'l-002',
    remoteSession: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const practices = [
  { ...createPracticeRecord({
    id: 'p-001',
    tenantId: 'system',
    name: 'Faith Counseling Collective',
    type: 'group',
    timezone: 'America/Chicago',
    faithTradition: 'Christian',
    contactEmail: 'admin@faithcounseling.local',
    contactPhone: '555-0100',
  }) },
];

const locations = [
  { ...createLocationRecord({
    id: 'l-001',
    tenantId: 'system',
    practiceId: 'p-001',
    name: 'Cedar Office',
    address: '101 Cedar Ave',
    capacity: 6,
    remoteEnabled: true,
  }) },
  { ...createLocationRecord({
    id: 'l-002',
    tenantId: 'system',
    practiceId: 'p-001',
    name: 'Willow Office',
    address: '22 Willow St',
    capacity: 4,
    remoteEnabled: true,
  }) },
];

const staffMembers = [
  { ...createStaffRecord({
    id: 's-001',
    tenantId: 'system',
    firstName: 'Rachel',
    lastName: 'Jordan',
    role: 'counselor',
    licenseType: 'lmft',
    licenseNumber: 'LMFT-4455',
    supervisionStatus: 'not_required',
    supervisingStaffId: null,
    locationIds: ['l-001'],
    bio: 'Integrative counseling with Christian care approach.',
  }) },
  { ...createStaffRecord({
    id: 's-002',
    tenantId: 'system',
    firstName: 'Hannah',
    lastName: 'Torres',
    role: 'intern',
    licenseType: 'pastoral_counselor',
    licenseNumber: '',
    supervisionStatus: 'active',
    supervisingStaffId: 's-001',
    locationIds: ['l-002'],
    bio: 'Supervised intern focused on young adult counseling.',
  }) },
];

const availabilityTemplates = {
  's-001': [
    { day: 'monday', start: '09:00', end: '16:00' },
    { day: 'wednesday', start: '09:00', end: '16:00' },
  ],
  's-002': [
    { day: 'tuesday', start: '10:00', end: '15:00' },
  ],
};

const reminderStatuses = Object.freeze(['pending', 'sent', 'failed', 'cancelled']);

const reminderRecords = [
  {
    id: 'rem-001',
    tenantId: 'system',
    appointmentId: 'a-001',
    clientId: 'c-001',
    reminderType: 'appointment',
    deliveryChannel: 'email',
    reminderAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    sentAt: null,
  },
  {
    id: 'rem-002',
    tenantId: 'system',
    appointmentId: 'a-002',
    clientId: 'c-002',
    reminderType: 'appointment',
    deliveryChannel: 'sms',
    reminderAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: 'sent',
    sentAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
];

const waitlistMetadataByClientId = {
  'c-003': {
    priorityRank: 1,
    requestedService: 'Individual counseling',
    preferredSessionType: 'in_person',
    notes: 'Prefers afternoon sessions due to school schedule.',
    updatedAt: new Date().toISOString(),
  },
};

const serviceCodeStatuses = Object.freeze(['active', 'inactive']);
const invoiceStatuses = Object.freeze(['draft', 'issued', 'partially_paid', 'paid', 'void']);
const paymentMethods = Object.freeze(['card', 'cash', 'check', 'ach', 'other']);
const claimStatuses = Object.freeze(['not_submitted', 'queued', 'submitted', 'accepted', 'denied', 'paid']);
const portalAccountStatuses = Object.freeze(['invited', 'active', 'locked', 'revoked']);
const portalMessageThreadStatuses = Object.freeze(['open', 'closed']);
const portalAppointmentRequestStatuses = Object.freeze(['requested', 'approved', 'declined', 'scheduled']);
const portalResourceTypes = Object.freeze(['document', 'education', 'devotional', 'form']);
const portalRegistrationModes = Object.freeze(['invite_only', 'review_required', 'instant_activation']);
const portalFinancialModes = Object.freeze(['billing', 'offerings']);
const portalContactPreferenceOptions = Object.freeze(['email', 'sms', 'phone', 'portal_message']);
const portalUploadStatuses = Object.freeze(['uploaded', 'reviewed']);
const portalDataRightRequestTypes = Object.freeze(['export_data', 'delete_request']);
const portalDataRightRequestStatuses = Object.freeze(['requested', 'under_review', 'completed', 'restricted', 'denied']);
const portalDataRightReviewReasonCodes = Object.freeze([
  'portal_erasure_completed',
  'retention_obligation_remaining',
  'legal_hold_enabled',
  'request_denied',
  'insufficient_verification',
  'duplicate_request',
]);
const formAssignmentTypes = Object.freeze(['next_session', 'future_session', 'scheduled_recurring', 'account_signup']);
const formAssignmentWorkflowStatuses = Object.freeze(['assigned', 'in_progress', 'completed', 'cancelled']);
const portalRegistrationStatuses = Object.freeze(['requested', 'reviewing', 'approved', 'declined']);
const portalRequestTypes = Object.freeze(['care_request', 'scheduling_request', 'account_signup']);

const DEFAULT_FORM_CATALOG = Object.freeze([
  { formKey: 'ShortIntakeForm', title: 'Short Intake Form', category: 'intake', isStandardOnSignup: true },
  { formKey: 'LongIntakeForm', title: 'Long Intake Form', category: 'intake', isStandardOnSignup: false },
  { formKey: 'InformedConsentForm', title: 'Informed Consent Form', category: 'administrative', isStandardOnSignup: true },
  { formKey: 'TelehealthConsentForm', title: 'Telehealth Consent Form', category: 'administrative', isStandardOnSignup: false },
  { formKey: 'ReleaseOfInformationAuthorization', title: 'Release of Information Authorization', category: 'administrative', isStandardOnSignup: false },
  { formKey: 'BiopsychosocialAssessment', title: 'Biopsychosocial Assessment', category: 'assessment', isStandardOnSignup: false },
  { formKey: 'MentalStatusExam', title: 'Mental Status Exam', category: 'assessment', isStandardOnSignup: false },
  { formKey: 'SafetyPlanTemplate', title: 'Safety Plan Template', category: 'clinical', isStandardOnSignup: false },
  { formKey: 'MoodDisorderQuestionnaire', title: 'Mood Disorder Questionnaire', category: 'assessment', isStandardOnSignup: false },
  { formKey: 'EatingDisorderScreening', title: 'Eating Disorder Screening', category: 'assessment', isStandardOnSignup: false },
  { formKey: 'AngerAssessmentScale', title: 'Anger Assessment Scale', category: 'assessment', isStandardOnSignup: false },
  { formKey: 'AnxietyAssessment', title: 'GAD-7 Anxiety Assessment', category: 'anxiety', isStandardOnSignup: true },
  { formKey: 'SelfHarmAssessment', title: 'Self-Harm Safety Assessment', category: 'clinical', isStandardOnSignup: false },
  { formKey: 'PHQ9', title: 'PHQ-9 Depression Screener', category: 'depression', isStandardOnSignup: true },
  { formKey: 'BeckAnxietyInventory', title: 'Beck Anxiety Inventory', category: 'anxiety', isStandardOnSignup: false },
  { formKey: 'PCL5', title: 'PCL-5 PTSD Checklist', category: 'trauma', isStandardOnSignup: false },
  { formKey: 'RosenbergSelfEsteem', title: 'Rosenberg Self-Esteem Scale', category: 'self', isStandardOnSignup: false },
  { formKey: 'ASRSv1', title: 'ASRS v1.1 Adult ADHD Screener', category: 'adhd', isStandardOnSignup: false },
  { formKey: 'OCIRevised', title: 'OCI-R OCD Inventory', category: 'anxiety', isStandardOnSignup: false },
  { formKey: 'AUDIT', title: 'AUDIT Alcohol Use Screening', category: 'substance', isStandardOnSignup: false },
  { formKey: 'DASS21', title: 'DASS-21 Distress Scale', category: 'depression', isStandardOnSignup: false },
  { formKey: 'ACEQuestionnaire', title: 'ACE Questionnaire', category: 'trauma', isStandardOnSignup: false },
  { formKey: 'InsomniaSeverityIndex', title: 'Insomnia Severity Index', category: 'sleep', isStandardOnSignup: false },
  { formKey: 'CouplesAssessment', title: 'Couples Assessment', category: 'relationship', isStandardOnSignup: false },
  { formKey: 'GriefAssessment', title: 'Grief Assessment', category: 'grief', isStandardOnSignup: false },
  { formKey: 'BurnoutAssessment', title: 'Burnout Assessment', category: 'burnout', isStandardOnSignup: false },
  { formKey: 'IndividualTreatmentPlan', title: 'Individual Treatment Plan', category: 'treatment', isStandardOnSignup: false },
  { formKey: 'SMARTGoalsWorksheet', title: 'SMART Goals Worksheet', category: 'treatment', isStandardOnSignup: false },
  { formKey: 'RelapsePreventionPlan', title: 'Relapse Prevention Plan', category: 'treatment', isStandardOnSignup: false },
  { formKey: 'CBTThoughtRecord', title: 'CBT Thought Record', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'CognitiveDistortionsWorksheet', title: 'Cognitive Distortions Worksheet', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'BehavioralActivationSchedule', title: 'Behavioral Activation Schedule', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'CopingSkillsPlan', title: 'Coping Skills Plan', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'GroundingTechniquesWorksheet', title: 'Grounding Techniques Worksheet', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'MindfulnessPracticeLog', title: 'Mindfulness Practice Log', category: 'worksheets', isStandardOnSignup: false },
  { formKey: 'SpiritualWellnessInventory', title: 'Spiritual Wellness Inventory', category: 'faith', isStandardOnSignup: false },
  { formKey: 'FaithHistoryQuestionnaire', title: 'Faith History Questionnaire', category: 'faith', isStandardOnSignup: false },
  { formKey: 'ValuesAndBiblicalIdentityWorksheet', title: 'Values and Biblical Identity Worksheet', category: 'faith', isStandardOnSignup: false },
  { formKey: 'FamilySystemsAssessment', title: 'Family Systems Assessment', category: 'family', isStandardOnSignup: false },
]);

formCatalogRecords.push(...DEFAULT_FORM_CATALOG.map((entry, idx) => ({
  id: `fc-${String(idx + 1).padStart(3, '0')}`,
  tenantId: 'system',
  formKey: entry.formKey,
  title: entry.title,
  category: entry.category,
  isStandardOnSignup: Boolean(entry.isStandardOnSignup),
  isActive: true,
  versionNumber: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})));
const faithIntegrationLevels = Object.freeze(['explicit', 'balanced', 'light']);
const faithResourceTypes = Object.freeze(['scripture', 'devotional', 'prayer', 'worksheet']);
const faithCoordinationStatuses = Object.freeze(['proposed', 'active', 'paused', 'closed']);
const faithInventoryCadences = Object.freeze(['weekly', 'biweekly', 'monthly', 'as_needed']);
const platformProvisioningStatuses = Object.freeze(['queued', 'in_progress', 'completed', 'failed']);
const platformImpersonationStatuses = Object.freeze(['active', 'ended']);
const platformExportTypes = Object.freeze(['clinical_records', 'billing', 'documents', 'audit_log']);
const platformExportStatuses = Object.freeze(['queued', 'processing', 'completed', 'failed']);
const retentionSchedules = Object.freeze(['7_years', '10_years', 'indefinite']);

const serviceCodes = [
  {
    id: 'svc-001',
    tenantId: 'system',
    code: '90837',
    name: 'Individual Psychotherapy 60 min',
    category: 'therapy',
    defaultDurationMinutes: 60,
    status: 'active',
  },
  {
    id: 'svc-002',
    tenantId: 'system',
    code: '90847',
    name: 'Family Psychotherapy with Client',
    category: 'therapy',
    defaultDurationMinutes: 60,
    status: 'active',
  },
];

const feeSchedules = [
  {
    id: 'fee-001',
    tenantId: 'system',
    name: 'Standard Self-Pay',
    status: 'active',
    currency: 'USD',
    lines: [
      { serviceCodeId: 'svc-001', amount: 150 },
      { serviceCodeId: 'svc-002', amount: 185 },
    ],
    updatedAt: new Date().toISOString(),
  },
];

const invoices = [
  {
    id: 'inv-001',
    tenantId: 'system',
    clientId: 'c-001',
    appointmentId: 'a-001',
    issuedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    dueAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'partially_paid',
    lineItems: [
      {
        serviceCodeId: 'svc-001',
        code: '90837',
        description: 'Individual Psychotherapy 60 min',
        quantity: 1,
        unitAmount: 150,
        serviceDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    insurance: {
      payerName: 'BlueCross Placeholder',
      policyNumber: 'POL-1001',
      memberId: 'M-2001',
      groupNumber: 'GRP-09',
    },
    claimStatus: 'submitted',
    subtotal: 150,
    adjustments: 0,
    total: 150,
    amountPaid: 75,
    balance: 75,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-002',
    tenantId: 'system',
    clientId: 'c-002',
    appointmentId: 'a-002',
    issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'issued',
    lineItems: [
      {
        serviceCodeId: 'svc-001',
        code: '90837',
        description: 'Individual Psychotherapy 60 min',
        quantity: 1,
        unitAmount: 150,
        serviceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    insurance: {
      payerName: '',
      policyNumber: '',
      memberId: '',
      groupNumber: '',
    },
    claimStatus: 'not_submitted',
    subtotal: 150,
    adjustments: 0,
    total: 150,
    amountPaid: 0,
    balance: 150,
    updatedAt: new Date().toISOString(),
  },
];

const payments = [
  {
    id: 'pay-001',
    tenantId: 'system',
    invoiceId: 'inv-001',
    clientId: 'c-001',
    amount: 75,
    method: 'card',
    receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reference: 'AUTH-7751',
    notes: 'Partial payment captured at checkout.',
  },
];

const superbills = [
  {
    id: 'sb-001',
    tenantId: 'system',
    invoiceId: 'inv-001',
    clientId: 'c-001',
    generatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    diagnosisCodes: ['F41.1'],
    serviceLines: [
      {
        serviceCodeId: 'svc-001',
        code: '90837',
        amount: 150,
        serviceDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

const claimPlaceholders = [
  {
    id: 'clm-001',
    tenantId: 'system',
    invoiceId: 'inv-001',
    status: 'submitted',
    externalReference: 'CH-PLACEHOLDER-1001',
    submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Clearinghouse integration point placeholder record.',
  },
];

const portalAccounts = [
  {
    id: 'pa-001',
    tenantId: 'system',
    clientId: 'c-001',
    status: 'active',
    email: 'sarah.kim@example.test',
    mfaEnabled: false,
    lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    invitedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pa-002',
    tenantId: 'system',
    clientId: 'c-002',
    status: 'invited',
    email: 'david.miller@example.test',
    mfaEnabled: false,
    lastLoginAt: null,
    invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const portalClientProfiles = [
  {
    id: 'pcp-001',
    tenantId: 'system',
    clientId: 'c-001',
    preferredName: 'Sarah',
    contactEmail: 'sarah.kim@example.test',
    contactPhone: '555-0122',
    contactPreferences: {
      preferredContactMethod: 'email',
      okToText: true,
      okToLeaveMessage: true,
      enabledChannels: ['email', 'sms', 'portal_message'],
    },
    profileDetails: {
      demographics: {
        pronouns: 'she/her',
        maritalStatus: 'married',
      },
      education: {
        level: 'bachelors',
        occupation: 'Teacher',
      },
      affiliations: ['Church volunteer', 'Women’s Bible study'],
    },
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pcp-004',
    tenantId: 'system',
    clientId: 'c-004',
    preferredName: 'Michael',
    contactEmail: 'michael.owens@example.test',
    contactPhone: '555-0174',
    contactPreferences: {
      preferredContactMethod: 'email',
      okToText: false,
      okToLeaveMessage: true,
      enabledChannels: ['email', 'portal_message'],
    },
    profileDetails: {
      demographics: {
        pronouns: 'he/him',
        maritalStatus: 'married',
      },
      education: {
        level: 'masters',
        occupation: 'Project manager',
      },
      affiliations: ['Men’s Bible study'],
    },
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const portalSettingsRecords = [
  {
    id: 'ps-001',
    tenantId: 'system',
    practiceName: 'FaithCounseling',
    logoUrl: '',
    brandColor: '#1f7a8c',
    accentColor: '#f0f7f8',
    welcomeHeadline: 'FaithCounseling Client Portal',
    welcomeMessage: 'Current clients can sign in to their account. New or possible clients can request care, request scheduling, or start an account request for intake onboarding.',
    helpMessage: 'If you need help accessing the portal, contact your counselor or the practice front desk.',
    supportEmail: '',
    registrationMode: 'review_required',
    allowCreateAccount: true,
    allowCareRequests: true,
    allowSchedulingRequests: true,
    showPublicCounselorDirectory: false,
    financialMode: 'offerings',
    suggestedOfferingCents: 12000,
    offeringMinistryNote: 'Your gift helps sustain this counseling ministry and expand care for others.',
    contactPreferenceOptions: ['email', 'sms', 'phone', 'portal_message'],
    defaultSignupFormKeys: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const offeringsRecords = [];

const portalResources = [
  {
    id: 'pr-001',
    tenantId: 'system',
    clientId: 'c-001',
    title: 'Breath Prayer Starter Guide',
    resourceType: 'devotional',
    content: 'A short guided breath prayer routine to practice between sessions.',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    publishedByRole: 'counselor',
  },
];

const portalMessageThreads = [
  {
    id: 'pt-001',
    tenantId: 'system',
    clientId: 'c-001',
    subject: 'Follow-up question after session',
    status: 'open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const portalMessages = [
  {
    id: 'pm-001',
    tenantId: 'system',
    threadId: 'pt-001',
    clientId: 'c-001',
    senderRole: 'client',
    senderId: 'c-001',
    body: 'Can you resend the journaling prompt from this week?',
    sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pm-002',
    tenantId: 'system',
    threadId: 'pt-001',
    clientId: 'c-001',
    senderRole: 'counselor',
    senderId: 's-001',
    body: 'Absolutely. I posted it to your portal resources as well.',
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const portalAppointmentRequests = [
  {
    id: 'par-001',
    tenantId: 'system',
    clientId: 'c-001',
    preferredStartAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    preferredEndAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString(),
    mode: 'remote',
    status: 'requested',
    notes: 'Prefer evening if available.',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

const portalUploads = [];
const portalDataRightRequests = [];

const christianNoteTemplates = [
  {
    id: 'fnt-001',
    tenantId: 'system',
    name: 'Faith-Integrated Progress Note',
    focusArea: 'anxiety',
    integrationLevel: 'balanced',
    sections: ['Clinical summary', 'Spiritual themes', 'Homework and prayer rhythm'],
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const faithTreatmentGoalTemplates = [
  {
    id: 'ftg-001',
    tenantId: 'system',
    title: 'Strengthen identity and hope',
    integrationLevel: 'balanced',
    scriptures: ['Romans 15:13', 'Psalm 139'],
    milestones: ['Daily gratitude reflection', 'Weekly scripture meditation plan'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const consentLanguageVariants = [
  {
    id: 'fcv-001',
    tenantId: 'system',
    title: 'Faith-Integrated Counseling Consent',
    audience: 'client',
    integrationLevel: 'explicit',
    body: 'Counseling may include scripture reflection and prayer when requested by the client.',
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const faithResourceLibrary = [
  {
    id: 'frl-001',
    tenantId: 'system',
    title: 'Lament and Hope Reflection',
    resourceType: 'devotional',
    scriptureReference: 'Psalm 42',
    content: 'A guided reflection for naming grief while anchoring in hope.',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const spiritualFormationInventories = [
  {
    id: 'sfi-001',
    tenantId: 'system',
    name: 'Discipleship Rhythm Check-In',
    cadence: 'weekly',
    prompts: ['Prayer consistency', 'Scripture engagement', 'Community connection'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const churchReferralCoordinations = [
  {
    id: 'crc-001',
    tenantId: 'system',
    clientId: 'c-001',
    churchName: 'Grace Community Church',
    contactName: 'Pastor Lee',
    contactMethod: 'pastor.lee@example.test',
    status: 'active',
    consentToCoordinate: true,
    notes: 'Coordinate monthly care updates with client consent on file.',
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const faithLanguagePreferences = [
  {
    id: 'flp-001',
    tenantId: 'system',
    practiceId: 'p-001',
    integrationLevel: 'balanced',
    explicitFaithLanguage: true,
    includePrayerLanguage: true,
    includeScriptureReferences: true,
    preferredTerminology: 'Pastoral and clinically respectful',
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const tenantProvisioningRequests = [
  {
    id: 'tpr-001',
    tenantId: 'system',
    requestedTenantId: 'newhope',
    requestedPracticeName: 'New Hope Counseling',
    ownerEmail: 'owner@newhope.test',
    status: 'completed',
    requestedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const supportImpersonationSessions = [
  {
    id: 'sis-001',
    tenantId: 'system',
    targetTenantId: 'system',
    targetRole: 'practice_admin',
    requestedBy: 'platform-admin-01',
    reason: 'Investigate access issue on document assignments.',
    status: 'ended',
    startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  },
];

const dataExportJobs = [
  {
    id: 'dex-001',
    tenantId: 'system',
    exportType: 'clinical_records',
    status: 'completed',
    requestedByRole: 'practice_admin',
    requestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    format: 'json',
  },
];

const retentionPolicies = [
  {
    id: 'rtp-001',
    tenantId: 'system',
    clinicalRecordsSchedule: '10_years',
    billingSchedule: '7_years',
    auditLogSchedule: 'indefinite',
    includeDocumentVersions: true,
    legalHoldEnabled: false,
    updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const runtimeAuditEvents = [];
const MAX_RUNTIME_AUDIT_EVENTS = 4000;

export async function handleApiRequest(request, response) {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const route = resolveRoute(requestUrl.pathname);
  const requestStartedAt = Date.now();
  const requestId = normalizeRequestId(request.headers['x-request-id']) ?? crypto.randomUUID();
  const requestTelemetryAttributes = {};
  let session = null;
  let requestFailureLogged = false;

  request.requestId = requestId;
  request.route = route;
  response.setHeader('x-request-id', requestId);

  if (featureFlags.tenantTelemetry) {
    const headerTenantId = normalizeTenantId(request.headers['x-tenant-id']);
    if (headerTenantId) {
      requestTelemetryAttributes.tenantId = headerTenantId;
    }
  }

  const requestScope = telemetry.beginRequest({
    method: request.method ?? 'GET',
    route,
    ...requestTelemetryAttributes,
  });

  try {
    // CORS — must come before rate-limit so preflight gets through cleanly
    if (handleCors(request, response)) return;

    // Rate limiting
    if (checkRateLimit(request, response, route)) return;

    // Resolve session from cookie (null if unauthenticated or DB not configured)
    session = process.env.DB_NAME ? await resolveSession(request) : null;

    if (featureFlags.tenantTelemetry) {
      const identity = callerIdentity(request, session);
      const scopedTenantId = normalizeTenantId(identity.tenantId);
      if (scopedTenantId) {
        requestTelemetryAttributes.tenantId = scopedTenantId;
      }
    }

    // RBAC — uses session when available, falls back to headers in dev
    if (enforceRbac(request, response, route, session)) return;

    if ((requestUrl.pathname === '/health' || requestUrl.pathname === '/health/live') && request.method === 'GET') {
      const health = buildLiveHealthResponse();
      writeJson(response, 200, health);
      return;
    }

    if (requestUrl.pathname === '/health/ready' && request.method === 'GET') {
      const health = await buildReadinessHealthResponse();
      writeJson(response, health.httpStatus, health.body);
      return;
    }

    if (requestUrl.pathname === '/openapi.yaml' && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(200, { 'content-type': 'application/yaml; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : openApiSpecYaml);
      return;
    }

    if ((requestUrl.pathname === '/docs' || requestUrl.pathname === '/docs/') && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : renderSwaggerUiHtml('./openapi.yaml'));
      return;
    }

    if (requestUrl.pathname === '/bootstrap-metadata' && request.method === 'GET') {
      const bootstrapEvent = createAuditEvent({
        tenantId: 'system',
        action: 'api.bootstrap.read',
        targetType: 'system',
        targetId: 'bootstrap-metadata',
        occurredAt: new Date().toISOString(),
      });

      writeJson(response, 200, { roles: staffRoles, appointmentStatuses, appointmentTypes, clientStatuses, bootstrapEvent });
      return;
    }

    // ── Authentication endpoints ──────────────────────────────────────────────
    if (requestUrl.pathname === '/v1/auth/login' && request.method === 'POST') {
      await handleAuthLogin(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/auth/logout' && request.method === 'POST') {
      await handleAuthLogout(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/auth/me' && request.method === 'GET') {
      await handleAuthMe(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/auth/change-password' && request.method === 'POST') {
      await handleAuthChangePassword(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/auth/portal-password-reset-request' && request.method === 'POST') {
      await handlePortalPasswordResetRequest(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/auth/portal-password-reset' && request.method === 'POST') {
      await handlePortalPasswordResetComplete(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/clients') {
      await handleClientsCollection(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/lifecycle') && requestUrl.pathname.startsWith('/v1/clients/')) {
      await handleClientLifecycle(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/consents') && requestUrl.pathname.startsWith('/v1/clients/')) {
      await handleClientConsents(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/intake-packets') && requestUrl.pathname.startsWith('/v1/clients/')) {
      await handleClientIntakePackets(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/treatment-plan') && requestUrl.pathname.startsWith('/v1/clients/')) {
      await handleClientTreatmentPlan(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/progress-notes') && requestUrl.pathname.startsWith('/v1/clients/')) {
      await handleClientProgressNotes(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/clients/') && requestUrl.pathname.includes('/progress-notes/') && !requestUrl.pathname.endsWith('/progress-notes')) {
      await handleClientProgressNoteById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/clients/')) {
      const sub = parseClientSubresource(requestUrl.pathname);
      if (sub) {
        if (sub.subresource === 'addresses')           { await handleClientAddressesRoute(request, response, sub, session); return; }
        if (sub.subresource === 'phones')              { await handleClientPhonesRoute(request, response, sub, session); return; }
        if (sub.subresource === 'contacts')            { await handleClientContactsRoute(request, response, sub, session); return; }
        if (sub.subresource === 'insurance')           { await handleClientInsuranceRoute(request, response, sub, session); return; }
        if (sub.subresource === 'referring-providers') { await handleClientReferringProvidersRoute(request, response, sub, session); return; }
        if (sub.subresource === 'diagnoses')           { await handleClientDiagnosesRoute(request, response, sub, session); return; }
        if (sub.subresource === 'medications')         { await handleClientMedicationsRoute(request, response, sub, session); return; }
        if (sub.subresource === 'allergies')           { await handleClientAllergiesRoute(request, response, sub, session); return; }
        if (sub.subresource === 'clinical-history')    { await handleClientClinicalHistoryRoute(request, response, sub, session); return; }
        if (sub.subresource === 'intake-preview')      { await handleClientIntakePreviewRoute(request, response, sub, session); return; }
        if (sub.subresource === 'faith-profile')       { await handleClientFaithProfileRoute(request, response, sub, session); return; }
        if (sub.subresource === 'legal')               { await handleClientLegalRoute(request, response, sub, session); return; }
      }
      await handleClientById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/document-templates') {
      await handleDocumentTemplates(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/document-templates/')) {
      await handleDocumentTemplateById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/document-assignments') {
      await handleDocumentAssignments(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/inventory-definitions') {
      await handleInventoryDefinitions(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/inventory-definitions/')) {
      await handleInventoryDefinitionById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/inventory-assignments') {
      await handleInventoryAssignments(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/forms/catalog') {
      await handleFormsCatalog(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/forms/assignments') {
      await handleFormWorkflowAssignments(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/forms/submissions') {
      await handleFormWorkflowSubmissions(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/forms/client-overview') {
      await handleClientFormOverview(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/appointment-types') {
      await handleAppointmentTypes(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/appointments') {
      await handleAppointmentsCollection(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/scheduling/calendar') {
      await handleSchedulingCalendar(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/reminders') {
      await handleReminders(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/waitlist') {
      await handleWaitlist(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/scheduling/availability-overrides') {
      await handleAvailabilityOverrides(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/scheduling/series') {
      await handleAppointmentSeries(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/scheduling/utilization') {
      await handleUtilization(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/operations/summary') {
      await handleOperationsSummary(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/reference/dsm5-tr') {
      await handleDsm5TrReferenceLookup(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/service-codes') {
      await handleServiceCodes(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/fee-schedules') {
      await handleFeeSchedules(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/invoices') {
      await handleInvoices(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/payments') {
      await handlePayments(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/superbills') {
      await handleSuperbills(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/claims') {
      await handleClaimPlaceholders(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/billing/reports/aging') {
      await handleAgingReport(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/overview') {
      await handlePortalOverview(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/public-config') {
      await handlePortalPublicConfig(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/settings') {
      await handlePortalSettings(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/accounts') {
      await handlePortalAccounts(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/profile') {
      await handlePortalProfile(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/intake-packets') {
      await handlePortalIntakePackets(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/documents') {
      await handlePortalDocuments(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/uploads') {
      await handlePortalUploads(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/appointment-requests') {
      await handlePortalAppointmentRequests(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/messages') {
      await handlePortalMessages(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/resources') {
      await handlePortalResources(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/data-rights') {
      await handlePortalDataRights(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/data-rights/review') {
      await handlePortalDataRightsReview(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/portal/public-requests') {
      await handlePortalPublicRequests(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/offerings/summary') {
      await handleOfferingsSummary(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/offerings/')) {
      await handleOfferings(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/offerings') {
      await handleOfferings(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/workflows/recommendations/state' ||
        requestUrl.pathname.startsWith('/v1/workflows/recommendations/state/')) {
      await handleWorkflowRecommendationState(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/overview') {
      await handleFaithOverview(request, response, requestUrl);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/note-templates') {
      await handleFaithNoteTemplates(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/treatment-goals') {
      await handleFaithTreatmentGoals(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/consent-variants') {
      await handleFaithConsentVariants(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/resources') {
      await handleFaithResources(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/inventories') {
      await handleFaithInventories(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/referral-coordination') {
      await handleFaithReferralCoordination(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/faith/language-preferences') {
      await handleFaithLanguagePreferences(request, response, requestUrl);
      return;
    }

    if (requestUrl.pathname === '/v1/reporting/overview') {
      await handleReportingOverview(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/audit/intelligence' || requestUrl.pathname === '/v1/audit/intelligence/') {
      await handleAuditIntelligence(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/platform/overview') {
      await handlePlatformOverview(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/platform/tenant-provisioning') {
      await handleTenantProvisioning(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/platform/impersonation-sessions') {
      await handleSupportImpersonationSessions(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/platform/impersonation-sessions/')) {
      await handleSupportImpersonationSessionById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/platform/data-exports') {
      await handleDataExportJobs(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/platform/retention-policies') {
      await handleRetentionPolicies(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/appointments/')) {
      await handleAppointmentById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/practices') {
      await handlePracticesCollection(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/practices/')) {
      await handlePracticeById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/locations') {
      await handleLocationsCollection(request, response, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/locations/')) {
      await handleLocationById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/staff') {
      await handleStaffCollection(request, response, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/availability') && requestUrl.pathname.startsWith('/v1/staff/')) {
      await handleStaffAvailability(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.endsWith('/account-actions') && requestUrl.pathname.startsWith('/v1/staff/')) {
      await handleStaffAccountActions(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/licenses\/[^/]+$/.test(requestUrl.pathname)) {
      await handleStaffLicenseById(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/licenses$/.test(requestUrl.pathname)) {
      await handleStaffLicenses(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/certifications\/[^/]+$/.test(requestUrl.pathname)) {
      await handleStaffCertificationById(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/certifications$/.test(requestUrl.pathname)) {
      await handleStaffCertifications(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/specialty-profile$/.test(requestUrl.pathname)) {
      await handleStaffSpecialtyProfile(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/employment$/.test(requestUrl.pathname)) {
      await handleStaffEmployment(request, response, requestUrl, session);
      return;
    }

    if (/^\/v1\/staff\/[^/]+\/faith-profile$/.test(requestUrl.pathname)) {
      await handleStaffFaithProfile(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/staff/')) {
      await handleStaffById(request, response, requestUrl, session);
      return;
    }

    if (requestUrl.pathname === '/v1/i18n/locales') {
      await handleLocales(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/i18n/catalog') {
      if (request.method !== 'GET') {
        writeJson(response, 405, { error: 'Method not allowed' });
        return;
      }

      writeJson(response, 200, i18nStore.getCatalog(requestUrl.searchParams.get('locale') ?? 'en'));
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/i18n/catalog/')) {
      await handleCatalogByLocale(request, response, requestUrl);
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/i18n/settings/')) {
      await handleTranslationSettingsByLocale(request, response, requestUrl);
      return;
    }

    if (requestUrl.pathname === '/v1/i18n/translate') {
      await handleAutoTranslate(request, response);
      return;
    }

    if (requestUrl.pathname === '/v1/telemetry/vitals') {
      await handleFrontendVitals(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/telemetry/events') {
      await handleFrontendTelemetryEvents(request, response, session);
      return;
    }

    if (requestUrl.pathname === '/v1/monitoring/db' && request.method === 'GET') {
      if (requirePracticeAdmin(request, response, session)) return;
      await handleMonitoringDb(response);
      return;
    }

    if (requestUrl.pathname === '/v1/telemetry/summary' && request.method === 'GET') {
      if (requirePracticeAdmin(request, response, session)) return;
      writeJson(response, 200, {
        service: 'api',
        features: {
          tenantTelemetry: featureFlags.tenantTelemetry,
          tenantTelemetrySummary: featureFlags.tenantTelemetrySummary,
        },
        exportedViaOtel: Boolean(
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
          || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
        ),
        summary: telemetry.getSummary({
          includeTenantBreakdown: featureFlags.tenantTelemetrySummary,
        }),
      });
      return;
    }

    writeJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    requestFailureLogged = true;
    logRequestFailure({
      error,
      request,
      route,
      requestId,
      requestStartedAt,
      statusCode,
      session,
    });
    writeJson(response, statusCode, { error: error.message || 'Unexpected server error' });
  } finally {
    logRequestCompletion({
      request,
      response,
      route,
      requestId,
      requestStartedAt,
      session,
      skipServerErrorCompletionLog: requestFailureLogged,
    });
    requestScope.end(response.statusCode || 200, requestTelemetryAttributes);
  }
}

export const server = http.createServer(handleApiRequest);

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    logError('server.listen_failed', {
      port,
      code: error.code,
      message: `Port ${port} is already in use.`,
      hint: standaloneHint,
    });
    process.exit(1);
  }

  logError('server.start_failed', {
    port,
    error,
  });
  process.exit(1);
});

if (process.env.FAITH_API_DISABLE_LISTEN !== '1') {
  server.listen(port, () => {
    logInfo('server.listening', {
      port,
      dbConfigured: Boolean(process.env.DB_NAME),
      otelExportConfigured: Boolean(
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
        || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
      ),
    });
  });
}

// ─── Auth handlers ────────────────────────────────────────────────────────────

async function handleAuthLogin(request, response) {
  const payload = await readJsonBody(request);
  assertShape({ required: ['email', 'password'] }, payload);
  try {
    const profile = await login(payload.email, payload.password, response);
    await emitAudit(
      request,
      'session.login',
      profile.role === 'client' ? 'portal_account' : 'staff_account',
      profile.portalAccountId ?? profile.clientId ?? profile.staffId,
    );
    writeJson(response, 200, { profile });
  } catch (err) {
    writeJson(response, err.statusCode || 500, { error: err.error || err.message });
  }
}

async function handleAuthLogout(request, response, session) {
  await logout(request, response, session);
  const actorId = session?.staff_account_id ?? session?.client_id ?? 'anonymous';
  const targetId = session?.portal_account_id ?? session?.staff_account_id ?? session?.client_id ?? 'anonymous';
  await emitAudit(request, 'session.logout', session?.role === 'client' ? 'portal_account' : 'staff_account', targetId, session);
  writeJson(response, 200, { ok: true });
}

async function handleAuthMe(request, response, session) {
  if (!session) {
    writeJson(response, 401, { error: 'Authentication required' });
    return;
  }
  if (session.role === 'client') {
    const [rows] = await pool.query(
      'SELECT pa.email_enc, c.first_name_enc, c.last_name_enc FROM portal_accounts pa ' +
      'JOIN clients c ON c.id = pa.client_id AND c.tenant_id = pa.tenant_id ' +
      'WHERE pa.id = ?',
      [session.portal_account_id],
    );
    const row = rows[0];
    writeJson(response, 200, {
      clientId: session.client_id,
      portalAccountId: session.portal_account_id,
      tenantId: session.tenant_id,
      role: session.role,
      name: row ? `${decrypt(row.first_name_enc)} ${decrypt(row.last_name_enc)}` : null,
      email: row?.email_enc ? decrypt(row.email_enc) : null,
    });
    return;
  }

  const [rows] = await pool.query(
    'SELECT sm.first_name_enc, sm.last_name_enc, sa.email, sa.email_enc FROM staff_accounts sa ' +
    'JOIN staff_members sm ON sm.id = sa.staff_member_id ' +
    'WHERE sa.id = ?',
    [session.staff_account_id],
  );
  const row = rows[0];
  writeJson(response, 200, {
    staffAccountId: session.staff_account_id,
    tenantId: session.tenant_id,
    role: session.role,
    name: row ? `${decrypt(row.first_name_enc)} ${decrypt(row.last_name_enc)}` : null,
    email: row?.email_enc ? decrypt(row.email_enc) : (row?.email ?? null),
  });
}

async function handleAuthChangePassword(request, response, session) {
  if (!session) {
    writeJson(response, 401, { error: 'Authentication required' });
    return;
  }
  const payload = await readJsonBody(request);
  assertShape({ required: ['currentPassword', 'newPassword'] }, payload);
  try {
    if (session.role === 'client') {
      await changePortalPassword(session.portal_account_id, payload.currentPassword, payload.newPassword);
      await emitAudit(request, 'portal.password_changed', 'portal_account', session.portal_account_id, session);
      writeJson(response, 200, { ok: true, signOutRequired: true });
      return;
    }
    await changePassword(session.staff_account_id, payload.currentPassword, payload.newPassword);
    await emitAudit(request, 'staff.password_changed', 'staff_account', session.staff_account_id, session);
    writeJson(response, 200, { ok: true });
  } catch (err) {
    writeJson(response, err.statusCode || 500, { error: err.error || err.message });
  }
}

async function handlePortalPasswordResetRequest(request, response) {
  const payload = await readJsonBody(request);
  assertShape({ required: ['email'] }, payload);
  try {
    const result = await requestPortalPasswordReset(payload.email);
    await emitAudit(request, 'portal.password_reset.request', 'portal_account', 'lookup');
    writeJson(response, 202, {
      ok: true,
      notice: 'If the portal account exists, a reset code has been issued.',
      resetToken: result.resetToken,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    writeJson(response, err.statusCode || 500, { error: err.error || err.message });
  }
}

async function handlePortalPasswordResetComplete(request, response) {
  const payload = await readJsonBody(request);
  assertShape({ required: ['email', 'token', 'newPassword'] }, payload);
  try {
    const result = await completePortalPasswordReset(payload.email, payload.token, payload.newPassword);
    await emitAudit(request, 'portal.password_reset.complete', 'portal_account', result.portalAccountId ?? 'unknown');
    writeJson(response, 200, { ok: true });
  } catch (err) {
    writeJson(response, err.statusCode || 500, { error: err.error || err.message });
  }
}

// ─── Client handlers (DB-backed when DB_NAME is set) ─────────────────────────

async function handleClientsCollection(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const statusFilter = requestUrl.searchParams.get('status');
    const counselorScopeId = await resolveEffectiveCounselorFilterId(request, response, requestUrl, session, 'client.list.read');
    if (counselorScopeId === false) return;

    let items;
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const role     = callerRole(request, session);
      let sql    = 'SELECT * FROM clients';
      const args = [];
      const conditions = [];
      if (role !== 'platform_admin') {
        conditions.push('tenant_id = ?');
        args.push(tenantId);
      }
      if (statusFilter) {
        conditions.push('status = ?');
        args.push(statusFilter);
      }
      if (counselorScopeId) {
        conditions.push('primary_counselor_id = ?');
        args.push(counselorScopeId);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY created_at DESC LIMIT 200';
      const [rows] = await pool.query(sql, args);
      items = rows.map(dbRowToClientSummary);
    } else {
      // In-memory fallback (no DB configured)
      items = statusFilter ? clients.filter((c) => c.status === statusFilter) : clients;
      if (counselorScopeId) {
        items = items.filter((client) => client.primaryCounselorId === counselorScopeId);
      }
    }

    await emitAudit(request, 'client.list.read', 'client', 'collection', session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const firstName = sanitizeStr(payload.firstName);
  const lastName  = sanitizeStr(payload.lastName);
  const status    = normalizeClientStatus(payload.status);
  const highTouchpoint = payload.highTouchpoint === true;

  if (!firstName || !lastName) {
    writeJson(response, 400, { error: 'firstName and lastName are required' });
    return;
  }
  if (!status) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const id = genId('c');
    const faithBackground = sanitizeStr(payload.faithBackground, 500) ?? 'Undeclared';
    await pool.query(
      `INSERT INTO clients (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, encrypt(firstName), encrypt(lastName), status, faithBackground, highTouchpoint ? 1 : 0],
    );
    const newClient = { id, tenantId, firstName, lastName, status, faithBackground, highTouchpoint };
    telemetry.recordMutation('client.create');
    await emitAudit(request, 'client.create', 'client', id, session);
    writeJson(response, 201, { item: newClient });
  } else {
    const nextClient = {
      id: createId('c', clients),
      tenantId,
      firstName,
      lastName,
      status,
      faithBackground: sanitizeStr(payload.faithBackground, 500) ?? 'Undeclared',
      highTouchpoint,
    };
    clients.push(nextClient);
    telemetry.recordMutation('client.create');
    await emitAudit(request, 'client.create', 'client', nextClient.id, session);
    writeJson(response, 201, { item: nextClient });
  }
}

/** Map a clients DB row to the API shape (decrypt PHI fields). */
function dbRowToClient(row) {
  return {
    id:                   row.id,
    tenantId:             row.tenant_id,
    firstName:            decrypt(row.first_name_enc),
    lastName:             decrypt(row.last_name_enc),
    middleName:           row.middle_name_enc    ? decrypt(row.middle_name_enc)    : null,
    preferredName:        row.preferred_name_enc ? decrypt(row.preferred_name_enc) : null,
    pronouns:             row.pronouns            ?? null,
    dateOfBirth:          row.date_of_birth_enc  ? decrypt(row.date_of_birth_enc)  : null,
    ssnLast4:             row.ssn_last4_enc       ? decrypt(row.ssn_last4_enc)      : null,
    genderIdentity:       row.gender_identity     ?? null,
    biologicalSex:        row.biological_sex      ?? null,
    raceEthnicity:        row.race_ethnicity      ?? null,
    maritalStatus:        row.marital_status      ?? null,
    languagePreference:   row.language_preference ?? 'en',
    employmentStatus:     row.employment_status   ?? null,
    employerName:         row.employer_name_enc   ? decrypt(row.employer_name_enc)  : null,
    email:                row.email_enc           ? decrypt(row.email_enc)          : null,
    isMinor:              Boolean(row.is_minor),
    courtOrdered:         Boolean(row.court_ordered),
    highTouchpoint:       Boolean(row.high_touchpoint),
    referralSourceDetail: row.referral_source_detail ?? null,
    primaryCounselorId:   row.primary_counselor_id   ?? null,
    status:               row.status,
    faithBackground:      row.faith_background ?? '',
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };
}

/**
 * Minimal projection for list endpoints — omits high-sensitivity PHI fields
 * (SSN, DOB, email, employer) that are not needed for a roster view.
 */
function dbRowToClientSummary(row) {
  return {
    id:                 row.id,
    tenantId:           row.tenant_id,
    firstName:          decrypt(row.first_name_enc),
    lastName:           decrypt(row.last_name_enc),
    preferredName:      row.preferred_name_enc ? decrypt(row.preferred_name_enc) : null,
    pronouns:           row.pronouns          ?? null,
    status:             row.status,
    faithBackground:    row.faith_background  ?? '',
    highTouchpoint:     Boolean(row.high_touchpoint),
    isMinor:            Boolean(row.is_minor),
    primaryCounselorId: row.primary_counselor_id ?? null,
    languagePreference: row.language_preference  ?? 'en',
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  };
}

function defaultClientAccessAuditAction(method) {
  if (method === 'GET') return 'client.record.read';
  if (method === 'DELETE') return 'client.record.delete';
  return 'client.record.update';
}

function resolveDevCounselorScopeId(request) {
  return sanitizeStr(
    request.headers['x-staff-id']
    ?? request.headers['x-staff-member-id']
    ?? '',
    64,
  ) || null;
}

async function resolveCallerCounselorScopeIdForAccess(request, session) {
  if (!COUNSELOR_SESSION_ROLES.has(callerRole(request, session))) {
    return null;
  }

  if (process.env.DB_NAME) {
    return await resolveCallerStaffMemberId(session) ?? resolveDevCounselorScopeId(request);
  }

  return resolveDevCounselorScopeId(request);
}

async function enforceAssignedClientAccess(request, response, client, session, deniedAction = 'client.record.read') {
  if (!COUNSELOR_SESSION_ROLES.has(callerRole(request, session))) {
    return false;
  }

  const counselorScopeId = await resolveCallerCounselorScopeIdForAccess(request, session);
  if (counselorScopeId && client?.primaryCounselorId === counselorScopeId) {
    return false;
  }

  await emitAudit(request, `${deniedAction}.denied`, 'client', client?.id ?? 'unknown', session);
  writeJson(response, 403, { error: 'Access to this resource is not permitted' });
  return true;
}

async function resolveAuthorizedClient(request, response, clientId, session, deniedAction = defaultClientAccessAuditAction(request.method)) {
  let client;
  if (process.env.DB_NAME) {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [clientId]);
    client = rows[0] ? dbRowToClient(rows[0]) : null;
  } else {
    client = clients.find((item) => item.id === clientId) ?? null;
  }

  if (!client) {
    writeJson(response, 404, { error: 'Client not found' });
    return null;
  }

  if (enforceTenantScope(request, response, client.tenantId, session)) return null;
  if (await enforceAssignedClientAccess(request, response, client, session, deniedAction)) return null;
  return client;
}

async function resolveOptionalAuthorizedClient(request, response, clientId, session, deniedAction = defaultClientAccessAuditAction(request.method)) {
  const normalizedClientId = sanitizeStr(clientId, 64) || null;
  if (!normalizedClientId) return null;
  return resolveAuthorizedClient(request, response, normalizedClientId, session, deniedAction);
}

async function resolveAuthorizedAppointment(request, response, appointmentId, session, deniedAction = 'appointment.update') {
  let appointment;
  if (process.env.DB_NAME) {
    appointment = await getAppointmentById(appointmentId, callerTenant(request, session));
  } else {
    appointment = appointments.find((item) => item.id === appointmentId) ?? null;
  }

  if (!appointment) {
    writeJson(response, 404, { error: 'Appointment not found' });
    return null;
  }

  if (enforceTenantScope(request, response, appointment.tenantId, session)) return null;
  if (appointment.clientId) {
    const client = await resolveAuthorizedClient(request, response, appointment.clientId, session, deniedAction);
    if (!client) return null;
  }

  return appointment;
}

async function handleClientById(request, response, requestUrl, session) {
  const clientId = requestUrl.pathname.replace('/v1/clients/', '');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (request.method === 'GET') {
    await emitAudit(request, 'client.read', 'client', client.id, session);
    // Support ?expand= for sub-resources
    const expandParam = requestUrl.searchParams?.get('expand') ?? '';
    if (process.env.DB_NAME && expandParam) {
      const wants = new Set(expandParam.split(',').map((s) => s.trim()));
      const [addresses, phones, contacts, insurance, referring, diagnoses, medications, allergies, clinical, faith, legal] = await Promise.all([
        wants.has('addresses')  ? listClientAddresses(client.id, client.tenantId)  : Promise.resolve(null),
        wants.has('phones')     ? listClientPhones(client.id, client.tenantId)     : Promise.resolve(null),
        wants.has('contacts')   ? listClientContacts(client.id, client.tenantId)   : Promise.resolve(null),
        wants.has('insurance')  ? listClientInsurance(client.id, client.tenantId)  : Promise.resolve(null),
        wants.has('referring')  ? listReferringProviders(client.id, client.tenantId) : Promise.resolve(null),
        wants.has('diagnoses')  ? listClientDiagnoses(client.id, client.tenantId)  : Promise.resolve(null),
        wants.has('medications')? listClientMedications(client.id, client.tenantId): Promise.resolve(null),
        wants.has('allergies')  ? listClientAllergies(client.id, client.tenantId)  : Promise.resolve(null),
        wants.has('clinical')   ? getClientClinicalHistory(client.id, client.tenantId) : Promise.resolve(null),
        wants.has('faith')      ? getClientFaithProfile(client.id, client.tenantId)    : Promise.resolve(null),
        wants.has('legal')      ? getClientLegal(client.id, client.tenantId)           : Promise.resolve(null),
      ]);
      const expanded = { ...client };
      if (addresses   !== null) expanded.addresses   = addresses;
      if (phones      !== null) expanded.phones       = phones;
      if (contacts    !== null) expanded.contacts     = contacts;
      if (insurance   !== null) expanded.insurance    = insurance;
      if (referring   !== null) expanded.referringProviders = referring;
      if (diagnoses   !== null) expanded.diagnoses    = diagnoses;
      if (medications !== null) expanded.medications  = medications;
      if (allergies   !== null) expanded.allergies    = allergies;
      if (clinical    !== null) expanded.clinicalHistory = clinical;
      if (faith       !== null) expanded.faithProfile = faith;
      if (legal       !== null) expanded.legal        = legal;
      writeJson(response, 200, { item: expanded });
      return;
    }
    writeJson(response, 200, { item: client });
    return;
  }

  if (request.method === 'DELETE') {
    if (process.env.DB_NAME) {
      await pool.query(
        'UPDATE clients SET status = ? WHERE id = ? AND status != ?',
        ['inactive', clientId, 'inactive'],
      );
      // Reflect change in returned object
      client.status = 'inactive';
    } else {
      const mem = clients.find((c) => c.id === clientId);
      if (mem) mem.status = 'inactive';
      if (client) client.status = 'inactive';
    }
    telemetry.recordMutation('client.delete');
    await emitAudit(request, 'client.delete', 'client', client.id, session);
    writeJson(response, 200, { item: { ...client, status: 'inactive' } });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const status = payload.status ? normalizeClientStatus(payload.status) : client.status;
  if (payload.status && !status) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  const newFirst = (typeof payload.firstName === 'string' && payload.firstName.trim())
    ? (sanitizeStr(payload.firstName) ?? client.firstName)
    : client.firstName;
  const newLast = (typeof payload.lastName === 'string' && payload.lastName.trim())
    ? (sanitizeStr(payload.lastName) ?? client.lastName)
    : client.lastName;
  const newFaith = (typeof payload.faithBackground === 'string' && payload.faithBackground.trim())
    ? (sanitizeStr(payload.faithBackground, 500) ?? client.faithBackground)
    : client.faithBackground;
  const newHighTouchpoint = payload.highTouchpoint !== undefined ? Boolean(payload.highTouchpoint) : Boolean(client.highTouchpoint);

  if (process.env.DB_NAME) {
    const setClauses = [
      'first_name_enc = ?', 'last_name_enc = ?', 'faith_background = ?', 'status = ?', 'high_touchpoint = ?',
    ];
    const setValues = [encrypt(newFirst), encrypt(newLast), newFaith, status, newHighTouchpoint ? 1 : 0];
    const p = payload;
    if (p.middleName    !== undefined) { setClauses.push('middle_name_enc = ?');      setValues.push(p.middleName    ? encrypt(sanitizeStr(p.middleName, 120))    : null); }
    if (p.preferredName !== undefined) { setClauses.push('preferred_name_enc = ?');   setValues.push(p.preferredName ? encrypt(sanitizeStr(p.preferredName, 120)) : null); }
    if (p.pronouns      !== undefined) { setClauses.push('pronouns = ?');             setValues.push(sanitizeStr(p.pronouns, 64) ?? null); }
    if (p.dateOfBirth   !== undefined) { setClauses.push('date_of_birth_enc = ?');    setValues.push(p.dateOfBirth   ? encrypt(sanitizeStr(p.dateOfBirth, 32))    : null); }
    if (p.ssnLast4      !== undefined) { setClauses.push('ssn_last4_enc = ?');        setValues.push(p.ssnLast4      ? encrypt(sanitizeStr(p.ssnLast4, 4))        : null); }
    if (p.genderIdentity!== undefined) { setClauses.push('gender_identity = ?');      setValues.push(sanitizeStr(p.genderIdentity, 128) ?? null); }
    if (p.biologicalSex !== undefined) { setClauses.push('biological_sex = ?');       setValues.push(sanitizeStr(p.biologicalSex, 32) ?? null); }
    if (p.raceEthnicity !== undefined) { setClauses.push('race_ethnicity = ?');       setValues.push(sanitizeStr(p.raceEthnicity, 128) ?? null); }
    if (p.maritalStatus !== undefined) { setClauses.push('marital_status = ?');       setValues.push(sanitizeStr(p.maritalStatus, 64) ?? null); }
    if (p.languagePreference !== undefined) { setClauses.push('language_preference = ?'); setValues.push(sanitizeStr(p.languagePreference, 64) ?? 'en'); }
    if (p.employmentStatus   !== undefined) { setClauses.push('employment_status = ?');   setValues.push(sanitizeStr(p.employmentStatus, 64) ?? null); }
    if (p.employerName  !== undefined) { setClauses.push('employer_name_enc = ?');    setValues.push(p.employerName  ? encrypt(sanitizeStr(p.employerName, 255))  : null); }
    if (p.email         !== undefined) { setClauses.push('email_enc = ?');            setValues.push(p.email         ? encrypt(sanitizeStr(p.email, 320))         : null); }
    if (p.isMinor       !== undefined) { setClauses.push('is_minor = ?');             setValues.push(Boolean(p.isMinor) ? 1 : 0); }
    if (p.courtOrdered  !== undefined) { setClauses.push('court_ordered = ?');        setValues.push(Boolean(p.courtOrdered) ? 1 : 0); }
    if (p.referralSourceDetail !== undefined) { setClauses.push('referral_source_detail = ?'); setValues.push(sanitizeStr(p.referralSourceDetail, 255) ?? null); }
    if (p.primaryCounselorId  !== undefined) { setClauses.push('primary_counselor_id = ?');   setValues.push(p.primaryCounselorId ? sanitizeStr(p.primaryCounselorId, 64) : null); }
    setValues.push(clientId);
    await pool.query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`, setValues);
    // Also update encrypted names in appointments table
    const fullName = `${newFirst} ${newLast}`;
    await pool.query(
      'UPDATE appointments SET client_name_enc = ? WHERE client_id = ? AND tenant_id = ?',
      [encrypt(fullName), clientId, client.tenantId],
    );
  } else {
    const mem = clients.find((c) => c.id === clientId);
    if (mem) {
      mem.firstName = newFirst;
      mem.lastName  = newLast;
      mem.faithBackground = newFaith;
      mem.status = status;
      mem.highTouchpoint = newHighTouchpoint;
      const fullName = `${newFirst} ${newLast}`;
      appointments.forEach((a) => { if (a.clientId === clientId) a.clientName = fullName; });
    }
  }

  const updated = { ...client, firstName: newFirst, lastName: newLast, faithBackground: newFaith, highTouchpoint: newHighTouchpoint, status };
  telemetry.recordMutation('client.update');
  await emitAudit(request, 'client.update', 'client', client.id, session);
  writeJson(response, 200, { item: updated });
}

// ─── Client sub-resource routing helper ──────────────────────────────────────

/**
 * Parse a path like /v1/clients/c-123/addresses or /v1/clients/c-123/addresses/addr-456
 * Returns { clientId, subresource, subId } or null if no subresource segment.
 */
function parseClientSubresource(pathname) {
  const prefix = '/v1/clients/';
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length); // e.g. "c-123/addresses/addr-456"
  const parts = rest.split('/');
  if (parts.length < 2) return null; // just the client ID, no subresource
  return { clientId: parts[0], subresource: parts[1], subId: parts[2] ?? null };
}

/** Fetch client row and enforce tenant plus counselor assignment scope; returns client or writes 404/403 and returns null. */
async function resolveClientForSubresource(request, response, clientId, session) {
  return resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
}

// ─── Sub-resource handlers ────────────────────────────────────────────────────

async function handleClientAddressesRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientAddresses(clientId, tenantId);
      await emitAudit(request, 'client.addresses.read', 'client_address', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.line1) { writeJson(response, 400, { error: 'line1 is required' }); return; }
      const item = await createClientAddress({ id: genId('addr'), tenantId, clientId, addrType: sanitizeStr(p.addrType, 32) ?? 'primary', line1: sanitizeStr(p.line1, 255), line2: sanitizeStr(p.line2, 255) ?? null, city: sanitizeStr(p.city, 120), state: sanitizeStr(p.state, 64) ?? '', postal: sanitizeStr(p.postal, 20), country: sanitizeStr(p.country, 64) ?? 'US', isPreferred: Boolean(p.isPreferred) });
      await emitAudit(request, 'client.address.create', 'client_address', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientAddress(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Address not found' }); return; }
    await emitAudit(request, 'client.address.update', 'client_address', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientAddress(subId, clientId, tenantId);
    await emitAudit(request, 'client.address.delete', 'client_address', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientPhonesRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientPhones(clientId, tenantId);
      await emitAudit(request, 'client.phones.read', 'client_phone', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.number) { writeJson(response, 400, { error: 'number is required' }); return; }
      const item = await createClientPhone({ id: genId('ph'), tenantId, clientId, phoneType: sanitizeStr(p.phoneType, 32) ?? 'cell', number: sanitizeStr(p.number, 30), extension: sanitizeStr(p.extension, 16) ?? null, isPreferred: Boolean(p.isPreferred), okToText: Boolean(p.okToText), okToLeaveMsg: p.okToLeaveMsg !== false });
      await emitAudit(request, 'client.phone.create', 'client_phone', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientPhone(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Phone not found' }); return; }
    await emitAudit(request, 'client.phone.update', 'client_phone', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientPhone(subId, clientId, tenantId);
    await emitAudit(request, 'client.phone.delete', 'client_phone', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientContactsRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientContacts(clientId, tenantId);
      await emitAudit(request, 'client.contacts.read', 'client_contact', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.name || !p.phone || !p.relationship) { writeJson(response, 400, { error: 'name, phone, and relationship are required' }); return; }
      const item = await createClientContact({ id: genId('cc'), tenantId, clientId, contactType: sanitizeStr(p.contactType, 32) ?? 'emergency', name: sanitizeStr(p.name, 200), relationship: sanitizeStr(p.relationship, 64), phone: sanitizeStr(p.phone, 30), email: sanitizeStr(p.email, 320) ?? null, isPrimary: Boolean(p.isPrimary), hasLegalAuth: Boolean(p.hasLegalAuth), notes: sanitizeStr(p.notes, 1000) ?? null });
      await emitAudit(request, 'client.contact.create', 'client_contact', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientContact(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Contact not found' }); return; }
    await emitAudit(request, 'client.contact.update', 'client_contact', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientContact(subId, clientId, tenantId);
    await emitAudit(request, 'client.contact.delete', 'client_contact', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientInsuranceRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientInsurance(clientId, tenantId);
      await emitAudit(request, 'client.insurance.read', 'client_insurance', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.carrierName || !p.memberId) { writeJson(response, 400, { error: 'carrierName and memberId are required' }); return; }
      const item = await createClientInsurance({ id: genId('ins'), tenantId, clientId, coverageOrder: sanitizeStr(p.coverageOrder, 16) ?? 'primary', carrierName: sanitizeStr(p.carrierName, 255), planName: sanitizeStr(p.planName, 255) ?? null, memberId: sanitizeStr(p.memberId, 64), groupNumber: sanitizeStr(p.groupNumber, 64) ?? null, subscriberName: sanitizeStr(p.subscriberName, 200) ?? null, subscriberDob: sanitizeStr(p.subscriberDob, 32) ?? null, subscriberRel: sanitizeStr(p.subscriberRel, 64) ?? null, authNumber: sanitizeStr(p.authNumber, 64) ?? null, authVisitsApproved: p.authVisitsApproved ? Number(p.authVisitsApproved) : null, authExpiresOn: p.authExpiresOn ?? null, referralNumber: sanitizeStr(p.referralNumber, 64) ?? null, copayCents: p.copayCents ? Number(p.copayCents) : null, effectiveFrom: p.effectiveFrom ?? null, effectiveTo: p.effectiveTo ?? null, isActive: p.isActive !== false, verifiedOn: p.verifiedOn ?? null, verifiedBy: sanitizeStr(p.verifiedBy, 64) ?? null });
      await emitAudit(request, 'client.insurance.create', 'client_insurance', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientInsurance(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Insurance record not found' }); return; }
    await emitAudit(request, 'client.insurance.update', 'client_insurance', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientInsurance(subId, clientId, tenantId);
    await emitAudit(request, 'client.insurance.delete', 'client_insurance', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientReferringProvidersRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listReferringProviders(clientId, tenantId);
      await emitAudit(request, 'client.referring.read', 'client_referring_provider', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.providerName) { writeJson(response, 400, { error: 'providerName is required' }); return; }
      const item = await createReferringProvider({ id: genId('rp'), tenantId, clientId, providerName: sanitizeStr(p.providerName, 200), practiceName: sanitizeStr(p.practiceName, 255) ?? null, npi: sanitizeStr(p.npi, 16) ?? null, phone: sanitizeStr(p.phone, 30) ?? null, fax: sanitizeStr(p.fax, 30) ?? null, address: p.address ?? null, referralDate: p.referralDate ?? null, referralNotes: sanitizeStr(p.referralNotes, 1000) ?? null });
      await emitAudit(request, 'client.referring.create', 'client_referring_provider', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateReferringProvider(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Referring provider not found' }); return; }
    await emitAudit(request, 'client.referring.update', 'client_referring_provider', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteReferringProvider(subId, clientId, tenantId);
    await emitAudit(request, 'client.referring.delete', 'client_referring_provider', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientDiagnosesRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientDiagnoses(clientId, tenantId);
      await emitAudit(request, 'client.diagnoses.read', 'client_diagnosis', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.code || !p.description) { writeJson(response, 400, { error: 'code and description are required' }); return; }
      const item = await createClientDiagnosis({ id: genId('dx'), tenantId, clientId, codeSystem: sanitizeStr(p.codeSystem, 16) ?? 'DSM-5', code: sanitizeStr(p.code, 32), description: sanitizeStr(p.description, 500), onsetDate: p.onsetDate ?? null, status: sanitizeStr(p.status, 32) ?? 'active', isPrimary: Boolean(p.isPrimary), notes: sanitizeStr(p.notes, 1000) ?? null, diagnosedBy: sanitizeStr(p.diagnosedBy, 64) ?? null });
      await emitAudit(request, 'client.diagnosis.create', 'client_diagnosis', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientDiagnosis(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Diagnosis not found' }); return; }
    await emitAudit(request, 'client.diagnosis.update', 'client_diagnosis', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientDiagnosis(subId, clientId, tenantId);
    await emitAudit(request, 'client.diagnosis.delete', 'client_diagnosis', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleDsm5TrReferenceLookup(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  if (!session) {
    writeJson(response, 401, { error: 'Authentication required' });
    return;
  }

  const query = sanitizeStr(requestUrl.searchParams.get('q'), 100) ?? '';
  const requestedLimit = Number.parseInt(requestUrl.searchParams.get('limit') ?? '12', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 25)
    : 12;

  if (query.trim().length < 2) {
    writeJson(response, 200, {
      items: [],
      meta: {
        query,
        limit,
        count: 0,
      },
    });
    return;
  }

  const items = await searchDsm5TrDiagnoses(query, { limit });
  writeJson(response, 200, {
    items,
    meta: {
      query,
      limit,
      count: items.length,
    },
  });
}

async function handleClientMedicationsRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientMedications(clientId, tenantId);
      await emitAudit(request, 'client.medications.read', 'client_medication', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.medName) { writeJson(response, 400, { error: 'medName is required' }); return; }
      const item = await createClientMedication({ id: genId('med'), tenantId, clientId, medName: sanitizeStr(p.medName, 255), dose: sanitizeStr(p.dose, 100) ?? null, frequency: sanitizeStr(p.frequency, 200) ?? null, route: sanitizeStr(p.route, 64) ?? null, prescriber: sanitizeStr(p.prescriber, 200) ?? null, startDate: p.startDate ?? null, endDate: p.endDate ?? null, isActive: p.isActive !== false, reason: sanitizeStr(p.reason, 500) ?? null, notes: sanitizeStr(p.notes, 1000) ?? null });
      await emitAudit(request, 'client.medication.create', 'client_medication', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientMedication(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Medication not found' }); return; }
    await emitAudit(request, 'client.medication.update', 'client_medication', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientMedication(subId, clientId, tenantId);
    await emitAudit(request, 'client.medication.delete', 'client_medication', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientAllergiesRoute(request, response, { clientId, subId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;
  const tenantId = client.tenantId;

  if (!subId) {
    if (request.method === 'GET') {
      const items = await listClientAllergies(clientId, tenantId);
      await emitAudit(request, 'client.allergies.read', 'client_allergy', clientId, session);
      writeJson(response, 200, { items }); return;
    }
    if (request.method === 'POST') {
      const p = await readJsonBody(request);
      if (!p.substance) { writeJson(response, 400, { error: 'substance is required' }); return; }
      const item = await createClientAllergy({ id: genId('alg'), tenantId, clientId, substance: sanitizeStr(p.substance, 255), reaction: sanitizeStr(p.reaction, 500) ?? null, severity: sanitizeStr(p.severity, 32) ?? 'unknown', allergyType: sanitizeStr(p.allergyType, 32) ?? 'drug', onsetDate: p.onsetDate ?? null, isActive: p.isActive !== false });
      await emitAudit(request, 'client.allergy.create', 'client_allergy', item.id, session);
      writeJson(response, 201, { item }); return;
    }
    writeJson(response, 405, { error: 'Method not allowed' }); return;
  }
  if (request.method === 'PATCH') {
    const p = await readJsonBody(request);
    const item = await updateClientAllergy(subId, clientId, tenantId, p);
    if (!item) { writeJson(response, 404, { error: 'Allergy not found' }); return; }
    await emitAudit(request, 'client.allergy.update', 'client_allergy', subId, session);
    writeJson(response, 200, { item }); return;
  }
  if (request.method === 'DELETE') {
    await deleteClientAllergy(subId, clientId, tenantId);
    await emitAudit(request, 'client.allergy.delete', 'client_allergy', subId, session);
    writeJson(response, 204, {}); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientClinicalHistoryRoute(request, response, { clientId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;

  if (request.method === 'GET') {
    const item = await getClientClinicalHistory(clientId, client.tenantId);
    await emitAudit(request, 'client.clinical_history.read', 'client_clinical_history', clientId, session);
    writeJson(response, 200, { item: item ?? null }); return;
  }
  if (request.method === 'PUT') {
    const p = await readJsonBody(request);
    const item = await upsertClientClinicalHistory({ ...p, id: genId('cch'), tenantId: client.tenantId, clientId });
    await emitAudit(request, 'client.clinical_history.upsert', 'client_clinical_history', clientId, session);
    writeJson(response, 200, { item }); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientIntakePreviewRoute(request, response, { clientId }, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;

  if (process.env.DB_NAME) {
    const [intakePacket, portalProfile, submissions, appointments] = await Promise.all([
      getIntakePacket(clientId, client.tenantId),
      getPortalClientProfile(clientId, client.tenantId),
      listFormSubmissions(client.tenantId, { clientId }),
      listAppointments(client.tenantId, { clientId }),
    ]);
    const item = buildIntakePreview({
      client,
      intakePacket,
      portalProfile,
      submissions,
      appointments,
    });
    await emitAudit(request, 'client.intake_preview.read', 'client', clientId, session);
    writeJson(response, 200, { item });
    return;
  }

  const item = buildIntakePreview({
    client,
    intakePacket: intakePackets.find((entry) => entry.clientId === clientId && entry.tenantId === client.tenantId) ?? null,
    portalProfile: portalClientProfiles.find((entry) => entry.clientId === clientId && entry.tenantId === client.tenantId) ?? null,
    submissions: formWorkflowSubmissions.filter((entry) => entry.clientId === clientId && entry.tenantId === client.tenantId),
    appointments: appointments.filter((entry) => entry.clientId === clientId && entry.tenantId === client.tenantId),
  });
  await emitAudit(request, 'client.intake_preview.read', 'client', clientId, session);
  writeJson(response, 200, { item });
}

async function handleClientFaithProfileRoute(request, response, { clientId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;

  if (request.method === 'GET') {
    const item = await getClientFaithProfile(clientId, client.tenantId);
    await emitAudit(request, 'client.faith_profile.read', 'client_faith_profile', clientId, session);
    writeJson(response, 200, { item: item ?? null }); return;
  }
  if (request.method === 'PUT') {
    const p = await readJsonBody(request);
    const item = await upsertClientFaithProfile({ ...p, id: genId('cfp'), tenantId: client.tenantId, clientId });
    await emitAudit(request, 'client.faith_profile.upsert', 'client_faith_profile', clientId, session);
    writeJson(response, 200, { item }); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleClientLegalRoute(request, response, { clientId }, session) {
  if (!process.env.DB_NAME) { writeJson(response, 503, { error: 'Database not configured' }); return; }
  const client = await resolveClientForSubresource(request, response, clientId, session);
  if (!client) return;

  if (request.method === 'GET') {
    const item = await getClientLegal(clientId, client.tenantId);
    await emitAudit(request, 'client.legal.read', 'client_legal', clientId, session);
    writeJson(response, 200, { item: item ?? null }); return;
  }
  if (request.method === 'PUT') {
    const p = await readJsonBody(request);
    const item = await upsertClientLegal({ ...p, id: genId('clg'), tenantId: client.tenantId, clientId });
    await emitAudit(request, 'client.legal.upsert', 'client_legal', clientId, session);
    writeJson(response, 200, { item }); return;
  }
  writeJson(response, 405, { error: 'Method not allowed' });
}

// ─────────────────────────────────────────────────────────────────────────────

async function handleClientLifecycle(request, response, requestUrl, session) {
  const clientId = extractClientIdForSegment(requestUrl.pathname, 'lifecycle');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (process.env.DB_NAME) {
    if (request.method === 'GET') {
      let lc = await getLifecycle(client.id, client.tenantId);
      if (!lc) lc = await createLifecycle({ id: genId('lc'), clientId: client.id, tenantId: client.tenantId, caseStatus: 'active', referralSource: '', emergencyContact: null });
      await emitAudit(request, 'client.lifecycle.read', 'client', client.id, session);
      writeJson(response, 200, { item: lc });
      return;
    }

    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }

    const payload = await readJsonBody(request);
    let lc = await getLifecycle(client.id, client.tenantId);
    if (!lc) lc = await createLifecycle({ id: genId('lc'), clientId: client.id, tenantId: client.tenantId, caseStatus: 'active', referralSource: '', emergencyContact: null });

    const fields = {};

    if (typeof payload.caseStatus === 'string') {
      const nextCaseStatus = normalizeCaseStatus(payload.caseStatus);
      if (!nextCaseStatus) { writeJson(response, 400, { error: 'caseStatus must be valid' }); return; }
      fields.caseStatus = nextCaseStatus;
    }

    if (typeof payload.referralSource === 'string') {
      fields.referralSource = sanitizeStr(payload.referralSource, 200) ?? '';
    }

    if (payload.emergencyContact && typeof payload.emergencyContact === 'object') {
      fields.emergencyContact = {
        name: sanitizeStr(payload.emergencyContact.name, 200) ?? lc.emergencyContact?.name ?? '',
        relationship: sanitizeStr(payload.emergencyContact.relationship, 120) ?? lc.emergencyContact?.relationship ?? '',
        phone: sanitizeStr(payload.emergencyContact.phone, 80) ?? lc.emergencyContact?.phone ?? '',
        authorized: payload.emergencyContact.authorized !== undefined
          ? Boolean(payload.emergencyContact.authorized)
          : Boolean(lc.emergencyContact?.authorized),
      };
    }

    const effectiveCaseStatus = fields.caseStatus ?? lc.caseStatus;
    if (effectiveCaseStatus === 'discharged') {
      fields.dischargeRecord = {
        reason: sanitizeStr(payload.dischargeReason, 240) ?? lc.dischargeRecord?.reason ?? 'Case closed',
        summary: sanitizeStr(payload.dischargeSummary, 1000) ?? lc.dischargeRecord?.summary ?? '',
        dischargedAt: normalizeIsoDate(payload.dischargedAt) ?? lc.dischargeRecord?.dischargedAt ?? new Date().toISOString(),
      };
    }

    const updated = await updateLifecycle(client.id, client.tenantId, fields);
    telemetry.recordMutation('client.lifecycle.update');
    await emitAudit(request, 'client.lifecycle.update', 'client', client.id, session);
    writeJson(response, 200, { item: updated });
    return;
  }

  const lifecycle = getOrCreateLifecycle(client);

  if (request.method === 'GET') {
    emitAudit(request, 'client.lifecycle.read', 'client', client.id);
    writeJson(response, 200, { item: lifecycle });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  if (typeof payload.caseStatus === 'string') {
    const nextCaseStatus = normalizeCaseStatus(payload.caseStatus);
    if (!nextCaseStatus) {
      writeJson(response, 400, { error: 'caseStatus must be valid' });
      return;
    }
    lifecycle.caseStatus = nextCaseStatus;
  }

  if (typeof payload.referralSource === 'string') {
    lifecycle.referralSource = sanitizeStr(payload.referralSource, 200) ?? '';
  }

  if (payload.emergencyContact && typeof payload.emergencyContact === 'object') {
    lifecycle.emergencyContact = {
      name: sanitizeStr(payload.emergencyContact.name, 200) ?? lifecycle.emergencyContact?.name ?? '',
      relationship: sanitizeStr(payload.emergencyContact.relationship, 120) ?? lifecycle.emergencyContact?.relationship ?? '',
      phone: sanitizeStr(payload.emergencyContact.phone, 80) ?? lifecycle.emergencyContact?.phone ?? '',
      authorized: payload.emergencyContact.authorized !== undefined
        ? Boolean(payload.emergencyContact.authorized)
        : Boolean(lifecycle.emergencyContact?.authorized),
    };
  }

  if (lifecycle.caseStatus === 'discharged') {
    lifecycle.dischargeRecord = {
      reason: sanitizeStr(payload.dischargeReason, 240) ?? lifecycle.dischargeRecord?.reason ?? 'Case closed',
      summary: sanitizeStr(payload.dischargeSummary, 1000) ?? lifecycle.dischargeRecord?.summary ?? '',
      dischargedAt: normalizeIsoDate(payload.dischargedAt) ?? lifecycle.dischargeRecord?.dischargedAt ?? new Date().toISOString(),
    };
  }

  lifecycle.updatedAt = new Date().toISOString();

  telemetry.recordMutation('client.lifecycle.update');
  await emitAudit(request, 'client.lifecycle.update', 'client', client.id, session);
  writeJson(response, 200, { item: lifecycle });
}

async function handleClientConsents(request, response, requestUrl, session) {
  const clientId = extractClientIdForSegment(requestUrl.pathname, 'consents');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listConsents(clientId, client.tenantId);
      emitAudit(request, 'client.consent.read', 'client', client.id, session);
      writeJson(response, 200, { items });
      return;
    }
    const items = consentRecords.filter((item) => item.clientId === clientId);
    emitAudit(request, 'client.consent.read', 'client', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const consentType = normalizeConsentType(payload.consentType);
    const signatureState = normalizeConsentState(payload.signatureState ?? 'pending');
    if (!consentType) {
      writeJson(response, 400, { error: 'consentType must be valid' });
      return;
    }
    if (!signatureState) {
      writeJson(response, 400, { error: 'signatureState must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      const item = await createConsent({
        id: genId('cons'),
        tenantId: client.tenantId,
        clientId,
        consentType,
        signatureState,
        version: sanitizeStr(payload.version, 20) ?? 'v1',
        effectiveFrom: normalizeIsoDate(payload.effectiveFrom) ?? new Date().toISOString(),
        effectiveTo: normalizeIsoDate(payload.effectiveTo),
      });
      telemetry.recordMutation('client.consent.create');
      emitAudit(request, 'client.consent.create', 'consent', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = { ...createConsentRecord({
      id: createId('cons', consentRecords),
      tenantId: client.tenantId,
      clientId,
      consentType,
      signatureState,
      version: sanitizeStr(payload.version, 20) ?? 'v1',
      effectiveFrom: normalizeIsoDate(payload.effectiveFrom) ?? new Date().toISOString(),
      effectiveTo: normalizeIsoDate(payload.effectiveTo),
    }) };

    consentRecords.push(item);
    telemetry.recordMutation('client.consent.create');
    emitAudit(request, 'client.consent.create', 'consent', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const consentId = sanitizeStr(payload.consentId, 50);
  if (process.env.DB_NAME) {
    const fields = {};
    if (typeof payload.signatureState === 'string') {
      const nextState = normalizeConsentState(payload.signatureState);
      if (!nextState) { writeJson(response, 400, { error: 'signatureState must be valid' }); return; }
      fields.signatureState = nextState;
    }
    if (typeof payload.version === 'string') fields.version = sanitizeStr(payload.version, 20);
    if (typeof payload.effectiveFrom === 'string') fields.effectiveFrom = normalizeIsoDate(payload.effectiveFrom);
    if (typeof payload.effectiveTo === 'string') fields.effectiveTo = normalizeIsoDate(payload.effectiveTo);
    const [rows] = await pool.query('SELECT * FROM consent_records WHERE id = ? AND client_id = ? AND tenant_id = ?', [consentId, clientId, client.tenantId]);
    if (!rows[0]) { writeJson(response, 404, { error: 'Consent not found' }); return; }
    await updateConsent(consentId, clientId, client.tenantId, fields);
    const [updated] = await pool.query('SELECT * FROM consent_records WHERE id = ?', [consentId]);
    const item = { id: updated[0].id, clientId: updated[0].client_id, tenantId: updated[0].tenant_id, consentType: updated[0].consent_type, signatureState: updated[0].signature_state, version: updated[0].version, effectiveFrom: updated[0].effective_from, effectiveTo: updated[0].effective_to, signedAt: updated[0].signed_at };
    telemetry.recordMutation('client.consent.update');
    emitAudit(request, 'client.consent.update', 'consent', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = consentRecords.find((record) => record.id === consentId && record.clientId === clientId);
  if (!item) {
    writeJson(response, 404, { error: 'Consent not found' });
    return;
  }

  if (typeof payload.signatureState === 'string') {
    const nextState = normalizeConsentState(payload.signatureState);
    if (!nextState) {
      writeJson(response, 400, { error: 'signatureState must be valid' });
      return;
    }
    item.signatureState = nextState;
  }

  if (typeof payload.version === 'string') item.version = sanitizeStr(payload.version, 20) ?? item.version;
  if (typeof payload.effectiveFrom === 'string') item.effectiveFrom = normalizeIsoDate(payload.effectiveFrom) ?? item.effectiveFrom;
  if (typeof payload.effectiveTo === 'string') item.effectiveTo = normalizeIsoDate(payload.effectiveTo);

  telemetry.recordMutation('client.consent.update');
  emitAudit(request, 'client.consent.update', 'consent', item.id);
  writeJson(response, 200, { item });
}

async function handleClientIntakePackets(request, response, requestUrl, session) {
  const clientId = extractClientIdForSegment(requestUrl.pathname, 'intake-packets');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const item = await getIntakePacket(clientId, client.tenantId);
      emitAudit(request, 'client.intake.read', 'client', client.id, session);
      writeJson(response, 200, { items: item ? [item] : [] });
      return;
    }
    const items = intakePackets.filter((item) => item.clientId === clientId);
    emitAudit(request, 'client.intake.read', 'client', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const status = normalizeIntakeStatus(payload.status ?? 'assigned');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    const assignedForms = Array.isArray(payload.assignedForms)
      ? payload.assignedForms.map((form) => sanitizeStr(String(form), 160)).filter(Boolean)
      : [];

    if (process.env.DB_NAME) {
      const item = await createIntakePacket({
        id: genId('ip'),
        tenantId: client.tenantId,
        clientId,
        status,
        assignedForms,
        submittedAt: normalizeIsoDate(payload.submittedAt),
      });
      telemetry.recordMutation('client.intake.create');
      emitAudit(request, 'client.intake.create', 'intake_packet', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = { ...createIntakePacketRecord({
      id: createId('ip', intakePackets),
      tenantId: client.tenantId,
      clientId,
      status,
      assignedForms,
      submittedAt: normalizeIsoDate(payload.submittedAt),
    }) };

    intakePackets.push(item);
    telemetry.recordMutation('client.intake.create');
    emitAudit(request, 'client.intake.create', 'intake_packet', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const packetId = sanitizeStr(payload.packetId, 50);
  if (process.env.DB_NAME) {
    const existing = await getIntakePacket(clientId, client.tenantId);
    if (!existing || existing.id !== packetId) { writeJson(response, 404, { error: 'Intake packet not found' }); return; }
    const fields = {};
    if (typeof payload.status === 'string') {
      const nextStatus = normalizeIntakeStatus(payload.status);
      if (!nextStatus) { writeJson(response, 400, { error: 'status must be valid' }); return; }
      fields.status = nextStatus;
    }
    if (Array.isArray(payload.assignedForms)) fields.assignedForms = payload.assignedForms.map((form) => sanitizeStr(String(form), 160)).filter(Boolean);
    if (typeof payload.submittedAt === 'string') fields.submittedAt = normalizeIsoDate(payload.submittedAt);
    await updateIntakePacket(clientId, client.tenantId, fields);
    const item = await getIntakePacket(clientId, client.tenantId);
    telemetry.recordMutation('client.intake.update');
    emitAudit(request, 'client.intake.update', 'intake_packet', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = intakePackets.find((record) => record.id === packetId && record.clientId === clientId);
  if (!item) {
    writeJson(response, 404, { error: 'Intake packet not found' });
    return;
  }

  if (typeof payload.status === 'string') {
    const nextStatus = normalizeIntakeStatus(payload.status);
    if (!nextStatus) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = nextStatus;
  }

  if (Array.isArray(payload.assignedForms)) {
    item.assignedForms = payload.assignedForms.map((form) => sanitizeStr(String(form), 160)).filter(Boolean);
  }

  if (typeof payload.submittedAt === 'string') {
    item.submittedAt = normalizeIsoDate(payload.submittedAt) ?? item.submittedAt;
  }

  telemetry.recordMutation('client.intake.update');
  emitAudit(request, 'client.intake.update', 'intake_packet', item.id);
  writeJson(response, 200, { item });
}

async function handleClientTreatmentPlan(request, response, requestUrl, session) {
  const clientId = extractClientIdForSegment(requestUrl.pathname, 'treatment-plan');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const plan = await getTreatmentPlan(clientId, client.tenantId);
      emitAudit(request, 'chart.treatment_plan.read', 'client', client.id, session);
      writeJson(response, 200, { item: plan ?? null });
      return;
    }
    const plan = treatmentPlans.find((item) => item.clientId === clientId);
    emitAudit(request, 'chart.treatment_plan.read', 'client', client.id);
    writeJson(response, 200, { item: plan ?? null });
    return;
  }

  if (request.method !== 'PUT') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const status = normalizeTreatmentPlanStatus(payload.status ?? 'draft');
  if (!status) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  const goals = Array.isArray(payload.goals)
    ? payload.goals.map((goal) => sanitizeStr(String(goal), 300)).filter(Boolean)
    : [];
  const interventions = Array.isArray(payload.interventions)
    ? payload.interventions.map((entry) => sanitizeStr(String(entry), 300)).filter(Boolean)
    : [];

  if (process.env.DB_NAME) {
    const existing = await getTreatmentPlan(clientId, client.tenantId);
    if (!existing) {
      await createTreatmentPlan({
        id: genId('tp'),
        tenantId: client.tenantId,
        clientId,
        status,
        goals,
        interventions,
      });
    } else {
      await updateTreatmentPlan(clientId, client.tenantId, { status, goals, interventions });
    }
    const plan = await getTreatmentPlan(clientId, client.tenantId);
    telemetry.recordMutation('chart.treatment_plan.upsert');
    emitAudit(request, 'chart.treatment_plan.upsert', 'treatment_plan', plan.id, session);
    writeJson(response, 200, { item: plan });
    return;
  }

  let plan = treatmentPlans.find((item) => item.clientId === clientId);

  if (!plan) {
    plan = { ...createTreatmentPlanRecord({
      id: createId('tp', treatmentPlans),
      tenantId: client.tenantId,
      clientId,
      status,
      goals,
      interventions,
      reviewCadence: sanitizeStr(payload.reviewCadence, 60) ?? 'monthly',
      reviewedAt: normalizeIsoDate(payload.reviewedAt) ?? null,
    }) };
    treatmentPlans.push(plan);
  } else {
    plan.status = status;
    plan.goals = goals;
    plan.interventions = interventions;
    plan.reviewCadence = sanitizeStr(payload.reviewCadence, 60) ?? plan.reviewCadence;
    plan.reviewedAt = normalizeIsoDate(payload.reviewedAt) ?? plan.reviewedAt;
  }

  telemetry.recordMutation('chart.treatment_plan.upsert');
  emitAudit(request, 'chart.treatment_plan.upsert', 'treatment_plan', plan.id);
  writeJson(response, 200, { item: plan });
}

async function handleClientProgressNotes(request, response, requestUrl, session) {
  const clientId = extractClientIdForSegment(requestUrl.pathname, 'progress-notes');
  const client = await resolveAuthorizedClient(request, response, clientId, session, defaultClientAccessAuditAction(request.method));
  if (!client) return;

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listProgressNotes(clientId, client.tenantId);
      await emitAudit(request, 'chart.progress_note.read', 'client', client.id, session);
      writeJson(response, 200, { items });
      return;
    }
    const items = progressNotes.filter((item) => item.clientId === clientId);
    await emitAudit(request, 'chart.progress_note.read', 'client', client.id, session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const noteType = normalizeProgressNoteType(payload.noteType ?? 'progress_note');
  if (!noteType) {
    writeJson(response, 400, { error: 'noteType must be valid' });
    return;
  }
  const summary = sanitizeStr(payload.summary, 3000);
  if (!summary) {
    writeJson(response, 400, { error: 'summary is required' });
    return;
  }
  const interventions = Array.isArray(payload.interventions)
    ? payload.interventions.map((entry) => sanitizeStr(String(entry), 300)).filter(Boolean)
    : [];
  const appointmentId = sanitizeStr(payload.appointmentId, 64) ?? null;

  if (process.env.DB_NAME) {
    const item = await createProgressNote({
      id: genId('pn'),
      tenantId: client.tenantId,
      clientId,
      appointmentId,
      noteType,
      summary,
      interventions: interventions.join('\n'),
      lockedNote: Boolean(payload.locked),
      signedBy: Boolean(payload.locked) ? sanitizeStr(payload.signedBy, 120) ?? callerRole(request, session) : null,
      signedAt: Boolean(payload.locked) ? new Date().toISOString() : null,
    });
    telemetry.recordMutation('chart.progress_note.create');
    emitAudit(request, 'chart.progress_note.create', 'progress_note', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = { ...createProgressNoteRecord({
    id: createId('pn', progressNotes),
    tenantId: client.tenantId,
    clientId,
    appointmentId,
    noteType,
    summary,
    interventions,
    locked: Boolean(payload.locked),
    signedBy: Boolean(payload.locked) ? sanitizeStr(payload.signedBy, 120) ?? callerRole(request) : null,
    signedAt: Boolean(payload.locked) ? new Date().toISOString() : null,
  }) };

  progressNotes.push(item);
  telemetry.recordMutation('chart.progress_note.create');
  emitAudit(request, 'chart.progress_note.create', 'progress_note', item.id);
  writeJson(response, 201, { item });
}

async function handleClientProgressNoteById(request, response, requestUrl, session) {
  // Extract clientId and noteId from /v1/clients/:clientId/progress-notes/:noteId
  const parts = requestUrl.pathname.split('/');
  const notesIdx = parts.indexOf('progress-notes');
  const clientsIdx = parts.indexOf('clients');
  if (notesIdx === -1 || clientsIdx === -1 || notesIdx + 1 >= parts.length || clientsIdx + 1 >= parts.length) {
    writeJson(response, 404, { error: 'Not found' });
    return;
  }
  const clientId = parts[clientsIdx + 1];
  const noteId = parts[notesIdx + 1];

  if (!clientId || !noteId) {
    writeJson(response, 404, { error: 'Not found' });
    return;
  }

  const client = await resolveAuthorizedClient(request, response, clientId, session, 'chart.progress_note.update');
  if (!client) return;
  const tenantId = client.tenantId;

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  // Fetch the existing note to enforce lock immutability
  if (process.env.DB_NAME) {
    const [noteRows] = await pool.query(
      'SELECT id, locked FROM progress_notes WHERE id = ? AND client_id = ? AND tenant_id = ?',
      [noteId, clientId, tenantId],
    );
    if (!noteRows[0]) { writeJson(response, 404, { error: 'Note not found' }); return; }
    if (noteRows[0].locked) { writeJson(response, 409, { error: 'Note is signed and locked. It cannot be modified.' }); return; }
  }

  const payload = await readJsonBody(request);
  const fields = {};

  if (payload.noteType !== undefined) {
    const nt = normalizeProgressNoteType(payload.noteType);
    if (!nt) { writeJson(response, 400, { error: 'noteType must be valid' }); return; }
    fields.noteType = nt;
  }
  if (payload.summary !== undefined) {
    const s = sanitizeStr(payload.summary, 3000);
    if (!s) { writeJson(response, 400, { error: 'summary cannot be empty' }); return; }
    fields.summary = s;
  }
  if (payload.interventions !== undefined) {
    const list = Array.isArray(payload.interventions)
      ? payload.interventions.map((e) => sanitizeStr(String(e), 300)).filter(Boolean)
      : [];
    fields.interventions = list.join('\n');
  }
  if (payload.locked === true) {
    fields.lockedNote = true;
    fields.signedBy = sanitizeStr(payload.signedBy, 120) ?? callerRole(request, session);
    fields.signedAt = new Date().toISOString();
  }

  if (!Object.keys(fields).length) {
    writeJson(response, 400, { error: 'No updatable fields provided' });
    return;
  }

  if (process.env.DB_NAME) {
    await updateProgressNote(noteId, clientId, tenantId, fields);
    const [updated] = await pool.query(
      'SELECT * FROM progress_notes WHERE id = ? AND client_id = ? AND tenant_id = ?',
      [noteId, clientId, tenantId],
    );
    const item = updated[0] ? {
      id: updated[0].id,
      clientId: updated[0].client_id,
      tenantId: updated[0].tenant_id,
      appointmentId: updated[0].appointment_id ?? null,
      noteType: updated[0].note_type,
      summary: updated[0].summary_enc,
      locked: Boolean(updated[0].locked),
      signedBy: updated[0].signed_by,
      signedAt: updated[0].signed_at,
      createdAt: updated[0].created_at,
    } : null;
    telemetry.recordMutation(fields.lockedNote ? 'chart.progress_note.sign' : 'chart.progress_note.update');
    emitAudit(request, fields.lockedNote ? 'chart.progress_note.sign' : 'chart.progress_note.update', 'progress_note', noteId, session);
    writeJson(response, 200, { item });
    return;
  }

  // In-memory fallback
  const noteIdx = progressNotes.findIndex((n) => n.id === noteId && n.clientId === clientId);
  if (noteIdx === -1) { writeJson(response, 404, { error: 'Note not found' }); return; }
  if (progressNotes[noteIdx].locked) { writeJson(response, 409, { error: 'Note is signed and locked. It cannot be modified.' }); return; }
  Object.assign(progressNotes[noteIdx], {
    ...(fields.noteType ? { noteType: fields.noteType } : {}),
    ...(fields.summary ? { summary: fields.summary } : {}),
    ...(fields.interventions !== undefined ? { interventions: fields.interventions.split('\n').filter(Boolean) } : {}),
    ...(fields.lockedNote ? { locked: true, signedBy: fields.signedBy, signedAt: fields.signedAt } : {}),
  });
  telemetry.recordMutation(fields.lockedNote ? 'chart.progress_note.sign' : 'chart.progress_note.update');
  emitAudit(request, fields.lockedNote ? 'chart.progress_note.sign' : 'chart.progress_note.update', 'progress_note', noteId);
  writeJson(response, 200, { item: progressNotes[noteIdx] });
}

async function handleDocumentTemplates(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listDocumentTemplates(callerTenant(request, session));
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(documentTemplates, request) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const title = sanitizeStr(payload.title, 200);
  if (!title) {
    writeJson(response, 400, { error: 'title is required' });
    return;
  }

  const templateType = normalizeDocumentTemplateType(payload.templateType ?? 'clinical_template');
  const audience = normalizeDocumentAudienceType(payload.audience ?? 'client');
  if (!templateType) {
    writeJson(response, 400, { error: 'templateType must be valid' });
    return;
  }
  if (!audience) {
    writeJson(response, 400, { error: 'audience must be valid' });
    return;
  }

  const contentBlocks = Array.isArray(payload.contentBlocks)
    ? payload.contentBlocks.map((entry) => sanitizeStr(String(entry), 500)).filter(Boolean)
    : [];

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const newId = genId('dt');
    await createDocumentTemplate({
      id: newId,
      tenantId,
      title,
      templateType,
      audience,
      templateKey: sanitizeStr(payload.templateKey, 120),
      versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1,
      contentBlocks,
    });
    const item = await getDocumentTemplateById(newId, tenantId);
    telemetry.recordMutation('documents.template.create');
    emitAudit(request, 'documents.template.create', 'document_template', newId, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = { ...createDocumentTemplateRecord({
    id: createId('dt', documentTemplates),
    tenantId: callerTenant(request),
    title,
    templateType,
    audience,
    templateKey: sanitizeStr(payload.templateKey, 120),
    versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1,
    contentBlocks,
  }) };

  documentTemplates.push(item);
  telemetry.recordMutation('documents.template.create');
  emitAudit(request, 'documents.template.create', 'document_template', item.id);
  writeJson(response, 201, { item });
}

async function handleDocumentTemplateById(request, response, requestUrl, session) {
  const templateId = requestUrl.pathname.replace('/v1/document-templates/', '');

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await getDocumentTemplateById(templateId, tenantId);
    if (!item) { writeJson(response, 404, { error: 'Document template not found' }); return; }

    if (request.method === 'GET') {
      emitAudit(request, 'documents.template.read', 'document_template', item.id, session);
      writeJson(response, 200, { item });
      return;
    }
    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;
    const payload = await readJsonBody(request);
    const fields = {};
    if (typeof payload.title === 'string') fields.title = sanitizeStr(payload.title, 200) ?? item.title;
    if (typeof payload.templateType === 'string') {
      const templateType = normalizeDocumentTemplateType(payload.templateType);
      if (!templateType) { writeJson(response, 400, { error: 'templateType must be valid' }); return; }
      fields.templateType = templateType;
    }
    if (typeof payload.audience === 'string') {
      const audience = normalizeDocumentAudienceType(payload.audience);
      if (!audience) { writeJson(response, 400, { error: 'audience must be valid' }); return; }
      fields.audience = audience;
    }
    if (Array.isArray(payload.contentBlocks)) fields.contentBlocks = payload.contentBlocks.map((entry) => sanitizeStr(String(entry), 500)).filter(Boolean);
    if (payload.versionNumber !== undefined) {
      const versionNumber = Number(payload.versionNumber);
      if (!Number.isFinite(versionNumber) || versionNumber < 1) { writeJson(response, 400, { error: 'versionNumber must be a positive number' }); return; }
      fields.versionNumber = versionNumber;
    }
    await updateDocumentTemplate(templateId, tenantId, fields);
    const updated = await getDocumentTemplateById(templateId, tenantId);
    telemetry.recordMutation('documents.template.update');
    emitAudit(request, 'documents.template.update', 'document_template', item.id, session);
    writeJson(response, 200, { item: updated });
    return;
  }

  const item = documentTemplates.find((record) => record.id === templateId);
  if (!item) {
    writeJson(response, 404, { error: 'Document template not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'documents.template.read', 'document_template', item.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  if (typeof payload.title === 'string') item.title = sanitizeStr(payload.title, 200) ?? item.title;
  if (typeof payload.templateType === 'string') {
    const templateType = normalizeDocumentTemplateType(payload.templateType);
    if (!templateType) {
      writeJson(response, 400, { error: 'templateType must be valid' });
      return;
    }
    item.templateType = templateType;
  }
  if (typeof payload.audience === 'string') {
    const audience = normalizeDocumentAudienceType(payload.audience);
    if (!audience) {
      writeJson(response, 400, { error: 'audience must be valid' });
      return;
    }
    item.audience = audience;
  }
  if (Array.isArray(payload.contentBlocks)) {
    item.contentBlocks = payload.contentBlocks.map((entry) => sanitizeStr(String(entry), 500)).filter(Boolean);
  }
  if (payload.versionNumber !== undefined) {
    const versionNumber = Number(payload.versionNumber);
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      writeJson(response, 400, { error: 'versionNumber must be a positive number' });
      return;
    }
    item.versionNumber = versionNumber;
  }

  telemetry.recordMutation('documents.template.update');
  emitAudit(request, 'documents.template.update', 'document_template', item.id);
  writeJson(response, 200, { item });
}

async function handleDocumentAssignments(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50);
    const assigneeId = sanitizeStr(requestUrl.searchParams.get('assigneeId') ?? '', 50);
    const templateId = sanitizeStr(requestUrl.searchParams.get('templateId') ?? '', 50);
    if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'documents.assignment.read');
      if (!client) return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'documents.assignment.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      let items = await listDocumentAssignments(callerTenant(request, session), { clientId: clientId || undefined, assigneeId: assigneeId || undefined, templateId: templateId || undefined });
      if (counselorScope && !clientId) {
        items = items.filter((item) => (
          (item.assigneeType === 'client' && counselorScope.clientIds.has(item.assigneeId))
          || (item.assigneeType === 'staff' && item.assigneeId === counselorScope.counselorScopeId)
        ));
      }
      emitAudit(request, 'documents.assignment.read', 'document_assignment', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(documentAssignments, request);
    if (clientId) items = items.filter((item) => item.assigneeType === 'client' && item.assigneeId === clientId);
    if (assigneeId) items = items.filter((item) => item.assigneeId === assigneeId);
    if (templateId) items = items.filter((item) => item.templateId === templateId);
    if (counselorScope && !clientId) {
      items = items.filter((item) => (
        (item.assigneeType === 'client' && counselorScope.clientIds.has(item.assigneeId))
        || (item.assigneeType === 'staff' && item.assigneeId === counselorScope.counselorScopeId)
      ));
    }
    emitAudit(request, 'documents.assignment.read', 'document_assignment', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const templateId = sanitizeStr(payload.templateId, 50);
    let template;
    if (process.env.DB_NAME) {
      template = await getDocumentTemplateById(templateId, callerTenant(request, session));
    } else {
      template = documentTemplates.find((record) => record.id === templateId);
      if (template && enforceTenantScope(request, response, template.tenantId)) return;
    }
    if (!template) {
      writeJson(response, 400, { error: 'Valid templateId is required' });
      return;
    }

    const assigneeType = normalizeDocumentAudienceType(payload.assigneeType ?? 'client');
    if (!assigneeType) {
      writeJson(response, 400, { error: 'assigneeType must be valid' });
      return;
    }

    const assigneeId = sanitizeStr(payload.assigneeId, 50);
    if (!assigneeId) {
      writeJson(response, 400, { error: 'assigneeId is required' });
      return;
    }
    if (assigneeType === 'client') {
      const client = await resolveAuthorizedClient(request, response, assigneeId, session, 'documents.assignment.create');
      if (!client) return;
    }

    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      if (assigneeType === 'client') {
        const [clientRows] = await pool.query('SELECT id FROM clients WHERE id = ? AND tenant_id = ?', [assigneeId, tenantId]);
        if (!clientRows[0]) {
          writeJson(response, 400, { error: 'assigneeId must reference an existing client' });
          return;
        }
      }
      if (assigneeType === 'staff') {
        const [staffRows] = await pool.query('SELECT id FROM staff_members WHERE id = ? AND tenant_id = ?', [assigneeId, tenantId]);
        if (!staffRows[0]) {
          writeJson(response, 400, { error: 'assigneeId must reference an existing staff member' });
          return;
        }
      }
    } else {
      if (assigneeType === 'client' && !clients.some((client) => client.id === assigneeId)) {
        writeJson(response, 400, { error: 'assigneeId must reference an existing client' });
        return;
      }
      if (assigneeType === 'staff' && !staffMembers.some((staff) => staff.id === assigneeId)) {
        writeJson(response, 400, { error: 'assigneeId must reference an existing staff member' });
        return;
      }
    }

    const status = normalizeDocumentAssignmentStatus(payload.status ?? 'assigned');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      await createDocumentAssignment({
        id: genId('da'),
        tenantId: template.tenantId,
        templateId,
        assigneeType,
        assigneeId,
        assignedAt: new Date().toISOString(),
        status,
        dueDate: normalizeIsoDate(payload.dueAt),
        requiresSignature: payload.requiresSignature ?? template.templateType === 'consent_form',
        accessHistory: [
          { action: 'assigned', at: new Date().toISOString(), actorRole: callerRole(request, session) || 'unknown' },
        ],
      });
      const items = await listDocumentAssignments(template.tenantId, { templateId, assigneeId });
      const item = items[items.length - 1];
      telemetry.recordMutation('documents.assignment.create');
      emitAudit(request, 'documents.assignment.create', 'document_assignment', item?.id ?? 'unknown', session);
      writeJson(response, 201, { item });
      return;
    }

    const item = { ...createDocumentAssignmentRecord({
      id: createId('da', documentAssignments),
      tenantId: template.tenantId,
      templateId,
      assigneeType,
      assigneeId,
      status,
      requiresSignature: payload.requiresSignature ?? template.templateType === 'consent_form',
      dueAt: normalizeIsoDate(payload.dueAt),
      completedAt: normalizeIsoDate(payload.completedAt),
      accessHistory: [
        { action: 'assigned', at: new Date().toISOString(), actorRole: callerRole(request) || 'unknown' },
      ],
    }) };

    documentAssignments.push(item);
    telemetry.recordMutation('documents.assignment.create');
    emitAudit(request, 'documents.assignment.create', 'document_assignment', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const assignmentId = sanitizeStr(payload.assignmentId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const [rows] = await pool.query('SELECT * FROM document_assignments WHERE id = ? AND tenant_id = ?', [assignmentId, tenantId]);
    if (!rows[0]) { writeJson(response, 404, { error: 'Document assignment not found' }); return; }
    if (rows[0].assignee_type === 'client') {
      const client = await resolveAuthorizedClient(request, response, rows[0].assignee_id, session, 'documents.assignment.update');
      if (!client) return;
    }
    const fields = {};
    if (typeof payload.status === 'string') {
      const status = normalizeDocumentAssignmentStatus(payload.status);
      if (!status) { writeJson(response, 400, { error: 'status must be valid' }); return; }
      fields.status = status;
      if (status === 'completed' || status === 'signed') fields.completedAt = new Date().toISOString();
    }
    if (typeof payload.dueAt === 'string') fields.dueDate = normalizeIsoDate(payload.dueAt);
    if (typeof payload.requiresSignature === 'boolean') fields.requiresSignature = payload.requiresSignature;
    if (Array.isArray(payload.responses)) fields.responses = payload.responses;
    await updateDocumentAssignment(assignmentId, tenantId, fields);
    const [updated] = await pool.query('SELECT * FROM document_assignments WHERE id = ?', [assignmentId]);
    const item = {
      id: updated[0].id,
      tenantId: updated[0].tenant_id,
      templateId: updated[0].template_id,
      assigneeType: updated[0].assignee_type,
      assigneeId: updated[0].assignee_id,
      assignedAt: updated[0].created_at,
      status: updated[0].status,
      requiresSignature: Boolean(updated[0].requires_signature),
      dueDate: updated[0].due_at,
      dueAt: updated[0].due_at,
      completedAt: updated[0].completed_at,
      responses: updated[0].access_history ? (typeof updated[0].access_history === 'string' ? JSON.parse(updated[0].access_history) : updated[0].access_history) : null,
      accessHistory: updated[0].access_history ? (typeof updated[0].access_history === 'string' ? JSON.parse(updated[0].access_history) : updated[0].access_history) : null,
    };
    telemetry.recordMutation('documents.assignment.update');
    emitAudit(request, 'documents.assignment.update', 'document_assignment', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = documentAssignments.find((record) => record.id === assignmentId);
  if (!item) {
    writeJson(response, 404, { error: 'Document assignment not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;
  if (item.assigneeType === 'client') {
    const client = await resolveAuthorizedClient(request, response, item.assigneeId, session, 'documents.assignment.update');
    if (!client) return;
  }

  if (typeof payload.status === 'string') {
    const status = normalizeDocumentAssignmentStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
    if (status === 'completed' || status === 'signed') {
      item.completedAt = new Date().toISOString();
    }
  }

  if (typeof payload.requiresSignature === 'boolean') item.requiresSignature = payload.requiresSignature;
  if (typeof payload.dueAt === 'string') item.dueAt = normalizeIsoDate(payload.dueAt) ?? item.dueAt;

  item.accessHistory = [
    ...item.accessHistory,
    {
      action: 'updated',
      at: new Date().toISOString(),
      actorRole: callerRole(request) || 'unknown',
    },
  ];

  telemetry.recordMutation('documents.assignment.update');
  emitAudit(request, 'documents.assignment.update', 'document_assignment', item.id);
  writeJson(response, 200, { item });
}

async function handleInventoryDefinitions(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listInventoryDefinitions(callerTenant(request, session));
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(inventoryDefinitions, request) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const name = sanitizeStr(payload.name, 200);
  if (!name) {
    writeJson(response, 400, { error: 'name is required' });
    return;
  }

  const category = normalizeInventoryCategory(payload.category ?? 'custom');
  const scoringMethod = normalizeInventoryScoringMethod(payload.scoringMethod ?? 'sum');
  if (!category) {
    writeJson(response, 400, { error: 'category must be valid' });
    return;
  }
  if (!scoringMethod) {
    writeJson(response, 400, { error: 'scoringMethod must be valid' });
    return;
  }

  const questionSchema = Array.isArray(payload.questionSchema)
    ? payload.questionSchema
      .map((question) => ({
        key: sanitizeStr(question.key, 80),
        prompt: sanitizeStr(question.prompt, 300),
        min: Number.isFinite(Number(question.min)) ? Number(question.min) : 0,
        max: Number.isFinite(Number(question.max)) ? Number(question.max) : 3,
      }))
      .filter((question) => question.key && question.prompt)
    : [];

  if (process.env.DB_NAME) {
    const newId = genId('inv');
    await createInventoryDefinition({
      id: newId,
      tenantId: callerTenant(request, session),
      name,
      category,
      questions: questionSchema,
      scoringRules: { method: scoringMethod, versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1 },
    });
    const [rows] = await pool.query('SELECT * FROM inventory_definitions WHERE id = ?', [newId]);
    const item = rows[0] ? {
      id: rows[0].id, tenantId: rows[0].tenant_id, name: rows[0].name, category: rows[0].category,
      questionSchema: rows[0].question_schema ? (typeof rows[0].question_schema === 'string' ? JSON.parse(rows[0].question_schema) : rows[0].question_schema) : null,
      questions: rows[0].question_schema ? (typeof rows[0].question_schema === 'string' ? JSON.parse(rows[0].question_schema) : rows[0].question_schema) : null,
      scoringMethod: rows[0].scoring_method,
      versionNumber: rows[0].version_number,
      scoringRules: { method: rows[0].scoring_method, versionNumber: rows[0].version_number },
    } : null;
    telemetry.recordMutation('inventory.definition.create');
    emitAudit(request, 'inventory.definition.create', 'inventory_definition', newId, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = { ...createInventoryDefinitionRecord({
    id: createId('inv', inventoryDefinitions),
    tenantId: callerTenant(request),
    name,
    category,
    scoringMethod,
    versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1,
    questionSchema,
  }) };

  inventoryDefinitions.push(item);
  telemetry.recordMutation('inventory.definition.create');
  emitAudit(request, 'inventory.definition.create', 'inventory_definition', item.id);
  writeJson(response, 201, { item });
}

async function handleInventoryDefinitionById(request, response, requestUrl) {
  const inventoryId = requestUrl.pathname.replace('/v1/inventory-definitions/', '');
  const item = inventoryDefinitions.find((record) => record.id === inventoryId);
  if (!item) {
    writeJson(response, 404, { error: 'Inventory definition not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'inventory.definition.read', 'inventory_definition', item.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response)) return;

  const payload = await readJsonBody(request);
  if (typeof payload.name === 'string') item.name = sanitizeStr(payload.name, 200) ?? item.name;
  if (typeof payload.category === 'string') {
    const category = normalizeInventoryCategory(payload.category);
    if (!category) {
      writeJson(response, 400, { error: 'category must be valid' });
      return;
    }
    item.category = category;
  }
  if (typeof payload.scoringMethod === 'string') {
    const scoringMethod = normalizeInventoryScoringMethod(payload.scoringMethod);
    if (!scoringMethod) {
      writeJson(response, 400, { error: 'scoringMethod must be valid' });
      return;
    }
    item.scoringMethod = scoringMethod;
  }
  if (Array.isArray(payload.questionSchema)) {
    item.questionSchema = payload.questionSchema
      .map((question) => ({
        key: sanitizeStr(question.key, 80),
        prompt: sanitizeStr(question.prompt, 300),
        min: Number.isFinite(Number(question.min)) ? Number(question.min) : 0,
        max: Number.isFinite(Number(question.max)) ? Number(question.max) : 3,
      }))
      .filter((question) => question.key && question.prompt);
  }

  telemetry.recordMutation('inventory.definition.update');
  emitAudit(request, 'inventory.definition.update', 'inventory_definition', item.id);
  writeJson(response, 200, { item });
}

async function handleInventoryAssignments(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50);
    const inventoryId = sanitizeStr(requestUrl.searchParams.get('inventoryId') ?? '', 50);
    if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'inventory.assignment.read');
      if (!client) return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'inventory.assignment.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      let items = await listInventoryAssignments(callerTenant(request, session), { clientId: clientId || undefined, inventoryId: inventoryId || undefined });
      if (counselorScope && !clientId) {
        items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
      }
      emitAudit(request, 'inventory.assignment.read', 'inventory_assignment', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(inventoryAssignments, request);
    if (clientId) items = items.filter((item) => item.clientId === clientId);
    if (inventoryId) items = items.filter((item) => item.inventoryId === inventoryId);
    if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
    emitAudit(request, 'inventory.assignment.read', 'inventory_assignment', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const inventoryId = sanitizeStr(payload.inventoryId, 50);
    const clientId = sanitizeStr(payload.clientId, 50);
    const client = await resolveAuthorizedClient(request, response, clientId, session, 'inventory.assignment.create');
    if (!client) return;
    let definition;
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const [definitionRows] = await pool.query('SELECT id, tenant_id, scoring_method FROM inventory_definitions WHERE id = ? AND tenant_id = ?', [inventoryId, tenantId]);
      if (!definitionRows[0]) {
        writeJson(response, 400, { error: 'Valid inventoryId is required' });
        return;
      }
      definition = { id: definitionRows[0].id, tenantId: definitionRows[0].tenant_id, scoringMethod: definitionRows[0].scoring_method };
    } else {
      definition = inventoryDefinitions.find((record) => record.id === inventoryId);
      if (!definition) {
        writeJson(response, 400, { error: 'Valid inventoryId is required' });
        return;
      }
      if (enforceTenantScope(request, response, definition.tenantId)) return;
    }

    const status = normalizeInventoryAssignmentStatus(payload.status ?? 'assigned');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    const responses = Array.isArray(payload.responses)
      ? payload.responses
        .map((entry) => ({
          key: sanitizeStr(entry.key, 80),
          value: Number(entry.value),
        }))
        .filter((entry) => entry.key && Number.isFinite(entry.value))
      : [];

    if (process.env.DB_NAME) {
      const newId = genId('ia');
      const score = computeInventoryScore(definition.scoringMethod, responses);
      await createInventoryAssignment({
        id: newId,
        clientId: client.id,
        tenantId: definition.tenantId,
        inventoryId,
        assignedAt: new Date().toISOString(),
        status,
        responses,
        score,
        scoredAt: score === null ? null : new Date().toISOString(),
        completedAt: status === 'completed' || status === 'reviewed' ? new Date().toISOString() : null,
      });
      const [rows] = await pool.query('SELECT * FROM inventory_assignments WHERE id = ?', [newId]);
      const item = rows[0] ? {
        id: rows[0].id,
        clientId: rows[0].client_id,
        tenantId: rows[0].tenant_id,
        definitionId: rows[0].inventory_id,
        inventoryId: rows[0].inventory_id,
        assignedAt: rows[0].created_at,
        status: rows[0].status,
        responses: rows[0].responses ? (typeof rows[0].responses === 'string' ? JSON.parse(rows[0].responses) : rows[0].responses) : null,
        score: rows[0].score,
      } : null;
      telemetry.recordMutation('inventory.assignment.create');
      emitAudit(request, 'inventory.assignment.create', 'inventory_assignment', newId, session);
      writeJson(response, 201, { item });
      return;
    }

    const score = computeInventoryScore(definition.scoringMethod, responses);
    const item = { ...createInventoryAssignmentRecord({
      id: createId('ia', inventoryAssignments),
      tenantId: definition.tenantId,
      inventoryId,
      clientId,
      status,
      responses,
      score,
      scoredAt: score === null ? null : new Date().toISOString(),
      completedAt: status === 'completed' || status === 'reviewed' ? new Date().toISOString() : null,
    }) };

    inventoryAssignments.push(item);
    telemetry.recordMutation('inventory.assignment.create');
    emitAudit(request, 'inventory.assignment.create', 'inventory_assignment', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const assignmentId = sanitizeStr(payload.assignmentId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const [rows] = await pool.query('SELECT * FROM inventory_assignments WHERE id = ? AND tenant_id = ?', [assignmentId, tenantId]);
    if (!rows[0]) { writeJson(response, 404, { error: 'Inventory assignment not found' }); return; }
    const client = await resolveAuthorizedClient(request, response, rows[0].client_id, session, 'inventory.assignment.update');
    if (!client) return;
    const fields = {};
    if (typeof payload.status === 'string') {
      const status = normalizeInventoryAssignmentStatus(payload.status);
      if (!status) { writeJson(response, 400, { error: 'status must be valid' }); return; }
      fields.status = status;
    }
    if (Array.isArray(payload.responses)) fields.responses = payload.responses.map((entry) => ({ key: sanitizeStr(entry.key, 80), value: Number(entry.value) })).filter((entry) => entry.key && Number.isFinite(entry.value));
    await updateInventoryAssignment(assignmentId, rows[0].client_id, tenantId, fields);
    const [updated] = await pool.query('SELECT * FROM inventory_assignments WHERE id = ?', [assignmentId]);
    const item = {
      id: updated[0].id,
      clientId: updated[0].client_id,
      tenantId: updated[0].tenant_id,
      definitionId: updated[0].inventory_id,
      inventoryId: updated[0].inventory_id,
      assignedAt: updated[0].created_at,
      status: updated[0].status,
      responses: updated[0].responses ? (typeof updated[0].responses === 'string' ? JSON.parse(updated[0].responses) : updated[0].responses) : null,
      score: updated[0].score,
    };
    telemetry.recordMutation('inventory.assignment.update');
    emitAudit(request, 'inventory.assignment.update', 'inventory_assignment', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = inventoryAssignments.find((record) => record.id === assignmentId);
  if (!item) {
    writeJson(response, 404, { error: 'Inventory assignment not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;
  const client = await resolveAuthorizedClient(request, response, item.clientId, session, 'inventory.assignment.update');
  if (!client) return;

  const definition = inventoryDefinitions.find((record) => record.id === item.inventoryId);
  if (!definition) {
    writeJson(response, 500, { error: 'Inventory definition missing for assignment' });
    return;
  }

  if (typeof payload.status === 'string') {
    const status = normalizeInventoryAssignmentStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
    if (status === 'completed' || status === 'reviewed') {
      item.completedAt = new Date().toISOString();
    }
  }

  if (Array.isArray(payload.responses)) {
    item.responses = payload.responses
      .map((entry) => ({
        key: sanitizeStr(entry.key, 80),
        value: Number(entry.value),
      }))
      .filter((entry) => entry.key && Number.isFinite(entry.value));
  }

  item.score = computeInventoryScore(definition.scoringMethod, item.responses);
  item.scoredAt = item.score === null ? null : new Date().toISOString();

  telemetry.recordMutation('inventory.assignment.update');
  emitAudit(request, 'inventory.assignment.update', 'inventory_assignment', item.id);
  writeJson(response, 200, { item });
}

async function handleFormsCatalog(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);

  if (request.method === 'GET') {
    const includeInactive = (requestUrl.searchParams.get('includeInactive') ?? '').toLowerCase() === 'true';
    await ensureFormCatalogSeeded(tenantId);
    if (process.env.DB_NAME) {
      const items = await listFormCatalog(tenantId, { includeInactive });
      emitAudit(request, 'forms.catalog.read', 'form_catalog', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = formCatalogRecords.filter((item) => item.tenantId === tenantId);
    if (!includeInactive) items = items.filter((item) => item.isActive !== false);
    emitAudit(request, 'forms.catalog.read', 'form_catalog', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;
  const payload = await readJsonBody(request);

  if (request.method === 'POST') {
    const formKey = sanitizeStr(payload.formKey, 128);
    const title = sanitizeStr(payload.title, 255);
    const category = sanitizeStr(payload.category, 64);
    if (!formKey || !title || !category) {
      writeJson(response, 400, { error: 'formKey, title, and category are required' });
      return;
    }

    if (process.env.DB_NAME) {
      const existing = await getFormCatalogItemByKey(tenantId, formKey);
      if (existing) {
        writeJson(response, 409, { error: 'formKey already exists for this tenant' });
        return;
      }
      const id = genId('fc');
      await createFormCatalogItem({
        id,
        tenantId,
        formKey,
        title,
        category,
        isStandardOnSignup: Boolean(payload.isStandardOnSignup),
        isActive: payload.isActive !== false,
        versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1,
      });
      const item = await getFormCatalogItemByKey(tenantId, formKey);
      telemetry.recordMutation('forms.catalog.create');
      emitAudit(request, 'forms.catalog.create', 'form_catalog', id, session);
      writeJson(response, 201, { item });
      return;
    }

    const exists = formCatalogRecords.some((item) => item.tenantId === tenantId && item.formKey === formKey);
    if (exists) {
      writeJson(response, 409, { error: 'formKey already exists for this tenant' });
      return;
    }
    const now = new Date().toISOString();
    const item = {
      id: createId('fc', formCatalogRecords),
      tenantId,
      formKey,
      title,
      category,
      isStandardOnSignup: Boolean(payload.isStandardOnSignup),
      isActive: payload.isActive !== false,
      versionNumber: Number.isFinite(Number(payload.versionNumber)) ? Number(payload.versionNumber) : 1,
      createdAt: now,
      updatedAt: now,
    };
    formCatalogRecords.push(item);
    telemetry.recordMutation('forms.catalog.create');
    emitAudit(request, 'forms.catalog.create', 'form_catalog', item.id);
    writeJson(response, 201, { item });
    return;
  }

  const id = sanitizeStr(payload.id, 64);
  const formKey = sanitizeStr(payload.formKey, 128);
  if (!id && !formKey) {
    writeJson(response, 400, { error: 'id or formKey is required for PATCH' });
    return;
  }

  if (process.env.DB_NAME) {
    const all = await listFormCatalog(tenantId, { includeInactive: true });
    const existing = all.find((item) => item.id === id || item.formKey === formKey);
    if (!existing) {
      writeJson(response, 404, { error: 'Form catalog item not found' });
      return;
    }
    await updateFormCatalogItem(existing.id, tenantId, {
      title: typeof payload.title === 'string' ? sanitizeStr(payload.title, 255) : undefined,
      category: typeof payload.category === 'string' ? sanitizeStr(payload.category, 64) : undefined,
      isStandardOnSignup: payload.isStandardOnSignup !== undefined ? Boolean(payload.isStandardOnSignup) : undefined,
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : undefined,
      versionNumber: payload.versionNumber !== undefined ? Number(payload.versionNumber) : undefined,
    });
    const item = (await listFormCatalog(tenantId, { includeInactive: true })).find((row) => row.id === existing.id);
    telemetry.recordMutation('forms.catalog.update');
    emitAudit(request, 'forms.catalog.update', 'form_catalog', existing.id, session);
    writeJson(response, 200, { item });
    return;
  }

  const existing = formCatalogRecords.find((item) => item.tenantId === tenantId && (item.id === id || item.formKey === formKey));
  if (!existing) {
    writeJson(response, 404, { error: 'Form catalog item not found' });
    return;
  }
  if (typeof payload.title === 'string') existing.title = sanitizeStr(payload.title, 255) ?? existing.title;
  if (typeof payload.category === 'string') existing.category = sanitizeStr(payload.category, 64) ?? existing.category;
  if (payload.isStandardOnSignup !== undefined) existing.isStandardOnSignup = Boolean(payload.isStandardOnSignup);
  if (payload.isActive !== undefined) existing.isActive = Boolean(payload.isActive);
  if (payload.versionNumber !== undefined && Number.isFinite(Number(payload.versionNumber))) {
    existing.versionNumber = Number(payload.versionNumber);
  }
  existing.updatedAt = new Date().toISOString();
  telemetry.recordMutation('forms.catalog.update');
  emitAudit(request, 'forms.catalog.update', 'form_catalog', existing.id);
  writeJson(response, 200, { item: existing });
}

async function handleFormWorkflowAssignments(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);
  await ensureFormCatalogSeeded(tenantId);

  if (request.method === 'GET') {
    const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 64);
    const status = sanitizeStr(requestUrl.searchParams.get('status') ?? '', 64);
    if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'forms.assignment.read');
      if (!client) return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'forms.assignment.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      let items = await listFormAssignments(tenantId, { clientId: clientId || undefined, status: status || undefined });
      if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
      emitAudit(request, 'forms.assignment.read', 'form_assignment', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = formWorkflowAssignments.filter((item) => item.tenantId === tenantId);
    if (clientId) items = items.filter((item) => item.clientId === clientId);
    if (status) items = items.filter((item) => item.status === status);
    if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
    emitAudit(request, 'forms.assignment.read', 'form_assignment', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);

  if (request.method === 'POST') {
    const clientId = sanitizeStr(payload.clientId, 64);
    const formKey = sanitizeStr(payload.formKey, 128);
    const formTitle = sanitizeStr(payload.formTitle, 255);
    if (!clientId || !formKey) {
      writeJson(response, 400, { error: 'clientId and formKey are required' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, clientId, session, 'forms.assignment.create');
    if (!client) return;
    const assignmentType = normalizeFormAssignmentType(payload.assignmentType ?? 'next_session');
    if (!assignmentType) {
      writeJson(response, 400, { error: 'assignmentType must be valid' });
      return;
    }
    const status = normalizeFormAssignmentWorkflowStatus(payload.status ?? 'assigned');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    const scheduledFor = payload.scheduledFor ? normalizeIsoDate(payload.scheduledFor) : null;
    const dueAt = payload.dueAt ? normalizeIsoDate(payload.dueAt) : null;
    const recurrenceRule = sanitizeStr(payload.recurrenceRule, 255);
    const notes = sanitizeStr(payload.notes, 500);
    const assignedBy = sanitizeStr(payload.assignedBy, 64) ?? callerIdentity(request, session)?.staffId ?? null;

    if (process.env.DB_NAME) {
      await createFormAssignment({
        id: genId('fa'),
        tenantId,
        clientId: client.id,
        formKey,
        formTitle: formTitle ?? formKey,
        assignmentType,
        scheduledFor,
        recurrenceRule,
        status,
        assignedBy,
        notes,
        dueAt,
      });
      const items = await listFormAssignments(tenantId, { clientId });
      const item = items[0] ?? null;
      telemetry.recordMutation('forms.assignment.create');
      emitAudit(request, 'forms.assignment.create', 'form_assignment', item?.id ?? 'unknown', session);
      writeJson(response, 201, { item });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: createId('fa', formWorkflowAssignments),
      tenantId,
      clientId: client.id,
      formKey,
      formTitle: formTitle ?? formKey,
      assignmentType,
      scheduledFor,
      recurrenceRule,
      status,
      assignedBy,
      notes,
      dueAt,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    formWorkflowAssignments.unshift(item);
    telemetry.recordMutation('forms.assignment.create');
    emitAudit(request, 'forms.assignment.create', 'form_assignment', item.id);
    writeJson(response, 201, { item });
    return;
  }

  const assignmentId = sanitizeStr(payload.assignmentId, 64);
  if (!assignmentId) {
    writeJson(response, 400, { error: 'assignmentId is required for PATCH' });
    return;
  }

  const nextStatus = typeof payload.status === 'string'
    ? normalizeFormAssignmentWorkflowStatus(payload.status)
    : null;
  if (typeof payload.status === 'string' && !nextStatus) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }
  const assignmentType = typeof payload.assignmentType === 'string'
    ? normalizeFormAssignmentType(payload.assignmentType)
    : null;
  if (typeof payload.assignmentType === 'string' && !assignmentType) {
    writeJson(response, 400, { error: 'assignmentType must be valid' });
    return;
  }

  if (process.env.DB_NAME) {
    const existing = await getFormAssignmentById(assignmentId, tenantId);
    if (!existing) {
      writeJson(response, 404, { error: 'Form assignment not found' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, existing.clientId, session, 'forms.assignment.update');
    if (!client) return;
    await updateFormAssignment(assignmentId, tenantId, {
      assignmentType: assignmentType ?? undefined,
      scheduledFor: payload.scheduledFor !== undefined ? normalizeIsoDate(payload.scheduledFor) : undefined,
      recurrenceRule: payload.recurrenceRule !== undefined ? sanitizeStr(payload.recurrenceRule, 255) : undefined,
      status: nextStatus ?? undefined,
      notes: payload.notes !== undefined ? sanitizeStr(payload.notes, 500) : undefined,
      dueAt: payload.dueAt !== undefined ? normalizeIsoDate(payload.dueAt) : undefined,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    const item = await getFormAssignmentById(assignmentId, tenantId);
    telemetry.recordMutation('forms.assignment.update');
    emitAudit(request, 'forms.assignment.update', 'form_assignment', assignmentId, session);
    writeJson(response, 200, { item });
    return;
  }

  const item = formWorkflowAssignments.find((record) => record.tenantId === tenantId && record.id === assignmentId);
  if (!item) {
    writeJson(response, 404, { error: 'Form assignment not found' });
    return;
  }
  const client = await resolveAuthorizedClient(request, response, item.clientId, session, 'forms.assignment.update');
  if (!client) return;
  if (assignmentType) item.assignmentType = assignmentType;
  if (payload.scheduledFor !== undefined) item.scheduledFor = normalizeIsoDate(payload.scheduledFor);
  if (payload.recurrenceRule !== undefined) item.recurrenceRule = sanitizeStr(payload.recurrenceRule, 255);
  if (nextStatus) {
    item.status = nextStatus;
    if (nextStatus === 'completed') item.completedAt = new Date().toISOString();
  }
  if (payload.notes !== undefined) item.notes = sanitizeStr(payload.notes, 500);
  if (payload.dueAt !== undefined) item.dueAt = normalizeIsoDate(payload.dueAt);
  item.updatedAt = new Date().toISOString();
  telemetry.recordMutation('forms.assignment.update');
  emitAudit(request, 'forms.assignment.update', 'form_assignment', assignmentId);
  writeJson(response, 200, { item });
}

async function handleFormWorkflowSubmissions(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);

  if (request.method === 'GET') {
    const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 64);
    const formKey = sanitizeStr(requestUrl.searchParams.get('formKey') ?? '', 128);
    if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'forms.submission.read');
      if (!client) return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'forms.submission.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      let items = await listFormSubmissions(tenantId, { clientId: clientId || undefined, formKey: formKey || undefined });
      if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
      emitAudit(request, 'forms.submission.read', 'form_submission', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = formWorkflowSubmissions.filter((item) => item.tenantId === tenantId);
    if (clientId) items = items.filter((item) => item.clientId === clientId);
    if (formKey) items = items.filter((item) => item.formKey === formKey);
    if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
    emitAudit(request, 'forms.submission.read', 'form_submission', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 64);
  const formKey = sanitizeStr(payload.formKey, 128);
  const formTitle = sanitizeStr(payload.formTitle, 255);
  const assignmentId = sanitizeStr(payload.assignmentId, 64);
  const submittedByType = ['client', 'counselor', 'system'].includes(payload.submittedByType)
    ? payload.submittedByType
    : 'client';
  const scoreLabel = sanitizeStr(payload.scoreLabel, 128);
  const scoreValue = payload.scoreValue === null || payload.scoreValue === undefined
    ? null
    : Number(payload.scoreValue);
  const interpretationLabel = sanitizeStr(payload.interpretationLabel, 128);
  const responses = payload.responses && typeof payload.responses === 'object' ? payload.responses : null;

  if (!clientId || !formKey || !responses) {
    writeJson(response, 400, { error: 'clientId, formKey, and responses object are required' });
    return;
  }
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'forms.submission.create');
  if (!client) return;

  if (process.env.DB_NAME) {
    const submissionVersion = await getNextSubmissionVersion(tenantId, client.id, formKey);
    await createFormSubmission({
      id: genId('fs'),
      tenantId,
      assignmentId: assignmentId || null,
      clientId: client.id,
      formKey,
      formTitle: formTitle ?? formKey,
      submissionVersion,
      submittedByType,
      responses,
      scoreLabel,
      scoreValue: Number.isFinite(scoreValue) ? scoreValue : null,
      interpretationLabel,
      submittedAt: new Date().toISOString(),
    });
    if (assignmentId) {
      await updateFormAssignment(assignmentId, tenantId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    }
    const items = await listFormSubmissions(tenantId, { clientId: client.id, formKey });
    const item = items[0] ?? null;
    telemetry.recordMutation('forms.submission.create');
    emitAudit(request, 'forms.submission.create', 'form_submission', item?.id ?? 'unknown', session);
    writeJson(response, 201, { item });
    return;
  }

  const currentVersion = formWorkflowSubmissions
    .filter((item) => item.tenantId === tenantId && item.clientId === client.id && item.formKey === formKey)
    .reduce((max, item) => Math.max(max, Number(item.submissionVersion) || 0), 0);
  const submissionVersion = currentVersion + 1;
  const now = new Date().toISOString();
  const item = {
      id: createId('fs', formWorkflowSubmissions),
      tenantId,
      assignmentId: assignmentId || null,
      clientId: client.id,
    formKey,
    formTitle: formTitle ?? formKey,
    submissionVersion,
    submittedByType,
    responses,
    scoreLabel,
    scoreValue: Number.isFinite(scoreValue) ? scoreValue : null,
    interpretationLabel,
    submittedAt: now,
    createdAt: now,
  };
  formWorkflowSubmissions.unshift(item);
  if (assignmentId) {
    const assignment = formWorkflowAssignments.find((entry) => entry.tenantId === tenantId && entry.id === assignmentId);
    if (assignment) {
      assignment.status = 'completed';
      assignment.completedAt = now;
      assignment.updatedAt = now;
    }
  }
  telemetry.recordMutation('forms.submission.create');
  emitAudit(request, 'forms.submission.create', 'form_submission', item.id);
  writeJson(response, 201, { item });
}

async function handleClientFormOverview(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const tenantId = callerTenant(request, session);
  const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 64);
  if (!clientId) {
    writeJson(response, 400, { error: 'clientId is required' });
    return;
  }
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'forms.client_overview.read');
  if (!client) return;

  await ensureFormCatalogSeeded(tenantId);

  const catalog = process.env.DB_NAME
    ? await listFormCatalog(tenantId, { includeInactive: false })
    : formCatalogRecords.filter((item) => item.tenantId === tenantId && item.isActive !== false);

  const assignments = process.env.DB_NAME
    ? await listFormAssignments(tenantId, { clientId: client.id })
    : formWorkflowAssignments.filter((item) => item.tenantId === tenantId && item.clientId === client.id);

  const submissions = process.env.DB_NAME
    ? await listFormSubmissions(tenantId, { clientId: client.id })
    : formWorkflowSubmissions.filter((item) => item.tenantId === tenantId && item.clientId === client.id);

  const byForm = new Map();
  for (const submission of submissions) {
    const key = submission.formKey;
    const existing = byForm.get(key) ?? {
      formKey: key,
      formTitle: submission.formTitle ?? key,
      submissions: 0,
      latestVersion: 0,
      lastSubmittedAt: null,
      lastScoreLabel: null,
      lastScoreValue: null,
      lastInterpretationLabel: null,
    };
    existing.submissions += 1;
    existing.latestVersion = Math.max(existing.latestVersion, Number(submission.submissionVersion) || 0);
    if (!existing.lastSubmittedAt || String(submission.submittedAt) > String(existing.lastSubmittedAt)) {
      existing.lastSubmittedAt = submission.submittedAt;
      existing.lastScoreLabel = submission.scoreLabel ?? null;
      existing.lastScoreValue = submission.scoreValue ?? null;
      existing.lastInterpretationLabel = submission.interpretationLabel ?? null;
      existing.formTitle = submission.formTitle ?? existing.formTitle;
    }
    byForm.set(key, existing);
  }

  const history = [...byForm.values()].sort((left, right) => String(right.lastSubmittedAt || '').localeCompare(String(left.lastSubmittedAt || '')));

  emitAudit(request, 'forms.client_overview.read', 'form_submission', client.id, session);
  writeJson(response, 200, { catalog, assignments, submissions, history });
}

async function activatePortalSignupRequest({ tenantId, requestRecord, actorId = 'system' }) {
  if (!requestRecord || requestRecord.requestType !== 'account_signup') return null;

  const normalizedEmail = normalizePortalEmail(requestRecord.email);
  if (!normalizedEmail) return null;

  const onboardingDetails = normalizePortalOnboardingDetails(requestRecord.onboardingDetails ?? {});
  const preferredName = onboardingDetails.preferredName || requestRecord.firstName;
  const temporaryPassword = generateTemporaryPassword();

  if (process.env.DB_NAME) {
    const emailLookupHash = deriveLookupHash(normalizedEmail, { lowercase: true });
    const [existingRows] = await pool.query(
      'SELECT id, client_id, status FROM portal_accounts WHERE tenant_id = ? AND email_lookup_hash = ? LIMIT 1',
      [tenantId, emailLookupHash],
    );
    if (existingRows[0]) {
      return {
        status: 'existing_account',
        email: normalizedEmail,
        portalAccountId: existingRows[0].id,
        clientId: existingRows[0].client_id,
      };
    }

    const client = await createClientRecord({
      id: genId('c'),
      tenantId,
      firstName: requestRecord.firstName,
      lastName: requestRecord.lastName,
      status: 'active',
      faithBackground: onboardingDetails.faithPreference || 'Undeclared',
    });
    const passwordHash = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const account = await createPortalAccount({
      id: genId('pa'),
      clientId: client.id,
      tenantId,
      email: normalizedEmail,
      passwordHash,
      status: 'active',
      mfaEnabled: false,
    });
    await upsertPortalClientProfile({
      id: genId('pcp'),
      tenantId,
      clientId: client.id,
      preferredName,
      contactEmail: normalizedEmail,
      contactPhone: requestRecord.phone ?? '',
      contactPreferences: {
        preferredContactMethod: requestRecord.preferredContactMethod || 'email',
        okToText: requestRecord.preferredContactMethod === 'sms',
        okToLeaveMessage: true,
        enabledChannels: [requestRecord.preferredContactMethod || 'email'],
      },
      profileDetails: {
        demographics: {
          pronouns: onboardingDetails.pronouns || '',
          maritalStatus: '',
        },
        education: {
          level: onboardingDetails.educationLevel || '',
          occupation: '',
        },
        affiliations: onboardingDetails.affiliations ?? [],
      },
    });
    const assignedForms = await autoAssignStandardSignupForms({
      tenantId,
      clientId: client.id,
      assignedBy: actorId,
    });
    return {
      status: 'activated',
      email: normalizedEmail,
      temporaryPassword,
      portalAccountId: account.id,
      clientId: client.id,
      assignedForms,
    };
  }

  const existing = portalAccounts.find((item) => item.tenantId === tenantId && normalizePortalEmail(item.email) === normalizedEmail);
  if (existing) {
    return {
      status: 'existing_account',
      email: normalizedEmail,
      portalAccountId: existing.id,
      clientId: existing.clientId,
    };
  }

  const client = {
    id: createId('c', clients),
    tenantId,
    firstName: requestRecord.firstName,
    lastName: requestRecord.lastName,
    status: 'active',
    faithBackground: onboardingDetails.faithPreference || 'Undeclared',
  };
  clients.push(client);

  const account = {
    id: createId('pa', portalAccounts),
    tenantId,
    clientId: client.id,
    status: 'active',
    email: normalizedEmail,
    mfaEnabled: false,
    temporaryPassword,
    lastLoginAt: null,
    invitedAt: new Date().toISOString(),
  };
  portalAccounts.push(account);

  const now = new Date().toISOString();
  portalClientProfiles.push({
    id: createId('pcp', portalClientProfiles),
    tenantId,
    clientId: client.id,
    preferredName,
    contactEmail: normalizedEmail,
    contactPhone: requestRecord.phone ?? '',
    contactPreferences: {
      preferredContactMethod: requestRecord.preferredContactMethod || 'email',
      okToText: requestRecord.preferredContactMethod === 'sms',
      okToLeaveMessage: true,
      enabledChannels: [requestRecord.preferredContactMethod || 'email'],
    },
    profileDetails: {
      demographics: {
        pronouns: onboardingDetails.pronouns || '',
        maritalStatus: '',
      },
      education: {
        level: onboardingDetails.educationLevel || '',
        occupation: '',
      },
      affiliations: onboardingDetails.affiliations ?? [],
    },
    createdAt: now,
    updatedAt: now,
  });
  const assignedForms = await autoAssignStandardSignupForms({
    tenantId,
    clientId: client.id,
    assignedBy: actorId,
  });
  return {
    status: 'activated',
    email: normalizedEmail,
    temporaryPassword,
    portalAccountId: account.id,
    clientId: client.id,
    assignedForms,
  };
}

async function handlePortalPublicRequests(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    if (requirePracticeAdmin(request, response, session)) return;
    const tenantId = callerTenant(request, session);
    if (process.env.DB_NAME) {
      const items = await listPortalRegistrationRequests(tenantId);
      emitAudit(request, 'portal.public_request.read', 'portal_registration_request', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    const items = portalRegistrationRequests
      .filter((item) => item.tenantId === tenantId)
      .slice()
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    emitAudit(request, 'portal.public_request.read', 'portal_registration_request', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'PATCH') {
    if (requirePracticeAdmin(request, response, session)) return;
    const tenantId = callerTenant(request, session);
    const payload = await readJsonBody(request);
    const requestId = sanitizeStr(payload.requestId, 64);
    const status = normalizePortalRegistrationStatus(payload.status);
    if (!requestId) {
      writeJson(response, 400, { error: 'requestId is required' });
      return;
    }
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      const items = await listPortalRegistrationRequests(tenantId);
      const existing = items.find((item) => item.id === requestId);
      if (!existing) {
        writeJson(response, 404, { error: 'Portal registration request not found' });
        return;
      }
      await updatePortalRegistrationRequest(requestId, tenantId, { status });
      const updatedItems = await listPortalRegistrationRequests(tenantId);
      const item = updatedItems.find((entry) => entry.id === requestId) ?? null;
      const activation = status === 'approved'
        ? await activatePortalSignupRequest({
          tenantId,
          requestRecord: item,
          actorId: callerIdentity(request, session)?.staffId ?? 'system',
        })
        : null;
      telemetry.recordMutation('portal.public_request.update');
      emitAudit(request, 'portal.public_request.update', 'portal_registration_request', requestId, session);
      writeJson(response, 200, { item, activation });
      return;
    }

    const item = portalRegistrationRequests.find((entry) => entry.id === requestId && entry.tenantId === tenantId);
    if (!item) {
      writeJson(response, 404, { error: 'Portal registration request not found' });
      return;
    }
    item.status = status;
    item.updatedAt = new Date().toISOString();
    const activation = status === 'approved'
      ? await activatePortalSignupRequest({
        tenantId,
        requestRecord: item,
        actorId: callerIdentity(request, session)?.staffId ?? 'system',
      })
      : null;
    telemetry.recordMutation('portal.public_request.update');
    emitAudit(request, 'portal.public_request.update', 'portal_registration_request', requestId, session);
    writeJson(response, 200, { item, activation });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const requestType = normalizePortalRequestType(payload.requestType ?? payload.requestIntent ?? 'care_request') ?? 'care_request';
  const firstName = sanitizeStr(payload.firstName, 120);
  const lastName = sanitizeStr(payload.lastName, 120);
  const email = sanitizeStr(payload.email, 200);
  const phone = sanitizeStr(payload.phone, 40);
  const preferredContactMethod = sanitizeStr(payload.preferredContactMethod, 64);
  const preferredContactWindow = sanitizeStr(payload.preferredContactWindow, 128);
  const notes = sanitizeStr(payload.notes, 500);
  const onboardingDetails = normalizePortalOnboardingDetails(payload.onboardingDetails ?? {});
  const requestedServices = Array.isArray(payload.requestedServices)
    ? [...new Set(payload.requestedServices.map((entry) => sanitizeStr(String(entry), 120)).filter(Boolean))]
    : [];

  // Public portal submissions must never choose an arbitrary tenant or internal
  // workflow state. In authenticated/internal flows, tenant still comes from
  // the caller identity rather than request body.
  const tenantId = session
    ? callerTenant(request, session)
    : (normalizeTenantId(process.env.PUBLIC_PORTAL_TENANT_ID) ?? 'system');
  const portalSettings = await ensurePortalSettings(tenantId);

  if (!firstName || !lastName || !email) {
    writeJson(response, 400, { error: 'firstName, lastName, and email are required' });
    return;
  }
  if (!onboardingDetails.consentToContact) {
    writeJson(response, 400, { error: 'consentToContact is required' });
    return;
  }

  if (!portalSettings.allowCreateAccount && (requestType === 'account_signup' || requestedServices.includes('account_signup'))) {
    writeJson(response, 403, { error: 'Account creation requests are not enabled for this portal' });
    return;
  }
  if (!portalSettings.allowSchedulingRequests && (requestType === 'scheduling_request' || requestedServices.includes('scheduling_request'))) {
    writeJson(response, 403, { error: 'Scheduling requests are not enabled for this portal' });
    return;
  }
  if (!portalSettings.allowCareRequests && (requestType === 'care_request' || requestedServices.includes('care_request'))) {
    writeJson(response, 403, { error: 'Care requests are not enabled for this portal' });
    return;
  }

  let status = session
    ? (normalizePortalRegistrationStatus(payload.status ?? 'requested') ?? 'requested')
    : 'requested';

  if (process.env.DB_NAME) {
    const id = genId('pr');
    await createPortalRegistrationRequest({
      id,
      tenantId,
      requestType,
      firstName,
      lastName,
      email,
      phone,
      preferredContactMethod,
      preferredContactWindow,
      requestedServices,
      onboardingDetails,
      notes,
      status,
    });
    let activation = null;
    if (!session && portalSettings.registrationMode === 'instant_activation' && requestType === 'account_signup') {
      const requestRecord = {
        id,
        tenantId,
        requestType,
        firstName,
        lastName,
        email,
        phone,
        preferredContactMethod,
        preferredContactWindow,
        requestedServices,
        onboardingDetails,
        notes,
        status,
      };
      activation = await activatePortalSignupRequest({
        tenantId,
        requestRecord,
        actorId: 'system',
      });
      if (activation?.status === 'activated') {
        status = 'approved';
        await updatePortalRegistrationRequest(id, tenantId, { status });
      }
    }
    telemetry.recordMutation('portal.public_request.create');
    emitAudit(request, 'portal.public_request.create', 'portal_registration_request', id, session);
    writeJson(response, 201, { item: { id, status }, activation });
    return;
  }

  const now = new Date().toISOString();
  const item = {
    id: createId('pr', portalRegistrationRequests),
    tenantId,
    requestType,
    firstName,
    lastName,
    email,
    phone,
    preferredContactMethod,
    preferredContactWindow,
    requestedServices,
    onboardingDetails,
    notes,
    status,
    createdAt: now,
    updatedAt: now,
  };
  portalRegistrationRequests.push(item);
  let activation = null;
  if (!session && portalSettings.registrationMode === 'instant_activation' && requestType === 'account_signup') {
    activation = await activatePortalSignupRequest({
      tenantId,
      requestRecord: item,
      actorId: 'system',
    });
    if (activation?.status === 'activated') {
      item.status = 'approved';
      item.updatedAt = new Date().toISOString();
      status = item.status;
    }
  }
  telemetry.recordMutation('portal.public_request.create');
  emitAudit(request, 'portal.public_request.create', 'portal_registration_request', item.id);
  writeJson(response, 201, { item: { id: item.id, status: item.status }, activation });
}

async function handleAppointmentsCollection(request, response, session) {
  if (request.method === 'GET') {
    const requestUrl = new URL(request.url, `http://localhost`);
    const filterClientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50) || null;
    if (filterClientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, filterClientId, session, 'appointment.list.read');
      if (!client) return;
    }
    const counselorScopeId = await resolveEffectiveCounselorFilterId(request, response, requestUrl, session, 'appointment.list.read');
    if (counselorScopeId === false) return;
    let items;
    if (process.env.DB_NAME) {
      items = await listAppointments(callerTenant(request, session), {
        clientId: filterClientId,
        counselorId: counselorScopeId,
      });
    } else {
      const all = [...appointments].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
      items = all
        .filter((appointment) => !filterClientId || appointment.clientId === filterClientId)
        .filter((appointment) => !counselorScopeId || appointment.counselorId === counselorScopeId);
    }
    await emitAudit(request, 'appointment.list.read', 'appointment', 'collection', session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 50) ?? '';
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'appointment.create');
  if (!client) return;
  const counselorId = sanitizeStr(payload.counselorId, 64) ?? null;

  const startsAt = normalizeIsoDate(payload.startsAt);
  const endsAt = normalizeIsoDate(payload.endsAt);
  const status = normalizeAppointmentStatus(payload.status ?? 'scheduled');
  const appointmentType = normalizeAppointmentType(payload.appointmentType ?? 'individual_therapy');
  const timezone = normalizeTimezone(payload.timezone ?? practices[0]?.timezone ?? 'America/New_York');

  if (!startsAt || !endsAt) {
    writeJson(response, 400, { error: 'startsAt and endsAt must be valid ISO dates' });
    return;
  }

  if (!status) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  if (!appointmentType) {
    writeJson(response, 400, { error: 'appointmentType must be valid' });
    return;
  }

  if (!timezone) {
    writeJson(response, 400, { error: 'timezone must be a valid IANA timezone identifier' });
    return;
  }

  const locationName = sanitizeStr(payload.locationName, 200) ?? 'Main Office';
  const remoteSession = Boolean(payload.remoteSession);
  let counselorName = sanitizeStr(payload.counselorName, 200) ?? 'Unassigned Counselor';
  const conflicts = detectAppointmentConflicts({
    startsAt,
    endsAt,
    counselorName,
    locationName,
    remoteSession,
  });
  if (conflicts.length) {
    writeJson(response, 409, {
      error: 'Scheduling conflict detected',
      conflicts,
    });
    return;
  }

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    let counselor = null;
    if (counselorId) {
      counselor = await getStaffById(counselorId, tenantId);
      if (!counselor) {
        writeJson(response, 400, { error: 'Valid counselorId is required' });
        return;
      }
      counselorName = `${counselor.firstName} ${counselor.lastName}`.trim() || counselorName;
    }
    const appointment = await createAppointment({
      id: genId('a'),
      tenantId,
      clientId: client.id,
      counselorId: counselor?.id ?? counselorId,
      clientName: `${client.firstName} ${client.lastName}`,
      counselorName,
      startsAt,
      endsAt,
      status,
      appointmentType,
      locationName,
      remoteSession,
      timezone,
    });
    telemetry.recordMutation('appointment.create');
    await emitAudit(request, 'appointment.create', 'appointment', appointment.id, session);
    writeJson(response, 201, { item: appointment });
  } else {
    let counselor = null;
    if (counselorId) {
      counselor = staffMembers.find((item) => item.id === counselorId && item.tenantId === callerTenant(request));
      if (!counselor) {
        writeJson(response, 400, { error: 'Valid counselorId is required' });
        return;
      }
      counselorName = `${counselor.firstName} ${counselor.lastName}`.trim() || counselorName;
    }
    const appointment = {
      id: createId('a', appointments),
      tenantId: 'system',
      clientId: client.id,
      counselorId: counselor?.id ?? counselorId,
      clientName: `${client.firstName} ${client.lastName}`,
      counselorName,
      startsAt,
      endsAt,
      status,
      appointmentType,
      locationName,
      remoteSession,
      timezone,
    };
    appointments.push(appointment);
    telemetry.recordMutation('appointment.create');
    emitAudit(request, 'appointment.create', 'appointment', appointment.id);
    writeJson(response, 201, { item: appointment });
  }
}

async function handleAppointmentById(request, response, requestUrl, session) {
  const appointmentId = requestUrl.pathname.replace('/v1/appointments/', '');
  const appointment = await resolveAuthorizedAppointment(request, response, appointmentId, session, request.method === 'DELETE' ? 'appointment.delete' : 'appointment.update');
  if (!appointment) return;

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    if (request.method === 'DELETE') {
      await deleteAppointment(appointmentId, tenantId);
      telemetry.recordMutation('appointment.delete');
      emitAudit(request, 'appointment.delete', 'appointment', appointmentId);
      writeJson(response, 200, { deleted: true, id: appointmentId });
      return;
    }
    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    const payload = await readJsonBody(request);
    const fields = {};
    if (typeof payload.status === 'string') { const s = normalizeAppointmentStatus(payload.status); if (!s) { writeJson(response, 400, { error: 'status must be valid' }); return; } fields.status = s; }
    if (typeof payload.appointmentType === 'string') { const t = normalizeAppointmentType(payload.appointmentType); if (!t) { writeJson(response, 400, { error: 'appointmentType must be valid' }); return; } fields.appointmentType = t; }
    if (payload.counselorId !== undefined) {
      const counselorId = sanitizeStr(payload.counselorId, 64);
      if (!counselorId) {
        fields.counselorId = null;
      } else {
        const counselor = await getStaffById(counselorId, tenantId);
        if (!counselor) {
          writeJson(response, 400, { error: 'Valid counselorId is required' });
          return;
        }
        fields.counselorId = counselor.id;
        fields.counselorName = `${counselor.firstName} ${counselor.lastName}`.trim();
      }
    }
    if (typeof payload.counselorName === 'string' && payload.counselorName.trim()) fields.counselorName = sanitizeStr(payload.counselorName, 200);
    if (typeof payload.locationName === 'string' && payload.locationName.trim()) fields.locationName = sanitizeStr(payload.locationName, 200);
    if (typeof payload.remoteSession === 'boolean') fields.remoteSession = payload.remoteSession;
    if (typeof payload.timezone === 'string') { const tz = normalizeTimezone(payload.timezone); if (!tz) { writeJson(response, 400, { error: 'timezone must be a valid IANA timezone identifier' }); return; } fields.timezone = tz; }
    if (typeof payload.startsAt === 'string') { const t = normalizeIsoDate(payload.startsAt); if (!t) { writeJson(response, 400, { error: 'startsAt must be a valid ISO date' }); return; } fields.startsAt = t; }
    if (typeof payload.endsAt === 'string') { const t = normalizeIsoDate(payload.endsAt); if (!t) { writeJson(response, 400, { error: 'endsAt must be a valid ISO date' }); return; } fields.endsAt = t; }
    const updated = await updateAppointment(appointmentId, tenantId, fields);
    telemetry.recordMutation('appointment.update');
    emitAudit(request, 'appointment.update', 'appointment', appointmentId);
    writeJson(response, 200, { item: updated });
    return;
  }

  if (request.method === 'DELETE') {
    const index = appointments.findIndex((item) => item.id === appointmentId);
    appointments.splice(index, 1);
    telemetry.recordMutation('appointment.delete');
    emitAudit(request, 'appointment.delete', 'appointment', appointmentId);
    writeJson(response, 200, { deleted: true, id: appointmentId });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);

  if (typeof payload.status === 'string') {
    const status = normalizeAppointmentStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    appointment.status = status;
  }

  if (typeof payload.appointmentType === 'string') {
    const appointmentType = normalizeAppointmentType(payload.appointmentType);
    if (!appointmentType) {
      writeJson(response, 400, { error: 'appointmentType must be valid' });
      return;
    }
    appointment.appointmentType = appointmentType;
  }

  if (payload.counselorId !== undefined) {
    const counselorId = sanitizeStr(payload.counselorId, 64);
    if (!counselorId) {
      appointment.counselorId = null;
    } else {
      const counselor = staffMembers.find((item) => item.id === counselorId && item.tenantId === appointment.tenantId);
      if (!counselor) {
        writeJson(response, 400, { error: 'Valid counselorId is required' });
        return;
      }
      appointment.counselorId = counselor.id;
      appointment.counselorName = `${counselor.firstName} ${counselor.lastName}`.trim();
    }
  }
  if (typeof payload.counselorName === 'string' && payload.counselorName.trim()) appointment.counselorName = sanitizeStr(payload.counselorName, 200) ?? appointment.counselorName;
  if (typeof payload.locationName === 'string' && payload.locationName.trim()) appointment.locationName = sanitizeStr(payload.locationName, 200) ?? appointment.locationName;
  if (typeof payload.remoteSession === 'boolean') appointment.remoteSession = payload.remoteSession;
  if (typeof payload.timezone === 'string') {
    const timezone = normalizeTimezone(payload.timezone);
    if (!timezone) {
      writeJson(response, 400, { error: 'timezone must be a valid IANA timezone identifier' });
      return;
    }
    appointment.timezone = timezone;
  }

  if (typeof payload.startsAt === 'string') {
    const startsAt = normalizeIsoDate(payload.startsAt);
    if (!startsAt) {
      writeJson(response, 400, { error: 'startsAt must be a valid ISO date' });
      return;
    }
    appointment.startsAt = startsAt;
  }

  if (typeof payload.endsAt === 'string') {
    const endsAt = normalizeIsoDate(payload.endsAt);
    if (!endsAt) {
      writeJson(response, 400, { error: 'endsAt must be a valid ISO date' });
      return;
    }
    appointment.endsAt = endsAt;
  }

  const conflicts = detectAppointmentConflicts({
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    counselorName: appointment.counselorName,
    locationName: appointment.locationName,
    remoteSession: appointment.remoteSession,
    excludeAppointmentId: appointment.id,
  });
  if (conflicts.length) {
    writeJson(response, 409, {
      error: 'Scheduling conflict detected',
      conflicts,
    });
    return;
  }

  telemetry.recordMutation('appointment.update');
  emitAudit(request, 'appointment.update', 'appointment', appointment.id);
  writeJson(response, 200, { item: appointment });
}

async function handleAppointmentTypes(request, response) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  emitAudit(request, 'appointment.type.read', 'appointment_type', 'collection');
  writeJson(response, 200, {
    items: appointmentTypes.map((code) => ({
      code,
      label: code.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    })),
  });
}

async function handleSchedulingCalendar(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const timezone = normalizeTimezone(requestUrl.searchParams.get('timezone') ?? practices[0]?.timezone ?? 'America/New_York');
  if (!timezone) {
    writeJson(response, 400, { error: 'timezone must be a valid IANA timezone identifier' });
    return;
  }

  const day = sanitizeStr(requestUrl.searchParams.get('day') ?? '', 20) || dateKeyInTimezone(new Date().toISOString(), timezone);
  const locationFilter = sanitizeStr(requestUrl.searchParams.get('locationName') ?? '', 200);
  const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'scheduling.calendar.read');
  if (counselorScope === false) return;
  const isCounselorScopedSession = COUNSELOR_SESSION_ROLES.has(callerRole(request, session));
  const scopedCounselorId = counselorScope?.counselorScopeId ?? null;
  const counselorIdFilter = isCounselorScopedSession ? null : sanitizeStr(requestUrl.searchParams.get('counselorId') ?? '', 64);
  const counselorFilter = isCounselorScopedSession ? null : sanitizeStr(requestUrl.searchParams.get('counselorName') ?? '', 200);

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const dayStart = `${day}T00:00:00.000Z`;
    const dayEnd = `${day}T23:59:59.999Z`;
    let allItems = await listAppointmentsByDateRange(tenantId, dayStart, dayEnd);
    if (scopedCounselorId) allItems = allItems.filter((a) => a.counselorId === scopedCounselorId);
    if (counselorIdFilter) allItems = allItems.filter((a) => a.counselorId === counselorIdFilter);
    if (counselorFilter) allItems = allItems.filter((a) => a.counselorName === counselorFilter);
    if (locationFilter) allItems = allItems.filter((a) => a.locationName === locationFilter);
    allItems.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const counselorCalendars = Object.entries(groupBy(allItems, (a) => a.counselorName)).map(([counselorName, entries]) => ({ counselorName, appointments: entries }));
    const locationCalendars = Object.entries(groupBy(allItems, (a) => a.locationName)).map(([locationName, entries]) => ({ locationName, appointments: entries }));

    const [staffRows] = await pool.query(
      'SELECT id, first_name_enc, last_name_enc FROM staff_members WHERE tenant_id = ?',
      [tenantId],
    );
    const availability = await Promise.all(staffRows.map(async (staff) => {
      const slots = await listAvailabilityTemplates(staff.id, tenantId);
      return { staffId: staff.id, counselorName: `${decrypt(staff.first_name_enc)} ${decrypt(staff.last_name_enc)}`, template: slots };
    }));
    const scopedAvailability = scopedCounselorId
      ? availability.filter((item) => item.staffId === scopedCounselorId)
      : availability;

    emitAudit(request, 'scheduling.calendar.read', 'appointment', 'collection', session);
    writeJson(response, 200, { timezone, day, counselorCalendars, locationCalendars, availability: scopedAvailability });
    return;
  }

  const items = filterByTenant(appointments, request)
    .filter((appointment) => dateKeyInTimezone(appointment.startsAt, timezone) === day)
    .filter((appointment) => !scopedCounselorId || appointment.counselorId === scopedCounselorId)
    .filter((appointment) => !counselorIdFilter || appointment.counselorId === counselorIdFilter)
    .filter((appointment) => !counselorFilter || appointment.counselorName === counselorFilter)
    .filter((appointment) => !locationFilter || appointment.locationName === locationFilter)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  const counselorCalendars = Object.entries(groupBy(items, (item) => item.counselorName)).map(([counselorName, entries]) => ({
    counselorName,
    appointments: entries,
  }));

  const locationCalendars = Object.entries(groupBy(items, (item) => item.locationName)).map(([locationName, entries]) => ({
    locationName,
    appointments: entries,
  }));

  const availability = staffMembers.map((staff) => ({
    staffId: staff.id,
    counselorName: `${staff.firstName} ${staff.lastName}`,
    template: availabilityTemplates[staff.id] ?? [],
  })).filter((item) => !scopedCounselorId || item.staffId === scopedCounselorId);

  emitAudit(request, 'scheduling.calendar.read', 'appointment', 'collection');
  writeJson(response, 200, {
    timezone,
    day,
    counselorCalendars,
    locationCalendars,
    availability,
  });
}

async function handleReminders(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const statusFilter = sanitizeStr(requestUrl.searchParams.get('status') ?? '', 30);
    const appointmentIdFilter = sanitizeStr(requestUrl.searchParams.get('appointmentId') ?? '', 50);
    if (appointmentIdFilter) {
      const appointment = await resolveAuthorizedAppointment(request, response, appointmentIdFilter, session, 'reminder.read');
      if (!appointment) return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'reminder.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      let items = await listReminders(tenantId, { status: statusFilter || undefined, appointmentId: appointmentIdFilter || undefined });
      if (counselorScope && !appointmentIdFilter) {
        items = items.filter((item) => item.clientId && counselorScope.clientIds.has(item.clientId));
      }
      emitAudit(request, 'reminder.read', 'reminder', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(reminderRecords, request);
    if (statusFilter) items = items.filter((record) => record.status === statusFilter);
    if (appointmentIdFilter) items = items.filter((record) => record.appointmentId === appointmentIdFilter);
    if (counselorScope && !appointmentIdFilter) items = items.filter((record) => record.clientId && counselorScope.clientIds.has(record.clientId));
    emitAudit(request, 'reminder.read', 'reminder', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
  const payload = await readJsonBody(request);
  const appointmentId = sanitizeStr(payload.appointmentId, 50);
  const appointment = await resolveAuthorizedAppointment(request, response, appointmentId, session, 'reminder.create');
  if (!appointment) return;

  const status = normalizeReminderStatus(payload.status ?? 'pending');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const item = await createReminder({
        id: genId('rem'),
        tenantId,
        appointmentId,
        clientId: appointment.clientId,
        reminderType: sanitizeStr(payload.reminderType, 80) ?? 'appointment',
        deliveryChannel: sanitizeStr(payload.deliveryChannel, 40) ?? 'email',
        reminderAt: normalizeIsoDate(payload.reminderAt) ?? appointment.startsAt,
        status,
        sentAt: status === 'sent' ? new Date().toISOString() : null,
      });
      telemetry.recordMutation('reminder.create');
      emitAudit(request, 'reminder.create', 'reminder', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = {
      id: createId('rem', reminderRecords),
      tenantId: appointment.tenantId,
      appointmentId,
      clientId: appointment.clientId,
      reminderType: sanitizeStr(payload.reminderType, 80) ?? 'appointment',
      deliveryChannel: sanitizeStr(payload.deliveryChannel, 40) ?? 'email',
      reminderAt: normalizeIsoDate(payload.reminderAt) ?? appointment.startsAt,
      status,
      sentAt: status === 'sent' ? new Date().toISOString() : null,
    };

    reminderRecords.push(item);
    telemetry.recordMutation('reminder.create');
    emitAudit(request, 'reminder.create', 'reminder', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const reminderId = sanitizeStr(payload.reminderId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const [rows] = await pool.query('SELECT * FROM reminders WHERE id = ? AND tenant_id = ?', [reminderId, tenantId]);
    if (!rows[0]) { writeJson(response, 404, { error: 'Reminder not found' }); return; }
    const appointment = await resolveAuthorizedAppointment(request, response, rows[0].appointment_id, session, 'reminder.update');
    if (!appointment) return;
    const fields = {};
    if (typeof payload.status === 'string') { const s = normalizeReminderStatus(payload.status); if (!s) { writeJson(response, 400, { error: 'status must be valid' }); return; } fields.status = s; fields.sentAt = s === 'sent' ? new Date().toISOString() : null; }
    if (typeof payload.reminderAt === 'string') fields.reminderAt = normalizeIsoDate(payload.reminderAt);
    const item = await updateReminder(reminderId, tenantId, fields);
    telemetry.recordMutation('reminder.update');
    emitAudit(request, 'reminder.update', 'reminder', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = reminderRecords.find((record) => record.id === reminderId);
  if (!item) {
    writeJson(response, 404, { error: 'Reminder not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;
  const appointment = await resolveAuthorizedAppointment(request, response, item.appointmentId, session, 'reminder.update');
  if (!appointment) return;

  if (typeof payload.status === 'string') {
    const status = normalizeReminderStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
    item.sentAt = status === 'sent' ? new Date().toISOString() : null;
  }
  if (typeof payload.reminderAt === 'string') {
    item.reminderAt = normalizeIsoDate(payload.reminderAt) ?? item.reminderAt;
  }

  telemetry.recordMutation('reminder.update');
  emitAudit(request, 'reminder.update', 'reminder', item.id);
  writeJson(response, 200, { item });
}

async function handleWaitlist(request, response, session) {
  if (request.method === 'GET') {
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'waitlist.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const rows = await listWaitlist(tenantId);
      let enriched = await Promise.all(rows.map(async (entry) => {
        const [clientRows] = await pool.query(
          'SELECT first_name_enc, last_name_enc FROM clients WHERE id = ? AND tenant_id = ?',
          [entry.clientId, tenantId]
        );
        const clientRow = clientRows[0];
        return {
          ...entry,
          clientName: clientRow
            ? `${decrypt(clientRow.first_name_enc)} ${decrypt(clientRow.last_name_enc)}`
            : entry.clientId,
        };
      }));
      if (counselorScope) {
        enriched = enriched.filter((entry) => counselorScope.clientIds.has(entry.clientId));
      }
      enriched.sort((a, b) => a.priorityRank - b.priorityRank);
      emitAudit(request, 'waitlist.read', 'client', 'collection', session);
      writeJson(response, 200, { items: enriched });
      return;
    }

    let items = clients
      .filter((client) => client.status === 'waitlist')
      .map((client) => {
        const lifecycle = clientLifecycles[client.id] ?? null;
        const metadata = waitlistMetadataByClientId[client.id] ?? {
          priorityRank: 99,
          requestedService: 'General counseling',
          preferredSessionType: 'either',
          notes: '',
          updatedAt: new Date().toISOString(),
        };
        return {
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          priorityRank: metadata.priorityRank,
          requestedService: metadata.requestedService,
          preferredSessionType: metadata.preferredSessionType,
          notes: metadata.notes,
          referralSource: lifecycle?.referralSource ?? '',
          updatedAt: metadata.updatedAt,
        };
      })
      .sort((left, right) => left.priorityRank - right.priorityRank);
    if (counselorScope) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));

    emitAudit(request, 'waitlist.read', 'client', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 50);
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'waitlist.update');
  if (!client) return;

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const [existing] = await pool.query(
      'SELECT id FROM waitlist_metadata WHERE client_id = ? AND tenant_id = ?',
      [client.id, tenantId]
    );
    if (!existing[0]) { writeJson(response, 404, { error: 'Waitlist client not found' }); return; }
    const fields = {};
    if (payload.priorityRank !== undefined) fields.priorityRank = Number.isFinite(Number(payload.priorityRank)) ? Number(payload.priorityRank) : undefined;
    if (payload.requestedService !== undefined) fields.requestedService = sanitizeStr(payload.requestedService, 160);
    if (payload.preferredSessionType !== undefined) fields.preferredSessionType = sanitizeStr(payload.preferredSessionType, 40);
    if (payload.notes !== undefined) fields.notes = sanitizeStr(payload.notes, 500);
    const item = await updateWaitlistEntry(existing[0].id, tenantId, fields);
    telemetry.recordMutation('waitlist.update');
    emitAudit(request, 'waitlist.update', 'client', client.id, session);
    writeJson(response, 200, { item: { clientId: client.id, ...item } });
    return;
  }

  if (client.status !== 'waitlist') {
    writeJson(response, 404, { error: 'Waitlist client not found' });
    return;
  }

  waitlistMetadataByClientId[client.id] = {
    priorityRank: Number.isFinite(Number(payload.priorityRank)) ? Number(payload.priorityRank) : waitlistMetadataByClientId[client.id]?.priorityRank ?? 99,
    requestedService: sanitizeStr(payload.requestedService, 160) ?? waitlistMetadataByClientId[client.id]?.requestedService ?? 'General counseling',
    preferredSessionType: sanitizeStr(payload.preferredSessionType, 40) ?? waitlistMetadataByClientId[client.id]?.preferredSessionType ?? 'either',
    notes: sanitizeStr(payload.notes, 500) ?? waitlistMetadataByClientId[client.id]?.notes ?? '',
    updatedAt: new Date().toISOString(),
  };

  telemetry.recordMutation('waitlist.update');
  emitAudit(request, 'waitlist.update', 'client', client.id);
  writeJson(response, 200, {
    item: {
      clientId: client.id,
      ...waitlistMetadataByClientId[client.id],
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 4 — ScheduleOps handlers
// ---------------------------------------------------------------------------

const AVAILABILITY_OVERRIDE_WRITE_ROLES = new Set(['platform_admin', 'practice_owner', 'practice_admin', 'scheduler_biller']);
const SERIES_WRITE_ROLES = new Set(['platform_admin', 'practice_owner', 'practice_admin', 'scheduler_biller', 'counselor']);

async function handleAvailabilityOverrides(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);
  const role = callerRole(request, session);

  if (request.method !== 'GET' && !AVAILABILITY_OVERRIDE_WRITE_ROLES.has(role)) {
    writeJson(response, 403, { error: 'Forbidden' });
    return;
  }

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const staffId = sanitizeStr(requestUrl.searchParams.get('staffId') ?? '', 50) || undefined;
      const from   = sanitizeStr(requestUrl.searchParams.get('from')    ?? '', 12) || undefined;
      const to     = sanitizeStr(requestUrl.searchParams.get('to')      ?? '', 12) || undefined;
      const items  = await listAvailabilityOverrides(tenantId, staffId, from, to);
      emitAudit(request, 'availability_override.read', 'availability_override', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: [] });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    if (!payload.staffId || !payload.overrideDate) {
      writeJson(response, 400, { error: 'staffId and overrideDate are required' });
      return;
    }
    if (process.env.DB_NAME) {
      const item = await createAvailabilityOverride({
        id: crypto.randomUUID(),
        tenantId,
        staffId:      sanitizeStr(payload.staffId, 50),
        overrideDate: sanitizeStr(payload.overrideDate, 12),
        overrideType: payload.overrideType === 'open' ? 'open' : 'block',
        reason:       sanitizeStr(payload.reason ?? '', 255) || null,
        startTime:    sanitizeStr(payload.startTime ?? '', 8) || null,
        endTime:      sanitizeStr(payload.endTime ?? '', 8)   || null,
        allDay:       payload.allDay !== false,
      });
      telemetry.recordMutation('availability_override.create');
      emitAudit(request, 'availability_override.create', 'availability_override', item.id, session);
      writeJson(response, 201, { item });
      return;
    }
    writeJson(response, 201, { item: { id: crypto.randomUUID(), tenantId, ...payload } });
    return;
  }

  if (request.method === 'PATCH') {
    const payload = await readJsonBody(request);
    const id = sanitizeStr(payload.id ?? '', 36);
    if (!id) { writeJson(response, 400, { error: 'id is required' }); return; }
    if (process.env.DB_NAME) {
      const fields = {};
      if (payload.overrideDate !== undefined) fields.overrideDate = sanitizeStr(payload.overrideDate, 12);
      if (payload.overrideType !== undefined) fields.overrideType = payload.overrideType === 'open' ? 'open' : 'block';
      if (payload.reason      !== undefined) fields.reason        = sanitizeStr(payload.reason, 255) || null;
      if (payload.startTime   !== undefined) fields.startTime     = sanitizeStr(payload.startTime, 8) || null;
      if (payload.endTime     !== undefined) fields.endTime       = sanitizeStr(payload.endTime, 8)   || null;
      if (payload.allDay      !== undefined) fields.allDay        = !!payload.allDay;
      const item = await updateAvailabilityOverride(id, tenantId, fields);
      if (!item) { writeJson(response, 404, { error: 'Override not found' }); return; }
      telemetry.recordMutation('availability_override.update');
      emitAudit(request, 'availability_override.update', 'availability_override', id, session);
      writeJson(response, 200, { item });
      return;
    }
    writeJson(response, 200, { item: { id, tenantId, ...payload } });
    return;
  }

  if (request.method === 'DELETE') {
    const id = sanitizeStr(requestUrl.searchParams.get('id') ?? '', 36);
    if (!id) { writeJson(response, 400, { error: 'id query param is required' }); return; }
    if (process.env.DB_NAME) {
      const result = await deleteAvailabilityOverride(id, tenantId);
      telemetry.recordMutation('availability_override.delete');
      emitAudit(request, 'availability_override.delete', 'availability_override', id, session);
      writeJson(response, 200, result);
      return;
    }
    writeJson(response, 200, { deleted: true });
    return;
  }

  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleAppointmentSeries(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);
  const role = callerRole(request, session);

  if (request.method !== 'GET' && !SERIES_WRITE_ROLES.has(role)) {
    writeJson(response, 403, { error: 'Forbidden' });
    return;
  }

  if (request.method === 'GET') {
    const clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50) || undefined;
    if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'series.read');
      if (!client) return;
    }
    const counselorIdFilter = await resolveEffectiveCounselorFilterId(request, response, requestUrl, session, 'series.read');
    if (counselorIdFilter === false) return;
    if (process.env.DB_NAME) {
      const filters = {};
      const status      = requestUrl.searchParams.get('status');
      if (counselorIdFilter) filters.counselorId = counselorIdFilter;
      if (clientId)    filters.clientId    = clientId;
      if (status)      filters.status      = sanitizeStr(status, 20);
      const items = await listSeries(tenantId, filters);
      emitAudit(request, 'series.read', 'appointment_series', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    const statusFilter = sanitizeStr(requestUrl.searchParams.get('status') ?? '', 20) || null;
    let items = filterByTenant(appointmentSeriesRecords, request)
      .filter((item) => !clientId || item.clientId === clientId)
      .filter((item) => !counselorIdFilter || item.counselorId === counselorIdFilter)
      .filter((item) => !statusFilter || item.status === statusFilter)
      .sort((left, right) => String(left.startDate ?? '').localeCompare(String(right.startDate ?? '')));
    emitAudit(request, 'series.read', 'appointment_series', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    if (!payload.counselorId || !payload.clientId || !payload.recurrenceRule || !payload.startDate) {
      writeJson(response, 400, { error: 'counselorId, clientId, recurrenceRule, and startDate are required' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, payload.clientId, session, 'series.create');
    if (!client) return;
    if (process.env.DB_NAME) {
      const item = await createSeries({
        id: crypto.randomUUID(),
        tenantId,
        counselorId:     sanitizeStr(payload.counselorId, 50),
        clientId:        client.id,
        clientName:      sanitizeStr(payload.clientName ?? '', 160)    || null,
        counselorName:   sanitizeStr(payload.counselorName ?? '', 160) || null,
        appointmentType: sanitizeStr(payload.appointmentType ?? '', 60) || null,
        recurrenceRule:  sanitizeStr(payload.recurrenceRule, 200),
        startDate:       sanitizeStr(payload.startDate, 12),
        endDate:         sanitizeStr(payload.endDate ?? '', 12) || null,
        durationMinutes: Number.isFinite(Number(payload.durationMinutes)) ? Number(payload.durationMinutes) : 50,
        locationId:      sanitizeStr(payload.locationId ?? '', 50) || null,
        remoteSession:   !!payload.remoteSession,
      });
      telemetry.recordMutation('series.create');
      emitAudit(request, 'series.create', 'appointment_series', item.id, session);
      writeJson(response, 201, { item });
      return;
    }
    const counselorId = sanitizeStr(payload.counselorId, 50);
    const counselor = staffMembers.find((item) => item.id === counselorId && item.tenantId === tenantId);
    if (!counselor) {
      writeJson(response, 400, { error: 'Valid counselorId is required' });
      return;
    }
    const item = {
      id: createId('ser', appointmentSeriesRecords),
      tenantId,
      counselorId: counselor.id,
      clientId: client.id,
      clientName: sanitizeStr(payload.clientName ?? '', 160) || `${client.firstName} ${client.lastName}`.trim(),
      counselorName: sanitizeStr(payload.counselorName ?? '', 160) || `${counselor.firstName} ${counselor.lastName}`.trim(),
      appointmentType: sanitizeStr(payload.appointmentType ?? '', 60) || 'individual_therapy',
      recurrenceRule: sanitizeStr(payload.recurrenceRule, 200),
      startDate: sanitizeStr(payload.startDate, 12),
      endDate: sanitizeStr(payload.endDate ?? '', 12) || null,
      durationMinutes: Number.isFinite(Number(payload.durationMinutes)) ? Number(payload.durationMinutes) : 50,
      locationId: sanitizeStr(payload.locationId ?? '', 50) || null,
      remoteSession: !!payload.remoteSession,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    appointmentSeriesRecords.push(item);
    telemetry.recordMutation('series.create');
    emitAudit(request, 'series.create', 'appointment_series', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method === 'PATCH') {
    const payload = await readJsonBody(request);
    const id = sanitizeStr(payload.id ?? '', 36);
    if (!id) { writeJson(response, 400, { error: 'id is required' }); return; }
    if (process.env.DB_NAME) {
      const [rows] = await pool.query('SELECT client_id FROM appointment_series WHERE id = ? AND tenant_id = ?', [id, tenantId]);
      if (!rows[0]) { writeJson(response, 404, { error: 'Series not found' }); return; }
      const client = await resolveAuthorizedClient(request, response, rows[0].client_id, session, 'series.update');
      if (!client) return;
      const fields = {};
      if (payload.status        !== undefined) fields.status        = sanitizeStr(payload.status, 20);
      if (payload.endDate       !== undefined) fields.endDate       = sanitizeStr(payload.endDate, 12) || null;
      if (payload.recurrenceRule !== undefined) fields.recurrenceRule = sanitizeStr(payload.recurrenceRule, 200);
      const item = await updateSeries(id, tenantId, fields);
      if (!item) { writeJson(response, 404, { error: 'Series not found' }); return; }
      telemetry.recordMutation('series.update');
      emitAudit(request, 'series.update', 'appointment_series', id, session);
      writeJson(response, 200, { item });
      return;
    }
    const item = appointmentSeriesRecords.find((record) => record.id === id);
    if (!item) {
      writeJson(response, 404, { error: 'Series not found' });
      return;
    }
    if (enforceTenantScope(request, response, item.tenantId, session)) return;
    const client = await resolveAuthorizedClient(request, response, item.clientId, session, 'series.update');
    if (!client) return;
    if (payload.status !== undefined) item.status = sanitizeStr(payload.status, 20) ?? item.status;
    if (payload.endDate !== undefined) item.endDate = sanitizeStr(payload.endDate, 12) || null;
    if (payload.recurrenceRule !== undefined) item.recurrenceRule = sanitizeStr(payload.recurrenceRule, 200) ?? item.recurrenceRule;
    item.updatedAt = new Date().toISOString();
    telemetry.recordMutation('series.update');
    emitAudit(request, 'series.update', 'appointment_series', id);
    writeJson(response, 200, { item });
    return;
  }

  writeJson(response, 405, { error: 'Method not allowed' });
}

const UTILIZATION_ROLES = new Set(['practice_owner', 'practice_admin', 'scheduler_biller']);

async function handleUtilization(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const role = callerRole(request, session);
  if (!UTILIZATION_ROLES.has(role)) {
    writeJson(response, 403, { error: 'Forbidden' });
    return;
  }

  const tenantId    = callerTenant(request, session);
  const from        = sanitizeStr(requestUrl.searchParams.get('from')        ?? '', 12) || undefined;
  const to          = sanitizeStr(requestUrl.searchParams.get('to')          ?? '', 12) || undefined;
  const counselorId = sanitizeStr(requestUrl.searchParams.get('counselorId') ?? '', 50) || undefined;

  if (process.env.DB_NAME) {
    const summary = await getUtilizationSummary(tenantId, from, to, counselorId);
    emitAudit(request, 'utilization.read', 'appointment', 'summary', session);
    writeJson(response, 200, summary);
    return;
  }

  writeJson(response, 200, {
    period: { from: from ?? null, to: to ?? null },
    totalAppointments: 0,
    byStatus: {},
    byCounselor: [],
    byLocation: [],
  });
}

async function handleOperationsSummary(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const timezone = normalizeTimezone(requestUrl.searchParams.get('timezone') ?? practices[0]?.timezone ?? 'America/New_York');
  if (!timezone) {
    writeJson(response, 400, { error: 'timezone must be a valid IANA timezone identifier' });
    return;
  }

  const counselorScopeId = await resolveEffectiveCounselorFilterId(request, response, requestUrl, session, 'operations.summary.read');
  if (counselorScopeId === false) return;
  const summary = await buildOperationsSummary(request, timezone, session, { counselorScopeId });
  emitAudit(request, 'operations.summary.read', 'system', 'operations-summary', session);
  writeJson(response, 200, { summary });
}

async function handleServiceCodes(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listServiceCodes(callerTenant(request, session));
      emitAudit(request, 'billing.service_code.read', 'billing_service_code', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    emitAudit(request, 'billing.service_code.read', 'billing_service_code', 'collection');
    writeJson(response, 200, { items: filterByTenant(serviceCodes, request) });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const code = sanitizeStr(payload.code, 30);
    const name = sanitizeStr(payload.name, 160);
    if (!code || !name) {
      writeJson(response, 400, { error: 'code and name are required' });
      return;
    }

    const status = normalizeServiceCodeStatus(payload.status ?? 'active');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      const item = await createServiceCode({
        id: genId('svc'),
        tenantId: callerTenant(request, session),
        code,
        name,
        category: sanitizeStr(payload.category, 80) ?? 'therapy',
        defaultDurationMinutes: Number.isFinite(Number(payload.defaultDurationMinutes)) ? Number(payload.defaultDurationMinutes) : 60,
        status,
      });
      telemetry.recordMutation('billing.service_code.create');
      emitAudit(request, 'billing.service_code.create', 'billing_service_code', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = {
      id: createId('svc', serviceCodes),
      tenantId: callerTenant(request),
      code,
      name,
      category: sanitizeStr(payload.category, 80) ?? 'therapy',
      defaultDurationMinutes: Number.isFinite(Number(payload.defaultDurationMinutes)) ? Number(payload.defaultDurationMinutes) : 60,
      status,
    };

    serviceCodes.push(item);
    telemetry.recordMutation('billing.service_code.create');
    emitAudit(request, 'billing.service_code.create', 'billing_service_code', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const serviceCodeId = sanitizeStr(payload.serviceCodeId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const existing = await getServiceCodeById(serviceCodeId, tenantId);
    if (!existing) { writeJson(response, 404, { error: 'Service code not found' }); return; }
    const fields = {};
    if (typeof payload.code === 'string') fields.code = sanitizeStr(payload.code, 30) ?? existing.code;
    if (typeof payload.name === 'string') fields.name = sanitizeStr(payload.name, 160) ?? existing.name;
    if (typeof payload.category === 'string') fields.category = sanitizeStr(payload.category, 80) ?? existing.category;
    if (payload.defaultDurationMinutes !== undefined) { const d = Number(payload.defaultDurationMinutes); if (!Number.isFinite(d) || d < 15 || d > 240) { writeJson(response, 400, { error: 'defaultDurationMinutes must be between 15 and 240' }); return; } fields.defaultDurationMinutes = d; }
    if (typeof payload.status === 'string') { const s = normalizeServiceCodeStatus(payload.status); if (!s) { writeJson(response, 400, { error: 'status must be valid' }); return; } fields.status = s; }
    const item = await updateServiceCode(serviceCodeId, tenantId, fields);
    telemetry.recordMutation('billing.service_code.update');
    emitAudit(request, 'billing.service_code.update', 'billing_service_code', serviceCodeId, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = serviceCodes.find((record) => record.id === serviceCodeId);
  if (!item) {
    writeJson(response, 404, { error: 'Service code not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (typeof payload.code === 'string') item.code = sanitizeStr(payload.code, 30) ?? item.code;
  if (typeof payload.name === 'string') item.name = sanitizeStr(payload.name, 160) ?? item.name;
  if (typeof payload.category === 'string') item.category = sanitizeStr(payload.category, 80) ?? item.category;
  if (payload.defaultDurationMinutes !== undefined) {
    const duration = Number(payload.defaultDurationMinutes);
    if (!Number.isFinite(duration) || duration < 15 || duration > 240) {
      writeJson(response, 400, { error: 'defaultDurationMinutes must be between 15 and 240' });
      return;
    }
    item.defaultDurationMinutes = duration;
  }
  if (typeof payload.status === 'string') {
    const status = normalizeServiceCodeStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
  }

  telemetry.recordMutation('billing.service_code.update');
  emitAudit(request, 'billing.service_code.update', 'billing_service_code', item.id);
  writeJson(response, 200, { item });
}

async function handleFeeSchedules(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFeeSchedules(callerTenant(request, session));
      emitAudit(request, 'billing.fee_schedule.read', 'billing_fee_schedule', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    emitAudit(request, 'billing.fee_schedule.read', 'billing_fee_schedule', 'collection');
    writeJson(response, 200, { items: filterByTenant(feeSchedules, request) });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const name = sanitizeStr(payload.name, 160);
    if (!name) {
      writeJson(response, 400, { error: 'name is required' });
      return;
    }

    const lines = normalizeFeeScheduleLines(payload.lines);
    if (!lines.length) {
      writeJson(response, 400, { error: 'At least one fee schedule line is required' });
      return;
    }

    if (process.env.DB_NAME) {
      const item = await createFeeSchedule({
        id: genId('fee'),
        tenantId: callerTenant(request, session),
        name,
        status: normalizeServiceCodeStatus(payload.status ?? 'active') ?? 'active',
        currency: sanitizeStr(payload.currency, 8) ?? 'USD',
        lines,
      });
      telemetry.recordMutation('billing.fee_schedule.create');
      emitAudit(request, 'billing.fee_schedule.create', 'billing_fee_schedule', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = {
      id: createId('fee', feeSchedules),
      tenantId: callerTenant(request),
      name,
      status: normalizeServiceCodeStatus(payload.status ?? 'active') ?? 'active',
      currency: sanitizeStr(payload.currency, 8) ?? 'USD',
      lines,
      updatedAt: new Date().toISOString(),
    };

    feeSchedules.push(item);
    telemetry.recordMutation('billing.fee_schedule.create');
    emitAudit(request, 'billing.fee_schedule.create', 'billing_fee_schedule', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const feeScheduleId = sanitizeStr(payload.feeScheduleId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const existing = await getFeeScheduleById(feeScheduleId, tenantId);
    if (!existing) { writeJson(response, 404, { error: 'Fee schedule not found' }); return; }
    const fields = {};
    if (typeof payload.name === 'string') fields.name = sanitizeStr(payload.name, 160) ?? existing.name;
    if (typeof payload.status === 'string') { const s = normalizeServiceCodeStatus(payload.status); if (!s) { writeJson(response, 400, { error: 'status must be valid' }); return; } fields.status = s; }
    if (typeof payload.currency === 'string') fields.currency = sanitizeStr(payload.currency, 8) ?? existing.currency;
    if (Array.isArray(payload.lines)) { const lines = normalizeFeeScheduleLines(payload.lines); if (!lines.length) { writeJson(response, 400, { error: 'At least one valid fee schedule line is required' }); return; } fields.lines = lines; }
    const item = await updateFeeSchedule(feeScheduleId, tenantId, fields);
    telemetry.recordMutation('billing.fee_schedule.update');
    emitAudit(request, 'billing.fee_schedule.update', 'billing_fee_schedule', feeScheduleId, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = feeSchedules.find((record) => record.id === feeScheduleId);
  if (!item) {
    writeJson(response, 404, { error: 'Fee schedule not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (typeof payload.name === 'string') item.name = sanitizeStr(payload.name, 160) ?? item.name;
  if (typeof payload.status === 'string') {
    const status = normalizeServiceCodeStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
  }
  if (typeof payload.currency === 'string') item.currency = sanitizeStr(payload.currency, 8) ?? item.currency;
  if (Array.isArray(payload.lines)) {
    const lines = normalizeFeeScheduleLines(payload.lines);
    if (!lines.length) {
      writeJson(response, 400, { error: 'At least one valid fee schedule line is required' });
      return;
    }
    item.lines = lines;
  }
  item.updatedAt = new Date().toISOString();

  telemetry.recordMutation('billing.fee_schedule.update');
  emitAudit(request, 'billing.fee_schedule.update', 'billing_fee_schedule', item.id);
  writeJson(response, 200, { item });
}

async function handleInvoices(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const clientIdFilter = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50);
    const statusFilter = sanitizeStr(requestUrl.searchParams.get('status') ?? '', 30);
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      let items = await listInvoices(tenantId);
      if (clientIdFilter) items = items.filter((inv) => inv.clientId === clientIdFilter);
      if (statusFilter) items = items.filter((inv) => inv.status === statusFilter);
      emitAudit(request, 'billing.invoice.read', 'billing_invoice', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(invoices, request);
    if (clientIdFilter) items = items.filter((invoice) => invoice.clientId === clientIdFilter);
    if (statusFilter) items = items.filter((invoice) => invoice.status === statusFilter);
    emitAudit(request, 'billing.invoice.read', 'billing_invoice', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const clientId = sanitizeStr(payload.clientId, 50);

    const lineItems = normalizeInvoiceLineItems(payload.lineItems, payload.feeScheduleId);
    if (!lineItems.length) {
      writeJson(response, 400, { error: 'At least one line item is required' });
      return;
    }

    const status = normalizeInvoiceStatus(payload.status ?? 'issued');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const [clientRows] = await pool.query('SELECT * FROM clients WHERE id = ? AND tenant_id = ?', [clientId, tenantId]);
      if (!clientRows[0]) { writeJson(response, 400, { error: 'Valid clientId is required' }); return; }
      const totals = computeInvoiceTotals(lineItems, payload.adjustments, 0);
      const item = await createInvoice({
        id: genId('inv'),
        tenantId,
        clientId,
        appointmentId: sanitizeStr(payload.appointmentId, 50),
        issuedAt: normalizeIsoDate(payload.issuedAt) ?? new Date().toISOString(),
        dueAt: normalizeIsoDate(payload.dueAt) ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status,
        lineItems,
        insuranceInfo: { payerName: sanitizeStr(payload.insurance?.payerName, 160) ?? '', policyNumber: sanitizeStr(payload.insurance?.policyNumber, 120) ?? '', memberId: sanitizeStr(payload.insurance?.memberId, 120) ?? '', groupNumber: sanitizeStr(payload.insurance?.groupNumber, 120) ?? '' },
        subtotal: totals.subtotal,
        adjustments: totals.adjustments,
        total: totals.total,
        amountPaid: 0,
        balance: totals.balance,
      });
      telemetry.recordMutation('billing.invoice.create');
      emitAudit(request, 'billing.invoice.create', 'billing_invoice', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      writeJson(response, 400, { error: 'Valid clientId is required' });
      return;
    }

    const totals = computeInvoiceTotals(lineItems, payload.adjustments, 0);
    const item = {
      id: createId('inv', invoices),
      tenantId: callerTenant(request),
      clientId,
      appointmentId: sanitizeStr(payload.appointmentId, 50),
      issuedAt: normalizeIsoDate(payload.issuedAt) ?? new Date().toISOString(),
      dueAt: normalizeIsoDate(payload.dueAt) ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status,
      lineItems,
      insurance: {
        payerName: sanitizeStr(payload.insurance?.payerName, 160) ?? '',
        policyNumber: sanitizeStr(payload.insurance?.policyNumber, 120) ?? '',
        memberId: sanitizeStr(payload.insurance?.memberId, 120) ?? '',
        groupNumber: sanitizeStr(payload.insurance?.groupNumber, 120) ?? '',
      },
      claimStatus: normalizeClaimStatus(payload.claimStatus ?? 'not_submitted') ?? 'not_submitted',
      subtotal: totals.subtotal,
      adjustments: totals.adjustments,
      total: totals.total,
      amountPaid: 0,
      balance: totals.balance,
      updatedAt: new Date().toISOString(),
    };

    invoices.push(item);
    telemetry.recordMutation('billing.invoice.create');
    emitAudit(request, 'billing.invoice.create', 'billing_invoice', item.id);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const invoiceId = sanitizeStr(payload.invoiceId, 50);
  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const existing = await getInvoiceById(invoiceId, tenantId);
    if (!existing) { writeJson(response, 404, { error: 'Invoice not found' }); return; }
    const fields = {};
    if (typeof payload.status === 'string') { const s = normalizeInvoiceStatus(payload.status); if (!s) { writeJson(response, 400, { error: 'status must be valid' }); return; } fields.status = s; }
    if (typeof payload.dueAt === 'string') fields.dueAt = normalizeIsoDate(payload.dueAt) ?? existing.dueAt;
    if (typeof payload.issuedAt === 'string') fields.issuedAt = normalizeIsoDate(payload.issuedAt) ?? existing.issuedAt;
    if (Array.isArray(payload.lineItems)) { const lines = normalizeInvoiceLineItems(payload.lineItems); if (!lines.length) { writeJson(response, 400, { error: 'At least one valid line item is required' }); return; } fields.lineItems = lines; }
    if (payload.adjustments !== undefined) fields.adjustments = normalizeCurrency(payload.adjustments);
    if (payload.insurance && typeof payload.insurance === 'object') fields.insuranceInfo = { payerName: sanitizeStr(payload.insurance.payerName, 160) ?? existing.insurance?.payerName ?? '', policyNumber: sanitizeStr(payload.insurance.policyNumber, 120) ?? existing.insurance?.policyNumber ?? '', memberId: sanitizeStr(payload.insurance.memberId, 120) ?? existing.insurance?.memberId ?? '', groupNumber: sanitizeStr(payload.insurance.groupNumber, 120) ?? existing.insurance?.groupNumber ?? '' };
    if (typeof payload.claimStatus === 'string') { const cs = normalizeClaimStatus(payload.claimStatus); if (!cs) { writeJson(response, 400, { error: 'claimStatus must be valid' }); return; } fields.claimStatus = cs; }
    const item = await updateInvoice(invoiceId, tenantId, fields);
    telemetry.recordMutation('billing.invoice.update');
    emitAudit(request, 'billing.invoice.update', 'billing_invoice', invoiceId, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = invoices.find((invoice) => invoice.id === invoiceId);
  if (!item) {
    writeJson(response, 404, { error: 'Invoice not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (typeof payload.status === 'string') {
    const status = normalizeInvoiceStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
  }
  if (typeof payload.dueAt === 'string') item.dueAt = normalizeIsoDate(payload.dueAt) ?? item.dueAt;
  if (typeof payload.issuedAt === 'string') item.issuedAt = normalizeIsoDate(payload.issuedAt) ?? item.issuedAt;
  if (Array.isArray(payload.lineItems)) {
    const lines = normalizeInvoiceLineItems(payload.lineItems);
    if (!lines.length) {
      writeJson(response, 400, { error: 'At least one valid line item is required' });
      return;
    }
    item.lineItems = lines;
  }
  if (payload.adjustments !== undefined) item.adjustments = normalizeCurrency(payload.adjustments);
  if (payload.insurance && typeof payload.insurance === 'object') {
    item.insurance = {
      payerName: sanitizeStr(payload.insurance.payerName, 160) ?? item.insurance?.payerName ?? '',
      policyNumber: sanitizeStr(payload.insurance.policyNumber, 120) ?? item.insurance?.policyNumber ?? '',
      memberId: sanitizeStr(payload.insurance.memberId, 120) ?? item.insurance?.memberId ?? '',
      groupNumber: sanitizeStr(payload.insurance.groupNumber, 120) ?? item.insurance?.groupNumber ?? '',
    };
  }
  if (typeof payload.claimStatus === 'string') {
    const claimStatus = normalizeClaimStatus(payload.claimStatus);
    if (!claimStatus) {
      writeJson(response, 400, { error: 'claimStatus must be valid' });
      return;
    }
    item.claimStatus = claimStatus;
  }

  const totals = computeInvoiceTotals(item.lineItems, item.adjustments, item.amountPaid);
  item.subtotal = totals.subtotal;
  item.total = totals.total;
  item.balance = totals.balance;
  item.updatedAt = new Date().toISOString();

  telemetry.recordMutation('billing.invoice.update');
  emitAudit(request, 'billing.invoice.update', 'billing_invoice', item.id);
  writeJson(response, 200, { item });
}

async function handlePayments(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const invoiceIdFilter = sanitizeStr(requestUrl.searchParams.get('invoiceId') ?? '', 50);
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      let items = await listPayments(tenantId);
      if (invoiceIdFilter) items = items.filter((p) => p.invoiceId === invoiceIdFilter);
      emitAudit(request, 'billing.payment.read', 'billing_payment', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(payments, request);
    if (invoiceIdFilter) items = items.filter((payment) => payment.invoiceId === invoiceIdFilter);
    emitAudit(request, 'billing.payment.read', 'billing_payment', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const invoiceId = sanitizeStr(payload.invoiceId, 50);

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const invoice = await getInvoiceById(invoiceId, tenantId);
    if (!invoice) { writeJson(response, 400, { error: 'Valid invoiceId is required' }); return; }
    const amount = normalizeCurrency(payload.amount);
    if (amount <= 0) { writeJson(response, 400, { error: 'amount must be a positive currency value' }); return; }
    const method = normalizePaymentMethod(payload.method ?? 'other');
    if (!method) { writeJson(response, 400, { error: 'method must be valid' }); return; }
    const payment = await createPayment({
      id: genId('pay'),
      tenantId,
      invoiceId,
      clientId: invoice.clientId,
      amount,
      method,
      receivedAt: normalizeIsoDate(payload.receivedAt) ?? new Date().toISOString(),
      reference: sanitizeStr(payload.reference, 120) ?? '',
      notes: sanitizeStr(payload.notes, 500) ?? '',
    });
    const newAmountPaid = normalizeCurrency((invoice.amountPaid ?? 0) + amount);
    const totals = computeInvoiceTotals(invoice.lineItems, invoice.adjustments, newAmountPaid);
    const newStatus = totals.balance <= 0 ? 'paid' : (newAmountPaid > 0 && invoice.status !== 'void' ? 'partially_paid' : invoice.status);
    const updatedInvoice = await updateInvoice(invoiceId, tenantId, { amountPaid: newAmountPaid, status: newStatus });
    telemetry.recordMutation('billing.payment.create');
    emitAudit(request, 'billing.payment.create', 'billing_payment', payment.id, session);
    writeJson(response, 201, { item: payment, invoice: updatedInvoice });
    return;
  }

  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    writeJson(response, 400, { error: 'Valid invoiceId is required' });
    return;
  }

  if (enforceTenantScope(request, response, invoice.tenantId)) return;

  const amount = normalizeCurrency(payload.amount);
  if (amount <= 0) {
    writeJson(response, 400, { error: 'amount must be a positive currency value' });
    return;
  }

  const method = normalizePaymentMethod(payload.method ?? 'other');
  if (!method) {
    writeJson(response, 400, { error: 'method must be valid' });
    return;
  }

  const payment = {
    id: createId('pay', payments),
    tenantId: invoice.tenantId,
    invoiceId,
    clientId: invoice.clientId,
    amount,
    method,
    receivedAt: normalizeIsoDate(payload.receivedAt) ?? new Date().toISOString(),
    reference: sanitizeStr(payload.reference, 120) ?? '',
    notes: sanitizeStr(payload.notes, 500) ?? '',
  };

  payments.push(payment);
  invoice.amountPaid = normalizeCurrency((invoice.amountPaid ?? 0) + amount);
  const totals = computeInvoiceTotals(invoice.lineItems, invoice.adjustments, invoice.amountPaid);
  invoice.subtotal = totals.subtotal;
  invoice.total = totals.total;
  invoice.balance = totals.balance;
  if (invoice.balance <= 0) {
    invoice.status = 'paid';
  } else if (invoice.amountPaid > 0 && invoice.status !== 'void') {
    invoice.status = 'partially_paid';
  }
  invoice.updatedAt = new Date().toISOString();

  telemetry.recordMutation('billing.payment.create');
  emitAudit(request, 'billing.payment.create', 'billing_payment', payment.id);
  writeJson(response, 201, { item: payment, invoice });
}

async function handleSuperbills(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const clientIdFilter = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50);
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      let items = await listSuperbills(tenantId);
      if (clientIdFilter) items = items.filter((sb) => sb.clientId === clientIdFilter);
      emitAudit(request, 'billing.superbill.read', 'billing_superbill', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(superbills, request);
    if (clientIdFilter) items = items.filter((superbill) => superbill.clientId === clientIdFilter);
    emitAudit(request, 'billing.superbill.read', 'billing_superbill', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const invoiceId = sanitizeStr(payload.invoiceId, 50);

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const invoice = await getInvoiceById(invoiceId, tenantId);
    if (!invoice) { writeJson(response, 400, { error: 'Valid invoiceId is required' }); return; }
    const item = await createSuperbill({
      id: genId('sb'),
      tenantId: invoice.tenantId,
      invoiceId,
      clientId: invoice.clientId,
      generatedAt: new Date().toISOString(),
      diagnosisCodes: Array.isArray(payload.diagnosisCodes) ? payload.diagnosisCodes.map((code) => sanitizeStr(String(code), 30)).filter(Boolean) : [],
      serviceLines: (invoice.lineItems ?? []).map((line) => ({ serviceCodeId: line.serviceCodeId, code: line.code, amount: line.quantity * line.unitAmount, serviceDate: line.serviceDate })),
    });
    telemetry.recordMutation('billing.superbill.create');
    emitAudit(request, 'billing.superbill.create', 'billing_superbill', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    writeJson(response, 400, { error: 'Valid invoiceId is required' });
    return;
  }

  if (enforceTenantScope(request, response, invoice.tenantId)) return;

  const item = {
    id: createId('sb', superbills),
    tenantId: invoice.tenantId,
    invoiceId,
    clientId: invoice.clientId,
    generatedAt: new Date().toISOString(),
    diagnosisCodes: Array.isArray(payload.diagnosisCodes)
      ? payload.diagnosisCodes.map((code) => sanitizeStr(String(code), 30)).filter(Boolean)
      : [],
    serviceLines: invoice.lineItems.map((line) => ({
      serviceCodeId: line.serviceCodeId,
      code: line.code,
      amount: line.quantity * line.unitAmount,
      serviceDate: line.serviceDate,
    })),
  };

  superbills.push(item);
  telemetry.recordMutation('billing.superbill.create');
  emitAudit(request, 'billing.superbill.create', 'billing_superbill', item.id);
  writeJson(response, 201, { item });
}

async function handleClaimPlaceholders(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const statusFilter = sanitizeStr(requestUrl.searchParams.get('status') ?? '', 40);
    if (process.env.DB_NAME) {
      const items = await listClaims(callerTenant(request, session), statusFilter || undefined);
      emitAudit(request, 'billing.claim.read', 'billing_claim', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(claimPlaceholders, request);
    if (statusFilter) items = items.filter((claim) => claim.status === statusFilter);
    emitAudit(request, 'billing.claim.read', 'billing_claim', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    const payload = await readJsonBody(request);
    const invoiceId = sanitizeStr(payload.invoiceId, 50);

    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const invoice = await getInvoiceById(invoiceId, tenantId);
      if (!invoice) {
        writeJson(response, 400, { error: 'Valid invoiceId is required' });
        return;
      }
      const status = normalizeClaimStatus(payload.status ?? 'queued');
      if (!status) {
        writeJson(response, 400, { error: 'status must be valid' });
        return;
      }
      const item = await createClaim({
        id: genId('clm'),
        tenantId,
        invoiceId,
        status,
        externalReference: sanitizeStr(payload.externalReference, 120) ?? '',
        submittedAt: status === 'queued' || status === 'submitted' ? new Date().toISOString() : null,
        notes: sanitizeStr(payload.notes, 500) ?? '',
      });
      const updatedInvoice = await updateInvoice(invoiceId, tenantId, { claimStatus: status });
      telemetry.recordMutation('billing.claim.create');
      emitAudit(request, 'billing.claim.create', 'billing_claim', item.id, session);
      writeJson(response, 201, { item, invoice: updatedInvoice });
      return;
    }

    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      writeJson(response, 400, { error: 'Valid invoiceId is required' });
      return;
    }

    if (enforceTenantScope(request, response, invoice.tenantId)) return;

    const status = normalizeClaimStatus(payload.status ?? 'queued');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    const item = {
      id: createId('clm', claimPlaceholders),
      tenantId: invoice.tenantId,
      invoiceId,
      status,
      externalReference: sanitizeStr(payload.externalReference, 120) ?? '',
      submittedAt: status === 'queued' || status === 'submitted' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      notes: sanitizeStr(payload.notes, 500) ?? '',
    };

    claimPlaceholders.push(item);
    invoice.claimStatus = status;
    invoice.updatedAt = new Date().toISOString();

    telemetry.recordMutation('billing.claim.create');
    emitAudit(request, 'billing.claim.create', 'billing_claim', item.id);
    writeJson(response, 201, { item, invoice });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const claimId = sanitizeStr(payload.claimId, 50);

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const existingClaims = await listClaims(tenantId);
    const existing = existingClaims.find((claim) => claim.id === claimId);
    if (!existing) {
      writeJson(response, 404, { error: 'Claim placeholder not found' });
      return;
    }
    const fields = {};
    if (typeof payload.status === 'string') {
      const status = normalizeClaimStatus(payload.status);
      if (!status) {
        writeJson(response, 400, { error: 'status must be valid' });
        return;
      }
      fields.status = status;
    }
    if (typeof payload.externalReference === 'string') fields.externalReference = sanitizeStr(payload.externalReference, 120) ?? existing.externalReference;
    if (typeof payload.notes === 'string') fields.notes = sanitizeStr(payload.notes, 500) ?? existing.notes;
    const item = await updateClaim(claimId, tenantId, fields);
    let invoice = null;
    if (item?.invoiceId) {
      invoice = await updateInvoice(item.invoiceId, tenantId, { claimStatus: item.status });
    }
    telemetry.recordMutation('billing.claim.update');
    emitAudit(request, 'billing.claim.update', 'billing_claim', claimId, session);
    writeJson(response, 200, { item, invoice });
    return;
  }

  const item = claimPlaceholders.find((claim) => claim.id === claimId);
  if (!item) {
    writeJson(response, 404, { error: 'Claim placeholder not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (typeof payload.status === 'string') {
    const status = normalizeClaimStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
  }
  if (typeof payload.externalReference === 'string') item.externalReference = sanitizeStr(payload.externalReference, 120) ?? item.externalReference;
  if (typeof payload.notes === 'string') item.notes = sanitizeStr(payload.notes, 500) ?? item.notes;
  item.updatedAt = new Date().toISOString();

  const invoice = invoices.find((inv) => inv.id === item.invoiceId);
  if (invoice) {
    invoice.claimStatus = item.status;
    invoice.updatedAt = new Date().toISOString();
  }

  telemetry.recordMutation('billing.claim.update');
  emitAudit(request, 'billing.claim.update', 'billing_claim', item.id);
  writeJson(response, 200, { item, invoice: invoice ?? null });
}

async function handleAgingReport(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const asOf = normalizeIsoDate(requestUrl.searchParams.get('asOf') ?? new Date().toISOString()) ?? new Date().toISOString();

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request);
    const report = await getAgingReport(tenantId, asOf);
    emitAudit(request, 'billing.report.aging.read', 'billing_report', 'aging');
    writeJson(response, 200, { asOf, report });
    return;
  }

  const report = buildAgingReport(filterByTenant(invoices, request), asOf);
  emitAudit(request, 'billing.report.aging.read', 'billing_report', 'aging');
  writeJson(response, 200, { asOf, report });
}

async function handlePortalPublicConfig(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const tenantId = getPublicPortalTenantId(request, session);
  const settings = await ensurePortalSettings(tenantId);
  const item = await buildPublicPortalConfig(tenantId, settings);
  writeJson(response, 200, { item });
}

async function handlePortalSettings(request, response, session) {
  if (request.method === 'GET') {
    if (requirePracticeAdmin(request, response, session)) return;
    const tenantId = callerTenant(request, session);
    const item = await ensurePortalSettings(tenantId);
    emitAudit(request, 'portal.settings.read', 'portal_settings', tenantId, session);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;
  const tenantId = callerTenant(request, session);
  const payload = await readJsonBody(request);
  const current = await ensurePortalSettings(tenantId);

  if (payload.contactPreferenceOptions !== undefined && !Array.isArray(payload.contactPreferenceOptions)) {
    writeJson(response, 400, { error: 'contactPreferenceOptions must be an array' });
    return;
  }
  if (payload.defaultSignupFormKeys !== undefined && !Array.isArray(payload.defaultSignupFormKeys)) {
    writeJson(response, 400, { error: 'defaultSignupFormKeys must be an array' });
    return;
  }

  let registrationMode = current.registrationMode;
  if (payload.registrationMode !== undefined) {
    registrationMode = normalizePortalRegistrationMode(payload.registrationMode);
    if (!registrationMode) {
      writeJson(response, 400, { error: 'registrationMode must be valid' });
      return;
    }
  }

  const financialMode = 'offerings';

  const contactPreferenceOptions = payload.contactPreferenceOptions !== undefined
    ? normalizePortalContactPreferenceOptions(payload.contactPreferenceOptions)
    : current.contactPreferenceOptions;

  const catalog = await ensureFormCatalogSeeded(tenantId);
  const allowedFormKeys = new Set(catalog.map((item) => item.formKey));
  const defaultSignupFormKeys = payload.defaultSignupFormKeys !== undefined
    ? [...new Set(payload.defaultSignupFormKeys
      .map((entry) => sanitizeStr(String(entry), 120))
      .filter((entry) => entry && allowedFormKeys.has(entry)))]
    : current.defaultSignupFormKeys;

  const next = {
    id: current.id ?? genId('ps'),
    tenantId,
    practiceName: sanitizeStr(payload.practiceName, 255) ?? current.practiceName,
    logoUrl: typeof payload.logoUrl === 'string' ? (sanitizeStr(payload.logoUrl, 500) ?? '') : current.logoUrl,
    brandColor: payload.brandColor !== undefined ? normalizeHexColor(payload.brandColor, current.brandColor) : current.brandColor,
    accentColor: payload.accentColor !== undefined ? normalizeHexColor(payload.accentColor, current.accentColor) : current.accentColor,
    welcomeHeadline: sanitizeStr(payload.welcomeHeadline, 255) ?? current.welcomeHeadline,
    welcomeMessage: typeof payload.welcomeMessage === 'string' ? (sanitizeStr(payload.welcomeMessage, 2000) ?? current.welcomeMessage) : current.welcomeMessage,
    helpMessage: typeof payload.helpMessage === 'string' ? (sanitizeStr(payload.helpMessage, 1000) ?? '') : current.helpMessage,
    supportEmail: typeof payload.supportEmail === 'string' ? (sanitizeStr(payload.supportEmail, 320) ?? '') : current.supportEmail,
    registrationMode,
    allowCreateAccount: payload.allowCreateAccount !== undefined ? Boolean(payload.allowCreateAccount) : current.allowCreateAccount,
    allowCareRequests: payload.allowCareRequests !== undefined ? Boolean(payload.allowCareRequests) : current.allowCareRequests,
    allowSchedulingRequests: payload.allowSchedulingRequests !== undefined ? Boolean(payload.allowSchedulingRequests) : current.allowSchedulingRequests,
    showPublicCounselorDirectory: payload.showPublicCounselorDirectory !== undefined
      ? Boolean(payload.showPublicCounselorDirectory)
      : current.showPublicCounselorDirectory,
    financialMode,
    suggestedOfferingCents: typeof payload.suggestedOfferingCents === 'number' && Number.isInteger(payload.suggestedOfferingCents) && payload.suggestedOfferingCents >= 0
      ? payload.suggestedOfferingCents
      : (current.suggestedOfferingCents ?? 0),
    offeringMinistryNote: payload.offeringMinistryNote !== undefined
      ? sanitizeStr(payload.offeringMinistryNote ?? '', 1000)
      : (current.offeringMinistryNote ?? ''),
    contactPreferenceOptions,
    defaultSignupFormKeys,
  };

  let item;
  if (process.env.DB_NAME) {
    item = await upsertPortalSettings(next);
  } else {
    const existingIndex = portalSettingsRecords.findIndex((entry) => entry.tenantId === tenantId);
    const now = new Date().toISOString();
    item = {
      ...current,
      ...next,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) {
      portalSettingsRecords[existingIndex] = item;
    } else {
      portalSettingsRecords.push(item);
    }
  }

  telemetry.recordMutation('portal.settings.update');
  emitAudit(request, 'portal.settings.update', 'portal_settings', tenantId, session);
  writeJson(response, 200, { item });
}

async function handlePortalOverview(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  const settings = process.env.DB_NAME
    ? await getPortalSettings(client.tenantId)
    : (portalSettingsRecords.find((item) => item.tenantId === client.tenantId) ?? buildDefaultPortalSettings(client.tenantId));

  let account = null;
  let forms = [];
  let assignedForms = [];
  let documents = [];
  let resources = [];
  let messageThreads = [];
  let appointmentRequests = [];
  let upcomingAppointments = [];
  let assignedCounselor = null;
  let counselorDirectory = [];
  let paymentHistory = [];
  let offeringStats = {
    thisMonthCents: 0,
    yearToDateCents: 0,
    totalCents: 0,
    count: 0,
    averageCents: 0,
  };
  let pastSessionCount = 0;

  if (process.env.DB_NAME) {
    account = await getPortalAccount(client.id, client.tenantId);
    forms = await listFormAssignments(client.tenantId, { clientId: client.id });
    assignedForms = forms.filter((item) => item.status !== 'completed');
    documents = await listDocumentAssignments(client.tenantId, { clientId: client.id });
    resources = (await listPortalResources(client.tenantId))
      .filter((item) => ['all', 'client', 'clients'].includes(item.audience ?? 'all'));
    const threads = await listPortalMessageThreads(client.tenantId, client.id);
    messageThreads = await Promise.all(
      threads.map(async (thread) => ({
        ...thread,
        unreadForClient: 0,
        messageCount: (await listPortalMessages(thread.id, client.tenantId)).length,
      }))
    );
    appointmentRequests = await listPortalAppointmentRequests(client.tenantId, client.id);
    const allAppointments = await listAppointments(client.tenantId);
    upcomingAppointments = allAppointments
      .filter((item) => item.clientId === client.id)
      .filter((item) => {
        if (!item.startsAt) return false;
        if (item.status === 'cancelled' || item.status === 'canceled') return false;
        return new Date(item.startsAt).getTime() >= Date.now() - (12 * 60 * 60 * 1000);
      })
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    pastSessionCount = allAppointments
      .filter((item) => item.clientId === client.id)
      .filter((item) => item.status !== 'cancelled' && item.status !== 'canceled')
      .filter((item) => item.startsAt && new Date(item.startsAt).getTime() < Date.now())
      .length;
    const offerings = await listOfferingsForTenant(client.tenantId, { clientId: client.id });
    offeringStats = summarizeOfferings(offerings);
    paymentHistory = offerings.map((item) => ({
      id: item.id,
      amount: item.amountCents,
      amountCents: item.amountCents,
      receivedAt: item.receivedOn,
      paymentMethod: 'offering',
      reference: null,
      note: item.note ?? null,
    }));

    const assignedCounselorId = upcomingAppointments.find((item) => item.counselorId)?.counselorId ?? null;
    if (assignedCounselorId) {
      const counselor = await getStaffById(assignedCounselorId, client.tenantId);
      if (counselor) {
        assignedCounselor = {
          staffId: counselor.id,
          firstName: counselor.firstName,
          lastName: counselor.lastName,
          role: counselor.role,
          bio: counselor.bio ?? '',
        };
      }
    }
    if (settings?.showPublicCounselorDirectory) {
      const staff = await listStaff(client.tenantId);
      counselorDirectory = staff
        .filter((item) => ['counselor', 'intern'].includes(item.role))
        .map((item) => ({
          staffId: item.id,
          firstName: item.firstName,
          lastName: item.lastName,
          role: item.role,
          bio: item.bio ?? '',
          licenseType: item.licenseType ?? '',
          supervisionStatus: item.supervisionStatus ?? '',
        }));
    }
  } else {
    account = portalAccounts.find((item) => item.clientId === client.id && item.tenantId === client.tenantId) ?? null;
    forms = intakePackets.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId);
    assignedForms = formWorkflowAssignments.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId && item.status !== 'completed');
    documents = documentAssignments
      .filter((item) => item.tenantId === client.tenantId)
      .filter((item) => item.assigneeType === 'client' && item.assigneeId === client.id)
      .map((item) => ({
        ...item,
        templateTitle: documentTemplates.find((template) => template.id === item.templateId)?.title ?? 'Document',
      }));
    resources = portalResources.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id);
    messageThreads = portalMessageThreads
      .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
      .map((thread) => ({
        ...thread,
        unreadForClient: 0,
        messageCount: portalMessages.filter((message) => message.threadId === thread.id).length,
      }));
    appointmentRequests = portalAppointmentRequests.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id);
    upcomingAppointments = appointments
      .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
      .filter((item) => item.status !== 'cancelled' && item.status !== 'canceled')
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    pastSessionCount = appointments
      .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
      .filter((item) => item.status !== 'cancelled' && item.status !== 'canceled')
      .filter((item) => item.startsAt && new Date(item.startsAt).getTime() < Date.now())
      .length;
    const offerings = offeringsRecords
      .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
      .sort((left, right) => String(right.receivedOn).localeCompare(String(left.receivedOn)));
    offeringStats = summarizeOfferings(offerings);
    paymentHistory = offerings.map((item) => ({
      id: item.id,
      amount: item.amountCents,
      amountCents: item.amountCents,
      receivedAt: item.receivedOn,
      paymentMethod: 'offering',
      reference: null,
      note: item.note ?? null,
    }));

    const nextCounselorName = upcomingAppointments.find((item) => item.counselorName)?.counselorName ?? null;
    if (nextCounselorName) {
      const counselor = staffMembers.find((item) => `${item.firstName} ${item.lastName}` === nextCounselorName) ?? null;
      if (counselor) {
        assignedCounselor = {
          staffId: counselor.id,
          firstName: counselor.firstName,
          lastName: counselor.lastName,
          role: counselor.role,
          bio: counselor.bio ?? '',
        };
      }
    }
    if (settings?.showPublicCounselorDirectory) {
      counselorDirectory = staffMembers
        .filter((item) => item.tenantId === client.tenantId)
        .filter((item) => ['counselor', 'intern'].includes(item.role))
        .map((item) => ({
          staffId: item.id,
          firstName: item.firstName,
          lastName: item.lastName,
          role: item.role,
          bio: item.bio ?? '',
          licenseType: item.licenseType ?? '',
          supervisionStatus: item.supervisionStatus ?? '',
        }));
    }
  }

  const suggestedOfferingCents = settings?.suggestedOfferingCents ?? 0;
  const totalSuggestedCents = pastSessionCount * suggestedOfferingCents;
  const outstandingCents = Math.max(totalSuggestedCents - offeringStats.totalCents, 0);

  emitAudit(request, 'portal.overview.read', 'portal', client.id);
  writeJson(response, 200, {
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
    },
    account,
    forms,
    assignedForms,
    documents,
    upcomingAppointments,
    assignedCounselor,
    settings: settings
      ? {
        practiceName: settings.practiceName,
        financialMode: settings.financialMode,
        suggestedOfferingCents: settings.suggestedOfferingCents ?? 0,
        offeringMinistryNote: settings.offeringMinistryNote ?? '',
        contactPreferenceOptions: settings.contactPreferenceOptions ?? [],
        showPublicCounselorDirectory: Boolean(settings.showPublicCounselorDirectory),
      }
      : null,
    balances: {
      total: normalizeCurrency(totalSuggestedCents),
      paid: normalizeCurrency(offeringStats.totalCents),
      outstanding: normalizeCurrency(outstandingCents),
      items: paymentHistory,
    },
    paymentHistory,
    resources,
    messageThreads,
    appointmentRequests,
    counselorDirectory,
  });
}

function buildDefaultPortalClientProfile(client, account = null, settings = null) {
  const contactPreferenceOptions = Array.isArray(settings?.contactPreferenceOptions)
    ? settings.contactPreferenceOptions.filter((value) => typeof value === 'string' && value.trim())
    : [];
  const defaultChannel = contactPreferenceOptions[0] ?? 'email';

  return {
    id: null,
    tenantId: client.tenantId,
    clientId: client.id,
    preferredName: client.firstName ?? '',
    contactEmail: account?.email ?? '',
    contactPhone: '',
    contactPreferences: {
      preferredContactMethod: defaultChannel,
      okToText: false,
      okToLeaveMessage: true,
      enabledChannels: contactPreferenceOptions.length ? contactPreferenceOptions : ['email'],
    },
    profileDetails: {
      demographics: {
        pronouns: '',
        maritalStatus: '',
      },
      education: {
        level: '',
        occupation: '',
      },
      affiliations: [],
    },
    createdAt: null,
    updatedAt: null,
  };
}

async function handlePortalProfile(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  const settings = process.env.DB_NAME
    ? await getPortalSettings(client.tenantId)
    : (portalSettingsRecords.find((item) => item.tenantId === client.tenantId) ?? buildDefaultPortalSettings(client.tenantId));

  if (request.method === 'GET') {
    let item;
    if (process.env.DB_NAME) {
      const account = await getPortalAccount(client.id, client.tenantId);
      item = await getPortalClientProfile(client.id, client.tenantId);
      item = item ?? buildDefaultPortalClientProfile(client, account, settings);
    } else {
      const account = portalAccounts.find((entry) => entry.clientId === client.id && entry.tenantId === client.tenantId) ?? null;
      item = portalClientProfiles.find((entry) => entry.clientId === client.id && entry.tenantId === client.tenantId)
        ?? buildDefaultPortalClientProfile(client, account, settings);
    }

    emitAudit(request, 'portal.profile.read', 'portal_client_profile', client.id, session);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const allowedContactMethods = Array.isArray(settings?.contactPreferenceOptions)
    ? settings.contactPreferenceOptions.filter((value) => typeof value === 'string' && value.trim())
    : ['email', 'sms', 'phone', 'portal_message'];
  const enabledChannels = Array.isArray(payload.contactPreferences?.enabledChannels)
    ? payload.contactPreferences.enabledChannels
      .map((value) => sanitizeStr(String(value), 64))
      .filter((value) => value && allowedContactMethods.includes(value))
    : [];
  const preferredContactMethod = sanitizeStr(payload.contactPreferences?.preferredContactMethod, 64);
  const profile = {
    preferredName: sanitizeStr(payload.preferredName, 120) ?? '',
    contactEmail: sanitizeStr(payload.contactEmail, 200) ?? '',
    contactPhone: sanitizeStr(payload.contactPhone, 64) ?? '',
    contactPreferences: {
      preferredContactMethod: preferredContactMethod && allowedContactMethods.includes(preferredContactMethod)
        ? preferredContactMethod
        : (allowedContactMethods[0] ?? 'email'),
      okToText: Boolean(payload.contactPreferences?.okToText),
      okToLeaveMessage: payload.contactPreferences?.okToLeaveMessage !== false,
      enabledChannels: enabledChannels.length ? enabledChannels : allowedContactMethods.slice(0, 1),
    },
    profileDetails: {
      demographics: {
        pronouns: sanitizeStr(payload.profileDetails?.demographics?.pronouns, 80) ?? '',
        maritalStatus: sanitizeStr(payload.profileDetails?.demographics?.maritalStatus, 64) ?? '',
      },
      education: {
        level: sanitizeStr(payload.profileDetails?.education?.level, 64) ?? '',
        occupation: sanitizeStr(payload.profileDetails?.education?.occupation, 120) ?? '',
      },
      affiliations: Array.isArray(payload.profileDetails?.affiliations)
        ? payload.profileDetails.affiliations
          .map((value) => sanitizeStr(String(value), 120))
          .filter(Boolean)
          .slice(0, 10)
        : [],
    },
  };

  let item;
  if (process.env.DB_NAME) {
    item = await upsertPortalClientProfile({
      id: genId('pcp'),
      tenantId: client.tenantId,
      clientId: client.id,
      ...profile,
    });
  } else {
    const existingIndex = portalClientProfiles.findIndex((entry) => entry.clientId === client.id && entry.tenantId === client.tenantId);
    const now = new Date().toISOString();
    item = {
      id: existingIndex >= 0 ? portalClientProfiles[existingIndex].id : createId('pcp', portalClientProfiles),
      tenantId: client.tenantId,
      clientId: client.id,
      ...profile,
      createdAt: existingIndex >= 0 ? portalClientProfiles[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) {
      portalClientProfiles[existingIndex] = item;
    } else {
      portalClientProfiles.push(item);
    }
  }

  telemetry.recordMutation('portal.profile.update');
  emitAudit(request, 'portal.profile.update', 'portal_client_profile', item.id, session);
  writeJson(response, 200, { item });
}

async function handlePortalAccounts(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
    if (!client) return;
    if (process.env.DB_NAME) {
      const item = await getPortalAccount(client.id, client.tenantId);
      emitAudit(request, 'portal.account.read', 'portal_account', client.id, session);
      writeJson(response, 200, { item });
      return;
    }
    const item = portalAccounts.find((account) => account.clientId === client.id && account.tenantId === client.tenantId) ?? null;
    emitAudit(request, 'portal.account.read', 'portal_account', client.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 50);

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const [clientRows] = await pool.query('SELECT id, tenant_id FROM clients WHERE id = ? AND tenant_id = ?', [clientId, tenantId]);
    if (!clientRows[0]) {
      writeJson(response, 400, { error: 'Valid clientId is required' });
      return;
    }

    if (request.method === 'POST') {
      const existing = await getPortalAccount(clientId, tenantId);
      if (existing) {
        writeJson(response, 409, { error: 'Portal account already exists for client' });
        return;
      }
      const status = normalizePortalAccountStatus(payload.status ?? 'invited');
      if (!status) {
        writeJson(response, 400, { error: 'status must be valid' });
        return;
      }
      const temporaryPassword = sanitizeStr(payload.temporaryPassword, 128) ?? generateTemporaryPassword();
      const passwordError = validatePasswordStrength(temporaryPassword);
      if (passwordError) {
        writeJson(response, 400, { error: passwordError });
        return;
      }
      const passwordHash = await argon2.hash(temporaryPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
      const item = await createPortalAccount({
        id: genId('pa'),
        clientId,
        tenantId,
        email: sanitizeStr(payload.email, 200) ?? '',
        passwordHash,
        status,
        mfaEnabled: Boolean(payload.mfaEnabled),
      });
      const assignedForms = await autoAssignStandardSignupForms({
        tenantId,
        clientId,
        assignedBy: callerIdentity(request, session)?.staffId ?? 'system',
      });
      telemetry.recordMutation('portal.account.create');
      emitAudit(request, 'portal.account.create', 'portal_account', item.id, session);
      writeJson(response, 201, { item, assignedForms, temporaryPassword });
      return;
    }

    const status = typeof payload.status === 'string' ? normalizePortalAccountStatus(payload.status) : undefined;
    if (typeof payload.status === 'string' && !status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    const temporaryPassword = typeof payload.temporaryPassword === 'string'
      ? sanitizeStr(payload.temporaryPassword, 128)
      : undefined;
    if (temporaryPassword) {
      const passwordError = validatePasswordStrength(temporaryPassword);
      if (passwordError) {
        writeJson(response, 400, { error: passwordError });
        return;
      }
    }
    const item = await updatePortalAccount(clientId, tenantId, {
      status,
      email: typeof payload.email === 'string' ? sanitizeStr(payload.email, 200) : undefined,
      passwordHash: temporaryPassword
        ? await argon2.hash(payload.temporaryPassword, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 1,
        })
        : undefined,
      mfaEnabled: payload.mfaEnabled !== undefined ? Boolean(payload.mfaEnabled) : undefined,
    });
    if (!item) {
      writeJson(response, 404, { error: 'Portal account not found' });
      return;
    }
    telemetry.recordMutation('portal.account.update');
    emitAudit(request, 'portal.account.update', 'portal_account', item.id, session);
    writeJson(response, 200, { item });
    return;
  }

  const client = clients.find((item) => item.id === clientId);
  if (!client) {
    writeJson(response, 400, { error: 'Valid clientId is required' });
    return;
  }
  if (enforceTenantScope(request, response, client.tenantId)) return;

  if (request.method === 'POST') {
    if (portalAccounts.some((item) => item.clientId === client.id && item.tenantId === client.tenantId)) {
      writeJson(response, 409, { error: 'Portal account already exists for client' });
      return;
    }

    const status = normalizePortalAccountStatus(payload.status ?? 'invited');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    const temporaryPassword = sanitizeStr(payload.temporaryPassword, 128) ?? generateTemporaryPassword();
    const item = {
      id: createId('pa', portalAccounts),
      tenantId: client.tenantId,
      clientId: client.id,
      status,
      email: sanitizeStr(payload.email, 200) ?? '',
      mfaEnabled: Boolean(payload.mfaEnabled),
      temporaryPassword,
      lastLoginAt: null,
      invitedAt: new Date().toISOString(),
    };

    portalAccounts.push(item);
    const assignedForms = await autoAssignStandardSignupForms({
      tenantId: client.tenantId,
      clientId: client.id,
      assignedBy: callerIdentity(request, session)?.staffId ?? 'system',
    });
    telemetry.recordMutation('portal.account.create');
    emitAudit(request, 'portal.account.create', 'portal_account', item.id);
    writeJson(response, 201, { item, assignedForms, temporaryPassword });
    return;
  }

  const accountId = sanitizeStr(payload.accountId, 50);
  const item = portalAccounts.find((account) => account.id === accountId);
  if (!item) {
    writeJson(response, 404, { error: 'Portal account not found' });
    return;
  }
  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (typeof payload.status === 'string') {
    const status = normalizePortalAccountStatus(payload.status);
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    item.status = status;
  }
  if (typeof payload.email === 'string') item.email = sanitizeStr(payload.email, 200) ?? item.email;
  if (payload.mfaEnabled !== undefined) item.mfaEnabled = Boolean(payload.mfaEnabled);

  telemetry.recordMutation('portal.account.update');
  emitAudit(request, 'portal.account.update', 'portal_account', item.id);
  writeJson(response, 200, { item });
}

async function handlePortalIntakePackets(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const items = intakePackets.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id);
    emitAudit(request, 'portal.intake.read', 'intake_packet', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const assignedForms = Array.isArray(payload.assignedForms)
    ? payload.assignedForms.map((entry) => sanitizeStr(String(entry), 200)).filter(Boolean)
    : [];

  if (request.method === 'POST') {
    const status = intakeStatuses.includes(payload.status) ? payload.status : 'in_progress';
    const item = {
      ...createIntakePacketRecord({
        id: createId('ip', intakePackets),
        tenantId: client.tenantId,
        clientId: client.id,
        status,
        assignedForms,
        submittedAt: status === 'completed' || status === 'reviewed' ? new Date().toISOString() : null,
      }),
    };
    intakePackets.push(item);
    telemetry.recordMutation('portal.intake.submit');
    emitAudit(request, 'portal.intake.submit', 'intake_packet', item.id);
    writeJson(response, 201, { item });
    return;
  }

  const intakePacketId = sanitizeStr(payload.intakePacketId, 50);
  const item = intakePackets.find((packet) => packet.id === intakePacketId);
  if (!item) {
    writeJson(response, 404, { error: 'Intake packet not found' });
    return;
  }
  if (enforceTenantScope(request, response, item.tenantId)) return;
  if (item.clientId !== client.id) {
    writeJson(response, 403, { error: 'Access to this resource is not permitted' });
    return;
  }

  if (typeof payload.status === 'string' && intakeStatuses.includes(payload.status)) {
    item.status = payload.status;
  }
  if (assignedForms.length) item.assignedForms = assignedForms;
  if (item.status === 'completed' || item.status === 'reviewed') {
    item.submittedAt = new Date().toISOString();
  }

  telemetry.recordMutation('portal.intake.update');
  emitAudit(request, 'portal.intake.update', 'intake_packet', item.id);
  writeJson(response, 200, { item });
}

async function handlePortalDocuments(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const assignments = await listDocumentAssignments(client.tenantId, { clientId: client.id });
      const items = await Promise.all(assignments.map(async (item) => ({
        ...item,
        templateTitle: (await getDocumentTemplateById(item.templateId, client.tenantId))?.title ?? 'Document',
      })));
      emitAudit(request, 'portal.document.read', 'document_assignment', client.id, session);
      writeJson(response, 200, { items });
      return;
    }
    const items = documentAssignments
      .filter((item) => item.tenantId === client.tenantId)
      .filter((item) => item.assigneeType === 'client' && item.assigneeId === client.id)
      .map((item) => ({
        ...item,
        templateTitle: documentTemplates.find((template) => template.id === item.templateId)?.title ?? 'Document',
      }));
    emitAudit(request, 'portal.document.read', 'document_assignment', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const assignmentId = sanitizeStr(payload.assignmentId, 50);

  if (process.env.DB_NAME) {
    const [rows] = await pool.query('SELECT * FROM document_assignments WHERE id = ? AND tenant_id = ?', [assignmentId, client.tenantId]);
    if (!rows[0]) {
      writeJson(response, 404, { error: 'Document assignment not found' });
      return;
    }
    if (rows[0].assignee_type !== 'client' || rows[0].assignee_id !== client.id) {
      writeJson(response, 403, { error: 'Access to this resource is not permitted' });
      return;
    }
    const nextStatus = normalizeDocumentAssignmentStatus(payload.status ?? 'signed');
    if (!nextStatus) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }
    const existingHistory = rows[0].access_history
      ? (typeof rows[0].access_history === 'string' ? JSON.parse(rows[0].access_history) : rows[0].access_history)
      : [];
    const accessHistory = [
      ...(Array.isArray(existingHistory) ? existingHistory : []),
      {
        action: nextStatus === 'signed' ? 'signed' : 'completed',
        at: new Date().toISOString(),
        actorRole: callerRole(request, session) || 'client',
      },
    ];
    const fields = { status: nextStatus, accessHistory };
    if (nextStatus === 'signed' || nextStatus === 'completed') fields.completedAt = new Date().toISOString();
    await updateDocumentAssignment(assignmentId, client.tenantId, fields);
    const [updated] = await pool.query('SELECT * FROM document_assignments WHERE id = ?', [assignmentId]);
    const item = {
      id: updated[0].id,
      tenantId: updated[0].tenant_id,
      templateId: updated[0].template_id,
      assigneeType: updated[0].assignee_type,
      assigneeId: updated[0].assignee_id,
      status: updated[0].status,
      completedAt: updated[0].completed_at,
      accessHistory: updated[0].access_history ? (typeof updated[0].access_history === 'string' ? JSON.parse(updated[0].access_history) : updated[0].access_history) : [],
    };
    telemetry.recordMutation('portal.document.update');
    emitAudit(request, 'portal.document.update', 'document_assignment', item.id, session);
    writeJson(response, 200, { item });
    return;
  }

  const item = documentAssignments.find((record) => record.id === assignmentId);
  if (!item) {
    writeJson(response, 404, { error: 'Document assignment not found' });
    return;
  }
  if (enforceTenantScope(request, response, item.tenantId)) return;
  if (item.assigneeType !== 'client' || item.assigneeId !== client.id) {
    writeJson(response, 403, { error: 'Access to this resource is not permitted' });
    return;
  }

  const nextStatus = normalizeDocumentAssignmentStatus(payload.status ?? 'signed');
  if (!nextStatus) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  item.status = nextStatus;
  if (nextStatus === 'signed' || nextStatus === 'completed') {
    item.completedAt = new Date().toISOString();
  }
  item.accessHistory = [
    ...(Array.isArray(item.accessHistory) ? item.accessHistory : []),
    {
      action: nextStatus === 'signed' ? 'signed' : 'completed',
      at: new Date().toISOString(),
      actorRole: callerRole(request, session) || 'client',
    },
  ];

  telemetry.recordMutation('portal.document.update');
  emitAudit(request, 'portal.document.update', 'document_assignment', item.id);
  writeJson(response, 200, { item });
}

async function getTenantRetentionPolicySnapshot(tenantId) {
  const fallback = {
    clinicalRecordsSchedule: '10_years',
    billingSchedule: '7_years',
    auditLogSchedule: 'indefinite',
    includeDocumentVersions: true,
    legalHoldEnabled: false,
  };

  if (process.env.DB_NAME) {
    const policy = await getRetentionPolicy(tenantId);
    return policy
      ? {
        clinicalRecordsSchedule: policy.clinicalRecordsSchedule,
        billingSchedule: policy.billingSchedule,
        auditLogSchedule: policy.auditLogSchedule,
        includeDocumentVersions: policy.includeDocumentVersions !== false,
        legalHoldEnabled: Boolean(policy.legalHoldEnabled),
      }
      : fallback;
  }

  const policy = retentionPolicies.find((item) => item.tenantId === tenantId) ?? null;
  return policy
    ? {
      clinicalRecordsSchedule: policy.clinicalRecordsSchedule,
      billingSchedule: policy.billingSchedule,
      auditLogSchedule: policy.auditLogSchedule,
      includeDocumentVersions: policy.includeDocumentVersions !== false,
      legalHoldEnabled: Boolean(policy.legalHoldEnabled),
    }
    : fallback;
}

async function buildClientDataRightsSummary(client) {
  const policy = await getTenantRetentionPolicySnapshot(client.tenantId);

  if (process.env.DB_NAME) {
    const [
      appointments,
      documents,
      uploads,
      formAssignments,
      formSubmissions,
      appointmentRequests,
      messageThreads,
      messages,
      resources,
      balanceItems,
    ] = await Promise.all([
      listAppointments(client.tenantId).then((items) => items.filter((item) => item.clientId === client.id)),
      listDocumentAssignments(client.tenantId, { clientId: client.id }),
      listPortalUploads(client.tenantId, client.id),
      listFormAssignments(client.tenantId, { clientId: client.id }),
      listFormSubmissions(client.tenantId, { clientId: client.id }),
      listPortalAppointmentRequests(client.tenantId, client.id),
      listPortalMessageThreads(client.tenantId, client.id),
      listPortalMessageThreads(client.tenantId, client.id).then(async (threads) => {
        const nested = await Promise.all(threads.map((thread) => listPortalMessages(thread.id, client.tenantId)));
        return nested.flat();
      }),
      listPortalResources(client.tenantId).then((items) => items.filter((item) => ['all', 'client', 'clients'].includes(item.audience ?? 'all'))),
      listInvoices(client.tenantId, client.id),
    ]);

    return {
      retentionPolicy: policy,
      counts: {
        appointments: appointments.length,
        documents: documents.length,
        uploads: uploads.length,
        formAssignments: formAssignments.length,
        formSubmissions: formSubmissions.length,
        appointmentRequests: appointmentRequests.length,
        messageThreads: messageThreads.length,
        messages: messages.length,
        resources: resources.length,
        billingItems: balanceItems.length,
      },
    };
  }

  return {
    retentionPolicy: policy,
    counts: {
      appointments: appointments.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      documents: documentAssignments.filter((item) => item.tenantId === client.tenantId && item.assigneeType === 'client' && item.assigneeId === client.id).length,
      uploads: portalUploads.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      formAssignments: formWorkflowAssignments.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      formSubmissions: formWorkflowSubmissions.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      appointmentRequests: portalAppointmentRequests.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      messageThreads: portalMessageThreads.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      messages: portalMessages.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      resources: portalResources.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
      billingItems: invoices.filter((item) => item.tenantId === client.tenantId && item.clientId === client.id).length,
    },
  };
}

async function buildClientExportBundle(client) {
  const retentionPolicy = await getTenantRetentionPolicySnapshot(client.tenantId);

  if (process.env.DB_NAME) {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? AND tenant_id = ? LIMIT 1', [client.id, client.tenantId]);
    const clientRecord = rows[0] ? dbRowToClient(rows[0]) : null;
    const [
      addresses,
      phones,
      contacts,
      insurance,
      referringProviders,
      diagnoses,
      medications,
      allergies,
      clinicalHistory,
      faithProfile,
      legal,
      portalAccount,
      portalProfile,
      appointments,
      documents,
      intakePacket,
      formAssignments,
      formSubmissions,
      uploads,
      appointmentRequests,
      threads,
      resources,
      balanceItems,
    ] = await Promise.all([
      listClientAddresses(client.id, client.tenantId),
      listClientPhones(client.id, client.tenantId),
      listClientContacts(client.id, client.tenantId),
      listClientInsurance(client.id, client.tenantId),
      listReferringProviders(client.id, client.tenantId),
      listClientDiagnoses(client.id, client.tenantId),
      listClientMedications(client.id, client.tenantId),
      listClientAllergies(client.id, client.tenantId),
      getClientClinicalHistory(client.id, client.tenantId),
      getClientFaithProfile(client.id, client.tenantId),
      getClientLegal(client.id, client.tenantId),
      getPortalAccount(client.id, client.tenantId),
      getPortalClientProfile(client.id, client.tenantId),
      listAppointments(client.tenantId).then((items) => items.filter((item) => item.clientId === client.id)),
      listDocumentAssignments(client.tenantId, { clientId: client.id }).then(async (items) => Promise.all(items.map(async (item) => ({
        ...item,
        templateTitle: (await getDocumentTemplateById(item.templateId, client.tenantId))?.title ?? 'Document',
      })))),
      getIntakePacket(client.id, client.tenantId),
      listFormAssignments(client.tenantId, { clientId: client.id }),
      listFormSubmissions(client.tenantId, { clientId: client.id }),
      listPortalUploads(client.tenantId, client.id, { includeContent: true }),
      listPortalAppointmentRequests(client.tenantId, client.id),
      listPortalMessageThreads(client.tenantId, client.id),
      listPortalResources(client.tenantId).then((items) => items.filter((item) => ['all', 'client', 'clients'].includes(item.audience ?? 'all'))),
      listInvoices(client.tenantId, client.id),
    ]);
    const messageThreads = await Promise.all(threads.map(async (thread) => ({
      ...thread,
      messages: await listPortalMessages(thread.id, client.tenantId),
    })));

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '3.5.0',
      format: 'json',
      tenantId: client.tenantId,
      client: clientRecord,
      portalAccount,
      portalProfile,
      addresses,
      phones,
      contacts,
      insurance,
      referringProviders,
      diagnoses,
      medications,
      allergies,
      clinicalHistory,
      faithProfile,
      legal,
      appointments,
      documents,
      intakePacket,
      formAssignments,
      formSubmissions,
      uploads,
      appointmentRequests,
      messageThreads,
      resources,
      balances: balanceItems,
      retentionPolicy,
    };
  }

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: '3.5.0',
    format: 'json',
    tenantId: client.tenantId,
    client: clients.find((item) => item.id === client.id && item.tenantId === client.tenantId) ?? client,
    portalAccount: portalAccounts.find((item) => item.clientId === client.id && item.tenantId === client.tenantId) ?? null,
    portalProfile: portalClientProfiles.find((item) => item.clientId === client.id && item.tenantId === client.tenantId) ?? null,
    addresses: [],
    phones: [],
    contacts: [],
    insurance: [],
    referringProviders: [],
    diagnoses: [],
    medications: [],
    allergies: [],
    clinicalHistory: null,
    faithProfile: null,
    legal: null,
    appointments: appointments.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    documents: documentAssignments
      .filter((item) => item.tenantId === client.tenantId && item.assigneeType === 'client' && item.assigneeId === client.id)
      .map((item) => ({
        ...item,
        templateTitle: documentTemplates.find((template) => template.id === item.templateId)?.title ?? 'Document',
      })),
    intakePacket: intakePackets.find((item) => item.clientId === client.id && item.tenantId === client.tenantId) ?? null,
    formAssignments: formWorkflowAssignments.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    formSubmissions: formWorkflowSubmissions.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    uploads: portalUploads.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    appointmentRequests: portalAppointmentRequests.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    messageThreads: portalMessageThreads
      .filter((item) => item.clientId === client.id && item.tenantId === client.tenantId)
      .map((thread) => ({
        ...thread,
        messages: portalMessages.filter((message) => message.threadId === thread.id),
      })),
    resources: portalResources.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    balances: invoices.filter((item) => item.clientId === client.id && item.tenantId === client.tenantId),
    retentionPolicy,
  };
}

function buildDeletedPortalEmail(clientId) {
  return `deleted+${clientId}@portal.invalid`;
}

async function fulfillPortalDeletionRequest(client, requestItem) {
  const now = new Date().toISOString();

  if (process.env.DB_NAME) {
    const account = await getPortalAccount(client.id, client.tenantId);
    if (account) {
      await updatePortalAccount(client.id, client.tenantId, {
        status: 'revoked',
        email: buildDeletedPortalEmail(client.id),
        failedAttempts: 0,
        lockedUntil: null,
      });
      await pool.query('UPDATE portal_sessions SET revoked = 1 WHERE portal_account_id = ?', [account.id]);
      await pool.query('DELETE FROM portal_password_resets WHERE portal_account_id = ?', [account.id]);
    }

    await pool.query('DELETE FROM portal_client_profiles WHERE tenant_id = ? AND client_id = ?', [client.tenantId, client.id]);
    await pool.query('DELETE FROM portal_uploads WHERE tenant_id = ? AND client_id = ?', [client.tenantId, client.id]);
    await pool.query('DELETE FROM portal_appointment_requests WHERE tenant_id = ? AND client_id = ?', [client.tenantId, client.id]);

    const [threadRows] = await pool.query(
      'SELECT id FROM portal_message_threads WHERE tenant_id = ? AND client_id = ?',
      [client.tenantId, client.id],
    );
    const threadIds = threadRows.map((row) => row.id);
    if (threadIds.length) {
      await pool.query(
        `DELETE FROM portal_messages
         WHERE tenant_id = ? AND thread_id IN (${threadIds.map(() => '?').join(', ')})`,
        [client.tenantId, ...threadIds],
      );
      await pool.query('DELETE FROM portal_message_threads WHERE tenant_id = ? AND client_id = ?', [client.tenantId, client.id]);
    }

    return updatePortalDataRightRequest(requestItem.id, client.tenantId, {
      status: 'completed',
      reasonCode: 'portal_erasure_completed',
      resolvedAt: now,
    });
  }

  const account = portalAccounts.find((item) => item.clientId === client.id && item.tenantId === client.tenantId) ?? null;
  if (account) {
    account.status = 'revoked';
    account.email = buildDeletedPortalEmail(client.id);
    account.lastLoginAt = null;
  }

  for (let index = portalClientProfiles.length - 1; index >= 0; index -= 1) {
    const item = portalClientProfiles[index];
    if (item.clientId === client.id && item.tenantId === client.tenantId) {
      portalClientProfiles.splice(index, 1);
    }
  }
  for (let index = portalUploads.length - 1; index >= 0; index -= 1) {
    const item = portalUploads[index];
    if (item.clientId === client.id && item.tenantId === client.tenantId) {
      portalUploads.splice(index, 1);
    }
  }
  for (let index = portalAppointmentRequests.length - 1; index >= 0; index -= 1) {
    const item = portalAppointmentRequests[index];
    if (item.clientId === client.id && item.tenantId === client.tenantId) {
      portalAppointmentRequests.splice(index, 1);
    }
  }
  for (let index = portalMessages.length - 1; index >= 0; index -= 1) {
    const item = portalMessages[index];
    if (item.clientId === client.id && item.tenantId === client.tenantId) {
      portalMessages.splice(index, 1);
    }
  }
  for (let index = portalMessageThreads.length - 1; index >= 0; index -= 1) {
    const item = portalMessageThreads[index];
    if (item.clientId === client.id && item.tenantId === client.tenantId) {
      portalMessageThreads.splice(index, 1);
    }
  }

  requestItem.status = 'completed';
  requestItem.reasonCode = 'portal_erasure_completed';
  requestItem.resolvedAt = now;
  requestItem.updatedAt = now;
  return requestItem;
}

async function handlePortalUploads(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const items = process.env.DB_NAME
      ? await listPortalUploads(client.tenantId, client.id)
      : portalUploads
        .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
        .map(({ contentBase64, ...item }) => item);
    emitAudit(request, 'portal.upload.read', 'portal_upload', client.id, session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const fileName = sanitizeStr(payload.fileName, 255);
  const contentBase64 = typeof payload.contentBase64 === 'string' ? payload.contentBase64.trim() : '';
  if (!fileName || !contentBase64) {
    writeJson(response, 400, { error: 'fileName and contentBase64 are required' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(contentBase64, 'base64');
  } catch {
    writeJson(response, 400, { error: 'contentBase64 must be valid base64 data' });
    return;
  }

  if (!buffer.length) {
    writeJson(response, 400, { error: 'Uploaded file cannot be empty' });
    return;
  }

  if (buffer.length > 2 * 1024 * 1024) {
    writeJson(response, 400, { error: 'Uploaded file must be 2 MB or smaller' });
    return;
  }

  const category = sanitizeStr(payload.category, 64) ?? 'supporting_document';
  const mimeType = sanitizeStr(payload.mimeType, 128) ?? 'application/octet-stream';
  const notes = sanitizeStr(payload.notes, 1000) ?? '';
  const uploadedByRole = callerRole(request, session) || 'client';

  if (process.env.DB_NAME) {
    const item = await createPortalUpload({
      id: genId('pu'),
      tenantId: client.tenantId,
      clientId: client.id,
      category,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
      notes,
      contentBase64: buffer.toString('base64'),
      uploadedByRole,
      status: 'uploaded',
    });
    telemetry.recordMutation('portal.upload.create');
    emitAudit(request, 'portal.upload.create', 'portal_upload', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('pu', portalUploads),
    tenantId: client.tenantId,
    clientId: client.id,
    category,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    notes,
    contentBase64: buffer.toString('base64'),
    uploadedByRole,
    status: 'uploaded',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  portalUploads.push(item);
  telemetry.recordMutation('portal.upload.create');
  emitAudit(request, 'portal.upload.create', 'portal_upload', item.id, session);
  writeJson(response, 201, { item: { ...item, contentBase64: undefined } });
}

async function handlePortalDataRights(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const [summary, items] = await Promise.all([
      buildClientDataRightsSummary(client),
      process.env.DB_NAME
        ? listPortalDataRightRequests(client.tenantId, client.id)
        : Promise.resolve(
          portalDataRightRequests
            .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
            .sort((left, right) => String(right.requestedAt).localeCompare(String(left.requestedAt))),
        ),
    ]);
    emitAudit(request, 'portal.data_right.read', 'portal_data_right_request', client.id, session);
    writeJson(response, 200, { items, summary });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const requestType = normalizePortalDataRightRequestType(payload.requestType);
  if (!requestType) {
    writeJson(response, 400, { error: 'requestType must be valid' });
    return;
  }

  const notes = sanitizeStr(payload.notes, 1000) ?? '';
  const retentionPolicy = await getTenantRetentionPolicySnapshot(client.tenantId);

  if (requestType === 'export_data') {
    const exportPackage = await buildClientExportBundle(client);
    const now = new Date().toISOString();

    let exportJob;
    if (process.env.DB_NAME) {
      exportJob = await createDataExportJob({
        id: genId('dex'),
        tenantId: client.tenantId,
        exportType: 'clinical_records',
        status: 'completed',
        requestedByRole: callerRole(request, session) || 'client',
        requestedAt: now,
        completedAt: now,
        format: 'json',
      });
      const item = await createPortalDataRightRequest({
        id: genId('pdr'),
        tenantId: client.tenantId,
        clientId: client.id,
        requestType,
        status: 'completed',
        deliveryFormat: 'json',
        reasonCode: 'self_service_export',
        notes,
        policySnapshot: retentionPolicy,
        requestedAt: now,
        resolvedAt: now,
      });
      telemetry.recordMutation('portal.data_right.export');
      emitAudit(request, 'portal.data_right.export', 'portal_data_right_request', item.id, session);
      writeJson(response, 201, {
        item,
        exportJob,
        fileName: `faithcounseling-${client.id}-export-${new Date(now).toISOString().slice(0, 10)}.json`,
        exportPackage,
      });
      return;
    }

    exportJob = {
      id: createId('dex', dataExportJobs),
      tenantId: client.tenantId,
      exportType: 'clinical_records',
      status: 'completed',
      requestedByRole: callerRole(request, session) || 'client',
      requestedAt: now,
      completedAt: now,
      format: 'json',
    };
    dataExportJobs.push(exportJob);
    const item = {
      id: createId('pdr', portalDataRightRequests),
      tenantId: client.tenantId,
      clientId: client.id,
      requestType,
      status: 'completed',
      deliveryFormat: 'json',
      reasonCode: 'self_service_export',
      notes,
      policySnapshot: retentionPolicy,
      requestedAt: now,
      resolvedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    portalDataRightRequests.push(item);
    telemetry.recordMutation('portal.data_right.export');
    emitAudit(request, 'portal.data_right.export', 'portal_data_right_request', item.id, session);
    writeJson(response, 201, {
      item,
      exportJob,
      fileName: `faithcounseling-${client.id}-export-${new Date(now).toISOString().slice(0, 10)}.json`,
      exportPackage,
    });
    return;
  }

  const now = new Date().toISOString();
  const status = retentionPolicy.legalHoldEnabled ? 'restricted' : 'under_review';
  const reasonCode = retentionPolicy.legalHoldEnabled ? 'legal_hold_enabled' : 'retention_review_required';
  const normalizedStatus = normalizePortalDataRightRequestStatus(status) ?? 'under_review';

  if (process.env.DB_NAME) {
    const item = await createPortalDataRightRequest({
      id: genId('pdr'),
      tenantId: client.tenantId,
      clientId: client.id,
      requestType,
      status: normalizedStatus,
      deliveryFormat: 'json',
      reasonCode,
      notes,
      policySnapshot: retentionPolicy,
      requestedAt: now,
      resolvedAt: normalizedStatus === 'restricted' ? now : null,
    });
    telemetry.recordMutation('portal.data_right.delete_request');
    emitAudit(request, 'portal.data_right.delete_request.create', 'portal_data_right_request', item.id, session);
    writeJson(response, 201, {
      item,
      notice: normalizedStatus === 'restricted'
        ? 'Deletion cannot proceed while legal hold is enabled for this tenant.'
        : 'Deletion request recorded and queued for retention/compliance review.',
    });
    return;
  }

  const item = {
    id: createId('pdr', portalDataRightRequests),
    tenantId: client.tenantId,
    clientId: client.id,
    requestType,
    status: normalizedStatus,
    deliveryFormat: 'json',
    reasonCode,
    notes,
    policySnapshot: retentionPolicy,
    requestedAt: now,
    resolvedAt: normalizedStatus === 'restricted' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  portalDataRightRequests.push(item);
  telemetry.recordMutation('portal.data_right.delete_request');
  emitAudit(request, 'portal.data_right.delete_request.create', 'portal_data_right_request', item.id, session);
  writeJson(response, 201, {
    item,
    notice: normalizedStatus === 'restricted'
      ? 'Deletion cannot proceed while legal hold is enabled for this tenant.'
      : 'Deletion request recorded and queued for retention/compliance review.',
  });
}

async function handlePortalDataRightsReview(request, response, session) {
  if (requirePracticeAdmin(request, response, session)) return;

  if (request.method === 'GET') {
    const tenantId = callerTenant(request, session);
    const items = process.env.DB_NAME
      ? await listPortalDataRightRequests(tenantId)
      : portalDataRightRequests
        .filter((item) => item.tenantId === tenantId)
        .slice()
        .sort((left, right) => String(right.requestedAt).localeCompare(String(left.requestedAt)));
    emitAudit(request, 'portal.data_right.review.read', 'portal_data_right_request', 'collection', session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const requestId = sanitizeStr(payload.requestId, 64);
  const nextStatus = normalizePortalDataRightRequestStatus(payload.status);
  const reasonCode = normalizePortalDataRightReviewReasonCode(payload.reasonCode)
    ?? (nextStatus === 'completed'
      ? 'portal_erasure_completed'
      : nextStatus === 'restricted'
        ? 'retention_obligation_remaining'
        : 'request_denied');

  if (!requestId || !nextStatus || !['completed', 'restricted', 'denied'].includes(nextStatus)) {
    writeJson(response, 400, { error: 'requestId and a valid review status are required' });
    return;
  }

  const tenantId = callerTenant(request, session);
  const notes = sanitizeStr(payload.notes, 1000) ?? '';
  const now = new Date().toISOString();

  if (process.env.DB_NAME) {
    const items = await listPortalDataRightRequests(tenantId);
    const existing = items.find((item) => item.id === requestId);
    if (!existing) {
      writeJson(response, 404, { error: 'Data-right request not found' });
      return;
    }
    if (existing.requestType !== 'delete_request') {
      writeJson(response, 400, { error: 'Only deletion requests require review actions' });
      return;
    }
    if (existing.status === 'completed' || existing.status === 'denied' || existing.status === 'restricted') {
      writeJson(response, 409, { error: 'This request has already been resolved' });
      return;
    }

    const [rows] = await pool.query(
      'SELECT id, tenant_id, first_name_enc, last_name_enc FROM clients WHERE id = ? AND tenant_id = ? LIMIT 1',
      [existing.clientId, tenantId],
    );
    const client = rows[0]
      ? {
        id: rows[0].id,
        tenantId: rows[0].tenant_id,
        firstName: decrypt(rows[0].first_name_enc),
        lastName: decrypt(rows[0].last_name_enc),
      }
      : null;
    if (!client) {
      writeJson(response, 404, { error: 'Client not found for this request' });
      return;
    }

    const item = nextStatus === 'completed'
      ? await fulfillPortalDeletionRequest(client, existing)
      : await updatePortalDataRightRequest(existing.id, tenantId, {
        status: nextStatus,
        reasonCode,
        notes: notes || existing.notes || '',
        resolvedAt: now,
      });

    telemetry.recordMutation(`portal.data_right.review.${nextStatus}`);
    emitAudit(
      request,
      nextStatus === 'completed'
        ? 'portal.data_right.delete_request.fulfill'
        : nextStatus === 'restricted'
          ? 'portal.data_right.delete_request.restrict'
          : 'portal.data_right.delete_request.deny',
      'portal_data_right_request',
      item.id,
      session,
    );
    writeJson(response, 200, { item });
    return;
  }

  const existing = portalDataRightRequests.find((item) => item.id === requestId && item.tenantId === tenantId) ?? null;
  if (!existing) {
    writeJson(response, 404, { error: 'Data-right request not found' });
    return;
  }
  if (existing.requestType !== 'delete_request') {
    writeJson(response, 400, { error: 'Only deletion requests require review actions' });
    return;
  }
  if (existing.status === 'completed' || existing.status === 'denied' || existing.status === 'restricted') {
    writeJson(response, 409, { error: 'This request has already been resolved' });
    return;
  }

  const client = clients.find((item) => item.id === existing.clientId && item.tenantId === tenantId) ?? null;
  if (!client) {
    writeJson(response, 404, { error: 'Client not found for this request' });
    return;
  }

  const item = nextStatus === 'completed'
    ? await fulfillPortalDeletionRequest(client, existing)
    : (() => {
      existing.status = nextStatus;
      existing.reasonCode = reasonCode;
      existing.notes = notes || existing.notes || '';
      existing.resolvedAt = now;
      existing.updatedAt = now;
      return existing;
    })();

  telemetry.recordMutation(`portal.data_right.review.${nextStatus}`);
  emitAudit(
    request,
    nextStatus === 'completed'
      ? 'portal.data_right.delete_request.fulfill'
      : nextStatus === 'restricted'
        ? 'portal.data_right.delete_request.restrict'
        : 'portal.data_right.delete_request.deny',
    'portal_data_right_request',
    item.id,
    session,
  );
  writeJson(response, 200, { item });
}

async function handlePortalAppointmentRequests(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const items = process.env.DB_NAME
      ? (await listPortalAppointmentRequests(client.tenantId, client.id))
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
      : portalAppointmentRequests
        .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    emitAudit(request, 'portal.appointment_request.read', 'portal_appointment_request', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  if (request.method === 'POST') {
    const preferredStartAt = normalizeIsoDate(payload.preferredStartAt);
    const preferredEndAt = normalizeIsoDate(payload.preferredEndAt);
    if (!preferredStartAt || !preferredEndAt) {
      writeJson(response, 400, { error: 'preferredStartAt and preferredEndAt must be valid ISO dates' });
      return;
    }

    const status = normalizePortalAppointmentRequestStatus(payload.status ?? 'requested');
    if (!status) {
      writeJson(response, 400, { error: 'status must be valid' });
      return;
    }

    let item;
    if (process.env.DB_NAME) {
      item = await createPortalAppointmentRequest({
        id: genId('par'),
        tenantId: client.tenantId,
        clientId: client.id,
        requestedType: sanitizeStr(payload.requestedType, 64) ?? 'session',
        preferredTimes: [{
          startAt: preferredStartAt,
          endAt: preferredEndAt,
          mode: payload.mode === 'in_person' ? 'in_person' : 'remote',
        }],
        notes: sanitizeStr(payload.notes, 500) ?? '',
        status,
        resolvedAt: null,
      });
    } else {
      item = {
        id: createId('par', portalAppointmentRequests),
        tenantId: client.tenantId,
        clientId: client.id,
        requestedType: sanitizeStr(payload.requestedType, 64) ?? 'session',
        preferredStartAt,
        preferredEndAt,
        mode: payload.mode === 'in_person' ? 'in_person' : 'remote',
        status,
        notes: sanitizeStr(payload.notes, 500) ?? '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      portalAppointmentRequests.push(item);
    }

    telemetry.recordMutation('portal.appointment_request.create');
    emitAudit(request, 'portal.appointment_request.create', 'portal_appointment_request', item.id);
    writeJson(response, 201, { item });
    return;
  }

  const requestId = sanitizeStr(payload.requestId, 50);
  const item = process.env.DB_NAME
    ? (await listPortalAppointmentRequests(client.tenantId, client.id)).find((entry) => entry.id === requestId)
    : portalAppointmentRequests.find((entry) => entry.id === requestId);
  if (!item) {
    writeJson(response, 404, { error: 'Appointment request not found' });
    return;
  }
  if (enforceTenantScope(request, response, item.tenantId)) return;
  if (item.clientId !== client.id && callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Access to this resource is not permitted' });
    return;
  }

  const status = normalizePortalAppointmentRequestStatus(payload.status);
  if (!status) {
    writeJson(response, 400, { error: 'status must be valid' });
    return;
  }

  let updatedItem = item;
  if (process.env.DB_NAME) {
    updatedItem = await updatePortalAppointmentRequest(requestId, client.tenantId, {
      status,
      notes: typeof payload.notes === 'string' ? sanitizeStr(payload.notes, 500) : undefined,
      resolvedAt: status === 'approved' || status === 'declined' || status === 'scheduled' ? new Date().toISOString() : undefined,
    });
  } else {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (typeof payload.notes === 'string') item.notes = sanitizeStr(payload.notes, 500) ?? item.notes;
    updatedItem = item;
  }

  telemetry.recordMutation('portal.appointment_request.update');
  emitAudit(request, 'portal.appointment_request.update', 'portal_appointment_request', updatedItem.id);
  writeJson(response, 200, { item: updatedItem });
}

async function handlePortalMessages(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const threadId = sanitizeStr(requestUrl.searchParams.get('threadId') ?? '', 50);
    let threads = portalMessageThreads.filter((thread) => thread.tenantId === client.tenantId && thread.clientId === client.id);
    if (threadId) {
      threads = threads.filter((thread) => thread.id === threadId);
    }
    const items = threads.map((thread) => ({
      ...thread,
      messages: portalMessages
        .filter((message) => message.threadId === thread.id)
        .sort((left, right) => left.sentAt.localeCompare(right.sentAt)),
    }));
    emitAudit(request, 'portal.message.read', 'portal_message_thread', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const body = sanitizeStr(payload.body, 2000);
  if (!body) {
    writeJson(response, 400, { error: 'body is required' });
    return;
  }

  let thread;
  const threadId = sanitizeStr(payload.threadId, 50);
  if (threadId) {
    thread = portalMessageThreads.find((item) => item.id === threadId);
    if (!thread) {
      writeJson(response, 404, { error: 'Message thread not found' });
      return;
    }
    if (enforceTenantScope(request, response, thread.tenantId)) return;
    if (thread.clientId !== client.id) {
      writeJson(response, 403, { error: 'Access to this resource is not permitted' });
      return;
    }
  } else {
    const subject = sanitizeStr(payload.subject, 200);
    if (!subject) {
      writeJson(response, 400, { error: 'subject is required when creating a new thread' });
      return;
    }
    thread = {
      id: createId('pt', portalMessageThreads),
      tenantId: client.tenantId,
      clientId: client.id,
      subject,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    portalMessageThreads.push(thread);
  }

  const senderRole = callerRole(request, session) === 'client' ? 'client' : callerRole(request, session) || 'staff';
  const message = {
    id: createId('pm', portalMessages),
    tenantId: client.tenantId,
    threadId: thread.id,
    clientId: client.id,
    senderRole,
    senderId: sanitizeStr(request.headers['x-actor-id'] || '', 120) ?? `${senderRole}-${client.id}`,
    body,
    sentAt: new Date().toISOString(),
  };

  portalMessages.push(message);
  thread.updatedAt = message.sentAt;

  telemetry.recordMutation('portal.message.create');
  emitAudit(request, 'portal.message.create', 'portal_message_thread', thread.id);
  writeJson(response, 201, { thread, message });
}

async function handlePortalResources(request, response, requestUrl, session) {
  const client = await resolvePortalClient(request, response, sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50), session);
  if (!client) return;

  if (request.method === 'GET') {
    const items = portalResources
      .filter((item) => item.tenantId === client.tenantId && item.clientId === client.id)
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
    emitAudit(request, 'portal.resource.read', 'portal_resource', client.id);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const title = sanitizeStr(payload.title, 200);
  const content = sanitizeStr(payload.content, 2000);
  if (!title || !content) {
    writeJson(response, 400, { error: 'title and content are required' });
    return;
  }

  const resourceType = normalizePortalResourceType(payload.resourceType ?? 'education');
  if (!resourceType) {
    writeJson(response, 400, { error: 'resourceType must be valid' });
    return;
  }

  const item = {
    id: createId('pr', portalResources),
    tenantId: client.tenantId,
    clientId: client.id,
    title,
    resourceType,
    content,
    publishedAt: new Date().toISOString(),
    publishedByRole: callerRole(request, session) || 'staff',
  };

  portalResources.push(item);
  telemetry.recordMutation('portal.resource.create');
  emitAudit(request, 'portal.resource.create', 'portal_resource', item.id);
  writeJson(response, 201, { item });
}

function rowToOffering(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    counselorId: row.counselor_id ?? null,
    amountCents: Number(row.amount_cents ?? 0),
    receivedOn: row.received_on,
    note: row.note ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

function summarizeOfferings(items) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;
  const sum = (entries) => entries.reduce((acc, entry) => acc + Number(entry.amountCents ?? 0), 0);
  const thisMonth = items.filter((item) => String(item.receivedOn) >= monthStart);
  const thisYear = items.filter((item) => String(item.receivedOn) >= yearStart);
  const totalCents = sum(items);
  return {
    thisMonthCents: sum(thisMonth),
    yearToDateCents: sum(thisYear),
    totalCents,
    count: items.length,
    averageCents: items.length ? Math.round(totalCents / items.length) : 0,
  };
}

async function listOfferingsForTenant(tenantId, { clientId = '' } = {}) {
  if (process.env.DB_NAME) {
    const args = [tenantId];
    let sql = 'SELECT * FROM offerings WHERE tenant_id = ?';
    if (clientId) {
      sql += ' AND client_id = ?';
      args.push(clientId);
    }
    sql += ' ORDER BY received_on DESC, created_at DESC';
    const [rows] = await pool.query(sql, args);
    return rows.map(rowToOffering);
  }

  return offeringsRecords
    .filter((item) => item.tenantId === tenantId)
    .filter((item) => !clientId || item.clientId === clientId)
    .sort((left, right) => String(right.receivedOn).localeCompare(String(left.receivedOn)));
}

async function summarizeOfferingsForTenant(tenantId, { clientId = '' } = {}) {
  const items = await listOfferingsForTenant(tenantId, { clientId });
  return summarizeOfferings(items);
}

async function createOfferingRecord(item) {
  if (process.env.DB_NAME) {
    await pool.query(
      `INSERT INTO offerings
        (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.tenantId,
        item.clientId,
        item.counselorId,
        item.amountCents,
        item.receivedOn,
        item.note,
        item.createdBy,
      ],
    );
    return item;
  }

  offeringsRecords.push(item);
  return item;
}

async function deleteOfferingRecord(tenantId, offeringId) {
  if (process.env.DB_NAME) {
    const [result] = await pool.query(
      'DELETE FROM offerings WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, offeringId],
    );
    return Number(result?.affectedRows ?? 0) > 0;
  }

  const index = offeringsRecords.findIndex((item) => item.tenantId === tenantId && item.id === offeringId);
  if (index === -1) return false;
  offeringsRecords.splice(index, 1);
  return true;
}

async function handleOfferings(request, response, requestUrl, session) {
  const tenantId = callerTenant(request, session);
  const role = callerRole(request, session);
  const offeringId = requestUrl.pathname.startsWith('/v1/offerings/')
    ? sanitizeStr(requestUrl.pathname.slice('/v1/offerings/'.length), 80)
    : '';

  if (request.method === 'GET') {
    if (offeringId) {
      writeJson(response, 405, { error: 'Method not allowed' });
      return;
    }
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'offerings.list');
    if (counselorScope === false) return;
    let clientId = sanitizeStr(requestUrl.searchParams.get('clientId') ?? '', 50);
    if (role === 'client') {
      const portalClient = await resolvePortalClient(request, response, clientId, session);
      if (!portalClient) return;
      clientId = portalClient.id;
    } else if (clientId) {
      const client = await resolveOptionalAuthorizedClient(request, response, clientId, session, 'offerings.list');
      if (!client) return;
      clientId = client.id;
    }
    let items = await listOfferingsForTenant(tenantId, { clientId });
    if (counselorScope && !clientId) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
    emitAudit(request, 'offerings.list', 'offering', tenantId, session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method === 'POST') {
    if (role === 'client') {
      writeJson(response, 403, { error: 'Insufficient permissions' });
      return;
    }
    const payload = await readJsonBody(request);
    const clientId = sanitizeStr(payload.clientId ?? '', 50);
    if (!clientId) {
      writeJson(response, 400, { error: 'clientId is required' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, clientId, session, 'offerings.record');
    if (!client) return;
    const receivedOn = sanitizeStr(payload.receivedOn ?? '', 10) || new Date().toISOString().slice(0, 10);
    const amountCents = typeof payload.amountCents === 'number' && Number.isInteger(payload.amountCents) && payload.amountCents >= 0
      ? payload.amountCents : 0;
    const item = {
      id: genId('off'),
      tenantId,
      clientId: client.id,
      counselorId: sanitizeStr(payload.counselorId ?? '', 50) || null,
      amountCents,
      receivedOn,
      note: sanitizeStr(payload.note ?? '', 500) || null,
      createdBy: callerRole(request, session) || 'staff',
      createdAt: new Date().toISOString(),
    };
    await createOfferingRecord(item);
    telemetry.recordMutation('offerings.record');
    emitAudit(request, 'offerings.record', 'offering', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  if (request.method === 'DELETE') {
    if (role === 'client') {
      writeJson(response, 403, { error: 'Insufficient permissions' });
      return;
    }
    if (!offeringId) {
      writeJson(response, 400, { error: 'offeringId is required' });
      return;
    }
    const existing = (await listOfferingsForTenant(tenantId)).find((item) => item.id === offeringId) ?? null;
    if (!existing) {
      writeJson(response, 404, { error: 'Offering not found' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, existing.clientId, session, 'offerings.delete');
    if (!client) return;
    const deleted = await deleteOfferingRecord(tenantId, offeringId);
    if (!deleted) {
      writeJson(response, 404, { error: 'Offering not found' });
      return;
    }
    telemetry.recordMutation('offerings.delete');
    emitAudit(request, 'offerings.delete', 'offering', offeringId, session);
    writeJson(response, 200, { ok: true, deletedId: offeringId });
    return;
  }

  writeJson(response, 405, { error: 'Method not allowed' });
}

async function handleOfferingsSummary(request, response, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  const tenantId = callerTenant(request, session);
  const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'offerings.summary.read');
  if (counselorScope === false) return;
  let summary;
  if (counselorScope) {
    const items = await listOfferingsForTenant(tenantId);
    summary = summarizeOfferings(items.filter((item) => counselorScope.clientIds.has(item.clientId)));
  } else {
    summary = await summarizeOfferingsForTenant(tenantId);
  }

  emitAudit(request, 'offerings.summary.read', 'offering', tenantId, session);
  writeJson(response, 200, summary);
}

// ─── Workflow recommendation state ───────────────────────────────────────────
// POST   /v1/workflows/recommendations/state      — upsert a counselor action
// GET    /v1/workflows/recommendations/state      — load states for a client
// DELETE /v1/workflows/recommendations/state/:id  — remove a state (un-defer/un-hide)

const VALID_WF_STATUSES = new Set(['pending', 'complete', 'deferred', 'hidden']);

async function handleWorkflowRecommendationState(request, response, requestUrl, session) {
  if (!session || session.role === 'client') {
    writeJson(response, session ? 403 : 401, { error: session ? 'Staff access required' : 'Authentication required' });
    return;
  }

  const tenantId = callerTenant(request, session);
  const method = request.method;

  // DELETE /v1/workflows/recommendations/state/:id
  if (method === 'DELETE') {
    const parts = requestUrl.pathname.split('/');
    const stateId = parts[parts.length - 1];
    if (!stateId || stateId === 'state') {
      writeJson(response, 400, { error: 'State id required in path' });
      return;
    }
    if (process.env.DB_NAME) {
      const [rows] = await pool.query(
        'SELECT id, client_id FROM workflow_recommendation_states WHERE id = ? AND tenant_id = ?',
        [stateId, tenantId],
      );
      if (!rows.length) {
        writeJson(response, 404, { error: 'State not found' });
        return;
      }
      const client = await resolveAuthorizedClient(request, response, rows[0].client_id, session, 'faith.workflow.state.delete');
      if (!client) return;
      await pool.query(
        'DELETE FROM workflow_recommendation_states WHERE id = ? AND tenant_id = ?',
        [stateId, tenantId],
      );
    }
    await emitAudit(request, 'faith.workflow.state.delete', 'workflow_recommendation_state', stateId, session);
    writeJson(response, 200, { deleted: stateId });
    return;
  }

  // GET /v1/workflows/recommendations/state?clientId=:id
  if (method === 'GET') {
    const clientId = requestUrl.searchParams.get('clientId');
    if (!clientId) {
      writeJson(response, 400, { error: 'clientId query parameter is required' });
      return;
    }
    const client = await resolveAuthorizedClient(request, response, clientId, session, 'faith.workflow.state.read');
    if (!client) return;
    if (process.env.DB_NAME) {
      const [rows] = await pool.query(
        `SELECT id, rule_id, status, deferred_until, actioned_at
         FROM workflow_recommendation_states
         WHERE tenant_id = ? AND client_id = ?
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY actioned_at DESC`,
        [tenantId, client.id],
      );
      const states = rows.map((row) => ({
        id: row.id,
        ruleId: row.rule_id,
        status: row.status,
        deferredUntil: row.deferred_until ?? null,
        actionedAt: row.actioned_at,
      }));
      await emitAudit(request, 'faith.workflow.state.read', 'workflow_recommendation_state', client.id, session);
      writeJson(response, 200, { states });
    } else {
      await emitAudit(request, 'faith.workflow.state.read', 'workflow_recommendation_state', client.id, session);
      writeJson(response, 200, { states: [] });
    }
    return;
  }

  // POST /v1/workflows/recommendations/state
  if (method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 64);
  const ruleId   = sanitizeStr(payload.ruleId, 128);
  const status   = sanitizeStr(payload.status, 16);
  const deferredUntil = payload.deferredUntil ? sanitizeStr(payload.deferredUntil, 16) : null;
  const notesRaw = payload.notes ? sanitizeStr(payload.notes, 2000) : null;

  if (!clientId || !ruleId) {
    writeJson(response, 400, { error: 'clientId and ruleId are required' });
    return;
  }
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'faith.workflow.state.set');
  if (!client) return;
  if (!VALID_WF_STATUSES.has(status)) {
    writeJson(response, 400, { error: `status must be one of: ${[...VALID_WF_STATUSES].join(', ')}` });
    return;
  }

  // Compute expiry: hidden → 30 days, deferred → deferredUntil date, others → null
  let expiresAt = null;
  if (status === 'hidden') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    expiresAt = d.toISOString().slice(0, 19).replace('T', ' ');
  } else if (status === 'deferred' && deferredUntil) {
    expiresAt = deferredUntil + ' 23:59:59';
  }

  const practiceId = sanitizeStr(payload.practiceId, 64) ?? tenantId;
  const notesEnc   = notesRaw ? encrypt(notesRaw) : null;

  let stateId;
  if (process.env.DB_NAME) {
    const counselorId = await resolveCallerStaffMemberId(session);
    if (!counselorId) {
      writeJson(response, 403, { error: 'Staff member record required to record workflow actions' });
      return;
    }

    // Verify the client belongs to this tenant
    const [clientRows] = await pool.query(
      'SELECT id FROM clients WHERE id = ? AND tenant_id = ?',
      [client.id, tenantId],
    );
    if (!clientRows.length) {
      writeJson(response, 404, { error: 'Client not found' });
      return;
    }

    stateId = genId('wfs');
    await pool.query(
      `INSERT INTO workflow_recommendation_states
         (id, tenant_id, practice_id, client_id, counselor_id, rule_id, status, deferred_until, notes_enc, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         counselor_id   = VALUES(counselor_id),
         status         = VALUES(status),
         deferred_until = VALUES(deferred_until),
         notes_enc      = VALUES(notes_enc),
         actioned_at    = NOW(),
         expires_at     = VALUES(expires_at)`,
      [stateId, tenantId, practiceId, client.id, counselorId, ruleId, status, deferredUntil, notesEnc, expiresAt],
    );

    // Fetch back the actual row id (upsert may have kept the original id)
    const [updated] = await pool.query(
      'SELECT id, actioned_at FROM workflow_recommendation_states WHERE tenant_id = ? AND client_id = ? AND rule_id = ?',
      [tenantId, client.id, ruleId],
    );
    stateId = updated[0]?.id ?? stateId;

    telemetry.recordMutation('workflow.state.set');
  } else {
    stateId = genId('wfs');
  }

  // Audit: never include notes (PHI)
  await emitAudit(request, 'faith.workflow.state.set', 'workflow_recommendation_state', stateId, session);

  writeJson(response, 200, {
    id: stateId,
    ruleId,
    status,
    deferredUntil: deferredUntil ?? null,
    actionedAt: new Date().toISOString(),
  });
}

async function handleFaithOverview(request, response, requestUrl) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const tenantId = callerTenant(request);
  const practiceId = sanitizeStr(requestUrl.searchParams.get('practiceId') ?? '', 50);
  const noteTemplates = christianNoteTemplates.filter((item) => item.tenantId === tenantId);
  const treatmentGoals = faithTreatmentGoalTemplates.filter((item) => item.tenantId === tenantId);
  const consentVariants = consentLanguageVariants.filter((item) => item.tenantId === tenantId);
  const resources = faithResourceLibrary.filter((item) => item.tenantId === tenantId);
  const inventories = spiritualFormationInventories.filter((item) => item.tenantId === tenantId);
  const referralCoordinations = churchReferralCoordinations.filter((item) => item.tenantId === tenantId);
  const languagePreference = (practiceId
    ? faithLanguagePreferences.find((item) => item.tenantId === tenantId && item.practiceId === practiceId)
    : faithLanguagePreferences.find((item) => item.tenantId === tenantId)) ?? null;

  emitAudit(request, 'faith.overview.read', 'faith_workflow', practiceId || tenantId);
  writeJson(response, 200, {
    noteTemplates,
    treatmentGoals,
    consentVariants,
    resources,
    inventories,
    referralCoordinations,
    languagePreference,
    summary: {
      noteTemplates: noteTemplates.length,
      treatmentGoals: treatmentGoals.length,
      consentVariants: consentVariants.length,
      resources: resources.length,
      inventories: inventories.length,
      referralCoordinations: referralCoordinations.length,
    },
  });
}

async function handleFaithNoteTemplates(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFaithNoteTemplates(callerTenant(request, session));
      await emitAudit(request, 'faith.note_template.read', 'faith_note_template', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(christianNoteTemplates, request, session) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const name = sanitizeStr(payload.name, 200);
  const focusArea = sanitizeStr(payload.focusArea, 120) ?? 'general';
  const integrationLevel = normalizeFaithIntegrationLevel(payload.integrationLevel ?? 'balanced');
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((entry) => sanitizeStr(String(entry), 220)).filter(Boolean)
    : [];

  if (!name || !integrationLevel || !sections.length) {
    writeJson(response, 400, { error: 'name, integrationLevel, and at least one section are required' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const item = await createFaithNoteTemplate({ id: genId('fnt'), tenantId, name, focusArea, integrationLevel, sections });
    telemetry.recordMutation('faith.note_template.create');
    await emitAudit(request, 'faith.note_template.create', 'faith_note_template', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('fnt', christianNoteTemplates),
    tenantId,
    name,
    focusArea,
    integrationLevel,
    sections,
    createdAt: new Date().toISOString(),
  };

  christianNoteTemplates.push(item);
  telemetry.recordMutation('faith.note_template.create');
  await emitAudit(request, 'faith.note_template.create', 'faith_note_template', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithTreatmentGoals(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFaithGoalTemplates(callerTenant(request, session));
      await emitAudit(request, 'faith.treatment_goal.read', 'faith_treatment_goal', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(faithTreatmentGoalTemplates, request, session) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const title = sanitizeStr(payload.title, 200);
  const integrationLevel = normalizeFaithIntegrationLevel(payload.integrationLevel ?? 'balanced');
  const scriptures = Array.isArray(payload.scriptures)
    ? payload.scriptures.map((entry) => sanitizeStr(String(entry), 120)).filter(Boolean)
    : [];
  const milestones = Array.isArray(payload.milestones)
    ? payload.milestones.map((entry) => sanitizeStr(String(entry), 220)).filter(Boolean)
    : [];

  if (!title || !integrationLevel || !milestones.length) {
    writeJson(response, 400, { error: 'title, integrationLevel, and at least one milestone are required' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const item = await createFaithGoalTemplate({ id: genId('ftg'), tenantId, title, integrationLevel, scriptures, milestones });
    telemetry.recordMutation('faith.treatment_goal.create');
    await emitAudit(request, 'faith.treatment_goal.create', 'faith_treatment_goal', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('ftg', faithTreatmentGoalTemplates),
    tenantId,
    title,
    integrationLevel,
    scriptures,
    milestones,
    createdAt: new Date().toISOString(),
  };

  faithTreatmentGoalTemplates.push(item);
  telemetry.recordMutation('faith.treatment_goal.create');
  await emitAudit(request, 'faith.treatment_goal.create', 'faith_treatment_goal', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithConsentVariants(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFaithConsentVariants(callerTenant(request, session));
      await emitAudit(request, 'faith.consent_variant.read', 'faith_consent_variant', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(consentLanguageVariants, request, session) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const title = sanitizeStr(payload.title, 200);
  const body = sanitizeStr(payload.body, 3000);
  const integrationLevel = normalizeFaithIntegrationLevel(payload.integrationLevel ?? 'balanced');
  const audienceRaw = sanitizeStr(payload.audience, 20) ?? 'client';
  const audience = ['client', 'staff', 'both'].includes(audienceRaw) ? audienceRaw : null;

  if (!title || !body || !integrationLevel || !audience) {
    writeJson(response, 400, { error: 'title, body, integrationLevel, and valid audience are required' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const item = await createFaithConsentVariant({ id: genId('fcv'), tenantId, title, body, audience, integrationLevel });
    telemetry.recordMutation('faith.consent_variant.create');
    await emitAudit(request, 'faith.consent_variant.create', 'faith_consent_variant', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('fcv', consentLanguageVariants),
    tenantId,
    title,
    body,
    audience,
    integrationLevel,
    createdAt: new Date().toISOString(),
  };

  consentLanguageVariants.push(item);
  telemetry.recordMutation('faith.consent_variant.create');
  await emitAudit(request, 'faith.consent_variant.create', 'faith_consent_variant', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithResources(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFaithResources(callerTenant(request, session));
      await emitAudit(request, 'faith.resource.read', 'faith_resource', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(faithResourceLibrary, request, session) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const title = sanitizeStr(payload.title, 200);
  const content = sanitizeStr(payload.content, 3000);
  const scriptureReference = sanitizeStr(payload.scriptureReference, 120) ?? '';
  const resourceType = normalizeFaithResourceType(payload.resourceType ?? 'devotional');
  if (!title || !content || !resourceType) {
    writeJson(response, 400, { error: 'title, content, and valid resourceType are required' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const item = await createFaithResource({ id: genId('frl'), tenantId, title, resourceType, content, scriptureReference });
    telemetry.recordMutation('faith.resource.create');
    await emitAudit(request, 'faith.resource.create', 'faith_resource', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('frl', faithResourceLibrary),
    tenantId,
    title,
    resourceType,
    scriptureReference,
    content,
    createdAt: new Date().toISOString(),
  };

  faithResourceLibrary.push(item);
  telemetry.recordMutation('faith.resource.create');
  await emitAudit(request, 'faith.resource.create', 'faith_resource', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithInventories(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listFaithInventories(callerTenant(request, session));
      await emitAudit(request, 'faith.inventory.read', 'faith_inventory', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(spiritualFormationInventories, request, session) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const name = sanitizeStr(payload.name, 200);
  const cadence = normalizeFaithInventoryCadence(payload.cadence ?? 'weekly');
  const prompts = Array.isArray(payload.prompts)
    ? payload.prompts.map((entry) => sanitizeStr(String(entry), 220)).filter(Boolean)
    : [];

  if (!name || !cadence || !prompts.length) {
    writeJson(response, 400, { error: 'name, cadence, and at least one prompt are required' });
    return;
  }

  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const item = await createFaithInventory({ id: genId('sfi'), tenantId, name, cadence, prompts });
    telemetry.recordMutation('faith.inventory.create');
    await emitAudit(request, 'faith.inventory.create', 'faith_inventory', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('sfi', spiritualFormationInventories),
    tenantId,
    name,
    cadence,
    prompts,
    createdAt: new Date().toISOString(),
  };

  spiritualFormationInventories.push(item);
  telemetry.recordMutation('faith.inventory.create');
  await emitAudit(request, 'faith.inventory.create', 'faith_inventory', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithReferralCoordination(request, response, session) {
  if (request.method === 'GET') {
    const counselorScope = await resolveCounselorCollectionScope(request, response, session, 'faith.referral_coordination.read');
    if (counselorScope === false) return;
    if (process.env.DB_NAME) {
      let items = await listFaithChurchReferrals(callerTenant(request, session));
      if (counselorScope) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
      await emitAudit(request, 'faith.referral_coordination.read', 'faith_referral_coordination', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    let items = filterByTenant(churchReferralCoordinations, request, session);
    if (counselorScope) items = items.filter((item) => counselorScope.clientIds.has(item.clientId));
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const payload = await readJsonBody(request);
  const clientId = sanitizeStr(payload.clientId, 50);
  const churchName = sanitizeStr(payload.churchName, 200);
  const status = normalizeFaithCoordinationStatus(payload.status ?? 'proposed');
  const client = await resolveAuthorizedClient(request, response, clientId, session, 'faith.referral_coordination.create');
  if (!client) return;

  if (process.env.DB_NAME) {
    if (!client || !churchName || !status) {
      writeJson(response, 400, { error: 'valid clientId, churchName, and status are required' });
      return;
    }
    const item = await createFaithChurchReferral({
      id: genId('crc'),
      tenantId: client.tenantId,
      clientId: client.id,
      churchName,
      contactName: sanitizeStr(payload.contactName, 160) ?? '',
      contactMethod: sanitizeStr(payload.contactMethod, 200) ?? '',
      status,
      consentToCoordinate: Boolean(payload.consentToCoordinate),
      notes: sanitizeStr(payload.notes, 600) ?? '',
    });
    telemetry.recordMutation('faith.referral_coordination.create');
    await emitAudit(request, 'faith.referral_coordination.create', 'faith_referral_coordination', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  if (!client || !churchName || !status) {
    writeJson(response, 400, { error: 'valid clientId, churchName, and status are required' });
    return;
  }

  const item = {
    id: createId('crc', churchReferralCoordinations),
    tenantId: client.tenantId,
    clientId: client.id,
    churchName,
    contactName: sanitizeStr(payload.contactName, 160) ?? '',
    contactMethod: sanitizeStr(payload.contactMethod, 200) ?? '',
    status,
    consentToCoordinate: Boolean(payload.consentToCoordinate),
    notes: sanitizeStr(payload.notes, 600) ?? '',
    updatedAt: new Date().toISOString(),
  };

  churchReferralCoordinations.push(item);
  telemetry.recordMutation('faith.referral_coordination.create');
  await emitAudit(request, 'faith.referral_coordination.create', 'faith_referral_coordination', item.id, session);
  writeJson(response, 201, { item });
}

async function handleFaithLanguagePreferences(request, response, requestUrl, session) {
  if (request.method === 'GET') {
    const practiceId = sanitizeStr(requestUrl.searchParams.get('practiceId') ?? '', 50);
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const item = await getFaithLanguagePreferences(tenantId);
      writeJson(response, 200, { item, items: item ? [item] : [] });
      return;
    }
    const items = filterByTenant(faithLanguagePreferences, request, session);
    const item = practiceId ? items.find((entry) => entry.practiceId === practiceId) ?? null : items[0] ?? null;
    writeJson(response, 200, { item, items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const practiceId = sanitizeStr(payload.practiceId, 50);

  const integrationLevel = normalizeFaithIntegrationLevel(payload.integrationLevel ?? 'balanced');
  if (!integrationLevel) {
    writeJson(response, 400, { error: 'integrationLevel must be valid' });
    return;
  }

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await upsertFaithLanguagePreferences(tenantId, {
      practiceId,
      integrationLevel,
      explicitFaithLanguage: payload.explicitFaithLanguage !== false,
      includePrayerLanguage: payload.includePrayerLanguage !== false,
      includeScriptureReferences: payload.includeScriptureReferences !== false,
      preferredTerminology: sanitizeStr(payload.preferredTerminology, 220) ?? '',
    });
    telemetry.recordMutation('faith.language_preference.upsert');
    await emitAudit(request, 'faith.language_preference.upsert', 'faith_language_preference', tenantId, session);
    writeJson(response, 200, { item });
    return;
  }

  const practice = practices.find((item) => item.id === practiceId);
  if (!practice) {
    writeJson(response, 400, { error: 'Valid practiceId is required' });
    return;
  }
  if (enforceTenantScope(request, response, practice.tenantId, session)) return;

  const existing = faithLanguagePreferences.find((item) => item.practiceId === practice.id && item.tenantId === practice.tenantId);
  const item = existing ?? {
    id: createId('flp', faithLanguagePreferences),
    tenantId: practice.tenantId,
    practiceId: practice.id,
  };

  item.integrationLevel = integrationLevel;
  item.explicitFaithLanguage = payload.explicitFaithLanguage !== false;
  item.includePrayerLanguage = payload.includePrayerLanguage !== false;
  item.includeScriptureReferences = payload.includeScriptureReferences !== false;
  item.preferredTerminology = sanitizeStr(payload.preferredTerminology, 220) ?? '';
  item.updatedAt = new Date().toISOString();

  if (!existing) faithLanguagePreferences.push(item);

  telemetry.recordMutation('faith.language_preference.upsert');
  await emitAudit(request, 'faith.language_preference.upsert', 'faith_language_preference', item.id, session);
  writeJson(response, 200, { item });
}

async function handleReportingOverview(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (callerRole(request, session) === 'client') {
    writeJson(response, 403, { error: 'Insufficient permissions' });
    return;
  }

  const daysRaw = Number(requestUrl.searchParams.get('days') ?? 30);
  const days = Number.isFinite(daysRaw) && daysRaw >= 7 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;
  const summary = buildReportingOverview(request, days);

  emitAudit(request, 'reporting.overview.read', 'reporting_overview', String(days));
  writeJson(response, 200, { summary });
}

async function handleAuditIntelligence(request, response, requestUrl, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const role = callerRole(request, session);
  const filters = buildAuditIntelligenceFilters(request, requestUrl, session);

  if (!filters) {
    writeJson(response, 400, { error: 'Invalid audit query parameters' });
    return;
  }

  const { whereSql, whereArgs, recentLimit } = filters;
  let summary;
  let events;

  if (process.env.DB_NAME) {
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM audit_events
       ${whereSql}`,
      whereArgs,
    );

    const [actionRows] = await pool.query(
      `SELECT action, COUNT(*) AS total
       FROM audit_events
       ${whereSql}
       GROUP BY action
       ORDER BY total DESC
       LIMIT 12`,
      whereArgs,
    );

    const [roleRows] = await pool.query(
      `SELECT actor_role AS actorRole, COUNT(*) AS total
       FROM audit_events
       ${whereSql}
       GROUP BY actor_role
       ORDER BY total DESC
       LIMIT 12`,
      whereArgs,
    );

    const [targetRows] = await pool.query(
      `SELECT target_type AS targetType, COUNT(*) AS total
       FROM audit_events
       ${whereSql}
       GROUP BY target_type
       ORDER BY total DESC
       LIMIT 12`,
      whereArgs,
    );

    const [resultRows] = await pool.query(
      `SELECT result, COUNT(*) AS total
       FROM audit_events
       ${whereSql}
       GROUP BY result
       ORDER BY total DESC`,
      whereArgs,
    );

    const [recentRows] = await pool.query(
      `SELECT id, tenant_id, actor_id, actor_role, actor_type, action, target_type, target_id,
              result, reason_code, occurred_at, request_id, source_surface, source_workflow, system_component
       FROM audit_events
       ${whereSql}
       ORDER BY occurred_at DESC
       LIMIT ?`,
      [...whereArgs, recentLimit],
    );

    summary = {
      window: {
        days: filters.days,
        from: filters.fromIso,
        to: new Date().toISOString(),
      },
      total: Number(totalRows?.[0]?.total ?? 0),
      byResult: resultRows.map((row) => ({ result: row.result, total: Number(row.total) })),
      byAction: actionRows.map((row) => ({ action: row.action, total: Number(row.total) })),
      byActorRole: roleRows.map((row) => ({ actorRole: row.actorRole, total: Number(row.total) })),
      byTargetType: targetRows.map((row) => ({ targetType: row.targetType, total: Number(row.total) })),
    };

    events = recentRows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      actorType: row.actor_type,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      occurredAt: new Date(row.occurred_at).toISOString(),
      requestId: row.request_id,
      result: row.result,
      reasonCode: row.reason_code,
      sourceSurface: row.source_surface,
      sourceWorkflow: row.source_workflow,
      systemComponent: row.system_component,
    }));
  } else {
    const filtered = runtimeAuditEvents
      .filter((entry) => {
        if (entry.occurredAt < filters.fromIso) return false;
        if (filters.tenantId && entry.tenantId !== filters.tenantId) return false;
        if (filters.action && entry.action !== filters.action) return false;
        if (filters.actorRole && entry.actorRole !== filters.actorRole) return false;
        if (filters.result && (entry.result ?? inferAuditResultFromAction(entry.action)) !== filters.result) return false;
        return true;
      })
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const byAction = new Map();
    const byActorRole = new Map();
    const byTargetType = new Map();
    const byResult = new Map();

    for (const entry of filtered) {
      byAction.set(entry.action, (byAction.get(entry.action) ?? 0) + 1);
      byActorRole.set(entry.actorRole, (byActorRole.get(entry.actorRole) ?? 0) + 1);
      byTargetType.set(entry.targetType, (byTargetType.get(entry.targetType) ?? 0) + 1);
      const result = entry.result ?? inferAuditResultFromAction(entry.action);
      byResult.set(result, (byResult.get(result) ?? 0) + 1);
    }

    summary = {
      window: {
        days: filters.days,
        from: filters.fromIso,
        to: new Date().toISOString(),
      },
      total: filtered.length,
      byResult: mapToTopEntries(byResult, 'result'),
      byAction: mapToTopEntries(byAction, 'action'),
      byActorRole: mapToTopEntries(byActorRole, 'actorRole'),
      byTargetType: mapToTopEntries(byTargetType, 'targetType'),
    };

    events = filtered.slice(0, recentLimit).map((entry) => ({
      ...entry,
      result: entry.result ?? inferAuditResultFromAction(entry.action),
      reasonCode: entry.reasonCode ?? inferAuditReasonCodeFromAction(entry.action),
      actorType: entry.actorType ?? inferAuditActorType(entry.actorRole, entry.actorId),
      sourceSurface: entry.sourceSurface ?? 'api',
      sourceWorkflow: entry.sourceWorkflow ?? inferAuditWorkflowFromAction(entry.action),
      systemComponent: entry.systemComponent ?? 'faith-api',
    }));
  }

  await emitAudit(request, 'audit.intelligence.read', 'audit_event', 'collection', session);

  writeJson(response, 200, {
    summary,
    events,
    filters: {
      days: filters.days,
      limit: recentLimit,
      action: filters.action,
      actorRole: filters.actorRole,
      result: filters.result,
      tenantId: role === 'platform_admin' ? filters.tenantId : callerTenant(request, session),
    },
  });
}

async function handlePlatformOverview(request, response, session) {
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const summary = buildPlatformOverview(request);
  emitAudit(request, 'platform.overview.read', 'platform_overview', callerTenant(request));
  writeJson(response, 200, { summary });
}

async function handleTenantProvisioning(request, response, session) {
  if (request.method === 'GET') {
    if (requirePlatformAdmin(request, response, session)) return;
    if (process.env.DB_NAME) {
      const items = await listTenantProvisioningRequests();
      await emitAudit(request, 'platform.tenant_provisioning.read', 'tenant_provisioning_request', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    const items = tenantProvisioningRequests
      .slice()
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    await emitAudit(request, 'platform.tenant_provisioning.read', 'tenant_provisioning_request', 'collection', session);
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePlatformAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const requestedTenantId = sanitizeStr(payload.requestedTenantId, 60);
  const requestedPracticeName = sanitizeStr(payload.requestedPracticeName, 200);
  const ownerEmail = sanitizeStr(payload.ownerEmail, 200);
  const status = normalizePlatformProvisioningStatus(payload.status ?? 'queued');

  if (!requestedTenantId || !requestedPracticeName || !ownerEmail || !status) {
    writeJson(response, 400, { error: 'requestedTenantId, requestedPracticeName, ownerEmail, and valid status are required' });
    return;
  }

  if (process.env.DB_NAME) {
    const item = await createTenantProvisioningRequest({
      id: genId('tpr'),
      tenantId: callerTenant(request, session),
      requestedTenantId,
      requestedPracticeName,
      ownerEmail,
      status,
    });
    telemetry.recordMutation('platform.tenant_provisioning.create');
    await emitAudit(request, 'platform.tenant_provisioning.create', 'tenant_provisioning_request', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('tpr', tenantProvisioningRequests),
    tenantId: callerTenant(request, session),
    requestedTenantId,
    requestedPracticeName,
    ownerEmail,
    status,
    requestedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };

  tenantProvisioningRequests.push(item);
  telemetry.recordMutation('platform.tenant_provisioning.create');
  await emitAudit(request, 'platform.tenant_provisioning.create', 'tenant_provisioning_request', item.id, session);
  writeJson(response, 201, { item });
}

async function handleSupportImpersonationSessions(request, response, session) {
  if (request.method === 'GET') {
    if (requirePlatformAdmin(request, response, session)) return;
    if (process.env.DB_NAME) {
      const items = await listImpersonationSessions();
      emitAudit(request, 'platform.impersonation.read', 'support_impersonation_session', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    const items = supportImpersonationSessions
      .slice()
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    emitAudit(request, 'platform.impersonation.read', 'support_impersonation_session', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePlatformAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);

  if (request.method === 'POST') {
    const targetTenantId = sanitizeStr(payload.targetTenantId, 60);
    const targetRole = normalizeStaffRole(payload.targetRole ?? 'practice_admin');
    const reason = sanitizeStr(payload.reason, 600);

    if (!targetTenantId || !targetRole || !reason || reason.length < 10) {
      writeJson(response, 400, { error: 'targetTenantId, targetRole, and a detailed reason are required' });
      return;
    }

    if (process.env.DB_NAME) {
      const item = await createImpersonationSession({
        id: genId('sis'),
        tenantId: callerTenant(request, session),
        targetTenantId,
        targetRole,
        requestedBy: sanitizeStr(request.headers['x-actor-id'] || '', 120) ?? 'platform-admin',
        reason,
        status: 'active',
        startedAt: new Date().toISOString(),
      });
      telemetry.recordMutation('platform.impersonation.start');
      emitAudit(request, 'platform.impersonation.start', 'support_impersonation_session', item.id, session);
      writeJson(response, 201, { item });
      return;
    }

    const item = {
      id: createId('sis', supportImpersonationSessions),
      tenantId: callerTenant(request),
      targetTenantId,
      targetRole,
      requestedBy: sanitizeStr(request.headers['x-actor-id'] || '', 120) ?? 'platform-admin',
      reason,
      status: 'active',
      startedAt: new Date().toISOString(),
      endedAt: null,
    };

    supportImpersonationSessions.push(item);
    telemetry.recordMutation('platform.impersonation.start');
    emitAudit(request, 'platform.impersonation.start', 'support_impersonation_session', item.id);
    writeJson(response, 201, { item });
    return;
  }

  const sessionId = sanitizeStr(payload.sessionId, 50);
  const status = normalizePlatformImpersonationStatus(payload.status ?? 'ended');
  if (process.env.DB_NAME) {
    const item = await endImpersonationSession(sessionId);
    if (!item) { writeJson(response, 404, { error: 'Impersonation session not found' }); return; }
    telemetry.recordMutation('platform.impersonation.end');
    emitAudit(request, 'platform.impersonation.end', 'support_impersonation_session', item.id, session);
    writeJson(response, 200, { item });
    return;
  }
  const item = supportImpersonationSessions.find((entry) => entry.id === sessionId);

  if (!item) {
    writeJson(response, 404, { error: 'Impersonation session not found' });
    return;
  }
  if (!status || status !== 'ended') {
    writeJson(response, 400, { error: 'status must be ended' });
    return;
  }

  item.status = 'ended';
  item.endedAt = new Date().toISOString();

  telemetry.recordMutation('platform.impersonation.end');
  emitAudit(request, 'platform.impersonation.end', 'support_impersonation_session', item.id);
  writeJson(response, 200, { item });
}

// Handles PATCH /v1/platform/impersonation-sessions/:id (ID in URL path)
async function handleSupportImpersonationSessionById(request, response, requestUrl, session) {
  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePlatformAdmin(request, response, session)) return;

  const sessionId = sanitizeStr(requestUrl.pathname.split('/').pop(), 50);
  if (!sessionId) {
    writeJson(response, 400, { error: 'Session ID is required' });
    return;
  }

  const payload = await readJsonBody(request);
  const status = normalizePlatformImpersonationStatus(payload.status ?? 'ended');
  if (!status || status !== 'ended') {
    writeJson(response, 400, { error: 'status must be ended' });
    return;
  }

  if (process.env.DB_NAME) {
    const item = await endImpersonationSession(sessionId);
    if (!item) { writeJson(response, 404, { error: 'Impersonation session not found' }); return; }
    telemetry.recordMutation('platform.impersonation.end');
    emitAudit(request, 'platform.impersonation.end', 'support_impersonation_session', item.id, session);
    writeJson(response, 200, { item });
    return;
  }

  const item = supportImpersonationSessions.find((entry) => entry.id === sessionId);
  if (!item) {
    writeJson(response, 404, { error: 'Impersonation session not found' });
    return;
  }

  item.status = 'ended';
  item.endedAt = new Date().toISOString();

  telemetry.recordMutation('platform.impersonation.end');
  emitAudit(request, 'platform.impersonation.end', 'support_impersonation_session', item.id, session);
  writeJson(response, 200, { item });
}

async function handleDataExportJobs(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listDataExportJobs(callerTenant(request, session));
      emitAudit(request, 'platform.data_export.read', 'data_export_job', 'collection', session);
      writeJson(response, 200, { items });
      return;
    }
    const items = filterByTenant(dataExportJobs, request)
      .slice()
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    emitAudit(request, 'platform.data_export.read', 'data_export_job', 'collection');
    writeJson(response, 200, { items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const exportType = normalizePlatformExportType(payload.exportType ?? 'clinical_records');
  const status = normalizePlatformExportStatus(payload.status ?? 'queued');
  const format = sanitizeStr(payload.format, 20) ?? 'json';

  if (!exportType || !status) {
    writeJson(response, 400, { error: 'exportType and status must be valid' });
    return;
  }

  if (process.env.DB_NAME) {
    const item = await createDataExportJob({
      id: genId('dex'),
      tenantId: callerTenant(request, session),
      exportType,
      status,
      requestedByRole: callerRole(request, session) || 'unknown',
      requestedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      format,
    });
    telemetry.recordMutation('platform.data_export.create');
    emitAudit(request, 'platform.data_export.create', 'data_export_job', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = {
    id: createId('dex', dataExportJobs),
    tenantId: callerTenant(request),
    exportType,
    status,
    requestedByRole: callerRole(request) || 'unknown',
    requestedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    format,
  };

  dataExportJobs.push(item);
  telemetry.recordMutation('platform.data_export.create');
  emitAudit(request, 'platform.data_export.create', 'data_export_job', item.id);
  writeJson(response, 201, { item });
}

async function handleRetentionPolicies(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const item = await getRetentionPolicy(callerTenant(request, session));
      emitAudit(request, 'platform.retention_policy.read', 'retention_policy', 'collection', session);
      writeJson(response, 200, { item: item ?? null, items: item ? [item] : [] });
      return;
    }
    const items = filterByTenant(retentionPolicies, request);
    writeJson(response, 200, { item: items[0] ?? null, items });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const clinicalRecordsSchedule = normalizeRetentionSchedule(payload.clinicalRecordsSchedule ?? '10_years');
  const billingSchedule = normalizeRetentionSchedule(payload.billingSchedule ?? '7_years');
  const auditLogSchedule = normalizeRetentionSchedule(payload.auditLogSchedule ?? 'indefinite');

  if (!clinicalRecordsSchedule || !billingSchedule || !auditLogSchedule) {
    writeJson(response, 400, { error: 'Retention schedules must be valid values' });
    return;
  }

  if (process.env.DB_NAME) {
    const item = await upsertRetentionPolicy(callerTenant(request, session), {
      clinicalRecordsSchedule,
      billingSchedule,
      auditLogSchedule,
      includeDocumentVersions: payload.includeDocumentVersions !== false,
      legalHoldEnabled: Boolean(payload.legalHoldEnabled),
    });
    telemetry.recordMutation('platform.retention_policy.upsert');
    emitAudit(request, 'platform.retention_policy.upsert', 'retention_policy', item.id, session);
    writeJson(response, 200, { item });
    return;
  }

  const tenantId = callerTenant(request);
  const existing = retentionPolicies.find((item) => item.tenantId === tenantId);
  const item = existing ?? {
    id: createId('rtp', retentionPolicies),
    tenantId,
  };

  item.clinicalRecordsSchedule = clinicalRecordsSchedule;
  item.billingSchedule = billingSchedule;
  item.auditLogSchedule = auditLogSchedule;
  item.includeDocumentVersions = payload.includeDocumentVersions !== false;
  item.legalHoldEnabled = Boolean(payload.legalHoldEnabled);
  item.updatedAt = new Date().toISOString();

  if (!existing) retentionPolicies.push(item);

  telemetry.recordMutation('platform.retention_policy.upsert');
  emitAudit(request, 'platform.retention_policy.upsert', 'retention_policy', item.id);
  writeJson(response, 200, { item });
}

async function handlePracticesCollection(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listPractices(callerTenant(request, session));
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(practices, request) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const name = sanitizeStr(payload.name);
  if (!name) {
    writeJson(response, 400, { error: 'name is required' });
    return;
  }

  const type = normalizePracticeType(payload.type);
  if (!type) {
    writeJson(response, 400, { error: 'type must be valid' });
    return;
  }

  if (process.env.DB_NAME) {
    const item = await createPractice({
      id: genId('p'),
      tenantId: callerTenant(request, session),
      name,
      type,
      timezone: sanitizeStr(payload.timezone, 120) ?? 'America/New_York',
      faithTradition: sanitizeStr(payload.faithTradition, 120) ?? 'Christian',
      contactEmail: sanitizeStr(payload.contactEmail, 200) ?? '',
      contactPhone: sanitizeStr(payload.contactPhone, 80) ?? '',
    });
    telemetry.recordMutation('practice.create');
    emitAudit(request, 'practice.create', 'practice', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = { ...createPracticeRecord({
    id: createId('p', practices),
    tenantId: callerTenant(request),
    name,
    type,
    timezone: sanitizeStr(payload.timezone, 120) ?? 'America/New_York',
    faithTradition: sanitizeStr(payload.faithTradition, 120) ?? 'Christian',
    contactEmail: sanitizeStr(payload.contactEmail, 200) ?? '',
    contactPhone: sanitizeStr(payload.contactPhone, 80) ?? '',
  }) };

  practices.push(item);
  telemetry.recordMutation('practice.create');
  emitAudit(request, 'practice.create', 'practice', item.id);
  writeJson(response, 201, { item });
}

async function handlePracticeById(request, response, requestUrl, session) {
  const practiceId = requestUrl.pathname.replace('/v1/practices/', '');

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await getPracticeById(practiceId, tenantId);
    if (!item) { writeJson(response, 404, { error: 'Practice not found' }); return; }

    if (request.method === 'GET') {
      emitAudit(request, 'practice.read', 'practice', item.id, session);
      writeJson(response, 200, { item });
      return;
    }
    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;
    const payload = await readJsonBody(request);
    const nextType = payload.type ? normalizePracticeType(payload.type) : item.type;
    if (payload.type && !nextType) { writeJson(response, 400, { error: 'type must be valid' }); return; }
    const updated = await updatePractice(practiceId, tenantId, {
      name: payload.name !== undefined ? sanitizeStr(payload.name) ?? item.name : undefined,
      type: nextType,
      timezone: payload.timezone !== undefined ? sanitizeStr(payload.timezone, 120) ?? item.timezone : undefined,
      faithTradition: payload.faithTradition !== undefined ? sanitizeStr(payload.faithTradition, 120) ?? item.faithTradition : undefined,
      contactEmail: payload.contactEmail !== undefined ? sanitizeStr(payload.contactEmail, 200) ?? '' : undefined,
      contactPhone: payload.contactPhone !== undefined ? sanitizeStr(payload.contactPhone, 80) ?? '' : undefined,
    });
    telemetry.recordMutation('practice.update');
    emitAudit(request, 'practice.update', 'practice', practiceId, session);
    writeJson(response, 200, { item: updated });
    return;
  }

  const item = practices.find((record) => record.id === practiceId);
  if (!item) {
    writeJson(response, 404, { error: 'Practice not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'practice.read', 'practice', item.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const nextType = payload.type ? normalizePracticeType(payload.type) : item.type;
  if (payload.type && !nextType) {
    writeJson(response, 400, { error: 'type must be valid' });
    return;
  }

  if (typeof payload.name === 'string') item.name = sanitizeStr(payload.name) ?? item.name;
  if (typeof payload.timezone === 'string') item.timezone = sanitizeStr(payload.timezone, 120) ?? item.timezone;
  if (typeof payload.faithTradition === 'string') item.faithTradition = sanitizeStr(payload.faithTradition, 120) ?? item.faithTradition;
  if (typeof payload.contactEmail === 'string') item.contactEmail = sanitizeStr(payload.contactEmail, 200) ?? '';
  if (typeof payload.contactPhone === 'string') item.contactPhone = sanitizeStr(payload.contactPhone, 80) ?? '';
  item.type = nextType;

  telemetry.recordMutation('practice.update');
  emitAudit(request, 'practice.update', 'practice', item.id);
  writeJson(response, 200, { item });
}

async function handleLocationsCollection(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const items = await listLocations(callerTenant(request, session));
      writeJson(response, 200, { items });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(locations, request) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const name = sanitizeStr(payload.name);
  if (!name) {
    writeJson(response, 400, { error: 'name is required' });
    return;
  }

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await createLocation({
      id: genId('l'),
      tenantId,
      practiceId: sanitizeStr(payload.practiceId, 50) || `p-001`,
      name,
      address: sanitizeStr(payload.address, 240) ?? '',
      capacity: Number.isFinite(Number(payload.capacity)) ? Number(payload.capacity) : 1,
      remoteEnabled: Boolean(payload.remoteEnabled),
    });
    telemetry.recordMutation('location.create');
    emitAudit(request, 'location.create', 'location', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  const item = { ...createLocationRecord({
    id: createId('l', locations),
    tenantId: callerTenant(request),
    practiceId: sanitizeStr(payload.practiceId, 50) || practices[0]?.id || 'p-001',
    name,
    address: sanitizeStr(payload.address, 240) ?? '',
    capacity: Number.isFinite(Number(payload.capacity)) ? Number(payload.capacity) : 1,
    remoteEnabled: Boolean(payload.remoteEnabled),
  }) };

  locations.push(item);
  telemetry.recordMutation('location.create');
  emitAudit(request, 'location.create', 'location', item.id);
  writeJson(response, 201, { item });
}

async function handleLocationById(request, response, requestUrl, session) {
  const locationId = requestUrl.pathname.replace('/v1/locations/', '');

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await getLocationById(locationId, tenantId);
    if (!item) { writeJson(response, 404, { error: 'Location not found' }); return; }

    if (request.method === 'GET') {
      emitAudit(request, 'location.read', 'location', item.id, session);
      writeJson(response, 200, { item });
      return;
    }
    if (request.method === 'DELETE') {
      if (requirePracticeAdmin(request, response, session)) return;
      await deleteLocation(locationId, tenantId);
      telemetry.recordMutation('location.delete');
      emitAudit(request, 'location.delete', 'location', locationId, session);
      writeJson(response, 200, { deleted: true, id: locationId });
      return;
    }
    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;
    const payload = await readJsonBody(request);
    if (payload.capacity !== undefined) {
      const capacity = Number(payload.capacity);
      if (!Number.isFinite(capacity) || capacity < 1 || capacity > 1000) {
        writeJson(response, 400, { error: 'capacity must be between 1 and 1000' }); return;
      }
    }
    const updated = await updateLocation(locationId, tenantId, {
      name: payload.name !== undefined ? sanitizeStr(payload.name) ?? item.name : undefined,
      address: payload.address !== undefined ? sanitizeStr(payload.address, 240) ?? '' : undefined,
      capacity: payload.capacity !== undefined ? Number(payload.capacity) : undefined,
      remoteEnabled: payload.remoteEnabled !== undefined ? Boolean(payload.remoteEnabled) : undefined,
    });
    telemetry.recordMutation('location.update');
    emitAudit(request, 'location.update', 'location', item.id, session);
    writeJson(response, 200, { item: updated });
    return;
  }

  const item = locations.find((record) => record.id === locationId);
  if (!item) {
    writeJson(response, 404, { error: 'Location not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'location.read', 'location', item.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method === 'DELETE') {
    if (requirePracticeAdmin(request, response, session)) return;
    const index = locations.findIndex((record) => record.id === locationId);
    locations.splice(index, 1);
    telemetry.recordMutation('location.delete');
    emitAudit(request, 'location.delete', 'location', locationId);
    writeJson(response, 200, { deleted: true, id: locationId });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  if (typeof payload.name === 'string') item.name = sanitizeStr(payload.name) ?? item.name;
  if (typeof payload.address === 'string') item.address = sanitizeStr(payload.address, 240) ?? '';
  if (payload.capacity !== undefined) {
    const capacity = Number(payload.capacity);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 1000) {
      writeJson(response, 400, { error: 'capacity must be between 1 and 1000' });
      return;
    }
    item.capacity = capacity;
  }
  if (typeof payload.remoteEnabled === 'boolean') item.remoteEnabled = payload.remoteEnabled;

  telemetry.recordMutation('location.update');
  emitAudit(request, 'location.update', 'location', item.id);
  writeJson(response, 200, { item });
}

async function handleStaffCollection(request, response, session) {
  if (request.method === 'GET') {
    if (process.env.DB_NAME) {
      const tenantId = callerTenant(request, session);
      const items = await listStaff(tenantId);
      const [accountRows] = await pool.query(
        `SELECT staff_member_id, email, email_enc, failed_attempts, locked_until, mfa_enabled, last_login_at
         FROM staff_accounts
         WHERE tenant_id = ?`,
        [tenantId],
      );
      const accountsByStaffId = new Map(accountRows.map((row) => [row.staff_member_id, row]));

      const enrichedItems = items.map((item) => {
        const account = accountsByStaffId.get(item.id);
        const lockedUntil = account?.locked_until ? new Date(account.locked_until) : null;
        return {
          ...item,
          email: account?.email_enc ? decrypt(account.email_enc) : (account?.email ?? null),
          hasAccount: Boolean(account),
          accountLocked: Boolean(lockedUntil && lockedUntil.getTime() > Date.now()),
          mfaEnabled: Boolean(account?.mfa_enabled),
          lastLoginAt: account?.last_login_at ?? null,
        };
      });

      writeJson(response, 200, { items: enrichedItems });
      return;
    }
    writeJson(response, 200, { items: filterByTenant(staffMembers, request) });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const firstName = sanitizeStr(payload.firstName);
  const lastName = sanitizeStr(payload.lastName);
  const role = normalizeStaffRole(payload.role);
  const licenseType = normalizeLicenseType(payload.licenseType ?? 'pastoral_counselor');
  const supervisionStatus = normalizeSupervisionStatus(payload.supervisionStatus ?? 'not_required');
  if (!firstName || !lastName) {
    writeJson(response, 400, { error: 'firstName and lastName are required' });
    return;
  }
  if (!role) {
    writeJson(response, 400, { error: 'role must be valid' });
    return;
  }
  if (!licenseType) {
    writeJson(response, 400, { error: 'licenseType must be valid' });
    return;
  }
  if (!supervisionStatus) {
    writeJson(response, 400, { error: 'supervisionStatus must be valid' });
    return;
  }

  const locationIds = Array.isArray(payload.locationIds)
    ? payload.locationIds.map((value) => sanitizeStr(String(value), 50)).filter(Boolean)
    : [];

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await createStaff({
      id: genId('s'),
      tenantId,
      firstName,
      lastName,
      role,
      licenseType,
      licenseNumber: sanitizeStr(payload.licenseNumber, 80) ?? '',
      supervisionStatus,
      supervisingStaffId: sanitizeStr(payload.supervisingStaffId, 50),
      locationIds,
      bio: sanitizeStr(payload.bio, 500) ?? '',
    });

    const email = sanitizeStr(payload.email, 320)?.toLowerCase();
    const initialPassword = sanitizeStr(payload.initialPassword, 128);
    let accountProvisioning = null;

    if (email) {
      const temporaryPassword = initialPassword || generateTemporaryPassword();
      const account = await createStaffAccount({
        staffMemberId: item.id,
        tenantId,
        email,
        password: temporaryPassword,
      });
      accountProvisioning = {
        email: account.email,
        temporaryPassword: initialPassword ? null : temporaryPassword,
      };
    }

    telemetry.recordMutation('staff.create');
    emitAudit(request, 'staff.create', 'staff', item.id, session);
    if (accountProvisioning) {
      await emitAudit(request, 'staff.account.create', 'staff_account', item.id, session);
    }
    writeJson(response, 201, { item, accountProvisioning });
    return;
  }

  const item = { ...createStaffRecord({
    id: createId('s', staffMembers),
    tenantId: callerTenant(request),
    firstName,
    lastName,
    role,
    licenseType,
    licenseNumber: sanitizeStr(payload.licenseNumber, 80) ?? '',
    supervisionStatus,
    supervisingStaffId: sanitizeStr(payload.supervisingStaffId, 50),
    locationIds,
    bio: sanitizeStr(payload.bio, 500) ?? '',
  }) };

  staffMembers.push(item);
  telemetry.recordMutation('staff.create');
  emitAudit(request, 'staff.create', 'staff', item.id);
  writeJson(response, 201, { item });
}

async function handleStaffById(request, response, requestUrl, session) {
  const staffId = requestUrl.pathname.replace('/v1/staff/', '');

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const item = await getStaffById(staffId, tenantId);
    if (!item) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      emitAudit(request, 'staff.read', 'staff', item.id, session);
      writeJson(response, 200, { item });
      return;
    }
    if (request.method !== 'PATCH') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;
    const payload = await readJsonBody(request);
    const priorFullName = `${item.firstName} ${item.lastName}`.trim();
    const fields = {};
    if (typeof payload.firstName === 'string') fields.firstName = sanitizeStr(payload.firstName) ?? item.firstName;
    if (typeof payload.lastName === 'string') fields.lastName = sanitizeStr(payload.lastName) ?? item.lastName;
    if (typeof payload.role === 'string') {
      const role = normalizeStaffRole(payload.role);
      if (!role) { writeJson(response, 400, { error: 'role must be valid' }); return; }
      fields.role = role;
    }
    if (typeof payload.licenseType === 'string') {
      const licenseType = normalizeLicenseType(payload.licenseType);
      if (!licenseType) { writeJson(response, 400, { error: 'licenseType must be valid' }); return; }
      fields.licenseType = licenseType;
    }
    if (typeof payload.supervisionStatus === 'string') {
      const supervisionStatus = normalizeSupervisionStatus(payload.supervisionStatus);
      if (!supervisionStatus) { writeJson(response, 400, { error: 'supervisionStatus must be valid' }); return; }
      fields.supervisionStatus = supervisionStatus;
    }
    if (typeof payload.licenseNumber === 'string') fields.licenseNumber = sanitizeStr(payload.licenseNumber, 80) ?? '';
    if (typeof payload.supervisingStaffId === 'string') fields.supervisingStaffId = sanitizeStr(payload.supervisingStaffId, 50);
    if (typeof payload.bio === 'string') fields.bio = sanitizeStr(payload.bio, 500) ?? '';
    if (Array.isArray(payload.locationIds)) fields.locationIds = payload.locationIds.map((v) => sanitizeStr(String(v), 50)).filter(Boolean);
    const updated = await updateStaff(staffId, tenantId, fields);
    const updatedFullName = `${updated.firstName} ${updated.lastName}`.trim();
    if (priorFullName && updatedFullName && priorFullName !== updatedFullName) {
      await syncCounselorNameAcrossAppointments({
        tenantId,
        staffId,
        priorFullName,
        updatedFullName,
      });
    }
    telemetry.recordMutation('staff.update');
    emitAudit(request, 'staff.update', 'staff', staffId, session);
    writeJson(response, 200, { item: updated });
    return;
  }

  const item = staffMembers.find((record) => record.id === staffId);
  if (!item) {
    writeJson(response, 404, { error: 'Staff not found' });
    return;
  }

  if (enforceTenantScope(request, response, item.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'staff.read', 'staff', item.id);
    writeJson(response, 200, { item });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const priorFullName = `${item.firstName} ${item.lastName}`.trim();
  if (typeof payload.firstName === 'string') item.firstName = sanitizeStr(payload.firstName) ?? item.firstName;
  if (typeof payload.lastName === 'string') item.lastName = sanitizeStr(payload.lastName) ?? item.lastName;
  if (typeof payload.role === 'string') {
    const role = normalizeStaffRole(payload.role);
    if (!role) {
      writeJson(response, 400, { error: 'role must be valid' });
      return;
    }
    item.role = role;
  }
  if (typeof payload.licenseType === 'string') {
    const licenseType = normalizeLicenseType(payload.licenseType);
    if (!licenseType) {
      writeJson(response, 400, { error: 'licenseType must be valid' });
      return;
    }
    item.licenseType = licenseType;
  }
  if (typeof payload.supervisionStatus === 'string') {
    const supervisionStatus = normalizeSupervisionStatus(payload.supervisionStatus);
    if (!supervisionStatus) {
      writeJson(response, 400, { error: 'supervisionStatus must be valid' });
      return;
    }
    item.supervisionStatus = supervisionStatus;
  }

  if (typeof payload.licenseNumber === 'string') item.licenseNumber = sanitizeStr(payload.licenseNumber, 80) ?? '';
  if (typeof payload.supervisingStaffId === 'string') item.supervisingStaffId = sanitizeStr(payload.supervisingStaffId, 50);
  if (typeof payload.bio === 'string') item.bio = sanitizeStr(payload.bio, 500) ?? '';
  if (Array.isArray(payload.locationIds)) {
    item.locationIds = payload.locationIds.map((value) => sanitizeStr(String(value), 50)).filter(Boolean);
  }
  const updatedFullName = `${item.firstName} ${item.lastName}`.trim();
  if (priorFullName && updatedFullName && priorFullName !== updatedFullName) {
    appointments.forEach((appointment) => {
      if (appointment.tenantId !== item.tenantId) return;
      if (appointment.counselorId === staffId || appointment.counselorName === priorFullName) {
        appointment.counselorId = staffId;
        appointment.counselorName = updatedFullName;
      }
    });
  }

  telemetry.recordMutation('staff.update');
  emitAudit(request, 'staff.update', 'staff', item.id);
  writeJson(response, 200, { item });
}

async function syncCounselorNameAcrossAppointments({ tenantId, staffId, priorFullName, updatedFullName }) {
  const [rows] = await pool.query(
    `SELECT id, counselor_id, counselor_name_enc
       FROM appointments
      WHERE tenant_id = ?
        AND (counselor_id = ? OR counselor_name_enc IS NOT NULL)`,
    [tenantId, staffId],
  );

  const updates = rows
    .filter((row) => {
      const storedName = row.counselor_name_enc ? decrypt(row.counselor_name_enc) : '';
      return row.counselor_id === staffId || storedName === priorFullName;
    })
    .map((row) => pool.query(
      'UPDATE appointments SET counselor_id = ?, counselor_name_enc = ? WHERE id = ? AND tenant_id = ?',
      [staffId, encrypt(updatedFullName), row.id, tenantId],
    ));

  if (updates.length) {
    await Promise.all(updates);
  }
}

async function handleStaffAvailability(request, response, requestUrl, session) {
  const staffId = requestUrl.pathname.replace('/v1/staff/', '').replace('/availability', '');

  if (process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      emitAudit(request, 'staff.availability.read', 'staff', staffId, session);
      const templates = await listAvailabilityTemplates(staffId, tenantId);
      writeJson(response, 200, { staffId, template: templates });
      return;
    }
    if (request.method !== 'POST') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;
    const payload = await readJsonBody(request);
    const template = Array.isArray(payload.template) ? payload.template : [];
    const normalizedTemplate = template
      .map((entry) => ({ day: sanitizeStr(entry.day, 20)?.toLowerCase(), start: sanitizeStr(entry.start, 10), end: sanitizeStr(entry.end, 10) }))
      .filter((entry) => entry.day && entry.start && entry.end);
    await upsertAvailabilityTemplate(staffId, tenantId, normalizedTemplate);
    telemetry.recordMutation('staff.availability.save');
    emitAudit(request, 'staff.availability.update', 'staff', staffId, session);
    writeJson(response, 200, { staffId, template: normalizedTemplate });
    return;
  }

  const staff = staffMembers.find((record) => record.id === staffId);
  if (!staff) {
    writeJson(response, 404, { error: 'Staff not found' });
    return;
  }

  if (enforceTenantScope(request, response, staff.tenantId)) return;

  if (request.method === 'GET') {
    emitAudit(request, 'staff.availability.read', 'staff', staffId);
    writeJson(response, 200, { staffId, template: availabilityTemplates[staffId] ?? [] });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;

  const payload = await readJsonBody(request);
  const template = Array.isArray(payload.template) ? payload.template : [];
  const normalizedTemplate = template
    .map((entry) => ({
      day: sanitizeStr(entry.day, 20)?.toLowerCase(),
      start: sanitizeStr(entry.start, 10),
      end: sanitizeStr(entry.end, 10),
    }))
    .filter((entry) => entry.day && entry.start && entry.end);

  availabilityTemplates[staffId] = normalizedTemplate;
  telemetry.recordMutation('staff.availability.save');
  emitAudit(request, 'staff.availability.update', 'staff', staffId);
  writeJson(response, 200, { staffId, template: normalizedTemplate });
}

async function handleStaffAccountActions(request, response, requestUrl, session) {
  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (requirePracticeAdmin(request, response, session)) return;
  if (!process.env.DB_NAME) {
    writeJson(response, 501, { error: 'Account actions require DB mode' });
    return;
  }

  const staffId = requestUrl.pathname.replace('/v1/staff/', '').replace('/account-actions', '');
  const tenantId = callerTenant(request, session);
  const staff = await getStaffById(staffId, tenantId);
  if (!staff) {
    writeJson(response, 404, { error: 'Staff not found' });
    return;
  }

  const payload = await readJsonBody(request);
  const action = sanitizeStr(payload.action, 64)?.toLowerCase();

  if (action === 'reset_password') {
    const providedPassword = sanitizeStr(payload.newPassword, 128);
    const generatedPassword = providedPassword || generateTemporaryPassword();
    await adminResetStaffPassword({ tenantId, staffMemberId: staffId, newPassword: generatedPassword });
    telemetry.recordMutation('staff.account.reset_password');
    await emitAudit(request, 'staff.password_reset', 'staff_account', staffId, session);
    writeJson(response, 200, {
      ok: true,
      generatedTemporaryPassword: providedPassword ? null : generatedPassword,
    });
    return;
  }

  if (action === 'unlock') {
    await adminUnlockStaffAccount({ tenantId, staffMemberId: staffId });
    telemetry.recordMutation('staff.account.unlock');
    await emitAudit(request, 'staff.account_unlock', 'staff_account', staffId, session);
    writeJson(response, 200, { ok: true });
    return;
  }

  if (action === 'deactivate') {
    await adminDeactivateStaffAccount({ tenantId, staffMemberId: staffId });
    telemetry.recordMutation('staff.account.deactivate');
    await emitAudit(request, 'staff.account_deactivate', 'staff_account', staffId, session);
    writeJson(response, 200, { ok: true });
    return;
  }

  writeJson(response, 400, { error: 'action must be one of reset_password, unlock, deactivate' });
}

// ─── Counselor profiling sub-resource helpers ─────────────────────────────────

/**
 * Resolves the caller's staff_member_id from their session's staff_account_id.
 * Returns null if the account is not found or session is missing.
 */
async function resolveCallerStaffMemberId(session) {
  if (!session?.staff_account_id) return null;
  const [rows] = await pool.query(
    'SELECT staff_member_id FROM staff_accounts WHERE id = ? AND tenant_id = ?',
    [session.staff_account_id, session.tenant_id],
  );
  return rows[0]?.staff_member_id ?? null;
}

function isAdminRole(role) {
  return role === 'platform_admin' || role === 'practice_owner' || role === 'practice_admin';
}

// ─── /v1/staff/:id/licenses ───────────────────────────────────────────────────

async function handleStaffLicenses(request, response, requestUrl, session) {
  const parts = requestUrl.pathname.split('/');
  const staffId = parts[3];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      const callerMemberId = await resolveCallerStaffMemberId(session);
      const admin = isAdminRole(callerRole(request, session));
      if (!admin && callerMemberId !== staffId) {
        writeJson(response, 403, { error: 'Access denied' }); return;
      }
      const items = await listStaffLicenses(staffId, tenantId);
      await emitAudit(request, 'staff.licenses.list', 'staff_license', staffId, session);
      writeJson(response, 200, { items });
      return;
    }

    if (request.method !== 'POST') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;

    const payload = await readJsonBody(request);
    const licenseType = sanitizeStr(payload.licenseType, 64);
    if (!licenseType) { writeJson(response, 400, { error: 'licenseType is required' }); return; }

    const item = await createStaffLicense({
      id: crypto.randomUUID(), staffId, tenantId,
      licenseType,
      licenseNumber:  sanitizeStr(payload.licenseNumber, 80) ?? null,
      issuingState:   sanitizeStr(payload.issuingState, 64) ?? null,
      issuingBody:    sanitizeStr(payload.issuingBody, 255) ?? null,
      issueDate:      payload.issueDate ?? null,
      expiryDate:     payload.expiryDate ?? null,
      status:         sanitizeStr(payload.status, 32) ?? 'active',
      isPrimary:      payload.isPrimary ? 1 : 0,
    });
    await emitAudit(request, 'staff.license.create', 'staff_license', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

async function handleStaffLicenseById(request, response, requestUrl, session) {
  const parts = requestUrl.pathname.split('/');
  const staffId   = parts[3];
  const licenseId = parts[5];
  const tenantId  = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      const callerMemberId = await resolveCallerStaffMemberId(session);
      const admin = isAdminRole(callerRole(request, session));
      if (!admin && callerMemberId !== staffId) {
        writeJson(response, 403, { error: 'Access denied' }); return;
      }
      const item = await getStaffLicenseById(licenseId, staffId, tenantId);
      if (!item) { writeJson(response, 404, { error: 'License not found' }); return; }
      writeJson(response, 200, { item });
      return;
    }

    if (requirePracticeAdmin(request, response, session)) return;

    if (request.method === 'PATCH') {
      const payload = await readJsonBody(request);
      const fields = {};
      if (payload.licenseType  !== undefined) fields.licenseType  = sanitizeStr(payload.licenseType, 64);
      if (payload.licenseNumber !== undefined) fields.licenseNumber = sanitizeStr(payload.licenseNumber, 80);
      if (payload.issuingState  !== undefined) fields.issuingState  = sanitizeStr(payload.issuingState, 64);
      if (payload.issuingBody   !== undefined) fields.issuingBody   = sanitizeStr(payload.issuingBody, 255);
      if (payload.issueDate     !== undefined) fields.issueDate  = payload.issueDate;
      if (payload.expiryDate    !== undefined) fields.expiryDate = payload.expiryDate;
      if (payload.status        !== undefined) fields.status     = sanitizeStr(payload.status, 32);
      if (payload.isPrimary     !== undefined) fields.isPrimary  = payload.isPrimary;
      const item = await updateStaffLicense(licenseId, staffId, tenantId, fields);
      await emitAudit(request, 'staff.license.update', 'staff_license', licenseId, session);
      writeJson(response, 200, { item });
      return;
    }

    if (request.method === 'DELETE') {
      await deleteStaffLicense(licenseId, staffId, tenantId);
      await emitAudit(request, 'staff.license.delete', 'staff_license', licenseId, session);
      writeJson(response, 200, { deleted: true });
      return;
    }

    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

// ─── /v1/staff/:id/certifications ────────────────────────────────────────────

async function handleStaffCertifications(request, response, requestUrl, session) {
  const parts = requestUrl.pathname.split('/');
  const staffId  = parts[3];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      const callerMemberId = await resolveCallerStaffMemberId(session);
      const admin = isAdminRole(callerRole(request, session));
      if (!admin && callerMemberId !== staffId) {
        writeJson(response, 403, { error: 'Access denied' }); return;
      }
      const items = await listStaffCertifications(staffId, tenantId);
      await emitAudit(request, 'staff.certifications.list', 'staff_certification', staffId, session);
      writeJson(response, 200, { items });
      return;
    }

    if (request.method !== 'POST') { writeJson(response, 405, { error: 'Method not allowed' }); return; }
    if (requirePracticeAdmin(request, response, session)) return;

    const payload = await readJsonBody(request);
    const certName = sanitizeStr(payload.certName, 255);
    if (!certName) { writeJson(response, 400, { error: 'certName is required' }); return; }

    const item = await createStaffCertification({
      id: crypto.randomUUID(), staffId, tenantId,
      certName,
      issuingBody:  sanitizeStr(payload.issuingBody, 255) ?? null,
      issueDate:    payload.issueDate  ?? null,
      expiryDate:   payload.expiryDate ?? null,
      certNumber:   sanitizeStr(payload.certNumber, 80) ?? null,
      ceuHours:     payload.ceuHours != null ? Number(payload.ceuHours) : null,
      isCeu:        payload.isCeu ? 1 : 0,
      notes:        sanitizeStr(payload.notes, 1000) ?? null,
    });
    await emitAudit(request, 'staff.certification.create', 'staff_certification', item.id, session);
    writeJson(response, 201, { item });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

async function handleStaffCertificationById(request, response, requestUrl, session) {
  const parts  = requestUrl.pathname.split('/');
  const staffId  = parts[3];
  const certId   = parts[5];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (request.method === 'GET') {
      const callerMemberId = await resolveCallerStaffMemberId(session);
      const admin = isAdminRole(callerRole(request, session));
      if (!admin && callerMemberId !== staffId) {
        writeJson(response, 403, { error: 'Access denied' }); return;
      }
      const item = await getStaffCertificationById(certId, staffId, tenantId);
      if (!item) { writeJson(response, 404, { error: 'Certification not found' }); return; }
      writeJson(response, 200, { item });
      return;
    }

    if (requirePracticeAdmin(request, response, session)) return;

    if (request.method === 'PATCH') {
      const payload = await readJsonBody(request);
      const fields = {};
      if (payload.certName    !== undefined) fields.certName    = sanitizeStr(payload.certName, 255);
      if (payload.issuingBody !== undefined) fields.issuingBody = sanitizeStr(payload.issuingBody, 255);
      if (payload.issueDate   !== undefined) fields.issueDate   = payload.issueDate;
      if (payload.expiryDate  !== undefined) fields.expiryDate  = payload.expiryDate;
      if (payload.certNumber  !== undefined) fields.certNumber  = sanitizeStr(payload.certNumber, 80);
      if (payload.ceuHours    !== undefined) fields.ceuHours    = payload.ceuHours != null ? Number(payload.ceuHours) : null;
      if (payload.isCeu       !== undefined) fields.isCeu       = payload.isCeu;
      if (payload.notes       !== undefined) fields.notes       = sanitizeStr(payload.notes, 1000);
      const item = await updateStaffCertification(certId, staffId, tenantId, fields);
      await emitAudit(request, 'staff.certification.update', 'staff_certification', certId, session);
      writeJson(response, 200, { item });
      return;
    }

    if (request.method === 'DELETE') {
      await deleteStaffCertification(certId, staffId, tenantId);
      await emitAudit(request, 'staff.certification.delete', 'staff_certification', certId, session);
      writeJson(response, 200, { deleted: true });
      return;
    }

    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

// ─── /v1/staff/:id/specialty-profile ─────────────────────────────────────────

async function handleStaffSpecialtyProfile(request, response, requestUrl, session) {
  const parts    = requestUrl.pathname.split('/');
  const staffId  = parts[3];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    const callerMemberId = await resolveCallerStaffMemberId(session);
    const admin = isAdminRole(callerRole(request, session));
    const isSelf = callerMemberId === staffId;

    if (request.method === 'GET') {
      if (!admin && !isSelf) { writeJson(response, 403, { error: 'Access denied' }); return; }
      const item = await getStaffSpecialtyProfile(staffId, tenantId);
      await emitAudit(request, 'staff.specialty_profile.read', 'staff_specialty_profile', staffId, session);
      writeJson(response, 200, { item: item ?? {} });
      return;
    }

    if (request.method === 'PUT') {
      if (!admin && !isSelf) { writeJson(response, 403, { error: 'Access denied' }); return; }
      const payload = await readJsonBody(request);
      const item = await upsertStaffSpecialtyProfile({
        id:              crypto.randomUUID(),
        staffId,
        tenantId,
        specialties:     Array.isArray(payload.specialties)     ? payload.specialties     : [],
        modalities:      Array.isArray(payload.modalities)      ? payload.modalities      : [],
        ageGroupsServed: Array.isArray(payload.ageGroupsServed) ? payload.ageGroupsServed : [],
        languages:       Array.isArray(payload.languages)       ? payload.languages       : [],
        maxCaseload:     payload.maxCaseload != null ? Number(payload.maxCaseload) : null,
        notes:           sanitizeStr(payload.notes, 2000) ?? null,
      });
      await emitAudit(request, 'staff.specialty_profile.update', 'staff_specialty_profile', staffId, session);
      writeJson(response, 200, { item });
      return;
    }

    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

// ─── /v1/staff/:id/employment ─────────────────────────────────────────────────

async function handleStaffEmployment(request, response, requestUrl, session) {
  const parts    = requestUrl.pathname.split('/');
  const staffId  = parts[3];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    if (!isAdminRole(callerRole(request, session))) {
      writeJson(response, 403, { error: 'Access denied' }); return;
    }

    if (request.method === 'GET') {
      const item = await getStaffEmployment(staffId, tenantId);
      await emitAudit(request, 'staff.employment.read', 'staff_employment', staffId, session);
      writeJson(response, 200, { item: item ?? {} });
      return;
    }

    if (request.method === 'PUT') {
      const payload = await readJsonBody(request);
      const item = await upsertStaffEmployment({
        id:                 crypto.randomUUID(),
        staffId,
        tenantId,
        employmentType:     sanitizeStr(payload.employmentType, 32)    ?? 'full_time',
        employmentStatus:   sanitizeStr(payload.employmentStatus, 32)  ?? 'active',
        hireDate:           payload.hireDate         ?? null,
        terminationDate:    payload.terminationDate  ?? null,
        npiNumber:          sanitizeStr(payload.npiNumber, 20)         ?? null,
        malpracticeInsurer: sanitizeStr(payload.malpracticeInsurer, 255) ?? null,
        malpracticePolicy:  sanitizeStr(payload.malpracticePolicy, 80) ?? null,
        malpracticeExpiry:  payload.malpracticeExpiry ?? null,
        directPhone:        sanitizeStr(payload.directPhone, 30)       ?? null,
        locationIds:        Array.isArray(payload.locationIds)         ? payload.locationIds : [],
      });
      await emitAudit(request, 'staff.employment.update', 'staff_employment', staffId, session);
      writeJson(response, 200, { item });
      return;
    }

    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

// ─── /v1/staff/:id/faith-profile ─────────────────────────────────────────────

async function handleStaffFaithProfile(request, response, requestUrl, session) {
  const parts    = requestUrl.pathname.split('/');
  const staffId  = parts[3];
  const tenantId = callerTenant(request, session);

  if (process.env.DB_NAME) {
    const staff = await getStaffById(staffId, tenantId);
    if (!staff) { writeJson(response, 404, { error: 'Staff not found' }); return; }

    const callerMemberId = await resolveCallerStaffMemberId(session);
    const admin = isAdminRole(callerRole(request, session));
    const isSelf = callerMemberId === staffId;

    if (request.method === 'GET') {
      if (!admin && !isSelf) { writeJson(response, 403, { error: 'Access denied' }); return; }
      const item = await getStaffFaithProfile(staffId, tenantId);
      await emitAudit(request, 'staff.faith_profile.read', 'staff_faith_profile', staffId, session);
      writeJson(response, 200, { item: item ?? {} });
      return;
    }

    if (request.method === 'PUT') {
      if (!admin && !isSelf) { writeJson(response, 403, { error: 'Access denied' }); return; }
      const payload = await readJsonBody(request);
      const item = await upsertStaffFaithProfile({
        id:                    crypto.randomUUID(),
        staffId,
        tenantId,
        faithTradition:        sanitizeStr(payload.faithTradition, 128)          ?? null,
        theologicalApproach:   sanitizeStr(payload.theologicalApproach, 3000)    ?? null,
        ordained:              Boolean(payload.ordained),
        ordainingBody:         sanitizeStr(payload.ordainingBody, 255)           ?? null,
        aaccMember:            Boolean(payload.aaccMember),
        acbcCertified:         Boolean(payload.acbcCertified),
        cccaMember:            Boolean(payload.cccaMember),
        otherFaithCredentials: sanitizeStr(payload.otherFaithCredentials, 2000)  ?? null,
        prayerIntegration:     sanitizeStr(payload.prayerIntegration, 32)        ?? null,
        scriptureIntegration:  sanitizeStr(payload.scriptureIntegration, 32)     ?? null,
        spiritualGifts:        sanitizeStr(payload.spiritualGifts, 2000)         ?? null,
      });
      await emitAudit(request, 'staff.faith_profile.update', 'staff_faith_profile', staffId, session);
      writeJson(response, 200, { item });
      return;
    }

    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  writeJson(response, 503, { error: 'Database not configured' });
}

async function handleLocales(request, response) {
  if (request.method === 'GET') {
    writeJson(response, 200, { items: i18nStore.listLocales() });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const locale = (payload.locale ?? '').trim().toLowerCase();
  const label = (payload.label ?? '').trim();
  if (!locale) {
    writeJson(response, 400, { error: 'locale is required' });
    return;
  }

  const catalog = await i18nStore.ensureLocale(locale, label);
  telemetry.recordMutation('i18n.locale.create');
  writeJson(response, 201, catalog);
}

async function handleCatalogByLocale(request, response, requestUrl) {
  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const locale = requestUrl.pathname.replace('/v1/i18n/catalog/', '');
  const payload = await readJsonBody(request);
  const catalog = await i18nStore.saveCatalog(locale, payload.messages ?? {});
  telemetry.recordMutation('i18n.catalog.save');
  writeJson(response, 200, catalog);
}

async function handleAutoTranslate(request, response) {
  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const locale = (payload.locale ?? '').trim().toLowerCase();
  if (!locale) {
    writeJson(response, 400, { error: 'locale is required' });
    return;
  }

  const catalog = await i18nStore.autoTranslate(locale, translateMessages);
  telemetry.recordMutation('i18n.catalog.auto_translate');
  writeJson(response, 200, catalog);
}

async function handleTranslationSettingsByLocale(request, response, requestUrl) {
  const locale = requestUrl.pathname.replace('/v1/i18n/settings/', '').trim().toLowerCase();
  if (!locale) {
    writeJson(response, 400, { error: 'locale is required' });
    return;
  }

  if (request.method === 'GET') {
    writeJson(response, 200, {
      locale,
      settings: i18nStore.getSettings(locale),
    });
    return;
  }

  if (request.method !== 'PATCH') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const settings = await i18nStore.saveSettings(locale, payload.settings ?? {});
  telemetry.recordMutation('i18n.settings.save');
  writeJson(response, 200, {
    locale,
    settings,
  });
}

async function handleFrontendVitals(request, response, session = null) {
  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  if (!payload.name || typeof payload.value !== 'number') {
    writeJson(response, 400, { error: 'name and value are required' });
    return;
  }

  if (featureFlags.tenantTelemetry && !payload.tenantId && session) {
    const identity = callerIdentity(request, session);
    const tenantId = normalizeTenantId(identity.tenantId);
    if (tenantId) {
      payload.tenantId = tenantId;
    }
  }

  telemetry.recordBrowserVital(payload);
  writeJson(response, 202, { accepted: true });
}

async function handleFrontendTelemetryEvents(request, response, session = null) {
  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await readJsonBody(request);
  const events = Array.isArray(payload?.events)
    ? payload.events
    : payload && typeof payload === 'object'
      ? [payload]
      : [];

  if (!events.length) {
    writeJson(response, 400, { error: 'events payload is required' });
    return;
  }

  let accepted = 0;
  let dropped = 0;

  for (const event of events.slice(0, 100)) {
    if (!event || typeof event !== 'object') {
      dropped += 1;
      continue;
    }

    if (featureFlags.tenantTelemetry && !event.tenantId && session) {
      const identity = callerIdentity(request, session);
      const tenantId = normalizeTenantId(identity.tenantId);
      if (tenantId) {
        event.tenantId = tenantId;
      }
    }

    if (telemetry.recordFrontendEvent(event)) {
      accepted += 1;
    } else {
      dropped += 1;
    }
  }

  writeJson(response, 202, {
    accepted: true,
    count: accepted,
    dropped,
  });
}

function atToday(hours, minutes) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return date.toISOString();
}

function createId(prefix, collection) {
  const maxNumeric = collection.reduce((max, item) => {
    const numeric = Number(item.id.replace(`${prefix}-`, ''));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);
  return `${prefix}-${String(maxNumeric + 1).padStart(3, '0')}`;
}

// Generates a unique ID for DB inserts using timestamp + random suffix.
// Use this instead of genId('prefix') on all DB paths.
function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeTenantId(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return candidate ? candidate : null;
}

function normalizeRequestId(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  return candidate.slice(0, 120);
}

function classifyRequestStatus(statusCode) {
  if (statusCode >= 500) return 'server_error';
  if (statusCode >= 400) return 'client_error';
  return 'success';
}

function buildRequestLogContext(request, route, requestId, session = null) {
  const identity = callerIdentity(request, session);
  return {
    requestId,
    method: request.method ?? 'GET',
    route,
    tenantId: normalizeTenantId(identity.tenantId) ?? 'system',
    actorRole: identity.role || 'anonymous',
    authenticated: Boolean(session),
  };
}

function logRequestFailure({ error, request, route, requestId, requestStartedAt, statusCode, session }) {
  const log = statusCode >= 500 ? logError : logWarn;
  log('request.failed', {
    ...buildRequestLogContext(request, route, requestId, session),
    statusCode,
    outcome: classifyRequestStatus(statusCode),
    durationMs: Date.now() - requestStartedAt,
    error: serializeError(error),
  });
}

function logRequestCompletion({
  request,
  response,
  route,
  requestId,
  requestStartedAt,
  session,
  skipServerErrorCompletionLog = false,
}) {
  const statusCode = response.statusCode || 200;
  const durationMs = Date.now() - requestStartedAt;
  const outcome = classifyRequestStatus(statusCode);
  const isSlowRequest = durationMs >= 1500;
  const context = {
    ...buildRequestLogContext(request, route, requestId, session),
    statusCode,
    outcome,
    durationMs,
  };

  if (statusCode >= 500) {
    if (!skipServerErrorCompletionLog) {
      logError('request.complete', context);
    }
    return;
  }

  if (statusCode >= 400) {
    logWarn('request.complete', context);
    return;
  }

  if (isSlowRequest) {
    logWarn('request.slow', context);
    return;
  }

  if (process.env.API_LOG_ALL_REQUESTS === '1') {
    logInfo('request.complete', context);
  }
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeTimezone(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return null;
  }
}

function normalizeClientStatus(value) {
  return clientStatuses.includes(value) ? value : null;
}

function normalizeAppointmentStatus(value) {
  const normalized = value === 'canceled' ? 'cancelled' : value;
  return appointmentStatuses.includes(normalized) ? normalized : null;
}

function normalizeAppointmentType(value) {
  return appointmentTypes.includes(value) ? value : null;
}

function normalizeConsentType(value) {
  return consentTypes.includes(value) ? value : null;
}

function normalizeConsentState(value) {
  return consentStates.includes(value) ? value : null;
}

function normalizeIntakeStatus(value) {
  return intakeStatuses.includes(value) ? value : null;
}

function normalizeCaseStatus(value) {
  return caseStatuses.includes(value) ? value : null;
}

function normalizeTreatmentPlanStatus(value) {
  return treatmentPlanStatuses.includes(value) ? value : null;
}

function buildAuditIntelligenceFilters(request, requestUrl, session) {
  const daysRaw = Number(requestUrl.searchParams.get('days') ?? 7);
  const days = Number.isFinite(daysRaw) && daysRaw >= 1 && daysRaw <= 90 ? Math.floor(daysRaw) : null;
  if (!days) return null;

  const limitRaw = Number(requestUrl.searchParams.get('limit') ?? 50);
  const recentLimit = Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 200 ? Math.floor(limitRaw) : 50;

  const action = sanitizeAuditFilterValue(requestUrl.searchParams.get('action'), 128);
  const actorRole = sanitizeAuditFilterValue(requestUrl.searchParams.get('actorRole'), 64);
  const result = normalizeAuditResult(requestUrl.searchParams.get('result'));
  if (requestUrl.searchParams.has('result') && !result) return null;

  const role = callerRole(request, session);
  const requestedTenantId = sanitizeAuditFilterValue(requestUrl.searchParams.get('tenantId'), 64);
  const tenantId = role === 'platform_admin' ? requestedTenantId : callerTenant(request, session);
  const fromIso = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

  const where = ['occurred_at >= ?'];
  const whereArgs = [new Date(fromIso)];

  if (tenantId) {
    where.push('tenant_id = ?');
    whereArgs.push(tenantId);
  }

  if (action) {
    where.push('action = ?');
    whereArgs.push(action);
  }

  if (actorRole) {
    where.push('actor_role = ?');
    whereArgs.push(actorRole);
  }

  if (result) {
    where.push('result = ?');
    whereArgs.push(result);
  }

  return {
    days,
    fromIso,
    action,
    actorRole,
    result,
    tenantId,
    recentLimit,
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    whereArgs,
  };
}

function sanitizeAuditFilterValue(raw, maxLen) {
  const value = sanitizeStr(raw ?? '', maxLen);
  if (!value) return null;
  return value.toLowerCase();
}

function normalizeAuditResult(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === 'success' || value === 'denied' || value === 'error') return value;
  return null;
}

function inferAuditResultFromAction(action) {
  const normalized = String(action ?? '').toLowerCase();
  if (normalized.includes('.denied')) return 'denied';
  if (normalized.includes('.failed') || normalized.includes('.error')) return 'error';
  return 'success';
}

function inferAuditReasonCodeFromAction(action) {
  const normalized = String(action ?? '').toLowerCase();
  if (normalized.includes('.denied')) return 'rbac_denied';
  if (normalized.includes('.failed')) return 'operation_failed';
  if (normalized.includes('.error')) return 'operation_error';
  return 'ok';
}

function inferAuditActorType(actorRole, actorId) {
  if (actorRole === 'client') return 'user';
  if (actorRole === 'unknown' || actorId === 'anonymous') return 'anonymous';
  if (String(actorId ?? '').startsWith('system') || String(actorRole ?? '').startsWith('system')) return 'system';
  return 'user';
}

function inferAuditWorkflowFromAction(action) {
  const [domain = 'request', resource = 'activity'] = String(action ?? '').toLowerCase().split('.');
  return `${domain}.${resource}`;
}

function deriveAuditMetadata(request, action, session = null) {
  const tenantId = session?.tenant_id ?? (request.headers['x-tenant-id'] || 'system').trim();
  const actorRole = session?.role ?? (request.headers['x-staff-role'] || 'unknown').trim();
  const actorId = session?.staff_account_id ?? (request.headers['x-actor-id'] || 'anonymous').trim();
  const requestId = request.requestId || (request.headers['x-request-id'] || '').trim();
  return {
    tenantId,
    actorRole,
    actorId,
    actorType: inferAuditActorType(actorRole, actorId),
    requestId: requestId || undefined,
    result: inferAuditResultFromAction(action),
    reasonCode: inferAuditReasonCodeFromAction(action),
    sourceSurface: request.route ?? 'api',
    sourceWorkflow: inferAuditWorkflowFromAction(action),
    systemComponent: 'faith-api',
  };
}

function mapToTopEntries(counter, keyName) {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([key, total]) => ({ [keyName]: key, total }));
}

function normalizeProgressNoteType(value) {
  return progressNoteTypes.includes(value) ? value : null;
}

function normalizeDocumentTemplateType(value) {
  return documentTemplateTypes.includes(value) ? value : null;
}

function normalizeDocumentAudienceType(value) {
  return documentAudienceTypes.includes(value) ? value : null;
}

function normalizeDocumentAssignmentStatus(value) {
  return documentAssignmentStatuses.includes(value) ? value : null;
}

function normalizeInventoryCategory(value) {
  return inventoryCategories.includes(value) ? value : null;
}

function normalizeInventoryScoringMethod(value) {
  return inventoryScoringMethods.includes(value) ? value : null;
}

function normalizeInventoryAssignmentStatus(value) {
  return inventoryAssignmentStatuses.includes(value) ? value : null;
}

function normalizePracticeType(value) {
  return practiceTypes.includes(value) ? value : null;
}

function normalizeLicenseType(value) {
  return licenseTypes.includes(value) ? value : null;
}

function normalizeSupervisionStatus(value) {
  return supervisionStatuses.includes(value) ? value : null;
}

function normalizeStaffRole(value) {
  return staffRoles.includes(value) ? value : null;
}

function normalizeReminderStatus(value) {
  return reminderStatuses.includes(value) ? value : null;
}

function normalizeServiceCodeStatus(value) {
  return serviceCodeStatuses.includes(value) ? value : null;
}

function normalizeInvoiceStatus(value) {
  return invoiceStatuses.includes(value) ? value : null;
}

function normalizePaymentMethod(value) {
  return paymentMethods.includes(value) ? value : null;
}

function normalizeClaimStatus(value) {
  return claimStatuses.includes(value) ? value : null;
}

function normalizePortalAccountStatus(value) {
  return portalAccountStatuses.includes(value) ? value : null;
}

function normalizePortalMessageThreadStatus(value) {
  return portalMessageThreadStatuses.includes(value) ? value : null;
}

function normalizePortalAppointmentRequestStatus(value) {
  return portalAppointmentRequestStatuses.includes(value) ? value : null;
}

function normalizeFormAssignmentType(value) {
  return formAssignmentTypes.includes(value) ? value : null;
}

function normalizeFormAssignmentWorkflowStatus(value) {
  return formAssignmentWorkflowStatuses.includes(value) ? value : null;
}

function normalizePortalRegistrationStatus(value) {
  return portalRegistrationStatuses.includes(value) ? value : null;
}

function normalizePortalRequestType(value) {
  return portalRequestTypes.includes(value) ? value : null;
}

function normalizePortalRegistrationMode(value) {
  return portalRegistrationModes.includes(value) ? value : null;
}

function normalizePortalFinancialMode(value) {
  return portalFinancialModes.includes(value) ? value : null;
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
}

function normalizePortalContactPreferenceOptions(value) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value
    .map((entry) => sanitizeStr(String(entry), 64))
    .filter((entry) => portalContactPreferenceOptions.includes(entry)))];
}

function buildDefaultPortalSettings(tenantId = 'system') {
  return {
    id: `ps-${tenantId}`,
    tenantId,
    practiceName: 'FaithCounseling',
    logoUrl: '',
    brandColor: '#1f7a8c',
    accentColor: '#f0f7f8',
    welcomeHeadline: 'FaithCounseling Client Portal',
    welcomeMessage: 'Current clients can sign in to their account. New or possible clients can request care, request scheduling, or start an account request for intake onboarding.',
    helpMessage: 'If you need help accessing the portal, contact your counselor or the practice front desk.',
    supportEmail: '',
    registrationMode: 'review_required',
    allowCreateAccount: true,
    allowCareRequests: true,
    allowSchedulingRequests: true,
    showPublicCounselorDirectory: false,
    financialMode: 'offerings',
    suggestedOfferingCents: 12000,
    offeringMinistryNote: 'Your gift helps sustain this counseling ministry and expand care for others.',
    contactPreferenceOptions: [...portalContactPreferenceOptions],
    defaultSignupFormKeys: [],
    createdAt: null,
    updatedAt: null,
  };
}

function getPublicPortalTenantId(request, session) {
  if (session) return callerTenant(request, session);
  return normalizeTenantId(process.env.PUBLIC_PORTAL_TENANT_ID) ?? 'system';
}

async function ensurePortalSettings(tenantId) {
  if (!tenantId) return buildDefaultPortalSettings('system');
  if (process.env.DB_NAME) {
    return (await getPortalSettings(tenantId)) ?? buildDefaultPortalSettings(tenantId);
  }
  return portalSettingsRecords.find((item) => item.tenantId === tenantId) ?? buildDefaultPortalSettings(tenantId);
}

function toPortalPublicConfig(settings) {
  return {
    practiceName: settings.practiceName,
    logoUrl: settings.logoUrl,
    brandColor: settings.brandColor,
    accentColor: settings.accentColor,
    welcomeHeadline: settings.welcomeHeadline,
    welcomeMessage: settings.welcomeMessage,
    helpMessage: settings.helpMessage,
    supportEmail: settings.supportEmail,
    registrationMode: settings.registrationMode,
    allowCreateAccount: settings.allowCreateAccount,
    allowCareRequests: settings.allowCareRequests,
    allowSchedulingRequests: settings.allowSchedulingRequests,
    showPublicCounselorDirectory: settings.showPublicCounselorDirectory,
    financialMode: settings.financialMode,
    suggestedOfferingCents: settings.suggestedOfferingCents ?? 0,
    offeringMinistryNote: settings.offeringMinistryNote ?? '',
    contactPreferenceOptions: settings.contactPreferenceOptions,
  };
}

function summarizePortalRegistrationMode(mode) {
  if (mode === 'instant_activation') {
    return 'Eligible create-account requests can be activated immediately with a temporary portal password.';
  }
  if (mode === 'invite_only') {
    return 'Portal account creation is invite-only. The practice will review your request before access is granted.';
  }
  return 'Create-account requests are reviewed by the practice before portal access is activated.';
}

function normalizePortalOnboardingDetails(payload = {}) {
  return {
    preferredName: sanitizeStr(payload.preferredName, 120) ?? '',
    pronouns: sanitizeStr(payload.pronouns, 80) ?? '',
    educationLevel: sanitizeStr(payload.educationLevel, 64) ?? '',
    affiliations: Array.isArray(payload.affiliations)
      ? payload.affiliations.map((item) => sanitizeStr(String(item), 120)).filter(Boolean).slice(0, 10)
      : [],
    referralSource: sanitizeStr(payload.referralSource, 120) ?? '',
    faithPreference: sanitizeStr(payload.faithPreference, 120) ?? '',
    schedulingFocus: sanitizeStr(payload.schedulingFocus, 160) ?? '',
    consentToContact: payload.consentToContact === true,
  };
}

function normalizePortalEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

async function buildPublicCounselorDirectoryPreview(tenantId, settings) {
  if (!settings?.showPublicCounselorDirectory) return [];
  if (process.env.DB_NAME) {
    const staff = await listStaff(tenantId);
    return staff
      .filter((item) => ['counselor', 'intern'].includes(item.role))
      .slice(0, 6)
      .map((item) => ({
        staffId: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        role: item.role,
        bio: item.bio ?? '',
        licenseType: item.licenseType ?? '',
        supervisionStatus: item.supervisionStatus ?? '',
      }));
  }

  return staffMembers
    .filter((item) => item.tenantId === tenantId)
    .filter((item) => ['counselor', 'intern'].includes(item.role))
    .slice(0, 6)
    .map((item) => ({
      staffId: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      role: item.role,
      bio: item.bio ?? '',
      licenseType: item.licenseType ?? '',
      supervisionStatus: item.supervisionStatus ?? '',
    }));
}

async function buildPublicPortalConfig(tenantId, settings) {
  const catalog = await ensureFormCatalogSeeded(tenantId);
  const configuredKeys = Array.isArray(settings?.defaultSignupFormKeys) ? settings.defaultSignupFormKeys : [];
  const configuredSet = new Set(configuredKeys);
  const defaultSignupForms = (catalog || [])
    .filter((item) => item.isActive !== false)
    .filter((item) => (configuredSet.size ? configuredSet.has(item.formKey) : item.isStandardOnSignup))
    .map((item) => ({
      formKey: item.formKey,
      title: item.title,
      category: item.category,
    }));
  const directoryPreview = await buildPublicCounselorDirectoryPreview(tenantId, settings);
  return {
    ...toPortalPublicConfig(settings),
    registrationSummary: summarizePortalRegistrationMode(settings?.registrationMode),
    defaultSignupForms,
    directoryPreview,
  };
}

function buildDefaultCatalogRows(tenantId) {
  return DEFAULT_FORM_CATALOG.map((entry, idx) => ({
    id: `fc-${tenantId}-${String(idx + 1).padStart(3, '0')}`,
    tenantId,
    formKey: entry.formKey,
    title: entry.title,
    category: entry.category,
    isStandardOnSignup: Boolean(entry.isStandardOnSignup),
    isActive: true,
    versionNumber: 1,
  }));
}

async function ensureFormCatalogSeeded(tenantId) {
  if (!tenantId) return [];
  if (process.env.DB_NAME) {
    const existing = await listFormCatalog(tenantId, { includeInactive: true });
    if (existing.length) return existing;
    const defaults = buildDefaultCatalogRows(tenantId);
    for (const row of defaults) {
      await createFormCatalogItem(row);
    }
    return listFormCatalog(tenantId, { includeInactive: true });
  }

  const existing = formCatalogRecords.filter((item) => item.tenantId === tenantId);
  if (existing.length) return existing;
  const defaults = buildDefaultCatalogRows(tenantId);
  formCatalogRecords.push(...defaults.map((item) => ({
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })));
  return formCatalogRecords.filter((item) => item.tenantId === tenantId);
}

async function autoAssignStandardSignupForms({ tenantId, clientId, assignedBy }) {
  if (!tenantId || !clientId) return [];
  const catalog = await ensureFormCatalogSeeded(tenantId);
  const settings = await ensurePortalSettings(tenantId);
  const configuredKeys = Array.isArray(settings?.defaultSignupFormKeys) ? settings.defaultSignupFormKeys : [];
  const configuredSet = new Set(configuredKeys);
  const defaults = (catalog || []).filter((item) => {
    if (item.isActive === false) return false;
    if (configuredSet.size > 0) return configuredSet.has(item.formKey);
    return item.isStandardOnSignup;
  });
  if (!defaults.length) return [];

  if (process.env.DB_NAME) {
    const created = [];
    for (const item of defaults) {
      await createFormAssignment({
        id: genId('fa'),
        tenantId,
        clientId,
        formKey: item.formKey,
        formTitle: item.title,
        assignmentType: 'account_signup',
        scheduledFor: null,
        recurrenceRule: null,
        status: 'assigned',
        assignedBy: assignedBy ?? 'system',
        notes: 'Automatically assigned at portal account creation.',
        dueAt: null,
      });
      created.push(item.formKey);
    }
    return created;
  }

  const now = new Date().toISOString();
  for (const item of defaults) {
    formWorkflowAssignments.push({
      id: createId('fa', formWorkflowAssignments),
      tenantId,
      clientId,
      formKey: item.formKey,
      formTitle: item.title,
      assignmentType: 'account_signup',
      scheduledFor: null,
      recurrenceRule: null,
      status: 'assigned',
      assignedBy: assignedBy ?? 'system',
      notes: 'Automatically assigned at portal account creation.',
      dueAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return defaults.map((item) => item.formKey);
}

function normalizePortalResourceType(value) {
  return portalResourceTypes.includes(value) ? value : null;
}

function normalizePortalUploadStatus(value) {
  return portalUploadStatuses.includes(value) ? value : null;
}

function normalizePortalDataRightRequestType(value) {
  return portalDataRightRequestTypes.includes(value) ? value : null;
}

function normalizePortalDataRightRequestStatus(value) {
  return portalDataRightRequestStatuses.includes(value) ? value : null;
}

function normalizePortalDataRightReviewReasonCode(value) {
  return portalDataRightReviewReasonCodes.includes(value) ? value : null;
}

function normalizeFaithIntegrationLevel(value) {
  return faithIntegrationLevels.includes(value) ? value : null;
}

function normalizeFaithResourceType(value) {
  return faithResourceTypes.includes(value) ? value : null;
}

function normalizeFaithCoordinationStatus(value) {
  return faithCoordinationStatuses.includes(value) ? value : null;
}

function normalizeFaithInventoryCadence(value) {
  return faithInventoryCadences.includes(value) ? value : null;
}

function normalizePlatformProvisioningStatus(value) {
  return platformProvisioningStatuses.includes(value) ? value : null;
}

function normalizePlatformImpersonationStatus(value) {
  return platformImpersonationStatuses.includes(value) ? value : null;
}

function normalizePlatformExportType(value) {
  return platformExportTypes.includes(value) ? value : null;
}

function normalizePlatformExportStatus(value) {
  return platformExportStatuses.includes(value) ? value : null;
}

function normalizeRetentionSchedule(value) {
  return retentionSchedules.includes(value) ? value : null;
}

function normalizeCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

function normalizeFeeScheduleLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => ({
      serviceCodeId: sanitizeStr(line.serviceCodeId, 50),
      amount: normalizeCurrency(line.amount),
    }))
    .filter((line) => line.serviceCodeId && line.amount > 0);
}

function normalizeInvoiceLineItems(rawLineItems, feeScheduleId = null) {
  const directLines = (Array.isArray(rawLineItems) ? rawLineItems : [])
    .map((line) => {
      const serviceCode = serviceCodes.find((item) => item.id === sanitizeStr(line.serviceCodeId, 50));
      const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 1;
      const unitAmount = normalizeCurrency(line.unitAmount);
      return {
        serviceCodeId: sanitizeStr(line.serviceCodeId, 50),
        code: sanitizeStr(line.code, 30) ?? serviceCode?.code ?? '',
        description: sanitizeStr(line.description, 240) ?? serviceCode?.name ?? 'Session',
        quantity,
        unitAmount,
        serviceDate: normalizeIsoDate(line.serviceDate) ?? new Date().toISOString(),
      };
    })
    .filter((line) => line.serviceCodeId && line.quantity > 0 && line.unitAmount > 0);

  if (directLines.length) return directLines;
  if (!feeScheduleId) return [];

  const schedule = feeSchedules.find((item) => item.id === feeScheduleId);
  if (!schedule) return [];
  return schedule.lines
    .map((line) => {
      const serviceCode = serviceCodes.find((item) => item.id === line.serviceCodeId);
      return {
        serviceCodeId: line.serviceCodeId,
        code: serviceCode?.code ?? '',
        description: serviceCode?.name ?? 'Session',
        quantity: 1,
        unitAmount: normalizeCurrency(line.amount),
        serviceDate: new Date().toISOString(),
      };
    })
    .filter((line) => line.serviceCodeId && line.unitAmount > 0);
}

function computeInvoiceTotals(lineItems, adjustmentsInput, amountPaidInput) {
  const subtotal = normalizeCurrency((lineItems ?? []).reduce((sum, line) => sum + normalizeCurrency(line.quantity * line.unitAmount), 0));
  const adjustments = normalizeCurrency(adjustmentsInput);
  const total = normalizeCurrency(Math.max(subtotal + adjustments, 0));
  const amountPaid = normalizeCurrency(amountPaidInput);
  const balance = normalizeCurrency(Math.max(total - amountPaid, 0));
  return { subtotal, adjustments, total, amountPaid, balance };
}

function buildAgingReport(invoiceRecords, asOfIso) {
  const asOf = new Date(asOfIso).getTime();
  const agingBuckets = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    over90: 0,
  };

  const byClient = {};
  let totalOutstanding = 0;

  invoiceRecords
    .filter((invoice) => normalizeCurrency(invoice.balance) > 0)
    .forEach((invoice) => {
      const balance = normalizeCurrency(invoice.balance);
      totalOutstanding += balance;
      const dueAt = new Date(invoice.dueAt).getTime();
      const daysPastDue = Number.isFinite(dueAt) ? Math.floor((asOf - dueAt) / (24 * 60 * 60 * 1000)) : 0;

      if (daysPastDue <= 0) agingBuckets.current += balance;
      else if (daysPastDue <= 30) agingBuckets.days1to30 += balance;
      else if (daysPastDue <= 60) agingBuckets.days31to60 += balance;
      else if (daysPastDue <= 90) agingBuckets.days61to90 += balance;
      else agingBuckets.over90 += balance;

      const client = clients.find((item) => item.id === invoice.clientId);
      const clientKey = invoice.clientId;
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          clientId: invoice.clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : invoice.clientId,
          outstanding: 0,
          invoiceCount: 0,
        };
      }
      byClient[clientKey].outstanding = normalizeCurrency(byClient[clientKey].outstanding + balance);
      byClient[clientKey].invoiceCount += 1;
    });

  return {
    totals: {
      outstanding: normalizeCurrency(totalOutstanding),
      ...Object.fromEntries(Object.entries(agingBuckets).map(([key, value]) => [key, normalizeCurrency(value)])),
    },
    clients: Object.values(byClient).sort((left, right) => right.outstanding - left.outstanding),
  };
}

function computeInventoryScore(scoringMethod, responses) {
  const values = (responses ?? []).map((entry) => Number(entry.value)).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (scoringMethod === 'average') {
    return Number((total / values.length).toFixed(2));
  }
  return total;
}

function detectAppointmentConflicts({ startsAt, endsAt, counselorName, locationName, remoteSession, excludeAppointmentId = null }) {
  const targetStart = new Date(startsAt).getTime();
  const targetEnd = new Date(endsAt).getTime();
  if (!Number.isFinite(targetStart) || !Number.isFinite(targetEnd) || targetEnd <= targetStart) {
    return [{ type: 'invalid_time_range', message: 'endsAt must be later than startsAt' }];
  }

  const safeCounselor = (counselorName ?? '').trim().toLowerCase();
  const safeLocation = (locationName ?? '').trim().toLowerCase();

  return appointments
    .filter((item) => item.id !== excludeAppointmentId)
    .filter((item) => item.status !== 'cancelled' && item.status !== 'no_show')
    .filter((item) => {
      const existingStart = new Date(item.startsAt).getTime();
      const existingEnd = new Date(item.endsAt).getTime();
      return targetStart < existingEnd && targetEnd > existingStart;
    })
    .flatMap((item) => {
      const conflicts = [];
      if (safeCounselor && (item.counselorName ?? '').trim().toLowerCase() === safeCounselor) {
        conflicts.push({
          type: 'counselor_overlap',
          appointmentId: item.id,
          counselorName: item.counselorName,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          message: `Counselor ${item.counselorName} already has an overlapping session`,
        });
      }

      const existingLocation = (item.locationName ?? '').trim().toLowerCase();
      if (!remoteSession && !item.remoteSession && safeLocation && existingLocation === safeLocation) {
        conflicts.push({
          type: 'location_overlap',
          appointmentId: item.id,
          locationName: item.locationName,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          message: `Location ${item.locationName} is already booked for this time`,
        });
      }

      return conflicts;
    });
}

function dateKeyInTimezone(isoTimestamp, timezone) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

function groupBy(items, keyBuilder) {
  return items.reduce((result, item) => {
    const key = keyBuilder(item) ?? '';
    if (!result[key]) result[key] = [];
    result[key].push(item);
    return result;
  }, {});
}

const OPERATIONS_COUNSELOR_ROLES = new Set(['counselor', 'intern']);
const DEFAULT_WORKDAY_WINDOWS = Object.freeze([
  { start: 9 * 60, end: 12 * 60 },
  { start: 13 * 60, end: 17 * 60 },
]);
const DEFAULT_OPERATIONS_ALERT_THRESHOLDS = Object.freeze({
  highTouchpointWithoutFutureAppointment: 1,
  intakePreviewsAvailable: 1,
  noteGapOver1Day: 5,
  noteGapOver3Days: 3,
  noteGapOver7Days: 1,
  portalBacklogTotal: 5,
});

function readPositiveEnvInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getOperationsAlertThresholds() {
  return {
    highTouchpointWithoutFutureAppointment: readPositiveEnvInt('OPERATIONS_ALERT_HIGH_TOUCHPOINT_UNSCHEDULED_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.highTouchpointWithoutFutureAppointment),
    intakePreviewsAvailable: readPositiveEnvInt('OPERATIONS_ALERT_INTAKE_PREVIEW_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.intakePreviewsAvailable),
    noteGapOver1Day: readPositiveEnvInt('OPERATIONS_ALERT_NOTE_GAP_1DAY_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.noteGapOver1Day),
    noteGapOver3Days: readPositiveEnvInt('OPERATIONS_ALERT_NOTE_GAP_3DAY_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.noteGapOver3Days),
    noteGapOver7Days: readPositiveEnvInt('OPERATIONS_ALERT_NOTE_GAP_7DAY_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.noteGapOver7Days),
    portalBacklogTotal: readPositiveEnvInt('OPERATIONS_ALERT_PORTAL_BACKLOG_THRESHOLD', DEFAULT_OPERATIONS_ALERT_THRESHOLDS.portalBacklogTotal),
  };
}

function getAppointmentStart(item) {
  return item?.startsAt ?? item?.scheduledAt ?? item?.starts_at ?? item?.scheduled_at ?? null;
}

function getAppointmentEnd(item) {
  const directEnd = item?.endsAt ?? item?.ends_at ?? null;
  if (directEnd) return directEnd;
  const startsAt = getAppointmentStart(item);
  if (!startsAt) return null;
  const durationMinutes = Number(item?.durationMinutes ?? item?.duration_minutes ?? 50);
  return new Date(new Date(startsAt).getTime() + (durationMinutes * 60_000)).toISOString();
}

function isCancelledAppointment(status) {
  return status === 'cancelled' || status === 'canceled';
}

function timeToMinutes(value) {
  if (typeof value !== 'string' || !value.includes(':')) return null;
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function intervalDuration(interval) {
  return Math.max(0, Number(interval?.end ?? 0) - Number(interval?.start ?? 0));
}

function mergeIntervals(intervals) {
  const normalized = (intervals ?? [])
    .filter((interval) => interval && Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start)
    .map((interval) => ({ start: interval.start, end: interval.end }))
    .sort((left, right) => left.start - right.start);

  if (!normalized.length) return [];
  const merged = [normalized[0]];

  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function subtractInterval(baseInterval, removedInterval) {
  if (!baseInterval || !removedInterval) return baseInterval ? [baseInterval] : [];
  if (removedInterval.end <= baseInterval.start || removedInterval.start >= baseInterval.end) return [baseInterval];

  const segments = [];
  if (removedInterval.start > baseInterval.start) {
    segments.push({ start: baseInterval.start, end: Math.min(removedInterval.start, baseInterval.end) });
  }
  if (removedInterval.end < baseInterval.end) {
    segments.push({ start: Math.max(removedInterval.end, baseInterval.start), end: baseInterval.end });
  }
  return segments.filter((segment) => segment.end > segment.start);
}

function subtractIntervals(baseIntervals, removedIntervals) {
  return (removedIntervals ?? []).reduce((current, removed) => (
    current.flatMap((interval) => subtractInterval(interval, removed))
  ), mergeIntervals(baseIntervals));
}

function weekdayInfoForDateKey(dayKey, timezone) {
  const baseDate = new Date(`${dayKey}T12:00:00Z`);
  const weekdayLong = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(baseDate).toLowerCase();
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(baseDate).toLowerCase();
  const weekdayByName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return {
    long: weekdayLong,
    short: weekdayShort,
    dayOfWeek: weekdayByName.indexOf(weekdayLong),
  };
}

function buildAvailabilityWindowsForDay(templateSlots, dayKey, timezone) {
  const weekday = weekdayInfoForDateKey(dayKey, timezone);
  const matchingWindows = (templateSlots ?? [])
    .filter((slot) => {
      if (typeof slot?.dayOfWeek === 'number') return slot.dayOfWeek === weekday.dayOfWeek;
      const slotDay = typeof slot?.day === 'string' ? slot.day.toLowerCase() : '';
      return slotDay === weekday.long || slotDay === weekday.short;
    })
    .map((slot) => {
      const start = timeToMinutes(slot.startTime ?? slot.start);
      const end = timeToMinutes(slot.endTime ?? slot.end);
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
    })
    .filter(Boolean);

  return mergeIntervals(matchingWindows.length ? matchingWindows : DEFAULT_WORKDAY_WINDOWS);
}

function buildOverrideWindows(override) {
  if (!override) return [];
  if (override.allDay) return [{ start: 0, end: 24 * 60 }];
  const start = timeToMinutes(override.startTime);
  const end = timeToMinutes(override.endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [{ start, end }] : [];
}

function applyAvailabilityOverrides(baseWindows, overrides) {
  let current = mergeIntervals(baseWindows);
  for (const override of overrides ?? []) {
    const overrideType = String(override.overrideType ?? '').toLowerCase();
    const overrideWindows = buildOverrideWindows(override);
    if (!overrideWindows.length) continue;
    if (overrideType === 'block') {
      current = subtractIntervals(current, overrideWindows);
      continue;
    }
    if (overrideType === 'open' || overrideType === 'available') {
      current = mergeIntervals([...current, ...overrideWindows]);
    }
  }
  return current;
}

function appointmentIntervalForDate(appointment, dayKey, timezone) {
  const startsAt = getAppointmentStart(appointment);
  const endsAt = getAppointmentEnd(appointment);
  if (!startsAt || !endsAt) return null;
  if (dateKeyInTimezone(startsAt, timezone) !== dayKey) return null;

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const minutesForDate = (date) => {
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return (hour * 60) + minute;
  };
  return {
    start: minutesForDate(startDate),
    end: minutesForDate(endDate),
  };
}

function countOneHourWindows(intervals) {
  return (intervals ?? []).reduce((total, interval) => total + Math.floor(intervalDuration(interval) / 60), 0);
}

function aggregateStatusCounts(items, statusAccessor = (item) => item?.status) {
  return (items ?? []).reduce((counts, item) => {
    const status = statusAccessor(item);
    if (!status) return counts;
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

function noteTimestampMs(note) {
  const candidate = note?.signedAt ?? note?.createdAt ?? note?.signed_at ?? note?.created_at ?? null;
  const timestamp = candidate ? new Date(candidate).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildNotesByClient(notes) {
  return (notes ?? []).reduce((result, note) => {
    const key = note.clientId ?? note.client_id;
    if (!key) return result;
    if (!result[key]) result[key] = [];
    result[key].push(note);
    return result;
  }, {});
}

function unresolvedLatestSessionAgeDays(appointment, clientNotes) {
  if (!appointment) return null;
  const endsAt = getAppointmentEnd(appointment);
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : Number.NaN;
  if (!Number.isFinite(endsAtMs)) return null;

  const hasLockedNote = (clientNotes ?? []).some((note) => {
    if (!note?.locked) return false;
    const timestamp = noteTimestampMs(note);
    return timestamp !== null && timestamp >= endsAtMs;
  });
  if (hasLockedNote) return null;

  return (Date.now() - endsAtMs) / (24 * 60 * 60 * 1000);
}

function trailingDayKeys(days, timezone) {
  const results = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    results.push(dateKeyInTimezone(new Date(Date.now() - (offset * 24 * 60 * 60 * 1000)).toISOString(), timezone));
  }
  return results;
}

function dayLabelForKey(dayKey, timezone) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);
}

function diffDaysBetweenKeys(laterDayKey, earlierDayKey) {
  const later = new Date(`${laterDayKey}T12:00:00Z`).getTime();
  const earlier = new Date(`${earlierDayKey}T12:00:00Z`).getTime();
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return null;
  return Math.max(0, Math.round((later - earlier) / (24 * 60 * 60 * 1000)));
}

function inferPortalRegistrationResolvedAt(item) {
  const terminalStatuses = new Set(['approved', 'declined', 'completed']);
  if (!terminalStatuses.has(String(item?.status ?? '').toLowerCase())) return null;
  return item?.updatedAt ?? null;
}

function buildOperationsTrends({
  timezone,
  dayKeys,
  counselors,
  data,
  tenantAppointments,
  notesByClient,
}) {
  const daySet = new Set(dayKeys);
  const dayEntries = dayKeys.map((dayKey) => ({ dayKey, label: dayLabelForKey(dayKey, timezone) }));

  const scheduleTrend = dayEntries.map(({ dayKey, label }) => {
    const appointmentsForDay = tenantAppointments.filter((item) => dateKeyInTimezone(getAppointmentStart(item), timezone) === dayKey);
    const workloadRows = counselors.map((staff) => {
      const baseWindows = buildAvailabilityWindowsForDay(data.availabilityTemplatesByStaffId?.[staff.id] ?? [], dayKey, timezone);
      const overrides = (data.availabilityOverrides ?? []).filter((item) => item.staffId === staff.id && item.overrideDate === dayKey);
      const availableWindows = applyAvailabilityOverrides(baseWindows, overrides);
      const counselorAppointments = appointmentsForDay.filter((item) => item.counselorId === staff.id || item.counselorName === `${staff.firstName} ${staff.lastName}`.trim());
      const scheduledMinutes = counselorAppointments.reduce((sum, item) => sum + intervalDuration(appointmentIntervalForDate(item, dayKey, timezone) ?? { start: 0, end: 0 }), 0);
      const availableMinutes = availableWindows.reduce((sum, interval) => sum + intervalDuration(interval), 0);
      return {
        scheduledMinutes,
        availableMinutes,
      };
    });
    const totalScheduledMinutes = workloadRows.reduce((sum, row) => sum + row.scheduledMinutes, 0);
    const totalAvailableMinutes = workloadRows.reduce((sum, row) => sum + row.availableMinutes, 0);
    return {
      dayKey,
      label,
      totalAppointments: appointmentsForDay.length,
      counselorsWithEntries: new Set(appointmentsForDay.map((item) => item.counselorId || item.counselorName).filter(Boolean)).size,
      scheduledMinutes: totalScheduledMinutes,
      availableMinutes: totalAvailableMinutes,
      utilizationPct: totalAvailableMinutes ? Number(((totalScheduledMinutes / totalAvailableMinutes) * 100).toFixed(1)) : 0,
    };
  });

  const latestRelevantAppointments = tenantAppointments
    .filter((item) => item.clientId && (item.status === 'completed' || item.status === 'checked_in'))
    .sort((left, right) => String(getAppointmentStart(left)).localeCompare(String(getAppointmentStart(right))));

  const complianceTrend = dayEntries.map(({ dayKey, label }) => {
    const snapshot = { over1Day: 0, over3Days: 0, over7Days: 0 };
    const latestByClient = {};
    for (const appointment of latestRelevantAppointments) {
      const appointmentDayKey = dateKeyInTimezone(getAppointmentStart(appointment), timezone);
      if (appointmentDayKey > dayKey) continue;
      latestByClient[appointment.clientId] = appointment;
    }
    Object.values(latestByClient).forEach((appointment) => {
      const appointmentDayKey = dateKeyInTimezone(getAppointmentStart(appointment), timezone);
      const hasLockedNote = (notesByClient[appointment.clientId] ?? []).some((note) => {
        if (!note?.locked) return false;
        const noteDayKey = dateKeyInTimezone(note.signedAt ?? note.createdAt ?? note.signed_at ?? note.created_at, timezone);
        return noteDayKey >= appointmentDayKey && noteDayKey <= dayKey;
      });
      if (hasLockedNote) return;
      const ageDays = diffDaysBetweenKeys(dayKey, appointmentDayKey);
      if (ageDays === null) return;
      if (ageDays >= 1) snapshot.over1Day += 1;
      if (ageDays >= 3) snapshot.over3Days += 1;
      if (ageDays >= 7) snapshot.over7Days += 1;
    });
    return {
      dayKey,
      label,
      ...snapshot,
    };
  });

  const portalCreatedByDay = {};
  const portalResolvedByDay = {};
  const portalTimelineItems = [
    ...(data.portalRegistrationRequests ?? []).map((item) => ({
      createdAt: item.createdAt,
      resolvedAt: inferPortalRegistrationResolvedAt(item),
    })),
    ...(data.portalAppointmentRequests ?? []).map((item) => ({
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt ?? null,
    })),
  ];

  portalTimelineItems.forEach((item) => {
    const createdDayKey = item.createdAt ? dateKeyInTimezone(item.createdAt, timezone) : null;
    if (createdDayKey && daySet.has(createdDayKey)) portalCreatedByDay[createdDayKey] = (portalCreatedByDay[createdDayKey] ?? 0) + 1;
    const resolvedDayKey = item.resolvedAt ? dateKeyInTimezone(item.resolvedAt, timezone) : null;
    if (resolvedDayKey && daySet.has(resolvedDayKey)) portalResolvedByDay[resolvedDayKey] = (portalResolvedByDay[resolvedDayKey] ?? 0) + 1;
  });

  const portalTrend = dayEntries.map(({ dayKey, label }) => {
    const backlog = portalTimelineItems.filter((item) => {
      const createdDayKey = item.createdAt ? dateKeyInTimezone(item.createdAt, timezone) : null;
      if (!createdDayKey || createdDayKey > dayKey) return false;
      const resolvedDayKey = item.resolvedAt ? dateKeyInTimezone(item.resolvedAt, timezone) : null;
      return !resolvedDayKey || resolvedDayKey > dayKey;
    }).length;
    return {
      dayKey,
      label,
      created: portalCreatedByDay[dayKey] ?? 0,
      resolved: portalResolvedByDay[dayKey] ?? 0,
      backlog,
    };
  });

  const unscheduledTrend = dayEntries.map(({ dayKey, label }) => {
    const count = (data.clients ?? []).filter((client) => {
      const clientCreatedDayKey = client.createdAt ? dateKeyInTimezone(client.createdAt, timezone) : null;
      if (clientCreatedDayKey && clientCreatedDayKey > dayKey) return false;
      if (!['active', 'waitlist'].includes(client.status)) return false;
      return !tenantAppointments.some((appointment) => (
        appointment.clientId === client.id
        && dateKeyInTimezone(getAppointmentStart(appointment), timezone) >= dayKey
      ));
    }).length;
    return {
      dayKey,
      label,
      count,
    };
  });

  return {
    schedule: scheduleTrend,
    compliance: complianceTrend,
    portalRequests: portalTrend,
    clients: unscheduledTrend,
  };
}

async function loadOperationsSummaryData(request, session) {
  if (!process.env.DB_NAME) {
    const tenantId = callerTenant(request, session);
    return {
      tenantId,
      appointments: filterByTenant(appointments, request),
      clients: filterByTenant(clients, request),
      staff: filterByTenant(staffMembers, request),
      notes: filterByTenant(progressNotes, request),
      intakePackets: filterByTenant(intakePackets, request),
      documentAssignments: filterByTenant(documentAssignments, request),
      formAssignments: filterByTenant(formWorkflowAssignments, request),
      formSubmissions: filterByTenant(formWorkflowSubmissions, request),
      portalRegistrationRequests: filterByTenant(portalRegistrationRequests, request),
      portalAppointmentRequests: filterByTenant(portalAppointmentRequests, request),
      availabilityTemplatesByStaffId: { ...availabilityTemplates },
      availabilityOverrides: [],
    };
  }

  const tenantId = callerTenant(request, session);
  const [clientRows, notesRows, intakePacketRows, staff, allAppointments, docs, forms, formSubmissions, publicRequests, appointmentRequests, templateRows, overrides] = await Promise.all([
    pool.query('SELECT id, first_name_enc, last_name_enc, status, high_touchpoint, primary_counselor_id, created_at FROM clients WHERE tenant_id = ?', [tenantId]),
    pool.query('SELECT client_id, locked, signed_at, created_at FROM progress_notes WHERE tenant_id = ?', [tenantId]),
    pool.query('SELECT * FROM intake_packets WHERE tenant_id = ?', [tenantId]),
    listStaff(tenantId),
    listAppointments(tenantId),
    listDocumentAssignments(tenantId),
    listFormAssignments(tenantId),
    listFormSubmissions(tenantId),
    listPortalRegistrationRequests(tenantId),
    listPortalAppointmentRequests(tenantId),
    pool.query('SELECT staff_id, slots FROM availability_templates WHERE tenant_id = ?', [tenantId]),
    listAvailabilityOverrides(tenantId),
  ]);

  const clientsData = clientRows[0].map((row) => ({
    id: row.id,
    firstName: row.first_name_enc ? decrypt(row.first_name_enc) : '',
    lastName: row.last_name_enc ? decrypt(row.last_name_enc) : '',
    status: row.status,
    highTouchpoint: Boolean(row.high_touchpoint),
    primaryCounselorId: row.primary_counselor_id ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    tenantId,
  }));
  const notesData = notesRows[0].map((row) => ({
    clientId: row.client_id,
    locked: Boolean(row.locked),
    signedAt: row.signed_at instanceof Date ? row.signed_at.toISOString() : row.signed_at,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));
  const intakePacketData = intakePacketRows[0].map((row) => ({
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    status: row.status,
    assignedForms: row.assigned_forms
      ? (typeof row.assigned_forms === 'string' ? JSON.parse(row.assigned_forms) : row.assigned_forms)
      : null,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at,
  }));
  const availabilityTemplatesByStaffId = templateRows[0].reduce((result, row) => {
    result[row.staff_id] = typeof row.slots === 'string' ? JSON.parse(row.slots) : (row.slots ?? []);
    return result;
  }, {});

  return {
    tenantId,
    appointments: allAppointments,
    clients: clientsData,
    staff,
    notes: notesData,
    intakePackets: intakePacketData,
    documentAssignments: docs,
    formAssignments: forms,
    formSubmissions,
    portalRegistrationRequests: publicRequests,
    portalAppointmentRequests: appointmentRequests,
    availabilityTemplatesByStaffId,
    availabilityOverrides: overrides,
  };
}

async function buildOperationsSummary(request, timezone, session, { counselorScopeId = null } = {}) {
  const todayKey = dateKeyInTimezone(new Date().toISOString(), timezone);
  const rawData = await loadOperationsSummaryData(request, session);
  const data = scopeOperationsDataToCounselor(rawData, counselorScopeId);
  const tenantAppointments = (data.appointments ?? [])
    .filter((item) => !isCancelledAppointment(item.status))
    .sort((left, right) => String(getAppointmentStart(left)).localeCompare(String(getAppointmentStart(right))));
  const todayAppointments = tenantAppointments.filter((item) => dateKeyInTimezone(getAppointmentStart(item), timezone) === todayKey);
  const notesByClient = buildNotesByClient(data.notes);
  const clientById = Object.fromEntries((data.clients ?? []).map((client) => [client.id, client]));
  const dayKeys = trailingDayKeys(7, timezone);

  const counselors = [
    ...(data.staff ?? []).filter((item) => OPERATIONS_COUNSELOR_ROLES.has(item.role)),
    ...Array.from(
      new Map(
        todayAppointments
          .filter((item) => item.counselorName && !(data.staff ?? []).some((staff) => staff.id === item.counselorId || `${staff.firstName} ${staff.lastName}`.trim() === item.counselorName))
          .map((item) => {
            const counselorName = item.counselorName || 'Unassigned';
            return [item.counselorId || counselorName, {
              id: item.counselorId || counselorName,
              firstName: counselorName,
              lastName: '',
              role: 'counselor',
            }];
          }),
      ).values(),
    ),
  ];
  const counselorWorkload = counselors
    .map((staff) => {
      const baseWindows = buildAvailabilityWindowsForDay(data.availabilityTemplatesByStaffId?.[staff.id] ?? [], todayKey, timezone);
      const overrides = (data.availabilityOverrides ?? []).filter((item) => item.staffId === staff.id && item.overrideDate === todayKey);
      const availableWindows = applyAvailabilityOverrides(baseWindows, overrides);
      const counselorAppointments = todayAppointments.filter((item) => item.counselorId === staff.id || item.counselorName === `${staff.firstName} ${staff.lastName}`.trim());
      const scheduledWindows = counselorAppointments
        .map((item) => appointmentIntervalForDate(item, todayKey, timezone))
        .filter(Boolean);
      const openWindows = subtractIntervals(availableWindows, scheduledWindows);
      const scheduledMinutes = counselorAppointments.reduce((sum, item) => sum + intervalDuration(appointmentIntervalForDate(item, todayKey, timezone) ?? { start: 0, end: 0 }), 0);
      const availableMinutes = availableWindows.reduce((sum, interval) => sum + intervalDuration(interval), 0);
      const counselorName = [staff.firstName, staff.lastName].filter(Boolean).join(' ').trim() || staff.id;

      return {
        counselorId: staff.id,
        counselorName,
        appointmentsCount: counselorAppointments.length,
        scheduledMinutes,
        availableMinutes,
        utilizationPct: availableMinutes ? Number(((scheduledMinutes / availableMinutes) * 100).toFixed(1)) : 0,
        oneHourGapCount: countOneHourWindows(openWindows),
        hasDeclaredAvailability: Boolean((data.availabilityTemplatesByStaffId?.[staff.id] ?? []).length),
      };
    })
    .sort((left, right) => right.scheduledMinutes - left.scheduledMinutes || left.counselorName.localeCompare(right.counselorName));

  const clientsWithoutScheduledAppointment = (data.clients ?? []).filter((client) => (
    ['active', 'waitlist'].includes(client.status)
    && !tenantAppointments.some((appointment) => (
      appointment.clientId === client.id
      && new Date(getAppointmentStart(appointment)).getTime() >= Date.now()
    ))
  ));
  const unscheduledClientItems = clientsWithoutScheduledAppointment.map((client) => ({
    clientId: client.id,
    clientName: [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.id,
    status: client.status,
    highTouchpoint: Boolean(client.highTouchpoint),
  }));

  const noteGapClients = { over1Day: 0, over3Days: 0, over7Days: 0 };
  const noteGapItems = [];
  const latestRelevantAppointmentByClient = {};
  for (const appointment of tenantAppointments) {
    if (appointment.status !== 'completed' && appointment.status !== 'checked_in') continue;
    if (!appointment.clientId) continue;
    const startsAt = getAppointmentStart(appointment);
    const current = latestRelevantAppointmentByClient[appointment.clientId];
    if (!current || String(startsAt).localeCompare(String(getAppointmentStart(current))) > 0) {
      latestRelevantAppointmentByClient[appointment.clientId] = appointment;
    }
  }
  Object.values(latestRelevantAppointmentByClient).forEach((appointment) => {
    const ageDays = unresolvedLatestSessionAgeDays(appointment, notesByClient[appointment.clientId] ?? []);
    if (ageDays === null) return;
    const client = clientById[appointment.clientId] ?? null;
    noteGapItems.push({
      clientId: appointment.clientId,
      clientName: client ? [client.firstName, client.lastName].filter(Boolean).join(' ').trim() : (appointment.clientName || appointment.clientId),
      counselorName: appointment.counselorName || null,
      latestAppointmentAt: getAppointmentStart(appointment),
      daysWithoutNote: Number(ageDays.toFixed(1)),
    });
    if (ageDays >= 1) noteGapClients.over1Day += 1;
    if (ageDays >= 3) noteGapClients.over3Days += 1;
    if (ageDays >= 7) noteGapClients.over7Days += 1;
  });

  const incompleteDocuments = (data.documentAssignments ?? []).filter((item) => item.status !== 'completed' && item.status !== 'signed');
  const incompleteForms = (data.formAssignments ?? []).filter((item) => item.status !== 'completed');
  const intakePreviewItems = (data.clients ?? [])
    .map((client) => {
      const preview = buildIntakePreview({
        client,
        intakePacket: (data.intakePackets ?? []).find((item) => item.clientId === client.id) ?? null,
        submissions: (data.formSubmissions ?? []).filter((item) => item.clientId === client.id),
        appointments: tenantAppointments.filter((item) => item.clientId === client.id),
      });
      if (!preview?.eligible) return null;
      return {
        clientId: client.id,
        clientName: [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.id,
        status: client.status,
        nextAppointmentAt: preview?.sessions?.nextAppointmentAt ?? null,
        screeningSignalCount: Array.isArray(preview?.screeningSignals) ? preview.screeningSignals.length : 0,
        careRouteCount: Array.isArray(preview?.careRoutes) ? preview.careRoutes.length : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.nextAppointmentAt ?? '').localeCompare(String(right.nextAppointmentAt ?? '')));
  const highTouchpointClients = (data.clients ?? []).filter((client) => client.highTouchpoint).length;
  const highTouchpointWithoutFutureAppointmentItems = unscheduledClientItems.filter((item) => item.highTouchpoint);
  const highTouchpointItems = (data.clients ?? [])
    .filter((client) => client.highTouchpoint)
    .map((client) => ({
      clientId: client.id,
      clientName: [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.id,
      status: client.status,
    }));
  const outstandingAssignmentItems = [
    ...incompleteDocuments.map((item) => {
      const client = clientById[item.assigneeId] ?? null;
      return {
        kind: 'document',
        id: item.id,
        clientId: item.assigneeId,
        clientName: client ? [client.firstName, client.lastName].filter(Boolean).join(' ').trim() : item.assigneeId,
        title: item.templateTitle ?? item.templateId ?? 'Document assignment',
        status: item.status,
      };
    }),
    ...incompleteForms.map((item) => {
      const client = clientById[item.clientId] ?? null;
      return {
        kind: 'form',
        id: item.id,
        clientId: item.clientId,
        clientName: client ? [client.firstName, client.lastName].filter(Boolean).join(' ').trim() : item.clientId,
        title: item.formTitle ?? item.formKey ?? 'Form assignment',
        status: item.status,
      };
    }),
  ];
  const publicRegistrationStatuses = aggregateStatusCounts(data.portalRegistrationRequests);
  const appointmentRequestStatuses = aggregateStatusCounts(data.portalAppointmentRequests);
  const portalRequestItems = [
    ...(data.portalRegistrationRequests ?? []).map((item) => ({
      kind: 'public_registration',
      id: item.id,
      clientId: null,
      displayName: [item.firstName, item.lastName].filter(Boolean).join(' ').trim() || item.id,
      requestType: item.requestType,
      status: item.status,
      requestedAt: item.createdAt,
    })),
    ...(data.portalAppointmentRequests ?? []).map((item) => {
      const client = clientById[item.clientId] ?? null;
      return {
        kind: 'portal_appointment',
        id: item.id,
        clientId: item.clientId,
        displayName: client ? [client.firstName, client.lastName].filter(Boolean).join(' ').trim() : item.clientId,
        requestType: item.requestedType ?? 'session',
        status: item.status,
        requestedAt: item.createdAt,
      };
    }),
  ].filter((item) => item.status === 'requested' || item.status === 'reviewing')
    .sort((left, right) => String(right.requestedAt ?? '').localeCompare(String(left.requestedAt ?? '')));

  // Load dismissed workflow recommendation states so the dashboard tile reflects
  // open/unaddressed items only, not raw rule firings.
  const dismissedClientIds = new Set(); // clients where ALL signals are complete/hidden
  const tenantId = callerTenant(request, session);
  if (process.env.DB_NAME) {
    try {
      // A client is "dismissed" when every non-expired state for them is complete or hidden.
      // We only remove them from counts if they have at least one state record and none are pending/deferred.
      const [stateRows] = await pool.query(
        `SELECT client_id,
                SUM(CASE WHEN status IN ('pending','deferred') THEN 1 ELSE 0 END) AS open_count,
                COUNT(*) AS total_count
         FROM workflow_recommendation_states
         WHERE tenant_id = ?
           AND (expires_at IS NULL OR expires_at > NOW())
         GROUP BY client_id`,
        [tenantId],
      );
      for (const row of stateRows) {
        if (row.total_count > 0 && row.open_count === 0) {
          dismissedClientIds.add(row.client_id);
        }
      }
    } catch (_err) {
      // Non-fatal: if query fails, counts fall back to raw signals
    }
  }

  // Build a lightweight faithful-workflow risk rollup for dashboard visibility.
  // These counts are intentionally conservative and based on existing operational signals.
  const criticalFaithClientIds = new Set();
  const moderateFaithClientIds = new Set();

  for (const item of noteGapItems) {
    if (!item?.clientId || dismissedClientIds.has(item.clientId)) continue;
    if ((item.daysWithoutNote ?? 0) >= 7) {
      criticalFaithClientIds.add(item.clientId);
      continue;
    }
    if ((item.daysWithoutNote ?? 0) >= 3) {
      moderateFaithClientIds.add(item.clientId);
    }
  }

  for (const item of highTouchpointWithoutFutureAppointmentItems) {
    if (!item?.clientId || dismissedClientIds.has(item.clientId)) continue;
    criticalFaithClientIds.add(item.clientId);
  }

  for (const item of outstandingAssignmentItems) {
    if (!item?.clientId || dismissedClientIds.has(item.clientId)) continue;
    if (criticalFaithClientIds.has(item.clientId)) continue;
    moderateFaithClientIds.add(item.clientId);
  }

  for (const clientId of criticalFaithClientIds) {
    moderateFaithClientIds.delete(clientId);
  }

  const routineFaithCount = Math.max(
    0,
    ((data.clients ?? []).filter((client) => ['active', 'waitlist'].includes(client.status)).length)
    - criticalFaithClientIds.size
    - moderateFaithClientIds.size,
  );
  const counselorsWithEntries = new Set(todayAppointments.map((item) => item.counselorId || item.counselorName).filter(Boolean)).size;
  const oneHourGapsTotal = counselorWorkload.reduce((sum, item) => sum + item.oneHourGapCount, 0);
  const thresholds = getOperationsAlertThresholds();
  const alerts = [];

  if (highTouchpointWithoutFutureAppointmentItems.length >= thresholds.highTouchpointWithoutFutureAppointment) {
    alerts.push({
      id: 'high_touchpoint_unscheduled',
      severity: 'warning',
      count: highTouchpointWithoutFutureAppointmentItems.length,
      threshold: thresholds.highTouchpointWithoutFutureAppointment,
      actionType: 'highTouchpointUnscheduled',
    });
  }
  if (intakePreviewItems.length >= thresholds.intakePreviewsAvailable) {
    alerts.push({
      id: 'intake_previews_available',
      severity: 'warning',
      count: intakePreviewItems.length,
      threshold: thresholds.intakePreviewsAvailable,
      actionType: 'intakePreviews',
    });
  }
  if (noteGapClients.over1Day >= thresholds.noteGapOver1Day) {
    alerts.push({
      id: 'note_gap_over_1day',
      severity: 'warning',
      count: noteGapClients.over1Day,
      threshold: thresholds.noteGapOver1Day,
      actionType: 'noteGap1Day',
    });
  }
  if (noteGapClients.over3Days >= thresholds.noteGapOver3Days) {
    alerts.push({
      id: 'note_gap_over_3days',
      severity: 'warning',
      count: noteGapClients.over3Days,
      threshold: thresholds.noteGapOver3Days,
      actionType: 'noteGap3Days',
    });
  }
  if (noteGapClients.over7Days >= thresholds.noteGapOver7Days) {
    alerts.push({
      id: 'note_gap_over_7days',
      severity: 'critical',
      count: noteGapClients.over7Days,
      threshold: thresholds.noteGapOver7Days,
      actionType: 'noteGap7Days',
    });
  }
  if (counselorWorkload.length > 0 && oneHourGapsTotal <= 0) {
    alerts.push({
      id: 'no_capacity_remaining',
      severity: 'critical',
      count: 0,
      threshold: 0,
      actionType: 'calendar',
    });
  }
  if (portalRequestItems.length >= thresholds.portalBacklogTotal) {
    alerts.push({
      id: 'portal_request_backlog',
      severity: 'warning',
      count: portalRequestItems.length,
      threshold: thresholds.portalBacklogTotal,
      actionType: 'portalRequests',
    });
  }

  const priorityItems = [
    {
      title: 'High-touchpoint clients',
      detail: `${highTouchpointClients} clients are currently marked for high-touchpoint follow-up.`,
    },
  ];

  const complianceItems = [
    {
      title: 'Missing notes after 1 day',
      detail: `${noteGapClients.over1Day} clients have unresolved locked notes after their latest completed or checked-in session.`,
    },
    {
      title: 'Missing notes after 3 days',
      detail: `${noteGapClients.over3Days} clients have unresolved notes older than 3 days.`,
    },
    {
      title: 'Assigned work not completed',
      detail: `${incompleteDocuments.length + incompleteForms.length} documents or forms remain assigned but incomplete.`,
    },
  ];
  const trends = buildOperationsTrends({
    timezone,
    dayKeys,
    counselors,
    data,
    tenantAppointments,
    notesByClient,
  });

  return {
    timezone,
    generatedAt: new Date().toISOString(),
    todaySchedule: {
      total: todayAppointments.length,
      totalAppointments: todayAppointments.length,
      counselorsWithEntries,
      oneHourGapsTotal,
      workload: counselorWorkload,
      items: todayAppointments,
    },
    priorityQueue: {
      highTouchpointClients,
      description: 'Count of clients marked as high touchpoint for closer operational follow-up.',
      flagAvailable: true,
      items: highTouchpointItems,
    },
    complianceWatch: {
      noteGapClients,
      noteGapItems,
      outstandingAssignments: {
        total: incompleteDocuments.length + incompleteForms.length,
        documents: incompleteDocuments.length,
        forms: incompleteForms.length,
        items: outstandingAssignmentItems,
      },
    },
    clientsBox: {
      totalClients: (data.clients ?? []).length,
      withoutScheduledAppointment: clientsWithoutScheduledAppointment.length,
      unscheduledClientItems,
      intakePreviews: {
        total: intakePreviewItems.length,
        items: intakePreviewItems,
      },
      portalRequests: {
        total: portalRequestItems.length,
        publicRegistrationStatuses,
        appointmentRequestStatuses,
        items: portalRequestItems,
      },
    },
    counts: {
      activeAlerts: alerts.length,
      highTouchpointClients,
      highTouchpointWithoutFutureAppointment: highTouchpointWithoutFutureAppointmentItems.length,
      intakePreviewsAvailable: intakePreviewItems.length,
      noteGapOver1Day: noteGapClients.over1Day,
      noteGapOver3Days: noteGapClients.over3Days,
      noteGapOver7Days: noteGapClients.over7Days,
      outstandingAssignments: incompleteDocuments.length + incompleteForms.length,
      totalClients: (data.clients ?? []).length,
      clientsWithoutScheduledAppointment: clientsWithoutScheduledAppointment.length,
      portalRequests: (data.portalRegistrationRequests?.length ?? 0) + (data.portalAppointmentRequests?.length ?? 0),
      counselorsWithEntries,
      oneHourGapsTotal,
    },
    alerts: {
      thresholds,
      items: alerts,
    },
    trends,
    priorityItems,
    complianceItems,
    counselorCount: (data.staff ?? []).filter((item) => OPERATIONS_COUNSELOR_ROLES.has(item.role)).length,
    pendingPortalRequests: portalRequestItems.length,
    faithfulWorkflowCounts: {
      critical: criticalFaithClientIds.size,
      moderate: moderateFaithClientIds.size,
      routine: routineFaithCount,
    },
  };
}

function buildReportingOverview(request, days) {
  const tenantAppointments = filterByTenant(appointments, request);
  const tenantAssignments = filterByTenant(documentAssignments, request);
  const tenantInventories = filterByTenant(inventoryAssignments, request);
  const tenantLifecycles = Object.values(clientLifecycles).filter((item) => {
    if (callerRole(request) === 'platform_admin') return true;
    return item.tenantId === callerTenant(request);
  });

  const windowStart = Date.now() - days * 24 * 60 * 60 * 1000;
  const inWindowAppointments = tenantAppointments.filter((item) => new Date(item.startsAt).getTime() >= windowStart);
  const completedAppointments = inWindowAppointments.filter((item) => item.status === 'completed');
  const remoteCompleted = completedAppointments.filter((item) => item.remoteSession);

  const counselorBuckets = Object.values(groupBy(completedAppointments, (item) => item.counselorName || 'Unassigned'))
    .map((entries) => ({
      counselorName: entries[0]?.counselorName || 'Unassigned',
      sessionsCompleted: entries.length,
      remoteSessions: entries.filter((item) => item.remoteSession).length,
    }))
    .sort((left, right) => right.sessionsCompleted - left.sessionsCompleted);

  const referralBuckets = Object.entries(
    tenantLifecycles.reduce((result, lifecycle) => {
      const key = lifecycle.referralSource || 'Unspecified';
      result[key] = (result[key] ?? 0) + 1;
      return result;
    }, {}),
  )
    .map(([referralSource, count]) => ({ referralSource, count }))
    .sort((left, right) => right.count - left.count);

  const signedDocuments = tenantAssignments.filter((item) => item.status === 'signed').length;
  const requiresSignatureCount = tenantAssignments.filter((item) => item.requiresSignature).length;
  const documentCompletionRate = requiresSignatureCount
    ? Number(((signedDocuments / requiresSignatureCount) * 100).toFixed(1))
    : 0;

  const assessmentByInventory = Object.values(groupBy(tenantInventories, (item) => item.inventoryId))
    .map((entries) => {
      const inventory = inventoryDefinitions.find((item) => item.id === entries[0]?.inventoryId);
      const scored = entries.filter((entry) => Number.isFinite(Number(entry.score))).map((entry) => Number(entry.score));
      const averageScore = scored.length
        ? Number((scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(2))
        : null;
      return {
        inventoryId: entries[0]?.inventoryId,
        inventoryName: inventory?.name ?? entries[0]?.inventoryId,
        completedCount: entries.filter((entry) => entry.status === 'completed' || entry.status === 'reviewed').length,
        averageScore,
      };
    })
    .sort((left, right) => (right.completedCount ?? 0) - (left.completedCount ?? 0));

  const locationPerformance = Object.values(groupBy(inWindowAppointments, (item) => item.locationName || 'Unassigned'))
    .map((entries) => ({
      locationName: entries[0]?.locationName || 'Unassigned',
      totalSessions: entries.length,
      completedSessions: entries.filter((item) => item.status === 'completed').length,
      remoteSessions: entries.filter((item) => item.remoteSession).length,
      completionRate: entries.length
        ? Number(((entries.filter((item) => item.status === 'completed').length / entries.length) * 100).toFixed(1))
        : 0,
    }))
    .sort((left, right) => right.totalSessions - left.totalSessions);

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    utilization: {
      sessionsInWindow: inWindowAppointments.length,
      sessionsCompleted: completedAppointments.length,
      remoteRate: completedAppointments.length ? Number(((remoteCompleted.length / completedAppointments.length) * 100).toFixed(1)) : 0,
      avgSessionsPerCounselor: counselorBuckets.length
        ? Number((completedAppointments.length / counselorBuckets.length).toFixed(2))
        : 0,
    },
    counselorProductivity: counselorBuckets,
    referralSources: referralBuckets,
    documentCompletion: {
      requiresSignatureCount,
      signedDocuments,
      completionRate: documentCompletionRate,
    },
    assessmentTrends: assessmentByInventory,
    locationPerformance,
  };
}

function buildPlatformOverview(request) {
  const tenantId = callerTenant(request);
  const isPlatformAdmin = callerRole(request) === 'platform_admin';
  const inScope = (item) => isPlatformAdmin || item.tenantId === tenantId;

  const provisioning = tenantProvisioningRequests.filter(inScope);
  const impersonations = supportImpersonationSessions.filter(inScope);
  const exports = dataExportJobs.filter(inScope);
  const policy = retentionPolicies.find((item) => inScope(item)) ?? null;

  return {
    generatedAt: new Date().toISOString(),
    provisioning: {
      total: provisioning.length,
      queued: provisioning.filter((item) => item.status === 'queued').length,
      inProgress: provisioning.filter((item) => item.status === 'in_progress').length,
      completed: provisioning.filter((item) => item.status === 'completed').length,
      recent: provisioning.slice().sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)).slice(0, 5),
    },
    supportImpersonation: {
      total: impersonations.length,
      active: impersonations.filter((item) => item.status === 'active').length,
      ended: impersonations.filter((item) => item.status === 'ended').length,
      recent: impersonations.slice().sort((left, right) => right.startedAt.localeCompare(left.startedAt)).slice(0, 5),
    },
    dataExports: {
      total: exports.length,
      queued: exports.filter((item) => item.status === 'queued' || item.status === 'processing').length,
      completed: exports.filter((item) => item.status === 'completed').length,
      failed: exports.filter((item) => item.status === 'failed').length,
      recent: exports.slice().sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)).slice(0, 5),
    },
    retentionPolicy: policy,
  };
}

function callerTenant(request, session) {
  if (session) return session.tenant_id;
  return (request.headers['x-tenant-id'] || 'system').trim();
}

function callerRole(request, session) {
  if (session) return session.role;
  return (request.headers['x-staff-role'] || '').trim().toLowerCase();
}

function callerClientId(request, session) {
  if (session?.client_id) return sanitizeStr(session.client_id, 50);
  return sanitizeStr(request.headers['x-client-id'] || '', 50);
}

const COUNSELOR_SESSION_ROLES = new Set(['counselor', 'intern']);

async function resolveCounselorScopeId(request, requestUrl, session) {
  const requestedCounselorId = sanitizeStr(requestUrl.searchParams.get('counselorId') ?? '', 64) || null;
  const role = callerRole(request, session);

  if (!COUNSELOR_SESSION_ROLES.has(role)) {
    return requestedCounselorId;
  }

  return await resolveCallerCounselorScopeIdForAccess(request, session);
}

async function resolveEffectiveCounselorFilterId(request, response, requestUrl, session, deniedAction = 'client.record.read') {
  if (!COUNSELOR_SESSION_ROLES.has(callerRole(request, session))) {
    return await resolveCounselorScopeId(request, requestUrl, session);
  }

  const counselorScope = await resolveCounselorCollectionScope(request, response, session, deniedAction);
  if (counselorScope === false) {
    return false;
  }

  return counselorScope.counselorScopeId;
}

async function resolveCounselorCollectionScope(request, response, session, deniedAction = 'client.record.read') {
  if (!COUNSELOR_SESSION_ROLES.has(callerRole(request, session))) {
    return null;
  }

  const counselorScopeId = await resolveCallerCounselorScopeIdForAccess(request, session);
  if (!counselorScopeId) {
    await emitAudit(request, `${deniedAction}.denied`, 'client', 'collection', session);
    writeJson(response, 403, { error: 'Access to this resource is not permitted' });
    return false;
  }

  let clientIds;
  if (process.env.DB_NAME) {
    const [rows] = await pool.query(
      'SELECT id FROM clients WHERE tenant_id = ? AND primary_counselor_id = ?',
      [callerTenant(request, session), counselorScopeId],
    );
    clientIds = new Set(rows.map((row) => row.id));
  } else {
    clientIds = new Set(
      clients
        .filter((client) => client.tenantId === callerTenant(request, session) && client.primaryCounselorId === counselorScopeId)
        .map((client) => client.id),
    );
  }

  return { counselorScopeId, clientIds };
}

function scopeOperationsDataToCounselor(data, counselorId) {
  if (!counselorId) return data;

  const scopedClients = (data.clients ?? []).filter((client) => client.primaryCounselorId === counselorId);
  const scopedClientIds = new Set(scopedClients.map((client) => client.id));

  return {
    ...data,
    clients: scopedClients,
    staff: (data.staff ?? []).filter((staff) => staff.id === counselorId),
    appointments: (data.appointments ?? []).filter((appointment) => (
      appointment.counselorId === counselorId
      || (appointment.clientId && scopedClientIds.has(appointment.clientId))
    )),
    notes: (data.notes ?? []).filter((note) => note.clientId && scopedClientIds.has(note.clientId)),
    intakePackets: (data.intakePackets ?? []).filter((item) => item.clientId && scopedClientIds.has(item.clientId)),
    documentAssignments: (data.documentAssignments ?? []).filter((item) => item.assigneeId && scopedClientIds.has(item.assigneeId)),
    formAssignments: (data.formAssignments ?? []).filter((item) => item.clientId && scopedClientIds.has(item.clientId)),
    formSubmissions: (data.formSubmissions ?? []).filter((item) => item.clientId && scopedClientIds.has(item.clientId)),
    portalRegistrationRequests: [],
    portalAppointmentRequests: (data.portalAppointmentRequests ?? []).filter((item) => item.clientId && scopedClientIds.has(item.clientId)),
  };
}

function generateTemporaryPassword() {
  return `Temp#${crypto.randomBytes(10).toString('base64url')}Aa1`;
}

function requirePracticeAdmin(request, response, session) {
  const role = callerRole(request, session);
  if (role === 'platform_admin' || role === 'practice_owner' || role === 'practice_admin') return false;
  writeJson(response, 403, { error: 'Admin role required' });
  return true;
}

function requirePlatformAdmin(request, response, session) {
  const role = callerRole(request, session);
  if (role === 'platform_admin') return false;
  writeJson(response, 403, { error: 'Platform admin role required' });
  return true;
}

async function resolvePortalClient(request, response, requestedClientId, session = null) {
  const role = callerRole(request, session);
  const requested = sanitizeStr(requestedClientId, 50);

  if (role === 'client') {
    const callerClient = callerClientId(request, session) ?? requested;
    if (!callerClient) {
      writeJson(response, 401, { error: 'Client identity required' });
      return null;
    }

    let client;
    if (process.env.DB_NAME) {
      const [rows] = await pool.query('SELECT id, tenant_id, first_name_enc, last_name_enc FROM clients WHERE id = ?', [callerClient]);
      client = rows[0] ? { id: rows[0].id, tenantId: rows[0].tenant_id, firstName: decrypt(rows[0].first_name_enc), lastName: decrypt(rows[0].last_name_enc) } : null;
    } else {
      client = clients.find((item) => item.id === callerClient) ?? null;
    }

    if (!client) {
      writeJson(response, 404, { error: 'Client not found' });
      return null;
    }

    if (enforceTenantScope(request, response, client.tenantId, session)) return null;
    if (requested && requested !== callerClient) {
      writeJson(response, 403, { error: 'Access to this resource is not permitted' });
      return null;
    }

    return client;
  }

  if (requested) {
    let client;
    if (process.env.DB_NAME) {
      const [rows] = await pool.query('SELECT id, tenant_id, first_name_enc, last_name_enc FROM clients WHERE id = ?', [requested]);
      client = rows[0] ? { id: rows[0].id, tenantId: rows[0].tenant_id, firstName: decrypt(rows[0].first_name_enc), lastName: decrypt(rows[0].last_name_enc) } : null;
    } else {
      client = clients.find((item) => item.id === requested) ?? null;
    }

    if (!client) {
      writeJson(response, 400, { error: 'Valid clientId is required' });
      return null;
    }
    if (enforceTenantScope(request, response, client.tenantId, session)) return null;
    return client;
  }

  if (process.env.DB_NAME) {
    const [rows] = await pool.query('SELECT id, tenant_id, first_name_enc, last_name_enc FROM clients WHERE tenant_id = ? LIMIT 1', [tenantId]);
    if (!rows[0]) {
      writeJson(response, 404, { error: 'No client records found for tenant' });
      return null;
    }
    return { id: rows[0].id, tenantId: rows[0].tenant_id, firstName: decrypt(rows[0].first_name_enc), lastName: decrypt(rows[0].last_name_enc) };
  }

  const fallbackClient = clients.find((item) => item.tenantId === tenantId);
  if (!fallbackClient) {
    writeJson(response, 404, { error: 'No client records found for tenant' });
    return null;
  }

  return fallbackClient;
}

function filterByTenant(items, request, session) {
  const role = callerRole(request, session);
  if (role === 'platform_admin') return items;
  const tenantId = callerTenant(request, session);
  return items.filter((item) => item.tenantId === tenantId);
}

function extractClientIdForSegment(pathname, segment) {
  const prefix = '/v1/clients/';
  const suffix = `/${segment}`;
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  return pathname.slice(prefix.length, -suffix.length);
}

function getOrCreateLifecycle(client) {
  if (!clientLifecycles[client.id]) {
    clientLifecycles[client.id] = {
      tenantId: client.tenantId,
      clientId: client.id,
      caseStatus: normalizeCaseStatus(client.status) ?? 'active',
      referralSource: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        authorized: false,
      },
      dischargeRecord: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return clientLifecycles[client.id];
}

/**
 * Sanitize a user-supplied string: strip null bytes, control characters,
 * and enforce a maximum length. Returns the cleaned string or null if the
 * result is empty after trimming.
 */
function sanitizeStr(raw, maxLen = 200) {
  if (typeof raw !== 'string') return null;
  // Strip null bytes and ASCII control characters (except common whitespace)
  const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

async function handleMonitoringDb(response) {
  if (!process.env.DB_NAME) {
    writeJson(response, 200, { collectedAt: new Date().toISOString(), mode: 'unavailable', reason: 'DB_NAME not configured' });
    return;
  }

  const [allStatusRows] = await pool.query('SHOW GLOBAL STATUS');
  const [allVarRows]    = await pool.query('SHOW GLOBAL VARIABLES');

  const WANTED_STATUS = new Set([
    'Uptime','Threads_connected','Threads_running','Max_used_connections',
    'Questions','Slow_queries','Com_select','Com_insert','Com_update','Com_delete',
    'Innodb_buffer_pool_pages_total','Innodb_buffer_pool_pages_free',
    'Innodb_buffer_pool_read_requests','Innodb_buffer_pool_reads',
    'Bytes_received','Bytes_sent',
  ]);
  const WANTED_VARS = new Set(['max_connections','innodb_buffer_pool_size']);

  const statusRows = allStatusRows.filter((r) => WANTED_STATUS.has(r.Variable_name))
    .map((r) => ({ name: r.Variable_name, value: r.Value }));
  const varRows = allVarRows.filter((r) => WANTED_VARS.has(r.Variable_name))
    .map((r) => ({ name: r.Variable_name, value: r.Value }));

  const [tableRows] = await pool.query(
    `SELECT table_name AS name,
            COALESCE(table_rows, 0) AS row_count,
            ROUND((COALESCE(data_length,0) + COALESCE(index_length,0)) / 1024, 1) AS size_kb
     FROM information_schema.TABLES
     WHERE table_schema = ? AND table_type = 'BASE TABLE'
     ORDER BY (COALESCE(data_length,0) + COALESCE(index_length,0)) DESC`,
    [process.env.DB_NAME]
  );

  const stat = Object.fromEntries(statusRows.map((r) => [r.name, Number(r.value)]));
  const vars = Object.fromEntries(varRows.map((r) => [r.name, Number(r.value)]));

  const bpTotal = stat.Innodb_buffer_pool_pages_total || 1;
  const bpFree  = stat.Innodb_buffer_pool_pages_free  || 0;
  const bpReads = stat.Innodb_buffer_pool_reads        || 0;
  const bpReqs  = stat.Innodb_buffer_pool_read_requests || 1;

  writeJson(response, 200, {
    collectedAt: new Date().toISOString(),
    mode: 'live',
    uptime: { seconds: stat.Uptime || 0 },
    connections: {
      current:    stat.Threads_connected    || 0,
      running:    stat.Threads_running      || 0,
      maxUsed:    stat.Max_used_connections || 0,
      maxAllowed: vars.max_connections      || 0,
    },
    queries: {
      total:   stat.Questions    || 0,
      slow:    stat.Slow_queries || 0,
      selects: stat.Com_select   || 0,
      inserts: stat.Com_insert   || 0,
      updates: stat.Com_update   || 0,
      deletes: stat.Com_delete   || 0,
    },
    bufferPool: {
      pagesTotal: bpTotal,
      pagesFree:  bpFree,
      pagesUsed:  bpTotal - bpFree,
      hitRatio:   bpReqs > 0 ? Number(((1 - bpReads / bpReqs) * 100).toFixed(2)) : 100,
      sizeBytes:  vars.innodb_buffer_pool_size || 0,
    },
    throughput: {
      bytesReceived: stat.Bytes_received || 0,
      bytesSent:     stat.Bytes_sent     || 0,
    },
    tables: tableRows.map((r) => ({
      name:   r.name,
      rows:   Number(r.row_count) || 0,
      sizeKb: Number(r.size_kb)   || 0,
    })),
  });
}

function resolveRoute(pathname) {
  if (pathname === '/health' || pathname === '/health/live') return '/health/live';
  if (pathname === '/health/ready') return '/health/ready';
  if (pathname === '/openapi.yaml') return '/openapi.yaml';
  if (pathname === '/docs' || pathname === '/docs/') return '/docs';
  if (pathname === '/v1/auth/login') return '/v1/auth/login';
  if (pathname === '/v1/auth/logout') return '/v1/auth/logout';
  if (pathname === '/v1/auth/me') return '/v1/auth/me';
  if (pathname === '/v1/auth/change-password') return '/v1/auth/change-password';
  if (pathname === '/v1/auth/portal-password-reset-request') return '/v1/auth/portal-password-reset-request';
  if (pathname === '/v1/auth/portal-password-reset') return '/v1/auth/portal-password-reset';
  if (pathname === '/v1/appointment-types') return '/v1/appointment-types';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/lifecycle')) return '/v1/clients/:id/lifecycle';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/consents')) return '/v1/clients/:id/consents';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/intake-packets')) return '/v1/clients/:id/intake-packets';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/intake-preview')) return '/v1/clients/:id/intake-preview';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/treatment-plan')) return '/v1/clients/:id/treatment-plan';
  if (pathname.startsWith('/v1/clients/') && pathname.endsWith('/progress-notes')) return '/v1/clients/:id/progress-notes';
  if (pathname.startsWith('/v1/document-templates/')) return '/v1/document-templates/:id';
  if (pathname === '/v1/document-templates') return '/v1/document-templates';
  if (pathname === '/v1/document-assignments') return '/v1/document-assignments';
  if (pathname.startsWith('/v1/inventory-definitions/')) return '/v1/inventory-definitions/:id';
  if (pathname === '/v1/inventory-definitions') return '/v1/inventory-definitions';
  if (pathname === '/v1/inventory-assignments') return '/v1/inventory-assignments';
  if (pathname === '/v1/scheduling/calendar') return '/v1/scheduling/calendar';
  if (pathname === '/v1/reminders') return '/v1/reminders';
  if (pathname === '/v1/waitlist') return '/v1/waitlist';
  if (pathname === '/v1/operations/summary') return '/v1/operations/summary';
  if (pathname === '/v1/reference/dsm5-tr') return '/v1/reference/dsm5-tr';
  if (pathname === '/v1/monitoring/db') return '/v1/monitoring/db';
  if (pathname === '/v1/billing/service-codes') return '/v1/billing/service-codes';
  if (pathname === '/v1/billing/fee-schedules') return '/v1/billing/fee-schedules';
  if (pathname === '/v1/billing/invoices') return '/v1/billing/invoices';
  if (pathname === '/v1/billing/payments') return '/v1/billing/payments';
  if (pathname === '/v1/billing/superbills') return '/v1/billing/superbills';
  if (pathname === '/v1/billing/claims') return '/v1/billing/claims';
  if (pathname === '/v1/billing/reports/aging') return '/v1/billing/reports/aging';
  if (pathname === '/v1/portal/public-config') return '/v1/portal/public-config';
  if (pathname === '/v1/portal/settings') return '/v1/portal/settings';
  if (pathname === '/v1/portal/overview') return '/v1/portal/overview';
  if (pathname === '/v1/portal/accounts') return '/v1/portal/accounts';
  if (pathname === '/v1/portal/profile') return '/v1/portal/profile';
  if (pathname === '/v1/portal/intake-packets') return '/v1/portal/intake-packets';
  if (pathname === '/v1/portal/documents') return '/v1/portal/documents';
  if (pathname === '/v1/portal/uploads') return '/v1/portal/uploads';
  if (pathname === '/v1/portal/appointment-requests') return '/v1/portal/appointment-requests';
  if (pathname === '/v1/portal/messages') return '/v1/portal/messages';
  if (pathname === '/v1/portal/resources') return '/v1/portal/resources';
  if (pathname === '/v1/portal/data-rights') return '/v1/portal/data-rights';
  if (pathname === '/v1/portal/data-rights/review') return '/v1/portal/data-rights/review';
  if (pathname.startsWith('/v1/offerings/')) return '/v1/offerings/:id';
  if (pathname === '/v1/workflows/recommendations/state') return '/v1/workflows/recommendations/state';
  if (pathname.startsWith('/v1/workflows/recommendations/state/')) return '/v1/workflows/recommendations/state/:id';
  if (pathname === '/v1/faith/overview') return '/v1/faith/overview';
  if (pathname === '/v1/faith/note-templates') return '/v1/faith/note-templates';
  if (pathname === '/v1/faith/treatment-goals') return '/v1/faith/treatment-goals';
  if (pathname === '/v1/faith/consent-variants') return '/v1/faith/consent-variants';
  if (pathname === '/v1/faith/resources') return '/v1/faith/resources';
  if (pathname === '/v1/faith/inventories') return '/v1/faith/inventories';
  if (pathname === '/v1/faith/referral-coordination') return '/v1/faith/referral-coordination';
  if (pathname === '/v1/faith/language-preferences') return '/v1/faith/language-preferences';
  if (pathname === '/v1/reporting/overview') return '/v1/reporting/overview';
  if (pathname === '/v1/audit/intelligence' || pathname === '/v1/audit/intelligence/') return '/v1/audit/intelligence';
  if (pathname === '/v1/platform/overview') return '/v1/platform/overview';
  if (pathname === '/v1/platform/tenant-provisioning') return '/v1/platform/tenant-provisioning';
  if (pathname === '/v1/platform/impersonation-sessions') return '/v1/platform/impersonation-sessions';
  if (pathname.startsWith('/v1/platform/impersonation-sessions/')) return '/v1/platform/impersonation-sessions/:id';
  if (pathname === '/v1/platform/data-exports') return '/v1/platform/data-exports';
  if (pathname === '/v1/platform/retention-policies') return '/v1/platform/retention-policies';
  if (pathname.startsWith('/v1/clients/')) return '/v1/clients/:id';
  if (pathname.startsWith('/v1/appointments/')) return '/v1/appointments/:id';
  if (pathname.startsWith('/v1/practices/')) return '/v1/practices/:id';
  if (pathname.startsWith('/v1/locations/')) return '/v1/locations/:id';
  if (pathname.startsWith('/v1/staff/') && pathname.endsWith('/availability')) return '/v1/staff/:id/availability';
  if (pathname.startsWith('/v1/staff/')) return '/v1/staff/:id';
  if (pathname.startsWith('/v1/i18n/catalog/')) return '/v1/i18n/catalog/:locale';
  if (pathname.startsWith('/v1/i18n/settings/')) return '/v1/i18n/settings/:locale';
  return pathname;
}

function buildLiveHealthResponse() {
  const timestamp = new Date().toISOString();
  return {
    status: 'ok',
    service: 'api',
    mode: 'live',
    timestamp,
  };
}

async function buildReadinessHealthResponse() {
  const startedAt = performance.now();
  const timestamp = new Date().toISOString();
  const dependencies = {};
  const checks = {};

  if (!process.env.DB_NAME) {
    const durationMs = performance.now() - startedAt;
    dependencies.db = {
      status: 'degraded',
      configured: false,
      observedAt: timestamp,
    };
    checks.db = {
      status: 'degraded',
      durationMs: roundMetric(durationMs),
      observedAt: timestamp,
      detail: 'DB_NAME is not configured; API is running in memory-only mode',
    };

    telemetry.recordHealthCheck('db', durationMs, 'degraded', { configured: 'false' });
    telemetry.updateHealth({
      serviceStatus: 1,
      dependencies: {
        db: {
          status: 1,
          observedAt: timestamp,
        },
      },
      checks: {
        db: {
          status: 1,
          observedAt: timestamp,
          durationMs,
          detail: checks.db.detail,
        },
      },
    });

    return {
      httpStatus: 200,
      body: {
        status: 'degraded',
        service: 'api',
        mode: 'ready',
        timestamp,
        dependencies,
        checks,
      },
    };
  }

  try {
    await verifyConnection();
    const durationMs = performance.now() - startedAt;
    dependencies.db = {
      status: 'ok',
      configured: true,
      observedAt: timestamp,
    };
    checks.db = {
      status: 'ok',
      durationMs: roundMetric(durationMs),
      observedAt: timestamp,
      detail: 'database ping succeeded',
    };

    telemetry.recordHealthCheck('db', durationMs, 'ok', { configured: 'true' });
    telemetry.updateHealth({
      serviceStatus: 2,
      dependencies: {
        db: {
          status: 2,
          observedAt: timestamp,
        },
      },
      checks: {
        db: {
          status: 2,
          observedAt: timestamp,
          durationMs,
          detail: checks.db.detail,
        },
      },
    });

    return {
      httpStatus: 200,
      body: {
        status: 'ok',
        service: 'api',
        mode: 'ready',
        timestamp,
        dependencies,
        checks,
      },
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    dependencies.db = {
      status: 'error',
      configured: true,
      observedAt: timestamp,
    };
    checks.db = {
      status: 'error',
      durationMs: roundMetric(durationMs),
      observedAt: timestamp,
      detail: error.message || 'database ping failed',
    };

    telemetry.recordHealthCheck('db', durationMs, 'error', { configured: 'true' });
    telemetry.updateHealth({
      serviceStatus: 0,
      dependencies: {
        db: {
          status: 0,
          observedAt: timestamp,
        },
      },
      checks: {
        db: {
          status: 0,
          observedAt: timestamp,
          durationMs,
          detail: checks.db.detail,
        },
      },
    });

    return {
      httpStatus: 503,
      body: {
        status: 'error',
        service: 'api',
        mode: 'ready',
        timestamp,
        dependencies,
        checks,
      },
    };
  }
}

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Emit an immutable, privacy-safe audit event.
 * When a session is provided, role/tenant/actorId are read from it.
 * Falls back to request headers for dev/test environments.
 * Never include PHI field values — only IDs and action names.
 */
async function emitAudit(request, action, targetType, targetId, session = null) {
  try {
    const metadata = deriveAuditMetadata(request, action, session);

    const event = createAuditEvent({
      tenantId: metadata.tenantId,
      action,
      targetType,
      targetId: String(targetId),
      occurredAt: new Date().toISOString(),
      actorRole: metadata.actorRole,
      actorId: metadata.actorId,
      actorType: metadata.actorType,
      requestId: metadata.requestId,
      result: metadata.result,
      reasonCode: metadata.reasonCode,
      sourceSurface: metadata.sourceSurface,
      sourceWorkflow: metadata.sourceWorkflow,
      systemComponent: metadata.systemComponent,
    });

    runtimeAuditEvents.push(event);
    if (runtimeAuditEvents.length > MAX_RUNTIME_AUDIT_EVENTS) {
      runtimeAuditEvents.splice(0, runtimeAuditEvents.length - MAX_RUNTIME_AUDIT_EVENTS);
    }

    logInfo('audit.event', { audit: event });

    const mutationAttributes = featureFlags.tenantTelemetry
      ? { tenantId: normalizeTenantId(metadata.tenantId) ?? 'unknown' }
      : {};
    telemetry.recordMutation(`audit.${action}`, 'success', mutationAttributes);

    // Persist to DB when available (append-only, never update/delete).
    if (process.env.DB_NAME) {
      await pool.query(
        `INSERT INTO audit_events
           (id, tenant_id, actor_id, actor_role, actor_type, action, target_type, target_id,
            result, reason_code, occurred_at, request_id, source_surface, source_workflow, system_component)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.tenantId,
          event.actorId,
          event.actorRole,
          event.actorType,
          event.action,
          event.targetType,
          String(targetId),
          event.result,
          event.reasonCode,
          new Date(event.occurredAt),
          event.requestId ?? null,
          event.sourceSurface,
          event.sourceWorkflow,
          event.systemComponent,
        ],
      );
    }
  } catch (auditError) {
    // Audit failure must never suppress the primary operation.
    logError('audit.write_failed', {
      requestId: request.requestId || normalizeRequestId(request.headers['x-request-id']) || 'unknown',
      action,
      targetType,
      targetId: String(targetId),
      error: auditError,
    });
  }
}

function renderSwaggerUiHtml(specUrl) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Faith Counseling API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; }
      body { background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        validatorUrl: null,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
      });
    </script>
  </body>
</html>`;
}
