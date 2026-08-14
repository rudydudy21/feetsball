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

export default function Home() {
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [userInfo, setUserInfo] = useState({ username: "", pin: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const existing = picks.find((p) => p.gameId === gameId);
    if (existing && existing.team === team) {
      setPicks(picks.filter((p) => p.gameId !== gameId));
    } else if (existing) {
      setPicks(picks.map((p) => (p.gameId === gameId ? { ...p, team } : p)));
    } else if (picks.length < 5) {
      setPicks([...picks, { gameId, team, wager: 0 }]);
    }
  };

  const handleWager = (gameId: string, wager: number) => {
    setPicks(picks.map((p) => (p.gameId === gameId ? { ...p, wager } : p)));
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

  useEffect(() => {
    const fetchExistingPicks = async () => {
      const { username, pin } = userInfo;
      // Only fetch if we have a username and a full 4-digit PIN
      if (username && pin.length === 4) {
        const res = await fetch('/api/get-my-picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, pin }),
        });

        if (res.ok) {
          const existing = await res.json();
          if (existing.length > 0) {
            setPicks(existing);
            // Optional: alert("Welcome back! We've loaded your current picks.");
          }
        }
      }
    };

    fetchExistingPicks();
  }, [userInfo]);

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
        <div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
          <input
            placeholder="Username"
            style={{
              flex: 2,
              padding: "15px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              outline: "none",
              fontWeight: "bold",
            }}
            onChange={(e) =>
              setUserInfo({ ...userInfo, username: e.target.value })
            }
          />
          <input
            placeholder="PIN"
            type="password"
            maxLength={4}
            style={{
              flex: 1,
              padding: "15px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              textAlign: "center",
              fontWeight: "bold",
            }}
            onChange={(e) => setUserInfo({ ...userInfo, pin: e.target.value })}
          />
        </div>

{showLoadingState ? (
  <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>
    Loading slate...
  </div>
) : (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {games.map((game: SlateGame) => {
      const myPick = picks.find((p) => p.gameId === game.GameID);
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
                backgroundColor: myPick?.team === game.AwayTeam ? "#2563eb" : "#f8fafc",
                color: myPick?.team === game.AwayTeam ? "#fff" : "#1e293b",
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
                backgroundColor: myPick?.team === game.HomeTeam ? "#2563eb" : "#f8fafc",
                color: myPick?.team === game.HomeTeam ? "#fff" : "#1e293b",
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
            <div style={{ marginTop: "10px", paddingTop: "5px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>
                {locked ? "FINAL WAGER" : "WAGER"}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    disabled={locked || picks.some((p) => p.wager === num && p.gameId !== game.GameID)}
                    onClick={() => handleWager(game.GameID, num)}
                    style={{
                      width: "36px", height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", fontWeight: "bold",
                      cursor: locked ? "default" : "pointer",
                      backgroundColor: myPick.wager === num ? "#0f172a" : "#fff",
                      color: myPick.wager === num ? "#fff" : "#64748b",
                    }}
                  >
                    {num}
                  </button>
                ))}
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