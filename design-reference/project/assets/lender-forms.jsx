/* ============================================================
   PLYNTH — Lender auth & forms
   Login · Signup (4 steps) · Criteria mgmt · Account & Billing
   ============================================================ */

function LAuthShell({ children, wide }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 24px" }}>
      <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={32} />
        <span className="micro" style={{ color: "var(--muted)", borderLeft: "1px solid var(--border)", paddingLeft: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>For Lenders</span>
      </div>
      <div className="card fade-in" style={{ width: "100%", maxWidth: wide || 440, padding: "40px 40px 36px", boxShadow: "var(--shadow-md)" }}>{children}</div>
      <p className="micro muted-text" style={{ marginTop: 28, maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>Plynth serves registered Canadian private lenders. Subscriptions billed in CAD.</p>
    </div>
  );
}

/* ---------- LOGIN ---------- */
function LenderLogin({ nav, onAuth }) {
  return (
    <LAuthShell>
      <h2 className="h2" style={{ marginBottom: 6 }}>Sign in</h2>
      <p className="small muted-text" style={{ marginBottom: 28 }}>Your matched deals are waiting.</p>
      <Field label="Email"><input className="input" type="email" defaultValue="eleanor@fortressmic.ca" /></Field>
      <Field label="Password"><input className="input" type="password" defaultValue="••••••••••" /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}><a className="small" style={{ color: "var(--slate)" }}>Forgot password</a></div>
      <button className="btn btn-primary btn-block" onClick={onAuth}>Sign in</button>
      <p className="small muted-text" style={{ textAlign: "center", marginTop: 22 }}>New to Plynth? <a style={{ color: "var(--slate)", fontWeight: 600 }} onClick={() => nav("signup")}>Build your criteria</a></p>
    </LAuthShell>
  );
}

/* ---------- SIGNUP (4 steps) ---------- */
function LStepDots({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? "var(--slate)" : "var(--border)", transition: "background 200ms" }} />
      ))}
    </div>
  );
}

