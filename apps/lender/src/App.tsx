import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@plynth/supabase/auth';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/ToastContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Matched } from './pages/Matched';
import { DealDetail } from './pages/DealDetail';
import { Criteria } from './pages/Criteria';
import { Pipeline } from './pages/Pipeline';
import { Funded } from './pages/Funded';
import { Notifications } from './pages/Notifications';
import { Account } from './pages/Account';

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
            <Route path="/matched" element={<Matched />} />
            <Route path="/deals/:dealId" element={<DealDetail />} />
            <Route path="/criteria" element={<Criteria />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/funded" element={<Funded />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/account" element={<Account />} />
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
