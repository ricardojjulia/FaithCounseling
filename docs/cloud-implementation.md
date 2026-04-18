# Cloud Implementation Plan — FaithCounseling SaaS

**Date:** April 17, 2026
**Status:** Planning / Pre-implementation

---

## Overview

This document describes the recommended cloud architecture for operating FaithCounseling as a fully hosted, multi-tenant SaaS platform where each counseling practice has its own isolated MySQL database and its own subdomain.

The platform consists of **two distinct applications**:

| App | URL | Purpose |
|---|---|---|
| **Platform Admin** | `tenantadmin.faithcounseling.com` | FaithCounseling staff portal — provisions new practices, manages billing, monitors the platform |
| **Practice App** | `clientname.faithcounseling.com` | The counseling platform — one subdomain per practice, used by counselors and clients |

These are separate frontends backed by either a shared API (with route-level authorization separation) or two separate Cloud Run services.

---

## Core Constraint: HIPAA BAA Required

This application handles PHI (clients, diagnoses, addresses, SSNs, clinical notes). Every infrastructure provider that touches compute or database resources must be willing to sign a Business Associate Agreement (BAA).

**Providers with HIPAA BAA (no additional cost):**
- Google Cloud Platform ✓
- AWS ✓
- Azure ✓

**Frontend CDN only (no PHI passes through):**
- Firebase Hosting (GCP) ✓ — covered under the same GCP BAA

---

## Recommended Stack: GCP Only

```
 faithcounseling.com DNS
 ┌──────────────────────────────────────────────────────────────────┐
 │  *.faithcounseling.com  →  GCP Cloud Load Balancer               │
 │  tenantadmin.faithcounseling.com  →  Firebase Hosting            │
 │  Wildcard TLS cert via GCP Certificate Manager                   │
 └───────┬──────────────────────────────────────┬───────────────────┘
         │ *.faithcounseling.com                │ tenantadmin.*
         │                                      │
┌────────▼──────────────────┐       ┌───────────▼──────────────────┐
│  Cloud Run — apps/api     │       │  Firebase Hosting             │
│  Reads Host header →      │       │  apps/platform (new)          │
│  extracts slug →          │       │  FaithCounseling staff only   │
│  resolves tenant pool     │       │  Provisions practices,        │
│                           │       │  manages billing, monitors    │
│  Also serves:             │       └───────────┬──────────────────┘
│  /platform-api/* routes   │                   │ HTTPS (platform API)
│  for platform admin ops   │◄──────────────────┘
└──────┬──────────────┬─────┘
       │              │
┌──────▼──────┐  ┌────▼────────────────────────────────────────────┐
│ Cloud Run   │  │  Cloud SQL for MySQL (GCP, private IP)           │
│ Job (Worker)│  │                                                  │
│ + Cloud     │  │  ┌───────────────────────────────────────────┐  │
│ Scheduler   │  │  │ platform DB  — tenants, slugs, billing,   │  │
└─────────────┘  │  │ DB credential references, provisioning    │  │
                 │  └───────────────────────────────────────────┘  │
                 │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
                 │  │  DB      │  │  DB      │  │  DB      │      │
                 │  │ grace-   │  │ river-   │  │ harbor-  │      │
                 │  │ counsel  │  │ view     │  │ hope     │      │
                 │  └──────────┘  └──────────┘  └──────────┘      │
                 │   one isolated Cloud SQL instance per practice   │
                 └─────────────────────────────────────────────────┘
```

---

## Two-Application Model

### 1. Practice App — `clientname.faithcounseling.com`

This is the existing `apps/web` React SPA — the counseling platform used by counselors and clients every day. No code changes are required to the frontend itself.

- Each practice gets a **slug** chosen at sign-up (e.g., `gracecounsel`, `riverview`)
- The subdomain `gracecounsel.faithcounseling.com` routes to the same Cloud Run API service
- The API extracts the slug from the `Host` header, looks it up in the platform DB, and resolves that practice's DB pool
- The API already enforces `tenant_id` on every query — this remains unchanged

