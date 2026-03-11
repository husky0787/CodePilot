# Phase 1: Web Mode Adaptation - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

剥离 Electron 耦合，让 CodePilot 以纯 Next.js Web 模式在浏览器中完整运行。所有 Electron IPC 调用优雅降级为 Web 替代方案，不阻塞核心功能。Next.js 绑定 `0.0.0.0` 供外部浏览器访问。

</domain>

<decisions>
## Implementation Decisions

### InstallWizard 处理
- Web 模式下完全跳过 InstallWizard，用户直接进入 Chat 主界面
- 不显示安装引导、不做后台检查，沙箱环境已预装所有依赖
- 首屏直接是 Chat 界面，零引导步骤

### 自动更新
- Web 模式下完全隐藏自动更新功能（AppShell 中的 updater 逻辑）
- 沙箱环境由模板控制版本，客户端不需要自更新能力

### ConnectionStatus 组件
- 保留 Claude CLI 连接状态指示（已连接/未连接）
- 隐藏"安装"按钮（Web 模式下无法通过 Electron IPC 安装）

### Web 模式检测
- 使用运行时检测 `window.electronAPI` 判断 Electron vs Web 模式
- 统一抽取为 `isElectron()` 工具函数，放在 `src/lib/utils.ts`
- 一次性替换所有现有的 `!!window.electronAPI?.xxx` 检测点（约 10 处文件），保持代码一致性
- Phase 1 暂不区分"普通 Web"和"E2B 沙箱"模式，统一视为非 Electron 即可

### Claude's Discretion
- Electron 降级的具体实现方式（文件夹选择器用 `<input>` 还是其他 Web API）
- `shell.openPath` 在 Web 模式下的替代方案
- Bridge 状态检测的降级处理
- `RESOURCES_PATH` 主题加载路径的 Web 模式适配
- `0.0.0.0` 绑定的配置方式和安全头处理
- 服务端代码中的平台检测方式（无 window 对象时）

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useNativeFolderPicker` hook: 已有 `isElectron` 检测，可作为降级模式的参考模板
- `src/lib/utils.ts`: 现有工具函数集合，`isElectron()` 将放在这里
- `src/lib/platform.ts`: 服务端平台检测工具（CLI 路径、PATH 扩展），Web 模式下仍然可用

### Established Patterns
- 可选链守卫: 大部分 Electron API 调用已用 `window.electronAPI?.xxx` 守卫，降级路径较清晰
- Next.js standalone output: `next.config.ts` 已配置 `output: 'standalone'`，适合沙箱部署
- serverExternalPackages: `better-sqlite3` 等原生模块已声明为外部包

### Integration Points
- `electron/preload.ts`: 暴露 5 组 API（versions, shell, dialog, install, bridge）— 需逐一降级
- `src/types/electron.d.ts`: ElectronAPI 类型定义 — 可作为降级检查清单
- `src/components/layout/AppShell.tsx`: updater 逻辑入口 — 需条件隐藏
- `src/components/layout/InstallWizard.tsx`: 安装引导入口 — 需跳过
- `src/components/layout/ConnectionStatus.tsx`: 连接状态 + 安装按钮 — 需部分隐藏
- `src/components/layout/ChatListPanel.tsx`: 文件夹选择 + openPath — 需 Web 替代

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-web-mode-adaptation*
*Context gathered: 2026-03-11*
