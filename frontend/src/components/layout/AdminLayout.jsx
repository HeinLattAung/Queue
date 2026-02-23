import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import PageTransition from '../animation/PageTransition';
import useAuthStore from '../../store/authStore';

export default function AdminLayout() {
  const { token } = useAuthStore();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] gradient-mesh">
      <Sidebar />
      <main className="ml-[260px] p-8">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
