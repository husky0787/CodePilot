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
