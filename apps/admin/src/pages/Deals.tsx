import { useState } from 'react';
import { Chip, Pill, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatCAD, formatPercent, formatDate } from '@plynth/shared/utils';
import { adminService, type AdminDealRow } from '@plynth/supabase/services';
import { DataTable, PageHeader, TableSkeleton, type Column } from '../components/DataTable';

const FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['active', 'Active'],
  ['negotiating', 'Negotiating'],
  ['offer', 'Offer'],
  ['funded', 'Funded'],
  ['draft', 'Draft'],
];

export function Deals() {
  const [filter, setFilter] = useState('all');
  const { data, loading } = useAsync<AdminDealRow[]>(
    () => adminService.listDeals(filter === 'all' ? undefined : { status: filter }),
    [filter]
  );

  const rows = data ?? [];

  const columns: Column<AdminDealRow>[] = [
    {
      header: 'Deal №',
      render: (d) => (
        <span className="deal-no" style={{ fontSize: 14 }}>
          № {d.deal_number}
        </span>
      ),
    },
    { header: 'Broker firm', render: (d) => d.brokerFirm },
    {
      header: 'Location',
      render: (d) => <span style={{ color: 'var(--text-2)' }}>{d.city}</span>,
    },
    {
      header: 'Amount',
      align: 'right',
      render: (d) => (
        <span className="num" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
          {formatCAD(d.amount_cents)}
        </span>
      ),
    },
    {
      header: 'LTV',
      align: 'right',
      render: (d) => <span className="num">{formatPercent(d.ltv, 1)}</span>,
    },
    { header: 'Status', render: (d) => <Pill status={d.status} /> },
    {
      header: 'Offers',
      align: 'right',
      render: (d) => <span className="num">{d.offers || '—'}</span>,
    },
    {
      header: 'Created',
      align: 'right',
      render: (d) => (
        <span style={{ color: 'var(--text-2)' }}>{formatDate(d.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="Deals" lead="Every deal in the marketplace." />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {FILTERS.map(([id, lbl]) => (
          <Chip key={id} on={filter === id} onClick={() => setFilter(id)}>
            {lbl}
          </Chip>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No deals here" sub="No deals match this filter." />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(d) => d.deal_number} />
      )}
    </div>
  );
}
