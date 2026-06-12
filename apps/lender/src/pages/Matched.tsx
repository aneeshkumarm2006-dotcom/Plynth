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
import { matchedToCard } from '../lib/present';

const ASSET_FILTERS: Array<[string, string]> = [
  ['all', 'All'],
  ['Residential 1st', 'Res 1st'],
  ['Residential 2nd', 'Res 2nd'],
  ['Commercial', 'Commercial'],
];

export function Matched() {
  const [sort, setSort] = useState<'best' | 'newest' | 'expiring'>('best');
  const [asset, setAsset] = useState('all');
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

  let rows = [...(data ?? [])];
  if (asset !== 'all') rows = rows.filter((d) => d.asset_class === asset);
  if (sort === 'best') rows.sort((a, b) => b.match_score - a.match_score);
  else if (sort === 'newest')
    rows.sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime());
  // 'expiring' has no backing field yet — left in source order.

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
          marginBottom: 24,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="micro muted-text"
            style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Sort
          </span>
          <select
            className="select"
            style={{ width: 'auto', padding: '7px 32px 7px 12px', fontSize: 13 }}
            value={sort}
            onChange={(e) => setSort(e.target.value as 'best' | 'newest' | 'expiring')}
          >
            <option value="best">Best match</option>
            <option value="newest">Newest</option>
            <option value="expiring">Expiring soon</option>
          </select>
        </div>
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
            sub="Try widening your asset-class filter, or adjust your criteria to see more deals."
          />
        ) : (
          rows.map((d) => (
            <MatchCard key={d.deal_id} d={matchedToCard(d)} dealId={d.deal_id} onToast={toast} />
          ))
        )}
      </div>
    </div>
  );
}