### 2. Platform Admin App — `tenantadmin.faithcounseling.com`

This is a **new application** (`apps/platform`) built specifically for FaithCounseling staff. It is entirely separate from the practice app and never shares a session or auth context with practice users.

**Capabilities:**
- Create a new practice (triggers provisioning flow)
- Assign a subdomain slug
- Monitor all Cloud SQL instances
- View billing and subscription status
- Suspend or deprovision a practice
- View platform-level audit logs

**Auth:** Separate login with a hardened admin credential — never shares auth with counselor/client accounts. Recommend Google OAuth restricted to `@faithcounseling.com` staff accounts via Firebase Auth or GCP Identity-Aware Proxy (IAP).

---

## Subdomain Routing Architecture

### DNS

```
*.faithcounseling.com          A    <GCP Load Balancer IP>
tenantadmin.faithcounseling.com CNAME <Firebase Hosting target>
```

A wildcard DNS record routes all practice subdomains to the GCP Load Balancer. The `tenantadmin` subdomain is a separate record pointing to Firebase Hosting.

### TLS

GCP Certificate Manager issues a **wildcard certificate** for `*.faithcounseling.com`. This covers every practice subdomain automatically with no per-practice cert provisioning.

### Tenant Resolution in the API

On every incoming request the API:

1. Reads the `Host` header (e.g., `gracecounsel.faithcounseling.com`)
2. Strips the base domain to extract the slug (`gracecounsel`)
3. Looks up the slug in the platform DB to get the `tenant_id` and Cloud SQL credentials reference
4. Resolves the mysql2 pool from the pool registry (cached after first lookup)
5. All downstream query functions use that pool — `tenant_id` enforcement remains unchanged

```js
// apps/api/src/lib/resolveTenant.js
export async function resolveTenant(host) {
  const slug = host.replace(/\.faithcounseling\.com$/, '').toLowerCase();
  const tenant = await platformDb.query(
    'SELECT tenant_id, db_secret_name FROM tenants WHERE slug = ? AND status = "active"',
    [slug]
  );
  if (!tenant) throw new HttpError(404, 'Practice not found');
  return tenant;
}
```

**Security note:** The slug lookup must hit the platform DB (not a JWT claim) so that suspended or deprovisioned practices are rejected in real time — a cached token cannot outlive a suspension.

---

## Required Architectural Change: Per-Tenant Pool Registry

The current `apps/api/src/db/pool.js` is a singleton — one pool, one database. Per-practice isolation requires a **pool registry** that resolves a DB connection from the incoming request's tenant context.

```js
// new: apps/api/src/db/pools.js
const registry = new Map(); // tenantId → mysql2 Pool

export async function getPool(tenantId) {
  if (registry.has(tenantId)) return registry.get(tenantId);
  const creds = await lookupTenantDb(tenantId); // reads from platform DB
  const pool = mysql.createPool({ ...creds, ssl: { rejectUnauthorized: true } });
  registry.set(tenantId, pool);
  return pool;
}
```

Every query function in `apps/api/src/db/queries/` changes from using the singleton pool to accepting a pool argument resolved per-request. This is a systematic but mechanical refactor of all 26 query files — no logic changes required.

---

## Practice Provisioning Flow

Triggered by the Platform Admin app when a FaithCounseling staff member creates a new practice.

1. Staff completes new-practice form in `tenantadmin.faithcounseling.com` — enters practice name, plan tier, and subdomain slug
2. Platform API validates slug uniqueness, creates a `tenants` row in the platform DB with `status = 'provisioning'`
3. Platform API enqueues a **Cloud Tasks** job (or triggers a Cloud Run Job directly) for async provisioning
4. Provisioning job:
   a. Creates a new Cloud SQL instance (or database, depending on tier — see below)
   b. Creates a dedicated MySQL user scoped to that database only
   c. Stores credentials in **GCP Secret Manager** as `practice/{slug}/db-credentials`
   d. Runs `apps/api/src/db/migrate.js` against the new DB to create all 75 tables
   e. Seeds the practice admin account
   f. Updates `tenants` row to `status = 'active'`, records the `db_secret_name`
