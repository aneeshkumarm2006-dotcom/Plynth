import { DefList, EmptyState } from '@plynth/shared/ui';
import { useAsync } from '@plynth/shared/hooks';
import { lendersService, type LenderDirectoryEntry } from '@plynth/supabase/services';

export function Lenders() {
  const { data, loading } = useAsync<LenderDirectoryEntry[]>(
    () => lendersService.listDirectory(),
    []
  );
  const lenders = data ?? [];

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Lenders</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          {lenders.length} subscribed lenders match your typical deals. Criteria
          shown; contact is brokered through Plynth.
        </p>
      </div>
      {loading && lenders.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="skel" style={{ height: 220, borderRadius: 8 }} />
          <div className="skel" style={{ height: 220, borderRadius: 8 }} />
        </div>
      ) : lenders.length === 0 ? (
        <EmptyState
          title="No lenders to show yet"
          sub="As lenders join Plynth and publish their criteria, they appear here."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {lenders.map((l) => (
            <div key={l.id} className="card card-pad card-hover">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 className="h4" style={{ marginBottom: 2 }}>
                    {l.name}
                  </h3>
                  <div className="micro muted-text">
                    {l.type} · {l.region}
                  </div>
                </div>
                <span
                  className="pill pill-active"
                  style={{ background: 'var(--slate-bg)' }}
                >
                  Subscribed
                </span>
              </div>
              <DefList
                items={[
                  ['Asset classes', l.assets],
                  ['Max LTV', l.ltv],
                  ['Deal size', l.size],
                  ['Typical close', l.speed],
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
