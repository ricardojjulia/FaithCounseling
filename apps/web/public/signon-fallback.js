(function attachSignonFallback() {
  const DEFAULT_ROLES = [
    'platform_admin',
    'practice_owner',
    'practice_admin',
    'counselor',
    'intern',
    'scheduler_biller',
    'client',
  ];

  function formatRoleLabel(role) {
    return role
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  function ensureRoleOptions() {
    const roleSelect = document.getElementById('roleSelect');
    if (!roleSelect) return;
    if (roleSelect.options.length > 0) return;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select role';
    roleSelect.appendChild(placeholder);

    DEFAULT_ROLES.forEach((role) => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = formatRoleLabel(role);
      roleSelect.appendChild(option);
    });
  }

  function openSignonDialog() {
    const authGate = document.getElementById('authGate');
    if (!authGate) return;

    authGate.classList.add('visible');
    authGate.removeAttribute('hidden');
    authGate.style.display = 'flex';

    ensureRoleOptions();
    document.getElementById('roleSelect')?.focus();
  }

  window.showSignOnDialog = openSignonDialog;

  function bindSignonButton() {
    const button = document.getElementById('launchSignInButton');
    if (!button) return;
    button.addEventListener('click', openSignonDialog);
  }

  document.addEventListener('click', (event) => {
    const launcher = event.target?.closest?.('#launchSignInButton');
    if (!launcher) return;
    event.preventDefault();
    openSignonDialog();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSignonButton, { once: true });
  } else {
    bindSignonButton();
  }
})();
