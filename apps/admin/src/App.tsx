import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@plynth/supabase/auth';
import { AppShell } from './components/AppShell';
import { AuthShell } from './components/AuthShell';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Users } from './pages/Users';
import { Activity } from './pages/Activity';
import { Deals } from './pages/Deals';
import { Offers } from './pages/Offers';
import { ToastProvider } from './components/ToastContext';

export function App() {
  const { profile, loading, mockMode, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="skel" style={{ width: 220, height: 16 }} />
      </div>
    );
  }

  return (
    <ToastProvider>
      {mockMode && <DemoBanner />}
      {!profile ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : profile.role !== 'admin' ? (
        <NotAuthorized onSignOut={() => signOut()} />
      ) : (
        <AppShell>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/users" element={<Users />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      )}
    </ToastProvider>
  );
}

function NotAuthorized({ onSignOut }: { onSignOut: () => void }) {
  return (
    <AuthShell>
      <div className="eyebrow" style={{ color: 'var(--amber-deep)', marginBottom: 12 }}>
        Admin
      </div>
      <h2 className="h2" style={{ marginBottom: 6 }}>Not authorized</h2>
      <p className="small muted-text" style={{ marginBottom: 28 }}>
        This account does not have administrative access. If you reached this in
        error, sign out and use your portal at broker or lender.
      </p>
      <button className="btn btn-secondary btn-block" onClick={onSignOut}>
        Sign out
      </button>
    </AuthShell>
  );
}

function DemoBanner() {
  return (
    <div
      style={{
        background: 'var(--amber-bg)',
        borderBottom: '1px solid var(--amber)',
        padding: '6px 16px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--amber-deep)',
        fontWeight: 500,
      }}
    >
      Demo mode — Supabase env vars not set. Showing realistic mock data.
    </div>
  );
}
