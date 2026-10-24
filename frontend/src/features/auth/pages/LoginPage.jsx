import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CircleCheck } from "lucide-react";
import useAuthStore from "../store/authStore";
export default function LoginPage({ guest = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading: authLoading, error: authError, errorAction } = useAuthStore();
  const loading = authLoading && errorAction === 'login';
  const error = errorAction === 'login' ? authError : null;
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (await login(email, password))
      navigate(
        useAuthStore.getState().user?.role === "customer"
          ? "/customer/home"
          : "/dashboard",
      );
  };
  return (
    <div className="auth-page">
      <header className="public-nav">
        <Link to="/" className="queue-brand" aria-label="Queue home">
          <span className="brand-symbol">q.</span>queue
          <span className="brand-period">.</span>
        </Link>
        <Link to={guest ? "/login" : "/customer/login"} className="quiet-link">
          {guest ? "Restaurant sign in" : "Here as a guest?"}{" "}
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="auth-layout">
        <section className="auth-story">
          <span className="eyebrow">
            {guest
              ? "A LITTLE CLOSER TO YOUR TABLE"
              : "MADE FOR THE HOST STAND"}
          </span>
          <h1>
            {guest ? "A place in line." : "Good service."}
            <br />
            <em>{guest ? "Time for yourself." : "From the start."}</em>
          </h1>
          <p>
            {guest
              ? "Scan a restaurant QR code, save your place, and follow your visit from your phone."
              : "Keep your queue, reservations, and guests in one place. More time for the people at your door."}
          </p>
          <div className="service-note">
            <div className="service-note-top">
              <span className="small-dot" /> A calmer service
            </div>
            <div className="service-note-row">
              <span className="mini-position">01</span>
              <div>
                <strong>{guest ? "A simple scan" : "A warm welcome"}</strong>
                <small>
                  {guest
                    ? "Scan the restaurant QR code."
                    : "Let guests join from their phone."}
                </small>
              </div>
              <CircleCheck size={19} />
            </div>
            <div className="service-note-row">
              <span className="mini-position">02</span>
              <div>
                <strong>
                  {guest ? "Your place, saved" : "Everything in view"}
                </strong>
                <small>
                  {guest
                    ? "Join the queue from your phone."
                    : "Know who is waiting and who is next."}
                </small>
              </div>
              <CircleCheck size={19} />
            </div>
            <div className="service-note-row">
              <span className="mini-position">03</span>
              <div>
                <strong>{guest ? "You are up next" : "A table, ready"}</strong>
                <small>
                  {guest
                    ? "Follow your visit as service moves."
                    : "Keep guests updated as service moves."}
                </small>
              </div>
              <CircleCheck size={19} />
            </div>
          </div>
        </section>
        <section className="auth-form-panel">
          <span className="eyebrow">
            {guest ? "YOUR NEXT VISIT" : "YOUR WORKSPACE"}
          </span>
          <h2>Welcome back.</h2>
          <p>
            {guest
              ? "Sign in to join a queue and follow your visit."
              : "Sign in to get your service started."}
          </p>
          <form onSubmit={submit}>
            {error && (
              <div className="notice-error" role="alert">
                {Array.isArray(error) ? error.join(". ") : error}
              </div>
            )}
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder={guest ? "you@example.com" : "you@restaurant.com"}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="button-solid auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footnote">
            New to Queue?{" "}
            <Link to={guest ? "/customer/signup" : "/signup"}>
              {guest ? "Create a guest account" : "Create a restaurant account"}
            </Link>
          </p>
          <span className="auth-form-caption">
            A little less waiting. A better welcome.
          </span>
        </section>
      </main>
      <footer className="public-footer">
        <span>Queue · Restaurant management</span>
        <span>Thoughtful service starts here.</span>
      </footer>
    </div>
  );
}
