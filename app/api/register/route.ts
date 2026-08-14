import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, pin, inviteCode, email } = await req.json();

    await doc.loadInfo();
    
    // 1. Fetch the Master Code from the Settings tab
    const settingsSheet = doc.sheetsByTitle['Settings'];
    await settingsSheet.loadCells('B3');
    const MASTER_CODE = settingsSheet.getCellByA1('B3').value?.toString().trim();

    // 2. Validate the Invite Code
    if (inviteCode?.toString().trim().toUpperCase() !== MASTER_CODE?.toUpperCase()) {
      return NextResponse.json({ error: 'Invalid League Invite Code', 
        debug: `Entered: ${inviteCode} | Expected: ${MASTER_CODE}` // Optional: remove after testing{ status: 401 });
    }, { status: 401 });
    }

    // 3. Load Users Sheet
    const userSheet = doc.sheetsByTitle['Users'];
    const rows = await userSheet.getRows();

    // 4. Check if username already exists
    const exists = rows.find(r => r.get('Username')?.toLowerCase() === username.toLowerCase());
    if (exists) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    // 5. Add new user with Email
    await userSheet.addRow({
      Username: username,
      Email: email.toLowerCase().trim(), // Clean the data
      PIN: pin.toString(),
      Created: new Date().toLocaleString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}