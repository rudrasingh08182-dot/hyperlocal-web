import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import BuyerHome from './pages/BuyerHome';
import SplashScreen from './components/SplashScreen';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));

function ProtectedRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

function useWarmStart() {
  const [isWarm, setIsWarm] = useState(false);
  useEffect(() => {
    const lastExit = localStorage.getItem('zaplo_last_exit');
    if (lastExit && Date.now() - parseInt(lastExit) < 5 * 60 * 1000) {
      setIsWarm(true);
    }
  }, []);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        localStorage.setItem('zaplo_last_exit', Date.now().toString());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  return isWarm;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const isWarmStart = useWarmStart();

  useEffect(() => {
    if (isWarmStart) setShowSplash(false);
  }, [isWarmStart]);

  return (
    <>
      {showSplash && !isWarmStart && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
          appVersion="1.0.0"
        />
      )}

      {(!showSplash || isWarmStart) && (
        <BrowserRouter>
          <Suspense fallback={
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100vh', fontFamily: "'Inter', sans-serif",
              color: '#7C3AED', fontWeight: 700, fontSize: '16px',
              background: '#0f0620',
            }}>
              Loading Zaplo...
            </div>
          }>
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
              <Route path="/delivery" element={<ProtectedRoute role="delivery"><DeliveryDashboard /></ProtectedRoute>} />
              <Route path="/buyer" element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      )}
    </>
  );
}