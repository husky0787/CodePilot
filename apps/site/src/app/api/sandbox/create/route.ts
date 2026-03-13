import { NextRequest, NextResponse } from "next/server";
import { validateAnthropicKey } from "@/lib/validate-key";
import { createSandbox } from "@/lib/e2b";

/** Vercel Pro plan 函数超时 60 秒 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { apiKey?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { apiKey } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { error: "API Key 是必填项" },
      { status: 400 }
    );
  }

  // 验证 Anthropic API Key
  const validation = await validateAnthropicKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 401 }
    );
  }

  // 创建 E2B 沙箱
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
