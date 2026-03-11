# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**Claude Code SDK (Core Integration):**
- Primary interface for AI chat functionality
- SDK/Client: `@anthropic-ai/claude-agent-sdk` (`query()` function)
- Client code: `src/lib/claude-client.ts`
- Spawns Claude Code CLI as a child process; streams SSE events back to frontend
- Supports session resume via `sdk_session_id`
- MCP server configuration passthrough (stdio, SSE, HTTP transports)
- Agent definitions registry: `src/lib/agent-sdk-agents.ts`
- Capabilities capture: `src/lib/agent-sdk-capabilities.ts`

**AI Provider System (Multi-Provider):**
- Unified provider resolution: `src/lib/provider-resolver.ts`
- Provider catalog with vendor presets: `src/lib/provider-catalog.ts`
- Protocols supported: `anthropic`, `openai-compatible`, `openrouter`, `bedrock`, `vertex`, `google`, `gemini-image`
- Auth styles: `api_key` (ANTHROPIC_API_KEY), `auth_token` (ANTHROPIC_AUTH_TOKEN), `env_only` (bedrock/vertex), `custom_header`

**Anthropic API:**
- Via `@ai-sdk/anthropic` (Vercel AI SDK adapter)
- Used for text generation outside Claude Code SDK sessions
- Client: `src/lib/text-generator.ts`

**OpenAI-Compatible APIs:**
- Via `@ai-sdk/openai` (Vercel AI SDK adapter)
- Supports any OpenAI-compatible endpoint (custom base URL)
- Client: `src/lib/text-generator.ts`

**Google Gemini:**
- Via `@ai-sdk/google` (Vercel AI SDK adapter) + `@google/genai`
- Text generation: `src/lib/text-generator.ts`
- Image generation: `src/lib/image-generator.ts` (Gemini image models)
- Auth: API key stored in `api_providers` table

**AWS Bedrock:**
- Via `@ai-sdk/amazon-bedrock`
- Auth: env-only (`CLAUDE_CODE_USE_BEDROCK` + AWS credentials in environment)
- Client: `src/lib/text-generator.ts`

**Google Vertex AI:**
- Via `@ai-sdk/google-vertex/anthropic`
- Auth: env-only (`CLAUDE_CODE_USE_VERTEX` + GCP credentials in environment)
- Client: `src/lib/text-generator.ts`

**OpenRouter:**
- OpenAI-compatible protocol with extra headers
- Configured as a vendor preset in `src/lib/provider-catalog.ts`

## Data Storage

**Databases:**
- SQLite via `better-sqlite3`
  - Location: `~/.codepilot/codepilot.db`
  - Client: `src/lib/db.ts` (direct SQL, no ORM)
  - WAL mode enabled, foreign keys enforced
  - Schema managed via inline `CREATE TABLE IF NOT EXISTS` statements (no migration framework)
  - Tables: `chat_sessions`, `messages`, `settings`, `tasks`, `api_providers`, `media_generations`, `media_tags`, `media_jobs`, `media_job_items`, `media_context_events`, `channel_bindings`, `audit_logs`, `usage_daily`
  - API keys stored in `api_providers.api_key` column (encrypted: no, plaintext in local DB)

**File Storage:**
- Local filesystem only
  - Media files: `~/.codepilot/.codepilot-media/`
  - Workspace index: `.assistant/index/` within project directories
  - Themes: `themes/*.json` bundled with app

**Caching:**
- Electron session cache (cleared on version upgrade in `electron/main.ts`)
- No external cache service

## Authentication & Identity

**Auth Provider:**
- No user authentication system (local desktop app)
- API provider credentials stored locally in SQLite
- Claude Code CLI handles its own OAuth/API key auth
- Electron main process loads user shell environment to inherit API keys from shell profiles

**Bridge Auth:**
- Telegram Bot Token: stored in SQLite `settings` table
- Discord Bot Token: stored in SQLite `settings` table
- Feishu App credentials: stored in SQLite `settings` table
- QQ bot credentials: stored in SQLite `settings` table
- Security validators in `src/lib/bridge/security/validators.ts`

## IM Bridge System

**Architecture:**
- Bridge Manager (singleton): `src/lib/bridge/bridge-manager.ts`
- Channel Adapter pattern: `src/lib/bridge/channel-adapter.ts`
- Conversation Engine: `src/lib/bridge/conversation-engine.ts`
- Permission Broker: `src/lib/bridge/permission-broker.ts`
- Delivery Layer: `src/lib/bridge/delivery-layer.ts`
- Types: `src/lib/bridge/types.ts`

**Telegram:**
- Adapter: `src/lib/bridge/adapters/telegram-adapter.ts`
- Notification bot (separate mode): `src/lib/telegram-bot.ts`
- Uses raw Telegram Bot API (HTTPS requests), not a framework
- Settings API: `src/app/api/settings/telegram/route.ts`
- Sends task notifications, permission requests
- Long polling for inbound messages

