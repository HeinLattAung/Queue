import { useState } from "react";
import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { Menu, ChevronRight, ArrowUpRight } from "lucide-react";
import Sidebar from "./Sidebar";
import useAuthStore from "../../features/auth/store/authStore";
const names = {
  dashboard: "Overview",
  calendar: "Reservations",
  customers: "Guests",
  stats: "Reports",
  settings: "Settings",
  profile: "Your account",
  "qr-links": "Guest links",
  scan: "Scan a ticket",
};
export default function AdminLayout() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="workspace-shell">
      <a href="#workspace-content" className="skip-content">
        Skip to content
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{names[location.pathname.slice(1)] || "Overview"}</strong>
          </div>
          <Link to="/qr-links" className="topbar-link">
            Guest links <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="workspace-content" className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
