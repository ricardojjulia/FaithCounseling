# 13 — Troubleshooting and FAQ

**Faith Counseling User Manual**

---

## Overview

Common questions, known behaviors, and troubleshooting guidance for Faith Counseling users.

---

## 13.1 Login and Access Issues

**Q: I cannot log in. What should I do?**

Check that you are using the correct email and password. Passwords are case-sensitive. If your credentials are correct and you are still blocked, contact your practice administrator to verify your account status and reset your password if needed.

---

**Q: I was logged out automatically. Why?**

Sessions expire after a period of inactivity for security reasons. Log in again to resume your work. Unsaved form data may be lost — save frequently.

---

**Q: I see a "Permission denied" or "Access denied" error.**

Your user role does not permit the action you attempted. If you believe you should have access, contact your practice administrator to review your role.

---

**Q: I can see some clients but not others.**

Counselors only see clients assigned to them. If a client should be visible to you and is not, your practice administrator can update the assignment.

---

## 13.2 Scheduling Issues

**Q: I clicked the wrong month in the month picker and got the wrong month.**

This was fixed in the April 5, 2026 update. The month picker now correctly selects the month you click. Make sure your application is running the latest version.

---

**Q: I created a recurring series but the appointments are not showing on the calendar.**

Verify that the series start date is within the calendar's displayed month range. Navigate forward or backward on the calendar to confirm the appointments appear on the correct dates. If appointments are still missing, contact your administrator.

---

**Q: I cannot find a client in the appointment client dropdown.**

Only clients with an **Active** status appear in scheduling client selections. If the client is on the Waitlist, Inactive, or Discharged, update their status first through Client Management.

---

## 13.3 Clinical Chart Issues

**Q: I cannot add a session note.**

Ensure you are viewing a client assigned to you. If the chart is read-only, verify your role. Counselors and interns can add notes to their assigned clients.

---

**Q: A note I wrote is not showing up.**

Check your filter settings — notes may be filtered by date range or status. Confirm that you saved the note before navigating away.

---

**Q: My note gap count seems wrong on the Dashboard.**

Note-gap counts reflect session notes missing within the current calculation window. Draft notes (not signed) may not be counted as "complete" depending on how your practice configures compliance. Sign the note to clear the gap.

---

## 13.4 Faithful Workflows Issues

**Q: The Faithful Workflows page shows no clients.**

If demo mode is enabled but no real clients are loaded, this may be a data issue. Verify you are not in demo mode. If real clients are expected and not appearing, check your client assignment and active status.

**To verify demo mode status:**  
Open the browser console and type:
```
localStorage.getItem('faith_workflows.demo_mode')
```
If the result is `"true"`, disable demo mode:
```
localStorage.setItem('faith_workflows.demo_mode', 'false')
```
Then refresh the page.

---

**Q: A client I expect to be flagged is not showing up in Faithful Workflows.**

Faithful Workflows only surfaces clients with an **Active** status and at least one active care rule flag. If the client is inactive or all flags have been resolved, they will not appear as a flagged case.

---

**Q: The canvas views look different on my screen.**

The Radial Hub and Priority Matrix views are designed for wider screens. If you are on a narrow screen or tablet, the Classic List view provides the best experience.

---

## 13.5 Client Portal Issues

**Q: A client says their form is not showing up in the portal.**

Verify that the form was assigned in Workspace Studio → Documents. Check the assignment status. If the assignment shows "Assigned," ask the client to refresh the portal documents page.

---

**Q: A client cannot log in to the portal.**

Have the client verify their credentials. If they have forgotten their password, you can reset it from the Staff Management page. Portal accounts are separate from staff accounts.

---

**Q: A portal registration request is not appearing in Workspace Studio.**

Check that the Portal tab in Workspace Studio is configured to accept registrations. If registration is disabled, new requests will not be created. Confirm with the practice owner or admin.

---

## 13.6 Workspace Studio Issues

**Q: I cannot delete a location.**

Locations with active or future appointments cannot be deleted. Reschedule or cancel those appointments first, then retry the deletion.

---

**Q: The Lifecycle tab is not showing all clients.**

Use the status summary cards at the top to filter by status. The list defaults to showing all statuses unless a card has been clicked to filter.

---

## 13.7 Forms and Documents Issues

**Q: A submitted form is showing as "Assigned" instead of "Submitted."**

Ask the client to verify they completed the final submission step in the portal. A form that has been started but not submitted will show as "In Progress." The client must click **Submit** to finalize it.

---

**Q: I cannot find a form in the library to assign.**

The form library is managed by your practice administrator or platform administrator. Contact them to have a needed form added or activated.

---

## 13.8 Date and Calendar Tips

- All date fields accept `MM/DD/YYYY` format for manual entry.
- The date picker calendar closes automatically when a day is selected — no need to press Enter.
- Dates are stored internally as `YYYY-MM-DD` strings; display formatting is handled automatically.

---

## 13.9 Performance and Browser Tips

- Faith Counseling works best in modern browsers: Chrome, Firefox, Edge, or Safari (latest versions).
- If a page is loading slowly, try refreshing. If the issue persists, check the Monitoring page to see if there is a known service issue.
- Clear your browser cache if you see outdated content after an application update.

---

## 13.10 Getting Additional Help

| Resource | How to Access |
|---|---|
| Practice Administrator | Your first point of contact for account and access issues |
| In-app Monitoring page | Check for system health issues before reporting bugs |
| Developer documentation | See the `README.md` and `docs/` folder in the repository |
| Change log | `docs/change-log.md` lists all releases and known issue resolutions |

---

## Next Steps

- [Getting Started →](01-getting-started.md)
- [Manual Table of Contents →](README.md)
