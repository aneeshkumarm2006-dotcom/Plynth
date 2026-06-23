// Realistic Canadian mock data for the broker and lender portals.
// Used until Supabase is wired up; mirrors what the real queries will return.

export interface MockDeal {
  no: string;
  city: string;
  region?: string;
  amount: string;
  position: string;
  ltv: string;
  term: string;
  status?: string;
  asset?: string;
  score?: number;
  summary?: string;
  age?: string;
  offers?: number;
  views?: number;
  updated?: string;
}

export interface MockOffer {
  id: string;
  no: string;
  type: string;
  rate: string;
  lenderFee: string;
  brokerFee: string;
  term: string;
  ltv: string;
  conditions: string;
  expires: string;
  note?: string;
  best?: boolean;
  lender?: string;
  fee?: string;
  city?: string;
}

export const BROKER_MOCK = {
  user: {
    first: 'Marcus',
    name: 'Marcus Chen',
    brokerage: 'Northbridge Mortgage Partners',
    initials: 'MC',
    license: 'FSRA M08009124',
    province: 'Ontario',
    email: 'marcus@northbridge.ca',
  },

  stats: [
    { value: '12', label: 'Active Deals' },
    { value: '7', label: 'Offers In', delta: '+3 this week', deltaDir: 'up' as const },
    { value: '$4.2', unit: 'M', label: 'Funded This Month' },
    { value: '$38.6', unit: 'M', label: 'Volume YTD' },
  ],

  focus: {
    no: '0247',
    city: 'Toronto, ON',
    neighbourhood: 'East York',
    amount: '$425,000',
    position: 'First mortgage',
    ltv: '72.0%',
    term: '12 months',
    rate: '8.5–11%',
    offers: 5,
    views: 31,
    quote:
      'A self-employed borrower with strong covenant, refinancing a detached home to consolidate. Five lenders are competing; the leading offer sits at 9.25% with a two-point fee.',
    status: 'negotiating',
  },

  newOffers: [
    { no: '0247', lender: 'MIC · Ontario', rate: '9.25%', fee: '2.0%', term: '12 mo', expires: '3 days', city: 'Toronto, ON' },
    { no: '0244', lender: 'Private Lender · BC', rate: '10.5%', fee: '2.5%', term: '9 mo', expires: '2 days', city: 'Burnaby, BC' },
    { no: '0239', lender: 'Debt Fund · National', rate: '8.75%', fee: '1.5%', term: '24 mo', expires: '5 days', city: 'Calgary, AB' },
  ],

  awaiting: [
    { no: '0251', city: 'Ottawa, ON', amount: '$680,000', ltv: '65.0%', term: '12 mo', submitted: '2 days ago', views: 14 },
    { no: '0249', city: 'Mississauga, ON', amount: '$1,250,000', ltv: '70.0%', term: '18 mo', submitted: '4 days ago', views: 22 },
  ],

  recentFunded: [
    { no: '0231', city: 'Hamilton, ON', amount: '$540,000', rate: '9.0%', closed: 'Jun 2' },
    { no: '0228', city: 'Vaughan, ON', amount: '$2,100,000', rate: '8.25%', closed: 'May 28' },
  ],

  pipeline: [
    { no: '0251', city: 'Ottawa, ON', amount: '$680,000', position: 'First', ltv: '65.0%', term: '12 mo', status: 'active', offers: 0, updated: '2d' },
    { no: '0249', city: 'Mississauga, ON', amount: '$1,250,000', position: 'First', ltv: '70.0%', term: '18 mo', status: 'active', offers: 2, updated: '4d' },
    { no: '0247', city: 'Toronto, ON', amount: '$425,000', position: 'First', ltv: '72.0%', term: '12 mo', status: 'negotiating', offers: 5, updated: '3h' },
    { no: '0244', city: 'Burnaby, BC', amount: '$890,000', position: 'Second', ltv: '78.0%', term: '9 mo', status: 'offer', offers: 1, updated: '1d' },
    { no: '0239', city: 'Calgary, AB', amount: '$3,400,000', position: 'First', ltv: '60.0%', term: '24 mo', status: 'offer', offers: 3, updated: '2d' },
    { no: '0236', city: 'London, ON', amount: '$312,000', position: 'Second', ltv: '80.0%', term: '12 mo', status: 'active', offers: 0, updated: '5d' },
    { no: '0233', city: 'Laval, QC', amount: '$755,000', position: 'First', ltv: '68.0%', term: '12 mo', status: 'draft', offers: 0, updated: '6d' },
  ],

  dealOffers: [
    {
      id: 'A',
      type: 'MIC · Ontario',
      rate: '9.25%',
      lenderFee: '2.0%',
      brokerFee: '1.0%',
      term: '12 months',
      ltv: '72.0%',
      conditions: 'Full appraisal, fire insurance, title',
      expires: '3 days',
      note: 'Open to a rate reduction at 70% LTV. Prefer registered first.',
      best: true,
    },
    {
      id: 'B',
      type: 'Private Lender · National',
      rate: '9.75%',
      lenderFee: '1.5%',
      brokerFee: '1.0%',
      term: '12 months',
      ltv: '72.0%',
      conditions: 'Drive-by appraisal acceptable',
      expires: '5 days',
      note: 'Can close in 7 business days.',
    },
    {
      id: 'C',
      type: 'Debt Fund · Ontario',
      rate: '8.95%',
      lenderFee: '2.5%',
      brokerFee: '0.5%',
      term: '18 months',
      ltv: '70.0%',
      conditions: 'Full appraisal, income verification',
      expires: '2 days',
      note: 'Requires LTV at or below 70%.',
    },
  ],

  // A live lender-side negotiation, so demo mode can show the broker's
  // counter with the Accept / Counter-back actions (deal mock-0236).
  // Other deals return no offer and fall back to the blank composer.
  negotiation: {
    dealId: 'mock-0236',
    lenderId: '22222222-2222-2222-2222-222222222222',
    myOffer: {
      id: 'mock-offer-0236',
      deal_id: 'mock-0236',
      lender_id: '22222222-2222-2222-2222-222222222222',
      rate_percent: 10.5,
      lender_fee_percent: 2.5,
      broker_fee_percent: 1.0,
      term_months: 12,
      max_ltv: 80,
      conditions_text: 'Full appraisal, fire insurance, title',
      status: 'countered' as const,
      is_best_offer: false,
      expires_at: '2026-06-24T00:00:00Z',
      created_at: '2026-06-11T00:00:00Z',
      updated_at: '2026-06-12T00:00:00Z',
    },
    history: [
      {
        initiated_by: 'broker' as const,
        rate_percent: 9.75,
        lender_fee_percent: 2.0,
        broker_fee_percent: 1.0,
        broker_note: 'Borrower is strong and ready to sign today. Can you meet 9.75% and trim the fee to 2.0%?',
        created_at: '2026-06-12T00:00:00Z',
      },
      {
        initiated_by: 'lender' as const,
        rate_percent: 10.5,
        lender_fee_percent: 2.5,
        broker_fee_percent: 1.0,
        broker_note: null,
        created_at: '2026-06-11T00:00:00Z',
      },
    ],
  },

  activity: [
    { t: '3 hours ago', e: 'Lender C submitted an offer at 8.95%.' },
    { t: 'Today, 9:14', e: 'You countered Lender A at 9.0%.' },
    { t: 'Yesterday', e: 'Lender A submitted an offer at 9.25%.' },
    { t: 'Yesterday', e: 'Borrower details revealed to Lender A.' },
    { t: '2 days ago', e: 'Lender B submitted an offer at 9.75%.' },
    { t: '3 days ago', e: 'Deal № 0247 submitted to the marketplace.' },
  ],

  lenders: [
    { name: 'Fortress MIC', type: 'Mortgage Investment Corp.', region: 'ON · QC', assets: 'Residential 1st & 2nd, Commercial', ltv: 'Up to 80%', size: '$150K – $2M', speed: '5–10 days' },
    { name: 'Cardinal Private Capital', type: 'Private Lender', region: 'National', assets: 'Residential 1st, Construction', ltv: 'Up to 75%', size: '$250K – $5M', speed: '7–14 days' },
    { name: 'Bridgewater Funds', type: 'Debt Fund', region: 'ON · AB · BC', assets: 'Commercial, Land', ltv: 'Up to 65%', size: '$1M – $20M', speed: '10–21 days' },
    { name: 'Northpine Lending', type: 'Mortgage Investment Corp.', region: 'BC', assets: 'Residential 1st & 2nd', ltv: 'Up to 78%', size: '$100K – $1.5M', speed: '5–7 days' },
    { name: 'Meridian Capital', type: 'Family Office', region: 'ON', assets: 'Commercial, Residential 1st', ltv: 'Up to 70%', size: '$500K – $10M', speed: '14–21 days' },
    { name: 'Slate River Mortgage', type: 'Private Lender', region: 'QC', assets: 'Residential 1st & 2nd, Land', ltv: 'Up to 75%', size: '$150K – $3M', speed: '7–10 days' },
  ],

  funded: [
    { no: '0231', city: 'Hamilton, ON', amount: '$540,000', position: 'First', rate: '9.0%', fee: '2.0%', term: '12 mo', lender: 'MIC · Ontario', closed: 'Jun 2, 2026' },
    { no: '0228', city: 'Vaughan, ON', amount: '$2,100,000', position: 'First', rate: '8.25%', fee: '1.5%', term: '24 mo', lender: 'Debt Fund', closed: 'May 28, 2026' },
    { no: '0224', city: 'Kitchener, ON', amount: '$415,000', position: 'Second', rate: '11.0%', fee: '2.5%', term: '12 mo', lender: 'Private Lender', closed: 'May 19, 2026' },
    { no: '0219', city: 'Victoria, BC', amount: '$725,000', position: 'First', rate: '8.75%', fee: '2.0%', term: '18 mo', lender: 'MIC · BC', closed: 'May 11, 2026' },
    { no: '0215', city: 'Markham, ON', amount: '$1,680,000', position: 'First', rate: '8.5%', fee: '1.5%', term: '24 mo', lender: 'Family Office', closed: 'Apr 30, 2026' },
    { no: '0210', city: 'Gatineau, QC', amount: '$398,000', position: 'Second', rate: '10.5%', fee: '2.5%', term: '12 mo', lender: 'Private Lender', closed: 'Apr 22, 2026' },
  ],
};

