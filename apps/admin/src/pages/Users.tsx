import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { timeAgo } from '@plynth/shared/utils';
import { adminService, type AdminUserRow } from '@plynth/supabase/services';
import {
  DataTable,
  PageHeader,
  RolePill,
  VerificationPill,
  TableSkeleton,
  type Column,
} from '../components/DataTable';
import { useToastFire } from '../components/ToastContext';

const FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['broker', 'Brokers'],
  ['lender', 'Lenders'],
];

export function Users() {
  const toast = useToastFire();
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, refresh } = useAsync<AdminUserRow[]>(
    () => adminService.listUsers(),
    []
  );

  const all = data ?? [];
  const rows = all.filter((u) => filter === 'all' || u.role === filter);

  const setVerification = async (
    user: AdminUserRow,
    status: 'approved' | 'rejected'
  ) => {
    setBusyId(user.id);
    try {
      await adminService.setVerification(user.id, status);
      toast({
        title: `${user.name} ${status === 'approved' ? 'verified' : 'rejected'}`,
        sub: user.firm,
      });
      refresh();
    } catch (err) {
      toast({ title: 'Could not update verification', sub: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<AdminUserRow>[] = [
    {
      header: 'Name',
      render: (u) => (
        <Link to={`/users/${u.id}`} className="admin-user-link" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>{u.name}</div>
          <div className="micro muted-text">{u.email}</div>
        </Link>
      ),
    },
    { header: 'Role', render: (u) => <RolePill role={u.role} /> },
    {
      header: 'Firm',
      render: (u) => <span style={{ color: 'var(--text-2)' }}>{u.firm}</span>,
    },
    {
      header: 'Verification',
      render: (u) => <VerificationPill status={u.verificationStatus} />,
    },
    {
      header: 'Last sign-in',
      render: (u) => (
        <span style={{ color: 'var(--text-2)' }}>
          {u.lastSignInAt ? timeAgo(u.lastSignInAt) : '—'}
        </span>
      ),
    },
    { header: 'Deals', align: 'right', render: (u) => <span className="num">{u.dealsCount || '—'}</span> },
    { header: 'Offers', align: 'right', render: (u) => <span className="num">{u.offersCount || '—'}</span> },
    {
      header: '',
      align: 'right',
      render: (u) => {
        const busy = busyId === u.id;
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {u.verificationStatus !== 'approved' && (
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => setVerification(u, 'approved')}
              >
                {busy ? 'Saving…' : 'Verify'}
              </button>
            )}
            {u.verificationStatus !== 'rejected' && (
              <button
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => setVerification(u, 'rejected')}
              >
                {busy ? 'Saving…' : 'Reject'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="Users" lead={`${all.length} accounts in the directory.`} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {FILTERS.map(([id, lbl]) => (
          <Chip key={id} on={filter === id} onClick={() => setFilter(id)}>
            {lbl}
          </Chip>
        ))}
      </div>

      {loading && all.length === 0 ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No users here"
          sub="No accounts match this filter."
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} />
      )}
    </div>
  );
}
