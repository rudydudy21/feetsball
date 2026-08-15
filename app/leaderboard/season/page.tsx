"use client";
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

interface UserData {
  username: string;
  weeks: { [week: number]: number };
  total: number;
}

type ScoreEntry = { username: string; week: number; points: number };

const resolveWeeklyWinner = (week: number, tiedUsers: string[], allScores: ScoreEntry[], maxWeek: number): { winner: string; method: string } => {
  if (tiedUsers.length === 1) {
    return { winner: tiedUsers[0], method: week > 1 ? `Tiebreaker (Week ${week})` : 'Outright' };
  }

  if (week >= maxWeek) {
    return { winner: tiedUsers.join(' & '), method: 'Split Pot (Season End)' };
  }

  const nextWeek = week + 1;
  const nextWeekScores = allScores.filter(s => s.week === nextWeek);

  if (nextWeekScores.length === 0) {
    return { winner: tiedUsers.join(' & '), method: 'Pending Tiebreaker' };
  }

  const performance = tiedUsers.map(user => ({
    username: user,
    score: nextWeekScores.find(s => s.username === user)?.points || 0
  }));

  const topScore = Math.max(...performance.map(p => p.score));
  const stillTied = performance
    .filter(p => p.score === topScore)
    .map(p => p.username);

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
      const scoresForWeek = data.map(user => ({
        username: user.username,
        points: user.weeks[w] || 0
      })).filter(s => s.points > 0);

      if (scoresForWeek.length === 0) return { week: w, winner: 'TBD', status: 'Upcoming' };

      const maxScore = Math.max(...scoresForWeek.map(s => s.points));
      const leaders = scoresForWeek.filter(s => s.points === maxScore).map(l => l.username);

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
    }).filter(w => w.winner !== 'TBD');
  }, [data, weeks]);

  return (
    <div style={{ padding: 'max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.9rem, 7vw, 3rem)', fontWeight: '900', letterSpacing: '-2px', margin: '0', lineHeight: 1, color: '#0f172a' }}>FEETSBALL</h1>
          <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '10px', letterSpacing: '3px', margin: '5px 0 0' }}>2026 CHALLENGE</p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '7px 12px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>SEASON</Link>
        </nav>

        <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '26px', margin: '0' }}>SEASON STANDINGS</h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>NET POINTS TOTALS BY WEEK</p>

        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', margin: '0', textTransform: 'uppercase' }}>Weekly Champions</h2>
          {weeklyWinners.map((w) => (
            <div key={w.week} style={{
              backgroundColor: '#fff',
              padding: '10px 12px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
              fontSize: '12px'
            }}>
              <span style={{ fontWeight: '800', color: '#94a3b8' }}>WEEK {w.week}</span>
              <span style={{ fontWeight: '900', color: '#0f172a', textAlign: 'center', flex: 1 }}>{w.winner.toUpperCase()}</span>
              <span style={{ fontSize: '9px', color: w.status.includes('Awaiting') ? '#f59e0b' : '#10b981', textAlign: 'right' }}>
                {w.status}
              </span>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '18px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px 10px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 10, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>User</th>
                {weeks.map(w => <th key={w} style={{ padding: '8px 6px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>W{w}</th>)}
                <th style={{ padding: '12px 10px', textAlign: 'right', backgroundColor: '#eff6ff', fontWeight: '900', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user: UserData) => (
                <tr key={user.username} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: '800', position: 'sticky', left: 0, backgroundColor: '#fff' }}>{user.username}</td>
                  {weeks.map(w => {
                    const score = user.weeks[w] || 0;
                    return (
                      <td key={w} style={{
                        padding: '8px 6px',
                        textAlign: 'center',
                        color: score > 0 ? '#166534' : score < 0 ? '#991b1b' : '#cbd5e1',
                        fontWeight: score !== 0 ? '800' : 'normal'
                      }}>
                        {score !== 0 ? score : '-'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', backgroundColor: '#eff6ff', color: user.total >= 0 ? '#2563eb' : '#991b1b' }}>
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