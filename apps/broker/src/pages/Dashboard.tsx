import { useNavigate } from 'react-router-dom';
import {
  DealNo,
  DefList,
  Pill,
  SectionDivider,
  StatStrip,
} from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import {
  analyticsService,
  dealsService,
  fundingsService,
  type DealRow,
  type FundingRow,
  type StatBlockData,
} from '@plynth/supabase/services';
import { dealRowToCard, fundingToRow, type DealDisplay } from '../lib/present';

const ACTIVE_STATUSES = ['active', 'matched', 'negotiating', 'offer'];
const OFFER_STATUSES = ['offer', 'negotiating'];

export function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (profile?.first_name ?? BROKER_MOCK.user.first).split(' ')[0];

  const { data: stats } = useAsync<StatBlockData[]>(
    () => analyticsService.brokerStats(profile?.id ?? ''),
    [profile?.id]
  );
  const { data: dealRows, loading: dealsLoading } = useAsync<DealRow[]>(
    () => dealsService.listForBroker(profile?.id ?? ''),
    [profile?.id]
  );
  const { data: fundingRows, loading: fundedLoading } = useAsync<FundingRow[]>(
    () => fundingsService.listForBroker(profile?.id ?? ''),
    [profile?.id]
  );

  const deals = (dealRows ?? []).map(dealRowToCard);

  // Columns derived from the deal list + fundings:
  // - New offers: deals carrying offers (offer / negotiating), most offers first.
  // - Awaiting: active deals with no offers yet.
  // - Recently funded: most recent fundings.
  const withOffers = deals
    .filter((d) => OFFER_STATUSES.includes(d.status) || d.offers > 0)
    .sort((a, b) => b.offers - a.offers);
  const awaiting = deals.filter((d) => ACTIVE_STATUSES.includes(d.status) && d.offers === 0);
  const recentFunded = (fundingRows ?? []).slice(0, 3).map(fundingToRow);

  // Focus deal: prefer one in negotiation, else the deal with the most offers,
  // else the first non-draft deal. The editorial hero copy (quote / rate
  // expectation) has no live equivalent yet, so it falls back to the fixture.
  const focusDeal =
    deals.find((d) => d.status === 'negotiating') ??
    [...deals].filter((d) => d.status !== 'draft').sort((a, b) => b.offers - a.offers)[0] ??
    null;

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">
          {greet}, {first}
        </h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>
          {withOffers.length > 0
            ? `${withOffers.length} ${withOffers.length === 1 ? 'deal has' : 'deals have'} live offers. Review the strongest below.`
            : 'No live offers right now — submit a deal to open the marketplace.'}
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <StatStrip stats={stats ?? BROKER_MOCK.stats} />
      </div>

      {focusDeal && (
        <div style={{ marginBottom: 44 }}>
          <DealInFocus deal={focusDeal} onOpen={(id) => navigate(`/deals/${id}`)} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
        <div>
          <SectionDivider n="01" label="New Offers" meta={withOffers.length + ' in'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dealsLoading && withOffers.length === 0 ? (
              <div className="skel" style={{ height: 120, borderRadius: 8 }} />
            ) : (
              withOffers.slice(0, 3).map((d) => (
                <div
                  key={d.routeId || d.no}
                  className="card card-pad card-hover"
                  style={{ padding: 20, cursor: 'pointer' }}
                  onClick={() => navigate(`/deals/${d.routeId}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <DealNo n={d.no} />
                    <span className="micro muted-text">{d.city}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                    <span
                      className="tnum"
                      style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--slate-deep)', fontWeight: 600 }}
                    >
                      {d.amount}
                    </span>
                    <span className="small muted-text">· {d.ltv} LTV · {d.term}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="micro muted-text">{d.position}</span>
                    <span className="micro" style={{ color: 'var(--amber-deep)', fontWeight: 600 }}>
                      {d.offers} {d.offers === 1 ? 'offer' : 'offers'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionDivider n="02" label="Awaiting Response" meta={awaiting.length + ' deals'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dealsLoading && awaiting.length === 0 ? (
              <div className="skel" style={{ height: 120, borderRadius: 8 }} />
            ) : (
              awaiting.slice(0, 3).map((d) => (
                <div
                  key={d.routeId || d.no}
                  className="card card-pad card-hover"
                  style={{ padding: 20, cursor: 'pointer' }}
                  onClick={() => navigate(`/deals/${d.routeId}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <DealNo n={d.no} />
                    <span className="micro muted-text">{d.city}</span>
                  </div>
                  <div
                    className="tnum"
                    style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--slate-deep)', fontWeight: 600, marginBottom: 8 }}
                  >
                    {d.amount}
                  </div>
                  <div className="micro muted-text">
                    {d.ltv} LTV · {d.term}
                  </div>
                  {d.updated && (
                    <div className="micro muted-text" style={{ marginTop: 6 }}>
                      Updated {d.updated} ago
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionDivider n="03" label="Recently Funded" meta="This month" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fundedLoading && recentFunded.length === 0 ? (
              <div className="skel" style={{ height: 120, borderRadius: 8 }} />
            ) : (
              recentFunded.map((d) => (
                <div
                  key={d.no}
                  className="card card-pad card-hover"
                  style={{ padding: 20, cursor: 'pointer' }}
                  onClick={() => navigate(`/deals/${d.no}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <DealNo n={d.no} />
                    <Pill status="funded" />
                  </div>
                  <div
                    className="tnum"
                    style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--slate-deep)', fontWeight: 600 }}
                  >
                    {d.amount}
                  </div>
                  <div className="micro muted-text" style={{ marginTop: 6 }}>
                    {d.city} · {d.rate} · Closed {d.closed}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealInFocus({ deal, onOpen }: { deal: DealDisplay; onOpen: (id: string) => void }) {
  const f = BROKER_MOCK.focus;
  return (
    <div className="card fade-in" style={{ overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', minHeight: 300 }}>
        <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span className="eyebrow" style={{ color: 'var(--amber-deep)' }}>
              Deal in focus
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <DealNo n={deal.no} />
            <Pill status={deal.status} />
          </div>
          <blockquote
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 25,
              lineHeight: 1.42,
              letterSpacing: '-0.01em',
              color: 'var(--slate-deep)',
              margin: 0,
              maxWidth: '34ch',
              flex: 1,
            }}
          >
            “{f.quote}”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => onOpen(deal.routeId)}>
              Review offers
            </button>
            <span className="small muted-text">
              {deal.offers} {deal.offers === 1 ? 'offer' : 'offers'}
            </span>
          </div>
        </div>
        <div
          style={{
            padding: '40px 44px',
            borderLeft: '1px solid var(--border)',
            background: '#FCFAF5',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            className="micro"
            style={{
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 6,
            }}
          >
            {deal.city}
          </div>
          <div
            className="tnum"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--slate-deep)',
              lineHeight: 1,
            }}
          >
            {deal.amount}{' '}
            <span style={{ fontSize: 15, color: 'var(--text-2)' }}>CAD</span>
          </div>
          <DefList
            style={{ marginTop: 22 }}
            items={[
              ['Position', deal.position],
              ['LTV', deal.ltv],
              ['Term', deal.term],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
