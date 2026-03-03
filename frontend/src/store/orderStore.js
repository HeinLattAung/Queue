import { create } from 'zustand';

const useOrderStore = create((set, get) => ({
  cart: {},
  order: null,

  addItem: (meal) => {
    if (navigator.vibrate) navigator.vibrate(30);
    set((state) => {
      const existing = state.cart[meal._id];
      return {
        cart: {
          ...state.cart,
          [meal._id]: {
            meal,
            quantity: existing ? existing.quantity + 1 : 1,
          },
        },
      };
    });
  },

  removeItem: (mealId) => {
    if (navigator.vibrate) navigator.vibrate(20);
    set((state) => {
      const existing = state.cart[mealId];
      if (!existing) return state;
      if (existing.quantity <= 1) {
        const { [mealId]: _, ...rest } = state.cart;
        return { cart: rest };
      }
      return {
        cart: {
          ...state.cart,
          [mealId]: { ...existing, quantity: existing.quantity - 1 },
        },
      };
    });
  },

  clearCart: () => set({ cart: {} }),
  setOrder: (order) => set({ order }),

  get cartItems() {
    return Object.values(get().cart);
  },

  get cartTotal() {
    return Object.values(get().cart).reduce(
      (sum, { meal, quantity }) => sum + meal.price * quantity,
      0,
    );
  },

  get cartCount() {
    return Object.values(get().cart).reduce(
      (sum, { quantity }) => sum + quantity,
      0,
    );
  },
}));

export default useOrderStore;
