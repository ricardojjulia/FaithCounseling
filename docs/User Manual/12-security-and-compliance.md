# 12 — Security and Compliance

**Faith Counseling User Manual**

---

## Overview

Faith Counseling is built with security and privacy as foundational requirements, not add-ons. This section describes the security model, how access controls work, how audit trails are maintained, and how clients can exercise their data rights.

> **For administrators:** The canonical security and auditing implementation spec is located at `PLANS/FULL-SECURITY-AND-AUDITING.md`.

---

## 12.1 Role-Based Access Control (RBAC)

Every action in Faith Counseling is governed by the user's role. Access controls are deny-by-default, meaning access must be explicitly granted — not just not denied.

### Role Hierarchy Summary

| Role | Access Level |
|---|---|
| Platform Admin | Full platform access, all tenants |
| Practice Owner | Full access to their practice |
| Practice Admin | Full operational access within the practice |
| Scheduler / Biller | Scheduling, appointments, billing codes |
| Counselor | Their assigned clients and clinical workflows |
| Intern | Same as Counselor, flagged as supervised |
| Client | Client Portal only |

### Tenant Isolation

Each practice is a separate **tenant**. A user at one practice cannot access data belonging to another practice. Tenant scope is enforced at the database query level on every request.

---

## 12.2 Authentication and Sessions

- Login requires a valid email and password combination.
- Sessions are cryptographically signed using a `SESSION_SECRET` configured at the server level.
- Session tokens are stored as HTTP-only cookies — they are not accessible to JavaScript.
- CSRF protection is active on all mutating operations (state-changing requests).
- Sessions expire automatically after a period of inactivity.

---

## 12.3 Data Encryption

Sensitive fields in the database are encrypted at rest using an `DB_ENCRYPTION_KEY` configured by the practice administrator. Encrypted fields include:

- PHI (personally identifiable health information)
- Contact details
- Insurance information
- Legal and administrative records

Encryption is transparent to users — data appears and is edited normally. Administrators must safeguard the encryption key in a secrets management system.

---

## 12.4 Audit Trail

Faith Counseling maintains a structured **audit ledger** for security-relevant events. Audit records capture:

| Field | Description |
|---|---|
| **Event type** | What happened (login, record access, update, delete, export) |
| **Actor** | Which user performed the action |
| **Target** | Which record or resource was affected |
| **Outcome** | Result: `success`, `failure`, `denied`, or `error` |
| **Timestamp** | When the event occurred |
| **IP address** | Originating request IP (for authentication events) |

The audit ledger is **append-only** — records cannot be modified or deleted through the application.

Audit data is separate from telemetry. Raw audit rows are never exported through telemetry channels.

---

## 12.5 PHI and Privacy Safeguards

Faith Counseling follows HIPAA-oriented safeguards and GDPR-aligned privacy principles:

- **Minimum necessary access** — users only see the data their role requires
- **No PHI in logs or telemetry** — application logging never contains client-identifiable information
- **Secure transport** — HTTPS is required in production
- **Database transport encryption** — `DB_SSL=true` for production environments

---

## 12.6 Client Data Rights

Clients have the right to request access to, correction of, and deletion of their data. These requests are submitted through the [Client Portal — Data Rights tab](08-client-portal.md#89-data-rights-tab).

Supported request types:

| Request | Description |
|---|---|
| **Access** | Receive a copy of all data the practice holds |
| **Correction** | Request correction of inaccurate records |
| **Deletion** | Request deletion (subject to legal/retention obligations) |
| **Restriction** | Request that certain processing stop |
| **Portability** | Request data in a portable format |

Staff receive data rights requests through the practice administration interface and must respond within legally required timeframes.

---

## 12.7 Password Security

- Passwords are stored hashed — never in plain text
- Password resets are performed by practice administrators
- Clients can change their portal password from the portal account settings
- Staff account passwords follow the practice's configured complexity requirements

---

## 12.8 Production Security Checklist (Administrators)

When deploying Faith Counseling in a production environment:

- [ ] Use HTTPS (TLS termination required)
- [ ] Set `DB_SSL=true` for encrypted database transport
- [ ] Configure a strong, unique `SESSION_SECRET`
- [ ] Configure a strong, unique `DB_ENCRYPTION_KEY`
- [ ] Set strict `ALLOWED_ORIGINS` to prevent CORS abuse
- [ ] Set `NODE_ENV=production`
- [ ] Store all secrets in a secrets management system (not `.env` files in production)
- [ ] Run database migrations before each deployment
- [ ] Review and limit admin account access regularly

---

## 12.9 Impersonation and Background Jobs

- Impersonation of client or staff accounts requires explicit elevated access
- Background worker processes run under a service account with minimal required permissions
- All background job outcomes are audited

---

## Next Steps

- [Monitoring and Telemetry →](11-monitoring-and-telemetry.md)
- [Workspace Studio →](07-workspace-studio.md)
- [Client Portal — Data Rights →](08-client-portal.md)
