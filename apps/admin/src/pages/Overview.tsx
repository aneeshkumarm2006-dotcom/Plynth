import {
  SectionDivider,
  StatStrip,
  EmptyState,
  type StatBlockProps,
} from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { formatNumber } from '@plynth/shared/utils';
import {
  adminService,
  type AdminMetrics,
  type TimeSeriesPoint,
} from '@plynth/supabase/services';
import { moneyShortFromCents } from '../lib/format';
import { PageHeader } from '../components/DataTable';

export function Overview() {
  const metrics = useAsync<AdminMetrics>(() => adminService.metrics(), []);
  const signups = useAsync<TimeSeriesPoint[]>(() => adminService.signupSeries(), []);
  const funding = useAsync<TimeSeriesPoint[]>(() => adminService.fundingSeries(), []);

  const m = metrics.data;
  const stats: StatBlockProps[] = m
    ? [
        { value: formatNumber(m.brokers), label: 'Brokers' },
        { value: formatNumber(m.lenders), label: 'Lenders' },
        { value: formatNumber(m.activeDeals), label: 'Active deals' },
        { value: formatNumber(m.liveOffers), label: 'Live offers' },
        { value: moneyShortFromCents(m.fundedVolumeCents), label: 'Funded volume' },
        { value: formatNumber(m.weeklyActiveUsers), label: 'Weekly active users' },
        { value: formatNumber(m.signupsThisWeek), label: 'Signups this week' },
      ]
    : [];

  return (
    <div className="page page-wide">
      <PageHeader title="Overview" lead="Marketplace health at a glance." />

      {metrics.loading && !m ? (
        <div className="skel" style={{ height: 120, borderRadius: 8 }} />
      ) : metrics.error || !m ? (
        <EmptyState title="Metrics unavailable" sub="Could not load marketplace metrics." />
      ) : (
        <StatStrip stats={stats} />
      )}

      <div style={{ marginTop: 48 }}>
        <SectionDivider n="01" label="Signups" />
        <BarChart
          loading={signups.loading}
          error={!!signups.error}
          points={signups.data ?? []}
          format={(v) => formatNumber(v)}
          caption="Signups per week"
        />
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionDivider n="02" label="Funding volume" />
        <BarChart
          loading={funding.loading}
          error={!!funding.error}
          points={funding.data ?? []}
          format={(v) => moneyShortFromCents(v)}
          caption="Funded volume per month"
        />
      </div>
    </div>
  );
}

function BarChart({
  points,
  format,
  caption,
  loading,
  error,
}: {
  points: TimeSeriesPoint[];
  format: (v: number) => string;
  caption: string;
  loading: boolean;
  error: boolean;
}) {
  if (loading && points.length === 0) {
    return <div className="skel" style={{ height: 240, borderRadius: 8 }} />;
  }
  if (error || points.length === 0) {
    return <EmptyState title="No data" sub="Nothing to chart for this period yet." />;
  }

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="card" style={{ padding: '28px 28px 20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 18,
          height: 200,
        }}
      >
        {points.map((p) => {
          const pct = Math.max(2, Math.round((p.value / max) * 100));
          return (
            <div
              key={p.bucket}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <span
                className="num"
                style={{ fontSize: 12, color: 'var(--slate-deep)', fontWeight: 600 }}
              >
                {format(p.value)}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 64,
                  height: `${pct}%`,
                  background: 'var(--slate)',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.78,
                }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
        {points.map((p) => (
          <div
            key={p.bucket}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--text-2)',
            }}
          >
            {p.bucket}
          </div>
        ))}
      </div>
      <p className="micro muted-text" style={{ marginTop: 16, textAlign: 'center' }}>
        {caption}
      </p>
    </div>
  );
}
