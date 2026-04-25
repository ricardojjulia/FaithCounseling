export const staffRoles = Object.freeze([
  'platform_admin',
  'practice_owner',
  'practice_admin',
  'counselor',
  'intern',
  'scheduler_biller',
  'client',
]);

export const appointmentStatuses = Object.freeze([
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
]);

export const appointmentTypes = Object.freeze([
  'intake_assessment',
  'individual_therapy',
  'couples_therapy',
  'family_therapy',
  'group_therapy',
  'supervision',
]);

export const clientStatuses = Object.freeze([
  'active',
  'waitlist',
  'inactive',
  'discharged',
]);

export const practiceTypes = Object.freeze([
  'solo',
  'group',
  'multi_location',
]);

export const licenseTypes = Object.freeze([
  'lmft',
  'lpc',
  'lcsw',
  'psychologist',
  'pastoral_counselor',
]);

export const supervisionStatuses = Object.freeze([
  'not_required',
  'required',
  'active',
  'completed',
]);

export const counselingSpecialties = Object.freeze([
  'anxiety', 'depression', 'trauma', 'grief', 'marriage_couples', 'family',
  'addiction', 'eating_disorders', 'ocd', 'adhd', 'spiritual_formation',
  'biblical_counseling', 'premarital', 'parenting', 'adolescents',
  'mens_issues', 'womens_issues', 'personality_disorders', 'crisis',
]);

export const therapeuticModalities = Object.freeze([
  'cbt', 'emdr', 'dbt', 'gottman', 'eft', 'narrative', 'solution_focused',
  'psychodynamic', 'act', 'motivational_interviewing', 'play_therapy',
  'art_therapy', 'mindfulness', 'somatic', 'internal_family_systems',
  'biblical_integration',
]);

export const ageGroupsServed = Object.freeze([
  'children_0_5', 'children_6_12', 'adolescents', 'young_adults',
  'adults', 'older_adults', 'couples', 'families', 'groups',
]);

export const employmentTypes = Object.freeze([
  'full_time', 'part_time', 'contractor', 'intern', 'volunteer',
]);

export const employmentStatuses = Object.freeze([
  'active', 'on_leave', 'terminated',
]);

export const licenseStatuses = Object.freeze([
  'active', 'expired', 'inactive', 'pending_renewal',
]);

export const faithTraditions = Object.freeze([
  'non_denominational', 'baptist', 'reformed', 'methodist', 'lutheran',
  'catholic', 'pentecostal', 'evangelical', 'other',
]);

export const integrationStyles = Object.freeze([
  'always_offered', 'on_request', 'not_offered',
]);

export const consentTypes = Object.freeze([
  'informed_consent',
  'privacy_notice',
  'release_of_information',
  'telehealth_consent',
]);

export const consentStates = Object.freeze([
  'pending',
  'signed',
  'revoked',
  'expired',
]);

export const intakeStatuses = Object.freeze([
  'assigned',
  'in_progress',
  'completed',
  'reviewed',
]);

export const caseStatuses = Object.freeze([
  'active',
  'waitlist',
  'discharged',
  'inactive',
]);

export const treatmentPlanStatuses = Object.freeze([
  'draft',
  'active',
  'on_hold',
  'completed',
]);

export const progressNoteTypes = Object.freeze([
  'intake_note',
  'progress_note',
  'treatment_plan_review',
  'discharge_note',
  'internal_note',
]);

export const documentTemplateTypes = Object.freeze([
  'consent_form',
  'intake_form',
  'clinical_template',
  'resource_handout',
]);

export const documentAudienceTypes = Object.freeze([
  'client',
  'staff',
]);

export const documentAssignmentStatuses = Object.freeze([
  'assigned',
  'in_progress',
  'completed',
  'signed',
]);

export const inventoryCategories = Object.freeze([
  'standard_counseling',
  'spiritual_assessment',
  'custom',
]);

export const inventoryScoringMethods = Object.freeze([
  'sum',
  'average',
]);

