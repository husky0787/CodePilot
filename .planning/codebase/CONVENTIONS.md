# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**
- React components: PascalCase — `ChatView.tsx`, `MessageInput.tsx`, `ErrorBoundary.tsx`
- UI primitives (shadcn/ui): kebab-case — `button.tsx`, `alert-dialog.tsx`, `scroll-area.tsx`
- Library/utility modules: kebab-case — `provider-resolver.ts`, `claude-client.ts`, `stream-session-manager.ts`
- Hooks: camelCase with `use` prefix — `useTranslation.ts`, `usePanel.ts`, `useSSEStream.ts`
- Types: `index.ts` barrel in `src/types/`
- Test files: kebab-case with `.test.ts` (unit) or `.spec.ts` (e2e) suffix
- i18n dictionaries: locale code — `en.ts`, `zh.ts`

**Functions:**
- Use camelCase: `resolveProvider()`, `toClaudeCodeEnv()`, `parseMessageContent()`
- React components: PascalCase named exports: `export function ChatView() {}`
- Hooks: `useTranslation()`, `usePanel()`, `useImageGen()`
- Helper/utility: camelCase: `cn()`, `getLocalDateString()`, `parseDBDate()`
- API route handlers: `GET()`, `POST()`, `PUT()`, `DELETE()` (Next.js convention)

**Variables:**
- camelCase for local variables and state: `currentModel`, `sessionId`, `workingDirectory`
- UPPER_SNAKE_CASE for constants: `SETTING_KEYS`, `VENDOR_PRESETS`, `COMMAND_PROMPTS`
- Boolean state: descriptive names — `hasMore`, `loadingMore`, `isAuthorized`

**Types:**
- Interfaces: PascalCase with descriptive suffix — `ChatSession`, `ApiProvider`, `ResolvedProvider`
- Type aliases: PascalCase — `SSEEventType`, `StreamPhase`, `SkillKind`, `TaskStatus`
- Request/Response pairs: `{Entity}Request` / `{Entity}Response` — `SendMessageRequest`, `SessionsResponse`
- SQLite booleans: `number` type (0 or 1), documented in comment — `is_active: number; // SQLite boolean: 0 or 1`

## Code Style

**Formatting:**
- No Prettier config detected — formatting handled via ESLint
- Single quotes for imports in `.ts` files
- Double quotes in some JSX/older files (inconsistent, but ESLint auto-fixes)
- 2-space indentation (TypeScript standard)
- Semicolons: generally present but not 100% consistent (auto-fix via lint)

**Linting:**
- ESLint 9 with flat config: `eslint.config.mjs`
- Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Pre-commit hook via Husky + lint-staged: runs `eslint --fix` on `*.{ts,tsx}` files
- Pre-commit also runs `tsc --noEmit` and unit tests

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`
- `noEmit: true` — type-checking only, Next.js handles compilation

## Import Organization

**Order:**
1. React / Node.js built-ins: `import { useState, useCallback } from 'react'`
2. Next.js framework: `import { NextRequest, NextResponse } from 'next/server'`
3. External packages: `import { clsx } from 'clsx'`
4. Internal types: `import type { Message, ChatSession } from '@/types'`
5. Internal modules: `import { resolveProvider } from '@/lib/provider-resolver'`
6. Internal components: `import { MessageList } from './MessageList'`
7. Relative imports: `import { cn } from '@/lib/utils'`

**Path Aliases:**
- `@/*` resolves to `./src/*` — use for all imports from `src/`
- In unit tests: relative imports `../../lib/provider-catalog` (tests run under `tsx --test`, not Next.js bundler)

**Type-only imports:**
- Use `import type { ... }` for type-only imports: `import type { ApiProvider } from '@/types'`
- Mixed imports are acceptable: `import { resolveProvider, type ResolvedProvider } from '../../lib/provider-resolver'`

## Error Handling

**API Routes:**
- Wrap handler body in try/catch
- Return `NextResponse.json<ErrorResponse>({ error: message }, { status: code })`
- Use `error instanceof Error ? error.message : 'fallback message'` pattern
- Validate required fields early and return 400
- Return 404 for missing resources, 409 for concurrency conflicts

```typescript
// Pattern from `src/app/api/providers/route.ts`
export async function GET() {
  try {
    const data = getAllProviders();
    return NextResponse.json({ providers: data });
  } catch (error) {
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to get providers' },
      { status: 500 }
    );
  }
}
```

**Client-side:**
- `.catch(() => {})` for fire-and-forget fetches (e.g., settings loading in ChatView)
- `ErrorBoundary` class component wraps major UI sections: `src/components/layout/ErrorBoundary.tsx`
- Console logging with prefix tags: `console.log('[chat API] ...')`, `console.error('[ErrorBoundary] ...')`

**Library code:**
- Functions return result or throw; callers handle errors
- Silent fallbacks with empty catch for non-critical JSON parsing: `try { JSON.parse(x) } catch { return default }`
- Defensive checks: `if (!dateStr) return new Date(0)`

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**
- Use bracket-prefixed tags: `[chat API]`, `[ErrorBoundary]`
- `console.log` for informational messages in API routes
- `console.error` for caught exceptions
- No structured logging framework

## Comments

**When to Comment:**
- Module-level JSDoc describing purpose and entry points (see `src/lib/provider-resolver.ts`)
- Section headers using `// ======` or `// ──` box-drawing characters in type files and tests
- Inline comments for non-obvious logic (e.g., SQLite boolean convention, timezone handling)

**JSDoc/TSDoc:**
- Used on utility functions in `src/lib/utils.ts`
- Used on key interfaces in `src/lib/provider-resolver.ts`
- Not required on every function — reserved for complex or public API functions

**Test file headers:**
- Every test file starts with a block comment describing: what it tests, how to run it, what it verifies
```typescript
/**
 * Unit tests for file API path traversal security fixes.
 *
 * Run with: npx tsx src/__tests__/unit/files-security.test.ts
 *
 * Tests verify that:
 * 1. isPathSafe correctly prevents path traversal attacks
 * ...
 */
