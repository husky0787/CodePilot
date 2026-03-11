# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
codepilot/
├── apps/
│   └── site/                   # Documentation website (fumadocs, separate Next.js app)
├── build/                      # Electron app icons (icon.icns, icon.ico, icon.png, entitlements)
├── docs/
│   ├── exec-plans/             # Execution plans (active/, completed/)
│   ├── handover/               # Architecture handover docs
│   └── research/               # Technical research & feasibility docs
├── electron/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # contextBridge API (shell, dialog, install, bridge)
│   ├── updater.ts              # Auto-updater logic
│   └── tsconfig.json           # Separate TS config for Electron
├── public/
│   └── skills/                 # Static skill assets
├── scripts/
│   ├── after-pack.js           # Recompile better-sqlite3 for Electron ABI
│   ├── after-sign.js           # Post-signing hook
│   └── build-electron.mjs      # Build electron main/preload via esbuild
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   ├── components/             # React components (by feature)
│   ├── hooks/                  # React hooks
│   ├── i18n/                   # Internationalization (en.ts, zh.ts)
│   ├── lib/                    # Server-side business logic
│   ├── types/                  # TypeScript type definitions
│   └── __tests__/              # Test files (unit/, e2e/, screenshots/)
├── themes/                     # Theme family JSON files (12 themes)
├── ARCHITECTURE.md             # Project architecture doc
├── CLAUDE.md                   # Claude Code instructions
├── electron-builder.yml        # Electron packaging config
├── next.config.ts              # Next.js config (standalone output)
├── package.json                # Root package manifest
├── playwright.config.ts        # E2E test config
├── tsconfig.json               # TypeScript config (excludes electron/, scripts/)
└── components.json             # shadcn/ui component config
```

## Directory Purposes

**`src/app/` (Next.js App Router):**
- Purpose: Page routes and API endpoints
- Pages: `page.tsx` (redirect to /chat), `chat/page.tsx`, `chat/[id]/page.tsx`, `settings/page.tsx`, `plugins/page.tsx`, `plugins/mcp/page.tsx`, `bridge/page.tsx`, `gallery/page.tsx`, `skills/page.tsx`, `extensions/page.tsx`, `mcp/page.tsx`
- API routes: 86 `route.ts` files under `src/app/api/`
- Key API groups: `chat/`, `media/`, `files/`, `plugins/`, `providers/`, `settings/`, `skills/`, `workspace/`, `bridge/`, `tasks/`, `uploads/`, `usage/`, `sdk/`, `claude-sessions/`, `claude-status/`, `health/`, `app/updates/`

**`src/components/` (React Components):**
- Purpose: All React UI components, organized by feature domain
- `ui/` — 23 base components (Radix UI primitives: Button, Dialog, Input, Tabs, Select, Sheet, etc.)
- `chat/` — Chat interface (MessageList, MessageInput, MessageItem, StreamingMessage, CodeBlock, ChatView, PermissionPrompt, ImageGenCard, etc.)
- `chat/batch-image-gen/` — Batch image generation UI
- `ai-elements/` — AI response rendering (artifact, reasoning, tool, task, terminal, chain-of-thought, suggestion, etc.)
- `layout/` — App shell and navigation (AppShell, NavRail, Header, ChatListPanel, RightPanel, ResizeHandle, SplitChatContainer, ErrorBoundary, ThemeProvider, I18nProvider, InstallWizard, UpdateDialog)
- `settings/` — Settings panels (GeneralSection, AppearanceSection, ProviderManager, ProviderForm, CliSettingsSection, UsageStatsSection, AssistantWorkspaceSection)
- `plugins/` — Plugin/MCP management (PluginList, PluginCard, McpManager, McpServerEditor, ConfigEditor)
- `bridge/` — IM Bridge config (BridgeLayout, TelegramBridgeSection, FeishuBridgeSection, DiscordBridgeSection, QqBridgeSection)
- `skills/` — Skills marketplace (SkillsManager, MarketplaceBrowser, SkillEditor, CreateSkillDialog)
- `gallery/` — Image gallery (GalleryGrid, GalleryDetail, TagManager)
- `project/` — Project file browser (FileTree, FilePreview, TaskList, TaskCard)

**`src/hooks/` (React Hooks):**
- Purpose: Reusable stateful logic
- Key files:
  - `useSSEStream.ts` — SSE event parsing and callback dispatching
  - `usePanel.ts` — Panel context (right panel, working directory, streaming session)
  - `useSplit.ts` — Split-view session management context
  - `useTranslation.ts` — i18n hook
  - `useImageGen.ts` — Single image generation state
  - `useBatchImageGen.ts` — Batch image generation state
  - `useAppTheme.ts` — Theme family selection
  - `useUpdate.ts` — Auto-update context
  - `useAssistantWorkspace.ts` — Workspace assistant config
  - `useContextUsage.ts` — Context window usage tracking
  - `useNativeFolderPicker.ts` — Electron native folder dialog

**`src/lib/` (Core Business Logic):**
- Purpose: Server-side modules and shared utilities
- Key files:
  - `db.ts` — SQLite database (schema, migrations, all CRUD operations)
  - `claude-client.ts` — Claude Agent SDK wrapper (streamClaude function)
  - `stream-session-manager.ts` — Client-side SSE stream lifecycle singleton
  - `conversation-registry.ts` — Server-side active SDK conversation Map
  - `permission-registry.ts` — Pending permission request tracking
  - `provider-resolver.ts` — Multi-provider model resolution
  - `provider-catalog.ts` — Known model catalog
  - `model-context.ts` — Model context window sizes
  - `image-generator.ts` — Gemini/Anthropic image generation
  - `text-generator.ts` — Non-Claude text generation (titles, etc.)
  - `job-executor.ts` — Batch image job execution
  - `image-ref-store.ts` — Temp image reference tracking
  - `files.ts` — File system browsing and preview
  - `platform.ts` — OS detection, Claude binary discovery, PATH expansion
  - `utils.ts` — Date/string utilities
  - `telegram-bot.ts` — Telegram notification bot (session start/complete/error)
  - `workspace-config.ts` — Workspace configuration
  - `workspace-indexer.ts` — Codebase indexing
  - `workspace-organizer.ts` — Session organization
  - `workspace-retrieval.ts` — Workspace search/retrieval
  - `workspace-taxonomy.ts` — Workspace categorization
  - `assistant-workspace.ts` — Assistant workspace management
  - `onboarding-processor.ts` — First-run onboarding
  - `onboarding-completion.ts` — Onboarding completion detection
  - `checkin-processor.ts` — Workspace check-in processing
  - `skills-lock.ts` — Skills file lock management
  - `claude-session-parser.ts` — Parse Claude CLI .jsonl session files
  - `agent-sdk-agents.ts` — Agent SDK agent definitions
  - `agent-sdk-capabilities.ts` — SDK capability capture

**`src/lib/bridge/` (Bridge Subsystem):**
- Purpose: IM platform integration for remote CodePilot control
- `bridge-manager.ts` — Lifecycle orchestration (start/stop all adapters)
- `channel-adapter.ts` — Abstract adapter base class + factory
- `channel-router.ts` — Route IM messages to CodePilot sessions
- `conversation-engine.ts` — Consume SDK SSE streams for bridge
- `permission-broker.ts` — Permission prompts as IM inline buttons
- `delivery-layer.ts` — Message chunking, rate limiting, format conversion
- `types.ts` — Bridge-specific TypeScript types
- `markdown/` — Markdown-to-IR-to-platform rendering pipeline
- `security/` — Bridge security utilities
- `adapters/telegram-adapter.ts` — Telegram long-polling adapter
- `adapters/feishu-adapter.ts` — Feishu/Lark WebSocket + REST adapter
- `adapters/discord-adapter.ts` — Discord adapter
- `adapters/qq-adapter.ts` — QQ adapter
- `adapters/qq-api.ts` — QQ API client
- `adapters/telegram-media.ts` — Telegram media handling
- `adapters/telegram-utils.ts` — Telegram utility functions
- `adapters/index.ts` — Adapter registration

**`src/lib/theme/` (Theme Engine):**
- Purpose: Load and render theme families from JSON
- `loader.ts` — Read theme JSON files from `themes/` directory
- `render-css.ts` — Generate CSS custom properties from theme data
- `types.ts` — Theme type definitions
- `code-themes.ts` — Map theme families to Shiki code syntax themes
- `context.ts` — Theme React context

**`src/types/` (Type Definitions):**
- Purpose: All shared TypeScript interfaces
- `index.ts` — All business types (ChatSession, Message, SSEEvent, TokenUsage, MCPServerConfig, ApiProvider, MediaJob, FileAttachment, etc.)
- `electron.d.ts` — Type declarations for Electron contextBridge API (`window.electronAPI`)

**`src/i18n/` (Internationalization):**
- Purpose: Translation strings
- `en.ts` — English translations
- `zh.ts` — Chinese translations

**`src/__tests__/` (Tests):**
- Purpose: All test files
- `unit/` — Unit tests (node:test runner)
- `e2e/` — Playwright E2E tests
- `screenshots/` — Test screenshot artifacts

**`electron/` (Electron Process Code):**
- Purpose: Main process and preload scripts (separate from Next.js)
- Has its own `tsconfig.json`; built via `scripts/build-electron.mjs` using esbuild
- Excluded from main `tsconfig.json`

**`apps/site/` (Documentation Website):**
- Purpose: Public documentation site built with fumadocs + Next.js
- Separate workspace package `@codepilot/site`
- Contains: MDX content in `content/docs/en/` and `content/docs/zh/`, marketing pages
- Runs on port 3001 in dev mode

**`themes/` (Theme Families):**
- Purpose: JSON theme family definitions
- 12 themes: default, everforest, github, horizon, kanagawa, night-owl, nord, poimandres, rose-pine, synthwave84, tokyo-night, vesper
- Loaded at build time by `src/lib/theme/loader.ts`

**`docs/` (Internal Documentation):**
- Purpose: Execution plans, handover docs, research
- `exec-plans/active/` — In-progress execution plans
- `exec-plans/completed/` — Completed plans
- `exec-plans/tech-debt-tracker.md` — Known technical debt
- `handover/` — Architecture and system handover docs
- `research/` — Technical feasibility studies

## Key File Locations

**Entry Points:**
- `electron/main.ts`: Electron main process entry
- `electron/preload.ts`: Electron preload (contextBridge)
- `src/app/page.tsx`: Root page (redirects to /chat)
- `src/app/layout.tsx`: Root layout (providers, theme, AppShell)
- `src/app/chat/page.tsx`: New chat page
- `src/app/chat/[id]/page.tsx`: Existing chat session page

**Configuration:**
- `package.json`: Dependencies, scripts, workspaces
- `next.config.ts`: Next.js config (standalone output, external packages)
- `tsconfig.json`: TypeScript config (path alias `@/*` -> `src/*`)
- `electron-builder.yml`: Packaging config (DMG, NSIS, AppImage, deb, rpm)
- `playwright.config.ts`: E2E test config
- `eslint.config.mjs`: ESLint config
- `postcss.config.mjs`: PostCSS/Tailwind config
- `components.json`: shadcn/ui component config
- `.husky/`: Git hooks (pre-commit runs lint-staged)

**Core Logic:**
- `src/lib/db.ts`: Database schema + all CRUD (single most critical server file)
- `src/lib/claude-client.ts`: Claude Agent SDK integration
- `src/lib/stream-session-manager.ts`: Client-side SSE stream lifecycle
- `src/app/api/chat/route.ts`: Main chat SSE endpoint
- `src/components/chat/ChatView.tsx`: Main chat UI component
- `src/components/layout/AppShell.tsx`: Root layout with all context providers

**Testing:**
- `src/__tests__/unit/*.test.ts`: Unit tests
- `src/__tests__/e2e/*.spec.ts`: E2E tests

## Naming Conventions

**Files:**
- React components: PascalCase (`ChatView.tsx`, `MessageInput.tsx`, `AppShell.tsx`)
- Hooks: camelCase with `use` prefix (`useSSEStream.ts`, `usePanel.ts`)
- Lib modules: kebab-case (`claude-client.ts`, `stream-session-manager.ts`, `provider-resolver.ts`)
- API routes: always `route.ts` inside feature-named directories
- Types: `index.ts` in types dir; `.d.ts` for ambient declarations
- Tests: `*.test.ts` (unit), `*.spec.ts` (E2E)

**Directories:**
- Feature-based grouping in `src/components/` (chat, settings, plugins, bridge, skills, gallery, project)
- API routes mirror resource hierarchy (`api/chat/sessions/[id]/messages/route.ts`)
- kebab-case for all directories

**Path Alias:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All imports use `@/` prefix: `import { getDb } from '@/lib/db'`

## Where to Add New Code

**New Feature (e.g., "notebooks"):**
- Types: Add interfaces to `src/types/index.ts`
- Database: Add table + CRUD functions to `src/lib/db.ts` (with migration logic)
- API routes: Create `src/app/api/notebooks/route.ts` (and sub-routes as needed)
- Page: Create `src/app/notebooks/page.tsx`
- Components: Create `src/components/notebooks/` directory with PascalCase component files
- Hook (if needed): Create `src/hooks/useNotebooks.ts`
- i18n: Add keys to both `src/i18n/en.ts` and `src/i18n/zh.ts`
- Navigation: Add nav item in `src/components/layout/NavRail.tsx`

**New UI Component (shared/base):**
- Place in `src/components/ui/` following Radix UI + shadcn/ui patterns
- Use `class-variance-authority` for variants, `tailwind-merge` for class merging

**New React Hook:**
- Place in `src/hooks/use{Name}.ts`
- If it provides context, export both the provider component and the `use{Name}` consumer hook

**New API Endpoint:**
- Create `src/app/api/{resource}/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Set `export const runtime = 'nodejs'` for server-side features (SQLite, fs, etc.)

**New Bridge Adapter (IM platform):**
- Create adapter: `src/lib/bridge/adapters/{platform}-adapter.ts`
- Extend `ChannelAdapter` base class from `src/lib/bridge/channel-adapter.ts`
- Register in `src/lib/bridge/adapters/index.ts`
- Add settings API: `src/app/api/settings/{platform}/route.ts` + `verify/route.ts`
- Add UI: `src/components/bridge/{Platform}BridgeSection.tsx`

**New Theme:**
- Create `themes/{name}.json` following existing theme JSON schema
- It will be auto-loaded by `src/lib/theme/loader.ts`

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Platform-specific: `src/lib/platform.ts`

## Special Directories

**`themes/`:**
- Purpose: JSON theme family definitions (12 files)
- Generated: No (hand-authored)
- Committed: Yes
- Copied to `standalone/themes/` during electron-builder packaging

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build`)
- Committed: No
- `.next/standalone/` is the production server bundle, packaged into Electron resources

**`dist-electron/`:**
- Purpose: Compiled Electron main/preload JS
- Generated: Yes (by `scripts/build-electron.mjs` using esbuild)
- Committed: No

**`release/`:**
- Purpose: Electron-builder output (DMG, NSIS, AppImage, etc.)
- Generated: Yes (by electron-builder)
- Committed: No

**`docs/`:**
- Purpose: Internal documentation (exec plans, handover, research)
- Generated: No
- Committed: Yes

**`apps/site/`:**
- Purpose: Documentation website (separate Next.js app in monorepo workspace)
- Generated: No
- Committed: Yes
- Not included in Electron build

---

*Structure analysis: 2026-03-11*
