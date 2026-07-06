import { useState, useEffect } from 'react';
import { loginUser } from '../services/api';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [role, setRole] = useState('buyer');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Forgot Password state ──
  // mode: 'login' | 'forgot-phone' | 'forgot-otp' | 'forgot-newpassword' | 'forgot-done'
  const [mode, setMode] = useState('login');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

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
    { id: 'buyer', label: 'Buyer', icon: '🛒' },
    { id: 'seller', label: 'Seller', icon: '🏪' },
    { id: 'admin', label: 'Admin', icon: '👑' },
    { id: 'delivery', label: 'Delivery', icon: '🚴' },
  ];

  // ── Forgot Password handlers ──
  const resetForgotState = () => {
    setMode('login');
    setForgotPhone(''); setForgotOtp(''); setForgotToken('');
    setNewPassword(''); setConfirmNewPassword('');
    setForgotError(''); setResendTimer(0);
  };

  const sendForgotOtp = async () => {
    setForgotError('');
    if (!/^[6-9]\d{9}$/.test(forgotPhone)) {
      setForgotError('Please enter a valid 10-digit mobile number');
      return;
    }
    setForgotLoading(true);
    try {
      await API.post('/auth/send-otp', { phone: forgotPhone, purpose: 'forgot_password' });
      setMode('forgot-otp');
      setResendTimer(30);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    if (resendTimer > 0) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      await API.post('/auth/send-otp', { phone: forgotPhone, purpose: 'forgot_password' });
      setResendTimer(30);
      setForgotOtp('');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    setForgotError('');
    if (forgotOtp.length !== 6) {
      setForgotError('Please enter the 6-digit OTP');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await API.post('/auth/verify-otp', { phone: forgotPhone, otp: forgotOtp, purpose: 'forgot_password' });
      setForgotToken(res.data.token);
      setMode('forgot-newpassword');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const savePasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const saveNewPassword = async () => {
    setForgotError('');
    if (!savePasswordRegex.test(newPassword)) {
      setForgotError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match!');
      return;
    }
    setForgotLoading(true);
    try {
      await API.post('/auth/reset-password', { phone: forgotPhone, token: forgotToken, newPassword });
      setMode('forgot-done');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px', border: '1.5px solid #e8e8e8', borderRadius: '12px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' };

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
          <p style={{ margin: '4px 0 0', color: '#999', fontSize: '14px' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
          </p>
        </div>

        {/* ══════════════ LOGIN MODE ══════════════ */}
        {mode === 'login' && (
          <>
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
              <label style={labelStyle}>Phone Number</label>
              <input
                placeholder={`Enter your ${role} phone number`}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Password</label>
              <input
                placeholder="Enter your password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={inputStyle}
              />
            </div>

            {/* Forgot Password link */}
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span onClick={() => { resetForgotState(); setMode('forgot-phone'); }}
                style={{ color: '#667eea', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Forgot Password?
              </span>
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

            {/* Register Link */}
            {role !== 'admin' && role !== 'delivery' && (
              <p style={{ textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '14px' }}>
                Don't have an account?{' '}
                <span onClick={() => navigate(`/register?role=${role}`)}
                  style={{ color: '#667eea', fontWeight: '700', cursor: 'pointer' }}>
                  Register as {role === 'buyer' ? 'Buyer' : 'Seller'}
                </span>
              </p>
            )}
          </>
        )}

        {/* ══════════════ FORGOT PASSWORD: Enter Phone ══════════════ */}
        {mode === 'forgot-phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {forgotError && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px', padding: '12px', color: '#e17055', fontSize: '13px', textAlign: 'center' }}>
                {forgotError}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Enter the mobile number linked to your account. We'll send you an OTP to reset your password.
            </p>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input placeholder="10-digit phone number" value={forgotPhone}
                onChange={e => setForgotPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && sendForgotOtp()}
                style={inputStyle} />
            </div>
            <button onClick={sendForgotOtp} disabled={forgotLoading}
              style={{
                width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
                fontWeight: '700', cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1,
              }}>
              {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <span onClick={resetForgotState}
              style={{ textAlign: 'center', color: '#999', fontSize: '13px', cursor: 'pointer' }}>
              ← Back to login
            </span>
          </div>
        )}

        {/* ══════════════ FORGOT PASSWORD: OTP Verification ══════════════ */}
        {mode === 'forgot-otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {forgotError && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px', padding: '12px', color: '#e17055', fontSize: '13px', textAlign: 'center' }}>
                {forgotError}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '14px', color: '#666', textAlign: 'center' }}>
              We've sent a 6-digit OTP to <strong>{forgotPhone}</strong>
            </p>
            <div>
              <label style={labelStyle}>Enter OTP</label>
              <input
                placeholder="6-digit OTP"
                value={forgotOtp}
                maxLength={6}
                onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyForgotOtp()}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '700' }}
              />
            </div>
            <button onClick={verifyForgotOtp} disabled={forgotLoading}
              style={{
                width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
                fontWeight: '700', cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1,
              }}>
              {forgotLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#999' }}>
              {resendTimer > 0 ? (
                <span>Resend OTP in {resendTimer}s</span>
              ) : (
                <span onClick={resendForgotOtp} style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer' }}>
                  Resend OTP
                </span>
              )}
            </div>
            <span onClick={() => setMode('forgot-phone')}
              style={{ textAlign: 'center', color: '#999', fontSize: '13px', cursor: 'pointer' }}>
              ← Change phone number
            </span>
          </div>
        )}

        {/* ══════════════ FORGOT PASSWORD: New Password ══════════════ */}
        {mode === 'forgot-newpassword' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {forgotError && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px', padding: '12px', color: '#e17055', fontSize: '13px', textAlign: 'center' }}>
                {forgotError}
              </div>
            )}
            <div>
              <label style={labelStyle}>New Password</label>
              <input placeholder="Create a new password" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
              <p style={{ fontSize: '11px', color: '#999', margin: '6px 0 0' }}>
                Min 8 characters, with uppercase, lowercase, a number, and a special character.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input placeholder="Confirm new password" type="password" value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveNewPassword()}
                style={inputStyle} />
            </div>
            <button onClick={saveNewPassword} disabled={forgotLoading}
              style={{
                width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
                fontWeight: '700', cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1,
              }}>
              {forgotLoading ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        )}

        {/* ══════════════ FORGOT PASSWORD: Done ══════════════ */}
        {mode === 'forgot-done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Password Updated Successfully</h3>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>
              You can now sign in with your new password.
            </p>
            <button onClick={resetForgotState}
              style={{
                width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px',
                fontWeight: '700', cursor: 'pointer',
              }}>
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}