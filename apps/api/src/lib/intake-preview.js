const INTAKE_FORM_KEYS = ['LongIntakeForm', 'ShortIntakeForm'];

const PREVIEW_DISCLAIMER =
  'AI-assisted and supportive only. Final clinical judgment belongs to the counselor. Crisis situations require immediate human intervention.';

function trimText(value, maxLength = 320) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? trimText(entry, 160) : null))
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n;,]+/)
    .map((entry) => trimText(entry, 160))
    .filter(Boolean);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function computeAgeBand(value) {
  const dob = normalizeDate(value);
  if (!dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = now.getUTCDate() - dob.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  if (age < 18) return 'under 18';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  return '65+';
}

function latestSubmissionMap(submissions = []) {
  const map = new Map();
  for (const item of submissions) {
    const key = trimText(item?.formKey, 120);
    if (!key) continue;
    const current = map.get(key);
    if (!current) {
      map.set(key, item);
      continue;
    }
    if (String(item?.submittedAt ?? '') > String(current?.submittedAt ?? '')) {
      map.set(key, item);
    }
  }
  return map;
}

function mergeResponses(map, formKeys) {
  return formKeys.reduce((acc, formKey) => {
    const responses = map.get(formKey)?.responses;
    if (!responses || typeof responses !== 'object') return acc;
    return { ...acc, ...responses };
  }, {});
}

function firstResponse(responses, keys) {
  for (const key of keys) {
    const value = responses?.[key];
    if (Array.isArray(value) && value.length) return value;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return value;
  }
  return null;
}

function hasKeyword(text, keywords) {
  const normalized = String(text ?? '').toLowerCase();
  if (!normalized) return false;
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isCancelledAppointment(item) {
  const status = String(item?.status ?? '').toLowerCase();
  return status === 'cancelled' || status === 'canceled';
}

function classifyScreeningUrgency(formKey, scoreValue, interpretationLabel) {
  const score = Number(scoreValue);
  if (formKey === 'PHQ9') {
    if (score >= 15) return 'critical';
    if (score >= 10) return 'moderate';
    return 'routine';
  }
  if (formKey === 'AnxietyAssessment') {
    if (score >= 15) return 'critical';
    if (score >= 10) return 'moderate';
    return 'routine';
  }
  if (formKey === 'PCL5') {
    if (score >= 33) return 'critical';
    if (score >= 20) return 'moderate';
    return 'routine';
  }
  if (formKey === 'AUDIT') {
    if (score >= 16) return 'critical';
    if (score >= 8) return 'moderate';
    return 'routine';
  }
  if (formKey === 'InsomniaSeverityIndex') {
    if (score >= 22) return 'critical';
    if (score >= 15) return 'moderate';
    return 'routine';
  }
  const label = String(interpretationLabel ?? '').toLowerCase();
  if (label.includes('severe') || label.includes('probable')) return 'critical';
  if (label.includes('moderate') || label.includes('significant') || label.includes('harmful')) return 'moderate';
  return 'routine';
}

function pushUnique(list, value) {
  const normalized = trimText(value, 220);
  if (!normalized || list.includes(normalized)) return;
  list.push(normalized);
}

function addRoute(routes, {
  id,
  title,
  confidence,
  basis,
  reviewPrompt,
}) {
  if (routes.some((item) => item.id === id)) return;
  routes.push({
    id,
    title,
    confidence,
    basis: basis.filter(Boolean).map((entry) => trimText(entry, 180)).filter(Boolean).slice(0, 3),
    reviewPrompt: trimText(reviewPrompt, 220),
  });
}

function compactFields(fields) {
  return fields.filter((field) => trimText(field?.value, 320));
}

export function buildIntakePreview({
  client,
  intakePacket = null,
  portalProfile = null,
  submissions = [],
  appointments = [],
}) {
  const latestForms = latestSubmissionMap(submissions);
  const intakeResponses = mergeResponses(latestForms, INTAKE_FORM_KEYS);
  const hasCompletedPacket = ['completed', 'reviewed'].includes(String(intakePacket?.status ?? '').toLowerCase());
  const hasIntakeFormSubmission = INTAKE_FORM_KEYS.some((formKey) => latestForms.has(formKey));
  const now = Date.now();
  const futureAppointments = appointments
    .filter((item) => !isCancelledAppointment(item))
    .filter((item) => {
      const startsAt = normalizeDate(item.startsAt ?? item.scheduledAt);
      return Boolean(startsAt && startsAt.getTime() >= now);
    })
    .sort((left, right) => String(left.startsAt ?? left.scheduledAt).localeCompare(String(right.startsAt ?? right.scheduledAt)));

  const eligible = hasCompletedPacket || hasIntakeFormSubmission;
  const reasons = [];
  if (!hasCompletedPacket && !hasIntakeFormSubmission) {
    reasons.push('Intake preview becomes available after intake paperwork is completed.');
  }

  const primaryConcern = trimText(firstResponse(intakeResponses, ['primaryConcern', 'concern']), 420);
  const secondaryConcern = trimText(firstResponse(intakeResponses, ['secondaryConcerns']), 320);
  const duration = trimText(firstResponse(intakeResponses, ['onsetDate', 'duration', 'anxietyDuration2', 'phq_duration']), 160);
  const severityValue = firstResponse(intakeResponses, ['severity']);
  const severity = severityValue == null ? null : String(severityValue);
  const dailyImpact = trimText(firstResponse(intakeResponses, ['dailyImpact', 'functionalImpact']), 360);
  const precipitatingEvent = trimText(firstResponse(intakeResponses, ['precipitatingEvent', 'phq_context']), 320);
  const priorAttempts = trimText(firstResponse(intakeResponses, ['priorAttempts']), 320);
  const whatHelps = trimText(firstResponse(intakeResponses, ['whatHelps', 'helpfulStrategies']), 260);
  const anxietyTriggers = trimText(firstResponse(intakeResponses, ['anxietyTriggers']), 260);
  const goals = trimText(firstResponse(intakeResponses, ['goals', 'successLooks']), 320);

  const genderIdentity = trimText(firstResponse(intakeResponses, ['gender']), 120);
  const pronouns = trimText(firstResponse(intakeResponses, ['pronouns']), 80)
    ?? trimText(portalProfile?.profileDetails?.demographics?.pronouns, 80);
  const maritalStatus = trimText(firstResponse(intakeResponses, ['maritalStatus']), 120)
    ?? trimText(portalProfile?.profileDetails?.demographics?.maritalStatus, 120);
  const livingSituation = trimText(firstResponse(intakeResponses, ['livingSituation']), 120);
  const occupation = trimText(firstResponse(intakeResponses, ['occupation']), 120)
    ?? trimText(portalProfile?.profileDetails?.education?.occupation, 120);
  const educationLevel = trimText(portalProfile?.profileDetails?.education?.level, 120);
  const city = trimText(firstResponse(intakeResponses, ['city']), 120);
  const state = trimText(firstResponse(intakeResponses, ['state']), 64);
  const faithBackground = trimText(firstResponse(intakeResponses, ['faithBackground']), 160)
    ?? trimText(client?.faithBackground, 160);
  const faithImportanceValue = parseNumber(firstResponse(intakeResponses, ['faithImportance']));
  const christianIntegration = trimText(firstResponse(intakeResponses, ['christianIntegration']), 120);
  const churchAffiliation = trimText(firstResponse(intakeResponses, ['churchAffiliation']), 120);
  const spiritualStrengths = trimText(firstResponse(intakeResponses, ['spiritualStrengths']), 260);
  const ageBand = computeAgeBand(firstResponse(intakeResponses, ['dob']));
  const priorDiagnosisList = toArray(firstResponse(intakeResponses, ['diagnosisDetails', 'diagnosisList']));
  const chronicConditionList = toArray(firstResponse(intakeResponses, ['chronicConditions']));
  const medicationList = toArray(firstResponse(intakeResponses, ['medicationList']));
  const previousTherapy = trimText(firstResponse(intakeResponses, ['previousTherapy', 'previousCounseling']), 80);
  const therapyDetails = trimText(firstResponse(intakeResponses, ['therapyDetails', 'previousCounselingDetails']), 220);
  const hospitalization = trimText(firstResponse(intakeResponses, ['psychiatricHospitalization']), 80);
  const hospitalizationDetails = trimText(firstResponse(intakeResponses, ['hospitalizationDetails']), 220);
  const attemptHistory = trimText(firstResponse(intakeResponses, ['attemptHistory']), 80);
  const suicidalHistory = trimText(firstResponse(intakeResponses, ['suicidalHistory']), 80);
  const selfHarmThoughts = trimText(firstResponse(intakeResponses, ['selfHarmThoughts']), 40);
  const suicidalThoughts = trimText(firstResponse(intakeResponses, ['suicidalThoughts']), 40);
  const phq9Submission = latestForms.get('PHQ9');
  const anxietySubmission = latestForms.get('AnxietyAssessment');
  const pcl5Submission = latestForms.get('PCL5');
  const auditSubmission = latestForms.get('AUDIT');
  const insomniaSubmission = latestForms.get('InsomniaSeverityIndex');

  const screeningSignals = submissions
    .filter((item) => item?.scoreValue !== null && item?.scoreValue !== undefined)
    .sort((left, right) => String(right.submittedAt ?? '').localeCompare(String(left.submittedAt ?? '')))
    .slice(0, 6)
    .map((item) => ({
      formKey: trimText(item.formKey, 120),
      title: trimText(item.formTitle, 160) ?? trimText(item.formKey, 120) ?? 'Assessment',
      scoreLabel: trimText(item.scoreLabel, 120),
      scoreValue: Number(item.scoreValue),
      interpretationLabel: trimText(item.interpretationLabel, 160),
      submittedAt: item.submittedAt ?? null,
      urgency: classifyScreeningUrgency(item.formKey, item.scoreValue, item.interpretationLabel),
    }));

  if (selfHarmThoughts === 'Yes' || suicidalThoughts === 'Yes') {
    screeningSignals.unshift({
      formKey: 'intake_safety',
      title: 'Intake safety disclosure',
      scoreLabel: null,
      scoreValue: null,
      interpretationLabel: 'Current self-harm or suicide thoughts were reported in intake responses.',
      submittedAt: intakePacket?.submittedAt ?? null,
      urgency: 'critical',
    });
  }

  const careRoutes = [];
  const areasToAssess = [];
  const concernText = [primaryConcern, secondaryConcern, dailyImpact, precipitatingEvent, anxietyTriggers, therapyDetails]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const phq9ItemNine = parseNumber(phq9Submission?.responses?.phq9);
  const hasSafetyRisk = selfHarmThoughts === 'Yes'
    || suicidalThoughts === 'Yes'
    || attemptHistory === 'Yes'
    || (Number.isFinite(phq9ItemNine) && phq9ItemNine > 0);

  if (hasSafetyRisk) {
    addRoute(careRoutes, {
      id: 'safety_review',
      title: 'Immediate safety review',
      confidence: 'high',
      basis: [
        selfHarmThoughts === 'Yes' ? 'Client reported current self-harm thoughts.' : null,
        suicidalThoughts === 'Yes' ? 'Client reported current suicidal thoughts.' : null,
        attemptHistory === 'Yes' ? 'Client disclosed a prior suicide attempt.' : null,
        Number.isFinite(phq9ItemNine) && phq9ItemNine > 0 ? 'PHQ-9 item 9 was endorsed.' : null,
      ],
      reviewPrompt: 'Review current risk, intent, means, protective factors, and crisis supports before routine first-session agenda work.',
    });
    pushUnique(areasToAssess, 'Clarify current suicide and self-harm risk, protective factors, and immediate safety needs.');
  }

  if ((phq9Submission?.scoreValue ?? 0) >= 5 || hasKeyword(concernText, ['depress', 'hopeless', 'low mood', 'sad'])) {
    addRoute(careRoutes, {
      id: 'depression_support',
      title: 'Depression support track',
      confidence: (phq9Submission?.scoreValue ?? 0) >= 10 ? 'high' : 'medium',
      basis: [
        phq9Submission?.scoreValue != null ? `PHQ-9 score ${phq9Submission.scoreValue} (${phq9Submission.interpretationLabel ?? 'reported'}).` : null,
        hasKeyword(concernText, ['depress', 'hopeless', 'low mood', 'sad']) ? 'Client-described concerns include depressive language.' : null,
      ],
      reviewPrompt: 'Clarify symptom duration, functional impairment, sleep/appetite change, hopelessness, and current supports.',
    });
    pushUnique(areasToAssess, 'Assess depressive symptom pattern, duration, impairment, and protective supports.');
  }

  if ((anxietySubmission?.scoreValue ?? 0) >= 5 || hasKeyword(concernText, ['anxiety', 'panic', 'worry', 'nervous'])) {
    addRoute(careRoutes, {
      id: 'anxiety_support',
      title: 'Anxiety and panic support track',
      confidence: (anxietySubmission?.scoreValue ?? 0) >= 10 ? 'high' : 'medium',
      basis: [
        anxietySubmission?.scoreValue != null ? `Anxiety assessment score ${anxietySubmission.scoreValue} (${anxietySubmission.interpretationLabel ?? 'reported'}).` : null,
        hasKeyword(concernText, ['panic']) ? 'Client-described concerns mention panic symptoms.' : null,
        hasKeyword(concernText, ['anxiety', 'worry', 'nervous']) ? 'Client-described concerns mention persistent worry or anxiety.' : null,
      ],
      reviewPrompt: 'Clarify panic frequency, avoidance, somatic symptoms, triggers, and how anxiety disrupts work or relationships.',
    });
    pushUnique(areasToAssess, 'Assess anxiety drivers, panic frequency, avoidance, and body-based symptoms.');
  }

  if ((pcl5Submission?.scoreValue ?? 0) >= 20 || hasKeyword(concernText, ['trauma', 'abuse', 'assault', 'flashback'])) {
    addRoute(careRoutes, {
      id: 'trauma_review',
      title: 'Trauma-informed review',
      confidence: (pcl5Submission?.scoreValue ?? 0) >= 33 ? 'high' : 'medium',
      basis: [
        pcl5Submission?.scoreValue != null ? `PCL-5 score ${pcl5Submission.scoreValue} (${pcl5Submission.interpretationLabel ?? 'reported'}).` : null,
        hasKeyword(concernText, ['trauma', 'abuse', 'assault', 'flashback']) ? 'Client-described concerns suggest trauma-related material.' : null,
      ],
      reviewPrompt: 'Clarify trauma exposure, current re-experiencing, avoidance, hyperarousal, and stabilization needs before deeper trauma processing.',
    });
    pushUnique(areasToAssess, 'Assess trauma exposure, stabilization needs, and whether trauma-focused care is appropriate.');
  }

  if ((insomniaSubmission?.scoreValue ?? 0) >= 8 || hasKeyword(concernText, ['sleep', 'insomnia'])) {
    addRoute(careRoutes, {
      id: 'sleep_support',
      title: 'Sleep and restoration support',
      confidence: (insomniaSubmission?.scoreValue ?? 0) >= 15 ? 'high' : 'medium',
      basis: [
        insomniaSubmission?.scoreValue != null ? `Insomnia assessment score ${insomniaSubmission.scoreValue} (${insomniaSubmission.interpretationLabel ?? 'reported'}).` : null,
        hasKeyword(concernText, ['sleep', 'insomnia']) ? 'Client-reported concerns include sleep disruption.' : null,
      ],
      reviewPrompt: 'Clarify sleep onset, maintenance, routines, nightmares, and whether sleep problems are secondary to anxiety, grief, or depression.',
    });
    pushUnique(areasToAssess, 'Assess sleep disruption and whether it is a primary problem or secondary to other distress.');
  }

  if ((auditSubmission?.scoreValue ?? 0) >= 8 || hasKeyword(concernText, ['alcohol', 'substance', 'drinking'])) {
    addRoute(careRoutes, {
      id: 'substance_review',
      title: 'Substance-use review',
      confidence: (auditSubmission?.scoreValue ?? 0) >= 16 ? 'high' : 'medium',
      basis: [
        auditSubmission?.scoreValue != null ? `AUDIT score ${auditSubmission.scoreValue} (${auditSubmission.interpretationLabel ?? 'reported'}).` : null,
        hasKeyword(concernText, ['alcohol', 'substance', 'drinking']) ? 'Client-described concerns mention alcohol or substance use.' : null,
      ],
      reviewPrompt: 'Clarify current use pattern, self-medication risk, withdrawal concerns, and motivation for change.',
    });
    pushUnique(areasToAssess, 'Assess whether substances are contributing to mood, sleep, anxiety, or coping difficulties.');
  }

  if (hasKeyword(concernText, ['grief', 'loss', 'bereave', 'death', 'miscarriage'])) {
    addRoute(careRoutes, {
      id: 'grief_support',
      title: 'Grief and loss support track',
      confidence: 'medium',
      basis: ['Client-described concerns mention grief, loss, or miscarriage.'],
      reviewPrompt: 'Clarify recent and historical losses, grief rituals, faith meaning-making, and support system availability.',
    });
    pushUnique(areasToAssess, 'Assess grief timeline, current supports, and how loss is shaping daily functioning.');
  }

  if (
    ['Married', 'Partnered / Engaged', 'Cohabitating'].includes(maritalStatus)
    || hasKeyword(concernText, ['marriage', 'spouse', 'partner', 'relationship', 'family', 'parenting', 'couple'])
  ) {
    addRoute(careRoutes, {
      id: 'relationship_support',
      title: 'Relationship and family systems review',
      confidence: hasKeyword(concernText, ['marriage', 'spouse', 'partner', 'relationship', 'family', 'parenting', 'couple']) ? 'medium' : 'low',
      basis: [
        maritalStatus ? `Client reported marital or relationship context: ${maritalStatus}.` : null,
        hasKeyword(concernText, ['marriage', 'spouse', 'partner', 'relationship', 'family', 'parenting', 'couple']) ? 'Client-described concerns point to relationship or family strain.' : null,
      ],
      reviewPrompt: 'Clarify relationship dynamics, conflict pattern, attachment or communication themes, and whether joint work may be appropriate.',
    });
    pushUnique(areasToAssess, 'Assess relationship and family-system factors affecting the presenting problem.');
  }

  if (
    christianIntegration === 'Yes, please'
    || christianIntegration === 'Open to it'
    || (faithImportanceValue !== null && faithImportanceValue >= 7)
    || Boolean(faithBackground)
  ) {
    addRoute(careRoutes, {
      id: 'faith_integrated_care',
      title: 'Faith-integrated counseling option',
      confidence: christianIntegration === 'Yes, please' ? 'high' : 'medium',
      basis: [
        christianIntegration ? `Client preference: ${christianIntegration}.` : null,
        faithImportanceValue !== null ? `Faith importance rated ${faithImportanceValue}/10.` : null,
        churchAffiliation ? `Church or faith community status: ${churchAffiliation}.` : null,
      ],
      reviewPrompt: 'Ask how the client wants faith integrated, what is supportive versus unhelpful, and whether scripture, prayer, or church support should be part of care.',
    });
    pushUnique(areasToAssess, 'Clarify desired level and style of Christian integration in care.');
  }

  if (careRoutes.length === 0) {
    addRoute(careRoutes, {
      id: 'general_first_session',
      title: 'General first-session intake review',
      confidence: 'low',
      basis: ['No strong scored screening pattern is present in currently submitted intake materials.'],
      reviewPrompt: 'Use the first session to refine the presenting problem, goals, safety picture, and treatment fit.',
    });
  }

  const reportedContext = compactFields([
    { label: 'Age band', value: ageBand },
    { label: 'Gender identity', value: genderIdentity },
    { label: 'Pronouns', value: pronouns },
    { label: 'Marital status', value: maritalStatus },
    { label: 'Living situation', value: livingSituation },
    { label: 'Occupation', value: occupation },
    { label: 'Education level', value: educationLevel },
    { label: 'Reported location', value: [city, state].filter(Boolean).join(', ') || state },
    { label: 'Faith background', value: faithBackground },
    { label: 'Church community', value: churchAffiliation },
    { label: 'Christian integration preference', value: christianIntegration },
  ]);

  const presentingConcerns = compactFields([
    { label: 'Primary concern', value: primaryConcern },
    { label: 'Secondary concerns', value: secondaryConcern },
    { label: 'Reported duration or onset', value: duration },
    { label: 'Self-rated severity', value: severity ? `${severity}/10` : null },
    { label: 'Daily impact', value: dailyImpact },
    { label: 'Goals for counseling', value: goals },
  ]);

  const reportedContributors = compactFields([
    { label: 'Reported trigger or life change', value: precipitatingEvent },
    { label: 'Anxiety or stress triggers', value: anxietyTriggers },
    { label: 'What the client has already tried', value: priorAttempts },
    { label: 'What has helped so far', value: whatHelps },
    { label: 'Spiritual strengths', value: spiritualStrengths },
  ]);

  const reportedConditions = [];
  priorDiagnosisList.forEach((entry) => {
    pushUnique(reportedConditions, `Reported prior diagnosis: ${entry}`);
  });
  chronicConditionList.forEach((entry) => {
    pushUnique(reportedConditions, `Reported chronic condition: ${entry}`);
  });
  medicationList.forEach((entry) => {
    pushUnique(reportedConditions, `Reported medication: ${entry}`);
  });
  if (previousTherapy === 'Yes') {
    pushUnique(reportedConditions, therapyDetails ? `Prior counseling reported: ${therapyDetails}` : 'Prior counseling reported.');
  }
  if (hospitalization === 'Yes') {
    pushUnique(reportedConditions, hospitalizationDetails ? `Psychiatric hospitalization reported: ${hospitalizationDetails}` : 'Psychiatric hospitalization reported.');
  }
  if (suicidalHistory === 'Yes') {
    pushUnique(reportedConditions, 'Past suicidal ideation was reported.');
  }
  if (attemptHistory === 'Yes') {
    pushUnique(reportedConditions, 'A prior suicide attempt was reported.');
  }

  return {
    eligible,
    reasons,
    generatedAt: new Date().toISOString(),
    disclaimer: PREVIEW_DISCLAIMER,
    intake: {
      completed: hasCompletedPacket || hasIntakeFormSubmission,
      packetStatus: intakePacket?.status ?? null,
      submittedAt: intakePacket?.submittedAt ?? latestForms.get('LongIntakeForm')?.submittedAt ?? latestForms.get('ShortIntakeForm')?.submittedAt ?? null,
      sourceForms: [...latestForms.values()]
        .filter((item) => INTAKE_FORM_KEYS.includes(item.formKey))
        .map((item) => ({
          formKey: item.formKey,
          formTitle: item.formTitle ?? item.formKey,
          submittedAt: item.submittedAt ?? null,
        })),
    },
    sessions: {
      futureAppointmentCount: futureAppointments.length,
      nextAppointmentAt: futureAppointments[0]?.startsAt ?? futureAppointments[0]?.scheduledAt ?? null,
    },
    reportedContext,
    presentingConcerns,
    reportedContributors,
    reportedConditions,
    screeningSignals,
    careRoutes,
    areasToAssess,
  };
}
