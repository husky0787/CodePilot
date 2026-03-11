# Feature Research

**Domain:** Cloud Sandbox AI Dev Environment (CodePilot on E2B)
**Researched:** 2026-03-11
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click sandbox launch | Core value proposition — "browser visit to working IDE in seconds". Codespaces/Replit/Bolt.new all do this. Users won't tolerate multi-step provisioning. | MEDIUM | E2B Firecracker boots ~200ms, but CodePilot cold start (npm install, Next.js build) adds time. Use pre-built E2B template with snapshot to get total launch under 10s. |
| Browser-direct access to full Chat UI | Users expect the same chat experience as desktop. Lovable/Bolt.new set the bar — type prompt, get working code. CodePilot already has this; the challenge is making it work without Electron IPC. | MEDIUM | Already validated in PROJECT.md — Next.js web mode works without Electron shell. Need graceful degradation for Electron-only APIs (clipboard, native dialogs). |
| API Key input and secure storage | BYOK is the chosen auth model. Users expect a clean input flow and that their key isn't leaked. Every AI sandbox product handles this. | LOW | Store in sandbox env var, never persist to disk in plaintext. Key only lives in sandbox memory + E2B's encrypted state on pause. Gateway/sandbox separation pattern recommended. |
| Session persistence (pause/resume) | Users close browser tabs. They expect to come back and resume. CodeSandbox snapshots in 2s, E2B supports pause/resume with full memory state. | MEDIUM | E2B native: `sandbox.pause()` saves filesystem + memory. Resume restores running processes. Paused sandboxes last ~30 days. Auto-pause on idle is in E2B beta — use it. |
| File system access | Users need to browse, edit, upload, and download files in the sandbox. Every cloud IDE has this. CodePilot already has a file tree component. | LOW | Already built in CodePilot. Verify it works against E2B's filesystem (should work — standard Linux FS). |
| Terminal / command output visibility | Users expect to see what Claude Code is doing — tool calls, file edits, command execution. CodePilot already renders this. | LOW | Already built. The tool-call display and streaming SSE are existing features. |
| Port forwarding for preview | When Claude Code builds a web app inside the sandbox, users expect to preview it in-browser. Codespaces, Gitpod, Replit all expose ports. | MEDIUM | E2B supports `sandbox.getHost(port)` to get public URLs. Need UI to list exposed ports and open preview. Not built yet — new feature. |
| Multiple AI provider support | Users have different API keys (Anthropic, OpenAI, Google). CodePilot already supports multi-provider. They expect it to work in cloud too. | LOW | Already built. Just need the key input flow to support multiple providers. |
| Landing page / entry site | Users need a clean entry point: explain value prop, input key, launch sandbox. This is the "front door". | MEDIUM | New Next.js project. Simple: hero section, key input form, "Launch" button calling E2B SDK. |
| Responsive desktop browser layout | Users access via desktop Chrome/Firefox/Safari. Not mobile, but the layout must work well in browser viewports (not just Electron's fixed window). | LOW | CodePilot is already responsive via Tailwind. Verify in standard browser viewports (1280px-1920px). |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Full Claude Code CLI integration | Unlike Bolt.new/Lovable which use raw LLM APIs, CodePilot runs actual Claude Code CLI with agentic tool use, file editing, bash execution. This is the real Claude Code experience in a browser. | HIGH | The core differentiator. Requires Claude Code CLI installed in E2B template. Verify `@anthropic-ai/claude-agent-sdk` works in sandbox. |
| Bridge system (Telegram/Discord/Feishu/QQ) | Control your cloud sandbox from messaging apps. No other cloud IDE offers this. Unique to CodePilot. | LOW | Already built. Should work out of the box in sandbox since it's server-side. Verify network egress from E2B. |
| MCP server ecosystem | Users can configure MCP servers for extended tool use (databases, APIs, custom tools). Richer than Bolt.new's fixed toolset. | MEDIUM | Already built in CodePilot. MCP servers need to be installable inside E2B sandbox. Template should include common MCP runtimes (Node, Python, Docker if available). |
| Skills marketplace | Pre-built skill prompts users can install. No competitor in the AI sandbox space has this. | LOW | Already built. Works as-is since it's UI + prompt storage. |
| Theme system | Rich theme customization (multiple theme families, light/dark). Nice polish that Bolt.new and Lovable lack. | LOW | Already built. Zero additional work. |
| Usage statistics / token tracking | Users see exactly how many tokens they've burned. Critical for BYOK model since users pay directly. Lovable/Bolt.new hide this behind subscription. | LOW | Already built. Directly valuable in BYOK context — users want cost visibility. |
| Sandbox template marketplace | Pre-configured environments (Python ML, Node.js, Rust, etc.) users can choose when launching. Like Codespaces devcontainers. | HIGH | Not built. Would require multiple E2B templates. Defer to v2 — start with one general-purpose template. |
| Real-time collaboration | Multiple users in same sandbox. Replit's killer feature. | HIGH | Not built, not planned. Very high complexity. Defer indefinitely. |
| Git integration inside sandbox | Clone repos, commit, push from within the sandbox. Codespaces' core workflow. | MEDIUM | Not built as standalone feature, but Claude Code CLI can do git operations. Consider adding a git UI panel in v1.x. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Platform-managed API keys / subscription billing | "Don't make me bring my own key" | Massive compliance burden, payment infrastructure, API cost risk, margin management. Lovable raised $330M to do this. You don't have $330M. | BYOK with clear onboarding: link to Anthropic's key creation page, show estimated costs, provide usage tracking. |
| User accounts / authentication | "I want to log in and see my sandboxes" | Requires auth infrastructure (OAuth, DB, sessions), GDPR compliance, account recovery flows. Adds months of work for v1. | v1: Anonymous sessions with shareable sandbox URLs. v2: Optional GitHub OAuth for sandbox listing. |
| noVNC / remote desktop | "I want full Linux desktop in browser" | E2B Desktop exists but adds latency, complexity, and cost. CodePilot is already a web app — why add a desktop layer? | Direct browser access to Next.js. For GUI tools (browser preview), use port forwarding. |
| Mobile-responsive layout | "I want to code on my phone" | Cloud IDE on mobile is terrible UX. Tiny screen, no keyboard, fighting autocorrect. No serious dev tool does this well. | Desktop browser only. Mobile gets the Bridge system (Telegram/Discord) for monitoring and simple commands. |
| Self-hosted / on-premise deployment | "I want to run this on my own servers" | Fractures development effort, support burden, security liability. E2B is the chosen platform. | Document that E2B is open-source — users who really want self-hosted can fork. Don't officially support it. |
| Persistent always-on sandboxes | "I want my sandbox to run 24/7 like a server" | E2B has 24h max runtime. Always-on defeats the sandbox model and costs money continuously. | Pause/resume with auto-pause. Educate users: sandbox = ephemeral workspace, not hosting. For deployments, export code and deploy elsewhere. |
| Built-in deployment / hosting | "Deploy my app from the sandbox" | Hosting is a completely different business (Vercel, Netlify, Railway). Building this = building a PaaS. | Provide export (download zip, git push). Link to deployment platforms. Don't become a hosting company. |

## Feature Dependencies

```
[Landing Site]
    +-- requires --> [E2B SDK Integration]
        +-- requires --> [E2B Template (CodePilot image)]
            +-- requires --> [Electron-free Web Mode]
                +-- requires --> [IPC/Preload Graceful Degradation]

[API Key Input Flow]
    +-- requires --> [Landing Site]
    +-- feeds into --> [Sandbox Environment Variables]

[Session Persistence]
    +-- requires --> [E2B SDK Integration]
    +-- enhances --> [Landing Site] (resume button)

[Port Forwarding UI]
    +-- requires --> [E2B SDK Integration]
    +-- enhances --> [Chat UI] (inline preview)

[Bridge System]
    +-- requires --> [Sandbox Network Egress]
    +-- independent of --> [Landing Site]

[File Browser]
    +-- requires --> [Electron-free Web Mode]
    +-- already built

[Claude Code CLI]
    +-- requires --> [E2B Template] (CLI pre-installed)
    +-- requires --> [API Key] (passed as env var)
```

### Dependency Notes

- **Landing Site requires E2B SDK Integration:** The launch button calls `Sandbox.create()` — can't build the entry without the SDK wired up.
- **E2B Template requires Electron-free Web Mode:** The Docker template must run CodePilot as pure Next.js. Electron code paths must gracefully degrade first.
- **Session Persistence enhances Landing Site:** "Resume" button on landing page needs pause/resume working. Can ship landing site without it (v1.0), add resume in v1.1.
- **Port Forwarding is independent but valuable:** Can ship v1 without port preview UI, but it significantly limits usefulness for web dev tasks.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Electron-free web mode** — CodePilot runs as pure Next.js without Electron shell, all IPC calls gracefully degraded
- [ ] **E2B sandbox template** — Dockerfile with Node.js, Claude Code CLI, better-sqlite3, all CodePilot deps pre-installed
- [ ] **Landing page** — Simple Next.js site: value prop, API key input, "Launch Sandbox" button
- [ ] **E2B SDK integration** — Create sandbox from template, pass API key as env var, return sandbox URL
- [ ] **Browser-direct access** — User gets URL to CodePilot running inside sandbox, full chat + file + tool UI
- [ ] **Auto-pause on idle** — Sandbox pauses after inactivity timeout, preserving state

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Session resume** — Landing page shows "Resume" for paused sandboxes (needs cookie/token to track sandbox ID)
- [ ] **Port forwarding UI** — Panel showing exposed ports with clickable preview links
- [ ] **Multi-provider key input** — Support entering keys for OpenAI, Google, etc. alongside Anthropic
- [ ] **Sandbox health monitoring** — Show sandbox status (running/paused/expired), time remaining, resource usage
- [ ] **Git panel** — Clone, commit, push UI (beyond what Claude Code CLI does via chat)
- [ ] **File upload/download** — Drag-and-drop file upload, zip download of project

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Template marketplace** — Multiple pre-configured environments (Python ML, Rust, Go, etc.)
- [ ] **Optional GitHub OAuth** — Login to see sandbox history, share sandboxes
- [ ] **Team/shared sandboxes** — Multiple users accessing same sandbox
- [ ] **Custom domain support** — Users bring their own domain for sandbox access
- [ ] **Sandbox fleet management** — Admin dashboard for organizations running multiple sandboxes

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Electron-free web mode | HIGH | MEDIUM | P1 |
| E2B sandbox template | HIGH | MEDIUM | P1 |
| Landing page | HIGH | LOW | P1 |
| E2B SDK integration | HIGH | MEDIUM | P1 |
| Browser-direct access | HIGH | LOW | P1 |
| API key input flow | HIGH | LOW | P1 |
| Auto-pause on idle | MEDIUM | LOW | P1 |
| Session resume | HIGH | MEDIUM | P2 |
| Port forwarding UI | MEDIUM | MEDIUM | P2 |
| Multi-provider key input | MEDIUM | LOW | P2 |
| Sandbox health monitoring | MEDIUM | LOW | P2 |
| File upload/download | MEDIUM | LOW | P2 |
| Git panel | MEDIUM | MEDIUM | P2 |
| Template marketplace | MEDIUM | HIGH | P3 |
| GitHub OAuth | LOW | MEDIUM | P3 |
| Team sandboxes | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Bolt.new | Lovable | Replit | Codespaces | CodePilot Cloud |
|---------|----------|---------|--------|------------|-----------------|
| Launch speed | Instant (WebContainer) | ~5s | ~10s | ~30-60s | ~10s target (E2B snapshot) |
| AI engine | Custom LLM wrapper | Custom fine-tuned | Ghostwriter/Agent | Copilot | Full Claude Code CLI (agentic) |
| File system | Virtual (WebContainer) | Managed | Full Linux | Full Linux | Full Linux (E2B microVM) |
| Terminal access | Limited | No | Yes | Yes | Yes (via Claude Code) |
| Port preview | Yes | Yes (deploy) | Yes | Yes | Needs building (P2) |
| Persistence | Session only | Cloud save | Always-on workspace | Codespace lifecycle | Pause/resume (E2B snapshot) |
| Pricing model | Subscription | Subscription | Subscription | Per-hour | BYOK (user pays AI provider directly) |
| Multi-provider AI | No | No | No | No (Copilot only) | Yes (Anthropic/OpenAI/Google/etc.) |
| Chat app bridge | No | No | No | No | Yes (Telegram/Discord/Feishu/QQ) |
| MCP/plugins | No | Limited | No | Extensions | Yes (full MCP ecosystem) |
| Collaboration | No | No | Yes (multiplayer) | Yes (Live Share) | No (not planned) |
| Self-contained | Yes | Yes | Yes | GitHub-dependent | Independent (BYOK) |

### CodePilot Cloud's competitive position

**Strengths vs competitors:**
- Only product offering full Claude Code CLI with agentic capabilities in a browser sandbox
- BYOK model means no subscription — users pay only for what they use
- Bridge system is entirely unique — no competitor offers messaging app control
- MCP ecosystem gives extensibility that Bolt.new and Lovable lack
- Multi-provider support (not locked to one AI vendor)

**Weaknesses vs competitors:**
- No real-time collaboration (Replit's strength)
- No built-in deployment (Lovable deploys to Supabase automatically)
- No polished template marketplace at launch (Codespaces has devcontainers)
- E2B dependency means 24h max session (Replit workspaces are always-on)

## Sources

- [E2B Documentation - Sandbox Persistence](https://e2b.dev/docs/sandbox/persistence)
- [E2B Documentation - Sandbox Lifecycle](https://e2b.dev/docs/sandbox)
- [E2B GitHub](https://github.com/e2b-dev/E2B)
- [DevBox vs Gitpod vs Replit Comparison (Sealos)](https://sealos.io/blog/devbox-vs-gitpod-vs-replit-an-unbiased-comparison-for-2025/)
- [Lovable vs Bolt.new vs v0 Comparison (Particula)](https://particula.tech/blog/lovable-vs-bolt-vs-v0-ai-app-builders)
- [Cloud Development Environments Guide (DevPanel)](https://www.devpanel.com/blog/cloud-development-environments-guide/)
- [Best Cloud IDEs (DataCamp)](https://www.datacamp.com/blog/best-cloud-ide)
- [AI Sandbox Comparison 2026 (Lifo)](https://lifo.sh/blog/ai-sandbox-comparison-2026)
- [Daytona vs E2B (Northflank)](https://northflank.com/blog/daytona-vs-e2b-ai-code-execution-sandboxes)
- [NVIDIA Sandbox Security Guidance](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/)
- [OpenAI API Key Best Practices](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)

---
*Feature research for: Cloud Sandbox AI Dev Environment (CodePilot on E2B)*
*Researched: 2026-03-11*
