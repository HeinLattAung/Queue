import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Clock, Users, UtensilsCrossed, CheckCircle2, ArrowRight, TrendingUp, RefreshCw,
  ThumbsUp, ThumbsDown, X, PhoneForwarded, SkipForward, Bell, Volume2,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import useCountUp from '../hooks/useCountUp';
import useSocket from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { onReconnect } from '../services/socket';

const statusConfig = {
  serving: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  waiting: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-600', dot: 'bg-amber-500' },
  approved: { bg: 'bg-green-50', border: 'border-green-200/60', text: 'text-green-600', dot: 'bg-green-500' },
  pending: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-600', dot: 'bg-blue-500' },
  confirmed: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-600', dot: 'bg-blue-500' },
  arrived: { bg: 'bg-indigo-50', border: 'border-indigo-200/60', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-gray-50', border: 'border-gray-200/60', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200/60', text: 'text-red-500', dot: 'bg-red-400' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200/60', text: 'text-red-500', dot: 'bg-red-400' },
};

function AnimatedValue({ value }) {
  const display = useCountUp(value, 1.2, 0.3);
  return <>{display}</>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ bookingCount: 0, waitlistCount: 0, servingCount: 0, completedCount: 0 });
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [callingNext, setCallingNext] = useState(false);

  const businessId = user?.businessId;
  const { on, off } = useSocket(businessId ? `business:${businessId}` : null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-sync state on socket reconnect (catches events missed during disconnect)
  useEffect(() => {
    return onReconnect(fetchData);
  }, [fetchData]);

  // Real-time queue events
  useEffect(() => {
    // Legacy booking events
    const handleBooking = (data) => {
      setToast({ message: `Booking updated: ${data.customerName}`, type: 'booking' });
      fetchData();
    };

    // New queue events
    const handleQueueNew = (data) => {
      setToast({ message: `New in queue: ${data.entry?.customerName}`, type: 'queue' });
      setWaitlist(prev => {
        if (prev.find(e => e._id === data.entry._id)) return prev;
        return [...prev, data.entry];
      });
      setStats(prev => ({ ...prev, waitlistCount: data.totalWaiting }));
    };

    const handleQueueUpdate = (data) => {
      const { entry, action } = data;
      setWaitlist(prev => prev.map(e => e._id === entry._id ? entry : e));

      if (action === 'called') {
        setToast({ message: `Called: ${entry.customerName}`, type: 'queue' });
        setStats(prev => ({
          ...prev,
          servingCount: prev.servingCount + 1,
          waitlistCount: Math.max(0, prev.waitlistCount - 1),
        }));
      } else if (action === 'approved') {
        setToast({ message: `Approved: ${entry.customerName}`, type: 'queue' });
      } else if (action === 'skipped' || action === 'cancelled') {
        setToast({ message: `${action === 'skipped' ? 'Skipped' : 'Cancelled'}: ${entry.customerName}`, type: 'queue' });
        setStats(prev => ({ ...prev, waitlistCount: Math.max(0, prev.waitlistCount - 1) }));
      } else if (action === 'rejected') {
        setToast({ message: `Rejected: ${entry.customerName}`, type: 'queue' });
      }
    };

    const handleQueueRemove = (data) => {
      setWaitlist(prev => prev.filter(e => e._id !== data.entryId));
      setStats(prev => ({ ...prev, completedCount: prev.completedCount + 1, servingCount: Math.max(0, prev.servingCount - 1) }));
    };

    const handlePositionsShifted = (data) => {
      setWaitlist(prev => prev.map(e => {
        const shifted = data.entries?.find(s => s._id === e._id);
        return shifted ? { ...e, position: shifted.position } : e;
      }));
    };

    on('booking:updated', handleBooking);
    on('queue:new', handleQueueNew);
    on('queue:update', handleQueueUpdate);
    on('queue:remove', handleQueueRemove);
    on('queue:positions-shifted', handlePositionsShifted);
    on('availability:changed', fetchData);

    return () => {
      off('booking:updated', handleBooking);
      off('queue:new', handleQueueNew);
      off('queue:update', handleQueueUpdate);
      off('queue:remove', handleQueueRemove);
      off('queue:positions-shifted', handlePositionsShifted);
      off('availability:changed', fetchData);
    };
  }, [on, off, fetchData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const updateBookingStatus = async (id, status) => { await api.put(`/bookings/${id}/status`, { status }); fetchData(); };
  const approveWaitlist = async (id) => { await api.put(`/waitlist/${id}/approve`); };
  const rejectWaitlist = async (id) => {
    await api.put(`/waitlist/${id}/reject`, { reason: rejectReason });
    setRejectModal(null);
    setRejectReason('');
  };

  const callNext = async () => {
    setCallingNext(true);
    try {
      await api.put('/waitlist/call-next');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to call next';
      setToast({ message: msg, type: 'error' });
    }
    setCallingNext(false);
  };

  const skipEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/skip`);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to skip', type: 'error' });
    }
  };

  const completeEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/complete`);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to complete', type: 'error' });
    }
  };

  const seatEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/seat`);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to seat', type: 'error' });
    }
  };

  const statCards = [
    { label: 'Currently Serving', value: stats.servingCount, icon: UtensilsCrossed, gradient: 'from-emerald-500 to-teal-600', change: '+12%' },
    { label: 'In Queue', value: stats.waitlistCount, icon: Clock, gradient: 'from-amber-500 to-orange-600', change: '+5%' },
    { label: 'Bookings Today', value: stats.bookingCount, icon: Users, gradient: 'from-blue-500 to-indigo-600', change: '+8%' },
    { label: 'Completed', value: stats.completedCount, icon: CheckCircle2, gradient: 'from-gray-400 to-gray-600', change: '' },
  ];

  return (
    <AnimatePresence mode="wait">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl shadow-elevated border text-sm font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : toast.type === 'queue'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            {toast.type === 'queue' && <Bell size={14} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-elevated p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Reject Entry</h3>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">Reject {rejectModal.customerName}'s waitlist entry?</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => rejectWaitlist(rejectModal._id)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Reject</button>
            </div>
          </motion.div>
        </div>
      )}

      {loading ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-[3px] border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-4">Loading dashboard...</p>
          </div>
        </motion.div>
      ) : (
        <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Today's restaurant activity overview</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={callNext} disabled={callingNext}
                className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 transition-all">
                {callingNext ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PhoneForwarded size={15} />
                )}
                Call Next
              </button>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-soft">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {statCards.map(({ label, value, icon: Icon, gradient, change }) => (
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
                  <p className="text-3xl font-bold text-gray-900 tracking-tight"><AnimatedValue value={value} /></p>
                  <p className="text-[13px] text-gray-400 mt-1">{label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Activity Sections */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6" delay={0.3}>
            {(() => {
              const serving = [
                ...bookings.filter(b => b.status === 'serving').map(b => ({ ...b, _type: 'booking' })),
                ...waitlist.filter(w => w.status === 'serving').map(w => ({ ...w, _type: 'waitlist' })),
              ];
              const waiting = waitlist
                .filter(w => ['waiting', 'approved'].includes(w.status))
                .sort((a, b) => (a.position || 999) - (b.position || 999));
              const upcoming = bookings.filter(b => ['pending', 'confirmed', 'arrived'].includes(b.status));
              const completed = [
                ...bookings.filter(b => b.status === 'completed').map(b => ({ ...b, _type: 'booking' })),
                ...waitlist.filter(w => w.status === 'completed').map(w => ({ ...w, _type: 'waitlist' })),
              ];
              return (
                <>
                  <StaggerItem>
                    <Section title="Currently Serving" icon={UtensilsCrossed} count={serving.length} items={serving}
                      color="emerald" onAction={(item) =>
                        item._type === 'booking' ? updateBookingStatus(item._id, 'completed') : completeEntry(item._id)
                      } actionLabel="Complete" />
                  </StaggerItem>
                  <StaggerItem>
                    <QueueSection title="Live Queue" icon={Clock} count={waiting.length} items={waiting}
                      color="amber"
                      onApprove={(item) => approveWaitlist(item._id)}
                      onReject={(item) => setRejectModal(item)}
                      onSkip={(item) => skipEntry(item._id)}
                      onSeat={(item) => seatEntry(item._id)} />
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

/** Queue section with position numbers + skip buttons */
function QueueSection({ title, icon: Icon, count, items, color, onApprove, onReject, onSkip, onSeat }) {
  const colorMap = {
    amber: 'from-amber-500 to-orange-600',
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
      <div className="divide-y divide-gray-50/80 max-h-[400px] overflow-y-auto">
        {items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No active records.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.waiting;
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position badge */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[13px] font-bold text-white shrink-0">
                    {item.position || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.customerName}</p>
                    <p className="text-[11px] text-gray-400">
                      Party of {item.partySize}
                      {item.customerPhone ? ` \u00B7 ${item.customerPhone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {item.status}
                  </span>
                  <div className="flex lg:opacity-0 lg:group-hover:opacity-100 items-center gap-1 transition-all duration-200">
                    {item.status === 'waiting' && onApprove && (
                      <button onClick={() => onApprove(item)} title="Approve"
                        className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 hover:bg-emerald-100">
                        <ThumbsUp size={12} />
                      </button>
                    )}
                    {item.status === 'waiting' && onReject && (
                      <button onClick={() => onReject(item)} title="Reject"
                        className="w-7 h-7 rounded-lg bg-red-50 border border-red-200/60 flex items-center justify-center text-red-500 hover:bg-red-100">
                        <ThumbsDown size={12} />
                      </button>
                    )}
                    {item.status === 'approved' && onSeat && (
                      <button onClick={() => onSeat(item)} title="Seat — Start Serving"
                        className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 hover:bg-blue-100">
                        <ArrowRight size={12} />
                      </button>
                    )}
                    {['waiting', 'approved'].includes(item.status) && onSkip && (
                      <button onClick={() => onSkip(item)} title="Skip"
                        className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-500 hover:bg-gray-100">
                        <SkipForward size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
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
            <p className="text-sm text-gray-400">No active records.</p>
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
                  <p className="text-[11px] text-gray-400">
                    Party of {item.partySize} {item.time ? `\u00B7 ${item.time}` : ''}
                    {item.bookingNumber ? ` \u00B7 #${item.bookingNumber}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {item.status}
                </span>
                {onAction && (
                  <button onClick={() => onAction(item)}
                    className="lg:opacity-0 lg:group-hover:opacity-100 text-primary-600 hover:text-primary-700 text-[12px] font-semibold flex items-center gap-1 transition-all duration-200 bg-primary-50 px-2.5 py-1 rounded-lg">
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
