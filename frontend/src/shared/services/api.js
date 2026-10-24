import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect on auth endpoint failures (login/signup) — those are expected 401s
      const url = err.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/customer/signup') || url.includes('/public/')) {
        return Promise.reject(err);
      }
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (user?.role === 'customer') {
        window.location.href = '/customer/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
