import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Calendar, Users, BarChart3, Settings,
  QrCode, LogOut, User, ChevronUp, Sparkles
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/stats', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/qr-links', icon: QrCode, label: 'QR Links' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col z-40">
      {/* Brand */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">QueueAdmin</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Menu</p>
        <div className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 gradient-primary rounded-xl shadow-glow"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.div
                  className={`relative z-10 flex items-center gap-3 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-500 group-hover:text-gray-900'
                  }`}
                  whileHover={!isActive ? { x: 4 } : undefined}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  {label}
                </motion.div>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="relative px-3 pb-4">
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email || ''}</p>
            </div>
            <ChevronUp size={14} className={`text-gray-300 transition-transform duration-200 ${profileOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-elevated border border-gray-100 py-1.5"
            >
              <button
                onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <User size={15} strokeWidth={1.8} /> Profile Settings
              </button>
              <div className="mx-3 my-1 border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors"
              >
                <LogOut size={15} strokeWidth={1.8} /> Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
