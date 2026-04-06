# 03 — Client Management

**Faith Counseling User Manual**

---

## Overview

Client Management covers searching, viewing, and editing client records. Each client record is a rich, story-like workspace that surfaces clinical context, faith-aware care details, diagnoses, legal and insurance data, and practical next actions.

---

## 3.1 The Client List

Navigate to **Clients** in the sidebar to open the client list.

### Searching and Filtering

- Use the **search bar** to find clients by name.
- Use **status filter buttons** to view: All, Active, Waitlist, Inactive, or Discharged clients.

### Client Status Badges

Each client in the list displays a color-coded status badge:

| Badge Color | Status |
|---|---|
| Green | Active |
| Yellow | Waitlist |
| Gray | Inactive |
| Blue | Discharged |

---

## 3.2 Adding a New Client

1. Click **Add Client** (or the **+** button).
2. Fill in the required fields: first name, last name, and status.
3. Add contact information, demographics, and insurance details as available.
4. Click **Save**.

New clients are immediately available in the client list.

---

## 3.3 Client Detail Page

Click any client row or card to open the **Client Detail Page**. This is the central workspace for an individual client's record.

### Client Detail Header

The header displays:

- Full client name and status badge
- Counselor assignment
- Primary diagnosis (if available)
- Quick action buttons: **Open Clinical Chart**, **Documents** (direct shortcut to client portal documents)

### Client Detail Tabs

The client record is organized into tabs:

| Tab | Contents |
|---|---|
| **Demographics** | Personal information, date of birth, contact details, employment, education |
| **Clinical History** | Previous diagnoses, treatment history, presenting concerns |
| **Diagnoses** | DSM-5-TR diagnosis entries with onset date, severity, and status |
| **Faith Profile** | Faith tradition, spiritual history, care integration preferences |
| **Insurance** | Insurance carrier, policy number, group number, authorization details |
| **Legal / Admin** | Legal status, administrative flags, emergency contacts |
| **Contacts** | Emergency contacts and personal support contacts |
| **Intake Preview** | Read-only view of completed intake packet responses |

---

## 3.4 Demographics Tab

The Demographics tab stores:

- Name, pronouns, date of birth
- Address and contact information
- Employment and education level
- Primary language

**Date entry format:** All date fields accept `MM/DD/YYYY` for manual entry. The calendar picker closes automatically when a day is selected.

---

## 3.5 Faith Profile Tab

The Faith Profile tab is unique to Faith Counseling. It captures:

- **Faith tradition** — the client's stated religious or spiritual background
- **Church or ministry affiliation**
- **Spiritual history** — relevant background notes
- **Faith integration preference** — whether and how the client wishes spiritual care integrated into sessions
- **Care context notes** — counselor-entered faith-aware care planning notes

> **Counselor note:** All faith-integration fields are optional and intentional. Spiritual content should remain contextual and counselor-directed, not automated.

---

## 3.6 Diagnoses Tab

The Diagnoses tab manages DSM-5-TR clinical diagnoses:

- Add a diagnosis using the coded lookup
- Set onset date, severity, and active/inactive status
- Multiple diagnoses per client are supported
- Diagnoses surface in the Faithful Workflows prioritization engine as clinical context

---

## 3.7 Insurance Tab

Record and update client insurance information:

- Primary and secondary insurance carrier
- Policy and group numbers
- Authorization codes and expiration dates
- Co-pay and deductible information

---

## 3.8 Documents Shortcut

The Client Detail header includes a **Documents** quick action that routes directly to the **Client Portal Documents** tab with this client pre-selected. This avoids having to manually switch to Workspace Studio and re-select the client.

---

## 3.9 Client Status Transitions

Clients move through lifecycle statuses:

| Transition | Notes |
|---|---|
| Active → Waitlist | The client is temporarily moved to the waitlist |
| Active → Inactive | The client is no longer actively engaged |
| Active → Discharged | A discharge modal captures reason and notes |
| Waitlist → Active | The client is activated from the waitlist |

For bulk lifecycle management, use the **Lifecycle tab** in [Workspace Studio](07-workspace-studio.md).

---

## Next Steps

- [Scheduling →](04-scheduling.md)
- [Clinical Chart →](05-clinical-chart.md)
- [Workspace Studio →](07-workspace-studio.md)
