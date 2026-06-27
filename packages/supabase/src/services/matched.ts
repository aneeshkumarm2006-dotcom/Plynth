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
  // Real deal facts (so the detail page stops hard-coding them).
  estimated_value_cents?: number | null;
  beacon_score?: number | null;
  property_type?: string | null;
  is_self_employed?: boolean | null;
  // The lender's interest signal on this deal — persisted so Interested/Pass
  // survive a refresh (and drive the pipeline columns).
  interest_status?: 'interested' | 'passed' | null;
}

export type InterestStatus = 'interested' | 'passed';

// Mock-mode persistence for the interest signal. Lives in localStorage so the
// Interested/Pass choice survives a page refresh without a backend. Guarded for
// non-browser contexts (tests, SSR).
const INTEREST_KEY = 'plynth:interest';
function readInterest(dealId: string): InterestStatus | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(`${INTEREST_KEY}:${dealId}`);
  return v === 'interested' || v === 'passed' ? v : null;
}
function writeInterest(dealId: string, status: InterestStatus): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${INTEREST_KEY}:${dealId}`, status);
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
        // Mock facts so the detail page reads coherently without a backend.
        estimated_value_cents: Math.round((parseInt(m.amount.replace(/[^0-9]/g, ''), 10) * 100) / (parseFloat(m.ltv) / 100)),
        beacon_score: 700,
        property_type: m.asset?.startsWith('Residential') ? 'residential' : 'commercial',
        is_self_employed: true,
        interest_status: readInterest(m.no),
      }));
    }
    const { data, error } = await supabase
      .from('lender_deal_interactions')
      .select(
        `id, match_score, matched_at, views_count,
         interest_status,
         deals!inner (
           id, deal_number, city, province, neighbourhood, asset_class,
           loan_amount_cents, ltv, position, term_months, status, notes,
           estimated_value_cents, beacon_score, property_type, is_self_employed
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
      estimated_value_cents: row.deals.estimated_value_cents,
      beacon_score: row.deals.beacon_score,
      property_type: row.deals.property_type,
      is_self_employed: row.deals.is_self_employed,
      interest_status: row.interest_status ?? null,
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

  // Persist the lender's Interested/Pass signal on a deal. In mock mode this
  // writes to localStorage so it survives a refresh; live mode upserts the
  // interest_status column on the lender_deal_interactions row.
  async setInterest(lenderId: string, dealId: string, status: InterestStatus): Promise<void> {
    if (!hasSupabase || !supabase) {
      writeInterest(dealId, status);
      return;
    }
    // Goes through a SECURITY DEFINER RPC (migration 0016) scoped to the
    // caller's own match row. Lenders can no longer self-insert
    // interaction rows for arbitrary deals or spoof match_score /
    // borrower_details_revealed via a direct upsert.
    const { error } = await supabase.rpc('set_interest', {
      p_deal_id: dealId,
      p_status: status,
    });
    if (error) throw error;
  },
};
