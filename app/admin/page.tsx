"use client";

import { useState } from 'react';

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

  const runAction = async (path: string, label: string) => {
    setBusy(label);
    setMessage('');

    try {
      const res = await fetch(path, { method: 'POST' });
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

  return (
    <main style={{ minHeight: '100vh', background: '#f5f7fb', padding: '2rem 1rem', color: '#111827' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', background: '#fff', borderRadius: 18, padding: '1.5rem', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: 28 }}>Feetsball Admin</h1>
        <p style={{ margin: '0 0 1.5rem', color: '#475569' }}>
          Weekly setup is manual. Live score refreshes run on a 30-minute timer. Archiving is manual.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          <button
            style={{ ...buttonBase, background: '#0f172a' }}
            onClick={() => runAction('/api/admin/run-weekly-setup', 'Weekly Setup')}
            disabled={busy !== null}
          >
            {busy === 'Weekly Setup' ? 'Running weekly setup...' : 'Run Weekly Setup'}
          </button>

          <button
            style={{ ...buttonBase, background: '#2563eb' }}
            onClick={() => runAction('/api/admin/update-live-scores', 'Live Score Refresh')}
            disabled={busy !== null}
          >
            {busy === 'Live Score Refresh' ? 'Refreshing live scores...' : 'Refresh Live Scores'}
          </button>

          <button
            style={{ ...buttonBase, background: '#059669' }}
            onClick={() => runAction('/api/admin/archive-current-week', 'Archive Current Week')}
            disabled={busy !== null}
          >
            {busy === 'Archive Current Week' ? 'Archiving current week...' : 'Archive Current Week'}
          </button>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 20,
              padding: '0.8rem 0.9rem',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
