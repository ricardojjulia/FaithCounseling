# 11 — Monitoring and Telemetry

**Faith Counseling User Manual**

---

## Overview

Faith Counseling includes built-in monitoring and telemetry so practice administrators and owners can observe platform health, surface operational anomalies, and track system behavior — without requiring a separate monitoring platform.

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
| **Worker health** | Whether background processing is running |
| **Request performance** | Response times for key API routes |
| **Error rate** | Rate of application errors and their severity levels |
| **Active sessions** | Approximate concurrent session count |
| **Telemetry export status** | Whether OTEL export is configured and sending |

---

## 11.3 Operations Dashboard (Monitoring Lens)

The Operations Dashboard (accessible from the main navigation and from the Monitoring page) expands on raw telemetry with practice-relevant operational signals:

| Section | Details |
|---|---|
| **Counselor Workload** | Per-counselor client count and load |
| **Note-Gap Compliance Watch** | Overdue note counts across thresholds |
| **Portal Request Backlog** | Pending registration and care requests |
| **7-Day Trend Lines** | Trend context for key operational metrics over the past week |
| **Configurable Alerts** | Staff-defined thresholds that trigger warning indicators |

---

## 11.4 Telemetry Export (OpenTelemetry)

Faith Counseling supports optional export of telemetry signals to a centralized observability backend using the **OpenTelemetry (OTEL)** standard.

### When No OTEL Endpoint Is Configured

All monitoring remains fully local. Telemetry is captured and viewable in the Monitoring page without any external dependency. Local monitoring is always available.

### When OTEL Export Is Configured

Configure OTEL export by setting environment variables:

| Variable | Description |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | The URL of your OTEL collector endpoint |
| `OTEL_SERVICE_NAME` | The service name label displayed in your observability platform |

Once configured, spans, metrics, and logs are exported to the configured backend automatically.

### OTEL Naming Conventions

Faith Counseling follows OTEL semantic conventions first, with `faith.ui.*` namespace used only for application-specific gaps that standard OTEL conventions do not cover.

---

## 11.5 PHI and Privacy in Telemetry

Faith Counseling telemetry is designed with strict privacy safeguards:

- **No PHI is emitted** — telemetry never includes client names, emails, IDs, diagnoses, or any personally identifiable health information
- **No free-text values** in telemetry labels — only structured, low-cardinality signals
- **Audit logs are separate** — raw audit events are never exported via telemetry channels

---

## 11.6 Surface Registry

Every visible surface in the application (screens, tabs, major workflow modals) is tracked in the platform's **surface registry**. The Monitoring page exposes coverage metrics:

- Which surfaces have telemetry coverage
- Which surfaces are missing baseline signals
- Surface-level error and performance data

This ensures that no screen goes unobserved.

---

## 11.7 Reading the Health Panel

The Monitoring page health panel uses color indicators:

| Color | Meaning |
|---|---|
| Green | Healthy — signal is within expected ranges |
| Yellow | Warning — signal is degraded or approaching threshold |
| Red | Error — signal is failed or out of bounds |
| Gray | Unknown — signal data is not yet available |

---

## 11.8 Configurable Operational Alerts

Practice admins can configure threshold-based alerts visible in the Operations Dashboard:

- **Note-gap threshold** — flag when overdue notes exceed a set count
- **Portal backlog threshold** — flag when unreviewed portal requests exceed a limit
- **Appointment utilization threshold** — flag when capacity drops below a target fill rate

Alerts appear as banner indicators on the dashboard — they do not send external notifications by default.

---

## Next Steps

- [Dashboard and Home →](02-dashboard-and-home.md)
- [Security and Compliance →](12-security-and-compliance.md)
- [Workspace Studio →](07-workspace-studio.md)
