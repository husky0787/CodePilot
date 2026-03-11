# Pitfalls Research

**Domain:** Electron/Next.js 桌面应用部署到 E2B 云沙箱
**Researched:** 2026-03-11
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Electron API 耦合清理不彻底导致运行时崩溃

**What goes wrong:**
CodePilot 中有约 10 个文件引用 `window.electronAPI`（dialog、updater、install、shell.openPath 等）。在 Web 模式下这些 API 不存在，如果没有完整的降级策略，组件渲染时会抛出 TypeError，导致白屏或功能不可用。特别是 `ConnectionStatus`、`ChatListPanel`、`AppShell`、`InstallWizard` 等核心布局组件都依赖 Electron API。

**Why it happens:**
开发者通常只处理显而易见的 Electron 引用（如 `ipcRenderer`），遗漏了隐藏在条件分支和 hooks 中的引用。现有代码已有部分 `isElectron` 检查，但覆盖不完整，且 `InstallWizard`（用于安装 Claude Code CLI 的 Electron 安装向导）在 Web 模式下完全不适用。

**How to avoid:**
1. 全局搜索 `electronAPI`、`window.electronAPI`、`isElectron`，建立完整的 Electron 依赖清单
2. 为每个 Electron API 建立 Web 模式降级方案（如用浏览器 `<input type="file">` 替代 `dialog.openFolder`）
3. 创建统一的 `platform.ts` 适配层，集中处理 Electron/Web 差异
4. `InstallWizard` 在 Web 模式下应完全跳过——沙箱模板已预装 Claude Code CLI

**Warning signs:**
- 组件中直接访问 `window.electronAPI` 而非通过适配层
- `useNativeFolderPicker` hook 在 Web 模式返回 `isElectron: false` 但调用方未处理此分支
- 开发环境可以运行但 E2B 沙箱中白屏

**Phase to address:**
Phase 1（沙箱适配）——这是最基础的工作，必须在其他一切之前完成。

---

### Pitfall 2: better-sqlite3 原生模块在沙箱中编译失败

**What goes wrong:**
better-sqlite3 是 C++ 原生 Node.js 模块，需要 `node-gyp`、Python、C++ 编译器才能从源码构建。E2B 沙箱基于 Debian，默认镜像可能缺少构建工具链。Node.js 版本不匹配（特别是 Node 24+ 的 V8 API 变更）会导致编译错误。

**Why it happens:**
在 Electron 场景下，`after-pack.js` 脚本专门为 Electron ABI 重编译 better-sqlite3。去掉 Electron 后需要为沙箱的 Node.js 版本重新编译，但开发者容易忽略这一步，因为在本地开发环境中 npm install 通常能自动编译成功。

**How to avoid:**
1. 在 E2B 模板的 Dockerfile 中预装构建工具链：`apt-get install -y build-essential python3`
2. 在模板构建阶段完成 `npm install`，确保 better-sqlite3 已编译为正确的 Node.js ABI
3. 固定 Node.js 版本（推荐 Node 22 LTS），避免 Node 24 的编译兼容性问题
4. 考虑在模板中缓存 `node_modules`，避免每次沙箱启动都重新编译

**Warning signs:**
- `npm install` 日志中出现 `node-gyp` 相关错误
- `Error: Could not locate the bindings file` 运行时错误
- 沙箱模板构建成功但运行时 SQLite 操作失败

**Phase to address:**
Phase 1（沙箱模板构建）——模板 Dockerfile 必须包含完整工具链。

---

### Pitfall 3: E2B 端口暴露与 Next.js 开发服务器的地址绑定冲突

**What goes wrong:**
Next.js dev server 默认绑定 `localhost`（127.0.0.1），而 E2B 端口暴露需要服务绑定 `0.0.0.0`。用户在浏览器中通过 `https://{PORT}-{SANDBOX_ID}.e2b.app` 访问时得到连接拒绝。此外，沙箱内多个服务之间不能用 `localhost` 互相通信，需要用 E2B 提供的 host URL。

**Why it happens:**
在本地开发时 `localhost` 工作正常，开发者不会意识到在沙箱中需要改变绑定地址。E2B 的端口暴露机制基于域名路由，沙箱内外地址体系完全不同。

**How to avoid:**
1. 启动命令使用 `next dev -H 0.0.0.0 -p 3000` 显式绑定所有接口
2. 在 `next.config.ts` 中配置 `allowedDevOrigins`，允许 E2B 域名
3. 确认 WebSocket（HMR）也能通过 E2B 的端口暴露正常工作——可能需要配置 `webSocketUrl`
4. 在生产模式部署时使用 `next start` 而非 `next dev`，避免 HMR 相关问题

