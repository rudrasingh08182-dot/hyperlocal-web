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
 
  useTabHistory(tab, setTab, ['sellers', 'buyers', 'delivery', 'bulk-upload']);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [sellerSalesData, setSellerSalesData] = useState(null);

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
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
         {['sellers', 'buyers', 'delivery', 'bulk-upload'].map(t => (
  <button key={t} onClick={() => setTab(t)}
    style={{
      padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
      background: tab === t ? '#6c63ff' : '#1a1a2e', color: 'white', fontSize: '14px',
    }}>
    {t === 'sellers' ? '🏪 Sellers' : t === 'buyers' ? '🛒 Buyers' : t === 'delivery' ? '🚴 Delivery Boys' : '📦 Bulk Upload'}
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