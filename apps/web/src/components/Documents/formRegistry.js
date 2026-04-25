import { ShortIntakeForm } from './forms/ShortIntakeForm.js';
import { LongIntakeForm } from './forms/LongIntakeForm.js';
import { AnxietyAssessment } from './forms/AnxietyAssessment.js';
import { SelfHarmAssessment } from './forms/SelfHarmAssessment.js';
import { PHQ9 } from './forms/PHQ9.js';
import { BeckAnxietyInventory } from './forms/BeckAnxietyInventory.js';
import { PCL5 } from './forms/PCL5.js';
import { RosenbergSelfEsteem } from './forms/RosenbergSelfEsteem.js';
import { ASRSv1 } from './forms/ASRSv1.js';
import { OCIRevised } from './forms/OCIRevised.js';
import { AUDIT } from './forms/AUDIT.js';
import { DASS21 } from './forms/DASS21.js';
import { ACEQuestionnaire } from './forms/ACEQuestionnaire.js';
import { CouplesAssessment } from './forms/CouplesAssessment.js';
import { GriefAssessment } from './forms/GriefAssessment.js';
import { BurnoutAssessment } from './forms/BurnoutAssessment.js';
import { SpiritualWellnessInventory } from './forms/SpiritualWellnessInventory.js';
import { FamilySystemsAssessment } from './forms/FamilySystemsAssessment.js';
import { InsomniaSeverityIndex } from './forms/InsomniaSeverityIndex.js';
import {
  InformedConsentForm,
  TelehealthConsentForm,
  ReleaseOfInformationAuthorization,
} from './forms/AdministrativeForms.js';
import {
  BiopsychosocialAssessment,
  MentalStatusExam,
  SafetyPlanTemplate,
  MoodDisorderQuestionnaire,
  EatingDisorderScreening,
  AngerAssessmentScale,
} from './forms/ClinicalFoundationForms.js';
import {
  IndividualTreatmentPlan,
  SMARTGoalsWorksheet,
  RelapsePreventionPlan,
} from './forms/TreatmentPlanningForms.js';
import {
  CBTThoughtRecord,
  CognitiveDistortionsWorksheet,
  BehavioralActivationSchedule,
  CopingSkillsPlan,
  GroundingTechniquesWorksheet,
  MindfulnessPracticeLog,
} from './forms/TherapeuticWorksheets.js';
import {
  FaithHistoryQuestionnaire,
  ValuesAndBiblicalIdentityWorksheet,
} from './forms/ChurchCore CareForms.js';

export const CATEGORIES = [
  { id: 'intake', label: 'Intake Forms', icon: '📋' },
  { id: 'administrative', label: 'Consent & Administrative', icon: '🧾' },
  { id: 'assessment', label: 'Clinical Assessments', icon: '🧠' },
  { id: 'depression', label: 'Depression', icon: '🌧️' },
  { id: 'anxiety', label: 'Anxiety & OCD', icon: '💨' },
  { id: 'trauma', label: 'Trauma & PTSD', icon: '🛡️' },
  { id: 'self', label: 'Self & Identity', icon: '🌱' },
  { id: 'adhd', label: 'Attention (ADHD)', icon: '⚡' },
  { id: 'substance', label: 'Substance Use', icon: '🍂' },
  { id: 'sleep', label: 'Sleep', icon: '🌙' },
  { id: 'clinical', label: 'Clinical Safety', icon: '⚠️' },
  { id: 'relationship', label: 'Relationships', icon: '💑' },
  { id: 'grief', label: 'Grief & Loss', icon: '🕊️' },
  { id: 'burnout', label: 'Burnout & Wellness', icon: '🕯️' },
  { id: 'treatment', label: 'Treatment Planning', icon: '📝' },
  { id: 'worksheets', label: 'Therapeutic Worksheets', icon: '🧩' },
  { id: 'faith', label: 'Faith & Spirituality', icon: '✝️' },
  { id: 'family', label: 'Family Systems', icon: '🏠' },
];

