# SaaS Deployment Spec — ChurchCore Care

**Date:** April 24, 2026
**Status:** Decided — Google Cloud Platform
**Companion docs:**

- `docs/cloud-implementation.md` — GCP architecture detail: per-tenant Cloud SQL, wildcard subdomain routing, practice provisioning flow, cost model, Cloud Armor, gap log
- `docs/BACKUP-RUNBOOK.md` — Cloud SQL backup configuration, PITR, per-tenant restore procedure
- `docs/STACK-MIGRATION-PLAN.md` — future stack migration evaluation (Next.js + Supabase)

---

## Decision Rationale

GCP was chosen over AWS on April 24, 2026 for three reasons:

1. **Multi-tenant provisioning fit** — the per-practice Cloud SQL isolation model, wildcard subdomain routing via GCP Load Balancer, and Cloud Run's container model map directly to the architecture in `cloud-implementation.md`. The equivalent AWS build (ECS + RDS + ALB) would be more verbose with no meaningful advantage for this workload.
2. **Operational simplicity** — Cloud Run requires no cluster management, task definition versioning, or launch type configuration. For a small team, this reduces operational overhead significantly versus ECS Fargate.
3. **Existing architecture investment** — `cloud-implementation.md` was already a detailed GCP design. All gap-resolution tooling (`ops/verify-backups.mjs`, `ops/migrate-all-tenants.mjs`, `.github/workflows/deploy.yml`) was built for GCP.

AWS remains a valid alternative if the team later acquires significant AWS expertise or consolidates existing tooling there. The application code is cloud-agnostic.

---

## Overview

This document covers deploying ChurchCore Care's current stack (Node.js + MySQL + React/Vite) to GCP with no application code changes beyond Dockerfiles and environment configuration.

For the full architecture including subdomain routing, tenant provisioning flow, Cloud SQL tiers, and cost model, see `docs/cloud-implementation.md`.

---

## HIPAA Requirement

Every GCP service that stores or processes PHI must be covered under Google's BAA. The BAA is available at no additional cost under the standard GCP agreement — sign it before writing any PHI to Cloud SQL.

Services in scope for the BAA:

- Cloud SQL (MySQL instances — all tenant DBs)
- Cloud Run (API and Worker — process PHI in memory)
- GCP Secret Manager (stores encryption keys)
- Cloud Logging (may capture PHI in error logs — configure log exclusions)

Firebase Hosting serves only static files (`apps/web` build output). PHI never passes through it — it is covered under the same GCP BAA but no special configuration is needed.

---

## Services to Deploy

| Service | What it is | GCP deployment unit |
| --- | --- | --- |
| `apps/api` | Node.js HTTP (port 3001) | Cloud Run Service (always-on, min 1 instance) |
| `apps/worker` | Reminder polling, multi-tenant | Cloud Run Service (always-on, min 1 instance) |
| `apps/web` | React 18 Vite SPA | Firebase Hosting (static files, no server) |

`apps/web` has no server process in production. `pnpm --filter web build` outputs to `apps/web/dist/` and is deployed to Firebase Hosting via the CI workflow.

---

## Dockerfiles

These Dockerfiles are the starting point. They should live at `apps/api/Dockerfile` and `apps/worker/Dockerfile` respectively.

### apps/api

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @churchcore/api...

COPY apps/api/src/ ./apps/api/src/

EXPOSE 3001
CMD ["node", "apps/api/src/index.js"]
```

### apps/worker

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile --filter @churchcore/worker...

COPY apps/worker/src/ ./apps/worker/src/

CMD ["node", "apps/worker/src/index.js"]
```

### apps/web (CI build step only — not a running container)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @churchcore/web...

COPY apps/web/ ./apps/web/
RUN pnpm --filter web build

