import { useEffect, useState } from 'react';
import {
  notificationsService,
  type NotificationRow,
} from '@plynth/supabase/services';

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    notificationsService.list(userId).then((rows) => {
      if (alive) {
        setItems(rows);
        setLoading(false);
      }
    });
    const unsub = notificationsService.subscribe(userId, (n) => {
      setItems((prev) => [n, ...prev]);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [userId]);

  const unread = items.filter((n) => !n.is_read).length;

  return {
    items,
    unread,
    loading,
    markRead: async (id: string) => {
      await notificationsService.markRead(id);
      setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    },
    markAllRead: async () => {
      if (!userId) return;
      await notificationsService.markAllRead(userId);
      setItems((p) => p.map((n) => ({ ...n, is_read: true })));
    },
  };
}
