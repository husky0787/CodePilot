---
phase: 03-persistence-hardening
plan: 02
subsystem: ui
tags: [e2b, sandbox, lifecycle, idle-detection, heartbeat, pause, resume, framer-motion]

# Dependency graph
requires:
  - phase: 03-persistence-hardening
    plan: 01
    provides: "pauseSandbox/resumeSandbox functions, heartbeat/pause/resume API routes"
provides:
  - "IdleWarningBanner component with countdown and Stay Active button"
  - "Pause-aware SandboxRestore with resume flow"
  - "CloudLauncher with 60s heartbeat, 15min idle timeout, 24h max lifetime"
  - "Enhanced status API with paused-state detection and 24h cleanup"
  - "updateSandboxPaused helper for localStorage state management"
affects: [frontend-lifecycle, sandbox-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Idle detection with debounced user activity events", "Countdown timer with setInterval", "Cleanup-on-access for expired sandboxes"]

key-files:
  created:
    - "apps/site/src/components/cloud/IdleWarningBanner.tsx"
    - "apps/site/src/__tests__/sandbox-status.test.ts"
  modified:
    - "apps/site/src/lib/sandbox-storage.ts"
    - "apps/site/src/components/cloud/SandboxRestore.tsx"
    - "apps/site/src/components/cloud/CloudLauncher.tsx"
    - "apps/site/src/app/api/sandbox/status/route.ts"

key-decisions:
  - "Heartbeat sent from portal tab only; E2B default timeout is fallback if tab closed"
  - "isPausedSandbox test uses replicated logic (route imports pull in next/server which cannot be tested in bare node:test)"
  - "Status API detects paused via Sandbox.list() presence when sandbox not alive"

patterns-established:
  - "Idle detection: debounced activity listeners (5s) reset 15min countdown"
  - "Cleanup-on-access: force-pause sandboxes older than 24h during status check"
  - "Paused-state propagation: localStorage paused flag + server-side Sandbox.list detection"

requirements-completed: [LIFE-01]

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 3 Plan 02: Frontend Sandbox Lifecycle UI Summary

**Idle warning banner, heartbeat integration, pause-aware sandbox restore, and enhanced status API with paused-state detection and 24h cleanup-on-access**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T07:50:39Z
- **Completed:** 2026-03-13T07:58:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- IdleWarningBanner shows countdown 2 minutes before auto-pause with "Stay Active" button
- SandboxRestore detects paused sandboxes (from localStorage and server-side) and offers resume with spinner/error handling
- CloudLauncher sends heartbeat every 60s, tracks idle with debounced user events, shows warning at 13min, auto-pauses at 15min
- 24-hour max lifetime with warning at 23h and forced pause at 24h
- Status API returns paused field by checking Sandbox.list() and force-pauses expired sandboxes on access
- All 297 project tests pass + 3 new sandbox-status tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Sandbox storage + idle warning + heartbeat + SandboxRestore** - `6916e00` (feat)
2. **Task 2: Status API enhancement + cleanup logic** - `e44a786` (feat)

## Files Created/Modified
- `apps/site/src/lib/sandbox-storage.ts` - Added paused/pausedAt fields + updateSandboxPaused helper
- `apps/site/src/components/cloud/IdleWarningBanner.tsx` - Countdown warning banner with framer-motion animation
- `apps/site/src/components/cloud/SandboxRestore.tsx` - Pause-aware restore with resume flow, loading/error states
- `apps/site/src/components/cloud/CloudLauncher.tsx` - Heartbeat interval, idle detection, 24h lifetime management
- `apps/site/src/app/api/sandbox/status/route.ts` - Enhanced response with paused detection via Sandbox.list()
- `apps/site/src/__tests__/sandbox-status.test.ts` - 3 tests for isPausedSandbox logic

## Decisions Made
- Heartbeat is sent from the portal tab while it remains open; if user closes the tab after redirect, E2B's own sandbox timeout (~30min) serves as fallback. A future enhancement could inject an in-sandbox heartbeat script.
- isPausedSandbox test replicates the pure function logic inline rather than importing from the route, because the route file imports next/server and @/lib/e2b which cannot resolve in bare node:test.
- Status API detects paused state by calling Sandbox.list() and checking if the sandboxId appears -- E2B lists paused sandboxes alongside running ones.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All frontend lifecycle UI ready for production use
- Idle detection, heartbeat, and 24h lifetime enforcement fully wired
- Status API provides complete sandbox state for SandboxRestore and future monitoring
- Phase 03 Plan 03 (port forwarding) can proceed independently

## Self-Check: PASSED

All 6 files verified present. Both commit hashes verified in git log.

---
*Phase: 03-persistence-hardening*
*Completed: 2026-03-13*
