---
phase: 03-persistence-hardening
verified: 2026-03-13T11:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 3: Persistence & Hardening Verification Report

**Phase Goal:** 沙箱在用户空闲后自动保存状态，CodePilot 提供端口转发面板，整体达到可发布质量
**Verified:** 2026-03-13T11:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

**Plan 01 (Backend Sandbox Lifecycle)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | pauseSandbox syncs filesystem then pauses E2B sandbox | VERIFIED | `apps/site/src/lib/e2b.ts` L62-79: connect -> `sandbox.commands.run("sync")` -> `sandbox.pause()` with betaPause fallback |
| 2 | resumeSandbox reconnects to paused sandbox with retry logic | VERIFIED | `apps/site/src/lib/e2b.ts` L85-113: for-loop 2 attempts, `Sandbox.connect(sandboxId, { timeoutMs: 30*60*1000 })`, 2s delay between retries |
| 3 | IP-level rate limiting prevents sandbox creation abuse | VERIFIED | `apps/site/src/lib/rate-limit.ts` L13-28: in-memory Map, `checkRateLimit(ip, maxPerHour=5)`, periodic cleanup with unref |
| 4 | Heartbeat API renews E2B sandbox timeout | VERIFIED | `apps/site/src/app/api/sandbox/heartbeat/route.ts` L34-35: `Sandbox.connect(sandboxId)` -> `sandbox.setTimeout(30*60*1000)` |
| 5 | Pause/resume APIs call library functions correctly | VERIFIED | pause route imports `pauseSandbox` from `@/lib/e2b` (L2), calls it (L33); resume route imports `resumeSandbox` (L2), calls it (L33) |
| 6 | Create API retries once on E2B failure and enforces rate limits | VERIFIED | `apps/site/src/app/api/sandbox/create/route.ts` L15: `checkRateLimit(ip, 5)` -> 429; L36-48: for-loop 2 attempts with 2s delay |

**Plan 02 (Frontend Sandbox Lifecycle)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Sandbox auto-pauses after 15 minutes of user inactivity | VERIFIED | `CloudLauncher.tsx` L19: `IDLE_TIMEOUT_MS = 15*60*1000`; L136-138: setTimeout calls `pauseSandbox(sandboxId, ...)` |
| 8 | User sees countdown warning 2 minutes before auto-pause | VERIFIED | `CloudLauncher.tsx` L21: `IDLE_WARNING_MS = 13*60*1000`; L118-133: warning timer -> IdleWarningBanner with countdown; `IdleWarningBanner.tsx` renders "Sandbox will pause in {mm:ss}" |
| 9 | User can resume a paused sandbox and all files/config are preserved | VERIFIED | `SandboxRestore.tsx` L14: `{ status: "paused"; sandboxId: string }` state; L79-115: `handleResumeFromPause` POSTs to `/api/sandbox/resume`, updates localStorage, redirects |
| 10 | Status API distinguishes paused vs dead sandboxes | VERIFIED | `apps/site/src/app/api/sandbox/status/route.ts` L66-75: `Sandbox.list()` -> `isPausedSandbox()` -> returns `{ paused: true/false }` |

