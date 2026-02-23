import { create } from 'zustand';
import api from '../services/api';

const useCustomerWaitlistStore = create((set, get) => ({
  entry: null,
  position: null,
  status: null,
  loading: false,
  error: null,

  joinWaitlist: async (businessId, data) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/public/waitlist', { businessId, ...data });
      set({ entry: res.data, status: res.data.status, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to join waitlist', loading: false });
      return null;
    }
  },

  fetchByToken: async (token) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/public/waitlist/access/${token}`);
      set({ entry: res.data, status: res.data.status, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to load waitlist entry', loading: false });
      return null;
    }
  },

  fetchPosition: async (id) => {
    try {
      const res = await api.get(`/public/waitlist/position/${id}`);
      set({ position: res.data });
      return res.data;
    } catch (err) {
      return null;
    }
  },

  cancelEntry: async (id, token) => {
    try {
      set({ loading: true, error: null });
      const res = await api.put(`/public/waitlist/${id}/cancel`, { token });
      set({ entry: res.data, status: res.data.status, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to cancel entry', loading: false });
      return null;
    }
  },

  setEntry: (entry) => set({ entry, status: entry?.status }),

  reset: () => set({ entry: null, position: null, status: null, loading: false, error: null }),
}));

export default useCustomerWaitlistStore;
