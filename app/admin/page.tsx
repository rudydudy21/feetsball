"use client";

import { useEffect, useState } from 'react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'feetsball-admin';

const buttonBase = {
  border: 'none',
  borderRadius: 12,
  padding: '0.85rem 1rem',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  color: '#fff',
};

export default function AdminPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('feetsball_admin_password');
    if (saved === ADMIN_PASSWORD) {
      setAuthorized(true);
    }
  }, []);

  const runAction = async (path: string, label: string) => {
    setBusy(label);
    setMessage('');

    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          'x-admin-password': ADMIN_PASSWORD,
        },
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Action failed');
      }

      setMessage(`${label} completed successfully. ${JSON.stringify(data)}`);
    } catch (error: unknown) {
      setMessage(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  const unlock = () => {
    const candidate = passwordInput.trim();
    if (!candidate) {
      setMessage('Enter the admin password to continue.');
      return;
    }

    if (candidate === ADMIN_PASSWORD) {
      localStorage.setItem('feetsball_admin_password', candidate);
      setAuthorized(true);
      setMessage('');
      return;
    }

    setMessage('Incorrect admin password.');
  };

  if (!authorized) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)',
          padding: 'max(10px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom))',
          color: '#0F172A',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ maxWidth: '430px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', paddingTop: '6px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3rem)', fontWeight: 900, letterSpacing: '-2px', margin: 0, color: '#0f172a', lineHeight: 1 }}>
              FEETSBALL
            </h1>
            <p style={{ color: '#64748b', fontWeight: 800, fontSize: '10px', letterSpacing: '3px', margin: '6px 0 0' }}>
              ADMIN ACCESS
            </p>
          </div>

          <div style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', borderRadius: '24px', padding: '18px 14px', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255,255,255,0.8)', border: '1px solid rgba(148,163,184,0.18)' }}>
            <p style={{ margin: '0 0 10px', color: '#475569', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>
              This page is hidden and requires the admin password.
            </p>

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin password"
              style={{
                width: '100%',
                padding: '12px 12px',
                borderRadius: '14px',
                border: '1px solid rgba(148,163,184,0.35)',
                outline: 'none',
                fontWeight: 700,
                fontSize: '14px',
                background: 'rgba(255,255,255,0.75)',
                boxShadow: 'inset 0 1px 1px rgba(15,23,42,0.04)',
                marginBottom: '10px',
              }}
            />

            <button
              onClick={unlock}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 12px 20px rgba(15, 23, 42, 0.18)',
              }}
            >
              UNLOCK ADMIN
            </button>

            {message ? (
              <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)',
        padding: 'max(10px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom))',
        color: '#0F172A',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ maxWidth: '430px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ textAlign: 'center', paddingTop: '6px' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3rem)', fontWeight: 900, letterSpacing: '-2px', margin: 0, color: '#0f172a', lineHeight: 1 }}>
            FEETSBALL
          </h1>
          <p style={{ color: '#64748b', fontWeight: 800, fontSize: '10px', letterSpacing: '3px', margin: '6px 0 0' }}>
            ADMIN
          </p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)', backdropFilter: 'blur(10px)' }}>
          <a href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '8px 14px' }}>HOME</a>
          <span style={{ color: '#0F172A', background: '#FFFFFF', borderRadius: '999px', padding: '8px 14px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>ADMIN</span>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 10px 18px rgba(15, 23, 42, 0.12)',
            }}
            onClick={() => runAction('/api/admin/run-weekly-setup', 'Weekly Setup')}
            disabled={busy !== null}
          >
            {busy === 'Weekly Setup' ? 'RUNNING WEEKLY SETUP...' : 'RUN WEEKLY SETUP'}
          </button>

          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 10px 18px rgba(37, 99, 235, 0.18)',
            }}
            onClick={() => runAction('/api/admin/update-live-scores', 'Live Score Refresh')}
            disabled={busy !== null}
          >
            {busy === 'Live Score Refresh' ? 'REFRESHING LIVE SCORES...' : 'REFRESH LIVE SCORES'}
          </button>

          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 10px 18px rgba(5, 150, 105, 0.18)',
            }}
            onClick={() => runAction('/api/admin/archive-current-week', 'Archive Current Week')}
            disabled={busy !== null}
          >
            {busy === 'Archive Current Week' ? 'ARCHIVING CURRENT WEEK...' : 'ARCHIVE CURRENT WEEK'}
          </button>
        </div>

        {message ? (
          <div
            style={{
              marginTop: '2px',
              padding: '0.85rem 0.9rem',
              borderRadius: '14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              whiteSpace: 'pre-wrap',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
