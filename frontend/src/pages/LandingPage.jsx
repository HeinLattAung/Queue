import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ListOrdered,
  QrCode,
} from "lucide-react";
export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="public-nav">
        <Link to="/" className="queue-brand" aria-label="Queue home">
          <span className="brand-symbol">q.</span>queue
          <span className="brand-period">.</span>
        </Link>
        <Link to="/login" className="quiet-link">
          Restaurant sign in <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="landing-layout">
        <section className="landing-intro">
          <span className="eyebrow">A BETTER WAY TO WELCOME</span>
          <h1>
            Less waiting.
            <br />
            <em>More welcome.</em>
          </h1>
          <p>
            A considered space for the busy moments.
            <br />
            Queues, reservations, and your next guest — together.
          </p>
          <Link to="/signup" className="button-solid">
            Set up your restaurant <ArrowRight size={17} />
          </Link>
          <span className="landing-small">
            For the people behind a great service.
          </span>
        </section>
        <section className="welcome-board" aria-label="Choose your space">
          <div className="board-top">
            <span>TWO SIDES. ONE SERVICE.</span>
            <span className="small-dot" />
          </div>
          <div className="portal-choice">
            <span className="portal-number">01 / FOR YOUR TEAM</span>
            <h2>
              The host stand,
              <br />
              in your hands.
            </h2>
            <p>
              See the queue, manage reservations, and keep your floor moving.
            </p>
            <Link to="/login" className="portal-link">
              Open your workspace <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="portal-choice guest-choice">
            <span className="portal-number">02 / FOR YOUR GUESTS</span>
            <h2>
              A place in line.
              <br />
              Time to yourself.
            </h2>
            <p>
              Sign in to scan a restaurant QR code, join the queue, and follow
              your visit.
            </p>
            <Link to="/customer/login" className="portal-link">
              Continue as a guest <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
        <div className="landing-capabilities">
          <span>
            <ListOrdered size={17} /> A queue that keeps everyone informed
          </span>
          <span>
            <CalendarDays size={17} /> Reservations in one place
          </span>
          <span>
            <QrCode size={17} /> A simple scan to get started
          </span>
        </div>
      </main>
      <footer className="public-footer">
        <span>Queue · Restaurant management</span>
        <span>Built around a better welcome.</span>
      </footer>
    </div>
  );
}
