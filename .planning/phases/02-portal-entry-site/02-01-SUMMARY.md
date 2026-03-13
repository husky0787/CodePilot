---
phase: 02-portal-entry-site
plan: 01
subsystem: api
tags: [e2b, sandbox, anthropic, api-routes, nextjs]

# Dependency graph
requires:
  - phase: 01-e2b-sandbox-template
    provides: E2B sandbox template (9114lthidrvmoik0fcdw)
provides:
  - POST /api/sandbox/create API route (Key validation + sandbox creation)
  - GET /api/sandbox/status API route (sandbox liveness + readiness check)
  - validateAnthropicKey utility (count_tokens endpoint)
  - createSandbox / checkSandbox E2B SDK wrappers
affects: [02-portal-entry-site]

# Tech tracking
tech-stack:
  added: [e2b]
  patterns: [server-side E2B SDK wrapper, Anthropic key validation via count_tokens, Next.js App Router API routes]

key-files:
  created:
    - apps/site/src/lib/validate-key.ts
    - apps/site/src/lib/e2b.ts
    - apps/site/src/app/api/sandbox/create/route.ts
    - apps/site/src/app/api/sandbox/status/route.ts
    - apps/site/src/__tests__/sandbox-create.test.ts
    - apps/site/src/__tests__/sandbox-restore.test.ts
  modified:
    - apps/site/package.json

key-decisions:
  - "Use fetch for Anthropic key validation instead of @anthropic-ai/sdk (lightweight, no extra dependency)"
  - "Tests use node --experimental-strip-types --experimental-test-module-mocks for e2b module mocking"

patterns-established:
  - "E2B SDK wrapper pattern: thin async functions in lib/e2b.ts, env-based API key"
  - "API key validation pattern: count_tokens endpoint for zero-cost key check"

requirements-completed: [PORT-02]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 02 Plan 01: Sandbox Backend API Summary

**E2B sandbox management API with Anthropic key validation via count_tokens, sandbox create/status routes, and 9 unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T03:32:46Z
- **Completed:** 2026-03-13T03:37:15Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Installed e2b SDK and created server-side wrapper for sandbox create/connect/health-check
- Built Anthropic API Key validation using the free count_tokens endpoint (no SDK dependency)
- Created two Next.js App Router API routes: POST /api/sandbox/create and GET /api/sandbox/status
- 9 unit tests covering key validation, sandbox creation, and sandbox restore scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Install e2b SDK and create server utility libraries** - `6999a26` (feat)
2. **Task 2: Create sandbox API Routes (create + status)** - `09ce59f` (feat)
3. **Task 3: Create sandbox API unit tests** - `358e86b` (test)

## Files Created/Modified
- `apps/site/src/lib/validate-key.ts` - Anthropic API Key validation via count_tokens endpoint
- `apps/site/src/lib/e2b.ts` - E2B SDK wrapper: createSandbox, checkSandbox, TEMPLATE_ID
- `apps/site/src/app/api/sandbox/create/route.ts` - POST endpoint: validate key + create sandbox
- `apps/site/src/app/api/sandbox/status/route.ts` - GET endpoint: check sandbox liveness + readiness
- `apps/site/src/__tests__/sandbox-create.test.ts` - 6 tests for key validation + sandbox creation
- `apps/site/src/__tests__/sandbox-restore.test.ts` - 3 tests for sandbox restore/check
- `apps/site/package.json` - Added e2b dependency

## Decisions Made
- Used native fetch for Anthropic key validation instead of @anthropic-ai/sdk (lighter, only need one endpoint)
- Tests use `node --experimental-strip-types --experimental-test-module-mocks` for proper e2b module mocking with node:test

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- tsx does not support `mock.module()` (requires top-level await which esbuild CJS mode rejects). Switched to native Node.js with `--experimental-strip-types --experimental-test-module-mocks` flags. All tests pass cleanly.

## User Setup Required

**External services require manual configuration:**
- `E2B_API_KEY` environment variable needed for sandbox creation (get from https://e2b.dev/dashboard -> API Keys)

## Next Phase Readiness
- Backend API layer complete, ready for Plan 02 frontend integration
- Frontend can call POST /api/sandbox/create with apiKey and GET /api/sandbox/status?id=xxx for polling

## Self-Check: PASSED

- All 6 created files exist on disk
- All 3 task commits verified: 6999a26, 09ce59f, 358e86b
- Root test suite passes (289/289)
- Site sandbox tests pass (9/9)

---
*Phase: 02-portal-entry-site*
*Completed: 2026-03-13*
