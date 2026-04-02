import { csrfHeaders } from './csrf.js';
import { frontendTelemetry } from './frontendTelemetry.js';

async function apiFetch(url, options = {}) {
  const method = options.method ?? 'GET';
  return frontendTelemetry.instrumentRequest(url, method, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch (_) {
        // ignore parse error
      }
      const error = new Error(message);
      error.status = response.status;
      error.statusClass = `${Math.floor(response.status / 100)}xx`;
      throw error;
    }
    return response.json();
  });
}

function withClientId(baseUrl, clientId) {
  if (!clientId) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}clientId=${encodeURIComponent(clientId)}`;
}

export function fetchOperationsSummary(timezone = null) {
  return fetchOperationsSummaryScoped({ timezone });
}

export function fetchOperationsSummaryScoped({ timezone = null, counselorId = null } = {}) {
  const params = new URLSearchParams();
  if (timezone) params.set('timezone', timezone);
  if (counselorId) params.set('counselorId', counselorId);
  const suffix = params.toString();
  return apiFetch(`/api/v1/operations/summary${suffix ? `?${suffix}` : ''}`);
}

export function fetchClients({ status = null, counselorId = null } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (counselorId) params.set('counselorId', counselorId);
  const query = params.toString();
  return apiFetch(`/api/v1/clients${query ? `?${query}` : ''}`);
}

// ── Portal ───────────────────────────────────────────────────────────────────

export function fetchPortalOverview(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/overview', clientId));
}

export function fetchPortalProfile(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/profile', clientId));
}

export function updatePortalProfile(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/profile', clientId), {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function createPortalAppointmentRequestRecord(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/appointment-requests', clientId), {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updatePortalAppointmentRequestRecord(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/appointment-requests', clientId), {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchPortalDocuments(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/documents', clientId));
}

export function updatePortalDocumentRecord(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/documents', clientId), {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchPortalIntakePackets(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/intake-packets', clientId));
}

export function updatePortalIntakePacket(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/intake-packets', clientId), {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchPortalUploads(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/uploads', clientId));
}

export function createPortalUploadRecord(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/uploads', clientId), {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchPortalDataRights(clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/data-rights', clientId));
}

export function createPortalDataRightsRequest(data, clientId = null) {
  return apiFetch(withClientId('/api/v1/portal/data-rights', clientId), {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function changeAuthenticatedPassword(data) {
  return apiFetch('/api/v1/auth/change-password', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function requestPortalPasswordReset(data) {
  return apiFetch('/api/v1/auth/portal-password-reset-request', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function completePortalPasswordReset(data) {
  return apiFetch('/api/v1/auth/portal-password-reset', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Client core ──────────────────────────────────────────────────────────────

export function fetchClient(clientId) {
  const expand = [
    'addresses',
    'phones',
    'contacts',
    'insurance',
    'diagnoses',
    'medications',
    'allergies',
    'clinical',
    'faith',
    'legal',
    'referring',
  ].join(',');
  return apiFetch(`/api/v1/clients/${clientId}?expand=${expand}`);
}

export function fetchClientIntakePreview(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/intake-preview`);
}

