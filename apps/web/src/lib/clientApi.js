import { csrfHeaders } from './csrf.js';

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch (_) {
      // ignore parse error
    }
    throw new Error(message);
  }
  return response.json();
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
