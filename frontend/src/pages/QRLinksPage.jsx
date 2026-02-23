import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, QrCode, ClipboardList, CalendarCheck, ExternalLink } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import AnimatedModal from '../components/animation/AnimatedModal';
import useAuthStore from '../store/authStore';

export default function QRLinksPage() {
  const { user } = useAuthStore();
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const businessId = user?.businessId;
  const baseUrl = window.location.origin;

  const links = [
    {
      type: 'waitlist',
      label: 'Waitlist Registration',
      description: 'Customers scan to join the queue instantly. No app download required.',
      icon: ClipboardList,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50',
      url: `${baseUrl}/waitlist?businessId=${businessId}`,
    },
    {
      type: 'booking',
      label: 'Booking Registration',
      description: 'Customers scan to make a table reservation in advance.',
      icon: CalendarCheck,
      gradient: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      url: `${baseUrl}/booking?businessId=${businessId}`,
    },
  ];

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Public QR Links</h1>
        <p className="text-gray-400 text-sm mt-1">Generate QR codes for customers to scan and self-register</p>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {links.map(link => (
          <StaggerItem key={link.type}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center hover:shadow-elevated transition-all duration-300 group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mx-auto mb-5 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                <link.icon size={26} className="text-white" />
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{link.label}</h2>
              <p className="text-[13px] text-gray-400 mt-2 mb-8 leading-relaxed max-w-[240px] mx-auto">{link.description}</p>
              <button onClick={() => setModal(link)}
                className="gradient-primary text-white px-8 py-3 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all shadow-glow flex items-center gap-2 mx-auto">
                <QrCode size={16} /> View QR Code
              </button>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Modal */}
      <AnimatedModal isOpen={!!modal} onClose={() => setModal(null)}>
        {modal && (
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-elevated">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>

            <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${modal.gradient} flex items-center justify-center mx-auto mb-4 shadow-sm`}>
                <modal.icon size={22} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{modal.label}</h2>
              <p className="text-[13px] text-gray-400 mt-1">Scan with any phone camera</p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-soft">
                <QRCodeSVG
                  value={modal.url}
                  size={200}
                  level="H"
                  bgColor="transparent"
                  fgColor="#1e293b"
                />
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-4 mb-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Public URL</p>
              <p className="text-[12px] text-gray-600 break-all font-mono leading-relaxed">{modal.url}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => copyLink(modal.url)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'gradient-primary text-white shadow-glow hover:opacity-90'
                }`}>
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
              </button>
              <button onClick={() => window.open(modal.url, '_blank')}
                className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
}