export const LENDER_MOCK = {
  user: {
    name: 'Eleanor Whitfield',
    firm: 'Fortress MIC',
    initials: 'EW',
    type: 'Mortgage Investment Corp.',
    tier: 'Professional',
    email: 'eleanor@fortressmic.ca',
  },

  stats: [
    { value: '9', label: 'New Matches', delta: '+4 today', deltaDir: 'up' as const },
    { value: '5', label: 'Offers Out' },
    { value: '$22.4', unit: 'M', label: 'Funded YTD' },
    { value: '68', unit: '%', label: 'Deployment Rate' },
  ],

  sidebarStats: {
    winRate: '31%',
    avgResponse: '6.2 hrs',
    criteria: 'Residential 1st & 2nd · ON, QC · ≤ 80% LTV',
  },

  focus: {
    no: '0247',
    city: 'Toronto, ON',
    neighbourhood: 'East York',
    amount: '$425,000',
    position: 'First mortgage',
    ltv: '72.0%',
    term: '12 months',
    score: 94,
    quote:
      'A conservative first at 72% against a fresh East York appraisal — squarely in your residential band, with an owner-occupant covenant and a clean refinance exit. Three lenders are circling; none has matched your typical close speed.',
  },

  matched: [
    { no: '0247', city: 'Toronto, ON', region: 'East York', amount: '$425,000', position: 'First', ltv: '72.0%', term: '12 mo', score: 94, asset: 'Residential 1st', summary: 'Self-employed borrower refinancing a detached home to consolidate. Strong covenant, conservative position.', age: '2h' },
    { no: '0251', city: 'Ottawa, ON', region: 'Westboro', amount: '$680,000', position: 'First', ltv: '65.0%', term: '12 mo', score: 88, asset: 'Residential 1st', summary: 'Equity take-out on a semi-detached for a renovation. Salaried borrower, low leverage.', age: '5h' },
    { no: '0244', city: 'Burnaby, BC', region: 'Metrotown', amount: '$890,000', position: 'Second', ltv: '78.0%', term: '9 mo', score: 81, asset: 'Residential 2nd', summary: 'Second behind an institutional first; bridge to a spring sale. Higher leverage, short term.', age: '1d' },
    { no: '0239', city: 'Calgary, AB', region: 'Beltline', amount: '$3,400,000', position: 'First', ltv: '60.0%', term: '24 mo', score: 76, asset: 'Commercial', summary: 'Mixed-use commercial refinance, stabilized tenancy. Outside your usual size band.', age: '2d' },
    { no: '0236', city: 'London, ON', region: 'Old North', amount: '$312,000', position: 'Second', ltv: '80.0%', term: '12 mo', score: 72, asset: 'Residential 2nd', summary: 'Second mortgage for debt consolidation. At the top of your LTV tolerance.', age: '3d' },
  ],

  comparables: [
    { no: '0231', city: 'Hamilton, ON', amount: '$540,000', rate: '9.0%', ltv: '68%', closed: 'Jun 2' },
    { no: '0224', city: 'Kitchener, ON', amount: '$415,000', rate: '9.25%', ltv: '71%', closed: 'May 19' },
    { no: '0212', city: 'Toronto, ON', amount: '$460,000', rate: '8.75%', ltv: '70%', closed: 'May 4' },
  ],

  pipeline: {
    Reviewing: [
      { no: '0251', city: 'Ottawa, ON', amount: '$680,000', score: 88 },
      { no: '0236', city: 'London, ON', amount: '$312,000', score: 72 },
    ],
    Offered: [
      { no: '0247', city: 'Toronto, ON', amount: '$425,000', score: 94 },
      { no: '0244', city: 'Burnaby, BC', amount: '$890,000', score: 81 },
    ],
    'In Negotiation': [{ no: '0233', city: 'Laval, QC', amount: '$755,000', score: 85 }],
    Funded: [
      { no: '0231', city: 'Hamilton, ON', amount: '$540,000', score: 91 },
      { no: '0224', city: 'Kitchener, ON', amount: '$415,000', score: 86 },
    ],
    Dead: [{ no: '0218', city: 'Surrey, BC', amount: '$1,100,000', score: 64 }],
  },

  funded: [
    { no: '0231', city: 'Hamilton, ON', amount: '$540,000', position: 'First', rate: '9.0%', term: '12 mo', broker: 'Anonymized', closed: 'Jun 2, 2026' },
    { no: '0224', city: 'Kitchener, ON', amount: '$415,000', position: 'Second', rate: '9.25%', term: '12 mo', broker: 'Anonymized', closed: 'May 19, 2026' },
    { no: '0212', city: 'Toronto, ON', amount: '$460,000', position: 'First', rate: '8.75%', term: '18 mo', broker: 'Anonymized', closed: 'May 4, 2026' },
    { no: '0205', city: 'Oshawa, ON', amount: '$298,000', position: 'Second', rate: '10.5%', term: '12 mo', broker: 'Anonymized', closed: 'Apr 18, 2026' },
  ],

  criteria: {
    assets: ['Residential 1st', 'Residential 2nd'],
    provinces: ['ON', 'QC'],
    cities: ['Toronto', 'Ottawa', 'Montréal'],
    loanMin: 150000,
    loanMax: 2000000,
    ltv1: 75,
    ltv2: 80,
    termMin: 6,
    termMax: 24,
    beacon: 640,
    bfs: true,
    exclusions: ['Rural', 'Cannabis-related', 'Hospitality'],
    monthlyTarget: 5000000,
    available: 18000000,
    closeSpeed: '7–10 days',
  },

  ASSET_CLASSES: [
    { id: 'Residential 1st', desc: 'Owner-occupied & rental, first position' },
    { id: 'Residential 2nd', desc: 'Second & subsequent positions' },
    { id: 'Commercial', desc: 'Office, retail, industrial, mixed-use' },
    { id: 'Land', desc: 'Serviced & raw land' },
    { id: 'Construction', desc: 'Draw-based development' },
    { id: 'Multi-residential', desc: '5+ unit apartment' },
  ],

  PROVINCES: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB'],
  EXCLUSION_OPTIONS: [
    'Rural',
    'Cannabis-related',
    'Hospitality',
    'Gas stations',
    'Power of sale',
    'Foreign income',
    'Pre-construction',
  ],
};

