import { NextRequest, NextResponse } from "next/server";
import { checkSandbox } from "@/lib/e2b";

export async function GET(req: NextRequest) {
  const sandboxId = req.nextUrl.searchParams.get("id");

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Missing sandbox ID" },
      { status: 400 }
    );
  }

  const status = await checkSandbox(sandboxId);
  return NextResponse.json(status);
}
