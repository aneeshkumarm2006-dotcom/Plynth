import { useState } from 'react';
import { api, ApiError } from '../lib/api';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password) return;
    setErr(null);
    setBusy(true);
    try {
      await api.login(password);
      onSuccess();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card card card-pad">
        <div className="eyebrow" style={{ color: 'var(--amber-deep)', marginBottom: 12 }}>
          SEO Team
        </div>
        <h2 className="h2" style={{ marginBottom: 6 }}>
          Sign in
        </h2>
        <p className="small muted-text" style={{ marginBottom: 24 }}>
          Enter the shared dashboard password to publish and manage blog posts.
        </p>
        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {err && (
          <p className="small" style={{ color: 'var(--dust)', margin: '4px 0 12px', textAlign: 'center' }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
