# Phase 4: Retroactive Verification & Traceability Fix - Research

**Researched:** 2026-03-13
**Domain:** Documentation verification / traceability compliance
**Confidence:** HIGH

## Summary

Phase 4 是一个纯文档阶段，不涉及代码变更。目标是为 Phase 1 和 Phase 2 补充缺失的 VERIFICATION.md 文件，并修复 REQUIREMENTS.md 中 SAND-04 的 traceability 状态。

Phase 3 已有完整的 03-VERIFICATION.md 作为格式参考（130 行，12/12 truths verified），Phase 1 和 Phase 2 的所有 PLAN.md 和 SUMMARY.md 均已完成且包含充分的 must_haves 定义和执行结果，为撰写 VERIFICATION.md 提供了完整的数据来源。

**Primary recommendation:** 按照 03-VERIFICATION.md 的格式，逐一检查 Phase 1/2 的 PLAN.md 中定义的 must_haves（truths、artifacts、key_links），对照 SUMMARY.md 中的执行结果和实际源文件，生成两份 VERIFICATION.md。同时将 REQUIREMENTS.md 中 SAND-04 的 traceability 从 Phase 4 / Pending 修正为 Phase 1 / Complete。

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAND-01 | CodePilot 以纯 Next.js Web 模式运行，所有 Electron IPC 调用优雅降级 | Phase 1 VERIFICATION.md 需覆盖 -- 已在 01-01 实现（健康检查端点验证 Web 模式可用） |
| SAND-02 | 自定义 E2B 沙箱模板预装全部依赖 | Phase 1 VERIFICATION.md 需覆盖 -- 已在 01-01 实现（Dockerfile + 工具链） |
| SAND-03 | Next.js 绑定 0.0.0.0 并通过 E2B 端口暴露 | Phase 1 VERIFICATION.md 需覆盖 -- 已在 01-01 实现（start.sh --hostname 0.0.0.0） |
| SAND-04 | 用户通过浏览器 URL 直接访问沙箱内完整 UI | Phase 1 VERIFICATION.md 需覆盖 -- 已在 01-02 人工验证（端到端沙箱访问） |
| PORT-01 | 独立 Landing 页面展示产品价值和启动按钮 | Phase 2 VERIFICATION.md 需覆盖 -- 已在 02-02 实现（page.tsx + CloudLauncher） |
| PORT-02 | 后端通过 E2B SDK 创建沙箱实例 | Phase 2 VERIFICATION.md 需覆盖 -- 已在 02-01 实现（create/route.ts + e2b.ts） |
| PORT-03 | Landing 页支持恢复已暂停的沙箱 | Phase 2 VERIFICATION.md 需覆盖 -- 已在 02-02 实现（SandboxRestore + localStorage） |
| LIFE-03 | 入口站点支持输入多个 AI Provider 的 API Key | Phase 2 VERIFICATION.md 需覆盖 -- 已在 02-02 实现（API key 在沙箱内 Settings 配置） |
</phase_requirements>

## Standard Stack

### Core

本阶段不引入任何新依赖。所有工作是文档生成（Markdown 文件）。

| Tool | Purpose | Why |
|------|---------|-----|
| VERIFICATION.md 模板 | 03-VERIFICATION.md 格式 | 项目内已验证的格式，保持一致性 |
| Source code inspection | 验证 artifacts 和 key_links | 对照实际文件确认实现 |
| git log | 验证 commit 历史 | 确认 task commits 存在 |

## Architecture Patterns

### VERIFICATION.md 标准格式

基于 03-VERIFICATION.md 的结构：

```
---
phase: XX-name
verified: ISO timestamp
status: passed/failed
score: N/M must-haves verified
re_verification: true/false
---

# Phase X: Name Verification Report

## Goal Achievement
### Observable Truths (from PLAN.md must_haves.truths)
### Required Artifacts (from PLAN.md must_haves.artifacts)
### Key Link Verification (from PLAN.md must_haves.key_links)
### Requirements Coverage (requirement -> plan -> evidence)
### Anti-Patterns Found
### Human Verification Required
### Gaps Summary
```

### Phase 1 Verification 数据来源映射

