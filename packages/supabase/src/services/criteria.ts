import { supabase, hasSupabase } from '../client';
import { LENDER_MOCK } from '@plynth/shared/mock';

export interface CriteriaRow {
  id?: string;
  lender_id?: string;
  asset_classes: string[];
  provinces: string[];
  cities: string[];
  loan_min_cents: number;
  loan_max_cents: number;
  ltv_max_first_position: number;
  ltv_max_second_position: number;
  term_min_months: number;
  term_max_months: number;
  min_beacon_score: number;
  accept_bfs_borrowers: boolean;
  monthly_deployment_target_cents: number;
  available_capital_cents: number;
  close_speed_days_min: number;
  close_speed_days_max: number;
  exclusion_flags: string[];
}

// Convert builder UI state to DB row shape.
export interface BuilderState {
  assets: string[];
  provinces: string[];
  cities: string[];
  loanMin: number;
  loanMax: number;
  ltv1: number;
  ltv2: number;
  termMin: number;
  termMax: number;
  beacon: number;
  bfs: boolean;
  exclusions: string[];
  monthlyTarget: number;
  available: number;
  closeSpeed: string;
}

export function builderToRow(s: BuilderState): CriteriaRow {
  const [lo, hi] = s.closeSpeed.split('–').map((v) => parseInt(v, 10));
  return {
    asset_classes: s.assets,
    provinces: s.provinces,
    cities: s.cities,
    loan_min_cents: s.loanMin * 100,
    loan_max_cents: s.loanMax * 100,
    ltv_max_first_position: s.ltv1,
    ltv_max_second_position: s.ltv2,
    term_min_months: s.termMin,
    term_max_months: s.termMax,
    min_beacon_score: s.beacon,
    accept_bfs_borrowers: s.bfs,
    monthly_deployment_target_cents: s.monthlyTarget * 100,
    available_capital_cents: s.available * 100,
    close_speed_days_min: lo || 7,
    close_speed_days_max: hi || 10,
    exclusion_flags: s.exclusions,
  };
}

export function rowToBuilder(r: CriteriaRow): BuilderState {
  return {
    assets: r.asset_classes ?? [],
    provinces: r.provinces ?? [],
    cities: r.cities ?? [],
    loanMin: Math.round(r.loan_min_cents / 100),
    loanMax: Math.round(r.loan_max_cents / 100),
    ltv1: r.ltv_max_first_position,
    ltv2: r.ltv_max_second_position,
    termMin: r.term_min_months,
    termMax: r.term_max_months,
    beacon: r.min_beacon_score,
    bfs: r.accept_bfs_borrowers,
    exclusions: r.exclusion_flags ?? [],
    monthlyTarget: Math.round(r.monthly_deployment_target_cents / 100),
    available: Math.round(r.available_capital_cents / 100),
    closeSpeed: `${r.close_speed_days_min}–${r.close_speed_days_max} days`,
  };
}

export const criteriaService = {
  async getForLender(lenderId: string): Promise<BuilderState> {
    if (!hasSupabase || !supabase) return LENDER_MOCK.criteria;
    const { data, error } = await supabase
      .from('lender_criteria')
      .select('*')
      .eq('lender_id', lenderId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return LENDER_MOCK.criteria;
    return rowToBuilder(data as CriteriaRow);
  },

  async upsert(lenderId: string, state: BuilderState): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const row = builderToRow(state);
    await supabase
      .from('lender_criteria')
      .upsert({ lender_id: lenderId, ...row }, { onConflict: 'lender_id' });
    // Trigger match recomputation via Postgres RPC (defined in 0003 migration).
    // Swallow errors — the function may not exist before migrations run, and
    // we never want a save to fail because of a non-critical recompute step.
    try {
      await supabase.rpc('compute_lender_matches', { p_lender_id: lenderId });
    } catch {
      // intentional
    }
  },
};
