"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

type WeeklyUser = {
  username?: string;
  picks?: Record<number, { selection?: string; outcome?: string }>;
  total?: number;
};

export default function WeeklyLeaderboard() {
  const [week, setWeek] = useState("1");
  const [data, setData] = useState<WeeklyUser[]>([]);

  useEffect(() => {
    fetch(`/api/get-weekly-results?week=${week}`)
      .then(res => res.json())
      .then(resData => {
        setData(Array.isArray(resData) ? resData : []);
      })
      .catch(() => setData([]));
  }, [week]);

  const getStyle = (outcome?: string) => {
    if (outcome === 'correct') return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    if (outcome === 'incorrect') return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
    return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
  };

  return (
    <div style={{ padding: 'max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.9rem, 7vw, 3rem)', fontWeight: '900', letterSpacing: '-2px', margin: '0', lineHeight: 1, color: '#0f172a' }}>FEETSBALL</h1>
          <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '10px', letterSpacing: '3px', margin: '5px 0 0' }}>2026 CHALLENGE</p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '7px 12px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>SEASON</Link>
        </nav>

        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '26px', margin: '0 0 10px' }}>WEEKLY RECAP</h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: '800', backgroundColor: '#fff', color: '#0f172a', minWidth: '130px' }}
            >
              {[...Array(14)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '18px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>User</th>
                {[5, 4, 3, 2, 1].map(num => <th key={num} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>{num}</th>)}
                <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user: WeeklyUser, idx: number) => (
                <tr key={user?.username || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: '800', color: '#0f172a' }}>{user?.username || 'Unknown'}</td>
                  {[5, 4, 3, 2, 1].map(num => {
                    const p = user?.picks?.[num];
                    const outcomeStyle = getStyle(p?.outcome);
                    return (
                      <td key={num} style={{ padding: '8px 6px' }}>
                        <div style={{
                          ...outcomeStyle,
                          padding: '8px 6px',
                          borderRadius: '8px',
                          fontSize: '9px',
                          fontWeight: '900',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {p?.selection || '-'}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#2563eb' }}>
                    {user?.total ?? 0}
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