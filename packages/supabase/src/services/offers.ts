import { supabase, hasSupabase } from '../client';
import { BROKER_MOCK } from '@plynth/shared/mock';
import { timeAgo } from '@plynth/shared/utils';

export interface ActivityEntry {
  t: string; // relative time label
  e: string; // event description (counterparties anonymized)
}

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

export interface CounterEntry {
  initiated_by: 'lender' | 'broker';
  rate_percent: number | null;
  lender_fee_percent: number | null;
  broker_fee_percent: number | null;
  broker_note: string | null;
  created_at: string;
}

export interface NegotiationCard {
  offer_id: string;
  deal_id: string;
  deal_number: string;
  city: string;
  province: string;
  amount_cents: number;
  status: OfferRow['status'];
  rate_percent: number;
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

  // This lender's offer on a deal + its counter history (newest first),
  // for the negotiation panel on the lender's deal-detail page.
  async negotiationForDeal(
    dealId: string,
    lenderId: string
  ): Promise<{ myOffer: OfferRow | null; history: CounterEntry[] }> {
    if (!hasSupabase || !supabase) {
      // Demo mode: surface a live broker counter on one deal so the
      // Accept / Counter-back flow is visible; other deals show the composer.
      const neg = BROKER_MOCK.negotiation;
      if (dealId === neg.dealId) {
        return {
          myOffer: neg.myOffer as unknown as OfferRow,
          history: neg.history as unknown as CounterEntry[],
        };
      }
      return { myOffer: null, history: [] };
    }
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('deal_id', dealId)
      .eq('lender_id', lenderId)
      .eq('is_deleted', false)
      .limit(1);
    if (error) throw error;
    const myOffer = (offers?.[0] ?? null) as OfferRow | null;
    let history: CounterEntry[] = [];
    if (myOffer) {
      const { data: h } = await supabase
        .from('offer_history')
        .select('initiated_by, rate_percent, lender_fee_percent, broker_fee_percent, broker_note, created_at')
        .eq('offer_id', myOffer.id)
        .order('created_at', { ascending: false });
      history = (h ?? []) as CounterEntry[];
    }
    return { myOffer, history };
  },

  // The lender's live negotiations (non-terminal offers) with deal info,
  // for the "Needs your response" cards on the dashboard. Countered offers
  // are the ones awaiting the lender's action.
  async activeNegotiations(lenderId: string): Promise<NegotiationCard[]> {
    if (!hasSupabase || !supabase) return [];
    const { data, error } = await supabase
      .from('offers')
      .select(
        'id, deal_id, rate_percent, status, updated_at, ' +
          'deals!inner ( deal_number, city, province, loan_amount_cents )'
      )
      .eq('lender_id', lenderId)
      .eq('is_deleted', false)
      .in('status', ['submitted', 'viewed', 'countered'])
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      offer_id: r.id,
      deal_id: r.deal_id,
      deal_number: r.deals?.deal_number ?? '—',
      city: r.deals?.city ?? '',
      province: r.deals?.province ?? '',
      amount_cents: r.deals?.loan_amount_cents ?? 0,
      status: r.status,
      rate_percent: r.rate_percent,
      updated_at: r.updated_at,
    }));
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
    // A lender may have at most one offer per deal (unique constraint
    // unique_lender_per_deal). Re-submitting must UPDATE that offer, not
    // insert a second one (a raw insert returns 409 Conflict). Upsert on
    // the (deal_id, lender_id) conflict target, resetting it to a fresh
    // 'submitted' offer with the new terms.
    const { data, error } = await supabase
      .from('offers')
      .upsert(
        {
          deal_id: input.deal_id,
          lender_id: lenderId,
          rate_percent: input.rate_percent,
          lender_fee_percent: input.lender_fee_percent,
          broker_fee_percent: input.broker_fee_percent,
          term_months: input.term_months,
          max_ltv: input.max_ltv,
          conditions_text: input.conditions_text,
          status: 'submitted',
          is_deleted: false,
          expires_at: expiryDate(input.expires_in_days ?? 5),
        },
        { onConflict: 'deal_id,lender_id' }
      )
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

  // Activity timeline for a deal, synthesized from its offers + counter history.
  // Counterparties are anonymized. Newest first.
  async activityForDeal(dealId: string): Promise<ActivityEntry[]> {
    if (!hasSupabase || !supabase) return BROKER_MOCK.activity as ActivityEntry[];

    const { data: offers, error } = await supabase
      .from('offers')
      .select('id, rate_percent, status, created_at')
      .eq('deal_id', dealId);
    if (error) throw error;

    const offerIds = (offers ?? []).map((o) => o.id);
    let history: any[] = [];
    if (offerIds.length) {
      const { data: h } = await supabase
        .from('offer_history')
        .select('offer_id, initiated_by, rate_percent, broker_note, created_at')
        .in('offer_id', offerIds);
      history = h ?? [];
    }

    const events: Array<{ ts: string; e: string }> = [];
    for (const o of offers ?? []) {
      if (o.status === 'accepted') events.push({ ts: o.created_at, e: 'An offer was accepted and the deal funded.' });
      events.push({ ts: o.created_at, e: `A lender submitted an offer at ${o.rate_percent}%.` });
    }
    for (const h of history) {
      const who = h.initiated_by === 'broker' ? 'You' : 'A lender';
      const note = h.broker_note ? ` — “${h.broker_note}”` : '';
      events.push({
        ts: h.created_at,
        e: h.rate_percent != null ? `${who} countered at ${h.rate_percent}%.${note}` : `${who} sent a counter.${note}`,
      });
    }

    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return events.map((x) => ({ t: timeAgo(x.ts), e: x.e }));
  },
};
