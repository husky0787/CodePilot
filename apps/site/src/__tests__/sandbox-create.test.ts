import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Mock e2b SDK (must be before dynamic imports) ─────────────

const mockSandbox = {
  sandboxId: "test-sandbox-123",
  getHost: (port: number) => `${port}-test-sandbox-123.e2b.dev`,
};

const mockCreate = mock.fn(async () => mockSandbox);

mock.module("e2b", {
  namedExports: {
    Sandbox: {
      create: mockCreate,
      connect: mock.fn(),
    },
  },
});

// ── Import after mocking (must use .ts extension for Node ESM) ─

const { validateAnthropicKey } = await import("../lib/validate-key.ts");
const { createSandbox } = await import("../lib/e2b.ts");

// ── Tests ─────────────────────────────────────────────────────

describe("validateAnthropicKey", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns valid:true on 200 response", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;

    const result = await validateAnthropicKey("sk-ant-valid-key");
    assert.deepStrictEqual(result, { valid: true });
  });

  it("returns invalid with error on 401 response", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 401,
    })) as unknown as typeof fetch;

    const result = await validateAnthropicKey("sk-ant-invalid");
    assert.deepStrictEqual(result, {
      valid: false,
      error: "无效的 API Key",
    });
  });

  it("returns invalid with error on 403 response", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 403,
    })) as unknown as typeof fetch;

    const result = await validateAnthropicKey("sk-ant-forbidden");
    assert.deepStrictEqual(result, {
      valid: false,
      error: "API Key 权限不足",
    });
  });

  it("returns network error on fetch failure", async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const result = await validateAnthropicKey("sk-ant-any");
    assert.deepStrictEqual(result, {
      valid: false,
      error: "网络错误，无法验证 API Key",
    });
  });
});

describe("createSandbox", () => {
  beforeEach(() => {
    mockCreate.mock.resetCalls();
  });

  it("calls E2B SDK and returns sandboxId + url", async () => {
    const result = await createSandbox("sk-ant-test-key");

    assert.equal(result.sandboxId, "test-sandbox-123");
    assert.equal(result.url, "https://3000-test-sandbox-123.e2b.dev");
    assert.equal(mockCreate.mock.callCount(), 1);
  });

  it("throws when E2B SDK errors", async () => {
    mockCreate.mock.mockImplementationOnce(async () => {
      throw new Error("E2B quota exceeded");
    });

    await assert.rejects(
      () => createSandbox("sk-ant-test-key"),
      { message: "E2B quota exceeded" }
    );
  });
});
