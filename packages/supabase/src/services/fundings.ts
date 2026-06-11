import { supabase, hasSupabase } from '../client';
import { LENDER_MOCK, BROKER_MOCK } from '@plynth/shared/mock';

export interface FundingRow {
  id: string;
  deal_id: string;
  deal_number: string;
  city: string;
  province?: string;
  loan_amount_cents: number;
  position: string;
  actual_rate_percent: number;
  actual_fee_percent?: number | null;
  actual_term_months: number;
  counterparty: string; // anonymized broker (lender view) or lender label (broker view)
  closed_at: string;
}

// Parse a display string like "$540,000" into integer cents.
function dollarsToCents(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, ''), 10) * 100;
}

function termToMonths(s: string): number {
  return parseInt(s, 10) || 0;
}

export const fundingsService = {
  async listForLender(lenderId: string): Promise<FundingRow[]> {
    if (!hasSupabase || !supabase) {
      return LENDER_MOCK.funded.map((f, i) => ({
        id: 'mock-funding-' + i,
        deal_id: f.no,
        deal_number: f.no,
        city: f.city,
        loan_amount_cents: dollarsToCents(f.amount),
        position: f.position,
        actual_rate_percent: parseFloat(f.rate),
        actual_fee_percent: null,
        actual_term_months: termToMonths(f.term),
        counterparty: f.broker,
        closed_at: f.closed,
      }));
    }
    const { data, error } = await supabase
      .from('fundings')
      .select(
        `id, actual_rate_percent, actual_fee_percent, actual_term_months, closed_at,
         deals!inner ( id, deal_number, city, province, loan_amount_cents, position )`
      )
      .eq('lender_id', lenderId)
      .order('closed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      deal_id: row.deals.id,
      deal_number: row.deals.deal_number,
      city: row.deals.city,
      province: row.deals.province,
      loan_amount_cents: row.deals.loan_amount_cents,
      position: row.deals.position,
      actual_rate_percent: row.actual_rate_percent,
      actual_fee_percent: row.actual_fee_percent,
      actual_term_months: row.actual_term_months,
      counterparty: 'Anonymized',
      closed_at: row.closed_at,
    }));
  },

  async listForBroker(brokerId: string): Promise<FundingRow[]> {
    if (!hasSupabase || !supabase) {
      return BROKER_MOCK.funded.map((f, i) => ({
        id: 'mock-funding-' + i,
        deal_id: f.no,
        deal_number: f.no,
        city: f.city,
        loan_amount_cents: dollarsToCents(f.amount),
        position: f.position,
        actual_rate_percent: parseFloat(f.rate),
        actual_fee_percent: f.fee ? parseFloat(f.fee) : null,
        actual_term_months: termToMonths(f.term),
        counterparty: f.lender,
        closed_at: f.closed,
      }));
    }
    const { data, error } = await supabase
      .from('fundings')
      .select(
        `id, actual_rate_percent, actual_fee_percent, actual_term_months, closed_at,
         deals!inner ( id, deal_number, city, province, loan_amount_cents, position )`
      )
      .eq('broker_id', brokerId)
      .order('closed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      deal_id: row.deals.id,
      deal_number: row.deals.deal_number,
      city: row.deals.city,
      province: row.deals.province,
      loan_amount_cents: row.deals.loan_amount_cents,
      position: row.deals.position,
      actual_rate_percent: row.actual_rate_percent,
      actual_fee_percent: row.actual_fee_percent,
      actual_term_months: row.actual_term_months,
      counterparty: 'Lender',
      closed_at: row.closed_at,
    }));
  },
};
