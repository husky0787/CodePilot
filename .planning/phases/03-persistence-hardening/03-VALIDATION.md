---
phase: 3
slug: persistence-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test + tsx (单元测试), Playwright (E2E) |
| **Config file** | tsconfig.json (tsx), playwright.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:smoke` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:smoke`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LIFE-01 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-pause.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | LIFE-01 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-resume.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | LIFE-01 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-heartbeat.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | LIFE-01 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | LIFE-02 | unit | `tsx --test src/__tests__/unit/ports-scan.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | LIFE-02 | manual | CDP 验证 — 需要云端环境 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/site/src/__tests__/sandbox-pause.test.ts` — stubs for LIFE-01 (pause flow)
- [ ] `apps/site/src/__tests__/sandbox-resume.test.ts` — stubs for LIFE-01 (resume flow)
- [ ] `apps/site/src/__tests__/sandbox-heartbeat.test.ts` — stubs for LIFE-01 (heartbeat API)
- [ ] `apps/site/src/__tests__/rate-limit.test.ts` — stubs for LIFE-01 (IP rate limiting)
- [ ] `src/__tests__/unit/ports-scan.test.ts` — stubs for LIFE-02 (port scanning)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PortsPanel 渲染端口列表和链接 | LIFE-02 | 需要真实 E2B 沙箱和浏览器环境 | 启动沙箱 → 在沙箱中开启端口 → CDP 验证 PortsPanel 展示端口和链接 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
