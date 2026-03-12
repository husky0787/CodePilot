---
phase: 01-e2b-sandbox-template
plan: 02
subsystem: infra
tags: [e2b, sandbox, template-build, verification, production-mode]

requires: [01-01]
provides:
  - "E2B 沙箱模板 (template_id: 9114lthidrvmoik0fcdw)"
  - "端到端验证: 健康检查 sqlite:true + claude_cli:true"
  - "生产模式运行 (npm run build + next start)"
affects: [portal, persistence]

tech-stack:
  added: [e2b-cli]
  patterns: ["Docker 构建时代理 (BUILD_PROXY ARG) + 运行时清除", "预编译 Next.js 避免运行时 OOM"]

key-files:
  created:
    - .dockerignore
    - sandbox/e2b.toml
  modified:
    - sandbox/e2b.Dockerfile
    - sandbox/start.sh

key-decisions:
  - "dev→prod 模式切换: npm run dev 在 1024MB 沙箱中 OOM，改为 npm run build + next start"
  - "Docker 代理方案: BUILD_PROXY 自定义 ARG → ENV，运行时 ENV 清除"
  - ".dockerignore 排除 node_modules 防止宿主机 native 模块覆盖容器编译产物"

patterns-established:
  - "E2B 模板构建流程: e2b template build + BUILD_PROXY + .dockerignore"
  - "沙箱验证流程: Python SDK 创建沙箱 → curl 健康检查 → 确认 UI 加载"

requirements-completed: [SAND-04]

duration: ~45min (含多次调试)
completed: 2026-03-12
---

# Phase 1 Plan 2: E2B Template Build & Verification Summary

**E2B 沙箱模板构建成功，端到端验证通过：生产模式 Next.js + SQLite + Claude CLI 在 1024MB 沙箱中稳定运行**

## Performance

- **Duration:** ~45 min (含代理配置调试和 dev→prod 模式切换)
- **Started:** 2026-03-11
- **Completed:** 2026-03-12
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 4

## Accomplishments
- E2B 模板成功构建并注册 (template_id: 9114lthidrvmoik0fcdw, name: codepilot)
- 端到端验证通过: /api/health 返回 sqlite:true, claude_cli:true
- Web UI 首页正常加载 (HTML 标题 "CodePilot")
- 发现并修复 dev 模式 OOM 问题，切换为生产模式

## Task Commits

1. **Task 1: 构建 E2B 沙箱模板** - `49527b6` (feat) + `515c93a` (fix: prod mode)
2. **Task 2: 端到端沙箱验证** - 人工验证通过

## Files Created/Modified
- `sandbox/e2b.Dockerfile` - 增加 npm run build 预编译, BUILD_PROXY 代理方案
- `sandbox/start.sh` - dev→prod: npm run start --hostname 0.0.0.0
- `sandbox/e2b.toml` - 模板配置 (template_id: 9114lthidrvmoik0fcdw)
- `.dockerignore` - 排除 node_modules/.next/.git 等

## Decisions Made
- dev 模式在 1024MB 沙箱中 OOM (CPU 98%, 内存 96%)，必须用生产模式
- Docker 代理通过自定义 BUILD_PROXY ARG 传入（Docker 预定义 HTTP_PROXY ARG 在 legacy builder 中行为不一致）
- .dockerignore 必须排除 node_modules，否则 COPY . . 会覆盖容器内编译的 native 模块

## Deviations from Plan
- Plan 原设计为 dev server 模式，实际改为 production 模式（npm run build + next start）
- 代理配置比预期复杂：Docker daemon 代理用 127.0.0.1，容器内代理需用 172.17.0.1（Docker bridge）

## Issues Encountered
- Docker daemon 代理 vs 容器内代理 IP 不同（127.0.0.1 vs 172.17.0.1）
- node-gyp@12.2.0 与 Node v20.9.0 不兼容，改用 curl 直接下载 headers
- better-sqlite3 "Module did not self-register" — COPY . . 覆盖了容器内编译的 .node 文件
- dev 模式 OOM — Next.js 按需编译吃光 1024MB 内存

## Verification Results

| Check | Result |
|-------|--------|
| /api/health | `{"status":"ok","sqlite":true,"claude_cli":true}` |
| Web UI 首页 | HTML 正常返回，标题 "CodePilot" |
| 沙箱资源占用 | 生产模式稳定运行 |

## Next Phase Readiness
- 模板 ID (9114lthidrvmoik0fcdw) 可用于 Phase 2 (Portal) 创建沙箱实例
- 验证了完整的沙箱生命周期：创建 → 启动 → 健康检查 → UI 访问
- Python SDK 验证流程可复用于 Portal 后端集成

---
*Phase: 01-e2b-sandbox-template*
*Completed: 2026-03-12*
