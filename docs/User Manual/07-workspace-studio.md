# 07 — Workspace Studio

**Faith Counseling User Manual**

---

## Overview

Workspace Studio is the practice administration hub. It provides a single tabbed interface for every practice management surface: practice settings, locations, staff, lifecycle caseload, appointment types, documents, offerings, and portal administration.

Access Workspace Studio from the **Workspace Studio** link in the navigation sidebar. It is available to practice owners, practice admins, and platform admins.

---

## 7.1 Practice Tab

The Practice tab is where the practice profile is maintained.

### What You Can Edit

| Field | Description |
|---|---|
| **Practice Name** | The official name of the counseling practice |
| **Practice Type** | Solo practice, group practice, or multi-location clinic |
| **Timezone** | The primary timezone for scheduling and timestamps |
| **Faith Tradition** | The organizational faith tradition (e.g., Christian, Evangelical, etc.) |
| **Contact Information** | Phone, email, mailing address for the practice |

Click **Save** after making changes.

---

## 7.2 Locations Tab

Locations are the physical or virtual places where sessions are conducted.

### Viewing Locations

All configured locations appear in a list with their name, address, capacity, and telehealth flag.

### Adding a Location

1. Click **Add Location**.
2. Enter the location **name** and **address**.
3. Set **capacity** (max concurrent sessions).
4. Toggle **Telehealth / Remote Enabled** if virtual sessions are supported from this location.
5. Click **Save**.

### Editing and Deleting Locations

- Click a location card to edit its details.
- Delete a location using the delete button. Locations with active appointments cannot be deleted until appointments are reassigned.

---

## 7.3 Staff Tab

The Staff tab shows the full staff roster for the practice.

### What Is Displayed

- **Counselors:** name, role, license type, license number, supervision status, bio
- **Admin accounts:** name, role, contact information

### Staff Actions

The Staff tab is a **read-only roster view**. To create accounts, reset passwords, or change staff roles, navigate to the **Staff Management** page linked from the Staff tab.

---

## 7.4 Lifecycle Tab

The Lifecycle tab is the caseload management board for the full practice.

### Status Summary Cards

Clickable summary cards at the top show counts for:

- **Active** clients
- **Waitlist** clients
- **Inactive** clients
- **Discharged** clients

Clicking a card filters the client list below to that status.

### Client Status Transitions

From the Lifecycle tab, staff can:

- **Activate** a waitlist or inactive client
- **Move to Waitlist** an active client
- **Deactivate** a client
- **Discharge** a client — a discharge modal appears to capture the reason and notes

### Referral Source Breakdown

Below the status cards, a breakdown shows how clients are arriving at the practice by referral source (self-referral, physician, church, etc.).

---

## 7.5 Appointments Tab (Service Codes)

The Appointments tab manages **service codes** (CPT/billing codes) for the practice — not individual scheduled appointments.

### Service Code Fields

| Field | Description |
|---|---|
| **Code** | The CPT or internal billing code |
| **Category** | Type of service (individual, group, telehealth, etc.) |
| **Default Duration** | Default session length in minutes for this code |
| **Status** | Active or Inactive |

### Adding a Service Code

1. Click **Add Service Code**.
2. Enter the code, category, and default duration.
3. Toggle active/inactive.
4. Click **Save**.

Service codes appear as appointment type options in the [Scheduling](04-scheduling.md) module.

---

## 7.6 Documents Tab

The Documents tab in Workspace Studio is the staff-facing interface for assigning forms and documents to clients.

### What It Shows

- All clients with outstanding document or form assignments
- Assignment history per client
- Status of each assignment (assigned, in progress, submitted, reviewed)

### Assigning a Form

1. Select a **client** from the client picker.
2. Choose a **form or intake packet** from the library.
3. Set a **due date** (optional).
4. Click **Assign**.

The client will see the assignment in their [Client Portal](08-client-portal.md).

> **Shortcut:** From a client's detail page, click the **Documents** header action to arrive here with that client pre-selected.

---

## 7.7 Offerings Tab

The Offerings tab tracks the services and financial arrangements the practice provides to clients.

### Offering Records

Each offering entry captures:

- **Service type** — individual counseling, group, family, ministry, etc.
- **Frequency** — weekly, bi-weekly, monthly, as needed
- **Financial arrangement** — standard fee, sliding scale, pro bono, insurance-billed
- **Notes** — any additional context

### Managing Offerings

Create, edit, and deactivate offering records as client arrangements change.

---

## 7.8 Portal Tab

The Portal tab is the practice's interface for managing the Client Portal.

### Portal Settings

Configure:

- **Portal registration** — whether new portal accounts can be created via self-registration
- **Care request handling** — how inbound care requests are routed
- **Practice welcome message** — shown to clients on portal login

### Public Registration Requests

When a prospective client submits a registration request through the public portal, it appears here with:

- Submitted name and contact information
- Requested service type
- Submission date

**Actions:**

| Action | Result |
|---|---|
| **Approve** | Creates a portal account and sends access credentials |
| **Deny** | Rejects the registration request |
| **Convert to Care Request** | Elevates the registration into a care request for review |

### Care Requests

Approved care requests require a counselor or admin to create a client record:

1. Click **Create Client** on the care request row.
2. The system pre-fills available information from the request.
3. Review and save the client record.
4. Click **View Client** to open the newly created record.

### Portal Accounts

The Portal tab also shows all active authenticated portal accounts with account status and last login.

---

## Next Steps

- [Client Portal →](08-client-portal.md)
- [Forms and Documents →](09-forms-and-documents.md)
- [Monitoring and Telemetry →](11-monitoring-and-telemetry.md)
