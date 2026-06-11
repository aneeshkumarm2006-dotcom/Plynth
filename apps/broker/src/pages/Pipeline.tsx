import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, Pill } from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';

const FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['active', 'Active'],
  ['offer', 'Offer In'],
  ['negotiating', 'Negotiating'],
  ['draft', 'Draft'],
];

export function Pipeline() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const rows = BROKER_MOCK.pipeline.filter(
    (d) => filter === 'all' || d.status === filter
  );

  return (
    <div className="page page-wide">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 28,
        }}
      >
        <div>
          <h1 className="h1">Pipeline</h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
            {BROKER_MOCK.pipeline.length} deals in the marketplace.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/submit')}>
          Submit a deal
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {FILTERS.map(([id, lbl]) => (
          <Chip key={id} on={filter === id} onClick={() => setFilter(id)}>
            {lbl}
          </Chip>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Deal', 'Location', 'Amount', 'Position', 'LTV', 'Term', 'Offers', 'Status', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: i >= 2 && i <= 6 ? 'right' : 'left',
                      padding: '14px 18px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-2)',
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr
                key={d.no}
                style={{
                  borderBottom:
                    i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/deals/${d.no}`)}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.background = '#FCFAF5')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                }
              >
                <td style={{ padding: '16px 18px' }}>
                  <span className="deal-no" style={{ fontSize: 14 }}>
                    № {d.no}
                  </span>
                </td>
                <td style={{ padding: '16px 18px', fontSize: 14 }}>{d.city}</td>
                <td
                  className="num"
                  style={{
                    padding: '16px 18px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--slate-deep)',
                  }}
                >
                  {d.amount}
                </td>
                <td
                  style={{
                    padding: '16px 18px',
                    textAlign: 'right',
                    fontSize: 14,
                    color: 'var(--text-2)',
                  }}
                >
                  {d.position}
                </td>
                <td className="num" style={{ padding: '16px 18px', textAlign: 'right' }}>
                  {d.ltv}
                </td>
                <td
                  className="num"
                  style={{ padding: '16px 18px', textAlign: 'right', color: 'var(--text-2)' }}
                >
                  {d.term}
                </td>
                <td className="num" style={{ padding: '16px 18px', textAlign: 'right' }}>
                  {d.offers || '—'}
                </td>
                <td style={{ padding: '16px 18px' }}>
                  <Pill status={d.status} />
                </td>
                <td
                  style={{
                    padding: '16px 18px',
                    textAlign: 'right',
                    color: 'var(--muted)',
                    fontSize: 18,
                  }}
                >
                  ›
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
