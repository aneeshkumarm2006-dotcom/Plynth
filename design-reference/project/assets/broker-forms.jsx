/* ============================================================
   PLYNTH — Broker auth & forms
   Login · Signup (3 steps) · Submit Deal · Settings
   ============================================================ */

/* ---------- AUTH SHELL (centered, off-white) ---------- */
function AuthShell({ children, wide }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 24px" }}>
      <div style={{ marginBottom: 40 }}><Logo size={32} /></div>
      <div className="card fade-in" style={{ width: "100%", maxWidth: wide || 440, padding: "40px 40px 36px", boxShadow: "var(--shadow-md)" }}>
        {children}
      </div>
      <p className="micro muted-text" style={{ marginTop: 28, maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
        Plynth operates a marketplace for licensed Canadian mortgage professionals. Access is reviewed.
      </p>
    </div>
  );
}

/* ---------- LOGIN ---------- */
function BrokerLogin({ nav, onAuth }) {
  return (
    <AuthShell>
      <h2 className="h2" style={{ marginBottom: 6 }}>Sign in</h2>
      <p className="small muted-text" style={{ marginBottom: 28 }}>Welcome back to the marketplace.</p>
      <Field label="Email"><input className="input" type="email" defaultValue="marcus@northbridge.ca" /></Field>
      <Field label="Password"><input className="input" type="password" defaultValue="••••••••••" /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <a className="small" style={{ color: "var(--slate)" }}>Forgot password</a>
      </div>
      <button className="btn btn-primary btn-block" onClick={onAuth}>Sign in</button>
      <p className="small muted-text" style={{ textAlign: "center", marginTop: 22 }}>
        New to Plynth? <a style={{ color: "var(--slate)", fontWeight: 600 }} onClick={() => nav("signup")}>Request access</a>
      </p>
    </AuthShell>
  );
}

/* ---------- SIGNUP (3 steps) ---------- */
function StepDots({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? "var(--slate)" : "var(--border)", transition: "background 200ms" }} />
      ))}
    </div>
  );
}

function BrokerSignup({ nav, onAuth }) {
  const [step, setStep] = useState(0);
  const labels = ["Account", "License", "Profile"];
  return (
    <AuthShell wide={480}>
      <StepDots step={step} total={3} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span className="sd-num" style={{ fontFamily: "var(--serif)", color: "var(--amber-deep)", fontSize: 13 }}>{"0" + (step + 1)}</span>
        <span className="sd-slash" style={{ color: "var(--border)" }}>/</span>
        <span className="sd-label" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--slate-deep)" }}>{labels[step]}</span>
      </div>

      {step === 0 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>Create your account</h2>
          <Field label="Work email"><input className="input" type="email" placeholder="you@brokerage.ca" /></Field>
          <Field label="Password" hint="At least 12 characters."><input className="input" type="password" placeholder="••••••••••••" /></Field>
          <Field label="Brokerage name"><input className="input" placeholder="e.g. Northbridge Mortgage Partners" /></Field>
        </div>
      )}
      {step === 1 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 6 }}>License verification</h2>
          <p className="small muted-text" style={{ marginBottom: 22 }}>We confirm your standing with the provincial regulator before access is granted.</p>
          <Field label="Regulator"><select className="select"><option>FSRA — Ontario</option><option>AMF — Québec</option><option>BCFSA — British Columbia</option><option>RECA — Alberta</option></select></Field>
          <Field label="Province"><select className="select"><option>Ontario</option><option>Québec</option><option>British Columbia</option><option>Alberta</option><option>Manitoba</option><option>Saskatchewan</option><option>Nova Scotia</option></select></Field>
          <Field label="License number" hint="Format varies by regulator."><input className="input input-num" placeholder="M08009124" /></Field>
        </div>
      )}
      {step === 2 && (
        <div className="fade-in">
          <h2 className="h3" style={{ marginBottom: 22 }}>Your profile</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <Avatar initials="+" size={56} />
            <button className="btn btn-ghost btn-sm">Upload photo</button>
          </div>
          <Field label="Full name"><input className="input" placeholder="Marcus Chen" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Years in business"><select className="select"><option>Less than 2</option><option>2–5</option><option>6–10</option><option>More than 10</option></select></Field>
            <Field label="Annual deal volume"><select className="select"><option>Under $10M</option><option>$10M–$25M</option><option>$25M–$50M</option><option>$50M+</option></select></Field>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => step < 2 ? setStep(s => s + 1) : onAuth()}>
          {step < 2 ? "Continue" : "Submit for review"}
        </button>
      </div>
      {step === 0 && <p className="small muted-text" style={{ textAlign: "center", marginTop: 20 }}>Already have access? <a style={{ color: "var(--slate)", fontWeight: 600 }} onClick={() => nav("login")}>Sign in</a></p>}
    </AuthShell>
  );
}

/* ---------- SUBMIT DEAL ---------- */
function SubmitStepHead({ n, label, meta }) {
  return <SectionDivider n={n} label={label} meta={meta} />;
}

