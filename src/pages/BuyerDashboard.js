import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

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
  { id: 'all', label: 'All', emoji: '🛍️' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'fresh', label: 'Fresh', emoji: '🥬' },
  { id: 'electronics', label: 'Electronics', emoji: '🎧' },
  { id: 'fashion', label: 'Fashion', emoji: '👕' },
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'stationery', label: 'Stationery', emoji: '📚' },
];
const StarRating = ({ value, onChange, readonly = false }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map(star => (
      <span key={star}
        onClick={() => !readonly && onChange?.(star)}
        style={{ fontSize: readonly ? '14px' : '24px', cursor: readonly ? 'default' : 'pointer', color: star <= value ? '#f4c430' : '#ddd' }}>
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
      <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a2e' }}>{average || '—'}</span>
          <div>
            <StarRating value={Math.round(average)} readonly />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{reviews.length} reviews</div>
          </div>
        </div>
      </div>
      <div style={{ background: 'white', border: '1.5px solid #e8e8e8', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontWeight: '700', color: '#1a1a2e', marginBottom: '10px', fontSize: '14px' }}>✍️ Write a Review</div>
        <StarRating value={rating} onChange={setRating} />
        <textarea placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)}
          style={{ width: '100%', marginTop: '10px', padding: '10px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', height: '70px', boxSizing: 'border-box' }} />
        <button onClick={submitReview} disabled={loading}
          style={{ marginTop: '8px', padding: '10px 24px', background: '#5c2d91', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Submitting...' : '⭐ Submit Review'}
        </button>
      </div>
      {reviews.map(r => (
        <div key={r.id} style={{ background: 'white', border: '1px solid #f0f0e8', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e' }}>👤 {r.buyer_name}</span>
            <StarRating value={r.rating} readonly />
          </div>
          {r.comment && <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{r.comment}</p>}
          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '6px' }}>{new Date(r.created_at).toLocaleDateString()}</div>
        </div>
      ))}
      {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#bbb', fontSize: '13px' }}>No reviews yet. Be the first!</div>}
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
    { key: 'pending',          label: 'Order Placed',       icon: '📋' },
    { key: 'confirmed',        label: 'Confirmed',          icon: '✅' },
    { key: 'preparing',        label: 'Preparing',          icon: '👨‍🍳' },
    { key: 'picked_up',        label: 'Picked Up',          icon: '🛵' },
    { key: 'out_for_delivery', label: 'Out for Delivery',   icon: '🚚' },
    { key: 'delivered',        label: 'Delivered',          icon: '🎉' },
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
    // Poll every 30 seconds for live updates
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
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading tracking...</div>
      </div>
    </div>
  );
 
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1a1a2e', fontSize: '18px' }}>📦 Order Tracking</h3>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
              #{orderId.slice(-6).toUpperCase()}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px' }}>
            ✕
          </button>
        </div>
 
        {/* Status Steps */}
        <div style={{ marginBottom: '20px' }}>
          {STEPS.map((step, idx) => {
            const isDone    = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                {/* Icon + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: isDone ? (isCurrent ? '#5c2d91' : '#e8fff8') : '#f0f0f0',
                    border: isCurrent ? '2px solid #5c2d91' : isDone ? '2px solid #00b894' : '2px solid #e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                    boxShadow: isCurrent ? '0 0 0 4px #5c2d9122' : 'none',
                  }}>
                    {isDone && !isCurrent ? '✓' : step.icon}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div style={{ width: '2px', height: '24px', background: idx < currentStepIdx ? '#00b894' : '#e8e8e8', marginTop: '2px' }} />
                  )}
                </div>
                {/* Label */}
                <div style={{ paddingTop: '6px' }}>
                  <div style={{ fontWeight: isCurrent ? '700' : '500', color: isDone ? '#1a1a2e' : '#bbb', fontSize: '14px' }}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div style={{ fontSize: '11px', color: '#5c2d91', fontWeight: '600', marginTop: '2px' }}>● Current Status</div>
                  )}
                  {/* Show log time if available */}
                  {tracking?.tracking_log?.find(l => l.status === step.key) && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>
                      {new Date(tracking.tracking_log.find(l => l.status === step.key).created_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
 
        {/* Live Map (shows when out for delivery) */}
        {location && (currentStatus === 'out_for_delivery' || currentStatus === 'picked_up') && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', color: '#1a1a2e', fontSize: '14px', marginBottom: '8px' }}>
              🗺️ Live Location
            </div>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e8e8e8' }}>
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
  <div style={{ fontSize: '13px', color: '#5c2d91', fontWeight: '700', marginTop: '8px', textAlign: 'center' }}>
    📏 {distanceKm.toFixed(1)} km away
  </div>
)}

<div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
  🔄 Updates every 30 seconds
</div>
          </div>
        )}
 
        {/* Delivery Boy Info */}
        {tracking?.order?.delivery_boy_name && (
          <div style={{ background: '#f0eeff', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', color: '#5c2d91', fontSize: '13px', marginBottom: '6px' }}>🛵 Your Delivery Partner</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{tracking.order.delivery_boy_name}</div>
            <a href={`tel:${tracking.order.delivery_boy_phone}`}
              style={{ fontSize: '13px', color: '#5c2d91', textDecoration: 'none', fontWeight: '600' }}>
              📞 {tracking.order.delivery_boy_phone}
            </a>
          </div>
        )}
 
        {/* Shop Info */}
        <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>🏪 <strong>{tracking?.order?.shop_name}</strong></div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{tracking?.order?.shop_address}</div>
        </div>
 
        {/* Refresh Button */}
        <button onClick={() => { fetchTracking(); fetchLocation(); }}
          style={{ width: '100%', marginTop: '16px', padding: '12px', background: '#f0eeff', color: '#5c2d91', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
          🔄 Refresh Tracking
        </button>
      </div>
    </div>
  );
}
 
const styles = {
  overlay: { position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' },
  card:    { background: 'white', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto' },
};
 
function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
 
  useEffect(() => {
    // Show banner when PWA install is available
    window.addEventListener('pwaInstallReady', () => setShowBanner(true));
    // Hide if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }
  }, []);
 
  if (!showBanner) return null;
 
  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px', background: '#5c2d91',
      padding: '12px 16px', zIndex: 999, display: 'flex',
      alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }}>
      <img src="/icons/icon-72x72.png" alt="Zaplo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>Install Zaplo App</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>Add to home screen for best experience</div>
      </div>
      <button
        onClick={async () => {
          const { promptInstall } = await import('../pwa');
          const accepted = await promptInstall();
          if (accepted) setShowBanner(false);
        }}
        style={{ background: 'white', color: '#5c2d91', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
        Install
      </button>
      <button onClick={() => setShowBanner(false)}
        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>
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

  // Load all products on mount
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
 
    // Place all orders first (one per seller)
    for (const [seller_id, items] of Object.entries(sellerGroups)) {
      const res = await API.post('/orders', {
        seller_id,
        items: items.map(i => ({ product_id: i.id, quantity: i.qty })),
        payment_method: paymentMethod,
        delivery_address: address.full_address,
        delivery_phone: address.phone,
        delivery_landmark: address.landmark,
        buyer_lat: buyerLocation?.lat,   // 👈 ADD THIS
        buyer_lng: buyerLocation?.lng, 
      });
      placedOrderIds.push(res.data.order.id || res.data.id);
    }
 
    // If COD — done!
    if (paymentMethod === 'COD') {
      clearCart();
      alert('Order placed successfully! 🎉 Pay cash on delivery.');
      setScreen('orders');
      fetchMyOrders();
      setCheckoutStep(1);
      return;
    }
 
    // If ONLINE — open Razorpay for each order
    if (paymentMethod === 'ONLINE') {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load payment gateway. Please try COD.');
        return;
      }
 
      for (const orderId of placedOrderIds) {
        // Create Razorpay order on backend
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
            theme: { color: '#5c2d91' },
 
            handler: async (response) => {
              try {
                // Verify payment on backend
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
    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'relative', cursor: 'pointer' }}
      onClick={() => setSelectedProduct(product)}>
      <div style={{ position: 'relative' }}>
        {product.image_urls?.[0] || product.image_url ? (
          <img src={product.image_urls?.[0] || product.image_url} alt={product.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '140px', background: 'linear-gradient(135deg, #f0eeff, #e8e0ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📦</div>
        )}
        {/* Add/Remove buttons */}
        <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}
          onClick={e => e.stopPropagation()}>
          {qty === 0 ? (
            <button onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })}
              disabled={product.stock === 0}
              style={{ width: '36px', height: '36px', background: product.stock === 0 ? '#ccc' : '#5c2d91', color: 'white', border: 'none', borderRadius: '10px', fontSize: '22px', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(92,45,145,0.4)' }}>
              +
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', background: '#5c2d91', borderRadius: '10px', overflow: 'hidden' }}>
              <button onClick={() => updateQty(product.id, qty - 1)} style={{ width: '32px', height: '36px', background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>-</button>
              <span style={{ color: 'white', fontWeight: '700', minWidth: '24px', textAlign: 'center', fontSize: '14px' }}>{qty}</span>
              <button onClick={() => addToCart({ ...product, seller_id: product.shop_id || product.seller_id })} style={{ width: '32px', height: '36px', background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>+</button>
            </div>
          )}
        </div>
        {product.stock === 0 && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>OUT OF STOCK</div>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: '13px', color: '#333', fontWeight: '600', marginBottom: '2px', lineHeight: '1.3' }}>{product.name}</div>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>🏪 {product.shop_name}</div>
        <div style={{ fontWeight: '800', fontSize: '16px', color: '#1a1a2e' }}>₹{product.price}</div>
      </div>
    </div>
  );
};

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1fb', fontFamily: "'Inter', sans-serif", maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
         <InstallBanner />

      {/* HOME SCREEN */}
      {screen === 'home' && (
        <div style={{ paddingBottom: '80px' }}>

          {/* Top Header */}
          <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px 16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>⚡ 30 minutes</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>Delivering to your location</div>
              </div>
              <div onClick={() => { setScreen('profile'); }} style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '20px' }}>👤</span>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                <span style={{ fontSize: '16px', color: '#999' }}>🔍</span>
                <input
                  placeholder={searchMode === 'products' ? 'Search for products...' : 'Search for shops...'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', padding: '12px 0', background: 'transparent' }}
                />
              </div>
              <button onClick={() => setSearchMode(searchMode === 'products' ? 'shops' : 'products')}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '0 14px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {searchMode === 'products' ? '🏪 Shops' : '📦 Products'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {query && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', color: '#1a1a2e' }}>Results for "{query}"</span>
                <button onClick={search} style={{ background: '#5c2d91', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Search</button>
              </div>
              {searchMode === 'shops' && shops.map(shop => (
                <div key={shop.id} onClick={() => openShop(shop)}
                  style={{ background: 'white', borderRadius: '14px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f0eeff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏪</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#1a1a2e' }}>{shop.shop_name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📍 {shop.locality} • {shop.total_products} products</div>
                  </div>
                  <span style={{ color: '#5c2d91', fontSize: '18px' }}>›</span>
                </div>
              ))}
            </div>
          )}

          {/* Categories */}
          {!query && (
            <>
              <div style={{ padding: '16px 16px 8px', overflowX: 'auto', display: 'flex', gap: '10px', scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => filterByCategory(cat.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: activeCategory === cat.id ? '#5c2d91' : 'white', border: 'none', borderRadius: '14px', padding: '10px 16px', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: '70px' }}>
                    <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: activeCategory === cat.id ? 'white' : '#333' }}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Banners */}
              <div style={{ padding: '8px 16px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', borderRadius: '14px', padding: '14px', color: 'white' }}>
                  <div style={{ fontWeight: '800', fontSize: '18px' }}>₹20 DELIVERY</div>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>First 5km • ₹6/km after</div>
                </div>
                <div style={{ flex: 1, background: 'linear-gradient(135deg, #00b894, #00cec9)', borderRadius: '14px', padding: '14px', color: 'white' }}>
                  <div style={{ fontWeight: '800', fontSize: '16px' }}>LOWEST PRICES</div>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>Best deals near you</div>
                </div>
              </div>
            </>
          )}

          {/* Products Grid */}
          <div style={{ padding: '8px 16px' }}>
            {!query && <h3 style={{ margin: '8px 0 12px', color: '#1a1a2e', fontSize: '16px', fontWeight: '700' }}>
              {activeCategory === 'all' ? '🛍️ All Products' : `${categories.find(c => c.id === activeCategory)?.emoji} ${categories.find(c => c.id === activeCategory)?.label}`}
            </h3>}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <p style={{ color: '#999' }}>No products found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {products.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP LIST SCREEN */}
      {screen === 'shoplist' && (
        <div style={{ paddingBottom: '80px' }}>
          <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
            <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>🏪 Shops Near You</h2>
          </div>
          <div style={{ padding: '16px' }}>
            {shops.map(shop => (
              <div key={shop.id} onClick={() => openShop(shop)}
                style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width: '56px', height: '56px', background: '#f0eeff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>{shop.shop_name}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>📍 {shop.locality}</div>
                  <div style={{ fontSize: '12px', color: '#5c2d91', fontWeight: '600', marginTop: '4px' }}>{shop.total_products} products available</div>
                </div>
                <span style={{ color: '#5c2d91', fontSize: '22px' }}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHOP SCREEN */}
      {screen === 'shop' && selectedShop && (
        <div style={{ paddingBottom: '80px' }}>
          <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
            <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
            <h2 style={{ color: 'white', margin: '0 0 4px', fontSize: '20px' }}>🏪 {selectedShop.shop_name}</h2>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>📍 {selectedShop.address}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>📞 {selectedShop.contact_phone}</div>
          </div>
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading products...</div>
            ) : shopProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px' }}>
                <div style={{ fontSize: '40px' }}>📭</div>
                <p style={{ color: '#999' }}>No products in this shop</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {shopProducts.map(product => <ProductCard key={product.id} product={{ ...product, seller_id: selectedShop.id }} />)}
              </div>
            )}
            {/* Seller Reviews */}
          <div style={{ padding: '0 16px 16px' }}>
            <h4 style={{ margin: '0 0 8px', color: '#1a1a2e', fontSize: '15px' }}>⭐ Shop Reviews</h4>
            <ReviewSection type="seller" id={selectedShop?.id} />
          </div>

        </div>
      </div>
    )}
          
        

 
      {/* CART SCREEN */}
      {screen === 'cart' && (
        <div style={{ paddingBottom: '80px' }}>
          <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
            <button onClick={() => setScreen('home')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
            <h2 style={{ color: 'white', margin: 0 }}>🛒 My Cart</h2>
          </div>

          <div style={{ padding: '16px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px' }}>
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>🛒</div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#1a1a2e', marginBottom: '8px' }}>Your cart is empty</div>
                <p style={{ color: '#999', marginBottom: '20px' }}>Add items to get started</p>
                <button onClick={() => setScreen('home')} style={{ background: '#5c2d91', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: '700', cursor: 'pointer' }}>Start Shopping</button>
              </div>
            ) : checkoutStep === 1 ? (
              <>
                {cart.map(item => (
                  <div key={item.id} style={{ background: 'white', borderRadius: '14px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '56px', height: '56px', background: '#f0eeff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', overflow: 'hidden' }}>
                      {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>{item.name}</div>
                      <div style={{ fontWeight: '800', color: '#5c2d91', fontSize: '15px', marginTop: '2px' }}>₹{item.price}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#5c2d91', borderRadius: '10px', overflow: 'hidden' }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: '32px', height: '34px', background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>-</button>
                      <span style={{ color: 'white', fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: '32px', height: '34px', background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ fontWeight: '700', color: '#1a1a2e', minWidth: '60px', textAlign: 'right' }}>₹{item.price * item.qty}</div>
                  </div>
                ))}
              <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
    <span style={{ color: '#666' }}>Subtotal</span>
    <span style={{ fontWeight: '600' }}>₹{total}</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f0f0e8', marginBottom: '8px' }}>
    <span style={{ fontWeight: '700', fontSize: '16px' }}>Total</span>
    <span style={{ fontWeight: '800', fontSize: '18px', color: '#5c2d91' }}>₹{total}</span>
  </div>
  <div style={{ background: '#fff3f0', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: '#e17055', fontWeight: '600' }}>🚚 Delivery Charge</span>
      <span style={{ color: '#e17055', fontWeight: '700' }}>₹{deliveryCharge}</span>
    </div>
    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
      📍 First 5km: ₹20 | Extra: ₹6/km • Pay to delivery boy
    </div>
  </div>
  <button onClick={() => setCheckoutStep(2)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
    Proceed to Checkout →
  </button>
</div>
              </>
            ) : checkoutStep === 2 ? (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>📍 Delivery Address</h3>
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
                  {[
                    { label: 'Full Address', key: 'full_address', placeholder: 'House no, Street, Area...', type: 'textarea' },
                    { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
                    { label: 'Phone Number', key: 'phone', placeholder: 'Contact for delivery' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', outline: 'none', height: '80px', resize: 'none', boxSizing: 'border-box' }} />
                      ) : (
                        <input placeholder={f.placeholder} value={address[f.key]}
                          onChange={e => setAddress({ ...address, [f.key]: e.target.value })}
                          style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCheckoutStep(1)} style={{ flex: 1, padding: '14px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>← Back</button>
                  <button onClick={() => setCheckoutStep(3)} style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Continue →</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>💳 Payment</h3>
                <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#1a1a2e', fontSize: '15px' }}>Order Summary</h4>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #f8f8f0' }}>
                      <span>{item.name} x{item.qty}</span>
                      <span style={{ fontWeight: '600' }}>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
  <span style={{ fontWeight: '700' }}>Total</span>
  <span style={{ fontWeight: '800', color: '#5c2d91', fontSize: '16px' }}>₹{total}</span>
</div>
<div style={{ background: '#fff3f0', borderRadius: '8px', padding: '10px 12px', marginTop: '10px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
    <span style={{ color: '#e17055', fontWeight: '600' }}>🚚 Delivery Charge</span>
    <span style={{ color: '#e17055', fontWeight: '700' }}>₹{deliveryCharge}</span>
  </div>
  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
    Pay delivery charge directly to delivery boy
  </div>
</div>
                </div>
                <div style={{ background: '#f0eeff', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#5c2d91', marginBottom: '6px' }}>📍 DELIVERING TO</div>
                  <div style={{ fontSize: '13px', color: '#333' }}>{address.full_address}</div>
                  {address.landmark && <div style={{ fontSize: '12px', color: '#666' }}>Near: {address.landmark}</div>}
                  <div style={{ fontSize: '12px', color: '#666' }}>📞 {address.phone}</div>
                </div>
                <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#1a1a2e', fontSize: '15px' }}>Payment Method</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['COD', 'ONLINE'].map(method => (
                      <button key={method} onClick={() => setPaymentMethod(method)}
                        style={{ flex: 1, padding: '12px', border: `2px solid ${paymentMethod === method ? '#5c2d91' : '#e8e8e8'}`, borderRadius: '12px', cursor: 'pointer', background: paymentMethod === method ? '#f0eeff' : 'white', fontWeight: '600', color: paymentMethod === method ? '#5c2d91' : '#666', fontSize: '13px' }}>
                        {method === 'COD' ? '💵 Cash on Delivery' : '💳 Online'}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'ONLINE' && (
  <div style={{ marginTop: '10px', padding: '10px', background: '#f0fff8', borderRadius: '8px', fontSize: '12px', color: '#00b894' }}>
    ✅ You will be redirected to Razorpay secure payment after placing order.
  </div>
)}
 

                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCheckoutStep(2)} style={{ flex: 1, padding: '14px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>← Back</button>
                  <button onClick={placeOrder} style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                    ✅ Place Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDERS SCREEN */}
      {screen === 'orders' && (
        <div style={{ paddingBottom: '80px' }}>
          <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
            <h2 style={{ color: 'white', margin: 0 }}>📦 My Orders</h2>
          </div>
          <div style={{ padding: '16px' }}>
            {myOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px' }}>
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#1a1a2e', marginBottom: '8px' }}>No orders yet</div>
                <button onClick={() => setScreen('home')} style={{ background: '#5c2d91', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>Start Shopping</button>
              </div>
            ) : myOrders.map(order => (
              <div key={order.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#5c2d91', fontSize: '14px' }}>#{order.id.slice(-6).toUpperCase()}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: order.status === 'delivered' ? '#e8fff8' : order.status === 'pending' ? '#fff3f0' : '#f0eeff',
                    color: order.status === 'delivered' ? '#00b894' : order.status === 'pending' ? '#e17055' : '#5c2d91',
                  }}>{order.status?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>🏪 {order.shop_name}</div>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#333', padding: '3px 0' }}>• {item.name} x{item.quantity} — ₹{item.unit_price * item.quantity}</div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0e8' }}>
                  <span style={{ color: '#666', fontSize: '13px' }}>{order.payment_method}</span>
                  <span style={{ fontWeight: '800', color: '#5c2d91', fontSize: '16px' }}>₹{order.total_amount}</span>
                </div>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
  <button
    onClick={() => setTrackingOrderId(order.id)}
    style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#f0eeff', color: '#5c2d91', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
    📍 Track Order
  </button>
)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE SCREEN */}
{screen === 'profile' && (
  <div style={{ paddingBottom: '80px', background: '#f4f1fb', minHeight: '100vh' }}>
    
    {/* Header */}
    <div style={{ background: 'white', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #f0f0e8' }}>
      <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white', fontWeight: '800' }}>
        {user.name?.[0]?.toUpperCase() || '👤'}
      </div>
      <div>
        <div style={{ fontWeight: '800', fontSize: '18px', color: '#1a1a2e' }}>{user.name?.toUpperCase()}</div>
        <div style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>{user.phone}</div>
      </div>
    </div>
 
    {/* Quick Actions */}
    <div style={{ background: 'white', margin: '12px 16px', borderRadius: '16px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {[
        { icon: '📦', label: 'Your Orders', action: () => { fetchMyOrders(); setScreen('orders'); } },
        { icon: '💬', label: 'Help & Support', action: () => setScreen('help') },
        { icon: '📍', label: 'Saved Addresses', action: () => setScreen('addresses') },
        { icon: '⭐', label: 'My Reviews', action: () => setScreen('myreviews') },
      ].map((item, i) => (
        <div key={i} onClick={item.action}
          style={{ background: '#f8f7ff', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', border: '1px solid #e8e0ff' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>{item.icon}</div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a2e' }}>{item.label}</div>
        </div>
      ))}
    </div>
 
    {/* Your Information */}
    <div style={{ margin: '0 16px 8px', fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>Your Information</div>
    <div style={{ background: 'white', margin: '0 16px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {[
        { icon: '📦', label: 'My Orders', sub: '', action: () => { fetchMyOrders(); setScreen('orders'); } },
        { icon: '📍', label: 'Saved Addresses', sub: `${savedAddresses.length} address${savedAddresses.length !== 1 ? 'es' : ''}`, action: () => setScreen('addresses') },
        { icon: '💳', label: 'Payment History', sub: '', action: () => { fetchMyOrders(); setScreen('orders'); } },
        { icon: '💬', label: 'Help & Support', sub: '', action: () => setScreen('help') },
      ].map((item, i, arr) => (
        <div key={i} onClick={item.action}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? '1px solid #f0f0e8' : 'none' }}>
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>{item.label}</div>
            {item.sub && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{item.sub}</div>}
          </div>
          <span style={{ color: '#ccc', fontSize: '18px' }}>›</span>
        </div>
      ))}
    </div>
 
    {/* Other Information */}
    <div style={{ margin: '16px 16px 8px', fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>Other Information</div>
    <div style={{ background: 'white', margin: '0 16px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {[
        { icon: '⭐', label: 'My Reviews', action: () => setScreen('myreviews') },
        { icon: 'ℹ️', label: 'About Zaplo', action: () => setScreen('help') },
      ].map((item, i, arr) => (
        <div key={i} onClick={item.action}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', cursor: 'pointer', borderBottom: i < arr.length - 1 ? '1px solid #f0f0e8' : 'none' }}>
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <div style={{ flex: 1, fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>{item.label}</div>
          <span style={{ color: '#ccc', fontSize: '18px' }}>›</span>
        </div>
      ))}
    </div>
 
    {/* Logout */}
    <div style={{ margin: '16px' }}>
      <button onClick={logout}
        style={{ width: '100%', padding: '16px', background: 'white', color: '#ff4444', border: '1.5px solid #ff4444', borderRadius: '14px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        🚪 Log Out
      </button>
    </div>
 
    {/* App version */}
    <div style={{ textAlign: 'center', color: '#bbb', fontSize: '12px', marginTop: '8px' }}>
      App version 1.0.0
    </div>
  </div>
)}
 
{/* MY REVIEWS SCREEN */}
{screen === 'myreviews' && (
  <div style={{ paddingBottom: '80px' }}>
    <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
      <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
      <h2 style={{ color: 'white', margin: 0 }}>⭐ My Reviews</h2>
    </div>
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
        <p style={{ color: '#999' }}>Your reviews on products and shops will appear here</p>
        <button onClick={() => setScreen('home')}
          style={{ marginTop: '12px', background: '#5c2d91', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontWeight: '600' }}>
          Start Shopping
        </button>
      </div>
    </div>
  </div>
)}
 

{/* ADDRESSES SCREEN */}
{screen === 'addresses' && (
  <div style={{ paddingBottom: '80px' }}>
    <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
      <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
      <h2 style={{ color: 'white', margin: 0 }}>📍 My Addresses</h2>
    </div>
    <div style={{ padding: '16px' }}>
      {/* Add new address button */}
      <button onClick={() => setShowAddAddress(!showAddAddress)}
        style={{ width: '100%', padding: '14px', background: '#f0eeff', color: '#5c2d91', border: '2px dashed #5c2d91', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', marginBottom: '16px' }}>
        + Add New Address
      </button>

      {/* Add address form */}
      {showAddAddress && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h4 style={{ margin: '0 0 12px', color: '#1a1a2e' }}>New Address</h4>
          
          {/* Label buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['Home', 'Work', 'Other'].map(l => (
              <button key={l} onClick={() => setNewAddress({ ...newAddress, label: l })}
                style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', background: newAddress.label === l ? '#5c2d91' : '#f0f0f0', color: newAddress.label === l ? 'white' : '#666' }}>
                {l === 'Home' ? '🏠' : l === 'Work' ? '💼' : '📍'} {l}
              </button>
            ))}
          </div>

          {[
            { label: 'Full Address', key: 'full_address', placeholder: 'House no, Street, Area...' },
            { label: 'Landmark', key: 'landmark', placeholder: 'Near school, temple...' },
            { label: 'Phone', key: 'phone', placeholder: 'Contact number' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>{f.label}</label>
              <input placeholder={f.placeholder} value={newAddress[f.key]}
                onChange={e => setNewAddress({ ...newAddress, [f.key]: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => {
              if (!newAddress.full_address) { alert('Please enter address'); return; }
              setSavedAddresses(prev => [...prev, { ...newAddress, id: Date.now() }]);
              setNewAddress({ label: 'Home', full_address: '', landmark: '', phone: '' });
              setShowAddAddress(false);
            }} style={{ flex: 2, padding: '12px', background: '#5c2d91', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
              Save Address
            </button>
            <button onClick={() => setShowAddAddress(false)}
              style={{ flex: 1, padding: '12px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved addresses list */}
      {savedAddresses.length === 0 && !showAddAddress ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
          <p style={{ color: '#999' }}>No saved addresses yet</p>
        </div>
      ) : savedAddresses.map((addr, i) => (
        <div key={addr.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: '700', color: '#5c2d91', fontSize: '13px' }}>
              {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'} {addr.label}
            </span>
            <button onClick={() => setSavedAddresses(prev => prev.filter(a => a.id !== addr.id))}
              style={{ background: '#fff0f0', color: '#ff4444', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
              Delete
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#333' }}>{addr.full_address}</div>
          {addr.landmark && <div style={{ fontSize: '12px', color: '#999' }}>Near: {addr.landmark}</div>}
          {addr.phone && <div style={{ fontSize: '12px', color: '#999' }}>📞 {addr.phone}</div>}
          <button onClick={() => {
            setAddress({ full_address: addr.full_address, landmark: addr.landmark, phone: addr.phone });
            setScreen('cart');
            setCheckoutStep(2);
          }} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#f0eeff', color: '#5c2d91', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
            Use this address
          </button>
        </div>
      ))}
    </div>
  </div>
)}

{/* HELP & SUPPORT SCREEN */}
{screen === 'help' && (
  <div style={{ paddingBottom: '80px' }}>
    <div style={{ background: 'linear-gradient(135deg, #5c2d91, #7c3aed)', padding: '16px' }}>
      <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>← Back</button>
      <h2 style={{ color: 'white', margin: 0 }}>💬 Help & Support</h2>
    </div>
    <div style={{ padding: '16px' }}>

      {/* FAQs */}
      {[
        { q: 'How do I track my order?', a: 'Go to My Orders and tap "Track Order" on any active order to see live status and delivery partner location.' },
        { q: 'How do I cancel an order?', a: 'You can cancel an order within 2 minutes of placing it. Go to My Orders and tap Cancel. After confirmation by seller, cancellation is not possible.' },
        { q: 'What is the delivery charge?', a: 'Delivery charge is ₹20 for first 5km. For every extra km beyond 5km, ₹6 is added. The charge is paid directly to the delivery partner.' },
        { q: 'How does payment work?', a: 'You can pay via Cash on Delivery (pay to delivery partner) or Online (Razorpay secure payment). 10% platform fee applies on all orders.' },
        { q: 'What is the return policy?', a: 'Return policy varies by product category. Fresh food cannot be returned. Electronics have 7-day replacement. Fashion has 3-day return window.' },
        { q: 'How do I become a seller?', a: 'Register as a seller from the login page. After admin approval, you can start listing products and receiving orders.' },
      ].map((faq, i) => (
        <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: '700', color: '#1a1a2e', fontSize: '14px', marginBottom: '8px' }}>❓ {faq.q}</div>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{faq.a}</div>
        </div>
      ))}

      {/* Contact */}
      <div style={{ background: '#f0eeff', borderRadius: '16px', padding: '20px', marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 12px', color: '#5c2d91' }}>📞 Contact Us</h4>
        <div style={{ fontSize: '13px', color: '#666', lineHeight: '2' }}>
          <div>📧 support@zaplo.in</div>
          <div>📞 +91 6392303278</div>
          <div>🕐 Mon-Sat, 9AM - 6PM</div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* PRODUCT DETAIL MODAL */}
{selectedProduct && (
  <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '100vh', background: 'white', zIndex: 200, overflowY: 'hidden' }}>
    <div style={{ height: 'calc(100vh - 90px)', overflowY: 'auto' }}>
    {/* Back button */}
    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
      <button onClick={() => setSelectedProduct(null)}
        style={{ width: '40px', height: '40px', background: 'white', border: 'none', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ←
      </button>
    </div>

    {/* Product Image */}
<div style={{ width: '100%', height: '320px', background: '#f8f8f8', position: 'relative' }}>
  {selectedProduct.image_urls?.[0] || selectedProduct.image_url ? (
    <img src={selectedProduct.image_urls?.[activeImageIndex] || selectedProduct.image_url}
      alt={selectedProduct.name}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  ) : (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>📦</div>
  )}

  {/* Left arrow */}
  {selectedProduct.image_urls?.length > 1 && activeImageIndex > 0 && (
    <button onClick={() => setActiveImageIndex(prev => prev - 1)}
      style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
      ‹
    </button>
  )}

  {/* Right arrow */}
  {selectedProduct.image_urls?.length > 1 && activeImageIndex < selectedProduct.image_urls.length - 1 && (
    <button onClick={() => setActiveImageIndex(prev => prev + 1)}
      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
      ›
    </button>
  )}

  {/* Dots */}
  {selectedProduct.image_urls?.length > 1 && (
    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
      {selectedProduct.image_urls.map((_, i) => (
        <div key={i} onClick={() => setActiveImageIndex(i)}
          style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === activeImageIndex ? '#5c2d91' : '#ddd', cursor: 'pointer' }} />
      ))}
    </div>
  )}
</div>

    {/* Product Info */}
    <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
      
      {/* Shop & Category */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#5c2d91', fontWeight: '600', background: '#f0eeff', padding: '4px 10px', borderRadius: '20px' }}>
          🏪 {selectedProduct.shop_name}
        </span>
        {selectedProduct.category && (
          <span style={{ fontSize: '12px', color: '#666', background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px' }}>
            {selectedProduct.category}
          </span>
        )}
      </div>

      {/* Product Name */}
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#1a1a2e', lineHeight: '1.3' }}>
        {selectedProduct.name}
      </h2>

      {/* Price & Unit Info */}
<div style={{ background: '#f8f8f8', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
    <span style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e' }}>₹{selectedProduct.price}</span>
    <span style={{ fontSize: '14px', color: '#666' }}>
      per {selectedProduct.unit_type || 'piece'}
      {selectedProduct.unit_weight && ` (${selectedProduct.unit_weight}g)`}
    </span>
  </div>

  {/* Per KG rate if available */}
  {selectedProduct.price_per_kg && (
    <div style={{ background: '#fff3cd', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', display: 'inline-block' }}>
      <span style={{ fontSize: '13px', fontWeight: '700', color: '#856404' }}>
        ⚖️ ₹{selectedProduct.price_per_kg}/kg
      </span>
    </div>
  )}

  {/* Stock status */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedProduct.stock > 10 ? '#00b894' : selectedProduct.stock > 0 ? '#e17055' : '#ff4444' }} />
    <span style={{ fontSize: '13px', fontWeight: '600', color: selectedProduct.stock > 10 ? '#00b894' : selectedProduct.stock > 0 ? '#e17055' : '#ff4444' }}>
  {selectedProduct.stock > 10 ? 'In Stock' :
   selectedProduct.stock > 0 ? 'Limited Stock' : 'Out of Stock'}
</span>
  </div>

  {/* Unit type badge */}
  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    <span style={{ background: '#e8f4ff', color: '#0984e3', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
      📦 Sold per {selectedProduct.unit_type || 'piece'}
    </span>
    {selectedProduct.unit_weight && (
      <span style={{ background: '#e8fff8', color: '#00b894', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
        ⚖️ {selectedProduct.unit_weight}g each
      </span>
    )}
  </div>
</div>

     {/* Delivery info */}
<div style={{ background: '#f0eeff', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
  <span style={{ fontSize: '20px' }}>⚡</span>
  <div>
    <div style={{ fontWeight: '700', color: '#5c2d91', fontSize: '14px' }}>30 min delivery</div>
    <div style={{ fontSize: '12px', color: '#666' }}>₹20 for first 5km, ₹6/km after</div>
  </div>
</div>

      {/* Description */}
      {selectedProduct.description && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px', color: '#1a1a2e', fontSize: '15px' }}>About this product</h4>
          <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.6' }}>{selectedProduct.description}</p>
        </div>
      )}

      {/* Shop Info */}
      <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px', color: '#1a1a2e', fontSize: '14px' }}>Sold by</h4>
        <div style={{ fontWeight: '700', color: '#333' }}>🏪 {selectedProduct.shop_name}</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>📍 {selectedProduct.locality}</div>
      </div>

      {/* Return Policy */}
      {selectedProduct.return_policy && (
        <div style={{ background: '#f0fff8', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#00b894', fontWeight: '600' }}>
            🔄 Return Policy: {selectedProduct.return_policy.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    
      <div style={{ marginBottom: '16px' }}>
  <h4 style={{ margin: '0 0 8px', color: '#1a1a2e', fontSize: '15px' }}>⭐ Reviews</h4>
  <ReviewSection type="product" id={selectedProduct?.id} />
</div>
</div>
 </div>
    {/* Bottom Add to Cart */}
    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'white', padding: '16px', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 201 }}>
      {getCartQty(selectedProduct.id) === 0 ? (
        <button
          onClick={() => addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id })}
          disabled={selectedProduct.stock === 0}
          style={{ width: '100%', padding: '16px', background: selectedProduct.stock === 0 ? '#ccc' : 'linear-gradient(135deg, #5c2d91, #7c3aed)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '16px', cursor: selectedProduct.stock === 0 ? 'not-allowed' : 'pointer' }}>
          {selectedProduct.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#5c2d91', borderRadius: '14px', overflow: 'hidden', flex: 1 }}>
            <button onClick={() => updateQty(selectedProduct.id, getCartQty(selectedProduct.id) - 1)}
              style={{ flex: 1, padding: '16px', background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer' }}>-</button>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '18px', minWidth: '40px', textAlign: 'center' }}>{getCartQty(selectedProduct.id)}</span>
            <button onClick={() => addToCart({ ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id })}
              style={{ flex: 1, padding: '16px', background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer' }}>+</button>
          </div>
          <button onClick={() => { setScreen('cart'); setSelectedProduct(null); }}
            style={{ padding: '16px 20px', background: '#00b894', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
            View Cart
          </button>
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
 

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'white', borderTop: '1px solid #f0f0e8', display: 'flex', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 100 }}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'shoplist', icon: '🏪', label: 'Shops', action: () => { API.get('/sellers/search?q=').then(r => { setShops(r.data); setScreen('shoplist'); }); } },
          { id: 'cart', icon: '🛒', label: 'Cart', badge: cartCount, 
  action: () => { getBuyerLocation(); setScreen('cart'); } },
          { id: 'orders', icon: '📦', label: 'Orders', action: () => { fetchMyOrders(); setScreen('orders'); } },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ].map(item => (
          <button key={item.id}
            onClick={() => item.action ? item.action() : setScreen(item.id)}
            style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', position: 'relative' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: screen === item.id ? '#5c2d91' : '#999' }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ position: 'absolute', top: '6px', right: '14px', background: '#5c2d91', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{item.badge}</span>
            )}
            {screen === item.id && <div style={{ position: 'absolute', bottom: 0, width: '24px', height: '3px', background: '#5c2d91', borderRadius: '2px' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}