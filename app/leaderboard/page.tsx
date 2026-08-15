"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

type LeaderboardPlayer = { username: string; score: number };

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardPlayer[]>([]);

  useEffect(() => {
    fetch('/api/get-leaderboard').then(res => res.json()).then(setData);
  }, []);

  return (
    <div style={{ background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)', minHeight: '100vh', padding: 'max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: '430px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontWeight: '900', fontSize: 'clamp(1.9rem, 7vw, 3rem)', letterSpacing: '-2px', margin: '0', lineHeight: 1, color: '#0f172a' }}>FEETSBALL</h1>
          <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '10px', letterSpacing: '3px', margin: '5px 0 0' }}>2026 CHALLENGE</p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>SEASON</Link>
        </nav>

        <h2 style={{ textAlign: 'center', fontWeight: '900', fontSize: '26px', margin: '0' }}>STANDINGS</h2>

        <div style={{ backgroundColor: '#fff', borderRadius: '22px', padding: '8px', boxShadow: '0 10px 24px rgba(15,23,42,0.05)', border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden' }}>
          {data.map((player: LeaderboardPlayer, index: number) => (
            <div key={player.username} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 12px',
              borderBottom: index === data.length - 1 ? 'none' : '1px solid #f1f5f9',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: '900', color: '#94a3b8', width: '22px', textAlign: 'center', fontSize: '12px' }}>{index + 1}</span>
                <span style={{ fontWeight: '800', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.username}</span>
              </div>
              <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontWeight: '900', fontSize: '12px', flexShrink: 0 }}>
                {player.score} pts
              </span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', paddingTop: '4px' }}>
          <Link href="/" style={{ color: '#2563eb', fontWeight: '800', textDecoration: 'none', fontSize: '14px' }}>← Back to Picks</Link>
        </div>
      </div>
    </div>
  );
}