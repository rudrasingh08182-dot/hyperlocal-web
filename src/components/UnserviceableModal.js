import React from 'react';

export default function UnserviceableModal({ isOpen, onClose, pincode }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '24px', padding: '32px 24px',
        maxWidth: '440px', width: '100%', textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}>
        <div style={{ fontSize: '54px', marginBottom: '12px' }}>📍</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
          We're Coming Soon!
        </h2>
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
          Sorry! Zaplo is currently not available in your area <strong>({pincode || 'your pincode'})</strong>.<br/>
          We're expanding rapidly and will launch there soon.<br/><br/>
          Thank you for joining Zaplo ❤️
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            background: '#6366f1', color: '#ffffff', border: 'none',
            fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
          }}
        >
          Explore App
        </button>
      </div>
    </div>
  );
}
