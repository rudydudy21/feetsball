import { getUserPicks } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? '').trim();
    const pin = String(body?.pin ?? '').trim();

    if (!username || !pin || pin.length !== 4) {
      return NextResponse.json([], { status: 200 });
    }

    const picks = await getUserPicks(username, pin);
    return NextResponse.json(picks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Route /api/get-my-picks error:', message);
    return NextResponse.json([], { status: 200 });
  }
}