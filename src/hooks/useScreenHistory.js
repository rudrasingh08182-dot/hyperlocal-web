import { useEffect, useRef } from 'react';

export function useScreenHistory({
  currentScreen,
  setScreen,
  selectedProduct,
  setSelectedProduct,
  trackingOrderId,
  setTrackingOrderId,
  checkoutStep,
  setCheckoutStep,
  showAddAddress,
  setShowAddAddress,
}) {
  const historyStack = useRef([]);
  const isPopping = useRef(false);
  const exitCount = useRef(0);
  const toastTimer = useRef(null);

  const getStateKey = () => {
    if (selectedProduct) return `product:${selectedProduct.id}`;
    if (trackingOrderId) return `tracking:${trackingOrderId}`;
    if (showAddAddress) return `addAddress`;
    if (checkoutStep > 1) return `checkout:${checkoutStep}`;
    return `screen:${currentScreen}`;
  };

  // Push state on forward navigation
  useEffect(() => {
    if (isPopping.current) {
      isPopping.current = false;
      return;
    }

    const key = getStateKey();
    const stack = historyStack.current;
    
    if (stack[stack.length - 1] !== key) {
      historyStack.current = [...stack, key];
    }
  });

  // Handle back button
  useEffect(() => {
    const handlePopState = (e) => {
      const stack = historyStack.current;

      // Close modals first
      if (trackingOrderId) {
        e.preventDefault();
        setTrackingOrderId(null);
        historyStack.current = stack.filter(k => !k.startsWith('tracking:'));
        window.history.pushState({ z: 1 }, '', '');
        isPopping.current = true;
        return;
      }

      if (selectedProduct) {
        e.preventDefault();
        setSelectedProduct(null);
        historyStack.current = stack.filter(k => !k.startsWith('product:'));
        window.history.pushState({ z: 1 }, '', '');
        isPopping.current = true;
        return;
      }

      if (showAddAddress) {
        e.preventDefault();
        setShowAddAddress(false);
        historyStack.current = stack.filter(k => k !== 'addAddress');
        window.history.pushState({ z: 1 }, '', '');
        isPopping.current = true;
        return;
      }

      // Checkout step back
      if (checkoutStep > 1) {
        e.preventDefault();
        setCheckoutStep(checkoutStep - 1);
        historyStack.current = stack.filter(k => k !== `checkout:${checkoutStep}`);
        window.history.pushState({ z: 1 }, '', '');
        isPopping.current = true;
        return;
      }

      // Screen back navigation
      if (stack.length > 1) {
        e.preventDefault();
        const newStack = [...stack];
        newStack.pop();
        const previousKey = newStack[newStack.length - 1];
        
        historyStack.current = newStack;
        isPopping.current = true;

        if (previousKey.startsWith('screen:')) {
          setScreen(previousKey.replace('screen:', ''));
        }

        window.history.pushState({ z: 1 }, '', '');
        return;
      }

      // Exit confirmation
      exitCount.current += 1;
      
      if (exitCount.current === 1) {
        showToast('Press back again to exit');
        toastTimer.current = setTimeout(() => {
          exitCount.current = 0;
        }, 2000);
        window.history.pushState({ z: 1 }, '', '');
      } else {
        clearTimeout(toastTimer.current);
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize
    if (historyStack.current.length === 0) {
      historyStack.current = [`screen:${currentScreen}`];
      window.history.pushState({ z: 1 }, '', '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(toastTimer.current);
    };
  }, [currentScreen, selectedProduct, trackingOrderId, checkoutStep, showAddAddress, setScreen, setSelectedProduct, setTrackingOrderId, setCheckoutStep, setShowAddAddress]);

  function showToast(message) {
    const existing = document.getElementById('zaplo-back-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'zaplo-back-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}