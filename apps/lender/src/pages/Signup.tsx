import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, Logo, StepDots } from '@plynth/shared/ui';
import {
  useAuth,
  type LenderSignupPayload,
} from '@plynth/supabase/auth';
import { criteriaService, type BuilderState } from '@plynth/supabase/services';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { isValidEmail, isValidPassword } from '@plynth/shared/utils';
import { AuthShell } from '../components/AuthShell';
import { CriteriaBuilder } from '../components/CriteriaBuilder';

const FIRM_TYPES: Array<[string, string]> = [
  ['mic', 'MIC'],
  ['private_lender', 'Private Lender'],
  ['family_office', 'Family Office'],
  ['debt_fund', 'Debt Fund'],
];

const LABELS = ['Account', 'Firm', 'Criteria', 'Subscription'];

export function Signup() {
  const navigate = useNavigate();
  const { signUpLender } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<LenderSignupPayload>({
    email: '',
    password: '',
    firm_name: '',
    lender_type: 'mic',
    tier: 'professional',
  });
  const set = <K extends keyof LenderSignupPayload>(k: K, v: LenderSignupPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const [criteria, setCriteria] = useState<BuilderState>(LENDER_MOCK.criteria);
  const [tier, setTier] = useState<'startup' | 'professional' | 'institutional'>(
    'professional'
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 3 — criteria builder — needs the full page width.
  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div className="topbar">
          <Logo size={30} />
          <span
            className="micro"
            style={{
              color: 'var(--muted)',
              borderLeft: '1px solid var(--border)',
              paddingLeft: 12,
              marginLeft: 4,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            For Lenders
          </span>
          <div className="spacer" />
          <span className="small muted-text">Step 03 / 04 — Criteria</span>
        </div>
        <div className="page page-wide" style={{ paddingTop: 36 }}>
          <StepDots step={2} total={4} />
          <div style={{ marginBottom: 32, maxWidth: 620 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              03 / Criteria
            </div>
            <h1 className="h1">Define what you fund.</h1>
            <p className="lead" style={{ fontSize: 17, marginTop: 8 }}>
              This is how Plynth knows which deals to send you. Watch the preview as you tune.
            </p>
          </div>
          <CriteriaBuilder
            initial={criteria}
            onComplete={(c) => {
              setCriteria(c);
              window.scrollTo(0, 0);
              setStep(3);
            }}
            ctaLabel="Continue to subscription"
            embedded
          />
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!isValidEmail(form.email)) return 'Please enter a valid email.';
      if (!isValidPassword(form.password))
        return 'Password must be at least 12 characters.';
      if (!form.firm_name) return 'Firm name is required.';
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
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    const r = await signUpLender({ ...form, tier });
    if (r.user) {
      // Save the criteria the user just built.
      await criteriaService.upsert(r.user.id, criteria).catch(() => {});
    }
    setBusy(false);
    if (r.error) setErr(r.error);
    else navigate('/');
  };

  return (
    <AuthShell wide={step === 3 ? 760 : 480}>
      <StepDots step={step} total={4} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span
          style={{
            fontFamily: 'var(--serif)',
            color: 'var(--amber-deep)',
            fontSize: 13,
          }}
        >
          {'0' + (step + 1)}
        </span>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--slate-deep)',
          }}
        >
          {LABELS[step]}
        </span>
      </div>

      {step === 0 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>
            Create your account
          </h2>
          <Field label="Work email">
            <input
              className="input"
              type="email"
              placeholder="you@firm.ca"
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
          <Field label="Firm name">
            <input
              className="input"
              placeholder="e.g. Fortress MIC"
              value={form.firm_name}
              onChange={(e) => set('firm_name', e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>
            About your firm
          </h2>
          <p className="small muted-text" style={{ marginBottom: 22 }}>
            We confirm registration before deals are matched.
          </p>
          <Field label="Firm type">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 4,
              }}
            >
              {FIRM_TYPES.map(([id, label]) => (
                <div
                  key={id}
                  onClick={() => set('lender_type', id)}
                  style={{
                    border:
                      '1px solid ' +
                      (form.lender_type === id ? 'var(--slate)' : 'var(--border)'),
                    background:
                      form.lender_type === id ? 'var(--slate-bg)' : 'var(--white)',
                    borderRadius: 6,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      form.lender_type === id ? 'var(--slate-deep)' : 'var(--text-2)',
                    transition: 'all 200ms',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </Field>
          <Field
            label="Registration / regulatory body"
            hint="OSC, AMF, BCSC, or exempt-market dealer."
          >
            <input className="input" placeholder="e.g. OSC — Ontario" />
          </Field>
          <Field label="Assets under management (CAD)">
            <select className="select">
              <option>Under $25M</option>
              <option>$25M–$100M</option>
              <option>$100M–$500M</option>
              <option>$500M+</option>
            </select>
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>
            Choose your subscription
          </h2>
          <p className="small muted-text" style={{ marginBottom: 24 }}>
            Based on your criteria, you'd match roughly 47 deals a month. Professional is the
            common fit.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 28,
            }}
          >
            {(
              [
                ['startup', 'Starter', '$299', 'Up to 25 deals / mo'],
                ['professional', 'Professional', '$599', 'Unlimited + analytics'],
                ['institutional', 'Enterprise', '$999', 'Teams + API'],
              ] as const
            ).map(([id, name, price, desc]) => (
              <div
                key={id}
                onClick={() => setTier(id)}
                style={{
                  border:
                    '1px solid ' + (tier === id ? 'var(--amber)' : 'var(--border)'),
                  background: tier === id ? 'var(--amber-bg)' : 'var(--white)',
                  borderRadius: 8,
                  padding: '18px 16px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                <div className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
                  {name}
                </div>
                <div
                  className="num"
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 26,
                    fontWeight: 600,
                    color: 'var(--slate-deep)',
                    margin: '6px 0 4px',
                  }}
                >
                  {price}
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>/mo</span>
                </div>
                <div className="micro muted-text">{desc}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 22,
              marginTop: 6,
            }}
          >
            <div
              className="card card-pad"
              style={{
                background: '#FCFAF5',
                borderColor: 'var(--border)',
              }}
            >
              <div
                className="eyebrow"
                style={{ color: 'var(--amber-deep)', marginBottom: 10 }}
              >
                Billing — set up later
              </div>
              <p
                className="small"
                style={{ color: 'var(--slate-deep)', lineHeight: 1.55, margin: 0 }}
              >
                Payment processing isn't connected yet. Start matching now — your{' '}
                <b>{tier === 'startup' ? 'Starter' : tier === 'institutional' ? 'Enterprise' : 'Professional'}</b>{' '}
                tier is saved on your profile, and we'll prompt for a card before
                your first billing cycle.
              </p>
            </div>
          </div>
        </div>
      )}

      {err && (
        <p className="small" style={{ color: 'var(--dust)', marginTop: 12 }}>
          {err}
        </p>
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
          {step === 3 ? (busy ? 'Activating…' : 'Start matching') : 'Continue'}
        </button>
      </div>
      {step === 0 && (
        <p className="small muted-text" style={{ textAlign: 'center', marginTop: 20 }}>
          Already a member?{' '}
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
