import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';
import { AuthShell } from '../components/AuthShell';

export function Login() {
  const navigate = useNavigate();
  const { signIn, mockMode } = useAuth();
  const [email, setEmail] = useState(mockMode ? 'eleanor@fortressmic.ca' : '');
  const [password, setPassword] = useState(mockMode ? 'demo-password' : '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setErr(null);
    setBusy(true);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.error) setErr(r.error);
    else navigate('/');
  };

  return (
    <AuthShell>
      <h2 className="h2" style={{ marginBottom: 6 }}>Sign in</h2>
      <p className="small muted-text" style={{ marginBottom: 28 }}>
        Your matched deals are waiting.
      </p>
      <Field label="Email">
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password">
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSignIn()}
        />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
        <a
          className="small"
          style={{ color: 'var(--slate)', cursor: 'pointer' }}
          onClick={() => navigate('/forgot-password')}
        >
          Forgot password
        </a>
      </div>
      {err && (
        <p className="small" style={{ color: 'var(--dust)', marginBottom: 12 }}>
          {err}
        </p>
      )}
      <button className="btn btn-primary btn-block" onClick={onSignIn} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="small muted-text" style={{ textAlign: 'center', marginTop: 22 }}>
        New to Plynth?{' '}
        <a
          style={{ color: 'var(--slate)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => navigate('/signup')}
        >
          Build your criteria
        </a>
      </p>
    </AuthShell>
  );
}