**Plan 03 (Port Forwarding Panel)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 11 | CodePilot UI shows a Ports section in the right panel when running in E2B cloud mode | VERIFIED | `RightPanel.tsx` L16: imports PortsPanel; L119: `<PortsPanel />`; `PortsPanel.tsx` L83: `if (!isCloud) return null` |
| 12 | Each port entry has a clickable link that opens the E2B public URL | VERIFIED | `PortsPanel.tsx` L43-45: `getPortUrl(port, sandboxId)` returns `https://${port}-${sandboxId}.e2b.dev`; L126-129: `window.open(url, "_blank")` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/site/src/lib/e2b.ts` | pauseSandbox, resumeSandbox | VERIFIED | 113 lines, exports both functions + createSandbox + checkSandbox |
| `apps/site/src/lib/rate-limit.ts` | IP rate limiting | VERIFIED | 46 lines, checkRateLimit + cleanup interval + _resetForTest |
| `apps/site/src/app/api/sandbox/heartbeat/route.ts` | Heartbeat POST | VERIFIED | 41 lines, validates sandboxId, connects + setTimeout |
| `apps/site/src/app/api/sandbox/pause/route.ts` | Pause POST | VERIFIED | 43 lines, calls pauseSandbox, returns success/error |
| `apps/site/src/app/api/sandbox/resume/route.ts` | Resume POST | VERIFIED | 46 lines, calls resumeSandbox, returns sandboxId+url or error |
| `apps/site/src/app/api/sandbox/create/route.ts` | Hardened create POST | VERIFIED | 54 lines, rate limit + retry-once pattern |
| `apps/site/src/components/cloud/IdleWarningBanner.tsx` | Countdown banner | VERIFIED | 58 lines, framer-motion animation, "Stay Active" button, countdown display |
| `apps/site/src/components/cloud/SandboxRestore.tsx` | Pause-aware restore | VERIFIED | 203 lines, paused/resuming/resume-error states, POST /api/sandbox/resume |
| `apps/site/src/components/cloud/CloudLauncher.tsx` | Heartbeat + idle detection | VERIFIED | 316 lines, 60s heartbeat, 15min idle, 24h lifetime, activity listeners |
| `apps/site/src/app/api/sandbox/status/route.ts` | Enhanced status with paused | VERIFIED | 86 lines, isPausedSandbox via Sandbox.list(), 24h cleanup-on-access |
| `apps/site/src/lib/sandbox-storage.ts` | paused/pausedAt fields | VERIFIED | 45 lines, SavedSandbox with paused?, updateSandboxPaused helper |
| `src/app/api/ports/route.ts` | Port scanning API | VERIFIED | 67 lines, parseSsOutput, ss -tlnp, filters system ports + 3000 |
| `src/components/cloud/PortsPanel.tsx` | Ports list component | VERIFIED | 146 lines, useIsCloud, 10s polling, E2B URL generation, collapsible |
| `src/components/layout/RightPanel.tsx` | Integrated PortsPanel | VERIFIED | 123 lines, imports + renders PortsPanel at L119 |
| `src/hooks/usePanel.ts` | PanelContent with "ports" | VERIFIED | L5: `"files" | "tasks" | "ports"` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| heartbeat/route.ts | e2b.ts | sandbox.setTimeout | WIRED | L35: `await sandbox.setTimeout(30 * 60 * 1000)` |
| pause/route.ts | e2b.ts | pauseSandbox() | WIRED | L2: import, L33: `await pauseSandbox(sandboxId)` |
| resume/route.ts | e2b.ts | resumeSandbox() | WIRED | L2: import, L33: `await resumeSandbox(sandboxId)` |
| create/route.ts | rate-limit.ts | checkRateLimit | WIRED | L3: import, L15: `checkRateLimit(ip, 5)` |
| CloudLauncher.tsx | /api/sandbox/heartbeat | fetch POST 60s interval | WIRED | L47: `fetch("/api/sandbox/heartbeat", ...)`, L150-152: setInterval |
| SandboxRestore.tsx | /api/sandbox/resume | POST resume | WIRED | L85: `fetch("/api/sandbox/resume", ...)` |
| status/route.ts | e2b.ts | Sandbox.list() | WIRED | L3: import Sandbox from "e2b", L67: `Sandbox.list()` |
| PortsPanel.tsx | /api/ports | useEffect + setInterval 10s | WIRED | L61: `fetch("/api/ports")`, L77: `setInterval(fetchPorts, POLL_INTERVAL_MS)` |
| PortsPanel.tsx | E2B public URL | hostname-based URL | WIRED | L44: `https://${port}-${sandboxId}.e2b.dev` |
| RightPanel.tsx | PortsPanel.tsx | conditional render | WIRED | L16: import, L119: `<PortsPanel />` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIFE-01 | 03-01, 03-02 | 沙箱在用户空闲后自动暂停，保存完整文件系统和进程状态 | SATISFIED | Backend: pauseSandbox with sync+pause; Frontend: 15min idle timeout with auto-pause; Resume preserves files |
| LIFE-02 | 03-03 | CodePilot UI 新增端口转发面板，展示沙箱内暴露的端口及可点击的预览链接 | SATISFIED | PortsPanel in RightPanel, polls /api/ports every 10s, clickable E2B public URLs |

No orphaned requirements found. REQUIREMENTS.md maps LIFE-01 and LIFE-02 to Phase 3; both plans claim these IDs and both are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO/FIXME/placeholder/stub patterns found in any phase 3 artifacts |

### Human Verification Required

### 1. Idle Warning Banner Visual

**Test:** Launch a sandbox via the portal, wait 13 minutes (or temporarily reduce IDLE_WARNING_MS for testing), observe the warning banner appearance.
**Expected:** Amber banner slides down from top with countdown "Sandbox will pause in 2:00 due to inactivity" and a "Stay Active" button.
**Why human:** Visual appearance, framer-motion animation timing, and z-index stacking cannot be verified programmatically.

### 2. Sandbox Pause/Resume Round-Trip

**Test:** Let a sandbox auto-pause (or trigger manual pause), then revisit the portal and click "Resume Paused Sandbox."
**Expected:** Loading spinner during resume, then redirect to the sandbox URL with all previous files and configuration intact.
**Why human:** End-to-end E2B lifecycle (actual pause/resume) requires a live E2B API key and running sandbox.

### 3. Port Forwarding Panel in Cloud Mode

**Test:** Start a service on a non-standard port (e.g., `python -m http.server 8080`) inside the E2B sandbox, then check the RightPanel.
**Expected:** Ports section appears below FileTree, shows ":8080 python" with a clickable external link to `https://8080-{sandboxId}.e2b.dev`.
**Why human:** Requires running inside an actual E2B sandbox (hostname must end with .e2b.dev); desktop mode should show no Ports section.

### 4. 24-Hour Lifetime Warning

**Test:** Create a sandbox and observe behavior at the 23h mark (or temporarily reduce MAX_LIFETIME_MS).
**Expected:** Orange banner "Sandbox will shut down in less than 1 hour. Please save your work." At 24h, sandbox is force-paused.
**Why human:** Long-duration behavior; requires time manipulation or reduced constants to verify.

### Gaps Summary

No gaps found. All 12 observable truths verified across 3 plans. All artifacts are substantive (no stubs), all key links are wired (imports + usage confirmed), both requirements (LIFE-01, LIFE-02) are satisfied, all 297 tests pass (including 14 new tests from Plan 01 and 3 from Plan 02), and no anti-patterns detected.

The only remaining verification is human testing of the visual/UX aspects and end-to-end E2B API integration, which cannot be verified through code inspection alone.

---

_Verified: 2026-03-13T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
