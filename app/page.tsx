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

const matchesGame = (pick: PickEntry, gameId: string, awayTeam: string, homeTeam: string) =>
  normalizeGameId(pick.gameId) === normalizeGameId(gameId) ||
  teamMatches(pick.team, awayTeam) ||
  teamMatches(pick.team, homeTeam);

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
    const existing = picks.find((p) => matchesGame(p, gameId, team, team));
    if (existing && teamMatches(existing.team, team)) {
      setPicks(picks.filter((p) => !matchesGame(p, gameId, team, team)));
    } else if (existing) {
      setPicks(picks.map((p) => (matchesGame(p, gameId, team, team) ? { ...p, team } : p)));
    } else if (picks.length < 5) {
      setPicks([...picks, { gameId, team, wager: 0 }]);
    }
  };

  const handleWager = (gameId: string, wager: number) => {
    setPicks(picks.map((p) => (
      normalizeGameId(p.gameId) === normalizeGameId(gameId) ? { ...p, wager } : p
    )));
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
  const readyToSubmit =
    picks.length === 5 &&
    picks.every((p) => p.wager > 0) &&
    userInfo.username.length > 0 &&
    userInfo.pin.length === 4;
  const showLoadingState = loading && games.length === 0;

  return (
    <div
      style={{
        backgroundColor: "#f1f5f9",
        minHeight: "100vh",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))",
        color: "#1e293b",
        fontFamily: "system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
      >
      <div style={{ maxWidth: "430px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(1.9rem, 7vw, 3rem)",
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
              fontWeight: "bold",
              fontSize: "10px",
              letterSpacing: "3px",
              margin: "5px 0 0",
            }}
          >
            2026 CHALLENGE
          </p>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: '900', background: '#e2e8f0', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content' }}>
          <Link href="/" style={{ color: '#0f172a', textDecoration: 'none', background: '#fff', borderRadius: '999px', padding: '7px 12px', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#64748b', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#64748b', textDecoration: 'none', borderRadius: '999px', padding: '7px 12px' }}>SEASON</Link>
        </nav>

        {/* Credentials */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
          style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "stretch", width: "100%" }}
        >
          <input
            placeholder="Username"
            value={userInfo.username}
            style={{
              flex: 2,
              minWidth: 0,
              padding: "12px 10px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              outline: "none",
              fontWeight: "bold",
              fontSize: "14px",
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
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "14px",
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
              backgroundColor: !userInfo.username || userInfo.pin.length !== 4 ? "#cbd5e1" : "#0f172a",
              color: "#fff",
              fontWeight: 900,
              cursor: !userInfo.username || userInfo.pin.length !== 4 ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              fontSize: "12px",
            }}
          >
            {loginLoading ? "LOADING..." : "LOGIN"}
          </button>
        </form>

        {picks.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={clearLoadedPicks}
              style={{
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#0f172a",
                borderRadius: "10px",
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
      const myPick = picks.find((p) => matchesGame(p, game.GameID, game.AwayTeam, game.HomeTeam));
      const locked = false; // Unlocked for testing

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
            backgroundColor: "#fff",
            borderRadius: "20px",
            padding: "8px 8px 10px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
            opacity: locked ? 0.8 : 1,
            position: 'relative'
          }}
        >
          {/* KICKOFF BADGE */}
          <div style={{ 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              fontSize: '9px', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              <span style={{ color: '#64748b' }}>{formattedTime}</span>
              {locked && (
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  • <span style={{ fontSize: '10px' }}>🔒</span> LOCKED
                </span>
              )}
            </div>

          <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: "6px", minHeight: "108px" }}>
            
            {/* AWAY TEAM BUTTON */}
            <button
              onClick={() => !locked && handleSelect(game.GameID, game.AwayTeam)}
              disabled={locked}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "6px 4px 8px",
                borderRadius: "12px",
                border: "none",
                cursor: locked ? "default" : "pointer",
                transition: "0.2s",
                backgroundColor: myPick && teamMatches(myPick.team, game.AwayTeam) ? "#2563eb" : "#f8fafc",
                color: myPick && teamMatches(myPick.team, game.AwayTeam) ? "#fff" : "#1e293b",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: myPick && teamMatches(myPick.team, game.AwayTeam) ? "inset 0 0 0 1px rgba(255,255,255,0.2), 0 4px 10px rgba(37,99,235,0.18)" : "inset 0 0 0 1px rgba(148,163,184,0.08)",
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

            <div style={{ fontWeight: "900", color: "#cbd5e1", fontStyle: "italic", fontSize: '10px', display: 'flex', alignItems: 'center' }}>
              VS
            </div>

            {/* HOME TEAM BUTTON */}
            <button
              onClick={() => !locked && handleSelect(game.GameID, game.HomeTeam)}
              disabled={locked}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "6px 4px 8px",
                borderRadius: "12px",
                border: "none",
                cursor: locked ? "default" : "pointer",
                transition: "0.2s",
                backgroundColor: myPick && teamMatches(myPick.team, game.HomeTeam) ? "#2563eb" : "#f8fafc",
                color: myPick && teamMatches(myPick.team, game.HomeTeam) ? "#fff" : "#1e293b",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: myPick && teamMatches(myPick.team, game.HomeTeam) ? "inset 0 0 0 1px rgba(255,255,255,0.2), 0 4px 10px rgba(37,99,235,0.18)" : "inset 0 0 0 1px rgba(148,163,184,0.08)",
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
                {locked ? "FINAL WAGER" : "WAGER"}
              </span>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px", flex: 1 }}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = myPick.wager === num;
                  const isUsedElsewhere = picks.some(
                    (p) => normalizeGameId(p.gameId) !== normalizeGameId(game.GameID) && p.wager === num
                  );

                  return (
                    <button
                      key={num}
                      disabled={locked || isUsedElsewhere}
                      onClick={() => handleWager(game.GameID, num)}
                      style={{
                        width: "26px", height: "26px", borderRadius: "8px", border: "1px solid #e2e8f0", fontWeight: "bold", fontSize: "10px",
                        cursor: locked || isUsedElsewhere ? "not-allowed" : "pointer",
                        backgroundColor: isSelected ? "#0f172a" : isUsedElsewhere ? "#e2e8f0" : "#fff",
                        color: isSelected ? "#fff" : isUsedElsewhere ? "#94a3b8" : "#64748b",
                        opacity: locked ? 0.7 : isUsedElsewhere ? 0.6 : 1,
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
            background: "linear-gradient(to top, rgba(241,245,249,1) 65%, rgba(241,245,249,0.2) 100%)",
            backdropFilter: "blur(8px)",
            zIndex: 10,
          }}
        >
          <button
            disabled={!readyToSubmit || submitting}
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: "16px",
              backgroundColor: readyToSubmit ? "#2563eb" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontSize: "15px",
              fontWeight: "900",
              cursor: readyToSubmit ? "pointer" : "not-allowed",
              boxShadow: readyToSubmit
                ? "0 10px 15px -3px rgba(37, 99, 235, 0.4)"
                : "none",
            }}
          >
            {submitting
              ? "SENDING..."
              : `LOCK IN 5 PICKS (${
                  picks.filter((p) => p.wager > 0).length
                }/5)`}
          </button>
        </div>
      </div>
    </div>
  );
}