import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

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

// ── Mock NextRequest/NextResponse for route handler ──────────

class MockNextRequest {
  private _body: unknown;
  private _headers: Map<string, string>;

  constructor(body: unknown, headers: Record<string, string> = {}) {
    this._body = body;
    this._headers = new Map(Object.entries(headers));
  }

  async json() {
    return this._body;
  }

  get headers() {
    return {
      get: (key: string) => this._headers.get(key) ?? null,
    };
  }
}

// ── Import after mocking ─────────────────────────────────────

const { POST } = await import(
  "../app/api/sandbox/heartbeat/route.ts"
);

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/sandbox/heartbeat", () => {
  beforeEach(() => {
    mockConnect.mock.resetCalls();
    mockSetTimeout.mock.resetCalls();
  });

  it("calls setTimeout(30min) on sandbox and returns ok", async () => {
    const req = new MockNextRequest({ sandboxId: "test-sandbox-123" });
    const res = await POST(req as any);
    const body = await res.json();

    assert.equal(body.status, "ok");
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

    const req = new MockNextRequest({ sandboxId: "dead-sandbox" });
    const res = await POST(req as any);
    const body = await res.json();

    assert.equal(body.status, "paused_or_dead");
  });

  it("returns 400 when sandboxId is missing", async () => {
    const req = new MockNextRequest({});
    const res = await POST(req as any);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });
});
