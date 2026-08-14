import { doc } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');

  try {
    await doc.loadInfo();
    
    // 1. Get Slate & determine winners for the requested week
    const slateSheet = doc.sheetsByTitle['Weekly_Slate'];
    const gameRows = await slateSheet.getRows();
    
    const gameResults: Record<string, any> = {};
    gameRows.forEach(row => {
      const aScore = parseInt(row.get('AwayPoints')) || 0;
      const hScore = parseInt(row.get('HomePoints')) || 0;
      const status = row.get('Status');
      const spread = parseFloat(row.get('Spread')) || 0;
      
      let winner = null;
      if (status === "Final") {
        // Calculate spread coverage instead of straight winner
        const margin = aScore - hScore; // Positive = away wins, negative = home wins
        
        // Determine which team covered the spread
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
      }

      gameResults[row.get('GameID')] = { winner, status, spread };
    });

    // 2. Get All Picks for this week
    const picksSheet = doc.sheetsByTitle['Picks'];
    const allPicks = await picksSheet.getRows();
    const weeklyPicks = allPicks.filter(r => r.get('Week').toString() === week);

    // 3. Group by User
    const userMap: Record<string, any> = {};

    weeklyPicks.forEach(p => {
      const user = p.get('Username');
      const wager = p.get('Wager');
      const selection = p.get('Selection');
      const gameId = p.get('GameID');
      const result = gameResults[gameId];

      if (!userMap[user]) {
        userMap[user] = { username: user, picks: {}, total: 0 };
      }

      let outcome = "pending"; // pending, correct, incorrect
      if (result?.status === "Final") {
        outcome = selection === result.winner ? "correct" : "incorrect";
        if (outcome === "correct") {
          userMap[user].total += parseInt(wager);
        } else if (outcome === "incorrect") {
          userMap[user].total -= parseInt(wager);
        }
      }
    

      userMap[user].picks[wager] = { selection, outcome };
    });

    return NextResponse.json(Object.values(userMap).sort((a, b) => b.total - a.total));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}