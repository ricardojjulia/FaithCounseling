const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'User Maintenance' },
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

function canViewNavItem(item, role) {
  if (item.key === 'users') {
    return ['platform_admin', 'practice_owner', 'practice_admin'].includes(role || '');
  }
  return true;
}

function resolveUserLabel(user, role) {
  if (typeof user?.name === 'string' && user.name.trim()) {
    return role ? `${user.name.trim()} \u2022 ${role}` : user.name.trim();
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return role ? `${user.email.trim()} \u2022 ${role}` : user.email.trim();
  }
  return role ? `Signed in as ${role}` : 'Not signed in';
}

export default function Sidebar({ isOpen, onClose, currentUser, currentView, onNavigate, onSignOut }) {
  const userRole = currentUser?.role ?? null;
  const visibleNavItems = NAV_ITEMS.filter((item) => canViewNavItem(item, userRole));

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
          {resolveUserLabel(currentUser, userRole)}
        </p>

        <nav className="nav-list" aria-label="Primary">
          {visibleNavItems.map(item =>
            item.href ? (
              <a key={item.key} href={item.href} className="nav-item nav-link">
                {item.label}
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${currentView === item.key ? 'active' : ''}`}
                onClick={() => {
                  onNavigate?.(item.key);
                  onClose();
                }}
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