// Seed for the notifications inbox + bell when no Supabase project is wired.
// `hoursAgo` is resolved to a real `created_at` by notificationsService so the
// relative timestamps ("2h ago") always read fresh. Entity ids are deal
// numbers — the same identifier mock routing uses for /deals/:id.
export interface MockNotification {
  notification_type: string;
  title: string;
  message: string;
  entity_type: 'deal' | 'offer';
  entity_id: string;
  is_read: boolean;
  hoursAgo: number;
}

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { notification_type: 'new_match', title: 'New match — Deal № 0251', message: 'Ottawa, ON · $680,000 · 88% match to your criteria.', entity_type: 'deal', entity_id: '0251', is_read: false, hoursAgo: 2 },
  { notification_type: 'offer_received', title: 'New offer — Deal № 0247', message: 'A lender submitted at 9.25% with a 2.0% fee.', entity_type: 'deal', entity_id: '0247', is_read: false, hoursAgo: 5 },
  { notification_type: 'offer_countered', title: 'Counter-offer — Deal № 0247', message: 'The other side countered at 9.0%.', entity_type: 'deal', entity_id: '0247', is_read: false, hoursAgo: 26 },
  { notification_type: 'borrower_revealed', title: 'Borrower revealed — Deal № 0247', message: 'Identity shared after an offer was made.', entity_type: 'deal', entity_id: '0247', is_read: true, hoursAgo: 30 },
  { notification_type: 'deal_funded', title: 'Deal funded — Deal № 0231', message: 'Closed at 9.0% · $540,000 in Hamilton, ON.', entity_type: 'deal', entity_id: '0231', is_read: true, hoursAgo: 52 },
];

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  ON: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'],
  QC: ['Montréal', 'Laval', 'Québec City', 'Gatineau'],
  BC: ['Vancouver', 'Burnaby', 'Victoria', 'Surrey'],
  AB: ['Calgary', 'Edmonton', 'Red Deer'],
  MB: ['Winnipeg', 'Brandon'],
  SK: ['Saskatoon', 'Regina'],
  NS: ['Halifax', 'Dartmouth'],
  NB: ['Moncton', 'Fredericton'],
};

