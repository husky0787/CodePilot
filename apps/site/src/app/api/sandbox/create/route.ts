import { NextRequest, NextResponse } from "next/server";
import { createSandbox } from "@/lib/e2b";

/** Vercel Pro plan 函数超时 60 秒 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { apiKey?: unknown };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const apiKey =
    typeof body.apiKey === "string" && body.apiKey.trim()
      ? body.apiKey.trim()
      : undefined;

  // 创建 E2B 沙箱（apiKey 可选，用户可在沙箱内 Settings 配置 provider）
  try {
    const { sandboxId, url } = await createSandbox(apiKey);
    return NextResponse.json({ sandboxId, url });
  } catch (err) {
    console.error("E2B sandbox creation failed:", err);
    return NextResponse.json(
      { error: "沙箱创建失败，请稍后重试" },
      { status: 500 }
    );
  }
}