| VERIFICATION Section | Data Source |
|---------------------|-------------|
| Observable Truths | 01-01-PLAN.md must_haves.truths (3 条) + 01-02-PLAN.md must_haves.truths (3 条) |
| Required Artifacts | 01-01-PLAN.md must_haves.artifacts (3 个) + 01-02-PLAN.md must_haves.artifacts (1 个) |
| Key Links | 01-01-PLAN.md must_haves.key_links (2 条) + 01-02-PLAN.md must_haves.key_links (2 条) |
| Requirements | SAND-01, SAND-02, SAND-03 (Plan 01) + SAND-04 (Plan 02) |
| Evidence | 01-01-SUMMARY.md + 01-02-SUMMARY.md + 实际源文件检查 |

### Phase 2 Verification 数据来源映射

| VERIFICATION Section | Data Source |
|---------------------|-------------|
| Observable Truths | 02-01-PLAN.md must_haves.truths (4 条) + 02-02-PLAN.md must_haves.truths (6 条) |
| Required Artifacts | 02-01-PLAN.md must_haves.artifacts (6 个) + 02-02-PLAN.md must_haves.artifacts (5 个) |
| Key Links | 02-01-PLAN.md must_haves.key_links (3 条) + 02-02-PLAN.md must_haves.key_links (5 条) |
| Requirements | PORT-02 (Plan 01) + PORT-01, PORT-03, LIFE-03 (Plan 02) |
| Evidence | 02-01-SUMMARY.md + 02-02-SUMMARY.md + 实际源文件检查 |

### SAND-04 Traceability 修复

REQUIREMENTS.md 当前状态：
```
| SAND-04 | Phase 4 | Pending |
```

实际状态：SAND-04 在 Phase 1 Plan 02 中已完成（01-02-SUMMARY.md 明确标注 `requirements-completed: [SAND-04]`，验证结果显示 Web UI 首页正常加载）。

需修正为：
```
| SAND-04 | Phase 1 | Complete |
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verification 格式 | 自创格式 | 复制 03-VERIFICATION.md 结构 | 项目一致性，已验证的格式 |
| Evidence 收集 | 凭记忆写 | 实际 grep/read 源文件获取行号和内容 | 准确性，避免虚假验证 |
| Requirements 映射 | 手动整理 | 从 PLAN.md frontmatter 的 requirements 字段提取 | 数据已有，避免遗漏 |

## Common Pitfalls

### Pitfall 1: 虚假验证（Cargo Cult Verification）
**What goes wrong:** 仅从 SUMMARY.md 复制结论，不实际检查源文件
**Why it happens:** SUMMARY.md 是执行者自报，可能有偏差
**How to avoid:** 每个 truth/artifact/key_link 必须引用实际源文件的具体行号
**Warning signs:** VERIFICATION.md 中没有 "L42:" 这样的行号引用

### Pitfall 2: SAND-04 Traceability 只改一处
**What goes wrong:** 只更新 Traceability 表的 Phase 列，忘记更新 Status 列
**Why it happens:** 两列需要同时修改
**How to avoid:** 同时修改 Phase 列（Phase 4 -> Phase 1）和 Status 列（Pending -> Complete）

### Pitfall 3: 漏掉 re_verification 标记
**What goes wrong:** Phase 1/2 的 VERIFICATION.md 没有标注是追溯验证
**Why it happens:** 按照 Phase 3 模板写 re_verification: false
**How to avoid:** Phase 4 的产物是追溯（retroactive）验证，应标注 `re_verification: true`

### Pitfall 4: Phase 2 LIFE-03 验证不充分
**What goes wrong:** LIFE-03 要求多 Provider Key 支持，但 Portal 改为不输入 Key
**Why it happens:** 设计决策将 LIFE-03 实现为"沙箱内配置"而非"Portal 输入"
**How to avoid:** 验证时说明 LIFE-03 通过设计决策满足（API key removed from portal, users configure in sandbox Settings），引用 02-02-SUMMARY.md 中的 key-decisions

## Code Examples

### Phase 1 验证需检查的关键文件和模式

```
# SAND-01: Web 模式降级
src/app/api/health/route.ts  -- 需包含 getDb, findClaudeBinary

# SAND-02: 沙箱模板预装依赖
sandbox/e2b.Dockerfile       -- 需包含 e2bdev/base, build-essential, claude-code

