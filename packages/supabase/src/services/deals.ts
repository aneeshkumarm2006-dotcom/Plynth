import { supabase, hasSupabase } from '../client';
import { BROKER_MOCK } from '@plynth/shared/mock';

export interface DealRow {
  id: string;
  broker_id: string;
  deal_number: string;
  city: string;
  province: string;
  neighbourhood?: string | null;
  asset_class: string;
  loan_amount_cents: number;
  estimated_value_cents?: number | null;
  ltv: number;
  position: 'first' | 'second' | 'third+';
  term_months: number;
  rate_min?: number | null;
  rate_max?: number | null;
  borrower_name?: string | null;
  beacon_score?: number | null;
  is_self_employed?: boolean;
  has_bfs_acceptable?: boolean;
  status: string;
  submitted_at?: string | null;
  closing_target_date?: string | null;
  borrower_details_revealed_to?: string[];
  exclusion_flags?: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealSubmitInput {
  deal_number: string;
  city: string;
  province: string;
  neighbourhood?: string;
  property_address?: string;
  property_type?: string;
  asset_class: string;
  loan_amount_cents: number;
  estimated_value_cents?: number;
  ltv: number;
  position: 'first' | 'second' | 'third+';
  term_months: number;
  rate_min?: number;
  rate_max?: number;
  borrower_name?: string;
  beacon_score?: number;
  is_self_employed?: boolean;
  has_bfs_acceptable?: boolean;
  exclusion_flags?: string[];
  closing_target_date?: string;
  notes?: string;
}

export const dealsService = {
  async listForBroker(brokerId: string): Promise<DealRow[]> {
    if (!hasSupabase || !supabase) return BROKER_MOCK.pipeline as unknown as DealRow[];
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('broker_id', brokerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DealRow[];
  },

  async listActiveForLender(): Promise<DealRow[]> {
    if (!hasSupabase || !supabase) return BROKER_MOCK.pipeline as unknown as DealRow[];
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .in('status', ['active', 'matched', 'negotiating', 'offer'])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DealRow[];
  },

  async getById(id: string): Promise<DealRow | null> {
    if (!hasSupabase || !supabase) {
      const d = BROKER_MOCK.pipeline.find((d) => d.no === id);
      return (d as unknown as DealRow) ?? null;
    }
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as DealRow) ?? null;
  },

  async create(brokerId: string, input: DealSubmitInput): Promise<DealRow> {
    if (!hasSupabase || !supabase) {
      return {
        id: 'mock-' + input.deal_number,
        broker_id: brokerId,
        deal_number: input.deal_number,
        city: input.city,
        province: input.province,
        asset_class: input.asset_class,
        loan_amount_cents: input.loan_amount_cents,
        ltv: input.ltv,
        position: input.position,
        term_months: input.term_months,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DealRow;
    }
    const { data, error } = await supabase
      .from('deals')
      .insert({
        broker_id: brokerId,
        ...input,
        status: 'active',
        submitted_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as DealRow;
  },

  async update(id: string, patch: Partial<DealSubmitInput & { status: string }>): Promise<DealRow> {
    if (!hasSupabase || !supabase) throw new Error('mock');
    const { data, error } = await supabase
      .from('deals')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as DealRow;
  },

  async revealBorrowerTo(dealId: string, lenderIds: string[]): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { data: deal } = await supabase
      .from('deals')
      .select('borrower_details_revealed_to')
      .eq('id', dealId)
      .single();
    const existing = (deal?.borrower_details_revealed_to as string[]) ?? [];
    const next = Array.from(new Set([...existing, ...lenderIds]));
    await supabase
      .from('deals')
      .update({ borrower_details_revealed_to: next })
      .eq('id', dealId);
  },
};
