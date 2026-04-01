-- ─────────────────────────────────────────────────────────────────────────────
-- Faith Counseling — Core Schema  (Phase 1: core tables)
-- Run via:  node apps/api/src/db/migrate.js
-- ─────────────────────────────────────────────────────────────────────────────

-- Character set and collation chosen for full Unicode support.
-- All timestamps stored as UTC (pool configured with timezone: 'Z').

-- ─── Tenants ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id           VARCHAR(64)  NOT NULL,
  name         VARCHAR(255) NOT NULL,
  plan_type    VARCHAR(64)  NOT NULL DEFAULT 'standard',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Practices ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS practices (
  id            VARCHAR(64)  NOT NULL,
  tenant_id     VARCHAR(64)  NOT NULL,
  name          VARCHAR(255) NOT NULL,
  practice_type VARCHAR(64)  NOT NULL DEFAULT 'solo',
  timezone      VARCHAR(64)  NOT NULL DEFAULT 'America/New_York',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_practices_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Locations ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS locations (
  id             VARCHAR(64)   NOT NULL,
  tenant_id      VARCHAR(64)   NOT NULL,
  practice_id    VARCHAR(64),
  name           VARCHAR(255)  NOT NULL,
  address_enc    TEXT,                    -- AES-256-GCM encrypted (iv:tag:ct base64)
  capacity       INT           NOT NULL DEFAULT 1,
  remote_enabled TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_locations_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Staff members ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_members (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  role                VARCHAR(64)  NOT NULL,
  first_name_enc      TEXT         NOT NULL,   -- encrypted PHI
  last_name_enc       TEXT         NOT NULL,   -- encrypted PHI
  license_type        VARCHAR(64),
  license_number_enc  TEXT,                    -- encrypted PHI
  supervision_status  VARCHAR(64)  NOT NULL DEFAULT 'not_required',
  supervising_staff_id VARCHAR(64),
  bio_enc             TEXT,                    -- encrypted PHI
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_staff_tenant (tenant_id),
  INDEX idx_staff_role   (tenant_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Staff accounts (credentials) ────────────────────────────────────────────
-- email is encrypted at rest and looked up through a deterministic HMAC hash.

CREATE TABLE IF NOT EXISTS staff_accounts (
  id               VARCHAR(64)   NOT NULL,
  staff_member_id  VARCHAR(64)   NOT NULL,
  tenant_id        VARCHAR(64)   NOT NULL,
  email            VARCHAR(320)  NULL,        -- legacy plaintext column retained only for migration compatibility
  email_enc        TEXT          NOT NULL,    -- encrypted email address
  email_lookup_hash CHAR(64)     NOT NULL,    -- deterministic HMAC-SHA256 lookup hash
  password_hash    VARCHAR(255)  NOT NULL,    -- argon2id
  failed_attempts  INT           NOT NULL DEFAULT 0,
  locked_until     TIMESTAMP     NULL,
  last_login_at    TIMESTAMP     NULL,
  mfa_enabled      TINYINT(1)    NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_accounts_email_lookup_hash (email_lookup_hash),
  INDEX idx_staff_accounts_tenant (tenant_id),
  CONSTRAINT fk_staff_accounts_member FOREIGN KEY (staff_member_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Sessions ────────────────────────────────────────────────────────────────
-- id stores the SHA-256 hash of the raw session token (never the token itself).

CREATE TABLE IF NOT EXISTS sessions (
  id               VARCHAR(64)  NOT NULL,   -- SHA-256(token) hex
  staff_account_id VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  role             VARCHAR(64)  NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       TIMESTAMP    NOT NULL,
  revoked          TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_sessions_account  (staff_account_id),
  INDEX idx_sessions_expires  (expires_at),
  CONSTRAINT fk_sessions_account FOREIGN KEY (staff_account_id) REFERENCES staff_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Clients ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  -- Core identity (PHI encrypted)
  first_name_enc          TEXT         NOT NULL,   -- encrypted PHI
  last_name_enc           TEXT         NOT NULL,   -- encrypted PHI
  middle_name_enc         TEXT         NULL,        -- encrypted PHI
  preferred_name_enc      TEXT         NULL,        -- encrypted PHI
  -- Demographics (plaintext category labels — not unique identifiers)
  pronouns                VARCHAR(64)  NULL,
  date_of_birth_enc       TEXT         NULL,        -- encrypted PHI (ISO 8601)
  ssn_last4_enc           TEXT         NULL,        -- encrypted PHI
  gender_identity         VARCHAR(128) NULL,
  biological_sex          VARCHAR(32)  NULL,        -- male|female|intersex|unknown
  race_ethnicity          VARCHAR(128) NULL,
  marital_status          VARCHAR(64)  NULL,
  language_preference     VARCHAR(64)  NULL DEFAULT 'en',
  -- Employment (employer name is PHI)
  employment_status       VARCHAR(64)  NULL,
  employer_name_enc       TEXT         NULL,        -- encrypted PHI
  -- Contact (PHI encrypted)
  email_enc               TEXT         NULL,        -- encrypted PHI
  -- Administrative flags (non-PHI)
  status                  VARCHAR(64)  NOT NULL DEFAULT 'active',
  faith_background        VARCHAR(255) NULL,        -- non-PHI label, kept plaintext
  is_minor                TINYINT(1)   NOT NULL DEFAULT 0,
  court_ordered           TINYINT(1)   NOT NULL DEFAULT 0,
  high_touchpoint         TINYINT(1)   NOT NULL DEFAULT 0,
  referral_source_detail  VARCHAR(255) NULL,        -- non-PHI label
  primary_counselor_id    VARCHAR(64)  NULL,        -- FK to staff_members
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_clients_tenant        (tenant_id),
  INDEX idx_clients_tenant_status (tenant_id, status),
  INDEX idx_clients_counselor     (primary_counselor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client lifecycles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_lifecycles (
  id                    VARCHAR(64) NOT NULL,
  client_id             VARCHAR(64) NOT NULL,
  tenant_id             VARCHAR(64) NOT NULL,
  case_status           VARCHAR(64) NOT NULL DEFAULT 'active',
  referral_source       VARCHAR(255),
  emergency_contact_enc TEXT,               -- encrypted PHI (JSON blob)
  discharge_record      TEXT,               -- JSON blob (non-PHI metadata)
  updated_at            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lifecycle_client (client_id),
  INDEX idx_lifecycle_tenant (tenant_id),
  CONSTRAINT fk_lifecycle_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Appointments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  client_id           VARCHAR(64),
  counselor_id        VARCHAR(64),
  client_name_enc     TEXT,                  -- encrypted PHI
  counselor_name_enc  TEXT,                  -- encrypted PHI
  appointment_type    VARCHAR(64)  NOT NULL,
  status              VARCHAR(64)  NOT NULL DEFAULT 'scheduled',
  scheduled_at        TIMESTAMP    NULL,
  duration_minutes    INT          NOT NULL DEFAULT 50,
  location_id         VARCHAR(64),
  remote_session      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_appointments_tenant       (tenant_id),
  INDEX idx_appointments_client       (tenant_id, client_id),
  INDEX idx_appointments_counselor    (tenant_id, counselor_id),
  INDEX idx_appointments_scheduled_at (tenant_id, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Audit events ────────────────────────────────────────────────────────────
-- Append-only. Never UPDATE or DELETE rows in this table.
-- PHI values must NEVER appear in any column.

CREATE TABLE IF NOT EXISTS audit_events (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  actor_id         VARCHAR(255) NOT NULL,
  actor_role       VARCHAR(64)  NOT NULL,
  actor_type       VARCHAR(32)  NOT NULL,
  action           VARCHAR(128) NOT NULL,
  target_type      VARCHAR(64)  NOT NULL,
  target_id        VARCHAR(255) NOT NULL,
  result           VARCHAR(16)  NOT NULL,
  reason_code      VARCHAR(64)  NOT NULL,
  occurred_at      TIMESTAMP    NOT NULL,
  request_id       VARCHAR(128),
  source_surface   VARCHAR(128) NOT NULL,
  source_workflow  VARCHAR(128) NOT NULL,
  system_component VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_audit_tenant     (tenant_id),
  INDEX idx_audit_occurred   (tenant_id, occurred_at),
  INDEX idx_audit_actor      (tenant_id, actor_id),
  INDEX idx_audit_action     (tenant_id, action),
  INDEX idx_audit_result     (tenant_id, result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Consent records ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_records (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  consent_type    VARCHAR(64)  NOT NULL,
  signature_state VARCHAR(64)  NOT NULL DEFAULT 'pending',
  version         VARCHAR(32)  NOT NULL DEFAULT 'v1',
  effective_from  TIMESTAMP    NULL,
  effective_to    TIMESTAMP    NULL,
  signed_at       TIMESTAMP    NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_consent_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Intake packets ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intake_packets (
  id             VARCHAR(64) NOT NULL,
  tenant_id      VARCHAR(64) NOT NULL,
  client_id      VARCHAR(64) NOT NULL,
  status         VARCHAR(64) NOT NULL DEFAULT 'assigned',
  assigned_forms JSON,
  submitted_at   TIMESTAMP   NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_intake_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Treatment plans ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS treatment_plans (
  id               VARCHAR(64) NOT NULL,
  tenant_id        VARCHAR(64) NOT NULL,
  client_id        VARCHAR(64) NOT NULL,
  status           VARCHAR(64) NOT NULL DEFAULT 'draft',
  goals_enc        TEXT,                  -- encrypted PHI (JSON array)
  interventions_enc TEXT,                 -- encrypted PHI (JSON array)
  review_cadence   VARCHAR(64),
  reviewed_at      TIMESTAMP   NULL,
  created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_plan_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Progress notes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_notes (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  appointment_id   VARCHAR(64)  NULL,
  note_type        VARCHAR(64)  NOT NULL,
  summary_enc      TEXT,                  -- encrypted PHI
  interventions_enc TEXT,                 -- encrypted PHI (JSON array)
  locked           TINYINT(1)   NOT NULL DEFAULT 0,
  signed_by        VARCHAR(64),
  signed_at        TIMESTAMP    NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_note_tenant_client (tenant_id, client_id),
  INDEX idx_note_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Document templates ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_templates (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  title          VARCHAR(255) NOT NULL,
  template_type  VARCHAR(64)  NOT NULL,
  audience       VARCHAR(64)  NOT NULL,
  template_key   VARCHAR(128) NOT NULL,
  version_number INT          NOT NULL DEFAULT 1,
  content_blocks JSON,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_doc_template_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Document assignments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_assignments (
  id                 VARCHAR(64) NOT NULL,
  tenant_id          VARCHAR(64) NOT NULL,
  template_id        VARCHAR(64) NOT NULL,
  assignee_type      VARCHAR(64) NOT NULL,
  assignee_id        VARCHAR(64) NOT NULL,
  status             VARCHAR(64) NOT NULL DEFAULT 'assigned',
  requires_signature TINYINT(1)  NOT NULL DEFAULT 0,
  due_at             TIMESTAMP   NULL,
  completed_at       TIMESTAMP   NULL,
  access_history     JSON,
  created_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_doc_assign_tenant    (tenant_id),
  INDEX idx_doc_assign_assignee  (tenant_id, assignee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Inventory definitions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_definitions (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(64)  NOT NULL,
  scoring_method  VARCHAR(64)  NOT NULL DEFAULT 'sum',
  version_number  INT          NOT NULL DEFAULT 1,
  question_schema JSON,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_inv_def_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Inventory assignments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id           VARCHAR(64) NOT NULL,
  tenant_id    VARCHAR(64) NOT NULL,
  inventory_id VARCHAR(64) NOT NULL,
  client_id    VARCHAR(64) NOT NULL,
  status       VARCHAR(64) NOT NULL DEFAULT 'assigned',
  responses    JSON,
  score        DECIMAL(10,4),
  scored_at    TIMESTAMP   NULL,
  completed_at TIMESTAMP   NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_inv_assign_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Reminders ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  appointment_id   VARCHAR(64),
  client_id        VARCHAR(64),
  reminder_type    VARCHAR(64)  NOT NULL,
  delivery_channel VARCHAR(64)  NOT NULL,
  reminder_at      TIMESTAMP    NULL,
  status           VARCHAR(64)  NOT NULL DEFAULT 'pending',
  sent_at          TIMESTAMP    NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reminder_tenant      (tenant_id),
  INDEX idx_reminder_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Waitlist metadata ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waitlist_metadata (
  id                     VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  priority_rank          INT          NOT NULL DEFAULT 0,
  requested_service      VARCHAR(255),
  preferred_session_type VARCHAR(64),
  notes                  TEXT,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waitlist_client (client_id),
  INDEX idx_waitlist_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Staff availability templates ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_templates (
  id          VARCHAR(64) NOT NULL,
  staff_id    VARCHAR(64) NOT NULL,
  tenant_id   VARCHAR(64) NOT NULL,
  slots       JSON,         -- array of { day, start, end }
  updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_avail_staff (staff_id),
  INDEX idx_avail_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Appointment series ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointment_series (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  counselor_id        VARCHAR(64)  NOT NULL,
  client_id           VARCHAR(64)  NOT NULL,
  client_name_enc     VARBINARY(512),
  counselor_name_enc  VARBINARY(512),
  appointment_type    VARCHAR(128),
  recurrence_rule     VARCHAR(512) NOT NULL,         -- e.g. FREQ=WEEKLY;BYDAY=MO,WE
  start_date          DATE         NOT NULL,
  end_date            DATE,
  duration_minutes    INT          NOT NULL DEFAULT 50,
  location_id         VARCHAR(64),
  remote_session      TINYINT(1)   NOT NULL DEFAULT 0,
  status              VARCHAR(32)  NOT NULL DEFAULT 'active',
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_series_tenant     (tenant_id),
  INDEX idx_series_counselor  (tenant_id, counselor_id),
  INDEX idx_series_client     (tenant_id, client_id),
  INDEX idx_series_dates      (tenant_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Availability overrides ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_overrides (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  staff_id        VARCHAR(64)  NOT NULL,
  override_date   DATE         NOT NULL,
  override_type   VARCHAR(32)  NOT NULL DEFAULT 'block',  -- 'block' | 'custom_hours' | 'vacation'
  reason          VARCHAR(255),
  start_time      VARCHAR(8),   -- 'HH:MM' when override_type = 'custom_hours'
  end_time        VARCHAR(8),
  all_day         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_avail_override_tenant  (tenant_id),
  INDEX idx_avail_override_staff   (staff_id, override_date),
  INDEX idx_avail_override_date    (tenant_id, override_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Service codes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_codes (
  id                       VARCHAR(64)  NOT NULL,
  tenant_id                VARCHAR(64)  NOT NULL,
  code                     VARCHAR(32)  NOT NULL,
  name                     VARCHAR(255) NOT NULL,
  category                 VARCHAR(128),
  default_duration_minutes INT          NOT NULL DEFAULT 50,
  status                   VARCHAR(64)  NOT NULL DEFAULT 'active',
  created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_service_code_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Fee schedules ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_schedules (
  id         VARCHAR(64)  NOT NULL,
  tenant_id  VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(64)  NOT NULL DEFAULT 'active',
  currency   CHAR(3)      NOT NULL DEFAULT 'USD',
  schedule_lines JSON,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_fee_schedule_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Invoices ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id                VARCHAR(64)    NOT NULL,
  tenant_id         VARCHAR(64)    NOT NULL,
  client_id         VARCHAR(64),
  appointment_id    VARCHAR(64),
  issued_at         TIMESTAMP      NULL,
  due_at            TIMESTAMP      NULL,
  status            VARCHAR(64)    NOT NULL DEFAULT 'draft',
  line_items        JSON,
  insurance_enc     TEXT,                   -- encrypted PHI (JSON)
  claim_status      VARCHAR(64)    NOT NULL DEFAULT 'not_submitted',
  subtotal          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  adjustments       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  total             DECIMAL(10,2)  NOT NULL DEFAULT 0,
  amount_paid       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  balance           DECIMAL(10,2)  NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_invoice_tenant        (tenant_id),
  INDEX idx_invoice_tenant_client (tenant_id, client_id),
  INDEX idx_invoice_status        (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Payments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id          VARCHAR(64)   NOT NULL,
  tenant_id   VARCHAR(64)   NOT NULL,
  invoice_id  VARCHAR(64),
  client_id   VARCHAR(64),
  amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  method      VARCHAR(64)   NOT NULL,
  received_at TIMESTAMP     NULL,
  reference   VARCHAR(255),
  notes       TEXT,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_payment_tenant   (tenant_id),
  INDEX idx_payment_invoice  (invoice_id),
  INDEX idx_payment_client   (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Superbills ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS superbills (
  id               VARCHAR(64) NOT NULL,
  tenant_id        VARCHAR(64) NOT NULL,
  invoice_id       VARCHAR(64),
  client_id        VARCHAR(64),
  generated_at     TIMESTAMP   NULL,
  diagnosis_codes  JSON,
  service_lines    JSON,
  created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_superbill_tenant  (tenant_id),
  INDEX idx_superbill_client  (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Claims ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claims (
  id                 VARCHAR(64)  NOT NULL,
  tenant_id          VARCHAR(64)  NOT NULL,
  invoice_id         VARCHAR(64),
  status             VARCHAR(64)  NOT NULL DEFAULT 'not_submitted',
  external_reference VARCHAR(255),
  submitted_at       TIMESTAMP    NULL,
  notes              TEXT,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_claim_tenant  (tenant_id),
  INDEX idx_claim_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal accounts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_accounts (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  client_id         VARCHAR(64)  NOT NULL,
  email_enc         TEXT         NOT NULL,   -- encrypted PHI
  email_lookup_hash CHAR(64)     NULL,       -- deterministic HMAC-SHA256 lookup hash
  password_hash     VARCHAR(255) NULL,       -- argon2id, set once portal access is activated
  failed_attempts   INT          NOT NULL DEFAULT 0,
  locked_until      TIMESTAMP    NULL,
  status            VARCHAR(64)  NOT NULL DEFAULT 'active',
  mfa_enabled       TINYINT(1)   NOT NULL DEFAULT 0,
  last_login        TIMESTAMP    NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_client (client_id),
  UNIQUE KEY uq_portal_email_lookup_hash (tenant_id, email_lookup_hash),
  INDEX idx_portal_account_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_sessions (
  id                VARCHAR(64)  NOT NULL,   -- SHA-256(token) hex
  portal_account_id VARCHAR(64)  NOT NULL,
  client_id         VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  role              VARCHAR(64)  NOT NULL DEFAULT 'client',
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at        TIMESTAMP    NOT NULL,
  revoked           TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_portal_sessions_account (portal_account_id),
  INDEX idx_portal_sessions_client (client_id),
  INDEX idx_portal_sessions_expires (expires_at),
  CONSTRAINT fk_portal_sessions_account FOREIGN KEY (portal_account_id) REFERENCES portal_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_password_resets (
  id                VARCHAR(64)  NOT NULL,
  portal_account_id VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  token_hash        CHAR(64)     NOT NULL,
  requested_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at        TIMESTAMP    NOT NULL,
  used_at           TIMESTAMP    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_password_reset_token (token_hash),
  INDEX idx_portal_password_reset_account (portal_account_id),
  INDEX idx_portal_password_reset_expires (expires_at),
  CONSTRAINT fk_portal_password_reset_account FOREIGN KEY (portal_account_id) REFERENCES portal_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal client profiles ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_client_profiles (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  client_id               VARCHAR(64)  NOT NULL,
  preferred_name_enc      TEXT         NULL,      -- encrypted PII
  contact_email_enc       TEXT         NULL,      -- encrypted PII
  contact_phone_enc       TEXT         NULL,      -- encrypted PII
  contact_preferences_enc MEDIUMTEXT   NULL,      -- encrypted JSON
  profile_details_enc     MEDIUMTEXT   NULL,      -- encrypted JSON
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_profile_client (client_id),
  INDEX idx_portal_profile_tenant (tenant_id),
  CONSTRAINT fk_portal_profile_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_settings (
  id                              VARCHAR(64)  NOT NULL,
  tenant_id                       VARCHAR(64)  NOT NULL,
  practice_name                   VARCHAR(255) NOT NULL,
  logo_url                        VARCHAR(500) NULL,
  brand_color                     VARCHAR(16)  NOT NULL DEFAULT '#1f7a8c',
  accent_color                    VARCHAR(16)  NOT NULL DEFAULT '#f0f7f8',
  welcome_headline                VARCHAR(255) NOT NULL,
  welcome_message                 TEXT         NOT NULL,
  help_message                    TEXT         NULL,
  support_email_enc               TEXT         NULL, -- encrypted PII
  registration_mode               VARCHAR(64)  NOT NULL DEFAULT 'review_required',
  allow_create_account            TINYINT(1)   NOT NULL DEFAULT 1,
  allow_care_requests             TINYINT(1)   NOT NULL DEFAULT 1,
  allow_scheduling_requests       TINYINT(1)   NOT NULL DEFAULT 1,
  show_public_counselor_directory TINYINT(1)   NOT NULL DEFAULT 0,
  financial_mode                  VARCHAR(64)  NOT NULL DEFAULT 'offerings',
  suggested_offering_cents        INT          NOT NULL DEFAULT 0,
  offering_ministry_note          TEXT         NULL,
  contact_preference_options      JSON         NULL,
  default_signup_form_keys        JSON         NULL,
  created_at                      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_settings_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal resources ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_resources (
  id            VARCHAR(64)  NOT NULL,
  tenant_id     VARCHAR(64)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  content       TEXT,
  resource_type VARCHAR(64)  NOT NULL,
  audience      VARCHAR(64)  NOT NULL DEFAULT 'all',
  published_at  TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_resource_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal uploads ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_uploads (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  category         VARCHAR(64)  NOT NULL DEFAULT 'supporting_document',
  file_name_enc    TEXT         NOT NULL,   -- encrypted PII
  mime_type        VARCHAR(128) NULL,
  size_bytes       INT          NOT NULL DEFAULT 0,
  notes_enc        TEXT         NULL,       -- encrypted free text / PHI
  content_enc      MEDIUMTEXT   NOT NULL,   -- encrypted base64 payload
  uploaded_by_role VARCHAR(64)  NOT NULL DEFAULT 'client',
  status           VARCHAR(64)  NOT NULL DEFAULT 'uploaded',
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_upload_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_portal_upload_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal data-rights requests ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_data_right_requests (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  request_type    VARCHAR(64)  NOT NULL,
  status          VARCHAR(64)  NOT NULL DEFAULT 'requested',
  delivery_format VARCHAR(16)  NOT NULL DEFAULT 'json',
  reason_code     VARCHAR(64)  NOT NULL DEFAULT 'self_service_request',
  notes_enc       MEDIUMTEXT   NULL,         -- encrypted free text / PHI
  policy_snapshot JSON         NULL,
  requested_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at     TIMESTAMP    NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_data_right_tenant_client (tenant_id, client_id),
  INDEX idx_portal_data_right_status (tenant_id, status),
  CONSTRAINT fk_portal_data_right_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal message threads ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_message_threads (
  id          VARCHAR(64)  NOT NULL,
  tenant_id   VARCHAR(64)  NOT NULL,
  client_id   VARCHAR(64)  NOT NULL,
  subject     VARCHAR(255),
  status      VARCHAR(64)  NOT NULL DEFAULT 'open',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_thread_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_messages (
  id          VARCHAR(64) NOT NULL,
  tenant_id   VARCHAR(64) NOT NULL,
  thread_id   VARCHAR(64) NOT NULL,
  sender_id   VARCHAR(64) NOT NULL,
  sender_role VARCHAR(64) NOT NULL,
  content_enc TEXT,                 -- encrypted PHI
  sent_at     TIMESTAMP   NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_message_thread (thread_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client addresses ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_addresses (
  id           VARCHAR(64)  NOT NULL,
  tenant_id    VARCHAR(64)  NOT NULL,
  client_id    VARCHAR(64)  NOT NULL,
  addr_type    VARCHAR(32)  NOT NULL DEFAULT 'primary',  -- primary | mailing | other
  line1_enc    TEXT         NOT NULL,   -- encrypted PHI
  line2_enc    TEXT         NULL,       -- encrypted PHI
  city_enc     TEXT         NOT NULL,   -- encrypted PHI
  state        VARCHAR(64)  NOT NULL,   -- NOT PHI; state/province code
  postal_enc   TEXT         NOT NULL,   -- encrypted PHI
  country      VARCHAR(64)  NOT NULL DEFAULT 'US',
  is_preferred TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_caddr_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_caddr_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client phones ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_phones (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  phone_type      VARCHAR(32)  NOT NULL DEFAULT 'cell',  -- cell | home | work | fax
  number_enc      TEXT         NOT NULL,   -- encrypted PHI
  extension       VARCHAR(16)  NULL,       -- NOT PHI
  is_preferred    TINYINT(1)   NOT NULL DEFAULT 0,
  ok_to_text      TINYINT(1)   NOT NULL DEFAULT 0,
  ok_to_leave_msg TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cphone_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cphone_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client contacts (emergency / guardian) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS client_contacts (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  client_id      VARCHAR(64)  NOT NULL,
  contact_type   VARCHAR(32)  NOT NULL DEFAULT 'emergency',  -- emergency | guardian | other
  name_enc       TEXT         NOT NULL,   -- encrypted PHI
  relationship   VARCHAR(64)  NOT NULL,   -- NOT PHI enum label
  phone_enc      TEXT         NOT NULL,   -- encrypted PHI
  email_enc      TEXT         NULL,       -- encrypted PHI
  is_primary     TINYINT(1)   NOT NULL DEFAULT 0,
  has_legal_auth TINYINT(1)   NOT NULL DEFAULT 0,  -- authorized to receive PHI
  notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ccontact_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_ccontact_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client insurance ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_insurance (
  id                   VARCHAR(64)  NOT NULL,
  tenant_id            VARCHAR(64)  NOT NULL,
  client_id            VARCHAR(64)  NOT NULL,
  coverage_order       VARCHAR(16)  NOT NULL DEFAULT 'primary',  -- primary | secondary | tertiary
  carrier_name_enc     TEXT         NOT NULL,   -- encrypted PHI
  plan_name            VARCHAR(255) NULL,        -- NOT PHI
  member_id_enc        TEXT         NOT NULL,   -- encrypted PHI
  group_number_enc     TEXT         NULL,       -- encrypted PHI
  subscriber_name_enc  TEXT         NULL,       -- encrypted PHI
  subscriber_dob_enc   TEXT         NULL,       -- encrypted PHI (ISO 8601)
  subscriber_rel       VARCHAR(64)  NULL,       -- NOT PHI: self|spouse|child|other
  auth_number_enc      TEXT         NULL,       -- encrypted PHI
  auth_visits_approved INT          NULL,
  auth_expires_on      DATE         NULL,
  referral_number_enc  TEXT         NULL,       -- encrypted PHI
  copay_cents          INT          NULL,        -- NOT PHI; stored as integer cents
  effective_from       DATE         NULL,
  effective_to         DATE         NULL,
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  verified_on          DATE         NULL,
  verified_by          VARCHAR(64)  NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cins_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cins_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client referring providers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_referring_providers (
  id                 VARCHAR(64)  NOT NULL,
  tenant_id          VARCHAR(64)  NOT NULL,
  client_id          VARCHAR(64)  NOT NULL,
  provider_name_enc  TEXT         NOT NULL,   -- encrypted PHI
  practice_name      VARCHAR(255) NULL,        -- NOT PHI
  npi                VARCHAR(16)  NULL,        -- NOT PHI (public identifier)
  phone_enc          TEXT         NULL,       -- encrypted PHI
  fax_enc            TEXT         NULL,       -- encrypted PHI
  address_enc        TEXT         NULL,       -- encrypted PHI (full address JSON)
  referral_date      DATE         NULL,        -- NOT PHI
  referral_notes_enc TEXT         NULL,       -- encrypted PHI
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_crp_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_crp_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client diagnoses ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_diagnoses (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  code_system     VARCHAR(16)  NOT NULL DEFAULT 'DSM-5',  -- DSM-5 | ICD-10
  code            VARCHAR(32)  NOT NULL,
  description_enc TEXT         NOT NULL,   -- encrypted PHI
  onset_date      DATE         NULL,
  status          VARCHAR(32)  NOT NULL DEFAULT 'active',  -- active | resolved | rule-out
  is_primary      TINYINT(1)   NOT NULL DEFAULT 0,
  notes_enc       TEXT         NULL,       -- encrypted PHI
  diagnosed_by    VARCHAR(64)  NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cdiag_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cdiag_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client medications ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_medications (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  client_id      VARCHAR(64)  NOT NULL,
  med_name_enc   TEXT         NOT NULL,   -- encrypted PHI
  dose_enc       TEXT         NULL,       -- encrypted PHI
  frequency_enc  TEXT         NULL,       -- encrypted PHI
  route          VARCHAR(64)  NULL,
  prescriber_enc TEXT         NULL,       -- encrypted PHI
  start_date     DATE         NULL,
  end_date       DATE         NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  reason_enc     TEXT         NULL,       -- encrypted PHI
  notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cmed_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cmed_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client allergies ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_allergies (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  client_id      VARCHAR(64)  NOT NULL,
  substance_enc  TEXT         NOT NULL,   -- encrypted PHI
  reaction_enc   TEXT         NULL,       -- encrypted PHI
  severity       VARCHAR(32)  NOT NULL DEFAULT 'unknown',  -- mild | moderate | severe | unknown
  allergy_type   VARCHAR(32)  NOT NULL DEFAULT 'drug',     -- drug | food | environmental | other
  onset_date     DATE         NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_callergy_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_callergy_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client clinical history (singleton per client) ───────────────────────────

CREATE TABLE IF NOT EXISTS client_clinical_history (
  id                        VARCHAR(64)  NOT NULL,
  tenant_id                 VARCHAR(64)  NOT NULL,
  client_id                 VARCHAR(64)  NOT NULL,
  -- Medical history
  past_hospitalizations     TINYINT(1)   NOT NULL DEFAULT 0,
  hospitalizations_enc      TEXT         NULL,       -- encrypted PHI
  past_surgeries            TINYINT(1)   NOT NULL DEFAULT 0,
  surgeries_enc             TEXT         NULL,       -- encrypted PHI
  chronic_conditions_enc    TEXT         NULL,       -- encrypted PHI (JSON array)
  pcp_name_enc              TEXT         NULL,       -- encrypted PHI
  pcp_practice_enc          TEXT         NULL,       -- encrypted PHI
  pcp_phone_enc             TEXT         NULL,       -- encrypted PHI
  preferred_pharmacy_enc    TEXT         NULL,       -- encrypted PHI (JSON)
  substance_use_screen_enc  TEXT         NULL,       -- encrypted PHI (JSON)
  -- Mental health history
  mh_prior_treatment        TINYINT(1)   NOT NULL DEFAULT 0,
  mh_prior_treatment_enc    TEXT         NULL,       -- encrypted PHI
  mh_prior_hospitalizations TINYINT(1)   NOT NULL DEFAULT 0,
  mh_hospitalizations_enc   TEXT         NULL,       -- encrypted PHI
  mh_prior_diagnoses_enc    TEXT         NULL,       -- encrypted PHI
  -- Risk assessment
  si_current                TINYINT(1)   NOT NULL DEFAULT 0,
  si_history                TINYINT(1)   NOT NULL DEFAULT 0,
  si_plan                   TINYINT(1)   NOT NULL DEFAULT 0,
  si_means_access           TINYINT(1)   NOT NULL DEFAULT 0,
  si_intent                 TINYINT(1)   NOT NULL DEFAULT 0,
  hi_current                TINYINT(1)   NOT NULL DEFAULT 0,
  hi_history                TINYINT(1)   NOT NULL DEFAULT 0,
  self_harm_history         TINYINT(1)   NOT NULL DEFAULT 0,
  risk_notes_enc            TEXT         NULL,       -- encrypted PHI
  last_risk_assessment_at   TIMESTAMP    NULL,
  risk_assessed_by          VARCHAR(64)  NULL,
  created_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cclinical_client (client_id),
  INDEX idx_cclinical_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cclinical_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client faith profiles (singleton per client) ─────────────────────────────

CREATE TABLE IF NOT EXISTS client_faith_profiles (
  id                        VARCHAR(64)  NOT NULL,
  tenant_id                 VARCHAR(64)  NOT NULL,
  client_id                 VARCHAR(64)  NOT NULL,
  denomination              VARCHAR(128) NULL,
  church_name_enc           TEXT         NULL,       -- encrypted PHI
  pastor_name_enc           TEXT         NULL,       -- encrypted PHI
  spiritual_director_enc    TEXT         NULL,       -- encrypted PHI
  faith_integration_level   VARCHAR(32)  NOT NULL DEFAULT 'open',  -- open | some | minimal | none
  spiritual_concerns_enc    TEXT         NULL,       -- encrypted PHI
  religious_restrictions_enc TEXT        NULL,       -- encrypted PHI
  faith_strengths_enc       TEXT         NULL,       -- encrypted PHI
  created_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cfaith_client (client_id),
  INDEX idx_cfaith_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cfaith_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Client legal / guardianship (singleton per client) ───────────────────────

CREATE TABLE IF NOT EXISTS client_legal (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  guardian_name_enc      TEXT         NULL,       -- encrypted PHI
  guardian_relationship  VARCHAR(64)  NULL,
  guardian_phone_enc     TEXT         NULL,       -- encrypted PHI
  guardian_email_enc     TEXT         NULL,       -- encrypted PHI
  guardian_address_enc   TEXT         NULL,       -- encrypted PHI (JSON)
  court_ordered          TINYINT(1)   NOT NULL DEFAULT 0,
  court_case_number_enc  TEXT         NULL,       -- encrypted PHI
  court_contact_enc      TEXT         NULL,       -- encrypted PHI (JSON)
  court_order_expires    DATE         NULL,
  custody_notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clegal_client (client_id),
  INDEX idx_clegal_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_clegal_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Portal appointment requests ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_appointment_requests (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  requested_type   VARCHAR(64)  NOT NULL,
  preferred_times  JSON,
  notes            TEXT,
  status           VARCHAR(64)  NOT NULL DEFAULT 'pending',
  resolved_at      TIMESTAMP    NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_appt_req_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Workspace Studio form catalog ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS form_catalog (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  form_key               VARCHAR(128) NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  category               VARCHAR(64)  NOT NULL,
  is_standard_on_signup  TINYINT(1)   NOT NULL DEFAULT 0,
  is_active              TINYINT(1)   NOT NULL DEFAULT 1,
  version_number         INT          NOT NULL DEFAULT 1,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_form_catalog_tenant_form_key (tenant_id, form_key),
  INDEX idx_form_catalog_tenant_category (tenant_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Workspace Studio form assignments ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS form_assignments (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  form_key               VARCHAR(128) NOT NULL,
  form_title             VARCHAR(255) NOT NULL,
  assignment_type        VARCHAR(64)  NOT NULL DEFAULT 'next_session',
  scheduled_for          TIMESTAMP    NULL,
  recurrence_rule        VARCHAR(255) NULL,
  status                 VARCHAR(64)  NOT NULL DEFAULT 'assigned',
  assigned_by            VARCHAR(64)  NULL,
  notes                  VARCHAR(500) NULL,
  due_at                 TIMESTAMP    NULL,
  completed_at           TIMESTAMP    NULL,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_form_assign_tenant_client (tenant_id, client_id),
  INDEX idx_form_assign_tenant_status (tenant_id, status),
  INDEX idx_form_assign_tenant_form_key (tenant_id, form_key),
  CONSTRAINT fk_form_assign_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Workspace Studio form submissions (append-only, encrypted payload) ─────

CREATE TABLE IF NOT EXISTS form_submissions (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  assignment_id          VARCHAR(64)  NULL,
  client_id              VARCHAR(64)  NOT NULL,
  form_key               VARCHAR(128) NOT NULL,
  form_title             VARCHAR(255) NOT NULL,
  submission_version     INT          NOT NULL,
  submitted_by_type      VARCHAR(32)  NOT NULL DEFAULT 'client',
  responses_enc          MEDIUMTEXT   NOT NULL,
  score_label            VARCHAR(128) NULL,
  score_value            DECIMAL(10,2) NULL,
  interpretation_label   VARCHAR(128) NULL,
  submitted_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_form_submit_tenant_client (tenant_id, client_id),
  INDEX idx_form_submit_tenant_form_key (tenant_id, form_key),
  INDEX idx_form_submit_tenant_submitted_at (tenant_id, submitted_at),
  CONSTRAINT fk_form_submit_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_form_submit_assignment FOREIGN KEY (assignment_id) REFERENCES form_assignments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Public portal registration requests ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_registration_requests (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  request_type           VARCHAR(64)  NOT NULL DEFAULT 'care_request',
  first_name_enc         TEXT         NOT NULL,
  last_name_enc          TEXT         NOT NULL,
  email_enc              TEXT         NOT NULL,
  phone_enc              TEXT         NULL,
  preferred_contact_method VARCHAR(64) NULL,
  preferred_contact_window VARCHAR(128) NULL,
  requested_services     JSON,
  onboarding_details_enc MEDIUMTEXT   NULL,      -- encrypted JSON with onboarding intake answers / PHI
  notes_enc              TEXT         NULL,
  status                 VARCHAR(64)  NOT NULL DEFAULT 'requested',
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_portal_reg_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Offerings ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offerings (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  counselor_id    VARCHAR(64)  NULL,
  amount_cents    INT          NOT NULL DEFAULT 0,
  received_on     DATE         NOT NULL,
  note            VARCHAR(500) NULL,
  created_by      VARCHAR(64)  NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_offerings_tenant_client (tenant_id, client_id),
  INDEX idx_offerings_tenant_received (tenant_id, received_on),
  CONSTRAINT fk_offerings_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: note templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_note_templates (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  focus_area        VARCHAR(120),
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  sections          JSON,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_note_tmpl_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: treatment goal templates ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_goal_templates (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  title             VARCHAR(255) NOT NULL,
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  scriptures        JSON,
  milestones        JSON,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_goal_tmpl_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: consent language variants ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_consent_variants (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  title             VARCHAR(255) NOT NULL,
  body              TEXT,
  audience          VARCHAR(20)  NOT NULL DEFAULT 'client',
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_consent_var_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: resource library ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_resources (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  title               VARCHAR(255) NOT NULL,
  resource_type       VARCHAR(64)  NOT NULL,
  content             TEXT,
  scripture_reference VARCHAR(255),
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_resource_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: spiritual formation inventories ───────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_inventories (
  id         VARCHAR(64)  NOT NULL,
  tenant_id  VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  cadence    VARCHAR(64)  NOT NULL DEFAULT 'weekly',
  prompts    JSON,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_inv_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: church referral coordinations ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_church_referrals (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  client_id             VARCHAR(64)  NOT NULL,
  church_name           VARCHAR(255),
  contact_name          VARCHAR(160),
  contact_method        VARCHAR(200),
  status                VARCHAR(64)  NOT NULL DEFAULT 'proposed',
  consent_to_coordinate TINYINT(1)   NOT NULL DEFAULT 0,
  notes                 TEXT,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_referral_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Faith: language preferences ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_language_preferences (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  practice_id             VARCHAR(64),
  integration_level       VARCHAR(64)  NOT NULL DEFAULT 'moderate',
  explicit_faith_language TINYINT(1)   NOT NULL DEFAULT 1,
  include_prayer_language TINYINT(1)   NOT NULL DEFAULT 1,
  include_scripture_refs  TINYINT(1)   NOT NULL DEFAULT 1,
  preferred_terminology   VARCHAR(255),
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_lang_pref_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Platform: tenant provisioning ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_provisioning (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  requested_tenant_id   VARCHAR(64)  NOT NULL,
  requested_practice_name VARCHAR(255) NOT NULL,
  owner_email           VARCHAR(320) NULL,       -- legacy plaintext column retained only for migration compatibility
  owner_email_enc       TEXT         NOT NULL,
  status                VARCHAR(64)  NOT NULL DEFAULT 'queued',
  requested_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at          TIMESTAMP    NULL,
  PRIMARY KEY (id),
  INDEX idx_tenant_prov_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Platform: impersonation sessions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  target_tenant_id VARCHAR(64)  NOT NULL,
  target_role      VARCHAR(64)  NOT NULL,
  requested_by     VARCHAR(64)  NOT NULL,
  reason           TEXT,
  status           VARCHAR(64)  NOT NULL DEFAULT 'active',
  started_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at         TIMESTAMP    NULL,
  PRIMARY KEY (id),
  INDEX idx_impersonation_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Platform: data export jobs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_export_jobs (
  id                 VARCHAR(64)  NOT NULL,
  tenant_id          VARCHAR(64)  NOT NULL,
  export_type        VARCHAR(64)  NOT NULL,
  status             VARCHAR(64)  NOT NULL DEFAULT 'queued',
  requested_by_role  VARCHAR(64)  NOT NULL,
  requested_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at       TIMESTAMP    NULL,
  format             VARCHAR(16)  NOT NULL DEFAULT 'json',
  PRIMARY KEY (id),
  INDEX idx_export_job_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Platform: retention policies ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_policies (
  id                       VARCHAR(64)  NOT NULL,
  tenant_id                VARCHAR(64)  NOT NULL,
  clinical_records_schedule VARCHAR(64) NOT NULL DEFAULT '10_years',
  billing_schedule          VARCHAR(64) NOT NULL DEFAULT '7_years',
  audit_log_schedule        VARCHAR(64) NOT NULL DEFAULT 'indefinite',
  include_document_versions TINYINT(1)  NOT NULL DEFAULT 1,
  legal_hold_enabled        TINYINT(1)  NOT NULL DEFAULT 0,
  updated_at                TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_retention_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Counselor profiling tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_licenses (
  id                VARCHAR(64)  NOT NULL,
  staff_id          VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  license_type      VARCHAR(64)  NOT NULL,
  license_number_enc TEXT,
  issuing_state     VARCHAR(64),
  issuing_body      VARCHAR(255),
  issue_date        DATE         NULL,
  expiry_date       DATE         NULL,
  status            VARCHAR(32)  NOT NULL DEFAULT 'active',
  is_primary        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_staff_licenses_staff  (staff_id, tenant_id),
  INDEX idx_staff_licenses_tenant (tenant_id),
  CONSTRAINT fk_staff_licenses_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_certifications (
  id              VARCHAR(64)  NOT NULL,
  staff_id        VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  cert_name       VARCHAR(255) NOT NULL,
  issuing_body    VARCHAR(255),
  issue_date      DATE         NULL,
  expiry_date     DATE         NULL,
  cert_number_enc TEXT         NULL,
  ceu_hours       DECIMAL(5,1) NULL,
  is_ceu          TINYINT(1)   NOT NULL DEFAULT 0,
  notes_enc       TEXT         NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_staff_certs_staff  (staff_id, tenant_id),
  INDEX idx_staff_certs_tenant (tenant_id),
  CONSTRAINT fk_staff_certs_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_specialty_profiles (
  id                VARCHAR(64) NOT NULL,
  staff_id          VARCHAR(64) NOT NULL,
  tenant_id         VARCHAR(64) NOT NULL,
  specialties       JSON,
  modalities        JSON,
  age_groups_served JSON,
  languages         JSON,
  max_caseload      INT         NULL,
  notes_enc         TEXT        NULL,
  updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_specialty_staff (staff_id),
  INDEX idx_specialty_tenant (tenant_id),
  CONSTRAINT fk_specialty_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_employment (
  id                     VARCHAR(64)  NOT NULL,
  staff_id               VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  employment_type        VARCHAR(32)  NOT NULL DEFAULT 'full_time',
  employment_status      VARCHAR(32)  NOT NULL DEFAULT 'active',
  hire_date              DATE         NULL,
  termination_date       DATE         NULL,
  npi_number_enc         TEXT         NULL,
  malpractice_insurer    VARCHAR(255) NULL,
  malpractice_policy_enc TEXT         NULL,
  malpractice_expiry     DATE         NULL,
  direct_phone_enc       TEXT         NULL,
  location_ids           JSON         NULL,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employment_staff (staff_id),
  INDEX idx_employment_tenant (tenant_id),
  CONSTRAINT fk_employment_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_faith_profiles (
  id                          VARCHAR(64)  NOT NULL,
  staff_id                    VARCHAR(64)  NOT NULL,
  tenant_id                   VARCHAR(64)  NOT NULL,
  faith_tradition             VARCHAR(128) NULL,
  theological_approach_enc    TEXT         NULL,
  ordained                    TINYINT(1)   NOT NULL DEFAULT 0,
  ordaining_body              VARCHAR(255) NULL,
  aacc_member                 TINYINT(1)   NOT NULL DEFAULT 0,
  acbc_certified              TINYINT(1)   NOT NULL DEFAULT 0,
  ccca_member                 TINYINT(1)   NOT NULL DEFAULT 0,
  other_faith_credentials_enc TEXT         NULL,
  prayer_integration          VARCHAR(32)  NULL,
  scripture_integration       VARCHAR(32)  NULL,
  spiritual_gifts_enc         TEXT         NULL,
  updated_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_faith (staff_id),
  INDEX idx_staff_faith_tenant (tenant_id),
  CONSTRAINT fk_staff_faith_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_recommendation_states (
  id               VARCHAR(64)   NOT NULL,
  tenant_id        VARCHAR(64)   NOT NULL,
  practice_id      VARCHAR(64)   NOT NULL,
  client_id        VARCHAR(64)   NOT NULL,
  counselor_id     VARCHAR(64)   NOT NULL,
  rule_id          VARCHAR(128)  NOT NULL,
  status           VARCHAR(16)   NOT NULL,
  deferred_until   DATE          NULL,
  notes_enc        TEXT          NULL,
  actioned_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at       TIMESTAMP     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_state (tenant_id, client_id, rule_id),
  INDEX idx_wf_states_client   (tenant_id, client_id),
  INDEX idx_wf_states_counselor (counselor_id, actioned_at),
  CONSTRAINT fk_wf_state_client   FOREIGN KEY (client_id)   REFERENCES clients(id)       ON DELETE CASCADE,
  CONSTRAINT fk_wf_state_counselor FOREIGN KEY (counselor_id) REFERENCES staff_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Practices (extended) — add columns missing from initial definition ────────
-- practices table was created earlier; these ALTER statements are idempotent-safe
-- via the IF NOT EXISTS DDL for tables above. When running on a fresh DB the
-- full CREATE TABLE below is used.  If upgrading an existing install, run:
--   ALTER TABLE practices ADD COLUMN IF NOT EXISTS faith_tradition VARCHAR(128);
--   ALTER TABLE practices ADD COLUMN IF NOT EXISTS contact_email VARCHAR(320);
--   ALTER TABLE practices ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64);

-- ─── Clients (extended) ───────────────────────────────────────────────────────
-- primary_counselor_id is included in the CREATE TABLE above for fresh installs.
-- Existing installs: migrate.js handles the ALTER TABLE via INFORMATION_SCHEMA check.
