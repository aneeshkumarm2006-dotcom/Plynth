import { supabase, hasSupabase } from '../client';
import { BROKER_MOCK } from '@plynth/shared/mock';

export interface DealRow {
  id: string;
  broker_id: string;
  deal_number: string;
  city: string;
  province: string;
  neighbourhood?: string | null;
  property_type?: string | null;
  asset_class: string;
  loan_amount_cents: number;
  estimated_value_cents?: number | null;
  ltv: number;
  position: 'first' | 'second' | 'third+';
  term_months: number;
  rate_min?: number | null;
  rate_max?: number | null;
  requested_rate_range?: string | null;
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
  // Optional — when omitted, the service allocates the next number for the broker.
  deal_number?: string;
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
  requested_rate_range?: string;
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

  // Next zero-padded 4-digit deal number for a broker (max existing + 1).
  async nextDealNumber(brokerId: string): Promise<string> {
    const pad = (n: number) => String(n).padStart(4, '0');
    if (!hasSupabase || !supabase) {
      const nums = BROKER_MOCK.pipeline
        .map((d) => parseInt(d.no, 10))
        .filter((n) => !Number.isNaN(n));
      return pad((nums.length ? Math.max(...nums) : 250) + 1);
    }
    const { data, error } = await supabase
      .from('deals')
      .select('deal_number')
      .eq('broker_id', brokerId);
    if (error) throw error;
    const nums = (data ?? [])
      .map((r) => parseInt(r.deal_number as string, 10))
      .filter((n) => !Number.isNaN(n));
    return pad((nums.length ? Math.max(...nums) : 250) + 1);
  },

  // `status` controls whether the deal goes live ('active') or is parked as a
  // 'draft'. Drafts don't get a submitted_at and aren't matched to lenders.
  async create(
    brokerId: string,
    input: DealSubmitInput,
    status: 'active' | 'draft' = 'active'
  ): Promise<DealRow> {
    const { deal_number: provided, ...rest } = input;
    if (!hasSupabase || !supabase) {
      const deal_number = provided ?? (await this.nextDealNumber(brokerId));
      return {
        id: 'mock-' + deal_number,
        broker_id: brokerId,
        deal_number,
        city: input.city,
        province: input.province,
        asset_class: input.asset_class,
        loan_amount_cents: input.loan_amount_cents,
        ltv: input.ltv,
        position: input.position,
        term_months: input.term_months,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DealRow;
    }
    // Borrower-identifying fields live in the separate, reveal-gated
    // deal_private table (migration 0017) — never on `deals`, which
    // matched lenders can read. Split them out of the deal insert.
    const { borrower_name, property_address, ...dealCols } = rest as typeof rest & {
      borrower_name?: string;
      property_address?: string;
    };

    // Allocate the number and insert. If two submits race onto the same number
    // (unique violation 23505) and the caller didn't pin one, re-allocate and retry.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const deal_number = provided ?? (await this.nextDealNumber(brokerId));
      const { data, error } = await supabase
        .from('deals')
        .insert({
          broker_id: brokerId,
          deal_number,
          ...dealCols,
          status,
          submitted_at: status === 'active' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (!error) {
        if (borrower_name || property_address) {
          const { error: pErr } = await supabase
            .from('deal_private')
            .insert({
              deal_id: (data as DealRow).id,
              borrower_name: borrower_name ?? null,
              property_address: property_address ?? null,
            });
          if (pErr) throw pErr;
        }
        return data as DealRow;
      }
      if ((error as { code?: string }).code === '23505' && !provided) {
        lastErr = error;
        continue;
      }
      throw error;
    }
    throw lastErr;
  },

  async update(id: string, patch: Partial<DealSubmitInput & { status: string }>): Promise<DealRow> {
    if (!hasSupabase || !supabase) {
      // Mock mode: no persistence — echo the patch so callers can refresh.
      return { id, ...patch, updated_at: new Date().toISOString() } as unknown as DealRow;
    }
    // Route borrower-identity edits to the reveal-gated deal_private table.
    const { borrower_name, property_address, ...dealPatch } = patch;
    if (borrower_name !== undefined || property_address !== undefined) {
      const { error: pErr } = await supabase
        .from('deal_private')
        .upsert(
          {
            deal_id: id,
            ...(borrower_name !== undefined ? { borrower_name } : {}),
            ...(property_address !== undefined ? { property_address } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'deal_id' }
        );
      if (pErr) throw pErr;
    }
    const { data, error } = await supabase
      .from('deals')
      .update({ ...dealPatch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as DealRow;
  },

  // Borrower identity (name + property address) from the reveal-gated
  // deal_private table. RLS (migration 0017) returns a row only to the
  // deal's broker, an admin, or a lender the broker has revealed to —
  // everyone else gets null.
  async getBorrowerDetails(
    dealId: string
  ): Promise<{ borrower_name: string | null; property_address: string | null } | null> {
    if (!hasSupabase || !supabase) return null;
    const { data, error } = await supabase
      .from('deal_private')
      .select('borrower_name, property_address')
      .eq('deal_id', dealId)
      .maybeSingle();
    if (error) throw error;
    return (data as { borrower_name: string | null; property_address: string | null }) ?? null;
  },

  // Promote a draft to the live marketplace.
  async submitDraft(id: string): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase
      .from('deals')
      .update({ status: 'active', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Reveal borrower identity to specific lenders. Goes through a
  // SECURITY DEFINER RPC (migration 0016) that verifies the caller is
  // the deal's broker and appends to the reveal list atomically — the
  // old read-modify-write here had a TOCTOU race that could drop a
  // lender from the list under concurrent reveals.
  async revealBorrowerTo(dealId: string, lenderIds: string[]): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.rpc('reveal_borrower_to', {
      p_deal_id: dealId,
      p_lender_ids: lenderIds,
    });
    if (error) throw error;
  },
};
