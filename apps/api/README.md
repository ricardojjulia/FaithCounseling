# @churchcore/api

Node.js HTTP API for the ChurchCore Care platform.

## Development Credentials

The migration script seeds a default admin account and a demo client portal account when running in development mode. These credentials are **for local development only** and must never be used in production.

| Account | Email | Default password |
|---------|-------|-----------------|
| Staff admin | `admin@churchcorecare.local` | `ChangeMe!Dev2024#` |
| Client portal (demo) | `sarah.kim@example.test` | `ChangeMe!Client2026#` |

> **Important:** Change these immediately if you are running a shared or semi-public environment. The passwords above are well-known and offer no security.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | No | MySQL port (default: 3306) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_ENCRYPTION_KEY` | Yes | 64-character hex key for AES-256-GCM field encryption. Generate with: `openssl rand -hex 32` |
| `DB_ENCRYPTION_HMAC_KEY` | Yes | 64-character hex key for HMAC-SHA256 lookup hashes. Generate with: `openssl rand -hex 32` |
| `SESSION_SECRET` | Yes | Session signing secret. Generate with: `openssl rand -hex 32` |
| `NODE_ENV` | No | `development` (default) or `production` |
| `SEED_DEV_PORTAL_DATA` | No | Set to `false` to skip seeding the demo portal client on startup |

## Running Locally

```sh
# From repo root
pnpm start
```

See the root `README.md` for full setup instructions.
