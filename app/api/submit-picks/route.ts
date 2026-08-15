import { getUserByUsername, submitUserPicks } from '@/lib/googleSheets';
import { sendPicksConfirmation } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const payload = body as { userInfo?: { username?: string; pin?: string }; picks?: Array<{ gameId?: string; team?: string; wager?: number }> };
    const { userInfo, picks } = payload;
    if (!userInfo || !picks) {
      return NextResponse.json({ error: 'Missing userInfo or picks' }, { status: 400 });
    }

    const username = String(userInfo.username ?? '').trim();
    const pin = String(userInfo.pin ?? '').trim();
    const validPicks = (picks || [])
      .filter((pick) => pick?.gameId && pick?.team)
      .map((pick) => ({
        gameId: String(pick.gameId),
        team: String(pick.team),
        wager: Number(pick.wager) || 0,
      }));

    if (!username || pin.length !== 4 || validPicks.length === 0) {
      return NextResponse.json({ error: 'Invalid submission payload' }, { status: 400 });
    }

    const result = await submitUserPicks({ username, pin }, validPicks);

    try {
      const userRow = await getUserByUsername(username);
      const email = String(userRow?.get('Email') ?? '').trim();
      if (email) {
        await sendPicksConfirmation({
          email,
          username,
          week: String(result.week),
          picks: validPicks,
        });
      }
    } catch (emailError) {
      console.error('PICKS-EMAIL ERROR:', emailError);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submission failed';
    console.error('SUBMIT-PICKS CRITICAL ERROR:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}