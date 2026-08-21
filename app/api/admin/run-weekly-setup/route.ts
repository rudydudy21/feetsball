import { runWeeklySetup } from '@/lib/googleSheets';
import { isAuthorized } from '@/lib/adminAuth';
import { SLATE_CACHE_TAG } from '@/app/api/get-slate/route';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklySetup();
    // Bust the slate cache immediately so users see the new slate without waiting.
    revalidateTag(SLATE_CACHE_TAG, 'days');
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run weekly setup';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
