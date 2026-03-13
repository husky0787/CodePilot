---
phase: 2
slug: portal-entry-site
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (tsx --test) + Playwright |
| **Config file** | package.json scripts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~60 seconds (full), ~4s (quick) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:smoke`
- **Before `/gsd:verify-work`:** Full suite must be green + CDP 验证 Landing 页 UI
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PORT-02 | typecheck | `npm run test` | N/A | ⬜ pending |
| 02-01-02 | 01 | 1 | PORT-02 | typecheck | `npm run test` | N/A | ⬜ pending |
| 02-01-03 | 01 | 1 | PORT-02, PORT-03 | unit | `npx tsx --test apps/site/src/__tests__/sandbox-create.test.ts apps/site/src/__tests__/sandbox-restore.test.ts` | Created by 02-01 Task 3 | ⬜ pending |
| 02-02-01 | 02 | 2 | PORT-01, PORT-03 | typecheck | `npm run test` | N/A | ⬜ pending |
| 02-02-02 | 02 | 2 | PORT-01 | typecheck | `npm run test` | N/A | ⬜ pending |
| 02-02-03 | 02 | 2 | PORT-01, PORT-02, PORT-03 | smoke | `npm run test:smoke` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave 0 items are now covered by Plan 02-01 Task 3:

- [x] `apps/site/src/__tests__/sandbox-create.test.ts` — unit tests for PORT-02 API Route logic (mock E2B SDK) — **Plan 02-01 Task 3**
- [x] `apps/site/src/__tests__/sandbox-restore.test.ts` — unit tests for PORT-03 restore logic — **Plan 02-01 Task 3**
- [x] `e2b` package install: `cd apps/site && npm install e2b` — **Plan 02-01 Task 1**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 多 Provider Key 在沙箱内配置 | LIFE-03 | Landing 页只输入 Anthropic Key（per CONTEXT.md 决策），其余在沙箱内 CodePilot 设置页配置 | 进入沙箱后在 CodePilot 设置页验证多 Key 配置 |
| Landing 页视觉效果 | PORT-01 | UI 审美需人工判断 | CDP 截图审查布局、配色、响应式 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
