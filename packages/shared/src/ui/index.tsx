import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type MouseEventHandler,
} from 'react';

export { NotificationBell } from './NotificationBell';

// ============================================================
// Monogram + Logo
// ============================================================

export function Monogram({ size = 30, inverse = false }: { size?: number; inverse?: boolean }) {
  const bg = inverse ? '#FAF6EF' : '#1F2D44';
  const stroke = inverse ? '#1F2D44' : '#FAF6EF';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="7" fill={bg} />
      <path
        d="M11.6 24V8.4H16.8a4.8 4.8 0 0 1 0 9.6H11.6"
        stroke={stroke}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="square"
      />
      <rect x="8.2" y="24" width="15.6" height="2.3" rx="0.5" fill="#D4A574" />
    </svg>
  );
}

export function Logo({
  size = 30,
  onClick,
  inverse = false,
}: {
  size?: number;
  onClick?: MouseEventHandler;
  inverse?: boolean;
}) {
  return (
    <a className="logo" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <Monogram size={size} inverse={inverse} />
      <span className="wordmark" style={inverse ? { color: '#FAF6EF' } : undefined}>
        Plynth
      </span>
    </a>
  );
}

// ============================================================
// Status pill
// ============================================================

const PILL_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  matched: 'Matched',
  offer: 'Offer In',
  negotiating: 'Negotiating',
  funded: 'Funded',
  declined: 'Declined',
  expired: 'Expired',
  interested: 'Interested',
  reviewing: 'Reviewing',
};

export function Pill({ status, children }: { status: string; children?: ReactNode }) {
  const cls =
    ({ interested: 'pill-matched', reviewing: 'pill-active' } as Record<string, string>)[status] ||
    'pill-' + status;
  return <span className={'pill ' + cls}>{children ?? PILL_LABELS[status] ?? status}</span>;
}

// ============================================================
// Editorial numbered section divider
// ============================================================

export function SectionDivider({
  n,
  label,
  meta,
  children,
}: {
  n: string | number;
  label: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="section-divider">
      <span className="sd-num">{n}</span>
      <span className="sd-slash">/</span>
      <span className="sd-label">{label}</span>
      {(meta || children) && (
        <span className="sd-meta">
          {meta}
          {children}
        </span>
      )}
    </div>
  );
}

// ============================================================
// Stat block + strip
// ============================================================

export interface StatBlockProps {
  value: string;
  unit?: string;
  label: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
}

export function StatBlock({ value, unit, label, delta, deltaDir }: StatBlockProps) {
  return (
    <div className="stat">
      <div className="stat-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
      {delta && <div className={'stat-delta ' + (deltaDir || 'up')}>{delta}</div>}
    </div>
  );
}

export function StatStrip({ stats }: { stats: StatBlockProps[] }) {
  return (
    <div className="stat-strip">
      {stats.map((s, i) => (
        <StatBlock key={i} {...s} />
      ))}
    </div>
  );
}

// ============================================================
// Deal number
// ============================================================

export function DealNo({ n, size = 13 }: { n: string; size?: number }) {
  return (
    <span className="deal-no" style={{ fontSize: size }}>
      Deal № {n}
    </span>
  );
}

// ============================================================
// Match score bar
// ============================================================

export function MatchBar({ score, width = 120 }: { score: number; width?: number }) {
  return (
    <div className="matchbar">
      <div className="track" style={{ width }}>
        <div className="fill" style={{ width: score + '%' }} />
      </div>
      <span className="val">{score}</span>
    </div>
  );
}

// ============================================================
// Definition list
// ============================================================

export function DefList({
  items,
  style,
}: {
  items: Array<[ReactNode, ReactNode]>;
  style?: CSSProperties;
}) {
  return (
    <dl className="deflist" style={style}>
      {items.map(([dt, dd], i) => (
        <div className="row" key={i}>
          <dt>{dt}</dt>
          <dd>{dd}</dd>
        </div>
      ))}
    </dl>
  );
}

// ============================================================
// Field
// ============================================================

