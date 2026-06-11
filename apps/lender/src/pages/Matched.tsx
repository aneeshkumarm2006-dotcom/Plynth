import { useState } from 'react';
import { Chip } from '@plynth/shared/ui';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { MatchCard } from '../components/MatchCard';
import { useToastFire } from '../components/ToastContext';

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

  let rows = [...LENDER_MOCK.matched];
  if (asset !== 'all') rows = rows.filter((d) => d.asset === asset);
  if (sort === 'best') rows.sort((a, b) => b.score - a.score);
  // 'newest' already in data order, 'expiring' no real data — left as is.

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
        {rows.map((d) => (
          <MatchCard key={d.no} d={d} onToast={toast} />
        ))}
      </div>
    </div>
  );
}
