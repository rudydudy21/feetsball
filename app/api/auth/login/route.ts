import { getUserByUsername, getUserPicks, isValidUsername, normalizePin, normalizeUsername } from '@/lib/googleSheets';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export const COOKIE_NAME = 'feetsball_session';

/** Encodes username+pin into the session cookie value. */
export function encodeSession(username: string, pin: string): string {
  return `${username}:${pin}`;
}

/** Decodes the session cookie back into username + pin. Returns null if malformed. */
export function decodeSession(value: string): { username: string; pin: string } | null {
  const idx = value.indexOf(':');
  if (idx === -1) return null;
  const username = value.slice(0, idx).trim();
  const pin = normalizePin(value.slice(idx + 1).trim());
  if (!username || pin.length !== 4) return null;
  return { username, pin };
}

export async function POST(req: NextRequest) {
  let body: { username?: string; pin?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? '');
  const pin = normalizePin(body.pin ?? '');

  if (!isValidUsername(username) || pin.length !== 4) {
    return NextResponse.json({ error: 'Invalid username or PIN.' }, { status: 400 });
  }

  // Look up user in the Users sheet and validate PIN server-side.
  const userRow = await getUserByUsername(username).catch(() => null);
  if (!userRow) {
    return NextResponse.json({ error: 'Username not found.' }, { status: 401 });
  }

  const storedPin = normalizePin(userRow.get('PIN'));
  if (storedPin !== pin) {
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  // PIN is valid — load current-week picks and set the session cookie.
  const picks = await getUserPicks(username, pin).catch(() => []);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(username, pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ username, picks });
}
