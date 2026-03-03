import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import {
  MapPin, Clock, ArrowRight, AlertTriangle, Loader2,
  Minus, Plus, CheckCircle, Shield, Navigation, Ticket,
  Users, Sparkles, ChevronRight, QrCode, ChevronDown, ChevronUp,
} from 'lucide-react';
import QRX from '@qr-x/react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function JoinQueuePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('validating'); // validating | location | ready | submitting | success | error
  const [shopInfo, setShopInfo] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [partySize, setPartySize] = useState(1);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const ticketRef = useRef(null);
  const blobsRef = useRef(null);

  // GSAP blob animations
  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: 'random(-30, 30)', y: 'random(-30, 30)',
        duration: 'random(7, 11)', repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.5,
      });
    });
  }, []);

  // Phase 1: Validate token
  useEffect(() => {
    if (!token) {
      setError('No QR token found. Please scan a valid QR code.');
      setPhase('error');
      return;
    }

    const validateToken = async () => {
      try {
        const { data } = await api.post('/public/queue/validate-token', { token });
        setShopInfo(data);

        if (data.hasGeoLocation) {
          setPhase('location');
        } else {
          setPhase('ready');
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 410) {
          setError('This QR code has expired. Please ask for a new one.');
        } else if (status === 401) {
          setError('Invalid QR code. Please scan a valid code.');
        } else if (status === 404) {
          setError('Shop not found. This code may be invalid.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setPhase('error');
      }
    };

    validateToken();
  }, [token]);

  // Phase 2: Request geolocation
  const requestLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location services.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (navigator.vibrate) navigator.vibrate(50);
        setPhase('ready');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Allow access and try again.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Unable to determine your location.');
        } else {
          setLocationError('Location request timed out.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Phase 3: Submit (zero-typing — uses user profile data)
  const handleJoin = useCallback(async () => {
    setPhase('submitting');
    setError(null);

    const payload = {
      token,
      partySize,
      customerName: user?.name || 'Guest',
      customerPhone: user?.phone || '',
      customerEmail: user?.email || '',
      ...(location || {}),
    };

    try {
      const { data } = await api.post('/public/waitlist/join', payload);
      setResult(data);

      // Haptic success
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80, 40, 120]);
      }

      setPhase('success');
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 403) {
        setError(msg || 'You are too far from this location.');
      } else if (err.response?.status === 409) {
        setError(msg || 'You already have an active entry.');
      } else {
        setError(msg || 'Failed to join. Please try again.');
      }
      setPhase('ready');
    }
  }, [token, partySize, user, location]);

  // Animate digital ticket on success
  useEffect(() => {
    if (phase === 'success' && ticketRef.current) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const els = ticketRef.current.querySelectorAll('[data-animate]');
      gsap.set(els, { opacity: 0, y: 24, scale: 0.96 });
      gsap.to(els, {
        opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.6)', delay: 0.1,
      });
    }
  }, [phase]);

  const adjustParty = (delta) => {
    setPartySize(prev => Math.max(1, Math.min(20, prev + delta)));
    if (navigator.vibrate) navigator.vibrate(15);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] relative overflow-hidden">
      {/* Background blobs */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[450px] h-[450px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-amber-500/6 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      {shopInfo && (
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 px-6 pt-8 pb-4 text-center"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-full shadow-lg shadow-black/20">
            <div className="w-7 h-7 gradient-orange rounded-lg flex items-center justify-center">
              <MapPin size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/80">{shopInfo.businessName}</span>
          </div>
        </motion.header>
      )}

      <main className="relative z-10 px-6 pb-12">
        <div className="max-w-md sm:max-w-lg mx-auto">
          <AnimatePresence mode="wait">

            {/* Validating */}
            {phase === 'validating' && (
              <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-24">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Loader2 size={28} className="text-orange-400 animate-spin" />
                </div>
                <p className="text-white/40 text-sm font-medium">Validating QR code...</p>
              </motion.div>
            )}

            {/* Error */}
            {phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center py-24">
                <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Cannot Join Queue</h1>
                <p className="text-white/40 text-sm max-w-xs mx-auto">{error}</p>
                <button
                  onClick={() => navigate('/customer/home')}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 text-sm font-medium hover:bg-white/[0.08] transition-all"
                >
                  Back to Scanner
                </button>
              </motion.div>
            )}

            {/* Location Permission */}
            {phase === 'location' && (
              <motion.div key="location" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}>
                <div className="text-center mb-8 pt-8">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/25">
                    <MapPin size={32} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Verify Location</h1>
                  <p className="text-white/35 mt-2 text-sm max-w-xs mx-auto">
                    Confirm you're at <span className="text-orange-400 font-medium">{shopInfo?.businessName}</span>
                  </p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 text-center">
                  <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-4 mb-5">
                    <Shield size={18} className="text-orange-400/60 shrink-0" />
                    <p className="text-white/30 text-xs text-left">
                      Your location is only used to verify proximity. It is not stored.
                    </p>
                  </div>

                  {locationError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
                      <p className="text-red-400 text-xs">{locationError}</p>
                    </div>
                  )}

                  <motion.button onClick={requestLocation} whileTap={{ scale: 0.97 }}
                    className="w-full gradient-orange text-white py-4 rounded-xl font-semibold text-sm transition-all shadow-glow-orange flex items-center justify-center gap-2">
                    <Navigation size={16} /> Allow Location
                  </motion.button>

                  <button onClick={() => setPhase('ready')}
                    className="mt-3 text-white/20 text-xs hover:text-white/40 transition-colors">
                    Skip verification
                  </button>
                </div>
              </motion.div>
            )}

            {/* Ready - Party Size Only (Zero Typing) */}
            {(phase === 'ready' || phase === 'submitting') && (
              <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}>
                <div className="text-center mb-8 pt-6">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/25">
                    <Users size={32} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Join the Queue</h1>
                  <p className="text-white/35 mt-2 text-sm">
                    at <span className="text-orange-400 font-medium">{shopInfo?.businessName}</span>
                  </p>
                </div>

                {location && (
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-semibold">
                      <MapPin size={11} /> Location verified
                    </span>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4"
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6">
                  {/* Party Size Selector */}
                  <label className="block text-[11px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-4 text-center">
                    Party Size
                  </label>
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <motion.button
                      type="button"
                      onClick={() => adjustParty(-1)}
                      whileTap={{ scale: 0.85 }}
                      disabled={partySize <= 1}
                      className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Minus size={20} />
                    </motion.button>
                    <div className="text-center w-24">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={partySize}
                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="text-5xl font-bold text-white block"
                        >
                          {partySize}
                        </motion.span>
                      </AnimatePresence>
                      <p className="text-white/25 text-xs mt-1 font-medium">{partySize === 1 ? 'guest' : 'guests'}</p>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => adjustParty(1)}
                      whileTap={{ scale: 0.85 }}
                      disabled={partySize >= 20}
                      className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Plus size={20} />
                    </motion.button>
                  </div>

                  {/* User info (non-editable) */}
                  {user && (
                    <div className="bg-white/[0.02] rounded-2xl p-4 mb-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white/20 text-xs">Name</span>
                        <span className="text-white/60 text-xs font-medium">{user.name}</span>
                      </div>
                      {user.phone && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/20 text-xs">Phone</span>
                          <span className="text-white/60 text-xs font-medium">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Join Button */}
                  <motion.button
                    onClick={handleJoin}
                    disabled={phase === 'submitting'}
                    whileTap={{ scale: 0.97 }}
                    className="w-full gradient-orange text-white py-4 rounded-2xl font-semibold text-[15px] disabled:opacity-50 transition-all shadow-glow-orange flex items-center justify-center gap-2.5"
                  >
                    {phase === 'submitting' ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Ticket size={18} />
                        Join Queue
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Success - Digital Ticket */}
            {phase === 'success' && result && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div ref={ticketRef} className="pt-6">
                  <div data-animate className="relative">
                    {/* Ticket glow */}
                    <div className="absolute -inset-2 bg-gradient-to-b from-orange-500/15 via-orange-500/5 to-transparent rounded-[36px] blur-xl pointer-events-none" />

                    <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[28px] overflow-hidden">
                      {/* Ticket header */}
                      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-white/80" />
                            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">Queue Ticket</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-white/80 text-[10px] font-semibold uppercase">Live</span>
                          </div>
                        </div>
                        <h2 className="text-white text-lg font-bold">{result.businessName}</h2>
                      </div>

                      {/* Ticket tear line */}
                      <div className="relative h-6 flex items-center">
                        <div className="absolute left-0 w-3 h-6 bg-[#0d0d15] rounded-r-full" />
                        <div className="absolute right-0 w-3 h-6 bg-[#0d0d15] rounded-l-full" />
                        <div className="mx-5 flex-1 border-t-2 border-dashed border-white/[0.06]" />
                      </div>

                      {/* Ticket body */}
                      <div className="px-6 pb-6">
                        <div data-animate className="text-center py-6">
                          <p className="text-white/30 text-xs font-semibold uppercase tracking-[0.2em] mb-2">Position in Line</p>
                          <div className="relative inline-flex items-center justify-center">
                            <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-2xl" />
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                              className="relative text-7xl font-black text-white tracking-tight"
                            >
                              #{result.position}
                            </motion.span>
                          </div>
                        </div>

                        <div data-animate className="bg-white/[0.03] rounded-2xl p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Clock size={16} className="text-orange-400" />
                              </div>
                              <div>
                                <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">Est. Wait</p>
                                <p className="text-white font-bold text-lg">~{result.estimatedWait} min</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Users size={16} className="text-orange-400" />
                              </div>
                              <div>
                                <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">Party</p>
                                <p className="text-white font-bold text-lg">{partySize}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div data-animate className="flex items-center justify-center gap-2 py-3 mb-4">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-lg shadow-orange-500/50" />
                          <span className="text-orange-400 text-sm font-semibold">Waiting</span>
                        </div>

                        {/* QR Ticket for Staff Check-in */}
                        {result.accessToken && (
                          <div data-animate className="mb-4">
                            <button
                              onClick={() => setShowQr(prev => !prev)}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-2xl text-white/40 hover:text-white/60 text-xs font-semibold transition-all"
                            >
                              <QrCode size={14} />
                              {showQr ? 'Hide' : 'Show'} QR Ticket
                              {showQr ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            <AnimatePresence>
                              {showQr && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-4 flex flex-col items-center">
                                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-black/20">
                                      <QRX
                                        data={result.accessToken}
                                        level="H"
                                        shapes={{ body: 'circle', eyeball: 'rounded', eyeframe: 'rounded' }}
                                        gradient={{ type: 'linear', rotate: 45, colors: ['#f97316', '#ea580c'] }}
                                        width={180}
                                        height={180}
                                      />
                                    </div>
                                    <p className="text-white/20 text-[10px] mt-3 text-center font-medium">
                                      Show this to staff for check-in
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <motion.button
                          data-animate
                          whileTap={{ scale: 0.97 }}
                          onClick={() => navigate(`/queue/status?id=${result.entryId}&token=${result.accessToken}`)}
                          className="w-full gradient-orange text-white py-4 rounded-2xl font-semibold text-[15px] transition-all shadow-glow-orange flex items-center justify-center gap-2.5"
                        >
                          Track Live Position
                          <ChevronRight size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
