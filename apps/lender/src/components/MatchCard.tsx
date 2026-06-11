import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealNo, DefList, MatchBar } from '@plynth/shared/ui';
import type { ToastSpec } from '@plynth/shared/ui';

export interface MatchCardData {
  no: string;
  city: string;
  region?: string;
  amount: string;
  position: string;
  ltv: string;
  term: string;
  score: number;
  asset: string;
  summary: string;
  age: string;
}

export function MatchCard({
  d,
  onToast,
  dense,
}: {
  d: MatchCardData;
  onToast: (t: ToastSpec) => void;
  dense?: boolean;
}) {
  const [acted, setActed] = useState<null | 'interested' | 'pass'>(null);
  const navigate = useNavigate();
  return (
    <div
      className="card card-hover"
      style={{
        padding: dense ? 24 : 30,
        opacity: acted === 'pass' ? 0.5 : 1,
        transition: 'opacity 200ms',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DealNo n={d.no} size={13} />
          <span
            className="pill pill-active"
            style={{ background: 'var(--slate-bg)' }}
          >
            {d.city}
          </span>
          <span className="micro muted-text">{d.asset}</span>
        </div>
        <span className="micro muted-text">{d.age} ago</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 32,
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span
              className="tnum"
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--slate-deep)',
                lineHeight: 1,
              }}
            >
              {d.amount}
            </span>
            <span className="small muted-text">CAD</span>
          </div>
          <div className="small muted-text" style={{ marginBottom: 14 }}>
            {d.position} · {d.region}
          </div>
          <p
            className="body"
            style={{ color: 'var(--text)', lineHeight: 1.6, maxWidth: '52ch' }}
          >
            {d.summary}
          </p>
        </div>
        <div>
          <DefList
            items={[
              ['LTV', d.ltv],
              ['Term', d.term],
              ['Position', d.position],
            ]}
          />
          <div style={{ marginTop: 14 }}>
            <div
              className="micro muted-text"
              style={{ letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}
            >
              Match
            </div>
            <MatchBar score={d.score} width={140} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/deals/${d.no}`)}
        >
          Make offer
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setActed('interested');
            onToast({
              title: 'Marked interested — Deal № ' + d.no,
              sub: "The broker is notified you're reviewing.",
            });
          }}
        >
          Interested
        </button>
        <button
          className="btn btn-tertiary btn-sm"
          onClick={() => {
            setActed('pass');
            onToast({ title: 'Passed on Deal № ' + d.no });
          }}
        >
          Pass
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-tertiary btn-sm"
          onClick={() => navigate(`/deals/${d.no}`)}
        >
          Details ›
        </button>
      </div>
    </div>
  );
}
