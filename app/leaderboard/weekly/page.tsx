"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

type WeeklyUser = {
  username?: string;
  picks?: Record<number, { selection?: string; outcome?: string }>;
  total?: number;
};

export default function WeeklyLeaderboard() {
  const [week, setWeek] = useState("1"); // Default to week 1
  const [data, setData] = useState<WeeklyUser[]>([]);

  useEffect(() => {
    fetch(`/api/get-weekly-results?week=${week}`)
      .then(res => res.json())
      .then(resData => {
        // Ensure we always set an array even if the API returns an error object
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
    <div style={{ padding: '40px 20px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "900",
              letterSpacing: "-2px",
              margin: "0",
              fontFamily: "system-ui, sans-serif"
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
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#0f172a', textDecoration: 'none', borderBottom: '2px solid #2563eb' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#64748b', textDecoration: 'none' }}>SEASON</Link>
        </nav>

        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '32px', marginBottom: '10px' }}>WEEKLY RECAP</h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <select 
              value={week} 
              onChange={(e) => setWeek(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
            >
              {[...Array(14)].map((_, i) => (
                <option key={i+1} value={i+1}>Week {i+1}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '20px' }}>USER</th>
                {[5, 4, 3, 2, 1].map(num => <th key={num} style={{ padding: '20px', textAlign: 'center' }}>{num} PT</th>)}
                <th style={{ padding: '20px', textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user: WeeklyUser, idx: number) => (
                <tr key={user?.username || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '20px', fontWeight: 'bold' }}>{user?.username || 'Unknown'}</td>
                  {[5, 4, 3, 2, 1].map(num => {
                    const p = user?.picks?.[num]; // Safe optional chaining prevents crashes
                    const outcomeStyle = getStyle(p?.outcome);
                    return (
                      <td key={num} style={{ padding: '10px' }}>
                        <div style={{ 
                          ...outcomeStyle,
                          padding: '10px', 
                          borderRadius: '8px', 
                          fontSize: '10px', 
                          fontWeight: '900', 
                          textAlign: 'center',
                          textTransform: 'uppercase'
                        }}>
                          {p?.selection || '-'}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '20px', textAlign: 'right', fontWeight: '900', color: '#2563eb' }}>
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