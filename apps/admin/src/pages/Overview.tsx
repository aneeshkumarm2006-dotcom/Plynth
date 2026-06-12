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
      <div className="admin-chart">
        {points.map((p) => {
          // Reserve headroom so the tallest bar never crowds its value label;
          // a value of 0 still shows a 2% sliver so the column reads as present.
          const pct = p.value === 0 ? 2 : Math.max(4, Math.round((p.value / max) * 92));
          return (
            <div key={p.bucket} className="admin-chart-col">
              <span className="admin-chart-value">{format(p.value)}</span>
              <div
                className="admin-chart-bar"
                style={{ height: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
      <div className="admin-chart-axis">
        {points.map((p) => (
          <div key={p.bucket} className="admin-chart-tick">
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
