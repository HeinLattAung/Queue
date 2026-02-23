import { useState } from 'react';
import { motion } from 'motion/react';
import { QrCode, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function BookingScanPage() {
  const [bookingId, setBookingId] = useState('');
  const [qrTicket, setQrTicket] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!bookingId.trim() || !qrTicket.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post(`/public/bookings/${bookingId.trim()}/scan`, { qrTicket: qrTicket.trim() });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid QR ticket or booking ID');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Scan QR Ticket</h1>
        <p className="text-gray-400 text-sm mt-1">Mark customer arrival by entering their QR ticket</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <QrCode size={26} className="text-white" />
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Booking ID</label>
              <input
                value={bookingId}
                onChange={e => setBookingId(e.target.value)}
                placeholder="Paste booking ID here..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">QR Ticket Code</label>
              <textarea
                value={qrTicket}
                onChange={e => setQrTicket(e.target.value)}
                rows={3}
                placeholder="Paste QR ticket token here..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:border-indigo-500/50 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <motion.button
            onClick={handleScan}
            disabled={loading || !bookingId.trim() || !qrTicket.trim()}
            whileTap={{ scale: 0.98 }}
            className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-all shadow-glow flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Verify & Mark Arrived <ArrowRight size={16} /></>
            )}
          </motion.button>

          {error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-600 text-sm">
              <XCircle size={16} /> {error}
            </motion.div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700">Arrival Confirmed!</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking #</span>
                  <span className="font-semibold text-gray-900">{result.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-semibold text-gray-900">{result.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Party Size</span>
                  <span className="font-semibold text-gray-900">{result.partySize} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold text-gray-900">{result.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {result.status}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
