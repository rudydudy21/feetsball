import { getSeasonResults } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resultsArray = await getSeasonResults();
    return NextResponse.json(resultsArray);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route /api/get-season-results error:', message);
    return NextResponse.json([], { status: 200 });
  }
}