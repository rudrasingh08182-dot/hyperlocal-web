import React from 'react';

export default function OfflinePage({ onRetry }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
    }}>
      {/* Top half — matte lime */}
      <div style={{
        flex: 1,
        background: '#E8F5A8', // matte lime
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: '20px',
      }}>
        {/* Sad WiFi Icon */}
        <div style={{
          width: '140px',
          height: '140px',
          background: '#fff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          {/* SVG Sad WiFi */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* X eyes */}
            <path d="M26 32L32 26M32 32L26 26" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round"/>
            <path d="M48 32L54 26M54 32L48 26" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round"/>
            {/* Sad mouth */}
            <path d="M28 52C28 52 34 44 40 44C46 44 52 52 52 52" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round"/>
            {/* WiFi arcs — broken/faded */}
            <path d="M18 64C18 64 28 56 40 56C52 56 62 64 62 64" stroke="#C4C4C4" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
            <path d="M24 70C24 70 31 65 40 65C49 65 56 70 56 70" stroke="#D9D9D9" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* Bottom half — matte white */}
      <div style={{
        flex: 1,
        background: '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          margin: '0 0 10px',
          fontSize: '32px',
          fontWeight: 700,
          color: '#2D2D3A',
          letterSpacing: '-0.5px',
          fontFamily: "'Poppins', sans-serif",
        }}>
          No Internet Connection
        </h1>

        <p style={{
          margin: '0 0 6px',
          fontSize: '15px',
          color: '#6B6B7B',
          fontWeight: 500,
        }}>
          Slow or no Internet connection
        </p>

        <p style={{
          margin: '0 0 36px',
          fontSize: '13px',
          color: '#9A9AA8',
          fontWeight: 400,
        }}>
          Check your connection or try again
        </p>

        {/* Matte yellow button */}
        <button
          onClick={onRetry}
          style={{
            padding: '14px 48px',
            background: '#E8F5A8',
            color: '#2D2D3A',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 0 #C5D684', // matte depth shadow
            transition: 'all 0.1s ease',
          }}
          onMouseDown={(e) => {
            e.target.style.transform = 'translateY(4px)';
            e.target.style.boxShadow = '0 0 0 #C5D684';
          }}
          onMouseUp={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 0 #C5D684';
          }}
          onTouchStart={(e) => {
            e.target.style.transform = 'translateY(4px)';
            e.target.style.boxShadow = '0 0 0 #C5D684';
          }}
          onTouchEnd={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 0 #C5D684';
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}