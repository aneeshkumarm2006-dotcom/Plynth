import { useNavigate } from 'react-router-dom';
import {
  DealNo,
  DefList,
  Pill,
  SectionDivider,
  StatStrip,
} from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';

export function Dashboard() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const B = BROKER_MOCK;

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">
          {greet}, {B.user.first}
        </h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>
          Three new offers arrived overnight. One deal is in active negotiation.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <StatStrip stats={B.stats} />
      </div>

      <div style={{ marginBottom: 44 }}>
        <DealInFocus onOpen={(no) => navigate(`/deals/${no}`)} />
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}
      >
        <div>
          <SectionDivider n="01" label="New Offers" meta={B.newOffers.length + ' in'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {B.newOffers.map((o) => (
              <div
                key={o.no}
                className="card card-pad card-hover"
                style={{ padding: 20, cursor: 'pointer' }}
                onClick={() => navigate(`/deals/${o.no}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <DealNo n={o.no} />
                  <span className="micro muted-text">{o.city}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                  <span
                    className="tnum"
                    style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--slate-deep)', fontWeight: 600 }}
                  >
                    {o.rate}
                  </span>
                  <span className="small muted-text">
                    · {o.fee} fee · {o.term}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="micro muted-text">{o.lender}</span>
                  <span
                    className="micro"
                    style={{ color: 'var(--amber-deep)', fontWeight: 600 }}
                  >
                    Expires in {o.expires}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionDivider n="02" label="Awaiting Response" meta={B.awaiting.length + ' deals'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {B.awaiting.map((d) => (
              <div
                key={d.no}
                className="card card-pad card-hover"
                style={{ padding: 20, cursor: 'pointer' }}
                onClick={() => navigate(`/deals/${d.no}`)}
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
                  {d.ltv} LTV · {d.term} · {d.views} views
                </div>
                <div className="micro muted-text" style={{ marginTop: 6 }}>
                  Submitted {d.submitted}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionDivider n="03" label="Recently Funded" meta="This month" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {B.recentFunded.map((d) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealInFocus({ onOpen }: { onOpen: (no: string) => void }) {
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
            <DealNo n={f.no} />
            <Pill status="negotiating" />
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
            <button className="btn btn-primary" onClick={() => onOpen(f.no)}>
              Review offers
            </button>
            <span className="small muted-text">
              {f.offers} offers · {f.views} lender views
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
            {f.neighbourhood} · {f.city}
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
            {f.amount}{' '}
            <span style={{ fontSize: 15, color: 'var(--text-2)' }}>CAD</span>
          </div>
          <DefList
            style={{ marginTop: 22 }}
            items={[
              ['Position', f.position],
              ['LTV', f.ltv],
              ['Term', f.term],
              ['Rate expectation', f.rate],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
