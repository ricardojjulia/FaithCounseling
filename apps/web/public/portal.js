const REQUEST_INTENTS = {
  care_request: {
    heading: 'I am looking for care',
    intro: 'Share your needs and the practice will guide intake, fit, and next steps.',
  },
  scheduling_request: {
    heading: 'I want help getting scheduled',
    intro: 'Share your availability and preferences so the practice can follow up with scheduling options.',
  },
  account_signup: {
    heading: 'I want to create a portal account',
    intro: 'Start an account request so the practice can review access and assign onboarding materials.',
  },
};
const DEFAULT_CONFIG = {
  practiceName: 'ChurchCore Care',
  logoUrl: '',
  brandColor: '#1f7a8c',
  accentColor: '#f0f7f8',
  welcomeHeadline: 'ChurchCore Care Client Portal',
  welcomeMessage: 'Current clients can sign in to their account. New or possible clients can request care, request scheduling, or start an account request for intake onboarding.',
  helpMessage: 'If your account is locked or not yet invited, contact your counselor.',
  supportEmail: '',
  registrationMode: 'review_required',
  allowCreateAccount: true,
  allowCareRequests: true,
  allowSchedulingRequests: true,
  registrationSummary: 'Create-account requests are reviewed by the practice before portal access is activated.',
  defaultSignupForms: [],
  directoryPreview: [],
};

let portalConfig = { ...DEFAULT_CONFIG };
let currentIntent = 'care_request';
const loadStartedAt = performance.now();
const requestedIntentFromQuery = (() => {
  try {
    const raw = new URLSearchParams(window.location.search).get('intent') || '';
    const normalized = raw.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(REQUEST_INTENTS, normalized)) {
      return normalized;
    }
  } catch {
    return '';
  }
  return '';
})();

function getCookie(name) {
  const pairs = document.cookie.split(';').map((part) => part.trim());
  for (const pair of pairs) {
    if (!pair.startsWith(`${name}=`)) continue;
    return decodeURIComponent(pair.slice(name.length + 1));
  }
  return '';
}

