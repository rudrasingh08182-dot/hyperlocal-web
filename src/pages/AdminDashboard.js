import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import API from '../services/api';
import { Toast, showToast } from '../components/Toast';
import BulkProductUpload from './BulkProductUpload';
import { useTabHistory } from '../hooks/useTabHistory';

function ThreeBackground() {
  const mountRef = useRef(null);
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0x6c63ff, wireframe: true });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 200;
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 }));
    scene.add(stars);
    camera.position.z = 30;
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      torus.rotation.x += 0.01;
      torus.rotation.y += 0.005;
      stars.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(animId);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, opacity: 0.3 }} />;
}

function StatCard({ title, value, color, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        border: `1px solid ${color}66`,
        borderRadius: '16px', padding: '24px', textAlign: 'center',
        backdropFilter: 'blur(10px)', cursor: 'pointer', minWidth: '150px',
      }}
    >
      <div style={{ fontSize: '40px' }}>{icon}</div>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#aaa', fontSize: '14px', marginTop: '4px' }}>{title}</div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [sellers, setSellers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [tab, setTab] = useState('sellers');
  const [loading, setLoading] = useState(true);
 
 useTabHistory(tab, setTab, ['sellers', 'buyers', 'delivery', 'bulk-upload', 'banners']);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tab === 'banners') fetchBanners();
  }, [tab]);

  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [sellerSalesData, setSellerSalesData] = useState(null);

  // ── Hero Banner Carousel management ──
  const emptyBannerForm = {
    title: '', subtitle: '', description: '', discount_badge: '', cta_text: 'Order Now',
    coupon_code: '', restaurant_name: '', action_type: 'none', action_value: '',
    text_position: 'bottom-left', start_date: '', end_date: '', is_active: true,
  };
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [bannerSaving, setBannerSaving] = useState(false);
 const [draggedId, setDraggedId] = useState(null);

  // ── Product/Restaurant picker for banner "Action Value" ──
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSearchResults, setActionSearchResults] = useState([]);
  const [actionSearching, setActionSearching] = useState(false);
  const [selectedActionLabel, setSelectedActionLabel] = useState('');

  const searchForAction = async () => {
    if (!actionSearchQuery.trim()) return;
    setActionSearching(true);
    try {
      if (bannerForm.action_type === 'product') {
        const res = await API.get(`/products/search?q=${encodeURIComponent(actionSearchQuery)}`);
        setActionSearchResults(res.data.map(p => ({ id: p.id, label: `${p.name} — ₹${p.price} (${p.shop_name})` })));
      } else if (bannerForm.action_type === 'restaurant') {
        const res = await API.get(`/sellers/search?q=${encodeURIComponent(actionSearchQuery)}`);
        setActionSearchResults(res.data.map(s => ({ id: s.id, label: `${s.shop_name} — ${s.locality || ''}` })));
      }
    } catch (err) {
      showToast('Search failed', 'error');
    } finally {
      setActionSearching(false);
    }
  };

  const selectActionResult = (result) => {
    setBannerForm({ ...bannerForm, action_value: result.id });
    setSelectedActionLabel(result.label);
    setActionSearchResults([]);
    setActionSearchQuery('');
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const res = await API.get('/admin/banners');
      setBanners(res.data);
    } catch (err) {
      showToast('Failed to load banners', 'error');
    } finally {
      setBannersLoading(false);
    }
  };

  const openAddBanner = () => {
    setEditingBannerId(null);
    setBannerForm(emptyBannerForm);
    setBannerImageFile(null);
    setBannerImagePreview(null);
    setShowBannerForm(true);
  };

  const openEditBanner = (b) => {
    setEditingBannerId(b.id);
    setSelectedActionLabel('');
    setActionSearchResults([]);
    setActionSearchQuery('');
    setBannerForm({
      title: b.title || '', subtitle: b.subtitle || '', description: b.description || '',
      discount_badge: b.discount_badge || '', cta_text: b.cta_text || 'Order Now',
      coupon_code: b.coupon_code || '', restaurant_name: b.restaurant_name || '',
      action_type: b.action_type || 'none', action_value: b.action_value || '',
      text_position: b.text_position || 'bottom-left',
      start_date: b.start_date ? String(b.start_date).slice(0, 10) : '',
      end_date: b.end_date ? String(b.end_date).slice(0, 10) : '',
      is_active: b.is_active,
    });
    setBannerImageFile(null);
    setBannerImagePreview(b.image_url);
    setShowBannerForm(true);
  };

  const closeBannerForm = () => {
    setShowBannerForm(false);
    setEditingBannerId(null);
  };

  const saveBanner = async () => {
    if (!editingBannerId && !bannerImageFile) {
      showToast('Please choose a banner image', 'error');
      return;
    }
    setBannerSaving(true);
    try {
      const formData = new FormData();
      if (bannerImageFile) formData.append('image', bannerImageFile);
      Object.entries(bannerForm).forEach(([key, value]) => formData.append(key, value));

      if (editingBannerId) {
        await API.patch(`/admin/banners/${editingBannerId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Banner updated!', 'success');
      } else {
        await API.post('/admin/banners', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        showToast('Banner created!', 'success');
      }
      closeBannerForm();
      fetchBanners();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save banner', 'error');
    } finally {
      setBannerSaving(false);
    }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await API.delete(`/admin/banners/${id}`);
      showToast('Banner deleted');
      fetchBanners();
    } catch (err) {
      showToast('Failed to delete banner', 'error');
    }
  };

  const toggleBannerActive = async (b) => {
    try {
      const formData = new FormData();
      Object.entries({
        title: b.title || '', subtitle: b.subtitle || '', description: b.description || '',
        discount_badge: b.discount_badge || '', cta_text: b.cta_text || 'Order Now',
        coupon_code: b.coupon_code || '', restaurant_name: b.restaurant_name || '',
        action_type: b.action_type || 'none', action_value: b.action_value || '',
        text_position: b.text_position || 'bottom-left',
        start_date: b.start_date ? String(b.start_date).slice(0, 10) : '',
        end_date: b.end_date ? String(b.end_date).slice(0, 10) : '',
        is_active: !b.is_active,
      }).forEach(([key, value]) => formData.append(key, value));
      await API.patch(`/admin/banners/${b.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchBanners();
    } catch (err) {
      showToast('Failed to toggle banner', 'error');
    }
  };

  const handleDragStart = (id) => setDraggedId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    const currentOrder = banners.map(b => b.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx = currentOrder.indexOf(targetId);
    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);

    setBanners(newOrder.map(id => banners.find(b => b.id === id)));
    setDraggedId(null);

    try {
      await API.patch('/admin/banners/reorder', { order: newOrder });
    } catch (err) {
      showToast('Failed to save new order', 'error');
      fetchBanners();
    }
  };
  const fetchData = async () => {
    try {
      const [s, b, d] = await Promise.all([
        API.get('/admin/sellers'),
        API.get('/admin/buyers'),
        API.get('/admin/delivery-boys'),
      ]);
      setSellers(s.data);
      setBuyers(b.data);
      setDeliveryBoys(d.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveSeller = async (id) => {
  try {
    await API.patch(`/admin/sellers/${id}/approve`);
    showToast('Seller approved successfully!', 'success');
    fetchData();
  } catch (err) {
    showToast(err.response?.data?.error || 'Error', 'error');
  }
};

const suspendSeller = async (id) => {
  try {
    await API.patch(`/admin/sellers/${id}/suspend`);
    showToast('Seller suspended!', 'success');
    fetchData();
  } catch (err) {
    showToast(err.response?.data?.error || 'Error', 'error');
  }
};

const viewSellerSales = async (id) => {
  setSalesModalOpen(true);
  setSalesLoading(true);
  setSellerSalesData(null);
  try {
    const res = await API.get(`/admin/sellers/${id}/sales-last-7-days`);
    setSellerSalesData(res.data);
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to load sales data', 'error');
    setSalesModalOpen(false);
  } finally {
    setSalesLoading(false);
  }
};
 const approveDelivery = async (id) => {
  try {
    await API.patch(`/admin/delivery-boys/${id}/approve`);
    showToast('Delivery boy approved!', 'success');
    fetchData();
  } catch (err) {
    showToast(err.response?.data?.error || 'Error', 'error');
  }
};

const suspendDelivery = async (id) => {
  try {
    await API.patch(`/admin/delivery-boys/${id}/suspend`);
    showToast('Delivery boy suspended!', 'success');
    fetchData();
  } catch (err) {
    showToast(err.response?.data?.error || 'Error', 'error');
  }
};
  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const pending = sellers.filter(s => s.status === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: 'white', fontFamily: 'sans-serif', position: 'relative' }}>
      <ThreeBackground />
      <Toast />
      <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            style={{ fontSize: '28px', background: 'linear-gradient(90deg, #6c63ff, #ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👑 Admin Dashboard
          </motion.h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#aaa' }}>Welcome, {user.name}</span>
            <button onClick={logout}
              style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <StatCard title="Total Sellers" value={sellers.length} color="#6c63ff" icon="🏪" />
          <StatCard title="Total Buyers" value={buyers.length} color="#00d2ff" icon="🛒" />
          <StatCard title="Pending Approval" value={pending} color="#ff6584" icon="⏳" />
          <StatCard title="Approved" value={sellers.filter(s => s.status === 'approved').length} color="#00ff88" icon="✅" />
        </div>

        {/* Tabs */}
       <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
         {['sellers', 'buyers', 'delivery', 'bulk-upload', 'banners'].map(t => (
  <button key={t} onClick={() => setTab(t)}
    style={{
      padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
      background: tab === t ? '#6c63ff' : '#1a1a2e', color: 'white', fontSize: '14px',
    }}>
    {t === 'sellers' ? '🏪 Sellers' : t === 'buyers' ? '🛒 Buyers' : t === 'delivery' ? '🚴 Delivery Boys' : t === 'bulk-upload' ? '📦 Bulk Upload' : '🖼️ Banners'}
  </button>
))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>Loading...</div>
        ) : tab !== 'delivery' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
  style={{ background: '#1a1a2e', borderRadius: '16px', overflowX: 'auto', border: '1px solid #2a2a4a' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#6c63ff22' }}>
                  {tab === 'sellers' ? (
                    <>
                      <th style={th}>Name</th>
                      <th style={th}>Username</th>
                      <th style={th}>Phone</th>
                      <th style={th}>Shop</th>
                      <th style={th}>Status</th>
                      <th style={th}>Actions</th>
                    </>
                  ) : (
                    <>
                      <th style={th}>Name</th>
                      <th style={th}>Username</th>
                      <th style={th}>Phone</th>
                      <th style={th}>Joined</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === 'sellers' ? sellers.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ borderBottom: '1px solid #2a2a4a' }}>
                    <td style={td}>{s.name}</td>
                    <td style={td}>@{s.username}</td>
                    <td style={td}>{s.phone}</td>
                    <td style={td}>{s.shop_name || '—'}</td>
                    <td style={td}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: s.status === 'approved' ? '#00ff8822' : s.status === 'pending' ? '#ffaa0022' : '#ff444422',
                        color: s.status === 'approved' ? '#00ff88' : s.status === 'pending' ? '#ffaa00' : '#ff4444',
                      }}>{s.status}</span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {s.status !== 'approved' && (
                          <button onClick={() => approveSeller(s.id)}
                            style={{ padding: '4px 12px', background: '#00ff8833', color: '#00ff88', border: '1px solid #00ff88', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Approve
                          </button>
                        )}
                        {s.status !== 'suspended' && (
                          <button onClick={() => suspendSeller(s.id)}
                            style={{ padding: '4px 12px', background: '#ff444433', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Suspend
                          </button>
                        )}
                        {s.status === 'approved' && (
                          <button onClick={() => viewSellerSales(s.id)}
                            style={{ padding: '4px 12px', background: '#ff0055', color: 'white', border: '1px solid #ff0055', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            📊 Selling
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )) : buyers.map((b, i) => (
                  <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ borderBottom: '1px solid #2a2a4a' }}>
                    <td style={td}>{b.name}</td>
                    <td style={td}>@{b.username}</td>
                    <td style={td}>{b.phone}</td>
                    <td style={td}>{new Date(b.created_at).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {((tab === 'sellers' && sellers.length === 0) || (tab === 'buyers' && buyers.length === 0)) && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No {tab} found</div>
            )}
          </motion.div>
        ) : null}
        {tab === 'delivery' && (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    style={{ background: '#1a1a2e', borderRadius: '16px', overflowX: 'auto', border: '1px solid #2a2a4a' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#6c63ff22' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Username</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Vehicle</th>
                  <th style={th}>Locality</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveryBoys.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }} style={{ borderBottom: '1px solid #2a2a4a' }}>
                    <td style={td}>{d.name}</td>
                    <td style={td}>@{d.username}</td>
                    <td style={td}>{d.phone}</td>
                    <td style={td}>{d.vehicle_type || '—'}</td>
                    <td style={td}>{d.locality || '—'}</td>
                    <td style={td}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: d.status === 'approved' ? '#00ff8822' : d.status === 'pending' ? '#ffaa0022' : '#ff444422',
                        color: d.status === 'approved' ? '#00ff88' : d.status === 'pending' ? '#ffaa00' : '#ff4444',
                      }}>{d.status}</span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {d.status !== 'approved' && (
                          <button onClick={() => approveDelivery(d.delivery_id)}
                            style={{ padding: '4px 12px', background: '#00ff8833', color: '#00ff88', border: '1px solid #00ff88', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Approve
                          </button>
                        )}
                        {d.status !== 'suspended' && (
                          <button onClick={() => suspendDelivery(d.delivery_id)}
                            style={{ padding: '4px 12px', background: '#ff444433', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {deliveryBoys.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No delivery boys found</div>
            )}
          </motion.div>
        )}

{tab === 'bulk-upload' && (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    <BulkProductUpload />
  </motion.div>
)}

{tab === 'banners' && (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    style={{ background: '#1a1a2e', borderRadius: '16px', padding: '20px', border: '1px solid #2a2a4a' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ margin: 0, color: 'white' }}>🖼️ Hero Banner Carousel ({banners.length}/12)</h3>
      <button onClick={openAddBanner} disabled={banners.length >= 12}
        style={{ background: banners.length >= 12 ? '#444' : '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: banners.length >= 12 ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
        + Add Banner
      </button>
    </div>

    {banners.length >= 12 && (
      <div style={{ background: '#ffaa0022', color: '#ffaa00', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>
        Maximum 12 banners reached. Delete one to add a new banner.
      </div>
    )}

    {bannersLoading ? (
      <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading...</div>
    ) : banners.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No banners yet. Click "+ Add Banner" to create one.</div>
    ) : (
      <>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: '14px' }}>Drag and drop cards to reorder — this is the order buyers will see in the app.</p>
        {banners.map((b) => (
          <div key={b.id}
            draggable
            onDragStart={() => handleDragStart(b.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(b.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', background: '#0a0a1a',
              border: '1px solid #2a2a4a', borderRadius: '12px', padding: '12px', marginBottom: '10px',
              cursor: 'grab', opacity: draggedId === b.id ? 0.4 : 1,
            }}>
            <span style={{ color: '#666', fontSize: '18px' }}>⠿</span>
            <img src={b.image_url} alt="" style={{ width: '90px', height: '54px', objectFit: 'cover', borderRadius: '8px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{b.title || '(no title)'}</div>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '2px' }}>
                {b.action_type !== 'none' ? `→ ${b.action_type}: ${b.action_value || '—'}` : 'No click action'}
                {(b.start_date || b.end_date) && ` • ${b.start_date || '∞'} to ${b.end_date || '∞'}`}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={b.is_active} onChange={() => toggleBannerActive(b)} />
              <span style={{ fontSize: '12px', color: b.is_active ? '#00ff88' : '#999' }}>{b.is_active ? 'Active' : 'Inactive'}</span>
            </label>
            <button onClick={() => openEditBanner(b)}
              style={{ background: '#6c63ff33', color: '#6c63ff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>
              Edit
            </button>
            <button onClick={() => deleteBanner(b.id)}
              style={{ background: '#ff444433', color: '#ff4444', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>
              Delete
            </button>
          </div>
        ))}
      </>
    )}
  </motion.div>
)}

{/* Add/Edit Banner Modal */}
{showBannerForm && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
    onClick={closeBannerForm}>
    <div onClick={e => e.stopPropagation()}
      style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '16px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h3 style={{ margin: 0, color: 'white' }}>{editingBannerId ? '✏️ Edit Banner' : '+ Add Banner'}</h3>
        <button onClick={closeBannerForm} style={{ background: '#2a2a4a', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'white' }}>✕</button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '8px' }}>Banner Image {editingBannerId ? '(leave empty to keep current)' : '*'}</label>
        {bannerImagePreview && (
          <img src={bannerImagePreview} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }} />
        )}
        <label style={{ display: 'block', padding: '12px', border: '2px dashed #6c63ff', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', color: '#6c63ff', fontSize: '13px' }}>
          {bannerImageFile ? bannerImageFile.name : '📁 Choose image'}
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              setBannerImageFile(file);
              const reader = new FileReader();
              reader.onload = () => setBannerImagePreview(reader.result);
              reader.readAsDataURL(file);
            }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {[
          { key: 'title', label: 'Title', placeholder: '🍕 Combo Blast' },
          { key: 'subtitle', label: 'Subtitle', placeholder: 'Burger + Pizza + Coke' },
          { key: 'discount_badge', label: 'Discount Badge', placeholder: 'Flat 50% OFF' },
          { key: 'cta_text', label: 'CTA Button Text', placeholder: 'Order Now' },
          { key: 'coupon_code', label: 'Coupon Code (optional)', placeholder: 'COMBO50' },
          { key: 'restaurant_name', label: 'Restaurant (optional)', placeholder: 'Ayush Hotel' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>{f.label}</label>
            <input value={bannerForm[f.key]} placeholder={f.placeholder}
              onChange={e => setBannerForm({ ...bannerForm, [f.key]: e.target.value })}
              style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Description</label>
          <textarea value={bannerForm.description}
            onChange={e => setBannerForm({ ...bannerForm, description: e.target.value })}
            style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box', height: '60px', resize: 'none' }} />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Click Action</label>
          <select value={bannerForm.action_type}
            onChange={e => {
              setBannerForm({ ...bannerForm, action_type: e.target.value, action_value: '' });
              setSelectedActionLabel('');
              setActionSearchResults([]);
              setActionSearchQuery('');
            }}
            style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}>
            <option value="none">No action</option>
            <option value="restaurant">Open Restaurant</option>
            <option value="product">Open Product</option>
            <option value="category">Open Category (slug)</option>
            <option value="url">External URL</option>
            <option value="deeplink">Custom Deep Link (screen id)</option>
          </select>
        </div>

        <div style={{ gridColumn: (bannerForm.action_type === 'product' || bannerForm.action_type === 'restaurant') ? 'span 2' : 'span 1' }}>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Action Value</label>

          {bannerForm.action_type === 'product' || bannerForm.action_type === 'restaurant' ? (
            <>
              {bannerForm.action_value && (
                <div style={{ background: '#0c831f22', color: '#00ff88', padding: '9px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✓ {selectedActionLabel || `Selected: ${bannerForm.action_value}`}</span>
                  <button onClick={() => { setBannerForm({ ...bannerForm, action_value: '' }); setSelectedActionLabel(''); }}
                    style={{ background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={actionSearchQuery} placeholder={bannerForm.action_type === 'product' ? 'Search product by name...' : 'Search shop by name...'}
                  onChange={e => setActionSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchForAction()}
                  style={{ flex: 1, padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }} />
                <button onClick={searchForAction} disabled={actionSearching}
                  style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                  {actionSearching ? '...' : 'Search'}
                </button>
              </div>
              {actionSearchResults.length > 0 && (
                <div style={{ background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', marginTop: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {actionSearchResults.map(r => (
                    <div key={r.id} onClick={() => selectActionResult(r)}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #2a2a4a', fontSize: '12px', color: 'white' }}>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <input value={bannerForm.action_value} placeholder={bannerForm.action_type === 'category' ? 'grocery / fresh / electronics...' : bannerForm.action_type === 'url' ? 'https://...' : 'screen id'}
              onChange={e => setBannerForm({ ...bannerForm, action_value: e.target.value })}
              style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          )}
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Text Position</label>
          <select value={bannerForm.text_position}
            onChange={e => setBannerForm({ ...bannerForm, text_position: e.target.value })}
            style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top-left">Top Left</option>
            <option value="top-center">Top Center</option>
            <option value="top-right">Top Right</option>
            <option value="center">Center</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
          <input type="checkbox" checked={bannerForm.is_active}
            onChange={e => setBannerForm({ ...bannerForm, is_active: e.target.checked })} />
          <span style={{ color: 'white', fontSize: '13px' }}>Active</span>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Start Date (optional)</label>
          <input type="date" value={bannerForm.start_date}
            onChange={e => setBannerForm({ ...bannerForm, start_date: e.target.value })}
            style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>End Date (optional)</label>
          <input type="date" value={bannerForm.end_date}
            onChange={e => setBannerForm({ ...bannerForm, end_date: e.target.value })}
            style={{ width: '100%', padding: '10px', background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button onClick={closeBannerForm}
          style={{ flex: 1, padding: '12px', background: '#2a2a4a', color: '#999', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          Cancel
        </button>
        <button onClick={saveBanner} disabled={bannerSaving}
          style={{ flex: 2, padding: '12px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', opacity: bannerSaving ? 0.7 : 1 }}>
          {bannerSaving ? 'Saving...' : editingBannerId ? '💾 Save Changes' : '+ Create Banner'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Seller Last-7-Days Sales Modal */}
      </div>

      {/* Seller Last-7-Days Sales Modal */}
      {salesModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={() => setSalesModalOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '16px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#ff0055' }}>
                📊 Last 7 Days — {sellerSalesData?.shop_name || 'Loading...'}
              </h3>
              <button onClick={() => setSalesModalOpen(false)}
                style={{ background: '#2a2a4a', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'white', fontSize: '16px' }}>✕</button>
            </div>

            {salesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading...</div>
            ) : sellerSalesData ? (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: '#6c63ff22' }}>
                      <th style={th}>Date</th>
                      <th style={th}>Orders</th>
                      <th style={th}>Revenue</th>
                      <th style={th}>10% Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerSalesData.days.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #2a2a4a' }}>
                        <td style={td}>{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td style={td}>{d.order_count}</td>
                        <td style={td}>₹{d.revenue.toFixed(0)}</td>
                        <td style={td}>₹{d.commission.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ background: '#ff005522', border: '1px solid #ff0055', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Total Orders</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{sellerSalesData.total_orders}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Total Revenue</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#00ff88' }}>₹{sellerSalesData.total_revenue.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Total 10% Commission</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#ff0055' }}>₹{sellerSalesData.total_commission.toFixed(0)}</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '14px 16px', textAlign: 'left', color: '#aaa', fontSize: '13px', fontWeight: '600' };
const td = { padding: '14px 16px', color: '#eee', fontSize: '14px' };