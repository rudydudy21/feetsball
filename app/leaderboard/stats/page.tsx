"use client";
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';

type SeasonPlayer = {
  username: string;
  weeks: Record<number, number>;
  weekStatus?: Record<number, 'played' | 'bye' | 'penalty'>;
  total: number;
};

type Pick = { selection?: string; outcome?: string; side?: 'favorite' | 'dog' | null };
type PlayerWeek = { players: Record<string, Record<number, Pick>>; picksHidden: boolean };
type WeightPerformance = {
  wins: number;
  losses: number;
  netPoints: number;
  dogWins: number;
  dogLosses: number;
  dogNetPoints: number;
  favoriteWins: number;
  favoriteLosses: number;
  favoriteNetPoints: number;
};
type TeamPerformance = { team: string; selections: number; wins: number; losses: number; netPoints: number };

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
  const weightPerformance = useMemo(() => {
    const performance: Record<number, WeightPerformance> = Object.fromEntries(
      wagerSlots.map((weight) => [
        weight,
        {
          wins: 0,
          losses: 0,
          netPoints: 0,
          dogWins: 0,
          dogLosses: 0,
          dogNetPoints: 0,
          favoriteWins: 0,
          favoriteLosses: 0,
          favoriteNetPoints: 0,
        },
      ])
    );

    for (const week of visibleWeeks) {
      const picks = playerWeeks[week]?.players[selectedUsername] ?? {};
      for (const weight of wagerSlots) {
        const outcome = picks[weight]?.outcome;
        const side = picks[weight]?.side;
        if (outcome === 'correct') {
          performance[weight].wins++;
          performance[weight].netPoints += weight;
          if (side === 'dog') {
            performance[weight].dogWins++;
            performance[weight].dogNetPoints += weight;
          } else if (side === 'favorite') {
            performance[weight].favoriteWins++;
            performance[weight].favoriteNetPoints += weight;
          }
        } else if (outcome === 'incorrect') {
          performance[weight].losses++;
          performance[weight].netPoints -= weight;
          if (side === 'dog') {
            performance[weight].dogLosses++;
            performance[weight].dogNetPoints -= weight;
          } else if (side === 'favorite') {
            performance[weight].favoriteLosses++;
            performance[weight].favoriteNetPoints -= weight;
          }
        }
      }
    }

    return performance;
  }, [playerWeeks, selectedUsername, visibleWeeks]);
  const totalWeightPerformance = useMemo(
    () => wagerSlots.reduce<WeightPerformance>((total, weight) => {
      const result = weightPerformance[weight];
      total.wins += result.wins;
      total.losses += result.losses;
      total.netPoints += result.netPoints;
      total.dogWins += result.dogWins;
      total.dogLosses += result.dogLosses;
      total.dogNetPoints += result.dogNetPoints;
      total.favoriteWins += result.favoriteWins;
      total.favoriteLosses += result.favoriteLosses;
      total.favoriteNetPoints += result.favoriteNetPoints;
      return total;
    }, {
      wins: 0,
      losses: 0,
      netPoints: 0,
      dogWins: 0,
      dogLosses: 0,
      dogNetPoints: 0,
      favoriteWins: 0,
      favoriteLosses: 0,
      favoriteNetPoints: 0,
    }),
    [weightPerformance]
  );
  const weightColumns = [
    ...wagerSlots.map((weight) => ({ label: `${weight}pt`, performance: weightPerformance[weight], isTotal: false })),
    { label: 'Total', performance: totalWeightPerformance, isTotal: true },
  ];
  const weightPerformanceGroups: Array<{
    label: string;
    rows: Array<{
      label: string;
      value: (performance: WeightPerformance) => string;
      netPoints?: (performance: WeightPerformance) => number;
    }>;
  }> = [
    {
      label: 'All Picks',
      rows: [
        { label: 'W/L', value: (performance) => `${performance.wins}-${performance.losses}` },
        { label: 'Net Points', value: (performance) => String(performance.netPoints), netPoints: (performance) => performance.netPoints },
      ],
    },
    {
      label: 'Dogs',
      rows: [
        { label: 'W/L', value: (performance) => `${performance.dogWins}-${performance.dogLosses}` },
        { label: 'Net Points', value: (performance) => String(performance.dogNetPoints), netPoints: (performance) => performance.dogNetPoints },
      ],
    },
    {
      label: 'Favorites',
      rows: [
        { label: 'W/L', value: (performance) => `${performance.favoriteWins}-${performance.favoriteLosses}` },
        { label: 'Net Points', value: (performance) => String(performance.favoriteNetPoints), netPoints: (performance) => performance.favoriteNetPoints },
      ],
    },
  ];
  const teamPerformance = useMemo(() => {
    const performance = new Map<string, TeamPerformance>();

    for (const week of visibleWeeks) {
      const picks = playerWeeks[week]?.players[selectedUsername] ?? {};
      for (const weight of wagerSlots) {
        const pick = picks[weight];
        const team = pick?.selection?.trim();
        if (!team) continue;

        const key = team.toLocaleLowerCase();
        const result = performance.get(key) ?? { team, selections: 0, wins: 0, losses: 0, netPoints: 0 };
        result.selections++;
        if (pick.outcome === 'correct') {
          result.wins++;
          result.netPoints += weight;
        } else if (pick.outcome === 'incorrect') {
          result.losses++;
          result.netPoints -= weight;
        }
        performance.set(key, result);
      }
    }

    return Array.from(performance.values()).sort((a, b) =>
      b.selections - a.selections ||
      b.netPoints - a.netPoints ||
      a.team.localeCompare(b.team, undefined, { sensitivity: 'base' })
    );
  }, [playerWeeks, selectedUsername, visibleWeeks]);

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
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ width: '92px', padding: '7px 3px 7px 6px', fontSize: '9px', fontWeight: '900', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#64748B', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2 }}>
                    Week
                  </th>
                  <th style={{ width: '34px', padding: '7px 1px', textAlign: 'center', fontSize: '9px', fontWeight: '900', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#64748B' }}>
                    Pts
                  </th>
                  {wagerSlots.map((wager) => (
                    <th key={wager} style={{ padding: '7px 1px', textAlign: 'center', fontSize: '8.5px', fontWeight: '900', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#64748B' }}>
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
                      <td style={{ padding: '6px 3px 6px 6px', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '11.5px' }}>Week {week}</span>
                        {status === 'bye' && (
                          <span style={{ marginLeft: '2px', color: '#64748B', fontSize: '7px', fontWeight: '900' }}>BYE</span>
                        )}
                        {status === 'penalty' && (
                          <span style={{ marginLeft: '2px', color: '#DC2626', fontSize: '7px', fontWeight: '900' }}>PENALTY</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 1px', textAlign: 'center', fontWeight: '900', color: (score ?? 0) > 0 ? '#166534' : (score ?? 0) < 0 ? '#DC2626' : '#94A3B8', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
                        {score ?? (status === 'played' ? 0 : '-')}
                      </td>
                      {wagerSlots.map((wager) => {
                        const pick = playerPicks[wager];
                        return (
                          <td key={wager} style={{ padding: '3px 1px' }}>
                            <div style={{
                              ...getStyle(pick?.outcome),
                              padding: '3px 2px',
                              borderRadius: '5px',
                              fontSize: '8px',
                              fontWeight: '800',
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
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

        {selectedPlayer && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', paddingLeft: '2px' }}>
              Weight Performance
            </span>
            <div style={{
              overflowX: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
              border: '1px solid #E2E8F0',
              WebkitOverflowScrolling: 'touch',
            }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ width: '76px', padding: '7px 3px 7px 6px', fontSize: '8.5px', fontWeight: '900', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#64748B', position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2 }}>Stats</th>
                    {weightColumns.map((column) => (
                      <th key={column.label} style={{ padding: '7px 1px', textAlign: 'center', fontSize: '8px', fontWeight: '900', letterSpacing: '0', textTransform: 'uppercase', color: column.isTotal ? '#0F172A' : '#64748B', backgroundColor: column.isTotal ? '#F1F5F9' : undefined, position: column.isTotal ? 'sticky' : undefined, right: column.isTotal ? 0 : undefined, zIndex: column.isTotal ? 2 : undefined }}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weightPerformanceGroups.map((group) => (
                    <Fragment key={group.label}>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th
                          colSpan={weightColumns.length + 1}
                          scope="rowgroup"
                          style={{ padding: '5px 8px', textAlign: 'left', color: '#64748B', fontSize: '9px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                        >
                          {group.label}
                        </th>
                      </tr>
                      {group.rows.map((row, index) => (
                        <tr key={row.label} style={{ borderBottom: index === group.rows.length - 1 ? '1px solid #E2E8F0' : '1px solid #F1F5F9' }}>
                          <td style={{ padding: '6px 3px 6px 6px', fontSize: '10px', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#FFFFFF', zIndex: 1 }}>{row.label}</td>
                          {weightColumns.map((column) => {
                            const points = row.netPoints?.(column.performance);
                            return (
                              <td key={column.label} style={{
                                padding: '6px 1px',
                                textAlign: 'center',
                                fontWeight: points === undefined ? '800' : '900',
                                fontSize: '10px',
                                color: points === undefined ? '#0F172A' : points > 0 ? '#166534' : points < 0 ? '#DC2626' : '#94A3B8',
                                backgroundColor: column.isTotal ? '#F8FAFC' : undefined,
                                position: column.isTotal ? 'sticky' : undefined,
                                right: column.isTotal ? 0 : undefined,
                                zIndex: column.isTotal ? 1 : undefined,
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {points !== undefined && points > 0 ? `+${points}` : row.value(column.performance)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedPlayer && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', paddingLeft: '2px' }}>
              Team Preference
            </span>
            <div style={{
              overflowX: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
              border: '1px solid #E2E8F0',
              WebkitOverflowScrolling: 'touch',
            }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ width: '48%', padding: '7px 3px 7px 6px', fontSize: '8.5px', fontWeight: '900', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#64748B' }}>Team</th>
                    <th style={{ width: '15%', padding: '7px 1px', textAlign: 'center', fontSize: '8px', fontWeight: '900', letterSpacing: '0', textTransform: 'uppercase', color: '#64748B' }}>Picks</th>
                    <th style={{ width: '15%', padding: '7px 1px', textAlign: 'center', fontSize: '8px', fontWeight: '900', letterSpacing: '0', textTransform: 'uppercase', color: '#64748B' }}>W/L</th>
                    <th style={{ width: '22%', padding: '7px 6px 7px 1px', textAlign: 'right', fontSize: '8px', fontWeight: '900', letterSpacing: '0', textTransform: 'uppercase', color: '#64748B' }}>Net Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((result, index) => (
                    <tr key={result.team} style={{ borderBottom: index === teamPerformance.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 3px 6px 6px', fontWeight: '800', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.team}</td>
                      <td style={{ padding: '6px 1px', textAlign: 'center', fontWeight: '800', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{result.selections}</td>
                      <td style={{ padding: '6px 1px', textAlign: 'center', fontWeight: '800', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{result.wins}-{result.losses}</td>
                      <td style={{ padding: '6px 6px 6px 1px', textAlign: 'right', fontWeight: '900', color: result.netPoints > 0 ? '#166534' : result.netPoints < 0 ? '#DC2626' : '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                        {result.netPoints > 0 ? `+${result.netPoints}` : result.netPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
