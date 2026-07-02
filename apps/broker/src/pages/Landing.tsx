import { Link } from 'react-router-dom';
import { Logo } from '@plynth/shared/ui';

// Public pre-login home for the broker portal. Shown at "/" when the visitor
// is not authenticated; the app routes authenticated brokers to the dashboard.
export function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo size={30} />
        <nav className="landing-nav-links">
          <a href="/blog">Blog</a>
          <Link to="/login">Sign in</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">
            Create account
          </Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="eyebrow" style={{ color: 'var(--amber-deep)', marginBottom: 16 }}>
          For Mortgage Brokers
        </div>
        <h1 className="landing-title">Place your borrowers in front of Canada's private lenders.</h1>
        <p className="landing-lead">
          Submit a deal once and let Plynth match it to subscribed private lenders whose criteria fit.
          No cold outreach, no chasing — just the lenders who want your deal.
        </p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-primary btn-lg">
            Create your account
          </Link>
          <Link to="/login" className="btn btn-ghost btn-lg">
            Sign in
          </Link>
        </div>

        <div className="landing-points">
          <div className="landing-point">
            <h3 className="h3">Submit in minutes</h3>
            <p className="small muted-text">Enter the deal details once — Plynth handles the matching.</p>
          </div>
          <div className="landing-point">
            <h3 className="h3">Only matched lenders</h3>
            <p className="small muted-text">Your deal reaches lenders whose stated criteria actually fit.</p>
          </div>
          <div className="landing-point">
            <h3 className="h3">Confidential by design</h3>
            <p className="small muted-text">Borrower identity stays private until you choose to reveal it.</p>
          </div>
        </div>
      </main>

      <footer className="landing-foot micro muted-text">
        Plynth operates a marketplace for licensed Canadian mortgage professionals. Access is reviewed.
      </footer>
    </div>
  );
}
