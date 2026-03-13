/**
 * Unit tests for port scanning logic — parsing ss -tlnp output.
 *
 * Run with: npx tsx --test src/__tests__/unit/ports-scan.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We test the pure parser function, not the Next.js route handler
import { parseSsOutput, type PortInfo } from "../../app/api/ports/route";

const SAMPLE_SS_OUTPUT = `State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN 0      511        0.0.0.0:3000       0.0.0.0:*    users:(("node",pid=123,fd=19))
LISTEN 0      511        0.0.0.0:5173       0.0.0.0:*    users:(("node",pid=456,fd=20))
LISTEN 0      128        0.0.0.0:8080       0.0.0.0:*    users:(("python3",pid=789,fd=5))
LISTEN 0      128        0.0.0.0:22         0.0.0.0:*    users:(("sshd",pid=1,fd=3))
LISTEN 0      128        0.0.0.0:80         0.0.0.0:*    users:(("nginx",pid=100,fd=6))
LISTEN 0      128     [::]:5432          [::]:*    users:(("postgres",pid=200,fd=4))`;

describe("parseSsOutput", () => {
  it("parses typical ss output with multiple ports", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    // Should include 5173, 8080, 5432 (all > 1024 and != 3000)
    assert.ok(result.length >= 3, `Expected at least 3 ports, got ${result.length}`);
    const ports = result.map((r) => r.port);
    assert.ok(ports.includes(5173), "Should include port 5173");
    assert.ok(ports.includes(8080), "Should include port 8080");
    assert.ok(ports.includes(5432), "Should include port 5432");
  });

  it("filters out port 3000 (CodePilot itself)", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    const ports = result.map((r) => r.port);
    assert.ok(!ports.includes(3000), "Should not include port 3000");
  });

  it("filters out system ports (<= 1024)", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    const ports = result.map((r) => r.port);
    assert.ok(!ports.includes(22), "Should not include port 22");
    assert.ok(!ports.includes(80), "Should not include port 80");
  });

  it("extracts process names correctly", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    const p5173 = result.find((r) => r.port === 5173);
    assert.ok(p5173, "Should find port 5173");
    assert.equal(p5173.process, "node");

    const p8080 = result.find((r) => r.port === 8080);
    assert.ok(p8080, "Should find port 8080");
    assert.equal(p8080.process, "python3");
  });

  it("returns sorted by port number", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i].port >= result[i - 1].port, "Ports should be sorted ascending");
    }
  });

  it("returns empty array for empty input", () => {
    const result = parseSsOutput("");
    assert.deepEqual(result, []);
  });

  it("returns empty array for header-only input", () => {
    const result = parseSsOutput("State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\n");
    assert.deepEqual(result, []);
  });

  it("handles IPv6 addresses", () => {
    const result = parseSsOutput(SAMPLE_SS_OUTPUT);
    const p5432 = result.find((r) => r.port === 5432);
    assert.ok(p5432, "Should find IPv6 port 5432");
    assert.equal(p5432.process, "postgres");
  });
});
