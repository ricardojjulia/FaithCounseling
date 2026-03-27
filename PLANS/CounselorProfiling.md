# Counselor Profiling System

**Status:** Delivered in the repository. Current repository release is `v1.6.0`; this document remains as the implementation record for the counselor profiling feature set.

## Purpose

This plan defines the implementation scope for a comprehensive counselor profiling system for FaithCounseling. Christian counseling practices require detailed records of their counseling personnel beyond basic account information — state licenses, certifications and continuing education, clinical specialties and therapeutic modalities, faith integration profiles, and employment and HR details.

This plan adds that data layer end-to-end: new database tables, query modules, API routes, and a full `CounselorDetailPage` with tabs mirroring the existing `ClientDetailPage` pattern.

## Scope

Included in this plan:

- Multiple state licenses per counselor with PHI-encrypted license numbers
- Certifications and CEU tracking with separate visual sections
- Clinical specialties, therapeutic modalities, and age groups served
- Faith integration profile with ordination, professional memberships, and integration preferences
- Employment and HR record with NPI, malpractice insurance, and employment status
- Read-only availability view using the existing scheduling data
- Full counselor detail page with seven tabs
- RBAC: counselors can edit their own specialty and faith profiles; admins control licenses, certifications, and employment
- "Counselors" navigation item in the sidebar (admin-only visibility)
- "View Profile" button in the User Maintenance staff list
- Domain enums for all new classification fields

Explicitly deferred from this plan:

- Availability editing (managed through Scheduling)
- Supervision relationship management UI
- Supervisee assignment workflows
- Credentialing workflow with expiry notifications
- CEU reporting or export
- Counselor-facing portal

## Security Principles

The implementation preserves the following rules:

- PHI fields use field-level AES-256-GCM encryption (`_enc` suffix columns)
- Encrypted fields: license number, cert number, cert notes, NPI number, malpractice policy, direct phone, theological approach, faith credentials, spiritual gifts
- Self-edit checks require a one-row DB lookup: `SELECT staff_member_id FROM staff_accounts WHERE id = ? AND tenant_id = ?` because `resolveSession()` returns `staff_account_id`, not `staff_member_id`
- Tenant scoping enforced on every query
- Admin-only routes return 403 for non-admin callers without leaking data
- All mutations emit audit events

## RBAC Rules

| Route | GET | POST | PUT/PATCH | DELETE |
|---|---|---|---|---|
| `/licenses` | admin or self | admin only | — | — |
| `/licenses/:id` | admin or self | — | admin only | admin only |
| `/certifications` | admin or self | admin only | — | — |
| `/certifications/:id` | admin or self | — | admin only | admin only |
| `/specialty-profile` | admin or self | — | self or admin | — |
| `/employment` | admin only | — | admin only | — |
| `/faith-profile` | admin or self | — | self or admin | — |

## Database Schema

Five new tables appended to `apps/api/src/db/schema.sql`:

- `staff_licenses` — multi-row, one per license per counselor
- `staff_certifications` — multi-row, one per certification or CEU entry
- `staff_specialty_profiles` — singleton per counselor (UNIQUE on staff_id)
- `staff_employment` — singleton per counselor (UNIQUE on staff_id)
- `staff_faith_profiles` — singleton per counselor (UNIQUE on staff_id)

All tables use `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` and foreign keys referencing `staff_members(id)`. Singleton tables use `INSERT ... ON DUPLICATE KEY UPDATE` for upserts.

## Implementation Steps

### Step 1 — Schema

Append five `CREATE TABLE IF NOT EXISTS` blocks to `apps/api/src/db/schema.sql`. Migration is idempotent — safe to re-run via `node apps/api/src/db/migrate.js`.

### Step 2 — Domain Enums

Add eight new `Object.freeze([...])` exported arrays to `packages/domain/src/index.js`:
`counselingSpecialties`, `therapeuticModalities`, `ageGroupsServed`, `employmentTypes`, `employmentStatuses`, `licenseStatuses`, `faithTraditions`, `integrationStyles`

### Step 3 — DB Query Modules

Five new files under `apps/api/src/db/queries/`:

- `staffLicenses.js` — CRUD: list, getById, create, update, delete
- `staffCertifications.js` — CRUD: list, getById, create, update, delete
- `staffSpecialtyProfiles.js` — get + upsert (singleton)
- `staffEmployment.js` — get + upsert (singleton)
- `staffFaithProfiles.js` — get + upsert (singleton)

Each module follows the existing pattern: imports `pool` and `{ encrypt, decrypt }`, defines a `rowTo*` mapper that decrypts `_enc` fields and parses JSON columns, exports named async functions.

### Step 4 — API Routes

Seven new route dispatch blocks in `apps/api/src/index.js` inserted before the existing `/v1/staff/:id` catch-all:

```
/v1/staff/:id/licenses/:licenseId
/v1/staff/:id/licenses
/v1/staff/:id/certifications/:certId
/v1/staff/:id/certifications
/v1/staff/:id/specialty-profile
/v1/staff/:id/employment
/v1/staff/:id/faith-profile
```

Also adds:
- `resolveCallerStaffMemberId(session)` — async helper for self-edit check
- `isAdminRole(role)` — boolean helper
- 7 handler functions: `handleStaffLicenses`, `handleStaffLicenseById`, `handleStaffCertifications`, `handleStaffCertificationById`, `handleStaffSpecialtyProfile`, `handleStaffEmployment`, `handleStaffFaithProfile`

