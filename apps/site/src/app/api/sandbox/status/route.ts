import { NextRequest, NextResponse } from "next/server";
import { checkSandbox, pauseSandbox } from "@/lib/e2b";
import { Sandbox } from "e2b";

/**
 * Detect whether a sandbox is paused by checking if it appears in the
 * E2B sandbox list despite being unreachable via connect.
 * Exported as a pure function for testability.
 */
export function isPausedSandbox(
  sandboxId: string,
  listedIds: string[]
): boolean {
  return listedIds.includes(sandboxId);
}

/**
 * GET /api/sandbox/status?id=...&createdAt=...
 *
 * Enhanced response:
 * { alive: boolean; ready: boolean; paused: boolean; url?: string; age?: number }
 *
 * - If sandbox is alive and older than 24h, force-pause it (cleanup on access)
 * - If sandbox is not alive, check if it's paused via Sandbox.list()
 */
export async function GET(req: NextRequest) {
  const sandboxId = req.nextUrl.searchParams.get("id");
  const createdAtParam = req.nextUrl.searchParams.get("createdAt");

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Missing sandbox ID" },
      { status: 400 }
    );
  }

  const createdAt = createdAtParam ? parseInt(createdAtParam, 10) : undefined;
  const age =
    createdAt && !isNaN(createdAt) ? Date.now() - createdAt : undefined;

  const status = await checkSandbox(sandboxId);

  // If alive but exceeded 24h max lifetime, force-pause (cleanup on access)
  const MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
  if (status.alive && age && age > MAX_LIFETIME_MS) {
    await pauseSandbox(sandboxId);
    return NextResponse.json({
      alive: false,
      ready: false,
      paused: true,
      age,
    });
  }

  if (status.alive) {
    return NextResponse.json({
      alive: true,
      ready: status.ready,
      paused: false,
      url: status.url,
      ...(age !== undefined && { age }),
    });
  }

  // Sandbox not alive -- check if it's paused (still listed on E2B)
  try {
    const running = await Sandbox.list();
    const listedIds = running.map((s) => s.sandboxId);
    const paused = isPausedSandbox(sandboxId, listedIds);

    return NextResponse.json({
      alive: false,
      ready: false,
      paused,
      ...(age !== undefined && { age }),
    });
  } catch {
    // If listing fails, assume not paused
    return NextResponse.json({
      alive: false,
      ready: false,
      paused: false,
      ...(age !== undefined && { age }),
    });
  }
}
