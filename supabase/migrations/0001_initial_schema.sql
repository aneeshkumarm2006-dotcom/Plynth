-- ============ Enums ============

CREATE TYPE province_code AS ENUM ('ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL');

CREATE TYPE asset_class AS ENUM (
  'Residential 1st',
  'Residential 2nd',
  'Commercial',
  'Land',
  'Construction',
  'Multi-residential'
);

CREATE TYPE user_role AS ENUM ('broker', 'lender');

CREATE TYPE lender_type AS ENUM ('mic', 'private_lender', 'family_office', 'debt_fund');

CREATE TYPE subscription_tier AS ENUM ('startup', 'professional', 'institutional');

CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');

CREATE TYPE loan_position AS ENUM ('first', 'second', 'third+');

CREATE TYPE property_type AS ENUM ('residential', 'commercial', 'land', 'multi-residential');

CREATE TYPE deal_status AS ENUM ('draft', 'active', 'matched', 'negotiating', 'offer', 'funded', 'declined', 'expired');

CREATE TYPE offer_status AS ENUM ('submitted', 'viewed', 'countered', 'accepted', 'rejected', 'expired');

CREATE TYPE offer_initiator AS ENUM ('lender', 'broker');

CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE notification_type AS ENUM ('offer_received', 'offer_countered', 'new_match', 'deal_funded', 'criteria_updated');

CREATE TYPE broker_license_province AS ENUM ('ON', 'QC', 'BC', 'AB');

-- ============ Tables ============

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  role user_role NOT NULL,
  email TEXT NOT NULL UNIQUE,

  -- Broker-specific
  brokerage_name TEXT,
  fsra_license_number TEXT,
  fsra_province broker_license_province,
  first_name TEXT,
  last_name TEXT,

  -- Lender-specific
  firm_name TEXT,
  lender_type lender_type,
  tier subscription_tier DEFAULT 'professional',
  subscription_status subscription_status DEFAULT 'active',

  -- Shared
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status verification_status DEFAULT 'pending',

  CONSTRAINT broker_role_check CHECK (
    (role = 'broker' AND brokerage_name IS NOT NULL AND fsra_license_number IS NOT NULL)
    OR role != 'broker'
  ),
  CONSTRAINT lender_role_check CHECK (
    (role = 'lender' AND firm_name IS NOT NULL AND lender_type IS NOT NULL)
    OR role != 'lender'
  )
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_verification ON user_profiles(is_verified);

-- ============ Deals ============

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  deal_number TEXT NOT NULL,

  -- Property & loan params
  city TEXT NOT NULL,
  province province_code NOT NULL,
  neighbourhood TEXT,
  property_address TEXT,
  property_type property_type,
  asset_class asset_class NOT NULL,

  loan_amount_cents BIGINT NOT NULL,
  estimated_value_cents BIGINT,
  ltv DECIMAL(5,2) NOT NULL,
  position loan_position NOT NULL,

  -- Terms
  term_months INT NOT NULL,
  rate_min DECIMAL(5,2),
  rate_max DECIMAL(5,2),
  requested_rate_range TEXT,

  -- Borrower
  borrower_name TEXT,
  beacon_score INT,
  is_self_employed BOOLEAN DEFAULT FALSE,
  has_bfs_acceptable BOOLEAN DEFAULT FALSE,

  -- Status
  status deal_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  closing_target_date DATE,

  -- Metadata
  borrower_details_revealed_to TEXT[] DEFAULT ARRAY[]::TEXT[],
  exclusion_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_ltv CHECK (ltv > 0 AND ltv <= 100),
  CONSTRAINT valid_loan_amount CHECK (loan_amount_cents >= 5000000),
  CONSTRAINT unique_deal_number UNIQUE (broker_id, deal_number)
);

CREATE INDEX idx_deals_broker_id ON deals(broker_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_province_asset ON deals(province, asset_class, status);
CREATE INDEX idx_deals_ltv_position ON deals(ltv, position);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);

-- ============ Lender Criteria ============

