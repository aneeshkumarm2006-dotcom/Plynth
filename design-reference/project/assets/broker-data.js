/* ============================================================
   PLYNTH — Broker portal mock data (realistic Canadian)
   ============================================================ */
window.BROKER = {
  user: { first: "Marcus", name: "Marcus Chen", brokerage: "Northbridge Mortgage Partners", initials: "MC", license: "FSRA M08009124", province: "Ontario" },

  stats: [
    { value: "12", label: "Active Deals" },
    { value: "7", label: "Offers In", delta: "+3 this week", deltaDir: "up" },
    { value: "$4.2", unit: "M", label: "Funded This Month" },
    { value: "$38.6", unit: "M", label: "Volume YTD" },
  ],

  // Deal in focus — most lender activity
  focus: {
    no: "0247", city: "Toronto, ON", neighbourhood: "East York",
    amount: "$425,000", position: "First mortgage", ltv: "72.0%", term: "12 months",
    rate: "8.5–11%", offers: 5, views: 31,
    quote: "A self-employed borrower with strong covenant, refinancing a detached home to consolidate. Five lenders are competing; the leading offer sits at 9.25% with a two-point fee.",
    status: "negotiating",
  },

  newOffers: [
    { no: "0247", lender: "MIC · Ontario", rate: "9.25%", fee: "2.0%", term: "12 mo", expires: "3 days", city: "Toronto, ON" },
    { no: "0244", lender: "Private Lender · BC", rate: "10.5%", fee: "2.5%", term: "9 mo", expires: "2 days", city: "Burnaby, BC" },
    { no: "0239", lender: "Debt Fund · National", rate: "8.75%", fee: "1.5%", term: "24 mo", expires: "5 days", city: "Calgary, AB" },
  ],

  awaiting: [
    { no: "0251", city: "Ottawa, ON", amount: "$680,000", ltv: "65.0%", term: "12 mo", submitted: "2 days ago", views: 14 },
    { no: "0249", city: "Mississauga, ON", amount: "$1,250,000", ltv: "70.0%", term: "18 mo", submitted: "4 days ago", views: 22 },
  ],

  recentFunded: [
    { no: "0231", city: "Hamilton, ON", amount: "$540,000", rate: "9.0%", closed: "Jun 2" },
    { no: "0228", city: "Vaughan, ON", amount: "$2,100,000", rate: "8.25%", closed: "May 28" },
  ],

  pipeline: [
    { no: "0251", city: "Ottawa, ON", amount: "$680,000", position: "First", ltv: "65.0%", term: "12 mo", status: "active", offers: 0, updated: "2d" },
    { no: "0249", city: "Mississauga, ON", amount: "$1,250,000", position: "First", ltv: "70.0%", term: "18 mo", status: "active", offers: 2, updated: "4d" },
    { no: "0247", city: "Toronto, ON", amount: "$425,000", position: "First", ltv: "72.0%", term: "12 mo", status: "negotiating", offers: 5, updated: "3h" },
    { no: "0244", city: "Burnaby, BC", amount: "$890,000", position: "Second", ltv: "78.0%", term: "9 mo", status: "offer", offers: 1, updated: "1d" },
    { no: "0239", city: "Calgary, AB", amount: "$3,400,000", position: "First", ltv: "60.0%", term: "24 mo", status: "offer", offers: 3, updated: "2d" },
    { no: "0236", city: "London, ON", amount: "$312,000", position: "Second", ltv: "80.0%", term: "12 mo", status: "active", offers: 0, updated: "5d" },
    { no: "0233", city: "Laval, QC", amount: "$755,000", position: "First", ltv: "68.0%", term: "12 mo", status: "draft", offers: 0, updated: "6d" },
  ],

  // Offers stacked on deal 0247
  dealOffers: [
    { id: "A", type: "MIC · Ontario", rate: "9.25%", lenderFee: "2.0%", brokerFee: "1.0%", term: "12 months", ltv: "72.0%", conditions: "Full appraisal, fire insurance, title", expires: "3 days", note: "Open to a rate reduction at 70% LTV. Prefer registered first.", best: true },
    { id: "B", type: "Private Lender · National", rate: "9.75%", lenderFee: "1.5%", brokerFee: "1.0%", term: "12 months", ltv: "72.0%", conditions: "Drive-by appraisal acceptable", expires: "5 days", note: "Can close in 7 business days." },
    { id: "C", type: "Debt Fund · Ontario", rate: "8.95%", lenderFee: "2.5%", brokerFee: "0.5%", term: "18 months", ltv: "70.0%", conditions: "Full appraisal, income verification", expires: "2 days", note: "Requires LTV at or below 70%." },
  ],

  activity: [
    { t: "3 hours ago", e: "Lender C submitted an offer at 8.95%." },
    { t: "Today, 9:14", e: "You countered Lender A at 9.0%." },
    { t: "Yesterday", e: "Lender A submitted an offer at 9.25%." },
    { t: "Yesterday", e: "Borrower details revealed to Lender A." },
    { t: "2 days ago", e: "Lender B submitted an offer at 9.75%." },
    { t: "3 days ago", e: "Deal № 0247 submitted to the marketplace." },
  ],

  lenders: [
    { name: "Fortress MIC", type: "Mortgage Investment Corp.", region: "ON · QC", assets: "Residential 1st & 2nd, Commercial", ltv: "Up to 80%", size: "$150K – $2M", speed: "5–10 days" },
    { name: "Cardinal Private Capital", type: "Private Lender", region: "National", assets: "Residential 1st, Construction", ltv: "Up to 75%", size: "$250K – $5M", speed: "7–14 days" },
    { name: "Bridgewater Funds", type: "Debt Fund", region: "ON · AB · BC", assets: "Commercial, Land", ltv: "Up to 65%", size: "$1M – $20M", speed: "10–21 days" },
    { name: "Northpine Lending", type: "Mortgage Investment Corp.", region: "BC", assets: "Residential 1st & 2nd", ltv: "Up to 78%", size: "$100K – $1.5M", speed: "5–7 days" },
    { name: "Meridian Capital", type: "Family Office", region: "ON", assets: "Commercial, Residential 1st", ltv: "Up to 70%", size: "$500K – $10M", speed: "14–21 days" },
    { name: "Slate River Mortgage", type: "Private Lender", region: "QC", assets: "Residential 1st & 2nd, Land", ltv: "Up to 75%", size: "$150K – $3M", speed: "7–10 days" },
  ],

  funded: [
    { no: "0231", city: "Hamilton, ON", amount: "$540,000", position: "First", rate: "9.0%", fee: "2.0%", term: "12 mo", lender: "MIC · Ontario", closed: "Jun 2, 2026" },
    { no: "0228", city: "Vaughan, ON", amount: "$2,100,000", position: "First", rate: "8.25%", fee: "1.5%", term: "24 mo", lender: "Debt Fund", closed: "May 28, 2026" },
    { no: "0224", city: "Kitchener, ON", amount: "$415,000", position: "Second", rate: "11.0%", fee: "2.5%", term: "12 mo", lender: "Private Lender", closed: "May 19, 2026" },
    { no: "0219", city: "Victoria, BC", amount: "$725,000", position: "First", rate: "8.75%", fee: "2.0%", term: "18 mo", lender: "MIC · BC", closed: "May 11, 2026" },
    { no: "0215", city: "Markham, ON", amount: "$1,680,000", position: "First", rate: "8.5%", fee: "1.5%", term: "24 mo", lender: "Family Office", closed: "Apr 30, 2026" },
    { no: "0210", city: "Gatineau, QC", amount: "$398,000", position: "Second", rate: "10.5%", fee: "2.5%", term: "12 mo", lender: "Private Lender", closed: "Apr 22, 2026" },
  ],
};
