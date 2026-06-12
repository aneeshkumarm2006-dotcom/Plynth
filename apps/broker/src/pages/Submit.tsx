import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DefList,
  Field,
  FigurePlaceholder,
  SectionDivider,
} from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';
import { dealsService, type DealSubmitInput } from '@plynth/supabase/services';
import { useToastFire } from '../components/ToastContext';

const STEPS = ['Property', 'Loan details', 'Borrower', 'Documents', 'Review'];

const POSITION_VALUES: Record<string, DealSubmitInput['position']> = {
  'First mortgage': 'first',
  'Second mortgage': 'second',
  'Third mortgage': 'third+',
};

// Parse a display amount like "425,000" into integer cents.
function dollarsToCents(s: string): number {
  return Math.round((parseFloat(s.replace(/[^0-9.]/g, '')) || 0) * 100);
}

export function Submit() {
  const navigate = useNavigate();
  const toast = useToastFire();
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [extracted, setExtracted] = useState(false);
  const [anon, setAnon] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Controlled state for the fields that map to DealSubmitInput. The remaining
  // demo fields stay uncontrolled; their defaults seed the submission.
  const [address, setAddress] = useState('142 Westbrook Avenue, East York, Toronto, ON');
  const [propertyType, setPropertyType] = useState('Detached');
  const [loanAmount, setLoanAmount] = useState('425,000');
  const [appraisedValue, setAppraisedValue] = useState('590,000');
  const [position, setPosition] = useState('First mortgage');
  const [term, setTerm] = useState('12 months');
  const [employment, setEmployment] = useState('Self-employed');

  const loanCents = dollarsToCents(loanAmount);
  const valueCents = dollarsToCents(appraisedValue);
  const ltv = valueCents > 0 ? Math.round((loanCents / valueCents) * 1000) / 10 : 0;

  const buildInput = (): DealSubmitInput => {
    // Derive city/province from the trailing tokens of the address line.
    const parts = address.split(',').map((p) => p.trim());
    const province = parts[parts.length - 1] || 'ON';
    const city = parts[parts.length - 2] || parts[0] || '';
    return {
      // deal_number omitted — dealsService allocates the next number for the broker.
      city,
      province,
      property_address: address,
      property_type: propertyType,
      asset_class: 'Residential 1st',
      loan_amount_cents: loanCents,
      estimated_value_cents: valueCents,
      ltv,
      position: POSITION_VALUES[position] ?? 'first',
      term_months: parseInt(term, 10) || 12,
      is_self_employed: employment === 'Self-employed',
    };
  };

  const [savingDraft, setSavingDraft] = useState(false);

  const onContinue = async () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    try {
      const deal = await dealsService.create(profile?.id ?? '', buildInput(), 'active');
      toast({
        title: `Deal № ${deal.deal_number} submitted`,
        sub: 'Matching against subscribed lender criteria sets.',
      });
      navigate('/pipeline');
    } catch (err) {
      toast({ title: 'Could not submit deal', sub: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const deal = await dealsService.create(profile?.id ?? '', buildInput(), 'draft');
      toast({
        title: `Draft saved — Deal № ${deal.deal_number}`,
        sub: 'Finish and submit it from your pipeline anytime.',
      });
      navigate('/pipeline');
    } catch (err) {
      toast({ title: 'Could not save draft', sub: (err as Error).message });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <button
        className="btn btn-tertiary btn-sm"
        style={{ marginBottom: 16, paddingLeft: 0 }}
        onClick={() => navigate('/pipeline')}
      >
        ‹ Cancel
      </button>
      <h1 className="h1" style={{ marginBottom: 8 }}>Submit a deal</h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>
        It takes about four minutes. Your borrower stays anonymized until a lender signals
        interest.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            onClick={() => i < step && setStep(i)}
            style={{ flex: 1, cursor: i < step ? 'pointer' : 'default' }}
          >
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: i <= step ? 'var(--slate)' : 'var(--border)',
                marginBottom: 8,
                transition: 'background 200ms',
              }}
            />
            <span
              className="micro"
              style={{
                color: i <= step ? 'var(--slate-deep)' : 'var(--muted)',
                fontWeight: i === step ? 600 : 500,
              }}
            >
              {('0' + (i + 1)).slice(-2)} {s}
            </span>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ padding: 36, minHeight: 360 }}>
        {step === 0 && (
          <div className="fade-in">
            <SectionDivider n="01" label="Property" meta="Address & location" />
            <Field label="Property address">
              <input
                className="input"
                placeholder="Start typing an address…"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <FigurePlaceholder
              label="[ map preview — 142 Westbrook Avenue ]"
              style={{ height: 200, marginBottom: 16 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Property type">
                <select
                  className="select"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option>Detached</option>
                  <option>Semi-detached</option>
                  <option>Townhouse</option>
                  <option>Condominium</option>
                  <option>Multi-residential</option>
                  <option>Commercial</option>
                  <option>Vacant land</option>
                </select>
              </Field>
              <Field label="Occupancy">
                <select className="select">
                  <option>Owner-occupied</option>
                  <option>Tenant-occupied</option>
                  <option>Vacant</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <SectionDivider n="02" label="Loan details" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Loan amount (CAD)">
                <input
                  className="input input-num"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                />
              </Field>
              <Field label="Appraised value (CAD)">
                <input
                  className="input input-num"
                  value={appraisedValue}
                  onChange={(e) => setAppraisedValue(e.target.value)}
                />
              </Field>
              <Field label="Position">
                <select
                  className="select"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option>First mortgage</option>
                  <option>Second mortgage</option>
                  <option>Third mortgage</option>
                </select>
              </Field>
              <Field label="Computed LTV" hint="Auto-calculated">
                <input
                  className="input input-num"
                  value={ltv.toFixed(1) + '%'}
                  readOnly
                  style={{ background: '#FCFAF5' }}
                />
              </Field>
              <Field label="Term">
                <select className="select" value={term} onChange={(e) => setTerm(e.target.value)}>
                  <option>6 months</option>
                  <option>12 months</option>
                  <option>18 months</option>
                  <option>24 months</option>
                </select>
              </Field>
              <Field label="Rate expectation">
                <input className="input" defaultValue="8.5–11%" />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <SectionDivider n="03" label="Borrower snapshot" meta="Anonymized by default" />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                background: '#FCFAF5',
                border: '1px solid var(--border)',
                borderRadius: 6,
                marginBottom: 22,
              }}
            >
              <div>
                <div className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
                  Reveal borrower identity on lender interest
                </div>
                <div className="micro muted-text">
                  When off, lenders see the profile but not the name until they make an
                  offer.
                </div>
              </div>
              <button
                onClick={() => setAnon((a) => !a)}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  background: anon ? 'var(--border)' : 'var(--sage)',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 200ms',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: anon ? 3 : 21,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'left 200ms',
                  }}
                />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Employment">
                <select
                  className="select"
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value)}
                >
                  <option>Self-employed</option>
                  <option>Salaried</option>
                  <option>Commission</option>
                  <option>Retired</option>
                </select>
              </Field>
              <Field label="Beacon score band">
                <select className="select">
                  <option>680–720</option>
                  <option>640–680</option>
                  <option>720+</option>
                  <option>600–640</option>
                </select>
              </Field>
              <Field label="Income (stated, CAD)">
                <input className="input input-num" defaultValue="180,000" />
              </Field>
              <Field label="Purpose">
                <select className="select">
                  <option>Refinance — consolidation</option>
                  <option>Purchase</option>
                  <option>Bridge</option>
                  <option>Equity take-out</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <SectionDivider n="04" label="Documents" meta="Appraisal · MLS · financials" />
            {!extracted ? (
              <div
                className="filedrop"
                onClick={() => setExtracted(true)}
                style={{ padding: 48 }}
              >
                <div className="small" style={{ color: 'var(--slate-deep)', fontWeight: 600 }}>
                  Drop documents here
                </div>
                <div className="micro" style={{ marginTop: 4 }}>
                  PDF or image — Plynth reads them and proposes the terms
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
                  Browse files
                </button>
              </div>
            ) : (
              <div className="fade-in">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 22,
                  }}
                >
                  {[
                    'Appraisal — 142 Westbrook Ave.pdf',
                    'MLS listing.pdf',
                    'Notice of Assessment 2025.pdf',
                  ].map((f) => (
                    <div
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--sage)',
                        }}
                      />
                      <span className="small" style={{ flex: 1 }}>
                        {f}
                      </span>
                      <span className="micro muted-text">Read</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    border: '1px solid var(--amber)',
                    borderRadius: 8,
                    padding: 22,
                    background: 'var(--amber-bg)',
                  }}
                >
                  <div
                    className="eyebrow"
                    style={{ color: 'var(--amber-deep)', marginBottom: 12 }}
                  >
                    From your documents, Plynth found
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3,1fr)',
                      gap: 18,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      ['LTV', '72%'],
                      ['Position', 'First'],
                      ['Term', '12 months'],
                      ['Appraised value', '$590,000'],
                      ['Property', 'Detached'],
                      ['Occupancy', 'Owner-occupied'],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div className="micro muted-text">{l}</div>
                        <div
                          className="num"
                          style={{
                            fontFamily: 'var(--serif)',
                            fontSize: 18,
                            fontWeight: 600,
                            color: 'var(--slate-deep)',
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary btn-sm">Confirm</button>
                    <button className="btn btn-ghost btn-sm">Edit values</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="fade-in">
            <SectionDivider n="05" label="Review & submit" />
            <DefList
              items={[
                ['Property', address],
                ['Property type', `${propertyType}, owner-occupied`],
                ['Loan amount', '$' + loanAmount + ' CAD'],
                ['Position', position],
                ['LTV', ltv.toFixed(1) + '%'],
                ['Term', term],
                ['Rate expectation', '8.5–11%'],
                ['Borrower', anon ? 'Anonymized until lender interest' : 'Revealed on submission'],
                ['Documents', '3 attached'],
              ]}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginTop: 22,
                padding: '12px 14px',
                background: '#FCFAF5',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
              <span className="small muted-text">
                I confirm I am the licensed broker of record for this deal and have the
                borrower&rsquo;s consent to submit it to the marketplace.
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 24,
          justifyContent: 'space-between',
        }}
      >
        <div>
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-tertiary"
            onClick={onSaveDraft}
            disabled={savingDraft || submitting}
          >
            {savingDraft ? 'Saving…' : 'Save draft'}
          </button>
          <button className="btn btn-primary" onClick={onContinue} disabled={submitting || savingDraft}>
            {step < 4 ? 'Continue' : submitting ? 'Submitting…' : 'Submit to marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
}
