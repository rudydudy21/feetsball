"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

type PickEntry = { gameId: string; team: string; wager: number };
type SlateGame = {
  GameID: string;
  Kickoff_Time: string;
  Spread?: string | number;
  AwayTeam: string;
  AwayLogo: string;
  AwayRank?: string | number;
  HomeTeam: string;
  HomeLogo: string;
  HomeRank?: string | number;
};

const normalizeTeamName = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const normalizeGameId = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\.0$/, '')
    .replace(/^0+(?=\d)/, '');

const normalizeUsernameInput = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '');

const teamMatches = (savedTeam: string, slateTeam: string) =>
  normalizeTeamName(savedTeam) === normalizeTeamName(slateTeam);

const matchesGame = (pick: PickEntry, gameId: string) =>
  normalizeGameId(pick.gameId) === normalizeGameId(gameId);

const getEasternNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const isPastSaturdayNoonET = () => {
  const now = getEasternNow();
  const day = now.getDay();
  return (day === 6 && now.getHours() >= 12) || day === 0;
};

const isGameStarted = (kickoff: string | undefined) => {
  if (!kickoff) return false;
  const kickoffDate = new Date(kickoff);
  if (Number.isNaN(kickoffDate.getTime())) return false;
  return kickoffDate <= new Date();
};

const dedupePicks = (value: PickEntry[]) => {
  const byGameId = new Map<string, PickEntry>();

  for (const pick of value) {
    if (!pick?.gameId) continue;
    const normalizedKey = normalizeGameId(pick.gameId);
    if (!normalizedKey) continue;
    if (!byGameId.has(normalizedKey)) {
      byGameId.set(normalizedKey, pick);
    }
  }

  return [...byGameId.values()];
};

const normalizeExistingPicks = (value: unknown): PickEntry[] => {
  const unwrapArray = (candidate: unknown): unknown[] => {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const obj = candidate as Record<string, unknown>;
      for (const key of ['picks', 'data', 'result', 'items', 'records']) {
        if (Array.isArray(obj[key])) return obj[key] as unknown[];
      }
    }
    return [];
  };

  const array = unwrapArray(value);
  const byGameId = new Map<string, PickEntry>();

  for (const pick of array) {
    const candidate = pick as Record<string, unknown>;
    const gameId = String(
      candidate.GameID ??
      candidate.gameId ??
      candidate.game_id ??
      candidate.Game_Id ??
      candidate.gameID ??
      candidate.id ??
      ''
    ).trim();

    const team = String(
      candidate.Selection ??
      candidate.selection ??
      candidate.Team ??
      candidate.team ??
      candidate.SelectedTeam ??
      candidate.selectedTeam ??
      candidate.PickedTeam ??
      candidate.pickedTeam ??
      ''
    ).trim();

    const wager = Number(
      candidate.Wager ??
      candidate.wager ??
      candidate.Bet ??
      candidate.bet ??
      candidate.Amount ??
      candidate.amount ??
      0
    );

    if (!gameId || !team) continue;

    const normalized = {
      gameId,
      team,
      wager: Number.isFinite(wager) ? wager : 0,
    } satisfies PickEntry;

    const normalizedKey = normalizeGameId(gameId);
    if (!normalizedKey) continue;
    if (!byGameId.has(normalizedKey)) {
      byGameId.set(normalizedKey, normalized);
    }
  }

  return dedupePicks([...byGameId.values()]);
};

