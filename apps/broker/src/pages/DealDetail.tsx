import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DealNo, DefList, Pill, SectionDivider } from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import {
  dealsService,
  offersService,
  type DealRow,
  type OfferRow,
} from '@plynth/supabase/services';
import { useToastFire } from '../components/ToastContext';
import {
  cityProvince,
  dollars,
  ltvPct,
  positionLabel,
  termLabel,
  offerToCard,
  type OfferDisplay,
} from '../lib/present';

type ToastFn = ReturnType<typeof useToastFire>;

export function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToastFire();
  useAuth();

  const { data: deal } = useAsync<DealRow | null>(
    () => dealsService.getById(dealId ?? ''),
    [dealId]
  );
  const { data: offerRows, loading: offersLoading, refresh } = useAsync<OfferRow[]>(
    () => offersService.listForDeal(dealId ?? ''),
    [dealId]
  );

  const f = BROKER_MOCK.focus;
  // View model: live deal when resolved, editorial fixture as the fallback.
  const isMockDeal = deal != null && typeof (deal as DealRow).loan_amount_cents !== 'number';
  const view = {
    no: deal?.deal_number ?? (deal as any)?.no ?? dealId ?? f.no,
    amount: deal && !isMockDeal ? dollars(deal.loan_amount_cents) : (deal as any)?.amount ?? f.amount,
    position:
      deal && !isMockDeal ? positionLabel(deal.position) : ((deal as any)?.position ?? f.position),
    ltv: deal && !isMockDeal ? ltvPct(deal.ltv) : ((deal as any)?.ltv ?? f.ltv),
    term: deal && !isMockDeal ? termLabel(deal.term_months) : ((deal as any)?.term ?? f.term),
    neighbourhood: deal?.neighbourhood ?? f.neighbourhood,
    city: deal && !isMockDeal ? cityProvince(deal.city, deal.province) : (deal?.city ?? f.city),
    status: deal?.status ?? f.status,
  };
  // The real deal UUID to attach actions to (mock mode falls back to the number).
  const actionDealId = deal?.id ?? dealId ?? f.no;

  const offers = (offerRows ?? []).map((o, i) => offerToCard(o, i));

  return (
    <div className="page page-wide">
      <button
        className="btn btn-tertiary btn-sm"
        style={{ marginBottom: 16, paddingLeft: 0 }}
        onClick={() => navigate('/pipeline')}
      >
        ‹ Back to pipeline
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
            <Pill status={view.status} />
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
          <button className="btn btn-secondary btn-sm">Edit deal</button>
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
                  ['Rate expectation', f.rate],
                  ['Purpose', 'Refinance — debt consolidation'],
                ]}
              />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                {deal?.notes ??
                  'A first mortgage refinance on an owner-occupied detached home in East York, Toronto. The borrower is self-employed with two years of established business income and seeks to consolidate higher-interest obligations.'}
              </p>
              <p className="body" style={{ color: 'var(--text)', lineHeight: 1.65, marginTop: 14 }}>
                At {view.ltv} loan-to-value against a recent appraisal of $590,000, the position is
                conservative for the segment. Exit is via refinance to an institutional lender at
                term, supported by an improving credit profile. Comparable East York refinances
                on Plynth have funded between 8.75% and 9.5%.
              </p>
            </div>
          </div>

          <SectionDivider n="03" label="Offers" meta={offers.length + ' received'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {offersLoading && offers.length === 0 ? (
              <>
                <div className="skel" style={{ height: 220, borderRadius: 8 }} />
                <div className="skel" style={{ height: 220, borderRadius: 8 }} />
              </>
            ) : (
              offers.map((o) => (
                <OfferCard
                  key={o.id}
                  o={o}
                  dealId={actionDealId}
                  toast={toast}
                  onChanged={refresh}
                  onAccepted={() => navigate('/funded')}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionDivider n="04" label="Activity" />
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div
              style={{
                position: 'absolute',
                left: 3,
                top: 6,
                bottom: 6,
                width: 1,
                background: 'var(--border)',
              }}
            />
            {BROKER_MOCK.activity.map((a, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: 22 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -20,
                    top: 5,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--amber)' : 'var(--border)',
                    border: '2px solid var(--offwhite)',
                  }}
                />
                <div className="micro muted-text" style={{ marginBottom: 2 }}>
                  {a.t}
                </div>
                <div className="small" style={{ color: 'var(--slate-deep)' }}>
                  {a.e}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferCard({
  o,
  dealId,
  toast,
  onChanged,
  onAccepted,
}: {
  o: OfferDisplay;
  dealId: string;
  toast: ToastFn;
  onChanged: () => void;
  onAccepted: () => void;
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'counter' | 'reject' | 'reveal'>(null);

  const accept = async () => {
    setBusy('accept');
    try {
      await offersService.accept(o.id);
      toast({
        title: 'Offer from ' + o.label + ' accepted',
        sub: 'The lender has been notified. Funding instructions will follow.',
      });
      onAccepted();
    } catch (err) {
      toast({ title: 'Could not accept offer', sub: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const counter = async () => {
    setBusy('counter');
    try {
      // Counter just under the lender's quoted rate. A dedicated counter form is
      // a follow-up; for now we shave 0.25% off and note it for the lender.
      const counterRate = Math.max(0, Math.round((o.rateValue - 0.25) * 100) / 100);
      await offersService.counter(o.id, 'broker', {
        rate_percent: counterRate,
        broker_note: `Countering at ${counterRate.toFixed(2)}%.`,
      });
      toast({
        title: 'Counter sent to ' + o.label,
        sub: "You'll be notified when they respond.",
      });
      onChanged();
    } catch (err) {
      toast({ title: 'Could not send counter', sub: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('reject');
    try {
      await offersService.reject(o.id);
      toast({
        title: 'Offer declined',
        sub: o.label + ' has been removed from this deal.',
      });
      onChanged();
    } catch (err) {
      toast({ title: 'Could not decline offer', sub: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const reveal = async () => {
    if (!o.lenderId) return;
    setBusy('reveal');
    try {
      await dealsService.revealBorrowerTo(dealId, [o.lenderId]);
      toast({
        title: 'Borrower details revealed',
        sub: 'Now visible to ' + o.label + '.',
      });
    } catch (err) {
      toast({ title: 'Could not reveal borrower', sub: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="card card-pad"
      style={{
        borderColor: o.best ? 'var(--amber)' : 'var(--border)',
        position: 'relative',
      }}
    >
      {o.best && (
        <div
          style={{
            position: 'absolute',
            top: -1,
            right: 20,
            background: 'var(--amber)',
            color: 'var(--slate-deep)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: '0 0 5px 5px',
          }}
        >
          Leading offer
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <div className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
            {o.label} — Anonymized
          </div>
          <div className="micro muted-text">{o.type}</div>
        </div>
        <span className="micro" style={{ color: 'var(--amber-deep)', fontWeight: 600 }}>
          Expires in {o.expires}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          marginBottom: 16,
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {[
          ['Rate', o.rate],
          ['Lender fee', o.lenderFee],
          ['Broker fee', o.brokerFee],
          ['Term', o.term],
        ].map(([l, v], i) => (
          <div
            key={i}
            style={{
              padding: '12px 14px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div className="micro muted-text" style={{ marginBottom: 4 }}>
              {l}
            </div>
            <div
              className="num"
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--slate-deep)',
                fontFamily: 'var(--serif)',
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <span className="micro muted-text">Conditions · </span>
        <span className="small">{o.conditions}</span>
      </div>
      {o.note && (
        <p
          className="small"
          style={{
            color: 'var(--text-2)',
            fontStyle: 'italic',
            marginBottom: 16,
            paddingLeft: 12,
            borderLeft: '2px solid var(--border)',
          }}
        >
          “{o.note}”
        </p>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={accept}
          disabled={busy !== null}
        >
          {busy === 'accept' ? 'Accepting…' : 'Accept'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={counter} disabled={busy !== null}>
          {busy === 'counter' ? 'Countering…' : 'Counter'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={decline} disabled={busy !== null}>
          {busy === 'reject' ? 'Declining…' : 'Decline'}
        </button>
      </div>
      <button
        className="btn btn-tertiary btn-sm"
        style={{ paddingLeft: 0, marginTop: 12, color: 'var(--text-2)' }}
        onClick={reveal}
        disabled={busy !== null}
      >
        {busy === 'reveal' ? 'Revealing…' : 'Reveal borrower details to this lender'}
      </button>
    </div>
  );
}
