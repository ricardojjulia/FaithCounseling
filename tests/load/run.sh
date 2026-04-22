#!/usr/bin/env bash
# Run k6 load tests for FaithCounseling
#
# Usage:
#   ./tests/load/run.sh [scenario] [--vus N] [--duration Xs]
#
# Scenarios:
#   all            Run all scenarios sequentially (default)
#   auth           01-auth.js
#   intake         02-client-intake.js
#   notes          03-session-notes.js
#   scheduling     04-scheduling.js
#   billing        05-billing.js
#   full           06-full-workflow.js
#
# Examples:
#   ./tests/load/run.sh full
#   ./tests/load/run.sh full --vus 20 --duration 3m
#   BASE_URL=https://staging.faithcounseling.app ./tests/load/run.sh all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$SCRIPT_DIR/k6/scenarios"

# Defaults
SCENARIO="${1:-all}"
shift || true

K6_EXTRA_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --vus)       K6_EXTRA_ARGS+=(--vus "$2");      shift 2 ;;
    --duration)  K6_EXTRA_ARGS+=(--duration "$2"); shift 2 ;;
    *)           K6_EXTRA_ARGS+=("$1");             shift   ;;
  esac
done

run_scenario() {
  local file="$1"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Running: $(basename "$file")"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  k6 run "${K6_EXTRA_ARGS[@]}" "$file"
}

case "$SCENARIO" in
  auth)       run_scenario "$K6_DIR/01-auth.js" ;;
  intake)     run_scenario "$K6_DIR/02-client-intake.js" ;;
  notes)      run_scenario "$K6_DIR/03-session-notes.js" ;;
  scheduling) run_scenario "$K6_DIR/04-scheduling.js" ;;
  billing)    run_scenario "$K6_DIR/05-billing.js" ;;
  full)       run_scenario "$K6_DIR/06-full-workflow.js" ;;
  all)
    run_scenario "$K6_DIR/01-auth.js"
    run_scenario "$K6_DIR/02-client-intake.js"
    run_scenario "$K6_DIR/03-session-notes.js"
    run_scenario "$K6_DIR/04-scheduling.js"
    run_scenario "$K6_DIR/05-billing.js"
    run_scenario "$K6_DIR/06-full-workflow.js"
    ;;
  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Valid: all | auth | intake | notes | scheduling | billing | full"
    exit 1
    ;;
esac
