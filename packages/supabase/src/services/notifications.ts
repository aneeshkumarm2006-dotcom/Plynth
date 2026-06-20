import { supabase, hasSupabase } from '../client';
import { MOCK_NOTIFICATIONS } from '@plynth/shared/mock';

// Channels must have unique topics: supabase-js keys channels by name and
// throws if you add `postgres_changes` callbacks to a topic that's already
// been subscribed. Multiple call sites (bell, dashboard, matched feed) listen
// for the same user's notifications, and StrictMode double-mounts effects in
// dev — so every subscribe() gets its own channel name via this counter.
let channelSeq = 0;

export interface NotificationRow {
  id: string;
  user_id: string;
  notification_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  title: string;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}

// In mock mode the inbox and the bell share one in-memory store seeded from
// the fixture, so marking something read in the page is reflected in the bell
// (and survives navigation within the session). Seeded lazily once.
let mockStore: NotificationRow[] | null = null;
function mockNotifications(userId: string): NotificationRow[] {
  if (!mockStore) {
    mockStore = MOCK_NOTIFICATIONS.map((n, i) => ({
      id: `mock-n-${i}`,
      user_id: userId,
      notification_type: n.notification_type,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: new Date(Date.now() - n.hoursAgo * 3600_000).toISOString(),
    }));
  }
  return mockStore;
}

export const notificationsService = {
  async list(userId: string, limit = 50): Promise<NotificationRow[]> {
    if (!hasSupabase || !supabase) return mockNotifications(userId).slice(0, limit);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as NotificationRow[];
  },

  async markRead(id: string): Promise<void> {
    if (!hasSupabase || !supabase) {
      if (mockStore) mockStore = mockStore.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      return;
    }
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllRead(userId: string): Promise<void> {
    if (!hasSupabase || !supabase) {
      if (mockStore) mockStore = mockStore.map((n) => ({ ...n, is_read: true }));
      return;
    }
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  subscribe(userId: string, onInsert: (n: NotificationRow) => void): () => void {
    if (!hasSupabase || !supabase) return () => {};
    const channel = supabase
      .channel(`notifications:${userId}:${++channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onInsert(payload.new as NotificationRow)
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  },
};
