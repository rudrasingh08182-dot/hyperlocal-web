import { useEffect, useRef } from 'react';

export function useTabHistory(activeTab, setActiveTab, tabOrder) {
  const history = useRef(['dashboard']);
  const isPopping = useRef(false);
  const exitCount = useRef(0);
  let toastTimer;

  // Push tab on change
  useEffect(() => {
    if (isPopping.current) {
      isPopping.current = false;
      return;
    }
    const last = history.current[history.current.length - 1];
    if (last !== activeTab) {
      history.current = [...history.current, activeTab];
    }
  }, [activeTab]);

  // Handle back button
  useEffect(() => {
    window.history.pushState({ t: 1 }, '', '');

    const handleBack = (e) => {
      const stack = history.current;

      if (stack.length > 1) {
        e.preventDefault();
        const newStack = [...stack];
        newStack.pop();
        const prevTab = newStack[newStack.length - 1];

        history.current = newStack;
        isPopping.current = true;
        setActiveTab(prevTab);

        window.history.pushState({ t: 1 }, '', '');
      } else {
        // Exit confirmation
        exitCount.current += 1;
        if (exitCount.current === 1) {
          showToast('Press back again to exit');
          toastTimer = setTimeout(() => exitCount.current = 0, 2000);
          window.history.pushState({ t: 1 }, '', '');
        } else {
          clearTimeout(toastTimer);
          window.history.back();
        }
      }
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [setActiveTab]);

  function showToast(msg) {
    const existing = document.getElementById('tab-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'tab-toast';
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:12px 24px;border-radius:24px;font-size:14px;z-index:9999;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2000);
  }
}