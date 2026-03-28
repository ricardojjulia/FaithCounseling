export const SURFACE_DEFINITIONS = Object.freeze([
  { id: 'auth', kind: 'view' },
  { id: 'dashboard', kind: 'view' },
  { id: 'users', kind: 'view' },
  { id: 'counselors', kind: 'view' },
  { id: 'clients', kind: 'view' },
  { id: 'scheduling', kind: 'view' },
  { id: 'workspace_studio', kind: 'view' },
  { id: 'clinical', kind: 'view' },
  { id: 'documents', kind: 'view' },
  { id: 'billing', kind: 'view' },
  { id: 'portal', kind: 'view' },
  { id: 'faith', kind: 'view' },

  { id: 'about', kind: 'page' },
  { id: 'operations', kind: 'page' },
  { id: 'monitor', kind: 'page' },

  { id: 'client.demographics', kind: 'tab' },
  { id: 'client.insurance', kind: 'tab' },
  { id: 'client.contacts', kind: 'tab' },
  { id: 'client.clinical', kind: 'tab' },
  { id: 'client.diagnoses', kind: 'tab' },
  { id: 'client.faith', kind: 'tab' },
  { id: 'client.legal', kind: 'tab' },

  { id: 'counselor.profile', kind: 'tab' },
  { id: 'counselor.licenses', kind: 'tab' },
  { id: 'counselor.specialties', kind: 'tab' },
  { id: 'counselor.faith', kind: 'tab' },
  { id: 'counselor.certifications', kind: 'tab' },
  { id: 'counselor.employment', kind: 'tab' },
  { id: 'counselor.availability', kind: 'tab' },

  { id: 'studio.practice', kind: 'tab' },
  { id: 'studio.locations', kind: 'tab' },
  { id: 'studio.staff', kind: 'tab' },
  { id: 'studio.lifecycle', kind: 'tab' },
  { id: 'studio.chart', kind: 'tab' },
  { id: 'studio.documents', kind: 'tab' },
  { id: 'studio.clients', kind: 'tab' },
  { id: 'studio.appointments', kind: 'tab' },
  { id: 'studio.billing', kind: 'tab' },
  { id: 'studio.portal', kind: 'tab' },

  { id: 'scheduling.appointments', kind: 'tab' },
  { id: 'scheduling.waitlist', kind: 'tab' },
  { id: 'scheduling.reminders', kind: 'tab' },
  { id: 'scheduling.availability', kind: 'tab' },
  { id: 'scheduling.recurring', kind: 'tab' },
  { id: 'scheduling.utilization', kind: 'tab' },
  { id: 'scheduling.general', kind: 'subview' },
  { id: 'scheduling.counselor', kind: 'subview' },
  { id: 'scheduling.practice', kind: 'subview' },

  { id: 'modal.client_picker', kind: 'modal' },
  { id: 'modal.client_editor', kind: 'modal' },
  { id: 'modal.appointment_composer', kind: 'modal' },
  { id: 'modal.user_maintenance', kind: 'modal' },
  { id: 'modal.counselor_maintenance', kind: 'modal' },
  { id: 'modal.portal_actions', kind: 'modal' },
]);

const SURFACE_MAP = new Map(SURFACE_DEFINITIONS.map((surface) => [surface.id, surface]));

export function getSurfaceDefinition(surfaceId) {
  if (typeof surfaceId !== 'string') return null;
  return SURFACE_MAP.get(surfaceId.trim()) ?? null;
}

export function isKnownSurfaceId(surfaceId) {
  return Boolean(getSurfaceDefinition(surfaceId));
}

export function getSurfaceKind(surfaceId) {
  return getSurfaceDefinition(surfaceId)?.kind ?? 'unknown';
}
