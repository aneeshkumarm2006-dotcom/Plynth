import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '@plynth/shared/ui';
import { isValidPassword } from '@plynth/shared/utils';
import { useAuth } from '@plynth/supabase/auth';
import { AuthShell } from '../components/AuthShell';

export function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    if (!isValidPassword(pw)) {
      setErr('Password must be at least 12 characters.');
      return;
    }
    if (pw !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setErr(null);
    setBusy(true);
    const r = await updatePassword(pw);
    setBusy(false);
    if (r.error) setErr(r.error);
    else setDone(true);
  };

  return (
    <AuthShell>
      <h2 className="h2" style={{ marginBottom: 6 }}>
        Set a new password
      </h2>
      {done ? (
        <>
          <p className="body" style={{ marginTop: 16 }}>
            Your password has been updated.
          </p>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 18 }}
            onClick={() => navigate('/')}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <p className="small muted-text" style={{ marginBottom: 28 }}>
            Pick something at least 12 characters long.
          </p>
          <Field label="New password">
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </Field>
          {err && (
            <p className="small" style={{ color: 'var(--dust)', marginBottom: 8 }}>
              {err}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={onSubmit}
            disabled={busy}
            style={{ marginTop: 12 }}
          >
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </>
      )}
    </AuthShell>
  );
}
