# Phase 3: Persistence & Hardening - Research

**Researched:** 2026-03-13
**Domain:** E2B sandbox lifecycle (pause/resume), port forwarding, production hardening
**Confidence:** MEDIUM

## Summary

Phase 3 核心是两个需求：LIFE-01（沙箱空闲自动暂停 + 恢复后数据完整保留）和 LIFE-02（端口转发面板）。E2B SDK v2.14+ 提供 `pause()` / `Sandbox.connect()` 原生暂停恢复能力，以及 `getHost(port)` 端口转发。两者 API 成熟度较高，但存在已知的多次 pause/resume 后文件丢失 bug（GitHub #884，截至 2026-03 仍 open），需要实施保护措施。

入口站（apps/site）需要新增心跳 API、暂停/恢复逻辑、IP 限流。CodePilot 主应用需要新增 Ports tab 到 RightPanel。生产加固涉及超时管理、错误重试、清理逻辑——这些都在现有代码结构上做增量扩展，不需要引入新的重量级依赖。

**Primary recommendation:** 基于 E2B SDK 原生 `pause()` + `Sandbox.connect()` 实现暂停恢复，心跳由入口站 API 管理空闲计时，端口扫描通过沙箱内 `ss -tlnp` 命令实现。IP 限流使用内存 Map（零成本），不引入 Redis/KV。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 空闲超时时间固定 15 分钟
- 客户端心跳检测：CodePilot 前端定期发 heartbeat 到入口站 API，入口站跟踪最后活动时间
- 使用 E2B betaPause 暂停机制，保存文件系统和进程状态（#884 文件丢失风险通过测试验证 + 保护措施应对）
- 暂停前 2 分钟弹出倒计时警告栏，用户可点击延长
- 沙箱最大生命周期 24 小时，到期前警告用户保存工作，到期后强制暂停
- Ports tab 放在 AppShell 右侧面板，与现有 Files tab 并列
- 端口发现方式：沙箱内定期运行 ss/netstat 扫描监听端口，通过 API 返回结果
- 点击端口链接在新浏览器 tab 打开 E2B 端口公开 URL
- 仅在云端（E2B 沙箱）模式下显示 Ports tab，桌面版不显示
- 沙箱超时管理：24 小时强制上限，入口站自动清理过期沙箱
- IP 级限流：每个 IP 每小时最多创建 N 个沙箱，防止滥用 E2B 资源
- 错误处理增强：沙箱创建/恢复失败时自动重试 1-2 次，仍失败则显示明确错误提示和建议操作
- 监控方案：console 日志 + Vercel 自带 Function Logs，零额外成本

### Claude's Discretion
- 心跳间隔和具体 heartbeat API 设计
- betaPause 保护措施的具体实现（如暂停前 flush、校验恢复完整性）
- 端口扫描频率和 API 端点设计
- 云端模式检测的具体实现方式（环境变量 vs URL 判断）
- IP 限流的具体阈值和实现方式（内存 vs KV）
- 倒计时警告和到期警告的具体 UI 实现
- 过期沙箱清理的触发方式（定时 vs 访问时清理）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIFE-01 | 沙箱在用户空闲后自动暂停，保存完整文件系统和进程状态 | E2B SDK `pause()` + `Sandbox.connect()` 原生支持；心跳 API 跟踪空闲；#884 bug 需保护措施 |
| LIFE-02 | CodePilot UI 新增端口转发面板，展示沙箱内暴露的端口及可点击的预览链接 | E2B `getHost(port)` 生成公开 URL；沙箱内 `ss -tlnp` 扫描端口；RightPanel 已有 tab 结构可扩展 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| e2b | ^2.14.1 | 沙箱 pause/resume/getHost | 已安装，项目核心依赖 |
| next | 15.3.6 | API Routes (心跳/暂停/端口) | 已安装，入口站和主应用框架 |
| react | ^19 | UI 组件 (Ports tab, 警告栏) | 已安装 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (无新增依赖) | - | - | 本阶段不需要引入新库 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 内存 Map 限流 | @upstash/ratelimit + Vercel KV | KV 有额外成本和依赖；内存 Map 在 serverless 间不共享但对当前规模够用 |
| ss 命令扫描端口 | /proc/net/tcp 解析 | ss 更直观，/proc 解析复杂但无需外部命令 |

