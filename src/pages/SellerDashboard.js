import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FiHome, FiPackage, FiShoppingBag, FiStar, FiTrendingUp, FiDollarSign, FiBell, FiSettings, FiLogOut, FiPlus, FiEdit2, FiTrash2, FiMenu, FiX, FiFileText, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import API from '../services/api';
import TermsAndConditions from '../components/TermsAndConditions';
import { requestNotificationPermission } from '../firebase';
import { Toast, showToast } from '../components/Toast';
import { useTabHistory } from '../hooks/useTabHistory';

function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Get seller id first
        const sellerRes = await API.get('/sellers/me');
        const sellerId = sellerRes.data.id;
        const res = await API.get(`/reviews/seller/${sellerId}`);
        setReviews(res.data.reviews);
        setAverage(res.data.average_rating);
      } catch (err) {
        console.error('Reviews fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const stars = (rating) => [1,2,3,4,5].map(s => (
    <span key={s} style={{ color: s <= rating ? '#f4c430' : '#ddd', fontSize: '14px' }}>★</span>
  ));

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading reviews...</div>;

  return (
    <div>
      {/* Summary */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>Customer Reviews</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '48px', fontWeight: '800', color: '#1a1a2e' }}>{average || '—'}</span>
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {stars(Math.round(average))}
            </div>
            <div style={{ fontSize: '13px', color: '#999' }}>{reviews.length} total reviews</div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
            <p>No reviews yet. Reviews will appear here once customers rate your shop.</p>
          </div>
        ) : reviews.map(r => (
          <div key={r.id} style={{ padding: '16px', borderBottom: '1px solid #f0f0e8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', color: '#1a1a2e' }}>👤 {r.buyer_name}</span>
              <div style={{ display: 'flex', gap: '2px' }}>{stars(r.rating)}</div>
            </div>
            {r.comment && <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{r.comment}</p>}
            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '6px' }}>{new Date(r.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [loading, setLoading] = useState(false);

  useTabHistory(activeTab, setActiveTab, ['dashboard', 'products', 'orders', 'analytics', 'earnings', 'reviews', 'returns', 'bank', 'paymentVerifications', 'settings', 'terms']);

  // Real data states
  const [dashboardData, setDashboardData] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
  name: '', description: '', sku: '', price: '',
  stock: '', category: '', return_policy: 'STANDARD_ELECTRONICS',
  image_urls: [], unit_type: 'piece', unit_weight: '', price_per_kg: ''
});
const [hasVariants, setHasVariants] = useState(false);
const [variantType, setVariantType] = useState('Size');
const [customVariantType, setCustomVariantType] = useState('');
const [variantRows, setVariantRows] = useState([
  { variant_value: '', price: '', stock: '', display_order: 1 }
]);

const addVariantRow = () => {
  setVariantRows(prev => [...prev, { variant_value: '', price: '', stock: '', display_order: prev.length + 1 }]);
};
const removeVariantRow = (idx) => {
  setVariantRows(prev => prev.filter((_, i) => i !== idx).map((row, i) => ({ ...row, display_order: i + 1 })));
};
const updateVariantRow = (idx, field, value) => {
  setVariantRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
};
  const [bankDetails, setBankDetails] = useState({
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  bank_name: '',
  account_type: 'savings',
  upi_id: '',
});
const [bankLoading, setBankLoading] = useState(false);
const [bankSaved, setBankSaved] = useState(false);
const [bankLocked, setBankLocked] = useState(false);
// ── Temporary QR-based payment system state ──
const [qrCodeUrl, setQrCodeUrl] = useState(null);
const [qrUploading, setQrUploading] = useState(false);
const [pendingVerifications, setPendingVerifications] = useState([]);
const [verificationsLoading, setVerificationsLoading] = useState(false);

// ── Returns state ──
const [sellerReturns, setSellerReturns] = useState([]);
const [returnsLoading, setReturnsLoading] = useState(false);
const [returnsSubTab, setReturnsSubTab] = useState('pending'); // 'pending' | 'accepted' | 'completed'

const fetchSellerReturns = async () => {
  setReturnsLoading(true);
  try {
    const sellerRes = await API.get('/sellers/me');
    const res = await API.get(`/returns?seller_id=${sellerRes.data.id}`);
    setSellerReturns(res.data);
  } catch (err) {
    console.error('Returns fetch failed:', err);
  } finally {
    setReturnsLoading(false);
  }
};

const handleAcceptReturn = async (returnId, refund_or_replacement) => {
  try {
    await API.patch(`/returns/${returnId}/accept`, { refund_or_replacement });
    showToast('Return accepted!', 'success');
    fetchSellerReturns();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to accept', 'error');
  }
};

const handleRejectReturn = async (returnId) => {
  const notes = window.prompt('Reason for rejection (optional):');
  if (notes === null) return; // cancelled
  try {
    await API.patch(`/returns/${returnId}/reject`, { notes });
    showToast('Return rejected', 'info');
    fetchSellerReturns();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to reject', 'error');
  }
};

const handleConfirmReturn = async (returnId) => {
  try {
    await API.patch(`/returns/${returnId}/confirm`);
    showToast('Return confirmed & completed! ✅', 'success');
    fetchSellerReturns();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to confirm', 'error');
  }
};
const [selectedVerification, setSelectedVerification] = useState(null);

// Fetch bank details on load
// Add this state at top
const [uploadingImage, setUploadingImage] = useState(false);
const [productImages, setProductImages] = useState([]);
const [shopSettings, setShopSettings] = useState({
  shop_name: '', contact_phone: '', address: '', locality: '',
});
const [shopSaved, setShopSaved] = useState(false);
const [revealedOrders, setRevealedOrders] = useState({});
const toggleReveal = (id) => setRevealedOrders(prev => ({ ...prev, [id]: !prev[id] }));

// ── Edit Product Modal ──
const [editingProduct, setEditingProduct] = useState(null); // holds the product being edited, or null
const [editForm, setEditForm] = useState(null);
const [editSaving, setEditSaving] = useState(false);
const [editUploadingImage, setEditUploadingImage] = useState(false);

// ── Color + Size Variant Manager (Fashion) ──
const [colorVariantProduct, setColorVariantProduct] = useState(null);
const [colorVariantList, setColorVariantList] = useState([]);
const [colorVariantLoading, setColorVariantLoading] = useState(false);
const [newColorName, setNewColorName] = useState('');
const [newColorImages, setNewColorImages] = useState([]);
const [colorImageUploading, setColorImageUploading] = useState(false);
const [addingColor, setAddingColor] = useState(false);
const [newSizeInputs, setNewSizeInputs] = useState({});
const [addingSizeFor, setAddingSizeFor] = useState(null);

const openEditModal = (product) => {
  setEditingProduct(product);
  setEditForm({
    name: product.name || '',
    description: product.description || '',
    price: product.price || '',
    stock: product.stock ?? '',
    category: product.category || '',
    return_policy: product.return_policy || 'STANDARD_ELECTRONICS',
    unit_type: product.unit_type || 'piece',
    unit_weight: product.unit_weight || '',
    price_per_kg: product.price_per_kg || '',
    image_urls: product.image_urls || [],
  });
};

const closeEditModal = () => {
  setEditingProduct(null);
  setEditForm(null);
};

const saveEditedProduct = async () => {
  if (!editForm.name || !editForm.price || editForm.stock === '') {
    showToast('Please fill name, price and stock', 'error');
    return;
  }
  setEditSaving(true);
  try {
    await API.put(`/products/${editingProduct.id}`, editForm);
    showToast('Product updated!', 'success');
    closeEditModal();
    fetchProducts();
    fetchDashboard();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to update product', 'error');
  } finally {
    setEditSaving(false);
  }
};

const openColorVariantModal = async (product) => {
  setColorVariantProduct(product);
  setColorVariantList([]);
  setNewColorName('');
  setNewColorImages([]);
  setColorVariantLoading(true);
  try {
    const res = await API.get(`/products/${product.id}/colors`);
    setColorVariantList(res.data);
  } catch (err) {
    showToast('Failed to load color variants', 'error');
  } finally {
    setColorVariantLoading(false);
  }
};

const closeColorVariantModal = () => {
  setColorVariantProduct(null);
  setColorVariantList([]);
};