export const FORM_CATALOG = [
  { formDef: ShortIntakeForm, category: 'intake', badgeLabel: 'Intake', badgeColor: 'indigo' },
  { formDef: LongIntakeForm, category: 'intake', badgeLabel: 'Intake', badgeColor: 'indigo' },
  { formDef: InformedConsentForm, category: 'administrative', badgeLabel: 'Consent', badgeColor: 'blue' },
  { formDef: TelehealthConsentForm, category: 'administrative', badgeLabel: 'Consent', badgeColor: 'cyan' },
  { formDef: ReleaseOfInformationAuthorization, category: 'administrative', badgeLabel: 'Release', badgeColor: 'indigo' },
  { formDef: BiopsychosocialAssessment, category: 'assessment', badgeLabel: 'Assessment', badgeColor: 'grape' },
  { formDef: MentalStatusExam, category: 'assessment', badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: MoodDisorderQuestionnaire, category: 'assessment', badgeLabel: 'Screening', badgeColor: 'yellow' },
  { formDef: EatingDisorderScreening, category: 'assessment', badgeLabel: 'Screening', badgeColor: 'pink' },
  { formDef: AngerAssessmentScale, category: 'assessment', badgeLabel: 'Assessment', badgeColor: 'orange' },
  { formDef: PHQ9, category: 'depression', badgeLabel: 'Screener', badgeColor: 'teal' },
  { formDef: DASS21, category: 'depression', badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: AnxietyAssessment, category: 'anxiety', badgeLabel: 'Screener', badgeColor: 'teal' },
  { formDef: BeckAnxietyInventory, category: 'anxiety', badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: OCIRevised, category: 'anxiety', badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: PCL5, category: 'trauma', badgeLabel: 'Assessment', badgeColor: 'orange' },
  { formDef: ACEQuestionnaire, category: 'trauma', badgeLabel: 'Screening', badgeColor: 'orange' },
  { formDef: RosenbergSelfEsteem, category: 'self', badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: ASRSv1, category: 'adhd', badgeLabel: 'Screener', badgeColor: 'yellow' },
  { formDef: AUDIT, category: 'substance', badgeLabel: 'Screening', badgeColor: 'orange' },
  { formDef: InsomniaSeverityIndex, category: 'sleep', badgeLabel: 'Assessment', badgeColor: 'blue' },
  { formDef: SelfHarmAssessment, category: 'clinical', badgeLabel: 'Clinical', badgeColor: 'red', crisisAlert: true },
  { formDef: SafetyPlanTemplate, category: 'clinical', badgeLabel: 'Safety', badgeColor: 'red' },
  { formDef: CouplesAssessment, category: 'relationship', badgeLabel: 'Counseling', badgeColor: 'pink' },
  { formDef: GriefAssessment, category: 'grief', badgeLabel: 'Counseling', badgeColor: 'gray' },
  { formDef: BurnoutAssessment, category: 'burnout', badgeLabel: 'Counseling', badgeColor: 'orange' },
  { formDef: IndividualTreatmentPlan, category: 'treatment', badgeLabel: 'Planning', badgeColor: 'green' },
  { formDef: SMARTGoalsWorksheet, category: 'treatment', badgeLabel: 'Planning', badgeColor: 'lime' },
  { formDef: RelapsePreventionPlan, category: 'treatment', badgeLabel: 'Planning', badgeColor: 'blue' },
  { formDef: CBTThoughtRecord, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'violet' },
  { formDef: CognitiveDistortionsWorksheet, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'grape' },
  { formDef: BehavioralActivationSchedule, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'indigo' },
  { formDef: CopingSkillsPlan, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'teal' },
  { formDef: GroundingTechniquesWorksheet, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'green' },
  { formDef: MindfulnessPracticeLog, category: 'worksheets', badgeLabel: 'Worksheet', badgeColor: 'blue' },
  { formDef: SpiritualWellnessInventory, category: 'faith', badgeLabel: 'Faith', badgeColor: 'violet' },
  { formDef: FaithHistoryQuestionnaire, category: 'faith', badgeLabel: 'Faith', badgeColor: 'violet' },
  { formDef: ValuesAndBiblicalIdentityWorksheet, category: 'faith', badgeLabel: 'Faith', badgeColor: 'lime' },
  { formDef: FamilySystemsAssessment, category: 'family', badgeLabel: 'Counseling', badgeColor: 'green' },
];

export const FORM_DEFS = FORM_CATALOG.map((entry) => entry.formDef);

export const FORM_DEF_BY_ID = FORM_DEFS.reduce((acc, formDef) => {
  acc[formDef.id] = formDef;
  return acc;
}, {});

export const FORM_OPTION_LIST = FORM_DEFS
  .map((formDef) => ({ value: formDef.id, label: formDef.title }))
  .sort((left, right) => left.label.localeCompare(right.label));
