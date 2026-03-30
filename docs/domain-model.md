# Domain Model

## Bounded Modules

- Identity and Access
- Practice Administration
- Client Management
- Clinical Chart
- Documents and Forms
- Assessments and Inventories
- Scheduling
- Offerings (voluntary giving — replaces billing model)
- Client Portal
- Audit and Compliance

## Shared Cross-Cutting Rules

- every tenant-owned record includes `tenantId`
- location-aware records also include `locationId` when applicable
- PHI-bearing entities must record creation, update, view, export, and delete events in audit logs
- staff access is role-based and further constrained by practice assignment, location scope, and client relationship where applicable

## Core Entities

### Tenant and practice

- `Tenant`: subscription boundary, lifecycle status, plan, retention settings
- `Practice`: display name, legal name, tax identifiers, timezone defaults, branding settings
- `Location`: practice site, address, timezone, rooms, active status
- `StaffMember`: staff identity, credentials, contact info, employment status
- `RoleAssignment`: role, scope, effective dates
- `SupervisionRelationship`: supervisor, supervisee, review policy, effective dates

### Client lifecycle

- `Client`: demographics, preferred name, pronouns, faith-background fields, communication preferences, status
- `EmergencyContact`: relationship, contact channels, release authorization
- `ReferralSource`: internal or external referral metadata
- `ConsentRecord`: consent type, version, signature state, effective dates
- `IntakePacket`: assigned forms, completion status, submitted timestamps

### Clinical chart

- `DiagnosisEntry`: optional diagnosis or presenting problem metadata
- `TreatmentPlan`: goals, interventions, status, review cadence
- `ProgressNote`: note type, session summary, interventions, locked state, signer metadata
- `CaseStatus`: active, waitlist, discharged, inactive
- `DischargeRecord`: reason, summary, closing dates

### Documents and assessments

- `DocumentTemplate`: tenant-owned template, type, version, publication status
- `DocumentInstance`: assigned document, subject, completion state, storage pointer
- `AssessmentTemplate`: structured instrument definition, scoring rules, version
- `AssessmentResponse`: subject, answers, calculated scores, reviewer status

### Scheduling and offerings

- `AvailabilityTemplate`: recurring availability rules
- `AppointmentType`: duration, location mode, suggested offering amount
- `Appointment`: client, counselor, location, remote flag, status, reminders
- `Offering`: voluntary contribution record — client, counselor, date received, amount in cents, optional note
- `PortalSettings.suggestedOfferingCents`: global suggested giving amount shown to clients in the portal

### Portal and communication

- `PortalAccount`: client login identity, status, MFA settings if enabled
- `PortalMessageThread`: limited-scope secure conversation
- `PortalResource`: document or educational resource published to client

### Compliance and audit

- `AuditEvent`: actor, action, target type, target id, tenant id, location id, timestamp, outcome, metadata
- `DataRetentionPolicy`: record class, retention duration, legal hold status
- `BackupRecord`: environment, backup type, restore validation date

## Permissions Model

| Role | Practice Admin | Staff Admin | Client Chart | Scheduling | Offerings | Portal Admin | Platform Ops |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Platform admin | No tenant default access | No | No | No | No | No | Yes |
| Practice owner | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Practice admin | Yes | Yes | Limited by tenant | Yes | Optional | Optional | No |
| Counselor | Limited | No | Assigned clients | Own calendar | Record only | No | No |
| Intern or supervisee | No | No | Assigned clients with supervision rules | Own calendar | No | No | No |
| Scheduler or biller | Limited | No | Minimum necessary | Yes | Record only | No | No |
| Client | No | No | Portal-scoped only | Requests and own appointments | View suggested amount | Self only | No |

## Design Constraints

- portal users must never see internal-only notes or staff-only documents
- staff impersonation is platform-controlled and always audited
- document storage keys must not expose PHI in path names
- signed or locked clinical records require versioned corrections rather than destructive edits
