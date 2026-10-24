import { create } from 'zustand';
import api, { getApiErrorMessage } from '../../../shared/services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,
  errorAction: null,

  login: async (email, password) => {
    set({ loading: true, error: null, errorAction: 'login' });
    try {
      // Clear any stale session before attempting login.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: getApiErrorMessage(err, 'Email or password is incorrect.'), loading: false });
      return false;
    }
  },

  signup: async (formData) => {
    set({ loading: true, error: null, errorAction: 'signup' });
    try {
      const { data } = await api.post('/auth/signup', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: getApiErrorMessage(err, 'Unable to create your account. Please try again.'), loading: false });
      return false;
    }
  },

  customerSignup: async (formData) => {
    set({ loading: true, error: null, errorAction: 'customerSignup' });
    try {
      const { data } = await api.post('/auth/customer/signup', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: getApiErrorMessage(err, 'Unable to create your account. Please try again.'), loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      // A failed profile refresh leaves the current session available for retry.
    }
  },
}));

export default useAuthStore;