**Installation:**
```bash
# 无需安装新依赖，全部使用现有库
```

## Architecture Patterns

### 入口站新增 API 结构
```
apps/site/src/app/api/sandbox/
├── create/route.ts          # 已有 — 创建沙箱
├── status/route.ts          # 已有 — 检查沙箱状态
├── heartbeat/route.ts       # 新增 — 接收心跳，重置空闲计时器
├── pause/route.ts           # 新增 — 手动暂停沙箱
└── resume/route.ts          # 新增 — 恢复已暂停的沙箱
```

### CodePilot 主应用新增结构
```
src/
├── app/api/ports/route.ts          # 新增 — 扫描沙箱内监听端口
├── components/layout/RightPanel.tsx # 修改 — 增加 Ports section
├── components/cloud/
│   ├── PortsPanel.tsx              # 新增 — 端口列表 + 链接
│   ├── IdleWarningBanner.tsx       # 新增 — 暂停倒计时警告
│   └── SandboxRestore.tsx          # 已有 — 扩展支持暂停态恢复
├── hooks/
│   ├── useHeartbeat.ts             # 新增 — 定期发心跳到入口站
│   └── usePorts.ts                 # 新增 — 轮询端口列表
└── lib/sandbox-storage.ts          # 修改 — 增加 paused 状态字段
```

### Pattern 1: 心跳 + 空闲检测
**What:** 前端定期向入口站发 heartbeat，入口站维护每个沙箱的最后活动时间。当超过 15 分钟无心跳时，入口站 API 调用 `sandbox.pause()`。
**When to use:** 在云端模式下始终激活。
**Example:**
```typescript
// apps/site/src/app/api/sandbox/heartbeat/route.ts
// Source: E2B docs + project pattern
import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";

// 内存中跟踪沙箱最后活动时间（Vercel Serverless 实例级）
const lastActivity = new Map<string, number>();

export async function POST(req: NextRequest) {
  const { sandboxId } = await req.json();
  if (!sandboxId) {
    return NextResponse.json({ error: "Missing sandboxId" }, { status: 400 });
  }
  lastActivity.set(sandboxId, Date.now());
  // 同时续期沙箱 timeout 防止 E2B 自动 kill
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.setTimeout(30 * 60 * 1000); // 30 分钟滚动窗口
  } catch {
    // 沙箱已暂停或已销毁
    return NextResponse.json({ status: "paused_or_dead" });
  }
  return NextResponse.json({ status: "ok" });
}
```

### Pattern 2: 端口扫描 API
**What:** 沙箱内 API Route 运行 `ss -tlnp` 命令，解析输出返回监听端口列表。
**When to use:** Ports tab 定期轮询此端点。
**Example:**
```typescript
// src/app/api/ports/route.ts
import { NextResponse } from "next/server";
import { execSync } from "child_process";

interface PortInfo {
  port: number;
  process: string;
}

export async function GET() {
  try {
    const output = execSync("ss -tlnp", { encoding: "utf-8", timeout: 5000 });
    const ports: PortInfo[] = [];
    for (const line of output.split("\n").slice(1)) {
      const match = line.match(/:(\d+)\s/);
      const procMatch = line.match(/users:\(\("([^"]+)"/);
      if (match) {
        const port = parseInt(match[1]);
        // 过滤掉 CodePilot 自身的 3000 端口和系统端口
        if (port > 1024 && port !== 3000) {
          ports.push({ port, process: procMatch?.[1] || "unknown" });
        }
      }
    }
    return NextResponse.json({ ports });
  } catch {
    return NextResponse.json({ ports: [] });
  }
}
```

### Pattern 3: 云端模式检测
**What:** 检测当前是否运行在 E2B 沙箱环境中，决定是否显示 Ports tab 和启用心跳。
**When to use:** AppShell 初始化时。
**Recommended approach:** 检测环境变量 `E2B_SANDBOX_ID`（E2B 沙箱内自动设置）。
```typescript
// 在 API Route 中
const isCloud = !!process.env.E2B_SANDBOX_ID;

// 在前端 — 通过 API 暴露或检测 URL 模式
// E2B 沙箱 URL 格式: https://3000-{sandboxId}.e2b.dev
const isCloud = typeof window !== "undefined" && window.location.hostname.endsWith(".e2b.dev");
```

