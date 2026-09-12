import { useState } from 'react';
import { loginUser, buyerEntry } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  // ── Buyer: passwordless entry (phone + pincode) — PRIMARY flow ──
  const [buyerForm, setBuyerForm] = useState({ phone: '', pincode: '' });
  const [buyerError, setBuyerError] = useState('');
  const [buyerLoading, setBuyerLoading] = useState(false);

  // ── Staff: Seller / Delivery / Admin (phone + password) — UNCHANGED ──
  const [role, setRole] = useState('seller');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  /* ────────────────────────────────────────────────────────────
     BUYER ENTRY — pincode is NEVER used to block the buyer here.
     Whatever the backend returns (serviceable true/false), the buyer
     ALWAYS continues to /buyer. The flag only travels with the user
     object so BuyerDashboard can show an informational banner.
     ──────────────────────────────────────────────────────────── */
  const handleBuyerEntry = async () => {
    setBuyerError('');

    // Frontend validates FORMAT only (10-digit phone, 6-digit pincode).
    // Whether the pincode is serviceable is the backend's job.
    if (!/^\d{10}$/.test(buyerForm.phone)) {
      setBuyerError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!/^\d{6}$/.test(buyerForm.pincode)) {
      setBuyerError('Please enter a valid 6-digit pincode');
      return;
    }

    setBuyerLoading(true);
    try {
      const res = await buyerEntry({
        phone: buyerForm.phone.trim(),
        pincode: buyerForm.pincode.trim(),
      });

      localStorage.setItem('token', res.data.token);
      // Normalize serviceable onto the stored user so BuyerDashboard
      // can read user.serviceable safely.
      const user = { ...res.data.user, serviceable: res.data.serviceable };
      localStorage.setItem('user', JSON.stringify(user));

      // location.replace (not href) — swaps the login page out of history
      // so pressing Back after entry never lands the user back on login.
      window.location.replace('/buyer');
    } catch (err) {
      setBuyerError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setBuyerLoading(false);
    }
  };

  /* ── Staff login — EXISTING logic, untouched ── */
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loginUser({ ...form, role });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const userRole = res.data.user.role;
      if (userRole === 'admin') window.location.replace('/admin');
      else if (userRole === 'seller') window.location.replace('/seller');
      else if (userRole === 'delivery') window.location.replace('/delivery');
      else window.location.replace('/buyer');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  const staffRoles = [
    { id: 'seller', label: 'Seller', icon: '🏪', color: '#f59e0b' },
    { id: 'delivery', label: 'Delivery', icon: '🚴', color: '#10b981' },
    { id: 'admin', label: 'Admin', icon: '👑', color: '#ef4444' },
  ];

  const activeRole = staffRoles.find(r => r.id === role);

  const BUYER_GREEN = '#0C831F';

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
          background: `linear-gradient(90deg, ${BUYER_GREEN}, ${activeRole.color})`,
          transition: 'background 0.3s ease',
        }} />

        <div style={{ padding: '28px 24px 24px' }}>

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#f9fafb',
              borderRadius: '14px',
              margin: '0 auto 12px',
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
                  e.target.parentElement.innerHTML = '<span style="font-size:28px;">⚡</span>';
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
              Welcome to Zaplo
            </h1>
            <p style={{
              margin: 0,
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '400',
            }}>
              Your neighbourhood, delivered ⚡
            </p>
          </div>

          {/* ══════════════════════════════════════════════
              BUYER SECTION — primary entry (no password!)
              ══════════════════════════════════════════════ */}
          <div style={{
            background: '#EAF6EC',
            border: `1.5px solid ${BUYER_GREEN}33`,
            borderRadius: '14px',
            padding: '18px 16px 16px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>🛒</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: BUYER_GREEN, letterSpacing: '0.02em' }}>
                SHOP ON ZAPLO
              </span>
            </div>
            <p style={{
              margin: '0 0 14px 0',
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.5',
            }}>
              Enter your mobile number and area pincode to continue.
            </p>

            {/* Buyer error */}
            {buyerError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <p style={{ margin: 0, fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                  {buyerError}
                </p>
              </div>
            )}

            {/* Mobile Number */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px',
              }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px',
                  color: '#9ca3af',
                }}>
                  📱
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={buyerForm.phone}
                  onChange={e => setBuyerForm({ ...buyerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    background: 'white',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = BUYER_GREEN;
                    e.target.style.boxShadow = `0 0 0 3px ${BUYER_GREEN}15`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Area Pincode */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px',
              }}>
                Area Pincode
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px',
                  color: '#9ca3af',
                }}>
                  📍
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit area pincode"
                  value={buyerForm.pincode}
                  onChange={e => setBuyerForm({ ...buyerForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  onKeyDown={e => e.key === 'Enter' && handleBuyerEntry()}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    background: 'white',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = BUYER_GREEN;
                    e.target.style.boxShadow = `0 0 0 3px ${BUYER_GREEN}15`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Continue Button — ALWAYS goes to /buyer, pincode never blocks */}
            <button
              onClick={handleBuyerEntry}
              disabled={buyerLoading || buyerForm.phone.length !== 10 || buyerForm.pincode.length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                background: (buyerLoading || buyerForm.phone.length !== 10 || buyerForm.pincode.length !== 6)
                  ? '#d1d5db'
                  : `linear-gradient(135deg, ${BUYER_GREEN}, #16A34A)`,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                fontFamily: 'inherit',
                cursor: (buyerLoading || buyerForm.phone.length !== 10 || buyerForm.pincode.length !== 6) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {buyerLoading ? (
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
                  Please wait...
                </>
              ) : (
                'Continue →'
              )}
            </button>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '4px 0 20px 0',
          }}>
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{
              padding: '0 14px',
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.05em',
            }}>
              OR
            </span>
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          {/* ══════════════════════════════════════════════
              STAFF SECTION — Seller / Delivery / Admin
              Existing role-based login, visually secondary.
              ══════════════════════════════════════════════ */}
          <p style={{
            margin: '0 0 12px 0',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: '#9ca3af',
            letterSpacing: '0.05em',
          }}>
            SELLER / DELIVERY / ADMIN LOGIN
          </p>

          {/* Role Selector (staff only) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            marginBottom: '16px',
          }}>
            {staffRoles.map(r => (
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

          {/* Staff Login Button */}
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

          {/* Staff registration links (Seller / Delivery only — never Admin) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '18px 0',
          }}>
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{
              padding: '0 14px',
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: '500',
            }}>
              New {role === 'admin' ? 'here' : `${activeRole.label}`}?
            </span>
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          {role !== 'admin' ? (
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
              Register as {activeRole.label}
            </button>
          ) : (
            <p style={{
              textAlign: 'center',
              margin: 0,
              fontSize: '12px',
              color: '#9ca3af',
            }}>
              Admin accounts are created internally by Zaplo.
            </p>
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