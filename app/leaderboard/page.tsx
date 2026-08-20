"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

type LeaderboardPlayer = { username: string; score: number };

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/get-leaderboard')
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
      <div style={{ maxWidth: "440px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        
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
            <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>SEASON</Link>
          </nav>
        </div>

        {/* SECTION HEADER */}
        <div style={{ padding: "4px 4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: "900", color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>
            Overall Standings
          </span>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8" }}>
            {data.length} Players
          </span>
        </div>

        {/* STANDINGS CARD */}
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "14px" }}>
            Loading standings...
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
            No standings data available yet.
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '4px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden'
          }}>
            {data.map((player: LeaderboardPlayer, index: number) => (
              <div
                key={player.username}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: index === data.length - 1 ? 'none' : '1px solid #F1F5F9',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontWeight: '900',
                    color: index === 0 ? '#B45309' : index === 1 ? '#475569' : index === 2 ? '#B45309' : '#94A3B8',
                    width: '24px',
                    textAlign: 'center',
                    fontSize: '11px',
                    backgroundColor: index < 3 ? '#F8FAFC' : 'transparent',
                    padding: '2px 0',
                    borderRadius: '6px',
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ fontWeight: '900', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.username}
                  </span>
                </div>
                <span style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontWeight: '900',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {player.score} pts
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}