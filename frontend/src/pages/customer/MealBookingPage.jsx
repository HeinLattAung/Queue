import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { UtensilsCrossed, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Clock, Minus, Plus, Link as LinkIcon } from 'lucide-react';
import useCustomerBookingStore from '../../store/customerBookingStore';
import api from '../../services/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function MealBookingPage() {
  const { business, businessId } = useOutletContext();
  const store = useCustomerBookingStore();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [meals, setMeals] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', notes: '' });
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const successRef = useRef(null);

  useEffect(() => {
    if (businessId) {
      api.get(`/public/business/${businessId}/meals`).then(({ data }) => setMeals(data)).catch(() => {});
    }
  }, [businessId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isDisabled = (day) => { const d = new Date(year, month, day); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t; };
  const isSelected = (day) => { if (!selectedDate) return false; const sel = new Date(selectedDate); return day === sel.getDate() && month === sel.getMonth() && year === sel.getFullYear(); };

  const toggleMeal = (meal) => {
    setSelectedMeals(prev => prev.find(m => m._id === meal._id) ? prev.filter(m => m._id !== meal._id) : [...prev, meal]);
  };

  const goToStep = (s) => { setDirection(s > step ? 1 : -1); setStep(s); };

  const timeSlots = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const handleSubmit = async () => {
    setLoading(true);
    store.setDate(selectedDate);
    store.setTime(selectedTime);
    store.setPartySize(partySize);
    store.setSelectedMeals(selectedMeals);
    store.setCustomerInfo(form);
    const booking = await store.createBooking(businessId, 'meal');
    if (booking) { setResult(booking); setDirection(1); setStep(4); }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 4 && successRef.current) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const els = successRef.current.querySelectorAll('[data-animate]');
      gsap.set(els, { opacity: 0, y: 20, scale: 0.95 });
      gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)', delay: 0.15 });
    }
  }, [step]);

  const copyAccessLink = () => {
    if (!result?.accessToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/booking/status?token=${result.accessToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [...new Set(meals.map(m => m.category).filter(Boolean))];
  const total = selectedMeals.reduce((sum, m) => sum + m.price, 0);

  if (step === 4) return (
    <div className="max-w-md mx-auto">
      <div ref={successRef} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
        <div data-animate className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h1 data-animate className="text-2xl font-bold text-white mb-2">Meal Booking Confirmed!</h1>
        <div data-animate className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
          <p className="text-indigo-300 text-xs font-medium">Booking Number</p>
          <p className="text-white font-mono text-lg mt-1 tracking-wider">{result?.bookingNumber}</p>
        </div>
        <div data-animate className="flex gap-3">
          <button onClick={copyAccessLink}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              copied ? 'bg-emerald-500 text-white' : 'gradient-primary text-white shadow-glow hover:opacity-90'
            }`}>
            {copied ? <><CheckCircle size={16} /> Copied!</> : <><LinkIcon size={16} /> Copy Status Link</>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20">
          <UtensilsCrossed size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Book a Meal</h1>
        <p className="text-slate-400 mt-2 text-sm">Pre-order your meal experience</p>
      </motion.div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <motion.div animate={{ scale: step === s ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300 ${step >= s ? 'gradient-primary text-white shadow-glow' : 'bg-white/5 text-slate-600'}`}>
              {s}
            </motion.div>
            {s < 3 && <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${step > s ? 'bg-indigo-500' : 'bg-white/5'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-white font-semibold text-lg mb-5">Select Meals</h2>
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat} className="mb-4">
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{cat}</h3>
                  <div className="space-y-2">
                    {meals.filter(m => m.category === cat && m.available).map(meal => {
                      const isChosen = selectedMeals.find(m => m._id === meal._id);
                      return (
                        <button key={meal._id} onClick={() => toggleMeal(meal)}
                          className={`w-full text-left p-3 rounded-xl transition-all ${isChosen ? 'gradient-primary text-white shadow-glow' : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm">{meal.name}</p>
                              {meal.description && <p className={`text-xs mt-0.5 ${isChosen ? 'text-white/70' : 'text-slate-500'}`}>{meal.description}</p>}
                            </div>
                            <span className="font-bold text-sm">${meal.price.toFixed(2)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <div className="space-y-2">
                  {meals.filter(m => m.available).map(meal => {
                    const isChosen = selectedMeals.find(m => m._id === meal._id);
                    return (
                      <button key={meal._id} onClick={() => toggleMeal(meal)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${isChosen ? 'gradient-primary text-white shadow-glow' : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'}`}>
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-sm">{meal.name}</p>
                          <span className="font-bold text-sm">${meal.price.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedMeals.length > 0 && (
                <div className="mt-4 bg-white/5 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{selectedMeals.length} items selected</span>
                  <span className="text-white font-bold">${total.toFixed(2)}</span>
                </div>
              )}
              <motion.button onClick={() => goToStep(2)} disabled={selectedMeals.length === 0} whileTap={{ scale: 0.98 }}
                className="w-full mt-6 gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-30 transition-all shadow-glow flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-white font-semibold text-lg mb-5">Date, Time & Party Size</h2>

              {/* Party Size */}
              <div className="flex items-center justify-center gap-6 py-3 mb-4">
                <motion.button onClick={() => setPartySize(Math.max(1, partySize - 1))} whileTap={{ scale: 0.92 }}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Minus size={18} /></motion.button>
                <div className="text-center w-20">
                  <span className="text-4xl font-bold text-white block">{partySize}</span>
                  <p className="text-slate-500 text-xs">{partySize === 1 ? 'guest' : 'guests'}</p>
                </div>
                <motion.button onClick={() => setPartySize(Math.min(20, partySize + 1))} whileTap={{ scale: 0.92 }}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Plus size={18} /></motion.button>
              </div>

              {/* Calendar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"><ChevronLeft size={16} /></button>
                  <span className="text-white font-semibold text-sm">{MONTHS[month]} {year}</span>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[10px] font-semibold text-slate-600 uppercase py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {days.map(day => (
                    <button key={day} onClick={() => { if (!isDisabled(day)) { setSelectedDate(new Date(year, month, day).toISOString()); setSelectedTime(''); } }} disabled={isDisabled(day)}
                      className={`h-9 rounded-lg text-[12px] font-medium flex items-center justify-center transition-all ${isDisabled(day) ? 'text-slate-700 cursor-not-allowed' : isSelected(day) ? 'gradient-primary text-white shadow-glow' : 'text-slate-300 hover:bg-white/10'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2"><Clock size={12} className="inline mr-1" /> Time</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {timeSlots.map(t => (
                      <button key={t} onClick={() => setSelectedTime(t)}
                        className={`py-2 rounded-lg text-[12px] font-medium transition-all ${selectedTime === t ? 'gradient-primary text-white shadow-glow' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'}`}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => goToStep(1)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10">Back</button>
                <motion.button onClick={() => goToStep(3)} disabled={!selectedDate || !selectedTime} whileTap={{ scale: 0.98 }}
                  className="flex-1 gradient-primary text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-30 shadow-glow flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-4">
              <h2 className="text-white font-semibold text-lg mb-2">Your Details</h2>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} required placeholder="+1 234 567 890"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Email <span className="text-slate-600">(optional)</span></label>
                <input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="you@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes <span className="text-slate-600">(optional)</span></label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Special requests..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 resize-none focus:border-indigo-500/50 transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => goToStep(2)} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10">Back</button>
                <motion.button onClick={handleSubmit} disabled={loading || !form.customerName || !form.customerPhone} whileTap={{ scale: 0.98 }}
                  className="flex-1 gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-30 shadow-glow flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Confirm <ArrowRight size={16} /></>}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
