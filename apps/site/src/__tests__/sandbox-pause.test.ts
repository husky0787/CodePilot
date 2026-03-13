import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Mock e2b SDK ─────────────────────────────────────────────

const mockRun = mock.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" }));
const mockPause = mock.fn(async () => {});

const mockSandbox = {
  sandboxId: "test-sandbox-123",
  commands: { run: mockRun },
  pause: mockPause,
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

const { pauseSandbox } = await import("../lib/e2b.ts");

// ── Tests ────────────────────────────────────────────────────

describe("pauseSandbox", () => {
  beforeEach(() => {
    mockConnect.mock.resetCalls();
    mockRun.mock.resetCalls();
    mockPause.mock.resetCalls();
  });

  it("connects to sandbox, runs sync, calls pause, returns true", async () => {
    const result = await pauseSandbox("test-sandbox-123");

    assert.equal(result, true);
    assert.equal(mockConnect.mock.callCount(), 1);
    assert.equal(mockConnect.mock.calls[0].arguments[0], "test-sandbox-123");
    assert.equal(mockRun.mock.callCount(), 1);
    assert.equal(mockRun.mock.calls[0].arguments[0], "sync");
    assert.equal(mockPause.mock.callCount(), 1);
  });

  it("returns false on connect error", async () => {
    mockConnect.mock.mockImplementationOnce(async () => {
      throw new Error("Sandbox not found");
    });

    const result = await pauseSandbox("nonexistent");
    assert.equal(result, false);
  });

  it("returns false on pause error", async () => {
    mockPause.mock.mockImplementationOnce(async () => {
      throw new Error("Pause failed");
    });

    const result = await pauseSandbox("test-sandbox-123");
    assert.equal(result, false);
  });
});
