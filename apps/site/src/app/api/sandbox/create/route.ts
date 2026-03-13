import { NextRequest, NextResponse } from "next/server";
import { createSandbox } from "@/lib/e2b";
import { checkRateLimit } from "@/lib/rate-limit";

/** Vercel Pro plan 函数超时 60 秒 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // IP 级限流：每个 IP 每小时最多 5 次
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip, 5)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

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

  // 创建 E2B 沙箱，失败重试一次（2s 延迟）
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { sandboxId, url } = await createSandbox(apiKey);
      return NextResponse.json({ sandboxId, url });
    } catch (err) {
      if (attempt === 0) {
        console.error("E2B sandbox creation failed, retrying in 2s:", err);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error("E2B sandbox creation failed after retry:", err);
      }
    }
  }

  return NextResponse.json(
    { error: "沙箱创建失败，请稍后重试" },
    { status: 500 }
  );
}