// ============ Admin portal mock ============
// Mirrors what the admin RPCs/queries return; used in mock mode + as the
// adminService fallback so the admin app builds without a backend.
export const ADMIN_MOCK = {
  metrics: {
    brokers: 14,
    lenders: 9,
    signupsThisWeek: 3,
    activeDeals: 27,
    liveOffers: 11,
    fundings: 18,
    fundedVolumeCents: 4_268_000_000, // $42.68M
    weeklyActiveUsers: 16,
  },

  users: [
    { id: '11111111-1111-1111-1111-111111111111', role: 'broker' as const, name: 'Marcus Chen', firm: 'Northbridge Mortgage Partners', email: 'broker@plynth.test', isVerified: true, verificationStatus: 'approved' as const, lastSignInAt: '2026-06-12T08:14:00Z', createdAt: '2026-05-02T00:00:00Z', dealsCount: 7, offersCount: 0 },
    { id: '22222222-2222-2222-2222-222222222222', role: 'lender' as const, name: 'Eleanor Whitfield', firm: 'Fortress MIC', email: 'lender@plynth.test', isVerified: true, verificationStatus: 'approved' as const, lastSignInAt: '2026-06-12T07:51:00Z', createdAt: '2026-05-04T00:00:00Z', dealsCount: 0, offersCount: 5 },
    { id: 'a3000000-0000-0000-0000-000000000001', role: 'broker' as const, name: 'Priya Anand', firm: 'Cedarline Capital', email: 'priya@cedarline.ca', isVerified: false, verificationStatus: 'pending' as const, lastSignInAt: '2026-06-11T16:30:00Z', createdAt: '2026-06-10T00:00:00Z', dealsCount: 2, offersCount: 0 },
    { id: 'a3000000-0000-0000-0000-000000000002', role: 'lender' as const, name: 'David Okonkwo', firm: 'Bridgewater Funds', email: 'david@bridgewater.ca', isVerified: true, verificationStatus: 'approved' as const, lastSignInAt: '2026-06-09T11:02:00Z', createdAt: '2026-05-19T00:00:00Z', dealsCount: 0, offersCount: 3 },
    { id: 'a3000000-0000-0000-0000-000000000003', role: 'broker' as const, name: 'Sophie Tremblay', firm: 'Rive-Sud Hypothèques', email: 'sophie@rivesud.ca', isVerified: false, verificationStatus: 'rejected' as const, lastSignInAt: null, createdAt: '2026-06-08T00:00:00Z', dealsCount: 0, offersCount: 0 },
  ],

  activity: [
    { id: 1208, createdAt: '2026-06-12T08:14:00Z', actorId: '11111111-1111-1111-1111-111111111111', actorName: 'Northbridge Mortgage Partners', action: 'session.login', entityType: null, entityId: null, ip: '198.51.100.20', userAgent: 'Chrome 126' },
    { id: 1207, createdAt: '2026-06-12T07:55:00Z', actorId: '22222222-2222-2222-2222-222222222222', actorName: 'Fortress MIC', action: 'offer.created', entityType: 'offer', entityId: '0247', ip: '203.0.113.8', userAgent: 'Safari 17' },
    { id: 1206, createdAt: '2026-06-11T21:40:00Z', actorId: '11111111-1111-1111-1111-111111111111', actorName: 'Northbridge Mortgage Partners', action: 'deal.created', entityType: 'deal', entityId: '0251', ip: '198.51.100.20', userAgent: 'Chrome 126' },
    { id: 1205, createdAt: '2026-06-11T18:03:00Z', actorId: '22222222-2222-2222-2222-222222222222', actorName: 'Fortress MIC', action: 'deal.status_changed', entityType: 'deal', entityId: '0236', ip: '203.0.113.8', userAgent: 'Safari 17' },
    { id: 1204, createdAt: '2026-06-11T16:30:00Z', actorId: 'a3000000-0000-0000-0000-000000000001', actorName: 'Cedarline Capital', action: 'session.login', entityType: null, entityId: null, ip: '192.0.2.55', userAgent: 'Firefox 127' },
  ],

  signupSeries: [
    { bucket: 'May 12', value: 2 }, { bucket: 'May 19', value: 4 }, { bucket: 'May 26', value: 3 },
    { bucket: 'Jun 2', value: 5 }, { bucket: 'Jun 9', value: 3 },
  ],

  fundingSeries: [
    { bucket: 'Feb', value: 540_000_000 }, { bucket: 'Mar', value: 720_000_000 },
    { bucket: 'Apr', value: 980_000_000 }, { bucket: 'May', value: 1_240_000_000 },
    { bucket: 'Jun', value: 788_000_000 },
  ],

  deals: [
    { deal_number: '0247', brokerFirm: 'Northbridge Mortgage Partners', city: 'Toronto, ON', amount_cents: 42_500_000, ltv: 72.0, status: 'offer', offers: 1, created_at: '2026-06-09T00:00:00Z' },
    { deal_number: '0251', brokerFirm: 'Northbridge Mortgage Partners', city: 'Ottawa, ON', amount_cents: 68_000_000, ltv: 65.0, status: 'offer', offers: 1, created_at: '2026-06-10T00:00:00Z' },
    { deal_number: '0236', brokerFirm: 'Northbridge Mortgage Partners', city: 'London, ON', amount_cents: 31_200_000, ltv: 80.0, status: 'negotiating', offers: 1, created_at: '2026-06-07T00:00:00Z' },
    { deal_number: '0239', brokerFirm: 'Northbridge Mortgage Partners', city: 'Calgary, AB', amount_cents: 340_000_000, ltv: 60.0, status: 'active', offers: 0, created_at: '2026-06-06T00:00:00Z' },
  ],

  offers: [
    { deal_number: '0247', lenderFirm: 'Fortress MIC', rate: 9.25, lenderFee: 2.0, status: 'submitted', expires_at: '2026-06-15T00:00:00Z', created_at: '2026-06-11T00:00:00Z' },
    { deal_number: '0251', lenderFirm: 'Fortress MIC', rate: 8.95, lenderFee: 1.5, status: 'submitted', expires_at: '2026-06-17T00:00:00Z', created_at: '2026-06-11T00:00:00Z' },
    { deal_number: '0236', lenderFirm: 'Fortress MIC', rate: 10.5, lenderFee: 2.5, status: 'countered', expires_at: '2026-06-14T00:00:00Z', created_at: '2026-06-11T00:00:00Z' },
  ],

  // ---- Observability (System Health) ----
  health: {
    windowMin: 60,
    errorCount: 7,
    fatalCount: 1,
    eventCount: 1432,
    byApp: [
      { app: 'broker', errors: 3, events: 612 },
      { app: 'lender', errors: 3, events: 701 },
      { app: 'admin', errors: 1, events: 119 },
    ],
    topFingerprints: [
      { fingerprint: 'a1b2c3d4', name: 'PostgrestError', message: 'JWT expired', app: 'lender', count: 3, lastSeen: '2026-06-12T08:01:00Z' },
      { fingerprint: 'e5f6a7b8', name: 'TypeError', message: "Cannot read properties of undefined (reading 'map')", app: 'broker', count: 2, lastSeen: '2026-06-12T07:40:00Z' },
      { fingerprint: 'c9d0e1f2', name: 'AbortError', message: 'The user aborted a request.', app: 'broker', count: 1, lastSeen: '2026-06-11T22:15:00Z' },
      { fingerprint: 'b3c4d5e6', name: 'Error', message: 'Network request failed', app: 'admin', count: 1, lastSeen: '2026-06-11T19:02:00Z' },
    ],
  },

  errors: [
    { id: 9101, createdAt: '2026-06-12T08:01:00Z', app: 'lender', severity: 'error' as const, source: 'rpc', name: 'PostgrestError', message: 'JWT expired', route: '/criteria', userId: '22222222-2222-2222-2222-222222222222', fingerprint: 'a1b2c3d4' },
    { id: 9100, createdAt: '2026-06-12T07:40:00Z', app: 'broker', severity: 'error' as const, source: 'react_boundary', name: 'TypeError', message: "Cannot read properties of undefined (reading 'map')", route: '/deals/0251', userId: '11111111-1111-1111-1111-111111111111', fingerprint: 'e5f6a7b8' },
    { id: 9099, createdAt: '2026-06-12T03:22:00Z', app: 'admin', severity: 'fatal' as const, source: 'unhandled', name: 'Error', message: 'Network request failed', route: '/overview', userId: null, fingerprint: 'b3c4d5e6' },
    { id: 9098, createdAt: '2026-06-11T22:15:00Z', app: 'broker', severity: 'warning' as const, source: 'supabase', name: 'AbortError', message: 'The user aborted a request.', route: '/deals', userId: 'a3000000-0000-0000-0000-000000000001', fingerprint: 'c9d0e1f2' },
    { id: 9097, createdAt: '2026-06-11T20:48:00Z', app: 'lender', severity: 'error' as const, source: 'rpc', name: 'PostgrestError', message: 'JWT expired', route: '/matched', userId: 'a3000000-0000-0000-0000-000000000002', fingerprint: 'a1b2c3d4' },
  ],

  // ---- User 360 (keyed by user id) ----
  user360: {
    '11111111-1111-1111-1111-111111111111': {
      profile: { id: '11111111-1111-1111-1111-111111111111', role: 'broker', email: 'broker@plynth.test', name: 'Marcus Chen', firm: 'Northbridge Mortgage Partners', isVerified: true, verificationStatus: 'approved', createdAt: '2026-05-02T00:00:00Z', lastSignInAt: '2026-06-12T08:14:00Z', emailConfirmedAt: '2026-05-02T00:10:00Z' },
      deals: [
        { deal_number: '0251', city: 'Ottawa', province: 'ON', amount_cents: 68_000_000, ltv: 65.0, status: 'offer', created_at: '2026-06-10T00:00:00Z' },
        { deal_number: '0247', city: 'Toronto', province: 'ON', amount_cents: 42_500_000, ltv: 72.0, status: 'offer', created_at: '2026-06-09T00:00:00Z' },
        { deal_number: '0236', city: 'London', province: 'ON', amount_cents: 31_200_000, ltv: 80.0, status: 'negotiating', created_at: '2026-06-07T00:00:00Z' },
      ],
      offers: [],
      notifications: [
        { notification_type: 'offer_received', title: 'New offer on № 0247', message: 'Fortress MIC submitted an offer.', is_read: true, created_at: '2026-06-11T00:00:00Z' },
        { notification_type: 'new_match', title: 'New match on № 0251', message: '3 lenders matched your deal.', is_read: false, created_at: '2026-06-10T01:00:00Z' },
      ],
      loginHistory: [
        { created_at: '2026-06-12T08:14:00Z', ip: '198.51.100.20', user_agent: 'Chrome 126' },
        { created_at: '2026-06-11T09:02:00Z', ip: '198.51.100.20', user_agent: 'Chrome 126' },
      ],
      audit: [
        { created_at: '2026-06-11T21:40:00Z', action: 'deal.created', entity_type: 'deal', entity_id: '0251', ip: '198.51.100.20' },
        { created_at: '2026-06-12T08:14:00Z', action: 'session.login', entity_type: null, entity_id: null, ip: '198.51.100.20' },
      ],
      recentErrors: [
        { created_at: '2026-06-12T07:40:00Z', app: 'broker', severity: 'error', source: 'react_boundary', name: 'TypeError', message: "Cannot read properties of undefined (reading 'map')", route: '/deals/0251' },
      ],
    },
    '22222222-2222-2222-2222-222222222222': {
      profile: { id: '22222222-2222-2222-2222-222222222222', role: 'lender', email: 'lender@plynth.test', name: 'Eleanor Whitfield', firm: 'Fortress MIC', isVerified: true, verificationStatus: 'approved', createdAt: '2026-05-04T00:00:00Z', lastSignInAt: '2026-06-12T07:51:00Z', emailConfirmedAt: '2026-05-04T00:08:00Z' },
      deals: [],
      offers: [
        { deal_number: '0247', rate: 9.25, lender_fee: 2.0, status: 'submitted', expires_at: '2026-06-15T00:00:00Z', created_at: '2026-06-11T00:00:00Z' },
        { deal_number: '0236', rate: 10.5, lender_fee: 2.5, status: 'countered', expires_at: '2026-06-14T00:00:00Z', created_at: '2026-06-11T00:00:00Z' },
      ],
      notifications: [
        { notification_type: 'new_match', title: 'New deal matches your criteria', message: '№ 0251 in Ottawa matched.', is_read: false, created_at: '2026-06-10T02:00:00Z' },
      ],
      loginHistory: [{ created_at: '2026-06-12T07:51:00Z', ip: '203.0.113.8', user_agent: 'Safari 17' }],
      audit: [
        { created_at: '2026-06-12T07:55:00Z', action: 'offer.created', entity_type: 'offer', entity_id: '0247', ip: '203.0.113.8' },
      ],
      recentErrors: [
        { created_at: '2026-06-12T08:01:00Z', app: 'lender', severity: 'error', source: 'rpc', name: 'PostgrestError', message: 'JWT expired', route: '/criteria' },
      ],
    },
  } as Record<string, unknown>,

  // ---- Funnel + Matching ----
  funnel: {
    days: 30,
    stages: [
      { stage: 'Submitted', count: 48 },
      { stage: 'Matched', count: 41 },
      { stage: 'Offered', count: 23 },
      { stage: 'Funded', count: 12 },
    ],
    leakage: { declined: 4, expired: 3 },
  },

  matching: {
    days: 30,
    avgMatchScore: 71.4,
    avgMatchesPerDeal: 3.2,
    zeroMatch: [
      { deal_number: '0239', city: 'Calgary', province: 'AB', status: 'active', created_at: '2026-06-06T00:00:00Z' },
      { deal_number: '0244', city: 'Saskatoon', province: 'SK', status: 'active', created_at: '2026-06-05T00:00:00Z' },
    ],
    lowMatch: [
      { deal_number: '0242', city: 'Halifax', bestScore: 38, matchCount: 1 },
      { deal_number: '0238', city: 'Winnipeg', bestScore: 44, matchCount: 2 },
    ],
  },

  // ---- Alerts ----
  alertRules: [
    { id: 'r1', kind: 'error_rate_spike' as const, name: 'Error-rate spike', isEnabled: true, severity: 'high' as const, params: { threshold: 50, window_min: 15 }, cooldownMin: 30, lastEvaluatedAt: '2026-06-12T08:10:00Z', lastFiredAt: '2026-06-12T03:22:00Z', createdAt: '2026-06-01T00:00:00Z' },
    { id: 'r2', kind: 'deal_stuck' as const, name: 'Deals stuck > 3 days', isEnabled: true, severity: 'medium' as const, params: { days: 3 }, cooldownMin: 720, lastEvaluatedAt: '2026-06-12T08:10:00Z', lastFiredAt: null, createdAt: '2026-06-01T00:00:00Z' },
    { id: 'r3', kind: 'signups_drop' as const, name: 'Signups dropped to zero', isEnabled: false, severity: 'low' as const, params: { factor: 0.2 }, cooldownMin: 1440, lastEvaluatedAt: '2026-06-12T08:10:00Z', lastFiredAt: null, createdAt: '2026-06-01T00:00:00Z' },
    { id: 'r4', kind: 'offers_expiring_unhandled' as const, name: 'Offers expiring unhandled', isEnabled: true, severity: 'medium' as const, params: { hours: 12 }, cooldownMin: 360, lastEvaluatedAt: '2026-06-12T08:10:00Z', lastFiredAt: '2026-06-11T20:00:00Z', createdAt: '2026-06-01T00:00:00Z' },
  ],

  alertEvents: [
    { id: 5102, ruleId: 'r1', ruleName: 'Error-rate spike', kind: 'error_rate_spike' as const, severity: 'high' as const, status: 'open' as const, summary: 'Error rate 73 in 15min on admin (threshold 50)', details: { observed: 73, threshold: 50 }, firedAt: '2026-06-12T03:22:00Z', acknowledgedAt: null, resolvedAt: null },
    { id: 5101, ruleId: 'r4', ruleName: 'Offers expiring unhandled', kind: 'offers_expiring_unhandled' as const, severity: 'medium' as const, status: 'acknowledged' as const, summary: '4 offers expire within 12h with no broker response', details: { count: 4 }, firedAt: '2026-06-11T20:00:00Z', acknowledgedAt: '2026-06-11T20:30:00Z', resolvedAt: null },
    { id: 5100, ruleId: 'r1', ruleName: 'Error-rate spike', kind: 'error_rate_spike' as const, severity: 'high' as const, status: 'resolved' as const, summary: 'Error rate 61 in 15min on lender (threshold 50)', details: { observed: 61, threshold: 50 }, firedAt: '2026-06-10T14:05:00Z', acknowledgedAt: '2026-06-10T14:20:00Z', resolvedAt: '2026-06-10T15:00:00Z' },
  ],
};
