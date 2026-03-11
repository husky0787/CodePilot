import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { findClaudeBinary } from '@/lib/platform';

export async function GET() {
  // Check SQLite availability
  let sqliteOk = false;
  let sqliteError: string | undefined;
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    sqliteOk = true;
  } catch (err) {
    sqliteError = err instanceof Error ? err.message : String(err);
  }

  // Check Claude CLI discoverability
  let claudeCliFound = false;
  let claudePath: string | undefined;
  try {
    const bin = findClaudeBinary();
    if (bin) {
      claudeCliFound = true;
      claudePath = bin;
    }
  } catch {
    // Claude CLI check failed — not critical
  }

  // SQLite failure is critical — return 503
  if (!sqliteOk) {
    return NextResponse.json(
      { status: 'error', message: `SQLite check failed: ${sqliteError}` },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    sqlite: true,
    claude_cli: claudeCliFound,
    ...(claudePath && { claude_path: claudePath }),
  });
}
