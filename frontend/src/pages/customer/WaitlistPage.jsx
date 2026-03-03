import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { Clock, ArrowRight, CheckCircle, Minus, Plus, Link as LinkIcon } from 'lucide-react';
import useCustomerWaitlistStore from '../../store/customerWaitlistStore';

export default function WaitlistPage() {
  const { business, businessId } = useOutletContext();
  const store = useCustomerWaitlistStore();
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', partySize: 2, notes: '' });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const successRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await store.joinWaitlist(businessId, form);
    if (result) setStep('success');
    setLoading(false);
  };

  useEffect(() => {
    if (step === 'success' && successRef.current) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const els = successRef.current.querySelectorAll('[data-animate]');
      gsap.set(els, { opacity: 0, y: 20, scale: 0.95 });
      gsap.to(els, {
        opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)', delay: 0.15,
      });
    }
  }, [step]);

  const adjustParty = (delta) => {
    setForm(prev => ({ ...prev, partySize: Math.max(1, Math.min(20, prev.partySize + delta)) }));
  };

  const copyAccessLink = () => {
    if (!store.entry?.accessToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/waitlist/status?token=${store.entry.accessToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md sm:max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {step === 'success' ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div ref={successRef} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
              <div data-animate className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h1 data-animate className="text-2xl font-bold text-white mb-2">You're on the list!</h1>
              <p data-animate className="text-slate-400 text-sm mb-8">We'll notify you when your table is ready</p>

              <div data-animate className="bg-white/5 rounded-2xl p-5 mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Name</span>
                  <span className="text-white font-semibold text-sm">{store.entry?.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Party Size</span>
                  <span className="text-white font-semibold text-sm">{store.entry?.partySize} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Waiting
                  </span>
                </div>
              </div>

              <div data-animate className="flex gap-3">
                <button onClick={copyAccessLink}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    copied ? 'bg-emerald-500 text-white' : 'gradient-primary text-white shadow-glow hover:opacity-90'
                  }`}>
                  {copied ? <><CheckCircle size={16} /> Copied!</> : <><LinkIcon size={16} /> Copy Status Link</>}
                </button>
              </div>

              <div data-animate className="mt-4">
                <a href={`/waitlist/status?token=${store.entry?.accessToken}`}
                  className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
                  Track My Position &rarr;
                </a>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/20">
                <Clock size={30} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Join the Waitlist</h1>
              <p className="text-slate-400 mt-2 text-sm">No reservation? No problem. Get in line digitally.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Party Size</label>
                <div className="flex items-center justify-center gap-6">
                  <motion.button type="button" onClick={() => adjustParty(-1)} whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <Minus size={18} />
                  </motion.button>
                  <div className="text-center w-20">
                    <AnimatePresence mode="wait">
                      <motion.span key={form.partySize} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.12 }} className="text-4xl font-bold text-white block">
                        {form.partySize}
                      </motion.span>
                    </AnimatePresence>
                    <p className="text-slate-500 text-xs mt-1">{form.partySize === 1 ? 'guest' : 'guests'}</p>
                  </div>
                  <motion.button type="button" onClick={() => adjustParty(1)} whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <Plus size={18} />
                  </motion.button>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
                <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/8 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} required
                  placeholder="+1 234 567 890"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/8 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email <span className="text-slate-600">(optional)</span>
                </label>
                <input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/8 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Special Notes <span className="text-slate-600">(optional)</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any dietary requirements or preferences..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 resize-none focus:border-indigo-500/50 focus:bg-white/8 transition-all" />
              </div>

              <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-glow flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Join Waitlist <ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
