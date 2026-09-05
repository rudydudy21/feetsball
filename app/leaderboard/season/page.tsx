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
  const [archivedWeeks, setArchivedWeeks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

  useEffect(() => {
    setLoading(true);
    fetch('/api/get-season-results')
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
          setArchivedWeeks([]);
        } else if (json && Array.isArray(json.data)) {
          setData(json.data);
          setArchivedWeeks(Array.isArray(json.archivedWeeks) ? json.archivedWeeks : []);
        } else {
          setData([]);
          setArchivedWeeks([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setArchivedWeeks([]);
        setLoading(false);
      });
  }, []);

  const ranks = useMemo(() => {
    let currentRank = 1;
    return data.map((user, idx) => {
      if (idx > 0 && user.total < data[idx - 1].total) {
        currentRank = idx + 1;
      }
      return currentRank;
    });
  }, [data]);

  const weeklyWinners = useMemo(() => {
    if (!data.length) return [];

    return weeks.map(w => {
      const isArchived = archivedWeeks.includes(w);

      if (!isArchived) {
        const hasScores = data.some(user => (user.weeks[w] || 0) !== 0);
        if (hasScores) {
          return {
            week: w,
            winner: 'TBD',
            status: 'Live',
          };
        }
        return {
          week: w,
          winner: 'TBD',
          status: 'Upcoming',
        };
      }

      const scoresForWeek = data.map(user => ({
        username: user.username,
        points: user.weeks[w] || 0
      }));

      const maxScore = Math.max(...scoresForWeek.map(s => s.points));
      const leaders = scoresForWeek.filter(s => s.points === maxScore).map(l => l.username);

      if (leaders.length === 0) {
        return { week: w, winner: 'TBD', status: 'Upcoming' };
      }

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
  }, [data, weeks, archivedWeeks]);

  return (
    <div
      style={{
        background: "#F1F5F9",
        minHeight: "100vh",
        padding: "max(6px, env(safe-area-inset-top)) 6px max(12px, env(safe-area-inset-bottom))",
        color: "#0F172A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.01em",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>

        {/* COMPACT BRAND HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px 0" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.8px", margin: 0, lineHeight: 1 }}>
              FEETSBALL
            </h1>
            <span style={{ color: "#64748b", fontWeight: "800", fontSize: "9.5px", letterSpacing: "1.5px" }}>
              2026 CHALLENGE
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '3px', background: 'rgba(15,23,42,0.06)', borderRadius: '999px', padding: '2px' }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '5px 8px', fontSize: '10.5px', fontWeight: '800' }}>PICKS</Link>
            <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '5px 8px', fontSize: '10.5px', fontWeight: '800' }}>WEEKLY</Link>
            <Link href="/leaderboard/season" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '5px 10px', fontSize: '10.5px', fontWeight: '800', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>SEASON</Link>
          </nav>
        </div>

        {/* SECTION HEADER */}
        <div style={{ padding: "2px 2px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "900", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Season Standings
          </span>
          <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8" }}>
            Net Points by Week
          </span>
        </div>

        {/* WEEKLY CHAMPIONS LIST */}
        {weeklyWinners.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", paddingLeft: "2px" }}>
              Weekly Champions
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "6px" }}>
              {weeklyWinners.map((w) => (
                <div
                  key={w.week}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "10px",
                    padding: "6px 8px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b" }}>
                    W{w.week}
                  </span>
                  <span style={{
                    fontSize: "11.5px",
                    fontWeight: "800",
                    color: "#0F172A",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "75px",
                  }}>
                    {w.winner}
                  </span>
                  <span style={{
                    fontSize: '8.5px',
                    fontWeight: '800',
                    color: w.status === 'Live' || w.status.includes('Pending') || w.status.includes('Awaiting') ? '#D97706' : '#166534',
                    backgroundColor: w.status === 'Live' || w.status.includes('Pending') || w.status.includes('Awaiting') ? '#FEF3C7' : '#DCFCE7',
                    padding: '2px 5px',
                    borderRadius: '4px',
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
          <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "13px" }}>
            Loading season standings...
          </div>
        ) : data.length === 0 ? (
          <div style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 14px",
            textAlign: "center",
            color: "#64748b",
            fontWeight: "700",
            fontSize: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)",
          }}>
            No season data recorded yet.
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
            border: '1px solid #E2E8F0',
            WebkitOverflowScrolling: 'touch',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '440px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '7px 6px 7px 8px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2, fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B' }}>
                    # &nbsp; User
                  </th>
                  {weeks.map((w) => (
                    <th key={w} style={{ padding: '7px 2px', textAlign: 'center', fontSize: '9.5px', fontWeight: '900', color: '#64748B' }}>
                      W{w}
                    </th>
                  ))}
                  <th style={{ padding: '7px 8px', textAlign: 'right', backgroundColor: '#F1F5F9', fontWeight: '900', fontSize: '9.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#0F172A', position: 'sticky', right: 0, zIndex: 2 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: UserData, idx: number) => (
                  <tr key={user.username} style={{ borderBottom: idx === data.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '6px 6px 6px 8px', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '900',
                          color: ranks[idx] === 1 ? '#B45309' : ranks[idx] === 2 ? '#475569' : ranks[idx] === 3 ? '#92400E' : '#94A3B8',
                          backgroundColor: ranks[idx] === 1 ? '#FEF3C7' : ranks[idx] === 2 ? '#F1F5F9' : ranks[idx] === 3 ? '#FEF3C7' : 'transparent',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          minWidth: '18px',
                          textAlign: 'center',
                          display: 'inline-block',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          #{ranks[idx]}
                        </span>
                        <span style={{
                          fontWeight: '800',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          maxWidth: '85px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          letterSpacing: '-0.2px',
                        }}>
                          {user.username}
                        </span>
                      </div>
                    </td>
                    {weeks.map((w) => {
                      const score = user.weeks[w] || 0;
                      return (
                        <td
                          key={w}
                          style={{
                            padding: '5px 2px',
                            textAlign: 'center',
                            color: score > 0 ? '#166534' : score < 0 ? '#DC2626' : '#CBD5E1',
                            fontWeight: score !== 0 ? '800' : 'normal',
                            fontSize: '11px',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {score !== 0 ? score : '-'}
                        </td>
                      );
                    })}
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: '900',
                      backgroundColor: '#F8FAFC',
                      color: user.total >= 0 ? '#2563EB' : '#DC2626',
                      fontSize: '12px',
                      position: 'sticky',
                      right: 0,
                      zIndex: 1,
                      fontVariantNumeric: 'tabular-nums',
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