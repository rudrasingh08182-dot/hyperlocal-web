import { useState } from 'react';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [role, setRole] = useState('buyer');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const userRole = res.data.user.role;
      if (userRole === 'admin') window.location.href = '/admin';
      else if (userRole === 'seller') window.location.href = '/seller';
      else if (userRole === 'delivery') window.location.href = '/delivery';
      else window.location.href = '/buyer';
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'buyer', label: 'Buyer', icon: '🛒', color: '#667eea' },
    { id: 'seller', label: 'Seller', icon: '🏪', color: '#f59e0b' },
    { id: 'delivery', label: 'Delivery', icon: '🚴', color: '#10b981' },
    { id: 'admin', label: 'Admin', icon: '👑', color: '#ef4444' },
  ];

  const activeRole = roles.find(r => r.id === role);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      padding: '16px',
      position: 'relative',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '0',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: '4px',
          background: `linear-gradient(90deg, ${activeRole.color}, ${activeRole.color}dd)`,
          transition: 'background 0.3s ease',
        }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#f9fafb',
              borderRadius: '14px',
              margin: '0 auto 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e5e7eb',
            }}>
              <img
                src="/logo1.png"
                alt="Zaplo"
                style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span style="font-size:28px;">🏠</span>';
                }}
              />
            </div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              letterSpacing: '-0.5px',
            }}>
              Welcome back
            </h1>
            <p style={{
              margin: 0,
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '400',
            }}>
              Sign in to your <strong style={{ color: activeRole.color }}>{activeRole.label}</strong> account
            </p>
          </div>

          {/* Role Selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '24px',
          }}>
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  padding: '10px 4px',
                  border: role === r.id ? `2px solid ${r.color}` : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '11px',
                  transition: 'all 0.2s ease',
                  background: role === r.id ? `${r.color}08` : 'white',
                  color: role === r.id ? r.color : '#6b7280',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '18px', filter: role === r.id ? 'none' : 'grayscale(0.3)' }}>
                  {r.icon}
                </span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Approval Notice */}
          {(role === 'seller' || role === 'delivery') && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⏳</span>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#92400e',
                lineHeight: '1.5',
                fontWeight: '500',
              }}>
                <strong>{activeRole.label} accounts require admin approval.</strong> You'll be able to log in once your account is approved.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#dc2626',
                fontWeight: '500',
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Phone Input */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px',
            }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '16px',
                color: '#9ca3af',
              }}>
                📱
              </span>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 42px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  background: '#fafafa',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = activeRole.color;
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = `0 0 0 3px ${activeRole.color}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.background = '#fafafa';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '16px',
                color: '#9ca3af',
              }}>
                🔒
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 42px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  background: '#fafafa',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = activeRole.color;
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = `0 0 0 3px ${activeRole.color}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.background = '#fafafa';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#9ca3af',
                  padding: '4px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading || !form.phone || !form.password}
            style={{
              width: '100%',
              padding: '14px',
              background: !form.phone || !form.password ? '#d1d5db' : `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}dd)`,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: !form.phone || !form.password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }} />
                Signing in...
              </>
            ) : (
              `Sign in as ${activeRole.label}`
            )}
          </button>

          {/* Divider */}
          {(role === 'buyer' || role === 'seller') && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '20px 0',
              }}>
                <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                <span style={{
                  padding: '0 14px',
                  color: '#9ca3af',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  New to Zaplo?
                </span>
                <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              </div>

              <button
                onClick={() => navigate(`/register?role=${role}`)}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'white',
                  color: activeRole.color,
                  border: `1.5px solid ${activeRole.color}40`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = `${activeRole.color}08`;
                  e.target.style.borderColor = activeRole.color;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = `${activeRole.color}40`;
                }}
              >
                Create {activeRole.label} Account
              </button>
            </>
          )}

          {/* Trust badges */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #f3f4f6',
          }}>
            {[
              { icon: '🥗', text: 'Fresh' },
              { icon: '⚡', text: 'Fast' },
              { icon: '🛡️', text: 'Secure' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{
                  fontSize: '10px',
                  color: '#9ca3af',
                  fontWeight: '600',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Footer */}
      <p style={{
        position: 'absolute',
        bottom: '16px',
        color: '#9ca3af',
        fontSize: '12px',
        textAlign: 'center',
        width: '100%',
        margin: 0,
      }}>
        © 2026 Zaplo. Your neighborhood, delivered.
      </p>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}