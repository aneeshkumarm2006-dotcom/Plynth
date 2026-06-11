import { useEffect, useState, type CSSProperties } from 'react';
import {
  Chip,
  DealNo,
  Field,
  SectionDivider,
} from '@plynth/shared/ui';
import { CITIES_BY_PROVINCE, LENDER_MOCK } from '@plynth/shared/mock';
import { useDebouncedValue } from '@plynth/shared/hooks';
import { estimateMatchCount, formatMoneyShort } from '@plynth/shared/utils';
import type { BuilderState } from '@plynth/supabase/services';

export interface CriteriaBuilderProps {
  initial?: BuilderState;
  onComplete?: (c: BuilderState) => void;
  ctaLabel?: string;
  note?: string;
  embedded?: boolean;
}

export function CriteriaBuilder({
  initial,
  onComplete,
  ctaLabel,
  note,
  embedded,
}: CriteriaBuilderProps) {
  const [c, setC] = useState<BuilderState>(initial ?? LENDER_MOCK.criteria);

  // If the parent loads `initial` async, reset state when it arrives.
  useEffect(() => {
    if (initial) setC(initial);
  }, [initial]);

  const set = (patch: Partial<BuilderState>) =>
    setC((prev) => ({ ...prev, ...patch }));

  const toggleArr = <K extends 'assets' | 'provinces' | 'cities' | 'exclusions'>(
    key: K,
    val: string
  ) => {
    const arr = c[key];
    set({
      [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    } as Partial<BuilderState>);
  };

  // Debounce so we don't recompute on every keystroke; matches the spec.
  const debounced = useDebouncedValue(c, 200);
  const matches = estimateMatchCount(debounced);
  const sample = LENDER_MOCK.matched.slice(0, 3);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 48,
        alignItems: 'start',
      }}
    >
      <div>
        <Section n="01" label="Asset Classes" meta={c.assets.length + ' selected'}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {LENDER_MOCK.ASSET_CLASSES.map((a) => {
              const on = c.assets.includes(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => toggleArr('assets', a.id)}
                  style={{
                    border: '1px solid ' + (on ? 'var(--slate)' : 'var(--border)'),
                    background: on ? 'var(--slate-bg)' : 'var(--white)',
                    borderRadius: 8,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 200ms var(--ease)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className="small"
                      style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                    >
                      {a.id}
                    </span>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: '1.5px solid ' + (on ? 'var(--slate)' : 'var(--muted)'),
                        background: on ? 'var(--slate)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 11,
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                  </div>
                  <div className="micro muted-text">{a.desc}</div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section n="02" label="Geography" meta={c.provinces.length + ' provinces'}>
          <div
            className="micro muted-text"
            style={{
              marginBottom: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            West → East
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {LENDER_MOCK.PROVINCES.map((p) => {
              const on = c.provinces.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleArr('provinces', p)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: '1px solid ' + (on ? 'var(--slate)' : 'var(--border)'),
                    background: on ? 'var(--slate)' : 'var(--white)',
                    color: on ? '#fff' : 'var(--text-2)',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'all 200ms var(--ease)',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
          {c.provinces.length > 0 && (
            <div
              className="fade-in"
              style={{
                padding: '16px 18px',
                background: '#FCFAF5',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <div className="micro muted-text" style={{ marginBottom: 10 }}>
                Cities — refine within selected provinces (optional)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.provinces
                  .flatMap((p) => CITIES_BY_PROVINCE[p] ?? [])
                  .map((city) => (
                    <Chip
                      key={city}
                      on={c.cities.includes(city)}
                      onClick={() => toggleArr('cities', city)}
                    >
                      {city}
                    </Chip>
                  ))}
              </div>
            </div>
          )}
        </Section>

        <Section n="03" label="Loan Parameters">
          <div style={{ marginBottom: 28 }}>
            <SliderHeader
              label="Loan size"
              value={`${formatMoneyShort(c.loanMin)} – ${formatMoneyShort(c.loanMax)}`}
            />
            <DualRange
              min={50000}
              max={10000000}
              step={50000}
              lo={c.loanMin}
              hi={c.loanMax}
              onChange={(lo, hi) => set({ loanMin: lo, loanMax: hi })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>
            <div>
              <SliderHeader label="Max LTV — 1st position" value={`${c.ltv1}%`} />
              <input
                className="range"
                type="range"
                min={40}
                max={90}
                value={c.ltv1}
                onChange={(e) => set({ ltv1: +e.target.value })}
              />
            </div>
            <div>
              <SliderHeader label="Max LTV — 2nd position" value={`${c.ltv2}%`} />
              <input
                className="range"
                type="range"
                min={40}
                max={90}
                value={c.ltv2}
                onChange={(e) => set({ ltv2: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <SliderHeader
              label="Term range"
              value={`${c.termMin} – ${c.termMax} months`}
            />
            <DualRange
              min={3}
              max={36}
              step={3}
              lo={c.termMin}
              hi={c.termMax}
              onChange={(lo, hi) => set({ termMin: lo, termMax: hi })}
            />
          </div>
        </Section>

        <Section n="04" label="Borrower Profile">
          <div style={{ marginBottom: 24 }}>
            <SliderHeader label="Minimum Beacon score" value={`${c.beacon}`} />
            <input
              className="range"
              type="range"
              min={500}
              max={800}
              step={10}
              value={c.beacon}
              onChange={(e) => set({ beacon: +e.target.value })}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#FCFAF5',
              border: '1px solid var(--border)',
              borderRadius: 6,
              marginBottom: 20,
            }}
          >
            <div>
              <div className="small" style={{ fontWeight: 600, color: 'var(--slate-deep)' }}>
                Accept Bank-Financing-Statement (BFS) borrowers
              </div>
              <div className="micro muted-text">Self-employed with stated income</div>
            </div>
            <ToggleSwitch on={c.bfs} onChange={(v) => set({ bfs: v })} />
          </div>
          <div>
            <span className="label" style={{ display: 'block', marginBottom: 10 }}>
              Exclusions
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LENDER_MOCK.EXCLUSION_OPTIONS.map((x) => (
                <Chip
                  key={x}
                  on={c.exclusions.includes(x)}
                  onClick={() => toggleArr('exclusions', x)}
                  removable={c.exclusions.includes(x)}
                >
                  {x}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section n="05" label="Capacity">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Field label="Monthly deployment target (CAD)">
              <input
                className="input input-num"
                value={c.monthlyTarget.toLocaleString()}
                onChange={(e) =>
                  set({
                    monthlyTarget:
                      +(e.target.value.replace(/[^0-9]/g, '')) || 0,
                  })
                }
              />
            </Field>
            <Field label="Currently available capital (CAD)">
              <input
                className="input input-num"
                value={c.available.toLocaleString()}
                onChange={(e) =>
                  set({
                    available:
                      +(e.target.value.replace(/[^0-9]/g, '')) || 0,
                  })
                }
              />
            </Field>
          </div>
        </Section>

        <Section n="06" label="Speed">
          <span className="label" style={{ display: 'block', marginBottom: 10 }}>
            Typical close time
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['3–5 days', '5–7 days', '7–10 days', '10–14 days', '14–21 days'].map((s) => (
              <Chip key={s} on={c.closeSpeed === s} onClick={() => set({ closeSpeed: s })}>
                {s}
              </Chip>
            ))}
          </div>
        </Section>

        {onComplete && (
          <button className="btn btn-primary btn-lg" onClick={() => onComplete(c)}>
            {ctaLabel ?? 'Continue'}
          </button>
        )}
        {note && (
          <p className="small muted-text" style={{ marginTop: 16 }}>
            {note}
          </p>
        )}
      </div>

      <div style={{ position: 'sticky', top: embedded ? 24 : 88 }}>
        <div
          className="card"
          style={{ overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}
        >
          <div
            style={{ padding: '24px 26px 22px', borderBottom: '1px solid var(--border)' }}
          >
            <div className="eyebrow" style={{ color: 'var(--amber-deep)', marginBottom: 14 }}>
              Live preview
            </div>
            <p className="body" style={{ color: 'var(--slate-deep)', lineHeight: 1.5 }}>
              Based on your criteria, you would have matched
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                margin: '10px 0 4px',
              }}
            >
              <span
                className="tnum"
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 56,
                  fontWeight: 600,
                  color: 'var(--slate-deep)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  transition: 'color 200ms',
                }}
              >
                {matches}
              </span>
              <span className="body muted-text">deals</span>
            </div>
            <p className="small muted-text">in the last 30 days.</p>
          </div>
          <div style={{ padding: '20px 26px' }}>
            <div
              className="micro muted-text"
              style={{
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Sample matches
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sample.map((d) => (
                <div
                  key={d.no}
                  style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#FCFAF5',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <DealNo n={d.no} size={12} />
                    <span
                      className="micro"
                      style={{ color: 'var(--amber-deep)', fontWeight: 600 }}
                    >
                      {d.score} match
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      className="num"
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 20,
                        fontWeight: 600,
                        color: 'var(--slate-deep)',
                      }}
                    >
                      {d.amount}
                    </span>
                    <span className="micro muted-text">
                      {d.city} · {d.ltv}
                    </span>
                  </div>
                  <div className="micro muted-text" style={{ marginTop: 4 }}>
                    {d.asset} · {d.term}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span className="micro muted-text">Est. monthly volume in band</span>
              <span
                className="num micro"
                style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
              >
                {formatMoneyShort(matches * 480000)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  n,
  label,
  meta,
  children,
  style,
}: {
  n: string;
  label: string;
  meta?: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section style={{ marginBottom: 44, ...style }}>
      <SectionDivider n={n} label={label} meta={meta} />
      {children}
    </section>
  );
}

function SliderHeader({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
      <span className="label">{label}</span>
      <span
        className="num small"
        style={{ fontWeight: 600, color: 'var(--slate)' }}
      >
        {value}
      </span>
    </div>
  );
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: on ? 'var(--sage)' : 'var(--border)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
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
  );
}

function DualRange({
  min,
  max,
  step,
  lo,
  hi,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  lo: number;
  hi: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="dualrange">
      <div className="dr-track" />
      <div
        className="dr-fill"
        style={{ left: pct(lo) + '%', right: 100 - pct(hi) + '%' }}
      />
      <input
        className="range-dual"
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        onChange={(e) => onChange(Math.min(+e.target.value, hi - step), hi)}
      />
      <input
        className="range-dual"
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        onChange={(e) => onChange(lo, Math.max(+e.target.value, lo + step))}
      />
    </div>
  );
}
