import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

/**
 * 测试 heartbeat 核心逻辑：connect + setTimeout
 * 由于 next/server 在 Node ESM 下无法通过 mock.module 拦截，
 * 我们直接测试 E2B SDK 交互逻辑（与 route handler 使用相同的模式）
 */

// ── Mock e2b SDK ─────────────────────────────────────────────

const mockSetTimeout = mock.fn(async () => {});
const mockSandbox = {
  sandboxId: "test-sandbox-123",
  setTimeout: mockSetTimeout,
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

const { Sandbox } = await import("e2b");

// ── Heartbeat logic (mirrors route handler) ──────────────────

const HEARTBEAT_TIMEOUT_MS = 30 * 60 * 1000;

async function heartbeat(
  sandboxId: string
): Promise<{ status: "ok" } | { status: "paused_or_dead" }> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.setTimeout(HEARTBEAT_TIMEOUT_MS);
    return { status: "ok" };
  } catch {
    return { status: "paused_or_dead" };
  }
}

// ── Tests ────────────────────────────────────────────────────

describe("heartbeat logic (sandbox.setTimeout)", () => {
  beforeEach(() => {
    mockConnect.mock.resetCalls();
    mockSetTimeout.mock.resetCalls();
  });

  it("calls setTimeout(30min) on sandbox and returns ok", async () => {
    const result = await heartbeat("test-sandbox-123");

    assert.deepStrictEqual(result, { status: "ok" });
    assert.equal(mockConnect.mock.callCount(), 1);
    assert.equal(mockConnect.mock.calls[0].arguments[0], "test-sandbox-123");
    assert.equal(mockSetTimeout.mock.callCount(), 1);
    assert.equal(
      mockSetTimeout.mock.calls[0].arguments[0],
      30 * 60 * 1000
    );
  });

  it("returns paused_or_dead when connect fails", async () => {
    mockConnect.mock.mockImplementationOnce(async () => {
      throw new Error("Sandbox not found");
    });

    const result = await heartbeat("dead-sandbox");

    assert.deepStrictEqual(result, { status: "paused_or_dead" });
  });

  it("returns paused_or_dead when setTimeout fails", async () => {
    mockSetTimeout.mock.mockImplementationOnce(async () => {
      throw new Error("Timeout failed");
    });

    const result = await heartbeat("test-sandbox-123");

    assert.deepStrictEqual(result, { status: "paused_or_dead" });
  });
});
