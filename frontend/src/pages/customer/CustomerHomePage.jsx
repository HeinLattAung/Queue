import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import {
  LogOut, CameraOff, QrCode, Clock, Sparkles, ChevronRight,
  CheckCircle, Users, UtensilsCrossed, X, Loader2, AlertTriangle,
  MapPin,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

// Bottom sheet drag-to-dismiss constants
const SHEET_DISMISS_THRESHOLD = 120;

export default function CustomerHomePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Scanner state
  const [cameraState, setCameraState] = useState('idle');
  const [scanResult, setScanResult] = useState(null);
  const scannerInstanceRef = useRef(null);
  const autoStarted = useRef(false);

  // Bottom Sheet state
  const [sheetState, setSheetState] = useState('hidden'); // hidden | validating | ready | joining | error
  const [shopInfo, setShopInfo] = useState(null);
  const [parsedToken, setParsedToken] = useState(null);
  const [parsedBusinessId, setParsedBusinessId] = useState(null);
  const [sheetError, setSheetError] = useState(null);
  const [joinResult, setJoinResult] = useState(null);

  // Refs
  const blobsRef = useRef(null);
  const cornersRef = useRef(null);
  const sheetDragY = useRef(0);
  const sheetRef = useRef(null);

  // ---------- Data loading ----------
  useEffect(() => {
    if (!user) { navigate('/customer/login'); return; }
    api.get('/bookings/my')
      .then(({ data }) => setBookings(data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [user, navigate]);

  // ---------- GSAP Ambient Animations ----------
  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: 'random(-40, 40)', y: 'random(-40, 40)',
        duration: 'random(6, 10)', repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.7,
      });
    });
  }, []);

  useEffect(() => {
    if (!cornersRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const corners = cornersRef.current.querySelectorAll('.corner-bracket');
    gsap.to(corners, {
      filter: 'drop-shadow(0 0 16px rgba(249, 115, 22, 0.9))',
      duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.2,
    });
  }, []);

  // ---------- Scanner Lifecycle ----------
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        try {
          scannerInstanceRef.current.stop().catch(() => {});
          scannerInstanceRef.current.clear();
        } catch {}
        scannerInstanceRef.current = null;
      }
    };
  }, []);

  // Parse QR content and extract token/businessId
  const parseQrContent = useCallback((decodedText) => {
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      const businessId = url.searchParams.get('businessId');
      return { token: token || null, businessId: businessId || null, raw: decodedText };
    } catch {
      // Not a URL — treat as token
      return { token: decodedText, businessId: null, raw: decodedText };
    }
  }, []);

  // Validate token and get shop info
  const validateScannedToken = useCallback(async (token) => {
    setSheetState('validating');
    setSheetError(null);
    setParsedToken(token);

    try {
      const { data } = await api.post('/public/queue/validate-token', { token });
      setShopInfo(data);
      setSheetState('ready');
    } catch (err) {
      const status = err.response?.status;
      if (status === 410) setSheetError('This QR code has expired. Please ask for a new one.');
      else if (status === 401) setSheetError('Invalid QR code. Please scan a valid code.');
      else if (status === 404) setSheetError('Shop not found. This code may be invalid.');
      else setSheetError('Something went wrong. Please try again.');
      setSheetState('error');
    }
  }, []);

  // Handle scan detection
  const handleScanSuccess = useCallback((decodedText) => {
    if (scanResult) return;
    setScanResult(decodedText);

    // Haptic: two quick pulses
    try { navigator.vibrate?.([60, 30, 60]); } catch {}

    // Stop the scanner (camera stays as frozen/blurred background)
    if (scannerInstanceRef.current) {
      try { scannerInstanceRef.current.stop().catch(() => {}); } catch {}
    }

    // Parse QR & open bottom sheet
    const parsed = parseQrContent(decodedText);
    setParsedBusinessId(parsed.businessId);

    if (parsed.token) {
      validateScannedToken(parsed.token);
    } else if (parsed.businessId) {
      // Direct booking flow — show sheet with business info
      setShopInfo({ businessName: 'Loading...', businessId: parsed.businessId });
      setSheetState('ready');
    }
  }, [scanResult, parseQrContent, validateScannedToken]);

  const startScanner = useCallback(async () => {
    if (cameraState === 'active' || cameraState === 'starting') return;
    setCameraState('starting');

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        handleScanSuccess,
        () => {}
      );
      setCameraState('active');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraState('denied');
    }
  }, [cameraState, handleScanSuccess]);

  // Auto-start camera on mount
  useEffect(() => {
    if (!autoStarted.current && cameraState === 'idle') {
      autoStarted.current = true;
      const timer = setTimeout(() => startScanner(), 500);
      return () => clearTimeout(timer);
    }
  }, [cameraState, startScanner]);

  // ---------- Bottom Sheet Actions ----------
  const handleConfirmJoin = useCallback(async () => {
    if (!parsedToken) return;
    setSheetState('joining');

    // Haptic: confirmation tap
    if (navigator.vibrate) navigator.vibrate(40);

    try {
      const payload = {
        token: parsedToken,
        partySize: 1,
        customerName: user?.name || 'Guest',
        customerPhone: user?.phone || '',
        customerEmail: user?.email || '',
      };

      const { data } = await api.post('/public/waitlist/join', payload);
      setJoinResult(data);

      // Haptic: success celebration
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 120]);

      // Navigate to the digital ticket after brief celebration
      setTimeout(() => {
        navigate(`/queue/status?id=${data.entryId}&token=${data.accessToken}`);
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        setSheetError(msg || 'You already have an active entry in this queue.');
      } else if (err.response?.status === 403) {
        setSheetError(msg || 'You are too far from this location.');
      } else {
        setSheetError(msg || 'Failed to join. Please try again.');
      }
      setSheetState('error');
    }
  }, [parsedToken, user, navigate]);

  const handleViewMenu = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(30);
    if (parsedBusinessId) {
      navigate(`/order?businessId=${parsedBusinessId}`);
    } else if (parsedToken) {
      navigate(`/join?token=${parsedToken}`);
    }
  }, [parsedBusinessId, parsedToken, navigate]);

  const handleDismissSheet = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(20);
    setSheetState('hidden');
    setScanResult(null);
    setShopInfo(null);
    setParsedToken(null);
    setParsedBusinessId(null);
    setSheetError(null);
    setJoinResult(null);

    // Re-start camera
    setCameraState('idle');
    autoStarted.current = false;
  }, []);

  const handleLogout = () => {
    if (scannerInstanceRef.current) {
      try { scannerInstanceRef.current.stop().catch(() => {}); } catch {}
    }
    logout();
    navigate('/');
  };

  // ---------- Drag-to-dismiss logic ----------
  const handleSheetDragStart = () => { sheetDragY.current = 0; };
  const handleSheetDrag = (_, info) => { sheetDragY.current = info.offset.y; };
  const handleSheetDragEnd = () => {
    if (sheetDragY.current > SHEET_DISMISS_THRESHOLD) {
      handleDismissSheet();
    }
  };

  // ---------- Derived data ----------
  const activeBookings = useMemo(
    () => bookings.filter(b => ['pending', 'confirmed', 'arrived', 'serving'].includes(b.status)),
    [bookings]
  );

  const recentBusinesses = useMemo(() => {
    const seen = new Map();
    bookings.forEach(b => {
      if (b.businessId && !seen.has(b.businessId._id || b.businessId)) {
        const id = b.businessId._id || b.businessId;
        const name = b.businessId?.name || b.businessName || 'Restaurant';
        seen.set(id, { id, name });
      }
    });
    return Array.from(seen.values()).slice(0, 8);
  }, [bookings]);

  const firstName = user?.name?.split(' ')[0] || 'Customer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const sheetVisible = sheetState !== 'hidden';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] relative overflow-hidden">
      {/* Ambient blobs */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[450px] h-[450px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[400px] h-[400px] bg-amber-500/6 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] bg-orange-600/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg sm:max-w-xl mx-auto min-h-screen flex flex-col">
        {/* ═══════════ GLASSMORPHISM HEADER ═══════════ */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="px-5 pt-6 pb-2"
        >
          <div className="flex items-center justify-between backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <p className="text-white/90 font-semibold text-[15px] tracking-tight">
                  Hello, {firstName}
                </p>
                <p className="text-white/30 text-[11px] font-medium">{greeting}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30 hover:bg-white/[0.08] hover:text-white/60 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        </motion.header>

        {/* ═══════════ QR SCANNER VIEWFINDER ═══════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col items-center justify-center px-6"
        >
          <div className="relative w-[300px] h-[300px] mb-6">
            {/* Outer glow ring */}
            <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-br from-orange-500/20 via-transparent to-amber-500/10 blur-xl pointer-events-none" />

            {/* Glowing corner brackets */}
            <div ref={cornersRef} className="absolute inset-0 z-20 pointer-events-none">
              <div className="corner-bracket absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-orange-500 rounded-tl-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }} />
              <div className="corner-bracket absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] border-orange-500 rounded-tr-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }} />
              <div className="corner-bracket absolute bottom-0 left-0 w-16 h-16 border-b-[3px] border-l-[3px] border-orange-500 rounded-bl-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }} />
              <div className="corner-bracket absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-orange-500 rounded-br-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }} />
            </div>

            {/* Scan line animation — only when camera is active and no result */}
            {cameraState === 'active' && !sheetVisible && (
              <div className="absolute inset-x-4 z-20 pointer-events-none overflow-hidden h-full">
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent scan-line" />
              </div>
            )}

            {/* Camera viewfinder */}
            <div className={`absolute inset-3 rounded-2xl overflow-hidden bg-black/60 transition-all duration-500 ${sheetVisible ? 'blur-[6px] scale-[0.97]' : ''}`}>
              <div id="qr-reader" className="w-full h-full" />

              {/* Idle / Denied states */}
              {(cameraState === 'idle' || cameraState === 'denied') && !sheetVisible && (
                <button
                  onClick={startScanner}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0f]/90 backdrop-blur-sm cursor-pointer group"
                >
                  {cameraState === 'denied' ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                        <CameraOff size={28} className="text-red-400" />
                      </div>
                      <p className="text-red-400 text-xs font-medium">Camera access denied</p>
                      <p className="text-white/20 text-[10px]">Tap to retry</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:scale-105 transition-all">
                        <QrCode size={28} className="text-orange-400" />
                      </div>
                      <p className="text-white/60 text-xs font-medium">Tap to scan</p>
                    </>
                  )}
                </button>
              )}

              {/* Loading camera */}
              {cameraState === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm">
                  <div className="w-10 h-10 border-[3px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Green success checkmark flash on top of blurred viewfinder */}
            <AnimatePresence>
              {sheetVisible && sheetState !== 'hidden' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-3 z-30 rounded-2xl bg-black/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                  >
                    <div className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <CheckCircle size={40} className="text-orange-400" />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scanner label */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: sheetVisible ? 0.3 : 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <QrCode size={16} className="text-orange-500" />
              <span className="text-white/80 text-sm font-semibold tracking-wide">Scan to Join</span>
            </div>
            <p className="text-white/25 text-[11px]">Point your camera at a restaurant QR code</p>
          </motion.div>
        </motion.div>

        {/* Quick Join Section */}
        {!sheetVisible && recentBusinesses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="px-5 pb-3"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-white/25 text-[11px] font-semibold uppercase tracking-[0.15em]">Quick Join</h3>
              <ChevronRight size={12} className="text-white/15" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {recentBusinesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => navigate(`/booking?businessId=${biz.id}`)}
                  className="flex flex-col items-center gap-2 snap-start shrink-0 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-600/10 border border-white/[0.06] flex items-center justify-center group-hover:border-orange-500/30 group-hover:scale-105 transition-all shadow-lg shadow-black/20">
                    <span className="text-orange-400 font-bold text-lg">{biz.name[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-white/30 text-[10px] font-medium max-w-[60px] truncate">{biz.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Bookings */}
        {!sheetVisible && activeBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="px-5 pb-4"
          >
            <h3 className="text-white/25 text-[11px] font-semibold uppercase tracking-[0.15em] mb-3 px-1">Active</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {activeBookings.map((booking) => (
                <button
                  key={booking._id}
                  onClick={() => booking.accessToken && navigate(`/booking/status?token=${booking.accessToken}`)}
                  className="shrink-0 snap-start w-[190px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-3.5 text-left hover:bg-white/[0.06] hover:border-orange-500/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 font-mono text-[11px] font-bold">#{booking.bookingNumber}</span>
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  </div>
                  <p className="text-white/70 text-xs font-semibold">
                    {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-white/25 text-[10px] mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {booking.time} · {booking.partySize} guests
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="h-6" />
      </div>

      {/* ═══════════ BACKDROP OVERLAY ═══════════ */}
      <AnimatePresence>
        {sheetVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={sheetState === 'ready' || sheetState === 'error' ? handleDismissSheet : undefined}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* ═══════════ BOTTOM SHEET ═══════════ */}
      <AnimatePresence>
        {sheetVisible && (
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragStart={handleSheetDragStart}
            onDrag={handleSheetDrag}
            onDragEnd={handleSheetDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div className="bg-[#111118]/95 backdrop-blur-2xl border-t border-x border-white/[0.08] rounded-t-[28px] shadow-[0_-10px_60px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
              </div>

              <div className="px-6 pb-8 pt-2">
                <AnimatePresence mode="wait">

                  {/* ── VALIDATING STATE ── */}
                  {sheetState === 'validating' && (
                    <motion.div
                      key="validating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                        <Loader2 size={28} className="text-orange-400 animate-spin" />
                      </div>
                      <p className="text-white/50 text-sm font-medium">Verifying QR code...</p>
                    </motion.div>
                  )}

                  {/* ── READY STATE ── */}
                  {sheetState === 'ready' && (
                    <motion.div
                      key="ready"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Success Header */}
                      <div className="flex flex-col items-center mb-7">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.1 }}
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10"
                        >
                          <CheckCircle size={32} className="text-orange-400" />
                        </motion.div>
                        <motion.h2
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="text-white text-xl font-bold tracking-tight mb-1"
                        >
                          Success!
                        </motion.h2>
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          <MapPin size={13} className="text-orange-400/60" />
                          <span className="text-white/50 text-sm font-medium">{shopInfo?.businessName || 'Restaurant'}</span>
                        </motion.div>
                      </div>

                      {/* ── ACTION BUTTONS ── */}
                      <div className="space-y-3">
                        {/* Primary: Confirm & Join Queue */}
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          onClick={handleConfirmJoin}
                          whileTap={{ scale: 0.97 }}
                          className="w-full relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 gradient-orange opacity-100 group-active:opacity-90 transition-opacity" style={{ borderRadius: '18px' }} />
                          <div className="relative flex items-center justify-center gap-3 py-[18px] px-6">
                            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                              <Users size={20} className="text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-white font-bold text-[15px] leading-tight">Confirm & Join Queue</p>
                              <p className="text-white/60 text-[11px] font-medium mt-0.5">Skip the line instantly</p>
                            </div>
                            <ChevronRight size={18} className="text-white/60 shrink-0" />
                          </div>
                        </motion.button>

                        {/* Secondary: View Menu & Pre-order */}
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.32 }}
                          onClick={handleViewMenu}
                          whileTap={{ scale: 0.97 }}
                          className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12] rounded-[18px] transition-all"
                        >
                          <div className="flex items-center justify-center gap-3 py-[18px] px-6">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
                              <UtensilsCrossed size={20} className="text-white/70" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-white/80 font-bold text-[15px] leading-tight">View Menu & Pre-order</p>
                              <p className="text-white/30 text-[11px] font-medium mt-0.5">Browse while you wait</p>
                            </div>
                            <ChevronRight size={18} className="text-white/30 shrink-0" />
                          </div>
                        </motion.button>
                      </div>

                      {/* Tertiary: Cancel / Scan Again */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex justify-center mt-5 mb-1"
                      >
                        <button
                          onClick={handleDismissSheet}
                          className="flex items-center gap-1.5 text-white/25 hover:text-white/50 text-[13px] font-medium transition-colors py-2 px-4"
                        >
                          <X size={14} />
                          Cancel · Scan Again
                        </button>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* ── JOINING STATE ── */}
                  {sheetState === 'joining' && (
                    <motion.div
                      key="joining"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-8"
                    >
                      {!joinResult ? (
                        <>
                          <div className="w-14 h-14 border-[3px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-5" />
                          <p className="text-white/60 text-sm font-semibold">Joining queue...</p>
                          <p className="text-white/25 text-[11px] mt-1">at {shopInfo?.businessName}</p>
                        </>
                      ) : (
                        <>
                          {/* Brief celebration before navigation */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/15"
                          >
                            <Sparkles size={36} className="text-emerald-400" />
                          </motion.div>
                          <motion.h3
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-white text-lg font-bold mb-1"
                          >
                            You're #{joinResult.position} in line!
                          </motion.h3>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="text-white/40 text-sm"
                          >
                            ~{joinResult.estimatedWait} min wait
                          </motion.p>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-2 mt-4 text-white/25 text-[11px]"
                          >
                            <Loader2 size={12} className="animate-spin" />
                            Opening your ticket...
                          </motion.div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* ── ERROR STATE ── */}
                  {sheetState === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-6"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertTriangle size={28} className="text-red-400" />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-1">Cannot Join</h3>
                      <p className="text-white/40 text-sm text-center max-w-[280px] mb-6">{sheetError}</p>

                      <button
                        onClick={handleDismissSheet}
                        className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-2xl py-4 text-white/70 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <QrCode size={16} />
                        Scan Again
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Safe area spacer for iPhones */}
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline styles */}
      <style>{`
        .scan-line {
          animation: scanMove 2.5s ease-in-out infinite;
        }
        @keyframes scanMove {
          0% { transform: translateY(0); }
          50% { transform: translateY(268px); }
          100% { transform: translateY(0); }
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0.75rem;
        }
        #qr-reader { border: none !important; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
        #qr-reader__scan_region { min-height: unset !important; }
        #qr-reader__dashboard { display: none !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
