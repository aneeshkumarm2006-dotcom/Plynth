import { describe, it, expect } from 'vitest';
import {
  parseRateRange,
  mapPropertyType,
  PROPERTY_TYPE_MAP,
} from '@broker/src/lib/submit';

// test.md §1, §4.1, §5(1) and worklog §3: the property_type enum fix and the
// rate-range parser. Both were module-local in Submit.tsx and untestable;
// extracted to apps/broker/src/lib/submit.ts.

const VALID_ENUM = new Set(['residential', 'commercial', 'land', 'multi-residential']);

describe('parseRateRange', () => {
  it('parses an en-dash range with a trailing percent', () => {
    expect(parseRateRange('8.5–11%')).toEqual({ rate_min: 8.5, rate_max: 11 });
  });

  it('parses a hyphen range', () => {
    expect(parseRateRange('8.5-11')).toEqual({ rate_min: 8.5, rate_max: 11 });
  });

  it('treats a single value as equal min/max', () => {
    expect(parseRateRange('9%')).toEqual({ rate_min: 9, rate_max: 9 });
  });

  it('returns an empty object for unparseable input', () => {
    expect(parseRateRange('garbage')).toEqual({});
    expect(parseRateRange('')).toEqual({});
  });

  it('tolerates whitespace around the separator', () => {
    expect(parseRateRange('8.5 – 11 %')).toEqual({ rate_min: 8.5, rate_max: 11 });
  });

  it('parses integer-only ranges', () => {
    expect(parseRateRange('9–12')).toEqual({ rate_min: 9, rate_max: 12 });
  });
});

describe('PROPERTY_TYPE_MAP / mapPropertyType', () => {
  // Every UI option present in Submit.tsx's <select>.
  const UI_OPTIONS = [
    'Detached',
    'Semi-detached',
    'Townhouse',
    'Condominium',
    'Multi-residential',
    'Commercial',
    'Vacant land',
  ];

  it('maps every UI option to a VALID enum value', () => {
    for (const opt of UI_OPTIONS) {
      const enumVal = mapPropertyType(opt);
      expect(VALID_ENUM.has(enumVal as string), `${opt} -> ${enumVal}`).toBe(true);
    }
  });

  it('maps the specific residential-family labels to residential', () => {
    expect(mapPropertyType('Detached')).toBe('residential');
    expect(mapPropertyType('Semi-detached')).toBe('residential');
    expect(mapPropertyType('Townhouse')).toBe('residential');
    expect(mapPropertyType('Condominium')).toBe('residential');
  });

  it('maps the distinct asset classes to their enum values', () => {
    expect(mapPropertyType('Multi-residential')).toBe('multi-residential');
    expect(mapPropertyType('Commercial')).toBe('commercial');
    expect(mapPropertyType('Vacant land')).toBe('land');
  });

  it('falls back to residential for an unknown label (never an invalid enum)', () => {
    // Regression for the original bug where 'Detached' (or any raw label) would be
    // sent straight into the enum column and rejected by the DB.
    expect(mapPropertyType('Castle')).toBe('residential');
    expect(mapPropertyType('')).toBe('residential');
    expect(VALID_ENUM.has(mapPropertyType('totally-unknown') as string)).toBe(true);
  });

  it('exposes the same options on the const as the helper resolves', () => {
    for (const opt of UI_OPTIONS) {
      expect(PROPERTY_TYPE_MAP[opt]).toBe(mapPropertyType(opt));
    }
  });
});
