# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Electron desktop app wrapping a Next.js 16 (App Router) full-stack application. The Next.js server runs as an Electron UtilityProcess (production) or standalone dev server. All AI interaction flows through Claude Agent SDK on the server side, with SSE streaming to the React frontend.

**Key Characteristics:**
- Two-process Electron model: main process (window/IPC) + UtilityProcess (Next.js server)
- Next.js App Router provides both React pages and ~86 REST API routes
- SQLite (better-sqlite3, WAL mode) for all local persistence at `~/.codepilot/codepilot.db`
- Server-Sent Events (SSE) for real-time Claude response streaming
- Global singleton registries (globalThis) to survive Next.js HMR
- Bridge subsystem enables remote IM control (Telegram, Feishu/Lark, Discord, QQ)
- Monorepo with npm workspaces: main app (root) + documentation site (`apps/site`)

## Layers

**Electron Main Process:**
- Purpose: Window management, system tray, IPC, install wizard orchestration, shell environment loading
- Location: `electron/main.ts`, `electron/preload.ts`, `electron/updater.ts`
- Contains: BrowserWindow creation, UtilityProcess server lifecycle, native dialog/folder picker IPC, install wizard IPC handlers, tray icon for bridge background mode
- Depends on: Next.js server (started as UtilityProcess in production)
- Used by: End user (desktop app entry point)

**Next.js Pages (Frontend):**
- Purpose: React UI rendered in Electron's BrowserWindow
- Location: `src/app/` (page routes), `src/components/` (React components)
- Contains: Chat interface, settings, plugins/MCP management, skills marketplace, gallery, bridge config, extensions
- Depends on: API routes via fetch, `src/hooks/`, `src/lib/stream-session-manager.ts` (client-side singleton)
- Used by: Electron renderer process

**API Routes (Backend):**
- Purpose: REST endpoints running in the Next.js server process
- Location: `src/app/api/` (86 route files)
- Contains: Chat orchestration, session CRUD, file browsing, media generation, plugin/MCP management, provider management, skills, workspace indexing, bridge control, settings, usage stats
- Depends on: `src/lib/` (business logic), `src/types/` (shared types)
- Used by: Frontend pages, Bridge subsystem, Electron main process (health check, bridge auto-start)

**Core Business Logic:**
- Purpose: Server-side logic independent of HTTP routing
- Location: `src/lib/`
- Contains: Claude SDK client, SSE stream management, conversation registry, database operations, image generation, provider resolution, workspace indexing, platform detection, file system operations
- Depends on: Claude Agent SDK, better-sqlite3, external APIs (Gemini, OpenAI)
- Used by: API routes, Bridge subsystem

**Bridge Subsystem:**
- Purpose: Connect external IM platforms to CodePilot sessions for remote AI control
- Location: `src/lib/bridge/`
- Contains: Adapter base class, channel router, conversation engine, permission broker, delivery layer, markdown rendering pipeline, platform-specific adapters (Telegram, Feishu, Discord, QQ)
- Depends on: Core business logic (`claude-client.ts`, `db.ts`), IM platform SDKs
- Used by: API routes (`/api/bridge/*`), Electron tray (background mode)

**Shared Types:**
- Purpose: TypeScript interfaces shared between frontend and backend
- Location: `src/types/index.ts`, `src/types/electron.d.ts`
- Contains: Database models (ChatSession, Message, TaskItem, ApiProvider, etc.), SSE event types, file types, skill types, media types
- Used by: All layers

**Internationalization:**
- Purpose: Bilingual UI (English + Chinese)
- Location: `src/i18n/en.ts`, `src/i18n/zh.ts`
- Used by: All React components via `useTranslation` hook

**Theme System:**
- Purpose: Multiple theme families with CSS variable injection
- Location: `src/lib/theme/` (loader, renderer, types), `themes/*.json` (theme family definitions)
- Contains: Theme loading from JSON, CSS variable generation, code syntax theme mapping
- Used by: Root layout (`src/app/layout.tsx`), ThemeProvider/ThemeFamilyProvider

## Data Flow

**Chat Message Flow (Primary):**

1. User types in `MessageInput` component (`src/components/chat/MessageInput.tsx`)
2. `ChatView` (`src/components/chat/ChatView.tsx`) calls `startStream()` from `stream-session-manager.ts`
3. Stream manager sends POST to `/api/chat` (`src/app/api/chat/route.ts`)
4. API route acquires session lock, loads MCP configs, calls `streamClaude()` in `src/lib/claude-client.ts`
5. `claude-client.ts` creates SDK `query()` call, registers conversation in `src/lib/conversation-registry.ts`
6. Claude Agent SDK returns SSE stream; API route pipes events as `text/event-stream` response
7. `stream-session-manager.ts` (client-side singleton, survives component unmount) consumes SSE via `consumeSSEStream()` from `src/hooks/useSSEStream.ts`
8. `ChatView` subscribes to snapshot updates via `subscribe()` from stream-session-manager
9. Messages rendered by `MessageList` -> `MessageItem` -> `StreamingMessage` components
10. On stream completion, messages persisted to SQLite via `src/lib/db.ts`

