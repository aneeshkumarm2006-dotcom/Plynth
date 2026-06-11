import { supabase, hasSupabase } from '../client';
import { BROKER_MOCK } from '@plynth/shared/mock';

// Directory entry as the broker-facing Lenders page renders it. Criteria are
// visible; contact info is intentionally omitted (brokers reach lenders only
// through deal flow).
export interface LenderDirectoryEntry {
  id: string;
  name: string;
  type: string;
  region: string;
  assets: string;
  ltv: string;
  size: string;
  speed: string;
}

const LENDER_TYPE_LABELS: Record<string, string> = {
  mic: 'Mortgage Investment Corp.',
  private_lender: 'Private Lender',
  family_office: 'Family Office',
  debt_fund: 'Debt Fund',
};

function moneyShort(cents: number): string {
  const d = cents / 100;
  if (d >= 1_000_000) return '$' + (d / 1_000_000).toFixed(d % 1_000_000 === 0 ? 0 : 1) + 'M';
  return '$' + Math.round(d / 1_000) + 'K';
}

export const lendersService = {
  async listDirectory(): Promise<LenderDirectoryEntry[]> {
    if (!hasSupabase || !supabase) {
      return BROKER_MOCK.lenders.map((l, i) => ({ id: 'mock-lender-' + i, ...l }));
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `id, firm_name, lender_type,
         lender_criteria ( asset_classes, provinces, ltv_max_first_position, loan_min_cents, loan_max_cents, close_speed_days_min, close_speed_days_max )`
      )
      .eq('role', 'lender');
    if (error) throw error;
    return (data ?? []).map((row: any) => {
      const c = Array.isArray(row.lender_criteria) ? row.lender_criteria[0] : row.lender_criteria;
      return {
        id: row.id,
        name: row.firm_name ?? 'Lender',
        type: LENDER_TYPE_LABELS[row.lender_type] ?? row.lender_type ?? '',
        region: c?.provinces?.join(' · ') ?? '—',
        assets: c?.asset_classes?.join(', ') ?? '—',
        ltv: c ? `Up to ${c.ltv_max_first_position}%` : '—',
        size: c ? `${moneyShort(c.loan_min_cents)} – ${moneyShort(c.loan_max_cents)}` : '—',
        speed: c ? `${c.close_speed_days_min}–${c.close_speed_days_max} days` : '—',
      };
    });
  },
};
