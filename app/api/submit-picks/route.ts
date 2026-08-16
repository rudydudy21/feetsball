import { getUserByUsername, getWeeklySlate, submitUserPicks } from '@/lib/googleSheets';
import { sendPicksConfirmation } from '@/lib/email';
import { NextResponse } from 'next/server';

const getEasternNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const isPastSaturdayNoonET = () => {
  const now = getEasternNow();
  return now.getDay() === 6 && now.getHours() >= 12;
};

const isGameStarted = (kickoff: string | undefined) => {
  if (!kickoff) return false;
  const kickoffDate = new Date(kickoff);
  if (Number.isNaN(kickoffDate.getTime())) return false;
  return kickoffDate <= new Date();
};

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

    if (!username || pin.length !== 4 || validPicks.length < 1 || validPicks.length > 5) {
      return NextResponse.json({ error: 'Please select between 1 and 5 games before submitting.' }, { status: 400 });
    }

    if (isPastSaturdayNoonET()) {
      return NextResponse.json({ error: 'Submissions are closed after noon ET on Saturday.' }, { status: 400 });
    }

    const slate = await getWeeklySlate();
    const startedGames = validPicks.filter((pick) => {
      const game = slate.find((entry) => String(entry.GameID) === String(pick.gameId));
      return game && isGameStarted(game.Kickoff_Time);
    });

    if (startedGames.length > 0) {
      return NextResponse.json({ error: 'One or more selected games have already started and cannot be changed.' }, { status: 400 });
    }

    const result = await submitUserPicks({ username, pin }, validPicks);

    try {
      const userRow = await getUserByUsername(username);
      const email = String(userRow?.get('Email') ?? '').trim();
      console.log('Picks email lookup', { username, emailExists: !!email, week: result.week });

      if (email) {
        const emailResult = await sendPicksConfirmation({
          email,
          username,
          week: String(result.week),
          picks: validPicks,
        });
        console.log('Picks email result', emailResult);
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