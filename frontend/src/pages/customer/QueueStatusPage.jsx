import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import {
  Clock, Users, CheckCircle, UtensilsCrossed, XCircle,
  ThumbsUp, AlertTriangle, Bell, Wifi, WifiOff,
  Sparkles, Ticket, QrCode, ChevronDown, ChevronUp,
} from 'lucide-react';
import QRX from '@qr-x/react';
import useSocket from '../../hooks/useSocket';
import api from '../../services/api';

const statusConfig = {
  waiting: { label: 'In Queue', icon: Clock, color: 'orange', accent: 'text-orange-400', bg: 'from-orange-500 to-amber-600', glow: 'rgba(249, 115, 22, 0.4)' },
  approved: { label: 'Approved', icon: ThumbsUp, color: 'emerald', accent: 'text-emerald-400', bg: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.4)' },
  serving: { label: 'Your Turn!', icon: UtensilsCrossed, color: 'emerald', accent: 'text-emerald-400', bg: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.4)' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'blue', accent: 'text-blue-400', bg: 'from-blue-500 to-indigo-600', glow: 'rgba(59, 130, 246, 0.3)' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'red', accent: 'text-red-400', bg: 'from-red-500 to-rose-600', glow: 'rgba(239, 68, 68, 0.3)' },
  skipped: { label: 'Skipped', icon: AlertTriangle, color: 'red', accent: 'text-red-400', bg: 'from-red-500 to-rose-600', glow: 'rgba(239, 68, 68, 0.3)' },
};

const statusSteps = ['waiting', 'approved', 'serving', 'completed'];