const uploadColorImage = async (file) => {
  setColorImageUploading(true);
  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setNewColorImages(prev => [...prev, res.data.url]);
  } catch (err) {
    showToast('Image upload failed', 'error');
  } finally {
    setColorImageUploading(false);
  }
};

const addColorVariant = async () => {
  if (!newColorName.trim()) { showToast('Please enter a color name', 'error'); return; }
  if (newColorImages.length === 0) { showToast('Please upload at least one image for this color', 'error'); return; }
  setAddingColor(true);
  try {
    await API.post(`/products/${colorVariantProduct.id}/colors`, {
      color_name: newColorName.trim(),
      images: newColorImages,
    });
    showToast('Color added!', 'success');
    setNewColorName('');
    setNewColorImages([]);
    const res = await API.get(`/products/${colorVariantProduct.id}/colors`);
    setColorVariantList(res.data);
    fetchProducts();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to add color', 'error');
  } finally {
    setAddingColor(false);
  }
};

const deleteColorVariant = async (colorId) => {
  if (!window.confirm('Delete this color and all its sizes?')) return;
  try {
    await API.delete(`/products/colors/${colorId}`);
    setColorVariantList(prev => prev.filter(c => c.id !== colorId));
    showToast('Color removed', 'info');
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to delete color', 'error');
  }
};

const addSizeToColor = async (colorId) => {
  const input = newSizeInputs[colorId] || {};
  if (!input.size || input.stock === undefined || input.stock === '') {
    showToast('Please fill size and stock', 'error');
    return;
  }
  setAddingSizeFor(colorId);
  try {
    const res = await API.post(`/products/colors/${colorId}/sizes`, {
      size: input.size.trim(),
      stock: parseInt(input.stock),
      price: input.price ? parseFloat(input.price) : null,
    });
    setColorVariantList(prev => prev.map(c => c.id === colorId ? { ...c, sizes: [...(c.sizes || []), res.data] } : c));
    setNewSizeInputs(prev => ({ ...prev, [colorId]: { size: '', stock: '', price: '' } }));
    showToast('Size added!', 'success');
    fetchProducts();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to add size', 'error');
  } finally {
    setAddingSizeFor(null);
  }
};

const updateSizeStock = async (colorId, sizeId, newStock) => {
  try{
    await API.put(`/products/colors/sizes/${sizeId}`, { stock: parseInt(newStock) });
    setColorVariantList(prev => prev.map(c => c.id === colorId
      ? { ...c, sizes: c.sizes.map(s => s.id === sizeId ? { ...s, stock: parseInt(newStock) } : s) }
      : c));
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to update stock', 'error');
  }
};

const deleteSizeFromColor = async (colorId, sizeId) => {
  if (!window.confirm('Remove this size?')) return;
  try {
    await API.delete(`/products/colors/sizes/${sizeId}`);
    setColorVariantList(prev => prev.map(c => c.id === colorId ? { ...c, sizes: c.sizes.filter(s => s.id !== sizeId) } : c));
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to remove size', 'error');
  }
};

const uploadImage = async (file) => {
  setUploadingImage(true);
  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await API.post('/uploads/product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setProductImages(prev => [...prev, res.data.url]);
    setNewProduct(prev => ({ ...prev, image_urls: [...(prev.image_urls || []), res.data.url] }));
  } catch (err) {
    showToast('Image upload failed', 'error');
  } finally {
    setUploadingImage(false);
  }
};
useEffect(() => {
  fetchBankDetails();
}, []);

const fetchBankDetails = async () => {
  try {
    const res = await API.get('/sellers/bank-details');
    // bank.controller.js wraps the row as { bank_details: {...} }, not flat
    const details = res.data?.bank_details;
    if (details) {
      setBankDetails(details);
      setQrCodeUrl(details.qr_code_url || null);
      setBankLocked(true); // already saved — lock until seller taps Edit
    }
  } catch (err) {
    console.error('Bank details fetch failed');
  }
};

const saveBankDetails = async () => {
  setBankLoading(true);
  try {
    const res = await API.post('/sellers/bank-details', bankDetails);
    // Server returns the masked account number — use that as the source of
    // truth so the locked view shows XXXXXXXX1234, not the raw typed value.
    if (res.data?.bank_details) setBankDetails(res.data.bank_details);
    setBankSaved(true);
    setBankLocked(true);
    setTimeout(() => setBankSaved(false), 3000);
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to save', 'error');
  } finally {
    setBankLoading(false);
  }
};

