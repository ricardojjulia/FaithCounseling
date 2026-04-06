# 01 — Getting Started

**Faith Counseling User Manual**

---

## Overview

This section covers how to access the Faith Counseling platform, understand your role, and navigate the main application surfaces.

---

## 1.1 Accessing the Platform

Open your web browser and navigate to the Faith Counseling URL provided by your practice administrator. The default local URL for development environments is:

```
http://127.0.0.1:3002/index.html
```

Production environments use a practice-specific domain with HTTPS.

---

## 1.2 Logging In

1. On the login screen, enter your **email address** and **password**.
2. Click **Sign In**.
3. If your credentials are correct, you are directed to your role's home screen.

> **First login:** Your practice administrator will provide your initial credentials. You should change your password after first login if you have access to the Client Portal password change option.

> **Forgot your password?** Contact your practice administrator to have your password reset.

---

## 1.3 User Roles

Faith Counseling uses role-based access controls. Your role determines what surfaces and actions are available to you.

| Role | Description |
|---|---|
| **Platform Admin** | Full system access across the platform. Reserved for infrastructure-level administration. |
| **Practice Owner** | Full access to practice settings, staff management, clinical workflows, and scheduling. |
| **Practice Admin** | Full operations access: Workspace Studio, scheduling, client management, portal administration. |
| **Scheduler / Biller** | Access to scheduling, appointments, waitlist, reminders, and service code management. |
| **Counselor** | Access to their assigned clients, clinical charting, Faithful Workflows, and scheduling. |
| **Intern** | Same operational access as Counselor but flagged under supervision. |
| **Client (Portal User)** | Access to the Client Portal only: profile, documents, appointment requests, and data rights. |

---

## 1.4 Main Navigation

After login, the left sidebar provides primary navigation. The items available depend on your role.

| Navigation Item | Available To | Goes To |
|---|---|---|
| **Home / Dashboard** | Counselors, Admins | Daily operations summary |
| **Clients** | Counselors, Admins | Client list and search |
| **Scheduling** | All staff | Calendar, appointments, reminders, waitlist |
| **Faithful Workflows** | Counselors | Care prioritization workspace |
| **Clinical Chart** | Counselors | Chart access (via client detail) |
| **Workspace Studio** | Admins, Owners | Practice settings hub |
| **Monitoring** | Admins, Owners | Operations telemetry dashboard |
| **Client Portal** | Clients | Self-service portal |

---

## 1.5 Top Bar

The top navigation bar displays:

- **Practice name** — the name of your practice or clinic.
- **Current user** — your name and role badge.
- **Language selector** — switch the UI language if multiple locales are available.
- **Sign out** — securely end your session.

---

## 1.6 Language Support

Faith Counseling supports multiple languages. The active language can be changed from the top bar language selector. The API-backed locale catalog ensures labels and messages remain aligned with the currently configured language.

Currently supported locales include English and additional languages configured by your practice administrator.

---

## 1.7 Session Security

- Sessions expire after a period of inactivity.
- You will be redirected to the login screen when your session expires.
- Never share your login credentials with others.
- CSRF protection is active on all mutating requests.

---

## Next Steps

- [Dashboard and Home →](02-dashboard-and-home.md)
- [Client Management →](03-client-management.md)
- [Scheduling →](04-scheduling.md)
