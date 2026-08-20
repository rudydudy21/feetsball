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
    return { winner: tiedUsers[0], method: week > 1 ? `Tiebreaker (W${week})` : 'Outright' };
  }

  if (week >= maxWeek) {
    return { winner: tiedUsers.join(' & '), method: 'Split Pot' };
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
  const [loading, setLoading] = useState(true);
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

  useEffect(() => {
    setLoading(true);
    fetch('/api/get-season-results')
      .then((res) => res.json())
      .then((json) => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
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
    <div
      style={{
        background: "#F1F5F9",
        minHeight: "100vh",
        padding: "max(8px, env(safe-area-inset-top)) 8px max(14px, env(safe-area-inset-bottom))",
        color: "#0F172A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        
        {/* COMPACT BRAND HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 4px 0" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "-1px", margin: 0, lineHeight: 1 }}>
              FEETSBALL
            </h1>
            <span style={{ color: "#64748b", fontWeight: "800", fontSize: "10px", letterSpacing: "2px" }}>
              2026 CHALLENGE
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.06)', borderRadius: '999px', padding: '3px' }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>PICKS</Link>
            <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>WEEKLY</Link>
            <Link href="/leaderboard/season" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '6px 12px', fontSize: '11px', fontWeight: '800', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>SEASON</Link>
          </nav>
        </div>

        {/* SECTION HEADER */}
        <div style={{ padding: "4px 4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: "900", color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>
            Season Standings
          </span>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8" }}>
            Net Points by Week
          </span>
        </div>

        {/* WEEKLY CHAMPIONS LIST */}
        {weeklyWinners.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", paddingLeft: "4px" }}>
              Weekly Winners
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px" }}>
              {weeklyWinners.map((w) => (
                <div
                  key={w.week}
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontWeight: '900', color: '#64748B', fontSize: '11px' }}>
                    W{w.week}
                  </span>
                  <span style={{ fontWeight: '900', color: '#0F172A', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', flex: 1 }}>
                    {w.winner.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: w.status.includes('Pending') || w.status.includes('Awaiting') ? '#D97706' : '#166534',
                    backgroundColor: w.status.includes('Pending') || w.status.includes('Awaiting') ? '#FEF3C7' : '#DCFCE7',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    flexShrink: 0,
                  }}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEASON GRID CARD */}
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "14px" }}>
            Loading season standings...
          </div>
        ) : data.length === 0 ? (
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "24px 16px",
            textAlign: "center",
            color: "#64748b",
            fontWeight: "700",
            fontSize: "13px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)",
          }}>
            No season data recorded yet.
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
            border: '1px solid #E2E8F0',
            WebkitOverflowScrolling: 'touch',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '580px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2, fontSize: '10px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                    User
                  </th>
                  {weeks.map((w) => (
                    <th key={w} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '900', color: '#64748B' }}>
                      W{w}
                    </th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#F1F5F9', fontWeight: '900', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F172A', position: 'sticky', right: 0, zIndex: 2 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: UserData, idx: number) => (
                  <tr key={user.username} style={{ borderBottom: idx === data.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: '900', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap', color: '#0F172A', fontSize: '13px' }}>
                      {user.username}
                    </td>
                    {weeks.map((w) => {
                      const score = user.weeks[w] || 0;
                      return (
                        <td
                          key={w}
                          style={{
                            padding: '6px 4px',
                            textAlign: 'center',
                            color: score > 0 ? '#166534' : score < 0 ? '#DC2626' : '#CBD5E1',
                            fontWeight: score !== 0 ? '900' : 'normal',
                            fontSize: '12px',
                          }}
                        >
                          {score !== 0 ? score : '-'}
                        </td>
                      );
                    })}
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: '900',
                      backgroundColor: '#F8FAFC',
                      color: user.total >= 0 ? '#2563EB' : '#DC2626',
                      fontSize: '13px',
                      position: 'sticky',
                      right: 0,
                      zIndex: 1,
                    }}>
                      {user.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}