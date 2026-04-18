# Advanced Clinical Note Templates
**Status:** Implementing
**Prepared:** April 18, 2026
**Initiative:** Clinical Documentation Efficiency & Standardization

---

## 1. Objective

Enable counselors to select from a library of industry-standard and faith-integrated note templates. The system reduces "blank page syndrome," ensures clinical compliance, and automatically surfaces faith-based fields (Scripture, Spiritual Goals) when a client's `faith_integration_preference` is set to `integrated`.

---

## 2. Architecture Decisions

### 2.1 — System vs. Tenant Templates

The `clinical_note_templates` table is **system-level** (no `tenant_id`). Built-in templates are seeded once in the migration and are read-only via the API. Practices that need custom templates can continue using `faith_note_templates` (tenant-scoped) via the existing Faith Features API.

This separation keeps built-in templates stable across tenants while preserving the ability to customize at the practice level in a future phase.

### 2.2 — Schema

**New table: `clinical_note_templates`**
```sql
id           CHAR(36)     PK
name         VARCHAR(128) -- "SOAP Note — Faith Integrated"
slug         VARCHAR(64)  -- "soap-faith" (unique)
category     VARCHAR(32)  -- standard | faith_integrated | specialty | crisis
structure_json JSON       -- array of { key, label, placeholder, type, required, faithOnly }
is_default   TINYINT(1)
created_at   DATETIME
```

**New columns on `progress_notes`:**
- `template_id VARCHAR(64) NULL` — which template was applied
- `template_sections_enc TEXT NULL` — AES-256-GCM encrypted JSON of `{ sectionKey: content }`

### 2.3 — Encryption

`template_sections` contains clinical observations and is PHI. It is encrypted with the same `encrypt()` / `decrypt()` helpers used for `summary_enc` and `interventions_enc`.

The structured sections are assembled into a plain-text representation at read time for in-memory display; the canonical clinical record is the encrypted blob.

### 2.4 — Audit

`clinical_note.template_applied` is emitted to the audit ledger on every note creation that includes a `template_id`. Payload: `{ template_id, template_slug, note_id, client_id }`.

---

## 3. Template Library

### 3.1 — Standard Clinical Formats

| Slug | Name | Sections |
|------|------|----------|
| `soap` | SOAP Note | Subjective, Objective, Assessment, Plan |
| `dap` | DAP Note | Data, Assessment, Plan |
| `birp` | BIRP Note | Behavior, Intervention, Response, Plan |
| `girp` | GIRP Note | Goal, Intervention, Response, Plan |
| `stop` | STOP Note | Summary, Treatment, Objective, Plan |
| `mint` | MINT Note | Motivation, Intervention, Next Steps, Theme |

### 3.2 — Faith-Integrated Formats

| Slug | Name | Extends |
|------|------|---------|
| `soap-faith` | SOAP Note — Faith Integrated | SOAP + Spiritual Subjective + Scripture Applied |
| `dap-faith` | DAP Note — Faith Integrated | DAP + Theological Assessment |
| `spiritual-formation` | Spiritual Formation Note | Prayer Life, Scripture Engagement, Spiritual Barriers, Pastoral Notes |

### 3.3 — Specialty / Crisis Formats

| Slug | Name | Key Fields |
|------|------|-----------|
| `emdr` | EMDR Session Note | Target Image, NC, PC, SUDS Score, VOC Score, Phase Reached |
| `crisis-safety` | Crisis / Safety Note | SI Assessment, HI Assessment, Safety Plan Status, Hospitalization Triggers *(SI + HI required before lock)* |
| `group-therapy` | Group Therapy Note | Group Dynamics, Individual Participation, Peer Interactions, Group Theme |

---

## 4. API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/note-templates` | List all system note templates (auth required, no tenant scoping) |
| `GET` | `/v1/note-templates/:id` | Get a single template by id or slug |

Templates are read-only via API. No create/update/delete for built-in templates.

---

## 5. Frontend

### 5.1 — TemplatePicker component (`TimeTracking/` → `NoteTemplates/TemplatePicker.jsx`)

- Mantine `Select` grouped by category
- Fetches `/api/v1/note-templates` once on mount; cached in component state
- Auto-suggests faith-integrated templates when `clientFaithPreference === 'integrated'`
- "Clear template" option resets to free-text mode

### 5.2 — SessionNotesTab composer changes

- Template picker appears at the top of the New Note composer
- Selecting a template replaces the single Summary textarea with one labeled `Textarea` per section
- Warning modal if draft already has text: *"Applying a template will overwrite your current draft. Continue?"*
- Sections are assembled into a formatted `summary` string on submit for backwards-compatible storage
- `template_id` and per-section values sent in the POST body

### 5.3 — Crisis validation

When `template_id` corresponds to `crisis-safety`, the "Sign & Lock" button is disabled until both `si_assessment` and `hi_assessment` fields contain text.

---

## 6. Implementation Checklist

- [x] `PLANS/advanced-notes.md` plan file created
- [ ] `clinical_note_templates` table migration + 12 built-in template seeds
- [ ] `progress_notes` columns: `template_id`, `template_sections_enc`
- [ ] `apps/api/src/db/queries/noteTemplates.js` — `listNoteTemplates`, `getNoteTemplate`
- [ ] `createProgressNote` / `updateProgressNote` handle new fields
- [ ] `GET /v1/note-templates` and `GET /v1/note-templates/:slug` routes
- [ ] `TemplatePicker.jsx` component
- [ ] `SessionNotesTab` composer wired with template picker and structured fields
- [ ] Crisis note lock validation
- [ ] i18n keys for template UI
- [ ] Audit event `clinical_note.template_applied`

---

## 7. Acceptance Criteria

- [ ] Counselor can switch between SOAP, DAP, and Faith-Integrated templates instantly in the note composer
- [ ] Structured section fields render for each template section with correct labels and placeholders
- [ ] Faith template sections (Scripture Applied, Spiritual Subjective) appear only when a faith-integrated template is chosen
- [ ] Selecting a template over existing draft text shows a confirmation warning
- [ ] Crisis note template disables Sign & Lock until SI/HI fields are filled
- [ ] `clinical_note.template_applied` appears in audit ledger when a templated note is created
- [ ] Template sections content is encrypted at rest (`template_sections_enc`)
- [ ] Draft vs. Locked state is unaffected — template application is a draft-stage action

---

## 8. Security Considerations

- Template `structure_json` is structural metadata — not PHI, not encrypted
- `template_sections` content (clinical observations) is PHI — encrypted via AES-256-GCM
- `template_id` on `progress_notes` is a reference ID — no clinical data, not encrypted
- Audit event does not emit section content — only template slug + note ID