function BrokerSubmit({ nav, toast }) {
  const [step, setStep] = useState(0);
  const [extracted, setExtracted] = useState(false);
  const [anon, setAnon] = useState(true);
  const steps = ["Property", "Loan details", "Borrower", "Documents", "Review"];

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <button className="btn btn-tertiary btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={() => nav("pipeline")}>‹ Cancel</button>
      <h1 className="h1" style={{ marginBottom: 8 }}>Submit a deal</h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>It takes about four minutes. Your borrower stays anonymized until a lender signals interest.</p>

      {/* Step rail */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        {steps.map((s, i) => (
          <div key={i} onClick={() => i < step && setStep(i)} style={{ flex: 1, cursor: i < step ? "pointer" : "default" }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= step ? "var(--slate)" : "var(--border)", marginBottom: 8, transition: "background 200ms" }} />
            <span className="micro" style={{ color: i <= step ? "var(--slate-deep)" : "var(--muted)", fontWeight: i === step ? 600 : 500 }}>{("0" + (i + 1)).slice(-2)} {s}</span>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ padding: 36, minHeight: 360 }}>
        {step === 0 && (
          <div className="fade-in">
            <SubmitStepHead n="01" label="Property" meta="Address & location" />
            <Field label="Property address"><input className="input" placeholder="Start typing an address…" defaultValue="142 Westbrook Avenue, East York, Toronto, ON" /></Field>
            <FigurePlaceholder label="[ map preview — 142 Westbrook Avenue ]" style={{ height: 200, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Property type"><select className="select"><option>Detached</option><option>Semi-detached</option><option>Townhouse</option><option>Condominium</option><option>Multi-residential</option><option>Commercial</option><option>Vacant land</option></select></Field>
              <Field label="Occupancy"><select className="select"><option>Owner-occupied</option><option>Tenant-occupied</option><option>Vacant</option></select></Field>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="fade-in">
            <SubmitStepHead n="02" label="Loan details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Loan amount (CAD)"><input className="input input-num" defaultValue="425,000" /></Field>
              <Field label="Appraised value (CAD)"><input className="input input-num" defaultValue="590,000" /></Field>
              <Field label="Position"><select className="select"><option>First mortgage</option><option>Second mortgage</option><option>Third mortgage</option></select></Field>
              <Field label="Computed LTV" hint="Auto-calculated"><input className="input input-num" defaultValue="72.0%" readOnly style={{ background: "#FCFAF5" }} /></Field>
              <Field label="Term"><select className="select"><option>6 months</option><option>12 months</option><option>18 months</option><option>24 months</option></select></Field>
              <Field label="Rate expectation"><input className="input" defaultValue="8.5–11%" /></Field>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="fade-in">
            <SubmitStepHead n="03" label="Borrower snapshot" meta="Anonymized by default" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#FCFAF5", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 22 }}>
              <div>
                <div className="small" style={{ fontWeight: 600, color: "var(--slate-deep)" }}>Reveal borrower identity on lender interest</div>
                <div className="micro muted-text">When off, lenders see the profile but not the name until they make an offer.</div>
              </div>
              <button onClick={() => setAnon(a => !a)} style={{ width: 44, height: 26, borderRadius: 13, border: "none", background: anon ? "var(--border)" : "var(--sage)", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 200ms" }}>
                <span style={{ position: "absolute", top: 3, left: anon ? 3 : 21, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left 200ms" }} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Employment"><select className="select"><option>Self-employed</option><option>Salaried</option><option>Commission</option><option>Retired</option></select></Field>
              <Field label="Beacon score band"><select className="select"><option>680–720</option><option>640–680</option><option>720+</option><option>600–640</option></select></Field>
              <Field label="Income (stated, CAD)"><input className="input input-num" defaultValue="180,000" /></Field>
              <Field label="Purpose"><select className="select"><option>Refinance — consolidation</option><option>Purchase</option><option>Bridge</option><option>Equity take-out</option></select></Field>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="fade-in">
            <SubmitStepHead n="04" label="Documents" meta="Appraisal · MLS · financials" />
            {!extracted ? (
              <div className="filedrop" onClick={() => setExtracted(true)} style={{ padding: 48 }}>
                <div className="small" style={{ color: "var(--slate-deep)", fontWeight: 600 }}>Drop documents here</div>
                <div className="micro" style={{ marginTop: 4 }}>PDF or image — Plynth reads them and proposes the terms</div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Browse files</button>
              </div>
            ) : (
              <div className="fade-in">
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                  {["Appraisal — 142 Westbrook Ave.pdf", "MLS listing.pdf", "Notice of Assessment 2025.pdf"].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)" }} />
                      <span className="small" style={{ flex: 1 }}>{f}</span>
                      <span className="micro muted-text">Read</span>
                    </div>
                  ))}
                </div>
                <div style={{ border: "1px solid var(--amber)", borderRadius: 8, padding: 22, background: "var(--amber-bg)" }}>
                  <div className="eyebrow" style={{ color: "var(--amber-deep)", marginBottom: 12 }}>From your documents, Plynth found</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 16 }}>
                    {[["LTV", "72%"], ["Position", "First"], ["Term", "12 months"], ["Appraised value", "$590,000"], ["Property", "Detached"], ["Occupancy", "Owner-occupied"]].map(([l, v], i) => (
                      <div key={i}><div className="micro muted-text">{l}</div><div className="num" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--slate-deep)" }}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-primary btn-sm">Confirm</button>
                    <button className="btn btn-ghost btn-sm">Edit values</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="fade-in">
            <SubmitStepHead n="05" label="Review & submit" />
            <DefList items={[
              ["Property", "142 Westbrook Avenue, East York, Toronto, ON"],
              ["Property type", "Detached, owner-occupied"],
              ["Loan amount", "$425,000 CAD"],
              ["Position", "First mortgage"],
              ["LTV", "72.0%"],
              ["Term", "12 months"],
              ["Rate expectation", "8.5–11%"],
              ["Borrower", anon ? "Anonymized until lender interest" : "Revealed on submission"],
              ["Documents", "3 attached"],
            ]} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 22, padding: "12px 14px", background: "#FCFAF5", border: "1px solid var(--border)", borderRadius: 6 }}>
              <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
              <span className="small muted-text">I confirm I am the licensed broker of record for this deal and have the borrower&rsquo;s consent to submit it to the marketplace.</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "space-between" }}>
        <div>{step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-tertiary">Save draft</button>
          <button className="btn btn-primary" onClick={() => {
            if (step < 4) setStep(s => s + 1);
            else { toast({ title: "Deal № 0252 submitted", sub: "Matching against 240 lender criteria sets." }); nav("dashboard"); }
          }}>{step < 4 ? "Continue" : "Submit to marketplace"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function BrokerSettings({ nav, toast }) {
  const [tab, setTab] = useState("profile");
  const tabs = [["profile", "Profile"], ["brokerage", "Brokerage"], ["notifications", "Notifications"], ["billing", "Billing"]];
  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Account</h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>Manage your profile, brokerage, and preferences.</p>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map(([id, lbl]) => (
            <a key={id} className={"nav-item" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>{lbl}</a>
          ))}
        </div>
        <div>
          {tab === "profile" && (
            <div className="fade-in">
              <SectionDivider n="01" label="Profile" />
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 24 }}>
                <Avatar initials="MC" size={64} />
                <button className="btn btn-ghost btn-sm">Change photo</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Full name"><input className="input" defaultValue="Marcus Chen" /></Field>
                <Field label="Email"><input className="input" defaultValue="marcus@northbridge.ca" /></Field>
                <Field label="Phone"><input className="input input-num" defaultValue="(416) 555-0142" /></Field>
                <Field label="Years in business"><select className="select"><option>6–10</option><option>More than 10</option></select></Field>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => toast({ title: "Profile updated" })}>Save changes</button>
            </div>
          )}
          {tab === "brokerage" && (
            <div className="fade-in">
              <SectionDivider n="02" label="Brokerage" />
              <DefList items={[
                ["Brokerage", "Northbridge Mortgage Partners"],
                ["Regulator", "FSRA — Ontario"],
                ["License", "M08009124"],
                ["Province", "Ontario"],
                ["Verification status", "Verified"],
              ]} />
              <button className="btn btn-ghost" style={{ marginTop: 18 }}>Update brokerage details</button>
            </div>
          )}
          {tab === "notifications" && (
            <div className="fade-in">
              <SectionDivider n="03" label="Notifications" />
              {[["New offers", true], ["Offer expiring soon", true], ["Lender views your deal", false], ["Deal funded", true], ["Weekly pipeline digest", true]].map(([l, on], i) => (
                <SettingToggle key={i} label={l} on={on} />
              ))}
            </div>
          )}
          {tab === "billing" && (
            <div className="fade-in">
              <SectionDivider n="04" label="Billing" meta="Brokers transact at funding" />
              <div className="card card-pad" style={{ background: "#FCFAF5", marginBottom: 20 }}>
                <p className="small muted-text">Plynth is free for brokers. A success fee of 0.25% applies only when a deal funds through the marketplace, invoiced at closing.</p>
              </div>
              <DefList items={[
                ["Plan", "Broker — no subscription"],
                ["Success fee", "0.25% at funding"],
                ["Funded this year", "$38.6M CAD"],
                ["Fees invoiced YTD", "$96,500 CAD"],
              ]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, on: initial }) {
  const [on, setOn] = useState(initial);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="small" style={{ color: "var(--slate-deep)", fontWeight: 500 }}>{label}</span>
      <button onClick={() => setOn(o => !o)} style={{ width: 44, height: 26, borderRadius: 13, border: "none", background: on ? "var(--sage)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 200ms" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left 200ms" }} />
      </button>
    </div>
  );
}

Object.assign(window, { BrokerLogin, BrokerSignup, BrokerSubmit, BrokerSettings });
