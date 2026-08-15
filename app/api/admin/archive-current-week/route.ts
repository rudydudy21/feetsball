import { archiveCurrentWeek } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const archivedCount = await archiveCurrentWeek();
    return NextResponse.json({ success: true, archivedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive current week';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
