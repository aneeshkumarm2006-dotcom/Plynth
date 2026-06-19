import { useNavigate } from 'react-router-dom';
import {
  DealNo,
  DefList,
  MatchBar,
  SectionDivider,
  StatStrip,
  EmptyState,
} from '@plynth/shared/ui';
import { useEffect } from 'react';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import {
  analyticsService,
  matchedService,
  notificationsService,
  offersService,
  type MatchedDeal,
  type NegotiationCard,
  type StatBlockData,
  type LenderSidebar,
} from '@plynth/supabase/services';
import { MatchCard } from '../components/MatchCard';
import { useToastFire } from '../components/ToastContext';
import { matchedToCard, cityProvince, dollars, ltvPct, termLabel, positionLabel } from '../lib/present';

export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToastFire();
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (profile?.first_name ?? LENDER_MOCK.user.name).split(' ')[0];

  const { data: matched, loading, refresh } = useAsync<MatchedDeal[]>(
    () => matchedService.listForLender(profile?.id ?? ''),
    [profile?.id]
  );

  const { data: stats } = useAsync<StatBlockData[]>(
    () => analyticsService.lenderStats(profile?.id ?? ''),
    [profile?.id]
  );

  const { data: sidebar } = useAsync<LenderSidebar>(
    () => analyticsService.lenderSidebar(profile?.id ?? ''),
    [profile?.id]
  );

  const { data: negotiations, refresh: refreshNegotiations } = useAsync<NegotiationCard[]>(
    () => offersService.activeNegotiations(profile?.id ?? ''),
    [profile?.id]
  );

  // Refresh on realtime notifications. In mock mode `subscribe` is a no-op,
  // so this is inert without Supabase wired.
  useEffect(() => {
    if (!profile?.id) return;
    const unsubscribe = notificationsService.subscribe(profile.id, (n) => {
      if (n.notification_type === 'new_match') refresh();
      // A counter (or any offer movement) updates the negotiation cards.
      if (n.notification_type === 'offer_countered' || n.notification_type === 'deal_funded') {
        refreshNegotiations();
      }
    });
    return unsubscribe;
  }, [profile?.id, refresh, refreshNegotiations]);

  const L = LENDER_MOCK;
  const rows = matched ?? [];
  const focus = rows[0] ?? null;
  const newMatchCount = rows.length;

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">
          {greet}, {first}
        </h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>
          {newMatchCount > 0
            ? `${newMatchCount} ${newMatchCount === 1 ? 'deal matches' : 'deals match'} your criteria.`
            : 'No new matches yet — adjust your criteria to widen the funnel.'}
        </p>
      </div>
      <div style={{ marginBottom: 32 }}>
        <StatStrip stats={stats ?? L.stats} />
      </div>
      {focus && (
        <div style={{ marginBottom: 44 }}>
          <LenderFocus deal={focus} onOpen={(id) => navigate(`/deals/${id}`)} />
        </div>
      )}

      {(negotiations?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 44 }}>
          <SectionDivider
            n="!"
            label="Needs your response"
            meta={`${negotiations!.length} ${negotiations!.length === 1 ? 'negotiation' : 'negotiations'}`}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {negotiations!.map((n) => (
              <NegotiationCardView key={n.offer_id} n={n} onOpen={(id) => navigate(`/deals/${id}`)} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40 }}>
        <div>
          <SectionDivider n="01" label="Today's matches" meta={rows.length + ' deals'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading && rows.length === 0 ? (
              <>
                <div className="skel" style={{ height: 120, borderRadius: 8 }} />
                <div className="skel" style={{ height: 120, borderRadius: 8 }} />
              </>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No matched deals yet"
                sub="When a broker submits a deal that fits your criteria, it appears here."
              />
            ) : (
              rows.slice(0, 3).map((d) => (
                <MatchCard key={d.deal_id} d={matchedToCard(d)} dealId={d.deal_id} onToast={toast} dense />
              ))
            )}
          </div>
          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/matched')}
          >
            View all matched deals
          </button>
        </div>
        <aside>
          <SectionDivider n="02" label="Performance" />
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div className="stat-value" style={{ fontSize: 30 }}>
                  {sidebar?.winRate ?? L.sidebarStats.winRate}
                </div>
                <div className="stat-label">Win Rate</div>
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: 30 }}>
                  {sidebar?.avgResponse ?? L.sidebarStats.avgResponse}
                </div>
                <div className="stat-label">Avg Response Time</div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div
              className="micro muted-text"
              style={{
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Active criteria
            </div>
            <p className="small" style={{ color: 'var(--slate-deep)', lineHeight: 1.5 }}>
              {sidebar?.criteria ?? L.sidebarStats.criteria}
            </p>
            <button
              className="btn btn-tertiary btn-sm"
              style={{ paddingLeft: 0, marginTop: 8 }}
              onClick={() => navigate('/criteria')}
            >
              Edit criteria ›
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// One card per live negotiation. A broker counter ('countered') is the
// action-needed state (amber); a still-pending offer reads as informational.
const NEG_TONE: Record<string, { bg: string; color: string; label: string; action: string }> = {
  countered: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Broker countered', action: 'Respond' },
  submitted: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Awaiting broker', action: 'View' },
  viewed: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Viewed by broker', action: 'View' },
};

function NegotiationCardView({ n, onOpen }: { n: NegotiationCard; onOpen: (id: string) => void }) {
  const tone = NEG_TONE[n.status] ?? NEG_TONE.submitted;
  const needsAction = n.status === 'countered';
  return (
    <div
      className="card card-pad fade-in"
      style={{ borderColor: needsAction ? 'var(--amber)' : 'var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DealNo n={n.deal_number} size={13} />
        <span className="pill" style={{ background: tone.bg, color: tone.color }}>{tone.label}</span>
      </div>
      <div>
        <div className="tnum" style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600, color: 'var(--slate-deep)', lineHeight: 1 }}>
          {dollars(n.amount_cents)} <span style={{ fontSize: 12, color: 'var(--text-2)' }}>CAD</span>
        </div>
        <div className="micro muted-text" style={{ marginTop: 4 }}>
          {cityProvince(n.city, n.province)} · your offer {n.rate_percent}%
        </div>
      </div>
      <button
        className={needsAction ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
        style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
        onClick={() => onOpen(n.deal_id)}
      >
        {tone.action}
      </button>
    </div>
  );
}

function LenderFocus({ deal, onOpen }: { deal: MatchedDeal; onOpen: (id: string) => void }) {
  const amount = dollars(deal.loan_amount_cents);
  const quote = deal.summary ?? 'A strong match against your active criteria, ready for an offer.';
  return (
    <div className="card fade-in" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', minHeight: 300 }}>
        <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span className="eyebrow" style={{ color: 'var(--amber-deep)' }}>
              Strongest match today
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <DealNo n={deal.deal_number} />
            <MatchBar score={deal.match_score} width={90} />
          </div>
          <blockquote
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              lineHeight: 1.42,
              letterSpacing: '-0.01em',
              color: 'var(--slate-deep)',
              margin: 0,
              maxWidth: '36ch',
              flex: 1,
            }}
          >
            “{quote}”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => onOpen(deal.deal_id)}>
              Make an offer
            </button>
            <button className="btn btn-ghost" onClick={() => onOpen(deal.deal_id)}>
              View deal
            </button>
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
            {deal.neighbourhood ? `${deal.neighbourhood} · ` : ''}
            {cityProvince(deal.city, deal.province)}
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
            {amount} <span style={{ fontSize: 15, color: 'var(--text-2)' }}>CAD</span>
          </div>
          <DefList
            style={{ marginTop: 22 }}
            items={[
              ['Position', positionLabel(deal.position)],
              ['LTV', ltvPct(deal.ltv)],
              ['Term', termLabel(deal.term_months)],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
