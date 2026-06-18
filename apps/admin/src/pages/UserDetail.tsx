import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatPercent, formatDate, timeAgo } from '@plynth/shared/utils';
import { adminService, type User360 } from '@plynth/supabase/services';
import { humanizeAction, moneyShortFromCents } from '../lib/format';
import {
  DataTable,
  PageHeader,
  RolePill,
  SeverityPill,
  VerificationPill,
  TableSkeleton,
  type Column,
} from '../components/DataTable';

export function UserDetail() {
  const { id = '' } = useParams();
  const { data, loading } = useAsync<User360>(() => adminService.userDetail(id), [id]);

  if (loading && !data) {
    return (
      <div className="page page-wide">
        <PageHeader title="User" />
        <TableSkeleton />
      </div>
    );
  }

  const u = data;
  const p = u?.profile;

  if (!p) {
    return (
      <div className="page page-wide">
        <PageHeader title="User" />
        <EmptyState title="User not found" sub="No profile for this id." />
        <Link to="/users" className="small" style={{ display: 'inline-block', marginTop: 16 }}>
          ← Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <Link to="/users" className="micro muted-text" style={{ display: 'inline-block', marginBottom: 14 }}>
        ← Users
      </Link>
      <PageHeader
        title={p.name ?? p.email}
        lead={
          <span>
            <RolePill role={p.role} /> {p.firm && <span style={{ marginLeft: 8 }}>{p.firm}</span>}
          </span>
        }
      />

      {/* Profile summary */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 36 }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <Fact label="Email" value={p.email} />
          <Fact label="Verification" value={<VerificationPill status={p.verificationStatus} />} />
          <Fact label="Joined" value={formatDate(p.createdAt)} />
          <Fact label="Last sign-in" value={p.lastSignInAt ? timeAgo(p.lastSignInAt) : '—'} />
          <Fact label="Email confirmed" value={p.emailConfirmedAt ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Deals (brokers) */}
      {u!.deals.length > 0 && (
        <Section title="Deals">
          <DataTable
            columns={dealCols}
            rows={u!.deals}
            rowKey={(d) => d.deal_number}
          />
        </Section>
      )}

      {/* Offers (lenders) */}
      {u!.offers.length > 0 && (
        <Section title="Offers">
          <DataTable columns={offerCols} rows={u!.offers} rowKey={(o, i) => `${o.deal_number}-${i}`} />
        </Section>
      )}

      {/* Notifications */}
      <Section title="Notifications">
        {u!.notifications.length === 0 ? (
          <EmptyState title="No notifications" sub="Nothing sent to this user yet." />
        ) : (
          <DataTable columns={notifCols} rows={u!.notifications} rowKey={(n, i) => `${i}-${n.created_at}`} />
        )}
      </Section>

      {/* Recent errors */}
      <Section title="Recent errors">
        {u!.recentErrors.length === 0 ? (
          <EmptyState title="No errors" sub="This user hasn't hit any captured errors." />
        ) : (
          <DataTable columns={errorCols} rows={u!.recentErrors} rowKey={(e, i) => `${i}-${e.created_at}`} />
        )}
      </Section>

      {/* Login history */}
      <Section title="Login history">
        {u!.loginHistory.length === 0 ? (
          <EmptyState title="No logins recorded" sub="No sign-in events for this user." />
        ) : (
          <DataTable columns={loginCols} rows={u!.loginHistory} rowKey={(l, i) => `${i}-${l.created_at}`} />
        )}
      </Section>

      {/* Audit trail */}
      <Section title="Audit trail">
        {u!.audit.length === 0 ? (
          <EmptyState title="No audit entries" sub="No recorded actions for this user." />
        ) : (
          <DataTable columns={auditCols} rows={u!.audit} rowKey={(a, i) => `${i}-${a.created_at}`} />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 className="h2" style={{ fontSize: 18, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="micro muted-text" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

type U = User360;

const dealCols: Column<U['deals'][number]>[] = [
  { header: 'Deal №', render: (d) => <span className="deal-no" style={{ fontSize: 14 }}>№ {d.deal_number}</span> },
  { header: 'Location', render: (d) => <span style={{ color: 'var(--text-2)' }}>{d.city}, {d.province}</span> },
  { header: 'Amount', align: 'right', render: (d) => <span className="num">{moneyShortFromCents(d.amount_cents)}</span> },
  { header: 'LTV', align: 'right', render: (d) => <span className="num">{formatPercent(d.ltv, 1)}</span> },
  { header: 'Status', render: (d) => <span style={{ textTransform: 'capitalize' }}>{d.status}</span> },
  { header: 'Created', align: 'right', render: (d) => <span style={{ color: 'var(--text-2)' }}>{formatDate(d.created_at)}</span> },
];

const offerCols: Column<U['offers'][number]>[] = [
  { header: 'Deal №', render: (o) => <span className="deal-no" style={{ fontSize: 14 }}>№ {o.deal_number}</span> },
  { header: 'Rate', align: 'right', render: (o) => <span className="num">{formatPercent(o.rate, 2)}</span> },
  { header: 'Fee', align: 'right', render: (o) => <span className="num">{o.lender_fee != null ? formatPercent(o.lender_fee, 1) : '—'}</span> },
  { header: 'Status', render: (o) => <span style={{ textTransform: 'capitalize' }}>{o.status}</span> },
  { header: 'Created', align: 'right', render: (o) => <span style={{ color: 'var(--text-2)' }}>{formatDate(o.created_at)}</span> },
];

const notifCols: Column<U['notifications'][number]>[] = [
  { header: 'Title', render: (n) => <span style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>{n.title}</span> },
  { header: 'Message', render: (n) => <span style={{ color: 'var(--text-2)' }}>{n.message}</span> },
  { header: 'Read', render: (n) => <span className="micro muted-text">{n.is_read ? 'Read' : 'Unread'}</span> },
  { header: 'Sent', align: 'right', render: (n) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(n.created_at)}</span> },
];

const errorCols: Column<U['recentErrors'][number]>[] = [
  { header: 'When', render: (e) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(e.created_at)}</span> },
  { header: 'Severity', render: (e) => <SeverityPill severity={e.severity} /> },
  {
    header: 'Error',
    render: (e) => (
      <span>
        {e.name && <span style={{ fontWeight: 600 }}>{e.name}: </span>}
        <span style={{ color: 'var(--text-2)' }}>{e.message}</span>
      </span>
    ),
  },
  { header: 'Route', render: (e) => <span className="micro muted-text">{e.route ?? '—'}</span> },
];

const loginCols: Column<U['loginHistory'][number]>[] = [
  { header: 'When', render: (l) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(l.created_at)}</span> },
  { header: 'IP', render: (l) => <span className="num micro">{l.ip ?? '—'}</span> },
  { header: 'Device', render: (l) => <span className="micro muted-text">{l.user_agent ?? '—'}</span> },
];

const auditCols: Column<U['audit'][number]>[] = [
  { header: 'When', render: (a) => <span style={{ color: 'var(--text-2)' }}>{timeAgo(a.created_at)}</span> },
  { header: 'Action', render: (a) => <span>{humanizeAction(a.action)}</span> },
  { header: 'Entity', render: (a) => <span className="micro muted-text">{a.entity_type ? `${a.entity_type} ${a.entity_id ?? ''}` : '—'}</span> },
  { header: 'IP', align: 'right', render: (a) => <span className="num micro">{a.ip ?? '—'}</span> },
];
