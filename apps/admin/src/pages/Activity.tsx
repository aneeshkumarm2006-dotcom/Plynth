import { useEffect, useState } from 'react';
import { EmptyState, DealNo } from '@plynth/shared/ui';
import { timeAgo } from '@plynth/shared/utils';
import { adminService, type AdminActivityRow } from '@plynth/supabase/services';
import { humanizeAction } from '../lib/format';
import { PageHeader } from '../components/DataTable';

export function Activity() {
  const [rows, setRows] = useState<AdminActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    adminService
      .activityFeed()
      .then((data) => {
        if (alive) {
          setRows(data);
          setError(false);
        }
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));

    const unsubscribe = adminService.subscribeActivity((row) => {
      setRows((prev) =>
        prev.some((r) => r.id === row.id) ? prev : [row, ...prev]
      );
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className="page">
      <PageHeader title="Activity" lead="Marketplace-wide audit feed, live." />

      {loading && rows.length === 0 ? (
        <div className="skel" style={{ height: 320, borderRadius: 8 }} />
      ) : error && rows.length === 0 ? (
        <EmptyState title="Feed unavailable" sub="Could not load the activity feed." />
      ) : rows.length === 0 ? (
        <EmptyState title="No activity yet" sub="Marketplace events will appear here." />
      ) : (
        <div className="card" style={{ padding: '8px 0' }}>
          {rows.map((r, i) => (
            <ActivityItem key={r.id} row={r} last={i === rows.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ row, last }: { row: AdminActivityRow; last: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        padding: '14px 22px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <span
        className="num"
        style={{
          flex: '0 0 84px',
          fontSize: 12,
          color: 'var(--text-2)',
        }}
      >
        {timeAgo(row.createdAt)}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
            {row.actorName || 'Unknown'}
          </span>{' '}
          <span style={{ color: 'var(--text-2)' }}>{humanizeAction(row.action)}</span>
          {row.entityType === 'deal' && row.entityId && (
            <>
              {' '}
              <DealNo n={row.entityId} size={13} />
            </>
          )}
          {row.entityType === 'offer' && row.entityId && (
            <>
              {' '}
              <span className="deal-no" style={{ fontSize: 13 }}>
                Offer · № {row.entityId}
              </span>
            </>
          )}
        </div>
        {(row.ip || row.userAgent) && (
          <div className="micro muted-text" style={{ marginTop: 4 }}>
            {[row.ip, row.userAgent].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
