"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const buttonBase = {
  border: 'none',
  borderRadius: 12,
  padding: '0.85rem 1rem',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  color: '#fff',
  transition: 'all 0.15s ease',
} as const;

interface SlateMetadata {
  week: string;
  gamesCount: number;
  participantsCount: number;
  participants: Array<{ username: string; email: string }>;
  previewHtml?: string;
}

export default function AdminPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Email feature state
  const [slateMeta, setSlateMeta] = useState<SlateMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showConfirmBroadcastModal, setShowConfirmBroadcastModal] = useState(false);

  const fetchSlateMetadata = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res = await fetch('/api/admin/send-slate-email');
      if (res.ok) {
        const data = (await res.json()) as SlateMetadata & { success?: boolean };
        if (data.success) {
          setSlateMeta(data);
          if (data.previewHtml) {
            setPreviewHtml(data.previewHtml);
          }
        }
      }
    } catch {
      // Non-blocking error
    } finally {
      setMetaLoading(false);
    }
  }, []);

  // On mount, do a cheap probe to see if a valid session cookie already exists.
  useEffect(() => {
    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    })
      .then((res) => {
        if (res.ok) {
          setAuthorized(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch slate email metadata when authorized
  useEffect(() => {
    let ignore = false;
    if (authorized) {
      fetch('/api/admin/send-slate-email')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: (SlateMetadata & { success?: boolean }) | null) => {
          if (!ignore && data?.success) {
            setSlateMeta(data);
            if (data.previewHtml) {
              setPreviewHtml(data.previewHtml);
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [authorized]);

  const unlock = async () => {
    const candidate = passwordInput.trim();
    if (!candidate) {
      setMessage('Enter the admin password to continue.');
      return;
    }

    setVerifying(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: candidate }),
      });

      if (res.ok) {
        setAuthorized(true);
        setMessage('');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage((data as { error?: string }).error || 'Incorrect password.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const runAction = async (path: string, label: string) => {
    setBusy(label);
    setMessage('');

    try {
      // Credentials (session cookie) are sent automatically by the browser.
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || (data as { success?: boolean }).success === false) {
        if (res.status === 401) {
          setAuthorized(false);
          setMessage('Session expired. Please log in again.');
          return;
        }
        throw new Error((data as { error?: string }).error || 'Action failed');
      }

      setMessage(`${label} completed successfully.\n${JSON.stringify(data, null, 2)}`);
      // Refresh slate metadata if weekly setup was executed
      if (label === 'Weekly Setup') {
        void fetchSlateMetadata();
      }
    } catch (error: unknown) {
      setMessage(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleOpenPreview = async () => {
    if (previewHtml) {
      setShowPreviewModal(true);
      return;
    }

    setBusy('Preview Email');
    try {
      const res = await fetch('/api/admin/send-slate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewOnly: true }),
      });
      const data = await res.json();
      if (data.previewHtml) {
        setPreviewHtml(data.previewHtml);
        setShowPreviewModal(true);
      } else {
        setMessage(`Preview Error: ${data.error || 'Could not generate preview'}`);
      }
    } catch (err) {
      setMessage(`Preview Error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSendTestEmail = async () => {
    const email = testEmailInput.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address to send a test email.');
      return;
    }

    setBusy('Test Email');
    setMessage('');

    try {
      const res = await fetch('/api/admin/send-slate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setMessage(`✅ Test email successfully sent to ${email} for Week ${data.week}!`);
    } catch (err) {
      setMessage(`❌ Test Email Failed: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleBroadcastToAll = async () => {
    setShowConfirmBroadcastModal(false);
    setBusy('Mass Email Broadcast');
    setMessage('');

    try {
      const res = await fetch('/api/admin/send-slate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to broadcast emails');
      }

      const summary = `🎉 MASS EMAIL BROADCAST COMPLETE!\n\n` +
        `• Week: ${data.week}\n` +
        `• Total Participants: ${data.totalRecipients}\n` +
        `• Sent Successfully: ${data.sentCount}\n` +
        `• Failed: ${data.failedCount}\n` +
        (data.errors && data.errors.length > 0 ? `\nErrors:\n${data.errors.join('\n')}` : '');

      setMessage(summary);
    } catch (err) {
      setMessage(`❌ Broadcast Failed: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setBusy(null);
    }
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
              onKeyDown={(e) => { if (e.key === 'Enter') void unlock(); }}
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
                boxSizing: 'border-box',
              }}
            />

            <button
              onClick={() => void unlock()}
              disabled={verifying}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: '18px',
                background: verifying ? '#94a3b8' : 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '15px',
                fontWeight: 900,
                cursor: verifying ? 'not-allowed' : 'pointer',
                boxShadow: '0 12px 20px rgba(15, 23, 42, 0.18)',
              }}
            >
              {verifying ? 'VERIFYING...' : 'UNLOCK ADMIN'}
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

  const gamesCount = slateMeta?.gamesCount ?? 0;
  const participantsCount = slateMeta?.participantsCount ?? 0;
  const weekLabel = slateMeta?.week ?? 'Current';

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
      <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ textAlign: 'center', paddingTop: '6px' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3rem)', fontWeight: 900, letterSpacing: '-2px', margin: 0, color: '#0f172a', lineHeight: 1 }}>
            FEETSBALL
          </h1>
          <p style={{ color: '#64748b', fontWeight: 800, fontSize: '10px', letterSpacing: '3px', margin: '6px 0 0' }}>
            ADMIN PORTAL
          </p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(15,23,42,0.04)', borderRadius: '999px', padding: '4px', alignSelf: 'center', width: 'fit-content', border: '1px solid rgba(148,163,184,0.18)', backdropFilter: 'blur(10px)' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none', borderRadius: '999px', padding: '8px 14px' }}>HOME</Link>
          <span style={{ color: '#0F172A', background: '#FFFFFF', borderRadius: '999px', padding: '8px 14px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>ADMIN</span>
        </nav>

        {/* WEEKLY OPERATIONS CARD */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '16px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', color: '#64748b', textTransform: 'uppercase' }}>
            Slate & Scoring Management
          </div>

          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)',
            }}
            onClick={() => void runAction('/api/admin/run-weekly-setup', 'Weekly Setup')}
            disabled={busy !== null}
          >
            {busy === 'Weekly Setup' ? 'RUNNING WEEKLY SETUP...' : 'RUN WEEKLY SETUP'}
          </button>

          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 6px 14px rgba(37, 99, 235, 0.18)',
            }}
            onClick={() => void runAction('/api/admin/update-live-scores', 'Live Score Refresh')}
            disabled={busy !== null}
          >
            {busy === 'Live Score Refresh' ? 'REFRESHING LIVE SCORES...' : 'REFRESH LIVE SCORES'}
          </button>

          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 6px 14px rgba(5, 150, 105, 0.18)',
            }}
            onClick={() => void runAction('/api/admin/archive-current-week', 'Archive Current Week')}
            disabled={busy !== null}
          >
            {busy === 'Archive Current Week' ? 'ARCHIVING CURRENT WEEK...' : 'ARCHIVE CURRENT WEEK'}
          </button>
        </div>

        {/* MASS EMAIL ANNOUNCEMENT CARD */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '16px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', color: '#64748b', textTransform: 'uppercase' }}>
              Mass Email Broadcast (Resend)
            </div>
            {metaLoading ? (
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Refreshing...</span>
            ) : null}
          </div>

          {/* Slate & User Stats Pill */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '1px' }}>WEEK</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>{weekLabel}</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#CBD5E1' }}></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '1px' }}>SLATE GAMES</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: gamesCount > 0 ? '#059669' : '#DC2626' }}>{gamesCount}</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#CBD5E1' }}></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '1px' }}>RECIPIENTS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB' }}>{participantsCount}</div>
            </div>
          </div>

          {gamesCount === 0 ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#991B1B', fontWeight: 700 }}>
              ⚠️ No games loaded in Weekly Slate. Run &quot;Weekly Setup&quot; first before sending announcement emails.
            </div>
          ) : null}

          {/* Preview & Test Email Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => void handleOpenPreview()}
              disabled={busy !== null || gamesCount === 0}
              style={{
                flex: 1,
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: busy !== null || gamesCount === 0 ? 'not-allowed' : 'pointer',
                opacity: gamesCount === 0 ? 0.5 : 1,
              }}
            >
              👁️ PREVIEW EMAIL
            </button>

            <button
              onClick={() => void fetchSlateMetadata()}
              disabled={metaLoading}
              style={{
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#64748b',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: metaLoading ? 'not-allowed' : 'pointer',
              }}
              title="Refresh Stats"
            >
              🔄
            </button>
          </div>

          {/* Test Email Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
              Send Test Email
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="email"
                placeholder="your-email@example.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#FFFFFF',
                }}
              />
              <button
                onClick={() => void handleSendTestEmail()}
                disabled={busy !== null || gamesCount === 0 || !testEmailInput.trim()}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#334155',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: busy !== null || gamesCount === 0 || !testEmailInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy !== null || gamesCount === 0 || !testEmailInput.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {busy === 'Test Email' ? 'SENDING...' : 'SEND TEST'}
              </button>
            </div>
          </div>

          {/* Big Mass Broadcast Button */}
          <button
            style={{
              ...buttonBase,
              background: 'linear-gradient(180deg, #7C3AED 0%, #6D28D9 100%)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 8px 18px rgba(124, 58, 237, 0.25)',
              padding: '1rem',
              fontSize: '15px',
              marginTop: '4px',
              opacity: busy !== null || gamesCount === 0 || participantsCount === 0 ? 0.6 : 1,
              cursor: busy !== null || gamesCount === 0 || participantsCount === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => setShowConfirmBroadcastModal(true)}
            disabled={busy !== null || gamesCount === 0 || participantsCount === 0}
          >
            {busy === 'Mass Email Broadcast'
              ? 'BROADCASTING EMAILS...'
              : `📢 BROADCAST SLATE TO ALL (${participantsCount})`}
          </button>
        </div>

        {/* LOG / STATUS MESSAGE */}
        {message ? (
          <div
            style={{
              marginTop: '2px',
              padding: '0.85rem 0.9rem',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              whiteSpace: 'pre-wrap',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      {/* EMAIL PREVIEW MODAL */}
      {showPreviewModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Email Preview &bull; Week {weekLabel}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                  Rendered with {gamesCount} games and consensus spreads
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '999px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 900,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Iframe Preview */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#F1F5F9' }}>
              <iframe
                srcDoc={previewHtml}
                title="Email Preview"
                style={{
                  width: '100%',
                  height: '520px',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                Recipients: {participantsCount} participants
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CONFIRM BROADCAST MODAL */}
      {showConfirmBroadcastModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowConfirmBroadcastModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px 20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>📢</div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
              Broadcast Week {weekLabel} Slate?
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              You are about to send a personalized announcement email with <strong>{gamesCount} games & spreads</strong> to all <strong>{participantsCount} registered participants</strong> via Resend.
            </p>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '10px', marginBottom: '20px', fontSize: '12px', color: '#991B1B', fontWeight: 700 }}>
              This action cannot be undone. All active players will receive an email in their inbox immediately.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowConfirmBroadcastModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => void handleBroadcastToAll()}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #7C3AED 0%, #6D28D9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 14px rgba(124, 58, 237, 0.3)',
                }}
              >
                CONFIRM & SEND
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
