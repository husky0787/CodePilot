---
status: complete
phase: 03-persistence-hardening
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md
started: 2026-03-13T10:40:00Z
updated: 2026-03-13T10:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sandbox Pause API
expected: POST /api/sandbox/pause with a valid sandboxId pauses the running E2B sandbox. Returns 200 with success status.
result: pass

### 2. Sandbox Resume API
expected: POST /api/sandbox/resume with a paused sandboxId resumes it. Returns 200 with the sandbox details. The sandbox becomes active again with a 30-minute timeout.
result: pass

### 3. Heartbeat Keeps Sandbox Alive
expected: POST /api/sandbox/heartbeat with a valid sandboxId renews its timeout. Returns 200. The sandbox timeout resets to 30 minutes from now.
result: pass

### 4. Create Rate Limiting
expected: Rapidly creating sandboxes (>5 from the same IP within an hour) returns a 429 Too Many Requests response on the 6th attempt.
result: pass

### 5. Idle Warning Banner Appears
expected: In the cloud portal, after ~13 minutes of no mouse/keyboard/scroll activity, an IdleWarningBanner fades in at the top showing a countdown timer (e.g. "Sandbox will pause in 2:00") and a "Stay Active" button.
result: pass

### 6. Stay Active Dismisses Warning
expected: Clicking "Stay Active" on the IdleWarningBanner hides the banner and resets the idle timer. The sandbox continues running normally.
result: pass

### 7. Auto-Pause on Idle Timeout
expected: If no activity for 15 minutes and user does not click "Stay Active", the sandbox automatically pauses. The CloudLauncher calls the pause API and updates localStorage with paused state.
result: pass

### 8. Paused Sandbox Restore Flow
expected: When returning to a sandbox that was paused (via idle timeout or manual pause), SandboxRestore detects the paused state (from localStorage paused flag or server-side status API), shows a "Resume" option, clicking it shows a spinner while resuming, then redirects to the active sandbox.
result: pass

### 9. Status API Reports Paused State
expected: GET /api/sandbox/status for a paused sandbox returns a response with paused: true. For a running sandbox, paused: false.
result: pass

### 10. 24-Hour Lifetime Enforcement
expected: A sandbox running for ~23 hours shows a lifetime warning. At 24 hours, it is force-paused regardless of activity. The status API also force-pauses expired sandboxes on access.
result: pass

### 11. Port Forwarding Panel (Cloud Mode)
expected: In cloud mode (hostname ending in .e2b.dev), the PortsPanel appears in the right sidebar below the file tree. It polls every 10 seconds for open ports and displays them in a collapsible list with clickable links to the E2B public URL (https://{port}-{sandboxId}.e2b.dev).
result: pass

### 12. Port Panel Hidden Outside Cloud
expected: When not running in cloud mode (e.g., localhost), the PortsPanel component renders nothing — no ports section visible in the right panel.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
