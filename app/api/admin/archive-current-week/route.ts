import { archiveCurrentWeek } from '@/lib/googleSheets';
import { isAuthorized } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const archivedCount = await archiveCurrentWeek();
    return NextResponse.json({ success: true, archivedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive current week';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