**Warning signs:**
- 浏览器访问沙箱 URL 时连接超时或 502 错误
- Next.js 启动成功但外部无法访问
- 控制台报 WebSocket 连接失败（HMR）

**Phase to address:**
Phase 1（沙箱适配）——端口配置是沙箱能否被外部访问的前提条件。

---

### Pitfall 4: 用户 API Key 在沙箱中泄露

**What goes wrong:**
用户的 Anthropic API Key 需要传入沙箱环境变量才能让 Claude Code CLI 工作。但沙箱内运行的代码（包括 AI agent 执行的任意代码）可以读取环境变量，存在 Key 被 prompt injection 或恶意代码窃取的风险。E2B 的 secret vault 功能仍在早期阶段。

**Why it happens:**
最简单的实现方式就是把 Key 塞到 `process.env.ANTHROPIC_API_KEY`，Claude Code CLI 也是这样读取的。但沙箱是一个完整的 Linux 环境，任何进程都能读取环境变量。

**How to avoid:**
1. API Key 仅传递给 Claude Code CLI 进程，不设为全局环境变量
2. 入口站点通过 E2B SDK 的 `envs` 参数传递 Key，而非写入沙箱文件系统
3. 考虑使用代理模式——入口站点代理 API 请求，Key 不进入沙箱（但会增加架构复杂度）
4. 在沙箱内限制网络出站，仅允许访问 Anthropic API 域名
5. 前端对 Key 做脱敏展示（仅显示后 4 位）

**Warning signs:**
- API Key 出现在沙箱的文件系统中（如 `.env` 文件）
- 沙箱内进程日志包含完整 Key
- 没有网络出站限制

**Phase to address:**
Phase 2（入口站点 + 安全设计）——在对外发布前必须解决。

---

### Pitfall 5: 沙箱会话超时导致用户工作丢失

**What goes wrong:**
E2B 沙箱默认 10 分钟不活动就超时销毁。用户正在编写代码或等待长时间的 AI 响应时，沙箱可能被销毁，所有未保存的工作（SQLite 中的对话历史、工作区文件改动）全部丢失。Pro 计划最大 24 小时会话也不够应对长期开发场景。

**Why it happens:**
E2B 设计为短期代码执行场景（几分钟），不是长期开发环境。自动暂停（auto-pause）可以缓解，但处于 beta 阶段，且暂停/恢复有已知 bug（多次恢复后文件变更可能不保留）。

**How to avoid:**
1. 启用 `autoPause: true`，将超时设为合理时长（如 30 分钟）
2. 入口站点维护心跳机制，在用户活跃时持续延长沙箱超时
3. 前端添加沙箱状态指示器，在即将超时时警告用户
4. 实现关键数据的外部备份机制（对话历史导出、项目文件同步到持久化存储）
5. 暂停/恢复后验证 SQLite 数据库完整性（WAL 模式可能在暂停时出问题）

**Warning signs:**
- 用户报告"回来后工作没了"
- 沙箱 ID 失效，connect 失败
- 暂停后恢复的沙箱中 SQLite 数据不完整

**Phase to address:**
Phase 3（持久化与用户体验优化）——但需在 Phase 1 预留心跳接口。

---

### Pitfall 6: Claude Code CLI 在沙箱中行为异常

**What goes wrong:**
Claude Code CLI (`@anthropic-ai/claude-code`) 运行时可能依赖特定的文件系统布局（`~/.claude/`）、git 配置、终端环境（TTY）等。在 E2B 沙箱的无头环境中，这些条件可能不满足，导致 CLI 无法启动、权限提示阻塞、或行为不一致。CodePilot 通过 `@anthropic-ai/claude-agent-sdk` 与 CLI 交互，SDK 的某些功能在沙箱中可能有未知限制。

**Why it happens:**
Claude Code CLI 主要为交互式终端设计。虽然有 `--dangerously-skip-permissions` 标志用于非交互模式，但 SDK 层的适配可能存在边缘情况。沙箱中的 HOME 目录结构和系统用户与本地环境不同。

**How to avoid:**
1. 在模板构建阶段运行 Claude Code CLI 基本健康检查（`claude --version`）
2. 预创建 `~/.claude/` 目录和必要的配置文件
3. 确保 `--dangerously-skip-permissions` 正确传递——CodePilot 的 `claude-client.ts` 中的 SDK 调用方式需验证
4. 在模板中安装 git 并做基本配置（`git config --global user.name/email`）
5. 测试 SDK 的 SSE 流在沙箱环境中是否正常工作

