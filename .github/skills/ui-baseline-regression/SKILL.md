# Skill: UI Baseline & Regression Verification (Playwright)

## Description
This skill enables an agent to:
- Crawl and map the ChurchCore Care application's UI
- Generate a structured baseline of screens and navigation
- Detect regressions and meaningful UI changes after code updates

---

## Inputs

- `baseUrl`: Application entry point (default: `http://localhost:5173`)
- `auth` (optional): Credentials or login steps
- `mode`: `baseline` | `compare`
- `baselinePath`: Path to stored baseline data (default: `test-results/screen-baseline.json`)
- `scope` (optional): Routes or modules to include/exclude

---

## Outputs

### Baseline Mode
- `test-results/ui-map.json`
- `test-results/screen-baseline.json`
- `test-results/screenshots/`
- `test-results/baseline-summary.md`

### Comparison Mode
- `test-results/ui-current.json`
- `test-results/ui-diff.json`
- `test-results/comparison-summary.md`
- `test-results/screenshots-diff/`

---

## Execution Steps

### 1. Initialize
- Launch browser via Playwright
- Navigate to `baseUrl`
- Authenticate if required (check `tests/e2e/helpers.mjs` for auth helpers)
- Wait for app to stabilize (network idle or stable DOM)

### 2. Traverse UI

Use a queue-based traversal:

For each screen/state:
1. Identify the screen
2. Capture metadata
3. Capture screenshot
4. Detect navigation targets (links, buttons, tabs, menu items)
5. Visit unvisited targets
6. Track visited states to prevent loops

### 3. Identify Screens

Generate a `screen_id` using (in priority order):
1. `data-testid` attributes (preferred)
2. Route/URL path
3. Page heading + route
4. Navigation path + DOM structure fingerprint

### 4. Capture Metadata

For each screen, capture:

```json
{
  "screen_id": "",
  "screen_name": "",
  "route": "",
  "url": "",
  "ui_state_type": "page|tab|modal|drawer|panel|wizard_step",
  "navigation_path": [],
  "primary_actions": [],
  "links": [],
  "tabs": [],
  "forms": [],
  "tables": [],
  "visible_errors": [],
  "console_errors": [],
  "network_failures": [],
  "screenshot": ""
}
```

### 5. Build UI Map

```json
{
  "generated_at": "",
  "base_url": "",
  "mode": "baseline|compare",
  "screens": [],
  "navigation_graph": {
    "nodes": [],
    "edges": []
  }
}
```

---

## Comparison Logic

When in `compare` mode:

1. Load `baselinePath`
2. Run traversal to produce `ui-current.json`
3. For each baseline screen, find the best match in current using matching rules
4. Classify each difference:

| Category | Meaning |
|---|---|
| `regression` | Previously working behavior is broken |
| `expected_change` | Intentional and acceptable change |
| `new_screen` | New UI added without breaking existing flows |
| `informational` | Low-impact change |
| `needs_review` | Uncertain or ambiguous |

5. Assign severity:

| Severity | Condition |
|---|---|
| `high` | Broken navigation, missing screen, blocking error |
| `medium` | Partial workflow break, missing section |
| `low` | Minor UI drift, text changes |

---

## Selector Strategy

Prefer in order:
1. `data-testid` attributes
2. ARIA roles (`getByRole`)
3. Accessible labels (`getByLabel`, `getByText`)
4. CSS selectors as last resort

Never use positional selectors (nth-child, :first) unless no stable alternative exists.

---

## Console & Network Monitoring

Attach listeners before navigation:

```js
page.on('console', msg => { if (msg.type() === 'error') recordConsoleError(msg); });
page.on('response', res => { if (res.status() >= 400) recordNetworkFailure(res); });
```

---

## Screenshot Strategy

- Capture full-page screenshot per screen visit
- On comparison: capture both baseline and current thumbnails for diffed screens
- Store under `test-results/screenshots/{screen_id}.png`
- Diff screenshots under `test-results/screenshots-diff/{screen_id}-diff.png`

---

## Decision Rule

- All baseline screens still reachable and usable → **PASS**
- Any baseline screen broken or unreachable → **FAIL**
- Uncertain match or ambiguous change → **NEEDS REVIEW**

A difference is NOT a failure. A broken accepted behavior IS a failure.

---

## Integration Notes

- Playwright config is at `playwright.config.js`
- E2E helpers are at `tests/e2e/helpers.mjs`
- Existing smoke tests are at `tests/e2e/` — reference but do not replace them
- Output to `test-results/` (already gitignored)
