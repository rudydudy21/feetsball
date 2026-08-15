import { getLeagueMasterCode, registerUser } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, pin, inviteCode, email } = await req.json();
    const masterCode = await getLeagueMasterCode();

    if (String(inviteCode ?? '').trim().toUpperCase() !== masterCode) {
      return NextResponse.json(
        {
          error: 'Invalid League Invite Code',
          debug: `Entered: ${inviteCode} | Expected: ${masterCode}`,
        },
        { status: 401 },
      );
    }

    const result = await registerUser({
      username: String(username ?? '').trim(),
      email: String(email ?? '').trim(),
      pin: String(pin ?? '').trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}