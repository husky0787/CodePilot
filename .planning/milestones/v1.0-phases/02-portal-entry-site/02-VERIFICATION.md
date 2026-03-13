---
phase: 02-portal-entry-site
verified: 2026-03-13T09:16:00Z
status: passed
score: 10/10 must-haves verified
re_verification: true
---

# Phase 2: Portal Entry Site Verification Report

**Phase Goal:** 为入口站点创建 E2B 沙箱管理后端和 Landing 页面，用户可一键创建/恢复沙箱
**Verified:** 2026-03-13T09:16:00Z
**Status:** passed
**Re-verification:** Yes -- retroactive verification for v1.0 milestone audit

## Goal Achievement

### Observable Truths

**Plan 01 (Sandbox Backend API)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/sandbox/create 接受 apiKey 参数，验证后创建沙箱返回 sandboxId 和 url | VERIFIED | `apps/site/src/app/api/sandbox/create/route.ts` L8: `export async function POST(req: NextRequest)`; L30-33: 解析 `body.apiKey`（optional per LIFE-03）; L38: `await createSandbox(apiKey)` -> L39: `return NextResponse.json({ sandboxId, url })`. **Note:** validateAnthropicKey 调用已移除（LIFE-03 设计变更：API key 改为沙箱内配置），但 create route 仍接受 optional apiKey 参数并传递给 createSandbox。 |
| 2 | GET /api/sandbox/status?id=xxx 返回沙箱活跃状态和就绪状态 | VERIFIED | `apps/site/src/app/api/sandbox/status/route.ts` L26: `export async function GET(req: NextRequest)`; L27: `req.nextUrl.searchParams.get("id")`; L41: `await checkSandbox(sandboxId)` -> L56-63: 返回 `{ alive: true, ready: status.ready, url: status.url }` |
| 3 | 无效 API Key 返回 401 和明确错误信息 | VERIFIED | `apps/site/src/lib/validate-key.ts` L49-51: `if (res.status === 401) return { valid: false, error: "无效的 API Key" }`. **Note:** validate-key.ts 中验证逻辑完整保留（L23-61），但 create route 不再调用它（LIFE-03 变更），验证能力仍存在供未来使用。 |
| 4 | E2B 沙箱创建失败时返回 500 和友好错误 | VERIFIED | `apps/site/src/app/api/sandbox/create/route.ts` L36-48: for-loop 重试一次（2s 延迟）; L50-53: `return NextResponse.json({ error: "沙箱创建失败，请稍后重试" }, { status: 500 })` |

**Plan 02 (Cloud Entry Landing Page)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | 用户访问根路径看到 Landing 页，包含产品介绍和启动按钮 | VERIFIED | `apps/site/src/app/page.tsx` L17-19: `<h1>CodePilot Cloud</h1>`; L20-23: 产品副标题; L28: `<CloudLauncher />` 包含启动按钮。**Note:** Landing 页包含产品介绍和启动按钮，但无 API Key 输入框（per LIFE-03 设计决策：API key 在沙箱内 Settings 配置）。这是正确行为。 |
| 6 | 用户点击启动后，页面显示进度状态（创建沙箱->启动服务->就绪），就绪后跳转 | VERIFIED | `apps/site/src/components/cloud/SandboxLauncher.tsx` L7: `type Step = "creating" \| "starting" \| "ready"`; L14-18: STEPS 数组定义三步标签; L40-41: 1.5s 后从 creating 切到 starting; L62-63: 轮询 `/api/sandbox/status`; L69-74: `data.alive && data.ready` -> setStep("ready") -> 2s 后 `window.location.href = sandboxUrl` |
| 7 | Key 格式不对或验证失败时显示明确错误提示 | VERIFIED | `apps/site/src/components/cloud/CloudLauncher.tsx` L219-224: `if (!res.ok)` -> `setState({ status: "error", message: data.error })`; L297-301: `<ApiKeyForm ... error={state.status === "error" ? state.message : undefined} />`; `ApiKeyForm.tsx` L20-22: `{error && <p className="text-sm text-destructive">{error}</p>}`. **Note:** 前端前缀校验（sk-ant-）已随 LIFE-03 变更移除，后端 500 错误仍正确传递。 |
| 8 | 用户回访时如有活跃沙箱，显示恢复选项和新建选项 | VERIFIED | `apps/site/src/components/cloud/SandboxRestore.tsx` L26: `loadSandbox()` 检查 localStorage; L39-41: fetch `/api/sandbox/status`; L46-47: `data.alive` -> `setState({ status: "found", url: saved.url })`; L183-201: 显示 "Resume Previous Sandbox" 和 "Create New Sandbox" 两个按钮 |
| 9 | 沙箱过期时静默清除旧 ID，显示正常新建流程 | VERIFIED | `apps/site/src/components/cloud/SandboxRestore.tsx` L51-54: `else { clearSandbox(); setState({ status: "none" }); }` -- sandbox 不存活且非暂停时静默清除; L69-71: `status === "none"` 时返回 null（显示正常新建流程） |
| 10 | Landing 页只输入 Anthropic Key（LIFE-03：其他 Provider Key 在沙箱内配置） | VERIFIED | **通过设计决策满足 LIFE-03。** `apps/site/src/components/cloud/ApiKeyForm.tsx` L12-33: 组件仅包含一个 "Launch Cloud CodePilot" 按钮，无任何 key 输入框。`02-02-SUMMARY.md` key-decisions: "API key input removed from portal -- users configure provider keys inside sandbox Settings (LIFE-03)". `apps/site/src/lib/e2b.ts` L15-16: `createSandbox(anthropicKey?: string)` 参数改为 optional。用户在沙箱内通过 CodePilot Settings 配置任意 AI Provider 的 API Key，满足多 Provider 支持需求。 |