export const inventoryAssignmentStatuses = Object.freeze([
  'assigned',
  'in_progress',
  'completed',
  'reviewed',
]);

export function createTenantScopedRecord(record) {
  if (!record?.tenantId) {
    throw new Error('tenantId is required for tenant-scoped records');
  }

  return Object.freeze({
    ...record,
    createdAt: record.createdAt ?? new Date().toISOString(),
  });
}

export function createAuditEvent(event) {
  const requiredFields = ['tenantId', 'action', 'targetType', 'targetId', 'occurredAt'];

  for (const field of requiredFields) {
    if (!event?.[field]) {
      throw new Error(`Missing audit field: ${field}`);
    }
  }

  return Object.freeze({
    id: crypto.randomUUID(),
    actorId: event.actorId ?? 'anonymous',
    actorRole: event.actorRole ?? 'unknown',
    actorType: event.actorType ?? 'anonymous',
    result: event.result ?? 'success',
    reasonCode: event.reasonCode ?? 'ok',
    sourceSurface: event.sourceSurface ?? 'api',
    sourceWorkflow: event.sourceWorkflow ?? 'request',
    systemComponent: event.systemComponent ?? 'churchcore-api',
    ...event,
  });
}

export function createPracticeRecord(record) {
  if (!record?.name) {
    throw new Error('name is required for practice records');
  }
  return createTenantScopedRecord({
    ...record,
    type: practiceTypes.includes(record.type) ? record.type : 'group',
    timezone: record.timezone ?? 'America/New_York',
  });
}

export function createLocationRecord(record) {
  if (!record?.name) {
    throw new Error('name is required for location records');
  }
  return createTenantScopedRecord({
    ...record,
    capacity: Number.isFinite(record.capacity) ? Number(record.capacity) : 1,
    remoteEnabled: Boolean(record.remoteEnabled),
  });
}

export function createStaffRecord(record) {
  if (!record?.firstName || !record?.lastName) {
    throw new Error('firstName and lastName are required for staff records');
  }
  if (!record?.role || !staffRoles.includes(record.role)) {
    throw new Error('valid role is required for staff records');
  }

  return createTenantScopedRecord({
    ...record,
    supervisionStatus: supervisionStatuses.includes(record.supervisionStatus)
      ? record.supervisionStatus
      : 'not_required',
    licenseType: licenseTypes.includes(record.licenseType)
      ? record.licenseType
      : 'pastoral_counselor',
  });
}

export function createConsentRecord(record) {
  if (!record?.clientId) {
    throw new Error('clientId is required for consent records');
  }
  return createTenantScopedRecord({
    ...record,
    consentType: consentTypes.includes(record.consentType) ? record.consentType : 'informed_consent',
    signatureState: consentStates.includes(record.signatureState) ? record.signatureState : 'pending',
    version: record.version ?? 'v1',
  });
}

export function createIntakePacketRecord(record) {
  if (!record?.clientId) {
    throw new Error('clientId is required for intake packet records');
  }
  return createTenantScopedRecord({
    ...record,
    status: intakeStatuses.includes(record.status) ? record.status : 'assigned',
    assignedForms: Array.isArray(record.assignedForms) ? record.assignedForms : [],
    submittedAt: record.submittedAt ?? null,
  });
}

export function createTreatmentPlanRecord(record) {
  if (!record?.clientId) {
    throw new Error('clientId is required for treatment plan records');
  }
  return createTenantScopedRecord({
    ...record,
    status: treatmentPlanStatuses.includes(record.status) ? record.status : 'draft',
    goals: Array.isArray(record.goals) ? record.goals : [],
    interventions: Array.isArray(record.interventions) ? record.interventions : [],
    reviewCadence: record.reviewCadence ?? 'monthly',
  });
}

