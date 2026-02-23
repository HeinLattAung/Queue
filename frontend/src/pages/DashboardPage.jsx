import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Users, UtensilsCrossed, CheckCircle2, ArrowRight, TrendingUp, RefreshCw } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import useCountUp from '../hooks/useCountUp';
import api from '../services/api';

const statusConfig = {
  serving: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  waiting: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-600', dot: 'bg-amber-500' },
  pending: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-600', dot: 'bg-blue-500' },
  confirmed: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-600', dot: 'bg-blue-500' },
  completed: { bg: 'bg-gray-50', border: 'border-gray-200/60', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200/60', text: 'text-red-500', dot: 'bg-red-400' },
};

function AnimatedValue({ value }) {
  const display = useCountUp(value, 1.2, 0.3);
  return <>{display}</>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ bookingCount: 0, waitlistCount: 0, servingCount: 0, completedCount: 0 });
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, waitlistRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/bookings/today'),
        api.get('/waitlist/today'),
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setWaitlist(waitlistRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateBookingStatus = async (id, status) => { await api.put(`/bookings/${id}/status`, { status }); fetchData(); };
  const updateWaitlistStatus = async (id, status) => { await api.put(`/waitlist/${id}/status`, { status }); fetchData(); };

  const statCards = [
    { label: 'Currently Serving', value: stats.servingCount, icon: UtensilsCrossed, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', change: '+12%' },
    { label: 'In Waitlist', value: stats.waitlistCount, icon: Clock, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', change: '+5%' },
    { label: 'Bookings Today', value: stats.bookingCount, icon: Users, gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', change: '+8%' },
    { label: 'Completed', value: stats.completedCount, icon: CheckCircle2, gradient: 'from-gray-400 to-gray-600', bg: 'bg-gray-50', change: '' },
  ];

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center h-[60vh]"
        >
          <div className="text-center">
            <div className="w-10 h-10 border-[3px] border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-4">Loading dashboard...</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Today's restaurant activity overview</p>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-soft">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Stat Cards */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {statCards.map(({ label, value, icon: Icon, gradient, bg, change }) => (
              <StaggerItem key={label}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-card hover:shadow-elevated transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    {change && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <TrendingUp size={10} /> {change}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight">
                    <AnimatedValue value={value} />
                  </p>
                  <p className="text-[13px] text-gray-400 mt-1">{label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Activity Sections */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6" delay={0.3}>
            {(() => {
              const serving = [
                ...bookings.filter(b => b.status === 'serving').map(b => ({ ...b, type: 'booking' })),
                ...waitlist.filter(w => w.status === 'serving').map(w => ({ ...w, type: 'waitlist' })),
              ];
              const waiting = waitlist.filter(w => w.status === 'waiting');
              const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
              const completed = [
                ...bookings.filter(b => b.status === 'completed').map(b => ({ ...b, type: 'booking' })),
                ...waitlist.filter(w => w.status === 'completed').map(w => ({ ...w, type: 'waitlist' })),
              ];
              return (
                <>
                  <StaggerItem>
                    <Section title="Currently Serving" icon={UtensilsCrossed} count={serving.length} items={serving}
                      color="emerald" onAction={(item) =>
                        item.type === 'booking' ? updateBookingStatus(item._id, 'completed') : updateWaitlistStatus(item._id, 'completed')
                      } actionLabel="Complete" />
                  </StaggerItem>
                  <StaggerItem>
                    <Section title="Waitlist" icon={Clock} count={waiting.length} items={waiting}
                      color="amber" onAction={(item) => updateWaitlistStatus(item._id, 'serving')} actionLabel="Serve Now" />
                  </StaggerItem>
                  <StaggerItem>
                    <Section title="Upcoming Bookings" icon={Users} count={upcoming.length} items={upcoming}
                      color="blue" onAction={(item) => updateBookingStatus(item._id, 'serving')} actionLabel="Start Serving" />
                  </StaggerItem>
                  <StaggerItem>
                    <Section title="Completed" icon={CheckCircle2} count={completed.length} items={completed.slice(0, 8)}
                      color="gray" />
                  </StaggerItem>
                </>
              );
            })()}
          </StaggerContainer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, icon: Icon, count, items, color, onAction, actionLabel }) {
  const colorMap = {
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-indigo-600',
    gray: 'from-gray-400 to-gray-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
            <Icon size={15} className="text-white" />
          </div>
          <h2 className="font-semibold text-gray-900 text-[15px]">{title}</h2>
        </div>
        <span className="text-[12px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{count}</span>
      </div>
      <div className="divide-y divide-gray-50/80 max-h-[320px] overflow-y-auto">
        {items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No entries yet</p>
          </div>
        )}
        {items.map((item) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          return (
            <div key={item._id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[13px] font-bold text-gray-600 shrink-0">
                  {item.customerName?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.customerName}</p>
                  <p className="text-[11px] text-gray-400">Party of {item.partySize} {item.time ? `\u00B7 ${item.time}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {item.status}
                </span>
                {onAction && (
                  <button onClick={() => onAction(item)}
                    className="opacity-0 group-hover:opacity-100 text-primary-600 hover:text-primary-700 text-[12px] font-semibold flex items-center gap-1 transition-all duration-200 bg-primary-50 px-2.5 py-1 rounded-lg">
                    {actionLabel} <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