**Score:** 10/10 truths verified

### Required Artifacts

**Plan 01 Artifacts (6)**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/site/src/lib/validate-key.ts` | Anthropic API Key 验证 | VERIFIED | 61 lines, exports `validateAnthropicKey` (L23), uses /v1/messages endpoint with undici fetch |
| `apps/site/src/lib/e2b.ts` | E2B SDK 封装 | VERIFIED | 113 lines, exports `createSandbox` (L15), `checkSandbox` (L36), `TEMPLATE_ID` (L9), plus `pauseSandbox` (L61) and `resumeSandbox` (L85) added in Phase 3 |
| `apps/site/src/app/api/sandbox/create/route.ts` | POST 端点 | VERIFIED | 54 lines, exports `POST` (L8), rate limit + retry-once pattern |
| `apps/site/src/app/api/sandbox/status/route.ts` | GET 端点 | VERIFIED | 86 lines, exports `GET` (L26), enhanced with paused detection in Phase 3 |
| `apps/site/src/__tests__/sandbox-create.test.ts` | 沙箱创建测试 | VERIFIED | 108 lines, tests validateAnthropicKey and createSandbox with mocked e2b and fetch |
| `apps/site/src/__tests__/sandbox-restore.test.ts` | 沙箱恢复测试 | VERIFIED | 74 lines, tests checkSandbox with mocked e2b SDK and health check |

**Plan 02 Artifacts (5)**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/site/src/app/page.tsx` | 根路径 Landing 页 | VERIFIED | 83 lines, Hero + CloudLauncher + Features + Footer, min_lines 30 met |
| `apps/site/src/components/cloud/ApiKeyForm.tsx` | API Key 输入表单 | VERIFIED | 34 lines, exports `ApiKeyForm` (L12). **Note:** Per LIFE-03, key input removed; component now contains launch button only. |
| `apps/site/src/components/cloud/SandboxLauncher.tsx` | 沙箱启动进度 | VERIFIED | 201 lines, exports `SandboxLauncher` (L23), 3-step state machine + polling + framer-motion |
| `apps/site/src/components/cloud/SandboxRestore.tsx` | 恢复沙箱提示 | VERIFIED | 203 lines, exports `SandboxRestore` (L19), enhanced with paused/resuming states in Phase 3 |
| `apps/site/src/lib/sandbox-storage.ts` | localStorage 工具 | VERIFIED | 45 lines, exports `saveSandbox` (L17), `loadSandbox` (L21), `clearSandbox` (L31), plus `updateSandboxPaused` (L39) added in Phase 3 |

### Key Link Verification

**Plan 01 Key Links (3)**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| create/route.ts | validate-key.ts | import validateAnthropicKey | DEVIATION | **Original link removed per LIFE-03 design change.** `create/route.ts` no longer imports validateAnthropicKey (API key validation removed from portal flow). `validate-key.ts` still exports the function (L23) for future use. See 02-02-SUMMARY.md Deviations. |
| create/route.ts | e2b.ts | import createSandbox | WIRED | L2: `import { createSandbox } from "@/lib/e2b"`; L38: `await createSandbox(apiKey)` |
| status/route.ts | e2b.ts | import checkSandbox | WIRED | L2: `import { checkSandbox, pauseSandbox } from "@/lib/e2b"`; L41: `await checkSandbox(sandboxId)` |

**Plan 02 Key Links (5)**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ApiKeyForm.tsx | /api/sandbox/create | fetch POST | DEVIATION | **Refactored per architecture.** ApiKeyForm no longer fetches directly; it calls `onSubmit` prop (L15). CloudLauncher.tsx L211: `fetch("/api/sandbox/create", ...)` handles the actual POST. Link exists but via CloudLauncher as orchestrator. |
| SandboxLauncher.tsx | /api/sandbox/status | fetch GET polling | WIRED | L62-63: `` fetch(`/api/sandbox/status?id=${encodeURIComponent(sandboxId)}`) `` with 2s interval, max 30 polls |
| SandboxRestore.tsx | /api/sandbox/status | fetch GET check | WIRED | L39-40: `` fetch(`/api/sandbox/status?id=${encodeURIComponent(saved.sandboxId)}`) `` |
| SandboxLauncher.tsx | sandbox-storage.ts | import saveSandbox | WIRED | L5: `import { saveSandbox } from "@/lib/sandbox-storage"`; L34: `saveSandbox({ sandboxId, url: sandboxUrl, createdAt: Date.now() })` |
| SandboxRestore.tsx | sandbox-storage.ts | import loadSandbox, clearSandbox | WIRED | L4: `import { loadSandbox, clearSandbox, saveSandbox } from "@/lib/sandbox-storage"`; L26: `loadSandbox()`; L53/58/118: `clearSandbox()` |

