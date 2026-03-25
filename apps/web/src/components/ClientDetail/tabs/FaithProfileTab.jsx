import { useState } from 'react';
import { upsertFaithProfile, patchClient } from '../../../lib/clientApi.js';

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

const integrationLevelDescriptions = {
  none: 'Client prefers a secular approach; no faith content.',
  open: 'Client is willing to incorporate faith when relevant.',
  preferred: 'Client wants faith-informed counseling as a standard approach.',
  required: 'Faith integration is essential to the client and must be central.',
};

const denominationOptions = [
  'Evangelical',
  'Baptist',
  'Catholic',
  'Methodist',
  'Presbyterian',
  'Pentecostal',
  'Non-denominational',
  'Orthodox',
  'Jewish',
  'Muslim',
  'Hindu',
  'Buddhist',
  'Other',
  'None',
];

export default function FaithProfileTab({ client, clientId }) {
  const fp = client.faith ?? {};

  const [denomination, setDenomination] = useState(fp.denomination ?? '');
  const [churchName, setChurchName] = useState(fp.church_name ?? '');
  const [pastorName, setPastorName] = useState(fp.pastor_name ?? '');
  const [spiritualDirector, setSpiritualDirector] = useState(fp.spiritual_director ?? '');
  const [faithIntegrationLevel, setFaithIntegrationLevel] = useState(fp.faith_integration_level ?? 'open');
  const [spiritualConcerns, setSpiritualConcerns] = useState(fp.spiritual_concerns ?? '');
  const [religiousRestrictions, setReligiousRestrictions] = useState(fp.religious_restrictions ?? '');
  const [faithStrengths, setFaithStrengths] = useState(fp.faith_strengths ?? '');
  const [faithBackground, setFaithBackground] = useState(client.faithBackground ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await upsertFaithProfile(clientId, {
        denomination: denomination.trim() || null,
        church_name: churchName.trim() || null,
        pastor_name: pastorName.trim() || null,
        spiritual_director: spiritualDirector.trim() || null,
        faith_integration_level: faithIntegrationLevel,
        spiritual_concerns: spiritualConcerns.trim() || null,
        religious_restrictions: religiousRestrictions.trim() || null,
        faith_strengths: faithStrengths.trim() || null,
      });
      await patchClient(clientId, {
        faithBackground: faithBackground.trim() || 'Undeclared',
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
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <h2 style={sectionHeaderStyle}>Faith Profile</h2>

      <div style={{ ...gridStyle, marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>General Faith Label</label>
          <input
            style={inputStyle}
            type="text"
            value={faithBackground}
            onChange={(e) => setFaithBackground(e.target.value)}
            placeholder="e.g. Evangelical, Catholic, Undeclared"
          />
          <p style={{ fontSize: '12px', color: '#62708b', marginTop: '4px' }}>
            Broad label shown on the client list. Also editable on the main client form.
          </p>
        </div>

        <div>
          <label style={labelStyle} htmlFor="denomination-input">Denomination</label>
          <input
            id="denomination-input"
            style={inputStyle}
            type="text"
            list="denomination-list"
            value={denomination}
            onChange={(e) => setDenomination(e.target.value)}
            placeholder="Type or select..."
          />
          <datalist id="denomination-list">
            {denominationOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>

        <div>
          <label style={labelStyle}>Church / Congregation Name</label>
          <input style={inputStyle} type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Pastor / Priest Name</label>
          <input style={inputStyle} type="text" value={pastorName} onChange={(e) => setPastorName(e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Spiritual Director Name</label>
          <input style={inputStyle} type="text" value={spiritualDirector} onChange={(e) => setSpiritualDirector(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Faith Integration Level</label>
        <select
          style={inputStyle}
          value={faithIntegrationLevel}
          onChange={(e) => setFaithIntegrationLevel(e.target.value)}
        >
          <option value="none">None — secular approach preferred</option>
          <option value="open">Open — willing to incorporate faith</option>
          <option value="preferred">Preferred — wants faith-informed counseling</option>
          <option value="required">Required — faith integration is essential</option>
        </select>
        {faithIntegrationLevel && (
          <p
            style={{
              fontSize: '13px',
              color: '#374151',
              marginTop: '6px',
              padding: '8px 12px',
              background: '#f3f4f6',
              borderRadius: '4px',
              borderLeft: '3px solid #0861ea',
            }}
          >
            {integrationLevelDescriptions[faithIntegrationLevel]}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Spiritual Concerns</label>
        <textarea
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={spiritualConcerns}
          onChange={(e) => setSpiritualConcerns(e.target.value)}
          placeholder="What spiritual issues or questions bring the client to counseling?"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Religious Restrictions</label>
        <textarea
          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          value={religiousRestrictions}
          onChange={(e) => setReligiousRestrictions(e.target.value)}
          placeholder="Fasting practices, Sabbath observance, dietary requirements, sacred time constraints..."
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Spiritual Strengths</label>
        <textarea
          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          value={faithStrengths}
          onChange={(e) => setFaithStrengths(e.target.value)}
          placeholder="What aspects of faith are a source of support or resilience for this client?"
        />
      </div>

      {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '12px' }}>Faith profile saved.</p>}

      <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>
        {loading ? 'Saving...' : 'Save Faith Profile'}
      </button>
    </div>
  );
}
