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
        padding: "40px 20px",
        color: "#1e293b",
        fontFamily: "system-ui, sans-serif",
      }}
      >
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "900",
              letterSpacing: "-2px",
              margin: "0",
              color: "#0f172a",
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
          <Link href="/" style={{ color: '#0f172a', textDecoration: 'none', borderBottom: '2px solid #2563eb' }}>PICKS</Link>
          <Link href="/leaderboard/weekly" style={{ color: '#64748b', textDecoration: 'none' }}>WEEKLY</Link>
          <Link href="/leaderboard/season" style={{ color: '#64748b', textDecoration: 'none' }}>SEASON</Link>
        </nav>

        {/* Credentials */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
          style={{ display: "flex", gap: "15px", marginBottom: "10px", alignItems: "stretch" }}
        >
          <input
            placeholder="Username"
            value={userInfo.username}
            style={{
              flex: 2,
              padding: "15px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              outline: "none",
              fontWeight: "bold",
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
              padding: "15px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              textAlign: "center",
              fontWeight: "bold",
            }}
            onChange={(e) => setUserInfo((prev) => ({ ...prev, pin: e.target.value }))}
          />
          <button
            type="submit"
            disabled={loginLoading || !userInfo.username || userInfo.pin.length !== 4}
            style={{
              padding: "0 18px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: !userInfo.username || userInfo.pin.length !== 4 ? "#cbd5e1" : "#0f172a",
              color: "#fff",
              fontWeight: 900,
              cursor: !userInfo.username || userInfo.pin.length !== 4 ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loginLoading ? "LOADING..." : "LOGIN"}
          </button>
        </form>

        {picks.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={clearLoadedPicks}
              style={{
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#0f172a",
                borderRadius: "10px",
                padding: "8px 12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Clear picks
            </button>
          </div>
        )}

{showLoadingState ? (
  <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>
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
            borderRadius: "24px",
            padding: "10px",
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "5px" }}>
            
            {/* AWAY TEAM BUTTON */}
            <button
              onClick={() => !locked && handleSelect(game.GameID, game.AwayTeam)}
              disabled={locked}
              style={{
                flex: 1, padding: "10px", borderRadius: "16px", border: "none", cursor: locked ? "default" : "pointer",
                transition: "0.2s",
                backgroundColor: myPick && teamMatches(myPick.team, game.AwayTeam) ? "#2563eb" : "#f8fafc",
                color: myPick && teamMatches(myPick.team, game.AwayTeam) ? "#fff" : "#1e293b",
              }}
            >
              <Image
                src={game.AwayLogo}
                alt={`${game.AwayTeam} logo`}
                width={45}
                height={45}
                unoptimized
                style={{ width: "45px", height: "45px", objectFit: "contain", marginBottom: "8px" }}
              />
              <div style={{ fontSize: "11px", fontWeight: "900", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {game.AwayRank && game.AwayRank !== "" && (
                  <span style={{ color: myPick?.team === game.AwayTeam ? "#bfdbfe" : "#94a3b8", marginRight: "4px", fontSize: "10px" }}>
                    #{game.AwayRank}
                  </span>
                )}
                {game.AwayTeam?.toUpperCase()}
                {hasValidSpread && (
                  <span style={{ color: myPick?.team === game.AwayTeam ? "#bfdbfe" : "#94a3b8", marginLeft: "4px", fontSize: "10px", fontWeight: "bold" }}>
                    ({(spreadVal * -1) > 0 ? '+' : ''}{spreadVal * -1})
                  </span>
                )}
              </div>
            </button>

            <div style={{ fontWeight: "900", color: "#cbd5e1", fontStyle: "italic", fontSize: '10px' }}>
              VS
            </div>

            {/* HOME TEAM BUTTON */}
            <button
              onClick={() => !locked && handleSelect(game.GameID, game.HomeTeam)}
              disabled={locked}
              style={{
                flex: 1, padding: "10px", borderRadius: "16px", border: "none", cursor: locked ? "default" : "pointer",
                transition: "0.2s",
                backgroundColor: myPick && teamMatches(myPick.team, game.HomeTeam) ? "#2563eb" : "#f8fafc",
                color: myPick && teamMatches(myPick.team, game.HomeTeam) ? "#fff" : "#1e293b",
              }}
            >
              <Image
                src={game.HomeLogo}
                alt={`${game.HomeTeam} logo`}
                width={45}
                height={45}
                unoptimized
                style={{ width: "45px", height: "45px", objectFit: "contain", marginBottom: "8px" }}
              />
              <div style={{ fontSize: "11px", fontWeight: "900", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {game.HomeRank && game.HomeRank !== "" && (
                  <span style={{ color: myPick?.team === game.HomeTeam ? "#bfdbfe" : "#94a3b8", marginRight: "4px", fontSize: "10px" }}>
                    #{game.HomeRank}
                  </span>
                )}
                {game.HomeTeam?.toUpperCase()}
                {hasValidSpread && (
                  <span style={{ color: myPick?.team === game.HomeTeam ? "#bfdbfe" : "#94a3b8", marginLeft: "4px", fontSize: "10px", fontWeight: "bold" }}>
                    ({spreadVal > 0 ? '+' : ''}{spreadVal})
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* WAGER SECTION */}
          {myPick && (
            <div style={{ marginTop: "10px", paddingTop: "5px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8", minWidth: "52px" }}>
                {locked ? "FINAL WAGER" : "WAGER"}
              </span>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flex: 1 }}>
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
                        width: "36px", height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", fontWeight: "bold",
                        cursor: locked || isUsedElsewhere ? "not-allowed" : "pointer",
                        backgroundColor: isSelected ? "#0f172a" : isUsedElsewhere ? "#e2e8f0" : "#fff",
                        color: isSelected ? "#fff" : isUsedElsewhere ? "#94a3b8" : "#64748b",
                        opacity: locked ? 0.7 : isUsedElsewhere ? 0.6 : 1,
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

        {/* Submit Button Section */}
        <div style={{ marginTop: "40px", paddingBottom: "60px" }}>
          <button
            disabled={!readyToSubmit || submitting}
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "24px",
              borderRadius: "20px",
              backgroundColor: readyToSubmit ? "#2563eb" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontSize: "18px",
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