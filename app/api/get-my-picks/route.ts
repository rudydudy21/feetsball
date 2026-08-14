import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { username, pin } = await req.json();

  try {
    await doc.loadInfo();
    
    // 1. Verify User (Security First)
    const userSheet = doc.sheetsByTitle['Users'];
    const userRows = await userSheet.getRows();
    const user = userRows.find(r => 
      r.get('Username') === username && 
      r.get('PIN').toString() === pin.toString()
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Get Current Week
    const settingsSheet = doc.sheetsByTitle['Settings'];
    await settingsSheet.loadCells('B2');
    const currentWeek = settingsSheet.getCellByA1('B2').value;

    if (currentWeek == null) {
      return NextResponse.json({ error: 'Current week not configured' }, { status: 500 });
    }

    // 3. Find existing picks
    const picksSheet = doc.sheetsByTitle['Picks'];
    const allRows = await picksSheet.getRows();
    const myRows = allRows.filter(r => 
      r.get('Username') === username && 
      r.get('Week').toString() === currentWeek.toString()
    );

    const existingPicks = myRows.map(r => ({
      gameId: r.get('GameID'),
      team: r.get('Selection'),
      wager: parseInt(r.get('Wager'))
    }));

    return NextResponse.json(existingPicks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
  }
}