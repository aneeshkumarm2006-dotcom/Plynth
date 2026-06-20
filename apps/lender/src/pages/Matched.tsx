import { useEffect, useState } from 'react';
import { Chip, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { useAuth } from '@plynth/supabase/auth';
import {
  matchedService,
  notificationsService,
  type MatchedDeal,
} from '@plynth/supabase/services';
import { MatchCard } from '../components/MatchCard';
import { useToastFire } from '../components/ToastContext';
import { matchedToCard, filterAndSortMatched, type MatchedFilters } from '../lib/present';

const ASSET_FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['Residential 1st', 'Res 1st'],
  ['Residential 2nd', 'Res 2nd'],
  ['Commercial', 'Commercial'],
];

const SIZE_OPTIONS: Array<[string, string]> = [
  ['all', 'Any size'],
  ['lt500', 'Under $500K'],
  ['500to1m', '$500K – $1M'],
  ['1mto2m', '$1M – $2M'],
  ['gt2m', 'Over $2M'],
];

const SCORE_OPTIONS: Array<[number, string]> = [
  [0, 'Any match'],
  [70, '70+ match'],
  [80, '80+ match'],
  [90, '90+ match'],
];

const selectStyle = { width: 'auto', padding: '7px 30px 7px 12px', fontSize: 13 } as const;

export function Matched() {
  const [sort, setSort] = useState<MatchedFilters['sort']>('best');
  const [asset, setAsset] = useState('all');
  const [province, setProvince] = useState('all');
  const [size, setSize] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const toast = useToastFire();
  const { profile } = useAuth();

  const { data, loading, refresh } = useAsync<MatchedDeal[]>(
    () => matchedService.listForLender(profile?.id ?? ''),
    [profile?.id]
  );

  // Refresh the matched list when a realtime notification arrives. In mock
  // mode `subscribe` is a no-op, so this is inert without Supabase wired.
  useEffect(() => {
    if (!profile?.id) return;
    const unsubscribe = notificationsService.subscribe(profile.id, (n) => {
      if (n.notification_type === 'new_match') refresh();
    });
    return unsubscribe;
  }, [profile?.id, refresh]);

  // Provinces actually present in the feed, for a relevant dropdown.
  const provinces = Array.from(new Set((data ?? []).map((d) => d.province).filter(Boolean))).sort();
  const rows = filterAndSortMatched(data ?? [], { asset, province, size, minScore, sort });

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Matched deals</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          Deals scored against your criteria, presented one at a time.
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ASSET_FILTERS.map(([id, lbl]) => (
            <Chip key={id} on={asset === id} onClick={() => setAsset(id)}>
              {lbl}
            </Chip>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select className="select" style={selectStyle} value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="all">All provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="select" style={selectStyle} value={size} onChange={(e) => setSize(e.target.value)}>
            {SIZE_OPTIONS.map(([id, lbl]) => (
              <option key={id} value={id}>
                {lbl}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={selectStyle}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          >
            {SCORE_OPTIONS.map(([v, lbl]) => (
              <option key={v} value={v}>
                {lbl}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={selectStyle}
            value={sort}
            onChange={(e) => setSort(e.target.value as MatchedFilters['sort'])}
          >
            <option value="best">Best match</option>
            <option value="newest">Newest</option>
            <option value="expiring">Expiring soon</option>
          </select>
        </div>
      </div>
      <div className="micro muted-text" style={{ marginBottom: 20 }}>
        {rows.length} {rows.length === 1 ? 'deal' : 'deals'}
        {data && rows.length !== data.length ? ` of ${data.length}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading && rows.length === 0 ? (
          <>
            <div className="skel" style={{ height: 200, borderRadius: 8 }} />
            <div className="skel" style={{ height: 200, borderRadius: 8 }} />
          </>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No deals match these filters"
            sub="Widen the filters above, or adjust your criteria to see more deals."
          />
        ) : (
          rows.map((d) => (
            <MatchCard
              key={d.deal_id}
              d={matchedToCard(d)}
              dealId={d.deal_id}
              lenderId={profile?.id}
              initialAct={
                d.interest_status === 'passed'
                  ? 'pass'
                  : d.interest_status === 'interested'
                    ? 'interested'
                    : null
              }
              onToast={toast}
            />
          ))
        )}
      </div>
    </div>
  );
}
