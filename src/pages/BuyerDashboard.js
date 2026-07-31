import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import TermsAndConditions from '../components/TermsAndConditions';
import { Toast, showToast } from '../components/Toast';
import HeroBannerCarousel from '../components/HeroBannerCarousel';
import UnserviceableModal from '../components/UnserviceableModal';
import OfflinePage from '../components/OfflinePage';

/* ============================================================
   ZAPLO — BLINKIT-INSPIRED DESIGN SYSTEM
   Punchy, dense, quick-commerce. All backend routes/APIs are
   UNCHANGED — this file only redesigns the visual layer.
   ============================================================ */
const T = {
  // Brand
  primary: '#0C831F',           // Blinkit green (buttons, CTAs, active)
  primaryDark: '#067312',
  primaryGradient: 'linear-gradient(135deg, #0C831F 0%, #16A34A 100%)',

  // Header / accent
  headerYellow: '#7C3AED',      // Blinkit signature yellow
  headerYellowDark: '#6D28D9',
  headerGradient: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',

  accent: '#A78BFA',
  success: '#0C831F',
  successGradient: 'linear-gradient(135deg, #0C831F 0%, #16A34A 100%)',
  error: '#E11D48',

  // Surfaces
  bg: '#F5F6F7',
  card: '#FFFFFF',
  chipBg: '#F0F5F1',

  // Text
  text: '#1F1F1F',
  textSoft: '#6E6E6E',
  textFaint: '#9CA3AF',
  border: '#EBEBEB',
  borderStrong: '#DADADA',

  // Tints
  primaryTint: '#EAF6EC',
  accentTint: '#EDE9FE',
  successTint: '#EAF6EC',
  errorTint: '#FDECEF',

  // Radius (tighter, more Blinkit-ish)
  radiusLg: '16px',
  radiusMd: '12px',
  radiusSm: '8px',
  radiusPill: '999px',

  // Shadows (crisp, subtle)
  shadowSoft: '0 2px 8px rgba(17, 17, 39, 0.05)',
  shadowCard: '0 1px 3px rgba(17, 17, 39, 0.06), 0 1px 2px rgba(17,17,39,0.04)',
  shadowFloating: '0 8px 20px rgba(12, 131, 31, 0.22)',
  shadowHeader: '0 4px 12px rgba(124, 58, 237, 0.25)',

  font: "'Okra', 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

// Optimizes Cloudinary image URLs for fast loading — resizes & compresses on the fly
const optimizeImage = (url, width = 400) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  // q_auto:best (higher quality floor than plain q_auto) + dpr_auto (serves
  // 2x/3x resolution automatically on retina phones instead of blurry upscale)
  return url.replace('/upload/', `/upload/w_${width},q_auto:best,f_auto,dpr_auto/`);
};

