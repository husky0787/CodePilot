import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";

/** Heartbeat 应快速响应 */
export const maxDuration = 15;

/**
 * POST /api/sandbox/heartbeat
 * 接收 { sandboxId }，续期 E2B 沙箱 timeout（30 分钟滚动窗口）
 * 返回 { status: "ok" } 或 { status: "paused_or_dead" }
 */
export async function POST(req: NextRequest) {
  let body: { sandboxId?: unknown };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sandboxId =
    typeof body.sandboxId === "string" && body.sandboxId.trim()
      ? body.sandboxId.trim()
      : null;

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Missing sandboxId" },
      { status: 400 }
    );
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.setTimeout(30 * 60 * 1000); // 30 分钟滚动窗口
    return NextResponse.json({ status: "ok" });
  } catch {
    // 沙箱已暂停或已销毁
    return NextResponse.json({ status: "paused_or_dead" });
  }
}
