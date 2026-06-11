import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DealNo,
  DefList,
  Field,
  FigurePlaceholder,
  MatchBar,
  SectionDivider,
} from '@plynth/shared/ui';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import { matchedService, offersService, type MatchedDeal } from '@plynth/supabase/services';
import { useToastFire } from '../components/ToastContext';
import { cityProvince, dollars, ltvPct, termLabel, positionLabel } from '../lib/present';

export function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToastFire();
  const { profile } = useAuth();

  const { data: deal } = useAsync<MatchedDeal | null>(
    () => matchedService.getForLender(profile?.id ?? '', dealId ?? ''),
    [profile?.id, dealId]
  );

  const f = LENDER_MOCK.focus;
  // View model: live deal when resolved, editorial fixture as the fallback.
  const view = {
    no: deal?.deal_number ?? dealId ?? f.no,
    score: deal?.match_score ?? f.score,
    amount: deal ? dollars(deal.loan_amount_cents) : f.amount,
    position: deal ? positionLabel(deal.position) : 'First',
    neighbourhood: deal?.neighbourhood ?? f.neighbourhood,
    city: deal ? cityProvince(deal.city, deal.province) : f.city,
    ltv: deal ? ltvPct(deal.ltv) : f.ltv,
    term: deal ? termLabel(deal.term_months) : f.term,
  };
  // The real deal UUID to attach an offer to (mock mode falls back to the number).
  const offerDealId = deal?.deal_id ?? dealId ?? f.no;

  return (
    <div className="page page-wide">
      <button
        className="btn btn-tertiary btn-sm"
        style={{ marginBottom: 16, paddingLeft: 0 }}
        onClick={() => navigate('/matched')}
      >
        ‹ Back to matched deals
      </button>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <DealNo n={view.no} size={15} />
            <span className="pill pill-matched">Matched</span>
            <MatchBar score={view.score} width={90} />
          </div>
          <h1 className="h1">
            {view.amount}{' '}
            <span
              style={{
                fontSize: 18,
                color: 'var(--text-2)',
                fontFamily: 'var(--sans)',
                fontWeight: 500,
              }}
            >
              CAD
            </span>
          </h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
            {view.position} · {view.neighbourhood}, {view.city}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toast({ title: 'Marked interested' })}
          >
            Interested
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => toast({ title: 'Passed on this deal' })}
          >
            Pass
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 40,
          marginTop: 36,
        }}
      >
        <div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 44 }}
          >
            <div>
              <SectionDivider n="01" label="Deal facts" />
              <DefList
                items={[
                  ['Property type', 'Detached, residential'],
                  ['Loan amount', view.amount + ' CAD'],
                  ['Position', view.position],
                  ['LTV', view.ltv],
                  ['Appraised value', '$590,000 CAD'],
                  ['Term', view.term],
                  ['Beacon band', '680–720'],
                  ['Purpose', 'Refinance — consolidation'],
                ]}
              />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ lineHeight: 1.65 }}>
                {deal?.summary ??
                  'A first mortgage refinance on an owner-occupied detached home in East York. Self-employed borrower with two years of established income, consolidating higher-interest debt.'}
              </p>
              <p className="body" style={{ lineHeight: 1.65, marginTop: 14 }}>
                At {view.ltv} LTV against a fresh appraisal, the position sits comfortably inside
                your residential band. Exit is via institutional refinance at term.
              </p>
              <div style={{ marginTop: 18 }}>
                <SectionDivider n="03" label="Documents" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Appraisal — 142 Westbrook Ave',
                    'MLS listing',
                    'Notice of Assessment 2025',
                  ].map((doc) => (
                    <div
                      key={doc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <FigurePlaceholder
                        label="PDF"
                        style={{ width: 30, height: 36, borderRadius: 3 }}
                      />
                      <span className="small" style={{ flex: 1 }}>
                        {doc}
                      </span>
                      <span className="micro muted-text">View</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionDivider
            n="04"
            label="Comparable deals you've funded"
            meta="Only on Plynth"
          />
          <div className="card" style={{ overflow: 'hidden', marginBottom: 44 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Deal', 'Location', 'Amount', 'LTV', 'Rate', 'Closed'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i >= 2 && i <= 4 ? 'right' : 'left',
                        padding: '12px 16px',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LENDER_MOCK.comparables.map((d, i) => (
                  <tr
                    key={d.no}
                    style={{
                      borderBottom:
                        i < LENDER_MOCK.comparables.length - 1
                          ? '1px solid var(--border)'
                          : 'none',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span className="deal-no" style={{ fontSize: 13 }}>
                        № {d.no}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{d.city}</td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: 'var(--slate-deep)',
                      }}
                    >
                      {d.amount}
                    </td>
                    <td className="num" style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {d.ltv}
                    </td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        color: 'var(--amber-deep)',
                        fontWeight: 600,
                      }}
                    >
                      {d.rate}
                    </td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontSize: 13,
                        color: 'var(--text-2)',
                      }}
                    >
                      {d.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OfferComposer
            dealId={offerDealId}
            lenderId={profile?.id}
            defaultLtv={view.ltv.replace('%', '')}
            onDone={() => navigate('/pipeline')}
          />
        </div>

        <div>
          <SectionDivider n="—" label="Why this matched" />
          <div className="card card-pad" style={{ background: '#FCFAF5' }}>
            {(
              [
                ['Asset class', `${deal?.asset_class ?? 'Residential 1st'} — in criteria`],
                ['Geography', `${view.city} — in criteria`],
                ['LTV', `${view.ltv} — within limit`],
                ['Loan size', `${view.amount} — within band`],
                ['Beacon', '680–720 — above 640 min'],
              ] as Array<[string, string]>
            ).map(([l, v], i, arr) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '9px 0',
                  borderBottom:
                    i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{ color: 'var(--sage)', fontWeight: 700, fontSize: 13 }}
                >
                  ✓
                </span>
                <div>
                  <div
                    className="small"
                    style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                  >
                    {l}
                  </div>
                  <div className="micro muted-text">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferComposer({
  dealId,
  lenderId,
  defaultLtv,
  onDone,
}: {
  dealId: string;
  lenderId?: string;
  defaultLtv: string;
  onDone: () => void;
}) {
  const [rate, setRate] = useState('9.25');
  const [lenderFee, setLenderFee] = useState('2.0');
  const [brokerFee, setBrokerFee] = useState('1.0');
  const [term, setTerm] = useState('12');
  const [maxLtv, setMaxLtv] = useState(defaultLtv || '72.0');
  const [expires, setExpires] = useState('3');
  const [conditions, setConditions] = useState('Full appraisal, fire insurance, title insurance');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToastFire();

  const submit = async () => {
    setSubmitting(true);
    try {
      await offersService.submit(lenderId ?? '', {
        deal_id: dealId,
        rate_percent: parseFloat(rate),
        lender_fee_percent: parseFloat(lenderFee) || undefined,
        broker_fee_percent: parseFloat(brokerFee) || undefined,
        term_months: parseInt(term, 10) || undefined,
        max_ltv: parseFloat(maxLtv) || undefined,
        conditions_text: note.trim() ? `${conditions}\n\nNote: ${note.trim()}` : conditions,
        expires_in_days: parseInt(expires, 10) || 3,
      });
      toast({
        title: 'Offer submitted at ' + rate + '%',
        sub: "The broker has been notified. You'll see their response here.",
      });
      onDone();
    } catch (err) {
      toast({ title: 'Could not submit offer', sub: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card card-pad" style={{ borderColor: 'var(--amber)', padding: 32 }}>
      <SectionDivider n="05" label="Compose your offer" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 18 }}>
        <Field label="Interest rate (%)">
          <input
            className="input input-num"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
        <Field label="Lender fee (%)">
          <input
            className="input input-num"
            value={lenderFee}
            onChange={(e) => setLenderFee(e.target.value)}
          />
        </Field>
        <Field label="Broker fee (%)">
          <input
            className="input input-num"
            value={brokerFee}
            onChange={(e) => setBrokerFee(e.target.value)}
          />
        </Field>
        <Field label="Term (months)">
          <select className="select" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>12</option>
            <option>18</option>
            <option>24</option>
          </select>
        </Field>
        <Field label="Max LTV (%)">
          <input
            className="input input-num"
            value={maxLtv}
            onChange={(e) => setMaxLtv(e.target.value)}
          />
        </Field>
        <Field label="Offer expires">
          <select className="select" value={expires} onChange={(e) => setExpires(e.target.value)}>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
          </select>
        </Field>
      </div>
      <Field label="Conditions">
        <input
          className="input"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
        />
      </Field>
      <Field label="Note to broker (optional)">
        <textarea
          className="input"
          rows={2}
          placeholder="Add context for the broker…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit offer'}
        </button>
        <button className="btn btn-ghost">Save draft</button>
      </div>
    </div>
  );
}
