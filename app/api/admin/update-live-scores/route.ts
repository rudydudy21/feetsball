import { updateLiveScores } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await updateLiveScores();
    return NextResponse.json({ success: true, updatedRows: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update live scores';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
