# Project Research Summary

**Project:** CodePilot Cloud (E2B Sandbox Deployment)
**Domain:** Cloud AI Development Environment -- Electron/Next.js desktop app migration to E2B cloud sandboxes
**Researched:** 2026-03-11
**Confidence:** MEDIUM-HIGH

## Executive Summary

CodePilot Cloud is the migration of an existing Electron + Next.js desktop AI coding assistant into a browser-accessible cloud environment powered by E2B sandboxes. The proven approach for this type of product is a two-component architecture: a lightweight Portal site (Next.js on Vercel) that manages sandbox lifecycle via the E2B SDK, and the existing CodePilot application running inside E2B microVMs as a standalone Next.js server. The user's browser connects directly to the sandbox -- the Portal never proxies traffic. This "opaque compute unit" pattern is simple, scalable, and mirrors how E2B's own reference architectures (Fragments) work. The E2B JS SDK (v2.14.1) and Build System 2.0 are mature, well-documented, and provide all necessary primitives: sandbox creation, pause/resume persistence, port exposure, and environment variable injection.

The critical path has a clear dependency chain: (1) strip Electron coupling from CodePilot so it runs as pure Next.js in a browser, (2) build a custom E2B template with all dependencies pre-installed, (3) build the Portal entry site, (4) add persistence and production hardening. The main technical risks are incomplete Electron API degradation causing runtime crashes (9 files need changes), better-sqlite3 native module compilation in the sandbox environment, and the E2B `betaPause` API's known file-loss bug on repeated pause/resume cycles. The BYOK (Bring Your Own Key) model eliminates billing infrastructure complexity but introduces API key security concerns -- keys live in sandbox environment variables accessible to all processes, and network egress is unrestricted by default.

The competitive position is strong: CodePilot Cloud is the only product offering the full Claude Code CLI with agentic capabilities in a browser sandbox, combined with unique features like the Bridge messaging system (Telegram/Discord/Feishu) and MCP server ecosystem. The BYOK model avoids the subscription overhead of Bolt.new and Lovable. The main weakness is lack of real-time collaboration and built-in deployment -- both correctly deferred to v2+.

## Key Findings

### Recommended Stack

The stack centers on the E2B platform with the `e2b` JS SDK (v2.14.1) for sandbox lifecycle management and Build System 2.0 for template definition. The Portal is a standalone Next.js project deployed on Vercel. Inside the sandbox, CodePilot runs as `next start` in production mode (not dev mode -- saves memory, avoids HMR issues). Claude Code CLI is pre-installed globally in the template. No database needed for the Portal in v1 -- sandbox IDs stored in browser cookies/localStorage.

**Core technologies:**
- **e2b@2.14.1**: Sandbox lifecycle (create/pause/resume/destroy) -- official SDK, HIGH confidence, npm-verified
- **Next.js 16.x (Portal)**: Entry site with API Routes calling E2B SDK -- matches existing tech stack
- **Next.js 16.x (Sandbox)**: CodePilot running in standalone production mode -- already configured with `output: 'standalone'`
- **@anthropic-ai/claude-code**: Pre-installed in E2B template -- official E2B template example exists
- **E2B Build System 2.0**: Programmatic template definition via `Template()` chain API -- 14x faster builds than Dockerfile approach
- **better-sqlite3**: Reused from existing CodePilot -- persists through sandbox pause/resume

**Critical version note:** Avoid `@e2b/sdk` (deprecated old package name). Use `e2b` main package.

### Expected Features

**Must have (table stakes):**
- One-click sandbox launch (target < 10s with pre-built template)
- Browser-direct access to full Chat UI (Electron IPC gracefully degraded)
- API Key input with secure env-var injection (BYOK model)
- Session persistence via E2B pause/resume
- File system access (already built in CodePilot)
- Terminal/command output visibility (already built)
- Landing page with value prop + launch button

**Should have (competitive advantage):**
- Full Claude Code CLI with agentic tool use (core differentiator vs Bolt.new/Lovable)
- Bridge system for messaging app control (unique, already built)
- MCP server ecosystem (already built, verify network egress in sandbox)
- Port forwarding UI for web app previews
- Usage/token tracking (critical for BYOK cost visibility)

**Defer (v2+):**
- Template marketplace (multiple environment types)
- GitHub OAuth / user accounts
- Real-time collaboration
- Built-in deployment / hosting
- Mobile-responsive layout (use Bridge for mobile)

### Architecture Approach

Two-project architecture with clear separation: Portal (Vercel) handles sandbox orchestration only, CodePilot (E2B sandbox) handles all application logic. User browser connects directly to sandbox URL after Portal creates it. All data stays inside the sandbox (SQLite, files, conversation history). The Portal is stateless and never touches user data or API keys beyond the initial handoff.

