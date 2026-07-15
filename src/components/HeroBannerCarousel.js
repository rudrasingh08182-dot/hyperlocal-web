import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AUTO_SCROLL_MS = 4000;

// Matches BuyerDashboard's Blinkit-inspired token palette so the carousel
// blends in seamlessly without needing the parent to pass a theme prop.
const C = {
  primary: '#0C831F',
  accent: '#7C3AED',
  text: '#1F1F1F',
};

const POSITION_STYLES = {
  'bottom-left':   { justifyContent: 'flex-end',   alignItems: 'flex-start', textAlign: 'left' },
  'bottom-center': { justifyContent: 'flex-end',   alignItems: 'center',     textAlign: 'center' },
  'bottom-right':  { justifyContent: 'flex-end',   alignItems: 'flex-end',   textAlign: 'right' },
  'top-left':      { justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' },
  'top-center':    { justifyContent: 'flex-start', alignItems: 'center',     textAlign: 'center' },
  'top-right':     { justifyContent: 'flex-start', alignItems: 'flex-end',   textAlign: 'right' },
  'center':        { justifyContent: 'center',      alignItems: 'center',     textAlign: 'center' },
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

  // Never render an empty carousel or placeholder — hide completely.
  if (total === 0) return null;

  const banner = banners[index];
  const pos = POSITION_STYLES[banner.text_position] || POSITION_STYLES['bottom-left'];
  const alignSelf = pos.alignItems === 'center' ? 'center' : pos.alignItems === 'flex-end' ? 'flex-end' : 'flex-start';

  const handleDragEnd = (e, info) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;
    if (swipe < -50 || velocity < -400) { resetTimer(); next(); }
    else if (swipe > 50 || velocity > 400) { resetTimer(); prev(); }
  };

  return (
    <div style={{ padding: '14px 16px 6px' }}>
      <div style={{
        position: 'relative', width: '100%', height: '224px', borderRadius: '22px',
        overflow: 'hidden', boxShadow: '0 10px 28px rgba(17,17,39,0.14)',
      }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={banner.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 1.08, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onBannerClick?.(banner)}
            style={{
              position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'pan-y',
              backgroundImage: `url(${banner.image_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            }}>
            {/* Gradient so text stays legible over any uploaded image */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.2) 42%, rgba(0,0,0,0) 68%)',
            }} />

            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              padding: '18px', pointerEvents: 'none', color: 'white', ...pos,
            }}>
              {banner.discount_badge && (
                <span style={{
                  alignSelf, background: '#FFC83D', color: '#1A1A1A', fontWeight: '800',
                  fontSize: '11px', padding: '4px 11px', borderRadius: '999px', marginBottom: '8px', letterSpacing: '0.02em',
                }}>
                  {banner.discount_badge}
                </span>
              )}
              {banner.title && (
                <div style={{ fontSize: '19px', fontWeight: '800', lineHeight: '1.2', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
                  {banner.title}
                </div>
              )}
              {banner.subtitle && (
                <div style={{ fontSize: '12.5px', fontWeight: '600', opacity: 0.95, marginTop: '3px' }}>
                  {banner.subtitle}
                </div>
              )}
              {banner.description && (
                <div style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px' }}>
                  {banner.description}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap', pointerEvents: 'auto' }}>
                {banner.cta_text && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onBannerClick?.(banner); }}
                    style={{
                      background: 'white', color: C.text, border: 'none', borderRadius: '999px',
                      padding: '9px 19px', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer',
                    }}>
                    {banner.cta_text}
                  </button>
                )}
                {banner.coupon_code && (
                  <span style={{
                    border: '1.5px dashed rgba(255,255,255,0.85)', borderRadius: '8px',
                    padding: '6px 12px', fontSize: '11.5px', fontWeight: '800', letterSpacing: '0.05em',
                  }}>
                    {banner.coupon_code}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Preload the next image so the swipe/auto-scroll feels instant */}
        {total > 1 && (
          <img src={banners[(index + 1) % total].image_url} alt="" style={{ display: 'none' }} />
        )}
      </div>

      {/* Indicators */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '10px' }}>
          {banners.map((b, i) => (
            <motion.div key={b.id}
              onClick={() => { resetTimer(); goTo(i, i > index ? 1 : -1); }}
              animate={{ width: i === index ? 20 : 6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                height: '6px', borderRadius: '999px', cursor: 'pointer',
                background: i === index ? C.primary : '#D9D9E3',
              }} />
          ))}
        </div>
      )}
    </div>
  );
}