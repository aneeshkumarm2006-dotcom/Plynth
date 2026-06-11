/* ============================================================
   PLYNTH — Lender in-app screens
   Dashboard · Matched feed · Deal detail · Pipeline · Funded
   ============================================================ */
const LD = window.LENDER;

/* ---------- DEAL IN FOCUS (lender) ---------- */
function LenderFocus({ nav }) {
  const f = LD.focus;
  return (
    <div className="card fade-in" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", minHeight: 300 }} className="focus-grid">
        <div style={{ padding: "40px 44px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <span className="eyebrow" style={{ color: "var(--amber-deep)" }}>Strongest match today</span>
            <span style={{ width: 1, height: 12, background: "var(--border)" }} />
            <DealNo n={f.no} />
            <MatchBar score={f.score} width={90} />
          </div>
          <blockquote style={{ fontFamily: "var(--serif)", fontSize: 24, lineHeight: 1.42, letterSpacing: "-0.01em", color: "var(--slate-deep)", margin: 0, maxWidth: "36ch", flex: 1 }}>
            “{f.quote}”
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => nav("deal", f.no)}>Make an offer</button>
            <button className="btn btn-ghost" onClick={() => nav("deal", f.no)}>View deal</button>
          </div>
        </div>
        <div style={{ padding: "40px 44px", borderLeft: "1px solid var(--border)", background: "#FCFAF5", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="micro" style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{f.neighbourhood} · {f.city}</div>
          <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--slate-deep)", lineHeight: 1 }}>
            {f.amount} <span style={{ fontSize: 15, color: "var(--text-2)" }}>CAD</span>
          </div>
          <DefList style={{ marginTop: 22 }} items={[["Position", f.position], ["LTV", f.ltv], ["Term", f.term]]} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Match feed card (magazine-like) ---------- */
function MatchCard({ d, nav, toast, dense }) {
  const [acted, setActed] = useState(null);
  return (
    <div className="card card-hover" style={{ padding: dense ? 24 : 30, opacity: acted === "pass" ? 0.5 : 1, transition: "opacity 200ms" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <DealNo n={d.no} size={13} />
          <span className="pill pill-active" style={{ background: "var(--slate-bg)" }}>{d.city}</span>
          <span className="micro muted-text">{d.asset}</span>
        </div>
        <span className="micro muted-text">{d.age} ago</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }} className="match-body">
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <span className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--slate-deep)", lineHeight: 1 }}>{d.amount}</span>
            <span className="small muted-text">CAD</span>
          </div>
          <div className="small muted-text" style={{ marginBottom: 14 }}>{d.position} · {d.region}</div>
          <p className="body" style={{ color: "var(--text)", lineHeight: 1.6, maxWidth: "52ch" }}>{d.summary}</p>
        </div>
        <div>
          <DefList items={[["LTV", d.ltv], ["Term", d.term], ["Position", d.position]]} />
          <div style={{ marginTop: 14 }}>
            <div className="micro muted-text" style={{ letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Match</div>
            <MatchBar score={d.score} width={140} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-primary btn-sm" onClick={() => nav("deal", d.no)}>Make offer</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setActed("interested"); toast({ title: "Marked interested — Deal № " + d.no, sub: "The broker is notified you're reviewing." }); }}>Interested</button>
        <button className="btn btn-tertiary btn-sm" onClick={() => { setActed("pass"); toast({ title: "Passed on Deal № " + d.no }); }}>Pass</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-tertiary btn-sm" onClick={() => nav("deal", d.no)}>Details ›</button>
      </div>
    </div>
  );
}

/* ---------- DASHBOARD ---------- */
function LenderDashboard({ nav, toast }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = LD.user.name.split(" ")[0];
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">{greet}, {first}</h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>Nine new deals match your criteria. Four arrived today.</p>
      </div>
      <div style={{ marginBottom: 32 }}><StatStrip stats={LD.stats} /></div>
      <div style={{ marginBottom: 44 }}><LenderFocus nav={nav} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 40 }} className="lender-dash-grid">
        <div>
          <SectionDivider n="01" label="Today's matches" meta={LD.matched.length + " deals"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {LD.matched.slice(0, 3).map((d) => <MatchCard key={d.no} d={d} nav={nav} toast={toast} dense />)}
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={() => nav("matched")}>View all matched deals</button>
        </div>
        <aside className="lender-aside">
          <SectionDivider n="02" label="Performance" />
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div><div className="stat-value" style={{ fontSize: 30 }}>{LD.sidebarStats.winRate}</div><div className="stat-label">Win Rate</div></div>
              <div><div className="stat-value" style={{ fontSize: 30 }}>{LD.sidebarStats.avgResponse}</div><div className="stat-label">Avg Response Time</div></div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="micro muted-text" style={{ letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Active criteria</div>
            <p className="small" style={{ color: "var(--slate-deep)", lineHeight: 1.5 }}>{LD.sidebarStats.criteria}</p>
            <button className="btn btn-tertiary btn-sm" style={{ paddingLeft: 0, marginTop: 8 }} onClick={() => nav("criteria")}>Edit criteria ›</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- MATCHED FEED ---------- */
function LenderMatched({ nav, toast }) {
  const [sort, setSort] = useState("best");
  const [asset, setAsset] = useState("all");
  let rows = [...LD.matched];
  if (asset !== "all") rows = rows.filter(d => d.asset === asset);
  if (sort === "best") rows.sort((a, b) => b.score - a.score);
  if (sort === "newest") rows = rows; // already newest-first in data
  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Matched deals</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>Deals scored against your criteria, presented one at a time.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["all", "All"], ["Residential 1st", "Res 1st"], ["Residential 2nd", "Res 2nd"], ["Commercial", "Commercial"]].map(([id, lbl]) => (
            <Chip key={id} on={asset === id} onClick={() => setAsset(id)}>{lbl}</Chip>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="micro muted-text" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>Sort</span>
          <select className="select" style={{ width: "auto", padding: "7px 32px 7px 12px", fontSize: 13 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="best">Best match</option>
            <option value="newest">Newest</option>
            <option value="expiring">Expiring soon</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map((d) => <MatchCard key={d.no} d={d} nav={nav} toast={toast} />)}
      </div>
    </div>
  );
}

/* ---------- OFFER COMPOSER ---------- */
function OfferComposer({ toast, nav }) {
  const [rate, setRate] = useState("9.25");
  return (
    <div className="card card-pad" style={{ borderColor: "var(--amber)", padding: 32 }}>
      <SectionDivider n="05" label="Compose your offer" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 18 }}>
        <Field label="Interest rate (%)"><input className="input input-num" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Lender fee (%)"><input className="input input-num" defaultValue="2.0" /></Field>
        <Field label="Broker fee (%)"><input className="input input-num" defaultValue="1.0" /></Field>
        <Field label="Term (months)"><select className="select"><option>12</option><option>18</option><option>24</option></select></Field>
        <Field label="Max LTV (%)"><input className="input input-num" defaultValue="72.0" /></Field>
        <Field label="Offer expires"><select className="select"><option>3 days</option><option>5 days</option><option>7 days</option></select></Field>
      </div>
      <Field label="Conditions"><input className="input" defaultValue="Full appraisal, fire insurance, title insurance" /></Field>
      <Field label="Note to broker (optional)"><textarea className="input" rows="2" placeholder="Add context for the broker…"></textarea></Field>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={() => { toast({ title: "Offer submitted at " + rate + "%", sub: "The broker has been notified. You'll see their response here." }); nav("pipeline"); }}>Submit offer</button>
        <button className="btn btn-ghost">Save draft</button>
      </div>
    </div>
  );
}

/* ---------- DEAL DETAIL (lender) ---------- */
function LenderDealDetail({ nav, toast, dealNo }) {
  const f = LD.focus;
  return (
    <div className="page page-wide">
      <button className="btn btn-tertiary btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={() => nav("matched")}>‹ Back to matched deals</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <DealNo n={dealNo || f.no} size={15} /><span className="pill pill-matched">Matched</span><MatchBar score={f.score} width={90} />
          </div>
          <h1 className="h1">{f.amount} <span style={{ fontSize: 18, color: "var(--text-2)", fontFamily: "var(--sans)", fontWeight: 500 }}>CAD</span></h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>{f.position} · {f.neighbourhood}, {f.city}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => toast({ title: "Marked interested" })}>Interested</button>
          <button className="btn btn-ghost btn-sm" onClick={() => toast({ title: "Passed on this deal" })}>Pass</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40, marginTop: 36 }} className="detail-grid">
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 44 }}>
            <div>
              <SectionDivider n="01" label="Deal facts" />
              <DefList items={[
                ["Property type", "Detached, residential"],
                ["Loan amount", f.amount + " CAD"],
                ["Position", f.position],
                ["LTV", f.ltv],
                ["Appraised value", "$590,000 CAD"],
                ["Term", f.term],
                ["Beacon band", "680–720"],
                ["Purpose", "Refinance — consolidation"],
              ]} />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ lineHeight: 1.65 }}>A first mortgage refinance on an owner-occupied detached home in East York. Self-employed borrower with two years of established income, consolidating higher-interest debt.</p>
              <p className="body" style={{ lineHeight: 1.65, marginTop: 14 }}>At 72% LTV against a fresh appraisal, the position sits comfortably inside your residential band. Exit is via institutional refinance at term.</p>
              <div style={{ marginTop: 18 }}>
                <SectionDivider n="03" label="Documents" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Appraisal — 142 Westbrook Ave", "MLS listing", "Notice of Assessment 2025"].map((doc, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>
                      <FigurePlaceholder label="PDF" style={{ width: 30, height: 36, borderRadius: 3 }} />
                      <span className="small" style={{ flex: 1 }}>{doc}</span>
                      <span className="micro muted-text">View</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Comparable deals — the moat */}
          <SectionDivider n="04" label="Comparable deals you've funded" meta="Only on Plynth" />
          <div className="card" style={{ overflow: "hidden", marginBottom: 44 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Deal", "Location", "Amount", "LTV", "Rate", "Closed"].map((h, i) => (
                  <th key={i} style={{ textAlign: i >= 2 && i <= 4 ? "right" : "left", padding: "12px 16px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-2)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {LD.comparables.map((d, i) => (
                  <tr key={i} style={{ borderBottom: i < LD.comparables.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "14px 16px" }}><span className="deal-no" style={{ fontSize: 13 }}>№ {d.no}</span></td>
                    <td style={{ padding: "14px 16px", fontSize: 13 }}>{d.city}</td>
                    <td className="num" style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: "var(--slate-deep)" }}>{d.amount}</td>
                    <td className="num" style={{ padding: "14px 16px", textAlign: "right" }}>{d.ltv}</td>
                    <td className="num" style={{ padding: "14px 16px", textAlign: "right", color: "var(--amber-deep)", fontWeight: 600 }}>{d.rate}</td>
                    <td className="num" style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{d.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OfferComposer toast={toast} nav={nav} />
        </div>

        <div>
          <SectionDivider n="—" label="Why this matched" />
          <div className="card card-pad" style={{ background: "#FCFAF5" }}>
            {[["Asset class", "Residential 1st — in criteria"], ["Geography", "Toronto, ON — in criteria"], ["LTV", "72% — within 75% limit"], ["Loan size", "$425K — within band"], ["Beacon", "680–720 — above 640 min"]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--sage)", fontWeight: 700, fontSize: 13 }}>✓</span>
                <div><div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{l}</div><div className="micro muted-text">{v}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PIPELINE KANBAN ---------- */
function LenderPipeline({ nav }) {
  const cols = ["Reviewing", "Offered", "In Negotiation", "Funded", "Dead"];
  const pillFor = { Reviewing: "reviewing", Offered: "offer", "In Negotiation": "negotiating", Funded: "funded", Dead: "declined" };
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Pipeline</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>Every deal you've engaged, from first review to funding.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(180px, 1fr))", gap: 16, overflowX: "auto", paddingBottom: 8 }} className="kanban">
        {cols.map((col) => (
          <div key={col}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              <span className="micro" style={{ fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--slate-deep)" }}>{col}</span>
              <span className="micro muted-text">{LD.pipeline[col].length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LD.pipeline[col].map((d) => (
                <div key={d.no} className="card card-hover" style={{ padding: 16, cursor: "pointer" }} onClick={() => nav("deal", d.no)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <DealNo n={d.no} size={12} />
                    <span className="micro" style={{ color: "var(--amber-deep)", fontWeight: 600 }}>{d.score}</span>
                  </div>
                  <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--slate-deep)", marginBottom: 4 }}>{d.amount}</div>
                  <div className="micro muted-text">{d.city}</div>
                </div>
              ))}
              {LD.pipeline[col].length === 0 && <div className="micro muted-text" style={{ padding: "16px 0", textAlign: "center" }}>—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- FUNDED (lender) ---------- */
function LenderFunded({ nav }) {
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Funded</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>Capital deployed through Plynth.</p>
      </div>
      <div className="stat-strip" style={{ marginBottom: 28, gridTemplateColumns: "repeat(3,1fr)" }}>
        <StatBlock value="$22.4" unit="M" label="Funded YTD" />
        <StatBlock value="31" unit="%" label="Win Rate" />
        <StatBlock value="9.0" unit="%" label="Avg Funded Rate" />
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Deal", "Location", "Amount", "Position", "Rate", "Term", "Broker", "Closed"].map((h, i) => (
              <th key={i} style={{ textAlign: i >= 2 && i <= 5 ? "right" : "left", padding: "14px 18px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-2)" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {LD.funded.map((d, i) => (
              <tr key={i} style={{ borderBottom: i < LD.funded.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "16px 18px" }}><span className="deal-no" style={{ fontSize: 14 }}>№ {d.no}</span></td>
                <td style={{ padding: "16px 18px", fontSize: 14 }}>{d.city}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", fontWeight: 600, color: "var(--slate-deep)" }}>{d.amount}</td>
                <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 14, color: "var(--text-2)" }}>{d.position}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", color: "var(--amber-deep)", fontWeight: 600 }}>{d.rate}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", color: "var(--text-2)" }}>{d.term}</td>
                <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)" }}>{d.broker}</td>
                <td className="num" style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)" }}>{d.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { LenderDashboard, LenderMatched, LenderDealDetail, LenderPipeline, LenderFunded });
