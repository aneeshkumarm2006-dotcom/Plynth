import { useEffect, useState } from 'react';
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
import { formatPercent, timeAgo } from '@plynth/shared/utils';
import { useAuth } from '@plynth/supabase/auth';
import {
  matchedService,
  offersService,
  criteriaService,
  fundingsService,
  type MatchedDeal,
  type BuilderState,
  type OfferRow,
  type CounterEntry,
  type FundingRow,
} from '@plynth/supabase/services';
import { useToastFire } from '../components/ToastContext';
import {
  cityProvince,
  dollars,
  ltvPct,
  termLabel,
  positionLabel,
  titleCase,
  beaconBand,
  whyMatched,
  fundingToRow,
} from '../lib/present';

export function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToastFire();
  const { profile } = useAuth();

  const { data: deal } = useAsync<MatchedDeal | null>(
    () => matchedService.getForLender(profile?.id ?? '', dealId ?? ''),
    [profile?.id, dealId]
  );
  const { data: criteria } = useAsync<BuilderState | null>(
    () => criteriaService.getForLender(profile?.id ?? ''),
    [profile?.id]
  );
  // The lender's own funded deals, shown as real comparables (section 04).
  const { data: fundings } = useAsync<FundingRow[]>(
    () => fundingsService.listForLender(profile?.id ?? ''),
    [profile?.id]
  );

  // Record this lender's view of the deal (increments views_count for the broker's
  // demand signal). Fires once the real deal id resolves.
  useEffect(() => {
    if (profile?.id && deal?.deal_id) {
      void matchedService.recordView(profile.id, deal.deal_id);
    }
  }, [profile?.id, deal?.deal_id]);

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
    propertyType: deal?.property_type ? titleCase(deal.property_type) : 'Detached, residential',
    appraisedValue:
      typeof deal?.estimated_value_cents === 'number'
        ? dollars(deal.estimated_value_cents) + ' CAD'
        : '$590,000 CAD',
    beaconBand: deal?.beacon_score != null ? beaconBand(deal.beacon_score) : '680–720',
  };
  // The real deal UUID to attach an offer to (mock mode falls back to the number).
  const offerDealId = deal?.deal_id ?? dealId ?? f.no;
  const factors = whyMatched(deal, criteria ?? null);

  // Interested / Pass signal — seeded from the persisted value once the deal
  // resolves, then updated optimistically and written through the service.
  const [interest, setInterest] = useState<'interested' | 'passed' | null>(null);
  useEffect(() => {
    if (deal) setInterest(deal.interest_status ?? null);
  }, [deal]);
  const act = (next: 'interested' | 'passed') => {
    setInterest(next);
    if (profile?.id) void matchedService.setInterest(profile.id, offerDealId, next);
    toast({ title: next === 'interested' ? 'Marked interested' : 'Passed on this deal' });
  };

  // Comparable deals = this lender's own recent fundings. Falls back to the
  // editorial fixture only when they've funded nothing yet.
  const comparables =
    fundings && fundings.length
      ? fundings.slice(0, 4).map((f) => {
          const r = fundingToRow(f);
          return { no: r.no, city: r.city, amount: r.amount, mid: r.term, rate: r.rate, closed: r.closed };
        })
      : LENDER_MOCK.comparables.map((c) => ({
          no: c.no,
          city: c.city,
          amount: c.amount,
          mid: c.ltv,
          rate: c.rate,
          closed: c.closed,
        }));
  const compMidLabel = fundings && fundings.length ? 'Term' : 'LTV';

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
            className={'btn btn-sm ' + (interest === 'interested' ? 'btn-primary' : 'btn-secondary')}
            onClick={() => act('interested')}
          >
            {interest === 'interested' ? 'Interested ✓' : 'Interested'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => act('passed')}
          >
            {interest === 'passed' ? 'Passed' : 'Pass'}
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
                  ['Property type', view.propertyType],
                  ['Loan amount', view.amount + ' CAD'],
                  ['Position', view.position],
                  ['LTV', view.ltv],
                  ['Appraised value', view.appraisedValue],
                  ['Term', view.term],
                  ['Beacon band', view.beaconBand],
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
                  {['Deal', 'Location', 'Amount', compMidLabel, 'Rate', 'Closed'].map((h, i) => (
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
                {comparables.map((d, i) => (
                  <tr
                    key={d.no}
                    style={{
                      borderBottom:
                        i < comparables.length - 1
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
                      {d.mid}
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

          <NegotiationPanel
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
              factors ?? [
                { label: 'Asset class', detail: 'In your criteria', pass: true },
                { label: 'Geography', detail: 'In your criteria', pass: true },
                { label: 'LTV', detail: 'Within your limit', pass: true },
                { label: 'Loan size', detail: 'Within your band', pass: true },
              ]
            ).map((factor, i, arr) => (
              <div
                key={factor.label}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '9px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    color: factor.pass ? 'var(--sage)' : 'var(--dust)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {factor.pass ? '✓' : '✕'}
                </span>
                <div>
                  <div className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
                    {factor.label}
                  </div>
                  <div className="micro muted-text">{factor.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shows the live negotiation once this lender has an offer on the deal:
// the current offer status, the counter timeline (correctly labelled from
// the lender's perspective), and — when the broker has countered — Accept
// / Counter-back actions. Falls back to the blank composer when no offer
// exists yet.
const OFFER_TONE: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Awaiting broker' },
  viewed: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Viewed by broker' },
  countered: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Broker countered' },
  accepted: { bg: 'var(--sage-bg)', color: '#5E7A67', label: 'Accepted — funded' },
  rejected: { bg: 'var(--dust-bg)', color: '#A85F5F', label: 'Declined' },
  expired: { bg: '#F1EFE9', color: 'var(--muted)', label: 'Expired' },
};

function NegotiationPanel({
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
  const toast = useToastFire();
  const { data, loading, refresh } = useAsync<{ myOffer: OfferRow | null; history: CounterEntry[] }>(
    () =>
      lenderId
        ? offersService.negotiationForDeal(dealId, lenderId)
        : Promise.resolve({ myOffer: null, history: [] }),
    [dealId, lenderId]
  );
  const [countering, setCountering] = useState(false);
  const [cRate, setCRate] = useState('');
  const [cLenderFee, setCLenderFee] = useState('');
  const [cNote, setCNote] = useState('');
  const [busy, setBusy] = useState(false);

  const myOffer = data?.myOffer ?? null;
  const history = data?.history ?? [];

  // No offer yet (or mock mode) → original compose flow.
  if (loading && !data) {
    return <div className="skel" style={{ height: 200, borderRadius: 8 }} />;
  }
  if (!myOffer) {
    return <OfferComposer dealId={dealId} lenderId={lenderId} defaultLtv={defaultLtv} onDone={onDone} />;
  }

  const tone = OFFER_TONE[myOffer.status] ?? OFFER_TONE.submitted;
  // Latest broker counter (the terms the lender is being asked to accept).
  const brokerCounter = history.find((h) => h.initiated_by === 'broker');

  const acceptCounter = async () => {
    setBusy(true);
    try {
      await offersService.accept(myOffer.id);
      toast({ title: 'Counter accepted — deal funded' });
      onDone();
    } catch (err) {
      toast({ title: 'Could not accept', sub: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await offersService.reject(myOffer.id);
      toast({ title: 'Offer withdrawn' });
      refresh();
    } catch (err) {
      toast({ title: 'Could not withdraw', sub: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const sendCounter = async () => {
    setBusy(true);
    try {
      await offersService.counter(myOffer.id, 'lender', {
        rate_percent: parseFloat(cRate) || undefined,
        lender_fee_percent: parseFloat(cLenderFee) || undefined,
        broker_note: cNote.trim() || undefined,
      });
      toast({ title: 'Counter sent to broker' });
      setCountering(false);
      setCRate('');
      setCLenderFee('');
      setCNote('');
      refresh();
    } catch (err) {
      toast({ title: 'Could not send counter', sub: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ borderColor: 'var(--amber)', padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <SectionDivider n="05" label="Your offer" />
        <span className="pill" style={{ background: tone.bg, color: tone.color }}>{tone.label}</span>
      </div>

      {/* Current offer terms */}
      <DefList
        items={[
          ['Your rate', formatPercent(myOffer.rate_percent, 2)],
          ['Lender fee', myOffer.lender_fee_percent != null ? formatPercent(myOffer.lender_fee_percent, 1) : '—'],
          ['Term', myOffer.term_months ? `${myOffer.term_months} months` : '—'],
        ]}
      />

      {/* Broker's counter — the headline when status is 'countered' */}
      {brokerCounter && myOffer.status === 'countered' && (
        <div
          style={{
            marginTop: 18,
            padding: '16px 18px',
            background: 'var(--wheat-bg)',
            border: '1px solid var(--wheat)',
            borderRadius: 8,
          }}
        >
          <div className="small" style={{ fontWeight: 600, color: '#8A6D2F', marginBottom: 6 }}>
            Broker countered
          </div>
          <div style={{ fontSize: 14 }}>
            {brokerCounter.rate_percent != null && (
              <span>Rate <strong>{formatPercent(brokerCounter.rate_percent, 2)}</strong> · </span>
            )}
            {brokerCounter.lender_fee_percent != null && (
              <span>Lender fee <strong>{formatPercent(brokerCounter.lender_fee_percent, 1)}</strong></span>
            )}
          </div>
          {brokerCounter.broker_note && (
            <p className="small" style={{ marginTop: 8, color: 'var(--text-2)', fontStyle: 'italic' }}>
              “{brokerCounter.broker_note}”
            </p>
          )}
        </div>
      )}

      {/* Negotiation timeline */}
      {history.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="micro muted-text" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Negotiation
          </div>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                padding: '8px 0',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 13,
              }}
            >
              <span className="micro muted-text" style={{ flex: '0 0 70px' }}>{timeAgo(h.created_at)}</span>
              <span>
                <strong>{h.initiated_by === 'broker' ? 'Broker' : 'You'}</strong> countered
                {h.rate_percent != null ? ` at ${formatPercent(h.rate_percent, 2)}` : ''}
                {h.broker_note ? ` — “${h.broker_note}”` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions when the broker has countered */}
      {myOffer.status === 'countered' && (
        <div style={{ marginTop: 24 }}>
          {!countering ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={acceptCounter} disabled={busy}>
                {busy ? 'Working…' : 'Accept counter & fund'}
              </button>
              <button className="btn btn-secondary" onClick={() => setCountering(true)} disabled={busy}>
                Counter back
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="New rate (%)">
                <input className="input input-num" value={cRate} onChange={(e) => setCRate(e.target.value)} placeholder={String(myOffer.rate_percent)} />
              </Field>
              <Field label="Lender fee (%)">
                <input className="input input-num" value={cLenderFee} onChange={(e) => setCLenderFee(e.target.value)} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Note to broker">
                  <textarea className="input" rows={2} value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Add context…" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={sendCounter} disabled={busy}>
                  {busy ? 'Sending…' : 'Send counter'}
                </button>
                <button className="btn btn-ghost" onClick={() => setCountering(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdraw — available while the offer is still live with the broker. */}
      {(myOffer.status === 'submitted' || myOffer.status === 'viewed' || myOffer.status === 'countered') && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-tertiary btn-sm" style={{ paddingLeft: 0, color: '#A85F5F' }} onClick={withdraw} disabled={busy}>
            Withdraw offer
          </button>
        </div>
      )}
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