// Fisher-Yates shuffle — fair rotation across sellers
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    body { margin: 0; }
    ::-webkit-scrollbar { display: none; }
    input, textarea, button { font-family: inherit; }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .zpl-skeleton { background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%); background-size: 800px 100%; animation: shimmer 1.4s linear infinite; }
    @keyframes bounce-in { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  `}</style>
);

const btnTap = { whileTap: { scale: 0.96 } };

const useCart = () => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('zaplo_cart');
    return saved ? JSON.parse(saved) : [];
  });

    useEffect(() => {
    localStorage.setItem('zaplo_cart', JSON.stringify(cart));
  }, [cart]);

  const getCartKey = (productId, variantId) => variantId ? `${productId}::${variantId}` : productId;

  const addToCart = (product, variant = null) => {
    const cartKey = getCartKey(product.id, variant?.id);
    setCart(prev => {
      const exists = prev.find(i => i.cartKey === cartKey);
      if (exists) return prev.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        ...product,
        cartKey,
        variant: variant || null,
        price: variant ? variant.price : product.price,
        qty: 1,
      }];
    });
  };

  const removeFromCart = (cartKey) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));

  const updateQty = (cartKey, qty) => {
    if (qty === 0) return removeFromCart(cartKey);
    setCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, qty } : i));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('zaplo_cart');
  };
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  return { cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount, getCartKey };
};

const categories = [
  { id: 'all', label: 'All', emoji: '🛍️', image: null },
  { id: 'grocery', label: 'Grocery', emoji: '🛒', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233795/maria-lin-kim-8RaUEd8zD-U-unsplash_qoqtal.jpg' },
  { id: 'fresh', label: 'Fresh', emoji: '🥬', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233768/jonas-kakaroto-B77ypBmpYuw-unsplash_nfcdrd.jpg' },
  { id: 'electronics', label: 'Electronics', emoji: '🎧', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233820/sebastian-banasiewcz-oXXc-s5nNy8-unsplash_ulul8x.jpg' },
  { id: 'fashion', label: 'Fashion', emoji: '👕', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233681/artem-beliaikin-UdQt3FT6rxM-unsplash_atgfs1.jpg' },
  { id: 'food', label: 'Food', emoji: '🍔', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233754/david-foodphototasty-E94j3rMcxlw-unsplash_qhm984.jpg' },
  { id: 'stationery', label: 'Stationery', emoji: '📚', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233835/tim-gouw-KigTvXqetXA-unsplash_s4gm0v.jpg' },
  { id: 'medical', label: 'Medical', emoji: '💊', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1783233743/christine-sandu-jwWtZrm67VI-unsplash_lsfqny.jpg' },
  { id: 'sweets', label: 'Sweets & Confectionery', emoji: '🍬', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1784435004/WhatsApp_Image_2026-07-19_at_9.46.06_AM_vfypyj.jpg' },
];

const RETURN_POLICY_LABELS = {
  PERISHABLE_FOOD: 'No returns',
  PACKAGED_FOOD: '2 days — Damaged/Expired only',
  STANDARD_ELECTRONICS: '7 days — Replacement only',
  HIGH_VALUE_ELECTRONICS: '7 days — Approval required',
  STATIONERY: '2 days — Damaged only',
  FASHION: '3 days — Wrong size/Damaged',
  GROCERY: '1 day — Damaged/Expired',
  FRESH: 'No returns',
  MEDICAL: 'Return only if expired',
};

/* ---------- Reusable header (Blinkit yellow bar) ---------- */
const SubHeader = ({ title, onBack, subtitle }) => (
  <div style={{ background: T.headerGradient, padding: '14px 16px 18px', boxShadow: T.shadowHeader }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {onBack && (
        <motion.button {...btnTap} onClick={onBack}
          style={{ width: '34px', height: '34px', background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', color: T.text, cursor: 'pointer', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </motion.button>
      )}
      <div style={{ flex: 1 }}>
        <h2 style={{ color: T.text, margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: '12px', marginTop: '2px', fontWeight: '500' }}>{subtitle}</div>}
      </div>
    </div>
  </div>
);

const StarRating = ({ value, onChange, readonly = false }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map(star => (
      <span key={star}
        onClick={() => !readonly && onChange?.(star)}
        style={{ fontSize: readonly ? '14px' : '24px', cursor: readonly ? 'default' : 'pointer', color: star <= value ? T.headerYellowDark : T.border }}>
        ★
      </span>
    ))}
  </div>
);

const ReviewSection = ({ type, id }) => {
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    API.get(`/reviews/${type}/${id}`)
      .then(res => { setReviews(res.data.reviews); setAverage(res.data.average_rating); })
      .catch(console.error);
  }, [id, type, submitted]);

  const submitReview = async () => {
    if (rating === 0) { showToast('Please select a star rating', 'error'); return; }
    setLoading(true);
    try {
      await API.post(`/reviews/${type}/${id}`, { rating, comment });
      setRating(0); setComment(''); setSubmitted(prev => !prev);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ background: T.primary, color: 'white', borderRadius: T.radiusSm, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '18px' }}>
          {average || '—'} <span style={{ fontSize: '13px' }}>★</span>
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px', color: T.text }}>Customer rating</div>
          <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{reviews.length} reviews</div>
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: '16px', marginBottom: '14px' }}>
        <div style={{ fontWeight: '700', color: T.text, marginBottom: '10px', fontSize: '13px' }}>Rate & review</div>
        <StarRating value={rating} onChange={setRating} />
        <textarea placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)}
          style={{ width: '100%', marginTop: '12px', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '13px', outline: 'none', resize: 'none', height: '72px', background: T.bg }} />
        <motion.button {...btnTap} onClick={submitReview} disabled={loading}
          style={{ marginTop: '12px', padding: '11px 22px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Submitting...' : 'Submit review'}
        </motion.button>
      </div>

      {reviews.map(r => (
        <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: T.text }}>{r.buyer_name}</span>
            <StarRating value={r.rating} readonly />
          </div>
          {r.comment && <p style={{ margin: 0, fontSize: '13px', color: T.textSoft, lineHeight: '1.6' }}>{r.comment}</p>}
          <div style={{ fontSize: '11px', color: T.textFaint, marginTop: '8px' }}>{new Date(r.created_at).toLocaleDateString()}</div>
        </div>
      ))}
      {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: T.textFaint, fontSize: '13px' }}>No reviews yet. Be the first!</div>}
    </div>
  );
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function OrderTracking({ orderId, onClose }) {
  const [tracking, setTracking] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading]   = useState(true);

  const STEPS = [
    { key: 'pending',          label: 'Order placed',    icon: '📝' },
    { key: 'confirmed',        label: 'Confirmed',       icon: '✅' },
    { key: 'preparing',        label: 'Preparing',       icon: '📦' },
    { key: 'picked_up',        label: 'Picked up',       icon: '🛵' },
    { key: 'out_for_delivery', label: 'Out for delivery', icon: '🚀' },
    { key: 'delivered',        label: 'Delivered',       icon: '🎉' },
  ];

  const fetchTracking = async () => {
    try {
      const res = await API.get(`/tracking/${orderId}`);
      setTracking(res.data);
    } catch (err) {
      console.error('Tracking fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocation = async () => {
    try {
      const res = await API.get(`/tracking/${orderId}/location`);
      if (res.data.delivery_lat && res.data.delivery_lng) {
        setLocation({ lat: res.data.delivery_lat, lng: res.data.delivery_lng });
      }
    } catch (err) {
      console.error('Location fetch failed');
    }
  };

  useEffect(() => {
    fetchTracking();
    fetchLocation();
    const interval = setInterval(() => {
      fetchTracking();
      fetchLocation();
    }, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const currentStatus = tracking?.order?.tracking_status || 'pending';
  const currentStepIdx = STEPS.findIndex(s => s.key === currentStatus);

  const distanceKm = (location && tracking?.order?.delivery_latitude && tracking?.order?.delivery_longitude)
    ? getDistanceKm(location.lat, location.lng, tracking.order.delivery_latitude, tracking.order.delivery_longitude)
    : null;

  if (loading) return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: '48px', color: T.textFaint, fontFamily: T.font }}>Loading tracking...</div>
      </div>
    </div>
  );

  return (
    <div style={styles.overlay}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }} style={styles.card}>
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', background: T.borderStrong, borderRadius: '999px', margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: T.text, fontSize: '18px', fontWeight: '800' }}>Order tracking</h3>
            <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '4px' }}>
              #{orderId.slice(-6).toUpperCase()}
            </div>
          </div>
          <motion.button {...btnTap} onClick={onClose}
            style={{ background: T.bg, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', color: T.text }}>
            ✕
          </motion.button>
        </div>

        {/* ETA banner */}
        <div style={{ background: T.primary, color: 'white', padding: '14px 16px', borderRadius: T.radiusMd, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>⚡</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px' }}>Arriving in ~45 min</div>
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>Live updates every 30s</div>
          </div>
        </div>

        {/* Status Steps */}
        <div style={{ marginBottom: '20px' }}>
          {STEPS.map((step, idx) => {
            const isDone    = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isCurrent ? T.primary : isDone ? T.primaryTint : T.bg,
                    border: isCurrent ? `2px solid ${T.primary}` : isDone ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', flexShrink: 0, color: isCurrent ? 'white' : T.primary, fontWeight: '700',
                    boxShadow: isCurrent ? `0 0 0 4px ${T.primaryTint}` : 'none',
                  }}>
                    {isDone ? '✓' : ''}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div style={{ width: '2px', height: '26px', background: idx < currentStepIdx ? T.primary : T.border, marginTop: '2px' }} />
                  )}
                </div>
                <div style={{ paddingTop: '4px' }}>
                  <div style={{ fontWeight: isCurrent ? '700' : '500', color: isDone ? T.text : T.textFaint, fontSize: '14px' }}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div style={{ fontSize: '11px', color: T.primary, fontWeight: '600', marginTop: '2px' }}>● Current status</div>
                  )}
                  {tracking?.tracking_log?.find(l => l.status === step.key) && (
                    <div style={{ fontSize: '11px', color: T.textFaint, marginTop: '2px' }}>
                      {new Date(tracking.tracking_log.find(l => l.status === step.key).created_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Map */}
        {location && (currentStatus === 'out_for_delivery' || currentStatus === 'picked_up') && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', color: T.text, fontSize: '14px', marginBottom: '10px' }}>Live location</div>
            <div style={{ borderRadius: T.radiusMd, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              <iframe
                title="delivery-map"
                width="100%"
                height="200"
                frameBorder="0"
                style={{ display: 'block' }}
                src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
              />
            </div>

            {distanceKm !== null && (
              <div style={{ fontSize: '13px', color: T.primary, fontWeight: '700', marginTop: '10px', textAlign: 'center' }}>
                {distanceKm.toFixed(1)} km away
              </div>
            )}
          </div>
        )}

        {/* Delivery Boy Info */}
        {tracking?.order?.delivery_boy_name && (
          <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: T.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🛵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: T.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Delivery partner</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginTop: '2px' }}>{tracking.order.delivery_boy_name}</div>
            </div>
            <a href={`tel:${tracking.order.delivery_boy_phone}`}
              style={{ padding: '9px 14px', background: T.primary, color: 'white', borderRadius: T.radiusPill, textDecoration: 'none', fontSize: '12px', fontWeight: '700' }}>
              Call
            </a>
          </div>
        )}

        {/* Shop Info */}
        <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: T.textFaint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>Shop</div>
          <div style={{ fontSize: '14px', color: T.text, fontWeight: '700' }}>{tracking?.order?.shop_name}</div>
          <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>{tracking?.order?.shop_address}</div>
        </div>

        {currentStatus === 'delivered' && (
          <div style={{ background: T.accentTint, borderRadius: T.radiusMd, padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontWeight: '700', color: '#5B21B6', fontSize: '13px', marginBottom: '6px' }}>Return policy</div>
            <div style={{ fontSize: '12px', color: T.textSoft, marginBottom: '12px', lineHeight: '1.6' }}>
              Return window applies as per product policy. Contact the shop to initiate a return.
            </div>
            {tracking?.order?.shop_phone ? (
              <a href={`tel:${tracking.order.shop_phone}`}
                style={{ display: 'block', textAlign: 'center', padding: '11px', background: T.headerYellowDark, color: '#F5F3FF', borderRadius: T.radiusSm, fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
                Call shop: {tracking.order.shop_phone}
              </a>
            ) : (
              <div style={{ textAlign: 'center', padding: '11px', background: 'white', color: T.textSoft, borderRadius: T.radiusSm, fontSize: '13px' }}>
                Contact shop directly for return
              </div>
            )}
          </div>
        )}

        <motion.button {...btnTap} onClick={() => { fetchTracking(); fetchLocation(); }}
          style={{ width: '100%', marginTop: '14px', padding: '13px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
          ↻ Refresh
        </motion.button>
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(17,17,39,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' },
  card:    { background: T.card, borderRadius: '24px 24px 0 0', padding: '18px 18px 24px', width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: T.font },
};

function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    window.addEventListener('pwaInstallReady', () => setShowBanner(true));
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', background: T.text,
      padding: '12px 16px', zIndex: 999, display: 'flex',
      alignItems: 'center', gap: '12px', boxShadow: T.shadowFloating, fontFamily: T.font
    }}>
      <img src="/icons/icon-72x72.png" alt="Zaplo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>Install Zaplo</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Get delivery in 45 min. Every time.</div>
      </div>
      <motion.button {...btnTap}
        onClick={async () => {
          const { promptInstall } = await import('../pwa');
          const accepted = await promptInstall();
          if (accepted) setShowBanner(false);
        }}
        style={{ background: T.headerYellow, color: '#F5F3FF', border: 'none', borderRadius: T.radiusSm, padding: '8px 14px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}>
        Install
      </motion.button>
      <button onClick={() => setShowBanner(false)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px' }}>
        ✕
      </button>
    </div>
  );
}

export default function BuyerDashboard() {
  const [screen, setScreen] = useState('home');
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [address, setAddress] = useState({ full_address: '', landmark: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchMode, setSearchMode] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [deliveryCharge, setDeliveryCharge] = useState(20);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('zaplo_saved_addresses') || '[]');
    } catch {
      return [];
    }
  });
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', full_address: '', landmark: '', phone: '' });
  const { cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount } = useCart();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showUnserviceable, setShowUnserviceable] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [profileAddress, setProfileAddress] = useState('');
  const [profilePincode, setProfilePincode] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  // Moved up from later in the file — `user` must exist before any
  // useEffect below references it, otherwise it crashes with
  // "Cannot access 'user' before initialization".
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  // ---- Temporary QR-based payment flow state ----
  const [qrPaymentActive, setQrPaymentActive] = useState(false);
  const [qrOrderIds, setQrOrderIds] = useState([]);
  const [qrCurrentIndex, setQrCurrentIndex] = useState(0);
  const [qrPaymentDetails, setQrPaymentDetails] = useState(null);
  const [qrLoadingDetails, setQrLoadingDetails] = useState(false);
  const [qrStep, setQrStep] = useState('pay_and_confirm');
  const [qrScreenshot, setQrScreenshot] = useState(null);
  const [qrScreenshotPreview, setQrScreenshotPreview] = useState(null);
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);

  // ---- Real navigation history (drives phone back button) ----
  const buildNavState = () => ({
    screen, selectedProduct, selectedShop, activeCategory,
    checkoutStep, trackingOrderId, showAddAddress, qrPaymentActive,
  });

  const applyNavState = async (state) => {
    setScreen(state.screen);
    setSelectedProduct(state.selectedProduct);
    setSelectedShop(state.selectedShop);
    setActiveCategory(state.activeCategory);
    setCheckoutStep(state.checkoutStep);
    setTrackingOrderId(state.trackingOrderId);
    setShowAddAddress(state.showAddAddress);
    setQrPaymentActive(!!state.qrPaymentActive);
    setActiveImageIndex(0);

    if (state.screen === 'categoryProducts') {
      if (state.activeCategory === 'all') setProducts(allProducts);
      else setProducts(allProducts.filter(p => p.category?.toLowerCase() === state.activeCategory.toLowerCase()));
    }
    if (state.screen === 'shop' && state.selectedShop) {
      try {
        const res = await API.get(`/sellers/${state.selectedShop.id}/products`);
        setShopProducts(res.data);
      } catch (err) { console.error(err); }
    }
    if (state.screen === 'orders') fetchMyOrders();
  };

  const navigate = (updates) => {
    const newState = { ...buildNavState(), ...updates };
    window.history.pushState(newState, '');
    applyNavState(newState);
  };

  const applyNavStateRefObj = useRef(applyNavState);
  applyNavStateRefObj.current = applyNavState;

  useEffect(() => {
    window.history.replaceState(buildNavState(), '');
    let exitArmed = false;
    let exitTimer = null;

    const handlePopState = (event) => {
      if (event.state) {
        applyNavStateRefObj.current(event.state);
        return;
      }
      if (!exitArmed) {
        exitArmed = true;
        showToast('Press back again to exit');
        window.history.pushState(buildNavState(), '');
        exitTimer = setTimeout(() => { exitArmed = false; }, 2000);
      } else {
        clearTimeout(exitTimer);
        window.location.href = 'about:blank';
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimer) clearTimeout(exitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Show unserviceable modal if user's area is not serviceable
  useEffect(() => {
    if (user && user.serviceable === false) {
      setShowUnserviceable(true);
    }
  }, [user]);

    // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  

  

  // Persist saved addresses across page refreshes/app restarts — previously
  // this only lived in React state and vanished on every reload.
  useEffect(() => {
    localStorage.setItem('zaplo_saved_addresses', JSON.stringify(savedAddresses));
  }, [savedAddresses]);

  useEffect(() => {
    if (selectedProduct?.has_variants && selectedProduct.variants?.length > 0) {
      const firstAvailable = selectedProduct.variants.find(v => v.stock > 0) || selectedProduct.variants[0];
      setSelectedVariant(firstAvailable);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

  // ── QR payment helpers (unchanged logic) ─────────────────────────
  const loadQrPaymentDetails = async (orderId) => {
    setQrLoadingDetails(true);
    try {
      const res = await API.get(`/payments/qr/order/${orderId}`);
      setQrPaymentDetails(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load payment details', 'error');
    } finally {
      setQrLoadingDetails(false);
    }
  };

  const startQrPayment = (orderIds) => {
    setQrOrderIds(orderIds);
    setQrCurrentIndex(0);
    setQrStep('pay_and_confirm');
    setQrScreenshot(null);
    setQrScreenshotPreview(null);
    setQrTransactionId('');
    navigate({ qrPaymentActive: true });
    loadQrPaymentDetails(orderIds[0]);
  };

  const buildUpiDeepLink = () => {
    if (!qrPaymentDetails?.upi_id) return null;
    const params = new URLSearchParams({
      pa: qrPaymentDetails.upi_id,
      pn: qrPaymentDetails.shop_name || 'Zaplo Seller',
      am: String(qrPaymentDetails.amount),
      tn: `Order ${qrPaymentDetails.order_id.slice(-6).toUpperCase()}`,
      cu: 'INR',
    });
    return `upi://pay?${params.toString()}`;
  };

  const openUpiApp = () => {
    const link = buildUpiDeepLink();
    if (!link) {
      showToast('UPI ID not available — please scan the QR code instead', 'error');
      return;
    }
    window.location.href = link;
  };

  const submitQrPaymentProof = async () => {
    if (!qrScreenshot) {
      showToast('Please upload a payment screenshot', 'error');
      return;
    }
    setQrSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', qrScreenshot);
      if (qrTransactionId.trim()) formData.append('transaction_id', qrTransactionId.trim());
      await API.post(`/payments/qr/verify/${qrPaymentDetails.order_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof submitted!', 'success');
      setQrStep('submitted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit payment proof', 'error');
    } finally {
      setQrSubmitting(false);
    }
  };

  const advanceQrFlow = () => {
    const next = qrCurrentIndex + 1;
    if (next < qrOrderIds.length) {
      setQrCurrentIndex(next);
      setQrStep('pay_and_confirm');
      setQrScreenshot(null);
      setQrScreenshotPreview(null);
      setQrTransactionId('');
      loadQrPaymentDetails(qrOrderIds[next]);
    } else {
      window.history.back();
      navigate({ screen: 'orders', checkoutStep: 1 });
      fetchMyOrders();
    }
  };

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

 const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadAllProducts();
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await API.get('/banners/active');
      setBanners(res.data);
    } catch (err) {
      console.error('Banners fetch failed');
    }
  };

  // Routes a banner tap based on what the admin configured for it.
  const handleBannerClick = (banner) => {
    switch (banner.action_type) {
      case 'restaurant':
        if (banner.action_value) {
          openShop({ id: banner.action_value, shop_name: banner.restaurant_name || banner.title || 'Shop' });
        }
        break;
      case 'product': {
        const product = allProducts.find(p => p.id === banner.action_value);
        if (product) navigate({ selectedProduct: product });
        else showToast('Product not available right now', 'error');
        break;
      }
      case 'category':
        if (banner.action_value) openCategoryScreen(banner.action_value);
        break;
      case 'url':
        if (banner.action_value) window.open(banner.action_value, '_blank');
        break;
      case 'deeplink':
        if (banner.action_value) navigate({ screen: banner.action_value });
        break;
      default:
        break; // 'none' — purely decorative, no action
    }
  };
  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/products/search?q=');
      const shuffled = shuffleArray(res.data);
      setAllProducts(shuffled);
      setProducts(shuffled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const search = useCallback(async () => {
    setLoading(true);
    try {
      if (searchMode === 'shops') {
        const res = await API.get(`/sellers/search?q=${query}`);
        setShops(res.data);
        navigate({ screen: 'shoplist' });
      } else {
        const res = await API.get(`/products/search?q=${query}`);
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, searchMode]);

  const filterByCategory = (cat) => {
    setActiveCategory(cat);
    if (cat === 'all') {
      setProducts(allProducts);
    } else {
      setProducts(allProducts.filter(p => p.category?.toLowerCase() === cat.toLowerCase()));
    }
  };

  const openCategoryScreen = (catId) => {
    filterByCategory(catId);
    navigate({ screen: 'categoryProducts', activeCategory: catId });
  };

  const openShop = async (shop) => {
    setLoading(true);
    navigate({ screen: 'shop', selectedShop: shop });
    try {
      const res = await API.get(`/sellers/${shop.id}/products`);
      setShopProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await API.get('/orders/my-orders');
      setMyOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getBuyerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setBuyerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location not available')
      );
    }
  };

  const calcDeliveryCharge = (distanceKm) => {
    if (!distanceKm || distanceKm <= 0) return 20;
    if (distanceKm <= 3) return 20;
    if (distanceKm <= 5) return 30;
    return 30 + Math.ceil(distanceKm - 5) * 6;
  };

    const saveProfileAddress = async () => {
    if (!profilePincode || profilePincode.length !== 6) {
      showToast('Please enter a valid 6-digit pincode', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await API.patch('/auth/profile', { address: profileAddress, pincode: profilePincode });
      const updatedUser = { ...user, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (res.data.token) localStorage.setItem('token', res.data.token);
      setUser(updatedUser);
      setShowEditAddress(false);
      showToast(res.data.message, 'success');
      if (res.data.serviceable) setShowUnserviceable(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update address', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!address.full_address || !address.phone) {

          if (user?.serviceable === false) {
      showToast('Service not available in your area', 'error');
      return;
    }
      showToast('Please fill address and phone', 'error');
      return;
    }

    const sellerGroups = {};
    cart.forEach(item => {
      const sid = item.seller_id || item.shop_id;
      if (!sellerGroups[sid]) sellerGroups[sid] = [];
      sellerGroups[sid].push(item);
    });

    try {
      const placedOrderIds = [];
      const backendPaymentMethod = paymentMethod === 'ONLINE' ? 'ONLINE_QR' : paymentMethod;

      for (const [seller_id, items] of Object.entries(sellerGroups)) {
        const res = await API.post('/orders', {
          seller_id,
          items: items.map(i => ({ product_id: i.id, quantity: i.qty, variant_id: i.variant?.id || null })),
          payment_method: backendPaymentMethod,
          delivery_address: address.full_address,
          delivery_phone: address.phone,
          delivery_landmark: address.landmark,
          buyer_lat: buyerLocation?.lat,
          buyer_lng: buyerLocation?.lng,
        });
        placedOrderIds.push(res.data.order.id || res.data.id);
      }

      if (paymentMethod === 'COD') {
        clearCart();
        showToast('Order placed successfully! 🎉 Pay cash on delivery.', 'success');
        navigate({ screen: 'orders', checkoutStep: 1 });
        fetchMyOrders();
        return;
      }

      if (paymentMethod === 'ONLINE') {
        clearCart();
        startQrPayment(placedOrderIds);
      }

    } catch (err) {
      showToast(err.response?.data?.error || 'Order failed', 'error');
    }
  };

  const getCartQty = (productId, variantId = null) => {
    const cartKey = variantId ? `${productId}::${variantId}` : productId;
    const item = cart.find(i => i.cartKey === cartKey);
    return item ? item.qty : 0;
  };

  /* ---------- Blinkit-style Product Card ---------- */
  const ProductCard = ({ product }) => {
    const qty = product.has_variants ? 0 : getCartQty(product.id);
    const minVariantPrice = product.has_variants && product.variants?.length > 0
      ? Math.min(...product.variants.map(v => parseFloat(v.price)))
      : null;
    const sellerClosed = product.seller_is_online === false;

    return (
      <motion.div whileTap={{ scale: 0.98 }}
        style={{ background: T.card, borderRadius: T.radiusMd, overflow: 'hidden', border: `1px solid ${T.border}`, position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
        onClick={() => navigate({ selectedProduct: product })}>

        {/* Image */}
        <div style={{ position: 'relative', background: T.bg, aspectRatio: '1 / 1' }}>
          {product.image_urls?.[0] || product.image_url ? (
            <img
              src={optimizeImage(product.image_urls?.[0] || product.image_url, 400)}
              alt={product.name}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px' }}>📦</div>
          )}

          {/* 30-min badge */}
          {!sellerClosed && (
            <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(255,255,255,0.95)', color: T.text, padding: '3px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px', boxShadow: T.shadowCard }}>
              <span style={{ color: T.primary }}>⚡</span> 45 MIN
            </div>
          )}

          {sellerClosed ? (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.error, fontWeight: '800', fontSize: '11px', letterSpacing: '0.04em', textAlign: 'center', padding: '0 10px' }}>
              TEMPORARILY CLOSED
            </div>
          ) : product.stock === 0 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.error, fontWeight: '800', fontSize: '12px', letterSpacing: '0.05em' }}>
              OUT OF STOCK
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ fontSize: '13px', color: T.text, fontWeight: '600', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '34px' }}>
            {product.name}
          </div>
          <div style={{ fontSize: '11px', color: T.textFaint, marginBottom: '4px' }}>
            {product.unit_type ? `1 ${product.unit_type}${product.unit_weight ? ` · ${product.unit_weight}g` : ''}` : (product.shop_name || '\u00A0')}
          </div>

          {/* Price + ADD */}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: T.text, letterSpacing: '-0.01em' }}>
              {product.has_variants ? `₹${minVariantPrice}+` : `₹${product.price}`}
            </div>

            <div onClick={e => e.stopPropagation()}>
              {sellerClosed ? (
                <span style={{ padding: '7px 14px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '11px', letterSpacing: '0.02em' }}>
                  CLOSED
                </span>
              ) : product.has_variants ? (
                <motion.button {...btnTap}
                  style={{ padding: '7px 16px', background: 'white', color: T.primary, border: `1.5px solid ${T.primary}`, borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.02em' }}>
                  OPTIONS
                </motion.button>
              ) : qty === 0 ? (
                <motion.button {...btnTap} onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })}
                  disabled={product.stock === 0}
                  style={{ padding: '7px 18px', background: product.stock === 0 ? T.bg : 'white', color: product.stock === 0 ? T.textFaint : T.primary, border: `1.5px solid ${product.stock === 0 ? T.border : T.primary}`, borderRadius: T.radiusSm, fontWeight: '800', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', letterSpacing: '0.03em' }}>
                  ADD
                </motion.button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusSm, overflow: 'hidden' }}>
                  <button onClick={() => updateQty(product.id, qty - 1)}
                    style={{ width: '28px', height: '30px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: '700' }}>−</button>
                  <span style={{ color: 'white', fontWeight: '800', minWidth: '18px', textAlign: 'center', fontSize: '13px' }}>{qty}</span>
                  <button onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })}
                    style={{ width: '28px', height: '30px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: '700' }}>+</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  /* -------- Shared floating "View cart" bar -------- */
  const CartFloatingBar = () => {
    if (cartCount === 0 || screen === 'cart') return null;
    return (
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={() => { getBuyerLocation(); navigate({ screen: 'cart' }); }}
        style={{
          position: 'fixed', bottom: '76px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)', background: T.primary,
          borderRadius: T.radiusMd, padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', boxShadow: T.shadowFloating,
          zIndex: 99, color: 'white',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '800' }}>
            {cartCount} ITEM{cartCount > 1 ? 'S' : ''}
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800' }}>₹{total}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '800' }}>
          View Cart <span style={{ fontSize: '18px' }}>›</span>
        </div>
      </motion.div>
    );
  };

    if (isOffline) {
    return (
      <>
        <FontLoader />
        <OfflinePage onRetry={() => window.location.reload()} />
      </>
    );
  }

  


  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font, width: '100%', position: 'relative', color: T.text }}>

       
          
      <FontLoader />
      <InstallBanner />
      <Toast />
            {showUnserviceable && (
        <UnserviceableModal onClose={() => setShowUnserviceable(false)} />
      )}

            {user?.serviceable === false && (
        <div style={{ background: '#FEF3C7', borderBottom: '1px solid #FCD34D', padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: 50 }}>
          <span style={{ fontSize: '13px', color: '#92400E', fontWeight: 700 }}>
            📍 We are not available in your area yet, but we will be there soon!
          </span>
        </div>
      )}

      {/* HOME SCREEN */}
      {screen === 'home' && (
        <div style={{ paddingBottom: '104px' }}>

          {/* Yellow Blinkit-style header */}
          <div style={{ background: T.headerGradient, padding: '14px 16px 16px', boxShadow: T.shadowHeader }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ background: T.text, color: '#F5F3FF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900', letterSpacing: '0.03em' }}>
                    ⚡ 45 MINS
                  </div>
                </div>
                <div style={{ color: T.text, fontWeight: '800', fontSize: '17px', letterSpacing: '-0.01em' }}>Delivery to your door</div>
                <div style={{ color: 'rgba(0,0,0,0.65)', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📍 <span style={{ fontWeight: '600' }}>Your Location ▾</span>
                </div>
              </div>
              <motion.div {...btnTap} onClick={() => navigate({ screen: 'profile' })}
                style={{ width: '40px', height: '40px', background: T.text, color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
                {user.name?.[0]?.toUpperCase() || '👤'}
              </motion.div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px', border: `1px solid ${T.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '15px', color: T.primary, flexShrink: 0 }}>🔍</span>
                <input
                  placeholder={searchMode === 'products' ? "Search 'atta', 'milk', 'chips'..." : "Search for shops..."}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '12px 0', background: 'transparent', color: T.text }}
                />
              </div>
              <motion.button {...btnTap} onClick={() => setSearchMode(searchMode === 'products' ? 'shops' : 'products')}
                style={{ background: T.text, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '0 14px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.03em', flexShrink: 0 }}>
                {searchMode === 'products' ? 'SHOPS' : 'ITEMS'}
              </motion.button>
            </div>
          </div>

          {/* Search results (shops) */}
          {query && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>Results for "{query}"</span>
                <motion.button {...btnTap} onClick={search}
                  style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Search
                </motion.button>
              </div>
              {searchMode === 'shops' && shops.map(shop => (
                <motion.div whileTap={{ scale: 0.98 }} key={shop.id} onClick={() => openShop(shop)}
                  style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', border: `1px solid ${T.border}` }}>
                  <div style={{ width: '46px', height: '46px', background: T.primaryTint, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏪</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>{shop.shop_name}</div>
                    <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{shop.locality} • {shop.total_products} items</div>
                  </div>
                  <span style={{ color: T.primary, fontSize: '18px' }}>›</span>
                </motion.div>
              ))}
            </div>
          )}

         {/* Categories & banners */}
          {!query && (
            <>
              {/* Hero Banner Carousel — fully admin-controlled, hides itself if no active banners */}
              <HeroBannerCarousel banners={banners} onBannerClick={handleBannerClick} />

              {/* Promo strip */}
              <div style={{ padding: '14px 16px 6px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, background: T.primaryGradient, borderRadius: T.radiusMd, padding: '14px', color: 'white', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.01em' }}>₹20 delivery</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '3px' }}>Upto 3km · ₹30 upto 5km · ₹6/km after</div>
                  <div style={{ position: 'absolute', right: '-8px', bottom: '-6px', fontSize: '52px', opacity: 0.18 }}>🛵</div>
                </div>
                <div style={{ flex: 1, background: `linear-gradient(135deg, ${T.headerYellow}, ${T.headerYellowDark})`, borderRadius: T.radiusMd, padding: '14px', color: T.text, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.01em' }}>Lowest prices</div>
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '3px' }}>Best deals near you</div>
                  <div style={{ position: 'absolute', right: '-4px', bottom: '-6px', fontSize: '48px', opacity: 0.22 }}>🏷️</div>
                </div>
              </div>

              {/* Categories header */}
              <div style={{ padding: '14px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, color: T.text, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.01em' }}>Shop by category</h3>
                <span style={{ fontSize: '11px', color: T.textFaint, fontWeight: '600' }}>{allProducts.length} items</span>
              </div>

              {/* 3-col dense category grid (Blinkit style) */}
              <div style={{ padding: '10px 16px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {categories.filter(c => c.id !== 'all').map(cat => {
                  const count = allProducts.filter(p => p.category?.toLowerCase() === cat.id).length;
                  return (
                    <motion.div whileTap={{ scale: 0.94 }} key={cat.id} onClick={() => openCategoryScreen(cat.id)}
                      style={{
                        background: T.card, borderRadius: T.radiusMd, overflow: 'hidden', cursor: 'pointer',
                        border: `1px solid ${T.border}`,
                      }}>
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: T.primaryTint, overflow: 'hidden' }}>
                        {cat.image ? (
                          <img
                            src={optimizeImage(cat.image, 550)}
                            alt={cat.label}
                            loading="lazy"
                            decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>{cat.emoji}</div>
                        )}
                      </div>
                      <div style={{ padding: '8px 8px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: T.text, lineHeight: 1.2 }}>{cat.label}</div>
                        <div style={{ fontSize: '10px', color: T.textFaint, marginTop: '2px' }}>{count} items</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Best sellers strip */}
              <div style={{ padding: '18px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, color: T.text, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.01em' }}>Best sellers</h3>
                <span style={{ fontSize: '11px', color: T.primary, fontWeight: '700', cursor: 'pointer' }} onClick={() => openCategoryScreen('all')}>See all ›</span>
              </div>

              <div style={{ padding: '10px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(products.slice(0, 6)).map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          {/* Product search results */}
          {query && searchMode === 'products' && (
            <div style={{ padding: '4px 16px 16px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: T.textFaint }}>Loading...</div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: T.card, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔎</div>
                  <p style={{ color: T.textSoft, margin: 0, fontWeight: '600' }}>No products found</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {products.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SHOP LIST SCREEN */}
      {screen === 'shoplist' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title="Shops near you" subtitle={`${shops.length} shops available`} onBack={() => window.history.back()} />
          <div style={{ padding: '16px' }}>
            {shops.map(shop => (
              <motion.div whileTap={{ scale: 0.98 }} key={shop.id} onClick={() => openShop(shop)}
                style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', border: `1px solid ${T.border}` }}>
                <div style={{ width: '54px', height: '54px', background: T.primaryTint, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏪</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: T.text }}>{shop.shop_name}</div>
                  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>{shop.locality}</div>
                  <div style={{ display: 'inline-block', fontSize: '11px', color: T.primary, fontWeight: '700', marginTop: '6px', background: T.primaryTint, padding: '3px 8px', borderRadius: '6px' }}>
                    {shop.total_products} items
                  </div>
                </div>
                <span style={{ color: T.primary, fontSize: '20px' }}>›</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY PRODUCTS SCREEN */}
      {screen === 'categoryProducts' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader
            title={categories.find(c => c.id === activeCategory)?.label || 'Category'}
            subtitle={`${products.length} products`}
            onBack={() => window.history.back()}
          />
          <div style={{ padding: '14px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textFaint }}>Loading...</div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: T.card, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <p style={{ color: T.textSoft, margin: 0, fontWeight: '600' }}>No products in this category</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {products.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP SCREEN */}
      {screen === 'shop' && selectedShop && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title={selectedShop.shop_name} subtitle={selectedShop.address} onBack={() => window.history.back()} />
          <div style={{ padding: '14px 16px' }}>
            {selectedShop.is_online === false ? (
              <div style={{ background: T.errorTint, borderRadius: T.radiusMd, padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', color: T.error, fontSize: '13px', marginBottom: '4px' }}>🔴 Temporarily Closed</div>
                <div style={{ fontSize: '12px', color: T.textSoft }}>This store is temporarily unavailable. Please check back later.</div>
              </div>
            ) : (
              <div style={{ background: T.successTint, borderRadius: T.radiusMd, padding: '10px 14px', marginBottom: '14px', display: 'inline-block' }}>
                <span style={{ fontWeight: '800', color: T.success, fontSize: '12px' }}>🟢 Open Now</span>
              </div>
            )}
            {selectedShop.contact_phone && (
              <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: T.primary, fontWeight: '700', textTransform: 'uppercase' }}>Shop contact</div>
                  <div style={{ fontSize: '13px', color: T.text, fontWeight: '700', marginTop: '2px' }}>{selectedShop.contact_phone}</div>
                </div>
                <a href={`tel:${selectedShop.contact_phone}`}
                  style={{ padding: '8px 14px', background: T.primary, color: 'white', borderRadius: T.radiusPill, textDecoration: 'none', fontSize: '12px', fontWeight: '700' }}>
                  Call
                </a>
              </div>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textFaint }}>Loading products...</div>
            ) : shopProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: T.card, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '40px' }}>📭</div>
                <p style={{ color: T.textSoft, fontWeight: '600' }}>No products in this shop</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {shopProducts.map(product => <ProductCard key={product.id} product={{ ...product, seller_id: selectedShop.id }} />)}
              </div>
            )}
            <div style={{ padding: '20px 0 0' }}>
              <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '15px', fontWeight: '700' }}>Shop reviews</h4>
              <ReviewSection type="seller" id={selectedShop?.id} />
            </div>
          </div>
        </div>
      )}

      {/* CART SCREEN */}
      {screen === 'cart' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader
            title={checkoutStep === 1 ? 'My cart' : checkoutStep === 2 ? 'Delivery address' : 'Payment'}
            subtitle={checkoutStep === 1 ? `${cartCount} item${cartCount !== 1 ? 's' : ''}` : `Step ${checkoutStep} of 3`}
            onBack={() => window.history.back()}
          />

          <div style={{ padding: '16px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 20px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🛒</div>
                <div style={{ fontWeight: '800', fontSize: '17px', color: T.text, marginBottom: '6px' }}>Your cart is empty</div>
                <p style={{ color: T.textSoft, marginBottom: '20px', fontSize: '13px' }}>Add items to get started</p>
                <motion.button {...btnTap} onClick={() => navigate({ screen: 'home' })}
                  style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '12px 26px', fontWeight: '800', cursor: 'pointer' }}>
                  Start shopping
                </motion.button>
              </div>
            ) : checkoutStep === 1 ? (
              <>
                {/* Delivery ETA banner */}
                <div style={{ background: T.primary, color: 'white', padding: '12px 14px', borderRadius: T.radiusMd, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>Delivery in ~45 mins</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>Shipment of {cartCount} item{cartCount > 1 ? 's' : ''}</div>
                  </div>
                </div>

                {cart.map(item => (
                  <div key={item.cartKey} style={{ background: T.card, borderRadius: T.radiusMd, padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${T.border}` }}>
                    <div style={{ width: '54px', height: '54px', background: T.bg, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', overflow: 'hidden', flexShrink: 0 }}>
                      {item.image_url ? <img src={optimizeImage(item.image_url, 120)} alt={item.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: T.text, lineHeight: 1.3 }}>{item.name}</div>
                      {item.variant && (
                        <div style={{ fontSize: '11px', color: T.textSoft, marginTop: '2px' }}>{item.variant.variant_type}: {item.variant.variant_value}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontWeight: '800', color: T.text, fontSize: '14px' }}>₹{item.price * item.qty}</span>
                        <span style={{ fontSize: '11px', color: T.textFaint }}>₹{item.price}/pc</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusSm, overflow: 'hidden', flexShrink: 0 }}>
                      <button onClick={() => updateQty(item.cartKey, item.qty - 1)}
                        style={{ width: '28px', height: '30px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: '700' }}>−</button>
                      <span style={{ color: 'white', fontWeight: '800', minWidth: '20px', textAlign: 'center', fontSize: '13px' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.cartKey, item.qty + 1)}
                        style={{ width: '28px', height: '30px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: '700' }}>+</button>
                    </div>
                  </div>
                ))}

                {/* Bill details */}
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', border: `1px solid ${T.border}`, marginTop: '10px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: T.text, marginBottom: '12px', letterSpacing: '0.02em' }}>BILL DETAILS</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: T.textSoft }}>Item total</span>
                    <span style={{ fontWeight: '600' }}>₹{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: T.textSoft }}>Delivery charge</span>
                    <span style={{ fontWeight: '600' }}>₹{deliveryCharge}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${T.border}`, marginTop: '4px' }}>
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>To Pay</span>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: T.text }}>₹{total + deliveryCharge}</span>
                  </div>
                   <div style={{ background: T.accentTint, borderRadius: T.radiusSm, padding: '10px 12px', marginTop: '12px', fontSize: '11px', color: '#5B21B6' }}>
                    Delivery: ₹20 upto 3km · ₹30 upto 5km · ₹6/km after. Pay to delivery partner.
                  </div>
                  <motion.button {...btnTap} onClick={() => navigate({ checkoutStep: 2 })}
                    disabled={user?.serviceable === false}
                    style={{ width: '100%', marginTop: '14px', padding: '15px', background: user?.serviceable === false ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', fontSize: '15px', cursor: user?.serviceable === false ? 'not-allowed' : 'pointer', letterSpacing: '0.02em', opacity: user?.serviceable === false ? 0.6 : 1 }}>
                    {user?.serviceable === false ? 'Service Not Available' : 'PROCEED TO CHECKOUT →'}
                  </motion.button>
                </div>
              </>
            ) : checkoutStep === 2 ? (
              <div>
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', border: `1px solid ${T.border}`, marginBottom: '14px' }}>
                  {[
                    { label: 'Full address', key: 'full_address', placeholder: 'House no, Street, Area...', type: 'textarea' },
                    { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
                    { label: 'Phone number', key: 'phone', placeholder: 'Contact for delivery' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: T.textSoft, display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>{f.label.toUpperCase()}</label>
                      {f.type === 'textarea' ? (
                        <textarea placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', height: '78px', resize: 'none', background: T.bg }} />
                      ) : (
                        <input placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', background: T.bg }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => window.history.back()}
                    style={{ flex: 1, padding: '14px', background: T.card, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>← Back</motion.button>
                  <motion.button {...btnTap} onClick={() => navigate({ checkoutStep: 3 })}
                    style={{ flex: 2, padding: '14px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer' }}>Continue →</motion.button>
                </div>
              </div>
            ) : (
              <div>
                {/* Summary */}
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', marginBottom: '12px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: T.text, marginBottom: '12px', letterSpacing: '0.02em' }}>ORDER SUMMARY</div>
                  {cart.map(item => (
                    <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                      <span style={{ color: T.textSoft }}>{item.name} × {item.qty}</span>
                      <span style={{ fontWeight: '600' }}>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '6px', borderTop: `1px dashed ${T.border}` }}>
                    <span style={{ fontWeight: '800' }}>Total</span>
                    <span style={{ fontWeight: '800', color: T.text, fontSize: '15px' }}>₹{total}</span>
                  </div>
                  <div style={{ background: T.accentTint, borderRadius: T.radiusSm, padding: '10px 12px', marginTop: '10px', fontSize: '11px', color: '#5B21B6' }}>
                    Delivery ₹{deliveryCharge} — paid directly to delivery partner
                  </div>
                </div>

                {/* Address */}
                <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: T.primary, marginBottom: '6px', letterSpacing: '0.03em' }}>DELIVERING TO</div>
                  <div style={{ fontSize: '13px', color: T.text, fontWeight: '600' }}>{address.full_address}</div>
                  {address.landmark && <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>Near: {address.landmark}</div>}
                  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{address.phone}</div>
                </div>

                {/* Payment method */}
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', marginBottom: '14px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: T.text, marginBottom: '12px', letterSpacing: '0.02em' }}>PAYMENT METHOD</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['COD', 'ONLINE'].map(method => (
                      <motion.button {...btnTap} key={method} onClick={() => setPaymentMethod(method)}
                        style={{ flex: 1, padding: '14px 8px', border: `2px solid ${paymentMethod === method ? T.primary : T.border}`, borderRadius: T.radiusSm, cursor: 'pointer', background: paymentMethod === method ? T.primaryTint : 'white', fontWeight: '700', color: paymentMethod === method ? T.primary : T.textSoft, fontSize: '13px' }}>
                        {method === 'COD' ? '💵 Cash on delivery' : '📱 Online (UPI)'}
                      </motion.button>
                    ))}
                  </div>
                  {paymentMethod === 'ONLINE' && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: T.primaryTint, borderRadius: T.radiusSm, fontSize: '12px', color: T.primary, fontWeight: '600', lineHeight: 1.5 }}>
                      Scan the seller's UPI QR and upload a payment screenshot. Order confirmed once seller verifies.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => window.history.back()}
                    style={{ flex: 1, padding: '14px', background: T.card, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>← Back</motion.button>
                  <motion.button {...btnTap} onClick={placeOrder}
                    disabled={user?.serviceable === false}
                    style={{ flex: 2, padding: '14px', background: user?.serviceable === false ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: user?.serviceable === false ? 'not-allowed' : 'pointer', fontSize: '14px', letterSpacing: '0.02em', opacity: user?.serviceable === false ? 0.6 : 1 }}>
                    {user?.serviceable === false ? 'Service Not Available' : `PLACE ORDER · ₹${total + deliveryCharge}`}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDERS SCREEN */}
      {screen === 'orders' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title="My orders" subtitle={`${myOrders.length} order${myOrders.length !== 1 ? 's' : ''}`} />
          <div style={{ padding: '14px 16px' }}>
            {myOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 20px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontWeight: '800', fontSize: '17px', color: T.text, marginBottom: '6px' }}>No orders yet</div>
                <motion.button {...btnTap} onClick={() => navigate({ screen: 'home' })}
                  style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '12px 26px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}>
                  Start shopping
                </motion.button>
              </div>
            ) : myOrders.map(order => {
              const badge = (() => {
                if (order.status === 'delivered') return { bg: T.successTint, color: T.success, text: 'DELIVERED' };
                if (order.status === 'payment_rejected') return { bg: T.errorTint, color: T.error, text: 'PAYMENT REJECTED' };
                if (['pending', 'pending_payment', 'payment_verification_pending'].includes(order.status)) {
                  return {
                    bg: T.accentTint, color: '#5B21B6',
                    text: order.status === 'pending_payment' ? 'PAYMENT PENDING'
                      : order.status === 'payment_verification_pending' ? 'VERIFYING' : 'PENDING'
                  };
                }
                return { bg: T.primaryTint, color: T.primary, text: order.status?.toUpperCase() };
              })();

              return (
                <div key={order.id} style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px', marginBottom: '10px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '800', color: T.text, fontSize: '14px' }}>#{order.id.slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize: '11px', color: T.textFaint, marginTop: '2px' }}>{new Date(order.created_at).toLocaleDateString()} · {order.shop_name}</div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.03em', background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                      {badge.text}
                    </span>
                  </div>

                  <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '10px 12px', marginBottom: '10px' }}>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ fontSize: '12px', color: T.text, padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{ fontWeight: '600' }}>₹{item.unit_price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                    <span style={{ color: T.textFaint, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{order.payment_method}</span>
                    <span style={{ fontWeight: '800', color: T.text, fontSize: '16px' }}>₹{order.total_amount}</span>
                  </div>

                  {order.status === 'pending_payment' && (
                    <motion.button {...btnTap} onClick={() => startQrPayment([order.id])}
                      style={{ width: '100%', marginTop: '10px', padding: '11px', background: T.headerYellow, color: '#F5F3FF', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                      Complete Payment →
                    </motion.button>
                  )}
                  {order.status === 'payment_verification_pending' && (
                    <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center', background: T.accentTint, color: '#5B21B6', borderRadius: T.radiusSm, fontWeight: '600', fontSize: '12px' }}>
                      Waiting for seller to verify payment
                    </div>
                  )}
                  {order.status === 'payment_rejected' && (
                    <motion.button {...btnTap} onClick={() => startQrPayment([order.id])}
                      style={{ width: '100%', marginTop: '10px', padding: '11px', background: T.error, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                      Retry Payment
                    </motion.button>
                  )}
                  {!['delivered', 'cancelled', 'pending_payment', 'payment_verification_pending', 'payment_rejected'].includes(order.status) && (
                    <motion.button {...btnTap} onClick={() => navigate({ trackingOrderId: order.id })}
                      style={{ width: '100%', marginTop: '10px', padding: '11px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                      Track order
                    </motion.button>
                  )}
                  {order.status === 'delivered' && (
                    <motion.button {...btnTap} onClick={() => navigate({ trackingOrderId: order.id })}
                      style={{ width: '100%', marginTop: '10px', padding: '11px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                      View details & return
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PROFILE SCREEN */}
      {screen === 'profile' && (
        <div style={{ paddingBottom: '104px', background: T.bg, minHeight: '100vh' }}>
          {/* Yellow profile hero */}
          <div style={{ background: T.headerGradient, padding: '22px 18px 26px', boxShadow: T.shadowHeader }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '58px', height: '58px', background: T.text, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: T.headerYellow, fontWeight: '900' }}>
                {user.name?.[0]?.toUpperCase() || '👤'}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '18px', color: T.text }}>{user.name || 'Zaplo User'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', marginTop: '2px' }}>{user.phone}</div>
              </div>
            </div>
          </div>
           
                     {/* Address & Pincode Card */}
          <div style={{ background: T.card, margin: '14px 16px', borderRadius: T.radiusMd, padding: '16px', border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: T.text }}>Delivery Address</div>
                <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>
                  {user.address || 'No address saved'} • PIN: {user.pincode || '—'}
                </div>
              </div>
              <span style={{ 
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                background: user.serviceable ? T.successTint : T.errorTint,
                color: user.serviceable ? T.success : T.error
              }}>
                {user.serviceable ? '✅ Serviceable' : '⏳ Not Serviceable'}
              </span>
            </div>
            
            {showEditAddress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: T.textFaint, display: 'block', marginBottom: '6px' }}>ADDRESS</label>
                  <textarea 
                    value={profileAddress} 
                    onChange={e => setProfileAddress(e.target.value)}
                    placeholder="Full address"
                    style={{ width: '100%', padding: '12px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', background: T.bg, resize: 'none', height: '60px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: T.textFaint, display: 'block', marginBottom: '6px' }}>PINCODE</label>
                  <input 
                    value={profilePincode} 
                    onChange={e => setProfilePincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="6-digit pincode"
                    style={{ width: '100%', padding: '12px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', background: T.bg, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowEditAddress(false)} style={{ flex: 1, padding: '12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: 700, cursor: 'pointer', color: T.textSoft }}>Cancel</button>
                  <button onClick={saveProfileAddress} disabled={profileLoading} style={{ flex: 2, padding: '12px', background: profileLoading ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: 800, cursor: profileLoading ? 'not-allowed' : 'pointer' }}>
                    {profileLoading ? 'Saving...' : 'Save & Check'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setProfileAddress(user.address || ''); setProfilePincode(user.pincode || ''); setShowEditAddress(true); }} style={{ width: '100%', padding: '10px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusSm, fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
                ✏️ Update Address & Pincode
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: T.card, margin: '14px 16px', borderRadius: T.radiusMd, padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', border: `1px solid ${T.border}` }}>
            {[
              { icon: '📦', label: 'Your orders', action: () => { fetchMyOrders(); navigate({ screen: 'orders' }); } },
              { icon: '💬', label: 'Help & support', action: () => navigate({ screen: 'help' }) },
              { icon: '📍', label: 'Saved addresses', action: () => navigate({ screen: 'addresses' }) },
              { icon: '⭐', label: 'My reviews', action: () => navigate({ screen: 'myreviews' }) },
            ].map((item, i) => (
              <motion.div whileTap={{ scale: 0.96 }} key={i} onClick={item.action}
                style={{ background: T.bg, borderRadius: T.radiusSm, padding: '16px 10px', textAlign: 'center', cursor: 'pointer', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: T.text }}>{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ margin: '18px 16px 8px', fontWeight: '800', fontSize: '13px', color: T.textFaint, letterSpacing: '0.05em' }}>YOUR INFORMATION</div>
          <div style={{ background: T.card, margin: '0 16px', borderRadius: T.radiusMd, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {[
              { icon: '📦', label: 'My orders', sub: '', action: () => { fetchMyOrders(); navigate({ screen: 'orders' }); } },
              { icon: '📍', label: 'Saved addresses', sub: `${savedAddresses.length} address${savedAddresses.length !== 1 ? 'es' : ''}`, action: () => navigate({ screen: 'addresses' }) },
              { icon: '💳', label: 'Payment history', sub: '', action: () => { fetchMyOrders(); navigate({ screen: 'orders' }); } },
              { icon: '💬', label: 'Help & support', sub: '', action: () => navigate({ screen: 'help' }) },
            ].map((item, i, arr) => (
              <div key={i} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 16px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: T.text, fontSize: '14px' }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{item.sub}</div>}
                </div>
                <span style={{ color: T.textFaint, fontSize: '17px' }}>›</span>
              </div>
            ))}
          </div>

          <div style={{ margin: '18px 16px 8px', fontWeight: '800', fontSize: '13px', color: T.textFaint, letterSpacing: '0.05em' }}>OTHER INFORMATION</div>
          <div style={{ background: T.card, margin: '0 16px', borderRadius: T.radiusMd, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {[
              { icon: '⭐', label: 'My reviews', action: () => navigate({ screen: 'myreviews' }) },
              { icon: '📜', label: 'Terms & Conditions', action: () => navigate({ screen: 'terms' }) },
              { icon: 'ℹ️', label: 'About Zaplo', action: () => navigate({ screen: 'help' }) },
            ].map((item, i, arr) => (
              <div key={i} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 16px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <div style={{ flex: 1, fontWeight: '600', color: T.text, fontSize: '14px' }}>{item.label}</div>
                <span style={{ color: T.textFaint, fontSize: '17px' }}>›</span>
              </div>
            ))}
          </div>

          <div style={{ margin: '18px 16px' }}>
            <motion.button {...btnTap} onClick={logout}
              style={{ width: '100%', padding: '15px', background: T.card, color: T.error, border: `1.5px solid ${T.error}`, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
              Log out
            </motion.button>
          </div>

          <div style={{ textAlign: 'center', color: T.textFaint, fontSize: '11px', marginTop: '6px' }}>
            App version 1.0.0
          </div>
        </div>
      )}

      {/* MY REVIEWS SCREEN */}
      {screen === 'myreviews' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title="My reviews" onBack={() => window.history.back()} />
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', padding: '48px 20px', background: T.card, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
              <p style={{ color: T.textSoft, fontSize: '13px' }}>Your reviews on products and shops will appear here</p>
              <motion.button {...btnTap} onClick={() => navigate({ screen: 'home' })}
                style={{ marginTop: '12px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '10px 22px', cursor: 'pointer', fontWeight: '800' }}>
                Start shopping
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* ADDRESSES SCREEN */}
      {screen === 'addresses' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title="My addresses" onBack={() => window.history.back()} />
          <div style={{ padding: '16px' }}>
            <motion.button {...btnTap} onClick={() => showAddAddress ? window.history.back() : navigate({ showAddAddress: true })}
              style={{ width: '100%', padding: '14px', background: T.primaryTint, color: T.primary, border: `1.5px dashed ${T.primary}`, borderRadius: T.radiusMd, fontWeight: '800', cursor: 'pointer', fontSize: '14px', marginBottom: '14px' }}>
              + Add new address
            </motion.button>

            {showAddAddress && (
              <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', marginBottom: '14px', border: `1px solid ${T.border}` }}>
                <h4 style={{ margin: '0 0 12px', color: T.text, fontSize: '14px', fontWeight: '800' }}>New address</h4>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <motion.button {...btnTap} key={l} onClick={() => setNewAddress({ ...newAddress, label: l })}
                      style={{ padding: '7px 16px', borderRadius: T.radiusPill, border: `1.5px solid ${newAddress.label === l ? T.primary : T.border}`, cursor: 'pointer', fontWeight: '700', fontSize: '12px', background: newAddress.label === l ? T.primary : 'white', color: newAddress.label === l ? 'white' : T.textSoft }}>
                      {l}
                    </motion.button>
                  ))}
                </div>

                {[
                  { label: 'Full address', key: 'full_address', placeholder: 'House no, Street, Area...' },
                  { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
                  { label: 'Phone', key: 'phone', placeholder: 'Contact number' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: T.textFaint, display: 'block', marginBottom: '5px', letterSpacing: '0.03em' }}>{f.label.toUpperCase()}</label>
                    <input placeholder={f.placeholder} value={newAddress[f.key]}
                      onChange={e => setNewAddress({ ...newAddress, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '11px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', background: T.bg }} />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <motion.button {...btnTap} onClick={() => {
                    if (!newAddress.full_address) { showToast('Please enter address', 'error'); return; }
                    setSavedAddresses(prev => [...prev, { ...newAddress, id: Date.now() }]);
                    setNewAddress({ label: 'Home', full_address: '', landmark: '', phone: '' });
                    window.history.back();
                  }} style={{ flex: 2, padding: '12px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer' }}>
                    Save address
                  </motion.button>
                  <motion.button {...btnTap} onClick={() => window.history.back()}
                    style={{ flex: 1, padding: '12px', background: T.bg, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>
                    Cancel
                  </motion.button>
                </div>
              </div>
            )}

            {savedAddresses.length === 0 && !showAddAddress ? (
              <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
                <p style={{ color: T.textSoft, fontSize: '13px' }}>No saved addresses yet</p>
              </div>
            ) : savedAddresses.map((addr) => (
              <div key={addr.id} style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px', marginBottom: '10px', border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '800', color: T.primary, fontSize: '12px', background: T.primaryTint, padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.02em' }}>
                    {addr.label.toUpperCase()}
                  </span>
                  <button onClick={() => setSavedAddresses(prev => prev.filter(a => a.id !== addr.id))}
                    style={{ background: 'none', color: T.error, border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                    Delete
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: T.text, fontWeight: '600' }}>{addr.full_address}</div>
                {addr.landmark && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>Near: {addr.landmark}</div>}
                {addr.phone && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{addr.phone}</div>}
                <motion.button {...btnTap} onClick={() => {
                  setAddress({ full_address: addr.full_address, landmark: addr.landmark, phone: addr.phone });
                  navigate({ screen: 'cart', checkoutStep: 2 });
                }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}>
                  Use this address
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HELP & SUPPORT SCREEN */}
      {screen === 'help' && (
        <div style={{ paddingBottom: '104px' }}>
          <SubHeader title="Help & support" onBack={() => window.history.back()} />
          <div style={{ padding: '16px' }}>
            {[
              { q: 'How do I track my order?', a: 'Go to My Orders and tap "Track Order" on any active order to see live status and delivery partner location.' },
              { q: 'How do I cancel an order?', a: 'You can cancel an order within 2 minutes of placing it. Go to My Orders and tap Cancel. After confirmation by seller, cancellation is not possible.' },
               { q: 'What is the delivery charge?', a: 'Delivery charge is ₹20 for up to 3km, ₹30 for up to 5km, and ₹6 for every extra km beyond that. The charge is paid directly to the delivery partner.' },
              { q: 'How does payment work?', a: 'You can pay via Cash on Delivery (pay to delivery partner) or Online (scan the seller\'s UPI QR code and upload a payment screenshot — the order is confirmed once the seller verifies it). 10% platform fee applies on all orders.' },
              { q: 'What is the return policy?', a: 'Return policy varies by product category. Fresh food cannot be returned. Electronics have 7-day replacement. Fashion has 3-day return window.' },
              { q: 'How do I become a seller?', a: 'Register as a seller from the login page. After admin approval, you can start listing products and receiving orders.' },
            ].map((faq, i) => (
              <div key={i} style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '8px', border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: '700', color: T.text, fontSize: '13px', marginBottom: '8px' }}>{faq.q}</div>
                <div style={{ fontSize: '12px', color: T.textSoft, lineHeight: '1.7' }}>{faq.a}</div>
              </div>
            ))}

            <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '18px', marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 10px', color: T.primary, fontSize: '14px', fontWeight: '800' }}>Contact us</h4>
              <div style={{ fontSize: '13px', color: T.textSoft, lineHeight: '2' }}>
                <div>support@zaplo.in</div>
                <div>+91 6392303278</div>
                <div>Mon–Sat, 9AM – 6PM</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TERMS & CONDITIONS SCREEN */}
      {screen === 'terms' && <TermsAndConditions onBack={() => window.history.back()} />}

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: T.card, zIndex: 200, overflowY: 'hidden' }}>
          <div style={{ height: 'calc(100vh - 96px)', overflowY: 'auto' }}>
            {/* Back button */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
              <motion.button {...btnTap} onClick={() => window.history.back()}
                style={{ width: '38px', height: '38px', background: 'white', border: 'none', borderRadius: '50%', boxShadow: T.shadowCard, cursor: 'pointer', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ←
              </motion.button>
            </div>

            {/* Product Image */}
            <div style={{ width: '100%', height: '320px', background: T.bg, position: 'relative' }}>
              {selectedProduct.image_urls?.[0] || selectedProduct.image_url ? (
                <img src={optimizeImage(selectedProduct.image_urls?.[activeImageIndex] || selectedProduct.image_url, 800)}
                  alt={selectedProduct.name} decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>📦</div>
              )}

              {selectedProduct.image_urls?.length > 1 && activeImageIndex > 0 && (
                <button onClick={() => setActiveImageIndex(prev => prev - 1)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
                  ‹
                </button>
              )}
              {selectedProduct.image_urls?.length > 1 && activeImageIndex < selectedProduct.image_urls.length - 1 && (
                <button onClick={() => setActiveImageIndex(prev => prev + 1)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
                  ›
                </button>
              )}
              {selectedProduct.image_urls?.length > 1 && (
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                  {selectedProduct.image_urls.map((_, i) => (
                    <div key={i} onClick={() => setActiveImageIndex(i)}
                      style={{ width: '7px', height: '7px', borderRadius: '50%', background: i === activeImageIndex ? T.primary : T.border, cursor: 'pointer' }} />
                  ))}
                </div>
              )}

              {/* 30-min badge */}
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: T.text, color: T.headerYellow, padding: '5px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.03em' }}>
                ⚡ 45 MIN DELIVERY
              </div>
            </div>

            {/* Product Info */}
            <div style={{ padding: '20px 18px', paddingBottom: '100px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: T.primary, fontWeight: '700', background: T.primaryTint, padding: '4px 10px', borderRadius: '6px' }}>
                  {selectedProduct.shop_name}
                </span>
                {selectedProduct.category && (
                  <span style={{ fontSize: '11px', color: T.textSoft, background: T.bg, padding: '4px 10px', borderRadius: '6px' }}>
                    {selectedProduct.category}
                  </span>
                )}
                {selectedProduct.seller_is_online === false && (
                  <span style={{ fontSize: '11px', color: T.error, fontWeight: '800', background: T.errorTint, padding: '4px 10px', borderRadius: '6px' }}>
                    🔴 TEMPORARILY CLOSED
                  </span>
                )}
              </div>

              <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '800', color: T.text, lineHeight: '1.35', letterSpacing: '-0.01em' }}>
                {selectedProduct.name}
              </h2>

              {/* Price block */}
              <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: T.text, letterSpacing: '-0.02em' }}>₹{selectedProduct.price}</span>
                  <span style={{ fontSize: '13px', color: T.textSoft }}>
                    per {selectedProduct.unit_type || 'piece'}
                    {selectedProduct.unit_weight && ` (${selectedProduct.unit_weight}g)`}
                  </span>
                </div>

                {selectedProduct.price_per_kg && (
                  <div style={{ background: T.accentTint, borderRadius: '6px', padding: '5px 10px', marginBottom: '8px', display: 'inline-block' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#5B21B6' }}>₹{selectedProduct.price_per_kg}/kg</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: selectedProduct.stock > 10 ? T.success : selectedProduct.stock > 0 ? T.headerYellowDark : T.error }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: selectedProduct.stock > 10 ? T.success : selectedProduct.stock > 0 ? '#8B5A00' : T.error }}>
                    {selectedProduct.stock > 10 ? 'In stock' : selectedProduct.stock > 0 ? 'Limited stock' : 'Out of stock'}
                  </span>
                </div>
              </div>

              {/* Variants */}
              {selectedProduct.has_variants && selectedProduct.variants?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '14px', fontWeight: '800' }}>
                    Choose {selectedProduct.variants[0].variant_type}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {selectedProduct.variants.map(v => {
                      const isSelected = selectedVariant?.id === v.id;
                      const isOutOfStock = v.stock === 0;
                      return (
                        <motion.button key={v.id} whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
                          onClick={() => !isOutOfStock && setSelectedVariant(v)}
                          disabled={isOutOfStock}
                          style={{
                            padding: '9px 18px', borderRadius: T.radiusSm,
                            border: isSelected ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                            background: isOutOfStock ? T.bg : isSelected ? T.primary : 'white',
                            color: isOutOfStock ? T.textFaint : isSelected ? 'white' : T.text,
                            fontWeight: '700', fontSize: '13px', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          }}>
                          {v.variant_value}
                        </motion.button>
                      );
                    })}
                  </div>

                  {selectedVariant && (
                    <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: T.textSoft }}>Price</span>
                        <span style={{ fontWeight: '800', color: T.text, fontSize: '15px' }}>₹{selectedVariant.price}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: T.textSoft }}>Stock</span>
                        <span style={{ fontWeight: '700', color: selectedVariant.stock > 0 ? T.success : T.error }}>
                          {selectedVariant.stock > 0 ? `${selectedVariant.stock} available` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery info */}
              <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div>
                   <div style={{ fontWeight: '800', color: T.primary, fontSize: '13px' }}>45 min delivery</div>
                  <div style={{ fontSize: '11px', color: T.textSoft, marginTop: '2px' }}>₹20 upto 3km, ₹30 upto 5km, ₹6/km after</div>
                </div>
              </div>

              {selectedProduct.description && (
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 8px', color: T.text, fontSize: '14px', fontWeight: '800' }}>About this product</h4>
                  <p style={{ margin: 0, color: T.textSoft, fontSize: '13px', lineHeight: '1.7' }}>{selectedProduct.description}</p>
                </div>
              )}

              <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 6px', color: T.textFaint, fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>SOLD BY</h4>
                <div style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>{selectedProduct.shop_name}</div>
                <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '3px' }}>{selectedProduct.locality}</div>
              </div>

              {selectedProduct.return_policy && (
                <div style={{ background: T.successTint, borderRadius: T.radiusMd, padding: '12px 16px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: T.success, fontWeight: '700' }}>
                    ↩ Return: {RETURN_POLICY_LABELS[selectedProduct.return_policy] || selectedProduct.return_policy.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 8px', color: T.text, fontSize: '14px', fontWeight: '800' }}>Reviews</h4>
                <ReviewSection type="product" id={selectedProduct?.id} />
              </div>
            </div>
          </div>

          {/* Bottom Add to Cart */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: T.card, padding: '14px 16px', boxShadow: '0 -6px 20px rgba(17,17,39,0.08)', zIndex: 201, borderTop: `1px solid ${T.border}` }}>
            {(() => {
              const sellerClosed = selectedProduct.seller_is_online === false;
              const isVariantProduct = selectedProduct.has_variants && selectedProduct.variants?.length > 0;
              const effectiveStock = isVariantProduct ? (selectedVariant?.stock ?? 0) : selectedProduct.stock;
              const currentQty = getCartQty(selectedProduct.id, isVariantProduct ? selectedVariant?.id : null);
              const canAdd = !sellerClosed && (!isVariantProduct || (isVariantProduct && selectedVariant));

              if (sellerClosed) {
                return (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '100%', padding: '16px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>
                      This store is temporarily unavailable. Please check back later.
                    </div>
                  </div>
                );
              }

              return currentQty === 0 ? (
                <motion.button {...btnTap}
                  onClick={() => canAdd && addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id }, isVariantProduct ? selectedVariant : null)}
                  disabled={effectiveStock === 0 || !canAdd}
                  style={{ width: '100%', padding: '16px', background: effectiveStock === 0 ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', fontSize: '15px', cursor: effectiveStock === 0 ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }}>
                  {effectiveStock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                </motion.button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusSm, overflow: 'hidden', flex: 1 }}>
                    <button onClick={() => updateQty(isVariantProduct ? `${selectedProduct.id}::${selectedVariant.id}` : selectedProduct.id, currentQty - 1)}
                      style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', fontWeight: '700' }}>−</button>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '16px', minWidth: '36px', textAlign: 'center' }}>{currentQty}</span>
                    <button onClick={() => addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id }, isVariantProduct ? selectedVariant : null)}
                      style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', fontWeight: '700' }}>+</button>
                  </div>
                  <motion.button {...btnTap} onClick={() => navigate({ screen: 'cart', selectedProduct: null })}
                    style={{ padding: '15px 20px', background: T.text, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px', letterSpacing: '0.02em' }}>
                    VIEW CART
                  </motion.button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {trackingOrderId && (
        <OrderTracking orderId={trackingOrderId} onClose={() => window.history.back()} />
      )}

      {/* ── QR Payment Flow ────────────────────────────────────── */}
      {qrPaymentActive && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: T.bg, zIndex: 400, overflowY: 'auto', fontFamily: T.font }}>
          <div style={{ background: T.headerGradient, padding: '14px 16px 18px', boxShadow: T.shadowHeader, position: 'sticky', top: 0, zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: T.text, margin: 0, fontSize: '17px', fontWeight: '800' }}>
                {qrStep === 'upload' ? 'Upload Payment Proof' : qrStep === 'submitted' ? 'Payment Submitted' : 'Scan & Pay'}
              </h2>
              {qrOrderIds.length > 1 && (
                <span style={{ color: 'rgba(0,0,0,0.7)', fontSize: '11px', fontWeight: '700', background: 'rgba(0,0,0,0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                  {qrCurrentIndex + 1} / {qrOrderIds.length}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            {qrLoadingDetails || !qrPaymentDetails ? (
              <div style={{ textAlign: 'center', padding: '60px', color: T.textFaint }}>Loading payment details...</div>
            ) : qrStep === 'pay_and_confirm' ? (
              <>
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '20px', border: `1px solid ${T.border}`, marginBottom: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: T.textSoft, marginBottom: '3px' }}>Pay to</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: T.text, marginBottom: '10px' }}>{qrPaymentDetails.shop_name}</div>
                  <div style={{ fontSize: '30px', fontWeight: '800', color: T.primary, marginBottom: '14px' }}>₹{qrPaymentDetails.amount}</div>

                  {qrPaymentDetails.qr_code_url ? (
                    <img src={qrPaymentDetails.qr_code_url} alt="UPI QR Code"
                      style={{ width: '210px', height: '210px', objectFit: 'contain', borderRadius: T.radiusMd, border: `1px solid ${T.border}`, margin: '0 auto 12px', display: 'block' }} />
                  ) : (
                    <div style={{ width: '210px', height: '210px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, borderRadius: T.radiusMd, color: T.textFaint, fontSize: '13px' }}>
                      QR code not available
                    </div>
                  )}

                  <div style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>📷 Scan & Pay using any UPI app</div>
                  {qrPaymentDetails.upi_id && (
                    <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '4px' }}>UPI: <strong style={{ color: T.text }}>{qrPaymentDetails.upi_id}</strong></div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[{ label: '📱 PhonePe' }, { label: '💳 Google Pay' }, { label: '🅿️ Paytm' }, { label: '➕ Other UPI' }].map((btn) => (
                    <motion.button {...btnTap} key={btn.label} onClick={openUpiApp}
                      style={{ padding: '13px', background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', fontSize: '12px', color: T.text, cursor: 'pointer' }}>
                      {btn.label}
                    </motion.button>
                  ))}
                </div>

                <div style={{ background: T.accentTint, borderRadius: T.radiusMd, padding: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#5B21B6', lineHeight: '1.6' }}>
                    Opening a UPI app does <strong>not</strong> mean your payment is complete. Confirm below only after your payment actually went through.
                  </div>
                </div>

                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: T.text, marginBottom: '12px', textAlign: 'center' }}>
                    Have you completed the payment?
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button {...btnTap} onClick={() => window.history.back()}
                      style={{ flex: 1, padding: '13px', background: T.bg, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                      Cancel
                    </motion.button>
                    <motion.button {...btnTap} onClick={() => setQrStep('upload')}
                      style={{ flex: 2, padding: '13px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                      Yes, I have paid
                    </motion.button>
                  </div>
                </div>
              </>
            ) : qrStep === 'upload' ? (
              <>
                <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', border: `1px solid ${T.border}`, marginBottom: '14px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: T.text, marginBottom: '12px' }}>UPLOAD PAYMENT SCREENSHOT *</div>

                  {qrScreenshotPreview ? (
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <img src={qrScreenshotPreview} alt="Payment screenshot"
                        style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} />
                      <button onClick={() => { setQrScreenshot(null); setQrScreenshotPreview(null); }}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: T.error, color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'block', padding: '30px 16px', border: `1.5px dashed ${T.primary}`, borderRadius: T.radiusMd, textAlign: 'center', cursor: 'pointer', background: T.primaryTint, color: T.primary, fontWeight: '700', fontSize: '13px', marginBottom: '12px' }}>
                      📷 Tap to upload payment screenshot
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setQrScreenshot(file);
                          const reader = new FileReader();
                          reader.onload = () => setQrScreenshotPreview(reader.result);
                          reader.readAsDataURL(file);
                        }} />
                    </label>
                  )}

                  <div style={{ fontWeight: '800', fontSize: '12px', color: T.textFaint, marginBottom: '6px', marginTop: '8px', letterSpacing: '0.03em' }}>TRANSACTION ID (OPTIONAL)</div>
                  <input placeholder="UTR / Transaction ID from your UPI app" value={qrTransactionId}
                    onChange={e => setQrTransactionId(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', background: T.bg }} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => setQrStep('pay_and_confirm')}
                    style={{ flex: 1, padding: '14px', background: T.card, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>
                    ← Back
                  </motion.button>
                  <motion.button {...btnTap} onClick={submitQrPaymentProof} disabled={!qrScreenshot || qrSubmitting}
                    style={{ flex: 2, padding: '14px', background: (!qrScreenshot || qrSubmitting) ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', cursor: (!qrScreenshot || qrSubmitting) ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    {qrSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </motion.button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
                <div style={{ fontWeight: '800', fontSize: '18px', color: T.text, marginBottom: '8px' }}>Payment proof submitted!</div>
                <p style={{ color: T.textSoft, fontSize: '13px', lineHeight: '1.7', marginBottom: '22px' }}>
                  Your order is now <strong>Payment Verification Pending</strong>. The seller will review and confirm shortly.
                </p>
                <motion.button {...btnTap} onClick={advanceQrFlow}
                  style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, padding: '14px 30px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>
                  {qrCurrentIndex + 1 < qrOrderIds.length ? 'Next: Pay for next order →' : 'Done — View my orders'}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating "View Cart" bar (Blinkit-style, above bottom nav) */}
      <CartFloatingBar />

      {/* Bottom Navigation — solid Blinkit style */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0,
        width: '100%', background: 'white',
        display: 'flex', boxShadow: '0 -2px 12px rgba(17,17,39,0.06)',
        zIndex: 100, borderTop: `1px solid ${T.border}`,
      }}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'shoplist', icon: '🏪', label: 'Shops', action: () => { API.get('/sellers/search?q=').then(r => { setShops(r.data); navigate({ screen: 'shoplist' }); }); } },
          { id: 'cart', icon: '🛒', label: 'Cart', badge: cartCount,
            action: () => { getBuyerLocation(); navigate({ screen: 'cart' }); } },
          { id: 'orders', icon: '📦', label: 'Orders', action: () => { fetchMyOrders(); navigate({ screen: 'orders' }); } },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ].map(item => {
          const isActive = screen === item.id;
          return (
            <motion.button whileTap={{ scale: 0.92 }} key={item.id}
              onClick={() => item.action ? item.action() : navigate({ screen: item.id })}
              style={{ flex: 1, padding: '10px 0 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', position: 'relative', borderTop: isActive ? `2px solid ${T.primary}` : '2px solid transparent', marginTop: '-1px' }}>
              <span style={{ fontSize: '20px', filter: isActive ? 'none' : 'grayscale(0.4)', opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: '800', color: isActive ? T.primary : T.textFaint, letterSpacing: '0.02em' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: 'calc(50% - 18px)', background: T.primary, color: 'white', borderRadius: '999px', minWidth: '18px', height: '18px', padding: '0 5px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', border: '2px solid white' }}>{item.badge}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}