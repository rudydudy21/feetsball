import { getUserPicks, isValidUsername } from '@/lib/googleSheets';
import { COOKIE_NAME, decodeSession } from '@/app/api/auth/login/route';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Returns the current session's username and existing picks, or { loggedIn: false }.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const session = decodeSession(raw);

  if (!session || !isValidUsername(session.username)) {
    return NextResponse.json({ loggedIn: false });
  }

  const picks = await getUserPicks(session.username, session.pin).catch(() => []);
  return NextResponse.json({ loggedIn: true, username: session.username, picks });
}
