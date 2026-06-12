import { type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                style={{
                  textAlign: c.align ?? 'left',
                  padding: '14px 18px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-2)',
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={rowKey(row, ri)}
              style={{
                borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '16px 18px',
                    fontSize: 14,
                    textAlign: c.align ?? 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Verification status pill — approved=sage, pending=wheat, rejected=dust.
const VERIF: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: 'var(--sage-bg)', color: '#5E7A67', label: 'Approved' },
  pending: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Pending' },
  rejected: { bg: 'var(--dust-bg)', color: '#A85F5F', label: 'Rejected' },
};

export function VerificationPill({ status }: { status: string }) {
  const v = VERIF[status] ?? { bg: '#F1EFE9', color: 'var(--muted)', label: status };
  return (
    <span
      className="pill"
      style={{ background: v.bg, color: v.color }}
    >
      {v.label}
    </span>
  );
}

export function RolePill({ role }: { role: string }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span className="pill pill-active">{label}</span>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 className="h1">{title}</h1>
      {lead && (
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          {lead}
        </p>
      )}
    </div>
  );
}

export function TableSkeleton() {
  return <div className="skel" style={{ height: 320, borderRadius: 8 }} />;
}
