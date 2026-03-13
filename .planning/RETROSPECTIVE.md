# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — CodePilot Cloud MVP

**Shipped:** 2026-03-13
**Phases:** 5 | **Plans:** 10 | **Tasks:** 21

### What Was Built
- E2B 沙箱模板：预装全部依赖，生产模式 Next.js + SQLite + Claude CLI 稳定运行
- 入口站点：一键启动 Landing 页，API 路由管理沙箱创建/状态/恢复
- 沙箱生命周期：空闲自动暂停 + 心跳续期 + 一键恢复 + 24h 清理
- 端口转发面板：云端端口扫描 + 可点击 E2B 公开 URL
- 全量追溯验证：Phase 1/2 补充 VERIFICATION.md，修复 traceability

### What Worked
- 3-phase 依赖链设计（Template → Portal → Persistence）清晰，每阶段产出可独立验证
- Electron IPC `?.` 守卫让 Web 模式适配几乎零成本，省去整个 Phase
- TDD 模式（先写测试再实现）在 Phase 2/3 后端代码中效果好
- 审计驱动的 gap closure（Phase 4/5）精准定位遗漏，高效补全

### What Was Inefficient
- Phase 1 首次尝试 dev 模式导致 OOM，应更早调研沙箱内存限制
- ROADMAP.md 的 Phase 状态标记不够及时（部分 Phase 完成后未更新 checkbox）
- Phase 4/5 是审计后追加的补救阶段，如果初始阶段就包含验证步骤可避免

### Patterns Established
- `parseSsOutput` 纯函数导出模式 — 外部命令输出解析可测试化
- `node --experimental-strip-types --experimental-test-module-mocks` — tsx 不支持 mock.module 时的替代方案
- cleanup-on-access 模式 — 服务端在读取时顺便清理过期资源
- URLSearchParams 构建可选参数 — falsy 值自动忽略

### Key Lessons
1. **先验证环境约束再写代码** — 沙箱 1024MB 限制应在 Phase 1 Plan 1 就确认，而非 OOM 后才发现
2. **审计应内建于流程** — Phase 4/5 的追溯验证本可融入前三个 Phase 的验证步骤
3. **E2B SDK API 不稳定** — pause()/betaPause() 命名变化需要运行时 fallback
4. **入口站点决策要早锁定** — LIFE-03 从"入口输入 Key"改为"沙箱内设置"的决策影响了 Phase 2 的实现

### Cost Observations
- 大部分 Plan 在 2-10 分钟内完成，仅 Phase 01 P02（模板构建验证）耗时 ~45min
- 验证/文档类 Plan（Phase 4/5）平均 2 分钟，纯文档操作效率极高
- 总计 10 个 Plan，大部分为编码 Plan

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 10 | 审计驱动 gap closure，追溯验证模式建立 |

### Top Lessons (Verified Across Milestones)

1. 先验证环境约束再写代码（v1.0: E2B 内存限制）
2. 审计应内建于阶段流程，避免事后补救