**Discord:**
- Adapter: `src/lib/bridge/adapters/discord-adapter.ts`
- SDK: `discord.js` ^14.25.1
- Settings API: `src/app/api/settings/discord/route.ts`

**Feishu/Lark:**
- Adapter: `src/lib/bridge/adapters/feishu-adapter.ts`
- SDK: `@larksuiteoapi/node-sdk` ^1.59.0
- Settings API: `src/app/api/settings/feishu/route.ts`

**QQ:**
- Adapter: `src/lib/bridge/adapters/qq-adapter.ts`
- API client: `src/lib/bridge/adapters/qq-api.ts`
- Settings API: `src/app/api/settings/qq/route.ts`

## Monitoring & Observability

**Error Tracking:**
- None (console.log/console.error only)

**Logs:**
- `console.log` / `console.error` throughout
- Electron main process logs server stdout/stderr
- Bridge system has audit log table (`audit_logs` in SQLite)

## CI/CD & Deployment

**Hosting:**
- Desktop application distributed via GitHub Releases
- No server deployment

**CI Pipeline:**
- GitHub Actions (inferred from `electron-builder.yml` publish config)
- Triggered by git tags: `git tag v{version} && git push origin v{version}`
- Builds macOS (DMG + ZIP, arm64 + x64), Windows (NSIS, x64 + arm64), Linux (AppImage + deb + rpm, x64 + arm64)

**Auto-Update:**
- `electron-updater` installed but disabled (`electron/updater.ts` is a no-op)
- Users notified of updates via `/api/app/updates` endpoint in frontend
- Manual download from GitHub Releases

## Environment Configuration

**Required env vars:**
- None strictly required at build time
- API keys configured at runtime via Settings UI and stored in SQLite
- `CLAUDE_GUI_DATA_DIR` (optional) - Override data directory (default: `~/.codepilot/`)
- Claude Code CLI must be installed and accessible on PATH

**Provider-specific env vars (injected at runtime):**
- `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` - For Anthropic providers
- `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials - For Bedrock
- `CLAUDE_CODE_USE_VERTEX=1` + GCP credentials - For Vertex
- `ANTHROPIC_MODEL`, `ANTHROPIC_REASONING_MODEL`, `ANTHROPIC_DEFAULT_*` - Model role mapping

**Secrets location:**
- All secrets in local SQLite database (`~/.codepilot/codepilot.db`)
- `api_providers.api_key` column
- `settings` table (bot tokens)
- No remote secret management

## Webhooks & Callbacks

**Incoming:**
- `/api/workspace/hook-triggered` - Git hook notifications (workspace events)
- `/api/bridge` - Bridge control endpoint (start/stop/auto-start)

**Outgoing:**
- Telegram Bot API (notifications and bridge messages)
- Discord Gateway (bridge messages via discord.js)
- Feishu/Lark API (bridge messages)
- QQ API (bridge messages)

## Internal API Routes

**Next.js App Router API routes (all under `src/app/api/`):**

| Route | Purpose |
|-------|---------|
| `/api/health` | Server health check (used by Electron startup) |
| `/api/chat` | Main chat streaming endpoint (SSE) |
| `/api/chat/sessions` | Session CRUD |
| `/api/chat/messages` | Message history |
| `/api/chat/permission` | Permission request handling |
| `/api/chat/interrupt` | Interrupt running session |
| `/api/chat/model` | Switch model mid-session |
| `/api/chat/mode` | Switch mode (code/plan/ask) |
| `/api/chat/rewind` | Rewind conversation |
| `/api/chat/structured` | Structured output |
| `/api/providers` | Provider CRUD |
| `/api/providers/models` | Model listing per provider |
| `/api/settings` | Settings CRUD |
| `/api/bridge` | Bridge start/stop/status |
| `/api/bridge/channels` | Channel binding management |
| `/api/media/generate` | Image generation |
| `/api/media/gallery` | Media gallery listing |
| `/api/media/jobs` | Batch media job management |
| `/api/workspace/*` | Workspace indexing, onboarding, search, docs |
| `/api/skills/*` | Skill/command registry |
| `/api/tasks/*` | Task management |
| `/api/plugins/*` | MCP plugin management |
| `/api/sdk/account` | Claude SDK account info |
| `/api/usage/stats` | Usage statistics |
| `/api/app/updates` | Check for app updates (queries GitHub) |
| `/api/claude-sessions` | Claude CLI session import |
| `/api/claude-status` | Claude CLI status check |
| `/api/files/*` | File browsing, preview, raw content |
| `/api/uploads` | File upload handling |

---

*Integration audit: 2026-03-11*
