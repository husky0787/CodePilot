# Codebase Concerns

**Analysis Date:** 2026-03-11

## Tech Debt

**Monolithic Database Module (2078 lines):**
- Issue: `src/lib/db.ts` is a single 2078-line file containing all table definitions, all migrations, and ~180 prepared statements for every feature domain (chat, media, bridge, providers, tasks, permissions, workspace). No separation of concerns.
- Files: `src/lib/db.ts`
- Impact: Every change to any DB operation requires editing this massive file. Migration logic is interleaved with schema creation. Risk of merge conflicts is high. Finding specific queries requires extensive scrolling.
- Fix approach: Split into domain modules (`db/chat.ts`, `db/media.ts`, `db/bridge.ts`, `db/providers.ts`) that import a shared connection from `db/connection.ts`. Extract migrations into a separate `db/migrations.ts` with versioned migration functions instead of column-existence checks.

**Migration Strategy is Fragile:**
- Issue: Schema migrations use `PRAGMA table_info` to check column existence and add columns one by one. The same CREATE TABLE IF NOT EXISTS statements are duplicated in both `initDb()` and `migrateDb()`. ALTER TABLE additions use try/catch with empty catches to handle "column already exists" errors.
- Files: `src/lib/db.ts` (lines 60-600)
- Impact: No migration versioning means there is no way to track which migrations have run. If a migration partially fails, there is no rollback. Adding a new table requires copying the CREATE TABLE in two places.
- Fix approach: Introduce a `schema_version` table and numbered migration functions. Each migration runs in a transaction and bumps the version. Remove duplicated CREATE TABLE statements.

**Excessive globalThis Singletons:**
- Issue: At least 8 modules use `globalThis` with string keys to store singleton Maps that survive Next.js HMR. Each uses a slightly different pattern with the same type-casting boilerplate.
- Files: `src/lib/stream-session-manager.ts`, `src/lib/permission-registry.ts`, `src/lib/conversation-registry.ts`, `src/lib/agent-sdk-capabilities.ts`, `src/lib/agent-sdk-agents.ts`, `src/lib/job-executor.ts`, `src/lib/telegram-bot.ts`, `src/lib/bridge/bridge-manager.ts`
- Impact: No type safety on the global keys. Risk of key collisions. Memory leaks if entries are not properly cleaned up. Difficult to test in isolation.
- Fix approach: Create a shared `src/lib/global-registry.ts` utility that provides typed singleton creation with cleanup hooks. Replace ad-hoc globalThis access across all modules.

**Widespread Silent Error Swallowing:**
- Issue: Over 40 empty `catch {}` or `catch { /* comment */ }` blocks across the codebase. Many catch errors with no logging, no re-throw, and no fallback logic.
- Files: `src/lib/assistant-workspace.ts` (6+ instances), `src/lib/workspace-indexer.ts` (7+ instances), `src/lib/provider-resolver.ts` (3 instances), `src/lib/permission-registry.ts` (3 instances), `src/lib/db.ts`, `src/lib/files.ts`
- Impact: Bugs are silently hidden. Users experience unexplained failures with no diagnostic trail. Issues in production are extremely difficult to trace.
- Fix approach: Add at minimum `console.warn` to every catch block. For critical paths (DB operations, permission handling), add structured error logging. Consider a lightweight error reporting utility.

**302 console.log/warn/error Calls Across 76 Files:**
- Issue: No structured logging framework. All logging is raw `console.*` calls with inconsistent prefixes like `[chat API]`, `[claude-client]`, `[stderr]`, `[db]`.
- Files: Spread across the entire `src/` tree
- Impact: No log levels, no structured output, no ability to filter or route logs. In production Electron builds, console output may be lost entirely.
- Fix approach: Introduce a minimal logger utility (e.g., `src/lib/logger.ts`) with levels (debug/info/warn/error) and consistent formatting. Wire it to Electron's main process log in production.

## Security Considerations

**API Keys Stored in Plaintext in SQLite:**
- Risk: API keys for all configured providers (Anthropic, OpenAI, Google, Bedrock, etc.) are stored as plaintext in the `api_providers.api_key` column. The database file lives at `~/.codepilot/codepilot.db`.
- Files: `src/lib/db.ts` (line 105, 390), `src/lib/provider-resolver.ts`
- Current mitigation: File system permissions on the user's home directory.
- Recommendations: Use OS-level credential storage (macOS Keychain, Windows Credential Manager, Linux Secret Service) via a library like `keytar`. At minimum, encrypt at rest with a machine-specific key.

**File Serving Endpoint Has No Path Restriction:**
- Risk: `GET /api/files/raw?path=` resolves any absolute path via `path.resolve(filePath)` and serves the file contents. The comment says "only allows reading files within the user's home directory" but there is NO actual check enforcing this. Any file readable by the process can be served.
- Files: `src/app/api/files/raw/route.ts` (lines 85-124)
- Current mitigation: None. The security comment on line 83 is misleading.
- Recommendations: Add `isPathSafe(os.homedir(), resolved)` check (the function already exists in `src/lib/files.ts`). Alternatively, restrict to the session's working directory.