export default function QueueStatusPage() {
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('id');
  const accessToken = searchParams.get('token');

  const [entry, setEntry] = useState(null);
  const [position, setPosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const circleRef = useRef(null);
  const glowRef = useRef(null);
  const blobsRef = useRef(null);

  const { on, off, connected } = useSocket(entryId ? `queue:${entryId}` : null);

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

  // Initial fetch
  useEffect(() => {
    if (!entryId && !accessToken) {
      setError('Missing queue entry ID.');
      setLoading(false);
      return;
    }

    const fetchEntry = async () => {
      try {
        if (accessToken) {
          const { data } = await api.get(`/public/waitlist/access/${accessToken}`);
          setEntry(data);
        } else {
          const { data } = await api.get(`/public/waitlist/${entryId}/status`);
          setEntry(data);
        }
      } catch {
        setError('Queue entry not found or expired.');
      }
      setLoading(false);
    };
    fetchEntry();
  }, [entryId, accessToken]);

  // Fetch position periodically
  useEffect(() => {
    const id = entry?._id || entryId;
    if (!id || entry?.status !== 'waiting') return;

    const fetchPos = () => {
      api.get(`/public/waitlist/position/${id}`)
        .then(({ data }) => {
          setPosition(data.position);
          setEstimatedWait(data.estimatedWait);
        })
        .catch(() => {});
    };

    fetchPos();
    const interval = setInterval(fetchPos, 15000);
    return () => clearInterval(interval);
  }, [entry?._id, entryId, entry?.status]);

  const showNotif = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? [80, 40, 80] : [50]);
    }
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Socket listeners
  useEffect(() => {
    const handlePositionUpdate = (data) => {
      setPosition(data.position);
      setEstimatedWait(data.estimatedWait);
    };
    const handleCalled = (data) => {
      setEntry(prev => ({ ...prev, ...data.entry, status: 'serving' }));
      showNotif('Your table is ready!', 'success');
    };
    const handleApproved = (data) => {
      setEntry(prev => ({ ...prev, ...data.entry, status: 'approved' }));
      showNotif('You have been approved!', 'success');
    };
    const handleSkipped = (data) => {
      setEntry(prev => ({ ...prev, status: 'cancelled', rejectedReason: data.reason || 'Skipped by staff' }));
      showNotif('Your entry was skipped.', 'warning');
    };
    const handleCompleted = () => {
      setEntry(prev => ({ ...prev, status: 'completed' }));
      showNotif('Visit complete. Thank you!', 'info');
    };
    const handleCancelled = (data) => {
      setEntry(prev => ({ ...prev, ...data.entry, status: 'cancelled' }));
    };
    const handleRejected = (data) => {
      setEntry(prev => ({ ...prev, ...data.entry, status: 'rejected', rejectedReason: data.reason }));
      showNotif('Your entry was rejected.', 'warning');
    };

    on('queue:position-update', handlePositionUpdate);
    on('queue:called', handleCalled);
    on('queue:approved', handleApproved);
    on('queue:skipped', handleSkipped);
    on('queue:completed', handleCompleted);
    on('queue:cancelled', handleCancelled);
    on('queue:rejected', handleRejected);

    return () => {
      off('queue:position-update', handlePositionUpdate);
      off('queue:called', handleCalled);
      off('queue:approved', handleApproved);
      off('queue:skipped', handleSkipped);
      off('queue:completed', handleCompleted);
      off('queue:cancelled', handleCancelled);
      off('queue:rejected', handleRejected);
    };
  }, [on, off, showNotif]);

  // Animate SVG circle
  useEffect(() => {
    if (!position || entry?.status !== 'waiting' || !circleRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const totalForCircle = Math.max(position, 1);
    const targetOffset = 264 - (264 / totalForCircle) * 1;
    gsap.fromTo(circleRef.current,
      { strokeDashoffset: 264 },
      { strokeDashoffset: targetOffset, duration: 1.2, ease: 'power2.out', delay: 0.3 },
    );
  }, [position, entry?.status]);

  // Pulsing glow for serving/approved
  useEffect(() => {
    if (!entry || !['serving', 'approved'].includes(entry.status) || !glowRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const config = statusConfig[entry.status];
    gsap.to(glowRef.current, {
      boxShadow: `0 0 40px ${config.glow}, 0 0 80px ${config.glow.replace('0.4', '0.15')}`,
      duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }, [entry?.status]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const id = entry?._id || entryId;
      await api.put(`/public/waitlist/${id}/cancel`, { token: accessToken });
      setEntry(prev => ({ ...prev, status: 'cancelled' }));
      setShowCancel(false);
    } catch {}
    setCancelling(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (error || !entry) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Entry Not Found</h1>
        <p className="text-white/40 mt-2 text-sm">{error || "This queue entry doesn't exist."}</p>
      </div>
    </div>
  );

  const status = entry.status;
  const config = statusConfig[status] || statusConfig.waiting;
  const currentStepIdx = statusSteps.indexOf(status);
  const isTerminal = ['completed', 'cancelled'].includes(status) || entry.rejectedReason;
  const canCancel = ['waiting', 'approved'].includes(status);
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] relative overflow-hidden">
      {/* Background */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[450px] h-[450px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[400px] h-[400px] bg-amber-500/6 rounded-full blur-[120px]" />
      </div>

      {/* Connection indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold backdrop-blur-xl border ${
          connected
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {connected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border backdrop-blur-2xl text-sm font-medium shadow-lg ${
              notification.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                : notification.type === 'warning'
                ? 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                : 'bg-blue-500/15 border-blue-500/25 text-blue-300'
            }`}>
              <Bell size={14} /> {notification.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 px-6 pt-10 pb-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="max-w-md sm:max-w-lg mx-auto">

          {/* Digital Ticket */}
          <div className="relative">
            {/* Ticket ambient glow */}
            <div className="absolute -inset-3 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent rounded-[36px] blur-xl pointer-events-none" />

            <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl shadow-black/30">
              {/* Ticket Header */}
              <div className={`bg-gradient-to-r ${config.bg} px-6 py-5`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket size={14} className="text-white/70" />
                    <span className="text-white/70 text-[10px] font-semibold uppercase tracking-[0.15em]">Digital Ticket</span>
                  </div>
                  {!isTerminal && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-white/70 text-[10px] font-semibold uppercase">Live</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-xs mb-0.5">Hello, {entry.customerName}</p>
                    <h2 className="text-white text-lg font-bold">{entry.businessId?.name || 'Queue'}</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <StatusIcon size={24} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Ticket tear line */}
              <div className="relative h-6 flex items-center">
                <div className="absolute left-0 w-3 h-6 bg-[#0d0d15] rounded-r-full" />
                <div className="absolute right-0 w-3 h-6 bg-[#0d0d15] rounded-l-full" />
                <div className="mx-5 flex-1 border-t-2 border-dashed border-white/[0.06]" />
              </div>

              {/* Ticket Body */}
              <div className="px-6 pb-6">
                {/* Status Hero */}
                {status === 'waiting' && position ? (
                  <div className="text-center py-6">
                    <p className="text-white/25 text-[10px] font-semibold uppercase tracking-[0.2em] mb-3">Position in Line</p>
                    <div className="relative inline-flex items-center justify-center w-36 h-36 mb-3">
                      {/* SVG progress ring */}
                      <svg className="absolute inset-0 w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                        <circle ref={circleRef} cx="50" cy="50" r="42" fill="none" stroke="url(#qStatusGrad)" strokeWidth="4"
                          strokeDasharray={264} strokeDashoffset={264} strokeLinecap="round" />
                        <defs>
                          <linearGradient id="qStatusGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="text-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={position}
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="text-5xl font-black text-white block"
                          >
                            #{position}
                          </motion.span>
                        </AnimatePresence>
                        <p className="text-white/20 text-[10px] uppercase tracking-wider mt-1">in queue</p>
                      </div>
                    </div>
                  </div>
                ) : status === 'approved' ? (
                  <div className="text-center py-8">
                    <div ref={glowRef} className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                      <ThumbsUp size={40} className="text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Approved!</h1>
                    <p className="text-emerald-400 text-sm mt-1 font-medium">Proceed to the host stand</p>
                  </div>
                ) : status === 'serving' ? (
                  <div className="text-center py-8">
                    <div ref={glowRef} className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                      <UtensilsCrossed size={40} className="text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Your Table is Ready!</h1>
                    <p className="text-emerald-400 text-sm mt-1 font-medium">Enjoy your meal!</p>
                  </div>
                ) : status === 'completed' ? (
                  <div className="text-center py-8">
                    <div className="w-24 h-24 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={40} className="text-blue-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Visit Complete</h1>
                    <p className="text-white/40 text-sm mt-1">Thank you for dining with us!</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-24 h-24 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                      <XCircle size={40} className="text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">
                      {entry.rejectedReason ? 'Entry Rejected' : 'Entry Cancelled'}
                    </h1>
                    {entry.rejectedReason && <p className="text-red-400 text-sm mt-1">{entry.rejectedReason}</p>}
                  </div>
                )}

                {/* Progress Steps */}
                {!isTerminal && (
                  <div className="flex items-center justify-center gap-0 mb-6">
                    {statusSteps.map((step, i) => {
                      const stepConf = statusConfig[step];
                      const isActive = i <= currentStepIdx;
                      const isCurrent = i === currentStepIdx;
                      const Icon = stepConf.icon;
                      return (
                        <div key={step} className="flex items-center">
                          <div className="flex flex-col items-center relative">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.12, duration: 0.4, ease: 'backOut' }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                                ${isCurrent
                                  ? `bg-gradient-to-br ${stepConf.bg} shadow-lg`
                                  : isActive ? 'bg-white/[0.08]' : 'bg-white/[0.03]'
                                }`}
                            >
                              <Icon size={16} className={isCurrent ? 'text-white' : isActive ? 'text-white/40' : 'text-white/15'} />
                            </motion.div>
                            <span className={`text-[9px] mt-1.5 font-semibold ${isCurrent ? 'text-white' : 'text-white/20'}`}>
                              {stepConf.label}
                            </span>
                          </div>
                          {i < statusSteps.length - 1 && (
                            <div className={`w-8 h-0.5 mx-0.5 mt-[-14px] rounded-full transition-colors duration-500 ${i < currentStepIdx ? 'bg-white/15' : 'bg-white/[0.04]'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Info Panel */}
                <div className="bg-white/[0.03] rounded-2xl p-4 space-y-3">
                  {status === 'waiting' && estimatedWait && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-orange-400/60" />
                        <span className="text-white/30 text-xs">Estimated Wait</span>
                      </div>
                      <span className="text-white font-bold text-sm">~{estimatedWait || position * 5} min</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-orange-400/60" />
                      <span className="text-white/30 text-xs">Party Size</span>
                    </div>
                    <span className="text-white font-semibold text-sm">{entry.partySize} {entry.partySize === 1 ? 'guest' : 'guests'}</span>
                  </div>
                  {status === 'waiting' && position && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-orange-400/60" />
                        <span className="text-white/30 text-xs">People Ahead</span>
                      </div>
                      <span className="text-orange-400 font-semibold text-sm">{Math.max(0, position - 1)}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-xs">Notes</span>
                      <span className="text-white/50 text-xs max-w-[160px] text-right">{entry.notes}</span>
                    </div>
                  )}
                </div>

                {/* ── Show QR Ticket for Staff Scan ── */}
                {!isTerminal && accessToken && (
                  <div className="mt-4">
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
                                data={accessToken}
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
              </div>
            </div>
          </div>

          {/* Cancel Button */}
          {canCancel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4"
            >
              <button onClick={() => setShowCancel(true)}
                className="w-full py-3.5 bg-red-500/8 border border-red-500/15 rounded-2xl text-sm font-medium text-red-400/80 hover:bg-red-500/15 transition-all">
                Leave Queue
              </button>

              <AnimatePresence>
                {showCancel && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-[#141420] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                    >
                      <h3 className="text-white font-bold text-lg mb-2">Leave Queue?</h3>
                      <p className="text-white/35 text-sm mb-6">You'll lose your position and will need to scan again.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setShowCancel(false)}
                          className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/50 hover:bg-white/[0.08] transition-all">
                          Stay
                        </button>
                        <button onClick={handleCancel} disabled={cancelling}
                          className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-all">
                          {cancelling ? 'Leaving...' : 'Leave'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
