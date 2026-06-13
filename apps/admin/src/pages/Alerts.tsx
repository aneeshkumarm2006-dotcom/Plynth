import { useState } from 'react';
import { Chip, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { timeAgo } from '@plynth/shared/utils';
import {
  adminService,
  type AlertEvent,
  type AlertRule,
  type AlertStatus,
} from '@plynth/supabase/services';
import { DataTable, PageHeader, SeverityPill, TableSkeleton, type Column } from '../components/DataTable';
import { useToastFire } from '../components/ToastContext';

const KIND_LABEL: Record<string, string> = {
  error_rate_spike: 'Error-rate spike',
  signups_drop: 'Signups drop',
  deal_stuck: 'Deal stuck',
  offers_expiring_unhandled: 'Offers expiring',
  zero_match_rate: 'Zero-match rate',
};

const STATUS_FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['open', 'Open'],
  ['acknowledged', 'Acknowledged'],
  ['resolved', 'Resolved'],
];

// Alert severity uses the same brand tones as telemetry severity.
const SEV_AS_ERROR: Record<string, string> = { high: 'error', medium: 'warning', low: 'info' };

export function Alerts() {
  const toast = useToastFire();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [running, setRunning] = useState(false);

  const rules = useAsync<AlertRule[]>(() => adminService.listAlertRules(), []);
  const events = useAsync<AlertEvent[]>(
    () => adminService.listAlertEvents(statusFilter === 'all' ? undefined : (statusFilter as AlertStatus)),
    [statusFilter]
  );

  const toggleRule = async (rule: AlertRule) => {
    try {
      await adminService.setAlertRuleEnabled(rule.id, !rule.isEnabled);
      toast({ title: `${rule.name} ${rule.isEnabled ? 'disabled' : 'enabled'}` });
      rules.refresh();
    } catch (err) {
      toast({ title: 'Could not update rule', sub: (err as Error).message });
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const fired = await adminService.runAlertEval();
      toast({ title: 'Evaluation complete', sub: fired > 0 ? `${fired} alert(s) fired` : 'No new alerts' });
      rules.refresh();
      events.refresh();
    } catch (err) {
      toast({ title: 'Could not run evaluation', sub: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const updateEvent = async (e: AlertEvent, status: AlertStatus) => {
    try {
      await adminService.updateAlertEvent(e.id, status);
      toast({ title: `Alert ${status}` });
      events.refresh();
    } catch (err) {
      toast({ title: 'Could not update alert', sub: (err as Error).message });
    }
  };

  const ruleCols: Column<AlertRule>[] = [
    {
      header: 'Rule',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>{r.name}</div>
          <div className="micro muted-text">{KIND_LABEL[r.kind] ?? r.kind}</div>
        </div>
      ),
    },
    { header: 'Severity', render: (r) => <SeverityPill severity={SEV_AS_ERROR[r.severity] ?? 'info'} /> },
    {
      header: 'Threshold',
      render: (r) => <span className="micro muted-text">{JSON.stringify(r.params)}</span>,
    },
    {
      header: 'Last fired',
      render: (r) => <span style={{ color: 'var(--text-2)' }}>{r.lastFiredAt ? timeAgo(r.lastFiredAt) : '—'}</span>,
    },
    {
      header: 'Enabled',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => toggleRule(r)}
          aria-label={r.isEnabled ? 'Disable rule' : 'Enable rule'}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            border: 'none',
            background: r.isEnabled ? 'var(--sage)' : 'var(--border)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 200ms',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: r.isEnabled ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: 'var(--shadow-sm)',
              transition: 'left 200ms',
            }}
          />
        </button>
      ),
    },
  ];

  const eventCols: Column<AlertEvent>[] = [
    { header: 'Fired', render: (e) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(e.firedAt)}</span> },
    { header: 'Severity', render: (e) => <SeverityPill severity={SEV_AS_ERROR[e.severity] ?? 'info'} /> },
    {
      header: 'Alert',
      render: (e) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>{e.ruleName}</div>
          <div className="micro muted-text">{e.summary}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (e) => <span style={{ textTransform: 'capitalize', color: 'var(--text-2)' }}>{e.status}</span>,
    },
    {
      header: '',
      align: 'right',
      render: (e) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {e.status === 'open' && (
            <button className="btn btn-secondary btn-sm" onClick={() => updateEvent(e, 'acknowledged')}>
              Acknowledge
            </button>
          )}
          {e.status !== 'resolved' && (
            <button className="btn btn-secondary btn-sm" onClick={() => updateEvent(e, 'resolved')}>
              Resolve
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader title="Alerts" lead="Threshold rules and the alerts they've fired." />

      {/* Rules */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Rules</h2>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" disabled={running} onClick={runNow}>
          {running ? 'Running…' : 'Run evaluation now'}
        </button>
      </div>

      {rules.loading && !rules.data ? (
        <TableSkeleton />
      ) : (rules.data ?? []).length === 0 ? (
        <EmptyState title="No rules yet" sub="Alert rules are seeded by an admin migration." />
      ) : (
        <DataTable columns={ruleCols} rows={rules.data ?? []} rowKey={(r) => r.id} />
      )}

      {/* Fired events */}
      <div style={{ marginTop: 44 }}>
        <h2 className="h2" style={{ fontSize: 18, marginBottom: 14 }}>Fired alerts</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(([id, lbl]) => (
            <Chip key={id} on={statusFilter === id} onClick={() => setStatusFilter(id)}>
              {lbl}
            </Chip>
          ))}
        </div>

        {events.loading && !events.data ? (
          <TableSkeleton />
        ) : (events.data ?? []).length === 0 ? (
          <EmptyState title="No alerts" sub="Nothing has fired for this filter." />
        ) : (
          <DataTable columns={eventCols} rows={events.data ?? []} rowKey={(e) => String(e.id)} />
        )}
      </div>
    </div>
  );
}
