# TIME-TRACKING-COUNSELORS

**Status:** In progress — phases 1 and 2 delivered; phase 3 delivered on `feat/time-tracking-phase-3` (pending merge to `main`)
**Prepared:** April 17, 2026
**Target Start:** April 20, 2026
**Initiative:** Counselor Clinical Hour & Licensure Tracking

---

## Purpose

Counselors — particularly interns and those pursuing advanced licensure — require rigorous
documentation of their "seat time." Secular tools like Time2Track are often disconnected
from the EHR, leading to double-entry and version drift between what the EHR records and
what the licensure board receives.

This feature integrates time tracking directly into the ChurchCore Care workflow:
- Direct (client-facing) hours are auto-synced from completed appointments.
- Indirect hours (supervision, prep, spiritual direction, CE) are logged manually.
- Progress toward state/board licensure goals is visualized on the counselor profile.
- Supervisors verify intern hours before they count toward licensure totals.
- Exports are PHI-sanitized and formatted for standard state board submission.

**Competitive position:** Time2Track, Theranest, and SimplePractice all treat time
tracking as a disconnected or non-existent feature. This is a meaningful differentiator
for practices that supervise interns — which is a large segment of Christian counseling
programs (Liberty University, Regent University, Wheaton College graduates).

---

## Dependencies

- **Phase 3 of `PLANS/TELEHEALTH-AND-DIFFERENTIATION.md`** — Supervision workflow
  (supervisor/intern relationship table, cosigning). Phase 2 of this plan (supervisor
  verification) requires that the `supervisor_assignments` table and intern role exist.
- **`apps/api/src/lib/encrypt.js`** — All description fields must use this module.
- **`PLANS/FULL-SECURITY-AND-AUDITING.md`** — Audit event semantics.

Phase 1 (schema + API) has no external dependencies and can start independently.

---

## Phase 1 — Core Schema and API

**Goal:** Create a robust backend to store direct (client-facing) and indirect
(administrative) hours.

### 1.1 — Database Schema

Create a numbered migration file in `apps/api/src/db/migrations/` following the existing
convention.

#### `time_entries` table

```sql
CREATE TABLE time_entries (
  id            CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36)      NOT NULL,
  appointment_id CHAR(36)     NULL,                  -- NULL for indirect work
  category      ENUM(
                  'direct_clinical',
                  'indirect_admin',
                  'supervision_individual',
                  'supervision_group',
                  'ce_spiritual',
                  'ministry_coordination'
                )             NOT NULL,
  start_time    DATETIME      NOT NULL,
  end_time      DATETIME      NOT NULL,
  duration_minutes INT        NOT NULL
                GENERATED ALWAYS AS
                  (TIMESTAMPDIFF(MINUTE, start_time, end_time)) STORED,
  is_locked     BOOLEAN       NOT NULL DEFAULT FALSE,
  description   TEXT          NULL,                  -- AES-256-GCM encrypted
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_te_user        FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_te_appointment FOREIGN KEY (appointment_id)
    REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_te_user_category   (user_id, category),
  INDEX idx_te_user_start      (user_id, start_time)
);
```

#### `licensure_goals` table

Tracks configured progress targets per counselor per licensure pathway.

```sql
CREATE TABLE licensure_goals (
  id                  CHAR(36)   NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id             CHAR(36)   NOT NULL,
  label               VARCHAR(255) NOT NULL,          -- e.g. "LPC — Total Hours"
  category_filter     VARCHAR(255) NULL,              -- comma-separated categories, NULL = all
  target_minutes      INT        NOT NULL,            -- e.g. 180000 = 3,000 hours
  effective_from      DATE       NOT NULL,
  effective_to        DATE       NULL,                -- NULL = open-ended
  created_at          DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lg_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
```

> **Encryption note:** `time_entries.description` must be encrypted with
> `apps/api/src/lib/encrypt.js` before insert and decrypted on read. No other field in
> these tables contains PHI.

### 1.2 — API Endpoints

