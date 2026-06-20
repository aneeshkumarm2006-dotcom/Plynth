import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@plynth/shared/ui';
import { useNotifications } from '@plynth/shared/hooks';
import { timeAgo } from '@plynth/shared/utils';
import { useAuth } from '@plynth/supabase/auth';

export function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { items, unread, loading, markRead, markAllRead } = useNotifications(profile?.id);

  const open = (entityType?: string | null, entityId?: string | null, id?: string) => {
    if (id) void markRead(id);
    if (entityId && (entityType === 'deal' || entityType === 'offer')) {
      navigate(`/deals/${entityId}`);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 28,
        }}
      >
        <div>
          <h1 className="h1">Notifications</h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
            {unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-tertiary btn-sm" onClick={() => markAllRead()}>
            Mark all read
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="skel" style={{ height: 280, borderRadius: 8 }} />
      ) : items.length === 0 ? (
        <EmptyState
          title="All caught up"
          sub="New offers, counters, and funded deals will show up here."
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {items.map((n, i) => (
            <div
              key={n.id}
              onClick={() => open(n.entity_type, n.entity_id, n.id)}
              style={{
                display: 'flex',
                gap: 14,
                padding: '16px 20px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                background: n.is_read ? 'transparent' : '#FCFAF5',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'rgba(59,84,122,0.05)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = n.is_read
                  ? 'transparent'
                  : '#FCFAF5')
              }
            >
              <span
                style={{
                  marginTop: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: n.is_read ? 'var(--border)' : 'var(--amber)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="small"
                  style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                >
                  {n.title}
                </div>
                {n.message && (
                  <div className="small muted-text" style={{ marginTop: 2 }}>
                    {n.message}
                  </div>
                )}
                <div className="micro muted-text" style={{ marginTop: 6 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
              {n.entity_id && (
                <span className="micro muted-text" style={{ alignSelf: 'center' }}>
                  View ›
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