# SAND-03: 0.0.0.0 绑定
sandbox/start.sh              -- 需包含 hostname 0.0.0.0

# SAND-04: 浏览器可访问完整 UI
sandbox/e2b.toml              -- 需包含 template_id
01-02-SUMMARY.md              -- 需包含人工验证通过记录
```

### Phase 2 验证需检查的关键文件和模式

```
# PORT-01: Landing 页
apps/site/src/app/page.tsx                        -- 需存在且有产品介绍内容

# PORT-02: E2B SDK 创建沙箱
apps/site/src/app/api/sandbox/create/route.ts     -- 需导出 POST, 调用 createSandbox
apps/site/src/lib/e2b.ts                          -- 需导出 createSandbox

# PORT-03: 恢复暂停的沙箱
apps/site/src/components/cloud/SandboxRestore.tsx  -- 需包含 loadSandbox, clearSandbox
apps/site/src/lib/sandbox-storage.ts              -- 需导出 saveSandbox, loadSandbox, clearSandbox

# LIFE-03: 多 Provider Key
apps/site/src/components/cloud/ApiKeyForm.tsx      -- 需确认无 key 输入（per 决策）
02-02-SUMMARY.md                                  -- 需包含 LIFE-03 决策说明
```

### REQUIREMENTS.md 修改示例

```markdown
# 修改前:
| SAND-04 | Phase 4 | Pending |

# 修改后:
| SAND-04 | Phase 1 | Complete |
```

## State of the Art

本阶段无技术栈变更。所有涉及的文件和框架均在 Phase 1-3 中已确定。

## Open Questions

1. **Phase 1 Plan 02 的人工验证记录是否足够作为 SAND-04 的 VERIFIED 证据？**
   - What we know: 01-02-SUMMARY.md 记录了 /api/health 返回 sqlite:true, claude_cli:true，Web UI 首页正常返回标题 "CodePilot"
   - What's unclear: 没有截图或浏览器访问日志
   - Recommendation: 将人工验证结果作为 VERIFIED 证据，在 Human Verification Required 部分说明需要实际浏览器验证

## Validation Architecture

本阶段不涉及代码变更，因此无测试要求。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | N/A (documentation-only phase) |
| Config file | N/A |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAND-01~04 | Phase 1 VERIFICATION.md 存在且覆盖全部需求 | manual-review | `test -f .planning/phases/01-e2b-sandbox-template/01-VERIFICATION.md` | Wave 0 |
| PORT-01~03, LIFE-03 | Phase 2 VERIFICATION.md 存在且覆盖全部需求 | manual-review | `test -f .planning/phases/02-portal-entry-site/02-VERIFICATION.md` | Wave 0 |
| SAND-04 | REQUIREMENTS.md traceability 更新 | manual-review | `grep "SAND-04.*Phase 1.*Complete" .planning/REQUIREMENTS.md` | Wave 0 |

### Sampling Rate
- **Per task commit:** `test -f` 验证文件存在
- **Per wave merge:** 检查文件内容完整性
- **Phase gate:** 三个 success criteria 全部满足

### Wave 0 Gaps
None -- 本阶段的产物即是文档文件本身，无需前置测试基础设施。

## Sources

### Primary (HIGH confidence)
- 03-VERIFICATION.md -- VERIFICATION.md 格式参考（实际文件，130 行）
- 01-01-PLAN.md / 01-02-PLAN.md -- Phase 1 must_haves 定义
- 02-01-PLAN.md / 02-02-PLAN.md -- Phase 2 must_haves 定义
- 01-01-SUMMARY.md / 01-02-SUMMARY.md -- Phase 1 执行结果
- 02-01-SUMMARY.md / 02-02-SUMMARY.md -- Phase 2 执行结果
- REQUIREMENTS.md -- 当前 traceability 状态

### Secondary (MEDIUM confidence)
- 源文件检查（所有 12 个关键文件均已确认存在）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 纯文档工作，无技术风险
- Architecture: HIGH - 格式模板已有（03-VERIFICATION.md）
- Pitfalls: HIGH - 基于实际项目数据分析

**Research date:** 2026-03-13
**Valid until:** 无限期（文档模板不会过期）
