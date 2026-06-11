/* ============================================================
   PLYNTH — Lender portal mock data
   ============================================================ */
window.LENDER = {
  user: { name: "Eleanor Whitfield", firm: "Fortress MIC", initials: "EW", type: "Mortgage Investment Corp.", tier: "Professional" },

  stats: [
    { value: "9", label: "New Matches", delta: "+4 today", deltaDir: "up" },
    { value: "5", label: "Offers Out" },
    { value: "$22.4", unit: "M", label: "Funded YTD" },
    { value: "68", unit: "%", label: "Deployment Rate" },
  ],

  sidebarStats: { winRate: "31%", avgResponse: "6.2 hrs", criteria: "Residential 1st & 2nd · ON, QC · ≤ 80% LTV" },

  // Deal in focus for lender dashboard — strongest match
  focus: {
    no: "0247", city: "Toronto, ON", neighbourhood: "East York",
    amount: "$425,000", position: "First mortgage", ltv: "72.0%", term: "12 months",
    score: 94,
    quote: "A conservative first at 72% against a fresh East York appraisal — squarely in your residential band, with an owner-occupant covenant and a clean refinance exit. Three lenders are circling; none has matched your typical close speed.",
  },

  matched: [
    { no: "0247", city: "Toronto, ON", region: "East York", amount: "$425,000", position: "First", ltv: "72.0%", term: "12 mo", score: 94, asset: "Residential 1st", summary: "Self-employed borrower refinancing a detached home to consolidate. Strong covenant, conservative position.", age: "2h" },
    { no: "0251", city: "Ottawa, ON", region: "Westboro", amount: "$680,000", position: "First", ltv: "65.0%", term: "12 mo", score: 88, asset: "Residential 1st", summary: "Equity take-out on a semi-detached for a renovation. Salaried borrower, low leverage.", age: "5h" },
    { no: "0244", city: "Burnaby, BC", region: "Metrotown", amount: "$890,000", position: "Second", ltv: "78.0%", term: "9 mo", score: 81, asset: "Residential 2nd", summary: "Second behind an institutional first; bridge to a spring sale. Higher leverage, short term.", age: "1d" },
    { no: "0239", city: "Calgary, AB", region: "Beltline", amount: "$3,400,000", position: "First", ltv: "60.0%", term: "24 mo", score: 76, asset: "Commercial", summary: "Mixed-use commercial refinance, stabilized tenancy. Outside your usual size band.", age: "2d" },
    { no: "0236", city: "London, ON", region: "Old North", amount: "$312,000", position: "Second", ltv: "80.0%", term: "12 mo", score: 72, asset: "Residential 2nd", summary: "Second mortgage for debt consolidation. At the top of your LTV tolerance.", age: "3d" },
  ],

  comparables: [
    { no: "0231", city: "Hamilton, ON", amount: "$540,000", rate: "9.0%", ltv: "68%", closed: "Jun 2" },
    { no: "0224", city: "Kitchener, ON", amount: "$415,000", rate: "9.25%", ltv: "71%", closed: "May 19" },
    { no: "0212", city: "Toronto, ON", amount: "$460,000", rate: "8.75%", ltv: "70%", closed: "May 4" },
  ],

  pipeline: {
    Reviewing: [
      { no: "0251", city: "Ottawa, ON", amount: "$680,000", score: 88 },
      { no: "0236", city: "London, ON", amount: "$312,000", score: 72 },
    ],
    Offered: [
      { no: "0247", city: "Toronto, ON", amount: "$425,000", score: 94 },
      { no: "0244", city: "Burnaby, BC", amount: "$890,000", score: 81 },
    ],
    "In Negotiation": [
      { no: "0233", city: "Laval, QC", amount: "$755,000", score: 85 },
    ],
    Funded: [
      { no: "0231", city: "Hamilton, ON", amount: "$540,000", score: 91 },
      { no: "0224", city: "Kitchener, ON", amount: "$415,000", score: 86 },
    ],
    Dead: [
      { no: "0218", city: "Surrey, BC", amount: "$1,100,000", score: 64 },
    ],
  },

  funded: [
    { no: "0231", city: "Hamilton, ON", amount: "$540,000", position: "First", rate: "9.0%", term: "12 mo", broker: "Anonymized", closed: "Jun 2, 2026" },
    { no: "0224", city: "Kitchener, ON", amount: "$415,000", position: "Second", rate: "9.25%", term: "12 mo", broker: "Anonymized", closed: "May 19, 2026" },
    { no: "0212", city: "Toronto, ON", amount: "$460,000", position: "First", rate: "8.75%", term: "18 mo", broker: "Anonymized", closed: "May 4, 2026" },
    { no: "0205", city: "Oshawa, ON", amount: "$298,000", position: "Second", rate: "10.5%", term: "12 mo", broker: "Anonymized", closed: "Apr 18, 2026" },
  ],

  // Default criteria for the builder
  criteria: {
    assets: ["Residential 1st", "Residential 2nd"],
    provinces: ["ON", "QC"],
    cities: ["Toronto", "Ottawa", "Montréal"],
    loanMin: 150000, loanMax: 2000000,
    ltv1: 75, ltv2: 80,
    termMin: 6, termMax: 24,
    beacon: 640,
    bfs: true,
    exclusions: ["Rural", "Cannabis-related", "Hospitality"],
    monthlyTarget: 5000000,
    available: 18000000,
    closeSpeed: "7–10 days",
  },

  ASSET_CLASSES: [
    { id: "Residential 1st", desc: "Owner-occupied & rental, first position" },
    { id: "Residential 2nd", desc: "Second & subsequent positions" },
    { id: "Commercial", desc: "Office, retail, industrial, mixed-use" },
    { id: "Land", desc: "Serviced & raw land" },
    { id: "Construction", desc: "Draw-based development" },
    { id: "Multi-residential", desc: "5+ unit apartment" },
  ],

  PROVINCES: ["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB"],
  EXCLUSION_OPTIONS: ["Rural", "Cannabis-related", "Hospitality", "Gas stations", "Power of sale", "Foreign income", "Pre-construction"],
};