### Pattern 4: PanelContent 扩展
**What:** 扩展 `PanelContent` 类型以支持 Ports。
**When to use:** 添加 Ports tab 时。
**Example:**
```typescript
// src/hooks/usePanel.ts — 修改
export type PanelContent = "files" | "tasks" | "ports";
```
**注意:** 当前 RightPanel 实际上不使用 tab 切换——它直接渲染 TaskList + FileTree。Ports 需要作为第三个区块或条件渲染区域添加。更简单的方案是在 RightPanel 底部添加可折叠的 Ports section（云端模式下），而不是完整的 tab 系统。

### Anti-Patterns to Avoid
- **在 Vercel Serverless 中依赖全局内存状态做跨请求数据共享:** Serverless 函数实例随时可能冷启动或切换实例，全局 Map 仅在同一实例内有效。对于心跳计时，这意味着空闲检测可能不完全精确——需要结合 E2B 自身的 timeout 机制作为兜底。
- **直接在前端调用 E2B SDK:** E2B SDK 需要 API Key，只能在服务端使用。前端通过 API Route 间接调用。
- **轮询频率过高:** 心跳和端口扫描都不应该太频繁。心跳 60 秒一次、端口扫描 10 秒一次即可。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 沙箱状态持久化 | 自己实现 checkpoint/snapshot | E2B `pause()` / `Sandbox.connect()` | E2B 原生保存内存 + 文件系统，4s/GB 暂停速度 |
| 端口公开 URL | 自己做 reverse proxy | E2B `getHost(port)` | 返回 `https://{port}-{id}.e2b.dev` 公开 URL |
| 沙箱超时管理 | 自己写定时器清理 | E2B `setTimeout()` + 自身 timeout 到期自动暂停 | E2B Pro 最长 24h，到期自动暂停 |

**Key insight:** E2B 平台层已经处理了最复杂的基础设施问题（快照、网络代理、超时），本阶段核心工作是在应用层做好"胶水"——心跳机制、UI 提示、错误处理。

## Common Pitfalls

### Pitfall 1: #884 多次 pause/resume 文件丢失
**What goes wrong:** E2B SDK 在多次暂停/恢复循环后可能丢失文件变更（GitHub #884，截至 2026-03 仍 open）。
**Why it happens:** E2B 快照机制在反复操作时的 bug，具体根因未公开。
**How to avoid:**
1. 暂停前通过 `sandbox.commands.run("sync")` 强制 flush 文件系统缓冲
2. 恢复后通过健康检查 API 验证沙箱完整性（检查关键文件是否存在）
3. 如果恢复后检测到数据不完整，提示用户创建新沙箱
4. 记录每次 pause/resume 操作日志，方便排查
**Warning signs:** 用户报告"代码丢了"或恢复后看到旧版本文件。

### Pitfall 2: Serverless 内存限流的局限性
**What goes wrong:** Vercel Serverless 函数的内存 Map 不在实例间共享，同一 IP 的请求可能命中不同实例，导致限流不准确。
**Why it happens:** Serverless 架构的无状态特性。
**How to avoid:** 接受内存限流是"尽力而为"的，不是精确的。真正防滥用靠 Vercel WAF 或后续升级到 KV。当前阶段内存 Map 足够阻止最简单的滥用。
**Warning signs:** 限流阈值看起来不生效。

### Pitfall 3: E2B timeout 与心跳脱节
**What goes wrong:** 如果心跳 API 没有同时 `setTimeout()` 续期 E2B 沙箱，E2B 可能在我们的 15 分钟空闲计时器之前自动 kill 沙箱。
**Why it happens:** `createSandbox()` 当前设置 `timeoutMs: 3_600_000`（1 小时），如果用户持续工作超过 1 小时但心跳没有续期 E2B timeout，沙箱会被 kill 而不是暂停。
**How to avoid:** 每次收到心跳时调用 `sandbox.setTimeout()` 滚动续期（如 30 分钟）。同时在 `Sandbox.create()` 时考虑设置更长的初始 timeout。
**Warning signs:** 活跃使用中的沙箱突然消失。

