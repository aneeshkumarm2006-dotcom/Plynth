// ============ Enums & Constants ============

export type Province = 'ON' | 'QC' | 'BC' | 'AB' | 'MB' | 'SK' | 'NS' | 'NB' | 'PE' | 'NL';
export const PROVINCES: Province[] = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL'];

export type AssetClass = 'Residential 1st' | 'Residential 2nd' | 'Commercial' | 'Land' | 'Construction' | 'Multi-residential';
export const ASSET_CLASSES: AssetClass[] = ['Residential 1st', 'Residential 2nd', 'Commercial', 'Land', 'Construction', 'Multi-residential'];

export type UserRole = 'broker' | 'lender';

export type BrokerLicenseProvince = 'ON' | 'QC' | 'BC' | 'AB';

export type LenderType = 'mic' | 'private_lender' | 'family_office' | 'debt_fund';

export type SubscriptionTier = 'startup' | 'professional' | 'institutional';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type Position = 'first' | 'second' | 'third+';

export type PropertyType = 'residential' | 'commercial' | 'land' | 'multi-residential';

export type DealStatus = 'draft' | 'active' | 'matched' | 'negotiating' | 'offer' | 'funded' | 'declined' | 'expired';

export type OfferStatus = 'submitted' | 'viewed' | 'countered' | 'accepted' | 'rejected' | 'expired';

export type OfferInitiator = 'lender' | 'broker';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type NotificationType = 'offer_received' | 'offer_countered' | 'new_match' | 'deal_funded' | 'criteria_updated';

// ============ Domain Models ============

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  verification_status: VerificationStatus;
}

export interface BrokerProfile extends UserProfile {
  role: 'broker';
  brokerage_name: string;
  fsra_license_number: string;
  fsra_province: BrokerLicenseProvince;
  first_name: string;
  last_name: string;
}

export interface LenderProfile extends UserProfile {
  role: 'lender';
  firm_name: string;
  lender_type: LenderType;
  tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
}

export interface Deal {
  id: string;
  broker_id: string;
  deal_number: string;

  // Property
  city: string;
  province: Province;
  neighbourhood?: string;
  property_address?: string;
  property_type?: PropertyType;
  asset_class: AssetClass;

  // Loan
  loan_amount_cents: number;
  estimated_value_cents?: number;
  ltv: number;
  position: Position;

  // Terms
  term_months: number;
  rate_min?: number;
  rate_max?: number;
  requested_rate_range?: string;

  // Borrower
  borrower_name?: string;
  beacon_score?: number;
  is_self_employed?: boolean;
  has_bfs_acceptable?: boolean;

  // Status
  status: DealStatus;
  submitted_at?: string;
  closing_target_date?: string;

