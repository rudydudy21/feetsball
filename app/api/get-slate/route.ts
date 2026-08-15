import { getWeeklySlate } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await getWeeklySlate();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route /api/get-slate error:', message);
    return NextResponse.json([], { status: 200 });
  }
}