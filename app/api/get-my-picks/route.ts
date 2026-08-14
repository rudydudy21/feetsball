import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? '').trim();
    const pin = String(body?.pin ?? '').trim();

    if (!username || !pin || pin.length !== 4) {
      return NextResponse.json([], { status: 200 });
    }

    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is missing.");
      return NextResponse.json([], { status: 200 });
    }

    const targetUrl = `${scriptUrl}?action=getPicks&username=${encodeURIComponent(username)}&pin=${encodeURIComponent(pin)}`;
    const response = await fetch(targetUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const payload = await response.json();
    console.log('RAW GET-PICKS PAYLOAD:', payload);

    const candidates = [
      payload,
      payload?.data,
      payload?.picks,
      payload?.result,
      payload?.items,
    ];

    const normalized = candidates.find(Array.isArray);
    const picks = Array.isArray(normalized) ? normalized : [];

    const mappedPicks = picks
      .map((pick: Record<string, unknown>) => {
        const gameId = String(
          pick.GameID ??
          pick.gameId ??
          pick.game_id ??
          pick.Game_Id ??
          pick.gameID ??
          pick.id ??
          ''
        ).trim();

        const team = String(
          pick.Selection ??
          pick.selection ??
          pick.Team ??
          pick.team ??
          pick.SelectedTeam ??
          pick.selectedTeam ??
          pick.PickedTeam ??
          pick.pickedTeam ??
          ''
        ).trim();

        const wager = Number(
          pick.Wager ??
          pick.wager ??
          pick.Bet ??
          pick.bet ??
          pick.Amount ??
          pick.amount ??
          0
        );

        if (!gameId || !team) return null;

        return {
          gameId,
          team,
          wager: Number.isFinite(wager) ? wager : 0,
        };
      })
      .filter((pick): pick is { gameId: string; team: string; wager: number } => pick !== null);

    console.log('MAPPED PICKS:', mappedPicks);
    return NextResponse.json(mappedPicks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("API Route /api/get-my-picks error:", message);
    return NextResponse.json([], { status: 200 });
  }
}