function setStatus(message, type = '') {
  const el = document.getElementById('portalRequestStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `portal-status ${type}`.trim();
}

async function postJson(path, body, { includeCsrf = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeCsrf) {
    headers['x-csrf-token'] = getCookie('csrf_token');
  }
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function collectServices(formEl) {
  return [...formEl.querySelectorAll('.portal-services input[type="checkbox"]')]
    .filter((el) => el.checked)
    .map((el) => el.value);
}

function updateContactPreferenceOptions(options = []) {
  const select = document.getElementById('preferredContactMethod');
  if (!select) return;
  const allowed = new Set(options);
  [...select.options].forEach((option) => {
    if (!option.value) return;
    option.hidden = !allowed.has(option.value);
  });
  if (select.value && !allowed.has(select.value)) {
    select.value = '';
  }
}

function renderDefaultSignupForms(forms = []) {
  const list = document.getElementById('portalDefaultForms');
  if (!list) return;
  const items = Array.isArray(forms) ? forms : [];
  if (!items.length) {
    list.innerHTML = '<li>No default forms configured yet.</li>';
    return;
  }
  list.innerHTML = items
    .map((item) => `<li>${escapeHtml(item.title || item.formKey || 'Onboarding form')}</li>`)
    .join('');
}

function renderCounselorDirectoryPreview(items = []) {
  const container = document.getElementById('portalDirectoryPreview');
  const intro = document.getElementById('portalDirectoryIntro');
  if (!container) return;
  const counselors = Array.isArray(items) ? items : [];
  if (!counselors.length) {
    if (intro) intro.textContent = 'This practice has not published counselor directory details on the public portal.';
    container.innerHTML = `
      <div class="portal-directory-item">
        <strong>Directory preview unavailable</strong>
        <span>The practice has not published counselor directory details on the public portal.</span>
      </div>
    `;
    return;
  }

  if (intro) intro.textContent = 'Published counselor highlights available to prospective and active clients.';
  container.innerHTML = counselors.map((item) => `
    <div class="portal-directory-item">
      <strong>${escapeHtml(`${item.firstName || ''} ${item.lastName || ''}`.trim())}</strong>
      <span>${escapeHtml(String(item.role || 'counselor').replaceAll('_', ' '))}${item.licenseType ? ` • ${escapeHtml(String(item.licenseType).toUpperCase())}` : ''}</span>
      ${item.bio ? `<p style="margin:6px 0 0;color:#52606d;font-size:0.85rem;">${escapeHtml(item.bio)}</p>` : ''}
    </div>
  `).join('');
}

function selectIntent(intent) {
  if (!REQUEST_INTENTS[intent]) return;
  currentIntent = intent;
  const input = document.getElementById('requestIntent');
  if (input) input.value = intent;
  const meta = REQUEST_INTENTS[intent];
  const heading = document.getElementById('portalRequestHeading');
  const intro = document.getElementById('portalRequestIntro');
  if (heading) heading.textContent = meta.heading;
  if (intro) intro.textContent = meta.intro;
  document.querySelectorAll('.portal-intent-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.intent === intent);
  });
}

function getAllowedIntents(config) {
  const intents = [];
  if (config.allowCareRequests !== false) intents.push('care_request');
  if (config.allowSchedulingRequests !== false) intents.push('scheduling_request');
  if (config.allowCreateAccount !== false) intents.push('account_signup');
  return intents;
}

function applyTheme(config) {
  document.documentElement.style.setProperty('--portal-brand', config.brandColor || DEFAULT_CONFIG.brandColor);
  document.documentElement.style.setProperty('--portal-accent', config.accentColor || DEFAULT_CONFIG.accentColor);
}

function applyPortalConfig(config) {
  portalConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
  applyTheme(portalConfig);

  const logo = document.getElementById('portalLogo');
  const headline = document.getElementById('portalHeadline');
  const welcome = document.getElementById('portalWelcome');
  const help = document.getElementById('portalHelpMessage');
  const existingCopy = document.getElementById('portalExistingCopy');

  if (logo) {
    if (portalConfig.logoUrl) {
      logo.src = portalConfig.logoUrl;
      logo.style.display = 'block';
    } else {
      logo.removeAttribute('src');
      logo.style.display = 'none';
    }
  }
  if (headline) headline.textContent = portalConfig.welcomeHeadline || DEFAULT_CONFIG.welcomeHeadline;
  if (welcome) welcome.textContent = portalConfig.welcomeMessage || DEFAULT_CONFIG.welcomeMessage;
  if (help) {
    const support = portalConfig.supportEmail ? ` Contact: ${portalConfig.supportEmail}.` : '';
    help.textContent = `${portalConfig.helpMessage || DEFAULT_CONFIG.helpMessage}${support}`;
  }
  if (existingCopy) {
    existingCopy.textContent = `Use your ${portalConfig.practiceName || DEFAULT_CONFIG.practiceName} portal credentials to access appointments, forms, and secure messages.`;
  }
  const registrationSummary = document.getElementById('portalRegistrationSummary');
  if (registrationSummary) {
    registrationSummary.textContent = portalConfig.registrationSummary || DEFAULT_CONFIG.registrationSummary;
  }
  renderDefaultSignupForms(portalConfig.defaultSignupForms || []);
  renderCounselorDirectoryPreview(portalConfig.directoryPreview || []);

  const allowedIntents = getAllowedIntents(portalConfig);
  document.querySelectorAll('.portal-intent-btn').forEach((button) => {
    const visible = allowedIntents.includes(button.dataset.intent);
    button.hidden = !visible;
  });
  updateContactPreferenceOptions(portalConfig.contactPreferenceOptions || []);

  const nextIntent = allowedIntents.includes(requestedIntentFromQuery)
    ? requestedIntentFromQuery
    : allowedIntents.includes(currentIntent)
      ? currentIntent
      : (allowedIntents[0] || 'care_request');
  selectIntent(nextIntent);
}

async function loadPortalConfig() {
  try {
    const response = await fetch('/api/v1/portal/public-config', {
      method: 'GET',
      credentials: 'include',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error || 'Unable to load portal settings');
    }
    applyPortalConfig(body?.item || DEFAULT_CONFIG);
  } catch {
    applyPortalConfig(DEFAULT_CONFIG);
  }
}

function installIntentHandlers() {
  document.querySelectorAll('.portal-intent-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectIntent(button.dataset.intent);
    });
  });
}

