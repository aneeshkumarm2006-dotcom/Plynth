import { supabase, hasSupabase } from '../client';

export interface AuditLogRow {
  id: number;
  user_id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export const auditService = {
  async listForUser(userId: string, limit = 200): Promise<AuditLogRow[]> {
    if (!hasSupabase || !supabase) {
      // Sample mock audit entries for the demo experience.
      return [
        {
          id: 1,
          user_id: userId,
          action: 'deal.created',
          entity_type: 'deal',
          entity_id: '0247',
          changes: { city: 'Toronto, ON', amount_cents: 42_500_000 },
          ip_address: '192.0.2.10',
          user_agent: 'Chrome 126',
          created_at: new Date(Date.now() - 86_400_000 * 3).toISOString(),
        },
        {
          id: 2,
          user_id: userId,
          action: 'offer.created',
          entity_type: 'offer',
          entity_id: '0247-A',
          changes: { rate: 9.25 },
          ip_address: '192.0.2.10',
          user_agent: 'Chrome 126',
          created_at: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        },
        {
          id: 3,
          user_id: userId,
          action: 'deal.status_changed',
          entity_type: 'deal',
          entity_id: '0247',
          changes: { from: 'active', to: 'negotiating' },
          ip_address: '192.0.2.10',
          user_agent: 'Chrome 126',
          created_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
      ];
    }
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLogRow[];
  },

  // Convert log entries to CSV — used by the export button.
  toCSV(rows: AuditLogRow[]): string {
    const header = [
      'id',
      'created_at',
      'action',
      'entity_type',
      'entity_id',
      'ip_address',
      'user_agent',
      'changes',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      const values = [
        r.id,
        r.created_at,
        r.action,
        r.entity_type ?? '',
        r.entity_id ?? '',
        r.ip_address ?? '',
        (r.user_agent ?? '').replace(/,/g, ' '),
        JSON.stringify(r.changes ?? {}).replace(/"/g, '""'),
      ];
      lines.push(
        values
          .map((v) => {
            const s = String(v);
            return s.includes(',') ? `"${s}"` : s;
          })
          .join(',')
      );
    }
    return lines.join('\n');
  },
};
