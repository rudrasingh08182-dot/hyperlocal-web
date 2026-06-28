import { useState } from 'react';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [role, setRole] = useState('buyer');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const userRole = res.data.user.role;
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'seller') navigate('/seller');
      else if (userRole === 'delivery') navigate('/delivery');
      else navigate('/buyer');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'buyer', label: 'Buyer', icon: '🛒' },
    { id: 'seller', label: 'Seller', icon: '🏪' },
    { id: 'admin', label: 'Admin', icon: '👑' },
    { id: 'delivery', label: 'Delivery', icon: '🚴' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '16px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><img src="/logo1.png" alt="Zaplo" style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover' }} /></div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1a1a2e' }}>Zaplo</h2>
          <p style={{ margin: '4px 0 0', color: '#999', fontSize: '14px' }}>Sign in to your account</p>
        </div>

        {/* Role Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f5f5f5', borderRadius: '12px', padding: '4px' }}>
          {roles.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px', transition: 'all 0.2s',
                background: role === r.id ? 'white' : 'transparent',
                color: role === r.id ? '#667eea' : '#999',
                boxShadow: role === r.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#e17055', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Phone Number</label>
          <input
            placeholder={`Enter your ${role} phone number`}
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            style={{ width: '100%', padding: '14px', border: '1.5px solid #e8e8e8', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Password</label>
          <input
            placeholder="Enter your password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '14px', border: '1.5px solid #e8e8e8', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Login Button */}
        <button onClick={handleLogin} disabled={loading}
          style={{
            width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
            fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }}>
          {loading ? 'Signing in...' : `Sign in as ${roles.find(r => r.id === role)?.label}`}
        </button>

        {/* Register Link - only for buyer and seller */}
        {role !== 'admin' && role !=='delivery' &&(
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '14px' }}>
            Don't have an account?{' '}
            <span onClick={() => navigate(`/register?role=${role}`)}
              style={{ color: '#667eea', fontWeight: '700', cursor: 'pointer' }}>
              Register as {role === 'buyer' ? 'Buyer' : 'Seller'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}