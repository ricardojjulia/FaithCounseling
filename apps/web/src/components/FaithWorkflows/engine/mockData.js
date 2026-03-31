/**
 * Faithful Workflows — Mock Client Data
 *
 * Five representative clients covering the full urgency range.
 * Each entry includes the expected workflow output for documentation/testing.
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function iso(str) { return new Date(str).toISOString(); }

// ─── Client 1: Emma R. — Critical ────────────────────────────────────────────
// PHQ-9 22 (severe, SI on item 9), 2 consecutive no-shows, no safety plan,
// MDD diagnosis with no matching treatment goal, Methodist faith profile.

export const mockEmma = {
  client: {
    id: 'mock-client-emma',
    firstName: 'Emma',
    lastName: 'R.',
    status: 'active',
    highTouchpoint: true,
    faithBackground: 'Methodist',
    dateOfBirth: '1988-04-12',
    createdAt: daysAgo(180),
  },
  diagnoses: [
    { id: 'dx-1', code: 'F32.2', description: 'Major Depressive Disorder, Severe', primary: true },
  ],
  progressNotes: [
    {
      id: 'note-emma-1',
      noteType: 'progress_note',
      summary: 'Client reported persistent hopelessness and passive suicidal ideation.',
      locked: true,
      createdAt: daysAgo(10),
      appointmentId: 'appt-emma-past-1',
    },
  ],
  treatmentPlan: {
    id: 'tp-emma',
    status: 'active',
    goals: [],
    lastReviewedAt: daysAgo(95),
    updatedAt: daysAgo(95),
  },
  faithProfile: {
    id: 'fp-emma',
    tradition: 'methodist',
    integratesFaith: true,
    notes: 'Attends church regularly; faith is important anchor during crisis.',
  },
  appointments: [
    { id: 'appt-emma-past-1', status: 'completed', startsAt: daysAgo(17), durationMinutes: 50 },
    { id: 'appt-emma-ns-1',   status: 'no_show',   startsAt: daysAgo(10), durationMinutes: 50 },
    { id: 'appt-emma-ns-2',   status: 'no_show',   startsAt: daysAgo(3),  durationMinutes: 50 },
  ],
  assessments: [
    { id: 'phq-emma-1', inventoryName: 'PHQ-9', score: 14, item9Score: 0, scoredAt: daysAgo(45) },
    { id: 'phq-emma-2', inventoryName: 'PHQ-9', score: 18, item9Score: 1, scoredAt: daysAgo(17) },
    { id: 'phq-emma-3', inventoryName: 'PHQ-9', score: 22, item9Score: 3, scoredAt: daysAgo(10) },
    { id: 'pcl-emma-1', inventoryName: 'PCL-5', score: 38, scoredAt: daysAgo(17) },
  ],
  status: 'ready',
  errorMessage: null,
};

// Expected workflow for Emma:
// [SAFETY]   PHQ-9 22 — severe, immediate review               priority 10  confidence 1.0
// [SAFETY]   PHQ-9 item 9 = 3 — active suicidal ideation       priority 10  confidence 1.0
// [SAFETY]   2 consecutive no-shows — welfare check            priority  9  confidence 0.95
// [CLINICAL] No treatment goals for MDD                         priority  8  confidence 0.90
// [CLINICAL] Stale treatment plan (95 days)                     priority  7  confidence 1.0
// [SPIRITUAL] Faith-integrated crisis support available (opt)   priority  2  confidence 0.70

// ─── Client 2: Marcus T. — High ──────────────────────────────────────────────
// PHQ-9 trending 12→16→18 (worsening), GAD-7 15, stale plan (95d), incomplete homework.

export const mockMarcus = {
  client: {
    id: 'mock-client-marcus',
    firstName: 'Marcus',
    lastName: 'T.',
    status: 'active',
    highTouchpoint: false,
    faithBackground: 'Non-denominational',
    dateOfBirth: '1995-08-30',
    createdAt: daysAgo(220),
  },
  diagnoses: [
    { id: 'dx-m1', code: 'F41.1', description: 'Generalized Anxiety Disorder', primary: true },
    { id: 'dx-m2', code: 'F32.1', description: 'Major Depressive Disorder, Moderate', primary: false },
  ],
  progressNotes: [
    { id: 'note-m1', noteType: 'progress_note', summary: 'Reviewed anxiety triggers. Assigned thought record homework.', locked: true, createdAt: daysAgo(14), appointmentId: 'appt-m2' },
    { id: 'note-m2', noteType: 'progress_note', summary: 'PHQ-9 elevated. Discussed increasing session frequency.', locked: true, createdAt: daysAgo(28), appointmentId: 'appt-m1' },
  ],
  treatmentPlan: {
    id: 'tp-marcus',
    status: 'active',
    goals: [
      { id: 'g-m1', description: 'Reduce anxiety symptoms', targetDate: daysAgo(10), status: 'in_progress' },
    ],
    lastReviewedAt: daysAgo(95),
    updatedAt: daysAgo(95),
  },
  faithProfile: {
    id: 'fp-marcus',
    tradition: 'non_denominational',
    integratesFaith: false,
    notes: '',
  },
  appointments: [
    { id: 'appt-m1', status: 'completed', startsAt: daysAgo(28), durationMinutes: 50 },
    { id: 'appt-m2', status: 'completed', startsAt: daysAgo(14), durationMinutes: 50 },
  ],
  assessments: [
    { id: 'phq-m1', inventoryName: 'PHQ-9', score: 12, scoredAt: daysAgo(56) },
    { id: 'phq-m2', inventoryName: 'PHQ-9', score: 16, scoredAt: daysAgo(28) },
    { id: 'phq-m3', inventoryName: 'PHQ-9', score: 18, scoredAt: daysAgo(14) },
    { id: 'gad-m1', inventoryName: 'GAD-7', score: 15, scoredAt: daysAgo(14) },
  ],
  // Simulated pending homework (no submission for assigned thought record)
  homeworkPending: [{ id: 'hw-m1', title: 'Thought Record', assignedAt: daysAgo(14), submittedAt: null }],
  status: 'ready',
  errorMessage: null,
};

// Expected workflow for Marcus:
// [CLINICAL] PHQ-9 worsening (12→16→18)         priority 8  confidence 0.85
// [CLINICAL] Stale treatment plan (95 days)       priority 7  confidence 1.0
// [CLINICAL] GAD-7 ≥ 15 — medication consult     priority 6  confidence 0.80
// [SESSION]  Overdue treatment goal               priority 5  confidence 0.90
// [HOMEWORK] Pending thought record               priority 5  confidence 1.0
// [MONITORING] PHQ-9 reassessment recommended     priority 4  confidence 0.90

// ─── Client 3: Priya K. — Moderate ───────────────────────────────────────────
// Active, PHQ-9 9 (mild/stable), no note in 35d, no assessments in 95d,
// overdue goal, no insurance on file, no faith integration.

export const mockPriya = {
  client: {
    id: 'mock-client-priya',
    firstName: 'Priya',
    lastName: 'K.',
    status: 'active',
    highTouchpoint: false,
    faithBackground: null,
    dateOfBirth: '1990-11-05',
    createdAt: daysAgo(310),
  },
  diagnoses: [
    { id: 'dx-p1', code: 'F41.1', description: 'Generalized Anxiety Disorder', primary: true },
  ],
  progressNotes: [
    { id: 'note-p1', noteType: 'progress_note', summary: 'Discussed avoidance patterns.', locked: true, createdAt: daysAgo(35), appointmentId: 'appt-p1' },
  ],
  treatmentPlan: {
    id: 'tp-priya',
    status: 'active',
    goals: [
      { id: 'g-p1', description: 'Reduce avoidance behaviors', targetDate: daysAgo(15), status: 'in_progress' },
    ],
    lastReviewedAt: daysAgo(42),
    updatedAt: daysAgo(42),
  },
  faithProfile: null,
  appointments: [
    { id: 'appt-p1', status: 'completed', startsAt: daysAgo(35), durationMinutes: 50 },
  ],
  assessments: [
    { id: 'phq-p1', inventoryName: 'PHQ-9', score: 9, scoredAt: daysAgo(95) },
  ],
  insurance: null,
  status: 'ready',
  errorMessage: null,
};

// Expected workflow for Priya:
// [CLINICAL]     No progress note in 35 days                     priority 6  confidence 1.0
// [MONITORING]   Reassessment overdue — 95 days since PHQ-9      priority 5  confidence 1.0
// [SESSION]      Treatment goal overdue: Reduce avoidance        priority 5  confidence 0.90
// [COORDINATION] Insurance not on file                           priority 3  confidence 1.0

// ─── Client 4: David L. — Routine ────────────────────────────────────────────
// Stable (PHQ-9 6, GAD-7 4), plan current, notes current, Baptist opt-in,
// no homework in last 2 sessions.

export const mockDavid = {
  client: {
    id: 'mock-client-david',
    firstName: 'David',
    lastName: 'L.',
    status: 'active',
    highTouchpoint: false,
    faithBackground: 'Baptist',
    dateOfBirth: '1978-02-14',
    createdAt: daysAgo(400),
  },
  diagnoses: [
    { id: 'dx-d1', code: 'F34.1', description: 'Persistent Depressive Disorder (Dysthymia)', primary: true },
  ],
  progressNotes: [
    { id: 'note-d1', noteType: 'progress_note', summary: 'Good session. Client reports mood improvement. No homework this week.', locked: true, createdAt: daysAgo(7), appointmentId: 'appt-d2' },
    { id: 'note-d2', noteType: 'progress_note', summary: 'Reviewed progress. Discussed faith community support. No homework assigned.', locked: true, createdAt: daysAgo(21), appointmentId: 'appt-d1' },
  ],
  treatmentPlan: {
    id: 'tp-david',
    status: 'active',
    goals: [
      { id: 'g-d1', description: 'Increase engagement with faith community', targetDate: daysAgo(-30), status: 'in_progress' },
    ],
    lastReviewedAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  faithProfile: {
    id: 'fp-david',
    tradition: 'baptist',
    integratesFaith: true,
    notes: 'Client is deeply involved in church; uses Scripture for coping.',
  },
  appointments: [
    { id: 'appt-d1', status: 'completed', startsAt: daysAgo(21), durationMinutes: 50 },
    { id: 'appt-d2', status: 'completed', startsAt: daysAgo(7),  durationMinutes: 50 },
  ],
  assessments: [
    { id: 'phq-d1', inventoryName: 'PHQ-9', score: 8, scoredAt: daysAgo(30) },
    { id: 'phq-d2', inventoryName: 'PHQ-9', score: 6, scoredAt: daysAgo(7) },
    { id: 'gad-d1', inventoryName: 'GAD-7', score: 4, scoredAt: daysAgo(7) },
  ],
  status: 'ready',
  errorMessage: null,
};

// Expected workflow for David:
// [HOMEWORK]   No between-session homework in 2 sessions         priority 4  confidence 0.90
// [SPIRITUAL]  Biblical integration modality available (opt)     priority 3  confidence 0.80
// [SPIRITUAL]  Suggest Scripture journaling exercise (opt)       priority 2  confidence 0.75

// ─── Client 5: Sarah M. — Discharge candidate ────────────────────────────────
// All goals met, PHQ-9 4, status completing, no active concerns.

export const mockSarah = {
  client: {
    id: 'mock-client-sarah',
    firstName: 'Sarah',
    lastName: 'M.',
    status: 'active',
    highTouchpoint: false,
    faithBackground: 'Evangelical',
    dateOfBirth: '1985-07-22',
    createdAt: daysAgo(500),
  },
  diagnoses: [
    { id: 'dx-s1', code: 'F43.10', description: 'Post-Traumatic Stress Disorder, Unspecified', primary: true },
  ],
  progressNotes: [
    { id: 'note-s1', noteType: 'progress_note', summary: 'All goals met. Client reports sustained symptom remission. Discussed transition planning.', locked: true, createdAt: daysAgo(7), appointmentId: 'appt-s3' },
  ],
  treatmentPlan: {
    id: 'tp-sarah',
    status: 'active',
    goals: [
      { id: 'g-s1', description: 'Reduce trauma-related nightmares', targetDate: daysAgo(30), status: 'completed' },
      { id: 'g-s2', description: 'Resume work with reduced avoidance', targetDate: daysAgo(30), status: 'completed' },
      { id: 'g-s3', description: 'Establish stable support network', targetDate: daysAgo(30), status: 'completed' },
    ],
    lastReviewedAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  faithProfile: {
    id: 'fp-sarah',
    tradition: 'evangelical',
    integratesFaith: true,
    notes: 'Faith has been central to healing journey.',
  },
  appointments: [
    { id: 'appt-s1', status: 'completed', startsAt: daysAgo(35), durationMinutes: 50 },
    { id: 'appt-s2', status: 'completed', startsAt: daysAgo(21), durationMinutes: 50 },
    { id: 'appt-s3', status: 'completed', startsAt: daysAgo(7),  durationMinutes: 50 },
  ],
  assessments: [
    { id: 'phq-s1', inventoryName: 'PHQ-9', score: 8, scoredAt: daysAgo(35) },
    { id: 'phq-s2', inventoryName: 'PHQ-9', score: 5, scoredAt: daysAgo(21) },
    { id: 'phq-s3', inventoryName: 'PHQ-9', score: 4, scoredAt: daysAgo(7) },
    { id: 'pcl-s1', inventoryName: 'PCL-5', score: 22, scoredAt: daysAgo(7) },
  ],
  status: 'ready',
  errorMessage: null,
};

// Expected workflow for Sarah:
// [MONITORING]   Discharge planning — all goals met             priority 4  confidence 0.85
// [COORDINATION] Closing summary note recommended               priority 3  confidence 0.90
// [SPIRITUAL]    Offer transition/blessing prayer (opt)         priority 1  confidence 0.60

// ─── Export all mock clients ──────────────────────────────────────────────────

export const MOCK_CLIENTS = [mockEmma, mockMarcus, mockPriya, mockDavid, mockSarah];

/**
 * Returns mock data for a given client id, or null if not found.
 * @param {string} clientId
 * @returns {import('./types.js').ClientWorkflowData|null}
 */
export function getMockClientData(clientId) {
  return MOCK_CLIENTS.find((c) => c.client.id === clientId) ?? null;
}
