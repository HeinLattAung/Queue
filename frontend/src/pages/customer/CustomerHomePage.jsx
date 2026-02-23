import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { CalendarCheck, Clock, UtensilsCrossed, ArrowRight, LogOut, User, QrCode, Search, History } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const statusColors = {
  pending: 'text-blue-400 bg-blue-500/10',
  confirmed: 'text-blue-400 bg-blue-500/10',
  arrived: 'text-indigo-400 bg-indigo-500/10',
  serving: 'text-emerald-400 bg-emerald-500/10',
  completed: 'text-slate-400 bg-white/5',
  cancelled: 'text-red-400 bg-red-500/10',
};

export default function CustomerHomePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [tab, setTab] = useState('actions'); // 'actions' | 'bookings'
  const blobsRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/customer/login'); return; }
    // Fetch customer's bookings
    api.get('/bookings/my')
      .then(({ data }) => setBookings(data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [user]);

  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: `random(-30, 30)`, y: `random(-30, 30)`,
        duration: `random(6, 10)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.5,
      });
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'arrived', 'serving'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-6 py-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Hello, {user?.name?.split(' ')[0]}</p>
              <p className="text-slate-500 text-xs">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all">
            <LogOut size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('actions')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'actions' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            New Booking
          </button>
          <button onClick={() => setTab('bookings')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === 'bookings' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            <History size={14} /> My Bookings
            {activeBookings.length > 0 && (
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === 'bookings' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'}`}>
                {activeBookings.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'actions' ? (
            <motion.div key="actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {/* Business ID Input */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-4">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  <Search size={12} className="inline mr-1" /> Enter Restaurant ID
                </label>
                <input
                  value={businessId}
                  onChange={e => setBusinessId(e.target.value)}
                  placeholder="Paste business ID or scan QR code..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 transition-all mb-2"
                />
                <p className="text-slate-600 text-[10px]">Get the ID from the restaurant's QR code or ask the staff</p>
              </div>

              {/* Action Buttons */}
              <AnimatePresence>
                {businessId.trim() && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3">
                    <button
                      onClick={() => navigate(`/booking?businessId=${businessId.trim()}`)}
                      className="w-full flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/8 hover:border-white/20 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        <CalendarCheck size={22} className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white text-sm font-semibold">Book a Table</p>
                        <p className="text-slate-500 text-xs">Reserve with real-time availability</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      onClick={() => navigate(`/booking/meal?businessId=${businessId.trim()}&type=meal`)}
                      className="w-full flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/8 hover:border-white/20 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        <UtensilsCrossed size={22} className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white text-sm font-semibold">Book a Meal</p>
                        <p className="text-slate-500 text-xs">Pre-order your dining experience</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      onClick={() => navigate(`/waitlist?businessId=${businessId.trim()}`)}
                      className="w-full flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/8 hover:border-white/20 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        <Clock size={22} className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white text-sm font-semibold">Join Waitlist</p>
                        <p className="text-slate-500 text-xs">Get in line digitally</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="bookings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {loadingBookings ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck size={28} className="text-slate-600" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">No bookings yet</h3>
                  <p className="text-slate-500 text-sm">Your booking history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Bookings */}
                  {activeBookings.length > 0 && (
                    <div>
                      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Active</h3>
                      <div className="space-y-2">
                        {activeBookings.map(booking => (
                          <button key={booking._id}
                            onClick={() => booking.accessToken && navigate(`/booking/status?token=${booking.accessToken}`)}
                            className="w-full text-left bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-mono text-xs font-bold">#{booking.bookingNumber}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${statusColors[booking.status] || 'text-slate-400 bg-white/5'}`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-white text-sm font-semibold">
                              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.time}
                            </p>
                            <p className="text-slate-500 text-xs mt-0.5">
                              {booking.partySize} guests {booking.bookingType === 'meal' ? '- Meal Booking' : '- Table Booking'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Bookings */}
                  {pastBookings.length > 0 && (
                    <div>
                      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Past</h3>
                      <div className="space-y-2">
                        {pastBookings.slice(0, 10).map(booking => (
                          <div key={booking._id}
                            className="bg-white/3 border border-white/5 rounded-2xl p-4"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-500 font-mono text-xs">#{booking.bookingNumber}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${statusColors[booking.status] || 'text-slate-400 bg-white/5'}`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-slate-400 text-sm">
                              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.time}
                            </p>
                            <p className="text-slate-600 text-xs mt-0.5">{booking.partySize} guests</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
