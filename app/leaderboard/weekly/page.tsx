"use client";
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

type WeeklyUser = {
  username?: string;
  picks?: Record<number, { selection?: string; outcome?: string }>;
  total?: number;
};

export default function WeeklyLeaderboard() {
  const [week, setWeek] = useState("1");
  const [data, setData] = useState<WeeklyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [picksHidden, setPicksHidden] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPicksHidden(false);
    setIsArchived(false);
    fetch(`/api/get-weekly-results?week=${week}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData && !Array.isArray(resData) && resData.picksHidden) {
          setPicksHidden(true);
          setData([]);
          setIsArchived(false);
        } else if (Array.isArray(resData)) {
          setPicksHidden(false);
          setData(resData);
          setIsArchived(false);
        } else if (resData && Array.isArray(resData.data)) {
          setPicksHidden(false);
          setData(resData.data);
          setIsArchived(Boolean(resData.isArchived));
        } else {
          setPicksHidden(false);
          setData([]);
          setIsArchived(false);
        }
        setLoading(false);
      })
      .catch(() => {
        setPicksHidden(false);
        setData([]);
        setIsArchived(false);
        setLoading(false);
      });
  }, [week]);

  const ranks = useMemo(() => {
    let currentRank = 1;
    return data.map((user, idx) => {
      if (idx > 0 && (user.total ?? 0) < (data[idx - 1].total ?? 0)) {
        currentRank = idx + 1;
      }
      return currentRank;
    });
  }, [data]);

  const getStyle = (outcome?: string) => {
    if (outcome === 'correct') return { backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' };
    if (outcome === 'incorrect') return { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' };
    return { backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' };
  };

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
      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        
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
            <Link href="/leaderboard/weekly" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '6px 12px', fontSize: '11px', fontWeight: '800', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>WEEKLY</Link>
            <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>SEASON</Link>
          </nav>
        </div>

        {/* SECTION HEADER & WEEK SELECTOR */}
        <div style={{ padding: "4px 4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: "12px", fontWeight: "900", color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>
              Weekly Recap
            </span>
            {!loading && !picksHidden && data.length > 0 && (
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: isArchived ? '#DCFCE7' : '#FEF3C7',
                color: isArchived ? '#166534' : '#D97706',
              }}>
                {isArchived ? '✓ Final' : '⚡ Live'}
              </span>
            )}
          </div>

          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontWeight: '800',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            {[...Array(14)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
        </div>

        {/* TABLE CARD */}
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "14px" }}>
            Loading Week {week} results...
          </div>
        ) : picksHidden ? (
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "36px 20px",
            textAlign: "center",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔒</div>
            <div style={{ fontSize: "15px", fontWeight: "900", color: "#0F172A", marginBottom: "4px" }}>
              Picks Locked & Hidden
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", maxWidth: "340px", margin: "0 auto" }}>
              Everyone&apos;s picks for Week {week} will be revealed after 12:00 PM ET on Saturday.
            </div>
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
            No picks or scores recorded for Week {week}.
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '420px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2 }}>
                    # &nbsp; User
                  </th>
                  {[5, 4, 3, 2, 1].map((num) => (
                    <th key={num} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                      {num}pt
                    </th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: WeeklyUser, idx: number) => (
                  <tr key={user?.username || idx} style={{ borderBottom: idx === data.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '900',
                          color: ranks[idx] === 1 ? '#B45309' : ranks[idx] === 2 ? '#475569' : ranks[idx] === 3 ? '#92400E' : '#94A3B8',
                          backgroundColor: ranks[idx] === 1 ? '#FEF3C7' : ranks[idx] === 2 ? '#F1F5F9' : ranks[idx] === 3 ? '#FEF3C7' : 'transparent',
                          padding: '2px 5px',
                          borderRadius: '5px',
                          minWidth: '22px',
                          textAlign: 'center',
                          display: 'inline-block',
                        }}>
                          #{ranks[idx]}
                        </span>
                        <span style={{ fontWeight: '900', color: '#0F172A', fontSize: '13px' }}>
                          {user?.username || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    {[5, 4, 3, 2, 1].map((num) => {
                      const p = user?.picks?.[num];
                      const outcomeStyle = getStyle(p?.outcome);
                      return (
                        <td key={num} style={{ padding: '4px 3px' }}>
                          <div style={{
                            ...outcomeStyle,
                            padding: '4px 4px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: '900',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '70px',
                            margin: '0 auto',
                          }}>
                            {p?.selection || '-'}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: '#2563EB', fontSize: '13px' }}>
                      {user?.total ?? 0}
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