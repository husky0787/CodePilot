# Phase 2: Portal Entry Site - Research

**Researched:** 2026-03-13
**Domain:** Next.js API Routes + E2B SDK + Anthropic API Key 验证
**Confidence:** HIGH

## Summary

本阶段在现有 `apps/site`（fumadocs 文档站，Next.js 15 + Tailwind 4 + shadcn）基础上扩展，添加 Landing 页面和 API Routes 实现沙箱创建/恢复流程。核心技术栈已就绪：Next.js App Router、shadcn/ui、framer-motion 均已安装。需要新增 `e2b` SDK（v2.14.1）用于沙箱生命周期管理，以及一个轻量级的 Anthropic API 调用（`/v1/messages/count_tokens`）用于验证用户的 API Key 有效性。

E2B SDK 提供完整的沙箱管理 API：`Sandbox.create()` 支持 `envs` 参数注入环境变量，`Sandbox.connect()` 支持通过 sandboxId 重连，`sandbox.getHost(port)` 返回可通过 `https://` 访问的公网主机名。沙箱默认超时 5 分钟，最长可设 24 小时（Pro plan）。Anthropic 的 count_tokens 端点免费、轻量，适合验证 API Key 有效性——无效 Key 会返回 401 错误。

**Primary recommendation:** 在 `apps/site` 中新增 `/api/sandbox/create` 和 `/api/sandbox/status` 两个 API Route，前端使用轮询机制检测沙箱就绪状态，确认后跳转到 `https://${sandbox.getHost(3000)}`。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 在现有 `apps/site`（fumadocs 文档站）基础上扩展，不新建独立项目
- Landing 页作为 `apps/site/src/app/page.tsx`，E2B 后端 API 在 `apps/site/src/app/api/sandbox/`
- 部署到 Vercel，API Routes 自动变 Serverless Functions
- 先用 Vercel 默认域名（.vercel.app），后续再绑定自定义域名
- E2B API Key 存在 Vercel 服务端环境变量中，用户不可见，平台方承担沙箱费用
- Landing 页只显示 Anthropic API Key 输入框（必填），其他 Provider Key 可在进入沙箱后通过 CodePilot 设置页配置
- API Key 不保存在浏览器 localStorage，每次访问重新输入（安全优先）
- 点击"启动沙箱"后，服务端先用 Key 发送轻量级 API 请求验证有效性，验证通过后再创建沙箱
- Key 验证失败时在前端显示明确错误提示
- 在入口站内显示启动进度状态（创建沙箱 -> 启动服务 -> 就绪），确认沙箱可用后再跳转
- 不立即跳转到沙箱 URL，避免用户看到连接失败页面
- 沙箱启动预计 ~30 秒
- 通过 localStorage 记录沙箱 ID，回访时自动检查沙箱状态
- 沙箱仍活跃时，显示"恢复上次沙箱"和"创建新沙箱"两个选项
- 恢复沙箱不需要重新输入 API Key（沙箱环境变量仍存在）
- 沙箱已过期或不可用时，静默清除 localStorage 中的旧 ID，显示正常的新建流程，不额外提示

