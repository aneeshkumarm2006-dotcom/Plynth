import { useNavigate } from 'react-router-dom';
import {
  DealNo,
  DefList,
  MatchBar,
  SectionDivider,
  StatStrip,
} from '@plynth/shared/ui';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { MatchCard } from '../components/MatchCard';
import { useToastFire } from '../components/ToastContext';

export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToastFire();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = LENDER_MOCK.user.name.split(' ')[0];
  const L = LENDER_MOCK;

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">
          {greet}, {first}
        </h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>
          Nine new deals match your criteria. Four arrived today.
        </p>
      </div>
      <div style={{ marginBottom: 32 }}>
        <StatStrip stats={L.stats} />
      </div>
      <div style={{ marginBottom: 44 }}>
        <LenderFocus onOpen={(no) => navigate(`/deals/${no}`)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40 }}>
        <div>
          <SectionDivider
            n="01"
            label="Today's matches"
            meta={L.matched.length + ' deals'}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {L.matched.slice(0, 3).map((d) => (
              <MatchCard key={d.no} d={d} onToast={toast} dense />
            ))}
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
                  {L.sidebarStats.winRate}
                </div>
                <div className="stat-label">Win Rate</div>
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: 30 }}>
                  {L.sidebarStats.avgResponse}
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
              {L.sidebarStats.criteria}
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

function LenderFocus({ onOpen }: { onOpen: (no: string) => void }) {
  const f = LENDER_MOCK.focus;
  return (
    <div className="card fade-in" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', minHeight: 300 }}>
        <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span className="eyebrow" style={{ color: 'var(--amber-deep)' }}>
              Strongest match today
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <DealNo n={f.no} />
            <MatchBar score={f.score} width={90} />
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
            “{f.quote}”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => onOpen(f.no)}>
              Make an offer
            </button>
            <button className="btn btn-ghost" onClick={() => onOpen(f.no)}>
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
            ]}
          />
        </div>
      </div>
    </div>
  );
}