// ── Temporary QR-based payment system: seller-side handlers ──
const uploadQrCode = async (file) => {
  setQrUploading(true);
  try {
    const formData = new FormData();
    formData.append('qr', file);
    const res = await API.post('/sellers/payment-qr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setQrCodeUrl(res.data.qr_code_url);
    showToast('QR code uploaded!', 'success');
  } catch (err) {
    showToast(err.response?.data?.error || 'QR upload failed', 'error');
  } finally {
    setQrUploading(false);
  }
};

const deleteQrCode = async () => {
  if (!window.confirm('Remove your payment QR code?')) return;
  try {
    await API.delete('/sellers/payment-qr');
    setQrCodeUrl(null);
    showToast('QR code removed');
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to remove QR code', 'error');
  }
};

const fetchPendingVerifications = async () => {
  setVerificationsLoading(true);
  try {
    const res = await API.get('/payments/qr/pending');
    setPendingVerifications(res.data);
  } catch (err) {
    console.error('Pending verifications fetch failed');
  } finally {
    setVerificationsLoading(false);
  }
};

const approvePaymentVerification = async (verificationId) => {
  try {
    await API.patch(`/payments/qr/${verificationId}/approve`);
    showToast('Payment approved, order confirmed!', 'success');
    fetchPendingVerifications();
    fetchDashboard();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to approve', 'error');
  }
};

const rejectPaymentVerification = async (verificationId) => {
  if (!window.confirm('Reject this payment? The buyer will be asked to retry.')) return;
  try {
    await API.patch(`/payments/qr/${verificationId}/reject`);
    showToast('Payment rejected');
    fetchPendingVerifications();
    fetchDashboard();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to reject', 'error');
  }
};

// Fetches fresh payment-verification data for one order and opens the modal
const viewPaymentForOrder = async (orderId) => {
  try {
    const res = await API.get('/payments/qr/pending');
    setPendingVerifications(res.data);
    const match = res.data.find(v => v.order_id === orderId);
    if (match) {
      setSelectedVerification(match);
    } else {
      showToast('Payment details not found — try refreshing', 'error');
    }
  } catch (err) {
    showToast('Failed to load payment details', 'error');
  }
};

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

 useEffect(() => {
  fetchDashboard();
  fetchProducts();
  fetchOrders();
  fetchShopSettings();
  // Request FCM token for seller — sellers table mein save hoga
  import('../services/fcmToken').then(({ registerFCMToken, onForegroundMessage }) => {
    registerFCMToken('seller');

    // Foreground FCM notification listener — jab seller dashboard khula ho
    onForegroundMessage(({ title, body }) => {
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setNotifications(prev => [
        { id: Date.now(), msg: `${title} — ${body}`, time: timeStr, read: false },
        ...prev,
      ]);
      // Toast bhi dikhao
      showToast(`${title}`, 'info');
    });
  });
}, []);


useEffect(() => {
  if (activeTab === 'paymentVerifications') fetchPendingVerifications();
  if (activeTab === 'returns') fetchSellerReturns();
}, [activeTab]);
  
  // Add this useEffect after existing useEffects
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await API.get('/sellers/dashboard');
      const newData = res.data;
      
      // Check for new pending orders
      if (dashboardData && newData.sales.pending_orders > dashboardData.sales.pending_orders) {
        const diff = newData.sales.pending_orders - dashboardData.sales.pending_orders;
        setNotifications(prev => [
          { id: Date.now(), msg: `🛒 ${diff} new order(s) received!`, time: 'Just now', read: false },
          ...prev
        ]);
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('New Order!', { body: `You have ${diff} new order(s)` });
        }
      }
      setDashboardData(newData);
    } catch (err) {
      console.error('Poll failed');
    }
  }, 30000); // every 30 seconds

  // Request browser notification permission
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  return () => clearInterval(interval);
}, [dashboardData]);
  const fetchDashboard = async () => {
    try {
      const res = await API.get('/sellers/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get('/products/my-products');
      setProducts(res.data);
    } catch (err) {
      console.error('Products fetch failed:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get('/sellers/my-orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Orders fetch failed:', err);
    }
  };
const [storeOnline, setStoreOnline] = useState(true);
const [storeStatusLoading, setStoreStatusLoading] = useState(false);
const [shopHasLocation, setShopHasLocation] = useState(true); // assume true until we know otherwise

const fetchShopSettings = async () => {
  try {
    const res = await API.get('/sellers/me');
    setShopSettings({
      shop_name: res.data.shop_name || '',
      contact_phone: res.data.contact_phone || '',
      address: res.data.address || '',
      locality: res.data.locality || '',
    });
    setStoreOnline(res.data.is_online !== false);

    const hasLocation = !!(res.data.latitude && res.data.longitude);
    setShopHasLocation(hasLocation);

    // First time ever (no location saved) — auto-request GPS and save silently.
    if (!hasLocation) {
      requestAndSaveShopLocation(true);
    }
  } catch (err) {
    console.error('Shop settings fetch failed');
  }
};

// silent=true → no alert popups (used for the automatic first-time capture)
const requestAndSaveShopLocation = (silent = false) => {
  if (!navigator.geolocation) {
    if (!silent) showToast('GPS not supported on this device', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await API.patch('/sellers/me', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShopHasLocation(true);
        if (!silent) showToast('Shop location saved! ✅', 'success');
      } catch (err) {
        if (!silent) showToast('Failed to save location', 'error');
      }
    },
    () => {
      if (!silent) showToast('Could not get location. Please enable GPS and try again.', 'error');
    }
  );
};

const toggleStoreStatus = async () => {
  const newStatus = !storeOnline;
  setStoreStatusLoading(true);
  try {
    const res = await API.patch('/sellers/store-status', { is_online: newStatus });
    setStoreOnline(res.data.is_online);
    showToast(res.data.message, res.data.is_online ? 'success' : 'info');
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to update store status', 'error');
  } finally {
    setStoreStatusLoading(false);
  }
};
const saveProduct = async () => {
  if (!newProduct.name || !newProduct.price || !newProduct.stock) {
    showToast('Please fill name, price and stock', 'error');
    return;
  }

  let variantsPayload = [];
  if (hasVariants) {
    const finalVariantType = variantType === 'Custom' ? customVariantType.trim() : variantType;
    if (!finalVariantType) {
      showToast('Please enter a custom variant type name', 'error');
      return;
    }
    const incomplete = variantRows.some(r => !r.variant_value || !r.price || r.stock === '');
    if (incomplete) {
      showToast('Please fill all variant fields (value, price, stock)', 'error');
      return;
    }
    variantsPayload = variantRows.map((r, i) => ({
      variant_type: finalVariantType,
      variant_value: r.variant_value,
      price: parseFloat(r.price),
      stock: parseInt(r.stock),
      display_order: i + 1,
    }));
  }

  setLoading(true);
  try {
    await API.post('/products', {
      ...newProduct,
      image_urls: newProduct.image_urls.length > 0 ? newProduct.image_urls : ['https://via.placeholder.com/300'],
      unit_type: newProduct.unit_type || 'piece',
      unit_weight: newProduct.unit_weight || null,
      price_per_kg: newProduct.price_per_kg || null,
      variants: variantsPayload,
    });
    showToast('Product added!', 'success');
    setShowAddProduct(false);
    setNewProduct({ name: '', description: '', sku: '', price: '', stock: '', category: '', return_policy: 'STANDARD_ELECTRONICS', image_urls: [], unit_type: 'piece', unit_weight: '', price_per_kg: '' });
    setHasVariants(false);
    setVariantType('Size');
    setCustomVariantType('');
    setVariantRows([{ variant_value: '', price: '', stock: '', display_order: 1 }]);
    fetchProducts();
    fetchDashboard();
  } catch (err) {
    showToast(err.response?.data?.error || 'Failed to add product', 'error');
  } finally {
    setLoading(false);
  }
};
  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await API.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
  { id: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
  { id: 'products', icon: <FiPackage />, label: 'Products' },
  { id: 'orders', icon: <FiShoppingBag />, label: 'Orders' },
  { id: 'analytics', icon: <FiTrendingUp />, label: 'Analytics' },
  { id: 'earnings', icon: <FiDollarSign />, label: 'Earnings' },
  { id: 'reviews', icon: <FiStar />, label: 'Reviews' },
  { id: 'returns', icon: <FiRefreshCw />, label: 'Returns' },
  { id: 'bank', icon: <FiDollarSign />, label: 'Bank Details' },
  { id: 'paymentVerifications', icon: <FiCheckCircle />, label: 'Payment Verifications' },
  { id: 'settings', icon: <FiSettings />, label: 'Shop Settings' },
  { id: 'terms', icon: <FiFileText />, label: 'Terms & Conditions' },
];

  const s = dashboardData?.sales;
  const f = dashboardData?.financials;
  const chartData = dashboardData?.sales_chart || [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fffef7', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
         <Toast />

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? '240px' : '70px', background: 'white', borderRight: '1px solid #f0f0e8', transition: 'width 0.3s ease', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 12px rgba(0,0,0,0.06)', zIndex: 10 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0e8', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}><img src="/logo1.png" alt="Zaplo" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} /></div>
          {sidebarOpen && <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>Zaplo Seller</span>}
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', background: activeTab === item.id ? 'linear-gradient(135deg, #6c63ff15, #a78bfa15)' : 'transparent', color: activeTab === item.id ? '#6c63ff' : '#666', fontWeight: activeTab === item.id ? '600' : '400', borderLeft: activeTab === item.id ? '3px solid #6c63ff' : '3px solid transparent' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ fontSize: '14px' }}>{item.label}</span>}
            </div>
          ))}
        </nav>
        <div onClick={logout} style={{ padding: '16px', borderTop: '1px solid #f0f0e8', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#ff4444' }}>
          <FiLogOut style={{ flexShrink: 0 }} />
          {sidebarOpen && <span style={{ fontSize: '14px' }}>Logout</span>}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{ background: 'white', borderBottom: '1px solid #f0f0e8', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#666' }}>
              {sidebarOpen ? <FiX /> : <FiMenu />}
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Store Status toggle */}
            <div onClick={() => !storeStatusLoading && toggleStoreStatus()}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: storeStatusLoading ? 'wait' : 'pointer', background: storeOnline ? '#e8fff8' : '#fff0f0', padding: '8px 14px', borderRadius: '999px', opacity: storeStatusLoading ? 0.6 : 1 }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: storeOnline ? '#00b894' : '#ff4444' }}>
                {storeOnline ? '🟢 Online' : '🔴 Temporarily Closed'}
              </span>
              <div style={{ width: '38px', height: '22px', borderRadius: '999px', background: storeOnline ? '#00b894' : '#ccc', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: storeOnline ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => {
                setShowNotif(!showNotif);
                // Mark all as read when opened
                if (!showNotif) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }} style={{ background: '#f8f8f0', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontSize: '18px', position: 'relative' }}>
                <FiBell color={unreadCount > 0 ? '#6c63ff' : '#666'} />
                {unreadCount > 0 && <span style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{unreadCount}</span>}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotif && (
                <div style={{ position: 'absolute', right: 0, top: '48px', width: '320px', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #f0f0e8', zIndex: 999, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>🔔 Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={() => setNotifications([])}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: '#999', cursor: 'pointer' }}>
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: '#bbb' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                        <div style={{ fontSize: '13px' }}>Koi notification nahi hai</div>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8f8f0', background: n.read ? 'white' : '#f5f3ff' }}>
                          <div style={{ fontSize: '13px', color: '#1a1a2e', fontWeight: n.read ? '400' : '600', lineHeight: '1.5' }}>{n.msg}</div>
                          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>{n.time}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700' }}>
                {user.name?.[0] || 'S'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{user.name}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>Seller</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              {!dashboardData ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading dashboard...</div>
              ) : (
                <>
                  {/* Stat Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                      { label: "Today's Sales", value: `₹${s?.today_sales?.toFixed(0) || 0}`, color: '#6c63ff' },
                      { label: 'Total Orders', value: s?.total_orders || 0, color: '#00b894' },
                      { label: 'Pending Orders', value: s?.pending_orders || 0, color: '#e17055' },
                      { label: 'Monthly Revenue', value: `₹${s?.monthly_sales?.toFixed(0) || 0}`, color: '#0984e3' },
                    ].map((card, i) => (
                      <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0e8' }}>
                        <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px' }}>{card.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: card.color }}>{card.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1a1a2e' }}>Weekly Sales</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData.length > 0 ? chartData : [{ day: 'No data', sales: 0 }]}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#999' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                          <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                          <Area type="monotone" dataKey="sales" stroke="#6c63ff" fill="url(#salesGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1a1a2e' }}>Orders by Day</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData.length > 0 ? chartData : [{ day: 'No data', orders: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#999' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1a1a2e' }}>Recent Orders</h3>
                    {dashboardData?.recent_orders?.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No orders yet</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafaf5' }}>
                            {['Order ID', 'Customer', 'Items', 'Amount', 'Status', 'Date'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#999', fontWeight: '600' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recent_orders?.map(order => (
                            <tr key={order.id} style={{ borderBottom: '1px solid #f8f8f0' }}>
                              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#6c63ff' }}>#{order.id.slice(-6).toUpperCase()}</td>
                              <td style={{ padding: '12px', fontSize: '13px', color: '#333' }}>{order.buyer_name}</td>
                              <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{order.item_count} items</td>
                              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>₹{order.total_amount}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: order.status === 'delivered' ? '#e8fff8' : order.status === 'confirmed' ? '#e8f4ff' : '#fff3f0', color: order.status === 'delivered' ? '#00b894' : order.status === 'confirmed' ? '#0984e3' : '#e17055' }}>{order.status}</span>
                              </td>
                              <td style={{ padding: '12px', fontSize: '12px', color: '#999' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Product Management ({products.length})</h2>
                <button onClick={() => setShowAddProduct(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600' }}>
                  <FiPlus /> Add Product
                </button>
              </div>

              {showAddProduct && (
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0e8' }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>Add New Product</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                      { placeholder: 'Product Name *', key: 'name' },
                      { placeholder: 'SKU (optional)', key: 'sku' },
                      { placeholder: 'Price (₹) *', key: 'price' },
                      { placeholder: 'Stock Quantity *', key: 'stock' },
                      { placeholder: 'Category', key: 'category' },
                      
                    ].map(f => (
                      <input key={f.key} placeholder={f.placeholder}
                        value={f.key === 'image_url_input' ? '' : newProduct[f.key]}
                        onChange={e => {
                          if (f.key === 'image_url_input') {
                            setNewProduct({ ...newProduct, image_urls: [e.target.value] });
                          } else {
                            setNewProduct({ ...newProduct, [f.key]: e.target.value });
                          }
                        }}
                        style={{ padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                    ))}
                   {/* Unit Type & Weight */}
<div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
  <div>
    <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Sold By *</label>
    <select value={newProduct.unit_type || 'piece'}
      onChange={e => setNewProduct({ ...newProduct, unit_type: e.target.value })}
      style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none' }}>
      <option value="piece">📦 Per Piece</option>
      <option value="kg">⚖️ Per KG</option>
      <option value="gram">🔢 Per Gram</option>
      <option value="quintal">🌾 Per Quintal</option>
      <option value="litre">💧 Per Litre</option>
      <option value="ml">🧪 Per ML</option>
      <option value="dozen">🥚 Per Dozen</option>
      <option value="packet">📫 Per Packet</option>
      <option value="box">📦 Per Box</option>
      <option value="bundle">🎁 Per Bundle</option>
      <option value="plate">🍽️ Per Plate</option>
      <option value="bowl">🥣 Per Bowl</option>
      <option value="cup">☕ Per Cup</option>
      <option value="tray">🍱 Per Tray</option>
      <option value="pair">👟 Per Pair</option>
      <option value="set">🎽 Per Set</option>
      <option value="roll">🧻 Per Roll</option>
      <option value="sheet">📄 Per Sheet</option>
      <option value="bottle">🍾 Per Bottle</option>
      <option value="jar">🫙 Per Jar</option>
      <option value="can">🥫 Per Can</option>
      <option value="sachet">🧂 Per Sachet</option>
      <option value="strip">💊 Per Strip</option>
      <option value="meter">📏 Per Meter</option>
    </select>
  </div>
  <div>
    <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
      Weight/Volume (optional)
    </label>
    <input placeholder="e.g. 500 (grams)" value={newProduct.unit_weight || ''}
      onChange={e => setNewProduct({ ...newProduct, unit_weight: e.target.value })}
      style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
  </div>
  <div>
    <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
      Price per KG (if sold by KG)
    </label>
    <input placeholder="e.g. 80" value={newProduct.price_per_kg || ''}
      onChange={e => setNewProduct({ ...newProduct, price_per_kg: e.target.value })}
      style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
  </div>
</div>
                      {/* Image Upload Section */}
<div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
  <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '10px' }}>
    📷 Product Photos *
  </label>

  {/* Uploaded images preview */}
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
    {(newProduct.image_urls || []).map((url, i) => (
      <div key={i} style={{ position: 'relative' }}>
        <img src={url} alt="" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #e8e8e0' }} />
        <button
          onClick={() => setNewProduct(prev => ({
            ...prev,
            image_urls: prev.image_urls.filter((_, idx) => idx !== i)
          }))}
          style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ✕
        </button>
      </div>
    ))}

    {/* Upload button */}
    {(newProduct.image_urls || []).length < 5 && (
      <label style={{
        width: '80px', height: '80px',
        border: '2px dashed #6c63ff',
        borderRadius: '10px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: uploadingImage ? 'not-allowed' : 'pointer',
        color: '#6c63ff', background: '#f8f7ff',
        transition: 'all 0.2s'
      }}>
        {uploadingImage ? (
          <>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <span style={{ fontSize: '9px', marginTop: '4px' }}>Uploading...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '24px' }}>📷</span>
            <span style={{ fontSize: '9px', marginTop: '4px', fontWeight: '600' }}>Add Photo</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          
          style={{ display: 'none' }}
          disabled={uploadingImage}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setUploadingImage(true);
            try {
              const formData = new FormData();
              formData.append('image', file);
              const res = await API.post('/uploads/product-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              setNewProduct(prev => ({
                ...prev,
                image_urls: [...(prev.image_urls || []), res.data.url]
              }));
            } catch (err) {
              showToast('Upload failed. Check your internet connection.', 'error');
            } finally {
              setUploadingImage(false);
              e.target.value = '';
            }
          }}
        />
      </label>
    )}
  </div>

  <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
    📱 On mobile: camera opens directly • Max 5 photos • Click ✕ to remove
  </p>