Implement in `apps/api/src/routes/time-tracking.js` and register in
`apps/api/src/index.js`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/time-entries` | List entries. Filter by `category`, `date_from`, `date_to`. Counselors see their own; supervisors see their interns'. |
| `POST` | `/api/v1/time-entries` | Create a manual entry. Encrypts `description`. |
| `PATCH` | `/api/v1/time-entries/:id` | Update. Returns `403` if `is_locked = true`. |
| `DELETE` | `/api/v1/time-entries/:id` | Soft delete. Returns `403` if `is_locked = true`. |
| `POST` | `/api/v1/appointments/:id/sync-time` | Auto-create a `direct_clinical` entry from appointment `start_time`/`end_time`. Idempotent — no-ops if an entry already exists for this appointment. |
| `GET` | `/api/v1/time-entries/summary` | Aggregate minutes by category for the requesting user within a date range. Used by the progress bars. |
| `GET` | `/api/v1/licensure-goals` | List goals for the requesting user. |
| `POST` | `/api/v1/licensure-goals` | Create a goal. Practice Manager / Supervisor only. |

**Authorization rules:**
- A counselor can only read/write their own entries.
- A supervisor can read (not write) entries belonging to their assigned interns.
- Practice Manager can read all entries within their practice.
- No cross-practice reads under any role.

**Audit events (write to audit ledger):**

| Event | Trigger |
|---|---|
| `time_entry.created` | `POST /api/v1/time-entries` or sync |
| `time_entry.updated` | `PATCH /api/v1/time-entries/:id` |
| `time_entry.deleted` | `DELETE /api/v1/time-entries/:id` |
| `time_entry.synced` | `POST /api/v1/appointments/:id/sync-time` |

Payload: `{ entry_id, user_id, category, duration_minutes }` — never include description
or client identifiers.

### Phase 1 Acceptance Criteria

- [x] Migration runs cleanly against the existing schema
- [x] All CRUD endpoints return correct data for the requesting user
- [x] `PATCH` and `DELETE` return `403` on locked entries
- [x] Sync endpoint is idempotent
- [x] `description` is stored encrypted and decrypted on read
- [x] Audit events are written for create, update, delete, and sync

---

## Phase 2 — UI Integration (Mantine)

**Goal:** Provide a seamless logging experience within the existing dashboard.

### 2.1 — The "Time Ledger" Component

Build in `apps/web/src/components/TimeTracking/`:

**Quick-Log Widget**
A dashboard card (or floating action button) for one-click logging of common indirect
tasks. Pre-configured options:

- 15 min — Session Prep
- 30 min — Documentation / Notes
- 60 min — Supervision (individual)
- 30 min — CE / Training
- Custom duration

Renders as a `Mantine ActionIcon` group or compact `Menu` to keep it unobtrusive.

**The Ledger Table**
A `Mantine Table` showing recent time entries:

- Columns: Date, Category (color-coded badge), Duration, Description (truncated,
  expandable), Locked (icon), Actions (edit/delete when unlocked)
- Category color coding:
  - `direct_clinical` — blue
  - `supervision_individual` / `supervision_group` — violet
  - `indirect_admin` — gray
  - `ce_spiritual` — teal
  - `ministry_coordination` — orange
- Paginated, sortable by date.

**Auto-Sync Prompt**
When a counselor locks a session note (existing clinical chart workflow), show a
`Mantine Notification` or `Modal` prompt:

> "Log X minutes of direct clinical time for this session?"
> [Log Time] [Skip]

Clicking "Log Time" calls `POST /api/v1/appointments/:id/sync-time`. "Skip" dismisses
without logging.

### 2.2 — Visual Progress Tracking

On the Counselor Profile page, add a "Licensure Progress" section using `Mantine
RingProgress` or `Progress` bars:

- One bar/ring per `licensure_goal` record for the counselor.
- Label: goal label + `X hrs / Y hrs (Z%)`.
- Color: green above 75%, yellow 50–75%, red below 50%.
- Tapping a bar opens the Time Ledger filtered to that goal's categories.

### Phase 2 Acceptance Criteria

- [x] Quick-Log widget is accessible from the main dashboard without navigating away
- [x] Ledger table loads, paginates, and shows color-coded categories
- [x] Session note lock prompts the counselor to sync time
- [x] Progress bars are visible on the Counselor Profile
- [x] All UI strings have i18n keys in `packages/i18n/`

---

## Phase 3 — Supervision & Intern Workflow

**Goal:** Enable supervisors to verify intern time entries before they count toward
licensure goals. Extends the supervisor/intern relationship from Phase 3 of
`PLANS/TELEHEALTH-AND-DIFFERENTIATION.md`.

> **Dependency:** The `supervisor_assignments` table and `counselor_intern` role must
> exist before this phase can be executed.

### 3.1 — Supervision Verification

Add a `verified_by` and `verified_at` column to `time_entries`:

```sql
ALTER TABLE time_entries
  ADD COLUMN verified_by  CHAR(36) NULL,
  ADD COLUMN verified_at  DATETIME NULL,
  ADD CONSTRAINT fk_te_verifier
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
```

Verification flow:
1. Intern logs a `supervision_individual` or `supervision_group` entry.
2. The entry appears in the supervisor's "Pending Verification" queue.
3. Supervisor reviews and clicks "Verify" — sets `verified_by`, `verified_at`, and
   `is_locked = true`.
4. Verified entries count toward the intern's licensure goal total; unverified entries
   are shown with a distinct "Pending" badge.

Add endpoint: `POST /api/v1/time-entries/:id/verify` — supervisor only; sets
`verified_by`/`verified_at`/`is_locked`.

**Audit event:** `time_entry.verified` — payload: `{ entry_id, intern_id, supervisor_id,
duration_minutes, category }`.

### 3.2 — Reporting & Export

**Export endpoint:** `GET /api/v1/time-entries/export?format=csv&date_from=&date_to=`

Export format columns (standard state board layout):

| Column | Source | PHI handling |
|---|---|---|
| Date | `start_time` (date only) | No PHI |
| Category | `category` (human-readable label) | No PHI |
| Duration (minutes) | `duration_minutes` | No PHI |
| Duration (hours) | Calculated | No PHI |
| Client Reference | `appointment_id` hashed to 6-char internal ID | Never full name |
| Verified By | Supervisor full name (from `users`) | Supervisor name only |
| Verified Date | `verified_at` | No PHI |
| Supervisor Signature | `"[Pending]"` or `"[Verified — {Name}]"` | Supervisor name only |

**Privacy guard:** Client names, DOB, diagnosis, and any PHI are never included in the
export. The "Client Reference" column uses a deterministic 6-character hash of the
`appointment_id` — traceable internally but not meaningful externally.

**PDF export (v2):** Defer to a later iteration. CSV covers the majority of state board
requirements for v1.

### Phase 3 Acceptance Criteria

- [x] Supervisor sees a "Pending Verification" list for their interns' supervision hours
- [x] Verifying an entry locks it and writes the audit event
- [x] Verified hours are visually distinct from unverified in the intern's ledger
- [x] CSV export downloads correctly and contains no PHI beyond supervisor name
- [x] Export is only available to the owning counselor and their supervisor

---

## Security and Compliance Notes

- `time_entries.description` must be encrypted with `apps/api/src/lib/encrypt.js`
  before insert; decrypted on read. This is the only PHI-adjacent field in this feature.
- JWT authorization must be checked on every endpoint — no cross-user reads without
  explicit supervisor assignment.
- Exports must strip all PHI. The PHI guard in the export function is not optional — it
  is a hard requirement, not a best-effort.
- OTEL telemetry may track aggregate volume (e.g., `faith.time_entries.logged_count` by
  category) but must never include description text, user names, appointment IDs, or
  duration breakdowns that could identify an individual.
- Audit events follow canonical semantics (`success`, `failure`, `denied`, `error`) per
  `PLANS/FULL-SECURITY-AND-AUDITING.md`.

---

## Implementation Priority

| Task | Priority | Dependency | Est. Effort |
|---|---|---|---|
| Schema / Migration | P0 | None | 4 hours |
| API CRUD | P0 | Schema | 1 day |
| Sync with Appointments | P1 | Telehealth Phase 1 | 1 day |
| Mantine UI Ledger | P1 | API | 2 days |
| Supervisor Verification | P2 | Telehealth Phase 3 (supervisor_assignments) | 2 days |
| Export (CSV) | P2 | Supervisor Verification | 1 day |

---

## Acceptance Criteria (Full Feature)

- [x] Counselor can manually log indirect time (e.g., 30 min for prayer/prep)
- [x] Closing an appointment automatically prompts to log direct clinical time
- [x] Interns see a progress bar toward their configured licensure goal
- [x] Supervisors see a "Pending Verification" list for their interns' hours
- [x] Exported CSV matches standard state board format, sanitized of PHI
- [x] All audit events are written per canonical semantics
- [x] No PHI appears in telemetry

---

## Related Plans

- [`PLANS/TELEHEALTH-AND-DIFFERENTIATION.md`](TELEHEALTH-AND-DIFFERENTIATION.md) —
  Phase 3 defines the `supervisor_assignments` table and intern role required by Phase 3
  of this plan
- [`PLANS/FULL-SECURITY-AND-AUDITING.md`](FULL-SECURITY-AND-AUDITING.md) — canonical
  audit event semantics
- [`docs/market-analysis-faithcounseling.md`](../docs/market-analysis-faithcounseling.md) —
  competitive context; Time2Track identified as a disconnected secular alternative
