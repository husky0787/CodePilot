---
phase: 03-persistence-hardening
plan: 03
subsystem: ui
tags: [e2b, port-forwarding, cloud-mode, ss-parser, polling]

requires:
  - phase: 01-sandbox-template
    provides: E2B sandbox with ss command available
provides:
  - Port scanning API endpoint (GET /api/ports)
  - PortsPanel cloud-only component with auto-refresh
  - Cloud mode detection pattern (hostname-based)
affects: [sandbox-template, cloud-deployment]

tech-stack:
  added: []
  patterns: [cloud-mode hostname check, ss -tlnp parsing, interval polling]

key-files:
  created:
    - src/app/api/ports/route.ts
    - src/components/cloud/PortsPanel.tsx
    - src/__tests__/unit/ports-scan.test.ts
  modified:
    - src/hooks/usePanel.ts
    - src/components/layout/RightPanel.tsx

key-decisions:
  - "Pure function parseSsOutput exported for testability instead of mocking execSync"
  - "PortsPanel self-gates via cloud check, RightPanel renders it unconditionally"
  - "Divider included inside PortsPanel to avoid conditional rendering in RightPanel"

patterns-established:
  - "Cloud-mode detection: window.location.hostname.endsWith('.e2b.dev') for frontend, process.env.E2B_SANDBOX_ID for backend"
  - "Cloud-only component pattern: component returns null when not in cloud mode"

requirements-completed: [LIFE-02]

duration: 4min
completed: 2026-03-13
---

# Phase 03 Plan 03: Port Forwarding Panel Summary

**Port scanning API parsing ss -tlnp output with cloud-only PortsPanel polling every 10s and clickable E2B public URLs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T07:39:01Z
- **Completed:** 2026-03-13T07:43:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- GET /api/ports endpoint with ss -tlnp parser, filtering system ports and port 3000
- PortsPanel component with 10s polling, collapsible UI, clickable external links to E2B public URLs
- Cloud mode detection pattern: hostname-based for frontend, env var for backend
- 8 unit tests covering parsing, filtering, sorting, IPv6, and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Port scanning API + unit test** - `d66552e` (feat, TDD)
2. **Task 2: PortsPanel + RightPanel integration** - `0fa533e` (feat)

## Files Created/Modified
- `src/app/api/ports/route.ts` - Port scanning API with ss -tlnp parser, exports PortInfo type and parseSsOutput
- `src/components/cloud/PortsPanel.tsx` - Cloud-only ports panel with polling, collapsible UI, E2B URL links
- `src/__tests__/unit/ports-scan.test.ts` - 8 unit tests for parseSsOutput
- `src/hooks/usePanel.ts` - PanelContent type extended with "ports"
- `src/components/layout/RightPanel.tsx` - PortsPanel added below FileTree section

## Decisions Made
- Used pure function `parseSsOutput` exported from route file for direct unit testing, avoiding complex execSync mocking
- PortsPanel includes its own divider internally rather than having RightPanel conditionally render it
- Used `LinkSquare02Icon` from hugeicons for external link button
- Sandbox ID extraction from hostname handles the `{port}-{sandboxId}.e2b.dev` pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Port forwarding panel complete, ready for E2B cloud deployment testing
- Cloud mode detection pattern established for future cloud-only features

---
*Phase: 03-persistence-hardening*
*Completed: 2026-03-13*
