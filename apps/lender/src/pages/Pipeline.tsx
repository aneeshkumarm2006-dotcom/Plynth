import { useNavigate } from 'react-router-dom';
import { DealNo } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import { pipelineService, type PipelineColumns } from '@plynth/supabase/services';

const COLS = ['Reviewing', 'Offered', 'In Negotiation', 'Funded', 'Dead'] as const;

const EMPTY_COLS: PipelineColumns = {
  Reviewing: [],
  Offered: [],
  'In Negotiation': [],
  Funded: [],
  Dead: [],
};

export function Pipeline() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data } = useAsync<PipelineColumns>(
    () => pipelineService.forLender(profile?.id ?? ''),
    [profile?.id]
  );
  const pipeline = data ?? EMPTY_COLS;

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Pipeline</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          Every deal you've engaged, from first review to funding.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {COLS.map((col) => {
          const items = pipeline[col];
          return (
            <div key={col}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  className="micro"
                  style={{
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--slate-deep)',
                  }}
                >
                  {col}
                </span>
                <span className="micro muted-text">{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map((d) => (
                  <div
                    key={d.no}
                    className="card card-hover"
                    style={{ padding: 16, cursor: 'pointer' }}
                    onClick={() => navigate(`/deals/${d.deal_id}`)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <DealNo n={d.no} size={12} />
                      <span
                        className="micro"
                        style={{ color: 'var(--amber-deep)', fontWeight: 600 }}
                      >
                        {d.score}
                      </span>
                    </div>
                    <div
                      className="num"
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 19,
                        fontWeight: 600,
                        color: 'var(--slate-deep)',
                        marginBottom: 4,
                      }}
                    >
                      {d.amount}
                    </div>
                    <div className="micro muted-text">{d.city}</div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div
                    className="micro muted-text"
                    style={{ padding: '16px 0', textAlign: 'center' }}
                  >
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
