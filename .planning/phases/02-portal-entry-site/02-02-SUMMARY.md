---
phase: 02-portal-entry-site
plan: 02
subsystem: ui
tags: [react, nextjs, framer-motion, localStorage, landing-page, cloud-launch]

# Dependency graph
requires:
  - phase: 02-portal-entry-site
    provides: POST /api/sandbox/create, GET /api/sandbox/status API routes
provides:
  - Root Landing page at / with Cloud launch flow
  - ApiKeyForm component (launch button, no key input — per LIFE-03)
  - SandboxLauncher component (3-step progress with polling)
  - SandboxRestore component (detect/resume active sandbox)
  - CloudLauncher state machine (idle/submitting/launching/error)
  - sandbox-storage.ts localStorage utility (save/load/clear)
affects: [03-cloud-persistence]

# Tech tracking
tech-stack:
  added: []
  patterns: [client state machine for multi-step launch flow, localStorage sandbox session restore, framer-motion step animation]

key-files:
  created:
    - apps/site/src/app/page.tsx
    - apps/site/src/components/cloud/CloudLauncher.tsx
    - apps/site/src/components/cloud/ApiKeyForm.tsx
    - apps/site/src/components/cloud/SandboxLauncher.tsx
    - apps/site/src/components/cloud/SandboxRestore.tsx
    - apps/site/src/lib/sandbox-storage.ts
  modified:
    - apps/site/src/middleware.ts
    - apps/site/src/app/api/sandbox/create/route.ts
    - apps/site/src/lib/e2b.ts
    - apps/site/src/lib/validate-key.ts
    - sandbox/e2b.Dockerfile

key-decisions:
  - "API key input removed from portal — users configure provider keys inside sandbox Settings (LIFE-03)"
  - "Root page bypasses i18n middleware — Cloud entry page at / is English-only, docs site at /en still works"
  - "createSandbox accepts optional API key — sandbox can launch without pre-configured key"
  - "Claude Code CLI bumped to 2.1.62 in Dockerfile"

patterns-established:
  - "Client state machine pattern: CloudLauncher manages idle/submitting/launching/error transitions"
  - "localStorage session restore: saveSandbox/loadSandbox/clearSandbox with silent expiry cleanup"
  - "Polling pattern: SandboxLauncher polls /api/sandbox/status every 2s, max 30 attempts"

requirements-completed: [PORT-01, PORT-03, LIFE-03]

# Metrics
duration: ~10min
completed: 2026-03-13
---

# Phase 02 Plan 02: Cloud Entry Landing Page Summary

**Root landing page with one-click sandbox launch, 3-step progress indicator, and session restore — API key deferred to in-sandbox Settings per LIFE-03**

## Performance

- **Duration:** ~10 min (plus checkpoint verification time)
- **Started:** 2026-03-13T03:40:25Z
- **Completed:** 2026-03-13T04:00:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 11

## Accomplishments
- Built complete Cloud entry flow: visit / -> click Launch -> 3-step progress -> redirect to sandbox
- Simplified launch to zero-config: no API key required at portal (LIFE-03 compliance)
- localStorage-based session restore detects active sandboxes on revisit
- Existing docs site at /en unaffected by root page addition

## Task Commits

Each task was committed atomically:

1. **Task 1: localStorage util + Cloud UI components** - `89c8959` (feat)
2. **Task 2: Root Landing page + CloudLauncher** - `0b06acc` (feat)
3. **Task 2.1: [Rule 3] Fix i18n middleware root path** - `5ccd889` (fix)
4. **Task 3: Checkpoint verification + simplify launch** - `0ad4a02` (feat)

## Files Created/Modified
- `apps/site/src/lib/sandbox-storage.ts` - localStorage save/load/clear for sandbox session
- `apps/site/src/components/cloud/ApiKeyForm.tsx` - Launch button (no key input per LIFE-03)
- `apps/site/src/components/cloud/SandboxLauncher.tsx` - 3-step progress with polling + framer-motion
- `apps/site/src/components/cloud/SandboxRestore.tsx` - Detect and resume active sandbox
- `apps/site/src/components/cloud/CloudLauncher.tsx` - Client state machine orchestrating launch flow
- `apps/site/src/app/page.tsx` - Root landing page with hero, launch area, features
- `apps/site/src/middleware.ts` - Skip i18n for root path
- `apps/site/src/app/api/sandbox/create/route.ts` - apiKey now optional
- `apps/site/src/lib/e2b.ts` - createSandbox accepts optional key
- `apps/site/src/lib/validate-key.ts` - Added proxy + custom base URL support
- `sandbox/e2b.Dockerfile` - Claude Code CLI 2.1.62

## Decisions Made
- API key removed from portal entry — users configure provider keys inside sandbox Settings (LIFE-03 compliance)
- Root path bypasses i18n middleware so Cloud entry page works at / while docs site continues at /en
- createSandbox accepts optional API key — sandbox launches without pre-configured key
- validate-key.ts updated with proxy/custom base URL support (currently unused but ready for future use)
- Claude Code CLI bumped to 2.1.62 in Dockerfile for compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] i18n middleware redirecting root path**
- **Found during:** Task 2 (Root Landing page)
- **Issue:** fumadocs i18n middleware redirected / to /en, preventing Cloud entry page from rendering
- **Fix:** Added root-path check in middleware.ts to skip i18n for exact / path
- **Files modified:** apps/site/src/middleware.ts
- **Verification:** curl http://localhost:3001/ returns 200
- **Committed in:** `5ccd889`

### Checkpoint Changes

**2. [Checkpoint] Simplified launch flow per user direction**
- **Found during:** Task 3 (human-verify checkpoint)
- **Issue:** User directed removal of API key input — provider keys configured in sandbox Settings (LIFE-03)
- **Fix:** Removed key input from ApiKeyForm, made apiKey optional in create route and e2b.ts
- **Files modified:** ApiKeyForm.tsx, create/route.ts, e2b.ts, validate-key.ts, e2b.Dockerfile
- **Committed in:** `0ad4a02`

---

**Total deviations:** 1 auto-fixed (blocking), 1 checkpoint-directed change
**Impact on plan:** Simplified user experience. No scope creep — LIFE-03 compliance confirmed.

## Issues Encountered
- Port 3001 was already in use during dev server restart for checkpoint verification; resolved by killing existing process with fuser.

## User Setup Required

**External services require manual configuration:**
- `E2B_API_KEY` environment variable needed for sandbox creation
- `.env.local` created during checkpoint with E2B_API_KEY, HTTPS_PROXY, ANTHROPIC_BASE_URL

## Next Phase Readiness
- Complete Portal Entry Site delivered: backend API (Plan 01) + frontend landing page (Plan 02)
- Ready for Phase 03 (Cloud Persistence) if planned
- Sandbox creation flow tested end-to-end during checkpoint verification

## Self-Check: PASSED

- All 6 created files exist on disk
- All 4 task commits verified: 89c8959, 0b06acc, 5ccd889, 0ad4a02
- TypeScript compilation passes (289/289 tests)

---
*Phase: 02-portal-entry-site*
*Completed: 2026-03-13*
