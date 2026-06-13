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

// ---- Observability (Health / User 360 / Funnel / Matching) ----

export type EventSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface HealthByApp {
  app: string;
  errors: number;
  events: number;
}

export interface HealthFingerprint {
  fingerprint: string;
  name: string | null;
  message: string;
  app: string;
  count: number;
  lastSeen: string;
}

export interface HealthSummary {
  windowMin: number;
  errorCount: number;
  fatalCount: number;
  eventCount: number;
  byApp: HealthByApp[];
  topFingerprints: HealthFingerprint[];
}

export interface ErrorRow {
  id: number;
  createdAt: string;
  app: string;
  severity: EventSeverity;
  source: string;
  name: string | null;
  message: string;
  route: string | null;
  userId: string | null;
  fingerprint: string | null;
}

export interface User360Profile {
  id: string;
  role: 'broker' | 'lender' | 'admin';
  email: string;
  name: string | null;
  firm: string | null;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
}

export interface User360 {
  profile: User360Profile | null;
  deals: Array<{
    deal_number: string;
    city: string;
    province: string;
    amount_cents: number;
    ltv: number;
    status: string;
    created_at: string;
  }>;
  offers: Array<{
    deal_number: string;
    rate: number;
    lender_fee: number | null;
    status: string;
    expires_at: string | null;
    created_at: string;
  }>;
  notifications: Array<{
    notification_type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>;
  loginHistory: Array<{ created_at: string; ip: string | null; user_agent: string | null }>;
  audit: Array<{
    created_at: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    ip: string | null;
  }>;
  recentErrors: Array<{
    created_at: string;
    app: string;
    severity: EventSeverity;
    source: string;
    name: string | null;
    message: string;
    route: string | null;
  }>;
}

export interface FunnelData {
  days: number;
  stages: Array<{ stage: string; count: number }>;
  leakage: { declined: number; expired: number };
}

export interface MatchingHealth {
  days: number;
  avgMatchScore: number | null;
  avgMatchesPerDeal: number | null;
  zeroMatch: Array<{
    deal_number: string;
    city: string;
    province: string;
    status: string;
    created_at: string;
  }>;
  lowMatch: Array<{ deal_number: string; city: string; bestScore: number; matchCount: number }>;
}

// ---- Alerts ----

export type AlertKind =
  | 'error_rate_spike'
  | 'signups_drop'
  | 'deal_stuck'
  | 'offers_expiring_unhandled'
  | 'zero_match_rate';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertRule {
  id: string;
  kind: AlertKind;
  name: string;
  isEnabled: boolean;
  severity: AlertSeverity;
  params: Record<string, unknown>;
  cooldownMin: number;
  lastEvaluatedAt: string | null;
  lastFiredAt: string | null;
  createdAt: string;
}

export interface AlertRuleInput {
  id?: string | null;
  kind: AlertKind;
  name: string;
  severity: AlertSeverity;
  params: Record<string, unknown>;
  cooldownMin: number;
  isEnabled: boolean;
}

export interface AlertEvent {
  id: number;
  ruleId: string;
  ruleName: string;
  kind: AlertKind;
  severity: AlertSeverity;
  status: AlertStatus;
  summary: string;
  details: Record<string, unknown> | null;
  firedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
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

  // ---- System Health ----

  async healthSummary(windowMin = 60): Promise<HealthSummary> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.health as HealthSummary;
    const { data, error } = await supabase.rpc('admin_health_summary', { p_window_min: windowMin });
    if (error) throw error;
    return data as HealthSummary;
  },

  async errorStream(
    filters?: { app?: string; severity?: string; userId?: string },
    limit = 100
  ): Promise<ErrorRow[]> {
    if (!hasSupabase || !supabase) {
      let rows = ADMIN_MOCK.errors as ErrorRow[];
      if (filters?.app) rows = rows.filter((r) => r.app === filters.app);
      if (filters?.severity) rows = rows.filter((r) => r.severity === filters.severity);
      if (filters?.userId) rows = rows.filter((r) => r.userId === filters.userId);
      return rows;
    }
    const { data, error } = await supabase.rpc('admin_error_stream', {
      p_app: filters?.app ?? null,
      p_severity: filters?.severity ?? null,
      p_user: filters?.userId ?? null,
      p_limit: limit,
    });
    if (error) throw error;
    return (data ?? []).map(mapErrorRow);
  },

