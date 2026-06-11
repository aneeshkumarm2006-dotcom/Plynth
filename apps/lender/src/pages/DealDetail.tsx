import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DealNo,
  DefList,
  Field,
  FigurePlaceholder,
  MatchBar,
  SectionDivider,
} from '@plynth/shared/ui';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { useToastFire } from '../components/ToastContext';

export function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const toast = useToastFire();
  const f = LENDER_MOCK.focus;

  return (
    <div className="page page-wide">
      <button
        className="btn btn-tertiary btn-sm"
        style={{ marginBottom: 16, paddingLeft: 0 }}
        onClick={() => navigate('/matched')}
      >
        ‹ Back to matched deals
      </button>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <DealNo n={dealId || f.no} size={15} />
            <span className="pill pill-matched">Matched</span>
            <MatchBar score={f.score} width={90} />
          </div>
          <h1 className="h1">
            {f.amount}{' '}
            <span
              style={{
                fontSize: 18,
                color: 'var(--text-2)',
                fontFamily: 'var(--sans)',
                fontWeight: 500,
              }}
            >
              CAD
            </span>
          </h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
            {f.position} · {f.neighbourhood}, {f.city}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toast({ title: 'Marked interested' })}
          >
            Interested
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => toast({ title: 'Passed on this deal' })}
          >
            Pass
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 40,
          marginTop: 36,
        }}
      >
        <div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 44 }}
          >
            <div>
              <SectionDivider n="01" label="Deal facts" />
              <DefList
                items={[
                  ['Property type', 'Detached, residential'],
                  ['Loan amount', f.amount + ' CAD'],
                  ['Position', f.position],
                  ['LTV', f.ltv],
                  ['Appraised value', '$590,000 CAD'],
                  ['Term', f.term],
                  ['Beacon band', '680–720'],
                  ['Purpose', 'Refinance — consolidation'],
                ]}
              />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ lineHeight: 1.65 }}>
                A first mortgage refinance on an owner-occupied detached home in East York.
                Self-employed borrower with two years of established income, consolidating
                higher-interest debt.
              </p>
              <p className="body" style={{ lineHeight: 1.65, marginTop: 14 }}>
                At 72% LTV against a fresh appraisal, the position sits comfortably inside
                your residential band. Exit is via institutional refinance at term.
              </p>
              <div style={{ marginTop: 18 }}>
                <SectionDivider n="03" label="Documents" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Appraisal — 142 Westbrook Ave',
                    'MLS listing',
                    'Notice of Assessment 2025',
                  ].map((doc) => (
                    <div
                      key={doc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <FigurePlaceholder
                        label="PDF"
                        style={{ width: 30, height: 36, borderRadius: 3 }}
                      />
                      <span className="small" style={{ flex: 1 }}>
                        {doc}
                      </span>
                      <span className="micro muted-text">View</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionDivider
            n="04"
            label="Comparable deals you've funded"
            meta="Only on Plynth"
          />
          <div className="card" style={{ overflow: 'hidden', marginBottom: 44 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Deal', 'Location', 'Amount', 'LTV', 'Rate', 'Closed'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i >= 2 && i <= 4 ? 'right' : 'left',
                        padding: '12px 16px',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LENDER_MOCK.comparables.map((d, i) => (
                  <tr
                    key={d.no}
                    style={{
                      borderBottom:
                        i < LENDER_MOCK.comparables.length - 1
                          ? '1px solid var(--border)'
                          : 'none',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span className="deal-no" style={{ fontSize: 13 }}>
                        № {d.no}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{d.city}</td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: 'var(--slate-deep)',
                      }}
                    >
                      {d.amount}
                    </td>
                    <td className="num" style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {d.ltv}
                    </td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        color: 'var(--amber-deep)',
                        fontWeight: 600,
                      }}
                    >
                      {d.rate}
                    </td>
                    <td
                      className="num"
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontSize: 13,
                        color: 'var(--text-2)',
                      }}
                    >
                      {d.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OfferComposer onDone={() => navigate('/pipeline')} />
        </div>

        <div>
          <SectionDivider n="—" label="Why this matched" />
          <div className="card card-pad" style={{ background: '#FCFAF5' }}>
            {(
              [
                ['Asset class', 'Residential 1st — in criteria'],
                ['Geography', 'Toronto, ON — in criteria'],
                ['LTV', '72% — within 75% limit'],
                ['Loan size', '$425K — within band'],
                ['Beacon', '680–720 — above 640 min'],
              ] as Array<[string, string]>
            ).map(([l, v], i, arr) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '9px 0',
                  borderBottom:
                    i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{ color: 'var(--sage)', fontWeight: 700, fontSize: 13 }}
                >
                  ✓
                </span>
                <div>
                  <div
                    className="small"
                    style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                  >
                    {l}
                  </div>
                  <div className="micro muted-text">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferComposer({ onDone }: { onDone: () => void }) {
  const [rate, setRate] = useState('9.25');
  const toast = useToastFire();

  return (
    <div className="card card-pad" style={{ borderColor: 'var(--amber)', padding: 32 }}>
      <SectionDivider n="05" label="Compose your offer" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 18 }}>
        <Field label="Interest rate (%)">
          <input
            className="input input-num"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
        <Field label="Lender fee (%)">
          <input className="input input-num" defaultValue="2.0" />
        </Field>
        <Field label="Broker fee (%)">
          <input className="input input-num" defaultValue="1.0" />
        </Field>
        <Field label="Term (months)">
          <select className="select">
            <option>12</option>
            <option>18</option>
            <option>24</option>
          </select>
        </Field>
        <Field label="Max LTV (%)">
          <input className="input input-num" defaultValue="72.0" />
        </Field>
        <Field label="Offer expires">
          <select className="select">
            <option>3 days</option>
            <option>5 days</option>
            <option>7 days</option>
          </select>
        </Field>
      </div>
      <Field label="Conditions">
        <input
          className="input"
          defaultValue="Full appraisal, fire insurance, title insurance"
        />
      </Field>
      <Field label="Note to broker (optional)">
        <textarea
          className="input"
          rows={2}
          placeholder="Add context for the broker…"
        />
      </Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            toast({
              title: 'Offer submitted at ' + rate + '%',
              sub: "The broker has been notified. You'll see their response here.",
            });
            onDone();
          }}
        >
          Submit offer
        </button>
        <button className="btn btn-ghost">Save draft</button>
      </div>
    </div>
  );
}
