import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Mock e2b SDK ──────────────────────────────────────────────

const mockGetHost = mock.fn((port: number) => `${port}-sandbox-abc.e2b.dev`);
const mockConnect = mock.fn(async () => ({ getHost: mockGetHost }));

mock.module("e2b", {
  namedExports: {
    Sandbox: {
      create: mock.fn(),
      connect: mockConnect,
    },
  },
});

// ── Import after mocking ──────────────────────────────────────

const { checkSandbox } = await import("../lib/e2b.ts");

// ── Tests ─────────────────────────────────────────────────────

describe("checkSandbox", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockConnect.mock.resetCalls();
  });

  it("returns alive:true, ready:true when sandbox is alive and health check passes", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
    })) as unknown as typeof fetch;

    const result = await checkSandbox("sandbox-abc");

    assert.deepStrictEqual(result, {
      alive: true,
      ready: true,
      url: "https://3000-sandbox-abc.e2b.dev",
    });
    assert.equal(mockConnect.mock.callCount(), 1);
  });

  it("returns alive:true, ready:false when sandbox is alive but health check fails", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 503,
    })) as unknown as typeof fetch;

    const result = await checkSandbox("sandbox-abc");

    assert.deepStrictEqual(result, {
      alive: true,
      ready: false,
      url: "https://3000-sandbox-abc.e2b.dev",
    });
  });

  it("returns alive:false, ready:false when sandbox does not exist", async () => {
    mockConnect.mock.mockImplementationOnce(async () => {
      throw new Error("Sandbox not found");
    });

    const result = await checkSandbox("nonexistent");

    assert.deepStrictEqual(result, {
      alive: false,
      ready: false,
    });
  });
});
