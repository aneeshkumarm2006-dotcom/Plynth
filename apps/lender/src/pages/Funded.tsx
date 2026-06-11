import { StatBlock } from '@plynth/shared/ui';
import { LENDER_MOCK } from '@plynth/shared/mock';

export function Funded() {
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Funded</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          Capital deployed through Plynth.
        </p>
      </div>
      <div
        className="stat-strip"
        style={{ marginBottom: 28, gridTemplateColumns: 'repeat(3,1fr)' }}
      >
        <StatBlock value="$22.4" unit="M" label="Funded YTD" />
        <StatBlock value="31" unit="%" label="Win Rate" />
        <StatBlock value="9.0" unit="%" label="Avg Funded Rate" />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Deal', 'Location', 'Amount', 'Position', 'Rate', 'Term', 'Broker', 'Closed'].map(
                (h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i >= 2 && i <= 5 ? 'right' : 'left',
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
            {LENDER_MOCK.funded.map((d, i) => (
              <tr
                key={d.no}
                style={{
                  borderBottom:
                    i < LENDER_MOCK.funded.length - 1 ? '1px solid var(--border)' : 'none',
                }}
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
                <td
                  className="num"
                  style={{
                    padding: '16px 18px',
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
                    padding: '16px 18px',
                    textAlign: 'right',
                    color: 'var(--text-2)',
                  }}
                >
                  {d.term}
                </td>
                <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-2)' }}>
                  {d.broker}
                </td>
                <td
                  className="num"
                  style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-2)' }}
                >
                  {d.closed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
