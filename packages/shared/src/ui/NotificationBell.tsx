import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../hooks';
import { timeAgo } from '../utils';

export function NotificationBell({
  userId,
  onOpenEntity,
}: {
  userId: string | undefined;
  onOpenEntity?: (entityType: string, entityId: string) => void;
}) {
  const { items, unread, markRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 6,
          position: 'relative',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.5a4 4 0 0 0-4 4v3l-1.5 2.5h11L14 9.5v-3a4 4 0 0 0-4-4Z"
            stroke="#1F2D44"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M8 14a2 2 0 0 0 4 0"
            stroke="#1F2D44"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'var(--amber)',
              color: 'var(--slate-deep)',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 8,
              padding: '1px 5px',
              minWidth: 14,
              textAlign: 'center',
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card fade-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 340,
            maxHeight: 460,
            overflow: 'auto',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 60,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              className="small"
              style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
            >
              Notifications
            </span>
            {unread > 0 && (
              <button
                className="btn btn-tertiary btn-sm"
                style={{ padding: 0 }}
                onClick={() => markAllRead()}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="empty" style={{ padding: '40px 16px' }}>
              <div className="em-title" style={{ fontSize: 16 }}>All caught up</div>
              <div className="em-sub">You'll see new activity here.</div>
            </div>
          ) : (
            items.slice(0, 30).map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.entity_type && n.entity_id) {
                    onOpenEntity?.(n.entity_type, n.entity_id);
                    setOpen(false);
                  }
                }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
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
                <div
                  className="small"
                  style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                >
                  {n.title}
                </div>
                {n.message && (
                  <div className="micro muted-text" style={{ marginTop: 2 }}>
                    {n.message}
                  </div>
                )}
                <div className="micro muted-text" style={{ marginTop: 4 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
