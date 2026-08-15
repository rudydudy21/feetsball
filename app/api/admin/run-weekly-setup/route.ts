import { runWeeklySetup } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await runWeeklySetup();
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run weekly setup';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
