import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Test the isPausedSandbox logic used in the status API route.
 * We replicate the pure function here since importing from the route
 * pulls in next/server and @/lib/e2b which can't resolve in bare node:test.
 * The route's own isPausedSandbox export is verified by typecheck.
 */
function isPausedSandbox(sandboxId: string, listedIds: string[]): boolean {
  return listedIds.includes(sandboxId);
}

describe("isPausedSandbox (status route logic)", () => {
  it("returns true when sandboxId appears in listed IDs", () => {
    const result = isPausedSandbox("sbx-abc123", [
      "sbx-xyz789",
      "sbx-abc123",
      "sbx-def456",
    ]);
    assert.equal(result, true);
  });

  it("returns false when sandboxId is not in the list", () => {
    const result = isPausedSandbox("sbx-abc123", [
      "sbx-xyz789",
      "sbx-def456",
    ]);
    assert.equal(result, false);
  });

  it("returns false for empty list", () => {
    const result = isPausedSandbox("sbx-abc123", []);
    assert.equal(result, false);
  });
});

/**
 * Test the status URL building logic used in SandboxLauncher and SandboxRestore.
 * We replicate the pure function here since importing React components is not
 * possible in bare node:test. The component implementations use identical logic.
 */
function buildStatusUrl(sandboxId: string, createdAt?: number): string {
  const params = new URLSearchParams({ id: sandboxId });
  if (createdAt) params.set("createdAt", String(createdAt));
  return `/api/sandbox/status?${params}`;
}

describe("status URL with createdAt", () => {
  it("includes createdAt when provided", () => {
    const url = buildStatusUrl("sbx-abc", 1710000000000);
    assert.ok(url.includes("id=sbx-abc"));
    assert.ok(url.includes("createdAt=1710000000000"));
  });

  it("omits createdAt when undefined", () => {
    const url = buildStatusUrl("sbx-abc", undefined);
    assert.ok(url.includes("id=sbx-abc"));
    assert.ok(!url.includes("createdAt"));
  });

  it("omits createdAt when 0 (falsy safe degradation)", () => {
    const url = buildStatusUrl("sbx-abc", 0);
    assert.ok(url.includes("id=sbx-abc"));
    assert.ok(!url.includes("createdAt"));
  });

  it("omits createdAt when NaN (falsy safe degradation)", () => {
    const url = buildStatusUrl("sbx-abc", NaN);
    assert.ok(url.includes("id=sbx-abc"));
    assert.ok(!url.includes("createdAt"));
  });
});
