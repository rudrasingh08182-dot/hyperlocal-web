import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { useTabHistory } from '../hooks/useTabHistory';
import { Toast, showToast } from '../components/Toast';

/* ---------- Inline SVG icons (matte, no emojis) ---------- */
const Icon = {
  Bike: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2h-1M6 17.5 10 9h5l3.5 8.5M14 6l3 5"/></svg>),
  Package: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>),
  Pin: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  Home: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>),
  Phone: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0122 16.9z"/></svg>),
  Refresh: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/></svg>),
  Nav: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>),
  Truck: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  Box: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7h18v13H3zM3 7l2-4h14l2 4M12 7v13"/></svg>),
  Search: (p) => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>),
  Signal: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13"/></svg>),
  Power: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18.4 6.6a9 9 0 11-12.8 0M12 2v10"/></svg>),
};

/* ---------- Design tokens ---------- */
const T = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  ink: '#0f172a',
  ink2: '#334155',
  mute: '#64748b',
  line: '#e5e7eb',
  brand: '#4f46e5',
  brandSoft: '#eef2ff',
  ok: '#059669',
  okSoft: '#ecfdf5',
  warn: '#b45309',
  warnSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  info: '#0369a1',
  infoSoft: '#eff6ff',
  shadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.10)',
  radius: 14,
  font: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};

