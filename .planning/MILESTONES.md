# Milestones

## v1.0 CodePilot Cloud MVP (Shipped: 2026-03-13)

**Phases:** 5 | **Plans:** 10 | **Tasks:** 21
**Timeline:** 35 days (2026-02-06 → 2026-03-13)
**Files modified:** 591 | **LOC:** ~64,647 TypeScript
**Git range:** feat(01-01) → feat(05-01)
**Requirements:** 10/10 satisfied | **Audit:** passed

**Delivered:** 将 CodePilot 部署到 E2B 云沙箱，用户通过浏览器一键获得完整云端开发环境。

**Key accomplishments:**
1. E2B 沙箱模板 — 预装全部依赖，生产模式 Next.js + SQLite + Claude CLI 在 1024MB 沙箱中稳定运行
2. 入口站点 — 一键启动沙箱 Landing 页 + API 路由管理沙箱创建/状态/恢复
3. 沙箱生命周期 — 空闲自动暂停、心跳续期、一键恢复，24h 服务端清理
4. 端口转发面板 — 云端端口扫描 + 可点击 E2B 公开 URL
5. 全量验证 — 10/10 需求满足，5/5 E2E 用户流程贯通

**Tech Debt:**
- `validateAnthropicKey` exported but unused in production (intentional per LIFE-03, retained for future use)

**Archives:** [ROADMAP](milestones/v1.0-ROADMAP.md) | [REQUIREMENTS](milestones/v1.0-REQUIREMENTS.md) | [AUDIT](milestones/v1.0-MILESTONE-AUDIT.md)

---

