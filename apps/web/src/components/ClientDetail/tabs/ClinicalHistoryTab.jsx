import { useState } from 'react';
import { upsertClinicalHistory } from '../../../lib/clientApi.js';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e1e8ed',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
};

const sectionHeaderStyle = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '12px',
  borderBottom: '1px solid #e1e8ed',
  paddingBottom: '8px',
  color: '#111827',
};

const saveBtnStyle = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#0861ea',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '14px',
};

const YesNoToggle = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '10px' }}>
    <span style={{ ...labelStyle, display: 'inline', marginBottom: 0, marginRight: '12px' }}>{label}</span>
    <label style={{ cursor: 'pointer', fontSize: '14px', marginRight: '12px' }}>
      <input type="radio" checked={value === true} onChange={() => onChange(true)} style={{ marginRight: '4px' }} />
      Yes
    </label>
    <label style={{ cursor: 'pointer', fontSize: '14px' }}>
      <input type="radio" checked={value === false} onChange={() => onChange(false)} style={{ marginRight: '4px' }} />
      No
    </label>
  </div>
);

function CollapsibleSection({ title, children, defaultOpen = true, riskActive = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        marginBottom: '28px',
        border: riskActive ? '2px solid #b42318' : '1px solid #e1e8ed',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 16px',
          background: riskActive ? '#fff1f0' : '#f9fafb',
          border: 'none',
          borderBottom: open ? '1px solid #e1e8ed' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 600, color: riskActive ? '#b42318' : '#111827' }}>
          {riskActive && '⚠ '}{title}
        </span>
        <span style={{ fontSize: '12px', color: '#62708b' }}>{open ? '- Collapse' : '+ Expand'}</span>
      </button>
      {open && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
}

