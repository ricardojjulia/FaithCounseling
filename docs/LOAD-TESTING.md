# Load Testing — Faith Counseling

Performance and load tests for Faith Counseling are built with [k6](https://k6.io). Every scenario runs real HTTP workflows against the live API using actual seeded credentials — no mocking, no fabricated responses.

---

## Directory Structure

```
tests/load/
  k6/
    config.js                 Shared base URL, credentials, and default thresholds
    lib/
      auth.js                 loginAsAdmin(), loginAsClient(), logout() helpers
      helpers.js              expect2xx(), randomFrom(), uniqueTag() utilities
    scenarios/
      01-auth.js              Auth flow: login → /auth/me → /auth/status → logout
      02-client-intake.js     Intake: create client → assign packet → read consents
      03-session-notes.js     Notes: list clients → create note → submit for review
      04-scheduling.js        Scheduling: appointment types → calendar → waitlist
      05-billing.js           Billing: service codes → invoices → claims → aging report
      06-full-workflow.js     Composite: full counselor session day (highest-value)
  run.sh                      Shell runner — select scenario, override VUs/duration
```

---

## Prerequisites

k6 must be installed. On macOS:

```bash
brew install k6
```

The API must be running before you start any load test:

```bash
pnpm start:api
# or the full stack
pnpm start
```

---

## Quick Start

```bash
# Highest-value test — full counselor workflow
pnpm test:load:full

# Individual focused scenarios
pnpm test:load:auth
pnpm test:load:intake
pnpm test:load:notes

# All six scenarios sequentially
pnpm test:load

# Direct k6 invocation
k6 run tests/load/k6/scenarios/06-full-workflow.js
```

---

## Scenario Logic

### 01 — Auth Flow (`01-auth.js`)

Tests the authentication surface under concurrent logins.

```
login (POST /v1/auth/login)
  → GET /v1/auth/me        — verify profile is returned
  → GET /v1/auth/status    — verify authenticated: true
  → sleep 1s               — simulate active session dwell time
  → POST /v1/auth/logout
```

**Load shape:** ramp 1 → 5 VUs over 30s, hold 1m, ramp down 15s.
**Key thresholds:** login p95 < 1000ms, auth/me p95 < 500ms.

---

### 02 — Client Intake (`02-client-intake.js`)

Tests the new-client onboarding path from creation through intake assignment.

```
login
  → POST /v1/clients                               — create client (firstName, lastName, status: active)
  → POST /v1/clients/:id/intake-packets            — assign intake forms
  → GET  /v1/clients/:id/intake-packets            — read intake back
  → GET  /v1/clients/:id/consents                  — read consents
  → logout
```

Each VU creates a uniquely named client using a `Date.now()` suffix so rows do not collide across concurrent VUs.

**Load shape:** ramp 1 → 3 VUs over 30s, hold 1m, ramp down 15s.
**Key thresholds:** create_client p95 < 1500ms, create_intake p95 < 1500ms.

---

### 03 — Session Notes (`03-session-notes.js`)

Tests the clinical charting path — the most write-heavy counselor workflow.

```
login
  → GET /v1/clients?status=active                                  — list active clients
  → (pick random client)
  → GET /v1/clients/:id/progress-notes                             — read existing chart
  → POST /v1/clients/:id/progress-notes                            — create note with
      noteType, summary, interventions[], scriptureReference,
      spiritualPractices[]
  → POST /v1/clients/:id/progress-notes/:noteId/submit-for-review  — trigger cosign workflow
  → logout
```

409 responses on submit-for-review are treated as acceptable (note already pending) since concurrent VUs may submit the same note in a race.

**Load shape:** ramp 1 → 3 VUs over 30s, hold 1m, ramp down 15s.
**Key thresholds:** create_note p95 < 1500ms, submit_note_for_review p95 < 1500ms.

---

### 04 — Scheduling (`04-scheduling.js`)

Tests the scheduling surface — a high-read, low-write workflow run by schedulers and counselors throughout the day.

```
login
  → GET /v1/appointment-types                            — reference data
  → GET /v1/scheduling/calendar?start=TODAY&end=+7d     — weekly calendar view
  → GET /v1/appointments                                 — appointment list
  → GET /v1/waitlist                                     — waitlist
  → logout
```

**Load shape:** ramp 1 → 5 VUs over 30s, hold 1m, ramp down 15s.
**Key thresholds:** calendar p95 < 1500ms, appointments p95 < 1000ms.

---

### 05 — Billing (`05-billing.js`)

Tests the billing reference and reporting surface.

```
login
  → GET /v1/billing/service-codes
  → GET /v1/billing/fee-schedules
  → GET /v1/billing/invoices
  → GET /v1/billing/claims
  → GET /v1/billing/reports/aging
  → logout
```

**Load shape:** ramp 1 → 3 VUs over 30s, hold 1m, ramp down 15s.
**Key thresholds:** invoices p95 < 1500ms, aging_report p95 < 2000ms.

---

### 06 — Full Counselor Workflow (`06-full-workflow.js`)

The composite scenario. Simulates a complete counselor session day from first login through documentation.

```
login
  → GET /v1/operations/summary                  — dashboard
  → GET /v1/scheduling/calendar                 — week view
  → GET /v1/clients?status=active               — client list
  → (if clients exist)
      GET /v1/clients/:id/progress-notes        — chart review
      GET /v1/clients/:id/treatment-plan
      GET /v1/clients/:id/intake-packets
  → (if no clients)
      POST /v1/clients                           — create one
  → POST /v1/clients/:id/progress-notes         — write session note
  → GET /v1/billing/service-codes               — billing lookup
  → GET /v1/faith/overview                      — faith context
  → logout
```

This is the highest-value scenario for performance baseline because it exercises the widest range of surfaces under concurrent load.

**Load shape:** ramp 1 → 5 VUs over 30s, ramp 5 → 10 VUs over 2m, hold 10 VUs 1m, ramp down 30s. Total: ~4 minutes.
**Key thresholds:** dashboard p95 < 1000ms, calendar p95 < 1500ms, create_note p95 < 2000ms.

---

## Running Against Different Environments

All scenarios read `BASE_URL` from the environment:

```bash
# Local (default)
pnpm test:load:full

# Staging
BASE_URL=https://staging.churchcorecare.app pnpm test:load:full

# Custom credentials
BASE_URL=https://staging.churchcorecare.app \
ADMIN_EMAIL=admin@yourdomain.com \
ADMIN_PASSWORD=YourPassword123 \
./tests/load/run.sh full
```

Environment variables recognized by `config.js`:

| Variable         | Default                          | Purpose                        |
|------------------|----------------------------------|--------------------------------|
| `BASE_URL`       | `http://127.0.0.1:3101`          | API base URL                   |
| `ADMIN_EMAIL`    | `admin@churchcorecare.local`    | Staff admin login              |
| `ADMIN_PASSWORD` | `ChangeMe!Dev2024#`              | Staff admin password           |
| `CLIENT_EMAIL`   | `sarah.kim@example.test`         | Portal client login            |
| `CLIENT_PASSWORD`| `ChangeMe!Client2026#`           | Portal client password         |

---

## Overriding VUs and Duration

The `run.sh` script passes `--vus` and `--duration` through to k6, which overrides the scenario's built-in stage ramp. Use this for quick smoke tests or for stress testing at higher concurrency:

```bash
# Smoke test — 1 VU, 30 seconds
./tests/load/run.sh full --vus 1 --duration 30s

# Stress test — 50 VUs, 10 minutes
./tests/load/run.sh full --vus 50 --duration 10m

# Spike test — very high VU count, short burst
./tests/load/run.sh auth --vus 100 --duration 1m
```

---

## Interpreting Results

k6 prints a summary after every run. Key metrics:

| Metric                  | What it means                                               |
|-------------------------|-------------------------------------------------------------|
| `http_req_duration`     | Total request time. Watch p95 and p99.                      |
| `http_req_failed`       | Fraction of requests that returned non-2xx or errored.      |
| `http_reqs`             | Total request count and throughput (reqs/s).                |
| `checks`                | Pass/fail rate on inline assertions (login returns profile, etc.). |
| `vus` / `vus_max`       | Current and peak virtual user count.                        |
| `iterations`            | How many times the default function completed.              |

A threshold failure causes k6 to exit with a non-zero code, which fails CI pipelines automatically.

Example healthy output fragment:

```
✓ login 200
✓ auth/me 200
✓ auth/me has email

http_req_duration............: avg=142ms  min=48ms   med=120ms  max=890ms  p(90)=310ms  p(95)=440ms
http_req_failed..............: 0.00%   ✓ 0   ✗ 312
checks.......................: 100.00% ✓ 936  ✗ 0
```

---

## Scheduling Load Tests

To run load tests on a recurring schedule (e.g., nightly baseline after each deploy), use the `schedule` skill from Claude Code:

```
schedule the full workflow load test nightly at 2am
```

Or wire it into GitHub Actions manually:

```yaml
# .github/workflows/load-test-nightly.yml
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/load/k6/scenarios/06-full-workflow.js
        env:
          BASE_URL: ${{ secrets.STAGING_API_URL }}
          ADMIN_EMAIL: ${{ secrets.STAGING_ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.STAGING_ADMIN_PASSWORD }}
```

---

## Adding a New Scenario

### 1. Create the scenario file

```js
// tests/load/k6/scenarios/07-my-new-workflow.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx } from '../lib/helpers.js';

export const options = {
  scenarios: {
    my_workflow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m',  target: 3 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{name:my_key_request}': ['p(95)<1500'],
  },
};

export default function () {
  loginAsAdmin();

  const res = http.get(
    `${BASE_URL}/v1/my-endpoint`,
    { ...JSON_PARAMS, tags: { name: 'my_key_request' } },
  );
  expect2xx(res, 'my_key_request');

  sleep(1);
  logout();
  sleep(0.5);
}
```

### 2. Add it to `run.sh`

```bash
# In tests/load/run.sh, add a case:
my_workflow) run_scenario "$K6_DIR/07-my-new-workflow.js" ;;

# And add it to the `all` case:
run_scenario "$K6_DIR/07-my-new-workflow.js"
```

### 3. Add a package.json shortcut (optional)

```json
"test:load:my-workflow": "bash tests/load/run.sh my_workflow"
```

---

## Improving the Test Suite

### Add executor variety

The current scenarios all use `ramping-vus`. k6 supports other executors worth adding:

| Executor              | Use case                                                          |
|-----------------------|-------------------------------------------------------------------|
| `constant-arrival-rate` | Target a fixed request rate (e.g., 100 req/s) regardless of VU count |
| `ramping-arrival-rate`  | Ramp arrival rate from low to high — better for finding throughput limits |
| `per-vu-iterations`     | Each VU runs exactly N iterations — good for deterministic soak tests |

Example `constant-arrival-rate` block:

```js
scenarios: {
  steady_throughput: {
    executor: 'constant-arrival-rate',
    rate: 50,           // 50 iterations/second
    timeUnit: '1s',
    duration: '2m',
    preAllocatedVUs: 20,
    maxVUs: 50,
  },
},
```

### Separate read and write VU pools

The full-workflow scenario mixes reads and writes in a single VU. For more realistic load distribution, split them:

```js
scenarios: {
  readers: {
    executor: 'constant-vus',
    vus: 8,
    duration: '2m',
    exec: 'readWorkflow',   // function readWorkflow() { ... }
  },
  writers: {
    executor: 'constant-vus',
    vus: 2,
    duration: '2m',
    exec: 'writeWorkflow',  // function writeWorkflow() { ... }
  },
},
```

### Add think time variance

The current scenarios use fixed `sleep()` values. Real users have variable pacing:

```js
import { sleep } from 'k6';

// Replace sleep(1) with:
sleep(Math.random() * 2 + 0.5);  // 0.5–2.5s random dwell
```

### Test the client portal separately

The portal uses different credentials and a different auth path. Add a portal scenario using `loginAsClient()` from `lib/auth.js`:

```js
import { loginAsClient, logout } from '../lib/auth.js';

export default function () {
  loginAsClient();

  // GET /v1/portal/overview
  // GET /v1/portal/intake-packets
  // GET /v1/portal/messages
  // GET /v1/portal/appointment-requests

  logout();
}
```

### Output results to a file for trending

```bash
k6 run --out json=test-results/load-$(date +%Y%m%d).json \
  tests/load/k6/scenarios/06-full-workflow.js
```

Add `test-results/load-*.json` to `.gitignore` and pipe them into a dashboard (Grafana, k6 Cloud, or a simple jq summary script) to track p95 trends across builds.

### Raise thresholds progressively

Start conservative (p95 < 2000ms) and tighten after each performance improvement. The thresholds in `config.js` are the global floor. Per-scenario `thresholds` blocks override them for specific request tags.

```js
// config.js — tighten the global floor after improvements
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],  // was 2000/4000
  http_req_failed:   ['rate<0.01'],                  // was 0.02
};
```

### Optional external metrics sink

If you need k6 metrics in an external dashboard, point k6 at whatever remote-write backend your environment already provides. Faith Counseling no longer ships a local Prometheus observability stack as part of the standard development workflow.

---

## Security Notes

- Load tests use the local seeded demo credentials. Never run them against production with real patient data.
- Test-generated clients are named `Load Test-<timestamp>` and can be cleaned up after a run with a targeted SQL delete or by resetting the demo dataset with `pnpm demo:sql:refresh`.
- The `submit-for-review` step in scenario 03 intentionally accepts 409 as a non-failure to handle concurrent VUs submitting the same note. Do not loosen other error tolerance without understanding the implication.
