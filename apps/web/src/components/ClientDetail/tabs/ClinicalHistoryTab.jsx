import { useState } from 'react';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { notifications } from '@mantine/notifications';
import {
  Stack, Title, Paper, SimpleGrid, TextInput, Select, Textarea, Checkbox,
  Button, Group, Text, Alert, Badge,
} from '@mantine/core';
import { upsertClinicalHistory } from '../../../lib/clientApi.js';

function YesNoToggle({ label, value, onChange }) {
  return (
    <Group gap="md">
      <Text fz="sm" fw={500} style={{ minWidth: 220 }}>{label}</Text>
      <Checkbox label="Yes" checked={value === true}  onChange={() => onChange(true)} />
      <Checkbox label="No"  checked={value === false} onChange={() => onChange(false)} />
    </Group>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true, riskActive = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Paper withBorder radius="md" style={{ borderColor: riskActive ? 'var(--mantine-color-red-5)' : undefined }} mb="md">
      <Group
        justify="space-between"
        p="sm"
        style={{ background: riskActive ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-gray-0)', cursor: 'pointer', borderBottom: open ? '1px solid var(--mantine-color-default-border)' : 'none', borderRadius: open ? 0 : 'var(--mantine-radius-md)' }}
        onClick={() => setOpen((v) => !v)}
      >
        <Group gap="xs">
          {riskActive && <Badge color="red" size="xs">Risk Active</Badge>}
          <Text fw={600} fz="sm" c={riskActive ? 'red' : undefined}>{title}</Text>
        </Group>
        <Text fz="xs" c="dimmed">{open ? '− Collapse' : '+ Expand'}</Text>
      </Group>
      {open && <Stack gap="sm" p="md">{children}</Stack>}
    </Paper>
  );
}

const ALCOHOL_FREQ_OPTIONS = [
  { value: '',               label: '— Select —' },
  { value: 'never',          label: 'Never' },
  { value: 'monthly or less',label: 'Monthly or less' },
  { value: '2-4x/month',     label: '2–4x per month' },
  { value: '2-3x/week',      label: '2–3x per week' },
  { value: '4+x/week',       label: '4+ times per week' },
];

const AUDITC = { never: 0, 'monthly or less': 1, '2-4x/month': 2, '2-3x/week': 3, '4+x/week': 4 };

export default function ClinicalHistoryTab({ client, clientId }) {
  const { formatDate } = useI18n();
  const ch = client.clinical ?? {};

  // Medical History
  const [pastHospitalizations, setPastHospitalizations] = useState(!!ch.past_hospitalizations);
  const [hospitalizationsDetail, setHospitalizationsDetail] = useState(ch.hospitalizations ?? '');
  const [pastSurgeries,          setPastSurgeries]          = useState(!!ch.past_surgeries);
  const [surgeriesDetail,        setSurgeriesDetail]        = useState(ch.surgeries ?? '');
  const [chronicConditions,      setChronicConditions]      = useState(Array.isArray(ch.chronic_conditions) ? ch.chronic_conditions.join(', ') : (ch.chronic_conditions ?? ''));
  const [pcpName,        setPcpName]        = useState(ch.pcp_name    ?? '');
  const [pcpPractice,    setPcpPractice]    = useState(ch.pcp_practice ?? '');
  const [pcpPhone,       setPcpPhone]       = useState(ch.pcp_phone   ?? '');
  const [preferredPharmacy, setPreferredPharmacy] = useState(typeof ch.preferred_pharmacy === 'object' && ch.preferred_pharmacy ? JSON.stringify(ch.preferred_pharmacy) : (ch.preferred_pharmacy ?? ''));

  // Substance Use
  const ss = ch.substance_use_screen ?? {};
  const [alcoholFrequency,       setAlcoholFrequency]       = useState(ss.alcohol_frequency ?? '');
  const [alcoholDrinks,          setAlcoholDrinks]          = useState(ss.alcohol_drinks_per_session ?? '');
  const [tobaccoUse,             setTobaccoUse]             = useState(ss.tobacco_use ?? false);
  const [tobaccoType,            setTobaccoType]            = useState(ss.tobacco_type ?? '');
  const [tobaccoAmount,          setTobaccoAmount]          = useState(ss.tobacco_amount ?? '');
  const [cannabisUse,            setCannabisUse]            = useState(ss.cannabis_use ?? false);
  const [cannabisFrequency,      setCannabisFrequency]      = useState(ss.cannabis_frequency ?? '');
  const [otherSubstances,        setOtherSubstances]        = useState(ss.other_substances ?? '');
  const [substanceTreatment,     setSubstanceTreatment]     = useState(ss.prior_treatment ?? false);
  const [substanceTreatmentDetail, setSubstanceTreatmentDetail] = useState(ss.prior_treatment_detail ?? '');

  // MH History
  const [mhPriorTreatment,        setMhPriorTreatment]        = useState(!!ch.mh_prior_treatment);
  const [mhPriorTreatmentDetail,  setMhPriorTreatmentDetail]  = useState(ch.mh_prior_treatment_detail ?? '');
  const [mhPriorHospitalizations, setMhPriorHospitalizations] = useState(!!ch.mh_prior_hospitalizations);
  const [mhHospitalizationsDetail, setMhHospitalizationsDetail] = useState(ch.mh_hospitalizations ?? '');
  const [mhPriorDiagnoses,        setMhPriorDiagnoses]        = useState(ch.mh_prior_diagnoses ?? '');

  // Risk
  const [siCurrent,      setSiCurrent]      = useState(!!ch.si_current);
  const [siHistory,      setSiHistory]      = useState(!!ch.si_history);
  const [siPlan,         setSiPlan]         = useState(!!ch.si_plan);
  const [siMeansAccess,  setSiMeansAccess]  = useState(!!ch.si_means_access);
  const [siIntent,       setSiIntent]       = useState(!!ch.si_intent);
  const [hiCurrent,      setHiCurrent]      = useState(!!ch.hi_current);
  const [hiHistory,      setHiHistory]      = useState(!!ch.hi_history);
  const [selfHarmHistory,setSelfHarmHistory]= useState(!!ch.self_harm_history);
  const [riskNotes,      setRiskNotes]      = useState(ch.risk_notes ?? '');
  const [riskConfirmed,  setRiskConfirmed]  = useState(false);

  const [saving, setSaving] = useState(false);
  const riskActive = siCurrent || hiCurrent;

  // AUDIT-C
  const auditcFreq   = AUDITC[alcoholFrequency] ?? 0;
  const auditcDrinks = (() => { const n = parseInt(alcoholDrinks, 10); if (isNaN(n)) return 0; if (n <= 1) return 0; if (n <= 2) return 1; if (n <= 4) return 2; if (n <= 6) return 3; return 4; })();
  const auditcScore  = auditcFreq + auditcDrinks;

  const handleSave = async () => {
    if (riskActive && !riskConfirmed) {
      notifications.show({ title: 'Confirmation Required', message: 'Please confirm risk review before saving when active SI or HI is present.', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      await upsertClinicalHistory(clientId, {
        past_hospitalizations: pastHospitalizations ? 1 : 0,
        hospitalizations:      hospitalizationsDetail.trim() || null,
        past_surgeries:        pastSurgeries ? 1 : 0,
        surgeries:             surgeriesDetail.trim()        || null,
        chronic_conditions:    chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
        pcp_name:              pcpName.trim()                || null,
        pcp_practice:          pcpPractice.trim()            || null,
        pcp_phone:             pcpPhone.trim()               || null,
        preferred_pharmacy:    preferredPharmacy.trim()      || null,
        substance_use_screen: {
          alcohol_frequency:         alcoholFrequency || null,
          alcohol_drinks_per_session:alcoholDrinks !== '' ? parseInt(alcoholDrinks, 10) : null,
          tobacco_use: tobaccoUse, tobacco_type: tobaccoType.trim() || null, tobacco_amount: tobaccoAmount.trim() || null,
          cannabis_use: cannabisUse, cannabis_frequency: cannabisFrequency.trim() || null,
          other_substances: otherSubstances.trim() || null,
          prior_treatment: substanceTreatment, prior_treatment_detail: substanceTreatmentDetail.trim() || null,
        },
        mh_prior_treatment:         mhPriorTreatment ? 1 : 0,
        mh_prior_treatment_detail:  mhPriorTreatmentDetail.trim()  || null,
        mh_prior_hospitalizations:  mhPriorHospitalizations ? 1 : 0,
        mh_hospitalizations:        mhHospitalizationsDetail.trim() || null,
        mh_prior_diagnoses:         mhPriorDiagnoses.trim()        || null,
        si_current: siCurrent ? 1 : 0, si_history: siHistory ? 1 : 0,
        si_plan:    siPlan    ? 1 : 0, si_means_access: siMeansAccess ? 1 : 0, si_intent: siIntent ? 1 : 0,
        hi_current: hiCurrent ? 1 : 0, hi_history: hiHistory ? 1 : 0,
        self_harm_history: selfHarmHistory ? 1 : 0, risk_notes: riskNotes.trim() || null,
      });
      setRiskConfirmed(false);
      notifications.show({ title: 'Saved', message: 'Clinical history saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Stack gap="md" maw={900}>
      <CollapsibleSection title="Medical History">
        <YesNoToggle label="Past Hospitalizations" value={pastHospitalizations} onChange={setPastHospitalizations} />
        {pastHospitalizations && <Textarea label="Hospitalization Details" rows={3} value={hospitalizationsDetail} onChange={(e) => setHospitalizationsDetail(e.target.value)} />}
        <YesNoToggle label="Past Surgeries" value={pastSurgeries} onChange={setPastSurgeries} />
        {pastSurgeries && <Textarea label="Surgery Details" rows={3} value={surgeriesDetail} onChange={(e) => setSurgeriesDetail(e.target.value)} />}
        <TextInput label="Chronic Conditions (comma-separated)" value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput label="Primary Care Physician"      value={pcpName}           onChange={(e) => setPcpName(e.target.value)} />
          <TextInput label="PCP Practice / Clinic"       value={pcpPractice}       onChange={(e) => setPcpPractice(e.target.value)} />
          <TextInput label="PCP Phone" type="tel"        value={pcpPhone}          onChange={(e) => setPcpPhone(e.target.value)} />
          <TextInput label="Preferred Pharmacy"          value={preferredPharmacy} onChange={(e) => setPreferredPharmacy(e.target.value)} placeholder="Pharmacy name, address" />
        </SimpleGrid>
      </CollapsibleSection>

      <CollapsibleSection title="Substance Use Screening">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select label="Alcohol Frequency" data={ALCOHOL_FREQ_OPTIONS} value={alcoholFrequency} onChange={(v) => setAlcoholFrequency(v ?? '')} />
          <TextInput label="Avg. Drinks Per Session" type="number" min={0} value={alcoholDrinks} onChange={(e) => setAlcoholDrinks(e.target.value)} />
        </SimpleGrid>
        {(alcoholFrequency || alcoholDrinks) && (
          <Group gap="xs">
            <Text fz="sm">AUDIT-C Score (estimated): <strong>{auditcScore}</strong></Text>
            {auditcScore >= 3 && <Badge color="red" size="xs">Consider further screening</Badge>}
          </Group>
        )}
        <YesNoToggle label="Tobacco / Nicotine Use" value={tobaccoUse} onChange={setTobaccoUse} />
        {tobaccoUse && (
          <SimpleGrid cols={2} spacing="sm">
            <TextInput label="Type" value={tobaccoType}   onChange={(e) => setTobaccoType(e.target.value)} />
            <TextInput label="Amount / Frequency" value={tobaccoAmount} onChange={(e) => setTobaccoAmount(e.target.value)} />
          </SimpleGrid>
        )}
        <YesNoToggle label="Cannabis Use" value={cannabisUse} onChange={setCannabisUse} />
        {cannabisUse && <TextInput label="Cannabis Frequency" value={cannabisFrequency} onChange={(e) => setCannabisFrequency(e.target.value)} />}
        <Textarea label="Other Substances (type and frequency)" rows={2} value={otherSubstances} onChange={(e) => setOtherSubstances(e.target.value)} />
        <YesNoToggle label="Prior Substance Use Treatment" value={substanceTreatment} onChange={setSubstanceTreatment} />
        {substanceTreatment && <Textarea label="Treatment Details" rows={2} value={substanceTreatmentDetail} onChange={(e) => setSubstanceTreatmentDetail(e.target.value)} />}
      </CollapsibleSection>

      <CollapsibleSection title="Mental Health History">
        <YesNoToggle label="Prior Mental Health Treatment" value={mhPriorTreatment} onChange={setMhPriorTreatment} />
        {mhPriorTreatment && <Textarea label="Provider / Dates Details" rows={3} value={mhPriorTreatmentDetail} onChange={(e) => setMhPriorTreatmentDetail(e.target.value)} />}
        <YesNoToggle label="Prior Psychiatric Hospitalizations" value={mhPriorHospitalizations} onChange={setMhPriorHospitalizations} />
        {mhPriorHospitalizations && <Textarea label="Hospitalization Details" rows={3} value={mhHospitalizationsDetail} onChange={(e) => setMhHospitalizationsDetail(e.target.value)} />}
        <Textarea label="Prior Diagnoses" rows={3} value={mhPriorDiagnoses} onChange={(e) => setMhPriorDiagnoses(e.target.value)} placeholder="e.g. MDD, GAD (free text)" />
      </CollapsibleSection>

      <CollapsibleSection title="Risk Assessment" riskActive={riskActive}>
        {ch.last_risk_assessment_at && (
          <Paper p="sm" radius="sm" withBorder>
            <Text fz="sm">Last assessed by <strong>{ch.risk_assessed_by ?? 'unknown'}</strong> on {formatDate(ch.last_risk_assessment_at, 'long')}</Text>
          </Paper>
        )}
        {siCurrent && <Alert color="red" variant="filled">Active suicidal ideation — document risk plan.</Alert>}

        <Stack gap="xs" pl={riskActive ? 'md' : 0} style={{ borderLeft: riskActive ? '3px solid var(--mantine-color-red-5)' : 'none' }}>
          <YesNoToggle label="Suicidal Ideation — Current" value={siCurrent} onChange={setSiCurrent} />
          <YesNoToggle label="Suicidal Ideation — History" value={siHistory} onChange={setSiHistory} />
          {siCurrent && (
            <>
              <YesNoToggle label="Has Plan"         value={siPlan}        onChange={setSiPlan} />
              <YesNoToggle label="Has Means / Access" value={siMeansAccess} onChange={setSiMeansAccess} />
            </>
          )}
          <YesNoToggle label="Has Intent"                    value={siIntent}       onChange={setSiIntent} />
          <YesNoToggle label="Homicidal Ideation — Current"  value={hiCurrent}      onChange={setHiCurrent} />
          <YesNoToggle label="Homicidal Ideation — History"  value={hiHistory}      onChange={setHiHistory} />
          <YesNoToggle label="Self-Harm History"             value={selfHarmHistory} onChange={setSelfHarmHistory} />
        </Stack>

        <Textarea label="Risk Narrative" rows={4} value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} />
        {riskActive && (
          <Checkbox
            label="I confirm I have reviewed the risk assessment and documented a safety plan."
            color="red"
            checked={riskConfirmed}
            onChange={(e) => setRiskConfirmed(e.currentTarget.checked)}
          />
        )}
      </CollapsibleSection>

      <Group><Button loading={saving} onClick={handleSave}>Save Clinical History</Button></Group>
    </Stack>
  );
}
