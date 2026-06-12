import { formatMoneyShort } from '@plynth/shared/utils';

// Compact money from cents → editorial "$42.7M" / "$680K".
// formatMoneyShort takes whole dollars, so divide cents first.
export function moneyShortFromCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '$0';
  return formatMoneyShort(Math.round(cents / 100));
}

// Humanize raw audit-log action strings into editorial phrases.
const ACTION_PHRASES: Record<string, string> = {
  'deal.created': 'submitted a deal',
  'offer.created': 'made an offer',
  'deal.status_changed': 'changed deal status',
  'session.login': 'signed in',
  'admin.set_verification': 'updated verification',
};

export function humanizeAction(action: string): string {
  return ACTION_PHRASES[action] ?? action.replace(/[._]/g, ' ');
}
