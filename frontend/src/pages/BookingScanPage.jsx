import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode, CheckCircle2, XCircle, ShieldCheck, ShieldX, Users,
  Clock, Loader2, RotateCcw, CameraOff, Camera, Ticket,
  UserCheck, Ban, History, Sparkles, Zap, ScanLine,
  CircleDot, Eye, Volume2, ChevronRight, Timer, Hash,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import gsap from 'gsap';
import api from '../services/api';

/* ── Status badge config ── */
const statusBadge = {
  waiting:   { label: 'Waiting',   bg: 'bg-amber-50',   border: 'border-amber-200/60',   text: 'text-amber-700',   dot: 'bg-amber-500',   ring: 'ring-amber-500/20' },
  approved:  { label: 'Approved',  bg: 'bg-indigo-50',  border: 'border-indigo-200/60',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  ring: 'ring-indigo-500/20' },
  serving:   { label: 'Serving',   bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  completed: { label: 'Completed', bg: 'bg-gray-50',    border: 'border-gray-200/60',    text: 'text-gray-600',    dot: 'bg-gray-400',    ring: 'ring-gray-400/20' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',     border: 'border-red-200/60',     text: 'text-red-600',     dot: 'bg-red-400',     ring: 'ring-red-400/20' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',     border: 'border-red-200/60',     text: 'text-red-600',     dot: 'bg-red-400',     ring: 'ring-red-400/20' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-50',    border: 'border-blue-200/60',    text: 'text-blue-700',    dot: 'bg-blue-500',    ring: 'ring-blue-500/20' },
  pending:   { label: 'Pending',   bg: 'bg-slate-50',   border: 'border-slate-200/60',   text: 'text-slate-600',   dot: 'bg-slate-400',   ring: 'ring-slate-400/20' },
  arrived:   { label: 'Arrived',   bg: 'bg-teal-50',    border: 'border-teal-200/60',    text: 'text-teal-700',    dot: 'bg-teal-500',    ring: 'ring-teal-500/20' },
};

export default function BookingScanPage() {
  // Scanner
  const [cameraState, setCameraState] = useState('idle'); // idle | starting | active | denied
  const scannerInstanceRef = useRef(null);
  const autoStarted = useRef(false);

  // Overlay / validation
  const [overlayState, setOverlayState] = useState('hidden'); // hidden | validating | found | notfound | actioned
  const [scannedEntry, setScannedEntry] = useState(null);
  const [scannedType, setScannedType] = useState(null);
  const [overlayError, setOverlayError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionResult, setActionResult] = useState(null);

  // Recent scans log
  const [recentScans, setRecentScans] = useState([]);

  // Refs
  const lastScannedRef = useRef(null);
  const cornersRef = useRef(null);
  const orbsRef = useRef(null);

  // ── Stats ──
  const scanStats = useMemo(() => {
    const confirmed = recentScans.filter(s => s.action === 'confirmed').length;
    const denied = recentScans.filter(s => s.action === 'denied').length;
    return { total: recentScans.length, confirmed, denied };
  }, [recentScans]);

  // ────────────── GSAP Animations ──────────────
  useEffect(() => {
    // Floating orbs
    if (orbsRef.current) {
      const orbs = orbsRef.current.querySelectorAll('.scan-orb');
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          y: `random(-30, 30)`,
          x: `random(-20, 20)`,
          scale: `random(0.8, 1.2)`,
          duration: `random(4, 7)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.8,
        });
      });
    }
  }, []);

  // Corner bracket glow animation
  useEffect(() => {
    if (cameraState === 'active' && !isViewfinderBlurred && cornersRef.current) {
      const corners = cornersRef.current.querySelectorAll('.corner-bracket');
      gsap.fromTo(corners,
        { opacity: 0.5, filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.3))' },
        {
          opacity: 1,
          filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.8))',
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.15,
        }
      );
    }
  }, [cameraState, overlayState]);

  // ────────────── Scanner Lifecycle ──────────────
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {});
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
    };
  }, []);

  const startScanner = useCallback(async () => {
    if (cameraState === 'active' || cameraState === 'starting') return;
    setCameraState('starting');

    try {
      const html5Qrcode = new Html5Qrcode('admin-qr-reader');
      scannerInstanceRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
        handleScanSuccess,
        () => {}
      );
      setCameraState('active');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraState('denied');
    }
  }, [cameraState]);

  // Auto-start camera
  useEffect(() => {
    if (!autoStarted.current && cameraState === 'idle') {
      autoStarted.current = true;
      const timer = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(timer);
    }
  }, [cameraState, startScanner]);

  // ────────────── Scan Handler ──────────────
  const handleScanSuccess = useCallback(async (decodedText) => {
    if (lastScannedRef.current === decodedText) return;
    lastScannedRef.current = decodedText;

    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().catch(() => {});
    }

    setOverlayState('validating');
    setOverlayError('');
    setScannedEntry(null);
    setActionResult(null);

    let token = null;
    let bookingId = null;

    try {
      const url = new URL(decodedText);
      token = url.searchParams.get('token');
      bookingId = url.searchParams.get('id') || url.searchParams.get('bookingId');
    } catch {
      token = decodedText;
    }

    try {
      if (token) {
        const { data } = await api.get(`/public/waitlist/access/${token}`);
        setScannedEntry(data);
        setScannedType('waitlist');
        setOverlayState('found');
        return;
      }
    } catch { /* not a waitlist token */ }

    try {
      if (bookingId) {
        const { data } = await api.post(`/public/bookings/${bookingId}/scan`, { qrTicket: token || decodedText });
        setScannedEntry(data);
        setScannedType('booking');
        setOverlayState('found');
        return;
      }
    } catch { /* not a booking */ }

    try {
      const { data } = await api.get(`/waitlist/${decodedText}`);
      if (data) {
        setScannedEntry(data);
        setScannedType('waitlist');
        setOverlayState('found');
        return;
      }
    } catch { /* nope */ }

    setOverlayError('Unrecognized QR code. Could not find a matching queue entry or booking.');
    setOverlayState('notfound');
  }, []);

  // ────────────── Actions ──────────────
  const handleConfirmArrival = useCallback(async () => {
    if (!scannedEntry) return;
    setActionLoading('confirm');

    try {
      const id = scannedEntry._id;
      if (scannedType === 'waitlist') {
        const status = scannedEntry.status;
        if (status === 'waiting') await api.put(`/waitlist/${id}/approve`);
        else if (status === 'approved') await api.put(`/waitlist/${id}/seat`);
      } else {
        await api.post(`/public/bookings/${id}/scan`, { qrTicket: scannedEntry.qrTicket || '' });
      }

      if (navigator.vibrate) navigator.vibrate([40, 20, 80]);

      const name = scannedEntry.customerName || scannedEntry.customer?.name || 'Customer';
      setActionResult({ type: 'confirmed', name });
      addToRecentScans(scannedEntry, 'confirmed');
      setOverlayState('actioned');
    } catch (err) {
      setOverlayError(err.response?.data?.message || 'Failed to confirm arrival.');
    }
    setActionLoading(null);
  }, [scannedEntry, scannedType]);

  const handleDeny = useCallback(async () => {
    if (!scannedEntry) return;
    setActionLoading('deny');

    try {
      const id = scannedEntry._id;
      if (scannedType === 'waitlist') {
        await api.put(`/waitlist/${id}/reject`, { reason: 'Denied at door by staff' });
      }

      if (navigator.vibrate) navigator.vibrate(30);

      const name = scannedEntry.customerName || scannedEntry.customer?.name || 'Customer';
      setActionResult({ type: 'denied', name });
      addToRecentScans(scannedEntry, 'denied');
      setOverlayState('actioned');
    } catch (err) {
      setOverlayError(err.response?.data?.message || 'Failed to flag entry.');
    }
    setActionLoading(null);
  }, [scannedEntry, scannedType]);

  const addToRecentScans = (entry, action) => {
    setRecentScans(prev => [{
      id: entry._id,
      name: entry.customerName || entry.customer?.name || 'Unknown',
      partySize: entry.partySize || 1,
      status: entry.status,
      action,
      time: new Date(),
    }, ...prev].slice(0, 20));
  };

  const handleScanAgain = useCallback(() => {
    lastScannedRef.current = null;
    setOverlayState('hidden');
    setScannedEntry(null);
    setOverlayError('');
    setActionResult(null);
    setCameraState('idle');
    autoStarted.current = false;
  }, []);

  // ────────────── Derived ──────────────
  const entryName = scannedEntry?.customerName || scannedEntry?.customer?.name || 'Customer';
  const entryParty = scannedEntry?.partySize || 1;
  const entryStatus = scannedEntry?.status || 'unknown';
  const entryBadge = statusBadge[entryStatus] || statusBadge.pending;
  const entryTime = scannedEntry?.createdAt
    ? new Date(scannedEntry.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const entryPosition = scannedEntry?.position;
  const entryNotes = scannedEntry?.notes || '';
  const entryPhone = scannedEntry?.customerPhone || '';
  const isViewfinderBlurred = overlayState !== 'hidden';

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* ── Background Gradient Mesh ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 gradient-mesh opacity-60" />

      {/* ── Floating Orbs ── */}
      <div ref={orbsRef} className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="scan-orb absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-indigo-400/[0.06] blur-3xl" />
        <div className="scan-orb absolute bottom-[20%] left-[10%] w-80 h-80 rounded-full bg-purple-400/[0.05] blur-3xl" />
        <div className="scan-orb absolute top-[50%] right-[40%] w-48 h-48 rounded-full bg-blue-400/[0.04] blur-3xl" />
      </div>

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <ScanLine size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Scan QR Ticket</h1>
            <p className="text-gray-400 text-sm">Zero-typing check-in — one tap to verify</p>
          </div>
        </div>
      </div>

      {/* ── Live Stats Strip ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Scans', value: scanStats.total, icon: Eye, color: 'indigo' },
          { label: 'Confirmed', value: scanStats.confirmed, icon: UserCheck, color: 'emerald' },
          { label: 'Denied', value: scanStats.denied, icon: Ban, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl border border-${color}-100/60 p-4 shadow-soft group hover:shadow-card transition-all duration-300`}
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/[0.04] rounded-full -translate-y-1/2 translate-x-1/2`} />
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-${color}-50 border border-${color}-200/60 flex items-center justify-center`}>
                <Icon size={16} className={`text-${color}-500`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ═══════════ LEFT: Scanner + Overlay ═══════════ */}
        <div className="relative">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-elevated overflow-hidden">
            {/* Scanner viewfinder */}
            <div className="relative aspect-square max-h-[520px] bg-gray-950 overflow-hidden">
              {/* Camera feed */}
              <div className={`absolute inset-0 transition-all duration-500 ${isViewfinderBlurred ? 'blur-[12px] scale-[1.02] brightness-50' : ''}`}>
                <div id="admin-qr-reader" className="w-full h-full" />

                {/* Idle / Denied overlay */}
                {(cameraState === 'idle' || cameraState === 'denied') && overlayState === 'hidden' && (
                  <button
                    onClick={startScanner}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-gray-950/95 via-gray-900/90 to-gray-950/95 cursor-pointer group"
                  >
                    {cameraState === 'denied' ? (
                      <>
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="relative"
                        >
                          <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/15 transition-all">
                            <CameraOff size={40} className="text-red-400" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <RotateCcw size={14} className="text-red-300" />
                          </div>
                        </motion.div>
                        <div className="text-center">
                          <p className="text-red-400 text-sm font-bold">Camera Access Denied</p>
                          <p className="text-gray-500 text-xs mt-1.5 max-w-[220px]">Tap to retry or check browser permissions</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="relative"
                        >
                          {/* Glow ring */}
                          <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-indigo-500/20 blur-xl group-hover:bg-indigo-500/30 transition-all" />
                          <div className="relative w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center group-hover:border-indigo-400/50 group-hover:scale-105 transition-all duration-300">
                            <Camera size={40} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                          </div>
                          {/* Pulse dot */}
                          <div className="absolute -top-1 -right-1">
                            <span className="relative flex h-5 w-5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-50" />
                              <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-500 items-center justify-center">
                                <Zap size={10} className="text-white" />
                              </span>
                            </span>
                          </div>
                        </motion.div>
                        <div className="text-center">
                          <p className="text-white text-base font-bold">Tap to Start Scanner</p>
                          <p className="text-gray-500 text-xs mt-1.5">Auto-detect QR codes via live camera</p>
                        </div>
                      </>
                    )}
                  </button>
                )}

                {/* Starting spinner */}
                {cameraState === 'starting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-950/95 via-gray-900/90 to-gray-950/95">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-[3px] border-indigo-500/20 rounded-full" />
                        <div className="absolute inset-0 border-[3px] border-transparent border-t-indigo-500 rounded-full animate-spin" />
                        <div className="absolute inset-2 border-[2px] border-transparent border-b-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-white text-sm font-semibold">Initializing Camera</p>
                        <p className="text-gray-500 text-xs mt-1">Requesting access...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Corner brackets (when scanning) ── */}
              {cameraState === 'active' && !isViewfinderBlurred && (
                <div ref={cornersRef} className="absolute inset-0 z-10 pointer-events-none">
                  {/* Corners */}
                  <div className="corner-bracket absolute top-8 left-8 w-16 h-16 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-2xl" />
                  <div className="corner-bracket absolute top-8 right-8 w-16 h-16 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-2xl" />
                  <div className="corner-bracket absolute bottom-8 left-8 w-16 h-16 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-2xl" />
                  <div className="corner-bracket absolute bottom-8 right-8 w-16 h-16 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-2xl" />

                  {/* Crosshair center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 rounded-full bg-indigo-400/60 ring-4 ring-indigo-400/20 scan-crosshair" />
                  </div>

                  {/* Animated scan line */}
                  <div className="absolute inset-x-12 overflow-hidden h-full">
                    <div className="w-full h-[2px] scan-laser">
                      <div className="w-full h-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
                      <div className="w-3/4 h-4 mx-auto -mt-2 bg-gradient-to-b from-indigo-400/20 to-transparent blur-sm" />
                    </div>
                  </div>

                  {/* Bottom HUD */}
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                        </span>
                        <span className="text-white/80 text-xs font-semibold">LIVE</span>
                      </div>
                      <div className="w-px h-4 bg-white/20" />
                      <div className="flex items-center gap-1.5">
                        <QrCode size={13} className="text-indigo-300" />
                        <span className="text-white/60 text-xs">Scanning for QR tickets</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ══════ VALIDATION OVERLAY ══════ */}
              <AnimatePresence>
                {isViewfinderBlurred && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-20 flex items-center justify-center p-6"
                  >
                    <div className="w-full max-w-sm">
                      {/* ── Validating ── */}
                      {overlayState === 'validating' && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 text-center shadow-elevated"
                        >
                          <div className="relative w-18 h-18 mx-auto mb-5">
                            <div className="w-18 h-18 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                              <Loader2 size={32} className="text-white animate-spin" />
                            </div>
                            <motion.div
                              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -inset-2 rounded-3xl bg-indigo-500/10 -z-10"
                            />
                          </div>
                          <p className="text-gray-900 font-bold text-base">Verifying Ticket</p>
                          <p className="text-gray-400 text-sm mt-1">Looking up QR code in system...</p>

                          {/* Progress dots */}
                          <div className="flex justify-center gap-1.5 mt-4">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                className="w-2 h-2 rounded-full bg-indigo-400"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* ── Found — Customer Card ── */}
                      {overlayState === 'found' && scannedEntry && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0, y: 30 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-elevated overflow-hidden"
                        >
                          {/* Success Header */}
                          <div className="relative overflow-hidden">
                            <div className="absolute inset-0 gradient-primary" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
                            <div className="relative px-6 py-5">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  initial={{ scale: 0, rotate: -20 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.15 }}
                                  className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
                                >
                                  <ShieldCheck size={24} className="text-white" />
                                </motion.div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-white font-bold text-lg">Ticket Verified</h3>
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.3, type: 'spring' }}
                                    >
                                      <Sparkles size={16} className="text-yellow-300" />
                                    </motion.div>
                                  </div>
                                  <p className="text-white/70 text-xs font-medium mt-0.5">QR code matched successfully</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="px-6 py-5">
                            {/* Avatar + Name */}
                            <div className="flex items-center gap-4 mb-5">
                              <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-white shadow-soft flex items-center justify-center">
                                  <span className="text-indigo-600 font-bold text-2xl">{entryName[0]?.toUpperCase()}</span>
                                </div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.25, type: 'spring', stiffness: 500 }}
                                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm"
                                >
                                  <CheckCircle2 size={14} className="text-white" />
                                </motion.div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-gray-900 font-bold text-xl truncate leading-tight">{entryName}</h4>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${entryBadge.bg} ${entryBadge.border} ${entryBadge.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${entryBadge.dot}`} />
                                    {entryBadge.label}
                                  </span>
                                  {scannedType === 'waitlist' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 border border-purple-200/60 text-purple-600">
                                      <Ticket size={10} /> Queue
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-2.5 mb-5">
                              <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100/80">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Users size={13} className="text-gray-400" />
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Party</span>
                                </div>
                                <p className="text-gray-900 font-bold text-lg leading-none">
                                  {entryParty} <span className="text-gray-400 text-xs font-medium">{entryParty === 1 ? 'guest' : 'guests'}</span>
                                </p>
                              </div>
                              {entryPosition && (
                                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100/80">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Hash size={13} className="text-gray-400" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Position</span>
                                  </div>
                                  <p className="text-gray-900 font-bold text-lg leading-none">
                                    #{entryPosition}
                                  </p>
                                </div>
                              )}
                              {entryTime && (
                                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100/80">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Timer size={13} className="text-gray-400" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Joined</span>
                                  </div>
                                  <p className="text-gray-900 font-bold text-lg leading-none">{entryTime}</p>
                                </div>
                              )}
                              {entryPhone && (
                                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100/80">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Volume2 size={13} className="text-gray-400" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</span>
                                  </div>
                                  <p className="text-gray-900 font-bold text-sm leading-none truncate">{entryPhone}</p>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {entryNotes && (
                              <div className="bg-amber-50/60 rounded-2xl p-3.5 mb-5 border border-amber-200/40">
                                <p className="text-amber-600/80 text-[10px] font-bold uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-gray-700 text-sm leading-relaxed">{entryNotes}</p>
                              </div>
                            )}

                            {/* Error */}
                            {overlayError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200/60 rounded-2xl text-red-600 text-xs font-semibold mb-4"
                              >
                                <XCircle size={15} className="shrink-0" /> {overlayError}
                              </motion.div>
                            )}

                            {/* ── ACTION BUTTONS ── */}
                            <div className="space-y-3">
                              {/* Confirm Arrival */}
                              <motion.button
                                onClick={handleConfirmArrival}
                                disabled={!!actionLoading}
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.01 }}
                                className="w-full relative overflow-hidden rounded-2xl disabled:opacity-60 transition-all group"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500" />
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Shimmer */}
                                <div className="absolute inset-0 overflow-hidden">
                                  <div className="confirm-shimmer absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                                </div>
                                <div className="relative flex items-center justify-center gap-3 py-4.5 px-6">
                                  {actionLoading === 'confirm' ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck size={21} className="text-white" />
                                      <span className="text-white font-bold text-base">Confirm Arrival</span>
                                      <ChevronRight size={16} className="text-white/60 ml-auto group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                  )}
                                </div>
                              </motion.button>

                              {/* Deny / Flag */}
                              <motion.button
                                onClick={handleDeny}
                                disabled={!!actionLoading}
                                whileTap={{ scale: 0.97 }}
                                className="w-full bg-red-50/80 hover:bg-red-100/80 border border-red-200/60 rounded-2xl py-4 px-6 flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all group"
                              >
                                {actionLoading === 'deny' ? (
                                  <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-500 rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Ban size={18} className="text-red-500" />
                                    <span className="text-red-600 font-bold text-sm">Deny / Flag Entry</span>
                                  </>
                                )}
                              </motion.button>
                            </div>

                            {/* Scan Again */}
                            <div className="flex justify-center mt-5">
                              <button
                                onClick={handleScanAgain}
                                className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-500 text-xs font-semibold transition-colors py-1.5 px-3 rounded-xl hover:bg-indigo-50/50"
                              >
                                <RotateCcw size={12} /> Scan Another Ticket
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Not Found ── */}
                      {overlayState === 'notfound' && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 text-center shadow-elevated"
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: 10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                            className="relative mx-auto mb-5"
                          >
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border-2 border-red-200/60 flex items-center justify-center">
                              <ShieldX size={36} className="text-red-500" />
                            </div>
                            <div className="absolute -bottom-1 -right-6 w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center rotate-6">
                              <span className="text-sm">?</span>
                            </div>
                          </motion.div>
                          <h3 className="text-gray-900 font-bold text-lg mb-1">Ticket Not Found</h3>
                          <p className="text-gray-400 text-sm mb-6 max-w-[260px] mx-auto leading-relaxed">{overlayError}</p>
                          <button
                            onClick={handleScanAgain}
                            className="w-full gradient-primary text-white py-4 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-glow flex items-center justify-center gap-2"
                          >
                            <RotateCcw size={16} /> Try Again
                          </button>
                        </motion.div>
                      )}

                      {/* ── Actioned — Result ── */}
                      {overlayState === 'actioned' && actionResult && (
                        <motion.div
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 text-center shadow-elevated"
                        >
                          {/* Result icon with animated ring */}
                          <motion.div
                            className="relative mx-auto mb-6 w-24 h-24"
                          >
                            {/* Outer ring pulse */}
                            <motion.div
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.5, 0] }}
                              transition={{ duration: 1.2, delay: 0.2 }}
                              className={`absolute inset-0 rounded-full ${
                                actionResult.type === 'confirmed' ? 'bg-emerald-400/20' : 'bg-red-400/20'
                              }`}
                            />
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                              className={`absolute inset-0 rounded-full flex items-center justify-center border-2 ${
                                actionResult.type === 'confirmed'
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              {actionResult.type === 'confirmed' ? (
                                <CheckCircle2 size={48} className="text-emerald-500" />
                              ) : (
                                <XCircle size={48} className="text-red-500" />
                              )}
                            </motion.div>
                          </motion.div>

                          <motion.h3
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-gray-900 font-bold text-xl mb-1"
                          >
                            {actionResult.type === 'confirmed' ? 'Arrival Confirmed!' : 'Entry Denied'}
                          </motion.h3>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="text-gray-400 text-sm mb-7"
                          >
                            {actionResult.name}
                          </motion.p>

                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            onClick={handleScanAgain}
                            className="w-full gradient-primary text-white py-4 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-glow flex items-center justify-center gap-2.5"
                          >
                            <QrCode size={16} /> Scan Next Customer
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Scanner status bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100/80 bg-gray-50/30 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <span className={`relative flex h-2.5 w-2.5 ${cameraState === 'active' && !isViewfinderBlurred ? '' : ''}`}>
                  {cameraState === 'active' && !isViewfinderBlurred ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-300" />
                  )}
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  {cameraState === 'active' && !isViewfinderBlurred
                    ? 'Scanner active — ready to scan'
                    : isViewfinderBlurred ? 'Paused — reviewing result'
                    : 'Scanner idle'}
                </span>
              </div>
              {isViewfinderBlurred && (
                <button
                  onClick={handleScanAgain}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 transition-colors bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT: Recent Scans Log ═══════════ */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-elevated overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <History size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-[15px]">Recent Scans</h3>
                <p className="text-gray-400 text-[11px] font-medium">{recentScans.length} processed today</p>
              </div>
            </div>
            {recentScans.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {scanStats.confirmed}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-500 border border-red-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {scanStats.denied}
                </span>
              </div>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="py-16 text-center px-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-block"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 flex items-center justify-center">
                    <QrCode size={28} className="text-gray-300" />
                  </div>
                </motion.div>
                <p className="text-gray-500 text-sm font-semibold">No scans yet</p>
                <p className="text-gray-300 text-xs mt-1 max-w-[180px] mx-auto">Verified tickets will appear here in real-time</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80">
                <AnimatePresence initial={false}>
                  {recentScans.map((scan, i) => (
                    <motion.div
                      key={`${scan.id}-${scan.time.getTime()}`}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                    >
                      {/* Action icon */}
                      <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        scan.action === 'confirmed'
                          ? 'bg-emerald-50 border border-emerald-200/60'
                          : 'bg-red-50 border border-red-200/60'
                      }`}>
                        {scan.action === 'confirmed' ? (
                          <UserCheck size={18} className="text-emerald-600" />
                        ) : (
                          <Ban size={18} className="text-red-500" />
                        )}
                        {/* Order number */}
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-gray-700 text-white text-[9px] font-bold flex items-center justify-center">
                          {recentScans.length - i}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 text-sm font-bold truncate">{scan.name}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Users size={10} /> {scan.partySize} {scan.partySize === 1 ? 'guest' : 'guests'}
                          </span>
                          <span className="mx-1.5 text-gray-200">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} /> {scan.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>

                      {/* Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wide ${
                        scan.action === 'confirmed'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {scan.action === 'confirmed' ? 'IN' : 'DENIED'}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Inline Scanner Styles ── */}
      <style>{`
        .corner-bracket {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
        }
        .scan-crosshair {
          animation: crosshairPulse 2s ease-in-out infinite;
        }
        @keyframes crosshairPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.15), 0 0 0 8px rgba(99,102,241,0.05); }
          50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.25), 0 0 0 16px rgba(99,102,241,0.08); }
        }
        .scan-laser {
          animation: laserSweep 2.8s ease-in-out infinite;
        }
        @keyframes laserSweep {
          0% { transform: translateY(32px); }
          50% { transform: translateY(calc(100% - 32px)); }
          100% { transform: translateY(32px); }
        }
        .confirm-shimmer {
          animation: shimmerSlide 3s ease-in-out infinite;
        }
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%) skewX(-12deg); }
          60%, 100% { transform: translateX(200%) skewX(-12deg); }
        }
        #admin-qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #admin-qr-reader {
          border: none !important;
          width: 100% !important;
          height: 100% !important;
        }
        #admin-qr-reader img[alt="Info icon"] {
          display: none !important;
        }
        #admin-qr-reader__scan_region {
          min-height: unset !important;
        }
        #admin-qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
