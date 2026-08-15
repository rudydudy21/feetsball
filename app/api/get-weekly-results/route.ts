import { getWeeklyResultsForWeek } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || '1';
    const data = await getWeeklyResultsForWeek(week);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route Error (/api/get-weekly-results):', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}