import { Outlet, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import api from '../../services/api';

export default function CustomerLayout() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId');
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const bookingType = type === 'meal' ? 'meal' : 'table';
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(null);
  const blobsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (token && !businessId) {
        // Token-based access (status pages)
        try {
          const path = window.location.pathname;
          if (path.includes('booking')) {
            const { data } = await api.get(`/public/bookings/access/${token}`);
            setBusiness({ _id: data.businessId });
            setTokenValid(data);
          } else {
            const { data } = await api.get(`/public/waitlist/access/${token}`);
            setBusiness({ _id: data.businessId });
            setTokenValid(data);
          }
        } catch {
          setTokenValid(false);
        }
        setLoading(false);
        return;
      }

      if (!businessId) { setLoading(false); return; }
      try {
        const { data } = await api.get(`/public/business/${businessId}`);
        setBusiness(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [businessId, token]);

  // Floating gradient blobs
  useEffect(() => {
    if (!blobsRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blobs = blobsRef.current.children;
    Array.from(blobs).forEach((blob, i) => {
      gsap.to(blob, {
        x: `random(-30, 30)`,
        y: `random(-30, 30)`,
        duration: `random(6, 10)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.5,
      });
    });
  }, [loading]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (!businessId && !token) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Invalid Link</h1>
        <p className="text-slate-400 mt-2 text-sm">Please scan a valid QR code from the restaurant.</p>
      </div>
    </div>
  );

  if (token && tokenValid === false) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Invalid or Expired Token</h1>
        <p className="text-slate-400 mt-2 text-sm">This link is no longer valid.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div ref={blobsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 pb-4 text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full mb-4">
          <div className="w-6 h-6 gradient-primary rounded-lg flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white/80">{business?.name || 'Restaurant'}</span>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 px-6 pb-12">
        <Outlet context={{ business, businessId: businessId || business?._id?.toString(), bookingType, token, tokenData: tokenValid }} />
      </main>
    </div>
  );
}
