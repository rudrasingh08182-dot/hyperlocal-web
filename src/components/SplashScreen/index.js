import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import useSplashConfig from './useSplashConfig';
import useThreeScene from './useThreeScene';
import { COLORS, DEFAULT_DURATION } from './constants';

export default function SplashScreen({ onFinish, appVersion = '1.0.0' }) {
  const { logoUrl, duration, loading: configLoading, error } = useSplashConfig();
  const [exiting, setExiting] = useState(false);
  const [textIn, setTextIn] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [progress, setProgress] = useState(0);
  const mountRef = useRef(null);

  const handleLogoReady = useCallback(() => setLogoReady(true), []);
  const { cleanup } = useThreeScene(mountRef, logoUrl, handleLogoReady);

  useEffect(() => {
    if (configLoading || skipped) return;
    const totalDuration = duration || DEFAULT_DURATION;
    const interval = 50;
    const step = 100 / (totalDuration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    const exitTimer = setTimeout(() => setExiting(true), totalDuration);
    const finishTimer = setTimeout(() => onFinish?.(), totalDuration + 700);
    const textTimer = setTimeout(() => setTextIn(true), 500);

    return () => {
      clearInterval(timer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
      clearTimeout(textTimer);
    };
  }, [configLoading, duration, skipped, onFinish]);

  const handleSkip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    setExiting(true);
    setTimeout(() => onFinish?.(), 700);
  }, [skipped, onFinish]);

  useEffect(() => {
    if (exiting && window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'light' });
    }
  }, [exiting]);

  const showLoader = configLoading && !logoReady;

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 30%, ${COLORS.bgMid} 0%, ${COLORS.bgStart} 50%, ${COLORS.bgEnd} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.1) translateY(-20px)' : 'scale(1)',
        transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.8s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: exiting ? 'none' : 'auto',
        cursor: 'pointer',
      }}
    >
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {showLoader && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <div className="zpl-spinner" />
        </div>
      )}

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        marginTop: 'clamp(120px, 30vh, 200px)',
        padding: '0 24px',
        opacity: textIn ? 1 : 0,
        transform: textIn ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 'clamp(32px, 9vw, 48px)',
          fontWeight: 900,
          letterSpacing: '0.1em',
          background: 'linear-gradient(135deg, #ffffff 0%, #e9d5ff 50%, #d8b4fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.4))',
        }}>
          ZAPLO
        </div>

        <div style={{
          marginTop: '12px',
          fontSize: 'clamp(11px, 3vw, 14px)',
          fontWeight: 600,
          letterSpacing: '0.2em',
          color: COLORS.textSecondary,
          textTransform: 'uppercase',
        }}>
          Groceries & Food in 45 mins
        </div>

        <div style={{
          marginTop: 'clamp(28px, 7vh, 44px)',
          width: 'clamp(160px, 45vw, 220px)',
          height: '3px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
              borderRadius: '999px',
              boxShadow: '0 0 12px rgba(168,85,247,0.6)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>

        <div style={{
          marginTop: '18px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.25)',
          fontWeight: 500,
          letterSpacing: '0.06em',
        }}>
          Tap anywhere to skip
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1,
        padding: '0 20px',
      }}>
        {error === 'offline' && (
          <span style={{
            fontSize: '10px',
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.12)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontWeight: 600,
          }}>
            ⚡ Offline mode
          </span>
        )}
        <span style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.2)',
          fontWeight: 500,
          letterSpacing: '0.08em',
        }}>
          v{appVersion}
        </span>
      </div>

      <style>{`
        .zpl-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(168,85,247,0.15);
          border-top-color: #a855f7;
          border-radius: 50%;
          animation: zplSpin 0.9s linear infinite;
        }
        @keyframes zplSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}