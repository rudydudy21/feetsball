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
    const candidates = [
      payload,
      payload?.data,
      payload?.picks,
      payload?.result,
      payload?.items,
    ];

    const normalized = candidates.find(Array.isArray);
    const picks = Array.isArray(normalized) ? normalized : [];

    const mappedPicks = picks.map((pick: Record<string, unknown>) => ({
      gameId: String(pick.GameID ?? pick.gameId ?? pick.game_id ?? '').trim(),
      team: String(pick.Selection ?? pick.team ?? pick.Team ?? '').trim(),
      wager: Number(pick.Wager ?? pick.wager ?? pick.bet ?? 0),
    })).filter((pick) => pick.gameId && pick.team);

    return NextResponse.json(mappedPicks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("API Route /api/get-my-picks error:", message);
    return NextResponse.json([], { status: 200 });
  }
}