</div>

                    <textarea placeholder="Description" value={newProduct.description}
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                      style={{ padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', gridColumn: 'span 2', height: '80px', resize: 'none', outline: 'none' }} />
                   <div style={{ gridColumn: 'span 2' }}>
  <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>Return Policy *</label>
  <select value={newProduct.return_policy}
    onChange={e => setNewProduct({ ...newProduct, return_policy: e.target.value })}
    style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none' }}>
    <option value="PERISHABLE_FOOD">🥬 Perishable Food (No returns)</option>
    <option value="PACKAGED_FOOD">📦 Packaged Food (2 days - Damaged/Expired)</option>
    <option value="STANDARD_ELECTRONICS">📱 Standard Electronics (7 days - Replacement only)</option>
    <option value="HIGH_VALUE_ELECTRONICS">💎 High Value Electronics (7 days - Approval required)</option>
    <option value="STATIONERY">✏️ Stationery (2 days - Damaged only)</option>
    <option value="FASHION">👕 Fashion (3 days - Wrong size/Damaged)</option>
    <option value="GROCERY">🛒 Grocery (1 day - Damaged/Expired)</option>
    <option value="FRESH">🥦 Fresh Produce (No returns)</option>
    <option value="BEAUTY_ACCESSORIES">💄 Beauty & Accessories (Return only if damaged/expired)</option>
  </select>
</div>
<div style={{ gridColumn: 'span 2', marginTop: '8px', borderTop: '1px solid #f0f0e8', paddingTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#1a1a2e' }}>
                      <input type="checkbox" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      This Product Has Variants (e.g. different sizes, weights, colors)
                    </label>

                    {hasVariants && (
                      <div style={{ marginTop: '16px', background: '#f8f7ff', borderRadius: '12px', padding: '16px', border: '1px solid #e8e0ff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Variant Type</label>
                            <select value={variantType} onChange={e => setVariantType(e.target.value)}
                              style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none' }}>
                              {['Size', 'Weight', 'Volume', 'Storage', 'Color', 'RAM', 'Flavor', 'Pack Size', 'Material', 'Custom'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          {variantType === 'Custom' && (
                            <div>
                              <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Custom Variant Type Name</label>
                              <input placeholder="e.g. Spice Level" value={customVariantType}
                                onChange={e => setCustomVariantType(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          )}
                        </div>

                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', marginBottom: '10px' }}>
                          {variantType === 'Custom' ? (customVariantType || 'Custom') : variantType} Options
                        </div>

                        {variantRows.map((row, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <input placeholder={`e.g. ${variantType === 'Size' ? '7 Inch' : 'Value'}`} value={row.variant_value}
                              onChange={e => updateVariantRow(i, 'variant_value', e.target.value)}
                              style={{ padding: '10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            <input placeholder="Price ₹" type="number" value={row.price}
                              onChange={e => updateVariantRow(i, 'price', e.target.value)}
                              style={{ padding: '10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            <input placeholder="Stock" type="number" value={row.stock}
                              onChange={e => updateVariantRow(i, 'stock', e.target.value)}
                              style={{ padding: '10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            <button onClick={() => removeVariantRow(i)} disabled={variantRows.length === 1}
                              style={{ background: '#fff0f0', color: '#ff4444', border: 'none', borderRadius: '8px', padding: '10px 12px', cursor: variantRows.length === 1 ? 'not-allowed' : 'pointer', opacity: variantRows.length === 1 ? 0.4 : 1 }}>
                              ✕
                            </button>
                          </div>
                        ))}

                        <button onClick={addVariantRow}
                          style={{ marginTop: '8px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          + Add Another Option
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={saveProduct} disabled={loading}
                      style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontWeight: '600', opacity: loading ? 0.7 : 1 }}>
                      {loading ? 'Saving...' : 'Save Product'}
                    </button>
                    <button onClick={() => setShowAddProduct(false)} style={{ background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <p>No products yet. Add your first product!</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafaf5' }}>
                          {['Product', 'Category', 'Price', 'Stock', 'Return Policy', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#999', fontWeight: '600' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f8f8f0' }}>
                            <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {p.image_urls?.[0] ? (
                                  <img src={p.image_urls[0]} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', background: '#f0eeff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                                )}
                                {p.name}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>{p.category || '—'}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#6c63ff' }}>₹{p.price}</td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: p.stock === 0 ? '#e17055' : '#333' }}>{p.stock === 0 ? 'Out of stock' : p.stock}</td>
                            <td style={{ padding: '14px 16px', fontSize: '11px', color: '#666' }}>{p.return_policy?.replace(/_/g, ' ')}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: p.is_available ? '#e8fff8' : '#fff3f0', color: p.is_available ? '#00b894' : '#e17055' }}>
                                {p.is_available ? 'Active' : 'Out of Stock'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => openEditModal(p)} style={{ background: '#e8f4ff', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#0984e3' }}><FiEdit2 /></button>
                                <button onClick={() => openColorVariantModal(p)}
                                  title="Manage Color + Size Variants"
                                  style={{ background: '#f8f0ff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#6c63ff', fontWeight: '700', fontSize: '12px' }}>
                                  🎨 Colors
                                </button>
                                <button onClick={() => deleteProduct(p.id)} style={{ background: '#fff0f0', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#e17055' }}><FiTrash2 /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
  <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Order Management</h2>
      <button onClick={fetchDashboard}style={{ background: '#6c63ff15', color: '#6c63ff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>
        🔄 Refresh
      </button>
    </div>
    {dashboardData?.recent_orders?.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No orders yet</div>
    ) : dashboardData?.recent_orders?.map(order => (
      <div key={order.id} style={{ padding: '16px', border: '1px solid #f0f0e8', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: '700', color: '#6c63ff', fontSize: '15px' }}>#{order.id.slice(-6).toUpperCase()}</div>
            <div style={{ color: '#333', fontSize: '13px', marginTop: '4px' }}>{order.buyer_name} • {order.item_count} items</div>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '2px' }}>{new Date(order.created_at).toLocaleString()}</div>
           {/* Product Details + Buyer Contact — blurred until revealed */}
<div style={{ marginTop: '12px', position: 'relative' }}>
  <div style={{
    filter: revealedOrders[order.id] ? 'none' : 'blur(5px)',
    userSelect: revealedOrders[order.id] ? 'auto' : 'none',
    transition: 'filter 0.2s',
  }}>
    {/* Product / Quantity Details */}
    {order.items && (
      <div style={{ background: '#f8f8f0', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#6c63ff', marginBottom: '6px', textTransform: 'uppercase' }}>Order Items</div>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: i < order.items.length - 1 ? '1px solid #f0f0e8' : 'none' }}>
            <span style={{ color: '#333', fontWeight: '600' }}>📦 {item.name}</span>
            <span style={{ color: '#6c63ff', fontWeight: '700' }}>x{item.quantity} — ₹{item.unit_price * item.quantity}</span>
          </div>
        ))}
      </div>
    )}

    {/* Buyer Contact & Delivery */}
    <div style={{ background: '#fff8e8', borderRadius: '10px', padding: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', marginBottom: '6px', textTransform: 'uppercase' }}>Buyer Contact & Delivery</div>
      <div style={{ fontSize: '13px', color: '#333' }}>📞 {order.delivery_phone || 'N/A'}</div>
      <div style={{ fontSize: '13px', color: '#333', marginTop: '4px' }}>📍 {order.delivery_address || 'N/A'}</div>
      {order.delivery_landmark && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Near: {order.delivery_landmark}</div>
      )}
    </div>
  </div>

  <button onClick={() => toggleReveal(order.id)}
    style={{
      position: revealedOrders[order.id] ? 'static' : 'absolute',
      top: '50%', left: '50%',
      transform: revealedOrders[order.id] ? 'none' : 'translate(-50%, -50%)',
      marginTop: revealedOrders[order.id] ? '10px' : 0,
      background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px',
      padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2,
    }}>
    {revealedOrders[order.id] ? '🙈 Hide Details' : '👁️ Reveal Order & Buyer Details'}
  </button>

  {revealedOrders[order.id] && order.delivery_phone && (
    <a href={`tel:${order.delivery_phone}`}
      style={{ display: 'inline-block', marginTop: '10px', marginLeft: '8px', background: '#00b894', color: 'white', borderRadius: '8px', padding: '10px 20px', textDecoration: 'none', fontWeight: '700', fontSize: '12px' }}>
      📞 Call Buyer
    </a>
  )}
</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#1a1a2e' }}>₹{order.total_amount}</div>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', marginTop: '6px', display: 'inline-block',
              background: order.status === 'delivered' ? '#e8fff8' : order.status === 'confirmed' ? '#e8f4ff' : order.status === 'cancelled' ? '#fff0f0' : '#fff3f0',
              color: order.status === 'delivered' ? '#00b894' : order.status === 'confirmed' ? '#0984e3' : order.status === 'cancelled' ? '#ff4444' : '#e17055',
            }}>{order.status}</span>
          </div>
        </div>

       {/* Action Buttons */}
        {order.status === 'pending' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button onClick={async () => {
              try {
                await API.patch(`/sellers/orders/${order.id}/confirm`);
                showToast('Order confirmed!', 'success');
                fetchDashboard();
              } catch (err) {
                showToast(err.response?.data?.error || 'Failed', 'error');
              }
            }}
              style={{ flex: 1, padding: '10px', background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
              ✅ Accept Order
            </button>
            <button onClick={async () => {
              if (!window.confirm('Cancel this order?')) return;
              try {
                await API.patch(`/sellers/orders/${order.id}/cancel`);
                showToast('Order cancelled');
                fetchDashboard();
              } catch (err) {
                showToast(err.response?.data?.error || 'Failed', 'error');
              }
            }}
              style={{ flex: 1, padding: '10px', background: '#ff444415', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
              ❌ Reject Order
            </button>
          </div>
        )}

        {/* Blue button — only shows when buyer has submitted online payment proof for this order */}
        {order.status === 'payment_verification_pending' && (
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => viewPaymentForOrder(order.id)}
              style={{ width: '100%', padding: '10px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
              💳 View Payment Details
            </button>
          </div>
        )}

        {/* Delivery-partner-collected payment status — Cash or QR at doorstep */}
        {order.delivery_payment_confirmed && (
          <div style={{ marginTop: '12px', background: '#e8fff8', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {order.delivery_payment_proof_url && (
              <img src={order.delivery_payment_proof_url} alt="Payment proof"
                onClick={() => window.open(order.delivery_payment_proof_url, '_blank')}
                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #a7f3d0', cursor: 'pointer', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#00b894' }}>
                ✅ Payment Received {order.delivery_payment_method === 'QR' ? '(via QR)' : '(Cash)'}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                Collected by delivery partner
              </div>
            </div>
          </div>
        )}

        {order.status !== 'delivered' && order.status !== 'cancelled' && order.payment_method === 'COD' && !order.delivery_payment_confirmed && order.status !== 'pending' && (
          <div style={{ marginTop: '12px', background: '#fff8e8', border: '1px solid #ffe0a3', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#B45309', fontWeight: '600' }}>
            ⏳ Waiting for delivery partner to collect payment
          </div>
        )}
      </div>
    ))}
  </div>
)}
          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>Sales Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="#6c63ff" fill="#6c63ff22" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>Top Products</h3>
                  {dashboardData?.top_products?.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0e8', fontSize: '13px' }}>
                      <span style={{ color: '#333', fontWeight: '600' }}>{p.name}</span>
                      <span style={{ color: '#6c63ff', fontWeight: '700' }}>₹{parseFloat(p.total_revenue).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EARNINGS TAB */}
          {activeTab === 'earnings' && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin: '0 0 20px', color: '#1a1a2e' }}>Earnings & Payouts</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Gross Sales (GMV)', value: `₹${f?.gross_gmv?.toFixed(0) || 0}`, color: '#6c63ff' },
                  { label: 'Net Earnings (90%)', value: `₹${f?.net_earnings?.toFixed(0) || 0}`, color: '#00b894' },
                  { label: 'Platform Commission', value: `₹${f?.platform_commission?.toFixed(0) || 0}`, color: '#e17055' },
                  { label: 'Withdrawable Balance', value: `₹${f?.withdrawable?.toFixed(0) || 0}`, color: '#0984e3' },
                  { label: 'Outstanding COD Debt', value: `₹${f?.outstanding_debt?.toFixed(0) || 0}`, color: '#e17055' },
                  { label: 'Current Balance', value: `₹${f?.current_balance?.toFixed(0) || 0}`, color: f?.current_balance >= 0 ? '#00b894' : '#e17055' },
                ].map((e, i) => (
                  <div key={i} style={{ padding: '20px', background: '#fafaf5', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#999' }}>{e.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: e.color, marginTop: '8px' }}>{e.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

           {/* REVIEWS TAB */}
{activeTab === 'reviews' && (
  <SellerReviews />
)}

           {/* BANK DETAILS TAB */}
{activeTab === 'bank' && (
  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
    <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>🏦 Bank Details</h2>
    <p style={{ color: '#999', fontSize: '13px', marginBottom: '24px' }}>Your earnings will be transferred to this account</p>

    {bankSaved && (
      <div style={{ background: '#e8fff8', border: '1px solid #00b894', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#00b894', fontWeight: '600' }}>
        ✅ Bank details saved successfully!
      </div>
    )}

    {bankLocked && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f7ff', border: '1px solid #e8e0ff', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#6c63ff', fontWeight: '600' }}>🔒 Bank details saved & locked</span>
        <button onClick={() => setBankLocked(false)}
          style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
          ✏️ Edit
        </button>
      </div>
    )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {[
        { label: 'Account Holder Name', key: 'account_holder_name', placeholder: 'Full name as per bank' },
        { label: 'Bank Name', key: 'bank_name', placeholder: 'e.g. SBI, HDFC, ICICI' },
        { label: 'Account Number', key: 'account_number', placeholder: bankLocked ? '' : 'Enter account number' },
        { label: 'IFSC Code', key: 'ifsc_code', placeholder: 'e.g. SBIN0001234' },
        { label: 'UPI ID (optional)', key: 'upi_id', placeholder: 'e.g. name@upi' },
      ].map(f => (
        <div key={f.key}>
          <label style={{ fontSize: '13px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{f.label}</label>
          <input
            placeholder={f.placeholder}
            value={
              // While locked, show the masked account number from the server.
              // Once unlocked for editing, clear it so the seller types a fresh
              // real number instead of accidentally re-submitting "XXXX1234".
              f.key === 'account_number' && !bankLocked && bankDetails[f.key]?.startsWith('X')
                ? ''
                : bankDetails[f.key] || ''
            }
            disabled={bankLocked}
            onChange={e => setBankDetails({ ...bankDetails, [f.key]: e.target.value })}
            style={{
              width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px',
              fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              background: bankLocked ? '#f5f5f0' : 'white', color: bankLocked ? '#888' : '#1a1a2e',
              cursor: bankLocked ? 'not-allowed' : 'text',
            }} />
        </div>
      ))}

      <div>
        <label style={{ fontSize: '13px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Account Type</label>
        <select value={bankDetails.account_type || 'savings'}
          disabled={bankLocked}
          onChange={e => setBankDetails({ ...bankDetails, account_type: e.target.value })}
          style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: bankLocked ? '#f5f5f0' : 'white', color: bankLocked ? '#888' : '#1a1a2e', cursor: bankLocked ? 'not-allowed' : 'pointer' }}>
          <option value="savings">Savings Account</option>
          <option value="current">Current Account</option>
        </select>
      </div>
    </div>

    {/* Payment QR Code — temporary QR-based payment system */}
    <div style={{ marginTop: '24px', background: '#fff8e8', borderRadius: '12px', padding: '20px', border: '1px solid #ffe0a3' }}>
      <h4 style={{ margin: '0 0 6px', color: '#B45309' }}>📷 Payment QR Code</h4>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>
        Buyers will scan this QR code (or use your UPI ID above) to pay you directly for online orders, until Razorpay is fully live.
      </p>

      {qrCodeUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={qrCodeUrl} alt="Payment QR" style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e8e8e0', background: 'white' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: qrUploading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>
              {qrUploading ? 'Uploading...' : '🔄 Change QR Code'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={qrUploading}
                onChange={(e) => { const file = e.target.files[0]; if (file) uploadQrCode(file); e.target.value = ''; }} />
            </label>
            <button onClick={deleteQrCode}
              style={{ background: '#fff0f0', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              🗑️ Delete QR Code
            </button>
          </div>
        </div>
      ) : (
        <label style={{ display: 'block', padding: '24px', border: '2px dashed #B45309', borderRadius: '10px', textAlign: 'center', cursor: qrUploading ? 'not-allowed' : 'pointer', background: 'white', color: '#B45309', fontWeight: '600', fontSize: '13px' }}>
          {qrUploading ? '⏳ Uploading...' : '📁 Upload your UPI QR code image'}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={qrUploading}
            onChange={(e) => { const file = e.target.files[0]; if (file) uploadQrCode(file); e.target.value = ''; }} />
        </label>
      )}
    </div>

    {/* Commission Info */}
    <div style={{ marginTop: '24px', background: '#f8f7ff', borderRadius: '12px', padding: '16px', border: '1px solid #e8e0ff' }}>
      <h4 style={{ margin: '0 0 12px', color: '#6c63ff' }}>💡 How Payouts Work</h4>
      <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
        <div>• Platform takes <strong>10% commission</strong> on every order</div>
        <div>• You receive <strong>90% of order value</strong></div>
        <div>• Online payments: credited within <strong>2-3 business days</strong></div>
        <div>• COD orders: 10% commission deducted from future payouts</div>
        <div>• Minimum payout: <strong>₹100</strong></div>
      </div>
    </div>

    {!bankLocked && (
  <button onClick={saveBankDetails} disabled={bankLoading}
    style={{ marginTop: '20px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 40px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', opacity: bankLoading ? 0.7 : 1 }}>
    {bankLoading ? 'Saving...' : '💾 Save Bank Details'}
  </button>
)}
  </div>
)}

          {/* PENDING PAYMENT VERIFICATIONS TAB — temporary QR-based payment system */}
          {activeTab === 'paymentVerifications' && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, color: '#1a1a2e' }}>💳 Pending Payment Verifications</h2>
                <button onClick={fetchPendingVerifications}
                  style={{ background: '#6c63ff15', color: '#6c63ff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>
                  🔄 Refresh
                </button>
              </div>
              <p style={{ color: '#999', fontSize: '13px', marginBottom: '24px' }}>
                Review each buyer's payment screenshot before approving. Approving confirms the order; rejecting lets the buyer retry.
              </p>

              {verificationsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading...</div>
              ) : pendingVerifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <p>No payment verifications waiting right now.</p>
                </div>
              ) : pendingVerifications.map(v => (
                <div key={v.id} style={{ padding: '18px', border: '1px solid #f0f0e8', borderRadius: '12px', marginBottom: '14px', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                  <img src={v.screenshot_url} alt="Payment screenshot"
                    onClick={() => window.open(v.screenshot_url, '_blank')}
                    style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e8e8e0', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontWeight: '700', color: '#6c63ff', fontSize: '15px' }}>#{v.order_id.slice(-6).toUpperCase()}</div>
                    <div style={{ color: '#333', fontSize: '13px', marginTop: '4px' }}>👤 {v.buyer_name} {v.buyer_phone ? `• ${v.buyer_phone}` : ''}</div>
                    <div style={{ color: '#1a1a2e', fontWeight: '700', fontSize: '18px', marginTop: '6px' }}>₹{v.total_amount}</div>
                    {v.transaction_id && (
                      <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>Transaction ID: {v.transaction_id}</div>
                    )}
                    <div style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>
                      Order placed: {new Date(v.order_time).toLocaleString()} • Submitted: {new Date(v.submitted_at).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <button onClick={() => approvePaymentVerification(v.id)}
                        style={{ flex: 1, padding: '10px', background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                        ✅ Approve Payment
                      </button>
                      <button onClick={() => rejectPaymentVerification(v.id)}
                        style={{ flex: 1, padding: '10px', background: '#ff444415', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                        ❌ Reject Payment
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* RETURNS TAB */}
          {activeTab === 'returns' && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1a1a2e' }}>↩ Return Requests</h2>
                <button onClick={fetchSellerReturns}
                  style={{ background: '#6c63ff15', color: '#6c63ff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>
                  🔄 Refresh
                </button>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['pending', 'accepted', 'completed'].map(t => {
                  const labels = { pending: '⏳ Pending', accepted: '✅ Accepted', completed: '🎉 Completed' };
                  const counts = {
                    pending: sellerReturns.filter(r => r.status === 'return_requested').length,
                    accepted: sellerReturns.filter(r => ['return_accepted', 'return_pickup_assigned', 'return_picked_up', 'return_in_transit'].includes(r.status)).length,
                    completed: sellerReturns.filter(r => ['return_delivered_to_seller', 'return_completed', 'return_rejected'].includes(r.status)).length,
                  };
                  return (
                    <button key={t} onClick={() => setReturnsSubTab(t)}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                        background: returnsSubTab === t ? '#6c63ff' : '#f0f0e8',
                        color: returnsSubTab === t ? 'white' : '#666',
                      }}>
                      {labels[t]} {counts[t] > 0 && <span style={{ background: returnsSubTab === t ? 'rgba(255,255,255,0.3)' : '#6c63ff', color: returnsSubTab === t ? 'white' : 'white', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', marginLeft: '4px' }}>{counts[t]}</span>}
                    </button>
                  );
                })}
              </div>

              {returnsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading returns...</div>
              ) : (() => {
                const filtered = sellerReturns.filter(r => {
                  if (returnsSubTab === 'pending') return r.status === 'return_requested';
                  if (returnsSubTab === 'accepted') return ['return_accepted', 'return_pickup_assigned', 'return_picked_up', 'return_in_transit'].includes(r.status);
                  return ['return_delivered_to_seller', 'return_completed', 'return_rejected'].includes(r.status);
                });

                if (filtered.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>↩</div>
                    <p>No {returnsSubTab} returns.</p>
                  </div>
                );

                const statusBadge = (status) => {
                  const map = {
                    return_requested: { bg: '#FEF3C7', color: '#92400E', label: '⏳ Requested' },
                    return_accepted: { bg: '#DBEAFE', color: '#1E40AF', label: '✅ Accepted' },
                    return_pickup_assigned: { bg: '#EDE9FE', color: '#5B21B6', label: '🛵 Pickup Pending' },
                    return_picked_up: { bg: '#D1FAE5', color: '#065F46', label: '📦 Picked Up' },
                    return_in_transit: { bg: '#DBEAFE', color: '#1E40AF', label: '🚚 In Transit' },
                    return_delivered_to_seller: { bg: '#FEF3C7', color: '#92400E', label: '📬 Arrived — Confirm?' },
                    return_completed: { bg: '#D1FAE5', color: '#065F46', label: '🎉 Completed' },
                    return_rejected: { bg: '#FEE2E2', color: '#991B1B', label: '❌ Rejected' },
                  };
                  const b = map[status] || { bg: '#f0f0e8', color: '#666', label: status };
                  return <span style={{ background: b.bg, color: b.color, borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}>{b.label}</span>;
                };

                return filtered.map(ret => (
                  <div key={ret.id} style={{ padding: '18px', border: '1px solid #f0f0e8', borderRadius: '14px', marginBottom: '14px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#6c63ff', fontSize: '14px' }}>Return #{ret.id.slice(-6).toUpperCase()}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Order #{ret.order_id.slice(-6).toUpperCase()} · {new Date(ret.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      {statusBadge(ret.status)}
                    </div>

                    {/* Buyer info */}
                    <div style={{ background: '#f8f8f0', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6c63ff', marginBottom: '6px', textTransform: 'uppercase' }}>Buyer</div>
                      <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>👤 {ret.buyer_name}</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>📍 {ret.delivery_address}</div>
                    </div>

                    {/* Reason */}
                    <div style={{ background: '#fff8e8', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#B45309', marginBottom: '4px', textTransform: 'uppercase' }}>Reason for Return</div>
                      <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>💬 {ret.reason}</div>
                      {ret.notes && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Notes: {ret.notes}</div>}
                      {ret.refund_or_replacement && ret.refund_or_replacement !== 'pending' && (
                        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '600', color: '#6c63ff' }}>
                          Resolution: {ret.refund_or_replacement === 'refund' ? '💰 Refund' : '🔄 Replacement'}
                        </div>
                      )}
                    </div>

                    {/* Photo if present */}
                    {ret.photo_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <img src={ret.photo_url} alt="Return photo"
                          onClick={() => window.open(ret.photo_url, '_blank')}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e8e8e0', cursor: 'pointer' }} />
                      </div>
                    )}

                    {/* Action buttons */}
                    {ret.status === 'return_requested' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleAcceptReturn(ret.id, 'refund')}
                          style={{ flex: 1, padding: '10px', background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                          ✅ Accept (Refund)
                        </button>
                        <button onClick={() => handleAcceptReturn(ret.id, 'replacement')}
                          style={{ flex: 1, padding: '10px', background: '#DBEAFE', color: '#1E40AF', border: '1px solid #93C5FD', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                          🔄 Accept (Replace)
                        </button>
                        <button onClick={() => handleRejectReturn(ret.id)}
                          style={{ padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                          ❌
                        </button>
                      </div>
                    )}

                    {ret.status === 'return_delivered_to_seller' && (
                      <button onClick={() => handleConfirmReturn(ret.id)}
                        style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                        ✅ Confirm Receipt & Complete Return
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}

          {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
    <h2 style={{ margin: '0 0 24px', color: '#1a1a2e' }}>Shop Settings</h2>

    {shopSaved && (
      <div style={{ background: '#e8fff8', border: '1px solid #00b894', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#00b894', fontWeight: '600' }}>
        ✅ Shop settings saved!
      </div>
    )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {[
        { label: 'Shop Name', key: 'shop_name', placeholder: 'Enter shop name' },
        { label: 'Contact Phone', key: 'contact_phone', placeholder: 'Enter phone' },
        { label: 'Address', key: 'address', placeholder: 'Enter address' },
        { label: 'Locality', key: 'locality', placeholder: 'Enter locality/area' },
      ].map((f) => (
        <div key={f.key}>
          <label style={{ fontSize: '13px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{f.label}</label>
          <input placeholder={f.placeholder} value={shopSettings[f.key]}
            onChange={e => setShopSettings({ ...shopSettings, [f.key]: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e8e8e0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      ))}
    </div>

    <button onClick={async () => {
      try {
        await API.patch('/sellers/me', shopSettings);
        setShopSaved(true);
        setTimeout(() => setShopSaved(false), 3000);
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to save', 'error');
      }
    }}
      style={{ marginTop: '20px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
      💾 Save Settings
    </button>

    <button onClick={() => requestAndSaveShopLocation(false)}
      style={{ marginTop: '16px', marginLeft: '12px', background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600' }}>
      📍 {shopHasLocation ? 'Update Shop Location' : 'Set Shop Location'}
    </button>
  </div>
)}

{/* TERMS & CONDITIONS TAB */}
{activeTab === 'terms' && (
  <TermsAndConditions onBack={() => setActiveTab('dashboard')} />
)}

        </div>
      </div>

      {/* Payment Details Modal — opened from the blue button in Orders tab */}
      {selectedVerification && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={() => setSelectedVerification(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>💳 Payment Details</h3>
              <button onClick={() => setSelectedVerification(null)}
                style={{ background: '#f0f0e8', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <img src={selectedVerification.screenshot_url} alt="Payment screenshot"
              onClick={() => window.open(selectedVerification.screenshot_url, '_blank')}
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e8e8e0', cursor: 'pointer', marginBottom: '16px' }} />

            <div style={{ fontSize: '13px', color: '#333', marginBottom: '4px' }}>👤 {selectedVerification.buyer_name} {selectedVerification.buyer_phone ? `• ${selectedVerification.buyer_phone}` : ''}</div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: '#1a1a2e', marginBottom: '8px' }}>₹{selectedVerification.total_amount}</div>
            {selectedVerification.transaction_id && (
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Transaction ID: {selectedVerification.transaction_id}</div>
            )}
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '20px' }}>
              Submitted: {new Date(selectedVerification.submitted_at).toLocaleString()}
            </div>

           <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => { await approvePaymentVerification(selectedVerification.id); setSelectedVerification(null); }}
                style={{ flex: 1, padding: '12px', background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                ✅ Approve Payment
              </button>
              <button onClick={async () => { await rejectPaymentVerification(selectedVerification.id); setSelectedVerification(null); }}
                style={{ flex: 1, padding: '12px', background: '#ff444415', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                ❌ Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={closeEditModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>✏️ Edit Product</h3>
              <button onClick={closeEditModal}
                style={{ background: '#f0f0e8', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Product Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '11px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Price (₹)</label>
                <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                  style={{ width: '100%', padding: '11px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Stock Quantity</label>
                <input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })}
                  style={{ width: '100%', padding: '11px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: '100%', padding: '11px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', height: '70px', resize: 'none' }} />
              </div>
            </div>

            {/* Images */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>Product Photos</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(editForm.image_urls || []).map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #e8e8e0' }} />
                    <button onClick={() => setEditForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, idx) => idx !== i) }))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  </div>
                ))}
                {(editForm.image_urls || []).length < 5 && (
                  <label style={{
                    width: '70px', height: '70px', border: '2px dashed #6c63ff', borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: editUploadingImage ? 'not-allowed' : 'pointer', color: '#6c63ff', background: '#f8f7ff',
                  }}>
                    {editUploadingImage ? <span style={{ fontSize: '18px' }}>⏳</span> : <span style={{ fontSize: '22px' }}>📷</span>}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={editUploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setEditUploadingImage(true);
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          const res = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                          setEditForm(prev => ({ ...prev, image_urls: [...(prev.image_urls || []), res.data.url] }));
                        } catch (err) {
                          showToast('Upload failed', 'error');
                        } finally {
                          setEditUploadingImage(false);
                          e.target.value = '';
                        }
                      }} />
                  </label>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeEditModal}
                style={{ flex: 1, padding: '12px', background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
              <button onClick={saveEditedProduct} disabled={editSaving}
                style={{ flex: 2, padding: '12px', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color + Size Variant Manager Modal */}
      {colorVariantProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={closeColorVariantModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>🎨 Color & Size Variants</h3>
              <button onClick={closeColorVariantModal}
                style={{ background: '#f0f0e8', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>{colorVariantProduct.name}</p>

            {colorVariantLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
            ) : (
              <>
                {/* Existing colors */}
                {colorVariantList.map(color => (
                  <div key={color.id} style={{ border: '1px solid #f0f0e8', borderRadius: '12px', padding: '16px', marginBottom: '16px', background: '#fafaf5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(color.images || []).slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e8e8e0' }} />
                          ))}
                        </div>
                        <span style={{ fontWeight: '700', color: '#1a1a2e', fontSize: '14px' }}>{color.color_name}</span>
                      </div>
                      <button onClick={() => deleteColorVariant(color.id)}
                        style={{ background: '#fff0f0', color: '#ff4444', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                        🗑️ Delete Color
                      </button>
                    </div>

                    {/* Sizes table */}
                    {(color.sizes || []).length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f0f0e8' }}>
                            {['Size', 'Stock', 'Price (₹)', 'Status', ''].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999', fontWeight: '600' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {color.sizes.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f0f0e8' }}>
                              <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: '700' }}>{s.size}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <input type="number" defaultValue={s.stock}
                                  onBlur={e => updateSizeStock(color.id, s.id, e.target.value)}
                                  style={{ width: '70px', padding: '5px 8px', border: '1px solid #e8e8e0', borderRadius: '6px', fontSize: '13px' }} />
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: '13px', color: '#666' }}>{s.price ?? colorVariantProduct.price}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: s.stock > 0 ? '#e8fff8' : '#fff0f0', color: s.stock > 0 ? '#00b894' : '#e17055' }}>
                                  {s.stock > 0 ? 'Available' : 'Out of Stock'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <button onClick={() => deleteSizeFromColor(color.id, s.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Add size row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input placeholder="Size (e.g. M)" value={newSizeInputs[color.id]?.size || ''}
                        onChange={e => setNewSizeInputs(prev => ({ ...prev, [color.id]: { ...prev[color.id], size: e.target.value } }))}
                        style={{ width: '90px', padding: '8px 10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px' }} />
                      <input type="number" placeholder="Stock" value={newSizeInputs[color.id]?.stock || ''}
                        onChange={e => setNewSizeInputs(prev => ({ ...prev, [color.id]: { ...prev[color.id], stock: e.target.value } }))}
                        style={{ width: '80px', padding: '8px 10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px' }} />
                      <input type="number" placeholder="Price (optional)" value={newSizeInputs[color.id]?.price || ''}
                        onChange={e => setNewSizeInputs(prev => ({ ...prev, [color.id]: { ...prev[color.id], price: e.target.value } }))}
                        style={{ width: '120px', padding: '8px 10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px' }} />
                      <button onClick={() => addSizeToColor(color.id)} disabled={addingSizeFor === color.id}
                        style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
                        {addingSizeFor === color.id ? '...' : '+ Add Size'}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new color */}
                <div style={{ border: '2px dashed #6c63ff', borderRadius: '12px', padding: '18px', background: '#f8f7ff' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#6c63ff', fontSize: '14px' }}>+ Add New Color</h4>
                  <input placeholder="Color name (e.g. Beige)" value={newColorName}
                    onChange={e => setNewColorName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }} />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {newColorImages.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #e8e8e0' }} />
                        <button onClick={() => setNewColorImages(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                      </div>
                    ))}
                    {newColorImages.length < 6 && (
                      <label style={{
                        width: '64px', height: '64px', border: '2px dashed #6c63ff', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: colorImageUploading ? 'not-allowed' : 'pointer', color: '#6c63ff', background: 'white',
                      }}>
                        {colorImageUploading ? <span style={{ fontSize: '18px' }}>⏳</span> : <span style={{ fontSize: '22px' }}>📷</span>}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={colorImageUploading}
                          onChange={(e) => { const file = e.target.files[0]; if (file) uploadColorImage(file); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>

                  <button onClick={addColorVariant} disabled={addingColor}
                    style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', opacity: addingColor ? 0.7 : 1 }}>
                    {addingColor ? 'Adding...' : '+ Add Color'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}