### Claude's Discretion
- Landing 页的视觉设计、内容结构和文案调性
- API Key 验证的具体实现方式（调用哪个 Anthropic API 端点）
- 启动进度的具体 UI 实现（进度条/步骤指示器/动画）
- localStorage 中沙箱 ID 的数据结构
- 错误处理和边界情况的具体 UX

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PORT-01 | 独立 Next.js Landing 页面展示产品价值、提供 API Key 输入框和"启动沙箱"按钮 | 现有 `apps/site` 已有 Next.js 15 + shadcn + framer-motion，Landing 页放在 `[lang]/(marketing)/page.tsx` 或新建根 `page.tsx`；shadcn Input/Button 组件直接可用 |
| PORT-02 | 后端通过 E2B SDK 创建沙箱实例，注入用户 API Key 为环境变量，返回沙箱访问 URL | E2B SDK v2.14.1 的 `Sandbox.create(templateId, { envs, timeoutMs })` + `sandbox.getHost(3000)` 完整支持 |
| PORT-03 | Landing 页支持恢复已暂停的沙箱（通过 cookie/localStorage 记录沙箱 ID） | E2B SDK 的 `Sandbox.connect(sandboxId)` 支持重连活跃沙箱；localStorage 存 sandboxId 即可 |
| LIFE-03 | 入口站点支持输入多个 AI Provider 的 API Key（Anthropic/OpenAI/Google 等） | CONTEXT.md 决定 Landing 页只输入 Anthropic Key，其他 Provider Key 在沙箱内 CodePilot 设置页配置；沙箱创建时 envs 可传入多个 Key |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.3.6 | 全栈框架（SSR + API Routes） | 已安装在 apps/site |
| e2b | 2.14.1 | E2B 沙箱创建/连接/管理 | E2B 官方 JS SDK，唯一选择 |
| react | 19.x | UI 框架 | 已安装 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | 4.x (base-nova style) | UI 组件（Input、Button、Card 等） | Landing 页表单和布局 |
| framer-motion | 12.x | 动画和过渡效果 | 启动进度动画、页面过渡 |
| lucide-react | 0.563.x | 图标 | UI 图标 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 直接 fetch Anthropic API | @anthropic-ai/sdk | SDK 太重，验证 Key 只需一个 fetch 调用 |
| localStorage | cookie | cookie 更安全但有大小限制，localStorage 足够存 sandboxId |

**Installation:**
```bash
cd apps/site && npm install e2b
```

## Architecture Patterns

### Recommended Project Structure
```
apps/site/src/
├── app/
│   ├── api/
│   │   ├── sandbox/
│   │   │   ├── create/route.ts    # POST: 验证 Key + 创建沙箱
│   │   │   └── status/route.ts    # GET: 检查沙箱状态 + 健康
│   │   └── search/route.ts        # 已有
│   ├── [lang]/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx           # 改造：添加 Cloud CTA 或独立 Cloud 区块
│   │   │   └── layout.tsx         # 已有
│   │   └── docs/                  # 已有
│   └── layout.tsx                 # 已有
├── components/
│   ├── cloud/
│   │   ├── ApiKeyForm.tsx         # API Key 输入表单（客户端组件）
│   │   ├── SandboxLauncher.tsx    # 启动进度指示器（客户端组件）
│   │   └── SandboxRestore.tsx     # 恢复沙箱提示（客户端组件）
│   ├── marketing/                 # 已有
│   └── ui/                        # shadcn 组件
└── lib/
    ├── e2b.ts                     # E2B SDK 封装（服务端）
    ├── validate-key.ts            # Anthropic Key 验证（服务端）
    └── site.config.ts             # 已有
```

### Pattern 1: API Key 验证（服务端 fetch）
**What:** 使用 Anthropic count_tokens 端点验证 Key 有效性
**When to use:** 用户提交 API Key 时，在创建沙箱之前
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'API Key 无效' };
    if (res.status === 403) return { valid: false, error: 'API Key 权限不足' };
    return { valid: false, error: `验证失败 (${res.status})` };
  } catch {
    return { valid: false, error: '网络错误，无法验证 API Key' };
  }
}
```

### Pattern 2: E2B 沙箱创建（API Route）
**What:** 服务端创建 E2B 沙箱并返回 sandboxId 和 URL
**When to use:** Key 验证通过后
**Example:**
```typescript
// Source: https://e2b.dev/docs/sdk-reference/js-sdk/v1.2.0/sandbox
import { Sandbox } from 'e2b';

const TEMPLATE_ID = '9114lthidrvmoik0fcdw';

