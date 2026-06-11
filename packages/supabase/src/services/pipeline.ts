import { hasSupabase } from '../client';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { matchedService } from './matched';
import { offersService } from './offers';
import { fundingsService } from './fundings';

export interface PipelineCard {
  no: string;
  deal_id: string;
  city: string;
  amount: string; // display string, e.g. "$425,000"
  score: number;
}

export type PipelineColumn = 'Reviewing' | 'Offered' | 'In Negotiation' | 'Funded' | 'Dead';
export type PipelineColumns = Record<PipelineColumn, PipelineCard[]>;

const EMPTY: PipelineColumns = {
  Reviewing: [],
  Offered: [],
  'In Negotiation': [],
  Funded: [],
  Dead: [],
};

function dollars(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-CA');
}

export const pipelineService = {
  async forLender(lenderId: string): Promise<PipelineColumns> {
    if (!hasSupabase) {
      // Mock fixture already carries the grouped shape, sans deal_id.
      const m = LENDER_MOCK.pipeline as Record<PipelineColumn, Array<{ no: string; city: string; amount: string; score: number }>>;
      const cols = { ...EMPTY } as PipelineColumns;
      (Object.keys(m) as PipelineColumn[]).forEach((k) => {
        cols[k] = m[k].map((c) => ({ ...c, deal_id: c.no }));
      });
      return cols;
    }

    const [matched, offers, fundings] = await Promise.all([
      matchedService.listForLender(lenderId),
      offersService.listForLender(lenderId),
      fundingsService.listForLender(lenderId),
    ]);

    // Index matched deals by id so offer/funding rows can borrow display fields.
    const byId = new Map(matched.map((d) => [d.deal_id, d]));
    const card = (dealId: string, fallback?: Partial<PipelineCard>): PipelineCard => {
      const d = byId.get(dealId);
      return {
        no: d?.deal_number ?? fallback?.no ?? dealId,
        deal_id: dealId,
        city: d ? `${d.city}, ${d.province}` : fallback?.city ?? '',
        amount: d ? dollars(d.loan_amount_cents) : fallback?.amount ?? '',
        score: d?.match_score ?? fallback?.score ?? 0,
      };
    };

    const cols: PipelineColumns = { Reviewing: [], Offered: [], 'In Negotiation': [], Funded: [], Dead: [] };
    const dealsWithOffers = new Set<string>();

    for (const o of offers) {
      dealsWithOffers.add(o.deal_id);
      if (o.status === 'submitted' || o.status === 'viewed') cols.Offered.push(card(o.deal_id));
      else if (o.status === 'countered') cols['In Negotiation'].push(card(o.deal_id));
      else if (o.status === 'rejected' || o.status === 'expired') cols.Dead.push(card(o.deal_id));
      // 'accepted' is represented by the funding row below.
    }

    for (const f of fundings) {
      cols.Funded.push(card(f.deal_id, { no: f.deal_number, city: f.city, amount: dollars(f.loan_amount_cents) }));
    }

    // Matched deals the lender hasn't acted on yet sit in Reviewing.
    for (const d of matched) {
      if (!dealsWithOffers.has(d.deal_id)) cols.Reviewing.push(card(d.deal_id));
    }

    return cols;
  },
};
