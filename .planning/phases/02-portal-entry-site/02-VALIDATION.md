---
phase: 2
slug: portal-entry-site
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 02-01-01 | 01 | 0 | PORT-02 | unit | `tsx --test apps/site/src/__tests__/sandbox-create.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | PORT-03 | unit | `tsx --test apps/site/src/__tests__/sandbox-restore.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 1 | PORT-01 | smoke | `npx playwright test --grep @smoke` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 1 | PORT-02 | integration | `npm run test:smoke` | ❌ | ⬜ pending |
| 02-XX-XX | XX | 1 | PORT-03 | integration | `npm run test:smoke` | ❌ | ⬜ pending |
| 02-XX-XX | XX | 1 | LIFE-03 | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/site/src/__tests__/sandbox-create.test.ts` — stubs for PORT-02 API Route 逻辑（mock E2B SDK）
- [ ] `apps/site/src/__tests__/sandbox-restore.test.ts` — stubs for PORT-03 恢复逻辑
- [ ] `e2b` package install: `cd apps/site && npm install e2b`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 多 Provider Key 输入 | LIFE-03 | Phase 2 CONTEXT 决定 Landing 页只输入 Anthropic Key，其余在沙箱内配置 | 进入沙箱后在 CodePilot 设置页验证多 Key 配置 |
| Landing 页视觉效果 | PORT-01 | UI 审美需人工判断 | CDP 截图审查布局、配色、响应式 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
