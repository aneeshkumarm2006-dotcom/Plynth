import { supabase, hasSupabase } from '../client';
import { LENDER_MOCK, BROKER_MOCK } from '@plynth/shared/mock';
import { buildCriteriaPreview } from '@plynth/shared/utils';

export interface StatBlockData {
  value: string;
  unit?: string;
  label: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
}

export interface LenderSidebar {
  winRate: string;
  avgResponse: string;
  criteria: string;
}

// Compact CAD for stat headlines: 4_250_000 cents → "$4.2" (+ unit "M").
function moneyShort(cents: number): { value: string; unit: string } {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return { value: '$' + (dollars / 1_000_000).toFixed(1), unit: 'M' };
  if (dollars >= 1_000) return { value: '$' + Math.round(dollars / 1_000).toString(), unit: 'K' };
  return { value: '$' + Math.round(dollars).toString(), unit: '' };
}

function startOfYearISO(): string {
  // Avoid Date.now-style nondeterminism concerns: derived from current year only.
  const y = new Date().getFullYear();
  return new Date(Date.UTC(y, 0, 1)).toISOString();
}

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
}

export const analyticsService = {
  // ---- Lender dashboard ----
  async lenderStats(lenderId: string): Promise<StatBlockData[]> {
    if (!hasSupabase || !supabase) return LENDER_MOCK.stats as StatBlockData[];

    const [matches, offers, fundings, criteria] = await Promise.all([
      supabase.from('lender_deal_interactions').select('id', { count: 'exact', head: true }).eq('lender_id', lenderId),
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('lender_id', lenderId)
        .in('status', ['submitted', 'viewed', 'countered'])
        .eq('is_deleted', false),
      supabase
        .from('fundings')
        .select('id, deals!inner(loan_amount_cents)')
        .eq('lender_id', lenderId)
        .gte('closed_at', startOfYearISO()),
      supabase.from('lender_criteria').select('monthly_deployment_target_cents').eq('lender_id', lenderId).maybeSingle(),
    ]);

    const newMatches = matches.count ?? 0;
    const offersOut = offers.count ?? 0;
    const fundedCents = ((fundings.data ?? []) as any[]).reduce(
      (s, f) => s + (f.deals?.loan_amount_cents ?? 0),
      0
    );
    const funded = moneyShort(fundedCents);
    const targetYearly = ((criteria.data as any)?.monthly_deployment_target_cents ?? 0) * 12;
    const deployRate = targetYearly > 0 ? Math.round((fundedCents / targetYearly) * 100) : 0;

    return [
      { value: String(newMatches), label: 'New Matches' },
      { value: String(offersOut), label: 'Offers Out' },
      { value: funded.value, unit: funded.unit, label: 'Funded YTD' },
      { value: String(deployRate), unit: '%', label: 'Deployment Rate' },
    ];
  },

  // ---- Lender performance sidebar (win rate, avg response, criteria preview) ----
  async lenderSidebar(lenderId: string): Promise<LenderSidebar> {
    if (!hasSupabase || !supabase) {
      return {
        winRate: LENDER_MOCK.sidebarStats.winRate,
        avgResponse: LENDER_MOCK.sidebarStats.avgResponse,
        criteria: LENDER_MOCK.sidebarStats.criteria,
      };
    }

    const [offersRes, interRes, critRes] = await Promise.all([
      supabase.from('offers').select('status, created_at, deal_id').eq('lender_id', lenderId).eq('is_deleted', false),
      supabase.from('lender_deal_interactions').select('deal_id, matched_at').eq('lender_id', lenderId),
      supabase
        .from('lender_criteria')
        .select('asset_classes, provinces, ltv_max_first_position')
        .eq('lender_id', lenderId)
        .maybeSingle(),
    ]);

    const offers = offersRes.data ?? [];
    const total = offers.length;
    const won = offers.filter((o) => o.status === 'accepted').length;
    const winRate = total > 0 ? Math.round((won / total) * 100) + '%' : '—';

    // Avg response = time from a deal matching the lender to their offer on it.
    const matchedAt = new Map((interRes.data ?? []).map((r) => [r.deal_id, r.matched_at]));
    let sumHours = 0;
    let counted = 0;
    for (const o of offers) {
      const m = matchedAt.get(o.deal_id);
      if (!m) continue;
      const h = (new Date(o.created_at).getTime() - new Date(m).getTime()) / 3_600_000;
      if (h >= 0) {
        sumHours += h;
        counted++;
      }
    }
    const avgResponse = counted > 0 ? (sumHours / counted).toFixed(1) + ' hrs' : '—';

    const c = critRes.data as
      | { asset_classes: string[]; provinces: string[]; ltv_max_first_position: number }
      | null;
    const criteria = c
      ? buildCriteriaPreview(c.asset_classes ?? [], c.provinces ?? [], c.ltv_max_first_position, c.ltv_max_first_position)
      : LENDER_MOCK.sidebarStats.criteria;

    return { winRate, avgResponse, criteria };
  },

  // ---- Broker dashboard ----
  async brokerStats(brokerId: string): Promise<StatBlockData[]> {
    if (!hasSupabase || !supabase) return BROKER_MOCK.stats as StatBlockData[];

    const [active, offersIn, fundedMonth, fundedYear] = await Promise.all([
      supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', brokerId)
        .eq('is_deleted', false)
        .in('status', ['active', 'matched', 'negotiating', 'offer']),
      supabase
        .from('offers')
        .select('id, deals!inner(broker_id)', { count: 'exact', head: true })
        .eq('deals.broker_id', brokerId)
        .eq('is_deleted', false),
      supabase
        .from('fundings')
        .select('id, deals!inner(loan_amount_cents)')
        .eq('broker_id', brokerId)
        .gte('closed_at', startOfMonthISO()),
      supabase
        .from('fundings')
        .select('id, deals!inner(loan_amount_cents)')
        .eq('broker_id', brokerId)
        .gte('closed_at', startOfYearISO()),
    ]);

    const monthCents = ((fundedMonth.data ?? []) as any[]).reduce((s, f) => s + (f.deals?.loan_amount_cents ?? 0), 0);
    const yearCents = ((fundedYear.data ?? []) as any[]).reduce((s, f) => s + (f.deals?.loan_amount_cents ?? 0), 0);
    const month = moneyShort(monthCents);
    const year = moneyShort(yearCents);

    return [
      { value: String(active.count ?? 0), label: 'Active Deals' },
      { value: String(offersIn.count ?? 0), label: 'Offers In' },
      { value: month.value, unit: month.unit, label: 'Funded This Month' },
      { value: year.value, unit: year.unit, label: 'Volume YTD' },
    ];
  },
};
