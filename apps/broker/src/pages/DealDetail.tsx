import { useNavigate, useParams } from 'react-router-dom';
import { DealNo, DefList, Pill, SectionDivider } from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';
import { useToastFire } from '../components/ToastContext';

export function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToastFire();
  const f = BROKER_MOCK.focus;

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
            <DealNo n={dealId || f.no} size={15} />
            <Pill status="negotiating" />
          </div>
          <h1 className="h1">
            {f.amount}{' '}
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
            {f.position} · {f.neighbourhood}, {f.city}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              toast({
                title: 'Borrower details revealed',
                sub: 'Visible to lenders with active offers.',
              })
            }
          >
            Reveal borrower
          </button>
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
                  ['Loan amount', f.amount + ' CAD'],
                  ['Position', f.position],
                  ['LTV', f.ltv],
                  ['Appraised value', '$590,000 CAD'],
                  ['Term', f.term],
                  ['Rate expectation', f.rate],
                  ['Purpose', 'Refinance — debt consolidation'],
                ]}
              />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                A first mortgage refinance on an owner-occupied detached home in East York,
                Toronto. The borrower is self-employed with two years of established business
                income and seeks to consolidate higher-interest obligations.
              </p>
              <p className="body" style={{ color: 'var(--text)', lineHeight: 1.65, marginTop: 14 }}>
                At 72% loan-to-value against a recent appraisal of $590,000, the position is
                conservative for the segment. Exit is via refinance to an institutional lender at
                term, supported by an improving credit profile. Comparable East York refinances
                on Plynth have funded between 8.75% and 9.5%.
              </p>
            </div>
          </div>

          <SectionDivider
            n="03"
            label="Offers"
            meta={BROKER_MOCK.dealOffers.length + ' received'}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {BROKER_MOCK.dealOffers.map((o) => (
              <OfferCard key={o.id} o={o} toast={toast} />
            ))}
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

interface OfferDisplay {
  id: string;
  type: string;
  rate: string;
  lenderFee: string;
  brokerFee: string;
  term: string;
  conditions: string;
  expires: string;
  note?: string;
  best?: boolean;
}

function OfferCard({ o, toast }: { o: OfferDisplay; toast: (t: any) => void }) {
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
            Lender {o.id} — Anonymized
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
          onClick={() =>
            toast({
              title: 'Offer from Lender ' + o.id + ' accepted',
              sub: 'The lender has been notified. Funding instructions will follow.',
            })
          }
        >
          Accept
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() =>
            toast({
              title: 'Counter sent to Lender ' + o.id,
              sub: "You'll be notified when they respond.",
            })
          }
        >
          Counter
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() =>
            toast({
              title: 'Offer declined',
              sub: 'Lender ' + o.id + ' has been removed from this deal.',
            })
          }
        >
          Decline
        </button>
      </div>
    </div>
  );
}
