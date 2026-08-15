"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', pin: '', inviteCode: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("✅ Registration Successful! Redirecting to login...");
      router.push('/');
    } else {
      const err = await res.json();
      alert("❌ " + err.error);
    }
    setLoading(false);
  };

  const isReady = form.username && form.email.includes('@') && form.pin.length === 4 && form.inviteCode;

  return (
    <div style={{ background: 'linear-gradient(180deg, #F5F7FA 0%, #EEF2F6 100%)', minHeight: '100vh', padding: 'max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontWeight: '900', fontSize: 'clamp(1.9rem, 7vw, 3rem)', letterSpacing: '-2px', margin: '0', lineHeight: 1, color: '#0f172a' }}>FEETSBALL</h1>
          <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '10px', letterSpacing: '3px', margin: '5px 0 0' }}>JOIN THE LEAGUE</p>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '18px 16px 20px', borderRadius: '22px', boxShadow: '0 10px 24px rgba(15,23,42,0.05)', border: '1px solid rgba(148,163,184,0.18)' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', fontSize: '24px', margin: '0 0 8px' }}>CREATE ACCOUNT</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', margin: '0 0 18px' }}>Create your Feetsball credentials</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              placeholder="LEAGUE INVITE CODE"
              style={{ padding: '14px 12px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '800', fontSize: '14px' }}
              onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
            />
            <input
              placeholder="EMAIL ADDRESS"
              type="email"
              style={{ padding: '14px 12px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '800', fontSize: '14px' }}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="CHOOSE USERNAME"
              style={{ padding: '14px 12px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '800', fontSize: '14px' }}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              placeholder="4-DIGIT PIN"
              type="password"
              maxLength={4}
              style={{ padding: '14px 12px', borderRadius: '12px', border: '2px solid #e2e8f0', textAlign: 'center', fontWeight: '800', fontSize: '14px' }}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
            />

            <button
              disabled={!isReady || loading}
              onClick={handleRegister}
              style={{
                marginTop: '8px',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: isReady ? '#2563eb' : '#cbd5e1',
                color: '#fff',
                fontWeight: '900',
                cursor: isReady ? 'pointer' : 'not-allowed',
                boxShadow: isReady ? '0 10px 15px -3px rgba(37, 99, 235, 0.4)' : 'none'
              }}
            >
              {loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}