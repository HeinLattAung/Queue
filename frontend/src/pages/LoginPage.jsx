import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { Sparkles, ArrowRight, Mail, Lock } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const brandingRef = useRef(null);

  useEffect(() => {
    if (!brandingRef.current) return;
    const els = brandingRef.current.querySelectorAll('[data-animate]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set(els, { opacity: 0, y: 20 });
    gsap.to(els, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out', delay: 0.2,
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/dashboard');
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.1 + i * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  };

  return (
    <div className="min-h-screen flex gradient-mesh">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div ref={brandingRef} className="relative z-10 max-w-md">
          <div data-animate className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 data-animate className="text-4xl font-bold text-white mb-4 leading-tight">
            Manage your restaurant<br />like never before
          </h1>
          <p data-animate className="text-white/70 text-lg leading-relaxed">
            Streamline queues, bookings, and operations with our intelligent management platform.
          </p>
          <div data-animate className="mt-12 flex gap-8">
            <div>
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-white/50 text-sm mt-1">Customer Satisfaction</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">2x</p>
              <p className="text-white/50 text-sm mt-1">Faster Seating</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50%</p>
              <p className="text-white/50 text-sm mt-1">Less Wait Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:hidden flex items-center gap-3 mb-10"
          >
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">QueueAdmin</h1>
          </motion.div>

          <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-400 mt-2 text-[15px]">Sign in to your admin portal</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@restaurant.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-300 transition-all duration-200 hover:border-gray-300"
                />
              </div>
            </motion.div>

            <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-300 transition-all duration-200 hover:border-gray-300"
                />
              </div>
            </motion.div>

            <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
              <motion.button
                type="submit" disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-glow flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.p custom={4} variants={fieldVariants} initial="hidden" animate="visible" className="text-center text-sm text-gray-400 mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Create Account
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
