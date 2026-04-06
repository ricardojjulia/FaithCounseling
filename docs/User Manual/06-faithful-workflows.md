# 06 — Faithful Workflows

**Faith Counseling User Manual**

---

## Overview

Faithful Workflows is the care prioritization workspace unique to Faith Counseling. It surfaces care recommendations, clinical risk signals, and urgency cues across the counselor's client caseload — powered by deterministic clinical rules with explainable rationale.

It is not an AI-generated opinion. Every recommendation is grounded in 27 structured clinical rules across 8 care categories, and every suggestion surfaces the reasoning behind it.

---

## 6.1 Opening Faithful Workflows

Click **Faithful Workflows** in the sidebar, or click the **Faithful Workflows metric card** on the Dashboard. Both routes land on the same workspace.

---

## 6.2 The Three Canvas Views

Faithful Workflows offers three interchangeable views of the same caseload data. A **floating cycle button** in the page header switches between views.

### Classic List View

A traditional ranked list of clients ordered by care urgency. Each client shows:

- Priority score and ranking
- Active clinical flags (note gap, safety flags, assessment overdue, etc.)
- Top recommendation with rationale
- Actions (open chart, schedule, assign form)

Best for: counselors who prefer scanning a checklist and want a linear display.

---

### Radial Hub View

A circular hub-and-spoke visualization. The counselor sits at the center; clients radiate outward, positioned by urgency tier (inner ring = highest priority, outer ring = lower priority).

Best for: counselors who want a spatial overview of their full caseload at a glance.

---

### Priority Matrix View

A two-axis matrix plotting clients by **urgency** (vertical axis) vs. **engagement level** (horizontal axis). Quadrants help identify:

- High urgency + low engagement → requires immediate outreach
- High urgency + high engagement → currently well-served
- Low urgency + low engagement → monitoring
- Low urgency + high engagement → stable

Best for: counselors doing weekly case review or caseload planning.

---

## 6.3 The Safety Banner

When any client has an active **safety flag** (current risk indicator), a **Safety Banner** appears prominently at the top of the Faithful Workflows page.

The safety banner:

- Displays without delay — it surfaces before the rest of the caseload loads
- Shows the number of clients with active safety concerns
- Provides a direct link to those clients
- Cannot be dismissed while the flag remains active

> **Protocol:** Always address safety flags before proceeding with other caseload work.

---

## 6.4 Reading a Workflow Recommendation

Each client card in any view includes:

| Element | Description |
|---|---|
| **Priority Score** | Numeric urgency score calculated from all active rules |
| **Care Flags** | Color-coded badges for active clinical conditions (see below) |
| **Top Recommendation** | The highest-priority suggested action |
| **Rationale** | The clinical rule or condition that generated this recommendation |
| **Trend** | Whether the client's urgency is increasing, stable, or decreasing |

### Care Flag Types

| Flag | Color | Meaning |
|---|---|---|
| Safety | Red | Active safety or risk indicator |
| Note Gap | Orange | Session note is overdue |
| Assessment Overdue | Yellow | Clinical assessment needs updating |
| No Treatment Plan | Yellow | No active treatment plan exists |
| Inactive Engagement | Gray | Client has not engaged in expected timeframe |
| Faith Plan Needed | Indigo | Faith integration plan is indicated but not yet created |

---

## 6.5 Recommendation Drawer

Click any client card to open the **Recommendation Drawer** — a detailed panel showing:

- Full list of active care flags and their rationale
- All recommendations (not just the top one), ranked by priority
- Clinical context: diagnosis, last session, note status, assessment scores
- **Action buttons**: Open Chart, Schedule Session, Assign Form, View Profile

---

## 6.6 Caseload Urgency Banner

The Faithful Workflows banner in the page header stays synchronized with the dashboard metric card. Both surfaces reflect the same canonical count payload so that:

- The number of flagged clients on the Dashboard matches the banner count in Faithful Workflows
- Urgency cues remain consistent across navigation

---

## 6.7 The 8 Care Categories

Faithful Workflows evaluates each client across 8 care categories using 27 deterministic rules:

1. **Safety and Risk** — active safety flags, crisis indicators
2. **Clinical Documentation** — note gaps, incomplete session records
3. **Assessment Currency** — assessment recency and scoring
4. **Treatment Planning** — presence and currency of treatment plans
5. **Engagement** — scheduling frequency, attendance, portal activity
6. **Clinical Progress** — progress tracking entries, goal movement
7. **Faith Integration** — faith profile completeness, care plan integration
8. **Administrative** — insurance, outstanding documents, compliance items

---

## 6.8 Demo Mode

Faithful Workflows defaults to real client data. A demo mode with mock clients is available for training and demonstrations:

- Enable in browser: open the browser console and run:
  ```
  localStorage.setItem('faith_workflows.demo_mode', 'true')
  ```
  Then refresh the page.
- Disable:
  ```
  localStorage.setItem('faith_workflows.demo_mode', 'false')
  ```

Or ask your practice administrator to enable `VITE_ENABLE_FAITH_WORKFLOWS_DEMO=true` at startup.

---

## Next Steps

- [Clinical Chart →](05-clinical-chart.md)
- [Dashboard and Home →](02-dashboard-and-home.md)
- [Client Management →](03-client-management.md)