### Step 5 — Client API

Sixteen new exported functions in `apps/web/src/lib/clientApi.js`:
`fetchCounselor`, `fetchStaffAvailability`, and four functions each for licenses, certifications, and three upsert-pair functions for specialty profile, employment, and faith profile.

### Step 6 — Web UI

New directory: `apps/web/src/components/CounselorDetail/`

Files:
- `sharedStyles.js` — shared style constants (inputStyle, labelStyle, etc.)
- `CounselorDetailPage.jsx` — main page component, mirrors ClientDetailPage
- `CounselorDetailHeader.jsx` — name, role badge (color-coded), license type, back button
- `CounselorDetailTabs.jsx` — tab list + tab panel routing
- `tabs/ProfileTab.jsx` — core staff record fields; admins edit all, counselors edit own bio
- `tabs/LicensesTab.jsx` — list-of-cards with add/edit/delete (admin only)
- `tabs/SpecialtiesTab.jsx` — checkbox multi-select for specialties, modalities, age groups, languages; self or admin edit
- `tabs/CounselorFaithProfileTab.jsx` — faith tradition, ordination, professional memberships, integration preferences; self or admin edit
- `tabs/CertificationsTab.jsx` — list split into Certifications and CEU Log sections; admin write
- `tabs/EmploymentTab.jsx` — NPI, malpractice, employment status; admin only; sensitive fields masked for non-admins
- `tabs/AvailabilityTab.jsx` — read-only weekly grid from existing availability data

### Step 7 — App Routing

- `UserMaintenance.jsx` — added `onViewCounselor` prop; "View Profile" button rendered when prop is present
- `Sidebar.jsx` — added `counselors` nav item (admin-only); `canViewNavItem` gates it same as `users`
- `App.jsx` — added `selectedCounselorId` state, `handleOpenCounselor`, `handleCounselorBack`, `showCounselors` derived boolean; `CounselorDetailPage` branch in render tree; `UserMaintenance` in Counselors view receives `onViewCounselor` and `currentUser`

## Files Changed

| File | Action |
|---|---|
| `apps/api/src/db/schema.sql` | Appended 5 table DDL blocks |
| `packages/domain/src/index.js` | Added 8 new exported arrays |
| `apps/api/src/db/queries/staffLicenses.js` | New |
| `apps/api/src/db/queries/staffCertifications.js` | New |
| `apps/api/src/db/queries/staffSpecialtyProfiles.js` | New |
| `apps/api/src/db/queries/staffEmployment.js` | New |
| `apps/api/src/db/queries/staffFaithProfiles.js` | New |
| `apps/api/src/index.js` | Added 5 imports, 7 dispatch blocks, 2 helpers, 7 handlers |
| `apps/web/src/lib/clientApi.js` | Added 16 exported functions |
| `apps/web/src/components/CounselorDetail/sharedStyles.js` | New |
| `apps/web/src/components/CounselorDetail/tabs/ProfileTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/LicensesTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/SpecialtiesTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/CounselorFaithProfileTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/CertificationsTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/EmploymentTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/tabs/AvailabilityTab.jsx` | New |
| `apps/web/src/components/CounselorDetail/CounselorDetailHeader.jsx` | New |
| `apps/web/src/components/CounselorDetail/CounselorDetailTabs.jsx` | New |
| `apps/web/src/components/CounselorDetail/CounselorDetailPage.jsx` | New |
| `apps/web/src/components/UserMaintenance.jsx` | Added onViewCounselor prop + View Profile button |
| `apps/web/src/components/Sidebar.jsx` | Added counselors nav item |
| `apps/web/src/App.jsx` | Added counselor routing state + CounselorDetailPage |

## Verification

1. Run DB migration: `node apps/api/src/db/migrate.js` — confirm 5 new tables via `SHOW TABLES LIKE 'staff_%';`
2. POST a license as admin → expect 201 with decrypted licenseNumber
3. POST a license as a counselor (non-admin) → expect 403
4. GET specialty-profile as owning counselor → expect 200; as a different counselor → expect 403
5. Log in as practice_admin → click Counselors in sidebar → staff list renders
6. Click View Profile → CounselorDetailPage loads with name and role badge
7. Click Licenses tab → Add license → card appears → Delete → list updates
8. Click Specialties tab → select options → save → refresh → selections persist
9. Log in as counselor → own profile: Specialties and Faith Profile tabs are editable; Employment tab is read-only

## Current Status

Implementation complete as of March 2026.

Still recommended next:

- Run `node apps/api/src/db/migrate.js` in the target environment to create the 5 new tables
- Add targeted automated tests for RBAC (self-edit vs admin vs other-counselor)
- Add expiry-based credentialing alerts (license and malpractice expiry warnings)
- Add counselor search/filter on the Counselors list view
- Consider supervision relationship UI (supervisee ↔ supervisor assignment)

## Deferred Work

The following items are intentionally postponed:

- Availability editing (via Scheduling module)
- Supervision assignment workflows
- Credentialing expiry notifications and alerts
- CEU reporting / export to PDF
- Counselor-facing self-service portal
- MFA and step-up authentication for sensitive HR fields
