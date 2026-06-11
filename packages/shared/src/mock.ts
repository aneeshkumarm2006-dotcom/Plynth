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
