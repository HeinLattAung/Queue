import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { gsap } from 'gsap';
import { Sparkles, Building2, Users, ArrowRight, CalendarCheck, Clock, UtensilsCrossed, UserPlus, QrCode, LayoutDashboard, BarChart3, Settings } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const blobsRef = useRef(null);

  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: `random(-40, 40)`,
        y: `random(-40, 40)`,
        duration: `random(6, 10)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.7,
      });
    });
  }, []);

  const handleCustomerGo = () => {
    if (!businessId.trim()) return;
    setShowCustomerInput(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
      {/* Background blobs */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Sparkles size={30} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">QueueAdmin</h1>
          <p className="text-slate-400 mt-3 text-lg">Smart restaurant queue & booking management</p>
        </motion.div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Business Portal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <Building2 size={26} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Business Portal</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Manage your restaurant — handle bookings, waitlists, tables, staff, and real-time operations.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <LayoutDashboard size={12} /> Dashboard
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <BarChart3 size={12} /> Analytics
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Settings size={12} /> Settings
                </div>
              </div>
              <div className="mt-auto space-y-3">
                <motion.button
                  onClick={() => navigate('/login')}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Building2 size={16} /> Sign In to Dashboard
                </motion.button>
                <motion.button
                  onClick={() => navigate('/signup')}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/5 border border-white/10 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} /> Register Your Restaurant
                </motion.button>
                <p className="text-slate-600 text-xs text-center mt-1">
                  For restaurant owners and staff members
                </p>
              </div>
            </div>
          </motion.div>

          {/* Customer Portal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                <Users size={26} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Customer Portal</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Book a table, pre-order meals, or join the waitlist.
              </p>

              {!showCustomerInput ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <CalendarCheck size={12} /> Book Table
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <UtensilsCrossed size={12} /> Order Meals
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Clock size={12} /> Join Queue
                    </div>
                  </div>
                  <div className="mt-auto space-y-3">
                    <motion.button
                      onClick={() => navigate('/customer/login')}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <UserPlus size={16} /> Sign In / Create Account
                    </motion.button>
                    <motion.button
                      onClick={() => setShowCustomerInput(true)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white/5 border border-white/10 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <QrCode size={16} /> Use Business ID / Scan QR
                    </motion.button>
                    <p className="text-slate-600 text-xs text-center mt-1">
                      Create an account to track bookings, or use a business ID for quick access
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-auto space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Restaurant Business ID
                    </label>
                    <input
                      value={businessId}
                      onChange={e => setBusinessId(e.target.value)}
                      placeholder="Paste business ID here..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 transition-all"
                    />
                    <p className="text-slate-600 text-[10px] mt-1.5">Ask the restaurant for their business ID or scan their QR code</p>
                  </div>

                  {businessId.trim() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <button
                        onClick={() => navigate(`/booking?businessId=${businessId.trim()}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <CalendarCheck size={18} className="text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-white text-sm font-semibold">Book a Table</p>
                          <p className="text-slate-500 text-xs">Reserve your dining experience</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                      </button>

                      <button
                        onClick={() => navigate(`/booking/meal?businessId=${businessId.trim()}&type=meal`)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                          <UtensilsCrossed size={18} className="text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-white text-sm font-semibold">Book a Meal</p>
                          <p className="text-slate-500 text-xs">Pre-order your meal</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                      </button>

                      <button
                        onClick={() => navigate(`/waitlist?businessId=${businessId.trim()}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                          <Clock size={18} className="text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-white text-sm font-semibold">Join Waitlist</p>
                          <p className="text-slate-500 text-xs">Get in line digitally</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                      </button>
                    </motion.div>
                  )}

                  <button
                    onClick={() => { setShowCustomerInput(false); setBusinessId(''); }}
                    className="w-full py-2.5 text-slate-500 text-xs font-medium hover:text-slate-300 transition-colors"
                  >
                    &larr; Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
