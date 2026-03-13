---
phase: 5
slug: createdat-cleanup-integration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | `apps/site/tsconfig.json` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 4 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | LIFE-01 | unit | `npm run test` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | LIFE-01 | unit | `npm run test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- `apps/site/src/__tests__/sandbox-status.test.ts` — existing test file for status route logic
- Test runner (`node:test`) already configured and working
- No new framework or fixture installation needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 24h cleanup triggers in real E2B | LIFE-01 | Requires live E2B sandbox aged >24h | Create sandbox, wait/mock time, call status API |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 4s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-13
