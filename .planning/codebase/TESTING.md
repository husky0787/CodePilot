# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Unit Tests:**
- Runner: Node.js built-in test runner (`node:test`)
- Executor: `tsx` v4.21 (TypeScript execution without compilation)
- Assertion: `node:assert/strict`
- No Jest, no Vitest — pure Node.js test runner

**E2E Tests:**
- Runner: Playwright v1.58
- Config: `playwright.config.ts`
- Assertion: Playwright's built-in `expect`

**Run Commands:**
```bash
npm run test               # typecheck + unit tests (~4s, no dev server)
npm run test:unit          # unit tests only: tsx --test src/__tests__/unit/*.test.ts
npm run test:smoke         # smoke tests: npx playwright test --grep @smoke (~15s, needs dev server)
npm run test:e2e           # full E2E: npx playwright test (~60s+, needs dev server)
npm run typecheck          # tsc --noEmit
```

## Test File Organization

**Location:** All tests in `src/__tests__/` directory (separate from source code, not co-located).

**Naming:**
- Unit tests: `src/__tests__/unit/{feature-name}.test.ts`
- E2E tests: `src/__tests__/e2e/{feature-name}.spec.ts`
- Shared helpers: `src/__tests__/helpers.ts`

**Structure:**
```
src/__tests__/
  unit/
    assistant-workspace.test.ts    (611 lines)
    claude-session-parser.test.ts  (519 lines)
    db-shutdown.test.ts            (102 lines)
    discord-bridge.test.ts         (200 lines)
    files-security.test.ts         (157 lines)
    mcp-config.test.ts             (269 lines)
    message-persistence.test.ts    (151 lines)
    onboarding-completion.test.ts  (292 lines)
    provider-resolver.test.ts      (910 lines)
    skill-kind.test.ts             (319 lines)
    structured-output.test.ts      (138 lines)
    theme-loader.test.ts           (193 lines)
    theme-render-css.test.ts       (107 lines)
    timezone-boundaries.test.ts    (484 lines)
  e2e/
    chat.spec.ts                   (180 lines)
    chat-enhanced.spec.ts          (243 lines)
    layout.spec.ts                 (322 lines)
    plugins.spec.ts                (187 lines)
    project-panel.spec.ts          (212 lines)
    settings.spec.ts               (224 lines)
    skills.spec.ts                 (208 lines)
    smoke.spec.ts                  (91 lines)
  helpers.ts                       (411 lines)
```

## Test Structure

**Unit Test Suite Organization:**
```typescript
// Pattern from `src/__tests__/unit/provider-resolver.test.ts`
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Import the module under test using relative paths (not @/ alias)
import { resolveProvider, toClaudeCodeEnv } from '../../lib/provider-resolver';
import type { ResolvedProvider } from '../../lib/provider-resolver';

describe('Provider Resolver', () => {
  describe('resolveProvider', () => {
    it('returns env-based resolution when providerId is "env"', () => {
      const resolved = resolveProvider({ providerId: 'env' });
      assert.equal(resolved.provider, undefined);
      assert.equal(resolved.protocol, 'anthropic');
    });
  });
});
```

**Key patterns:**
- Use `describe()` for grouping, nested `describe()` for sub-groups
- Use `it()` for individual test cases (not `test()`)
- Section separator comments: `// ── Section Name ──────────────────────`
- Every test file starts with a JSDoc header describing purpose, run command, and what it verifies
- Imports from source use relative paths (`../../lib/`) not `@/` alias (tsx runner, not Next.js bundler)

**E2E Test Suite Organization:**
```typescript
// Pattern from `src/__tests__/e2e/smoke.spec.ts`
import { test, expect } from '@playwright/test';
import { goToChat, collectConsoleErrors, filterCriticalErrors, waitForPageReady } from '../helpers';

test.describe('Smoke @smoke', () => {
  test('Home redirects to /chat @smoke', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto('/');
    await waitForPageReady(page);
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/chat');
    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });
});
```

**E2E patterns:**
- Use `test.describe()` / `test()` (Playwright API, not `describe`/`it`)
- Tag smoke tests with `@smoke` in test name for `--grep @smoke` filtering
- Always collect console errors and check for critical errors
- Use helper functions from `src/__tests__/helpers.ts` for navigation and locators

