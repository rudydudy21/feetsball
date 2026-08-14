import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await doc.loadInfo();
    
    // 1. Map all game results once for fast lookup
    const slateSheet = doc.sheetsByTitle['Weekly_Slate'];
    const gameRows = await slateSheet.getRows();
    const gameResults: Record<string, string> = {};

    gameRows.forEach(row => {
      if (row.get('Status') === "Final") {
        const aScore = parseInt(row.get('AwayPoints')) || 0;
        const hScore = parseInt(row.get('HomePoints')) || 0;
        const spread = parseFloat(row.get('Spread')) || 0;
        
        // Calculate spread coverage instead of straight winner
        const margin = aScore - hScore; // Positive = away wins, negative = home wins
        let winner;
        
        if (spread < 0) {
          // Away team is favorite (negative spread)
          winner = margin > Math.abs(spread) ? row.get('AwayTeam') : row.get('HomeTeam');
        } else if (spread > 0) {
          // Home team is favorite (positive spread)
          winner = (hScore - aScore) > spread ? row.get('HomeTeam') : row.get('AwayTeam');
        } else {
          // No spread (pick'em) - fall back to straight winner
          winner = aScore > hScore ? row.get('AwayTeam') : row.get('HomeTeam');
        }
        
        gameResults[row.get('GameID')] = winner;
      }
    });

    // 2. Get all picks
    const picksSheet = doc.sheetsByTitle['Picks'];
    const allPicks = await picksSheet.getRows();

    // 3. Build the Matrix: { "Username": { "1": 5, "2": -3, "total": 2 } }
    const seasonData: Record<string, any> = {};

    allPicks.forEach(p => {
      const user = p.get('Username');
      const week = p.get('Week');
      const wager = parseInt(p.get('Wager')) || 0;
      const selection = p.get('Selection');
      const gameId = p.get('GameID');

      if (!seasonData[user]) {
        seasonData[user] = { username: user, weeks: {}, total: 0 };
      }
      if (!seasonData[user].weeks[week]) seasonData[user].weeks[week] = 0;

      const winner = gameResults[gameId];
      if (winner) { // Only score if game is Final
        const points = selection === winner ? wager : -wager;
        seasonData[user].weeks[week] += points;
        seasonData[user].total += points;
      }
    });

    return NextResponse.json(Object.values(seasonData).sort((a, b) => b.total - a.total));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}