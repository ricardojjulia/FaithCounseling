export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3101';

export const CREDENTIALS = {
  admin: {
    email: __ENV.ADMIN_EMAIL || 'admin@churchcorecare.local',
    password: __ENV.ADMIN_PASSWORD || 'ChangeMe!Dev2024#',
  },
  client: {
    email: __ENV.CLIENT_EMAIL || 'sarah.kim@example.test',
    password: __ENV.CLIENT_PASSWORD || 'ChangeMe!Client2026#',
  },
};

// Default thresholds applied to every scenario unless overridden
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<4000'],
  http_req_failed:   ['rate<0.02'],
};

// Shared request params — JSON content type
export const JSON_PARAMS = {
  headers: { 'Content-Type': 'application/json' },
};
