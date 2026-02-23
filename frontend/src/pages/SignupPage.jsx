import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { Sparkles, ArrowRight, Mail, Lock, User, MapPin, Store } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', restaurantName: '', location: '' });
  const { signup, loading, error } = useAuthStore();
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await signup(form);
    if (success) navigate('/dashboard');
  };

  const fields = [
    { name: 'name', label: 'Your Name', icon: User, type: 'text', placeholder: 'John Doe', required: true },
    { name: 'email', label: 'Email Address', icon: Mail, type: 'email', placeholder: 'you@restaurant.com', required: true },
    { name: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: 'Min 6 characters', required: true, minLength: 6 },
    { name: 'restaurantName', label: 'Restaurant Name', icon: Store, type: 'text', placeholder: 'My Restaurant', required: true },
    { name: 'location', label: 'Location', icon: MapPin, type: 'text', placeholder: 'City, Country' },
  ];

  const fieldVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  };

  return (
    <div className="min-h-screen flex gradient-mesh">
      {/* Left Panel */}
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
            Start managing<br />in minutes
          </h1>
          <p data-animate className="text-white/70 text-lg leading-relaxed">
            Set up your restaurant profile and start accepting bookings and managing queues instantly.
          </p>
          <div data-animate className="mt-12 space-y-4">
            {['Free setup, no credit card', 'Unlimited bookings & waitlists', 'QR code generation included'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <p className="text-white/80 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:hidden flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">QueueAdmin</h1>
          </motion.div>

          <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-400 mt-2 text-[15px]">Get started with your business portal</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {fields.map(({ name, label, icon: Icon, type, placeholder, required, minLength }, index) => (
              <motion.div key={name} custom={index + 1} variants={fieldVariants} initial="hidden" animate="visible">
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    name={name} type={type} value={form[name]} onChange={handleChange}
                    required={required} minLength={minLength} placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-300 transition-all duration-200 hover:border-gray-300"
                  />
                </div>
              </motion.div>
            ))}

            <motion.div custom={fields.length + 1} variants={fieldVariants} initial="hidden" animate="visible">
              <motion.button type="submit" disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-glow flex items-center justify-center gap-2 group mt-6">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.p custom={fields.length + 2} variants={fieldVariants} initial="hidden" animate="visible" className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Sign In
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