  subscribeErrors(onInsert: (row: ErrorRow) => void): () => void {
    if (!hasSupabase || !supabase) return () => {};
    const channel = supabase
      .channel(`admin-errors:${++channelSeq}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_events' },
        (payload) => onInsert(mapErrorRow(payload.new as any))
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  },

  // ---- User 360 ----

  async userDetail(userId: string): Promise<User360> {
    if (!hasSupabase || !supabase) {
      const mock = ADMIN_MOCK.user360 as Record<string, User360>;
      return mock[userId] ?? buildEmptyUser360(userId);
    }
    const { data, error } = await supabase.rpc('admin_user_360', { p_user: userId });
    if (error) throw error;
    return data as User360;
  },

  // ---- Funnel + Matching ----

  async funnel(days = 30): Promise<FunnelData> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.funnel as FunnelData;
    const { data, error } = await supabase.rpc('admin_funnel', { p_days: days });
    if (error) throw error;
    return data as FunnelData;
  },

  async matchingHealth(days = 30): Promise<MatchingHealth> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.matching as MatchingHealth;
    const { data, error } = await supabase.rpc('admin_matching_health', { p_days: days });
    if (error) throw error;
    return data as MatchingHealth;
  },

  // ---- Alerts ----

  async listAlertRules(): Promise<AlertRule[]> {
    if (!hasSupabase || !supabase) return ADMIN_MOCK.alertRules as AlertRule[];
    const { data, error } = await supabase.rpc('admin_list_alert_rules');
    if (error) throw error;
    return (data ?? []).map(mapAlertRule);
  },

  async upsertAlertRule(rule: AlertRuleInput): Promise<string> {
    if (!hasSupabase || !supabase) return rule.id ?? 'mock-rule';
    const { data, error } = await supabase.rpc('admin_upsert_alert_rule', {
      p_id: rule.id ?? null,
      p_kind: rule.kind,
      p_name: rule.name,
      p_severity: rule.severity,
      p_params: rule.params,
      p_cooldown_min: rule.cooldownMin,
      p_is_enabled: rule.isEnabled,
    });
    if (error) throw error;
    return data as string;
  },

  async setAlertRuleEnabled(id: string, enabled: boolean): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.rpc('admin_set_alert_rule_enabled', {
      p_id: id,
      p_enabled: enabled,
    });
    if (error) throw error;
  },

  async listAlertEvents(status?: AlertStatus, limit = 100): Promise<AlertEvent[]> {
    if (!hasSupabase || !supabase) {
      let rows = ADMIN_MOCK.alertEvents as AlertEvent[];
      if (status) rows = rows.filter((e) => e.status === status);
      return rows;
    }
    const { data, error } = await supabase.rpc('admin_list_alert_events', {
      p_status: status ?? null,
      p_limit: limit,
    });
    if (error) throw error;
    return (data ?? []).map(mapAlertEvent);
  },

  async updateAlertEvent(id: number, status: AlertStatus): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.rpc('admin_update_alert_event', {
      p_id: id,
      p_status: status,
    });
    if (error) throw error;
  },

  async runAlertEval(): Promise<number> {
    if (!hasSupabase || !supabase) return 0;
    const { data, error } = await supabase.rpc('admin_run_alert_eval');
    if (error) throw error;
    return (data as number) ?? 0;
  },
};

function mapAlertRule(r: any): AlertRule {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    isEnabled: r.is_enabled,
    severity: r.severity,
    params: r.params ?? {},
    cooldownMin: r.cooldown_min,
    lastEvaluatedAt: r.last_evaluated_at,
    lastFiredAt: r.last_fired_at,
    createdAt: r.created_at,
  };
}

function mapAlertEvent(r: any): AlertEvent {
  return {
    id: r.id,
    ruleId: r.rule_id,
    ruleName: r.rule_name,
    kind: r.kind,
    severity: r.severity,
    status: r.status,
    summary: r.summary,
    details: r.details,
    firedAt: r.fired_at,
    acknowledgedAt: r.acknowledged_at,
    resolvedAt: r.resolved_at,
  };
}

function mapErrorRow(r: any): ErrorRow {
  return {
    id: r.id,
    createdAt: r.created_at,
    app: r.app,
    severity: r.severity,
    source: r.source,
    name: r.name,
    message: r.message,
    route: r.route,
    userId: r.user_id,
    fingerprint: r.fingerprint,
  };
}

function buildEmptyUser360(userId: string): User360 {
  const fromDir = (ADMIN_MOCK.users as AdminUserRow[]).find((u) => u.id === userId);
  return {
    profile: fromDir
      ? {
          id: fromDir.id,
          role: fromDir.role,
          email: fromDir.email,
          name: fromDir.name,
          firm: fromDir.firm,
          isVerified: fromDir.isVerified,
          verificationStatus: fromDir.verificationStatus,
          createdAt: fromDir.createdAt,
          lastSignInAt: fromDir.lastSignInAt,
          emailConfirmedAt: null,
        }
      : null,
    deals: [],
    offers: [],
    notifications: [],
    loginHistory: [],
    audit: [],
    recentErrors: [],
  };
}
