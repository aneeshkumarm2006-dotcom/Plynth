/* ============================================================
   PLYNTH — Broker in-app screens
   Dashboard · Pipeline · Deal detail · Lenders · Funded
   ============================================================ */
const B = window.BROKER;

/* ---------- DEAL IN FOCUS — editorial hero ---------- */
function DealInFocus({ nav }) {
  const f = B.focus;
  return (
    <div className="card fade-in" style={{ overflow: "hidden", position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", minHeight: 300 }} className="focus-grid">
        {/* Left — the editorial pull-quote */}
        <div style={{ padding: "40px 44px 40px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <span className="eyebrow" style={{ color: "var(--amber-deep)" }}>Deal in focus</span>
            <span style={{ width: 1, height: 12, background: "var(--border)" }} />
            <DealNo n={f.no} />
            <Pill status="negotiating" />
          </div>
          <blockquote style={{
            fontFamily: "var(--serif)", fontSize: 25, lineHeight: 1.42, letterSpacing: "-0.01em",
            color: "var(--slate-deep)", margin: 0, maxWidth: "34ch", flex: 1,
          }}>
            “{f.quote}”
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => nav("deal", f.no)}>Review offers</button>
            <span className="small muted-text">{f.offers} offers · {f.views} lender views</span>
          </div>
        </div>
        {/* Right — the numbers, deliberately set */}
        <div style={{ padding: "40px 44px", borderLeft: "1px solid var(--border)", background: "#FCFAF5", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="micro" style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{f.neighbourhood} · {f.city}</div>
          <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--slate-deep)", lineHeight: 1 }}>
            {f.amount} <span style={{ fontSize: 15, color: "var(--text-2)" }}>CAD</span>
          </div>
          <DefList style={{ marginTop: 22 }} items={[
            ["Position", f.position],
            ["LTV", f.ltv],
            ["Term", f.term],
            ["Rate expectation", f.rate],
          ]} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Small offer card (dashboard column) ---------- */
function MiniOffer({ o, nav }) {
  return (
    <div className="card card-pad card-hover" style={{ padding: 20, cursor: "pointer" }} onClick={() => nav("deal", o.no)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <DealNo n={o.no} />
        <span className="micro muted-text">{o.city}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
        <span className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--slate-deep)", fontWeight: 600 }}>{o.rate}</span>
        <span className="small muted-text">· {o.fee} fee · {o.term}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="micro muted-text">{o.lender}</span>
        <span className="micro" style={{ color: "var(--amber-deep)", fontWeight: 600 }}>Expires in {o.expires}</span>
      </div>
    </div>
  );
}

function MiniAwaiting({ d, nav }) {
  return (
    <div className="card card-pad card-hover" style={{ padding: 20, cursor: "pointer" }} onClick={() => nav("deal", d.no)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <DealNo n={d.no} />
        <span className="micro muted-text">{d.city}</span>
      </div>
      <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--slate-deep)", fontWeight: 600, marginBottom: 8 }}>{d.amount}</div>
      <div className="micro muted-text">{d.ltv} LTV · {d.term} · {d.views} views</div>
      <div className="micro muted-text" style={{ marginTop: 6 }}>Submitted {d.submitted}</div>
    </div>
  );
}

function MiniFunded({ d, nav }) {
  return (
    <div className="card card-pad card-hover" style={{ padding: 20, cursor: "pointer" }} onClick={() => nav("deal", d.no)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <DealNo n={d.no} /><Pill status="funded" />
      </div>
      <div className="tnum" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--slate-deep)", fontWeight: 600 }}>{d.amount}</div>
      <div className="micro muted-text" style={{ marginTop: 6 }}>{d.city} · {d.rate} · Closed {d.closed}</div>
    </div>
  );
}

/* ---------- DASHBOARD ---------- */
function BrokerDashboard({ nav }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 36 }}>
        <h1 className="h1">{greet}, {B.user.first}</h1>
        <p className="lead" style={{ marginTop: 8, fontSize: 17 }}>Three new offers arrived overnight. One deal is in active negotiation.</p>
      </div>

      <div style={{ marginBottom: 32 }}><StatStrip stats={B.stats} /></div>

      <div style={{ marginBottom: 44 }}>
        <DealInFocus nav={nav} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }} className="dash-cols">
        <div>
          <SectionDivider n="01" label="New Offers" meta={B.newOffers.length + " in"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {B.newOffers.map((o, i) => <MiniOffer key={i} o={o} nav={nav} />)}
          </div>
        </div>
        <div>
          <SectionDivider n="02" label="Awaiting Response" meta={B.awaiting.length + " deals"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {B.awaiting.map((d, i) => <MiniAwaiting key={i} d={d} nav={nav} />)}
          </div>
        </div>
        <div>
          <SectionDivider n="03" label="Recently Funded" meta="This month" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {B.recentFunded.map((d, i) => <MiniFunded key={i} d={d} nav={nav} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PIPELINE ---------- */
function BrokerPipeline({ nav }) {
  const [filter, setFilter] = useState("all");
  const filters = [["all", "All"], ["active", "Active"], ["offer", "Offer In"], ["negotiating", "Negotiating"], ["draft", "Draft"]];
  const rows = B.pipeline.filter(d => filter === "all" || d.status === filter);
  return (
    <div className="page page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1 className="h1">Pipeline</h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>{B.pipeline.length} deals in the marketplace.</p>
        </div>
        <button className="btn btn-primary" onClick={() => nav("submit")}>Submit a deal</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {filters.map(([id, lbl]) => <Chip key={id} on={filter === id} onClick={() => setFilter(id)}>{lbl}</Chip>)}
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Deal", "Location", "Amount", "Position", "LTV", "Term", "Offers", "Status", ""].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 2 && i <= 6 ? "right" : "left", padding: "14px 18px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-2)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={i} className="prow" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                onClick={() => nav("deal", d.no)}
                onMouseEnter={e => e.currentTarget.style.background = "#FCFAF5"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px 18px" }}><span className="deal-no" style={{ fontSize: 14 }}>№ {d.no}</span></td>
                <td style={{ padding: "16px 18px", fontSize: 14 }}>{d.city}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", fontWeight: 600, color: "var(--slate-deep)" }}>{d.amount}</td>
                <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 14, color: "var(--text-2)" }}>{d.position}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right" }}>{d.ltv}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", color: "var(--text-2)" }}>{d.term}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right" }}>{d.offers || "—"}</td>
                <td style={{ padding: "16px 18px" }}><Pill status={d.status} /></td>
                <td style={{ padding: "16px 18px", textAlign: "right", color: "var(--muted)", fontSize: 18 }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- DEAL DETAIL ---------- */
function OfferCard({ o, nav, toast }) {
  return (
    <div className="card card-pad" style={{ borderColor: o.best ? "var(--amber)" : "var(--border)", position: "relative" }}>
      {o.best && <div style={{ position: "absolute", top: -1, right: 20, background: "var(--amber)", color: "var(--slate-deep)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "0 0 5px 5px" }}>Leading offer</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>Lender {o.id} — Anonymized</div>
          <div className="micro muted-text">{o.type}</div>
        </div>
        <span className="micro" style={{ color: "var(--amber-deep)", fontWeight: 600 }}>Expires in {o.expires}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, marginBottom: 16, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        {[["Rate", o.rate], ["Lender fee", o.lenderFee], ["Broker fee", o.brokerFee], ["Term", o.term]].map(([l, v], i) => (
          <div key={i} style={{ padding: "12px 14px", borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
            <div className="micro muted-text" style={{ marginBottom: 4 }}>{l}</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 600, color: "var(--slate-deep)", fontFamily: "var(--serif)" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <span className="micro muted-text">Conditions · </span>
        <span className="small">{o.conditions}</span>
      </div>
      {o.note && <p className="small" style={{ color: "var(--text-2)", fontStyle: "italic", marginBottom: 16, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>“{o.note}”</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => toast({ title: "Offer from Lender " + o.id + " accepted", sub: "The lender has been notified. Funding instructions will follow." })}>Accept</button>
        <button className="btn btn-secondary btn-sm" onClick={() => toast({ title: "Counter sent to Lender " + o.id, sub: "You'll be notified when they respond." })}>Counter</button>
        <button className="btn btn-danger btn-sm" onClick={() => toast({ title: "Offer declined", sub: "Lender " + o.id + " has been removed from this deal." })}>Decline</button>
      </div>
    </div>
  );
}

function BrokerDealDetail({ nav, toast, dealNo }) {
  const f = B.focus;
  return (
    <div className="page page-wide">
      <button className="btn btn-tertiary btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={() => nav("pipeline")}>‹ Back to pipeline</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <DealNo n={dealNo || f.no} size={15} /><Pill status="negotiating" />
          </div>
          <h1 className="h1">{f.amount} <span style={{ fontSize: 18, color: "var(--text-2)", fontFamily: "var(--sans)", fontWeight: 500 }}>CAD</span></h1>
          <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>{f.position} · {f.neighbourhood}, {f.city}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => toast({ title: "Borrower details revealed", sub: "Visible to lenders with active offers." })}>Reveal borrower</button>
          <button className="btn btn-secondary btn-sm">Edit deal</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40, marginTop: 36 }} className="detail-grid">
        <div>
          {/* Facts + AI summary */}
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
                ["Rate expectation", f.rate],
                ["Purpose", "Refinance — debt consolidation"],
              ]} />
            </div>
            <div>
              <SectionDivider n="02" label="Summary" meta="AI-generated" />
              <p className="body" style={{ color: "var(--text)", lineHeight: 1.65 }}>
                A first mortgage refinance on an owner-occupied detached home in East York, Toronto.
                The borrower is self-employed with two years of established business income and seeks to
                consolidate higher-interest obligations.
              </p>
              <p className="body" style={{ color: "var(--text)", lineHeight: 1.65, marginTop: 14 }}>
                At 72% loan-to-value against a recent appraisal of $590,000, the position is conservative
                for the segment. Exit is via refinance to an institutional lender at term, supported by an
                improving credit profile. Comparable East York refinances on Plynth have funded between
                8.75% and 9.5%.
              </p>
            </div>
          </div>

          {/* Offers */}
          <SectionDivider n="03" label="Offers" meta={B.dealOffers.length + " received"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {B.dealOffers.map((o, i) => <OfferCard key={i} o={o} nav={nav} toast={toast} />)}
          </div>
        </div>

        {/* Activity log */}
        <div>
          <SectionDivider n="04" label="Activity" />
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 3, top: 6, bottom: 6, width: 1, background: "var(--border)" }} />
            {B.activity.map((a, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 22 }}>
                <div style={{ position: "absolute", left: -20, top: 5, width: 7, height: 7, borderRadius: "50%", background: i === 0 ? "var(--amber)" : "var(--border)", border: "2px solid var(--offwhite)" }} />
                <div className="micro muted-text" style={{ marginBottom: 2 }}>{a.t}</div>
                <div className="small" style={{ color: "var(--slate-deep)" }}>{a.e}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- LENDERS DIRECTORY ---------- */
function BrokerLenders({ nav }) {
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Lenders</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>{B.lenders.length} subscribed lenders match your typical deals. Criteria shown; contact is brokered through Plynth.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="lender-grid">
        {B.lenders.map((l, i) => (
          <div key={i} className="card card-pad card-hover">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 className="h4" style={{ marginBottom: 2 }}>{l.name}</h3>
                <div className="micro muted-text">{l.type} · {l.region}</div>
              </div>
              <span className="pill pill-active" style={{ background: "var(--slate-bg)" }}>Subscribed</span>
            </div>
            <DefList items={[
              ["Asset classes", l.assets],
              ["Max LTV", l.ltv],
              ["Deal size", l.size],
              ["Typical close", l.speed],
            ]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- FUNDED ---------- */
function BrokerFunded({ nav }) {
  const [sort, setSort] = useState("date");
  const total = "$5.92M";
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 28 }}>
        <h1 className="h1">Funded</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>Your verifiable track record on Plynth.</p>
      </div>
      <div className="stat-strip" style={{ marginBottom: 28, gridTemplateColumns: "repeat(3,1fr)" }}>
        <StatBlock value="$5.92" unit="M" label="Funded — Trailing 90 Days" />
        <StatBlock value="$38.6" unit="M" label="Volume YTD" />
        <StatBlock value="9.1" unit="%" label="Avg Funded Rate" />
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Deal", "Location", "Amount", "Position", "Rate", "Fee", "Term", "Lender", "Closed"].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 2 && i <= 6 ? "right" : "left", padding: "14px 18px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-2)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {B.funded.map((d, i) => (
              <tr key={i} style={{ borderBottom: i < B.funded.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "16px 18px" }}><span className="deal-no" style={{ fontSize: 14 }}>№ {d.no}</span></td>
                <td style={{ padding: "16px 18px", fontSize: 14 }}>{d.city}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", fontWeight: 600, color: "var(--slate-deep)" }}>{d.amount}</td>
                <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 14, color: "var(--text-2)" }}>{d.position}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right" }}>{d.rate}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", color: "var(--text-2)" }}>{d.fee}</td>
                <td className="num" style={{ padding: "16px 18px", textAlign: "right", color: "var(--text-2)" }}>{d.term}</td>
                <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)" }}>{d.lender}</td>
                <td className="num" style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)" }}>{d.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { BrokerDashboard, BrokerPipeline, BrokerDealDetail, BrokerLenders, BrokerFunded });
