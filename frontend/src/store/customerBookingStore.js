import { create } from 'zustand';
import api from '../services/api';

const useCustomerBookingStore = create((set, get) => ({
  step: 1,
  date: null,
  time: null,
  partySize: 2,
  customerInfo: { name: '', phone: '', email: '', notes: '' },
  selectedTable: null,
  selectedMeals: [],
  availableTables: [],
  availableSlots: [],
  booking: null,
  loading: false,
  error: null,

  setStep: (step) => set({ step }),
  setDate: (date) => set({ date, time: null, selectedTable: null }),
  setTime: (time) => set({ time, selectedTable: null }),
  setPartySize: (partySize) => set({ partySize, selectedTable: null }),
  setCustomerInfo: (info) => set({ customerInfo: { ...get().customerInfo, ...info } }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setSelectedMeals: (meals) => set({ selectedMeals: meals }),

  fetchAvailableSlots: async (businessId, date) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get('/public/availability/slots', { params: { businessId, date } });
      set({ availableSlots: res.data, loading: false });
    } catch (err) {
      set({ error: 'Failed to load time slots', loading: false });
    }
  },

  fetchAvailableTables: async (businessId, date, time, partySize) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get('/public/availability/tables', { params: { businessId, date, time, partySize } });
      set({ availableTables: res.data, loading: false });
    } catch (err) {
      set({ error: 'Failed to load tables', loading: false });
    }
  },

  createBooking: async (businessId, bookingType = 'table') => {
    try {
      set({ loading: true, error: null });
      const { date, time, partySize, customerInfo, selectedTable, selectedMeals } = get();
      const payload = {
        businessId,
        date,
        time,
        partySize,
        customerName: customerInfo.customerName || customerInfo.name,
        customerPhone: customerInfo.customerPhone || customerInfo.phone,
        customerEmail: customerInfo.customerEmail || customerInfo.email,
        notes: customerInfo.notes,
        tableId: selectedTable?._id,
        bookingType,
        mealIds: selectedMeals.map(m => m._id),
      };
      const res = await api.post('/public/bookings', payload);
      set({ booking: res.data, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to create booking', loading: false });
      return null;
    }
  },

  fetchBookingByToken: async (token) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/public/bookings/access/${token}`);
      set({ booking: res.data, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to load booking', loading: false });
      return null;
    }
  },

  cancelBooking: async (id, token) => {
    try {
      set({ loading: true, error: null });
      const res = await api.put(`/public/bookings/${id}/cancel`, { token });
      set({ booking: res.data, loading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to cancel booking', loading: false });
      return null;
    }
  },

  reset: () => set({
    step: 1,
    date: null,
    time: null,
    partySize: 2,
    customerInfo: { name: '', phone: '', email: '', notes: '' },
    selectedTable: null,
    selectedMeals: [],
    availableTables: [],
    availableSlots: [],
    booking: null,
    loading: false,
    error: null,
  }),
}));

export default useCustomerBookingStore;
