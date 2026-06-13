import { useEffect, useState } from 'react';
import { Chip, EmptyState, StatStrip, type StatBlockProps } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatNumber, timeAgo } from '@plynth/shared/utils';
import {
  adminService,
  type ErrorRow,
  type HealthSummary,
} from '@plynth/supabase/services';
import {
  DataTable,
  PageHeader,
  SeverityPill,
  TableSkeleton,
  type Column,
} from '../components/DataTable';

const WINDOWS: Array<[number, string]> = [
  [15, '15m'],
  [60, '1h'],
  [1440, '24h'],
];

const APP_FILTERS: Array<[string, string]> = [
  ['all', 'All apps'],
  ['broker', 'Broker'],
  ['lender', 'Lender'],
  ['admin', 'Admin'],
];

const SEV_FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['warning', 'Warning'],
  ['error', 'Error'],
  ['fatal', 'Fatal'],
];

export function Health() {
  const [windowMin, setWindowMin] = useState(60);
  const [appFilter, setAppFilter] = useState('all');
  const [sevFilter, setSevFilter] = useState('all');

  const summary = useAsync<HealthSummary>(
    () => adminService.healthSummary(windowMin),
    [windowMin]
  );

  // Error stream — initial fetch on filter change + realtime prepend.
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [streamLoading, setStreamLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setStreamLoading(true);
    adminService
      .errorStream({
        app: appFilter === 'all' ? undefined : appFilter,
        severity: sevFilter === 'all' ? undefined : sevFilter,
      })
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setStreamLoading(false));

    const unsubscribe = adminService.subscribeErrors((row) => {
      // Respect the active filters for the live prepend.
      if (appFilter !== 'all' && row.app !== appFilter) return;
      if (sevFilter !== 'all' && row.severity !== sevFilter) return;
      setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev].slice(0, 200)));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [appFilter, sevFilter]);

  const m = summary.data;
  const stats: StatBlockProps[] = m
    ? [
        { value: formatNumber(m.errorCount), label: 'Errors' },
        { value: formatNumber(m.fatalCount), label: 'Fatal' },
        { value: formatNumber(m.eventCount), label: 'Events' },
        ...m.byApp.map((a) => ({
          value: formatNumber(a.errors),
          label: `${a.app[0].toUpperCase()}${a.app.slice(1)} errors`,
        })),
      ]
    : [];

  const columns: Column<ErrorRow>[] = [
    {
      header: 'When',
      render: (r) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(r.createdAt)}</span>,
    },
    { header: 'App', render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.app}</span> },
    { header: 'Severity', render: (r) => <SeverityPill severity={r.severity} /> },
    {
      header: 'Error',
      render: (r) => (
        <span>
          {r.name && <span style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>{r.name}: </span>}
          <span style={{ color: 'var(--text-2)' }}>{r.message}</span>
        </span>
      ),
    },
    {
      header: 'Source',
      render: (r) => <span className="micro muted-text">{r.source}</span>,
    },
    {
      header: 'Route',
      render: (r) => <span className="micro muted-text">{r.route ?? '—'}</span>,
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="System health" lead="Live errors and failures across every app." />

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {WINDOWS.map(([min, lbl]) => (
          <Chip key={min} on={windowMin === min} onClick={() => setWindowMin(min)}>
            {lbl}
          </Chip>
        ))}
      </div>

      {summary.loading && !m ? (
        <div className="skel" style={{ height: 120, borderRadius: 8 }} />
      ) : summary.error || !m ? (
        <EmptyState title="Health unavailable" sub="Could not load health metrics." />
      ) : (
        <StatStrip stats={stats} />
      )}

      {/* Top issues */}
      {m && m.topFingerprints.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 className="h2" style={{ marginBottom: 14 }}>Top issues</h2>
          <div className="card" style={{ padding: '4px 0' }}>
            {m.topFingerprints.map((f, i) => (
              <div
                key={f.fingerprint}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 14,
                  padding: '12px 20px',
                  borderBottom: i < m.topFingerprints.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span className="num" style={{ flex: '0 0 40px', fontWeight: 700, color: 'var(--slate-deep)' }}>
                  {f.count}×
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>
                    {f.name && <span style={{ fontWeight: 600 }}>{f.name}: </span>}
                    <span style={{ color: 'var(--text-2)' }}>{f.message}</span>
                  </div>
                  <div className="micro muted-text" style={{ marginTop: 3 }}>
                    {f.app} · last seen {timeAgo(f.lastSeen)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error stream */}
      <div style={{ marginTop: 40 }}>
        <h2 className="h2" style={{ marginBottom: 14 }}>Error stream</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {APP_FILTERS.map(([id, lbl]) => (
            <Chip key={id} on={appFilter === id} onClick={() => setAppFilter(id)}>
              {lbl}
            </Chip>
          ))}
          <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          {SEV_FILTERS.map(([id, lbl]) => (
            <Chip key={id} on={sevFilter === id} onClick={() => setSevFilter(id)}>
              {lbl}
            </Chip>
          ))}
        </div>

        {streamLoading && rows.length === 0 ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title="No errors" sub="No errors match these filters. That's a good thing." />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} />
        )}
      </div>
    </div>
  );
}
