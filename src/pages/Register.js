import API, { registerUser } from '../services/api';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'buyer';
  const [role, setRole] = useState(defaultRole);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', name: '', phone: '', password: '', confirmPassword: '',
    shop_name: '', address: '', locality: '', contact_phone: '',
    vehicle_type: '', vehicle_number: '',
  });

  // ── OTP state ──
  const [otpStage, setOtpStage] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const validateStep1 = () => {
    setError('');
    if (!form.name || !form.username || !form.phone || !form.password) {
      setError('Please fill all required fields');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match!');
      return false;
    }
    return true;
  };

  // Step 1 "Next" button now sends OTP instead of going straight to step 2 / register
  const sendRegistrationOtp = async () => {
    if (!validateStep1()) return;
    setSendingOtp(true);
    setError('');
    try {
      await API.post('/auth/send-otp', { phone: form.phone, purpose: 'register' });
      setOtpStage('otp');
      setResendTimer(30);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setSendingOtp(true);
    setError('');
    try {
      await API.post('/auth/send-otp', { phone: form.phone, purpose: 'register' });
      setResendTimer(30);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyRegistrationOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setVerifyingOtp(true);
    setError('');
    try {
      const res = await API.post('/auth/verify-otp', { phone: form.phone, otp, purpose: 'register' });
      setOtpToken(res.data.token);

      // OTP verified — proceed to next step
      if (role === 'seller' || role === 'delivery') {
        setStep(2);
      } else {
        await completeRegistration(res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const completeRegistration = async (verifiedToken) => {
    const tokenToUse = verifiedToken || otpToken;

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
          otpToken: tokenToUse,
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
          otpToken: tokenToUse,
        });
      } else {
        await registerUser({
          username: form.username,
          name: form.name,
          phone: form.phone,
          password: form.password,
          role: 'buyer',
          otpToken: tokenToUse,
        });
      }

      const messages = {
        seller: 'Registration successful! Please wait for admin approval before logging in.',
        delivery: 'Registration successful! Our team will verify your details shortly.',
        buyer: 'Registration successful! Please login.',
      };
      alert(messages[role]);
      navigate('/login');

    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px', border: '1.5px solid #e8e8e8',
    borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px'
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', sans-serif", padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', padding: '40px',
        width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '16px', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px'
          }}>📝</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1a1a2e' }}>Create Account</h2>
          <p style={{ margin: '4px 0 0', color: '#999', fontSize: '14px' }}>Join Zaplo today</p>
        </div>

        {/* Role Toggle — hidden once OTP stage starts */}
        {otpStage === 'form' && (
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '24px',
            background: '#f5f5f5', borderRadius: '12px', padding: '4px'
          }}>
            {[
              { id: 'buyer', label: '🛒 Buyer' },
              { id: 'seller', label: '🏪 Seller' },
              { id: 'delivery', label: '🚴 Delivery Boy' }
            ].map(r => (
              <button key={r.id} onClick={() => { setRole(r.id); setStep(1); setError(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                  background: role === r.id ? 'white' : 'transparent',
                  color: role === r.id ? '#667eea' : '#999',
                  boxShadow: role === r.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Step indicator for seller/delivery */}
        {(role === 'seller' || role === 'delivery') && otpStage === 'form' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            {[
              'Personal Info',
              role === 'seller' ? 'Shop Details' : 'Delivery Details'
            ].map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700',
                  background: step > i ? '#667eea' : step === i + 1 ? '#667eea' : '#e8e8e8',
                  color: step >= i + 1 ? 'white' : '#999',
                }}>{i + 1}</div>
                <span style={{
                  fontSize: '12px', marginLeft: '6px',
                  color: step === i + 1 ? '#667eea' : '#999',
                  fontWeight: step === i + 1 ? '600' : '400'
                }}>{label}</span>
                {i === 0 && (
                  <div style={{
                    flex: 1, height: '2px',
                    background: step > 1 ? '#667eea' : '#e8e8e8', margin: '0 8px'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px',
            padding: '12px', marginBottom: '16px', color: '#e17055', fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* STEP 1 - Personal Info */}
        {step === 1 && otpStage === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input placeholder="Enter your full name" value={form.name}
                onChange={e => update('name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <input placeholder="Choose a username" value={form.username}
                onChange={e => update('username', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input placeholder="10-digit phone number" value={form.phone}
                onChange={e => update('phone', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input placeholder="Create a password" type="password" value={form.password}
                onChange={e => update('password', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input placeholder="Confirm your password" type="password" value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)} style={inputStyle} />
            </div>

            <button
              onClick={sendRegistrationOtp}
              disabled={sendingOtp}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                opacity: sendingOtp ? 0.7 : 1,
              }}>
              {sendingOtp ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </div>
        )}

        {/* OTP VERIFICATION SCREEN */}
        {otpStage === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', textAlign: 'center' }}>
              We've sent a 6-digit OTP to <strong>{form.phone}</strong>
            </p>
            <div>
              <label style={labelStyle}>Enter OTP</label>
              <input
                placeholder="6-digit OTP"
                value={otp}
                maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyRegistrationOtp()}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '700' }}
              />
            </div>

            <button onClick={verifyRegistrationOtp} disabled={verifyingOtp}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                opacity: verifyingOtp ? 0.7 : 1,
              }}>
              {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px', color: '#999' }}>
              {resendTimer > 0 ? (
                <span>Resend OTP in {resendTimer}s</span>
              ) : (
                <span onClick={resendOtp} style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer' }}>
                  Resend OTP
                </span>
              )}
            </div>

            <button onClick={() => { setOtpStage('form'); setOtp(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
              ← Change phone number
            </button>
          </div>
        )}

        {/* STEP 2 - Shop Details */}
        {step === 2 && role === 'seller' && otpStage === 'otp' === false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Shop Name</label>
              <input placeholder="Enter your shop name" value={form.shop_name}
                onChange={e => update('shop_name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shop Address</label>
              <textarea placeholder="Full shop address" value={form.address}
                onChange={e => update('address', e.target.value)}
                style={{ ...inputStyle, height: '80px', resize: 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Locality / Area</label>
              <input placeholder="e.g. Varanasi, UP" value={form.locality}
                onChange={e => update('locality', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shop Contact Number</label>
              <input placeholder="Shop phone (optional)" value={form.contact_phone}
                onChange={e => update('contact_phone', e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setError(''); setStep(1); setOtpStage('form'); }}
                style={{
                  flex: 1, padding: '14px', background: '#f0f0f0',
                  color: '#666', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                }}>
                ← Back
              </button>
              <button onClick={() => completeRegistration()} disabled={loading}
                style={{
                  flex: 2, padding: '14px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: '700', cursor: 'pointer'
                }}>
                {loading ? 'Registering...' : '🎉 Complete Registration'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 - Delivery Boy Details */}
        {step === 2 && role === 'delivery' && otpStage === 'otp' === false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} style={inputStyle}>
                <option value="">Select vehicle</option>
                <option value="bicycle">🚲 Bicycle</option>
                <option value="motorcycle">🏍️ Motorcycle</option>
                <option value="scooter">🛵 Scooter</option>
                <option value="car">🚗 Car</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vehicle Number</label>
              <input placeholder="e.g. UP32 AB 1234" value={form.vehicle_number || ''}
                onChange={e => update('vehicle_number', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Your Locality / Area</label>
              <input placeholder="e.g. Varanasi, UP" value={form.locality || ''}
                onChange={e => update('locality', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setError(''); setStep(1); setOtpStage('form'); }}
                style={{ flex: 1, padding: '14px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={() => completeRegistration()} disabled={loading}
                style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                {loading ? 'Registering...' : '🎉 Complete Registration'}
              </button>
            </div>
          </div>
        )}

        {/* Login Link */}
        {otpStage === 'form' && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '14px' }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')}
              style={{ color: '#667eea', fontWeight: '700', cursor: 'pointer' }}>
              Sign In
            </span>
          </p>
        )}
      </div>
    </div>
  );
}