export default function Home() {
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [userInfo, setUserInfo] = useState({ username: "", pin: "" });
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Load slate
  useEffect(() => {
    fetch("/api/get-slate")
      .then((res) => res.json())
      .then((data) => {
        setGames(Array.isArray(data) ? (data as SlateGame[]) : []);
        setLoading(false);
      })
      .catch(() => {
        setGames([]);
        setLoading(false);
      });
  }, []);

  // Restore session from cookie on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { loggedIn?: boolean; username?: string; picks?: PickEntry[] }) => {
        if (data?.loggedIn && data.username) {
          setLoggedIn(true);
          setLoggedInUsername(data.username);
          if (Array.isArray(data.picks) && data.picks.length > 0) {
            setPicks(dedupePicks(normalizeExistingPicks(data.picks)).slice(0, 5));
          }
        }
      })
      .catch(() => {});
  }, []);


  const handleSelect = (gameId: string, team: string) => {
    setPicks((currentPicks) => {
      const deduped = dedupePicks(currentPicks);
      const existingIndex = deduped.findIndex((p) => matchesGame(p, gameId));

      if (existingIndex >= 0) {
        const existing = deduped[existingIndex];
        if (teamMatches(existing.team, team)) {
          return deduped.filter((p) => !matchesGame(p, gameId));
        }

        return deduped.map((p, index) =>
          index === existingIndex ? { ...p, team, wager: p.wager || 0 } : p,
        );
      }

      if (deduped.length >= 5) {
        return deduped;
      }

      return [...deduped, { gameId, team, wager: 0 }];
    });
  };

  const handleWager = (gameId: string, wager: number) => {
    setPicks((currentPicks) => {
      const deduped = dedupePicks(currentPicks);
      const targetIndex = deduped.findIndex((pick) => matchesGame(pick, gameId));
      if (targetIndex === -1) return deduped;

      const targetPick = deduped[targetIndex];
      if (targetPick.wager === wager) {
        return deduped.map((pick, index) =>
          index === targetIndex ? { ...pick, wager: 0 } : pick,
        );
      }

      // Check if another pick is already using this wager
      const isWagerTaken = deduped.some(
        (pick, index) => index !== targetIndex && pick.wager === wager && pick.wager > 0
      );

      if (isWagerTaken) {
        // Do nothing - require user to "unclick" the other one first
        return deduped;
      }

      return deduped.map((pick, index) =>
        index === targetIndex ? { ...pick, wager } : pick,
      );
    });
  };

  const clearLoadedPicks = () => setPicks([]);

  const handleLogin = async () => {
    const username = normalizeUsernameInput(userInfo.username);
    const pin = userInfo.pin.trim();

    if (!username || pin.length !== 4) {
      alert('Please enter a valid username and 4-digit PIN.');
      return;
    }

    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('❌ ' + ((err as { error?: string }).error || 'Could not log in. Check your username and PIN.'));
        return;
      }

      const data = await res.json() as { username: string; picks: PickEntry[] };
      setLoggedIn(true);
      setLoggedInUsername(data.username);
      setUserInfo({ username: "", pin: "" });

      const normalized = dedupePicks(normalizeExistingPicks(data.picks)).slice(0, 5);
      setPicks(normalized);
    } catch {
      alert('❌ Could not reach the server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setLoggedIn(false);
    setLoggedInUsername("");
    setPicks([]);
    setUserInfo({ username: "", pin: "" });
  };


  const handleSubmit = async () => {
    if (isPastSaturdayNoonET()) {
      alert('⏰ Submissions closed after noon ET on Saturday.');
      return;
    }

    if (picks.length < 1 || picks.length > 5) {
      alert('Please select between 1 and 5 games before locking in your picks.');
      return;
    }

    const uniquePicks = dedupePicks(picks);
    if (uniquePicks.length !== picks.length) {
      setPicks(uniquePicks);
      alert('Duplicate picks were removed before submission.');
      return;
    }

    const wagerValues = picks.map((pick) => pick.wager);
    if (new Set(wagerValues).size !== wagerValues.length) {
      alert('Each wager value can only be used once across your picks.');
      return;
    }

    const sortedPicks = [...uniquePicks].sort((a, b) => b.wager - a.wager);
    const summaryLines = sortedPicks.map((pick) => {
      const game = games.find((g) => matchesGame(pick, g.GameID));
      let spreadBadge = '';
      if (game && game.Spread !== undefined && game.Spread !== null && String(game.Spread).trim() !== '') {
        const rawSpread = String(game.Spread).trim();
        const cleaned = rawSpread.replace(/[^0-9.+-]/g, '');
        const spreadNum = Number(cleaned);
        if (!Number.isNaN(spreadNum)) {
          const isAway = teamMatches(pick.team, game.AwayTeam);
          const pickSpreadVal = isAway ? spreadNum * -1 : spreadNum;
          if (pickSpreadVal > 0) spreadBadge = ` (+${pickSpreadVal})`;
          else if (pickSpreadVal === 0) spreadBadge = ' (0)';
          else spreadBadge = ` (${pickSpreadVal})`;
        } else {
          spreadBadge = ` (${rawSpread})`;
        }
      }
      const pointsLabel = pick.wager === 1 ? 'point' : 'points';
      return `${pick.wager} ${pointsLabel} - ${pick.team}${spreadBadge}`;
    });

    const summaryText = summaryLines.join('\n');

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });

      if (res.ok) {
        alert(`🏆 PICKS LOCKED IN!\n\n${summaryText}\n\nGood luck this week.`);
        setPicks([]);
      } else {
        const err = await res.json();
        if ((err as { error?: string }).error?.includes('authenticated')) {
          setLoggedIn(false);
          setLoggedInUsername("");
          alert('❌ Session expired. Please log in again.');
        } else {
          alert("❌ Error: " + ((err as { error?: string }).error || "Submission failed"));
        }
      }
    } catch {
      alert("❌ Critical Error: Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const submissionClosed = isPastSaturdayNoonET();
  const usedWagers = new Set(picks.filter((p) => p.wager > 0).map((p) => p.wager));
  const validWagerSet = picks.filter((p) => p.wager > 0).length === new Set(picks.filter((p) => p.wager > 0).map((p) => p.wager)).size;
  const readyToSubmit =
    picks.length >= 1 &&
    picks.length <= 5 &&
    picks.every((p) => p.wager > 0) &&
    validWagerSet &&
    loggedIn &&
    !submissionClosed;
  const showLoadingState = loading && games.length === 0;

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
            <Link href="/" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '6px 12px', fontSize: '11px', fontWeight: '800', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>PICKS</Link>
            <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>WEEKLY</Link>
            <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>SEASON</Link>
          </nav>
        </div>

        {/* CREDENTIALS / SESSION BAR */}
        {loggedIn ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "8px 12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
              ✓ Logged in as <span style={{ color: "#2563EB" }}>{loggedInUsername}</span>
            </span>
            <button
              onClick={() => void handleLogout()}
              style={{
                border: "1px solid #cbd5e1",
                backgroundColor: "#F8FAFC",
                color: "#64748b",
                borderRadius: "8px",
                padding: "4px 10px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
            style={{ display: "flex", gap: "6px", alignItems: "stretch", width: "100%" }}
          >
            <input
              placeholder="Username"
              value={userInfo.username}
              style={{
                flex: 2,
                minWidth: 0,
                padding: "9px 12px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontWeight: "700",
                fontSize: "14px",
                background: "#FFFFFF",
              }}
              onChange={(e) =>
                setUserInfo((prev) => ({ ...prev, username: normalizeUsernameInput(e.target.value) }))
              }
            />
            <input
              placeholder="PIN"
              type="password"
              maxLength={4}
              value={userInfo.pin}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "9px 6px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                textAlign: "center",
                fontWeight: "700",
                fontSize: "14px",
                background: "#FFFFFF",
              }}
              onChange={(e) => setUserInfo((prev) => ({ ...prev, pin: e.target.value }))}
            />
            <button
              type="submit"
              disabled={loginLoading || !userInfo.username || userInfo.pin.length !== 4}
              style={{
                padding: "0 12px",
                borderRadius: "12px",
                border: "none",
                background: !userInfo.username || userInfo.pin.length !== 4 ? "#94a3b8" : "#0f172a",
                color: "#fff",
                fontWeight: 900,
                cursor: !userInfo.username || userInfo.pin.length !== 4 ? "not-allowed" : "pointer",
                fontSize: "12px",
              }}
            >
              {loginLoading ? "..." : "LOGIN"}
            </button>
          </form>
        )}

        {showLoadingState ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "14px" }}>
            Loading slate...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {games.map((game: SlateGame) => {
              const myPick = picks.find((p) => matchesGame(p, game.GameID));
              const gameLocked = isGameStarted(game.Kickoff_Time) || submissionClosed;

              const kickoff = new Date(game.Kickoff_Time);
              const formattedTime = !isNaN(kickoff.getTime())
                ? kickoff.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : game.Kickoff_Time;

              const spreadVal = Number(game.Spread);
              const hasValidSpread = !isNaN(spreadVal);
              const awaySpread = hasValidSpread ? ((spreadVal * -1) > 0 ? `+${spreadVal * -1}` : `${spreadVal * -1}`) : null;
              const homeSpread = hasValidSpread ? (spreadVal > 0 ? `+${spreadVal}` : `${spreadVal}`) : null;

              const isAwaySelected = myPick && teamMatches(myPick.team, game.AwayTeam);
              const isHomeSelected = myPick && teamMatches(myPick.team, game.HomeTeam);

              return (
                <div
                  key={game.GameID}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "8px 10px",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)",
                    border: myPick ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                    opacity: gameLocked ? 0.75 : 1,
                  }}
                >
                  {/* TIME & LOCK HEADER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '10px', fontWeight: '800', color: '#64748b' }}>
                    <span>{formattedTime}</span>
                    {gameLocked && (
                      <span style={{ color: '#ef4444', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        🔒 LOCKED
                      </span>
                    )}
                  </div>

{/* TEAMS LIST (HORIZONTAL COMPACT ROWS) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    
                    {/* AWAY TEAM ROW */}
                    <button
                      onClick={() => !gameLocked && handleSelect(game.GameID, game.AwayTeam)}
                      disabled={gameLocked}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: gameLocked ? "default" : "pointer",
                        background: isAwaySelected ? "#2563EB" : "#F8FAFC",
                        color: isAwaySelected ? "#FFFFFF" : "#0F172A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        {/* FIXED-WIDTH RANK BADGE / PLACEHOLDER */}
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "900",
                            width: "22px",
                            textAlign: "center",
                            flexShrink: 0,
                            color: isAwaySelected ? "#BFDBFE" : "#94A3B8",
                            visibility: game.AwayRank && String(game.AwayRank).trim() !== "" ? "visible" : "hidden",
                          }}
                        >
                          #{game.AwayRank || "--"}
                        </span>

                        <Image
                          src={game.AwayLogo}
                          alt=""
                          width={24}
                          height={24}
                          unoptimized
                          style={{ width: "24px", height: "24px", objectFit: "contain", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "900", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {game.AwayTeam}
                        </span>
                      </div>
                      {awaySpread && (
                        <span style={{
                          fontSize: "12px",
                          fontWeight: "900",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: isAwaySelected ? "rgba(255,255,255,0.2)" : "#E2E8F0",
                          color: isAwaySelected ? "#FFFFFF" : "#334155",
                          flexShrink: 0
                        }}>
                          {awaySpread}
                        </span>
                      )}
                    </button>

                    {/* HOME TEAM ROW */}
                    <button
                      onClick={() => !gameLocked && handleSelect(game.GameID, game.HomeTeam)}
                      disabled={gameLocked}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: gameLocked ? "default" : "pointer",
                        background: isHomeSelected ? "#2563EB" : "#F8FAFC",
                        color: isHomeSelected ? "#FFFFFF" : "#0F172A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        {/* FIXED-WIDTH RANK BADGE / PLACEHOLDER */}
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "900",
                            width: "22px",
                            textAlign: "center",
                            flexShrink: 0,
                            color: isHomeSelected ? "#BFDBFE" : "#94A3B8",
                            visibility: game.HomeRank && String(game.HomeRank).trim() !== "" ? "visible" : "hidden",
                          }}
                        >
                          #{game.HomeRank || "--"}
                        </span>

                        <Image
                          src={game.HomeLogo}
                          alt=""
                          width={24}
                          height={24}
                          unoptimized
                          style={{ width: "24px", height: "24px", objectFit: "contain", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "900", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {game.HomeTeam}
                        </span>
                      </div>
                      {homeSpread && (
                        <span style={{
                          fontSize: "12px",
                          fontWeight: "900",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: isHomeSelected ? "rgba(255,255,255,0.2)" : "#E2E8F0",
                          color: isHomeSelected ? "#FFFFFF" : "#334155",
                          flexShrink: 0
                        }}>
                          {homeSpread}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* INLINE WAGER BAR */}
                  {myPick && (
                    <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b" }}>
                        POINTS
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isSelected = myPick.wager === num;
                          const isTaken = usedWagers.has(num) && !isSelected;

                          return (
                            <button
                              key={num}
                              disabled={gameLocked}
                              onClick={() => handleWager(game.GameID, num)}
                              style={{
                                width: "30px",
                                height: "26px",
                                borderRadius: "6px",
                                border: "1px solid",
                                borderColor: isSelected ? "#0F172A" : "#CBD5E1",
                                fontWeight: "900",
                                fontSize: "12px",
                                cursor: gameLocked ? "not-allowed" : "pointer",
                                backgroundColor: isSelected ? "#0F172A" : isTaken ? "#F1F5F9" : "#FFFFFF",
                                color: isSelected ? "#FFFFFF" : isTaken ? "#CBD5E1" : "#0F172A",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* STICKY COMPACT SUBMISSION BAR */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            paddingTop: "6px",
            paddingBottom: "max(6px, env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(241,245,249,1) 70%, rgba(241,245,249,0) 100%)",
            zIndex: 10,
          }}
        >
          {picks.length > 0 && picks.length < 5 && !submissionClosed && (
            <div style={{ marginBottom: 4, textAlign: 'center', color: '#B45309', fontSize: 11, fontWeight: 800 }}>
              {picks.length} of 5 selected
            </div>
          )}

          <button
            disabled={!readyToSubmit || submitting}
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              background: readyToSubmit ? "#2563EB" : "#CBD5E1",
              color: "#FFFFFF",
              border: "none",
              fontSize: "15px",
              fontWeight: "900",
              cursor: readyToSubmit ? "pointer" : "not-allowed",
              boxShadow: readyToSubmit ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
            }}
          >
            {submitting ? "SENDING..." : `LOCK IN PICKS (${picks.length}/5)`}
          </button>
        </div>

      </div>
    </div>
  );
}