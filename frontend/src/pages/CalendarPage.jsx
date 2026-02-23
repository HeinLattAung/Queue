import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import api from '../services/api';

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 8;
  return `${h.toString().padStart(2, '0')}:00`;
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    const fetchBookings = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      try {
        const { data } = await api.get(`/bookings?date=${dateStr}`);
        setBookings(data.data || []);
      } catch { setBookings([]); }
    };
    fetchBookings();
  }, [selectedDate]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const getBookingsForHour = (hour) => bookings.filter(b => b.time?.startsWith(hour.split(':')[0]));

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };
  const isSelected = (day) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendar</h1>
        <p className="text-gray-400 text-sm mt-1">View and manage booking schedules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Picker */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <h2 className="font-bold text-gray-900 text-[15px]">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[11px] font-semibold text-gray-300 uppercase py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`h-10 rounded-xl text-[13px] font-medium flex items-center justify-center transition-all duration-200
                  ${isSelected(day)
                    ? 'gradient-primary text-white shadow-glow'
                    : isToday(day)
                      ? 'bg-primary-50 text-primary-600 font-bold ring-1 ring-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
            {[
              { color: 'bg-primary-500', label: 'Selected' },
              { color: 'bg-emerald-500', label: 'Serving' },
              { color: 'bg-blue-500', label: 'Booked' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-[12px] text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Calendar size={17} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-[15px]">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-[12px] text-gray-400">{bookings.length} bookings scheduled</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate.toISOString().split('T')[0]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-gray-50/80 max-h-[600px] overflow-y-auto"
            >
              {HOURS.map(hour => {
                const hourBookings = getBookingsForHour(hour);
                return (
                  <div key={hour} className="flex px-6 py-3 gap-5 hover:bg-gray-50/30 transition-colors">
                    <div className="w-14 text-[13px] text-gray-300 font-semibold shrink-0 pt-1">{hour}</div>
                    <div className="flex-1 min-h-[40px]">
                      {hourBookings.length === 0 ? (
                        <div className="h-10 border border-dashed border-gray-100 rounded-xl" />
                      ) : (
                        <div className="space-y-1.5">
                          {hourBookings.map(b => (
                            <div key={b._id} className={`px-3.5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-between
                              ${b.status === 'serving'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : b.status === 'completed'
                                  ? 'bg-gray-50 text-gray-400 border border-gray-200/60'
                                  : 'bg-primary-50 text-primary-700 border border-primary-200/60'
                              }`}>
                              <span>{b.customerName} &middot; Party of {b.partySize}</span>
                              <span className="opacity-50 text-[11px] uppercase tracking-wide">{b.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
