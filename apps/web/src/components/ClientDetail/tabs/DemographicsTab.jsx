import { useState } from 'react';
import {
  patchClient,
  createClientPhone,
  updateClientPhone,
  deleteClientPhone,
  createClientAddress,
  updateClientAddress,
  deleteClientAddress,
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '16px',
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

const clientStatuses = ['active', 'waitlist', 'inactive', 'discharged'];
const languages = ['English', 'Spanish', 'French', 'Mandarin', 'Cantonese', 'Vietnamese', 'Arabic', 'Korean', 'Tagalog', 'Portuguese', 'Russian', 'Haitian Creole', 'Other'];
const maritalStatuses = ['single', 'married', 'separated', 'divorced', 'widowed', 'partnered', 'other'];
const employmentStatuses = ['employed_full_time', 'employed_part_time', 'self_employed', 'unemployed', 'student', 'retired', 'disability', 'other'];
const employedStatuses = ['employed_full_time', 'employed_part_time', 'self_employed'];
const phoneTypes = ['cell', 'home', 'work', 'fax'];
const addressTypes = ['primary', 'mailing', 'other'];

function newPhone() {
  return { _key: Math.random(), id: null, phone_type: 'cell', number: '', extension: '', is_preferred: false, ok_to_text: false, ok_to_leave_msg: true, _deleted: false, _dirty: true };
}

function newAddress() {
  return { _key: Math.random(), id: null, addr_type: 'primary', line1: '', line2: '', city: '', state: '', postal: '', country: 'US', is_preferred: false, _deleted: false, _dirty: true };
}

export default function DemographicsTab({ client, clientId }) {
  // ── Identity ────────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(client.firstName ?? '');
  const [middleName, setMiddleName] = useState(client.middleName ?? '');
  const [lastName, setLastName] = useState(client.lastName ?? '');
  const [preferredName, setPreferredName] = useState(client.preferredName ?? '');
  const [pronouns, setPronouns] = useState(client.pronouns ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(client.dateOfBirth ?? '');
  const [ssnLast4, setSsnLast4] = useState(client.ssnLast4 ?? '');
  const [showSsn, setShowSsn] = useState(false);
  const [status, setStatus] = useState(client.status ?? 'active');
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState(null);
  const [identitySuccess, setIdentitySuccess] = useState(false);

  // ── Demographics ────────────────────────────────────────────────────────────
  const [genderIdentity, setGenderIdentity] = useState(client.genderIdentity ?? '');
  const [biologicalSex, setBiologicalSex] = useState(client.biologicalSex ?? '');
  const [raceEthnicity, setRaceEthnicity] = useState(client.raceEthnicity ?? '');
  const [maritalStatus, setMaritalStatus] = useState(client.maritalStatus ?? '');
  const [languagePreference, setLanguagePreference] = useState(client.languagePreference ?? 'English');
  const [employmentStatus, setEmploymentStatus] = useState(client.employmentStatus ?? '');
  const [employerName, setEmployerName] = useState(client.employerName ?? '');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  // ── Contact — email ─────────────────────────────────────────────────────────
  const [email, setEmail] = useState(client.email ?? '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // ── Phones ──────────────────────────────────────────────────────────────────
  const initPhones = (client.phones ?? []).map((p) => ({ ...p, _key: Math.random(), _deleted: false, _dirty: false }));
  const [phones, setPhones] = useState(initPhones);
  const [phonesLoading, setPhonesLoading] = useState(false);
  const [phonesError, setPhonesError] = useState(null);
  const [phonesSuccess, setPhonesSuccess] = useState(false);

  // ── Addresses ───────────────────────────────────────────────────────────────
  const initAddresses = (client.addresses ?? []).map((a) => ({ ...a, _key: Math.random(), _deleted: false, _dirty: false }));
  const [addresses, setAddresses] = useState(initAddresses);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState(null);
  const [addressesSuccess, setAddressesSuccess] = useState(false);

  // Calculate age from DOB
  const dobAge = (() => {
    if (!dateOfBirth) return null;
    const d = new Date(dateOfBirth);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age;
  })();

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const saveIdentity = async () => {
    setIdentityLoading(true);
    setIdentityError(null);
    setIdentitySuccess(false);
    try {
      await patchClient(clientId, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        preferredName: preferredName.trim(),
        pronouns: pronouns.trim(),
        dateOfBirth: dateOfBirth || null,
        ssnLast4: ssnLast4.trim() || null,
        status,
      });
      setIdentitySuccess(true);
      setTimeout(() => setIdentitySuccess(false), 3000);
    } catch (err) {
      setIdentityError(err.message);
    } finally {
      setIdentityLoading(false);
    }
  };

  const saveDemographics = async () => {
    setDemoLoading(true);
    setDemoError(null);
    setDemoSuccess(false);
    try {
      await patchClient(clientId, {
        genderIdentity: genderIdentity.trim(),
        biologicalSex: biologicalSex || null,
        raceEthnicity: raceEthnicity.trim(),
        maritalStatus: maritalStatus || null,
        languagePreference: languagePreference || 'English',
        employmentStatus: employmentStatus || null,
        employerName: employmentStatuses.includes(employmentStatus) && employedStatuses.includes(employmentStatus) ? employerName.trim() : null,
      });
      setDemoSuccess(true);
      setTimeout(() => setDemoSuccess(false), 3000);
    } catch (err) {
      setDemoError(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const saveEmail = async () => {
    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(false);
    try {
      await patchClient(clientId, { email: email.trim() || null });
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const updatePhone = (key, field, value) => {
    setPhones((prev) =>
      prev.map((p) => (p._key === key ? { ...p, [field]: value, _dirty: true } : p))
    );
  };

  const removePhone = (key) => {
    setPhones((prev) =>
      prev.map((p) => (p._key === key ? { ...p, _deleted: true } : p))
    );
  };

  const addPhone = () => {
    setPhones((prev) => [...prev, newPhone()]);
  };

  const savePhones = async () => {
    setPhonesLoading(true);
    setPhonesError(null);
    setPhonesSuccess(false);
    try {
      for (const p of phones) {
        if (p._deleted) {
          if (p.id) await deleteClientPhone(clientId, p.id);
        } else if (p._dirty) {
          const data = {
            phone_type: p.phone_type,
            number: p.number,
            extension: p.extension || null,
            is_preferred: p.is_preferred ? 1 : 0,
            ok_to_text: p.ok_to_text ? 1 : 0,
            ok_to_leave_msg: p.ok_to_leave_msg ? 1 : 0,
          };
          if (p.id) {
            await updateClientPhone(clientId, p.id, data);
          } else {
            const result = await createClientPhone(clientId, data);
            p.id = result.item?.id ?? result.id;
          }
        }
      }
      setPhones((prev) => prev.filter((p) => !p._deleted).map((p) => ({ ...p, _dirty: false })));
      setPhonesSuccess(true);
      setTimeout(() => setPhonesSuccess(false), 3000);
    } catch (err) {
      setPhonesError(err.message);
    } finally {
      setPhonesLoading(false);
    }
  };

  const updateAddress = (key, field, value) => {
    setAddresses((prev) =>
      prev.map((a) => (a._key === key ? { ...a, [field]: value, _dirty: true } : a))
    );
  };

  const removeAddress = (key) => {
    setAddresses((prev) =>
      prev.map((a) => (a._key === key ? { ...a, _deleted: true } : a))
    );
  };

  const addAddress = () => {
    setAddresses((prev) => [...prev, newAddress()]);
  };

  const saveAddresses = async () => {
    setAddressesLoading(true);
    setAddressesError(null);
    setAddressesSuccess(false);
    try {
      for (const a of addresses) {
        if (a._deleted) {
          if (a.id) await deleteClientAddress(clientId, a.id);
        } else if (a._dirty) {
          const data = {
            addr_type: a.addr_type,
            line1: a.line1,
            line2: a.line2 || null,
            city: a.city,
            state: a.state,
            postal: a.postal,
            country: a.country || 'US',
            is_preferred: a.is_preferred ? 1 : 0,
          };
          if (a.id) {
            await updateClientAddress(clientId, a.id, data);
          } else {
            const result = await createClientAddress(clientId, data);
            a.id = result.item?.id ?? result.id;
          }
        }
      }
      setAddresses((prev) => prev.filter((a) => !a._deleted).map((a) => ({ ...a, _dirty: false })));
      setAddressesSuccess(true);
      setTimeout(() => setAddressesSuccess(false), 3000);
    } catch (err) {
      setAddressesError(err.message);
    } finally {
      setAddressesLoading(false);
    }
  };

  const visiblePhones = phones.filter((p) => !p._deleted);
  const visibleAddresses = addresses.filter((a) => !a._deleted);

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>

      {/* ── Identity Section ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeaderStyle}>Legal Identity</h2>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Legal First Name *</label>
            <input style={inputStyle} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Legal Middle Name</label>
            <input style={inputStyle} type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Legal Last Name *</label>
            <input style={inputStyle} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Preferred Name / Goes By</label>
            <input style={inputStyle} type="text" value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Pronouns</label>
            <input style={inputStyle} type="text" value={pronouns} placeholder="e.g. she/her, they/them" onChange={(e) => setPronouns(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>
              Date of Birth
              {dobAge !== null && (
                <span style={{ fontWeight: 400, color: '#62708b', marginLeft: '8px' }}>({dobAge} yrs)</span>
              )}
            </label>
            <input style={inputStyle} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>SSN Last 4</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: '70px' }}
                type={showSsn ? 'text' : 'password'}
                value={ssnLast4}
                maxLength={4}
                pattern="\d{4}"
                placeholder="••••"
                onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button
                type="button"
                onClick={() => setShowSsn((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#0861ea',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                {showSsn ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              {clientStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {identityError && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '12px' }}>{identityError}</p>}
        {identitySuccess && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '12px' }}>Identity saved.</p>}
        <div style={{ marginTop: '16px' }}>
          <button type="button" style={saveBtnStyle} disabled={identityLoading} onClick={saveIdentity}>
            {identityLoading ? 'Saving...' : 'Save Identity'}
          </button>
        </div>
      </section>

      {/* ── Demographics Section ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeaderStyle}>Demographics</h2>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Gender Identity</label>
            <input style={inputStyle} type="text" value={genderIdentity} placeholder="e.g. Man, Woman, Non-binary" onChange={(e) => setGenderIdentity(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Biological Sex</label>
            <select style={inputStyle} value={biologicalSex} onChange={(e) => setBiologicalSex(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="intersex">Intersex</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Race / Ethnicity</label>
            <input style={inputStyle} type="text" value={raceEthnicity} placeholder="e.g. Hispanic or Latino" onChange={(e) => setRaceEthnicity(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Marital Status</label>
            <select style={inputStyle} value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
              <option value="">-- Select --</option>
              {maritalStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Language Preference</label>
            <select style={inputStyle} value={languagePreference} onChange={(e) => setLanguagePreference(e.target.value)}>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Employment Status</label>
            <select style={inputStyle} value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)}>
              <option value="">-- Select --</option>
              {employmentStatuses.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          {employedStatuses.includes(employmentStatus) && (
            <div>
              <label style={labelStyle}>Employer Name</label>
              <input style={inputStyle} type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
            </div>
          )}
        </div>
        {demoError && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '12px' }}>{demoError}</p>}
        {demoSuccess && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '12px' }}>Demographics saved.</p>}
        <div style={{ marginTop: '16px' }}>
          <button type="button" style={saveBtnStyle} disabled={demoLoading} onClick={saveDemographics}>
            {demoLoading ? 'Saving...' : 'Save Demographics'}
          </button>
        </div>
      </section>

      {/* ── Contact Information Section ──────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeaderStyle}>Contact Information</h2>

        {/* Email */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Email Address</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <input style={{ ...inputStyle, flex: 1 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
            <button type="button" style={{ ...saveBtnStyle, whiteSpace: 'nowrap', flexShrink: 0 }} disabled={emailLoading} onClick={saveEmail}>
              {emailLoading ? 'Saving...' : 'Save Email'}
            </button>
          </div>
          {emailError && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '6px' }}>{emailError}</p>}
          {emailSuccess && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '6px' }}>Email saved.</p>}
        </div>

        {/* Phones */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Phone Numbers</h3>
          {visiblePhones.length === 0 && (
            <p style={{ fontSize: '14px', color: '#62708b', marginBottom: '8px' }}>No phones added.</p>
          )}
          {visiblePhones.map((p) => (
            <div
              key={p._key}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 80px auto auto auto auto',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '4px',
                border: '1px solid #e1e8ed',
              }}
            >
              <select style={inputStyle} value={p.phone_type} onChange={(e) => updatePhone(p._key, 'phone_type', e.target.value)}>
                {phoneTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <input
                style={inputStyle}
                type="tel"
                value={p.number}
                placeholder="(555) 555-5555"
                onChange={(e) => updatePhone(p._key, 'number', e.target.value)}
              />
              <input
                style={inputStyle}
                type="text"
                value={p.extension ?? ''}
                placeholder="Ext."
                onChange={(e) => updatePhone(p._key, 'extension', e.target.value)}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!p.is_preferred} onChange={(e) => updatePhone(p._key, 'is_preferred', e.target.checked)} />
                Preferred
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!p.ok_to_text} onChange={(e) => updatePhone(p._key, 'ok_to_text', e.target.checked)} />
                OK Text
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!p.ok_to_leave_msg} onChange={(e) => updatePhone(p._key, 'ok_to_leave_msg', e.target.checked)} />
                OK Msg
              </label>
              <button
                type="button"
                onClick={() => removePhone(p._key)}
                style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                title="Remove phone"
              >
                &times;
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={addPhone}
              style={{
                padding: '6px 14px',
                border: '1px solid #0861ea',
                borderRadius: '4px',
                color: '#0861ea',
                background: 'none',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add Phone
            </button>
            <button type="button" style={saveBtnStyle} disabled={phonesLoading} onClick={savePhones}>
              {phonesLoading ? 'Saving...' : 'Save Phones'}
            </button>
          </div>
          {phonesError && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '6px' }}>{phonesError}</p>}
          {phonesSuccess && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '6px' }}>Phones saved.</p>}
        </div>

        {/* Addresses */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Addresses</h3>
          {visibleAddresses.length === 0 && (
            <p style={{ fontSize: '14px', color: '#62708b', marginBottom: '8px' }}>No addresses added.</p>
          )}
          {visibleAddresses.map((a) => (
            <div
              key={a._key}
              style={{
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '4px',
                border: '1px solid #e1e8ed',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select style={inputStyle} value={a.addr_type} onChange={(e) => updateAddress(a._key, 'addr_type', e.target.value)}>
                    {addressTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Address Line 1</label>
                  <input style={inputStyle} type="text" value={a.line1} onChange={(e) => updateAddress(a._key, 'line1', e.target.value)} placeholder="Street address" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 80px', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={labelStyle}>Line 2</label>
                  <input style={inputStyle} type="text" value={a.line2 ?? ''} onChange={(e) => updateAddress(a._key, 'line2', e.target.value)} placeholder="Apt, Suite, etc." />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} type="text" value={a.city} onChange={(e) => updateAddress(a._key, 'city', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input style={inputStyle} type="text" value={a.state} onChange={(e) => updateAddress(a._key, 'state', e.target.value)} placeholder="CA" maxLength={64} />
                </div>
                <div>
                  <label style={labelStyle}>Postal</label>
                  <input style={inputStyle} type="text" value={a.postal} onChange={(e) => updateAddress(a._key, 'postal', e.target.value)} placeholder="90210" />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input style={inputStyle} type="text" value={a.country} onChange={(e) => updateAddress(a._key, 'country', e.target.value)} placeholder="US" maxLength={4} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!a.is_preferred} onChange={(e) => updateAddress(a._key, 'is_preferred', e.target.checked)} />
                  Preferred address
                </label>
                <button
                  type="button"
                  onClick={() => removeAddress(a._key)}
                  style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: '13px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={addAddress}
              style={{
                padding: '6px 14px',
                border: '1px solid #0861ea',
                borderRadius: '4px',
                color: '#0861ea',
                background: 'none',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add Address
            </button>
            <button type="button" style={saveBtnStyle} disabled={addressesLoading} onClick={saveAddresses}>
              {addressesLoading ? 'Saving...' : 'Save Addresses'}
            </button>
          </div>
          {addressesError && <p style={{ color: '#b42318', fontSize: '14px', marginTop: '6px' }}>{addressesError}</p>}
          {addressesSuccess && <p style={{ color: '#065f46', fontSize: '14px', marginTop: '6px' }}>Addresses saved.</p>}
        </div>
      </section>
    </div>
  );
}
