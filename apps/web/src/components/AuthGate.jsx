import { useState } from 'react';

const ROLES = ['Administrator', 'Clinician', 'Staff', 'Manager'];

export default function AuthGate({ onContinue }) {
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);

  return (
    <section className="auth-gate visible">
      <div className="auth-card">
        <h2>Sign in to workspace</h2>
        <p>Select a role to preview role-aware navigation and permissions.</p>
        <label className="auth-label" htmlFor="roleSelect">Role</label>
        <select
          id="roleSelect"
          className="auth-select"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          {ROLES.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <button
          type="button"
          className="action-btn primary"
          onClick={() => onContinue(selectedRole)}
        >
          Continue
        </button>
      </div>
    </section>
  );
}
