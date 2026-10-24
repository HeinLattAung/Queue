import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  QrCode,
  Clock,
  CalendarDays,
} from "lucide-react";
import useAuthStore from "../store/authStore";
export default function SignupPage({ guest = false }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    restaurantName: "",
    location: "",
    phone: "",
  });
  const { signup, customerSignup, loading: authLoading, error: authError, errorAction } = useAuthStore();
  const action = guest ? 'customerSignup' : 'signup';
  const loading = authLoading && errorAction === action;
  const error = errorAction === action ? authError : null;
  const navigate = useNavigate();
  const fields = [
    {
      name: "name",
      label: "Your name",
      placeholder: "Your full name",
      required: true,
      autoComplete: "name",
    },
    {
      name: "email",
      label: "Email address",
      type: "email",
      placeholder: "you@example.com",
      required: true,
      autoComplete: "email",
    },
    ...(guest
      ? [
          {
            name: "phone",
            label: "Phone number (optional)",
            type: "tel",
            placeholder: "Your contact number",
            autoComplete: "tel",
          },
        ]
      : [
          {
            name: "restaurantName",
            label: "Restaurant name",
            placeholder: "The name on your door",
            required: true,
            autoComplete: "organization",
          },
          {
            name: "location",
            label: "Location (optional)",
            placeholder: "City, country",
          },
        ]),
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "At least 6 characters",
      required: true,
      minLength: 6,
      autoComplete: "new-password",
    },
  ];
  const submit = async (event) => {
    event.preventDefault();
    const payload = guest
      ? {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          restaurantName: form.restaurantName,
          location: form.location,
        };
    if (await (guest ? customerSignup(payload) : signup(payload)))
      navigate(guest ? "/customer/home" : "/dashboard");
  };
  return (
    <div className="auth-page">
      <header className="public-nav">
        <Link to="/" className="queue-brand" aria-label="Queue home">
          <span className="brand-symbol">q.</span>queue
          <span className="brand-period">.</span>
        </Link>
        <Link to={guest ? "/customer/login" : "/login"} className="quiet-link">
          Already with us? Sign in <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="auth-layout signup-layout">
        <section className="auth-story">
          <span className="eyebrow">
            {guest ? "YOUR NEXT GOOD MEAL" : "A SPACE FOR YOUR SERVICE"}
          </span>
          <h1>
            {guest ? "A place in line." : "A good welcome."}
            <br />
            <em>{guest ? "Time for yourself." : "Starts with you."}</em>
          </h1>
          <p>
            {guest
              ? "Scan a restaurant QR code, save your place, and keep up with your visit from your phone."
              : "Give your team a clear view of arrivals, reservations, and the people waiting for their next good meal."}
          </p>
          <div className="signup-benefits">
            <span>
              <QrCode size={18} /> A simple scan to get started
            </span>
            <span>
              <Clock size={18} /> Queue updates, as they happen
            </span>
            <span>
              <CalendarDays size={18} /> Your visit, in one place
            </span>
          </div>
        </section>
        <section className="auth-form-panel">
          <span className="eyebrow">
            {guest ? "FOR YOUR NEXT VISIT" : "YOUR RESTAURANT WORKSPACE"}
          </span>
          <h2>Make yourself at home.</h2>
          <p>
            {guest
              ? "A few details, and you are ready for your next visit."
              : "Start with the details your team will know you by."}
          </p>
          <form onSubmit={submit}>
            {error && (
              <div className="notice-error" role="alert">
                {Array.isArray(error) ? error.join(". ") : error}
              </div>
            )}
            {fields.map(({ name, label, ...props }) => (
              <div key={name}>
                <label htmlFor={`signup-${name}`}>{label}</label>
                <input
                  id={`signup-${name}`}
                  name={name}
                  type="text"
                  {...props}
                  value={form[name]}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      [name]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <button className="button-solid auth-submit" disabled={loading}>
              {loading
                ? "Creating your account…"
                : guest
                  ? "Create guest account"
                  : "Create restaurant account"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footnote">
            Already have an account?{" "}
            <Link to={guest ? "/customer/login" : "/login"}>Sign in</Link>
          </p>
        </section>
      </main>
      <footer className="public-footer">
        <span>Queue · Restaurant management</span>
        <span>A better welcome, together.</span>
      </footer>
    </div>
  );
}
