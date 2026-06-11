import { StatBlock, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import { fundingsService, type FundingRow } from '@plynth/supabase/services';
import { fundingToRow } from '../lib/present';

export function Funded() {
  const { profile } = useAuth();
  const { data, loading } = useAsync<FundingRow[]>(
    () => fundingsService.listForBroker(profile?.id ?? ''),
    [profile?.id]
  );
  const rows = (data ?? []).map(fundingToRow);

  // Headline figures derived from the funded set.
  const ytdCents = (data ?? []).reduce((sum, f) => sum + f.loan_amount_cents, 0);
  const ytdLabel = '$' + (ytdCents / 100_000_000).toFixed(1);
  const avgRate =
    rows.length > 0
      ? ((data ?? []).reduce((s, f) => s + f.actual_rate_percent, 0) / rows.length).toFixed(1)
      : '—';

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Funded</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          Your verifiable track record on Plynth.
        </p>
      </div>
      <div
        className="stat-strip"
        style={{ marginBottom: 28, gridTemplateColumns: 'repeat(3,1fr)' }}
      >
        <StatBlock value="$5.92" unit="M" label="Funded — Trailing 90 Days" />
        <StatBlock value={ytdLabel} unit="M" label="Volume YTD" />
        <StatBlock value={avgRate} unit="%" label="Avg Funded Rate" />
      </div>
      {loading && rows.length === 0 ? (
        <div className="skel" style={{ height: 280, borderRadius: 8 }} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No funded deals yet"
          sub="Deals you close through Plynth will be recorded here with their final terms."
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Deal', 'Location', 'Amount', 'Position', 'Rate', 'Fee', 'Term', 'Lender', 'Closed'].map(
                  (h, i) => (
                    <th
                      key={h}
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
                    borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
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
                  <td className="num" style={{ padding: '16px 18px', textAlign: 'right' }}>
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
                    {d.fee}
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
                    {d.lender}
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
      )}
    </div>
  );
}
