import { useState } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
];

export default function TopBar({ onMenuToggle, connectionStatus, currentUser }) {
  const [language, setLanguage] = useState('en');

  const statusConfig = {
    loading: { color: '#62708b', text: 'Connecting...' },
    connected: { color: '#08926a', text: 'API Connected' },
    error: { color: '#b42318', text: 'Connection Error' },
  };

  const status = statusConfig[connectionStatus] || statusConfig.loading;

  return (
    <header className="topbar">
      <button
        type="button"
        className="hamburger-menu"
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div>
        <h1>Practice HUB</h1>
        <p style={{ color: status.color, fontSize: '0.85rem', margin: '4px 0 0' }}>
          {status.text}
        </p>
      </div>

      <div className="topbar-actions">
        <label className="language-switcher">
          <span>Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </label>

        <div className="topbar-session">
          <span className="user-badge">
            {typeof currentUser?.name === 'string' && currentUser.name.trim()
              ? currentUser.name.trim()
              : typeof currentUser?.email === 'string' && currentUser.email.trim()
                ? currentUser.email.trim()
                : 'Secure session'}
          </span>
          <span className="topbar-session-note">Server-managed session</span>
        </div>
      </div>
    </header>
  );
}