# apps/web/dist/ is uploaded to Firebase Hosting by the CI workflow
```

---

## Environment Variables (Production)

All secrets are stored in GCP Secret Manager and injected into Cloud Run at deploy time via `--set-secrets`. Never set secrets as plain `--set-env-vars`.

### API (`apps/api`)

| Variable | Type | Notes |
| --- | --- | --- |
| `DB_ENCRYPTION_KEY` | Secret | AES-256-GCM key for PHI field encryption — highest sensitivity |
| `DB_ENCRYPTION_HMAC_KEY` | Secret | HMAC key for deterministic lookups; defaults to `DB_ENCRYPTION_KEY` if unset |
| `SESSION_SECRET` | Secret | HMAC key for session signing |
| `TENANT_DB_MAP` | Secret | JSON map `tenantId → {host,port,database,user,password,ssl}` |
| `JITSI_APP_ID` | Secret | 8x8 JaaS platform-level app ID (practices may override per-practice via admin UI) |
| `JITSI_API_KEY_ID` | Secret | 8x8 JaaS API key ID |
| `JITSI_PRIVATE_KEY_BASE64` | Secret | 8x8 JaaS RS256 private key, base64-encoded PEM |
| `NODE_ENV` | Config | `production` |
| `JITSI_DOMAIN` | Config | `8x8.vc` |
| `ENABLE_TENANT_HOST_ROUTING` | Config | `true` |
| `TENANT_STRICT_HOST_ROUTING` | Config | `true` (fail-closed — required in production) |
| `SENDGRID_FROM_EMAIL` | Config | `noreply@churchcorecare.com` |

### Worker (`apps/worker`)

| Variable | Type | Notes |
| --- | --- | --- |
| `DB_ENCRYPTION_KEY` | Secret | Same key as API — required for decrypting client contact info before dispatch |
| `TENANT_DB_MAP` | Secret | Same map as API — worker iterates all tenants each poll cycle |
| `SENDGRID_API_KEY` | Secret | Required for email reminder dispatch |
| `TWILIO_ACCOUNT_SID` | Secret | Required for SMS reminder dispatch |
| `TWILIO_AUTH_TOKEN` | Secret | Twilio auth token |
| `NODE_ENV` | Config | `production` |
| `SENDGRID_FROM_EMAIL` | Config | `noreply@churchcorecare.com` |
| `TWILIO_FROM_NUMBER` | Config | E.164 format, e.g. `+15005550006` |

**`DB_ENCRYPTION_KEY` rotation:** decrypt all PHI columns with the old key, re-encrypt with the new key using a one-off migration script, then rotate the Secret Manager version. Never rotate in-place — the API will be decrypting live PHI with the active key throughout.

---

## Horizontal Scaling

The API is stateless between requests. Sessions are stored in the MySQL `sessions` table (DB-backed), so multiple Cloud Run instances share session state via the same Cloud SQL database — no sticky sessions or session store required.

Cloud Run scales the API horizontally by increasing `--max-instances`. The worker is single-instance (`--max-instances=1`) — the polling loop is not designed for concurrent execution across multiple instances.

---

## Security Checklist Before Launch

### Infrastructure

- [ ] HIPAA BAA signed with Google before first PHI written to Cloud SQL
- [ ] All Cloud SQL instances are private-IP only — no public endpoint
- [ ] Cloud SQL Auth Proxy sidecar configured for all Cloud Run services
- [ ] `require_ssl = ON` on every Cloud SQL instance
- [ ] Cloud Armor WAF attached to GCP Load Balancer (see `cloud-implementation.md`)
- [ ] VPC configured — Cloud Run and Cloud SQL in the same VPC, no public database access

### Secrets

- [ ] `DB_ENCRYPTION_KEY` in Secret Manager — IAM restricted to API Cloud Run service account only; Worker has its own binding
- [ ] No secrets in Dockerfiles, `--set-env-vars`, or container image layers
- [ ] Cloud Run service accounts follow least-privilege — Secret Manager `secretAccessor` only for the secrets each service needs
- [ ] Workload Identity Federation used for CI/CD — no static service account JSON keys in GitHub

### Logging & Audit

- [ ] Cloud Logging retention set to minimum 6 years (HIPAA audit log requirement)
- [ ] Log exclusion filters configured to prevent PHI from appearing in Cloud Run request logs
- [ ] Cloud SQL audit logs enabled on all tenant instances
- [ ] Cloud Armor denial logs routed to Cloud Logging with an alert policy for >50 denials/min

### Application

- [ ] `TENANT_STRICT_HOST_ROUTING=true` in production — API rejects requests for unknown tenant slugs
- [ ] Container images built from `node:20-alpine` — no shell tools, no package managers in final image
- [ ] `apps/web/dist/` contains no secrets, API keys, or environment-specific config — all config is fetched at runtime from the API

---

## CI/CD

The deploy pipeline lives at `.github/workflows/deploy.yml`. Flow on push to `main`:

1. Install dependencies, run API tests
2. Build and push `api` and `worker` Docker images to GCP Artifact Registry
3. Build `apps/web` static files and upload as a CI artifact
4. Deploy both services to the **staging** Cloud Run environment
5. Run smoke tests against staging (`/health/live`, `/health/ready`)
6. Run `ops/migrate-all-tenants.mjs` against production tenant DBs
7. Deploy both services to **production** Cloud Run
8. Deploy `apps/web` dist to Firebase Hosting (live channel)
9. Run production health check

GitHub Environments (`staging`, `production`) gate the deploy steps. Production requires a passing staging smoke test — there is no manual approval step, but the staging gate is mandatory.

See `.github/workflows/deploy.yml` for the full implementation.

---

## References

- `docs/cloud-implementation.md` — full GCP architecture, provisioning flow, cost model, gap log
- `docs/BACKUP-RUNBOOK.md` — Cloud SQL backup config, PITR, restore procedure
- `.github/workflows/deploy.yml` — staging → production deploy pipeline
- `ops/migrate-all-tenants.mjs` — bulk schema migration across all tenant DBs
- `ops/verify-backups.mjs` — nightly backup status check
- `apps/api/src/lib/encrypt.js` — AES-256-GCM PHI encryption (key rotation notes inline)
- `apps/api/src/db/pools.js` — per-tenant pool registry (`TENANT_DB_MAP` parsing)