CREATE TABLE lender_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Asset classes
  asset_classes asset_class[] DEFAULT ARRAY['Residential 1st', 'Residential 2nd']::asset_class[],

  -- Geography
  provinces province_code[] DEFAULT ARRAY['ON', 'QC']::province_code[],
  cities TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Loan sizing
  loan_min_cents BIGINT DEFAULT 15000000,
  loan_max_cents BIGINT DEFAULT 200000000,

  -- LTV constraints
  ltv_max_first_position INT DEFAULT 80,
  ltv_max_second_position INT DEFAULT 80,

  -- Term
  term_min_months INT DEFAULT 6,
  term_max_months INT DEFAULT 24,

  -- Borrower profile
  min_beacon_score INT DEFAULT 640,
  accept_bfs_borrowers BOOLEAN DEFAULT TRUE,

  -- Capacity
  monthly_deployment_target_cents BIGINT DEFAULT 500000000,
  available_capital_cents BIGINT DEFAULT 1800000000,
  close_speed_days_min INT DEFAULT 7,
  close_speed_days_max INT DEFAULT 10,

  -- Exclusions
  exclusion_flags TEXT[] DEFAULT ARRAY[]::TEXT[],

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  version INT DEFAULT 1,

  CONSTRAINT valid_loan_range CHECK (loan_min_cents <= loan_max_cents),
  CONSTRAINT valid_term_range CHECK (term_min_months <= term_max_months)
);

CREATE INDEX idx_lender_criteria_lender_id ON lender_criteria(lender_id);

-- ============ Offers ============

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  lender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Terms offered
  rate_percent DECIMAL(5,2) NOT NULL,
  lender_fee_percent DECIMAL(5,2),
  broker_fee_percent DECIMAL(5,2),
  term_months INT,
  max_ltv DECIMAL(5,2),

  -- Conditions
  conditions_text TEXT,

  -- Status
  status offer_status DEFAULT 'submitted',
  is_best_offer BOOLEAN DEFAULT FALSE,

  -- Timeline
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_rate CHECK (rate_percent > 0 AND rate_percent < 100),
  CONSTRAINT unique_lender_per_deal UNIQUE (deal_id, lender_id)
);

CREATE INDEX idx_offers_deal_id ON offers(deal_id);
CREATE INDEX idx_offers_lender_id ON offers(lender_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_expires_at ON offers(expires_at);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);

-- ============ Offer History (Counter-offers) ============

CREATE TABLE offer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,

  initiated_by offer_initiator NOT NULL,

  rate_percent DECIMAL(5,2),
  lender_fee_percent DECIMAL(5,2),
  broker_fee_percent DECIMAL(5,2),

  broker_note TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_offer_history_offer_id ON offer_history(offer_id);
CREATE INDEX idx_offer_history_created_at ON offer_history(created_at DESC);

-- ============ Fundings (Closed Deals) ============

CREATE TABLE fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id),

  broker_id UUID NOT NULL REFERENCES user_profiles(id),
  lender_id UUID NOT NULL REFERENCES user_profiles(id),

  actual_rate_percent DECIMAL(5,2),
  actual_fee_percent DECIMAL(5,2),
  actual_term_months INT,

  closed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fundings_broker_id ON fundings(broker_id, closed_at DESC);
CREATE INDEX idx_fundings_lender_id ON fundings(lender_id, closed_at DESC);
CREATE INDEX idx_fundings_deal_id ON fundings(deal_id);

-- ============ Notifications ============

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  notification_type notification_type NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- ============ Lender-Deal Interactions ============

CREATE TABLE lender_deal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  matched_at TIMESTAMPTZ DEFAULT now(),
  match_score INT DEFAULT 0,
  views_count INT DEFAULT 0,
  borrower_details_revealed BOOLEAN DEFAULT FALSE,

  CONSTRAINT unique_lender_deal UNIQUE (lender_id, deal_id),
  CONSTRAINT valid_match_score CHECK (match_score >= 0 AND match_score <= 100)
);

CREATE INDEX idx_lender_deal_interactions_lender_id ON lender_deal_interactions(lender_id);
CREATE INDEX idx_lender_deal_interactions_deal_id ON lender_deal_interactions(deal_id);
CREATE INDEX idx_lender_deal_interactions_matched_at ON lender_deal_interactions(lender_id, matched_at DESC);

-- ============ Audit Log ============

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),

  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  changes JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ============ Enable RLS ============

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_deal_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
