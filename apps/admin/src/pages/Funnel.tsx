import { useState } from 'react';
import { Chip, EmptyState, SectionDivider, StatStrip, type StatBlockProps } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatNumber, formatDate } from '@plynth/shared/utils';
import {
  adminService,
  type FunnelData,
  type MatchingHealth,
} from '@plynth/supabase/services';
import { DataTable, PageHeader, TableSkeleton, type Column } from '../components/DataTable';

const RANGES: Array<[number, string]> = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
];

export function Funnel() {
  const [days, setDays] = useState(30);
  const funnel = useAsync<FunnelData>(() => adminService.funnel(days), [days]);
  const matching = useAsync<MatchingHealth>(() => adminService.matchingHealth(days), [days]);

  const f = funnel.data;
  const top = f && f.stages.length > 0 ? Math.max(f.stages[0].count, 1) : 1;

  const m = matching.data;
  const matchStats: StatBlockProps[] = m
    ? [
        { value: m.avgMatchScore != null ? String(m.avgMatchScore) : '—', label: 'Avg match score' },
        { value: m.avgMatchesPerDeal != null ? String(m.avgMatchesPerDeal) : '—', label: 'Avg matches / deal' },
        { value: formatNumber(m.zeroMatch.length), label: 'Zero-match deals' },
        { value: formatNumber(m.lowMatch.length), label: 'Low-match deals' },
      ]
    : [];

  const zeroCols: Column<MatchingHealth['zeroMatch'][number]>[] = [
    {
      header: 'Deal №',
      render: (d) => <span className="deal-no" style={{ fontSize: 14 }}>№ {d.deal_number}</span>,
    },
    { header: 'Location', render: (d) => <span style={{ color: 'var(--text-2)' }}>{d.city}, {d.province}</span> },
    { header: 'Status', render: (d) => <span style={{ textTransform: 'capitalize' }}>{d.status}</span> },
    {
      header: 'Created',
      align: 'right',
      render: (d) => <span style={{ color: 'var(--text-2)' }}>{formatDate(d.created_at)}</span>,
    },
  ];

  const lowCols: Column<MatchingHealth['lowMatch'][number]>[] = [
    {
      header: 'Deal №',
      render: (d) => <span className="deal-no" style={{ fontSize: 14 }}>№ {d.deal_number}</span>,
    },
    { header: 'Location', render: (d) => <span style={{ color: 'var(--text-2)' }}>{d.city}</span> },
    {
      header: 'Best score',
      align: 'right',
      render: (d) => <span className="num" style={{ fontWeight: 600 }}>{d.bestScore}</span>,
    },
    { header: 'Matches', align: 'right', render: (d) => <span className="num">{d.matchCount}</span> },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="Funnel & matching" lead="Where deals advance — and where they stall." />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {RANGES.map(([d, lbl]) => (
          <Chip key={d} on={days === d} onClick={() => setDays(d)}>
            {lbl}
          </Chip>
        ))}
      </div>

      <SectionDivider n="01" label="Deal funnel" />
      {funnel.loading && !f ? (
        <div className="skel" style={{ height: 240, borderRadius: 8 }} />
      ) : funnel.error || !f ? (
        <EmptyState title="No funnel data" sub="Nothing to chart for this period yet." />
      ) : (
        <div className="card" style={{ padding: '24px 28px' }}>
          {f.stages.map((s, i) => {
            const pct = Math.round((s.count / top) * 100);
            const prev = i > 0 ? f.stages[i - 1].count : null;
            const drop = prev && prev > 0 ? Math.round((1 - s.count / prev) * 100) : null;
            return (
              <div key={s.stage} style={{ marginBottom: i < f.stages.length - 1 ? 18 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-deep)' }}>{s.stage}</span>
                  <span className="num" style={{ fontSize: 14 }}>
                    {formatNumber(s.count)}
                    {drop != null && drop > 0 && (
                      <span className="micro muted-text" style={{ marginLeft: 8 }}>−{drop}%</span>
                    )}
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{ height: '100%', width: `${Math.max(pct, 2)}%`, background: 'var(--slate)', opacity: 0.65 }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
          <p className="micro muted-text" style={{ marginTop: 20 }}>
            Leakage in window — declined: {f.leakage.declined} · expired: {f.leakage.expired}
          </p>
        </div>
      )}

      <div style={{ marginTop: 48 }}>
        <SectionDivider n="02" label="Matching health" />
        {matching.loading && !m ? (
          <div className="skel" style={{ height: 120, borderRadius: 8 }} />
        ) : matching.error || !m ? (
          <EmptyState title="No matching data" sub="Could not load matching health." />
        ) : (
          <>
            <StatStrip stats={matchStats} />

            <h3 className="h2" style={{ fontSize: 18, margin: '32px 0 12px' }}>Zero-match deals</h3>
            {m.zeroMatch.length === 0 ? (
              <EmptyState title="None" sub="Every active deal has at least one matched lender." />
            ) : (
              <DataTable columns={zeroCols} rows={m.zeroMatch} rowKey={(d) => d.deal_number} />
            )}

            <h3 className="h2" style={{ fontSize: 18, margin: '32px 0 12px' }}>Low-match deals</h3>
            {m.lowMatch.length === 0 ? (
              <EmptyState title="None" sub="No deals are stuck below the match-quality threshold." />
            ) : (
              <DataTable columns={lowCols} rows={m.lowMatch} rowKey={(d) => d.deal_number} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
