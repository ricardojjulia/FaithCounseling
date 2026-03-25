import { useState } from 'react';

/**
 * AuthGate — real email + password login form.
 *
 * On success the server sets an HttpOnly session cookie.
 * onContinue({ role, name, tenantId, staffId }) is called with the profile
 * returned by POST /api/v1/auth/login.
 */
export default function AuthGate({ onContinue }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLockedOut(false);
    setLoading(true);

    try {
      const resp = await fetch('/api/v1/auth/login', {
        method:      'POST',
        credentials: 'include',            // send/receive cookies
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({ email: email.trim(), password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        const isLocked = resp.status === 423;
        setLockedOut(isLocked);
        setError(
          isLocked
            ? 'Your account is locked after repeated failed sign-in attempts. Contact a practice administrator to unlock it or reset your password.'
            : (data.error || 'Invalid credentials. Please try again.'),
        );
        return;
      }

      // data.profile = { staffId, role, tenantId, name }
      onContinue(data.profile);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-gate visible">
      <div className="auth-card auth-card--workspace">
        <div className="auth-shell">
          <div className="auth-intro">
            <div className="auth-intro-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="4" width="6" height="28" rx="3" fill="#4f46e5" fillOpacity="0.82"/>
                <rect x="8" y="11" width="20" height="6" rx="3" fill="#4f46e5" fillOpacity="0.82"/>
              </svg>
            </div>
            <p className="auth-kicker">Faith Counseling</p>
            <h2>Welcome back</h2>
            <p>
              Sign in to your clinician workspace — a HIPAA-aligned environment for managing
              clients, scheduling, documentation, and practice operations.
            </p>
            <ul className="auth-points">
              <li>Sessions are server-managed; no credentials stored in the browser.</li>
              <li>Passwords require 14 characters minimum.</li>
              <li>Repeated sign-in failures trigger account lockout protection.</li>
            </ul>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="auth-label" htmlFor="loginEmail">Email</label>
            <input
              id="loginEmail"
              type="email"
              className="auth-input"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="name@practice.org"
            />

            <label className="auth-label" htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              type="password"
              className="auth-input"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter your password"
            />

            <p className="auth-helper">
              MFA is deferred for this release. Account lockout, secure cookies, and admin reset controls remain enforced.
            </p>

            {error && (
              <p className={`auth-error ${lockedOut ? 'auth-error--warning' : ''}`} role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="action-btn primary auth-submit"
              disabled={loading || !email || !password}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