**Warning signs:**
- `claude-client.ts` 创建 conversation 时抛出错误
- SSE 流连接但收不到消息
- 工具调用（如文件读写）失败，提示权限不足

**Phase to address:**
Phase 1（沙箱适配）——核心功能依赖，必须首先验证。

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 直接用 `next dev` 而非 `next build + next start` | 开发快，HMR 可用 | 性能差，内存占用高，HMR WebSocket 在沙箱中不稳定 | 仅 Phase 1 原型验证阶段 |
| 用户 Key 直接放环境变量 | 实现简单，CLI 直接可用 | 安全风险，Key 对沙箱内所有进程可见 | MVP 阶段可接受，公开发布前必须改进 |
| 跳过 E2B 持久化直接用短期沙箱 | 避开 beta 功能的不稳定性 | 用户每次使用都是全新环境，无历史 | 如果定位为一次性体验可接受 |
| 硬编码沙箱资源配置（CPU/内存） | 不需要做配置管理 | 不同用户需求不同，大项目内存不够 | MVP 阶段可接受 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| E2B SDK 创建沙箱 | 不设置超时，沙箱 5 分钟后自动销毁 | 创建时设置 `timeoutMs`，活跃期间用 `setTimeout` 延长 |
| E2B 端口暴露 | 假设 URL 是 `http://localhost:3000`，硬编码在前端 | 用 `sandbox.getHost(3000)` 动态获取公开 URL |
| E2B 暂停/恢复 | 直接 `connect(sandboxId)` 不检查沙箱状态 | 先检查沙箱是否存在且可恢复，处理 404 和超时异常 |
| Claude Code CLI 环境 | 假设 HOME 目录结构与本地一致 | 在模板中显式设置 HOME 和必要的目录结构 |
| Next.js 在沙箱中 | 使用相对路径引用资源，依赖本地文件系统结构 | 使用绝对路径，确保工作目录正确设置 |
| SQLite WAL 模式 | 暂停沙箱时 WAL 文件未 checkpoint | 在暂停前执行 `PRAGMA wal_checkpoint(TRUNCATE)` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 每个用户一个完整沙箱 | E2B 账单快速增长，月费超预算 | 监控沙箱数量和运行时长，设置账单告警 | > 50 并发用户 |
| Next.js dev 模式在沙箱中 | 首次加载 10+ 秒，内存占用 500MB+ | 用 `next build && next start` 生产模式运行 | 沙箱内存分配 < 1GB 时 |
| SQLite 在高频写入时锁竞争 | 消息保存延迟，偶尔 SQLITE_BUSY | WAL 模式 + busy_timeout 设为 5000ms | 单会话多 tab 并发操作时 |
| 沙箱暂停时 4s/GiB 延迟 | 分配 4GiB 内存的沙箱暂停需 16 秒 | 控制沙箱内存分配在 1-2GiB | 内存分配 > 2GiB 时体验明显下降 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API Key 存储在沙箱文件系统 | 沙箱快照包含 Key，可能被其他用户访问 | Key 仅通过环境变量传递，不写入文件 |
| 沙箱端口默认公开可访问 | 任何人拿到 URL 可访问用户的 CodePilot 实例 | 使用 `allowPublicTraffic: false` + access token 认证 |
| 未限制沙箱网络出站 | 恶意代码可将 Key 发送到外部服务器 | 配置 E2B 网络策略，仅允许 Anthropic/OpenAI API 域名 |
| 入口站点 E2B API Key 泄露 | 攻击者可创建无限沙箱，产生大额账单 | E2B API Key 仅在服务端使用，不暴露给前端 |
| 沙箱间无隔离验证 | 理论上沙箱已隔离，但未验证 | 定期审计 E2B 安全公告，不在沙箱中存储敏感长期数据 |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 沙箱启动无进度反馈 | 用户点击按钮后 10-30 秒无响应，以为卡死 | 显示启动阶段进度条（创建沙箱 → 启动服务 → 就绪） |
| 沙箱即将超时无警告 | 用户正在工作时沙箱突然销毁 | 超时前 5 分钟弹出倒计时通知，提供续期按钮 |
| 暂停恢复后页面空白 | 用户回到已暂停的沙箱 URL，得到 502 错误 | 入口站点检测沙箱状态，自动恢复并重定向 |
| 错误信息技术化 | "Sandbox timeout" 对普通用户无意义 | 友好的错误页面 + 重新创建沙箱的一键操作 |
| 首次加载慢无解释 | 用户等待 Next.js 编译，不知道在干什么 | 使用生产构建消除编译等待，或展示加载动画说明"正在准备环境" |

## "Looks Done But Isn't" Checklist