async function createSandbox(anthropicKey: string) {
  const sandbox = await Sandbox.create(TEMPLATE_ID, {
    envs: {
      ANTHROPIC_API_KEY: anthropicKey,
    },
    timeoutMs: 60 * 60 * 1000, // 1 小时
  });

  const host = sandbox.getHost(3000);
  const url = `https://${host}`;

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
```

### Pattern 3: 沙箱状态检查与恢复
**What:** 通过 sandboxId 检查沙箱是否仍活跃
**When to use:** 用户回访时检查 localStorage 中的 sandboxId
**Example:**
```typescript
// Source: https://e2b.dev/docs/sdk-reference/js-sdk/v1.2.0/sandbox
import { Sandbox } from 'e2b';

async function checkSandbox(sandboxId: string): Promise<{
  alive: boolean;
  url?: string;
}> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    const host = sandbox.getHost(3000);
    return { alive: true, url: `https://${host}` };
  } catch {
    return { alive: false };
  }
}
```

### Pattern 4: 沙箱就绪轮询（前端）
**What:** 前端轮询 API 检查沙箱内 CodePilot 是否启动完成
**When to use:** 沙箱创建后，等待服务就绪再跳转
**Example:**
```typescript
async function pollSandboxReady(
  sandboxUrl: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${sandboxUrl}/api/health`);
      if (res.ok) return true;
    } catch {
      // 沙箱尚未就绪，继续轮询
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
```

### Pattern 5: localStorage 沙箱 ID 管理
**What:** 在 localStorage 存储沙箱信息以支持恢复
**When to use:** 沙箱创建成功后保存，回访时读取
**Example:**
```typescript
interface SavedSandbox {
  sandboxId: string;
  url: string;
  createdAt: number; // Unix timestamp
}

const STORAGE_KEY = 'codepilot-cloud-sandbox';

function saveSandbox(info: SavedSandbox) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

function loadSandbox(): SavedSandbox | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSandbox() {
  localStorage.removeItem(STORAGE_KEY);
}
```

### Anti-Patterns to Avoid
- **直接在前端调用 E2B SDK:** E2B API Key 必须保留在服务端，绝不暴露给浏览器
- **创建后立即跳转:** 沙箱需要约 30 秒启动，必须轮询 health 端点确认就绪
- **在 localStorage 存储 API Key:** CONTEXT.md 明确要求不保存 Key（安全优先）
- **用 Anthropic SDK 验证 Key:** 引入完整 SDK 只为发一个验证请求，过度依赖；直接 fetch 更轻量

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 沙箱管理 | 自建 E2B API HTTP 调用 | `e2b` npm 包 | 类型安全、自动重试、版本跟踪 |
| UI 组件 | 自建 Input/Button/Card | shadcn/ui | 已安装，一致性好，支持无障碍 |
| 动画效果 | CSS keyframes | framer-motion | 已安装，声明式 API，性能好 |
| API Key 格式校验 | 复杂正则 | 前端简单前缀检查 `sk-ant-` | Anthropic Key 以 `sk-ant-` 开头，后端才做真正验证 |

## Common Pitfalls

### Pitfall 1: E2B Serverless Cold Start
**What goes wrong:** Vercel Serverless Function 冷启动 + E2B 沙箱创建可能超出默认 10 秒 API 超时
**Why it happens:** Vercel Hobby plan 默认函数超时 10 秒，沙箱创建本身需要数秒
**How to avoid:** 在 `route.ts` 中设置 `export const maxDuration = 60`（需要 Vercel Pro plan）或将沙箱创建拆为异步：先返回 sandboxId 占位，后续轮询状态
**Warning signs:** API 返回 504 Gateway Timeout

### Pitfall 2: CORS 问题（轮询沙箱健康端点）
**What goes wrong:** 前端从入口站（vercel.app）fetch 沙箱（e2b.app）的 `/api/health` 端点被浏览器 CORS 策略阻止
**Why it happens:** 跨域请求默认被阻止
**How to avoid:** 方案一：通过入口站 API Route 代理健康检查请求（服务端 fetch 不受 CORS 限制）；方案二：在沙箱 CodePilot 中添加 CORS 头允许入口站域名
**Warning signs:** 浏览器 console 出现 CORS 错误

### Pitfall 3: 沙箱 URL 格式
**What goes wrong:** 拼接错误的沙箱 URL 导致 404
**Why it happens:** `getHost(3000)` 返回的是主机名（不含协议），格式为 `3000-<sandboxId>.e2b.app`
**How to avoid:** 始终使用 `https://${sandbox.getHost(3000)}` 拼接完整 URL
**Warning signs:** 跳转后页面空白或 404

### Pitfall 4: 沙箱超时过短
**What goes wrong:** 用户开始工作后沙箱在 5 分钟后自动销毁
**Why it happens:** `Sandbox.create()` 默认 `timeoutMs` 为 300,000ms（5 分钟）
**How to avoid:** 显式设置 `timeoutMs: 3600000`（1 小时）或更长
**Warning signs:** 用户报告沙箱突然断开

### Pitfall 5: Sandbox.connect() 对已销毁沙箱抛异常
**What goes wrong:** 尝试恢复已过期的沙箱时应用崩溃
**Why it happens:** `Sandbox.connect()` 对不存在的 sandboxId 会抛出异常而非返回 null
**How to avoid:** 必须 try/catch 包裹 `Sandbox.connect()`，捕获异常时清除 localStorage 并引导用户创建新沙箱
**Warning signs:** 未捕获的 Promise rejection

### Pitfall 6: Landing 页路由冲突
**What goes wrong:** 新建的 Cloud 相关页面与已有 `[lang]/(marketing)/page.tsx` 路由冲突
**Why it happens:** 现有站点使用 `[lang]` 动态路由和 `(marketing)` 路由组
**How to avoid:** Cloud 功能整合到已有的 marketing page，或在 `(marketing)` 组内新建 `/cloud` 子路由
**Warning signs:** 404 或渲染错误的页面

## Code Examples

### API Route: 创建沙箱
```typescript
// apps/site/src/app/api/sandbox/create/route.ts
// Source: E2B SDK docs + Anthropic count_tokens API
import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';

export const maxDuration = 60; // Vercel Pro plan

const TEMPLATE_ID = '9114lthidrvmoik0fcdw';

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'API Key 是必填项' }, { status: 400 });
  }

  // 1. 验证 Anthropic API Key
  const validation = await validateKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  // 2. 创建 E2B 沙箱
  try {
    const sandbox = await Sandbox.create(TEMPLATE_ID, {
      envs: { ANTHROPIC_API_KEY: apiKey },
      timeoutMs: 3600000, // 1 小时
    });

    const host = sandbox.getHost(3000);

    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      url: `https://${host}`,
    });
  } catch (err) {
    console.error('E2B sandbox creation failed:', err);
    return NextResponse.json(
      { error: '沙箱创建失败，请稍后重试' },
      { status: 500 },
    );
  }
}

