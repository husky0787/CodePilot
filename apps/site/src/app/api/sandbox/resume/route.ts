import { NextRequest, NextResponse } from "next/server";
import { resumeSandbox } from "@/lib/e2b";

/** 恢复操作可能较慢（重启暂停的沙箱） */
export const maxDuration = 60;

/**
 * POST /api/sandbox/resume
 * 接收 { sandboxId }，调用 resumeSandbox 恢复沙箱
 * 返回 { sandboxId, url } 或 { error: "..." }
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

  const result = await resumeSandbox(sandboxId);

  if (result) {
    return NextResponse.json({
      sandboxId: result.sandboxId,
      url: result.url,
    });
  } else {
    return NextResponse.json(
      { error: "Failed to resume sandbox" },
      { status: 500 }
    );
  }
}
