import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import {
  ArrowLeft, ShoppingCart, Plus, Minus, ChevronRight, Loader2,
  CheckCircle, X, Coffee, AlertTriangle, PartyPopper,
} from 'lucide-react';
import api from '../../services/api';
import useOrderStore from '../../store/orderStore';
import { joinRoom, leaveRoom, onEvent, offEvent } from '../../services/socket';

// ─── PHASE STATE MACHINE ───
// loading → menu → submitting → tracking → completed

const STATUS_STEPS = [
  { key: 'received', label: 'Received', statuses: ['pending', 'confirmed'] },
  { key: 'preparing', label: 'Preparing', statuses: ['arrived', 'serving'] },
  { key: 'ready', label: 'Ready', statuses: ['completed'] },
];

function getStepIndex(status) {
  const idx = STATUS_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const businessId = searchParams.get('businessId');

  // Phase
  const [phase, setPhase] = useState('loading');
  const [business, setBusiness] = useState(null);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState(null);

  // Cart store
  const cart = useOrderStore((s) => s.cart);
  const addItem = useOrderStore((s) => s.addItem);
  const removeItem = useOrderStore((s) => s.removeItem);
  const clearCart = useOrderStore((s) => s.clearCart);
  const order = useOrderStore((s) => s.order);
  const setOrder = useOrderStore((s) => s.setOrder);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(
    () => cartItems.reduce((s, { meal, quantity }) => s + meal.price * quantity, 0),
    [cartItems],
  );
  const cartCount = useMemo(
    () => cartItems.reduce((s, { quantity }) => s + quantity, 0),
    [cartItems],
  );

  // Category filter
  const [activeCategory, setActiveCategory] = useState('All');
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  // Tracking
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [celebrated, setCelebrated] = useState(false);

  // Refs
  const blobsRef = useRef(null);
  const categoriesRef = useRef(null);
  const progressRef = useRef(null);
  const celebrationRef = useRef(null);

  // ─── DATA LOADING ───
  useEffect(() => {
    if (!businessId) {
      setError('Missing business ID');
      return;
    }

    Promise.all([
      api.get(`/public/business/${businessId}`),
      api.get(`/public/business/${businessId}/meals`),
    ])
      .then(([bizRes, mealsRes]) => {
        setBusiness(bizRes.data);
        setMeals(mealsRes.data.filter((m) => m.available !== false));
        setPhase('menu');
      })
      .catch(() => {
        setError('Failed to load menu. Please try again.');
      });

    // Reset cart on mount
    clearCart();
    setOrder(null);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── GSAP AMBIENT BLOBS ───
  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: 'random(-40, 40)',
        y: 'random(-40, 40)',
        duration: 'random(6, 10)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.7,
      });
    });
  }, []);

  // ─── GSAP PROGRESS GLOW ───
  useEffect(() => {
    if (phase !== 'tracking' || !progressRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dots = progressRef.current.querySelectorAll('.progress-dot-active');
    gsap.to(dots, {
      boxShadow: '0 0 20px rgba(249, 115, 22, 0.8)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.2,
    });
  }, [phase, trackingStatus]);

  // ─── WEBSOCKET TRACKING ───
  useEffect(() => {
    if (!order?._id) return;

    const room = `booking:${order._id}`;
    joinRoom(room);

    const handleUpdate = (data) => {
      if (data._id === order._id || data.bookingId === order._id) {
        const newStatus = data.status;
        setTrackingStatus(newStatus);
        if (newStatus === 'completed' && !celebrated) {
          setCelebrated(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
          setPhase('completed');
        }
      }
    };

    onEvent('booking:updated', handleUpdate);

    return () => {
      offEvent('booking:updated', handleUpdate);
      leaveRoom(room);
    };
  }, [order?._id, celebrated]);

  // ─── POLLING FALLBACK ───
  useEffect(() => {
    if (!order?._id || phase === 'completed') return;

    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/public/bookings/${order._id}/status`);
        const newStatus = data.status;
        setTrackingStatus(newStatus);
        if (newStatus === 'completed' && !celebrated) {
          setCelebrated(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
          setPhase('completed');
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [order?._id, phase, celebrated]);

  // ─── CELEBRATION ANIMATION ───
  useEffect(() => {
    if (phase !== 'completed' || !celebrationRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = celebrationRef.current.querySelectorAll('[data-celebrate]');
    gsap.fromTo(
      els,
      { opacity: 0, y: 30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' },
    );
  }, [phase]);

  // ─── CATEGORIES ───
  const categories = useMemo(() => {
    const cats = [...new Set(meals.map((m) => m.category).filter(Boolean))];
    return ['All', ...cats];
  }, [meals]);

  const filteredMeals = useMemo(() => {
    if (activeCategory === 'All') return meals;
    return meals.filter((m) => m.category === activeCategory);
  }, [meals, activeCategory]);

  // ─── PLACE ORDER ───
  const handlePlaceOrder = useCallback(async () => {
    if (cartCount === 0) return;
    setPhase('submitting');
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 120]);

    try {
      const now = new Date();
      const mealIds = [];
      cartItems.forEach(({ meal, quantity }) => {
        for (let i = 0; i < quantity; i++) mealIds.push(meal._id);
      });

      const payload = {
        businessId,
        bookingType: 'meal',
        customerName: 'Walk-in Order',
        customerPhone: '',
        customerEmail: '',
        date: now.toISOString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        partySize: 1,
        mealIds,
      };

      const { data } = await api.post('/public/bookings', payload);
      setOrder(data);
      setTrackingStatus(data.status || 'pending');
      setPhase('tracking');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
      setPhase('menu');
    }
  }, [cartCount, cartItems, businessId, setOrder]);

  // ─── GRADIENT GENERATORS FOR CARDS ───
  const cardGradients = useMemo(() => {
    const gradients = [
      'from-orange-600/30 to-amber-700/10',
      'from-rose-600/25 to-pink-700/10',
      'from-violet-600/25 to-purple-700/10',
      'from-emerald-600/25 to-teal-700/10',
      'from-blue-600/25 to-cyan-700/10',
      'from-amber-600/30 to-yellow-700/10',
    ];
    return meals.reduce((acc, m, i) => {
      acc[m._id] = gradients[i % gradients.length];
      return acc;
    }, {});
  }, [meals]);

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Ambient blobs */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[450px] h-[450px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[400px] h-[400px] bg-amber-500/6 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] bg-orange-600/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg sm:max-w-2xl mx-auto min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {/* ═══════════ LOADING ═══════════ */}
          {(phase === 'loading' || error) && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              {error ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                    <AlertTriangle size={28} className="text-red-400" />
                  </div>
                  <p className="text-white/70 text-sm font-medium mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 border-[3px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-5" />
                  <p className="text-white/40 text-sm font-medium">Loading menu...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ MENU PHASE ═══════════ */}
          {phase === 'menu' && !error && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top,12px)] pb-2 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/[0.04]"
              >
                <div className="flex items-center justify-between py-2">
                  <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.08] transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h1 className="text-white font-bold text-[17px] tracking-tight truncate max-w-[200px]">
                    {business?.name || 'Menu'}
                  </h1>
                  <div className="relative">
                    <button
                      onClick={() => cartCount > 0 && setCartSheetOpen(true)}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.08] transition-all"
                    >
                      <ShoppingCart size={18} />
                    </button>
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-orange-500/40"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.header>

              {/* Category tabs */}
              {categories.length > 2 && (
                <div
                  ref={categoriesRef}
                  className="sticky top-[72px] z-20 px-4 py-3 bg-[#0a0a0f]/60 backdrop-blur-xl overflow-x-auto scrollbar-hide flex gap-2"
                >
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        activeCategory === cat
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                          : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Meal grid */}
              <div className="flex-1 px-4 py-4 pb-32">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredMeals.map((meal, i) => {
                    const qty = cart[meal._id]?.quantity || 0;
                    return (
                      <motion.div
                        key={meal._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.35 }}
                        className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden group hover:border-white/[0.12] transition-all"
                      >
                        {/* Gradient placeholder */}
                        <div
                          className={`h-24 bg-gradient-to-br ${cardGradients[meal._id]} flex items-center justify-center`}
                        >
                          <Coffee size={28} className="text-white/20" />
                        </div>

                        <div className="p-3">
                          <h3 className="text-white/90 font-semibold text-[13px] leading-tight truncate">
                            {meal.name}
                          </h3>
                          {meal.description && (
                            <p className="text-white/30 text-[11px] mt-0.5 line-clamp-1">
                              {meal.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-orange-400 font-bold text-sm">
                              ${meal.price.toFixed(2)}
                            </span>

                            {qty === 0 ? (
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => addItem(meal)}
                                className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 hover:bg-orange-400 transition-colors"
                              >
                                <Plus size={16} strokeWidth={3} />
                              </motion.button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => removeItem(meal._id)}
                                  className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white/60"
                                >
                                  <Minus size={12} strokeWidth={3} />
                                </motion.button>
                                <span className="text-white font-bold text-xs w-5 text-center">
                                  {qty}
                                </span>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => addItem(meal)}
                                  className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30"
                                >
                                  <Plus size={12} strokeWidth={3} />
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {filteredMeals.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Coffee size={40} className="text-white/10 mb-3" />
                    <p className="text-white/30 text-sm">No items in this category</p>
                  </div>
                )}
              </div>

              {/* ── CART BAR ── */}
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 max-w-lg mx-auto"
                  >
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCartSheetOpen(true)}
                      className="w-full bg-orange-500 hover:bg-orange-400 rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl shadow-orange-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                          <ShoppingCart size={16} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-sm">
                          {cartCount} {cartCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-base">
                          ${cartTotal.toFixed(2)}
                        </span>
                        <ChevronRight size={18} className="text-white/70" />
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── CART SHEET ── */}
              <AnimatePresence>
                {cartSheetOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setCartSheetOpen(false)}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
                    />
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
                      className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
                    >
                      <div className="bg-[#111118]/95 backdrop-blur-2xl border-t border-x border-white/[0.08] rounded-t-[28px] shadow-[0_-10px_60px_rgba(0,0,0,0.5)] max-h-[70vh] flex flex-col">
                        {/* Handle + header */}
                        <div className="px-6 pt-3 pb-4">
                          <div className="flex justify-center mb-3">
                            <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
                          </div>
                          <div className="flex items-center justify-between">
                            <h2 className="text-white font-bold text-lg">Your Order</h2>
                            <button
                              onClick={() => setCartSheetOpen(false)}
                              className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:bg-white/[0.1] transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-hide">
                          {cartItems.map(({ meal, quantity }) => (
                            <div
                              key={meal._id}
                              className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                            >
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-white/80 text-sm font-semibold truncate">
                                  {meal.name}
                                </p>
                                <p className="text-orange-400/80 text-xs font-medium mt-0.5">
                                  ${(meal.price * quantity).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => removeItem(meal._id)}
                                  className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50"
                                >
                                  <Minus size={14} />
                                </motion.button>
                                <span className="text-white font-bold text-sm w-6 text-center">
                                  {quantity}
                                </span>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => addItem(meal)}
                                  className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400"
                                >
                                  <Plus size={14} />
                                </motion.button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-[env(safe-area-inset-bottom,16px)] pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-white/50 text-sm font-medium">Total</span>
                            <span className="text-white font-bold text-xl">
                              ${cartTotal.toFixed(2)}
                            </span>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setCartSheetOpen(false);
                              handlePlaceOrder();
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-400 rounded-2xl py-4 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-colors"
                          >
                            Place Order <ChevronRight size={18} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══════════ SUBMITTING ═══════════ */}
          {phase === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              <div className="w-16 h-16 border-[3px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-5" />
              <p className="text-white/60 text-sm font-semibold">Placing your order...</p>
              <p className="text-white/25 text-[11px] mt-1">at {business?.name}</p>
            </motion.div>
          )}

          {/* ═══════════ TRACKING ═══════════ */}
          {phase === 'tracking' && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col px-5 pt-[env(safe-area-inset-top,16px)]"
            >
              {/* Order header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-8 pb-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-white/60 text-xs font-semibold">Order Placed</span>
                </div>
                <h1 className="text-white font-bold text-2xl tracking-tight">
                  Order #{order?.bookingNumber || '---'}
                </h1>
                <p className="text-white/30 text-sm mt-1">{business?.name}</p>
              </motion.div>

              {/* Progress steps */}
              <motion.div
                ref={progressRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 mb-6"
              >
                <div className="flex items-center justify-between relative">
                  {/* Connection lines */}
                  <div className="absolute top-4 left-[calc(16.67%)] right-[calc(16.67%)] h-[2px] bg-white/[0.06]" />
                  <div
                    className="absolute top-4 left-[calc(16.67%)] h-[2px] bg-orange-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(getStepIndex(trackingStatus) / (STATUS_STEPS.length - 1), 1) * 100}%`,
                      maxWidth: `${((STATUS_STEPS.length - 1) / STATUS_STEPS.length) * 100}%`,
                    }}
                  />

                  {STATUS_STEPS.map((step, i) => {
                    const currentStep = getStepIndex(trackingStatus);
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isActive
                              ? 'bg-orange-500 shadow-lg shadow-orange-500/40 progress-dot-active'
                              : 'bg-white/[0.06] border border-white/[0.08]'
                          } ${isCurrent ? 'ring-4 ring-orange-500/20' : ''}`}
                        >
                          {isActive ? (
                            <CheckCircle size={14} className="text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white/20" />
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-semibold mt-2 transition-colors ${
                            isActive ? 'text-white/80' : 'text-white/25'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Order summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 mb-6"
              >
                <h3 className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-3">
                  Order Summary
                </h3>
                {cartItems.map(({ meal, quantity }) => (
                  <div
                    key={meal._id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-white/70 text-sm">
                      {quantity}x {meal.name}
                    </span>
                    <span className="text-white/50 text-sm font-medium">
                      ${(meal.price * quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] mt-2 pt-3 flex items-center justify-between">
                  <span className="text-white/60 text-sm font-semibold">Total</span>
                  <span className="text-white font-bold text-lg">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
              </motion.div>

              {/* Status message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 py-4"
              >
                <Coffee size={16} className="text-orange-400/60" />
                <span className="text-white/40 text-sm font-medium">
                  {trackingStatus === 'pending' || trackingStatus === 'confirmed'
                    ? 'Your order has been received...'
                    : trackingStatus === 'arrived' || trackingStatus === 'serving'
                    ? 'Preparing your order...'
                    : 'Processing...'}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════ COMPLETED ═══════════ */}
          {phase === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              <div ref={celebrationRef} className="text-center">
                <div data-celebrate className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
                  <PartyPopper size={44} className="text-emerald-400" />
                </div>
                <h1 data-celebrate className="text-white text-2xl font-bold mb-2">
                  Your Order is Ready!
                </h1>
                <p data-celebrate className="text-white/40 text-sm mb-2">
                  Order #{order?.bookingNumber}
                </p>
                <p data-celebrate className="text-emerald-400/80 text-sm font-medium mb-8">
                  Please pick up your order
                </p>

                {/* Order summary */}
                <div data-celebrate className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 mb-6 text-left w-full max-w-sm mx-auto">
                  {cartItems.map(({ meal, quantity }) => (
                    <div key={meal._id} className="flex items-center justify-between py-1.5">
                      <span className="text-white/60 text-sm">{quantity}x {meal.name}</span>
                      <span className="text-white/40 text-sm">${(meal.price * quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/[0.06] mt-2 pt-2 flex items-center justify-between">
                    <span className="text-white/60 text-sm font-semibold">Total</span>
                    <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  data-celebrate
                  onClick={() => navigate(-1)}
                  className="px-8 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inline styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
      `}</style>
    </div>
  );
}