export default function DeliveryDashboard() {
  const [tab, setTab] = useState('available');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [qrModalOrder, setQrModalOrder] = useState(null);
  const [uploadModalOrderId, setUploadModalOrderId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  const fetchMyAvailability = async () => {
    try {
      const res = await API.get('/orders/my-availability');
      setIsOnline(res.data.is_online !== false);
    } catch (err) { console.error('Availability fetch failed'); }
  };

  const toggleAvailability = async () => {
    const newStatus = !isOnline;
    setAvailabilityLoading(true);
    try {
      const res = await API.patch('/orders/toggle-availability', { is_online: newStatus });
      setIsOnline(res.data.is_online);
      showToast(res.data.message, res.data.is_online ? 'success' : 'info');
      if (res.data.is_online) fetchAvailableOrders(location?.lat, location?.lng);
      else setAvailableOrders([]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update availability', 'error');
    } finally { setAvailabilityLoading(false); }
  };

  useTabHistory(tab, setTab, ['available', 'mydeliveries']);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const getLocation = useCallback(() => {
    setLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('GPS not supported on this device');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocating(false);
        try { await API.patch('/orders/update-location', { latitude, longitude }); }
        catch (err) { console.error('Location update failed'); }
        fetchAvailableOrders(latitude, longitude);
      },
      () => { setLocationError('Could not get location. Please enable GPS.'); setLocating(false); }
    );
  }, []);

  const fetchAvailableOrders = async (lat, lng) => {
    setLoading(true);
    try {
      const res = await API.get(`/orders/available?lat=${lat}&lng=${lng}`);
      setAvailableOrders(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMyDeliveries = async () => {
    try {
      const res = await API.get('/orders/my-deliveries');
      setMyDeliveries(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    getLocation();
    fetchMyDeliveries();
    fetchMyAvailability();
  }, [getLocation]);

  useEffect(() => {
    const activeOrder = myDeliveries.find(o => o.status === 'picked_up' || o.status === 'out_for_delivery');
    if (!activeOrder) return;
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await API.patch(`/tracking/${activeOrder.id}/location`, {
            lat: pos.coords.latitude, lng: pos.coords.longitude,
          });
        } catch (err) { console.error('Auto location update failed'); }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [myDeliveries]);

  const acceptDelivery = async (id) => {
    try {
      await API.patch(`/orders/${id}/accept`);
      showToast('Delivery accepted!', 'success');
      fetchAvailableOrders(location?.lat, location?.lng);
      fetchMyDeliveries();
      setTab('mydeliveries');
    } catch (err) { showToast(err.response?.data?.error || 'Failed to accept', 'error'); }
  };

  const openSellerQr = async (order) => {
    try {
      const res = await API.get(`/tracking/${order.id}/seller-qr`);
      setQrModalOrder({ orderId: order.id, ...res.data });
    } catch (err) {
      showToast(err.response?.data?.error || 'Seller QR not available', 'error');
    }
  };

  const markCashReceived = async (orderId) => {
    try {
      await API.patch(`/tracking/${orderId}/cash-received`);
      showToast('Cash payment marked as received', 'success');
      fetchMyDeliveries();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error');
    }
  };

  const submitProof = async () => {
    if (!proofFile || !uploadModalOrderId) return;
    setSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', proofFile);
      await API.post(`/tracking/${uploadModalOrderId}/delivery-payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof submitted!', 'success');
      setUploadModalOrderId(null);
      setProofFile(null);
      setProofPreview(null);
      setQrModalOrder(null);
      fetchMyDeliveries();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit proof', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  const markDelivered = async (order) => {
    if (order.payment_method === 'COD' && !order.delivery_payment_confirmed) {
      showToast('Pehle payment collect karo (Cash ya QR), phir hi Delivered mark hoga', 'error');
      return;
    }
    try {
      await API.patch(`/orders/${order.id}/delivered`);
      await API.patch(`/tracking/${order.id}/status`, { status: 'delivered' });
      showToast('Order marked as delivered!', 'success');
      fetchMyDeliveries();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to update', 'error'); }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await API.patch(`/tracking/${orderId}/status`, { status });
      alert(`Order marked as ${status}!`);
      fetchMyDeliveries();
    } catch (err) { showToast('Failed to update status', 'error'); }
  };

  const shareLocation = async (orderId) => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await API.patch(`/tracking/${orderId}/location`, {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
        });
        showToast('Location shared', 'success');
      } catch (err) { showToast('Failed to share location', 'error'); }
    });
  };

  /* ---------- shared styles ---------- */
  const card = { background: T.surface, borderRadius: T.radius, border: `1px solid ${T.line}`, boxShadow: T.shadow };
  const pill = (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '.02em' });
  const sectionLabel = (fg) => ({ fontSize: 10.5, fontWeight: 700, color: fg, letterSpacing: '.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 });

  const prettyStatus = (s='') => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font, color: T.ink }}>
      <Toast />

      {/* Header */}
      <header style={{
        background: T.surface, borderBottom: `1px solid ${T.line}`,
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.brand, color: '#fff',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 6px 14px -6px rgba(79,70,229,.6)',
          }}>
            <Icon.Bike />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.ink, letterSpacing: '-.01em' }}>Delivery Dashboard</div>
            <div style={{ fontSize: 12, color: T.mute, marginTop: 1 }}>Welcome, {user.name || 'Rider'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Availability toggle */}
          <div onClick={() => !availabilityLoading && toggleAvailability()}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: availabilityLoading ? 'wait' : 'pointer',
              background: isOnline ? T.okSoft : T.dangerSoft,
              border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
              padding: '6px 10px 6px 12px', borderRadius: 999,
              opacity: availabilityLoading ? 0.6 : 1, userSelect: 'none',
            }}>
            <span style={{ color: isOnline ? T.ok : T.danger, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
              <Icon.Power /> {isOnline ? 'Online' : 'Offline'}
            </span>
            <div style={{
              width: 34, height: 20, borderRadius: 999,
              background: isOnline ? T.ok : '#cbd5e1',
              position: 'relative', transition: 'background .2s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: isOnline ? 16 : 2,
                transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.25)',
              }} />
            </div>
          </div>

          {location && (
            <span style={pill(T.okSoft, T.ok)}><Icon.Signal /> GPS Active</span>
          )}

          <button onClick={logout} style={{
            padding: '8px 14px', background: T.ink, color: '#fff', border: 'none',
            borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            letterSpacing: '.01em',
          }}>Logout</button>
        </div>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>

        {/* GPS Card */}
        {!location && (
          <div style={{ ...card, padding: 28, marginBottom: 20, textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
              display: 'grid', placeItems: 'center',
              background: locationError ? T.dangerSoft : T.brandSoft,
              color: locationError ? T.danger : T.brand,
            }}>
              {locationError ? <Icon.Pin /> : <Icon.Search />}
            </div>
            <p style={{ color: locationError ? T.danger : T.ink2, marginBottom: 16, fontSize: 14 }}>
              {locationError ? locationError : (locating ? 'Getting your location...' : 'Enable GPS to see nearby orders')}
            </p>
            {(!locating || locationError) && (
              <button onClick={getLocation} style={{
                background: T.brand, color: '#fff', border: 'none', borderRadius: 10,
                padding: '11px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>
                {locationError ? 'Try Again' : 'Enable GPS'}
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Available', value: availableOrders.length, color: T.brand, soft: T.brandSoft, Ico: Icon.Package },
            { label: 'Active', value: myDeliveries.length, color: T.ok, soft: T.okSoft, Ico: Icon.Bike },
            { label: 'GPS', value: location ? 'On' : 'Off', color: location ? T.ok : T.danger, soft: location ? T.okSoft : T.dangerSoft, Ico: Icon.Pin },
          ].map((s, i) => (
            <div key={i} style={{ ...card, padding: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: s.soft, color: s.color,
                display: 'grid', placeItems: 'center', marginBottom: 10,
              }}><s.Ico /></div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: T.mute, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 18,
          background: T.surface, borderRadius: 12, padding: 4,
          border: `1px solid ${T.line}`,
        }}>
          {[
            { id: 'available', label: 'Available Orders', Ico: Icon.Package },
            { id: 'mydeliveries', label: 'My Deliveries', Ico: Icon.Bike },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '10px 12px', border: 'none', borderRadius: 9,
                  cursor: 'pointer', fontWeight: 600, fontSize: 13.5,
                  transition: 'all .15s',
                  background: active ? T.ink : 'transparent',
                  color: active ? '#fff' : T.ink2,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <t.Ico /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Available */}
        {tab === 'available' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: T.ink, fontWeight: 700, letterSpacing: '-.01em' }}>Available Orders</h2>
              <button onClick={() => fetchAvailableOrders(location?.lat, location?.lng)}
                style={{
                  background: T.surface, color: T.ink2, border: `1px solid ${T.line}`,
                  borderRadius: 9, padding: '7px 12px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <Icon.Refresh /> Refresh
              </button>
            </div>

            {!isOnline ? (
              <div style={{ ...card, textAlign: 'center', padding: 48 }}>
                <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 12, background: T.dangerSoft, color: T.danger, display: 'grid', placeItems: 'center' }}>
                  <Icon.Power />
                </div>
                <p style={{ color: T.ink, fontWeight: 600, margin: '0 0 4px' }}>You're currently Offline</p>
                <p style={{ color: T.mute, fontSize: 13, margin: 0 }}>Switch to Online above to start receiving delivery requests</p>
              </div>
            ) : loading ? (
              <div style={{ ...card, textAlign: 'center', padding: 40, color: T.mute, fontSize: 14 }}>Loading orders…</div>
            ) : availableOrders.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 48 }}>
                <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 12, background: T.brandSoft, color: T.brand, display: 'grid', placeItems: 'center' }}>
                  <Icon.Box />
                </div>
                <p style={{ color: T.mute, margin: 0, fontSize: 14 }}>No available orders near you right now</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} style={{ ...card, padding: 18, marginBottom: 14 }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: T.ink, fontSize: 14, letterSpacing: '.02em' }}>
                        #{order.id.slice(-6).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: T.mute, marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 20, color: T.ink, letterSpacing: '-.02em' }}>₹{order.total_amount}</div>
                      <span style={pill(
                        order.payment_method === 'COD' ? T.warnSoft : T.infoSoft,
                        order.payment_method === 'COD' ? T.warn : T.info
                      )}>{order.payment_method}</span>
                    </div>
                  </div>

                  {/* Pickup */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={sectionLabel(T.brand)}><Icon.Package /> Pickup From</div>
                    <div style={{ fontWeight: 600, color: T.ink, fontSize: 14, marginTop: 8 }}>{order.shop_name}</div>
                    <div style={{ color: T.ink2, fontSize: 13, marginTop: 2 }}>{order.seller_address}</div>
                    <a href={`tel:${order.seller_phone}`} style={{ color: T.brand, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Icon.Phone /> {order.seller_phone}
                    </a>
                  </div>

                  {/* Deliver */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={sectionLabel(T.ok)}><Icon.Home /> Deliver To</div>
                    <div style={{ fontWeight: 600, color: T.ink, fontSize: 14, marginTop: 8 }}>{order.buyer_name}</div>
                    <div style={{ color: T.ink2, fontSize: 13, marginTop: 2 }}>{order.delivery_address}</div>
                    {order.delivery_landmark && (
                      <div style={{ color: T.mute, fontSize: 12, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon.Pin /> Near {order.delivery_landmark}
                      </div>
                    )}
                    <div>
                      <a href={`tel:${order.delivery_phone}`} style={{ color: T.ok, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Icon.Phone /> {order.delivery_phone}
                      </a>
                    </div>
                  </div>

                  {order.distance_km && (
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon.Pin /> Approx <strong style={{ color: T.ink }}>&nbsp;{order.distance_km} km</strong>
                    </div>
                  )}

                  <button onClick={() => acceptDelivery(order.id)}
                    style={{
                      width: '100%', padding: '13px', background: T.ink, color: '#fff',
                      border: 'none', borderRadius: 11, fontSize: 14.5, fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8, letterSpacing: '.01em',
                    }}>
                    <Icon.Bike /> Accept Delivery
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Deliveries */}
        {tab === 'mydeliveries' && (
          <div>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, color: T.ink, fontWeight: 700, letterSpacing: '-.01em' }}>My Active Deliveries</h2>

            {myDeliveries.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 48 }}>
                <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 12, background: T.brandSoft, color: T.brand, display: 'grid', placeItems: 'center' }}>
                  <Icon.Bike />
                </div>
                <p style={{ color: T.mute, margin: 0, fontSize: 14 }}>No active deliveries</p>
              </div>
            ) : (
              myDeliveries.map(order => (
                <div key={order.id} style={{ ...card, padding: 18, marginBottom: 14, borderLeft: `3px solid ${T.brand}` }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                    <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>
                      #{order.id.slice(-6).toUpperCase()}
                    </div>
                    <span style={pill(T.warnSoft, T.warn)}>{prettyStatus(order.status)}</span>
                  </div>

                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={sectionLabel(T.brand)}><Icon.Package /> Pickup From</div>
                    <div style={{ fontWeight: 600, color: T.ink, marginTop: 8 }}>{order.shop_name}</div>
                    <div style={{ color: T.ink2, fontSize: 13, marginTop: 2 }}>{order.seller_address}</div>
                    <a href={`tel:${order.seller_phone}`} style={{ color: T.brand, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Icon.Phone /> {order.seller_phone}
                    </a>
                  </div>

                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={sectionLabel(T.ok)}><Icon.Home /> Deliver To</div>
                    <div style={{ fontWeight: 600, color: T.ink, marginTop: 8 }}>{order.buyer_name}</div>
                    <div style={{ color: T.ink2, fontSize: 13, marginTop: 2 }}>{order.delivery_address}</div>
                    {order.delivery_landmark && (
                      <div style={{ color: T.mute, fontSize: 12, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon.Pin /> Near {order.delivery_landmark}
                      </div>
                    )}
                    <div>
                      <a href={`tel:${order.delivery_phone}`} style={{ color: T.ok, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Icon.Phone /> {order.delivery_phone}
                      </a>
                    </div>
                  </div>

                  {/* Route map */}
                  {order.seller_lat && order.seller_lng && order.delivery_lat && order.delivery_lng && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ ...sectionLabel(T.mute), marginBottom: 8 }}>Route · Pickup → Drop</div>
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.line}` }}>
                        <iframe
                          title={`route-${order.id}`}
                          width="100%" height="220" frameBorder="0"
                          style={{ display: 'block' }}
                          src={`https://maps.google.com/maps?saddr=${order.seller_lat},${order.seller_lng}&daddr=${order.delivery_lat},${order.delivery_lng}&z=13&output=embed`}
                        />
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${order.seller_lat},${order.seller_lng}&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          width: '100%', marginTop: 8, padding: '11px',
                          background: T.brand, color: '#fff', borderRadius: 10,
                          textDecoration: 'none', fontWeight: 600, fontSize: 13.5,
                        }}>
                        <Icon.Nav /> Navigate (Seller → Buyer)
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: T.ink, letterSpacing: '-.02em' }}>
                      ₹{order.total_amount}
                      <span style={{ fontSize: 12, color: T.mute, fontWeight: 500, marginLeft: 8 }}>{order.payment_method}</span>
                    </div>
                  </div>

                  {/* Payment collection — only for COD orders not yet confirmed */}
                  {order.payment_method === 'COD' && !order.delivery_payment_confirmed && (
                    <div style={{ background: T.warnSoft, border: `1px solid #fcd34d`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.warn, marginBottom: 10 }}>
                        ⚠️ Payment abhi collect nahi hui hai
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        <button onClick={() => openSellerQr(order)}
                          style={{ padding: '11px', background: '#fff', color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12.5 }}>
                          📱 Show Seller QR
                        </button>
                        <button onClick={() => markCashReceived(order.id)}
                          style={{ padding: '11px', background: T.ok, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12.5 }}>
                          💵 Cash Received
                        </button>
                      </div>
                    </div>
                  )}

                  {order.payment_method === 'COD' && order.delivery_payment_confirmed && (
                    <div style={{ background: T.okSoft, border: '1px solid #a7f3d0', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, fontWeight: 600, color: T.ok }}>
                      ✅ Payment collected via {order.delivery_payment_method === 'QR' ? 'QR' : 'Cash'}
                    </div>
                  )}

                  {/* Status buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { onClick: () => updateStatus(order.id, 'picked_up'), Ico: Icon.Box, label: 'Picked Up', fg: T.warn, soft: T.warnSoft, brd: '#fcd34d' },
                      { onClick: () => updateStatus(order.id, 'out_for_delivery'), Ico: Icon.Truck, label: 'Out for Delivery', fg: T.brand, soft: T.brandSoft, brd: '#c7d2fe' },
                      { onClick: () => shareLocation(order.id), Ico: Icon.Pin, label: 'Share Location', fg: T.info, soft: T.infoSoft, brd: '#bfdbfe' },
                      { onClick: () => markDelivered(order), Ico: Icon.Check, label: 'Delivered', fg: T.ok, soft: T.okSoft, brd: '#a7f3d0' },
                    ].map((b, i) => (
                      <button key={i} onClick={b.onClick}
                        style={{
                          padding: '10px', background: b.soft, color: b.fg,
                          border: `1px solid ${b.brd}`, borderRadius: 10, cursor: 'pointer',
                          fontWeight: 600, fontSize: 12.5,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                        <b.Ico /> {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Seller QR Modal */}
      {qrModalOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>Seller's Payment QR</div>
              <button onClick={() => setQrModalOrder(null)} style={{ background: T.bg, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: T.mute, marginBottom: 4 }}>Buyer ko dikhao — scan karke pay karega</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.ink, marginBottom: 12 }}>{qrModalOrder.shop_name}</div>
              {qrModalOrder.qr_code_url ? (
                <img src={qrModalOrder.qr_code_url} alt="Seller UPI QR"
                  style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 12, border: `1px solid ${T.line}` }} />
              ) : (
                <div style={{ width: 220, height: 220, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, borderRadius: 12, color: T.mute, fontSize: 13 }}>
                  QR not available
                </div>
              )}
              {qrModalOrder.upi_id && (
                <div style={{ fontSize: 13, color: T.mute, marginTop: 10 }}>UPI: <strong style={{ color: T.ink }}>{qrModalOrder.upi_id}</strong></div>
              )}
            </div>

            <button onClick={() => { setUploadModalOrderId(qrModalOrder.orderId); }}
              style={{ width: '100%', padding: 13, background: T.brand, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Buyer ne pay kar diya — Upload Proof
            </button>
          </div>
        </div>
      )}

      {/* Upload Payment Proof Modal */}
      {uploadModalOrderId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 310, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>Upload Payment Proof</div>
              <button onClick={() => { setUploadModalOrderId(null); setProofFile(null); setProofPreview(null); }}
                style={{ background: T.bg, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>

            {proofPreview ? (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <img src={proofPreview} alt="Proof" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 10, border: `1px solid ${T.line}` }} />
                <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: T.danger, color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <label style={{ display: 'block', padding: '28px 16px', border: `1.5px dashed ${T.brand}`, borderRadius: 12, textAlign: 'center', cursor: 'pointer', background: T.brandSoft, color: T.brand, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
                📷 Tap to upload payment screenshot
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setProofFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setProofPreview(reader.result);
                    reader.readAsDataURL(file);
                  }} />
              </label>
            )}

            <button onClick={submitProof} disabled={!proofFile || submittingProof}
              style={{ width: '100%', padding: 13, background: (!proofFile || submittingProof) ? T.line : T.ok, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: (!proofFile || submittingProof) ? 'not-allowed' : 'pointer', fontSize: 14 }}>
              {submittingProof ? 'Submitting...' : 'Submit Proof'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
