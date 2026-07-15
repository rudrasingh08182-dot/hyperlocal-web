import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AUTO_SCROLL_MS = 4000;

// Light-purple forward palette
const C = {
  primary: '#7C3AED',       // active dot / accents
  primarySoft: '#C4B5FD',   // light purple
  primaryDeep: '#5B21B6',
  text: '#1F1235',
  badge: '#FFD84D',
};

const POSITION_STYLES = {
  'bottom-left':   { justifyContent: 'flex-end',   alignItems: 'flex-start', textAlign: 'left' },
  'bottom-center': { justifyContent: 'flex-end',   alignItems: 'center',     textAlign: 'center' },
  'bottom-right':  { justifyContent: 'flex-end',   alignItems: 'flex-end',   textAlign: 'right' },
  'top-left':      { justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' },
  'top-center':    { justifyContent: 'flex-start', alignItems: 'center',     textAlign: 'center' },
  'top-right':     { justifyContent: 'flex-start', alignItems: 'flex-end',   textAlign: 'right' },
  'center':        { justifyContent: 'center',     alignItems: 'center',     textAlign: 'center' },
};

export default function HeroBannerCarousel({ banners, onBannerClick }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);
  const total = banners?.length || 0;

  const goTo = useCallback((newIndex, dir) => {
    setDirection(dir);
    setIndex(((newIndex % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(index + 1, 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1, -1), [index, goTo]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) timerRef.current = setInterval(next, AUTO_SCROLL_MS);
  }, [next, total]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (total === 0) return null;

  const banner = banners[index];
  const pos = POSITION_STYLES[banner.text_position] || POSITION_STYLES['bottom-left'];
  const alignSelf =
    pos.alignItems === 'center' ? 'center' :
    pos.alignItems === 'flex-end' ? 'flex-end' : 'flex-start';

  const handleDragEnd = (_e, info) => {
    if (info.offset.x < -50 || info.velocity.x < -400) { resetTimer(); next(); }
    else if (info.offset.x > 50 || info.velocity.x > 400) { resetTimer(); prev(); }
  };

  return (
    <div style={{ padding: '14px 16px 8px' }}>
      {/* Keyframes for shine + corner glow */}
      <style>{`
        @keyframes bannerShine {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          60%  { transform: translateX(220%)  skewX(-20deg); }
          100% { transform: translateX(220%)  skewX(-20deg); }
        }
        @keyframes cornerPulse {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 1;    transform: scale(1.15); }
        }
      `}</style>

      {/* Outer gradient frame (soft purple halo) */}
      <div style={{
        position: 'relative',
        padding: '2px',
        borderRadius: '24px',
        background: `linear-gradient(135deg, ${C.primarySoft} 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, ${C.primary} 100%)`,
        boxShadow: `0 14px 34px rgba(124, 58, 237, 0.22), 0 4px 10px rgba(17,17,39,0.08)`,
      }}>
        <div style={{
          position: 'relative', width: '100%', height: '230px', borderRadius: '22px',
          overflow: 'hidden', background: '#0b0416',
        }}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={banner.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 1.08, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onBannerClick?.(banner)}
              style={{
                position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'pan-y',
                backgroundImage: `url(${banner.image_url})`,
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Legibility gradient */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background:
                  'linear-gradient(to top, rgba(10,4,25,0.78) 0%, rgba(10,4,25,0.25) 45%, rgba(10,4,25,0) 70%)',
              }} />
              {/* Purple side wash */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(115deg, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0) 55%)`,
              }} />

              {/* Diagonal shine sweep */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: '55%',
                pointerEvents: 'none', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-20%', bottom: '-20%', width: '35%',
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                  filter: 'blur(6px)',
                  animation: 'bannerShine 3.6s ease-in-out infinite',
                }} />
              </div>

              {/* Corner sparkles */}
              <div style={{
                position: 'absolute', top: 10, right: 12, width: 10, height: 10, borderRadius: '50%',
                background: 'radial-gradient(circle, #fff 0%, rgba(196,181,253,0.9) 40%, rgba(124,58,237,0) 70%)',
                boxShadow: '0 0 14px 4px rgba(196,181,253,0.75)',
                animation: 'cornerPulse 2.2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', bottom: 12, left: 14, width: 7, height: 7, borderRadius: '50%',
                background: 'radial-gradient(circle, #fff 0%, rgba(196,181,253,0.9) 40%, rgba(124,58,237,0) 70%)',
                boxShadow: '0 0 10px 3px rgba(196,181,253,0.7)',
                animation: 'cornerPulse 2.8s ease-in-out infinite',
              }} />

              {/* Content */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                padding: '18px', pointerEvents: 'none', color: 'white', ...pos,
              }}>
                {banner.discount_badge && (
                  <span style={{
                    alignSelf,
                    background: `linear-gradient(135deg, ${C.badge} 0%, #FFB020 100%)`,
                    color: '#1A1A1A', fontWeight: 800, fontSize: 11,
                    padding: '4px 11px', borderRadius: 999, marginBottom: 8,
                    letterSpacing: '0.03em',
                    boxShadow: '0 4px 12px rgba(255,176,32,0.45)',
                  }}>
                    ✦ {banner.discount_badge}
                  </span>
                )}
                {banner.title && (
                  <div style={{
                    fontSize: 20, fontWeight: 900, lineHeight: 1.2,
                    textShadow: '0 2px 12px rgba(0,0,0,0.55)',
                    letterSpacing: '-0.01em',
                  }}>
                    {banner.title}
                  </div>
                )}
                {banner.subtitle && (
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.95, marginTop: 3 }}>
                    {banner.subtitle}
                  </div>
                )}
                {banner.description && (
                  <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
                    {banner.description}
                  </div>
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                  flexWrap: 'wrap', pointerEvents: 'auto',
                }}>
                  {banner.cta_text && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onBannerClick?.(banner); }}
                      style={{
                        background: `linear-gradient(135deg, #ffffff 0%, ${C.primarySoft} 100%)`,
                        color: C.primaryDeep, border: 'none', borderRadius: 999,
                        padding: '10px 20px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
                        boxShadow: '0 6px 16px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
                      }}>
                      {banner.cta_text} →
                    </button>
                  )}
                  {banner.coupon_code && (
                    <span style={{
                      border: '1.5px dashed rgba(255,255,255,0.85)',
                      background: 'rgba(124,58,237,0.25)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 8, padding: '6px 12px',
                      fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em',
                    }}>
                      🎟 {banner.coupon_code}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Preload next */}
          {total > 1 && (
            <img src={banners[(index + 1) % total].image_url} alt="" style={{ display: 'none' }} />
          )}
        </div>
      </div>

      {/* Indicators */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {banners.map((b, i) => (
            <motion.div key={b.id}
              onClick={() => { resetTimer(); goTo(i, i > index ? 1 : -1); }}
              animate={{ width: i === index ? 22 : 6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                height: 6, borderRadius: 999, cursor: 'pointer',
                background: i === index
                  ? `linear-gradient(90deg, ${C.primarySoft}, ${C.primary})`
                  : '#E4E1EC',
                boxShadow: i === index ? `0 0 8px ${C.primarySoft}` : 'none',
              }} />
          ))}
        </div>
      )}
    </div>
  );
}
