import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);

// ── Passwordless buyer entry: phone + pincode only ──
// The backend ALWAYS returns 200 here (even when serviceable=false) —
// serviceability only decides the dashboard banner, never blocks entry.
export const buyerEntry = (data) => API.post('/auth/buyer-entry', data);

export default API;