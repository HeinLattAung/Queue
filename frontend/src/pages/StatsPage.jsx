import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Users, Clock, UtensilsCrossed, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap } from 'gsap';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import useCountUp from '../hooks/useCountUp';
import api from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 shadow-elevated px-4 py-3">
      <p className="text-[12px] font-semibold text-gray-900">{label}</p>
      <p className="text-[12px] text-primary-600 font-bold mt-0.5">{payload[0].value} bookings</p>
    </div>
  );
};

function AnimatedValue({ value }) {
  const display = useCountUp(value, 1.2, 0.3);
  return <>{display}</>;
}

export default function StatsPage() {
  const [stats, setStats] = useState({ bookingCount: 0, waitlistCount: 0, servingCount: 0, completedCount: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, weeklyRes, peakRes] = await Promise.all([
          api.get('/stats/dashboard'),
          api.get('/stats/weekly'),
          api.get('/stats/peak-hours'),
        ]);
        setStats(statsRes.data);
        setWeeklyData(weeklyRes.data.map(d => ({ date: d._id.slice(5), count: d.count })));
        setPeakHours(peakRes.data.map(d => ({ hour: d._id, count: d.count })).sort((a, b) => a.hour.localeCompare(b.hour)));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // GSAP staggered reveal for charts
  useEffect(() => {
    if (loading || !chartsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = chartsRef.current.children;
    gsap.set(cards, { opacity: 0, y: 20 });
    gsap.to(cards, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.5,
    });
  }, [loading]);

  const cards = [
    { label: 'Bookings Today', value: stats.bookingCount, icon: Users, gradient: 'from-blue-500 to-indigo-600', change: '+12%' },
    { label: 'In Waitlist', value: stats.waitlistCount, icon: Clock, gradient: 'from-amber-500 to-orange-600', change: '+5%' },
    { label: 'Serving Now', value: stats.servingCount, icon: UtensilsCrossed, gradient: 'from-emerald-500 to-teal-600', change: '+8%' },
    { label: 'Completed', value: stats.completedCount, icon: CheckCircle2, gradient: 'from-violet-500 to-purple-600', change: '' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-400 mt-4">Loading analytics...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor your restaurant performance</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
          <Activity size={14} className="text-primary-500" />
          <span className="text-[13px] font-semibold text-primary-600">Live Data</span>
        </div>
      </div>

      {/* Stat Cards */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map(({ label, value, icon: Icon, gradient, change }) => (
          <StaggerItem key={label}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-card hover:shadow-elevated transition-all duration-300">
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

      {/* Charts */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <TrendingUp size={17} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-[15px]">Weekly Booking Trend</h2>
              <p className="text-[12px] text-gray-400">Last 7 days activity</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorCount)" dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Activity size={17} className="text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-[15px]">Peak Hours</h2>
              <p className="text-[12px] text-gray-400">Busiest hours by volume</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={peakHours} barSize={32}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
