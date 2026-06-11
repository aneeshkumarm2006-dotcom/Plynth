import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '@plynth/shared/ui';
import { isValidEmail } from '@plynth/shared/utils';
import { useAuth } from '@plynth/supabase/auth';
import { AuthShell } from '../components/AuthShell';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSend = async () => {
    if (!isValidEmail(email)) {
      setErr('Please enter a valid email.');
      return;
    }
    setErr(null);
    setBusy(true);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (r.error) setErr(r.error);
    else setSent(true);
  };

  return (
    <AuthShell>
      <h2 className="h2" style={{ marginBottom: 6 }}>
        Reset password
      </h2>
      {sent ? (
        <p className="body" style={{ color: 'var(--slate-deep)', marginTop: 16 }}>
          If <b>{email}</b> is on the marketplace, a reset link is on its way.
          Check your inbox.
        </p>
      ) : (
        <>
          <p className="small muted-text" style={{ marginBottom: 28 }}>
            Enter the email on your account and we'll send you a reset link.
          </p>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
            />
          </Field>
          {err && (
            <p
              className="small"
              style={{ color: 'var(--dust)', marginTop: 4, marginBottom: 8 }}
            >
              {err}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={onSend}
            disabled={busy}
            style={{ marginTop: 12 }}
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </>
      )}
      <p className="small muted-text" style={{ textAlign: 'center', marginTop: 22 }}>
        <a
          style={{ color: 'var(--slate)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => navigate('/login')}
        >
          Back to sign in
        </a>
      </p>
    </AuthShell>
  );
}
