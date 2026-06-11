// ============ Currency Formatting ============

export function formatCAD(cents: number, showDecimals = true): string {
  const dollars = cents / 100;
  if (showDecimals) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(dollars);
}

export function centsToCAD(cents: number): number {
  return cents / 100;
}

export function cadToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// ============ Number Formatting ============

export function formatPercent(value: number, decimals = 2): string {
  return value.toFixed(decimals) + '%';
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-CA').format(value);
}

// ============ Date/Time ============

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(dateString);
}

// ============ Validation ============

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 12;
}

export function isValidLoanAmount(cents: number): boolean {
  return cents >= 5000000; // min $50K
}

export function isValidLTV(ltv: number): boolean {
  return ltv > 0 && ltv <= 100;
}

export function isValidBeaconScore(score: number): boolean {
  return score >= 300 && score <= 900;
}

export function validateDealNumber(dealNumber: string): boolean {
  return /^\d{4}$/.test(dealNumber);
}

// ============ Deal Helpers ============

export function dealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    matched: 'Matched',
    negotiating: 'Negotiating',
    offer: 'Offer',
    funded: 'Funded',
    declined: 'Declined',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function dealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-700',
    matched: 'bg-amber-100 text-amber-700',
    negotiating: 'bg-purple-100 text-purple-700',
    offer: 'bg-cyan-100 text-cyan-700',
    funded: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

// ============ Offer Helpers ============

export function offerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    viewed: 'Viewed',
    countered: 'Countered',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'Expired',
  };
  return labels[status] || status;
}

// ============ Criteria Helpers ============

export function buildCriteriaPreview(
  assetClasses: string[],
  provinces: string[],
  ltv1: number,
  ltv2: number
): string {
  const classes = assetClasses.join(' & ');
  const provs = provinces.join(', ');
  return `${classes} · ${provs} · ≤ ${ltv1}% LTV`;
}

// ============ Match Score Helpers ============

export function matchScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-200';
  if (score >= 60) return 'bg-amber-200';
  if (score >= 30) return 'bg-yellow-200';
  return 'bg-gray-200';
}

export function matchScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 30) return 'Fair';
  return 'Poor';
}
