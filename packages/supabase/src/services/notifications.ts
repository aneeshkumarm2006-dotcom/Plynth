import { supabase, hasSupabase } from '../client';

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

export const notificationsService = {
  async list(userId: string, limit = 50): Promise<NotificationRow[]> {
    if (!hasSupabase || !supabase) return [];
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
    if (!hasSupabase || !supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllRead(userId: string): Promise<void> {
    if (!hasSupabase || !supabase) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  subscribe(userId: string, onInsert: (n: NotificationRow) => void): () => void {
    if (!hasSupabase || !supabase) return () => {};
    const channel = supabase
      .channel(`notifications:${userId}`)
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
