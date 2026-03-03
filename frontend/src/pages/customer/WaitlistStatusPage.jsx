import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { gsap } from 'gsap';
import { Clock, Users, CheckCircle, UtensilsCrossed, XCircle, ThumbsUp } from 'lucide-react';
import useSocket from '../../hooks/useSocket';
import api from '../../services/api';

const statusSteps = [
  { key: 'waiting', label: 'In Queue', icon: Clock, color: 'amber' },
  { key: 'approved', label: 'Approved', icon: ThumbsUp, color: 'emerald' },
  { key: 'serving', label: 'Being Served', icon: UtensilsCrossed, color: 'emerald' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'blue' },
];

export default function WaitlistStatusPage() {
  const { tokenData, token } = useOutletContext();
  const [entry, setEntry] = useState(tokenData);
  const [position, setPosition] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const circleRef = useRef(null);
  const glowRef = useRef(null);

  const { on, off } = useSocket(entry ? `waitlist:${entry._id}` : null);

  // Listen for real-time updates
  useEffect(() => {
    const handleUpdate = (data) => setEntry(data);
    const handleApproved = (data) => setEntry(data);
    const handleRejected = (data) => setEntry(data);

    on('waitlist:updated', handleUpdate);
    on('waitlist:approved', handleApproved);
    on('waitlist:rejected', handleRejected);

    return () => {
      off('waitlist:updated', handleUpdate);
      off('waitlist:approved', handleApproved);
      off('waitlist:rejected', handleRejected);
    };
  }, [on, off]);

  // Fetch position
  useEffect(() => {
    if (!entry?._id) return;
    const fetchPos = () => api.get(`/public/waitlist/position/${entry._id}`).then(({ data }) => setPosition(data)).catch(() => {});
    fetchPos();
    const interval = setInterval(fetchPos, 15000);
    return () => clearInterval(interval);
  }, [entry?._id, entry?.status]);

  // Animate SVG circle
  useEffect(() => {
    if (!position || position.status !== 'waiting' || !circleRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targetOffset = 264 - (264 / Math.max(position.totalWaiting, 1)) * (Math.max(position.totalWaiting, 1) - position.position + 1);
    gsap.fromTo(circleRef.current,
      { strokeDashoffset: 264 },
      { strokeDashoffset: targetOffset, duration: 1.2, ease: 'power2.out', delay: 0.3 }
    );
  }, [position]);

  // Pulsing glow for serving/approved
  useEffect(() => {
    if (!entry || !['serving', 'approved'].includes(entry.status) || !glowRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(glowRef.current, {
      boxShadow: '0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
      duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }, [entry?.status]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/public/waitlist/${entry._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setEntry(data);
      setShowCancel(false);
    } catch {}
    setCancelling(false);
  };

  if (!entry) return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-xl font-bold text-white">Entry Not Found</h1>
      <p className="text-slate-400 mt-2 text-sm">This waitlist entry doesn't exist or has expired.</p>
    </div>
  );

  const isCancelled = entry.status === 'cancelled';
  const isRejected = entry.status === 'rejected';
  const currentStepIdx = (isCancelled || isRejected) ? -1 : statusSteps.findIndex(s => s.key === entry.status);
  const canCancel = ['waiting', 'approved'].includes(entry.status);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-md sm:max-w-lg mx-auto">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center mb-6">
        <div className="mb-6">
          <p className="text-slate-400 text-sm mb-2">Hello, {entry.customerName}</p>

          {isRejected ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle size={36} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Entry Rejected</h1>
              {entry.rejectedReason && <p className="text-red-400 text-sm mt-1">{entry.rejectedReason}</p>}
            </>
          ) : isCancelled ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle size={36} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Entry Cancelled</h1>
            </>
          ) : entry.status === 'waiting' && position ? (
            <>
              <div className="relative inline-flex items-center justify-center w-28 h-28 mb-4">
                <svg className="absolute inset-0 w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle ref={circleRef} cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="6"
                    strokeDasharray={264} strokeDashoffset={264} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-bold text-white">#{position.position}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">in queue</p>
                </div>
              </div>
              <h1 className="text-xl font-bold text-white">You're in the queue</h1>
              <p className="text-slate-400 text-sm mt-1">Estimated wait: ~{position.estimatedWait} min</p>
            </>
          ) : entry.status === 'approved' ? (
            <>
              <div ref={glowRef} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <ThumbsUp size={36} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">You've been approved!</h1>
              <p className="text-emerald-400 text-sm mt-1 font-medium">Please proceed to the host stand</p>
            </>
          ) : entry.status === 'serving' ? (
            <>
              <div ref={glowRef} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed size={36} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Your table is ready!</h1>
              <p className="text-emerald-400 text-sm mt-1 font-medium">Enjoy your meal!</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={36} className="text-blue-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Visit Complete</h1>
              <p className="text-slate-400 text-sm mt-1">Thank you for dining with us!</p>
            </>
          )}
        </div>

        {/* Progress Steps */}
        {!isCancelled && !isRejected && (
          <div className="flex items-center justify-center gap-0 mb-6">
            {statusSteps.map((step, i) => {
              const isActive = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center relative">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.4, ease: 'backOut' }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                        ${isCurrent
                          ? `bg-gradient-to-br ${step.color === 'amber' ? 'from-amber-500 to-orange-600' : step.color === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'} shadow-lg`
                          : isActive ? 'bg-white/10' : 'bg-white/5'
                        }`}>
                      <step.icon size={18} className={isCurrent ? 'text-white' : isActive ? 'text-white/50' : 'text-white/20'} />
                    </motion.div>
                    <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-white' : 'text-slate-600'}`}>{step.label}</span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`w-10 h-0.5 mx-1 mt-[-16px] rounded-full ${i < currentStepIdx ? 'bg-white/20' : 'bg-white/5'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Party Size</span>
            <span className="text-white font-semibold text-xs">{entry.partySize} guests</span>
          </div>
          {position && entry.status === 'waiting' && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">People Ahead</span>
                <span className="text-amber-400 font-semibold text-xs">{Math.max(0, position.position - 1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Total in Queue</span>
                <span className="text-white font-semibold text-xs">{position.totalWaiting}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Button */}
      {canCancel && (
        <>
          <button onClick={() => setShowCancel(true)}
            className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all">
            Cancel Entry
          </button>

          {showCancel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-white font-semibold text-lg mb-2">Leave Waitlist?</h3>
                <p className="text-slate-400 text-sm mb-6">You'll lose your position in the queue.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancel(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/10">
                    Stay in Queue
                  </button>
                  <button onClick={handleCancel} disabled={cancelling}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
                    {cancelling ? 'Cancelling...' : 'Yes, Leave'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
