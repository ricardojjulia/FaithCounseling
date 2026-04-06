# 04 — Scheduling

**Faith Counseling User Manual**

---

## Overview

The Scheduling module manages appointments, calendar availability, waitlists, reminders, and recurring appointment series. It is designed for real week-to-week ministry scheduling, not back-office data entry.

---

## 4.1 Accessing Scheduling

Click **Scheduling** in the left sidebar. The scheduling page opens with a monthly calendar view and tabbed surfaces for appointments, waitlist, reminders, availability, and utilization.

---

## 4.2 The Scheduling Calendar

The calendar provides a month-level view of scheduled appointments.

### Navigating the Calendar

- Use **Previous** and **Next** arrows to move between months.
- Use the **Month Picker** to jump directly to a specific month. The picker correctly selects the month you click.
- Click on a day cell to view or create appointments for that day.

### Reading the Calendar

- Each scheduled appointment appears as a colored event on its date.
- Appointments can be clicked to view or edit details.
- Days with high appointment volume show a count indicator.

---

## 4.3 Appointments Tab

The Appointments tab lists all scheduled sessions with filtering and search.

### Viewing Appointments

Filter appointments by:

- **Date range** — narrow to a specific period
- **Counselor** — filter to a specific staff member (for admin roles)
- **Client** — search for a specific client's sessions
- **Status** — scheduled, completed, cancelled, no-show

### Creating an Appointment

1. Click **Add Appointment** or click a calendar day.
2. Select the **client** from the dropdown.
3. Select the **counselor** (defaults to current user if counselor role).
4. Choose the **appointment type** (service code).
5. Set the **date**, **start time**, and **end time**.
6. Select the **location** (in-person or telehealth).
7. Add any notes.
8. Click **Save**.

### Editing an Appointment

1. Click the appointment in the list or calendar.
2. Edit fields as needed.
3. Click **Save**.

### Cancelling an Appointment

1. Open the appointment.
2. Change the status to **Cancelled** and note the reason.
3. Click **Save**.

---

## 4.4 Recurring Appointment Series

For regular recurring sessions, use the **Series Builder**. This avoids typing raw scheduling syntax (RRULE) directly.

### Creating a Recurring Series

1. Click **Add Series** or choose to create a recurring session when adding an appointment.
2. The guided builder opens.
3. Choose a **cadence** from readable options:
   - Weekly
   - Every Two Weeks (biweekly)
   - Monthly
4. Select **weekday(s)** for the sessions.
5. Set **start date** and **end date** (or number of occurrences).
6. Review the **live schedule preview** showing all generated dates.
7. Click **Create Series**.

> **Advanced mode:** If you need custom RRULE syntax, it remains available as an advanced fallback option.

---

## 4.5 Availability and Overrides

Staff with scheduling roles can manage counselor availability:

### Availability

Set standard weekly availability blocks per counselor:

- Day of week
- Start time and end time
- Location (in-person or telehealth)

### Availability Overrides

Override availability for specific dates (e.g., holidays, vacations, conferences):

1. Navigate to the **Availability** tab.
2. Click **Add Override**.
3. Select the target date, counselor, and override type (blocked or available).
4. Save the override.
5. Overrides appear on the calendar and affect scheduling slot calculations.

---

## 4.6 Waitlist

The Waitlist tab shows clients waiting for available appointment slots.

### Managing the Waitlist

- **View** all waitlisted clients with requested service type and wait start date.
- **Prioritize** entries using the order controls.
- **Convert** a waitlist entry to a booked appointment when a slot opens.
- **Remove** a client from the waitlist if they are no longer seeking services.

---

## 4.7 Reminders

The Reminders tab manages appointment reminders for clients.

### Creating a Reminder

1. Click **Add Reminder**.
2. Select the **client** and **appointment**.
3. Choose the **reminder type** (email, message, or manual note).
4. Set the **send time** (e.g., 24 hours before).
5. Save.

### Reminder Status

Reminders show a status badge:

- **Pending** — not yet sent
- **Sent** — sent to the client
- **Acknowledged** — client confirmed receipt (when supported)

---

## 4.8 Utilization

The Utilization tab shows how counselor capacity is being used across the practice.

- **Per-counselor utilization** — percentage of available slots filled
- **Practice-wide utilization** — aggregate capacity fill rate
- **7-day and 30-day trend** — shows whether capacity is improving or declining

This surface is designed for practice owners and admins to monitor scheduling health.

---

## 4.9 Role-Based Scheduling Access

| Role | Permissions |
|---|---|
| Platform Admin, Practice Owner, Practice Admin, Scheduler/Biller | Full scheduling access — all clients and counselors |
| Counselor, Intern | Can view and manage their own appointments only |

---

## Next Steps

- [Clinical Chart →](05-clinical-chart.md)
- [Faithful Workflows →](06-faithful-workflows.md)
- [Workspace Studio →](07-workspace-studio.md)
