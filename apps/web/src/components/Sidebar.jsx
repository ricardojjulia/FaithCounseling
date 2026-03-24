const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', active: true },
  { key: 'clients', label: 'Clients' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'clinical', label: 'Clinical Chart' },
  { key: 'documents', label: 'Documents' },
  { key: 'billing', label: 'Billing' },
  { key: 'portal', label: 'Portal' },
  { key: 'operations', label: 'Operations Studio', href: '/operations.html' },
  { key: 'faith', label: 'Faith Workflows' },
  { key: 'about', label: 'About', href: '/about.html' },
  { key: 'monitor', label: 'Monitoring', href: '/monitor.html' },
];

export default function Sidebar({ isOpen, onClose, userRole, onSignOut }) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>

        <div className="logo-row">
          <div className="logo-mark" aria-hidden="true" />
          <div>
            <p className="logo-title">Faith Counseling</p>
            <p className="logo-subtitle">Practice Workspace</p>
          </div>
        </div>

        <p className="user-badge sidebar-user-badge">
          {userRole ? `Signed in as ${userRole}` : 'Not signed in'}
        </p>

        <nav className="nav-list" aria-label="Primary">
          {NAV_ITEMS.map(item =>
            item.href ? (
              <a key={item.key} href={item.href} className="nav-item nav-link">
                {item.label}
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${item.active ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-actions">
          <button
            type="button"
            className="action-btn"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
