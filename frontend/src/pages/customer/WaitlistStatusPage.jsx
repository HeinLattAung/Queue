import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { gsap } from 'gsap';
import { Clock, Users, CheckCircle, UtensilsCrossed, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const statusSteps = [
  { key: 'waiting', label: 'In Queue', icon: Clock, color: 'amber' },
  { key: 'serving', label: 'Being Served', icon: UtensilsCrossed, color: 'emerald' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'blue' },
];

export default function WaitlistStatusPage() {
  const { id } = useParams();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const circleRef = useRef(null);
  const glowRef = useRef(null);

  const fetchPosition = async () => {
    try {
      const { data } = await api.get(`/public/waitlist/position/${id}`);
      setPosition(data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosition();
    const interval = setInterval(fetchPosition, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Animate SVG circle progress
  useEffect(() => {
    if (!position || position.status !== 'waiting' || !circleRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targetOffset = 264 - (264 / Math.max(position.totalWaiting, 1)) * (Math.max(position.totalWaiting, 1) - position.position + 1);
    gsap.fromTo(circleRef.current,
      { strokeDashoffset: 264 },
      { strokeDashoffset: targetOffset, duration: 1.2, ease: 'power2.out', delay: 0.3 }
    );
  }, [position]);

  // Pulsing glow for "being served"
  useEffect(() => {
    if (!position || position.status !== 'serving' || !glowRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(glowRef.current, {
      boxShadow: '0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, [position]);

  const Wrapper = ({ children }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 px-6 py-12">{children}</div>
    </div>
  );

  if (loading) return (
    <Wrapper>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </Wrapper>
  );

  if (!position) return (
    <Wrapper>
      <div className="max-w-md mx-auto text-center py-20">
        <h1 className="text-xl font-bold text-white">Entry Not Found</h1>
        <p className="text-slate-400 mt-2 text-sm">This waitlist entry doesn't exist or has expired.</p>
      </div>
    </Wrapper>
  );

  const currentStepIdx = statusSteps.findIndex(s => s.key === position.status);

  return (
    <Wrapper>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto"
    >
      {/* Status Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center mb-6">
        <div className="mb-6">
          <p className="text-slate-400 text-sm mb-2">Hello, {position.customerName}</p>
          {position.status === 'waiting' ? (
            <>
              <div className="relative inline-flex items-center justify-center w-28 h-28 mb-4">
                <svg className="absolute inset-0 w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle ref={circleRef} cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="6"
                    strokeDasharray={264} strokeDashoffset={264}
                    strokeLinecap="round" />
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
          ) : position.status === 'serving' ? (
            <>
              <div ref={glowRef} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed size={36} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Your table is ready!</h1>
              <p className="text-emerald-400 text-sm mt-1 font-medium">Please proceed to the host stand</p>
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
                        : isActive
                          ? 'bg-white/10'
                          : 'bg-white/5'
                      }`}
                  >
                    <step.icon size={18} className={isCurrent ? 'text-white' : isActive ? 'text-white/50' : 'text-white/20'} />
                  </motion.div>
                  <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-white' : 'text-slate-600'}`}>{step.label}</span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-1 mt-[-16px] rounded-full ${i < currentStepIdx ? 'bg-white/20' : 'bg-white/5'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Party Size</span>
            <span className="text-white font-semibold text-xs">{position.partySize} guests</span>
          </div>
          {position.status === 'waiting' && (
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">People Ahead</span>
              <span className="text-amber-400 font-semibold text-xs">{Math.max(0, position.position - 1)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Total in Queue</span>
            <span className="text-white font-semibold text-xs">{position.totalWaiting}</span>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button onClick={fetchPosition}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-all">
        <RefreshCw size={14} /> Refresh Status
      </button>

      <p className="text-center text-slate-600 text-[11px] mt-4">Auto-refreshes every 10 seconds</p>
    </motion.div>
    </Wrapper>
  );
}
