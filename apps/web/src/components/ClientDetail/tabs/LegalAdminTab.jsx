import { useState } from 'react';
import { upsertClientLegal, upsertClinicalHistory, patchClient } from '../../../lib/clientApi.js';

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
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '14px',
};

export default function LegalAdminTab({ client, clientId }) {
  const legal = client.legal ?? {};
  const ch = client.clinical ?? {};

  // Guardian section visibility
  const isMinor = !!client.is_minor;
  const [showGuardian, setShowGuardian] = useState(isMinor || !!(legal.guardian_name));

  // Guardian fields
  const [guardianName, setGuardianName] = useState(legal.guardian_name ?? '');
  const [guardianRelationship, setGuardianRelationship] = useState(legal.guardian_relationship ?? '');
  const [guardianPhone, setGuardianPhone] = useState(legal.guardian_phone ?? '');
  const [guardianEmail, setGuardianEmail] = useState(legal.guardian_email ?? '');
  const [guardianAddressLine1, setGuardianAddressLine1] = useState(legal.guardian_address?.line1 ?? '');
  const [guardianAddressCity, setGuardianAddressCity] = useState(legal.guardian_address?.city ?? '');
  const [guardianAddressState, setGuardianAddressState] = useState(legal.guardian_address?.state ?? '');
  const [guardianAddressPostal, setGuardianAddressPostal] = useState(legal.guardian_address?.postal ?? '');

  // Court order fields
  const [courtOrdered, setCourtOrdered] = useState(!!legal.court_ordered || !!client.court_ordered);
  const [courtCaseNumber, setCourtCaseNumber] = useState(legal.court_case_number ?? '');
  const [courtOrderExpires, setCourtOrderExpires] = useState(legal.court_order_expires ?? '');
  const [courtContactName, setCourtContactName] = useState(legal.court_contact?.name ?? '');
  const [courtContactPhone, setCourtContactPhone] = useState(legal.court_contact?.phone ?? '');
  const [courtAttorneyName, setCourtAttorneyName] = useState(legal.court_contact?.attorney ?? '');
  const [custodyNotes, setCustodyNotes] = useState(legal.custody_notes ?? '');

  // Admin fields (mirrors clinical history)
  const [referralSourceDetail, setReferralSourceDetail] = useState(client.referral_source_detail ?? '');
  const [pcpName, setPcpName] = useState(ch.pcp_name ?? '');
  const [pcpPractice, setPcpPractice] = useState(ch.pcp_practice ?? '');
  const [pcpPhone, setPcpPhone] = useState(ch.pcp_phone ?? '');
  const [preferredPharmacy, setPreferredPharmacy] = useState(
    typeof ch.preferred_pharmacy === 'object' && ch.preferred_pharmacy
      ? JSON.stringify(ch.preferred_pharmacy)
      : (ch.preferred_pharmacy ?? '')
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Save legal record
      await upsertClientLegal(clientId, {
        guardian_name: guardianName.trim() || null,
        guardian_relationship: guardianRelationship || null,
        guardian_phone: guardianPhone.trim() || null,
        guardian_email: guardianEmail.trim() || null,
        guardian_address: {
          line1: guardianAddressLine1.trim(),
          city: guardianAddressCity.trim(),
          state: guardianAddressState.trim(),
          postal: guardianAddressPostal.trim(),
        },
        court_ordered: courtOrdered ? 1 : 0,
        court_case_number: courtCaseNumber.trim() || null,
        court_order_expires: courtOrderExpires || null,
        court_contact: {
          name: courtContactName.trim() || null,
          phone: courtContactPhone.trim() || null,
          attorney: courtAttorneyName.trim() || null,
        },
        custody_notes: custodyNotes.trim() || null,
      });

      // Save admin / clinical mirror fields
      await upsertClinicalHistory(clientId, {
        pcp_name: pcpName.trim() || null,
        pcp_practice: pcpPractice.trim() || null,
        pcp_phone: pcpPhone.trim() || null,
        preferred_pharmacy: preferredPharmacy.trim() || null,
      });

      // Save referral source detail on client record
      await patchClient(clientId, {
        referral_source_detail: referralSourceDetail.trim() || null,
        court_ordered: courtOrdered ? 1 : 0,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>

      {/* ── Guardian Section ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e1e8ed', paddingBottom: '8px' }}>
          <h2 style={{ ...sectionHeaderStyle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
            Guardian Information
            {isMinor && (
              <span style={{ marginLeft: '8px', fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>
                Minor Client
              </span>
            )}
          </h2>
          {!isMinor && (
            <button
              type="button"
              onClick={() => setShowGuardian((v) => !v)}
              style={{ background: 'none', border: 'none', color: '#0861ea', fontSize: '13px', cursor: 'pointer' }}
            >
              {showGuardian ? 'Hide Guardian Info' : 'Show Guardian Info'}
            </button>
          )}
        </div>

        {showGuardian && (
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Guardian Full Name</label>
              <input style={inputStyle} type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Relationship</label>
              <select style={inputStyle} value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)}>
                <option value="">-- Select --</option>
                <option value="parent">Parent</option>
                <option value="legal guardian">Legal Guardian</option>
                <option value="power of attorney">Power of Attorney</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Guardian Phone</label>
              <input style={inputStyle} type="tel" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Guardian Email</label>
              <input style={inputStyle} type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Address Line 1</label>
              <input style={inputStyle} type="text" value={guardianAddressLine1} onChange={(e) => setGuardianAddressLine1(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} type="text" value={guardianAddressCity} onChange={(e) => setGuardianAddressCity(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} type="text" value={guardianAddressState} onChange={(e) => setGuardianAddressState(e.target.value)} maxLength={64} />
            </div>
            <div>
              <label style={labelStyle}>ZIP</label>
              <input style={inputStyle} type="text" value={guardianAddressPostal} onChange={(e) => setGuardianAddressPostal(e.target.value)} />
            </div>
          </div>
        )}
      </section>

      {/* ── Court Order Section ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeaderStyle}>Court Order</h2>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            <input type="checkbox" checked={courtOrdered} onChange={(e) => setCourtOrdered(e.target.checked)} />
            Client is court-ordered to attend counseling
          </label>
        </div>

        {courtOrdered && (
          <>
            <div style={{ ...gridStyle, marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Case Number</label>
                <input style={inputStyle} type="text" value={courtCaseNumber} onChange={(e) => setCourtCaseNumber(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Court Order Expires</label>
                <input style={inputStyle} type="date" value={courtOrderExpires} onChange={(e) => setCourtOrderExpires(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Court Officer / Contact Name</label>
                <input style={inputStyle} type="text" value={courtContactName} onChange={(e) => setCourtContactName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Court Contact Phone</label>
                <input style={inputStyle} type="tel" value={courtContactPhone} onChange={(e) => setCourtContactPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Attorney Name</label>
                <input style={inputStyle} type="text" value={courtAttorneyName} onChange={(e) => setCourtAttorneyName(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Custody Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                value={custodyNotes}
                onChange={(e) => setCustodyNotes(e.target.value)}
              />
            </div>
          </>
        )}
      </section>

      {/* ── Administrative Section ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeaderStyle}>Administrative</h2>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Referral Source Detail</label>
          <input
            style={inputStyle}
            type="text"
            value={referralSourceDetail}
            onChange={(e) => setReferralSourceDetail(e.target.value)}
            placeholder='e.g. Referred by Dr. Smith at First Baptist'
          />
        </div>

        <p style={{ fontSize: '13px', color: '#62708b', marginBottom: '12px', fontStyle: 'italic' }}>
          The PCP and Pharmacy fields below are also editable on the Clinical History tab and write to the same record.
        </p>

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
      </section>

      {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '12px' }}>Legal &amp; administrative record saved.</p>}

      <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>
        {loading ? 'Saving...' : 'Save Legal & Admin'}
      </button>
    </div>
  );
}
