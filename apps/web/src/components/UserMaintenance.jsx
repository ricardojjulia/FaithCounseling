import { useEffect, useMemo, useState } from 'react';
import {
  fetchStaff,
  createStaffUser,
  updateStaffUser,
  runStaffAccountAction,
} from '../lib/clientApi.js';

const ROLE_OPTIONS = [
  'platform_admin',
  'practice_owner',
  'practice_admin',
  'counselor',
  'intern',
  'scheduler_biller',
];

const LICENSE_OPTIONS = [
  'none',
  'lpc',
  'lmft',
  'lcsw',
  'psychologist',
  'pastoral_counselor',
  'ordained_minister',
  'chaplain',
  'intern',
  'other',
];

const SUPERVISION_OPTIONS = ['not_required', 'required', 'supervised', 'supervisor'];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'counselor',
  licenseType: 'pastoral_counselor',
  supervisionStatus: 'not_required',
  initialPassword: '',
};

export default function UserMaintenance({ userRole }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);

  const canManageUsers = useMemo(
    () => ['platform_admin', 'practice_owner', 'practice_admin'].includes(userRole || ''),
    [userRole],
  );

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchStaff();
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      setError(err.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNotice('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      email: item.email || '',
      role: item.role || 'counselor',
      licenseType: item.licenseType || 'pastoral_counselor',
      supervisionStatus: item.supervisionStatus || 'not_required',
      initialPassword: '',
    });
    setNotice('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice('');

    try {
      if (editing) {
        await updateStaffUser(editing.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          licenseType: form.licenseType,
          supervisionStatus: form.supervisionStatus,
        });
      } else {
        const result = await createStaffUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
          licenseType: form.licenseType,
          supervisionStatus: form.supervisionStatus,
          initialPassword: form.initialPassword || undefined,
        });
        const tempPassword = result?.accountProvisioning?.temporaryPassword;
        if (tempPassword) {
          setNotice(`Temporary password for ${result.accountProvisioning.email}: ${tempPassword}`);
        }
      }
      await loadStaff();
      if (editing) setModalOpen(false);
      if (!editing) setForm(emptyForm);
    } catch (err) {
      setError(err.message || 'Unable to save user');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (staffId, actionLabel, action, payload = {}) => {
    if (!confirm(`${actionLabel} for this user?`)) return;
    setError(null);
    setNotice('');
    try {
      const result = await runStaffAccountAction(staffId, action, payload);
      await loadStaff();
      if (result?.generatedTemporaryPassword) {
        setNotice(`Generated temporary password: ${result.generatedTemporaryPassword}`);
      } else {
        setNotice(`${actionLabel} completed.`);
      }
    } catch (err) {
      setError(err.message || `${actionLabel} failed`);
    }
  };

  if (!canManageUsers) {
    return (
      <section className="panel">
        <div className="panel-head"><h2>User Maintenance</h2></div>
        <p className="um-muted">Admin access is required.</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="userMaintenanceTitle">
      <div className="panel-head">
        <h2 id="userMaintenanceTitle">User Maintenance</h2>
        <button type="button" className="action-btn primary" onClick={openCreate}>New User</button>
      </div>

      {notice ? <p className="um-notice" role="status">{notice}</p> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      {loading ? (
        <p className="um-muted">Loading users…</p>
      ) : items.length === 0 ? (
        <p className="um-muted">No users found.</p>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.firstName} {item.lastName}</td>
                  <td>{item.role}</td>
                  <td>{item.email || '—'}</td>
                  <td>{item.accountLocked ? 'Locked' : 'Active'}</td>
                  <td>{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : '—'}</td>
                  <td>
                    <div className="um-row-actions">
                      <button type="button" className="action-btn" onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" className="action-btn" onClick={() => runAction(item.id, 'Reset password', 'reset_password')}>Reset Password</button>
                      <button type="button" className="action-btn" onClick={() => runAction(item.id, 'Unlock account', 'unlock')}>Unlock</button>
                      <button type="button" className="action-btn" onClick={() => runAction(item.id, 'Deactivate account', 'deactivate')}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{editing ? 'Edit User' : 'Create User'}</h3>
            <form className="um-form" onSubmit={handleSave}>
              <label className="auth-label" htmlFor="staffFirstName">First name</label>
              <input id="staffFirstName" className="auth-input" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} required />

              <label className="auth-label" htmlFor="staffLastName">Last name</label>
              <input id="staffLastName" className="auth-input" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} required />

              <label className="auth-label" htmlFor="staffEmail">Email</label>
              <input
                id="staffEmail"
                type="email"
                className="auth-input"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required={!editing}
                disabled={Boolean(editing)}
              />

              <label className="auth-label" htmlFor="staffRole">Role</label>
              <select id="staffRole" className="auth-select" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <label className="auth-label" htmlFor="staffLicenseType">License type</label>
              <select id="staffLicenseType" className="auth-select" value={form.licenseType} onChange={(e) => setForm((prev) => ({ ...prev, licenseType: e.target.value }))}>
                {LICENSE_OPTIONS.map((license) => (
                  <option key={license} value={license}>{license}</option>
                ))}
              </select>

              <label className="auth-label" htmlFor="staffSupervision">Supervision status</label>
              <select id="staffSupervision" className="auth-select" value={form.supervisionStatus} onChange={(e) => setForm((prev) => ({ ...prev, supervisionStatus: e.target.value }))}>
                {SUPERVISION_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {!editing ? (
                <>
                  <label className="auth-label" htmlFor="staffInitialPassword">Initial password (optional)</label>
                  <input
                    id="staffInitialPassword"
                    type="password"
                    className="auth-input"
                    value={form.initialPassword}
                    onChange={(e) => setForm((prev) => ({ ...prev, initialPassword: e.target.value }))}
                    placeholder="Auto-generated if left blank"
                    minLength={14}
                  />
                </>
              ) : null}

              <div className="panel-head-actions">
                <button type="button" className="action-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="action-btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save User'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