- [ ] **Electron 降级:** 所有 10 个引用 `electronAPI` 的文件都有 Web 模式降级方案 -- 不仅是无报错，功能也要有替代
- [ ] **端口暴露:** Next.js 启动后外部浏览器能通过 E2B URL 访问 -- 验证 HTTPS、WebSocket、API 路由全部可用
- [ ] **SQLite 持久化:** 沙箱暂停再恢复后数据库完好 -- 测试暂停前写入数据、恢复后读取
- [ ] **Claude Code CLI:** 不仅能启动，还能完成完整对话流（发消息 → 流式响应 → 工具调用 → 文件操作） -- 用实际 API Key 端到端测试
- [ ] **API Key 安全:** Key 不出现在日志、文件、快照、浏览器控制台中 -- 全链路审计
- [ ] **沙箱超时:** 不活跃 30 分钟后沙箱正确暂停而非销毁 -- 测试恢复流程
- [ ] **入口站点:** 用户从零到使用的完整流程无断点 -- 输入 Key → 创建沙箱 → 等待 → 自动跳转 → 开始使用
- [ ] **Bridge 系统:** Telegram/飞书 Bridge 在沙箱中是否可用（长轮询/WebSocket 需要网络出站） -- 确认是否需要支持

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Electron API 崩溃 | LOW | 添加缺失的 `isElectron` 检查和降级分支即可 |
| better-sqlite3 编译失败 | LOW | 更新模板 Dockerfile 安装构建工具链，重新构建模板 |
| 端口暴露失败 | LOW | 修改启动命令绑定 `0.0.0.0`，配置 allowedDevOrigins |
| API Key 泄露 | HIGH | 立即通知用户轮换 Key，实现代理模式架构 |
| 用户数据丢失 | HIGH | 如无备份则不可恢复，需实现外部持久化方案 |
| Claude Code CLI 不可用 | MEDIUM | 排查沙箱环境差异，可能需重新设计模板或 SDK 调用方式 |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Electron API 耦合 | Phase 1: 沙箱适配 | 所有页面在无 Electron 的浏览器中正常渲染 |
| better-sqlite3 编译 | Phase 1: 模板构建 | 模板构建成功且 `npm test` 通过 |
| 端口暴露 | Phase 1: 沙箱适配 | 外部浏览器通过 E2B URL 成功访问 |
| API Key 安全 | Phase 2: 入口站点 | 安全审计通过，Key 不可被沙箱内非授权进程读取 |
| 会话超时 | Phase 3: 持久化 | 暂停 → 恢复 → 验证数据完整的自动化测试通过 |
| Claude Code CLI | Phase 1: 沙箱适配 | 端到端对话流测试通过 |
| 沙箱成本失控 | Phase 3: 运维 | 账单监控告警 + 沙箱自动清理机制就位 |

## Sources

- [E2B Documentation - Internet Access](https://e2b.dev/docs/sandbox/internet-access) -- 端口暴露机制详情 (HIGH confidence)
- [E2B Documentation - Sandbox Persistence](https://e2b.dev/docs/sandbox/persistence) -- 暂停/恢复机制与限制 (HIGH confidence)
- [E2B Documentation - Claude Code Template](https://e2b.dev/docs/template/examples/claude-code) -- 在 E2B 中运行 Claude Code 的官方示例 (HIGH confidence)
- [E2B Documentation - Sandbox Templates](https://e2b.dev/docs/sandbox-template) -- 模板构建方式 (HIGH confidence)
- [GitHub Issue #884 - Persistence Bug](https://github.com/e2b-dev/E2B/issues/884) -- 多次恢复后文件变更丢失 (MEDIUM confidence)
- [GitHub Issue #863 - Port Not Open](https://github.com/e2b-dev/e2b/issues/863) -- 端口暴露常见问题 (MEDIUM confidence)
- [GitHub Issue #1031 - Process Not Killed on Auto-Pause](https://github.com/e2b-dev/e2b/issues/1031) -- 自动暂停后进程残留 (MEDIUM confidence)
- [AI Sandbox Comparison 2026](https://www.superagent.sh/blog/ai-code-sandbox-benchmark-2026) -- E2B 性能与限制对比 (LOW confidence)
- [Northflank - Daytona vs E2B](https://northflank.com/blog/daytona-vs-e2b-ai-code-execution-sandboxes) -- E2B 短期会话限制分析 (LOW confidence)
- CodePilot 代码库 `src/` 目录 Electron 引用分析 -- 直接代码审查 (HIGH confidence)

---
*Pitfalls research for: CodePilot Cloud -- E2B 沙箱云端开发环境*
*Researched: 2026-03-11*
