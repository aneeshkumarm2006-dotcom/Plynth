import { supabase, hasSupabase } from '../client';
import { ADMIN_MOCK } from '@plynth/shared/mock';

// ============ Types ============

export interface AdminMetrics {
  brokers: number;
  lenders: number;
  signupsThisWeek: number;
  activeDeals: number;
  liveOffers: number;
  fundings: number;
  fundedVolumeCents: number;
  weeklyActiveUsers: number;
}

export interface AdminUserRow {
  id: string;
  role: 'broker' | 'lender' | 'admin';
  name: string;
  firm: string;
  email: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  lastSignInAt: string | null;
  createdAt: string;
  dealsCount: number;
  offersCount: number;
}

export interface AdminActivityRow {
  id: number;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface TimeSeriesPoint {
  bucket: string;
  value: number;
}

export interface AdminDealRow {
  deal_number: string;
  brokerFirm: string;
  city: string;
  amount_cents: number;
  ltv: number;
  status: string;
  offers: number;
  created_at: string;
}

export interface AdminOfferRow {
  deal_number: string;
  lenderFirm: string;
  rate: number;
  lenderFee: number;
  status: string;
  expires_at: string;
  created_at: string;
}

// ============ Helpers ============

function actorName(profile: any): string {
  if (!profile) return 'Unknown';
  return (
    profile.firm_name ||
    profile.brokerage_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

// Channels must have unique topics (supabase-js throws on a re-subscribed topic).
let channelSeq = 0;

// ============ Service ============

export const adminService = {
  async metrics(): Promise<AdminMetrics> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.metrics;
    const { data, error } = await supabase.rpc('admin_metrics');
    if (error) throw error;
    return data as AdminMetrics;
  },

  async signupSeries(days = 35): Promise<TimeSeriesPoint[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.signupSeries;
    const { data, error } = await supabase.rpc('admin_signup_series', { p_days: days });
    if (error) throw error;
    return (data ?? []) as TimeSeriesPoint[];
  },

  async fundingSeries(months = 6): Promise<TimeSeriesPoint[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.fundingSeries;
    const { data, error } = await supabase.rpc('admin_funding_series', { p_months: months });
    if (error) throw error;
    return (data ?? []) as TimeSeriesPoint[];
  },

  async listUsers(): Promise<AdminUserRow[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.users;
    const { data, error } = await supabase.rpc('admin_user_directory');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      role: r.role,
      name: r.name ?? '—',
      firm: r.firm ?? '—',
      email: r.email,
      isVerified: r.is_verified,
      verificationStatus: r.verification_status,
      lastSignInAt: r.last_sign_in_at,
      createdAt: r.created_at,
      dealsCount: r.deals_count ?? 0,
      offersCount: r.offers_count ?? 0,
    }));
  },

  async activityFeed(limit = 100): Promise<AdminActivityRow[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.activity;
    const { data, error } = await supabase
      .from('audit_log')
      .select(
        'id, created_at, user_id, action, entity_type, entity_id, ip_address, user_agent, ' +
          'user_profiles ( firm_name, brokerage_name, first_name, last_name )'
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      actorId: r.user_id,
      actorName: actorName(r.user_profiles),
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      ip: r.ip_address,
      userAgent: r.user_agent,
    }));
  },

  async userActivity(userId: string, limit = 50): Promise<AdminActivityRow[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.activity.filter((a) => a.actorId === userId);
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, created_at, user_id, action, entity_type, entity_id, ip_address, user_agent')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      actorId: r.user_id,
      actorName: '',
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      ip: r.ip_address,
      userAgent: r.user_agent,
    }));
  },

  subscribeActivity(onInsert: (row: AdminActivityRow) => void): () => void {
    if (!hasSupabase || !supabase) return () => {};
    const channel = supabase
      .channel(`admin-activity:${++channelSeq}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        (payload) => {
          const r: any = payload.new;
          onInsert({
            id: r.id,
            createdAt: r.created_at,
            actorId: r.user_id,
            actorName: '',
            action: r.action,
            entityType: r.entity_type,
            entityId: r.entity_id,
            ip: r.ip_address,
            userAgent: r.user_agent,
          });
        }
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  },

  async listDeals(filters?: { status?: string; province?: string }): Promise<AdminDealRow[]> {
    if (!hasSupabase || !supabase) {
      let rows = ADMIN_MOCK.deals;
      if (filters?.status) rows = rows.filter((d) => d.status === filters.status);
      return rows;
    }
    let q = supabase
      .from('deals')
      .select(
        'deal_number, city, province, loan_amount_cents, ltv, status, created_at, ' +
          'user_profiles!deals_broker_id_fkey ( firm_name, brokerage_name ), offers(count)'
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.province) q = q.eq('province', filters.province);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      deal_number: r.deal_number,
      brokerFirm: actorName(r.user_profiles),
      city: `${r.city}, ${r.province}`,
      amount_cents: r.loan_amount_cents,
      ltv: r.ltv,
      status: r.status,
      offers: Array.isArray(r.offers) ? (r.offers[0]?.count ?? 0) : 0,
      created_at: r.created_at,
    }));
  },

  async listOffers(filters?: { status?: string }): Promise<AdminOfferRow[]> {
    if (!hasSupabase || !supabase) {
      let rows = ADMIN_MOCK.offers;
      if (filters?.status) rows = rows.filter((o) => o.status === filters.status);
      return rows;
    }
    let q = supabase
      .from('offers')
      .select(
        'rate_percent, lender_fee_percent, status, expires_at, created_at, ' +
          'deals!inner ( deal_number ), user_profiles!offers_lender_id_fkey ( firm_name )'
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      deal_number: r.deals?.deal_number ?? '—',
      lenderFirm: r.user_profiles?.firm_name ?? '—',
      rate: r.rate_percent,
      lenderFee: r.lender_fee_percent ?? 0,
      status: r.status,
      expires_at: r.expires_at,
      created_at: r.created_at,
    }));
  },

  async setVerification(userId: string, status: 'approved' | 'rejected'): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.rpc('admin_set_verification', {
      target: userId,
      new_status: status,
    });
    if (error) throw error;
  },
};