async function validateKey(apiKey: string) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'API Key 无效' };
    return { valid: false, error: `验证失败 (${res.status})` };
  } catch {
    return { valid: false, error: '无法验证 API Key' };
  }
}
```

### API Route: 检查沙箱状态
```typescript
// apps/site/src/app/api/sandbox/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';

export async function GET(req: NextRequest) {
  const sandboxId = req.nextUrl.searchParams.get('id');
  if (!sandboxId) {
    return NextResponse.json({ error: 'Missing sandbox ID' }, { status: 400 });
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    const host = sandbox.getHost(3000);

    // 检查沙箱内 CodePilot 是否就绪
    let ready = false;
    try {
      const healthRes = await fetch(`https://${host}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      ready = healthRes.ok;
    } catch {
      // 尚未就绪
    }

    return NextResponse.json({
      alive: true,
      ready,
      url: `https://${host}`,
    });
  } catch {
    return NextResponse.json({ alive: false });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| E2B `Sandbox.reconnect()` | `Sandbox.connect()` | SDK v1.x+ | API 名称变更 |
| E2B legacy envs API | `Sandbox.create({ envs })` 参数 | SDK v1.x | 创建时直接传入，更简洁 |
| Next.js Pages Router API | Next.js App Router API Routes | Next.js 13+ | 使用 `route.ts` 文件约定 |

**Deprecated/outdated:**
- `Sandbox.reconnect()`: 已改为 `Sandbox.connect()`
- E2B legacy sandbox API (`e2b.dev/docs/legacy/`): 使用当前 SDK v1.x/v2.x API

## Open Questions

1. **Vercel Function 超时限制**
   - What we know: Hobby plan 限制 10 秒，Pro plan 可设 60 秒
   - What's unclear: 项目当前是否为 Pro plan
   - Recommendation: 代码中设置 `maxDuration = 60`，如果是 Hobby plan 则需要改为异步创建模式

2. **CORS 健康检查**
   - What we know: 从 vercel.app 域 fetch e2b.app 域会触发 CORS
   - What's unclear: E2B 沙箱是否默认添加 CORS 头
   - Recommendation: 通过入口站 API Route（`/api/sandbox/status`）代理健康检查，避免 CORS 问题

3. **E2B 沙箱并发限制**
   - What we know: E2B 按 team plan 限制并发沙箱数
   - What's unclear: 当前 team plan 的具体并发上限
   - Recommendation: API Route 中捕获 E2B 429/限额错误，向用户显示友好提示

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (tsx --test) |
| Config file | 无独立配置，使用 package.json scripts |
| Quick run command | `npm run test` (typecheck + unit) |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | Landing 页渲染 API Key 输入框和启动按钮 | smoke | `npx playwright test --grep @smoke` | Wave 0 |
| PORT-02 | API Route 创建沙箱并返回 URL | unit | `tsx --test apps/site/src/__tests__/sandbox-create.test.ts` | Wave 0 |
| PORT-03 | localStorage 恢复沙箱流程 | unit | `tsx --test apps/site/src/__tests__/sandbox-restore.test.ts` | Wave 0 |
| LIFE-03 | 多 Provider Key 输入（Phase 2 仅 Anthropic，其余沙箱内） | manual-only | N/A -- CONTEXT.md 决定 Landing 页只输 Anthropic Key | N/A |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run test:smoke`
- **Phase gate:** 全套测试通过 + CDP 验证 Landing 页 UI

### Wave 0 Gaps
- [ ] `apps/site/src/__tests__/sandbox-create.test.ts` -- 覆盖 PORT-02 API Route 逻辑（mock E2B SDK）
- [ ] `apps/site/src/__tests__/sandbox-restore.test.ts` -- 覆盖 PORT-03 恢复逻辑
- [ ] `e2b` 包安装: `cd apps/site && npm install e2b`

## Sources

### Primary (HIGH confidence)
- [E2B SDK Reference (JS v1.2.0)](https://e2b.dev/docs/sdk-reference/js-sdk/v1.2.0/sandbox) - Sandbox.create, connect, getHost API
- [E2B Environment Variables](https://e2b.dev/docs/sandbox/environment-variables) - envs 参数用法
- [E2B Sandbox Docs](https://e2b.dev/docs/sandbox) - 生命周期、超时、pause/resume
- [Anthropic Token Counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) - count_tokens 端点用于 Key 验证
- 项目代码 `apps/site/package.json` - 现有依赖确认
- 项目代码 `e2b.toml` - 模板 ID `9114lthidrvmoik0fcdw`

### Secondary (MEDIUM confidence)
- [npm e2b](https://www.npmjs.com/package/e2b) - 版本 2.14.1 确认
- E2B 沙箱 URL 格式 `https://<port>-<sandboxId>.e2b.app/`

### Tertiary (LOW confidence)
- Vercel Function 超时限制（需确认项目 plan 级别）
- E2B 团队并发沙箱限制（需确认 plan 细节）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 所有库已安装或有明确官方文档
- Architecture: HIGH - Next.js App Router + API Routes 是成熟模式
- Pitfalls: MEDIUM - CORS 和 Vercel 超时需要实际验证
- E2B SDK API: HIGH - 官方文档直接确认

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days - 稳定技术栈)
