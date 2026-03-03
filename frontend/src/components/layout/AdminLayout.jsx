import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import PageTransition from '../animation/PageTransition';
import useAuthStore from '../../store/authStore';

export default function AdminLayout() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] gradient-mesh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Menu size={20} />
        </button>
        <span className="text-[15px] font-bold text-gray-900 tracking-tight">QueueAdmin</span>
      </div>

      <main className="ml-0 lg:ml-[260px] p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