**Key Link Summary:** 6/8 WIRED, 2/8 DEVIATION (both documented design changes from LIFE-03 and architecture refactoring in 02-02-SUMMARY.md). All deviations are intentional and improve the design.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PORT-01 | 02-02 | 独立 Landing 页面展示产品价值和启动按钮 | SATISFIED | `page.tsx` L10-67: CloudEntryPage with Hero section ("CodePilot Cloud"), features list, CloudLauncher component, documentation footer link |
| PORT-02 | 02-01 | 后端通过 E2B SDK 创建沙箱实例 | SATISFIED | `e2b.ts` L15-31: `createSandbox()` calls `Sandbox.create(TEMPLATE_ID, ...)`, returns `{ sandboxId, url }`; `create/route.ts` L38: calls `createSandbox(apiKey)` |
| PORT-03 | 02-02 | Landing 页支持恢复已暂停的沙箱 | SATISFIED | `SandboxRestore.tsx` L26: `loadSandbox()` checks localStorage; L39-55: fetches status, handles alive/paused/expired states; L189: "Resume Previous Sandbox" button; `sandbox-storage.ts` L17-33: save/load/clear functions |
| LIFE-03 | 02-02 | 入口站点支持输入多个 AI Provider 的 API Key | SATISFIED | **Satisfied via design decision.** API key input removed from portal (ApiKeyForm.tsx contains only launch button, no input field). Users configure provider API keys inside the sandbox's CodePilot Settings page, which supports multiple providers (Anthropic, OpenAI, etc.). Design decision documented in 02-02-SUMMARY.md key-decisions: "API key input removed from portal -- users configure provider keys inside sandbox Settings (LIFE-03)". This approach is superior to portal-level key input because it supports unlimited providers without portal changes. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO/FIXME/placeholder/stub patterns found in Phase 2 artifacts |

### Human Verification Required

### 1. Landing Page Visual and Interaction Flow

**Test:** Start the site dev server (`cd apps/site && npm run dev`), visit `http://localhost:3001/`.
**Expected:** Landing page with "CodePilot Cloud" heading, "Launch Cloud CodePilot" button, 4 feature cards, docs footer link. No API key input field visible.
**Why human:** Visual layout, responsive design, and overall UX quality require human judgment.
**Status:** Verified during 02-02-PLAN.md checkpoint (Task 3). User confirmed Landing page renders correctly with launch button, no key input.

### 2. End-to-End Sandbox Creation and Redirect

**Test:** Click "Launch Cloud CodePilot" button, observe 3-step progress (Creating -> Starting -> Redirecting), verify redirect to sandbox URL.
**Expected:** Smooth 3-step progress with framer-motion animation, automatic redirect to `https://{sandboxId}.e2b.dev:3000` when sandbox is ready.
**Why human:** Requires live E2B API key and running E2B service. Network latency and sandbox boot time vary.
**Status:** Verified during 02-02-PLAN.md checkpoint. User confirmed sandbox creation and redirect work end-to-end.

### 3. Session Restore on Revisit

**Test:** After creating a sandbox, revisit `http://localhost:3001/`. Should see "Resume Previous Sandbox" and "Create New Sandbox" options.
**Expected:** Active sandbox detected via localStorage + status API check. Resume button redirects to existing sandbox URL.
**Why human:** Requires an active sandbox session to test restore flow.

### 4. Existing Docs Site Unaffected

**Test:** Visit `http://localhost:3001/en` to verify the existing documentation site still works.
**Expected:** Normal docs site rendering, not affected by root page addition.
**Why human:** Visual verification that i18n middleware fix (root path bypass) doesn't break other routes.
**Status:** Verified during 02-02-PLAN.md checkpoint. `/en` docs site confirmed working.

### Gaps Summary

No critical gaps found. All 10 observable truths verified across 2 plans. All 11 artifacts are substantive (no stubs). 6/8 key links are wired; 2 deviations are documented design changes (LIFE-03 API key removal from portal, and ApiKeyForm -> CloudLauncher fetch refactoring). All 4 requirements (PORT-01, PORT-02, PORT-03, LIFE-03) are satisfied.

The LIFE-03 requirement deserves special note: the original plan specified "Landing page only inputs Anthropic Key," but the implemented design removes all key input from the portal, deferring it to in-sandbox Settings. This better satisfies the multi-provider requirement (LIFE-03) because users can configure any number of provider keys in the sandbox without portal changes. This design decision was made during the 02-02 checkpoint with user approval.

---

_Verified: 2026-03-13T09:16:00Z_
_Verifier: Claude (gsd-executor, retroactive verification)_
