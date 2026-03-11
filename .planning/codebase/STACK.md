# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**
- TypeScript 5.x - All application code (frontend, backend API routes, Electron main process)

**Secondary:**
- JavaScript (ESM) - Build scripts (`scripts/build-electron.mjs`, `scripts/after-pack.js`)
- HTML/CSS - Inline loading screen in `electron/main.ts`, Tailwind CSS styles

## Runtime

**Environment:**
- Node.js (no `.nvmrc`; version not pinned)
- Electron 40.x - Desktop shell, wraps Next.js standalone server

**Package Manager:**
- npm (workspaces enabled: `apps/*`, `packages/*`)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router, standalone output mode)
- React 19.2.3 - UI library
- Electron 40.2.1 - Desktop application shell

**Testing:**
- Node.js built-in test runner via `tsx --test` - Unit tests
- Playwright 1.58.1 - E2E and smoke tests

**Build/Dev:**
- esbuild 0.27.3 - Electron main process bundling (`scripts/build-electron.mjs`)
- electron-builder 26.7.0 - Desktop app packaging (DMG, NSIS, AppImage, deb, rpm)
- Tailwind CSS 4.x - Utility-first CSS
- PostCSS via `@tailwindcss/postcss` - CSS processing
- ESLint 9.x - Linting (config: `eslint.config.mjs`)
- Husky 9.x + lint-staged 16.x - Pre-commit hooks
- concurrently + wait-on - Dev workflow orchestration
- tsx 4.x - TypeScript execution for tests and scripts

## Key Dependencies

**Critical:**
- `@anthropic-ai/claude-agent-sdk` ^0.2.62 - Core SDK for interacting with Claude Code CLI; provides `query()` function for streaming conversations
- `ai` ^6.0.73 (Vercel AI SDK) - Unified text/image generation abstraction (`streamText`, `generateImage`)
- `better-sqlite3` ^12.6.2 - Local SQLite database; native addon requires ABI-compatible rebuild for Electron
- `ws` ^8.19.0 - WebSocket support

**AI Provider SDKs (via Vercel AI SDK):**
- `@ai-sdk/anthropic` ^3.0.47 - Anthropic API client
- `@ai-sdk/openai` ^3.0.34 - OpenAI-compatible API client
- `@ai-sdk/google` ^3.0.31 - Google Generative AI (Gemini) client
- `@ai-sdk/amazon-bedrock` ^4.0.77 - AWS Bedrock client
- `@ai-sdk/google-vertex` ^4.0.80 - Google Vertex AI client
- `@google/genai` ^1.43.0 - Google GenAI SDK (direct usage)

**IM Bridge Adapters:**
- `discord.js` ^14.25.1 - Discord bot integration
- `@larksuiteoapi/node-sdk` ^1.59.0 - Feishu/Lark integration
- `zlib-sync` ^0.1.10 - Required by discord.js for gateway compression

**UI:**
- `radix-ui` ^1.4.3 - Headless UI primitives
- `cmdk` ^1.1.1 - Command palette component
- `lucide-react` ^0.563.0 - Icon library
- `@hugeicons/react` ^1.1.4 + `@hugeicons/core-free-icons` ^3.1.1 - Additional icons
- `@lobehub/icons` ^4.6.0 - AI provider brand icons
- `motion` ^12.33.0 - Animation library (Framer Motion successor)
- `recharts` ^3.7.0 - Chart components (usage stats)
- `class-variance-authority` ^0.7.1 + `clsx` ^2.1.1 + `tailwind-merge` ^3.4.0 - CSS class utilities
- `next-themes` ^0.4.6 - Theme switching (light/dark)
- `use-stick-to-bottom` ^1.1.2 - Auto-scroll chat behavior

**Markdown Rendering:**
- `react-markdown` ^10.1.0 - Markdown renderer
- `markdown-it` ^14.1.1 - Markdown parser (server-side)
- `streamdown` ^2.1.0 + plugins (`@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`) - Streaming markdown processing
- `shiki` ^3.22.0 - Syntax highlighting
- `react-syntax-highlighter` ^16.1.0 - Code block highlighting
- `remark-gfm` ^4.0.1 - GitHub Flavored Markdown
- `rehype-raw` ^7.0.0 - Raw HTML in markdown
- `ansi-to-react` ^6.2.6 - ANSI terminal output rendering

**Infrastructure:**
- `electron-updater` ^6.8.3 - Auto-update framework (currently disabled; manual update via GitHub Releases)
- `nanoid` ^5.1.6 + `uuid` ^13.0.0 - ID generation

## Configuration

**Environment:**
- App data stored in `~/.codepilot/` (configurable via `CLAUDE_GUI_DATA_DIR` env var)
- No `.env` files detected; API keys stored in SQLite `api_providers` table
- Electron main process loads user shell environment on startup (`loadUserShellEnv()`) to inherit API keys from `.zshrc`/`.bashrc`
- App version injected via `NEXT_PUBLIC_APP_VERSION` from `package.json`

**Build:**
- `next.config.ts` - Next.js config (standalone output, server-external packages for native modules)
- `tsconfig.json` - TypeScript config (ES2017 target, strict mode, `@/*` path alias to `./src/*`)
- `electron-builder.yml` - Desktop packaging config (macOS DMG, Windows NSIS, Linux AppImage/deb/rpm)
- `postcss.config.mjs` - PostCSS with Tailwind
- `eslint.config.mjs` - ESLint config
- `playwright.config.ts` - E2E test config

**TypeScript:**
- Strict mode enabled
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`
- JSX: `react-jsx`

## Platform Requirements

**Development:**
- Node.js (version not pinned; TypeScript targets ES2017)
- Claude Code CLI installed globally (`npm install -g @anthropic-ai/claude-code`) for SDK functionality
- `npm run dev` for Next.js dev server (port 3000)
- `npm run electron:dev` for full Electron + Next.js development

**Production:**
- Electron 40 distributes Node.js runtime
- Next.js standalone output bundled as Electron resource
- `scripts/after-pack.js` recompiles `better-sqlite3` native module for Electron ABI
- macOS: DMG (arm64 + x64), signed with Developer ID, not notarized
- Windows: NSIS installer (x64 + arm64)
- Linux: AppImage, deb, rpm (x64 + arm64)
- GitHub Releases for distribution (provider: github, owner: op7418, repo: CodePilot)

---

*Stack analysis: 2026-03-11*
