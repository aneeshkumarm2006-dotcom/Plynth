import { useState } from 'react';
import { Chip, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatPercent, formatDate } from '@plynth/shared/utils';
import { adminService, type AdminOfferRow } from '@plynth/supabase/services';
import {
  DataTable,
  OfferPill,
  PageHeader,
  TableSkeleton,
  type Column,
} from '../components/DataTable';

const FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['submitted', 'Submitted'],
  ['countered', 'Countered'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['expired', 'Expired'],
];

export function Offers() {
  const [filter, setFilter] = useState('all');
  const { data, loading } = useAsync<AdminOfferRow[]>(
    () => adminService.listOffers(filter === 'all' ? undefined : { status: filter }),
    [filter]
  );

  const rows = data ?? [];

  const columns: Column<AdminOfferRow>[] = [
    {
      header: 'Deal №',
      render: (o) => (
        <span className="deal-no" style={{ fontSize: 14 }}>
          № {o.deal_number}
        </span>
      ),
    },
    { header: 'Lender firm', render: (o) => o.lenderFirm },
    {
      header: 'Rate',
      align: 'right',
      render: (o) => (
        <span className="num" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
          {formatPercent(o.rate, 2)}
        </span>
      ),
    },
    {
      header: 'Lender fee',
      align: 'right',
      render: (o) => <span className="num">{formatPercent(o.lenderFee, 2)}</span>,
    },
    { header: 'Status', render: (o) => <OfferPill status={o.status} /> },
    {
      header: 'Expires',
      align: 'right',
      render: (o) => (
        <span style={{ color: 'var(--text-2)' }}>{formatDate(o.expires_at)}</span>
      ),
    },
    {
      header: 'Created',
      align: 'right',
      render: (o) => (
        <span style={{ color: 'var(--text-2)' }}>{formatDate(o.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="Offers" lead="Every offer in the marketplace." />

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
        <EmptyState title="No offers here" sub="No offers match this filter." />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(o, i) => `${o.deal_number}-${i}`} />
      )}
    </div>
  );
}