**Major components:**
1. **Portal (Entry Site)** -- Landing page, API key collection, E2B SDK calls for sandbox lifecycle
2. **E2B Template** -- Pre-built sandbox image with Node.js 24, Claude Code CLI, CodePilot standalone build, system dependencies
3. **CodePilot Web Mode** -- Existing CodePilot with Electron API graceful degradation (9 files to modify)
4. **E2B Platform** -- Managed microVM infrastructure, port exposure, pause/resume persistence

### Critical Pitfalls

1. **Electron API coupling (9 files)** -- Create unified `platform.ts` adapter layer; each `window.electronAPI` call needs a Web fallback. `InstallWizard` must be completely skipped in sandbox mode. Prevention: Phase 1, before anything else.
2. **better-sqlite3 native compilation** -- Template Dockerfile must include `build-essential` + `python3`. Pin Node.js version (recommend Node 22 LTS for stability). Prevention: Phase 1 template build.
3. **Next.js address binding** -- Must bind `0.0.0.0` not `localhost` for E2B port exposure to work. Use `next start` production mode to avoid HMR WebSocket issues entirely. Prevention: Phase 1 template config.
4. **API Key security in sandbox** -- Keys in env vars are readable by all sandbox processes. v1 acceptable risk; pre-launch must add `allowPublicTraffic: false` + access tokens. Consider network egress restrictions. Prevention: Phase 2.
5. **Session timeout / data loss** -- E2B default 10min timeout destroys sandboxes. Set 30min timeout + autoPause. Known bug: repeated pause/resume may lose file changes (GitHub #884). Prevention: Phase 3, but plan heartbeat API in Phase 1.
6. **Claude Code CLI sandbox compatibility** -- Needs `~/.claude/` directory, git config, non-interactive mode. Must validate end-to-end conversation flow in sandbox, not just CLI startup. Prevention: Phase 1.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Electron Graceful Degradation
**Rationale:** Foundation dependency -- nothing else works until CodePilot runs as pure Next.js in a browser. No external dependencies needed, can start immediately.
**Delivers:** CodePilot accessible via `npm run dev` in any browser without Electron shell.
**Addresses:** Browser-direct access (table stakes), Electron-free web mode (P1 feature)
**Avoids:** Pitfall 1 (Electron API crashes), Pitfall 3 (address binding -- validate early)
**Scope:** Add `src/lib/env.ts`, modify 9 files with `electronAPI` references, skip `InstallWizard` in web mode, verify in standard browser.

### Phase 2: E2B Sandbox Template
**Rationale:** Depends on Phase 1 (CodePilot must run without Electron). This is the infrastructure layer everything else builds on.
**Delivers:** Working E2B template that boots CodePilot in < 10s, accessible via public URL.
**Uses:** e2b SDK, Build System 2.0 Template API, Node.js 22/24 base image
**Implements:** Template construction, Claude Code CLI installation, better-sqlite3 compilation, `next start` production mode
**Avoids:** Pitfall 2 (native module compilation), Pitfall 3 (port binding), Pitfall 6 (CLI compatibility)
**Scope:** Write template definition (BS2.0 or Dockerfile), configure e2b.toml, build and test template, validate end-to-end: sandbox URL -> CodePilot UI -> Claude Code conversation.

### Phase 3: Portal Entry Site
**Rationale:** Depends on Phase 2 (needs template ID to create sandboxes). This is the user-facing front door.
**Delivers:** Landing page where users input API key and launch a sandbox with one click.
**Uses:** Next.js 16, Vercel deployment, e2b SDK for sandbox.create()
**Implements:** Portal architecture component, API key flow, sandbox creation API routes
**Avoids:** Pitfall 4 (key security -- implement access token auth here)
**Scope:** New Next.js project, landing page, API key form, `/api/sandbox/create` route, redirect to sandbox URL, deploy to Vercel.

### Phase 4: Persistence and Production Hardening
**Rationale:** Depends on Phase 3 (Portal must exist to manage sandbox lifecycle). Transforms MVP into usable product.
**Delivers:** Session resume, timeout management, error handling, sandbox status monitoring.
**Addresses:** Session persistence (table stakes), auto-pause on idle (P1), sandbox health monitoring (P2)
**Avoids:** Pitfall 5 (session timeout / data loss)
**Scope:** Enable autoPause, implement cookie-based sandboxId tracking, resume flow, timeout warnings, SQLite WAL checkpoint before pause, error pages with recovery actions.

### Phase Ordering Rationale

- **Strict dependency chain:** Each phase produces something the next phase requires. Phase 1 (web mode) -> Phase 2 (template needs web mode) -> Phase 3 (portal needs template) -> Phase 4 (persistence needs portal).
- **Risk frontloading:** The hardest unknowns (Electron degradation, native module compilation, Claude CLI sandbox behavior) are all in Phases 1-2. If these fail, we know early before investing in Portal UI.
- **Incremental validation:** After Phase 2, you can manually test the full flow (create sandbox via SDK script, access URL). Phase 3 just wraps this in a UI. Phase 4 adds polish.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Standard refactoring, but needs thorough audit of all 9 `electronAPI` files. The specific fallback for each Electron API (folder picker, shell.openPath, auto-updater) needs case-by-case decisions. **Recommend `/gsd:research-phase`** to map each file's degradation strategy.
- **Phase 2:** E2B template building has good official docs but Claude Code CLI behavior in headless sandbox is not fully documented. **Recommend spike/POC** before writing the full template -- spin up a basic E2B sandbox, install Claude Code, verify a conversation works end-to-end.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Standard Next.js project with API routes calling a well-documented SDK. Landing page is straightforward. E2B's own Fragments project is a reference implementation.
- **Phase 4:** E2B pause/resume is well-documented. Cookie/localStorage session tracking is basic web development. The only unknown is the betaPause file-loss bug -- monitor GitHub #884.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | E2B SDK verified on npm, official docs comprehensive, version compatibility confirmed. Build System 2.0 is the current recommended approach. |
| Features | MEDIUM-HIGH | Competitor analysis thorough, feature prioritization clear. Port forwarding UI complexity needs validation. |
| Architecture | MEDIUM | Two-component pattern is proven (E2B Fragments reference), but specific CodePilot integration points (9 Electron files, Claude Agent SDK in sandbox) need hands-on validation. |
| Pitfalls | MEDIUM | Critical pitfalls well-identified from official docs and GitHub issues. betaPause reliability is the biggest unknown -- beta feature with known bugs. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **betaPause reliability:** GitHub #884 reports file loss on repeated pause/resume. May have been fixed since 2025, but needs testing with actual CodePilot workload (SQLite WAL mode + file system changes). If unreliable, fallback to short-lived sandboxes only (no resume).
- **Claude Agent SDK in sandbox:** No documentation found on running `@anthropic-ai/claude-agent-sdk` in a headless E2B environment. The SDK's SSE streaming, tool execution, and permission model need end-to-end validation in a sandbox before committing to architecture.
- **E2B network egress control:** Research mentions restricting outbound traffic to Anthropic API domains only, but E2B's network policy capabilities are not well-documented. May not be possible in current E2B version.
- **Sandbox cost modeling:** At 4 vCPU / 4GB RAM, each sandbox costs ~$0.20/hour on Pro plan. Need to validate whether 2 vCPU / 2GB is sufficient for CodePilot + Claude Code to reduce costs.
- **`allowPublicTraffic: false` + access tokens:** Documented in E2B, but the UX of injecting access tokens into the redirect flow needs design work. How does the Portal pass the token to the user's browser for subsequent requests to the sandbox?

## Sources

### Primary (HIGH confidence)
- [E2B Official Documentation](https://e2b.dev/docs) -- SDK API, sandbox lifecycle, templates, persistence, port exposure
- [E2B SDK on npm](https://www.npmjs.com/package/e2b) -- v2.14.1 verified
- [E2B Claude Code Template Example](https://e2b.dev/docs/template/examples/claude-code) -- official installation pattern
- [E2B Next.js Template Example](https://e2b.dev/docs/template/examples/nextjs) -- official Next.js sandbox pattern
- [E2B Build System 2.0 Blog](https://e2b.dev/blog/introducing-build-system-2-0) -- BS2.0 rationale and performance
- [E2B Pricing](https://e2b.dev/pricing) -- platform limits and billing
- CodePilot codebase analysis -- direct code review of Electron API references

### Secondary (MEDIUM confidence)
- [E2B GitHub Issues #884, #863, #1031](https://github.com/e2b-dev/E2B/issues) -- known bugs in persistence and port exposure
- [E2B Fragments Reference Architecture](https://github.com/e2b-dev/fragments) -- Next.js + AI sandbox example
- [E2B Dashboard Repository](https://github.com/e2b-dev/dashboard) -- Next.js 16 + Vercel deployment reference
- Competitor analysis sources (Sealos, Particula, DataCamp, DevPanel comparisons)

### Tertiary (LOW confidence)
- [AI Sandbox Comparison 2026](https://lifo.sh/blog/ai-sandbox-comparison-2026) -- broad market positioning
- [Superagent AI Sandbox Benchmark 2026](https://www.superagent.sh/blog/ai-code-sandbox-benchmark-2026) -- E2B performance claims

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
