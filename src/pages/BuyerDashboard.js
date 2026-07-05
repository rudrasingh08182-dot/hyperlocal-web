import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import TermsAndConditions from '../components/TermsAndConditions';

/* ============================================================
   ZAPLO DESIGN SYSTEM
   Premium / minimal / calm. Do not hardcode raw colors below —
   always pull from T (tokens) so the whole app stays consistent.
   ============================================================ */
const T = {
  primary: '#5B4BFF',
  primaryDark: '#4636D6',
  primaryGradient: 'linear-gradient(135deg, #5B4BFF 0%, #7C6FFF 100%)',
  accent: '#FFC83D',
  success: '#22C55E',
  successGradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  error: '#EF4444',
  bg: '#F8F9FC',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSoft: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#ECEEF3',
  primaryTint: '#F1EFFF',
  accentTint: '#FFF8E8',
  successTint: '#EAFBF1',
  errorTint: '#FEEEEE',
  radiusLg: '24px',
  radiusMd: '18px',
  radiusSm: '12px',
  radiusPill: '999px',
  shadowSoft: '0 4px 20px rgba(17, 17, 39, 0.06)',
  shadowCard: '0 2px 12px rgba(17, 17, 39, 0.05)',
  shadowFloating: '0 12px 32px rgba(91, 75, 255, 0.16)',
  font: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
    * { -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { display: none; }
  `}</style>
);

const btnTap = { whileTap: { scale: 0.96 } };

const useCart = () => {
  const [cart, setCart] = useState([]);
  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id, qty) => {
    if (qty === 0) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };
  const clearCart = () => setCart([]);
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  return { cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount };
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

const StarRating = ({ value, onChange, readonly = false }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map(star => (
      <span key={star}
        onClick={() => !readonly && onChange?.(star)}
        style={{ fontSize: readonly ? '14px' : '24px', cursor: readonly ? 'default' : 'pointer', color: star <= value ? T.accent : T.border }}>
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
    if (rating === 0) { alert('Please select a star rating'); return; }
    setLoading(true);
    try {
      await API.post(`/reviews/${type}/${id}`, { rating, comment });
      setRating(0); setComment(''); setSubmitted(prev => !prev);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '18px' , marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '36px', fontWeight: '800', color: T.text, fontFamily: T.font }}>{average || '—'}</span>
        <div>
          <StarRating value={Math.round(average)} readonly />
          <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '4px' }}>{reviews.length} reviews</div>
        </div>
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: '18px', marginBottom: '16px', boxShadow: T.shadowCard }}>
        <div style={{ fontWeight: '700', color: T.text, marginBottom: '12px', fontSize: '14px' }}>Write a review</div>
        <StarRating value={rating} onChange={setRating} />
        <textarea placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)}
          style={{ width: '100%', marginTop: '12px', padding: '12px 14px', border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '13px', outline: 'none', resize: 'none', height: '72px', boxSizing: 'border-box', fontFamily: T.font, background: T.bg }} />
        <motion.button {...btnTap} onClick={submitReview} disabled={loading}
          style={{ marginTop: '12px', padding: '11px 26px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1, fontFamily: T.font }}>
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
      {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '28px', color: T.textFaint, fontSize: '13px' }}>No reviews yet. Be the first!</div>}
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
    { key: 'pending',          label: 'Order placed' },
    { key: 'confirmed',        label: 'Confirmed' },
    { key: 'preparing',        label: 'Preparing' },
    { key: 'picked_up',        label: 'Picked up' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered',        label: 'Delivered' },
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
                    background: isCurrent ? T.primary : isDone ? T.successTint : T.bg,
                    border: isCurrent ? `2px solid ${T.primary}` : isDone ? `2px solid ${T.success}` : `2px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', flexShrink: 0, color: isCurrent ? 'white' : T.success, fontWeight: '700',
                    boxShadow: isCurrent ? `0 0 0 5px ${T.primaryTint}` : 'none',
                  }}>
                    {isDone ? '✓' : ''}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div style={{ width: '2px', height: '26px', background: idx < currentStepIdx ? T.success : T.border, marginTop: '2px' }} />
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
            <div style={{ fontWeight: '700', color: T.text, fontSize: '14px', marginBottom: '10px' }}>
              Live location
            </div>
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

            <div style={{ fontSize: '11px', color: T.textFaint, marginTop: '4px', textAlign: 'center' }}>
              Updates every 30 seconds
            </div>
          </div>
        )}

        {/* Delivery Boy Info */}
        {tracking?.order?.delivery_boy_name && (
          <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', color: T.primary, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Your delivery partner</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: T.text }}>{tracking.order.delivery_boy_name}</div>
            <a href={`tel:${tracking.order.delivery_boy_phone}`}
              style={{ fontSize: '13px', color: T.primary, textDecoration: 'none', fontWeight: '600' }}>
              {tracking.order.delivery_boy_phone}
            </a>
          </div>
        )}

        {/* Shop Info */}
        <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '16px' }}>
          <div style={{ fontSize: '13px', color: T.textSoft }}><strong style={{ color: T.text }}>{tracking?.order?.shop_name}</strong></div>
          <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '4px' }}>{tracking?.order?.shop_address}</div>
        </div>

        {/* Return Button */}
        {currentStatus === 'delivered' && (
          <div style={{ background: T.accentTint, borderRadius: T.radiusMd, padding: '16px', marginTop: '16px' }}>
            <div style={{ fontWeight: '700', color: '#B45309', fontSize: '13px', marginBottom: '8px' }}>Return policy</div>
            <div style={{ fontSize: '12px', color: T.textSoft, marginBottom: '14px', lineHeight: '1.6' }}>
              Return window applies as per product policy. Contact the shop to initiate a return.
            </div>
            {tracking?.order?.shop_phone ? (
              <a href={`tel:${tracking.order.shop_phone}`}
                style={{ display: 'block', textAlign: 'center', padding: '12px', background: T.accent, color: T.text, borderRadius: T.radiusPill, fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
                Call shop: {tracking.order.shop_phone}
              </a>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', background: 'white', color: T.textSoft, borderRadius: T.radiusPill, fontSize: '13px' }}>
                Contact shop directly for return
              </div>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <motion.button {...btnTap} onClick={() => { fetchTracking(); fetchLocation(); }}
          style={{ width: '100%', marginTop: '16px', padding: '14px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '14px', fontFamily: T.font }}>
          Refresh tracking
        </motion.button>
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '100vh', background: 'rgba(17,17,39,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' },
  card:    { background: T.card, borderRadius: '28px 28px 0 0', padding: '28px 22px', width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: T.font },
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
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px', background: T.text,
      padding: '14px 18px', zIndex: 999, display: 'flex',
      alignItems: 'center', gap: '12px', boxShadow: T.shadowFloating, fontFamily: T.font
    }}>
      <img src="/icons/icon-72x72.png" alt="Zaplo" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>Install Zaplo</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Add to home screen for the best experience</div>
      </div>
      <motion.button {...btnTap}
        onClick={async () => {
          const { promptInstall } = await import('../pwa');
          const accepted = await promptInstall();
          if (accepted) setShowBanner(false);
        }}
        style={{ background: T.accent, color: T.text, border: 'none', borderRadius: T.radiusPill, padding: '8px 16px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', full_address: '', landmark: '', phone: '' });
  const { cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount } = useCart();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/products/search?q=');
      setAllProducts(res.data);
      setProducts(res.data);
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
        setScreen('shoplist');
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
  setScreen('categoryProducts');
};


  const openShop = async (shop) => {
    setSelectedShop(shop);
    setScreen('shop');
    setLoading(true);
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
    if (distanceKm <= 5) return 20;
    return 20 + Math.ceil(distanceKm - 5) * 6;
  };

  const placeOrder = async () => {
    if (!address.full_address || !address.phone) {
      alert('Please fill address and phone');
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

      for (const [seller_id, items] of Object.entries(sellerGroups)) {
        const res = await API.post('/orders', {
          seller_id,
          items: items.map(i => ({ product_id: i.id, quantity: i.qty })),
          payment_method: paymentMethod,
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
        alert('Order placed successfully! 🎉 Pay cash on delivery.');
        setScreen('orders');
        fetchMyOrders();
        setCheckoutStep(1);
        return;
      }

      if (paymentMethod === 'ONLINE') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          alert('Failed to load payment gateway. Please try COD.');
          return;
        }

        for (const orderId of placedOrderIds) {
          const { data } = await API.post(`/payments/create-order/${orderId}`);

          await new Promise((resolve, reject) => {
            const options = {
              key: data.key,
              amount: data.amount,
              currency: 'INR',
              name: 'HyperLocal App',
              description: `Order #${orderId.slice(-6).toUpperCase()}`,
              order_id: data.razorpay_order_id,
              prefill: {
                name: user.name,
                contact: user.phone,
              },
              theme: { color: T.primary },

              handler: async (response) => {
                try {
                  await API.post('/payments/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    order_id: orderId,
                  });
                  resolve();
                } catch {
                  alert('Payment done but verification failed. Contact support.');
                  resolve();
                }
              },

              modal: {
                ondismiss: () => {
                  alert('Payment cancelled. Your order is saved. Go to My Orders to pay later.');
                  resolve();
                },
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
              alert(`Payment failed: ${response.error.description}`);
              resolve();
            });
            rzp.open();
          });
        }

        clearCart();
        alert('Payment successful! 🎉');
        setScreen('orders');
        fetchMyOrders();
        setCheckoutStep(1);
      }

    } catch (err) {
      alert(err.response?.data?.error || 'Order failed');
    }
  };

  const getCartQty = (productId) => {
    const item = cart.find(i => i.id === productId);
    return item ? item.qty : 0;
  };

  const ProductCard = ({ product }) => {
    const qty = getCartQty(product.id);
    return (
      <motion.div whileTap={{ scale: 0.98 }} style={{ background: T.card, borderRadius: T.radiusMd, overflow: 'hidden', boxShadow: T.shadowCard, position: 'relative', cursor: 'pointer', border: `1px solid ${T.border}` }}
        onClick={() => setSelectedProduct(product)}>
        <div style={{ position: 'relative' }}>
          {product.image_urls?.[0] || product.image_url ? (
            <img src={product.image_urls?.[0] || product.image_url} alt={product.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '140px', background: T.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px' }}>📦</div>
          )}
          <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}
            onClick={e => e.stopPropagation()}>
            {qty === 0 ? (
              <motion.button {...btnTap} onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })}
                disabled={product.stock === 0}
                style={{ width: '34px', height: '34px', background: product.stock === 0 ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowFloating, lineHeight: 0 }}>
                +
              </motion.button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: '10px', overflow: 'hidden', boxShadow: T.shadowFloating }}>
                <button onClick={() => updateQty(product.id, qty - 1)} style={{ width: '30px', height: '34px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>-</button>
                <span style={{ color: 'white', fontWeight: '700', minWidth: '20px', textAlign: 'center', fontSize: '13px' }}>{qty}</span>
                <button onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })} style={{ width: '30px', height: '34px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>+</button>
              </div>
            )}
          </div>
          {product.stock === 0 && (
            <div style={{ position: 'absolute', top: '10px', left: '10px', background: T.error, color: 'white', padding: '3px 10px', borderRadius: T.radiusPill, fontSize: '10px', fontWeight: '700' }}>OUT OF STOCK</div>
          )}
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: '13px', color: T.text, fontWeight: '600', marginBottom: '4px', lineHeight: '1.35' }}>{product.name}</div>
          <div style={{ fontSize: '11px', color: T.textFaint, marginBottom: '8px' }}>{product.shop_name}</div>
          <div style={{ fontWeight: '800', fontSize: '16px', color: T.text }}>₹{product.price}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font, maxWidth: '480px', margin: '0 auto', position: 'relative', color: T.text }}>
      <FontLoader />
      <InstallBanner />

      {/* HOME SCREEN */}
      {screen === 'home' && (
        <div style={{ paddingBottom: '104px' }}>

          {/* Top Header */}
          <div style={{ background: T.primaryGradient, padding: '20px 20px 24px', borderRadius: '0 0 28px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '19px', letterSpacing: '-0.01em' }}>⚡ 30 minutes</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>Delivering to your location</div>
              </div>
              <motion.div {...btnTap} onClick={() => { setScreen('profile'); }} style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.18)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '19px' }}>👤</span>
              </motion.div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, background: 'white', borderRadius: T.radiusPill, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
                <span style={{ fontSize: '15px', color: T.textFaint }}>🔍</span>
                <input
                  placeholder={searchMode === 'products' ? 'Search for products...' : 'Search for shops...'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', padding: '13px 0', background: 'transparent', fontFamily: T.font, color: T.text }}
                />
              </div>
              <motion.button {...btnTap} onClick={() => setSearchMode(searchMode === 'products' ? 'shops' : 'products')}
                style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, padding: '0 16px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {searchMode === 'products' ? 'Shops' : 'Products'}
              </motion.button>
            </div>
          </div>

          {/* Search Results */}
          {query && (
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: '700', color: T.text, fontSize: '15px' }}>Results for "{query}"</span>
                <motion.button {...btnTap} onClick={search} style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Search</motion.button>
              </div>
              {searchMode === 'shops' && shops.map(shop => (
                <motion.div whileTap={{ scale: 0.98 }} key={shop.id} onClick={() => openShop(shop)}
                  style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                  <div style={{ width: '48px', height: '48px', background: T.primaryTint, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏪</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>{shop.shop_name}</div>
                    <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{shop.locality} • {shop.total_products} products</div>
                  </div>
                  <span style={{ color: T.primary, fontSize: '18px' }}>›</span>
                </motion.div>
              ))}
            </div>
          )}

{/* Categories */}
          {!query && (
            <>
              {/* Banners */}
              <div style={{ padding: '20px 20px 8px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, background: T.primaryGradient, borderRadius: T.radiusMd, padding: '18px', color: 'white' }}>
                  <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.01em' }}>₹20 delivery</div>
                  <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '4px' }}>First 5km • ₹6/km after</div>
                </div>
                <div style={{ flex: 1, background: `linear-gradient(135deg, ${T.accent}, #FFB300)`, borderRadius: T.radiusMd, padding: '18px', color: T.text }}>
                  <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '-0.01em' }}>Lowest prices</div>
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '4px' }}>Best deals near you</div>
                </div>
              </div>

              {/* Browse Categories */}
              <div style={{ padding: '20px 20px 8px' }}>
                <h3 style={{ margin: '0 0 4px', color: T.text, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em' }}>Browse Categories</h3>
                <p style={{ margin: '0 0 16px', color: T.textSoft, fontSize: '13px' }}>Everything you need in one place</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  {categories.filter(c => c.id !== 'all').map(cat => {
                    const count = allProducts.filter(p => p.category?.toLowerCase() === cat.id).length;
                    return (
                      <motion.div whileTap={{ scale: 0.97 }} key={cat.id} onClick={() => openCategoryScreen(cat.id)}
                        style={{
                          background: T.card, borderRadius: '24px', overflow: 'hidden', cursor: 'pointer',
                          border: `1px solid ${T.border}`,
                          boxShadow: T.shadowCard,
                        }}>
                        <div style={{ width: '100%', height: '120px', background: T.primaryTint, overflow: 'hidden' }}>
                          {cat.image ? (
                            <img src={cat.image} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>{cat.emoji}</div>
                          )}
                        </div>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '700', fontSize: '15px', color: T.text }}>{cat.label}</div>
                          <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>{count} products</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Product Search Results (only when searching products) */}
          {query && searchMode === 'products' && (
            <div style={{ padding: '20px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: T.textFaint }}>Loading...</div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '40px', marginBottom: '14px' }}>📭</div>
                  <p style={{ color: T.textSoft, margin: 0 }}>No products found</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* SHOP LIST SCREEN */}
      {screen === 'shoplist' && (
        <div style={{ paddingBottom: '104px' }}>
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>Shops near you</h2>
          </div>
          <div style={{ padding: '20px' }}>
            {shops.map(shop => (
              <motion.div whileTap={{ scale: 0.98 }} key={shop.id} onClick={() => openShop(shop)}
                style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                <div style={{ width: '56px', height: '56px', background: T.primaryTint, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: T.text }}>{shop.shop_name}</div>
                  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>{shop.locality}</div>
                  <div style={{ fontSize: '12px', color: T.primary, fontWeight: '600', marginTop: '5px' }}>{shop.total_products} products available</div>
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
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>
              {categories.find(c => c.id === activeCategory)?.label || 'Category'}
            </h2>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: T.textFaint }}>Loading...</div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>📭</div>
                <p style={{ color: T.textSoft, margin: 0 }}>No products found in this category</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP SCREEN */}
      {screen === 'shop' && selectedShop && (
        <div style={{ paddingBottom: '104px' }}>
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: '0 0 6px', fontSize: '20px', fontWeight: '800' }}>{selectedShop.shop_name}</h2>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>{selectedShop.address}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>{selectedShop.contact_phone}</div>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: T.textFaint }}>Loading products...</div>
            ) : shopProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '40px' }}>📭</div>
                <p style={{ color: T.textSoft }}>No products in this shop</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {shopProducts.map(product => <ProductCard key={product.id} product={{ ...product, seller_id: selectedShop.id }} />)}
              </div>
            )}
            {/* Seller Reviews */}
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
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>My cart</h2>
          </div>

          <div style={{ padding: '20px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '56px', marginBottom: '18px' }}>🛒</div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: T.text, marginBottom: '8px' }}>Your cart is empty</div>
                <p style={{ color: T.textSoft, marginBottom: '22px' }}>Add items to get started</p>
                <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, padding: '13px 30px', fontWeight: '700', cursor: 'pointer' }}>Start shopping</motion.button>
              </div>
            ) : checkoutStep === 1 ? (
              <>
                {cart.map(item => (
                  <div key={item.id} style={{ background: T.card, borderRadius: T.radiusMd, padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                    <div style={{ width: '56px', height: '56px', background: T.primaryTint, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', overflow: 'hidden' }}>
                      {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: T.text }}>{item.name}</div>
                      <div style={{ fontWeight: '800', color: T.primary, fontSize: '15px', marginTop: '3px' }}>₹{item.price}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusSm, overflow: 'hidden' }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: '30px', height: '32px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>-</button>
                      <span style={{ color: 'white', fontWeight: '700', minWidth: '22px', textAlign: 'center', fontSize: '13px' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: '30px', height: '32px', background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ fontWeight: '700', color: T.text, minWidth: '58px', textAlign: 'right' }}>₹{item.price * item.qty}</div>
                  </div>
                ))}
                <div style={{ background: T.card, borderRadius: T.radiusLg, padding: '20px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                    <span style={{ color: T.textSoft }}>Subtotal</span>
                    <span style={{ fontWeight: '600' }}>₹{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', borderTop: `1px solid ${T.border}`, marginBottom: '14px' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>Total</span>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: T.primary }}>₹{total}</span>
                  </div>
                  <div style={{ background: T.accentTint, borderRadius: T.radiusSm, padding: '12px 14px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#B45309', fontWeight: '600' }}>Delivery charge</span>
                      <span style={{ color: '#B45309', fontWeight: '700' }}>₹{deliveryCharge}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSoft, marginTop: '6px' }}>
                      First 5km: ₹20 | Extra: ₹6/km • Pay to delivery partner
                    </div>
                  </div>
                  <motion.button {...btnTap} onClick={() => setCheckoutStep(2)} style={{ width: '100%', padding: '16px', background: T.primaryGradient, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
                    Proceed to checkout →
                  </motion.button>
                </div>
              </>
            ) : checkoutStep === 2 ? (
              <div>
                <h3 style={{ margin: '0 0 18px', color: T.text, fontSize: '17px', fontWeight: '800' }}>Delivery address</h3>
                <div style={{ background: T.card, borderRadius: T.radiusLg, padding: '22px', boxShadow: T.shadowCard, marginBottom: '18px', border: `1px solid ${T.border}` }}>
                  {[
                    { label: 'Full address', key: 'full_address', placeholder: 'House no, Street, Area...', type: 'textarea' },
                    { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
                    { label: 'Phone number', key: 'phone', placeholder: 'Contact for delivery' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '8px' }}>{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '13px 14px', border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', height: '84px', resize: 'none', boxSizing: 'border-box', fontFamily: T.font, background: T.bg }} />
                      ) : (
                        <input placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '13px 14px', border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: T.font, background: T.bg }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => setCheckoutStep(1)} style={{ flex: 1, padding: '15px', background: T.bg, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusPill, fontWeight: '600', cursor: 'pointer' }}>← Back</motion.button>
                  <motion.button {...btnTap} onClick={() => setCheckoutStep(3)} style={{ flex: 2, padding: '15px', background: T.primaryGradient, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer' }}>Continue →</motion.button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 18px', color: T.text, fontSize: '17px', fontWeight: '800' }}>Payment</h3>
                <div style={{ background: T.card, borderRadius: T.radiusLg, padding: '18px', marginBottom: '14px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                  <h4 style={{ margin: '0 0 14px', color: T.text, fontSize: '15px', fontWeight: '700' }}>Order summary</h4>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13px', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ color: T.textSoft }}>{item.name} x{item.qty}</span>
                      <span style={{ fontWeight: '600' }}>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', marginTop: '4px' }}>
                    <span style={{ fontWeight: '700' }}>Total</span>
                    <span style={{ fontWeight: '800', color: T.primary, fontSize: '16px' }}>₹{total}</span>
                  </div>
                  <div style={{ background: T.accentTint, borderRadius: T.radiusSm, padding: '12px 14px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#B45309', fontWeight: '600' }}>Delivery charge</span>
                      <span style={{ color: '#B45309', fontWeight: '700' }}>₹{deliveryCharge}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSoft, marginTop: '6px' }}>
                      Pay delivery charge directly to delivery partner
                    </div>
                  </div>
                </div>
                <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '16px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: T.primary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Delivering to</div>
                  <div style={{ fontSize: '13px', color: T.text }}>{address.full_address}</div>
                  {address.landmark && <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>Near: {address.landmark}</div>}
                  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{address.phone}</div>
                </div>
                <div style={{ background: T.card, borderRadius: T.radiusLg, padding: '18px', marginBottom: '18px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                  <h4 style={{ margin: '0 0 14px', color: T.text, fontSize: '15px', fontWeight: '700' }}>Payment method</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['COD', 'ONLINE'].map(method => (
                      <motion.button {...btnTap} key={method} onClick={() => setPaymentMethod(method)}
                        style={{ flex: 1, padding: '14px', border: `2px solid ${paymentMethod === method ? T.primary : T.border}`, borderRadius: T.radiusSm, cursor: 'pointer', background: paymentMethod === method ? T.primaryTint : 'white', fontWeight: '600', color: paymentMethod === method ? T.primary : T.textSoft, fontSize: '13px' }}>
                        {method === 'COD' ? 'Cash on delivery' : 'Online'}
                      </motion.button>
                    ))}
                  </div>
                  {paymentMethod === 'ONLINE' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: T.successTint, borderRadius: T.radiusSm, fontSize: '12px', color: T.success, fontWeight: '600' }}>
                      You'll be redirected to Razorpay secure payment after placing your order.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => setCheckoutStep(2)} style={{ flex: 1, padding: '15px', background: T.bg, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusPill, fontWeight: '600', cursor: 'pointer' }}>← Back</motion.button>
                  <motion.button {...btnTap} onClick={placeOrder} style={{ flex: 2, padding: '15px', background: T.successGradient, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                    Place order
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
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>My orders</h2>
          </div>
          <div style={{ padding: '20px' }}>
            {myOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '56px', marginBottom: '18px' }}>📭</div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: T.text, marginBottom: '8px' }}>No orders yet</div>
                <motion.button {...btnTap} onClick={() => setScreen('home')} style={{ background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, padding: '13px 30px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Start shopping</motion.button>
              </div>
            ) : myOrders.map(order => (
              <div key={order.id} style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '14px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: T.primary, fontSize: '14px' }}>#{order.id.slice(-6).toUpperCase()}</div>
                    <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{
                    padding: '5px 12px', borderRadius: T.radiusPill, fontSize: '11px', fontWeight: '700', height: 'fit-content',
                    background: order.status === 'delivered' ? T.successTint : order.status === 'pending' ? T.accentTint : T.primaryTint,
                    color: order.status === 'delivered' ? T.success : order.status === 'pending' ? '#B45309' : T.primary,
                  }}>{order.status?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '13px', color: T.textSoft, marginBottom: '10px' }}>{order.shop_name}</div>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ fontSize: '13px', color: T.text, padding: '4px 0' }}>• {item.name} x{item.quantity} — ₹{item.unit_price * item.quantity}</div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textSoft, fontSize: '13px' }}>{order.payment_method}</span>
                  <span style={{ fontWeight: '800', color: T.primary, fontSize: '16px' }}>₹{order.total_amount}</span>
                </div>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <motion.button {...btnTap}
                    onClick={() => setTrackingOrderId(order.id)}
                    style={{ width: '100%', marginTop: '12px', padding: '12px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                    Track order
                  </motion.button>
                )}

                {order.status === 'delivered' && (
                  <motion.button {...btnTap}
                    onClick={() => setTrackingOrderId(order.id)}
                    style={{ width: '100%', marginTop: '12px', padding: '12px', background: T.successTint, color: T.success, border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                    View order details & return
                  </motion.button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE SCREEN */}
      {screen === 'profile' && (
        <div style={{ paddingBottom: '104px', background: T.bg, minHeight: '100vh' }}>

          {/* Header */}
          <div style={{ background: T.card, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: '58px', height: '58px', background: T.primaryGradient, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white', fontWeight: '800' }}>
              {user.name?.[0]?.toUpperCase() || '👤'}
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: T.text }}>{user.name}</div>
              <div style={{ fontSize: '13px', color: T.textSoft, marginTop: '3px' }}>{user.phone}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: T.card, margin: '16px 20px', borderRadius: T.radiusMd, padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
            {[
              { icon: '📦', label: 'Your orders', action: () => { fetchMyOrders(); setScreen('orders'); } },
              { icon: '💬', label: 'Help & support', action: () => setScreen('help') },
              { icon: '📍', label: 'Saved addresses', action: () => setScreen('addresses') },
              { icon: '⭐', label: 'My reviews', action: () => setScreen('myreviews') },
            ].map((item, i) => (
              <motion.div whileTap={{ scale: 0.97 }} key={i} onClick={item.action}
                style={{ background: T.bg, borderRadius: T.radiusSm, padding: '18px', textAlign: 'center', cursor: 'pointer', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: T.text }}>{item.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Your Information */}
          <div style={{ margin: '20px 20px 10px', fontWeight: '700', fontSize: '15px', color: T.text }}>Your information</div>
          <div style={{ background: T.card, margin: '0 20px', borderRadius: T.radiusMd, overflow: 'hidden', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
            {[
              { icon: '📦', label: 'My orders', sub: '', action: () => { fetchMyOrders(); setScreen('orders'); } },
              { icon: '📍', label: 'Saved addresses', sub: `${savedAddresses.length} address${savedAddresses.length !== 1 ? 'es' : ''}`, action: () => setScreen('addresses') },
              { icon: '💳', label: 'Payment history', sub: '', action: () => { fetchMyOrders(); setScreen('orders'); } },
              { icon: '💬', label: 'Help & support', sub: '', action: () => setScreen('help') },
            ].map((item, i, arr) => (
              <div key={i} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '17px 18px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: '19px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: T.text, fontSize: '14px' }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{item.sub}</div>}
                </div>
                <span style={{ color: T.textFaint, fontSize: '17px' }}>›</span>
              </div>
            ))}
          </div>

          {/* Other Information */}
          <div style={{ margin: '20px 20px 10px', fontWeight: '700', fontSize: '15px', color: T.text }}>Other information</div>
          <div style={{ background: T.card, margin: '0 20px', borderRadius: T.radiusMd, overflow: 'hidden', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
            {[
              { icon: '⭐', label: 'My reviews', action: () => setScreen('myreviews') },
              { icon: '📜', label: 'Terms & Conditions', action: () => setScreen('terms') },
              { icon: 'ℹ️', label: 'About Zaplo', action: () => setScreen('help') },
            ].map((item, i, arr) => (
              <div key={i} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '17px 18px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: '19px' }}>{item.icon}</span>
                <div style={{ flex: 1, fontWeight: '600', color: T.text, fontSize: '14px' }}>{item.label}</div>
                <span style={{ color: T.textFaint, fontSize: '17px' }}>›</span>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div style={{ margin: '20px' }}>
            <motion.button {...btnTap} onClick={logout}
              style={{ width: '100%', padding: '17px', background: T.card, color: T.error, border: `1.5px solid ${T.error}`, borderRadius: T.radiusPill, fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: T.shadowCard }}>
              Log out
            </motion.button>
          </div>

          <div style={{ textAlign: 'center', color: T.textFaint, fontSize: '12px', marginTop: '8px' }}>
            App version 1.0.0
          </div>
        </div>
      )}

      {/* MY REVIEWS SCREEN */}
      {screen === 'myreviews' && (
        <div style={{ paddingBottom: '104px' }}>
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>My reviews</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>⭐</div>
              <p style={{ color: T.textSoft }}>Your reviews on products and shops will appear here</p>
              <motion.button {...btnTap} onClick={() => setScreen('home')}
                style={{ marginTop: '14px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, padding: '11px 26px', cursor: 'pointer', fontWeight: '600' }}>
                Start shopping
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* ADDRESSES SCREEN */}
      {screen === 'addresses' && (
        <div style={{ paddingBottom: '104px' }}>
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>My addresses</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <motion.button {...btnTap} onClick={() => setShowAddAddress(!showAddAddress)}
              style={{ width: '100%', padding: '16px', background: T.primaryTint, color: T.primary, border: `2px dashed ${T.primary}`, borderRadius: T.radiusMd, fontWeight: '700', cursor: 'pointer', fontSize: '14px', marginBottom: '18px' }}>
              + Add new address
            </motion.button>

            {showAddAddress && (
              <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '18px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                <h4 style={{ margin: '0 0 14px', color: T.text, fontSize: '15px', fontWeight: '700' }}>New address</h4>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <motion.button {...btnTap} key={l} onClick={() => setNewAddress({ ...newAddress, label: l })}
                      style={{ padding: '7px 18px', borderRadius: T.radiusPill, border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', background: newAddress.label === l ? T.primary : T.bg, color: newAddress.label === l ? 'white' : T.textSoft }}>
                      {l}
                    </motion.button>
                  ))}
                </div>

                {[
                  { label: 'Full address', key: 'full_address', placeholder: 'House no, Street, Area...' },
                  { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
                  { label: 'Phone', key: 'phone', placeholder: 'Contact number' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: T.textSoft, display: 'block', marginBottom: '6px' }}>{f.label}</label>
                    <input placeholder={f.placeholder} value={newAddress[f.key]}
                      onChange={e => setNewAddress({ ...newAddress, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: T.font, background: T.bg }} />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => {
                    if (!newAddress.full_address) { alert('Please enter address'); return; }
                    setSavedAddresses(prev => [...prev, { ...newAddress, id: Date.now() }]);
                    setNewAddress({ label: 'Home', full_address: '', landmark: '', phone: '' });
                    setShowAddAddress(false);
                  }} style={{ flex: 2, padding: '13px', background: T.primary, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer' }}>
                    Save address
                  </motion.button>
                  <motion.button {...btnTap} onClick={() => setShowAddAddress(false)}
                    style={{ flex: 1, padding: '13px', background: T.bg, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusPill, cursor: 'pointer' }}>
                    Cancel
                  </motion.button>
                </div>
              </div>
            )}

            {savedAddresses.length === 0 && !showAddAddress ? (
              <div style={{ textAlign: 'center', padding: '48px', background: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>📍</div>
                <p style={{ color: T.textSoft }}>No saved addresses yet</p>
              </div>
            ) : savedAddresses.map((addr) => (
              <div key={addr.id} style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '12px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: T.primary, fontSize: '13px' }}>
                    {addr.label}
                  </span>
                  <button onClick={() => setSavedAddresses(prev => prev.filter(a => a.id !== addr.id))}
                    style={{ background: T.errorTint, color: T.error, border: 'none', borderRadius: T.radiusPill, padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    Delete
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: T.text }}>{addr.full_address}</div>
                {addr.landmark && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>Near: {addr.landmark}</div>}
                {addr.phone && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{addr.phone}</div>}
                <motion.button {...btnTap} onClick={() => {
                  setAddress({ full_address: addr.full_address, landmark: addr.landmark, phone: addr.phone });
                  setScreen('cart');
                  setCheckoutStep(2);
                }} style={{ marginTop: '12px', width: '100%', padding: '10px', background: T.primaryTint, color: T.primary, border: 'none', borderRadius: T.radiusPill, fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
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
          <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
            <motion.button {...btnTap} onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px' }}>← Back</motion.button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>Help & support</h2>
          </div>
          <div style={{ padding: '20px' }}>

            {[
              { q: 'How do I track my order?', a: 'Go to My Orders and tap "Track Order" on any active order to see live status and delivery partner location.' },
              { q: 'How do I cancel an order?', a: 'You can cancel an order within 2 minutes of placing it. Go to My Orders and tap Cancel. After confirmation by seller, cancellation is not possible.' },
              { q: 'What is the delivery charge?', a: 'Delivery charge is ₹20 for first 5km. For every extra km beyond 5km, ₹6 is added. The charge is paid directly to the delivery partner.' },
              { q: 'How does payment work?', a: 'You can pay via Cash on Delivery (pay to delivery partner) or Online (Razorpay secure payment). 10% platform fee applies on all orders.' },
              { q: 'What is the return policy?', a: 'Return policy varies by product category. Fresh food cannot be returned. Electronics have 7-day replacement. Fashion has 3-day return window.' },
              { q: 'How do I become a seller?', a: 'Register as a seller from the login page. After admin approval, you can start listing products and receiving orders.' },
            ].map((faq, i) => (
              <div key={i} style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '10px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: '700', color: T.text, fontSize: '14px', marginBottom: '10px' }}>{faq.q}</div>
                <div style={{ fontSize: '13px', color: T.textSoft, lineHeight: '1.7' }}>{faq.a}</div>
              </div>
            ))}

            <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '22px', marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 14px', color: T.primary, fontSize: '15px', fontWeight: '700' }}>Contact us</h4>
              <div style={{ fontSize: '13px', color: T.textSoft, lineHeight: '2.1' }}>
                <div>support@zaplo.in</div>
                <div>+91 6392303278</div>
                <div>Mon–Sat, 9AM – 6PM</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TERMS & CONDITIONS SCREEN (shared component) */}
      {screen === 'terms' && (
        <TermsAndConditions onBack={() => setScreen('profile')} />
      )}

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '100vh', background: T.card, zIndex: 200, overflowY: 'hidden' }}>
          <div style={{ height: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            {/* Back button */}
            <div style={{ position: 'absolute', top: '18px', left: '18px', zIndex: 10 }}>
              <motion.button {...btnTap} onClick={() => setSelectedProduct(null)}
                style={{ width: '40px', height: '40px', background: 'white', border: 'none', borderRadius: '50%', boxShadow: T.shadowFloating, cursor: 'pointer', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ←
              </motion.button>
            </div>

            {/* Product Image */}
            <div style={{ width: '100%', height: '320px', background: T.bg, position: 'relative' }}>
              {selectedProduct.image_urls?.[0] || selectedProduct.image_url ? (
                <img src={selectedProduct.image_urls?.[activeImageIndex] || selectedProduct.image_url}
                  alt={selectedProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>📦</div>
              )}

              {selectedProduct.image_urls?.length > 1 && activeImageIndex > 0 && (
                <button onClick={() => setActiveImageIndex(prev => prev - 1)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(26,26,26,0.35)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
                  ‹
                </button>
              )}

              {selectedProduct.image_urls?.length > 1 && activeImageIndex < selectedProduct.image_urls.length - 1 && (
                <button onClick={() => setActiveImageIndex(prev => prev + 1)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(26,26,26,0.35)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
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
            </div>

            {/* Product Info */}
            <div style={{ padding: '24px 20px', paddingBottom: '100px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: T.primary, fontWeight: '600', background: T.primaryTint, padding: '5px 12px', borderRadius: T.radiusPill }}>
                  {selectedProduct.shop_name}
                </span>
                {selectedProduct.category && (
                  <span style={{ fontSize: '12px', color: T.textSoft, background: T.bg, padding: '5px 12px', borderRadius: T.radiusPill }}>
                    {selectedProduct.category}
                  </span>
                )}
              </div>

              <h2 style={{ margin: '0 0 12px', fontSize: '21px', fontWeight: '800', color: T.text, lineHeight: '1.35', letterSpacing: '-0.01em' }}>
                {selectedProduct.name}
              </h2>

              {/* Price & Unit Info */}
              <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '18px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: T.text, letterSpacing: '-0.02em' }}>₹{selectedProduct.price}</span>
                  <span style={{ fontSize: '14px', color: T.textSoft }}>
                    per {selectedProduct.unit_type || 'piece'}
                    {selectedProduct.unit_weight && ` (${selectedProduct.unit_weight}g)`}
                  </span>
                </div>

                {selectedProduct.price_per_kg && (
                  <div style={{ background: T.accentTint, borderRadius: T.radiusPill, padding: '7px 14px', marginBottom: '10px', display: 'inline-block' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#B45309' }}>
                      ₹{selectedProduct.price_per_kg}/kg
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedProduct.stock > 10 ? T.success : selectedProduct.stock > 0 ? T.accent : T.error }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: selectedProduct.stock > 10 ? T.success : selectedProduct.stock > 0 ? '#B45309' : T.error }}>
                    {selectedProduct.stock > 10 ? 'In stock' :
                     selectedProduct.stock > 0 ? 'Limited stock' : 'Out of stock'}
                  </span>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: T.primaryTint, color: T.primary, padding: '5px 14px', borderRadius: T.radiusPill, fontSize: '12px', fontWeight: '600' }}>
                    Sold per {selectedProduct.unit_type || 'piece'}
                  </span>
                  {selectedProduct.unit_weight && (
                    <span style={{ background: T.successTint, color: T.success, padding: '5px 14px', borderRadius: T.radiusPill, fontSize: '12px', fontWeight: '600' }}>
                      {selectedProduct.unit_weight}g each
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery info */}
              <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div>
                  <div style={{ fontWeight: '700', color: T.primary, fontSize: '14px' }}>30 min delivery</div>
                  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>₹20 for first 5km, ₹6/km after</div>
                </div>
              </div>

              {selectedProduct.description && (
                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '15px', fontWeight: '700' }}>About this product</h4>
                  <p style={{ margin: 0, color: T.textSoft, fontSize: '14px', lineHeight: '1.7' }}>{selectedProduct.description}</p>
                </div>
              )}

              <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '16px 18px', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '14px', fontWeight: '700' }}>Sold by</h4>
                <div style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>{selectedProduct.shop_name}</div>
                <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '4px' }}>{selectedProduct.locality}</div>
              </div>

              {selectedProduct.return_policy && (
  <div style={{ background: T.successTint, borderRadius: T.radiusMd, padding: '14px 18px', marginBottom: '18px' }}>
    <div style={{ fontSize: '13px', color: T.success, fontWeight: '600' }}>
      Return policy: {RETURN_POLICY_LABELS[selectedProduct.return_policy] || selectedProduct.return_policy.replace(/_/g, ' ')}
    </div>
  </div>
)}
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '15px', fontWeight: '700' }}>Reviews</h4>
                <ReviewSection type="product" id={selectedProduct?.id} />
              </div>
            </div>
          </div>
          {/* Bottom Add to Cart */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: T.card, padding: '18px 20px', boxShadow: '0 -8px 24px rgba(17,17,39,0.08)', zIndex: 201 }}>
            {getCartQty(selectedProduct.id) === 0 ? (
              <motion.button {...btnTap}
                onClick={() => addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id })}
                disabled={selectedProduct.stock === 0}
                style={{ width: '100%', padding: '17px', background: selectedProduct.stock === 0 ? T.textFaint : T.primaryGradient, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '800', fontSize: '16px', cursor: selectedProduct.stock === 0 ? 'not-allowed' : 'pointer' }}>
                {selectedProduct.stock === 0 ? 'Out of stock' : 'Add to cart'}
              </motion.button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusPill, overflow: 'hidden', flex: 1 }}>
                  <button onClick={() => updateQty(selectedProduct.id, getCartQty(selectedProduct.id) - 1)}
                    style={{ flex: 1, padding: '16px', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>-</button>
                  <span style={{ color: 'white', fontWeight: '800', fontSize: '17px', minWidth: '40px', textAlign: 'center' }}>{getCartQty(selectedProduct.id)}</span>
                  <button onClick={() => addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id })}
                    style={{ flex: 1, padding: '16px', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>+</button>
                </div>
                <motion.button {...btnTap} onClick={() => { setScreen('cart'); setSelectedProduct(null); }}
                  style={{ padding: '16px 22px', background: T.successGradient, color: 'white', border: 'none', borderRadius: T.radiusPill, fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                  View cart
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}

      {trackingOrderId && (
        <OrderTracking
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      )}

      {/* Bottom Navigation — floating, blurred */}
      <div style={{
        position: 'fixed', bottom: '14px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)', maxWidth: '452px', background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderRadius: T.radiusPill, display: 'flex', boxShadow: T.shadowFloating,
        zIndex: 100, border: `1px solid ${T.border}`, padding: '6px'
      }}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'shoplist', icon: '🏪', label: 'Shops', action: () => { API.get('/sellers/search?q=').then(r => { setShops(r.data); setScreen('shoplist'); }); } },
          { id: 'cart', icon: '🛒', label: 'Cart', badge: cartCount,
            action: () => { getBuyerLocation(); setScreen('cart'); } },
          { id: 'orders', icon: '📦', label: 'Orders', action: () => { fetchMyOrders(); setScreen('orders'); } },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ].map(item => (
          <motion.button whileTap={{ scale: 0.9 }} key={item.id}
            onClick={() => item.action ? item.action() : setScreen(item.id)}
            style={{ flex: 1, padding: '10px 0', background: screen === item.id ? T.primaryTint : 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', position: 'relative', borderRadius: T.radiusPill, margin: '0 2px' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: screen === item.id ? T.primary : T.textFaint }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ position: 'absolute', top: '2px', right: '14px', background: T.accent, color: T.text, borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{item.badge}</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}