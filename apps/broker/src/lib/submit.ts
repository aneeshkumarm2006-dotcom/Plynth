// Pure helpers for the Submit-deal flow, extracted so they can be unit-tested
// independently of the React component. Behavior must stay identical to the
// original module-local definitions in Submit.tsx.
import type { DealSubmitInput } from '@plynth/supabase/services';

// UI property type → the deals.property_type enum (residential|commercial|land|multi-residential).
// Any value not in this map must fall back to a valid enum value (see mapPropertyType),
// otherwise a live insert is rejected by the enum constraint.
export const PROPERTY_TYPE_MAP: Record<string, DealSubmitInput['property_type']> = {
  Detached: 'residential',
  'Semi-detached': 'residential',
  Townhouse: 'residential',
  Condominium: 'residential',
  'Multi-residential': 'multi-residential',
  Commercial: 'commercial',
  'Vacant land': 'land',
};

// Look up the enum value for a UI property-type label, falling back to
// 'residential' for anything unmapped (mirrors `?? 'residential'` in Submit).
export function mapPropertyType(label: string): DealSubmitInput['property_type'] {
  return PROPERTY_TYPE_MAP[label] ?? 'residential';
}

// Parse a rate expectation like "8.5–11%" (or "8.5-11") into {rate_min, rate_max}.
// A single value ("9%") yields equal min/max; unparseable input yields {}.
export function parseRateRange(s: string): { rate_min?: number; rate_max?: number } {
  const m = s.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (m) return { rate_min: parseFloat(m[1]), rate_max: parseFloat(m[2]) };
  const one = s.match(/(\d+(?:\.\d+)?)/);
  return one ? { rate_min: parseFloat(one[1]), rate_max: parseFloat(one[1]) } : {};
}
