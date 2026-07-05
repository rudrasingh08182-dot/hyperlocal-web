import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import BuyerHome from './pages/BuyerHome';

// Lazy-loaded — sirf tab download honge jab us role ka route khulega
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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', fontFamily: "'Inter', sans-serif",
          color: '#5B4BFF', fontWeight: 700, fontSize: '16px',
          background: '#F8F9FC',
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
  );
}