function LenderSignup({ nav, onAuth }) {
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState("Professional");
  const labels = ["Account", "Firm", "Criteria", "Subscription"];

  // Step 3 — criteria builder — needs a wide canvas
  if (step === 2) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div className="topbar">
          <Logo size={30} />
          <span className="micro" style={{ color: "var(--muted)", borderLeft: "1px solid var(--border)", paddingLeft: 12, marginLeft: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>For Lenders</span>
          <div className="spacer" />
          <span className="small muted-text">Step 03 / 04 — Criteria</span>
        </div>
        <div className="page page-wide" style={{ paddingTop: 36 }}>
          <LStepDots step={2} total={4} />
          <div style={{ marginBottom: 32, maxWidth: 620 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>03 / Criteria</div>
            <h1 className="h1">Define what you fund.</h1>
            <p className="lead" style={{ fontSize: 17, marginTop: 8 }}>This is how Plynth knows which deals to send you. Watch the preview as you tune.</p>
          </div>
          <CriteriaBuilder onComplete={() => { window.scrollTo(0,0); setStep(3); }} ctaLabel="Continue to subscription" embedded />
          <div style={{ marginTop: 16 }}><button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button></div>
        </div>
      </div>
    );
  }

  return (
    <LAuthShell wide={step === 3 ? 760 : 480}>
      <LStepDots step={step} total={4} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span style={{ fontFamily: "var(--serif)", color: "var(--amber-deep)", fontSize: 13 }}>{"0" + (step + 1)}</span>
        <span style={{ color: "var(--border)" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--slate-deep)" }}>{labels[step]}</span>
      </div>

      {step === 0 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>Create your account</h2>
          <Field label="Work email"><input className="input" type="email" placeholder="you@firm.ca" /></Field>
          <Field label="Password" hint="At least 12 characters."><input className="input" type="password" placeholder="••••••••••••" /></Field>
          <Field label="Firm name"><input className="input" placeholder="e.g. Fortress MIC" /></Field>
        </div>
      )}
      {step === 1 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>About your firm</h2>
          <p className="small muted-text" style={{ marginBottom: 22 }}>We confirm registration before deals are matched.</p>
          <Field label="Firm type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              {["MIC", "Private Lender", "Family Office", "Debt Fund"].map((t) => <FirmTypeCard key={t} label={t} />)}
            </div>
          </Field>
          <Field label="Registration / regulatory body" hint="OSC, AMF, BCSC, or exempt-market dealer."><input className="input" placeholder="e.g. OSC — Ontario" /></Field>
          <Field label="Assets under management (CAD)"><select className="select"><option>Under $25M</option><option>$25M–$100M</option><option>$100M–$500M</option><option>$500M+</option></select></Field>
        </div>
      )}
      {step === 3 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>Choose your subscription</h2>
          <p className="small muted-text" style={{ marginBottom: 24 }}>Based on your criteria, you&rsquo;d match roughly 47 deals a month. Professional is the common fit.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[["Starter", "$299", "Up to 25 deals / mo"], ["Professional", "$599", "Unlimited + analytics"], ["Enterprise", "$999", "Teams + API"]].map(([name, price, desc]) => (
              <div key={name} onClick={() => setTier(name)} style={{
                border: "1px solid " + (tier === name ? "var(--amber)" : "var(--border)"),
                background: tier === name ? "var(--amber-bg)" : "var(--white)",
                borderRadius: 8, padding: "18px 16px", cursor: "pointer", transition: "all 200ms",
              }}>
                <div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{name}</div>
                <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--slate-deep)", margin: "6px 0 4px" }}>{price}<span style={{ fontSize: 12, color: "var(--text-2)" }}>/mo</span></div>
                <div className="micro muted-text">{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
            <div className="micro muted-text" style={{ letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Payment — secured by Stripe</div>
            <Field label="Card number"><input className="input input-num" placeholder="4242 4242 4242 4242" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Expiry"><input className="input input-num" placeholder="09 / 28" /></Field>
              <Field label="CVC"><input className="input input-num" placeholder="123" /></Field>
              <Field label="Postal code"><input className="input" placeholder="M5V 2T6" /></Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px" }}>
              <span className="small muted-text">{tier} — billed monthly</span>
              <span className="num small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{tier === "Starter" ? "$299" : tier === "Enterprise" ? "$999" : "$599"}.00 CAD</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => step < 3 ? setStep(s => s + 1) : onAuth()}>
          {step === 3 ? "Start matching" : "Continue"}
        </button>
      </div>
      {step === 0 && <p className="small muted-text" style={{ textAlign: "center", marginTop: 20 }}>Already a member? <a style={{ color: "var(--slate)", fontWeight: 600 }} onClick={() => nav("login")}>Sign in</a></p>}
    </LAuthShell>
  );
}

function FirmTypeCard({ label }) {
  const [on, setOn] = useState(label === "MIC");
  return (
    <div onClick={() => setOn(o => !o)} style={{
      border: "1px solid " + (on ? "var(--slate)" : "var(--border)"),
      background: on ? "var(--slate-bg)" : "var(--white)",
      borderRadius: 6, padding: "12px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
      color: on ? "var(--slate-deep)" : "var(--text-2)", transition: "all 200ms",
    }}>{label}</div>
  );
}

/* ---------- CRITERIA MANAGEMENT ---------- */
function LenderCriteria({ nav, toast }) {
  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 32, maxWidth: 620 }}>
        <h1 className="h1">Criteria</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>The instrument that decides which deals reach you. Adjust anytime.</p>
      </div>
      <CriteriaBuilder onComplete={() => toast({ title: "Criteria updated", sub: "Changes affect matching for new deals only." })} ctaLabel="Save changes" note="Changes affect matching for new deals only." />
    </div>
  );
}

/* ---------- ACCOUNT & BILLING ---------- */
function LenderAccount({ nav, toast }) {
  const [tab, setTab] = useState("subscription");
  const [tier, setTier] = useState("Professional");
  const tabs = [["subscription", "Subscription"], ["usage", "Usage"], ["payment", "Payment"], ["profile", "Profile"]];
  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Account</h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>Manage your subscription, usage, and firm profile.</p>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map(([id, lbl]) => <a key={id} className={"nav-item" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>{lbl}</a>)}
        </div>
        <div>
          {tab === "subscription" && (
            <div className="fade-in">
              <SectionDivider n="01" label="Subscription" meta="Billed monthly in CAD" />
              <div className="card card-pad" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "var(--amber)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span className="h4">Professional</span><span className="pill pill-matched">Current</span>
                  </div>
                  <div className="small muted-text">Unlimited matched deals · analytics · priority matching</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 600, color: "var(--slate-deep)" }}>$599<span style={{ fontSize: 13, color: "var(--text-2)" }}>/mo</span></div>
                  <div className="micro muted-text">Renews Jul 1, 2026</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[["Starter", "$299"], ["Professional", "$599"], ["Enterprise", "$999"]].map(([name, price]) => (
                  <div key={name} onClick={() => setTier(name)} style={{
                    border: "1px solid " + (tier === name ? "var(--slate)" : "var(--border)"),
                    background: tier === name ? "var(--slate-bg)" : "var(--white)",
                    borderRadius: 8, padding: "16px", cursor: "pointer", transition: "all 200ms",
                  }}>
                    <div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>{name}</div>
                    <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--slate-deep)", marginTop: 4 }}>{price}<span style={{ fontSize: 11, color: "var(--text-2)" }}>/mo</span></div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => toast({ title: "Subscription updated to " + tier, sub: "Prorated to your next billing date." })}>Change plan</button>
                <button className="btn btn-tertiary" style={{ color: "var(--dust)" }}>Cancel subscription</button>
              </div>
            </div>
          )}
          {tab === "usage" && (
            <div className="fade-in">
              <SectionDivider n="02" label="Usage" meta="June 2026" />
              <div className="stat-strip" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 24 }}>
                <StatBlock value="47" label="Deals Reviewed" />
                <StatBlock value="5" label="Offers Made" />
                <StatBlock value="2" label="Funded" />
              </div>
              <p className="body muted-text" style={{ maxWidth: "56ch" }}>You&rsquo;ve reviewed 47 deals this month against your Professional plan&rsquo;s unlimited allowance. Your win rate of 31% is above the marketplace median of 24%.</p>
            </div>
          )}
          {tab === "payment" && (
            <div className="fade-in">
              <SectionDivider n="03" label="Payment method" meta="Secured by Stripe" />
              <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <FigurePlaceholder label="VISA" style={{ width: 48, height: 32, borderRadius: 4 }} />
                  <div><div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>•••• 4242</div><div className="micro muted-text">Expires 09 / 28</div></div>
                </div>
                <button className="btn btn-ghost btn-sm">Update</button>
              </div>
              <DefList items={[["Billing email", "eleanor@fortressmic.ca"], ["Next charge", "$599.00 CAD on Jul 1"], ["Tax", "HST included"]]} />
            </div>
          )}
          {tab === "profile" && (
            <div className="fade-in">
              <SectionDivider n="04" label="Firm profile" />
              <DefList items={[["Firm", "Fortress MIC"], ["Type", "Mortgage Investment Corp."], ["Registration", "OSC — Ontario"], ["AUM", "$100M–$500M"], ["Primary contact", "Eleanor Whitfield"]]} />
              <button className="btn btn-ghost" style={{ marginTop: 18 }}>Edit firm details</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LenderLogin, LenderSignup, LenderCriteria, LenderAccount });