**Media Serve Endpoint Path Check is Bypassable:**
- Risk: `GET /api/media/serve?path=` checks that the resolved path "includes `.codepilot-media`" as a substring. An attacker could craft a path like `/sensitive/.codepilot-media/../../../etc/passwd` since `path.resolve` will collapse the traversal and the string check happens on the resolved path. However, since `path.resolve` normalizes the path first, the actual risk depends on whether `.codepilot-media` remains in the resolved result. The check is still weak -- it should verify the path starts with a known media directory, not just contains the substring.
- Files: `src/app/api/media/serve/route.ts` (line 32)
- Current mitigation: Substring check on resolved path.
- Recommendations: Replace with `resolved.startsWith(expectedMediaDir)` using a known base directory.

**No Authentication on Any API Route:**
- Risk: All 86 API routes are completely open -- no authentication, no CSRF protection, no session tokens. While this is a desktop app (localhost only), if the Next.js dev server or Electron app binds to `0.0.0.0` or a non-loopback interface, any network peer can access all endpoints including sending chat messages, reading files, and modifying settings.
- Files: All 86 files under `src/app/api/`
- Current mitigation: Localhost-only binding (assumed via Electron/Next.js defaults).
- Recommendations: Add a shared auth middleware that validates a per-session token. At minimum, verify requests come from localhost via headers.

**dangerously_skip_permissions Feature:**
- Risk: A global setting `dangerously_skip_permissions` bypasses all tool permission checks, allowing Claude to execute any tool (file writes, shell commands) without user approval. Per-session `permission_profile: 'full_access'` does the same.
- Files: `src/lib/claude-client.ts` (lines 340-361), `src/app/api/chat/route.ts` (line 346), `src/components/settings/GeneralSection.tsx`
- Current mitigation: UI warns user with orange border and warning text.
- Recommendations: Consider adding a confirmation dialog every time the app starts with this enabled. Add audit logging for all tool executions when bypass is active.

## Performance Bottlenecks

**Large File Uploads Held in Memory as Base64:**
- Problem: File attachments are sent as base64 in JSON request bodies, held in memory during the entire streaming response, and written to disk synchronously.
- Files: `src/app/api/chat/route.ts` (lines 88-101), `src/lib/claude-client.ts` (lines 203-225)
- Cause: Base64 encoding inflates file size by ~33%. Large images (e.g., 10MB) become ~13MB base64 strings held in the request body, then decoded into buffers. Synchronous `fs.writeFileSync` blocks the event loop.
- Improvement path: Use multipart form uploads instead of JSON-embedded base64. Write files asynchronously. Consider streaming uploads to disk before processing.

**Database Module is Synchronous (better-sqlite3):**
- Problem: All database operations use `better-sqlite3` which is synchronous. Every query blocks the Node.js event loop.
- Files: `src/lib/db.ts`
- Cause: `better-sqlite3` is chosen for simplicity and Electron compatibility, but all ~180 prepared statements execute synchronously.
- Improvement path: For the current scale (single-user desktop app), this is acceptable. If concurrent operations increase (bridge + chat + media jobs), consider moving DB operations to a worker thread. WAL mode is already enabled which helps with concurrent reads.

**Stream Session Manager Emits on Every Text Delta:**
- Problem: Every text token streamed from Claude triggers `emit()` which rebuilds the snapshot object and dispatches to all listeners plus a `CustomEvent` on window.
- Files: `src/lib/stream-session-manager.ts` (lines 257-261)
- Cause: The `onText` callback calls `emit(stream, 'snapshot-updated')` for every text delta, which can fire hundreds of times per second during fast streaming.
- Improvement path: Add a throttle/debounce (e.g., 50ms) on snapshot emission, or batch text deltas before emitting. The existing `markActive()` timestamp could be leveraged for this.

## Fragile Areas

**claude-client.ts (976 lines) -- Core Streaming Logic:**
- Files: `src/lib/claude-client.ts`
- Why fragile: Single monolithic function `streamClaude()` (lines 266-976) handles SDK initialization, environment setup, prompt building, session resume with fallback, permission handling, message parsing for all types (assistant, user, system, stream_event, tool_progress, result), error classification, and cleanup. Any change risks breaking the entire chat flow.
- Safe modification: Test with multiple providers, with and without session resume, with file attachments, with permission requests, and with various error scenarios. There are no unit tests for this file.
- Test coverage: Zero direct tests. Only covered indirectly via E2E tests.