## Setup and Teardown

**Unit tests with temp files:**
```typescript
// Pattern from `src/__tests__/unit/db-shutdown.test.ts`
import { describe, it, before, afterEach } from 'node:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codepilot-test-'));
process.env.CLAUDE_GUI_DATA_DIR = tmpDir;

describe('closeDb', () => {
  afterEach(() => {
    closeDb(); // cleanup after each test
  });

  it('cleanup test fixtures', () => {
    closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true }); // final cleanup
  });
});
```

**Unit tests with env var manipulation:**
```typescript
// Pattern from `src/__tests__/unit/provider-resolver.test.ts`
it('env resolution with ANTHROPIC_API_KEY sets hasCredentials=true', () => {
  const origKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-test-env-key';
  try {
    const resolved = resolveProvider({ providerId: 'env' });
    assert.equal(resolved.hasCredentials, true);
  } finally {
    if (origKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = origKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  }
});
```

**Unit tests with process.cwd stub:**
```typescript
// Pattern from `src/__tests__/unit/theme-loader.test.ts`
const origCwd = process.cwd;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-test-'));
  process.cwd = () => tmpDir;
  _resetCache();
});
afterEach(() => {
  process.cwd = origCwd;
  _resetCache();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

## Mocking

**Framework:** No mocking library. Tests use these strategies:

**1. Real implementations (preferred):**
- Most unit tests import and call real functions directly
- DB tests create real temp SQLite databases
- File tests create real temp directories and files

**2. Logic extraction for testability:**
```typescript
// Pattern from `src/__tests__/unit/structured-output.test.ts`
// Can't import Next.js route handlers directly in node:test,
// so extract and test the core logic inline.
function extractStructuredResult(messages: Array<...>) {
  // Re-implement the extraction logic from the route
}
```

**3. Inline function replication:**
```typescript
// Pattern from `src/__tests__/unit/mcp-config.test.ts`
// Since toSdkMcpConfig is not exported, we re-implement
// the conversion logic for testing.
function toSdkMcpConfig(servers: Record<string, MCPServerConfig>): Record<string, unknown> {
  // Mirror of claude-client.ts logic
}
```

**4. Manual env var stubbing:**
- Save original value, set test value, restore in `finally` block
- No mock library — manual save/restore pattern

**What to Mock:**
- Nothing, typically. The codebase prefers testing real implementations.
- For code that can't be imported in `node:test` (Next.js route handlers), replicate core logic.

**What NOT to Mock:**
- Database operations — use real temp SQLite database
- File system — use real temp directories
- Pure functions — always test directly

## E2E Test Helpers

**Location:** `src/__tests__/helpers.ts` (411 lines)

**Navigation helpers:**
```typescript
export async function goToChat(page: Page) { ... }
export async function goToPlugins(page: Page) { ... }
export async function goToMCP(page: Page) { ... }
export async function goToSettings(page: Page) { ... }
```

**Locator helpers (returns Locator, not element):**
```typescript
export function chatInput(page: Page): Locator { ... }
export function sendButton(page: Page): Locator { ... }
export function sidebar(page: Page): Locator { ... }
export function navLink(page: Page, label: string): Locator { ... }
```

**Assertion helpers:**
```typescript
export function collectConsoleErrors(page: Page): string[] { ... }
export function filterCriticalErrors(errors: string[]): string[] { ... }
export async function expectPageLoadTime(page: Page, url: string, maxMs: number = 3000) { ... }
```

**Wait helpers:**
```typescript
export async function waitForPageReady(page: Page) { ... }
export async function waitForStreamingStart(page: Page) { ... }
export async function waitForStreamingEnd(page: Page) { ... }
```

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data construction — no factory library
const resolved: ResolvedProvider = {
  provider: {
    id: 'test', name: 'Test', provider_type: 'anthropic', protocol: 'anthropic',
    base_url: 'https://api.anthropic.com', api_key: 'sk-test-key',
    is_active: 1, sort_order: 0, extra_env: '{}', headers_json: '{}',
    env_overrides_json: '', role_models_json: '{}',
    notes: '', created_at: '', updated_at: '',
  },
  protocol: 'anthropic',
  authStyle: 'api_key',
  // ... remaining fields
};
```

