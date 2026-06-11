import { supabase, hasSupabase } from '../client';
import { LENDER_MOCK } from '@plynth/shared/mock';

export interface MatchedDeal {
  interaction_id?: string;
  deal_id: string;
  deal_number: string;
  city: string;
  province: string;
  neighbourhood?: string | null;
  asset_class: string;
  loan_amount_cents: number;
  ltv: number;
  position: string;
  term_months: number;
  match_score: number;
  matched_at: string;
  views_count?: number;
  // Editorial summary + relative age. In live mode `summary` falls back to the
  // broker's notes and `age` is derived from `matched_at`; in mock mode both
  // come straight from the fixture so the feed reads identically.
  summary?: string | null;
  age?: string | null;
}

export const matchedService = {
  async listForLender(lenderId: string): Promise<MatchedDeal[]> {
    if (!hasSupabase || !supabase) {
      return LENDER_MOCK.matched.map((m) => ({
        deal_id: m.no,
        deal_number: m.no,
        city: m.city,
        province: m.city.split(', ')[1] ?? '',
        neighbourhood: m.region,
        asset_class: m.asset,
        loan_amount_cents: parseInt(m.amount.replace(/[^0-9]/g, ''), 10) * 100,
        ltv: parseFloat(m.ltv),
        position: m.position,
        term_months: parseInt(m.term, 10),
        match_score: m.score,
        matched_at: new Date().toISOString(),
        views_count: 0,
        summary: m.summary,
        age: m.age,
      }));
    }
    const { data, error } = await supabase
      .from('lender_deal_interactions')
      .select(
        `id, match_score, matched_at, views_count,
         deals!inner (
           id, deal_number, city, province, neighbourhood, asset_class,
           loan_amount_cents, ltv, position, term_months, status, notes
         )`
      )
      .eq('lender_id', lenderId)
      .order('match_score', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      interaction_id: row.id,
      deal_id: row.deals.id,
      deal_number: row.deals.deal_number,
      city: row.deals.city,
      province: row.deals.province,
      neighbourhood: row.deals.neighbourhood,
      asset_class: row.deals.asset_class,
      loan_amount_cents: row.deals.loan_amount_cents,
      ltv: row.deals.ltv,
      position: row.deals.position,
      term_months: row.deals.term_months,
      match_score: row.match_score,
      matched_at: row.matched_at,
      views_count: row.views_count,
      summary: row.deals.notes,
      age: null,
    }));
  },

  async getForLender(lenderId: string, dealId: string): Promise<MatchedDeal | null> {
    const all = await this.listForLender(lenderId);
    return all.find((d) => d.deal_id === dealId || d.deal_number === dealId) ?? null;
  },

  async recordView(lenderId: string, dealId: string): Promise<void> {
    if (!hasSupabase || !supabase) return;
    await supabase.rpc('increment_view_count', {
      p_lender_id: lenderId,
      p_deal_id: dealId,
    });
  },
};
