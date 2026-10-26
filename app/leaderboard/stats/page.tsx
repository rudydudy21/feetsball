"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SeasonPlayer = {
  username: string;
  weeks: Record<number, number>;
  weekStatus?: Record<number, 'played' | 'bye' | 'penalty'>;
  total: number;
};

type Pick = { selection?: string; outcome?: string };
type PlayerWeek = { players: Record<string, Record<number, Pick>>; picksHidden: boolean };

const weeks = Array.from({ length: 14 }, (_, index) => index + 1);
const wagerSlots = [5, 4, 3, 2, 1];

export default function PlayerStats() {
  const [players, setPlayers] = useState<SeasonPlayer[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [playerWeeks, setPlayerWeeks] = useState<Record<number, PlayerWeek>>({});
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError('');

      try {
        const seasonResponse = await fetch('/api/get-season-results');
        if (!seasonResponse.ok) throw new Error('Unable to load season results.');

        const seasonResults = await seasonResponse.json();
        if (seasonResults?.error) throw new Error('Unable to load season results.');
        const seasonPlayers: SeasonPlayer[] = (Array.isArray(seasonResults)
          ? seasonResults
          : Array.isArray(seasonResults?.data)
            ? seasonResults.data
            : []).sort((a: SeasonPlayer, b: SeasonPlayer) =>
              a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
            );
        const seasonCurrentWeek = Number(seasonResults?.currentWeek) || 1;
        const weeklyStats: Record<number, PlayerWeek> = seasonResults?.weeklyPicks ?? {};

        if (cancelled) return;
        setPlayers(seasonPlayers);
        setCurrentWeek(seasonCurrentWeek);
        setSelectedUsername((previous) =>
          seasonPlayers.some((player) => player.username === previous)
            ? previous
            : seasonPlayers[0]?.username ?? ''
        );
        setPlayerWeeks(weeklyStats);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load player stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.username === selectedUsername),
    [players, selectedUsername]
  );
  const playedWeeks = selectedPlayer
    ? Object.values(selectedPlayer.weekStatus ?? {}).filter((status) => status === 'played').length
    : 0;
  const visibleWeeks = weeks.filter((week) => week <= currentWeek);

  const getStyle = (outcome?: string) => {
    if (outcome === 'correct') return { backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' };
    if (outcome === 'incorrect') return { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' };
    if (outcome === 'live' || outcome === 'in_progress') return { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
    if (outcome === 'push') return { backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
    return { backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' };
  };

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
      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
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
            <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '5px 8px', fontSize: '10.5px', fontWeight: '800' }}>SEASON</Link>
            <Link href="/leaderboard/stats" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '5px 8px', fontSize: '10.5px', fontWeight: '800', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>STATS</Link>
          </nav>
        </div>

        <div style={{ padding: "2px 2px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: '8px' }}>
          <span style={{ fontSize: "11px", fontWeight: "900", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Player Stats
          </span>
          <select
            aria-label="Select player"
            value={selectedUsername}
            onChange={(event) => setSelectedUsername(event.target.value)}
            disabled={players.length === 0}
            style={{
              padding: '5px 8px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontWeight: '800',
              fontSize: '11px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              maxWidth: '150px',
            }}
          >
            {players.map((player) => (
              <option key={player.username} value={player.username}>{player.username}</option>
            ))}
          </select>
        </div>

        {selectedPlayer && !loading && !error && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ color: '#64748B', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Season points</div>
              <div style={{ color: selectedPlayer.total >= 0 ? '#2563EB' : '#DC2626', fontSize: '16px', fontWeight: '900', fontVariantNumeric: 'tabular-nums' }}>{selectedPlayer.total}</div>
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ color: '#64748B', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Weeks played</div>
              <div style={{ color: '#0F172A', fontSize: '16px', fontWeight: '900', fontVariantNumeric: 'tabular-nums' }}>{playedWeeks}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "13px" }}>
            Loading player stats...
          </div>
        ) : error ? (
          <div role="alert" style={{ background: '#FFFFFF', border: '1px solid #FECACA', borderRadius: '14px', padding: '20px 14px', textAlign: 'center', color: '#991B1B', fontWeight: '700', fontSize: '12px' }}>
            {error}
          </div>
        ) : players.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '20px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '12px', border: '1px solid #E2E8F0' }}>
            No player stats recorded yet.
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', minWidth: '340px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '7px 6px 7px 8px', fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2 }}>
                    Week
                  </th>
                  <th style={{ padding: '7px 4px', textAlign: 'center', fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B' }}>
                    Pts
                  </th>
                  {wagerSlots.map((wager) => (
                    <th key={wager} style={{ padding: '7px 2px', textAlign: 'center', fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B' }}>
                      {wager}pt
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleWeeks.map((week, index) => {
                  const weekResult = playerWeeks[week];
                  const playerPicks = weekResult?.players[selectedUsername] ?? {};
                  const status = selectedPlayer?.weekStatus?.[week];
                  const score = selectedPlayer?.weeks?.[week];

                  return (
                    <tr key={week} style={{ borderBottom: index === visibleWeeks.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 6px 6px 8px', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '11.5px' }}>Week {week}</span>
                        {status === 'bye' && (
                          <span style={{ marginLeft: '4px', color: '#64748B', fontSize: '8px', fontWeight: '900' }}>BYE</span>
                        )}
                        {status === 'penalty' && (
                          <span style={{ marginLeft: '4px', color: '#DC2626', fontSize: '8px', fontWeight: '900' }}>PENALTY</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '900', color: (score ?? 0) > 0 ? '#166534' : (score ?? 0) < 0 ? '#DC2626' : '#94A3B8', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {score ?? (status === 'played' ? 0 : '-')}
                      </td>
                      {wagerSlots.map((wager) => {
                        const pick = playerPicks[wager];
                        return (
                          <td key={wager} style={{ padding: '3px 2px' }}>
                            <div style={{
                              ...getStyle(pick?.outcome),
                              padding: '3px 2px',
                              borderRadius: '5px',
                              fontSize: '9px',
                              fontWeight: '800',
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '52px',
                              margin: '0 auto',
                              letterSpacing: '-0.3px',
                            }}>
                              {weekResult?.picksHidden ? 'Locked' : pick?.selection || '-'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