**Location:**
- No dedicated fixtures directory
- Test data constructed inline within each test or at describe-block scope
- Temp directories created via `fs.mkdtempSync()` in test files

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:** Not configured. Node.js test runner does not produce coverage reports by default.

## Test Types

**Unit Tests (14 files, ~4,452 lines):**
- Scope: Pure business logic, data transformations, security checks
- Run in Node.js via `tsx --test` (no browser, no dev server)
- Tests: provider resolution, path security, DB operations, markdown chunking, theme loading, session parsing
- Speed: ~4 seconds total

**Smoke Tests (1 file, 91 lines):**
- Scope: Each major page loads without errors
- Tagged with `@smoke` for `--grep` filtering
- Checks: HTTP status < 400, no 404/500 titles, no error overlays, no critical console errors
- Speed: ~15 seconds (requires dev server)

**E2E Tests (8 files, ~1,667 lines):**
- Scope: Full user flows — chat, sidebar, settings, plugins, skills, file panel
- Run with Playwright against live dev server
- Tests: page rendering, UI interaction, streaming, navigation
- Speed: ~60+ seconds (requires dev server)

## Playwright Configuration

**Config file:** `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Pre-commit Hook

**Location:** `.husky/pre-commit`

**Steps (run sequentially):**
1. `npx lint-staged` — ESLint fix on staged `.ts`/`.tsx` files
2. `npx tsc --noEmit` — full type check
3. `npx tsx --test src/__tests__/unit/*.test.ts` — all unit tests

## Common Patterns

**Assertion style (unit tests):**
```typescript
// Use assert from node:assert/strict
assert.equal(result.protocol, 'anthropic');
assert.deepEqual(result.items, expected);
assert.ok(result.length > 0, 'descriptive message');
assert.doesNotThrow(() => closeDb());
assert.strictEqual(chunks[0].text, 'Hello world');
```

**E2E assertion style:**
```typescript
// Use Playwright expect
await expect(page.locator('text=Chat')).toBeVisible();
expect(response?.status()).toBeLessThan(400);
expect(page.url()).toContain('/chat');
await expect(chatInput(page)).toHaveAttribute('placeholder', '...');
```

**Error Testing (unit):**
```typescript
// Test that invalid inputs are rejected
assert.equal(isPathSafe('/home/user/project', '/etc/passwd'), false);
assert.equal(isPathSafe('/home/user/project', '/home/user/project-evil/file.txt'), false);
```

**Contract/Consistency Testing:**
```typescript
// Verify multiple entry points produce identical results
const chatResolved = resolveProvider(opts);
const bridgeResolved = resolveProvider(opts);
for (const [name, r] of [['bridge', bridgeResolved], ...] as const) {
  assert.equal(r.provider?.id, chatResolved.provider?.id, `${name} provider mismatch`);
}
```

**Async Testing (E2E):**
```typescript
test('send a message and see it in the conversation', async ({ page }) => {
  await goToChat(page);
  await sendMessage(page, 'Test message');
  await expect(page.locator('main >> text=Test message').first()).toBeVisible({ timeout: 5000 });
});
```

## Writing New Tests

**New unit test:**
1. Create `src/__tests__/unit/{feature}.test.ts`
2. Import from `node:test` and `node:assert/strict`
3. Import source via relative path: `../../lib/{module}`
4. Add JSDoc header with run command and test purpose
5. Use `describe()` / `it()` structure
6. Will automatically run in pre-commit and `npm run test:unit`

**New E2E test:**
1. Create `src/__tests__/e2e/{feature}.spec.ts`
2. Import `{ test, expect }` from `@playwright/test`
3. Import helpers from `../helpers`
4. Use `test.describe()` / `test()` structure
5. Always check for console errors with `collectConsoleErrors` + `filterCriticalErrors`
6. Tag smoke-level tests with `@smoke` in test name

---

*Testing analysis: 2026-03-11*