export function Field({
  label,
  hint,
  children,
  style,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="field" style={style}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

// ============================================================
// Chip
// ============================================================

export function Chip({
  on,
  onClick,
  children,
  removable,
}: {
  on?: boolean;
  onClick?: MouseEventHandler;
  children: ReactNode;
  removable?: boolean;
}) {
  return (
    <span
      className={'chip' + (on ? ' is-on' : '')}
      onClick={onClick}
      role="button"
      aria-pressed={!!on}
    >
      {children}
      {removable && <span className="x">×</span>}
    </span>
  );
}

// ============================================================
// Toast
// ============================================================

export interface ToastSpec {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}

export function Toast({
  show,
  title,
  sub,
  action,
  onAction,
}: ToastSpec & { show: boolean }) {
  return (
    <div className={'toast' + (show ? ' show' : '')}>
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {sub && <div className="small muted-text">{sub}</div>}
      </div>
      {action && (
        <button
          className="btn btn-tertiary btn-sm"
          style={{ marginLeft: 8 }}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

export function useToast(): [
  (ToastSpec & { show: boolean }) | null,
  (t: ToastSpec) => void,
] {
  const [toast, setToast] = useState<(ToastSpec & { show: boolean }) | null>(null);
  const fire = useCallback((t: ToastSpec) => {
    setToast({ ...t, show: true });
    setTimeout(() => setToast((p) => (p ? { ...p, show: false } : null)), 3400);
  }, []);
  return [toast, fire];
}

// ============================================================
// Avatar
// ============================================================

export function Avatar({
  initials,
  size = 36,
  src,
}: {
  initials?: string;
  size?: number;
  src?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'var(--slate-bg)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 600,
        color: 'var(--slate)',
        fontFamily: 'var(--serif)',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

// ============================================================
// Empty state
// ============================================================

export function EmptyState({
  title,
  sub,
  action,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="em-title">{title}</div>
      <div className="em-sub">{sub}</div>
      {action && <div style={{ marginTop: 24 }}>{action}</div>}
    </div>
  );
}

// ============================================================
// Profile menu
// ============================================================

export interface ProfileMenuItem {
  label: string;
  onClick?: () => void;
  danger?: boolean;
}

export function ProfileMenu({
  name,
  sub,
  initials,
  items,
}: {
  name: string;
  sub?: string;
  initials: string;
  items: ProfileMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 6,
        }}
      >
        <Avatar initials={initials} size={32} />
        <span className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
          {name}
        </span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ marginTop: 2 }}>
          <path
            d="M1 1l5 5 5-5"
            stroke="#6B7280"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="card fade-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 220,
            boxShadow: 'var(--shadow-lg)',
            padding: 8,
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              marginBottom: 4,
            }}
          >
            <div
              className="small"
              style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
            >
              {name}
            </div>
            {sub && <div className="micro muted-text">{sub}</div>}
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              style={{
                padding: '9px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                color: it.danger ? 'var(--dust)' : 'var(--text)',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'rgba(59,84,122,0.05)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
              }
            >
              {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sidebar nav
// ============================================================

export interface SidebarItem {
  id?: string;
  label?: string;
  group?: string;
}

export function Sidebar({
  items,
  active,
  onNavigate,
  footer,
}: {
  items: SidebarItem[];
  active?: string;
  onNavigate: (id: string) => void;
  footer?: ReactNode;
}) {
  return (
    <aside className="sidebar">
      {items.map((it, i) =>
        it.group ? (
          <div key={i} className="nav-group-label">
            {it.group}
          </div>
        ) : (
          <a
            key={i}
            className={'nav-item' + (active === it.id ? ' active' : '')}
            onClick={() => it.id && onNavigate(it.id)}
          >
            {it.label}
          </a>
        )
      )}
      <div style={{ flex: 1 }} />
      {footer}
    </aside>
  );
}

// ============================================================
// Striped figure placeholder
// ============================================================

export function FigurePlaceholder({
  label,
  style,
}: {
  label: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background:
          'repeating-linear-gradient(135deg,#F1ECE2,#F1ECE2 9px,#EDE7DB 9px,#EDE7DB 18px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'ui-monospace,Menlo,monospace',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ============================================================
// Setting toggle
// ============================================================

export function SettingToggle({
  label,
  on: initial,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange?: (next: boolean) => void;
}) {
  const [on, setOn] = useState(initial);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span className="small" style={{ color: 'var(--slate-deep)', fontWeight: 500 }}>
        {label}
      </span>
      <button
        onClick={() => {
          const next = !on;
          setOn(next);
          onChange?.(next);
        }}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          border: 'none',
          background: on ? 'var(--sage)' : 'var(--border)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 200ms',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left 200ms',
          }}
        />
      </button>
    </div>
  );
}

// ============================================================
// Step dots (signup progress)
// ============================================================

export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 2,
            background: i <= step ? 'var(--slate)' : 'var(--border)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  );
}