async function submitRequest(payload) {
  return postJson('/api/v1/portal/public-requests', payload, { includeCsrf: true });
}

function installFormHandler() {
  const form = document.getElementById('portalRequestForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startedAt = performance.now();
    const firstName = String(document.getElementById('firstName')?.value || '').trim();
    const lastName = String(document.getElementById('lastName')?.value || '').trim();
    const email = String(document.getElementById('email')?.value || '').trim();
    const phone = String(document.getElementById('phone')?.value || '').trim();
    const preferredName = String(document.getElementById('preferredName')?.value || '').trim();
    const preferredContactMethod = String(document.getElementById('preferredContactMethod')?.value || '').trim();
    const preferredContactWindow = String(document.getElementById('preferredContactWindow')?.value || '').trim();
    const pronouns = String(document.getElementById('pronouns')?.value || '').trim();
    const educationLevel = String(document.getElementById('educationLevel')?.value || '').trim();
    const affiliations = String(document.getElementById('affiliations')?.value || '').trim();
    const referralSource = String(document.getElementById('referralSource')?.value || '').trim();
    const faithPreference = String(document.getElementById('faithPreference')?.value || '').trim();
    const schedulingFocus = String(document.getElementById('schedulingFocus')?.value || '').trim();
    const notes = String(document.getElementById('notes')?.value || '').trim();
    const consentToContact = Boolean(document.getElementById('consentToContact')?.checked);
    const requestIntent = String(document.getElementById('requestIntent')?.value || currentIntent).trim() || currentIntent;
    const requestedServices = [...new Set([requestIntent, ...collectServices(form)])];

    if (!firstName || !lastName || !email) {
      setStatus('First name, last name, and email are required.', 'error');
      return;
    }
    if (!consentToContact) {
      setStatus('Please confirm that the practice may contact you about this request.', 'error');
      return;
    }

    setStatus('Submitting request...');

    try {
      const response = await submitRequest({
        firstName,
        lastName,
        email,
        phone,
        requestType: requestIntent,
        preferredContactMethod,
        preferredContactWindow,
        requestedServices,
        onboardingDetails: {
          preferredName,
          pronouns,
          educationLevel,
          affiliations: affiliations
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          referralSource,
          faithPreference,
          schedulingFocus,
          consentToContact,
        },
        notes,
      });
      form.reset();
      selectIntent(requestIntent);
      const activation = response?.activation ?? null;
      if (activation?.status === 'activated') {
        const assignedForms = Array.isArray(activation.assignedForms) && activation.assignedForms.length
          ? ` Assigned forms: ${activation.assignedForms.join(', ')}.`
          : '';
        setStatus(`Account request approved immediately. Sign in with ${activation.email} and temporary password ${activation.temporaryPassword}.${assignedForms}`, 'success');
      } else if (activation?.status === 'existing_account') {
        setStatus(`A portal account already exists for ${activation.email}. Use the sign-in link or reset your portal password.`, 'success');
      } else {
        setStatus('Request submitted successfully. Our team will contact you soon.', 'success');
      }
    } catch (error) {
      setStatus(error?.message || 'Unable to submit request at this time.', 'error');
    }
  });
}

installIntentHandlers();
installFormHandler();
loadPortalConfig();