export function patchClient(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export function fetchClientAddresses(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/addresses`);
}

export function createClientAddress(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/addresses`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientAddress(clientId, addrId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/addresses/${addrId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientAddress(clientId, addrId) {
  return apiFetch(`/api/v1/clients/${clientId}/addresses/${addrId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Phones ────────────────────────────────────────────────────────────────────

export function fetchClientPhones(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/phones`);
}

export function createClientPhone(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/phones`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientPhone(clientId, phoneId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/phones/${phoneId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientPhone(clientId, phoneId) {
  return apiFetch(`/api/v1/clients/${clientId}/phones/${phoneId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export function fetchClientContacts(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/contacts`);
}

export function createClientContact(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/contacts`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientContact(clientId, contactId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/contacts/${contactId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientContact(clientId, contactId) {
  return apiFetch(`/api/v1/clients/${clientId}/contacts/${contactId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Insurance ─────────────────────────────────────────────────────────────────

export function fetchClientInsurance(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/insurance`);
}

export function createClientInsurance(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/insurance`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientInsurance(clientId, insuranceId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/insurance/${insuranceId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientInsurance(clientId, insuranceId) {
  return apiFetch(`/api/v1/clients/${clientId}/insurance/${insuranceId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Referring Providers ───────────────────────────────────────────────────────

export function fetchClientReferringProviders(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/referring-providers`);
}

export function createReferringProvider(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/referring-providers`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateReferringProvider(clientId, rpId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/referring-providers/${rpId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteReferringProvider(clientId, rpId) {
  return apiFetch(`/api/v1/clients/${clientId}/referring-providers/${rpId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Diagnoses ─────────────────────────────────────────────────────────────────

export function fetchClientDiagnoses(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/diagnoses`);
}

export function createClientDiagnosis(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/diagnoses`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientDiagnosis(clientId, dxId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/diagnoses/${dxId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientDiagnosis(clientId, dxId) {
  return apiFetch(`/api/v1/clients/${clientId}/diagnoses/${dxId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

export function fetchDsm5TrLookup(query, limit = 12) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', String(limit));
  return apiFetch(`/api/v1/reference/dsm5-tr?${params.toString()}`);
}

// ── Medications ───────────────────────────────────────────────────────────────

export function fetchClientMedications(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/medications`);
}

export function createClientMedication(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/medications`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientMedication(clientId, medId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/medications/${medId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientMedication(clientId, medId) {
  return apiFetch(`/api/v1/clients/${clientId}/medications/${medId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Allergies ─────────────────────────────────────────────────────────────────

export function fetchClientAllergies(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/allergies`);
}

export function createClientAllergy(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/allergies`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateClientAllergy(clientId, allergyId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/allergies/${allergyId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteClientAllergy(clientId, allergyId) {
  return apiFetch(`/api/v1/clients/${clientId}/allergies/${allergyId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Clinical History (singleton) ──────────────────────────────────────────────

export function fetchClinicalHistory(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/clinical-history`);
}

export function upsertClinicalHistory(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/clinical-history`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Faith Profile (singleton) ─────────────────────────────────────────────────

export function fetchFaithProfile(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/faith-profile`);
}

export function upsertFaithProfile(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/faith-profile`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Legal Record (singleton) ──────────────────────────────────────────────────

export function fetchClientLegal(clientId) {
  return apiFetch(`/api/v1/clients/${clientId}/legal`);
}

export function upsertClientLegal(clientId, data) {
  return apiFetch(`/api/v1/clients/${clientId}/legal`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Staff / User maintenance ─────────────────────────────────────────────────

export function fetchStaff() {
  return apiFetch('/api/v1/staff');
}

export function createStaffUser(data) {
  return apiFetch('/api/v1/staff', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateStaffUser(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function runStaffAccountAction(staffId, action, payload = {}) {
  return apiFetch(`/api/v1/staff/${staffId}/account-actions`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
}

// ── Counselor detail ──────────────────────────────────────────────────────────

export function fetchCounselor(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}`);
}

export function fetchStaffAvailability(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/availability`);
}

// ── Staff licenses ────────────────────────────────────────────────────────────

export function fetchStaffLicenses(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/licenses`);
}

export function createStaffLicense(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/licenses`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateStaffLicense(staffId, licenseId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/licenses/${licenseId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteStaffLicense(staffId, licenseId) {
  return apiFetch(`/api/v1/staff/${staffId}/licenses/${licenseId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Staff certifications ──────────────────────────────────────────────────────

export function fetchStaffCertifications(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/certifications`);
}

export function createStaffCertification(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/certifications`, {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateStaffCertification(staffId, certId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/certifications/${certId}`, {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteStaffCertification(staffId, certId) {
  return apiFetch(`/api/v1/staff/${staffId}/certifications/${certId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

// ── Staff specialty profile (singleton) ───────────────────────────────────────

export function fetchStaffSpecialtyProfile(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/specialty-profile`);
}

export function upsertStaffSpecialtyProfile(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/specialty-profile`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Staff employment (singleton) ──────────────────────────────────────────────

export function fetchStaffEmployment(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/employment`);
}

export function upsertStaffEmployment(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/employment`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Staff faith profile (singleton) ──────────────────────────────────────────

export function fetchStaffFaithProfile(staffId) {
  return apiFetch(`/api/v1/staff/${staffId}/faith-profile`);
}

export function upsertStaffFaithProfile(staffId, data) {
  return apiFetch(`/api/v1/staff/${staffId}/faith-profile`, {
    method: 'PUT',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

// ── Scheduling ───────────────────────────────────────────────────────────────

export function fetchWaitlist() {
  return apiFetch('/api/v1/waitlist');
}

export function patchWaitlistEntry(data) {
  return apiFetch('/api/v1/waitlist', {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchReminders({ status, appointmentId } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (appointmentId) params.set('appointmentId', appointmentId);
  const query = params.toString();
  return apiFetch(`/api/v1/reminders${query ? `?${query}` : ''}`);
}

export function createReminderRecord(data) {
  return apiFetch('/api/v1/reminders', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function patchReminderRecord(data) {
  return apiFetch('/api/v1/reminders', {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchAppointmentTypes() {
  return apiFetch('/api/v1/appointment-types');
}

export function fetchAppointments({ clientId = null, counselorId = null } = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (counselorId) params.set('counselorId', counselorId);
  const query = params.toString();
  return apiFetch(`/api/v1/appointments${query ? `?${query}` : ''}`);
}

export function fetchSchedulingCalendar({ day, timezone, counselorId, counselorName, locationName } = {}) {
  const params = new URLSearchParams();
  if (day) params.set('day', day);
  if (timezone) params.set('timezone', timezone);
  if (counselorId) params.set('counselorId', counselorId);
  if (counselorName) params.set('counselorName', counselorName);
  if (locationName) params.set('locationName', locationName);
  const query = params.toString();
  return apiFetch(`/api/v1/scheduling/calendar${query ? `?${query}` : ''}`);
}

export async function createAppointmentRecord(data) {
  return frontendTelemetry.instrumentRequest('/api/v1/appointments', 'POST', async () => {
    const response = await fetch('/api/v1/appointments', {
      method: 'POST',
      headers: csrfHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }
      const error = new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
      error.status = response.status;
      error.statusClass = `${Math.floor(response.status / 100)}xx`;
      if (payload?.conflicts) error.conflicts = payload.conflicts;
      throw error;
    }

    return response.json();
  });
}

export async function updateAppointmentRecord(appointmentId, data) {
  return frontendTelemetry.instrumentRequest(`/api/v1/appointments/${appointmentId}`, 'PATCH', async () => {
    const response = await fetch(`/api/v1/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: csrfHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }
      const error = new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
      error.status = response.status;
      error.statusClass = `${Math.floor(response.status / 100)}xx`;
      if (payload?.conflicts) error.conflicts = payload.conflicts;
      throw error;
    }

    return response.json();
  });
}

export async function deleteAppointmentRecord(appointmentId) {
  const response = await fetch(`/api/v1/appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }
    throw new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ── Phase 4 — ScheduleOps ─────────────────────────────────────────────────

export function fetchAvailabilityOverrides({ staffId, from, to } = {}) {
  const params = new URLSearchParams();
  if (staffId) params.set('staffId', staffId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/api/v1/scheduling/availability-overrides${query ? `?${query}` : ''}`);
}

export function createAvailabilityOverride(data) {
  return apiFetch('/api/v1/scheduling/availability-overrides', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateAvailabilityOverride(data) {
  return apiFetch('/api/v1/scheduling/availability-overrides', {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function deleteAvailabilityOverride(id) {
  return apiFetch(`/api/v1/scheduling/availability-overrides?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  });
}

export function fetchSeries(filters = {}) {
  const params = new URLSearchParams();
  if (filters.counselorId) params.set('counselorId', filters.counselorId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return apiFetch(`/api/v1/scheduling/series${query ? `?${query}` : ''}`);
}

export function createSeries(data) {
  return apiFetch('/api/v1/scheduling/series', {
    method: 'POST',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateSeries(data) {
  return apiFetch('/api/v1/scheduling/series', {
    method: 'PATCH',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
}

export function fetchUtilization({ from, to, counselorId } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (counselorId) params.set('counselorId', counselorId);
  const query = params.toString();
  return apiFetch(`/api/v1/scheduling/utilization${query ? `?${query}` : ''}`);
}
