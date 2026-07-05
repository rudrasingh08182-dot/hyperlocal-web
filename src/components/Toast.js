import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shared Toast notification system.
 * Replaces native alert() so popups show ONLY the message —
 * no browser chrome, no "yoursite.vercel.app says" prefix.
 *
 * Usage (from any dashboard):
 *   import { Toast, showToast } from '../components/Toast';
 *   <Toast />                              // render once, anywhere near the top of your JSX
 *   showToast('Order placed!');            // info (default) — dark background
 *   showToast('Failed to save', 'error');  // error — red background
 *   showToast('Saved!', 'success');        // success — green background
 */

let toastListeners = [];

export const showToast = (message, type = 'info') => {
  const toast = { id: Date.now() + Math.random(), message, type };
  toastListeners.forEach(fn => fn(toast));
};

const COLORS = {
  info: '#1A1A1A',
  error: '#EF4444',
  success: '#22C55E',
};

export function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  return (
    <div style={{
      position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
      width: '92%', maxWidth: '440px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              background: COLORS[t.type] || COLORS.info,
              color: 'white',
              padding: '14px 20px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              textAlign: 'center',
              fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif",
            }}>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}