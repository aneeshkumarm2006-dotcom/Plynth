import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@plynth/supabase/auth';
import { AppShell } from './components/AppShell';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { DealDetail } from './pages/DealDetail';
import { Submit } from './pages/Submit';
import { Lenders } from './pages/Lenders';
import { Funded } from './pages/Funded';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { ToastProvider } from './components/ToastContext';

export function App() {
  const { profile, loading, mockMode } = useAuth();

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
      {profile ? (
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/deals/:dealId" element={<DealDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/lenders" element={<Lenders />} />
            <Route path="/funded" element={<Funded />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </ToastProvider>
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
