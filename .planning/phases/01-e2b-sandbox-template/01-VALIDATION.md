---
phase: 1
slug: e2b-sandbox-template
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx + node:test (unit/smoke), Playwright (E2E) |
| **Config file** | `package.json` scripts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~4s (quick), ~60s (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test` + manual `e2b template build` verification
- **Before `/gsd:verify-work`:** Full suite must be green + manual sandbox E2E test
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | SAND-02 | unit | `npm run test` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | SAND-02 | manual-only | `e2b template build` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | SAND-03 | manual-only | curl sandbox URL | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | SAND-01 | smoke | `npm run test:smoke` | ✅ | ⬜ pending |
| 01-01-05 | 01 | 1 | SAND-04 | manual-only | Browser access sandbox URL | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `sandbox/e2b.Dockerfile` — E2B template definition for SAND-02
- [ ] `sandbox/start.sh` — Startup script with health check polling
- [ ] E2B CLI installed locally: `npm install -g @e2b/cli`
- [ ] `E2B_API_KEY` environment variable configured for template builds

*Note: SAND-02/03/04 are primarily manual-only verifications requiring actual E2B sandbox deployment.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E2B template builds successfully | SAND-02 | Requires E2B cloud infra + API key | Run `e2b template build` in `sandbox/`, verify success |
| Next.js accessible via sandbox URL | SAND-03 | Requires live E2B sandbox | Create sandbox, `curl https://{host}`, verify 200 |
| Full UI accessible in browser | SAND-04 | Requires browser + live sandbox | Open sandbox URL in browser, navigate Chat/Files/Tools |
| Claude conversation round-trip | SAND-02 | Requires valid ANTHROPIC_API_KEY in sandbox | Send message in Chat UI, verify streaming response |
| better-sqlite3 persistence | SAND-02 | Requires running sandbox | Create session, refresh page, verify session persists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
