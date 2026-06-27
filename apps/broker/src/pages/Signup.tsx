import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Field, StepDots } from '@plynth/shared/ui';
import { useAuth, type BrokerSignupPayload } from '@plynth/supabase/auth';
import { isValidEmail, isValidPassword } from '@plynth/shared/utils';
import { AuthShell } from '../components/AuthShell';

const REGULATORS = [
  ['ON', 'FSRA — Ontario'],
  ['QC', 'AMF — Québec'],
  ['BC', 'BCFSA — British Columbia'],
  ['AB', 'RECA — Alberta'],
] as const;

export function Signup() {
  const navigate = useNavigate();
  const { signUpBroker } = useAuth();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState<BrokerSignupPayload>({
    email: '',
    password: '',
    brokerage_name: '',
    fsra_province: 'ON',
    fsra_license_number: '',
    first_name: '',
    last_name: '',
  });
  const set = <K extends keyof BrokerSignupPayload>(key: K, value: BrokerSignupPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const labels = ['Account', 'License', 'Profile'];

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!isValidEmail(form.email)) return 'Please enter a valid email.';
      if (!isValidPassword(form.password)) return 'Password must be at least 12 characters.';
      if (!form.brokerage_name) return 'Brokerage name is required.';
    }
    if (step === 1) {
      if (!form.fsra_license_number) return 'License number is required.';
    }
    if (step === 2) {
      if (!form.first_name || !form.last_name) return 'Full name is required.';
      if (!agreed)
        return 'You must agree to the Privacy Policy and Terms to continue.';
    }
    return null;
  };

  const onContinue = async () => {
    const v = validateStep();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    const r = await signUpBroker(form);
    setBusy(false);
    if (r.error) setErr(r.error);
    else navigate('/');
  };

  return (
    <AuthShell wide={480}>
      <StepDots step={step} total={3} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span
          className="sd-num"
          style={{ fontFamily: 'var(--serif)', color: 'var(--amber-deep)', fontSize: 13 }}
        >
          {'0' + (step + 1)}
        </span>
        <span className="sd-slash" style={{ color: 'var(--border)' }}>
          /
        </span>
        <span
          className="sd-label"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--slate-deep)',
          }}
        >
          {labels[step]}
        </span>
      </div>

      {step === 0 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>Create your account</h2>
          <Field label="Work email">
            <input
              className="input"
              type="email"
              placeholder="you@brokerage.ca"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Password" hint="At least 12 characters.">
            <input
              className="input"
              type="password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </Field>
          <Field label="Brokerage name">
            <input
              className="input"
              placeholder="e.g. Northbridge Mortgage Partners"
              value={form.brokerage_name}
              onChange={(e) => set('brokerage_name', e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>License verification</h2>
          <p className="small muted-text" style={{ marginBottom: 22 }}>
            We confirm your standing with the provincial regulator before access is
            granted.
          </p>
          <Field label="Regulator / Province">
            <select
              className="select"
              value={form.fsra_province}
              onChange={(e) => set('fsra_province', e.target.value)}
            >
              {REGULATORS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="License number" hint="Format varies by regulator.">
            <input
              className="input input-num"
              placeholder="M08009124"
              value={form.fsra_license_number}
              onChange={(e) => set('fsra_license_number', e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>Your profile</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <Avatar initials={(form.first_name[0] ?? '') + (form.last_name[0] ?? '')} size={56} />
            <button className="btn btn-ghost btn-sm">Upload photo</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="First name">
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 20,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span className="small" style={{ color: 'var(--slate-deep)' }}>
            I agree to the Privacy Policy and Terms of Service.
          </span>
        </label>
      )}

      {err && (
        <p className="small" style={{ color: 'var(--dust)', marginTop: 12 }}>{err}</p>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={onContinue}
          disabled={busy}
        >
          {step < 2 ? 'Continue' : busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>

      {step === 0 && (
        <p className="small muted-text" style={{ textAlign: 'center', marginTop: 20 }}>
          Already have access?{' '}
          <a
            style={{ color: 'var(--slate)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/login')}
          >
            Sign in
          </a>
        </p>
      )}
    </AuthShell>
  );
}
