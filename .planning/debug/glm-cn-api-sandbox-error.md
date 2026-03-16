---
status: awaiting_human_verify
trigger: "GLM CN API key with ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic in sandbox version shows exit code 1 error"
created: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:01:00Z
---

## Current Focus

hypothesis: E2B Dockerfile 安装的 claude-code@1.0.17 与 SDK 0.2.62 不兼容（SDK 期望 CLI 2.1.62+）
test: 已通过源码分析和版本比对确认
expecting: 更新 Dockerfile 中的 claude-code 版本后问题解决
next_action: 修复 Dockerfile 中的 claude-code 版本

## Symptoms

expected: GLM CN API 应该正常工作，消息能被处理并返回响应
actual: 发送消息后显示错误："Claude Code process exited with an error (Provider: GLM (CN))... Original error: Claude Code process exited with code 1"
errors: Claude Code process exited with code 1
reproduction: 在 E2B 沙箱中设置 GLM CN provider，配置 API key 和 ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic，在聊天中发送任意消息
started: 当前 Codepilot-3 的 E2B 沙箱部署存在此问题，本地运行正常

## Eliminated

- hypothesis: Codepilot-3 源码与 Codepilot-4 存在差异导致问题
  evidence: diff -rq src/ 对比显示只有 health/route.ts 不同（无关），所有关键文件（claude-client.ts、provider-resolver.ts、package.json）完全一致
  timestamp: 2026-03-12T00:00:30Z

- hypothesis: GLM CN provider 的数据库配置有问题
  evidence: 查询数据库确认 provider 配置正确（api_key 49字符，base_url 正确，protocol=anthropic），且本地 API 调用测试通过（curl 成功返回中文响应）
  timestamp: 2026-03-12T00:00:40Z

- hypothesis: 本地 Codepilot-3 无法连接 GLM CN API
  evidence: 在 Codepilot-3（端口3001）直接调用 /api/chat 成功获得 GLM 响应，证明本地运行完全正常
  timestamp: 2026-03-12T00:00:50Z

## Evidence

- timestamp: 2026-03-12T00:00:20Z
  checked: 两个项目的源码差异
  found: src/ 目录下仅 health/route.ts 不同，所有核心文件完全一致
  implication: 问题不在源码层面

- timestamp: 2026-03-12T00:00:25Z
  checked: SDK 和 CLI 版本信息
  found: SDK 0.2.62 的 package.json 声明 claudeCodeVersion="2.1.62"，本地 CLI 版本 2.1.70。Dockerfile 安装 claude-code@1.0.17
  implication: SDK 期望 CLI 2.1.62+，但沙箱中只有 1.0.17（跨大版本不兼容）

- timestamp: 2026-03-12T00:00:30Z
  checked: SDK 的 CLI 查找逻辑（sdk.mjs + claude-client.ts findClaudeBinary）
  found: SDK 优先使用 pathToClaudeCodeExecutable（来自 findClaudeBinary），如果未设置则 fallback 到内置 cli.js（v2.1.62）。findClaudeBinary 按候选路径搜索，/usr/local/bin/claude 排第一
  implication: 在沙箱中 findClaudeBinary 会找到 /usr/local/bin/claude（1.0.17），覆盖 SDK 内置的 2.1.62 cli.js

- timestamp: 2026-03-12T00:00:35Z
  checked: SDK 内置 cli.js 的版本标识
  found: cli.js 中包含 VERSION:"2.1.62"，确认 SDK 自带的 CLI 是 2.1.62 版本
  implication: 如果不设置 pathToClaudeCodeExecutable，SDK 会使用正确的 2.1.62 版本

- timestamp: 2026-03-12T00:00:45Z
  checked: 本地 API 调用测试
  found: curl POST 到 localhost:3001/api/chat 和 localhost:3000/api/chat 均成功返回 GLM 响应
  implication: 本地环境的 claude binary 版本(2.1.70)兼容 SDK 0.2.62，问题仅在沙箱环境

## Resolution

root_cause: E2B Dockerfile 中安装的 claude-code@1.0.17 与项目使用的 claude-agent-sdk@0.2.62 严重不兼容。SDK 期望 CLI 版本 2.1.62+，但沙箱中全局安装的是 1.0.17（跨大版本）。当 findClaudeBinary() 找到 /usr/local/bin/claude（1.0.17）时，会将其设为 pathToClaudeCodeExecutable，覆盖 SDK 内置的兼容 CLI (2.1.62)，导致 SDK 与 CLI 之间的通信协议不匹配，CLI 进程以 exit code 1 退出。
fix: 更新 sandbox/e2b.Dockerfile 中 claude-code 版本从 1.0.17 改为 2.1.62（与 SDK claudeCodeVersion 字段匹配）
verification: typecheck + 289 unit tests全部通过。需要用户重建 E2B 沙箱模板后在沙箱环境中验证 GLM CN API 调用
files_changed: [sandbox/e2b.Dockerfile]
