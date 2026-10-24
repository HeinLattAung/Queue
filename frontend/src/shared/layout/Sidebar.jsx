import { useEffect, useRef, createElement } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ChartNoAxesCombined,
  Settings2,
  QrCode,
  ScanLine,
  LogOut,
  X,
  ArrowUpRight,
} from "lucide-react";
import useAuthStore from "../../features/auth/store/authStore";

const links = [
  ["/dashboard", LayoutDashboard, "Overview"],
  ["/calendar", CalendarDays, "Reservations"],
  ["/customers", Users, "Guests"],
  ["/stats", ChartNoAxesCombined, "Reports"],
  ["/qr-links", QrCode, "Guest links"],
  ["/scan", ScanLine, "Scan a ticket"],
  ["/settings", Settings2, "Settings"],
];
export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector(".mobile-close")?.focus();
    const keyboard = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = [
        ...drawerRef.current.querySelectorAll(
          "a[href], button:not([disabled])",
        ),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        ref={drawerRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={`workspace-sidebar ${open ? "is-open" : ""}`}
        aria-label="Restaurant navigation"
      >
        <div className="sidebar-brand">
          <NavLink to="/dashboard" onClick={onClose} className="queue-brand">
            <span className="brand-symbol">q.</span>queue
            <span className="brand-period">.</span>
          </NavLink>
          <button
            className="mobile-close icon-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-caption">
          <span className="small-dot" /> Restaurant workspace
        </div>
        <nav className="workspace-links">
          {links.map(([to, icon, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `workspace-link ${isActive ? "is-active" : ""}`
              }
            >
              {createElement(icon, { size: 18, strokeWidth: 1.65 })}
              <span>{label}</span>
              {to === "/scan" && <span className="nav-shortcut">QR</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <p>A little less waiting.</p>
          <span>A better welcome.</span>
          <ArrowUpRight size={17} />
        </div>
        <div className="sidebar-account">
          <button
            className="account-link"
            onClick={() => {
              navigate("/profile");
              onClose();
            }}
          >
            <span className="account-avatar">{user?.name?.[0] || "Q"}</span>
            <span>
              <strong>{user?.name || "Your account"}</strong>
              <small>Account settings</small>
            </span>
          </button>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
