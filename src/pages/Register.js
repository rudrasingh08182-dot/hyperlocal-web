import API, { registerUser } from '../services/api';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toast, showToast } from '../components/Toast';

/**
 * Zaplo — Register page
 * Redesigned to match the Login screen's visual language:
 *  - Off-white background, white card, subtle shadow
 *  - Indigo accent (#6366f1), dark navy text (#0f172a)
 *  - Role picker as 4 icon cards (Buyer / Seller / Delivery / Admin*)
 *    (Admin is intentionally disabled — admins are created internally)
 *  - Rounded inputs with left icon, clear labels
 *  - FRESH · FAST · SECURE trust strip in the footer
 */

const COLORS = {
  bg: '#f3f4f6',
  topbar: '#1e1b2e',
  card: '#ffffff',
  border: '#e5e7eb',
  inputBg: '#f9fafb',
  text: '#0f172a',
  muted: '#6b7280',
  subtle: '#9ca3af',
  primary: '#6366f1',
  primarySoft: '#eef2ff',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  disabled: '#d1d5db',
};

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'buyer';
  const [role, setRole] = useState(defaultRole);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', name: '', phone: '', password: '', confirmPassword: '',
    shop_name: '', address: '', locality: '', contact_phone: '',
    vehicle_type: '', vehicle_number: '',
  });

  const update = (key, val) => setForm({ ...form, [key]: val });

  const roles = [
    { id: 'buyer',    label: 'Buyer',    icon: '🛒' },
    { id: 'seller',   label: 'Seller',   icon: '🏪' },
    { id: 'delivery', label: 'Delivery', icon: '🚴' },
    { id: 'admin',    label: 'Admin',    icon: '👑', disabled: true },
  ];

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const goToStep2 = () => {
    setError('');
    if (!form.name || !form.username || !form.phone || !form.password) {
      setError('Please fill all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (role === 'seller' && (!form.shop_name || !form.address || !form.locality)) {
      setError('Please fill all shop details');
      return;
    }
    if (role === 'delivery' && (!form.vehicle_type || !form.vehicle_number || !form.locality)) {
      setError('Please fill all delivery details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (role === 'seller') {
        await API.post('/auth/register-seller', {
          username: form.username,
          name: form.name,
          phone: form.phone,
          password: form.password,
          shop_name: form.shop_name,
          address: form.address,
          locality: form.locality,
          contact_phone: form.contact_phone || form.phone,
        });
      } else if (role === 'delivery') {
        await API.post('/auth/register-delivery', {
          username: form.username,
          name: form.name,
          phone: form.phone,
          password: form.password,
          vehicle_type: form.vehicle_type,
          vehicle_number: form.vehicle_number,
          locality: form.locality,
        });
      } else {
        await registerUser({
          username: form.username,
          name: form.name,
          phone: form.phone,
          password: form.password,
          role: 'buyer',
        });
      }

      const messages = {
        seller: 'Registration successful! Please wait for admin approval before logging in.',
        delivery: 'Registration successful! Our team will verify your details shortly.',
        buyer: 'Registration successful! Please login.',
      };
      showToast(messages[role], 'success');
      // Toast is non-blocking (unlike alert), so give the user a moment to
      // actually read the message before redirecting to login.
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------- shared styles --------
  const labelStyle = {
    fontSize: '13px', fontWeight: 700, color: COLORS.text,
    display: 'block', marginBottom: '8px',
  };

  const inputWrapStyle = {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: COLORS.inputBg,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '0 14px',
    transition: 'border-color .15s, background .15s',
  };

  const inputStyle = {
    flex: 1, padding: '14px 0', border: 'none', outline: 'none',
    fontSize: '14px', background: 'transparent', color: COLORS.text,
    fontFamily: 'inherit',
  };

  const iconStyle = { fontSize: '16px', opacity: 0.85 };

  const Field = ({ label, icon, children }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={inputWrapStyle}>
        <span style={iconStyle}>{icon}</span>
        {children}
      </div>
    </div>
  );

  const primaryBtn = (disabled = false) => ({
    width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
    fontSize: '15px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? COLORS.disabled : COLORS.primary,
    color: '#ffffff',
    boxShadow: disabled ? 'none' : '0 6px 16px rgba(99,102,241,0.25)',
    transition: 'transform .05s ease',
  });

  const secondaryBtn = {
    width: '100%', padding: '14px', border: `1.5px solid ${COLORS.border}`,
    borderRadius: '12px', fontSize: '15px', fontWeight: 700,
    background: '#ffffff', color: COLORS.primary, cursor: 'pointer',
  };

  const canSubmitStep1 =
    form.name && form.username && form.phone && form.password && form.confirmPassword;

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <Toast />
      {/* Top navy bar to match login */}
      <div style={{ height: '28px', background: COLORS.topbar, width: '100%' }} />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 40px',
      }}>
        <div style={{
          background: COLORS.card,
          borderRadius: '16px',
          borderTop: `4px solid ${COLORS.primary}`,
          padding: '32px 28px 24px',
          width: '100%', maxWidth: '480px',
          boxShadow: '0 10px 40px rgba(15,23,42,0.06)',
        }}>
          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 14px',
              borderRadius: '14px',
              background: '#1a0a2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(26,10,46,0.25)',
              border: '3px solid #ffffff',
              outline: `1px solid ${COLORS.border}`,
              fontSize: '28px',
            }}>
              <span style={{ color: '#a855f7', fontWeight: 900, fontSize: '20px' }}>Z</span>
            </div>
            <h1 style={{
              margin: 0, fontSize: '26px', fontWeight: 800, color: COLORS.text,
              letterSpacing: '-0.5px',
            }}>Create your account</h1>
            <p style={{ margin: '6px 0 0', color: COLORS.muted, fontSize: '14px' }}>
              Join Zaplo as a{' '}
              <span style={{ color: COLORS.primary, fontWeight: 700 }}>{roleLabel}</span>
            </p>
          </div>

          {/* Role picker — 4 icon cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px', marginBottom: '24px',
          }}>
            {roles.map(r => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  disabled={r.disabled}
                  onClick={() => {
                    if (r.disabled) return;
                    setRole(r.id); setStep(1); setError('');
                  }}
                  title={r.disabled ? 'Admin accounts are created internally' : ''}
                  style={{
                    padding: '14px 6px',
                    borderRadius: '12px',
                    border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
                    background: active ? COLORS.primarySoft : '#ffffff',
                    cursor: r.disabled ? 'not-allowed' : 'pointer',
                    opacity: r.disabled ? 0.5 : 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{r.icon}</span>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: active ? COLORS.primary : COLORS.text,
                  }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stepper (only for multi-step roles) */}
          {(role === 'seller' || role === 'delivery') && (
            <div style={{
              display: 'flex', alignItems: 'center', marginBottom: '22px',
              padding: '0 4px',
            }}>
              {['Personal Info', role === 'seller' ? 'Shop Details' : 'Delivery Details']
                .map((label, i) => {
                  const isActive = step === i + 1;
                  const isDone = step > i + 1;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i === 0 ? 1 : 0 }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 800,
                        background: (isActive || isDone) ? COLORS.primary : '#ffffff',
                        color: (isActive || isDone) ? '#ffffff' : COLORS.subtle,
                        border: `1.5px solid ${(isActive || isDone) ? COLORS.primary : COLORS.border}`,
                      }}>{isDone ? '✓' : i + 1}</div>
                      <span style={{
                        fontSize: '12px', marginLeft: '8px',
                        color: isActive ? COLORS.text : COLORS.subtle,
                        fontWeight: isActive ? 700 : 500,
                      }}>{label}</span>
                      {i === 0 && (
                        <div style={{
                          flex: 1, height: '2px',
                          background: step > 1 ? COLORS.primary : COLORS.border,
                          margin: '0 12px',
                        }} />
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              background: COLORS.dangerSoft,
              border: `1px solid #fecaca`,
              borderRadius: '10px',
              padding: '10px 12px', marginBottom: '16px',
              color: COLORS.danger, fontSize: '13px', fontWeight: 500,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* STEP 1 — Personal info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Full Name" icon="👤">
                <input placeholder="Enter your full name" value={form.name}
                  onChange={e => update('name', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Username" icon="🆔">
                <input placeholder="Choose a username" value={form.username}
                  onChange={e => update('username', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Phone Number" icon="📱">
                <input placeholder="10-digit phone number" value={form.phone}
                  onChange={e => update('phone', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Password" icon="🔒">
                <input placeholder="Create a password"
                  type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => update('password', e.target.value)} style={inputStyle} />
                <span onClick={() => setShowPassword(s => !s)}
                  style={{ cursor: 'pointer', fontSize: '16px', color: COLORS.muted }}>
                  {showPassword ? '🙈' : '👁'}
                </span>
              </Field>
              <Field label="Confirm Password" icon="🔒">
                <input placeholder="Confirm your password"
                  type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} style={inputStyle} />
                <span onClick={() => setShowConfirm(s => !s)}
                  style={{ cursor: 'pointer', fontSize: '16px', color: COLORS.muted }}>
                  {showConfirm ? '🙈' : '👁'}
                </span>
              </Field>

              <button
                onClick={() => (role === 'seller' || role === 'delivery') ? goToStep2() : handleRegister()}
                disabled={loading || !canSubmitStep1}
                style={{ ...primaryBtn(loading || !canSubmitStep1), marginTop: '6px' }}
              >
                {role === 'seller'
                  ? 'Next: Shop Details →'
                  : role === 'delivery'
                    ? 'Next: Delivery Details →'
                    : loading ? 'Creating account…' : `Create ${roleLabel} account`}
              </button>
            </div>
          )}

          {/* STEP 2 — Seller */}
          {step === 2 && role === 'seller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Shop Name" icon="🏪">
                <input placeholder="Enter your shop name" value={form.shop_name}
                  onChange={e => update('shop_name', e.target.value)} style={inputStyle} />
              </Field>
              <div>
                <label style={labelStyle}>Shop Address</label>
                <div style={{ ...inputWrapStyle, alignItems: 'flex-start', padding: '12px 14px' }}>
                  <span style={{ ...iconStyle, marginTop: '2px' }}>📍</span>
                  <textarea placeholder="Full shop address" value={form.address}
                    onChange={e => update('address', e.target.value)}
                    style={{ ...inputStyle, padding: 0, height: '72px', resize: 'none' }} />
                </div>
              </div>
              <Field label="Locality / Area" icon="🗺️">
                <input placeholder="e.g. Varanasi, UP" value={form.locality}
                  onChange={e => update('locality', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Shop Contact Number" icon="☎️">
                <input placeholder="Shop phone (optional)" value={form.contact_phone}
                  onChange={e => update('contact_phone', e.target.value)} style={inputStyle} />
              </Field>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => { setError(''); setStep(1); }} style={secondaryBtn}>
                  ← Back
                </button>
                <button onClick={handleRegister} disabled={loading}
                  style={{ ...primaryBtn(loading), flex: 2, width: 'auto' }}>
                  {loading ? 'Registering…' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Delivery */}
          {step === 2 && role === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Vehicle Type</label>
                <div style={inputWrapStyle}>
                  <span style={iconStyle}>🚙</span>
                  <select value={form.vehicle_type}
                    onChange={e => update('vehicle_type', e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="">Select vehicle</option>
                    <option value="bicycle">🚲 Bicycle</option>
                    <option value="motorcycle">🏍️ Motorcycle</option>
                    <option value="scooter">🛵 Scooter</option>
                    <option value="car">🚗 Car</option>
                  </select>
                </div>
              </div>
              <Field label="Vehicle Number" icon="🔢">
                <input placeholder="e.g. UP32 AB 1234" value={form.vehicle_number || ''}
                  onChange={e => update('vehicle_number', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Your Locality / Area" icon="🗺️">
                <input placeholder="e.g. Varanasi, UP" value={form.locality || ''}
                  onChange={e => update('locality', e.target.value)} style={inputStyle} />
              </Field>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => { setError(''); setStep(1); }} style={secondaryBtn}>
                  ← Back
                </button>
                <button onClick={handleRegister} disabled={loading}
                  style={{ ...primaryBtn(loading), flex: 2, width: 'auto' }}>
                  {loading ? 'Registering…' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}

          {/* Divider + sign in link */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: '24px 0 16px',
          }}>
            <div style={{ flex: 1, height: '1px', background: COLORS.border }} />
            <span style={{ fontSize: '12px', color: COLORS.subtle }}>Already on Zaplo?</span>
            <div style={{ flex: 1, height: '1px', background: COLORS.border }} />
          </div>

          <button onClick={() => navigate('/login')} style={secondaryBtn}>
            Sign in instead
          </button>

          {/* Trust badges */}
          <div style={{
            marginTop: '22px', paddingTop: '18px',
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex', justifyContent: 'center', gap: '28px',
          }}>
            {[
              { icon: '🥗', label: 'FRESH' },
              { icon: '⚡', label: 'FAST'  },
              { icon: '🛡️', label: 'SECURE' },
            ].map(b => (
              <div key={b.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px' }}>{b.icon}</div>
                <div style={{
                  fontSize: '10px', fontWeight: 800, color: COLORS.muted,
                  letterSpacing: '1px', marginTop: '4px',
                }}>{b.label}</div>
              </div>
            ))}
          </div>

          <p style={{
            textAlign: 'center', margin: '16px 0 0',
            color: COLORS.subtle, fontSize: '12px',
          }}>
            © 2026 Zaplo. Your neighborhood, delivered.
          </p>
        </div>
      </div>
    </div>
  );
}