```

## Function Design

**Size:** No hard limit. Most functions are under 50 lines. Larger functions exist in API route handlers (chat POST handler).

**Parameters:**
- Use destructured props for React components: `function ChatView({ sessionId, initialMessages = [] }: ChatViewProps)`
- Use option objects for functions with many parameters: `ClaudeStreamOptions` interface
- Default values via destructuring: `depth?: number; // default 3`

**Return Values:**
- API routes: always return `NextResponse.json()` or `new Response()`
- Library functions: return typed results or throw
- Boolean helpers: simple `true`/`false` returns

## Module Design

**Exports:**
- Named exports preferred: `export function resolveProvider()`, `export { Button, buttonVariants }`
- Default exports only for Next.js pages/layouts (Next.js convention)
- Types exported alongside implementations or from `src/types/index.ts` barrel

**Barrel Files:**
- `src/types/index.ts` — central type barrel with all DB models, API types, SSE events
- No barrel files for components — import directly from component file
- `src/i18n/index.ts` — i18n barrel exporting `translate()` and types

## i18n

**Pattern:**
- Two locale files: `src/i18n/en.ts`, `src/i18n/zh.ts`
- Type-safe keys via `TranslationKey` type exported from `en.ts`
- Hook: `useTranslation()` from `src/hooks/useTranslation.ts` returns `{ t, locale, setLocale }`
- Provider: `I18nContext` from `src/components/layout/I18nProvider.tsx`
- Parameter interpolation: `t("key", { param: value })` with `{param}` placeholders
- **Rule:** All UI-visible text must go through `t()`. Update both `en.ts` and `zh.ts` for any change.

## Styling

**Framework:** Tailwind CSS v4 with `@tailwindcss/postcss`

**Utility merging:**
- `cn()` helper in `src/lib/utils.ts` combines `clsx` + `tailwind-merge`
- Use `cn()` for all conditional class merging in components

**Component variants:**
- `class-variance-authority` (cva) for variant-based styling — see `src/components/ui/button.tsx`
- Radix UI primitives for accessible base components
- shadcn/ui pattern for UI primitives in `src/components/ui/`

**Theme:**
- `next-themes` for dark/light mode
- Custom theme family system with CSS variables (`src/lib/theme/`)
- Color tokens: oklch color space, CSS custom properties

## React Patterns

**Client Components:**
- Prefix with `'use client'` directive
- Use React hooks: `useState`, `useCallback`, `useEffect`, `useRef`, `useMemo`

**State Management:**
- Local component state via `useState`
- Context for global state: `usePanel()`, `useTranslation()`
- `localStorage` for persistence: `codepilot:last-model`, `codepilot:last-provider-id`
- Server state via fetch to Next.js API routes

**Data Fetching:**
- Client-side `fetch()` to `/api/*` routes
- SSE streaming for chat responses
- No external data fetching library (no SWR, no React Query)

---

*Convention analysis: 2026-03-11*