export default function ClinicalHistoryTab({ client, clientId }) {
  const ch = client.clinical ?? {};

  // Medical History
  const [pastHospitalizations, setPastHospitalizations] = useState(!!ch.past_hospitalizations);
  const [hospitalizationsDetail, setHospitalizationsDetail] = useState(ch.hospitalizations ?? '');
  const [pastSurgeries, setPastSurgeries] = useState(!!ch.past_surgeries);
  const [surgeriesDetail, setSurgeriesDetail] = useState(ch.surgeries ?? '');
  const [chronicConditions, setChronicConditions] = useState(
    Array.isArray(ch.chronic_conditions) ? ch.chronic_conditions.join(', ') : (ch.chronic_conditions ?? '')
  );
  const [pcpName, setPcpName] = useState(ch.pcp_name ?? '');
  const [pcpPractice, setPcpPractice] = useState(ch.pcp_practice ?? '');
  const [pcpPhone, setPcpPhone] = useState(ch.pcp_phone ?? '');
  const [preferredPharmacy, setPreferredPharmacy] = useState(
    typeof ch.preferred_pharmacy === 'object' && ch.preferred_pharmacy
      ? JSON.stringify(ch.preferred_pharmacy)
      : (ch.preferred_pharmacy ?? '')
  );

  // Substance Use
  const substanceScreen = ch.substance_use_screen ?? {};
  const [alcoholFrequency, setAlcoholFrequency] = useState(substanceScreen.alcohol_frequency ?? '');
  const [alcoholDrinksPerSession, setAlcoholDrinksPerSession] = useState(substanceScreen.alcohol_drinks_per_session ?? '');
  const [tobaccoUse, setTobaccoUse] = useState(substanceScreen.tobacco_use ?? false);
  const [tobaccoType, setTobaccoType] = useState(substanceScreen.tobacco_type ?? '');
  const [tobaccoAmount, setTobaccoAmount] = useState(substanceScreen.tobacco_amount ?? '');
  const [cannabisUse, setCannabisUse] = useState(substanceScreen.cannabis_use ?? false);
  const [cannabisFrequency, setCannabisFrequency] = useState(substanceScreen.cannabis_frequency ?? '');
  const [otherSubstances, setOtherSubstances] = useState(substanceScreen.other_substances ?? '');
  const [substanceTreatment, setSubstanceTreatment] = useState(substanceScreen.prior_treatment ?? false);
  const [substanceTreatmentDetail, setSubstanceTreatmentDetail] = useState(substanceScreen.prior_treatment_detail ?? '');

  // AUDIT-C auto-calc
  const auditcScores = { never: 0, 'monthly or less': 1, '2-4x/month': 2, '2-3x/week': 3, '4+x/week': 4 };
  const auditcFreq = auditcScores[alcoholFrequency] ?? 0;
  const auditcDrinks = (() => {
    const n = parseInt(alcoholDrinksPerSession, 10);
    if (isNaN(n)) return 0;
    if (n <= 1) return 0;
    if (n <= 2) return 1;
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    return 4;
  })();
  const auditcScore = auditcFreq + auditcDrinks;

  // Mental Health History
  const [mhPriorTreatment, setMhPriorTreatment] = useState(!!ch.mh_prior_treatment);
  const [mhPriorTreatmentDetail, setMhPriorTreatmentDetail] = useState(ch.mh_prior_treatment_detail ?? '');
  const [mhPriorHospitalizations, setMhPriorHospitalizations] = useState(!!ch.mh_prior_hospitalizations);
  const [mhHospitalizationsDetail, setMhHospitalizationsDetail] = useState(ch.mh_hospitalizations ?? '');
  const [mhPriorDiagnoses, setMhPriorDiagnoses] = useState(ch.mh_prior_diagnoses ?? '');

  // Risk Assessment
  const [siCurrent, setSiCurrent] = useState(!!ch.si_current);
  const [siHistory, setSiHistory] = useState(!!ch.si_history);
  const [siPlan, setSiPlan] = useState(!!ch.si_plan);
  const [siMeansAccess, setSiMeansAccess] = useState(!!ch.si_means_access);
  const [siIntent, setSiIntent] = useState(!!ch.si_intent);
  const [hiCurrent, setHiCurrent] = useState(!!ch.hi_current);
  const [hiHistory, setHiHistory] = useState(!!ch.hi_history);
  const [selfHarmHistory, setSelfHarmHistory] = useState(!!ch.self_harm_history);
  const [riskNotes, setRiskNotes] = useState(ch.risk_notes ?? '');
  const [riskConfirmed, setRiskConfirmed] = useState(false);

  const riskActive = siCurrent || hiCurrent;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (riskActive && !riskConfirmed) {
      setError('Please confirm risk review before saving when active SI or HI is present.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = {
        past_hospitalizations: pastHospitalizations ? 1 : 0,
        hospitalizations: hospitalizationsDetail.trim() || null,
        past_surgeries: pastSurgeries ? 1 : 0,
        surgeries: surgeriesDetail.trim() || null,
        chronic_conditions: chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
        pcp_name: pcpName.trim() || null,
        pcp_practice: pcpPractice.trim() || null,
        pcp_phone: pcpPhone.trim() || null,
        preferred_pharmacy: preferredPharmacy.trim() || null,
        substance_use_screen: {
          alcohol_frequency: alcoholFrequency || null,
          alcohol_drinks_per_session: alcoholDrinksPerSession !== '' ? parseInt(alcoholDrinksPerSession, 10) : null,
          tobacco_use: tobaccoUse,
          tobacco_type: tobaccoType.trim() || null,
          tobacco_amount: tobaccoAmount.trim() || null,
          cannabis_use: cannabisUse,
          cannabis_frequency: cannabisFrequency.trim() || null,
          other_substances: otherSubstances.trim() || null,
          prior_treatment: substanceTreatment,
          prior_treatment_detail: substanceTreatmentDetail.trim() || null,
        },
        mh_prior_treatment: mhPriorTreatment ? 1 : 0,
        mh_prior_treatment_detail: mhPriorTreatmentDetail.trim() || null,
        mh_prior_hospitalizations: mhPriorHospitalizations ? 1 : 0,
        mh_hospitalizations: mhHospitalizationsDetail.trim() || null,
        mh_prior_diagnoses: mhPriorDiagnoses.trim() || null,
        si_current: siCurrent ? 1 : 0,
        si_history: siHistory ? 1 : 0,
        si_plan: siPlan ? 1 : 0,
        si_means_access: siMeansAccess ? 1 : 0,
        si_intent: siIntent ? 1 : 0,
        hi_current: hiCurrent ? 1 : 0,
        hi_history: hiHistory ? 1 : 0,
        self_harm_history: selfHarmHistory ? 1 : 0,
        risk_notes: riskNotes.trim() || null,
      };
      await upsertClinicalHistory(clientId, data);
      setSuccess(true);
      setRiskConfirmed(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>

      {/* ── Medical History ─────────────────────────────────────────────────── */}
      <CollapsibleSection title="Medical History">
        <YesNoToggle label="Past Hospitalizations" value={pastHospitalizations} onChange={setPastHospitalizations} />
        {pastHospitalizations && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Hospitalization Details</label>
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={hospitalizationsDetail} onChange={(e) => setHospitalizationsDetail(e.target.value)} />
          </div>
        )}

        <YesNoToggle label="Past Surgeries" value={pastSurgeries} onChange={setPastSurgeries} />
        {pastSurgeries && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Surgery Details</label>
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={surgeriesDetail} onChange={(e) => setSurgeriesDetail(e.target.value)} />
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Chronic Conditions (comma-separated)</label>
          <input style={inputStyle} type="text" value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
        </div>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Primary Care Physician</label>
            <input style={inputStyle} type="text" value={pcpName} onChange={(e) => setPcpName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PCP Practice / Clinic</label>
            <input style={inputStyle} type="text" value={pcpPractice} onChange={(e) => setPcpPractice(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PCP Phone</label>
            <input style={inputStyle} type="tel" value={pcpPhone} onChange={(e) => setPcpPhone(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Preferred Pharmacy (name &amp; address)</label>
            <input style={inputStyle} type="text" value={preferredPharmacy} onChange={(e) => setPreferredPharmacy(e.target.value)} placeholder="Pharmacy name, address" />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Substance Use ────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Substance Use Screening">
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Alcohol Frequency</label>
            <select style={inputStyle} value={alcoholFrequency} onChange={(e) => setAlcoholFrequency(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="never">Never</option>
              <option value="monthly or less">Monthly or less</option>
              <option value="2-4x/month">2–4x per month</option>
              <option value="2-3x/week">2–3x per week</option>
              <option value="4+x/week">4+ times per week</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Avg. Drinks Per Session</label>
            <input style={inputStyle} type="number" min="0" value={alcoholDrinksPerSession} onChange={(e) => setAlcoholDrinksPerSession(e.target.value)} />
          </div>
        </div>
        {(alcoholFrequency || alcoholDrinksPerSession) && (
          <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px', marginBottom: '12px' }}>
            AUDIT-C Score (estimated): <strong>{auditcScore}</strong>
            {auditcScore >= 3 && <span style={{ color: '#b42318', marginLeft: '8px' }}>— Consider further screening</span>}
          </p>
        )}

        <YesNoToggle label="Tobacco / Nicotine Use" value={tobaccoUse} onChange={setTobaccoUse} />
        {tobaccoUse && (
          <div style={{ ...gridStyle, marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Type (cigarettes, vaping, etc.)</label>
              <input style={inputStyle} type="text" value={tobaccoType} onChange={(e) => setTobaccoType(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Amount / Frequency</label>
              <input style={inputStyle} type="text" value={tobaccoAmount} onChange={(e) => setTobaccoAmount(e.target.value)} />
            </div>
          </div>
        )}

        <YesNoToggle label="Cannabis Use" value={cannabisUse} onChange={setCannabisUse} />
        {cannabisUse && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Cannabis Frequency</label>
            <input style={inputStyle} type="text" value={cannabisFrequency} onChange={(e) => setCannabisFrequency(e.target.value)} placeholder="e.g. daily, weekly" />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Other Substances (type and frequency)</label>
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={otherSubstances} onChange={(e) => setOtherSubstances(e.target.value)} />
        </div>

        <YesNoToggle label="Prior Substance Use Treatment" value={substanceTreatment} onChange={setSubstanceTreatment} />
        {substanceTreatment && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Treatment Details</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={substanceTreatmentDetail} onChange={(e) => setSubstanceTreatmentDetail(e.target.value)} />
          </div>
        )}
      </CollapsibleSection>

      {/* ── Mental Health History ────────────────────────────────────────────── */}
      <CollapsibleSection title="Mental Health History">
        <YesNoToggle label="Prior Mental Health Treatment" value={mhPriorTreatment} onChange={setMhPriorTreatment} />
        {mhPriorTreatment && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Provider / Dates Details</label>
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={mhPriorTreatmentDetail} onChange={(e) => setMhPriorTreatmentDetail(e.target.value)} />
          </div>
        )}

        <YesNoToggle label="Prior Psychiatric Hospitalizations" value={mhPriorHospitalizations} onChange={setMhPriorHospitalizations} />
        {mhPriorHospitalizations && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Hospitalization Details</label>
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={mhHospitalizationsDetail} onChange={(e) => setMhHospitalizationsDetail(e.target.value)} />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Prior Diagnoses</label>
          <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={mhPriorDiagnoses} onChange={(e) => setMhPriorDiagnoses(e.target.value)} placeholder="e.g. MDD, GAD (free text)" />
        </div>
      </CollapsibleSection>

      {/* ── Risk Assessment ──────────────────────────────────────────────────── */}
      <CollapsibleSection title="Risk Assessment" riskActive={riskActive}>
        {ch.last_risk_assessment_at && (
          <p style={{ fontSize: '13px', color: '#374151', marginBottom: '14px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '4px' }}>
            Last assessed by <strong>{ch.risk_assessed_by ?? 'unknown'}</strong> on{' '}
            {new Date(ch.last_risk_assessment_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}

        {siCurrent && (
          <div
            style={{
              backgroundColor: '#fff1f0',
              border: '1px solid #b42318',
              borderRadius: '4px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#b42318',
            }}
          >
            Active suicidal ideation — document risk plan.
          </div>
        )}

        <div style={{ borderLeft: riskActive ? '3px solid #b42318' : 'none', paddingLeft: riskActive ? '12px' : 0 }}>
          <YesNoToggle label="Suicidal Ideation — Current" value={siCurrent} onChange={setSiCurrent} />
          <YesNoToggle label="Suicidal Ideation — History" value={siHistory} onChange={setSiHistory} />
          {siCurrent && (
            <>
              <YesNoToggle label="Has Plan" value={siPlan} onChange={setSiPlan} />
              <YesNoToggle label="Has Means / Access" value={siMeansAccess} onChange={setSiMeansAccess} />
            </>
          )}
          <YesNoToggle label="Has Intent" value={siIntent} onChange={setSiIntent} />
          <YesNoToggle label="Homicidal Ideation — Current" value={hiCurrent} onChange={setHiCurrent} />
          <YesNoToggle label="Homicidal Ideation — History" value={hiHistory} onChange={setHiHistory} />
          <YesNoToggle label="Self-Harm History" value={selfHarmHistory} onChange={setSelfHarmHistory} />
        </div>

        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>Risk Narrative</label>
          <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} />
        </div>

        {riskActive && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '12px', color: '#b42318', fontWeight: 500 }}>
            <input type="checkbox" checked={riskConfirmed} onChange={(e) => setRiskConfirmed(e.target.checked)} />
            I confirm I have reviewed the risk assessment and documented a safety plan.
          </label>
        )}
      </CollapsibleSection>

      {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '12px' }}>Clinical history saved.</p>}

      <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>
        {loading ? 'Saving...' : 'Save Clinical History'}
      </button>
    </div>
  );
}
