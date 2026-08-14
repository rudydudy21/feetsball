"use client";
import { useState, useEffect, useMemo } from 'react';

interface UserData {
  username: string;
  weeks: { [week: number]: number };
  total: number;
}

const resolveWeeklyWinner = (week: number, tiedUsers: string[], allScores: any[], maxWeek: number): any => {
  // 1. If we only have one user, we have our champion
  if (tiedUsers.length === 1) {
    return { winner: tiedUsers[0], method: week > 1 ? `Tiebreaker (Week ${week})` : 'Outright' };
  }

  // 2. SAFETY: If we've reached the end of the season and still tied, split it
  if (week >= maxWeek) {
    return { winner: tiedUsers.join(' & '), method: 'Split Pot (Season End)' };
  }

  // 3. Look at the NEXT week's data
  const nextWeek = week + 1;
  const nextWeekScores = allScores.filter(s => s.week === nextWeek);

  // If next week hasn't happened yet, it's a Pending Tie
  if (nextWeekScores.length === 0) {
    return { winner: tiedUsers.join(' & '), method: 'Pending Tiebreaker' };
  }

  // 4. Compare the tied users' performance in that next week
  const performance = tiedUsers.map(user => ({
    username: user,
    score: nextWeekScores.find(s => s.username === user)?.points || 0
  }));

  const topScore = Math.max(...performance.map(p => p.score));
  const stillTied = performance
    .filter(p => p.score === topScore)
    .map(p => p.username);

  // 5. RECURSION: If still tied, go to the week after that
  return resolveWeeklyWinner(nextWeek, stillTied, allScores, maxWeek);
};

export default function SeasonLeaderboard() {
  const [data, setData] = useState<UserData[]>([]);
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

  useEffect(() => {
    fetch('/api/get-season-results').then(res => res.json()).then(setData);
  }, []);

  const weeklyWinners = useMemo(() => {
    if (!data.length) return [];

    return weeks.map(w => {
      // Find the max score for this specific week
      const scoresForWeek = data.map(user => ({
        username: user.username,
        points: user.weeks[w] || 0
      })).filter(s => s.points > 0); // Only count users who actually played/scored

      if (scoresForWeek.length === 0) return { week: w, winner: 'TBD', status: 'Upcoming' };

      const maxScore = Math.max(...scoresForWeek.map(s => s.points));
      const leaders = scoresForWeek.filter(s => s.points === maxScore).map(l => l.username);

      // Call the recursive function to handle ties
      const result = resolveWeeklyWinner(w, leaders, data.flatMap(user =>
        Object.entries(user.weeks).map(([wk, pts]) => ({
          username: user.username,
          week: parseInt(wk),
          points: pts
        }))
      ), 14);

      return {
        week: w,
        winner: result.winner,
        status: result.method
      };
    }).filter(w => w.winner !== 'TBD'); // Only show weeks that have happened
  }, [data, weeks]);

  return (
    <div style={{ padding: '40px 10px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "900",
              letterSpacing: "-2px",
              margin: "0",
              color: "#0f172a",
            }}
          >
            FEETSBALL
          </h1>
          <p
            style={{
              color: "#64748b",
              fontWeight: "bold",
              fontSize: "12px",
              letterSpacing: "4px",
            }}
          >
            2026 CHALLENGE
          </p>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px', fontSize: '12px', fontWeight: '900' }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>PICKS</a>
          <a href="/leaderboard/weekly" style={{ color: '#64748b', textDecoration: 'none' }}>WEEKLY</a>
          <a href="/leaderboard/season" style={{ color: '#0f172a', textDecoration: 'none', borderBottom: '2px solid #2563eb' }}>SEASON</a>
        </nav>

        <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '32px', marginBottom: '10px' }}>SEASON STANDINGS</h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginBottom: '40px' }}>NET POINTS TOTALS BY WEEK</p>

        <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '14px', color: '#64748b', letterSpacing: '2px' }}>WEEKLY CHAMPIONS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {weeklyWinners.map((w) => (
                <div key={w.week} style={{ 
                    backgroundColor: '#fff', 
                    padding: '12px 20px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    border: '1px solid #e2e8f0'
                }}>
                    <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>WEEK {w.week}</span>
                    <span style={{ fontWeight: '900', color: '#0f172a' }}>{w.winner.toUpperCase()}</span>
                    <span style={{ fontSize: '10px', color: w.status.includes('Awaiting') ? '#f59e0b' : '#10b981' }}>
                    {w.status}
                    </span>
                </div>
                ))}
            </div>
        </div>
        
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '15px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 10 }}>USER</th>
                {weeks.map(w => <th key={w} style={{ padding: '10px', textAlign: 'center' }}>W{w}</th>)}
                <th style={{ padding: '15px', textAlign: 'right', backgroundColor: '#eff6ff', fontWeight: '900' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user: UserData) => (
                <tr key={user.username} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: '#fff' }}>{user.username}</td>
                  {weeks.map(w => {
                    const score = user.weeks[w] || 0;
                    return (
                      <td key={w} style={{ 
                        padding: '10px', 
                        textAlign: 'center', 
                        color: score > 0 ? '#166534' : score < 0 ? '#991b1b' : '#cbd5e1',
                        fontWeight: score !== 0 ? 'bold' : 'normal'
                      }}>
                        {score !== 0 ? score : '-'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '15px', textAlign: 'right', fontWeight: '900', backgroundColor: '#eff6ff', color: user.total >= 0 ? '#2563eb' : '#991b1b' }}>
                    {user.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}