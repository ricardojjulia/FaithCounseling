-- ─────────────────────────────────────────────────────────────────────────────
-- ChurchCore Care — Core Schema (PostgreSQL/Supabase)
-- Run via:  psql -f supabase/migrations/20260425000000_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Character set: PostgreSQL uses UTF-8 by default (full Unicode support).
-- All timestamps stored as UTC (TIMESTAMPTZ with timezone-aware clients).

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Schema migration tracking ───────────────────────────────────────────────
-- Note: Supabase tracks its own migrations in the supabase_migrations schema.
-- This table is retained for app-level migration tracking.

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (name)
);

-- ─── Tenants ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id           VARCHAR(64)  NOT NULL,
  name         VARCHAR(255) NOT NULL,
  plan_type    VARCHAR(64)  NOT NULL DEFAULT 'standard',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE OR REPLACE TRIGGER trg_set_updated_at_tenants
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Practices ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS practices (
  id            VARCHAR(64)  NOT NULL,
  tenant_id     VARCHAR(64)  NOT NULL,
  name          VARCHAR(255) NOT NULL,
  practice_type VARCHAR(64)  NOT NULL DEFAULT 'solo',
  timezone      VARCHAR(64)  NOT NULL DEFAULT 'America/New_York',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_practices_tenant ON practices (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_practices
  BEFORE UPDATE ON practices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Locations ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS locations (
  id             VARCHAR(64)   NOT NULL,
  tenant_id      VARCHAR(64)   NOT NULL,
  practice_id    VARCHAR(64),
  name           VARCHAR(255)  NOT NULL,
  address_enc    TEXT,                    -- AES-256-GCM encrypted (iv:tag:ct base64)
  capacity       INT           NOT NULL DEFAULT 1,
  remote_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_locations
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_role   ON staff_members (tenant_id, role);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_members
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  locked_until     TIMESTAMPTZ   NULL,
  last_login_at    TIMESTAMPTZ   NULL,
  mfa_enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_staff_accounts_email_lookup_hash UNIQUE (email_lookup_hash),
  CONSTRAINT fk_staff_accounts_member FOREIGN KEY (staff_member_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_accounts_tenant ON staff_accounts (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_accounts
  BEFORE UPDATE ON staff_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Sessions ────────────────────────────────────────────────────────────────
-- id stores the SHA-256 hash of the raw session token (never the token itself).

CREATE TABLE IF NOT EXISTS sessions (
  id               VARCHAR(64)  NOT NULL,   -- SHA-256(token) hex
  staff_account_id VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  role             VARCHAR(64)  NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ  NOT NULL,
  revoked          BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  CONSTRAINT fk_sessions_account FOREIGN KEY (staff_account_id) REFERENCES staff_accounts (id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (staff_account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions (expires_at);

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
  is_minor                BOOLEAN      NOT NULL DEFAULT FALSE,
  court_ordered           BOOLEAN      NOT NULL DEFAULT FALSE,
  high_touchpoint         BOOLEAN      NOT NULL DEFAULT FALSE,
  referral_source_detail  VARCHAR(255) NULL,        -- non-PHI label
  primary_counselor_id    VARCHAR(64)  NULL,        -- FK to staff_members
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant        ON clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_counselor     ON clients (primary_counselor_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_clients
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Client lifecycles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_lifecycles (
  id                    VARCHAR(64) NOT NULL,
  client_id             VARCHAR(64) NOT NULL,
  tenant_id             VARCHAR(64) NOT NULL,
  case_status           VARCHAR(64) NOT NULL DEFAULT 'active',
  referral_source       VARCHAR(255),
  emergency_contact_enc TEXT,               -- encrypted PHI (JSON blob)
  discharge_record      TEXT,               -- JSON blob (non-PHI metadata)
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_lifecycle_client UNIQUE (client_id),
  CONSTRAINT fk_lifecycle_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_tenant ON client_lifecycles (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_lifecycles
  BEFORE UPDATE ON client_lifecycles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  scheduled_at        TIMESTAMPTZ  NULL,
  duration_minutes    INT          NOT NULL DEFAULT 50,
  location_id         VARCHAR(64),
  series_id           VARCHAR(64)  NULL,
  remote_session      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant       ON appointments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_series       ON appointments (tenant_id, series_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client       ON appointments (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_counselor    ON appointments (tenant_id, counselor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments (tenant_id, scheduled_at);

CREATE OR REPLACE TRIGGER trg_set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  occurred_at      TIMESTAMPTZ  NOT NULL,
  request_id       VARCHAR(128),
  source_surface   VARCHAR(128) NOT NULL,
  source_workflow  VARCHAR(128) NOT NULL,
  system_component VARCHAR(128) NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant   ON audit_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_events (tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_events (tenant_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_events (tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_result   ON audit_events (tenant_id, result);

-- ─── Consent records ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_records (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  consent_type    VARCHAR(64)  NOT NULL,
  signature_state VARCHAR(64)  NOT NULL DEFAULT 'pending',
  version         VARCHAR(32)  NOT NULL DEFAULT 'v1',
  effective_from  TIMESTAMPTZ  NULL,
  effective_to    TIMESTAMPTZ  NULL,
  signed_at       TIMESTAMPTZ  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_consent_tenant_client ON consent_records (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_consent_records
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Intake packets ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intake_packets (
  id             VARCHAR(64) NOT NULL,
  tenant_id      VARCHAR(64) NOT NULL,
  client_id      VARCHAR(64) NOT NULL,
  status         VARCHAR(64) NOT NULL DEFAULT 'assigned',
  assigned_forms JSON,
  submitted_at   TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_intake_tenant_client ON intake_packets (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_intake_packets
  BEFORE UPDATE ON intake_packets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Treatment plans ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS treatment_plans (
  id               VARCHAR(64) NOT NULL,
  tenant_id        VARCHAR(64) NOT NULL,
  client_id        VARCHAR(64) NOT NULL,
  status           VARCHAR(64) NOT NULL DEFAULT 'draft',
  goals_enc        TEXT,                  -- encrypted PHI (JSON array)
  interventions_enc TEXT,                 -- encrypted PHI (JSON array)
  review_cadence   VARCHAR(64),
  reviewed_at      TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_plan_tenant_client ON treatment_plans (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_treatment_plans
  BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Progress notes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_notes (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  appointment_id   VARCHAR(64)  NULL,
  note_type        VARCHAR(64)  NOT NULL,
  summary_enc      TEXT,                  -- encrypted PHI
  interventions_enc TEXT,                 -- encrypted PHI (JSON array)
  locked           BOOLEAN      NOT NULL DEFAULT FALSE,
  signed_by        VARCHAR(64),
  signed_at        TIMESTAMPTZ  NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_note_tenant_client ON progress_notes (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_note_appointment   ON progress_notes (appointment_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_progress_notes
  BEFORE UPDATE ON progress_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_doc_template_tenant ON document_templates (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_document_templates
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Document assignments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_assignments (
  id                 VARCHAR(64) NOT NULL,
  tenant_id          VARCHAR(64) NOT NULL,
  template_id        VARCHAR(64) NOT NULL,
  assignee_type      VARCHAR(64) NOT NULL,
  assignee_id        VARCHAR(64) NOT NULL,
  status             VARCHAR(64) NOT NULL DEFAULT 'assigned',
  requires_signature BOOLEAN     NOT NULL DEFAULT FALSE,
  due_at             TIMESTAMPTZ NULL,
  completed_at       TIMESTAMPTZ NULL,
  access_history     JSON,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_doc_assign_tenant   ON document_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_assign_assignee ON document_assignments (tenant_id, assignee_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_document_assignments
  BEFORE UPDATE ON document_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Inventory definitions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_definitions (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(64)  NOT NULL,
  scoring_method  VARCHAR(64)  NOT NULL DEFAULT 'sum',
  version_number  INT          NOT NULL DEFAULT 1,
  question_schema JSON,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_inv_def_tenant ON inventory_definitions (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_inventory_definitions
  BEFORE UPDATE ON inventory_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Inventory assignments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id           VARCHAR(64) NOT NULL,
  tenant_id    VARCHAR(64) NOT NULL,
  inventory_id VARCHAR(64) NOT NULL,
  client_id    VARCHAR(64) NOT NULL,
  status       VARCHAR(64) NOT NULL DEFAULT 'assigned',
  responses    JSON,
  score        DECIMAL(10,4),
  scored_at    TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_inv_assign_tenant_client ON inventory_assignments (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_inventory_assignments
  BEFORE UPDATE ON inventory_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Reminders ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  appointment_id   VARCHAR(64),
  client_id        VARCHAR(64),
  reminder_type    VARCHAR(64)  NOT NULL,
  delivery_channel VARCHAR(64)  NOT NULL,
  reminder_at      TIMESTAMPTZ  NULL,
  status           VARCHAR(64)  NOT NULL DEFAULT 'pending',
  sent_at          TIMESTAMPTZ  NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_tenant      ON reminders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_appointment ON reminders (appointment_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_reminders
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Waitlist metadata ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waitlist_metadata (
  id                     VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  priority_rank          INT          NOT NULL DEFAULT 0,
  requested_service      VARCHAR(255),
  preferred_session_type VARCHAR(64),
  notes                  TEXT,
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_waitlist_client UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON waitlist_metadata (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_waitlist_metadata
  BEFORE UPDATE ON waitlist_metadata
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Staff availability templates ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_templates (
  id          VARCHAR(64) NOT NULL,
  staff_id    VARCHAR(64) NOT NULL,
  tenant_id   VARCHAR(64) NOT NULL,
  slots       JSON,         -- array of { day, start, end }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_avail_staff UNIQUE (staff_id)
);

CREATE INDEX IF NOT EXISTS idx_avail_tenant ON availability_templates (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_availability_templates
  BEFORE UPDATE ON availability_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Appointment series ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointment_series (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  counselor_id        VARCHAR(64)  NOT NULL,
  client_id           VARCHAR(64)  NOT NULL,
  client_name_enc     BYTEA,
  counselor_name_enc  BYTEA,
  appointment_type    VARCHAR(128),
  recurrence_rule     VARCHAR(512) NOT NULL,         -- e.g. FREQ=WEEKLY;BYDAY=MO,WE
  start_date          DATE         NOT NULL,
  end_date            DATE,
  duration_minutes    INT          NOT NULL DEFAULT 50,
  location_id         VARCHAR(64),
  start_time          VARCHAR(8)   NOT NULL DEFAULT '09:00',
  remote_session      BOOLEAN      NOT NULL DEFAULT FALSE,
  status              VARCHAR(32)  NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_series_tenant    ON appointment_series (tenant_id);
CREATE INDEX IF NOT EXISTS idx_series_counselor ON appointment_series (tenant_id, counselor_id);
CREATE INDEX IF NOT EXISTS idx_series_client    ON appointment_series (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_series_dates     ON appointment_series (tenant_id, start_date, end_date);

CREATE OR REPLACE TRIGGER trg_set_updated_at_appointment_series
  BEFORE UPDATE ON appointment_series
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  all_day         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_avail_override_tenant ON availability_overrides (tenant_id);
CREATE INDEX IF NOT EXISTS idx_avail_override_staff  ON availability_overrides (staff_id, override_date);
CREATE INDEX IF NOT EXISTS idx_avail_override_date   ON availability_overrides (tenant_id, override_date);

CREATE OR REPLACE TRIGGER trg_set_updated_at_availability_overrides
  BEFORE UPDATE ON availability_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Service codes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_codes (
  id                       VARCHAR(64)  NOT NULL,
  tenant_id                VARCHAR(64)  NOT NULL,
  code                     VARCHAR(32)  NOT NULL,
  name                     VARCHAR(255) NOT NULL,
  category                 VARCHAR(128),
  default_duration_minutes INT          NOT NULL DEFAULT 50,
  status                   VARCHAR(64)  NOT NULL DEFAULT 'active',
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_service_code_tenant ON service_codes (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_service_codes
  BEFORE UPDATE ON service_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Fee schedules ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_schedules (
  id         VARCHAR(64)  NOT NULL,
  tenant_id  VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(64)  NOT NULL DEFAULT 'active',
  currency   CHAR(3)      NOT NULL DEFAULT 'USD',
  schedule_lines JSON,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedule_tenant ON fee_schedules (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_fee_schedules
  BEFORE UPDATE ON fee_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Invoices ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id                VARCHAR(64)    NOT NULL,
  tenant_id         VARCHAR(64)    NOT NULL,
  client_id         VARCHAR(64),
  appointment_id    VARCHAR(64),
  issued_at         TIMESTAMPTZ    NULL,
  due_at            TIMESTAMPTZ    NULL,
  status            VARCHAR(64)    NOT NULL DEFAULT 'draft',
  line_items        JSON,
  insurance_enc     TEXT,                   -- encrypted PHI (JSON)
  claim_status      VARCHAR(64)    NOT NULL DEFAULT 'not_submitted',
  subtotal          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  adjustments       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  total             DECIMAL(10,2)  NOT NULL DEFAULT 0,
  amount_paid       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  balance           DECIMAL(10,2)  NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_tenant        ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant_client ON invoices (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status        ON invoices (tenant_id, status);

CREATE OR REPLACE TRIGGER trg_set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Payments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id          VARCHAR(64)   NOT NULL,
  tenant_id   VARCHAR(64)   NOT NULL,
  invoice_id  VARCHAR(64),
  client_id   VARCHAR(64),
  amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  method      VARCHAR(64)   NOT NULL,
  received_at TIMESTAMPTZ   NULL,
  reference   VARCHAR(255),
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_payment_tenant  ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_client  ON payments (client_id);

-- ─── Superbills ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS superbills (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  invoice_id            VARCHAR(64),
  client_id             VARCHAR(64),
  generated_at          TIMESTAMPTZ  NULL,
  diagnosis_codes       JSON,                        -- legacy plaintext column retained only for migration compatibility
  diagnosis_codes_enc   TEXT         NULL,           -- encrypted PHI (ICD codes)
  service_lines         JSON,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_superbill_tenant ON superbills (tenant_id);
CREATE INDEX IF NOT EXISTS idx_superbill_client ON superbills (client_id);

-- ─── Claims ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claims (
  id                 VARCHAR(64)  NOT NULL,
  tenant_id          VARCHAR(64)  NOT NULL,
  invoice_id         VARCHAR(64),
  status             VARCHAR(64)  NOT NULL DEFAULT 'not_submitted',
  external_reference VARCHAR(255),
  submitted_at       TIMESTAMPTZ  NULL,
  notes              TEXT,
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_claim_tenant  ON claims (tenant_id);
CREATE INDEX IF NOT EXISTS idx_claim_invoice ON claims (invoice_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_claims
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal accounts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_accounts (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  client_id         VARCHAR(64)  NOT NULL,
  email_enc         TEXT         NOT NULL,   -- encrypted PHI
  email_lookup_hash CHAR(64)     NULL,       -- deterministic HMAC-SHA256 lookup hash
  password_hash     VARCHAR(255) NULL,       -- argon2id, set once portal access is activated
  failed_attempts   INT          NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ  NULL,
  status            VARCHAR(64)  NOT NULL DEFAULT 'active',
  mfa_enabled       BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login        TIMESTAMPTZ  NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_portal_client UNIQUE (client_id),
  CONSTRAINT uq_portal_email_lookup_hash UNIQUE (tenant_id, email_lookup_hash)
);

CREATE INDEX IF NOT EXISTS idx_portal_account_tenant ON portal_accounts (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_accounts
  BEFORE UPDATE ON portal_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_sessions (
  id                VARCHAR(64)  NOT NULL,   -- SHA-256(token) hex
  portal_account_id VARCHAR(64)  NOT NULL,
  client_id         VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  role              VARCHAR(64)  NOT NULL DEFAULT 'client',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_active_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ  NOT NULL,
  revoked           BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  CONSTRAINT fk_portal_sessions_account FOREIGN KEY (portal_account_id) REFERENCES portal_accounts (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_account ON portal_sessions (portal_account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_client  ON portal_sessions (client_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions (expires_at);

-- ─── Portal password resets ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_password_resets (
  id                VARCHAR(64)  NOT NULL,
  portal_account_id VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  token_hash        CHAR(64)     NOT NULL,
  requested_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ  NOT NULL,
  used_at           TIMESTAMPTZ  NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_portal_password_reset_token UNIQUE (token_hash),
  CONSTRAINT fk_portal_password_reset_account FOREIGN KEY (portal_account_id) REFERENCES portal_accounts (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_password_reset_account ON portal_password_resets (portal_account_id);
CREATE INDEX IF NOT EXISTS idx_portal_password_reset_expires ON portal_password_resets (expires_at);

-- ─── Portal client profiles ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_client_profiles (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  client_id               VARCHAR(64)  NOT NULL,
  preferred_name_enc      TEXT         NULL,      -- encrypted PII
  contact_email_enc       TEXT         NULL,      -- encrypted PII
  contact_phone_enc       TEXT         NULL,      -- encrypted PII
  contact_preferences_enc TEXT         NULL,      -- encrypted JSON
  profile_details_enc     TEXT         NULL,      -- encrypted JSON
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_portal_profile_client UNIQUE (client_id),
  CONSTRAINT fk_portal_profile_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_profile_tenant ON portal_client_profiles (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_client_profiles
  BEFORE UPDATE ON portal_client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  allow_create_account            BOOLEAN      NOT NULL DEFAULT TRUE,
  allow_care_requests             BOOLEAN      NOT NULL DEFAULT TRUE,
  allow_scheduling_requests       BOOLEAN      NOT NULL DEFAULT TRUE,
  show_public_counselor_directory BOOLEAN      NOT NULL DEFAULT FALSE,
  financial_mode                  VARCHAR(64)  NOT NULL DEFAULT 'offerings',
  suggested_offering_cents        INT          NOT NULL DEFAULT 0,
  offering_ministry_note          TEXT         NULL,
  contact_preference_options      JSON         NULL,
  default_signup_form_keys        JSON         NULL,
  created_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_portal_settings_tenant UNIQUE (tenant_id)
);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_settings
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal resources ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_resources (
  id            VARCHAR(64)  NOT NULL,
  tenant_id     VARCHAR(64)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  content       TEXT,
  resource_type VARCHAR(64)  NOT NULL,
  audience      VARCHAR(64)  NOT NULL DEFAULT 'all',
  published_at  TIMESTAMPTZ  NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_resource_tenant ON portal_resources (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_resources
  BEFORE UPDATE ON portal_resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  content_enc      TEXT         NOT NULL,   -- encrypted base64 payload
  uploaded_by_role VARCHAR(64)  NOT NULL DEFAULT 'client',
  status           VARCHAR(64)  NOT NULL DEFAULT 'uploaded',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_portal_upload_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_upload_tenant_client ON portal_uploads (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_uploads
  BEFORE UPDATE ON portal_uploads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal data-rights requests ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_data_right_requests (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  request_type    VARCHAR(64)  NOT NULL,
  status          VARCHAR(64)  NOT NULL DEFAULT 'requested',
  delivery_format VARCHAR(16)  NOT NULL DEFAULT 'json',
  reason_code     VARCHAR(64)  NOT NULL DEFAULT 'self_service_request',
  notes_enc       TEXT         NULL,         -- encrypted free text / PHI
  policy_snapshot JSON         NULL,
  requested_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_portal_data_right_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_data_right_tenant_client ON portal_data_right_requests (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_portal_data_right_status        ON portal_data_right_requests (tenant_id, status);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_data_right_requests
  BEFORE UPDATE ON portal_data_right_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal message threads ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_message_threads (
  id          VARCHAR(64)  NOT NULL,
  tenant_id   VARCHAR(64)  NOT NULL,
  client_id   VARCHAR(64)  NOT NULL,
  subject     VARCHAR(255),
  status      VARCHAR(64)  NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_thread_tenant_client ON portal_message_threads (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_message_threads
  BEFORE UPDATE ON portal_message_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_messages (
  id          VARCHAR(64) NOT NULL,
  tenant_id   VARCHAR(64) NOT NULL,
  thread_id   VARCHAR(64) NOT NULL,
  sender_id   VARCHAR(64) NOT NULL,
  sender_role VARCHAR(64) NOT NULL,
  content_enc TEXT,                 -- encrypted PHI
  sent_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_message_thread ON portal_messages (thread_id);

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
  is_preferred BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_caddr_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_caddr_tenant_client ON client_addresses (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_addresses
  BEFORE UPDATE ON client_addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Client phones ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_phones (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  phone_type      VARCHAR(32)  NOT NULL DEFAULT 'cell',  -- cell | home | work | fax
  number_enc      TEXT         NOT NULL,   -- encrypted PHI
  extension       VARCHAR(16)  NULL,       -- NOT PHI
  is_preferred    BOOLEAN      NOT NULL DEFAULT FALSE,
  ok_to_text      BOOLEAN      NOT NULL DEFAULT FALSE,
  ok_to_leave_msg BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_cphone_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cphone_tenant_client ON client_phones (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_phones
  BEFORE UPDATE ON client_phones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
  has_legal_auth BOOLEAN      NOT NULL DEFAULT FALSE,  -- authorized to receive PHI
  notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_ccontact_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_ccontact_tenant_client ON client_contacts (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_contacts
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  verified_on          DATE         NULL,
  verified_by          VARCHAR(64)  NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_cins_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cins_tenant_client ON client_insurance (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_insurance
  BEFORE UPDATE ON client_insurance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_crp_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_crp_tenant_client ON client_referring_providers (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_referring_providers
  BEFORE UPDATE ON client_referring_providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
  notes_enc       TEXT         NULL,       -- encrypted PHI
  diagnosed_by    VARCHAR(64)  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_cdiag_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cdiag_tenant_client ON client_diagnoses (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_diagnoses
  BEFORE UPDATE ON client_diagnoses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  reason_enc     TEXT         NULL,       -- encrypted PHI
  notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_cmed_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cmed_tenant_client ON client_medications (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_medications
  BEFORE UPDATE ON client_medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_callergy_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_callergy_tenant_client ON client_allergies (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_allergies
  BEFORE UPDATE ON client_allergies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Client clinical history (singleton per client) ───────────────────────────

CREATE TABLE IF NOT EXISTS client_clinical_history (
  id                        VARCHAR(64)  NOT NULL,
  tenant_id                 VARCHAR(64)  NOT NULL,
  client_id                 VARCHAR(64)  NOT NULL,
  -- Medical history
  past_hospitalizations     BOOLEAN      NOT NULL DEFAULT FALSE,
  hospitalizations_enc      TEXT         NULL,       -- encrypted PHI
  past_surgeries            BOOLEAN      NOT NULL DEFAULT FALSE,
  surgeries_enc             TEXT         NULL,       -- encrypted PHI
  chronic_conditions_enc    TEXT         NULL,       -- encrypted PHI (JSON array)
  pcp_name_enc              TEXT         NULL,       -- encrypted PHI
  pcp_practice_enc          TEXT         NULL,       -- encrypted PHI
  pcp_phone_enc             TEXT         NULL,       -- encrypted PHI
  preferred_pharmacy_enc    TEXT         NULL,       -- encrypted PHI (JSON)
  substance_use_screen_enc  TEXT         NULL,       -- encrypted PHI (JSON)
  -- Mental health history
  mh_prior_treatment        BOOLEAN      NOT NULL DEFAULT FALSE,
  mh_prior_treatment_enc    TEXT         NULL,       -- encrypted PHI
  mh_prior_hospitalizations BOOLEAN      NOT NULL DEFAULT FALSE,
  mh_hospitalizations_enc   TEXT         NULL,       -- encrypted PHI
  mh_prior_diagnoses_enc    TEXT         NULL,       -- encrypted PHI
  -- Risk assessment
  si_current                BOOLEAN      NOT NULL DEFAULT FALSE,
  si_history                BOOLEAN      NOT NULL DEFAULT FALSE,
  si_plan                   BOOLEAN      NOT NULL DEFAULT FALSE,
  si_means_access           BOOLEAN      NOT NULL DEFAULT FALSE,
  si_intent                 BOOLEAN      NOT NULL DEFAULT FALSE,
  hi_current                BOOLEAN      NOT NULL DEFAULT FALSE,
  hi_history                BOOLEAN      NOT NULL DEFAULT FALSE,
  self_harm_history         BOOLEAN      NOT NULL DEFAULT FALSE,
  risk_notes_enc            TEXT         NULL,       -- encrypted PHI
  last_risk_assessment_at   TIMESTAMPTZ  NULL,
  risk_assessed_by          VARCHAR(64)  NULL,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_cclinical_client UNIQUE (client_id),
  CONSTRAINT fk_cclinical_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cclinical_tenant_client ON client_clinical_history (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_clinical_history
  BEFORE UPDATE ON client_clinical_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_cfaith_client UNIQUE (client_id),
  CONSTRAINT fk_cfaith_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_cfaith_tenant_client ON client_faith_profiles (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_faith_profiles
  BEFORE UPDATE ON client_faith_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  court_ordered          BOOLEAN      NOT NULL DEFAULT FALSE,
  court_case_number_enc  TEXT         NULL,       -- encrypted PHI
  court_contact_enc      TEXT         NULL,       -- encrypted PHI (JSON)
  court_order_expires    DATE         NULL,
  custody_notes_enc      TEXT         NULL,       -- encrypted PHI
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_clegal_client UNIQUE (client_id),
  CONSTRAINT fk_clegal_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_clegal_tenant_client ON client_legal (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_client_legal
  BEFORE UPDATE ON client_legal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Portal appointment requests ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_appointment_requests (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  requested_type   VARCHAR(64)  NOT NULL,
  preferred_times  JSON,
  notes            TEXT,
  status           VARCHAR(64)  NOT NULL DEFAULT 'pending',
  resolved_at      TIMESTAMPTZ  NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_appt_req_tenant_client ON portal_appointment_requests (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_appointment_requests
  BEFORE UPDATE ON portal_appointment_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Workspace Studio form catalog ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS form_catalog (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  form_key               VARCHAR(128) NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  category               VARCHAR(64)  NOT NULL,
  is_standard_on_signup  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  version_number         INT          NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_form_catalog_tenant_form_key UNIQUE (tenant_id, form_key)
);

CREATE INDEX IF NOT EXISTS idx_form_catalog_tenant_category ON form_catalog (tenant_id, category);

CREATE OR REPLACE TRIGGER trg_set_updated_at_form_catalog
  BEFORE UPDATE ON form_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Workspace Studio form assignments ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS form_assignments (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  form_key               VARCHAR(128) NOT NULL,
  form_title             VARCHAR(255) NOT NULL,
  assignment_type        VARCHAR(64)  NOT NULL DEFAULT 'next_session',
  scheduled_for          TIMESTAMPTZ  NULL,
  recurrence_rule        VARCHAR(255) NULL,
  status                 VARCHAR(64)  NOT NULL DEFAULT 'assigned',
  assigned_by            VARCHAR(64)  NULL,
  notes                  VARCHAR(500) NULL,
  due_at                 TIMESTAMPTZ  NULL,
  completed_at           TIMESTAMPTZ  NULL,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_form_assign_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_form_assign_tenant_client   ON form_assignments (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_form_assign_tenant_status   ON form_assignments (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_form_assign_tenant_form_key ON form_assignments (tenant_id, form_key);

CREATE OR REPLACE TRIGGER trg_set_updated_at_form_assignments
  BEFORE UPDATE ON form_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Workspace Studio form submissions (append-only, encrypted payload) ─────

CREATE TABLE IF NOT EXISTS form_submissions (
  id                     VARCHAR(64)   NOT NULL,
  tenant_id              VARCHAR(64)   NOT NULL,
  assignment_id          VARCHAR(64)   NULL,
  client_id              VARCHAR(64)   NOT NULL,
  form_key               VARCHAR(128)  NOT NULL,
  form_title             VARCHAR(255)  NOT NULL,
  submission_version     INT           NOT NULL,
  submitted_by_type      VARCHAR(32)   NOT NULL DEFAULT 'client',
  responses_enc          TEXT          NOT NULL,
  score_label            VARCHAR(128)  NULL,
  score_value            DECIMAL(10,2) NULL,
  interpretation_label   VARCHAR(128)  NULL,
  submitted_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_form_submit_client     FOREIGN KEY (client_id)     REFERENCES clients (id),
  CONSTRAINT fk_form_submit_assignment FOREIGN KEY (assignment_id) REFERENCES form_assignments (id)
);

CREATE INDEX IF NOT EXISTS idx_form_submit_tenant_client       ON form_submissions (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_form_submit_tenant_form_key     ON form_submissions (tenant_id, form_key);
CREATE INDEX IF NOT EXISTS idx_form_submit_tenant_submitted_at ON form_submissions (tenant_id, submitted_at);

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
  onboarding_details_enc TEXT         NULL,      -- encrypted JSON with onboarding intake answers / PHI
  notes_enc              TEXT         NULL,
  status                 VARCHAR(64)  NOT NULL DEFAULT 'requested',
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_portal_reg_tenant_status ON portal_registration_requests (tenant_id, status);

CREATE OR REPLACE TRIGGER trg_set_updated_at_portal_registration_requests
  BEFORE UPDATE ON portal_registration_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_offerings_client FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE INDEX IF NOT EXISTS idx_offerings_tenant_client   ON offerings (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_offerings_tenant_received ON offerings (tenant_id, received_on);

CREATE OR REPLACE TRIGGER trg_set_updated_at_offerings
  BEFORE UPDATE ON offerings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Faith: note templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_note_templates (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  focus_area        VARCHAR(120),
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  sections          JSON,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_note_tmpl_tenant ON faith_note_templates (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_faith_note_templates
  BEFORE UPDATE ON faith_note_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Faith: treatment goal templates ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_goal_templates (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  title             VARCHAR(255) NOT NULL,
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  scriptures        JSON,
  milestones        JSON,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_goal_tmpl_tenant ON faith_goal_templates (tenant_id);

-- ─── Faith: consent language variants ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_consent_variants (
  id                VARCHAR(64)  NOT NULL,
  tenant_id         VARCHAR(64)  NOT NULL,
  title             VARCHAR(255) NOT NULL,
  body              TEXT,
  audience          VARCHAR(20)  NOT NULL DEFAULT 'client',
  integration_level VARCHAR(64)  NOT NULL DEFAULT 'balanced',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_consent_var_tenant ON faith_consent_variants (tenant_id);

-- ─── Faith: resource library ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_resources (
  id                  VARCHAR(64)  NOT NULL,
  tenant_id           VARCHAR(64)  NOT NULL,
  title               VARCHAR(255) NOT NULL,
  resource_type       VARCHAR(64)  NOT NULL,
  content             TEXT,
  scripture_reference VARCHAR(255),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_resource_tenant ON faith_resources (tenant_id);

-- ─── Faith: spiritual formation inventories ───────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_inventories (
  id         VARCHAR(64)  NOT NULL,
  tenant_id  VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  cadence    VARCHAR(64)  NOT NULL DEFAULT 'weekly',
  prompts    JSON,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_inv_tenant ON faith_inventories (tenant_id);

-- ─── Faith: church referral coordinations ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_church_referrals (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  client_id             VARCHAR(64)  NOT NULL,
  church_name           VARCHAR(255),
  contact_name          VARCHAR(160),
  contact_method        VARCHAR(200),
  status                VARCHAR(64)  NOT NULL DEFAULT 'proposed',
  consent_to_coordinate BOOLEAN      NOT NULL DEFAULT FALSE,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_referral_tenant_client ON faith_church_referrals (tenant_id, client_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_faith_church_referrals
  BEFORE UPDATE ON faith_church_referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Faith: language preferences ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faith_language_preferences (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  practice_id             VARCHAR(64),
  integration_level       VARCHAR(64)  NOT NULL DEFAULT 'moderate',
  explicit_faith_language BOOLEAN      NOT NULL DEFAULT TRUE,
  include_prayer_language BOOLEAN      NOT NULL DEFAULT TRUE,
  include_scripture_refs  BOOLEAN      NOT NULL DEFAULT TRUE,
  preferred_terminology   VARCHAR(255),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_faith_lang_pref_tenant ON faith_language_preferences (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_faith_language_preferences
  BEFORE UPDATE ON faith_language_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Platform: tenant provisioning ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_provisioning (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  requested_tenant_id   VARCHAR(64)  NOT NULL,
  requested_practice_name VARCHAR(255) NOT NULL,
  owner_email           VARCHAR(320) NULL,       -- legacy plaintext column retained only for migration compatibility
  owner_email_enc       TEXT         NOT NULL,
  status                VARCHAR(64)  NOT NULL DEFAULT 'queued',
  requested_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ  NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_prov_status ON tenant_provisioning (status);

-- ─── Platform: impersonation sessions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  target_tenant_id VARCHAR(64)  NOT NULL,
  target_role      VARCHAR(64)  NOT NULL,
  requested_by     VARCHAR(64)  NOT NULL,
  reason           TEXT,
  status           VARCHAR(64)  NOT NULL DEFAULT 'active',
  started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ  NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_tenant ON impersonation_sessions (tenant_id);

-- ─── Platform: data export jobs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_export_jobs (
  id                 VARCHAR(64)  NOT NULL,
  tenant_id          VARCHAR(64)  NOT NULL,
  export_type        VARCHAR(64)  NOT NULL,
  status             VARCHAR(64)  NOT NULL DEFAULT 'queued',
  requested_by_role  VARCHAR(64)  NOT NULL,
  requested_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ  NULL,
  format             VARCHAR(16)  NOT NULL DEFAULT 'json',
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_export_job_tenant ON data_export_jobs (tenant_id);

-- ─── Platform: retention policies ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_policies (
  id                       VARCHAR(64)  NOT NULL,
  tenant_id                VARCHAR(64)  NOT NULL,
  clinical_records_schedule VARCHAR(64) NOT NULL DEFAULT '10_years',
  billing_schedule          VARCHAR(64) NOT NULL DEFAULT '7_years',
  audit_log_schedule        VARCHAR(64) NOT NULL DEFAULT 'indefinite',
  include_document_versions BOOLEAN     NOT NULL DEFAULT TRUE,
  legal_hold_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_retention_tenant ON retention_policies (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_retention_policies
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_primary        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_staff_licenses_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_licenses_staff  ON staff_licenses (staff_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_licenses_tenant ON staff_licenses (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_licenses
  BEFORE UPDATE ON staff_licenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  is_ceu          BOOLEAN      NOT NULL DEFAULT FALSE,
  notes_enc       TEXT         NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_staff_certs_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_certs_staff  ON staff_certifications (staff_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_certs_tenant ON staff_certifications (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_certifications
  BEFORE UPDATE ON staff_certifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_specialty_staff UNIQUE (staff_id),
  CONSTRAINT fk_specialty_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_specialty_tenant ON staff_specialty_profiles (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_specialty_profiles
  BEFORE UPDATE ON staff_specialty_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_employment_staff UNIQUE (staff_id),
  CONSTRAINT fk_employment_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_employment_tenant ON staff_employment (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_employment
  BEFORE UPDATE ON staff_employment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS staff_faith_profiles (
  id                          VARCHAR(64)  NOT NULL,
  staff_id                    VARCHAR(64)  NOT NULL,
  tenant_id                   VARCHAR(64)  NOT NULL,
  faith_tradition             VARCHAR(128) NULL,
  theological_approach_enc    TEXT         NULL,
  ordained                    BOOLEAN      NOT NULL DEFAULT FALSE,
  ordaining_body              VARCHAR(255) NULL,
  aacc_member                 BOOLEAN      NOT NULL DEFAULT FALSE,
  acbc_certified              BOOLEAN      NOT NULL DEFAULT FALSE,
  ccca_member                 BOOLEAN      NOT NULL DEFAULT FALSE,
  other_faith_credentials_enc TEXT         NULL,
  prayer_integration          VARCHAR(32)  NULL,
  scripture_integration       VARCHAR(32)  NULL,
  spiritual_gifts_enc         TEXT         NULL,
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT uq_staff_faith UNIQUE (staff_id),
  CONSTRAINT fk_staff_faith_member FOREIGN KEY (staff_id) REFERENCES staff_members (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_faith_tenant ON staff_faith_profiles (tenant_id);

CREATE OR REPLACE TRIGGER trg_set_updated_at_staff_faith_profiles
  BEFORE UPDATE ON staff_faith_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  actioned_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ   NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_wf_state UNIQUE (tenant_id, client_id, rule_id),
  CONSTRAINT fk_wf_state_client   FOREIGN KEY (client_id)   REFERENCES clients(id)       ON DELETE CASCADE,
  CONSTRAINT fk_wf_state_counselor FOREIGN KEY (counselor_id) REFERENCES staff_members(id)
);

CREATE INDEX IF NOT EXISTS idx_wf_states_client   ON workflow_recommendation_states (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_wf_states_counselor ON workflow_recommendation_states (counselor_id, actioned_at);

CREATE OR REPLACE TRIGGER trg_set_updated_at_workflow_recommendation_states
  BEFORE UPDATE ON workflow_recommendation_states
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Video join tokens ────────────────────────────────────────────────────────
-- Opaque one-time tokens that let a client join a video session without
-- a staff login.  The JWT is NOT stored here — it is regenerated on exchange
-- using the JaaS credentials already held by the server.  Tokens expire after
-- 2 hours, matching the JWT lifetime.  The full room_name (appId/opaqueId) is
-- stored so it can be reproduced exactly when issuing the client-scoped JWT.

CREATE TABLE IF NOT EXISTS video_join_tokens (
  id             VARCHAR(64)   NOT NULL,
  tenant_id      VARCHAR(64)   NOT NULL,
  appointment_id VARCHAR(64)   NULL,
  client_id      VARCHAR(64)   NULL,
  room_name      VARCHAR(512)  NOT NULL,
  domain         VARCHAR(128)  NOT NULL DEFAULT '8x8.vc',
  app_id         VARCHAR(255)  NULL,
  api_key_id     VARCHAR(255)  NULL,
  expires_at     TIMESTAMPTZ   NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_vjt_tenant_expires ON video_join_tokens (tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_vjt_expires         ON video_join_tokens (expires_at);
