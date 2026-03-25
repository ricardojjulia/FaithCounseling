import { useState } from 'react';
import {
  createClientContact,
  updateClientContact,
  deleteClientContact,
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

const relationships = ['spouse', 'parent', 'child', 'sibling', 'friend', 'guardian', 'attorney', 'case manager', 'other'];
const contactTypes = ['emergency', 'guardian', 'other'];

function emptyContact(isMinor) {
  return {
    _key: Math.random(),
    id: null,
    contact_type: isMinor ? 'guardian' : 'emergency',
    name: '',
    relationship: '',
    phone: '',
    email: '',
    is_primary: false,
    has_legal_auth: false,
    notes: '',
    _isNew: true,
    _loading: false,
    _error: null,
    _success: false,
  };
}

function ContactCard({ contact, clientId, isMinor, onSaved, onDeleted, onSetPrimary }) {
  const [form, setForm] = useState({
    contact_type: contact.contact_type ?? (isMinor ? 'guardian' : 'emergency'),
    name: contact.name ?? '',
    relationship: contact.relationship ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    is_primary: contact.is_primary ?? false,
    has_legal_auth: contact.has_legal_auth ?? false,
    notes: contact.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = {
        contact_type: form.contact_type,
        name: form.name.trim(),
        relationship: form.relationship,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        is_primary: form.is_primary ? 1 : 0,
        has_legal_auth: form.has_legal_auth ? 1 : 0,
        notes: form.notes.trim() || null,
      };
      let result;
      if (contact.id) {
        result = await updateClientContact(clientId, contact.id, data);
      } else {
        result = await createClientContact(clientId, data);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaved(result.item ?? result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contact.id) { onDeleted(contact._key); return; }
    if (!confirm(`Remove contact ${contact.name || 'this contact'}?`)) return;
    setLoading(true);
    try {
      await deleteClientContact(clientId, contact.id);
      onDeleted(contact._key);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '16px',
        background: form.is_primary ? '#f0f9ff' : '#fff',
        position: 'relative',
      }}
    >
      {form.is_primary && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: '#0861ea',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          Primary
        </span>
      )}
      {form.has_legal_auth && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: form.is_primary ? '80px' : '12px',
            background: '#065f46',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          PHI Auth
        </span>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <label style={labelStyle}>Contact Type</label>
          <select style={inputStyle} value={form.contact_type} onChange={(e) => handleChange('contact_type', e.target.value)}>
            {contactTypes.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Contact's full name" />
        </div>
        <div>
          <label style={labelStyle}>Relationship</label>
          <select style={inputStyle} value={form.relationship} onChange={(e) => handleChange('relationship', e.target.value)}>
            <option value="">-- Select --</option>
            {relationships.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Phone Number</label>
          <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(555) 555-5555" />
        </div>
        <div>
          <label style={labelStyle}>Email Address</label>
          <input style={inputStyle} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="contact@example.com" />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!form.is_primary}
            onChange={(e) => {
              handleChange('is_primary', e.target.checked);
              if (e.target.checked) onSetPrimary(contact._key);
            }}
          />
          Primary Contact
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.has_legal_auth} onChange={(e) => handleChange('has_legal_auth', e.target.checked)} />
          Authorized to receive PHI
        </label>
      </div>

      {error && <p style={{ color: '#b42318', fontSize: '14px', marginBottom: '8px' }}>{error}</p>}
      {success && <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '8px' }}>Saved.</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" style={saveBtnStyle} disabled={loading} onClick={handleSave}>
          {loading ? 'Saving...' : 'Save Contact'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleDelete}
          style={{
            padding: '7px 18px',
            border: '1px solid #e1e8ed',
            borderRadius: '4px',
            background: '#fff',
            color: '#b42318',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ContactsTab({ client, clientId }) {
  const isMinor = !!client.is_minor;
  const initContacts = (client.contacts ?? []).map((c) => ({ ...c, _key: Math.random(), _isNew: false }));
  const [contacts, setContacts] = useState(initContacts);

  const handleAdd = () => {
    setContacts((prev) => [...prev, emptyContact(isMinor)]);
  };

  const handleSaved = (key, savedItem) => {
    setContacts((prev) =>
      prev.map((c) => (c._key === key ? { ...savedItem, _key: key, _isNew: false } : c))
    );
  };

  const handleDeleted = (key) => {
    setContacts((prev) => prev.filter((c) => c._key !== key));
  };

  const handleSetPrimary = (key) => {
    setContacts((prev) =>
      prev.map((c) => (c._key === key ? { ...c, is_primary: true } : { ...c, is_primary: false }))
    );
  };

  const sorted = [...contacts].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <h2 style={sectionHeaderStyle}>
        {isMinor ? 'Guardian & Emergency Contacts' : 'Emergency Contacts'}
      </h2>

      {sorted.length === 0 && (
        <p style={{ color: '#62708b', fontSize: '14px', marginBottom: '16px' }}>No contacts on file.</p>
      )}

      {sorted.map((contact) => (
        <ContactCard
          key={contact._key}
          contact={contact}
          clientId={clientId}
          isMinor={isMinor}
          onSaved={(saved) => handleSaved(contact._key, saved)}
          onDeleted={handleDeleted}
          onSetPrimary={handleSetPrimary}
        />
      ))}

      <button
        type="button"
        onClick={handleAdd}
        style={{
          padding: '8px 16px',
          border: '1px solid #0861ea',
          borderRadius: '4px',
          color: '#0861ea',
          background: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '4px',
        }}
      >
        + Add Emergency Contact
      </button>
    </div>
  );
}
