import { getWeeklySlate } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const games = await getWeeklySlate();
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch slate' }, { status: 500 });
  }
}