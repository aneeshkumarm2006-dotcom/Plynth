import { supabase, hasSupabase } from '../client';

// PIPEDA data-subject tools (migration 0017). Both are backed by
// SECURITY DEFINER RPCs scoped to the caller's own auth.uid().
export const privacyService = {
  // Right of access / portability: the caller's own data as a JSON object
  // (profile, deals, offers, fundings, notifications, borrower details).
  async exportMyData(): Promise<unknown> {
    if (!hasSupabase || !supabase) {
      return { exported_at: new Date().toISOString(), note: 'Demo mode — no data to export.' };
    }
    const { data, error } = await supabase.rpc('export_my_data');
    if (error) throw error;
    return data;
  },

  // Marks the caller's account for deletion. Per the current product
  // decision the data is RETAINED in the database; hard deletion is
  // handled later. Records an audit entry.
  async requestDeletion(): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.rpc('request_account_deletion');
    if (error) throw error;
  },
};
