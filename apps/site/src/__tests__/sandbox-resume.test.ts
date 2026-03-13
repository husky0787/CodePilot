import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Mock e2b SDK ─────────────────────────────────────────────

const mockSandbox = {
  sandboxId: "test-sandbox-123",
  getHost: (port: number) => `${port}-test-sandbox-123.e2b.dev`,
};

const mockConnect = mock.fn(async () => mockSandbox);

mock.module("e2b", {
  namedExports: {
    Sandbox: {
      create: mock.fn(),
      connect: mockConnect,
    },
  },
});

// ── Import after mocking ─────────────────────────────────────

const { resumeSandbox } = await import("../lib/e2b.ts");

// ── Tests ────────────────────────────────────────────────────

describe("resumeSandbox", () => {
  beforeEach(() => {
    mockConnect.mock.resetCalls();
  });

  it("connects with 30min timeout and returns sandboxId + url", async () => {
    const result = await resumeSandbox("test-sandbox-123");

    assert.ok(result);
    assert.equal(result!.sandboxId, "test-sandbox-123");
    assert.equal(result!.url, "https://3000-test-sandbox-123.e2b.dev");
    assert.equal(mockConnect.mock.callCount(), 1);

    const connectArgs = mockConnect.mock.calls[0].arguments;
    assert.equal(connectArgs[0], "test-sandbox-123");
    assert.deepStrictEqual(connectArgs[1], { timeoutMs: 30 * 60 * 1000 });
  });

  it("retries once on transient failure then succeeds", async () => {
    let callCount = 0;
    mockConnect.mock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Transient error");
      }
      return mockSandbox;
    });

    const result = await resumeSandbox("test-sandbox-123");

    assert.ok(result);
    assert.equal(result!.sandboxId, "test-sandbox-123");
    // Should have been called twice (initial + retry)
    assert.equal(mockConnect.mock.callCount(), 2);

    // Reset mock implementation for other tests
    mockConnect.mock.mockImplementation(async () => mockSandbox);
  });

  it("returns null after persistent failure (both attempts fail)", async () => {
    mockConnect.mock.mockImplementation(async () => {
      throw new Error("Persistent error");
    });

    const result = await resumeSandbox("test-sandbox-123");

    assert.equal(result, null);
    // Should have tried twice
    assert.equal(mockConnect.mock.callCount(), 2);

    // Reset mock implementation
    mockConnect.mock.mockImplementation(async () => mockSandbox);
  });
});
