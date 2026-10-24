import { useState, useEffect, useCallback, createElement } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  X,
  PhoneForwarded,
  SkipForward,
  Bell,
  QrCode,
  CalendarDays,
} from "lucide-react";
import useSocket from "../../../shared/hooks/useSocket";
import useAuthStore from "../../auth/store/authStore";
import api from "../../../shared/services/api";
import { onReconnect } from "../../../shared/services/socket";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    bookingCount: 0,
    waitlistCount: 0,
    servingCount: 0,
    completedCount: 0,
  });
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [callingNext, setCallingNext] = useState(false);

  const businessId = user?.businessId;
  const { on, off, connected } = useSocket(
    businessId ? `business:${businessId}` : null,
  );

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, bookingsRes, waitlistRes] = await Promise.all([
        api.get("/stats/dashboard"),
        api.get("/bookings/today"),
        api.get("/waitlist/today"),
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setWaitlist(waitlistRes.data);
    } catch (err) {
      console.error(err);
      setToast({
        message: "Could not refresh your workspace. Please try again.",
        type: "error",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchData);
  }, [fetchData]);

  // Re-sync state on socket reconnect (catches events missed during disconnect)
  useEffect(() => {
    return onReconnect(fetchData);
  }, [fetchData]);

  // Real-time queue events
  useEffect(() => {
    // Legacy booking events
    const handleBooking = (data) => {
      setToast({
        message: `Booking updated: ${data.customerName}`,
        type: "booking",
      });
      fetchData();
    };

    // New queue events
    const handleQueueNew = (data) => {
      setToast({
        message: `New in queue: ${data.entry?.customerName}`,
        type: "queue",
      });
      setWaitlist((prev) => {
        if (prev.find((e) => e._id === data.entry._id)) return prev;
        return [...prev, data.entry];
      });
      setStats((prev) => ({ ...prev, waitlistCount: data.totalWaiting }));
    };

    const handleQueueUpdate = (data) => {
      const { entry, action } = data;
      setWaitlist((prev) => prev.map((e) => (e._id === entry._id ? entry : e)));

      if (action === "called") {
        setToast({ message: `Called: ${entry.customerName}`, type: "queue" });
        setStats((prev) => ({
          ...prev,
          servingCount: prev.servingCount + 1,
          waitlistCount: Math.max(0, prev.waitlistCount - 1),
        }));
      } else if (action === "approved") {
        setToast({ message: `Approved: ${entry.customerName}`, type: "queue" });
      } else if (action === "skipped" || action === "cancelled") {
        setToast({
          message: `${action === "skipped" ? "Skipped" : "Cancelled"}: ${entry.customerName}`,
          type: "queue",
        });
        setStats((prev) => ({
          ...prev,
          waitlistCount: Math.max(0, prev.waitlistCount - 1),
        }));
      } else if (action === "rejected") {
        setToast({ message: `Rejected: ${entry.customerName}`, type: "queue" });
      }
      fetchData();
    };

    const handleQueueRemove = (data) => {
      setWaitlist((prev) => prev.filter((e) => e._id !== data.entryId));
      setStats((prev) => ({
        ...prev,
        completedCount: prev.completedCount + 1,
        servingCount: Math.max(0, prev.servingCount - 1),
      }));
      fetchData();
    };

    const handlePositionsShifted = (data) => {
      setWaitlist((prev) =>
        prev.map((e) => {
          const shifted = data.entries?.find((s) => s._id === e._id);
          return shifted ? { ...e, position: shifted.position } : e;
        }),
      );
    };

    on("booking:updated", handleBooking);
    on("queue:new", handleQueueNew);
    on("queue:update", handleQueueUpdate);
    on("queue:remove", handleQueueRemove);
    on("queue:positions-shifted", handlePositionsShifted);
    on("availability:changed", fetchData);

    return () => {
      off("booking:updated", handleBooking);
      off("queue:new", handleQueueNew);
      off("queue:update", handleQueueUpdate);
      off("queue:remove", handleQueueRemove);
      off("queue:positions-shifted", handlePositionsShifted);
      off("availability:changed", fetchData);
    };
  }, [on, off, fetchData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const updateBookingStatus = async (id, status) => {
    await api.put(`/bookings/${id}/status`, { status });
    fetchData();
  };
  const approveWaitlist = async (id) => {
    await api.put(`/waitlist/${id}/approve`);
  };
  const rejectWaitlist = async (id) => {
    await api.put(`/waitlist/${id}/reject`, { reason: rejectReason });
    setRejectModal(null);
    setRejectReason("");
  };

  const callNext = async () => {
    setCallingNext(true);
    try {
      await api.put("/waitlist/call-next");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to call next";
      setToast({ message: msg, type: "error" });
    }
    setCallingNext(false);
  };

  const skipEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/skip`);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || "Failed to skip",
        type: "error",
      });
    }
  };

  const completeEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/complete`);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || "Failed to complete",
        type: "error",
      });
    }
  };

  const seatEntry = async (id) => {
    try {
      await api.put(`/waitlist/${id}/seat`);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || "Failed to seat",
        type: "error",
      });
    }
  };

  const waiting = waitlist
    .filter((item) => ["waiting", "approved"].includes(item.status))
    .sort((a, b) => (a.position || 999) - (b.position || 999));
  const serving = [
    ...bookings
      .filter((item) => item.status === "serving")
      .map((item) => ({ ...item, _type: "booking" })),
    ...waitlist
      .filter((item) => item.status === "serving")
      .map((item) => ({ ...item, _type: "waitlist" })),
  ];
  const upcoming = bookings.filter((item) =>
    ["pending", "confirmed", "arrived"].includes(item.status),
  );
  const metrics = [
    {
      label: "In service",
      value: stats.servingCount,
      icon: UtensilsCrossed,
      note: "Guests currently seated",
    },
    {
      label: "In the queue",
      value: waiting.length,
      icon: Clock,
      note: "Waiting and approved parties",
    },
    {
      label: "Reservations",
      value: stats.bookingCount,
      icon: CalendarDays,
      note: "Scheduled for today",
    },
    {
      label: "Completed",
      value: stats.completedCount,
      icon: CheckCircle2,
      note: "Visits wrapped up today",
    },
  ];
  return (
    <div className="overview-page">
      {toast && (
        <div
          role="status"
          className={`workspace-toast ${toast.type === "error" ? "is-error" : ""}`}
        >
          <Bell size={16} />
          {toast.message}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <header className="overview-heading">
        <div>
          <div className="eyebrow">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </div>
          <h1>
            Service overview<span className="heading-period">.</span>
          </h1>
          <p>A clear view of your floor. One guest at a time.</p>
        </div>
        <div className="overview-actions">
          <span className={`connection-label ${connected ? "is-live" : ""}`}>
            <span />
            {connected ? "Live service" : "Connecting"}
          </span>
          <button
            className="button-outline refresh-button"
            onClick={fetchData}
            aria-label="Refresh overview"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="button-solid"
            onClick={callNext}
            disabled={
              callingNext || !waitlist.some((item) => item.status === "waiting")
            }
          >
            <PhoneForwarded size={16} />
            {callingNext ? "Calling…" : "Call next guest"}
          </button>
        </div>
      </header>
      {loading ? (
        <div className="quiet-loading" role="status">
          Getting your workspace ready…
        </div>
      ) : (
        <>
          <section className="overview-metrics" aria-label="Today's numbers">
            {metrics.map(({ label, value, icon, note }) => (
              <div className="metric" key={label}>
                <div className="metric-label">
                  {label}
                  {createElement(icon, { size: 17, strokeWidth: 1.5 })}
                </div>
                <strong>{value ?? 0}</strong>
                <small>{note}</small>
              </div>
            ))}
          </section>
          <div className="service-grid">
            <section className="service-panel queue-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">AT THE DOOR</span>
                  <h2>
                    The queue{" "}
                    <span className="count-badge">{waiting.length}</span>
                  </h2>
                </div>
                <span className="panel-caption">Next up, in order</span>
              </div>
              {waiting.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Room for a warm welcome."
                  text="New guests will appear here when they join your queue."
                />
              ) : (
                <ol className="service-queue">
                  {waiting.map((item, index) => (
                    <li className="service-queue-row" key={item._id}>
                      <span className="queue-position">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="guest-name">
                        <strong>{item.customerName}</strong>
                        <small>
                          {item.customerPhone || "Walk-in guest"} ·{" "}
                          {item.partySize}{" "}
                          {item.partySize === 1 ? "guest" : "guests"}
                        </small>
                      </div>
                      <StatusPill status={item.status} />
                      <div className="row-actions">
                        {item.status === "waiting" ? (
                          <>
                            <button
                              className="button-outline button-small"
                              onClick={() => approveWaitlist(item._id)}
                              aria-label={`Approve ${item.customerName}`}
                            >
                              Approve
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => setRejectModal(item)}
                              aria-label={`Reject ${item.customerName}`}
                              title="Reject entry"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="button-solid button-small"
                            onClick={() => seatEntry(item._id)}
                            aria-label={`Seat ${item.customerName}`}
                          >
                            Seat party <ArrowRight size={14} />
                          </button>
                        )}
                        <button
                          className="icon-button"
                          onClick={() => skipEntry(item._id)}
                          aria-label={`Skip ${item.customerName}`}
                          title="Skip entry"
                        >
                          <SkipForward size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <div className="panel-footer">
                <QrCode size={15} />
                <span>
                  Guests can join by scanning your restaurant QR code.
                </span>
                <Link to="/qr-links">
                  Guest links <ArrowUpRight size={14} />
                </Link>
              </div>
            </section>
            <section className="service-panel serving-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">ON THE FLOOR</span>
                  <h2>
                    In service{" "}
                    <span className="count-badge">{serving.length}</span>
                  </h2>
                </div>
                <UtensilsCrossed size={19} strokeWidth={1.5} />
              </div>
              {serving.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="A fresh start."
                  text="Seated parties will appear here, ready for a good service."
                />
              ) : (
                <div className="serving-list">
                  {serving.map((item) => (
                    <div className="serving-row" key={item._id}>
                      <div className="guest-name">
                        <strong>{item.customerName}</strong>
                        <small>
                          Party of {item.partySize}
                          {item.tableId?.name ? ` · ${item.tableId.name}` : ""}
                        </small>
                      </div>
                      <button
                        className="button-outline button-small"
                        aria-label={`Complete ${item.customerName}`}
                        onClick={() =>
                          item._type === "booking"
                            ? updateBookingStatus(item._id, "completed")
                            : completeEntry(item._id)
                        }
                      >
                        Complete <CheckCircle2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="service-note-inline">
                A little less waiting.
                <br />
                <em>A better welcome.</em>
              </div>
            </section>
          </div>
          <section className="service-panel reservation-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ON THE BOOKS</span>
                <h2>
                  Today's reservations{" "}
                  <span className="count-badge">{upcoming.length}</span>
                </h2>
              </div>
              <Link to="/calendar" className="quiet-link">
                View calendar <ArrowUpRight size={15} />
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="reservation-empty">
                <CalendarDays size={19} strokeWidth={1.5} />
                <p>No upcoming reservations for today.</p>
                <Link to="/calendar">
                  Open calendar <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="reservation-list">
                {upcoming.map((item) => (
                  <div className="reservation-row" key={item._id}>
                    <span className="reservation-time">{item.time}</span>
                    <div className="guest-name">
                      <strong>{item.customerName}</strong>
                      <small>
                        {item.bookingType === "meal"
                          ? "Meal order"
                          : "Table reservation"}{" "}
                        · {item.partySize} guests
                      </small>
                    </div>
                    <StatusPill status={item.status} />
                    <button
                      className="button-outline button-small"
                      onClick={() => updateBookingStatus(item._id, "serving")}
                    >
                      Start serving <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <footer className="workspace-footer">
            <span>Made for the moments between arrival and a great meal.</span>
            <span>Queue / Your service, in view</span>
          </footer>
        </>
      )}
      {rejectModal && (
        <div className="dialog-overlay" onClick={() => setRejectModal(null)}>
          <section
            className="queue-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setRejectModal(null);
            }}
          >
            <div className="dialog-title">
              <h2 id="reject-title">Decline this entry?</h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setRejectModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              Let {rejectModal.customerName} know why their entry cannot be
              accepted.
            </p>
            <label htmlFor="reject-reason">Reason (optional)</label>
            <textarea
              autoFocus
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              placeholder="A short note for your guest"
            />
            <div className="dialog-actions">
              <button
                className="button-outline"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
              >
                Keep entry
              </button>
              <button
                className="button-danger"
                onClick={() => rejectWaitlist(rejectModal._id)}
              >
                Decline entry
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function StatusPill({ status }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span />
      {status === "waiting"
        ? "Waiting"
        : status === "approved"
          ? "Ready to seat"
          : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
function EmptyState({ icon, title, text }) {
  return (
    <div className="service-empty">
      <span className="empty-symbol">
        {createElement(icon, { size: 23, strokeWidth: 1.35 })}
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
