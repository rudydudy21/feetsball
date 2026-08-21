import { getWeeklySlate } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

export const SLATE_CACHE_TAG = 'weekly-slate';

const getCachedSlate = unstable_cache(
  () => getWeeklySlate(),
  [SLATE_CACHE_TAG],
  {
    tags: [SLATE_CACHE_TAG],
    revalidate: 300, // 5-minute safety net; admin setup busts this immediately via revalidateTag
  },
);

export async function GET() {
  try {
    const data = await getCachedSlate();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route /api/get-slate error:', message);
    return NextResponse.json([], { status: 200 });
  }
}