import { useState } from 'react';
import {
  createClientInsurance,
  updateClientInsurance,
  createReferringProvider,
  updateReferringProvider,
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

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '14px',
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

function emptyInsurance(order) {
  return {
    id: null,
    coverage_order: order,
    carrier_name: '',
    plan_name: '',
    member_id: '',
    group_number: '',
    subscriber_name: '',
    subscriber_dob: '',
    subscriber_rel: 'self',
    auth_number: '',
    auth_visits_approved: '',
    auth_expires_on: '',
    referral_number: '',
    copay_cents: '',
    effective_from: '',
    effective_to: '',
    is_active: true,
    verified_on: '',
    verified_by: '',
    self_pay: false,
  };
}

function InsuranceCard({ title, initialData, clientId, coverageOrder }) {
  const [selfPay, setSelfPay] = useState(initialData?.self_pay ?? false);
  const [collapsed, setCollapsed] = useState(false);
  const [form, setForm] = useState({
    id: initialData?.id ?? null,
    carrier_name: initialData?.carrier_name ?? '',
    plan_name: initialData?.plan_name ?? '',
    member_id: initialData?.member_id ?? '',
    group_number: initialData?.group_number ?? '',
    subscriber_name: initialData?.subscriber_name ?? '',
    subscriber_dob: initialData?.subscriber_dob ?? '',
    subscriber_rel: initialData?.subscriber_rel ?? 'self',
    auth_number: initialData?.auth_number ?? '',
    auth_visits_approved: initialData?.auth_visits_approved ?? '',
    auth_expires_on: initialData?.auth_expires_on ?? '',
    referral_number: initialData?.referral_number ?? '',
    copay_cents: initialData?.copay_cents != null ? (initialData.copay_cents / 100).toFixed(2) : '',
    effective_from: initialData?.effective_from ?? '',
    effective_to: initialData?.effective_to ?? '',
    is_active: initialData?.is_active ?? true,
    verified_on: initialData?.verified_on ?? '',
    verified_by: initialData?.verified_by ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = {
        coverage_order: coverageOrder,
        carrier_name: form.carrier_name.trim(),
        plan_name: form.plan_name.trim() || null,
        member_id: form.member_id.trim(),
        group_number: form.group_number.trim() || null,
        subscriber_name: form.subscriber_name.trim() || null,
        subscriber_dob: form.subscriber_dob || null,
        subscriber_rel: form.subscriber_rel || null,
        auth_number: form.auth_number.trim() || null,
        auth_visits_approved: form.auth_visits_approved !== '' ? parseInt(form.auth_visits_approved, 10) : null,
        auth_expires_on: form.auth_expires_on || null,
        referral_number: form.referral_number.trim() || null,
        copay_cents: form.copay_cents !== '' ? Math.round(parseFloat(form.copay_cents) * 100) : null,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        is_active: form.is_active ? 1 : 0,
        verified_on: form.verified_on || null,
        verified_by: form.verified_by.trim() || null,
      };
      let result;
      if (form.id) {
        result = await updateClientInsurance(clientId, form.id, data);
      } else {
        result = await createClientInsurance(clientId, data);
      }
      const saved = result.item ?? result;
      setForm((prev) => ({ ...prev, id: saved.id }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '6px',
        marginBottom: '24px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f9fafb',
          borderBottom: collapsed ? 'none' : '1px solid #e1e8ed',
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{title}</h3>
        <span style={{ fontSize: '12px', color: '#62708b' }}>{collapsed ? '+ Expand' : '- Collapse'}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={selfPay}
              onChange={(e) => {
                setSelfPay(e.target.checked);
                if (e.target.checked) setCollapsed(true);
              }}
            />
            No Insurance / Self-Pay (collapse this section)
          </label>

          {!selfPay && (
            <>
              <div style={{ ...gridStyle, marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Carrier Name</label>
                  <input style={inputStyle} type="text" value={form.carrier_name} onChange={(e) => set('carrier_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Plan Name</label>
                  <input style={inputStyle} type="text" value={form.plan_name} onChange={(e) => set('plan_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Member ID</label>
                  <input style={inputStyle} type="text" value={form.member_id} onChange={(e) => set('member_id', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Group Number</label>
                  <input style={inputStyle} type="text" value={form.group_number} onChange={(e) => set('group_number', e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>Subscriber (if different from client)</h4>
              <div style={{ ...gridStyle, marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Subscriber Name</label>
                  <input style={inputStyle} type="text" value={form.subscriber_name} onChange={(e) => set('subscriber_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Subscriber DOB</label>
                  <input style={inputStyle} type="date" value={form.subscriber_dob} onChange={(e) => set('subscriber_dob', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Relationship to Client</label>
                  <select style={inputStyle} value={form.subscriber_rel} onChange={(e) => set('subscriber_rel', e.target.value)}>
                    <option value="self">Self</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>Authorization & Billing</h4>
              <div style={{ ...gridStyle, marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Authorization Number</label>
                  <input style={inputStyle} type="text" value={form.auth_number} onChange={(e) => set('auth_number', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Authorized Visits</label>
                  <input style={inputStyle} type="number" min="0" value={form.auth_visits_approved} onChange={(e) => set('auth_visits_approved', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Auth Expiration</label>
                  <input style={inputStyle} type="date" value={form.auth_expires_on} onChange={(e) => set('auth_expires_on', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Referral Number</label>
                  <input style={inputStyle} type="text" value={form.referral_number} onChange={(e) => set('referral_number', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Copay ($)</label>
                  <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.copay_cents} onChange={(e) => set('copay_cents', e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>Coverage Period & Verification</h4>
              <div style={{ ...gridStyle, marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Effective From</label>
                  <input style={inputStyle} type="date" value={form.effective_from} onChange={(e) => set('effective_from', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Effective To</label>
                  <input style={inputStyle} type="date" value={form.effective_to} onChange={(e) => set('effective_to', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Verified On</label>
                  <input style={inputStyle} type="date" value={form.verified_on} onChange={(e) => set('verified_on', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Verified By</label>
                  <input style={inputStyle} type="text" value={form.verified_by} onChange={(e) => set('verified_by', e.target.value)} placeholder="Staff name" />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                  Coverage is currently active
                </label>
              </div>

              {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
              {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '10px' }}>Insurance saved.</p>}

              <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>
                {loading ? 'Saving...' : `Save ${title}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReferringProviderSection({ clientId, initialProvider }) {
  const [form, setForm] = useState({
    id: initialProvider?.id ?? null,
    provider_name: initialProvider?.provider_name ?? '',
    practice_name: initialProvider?.practice_name ?? '',
    npi: initialProvider?.npi ?? '',
    phone: initialProvider?.phone ?? '',
    fax: initialProvider?.fax ?? '',
    address_line1: initialProvider?.address?.line1 ?? '',
    address_city: initialProvider?.address?.city ?? '',
    address_state: initialProvider?.address?.state ?? '',
    address_postal: initialProvider?.address?.postal ?? '',
    referral_date: initialProvider?.referral_date ?? '',
    referral_notes: initialProvider?.referral_notes ?? '',
  });
  const [npiError, setNpiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleNpiChange = (value) => {
    set('npi', value);
    if (value && !/^\d{10}$/.test(value)) {
      setNpiError('NPI must be exactly 10 digits.');
    } else {
      setNpiError(null);
    }
  };

  const handleSave = async () => {
    if (npiError) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = {
        provider_name: form.provider_name.trim(),
        practice_name: form.practice_name.trim() || null,
        npi: form.npi.trim() || null,
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
        address: {
          line1: form.address_line1.trim(),
          city: form.address_city.trim(),
          state: form.address_state.trim(),
          postal: form.address_postal.trim(),
        },
        referral_date: form.referral_date || null,
        referral_notes: form.referral_notes.trim() || null,
      };
      let result;
      if (form.id) {
        result = await updateReferringProvider(clientId, form.id, data);
      } else {
        result = await createReferringProvider(clientId, data);
      }
      const saved = result.item ?? result;
      setForm((prev) => ({ ...prev, id: saved.id }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <h2 style={sectionHeaderStyle}>Referring Provider</h2>
      <div style={{ ...gridStyle, marginBottom: '14px' }}>
        <div>
          <label style={labelStyle}>Provider Full Name</label>
          <input style={inputStyle} type="text" value={form.provider_name} onChange={(e) => set('provider_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Practice / Organization</label>
          <input style={inputStyle} type="text" value={form.practice_name} onChange={(e) => set('practice_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>NPI (10 digits)</label>
          <input style={inputStyle} type="text" value={form.npi} onChange={(e) => handleNpiChange(e.target.value)} maxLength={10} placeholder="1234567890" />
          {npiError && <p style={{ color: '#b42318', fontSize: '12px', marginTop: '4px' }}>{npiError}</p>}
        </div>
        <div>
          <label style={labelStyle}>Direct Phone</label>
          <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Fax</label>
          <input style={inputStyle} type="tel" value={form.fax} onChange={(e) => set('fax', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Referral Date</label>
          <input style={inputStyle} type="date" value={form.referral_date} onChange={(e) => set('referral_date', e.target.value)} />
        </div>
      </div>
      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>Provider Address</h4>
      <div style={{ ...gridStyle, marginBottom: '14px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Address Line 1</label>
          <input style={inputStyle} type="text" value={form.address_line1} onChange={(e) => set('address_line1', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <input style={inputStyle} type="text" value={form.address_city} onChange={(e) => set('address_city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>State</label>
          <input style={inputStyle} type="text" value={form.address_state} onChange={(e) => set('address_state', e.target.value)} maxLength={64} />
        </div>
        <div>
          <label style={labelStyle}>ZIP</label>
          <input style={inputStyle} type="text" value={form.address_postal} onChange={(e) => set('address_postal', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Referral Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          value={form.referral_notes}
          onChange={(e) => set('referral_notes', e.target.value)}
        />
      </div>
      {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '10px' }}>Referring provider saved.</p>}
      <button type="button" style={saveBtnStyle} disabled={loading || !!npiError} onClick={handleSave}>
        {loading ? 'Saving...' : 'Save Referring Provider'}
      </button>
    </div>
  );
}

export default function InsuranceTab({ client, clientId }) {
  const insurance = client.insurance ?? [];
  const primaryData = insurance.find((i) => i.coverage_order === 'primary') ?? null;
  const secondaryData = insurance.find((i) => i.coverage_order === 'secondary') ?? null;
  const referring = (client.referring ?? [])[0] ?? null;

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <InsuranceCard
        title="Primary Insurance"
        coverageOrder="primary"
        initialData={primaryData}
        clientId={clientId}
      />
      <InsuranceCard
        title="Secondary Coverage"
        coverageOrder="secondary"
        initialData={secondaryData}
        clientId={clientId}
      />
      <ReferringProviderSection clientId={clientId} initialProvider={referring} />
    </div>
  );
}