### Pitfall 4: connect() 覆盖 autoPause 设置
**What goes wrong:** E2B SDK 的 `Sandbox.connect()` 会将 `autoPause` 硬编码为 `false`（GitHub #875）。
**Why it happens:** SDK 内部 bug，`connect()` 方法的请求体中 `autoPause` 被强制设为 false。
**How to avoid:** 不依赖 E2B 的 `autoPause` 功能，而是自己在入口站管理空闲检测 + 手动调用 `pause()`。这恰好与 CONTEXT.md 中的决定（客户端心跳检测）一致。
**Warning signs:** 沙箱超时后没有暂停而是直接被 kill。

### Pitfall 5: sandbox-storage.ts 未区分暂停态
**What goes wrong:** 当前 `SavedSandbox` 接口只有 `sandboxId`、`url`、`createdAt`，没有暂停状态信息。SandboxRestore 组件用 `checkSandbox()` 检查存活状态，但暂停的沙箱会被判为 `alive: false`（因为 `Sandbox.connect()` 会自动恢复）。
**Why it happens:** 原始设计只考虑了"运行中"和"已销毁"两种状态。
**How to avoid:** 扩展 `SavedSandbox` 增加 `paused?: boolean` 字段；`checkSandbox()` 需要区分"不存在"和"已暂停"状态；SandboxRestore 组件需要展示"恢复暂停的沙箱"提示。
**Warning signs:** 暂停的沙箱被误判为已过期并清除。

## Code Examples

### E2B Pause/Resume 完整流程
```typescript
// Source: https://e2b.dev/docs/sandbox/persistence
import { Sandbox } from "e2b";

// 暂停沙箱
async function pauseSandbox(sandboxId: string): Promise<boolean> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    // 暂停前 flush 文件系统（#884 保护措施）
    await sandbox.commands.run("sync");
    await sandbox.pause();
    return true;
  } catch (err) {
    console.error(`Failed to pause sandbox ${sandboxId}:`, err);
    return false;
  }
}

// 恢复沙箱（connect 自动恢复已暂停的沙箱）
async function resumeSandbox(
  sandboxId: string
): Promise<{ url: string } | null> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: 30 * 60 * 1000, // 恢复后 30 分钟 timeout
    });
    const url = "https://" + sandbox.getHost(3000);
    return { url };
  } catch (err) {
    console.error(`Failed to resume sandbox ${sandboxId}:`, err);
    return null;
  }
}
```

### 内存 IP 限流
```typescript
// Source: Vercel rate limiting pattern
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxPerHour: number): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true; // allowed
  }
  if (entry.count >= maxPerHour) {
    return false; // blocked
  }
  entry.count++;
  return true;
}

// 定期清理过期条目防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimit) {
    if (now > entry.resetAt) rateLimit.delete(ip);
  }
}, 60_000);
```

