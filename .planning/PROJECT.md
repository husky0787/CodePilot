# CodePilot Cloud — E2B 沙箱云端开发环境

## What This Is

将 CodePilot（Claude Code 的桌面 GUI 客户端）部署到 E2B 云沙箱中，让用户无需安装即可通过浏览器使用完整的 CodePilot 功能。配合一个独立的 Next.js 入口站点，用户点击按钮即可创建并进入自己的云端开发环境。

## Core Value

用户通过浏览器一键获得完整的 CodePilot 云端开发环境，无需本地安装任何东西。

## Requirements

### Validated

<!-- 从现有代码库推断的已有能力 -->

- ✓ Chat 界面 — 完整的对话交互（消息发送、SSE 流式响应、工具调用展示） — existing
- ✓ 多 AI 提供商支持 — Anthropic/OpenAI/Google/Bedrock/Vertex 多提供商配置 — existing
- ✓ 会话管理 — 创建/切换/删除/搜索对话会话 — existing
- ✓ 文件浏览与编辑 — 工作区文件树浏览、代码编辑 — existing
- ✓ MCP/插件系统 — MCP 服务器配置与管理 — existing
- ✓ Skills 市场 — 技能浏览与安装 — existing
- ✓ 主题系统 — 多主题族、亮暗模式切换 — existing
- ✓ 国际化 — 中英双语 UI — existing
- ✓ Bridge 系统 — Telegram/Feishu/Discord/QQ 远程控制 — existing
- ✓ 图片生成 — 通过 AI SDK 生成图片 — existing
- ✓ 使用统计 — Token 用量统计与可视化 — existing

### Active

- [ ] E2B 沙箱适配 — CodePilot 能在 E2B 沙箱环境中正常运行
- [ ] 沙箱入口站点 — 独立 Next.js 站点，Landing 页 + 启动沙箱按钮
- [ ] 用户自带 API Key — 用户输入自己的 Anthropic API Key 进入沙箱
- [ ] 沙箱持久化 — 使用 E2B 原生能力持久化用户项目文件和沙箱状态
- [ ] 浏览器直连 — 用户通过浏览器直接访问沙箱内运行的 CodePilot Web UI

### Out of Scope

- Electron 桌面端改造 — 沙箱环境直接用 Next.js Web 模式，不需要 Electron
- noVNC/远程桌面方案 — 已确认使用浏览器直连 Next.js 方案
- 平台代理 API Key — 用户自带 Key，不做计费系统
- 用户注册/登录体系 — v1 不做用户账号系统
- 移动端适配 — 优先桌面浏览器体验

## Context

**现有架构优势：** CodePilot 本身就是 Next.js App Router 全栈应用，Electron 只是壳。去掉 Electron 层后，Next.js 部分可以直接在 E2B 沙箱中作为 Web 应用运行，用户通过浏览器访问。

**E2B 平台：** E2B 提供云端沙箱环境，支持端口暴露、文件系统持久化（snapshot）、SDK 控制沙箱生命周期。适合运行 Next.js dev server 并暴露给外部访问。

**关键挑战：**
- CodePilot 依赖 Claude Code CLI（`@anthropic-ai/claude-agent-sdk`），需要确保沙箱中 CLI 可用
- `better-sqlite3` 是原生模块，需确保沙箱环境能编译或预编译
- 沙箱内的 Next.js 需要能被外部浏览器访问（E2B 端口暴露）
- Electron 特有的 IPC/preload 逻辑需要在 Web 模式下优雅降级

**入口站点：** 独立的 Next.js 项目，调用 E2B SDK 创建/管理沙箱，提供简单的 Landing 页面让用户输入 API Key 并启动沙箱。

## Constraints

- **Tech Stack**: 入口站点使用 Next.js，与主项目技术栈一致
- **E2B 依赖**: 沙箱运行时依赖 E2B 平台，需要 E2B API Key
- **Claude Code CLI**: 沙箱中必须安装 Claude Code CLI 才能使用核心 AI 功能
- **原生模块**: better-sqlite3 需要在沙箱的 Linux 环境中编译
- **端口暴露**: E2B 沙箱需要暴露 Next.js 端口供外部浏览器访问

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 浏览器直连而非 noVNC | 轻量、低延迟，CodePilot 本身就是 Next.js 应用 | — Pending |
| 独立 Next.js 入口站点 | 关注点分离，入口站和 CodePilot 主体独立部署 | — Pending |
| 用户自带 API Key | 简化架构，无需计费系统，降低合规风险 | — Pending |
| E2B 原生持久化 | 利用 E2B snapshot 功能，无需额外存储方案 | — Pending |
| 去掉 Electron 层 | 沙箱环境无需桌面壳，直接用 Next.js Web 模式 | — Pending |

---
*Last updated: 2026-03-11 after initialization*
