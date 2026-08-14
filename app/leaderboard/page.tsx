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
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '32px', marginBottom: '40px' }}>STANDINGS</h1>
        
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {data.map((player: LeaderboardPlayer, index: number) => (
            <div key={player.username} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '20px', 
              borderBottom: index === data.length - 1 ? 'none' : '1px solid #f1f5f9',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontWeight: '900', color: '#94a3b8', width: '25px' }}>{index + 1}</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{player.username}</span>
              </div>
              <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 15px', borderRadius: '10px', fontWeight: '900' }}>
                {player.score} pts
              </span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link href="/" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>← Back to Picks</Link>
        </div>
      </div>
    </div>
  );
}