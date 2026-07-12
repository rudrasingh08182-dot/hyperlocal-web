import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { useTabHistory } from '../hooks/useTabHistory';
import { Toast, showToast } from '../components/Toast';


export default function DeliveryDashboard() {
  const [tab, setTab] = useState('available');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

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
        // Update location in backend
        try {
          await API.patch('/orders/update-location', { latitude, longitude });
        } catch (err) {
          console.error('Location update failed');
        }
        fetchAvailableOrders(latitude, longitude);
      },
      (err) => {
        setLocationError('Could not get location. Please enable GPS.');
        setLocating(false);
      }
    );
  }, []);

  const fetchAvailableOrders = async (lat, lng) => {
    setLoading(true);
    try {
      const res = await API.get(`/orders/available?lat=${lat}&lng=${lng}`);
      setAvailableOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyDeliveries = async () => {
    try {
      const res = await API.get('/orders/my-deliveries');
      setMyDeliveries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getLocation();
    fetchMyDeliveries();
  }, [getLocation]);
  useEffect(() => {
  const activeOrder = myDeliveries.find(o => o.status === 'picked_up' || o.status === 'out_for_delivery');
  if (!activeOrder) return;

  const interval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await API.patch(`/tracking/${activeOrder.id}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch (err) {
        console.error('Auto location update failed');
      }
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
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to accept', 'error');
    }
  };

  const markDelivered = async (id) => {
  try {
    await API.patch(`/orders/${id}/delivered`);
    await API.patch(`/tracking/${id}/status`, { status: 'delivered' });
    showToast('Order marked as delivered!', 'success');
    fetchMyDeliveries();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to update', 'error');
  }
};
   const updateStatus = async (orderId, status) => {
  try {
    await API.patch(`/tracking/${orderId}/status`, { status });
    alert(`Order marked as ${status}!`);
    fetchMyDeliveries();
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
};

const shareLocation = async (orderId) => {
  if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      await API.patch(`/tracking/${orderId}/location`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      showToast('Location shared! ✅', 'success');
    } catch (err) {
      showToast('Failed to share location', 'error');
    }
  });
};
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
       <Toast />
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚴</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>Delivery Dashboard</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Welcome, {user.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {location && (
            <span style={{ fontSize: '12px', color: '#00b894', background: '#e8fff8', padding: '4px 10px', borderRadius: '20px' }}>
              📍 GPS Active
            </span>
          )}
          <button onClick={logout} style={{ padding: '8px 16px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

        {/* GPS Status */}
        {!location && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {locationError ? (
              <>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📍</div>
                <p style={{ color: '#e17055', marginBottom: '16px' }}>{locationError}</p>
                <button onClick={getLocation} style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600' }}>
                  Try Again
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  {locating ? 'Getting your location...' : 'Enable GPS to see nearby orders'}
                </p>
                {!locating && (
                  <button onClick={getLocation} style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600' }}>
                    📍 Enable GPS
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Available Orders', value: availableOrders.length, color: '#667eea', icon: '📦' },
            { label: 'My Active', value: myDeliveries.length, color: '#00b894', icon: '🚴' },
            { label: 'GPS Status', value: location ? 'Active' : 'Off', color: location ? '#00b894' : '#e17055', icon: '📍' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px' }}>{s.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {[
            { id: 'available', label: '📦 Available Orders' },
            { id: 'mydeliveries', label: '🚴 My Deliveries' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                background: tab === t.id ? '#667eea' : 'transparent',
                color: tab === t.id ? 'white' : '#666',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Available Orders */}
        {tab === 'available' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Available Orders</h2>
              <button onClick={() => fetchAvailableOrders(location?.lat, location?.lng)}
                style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading orders...</div>
            ) : availableOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p style={{ color: '#999' }}>No available orders near you right now</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0e8' }}>
                  
                  {/* Order Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#667eea', fontSize: '15px' }}>
                        Order #{order.id.slice(-6).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '20px', color: '#1a1a2e' }}>₹{order.total_amount}</div>
                      <span style={{ fontSize: '11px', background: order.payment_method === 'COD' ? '#fff3f0' : '#e8f4ff', color: order.payment_method === 'COD' ? '#e17055' : '#0984e3', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                        {order.payment_method}
                      </span>
                    </div>
                  </div>

                  {/* Pickup Location */}
                  <div style={{ background: '#f8f9ff', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#667eea', marginBottom: '6px', textTransform: 'uppercase' }}>📦 Pickup From</div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>{order.shop_name}</div>
                    <div style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>{order.seller_address}</div>
                    <a href={`tel:${order.seller_phone}`} style={{ color: '#667eea', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>
                      📞 {order.seller_phone}
                    </a>
                  </div>

                  {/* Delivery Location */}
                  <div style={{ background: '#f0fff8', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b894', marginBottom: '6px', textTransform: 'uppercase' }}>🏠 Deliver To</div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>{order.buyer_name}</div>
                    <div style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>{order.delivery_address}</div>
                    {order.delivery_landmark && (
                      <div style={{ color: '#999', fontSize: '12px' }}>📍 Near: {order.delivery_landmark}</div>
                    )}
                    <a href={`tel:${order.delivery_phone}`} style={{ color: '#00b894', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>
                      📞 {order.delivery_phone}
                    </a>
                  </div>

                  {/* Distance */}
                  {order.distance_km && (
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                      📍 Approx distance: <strong>{order.distance_km} km</strong>
                    </div>
                  )}

                  {/* Accept Button */}
                  <button onClick={() => acceptDelivery(order.id)}
                    style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                    🚴 Accept Delivery
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Deliveries */}
        {tab === 'mydeliveries' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1a1a2e' }}>My Active Deliveries</h2>

            {myDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚴</div>
                <p style={{ color: '#999' }}>No active deliveries</p>
              </div>
            ) : (
              myDeliveries.map(order => (
                <div key={order.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '2px solid #667eea22' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', color: '#667eea' }}>
                      Order #{order.id.slice(-6).toUpperCase()}
                    </div>
                    <span style={{ background: '#fff3e0', color: '#e17055', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {order.status}
                    </span>
                  </div>

                  {/* Pickup */}
                  <div style={{ background: '#f8f9ff', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#667eea', marginBottom: '6px' }}>📦 PICKUP FROM</div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e' }}>{order.shop_name}</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>{order.seller_address}</div>
                    <a href={`tel:${order.seller_phone}`} style={{ color: '#667eea', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>
                      📞 {order.seller_phone}
                    </a>
                  </div>

                 {/* Deliver */}
                  <div style={{ background: '#f0fff8', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b894', marginBottom: '6px' }}>🏠 DELIVER TO</div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e' }}>{order.buyer_name}</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>{order.delivery_address}</div>
                    {order.delivery_landmark && (
                      <div style={{ color: '#999', fontSize: '12px' }}>📍 Near: {order.delivery_landmark}</div>
                    )}
                    <a href={`tel:${order.delivery_phone}`} style={{ color: '#00b894', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>
                      📞 {order.delivery_phone}
                    </a>
                  </div>

                  {/* Route Map — exact pickup-to-drop path between seller and buyer.
                      Only renders if both coordinate pairs exist (old orders placed
                      before this feature won't have delivery_lat/delivery_lng, so
                      this safely just hides the map instead of breaking). */}
                  {order.seller_lat && order.seller_lng && order.delivery_lat && order.delivery_lng && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>🗺️ Route: Pickup → Drop</div>
                      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #f0f0e8' }}>
                        <iframe
                          title={`route-${order.id}`}
                          width="100%"
                          height="220"
                          frameBorder="0"
                          style={{ display: 'block' }}
                          src={`https://maps.google.com/maps?saddr=${order.seller_lat},${order.seller_lng}&daddr=${order.delivery_lat},${order.delivery_lng}&z=13&output=embed`}
                        />
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${order.seller_lat},${order.seller_lng}&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', textAlign: 'center', marginTop: '8px', padding: '10px', background: '#667eea', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
                        🧭 Navigate (Seller → Buyer)
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
  <div style={{ fontWeight: '700', fontSize: '18px' }}>₹{order.total_amount}
    <span style={{ fontSize: '12px', color: '#999', fontWeight: '400', marginLeft: '8px' }}>{order.payment_method}</span>
  </div>
</div>

{/* Status + Location Buttons */}
<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
  <button onClick={() => updateStatus(order.id, 'picked_up')}
    style={{ flex: 1, padding: '8px', background: '#fff3f0', color: '#e17055', border: '1px solid #e17055', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
    🛵 Picked Up
  </button>
  <button onClick={() => updateStatus(order.id, 'out_for_delivery')}
    style={{ flex: 1, padding: '8px', background: '#f0eeff', color: '#5c2d91', border: '1px solid #5c2d91', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
    🚚 Out for Delivery
  </button>
  <button onClick={() => shareLocation(order.id)}
    style={{ flex: 1, padding: '8px', background: '#e8f4ff', color: '#0984e3', border: '1px solid #0984e3', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
    📍 Share Location
  </button>
  <button onClick={() => markDelivered(order.id)}
    style={{ flex: 1, padding: '8px', background: '#e8fff8', color: '#00b894', border: '1px solid #00b894', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
    ✅ Delivered
  </button>
</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}