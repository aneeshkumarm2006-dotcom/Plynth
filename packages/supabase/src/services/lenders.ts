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
    // Served through the column-whitelisted lender_directory() RPC
    // (migration 0017). The old direct SELECT on user_profiles was
    // backed by a cross-role policy that also exposed every lender's
    // email + FSRA license number to any broker; that policy is gone.
    const { data, error } = await supabase.rpc('lender_directory');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.firm_name ?? 'Lender',
      type: LENDER_TYPE_LABELS[row.lender_type] ?? row.lender_type ?? '',
      region: row.provinces?.join(' · ') ?? '—',
      assets: row.asset_classes?.join(', ') ?? '—',
      ltv: row.ltv_max_first_position != null ? `Up to ${row.ltv_max_first_position}%` : '—',
      size:
        row.loan_min_cents != null && row.loan_max_cents != null
          ? `${moneyShort(row.loan_min_cents)} – ${moneyShort(row.loan_max_cents)}`
          : '—',
      speed:
        row.close_speed_days_min != null
          ? `${row.close_speed_days_min}–${row.close_speed_days_max} days`
          : '—',
    }));
  },
};
