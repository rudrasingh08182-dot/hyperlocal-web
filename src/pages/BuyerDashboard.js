import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import TermsAndConditions from '../components/TermsAndConditions';
import { Toast, showToast } from '../components/Toast';
import { registerFCMToken, onForegroundMessage } from '../services/fcmToken';

import HeroBannerCarousel from '../components/HeroBannerCarousel';
import UnserviceableModal from '../components/UnserviceableModal';
import OfflinePage from '../components/OfflinePage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 
  // Generates a Zaplo-branded receipt PDF for a delivered order
const generateReceiptPDF = (order) => {
  const doc = new jsPDF();
  const NAVY = [27, 58, 92];
  const LIGHT = [234, 241, 248];

  // Header
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('ZAPLO', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Hyperlocal Commerce', 14, 26);

  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', 196, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Receipt #: ${order.id.slice(-8).toUpperCase()}`, 196, 27, { align: 'right' });
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 196, 32, { align: 'right' });

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Sold By (shop)
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLD BY', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  doc.text(order.shop_name || '-', 14, 54);
  doc.setTextColor(100);
  doc.text(order.shop_address || '', 14, 59);
  if (order.shop_phone) doc.text(`Ph: ${order.shop_phone}`, 14, 64);

  // Delivered To (buyer)
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERED TO', 120, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  const addrLines = doc.splitTextToSize(order.delivery_address || '-', 70);
  doc.text(addrLines, 120, 54);
  let yAfterAddr = 54 + (addrLines.length * 5);
  doc.setTextColor(100);
  if (order.delivery_phone) { doc.text(`Ph: ${order.delivery_phone}`, 120, yAfterAddr); yAfterAddr += 5; }

  // Items table
  const startY = Math.max(75, yAfterAddr + 8);
  const rows = (order.items || []).map(i => [
    i.quantity,
    i.variant_value ? `${i.name} (${i.variant_value})` : i.name,
    `Rs.${parseFloat(i.unit_price).toFixed(2)}`,
    `Rs.${(i.unit_price * i.quantity).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY,
    head: [['QTY', 'Description', 'Unit Price', 'Amount']],
    body: rows,
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 } },
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  // Totals
  const totalsX = 130;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', totalsX, finalY);
  doc.text(`Rs.${parseFloat(order.total_amount).toFixed(2)}`, 196, finalY, { align: 'right' });
  finalY += 6;
  doc.text('Delivery Charge', totalsX, finalY);
  doc.text(`Rs.${parseFloat(order.delivery_charge || 0).toFixed(2)}`, 196, finalY, { align: 'right' });
  finalY += 4;
  doc.setDrawColor(200);
  doc.line(totalsX, finalY, 196, finalY);
  finalY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text('Total', totalsX, finalY);
  doc.text(`Rs.${(parseFloat(order.total_amount) + parseFloat(order.delivery_charge || 0)).toFixed(2)}`, 196, finalY, { align: 'right' });

  // Notes
  finalY += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Payment Method: ' + (order.payment_method || '-'), 14, finalY);
  finalY += 10;
  doc.setFillColor(...LIGHT);
  doc.rect(14, finalY, 182, 20, 'F');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for shopping with Zaplo!', 20, finalY + 12);

  // Zaplo signature
  finalY += 36;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('Zaplo', 196, finalY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Verified & Issued by Zaplo Platform', 196, finalY + 5, { align: 'right' });

  doc.save(`Zaplo_Receipt_${order.id.slice(-8).toUpperCase()}.pdf`);
};

const ReceiptModal = ({ order, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,39,0.6)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto', fontFamily: T.font }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #EBEBEB' }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: '#1B3A5C' }}>Receipt</div>
        <button onClick={onClose} style={{ background: '#F5F6F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px' }}>✕</button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '20px', color: '#1B3A5C', letterSpacing: '0.02em' }}>ZAPLO</div>
            <div style={{ fontSize: '11px', color: '#999' }}>Hyperlocal Commerce</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#1B3A5C' }}>RECEIPT</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>#{order.id.slice(-8).toUpperCase()}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{new Date(order.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ borderTop: '2px solid #1B3A5C', marginBottom: '16px' }} />

        {/* Sold By / Delivered To */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#1B3A5C', letterSpacing: '0.05em', marginBottom: '6px' }}>SOLD BY</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>{order.shop_name}</div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{order.shop_address}</div>
            {order.shop_phone && <div style={{ fontSize: '12px', color: '#777' }}>Ph: {order.shop_phone}</div>}
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#1B3A5C', letterSpacing: '0.05em', marginBottom: '6px' }}>DELIVERED TO</div>
            <div style={{ fontSize: '12px', color: '#1a1a2e' }}>{order.delivery_address}</div>
            {order.delivery_phone && <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>Ph: {order.delivery_phone}</div>}
          </div>
        </div>

        {/* Items table */}
        <div style={{ border: '1px solid #EBEBEB', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px', background: '#1B3A5C', color: 'white', padding: '8px 10px', fontSize: '11px', fontWeight: 700 }}>
            <span>QTY</span><span>Description</span><span style={{ textAlign: 'right' }}>Price</span><span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px', padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #F0F0F0', color: '#333' }}>
              <span>{item.quantity}</span>
              <span>{item.name}{item.variant_value ? ` (${item.variant_value})` : ''}</span>
              <span style={{ textAlign: 'right' }}>₹{parseFloat(item.unit_price).toFixed(2)}</span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginLeft: 'auto', width: '60%', minWidth: '200px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', padding: '4px 0' }}>
            <span>Subtotal</span><span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', padding: '4px 0', borderBottom: '1px solid #EBEBEB' }}>
            <span>Delivery Charge</span><span>₹{parseFloat(order.delivery_charge || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#1B3A5C', padding: '8px 0' }}>
            <span>Total</span><span>₹{(parseFloat(order.total_amount) + parseFloat(order.delivery_charge || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>Payment Method: {order.payment_method}</div>
        <div style={{ background: '#EAF1F8', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '12px', color: '#1B3A5C', fontStyle: 'italic' }}>
          Thank you for shopping with Zaplo!
        </div>

        {/* Zaplo Signature */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'cursive', fontSize: '22px', fontWeight: 700, color: '#1B3A5C', fontStyle: 'italic' }}>Zaplo</div>
          <div style={{ fontSize: '10px', color: '#999' }}>Verified & Issued by Zaplo Platform</div>
        </div>

        <motion.button {...btnTap} onClick={() => generateReceiptPDF(order)}
          style={{ width: '100%', padding: '14px', background: '#1B3A5C', color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>
          ⬇ Download PDF
        </motion.button>
      </div>
    </motion.div>
  </div>
);

/* ─── ReturnRequestModal ───────────────────────────────────────────────────
   Bottom-sheet: buyer picks a reason, optionally attaches a photo, submits.
   Props mirror the state/handlers already set up in BuyerDashboard.
   ─────────────────────────────────────────────────────────────────────────── */
const RETURN_REASONS = [
  'Item damaged / broken on arrival',
  'Wrong item delivered',
  'Item not as described',
  'Missing items / incomplete order',
  'Item expired or near expiry',
  'Changed my mind',
  'Other',
];

function ReturnRequestModal({
  order,
  onClose,
  returnReason, setReturnReason,
  returnPhotoFile, setReturnPhotoFile,
  returnPhotoPreview, setReturnPhotoPreview,
  returnPhotoUploading, setReturnPhotoUploading,
  returnSubmitting,
  onSubmit,
}) {
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReturnPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setReturnPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
      background: 'rgba(17,17,39,0.55)', zIndex: 350,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(3px)', fontFamily: T.font,
    }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22 }}
        style={{
          background: T.card, borderRadius: '24px 24px 0 0',
          padding: '18px 18px 32px', width: '100%',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', background: T.borderStrong, borderRadius: '999px', margin: '0 auto 18px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, color: T.text, fontSize: '17px', fontWeight: '800' }}>↩ Request a Return</h3>
            <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>
              Order #{order.id?.slice(-6).toUpperCase()}
            </div>
          </div>
          <motion.button {...btnTap} onClick={onClose}
            style={{ background: T.bg, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', color: T.text }}>
            ✕
          </motion.button>
        </div>

        {/* Return policy notice */}
        <div style={{ background: T.accentTint, borderRadius: T.radiusMd, padding: '12px 14px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: '12px', color: '#5B21B6', lineHeight: '1.6' }}>
            Returns are accepted within <strong>7 days</strong> of delivery. The seller will review your request and arrange a pickup if approved.
          </div>
        </div>

        {/* Reason selector */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: T.text, marginBottom: '8px' }}>
            Reason for return <span style={{ color: T.error }}>*</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RETURN_REASONS.map((reason) => (
              <label key={reason} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 14px',
                background: returnReason === reason ? T.errorTint : T.bg,
                border: `1.5px solid ${returnReason === reason ? T.error : T.border}`,
                borderRadius: T.radiusSm, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <input
                  type="radio"
                  name="return-reason"
                  value={reason}
                  checked={returnReason === reason}
                  onChange={() => setReturnReason(reason)}
                  style={{ accentColor: T.error, width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: returnReason === reason ? '700' : '500', color: returnReason === reason ? T.error : T.text }}>
                  {reason}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional photo upload */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: T.text, marginBottom: '8px' }}>
            📷 Attach photo <span style={{ fontWeight: '400', color: T.textSoft }}>(optional — helps speed up approval)</span>
          </div>

          {returnPhotoPreview ? (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={returnPhotoPreview} alt="Return" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} />
              <button onClick={() => { setReturnPhotoFile(null); setReturnPhotoPreview(null); }}
                style={{ position: 'absolute', top: '8px', right: '8px', background: T.error, color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          ) : (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '22px 16px',
              border: `1.5px dashed ${T.primary}`,
              borderRadius: T.radiusMd, cursor: 'pointer',
              background: T.primaryTint, color: T.primary,
              fontWeight: '700', fontSize: '13px',
            }}>
              📷 Tap to attach a photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
        </div>

        {/* Submit button */}
        <motion.button
          {...btnTap}
          onClick={onSubmit}
          disabled={returnSubmitting || !returnReason}
          style={{
            width: '100%', padding: '15px',
            background: returnSubmitting || !returnReason ? T.textFaint : T.error,
            color: 'white', border: 'none', borderRadius: T.radiusSm,
            fontWeight: '800', fontSize: '14px', cursor: returnSubmitting || !returnReason ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {returnSubmitting ? 'Submitting…' : '↩ Submit Return Request'}
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ─── ReturnStatusTracker ──────────────────────────────────────────────────
   Bottom-sheet: polls GET /returns/:id and shows a step-by-step timeline
   mirroring the OrderTracking pattern.
   ─────────────────────────────────────────────────────────────────────────── */
const RETURN_STEPS = [
  { key: 'return_requested',          label: 'Return requested',       icon: '📝' },
  { key: 'return_accepted',           label: 'Accepted by seller',     icon: '✅' },
  { key: 'return_pickup_assigned',    label: 'Pickup assigned',        icon: '🛵' },
  { key: 'return_picked_up',          label: 'Picked up from you',     icon: '📦' },
  { key: 'return_in_transit',         label: 'In transit to seller',   icon: '🚀' },
  { key: 'return_delivered_to_seller',label: 'Delivered to seller',    icon: '🏪' },
  { key: 'return_completed',          label: 'Return completed',       icon: '🎉' },
];

function ReturnStatusTracker({ returnId, onClose }) {
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReturn = async () => {
    try {
      const res = await API.get(`/returns/${returnId}`);
      setReturnData(res.data);
    } catch (err) {
      console.error('Return fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
    const interval = setInterval(fetchReturn, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  const currentStatus = returnData?.status || 'return_requested';
  const currentStepIdx = RETURN_STEPS.findIndex(s => s.key === currentStatus);
  const isRejected = currentStatus === 'return_rejected';

  const statusLabelMap = {
    return_requested:           { text: 'Pending seller review', color: '#92400E', bg: '#FEF3C7' },
    return_accepted:            { text: 'Accepted — Pickup being arranged', color: '#1E40AF', bg: '#DBEAFE' },
    return_pickup_assigned:     { text: 'Pickup partner assigned', color: '#5B21B6', bg: '#EDE9FE' },
    return_picked_up:           { text: 'Picked up from you', color: '#065F46', bg: '#D1FAE5' },
    return_in_transit:          { text: 'On the way to seller', color: '#1E40AF', bg: '#DBEAFE' },
    return_delivered_to_seller: { text: 'Delivered to seller — Awaiting confirmation', color: '#92400E', bg: '#FEF3C7' },
    return_completed:           { text: 'Return complete! Refund/replacement in progress', color: '#065F46', bg: '#D1FAE5' },
    return_rejected:            { text: 'Return rejected by seller', color: '#991B1B', bg: '#FEE2E2' },
  };

  if (loading) return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(17,17,39,0.55)', zIndex: 350, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)', fontFamily: T.font }}>
      <div style={{ background: T.card, borderRadius: '24px 24px 0 0', padding: '18px 18px 32px', width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: T.textFaint }}>Loading return status…</div>
      </div>
    </div>
  );

  const badge = statusLabelMap[currentStatus] || { text: currentStatus, color: T.textSoft, bg: T.bg };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
      background: 'rgba(17,17,39,0.55)', zIndex: 350,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(3px)', fontFamily: T.font,
    }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22 }}
        style={{
          background: T.card, borderRadius: '24px 24px 0 0',
          padding: '18px 18px 32px', width: '100%',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', background: T.borderStrong, borderRadius: '999px', margin: '0 auto 18px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: T.text, fontSize: '17px', fontWeight: '800' }}>Return Status</h3>
            <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '3px' }}>#{returnId?.slice(-6).toUpperCase()}</div>
          </div>
          <motion.button {...btnTap} onClick={onClose}
            style={{ background: T.bg, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', color: T.text }}>
            ✕
          </motion.button>
        </div>

        {/* Current status banner */}
        <div style={{ background: badge.bg, borderRadius: T.radiusMd, padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{isRejected ? '❌' : '↩'}</span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: badge.color }}>{badge.text}</div>
        </div>

        {/* Rejection note */}
        {isRejected && returnData?.notes && (
          <div style={{ background: T.errorTint, borderRadius: T.radiusMd, padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: T.error, marginBottom: '4px' }}>Seller's note</div>
            <div style={{ fontSize: '13px', color: T.text }}>{returnData.notes}</div>
          </div>
        )}

        {/* Step timeline — hidden if rejected */}
        {!isRejected && (
          <div style={{ marginBottom: '20px' }}>
            {RETURN_STEPS.map((step, idx) => {
              const isDone    = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isCurrent ? T.error : isDone ? T.errorTint : T.bg,
                      border: isCurrent ? `2px solid ${T.error}` : isDone ? `2px solid ${T.error}` : `2px solid ${T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', flexShrink: 0,
                      color: isCurrent ? 'white' : T.error, fontWeight: '700',
                      boxShadow: isCurrent ? `0 0 0 4px ${T.errorTint}` : 'none',
                    }}>
                      {isDone ? '✓' : ''}
                    </div>
                    {idx < RETURN_STEPS.length - 1 && (
                      <div style={{ width: '2px', height: '26px', background: idx < currentStepIdx ? T.error : T.border, marginTop: '2px' }} />
                    )}
                  </div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontWeight: isCurrent ? '700' : '500', color: isDone ? T.text : T.textFaint, fontSize: '14px' }}>
                      {step.icon} {step.label}
                    </div>
                    {isCurrent && (
                      <div style={{ fontSize: '11px', color: T.error, fontWeight: '600', marginTop: '2px' }}>● Current status</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refund / replacement info */}
        {returnData?.refund_or_replacement && returnData.refund_or_replacement !== 'pending' && (
          <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '20px' }}>{returnData.refund_or_replacement === 'refund' ? '💰' : '🔄'}</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: T.primary }}>
                {returnData.refund_or_replacement === 'refund' ? 'Refund approved' : 'Replacement approved'}
              </div>
              <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>
                {returnData.refund_or_replacement === 'refund'
                  ? 'Refund will be processed after the seller confirms receipt.'
                  : 'Replacement will be shipped after return is confirmed.'}
              </div>
            </div>
          </div>
        )}

        {/* Refresh */}
        <motion.button {...btnTap} onClick={fetchReturn}
          style={{ width: '100%', padding: '13px', background: T.errorTint, color: T.error, border: 'none', borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
          ↻ Refresh
        </motion.button>
      </motion.div>
    </div>
  );
}

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

  const getCartKey = (productId, variantId, colorSizeId) =>
    colorSizeId ? `${productId}::cs::${colorSizeId}` : variantId ? `${productId}::${variantId}` : productId;

  const addToCart = (product, variant = null, colorSize = null) => {
    const cartKey = getCartKey(product.id, variant?.id, colorSize?.id);
    setCart(prev => {
      const exists = prev.find(i => i.cartKey === cartKey);
      if (exists) return prev.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        ...product,
        cartKey,
        variant: variant || null,
        colorSize: colorSize || null,
        price: colorSize ? (colorSize.price ?? product.price) : variant ? variant.price : product.price,
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
  { id: 'beauty', label: 'Beauty & Accessories', emoji: '💄', image: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1788828925/file_000000004c988208a4807c9b029ca233_edkqlz.png' },
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
  BEAUTY_ACCESSORIES: 'Return only if damaged/expired',
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
  const [address, setAddress] = useState(() => {
    try {
      const saved = sessionStorage.getItem('zaplo_checkout_address');
      return saved ? JSON.parse(saved) : { full_address: '', landmark: '', phone: '' };
    } catch {
      return { full_address: '', landmark: '', phone: '' };
    }
  });
  const [paymentMethod, setPaymentMethod] = useState(() => sessionStorage.getItem('zaplo_payment_method') || 'COD');

  useEffect(() => {
    sessionStorage.setItem('zaplo_payment_method', paymentMethod);
  }, [paymentMethod]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchMode, setSearchMode] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  // ---- Returns ----
  const [returnModalOrder, setReturnModalOrder] = useState(null); // order to return
  const [returnTrackerReturnId, setReturnTrackerReturnId] = useState(null); // return id to track
  const [returnReason, setReturnReason] = useState('');
  const [returnPhotoFile, setReturnPhotoFile] = useState(null);
  const [returnPhotoPreview, setReturnPhotoPreview] = useState(null);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnPhotoUploading, setReturnPhotoUploading] = useState(false);
  // myReturnsMap: { [order_id]: returnObject } — drives smart button state per order
  const [myReturnsMap, setMyReturnsMap] = useState({});

  const fetchMyReturns = async () => {
    try {
      const res = await API.get('/returns');
      const map = {};
      (res.data || []).forEach(r => { map[r.order_id] = r; });
      setMyReturnsMap(map);
    } catch (err) {
      console.error('Returns fetch failed:', err);
    }
  };

  const submitReturn = async () => {
    if (!returnReason.trim()) { showToast('Please select a reason', 'error'); return; }
    setReturnSubmitting(true);
    try {
      let photoUrl = null;
      if (returnPhotoFile) {
        const formData = new FormData();
        formData.append('image', returnPhotoFile);
        const uploadRes = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        photoUrl = uploadRes.data.url;
      }
      await API.post('/returns', { order_id: returnModalOrder.id, reason: returnReason, photo_url: photoUrl });
      showToast('↩ Return request submitted!', 'success');
      setReturnModalOrder(null);
      setReturnReason('');
      setReturnPhotoFile(null);
      setReturnPhotoPreview(null);
      // Refresh returns map so the button immediately shows "Pending" state
      fetchMyReturns();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit return', 'error');
    } finally {
      setReturnSubmitting(false);
    }
  };
  const [deliveryCharge, setDeliveryCharge] = useState(20);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('zaplo_saved_addresses') || '[]');
    } catch {
      return [];
    }
  });

  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderingForSelf, setOrderingForSelf] = useState(null); // null=not chosen, true/false
  const [checkoutLat, setCheckoutLat] = useState(null);
  const [checkoutLng, setCheckoutLng] = useState(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [locatingLive, setLocatingLive] = useState(false);
  const [orderFilter, setOrderFilter] = useState('All');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({ label: 'Home', full_address: '', landmark: '', phone: '' });
  const { cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount } = useCart();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [productColors, setProductColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const [showUnserviceable, setShowUnserviceable] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [orderRatings, setOrderRatings] = useState({});
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
    sessionStorage.setItem('zaplo_nav_state', JSON.stringify(newState));
    applyNavState(newState);
  };

  const applyNavStateRefObj = useRef(applyNavState);
  applyNavStateRefObj.current = applyNavState;

  useEffect(() => {
    // Refresh pe last screen restore karo (agar koi saved state hai)
    let initialState = buildNavState();
    try {
      const saved = sessionStorage.getItem('zaplo_nav_state');
      if (saved) initialState = JSON.parse(saved);
    } catch (e) { console.error(e); }

    window.history.replaceState(initialState, '');
    applyNavStateRefObj.current(initialState);

    let exitArmed = false;
    let exitTimer = null;

    const handlePopState = (event) => {
      if (event.state) {
        sessionStorage.setItem('zaplo_nav_state', JSON.stringify(event.state));
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

  // ── FCM Push Notification — token register + foreground listener ──
  useEffect(() => {
    // Permission maango aur token backend mein save karo
    registerFCMToken();

    // Foreground notification (jab app khuli ho) — Toast show karo
    const unsubscribe = onForegroundMessage(({ title, body }) => {
      showToast(`${title} — ${body}`, 'info');
    });

    return () => unsubscribe();
  }, []);

 

  

  // Persist saved addresses across page refreshes/app restarts — previously
  // this only lived in React state and vanished on every reload.
  useEffect(() => {
    localStorage.setItem('zaplo_saved_addresses', JSON.stringify(savedAddresses));
  }, [savedAddresses]);


  useEffect(() => {
    if (checkoutStep === 2 && !showNewAddressForm && savedAddresses.length > 0 && !selectedSavedAddressId) {
      const match = savedAddresses.find(a => a.full_address === address.full_address && a.phone === address.phone);
      if (match) setSelectedSavedAddressId(match.id);
      else selectSavedAddress(savedAddresses[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStep, savedAddresses]);

  useEffect(() => {
    sessionStorage.setItem('zaplo_checkout_address', JSON.stringify(address));
  }, [address]);

  // Recalculate delivery charge whenever cart contents change and we
  // already have the buyer's location (e.g. item added/removed in cart).
  useEffect(() => {
    if (buyerLocation?.lat && buyerLocation?.lng) {
      fetchDeliveryEstimate(buyerLocation.lat, buyerLocation.lng);
    } else if (cart.length > 0) {
      // Location nahi hai — try to get it automatically
      getBuyerLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  useEffect(() => {
    if (selectedProduct?.has_variants && selectedProduct.variants?.length > 0) {
      const firstAvailable = selectedProduct.variants.find(v => v.stock > 0) || selectedProduct.variants[0];
      setSelectedVariant(firstAvailable);
    } else {
      setSelectedVariant(null);
    }

    if (selectedProduct?.has_color_variants) {
      API.get(`/products/${selectedProduct.id}/colors`).then(res => {
        setProductColors(res.data);
        const firstAvailable = res.data.find(c => c.sizes?.some(s => s.stock > 0)) || res.data[0] || null;
        setSelectedColor(firstAvailable);
        setSelectedSize(null);
        setActiveImageIndex(0);
      }).catch(() => { setProductColors([]); setSelectedColor(null); });
    } else {
      setProductColors([]);
      setSelectedColor(null);
      setSelectedSize(null);
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

  const handleImageTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleImageTouchMove = (e) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const handleImageTouchEnd = (imagesLength) => {
    const delta = touchDeltaXRef.current;
    const SWIPE_THRESHOLD = 40; // px
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        // swiped left → next image
        setActiveImageIndex(prev => Math.min(prev + 1, imagesLength - 1));
      } else {
        // swiped right → previous image
        setActiveImageIndex(prev => Math.max(prev - 1, 0));
      }
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

 const [banners, setBanners] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const fetchMyNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setMyNotifications(res.data);
    } catch (err) {
      console.error('Notifications fetch failed:', err);
    }
  };

  const openBuyerNotifPanel = async () => {
    const opening = !showNotifPanel;
    setShowNotifPanel(opening);
    if (opening && myNotifications.some(n => !n.is_read)) {
      try {
        await API.patch('/notifications/mark-all-read');
        setMyNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error('Mark read failed:', err);
      }
    }
  };

  useEffect(() => {
    loadAllProducts();
    fetchBanners();
    fetchMyNotifications();
    const interval = setInterval(fetchMyNotifications, 30000);
    return () => clearInterval(interval);
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
      const [ordersRes] = await Promise.all([
        API.get('/orders/my-orders'),
        fetchMyReturns(),
      ]);
      setMyOrders(ordersRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Sums the real by-road delivery charge across every distinct seller in
  // the cart (in the common case there's just one seller).
  const fetchDeliveryEstimate = async (lat, lng) => {
    if (!lat || !lng || cart.length === 0) return;
    try {
      const sellerIds = [...new Set(cart.map(item => item.seller_id || item.shop_id))].filter(Boolean);
      let totalCharge = 0;
      let unserviceable = false;
      for (const sellerId of sellerIds) {
        const res = await API.get(`/orders/delivery-estimate?seller_id=${sellerId}&buyer_lat=${lat}&buyer_lng=${lng}`);
        if (res.data.serviceable === false) { unserviceable = true; break; }
        totalCharge += res.data.delivery_charge || 20;
      }
      if (unserviceable) {
        showToast('Sorry, hum abhi wahan available nahi hain, lekin jaldi hi aa rahe hain! 🚀', 'error');
        setDeliveryCharge(null);
      } else {
        setDeliveryCharge(totalCharge || 20);
      }
    } catch (err) {
      console.error('Delivery charge estimate failed:', err);
    }
  };

  const searchAddress = async (query) => {
    if (!query || query.trim().length < 3) { setAddressSearchResults([]); return; }
    setAddressSearchLoading(true);
    try {
      const res = await API.get(`/auth/geocode-search?q=${encodeURIComponent(query)}`);
      setAddressSearchResults(res.data);
    } catch (err) {
      console.error('Address search failed:', err);
      setAddressSearchResults([]);
    } finally {
      setAddressSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchAddress(addressSearchQuery), 400);
    return () => clearTimeout(timer);
  }, [addressSearchQuery]);

  const useLiveLocationForSelf = () => {
    setLocatingLive(true);
    if (!navigator.geolocation) {
      showToast('GPS not supported on this device', 'error');
      setLocatingLive(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setCheckoutLat(lat);
        setCheckoutLng(lng);
        try {
          await API.patch('/auth/save-delivery-location', { latitude: lat, longitude: lng, label: 'Home' });
        } catch (err) {
          console.error('Save location failed:', err);
        }
        setLocatingLive(false);
        fetchDeliveryEstimate(lat, lng);
        setOrderingForSelf(true);
        navigate({ checkoutStep: 2 });
      },
      () => {
        showToast('Location access denied. Please enable GPS.', 'error');
        setLocatingLive(false);
      }
    );
  };

  const selectSearchedAddress = (result) => {
    setCheckoutLat(result.lat);
    setCheckoutLng(result.lng);
    setAddress(prev => ({ ...prev, full_address: result.display_name }));
    setOrderingForSelf(false);
    setShowAddressSearch(false);
    fetchDeliveryEstimate(result.lat, result.lng);
    navigate({ checkoutStep: 2 });
  };

  const getBuyerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setBuyerLocation(loc);
          fetchDeliveryEstimate(loc.lat, loc.lng);
        },
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

   const selectSavedAddress = (addr) => {
    setAddress({ full_address: addr.full_address, landmark: addr.landmark, phone: addr.phone });
    setSelectedSavedAddressId(addr.id);
  };

  const proceedToPayment = () => {
    if (!address.full_address || !address.phone) {
      showToast('Please fill address and phone', 'error');
      return;
    }
    if (!selectedSavedAddressId) {
      const alreadySaved = savedAddresses.some(a => a.full_address === address.full_address && a.phone === address.phone);
      if (!alreadySaved) {
        setSavedAddresses(prev => [...prev, { label: 'Home', full_address: address.full_address, landmark: address.landmark, phone: address.phone, id: Date.now() }]);
      }
    }
    navigate({ checkoutStep: 3 });
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
          items: items.map(i => ({ product_id: i.id, quantity: i.qty, variant_id: i.variant?.id || null, color_size_id: i.colorSize?.id || null })),
          payment_method: backendPaymentMethod,
          delivery_address: address.full_address,
          delivery_phone: address.phone,
          delivery_landmark: address.landmark,
          buyer_lat: checkoutLat || buyerLocation?.lat,
          buyer_lng: checkoutLng || buyerLocation?.lng,
          ordering_for_self: orderingForSelf !== false,
        });
        placedOrderIds.push(res.data.order.id || res.data.id);
      }

      if (paymentMethod === 'COD') {
        clearCart();
        sessionStorage.removeItem('zaplo_checkout_address');
        showToast('Order placed successfully! 🎉 Pay cash on delivery.', 'success');
        navigate({ screen: 'orders', checkoutStep: 1 });
        fetchMyOrders();
        return;
      }

      if (paymentMethod === 'ONLINE') {
        clearCart();
        sessionStorage.removeItem('zaplo_checkout_address');
        startQrPayment(placedOrderIds);
      }

    } catch (err) {
      showToast(err.response?.data?.error || 'Order failed', 'error');
    }
  };

  const getCartQty = (productId, variantId = null, colorSizeId = null) => {
    const cartKey = colorSizeId ? `${productId}::cs::${colorSizeId}` : variantId ? `${productId}::${variantId}` : productId;
    const item = cart.find(i => i.cartKey === cartKey);
    return item ? item.qty : 0;
  };

  /* ---------- Blinkit-style Product Card ---------- */
  const ProductCard = ({ product }) => {
    const hasAnyVariants = product.has_variants || product.has_color_variants;
    const qty = hasAnyVariants ? 0 : getCartQty(product.id);
    const minVariantPrice = product.has_variants && product.variants?.length > 0
      ? Math.min(...product.variants.map(v => parseFloat(v.price)))
      : product.has_color_variants && product.colors?.length > 0
        ? Math.min(...product.colors.flatMap(c => (c.sizes || []).map(s => parseFloat(s.price ?? product.price))))
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
              {hasAnyVariants ? `₹${minVariantPrice}+` : `₹${product.price}`}
            </div>

            <div onClick={e => e.stopPropagation()}>
              {sellerClosed ? (
                <span style={{ padding: '7px 14px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '11px', letterSpacing: '0.02em' }}>
                  CLOSED
                </span>
              ) : hasAnyVariants ? (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <motion.div {...btnTap} onClick={openBuyerNotifPanel}
                  style={{ position: 'relative', width: '40px', height: '40px', background: 'rgba(0,0,0,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>
                  🔔
                  {myNotifications.some(n => !n.is_read) && (
                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '9px', height: '9px', borderRadius: '50%', background: T.error, border: '2px solid white' }} />
                  )}
                </motion.div>
                <motion.div {...btnTap} onClick={() => navigate({ screen: 'profile' })}
                  style={{ width: '40px', height: '40px', background: T.text, color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '800', fontSize: '15px' }}>
                  {user.name?.[0]?.toUpperCase() || '👤'}
                </motion.div>
              </div>
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
                      {item.colorSize && (
                        <div style={{ fontSize: '11px', color: T.textSoft, marginTop: '2px' }}>{item.colorSize.color_name} · Size {item.colorSize.size}</div>
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
                    <span style={{ fontWeight: '600' }}>{deliveryCharge != null ? `₹${deliveryCharge}` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${T.border}`, marginTop: '4px' }}>
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>To Pay</span>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: T.text }}>₹{total + (deliveryCharge || 0)}</span>
                  </div>
                   <div style={{ background: T.accentTint, borderRadius: T.radiusSm, padding: '10px 12px', marginTop: '12px', fontSize: '11px', color: '#5B21B6' }}>
                    Delivery: ₹20 upto 3km · ₹30 upto 5km · ₹6/km after. Pay to delivery partner.
                  </div>
                  <motion.button {...btnTap} onClick={() => { setOrderingForSelf(null); navigate({ checkoutStep: 'who' }); }}
                    disabled={user?.serviceable === false}
                    style={{ width: '100%', marginTop: '14px', padding: '15px', background: user?.serviceable === false ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', fontSize: '15px', cursor: user?.serviceable === false ? 'not-allowed' : 'pointer', letterSpacing: '0.02em', opacity: user?.serviceable === false ? 0.6 : 1 }}>
                    {user?.serviceable === false ? 'Service Not Available' : 'PROCEED TO CHECKOUT →'}
                  </motion.button>
                </div>
              </>
            ) : checkoutStep === 'who' ? (
              <div>
                <h3 style={{ margin: '0 0 6px', color: T.text, fontSize: '16px', fontWeight: '800' }}>Yeh order kiske liye hai?</h3>
                <p style={{ color: T.textSoft, fontSize: '12px', marginBottom: '18px' }}>Sahi delivery charge dikhane ke liye zaroori hai</p>

                <motion.div whileTap={{ scale: 0.98 }} onClick={useLiveLocationForSelf}
                  style={{ background: T.card, border: `1.5px solid ${T.primary}`, borderRadius: T.radiusMd, padding: '18px', marginBottom: '12px', cursor: locatingLive ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: T.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: T.text }}>Apne liye</div>
                    <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>{locatingLive ? 'Location le rahe hain...' : 'Live location use karein'}</div>
                  </div>
                  <span style={{ fontSize: '18px', color: T.primary }}>📍</span>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => { setShowAddressSearch(true); setAddressSearchQuery(''); setAddressSearchResults([]); }}
                  style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: T.radiusMd, padding: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🎁</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: T.text }}>Kisi aur ke liye</div>
                    <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '2px' }}>Address search karke chunein</div>
                  </div>
                  <span style={{ fontSize: '18px', color: T.textFaint }}>🔍</span>
                </motion.div>

                <motion.button {...btnTap} onClick={() => window.history.back()}
                  style={{ width: '100%', marginTop: '16px', padding: '13px', background: T.card, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>
                  ← Back
                </motion.button>
              </div>
            ) : checkoutStep === 2 ? (
              <div>
                {!showNewAddressForm && savedAddresses.length > 0 ? (
                  <>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: T.text, marginBottom: '10px' }}>SELECT DELIVERY ADDRESS</div>
                    {savedAddresses.map(addr => (
                      <motion.div whileTap={{ scale: 0.98 }} key={addr.id} onClick={() => selectSavedAddress(addr)}
                        style={{ background: T.card, borderRadius: T.radiusMd, padding: '14px', marginBottom: '10px', border: `2px solid ${selectedSavedAddressId === addr.id ? T.primary : T.border}`, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '800', color: T.primary, fontSize: '11px', background: T.primaryTint, padding: '3px 10px', borderRadius: '6px' }}>
                            {addr.label?.toUpperCase()}
                          </span>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${selectedSavedAddressId === addr.id ? T.primary : T.border}`, background: selectedSavedAddressId === addr.id ? T.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selectedSavedAddressId === addr.id && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: T.text, fontWeight: '600' }}>{addr.full_address}</div>
                        {addr.landmark && <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>Near: {addr.landmark}</div>}
                        <div style={{ fontSize: '12px', color: T.textFaint, marginTop: '2px' }}>{addr.phone}</div>
                      </motion.div>
                    ))}

                    <motion.button {...btnTap} onClick={() => { setShowNewAddressForm(true); setSelectedSavedAddressId(null); setAddress({ full_address: '', landmark: '', phone: '' }); }}
                      style={{ width: '100%', padding: '13px', background: T.primaryTint, color: T.primary, border: `1.5px dashed ${T.primary}`, borderRadius: T.radiusMd, fontWeight: '800', cursor: 'pointer', fontSize: '13px', marginBottom: '14px' }}>
                      + Add new address
                    </motion.button>
                  </>
                ) : (
                  <div style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', border: `1px solid ${T.border}`, marginBottom: '14px' }}>
                    {savedAddresses.length > 0 && (
                      <motion.button {...btnTap} onClick={() => setShowNewAddressForm(false)}
                        style={{ marginBottom: '14px', background: 'none', border: 'none', color: T.primary, fontWeight: '700', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                        ← Choose from saved addresses
                      </motion.button>
                    )}
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
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button {...btnTap} onClick={() => window.history.back()}
                    style={{ flex: 1, padding: '14px', background: T.card, color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontWeight: '700', cursor: 'pointer' }}>← Back</motion.button>
                  <motion.button {...btnTap} onClick={proceedToPayment}
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
        <div style={{ paddingBottom: '104px', background: '#F5F5F5', minHeight: '100vh', fontFamily: T.font }}>
          {/* Clean white header */}
          <div style={{ background: 'white', padding: '14px 16px 16px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <motion.button {...btnTap} onClick={() => window.history.back()}
                style={{ width: '36px', height: '36px', background: 'none', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ←
              </motion.button>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.01em' }}>My Orders</h2>
            </div>

            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: '#F5F5F5', borderRadius: '10px', padding: '0 14px', border: '1px solid #e8e8e8' }}>
                <span style={{ fontSize: '16px', color: '#999' }}>🔍</span>
                <input
                  placeholder="Search your order here"
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '12px 0', fontSize: '14px', color: '#1a1a1a' }}
                />
                {orderSearchQuery && (
                  <button onClick={() => setOrderSearchQuery('')} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                )}
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['All', 'Pending', 'Delivered', 'Cancelled'].map(filter => {
                const isActive = orderFilter === filter;
                return (
                  <motion.button key={filter} whileTap={{ scale: 0.95 }}
                    onClick={() => setOrderFilter(filter)}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '20px',
                      border: isActive ? '1px solid #1a1a1a' : '1px solid #d4d4d4',
                      background: isActive ? '#1a1a1a' : 'white',
                      color: isActive ? 'white' : '#666',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em',
                    }}>
                    {filter}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Orders list */}
          <div style={{ padding: '12px 16px' }}>
            {(() => {
              const filtered = myOrders.filter(order => {
                const q = orderSearchQuery.toLowerCase().trim();
                const matchesSearch = !q ||
                  order.id.toLowerCase().includes(q) ||
                  order.shop_name?.toLowerCase().includes(q) ||
                  order.items?.some(i => i.name.toLowerCase().includes(q));
                const matchesFilter = orderFilter === 'All' ||
                  (orderFilter === 'Pending' && ['pending', 'pending_payment', 'payment_verification_pending'].includes(order.status)) ||
                  (orderFilter === 'Delivered' && order.status === 'delivered') ||
                  (orderFilter === 'Cancelled' && (order.status === 'cancelled' || order.status === 'payment_rejected'));
                return matchesSearch && matchesFilter;
              });

              if (myOrders.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>📭</div>
                    <div style={{ fontWeight: 800, fontSize: '17px', color: '#1a1a1a', marginBottom: '6px' }}>No orders yet</div>
                    <p style={{ color: '#999', marginBottom: '20px', fontSize: '13px' }}>When you place orders, they will appear here</p>
                    <motion.button {...btnTap} onClick={() => navigate({ screen: 'home' })}
                      style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>
                      Start shopping
                    </motion.button>
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔎</div>
                    <p style={{ color: '#999', fontSize: '14px' }}>No orders match your search</p>
                  </div>
                );
              }

              return filtered.map(order => {
                const statusConfig = (() => {
                  if (order.status === 'delivered') return { text: `Delivered on ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, color: '#0C831F', sub: 'Your item has been delivered' };
                  if (order.status === 'cancelled') return { text: `Cancelled on ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, color: '#666', sub: 'This order was cancelled' };
                  if (order.status === 'payment_rejected') return { text: 'Payment Rejected', color: '#E11D48', sub: 'Your payment was not verified' };
                  if (order.status === 'pending_payment') return { text: 'Payment Pending', color: '#7C3AED', sub: 'Complete payment to confirm' };
                  if (order.status === 'payment_verification_pending') return { text: 'Verifying Payment', color: '#D97706', sub: 'Seller is verifying your payment' };
                  return { text: 'Order Pending', color: '#1a1a1a', sub: 'Waiting for seller confirmation' };
                })();

                const firstItem = order.items?.[0];
                const itemNames = order.items?.map(i => i.name).join(', ') || 'Order items';
                const totalItems = order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                const ratingKey = `${order.id}-${firstItem?.product_id}`;
                const currentRating = orderRatings[ratingKey] || 0;

                // Clicking product row opens product detail
                const openProductDetail = () => {
                  if (!firstItem?.product_id) {
                    showToast('Product details not available', 'error');
                    return;
                  }
                  const matched = allProducts.find(p => p.id === firstItem.product_id);
                  if (matched) {
                    navigate({ selectedProduct: matched });
                  } else {
                    showToast('Product no longer available in store', 'error');
                  }
                };

                return (
                  <div key={order.id} style={{ background: 'white', borderRadius: '12px', marginBottom: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                    
                    {/* Main Row — Clickable */}
                    <div 
                      onClick={openProductDetail}
                      style={{ display: 'flex', padding: '16px', gap: '14px', alignItems: 'center', cursor: 'pointer' }}>
                      {/* Product Image */}
                      <div style={{ width: '68px', height: '68px', background: '#f8f8f8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                        {firstItem?.image_url ? (
                          <img src={firstItem.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        ) : (
                          '📦'
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: statusConfig.color, marginBottom: '3px', lineHeight: 1.3 }}>
                          {statusConfig.text}
                        </div>
                        <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {itemNames}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {order.shop_name} {totalItems > 1 ? `· ${totalItems} items` : `· 1 item`} · ₹{order.total_amount}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div style={{ color: '#ccc', fontSize: '22px', fontWeight: 300 }}>›</div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: '#f5f5f5', margin: '0 16px' }} />

                    {/* Bottom Action Area */}
                    <div style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      
                      {/* Delivered: Functional Rate & Review */}
                      {order.status === 'delivered' && firstItem?.product_id && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>Rate & Review</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <motion.span 
                                key={s} 
                                whileTap={{ scale: 1.3 }}
                                onClick={async () => {
                                  try {
                                    await API.post(`/reviews/product/${firstItem.product_id}`, { rating: s, comment: '' });
                                    setOrderRatings(prev => ({ ...prev, [ratingKey]: s }));
                                    showToast('Rating submitted!', 'success');
                                  } catch (err) {
                                    showToast(err.response?.data?.error || 'Failed to submit rating', 'error');
                                  }
                                }}
                                style={{ 
                                  fontSize: '22px', 
                                  color: s <= currentRating ? '#FFB800' : '#e0e0e0', 
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                }}
                              >
                                ★
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {order.status === 'pending_payment' && (
                          <motion.button {...btnTap} onClick={() => startQrPayment([order.id])}
                            style={{ flex: 1, padding: '10px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', letterSpacing: '0.01em' }}>
                            Complete Payment →
                          </motion.button>
                        )}

                        {order.status === 'payment_rejected' && (
                          <motion.button {...btnTap} onClick={() => startQrPayment([order.id])}
                            style={{ flex: 1, padding: '10px', background: '#E11D48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                            Retry Payment
                          </motion.button>
                        )}

                        {order.status === 'payment_verification_pending' && (
                          <div style={{ width: '100%', padding: '10px', textAlign: 'center', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontWeight: 600, fontSize: '12px' }}>
                            ⏳ Waiting for seller to verify payment
                          </div>
                        )}

                        {!['delivered', 'cancelled', 'pending_payment', 'payment_verification_pending', 'payment_rejected'].includes(order.status) && (
                          <motion.button {...btnTap} onClick={() => navigate({ trackingOrderId: order.id })}
                            style={{ flex: 1, padding: '10px', background: '#0C831F', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                            Track order
                          </motion.button>
                        )}

                        {order.status === 'delivered' && (
                          <>
                            <motion.button {...btnTap} onClick={() => navigate({ trackingOrderId: order.id })}
                              style={{ flex: 1, padding: '10px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                              View Details
                            </motion.button>
                            <motion.button {...btnTap} onClick={() => setReceiptOrder(order)}
                              style={{ flex: 1, padding: '10px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                              🧧 Receipt
                            </motion.button>
                            {/* Smart return button — state-aware */}
                            {(() => {
                              if (!order.delivered_at) return null;
                              const deliveredAt = new Date(order.delivered_at);
                              const daysDiff = Math.floor((Date.now() - deliveredAt) / (1000 * 60 * 60 * 24));
                              const ret = myReturnsMap[order.id];

                              // ── Case 1: Return already exists ─────────────────────────
                              if (ret) {
                                // Rejected → show reason chip, no button
                                if (ret.status === 'return_rejected') {
                                  return (
                                    <div style={{ flex: 1, padding: '9px 12px', background: '#FEE2E2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#991B1B', marginBottom: '3px' }}>❌ Return Rejected</div>
                                      {ret.notes && <div style={{ fontSize: '11px', color: '#B91C1C', lineHeight: '1.4' }}>Reason: {ret.notes}</div>}
                                    </div>
                                  );
                                }
                                // Completed → silent, no button (one chance used)
                                if (ret.status === 'return_completed') return null;
                                // Pending seller action → frozen button
                                if (ret.status === 'return_requested') {
                                  return (
                                    <div style={{ flex: 1, padding: '10px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#92400E', cursor: 'not-allowed' }}>
                                      ⏳ Return Pending…
                                    </div>
                                  );
                                }
                                // Active (accepted / in-transit / etc.) → Track button
                                return (
                                  <motion.button {...btnTap} onClick={() => setReturnTrackerReturnId(ret.id)}
                                    style={{ flex: 1, padding: '10px', background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                                    📍 Track Return
                                  </motion.button>
                                );
                              }

                              // ── Case 2: No return yet — show button within 7 days ─────
                              return daysDiff <= 7 ? (
                                <motion.button {...btnTap} onClick={() => setReturnModalOrder(order)}
                                  style={{ flex: 1, padding: '10px', background: T.errorTint, color: T.error, border: `1px solid ${T.error}`, borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                                  ↩ Return
                                </motion.button>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
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
            App version 1.1.0
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
      {selectedProduct && (() => {
        const displayImagesGlobal = (selectedColor?.images?.length > 0) ? selectedColor.images : (selectedProduct.image_urls || []);
        return (
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
            <div
              style={{ width: '100%', minHeight: '320px', maxHeight: '65vh', background: T.bg, position: 'relative', touchAction: 'pan-y', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              onTouchStart={handleImageTouchStart}
              onTouchMove={handleImageTouchMove}
              onTouchEnd={() => handleImageTouchEnd(displayImagesGlobal.length)}
            >
              {displayImagesGlobal[0] || selectedProduct.image_url ? (
                <img src={optimizeImage(displayImagesGlobal[activeImageIndex] || displayImagesGlobal[0] || selectedProduct.image_url, 900)}
                  alt={selectedProduct.name} decoding="async"
                  style={{ width: '100%', height: '100%', maxHeight: '65vh', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>📦</div>
              )}

              {displayImagesGlobal.length > 1 && activeImageIndex > 0 && (
                <button onClick={() => setActiveImageIndex(prev => prev - 1)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
                  ‹
                </button>
              )}
              {displayImagesGlobal.length > 1 && activeImageIndex < displayImagesGlobal.length - 1 && (
                <button onClick={() => setActiveImageIndex(prev => prev + 1)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
                  ›
                </button>
              )}
              {displayImagesGlobal.length > 1 && (
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                  {displayImagesGlobal.map((_, i) => (
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
              {(() => {
                const isColorProduct = selectedProduct.has_color_variants && productColors.length > 0;
                const isVariantProduct = !isColorProduct && selectedProduct.has_variants && selectedProduct.variants?.length > 0;

                let displayPrice, priceLabel, displayStock;
                if (isColorProduct) {
                  const allSizes = productColors.flatMap(c => c.sizes || []);
                  const minPrice = allSizes.length > 0
                    ? Math.min(...allSizes.map(s => parseFloat(s.price ?? selectedProduct.price)))
                    : selectedProduct.price;
                  if (selectedSize) {
                    displayPrice = selectedSize.price ?? selectedProduct.price;
                    priceLabel = null;
                    displayStock = selectedSize.stock;
                  } else {
                    displayPrice = minPrice;
                    priceLabel = 'Starting from';
                    displayStock = null;
                  }
                } else if (isVariantProduct) {
                  const minPrice = Math.min(...selectedProduct.variants.map(v => parseFloat(v.price)));
                  if (selectedVariant) {
                    displayPrice = selectedVariant.price;
                    priceLabel = null;
                    displayStock = selectedVariant.stock;
                  } else {
                    displayPrice = minPrice;
                    priceLabel = 'Starting from';
                    displayStock = null;
                  }
                } else {
                  displayPrice = selectedProduct.price;
                  priceLabel = null;
                  displayStock = selectedProduct.stock;
                }

                return (
                  <div style={{ background: T.bg, borderRadius: T.radiusMd, padding: '14px 16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                      {priceLabel && <span style={{ fontSize: '12px', color: T.textSoft, fontWeight: '600' }}>{priceLabel}</span>}
                      <span style={{ fontSize: '26px', fontWeight: '800', color: T.text, letterSpacing: '-0.02em' }}>₹{displayPrice}</span>
                      {!isColorProduct && !isVariantProduct && (
                        <span style={{ fontSize: '13px', color: T.textSoft }}>
                          per {selectedProduct.unit_type || 'piece'}
                          {selectedProduct.unit_weight && ` (${selectedProduct.unit_weight}g)`}
                        </span>
                      )}
                    </div>

                    {selectedProduct.price_per_kg && (
                      <div style={{ background: T.accentTint, borderRadius: '6px', padding: '5px 10px', marginBottom: '8px', display: 'inline-block' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#5B21B6' }}>₹{selectedProduct.price_per_kg}/kg</span>
                      </div>
                    )}

                    {displayStock !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: displayStock > 10 ? T.success : displayStock > 0 ? T.headerYellowDark : T.error }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: displayStock > 10 ? T.success : displayStock > 0 ? '#8B5A00' : T.error }}>
                          {displayStock > 10 ? 'In stock' : displayStock > 0 ? 'Limited stock' : 'Out of stock'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Variants — only for non-fashion products with weight/pack-size etc; hidden when color+size system is active */}
              {!selectedProduct.has_color_variants && selectedProduct.has_variants && selectedProduct.variants?.length > 0 && (
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

              {/* Color + Size variant selector */}
              {selectedProduct.has_color_variants && productColors.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 10px', color: T.text, fontSize: '14px', fontWeight: '800' }}>Color: {selectedColor?.color_name || ''}</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {productColors.map(c => {
                      const hasStock = c.sizes?.some(s => s.stock > 0);
                      const isSelected = selectedColor?.id === c.id;
                      const thumb = c.images?.[0];
                      return (
                        <motion.div key={c.id} whileTap={{ scale: hasStock ? 0.94 : 1 }}
                          onClick={() => { if (!hasStock) return; setSelectedColor(c); setSelectedSize(null); setActiveImageIndex(0); }}
                          style={{
                            width: '58px', height: '58px', borderRadius: T.radiusSm, overflow: 'hidden',
                            border: isSelected ? `2.5px solid ${T.primary}` : `1.5px solid ${T.border}`,
                            opacity: hasStock ? 1 : 0.4, cursor: hasStock ? 'pointer' : 'not-allowed',
                            position: 'relative', flexShrink: 0, background: T.bg,
                          }}>
                          {thumb ? (
                            <img src={optimizeImage(thumb, 120)} alt={c.color_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: T.textFaint, textAlign: 'center' }}>{c.color_name}</div>
                          )}
                          {!hasStock && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', color: T.error }}>SOLD OUT</div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {selectedColor && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, color: T.text, fontSize: '14px', fontWeight: '800' }}>Select Size</h4>
                        <span style={{ fontSize: '12px', color: T.primary, fontWeight: '700', cursor: 'pointer' }}>Size Chart</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {(selectedColor.sizes || []).map(s => {
                          const isOut = s.stock === 0;
                          const isSel = selectedSize?.id === s.id;
                          return (
                            <motion.button key={s.id} whileTap={{ scale: isOut ? 1 : 0.95 }}
                              onClick={() => !isOut && setSelectedSize(s)}
                              disabled={isOut}
                              style={{
                                position: 'relative', minWidth: '46px', padding: '10px 14px', borderRadius: T.radiusSm,
                                border: isSel ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                                background: isOut ? T.bg : isSel ? T.primary : 'white',
                                color: isOut ? T.textFaint : isSel ? 'white' : T.text,
                                fontWeight: '700', fontSize: '13px', cursor: isOut ? 'not-allowed' : 'pointer',
                                textDecoration: isOut ? 'line-through' : 'none',
                              }}>
                              {s.size}
                            </motion.button>
                          );
                        })}
                      </div>

                      {selectedSize && (
                        <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ color: T.textSoft }}>Price</span>
                            <span style={{ fontWeight: '800', color: T.text, fontSize: '15px' }}>₹{selectedSize.price ?? selectedProduct.price}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: T.textSoft }}>Stock</span>
                            <span style={{ fontWeight: '700', color: selectedSize.stock > 0 ? T.success : T.error }}>
                              {selectedSize.stock > 0 ? `${selectedSize.stock} available` : 'Out of stock'}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
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
              const isColorProduct = selectedProduct.has_color_variants && productColors.length > 0;
              const isVariantProduct = !isColorProduct && selectedProduct.has_variants && selectedProduct.variants?.length > 0;

              const effectiveStock = isColorProduct ? (selectedSize?.stock ?? 0) : isVariantProduct ? (selectedVariant?.stock ?? 0) : selectedProduct.stock;
              const currentQty = getCartQty(selectedProduct.id, isVariantProduct ? selectedVariant?.id : null, isColorProduct ? selectedSize?.id : null);

              if (sellerClosed) {
                return (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '100%', padding: '16px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>
                      This store is temporarily unavailable. Please check back later.
                    </div>
                  </div>
                );
              }

              // Color+Size flow needs explicit selection before adding
              if (isColorProduct) {
                if (!selectedColor) {
                  return (
                    <div style={{ width: '100%', padding: '16px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', textAlign: 'center' }}>
                      Please select a color
                    </div>
                  );
                }
                if (!selectedSize) {
                  return (
                    <div style={{ width: '100%', padding: '16px', background: T.errorTint, color: T.error, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', textAlign: 'center' }}>
                      Please select a size
                    </div>
                  );
                }
              }

              const handleAdd = () => {
                const productPayload = { ...selectedProduct, seller_id: selectedProduct.shop_id || selectedProduct.seller_id };
                if (isColorProduct) {
                  addToCart(productPayload, null, { ...selectedSize, color_name: selectedColor.color_name });
                } else if (isVariantProduct) {
                  addToCart(productPayload, selectedVariant, null);
                } else {
                  addToCart(productPayload, null, null);
                }
              };

              return currentQty === 0 ? (
                <motion.button {...btnTap}
                  onClick={handleAdd}
                  disabled={effectiveStock === 0}
                  style={{ width: '100%', padding: '16px', background: effectiveStock === 0 ? T.textFaint : T.primary, color: 'white', border: 'none', borderRadius: T.radiusSm, fontWeight: '800', fontSize: '15px', cursor: effectiveStock === 0 ? 'not-allowed' : 'pointer', letterSpacing: '0.03em' }}>
                  {effectiveStock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                </motion.button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: T.primary, borderRadius: T.radiusSm, overflow: 'hidden', flex: 1 }}>
                    <button onClick={() => updateQty(
                        isColorProduct ? `${selectedProduct.id}::cs::${selectedSize.id}` : isVariantProduct ? `${selectedProduct.id}::${selectedVariant.id}` : selectedProduct.id,
                        currentQty - 1
                      )}
                      style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', fontWeight: '700' }}>−</button>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '16px', minWidth: '36px', textAlign: 'center' }}>{currentQty}</span>
                    <button onClick={handleAdd}
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
        );
      })()}

      {showAddressSearch && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: T.card, zIndex: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: T.headerGradient, padding: '14px 16px 16px', boxShadow: T.shadowHeader }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <motion.button {...btnTap} onClick={() => setShowAddressSearch(false)}
                style={{ width: '34px', height: '34px', background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '17px' }}>←</motion.button>
              <h2 style={{ margin: 0, color: T.text, fontSize: '16px', fontWeight: '800' }}>Delivery address dhoondein</h2>
            </div>
            <input
              autoFocus
              placeholder="Area, landmark, colony, city..."
              value={addressSearchQuery}
              onChange={e => setAddressSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '13px 16px', border: 'none', borderRadius: T.radiusSm, fontSize: '14px', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {addressSearchLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: T.textFaint, fontSize: '13px' }}>Dhoondh rahe hain...</div>
            ) : addressSearchResults.length === 0 && addressSearchQuery.trim().length >= 3 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: T.textFaint, fontSize: '13px' }}>Koi result nahi mila</div>
            ) : (
              addressSearchResults.map((r, i) => (
                <motion.div key={i} whileTap={{ scale: 0.98 }} onClick={() => selectSearchedAddress(r)}
                  style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', marginTop: '2px' }}>📍</span>
                  <span style={{ fontSize: '13px', color: T.text, lineHeight: '1.5' }}>{r.display_name}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {trackingOrderId && (
        <OrderTracking orderId={trackingOrderId} onClose={() => window.history.back()} />
      )}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
      {showNotifPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(17,17,39,0.55)', zIndex: 350, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)', fontFamily: T.font }}
          onClick={() => setShowNotifPanel(false)}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.22 }}
            onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: '24px 24px 0 0', padding: '18px 18px 32px', width: '100%', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ width: '40px', height: '4px', background: T.borderStrong, borderRadius: '999px', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: T.text, fontSize: '17px', fontWeight: '800' }}>Notifications</h3>
              <motion.button {...btnTap} onClick={() => setShowNotifPanel(false)}
                style={{ background: T.bg, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', color: T.text }}>✕</motion.button>
            </div>
            {myNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textFaint, fontSize: '13px' }}>No notifications yet</div>
            ) : myNotifications.map(n => (
              <div key={n.id} style={{ padding: '13px 14px', marginBottom: '8px', borderRadius: T.radiusMd, background: n.is_read ? T.bg : T.primaryTint, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: T.text, marginBottom: '3px' }}>{n.title}</div>
                <div style={{ fontSize: '12px', color: T.textSoft, lineHeight: '1.5' }}>{n.body}</div>
                <div style={{ fontSize: '10px', color: T.textFaint, marginTop: '4px' }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </motion.div>
        </div>
      )}
      {returnModalOrder && (
        <ReturnRequestModal
          order={returnModalOrder}
          onClose={() => { setReturnModalOrder(null); setReturnReason(''); setReturnPhotoFile(null); setReturnPhotoPreview(null); }}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          returnPhotoFile={returnPhotoFile}
          setReturnPhotoFile={setReturnPhotoFile}
          returnPhotoPreview={returnPhotoPreview}
          setReturnPhotoPreview={setReturnPhotoPreview}
          returnPhotoUploading={returnPhotoUploading}
          setReturnPhotoUploading={setReturnPhotoUploading}
          returnSubmitting={returnSubmitting}
          onSubmit={submitReturn}
        />
      )}
      {returnTrackerReturnId && (
        <ReturnStatusTracker returnId={returnTrackerReturnId} onClose={() => setReturnTrackerReturnId(null)} />
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
  <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
    UPI: <strong style={{ color: T.text }}>{qrPaymentDetails.upi_id}</strong>
    <button onClick={() => { navigator.clipboard.writeText(qrPaymentDetails.upi_id); showToast('UPI ID copied!', 'success'); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>📋</button>
  </div>
)}
                </div>

               <motion.button {...btnTap} onClick={openUpiApp}
  style={{ width: '100%', padding: '14px', background: T.card, border: `1.5px solid ${T.primary}`, borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', color: T.primary, cursor: 'pointer', marginBottom: '10px' }}>
  📱 Open Any UPI App
</motion.button>

<motion.button {...btnTap}
  onClick={() => { navigator.clipboard.writeText(qrPaymentDetails.upi_id); showToast('UPI ID copied!', 'success'); }}
  style={{ width: '100%', padding: '14px', background: T.primaryTint, border: 'none', borderRadius: T.radiusSm, fontWeight: '800', fontSize: '13px', color: T.primary, cursor: 'pointer', marginBottom: '14px' }}>
  📋 Copy UPI ID & Pay Manually
</motion.button>

                <div style={{ background: T.accentTint, borderRadius: T.radiusMd, padding: '14px', marginBottom: '14px' }}>
  <div style={{ fontSize: '12px', color: '#5B21B6', lineHeight: '1.6' }}>
    ⚠️ GPay/PhonePe ka direct "Pay" button security ke liye kabhi-kabhi decline ho sakta hai. Sabse reliable: <strong>QR code scan karo</strong> ya <strong>UPI ID copy karke manually pay</strong> karo.
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