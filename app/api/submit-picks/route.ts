import { getUserByUsername, getWeeklySlate, submitUserPicks } from '@/lib/googleSheets';
import { sendPicksConfirmation } from '@/lib/email';
import { decodeSession, COOKIE_NAME } from '@/app/api/auth/login/route';
import { NextRequest, NextResponse } from 'next/server';

const normalizeGameId = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\.0$/, '')
    .replace(/^0+(?=\d)/, '');

const normalizeTeamName = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const teamMatches = (savedTeam: string, slateTeam: string) =>
  normalizeTeamName(savedTeam) === normalizeTeamName(slateTeam);

const getEasternNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const isPastSaturdayNoonET = () => {
  const now = getEasternNow();
  const day = now.getDay();
  return (day === 6 && now.getHours() >= 12) || day === 0;
};

const isGameStarted = (kickoff: string | undefined) => {
  if (!kickoff) return false;
  const kickoffDate = new Date(kickoff);
  if (Number.isNaN(kickoffDate.getTime())) return false;
  return kickoffDate <= new Date();
};

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const payload = body as { userInfo?: { username?: string; pin?: string }; picks?: Array<{ gameId?: string; team?: string; wager?: number }> };
    const { picks } = payload;
    if (!picks) {
      return NextResponse.json({ error: 'Missing picks' }, { status: 400 });
    }

    // Prefer session cookie; fall back to body for backwards-compat.
    const raw = request.cookies.get(COOKIE_NAME)?.value ?? '';
    const session = decodeSession(raw);
    const bodyUserInfo = payload.userInfo;
    const username = (session?.username ?? String(bodyUserInfo?.username ?? '')).trim();
    const pin = (session?.pin ?? String(bodyUserInfo?.pin ?? '')).trim();

    if (!username || pin.length !== 4) {
      return NextResponse.json({ error: 'Not authenticated. Please log in first.' }, { status: 401 });
    }

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
      const game = slate.find((entry) => normalizeGameId(entry.GameID) === normalizeGameId(pick.gameId));
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
        const picksForEmail = validPicks.map((pick) => {
          const game = slate.find(
            (entry) => normalizeGameId(entry.GameID) === normalizeGameId(pick.gameId),
          );

          let spread: string | number | null = null;
          if (game && game.Spread !== undefined && game.Spread !== null && String(game.Spread).trim() !== '') {
            const rawSpread = String(game.Spread).trim();
            const cleaned = rawSpread.replace(/[^0-9.+-]/g, '');
            const spreadNum = Number(cleaned);
            if (!Number.isNaN(spreadNum)) {
              const isAway = teamMatches(pick.team, String(game.AwayTeam ?? ''));
              const pickSpreadVal = isAway ? spreadNum * -1 : spreadNum;
              if (pickSpreadVal > 0) {
                spread = `+${pickSpreadVal}`;
              } else if (pickSpreadVal === 0) {
                spread = '0';
              } else {
                spread = `${pickSpreadVal}`;
              }
            } else {
              spread = rawSpread;
            }
          }

          return {
            gameId: pick.gameId,
            team: pick.team,
            wager: pick.wager,
            spread,
          };
        });

        const emailResult = await sendPicksConfirmation({
          email,
          username,
          week: String(result.week),
          picks: picksForEmail,
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