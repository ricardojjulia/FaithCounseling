# 11 — Monitoring and Runtime Health

**Faith Counseling User Manual**

---

## Overview

Faith Counseling includes built-in local monitoring so practice administrators and owners can review platform health, inspect runtime issues, and confirm that core services are responding normally.

Monitoring is local to the application. The current product does not require or expose OpenTelemetry / OTEL export, external collectors, Jaeger, or Prometheus as part of normal use.

---

## 11.1 Accessing Monitoring

Navigate to **Monitoring** in the sidebar. This surface is available to practice owners, practice admins, and platform admins.

---

## 11.2 What Monitoring Shows

The Monitoring page provides a live snapshot of:

| Signal | Description |
|---|---|
| **API health** | Whether the API is responding and handling requests normally |
| **Database health** | Whether the database connection is healthy |
| **Worker status** | Whether background processing is running normally |
| **Request performance** | Response times for key API routes |
| **Error rate** | Rate of application errors and their severity levels |
| **Active sessions** | Approximate concurrent session count |

---

## 11.3 Operations Dashboard (Monitoring Lens)

The Operations Dashboard expands on raw runtime health with practice-relevant operational signals:

| Section | Details |
|---|---|
| **Counselor Workload** | Per-counselor client count and load |
| **Note-Gap Compliance Watch** | Overdue note counts across thresholds |
| **Portal Request Backlog** | Pending registration and care requests |
| **7-Day Trend Lines** | Trend context for key operational metrics over the past week |
| **Configurable Alerts** | Staff-defined thresholds that trigger warning indicators |

---

## 11.4 Local Monitoring Model

Faith Counseling keeps monitoring inside the application:

- health signals remain available through the built-in monitoring surfaces
- database monitoring remains available to authorized admin roles
- startup and normal use do not depend on external tracing or metrics infrastructure

If you are using the product normally, no OTEL or external observability configuration is required.

---

## 11.5 PHI and Privacy in Monitoring

Faith Counseling monitoring is designed with strict privacy safeguards:

- **No PHI is emitted** — monitoring must not include client names, emails, IDs, diagnoses, or other identifiable health information
- **No free-text values** in monitoring labels — only structured, low-cardinality operational signals
- **Audit logs are separate** — raw audit events are never exported through monitoring flows

---

## 11.6 Reading the Health Panel

The Monitoring page health panel uses color indicators:

| Color | Meaning |
|---|---|
| Green | Healthy — signal is within expected ranges |
| Yellow | Warning — signal is degraded or approaching threshold |
| Red | Error — signal is failed or out of bounds |
| Gray | Unknown — signal data is not yet available |

---

## 11.7 Configurable Operational Alerts

Practice admins can configure threshold-based alerts visible in the Operations Dashboard:

- **Note-gap threshold** — flag when overdue notes exceed a set count
- **Portal backlog threshold** — flag when unreviewed portal requests exceed a limit
- **Appointment utilization threshold** — flag when capacity drops below a target fill rate

Alerts appear as banner indicators on the dashboard. They do not send external notifications by default.

---

## Next Steps

- [Dashboard and Home →](02-dashboard-and-home.md)
- [Security and Compliance →](12-security-and-compliance.md)
- [Workspace Studio →](07-workspace-studio.md)
