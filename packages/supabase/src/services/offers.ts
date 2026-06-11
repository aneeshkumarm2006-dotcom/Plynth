import { supabase, hasSupabase } from '../client';
import { BROKER_MOCK } from '@plynth/shared/mock';

export interface OfferRow {
  id: string;
  deal_id: string;
  lender_id: string;
  rate_percent: number;
  lender_fee_percent?: number | null;
  broker_fee_percent?: number | null;
  term_months?: number | null;
  max_ltv?: number | null;
  conditions_text?: string | null;
  status: 'submitted' | 'viewed' | 'countered' | 'accepted' | 'rejected' | 'expired';
  is_best_offer: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OfferSubmitInput {
  deal_id: string;
  rate_percent: number;
  lender_fee_percent?: number;
  broker_fee_percent?: number;
  term_months?: number;
  max_ltv?: number;
  conditions_text?: string;
  expires_in_days?: number;
}

function expiryDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export const offersService = {
  async listForDeal(dealId: string): Promise<OfferRow[]> {
    if (!hasSupabase || !supabase) return BROKER_MOCK.dealOffers as unknown as OfferRow[];
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('deal_id', dealId)
      .eq('is_deleted', false)
      .order('rate_percent', { ascending: true });
    if (error) throw error;
    return (data ?? []) as OfferRow[];
  },

  async listForLender(lenderId: string): Promise<OfferRow[]> {
    if (!hasSupabase || !supabase) return [];
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('lender_id', lenderId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as OfferRow[];
  },

  async submit(lenderId: string, input: OfferSubmitInput): Promise<OfferRow> {
    if (!hasSupabase || !supabase) {
      return {
        id: 'mock-offer',
        deal_id: input.deal_id,
        lender_id: lenderId,
        rate_percent: input.rate_percent,
        lender_fee_percent: input.lender_fee_percent ?? null,
        broker_fee_percent: input.broker_fee_percent ?? null,
        term_months: input.term_months ?? null,
        max_ltv: input.max_ltv ?? null,
        conditions_text: input.conditions_text ?? null,
        status: 'submitted',
        is_best_offer: false,
        expires_at: expiryDate(input.expires_in_days ?? 5),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase
      .from('offers')
      .insert({
        deal_id: input.deal_id,
        lender_id: lenderId,
        rate_percent: input.rate_percent,
        lender_fee_percent: input.lender_fee_percent,
        broker_fee_percent: input.broker_fee_percent,
        term_months: input.term_months,
        max_ltv: input.max_ltv,
        conditions_text: input.conditions_text,
        expires_at: expiryDate(input.expires_in_days ?? 5),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as OfferRow;
  },

  async counter(
    offerId: string,
    initiatedBy: 'lender' | 'broker',
    patch: { rate_percent?: number; lender_fee_percent?: number; broker_fee_percent?: number; broker_note?: string }
  ): Promise<void> {
    if (!hasSupabase || !supabase) return;
    await supabase.from('offer_history').insert({
      offer_id: offerId,
      initiated_by: initiatedBy,
      ...patch,
    });
    await supabase
      .from('offers')
      .update({ status: 'countered', updated_at: new Date().toISOString() })
      .eq('id', offerId);
  },

  async accept(offerId: string): Promise<void> {
    if (!hasSupabase || !supabase) return;
    const { data: offer } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();
    if (!offer) return;
    const { data: deal } = await supabase
      .from('deals')
      .select('broker_id')
      .eq('id', offer.deal_id)
      .single();
    await supabase
      .from('offers')
      .update({ status: 'accepted', is_best_offer: true })
      .eq('id', offerId);
    await supabase
      .from('deals')
      .update({ status: 'funded' })
      .eq('id', offer.deal_id);
    if (deal) {
      await supabase.from('fundings').insert({
        deal_id: offer.deal_id,
        offer_id: offer.id,
        broker_id: deal.broker_id,
        lender_id: offer.lender_id,
        actual_rate_percent: offer.rate_percent,
        actual_fee_percent: offer.lender_fee_percent,
        actual_term_months: offer.term_months,
        closed_at: new Date().toISOString(),
      });
    }
  },

  async reject(offerId: string): Promise<void> {
    if (!hasSupabase || !supabase) return;
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId);
  },
};
