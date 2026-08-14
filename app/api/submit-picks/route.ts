import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { userInfo, picks } = body;

  try {
    await doc.loadInfo();
    
    // 1. Verify User
    const userSheet = doc.sheetsByTitle['Users'];
    const userRows = await userSheet.getRows();
    const user = userRows.find(r => 
      r.get('Username') === userInfo.username && 
      r.get('PIN').toString() === userInfo.pin.toString()
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid Username or PIN' }, { status: 401 });
    }

    // 2. Get Current Week
    const settingsSheet = doc.sheetsByTitle['Settings'];
    await settingsSheet.loadCells('B2');
    const currentWeek = settingsSheet.getCellByA1('B2').value;

    if (currentWeek === null || currentWeek === undefined) {
      return NextResponse.json({ error: 'Current week not configured' }, { status: 500 });
    }

    // 3. Prepare the New Picks Data
    const rowsToAdd = picks.map((p: any) => ({
      Timestamp: new Date().toLocaleString(),
      Username: userInfo.username,
      Week: currentWeek,
      GameID: p.gameId,
      Selection: p.team,
      Wager: p.wager
    }));

    // 4. Overwrite Logic: Find and Remove Old Picks
    const picksSheet = doc.sheetsByTitle['Picks'];
    const allRows = await picksSheet.getRows();

    const rowsToDelete = allRows.filter(r => 
      r.get('Username') === userInfo.username && 
      r.get('Week').toString() === currentWeek.toString()
    );

    for (const row of rowsToDelete) {
      await row.delete();
    }

    // 5. Final Step: Add the Newest Picks
    await picksSheet.addRows(rowsToAdd);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}