**Database Migration Chain:**
- Files: `src/lib/db.ts` (lines 284-600)
- Why fragile: Migrations depend on column-existence checks using PRAGMA. Ordering matters but is implicit. The `migrateDb()` function assumes all previous columns exist if a later column exists. Adding a new migration requires understanding the entire chain.
- Safe modification: Always add new migrations at the end. Test against a fresh database and an existing database from the previous version.
- Test coverage: Only `src/__tests__/unit/db-shutdown.test.ts` exists for DB, but it tests shutdown behavior, not migrations.

**Session Resume Logic:**
- Files: `src/lib/claude-client.ts` (lines 424-663)
- Why fragile: Session resume has multiple failure modes: stale SDK session ID, deleted working directory, SDK version mismatch, corrupt session file. Each triggers a different fallback path. The fallback rebuilds conversation history from DB and prepends it as a text prompt, which changes the conversation dynamics.
- Safe modification: Always test the resume-fails-gracefully path by corrupting the `sdk_session_id` value.
- Test coverage: No unit tests. Manual testing only.

## Scaling Limits

**SQLite Single-File Database:**
- Current capacity: Adequate for single-user desktop app with thousands of sessions and messages.
- Limit: Concurrent write contention if bridge adapters, media jobs, and chat all write simultaneously. WAL mode mitigates but does not eliminate this.
- Scaling path: Not needed for desktop app. If the app moves to multi-user/server deployment, migrate to PostgreSQL.

**In-Memory Permission Registry:**
- Current capacity: Handles a few concurrent permission requests per session.
- Limit: Permission promises are stored in a globalThis Map with 5-minute expiry. If a user has many concurrent bridge sessions generating permission requests, the Map grows unbounded until promises resolve or expire.
- Scaling path: Add a cleanup interval to prune expired entries. Current implementation at `src/lib/permission-registry.ts` has no periodic cleanup.

## Dependencies at Risk

**@anthropic-ai/claude-agent-sdk (^0.2.62):**
- Risk: Pre-1.0 SDK with frequently breaking changes. The entire chat system depends on its `query()` function and message type definitions. Type casts like `as SDKSystemMessage & { slash_commands?: unknown }` suggest the SDK types are incomplete.
- Impact: SDK updates can break streaming, permission handling, and session resume.
- Migration plan: Pin to exact version in lockfile. Test thoroughly before any SDK update. Monitor SDK changelog for breaking changes.

**better-sqlite3 (^12.6.2) with Electron:**
- Risk: Requires native compilation matching the Electron ABI. The `scripts/after-pack.js` rebuild step is fragile. Electron version updates often break better-sqlite3 compatibility.
- Impact: Build failures on Electron updates. Platform-specific issues (especially on Windows/ARM).
- Migration plan: Keep `after-pack.js` rebuild script maintained. Consider `sql.js` (WASM-based SQLite) as a fallback if native compilation becomes untenable.

## Test Coverage Gaps

**No Unit Tests for Core Chat Flow:**
- What's not tested: `src/lib/claude-client.ts` (976 lines), `src/app/api/chat/route.ts` (648 lines), `src/lib/stream-session-manager.ts` (666 lines)
- Files: These three files form the critical chat path from UI to SDK
- Risk: Any regression in streaming, permission handling, session resume, or error classification goes undetected until E2E tests or manual testing.
- Priority: High

**No Unit Tests for Bridge Adapters:**
- What's not tested: `src/lib/bridge/adapters/feishu-adapter.ts` (951 lines), `src/lib/bridge/adapters/telegram-adapter.ts` (866 lines), `src/lib/bridge/bridge-manager.ts` (831 lines)
- Files: Only `src/__tests__/unit/discord-bridge.test.ts` exists for the Discord adapter
- Risk: Bridge adapters handle external IM platform integration with complex polling, message formatting, and error handling. Bugs in adapters affect remote users.
- Priority: Medium

**No Tests for File Serving Security:**
- What's not tested: Path traversal protections (or lack thereof) in `src/app/api/files/raw/route.ts` and `src/app/api/media/serve/route.ts`
- Files: `src/__tests__/unit/files-security.test.ts` exists but only tests `src/lib/files.ts` utility functions, not the actual API route handlers
- Risk: The `/api/files/raw` endpoint currently has NO path restriction despite claiming to. Without tests, future changes could further weaken security.
- Priority: High

**No Integration Tests for Provider Resolution:**
- What's not tested: End-to-end flow from provider selection through environment variable injection to Claude Code subprocess spawning
- Files: `src/__tests__/unit/provider-resolver.test.ts` (910 lines) covers the resolver logic but not the integration with `src/lib/claude-client.ts`
- Risk: Provider misconfiguration (wrong env vars, wrong auth style) silently fails and is only caught when the Claude process errors out.
- Priority: Medium

**Database Migration Tests Missing:**
- What's not tested: Upgrade path from any previous schema version to current
- Files: `src/lib/db.ts` migration logic (lines 284-600)
- Risk: Users upgrading from older versions may hit migration failures that corrupt or lose data.
- Priority: Medium

---

*Concerns audit: 2026-03-11*
