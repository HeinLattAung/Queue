import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  QrCode,
  X,
  Check,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import QRX from "@qr-x/react";
import useSocket from "../../hooks/useSocket";
import { onReconnect } from "../../services/socket";
import api from "../../services/api";

const states = {
  approved: {
    title: "Your welcome is ready.",
    text: "Please make your way to the host stand.",
    icon: Check,
  },
  serving: {
    title: "Your table is ready.",
    text: "Make yourself at home. Enjoy your meal.",
    icon: UtensilsCrossed,
  },
  completed: {
    title: "Until next time.",
    text: "Thank you for spending a little of your day with us.",
    icon: CheckCircle2,
  },
  cancelled: {
    title: "You have left the queue.",
    text: "You can scan the restaurant QR code to join again.",
    icon: X,
  },
  rejected: {
    title: "A note from your host.",
    text: "Your entry could not be accepted. Please speak with the team.",
    icon: X,
  },
};
export default function QueueStatusPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("id");
  const token = params.get("token");
  const [entry, setEntry] = useState(null);
  const [business, setBusiness] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const {
    on,
    off,
    connected,
    error: socketError,
  } = useSocket(token && entry?._id ? `queue:${entry._id}` : null, token);

  const refresh = useCallback(async () => {
    if (!token) {
      setError("Open the full queue link containing your access token.");
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get(`/public/waitlist/access/${token}`);
      if (requestedId && data._id !== requestedId)
        throw new Error("Invalid queue link");
      setEntry(data);
      setError("");
      if (data.status === "waiting") {
        const response = await api.get(
          `/public/waitlist/position/${data._id}`,
          { headers: { "X-Access-Token": token } },
        );
        setPosition(response.data);
      }
    } catch {
      setError(
        "This queue link is invalid or has expired. Please speak with your host.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, requestedId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    const unsubscribe = onReconnect(refresh);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [refresh]);
  const businessId =
    typeof entry?.businessId === "object"
      ? entry.businessId?._id
      : entry?.businessId;
  useEffect(() => {
    if (!businessId) return;
    let active = true;
    api
      .get(`/public/business/${businessId}`)
      .then(({ data }) => {
        if (active) setBusiness(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [businessId]);
  useEffect(() => {
    const update = (data) => {
      if (data.entry) setEntry((previous) => ({ ...previous, ...data.entry }));
    };
    const complete = () =>
      setEntry((previous) => ({ ...previous, status: "completed" }));
    const shift = (data) =>
      setPosition((previous) => ({ ...previous, ...data }));
    const listeners = {
      "queue:called": update,
      "queue:approved": update,
      "queue:rejected": update,
      "queue:skipped": update,
      "queue:cancelled": update,
      "queue:completed": complete,
      "queue:position-update": shift,
    };
    Object.entries(listeners).forEach(([event, handler]) => on(event, handler));
    return () =>
      Object.entries(listeners).forEach(([event, handler]) =>
        off(event, handler),
      );
  }, [on, off]);
  const cancel = async () => {
    setCancelling(true);
    setActionError("");
    try {
      await api.put(`/public/waitlist/${entry._id}/cancel`, { token });
      setEntry((previous) => ({ ...previous, status: "cancelled" }));
      setShowCancel(false);
    } catch {
      setActionError("We could not leave the queue. Please try again.");
    } finally {
      setCancelling(false);
    }
  };
  const status = entry?.status;
  const state = states[status];
  const Icon = state?.icon || Clock;
  const step = ["waiting", "approved", "serving", "completed"].indexOf(status);
  return (
    <div className="guest-ticket-page">
      <header className="public-nav">
        <Link to="/" className="queue-brand" aria-label="Queue home">
          <span className="brand-symbol">q.</span>queue
          <span className="brand-period">.</span>
        </Link>
        <span className="guest-nav-caption">A better welcome.</span>
      </header>
      <main className="guest-ticket-main">
        {loading ? (
          <div className="quiet-loading" role="status">
            Finding your place…
          </div>
        ) : error ? (
          <section className="guest-ticket error-ticket">
            <span className="eyebrow">YOUR VISIT</span>
            <h1>Let's find your place.</h1>
            <p role="alert">{error}</p>
            <Link to="/customer/home" className="button-outline">
              Back to guest home <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <>
            <div className="ticket-above">
              <span className="eyebrow">YOUR DIGITAL TICKET</span>
              <span
                className={`connection-label ${connected ? "is-live" : ""}`}
              >
                {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
                {connected
                  ? "Live updates"
                  : socketError
                    ? "Live updates unavailable"
                    : "Connecting"}
              </span>
            </div>
            <article className="guest-ticket">
              <header className="ticket-heading">
                <div>
                  <span className="eyebrow">
                    {business?.location || "A PLACE AT THE TABLE"}
                  </span>
                  <h1>{business?.name || "Your restaurant"}</h1>
                  <p>Welcome, {entry.customerName}.</p>
                </div>
                <span className="ticket-monogram">
                  {business?.name?.[0] || "q"}.
                </span>
              </header>
              <div className="ticket-divider" />
              <section className="ticket-state" aria-live="polite">
                {status === "waiting" ? (
                  <>
                    <span className="eyebrow">YOUR PLACE IN LINE</span>
                    <div className="ticket-number">
                      <span>No.</span>
                      {String(
                        position?.position ?? entry.position ?? 1,
                      ).padStart(2, "0")}
                    </div>
                    <h2>A little time. A good meal ahead.</h2>
                    <p>We'll update this page when your host is ready.</p>
                  </>
                ) : (
                  <>
                    <span className={`ticket-state-icon state-${status}`}>
                      <Icon size={32} strokeWidth={1.5} />
                    </span>
                    <h2>{state?.title || "Your visit is being updated."}</h2>
                    <p>{entry.rejectedReason || state?.text}</p>
                  </>
                )}
              </section>
              {step >= 0 && (
                <ol className="ticket-progress" aria-label="Visit progress">
                  {["In queue", "Approved", "At your table", "Complete"].map(
                    (label, index) => (
                      <li
                        key={label}
                        className={index <= step ? "is-done" : ""}
                        aria-current={index === step ? "step" : undefined}
                      >
                        <span>
                          {index < step ? <Check size={12} /> : index + 1}
                        </span>
                        {label}
                      </li>
                    ),
                  )}
                </ol>
              )}
              <dl className="ticket-details">
                <div>
                  <dt>
                    <Users size={14} /> Your party
                  </dt>
                  <dd>
                    {entry.partySize}{" "}
                    {entry.partySize === 1 ? "guest" : "guests"}
                  </dd>
                </div>
                {status === "waiting" && (
                  <div>
                    <dt>
                      <Clock size={14} /> Estimated wait
                    </dt>
                    <dd>
                      {position?.estimatedWait
                        ? `About ${position.estimatedWait} min`
                        : "Checking…"}
                    </dd>
                  </div>
                )}
              </dl>
              {["waiting", "approved", "serving"].includes(status) && (
                <div className="ticket-qr">
                  <button
                    className="button-outline ticket-qr-toggle"
                    onClick={() => setShowQr((value) => !value)}
                    aria-expanded={showQr}
                  >
                    <QrCode size={17} />
                    {showQr ? "Hide your QR ticket" : "Show your QR ticket"}
                    <ArrowUpRight size={16} />
                  </button>
                  {showQr && (
                    <div className="ticket-qr-code">
                      <QRX data={token} level="H" width={180} height={180} />
                      <p>Show this to your host for check-in.</p>
                    </div>
                  )}
                </div>
              )}
              <footer className="ticket-footer">
                Your place is saved. Keep this page handy.
              </footer>
            </article>
            {["waiting", "approved"].includes(status) && (
              <button
                className="leave-link"
                onClick={() => setShowCancel(true)}
              >
                Plans changed? Leave the queue
              </button>
            )}
            <p className="guest-ticket-caption">
              Good things start with a warm welcome.
            </p>
          </>
        )}
      </main>
      {showCancel && (
        <div className="dialog-overlay">
          <section
            className="queue-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowCancel(false);
            }}
          >
            <div className="dialog-title">
              <h2 id="leave-title">Leave the queue?</h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setShowCancel(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              Your place will be released. You can scan again when you're ready
              to rejoin.
            </p>
            {actionError && (
              <p className="notice-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                autoFocus
                className="button-outline"
                onClick={() => setShowCancel(false)}
              >
                Keep my place
              </button>
              <button
                className="button-danger"
                onClick={cancel}
                disabled={cancelling}
              >
                {cancelling ? "Leaving…" : "Leave queue"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
