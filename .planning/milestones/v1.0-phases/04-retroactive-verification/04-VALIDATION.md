---
phase: 04
slug: retroactive-verification
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-13
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A (documentation-only phase) |
| **Config file** | N/A |
| **Quick run command** | `test -f .planning/phases/01-e2b-sandbox-template/01-VERIFICATION.md` |
| **Full suite command** | `bash -c 'test -f .planning/phases/01-e2b-sandbox-template/01-VERIFICATION.md && test -f .planning/phases/02-portal-entry-site/02-VERIFICATION.md && grep -q "SAND-04.*Complete" .planning/REQUIREMENTS.md'` |
| **Estimated runtime** | ~1 seconds |

---

## Sampling Rate

- **After every task commit:** Run `test -f` on target file
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SAND-01~04 | manual-review | `test -f .planning/phases/01-e2b-sandbox-template/01-VERIFICATION.md` | ✅ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | PORT-01~03, LIFE-03 | manual-review | `test -f .planning/phases/02-portal-entry-site/02-VERIFICATION.md` | ✅ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | SAND-04 | manual-review | `grep "SAND-04.*Complete" .planning/REQUIREMENTS.md` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is a documentation-only phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VERIFICATION.md content completeness | SAND-01~04, PORT-01~03, LIFE-03 | Document quality requires human review | Review each truth/artifact/key_link has source file line references |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
