# Requirements: CodePilot Cloud

**Defined:** 2026-03-11
**Core Value:** 用户通过浏览器一键获得完整的 CodePilot 云端开发环境，无需本地安装任何东西

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Sandbox 基础设施

- [x] **SAND-01**: CodePilot 以纯 Next.js Web 模式运行，所有 Electron IPC 调用优雅降级为 Web 替代方案
- [x] **SAND-02**: 自定义 E2B 沙箱模板预装 Node.js、Claude Code CLI、better-sqlite3、全部 CodePilot 依赖
- [x] **SAND-03**: 沙箱内 Next.js 绑定 `0.0.0.0` 并通过 E2B 端口暴露供外部浏览器访问
- [ ] **SAND-04**: 用户通过浏览器 URL 直接访问沙箱内完整的 CodePilot Chat/文件/工具 UI

### 入口站点

- [x] **PORT-01**: 独立 Next.js Landing 页面展示产品价值、提供 API Key 输入框和"启动沙箱"按钮
- [x] **PORT-02**: 后端通过 E2B SDK 创建沙箱实例，注入用户 API Key 为环境变量，返回沙箱访问 URL
- [x] **PORT-03**: Landing 页支持恢复已暂停的沙箱（通过 cookie/localStorage 记录沙箱 ID）

### 沙箱生命周期

- [ ] **LIFE-01**: 沙箱在用户空闲后自动暂停，保存完整文件系统和进程状态
- [ ] **LIFE-02**: CodePilot UI 新增端口转发面板，展示沙箱内暴露的端口及可点击的预览链接
- [x] **LIFE-03**: 入口站点支持输入多个 AI Provider 的 API Key（Anthropic/OpenAI/Google 等）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 模板生态

- **TMPL-01**: 模板市场，提供多种预配置环境（Python ML、Rust、Go 等）
- **TMPL-02**: 用户可自定义沙箱环境配置

### 用户体系

- **USER-01**: GitHub OAuth 登录查看沙箱历史
- **USER-02**: 团队/共享沙箱功能

### 高级功能

- **ADV-01**: Git 操作面板（clone/commit/push UI）
- **ADV-02**: 文件拖拽上传和项目打包下载
- **ADV-03**: 沙箱健康监控仪表板（状态、剩余时间、资源使用）

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 平台代理 API Key / 订阅计费 | 合规负担大，需要支付基础设施，API 成本风险高 |
| 用户账号/认证体系 | v1 不做，增加数月工作量，需要 OAuth/DB/GDPR |
| noVNC / 远程桌面 | CodePilot 本身是 Web 应用，无需桌面层 |
| 移动端适配 | 云端 IDE 在移动端体验差，桌面浏览器优先 |
| 自托管/私有部署 | 分散开发精力，E2B 是选定平台 |
| 7x24 常驻沙箱 | E2B 最长 24h，违背沙箱模型，持续产生费用 |
| 内置部署/托管 | 构建 PaaS 超出范围，提供导出即可 |
| 实时协作 | 复杂度极高，无限推迟 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAND-01 | Phase 1 | Complete |
| SAND-02 | Phase 1 | Complete |
| SAND-03 | Phase 1 | Complete |
| SAND-04 | Phase 1 | Pending |
| PORT-01 | Phase 2 | Complete |
| PORT-02 | Phase 2 | Complete |
| PORT-03 | Phase 2 | Complete |
| LIFE-01 | Phase 3 | Pending |
| LIFE-02 | Phase 3 | Pending |
| LIFE-03 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after roadmap creation*
