import { NextResponse } from "next/server";
import { execSync } from "child_process";

export interface PortInfo {
  port: number;
  process: string;
}

/**
 * Parse ss -tlnp output and return filtered port list.
 * Exported for unit testing.
 */
export function parseSsOutput(output: string): PortInfo[] {
  if (!output.trim()) return [];

  const lines = output.trim().split("\n");
  // Skip header line
  const dataLines = lines.slice(1);

  const ports: PortInfo[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Match port from Local Address:Port — handles both IPv4 (0.0.0.0:PORT) and IPv6 ([::]:PORT)
    const portMatch = line.match(/:(\d+)\s/);
    if (!portMatch) continue;

    const port = parseInt(portMatch[1], 10);
    if (isNaN(port)) continue;

    // Filter: system ports and CodePilot itself
    if (port <= 1024 || port === 3000) continue;

    // Extract process name from users:(("name",...))
    const processMatch = line.match(/users:\(\("([^"]+)"/);
    const processName = processMatch ? processMatch[1] : "unknown";

    ports.push({ port, process: processName });
  }

  // Sort by port number and deduplicate
  ports.sort((a, b) => a.port - b.port);

  // Deduplicate by port (same port can appear for IPv4 and IPv6)
  const seen = new Set<number>();
  return ports.filter((p) => {
    if (seen.has(p.port)) return false;
    seen.add(p.port);
    return true;
  });
}

export async function GET() {
  try {
    const output = execSync("ss -tlnp", {
      timeout: 5000,
      encoding: "utf-8",
    });

    const ports = parseSsOutput(output);
    return NextResponse.json({ ports });
  } catch {
    // Non-throwing: return empty array on any error
    return NextResponse.json({ ports: [] });
  }
}