### getHost 端口 URL 生成
```typescript
// Source: https://e2b.dev/docs/sdk-reference/js-sdk/v2.2.9/sandbox
import { Sandbox } from "e2b";

// 在入口站 API 中为前端生成端口 URL
async function getPortUrl(sandboxId: string, port: number): Promise<string> {
  const sandbox = await Sandbox.connect(sandboxId);
  return "https://" + sandbox.getHost(port);
  // 返回格式: https://{port}-{sandboxId}.e2b.dev
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `betaPause()` | `pause()` | E2B SDK v2.x 后期 | 文档同时提到两种方法，SDK reference 显示 `betaPause()` 仍可用 |
| E2B timeout 到期 kill 沙箱 | timeout 到期自动暂停 | 2025 | 沙箱不再丢失，到期后可恢复 |
| 手动管理端口代理 | `getHost(port)` 自动公开 | E2B v2.x | 零配置端口转发 |

**注意:** SDK reference (v2.2.9) 仍显示 `betaPause()` 方法签名，而文档页面使用 `pause()`。建议在代码中尝试 `pause()`，如果不可用则回退到 `betaPause()`。当前项目使用 `e2b@^2.14.1`，需要确认实际安装版本支持哪个方法。

## Open Questions

1. **`pause()` vs `betaPause()` 在 e2b@2.14.x 中的可用性**
   - What we know: 文档使用 `pause()`，SDK reference (v2.2.9) 显示 `betaPause()`
   - What's unclear: 当前安装的 2.14.x 版本实际暴露哪个方法
   - Recommendation: 实现时检查 `typeof sandbox.pause === 'function'`，优先用 `pause()`，回退 `betaPause()`

2. **#884 文件丢失 bug 是否已修复**
   - What we know: Issue 截至 2026-03 仍 open，E2B 维护者在跟进
   - What's unclear: 是否在某个版本中已静默修复
   - Recommendation: 无论如何都实施保护措施（暂停前 sync，恢复后校验），不依赖 bug 修复

3. **Vercel Serverless 函数并发与心跳精度**
   - What we know: Serverless 函数无状态，内存 Map 不跨实例共享
   - What's unclear: Vercel 在低流量时是否倾向于复用同一实例
   - Recommendation: 心跳同时调用 `setTimeout()` 续期 E2B timeout 作为兜底，即使内存中的空闲计时器不准确，E2B 自身 timeout 机制也能防止永久运行

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test + tsx (单元测试), Playwright (E2E) |
| Config file | tsconfig.json (tsx), playwright.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && npm run test:smoke` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIFE-01a | pauseSandbox 调用 sync + pause | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-pause.test.ts` | Wave 0 |
| LIFE-01b | resumeSandbox 调用 connect + 返回 URL | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-resume.test.ts` | Wave 0 |
| LIFE-01c | heartbeat API 接收 sandboxId 并更新活动时间 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/sandbox-heartbeat.test.ts` | Wave 0 |
| LIFE-01d | IP 限流拒绝超阈值请求 | unit | `node --experimental-strip-types --experimental-test-module-mocks --test apps/site/src/__tests__/rate-limit.test.ts` | Wave 0 |
| LIFE-02a | /api/ports 返回监听端口列表 | unit | `tsx --test src/__tests__/unit/ports-scan.test.ts` | Wave 0 |
| LIFE-02b | PortsPanel 渲染端口列表和链接 | manual-only | CDP 验证 — 需要云端环境 | N/A |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run test:smoke`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/site/src/__tests__/sandbox-pause.test.ts` — covers LIFE-01a (pause flow)
- [ ] `apps/site/src/__tests__/sandbox-resume.test.ts` — covers LIFE-01b (resume flow)
- [ ] `apps/site/src/__tests__/sandbox-heartbeat.test.ts` — covers LIFE-01c (heartbeat API)
- [ ] `apps/site/src/__tests__/rate-limit.test.ts` — covers LIFE-01d (IP rate limiting)
- [ ] `src/__tests__/unit/ports-scan.test.ts` — covers LIFE-02a (port scanning)

## Sources

### Primary (HIGH confidence)
- [E2B Sandbox Persistence Docs](https://e2b.dev/docs/sandbox/persistence) — pause/resume API, lifecycle config
- [E2B SDK Reference v2.2.9](https://e2b.dev/docs/sdk-reference/js-sdk/v2.2.9/sandbox) — betaPause(), connect(), getHost() 方法签名
- [E2B Sandbox Lifecycle](https://e2b.dev/docs/sandbox) — timeout 行为、最大生命周期

### Secondary (MEDIUM confidence)
- [GitHub #884](https://github.com/e2b-dev/E2B/issues/884) — 多次 pause/resume 文件丢失 bug（仍 open）
- [GitHub #875](https://github.com/e2b-dev/e2b/issues/875) — connect() 覆盖 autoPause 设置 bug
- [Vercel Rate Limiting Guide](https://vercel.com/guides/rate-limiting-edge-middleware-vercel-kv) — 边缘限流模式

### Tertiary (LOW confidence)
- 内存 Map 限流在 Vercel Serverless 上的实际效果 — 未找到官方性能数据，基于架构推理

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部使用已安装的现有库，无新依赖
- Architecture: MEDIUM — API 模式确认有效，但 pause/resume 可靠性受 #884 影响
- Pitfalls: HIGH — 来自官方 GitHub issues 和 SDK 文档的已知问题

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days — E2B SDK 更新较活跃，#884 状态可能变化)
