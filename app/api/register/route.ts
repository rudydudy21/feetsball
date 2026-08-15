import { getLeagueMasterCode, isValidUsername, normalizeUsername, registerUser } from '@/lib/googleSheets';
import { sendRegistrationConfirmation } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, pin, inviteCode, email } = await req.json();
    const masterCode = await getLeagueMasterCode();
    const normalizedUsername = normalizeUsername(username);

    if (String(inviteCode ?? '').trim().toUpperCase() !== masterCode) {
      return NextResponse.json(
        {
          error: 'Invalid League Invite Code',
          debug: `Entered: ${inviteCode} | Expected: ${masterCode}`,
        },
        { status: 401 },
      );
    }

    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters using letters, numbers, underscores, or hyphens.' },
        { status: 400 },
      );
    }

    if (String(pin ?? '').trim().length !== 4) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 });
    }

    const result = await registerUser({
      username: normalizedUsername,
      email: String(email ?? '').trim(),
      pin: String(pin ?? '').trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
      await sendRegistrationConfirmation({
        email: String(email ?? '').trim(),
        username: normalizedUsername,
      });
    } catch (emailError) {
      console.error('Registration email sending failed:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}