  // Metadata
  borrower_details_revealed_to?: string[];
  exclusion_flags?: string[];
  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface LenderCriteria {
  id: string;
  lender_id: string;

  asset_classes: AssetClass[];
  provinces: Province[];
  cities?: string[];

  loan_min_cents: number;
  loan_max_cents: number;

  ltv_max_first_position: number;
  ltv_max_second_position: number;

  term_min_months: number;
  term_max_months: number;

  min_beacon_score: number;
  accept_bfs_borrowers: boolean;

  monthly_deployment_target_cents: number;
  available_capital_cents: number;
  close_speed_days_min: number;
  close_speed_days_max: number;

  exclusion_flags: string[];

  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  deal_id: string;
  lender_id: string;

  rate_percent: number;
  lender_fee_percent?: number;
  broker_fee_percent?: number;
  term_months?: number;
  max_ltv?: number;

  conditions_text?: string;

  status: OfferStatus;
  is_best_offer: boolean;

  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OfferHistory {
  id: string;
  offer_id: string;

  initiated_by: OfferInitiator;

  rate_percent?: number;
  lender_fee_percent?: number;
  broker_fee_percent?: number;

  broker_note?: string;

  created_at: string;
}

export interface Funding {
  id: string;
  deal_id: string;
  offer_id: string;

  broker_id: string;
  lender_id: string;

  actual_rate_percent: number;
  actual_fee_percent?: number;
  actual_term_months: number;

  closed_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;

  notification_type: NotificationType;
  entity_type?: string;
  entity_id?: string;

  title: string;
  message?: string;
  is_read: boolean;

  created_at: string;
}

export interface LenderDealInteraction {
  id: string;
  lender_id: string;
  deal_id: string;

  matched_at: string;
  match_score?: number;
  views_count: number;
  borrower_details_revealed: boolean;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;

  action: string;
  entity_type?: string;
  entity_id?: string;

  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;

  created_at: string;
}

// ============ API Request/Response Types ============

export interface SignupRequestBroker {
  email: string;
  password: string;
  brokerage_name: string;
  fsra_province: BrokerLicenseProvince;
  fsra_license_number: string;
  first_name: string;
  last_name: string;
}

export interface SignupRequestLender {
  email: string;
  password: string;
  firm_name: string;
  lender_type: LenderType;
  tier?: SubscriptionTier;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  role: UserRole;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface DealSubmitRequest {
  deal_number: string;
  city: string;
  province: Province;
  neighbourhood?: string;
  asset_class: AssetClass;
  loan_amount: number;
  estimated_value?: number;
  ltv: number;
  position: Position;
  term_months: number;
  rate_min?: number;
  rate_max?: number;
  borrower_name?: string;
  beacon_score?: number;
  is_self_employed?: boolean;
  has_bfs_acceptable?: boolean;
  exclusion_flags?: string[];
  closing_target_date?: string;
  notes?: string;
}

export interface OfferSubmitRequest {
  deal_id: string;
  rate: number;
  lender_fee?: number;
  broker_fee?: number;
  term?: number;
  max_ltv?: number;
  conditions?: string;
  note?: string;
  expires_in_days?: number;
}

export interface CriteriaUpdateRequest {
  asset_classes?: AssetClass[];
  provinces?: Province[];
  cities?: string[];
  loan_min?: number;
  loan_max?: number;
  ltv_max_first?: number;
  ltv_max_second?: number;
  term_min?: number;
  term_max?: number;
  min_beacon_score?: number;
  accept_bfs?: boolean;
  monthly_deployment_target?: number;
  available_capital?: number;
  close_speed_min?: number;
  close_speed_max?: number;
  exclusion_flags?: string[];
}

export interface DealCardData {
  id: string;
  deal_number: string;
  city: string;
  province: Province;
  amount: number;
  position: Position;
  ltv: number;
  term: number;
  status: DealStatus;
  offers_count?: number;
  views_count?: number;
  match_score?: number;
  summary?: string;
  updated_at: string;
}

export interface StatBlock {
  value: string;
  label: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
  unit?: string;
}

export interface BrokerDashboardData {
  stats: StatBlock[];
  focus_deal: DealCardData | null;
  recent_offers: Offer[];
  awaiting_offers: Deal[];
  recent_funded: Funding[];
}

export interface LenderDashboardData {
  stats: StatBlock[];
  sidebar_stats: {
    win_rate: string;
    avg_response: string;
    criteria_preview: string;
  };
  focus_deal: (DealCardData & { match_score: number }) | null;
  matched: (DealCardData & { match_score: number })[];
  comparables: Funding[];
  pipeline: {
    Reviewing: DealCardData[];
    Offered: DealCardData[];
    'In Negotiation': DealCardData[];
    Funded: DealCardData[];
    Dead: DealCardData[];
  };
}

export interface LivePreviewData {
  estimated_matches: number;
  sample_matches: DealCardData[];
  estimated_monthly_volume: number;
}

// ============ UI/Component Props ============

export interface FormErrorMap {
  [fieldName: string]: string;
}
