import { motion } from 'framer-motion';

/* ============================================================
   ZAPLO DESIGN SYSTEM — kept local to this file so it can be
   dropped into Buyer, Seller, or Delivery dashboards without
   depending on any other file. Matches the tokens used across
   the rest of the app.
   ============================================================ */
const T = {
  primary: '#5B4BFF',
  primaryGradient: 'linear-gradient(135deg, #5B4BFF 0%, #7C6FFF 100%)',
  bg: '#F8F9FC',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSoft: '#6B7280',
  border: '#ECEEF3',
  primaryTint: '#F1EFFF',
  radiusMd: '18px',
  radiusPill: '999px',
  shadowCard: '0 2px 12px rgba(17, 17, 39, 0.05)',
  font: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating an account or using Zaplo — whether as a Buyer, Seller, or Delivery Partner — you agree to these Terms & Conditions. If you do not agree, please do not use the app.',
  },
  {
    title: '2. Who can use Zaplo',
    body: 'Zaplo connects Buyers with local Sellers (food, grocery, stationery, fashion) and independent Delivery Partners. Sellers and Delivery Partners must be approved by Zaplo before they can operate on the platform. Zaplo may suspend any account that violates these terms.',
  },
  {
    title: '3. Orders & payments',
    body: 'Orders can be paid via Cash on Delivery or Online payment (processed securely through Razorpay). Zaplo charges a 10% platform commission on the order value; the remaining 90% is paid to the Seller. Prices, availability, and stock are set by individual Sellers and may change without notice.',
  },
  {
    title: '4. Delivery charges & earnings',
    body: 'Delivery is charged separately from the product total: ₹20 flat for the first 5 km, plus ₹6 per additional km beyond that. This amount is paid directly to the Delivery Partner and is not part of the online payment collected by Zaplo.',
  },
  {
    title: '5. Cancellations & returns',
    body: 'Return eligibility depends on the product category and the Seller\'s stated return policy — for example, fresh produce and perishable food are generally non-returnable, while electronics and fashion items may have a limited return window. Buyers should contact the Seller directly to request a return.',
  },
  {
    title: '6. Seller responsibilities',
    body: 'Sellers are responsible for accurate product listings, pricing, stock levels, and timely order preparation. Sellers must maintain valid bank details for payouts and comply with the return policy declared on each product.',
  },
  {
    title: '7. Delivery Partner responsibilities',
    body: 'Delivery Partners are responsible for timely pickup and delivery, accurate status updates, and professional conduct with Buyers and Sellers. Delivery charges collected from Buyers belong to the Delivery Partner completing that order.',
  },
  {
    title: '8. Limitation of liability',
    body: 'Zaplo acts as a platform connecting Buyers, Sellers, and Delivery Partners. We are not the manufacturer or seller of any listed product, and we are not liable for product quality, delivery delays outside our reasonable control, or disputes between parties, beyond facilitating a resolution in good faith.',
  },
  {
    title: '9. Changes to these terms',
    body: 'We may update these Terms & Conditions from time to time. Continued use of the app after changes are posted means you accept the revised terms.',
  },
];

/**
 * Shared Terms & Conditions screen.
 * Usage (from any dashboard):
 *   import TermsAndConditions from '../components/TermsAndConditions';
 *   <TermsAndConditions onBack={() => setScreen('profile')} />
 */
export default function TermsAndConditions({ onBack }) {
  return (
    <div style={{ paddingBottom: '104px', fontFamily: T.font, background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: T.primaryGradient, padding: '20px', borderRadius: '0 0 28px 28px' }}>
        {onBack && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: T.radiusPill, color: 'white', padding: '9px 16px', cursor: 'pointer', marginBottom: '14px', fontWeight: '600', fontSize: '13px', fontFamily: T.font }}>
            ← Back
          </motion.button>
        )}
        <h2 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '800' }}>Terms & Conditions</h2>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '6px' }}>Last updated: July 2026</div>
      </div>

      <div style={{ padding: '20px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{ background: T.card, borderRadius: T.radiusMd, padding: '18px', marginBottom: '10px', boxShadow: T.shadowCard, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: '700', color: T.text, fontSize: '14px', marginBottom: '10px' }}>{section.title}</div>
            <div style={{ fontSize: '13px', color: T.textSoft, lineHeight: '1.7' }}>{section.body}</div>
          </div>
        ))}

        <div style={{ background: T.primaryTint, borderRadius: T.radiusMd, padding: '22px', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 14px', color: T.primary, fontSize: '15px', fontWeight: '700' }}>Questions about these terms?</h4>
          <div style={{ fontSize: '13px', color: T.textSoft, lineHeight: '2.1' }}>
            <div>support@zaplo.in</div>
            <div>+91 6392303278</div>
            <div style={{ marginTop: '8px', fontWeight: '600', color: T.text }}>— Team Zaplo</div>
          </div>
        </div>
      </div>
    </div>
  );
}