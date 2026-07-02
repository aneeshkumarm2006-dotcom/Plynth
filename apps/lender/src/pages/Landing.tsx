import { Link } from 'react-router-dom';
import { Logo } from '@plynth/shared/ui';

// Public pre-login home for the lender portal. Shown at "/" when the visitor
// is not authenticated; authenticated lenders are routed to the dashboard.
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
          For Private Lenders
        </div>
        <h1 className="landing-title">Set your criteria. Receive only the deals that match.</h1>
        <p className="landing-lead">
          Tell Plynth what you fund — asset classes, provinces, LTV, loan size, speed — and see a
          curated stream of broker-submitted deals that fit. No noise, no tyre-kickers.
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
            <h3 className="h3">Deals that fit</h3>
            <p className="small muted-text">Only see submissions that match your funding criteria.</p>
          </div>
          <div className="landing-point">
            <h3 className="h3">Move fast</h3>
            <p className="small muted-text">Express interest and make offers directly to the broker.</p>
          </div>
          <div className="landing-point">
            <h3 className="h3">Stay in control</h3>
            <p className="small muted-text">Adjust your criteria any time to widen or narrow your flow.</p>
          </div>
        </div>
      </main>

      <footer className="landing-foot micro muted-text">
        Plynth operates a marketplace for licensed Canadian mortgage professionals. Access is reviewed.
      </footer>
    </div>
  );
}
