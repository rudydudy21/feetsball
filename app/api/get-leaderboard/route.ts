import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await doc.loadInfo();
    
    // 1. Get the current week
    const settingsSheet = doc.sheetsByTitle['Settings'];
    await settingsSheet.loadCells('B2');
    const currentWeekCell = settingsSheet.getCellByA1('B2');
    const currentWeek = currentWeekCell.value;
    if (currentWeek == null) {
      throw new Error('Current week is not defined in Settings!B2');
    }

    // 2. Fetch Games & Determine Winners
    const slateSheet = doc.sheetsByTitle['Weekly_Slate'];
    const gameRows = await slateSheet.getRows();
    const gameResults: Record<string, { winner: string, isFinal: boolean }> = {};

    gameRows.forEach(row => {
      const awayScore = parseInt(row.get('AwayScore')) || 0;
      const homeScore = parseInt(row.get('HomeScore')) || 0;
      const status = row.get('Status');
      
      let winner = "";
      if (status === "Final") {
        winner = awayScore > homeScore ? row.get('AwayTeam') : row.get('HomeTeam');
      }

      gameResults[row.get('GameID')] = {
        winner,
        isFinal: status === "Final"
      };
    });

    // 3. Fetch All Picks for the week
    const picksSheet = doc.sheetsByTitle['Picks'];
    const pickRows = await picksSheet.getRows();
    const weeklyPicks = pickRows.filter(r => r.get('Week').toString() === currentWeek.toString());

    // 4. Calculate Standings
    const standings: Record<string, number> = {};

    weeklyPicks.forEach(pick => {
      const user = pick.get('Username');
      const gameId = pick.get('GameID');
      const selection = pick.get('Selection');
      const wager = parseInt(pick.get('Wager')) || 0;

      if (!standings[user]) standings[user] = 0;

      const result = gameResults[gameId];
      if (result && result.isFinal && selection === result.winner) {
        standings[user] += wager;
      }
    });

    // 5. Convert to sorted array
    const sortedLeaderboard = Object.entries(standings)
      .map(([username, score]) => ({ username, score }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json(sortedLeaderboard);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate leaderboard' }, { status: 500 });
  }
}