5. DNS is already live via the wildcard record — `slug.faithcounseling.com` starts routing immediately once `status = 'active'`
6. Staff receives a confirmation in the Platform Admin app; practice admin receives a welcome email with their login URL

---

## Cloud SQL Deployment Tiers

### Option A — Instance-per-Practice (Recommended)

Each practice gets a dedicated Cloud SQL instance. Provides the strongest isolation guarantee and enables the marketing claim that each practice's data is fully isolated.

| Practice tier | Cloud SQL SKU | $/month per practice |
|---|---|---|
| Solo (1–2 counselors) | `db-g1-small` (shared vCPU, 1.7 GB) | ~$20–25 |
| Small group (3–10 counselors) | `db-n1-standard-1` (1 vCPU, 3.75 GB) | ~$60–70 |
| Mid-size (10+ counselors) | `db-n1-standard-2` (2 vCPU, 7.5 GB) | ~$115–130 |

### Option B — Database-per-Practice on Shared Cloud SQL (Cost-Efficient)

Multiple practices share one Cloud SQL instance, each isolated to its own MySQL database with a dedicated MySQL user and grant. Suitable for early-stage cost control.

| Instance | Practices hosted | Instance cost | Per-practice effective cost |
|---|---|---|---|
| `db-n1-standard-2` | 10–15 solo practices | ~$115/month | ~$8–12/month |
| `db-n1-standard-4` | 30–40 practices | ~$230/month | ~$6–8/month |

**Recommendation:** Use Option A. The HIPAA and marketing value of full instance isolation outweighs the cost difference at the pricing tiers shown below.

---

## Monthly Cost Model

### Fixed Platform Costs (regardless of practice count)

| Component | Configuration | $/month |
|---|---|---|
| Firebase Hosting | `apps/platform` admin SPA (static, no PHI) | $0–5 |
| Cloud Run — API | Min 1 instance, 1 vCPU / 1 GB RAM | $35–55 |
| Cloud Run Job — Worker | Hourly Cloud Scheduler trigger | $3–5 |
| Cloud SQL — Platform DB | `db-g1-small` (tenants, slugs, billing, provisioning) | $20 |
| GCP Cloud Load Balancer | Wildcard subdomain routing + SSL offload | $18–25 |
| GCP Certificate Manager | Wildcard `*.faithcounseling.com` TLS cert | $0 (managed) |
| GCP Secret Manager | ~100 secrets (DB credentials per practice) | $1 |
| Cloud Logging / Monitoring | Basic tier | $0–10 |
| **Fixed subtotal** | | **~$100–130/month** |

### Variable Per-Practice Costs (Option A, instance-per-practice)

| Practice count | Per-practice cost | Variable total | **Monthly total** |
|---|---|---|---|
| 5 practices | $25/ea (solo tier) | $125 | **~$195/month** |
| 20 practices | $25/ea | $500 | **~$580/month** |
| 50 practices | $25/ea | $1,250 | **~$1,340/month** |
| 100 practices | $25/ea | $2,500 | **~$2,580/month** |
| 100 practices (small group tier) | $65/ea | $6,500 | **~$6,580/month** |

---

## Suggested SaaS Pricing

| Plan | Target practice size | Infra cost | Suggested retail price | Gross margin |
|---|---|---|---|---|
| Solo | 1–2 counselors | ~$25/month | $79–99/month | 68–75% |
| Practice | 3–10 counselors | ~$65/month | $199–299/month | 67–78% |
| Group | 10–25 counselors | ~$120/month | $399–599/month | 70–80% |

---

## Build Work Required

The following work items are required before launch. Items marked **Blocks launch** must be complete before any practice can go live.

### New applications

