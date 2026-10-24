import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 30000,
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

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The server is taking too long to respond. Please wait a moment and try again.';
  }
  if (!error.response) {
    return 'Unable to connect to the server. Check your connection and try again.';
  }
  if (error.response.status >= 500) {
    return 'The server is temporarily unavailable. Please try again shortly.';
  }
  return error.response.data?.message || fallback;
}
