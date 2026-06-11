/* ============================================================
   PLYNTH — Shared React atoms (used by both portals)
   Exposes components on window for cross-file use.
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---- Monogram / Logo ---- */
function Monogram({ size = 30, inverse = false }) {
  const bg = inverse ? "#FAF6EF" : "#1F2D44";
  const stroke = inverse ? "#1F2D44" : "#FAF6EF";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="7" fill={bg} />
      <path d="M11.6 24V8.4H16.8a4.8 4.8 0 0 1 0 9.6H11.6" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="square" />
      <rect x="8.2" y="24" width="15.6" height="2.3" rx="0.5" fill="#D4A574" />
    </svg>
  );
}
function Logo({ size = 30, onClick, inverse = false }) {
  return (
    <a className="logo" onClick={onClick} style={{ cursor: "pointer" }}>
      <Monogram size={size} inverse={inverse} />
      <span className="wordmark" style={inverse ? { color: "#FAF6EF" } : null}>Plynth</span>
    </a>
  );
}

/* ---- Status pill ---- */
const PILL_LABELS = {
  draft: "Draft", active: "Active", matched: "Matched", offer: "Offer In",
  negotiating: "Negotiating", funded: "Funded", declined: "Declined", expired: "Expired",
  interested: "Interested", reviewing: "Reviewing",
};
function Pill({ status, children }) {
  const cls = { interested: "pill-matched", reviewing: "pill-active" }[status] || "pill-" + status;
  return <span className={"pill " + cls}>{children || PILL_LABELS[status] || status}</span>;
}

/* ---- Editorial numbered section divider ---- */
function SectionDivider({ n, label, meta, children }) {
  return (
    <div className="section-divider">
      <span className="sd-num">{n}</span>
      <span className="sd-slash">/</span>
      <span className="sd-label">{label}</span>
      {(meta || children) && <span className="sd-meta">{meta}{children}</span>}
    </div>
  );
}

/* ---- Stat block ---- */
function StatBlock({ value, unit, label, delta, deltaDir }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}{unit && <span className="unit">{unit}</span>}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className={"stat-delta " + (deltaDir || "up")}>{delta}</div>}
    </div>
  );
}
function StatStrip({ stats }) {
  return (
    <div className="stat-strip">
      {stats.map((s, i) => <StatBlock key={i} {...s} />)}
    </div>
  );
}

/* ---- Deal number ---- */
function DealNo({ n, size = 13 }) {
  return <span className="deal-no" style={{ fontSize: size }}>Deal № {n}</span>;
}

/* ---- Match score bar ---- */
function MatchBar({ score, width = 120 }) {
  return (
    <div className="matchbar">
      <div className="track" style={{ width }}><div className="fill" style={{ width: score + "%" }} /></div>
      <span className="val">{score}</span>
    </div>
  );
}

/* ---- Definition list ---- */
function DefList({ items, style }) {
  return (
    <dl className="deflist" style={style}>
      {items.map(([dt, dd], i) => (
        <div className="row" key={i}><dt>{dt}</dt><dd>{dd}</dd></div>
      ))}
    </dl>
  );
}

/* ---- Field ---- */
function Field({ label, hint, children, style }) {
  return (
    <div className="field" style={style}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/* ---- Chip (multi-select) ---- */
function Chip({ on, onClick, children, removable }) {
  return (
    <span className={"chip" + (on ? " is-on" : "")} onClick={onClick} role="button" aria-pressed={!!on}>
      {children}{removable && <span className="x">×</span>}
    </span>
  );
}

/* ---- Toast ---- */
function Toast({ show, title, sub, action, onAction }) {
  return (
    <div className={"toast" + (show ? " show" : "")}>
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {sub && <div className="small muted-text">{sub}</div>}
      </div>
      {action && <button className="btn btn-tertiary btn-sm" style={{ marginLeft: 8 }} onClick={onAction}>{action}</button>}
    </div>
  );
}
// Toast hook
function useToast() {
  const [toast, setToast] = useState(null);
  const fire = useCallback((t) => {
    setToast({ ...t, show: true });
    setTimeout(() => setToast((p) => p ? { ...p, show: false } : null), 3400);
  }, []);
  return [toast, fire];
}

/* ---- Avatar ---- */
function Avatar({ initials, size = 36, src }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "var(--slate-bg)", border: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 600, color: "var(--slate)", fontFamily: "var(--serif)",
      overflow: "hidden",
    }}>
      {src ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

/* ---- Empty state ---- */
function EmptyState({ title, sub, action }) {
  return (
    <div className="empty">
      <div className="em-title">{title}</div>
      <div className="em-sub">{sub}</div>
      {action && <div style={{ marginTop: 24 }}>{action}</div>}
    </div>
  );
}

/* ---- Profile dropdown ---- */
function ProfileMenu({ name, sub, initials, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 10, background: "transparent",
        border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6,
      }}>
        <Avatar initials={initials} size={32} />
        <span className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{name}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ marginTop: 2 }}><path d="M1 1l5 5 5-5" stroke="#6B7280" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="card fade-in" style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 220,
          boxShadow: "var(--shadow-lg)", padding: 8, zIndex: 60,
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
            <div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{name}</div>
            <div className="micro muted-text">{sub}</div>
          </div>
          {items.map((it, i) => (
            <div key={i} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
              style={{ padding: "9px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14, color: it.danger ? "var(--dust)" : "var(--text)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(59,84,122,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Sidebar nav ---- */
function Sidebar({ items, active, onNavigate, footer }) {
  return (
    <aside className="sidebar">
      {items.map((it, i) => (
        it.group
          ? <div key={i} className="nav-group-label">{it.group}</div>
          : <a key={i} className={"nav-item" + (active === it.id ? " active" : "")} onClick={() => onNavigate(it.id)}>{it.label}</a>
      ))}
      <div style={{ flex: 1 }} />
      {footer}
    </aside>
  );
}

/* ---- Striped figure placeholder ---- */
function FigurePlaceholder({ label, style }) {
  return (
    <div style={{
      background: "repeating-linear-gradient(135deg,#F1ECE2,#F1ECE2 9px,#EDE7DB 9px,#EDE7DB 18px)",
      border: "1px solid var(--border)", borderRadius: "var(--r-card)",
      display: "flex", alignItems: "center", justifyContent: "center", ...style,
    }}>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

Object.assign(window, {
  Monogram, Logo, Pill, SectionDivider, StatBlock, StatStrip, DealNo, MatchBar,
  DefList, Field, Chip, Toast, useToast, Avatar, EmptyState, ProfileMenu, Sidebar, FigurePlaceholder,
});
