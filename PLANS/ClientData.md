
# ClientData.md — FaithCounseling Enterprise Client Information System

## Implementation Plan — Medical Practice-Grade Client Records

**Prepared:** 2026-03-24
**Stack:** Node.js raw HTTP / MySQL 8 / AES-256-GCM PHI encryption / React 18 + Vite
**Reference codebase state:** Phase 1 DB complete, clients table has `first_name_enc`, `last_name_enc`, `status`, `faith_background` only

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [DB Schema Additions](#db-schema-additions)
3. [API Changes](#api-changes)
4. [Frontend Screen Design](#frontend-screen-design)
5. [Implementation Steps](#implementation-steps)
6. [PHI Encryption Reference](#phi-encryption-reference)

## Architecture Overview

The existing `clients` table is intentionally thin — it holds only identity and status. The expansion strategy follows the same design principle already present in the schema: **thin anchor tables with normalised child tables** for multi-value relationships, and **AES-256-GCM encrypted TEXT columns** for every field that qualifies as PHI under HIPAA.

All new tables carry `tenant_id` for multi-tenancy and a FK back to `clients(id)`. All new query files follow the pattern established in `apps/api/src/db/queries/clients.js`: explicit row-mapper functions, parameterised queries, encrypt/decrypt at the boundary.

The `client_lifecycles` table already exists and holds a JSON blob for emergency contacts. That blob approach will be replaced by a normalised `client_contacts` table. The existing `emergency_contact_enc` column on `client_lifecycles` is kept for backward compatibility but deprecated in favour of the new table.

## DB Schema Additions

### 1. Expand `clients` core demographics

Add columns directly to the `clients` table. All are PHI-encrypted unless noted.

```sql
ALTER TABLE clients
  -- Legal identity
  ADD COLUMN middle_name_enc        TEXT         NULL,          -- PHI encrypted
  ADD COLUMN preferred_name_enc     TEXT         NULL,          -- PHI encrypted
  ADD COLUMN pronouns               VARCHAR(64)  NULL,          -- NOT PHI; patient-chosen label
  ADD COLUMN date_of_birth_enc      TEXT         NULL,          -- PHI encrypted (ISO 8601 string)
  ADD COLUMN ssn_last4_enc          TEXT         NULL,          -- PHI encrypted
  ADD COLUMN gender_identity        VARCHAR(128) NULL,          -- NOT PHI; patient-chosen label
  ADD COLUMN biological_sex         VARCHAR(32)  NULL,          -- NOT PHI enum: male|female|intersex|unknown
  ADD COLUMN race_ethnicity         VARCHAR(128) NULL,          -- NOT PHI; used for aggregate reporting
  ADD COLUMN marital_status         VARCHAR(64)  NULL,          -- NOT PHI enum
  ADD COLUMN language_preference    VARCHAR(64)  NULL DEFAULT 'en',
  ADD COLUMN employment_status      VARCHAR(64)  NULL,          -- NOT PHI enum
  ADD COLUMN employer_name_enc      TEXT         NULL,          -- PHI encrypted
  ADD COLUMN email_enc              TEXT         NULL,          -- PHI encrypted
  -- Administrative flags (non-PHI)
  ADD COLUMN is_minor               TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN court_ordered          TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN referral_source_detail VARCHAR(255) NULL;          -- non-PHI label
```

**PHI encryption decision rationale:**

- `date_of_birth_enc`, `ssn_last4_enc`, `employer_name_enc`, `email_enc`: direct identifiers — always encrypt.
- `middle_name_enc`, `preferred_name_enc`: name components — always encrypt.
- `pronouns`, `gender_identity`, `biological_sex`, `race_ethnicity`, `marital_status`, `language_preference`, `employment_status`: category labels, not unique identifiers. Stored plaintext to allow indexed filtering. If your threat model requires all demographic fields encrypted, wrap these in `_enc` columns too; the trade-off is losing the ability to filter by them in SQL.

### 2. New table: `client_addresses`

Replaces the single encrypted blob in `locations`. Supports primary + mailing addresses.

```sql
CREATE TABLE IF NOT EXISTS client_addresses (
  id           VARCHAR(64)  NOT NULL,
  tenant_id    VARCHAR(64)  NOT NULL,
  client_id    VARCHAR(64)  NOT NULL,
  addr_type    VARCHAR(32)  NOT NULL DEFAULT 'primary',  -- primary | mailing | other
  line1_enc    TEXT         NOT NULL,   -- PHI encrypted
  line2_enc    TEXT         NULL,       -- PHI encrypted
  city_enc     TEXT         NOT NULL,   -- PHI encrypted
  state        VARCHAR(64)  NOT NULL,   -- NOT PHI; state/province code
  postal_enc   TEXT         NOT NULL,   -- PHI encrypted
  country      VARCHAR(64)  NOT NULL DEFAULT 'US',
  is_preferred TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_caddr_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_caddr_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. New table: `client_phones`

```sql
CREATE TABLE IF NOT EXISTS client_phones (
  id           VARCHAR(64)  NOT NULL,
  tenant_id    VARCHAR(64)  NOT NULL,
  client_id    VARCHAR(64)  NOT NULL,
  phone_type   VARCHAR(32)  NOT NULL DEFAULT 'cell',  -- cell | home | work | fax
  number_enc   TEXT         NOT NULL,   -- PHI encrypted
  extension    VARCHAR(16)  NULL,       -- NOT PHI
  is_preferred TINYINT(1)   NOT NULL DEFAULT 0,
  ok_to_text   TINYINT(1)   NOT NULL DEFAULT 0,
  ok_to_leave_msg TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cphone_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cphone_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. New table: `client_contacts` (Emergency Contacts)

Replaces `emergency_contact_enc` JSON blob on `client_lifecycles`.

```sql
CREATE TABLE IF NOT EXISTS client_contacts (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  contact_type     VARCHAR(32)  NOT NULL DEFAULT 'emergency',  -- emergency | guardian | other
  name_enc         TEXT         NOT NULL,   -- PHI encrypted
  relationship     VARCHAR(64)  NOT NULL,   -- NOT PHI enum label
  phone_enc        TEXT         NOT NULL,   -- PHI encrypted
  email_enc        TEXT         NULL,       -- PHI encrypted
  is_primary       TINYINT(1)   NOT NULL DEFAULT 0,
  has_legal_auth   TINYINT(1)   NOT NULL DEFAULT 0,  -- authorized to receive PHI
  notes_enc        TEXT         NULL,       -- PHI encrypted
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ccontact_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_ccontact_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. New table: `client_insurance`

Supports primary and secondary coverage. One row per coverage slot.

```sql
CREATE TABLE IF NOT EXISTS client_insurance (
  id                    VARCHAR(64)  NOT NULL,
  tenant_id             VARCHAR(64)  NOT NULL,
  client_id             VARCHAR(64)  NOT NULL,
  coverage_order        VARCHAR(16)  NOT NULL DEFAULT 'primary',  -- primary | secondary | tertiary
  carrier_name_enc      TEXT         NOT NULL,   -- PHI encrypted
  plan_name             VARCHAR(255) NULL,        -- NOT PHI
  member_id_enc         TEXT         NOT NULL,   -- PHI encrypted
  group_number_enc      TEXT         NULL,       -- PHI encrypted
  -- Subscriber (if different from client)
  subscriber_name_enc   TEXT         NULL,       -- PHI encrypted
  subscriber_dob_enc    TEXT         NULL,       -- PHI encrypted (ISO 8601)
  subscriber_rel        VARCHAR(64)  NULL,       -- NOT PHI enum: self|spouse|child|other
  -- Auth / referral
  auth_number_enc       TEXT         NULL,       -- PHI encrypted
  auth_visits_approved  INT          NULL,
  auth_expires_on       DATE         NULL,
  referral_number_enc   TEXT         NULL,       -- PHI encrypted
  copay_cents           INT          NULL,        -- NOT PHI; stored as integer cents
  -- Admin
  effective_from        DATE         NULL,
  effective_to          DATE         NULL,
  is_active             TINYINT(1)   NOT NULL DEFAULT 1,
  verified_on           DATE         NULL,
  verified_by           VARCHAR(64)  NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cins_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cins_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. New table: `client_referring_providers`

One-to-one per client in practice, but normalised for extensibility.

```sql
CREATE TABLE IF NOT EXISTS client_referring_providers (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  client_id      VARCHAR(64)  NOT NULL,
  provider_name_enc TEXT      NOT NULL,   -- PHI encrypted
  practice_name  VARCHAR(255) NULL,        -- NOT PHI
  npi            VARCHAR(16)  NULL,        -- NOT PHI (NPI is a public identifier)
  phone_enc      TEXT         NULL,       -- PHI encrypted (direct line)
  fax_enc        TEXT         NULL,       -- PHI encrypted
  address_enc    TEXT         NULL,       -- PHI encrypted (full address JSON)
  referral_date  DATE         NULL,        -- NOT PHI
  referral_notes_enc TEXT     NULL,       -- PHI encrypted
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_crp_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_crp_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. New table: `client_diagnoses`

DSM-5 and ICD-10 codes. Multiple diagnoses per client.

```sql
CREATE TABLE IF NOT EXISTS client_diagnoses (
  id              VARCHAR(64)  NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  client_id       VARCHAR(64)  NOT NULL,
  code_system     VARCHAR(16)  NOT NULL DEFAULT 'DSM-5',  -- DSM-5 | ICD-10 | ICD-11
  code            VARCHAR(32)  NOT NULL,   -- NOT PHI; e.g. F41.1
  description_enc TEXT         NOT NULL,   -- PHI encrypted
  onset_date      DATE         NULL,        -- NOT PHI (general clinical date, no specific event detail)
  status          VARCHAR(32)  NOT NULL DEFAULT 'active',  -- active | resolved | rule_out | deferred
  is_primary      TINYINT(1)   NOT NULL DEFAULT 0,
  notes_enc       TEXT         NULL,       -- PHI encrypted
  diagnosed_by    VARCHAR(64)  NULL,        -- staff_member.id, NOT PHI
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cdiag_tenant_client (tenant_id, client_id),
  INDEX idx_cdiag_code (tenant_id, code),
  CONSTRAINT fk_cdiag_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. New table: `client_medications`

```sql
CREATE TABLE IF NOT EXISTS client_medications (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  med_name_enc     TEXT         NOT NULL,   -- PHI encrypted
  dose_enc         TEXT         NULL,       -- PHI encrypted (e.g. "50 mg")
  frequency_enc    TEXT         NULL,       -- PHI encrypted (e.g. "twice daily")
  route            VARCHAR(64)  NULL,        -- NOT PHI enum: oral|IM|topical|etc
  prescriber_enc   TEXT         NULL,       -- PHI encrypted (name)
  start_date       DATE         NULL,        -- NOT PHI
  end_date         DATE         NULL,        -- NOT PHI
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  reason_enc       TEXT         NULL,       -- PHI encrypted
  notes_enc        TEXT         NULL,       -- PHI encrypted
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cmed_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cmed_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 9. New table: `client_allergies`

```sql
CREATE TABLE IF NOT EXISTS client_allergies (
  id               VARCHAR(64)  NOT NULL,
  tenant_id        VARCHAR(64)  NOT NULL,
  client_id        VARCHAR(64)  NOT NULL,
  substance_enc    TEXT         NOT NULL,   -- PHI encrypted
  reaction_enc     TEXT         NULL,       -- PHI encrypted
  severity         VARCHAR(32)  NOT NULL DEFAULT 'unknown',  -- mild|moderate|severe|life_threatening|unknown
  allergy_type     VARCHAR(32)  NOT NULL DEFAULT 'drug',     -- drug|food|environmental|other
  onset_date       DATE         NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_callergy_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_callergy_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 10. New table: `client_clinical_history`

One row per client. Dense column layout for the intake screening fields. Uses `encryptJson` for structured sub-sections.

```sql
CREATE TABLE IF NOT EXISTS client_clinical_history (
  id                        VARCHAR(64)  NOT NULL,
  tenant_id                 VARCHAR(64)  NOT NULL,
  client_id                 VARCHAR(64)  NOT NULL,

  -- Medical history flags (non-PHI booleans + PHI detail text)
  past_hospitalizations     TINYINT(1)   NOT NULL DEFAULT 0,
  hospitalizations_enc      TEXT         NULL,   -- PHI encrypted (free text details)
  past_surgeries            TINYINT(1)   NOT NULL DEFAULT 0,
  surgeries_enc             TEXT         NULL,   -- PHI encrypted
  chronic_conditions_enc    TEXT         NULL,   -- PHI encrypted (JSON array of strings)

  -- Primary care
  pcp_name_enc              TEXT         NULL,   -- PHI encrypted
  pcp_practice_enc          TEXT         NULL,   -- PHI encrypted
  pcp_phone_enc             TEXT         NULL,   -- PHI encrypted
  preferred_pharmacy_enc    TEXT         NULL,   -- PHI encrypted (name + address JSON)

  -- Substance use screening (AUDIT / DAST style)
  substance_use_screen_enc  TEXT         NULL,   -- PHI encrypted (JSON object with answers)

  -- Mental health history
  mh_prior_treatment        TINYINT(1)   NOT NULL DEFAULT 0,
  mh_prior_treatment_enc    TEXT         NULL,   -- PHI encrypted (details)
  mh_prior_hospitalizations TINYINT(1)   NOT NULL DEFAULT 0,
  mh_hospitalizations_enc   TEXT         NULL,   -- PHI encrypted
  mh_prior_diagnoses_enc    TEXT         NULL,   -- PHI encrypted (free text or JSON array)

  -- Risk / safety
  si_current                TINYINT(1)   NOT NULL DEFAULT 0,  -- suicidal ideation present
  si_history                TINYINT(1)   NOT NULL DEFAULT 0,
  si_plan                   TINYINT(1)   NOT NULL DEFAULT 0,
  si_means_access           TINYINT(1)   NOT NULL DEFAULT 0,
  si_intent                 TINYINT(1)   NOT NULL DEFAULT 0,
  hi_current                TINYINT(1)   NOT NULL DEFAULT 0,  -- homicidal ideation
  hi_history                TINYINT(1)   NOT NULL DEFAULT 0,
  self_harm_history         TINYINT(1)   NOT NULL DEFAULT 0,
  risk_notes_enc            TEXT         NULL,   -- PHI encrypted (narrative)
  last_risk_assessment_at   TIMESTAMP    NULL,
  risk_assessed_by          VARCHAR(64)  NULL,   -- staff_member.id

  created_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cch_client (client_id),
  INDEX idx_cch_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cch_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note on risk flags:** The boolean columns `si_current`, `si_plan`, etc. are NOT encrypted because they are needed for SQL-level alerting queries (e.g. "show all clients with active SI for compliance watch panel"). If your threat model forbids any unencrypted clinical booleans, move them into a `risk_flags_enc JSON` column and accept losing indexed querying on them.

### 11. New table: `client_faith_profile`

One row per client.

```sql
CREATE TABLE IF NOT EXISTS client_faith_profiles (
  id                        VARCHAR(64)  NOT NULL,
  tenant_id                 VARCHAR(64)  NOT NULL,
  client_id                 VARCHAR(64)  NOT NULL,
  denomination              VARCHAR(128) NULL,    -- NOT PHI; category label
  church_name_enc           TEXT         NULL,    -- PHI encrypted
  pastor_name_enc           TEXT         NULL,    -- PHI encrypted
  spiritual_director_enc    TEXT         NULL,    -- PHI encrypted
  faith_integration_level   VARCHAR(32)  NULL DEFAULT 'open',  -- NOT PHI enum: none|open|preferred|required
  spiritual_concerns_enc    TEXT         NULL,    -- PHI encrypted (free text)
  religious_restrictions_enc TEXT        NULL,    -- PHI encrypted (fasting, dietary, observance)
  faith_strengths_enc       TEXT         NULL,    -- PHI encrypted
  created_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cfp_client (client_id),
  INDEX idx_cfp_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_cfp_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Why `church_name_enc` is PHI:** Combined with the client's name it uniquely identifies the individual within a small congregation. Encrypt it.

### 12. New table: `client_legal`

One row per client. Covers guardian info and court-order details.

```sql
CREATE TABLE IF NOT EXISTS client_legal (
  id                     VARCHAR(64)  NOT NULL,
  tenant_id              VARCHAR(64)  NOT NULL,
  client_id              VARCHAR(64)  NOT NULL,
  -- Guardian (only relevant when is_minor = 1 on clients table)
  guardian_name_enc      TEXT         NULL,   -- PHI encrypted
  guardian_relationship  VARCHAR(64)  NULL,   -- NOT PHI enum
  guardian_phone_enc     TEXT         NULL,   -- PHI encrypted
  guardian_email_enc     TEXT         NULL,   -- PHI encrypted
  guardian_address_enc   TEXT         NULL,   -- PHI encrypted (JSON)
  -- Court / legal
  court_ordered          TINYINT(1)   NOT NULL DEFAULT 0,
  court_case_number_enc  TEXT         NULL,   -- PHI encrypted
  court_contact_enc      TEXT         NULL,   -- PHI encrypted (officer/attorney JSON)
  court_order_expires    DATE         NULL,
  -- Custody
  custody_notes_enc      TEXT         NULL,   -- PHI encrypted
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clegal_client (client_id),
  INDEX idx_clegal_tenant_client (tenant_id, client_id),
  CONSTRAINT fk_clegal_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Summary: New Query Files Needed

| File | Covers |
|---|---|
| `apps/api/src/db/queries/clientDemographics.js` | `clients` ALTER columns |
| `apps/api/src/db/queries/clientAddresses.js` | `client_addresses` |
| `apps/api/src/db/queries/clientPhones.js` | `client_phones` |
| `apps/api/src/db/queries/clientContacts.js` | `client_contacts` |
| `apps/api/src/db/queries/clientInsurance.js` | `client_insurance` |
| `apps/api/src/db/queries/clientReferringProviders.js` | `client_referring_providers` |
| `apps/api/src/db/queries/clientDiagnoses.js` | `client_diagnoses` |
| `apps/api/src/db/queries/clientMedications.js` | `client_medications` |
| `apps/api/src/db/queries/clientAllergies.js` | `client_allergies` |
| `apps/api/src/db/queries/clientClinicalHistory.js` | `client_clinical_history` |
| `apps/api/src/db/queries/clientFaithProfiles.js` | `client_faith_profiles` |
| `apps/api/src/db/queries/clientLegal.js` | `client_legal` |

Each file must follow the exact pattern in `clients.js`: a `rowTo*` mapper that calls `decrypt()`/`decryptJson()` on encrypted columns, and named exports for `list*`, `get*`, `create*`, `update*`, `delete*`.

## API Changes

### Existing endpoints to expand

#### `GET /v1/clients/:id`

Expand `dbRowToClient` to include all new `clients` table columns. The handler at line 1371 of `index.js` calls `dbRowToClient` — that mapper needs to decrypt the new columns and include them in the returned shape.

Add optional query parameter `?expand=addresses,phones,contacts,insurance,diagnoses,medications,allergies,clinical,faith,legal,referring` that triggers LEFT JOIN or parallel sub-resource queries and embeds them into the response as nested arrays. This avoids N+1 when the client detail screen loads.

#### `PATCH /v1/clients/:id`

Expand to accept all new demographic fields. The existing partial-update pattern (build `setClauses` array dynamically) is the right approach — continue it for all new columns.

### New sub-resource endpoints

All follow the pattern: tenant-scoped, session-authenticated, audit-emitted. Method sets are standard REST: `GET` list + `POST` create on the collection, `GET` + `PATCH` + `DELETE` on the item.

#### Addresses

```
GET    /v1/clients/:id/addresses
POST   /v1/clients/:id/addresses
PATCH  /v1/clients/:id/addresses/:addrId
DELETE /v1/clients/:id/addresses/:addrId
```

#### Phones

```
GET    /v1/clients/:id/phones
POST   /v1/clients/:id/phones
PATCH  /v1/clients/:id/phones/:phoneId
DELETE /v1/clients/:id/phones/:phoneId
```

#### Contacts (Emergency + Guardian)

```
GET    /v1/clients/:id/contacts
POST   /v1/clients/:id/contacts
PATCH  /v1/clients/:id/contacts/:contactId
DELETE /v1/clients/:id/contacts/:contactId
```

#### Insurance

```
GET    /v1/clients/:id/insurance
POST   /v1/clients/:id/insurance
PATCH  /v1/clients/:id/insurance/:insuranceId
DELETE /v1/clients/:id/insurance/:insuranceId
```

#### Referring Providers

```
GET    /v1/clients/:id/referring-providers
POST   /v1/clients/:id/referring-providers
PATCH  /v1/clients/:id/referring-providers/:rpId
DELETE /v1/clients/:id/referring-providers/:rpId
```

#### Diagnoses

```
GET    /v1/clients/:id/diagnoses
POST   /v1/clients/:id/diagnoses
PATCH  /v1/clients/:id/diagnoses/:dxId
DELETE /v1/clients/:id/diagnoses/:dxId
```

#### Medications

```
GET    /v1/clients/:id/medications
POST   /v1/clients/:id/medications
PATCH  /v1/clients/:id/medications/:medId
DELETE /v1/clients/:id/medications/:medId
```

#### Allergies

```
GET    /v1/clients/:id/allergies
POST   /v1/clients/:id/allergies
PATCH  /v1/clients/:id/allergies/:allergyId
DELETE /v1/clients/:id/allergies/:allergyId
```

#### Clinical History (singleton)

```
GET    /v1/clients/:id/clinical-history
PUT    /v1/clients/:id/clinical-history
```

Use `PUT` (full upsert) since this is a singleton record. On first save it creates the row; subsequent calls update it.

#### Faith Profile (singleton)

```
GET    /v1/clients/:id/faith-profile
PUT    /v1/clients/:id/faith-profile
```

#### Legal Record (singleton)

```
GET    /v1/clients/:id/legal
PUT    /v1/clients/:id/legal
```

### Routing strategy in `index.js`

The existing router in `index.js` uses a simple `if/else if` chain on `requestUrl.pathname`. For sub-resources add a branch:

```
if pathname matches /v1/clients/:id/<subresource>
  route to handleClient<Subresource>(request, response, clientId, subresourceId, session)
```

Extract a `parseClientSubresourcePath(pathname)` helper that returns `{ clientId, subresource, subId }` to keep the routing logic clean.

### PHI fields that require `encrypt()` on write / `decrypt()` on read

| Table | Encrypted columns |
|---|---|
| `clients` | `middle_name_enc`, `preferred_name_enc`, `date_of_birth_enc`, `ssn_last4_enc`, `employer_name_enc`, `email_enc` (+ existing `first_name_enc`, `last_name_enc`) |
| `client_addresses` | `line1_enc`, `line2_enc`, `city_enc`, `postal_enc` |
| `client_phones` | `number_enc` |
| `client_contacts` | `name_enc`, `phone_enc`, `email_enc`, `notes_enc` |
| `client_insurance` | `carrier_name_enc`, `member_id_enc`, `group_number_enc`, `subscriber_name_enc`, `subscriber_dob_enc`, `auth_number_enc`, `referral_number_enc` |
| `client_referring_providers` | `provider_name_enc`, `phone_enc`, `fax_enc`, `address_enc`, `referral_notes_enc` |
| `client_diagnoses` | `description_enc`, `notes_enc` |
| `client_medications` | `med_name_enc`, `dose_enc`, `frequency_enc`, `prescriber_enc`, `reason_enc`, `notes_enc` |
| `client_allergies` | `substance_enc`, `reaction_enc` |
| `client_clinical_history` | `hospitalizations_enc`, `surgeries_enc`, `chronic_conditions_enc`, `pcp_name_enc`, `pcp_practice_enc`, `pcp_phone_enc`, `preferred_pharmacy_enc`, `substance_use_screen_enc`, `mh_prior_treatment_enc`, `mh_hospitalizations_enc`, `mh_prior_diagnoses_enc`, `risk_notes_enc` |
| `client_faith_profiles` | `church_name_enc`, `pastor_name_enc`, `spiritual_director_enc`, `spiritual_concerns_enc`, `religious_restrictions_enc`, `faith_strengths_enc` |
| `client_legal` | `guardian_name_enc`, `guardian_phone_enc`, `guardian_email_enc`, `guardian_address_enc`, `court_case_number_enc`, `court_contact_enc`, `custody_notes_enc` |

Use `encryptJson` / `decryptJson` (already in `encrypt.js`) for columns that store JSON structures: `substance_use_screen_enc`, `chronic_conditions_enc`, `preferred_pharmacy_enc`, `address_enc` (in referring providers), `court_contact_enc`.

## Frontend Screen Design

### Navigation change

The existing `WorkspaceGrid` "Clients" tab opens `ClientModal` which renders `ClientForm`. For basic client creation this modal stays. A new route or drawer — `ClientDetailDrawer` or a full-page `/clients/:id` route — hosts the tabbed detail record. The `Edit` button in `WorkspaceGrid` should navigate to the detail screen rather than the existing edit modal.

Recommend a full-page route (`/clients/:id`) over a drawer, since the data volume across 7 tabs is too large for a modal or side-panel.

### React Component Tree

```
ClientDetailPage  (/clients/:id)
├── ClientDetailHeader          — name, status badge, quick stats (DOB age, next appt)
├── ClientDetailTabs            — tab bar (7 tabs, accessible role="tablist")
│   ├── Tab 1: DemographicsTab
│   │   ├── IdentitySection     — legal name, preferred name, pronouns, DOB, SSN-last4
│   │   ├── ContactInfoSection  — email, phones list, addresses list
│   │   └── PersonalSection     — gender identity, biological sex, race/ethnicity,
│   │                             marital status, language, employment
│   ├── Tab 2: InsuranceBillingTab
│   │   ├── InsuranceCard (primary)
│   │   ├── InsuranceCard (secondary)
│   │   └── ReferringProviderSection
│   ├── Tab 3: EmergencyContactsTab
│   │   └── ContactList         — repeating ContactCard components
│   ├── Tab 4: ClinicalHistoryTab
│   │   ├── MedicalHistorySection
│   │   ├── SubstanceUseSection
│   │   ├── MentalHealthHistorySection
│   │   └── RiskAssessmentSection
│   ├── Tab 5: DiagnosesMedicationsTab
│   │   ├── DiagnosisList
│   │   ├── MedicationList
│   │   └── AllergyList
│   ├── Tab 6: FaithProfileTab
│   └── Tab 7: LegalAdminTab
│       ├── GuardianSection     — shown conditionally when is_minor = true
│       ├── CourtOrderSection
│       └── AdminSection        — PCP, pharmacy, referral source detail
└── ClientDetailActions         — Save, Archive, Print Summary
```

Each tab is a self-contained component that manages its own `useState` and fires `PATCH` or `PUT` to its sub-resource endpoint on save. Tabs do not share form state — they load independently.

### Tab 1: Demographics & Contact

**Section: Legal Identity**

- Legal First Name (required)
- Legal Middle Name
- Legal Last Name (required)
- Preferred Name / Goes By
- Pronouns (text input or select: he/him, she/her, they/them, other)
- Date of Birth (date picker — renders age automatically)
- SSN Last 4 (masked input, 4 digits, `type="password"` with reveal toggle)
- Client Status (select: active, waitlist, inactive, discharged)

**Section: Demographics**

- Gender Identity (select + "other/specify" text field)
- Biological Sex (select: male, female, intersex, unknown)
- Race / Ethnicity (multi-select or text; follow OMB categories)
- Marital Status (select: single, married, separated, divorced, widowed, partnered, other)
- Language Preference (select of common languages + "other")
- Employment Status (select: employed full-time, employed part-time, self-employed, unemployed, student, retired, disability, other)
- Employer Name (shown when employment status is employed/self-employed)

**Section: Contact Information**

*Email*

- Email Address

*Phone Numbers* — repeating list

- Each row: Type (cell/home/work/fax) | Number | Preferred toggle | OK to text | OK to leave message
- "Add phone" button

*Addresses* — repeating list

- Each row: Type (primary/mailing/other) | Line 1 | Line 2 | City | State | Postal | Country | Preferred toggle
- "Add address" button

**UX notes:**

- "Legal Identity" fields save via `PATCH /v1/clients/:id`
- Phone and address lists save via their respective sub-resource endpoints
- Dirty state tracking per section; "Save Section" button at bottom of each section
- DOB field calculates and displays current age in parentheses, client-side only (never stored)

### Tab 2: Insurance & Billing

**Primary Insurance Card**

- Carrier Name
- Plan Name
- Member ID
- Group Number
- Subscriber Name (if different from client)
- Subscriber DOB
- Subscriber Relationship to Client (self / spouse / child / other)
- Authorization Number
- Authorized Visits (number input)
- Authorization Expiration Date
- Referral Number
- Copay Amount ($)
- Coverage Effective From / To dates
- Is Active toggle
- Verified On date + Verified By (staff name lookup)

**Secondary Insurance Card** — same fields, collapsible, labelled "Secondary Coverage"

**Referring Provider Section**

- Provider Full Name
- Practice / Organization
- NPI (plain text, 10-digit validation)
- Direct Phone
- Fax
- Address (line 1, city, state, zip)
- Referral Date
- Referral Notes

**UX notes:**

- Each insurance card has its own Save button; fires `POST` on first entry, `PATCH` thereafter
- Show a "No Insurance / Self-Pay" checkbox that clears and collapses the insurance form
- NPI field validates format (10 digits) client-side but does not hit NPI registry unless that integration is added later

### Tab 3: Emergency Contacts

**Contact List** — repeating `ContactCard` components, ordered by `is_primary DESC`

Each `ContactCard` contains:

- Full Name
- Relationship (select: spouse, parent, child, sibling, friend, guardian, attorney, case manager, other)
- Contact Type (emergency / guardian / other)
- Phone Number
- Email Address
- Is Primary Contact toggle
- Authorized to receive PHI toggle (`has_legal_auth`)
- Notes (free text)
- Remove button

"Add Emergency Contact" button at bottom creates a new blank card.

**UX notes:**

- Only one contact may have `is_primary = true` — toggling one primary deselects others (enforced client-side and API-side)
- If `is_minor = true` on the client, the first contact form defaults type to "guardian" and label reads "Legal Guardian"
- Each card saves independently via `PATCH /v1/clients/:id/contacts/:contactId`

### Tab 4: Clinical History

**Section: Medical History**

- Past Hospitalizations (Yes/No toggle) + detail text area (shown when Yes)
- Past Surgeries (Yes/No toggle) + detail text area
- Chronic Conditions (tag input — free-text tags for each condition)
- Primary Care Physician Name
- PCP Practice / Clinic
- PCP Phone
- Preferred Pharmacy (name + address)

**Section: Substance Use Screening**

- Alcohol use (frequency select: never / monthly or less / 2-4x/month / 2-3x/week / 4+x/week)
- Average drinks per session (number)
- Tobacco / nicotine (Yes/No + type + amount)
- Cannabis (Yes/No + frequency)
- Other substances (free text with type + frequency)
- Prior substance use treatment (Yes/No + detail)
- AUDIT-C score display (auto-calculated from alcohol questions)

**Section: Mental Health History**

- Prior mental health treatment (Yes/No toggle) + provider/dates detail text
- Prior psychiatric hospitalizations (Yes/No toggle) + details
- Prior diagnoses (free text / tag field)

**Section: Risk Assessment**

- Suicidal Ideation — Current (Yes/No)
- Suicidal Ideation — History (Yes/No)
- Has Plan (Yes/No) — shown when current SI = Yes
- Has Means / Access (Yes/No) — shown when current SI = Yes
- Has Intent (Yes/No)
- Homicidal Ideation — Current (Yes/No)
- Homicidal Ideation — History (Yes/No)
- Self-Harm History (Yes/No)
- Risk Narrative (text area)
- Last Assessment Date + Assessed By (read-only, set on save by server)

**UX notes:**

- The entire tab saves via `PUT /v1/clients/:id/clinical-history`
- Risk section fields render with a red left border when `si_current = true` or `hi_current = true`
- "Last assessed by [name] on [date]" banner at top of Risk section when record exists
- Consider a mandatory "Confirm Risk Review" checkbox before save when any risk flag is true

### Tab 5: Diagnoses & Medications

**Diagnoses List**

Each `DiagnosisRow` contains:

- Code System (DSM-5 / ICD-10 / ICD-11 — select)
- Code (text input with search/autocomplete against a bundled code list, future scope)
- Description
- Onset Date
- Status (active / resolved / rule out / deferred)
- Is Primary Diagnosis toggle
- Notes
- Remove button

"Add Diagnosis" button.

**Medications List**

Each `MedicationRow` contains:

- Medication Name
- Dose (e.g. "50 mg")
- Frequency (e.g. "once daily at bedtime")
- Route (oral / IM / topical / other)
- Prescribing Provider
- Start Date
- End Date (optional — leave blank if ongoing)
- Is Active toggle
- Reason / Indication
- Notes
- Remove button

"Add Medication" button.

**Allergies List**

Each `AllergyRow` contains:

- Substance
- Reaction
- Severity (mild / moderate / severe / life-threatening / unknown)
- Allergy Type (drug / food / environmental / other)
- Onset Date
- Is Active toggle
- Remove button

"No Known Allergies" checkbox — clears list and records explicitly.

**UX notes:**

- Each list has its own Save / Remove per row
- Diagnoses list shows primary diagnosis first, tagged with "Primary" badge
- Active medications shown first; inactive/discontinued collapsed under a "Show Discontinued" expander

### Tab 6: Faith Profile

- Denomination (text input with common suggestions: Evangelical, Baptist, Catholic, Methodist, Presbyterian, Pentecostal, Non-denominational, Orthodox, Jewish, Muslim, Other, None)
- Church / Congregation Name
- Pastor / Priest Name
- Spiritual Director Name
- Faith Integration Level (select: None — client prefers secular approach / Open — willing to incorporate faith / Preferred — wants faith-informed counseling / Required — faith integration is essential)
- Spiritual Concerns (text area — what spiritual issues or questions bring them to counseling)
- Religious Restrictions (text area — fasting practices, Sabbath observance, dietary requirements, sacred time constraints)
- Spiritual Strengths (text area — what aspects of faith are a source of support)
- Faith Background note (the existing `faith_background` plaintext field on `clients` — keep but surface here as "General Faith Label")

**UX notes:**

- Denomination field uses a `<datalist>` with common options but accepts free text
- Integration Level selector is the most clinically important field — consider a brief tooltip explaining each level for counselors unfamiliar with the scale
- Saves via `PUT /v1/clients/:id/faith-profile`

### Tab 7: Legal & Administrative

**Guardian Section** — conditionally shown when `clients.is_minor = true`; always accessible via "Show Guardian Info" toggle for cases with limited guardianship on adult clients

- Guardian Full Name
- Relationship (select: parent, legal guardian, power of attorney, other)
- Guardian Phone
- Guardian Email
- Guardian Address (line 1, city, state, zip)

**Court Order Section**

- Court Ordered flag (Yes/No toggle — mirrors `clients.court_ordered`)
- Case Number
- Court Expiration Date
- Court Contact (officer name, attorney name, contact phone — stored as JSON blob)
- Custody Notes

**Administrative Section**

- Referral Source Detail (free text — "Referred by Dr. Smith at First Baptist")
- Primary Care Physician Name (mirrors / syncs with Clinical History Tab 4 PCP fields)
- PCP Practice
- PCP Phone
- Preferred Pharmacy (mirrors / syncs with Clinical History Tab 4)

**UX notes:**

- PCP and Pharmacy fields on Tab 7 are synced with the same fields on Tab 4 (Clinical History); they write to the same `client_clinical_history` columns. Display a note "Also editable on Clinical History tab."
- Court Order section collapses when `court_ordered = false`
- Saves legal record via `PUT /v1/clients/:id/legal`; administrative fields (PCP, pharmacy, referral source detail) patch their respective tables

## Implementation Steps

The implementation is organised into 5 phases. Each phase is independently deployable.

### Phase 1: Database Migration (Week 1)

1. Write migration script `apps/api/src/db/migrations/002_client_demographics.sql` with the `ALTER TABLE clients ADD COLUMN` statements.
2. Write `003_client_addresses.sql`, `004_client_phones.sql`, `005_client_contacts.sql` — the most immediately useful tables.
3. Write `006_client_insurance.sql`, `007_client_referring_providers.sql`.
4. Write `008_client_diagnoses.sql`, `009_client_medications.sql`, `010_client_allergies.sql`.
5. Write `011_client_clinical_history.sql`, `012_client_faith_profiles.sql`, `013_client_legal.sql`.
6. Add a `apps/api/src/db/migrate.js` step counter so migrations run in order and skip already-applied ones (if not already present). Record applied migrations in a `schema_migrations` table.
7. Test each migration on a local MySQL 8 instance with existing data. Verify existing rows get `NULL` for new columns (no data loss).

### Phase 2: API — Core Demographics + Sub-resource Scaffolding (Week 2)

1. Create `apps/api/src/db/queries/clientDemographics.js` — expand `rowToClient`, `updateClient` in the existing `clients.js` to handle new columns (or add the new fields directly to the existing file).
2. Create `clientAddresses.js`, `clientPhones.js`, `clientContacts.js` — implement `list`, `get`, `create`, `update`, `delete` functions with full encrypt/decrypt.
3. In `apps/api/src/index.js`, add `parseClientSubresourcePath` helper. Add routing branches for `/v1/clients/:id/addresses`, `/v1/clients/:id/phones`, `/v1/clients/:id/contacts`.
4. Expand `GET /v1/clients/:id` to accept `?expand=` query param and embed sub-resources.
5. Expand `PATCH /v1/clients/:id` to accept all new demographic fields.
6. Write integration tests in `tests/e2e/` for each new endpoint following patterns in `helpers.mjs`.

### Phase 3: API — Clinical + Insurance Endpoints (Week 3)

1. Create `clientInsurance.js`, `clientReferringProviders.js` queries.
2. Create `clientDiagnoses.js`, `clientMedications.js`, `clientAllergies.js` queries.
3. Create `clientClinicalHistory.js`, `clientFaithProfiles.js`, `clientLegal.js` queries (singleton upsert pattern).
4. Wire all new handlers into `index.js` routing.
5. Add audit events for all new mutations: `client.insurance.create`, `client.diagnosis.create`, `client.risk.update`, etc.
6. Validate all risk-flag fields server-side: boolean coercion, required field checks.
7. Write tests.

### Phase 4: Frontend — Client Detail Page Scaffold (Week 4)

1. Add a client detail route to `apps/web/src/` — either using a React Router `<Route path="/clients/:id" element={<ClientDetailPage />}>` or a URL-state-driven panel if no router is currently installed. Check `apps/web/src/` for existing router setup.
2. Create `apps/web/src/components/ClientDetail/ClientDetailPage.jsx`.
3. Create `apps/web/src/components/ClientDetail/ClientDetailHeader.jsx`.
4. Create `apps/web/src/components/ClientDetail/ClientDetailTabs.jsx` — tab bar only, each tab renders a placeholder.
5. Update `WorkspaceGrid.jsx` — change the "Edit" button to navigate to `/clients/:id` instead of opening `ClientModal`.
6. Create `apps/web/src/lib/clientApi.js` — fetch helpers for all client sub-resource endpoints, wrapping `fetch` with `csrfHeaders()` and error normalisation. One function per endpoint: `fetchClientAddresses(clientId)`, `createClientPhone(clientId, data)`, etc.

### Phase 5: Frontend — Tab Implementations (Weeks 5–7)

Implement tabs in this priority order (most clinically critical first):

1. **Tab 1 — Demographics & Contact**
   - `DemographicsTab.jsx`
   - `IdentitySection.jsx`, `ContactInfoSection.jsx`, `PersonalSection.jsx`
   - `PhoneList.jsx` + `PhoneRow.jsx`
   - `AddressList.jsx` + `AddressRow.jsx`

2. **Tab 3 — Emergency Contacts**
   - `EmergencyContactsTab.jsx`
   - `ContactList.jsx` + `ContactCard.jsx`

3. **Tab 4 — Clinical History**
   - `ClinicalHistoryTab.jsx`
   - `MedicalHistorySection.jsx`
   - `SubstanceUseSection.jsx`
   - `MentalHealthHistorySection.jsx`
   - `RiskAssessmentSection.jsx` — include visual risk indicators

4. **Tab 5 — Diagnoses & Medications**
   - `DiagnosesMedicationsTab.jsx`
   - `DiagnosisList.jsx` + `DiagnosisRow.jsx`
   - `MedicationList.jsx` + `MedicationRow.jsx`
   - `AllergyList.jsx` + `AllergyRow.jsx`

5. **Tab 2 — Insurance & Billing**
   - `InsuranceBillingTab.jsx`
   - `InsuranceCard.jsx` (used for both primary and secondary)
   - `ReferringProviderSection.jsx`

6. **Tab 6 — Faith Profile**
   - `FaithProfileTab.jsx`

7. **Tab 7 — Legal & Administrative**
   - `LegalAdminTab.jsx`
   - `GuardianSection.jsx`
   - `CourtOrderSection.jsx`
   - `AdminSection.jsx`

### Phase 6: Hardening (Week 8)

1. Add server-side validation for all new endpoints: required fields, enum value checks, date format validation, SSN-last4 must be 4 digits.
2. Ensure all new mutations emit audit events. Verify `audit_events` table has no PHI in any column (action names like `client.insurance.update` are fine; do not log field values).
3. Add the `si_current = 1` compliance watch query to the Compliance Watch panel in `WorkspaceGrid`. This surfaces any client with active suicidal ideation to the logged-in counselor.
4. Confirm the `?expand=` endpoint never leaks cross-tenant data — the FK to `clients` combined with `tenant_id` on every child table prevents this, but add explicit tenant filter to every sub-resource query as a defence-in-depth measure.
5. Regression test PHI encryption end-to-end: write a client with all PHI fields populated, query the raw MySQL row (bypassing the API), confirm all PHI columns contain ciphertext only.
6. Load test `GET /v1/clients/:id?expand=all` to confirm the parallel sub-resource queries do not exhaust the connection pool.

## PHI Encryption Reference

| Encryption function | When to use |
|---|---|
| `encrypt(string)` | Single string values: names, phone numbers, codes, short text |
| `decrypt(stored)` | Read back any `encrypt()` value |
| `encryptJson(object)` | Structured data: address JSON objects, substance use screening answers, court contact objects |
| `decryptJson(stored)` | Read back any `encryptJson()` value |

**Rule of thumb for new fields:** If the field could uniquely identify or meaningfully describe a specific patient when combined with their name, encrypt it. If it is a category label drawn from a closed enumeration (marital status, race category, language code), store it plaintext to preserve query/filter capability.

**Null handling:** Both `encrypt()` and `decrypt()` already return `null` when passed `null` or `undefined`. No null-guarding needed in the query files — pass raw values directly.

**Key rotation:** When `DB_ENCRYPTION_KEY` must be rotated, all encrypted columns across all 12 tables listed above must be re-encrypted. Write a key rotation script that reads each row with the old key and re-encrypts with the new key in a transaction. Do not store both keys simultaneously in memory.

### Critical Files for Implementation

- `/Users/rjulia/FaithCounseling/apps/api/src/db/schema.sql` — All new `CREATE TABLE` and `ALTER TABLE` migration SQL goes here as additions; existing table definitions are the reference pattern for column naming, index naming, FK naming, and charset declarations.
- `/Users/rjulia/FaithCounseling/apps/api/src/db/queries/clients.js` — The canonical pattern for all 12 new query files: row mapper structure, encrypt/decrypt call sites, partial-update `setClauses` builder, and export naming conventions.
- `/Users/rjulia/FaithCounseling/apps/api/src/index.js` — The routing hub where all new sub-resource endpoint handlers must be registered; the `handleClientById` function (starting at line 1371) is the direct extension point for `PATCH /v1/clients/:id` demographic expansion.
- `/Users/rjulia/FaithCounseling/apps/api/src/lib/encrypt.js` — The four encryption functions (`encrypt`, `decrypt`, `encryptJson`, `decryptJson`) are the complete PHI boundary; every new query file imports from here and uses these exclusively.
- `/Users/rjulia/FaithCounseling/apps/web/src/components/ClientForm.jsx` — The existing simple form is the baseline React pattern (useState per field, `csrfHeaders()`, fetch with error handling) that all new tab section components should follow and extend.
