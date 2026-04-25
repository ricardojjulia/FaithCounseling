# USER and USER MAINTENANCE

**Status:** ✅ COMPLETE (without MFA) — implementation record for the user maintenance and login work.

## Purpose

This plan defines the implementation scope for a professional login experience and a secure user maintenance module for ChurchCore Care.

This version explicitly defers MFA. The application will still enforce strong password policy, secure session handling, account lockout, role-based access, tenant scoping, audit logging, and administrator-controlled account lifecycle actions.

## Scope

Included in this plan:

- Professional login screen for staff users
- Session restore on reload using secure server-side sessions
- Account lockout-aware login UX
- Strong password policy support
- User maintenance screen for administrators
- Staff create and edit flows
- Role changes
- Account password reset by administrators
- Account unlock by administrators
- Account deactivation by administrators
- Audit events for sensitive account actions
- Role-gated navigation and access controls
- Documentation and validation steps

Explicitly deferred from this plan:

- MFA enrollment
- MFA challenge flow
- MFA reset and recovery flows
- WebAuthn or TOTP setup
- Step-up authentication for sensitive actions
- Full audit-log viewer UI

## Security Principles

The implementation must preserve the following rules:

- Passwords are never reversibly encrypted. They are stored only as Argon2id hashes.
- PHI and sensitive profile fields may use field-level encryption where already established.
- Sessions remain server-managed and stored in HttpOnly cookies.
- No session tokens in localStorage or sessionStorage.
- Authentication errors must avoid user enumeration.
- Lockout rules remain enforced after repeated failed login attempts.
- User maintenance functions are visible only to `platform_admin`, `practice_owner`, and `practice_admin`.
- All privileged account operations emit audit events without leaking PHI values.
- Tenant boundaries remain enforced for all staff operations.

## Functional Requirements

### 1. Login Experience

The login screen should:

- Present a professional, credible clinical-workspace appearance
- Explain that the workspace uses secure, server-managed sessions
- Accept email and password
- Display generic invalid-credential messaging for normal failures
- Display a specific account-lockout message when the backend returns a lock condition
- Show password policy guidance without exposing internal implementation details
- Restore an existing session automatically when a valid session cookie already exists

### 2. Session Handling

The application shell should:

- Attempt `/api/v1/auth/me` during startup
- Restore the authenticated workspace without forcing another login when the session is still valid
- Perform server logout through `/api/v1/auth/logout`
- Clear local UI state after logout
- Preserve secure cookie-based auth as the single source of truth

### 3. User Maintenance

The user maintenance screen should:

- List staff users with account metadata
- Show email, role, status, and last login when available
- Allow administrator-only user creation
- Allow administrator-only profile edits
- Allow administrator-only role updates
- Allow administrator-only password reset
- Allow administrator-only account unlock
- Allow administrator-only account deactivation
- Surface generated temporary passwords only at creation/reset time when they are backend-generated

### 4. Policy Enforcement

The backend should support:

- Account provisioning at staff creation time
- Password validation using existing minimum-length and breach-check logic
- Session revocation on admin password reset
- Session revocation on deactivation
- Lockout reset on unlock
- Audit emission for account creation, password reset, unlock, and deactivate actions

## Implementation Plan

### Phase 1. Login and Session UX

Deliverables:

- Upgrade the login screen styling and content
- Add lockout-aware error handling in the login form
- Add startup session restoration using `/api/v1/auth/me`
- Add real logout behavior via `/api/v1/auth/logout`
- Show current user identity in the top bar and sidebar

Files:

- `apps/web/src/components/AuthGate.jsx`
- `apps/web/src/App.jsx`
- `apps/web/src/components/TopBar.jsx`
- `apps/web/src/components/Sidebar.jsx`
- `apps/web/src/App.css`

### Phase 2. User Maintenance Backend

Deliverables:

- Provision staff accounts when new staff records are created
- Add admin account actions endpoint for password reset, unlock, and deactivate
- Enrich staff list responses with email, lock state, MFA flag, and last login metadata
- Keep account actions DB-only and fail clearly when DB mode is unavailable

Files:

- `apps/api/src/lib/auth.js`
- `apps/api/src/index.js`

### Phase 3. User Maintenance Frontend

Deliverables:

- Add user maintenance page
- Add create/edit user modal
- Add admin action buttons for reset password, unlock, and deactivate
- Add role-gated sidebar navigation
- Add staff API helpers for frontend usage

Files:

- `apps/web/src/components/UserMaintenance.jsx`
- `apps/web/src/components/Sidebar.jsx`
- `apps/web/src/App.jsx`
- `apps/web/src/lib/clientApi.js`
- `apps/web/src/App.css`

### Phase 4. Validation

Deliverables:

- Ensure the web app builds successfully
- Ensure modified backend files parse correctly
- Confirm generated build artifacts are not left as source diffs
- Confirm administrator navigation is hidden for non-admin roles
- Confirm session restore works against a running API
- Confirm account actions work against DB-backed environments

## Current Status

Completed already:

- Backend admin account lifecycle actions
- User maintenance screen
- Staff account API client methods
- Role-gated navigation for user maintenance
- Professional login UI refresh
- Session restore and real logout wiring

Still recommended next:

- Add targeted automated tests for login lockout and user admin flows
- Add backend tests for password reset and deactivate session revocation
- Add UX copy review for compliance language
- Add issue-level implementation tracking if this work will continue over multiple releases

## Acceptance Criteria

This work is complete when:

- A returning authenticated user can refresh and stay in the workspace via `/api/v1/auth/me`
- A signed-out user sees the new login screen
- Invalid credentials do not disclose whether an email exists
- Locked users receive a clear lockout message
- Administrators can create, edit, reset, unlock, and deactivate users
- Non-admin users do not see the user maintenance navigation item
- Web build succeeds
- Backend syntax checks succeed
- Sensitive account actions generate audit events

## Deferred Work

The following items are intentionally postponed:

- MFA requirement enforcement
- MFA device enrollment UX
- Re-authentication prompts for sensitive actions
- Session management dashboard for administrators
- Full audit log review interface

## Notes

MFA remains a future security enhancement and should be reintroduced only after the base login and account lifecycle flows are stable, documented, and covered by automated tests.
