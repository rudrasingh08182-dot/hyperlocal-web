// src/pwa.js
// ─────────────────────────────────────────────────────────────
// Register service worker and handle install prompt
// Import this in your index.js: import './pwa';
// ─────────────────────────────────────────────────────────────

// Register Service Worker
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => console.log('✅ Zaplo SW registered:', reg.scope))
        .catch(err => console.error('❌ SW registration failed:', err));
    });
  }
};

// Store the install prompt event
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Dispatch custom event so React can listen
  window.dispatchEvent(new CustomEvent('pwaInstallReady'));
});

// Call this when user clicks "Install App" button
export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
};

// Check if already installed
export const isInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
};