| Work item | Effort | Blocks launch? |
|---|---|---|
| `apps/platform` — Platform Admin SPA (new React app) | Large | Yes |
| Platform Admin: new practice form, provisioning trigger, slug selection | Medium | Yes |
| Platform Admin: practice list, status, suspension controls | Medium | Yes |
| Platform Admin: billing/subscription dashboard | Medium–Large | Soft |
| GCP Identity-Aware Proxy (IAP) or Firebase Auth for `tenantadmin.*` — staff-only login | Small–Medium | Yes |

### API changes

| Work item | Effort | Blocks launch? |
|---|---|---|
| Tenant resolution from `Host` header (`resolveTenant.js`) | Small | Yes |
| Per-tenant pool registry (`apps/api/src/db/pools.js`) | Medium | Yes |
| Platform API routes (`/platform-api/*`) for admin operations, guarded separately from practice routes | Medium | Yes |
| Platform DB schema (slugs, `db_secret_name`, `status`, billing tier) | Small–Medium | Yes |
| Store/resolve DB credentials in GCP Secret Manager | Small | Yes |
| Practice-scoped worker (run reminders against per-practice DB) | Medium | Yes |

### Infrastructure

| Work item | Effort | Blocks launch? |
|---|---|---|
| Wildcard DNS record `*.faithcounseling.com` → GCP Load Balancer | Small | Yes |
| GCP Certificate Manager — wildcard TLS cert for `*.faithcounseling.com` | Small | Yes |
| GCP Cloud Load Balancer config (URL map, backend service to Cloud Run) | Small–Medium | Yes |
| Cloud Run Dockerfiles for `apps/api` and `apps/worker` | Small | Yes |
| Firebase Hosting project setup for `apps/platform` + `tenantadmin.*` domain | Small | Yes |
| Provisioning Cloud Run Job + Cloud Tasks queue | Medium | Yes |
| Stripe or billing integration for subscription management | Medium–Large | Soft (can bill manually early) |

### No changes required

| Work item | Notes |
|---|---|
| `apps/web` (practice frontend) | No code changes — existing SPA, served as-is |
| `apps/api/src/db/schema.sql` | No changes — 75 tables reused as-is per practice |
| `apps/api/src/db/migrate.js` | No changes — reused by provisioning job |
| `apps/api/src/lib/encrypt.js` | No changes — AES-256-GCM layer is DB-agnostic |

---

## Security Notes

- All Cloud SQL instances must be configured with `require_ssl = ON` and `DB_SSL=true` in the API
- DB credentials must be stored exclusively in GCP Secret Manager — never in environment variables in Cloud Run service definitions
- The platform DB connection (for the tenant registry) should use a dedicated low-privilege MySQL user scoped to read-only access on the provisioning tables
- Cloud Run services should use Workload Identity to access Secret Manager — no service account key files
- The `apps/platform` Firebase Hosting deployment (Platform Admin SPA) serves only static files; PHI never passes through Firebase — it is covered under the GCP BAA
- The `apps/web` (practice SPA) is served via Cloud Run or a separate Firebase Hosting site; PHI never resides in the static build
- Platform Admin routes (`/platform-api/*`) must verify a staff-level auth token on every request and must never accept practice-user session tokens
- Subdomain slug resolution must query the platform DB on every request — do not cache tenant status in a JWT, as suspended practices must be blocked immediately
- Cloud SQL instances should be private IP only, accessed via Cloud SQL Auth Proxy sidecar in Cloud Run

---

## References

- `apps/api/src/db/pool.js` — current singleton pool (to be replaced by pool registry)
- `apps/api/src/db/migrate.js` — migration runner (reused per-practice during provisioning)
- `apps/api/src/db/schema.sql` — canonical schema (no changes needed)
- `apps/api/src/db/queries/` — 26 query files (systematic refactor to accept pool argument)
- `docs/DATABASE-IMPLEMENTATION.md` — current database setup guide
- `apps/platform/` — new Platform Admin app (to be created)
- `apps/api/src/lib/resolveTenant.js` — new tenant resolution from Host header (to be created)
