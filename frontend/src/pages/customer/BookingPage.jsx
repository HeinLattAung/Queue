import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { CalendarCheck, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Clock, Users, Minus, Plus } from 'lucide-react';
import api from '../../services/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function BookingPage() {
  const { business, businessId } = useOutletContext();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '', partySize: 2,
    date: null, time: '', notes: '',
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const successRef = useRef(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDisabled = (day) => {
    const d = new Date(year, month, day);
    d.setHours(0,0,0,0);
    const t = new Date();
    t.setHours(0,0,0,0);
    return d < t;
  };

  const isSelected = (day) => {
    if (!form.date) return false;
    const sel = new Date(form.date);
    return day === sel.getDate() && month === sel.getMonth() && year === sel.getFullYear();
  };

  const selectDate = (day) => {
    if (isDisabled(day)) return;
    setForm({ ...form, date: new Date(year, month, day).toISOString() });
  };

  const adjustParty = (delta) => {
    setForm(prev => ({ ...prev, partySize: Math.max(1, Math.min(20, prev.partySize + delta)) }));
  };

  const goToStep = (s) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/public/bookings', {
        ...form,
        businessId,
        date: form.date,
      });
      setResult(data);
      setDirection(1);
      setStep(4);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 4 && successRef.current) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const els = successRef.current.querySelectorAll('[data-animate]');
      gsap.set(els, { opacity: 0, y: 20, scale: 0.95 });
      gsap.to(els, {
        opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)', delay: 0.15,
      });
    }
  }, [step]);

  if (step === 4) return (
    <div className="max-w-md mx-auto">
      <div ref={successRef} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
        <div data-animate className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h1 data-animate className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h1>
        <p data-animate className="text-slate-400 text-sm mb-8">Your reservation has been submitted</p>

        <div data-animate className="bg-white/5 rounded-2xl p-5 mb-6 space-y-3 text-left">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Name</span>
            <span className="text-white font-semibold text-sm">{result?.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Date</span>
            <span className="text-white font-semibold text-sm">
              {new Date(result?.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Time</span>
            <span className="text-white font-semibold text-sm">{result?.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Party Size</span>
            <span className="text-white font-semibold text-sm">{result?.partySize} guests</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Status</span>
            <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> {result?.status}
            </span>
          </div>
        </div>

        <div data-animate className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
          <p className="text-indigo-300 text-xs font-medium">Booking ID</p>
          <p className="text-white font-mono text-sm mt-1 tracking-wider">{result?._id}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
          <CalendarCheck size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Book a Table</h1>
        <p className="text-slate-400 mt-2 text-sm">Reserve your perfect dining experience</p>
      </motion.div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: step === s ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300
                ${step >= s ? 'gradient-primary text-white shadow-glow' : 'bg-white/5 text-slate-600'}`}
            >
              {s}
            </motion.div>
            {s < 3 && <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${step > s ? 'bg-indigo-500' : 'bg-white/5'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1: Date & Time */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                <CalendarCheck size={18} className="text-indigo-400" /> Select Date & Time
              </h2>

              {/* Calendar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-white font-semibold text-sm">{MONTHS[month]} {year}</span>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-[10px] font-semibold text-slate-600 uppercase py-1.5">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {days.map(day => (
                    <button key={day} onClick={() => selectDate(day)} disabled={isDisabled(day)}
                      className={`h-10 rounded-xl text-[13px] font-medium flex items-center justify-center transition-all
                        ${isDisabled(day) ? 'text-slate-700 cursor-not-allowed'
                          : isSelected(day) ? 'gradient-primary text-white shadow-glow'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <AnimatePresence>
                {form.date && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      <Clock size={12} className="inline mr-1" /> Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map(time => (
                        <button key={time} onClick={() => setForm({ ...form, time })}
                          className={`py-2.5 rounded-xl text-[13px] font-medium transition-all
                            ${form.time === time
                              ? 'gradient-primary text-white shadow-glow'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}>
                          {time}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button onClick={() => goToStep(2)} disabled={!form.date || !form.time}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-30 transition-all shadow-glow flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Party Size */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h2 className="text-white font-semibold text-lg mb-8 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> How many guests?
              </h2>

              <div className="flex items-center justify-center gap-8 py-8">
                <motion.button onClick={() => adjustParty(-1)} whileTap={{ scale: 0.92 }}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                  <Minus size={22} />
                </motion.button>
                <div className="text-center w-24">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={form.partySize}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="text-6xl font-bold text-white block"
                    >
                      {form.partySize}
                    </motion.span>
                  </AnimatePresence>
                  <p className="text-slate-500 text-sm mt-2">{form.partySize === 1 ? 'guest' : 'guests'}</p>
                </div>
                <motion.button onClick={() => adjustParty(1)} whileTap={{ scale: 0.92 }}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                  <Plus size={22} />
                </motion.button>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => goToStep(1)}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 transition-colors">
                  Back
                </button>
                <motion.button onClick={() => goToStep(3)} whileTap={{ scale: 0.98 }}
                  className="flex-1 gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-glow flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-4"
            >
              <h2 className="text-white font-semibold text-lg mb-2">Your Details</h2>

              {/* Summary */}
              <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <CalendarCheck size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">
                      {new Date(form.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-slate-500 text-xs">{form.time} &middot; {form.partySize} guests</p>
                  </div>
                </div>
                <button onClick={() => goToStep(1)} className="text-indigo-400 text-xs font-medium hover:text-indigo-300">Edit</button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} required
                  placeholder="+1 234 567 890"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email <span className="text-slate-600">(optional)</span>
                </label>
                <input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Notes <span className="text-slate-600">(optional)</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Special requests..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 resize-none focus:border-indigo-500/50 transition-all" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => goToStep(2)}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 transition-colors">
                  Back
                </button>
                <motion.button onClick={handleSubmit} disabled={loading || !form.customerName || !form.customerPhone}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-30 transition-all shadow-glow flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Confirm Booking <ArrowRight size={16} /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