**Bridge Message Flow (Remote IM):**

1. IM message arrives via adapter long-polling/WebSocket (`src/lib/bridge/adapters/`)
2. `channel-router.ts` routes message to bound CodePilot session
3. `conversation-engine.ts` calls SDK, consumes SSE response
4. `delivery-layer.ts` formats response (chunking, rate limiting, HTML/card conversion)
5. Adapter sends formatted response back to IM platform

**State Management:**
- No global state library (Redux/Zustand). State managed via:
  - React `useState`/`useCallback` in page components
  - Context providers in `AppShell`: `PanelContext`, `UpdateContext`, `ImageGenContext`, `BatchImageGenContext`, `SplitContext`
  - Client-side singleton: `stream-session-manager.ts` (globalThis pattern, survives HMR)
  - Server-side singleton: `conversation-registry.ts` (globalThis pattern)
  - localStorage for UI preferences (panel widths, theme, split sessions, last model)

## Key Abstractions

**Stream Session Manager:**
- Purpose: Decouple SSE stream lifecycle from React component lifecycle
- Location: `src/lib/stream-session-manager.ts`
- Pattern: Client-side singleton via globalThis, pub/sub snapshot pattern
- Manages: Active streams per session, accumulated text/tools/results, abort controllers, idle detection

**Conversation Registry:**
- Purpose: Track active Claude SDK Query instances globally on the server
- Location: `src/lib/conversation-registry.ts`
- Pattern: Server-side globalThis Map<sessionId, Query>
- Used for: Interrupt, rewind, permission response operations that need the live SDK conversation

**Provider Resolver:**
- Purpose: Abstract multi-provider AI model configuration (Anthropic, OpenAI, Google, Bedrock, Vertex)
- Location: `src/lib/provider-resolver.ts`, `src/lib/provider-catalog.ts`
- Pattern: Database-backed provider configs resolved at chat time to SDK-compatible env vars

**Channel Adapter (Bridge):**
- Purpose: Abstract IM platform differences behind a common interface
- Location: `src/lib/bridge/channel-adapter.ts`, `src/lib/bridge/adapters/`
- Pattern: Abstract base class with factory registration; implementations for Telegram, Feishu, Discord, QQ

**AppShell:**
- Purpose: Root layout component providing navigation, panels, and context providers
- Location: `src/components/layout/AppShell.tsx`
- Pattern: Compound layout with resizable panels (chat list, right panel, doc preview), split-view support

## Entry Points

**Electron Main:**
- Location: `electron/main.ts`
- Triggers: App launch (double-click, Dock, Start Menu)
- Responsibilities: Load user shell env, check native module ABI, start Next.js server as UtilityProcess, create BrowserWindow pointing to `http://127.0.0.1:{port}`, manage lifecycle (quit, activate, tray), install wizard IPC

**Next.js Root Page:**
- Location: `src/app/page.tsx`
- Triggers: Navigation to `/`
- Responsibilities: Redirects to `/chat`

**Chat Page (New):**
- Location: `src/app/chat/page.tsx`
- Triggers: Navigation to `/chat`
- Responsibilities: New chat interface, creates session on first message

**Chat Page (Existing):**
- Location: `src/app/chat/[id]/page.tsx`
- Triggers: Navigation to `/chat/{sessionId}`
- Responsibilities: Load existing session messages, render ChatView with session context

**Chat API (SSE Endpoint):**
- Location: `src/app/api/chat/route.ts`
- Triggers: POST from stream-session-manager or Bridge conversation engine
- Responsibilities: Session locking, MCP config loading, provider resolution, SDK query invocation, SSE streaming, message persistence, title generation

## Error Handling

**Strategy:** Try-catch at API route boundaries with JSON error responses. No centralized error middleware.

**Patterns:**
- API routes return `NextResponse.json({ error: message }, { status: code })`
- SSE streams emit `error` events for client-side handling
- `ErrorBoundary` component (`src/components/layout/ErrorBoundary.tsx`) catches React render errors
- Electron main process shows `dialog.showErrorBox()` for fatal startup errors
- Session locking (`acquireSessionLock` in `src/lib/db.ts`) prevents concurrent SDK calls with 409 response

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` with `[tag]` prefixes (e.g., `[server]`, `[chat API]`, `[db]`, `[ABI check]`). No structured logging framework.

**Validation:** Inline validation in API routes (check required fields, return 400). No validation library (Zod/Joi).

**Authentication:** None. The app runs locally; API routes are only accessible from localhost. Bridge adapters authenticate with IM platforms via bot tokens stored in settings DB.

**Internationalization:** All user-visible strings go through `useTranslation()` hook (`src/hooks/useTranslation.ts`) with keys defined in `src/i18n/en.ts` and `src/i18n/zh.ts`.

**Theming:** CSS variable-based theme system. Theme families loaded from `themes/*.json` at build time, injected as CSS vars in root layout. Runtime switching via `data-theme-family` attribute + `next-themes` for dark/light mode.

---

*Architecture analysis: 2026-03-11*
