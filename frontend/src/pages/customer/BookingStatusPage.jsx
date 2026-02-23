import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { gsap } from 'gsap';
import { Clock, CheckCircle, UtensilsCrossed, QrCode, XCircle, MapPin, CalendarCheck } from 'lucide-react';
import useSocket from '../../hooks/useSocket';

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber' },
  { key: 'confirmed', label: 'Confirmed', icon: CalendarCheck, color: 'blue' },
  { key: 'arrived', label: 'Arrived', icon: MapPin, color: 'indigo' },
  { key: 'serving', label: 'Serving', icon: UtensilsCrossed, color: 'emerald' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'blue' },
];

const colorGradients = {
  amber: 'from-amber-500 to-orange-600',
  blue: 'from-blue-500 to-indigo-600',
  indigo: 'from-indigo-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
  red: 'from-red-500 to-pink-600',
};

export default function BookingStatusPage() {
  const { tokenData, token } = useOutletContext();
  const [booking, setBooking] = useState(tokenData);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const glowRef = useRef(null);

  const { on, off } = useSocket(booking ? `booking:${booking._id}` : null);

  useEffect(() => {
    const handler = (data) => setBooking(data);
    on('booking:updated', handler);
    return () => off('booking:updated', handler);
  }, [on, off]);

  useEffect(() => {
    if (!booking || booking.status !== 'serving' || !glowRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(glowRef.current, {
      boxShadow: '0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
      duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }, [booking?.status]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/public/bookings/${booking._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setBooking(data);
      setShowCancel(false);
    } catch {}
    setCancelling(false);
  };

  if (!booking) return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-xl font-bold text-white">Booking Not Found</h1>
      <p className="text-slate-400 mt-2 text-sm">This booking doesn't exist or the link has expired.</p>
    </div>
  );

  const isCancelled = booking.status === 'cancelled';
  const currentStepIdx = isCancelled ? -1 : statusSteps.findIndex(s => s.key === booking.status);
  const canCancel = ['pending', 'confirmed'].includes(booking.status);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-md mx-auto">
      {/* Status Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center mb-6">
        {isCancelled ? (
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle size={36} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Booking Cancelled</h1>
            <p className="text-slate-400 text-sm mt-1">This booking has been cancelled</p>
          </div>
        ) : booking.status === 'completed' ? (
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Visit Complete</h1>
            <p className="text-slate-400 text-sm mt-1">Thank you for dining with us!</p>
          </div>
        ) : booking.status === 'serving' ? (
          <div className="mb-6">
            <div ref={glowRef} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={36} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Being Served</h1>
            <p className="text-emerald-400 text-sm mt-1 font-medium">Enjoy your meal!</p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4 inline-block">
              <p className="text-indigo-300 text-xs font-medium">Booking Number</p>
              <p className="text-white font-mono text-xl mt-1 tracking-wider">{booking.bookingNumber}</p>
            </div>
            <h1 className="text-xl font-bold text-white">
              {booking.status === 'pending' ? 'Booking Pending' : booking.status === 'confirmed' ? 'Booking Confirmed' : booking.status === 'arrived' ? 'Arrived' : 'Booking'}
            </h1>
          </div>
        )}

        {/* Progress Steps */}
        {!isCancelled && (
          <div className="flex items-center justify-center gap-0 mb-6">
            {statusSteps.map((step, i) => {
              const isActive = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const gradient = colorGradients[step.color];
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center relative">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.4, ease: 'backOut' }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500
                        ${isCurrent ? `bg-gradient-to-br ${gradient} shadow-lg` : isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                      <step.icon size={16} className={isCurrent ? 'text-white' : isActive ? 'text-white/50' : 'text-white/20'} />
                    </motion.div>
                    <span className={`text-[9px] mt-1 font-medium ${isCurrent ? 'text-white' : 'text-slate-600'}`}>{step.label}</span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`w-6 h-0.5 mx-0.5 mt-[-14px] rounded-full ${i < currentStepIdx ? 'bg-white/20' : 'bg-white/5'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Booking Info */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-2.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Date</span>
            <span className="text-white font-semibold text-xs">
              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Time</span>
            <span className="text-white font-semibold text-xs">{booking.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Party Size</span>
            <span className="text-white font-semibold text-xs">{booking.partySize} guests</span>
          </div>
          {booking.tableId && (
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Table</span>
              <span className="text-white font-semibold text-xs">{booking.tableId.name || booking.tableId}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 text-xs">Name</span>
            <span className="text-white font-semibold text-xs">{booking.customerName}</span>
          </div>
        </div>
      </div>

      {/* QR Ticket */}
      {booking.qrTicket && !isCancelled && booking.status !== 'completed' && (
        <button onClick={() => setShowQr(!showQr)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-all mb-3">
          <QrCode size={14} /> {showQr ? 'Hide' : 'Show'} QR Ticket
        </button>
      )}

      {showQr && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-3">
          <p className="text-slate-400 text-xs text-center mb-2">Present this to staff on arrival</p>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white font-mono text-xs break-all text-center">{booking.qrTicket}</p>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <>
          <button onClick={() => setShowCancel(true)}
            className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all">
            Cancel Booking
          </button>

          {showCancel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-white font-semibold text-lg mb-2">Cancel Booking?</h3>
                <p className="text-slate-400 text-sm mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancel(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/10">
                    Keep Booking
                  </button>
                  <button onClick={handleCancel} disabled={cancelling}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
