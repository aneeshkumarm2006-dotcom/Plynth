import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';
import { AuthShell } from '../components/AuthShell';

export function Login() {
  const navigate = useNavigate();
  const { signIn, mockMode } = useAuth();
  const [email, setEmail] = useState(mockMode ? 'admin@plynth.ca' : '');
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
      <div className="eyebrow" style={{ color: 'var(--amber-deep)', marginBottom: 12 }}>
        Admin
      </div>
      <h2 className="h2" style={{ marginBottom: 6 }}>Sign in</h2>
      <p className="small muted-text" style={{ marginBottom: 28 }}>
        Plynth operations console.
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
      {err && (
        <p
          className="small"
          style={{ color: 'var(--dust)', marginBottom: 12, marginTop: 6, textAlign: 'center' }}
        >
          {err}
        </p>
      )}
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 8 }}
        onClick={onSignIn}
        disabled={busy}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </AuthShell>
  );
}