export function createProgressNoteRecord(record) {
  if (!record?.clientId) {
    throw new Error('clientId is required for progress notes');
  }
  return createTenantScopedRecord({
    ...record,
    noteType: progressNoteTypes.includes(record.noteType) ? record.noteType : 'progress_note',
    locked: Boolean(record.locked),
    signedBy: record.signedBy ?? null,
    signedAt: record.signedAt ?? null,
  });
}

export function createDocumentTemplateRecord(record) {
  if (!record?.title) {
    throw new Error('title is required for document templates');
  }

  return createTenantScopedRecord({
    ...record,
    templateType: documentTemplateTypes.includes(record.templateType)
      ? record.templateType
      : 'clinical_template',
    audience: documentAudienceTypes.includes(record.audience) ? record.audience : 'client',
    templateKey: record.templateKey ?? record.title.toLowerCase().replace(/\s+/g, '_'),
    versionNumber: Number.isFinite(Number(record.versionNumber)) ? Number(record.versionNumber) : 1,
    contentBlocks: Array.isArray(record.contentBlocks) ? record.contentBlocks : [],
  });
}

export function createDocumentAssignmentRecord(record) {
  if (!record?.templateId) {
    throw new Error('templateId is required for document assignments');
  }
  if (!record?.assigneeId) {
    throw new Error('assigneeId is required for document assignments');
  }

  return createTenantScopedRecord({
    ...record,
    assigneeType: documentAudienceTypes.includes(record.assigneeType) ? record.assigneeType : 'client',
    status: documentAssignmentStatuses.includes(record.status) ? record.status : 'assigned',
    requiresSignature: Boolean(record.requiresSignature),
    dueAt: record.dueAt ?? null,
    completedAt: record.completedAt ?? null,
    accessHistory: Array.isArray(record.accessHistory) ? record.accessHistory : [],
  });
}

export function createInventoryDefinitionRecord(record) {
  if (!record?.name) {
    throw new Error('name is required for inventory definitions');
  }

  return createTenantScopedRecord({
    ...record,
    category: inventoryCategories.includes(record.category) ? record.category : 'custom',
    scoringMethod: inventoryScoringMethods.includes(record.scoringMethod) ? record.scoringMethod : 'sum',
    questionSchema: Array.isArray(record.questionSchema) ? record.questionSchema : [],
    versionNumber: Number.isFinite(Number(record.versionNumber)) ? Number(record.versionNumber) : 1,
  });
}

export function createInventoryAssignmentRecord(record) {
  if (!record?.inventoryId) {
    throw new Error('inventoryId is required for inventory assignments');
  }
  if (!record?.clientId) {
    throw new Error('clientId is required for inventory assignments');
  }

  return createTenantScopedRecord({
    ...record,
    status: inventoryAssignmentStatuses.includes(record.status) ? record.status : 'assigned',
    responses: Array.isArray(record.responses) ? record.responses : [],
    score: Number.isFinite(Number(record.score)) ? Number(record.score) : null,
    scoredAt: record.scoredAt ?? null,
    completedAt: record.completedAt ?? null,
  });
}

// ─── Faithful Workflows ──────────────────────────────────────────────────────

export const workflowCategories = Object.freeze([
  'safety',
  'clinical_caution',
  'session_focus',
  'homework',
  'relationship',
  'spiritual',
  'coordination',
  'monitoring',
]);

export const workflowUrgencyLevels = Object.freeze([
  'critical',
  'high',
  'moderate',
  'routine',
]);

export const workflowRecommendationStatuses = Object.freeze([
  'pending',
  'complete',
  'deferred',
  'hidden',
]);

export const workflowActionTypes = Object.freeze([
  'generate_session_agenda',
  'generate_note_prep',
  'suggest_verses',
  'create_prayer_prompt',
  'create_cbt_exercise',
  'create_journal_prompt',
  'draft_followup_message',
  'add_reminder_task',
  'create_treatment_plan_update',
  'mark_complete',
  'defer',
  'hide',
]);

export const workflowTrends = Object.freeze([
  'improving',
  'stable',
  'declining',
  'unknown',
]);
