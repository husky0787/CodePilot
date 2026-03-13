# Phase 5: createdAt Cleanup Integration — Research

**Researched:** 2026-03-13
**Status:** Complete
**Requirement IDs:** LIFE-01

## Executive Summary

Phase 5 是一个精确的 gap closure 阶段。服务端 24h cleanup-on-access 逻辑已完整实现，但客户端两个组件在调用 status API 时不传递 `createdAt` 参数，导致该逻辑成为死代码。修复范围极小，仅涉及 2 个文件的 fetch URL 修改。

## Current State Analysis

### 服务端（已完成）

**`apps/site/src/app/api/sandbox/status/route.ts`**
- 第 28 行：已解析 `createdAt` 查询参数
- 第 37-39 行：已计算 `age = Date.now() - createdAt`
- 第 44-53 行：已实现 24h cleanup-on-access 逻辑（`age > MAX_LIFETIME_MS` 时 force-pause）
- 逻辑完整，无需修改

### 客户端（存在 Gap）

**`apps/site/src/components/cloud/SandboxLauncher.tsx`**
- 第 34 行：`saveSandbox({ sandboxId, url: sandboxUrl, createdAt: Date.now() })` — 已存储 createdAt
- 第 62-63 行：`fetch(\`/api/sandbox/status?id=${encodeURIComponent(sandboxId)}\`)` — **缺少 createdAt 参数**
- 组件接收 `sandboxId` 和 `sandboxUrl` 作为 props，但不接收 `createdAt`
- 需要从 localStorage 读取或通过 props 传递 createdAt

**`apps/site/src/components/cloud/SandboxRestore.tsx`**
- 第 26 行：`loadSandbox()` 已加载包含 `createdAt` 的 SavedSandbox 对象
- 第 39-40 行：`fetch(\`/api/sandbox/status?id=${encodeURIComponent(saved.sandboxId)}\`)` — **缺少 createdAt 参数**
- `saved.createdAt` 已在作用域内可用，直接追加到 URL 即可
- 第 97 行：resume 后 `saveSandbox({ createdAt: Date.now() })` — resume 重置了 createdAt，合理

### 数据存储（已完成）

**`apps/site/src/lib/sandbox-storage.ts`**
- `SavedSandbox` 接口已包含 `createdAt: number`
- `saveSandbox()` / `loadSandbox()` 已正确持久化 createdAt

### 客户端 24h 保护（已完成）

**`apps/site/src/components/cloud/CloudLauncher.tsx`**
- 第 24-27 行：客户端 `MAX_LIFETIME_MS` / `LIFETIME_WARNING_MS` 常量
- 第 157-169 行：客户端 24h 定时器（warning at 23h, force-pause at 24h）
- 第 158-160 行的注释明确说明："For restored sandboxes, the age check happens server-side via the status API" — 这就是 Phase 5 要修复的链路

## Gap Analysis

| 组件 | 存储 createdAt | 传递给 status API | Gap |
|------|---------------|------------------|-----|
| SandboxLauncher | ✓ (line 34) | ✗ (line 63) | 需要传递 |
| SandboxRestore | ✓ (line 26, via loadSandbox) | ✗ (line 40) | 需要传递 |
| status API | — | ✓ 已解析 (line 28) | 无 |
| CloudLauncher | ✓ (客户端 24h 计时器) | — | 无（不直接调 status） |

## Implementation Approach

### SandboxLauncher 修复

**方案 A：从 localStorage 读取**（推荐）
- 在 poll 函数中调用 `loadSandbox()` 获取 `createdAt`
- 追加到 fetch URL：`?id=${sandboxId}&createdAt=${createdAt}`
- 优点：不需要修改组件 props 和父组件
- 缺点：轻微额外 localStorage 读取（可忽略，已在同一页面存储过）

**方案 B：通过 props 传递**
- 修改 `SandboxLauncherProps` 添加 `createdAt`
- 修改 `CloudLauncher.tsx` 传递 createdAt
- 缺点：需要在 CloudLauncher 中跟踪 createdAt 状态

**推荐方案 A**：SandboxLauncher mount 时已调用 `saveSandbox()`（第 34 行），所以 localStorage 中一定有数据。直接从 localStorage 读取最简洁。

### SandboxRestore 修复

最直接：`saved` 对象已在 `check()` 函数作用域内，直接追加 `&createdAt=${saved.createdAt}` 到 fetch URL。

## Testing Strategy

### 单元测试
- 验证 SandboxLauncher 的 status API 调用包含 createdAt 参数
- 验证 SandboxRestore 的 status API 调用包含 createdAt 参数

### 集成验证
- 创建沙箱 → 检查 status API 请求 URL 包含 createdAt
- 恢复沙箱 → 检查 status API 请求 URL 包含 createdAt
- 模拟 createdAt > 24h → 验证 status API 返回 `{ paused: true }`

### Validation Architecture

**Nyquist 验证维度：**
1. SandboxLauncher status 调用包含 createdAt — URL 字符串断言
2. SandboxRestore status 调用包含 createdAt — URL 字符串断言
3. 24h cleanup 逻辑可触发 — 现有 `sandbox-status.test.ts` 可扩展

## Risk Assessment

| 风险 | 影响 | 缓解 |
|------|------|------|
| createdAt 为 undefined/NaN | cleanup 逻辑跳过（安全降级） | 加 fallback 检查 |
| localStorage 被清除 | createdAt 丢失 | 服务端 cleanup 仍有客户端 24h 计时器兜底 |
| resume 后 createdAt 重置 | 24h 计时器从 resume 时重新开始 | 当前行为合理（resume = 新的生命周期） |

## Files to Modify

1. `apps/site/src/components/cloud/SandboxLauncher.tsx` — 添加 createdAt 到 status poll URL
2. `apps/site/src/components/cloud/SandboxRestore.tsx` — 添加 createdAt 到 status check URL
3. `apps/site/src/__tests__/sandbox-status.test.ts` — 可选：扩展测试覆盖 createdAt 参数

## RESEARCH COMPLETE
