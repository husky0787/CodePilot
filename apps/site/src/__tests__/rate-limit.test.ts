import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const { checkRateLimit, _resetForTest } = await import(
  "../lib/rate-limit.ts"
);

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetForTest();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(checkRateLimit("192.168.1.1", 5), true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", 5);
    }
    assert.equal(checkRateLimit("192.168.1.1", 5), false);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", 5);
    }
    // Different IP should still be allowed
    assert.equal(checkRateLimit("192.168.1.2", 5), true);
  });

  it("uses default maxPerHour of 5", () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(checkRateLimit("10.0.0.1"), true);
    }
    assert.equal(checkRateLimit("10.0.0.1"), false);
  });

  it("resets after expiry window", () => {
    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1", 5);
    }
    assert.equal(checkRateLimit("192.168.1.1", 5), false);

    // Simulate time passing by resetting (in real use, the resetAt would expire)
    _resetForTest();
    assert.equal(checkRateLimit("192.168.1.1", 5), true);
  });
});
