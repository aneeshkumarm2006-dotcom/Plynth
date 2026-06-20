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
    <div className="card admin-table-card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                style={{
                  textAlign: c.align ?? 'left',
                  padding: '13px 18px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-2)',
                  fontFeatureSettings: c.align === 'right' ? "'tnum' 1" : undefined,
                  whiteSpace: 'nowrap',
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
              className="admin-row"
              style={{
                borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={c.align === 'right' ? 'num' : undefined}
                  style={{
                    padding: '15px 18px',
                    fontSize: 14,
                    textAlign: c.align ?? 'left',
                    verticalAlign: 'middle',
                    color: 'var(--text)',
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
  approved: { bg: 'var(--sage-bg)', color: '#3F6390', label: 'Approved' },
  pending: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Pending' },
  rejected: { bg: 'var(--dust-bg)', color: '#A85F5F', label: 'Rejected' },
};

export function VerificationPill({ status }: { status: string }) {
  const v = VERIF[status] ?? { bg: '#F1EFE9', color: 'var(--muted)', label: status };
  return (
    <span className="pill" style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  );
}

// Offer status pill. The shared `Pill` only ships classes for deal-lifecycle
// states; offer states (submitted/countered/accepted/rejected/expired) have no
// `pill-*` class in plynth.css and would render unstyled. Map them here to the
// brand's low-saturation tones — never traffic-light.
const OFFER: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Submitted' },
  countered: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Countered' },
  accepted: { bg: 'var(--sage-bg)', color: '#3F6390', label: 'Accepted' },
  rejected: { bg: 'var(--dust-bg)', color: '#A85F5F', label: 'Rejected' },
  expired: { bg: '#F1EFE9', color: 'var(--muted)', label: 'Expired' },
};

export function OfferPill({ status }: { status: string }) {
  const o =
    OFFER[status] ?? {
      bg: '#F1EFE9',
      color: 'var(--muted)',
      label: status.charAt(0).toUpperCase() + status.slice(1),
    };
  return (
    <span className="pill" style={{ background: o.bg, color: o.color }}>
      {o.label}
    </span>
  );
}

// Telemetry severity pill. Brand low-saturation tones, never
// traffic-light: info=slate, warning=wheat, error/fatal=dust (fatal
// reads heavier via weight, not a louder hue).
const SEVERITY: Record<string, { bg: string; color: string; label: string; bold?: boolean }> = {
  info: { bg: 'var(--slate-bg)', color: 'var(--slate)', label: 'Info' },
  warning: { bg: 'var(--wheat-bg)', color: '#A8893F', label: 'Warning' },
  error: { bg: 'var(--dust-bg)', color: '#A85F5F', label: 'Error' },
  fatal: { bg: 'var(--dust-bg)', color: '#7A3F3F', label: 'Fatal', bold: true },
};

export function SeverityPill({ severity }: { severity: string }) {
  const s =
    SEVERITY[severity] ?? {
      bg: '#F1EFE9',
      color: 'var(--muted)',
      label: severity.charAt(0).toUpperCase() + severity.slice(1),
    };
  return (
    <span className="pill" style={{ background: s.bg, color: s.color, fontWeight: s.bold ? 700 : undefined }}>
      {s.label}
    </span>
  );
}

export function RolePill({ role }: { role: string }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return <span className="pill pill-active">{label}</span>;
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
