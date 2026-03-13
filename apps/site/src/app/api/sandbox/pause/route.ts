import { NextRequest, NextResponse } from "next/server";
import { pauseSandbox } from "@/lib/e2b";

/** 暂停操作可能需要几秒（sync + pause） */
export const maxDuration = 30;

/**
 * POST /api/sandbox/pause
 * 接收 { sandboxId }，调用 pauseSandbox 暂停沙箱
 * 返回 { success: true } 或 { error: "..." }
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

  const success = await pauseSandbox(sandboxId);

  if (success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { error: "Failed to pause sandbox" },
      { status: 500 }
    );
  }
}
