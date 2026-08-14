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
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto', backgroundColor: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', fontWeight: '900', fontSize: '28px', margin: '0 0 10px 0' }}>JOIN THE LEAGUE</h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginBottom: '30px' }}>Create your Feetsball credentials</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            placeholder="LEAGUE INVITE CODE" 
            style={{ padding: '15px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold' }} 
            onChange={(e) => setForm({...form, inviteCode: e.target.value.toUpperCase()})}
          />
          <input 
            placeholder="EMAIL ADDRESS" 
            type="email"
            style={{ padding: '15px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold' }} 
            onChange={(e) => setForm({...form, email: e.target.value})}
            />
          <input 
            placeholder="CHOOSE USERNAME" 
            style={{ padding: '15px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold' }} 
            onChange={(e) => setForm({...form, username: e.target.value})}
          />
          <input 
            placeholder="4-DIGIT PIN" 
            type="password" 
            maxLength={4}
            style={{ padding: '15px', borderRadius: '12px', border: '2px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }} 
            onChange={(e) => setForm({...form, pin: e.target.value})}
          />
          
          <button 
            disabled={!isReady || loading}
            onClick={handleRegister}
            style={{ 
              marginTop: '10px', padding: '18px', borderRadius: '15px', border: 'none', 
              backgroundColor: isReady ? '#2563eb' : '#cbd5e1', color: '#fff', 
              fontWeight: '900', cursor: isReady ? 'pointer' : 'not-allowed' 
            }}
          >
            {loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}
          </button>
        </div>
      </div>
    </div>
  );
}