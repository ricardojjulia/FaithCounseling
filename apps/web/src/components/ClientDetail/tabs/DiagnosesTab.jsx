import { useState } from 'react';
import {
  createClientDiagnosis,
  updateClientDiagnosis,
  deleteClientDiagnosis,
  createClientMedication,
  updateClientMedication,
  deleteClientMedication,
  createClientAllergy,
  updateClientAllergy,
  deleteClientAllergy,
} from '../../../lib/clientApi.js';

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
  padding: '7px 18px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#0861ea',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
};

const addBtnStyle = {
  padding: '6px 14px',
  border: '1px solid #0861ea',
  borderRadius: '4px',
  color: '#0861ea',
  background: 'none',
  fontSize: '13px',
  cursor: 'pointer',
};

// ── Diagnoses ─────────────────────────────────────────────────────────────────

function emptyDiagnosis() {
  return {
    _key: Math.random(),
    id: null,
    code_system: 'DSM-5',
    code: '',
    description: '',
    onset_date: '',
    status: 'active',
    is_primary: false,
    notes: '',
    _dirty: true,
    _deleted: false,
  };
}

function DiagnosisRow({ row, onChange, onDelete }) {
  return (
    <div
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '12px',
        background: row.is_primary ? '#f0f9ff' : '#fff',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '100px 120px 1fr 130px 140px',
          gap: '8px',
          marginBottom: '8px',
          alignItems: 'end',
        }}
      >
        <div>
          <label style={labelStyle}>System</label>
          <select style={inputStyle} value={row.code_system} onChange={(e) => onChange('code_system', e.target.value)}>
            <option value="DSM-5">DSM-5</option>
            <option value="ICD-10">ICD-10</option>
            <option value="ICD-11">ICD-11</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Code</label>
          <input style={inputStyle} type="text" value={row.code} onChange={(e) => onChange('code', e.target.value)} placeholder="F41.1" />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} type="text" value={row.description} onChange={(e) => onChange('description', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Onset Date</label>
          <input style={inputStyle} type="date" value={row.onset_date} onChange={(e) => onChange('onset_date', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={row.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="rule_out">Rule Out</option>
            <option value="deferred">Deferred</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Notes</label>
        <input style={inputStyle} type="text" value={row.notes} onChange={(e) => onChange('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!row.is_primary} onChange={(e) => onChange('is_primary', e.target.checked)} />
          Primary Diagnosis
          {row.is_primary && (
            <span style={{ background: '#0861ea', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', marginLeft: '4px' }}>
              PRIMARY
            </span>
          )}
        </label>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: '13px' }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function DiagnosesList({ clientId, initialDiagnoses }) {
  const sorted = [...(initialDiagnoses ?? [])].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const [rows, setRows] = useState(sorted.map((d) => ({ ...d, _key: Math.random(), _dirty: false, _deleted: false })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key, field, value) => {
    setRows((prev) => {
      let updated = prev.map((r) => (r._key === key ? { ...r, [field]: value, _dirty: true } : r));
      if (field === 'is_primary' && value) {
        updated = updated.map((r) => (r._key === key ? r : { ...r, is_primary: false, _dirty: true }));
      }
      return updated;
    });
  };

  const handleDelete = (key) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, _deleted: true } : r)));
  };

  const handleAdd = () => {
    setRows((prev) => [...prev, emptyDiagnosis()]);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      for (const r of rows) {
        if (r._deleted) {
          if (r.id) await deleteClientDiagnosis(clientId, r.id);
        } else if (r._dirty) {
          const data = {
            code_system: r.code_system,
            code: r.code.trim(),
            description: r.description.trim(),
            onset_date: r.onset_date || null,
            status: r.status,
            is_primary: r.is_primary ? 1 : 0,
            notes: r.notes.trim() || null,
          };
          if (r.id) {
            await updateClientDiagnosis(clientId, r.id, data);
          } else {
            const result = await createClientDiagnosis(clientId, data);
            r.id = result.item?.id ?? result.id;
          }
        }
      }
      setRows((prev) => prev.filter((r) => !r._deleted).map((r) => ({ ...r, _dirty: false })));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const visible = rows.filter((r) => !r._deleted);

  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={sectionHeaderStyle}>Diagnoses</h2>
      {visible.length === 0 && <p style={{ fontSize: '14px', color: '#62708b', marginBottom: '12px' }}>No diagnoses on file.</p>}
      {visible.map((row) => (
        <DiagnosisRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />
      ))}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button type="button" style={addBtnStyle} onClick={handleAdd}>+ Add Diagnosis</button>
        <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>{loading ? 'Saving...' : 'Save All Diagnoses'}</button>
      </div>
      {error && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '8px' }}>Diagnoses saved.</p>}
    </section>
  );
}

// ── Medications ───────────────────────────────────────────────────────────────

function emptyMedication() {
  return {
    _key: Math.random(),
    id: null,
    med_name: '',
    dose: '',
    frequency: '',
    route: 'oral',
    prescriber: '',
    start_date: '',
    end_date: '',
    is_active: true,
    reason: '',
    notes: '',
    _dirty: true,
    _deleted: false,
  };
}

function MedicationRow({ row, onChange, onDelete }) {
  return (
    <div
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '12px',
        background: row.is_active ? '#fff' : '#f9fafb',
        opacity: row.is_active ? 1 : 0.8,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label style={labelStyle}>Medication Name</label>
          <input style={inputStyle} type="text" value={row.med_name} onChange={(e) => onChange('med_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Dose</label>
          <input style={inputStyle} type="text" value={row.dose} placeholder="50 mg" onChange={(e) => onChange('dose', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Frequency</label>
          <input style={inputStyle} type="text" value={row.frequency} placeholder="once daily" onChange={(e) => onChange('frequency', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Route</label>
          <select style={inputStyle} value={row.route} onChange={(e) => onChange('route', e.target.value)}>
            <option value="oral">Oral</option>
            <option value="IM">IM</option>
            <option value="topical">Topical</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Prescribing Provider</label>
          <input style={inputStyle} type="text" value={row.prescriber} onChange={(e) => onChange('prescriber', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="date" value={row.start_date} onChange={(e) => onChange('start_date', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input style={inputStyle} type="date" value={row.end_date} onChange={(e) => onChange('end_date', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Reason / Indication</label>
          <input style={inputStyle} type="text" value={row.reason} onChange={(e) => onChange('reason', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Notes</label>
        <input style={inputStyle} type="text" value={row.notes} onChange={(e) => onChange('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!row.is_active} onChange={(e) => onChange('is_active', e.target.checked)} />
          Currently Active
        </label>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: '13px' }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function MedicationsList({ clientId, initialMedications }) {
  const sorted = [...(initialMedications ?? [])].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
  const [rows, setRows] = useState(sorted.map((m) => ({ ...m, _key: Math.random(), _dirty: false, _deleted: false })));
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value, _dirty: true } : r)));
  };

  const handleDelete = (key) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, _deleted: true } : r)));
  };

  const handleAdd = () => setRows((prev) => [...prev, emptyMedication()]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      for (const r of rows) {
        if (r._deleted) {
          if (r.id) await deleteClientMedication(clientId, r.id);
        } else if (r._dirty) {
          const data = {
            med_name: r.med_name.trim(),
            dose: r.dose.trim() || null,
            frequency: r.frequency.trim() || null,
            route: r.route || null,
            prescriber: r.prescriber.trim() || null,
            start_date: r.start_date || null,
            end_date: r.end_date || null,
            is_active: r.is_active ? 1 : 0,
            reason: r.reason.trim() || null,
            notes: r.notes.trim() || null,
          };
          if (r.id) {
            await updateClientMedication(clientId, r.id, data);
          } else {
            const result = await createClientMedication(clientId, data);
            r.id = result.item?.id ?? result.id;
          }
        }
      }
      setRows((prev) => prev.filter((r) => !r._deleted).map((r) => ({ ...r, _dirty: false })));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const visible = rows.filter((r) => !r._deleted);
  const active = visible.filter((r) => r.is_active);
  const discontinued = visible.filter((r) => !r.is_active);

  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={sectionHeaderStyle}>Medications</h2>
      {active.length === 0 && <p style={{ fontSize: '14px', color: '#62708b', marginBottom: '12px' }}>No active medications.</p>}
      {active.map((row) => (
        <MedicationRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />
      ))}

      {discontinued.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setShowDiscontinued((v) => !v)}
            style={{ background: 'none', border: 'none', color: '#0861ea', fontSize: '13px', cursor: 'pointer', padding: 0 }}
          >
            {showDiscontinued ? 'Hide' : 'Show'} Discontinued ({discontinued.length})
          </button>
          {showDiscontinued && discontinued.map((row) => (
            <MedicationRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button type="button" style={addBtnStyle} onClick={handleAdd}>+ Add Medication</button>
        <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>{loading ? 'Saving...' : 'Save All Medications'}</button>
      </div>
      {error && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '8px' }}>Medications saved.</p>}
    </section>
  );
}

// ── Allergies ─────────────────────────────────────────────────────────────────

function emptyAllergy() {
  return {
    _key: Math.random(),
    id: null,
    substance: '',
    reaction: '',
    severity: 'unknown',
    allergy_type: 'drug',
    onset_date: '',
    is_active: true,
    _dirty: true,
    _deleted: false,
  };
}

function AllergyRow({ row, onChange, onDelete }) {
  return (
    <div style={{ border: '1px solid #e1e8ed', borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label style={labelStyle}>Substance</label>
          <input style={inputStyle} type="text" value={row.substance} onChange={(e) => onChange('substance', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Reaction</label>
          <input style={inputStyle} type="text" value={row.reaction} onChange={(e) => onChange('reaction', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Severity</label>
          <select style={inputStyle} value={row.severity} onChange={(e) => onChange('severity', e.target.value)}>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="life_threatening">Life-Threatening</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={row.allergy_type} onChange={(e) => onChange('allergy_type', e.target.value)}>
            <option value="drug">Drug</option>
            <option value="food">Food</option>
            <option value="environmental">Environmental</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Onset Date</label>
          <input style={inputStyle} type="date" value={row.onset_date} onChange={(e) => onChange('onset_date', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!row.is_active} onChange={(e) => onChange('is_active', e.target.checked)} />
          Active
        </label>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: '13px' }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function AllergiesList({ clientId, initialAllergies }) {
  const [rows, setRows] = useState((initialAllergies ?? []).map((a) => ({ ...a, _key: Math.random(), _dirty: false, _deleted: false })));
  const [noKnownAllergies, setNoKnownAllergies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value, _dirty: true } : r)));
  };

  const handleDelete = (key) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, _deleted: true } : r)));
  };

  const handleAdd = () => {
    if (noKnownAllergies) return;
    setRows((prev) => [...prev, emptyAllergy()]);
  };

  const handleNkaToggle = (checked) => {
    setNoKnownAllergies(checked);
    if (checked) {
      setRows((prev) => prev.map((r) => ({ ...r, _deleted: true })));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      for (const r of rows) {
        if (r._deleted) {
          if (r.id) await deleteClientAllergy(clientId, r.id);
        } else if (r._dirty) {
          const data = {
            substance: r.substance.trim(),
            reaction: r.reaction.trim() || null,
            severity: r.severity,
            allergy_type: r.allergy_type,
            onset_date: r.onset_date || null,
            is_active: r.is_active ? 1 : 0,
          };
          if (r.id) {
            await updateClientAllergy(clientId, r.id, data);
          } else {
            const result = await createClientAllergy(clientId, data);
            r.id = result.item?.id ?? result.id;
          }
        }
      }
      setRows((prev) => prev.filter((r) => !r._deleted).map((r) => ({ ...r, _dirty: false })));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const visible = rows.filter((r) => !r._deleted);

  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={sectionHeaderStyle}>Allergies</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '14px' }}>
        <input type="checkbox" checked={noKnownAllergies} onChange={(e) => handleNkaToggle(e.target.checked)} />
        No Known Allergies (NKA)
      </label>
      {!noKnownAllergies && (
        <>
          {visible.length === 0 && <p style={{ fontSize: '14px', color: '#62708b', marginBottom: '12px' }}>No allergies on file.</p>}
          {visible.map((row) => (
            <AllergyRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />
          ))}
        </>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {!noKnownAllergies && (
          <button type="button" style={addBtnStyle} onClick={handleAdd}>+ Add Allergy</button>
        )}
        <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>{loading ? 'Saving...' : 'Save All Allergies'}</button>
      </div>
      {error && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '8px' }}>Allergies saved.</p>}
    </section>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function DiagnosesTab({ client, clientId }) {
  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <DiagnosesList clientId={clientId} initialDiagnoses={client.diagnoses ?? []} />
      <MedicationsList clientId={clientId} initialMedications={client.medications ?? []} />
      <AllergiesList clientId={clientId} initialAllergies={client.allergies ?? []} />
    </div>
  );
}
