import { getSeasonResults } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const results = await getSeasonResults();
    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route /api/get-season-results error:', message);
    return NextResponse.json({ data: [], archivedWeeks: [], error: message }, { status: 200 });
  }
}