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
  return now.getDay() === 6 && now.getHours() >= 12;
};

const isGameStarted = (kickoff: string | undefined) => {
  if (!kickoff) return false;
  const kickoffDate = new Date(kickoff);
  if (Number.isNaN(kickoffDate.getTime())) return false;
  return kickoffDate <= new Date();
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

    byGameId.set(gameId, normalized);
  }

  return [...byGameId.values()];
};

export default function Home() {
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [userInfo, setUserInfo] = useState({ username: "", pin: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

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

  const handleSelect = (gameId: string, team: string) => {
    setPicks((currentPicks) => {
      const existingIndex = currentPicks.findIndex((p) => matchesGame(p, gameId));

      if (existingIndex >= 0) {
        const existing = currentPicks[existingIndex];
        if (teamMatches(existing.team, team)) {
          return currentPicks.filter((p) => !matchesGame(p, gameId));
        }

        return currentPicks.map((p, index) =>
          index === existingIndex ? { ...p, team, wager: p.wager || 0 } : p,
        );
      }

      if (currentPicks.length >= 5) {
        const next = [...currentPicks];
        next.shift();
        return [...next, { gameId, team, wager: 0 }];
      }

      return [...currentPicks, { gameId, team, wager: 0 }];
    });
  };

  const handleWager = (gameId: string, wager: number) => {
    setPicks((currentPicks) => {
      const targetIndex = currentPicks.findIndex((pick) => matchesGame(pick, gameId));
      if (targetIndex === -1) {
        return currentPicks;
      }

      const targetPick = currentPicks[targetIndex];
      if (targetPick.wager === wager) {
        return currentPicks.map((pick, index) =>
          index === targetIndex ? { ...pick, wager: 0 } : pick,
        );
      }

      return currentPicks.map((pick, index) => {
        if (index === targetIndex) {
          return { ...pick, wager };
        }

        if (pick.wager === wager && pick.wager > 0) {
          return { ...pick, wager: 0 };
        }

        return pick;
      });
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
      const res = await fetch('/api/get-my-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });

      if (!res.ok) {
        setPicks([]);
        alert('❌ Could not load your picks. Check your username and PIN.');
        return;
      }

      const payload = await res.json();
      const normalized = normalizeExistingPicks(payload);
      setPicks(normalized);
      if (normalized.length === 0) {
        alert('No saved picks found for that username/PIN.');
      }
    } catch {
      setPicks([]);
      alert('❌ Could not reach the server.');
    } finally {
      setLoginLoading(false);
    }
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

    const wagerValues = picks.map((pick) => pick.wager);
    if (new Set(wagerValues).size !== wagerValues.length) {
      alert('Each wager value can only be used once across your picks.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInfo, picks }),
      });

      if (res.ok) {
        alert("🏆 PICKS LOCKED IN! Good luck this week.");
        setPicks([]); // Clear picks after success
      } else {
        const err = await res.json();
        alert("❌ Error: " + (err.error || "Submission failed"));
      }
    } catch {
      alert("❌ Critical Error: Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Validation
  const submissionClosed = isPastSaturdayNoonET();
  const usedWagers = new Set(picks.filter((p) => p.wager > 0).map((p) => p.wager));
  const validWagerSet = picks.length === new Set(picks.map((p) => p.wager)).size;
  const readyToSubmit =
    picks.length >= 1 &&
    picks.length <= 5 &&
    picks.every((p) => p.wager > 0) &&
    validWagerSet &&
    userInfo.username.length > 0 &&
    userInfo.pin.length === 4 &&
    !submissionClosed;
  const showLoadingState = loading && games.length === 0;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)",
        minHeight: "100vh",
        padding: "max(10px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom))",
        color: "#0F172A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
      >
      <div style={{ maxWidth: "430px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ textAlign: "center", paddingTop: "6px" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 7vw, 3rem)",
              fontWeight: "900",
              letterSpacing: "-2px",
              margin: "0",
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            FEETSBALL
          </h1>
          <p
            style={{
              color: "#64748b",
              fontWeight: "800",
              fontSize: "10px",
              letterSpacing: "3px",
              margin: "6px 0 0",
            }}
          >
            2026 CHALLENGE
          </p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)', backdropFilter: 'blur(10px)' }}>
          <Link href="/" style={{ color: '#0F172A', textDecoration: 'none', background: '#FFFFFF', borderRadius: '999px', padding: '8px 14px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '8px 14px' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '8px 14px' }}>SEASON</Link>
        </nav>

        {/* Credentials */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
          style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "stretch", width: "100%" }}
        >
          <input
            placeholder="Username"
            value={userInfo.username}
            style={{
              flex: 2,
              minWidth: 0,
              padding: "12px 12px",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.35)",
              outline: "none",
              fontWeight: "700",
              fontSize: "14px",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
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
              padding: "12px 8px",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.35)",
              textAlign: "center",
              fontWeight: "700",
              fontSize: "14px",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
            }}
            onChange={(e) => setUserInfo((prev) => ({ ...prev, pin: e.target.value }))}
          />
          <button
            type="submit"
            disabled={loginLoading || !userInfo.username || userInfo.pin.length !== 4}
            style={{
              padding: "0 12px",
              borderRadius: "14px",
              border: "none",
              background: !userInfo.username || userInfo.pin.length !== 4 ? "#cbd5e1" : "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
              color: "#fff",
              fontWeight: 900,
              cursor: !userInfo.username || userInfo.pin.length !== 4 ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              fontSize: "12px",
              boxShadow: !userInfo.username || userInfo.pin.length !== 4 ? "none" : "0 8px 16px rgba(15,23,42,0.15)",
            }}
          >
            {loginLoading ? "LOADING..." : "LOAD MY PICKS"}
          </button>
        </form>

        {picks.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={clearLoadedPicks}
              style={{
                border: "1px solid rgba(148,163,184,0.4)",
                backgroundColor: "rgba(255,255,255,0.8)",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "7px 10px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Clear picks
            </button>
          </div>
        )}

{showLoadingState ? (
  <div style={{ padding: "14px", textAlign: "center", color: "#64748b", fontWeight: "700", fontSize: "13px" }}>
    Loading slate...
  </div>
) : (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {games.map((game: SlateGame) => {
      const myPick = picks.find((p) => matchesGame(p, game.GameID));
      const gameLocked = isGameStarted(game.Kickoff_Time) || submissionClosed;

      // Format the Kickoff Time safely
      const kickoff = new Date(game.Kickoff_Time);
      const formattedTime = !isNaN(kickoff.getTime())
        ? kickoff.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
        : game.Kickoff_Time;

      const spreadVal = Number(game.Spread);
      const hasValidSpread = !isNaN(spreadVal);

      return (
        <div
          key={game.GameID}
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
            borderRadius: "24px",
            padding: "8px 8px 10px",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
            border: "1px solid rgba(148,163,184,0.18)",
            opacity: gameLocked ? 0.8 : 1,
            position: 'relative'
          }}
        >
          {/* KICKOFF BADGE */}
          <div style={{ 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              fontSize: '9px', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              <span style={{ color: '#64748b' }}>{formattedTime}</span>
              {gameLocked && (
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  • <span style={{ fontSize: '10px' }}>🔒</span> LOCKED
                </span>
              )}
            </div>

          <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: "6px", minHeight: "108px" }}>
            
            {/* AWAY TEAM BUTTON */}
            <button
              onClick={() => !gameLocked && handleSelect(game.GameID, game.AwayTeam)}
              disabled={gameLocked}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 4px 10px",
                borderRadius: "18px",
                border: "1px solid rgba(148,163,184,0.10)",
                cursor: gameLocked ? "default" : "pointer",
                transition: "0.2s",
                background: myPick && teamMatches(myPick.team, game.AwayTeam) ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)" : "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
                color: myPick && teamMatches(myPick.team, game.AwayTeam) ? "#FFFFFF" : "#0F172A",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: myPick && teamMatches(myPick.team, game.AwayTeam) ? "0 10px 18px rgba(37,99,235,0.18)" : "inset 0 1px 0 rgba(255,255,255,0.8)",
                transform: myPick && teamMatches(myPick.team, game.AwayTeam) ? "translateY(-1px)" : "none",
              }}
            >
              <Image
                src={game.AwayLogo}
                alt={`${game.AwayTeam} logo`}
                width={38}
                height={38}
                unoptimized
                style={{ width: "38px", height: "38px", objectFit: "contain", marginBottom: "4px", alignSelf: "center" }}
              />
              <div style={{ fontSize: "11px", fontWeight: "900", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", lineHeight: 1.1, minHeight: "24px" }}>
                {game.AwayRank && game.AwayRank !== "" && (
                  <span style={{ color: myPick?.team === game.AwayTeam ? "#bfdbfe" : "#94a3b8", marginRight: "1px", fontSize: "9px" }}>
                    #{game.AwayRank}
                  </span>
                )}
                <span>{game.AwayTeam?.toUpperCase()}</span>
              </div>
              {hasValidSpread && (
                <div style={{ color: myPick?.team === game.AwayTeam ? "#bfdbfe" : "#64748b", marginTop: "2px", fontSize: "10px", fontWeight: "800" }}>
                  ({(spreadVal * -1) > 0 ? '+' : ''}{spreadVal * -1})
                </div>
              )}
            </button>

            <div style={{ fontWeight: "900", color: "#cbd5e1", fontStyle: "italic", fontSize: '10px', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
              VS
            </div>

            {/* HOME TEAM BUTTON */}
            <button
              onClick={() => !gameLocked && handleSelect(game.GameID, game.HomeTeam)}
              disabled={gameLocked}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 4px 10px",
                borderRadius: "18px",
                border: "1px solid rgba(148,163,184,0.10)",
                cursor: gameLocked ? "default" : "pointer",
                transition: "0.2s",
                background: myPick && teamMatches(myPick.team, game.HomeTeam) ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)" : "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
                color: myPick && teamMatches(myPick.team, game.HomeTeam) ? "#FFFFFF" : "#0F172A",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: myPick && teamMatches(myPick.team, game.HomeTeam) ? "0 10px 18px rgba(37,99,235,0.18)" : "inset 0 1px 0 rgba(255,255,255,0.8)",
                transform: myPick && teamMatches(myPick.team, game.HomeTeam) ? "translateY(-1px)" : "none",
              }}
            >
              <Image
                src={game.HomeLogo}
                alt={`${game.HomeTeam} logo`}
                width={38}
                height={38}
                unoptimized
                style={{ width: "38px", height: "38px", objectFit: "contain", marginBottom: "4px", alignSelf: "center" }}
              />
              <div style={{ fontSize: "11px", fontWeight: "900", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", lineHeight: 1.1, minHeight: "24px" }}>
                {game.HomeRank && game.HomeRank !== "" && (
                  <span style={{ color: myPick?.team === game.HomeTeam ? "#bfdbfe" : "#94a3b8", marginRight: "1px", fontSize: "9px" }}>
                    #{game.HomeRank}
                  </span>
                )}
                <span>{game.HomeTeam?.toUpperCase()}</span>
              </div>
              {hasValidSpread && (
                <div style={{ color: myPick?.team === game.HomeTeam ? "#bfdbfe" : "#64748b", marginTop: "2px", fontSize: "10px", fontWeight: "800" }}>
                  ({spreadVal > 0 ? '+' : ''}{spreadVal})
                </div>
              )}
            </button>
          </div>

          {/* WAGER SECTION */}
          {myPick && (
            <div style={{ marginTop: "8px", paddingTop: "5px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "9px", fontWeight: "bold", color: "#94a3b8", minWidth: "42px" }}>
                {gameLocked ? "FINAL WAGER" : "WAGER"}
              </span>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px", flex: 1 }}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = myPick.wager === num;
                  const isTakenByAnotherPick = usedWagers.has(num) && !isSelected;

                  return (
                    <button
                      key={num}
                      disabled={gameLocked || isTakenByAnotherPick}
                      onClick={() => handleWager(game.GameID, num)}
                      style={{
                        width: "26px", height: "26px", borderRadius: "8px", border: "1px solid #e2e8f0", fontWeight: "bold", fontSize: "10px",
                        cursor: gameLocked || isTakenByAnotherPick ? "not-allowed" : "pointer",
                        backgroundColor: isSelected ? "#0f172a" : isTakenByAnotherPick ? "#e2e8f0" : "#fff",
                        color: isSelected ? "#fff" : isTakenByAnotherPick ? "#94a3b8" : "#64748b",
                        opacity: gameLocked ? 0.7 : isTakenByAnotherPick ? 0.55 : 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: isSelected ? "0 4px 10px rgba(15,23,42,0.18)" : "none",
                        transform: isSelected ? "translateY(-1px)" : "none",
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

        {/* Submit Button Section */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            paddingTop: "8px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(245,247,250,1) 60%, rgba(245,247,250,0.18) 100%)",
            backdropFilter: "blur(10px)",
            zIndex: 10,
          }}
        >
          {picks.length > 0 && picks.length < 5 && !submissionClosed && (
            <div style={{ marginBottom: 8, textAlign: 'center', color: '#b45309', fontSize: 12, fontWeight: 800 }}>
              Warning: you have selected {picks.length} of 5 picks.
            </div>
          )}

          {submissionClosed && (
            <div style={{ marginBottom: 8, textAlign: 'center', color: '#b91c1c', fontSize: 12, fontWeight: 800 }}>
              Submissions are closed after noon ET on Saturday.
            </div>
          )}

          <button
            disabled={!readyToSubmit || submitting}
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: "18px",
              background: readyToSubmit ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)" : "#CBD5E1",
              color: "#FFFFFF",
              border: "none",
              fontSize: "15px",
              fontWeight: "900",
              cursor: readyToSubmit ? "pointer" : "not-allowed",
              boxShadow: readyToSubmit
                ? "0 12px 20px rgba(37, 99, 235, 0.28)"
                : "none",
            }}
          >
            {submitting
              ? "SENDING..."
              : `LOCK IN PICKS (${picks.filter((p) => p.wager > 0).length}/5)`}
          </button>
        </div>
      </div>
    </div>
  );
}