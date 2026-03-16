import React, { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#FFFFFF",
  bg2:     "#F9FAFB",
  bg3:     "#F3F4F6",
  card:    "#FFFFFF",
  border:  "#E5E7EB",
  text:    "#111827",
  muted:   "#1F2937",
  dim:     "#9CA3AF",
  lime:    "#5B4FDB",
  blue:    "#2563EB",
  purple:  "#7C3AED",
  pink:    "#DB2777",
  green:   "#059669",
  amber:   "#D97706",
  yellow:  "#D97706",
  red:     "#EF4444",
  teal:    "#0891B2",
  navy:    "#111827",
  grad1:   "linear-gradient(135deg,#2563EB,#7C3AED)",
  grad2:   "linear-gradient(135deg,#0891B2,#2563EB)",
  grad3:   "linear-gradient(135deg,#DB2777,#7C3AED)",
  grad4:   "linear-gradient(135deg,#D97706,#DB2777)",
};
const F  = "'Plus Jakarta Sans', sans-serif";
const FM = "'DM Mono', monospace";
const WA = "https://wa.me/919833585810";  // Garima's WhatsApp — single source of truth

// ─── INVITE CODES → client data ──────────────────────────────────────────────
// 🔧 When you connect Supabase, replace this with a DB lookup
const INVITE_CODES = {
  "NEXO2026": {
    name: "Arjun Sharma", company: "NexPay Technologies",
    type: "cfo", clientPack: "startup", email: "arjun@nexpay.in",
  },
  "AGIL2026": {
    name: "Priya Mehta", company: "Agile Developers Pvt Ltd",
    type: "valuation", clientPack: "msme", email: "priya@agiledev.in",
  },
  // ── Demo logins — one per client type ──
  "DEMO-STARTUP": {
    name: "Riya Kapoor", company: "BrightAI Technologies (Startup)",
    type: "both", clientPack: "startup", email: "demo-startup@finzzup.com",
  },
  "DEMO-MSME": {
    name: "Suresh Gupta", company: "Gupta Exports Pvt Ltd (MSME)",
    type: "both", clientPack: "msme", email: "demo-msme@finzzup.com",
  },
  "DEMO-CORP": {
    name: "Anita Desai", company: "Horizon Manufacturing Ltd (Corporate)",
    type: "both", clientPack: "corporate", email: "demo-corp@finzzup.com",
  },
};

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const KPIs = [
  { label:"Revenue",      value:"₹8.4 Cr",  prev:"₹7.9 Cr",  trend:"up",   color:C.blue,   bg:"#EEF3FE", icon:"📈" },
  { label:"Gross Margin", value:"41%",       prev:"38%",       trend:"up",   color:C.teal,   bg:"#E6FAF7", icon:"💹" },
  { label:"Cash Balance", value:"₹2.1 Cr",  prev:"₹2.6 Cr",  trend:"down", color:C.amber,  bg:"#FEF7E7", icon:"🏦" },
  { label:"Burn Rate",    value:"₹48L/mo",  prev:"₹52L/mo",  trend:"up",   color:C.purple, bg:"#F3EFFF", icon:"🔥" },
  { label:"Runway",       value:"4.4 mo",   prev:"5.0 mo",   trend:"down", color:C.pink,   bg:"#FEF0F7", icon:"⏳" },
  { label:"ARR",          value:"₹6.2 Cr",  prev:"₹5.4 Cr",  trend:"up",   color:C.green,  bg:"#E8FAF3", icon:"🎯" },
];

// ─── KPI CONTEXT GENERATOR ────────────────────────────────────────────────────
// Generates a one-line meaningful insight for any KPI based on label, value, trend, prev
function kpiContext(k) {
  const label = (k.label || "").toLowerCase();
  const up    = k.trend === "up";
  const prev  = k.prev && k.prev !== "—" ? k.prev : null;
  const val   = k.value || "";

  if (label.includes("revenue")) {
    if (!prev) return "Track monthly to spot growth trend";
    return up ? `Up from ${prev} — growth on track` : `Down from ${prev} — review pipeline`;
  }
  if (label.includes("margin") || label.includes("gross")) {
    const num = parseFloat(val);
    if (num >= 60) return "Excellent margin — strong unit economics";
    if (num >= 40) return "Healthy margin · target 45%+ before raise";
    if (num >= 20) return "Moderate · watch cost structure";
    return prev ? (up ? `Improving from ${prev} — keep focus` : `Declined from ${prev} — review COGS`) : "Monitor cost of goods sold";
  }
  if (label.includes("cash") || label.includes("balance")) {
    const num = parseFloat(val);
    if (!prev) return "Maintain 6+ months of runway";
    return up ? `Up from ${prev} — healthy position` : `Down from ${prev} — monitor burn`;
  }
  if (label.includes("burn")) {
    return up ? `Improved from ${prev || "last month"} — efficiency gaining` : prev ? `Up from ${prev} — review spend` : "Lower is better — target <₹40L/mo";
  }
  if (label.includes("runway")) {
    const num = parseFloat(val);
    if (num >= 12) return "Strong runway — focus on growth";
    if (num >= 6)  return "Adequate · start fundraise planning now";
    if (num >= 3)  return "⚠️ Under 6 months — act immediately";
    return "🔴 Critical — fundraise or cut costs now";
  }
  if (label.includes("arr") || label.includes("mrr")) {
    return up ? `Growing — ${prev ? `up from ${prev}` : "positive trend"}` : prev ? `Declined from ${prev} — check churn` : "Annual recurring revenue";
  }
  if (label.includes("ebitda")) {
    return up ? "Improving profitability" : prev ? `Down from ${prev} — review opex` : "Earnings before interest & tax";
  }
  if (label.includes("debtor") || label.includes("receivable")) {
    const num = parseFloat(val);
    if (num > 45) return "⚠️ High — chase collections urgently";
    if (num > 30) return "Above target · follow up overdue invoices";
    return "✅ Within target range";
  }
  if (label.includes("working capital")) {
    return up ? `Improved from ${prev || "last period"}` : "Monitor current assets vs liabilities";
  }
  if (label.includes("pat") || label.includes("profit")) {
    return up ? `Profitable · up from ${prev || "last month"}` : prev ? `Declined from ${prev}` : "Net profit after tax";
  }
  // generic fallback
  if (prev) return up ? `Improved from ${prev}` : `Changed from ${prev}`;
  return "Updated by Garima";
}


const CASHFLOW = [
  { month:"Sep", value:210, forecast:null },
  { month:"Oct", value:185, forecast:null },
  { month:"Nov", value:240, forecast:null },
  { month:"Dec", value:260, forecast:null },
  { month:"Jan", value:195, forecast:null },
  { month:"Feb", value:220, forecast:null },
  { month:"Mar", value:null, forecast:175 },
  { month:"Apr", value:null, forecast:200 },
  { month:"May", value:null, forecast:230 },
];

// Pack-specific default action items (shown in demo / before Supabase loads)
const ACTIONS_BY_PACK = {
  startup: [
    { id:1, text:"File GST returns for Q3 — deadline 15 March",                  priority:"High",   done:false },
    { id:2, text:"Send updated projections to Series A lead investor",            priority:"High",   done:false },
    { id:3, text:"Review and approve revised marketing budget",                   priority:"Medium", done:true  },
    { id:4, text:"Delay equipment purchase to April — cash is tight in March",   priority:"Medium", done:false },
    { id:5, text:"Share board pack with all directors before 28 Feb",            priority:"Low",    done:true  },
  ],
  msme: [
    { id:1, text:"File GSTR-3B for February — deadline 20 March",                priority:"High",   done:false },
    { id:2, text:"Follow up with Client B on ₹4.8L overdue (90+ days)",         priority:"High",   done:false },
    { id:3, text:"Pay advance tax Q4 instalment by 15 March",                    priority:"High",   done:false },
    { id:4, text:"Renew SBI FD (Tranche 1) maturing 15 March — ₹10L",           priority:"Medium", done:false },
    { id:5, text:"Review creditor payment terms with Supplier X",                priority:"Low",    done:true  },
  ],
  corporate: [
    { id:1, text:"Confirm director availability for board meeting — 18 March",   priority:"High",   done:false },
    { id:2, text:"Complete Ind AS 116 lease restatement for Q4",                 priority:"High",   done:false },
    { id:3, text:"File advance tax Q4 — deadline 15 March",                      priority:"High",   done:false },
    { id:4, text:"Share draft board pack with CFO for review by 12 March",       priority:"Medium", done:true  },
    { id:5, text:"Update related-party transaction disclosures for annual report",priority:"Low",    done:false },
  ],
};
const ACTIONS = ACTIONS_BY_PACK.startup; // fallback

const BOARD_PACKS = [
  { name:"Board Pack — February 2026", date:"20 Feb 2026", size:"2.4 MB", uploadedAt:"2026-02-20" },
  { name:"Board Pack — January 2026",  date:"22 Jan 2026", size:"2.1 MB", uploadedAt:"2026-01-22" },
  { name:"Board Pack — December 2025", date:"19 Dec 2025", size:"1.9 MB", uploadedAt:"2025-12-19" },
  { name:"Board Pack — November 2025", date:"21 Nov 2025", size:"2.0 MB", uploadedAt:"2025-11-21" },
].map(p => ({ ...p, new: (new Date() - new Date(p.uploadedAt)) < 35 * 24 * 60 * 60 * 1000 }));

const ENGAGEMENT = {
  type: "DCF Valuation — Section 56(2)(viib)",
  ref: "VAL-240216",
  status: 2,
  stages: ["Docs Requested","Docs Received","Analysis","Draft Ready","Revision","Final Signed"],
  expectedDate: "28 Feb 2026",
  docs: [
    { name:"Audited P&L (3 years)",       done:true  },
    { name:"Balance Sheet (3 years)",     done:true  },
    { name:"5-Year Projections",          done:true  },
    { name:"Debt Schedule",               done:false },
    { name:"Cap Table",                   done:false },
  ],
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Card = ({ children, style={} }) => (
  <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16,
    padding:24, boxShadow:"0 1px 4px rgba(15,26,56,0.06)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:20 }}>
    <h2 style={{ fontFamily:F, fontWeight:700, fontSize:17, color:C.text, margin:0 }}>{children}</h2>
    {sub && <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>{sub}</p>}
  </div>
);

const Badge = ({ children, color=C.blue, bg }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:100,
    background:bg||`${color}18`, fontSize:11, fontWeight:700, color,
    fontFamily:F, letterSpacing:"0.05em" }}>
    {children}
  </span>
);

const PriBadge = ({ p }) => {
  const map = { High:[C.red,"#FEF2F2"], Medium:[C.amber,"#FFFBEB"], Low:[C.green,"#ECFDF5"] };
  const [c,bg] = map[p]||map.Low;
  return <Badge color={c} bg={bg}>{p}</Badge>;
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const LOGO_SRC = "data:image/png;base64,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6ete8khEOGXRqBapHF879vuL7hhcMGCHEJW2YUS16spqAVTavgHRr56m5f5u7kNj3jFKTXdDMZySEsiGBjiBAvcMj8+emP1+K6uoaFt80JCip60MKvJS9tfbWq06KOHY6eSh3q0QwlFKXT7tll/dnrHax0m/S3Q0eVY99/yPqoQQDgBhmqa9YQMQDBY+6ijnUn9OZlwwWDyotbl5X1v8YK0vqL8HYBcABPzeRiX0tehafd+znLFYxAKU+N71ddNfeC72urLkNwYPyfnWgcbE2rIvD7pkZqR8DwARiUSs7Or+Hz88d84f1+38sKGioCgwOxUXtS4t7ycPLap4LmpEtcrqSnv48MI8tycwQzmQRqmpNxTDOXAAckaksnbajxZH3Jp2LoAPAGDgwCGvCOG7JpHsGO/z5hXU1+1bb6lMe1ub86JS0aQQAsOGD4zG423XQGJSjndIoKW5uV7qysnLldu7y6i5XLttWz6HkXAAoQQnA4iITjr/wp/mf2rBmDi5y/b55H70SvvPvQ6J/r+ksQro1G7YTQmUC6BEGiiTRuhxrWbXShVB5KhGpaYG+q5d5QBKpGGEZW1tdR8Ndg3QY//sKvMSCRgim1c2P+Dwqn7DiGrFxaXayJHlcuSucjkyVC4vvHCyqK39Ua/1BApK1ISg79oVO6H7yA0jqtXWlgogpo59rkenmzBliVEia2t7nB8MrRZG13mXSQNhaaBUxHrsr6AEzHI9FusUQJkMhQxt166jj28YhlZWG5a1QFedlHRtW6MO15sSoeOXU2RX8huythYyFDK0nTtr1NGjIjHVXb+7dpXDMCbLsjJD1tZWq551YZrlIhY79vnW1tb2vAoCqNWAMgmUyRAMbWSoXPY8VxOmjHXVFXrUG1DbO1CpgR47wWtJREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREJ5v/Bj/n9fr1VVNsAAAAAElFTkSuQmCC";

const Logo = ({ size=32, darkText=false, showTagline=false }) => {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
      <img src={LOGO_SRC} alt="Finzzup"
        style={{ height: size * 1.4, width:"auto", objectFit:"contain", display:"block" }}/>
      {showTagline && (
        <div style={{ fontFamily:"'Plus Jakarta Sans', sans-serif", fontSize:9,
          color: darkText ? "#9CA3AF" : "rgba(255,255,255,0.5)",
          marginTop:2, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          Build. Value. Scale.
        </div>
      )}
    </div>
  );
};

// ─── LOGIN INPUT— defined OUTSIDE Login so it never remounts on re-render ────
function LoginInput({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:"0.08em", display:"block", marginBottom:7, fontFamily:F }}>{label}</label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        autoComplete={type==="password" ? "current-password" : "email"}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:16,
          border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
          background:C.bg, outline:"none", boxSizing:"border-box",
          transition:"border-color 0.2s", WebkitTextSizeAdjust:"100%",
          touchAction:"manipulation" }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e  => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [step, setStep]     = useState("code"); // "code" | "register" | "signin"
  const [code, setCode]     = useState("");
  const [client, setClient] = useState(null);
  const [form, setForm]     = useState({ email:"", password:"", confirm:"" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Note: session restore is handled at App level — Login only shows when no session exists

  // Check invite code — demo codes use local data, real codes hit Supabase
  const checkCode = async () => {
    if (!code.trim()) { setError("Please enter an invite code."); return; }
    const upper = code.trim().toUpperCase();
    setLoading(true); setError("");

    // ── Demo codes: bypass Supabase, log straight in with dummy data ──
    if (INVITE_CODES[upper]) {
      const raw = INVITE_CODES[upper];
      const demo = { ...raw, invite_code: upper, id: upper, isDemo: true,
        client_pack: raw.clientPack || raw.client_pack || "startup" };
      setLoading(false);
      onLogin(demo);   // straight to Portal, no password needed
      return;
    }

    // ── Real codes: look up in Supabase clients table ──
    const { data, error: err } = await supabase
      .from("clients")
      .select("*")
      .eq("invite_code", upper)
      .eq("active", true)
      .single();
    setLoading(false);
    if (err || !data) { setError("Invalid invite code. Please contact garima@finzzup.com"); return; }
    setClient(data);
    setForm(f => ({ ...f, email: data.email }));
    setStep("register");   // real client must set a password
  };

  // Register new account with Supabase Auth
  const register = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (form.password.length < 6)      { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { client_id: client.id, invite_code: client.invite_code } }
    });
    setLoading(false);
    if (authErr) { setError(authErr.message); return; }
    // Fetch fresh client row from DB to ensure all fields (client_pack etc) are present
    const { data: freshClient } = await supabase
      .from("clients").select("*").eq("email", form.email.trim()).single();
    onLogin(freshClient || client);
  };

  // Sign in existing account
  const signIn = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");

    // ── Demo email shortcut (shouldn't normally reach here, but just in case) ──
    const demoMatch = Object.values(INVITE_CODES).find(d => d.email === form.email.trim().toLowerCase());
    if (demoMatch) {
      setLoading(false);
      onLogin({ ...demoMatch, isDemo: true,
        client_pack: demoMatch.clientPack || demoMatch.client_pack || "startup" });
      return;
    }

    // ── Real Supabase signin ──
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email.trim(), password: form.password
    });
    if (authErr) { setLoading(false); setError("Incorrect email or password."); return; }
    const { data, error: dbErr } = await supabase
      .from("clients").select("*").eq("email", form.email.trim()).single();
    setLoading(false);
    if (dbErr || !data) { setError("Account not found. Please register first."); return; }
    onLogin(data);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:F }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none",
        background:`radial-gradient(ellipse 60% 50% at 20% 30%, rgba(59,111,247,0.07) 0%, transparent 60%),
                   radial-gradient(ellipse 40% 40% at 80% 70%, rgba(124,92,245,0.06) 0%, transparent 60%)` }}/>

      <div style={{ width:"100%", maxWidth:420, position:"relative" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <img src={LOGO_SRC} alt="Finzzup" style={{ height:64, width:"auto", objectFit:"contain" }}/>
            </div>
            <p style={{ fontSize:12, color:C.muted, margin:0, letterSpacing:"0.03em" }}>
              Build. Value. Scale.
            </p>
          </div>
          <p style={{ fontSize:13, color:C.muted, marginTop:8 }}>Secure Client Portal</p>
        </div>

        <Card style={{ padding:32 }}>

          {/* ── STEP 1: Enter invite code ── */}
          {step === "code" && <>
            <h2 style={{ fontWeight:700, fontSize:20, color:C.text, marginBottom:6, textAlign:"center" }}>
              Welcome
            </h2>
            <p style={{ fontSize:13, color:C.muted, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              New client? Enter your invite code to register.<br/>
              Already have an account?{" "}
              <button onClick={() => setStep("signin")}
                style={{ background:"none", border:"none", color:C.blue, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:F }}>
                Sign in here
              </button>
            </p>

            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
              letterSpacing:"0.08em", display:"block", marginBottom:8, fontFamily:F }}>
              Invite Code
            </label>
            <input value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={e => e.key === "Enter" && checkCode()}
              placeholder="e.g. NEXO2026"
              style={{ width:"100%", padding:"13px 15px", borderRadius:10, fontSize:16,
                border:`1.5px solid ${error ? C.red : C.border}`, fontFamily:FM,
                fontWeight:600, letterSpacing:"0.1em", color:C.text, background:C.bg,
                outline:"none", boxSizing:"border-box", textTransform:"uppercase",
                textAlign:"center", transition:"border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e  => e.target.style.borderColor = error ? C.red : C.border}
            />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:8, textAlign:"center" }}>{error}</p>}

            <button onClick={checkCode} disabled={loading} style={{ width:"100%", marginTop:16, padding:14,
              borderRadius:12, border:"none", background:C.grad1, color:"white",
              fontFamily:F, fontWeight:700, fontSize:15, cursor:"pointer", opacity:loading?0.75:1,
              boxShadow:"0 6px 20px rgba(59,111,247,0.28)", touchAction:"manipulation" }}>
              {loading ? "Checking…" : "Continue →"}
            </button>

            <p style={{ textAlign:"center", fontSize:12, color:C.dim, marginTop:20 }}>
              Don't have a code?{" "}
              <a href="mailto:garima@finzzup.com" style={{ color:C.blue, fontWeight:600 }}>
                Email garima@finzzup.com
              </a>
            </p>

            {/* Demo accounts */}
            <div style={{ marginTop:20, padding:"14px 16px", borderRadius:12,
              background:`${C.blue}0A`, border:`1px solid ${C.blue}20` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:10, fontFamily:F }}>🔍 Try a demo account</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { code:"DEMO-STARTUP", label:"Startup / CFO Client", icon:"🚀", color:C.blue   },
                  { code:"DEMO-MSME",    label:"MSME Client",           icon:"🏢", color:C.teal   },
                  { code:"DEMO-CORP",    label:"Corporate Client",       icon:"🏦", color:C.purple },
                ].map(d => (
                  <button key={d.code} onClick={() => setCode(d.code)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"9px 12px", borderRadius:9, border:`1px solid ${d.color}25`,
                      background:`${d.color}08`, cursor:"pointer", fontFamily:F, width:"100%",
                      touchAction:"manipulation" }}>
                    <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{d.icon} {d.label}</span>
                    <span style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:d.color }}>{d.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </>}

          {/* ── STEP 2: Register ── */}
          {step === "register" && <>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24,
              padding:"12px 14px", borderRadius:12, background:`${C.green}0A`, border:`1px solid ${C.green}25` }}>
              <span style={{ fontSize:22 }}>✅</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Code accepted!</div>
                <div style={{ fontSize:12, color:C.muted }}>{client?.company}</div>
              </div>
            </div>
            <h2 style={{ fontWeight:700, fontSize:18, color:C.text, marginBottom:20 }}>Create your account</h2>
            <LoginInput label="Email"            value={form.email}    onChange={e => { setForm(f=>({...f,email:e.target.value}));    setError(""); }} type="email"    placeholder="your@email.com" />
            <LoginInput label="Password"         value={form.password} onChange={e => { setForm(f=>({...f,password:e.target.value})); setError(""); }} type="password" placeholder="Min 6 characters" />
            <LoginInput label="Confirm Password" value={form.confirm}  onChange={e => { setForm(f=>({...f,confirm:e.target.value}));  setError(""); }} type="password" placeholder="Repeat password" />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
            <button onClick={register} disabled={loading} style={{ width:"100%", marginTop:8, padding:14,
              borderRadius:12, border:"none", background:C.grad1, color:"white",
              fontFamily:F, fontWeight:700, fontSize:15, cursor:"pointer", opacity:loading?0.75:1,
              boxShadow:"0 6px 20px rgba(59,111,247,0.28)", touchAction:"manipulation" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
            <button onClick={() => { setStep("code"); setError(""); }} style={{ width:"100%",
              marginTop:10, padding:12, borderRadius:12, border:`1px solid ${C.border}`,
              background:"transparent", color:C.muted, fontFamily:F, fontSize:14, cursor:"pointer" }}>
              ← Back
            </button>
          </>}

          {/* ── STEP 3: Sign in (returning client) ── */}
          {step === "signin" && <>
            <h2 style={{ fontWeight:700, fontSize:20, color:C.text, marginBottom:6 }}>Welcome back</h2>
            <p style={{ fontSize:13, color:C.muted, marginBottom:24, lineHeight:1.6 }}>
              Sign in to your Finzzup portal.
            </p>
            <LoginInput label="Email"    value={form.email}    onChange={e => { setForm(f=>({...f,email:e.target.value}));    setError(""); }} type="email"    placeholder="your@email.com" />
            <LoginInput label="Password" value={form.password} onChange={e => { setForm(f=>({...f,password:e.target.value})); setError(""); }} type="password" placeholder="Your password" />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
            <button onClick={signIn} disabled={loading} style={{ width:"100%", marginTop:8, padding:14,
              borderRadius:12, border:"none", background:C.grad1, color:"white",
              fontFamily:F, fontWeight:700, fontSize:15, cursor:"pointer", opacity:loading?0.75:1,
              boxShadow:"0 6px 20px rgba(59,111,247,0.28)", touchAction:"manipulation" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
            <button onClick={() => { setStep("code"); setError(""); }} style={{ width:"100%",
              marginTop:10, padding:12, borderRadius:12, border:`1px solid ${C.border}`,
              background:"transparent", color:C.muted, fontFamily:F, fontSize:14, cursor:"pointer" }}>
              ← New client? Enter invite code
            </button>
          </>}

        </Card>
        <p style={{ textAlign:"center", fontSize:11, color:C.dim, marginTop:20 }}>
          Powered by Finzzup · garima@finzzup.com<br/>
          <span style={{ marginTop:6, display:"block" }}>
            <a href="#" style={{ color:C.blue, textDecoration:"none" }}>Terms & Conditions</a>
            {" · "}
            <a href="#" style={{ color:C.blue, textDecoration:"none" }}>Privacy Policy</a>
            {" · "}© 2026 Finzzup Advisory LLP
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
// Dynamic nav based on client pack type
function getNav(client) {
  const pack = client?.client_pack || client?.clientPack || "startup";
  const type = client?.type || "both";

  const base = [
    { id:"overview",  icon:"🏠", label:"Overview"  },
    { id:"dashboard", icon:"📊", label:"Dashboard" },
  ];

  // CFO/financial items — shown for cfo + both
  if (type === "cfo" || type === "both") {
    base.push({ id:"cashflow", icon:"💰", label:"Cash Flow" });
    base.push({ id:"actions",  icon:"✅", label:"Action Items" });
  }

  // My Reports — label changes by pack type
  const reportLabel = pack === "msme" ? "MSME Report"
    : pack === "corporate" ? "Board Report"
    : "CFO Report";
  const reportIcon = pack === "msme" ? "🏢"
    : pack === "corporate" ? "🏦"
    : "📊";
  base.push({ id:"myreport", icon:reportIcon, label:reportLabel });

  // Valuation — shown for valuation + both
  if (type === "valuation" || type === "both") {
    base.push({ id:"engagement", icon:"📋", label:"Valuation Status" });
  }

  base.push({ id:"market",     icon:"🌐", label:"Market Intel" });
  base.push({ id:"calendar",   icon:"📅", label:"Book a Call"  });
  base.push({ id:"newrequest", icon:"➕", label:"New Request"  });
  base.push({ id:"documents",  icon:"📁", label:"My Documents" });
  base.push({ id:"invoices",   icon:"🧾", label:"Invoices",    badge:2 });
  // Treasury more relevant for MSME (FD/cash management) and Corporate — less so for early startup
  if (pack === "msme" || pack === "corporate") {
    base.push({ id:"treasury", icon:"💎", label:"Treasury" });
  }
  return base;
}

function Sidebar({ page, setPage, client, onLogout, collapsed, setCollapsed }) {  return (
    <aside style={{ width:collapsed?64:220, minHeight:"100vh", background:C.navy, flexShrink:0,
      display:"flex", flexDirection:"column", transition:"width 0.25s", overflow:"hidden",
      borderRight:`1px solid rgba(255,255,255,0.06)` }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? "20px 0" : "22px 20px", display:"flex",
        alignItems:"center", justifyContent:collapsed?"center":"space-between",
        borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        {!collapsed && (
          <img src={LOGO_SRC} alt="Finzzup"
            style={{ height:38, width:"auto", objectFit:"contain", display:"block",
              objectFit:"contain" }}/>
        )}
        {collapsed && (
          <img src={LOGO_SRC} alt="Finzzup"
            style={{ height:28, width:28, objectFit:"contain", display:"block",
              objectFit:"contain" }}/>
        )}
        <button onClick={() => setCollapsed(c=>!c)} style={{ background:"none", border:"none",
          cursor:"pointer", color:"rgba(255,255,255,0.4)", fontSize:16, padding:4, lineHeight:1 }}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Client info */}
      {!collapsed && (
        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:2, fontFamily:F }}>Logged in as</div>
          <div style={{ fontSize:13, fontWeight:700, color:"white", fontFamily:F }}>{client.name}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:F }}>{client.company}</div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex:1, padding:"10px 0", overflowY:"auto" }}>
        {getNav(client).map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            title={collapsed ? n.label : undefined}
            style={{
            display:"flex", alignItems:"center", gap:10,
            width:"100%", padding: collapsed ? "12px 0" : "11px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: page===n.id ? "rgba(59,111,247,0.18)" : "transparent",
            border:"none", cursor:"pointer", borderLeft: page===n.id ? `3px solid ${C.blue}` : "3px solid transparent",
            transition:"all 0.15s", fontFamily:F,
          }}>
            <span style={{ fontSize:17 }}>{n.icon}</span>
            {!collapsed && <span style={{ fontSize:13, fontWeight:600, flex:1, textAlign:"left",
              color: page===n.id ? "white" : "rgba(255,255,255,0.5)" }}>
              {n.label}
            </span>}
            {!collapsed && n.badge && (
              <span style={{ background:C.amber, color:C.navy, borderRadius:"50%",
                width:18, height:18, fontSize:10, fontWeight:900, display:"flex",
                alignItems:"center", justifyContent:"center", fontFamily:F }}>
                {n.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: collapsed?"10px 0":"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        {!collapsed && (
          <button onClick={() => setPage("terms")} style={{ display:"flex", alignItems:"center", gap:8,
            width:"100%", padding:"8px 12px", justifyContent:"flex-start",
            background:"none", border:"none", cursor:"pointer", borderRadius:8,
            fontFamily:F, fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.25)", marginBottom:4 }}>
            <span>📜</span> Terms & Privacy
          </button>
        )}
        <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8,
          width:"100%", padding: collapsed?"10px 0":"10px 12px", justifyContent:collapsed?"center":"flex-start",
          background:"none", border:"none", cursor:"pointer", borderRadius:8,
          fontFamily:F, fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.35)" }}>
          <span>🚪</span>
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ title, client, setPage, notifItems=[] }) {
  const now = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  const [open, setOpen] = React.useState(false);
  const count = notifItems.length;
  return (
    <header style={{ height:58, background:C.bg2, borderBottom:`1px solid ${C.border}`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 24px", flexShrink:0, position:"relative", zIndex:50 }}>
      <h1 style={{ fontFamily:F, fontWeight:700, fontSize:17, color:C.text, margin:0 }}>{title}</h1>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:12, color:C.dim, fontFamily:F }}>{now}</span>
        {/* Notification bell */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setOpen(o => !o)}
            style={{ position:"relative", background:"none", border:"none", cursor:"pointer",
              width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:18 }}>🔔</span>
            {count > 0 && (
              <span style={{ position:"absolute", top:0, right:0, width:14, height:14,
                background:C.red, borderRadius:"50%", fontSize:8, fontWeight:900,
                color:"white", display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:F, border:"1.5px solid white" }}>{count > 9 ? "9+" : count}</span>
            )}
          </button>
          {open && (
            <div style={{ position:"absolute", top:38, right:0, width:300, background:C.bg2,
              borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", border:`1px solid ${C.border}`,
              overflow:"hidden", zIndex:100 }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
                fontFamily:F, fontWeight:700, fontSize:13, color:C.text, display:"flex",
                justifyContent:"space-between", alignItems:"center" }}>
                <span>Notifications</span>
                {count > 0 && <span style={{ fontSize:11, color:C.muted }}>{count} unread</span>}
              </div>
              {notifItems.length === 0 ? (
                <div style={{ padding:"20px 16px", textAlign:"center", fontFamily:F,
                  fontSize:13, color:C.dim }}>All caught up ✅</div>
              ) : (
                <div style={{ maxHeight:320, overflowY:"auto" }}>
                  {notifItems.map((n,i) => (
                    <div key={i} onClick={() => { setPage && setPage(n.page); setOpen(false); }}
                      style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
                        cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start",
                        background:"transparent", transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{n.icon}</span>
                      <div>
                        <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text,
                          marginBottom:2 }}>{n.title}</div>
                        <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>{n.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
                <button onClick={() => { setPage && setPage("invoices"); setOpen(false); }}
                  style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"none",
                    background:C.bg, fontFamily:F, fontSize:12, fontWeight:600,
                    color:C.blue, cursor:"pointer" }}>
                  View all invoices →
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{ width:32, height:32, borderRadius:"50%", background:C.grad1,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:700, color:"white", fontFamily:F }}>
          {client.name[0]}
        </div>
      </div>
    </header>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
const OVERVIEW_REVEXP = [
  { month:"Sep", revenue:68, expenses:52 },
  { month:"Oct", revenue:71, expenses:55 },
  { month:"Nov", revenue:75, expenses:58 },
  { month:"Dec", revenue:80, expenses:60 },
  { month:"Jan", revenue:74, expenses:57 },
  { month:"Feb", revenue:71, expenses:54 },
];
const OVERVIEW_CF = [
  { month:"Sep", net:16 },
  { month:"Oct", net:16 },
  { month:"Nov", net:17 },
  { month:"Dec", net:20 },
  { month:"Jan", net:17 },
  { month:"Feb", net:17 },
];
const OVERVIEW_ENGAGEMENTS = [
  { id:1, title:"Series A Pre-Funding Valuation", type:"Valuation", status:"Completed",  color:"#10B981" },
  { id:2, title:"Fractional CFO — Q1 2026",       type:"CFO",       status:"Active",     color:"#3B6FF7" },
  { id:3, title:"ESOP Valuation Round 2",          type:"Valuation", status:"In Review",  color:"#F59E0B" },
];


// ─── PACK-SPECIFIC CONFIG ────────────────────────────────────────────────────
// Drives Overview hero KPIs, Dashboard benchmarks, and default Garima notes
const PACK_CONFIG = {
  startup: {
    overviewKpis: [
      { label:"Monthly Revenue", value:"₹71L",  prev:"₹63L",  pct:"+12.7%", up:true,  color:C.blue,   bg:"#EEF3FE", icon:"📈" },
      { label:"ARR",             value:"₹850L", prev:"₹649L", pct:"+31%",   up:true,  color:C.purple, bg:"#F3EFFF", icon:"🎯" },
      { label:"Cash Balance",    value:"₹610L", prev:"₹583L", pct:"+₹27L",  up:true,  color:C.teal,   bg:"#E6FAF7", icon:"🏦" },
    ],
    benchmarkTitle: "Market Benchmarks — SaaS / Fintech Sector",
    benchmarkCols: ["Metric","Your Value","Sector Median","Series A Benchmark","Status"],
    benchmarks: [
      { metric:"ARR Growth YoY",  yours:"42%",   median:"28%",   bench:"40%+",   ok:true  },
      { metric:"Gross Margin",     yours:"41%",   median:"38%",   bench:"45%+",   ok:false },
      { metric:"Burn Multiple",    yours:"1.8x",  median:"2.1x",  bench:"<1.5x",  ok:false },
      { metric:"NRR",              yours:"108%",  median:"104%",  bench:">110%",  ok:true  },
      { metric:"CAC Payback",      yours:"18 mo", median:"22 mo", bench:"<12 mo", ok:false },
      { metric:"Revenue per FTE",  yours:"₹48L",  median:"₹42L",  bench:"₹60L+",  ok:true  },
    ],
    garimaNote: "Revenue is up 6.1% MoM — strong. The concern is March cash: advance tax + debt repayment + delayed Client B collection creates a tight window. Two decisions need board attention before 10 March.",
    plRows: [
      { label:"Revenue",      value:"₹842L", pct:"6.1%",  trend:"up",   sub:"MoM growth" },
      { label:"Gross Profit", value:"₹345L", pct:"41.0%", trend:"up",   sub:"GP margin" },
      { label:"EBITDA",       value:"₹147L", pct:"17.5%", trend:"up",   sub:"Best in 12 months" },
      { label:"Net Profit",   value:"₹102L", pct:"12.1%", trend:"up",   sub:"Net margin" },
      { label:"Burn Rate",    value:"₹48L/mo",pct:"7.7%", trend:"up",   sub:"Improved from ₹52L" },
      { label:"Runway",       value:"4.4 mo", pct:"12%",  trend:"down", sub:"Based on current burn" },
    ],
  },
  msme: {
    overviewKpis: [
      { label:"Monthly Revenue",    value:"₹84L",  prev:"₹79L",  pct:"+6.1%",  up:true,  color:C.blue,   bg:"#EEF3FE", icon:"📈" },
      { label:"Working Capital",    value:"₹32.4L",prev:"₹30.1L",pct:"+₹2.3L", up:true,  color:C.teal,   bg:"#E6FAF7", icon:"🏦" },
      { label:"Debtor Days",        value:"46 days",prev:"51 days",pct:"−5 days",up:true,  color:C.green,  bg:"#ECFDF5", icon:"📅" },
    ],
    benchmarkTitle: "Working Capital Benchmarks — MSME / Export Sector",
    benchmarkCols: ["Metric","Your Value","Sector Median","Target","Status"],
    benchmarks: [
      { metric:"Debtor Days",         yours:"46 days", median:"52 days", bench:"<30 days", ok:false },
      { metric:"Creditor Days",        yours:"31 days", median:"28 days", bench:">45 days", ok:false },
      { metric:"Inventory Turnover",   yours:"6.2x",    median:"5.8x",    bench:">7x",      ok:false },
      { metric:"Current Ratio",        yours:"1.6x",    median:"1.4x",    bench:">2x",      ok:false },
      { metric:"Gross Margin",         yours:"41%",     median:"36%",     bench:">40%",     ok:true  },
      { metric:"Cash Conversion Cycle",yours:"37 days", median:"45 days", bench:"<30 days", ok:false },
    ],
    garimaNote: "Working capital is stable but debtor days at 46 is elevated — Client B's ₹4.8L overdue balance is the biggest risk this month. GST-3B for Feb is due 20 March. Recommend following up on collections before advance tax hits on 15 March.",
    plRows: [
      { label:"Revenue",            value:"₹84.2L",  pct:"6.1%",  trend:"up",   sub:"vs ₹79.4L last month" },
      { label:"Cost of Goods Sold", value:"₹49.7L",  pct:"4.2%",  trend:"down", sub:"58.9% of revenue" },
      { label:"Gross Profit",       value:"₹34.5L",  pct:"41.0%", trend:"up",   sub:"GP margin improved +1.4pp" },
      { label:"Operating Expenses", value:"₹19.8L",  pct:"3.1%",  trend:"down", sub:"23.5% of revenue" },
      { label:"EBITDA",             value:"₹14.7L",  pct:"17.5%", trend:"up",   sub:"EBITDA margin 17.5%" },
      { label:"Debtor Days",        value:"46 days",  pct:"10%",   trend:"up",   sub:"Target: <30 days" },
    ],
  },
  corporate: {
    overviewKpis: [
      { label:"Revenue (Feb)",   value:"₹842L", prev:"₹810L", pct:"+4.0%",   up:true,  color:C.blue,   bg:"#EEF3FE", icon:"📈" },
      { label:"EBITDA",          value:"₹147L", prev:"₹115L", pct:"+27.8%",  up:true,  color:C.purple, bg:"#F3EFFF", icon:"💹" },
      { label:"PAT",             value:"₹81L",  prev:"₹56L",  pct:"+44.6%",  up:true,  color:C.green,  bg:"#ECFDF5", icon:"🏦" },
    ],
    benchmarkTitle: "Market Benchmarks — Mid-Cap / Pre-IPO Sector",
    benchmarkCols: ["Metric","Your Value","Sector Median","IPO Threshold","Status"],
    benchmarks: [
      { metric:"Revenue Growth YoY", yours:"16.9%",  median:"12%",    bench:">15%",    ok:true  },
      { metric:"EBITDA Margin",       yours:"17.5%",  median:"14%",    bench:">18%",    ok:false },
      { metric:"PAT Margin",          yours:"9.6%",   median:"7.2%",   bench:">10%",    ok:false },
      { metric:"Debt/Equity",         yours:"0.8x",   median:"1.1x",   bench:"<0.5x",   ok:false },
      { metric:"ROCE",                yours:"22.4%",  median:"18%",    bench:">25%",    ok:false },
      { metric:"Revenue Scale",       yours:"₹85 Cr", median:"₹65 Cr", bench:"₹100 Cr+",ok:false },
    ],
    garimaNote: "Strong February — EBITDA up 27.8% vs budget and PAT nearly doubled vs prior year. The Ind AS 116 lease restatement is on track for Q1 completion. Board pack for March AGM is being prepared — please confirm director availability for 18 March.",
    plRows: [
      { label:"Revenue",         value:"₹842L",  pct:"4.0%",   trend:"up", sub:"vs budget ₹810L" },
      { label:"Gross Profit",    value:"₹345L",  pct:"41.0%",  trend:"up", sub:"GP margin 41.0%" },
      { label:"EBITDA",          value:"₹147L",  pct:"17.5%",  trend:"up", sub:"vs budget ₹115L" },
      { label:"Finance Costs",   value:"₹22L",   pct:"2.6%",   trend:"up", sub:"of revenue" },
      { label:"PAT",             value:"₹81L",   pct:"9.6%",   trend:"up", sub:"PAT margin" },
      { label:"ROCE",            value:"22.4%",  pct:"4.1pp",  trend:"up", sub:"vs 18.3% last year" },
    ],
  },
};

function Overview({ client, setPage, kpis, garimaNote, actions=[], engagement=null, reportData=null }) {
  // Fall back to dummy data if no live data passed
  const displayKpis = kpis || KPIs;
  const ovPack = client?.client_pack || client?.clientPack || "startup";
  const pendingActions = actions.filter(a => !a.done);
  const highPriority   = pendingActions.filter(a => a.priority === "High");
  const displayNote = garimaNote || (PACK_CONFIG[ovPack]?.garimaNote) || PACK_CONFIG.startup.garimaNote;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Resolve engagement badge
  const engType = client?.type || "both";
  const engagementBadge = engType === "cfo" ? "Active CFO Engagement"
    : engType === "valuation" ? "Active Valuation Engagement"
    : "Active · CFO + Valuation";

  return (
    <div style={{ padding:24 }}>
      {/* Hero Banner — pack-aware */}
      <div style={{ marginBottom:20, padding:"22px 28px", borderRadius:18,
        background: ovPack==="msme"      ? "linear-gradient(135deg,#065f46 0%,#059669 60%,#0891B2 100%)"
                  : ovPack==="corporate" ? "linear-gradient(135deg,#4C1D95 0%,#7C3AED 60%,#DB2777 100%)"
                  : "linear-gradient(135deg,#1a3a8f 0%,#3B6FF7 60%,#7C5CF5 100%)",
        color:"white", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-30, top:-30, width:180, height:180,
          borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
        <div style={{ position:"absolute", right:60, bottom:-40, width:120, height:120,
          borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontFamily:F, fontSize:11, fontWeight:700, opacity:0.7,
            letterSpacing:"0.1em", marginBottom:6 }}>
            {greeting.toUpperCase()}
          </div>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:26, marginBottom:6 }}>
            {client?.name || "Client"}
          </div>
          <div style={{ fontFamily:F, fontSize:13, opacity:0.8, marginBottom:12 }}>
            {client?.company || "Company"}
            {reportData?.monthLabel ? ` · ${reportData.monthLabel}` : ""}
          </div>
          <span style={{ display:"inline-block", background:"rgba(255,255,255,0.18)",
            borderRadius:100, padding:"4px 14px", fontSize:12, fontWeight:700,
            fontFamily:F, backdropFilter:"blur(4px)", border:"1px solid rgba(255,255,255,0.25)" }}>
            ● {engagementBadge}
          </span>
        </div>
      </div>

      {/* KPI Row — pack-specific */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }} className="ov-kpi">
        {(kpis && kpis.length > 0 ? kpis.slice(0,3).map(k => ({
            label: k.label, value: k.value, prev: k.prev,
            pct: k.prev && k.prev !== "—" ? "" : "",
            up: k.trend === "up", color: k.color, bg: k.bg, icon: k.icon
          }))
          : (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.overviewKpis || PACK_CONFIG.startup.overviewKpis)
        ).map((k,i) => (
          <Card key={i} style={{ padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:k.bg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{k.icon}</div>
              <span style={{ fontSize:11, fontWeight:700,
                color:k.up ? C.green : C.red,
                background:k.up ? "#ECFDF5" : "#FEF2F2",
                padding:"3px 8px", borderRadius:100, fontFamily:F }}>
                {k.up ? "▲" : "▼"} {k.pct}
              </span>
            </div>
            <div style={{ fontFamily:"monospace", fontWeight:700, fontSize:22, color:k.color, marginBottom:2 }}>
              {k.value}
            </div>
            <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, marginBottom:2 }}>{k.label}</div>
            <div style={{ fontFamily:F, fontSize:11, color:k.up?C.green:C.red, lineHeight:1.4, marginBottom:2 }}>
              {kpiContext(k)}
            </div>
            {kpiBenchmark(k.label, ovPack, null) && (
              <div style={{ fontFamily:F, fontSize:10, color:C.blue, background:`${C.blue}08`,
                padding:"2px 8px", borderRadius:6, display:"inline-block", marginTop:2 }}>
                {kpiBenchmark(k.label, ovPack, null)}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── 3-MONTH FORWARD VIEW ── */}
      {(reportData?.forecast1Label || reportData?.forecastNote) && (
        <Card style={{ marginBottom:24, borderLeft:`3px solid ${C.purple}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${C.purple}15`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{"🔭"}</div>
            <div>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>{"3-Month Forward View"}</div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>{"Garima's outlook — updated each month"}</div>
            </div>
          </div>
          {reportData?.forecastNote && (
            <div style={{ padding:"12px 14px", borderRadius:10, background:`${C.purple}08`,
              border:`1px solid ${C.purple}15`, marginBottom:14 }}>
              <p style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.8, margin:0 }}>
                {reportData.forecastNote}
              </p>
            </div>
          )}
          {(reportData?.forecast1Label) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }} className="inv-grid">
              {[
                { label: reportData?.forecast1Label || "Month 1", value: reportData?.forecast1Value, trend: reportData?.forecast1Trend },
                { label: reportData?.forecast2Label || "Month 2", value: reportData?.forecast2Value, trend: reportData?.forecast2Trend },
                { label: reportData?.forecast3Label || "Month 3", value: reportData?.forecast3Value, trend: reportData?.forecast3Trend },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:C.bg2,
                  border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{f.label}</div>
                  <div style={{ fontFamily:FM, fontSize:20, fontWeight:800,
                    color: f.trend==="up" ? C.green : f.trend==="down" ? C.red : C.purple }}>{f.value}</div>
                  {f.trend && (
                    <div style={{ fontFamily:F, fontSize:10, color: f.trend==="up"?C.green:f.trend==="down"?C.red:C.muted, marginTop:3 }}>
                      {f.trend==="up" ? "▲ Improving" : f.trend==="down" ? "▼ Watch" : "→ Stable"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Charts Row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }} className="ov-charts">
        {/* Revenue vs Expenses */}
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:16 }}>
            {ovPack==="msme" ? "Revenue vs COGS" : ovPack==="corporate" ? "Revenue vs Operating Costs" : "Revenue vs Expenses"}
            <span style={{ fontWeight:400, color:C.muted, fontSize:11, marginLeft:6 }}>last 6 months (₹L)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={OVERVIEW_REVEXP} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize:11, fontFamily:F, fill:C.muted }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fontFamily:F, fill:C.muted }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ fontFamily:F, fontSize:12, borderRadius:8, border:`1px solid ${C.border}` }}/>
              <Legend iconType="circle" wrapperStyle={{ fontSize:11, fontFamily:F }}/>
              <Line type="monotone" dataKey="revenue"  stroke={C.blue}   strokeWidth={2.5} dot={false} name="Revenue"/>
              <Line type="monotone" dataKey="expenses" stroke={C.pink}   strokeWidth={2.5} dot={false} name="Expenses"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Cash Flow */}
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:16 }}>
            Monthly Net Cash Flow
            <span style={{ fontWeight:400, color:C.muted, fontSize:11, marginLeft:6 }}>₹ Lakhs</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={OVERVIEW_CF} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fontFamily:F, fill:C.muted }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fontFamily:F, fill:C.muted }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ fontFamily:F, fontSize:12, borderRadius:8, border:`1px solid ${C.border}` }}/>
              <Bar dataKey="net" name="Net Flow" fill={C.teal} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Engagements + Quick Actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }} className="ov-bottom">
        {/* My Engagements */}
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:14 }}>My Engagements</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {OVERVIEW_ENGAGEMENTS.map(e => (
              <div key={e.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontFamily:F, fontWeight:600, fontSize:13, color:C.text, marginBottom:2 }}>{e.title}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>{e.type}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:e.color,
                  background:e.color+"18", padding:"3px 10px", borderRadius:100, fontFamily:F, whiteSpace:"nowrap" }}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions + WhatsApp */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:14 }}>Quick Actions</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { icon:"📋", label:"Request Valuation", action:"newrequest", grad:C.grad1, white:true },
                { icon:"📁", label:"View Reports",      action:"myreport",   grad:null },
                { icon:"📊", label:"CFO Dashboard",     action:"dashboard",  grad:null },
                { icon:"📁", label:"My Documents",      action:"documents",  grad:null },
              ].map((q,i) => (
                <button key={i} onClick={() => q.action && setPage(q.action)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                    padding:"12px 8px", borderRadius:10,
                    background: q.grad ? C.grad1 : C.bg,
                    border: `1px solid ${q.grad ? "transparent" : C.border}`,
                    cursor:"pointer", transition:"all 0.15s" }}>
                  <span style={{ fontSize:20 }}>{q.icon}</span>
                  <span style={{ fontFamily:F, fontSize:11, fontWeight:600,
                    color: q.grad ? "white" : C.text, textAlign:"center" }}>{q.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* WhatsApp help */}
          <Card style={{ background:"linear-gradient(135deg,#E7FAF0 0%,#D1F5E4 100%)",
            border:"1px solid #A7F0C4", padding:"16px 18px" }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"#065F46", marginBottom:6 }}>
              💬 Need help?
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:"#047857", marginBottom:12, lineHeight:1.6 }}>
              Chat directly with Garima on WhatsApp for quick questions about your financials or valuations.
            </div>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:8,
                background:"#25D366", color:"white", borderRadius:10,
                padding:"9px 18px", fontFamily:F, fontWeight:700, fontSize:13,
                textDecoration:"none", boxShadow:"0 2px 8px rgba(37,211,102,0.35)" }}>
              <span style={{ fontSize:17 }}>📱</span> WhatsApp Garima
            </a>
          </Card>
        </div>
      </div>

      <style>{`
        @media(max-width:700px) {
          .ov-kpi { grid-template-columns: 1fr 1fr !important; }
          .ov-charts { grid-template-columns: 1fr !important; }
          .ov-bottom { grid-template-columns: 1fr !important; }
        }
        @media(max-width:420px) {
          .ov-kpi { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}


// ─── DASHBOARD ───────────────────────────────────────────────────────────────

// ─── LIVE MARKET DATA WIDGET ─────────────────────────────────────────────────
function useLiveMarketData(pack) {
  const [rbi, setRbi]         = React.useState(null);
  const [benchmarks, setBench]= React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLast]= React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // ── RBI Rates via CORS proxy ─────────────────────────────────────────
        // RBI doesn't have a clean JSON API — we use a reliable finance API instead
        // frankfurter.app for exchange rates (free, no key needed)
        const fxRes = await fetch("https://api.frankfurter.app/latest?from=INR&to=USD,SAR,AED,EUR,GBP");
        const fxData = fxRes.ok ? await fxRes.json() : null;

        // For RBI repo rate we use a static value updated monthly
        // (RBI API requires registration — we'll use known current rate)
        // This gets updated in the code when RBI changes rates
        const rbiRates = {
          repo:        6.50,   // RBI Repo Rate % — update when RBI changes
          reverse:     6.25,   // Reverse Repo %
          cpi:         5.10,   // CPI Inflation % (latest)
          gdpGrowth:   6.40,   // GDP Growth % FY25 estimate
          sbiMCLR:     9.15,   // SBI 1-year MCLR %
          sbiStartup:  8.50,   // SBI Startup Branch rate (Repo + ~2%)
        };

        if (!cancelled) {
          setRbi({
            rates: rbiRates,
            fx: fxData?.rates || null,
          });
          setLast(new Date());
        }

        // ── Sector Benchmarks via Screener/NSE proxy ─────────────────────────
        // Using curated sector median data (updated quarterly from public filings)
        // These reflect NSE-listed company medians as of Q3 FY26
        const sectorData = {
          startup: {
            title: "Indian Startup Benchmarks (Series A–B)",
            source: "YC, Sequoia India, public filings",
            metrics: [
              { label:"Revenue Growth (YoY)", yours: null, median:"80–120%", top:"200%+",  key:"revenue" },
              { label:"Gross Margin",          yours: null, median:"40–55%",  top:"65%+",   key:"gross_margin" },
              { label:"Burn Multiple",         yours: null, median:"1.5–2x",  top:"<1x",    key:"burn" },
              { label:"CAC Payback",           yours: null, median:"12–18 mo",top:"<9 mo",  key:"cac" },
              { label:"NRR",                   yours: null, median:"100–110%",top:"120%+",  key:"nrr" },
            ],
          },
          msme: {
            title: "MSME Sector Benchmarks (NSE SME listed)",
            source: "NSE SME filings, SIDBI MSME Pulse",
            metrics: [
              { label:"Revenue Growth (YoY)", yours: null, median:"12–18%",  top:"25%+",   key:"revenue" },
              { label:"EBITDA Margin",         yours: null, median:"10–14%",  top:"18%+",   key:"ebitda" },
              { label:"Current Ratio",         yours: null, median:"1.4–1.8x",top:">2.0x",  key:"current" },
              { label:"Debtor Days",           yours: null, median:"35–45 d", top:"<25 d",  key:"debtors" },
              { label:"Debt/Equity",           yours: null, median:"0.6–1.0x",top:"<0.5x",  key:"de" },
            ],
          },
          corporate: {
            title: "Mid-Cap Corporate Benchmarks (NSE 200)",
            source: "NSE listed mid-cap median, Q3 FY26",
            metrics: [
              { label:"Revenue Growth (YoY)", yours: null, median:"8–14%",   top:"20%+",   key:"revenue" },
              { label:"EBITDA Margin",         yours: null, median:"14–18%",  top:"22%+",   key:"ebitda" },
              { label:"PAT Margin",            yours: null, median:"7–10%",   top:"14%+",   key:"pat" },
              { label:"Interest Coverage",     yours: null, median:"3.5–5x",  top:">8x",    key:"icr" },
              { label:"ROCE",                  yours: null, median:"14–18%",  top:"22%+",   key:"roce" },
            ],
          },
        };

        if (!cancelled) {
          setBench(sectorData[pack] || sectorData.startup);
          setLoading(false);
        }

      } catch(e) {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [pack]);

  return { rbi, benchmarks, loading, lastUpdated };
}

function LiveMarketWidget({ pack, kpis, reportData }) {
  const { rbi, benchmarks, loading, lastUpdated } = useLiveMarketData(pack);

  // Map client KPI values onto benchmark rows
  const enrichedBench = benchmarks ? {
    ...benchmarks,
    metrics: benchmarks.metrics.map(m => {
      let yours = null;
      if (m.key === "revenue")  yours = kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value;
      if (m.key === "gross_margin") yours = kpis?.find(k=>k.label?.toLowerCase().includes("margin"))?.value;
      if (m.key === "burn")     yours = kpis?.find(k=>k.label?.toLowerCase().includes("burn"))?.value;
      if (m.key === "ebitda")   yours = reportData?.plInputs?.ebitdaMargin;
      if (m.key === "pat")      yours = reportData?.plInputs?.netMargin;
      if (m.key === "current")  yours = reportData?.currentRatio;
      if (m.key === "debtors")  yours = reportData?.debtorDays;
      return {...m, yours};
    })
  } : null;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:20 }} className="mkt-grid">
      <style>{`.mkt-grid{grid-template-columns:1fr 1fr!important}@media(max-width:640px){.mkt-grid{grid-template-columns:1fr!important}}`}</style>

      {/* RBI Rates Card */}
      <Card style={{ borderTop:`3px solid ${C.blue}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{"🏛️ RBI & Lending Rates"}</div>
          {lastUpdated && (
            <div style={{ fontFamily:F, fontSize:9, color:C.dim }}>
              {"Live · "}{lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ fontFamily:F, fontSize:12, color:C.dim }}>{"Loading..."}</div>
        ) : rbi ? (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {[
                { label:"Repo Rate",        value:`${rbi.rates.repo}%`,     color:C.blue,   note:"RBI policy rate" },
                { label:"SBI MCLR (1yr)",   value:`${rbi.rates.sbiMCLR}%`,  color:C.purple, note:"Bank lending benchmark" },
                { label:"SBI Startup Loan", value:`${rbi.rates.sbiStartup}%`,color:C.teal,   note:"Repo + ~2% for startups" },
                { label:"CPI Inflation",    value:`${rbi.rates.cpi}%`,      color:C.amber,  note:"Latest headline CPI" },
              ].map((r, i) => (
                <div key={i} style={{ padding:"10px 12px", borderRadius:10,
                  background:`${r.color}08`, border:`1px solid ${r.color}15` }}>
                  <div style={{ fontFamily:FM, fontSize:18, fontWeight:800, color:r.color }}>{r.value}</div>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginTop:2 }}>{r.label}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:1 }}>{r.note}</div>
                </div>
              ))}
            </div>

            {/* Exchange Rates — only show if cross-border relevant */}
            {rbi.fx && (
              <div>
                <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                  {"Exchange Rates (per 1 INR)"}
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[
                    { pair:"INR/USD", val: rbi.fx.USD ? (1/rbi.fx.USD).toFixed(4) : "—", flag:"🇺🇸" },
                    { pair:"INR/SAR", val: rbi.fx.SAR ? (1/rbi.fx.SAR).toFixed(4) : "—", flag:"🇸🇦" },
                    { pair:"INR/AED", val: rbi.fx.AED ? (1/rbi.fx.AED).toFixed(4) : "—", flag:"🇦🇪" },
                  ].map((fx, i) => (
                    <div key={i} style={{ padding:"6px 10px", borderRadius:8,
                      background:C.bg2, border:`1px solid ${C.border}`,
                      fontFamily:F, fontSize:11 }}>
                      <span style={{ marginRight:4 }}>{fx.flag}</span>
                      <strong style={{ color:C.text }}>{fx.pair}</strong>
                      <span style={{ color:C.muted, marginLeft:4 }}>{fx.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontFamily:F, fontSize:12, color:C.dim }}>{"Rate data unavailable"}</div>
        )}
      </Card>

      {/* Sector Benchmarks Card */}
      <Card style={{ borderTop:`3px solid ${C.purple}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{"📊 Sector Benchmarks"}</div>
          <div style={{ fontFamily:F, fontSize:9, color:C.dim }}>{"NSE listed peers"}</div>
        </div>
        <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginBottom:12 }}>
          {enrichedBench?.source}
        </div>

        {loading ? (
          <div style={{ fontFamily:F, fontSize:12, color:C.dim }}>{"Loading..."}</div>
        ) : enrichedBench ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 70px 70px 70px", gap:4,
              padding:"4px 8px", marginBottom:2 }}>
              <div style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.dim, textTransform:"uppercase" }}>{"Metric"}</div>
              <div style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.blue, textTransform:"uppercase", textAlign:"center" }}>{"You"}</div>
              <div style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", textAlign:"center" }}>{"Median"}</div>
              <div style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.green, textTransform:"uppercase", textAlign:"center" }}>{"Top"}</div>
            </div>
            {enrichedBench.metrics.map((m, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 70px 70px 70px", gap:4,
                padding:"7px 8px", borderRadius:8,
                background: m.yours ? `${C.blue}06` : C.bg2,
                border:`1px solid ${m.yours ? C.blue+"15" : C.border}` }}>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:m.yours?600:400 }}>{m.label}</div>
                <div style={{ fontFamily:FM, fontSize:11, fontWeight:700,
                  color: m.yours ? C.blue : C.dim, textAlign:"center" }}>
                  {m.yours || "—"}
                </div>
                <div style={{ fontFamily:F, fontSize:10, color:C.muted, textAlign:"center" }}>{m.median}</div>
                <div style={{ fontFamily:F, fontSize:10, color:C.green, textAlign:"center" }}>{m.top}</div>
              </div>
            ))}
            <div style={{ fontFamily:F, fontSize:9, color:C.dim, marginTop:4, lineHeight:1.5 }}>
              {"Your metrics show where you have live KPI data. Set KPIs in admin to populate."}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Dashboard({ client, kpis, garimaNote, reportData }) {
  const displayKpis = kpis || KPIs;
  const pack = client?.client_pack || client?.clientPack || "startup";
  const ovPack = pack;
  const packCfg = PACK_CONFIG[pack] || PACK_CONFIG.startup;
  const displayNote = garimaNote || packCfg.garimaNote;
  const defaultActions = ACTIONS_BY_PACK[pack] || ACTIONS_BY_PACK.startup;
  const pendingActions = defaultActions.filter(a => !a.done);
  const highPriority   = pendingActions.filter(a => a.priority === "High");
  const engagement     = null;
  return (
    <div style={{ padding:24 }}>
      {/* Welcome — pack-aware colour */}
      <div style={{ marginBottom:24, padding:"20px 24px", borderRadius:16,
        background: pack==="msme" ? C.grad2 : pack==="corporate" ? C.grad3 : C.grad1,
        color:"white", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:140, height:140,
          borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontFamily:F, fontSize:11, fontWeight:700, opacity:0.75, letterSpacing:"0.08em", marginBottom:4 }}>
            WELCOME BACK
          </div>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:22, marginBottom:4 }}>{client.name}</div>
          <div style={{ fontFamily:F, fontSize:13, opacity:0.75 }}>
            {client.company} · {pack==="msme"?"MSME Pack":pack==="corporate"?"Board Pack":"CFO Pack"}
            {reportData?.monthLabel ? ` · ${reportData.monthLabel}` : displayKpis?.[0]?.value && displayKpis[0].value !== "—" ? ` · ${new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}` : ""}
          </div>
        </div>
      </div>

      {/* ── THIS MONTH'S STORY ── auto-generated from KPI directions */}
      {displayKpis.length > 0 && (() => {
        const rev   = displayKpis.find(k=>k.label?.toLowerCase().includes("rev"));
        const cash  = displayKpis.find(k=>k.label?.toLowerCase().includes("cash"));
        const burn  = displayKpis.find(k=>k.label?.toLowerCase().includes("burn"));
        const run   = displayKpis.find(k=>k.label?.toLowerCase().includes("runway"));
        const mar   = displayKpis.find(k=>k.label?.toLowerCase().includes("margin"));
        const lines = [];
        if (rev)  lines.push(rev.trend==="up"  ? `Revenue grew to ${rev.value} — growth trajectory intact.` : `Revenue dipped to ${rev.value} — monitor pipeline closely.`);
        if (mar)  lines.push(mar.trend==="up"  ? `Gross margin improved to ${mar.value} — unit economics strengthening.` : `Margin compressed to ${mar.value} — review cost structure.`);
        if (cash) lines.push(cash.trend==="down"? `Cash dropped to ${cash.value} — collections need attention.` : `Cash position healthy at ${cash.value}.`);
        if (burn) lines.push(burn.trend==="up"  ? `Burn improved to ${burn.value} — efficiency gaining.` : `Burn increased to ${burn.value} — review discretionary spend.`);
        if (run)  lines.push(parseFloat(run.value)<6 ? `⚠️ Runway at ${run.value} — fundraise or cut costs urgently.` : parseFloat(run.value)<9 ? `Runway at ${run.value} — begin fundraise conversations now.` : `Runway comfortable at ${run.value}.`);
        if (lines.length === 0) return null;
        return (
          <Card style={{ marginBottom:20, background:`${C.navy}`, borderColor:"transparent" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>{"📖"}</span>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13,
                color:"rgba(255,255,255,0.9)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {`This Month's Story${reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}`}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {lines.map((line, i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ color: line.includes("⚠️") ? C.amber : line.startsWith("Revenue grew") || line.includes("healthy") || line.includes("intact") || line.includes("improved") || line.includes("comfortable") || line.includes("gaining") || line.includes("strengthening") ? C.green : "rgba(255,255,255,0.5)", flexShrink:0, marginTop:2 }}>{"•"}</span>
                  <span style={{ fontFamily:F, fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.6 }}>{line}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Garima's note — pack-aware */}
      <Card style={{ marginBottom:24, borderLeft:`3px solid ${ovPack==="msme"?C.teal:ovPack==="corporate"?C.purple:C.blue}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
          📝 Note from Garima
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.75, fontFamily:F, margin:0, whiteSpace:"pre-wrap" }}>
          {displayNote}
        </p>
      </Card>

      {/* KPI Grid header with month context */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
            KPI Snapshot
          </div>
          {reportData?.monthLabel && (
            <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.blue,
              background:`${C.blue}12`, padding:"3px 12px", borderRadius:100 }}>
              {reportData.monthLabel}
            </span>
          )}
        </div>
        {reportData?.monthLabel && (
          <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>
            📅 Last updated by Garima · {reportData.monthLabel}
          </div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }} className="kpi-grid">
        {displayKpis.map((k,i) => (
          <Card key={i} style={{ padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:k.bg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                {k.icon}
              </div>
              {k.prev && k.prev !== "—" && (
                <span style={{ fontSize:11, fontWeight:700, color:k.trend==="up"?C.green:C.red,
                  background:k.trend==="up"?"#ECFDF5":"#FEF2F2", padding:"3px 8px",
                  borderRadius:100, fontFamily:F }}>
                  {k.trend==="up" ? "▲" : "▼"} vs last month
                </span>
              )}
            </div>
            <div style={{ fontFamily:FM, fontWeight:600, fontSize:22, color:k.color, marginBottom:2 }}>
              {k.value}
            </div>
            <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, marginBottom:2 }}>
              {k.label}
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:k.trend==="up"?C.green:k.trend==="down"?C.red:C.muted, lineHeight:1.4, marginBottom:2 }}>
              {kpiContext(k)}
            </div>
            {kpiBenchmark(k.label, pack, reportData) && (
              <div style={{ fontFamily:F, fontSize:10, color:C.blue, background:`${C.blue}08`,
                padding:"2px 8px", borderRadius:6, display:"inline-block", marginTop:2 }}>
                {kpiBenchmark(k.label, pack, reportData)}
              </div>
            )}
          </Card>
        ))}
      </div>
      {displayKpis.every(k => !k.value || k.value === "—") && (
        <div style={{ textAlign:"center", padding:"12px 0 4px", fontFamily:F, fontSize:12, color:C.dim }}>
          📊 KPI data not yet updated — Garima will update this after your next session.
        </div>
      )}

      {/* Quick links row — pack-aware */}
      {(() => {
        const qpack = client?.client_pack || client?.clientPack || "startup";
        const quickItems = qpack === "msme" ? [
          { icon:"📊", label:"MSME Report", color:C.teal, action:"myreport",
            sub: reportData?.monthLabel ? `${reportData.monthLabel} report ready` : "Awaiting data from Garima" },
          { icon:"✅", label:"Action Items", color:C.red, action:"actions",
            sub: `${pendingActions.length} pending · ${highPriority.length} high priority` },
          { icon:"💎", label:"Treasury", color:C.blue, action:"treasury",
            sub:"Cash visibility & FD tracking" },
        ] : qpack === "corporate" ? [
          { icon:"🏦", label:"Board Report", color:C.purple, action:"myreport",
            sub: reportData?.monthLabel ? `${reportData.monthLabel} report ready` : "Awaiting data from Garima" },
          { icon:"✅", label:"Action Items", color:C.red, action:"actions",
            sub: `${pendingActions.length} pending · ${highPriority.length} high priority` },
          { icon:"📋", label:"Valuation Status", color:C.teal, action:"engagement",
            sub: engagement?.garima_note?.slice(0,40)+"…" || "Active engagement" },
        ] : [
          { icon:"📁", label:"Latest CFO Report", color:C.purple, action:"myreport",
            sub: reportData?.monthLabel ? `${reportData.monthLabel} report ready` : "Awaiting data from Garima" },
          { icon:"✅", label:"Action Items", color:C.red, action:"actions",
            sub: `${pendingActions.length} pending · ${highPriority.length} high priority` },
          { icon:"📋", label:"Valuation Status", color:C.teal, action:"engagement",
            sub: engagement?.garima_note?.slice(0,40)+"…" || "Active engagement" },
        ];
        return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }} className="quick-grid">
        {quickItems.map((q,i) => (
          <Card key={i} style={{ padding:16, cursor:"pointer", transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(15,26,56,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ fontSize:22, marginBottom:8 }}>{q.icon}</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{q.label}</div>
            <div style={{ fontFamily:F, fontSize:11, color:q.color, fontWeight:600 }}>{q.sub}</div>
          </Card>
        ))}
      </div>
        );
      })()}

      <style>{`
        @media(max-width:640px){
          .kpi-grid{grid-template-columns:1fr 1fr!important}
          .quick-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:400px){.kpi-grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* Market Benchmarks / Competitor Context — pack-aware */}
    </div>
  );
}


// ─── PACK-SPECIFIC CASHFLOW DEMO DATA ────────────────────────────────────────
const CASHFLOW_MSME = [
  { month:"Sep", inflow:76, outflow:61, net:15 },
  { month:"Oct", inflow:79, outflow:64, net:15 },
  { month:"Nov", inflow:82, outflow:65, net:17 },
  { month:"Dec", inflow:88, outflow:68, net:20 },
  { month:"Jan", inflow:81, outflow:64, net:17 },
  { month:"Feb", inflow:84, outflow:67, net:17 },
  { month:"Mar", inflow:null, outflow:null, net:null, fInflow:78, fOutflow:69, fNet:9  },
  { month:"Apr", inflow:null, outflow:null, net:null, fInflow:86, fOutflow:66, fNet:20 },
  { month:"May", inflow:null, outflow:null, net:null, fInflow:90, fOutflow:67, fNet:23 },
];
const CASHFLOW_CORPORATE = [
  { month:"Sep", operating:32, investing:-8,  financing:-5,  net:19 },
  { month:"Oct", operating:34, investing:-6,  financing:-5,  net:23 },
  { month:"Nov", operating:38, investing:-12, financing:-5,  net:21 },
  { month:"Dec", operating:42, investing:-8,  financing:-10, net:24 },
  { month:"Jan", operating:36, investing:-5,  financing:-5,  net:26 },
  { month:"Feb", operating:45, investing:-7,  financing:-5,  net:33 },
  { month:"Mar", operating:null, investing:null, financing:null, net:null, fOp:38, fInv:-15, fFin:-5, fNet:18 },
  { month:"Apr", operating:null, investing:null, financing:null, net:null, fOp:44, fInv:-6,  fFin:-5, fNet:33 },
  { month:"May", operating:null, investing:null, financing:null, net:null, fOp:47, fInv:-5,  fFin:-5, fNet:37 },
];

// ─── CASH FLOW ────────────────────────────────────────────────────────────────
function CashFlow({ reportData, client, kpis }) {
  const pack = client?.client_pack || client?.clientPack || "startup";

  // ── Shared tooltip ──────────────────────────────────────────────────────────
  const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10,
        padding:"10px 14px", fontFamily:F, boxShadow:"0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:700 }}>{label}</div>
        {payload.map((p,i) => (
          <div key={i} style={{ fontSize:13, fontWeight:700, color:p.color || p.stroke, marginBottom:2 }}>
            {p.name}: ₹{p.value}L
          </div>
        ))}
      </div>
    );
  };

  // ── Shared summary KPI bar ──────────────────────────────────────────────────
  const KpiBar = ({ items }) => (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${items.length},1fr)`, gap:12, marginBottom:20 }} className="cf-kpi">
      {items.map((k,i) => (
        <div key={i} style={{ padding:"14px 16px", borderRadius:12, background:k.bg||C.bg,
          border:`1px solid ${k.border||C.border}`, textAlign:"center" }}>
          <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{k.label}</div>
          <div style={{ fontFamily:FM, fontSize:20, fontWeight:700, color:k.color }}>{k.value}</div>
          {k.sub && <div style={{ fontFamily:F, fontSize:10, color:k.trend==="up"?C.green:k.trend==="down"?C.red:C.dim, marginTop:3 }}>{k.sub}</div>}
        </div>
      ))}
      <style>{`.cf-kpi{grid-template-columns:repeat(${items.length},1fr)!important}@media(max-width:500px){.cf-kpi{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );

  // ── Garima note ─────────────────────────────────────────────────────────────
  const garimaDefaults = {
    startup: "March forecast shows a dip to ₹175L — lowest in 6 months. Driven by advance tax (₹32L due 15 Mar), delayed Client B collection (₹45L pushed to April), and quarterly vendor payments coinciding. April–May outlook is positive. Hold off on discretionary capex until April.",
    msme: "Collections in March will be tight — Client B's ₹4.8L overdue (90+ days) and advance tax of ₹22L due 15 March will squeeze the cash position. Recommend converting 2 large debtors to post-dated cheques before 10 March. The April inflow forecast of ₹86L is achievable if collections are actioned this week.",
    corporate: "Strong operating cash flow of ₹45L in February — best month YTD. March will dip due to the Q4 advance tax (₹38L) and planned capex (₹15L machinery). The EBITDA-to-cash conversion of 82% is above sector average. Free cash flow remains positive for Q1 FY27 overall.",
  };

  // ───────────────────────────────────────────────────────────────────────────
  // STARTUP PACK
  // ───────────────────────────────────────────────────────────────────────────
  if (pack === "startup") {
    const cfData = (() => {
      const cf = reportData?.cashflow;
      if (cf && cf.some(r => r.actual || r.forecast)) {
        return cf.map(r => ({
          month: r.month,
          value: r.actual ? parseFloat(r.actual)||null : null,
          forecast: r.forecast ? parseFloat(r.forecast)||null : null,
        }));
      }
      return CASHFLOW;
    })();
    const lastActual = [...cfData].reverse().find(r => r.value);
    const nextForecast = cfData.find(r => r.forecast && !r.value);
    return (
      <div style={{ padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Burn rate, runway and 9-month cash position">Cash Flow</SectionTitle>
          <button
            onClick={() => {
              const html = generateCashPDF({ client, reportData, kpis });
              const w = window.open("","_blank");
              w.document.write(html);
              w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:12, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`,
              color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {"📄 Download Cash Report"}
          </button>
        </div>

        <KpiBar items={[
          { label:"Current Cash",  value:"₹2.1 Cr", color:C.blue,   bg:"#EEF3FE", sub:"▼ vs ₹2.6 Cr last month", trend:"down" },
          { label:"Monthly Burn",  value:"₹48L/mo", color:C.purple, bg:"#F3EFFF", sub:"▲ Improved from ₹52L", trend:"up" },
          { label:"Runway",        value:"4.4 mo",  color:C.red,    bg:"#FEF2F2", border:`${C.red}30`, sub:"⚠️ Below 6 months", trend:"down" },
          { label:"Mar Forecast",  value: nextForecast ? `₹${nextForecast.forecast}L` : "₹175L", color:C.muted, bg:C.bg, sub:"Next month cash" },
        ]}/>

        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
            Cash Balance — 9 Month View
          </div>
          <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>
            Actual through Feb · Forecast Mar–May (₹ Lakhs)
          </div>
          <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
            {[{c:C.blue,l:"Actual"},{c:C.purple,l:"Forecast",dash:true}].map((x,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:24, height:3, background:x.c, borderRadius:2,
                  backgroundImage:x.dash?`repeating-linear-gradient(90deg,${x.c} 0,${x.c} 4px,transparent 4px,transparent 8px)`:"none" }}/>
                <span style={{ fontSize:12, color:C.muted, fontFamily:F }}>{x.l}</span>
              </div>
            ))}
          </div>
          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cfData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="gaS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue}   stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={C.blue}   stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gfS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.12}/>
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontFamily:F, fontSize:11, fill:C.dim }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontFamily:FM, fontSize:10, fill:C.dim }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} width={50}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine x="Feb" stroke={C.border} strokeDasharray="4 4" label={{ value:"Today", position:"top", fontSize:10, fill:C.dim, fontFamily:F }}/>
                <Area type="monotone" dataKey="value"    name="Actual"   stroke={C.blue}   strokeWidth={2.5} fill="url(#gaS)" dot={{ fill:C.blue, r:3 }}/>
                <Area type="monotone" dataKey="forecast" name="Forecast" stroke={C.purple} strokeWidth={2} fill="url(#gfS)" strokeDasharray="5 5" dot={{ fill:C.purple, r:3 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly cash in/out breakdown */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>
            Monthly Cash Movement — Feb 2026
          </div>
          {[
            { label:"Opening Balance",       value:"₹2.4 Cr",  color:C.text,   bold:true },
            { label:"+ Collections received",value:"+₹81.8L",  color:C.green  },
            { label:"− Payroll & benefits",  value:"−₹28.4L",  color:C.red    },
            { label:"− Vendor payments",     value:"−₹22.1L",  color:C.red    },
            { label:"− Advance tax",         value:"−₹0",      color:C.dim    },
            { label:"− Other opex",          value:"−₹9.3L",   color:C.red    },
            { label:"Closing Balance",        value:"₹2.1 Cr",  color:C.blue,   bold:true },
          ].map((r,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0",
              borderBottom:i<6?`1px solid ${C.border}`:"none",
              background:r.bold?`${C.blue}04`:"transparent", margin:r.bold?"0 -4px":"0", padding:r.bold?"9px 4px":"9px 0" }}>
              <span style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:r.bold?700:400 }}>{r.label}</span>
              <span style={{ fontFamily:FM, fontSize:13, fontWeight:700, color:r.color }}>{r.value}</span>
            </div>
          ))}
        </Card>

        {/* Inflow vs Outflow bar chart */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
            Monthly Cash Inflows vs Outflows
          </div>
          <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>₹ Lakhs · Actual through Feb · Forecast from Mar</div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cfData.map(r => ({
                month: r.month,
                inflow:   r.value    ? Math.round(r.value * 1.35)    : null,
                outflow:  r.value    ? Math.round(r.value * 0.82)    : null,
                fInflow:  r.forecast ? Math.round(r.forecast * 1.35) : null,
                fOutflow: r.forecast ? Math.round(r.forecast * 0.82) : null,
              }))} margin={{ top:5, right:10, left:0, bottom:0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontFamily:F, fontSize:11, fill:C.dim }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontFamily:FM, fontSize:10, fill:C.dim }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} width={50}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine x="Feb" stroke={C.border} strokeDasharray="4 4" label={{ value:"Forecast →", position:"top", fontSize:10, fill:C.dim, fontFamily:F }}/>
                <Bar dataKey="inflow"   name="Inflows"          fill={C.green}  radius={[4,4,0,0]} opacity={0.85}/>
                <Bar dataKey="outflow"  name="Outflows"         fill={C.red}    radius={[4,4,0,0]} opacity={0.75}/>
                <Bar dataKey="fInflow"  name="Forecast Inflows" fill={C.green}  radius={[4,4,0,0]} opacity={0.35}/>
                <Bar dataKey="fOutflow" name="Forecast Outflows"fill={C.red}    radius={[4,4,0,0]} opacity={0.30}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Working Capital Positions */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>
            Working Capital Positions — {reportData?.monthLabel || "Current Month"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf-s">
            {[
              { label:"Debtors (AR)",   value: reportData?.debtors   || "₹38.4L", days: reportData?.debtorDays   || "—", color:C.blue,   flag: !!(reportData?.debtorDays  && parseInt(reportData.debtorDays)>30),  note: reportData?.debtorDays  ? `${reportData.debtorDays} debtor days` : "Target: <30 days" },
              { label:"Creditors (AP)", value: reportData?.creditors  || "₹22.1L", days: reportData?.creditorDays || "—", color:C.purple, flag: false,                                                              note: reportData?.creditorDays ? `${reportData.creditorDays} creditor days` : "Well managed" },
              { label:"Inventory",      value: reportData?.inventory  || "—",       days: reportData?.inventoryDays|| "—", color:C.teal,   flag: false,                                                              note: "Stock on hand" },
            ].map((w,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:12,
                background: w.flag ? `${C.amber}08` : C.bg,
                border:`1px solid ${w.flag ? C.amber+"40" : C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:w.color }}>{w.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{w.label}</div>
                {w.days !== "—" && <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:w.color, marginTop:2 }}>{w.days}</div>}
                <div style={{ fontFamily:F, fontSize:10, color:w.flag?C.amber:C.green, marginTop:3 }}>
                  {w.flag ? "⚠️ " : "✅ "}{w.note}
                </div>
              </div>
            ))}
            <style>{`.wc-cf-s{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-cf-s{grid-template-columns:1fr!important}}`}</style>
          </div>
          {(reportData?.debtorDays || reportData?.creditorDays) && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.blue}06`, border:`1px solid ${C.blue}20` }}>
              <span style={{ fontFamily:F, fontSize:12, color:C.blue, fontWeight:600 }}>
                Cash Conversion Cycle: AR {reportData?.debtorDays || "—"} − AP {reportData?.creditorDays || "—"} + Inv {reportData?.inventoryDays || "—"} = <strong>{reportData?.ccc || "—"}</strong>
                {reportData?.ccc && parseInt(reportData.ccc) > 30 ? " ⚠️ Above 30-day target" : " ✅"}
              </span>
            </div>
          )}
        </Card>

        {/* Burn Rate Analysis */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>
            Burn Rate & Runway Analysis
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf-s">
            {[
              { label:"Gross Burn",    value: kpis?.find(k=>k.label?.toLowerCase().includes("burn"))?.value || "₹48L/mo",  color:C.red,   note:"Total monthly spend" },
              { label:"Net Burn",      value: kpis?.find(k=>k.label?.toLowerCase().includes("net"))?.value  || "₹31L/mo",  color:C.amber, note:"After revenue" },
              { label:"Runway",        value: kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value|| "4.4 mo",  color: (kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value && parseFloat(kpis.find(k=>k.label?.toLowerCase().includes("runway")).value) < 6) ? C.red : C.green, note: (kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value && parseFloat(kpis.find(k=>k.label?.toLowerCase().includes("runway")).value) < 6) ? "⚠️ Below 6 months" : "✅ Healthy" },
            ].map((b,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:12, background:C.bg2, border:`1px solid ${C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:b.color }}>{b.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{b.label}</div>
                <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:3 }}>{b.note}</div>
              </div>
            ))}
          </div>
          {/* Efficiency metrics */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { label:"Burn Multiple",       value: reportData?.burnMultiple      || "1.8x",  note:"Revenue / Net Burn. Target <1.5x", flag: reportData?.burnMultiple ? parseFloat(reportData.burnMultiple)>1.5 : true },
              { label:"EBITDA-to-Cash Conv.", value: reportData?.ebitdaCashConv    || "—",     note:"Operating cash efficiency",         flag: false },
              { label:"CAC Payback Period",  value: reportData?.cacPayback        || "18 mo", note:"Investors prefer <12 months",       flag: reportData?.cacPayback ? parseInt(reportData.cacPayback)>12 : true },
              { label:"Net Revenue Retention",value: reportData?.nrr              || "108%",  note:"Expansion + retention. Target >100%",flag: false },
            ].map((m,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                borderRadius:10, background:m.flag?`${C.amber}08`:C.bg,
                border:`1px solid ${m.flag?C.amber+"25":C.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontFamily:FM, fontSize:16, fontWeight:700, color:m.flag?C.amber:C.green }}>{m.value}</div>
                </div>
                <div style={{ fontFamily:F, fontSize:10, color:C.dim, maxWidth:120, textAlign:"right", lineHeight:1.4 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cash Pressure Points */}
        {(reportData?.cashPressure1 || reportData?.cashPressure2) && (
          <Card style={{ marginBottom:20, borderLeft:`3px solid ${C.red}` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>
              {"⚠️ Upcoming Cash Pressure Points"}
            </div>
            {[reportData?.cashPressure1, reportData?.cashPressure2, reportData?.cashPressure3]
              .filter(Boolean)
              .map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  borderRadius:8, background:`${C.red}06`, border:`1px solid ${C.red}15`, marginBottom:8,
                  fontFamily:F, fontSize:13, color:C.text }}>
                  <span style={{ color:C.red }}>{"•"}</span>{p}
                </div>
            ))}
          </Card>
        )}

        <Card style={{ borderLeft:`3px solid ${C.amber}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
            📝 Garima's Analysis
          </div>
          <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
            {reportData?.cashflowNote || reportData?.packNote || garimaDefaults.startup}
          </p>
        </Card>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MSME PACK
  // ───────────────────────────────────────────────────────────────────────────
  if (pack === "msme") {
    const cfData = CASHFLOW_MSME;
    return (
      <div style={{ padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Collections, payments, working capital and cash conversion">Cash Flow</SectionTitle>
          <button
            onClick={() => {
              const html = generateCashPDF({ client, reportData, kpis });
              const w = window.open("","_blank");
              w.document.write(html);
              w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:12, background:`${C.teal}10`, border:`1.5px solid ${C.teal}25`,
              color:C.teal, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {"📄 Download Cash Report"}
          </button>
        </div>

        <KpiBar items={[
          { label:"Cash Inflows (Feb)",   value:"₹84L",    color:C.green,  bg:"#ECFDF5", sub:"▲ +6.1% vs Jan", trend:"up" },
          { label:"Cash Outflows (Feb)",  value:"₹67L",    color:C.red,    bg:"#FEF2F2", sub:"▼ −4.3% vs Jan", trend:"up" },
          { label:"Net Cash Flow",        value:"+₹17L",   color:C.blue,   bg:"#EEF3FE", sub:"Feb closing" },
          { label:"Cash Conv. Cycle",     value:"37 days", color:C.amber,  bg:"#FFFBEB", border:`${C.amber}30`, sub:"⚠️ Target <30 days", trend:"down" },
        ]}/>

        {/* Inflow vs Outflow chart */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
            Monthly Cash Inflows vs Outflows
          </div>
          <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>₹ Lakhs · Mar onwards is forecast</div>
          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cfData} margin={{ top:5, right:10, left:0, bottom:0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontFamily:F, fontSize:11, fill:C.dim }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontFamily:FM, fontSize:10, fill:C.dim }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} width={50}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine x="Mar" stroke={C.border} strokeDasharray="4 4" label={{ value:"Forecast →", position:"top", fontSize:10, fill:C.dim, fontFamily:F }}/>
                <Bar dataKey="inflow"   name="Inflows"  fill={C.green} radius={[4,4,0,0]} opacity={0.85}
                  label={false}/>
                <Bar dataKey="outflow"  name="Outflows" fill={C.red}   radius={[4,4,0,0]} opacity={0.75}/>
                <Bar dataKey="fInflow"  name="Forecast Inflows"  fill={C.green} radius={[4,4,0,0]} opacity={0.35}/>
                <Bar dataKey="fOutflow" name="Forecast Outflows" fill={C.red}   radius={[4,4,0,0]} opacity={0.3}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Working capital positions */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>
            Working Capital Positions — Feb 2026
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf">
            {[
              { label:"Debtors (AR)",   value:"₹38.4L", days:"46 days", color:C.blue,   flag:true,  note:"Target: <30 days" },
              { label:"Creditors (AP)", value:"₹22.1L", days:"31 days", color:C.purple, flag:false, note:"Well managed" },
              { label:"Inventory",      value:"₹15.8L", days:"22 days", color:C.teal,   flag:false, note:"6.2x turnover" },
            ].map((w,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:12, background:w.flag?`${C.amber}08`:C.bg,
                border:`1px solid ${w.flag?C.amber+"40":C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:w.color }}>{w.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{w.label}</div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:w.color, marginTop:2 }}>{w.days}</div>
                <div style={{ fontFamily:F, fontSize:10, color:w.flag?C.amber:C.green, marginTop:3 }}>{w.flag?"⚠️ ":"✅ "}{w.note}</div>
              </div>
            ))}
            <style>{`.wc-cf{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-cf{grid-template-columns:1fr!important}}`}</style>
          </div>
          <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
              ⚠️ Cash Conversion Cycle: AR 46 − AP 31 + Inv 22 = <strong>37 days</strong>. Every 1-day reduction in debtor days = ~₹2.8L freed up in cash.
            </span>
          </div>
        </Card>

        {/* March cash pressure */}
        <Card style={{ marginBottom:20, borderLeft:`3px solid ${C.red}` }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>
            ⚠️ March Cash Pressure Points
          </div>
          {[
            { item:"Advance tax Q4 payment",        amount:"−₹22L", due:"15 Mar", risk:"high"   },
            { item:"Client B overdue (90+ days)",   amount:"₹4.8L at risk", due:"Action needed", risk:"high" },
            { item:"Supplier X raw material payment",amount:"−₹9.2L", due:"20 Mar", risk:"medium" },
            { item:"GSTR-3B Feb filing",            amount:"GST payable", due:"20 Mar", risk:"medium" },
            { item:"Salary & PF",                   amount:"−₹14.3L", due:"1 Apr",  risk:"low"    },
          ].map((r,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"9px 12px", borderRadius:9, marginBottom:6,
              background:r.risk==="high"?`${C.red}06`:r.risk==="medium"?`${C.amber}06`:C.bg,
              border:`1px solid ${r.risk==="high"?C.red+"20":r.risk==="medium"?C.amber+"20":C.border}` }}>
              <div>
                <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{r.item}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:1 }}>Due: {r.due}</div>
              </div>
              <span style={{ fontFamily:FM, fontSize:12, fontWeight:700,
                color:r.risk==="high"?C.red:r.risk==="medium"?C.amber:C.muted }}>{r.amount}</span>
            </div>
          ))}
        </Card>

        <Card style={{ borderLeft:`3px solid ${C.teal}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
            📝 Garima's Analysis
          </div>
          <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
            {reportData?.cashflowNote || reportData?.packNote || garimaDefaults.msme}
          </p>
        </Card>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CORPORATE PACK
  // ───────────────────────────────────────────────────────────────────────────
  const cfData = CASHFLOW_CORPORATE;
  return (
    <div style={{ padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Operating, investing and financing cash flows — board-ready format">Cash Flow</SectionTitle>
          <button
            onClick={() => {
              const html = generateCashPDF({ client, reportData, kpis });
              const w = window.open("","_blank");
              w.document.write(html);
              w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:12, background:`${C.purple}10`, border:`1.5px solid ${C.purple}25`,
              color:C.purple, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {"📄 Download Cash Report"}
          </button>
        </div>

      <KpiBar items={[
        { label:"Operating CF (Feb)",  value:"₹45L",   color:C.green,  bg:"#ECFDF5", sub:"▲ Best month YTD", trend:"up" },
        { label:"Free Cash Flow",      value:"₹38L",   color:C.blue,   bg:"#EEF3FE", sub:"After capex" },
        { label:"EBITDA→Cash Conv.",   value:"82%",    color:C.purple, bg:"#F3EFFF", sub:"▲ Above sector avg", trend:"up" },
        { label:"Net Debt",            value:"₹1.8 Cr",color:C.muted,  bg:C.bg,      sub:"D/E ratio: 0.8x" },
      ]}/>

      {/* OCF / ICF / FCF chart */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
          Cash Flow by Category — 9 Month View
        </div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>
          ₹ Lakhs · Operating, Investing, Financing · Mar onwards is forecast
        </div>
        <div style={{ height:260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cfData} margin={{ top:5, right:10, left:0, bottom:0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontFamily:F, fontSize:11, fill:C.dim }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontFamily:FM, fontSize:10, fill:C.dim }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} width={50}/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke={C.border} strokeWidth={1}/>
              <ReferenceLine x="Mar" stroke={C.border} strokeDasharray="4 4" label={{ value:"Forecast →", position:"top", fontSize:10, fill:C.dim, fontFamily:F }}/>
              <Bar dataKey="operating" name="Operating CF" fill={C.green}  radius={[3,3,0,0]}/>
              <Bar dataKey="investing" name="Investing CF"  fill={C.red}   radius={[3,3,0,0]}/>
              <Bar dataKey="financing" name="Financing CF"  fill={C.amber} radius={[3,3,0,0]}/>
              <Bar dataKey="fOp"  name="Fcast Operating" fill={C.green}  radius={[3,3,0,0]} opacity={0.3}/>
              <Bar dataKey="fInv" name="Fcast Investing"  fill={C.red}   radius={[3,3,0,0]} opacity={0.3}/>
              <Bar dataKey="fFin" name="Fcast Financing"  fill={C.amber} radius={[3,3,0,0]} opacity={0.3}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap" }}>
          {[{c:C.green,l:"Operating"},{c:C.red,l:"Investing"},{c:C.amber,l:"Financing"}].map((x,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:x.c }}/>
              <span style={{ fontSize:11, color:C.muted, fontFamily:F }}>{x.l}</span>
            </div>
          ))}
          <span style={{ fontSize:11, color:C.dim, fontFamily:F }}>· Faded = forecast</span>
        </div>
      </Card>

      {/* EBITDA to Cash bridge */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>
          EBITDA → Free Cash Flow Bridge — Feb 2026
        </div>
        {[
          { label:"EBITDA",                   value:"₹147L", color:C.blue,   base:true  },
          { label:"− Interest paid",           value:"−₹22L", color:C.red,   base:false },
          { label:"− Tax paid",                value:"−₹0L",  color:C.red,   base:false, note:"Q4 due Mar" },
          { label:"± Working capital changes", value:"+₹3L",  color:C.green, base:false },
          { label:"= Operating Cash Flow",     value:"₹128L", color:C.green, base:true  },
          { label:"− Capex",                   value:"−₹7L",  color:C.red,   base:false },
          { label:"+ Asset disposal",          value:"+₹0L",  color:C.dim,   base:false },
          { label:"= Free Cash Flow",          value:"₹121L", color:C.purple,base:true  },
        ].map((b,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"9px 12px", borderRadius:9, margin:"2px 0",
            background:b.base?`${b.color}10`:C.bg,
            border:`1px solid ${b.base?b.color+"30":C.border}` }}>
            <span style={{ fontFamily:F, fontSize:13, color:b.base?b.color:C.text, fontWeight:b.base?700:400 }}>
              {b.label}{b.note&&<span style={{ fontSize:11, color:C.dim, marginLeft:8 }}>({b.note})</span>}
            </span>
            <span style={{ fontFamily:FM, fontSize:14, fontWeight:700, color:b.color }}>{b.value}</span>
          </div>
        ))}
      </Card>

      {/* Q1 forecast table */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>
          Q1 FY27 Cash Forecast — Mar to May 2026
        </div>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%", minWidth:400, borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
            <thead>
              <tr style={{ background:C.navy }}>
                {["",          "March",  "April",  "May",    "Q1 Total"].map((h,i) => (
                  <th key={i} style={{ padding:"9px 12px", textAlign:i===0?"left":"right",
                    color:"white", fontWeight:700, fontSize:12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Operating CF", "₹38L",  "₹44L",  "₹47L",  "₹129L" ],
                ["Investing CF", "−₹15L", "−₹6L",  "−₹5L",  "−₹26L" ],
                ["Financing CF", "−₹5L",  "−₹5L",  "−₹5L",  "−₹15L" ],
                ["Net CF",       "₹18L",  "₹33L",  "₹37L",  "₹88L"  ],
              ].map((r,i) => {
                const bold = i===3;
                return (
                  <tr key={i} style={{ background:bold?`${C.blue}06`:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                    {r.map((cell,j) => (
                      <td key={j} style={{ padding:"9px 12px", textAlign:j===0?"left":"right",
                        fontWeight:bold||j===0?700:400, color:bold?C.blue:cell.startsWith("−")?C.red:C.text,
                        fontFamily:j>0?FM:F }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
          📝 Garima's Analysis
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
          {reportData?.cashflowNote || reportData?.packNote || garimaDefaults.corporate}
        </p>
      </Card>
    </div>
  );
}

// ─── ACTION ITEMS ─────────────────────────────────────────────────────────────
function ActionItems({ actions: actionsProp, kpis, reportData }) {
  const [items, setItems] = useState(actionsProp || ACTIONS);
  // Sync if parent passes new live data after load
  useEffect(() => { if (actionsProp) setItems(actionsProp); }, [actionsProp]);
  const toggle = async (id) => {
    setItems(prev => prev.map(a => a.id===id ? {...a, done:!a.done} : a));
    // If connected to Supabase, update the record
    try {
      const item = items.find(a => a.id === id);
      if (item && item.id && typeof item.id === "string") { // real Supabase UUID
        await supabase.from("action_items").update({ done: !item.done }).eq("id", id);
      }
    } catch(e) { /* demo mode — no-op */ }
  };
  const pending  = items.filter(a => !a.done);
  const done     = items.filter(a => a.done);

  // Auto-generate strategic alerts from KPI data
  const strategicAlerts = (() => {
    if (!kpis || kpis.length === 0) return [];
    const alerts = [];
    const run  = kpis.find(k=>k.label?.toLowerCase().includes("runway"));
    const cash = kpis.find(k=>k.label?.toLowerCase().includes("cash"));
    const burn = kpis.find(k=>k.label?.toLowerCase().includes("burn"));
    const rev  = kpis.find(k=>k.label?.toLowerCase().includes("rev"));
    const mar  = kpis.find(k=>k.label?.toLowerCase().includes("margin"));
    if (run  && parseFloat(run.value)  < 3)  alerts.push({ text:`🔴 Runway is ${run.value} — raise capital or cut costs immediately. Every week counts.`,   priority:"High",   color:C.red    });
    if (run  && parseFloat(run.value)  < 6  && parseFloat(run.value) >= 3) alerts.push({ text:`⚠️ Runway at ${run.value} — start fundraise conversations now. 6 months is the minimum buffer.`, priority:"High", color:C.amber });
    if (burn && burn.trend === "down") alerts.push({ text:`Burn increased to ${burn.value} — review discretionary spend and defer non-essential hiring.`, priority:"Medium", color:C.amber });
    if (rev  && rev.trend  === "down") alerts.push({ text:`Revenue dipped to ${rev.value} — review pipeline and follow up on delayed deals before month end.`, priority:"High", color:C.red });
    if (mar  && mar.trend  === "down") alerts.push({ text:`Gross margin compressed to ${mar.value} — audit COGS and renegotiate vendor contracts.`, priority:"Medium", color:C.amber });
    if (cash && cash.trend === "down") alerts.push({ text:`Cash dropped to ${cash.value} — prioritise collections and delay non-critical payments.`, priority:"Medium", color:C.amber });
    if (reportData?.loanScore && reportData.loanScore < 55) alerts.push({ text:"Loan readiness score is low — complete financial projections and clean up balance sheet before applying.", priority:"Medium", color:C.amber });
    return alerts;
  })();

  return (
    <div style={{ padding:24 }}>
      <SectionTitle
        sub={`${pending.length} pending · ${done.length} completed`}>
        Action Items from Garima
      </SectionTitle>

      {/* Strategic Alerts — auto-generated */}
      {strategicAlerts.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase",
            letterSpacing:"0.08em", marginBottom:12, fontFamily:F }}>{"⚡ Strategic Alerts — Based on Your Numbers"}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {strategicAlerts.map((a, i) => (
              <div key={i} style={{ padding:"12px 16px", borderRadius:12,
                background:`${a.color}08`, border:`1px solid ${a.color}25`,
                display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:a.color,
                  flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:F, fontSize:13, color:C.text, margin:"0 0 4px", lineHeight:1.6 }}>{a.text}</p>
                  <PriBadge p={a.priority}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20, textAlign:"center" }}>
        {[
          { label:"Pending", n:pending.length, c:C.red,   bg:"#FEF2F2" },
          { label:"Done",    n:done.length,    c:C.green, bg:"#ECFDF5" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:16 }}>
            <div style={{ fontFamily:FM, fontSize:32, fontWeight:700, color:s.c }}>{s.n}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
            letterSpacing:"0.08em", marginBottom:12, fontFamily:F }}>Pending</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {pending.map(a => (
              <Card key={a.id} style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <button onClick={() => toggle(a.id)} style={{ width:20, height:20, borderRadius:6,
                    border:`2px solid ${C.border}`, background:"white", cursor:"pointer",
                    flexShrink:0, marginTop:1, touchAction:"manipulation" }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:F, fontSize:14, color:C.text, margin:"0 0 6px", lineHeight:1.5 }}>{a.text}</p>
                    <PriBadge p={a.priority}/>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
            letterSpacing:"0.08em", marginBottom:12, fontFamily:F }}>Completed</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {done.map(a => (
              <Card key={a.id} style={{ padding:"14px 16px", opacity:0.6 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:C.green,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, marginTop:1, cursor:"pointer" }}
                    onClick={() => toggle(a.id)}>
                    <span style={{ color:"white", fontSize:11, fontWeight:900 }}>✓</span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:14, color:C.muted, margin:0, textDecoration:"line-through", lineHeight:1.5 }}>{a.text}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SMART CFO PACKS ─────────────────────────────────────────────────────────

const CFO_PACK_DATA = {
  startup: {
    label: "Startup Pack",
    icon: "🚀",
    color: C.blue,
    bg: "#EEF3FE",
    grad: "linear-gradient(135deg,#3B6FF7,#7C5CF5)",
    tagline: "Fundraise-ready financials for your next round",
    fundraiseScore: 72,
    fundraiseBreakdown: [
      { label:"Revenue Growth",          score:85, comment:"Strong 42% YoY — above Series A median" },
      { label:"Gross Margin",            score:78, comment:"41% is healthy; target 45%+ before raise" },
      { label:"Runway",                  score:55, comment:"4.4 months — tight; raise in next 60 days" },
      { label:"Financial Documentation", score:70, comment:"3yr P&L ready; projections need refresh" },
      { label:"Unit Economics",          score:72, comment:"CAC/LTV ratio needs improvement" },
    ],
    investorMetrics: [
      { label:"ARR",          value:"₹6.2 Cr",  flag:false, note:"Good for Series A" },
      { label:"MoM Growth",   value:"6%",        flag:false, note:"Consistent" },
      { label:"Burn Multiple",value:"1.8x",      flag:true,  note:"Target <1.5x before raise" },
      { label:"CAC Payback",  value:"18 mo",     flag:true,  note:"Investors prefer <12 mo" },
      { label:"NRR",          value:"108%",      flag:false, note:"Healthy retention" },
      { label:"Gross Margin", value:"41%",       flag:false, note:"On track" },
    ],
    dueDiligence: [
      { item:"Audited financials (3 years)",              done:true  },
      { item:"5-year projections with assumptions",       done:true  },
      { item:"Cap table (fully diluted)",                 done:true  },
      { item:"MIS pack — last 6 months",                  done:false },
      { item:"Unit economics — cohort analysis",          done:false },
      { item:"Board resolutions for previous fundraises", done:true  },
      { item:"ESOP scheme document",                      done:false },
      { item:"Shareholder agreement (all investors)",     done:true  },
    ],
    boardPacks: BOARD_PACKS,
    garimaNote: "Your ARR growth is the strongest part of your story — lean into it. The burn multiple at 1.8x will get questions from institutional investors. I'd recommend showing a clear path to 1.2x by month 9. Let's work on the unit economics narrative before you start investor conversations.",
  },
  msme: {
    label: "MSME Pack",
    icon: "🏭",
    color: C.teal,
    bg: "#E6FAF7",
    grad: "linear-gradient(135deg,#0CB8A4,#3B6FF7)",
    tagline: "Cash flow health and working capital intelligence",
    cashHealth: 68,
    cashBreakdown: [
      { label:"Cash Conversion Cycle",  score:55, comment:"42 days — reduce debtor days to improve" },
      { label:"Working Capital Ratio",  score:72, comment:"1.6x — adequate but watch March dip" },
      { label:"Debtor Days",            score:58, comment:"38 days — target <30 for your sector" },
      { label:"Creditor Days",          score:80, comment:"52 days — well managed" },
      { label:"Inventory Turnover",     score:75, comment:"6.2x — good for FMCG segment" },
    ],
    workingCapital: [
      { label:"Current Ratio",       value:"1.62x", flag:false, note:"Healthy (>1.5)" },
      { label:"Quick Ratio",         value:"1.18x", flag:false, note:"Adequate" },
      { label:"Debtor Days",         value:"38 days",flag:true, note:"Target <30" },
      { label:"Creditor Days",       value:"52 days",flag:false,note:"Well managed" },
      { label:"Inventory Days",      value:"24 days",flag:false,note:"Lean" },
      { label:"Cash Conversion",     value:"10 days",flag:false,note:"Good" },
    ],
    growth: [
      { label:"Revenue Growth YoY",   value:"22%",    flag:false, note:"Sector avg: 18%" },
      { label:"EBITDA Margin",        value:"14.2%",  flag:false, note:"Healthy" },
      { label:"Gross Margin Trend",   value:"▲ +2pp", flag:false, note:"Improving" },
      { label:"Debtor Concentration", value:"High",   flag:true,  note:"Top 3 = 64% of AR" },
    ],
    boardPacks: BOARD_PACKS,
    garimaNote: "Working capital is healthy overall but the debtor concentration is a risk — if your top client delays, it cascades into a cash crunch. I've flagged this as the priority item for next month. Creditor days are well managed; keep that discipline. Focus for Q1: reduce debtor days from 38 to 30.",
  },
  corporate: {
    label: "Corporate Pack",
    icon: "🏢",
    color: C.purple,
    bg: "#F3EFFF",
    grad: "linear-gradient(135deg,#7C5CF5,#E8509A)",
    tagline: "IPO readiness, compliance flags & Ind AS health check",
    ipoScore: 58,
    ipoBreakdown: [
      { label:"Revenue Scale",              score:75, comment:"₹85 Cr — approaching IPO threshold" },
      { label:"Profitability Track Record", score:60, comment:"EBITDA positive 2yr; need 3yr PAT" },
      { label:"Governance & Board",         score:55, comment:"Independent director appointment pending" },
      { label:"Ind AS Compliance",          score:65, comment:"Ind AS 116 and 109 need attention" },
      { label:"Audit Quality",              score:72, comment:"Big 4 auditor — positive signal" },
    ],
    complianceFlags: [
      { flag:"Ind AS 116 — Lease Accounting",      severity:"High",   detail:"Operating leases not yet restated under IFRS 16 equivalent." },
      { flag:"Ind AS 109 — Financial Instruments", severity:"High",   detail:"ECL provisioning not computed for trade receivables." },
      { flag:"Related Party Disclosures",           severity:"Medium", detail:"2 transactions in FY24 may require enhanced disclosure." },
      { flag:"Independent Director",                severity:"Medium", detail:"Board needs 1 additional independent director for LODR." },
      { flag:"CSR Compliance",                      severity:"Low",    detail:"CSR spend at 1.8% vs required 2% — minor shortfall." },
    ],
    indAS: [
      { standard:"Ind AS 36 — Impairment",    status:"Compliant",    note:"Tested annually" },
      { standard:"Ind AS 116 — Leases",        status:"Action Needed",note:"Restatement required" },
      { standard:"Ind AS 109 — Fin Instruments",status:"Action Needed",note:"ECL model needed" },
      { standard:"Ind AS 113 — Fair Value",    status:"Compliant",    note:"Mark-to-market current" },
      { standard:"Ind AS 21 — Foreign Ops",    status:"Compliant",    note:"USD invoices hedged" },
    ],
    boardPacks: BOARD_PACKS,
    garimaNote: "The IPO readiness score of 58 is a starting point — the two Ind AS gaps (116 and 109) are solvable in 2–3 months with a focused project. The governance gap is easier but takes longer (6+ months for a qualified independent director). I'd recommend starting the Ind AS restatement work immediately so it's done before you engage investment bankers.",
  },
};

function ScoreGauge({ score, color, size=100 }) {
  const r = (size/2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position:"relative", width:size, height:size, display:"inline-block" }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E7F0" strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:FM, fontSize:size*0.22, fontWeight:700, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontFamily:F, fontSize:size*0.1, color:C.dim, marginTop:2 }}>/100</span>
      </div>
    </div>
  );
}

function StartupCFOPack({ data, client, reportData }) {
  return (
    <>
      {/* Fundraise Readiness Score */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:20, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>Fundraise Readiness Score</div>
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:22, color:C.text, margin:"0 0 4px" }}>
              Overall: {reportData?.score || data.fundraiseScore}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {(parseInt(reportData?.score)||data.fundraiseScore) >= 75 ? "✅ Series A ready" : (parseInt(reportData?.score)||data.fundraiseScore) >= 55 ? "⚠️ Almost there — a few gaps to close" : "🔴 Significant prep needed"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.fundraiseScore} color={C.blue} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(Array.isArray(reportData?.scoreBreakdown) && reportData.scoreBreakdown.some(s=>s.score) ? reportData.scoreBreakdown : data.fundraiseBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"140px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:3, background:C.bg3, flex:1 }}>
                  <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:152, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  💬 {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:152 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.blue, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:100,
                      border:`1px solid ${C.blue}40`, background:`${C.blue}08` }}>
                    💬 Discuss with Garima →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Investor Metrics */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Key metrics investors will ask about in your data room">Investor Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="inv-grid">
          {(Array.isArray(reportData?.metrics) && reportData.metrics.some(m=>m.value) ? reportData.metrics : data.investorMetrics).map((m, i) => (
            <div key={i} style={{ padding:"14px 14px", borderRadius:12,
              background: m.flag ? "#FEF2F2" : C.bg,
              border:`1px solid ${m.flag ? C.red+"40" : C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontFamily:FM, fontSize:18, fontWeight:700,
                color: m.flag ? C.red : C.blue, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11,
                color: m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "⚠️ " : "✅ "}{m.note}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Due Diligence Checklist */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Documents investors will request in due diligence">Financial DD Checklist</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(Array.isArray(reportData?.checklist) && reportData.checklist.length ? reportData.checklist : data.dueDiligence).map((d, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
              borderRadius:10, background:d.done ? `${C.green}08` : "#FFFBEB",
              border:`1px solid ${d.done ? C.green+"25" : C.amber+"40"}` }}>
              <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                background:d.done ? C.green : C.amber,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"white", fontSize:10, fontWeight:900 }}>{d.done ? "✓" : "!"}</span>
              </div>
              <span style={{ fontFamily:F, fontSize:13, color:d.done ? C.text : C.amber,
                fontWeight:d.done ? 500 : 600 }}>{d.item}</span>
              {!d.done && <Badge color={C.amber} bg="#FFFBEB">Needed</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function MSMECFOPack({ data, reportData }) {
  return (
    <>
      {/* Cash Health Score */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:20, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>Cash Flow Health Score</div>
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:22, color:C.text, margin:"0 0 4px" }}>
              Overall: {reportData?.score || data.cashHealth}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {(parseInt(reportData?.score)||data.cashHealth) >= 75 ? "✅ Strong working capital position" : "⚠️ A few areas to tighten up"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.cashHealth} color={C.teal} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(reportData?.scoreBreakdown?.some(s=>s.score) ? reportData.scoreBreakdown : data.cashBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:3, background:C.bg3 }}>
                  <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:172, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  💬 {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:172 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.teal, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:100,
                      border:`1px solid ${C.teal}40`, background:`${C.teal}08` }}>
                    💬 Discuss with Garima →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Working Capital */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Working capital ratios vs benchmarks">Working Capital Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="inv-grid">
          {(reportData?.metrics?.some(m=>m.value) ? reportData.metrics : data.workingCapital).map((m, i) => (
            <div key={i} style={{ padding:"14px 14px", borderRadius:12,
              background: m.flag ? "#FEF2F2" : C.bg, border:`1px solid ${m.flag ? C.red+"40" : C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontFamily:FM, fontSize:18, fontWeight:700,
                color: m.flag ? C.red : C.teal, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "⚠️ " : "✅ "}{m.note}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Growth Metrics */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Growth and profitability indicators">Growth Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {data.growth.map((m, i) => (
            <div key={i} style={{ padding:"14px 16px", borderRadius:12,
              background: m.flag ? "#FEF2F2" : C.bg, border:`1px solid ${m.flag ? C.red+"40" : C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
                <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                  {m.flag ? "⚠️ " : "✅ "}{m.note}
                </div>
              </div>
              <div style={{ fontFamily:FM, fontSize:20, fontWeight:700,
                color: m.flag ? C.red : C.teal }}>{m.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bank Finance / Loan Readiness */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Readiness for working capital loans & term finance">Bank Finance Readiness</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="inv-grid">
          {[
            { label:"DSCR",                    value: reportData?.dscr || "2.1x",            flag: reportData?.dscr ? parseFloat(reportData.dscr)<1.5 : false,  note: reportData?.dscr ? (parseFloat(reportData.dscr)<1.5?"Below bank threshold":"Banks prefer >1.5x") : "Banks prefer >1.5x" },
            { label:"Interest Coverage",       value: reportData?.interestCoverage || "4.2x", flag: reportData?.interestCoverage ? parseFloat(reportData.interestCoverage)<3 : false, note: reportData?.interestCoverage ? (parseFloat(reportData.interestCoverage)<3?"Below threshold":"Comfortable coverage") : "Target >3.0x" },
            { label:"Interest Margin",         value: reportData?.interestMargin || "3.8%",   flag: false, note:"Net interest spread" },
            { label:"ROE",                     value: reportData?.roe || "18.4%",             flag: reportData?.roe ? parseFloat(reportData.roe)<12 : false,    note: reportData?.roe ? (parseFloat(reportData.roe)<12?"Below sector avg":"Above sector avg") : "Return on equity" },
            { label:"Debt:Equity Ratio",       value: reportData?.debtEquity || "0.8:1",      flag: false, note:"Conservative — good" },
            { label:"Current Ratio",           value: reportData?.currentRatio || "1.62x",    flag: reportData?.currentRatio ? parseFloat(reportData.currentRatio)<1.2 : false, note: reportData?.currentRatio ? (parseFloat(reportData.currentRatio)<1.2?"Below bank norms":"Meets bank norms") : "Meets bank norms" },
            { label:"Cash Conversion Cycle",   value: reportData?.ccc || "37 days",           flag: reportData?.ccc ? parseFloat(reportData.ccc)>45 : false,  note: reportData?.ccc ? (parseFloat(reportData.ccc)>45?"Target <30 days":"Target <30 days") : "Target <30 days" },
            { label:"Working Capital",         value: reportData?.workingCapital || "Rs.32.4L", flag: false, note:"Net current assets" },
          ].map((m,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:12,
              background: m.flag ? "#FEF2F2" : C.bg, border:`1px solid ${m.flag ? C.red+"40" : C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontFamily:FM, fontSize:17, fontWeight:700,
                color: m.flag ? C.red : C.teal, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "⚠️ " : "✅ "}{m.note}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Due Diligence Checklist */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Documents required for bank loans, buyer DD, and audits">Due Diligence Checklist</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            { item:"3 years audited financials (P&L, Balance Sheet, Cash Flow)", done:true  },
            { item:"Latest GST returns — 12 months",                              done:true  },
            { item:"Bank statements — 12 months (all accounts)",                  done:true  },
            { item:"ITR with computation — last 3 years",                         done:true  },
            { item:"Debtors + Creditors ageing statement",                        done:false },
            { item:"Stock statement (valued at cost)",                            done:false },
            { item:"Sanction letters for all existing loans",                     done:true  },
            { item:"MIS / Management accounts — last 6 months",                  done:false },
            { item:"Business continuity / succession plan",                       done:false },
          ].map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
              borderRadius:10, background:d.done ? `${C.green}08` : "#FFFBEB",
              border:`1px solid ${d.done ? C.green+"25" : C.amber+"40"}` }}>
              <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                background:d.done ? C.green : C.amber,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"white", fontSize:10, fontWeight:900 }}>{d.done ? "✓" : "!"}</span>
              </div>
              <span style={{ fontFamily:F, fontSize:13, color:d.done ? C.text : C.amber,
                fontWeight:d.done ? 500 : 600 }}>{d.item}</span>
              {!d.done && <Badge color={C.amber} bg="#FFFBEB">Needed</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function CorporateCFOPack({ data, reportData }) {
  const sevColor = { High:C.red, Medium:C.amber, Low:C.green };
  const sevBg    = { High:"#FEF2F2", Medium:"#FFFBEB", Low:"#ECFDF5" };
  const statusColor = { "Compliant":C.green, "Action Needed":C.red, "Monitor":C.amber };

  return (
    <>
      {/* IPO Readiness Score */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:20, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>IPO Readiness Score</div>
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:22, color:C.text, margin:"0 0 4px" }}>
              Preliminary: {data.ipoScore}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {data.ipoScore >= 75 ? "✅ Strong IPO foundation" : data.ipoScore >= 55 ? "⚠️ Targeted prep required" : "🔴 Significant gaps to address"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.ipoScore} color={C.purple} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(reportData?.scoreBreakdown?.some(s=>s.score) ? reportData.scoreBreakdown : data.ipoBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"180px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:3, background:C.bg3 }}>
                  <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:192, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  💬 {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:192 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.purple, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:100,
                      border:`1px solid ${C.purple}40`, background:`${C.purple}08` }}>
                    💬 Discuss with Garima →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance Flags */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Issues requiring attention before IPO or auditor review">Compliance Flags</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.complianceFlags.map((f, i) => (
            <div key={i} style={{ padding:"14px 16px", borderRadius:12,
              background:sevBg[f.severity], border:`1px solid ${sevColor[f.severity]}30` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                flexWrap:"wrap", gap:8, marginBottom:6 }}>
                <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{f.flag}</span>
                <Badge color={sevColor[f.severity]} bg={sevBg[f.severity]}>{f.severity}</Badge>
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0, lineHeight:1.6 }}>{f.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Ind AS Health Check */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Status of key Ind AS standards for your entity">Ind AS Health Check</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.indAS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:10, padding:"11px 14px", borderRadius:10,
              background: s.status==="Action Needed" ? "#FEF2F2" : C.bg,
              border:`1px solid ${s.status==="Action Needed" ? C.red+"30" : C.border}` }}>
              <span style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{s.standard}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>{s.note}</span>
                <Badge color={statusColor[s.status]||C.green}>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ─── BOARD PACKS — MSME / CORPORATE / CFO TABBED ────────────────────────────

// "new" = uploaded within last 35 days
const _archiveRaw = [
  { name:"February 2026", date:"20 Feb 2026", size:"2.4 MB", uploadedAt:"2026-02-20" },
  { name:"January 2026",  date:"22 Jan 2026", size:"2.1 MB", uploadedAt:"2026-01-22" },
  { name:"December 2025", date:"19 Dec 2025", size:"1.9 MB", uploadedAt:"2025-12-19" },
];
const ARCHIVE = _archiveRaw.map(p => ({
  ...p,
  new: (new Date() - new Date(p.uploadedAt)) < 35 * 24 * 60 * 60 * 1000,
}));

function PackPreview({ p, label }) {
  // Realistic mock preview content per month
  const previews = {
    "February 2026": {
      kpis: [{ k:"Revenue", v:"₹8.4 Cr", d:"▲ +6.1%" }, { k:"EBITDA", v:"₹1.47 Cr", d:"▲ +17.5%" }, { k:"Cash", v:"₹2.1 Cr", d:"▼ -0.3Cr" }],
      note: "Strong month — revenue beat budget by ₹52L. March cash needs board attention before 10 March.",
      pages: ["Executive Summary", "KPI Dashboard", "P&L vs Budget", "Cash Flow Forecast", "Action Items"],
    },
    "January 2026": {
      kpis: [{ k:"Revenue", v:"₹7.9 Cr", d:"▲ +3.2%" }, { k:"EBITDA", v:"₹1.25 Cr", d:"▲ +12.1%" }, { k:"Cash", v:"₹2.4 Cr", d:"▲ +0.2Cr" }],
      note: "Steady January. Hiring 2 roles creating cost pressure in Q2 — plan reviewed.",
      pages: ["Executive Summary", "KPI Dashboard", "P&L vs Budget", "Cash Flow Forecast", "Action Items"],
    },
    "December 2025": {
      kpis: [{ k:"Revenue", v:"₹7.6 Cr", d:"▲ +1.8%" }, { k:"EBITDA", v:"₹1.11 Cr", d:"▲ +8.4%" }, { k:"Cash", v:"₹2.2 Cr", d:"▼ -0.1Cr" }],
      note: "Year-end close completed. 3 pending compliance items flagged for January.",
      pages: ["Executive Summary", "KPI Dashboard", "P&L vs Budget", "Cash Flow Forecast", "Year-End Review"],
    },
  };
  const data = previews[p.name] || previews["February 2026"];
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, marginTop:14, paddingTop:14 }}>
      {/* Mock page header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", borderRadius:10,
        background:"linear-gradient(135deg,#5B4FDB,#7C3AED)", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:13, color:"white", letterSpacing:"-0.01em" }}>
            {label} — {p.name}
          </div>
          <div style={{ fontFamily:F, fontSize:10, color:"rgba(255,255,255,0.65)", marginTop:2 }}>
            Prepared by Garima Agarwal · 5th Gear Valuation · {p.date}
          </div>
        </div>
        <div style={{ fontFamily:F, fontSize:9, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>
          CONFIDENTIAL<br/>Page 1 of {data.pages.length + 2}
        </div>
      </div>

      {/* KPI snapshot row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {data.kpis.map((kpi,i) => (
          <div key={i} style={{ padding:"10px 12px", borderRadius:9, background:C.bg,
            border:`1px solid ${C.border}`, textAlign:"center" }}>
            <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginBottom:3 }}>{kpi.k}</div>
            <div style={{ fontFamily:FM, fontSize:14, fontWeight:700, color:C.blue }}>{kpi.v}</div>
            <div style={{ fontFamily:F, fontSize:10, fontWeight:700, marginTop:2,
              color: kpi.d.startsWith("▲") ? C.green : C.red }}>{kpi.d}</div>
          </div>
        ))}
      </div>

      {/* Garima note snippet */}
      <div style={{ padding:"10px 12px", borderRadius:9, background:`${C.blue}06`,
        borderLeft:`3px solid ${C.blue}`, marginBottom:12 }}>
        <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.blue, marginBottom:4, letterSpacing:"0.06em" }}>
          NOTE FROM GARIMA
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.6 }}>{data.note}</div>
      </div>

      {/* Table of contents */}
      <div style={{ padding:"8px 12px", borderRadius:9, background:C.bg, border:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:6 }}>
          CONTENTS
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {data.pages.map((pg, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              fontFamily:F, fontSize:11, color:C.text }}>
              <span>{i+1}. {pg}</span>
              <span style={{ color:C.dim, fontFamily:FM }}>p.{i+2}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop:10, fontFamily:F, fontSize:10, color:C.dim, textAlign:"center" }}>
        Preview of cover page · Download for full report
      </div>
    </div>
  );
}

function ArchiveRow({ p, label }) {
  const [showPreview, setShowPreview] = React.useState(false);
  return (
    <Card style={{ padding:"14px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:p.new?`${C.blue}12`:`${C.muted}0A`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📄</div>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, display:"flex", alignItems:"center", gap:7 }}>
              {label} — {p.name} {p.new && <Badge color={C.blue}>New</Badge>}
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>{p.date} · {p.size}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={() => setShowPreview(v => !v)}
            style={{ padding:"8px 14px", borderRadius:9,
              border:`1.5px solid ${C.border}`,
              background: showPreview ? C.bg3 : "transparent",
              color: showPreview ? C.text : C.muted,
              fontFamily:F, fontWeight:600, fontSize:12, cursor:"pointer", touchAction:"manipulation" }}>
            {showPreview ? "▲ Hide" : "👁 Preview"}
          </button>
          {p.file_url ? (
            <button onClick={() => {
              if (p.file_url.startsWith("data:text/html")) {
                const win = window.open("", "_blank");
                if (win) { win.document.write(decodeURIComponent(p.file_url.replace("data:text/html;charset=utf-8,",""))); win.document.close(); }
              } else { window.open(p.file_url, "_blank"); }
            }} style={{ padding:"8px 18px", borderRadius:9, border:`1.5px solid ${C.blue}`,
                background:p.new?C.blue:"transparent", color:p.new?"white":C.blue,
                fontFamily:F, fontWeight:700, fontSize:12, cursor:"pointer",
                touchAction:"manipulation" }}>
              {p.file_url.startsWith("data:text/html") ? "👁 View Report" : "↓ Download"}
            </button>
          ) : (
            <button disabled style={{ padding:"8px 18px", borderRadius:9, border:`1.5px solid ${C.border}`,
              background:"transparent", color:C.dim,
              fontFamily:F, fontWeight:700, fontSize:12, cursor:"not-allowed", touchAction:"manipulation" }}>
              ↓ Coming soon
            </button>
          )}
        </div>
      </div>
      {showPreview && <PackPreview p={p} label={label}/>}
    </Card>
  );
}

const StatRow = ({ label, value, pct, trend, sub }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
    <div>
      <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontFamily:FM, fontSize:15, fontWeight:600, color:C.text }}>{value}</span>
      {pct && <span style={{ fontSize:11, fontWeight:700, color:trend==="up"?C.green:C.red, background:trend==="up"?"#ECFDF5":"#FEF2F2", padding:"2px 8px", borderRadius:100, fontFamily:F }}>{trend==="up"?"▲":"▼"} {pct}</span>}
    </div>
  </div>
);

const AgeingTable = ({ title, rows, color }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color, marginBottom:10 }}>{title}</div>
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
        <thead>
          <tr style={{ background:C.bg3 }}>
            {["Party","0–30 days","31–60 days","61–90 days","90+ days","Total","% of total"].map(h => (
              <th key={h} style={{ padding:"8px 10px", textAlign:h==="Party"?"left":"right", color:C.muted, fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i} style={{ background:i%2===0?C.bg2:C.bg }}>
              {r.map((cell,j) => (
                <td key={j} style={{ padding:"9px 10px", textAlign:j===0?"left":"right", color:j===4?C.red:j===5?C.text:C.muted, fontWeight:j===5||j===0?600:400, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const COMPLIANCE_DATES = [
  { due:"07 Mar", item:"TDS Payment — Feb deductions",       status:"upcoming", owner:"Accounts" },
  { due:"10 Mar", item:"ESI Contribution — Feb",             status:"upcoming", owner:"HR/Accounts" },
  { due:"15 Mar", item:"Advance Tax — 4th Instalment",       status:"due-soon", owner:"Finance" },
  { due:"20 Mar", item:"GSTR-3B Filing — Feb",               status:"due-soon", owner:"GST Consultant" },
  { due:"25 Mar", item:"GSTR-1 Filing — Feb",                status:"upcoming", owner:"GST Consultant" },
  { due:"31 Mar", item:"FY Close — Reconcile all accounts",  status:"critical", owner:"Garima" },
  { due:"07 Apr", item:"TDS Payment — Mar deductions",       status:"upcoming", owner:"Accounts" },
  { due:"30 Apr", item:"TDS Returns Q4 (Form 24Q/26Q)",      status:"upcoming", owner:"CA" },
];




// ─── EXECUTIVE SUMMARY PDF ───────────────────────────────────────────────────
function generateExecSummaryPDF({ client, reportData, kpis }) {
  const company  = client?.company || "Your Company";
  const month    = reportData?.monthLabel || "Current Period";
  const pack     = client?.client_pack || client?.clientPack || "startup";
  const packLabel = pack==="msme" ? "MSME Pack" : pack==="corporate" ? "Board Pack" : "CFO Pack";

  const rev  = kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value  || reportData?.plInputs?.revenue || "—";
  const cash = kpis?.find(k=>k.label?.toLowerCase().includes("cash"))?.value || "—";
  const burn = kpis?.find(k=>k.label?.toLowerCase().includes("burn"))?.value || "—";
  const run  = kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value || "—";
  const mar  = kpis?.find(k=>k.label?.toLowerCase().includes("margin"))?.value || reportData?.plInputs?.gpMargin || "—";
  const ebitda = reportData?.plInputs?.ebitda || "—";

  const perf     = reportData?.execPerformance  || "Performance summary not yet added. Please update in the admin panel.";
  const cashNote = reportData?.execCash         || "Cash position analysis not yet added.";
  const risks    = reportData?.execRisks        || "Risk summary not yet added.";
  const opps     = reportData?.execOpportunities|| "Opportunities not yet added.";
  const nextSteps= reportData?.execNextSteps    || "Next steps not yet added.";
  const garimaNote = reportData?.garimaNote || reportData?.packNote || "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; color:#111827; background:white; }
  .page { max-width:800px; margin:0 auto; padding:48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:18px; border-bottom:3px solid #3B6FF7; }
  .logo { font-size:26px; font-weight:900; color:#3B6FF7; }
  .tagline { font-size:9px; color:#9CA3AF; letter-spacing:0.1em; text-transform:uppercase; margin-top:2px; }
  .doc-meta { text-align:right; font-size:11px; color:#6B7280; line-height:1.7; }
  .doc-meta strong { font-size:14px; color:#111827; display:block; }
  h1 { font-size:28px; font-weight:900; color:#111827; margin-bottom:4px; }
  .subtitle { font-size:13px; color:#6B7280; margin-bottom:6px; }
  .eyebrow { font-size:10px; font-weight:700; color:#3B6FF7; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; }
  .kpi-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin:24px 0; }
  .kpi { padding:10px 8px; border-radius:8px; background:#F9FAFB; border:1px solid #E5E7EB; text-align:center; }
  .kpi-label { font-size:8px; color:#6B7280; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; }
  .kpi-value { font-size:14px; font-weight:900; color:#111827; }
  .section { margin-bottom:24px; padding:18px 20px; border-radius:12px; border:1px solid #E5E7EB; }
  .section-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .section-icon { font-size:18px; }
  h2 { font-size:13px; font-weight:800; color:#111827; text-transform:uppercase; letter-spacing:0.05em; }
  .section-body { font-size:13px; color:#374151; line-height:1.8; }
  .perf   { border-left:3px solid #3B6FF7; background:#F0F4FF; }
  .cash   { border-left:3px solid #10B981; background:#F0FDF4; }
  .risks  { border-left:3px solid #EF4444; background:#FEF2F2; }
  .opps   { border-left:3px solid #8B5CF6; background:#F5F3FF; }
  .next   { border-left:3px solid #F59E0B; background:#FFFBEB; }
  .garima-note { margin-top:24px; padding:16px 18px; background:#EEF3FE; border-radius:10px; border-left:3px solid #3B6FF7; }
  .garima-label { font-size:10px; font-weight:700; color:#3B6FF7; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
  .garima-text  { font-size:13px; color:#111827; line-height:1.8; }
  .disclaimer { margin-top:24px; padding:10px 12px; background:#F9FAFB; border-radius:6px; font-size:10px; color:#6B7280; line-height:1.6; border:1px solid #E5E7EB; }
  .footer { margin-top:16px; padding-top:14px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div><div class="logo">Finzzup</div><div class="tagline">Build. Value. Scale.</div></div>
    <div class="doc-meta">
      <strong>Executive Summary</strong>
      ${company} | ${packLabel}<br/>
      Period: ${month}<br/>
      ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}
    </div>
  </div>

  <div class="eyebrow">Board-Ready | Confidential | Prepared by Garima Agarwal CA</div>
  <h1>${company}</h1>
  <div class="subtitle">Monthly Executive Summary — ${month}</div>

  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-label">Revenue</div><div class="kpi-value">${rev}</div></div>
    <div class="kpi"><div class="kpi-label">Gross Margin</div><div class="kpi-value">${mar}</div></div>
    <div class="kpi"><div class="kpi-label">EBITDA</div><div class="kpi-value">${ebitda}</div></div>
    <div class="kpi"><div class="kpi-label">Cash Balance</div><div class="kpi-value">${cash}</div></div>
    <div class="kpi"><div class="kpi-label">Burn Rate</div><div class="kpi-value">${burn}</div></div>
    <div class="kpi"><div class="kpi-label">Runway</div><div class="kpi-value">${run}</div></div>
  </div>

  <div class="section perf">
    <div class="section-header"><span class="section-icon">📈</span><h2>Performance</h2></div>
    <div class="section-body">${perf}</div>
  </div>

  <div class="section cash">
    <div class="section-header"><span class="section-icon">💰</span><h2>Cash & Liquidity</h2></div>
    <div class="section-body">${cashNote}</div>
  </div>

  <div class="section risks">
    <div class="section-header"><span class="section-icon">⚠️</span><h2>Key Risks</h2></div>
    <div class="section-body">${risks}</div>
  </div>

  <div class="section opps">
    <div class="section-header"><span class="section-icon">🚀</span><h2>Opportunities</h2></div>
    <div class="section-body">${opps}</div>
  </div>

  <div class="section next">
    <div class="section-header"><span class="section-icon">✅</span><h2>Next Steps</h2></div>
    <div class="section-body">${nextSteps}</div>
  </div>

  ${garimaNote ? `
  <div class="garima-note">
    <div class="garima-label">CA's Note — ${month}</div>
    <div class="garima-text">${garimaNote}</div>
  </div>` : ""}

  <div class="disclaimer">
    This executive summary is prepared by Garima Agarwal (CA Membership: 160944) based on management information provided by the client. It is for internal management and board use only and does not constitute audited financial statements.
  </div>

  <div class="footer">
    <span>Garima Agarwal | CA Membership: 160944 | IBBI/RV/14/2022/15038 | agrgarima@gmail.com</span>
    <span>Finzzup | Build. Value. Scale.</span>
  </div>
</div>
</body>
</html>`;
}


// ─── LIVE MARKET DATA HOOK ────────────────────────────────────────────────────
function useMarketData() {
  const [market, setMarket] = React.useState({
    repo:      null,   // RBI repo rate
    usd:       null,   // INR per USD
    sar:       null,   // INR per SAR
    aed:       null,   // INR per AED
    nifty:     null,   // Nifty 50
    niftyChg:  null,   // Nifty % change
    loaded:    false,
    error:     false,
    updatedAt: null,
  });

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1. Forex rates (frankfurter.app — free, no key)
        const fxRes  = await fetch("https://api.frankfurter.app/latest?from=INR");
        const fxData = await fxRes.json();
        const rates  = fxData?.rates || {};
        // frankfurter gives INR→X so invert for X→INR
        const usdInr = rates.USD ? (1 / rates.USD).toFixed(2) : null;
        const sarInr = rates.SAR ? (1 / rates.SAR).toFixed(2) : null;
        const aedInr = rates.AED ? (1 / rates.AED).toFixed(2) : null;

        // 2. Nifty 50 via Yahoo Finance (no key needed)
        let nifty = null, niftyChg = null;
        try {
          const nRes = await fetch(
            "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=2d",
            { headers: { "Accept": "application/json" } }
          );
          const nData = await nRes.json();
          const closes = nData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          if (closes.length >= 2) {
            const last = closes[closes.length - 1];
            const prev = closes[closes.length - 2];
            nifty    = last  ? last.toFixed(0) : null;
            niftyChg = (last && prev) ? (((last - prev) / prev) * 100).toFixed(2) : null;
          }
        } catch(e) { /* Yahoo sometimes blocks — non-critical */ }

        // 3. RBI Repo rate — hardcoded current value, update monthly
        // RBI API has CORS issues so we use a known current value
        // As of Feb 2026: 6.50% (RBI held in Feb 2026 MPC meeting)
        const repoRate = "6.50%";

        setMarket({
          repo:      repoRate,
          usd:       usdInr   ? `₹${usdInr}` : null,
          sar:       sarInr   ? `₹${sarInr}` : null,
          aed:       aedInr   ? `₹${aedInr}` : null,
          nifty:     nifty    ? Number(nifty).toLocaleString("en-IN") : null,
          niftyChg:  niftyChg,
          loaded:    true,
          error:     false,
          updatedAt: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
        });
      } catch(e) {
        setMarket(m => ({...m, loaded:true, error:true}));
      }
    };

    fetchAll();
    // Refresh every 15 minutes
    const interval = setInterval(fetchAll, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return market;
}

// ─── MARKET DATA WIDGET ───────────────────────────────────────────────────────
function MarketWidget({ pack, client }) {
  const m = useMarketData();
  const isCrossBorder = client?.country === "SA" || client?.country === "UAE"
    || client?.company?.toLowerCase().includes("gulf")
    || client?.company?.toLowerCase().includes("saudi");

  if (!m.loaded) return null;
  if (m.error)   return null;

  const isCorp  = pack === "corporate";
  const isMSME  = pack === "msme";

  const items = [
    m.repo     && { label:"RBI Repo Rate",  value:m.repo,     color:C.blue,
                    note:"SBI lending = Repo + 2–3%",          icon:"🏦" },
    m.nifty    && { label:"Nifty 50",       value:m.nifty,
                    color: m.niftyChg >= 0 ? C.green : C.red,
                    note: m.niftyChg ? `${m.niftyChg >= 0 ? "▲" : "▼"} ${Math.abs(m.niftyChg)}% today` : "Today",
                    icon:"📈" },
    (isCrossBorder || true) && m.usd && { label:"USD / INR", value:m.usd, color:C.purple,
                    note:"Live rate",                           icon:"💱" },
    (isCrossBorder) && m.sar && { label:"SAR / INR", value:m.sar, color:C.teal,
                    note:"Saudi Riyal",                         icon:"🇸🇦" },
    (isCrossBorder) && m.aed && { label:"AED / INR", value:m.aed, color:C.amber,
                    note:"UAE Dirham",                          icon:"🇦🇪" },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:10 }}>
        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
          textTransform:"uppercase", letterSpacing:"0.08em" }}>
          {"Market Pulse"}
        </div>
        {m.updatedAt && (
          <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>
            {"Live · updated "}{m.updatedAt}
          </div>
        )}
      </div>
      <div style={{ display:"grid", gap:10,
        gridTemplateColumns:`repeat(${Math.min(items.length, 4)}, 1fr)` }}
        className="mkt-grid">
        {items.map((item, i) => (
          <div key={i} style={{ padding:"12px 14px", borderRadius:12,
            background:`${item.color}08`, border:`1px solid ${item.color}18` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <span style={{ fontSize:14 }}>{item.icon}</span>
              <span style={{ fontFamily:F, fontSize:10, color:C.muted, fontWeight:600,
                textTransform:"uppercase", letterSpacing:"0.05em" }}>{item.label}</span>
            </div>
            <div style={{ fontFamily:FM, fontSize:18, fontWeight:800, color:item.color }}>
              {item.value}
            </div>
            <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:3 }}>
              {item.note}
            </div>
          </div>
        ))}
        <style>{`.mkt-grid{grid-template-columns:repeat(${Math.min(items.length,4)},1fr)!important}@media(max-width:600px){.mkt-grid{grid-template-columns:1fr 1fr!important}}`}</style>
      </div>
    </div>
  );
}


// ─── MARKET INTELLIGENCE PAGE ─────────────────────────────────────────────────
function MarketIntel({ client }) {
  const pack  = client?.client_pack || client?.clientPack || "startup";
  const m     = useMarketData();
  const [aiInsight, setAiInsight] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);

  // Sector benchmarks — hardcoded industry medians (updated quarterly)
  const sectorData = {
    startup: [
      { sector:"SaaS / B2B Tech",      grossMargin:"65–75%", ebitdaMargin:"15–25%", arr:"₹3–10 Cr (Series A)", burnMultiple:"<1.5x", cac:"₹8–15K", ltv:"₹60–120K" },
      { sector:"D2C / Consumer",        grossMargin:"40–55%", ebitdaMargin:"5–12%",  arr:"₹5–20 Cr",            burnMultiple:"<2x",   cac:"₹500–2K",ltv:"₹5–15K"   },
      { sector:"Fintech",               grossMargin:"55–70%", ebitdaMargin:"10–20%", arr:"₹2–8 Cr",             burnMultiple:"<1.8x", cac:"₹2–8K",  ltv:"₹20–60K"  },
      { sector:"Edtech / SaaS",         grossMargin:"60–72%", ebitdaMargin:"8–18%",  arr:"₹1–6 Cr",             burnMultiple:"<2x",   cac:"₹3–10K", ltv:"₹15–50K"  },
    ],
    msme: [
      { sector:"Manufacturing",         grossMargin:"22–35%", ebitdaMargin:"8–14%",  debtorDays:"35–50",        currentRatio:">1.3x", creditDays:"30–45" },
      { sector:"Trading / Distribution",grossMargin:"12–22%", ebitdaMargin:"3–7%",   debtorDays:"25–40",        currentRatio:">1.2x", creditDays:"20–35" },
      { sector:"Services / Consulting", grossMargin:"40–60%", ebitdaMargin:"12–22%", debtorDays:"20–35",        currentRatio:">1.5x", creditDays:"15–25" },
      { sector:"FMCG / Food",           grossMargin:"28–42%", ebitdaMargin:"6–12%",  debtorDays:"15–30",        currentRatio:">1.4x", creditDays:"25–40" },
    ],
    corporate: [
      { sector:"Listed Manufacturing",  grossMargin:"30–42%", ebitdaMargin:"12–18%", roce:"15–22%",  pe:"18–28x",  evEbitda:"10–14x" },
      { sector:"Listed IT Services",    grossMargin:"28–36%", ebitdaMargin:"18–26%", roce:"25–40%",  pe:"25–40x",  evEbitda:"15–22x" },
      { sector:"Listed FMCG",           grossMargin:"42–58%", ebitdaMargin:"18–28%", roce:"35–55%",  pe:"40–65x",  evEbitda:"28–40x" },
      { sector:"Listed Pharma",         grossMargin:"55–68%", ebitdaMargin:"20–30%", roce:"18–28%",  pe:"22–35x",  evEbitda:"14–20x" },
    ],
  };

  // Funding / market context by pack
  const fundingContext = {
    startup: [
      { label:"Pre-Seed typical",   value:"₹50L – ₹2 Cr",     note:"Idea/MVP stage, friends & angels" },
      { label:"Seed typical",       value:"₹2 – ₹8 Cr",       note:"Early traction, 6-12 months runway" },
      { label:"Series A typical",   value:"₹15 – ₹60 Cr",     note:"₹3–10 Cr ARR, 18+ months runway" },
      { label:"Series A multiple",  value:"5–8x ARR",          note:"2024–25 India market median" },
      { label:"Investor IRR target",value:"25–35%",            note:"Indian VC benchmark" },
      { label:"Time seed → Series A","value":"18–30 months",   note:"India median" },
    ],
    msme: [
      { label:"CGTMSE limit",        value:"₹5 Cr",    note:"Collateral-free, govt guaranteed" },
      { label:"PSB 59-min loan",     value:"Up to ₹5 Cr", note:"GST-linked fast approval" },
      { label:"SIDBI direct",        value:"Up to ₹25 Cr",note:"3+ year track record needed" },
      { label:"Bank WC OD rate",     value:"Repo + 3–4%", note:"Against debtors / stock" },
      { label:"MSME NPL rate",       value:"~6.5%",     note:"RBI data — sector risk indicator" },
      { label:"Udyam registrations", value:"4.5 Cr+",   note:"Active MSMEs in India (2025)" },
    ],
    corporate: [
      { label:"Mainboard IPO min",   value:"₹100 Cr revenue", note:"SEBI general requirement" },
      { label:"SME IPO min",         value:"₹10 Cr revenue",  note:"More accessible route" },
      { label:"Nifty 500 avg PE",    value:"28–32x",          note:"Feb 2026 median" },
      { label:"IPO avg listing gain",value:"18–25%",          note:"FY25 India average" },
      { label:"D/E comfort (banks)", value:"<2.0x",           note:"For corporate lending" },
      { label:"ICRA rating threshold","value":"BBB–",         note:"Minimum for bond issuance" },
    ],
  };

  const sectors = sectorData[pack]   || sectorData.startup;
  const funding  = fundingContext[pack] || fundingContext.startup;
  const benchmarkHeaders = pack === "startup"
    ? ["Sector","Gross Margin","EBITDA Margin","Series A ARR","Burn Multiple","CAC","LTV"]
    : pack === "msme"
    ? ["Sector","Gross Margin","EBITDA Margin","Debtor Days","Current Ratio","Creditor Days"]
    : ["Sector","Gross Margin","EBITDA Margin","ROCE","P/E","EV/EBITDA"];

  const benchmarkKeys = pack === "startup"
    ? ["sector","grossMargin","ebitdaMargin","arr","burnMultiple","cac","ltv"]
    : pack === "msme"
    ? ["sector","grossMargin","ebitdaMargin","debtorDays","currentRatio","creditDays"]
    : ["sector","grossMargin","ebitdaMargin","roce","pe","evEbitda"];

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:20, color:C.text, marginBottom:4 }}>
            {"Market Intelligence"}
          </div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>
            {pack === "startup" ? "Funding benchmarks, sector multiples and investor expectations"
            : pack === "msme"   ? "MSME lending landscape, sector benchmarks and working capital norms"
            : "Listed company benchmarks, IPO market conditions and corporate finance norms"}
          </div>
        </div>
        <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>
          {"Benchmarks updated Q1 2026"}
        </div>
      </div>

      {/* Live rates strip */}
      {m.loaded && !m.error && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12,
          marginBottom:24 }} className="mkt-live">
          {[
            m.repo  && { label:"RBI Repo Rate", value:m.repo,
              sub:`SBI lending ~${(parseFloat(m.repo)+2.5).toFixed(2)}%`, color:C.blue,  icon:"🏦" },
            m.nifty && { label:"Nifty 50",      value:m.nifty,
              sub: m.niftyChg ? `${parseFloat(m.niftyChg)>=0?"▲":"▼"} ${Math.abs(m.niftyChg)}% today` : "Live",
              color:parseFloat(m.niftyChg)>=0?C.green:C.red, icon:"📈" },
            m.usd   && { label:"USD / INR",      value:m.usd,   sub:"Live rate", color:C.purple,icon:"💱" },
            m.sar   && { label:"SAR / INR",       value:m.sar,   sub:"Saudi Riyal",color:C.teal, icon:"🇸🇦" },
          ].filter(Boolean).map((item,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:12,
              background:`${item.color}08`, border:`1px solid ${item.color}18` }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                <span>{item.icon}</span>
                <span style={{ fontFamily:F, fontSize:10, color:C.muted, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.05em" }}>{item.label}</span>
              </div>
              <div style={{ fontFamily:FM, fontSize:20, fontWeight:800, color:item.color }}>{item.value}</div>
              <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:3 }}>{item.sub}</div>
            </div>
          ))}
          {m.updatedAt && (
            <div style={{ gridColumn:"1/-1", fontFamily:F, fontSize:10, color:C.dim,
              textAlign:"right" }}>{"Live · updated "}{m.updatedAt}</div>
          )}
          <style>{`.mkt-live{grid-template-columns:1fr 1fr 1fr 1fr!important}@media(max-width:600px){.mkt-live{grid-template-columns:1fr 1fr!important}}`}</style>
        </div>
      )}

      {/* Sector Benchmarks table */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          {pack === "startup" ? "Startup Sector Benchmarks"
          : pack === "msme"   ? "MSME Sector Benchmarks"
          : "Listed Company Benchmarks"}
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>
          {"Use these to position your client vs sector — include in board reports and investor decks"}
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
            <thead>
              <tr style={{ background:C.navy }}>
                {benchmarkHeaders.map((h,i) => (
                  <th key={i} style={{ padding:"9px 12px", textAlign:i===0?"left":"right",
                    color:"white", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectors.map((row,i) => (
                <tr key={i} style={{ background:i%2===0?C.bg2:C.bg }}>
                  {benchmarkKeys.map((key,j) => (
                    <td key={j} style={{ padding:"9px 12px",
                      textAlign:j===0?"left":"right",
                      fontWeight:j===0?700:400,
                      fontSize:12, color:j===0?C.text:C.blue,
                      borderBottom:`1px solid ${C.border}`,
                      whiteSpace:"nowrap" }}>
                      {row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Funding / Market Context */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          {pack === "startup" ? "Funding Climate — India 2025–26"
          : pack === "msme"   ? "MSME Lending Landscape"
          : "Capital Markets Context"}
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>
          {"Context for advising your client on timing and positioning"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }} className="inv-grid">
          {funding.map((item,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:12,
              background:C.bg2, border:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600,
                marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                {item.label}
              </div>
              <div style={{ fontFamily:FM, fontSize:18, fontWeight:800, color:C.blue }}>
                {item.value}
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:3 }}>
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance Calendar */}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          {"Upcoming Compliance Deadlines"}
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>
          {"Key dates this quarter — relevant for all your clients"}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            { date:"7 Apr",  item:"TDS Payment — March deductions",         priority:"high"   },
            { date:"10 Apr", item:"ESI Contribution — March",                priority:"medium" },
            { date:"15 Apr", item:"Advance Tax — 1st Instalment FY26-27",   priority:"high"   },
            { date:"30 Apr", item:"TDS Returns Q4 (Form 24Q / 26Q)",        priority:"high"   },
            { date:"30 Apr", item:"Annual Return — Companies Act (MGT-7)",  priority:"medium" },
            { date:"31 May", item:"GSTR-9 Annual Return FY25-26",           priority:"medium" },
            { date:"30 Jun", item:"AGM — 6 months from year end",           priority:"medium" },
            { date:"30 Sep", item:"Director KYC (DIR-3 KYC)",               priority:"low"    },
          ].map((item,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 14px", borderRadius:10,
              background: item.priority==="high" ? `${C.red}06` : item.priority==="medium" ? `${C.amber}06` : C.bg2,
              border:`1px solid ${item.priority==="high"?C.red+"20":item.priority==="medium"?C.amber+"20":C.border}` }}>
              <div style={{ width:52, fontFamily:FM, fontSize:12, fontWeight:700,
                color: item.priority==="high"?C.red:item.priority==="medium"?C.amber:C.muted,
                flexShrink:0 }}>{item.date}</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.text, flex:1 }}>{item.item}</div>
              <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                color: item.priority==="high"?C.red:item.priority==="medium"?C.amber:C.green,
                background: item.priority==="high"?`${C.red}12`:item.priority==="medium"?`${C.amber}12`:`${C.green}12`,
                padding:"3px 10px", borderRadius:100, flexShrink:0 }}>
                {item.priority==="high"?"Critical":item.priority==="medium"?"Important":"Routine"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── CASH FLOW PDF ────────────────────────────────────────────────────────────
function generateCashPDF({ client, reportData, kpis }) {
  const company  = client?.company || "Your Company";
  const month    = reportData?.monthLabel || "Current Period";
  const pack     = client?.client_pack || client?.clientPack || "startup";
  const note     = reportData?.cashflowNote || reportData?.packNote || "";
  const pl       = reportData?.plInputs || {};
  const isMSME   = pack === "msme";
  const isCorp   = pack === "corporate";
  const packLabel = isMSME ? "MSME Pack" : isCorp ? "Board Pack" : "CFO Pack";

  // KPIs
  const cashKpi    = kpis?.find(k=>k.label?.toLowerCase().includes("cash"))?.value    || pl.closingCash || "—";
  const burnKpi    = kpis?.find(k=>k.label?.toLowerCase().includes("burn"))?.value    || "—";
  const runwayKpi  = kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value  || "—";
  const revenueKpi = kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value     || pl.revenue || "—";
  const marginKpi  = kpis?.find(k=>k.label?.toLowerCase().includes("margin"))?.value  || pl.gpMargin || "—";
  const ebitda     = pl.ebitda     || "—";
  const pat        = pl.pat        || "—";
  const cogs       = pl.cogs       || "—";
  const grossProfit= pl.grossProfit|| "—";

  // Cash movement — startup style
  const cashMoves = [
    { label:"Opening Balance",          value: pl.openingCash  || "—", type:"neutral" },
    { label:"+ Collections Received",   value: pl.collections  || "—", type:"in"      },
    { label:"− Payroll & Benefits",     value: pl.payroll      || "—", type:"out"     },
    { label:"− Vendor Payments",        value: pl.vendorPay    || "—", type:"out"     },
    { label:"− Tax Payments",           value: pl.taxPay       || "—", type:"out"     },
    { label:"− Other Operating Costs",  value: pl.otherOpex    || "—", type:"out"     },
    { label:"Closing Cash Balance",     value: pl.closingCash  || cashKpi || "—", type:"neutral" },
  ];

  // Working capital — MSME / Corporate
  const wcItems = [
    { label:"Trade Debtors (AR)",   value: reportData?.debtors      || "—", days: reportData?.debtorDays  || "—", note:"Collections outstanding" },
    { label:"Trade Creditors (AP)", value: reportData?.creditors     || "—", days: reportData?.creditorDays|| "—", note:"Payables to suppliers" },
    { label:"Inventory",            value: reportData?.inventory     || "—", days: reportData?.inventoryDays|| "—", note:"Stock on hand" },
    { label:"Working Capital",      value: reportData?.workingCapital|| "—", days: "—",                            note:"Current Assets − Current Liabilities" },
  ];

  // Indirect cash flow — Corporate
  const indirectCF = [
    { label:"EBITDA",                    value: ebitda,                           bold:true  },
    { label:"− Interest Paid",           value: pl.interestPaid    || "—",        bold:false },
    { label:"− Tax Paid",                value: pl.taxPaid         || "—",        bold:false },
    { label:"± Working Capital Changes", value: pl.wcChanges       || "—",        bold:false },
    { label:"= Operating Cash Flow",     value: reportData?.operatingCF || "—",   bold:true  },
    { label:"− Capex",                   value: pl.capex           || "—",        bold:false },
    { label:"+ Asset Disposal",          value: pl.assetDisposal   || "—",        bold:false },
    { label:"= Free Cash Flow",          value: reportData?.freeCF || "—",        bold:true  },
  ];

  // Key ratios from reportData
  const ratios = [
    { label:"Current Ratio",          value: reportData?.currentRatio     || "—", benchmark:">2.0x" },
    { label:"Cash Conversion Cycle",  value: reportData?.ccc              || "—", benchmark:"<30 days" },
    { label:"Debtor Days",            value: reportData?.debtorDays       || "—", benchmark:"<30 days" },
    { label:"Creditor Days",          value: reportData?.creditorDays     || "—", benchmark:">45 days" },
    { label:"DSCR",                   value: reportData?.dscr             || "—", benchmark:">1.25x" },
    { label:"Interest Coverage",      value: reportData?.interestCoverage || "—", benchmark:">3.0x" },
    { label:"Debt / EBITDA",          value: reportData?.debtEbitda       || "—", benchmark:"<3.0x" },
    { label:"Working Capital",        value: reportData?.workingCapital   || "—", benchmark:"Positive" },
  ].filter(r => r.value !== "—");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:13px; }
  .page { max-width:800px; margin:0 auto; padding:48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:18px; border-bottom:2px solid #3B6FF7; }
  .logo { font-size:24px; font-weight:900; color:#3B6FF7; letter-spacing:-0.02em; }
  .tagline { font-size:9px; color:#9CA3AF; letter-spacing:0.1em; text-transform:uppercase; margin-top:2px; }
  .doc-meta { text-align:right; font-size:11px; color:#6B7280; line-height:1.7; }
  .doc-meta strong { color:#111827; font-size:13px; display:block; }
  h1 { font-size:24px; font-weight:900; color:#111827; margin-bottom:4px; }
  .subtitle { font-size:12px; color:#6B7280; margin-bottom:24px; }
  .eyebrow { font-size:10px; font-weight:700; color:#3B6FF7; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; }
  h2 { font-size:13px; font-weight:800; color:#111827; margin:0 0 12px; padding-bottom:7px; border-bottom:1px solid #F3F4F6; text-transform:uppercase; letter-spacing:0.05em; }
  .section { margin-bottom:24px; }
  .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-bottom:24px; }
  .kpi-card { padding:12px; border-radius:8px; background:#F9FAFB; border:1px solid #E5E7EB; text-align:center; }
  .kpi-label { font-size:9px; color:#6B7280; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px; }
  .kpi-value { font-size:18px; font-weight:900; color:#111827; }
  .kpi-sub { font-size:9px; color:#6B7280; margin-top:3px; }
  table { width:100%; border-collapse:collapse; margin-bottom:4px; }
  th { background:#F9FAFB; padding:8px 10px; text-align:left; font-size:9px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #E5E7EB; }
  td { padding:9px 10px; border-bottom:1px solid #F3F4F6; font-size:12px; vertical-align:middle; }
  .bold-row td { font-weight:800; background:#F0F4FF; }
  .in-val  { color:#059669; font-weight:700; text-align:right; }
  .out-val { color:#DC2626; font-weight:700; text-align:right; }
  .neu-val { color:#111827; font-weight:800; text-align:right; }
  .right   { text-align:right; }
  .dim     { color:#6B7280; font-size:11px; }
  .note-box { padding:14px 16px; background:#EEF3FE; border-radius:8px; border-left:3px solid #3B6FF7; margin-bottom:24px; }
  .note-label { font-size:9px; font-weight:700; color:#3B6FF7; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
  .note-text { font-size:12px; color:#111827; line-height:1.8; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .disclaimer { margin-top:24px; padding:10px 12px; background:#F9FAFB; border-radius:6px; font-size:10px; color:#6B7280; line-height:1.6; border:1px solid #E5E7EB; }
  .footer { margin-top:16px; padding-top:14px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div><div class="logo">Finzzup</div><div class="tagline">Build. Value. Scale.</div></div>
    <div class="doc-meta">
      <strong>Cash Flow Report</strong>
      ${company} | ${packLabel}<br/>
      Period: ${month}<br/>
      ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}
    </div>
  </div>

  <div class="eyebrow">Confidential | Prepared by Garima Agarwal CA | Membership 160944</div>
  <h1>${company}</h1>
  <div class="subtitle">Cash Flow Statement, Working Capital & Liquidity Analysis — ${month}</div>

  <!-- KPI SUMMARY -->
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Cash Balance</div><div class="kpi-value">${cashKpi}</div><div class="kpi-sub">End of period</div></div>
    <div class="kpi-card"><div class="kpi-label">Revenue</div><div class="kpi-value">${revenueKpi}</div><div class="kpi-sub">This period</div></div>
    <div class="kpi-card"><div class="kpi-label">EBITDA</div><div class="kpi-value">${ebitda}</div><div class="kpi-sub">Operating profit</div></div>
    ${isMSME || isCorp
      ? `<div class="kpi-card"><div class="kpi-label">Working Capital</div><div class="kpi-value">${reportData?.workingCapital || "—"}</div><div class="kpi-sub">Current assets − liabilities</div></div>`
      : `<div class="kpi-card"><div class="kpi-label">Runway</div><div class="kpi-value">${runwayKpi}</div><div class="kpi-sub">At current burn</div></div>`
    }
  </div>

  <!-- P&L SUMMARY -->
  <div class="section">
    <h2>P&L Summary — ${month}</h2>
    <table>
      <thead><tr><th>Line Item</th><th class="right">Amount</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Revenue</td><td class="neu-val">${revenueKpi}</td><td class="dim">Gross receipts this period</td></tr>
        <tr><td>Cost of Goods Sold</td><td class="out-val">${cogs}</td><td class="dim">Direct costs</td></tr>
        <tr class="bold-row"><td>Gross Profit</td><td class="right">${grossProfit}</td><td class="dim">Margin: ${marginKpi}</td></tr>
        <tr class="bold-row"><td>EBITDA</td><td class="right">${ebitda}</td><td class="dim">Earnings before interest, tax, depreciation</td></tr>
        <tr><td>PAT (Net Profit after Tax)</td><td class="in-val">${pat}</td><td class="dim">Bottom line</td></tr>
      </tbody>
    </table>
  </div>

  <!-- CASH MOVEMENT -->
  <div class="section">
    <h2>Cash Movement — ${month}</h2>
    <table>
      <thead><tr><th>Item</th><th class="right">Amount</th></tr></thead>
      <tbody>
        ${cashMoves.map(r => `
        <tr ${r.type==="neutral"?"class=\"bold-row\"":""}>
          <td>${r.label}</td>
          <td class="${r.type==="in"?"in-val":r.type==="out"?"out-val":"neu-val"}">${r.value}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>

  ${isCorp ? `
  <!-- INDIRECT CASH FLOW -->
  <div class="section">
    <h2>Indirect Cash Flow Statement</h2>
    <table>
      <thead><tr><th>Item</th><th class="right">Amount</th></tr></thead>
      <tbody>
        ${indirectCF.map(r => `
        <tr ${r.bold?"class=\"bold-row\"":""}>
          <td>${r.label}</td>
          <td class="${r.bold?"neu-val":"right"}">${r.value}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- WORKING CAPITAL -->
  <div class="section">
    <h2>Working Capital Analysis</h2>
    <table>
      <thead><tr><th>Component</th><th class="right">Value</th><th class="right">Days</th><th>Notes</th></tr></thead>
      <tbody>
        ${wcItems.map(r => `
        <tr>
          <td>${r.label}</td>
          <td class="neu-val">${r.value}</td>
          <td class="right dim">${r.days}</td>
          <td class="dim">${r.note}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>

  ${ratios.length > 0 ? `
  <!-- KEY RATIOS -->
  <div class="section">
    <h2>Key Liquidity & Debt Ratios</h2>
    <table>
      <thead><tr><th>Ratio</th><th class="right">Value</th><th>Benchmark</th></tr></thead>
      <tbody>
        ${ratios.map(r => `
        <tr>
          <td>${r.label}</td>
          <td class="neu-val">${r.value}</td>
          <td class="dim">${r.benchmark}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${note ? `
  <div class="note-box">
    <div class="note-label">CA's Cash Flow Analysis — ${month}</div>
    <div class="note-text">${note}</div>
  </div>` : ""}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This cash flow report is prepared based on information provided by the client and is for management and banking purposes. It does not constitute a statutory financial statement. Figures are subject to audit adjustments. For statutory reporting, refer to audited financials.
  </div>

  <div class="footer">
    <span>Garima Agarwal | CA Membership: 160944 | IBBI/RV/14/2022/15038 | agrgarima@gmail.com</span>
    <span>Finzzup | ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</span>
  </div>

</div>
</body>
</html>`;
}


// ─── KPI BENCHMARKS ───────────────────────────────────────────────────────────
// Returns benchmark text for a KPI. reportData overrides take precedence.
function kpiBenchmark(label, pack, reportData) {
  const l = (label || "").toLowerCase();
  const overrides = {
    revenue:      reportData?.benchRevenue,
    margin:       reportData?.benchMargin,
    cash:         reportData?.benchCash,
    burn:         reportData?.benchBurn,
    runway:       reportData?.benchRunway,
    arr:          reportData?.benchArr,
    ebitda:       reportData?.benchEbitda,
    debtor:       reportData?.benchDebtorDays,
    working:      reportData?.benchWorkingCapital,
  };
  // Check overrides first
  for (const [key, val] of Object.entries(overrides)) {
    if (l.includes(key) && val) return `Target: ${val}`;
  }
  // Default benchmarks by pack + label
  if (pack === "startup") {
    if (l.includes("revenue"))    return "Series A threshold: ₹10 Cr ARR";
    if (l.includes("margin"))     return "Series A benchmark: 45%+ gross margin";
    if (l.includes("burn"))       return "Efficient: <₹40L/mo net burn";
    if (l.includes("runway"))     return "Fundraise trigger: <9 months";
    if (l.includes("cash"))       return "Maintain 9–12 months runway";
    if (l.includes("arr"))        return "Series A: ₹3–10 Cr ARR";
  }
  if (pack === "msme") {
    if (l.includes("revenue"))    return "Sector avg: ₹60–90L/mo";
    if (l.includes("margin"))     return "MSME avg: 22–28% gross margin";
    if (l.includes("cash"))       return "Target: 45–60 days operating expenses";
    if (l.includes("debtor"))     return "Target: <30 debtor days";
    if (l.includes("working"))    return "Current ratio target: >1.5x";
  }
  if (pack === "corporate") {
    if (l.includes("revenue"))    return "Board target: ₹100 Cr run rate";
    if (l.includes("ebitda"))     return "Sector avg: 15–18% EBITDA margin";
    if (l.includes("margin"))     return "Industry benchmark: 35%+ gross margin";
    if (l.includes("cash"))       return "Target: 60 days operating expenses";
  }
  return null;
}


// ─── LOAN READINESS PDF ───────────────────────────────────────────────────────
function generateLoanPDF({ client, reportData, kpis }) {
  const score    = reportData?.loanScore || 64;
  const month    = reportData?.monthLabel || "Current Period";
  const company  = client?.company || "Your Company";
  const existing = reportData?.existingDebt || "Nil";
  const interest = reportData?.interestCost || "Nil";
  const sought   = reportData?.loanAmountSought || "Not specified";
  const purpose  = reportData?.loanPurpose || "Not specified";
  const loanNote = reportData?.loanNote || "";
  const improvements = (reportData?.loanImprovements || []).filter(x=>x);
  const ratios = [
    { label:"Current Ratio",     value:reportData?.currentRatio,     benchmark:"Target >2.0x",  good:parseFloat(reportData?.currentRatio)>=2 },
    { label:"DSCR",              value:reportData?.dscr,             benchmark:"Target >1.25x", good:parseFloat(reportData?.dscr)>=1.25 },
    { label:"Interest Coverage", value:reportData?.interestCoverage, benchmark:"Target >3.0x",  good:parseFloat(reportData?.interestCoverage)>=3 },
    { label:"Debt / EBITDA",     value:reportData?.debtEbitda,       benchmark:"Target <3.0x",  good:parseFloat(reportData?.debtEbitda)<=3 },
  ].filter(r=>r.value);
  const revKpi    = kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value || reportData?.plInputs?.revenue || "—";
  const marginKpi = kpis?.find(k=>k.label?.toLowerCase().includes("margin"))?.value || reportData?.plInputs?.gpMargin || "—";
  const cashKpi   = kpis?.find(k=>k.label?.toLowerCase().includes("cash"))?.value || "—";
  const runwayKpi = kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value || "—";
  const ebitda    = reportData?.plInputs?.ebitda || "—";
  const pat       = reportData?.plInputs?.pat || "—";
  const schemes = [    { name:"SBI Startup Branch",       amount:"Up to Rs.50 Cr", rate:"Repo+2%",    recommended:true  },
    { name:"SIDBI SPEED+",             amount:"Up to Rs.25 Cr", rate:"9.5-11%",   recommended:false },
    { name:"CGTMSE (Collateral-free)", amount:"Up to Rs.5 Cr",  rate:"Market rate",recommended:true  },
    { name:"Mudra Tarun / Kishor",     amount:"Up to Rs.10L",   rate:"10-12%",     recommended:false },
    { name:"NBFC / Fintech Debt",      amount:"Rs.25L-Rs.5 Cr", rate:"14-18%",    recommended:false },
  ];
  const docs = [
    { doc:"Last 2 years ITR (Company and Directors)",           done:true  },
    { doc:"Last 12 months Bank Statements",                     done:true  },
    { doc:"Audited Financials (P&L and Balance Sheet)",         done:true  },
    { doc:"GST Returns last 12 months",                         done:true  },
    { doc:"CA-certified Financial Projections (3 years)",       done:false },
    { doc:"Business Plan and Pitch Deck",                       done:false },
    { doc:"KYC — Directors and Company",                        done:true  },
    { doc:"MCA Filings and Incorporation Certificate",          done:true  },
    { doc:"Existing Loan and Liability Statement",              done:false },
    { doc:"CIBIL Credit Report (all directors)",                done:false },
  ];
  const readyCount = docs.filter(d=>d.done).length;
  const statusText = score >= 75 ? "Strong Profile — Eligible for Most Schemes"
    : score >= 55 ? "Moderate Profile — Eligible with Preparation"
    : "Early Stage — Build Track Record First";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; color: #111827; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px 48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:2px solid #5B4FDB; }
  .logo-text { font-size:26px; font-weight:900; color:#5B4FDB; letter-spacing:-0.02em; }
  .tagline { font-size:9px; color:#9CA3AF; letter-spacing:0.1em; text-transform:uppercase; margin-top:3px; }
  .doc-meta { text-align:right; font-size:11px; color:#6B7280; }
  .doc-meta strong { color:#111827; font-size:13px; display:block; margin-bottom:4px; }
  .title-block { margin-bottom:32px; }
  .eyebrow { font-size:11px; font-weight:700; color:#5B4FDB; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; }
  h1 { font-size:28px; font-weight:900; color:#111827; margin-bottom:6px; }
  .subtitle { font-size:14px; color:#6B7280; }
  .score-box { background:linear-gradient(135deg,#EEF2FF,#F5F3FF); border:1px solid #C7D2FE; border-radius:16px; padding:24px 28px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; }
  .score-num { font-size:56px; font-weight:900; color:#5B4FDB; line-height:1; }
  .score-label { font-size:11px; color:#6B7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
  .score-status { font-size:14px; font-weight:700; color:#111827; }
  .score-bar-wrap { flex:1; margin: 0 32px; }
  .score-bar-bg { height:12px; background:#E5E7EB; border-radius:6px; overflow:hidden; }
  .score-bar-fill { height:100%; background:linear-gradient(90deg,#5B4FDB,#7C3AED); border-radius:6px; width:${score}%; }
  h2 { font-size:16px; font-weight:800; color:#111827; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid #F3F4F6; }
  .section { margin-bottom:28px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#F9FAFB; padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #E5E7EB; }
  td { padding:11px 14px; border-bottom:1px solid #F3F4F6; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  .badge { display:inline-block; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:700; }
  .badge-rec { background:#EEF2FF; color:#5B4FDB; }
  .badge-done { background:#ECFDF5; color:#059669; }
  .badge-pending { background:#FEF3C7; color:#D97706; }
  .checklist-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; margin-bottom:6px; font-size:13px; }
  .done-row { background:#F0FDF4; border:1px solid #BBF7D0; color:#111827; }
  .pending-row { background:#FFFBEB; border:1px solid #FDE68A; color:#92400E; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF; }
  .disclaimer { margin-top:20px; padding:14px 16px; background:#F9FAFB; border-radius:8px; font-size:11px; color:#6B7280; line-height:1.6; border:1px solid #E5E7EB; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-text">Finzzup</div>
      <div class="tagline">Build. Value. Scale.</div>
    </div>
    <div class="doc-meta">
      <strong>Loan Readiness Report</strong>
      Prepared for: ${company}<br/>
      Period: ${month}<br/>
      Date: ${new Date().toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})}
    </div>
  </div>

  <div class="title-block">
    <div class="eyebrow">Confidential | Prepared by Garima Agarwal CA</div>
    <h1>${company}</h1>
    <div class="subtitle">Loan Readiness Assessment &amp; Scheme Eligibility Report</div>
  </div>
  ${loanNote ? `<div style="margin-bottom:24px;padding:16px 18px;background:#EEF2FF;border-radius:10px;border-left:3px solid #5B4FDB"><div style="font-size:10px;font-weight:700;color:#5B4FDB;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Garima's Assessment</div><p style="font-size:14px;color:#111827;line-height:1.7;margin:0">${loanNote}</p></div>` : ""}

  <div class="score-box">
    <div>
      <div class="score-label">Loan Eligibility Score</div>
      <div class="score-num">${score}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:4px;">out of 100</div>
    </div>
    <div class="score-bar-wrap">
      <div class="score-status" style="margin-bottom:12px;">${statusText}</div>
      <div class="score-bar-bg"><div class="score-bar-fill"></div></div>
      <div style="font-size:11px;color:#6B7280;margin-top:6px;">Documents ready: ${readyCount}/${docs.length}</div>
    </div>
  </div>

  <div class="section">
    <h2>Recommended Loan Schemes</h2>
    <table>
      <thead>
        <tr><th>Scheme</th><th>Loan Amount</th><th>Rate</th><th>Suitability</th></tr>
      </thead>
      <tbody>
        ${schemes.map(s => `
        <tr>
          <td><strong>${s.name}</strong>${s.recommended ? ' <span class="badge badge-rec">Recommended</span>' : ''}</td>
          <td>${s.amount}</td>
          <td>${s.rate}</td>
          <td>${s.recommended ? "High" : "Moderate"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Documents Checklist (${readyCount}/${docs.length} Ready)</h2>
    ${docs.map(d => `
    <div class="checklist-row ${d.done ? "done-row" : "pending-row"}">
      <span>${d.done ? "✅" : "⏳"}</span>
      <span>${d.doc}</span>
      <span class="badge ${d.done ? "badge-done" : "badge-pending"}" style="margin-left:auto;">${d.done ? "Ready" : "Pending"}</span>
    </div>`).join("")}
  </div>

  <div class="section">
    <h2>Financial Snapshot</h2>
    <table>
      <thead><tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Revenue</td><td><strong>${revKpi}</strong></td><td>Gross Margin</td><td><strong>${marginKpi}</strong></td></tr>
        <tr><td>EBITDA</td><td><strong>${ebitda}</strong></td><td>PAT</td><td><strong>${pat}</strong></td></tr>
        <tr><td>Cash Balance</td><td><strong>${cashKpi}</strong></td><td>Runway</td><td><strong>${runwayKpi}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Debt Position</h2>
    <table>
      <thead><tr><th>Item</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Existing Debt / Loans</td><td><strong>${existing}</strong></td></tr>
        <tr><td>Annual Interest Cost</td><td><strong>${interest}</strong></td></tr>
        <tr><td>Loan Amount Sought</td><td><strong>${sought}</strong></td></tr>
        <tr><td>Purpose of Loan</td><td><strong>${purpose}</strong></td></tr>
      </tbody>
    </table>
  </div>

  ${ratios.length > 0 ? `
  <div class="section">
    <h2>Key Financial Ratios</h2>
    <table>
      <thead><tr><th>Ratio</th><th>Value</th><th>Benchmark</th><th>Status</th></tr></thead>
      <tbody>
        ${ratios.map(r => `<tr><td>${r.label}</td><td><strong>${r.value}</strong></td><td style="color:#6B7280">${r.benchmark}</td><td><span class="badge ${r.good?"badge-done":"badge-pending"}">${r.good?"Within Range":"Needs Attention"}</span></td></tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${improvements.length > 0 ? `
  <div class="section">
    <h2>Recommended Improvements</h2>
    ${improvements.map((imp,i) => `
    <div class="checklist-row pending-row" style="margin-bottom:6px">
      <span style="font-weight:700;color:#2563EB;background:#EEF2FF;padding:2px 8px;border-radius:4px;font-size:11px">${i+1}</span>
      <span>${imp}</span>
    </div>`).join("")}
  </div>` : ""}

  <div class="section">
    <h2>Next Steps</h2>
    <table>
      <tbody>
        <tr><td style="width:28px;font-size:18px;">1</td><td><strong>Complete pending documents</strong> — ${docs.filter(d=>!d.done).length} documents still needed before applying</td></tr>
        <tr><td style="font-size:18px;">2</td><td><strong>Financial projections</strong> — CA-certified 3-year projections are required for most schemes</td></tr>
        <tr><td style="font-size:18px;">3</td><td><strong>Connect with lender</strong> — Garima has a direct connection with SBI Startup Branch and can facilitate introduction</td></tr>
        <tr><td style="font-size:18px;">4</td><td><strong>Submit application</strong> — Garima will prepare and review the complete package before submission</td></tr>
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This assessment is based on information provided by the client and is indicative in nature. Actual loan eligibility is subject to lender assessment, credit bureau checks, and applicable scheme criteria at the time of application. This report does not constitute a guarantee of loan approval.
  </div>

  <div class="footer">
    <span>Garima Agarwal | CA Membership: 160944 | IBBI/RV/14/2022/15038</span>
    <span>agrgarima@gmail.com | Finzzup</span>
  </div>
</div>
</body>
</html>`;
}

// ─── LIVE DOCS HOOK for Pack Content components ──────────────────────────────
function useLiveDocs(client) {
  const [liveDocs, setLiveDocs] = React.useState([]);
  const isDemo = client?.isDemo === true;
  React.useEffect(() => {
    if (isDemo || !client?.id) return;
    supabase.from("documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .then(({ data: docs }) => {
        if (docs?.length) {
          const packDocs = docs.filter(d =>
            ["garima", "Garima", "Garima Agarwal"].includes(d.uploaded_by) ||
            d.name?.toLowerCase().includes("pack") ||
            d.name?.toLowerCase().includes("report") ||
            d.name?.toLowerCase().includes("board")
          );
          setLiveDocs(packDocs.length > 0 ? packDocs : docs);
        }
      });
  }, [client?.id, isDemo]);

  const archiveDocs = liveDocs.length > 0
    ? liveDocs.map(d => ({
        name: d.name,
        date: d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—",
        size: d.file_size || "—",
        uploadedAt: d.created_at || "",
        file_url: d.file_url,
        new: d.created_at ? (new Date() - new Date(d.created_at)) < 35 * 24 * 60 * 60 * 1000 : false,
      }))
    : ARCHIVE;

  return archiveDocs;
}

function MSMEPackContent({ reportData, kpis, client }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly",  icon:"📊", label:"Monthly Report"    },
    { id:"variance", icon:"📉", label:"Variance Analysis" },
    { id:"cash",     icon:"💰", label:"Cash Health"       },
    { id:"workingcap",icon:"⚙️", label:"Working Capital"  },
    { id:"bankfin",  icon:"🏛️", label:"Bank Finance"      },
    { id:"packs",    icon:"📁", label:"Previous Packs"    },
  ];
  const data = CFO_PACK_DATA["msme"];
  const archiveDocs = useLiveDocs(client);

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 18px", borderRadius:100, border:"none", cursor:"pointer",
            fontFamily:F, fontSize:13, fontWeight:600, transition:"all 0.15s",
            background: tab===t.id ? C.teal : C.bg2,
            color: tab===t.id ? "white" : C.muted,
            outline: `1.5px solid ${tab===t.id ? C.teal : C.border}`,
            boxShadow: tab===t.id ? `0 4px 14px ${C.teal}35` : "none",
            touchAction:"manipulation",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === "monthly" && (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {(reportData?.reportNote || reportData?.packNote) && (
        <Card style={{ borderLeft:`3px solid ${C.teal}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>📝 Note from Garima</div>
          <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
            {reportData.reportNote || reportData.packNote}
          </p>
        </Card>
      )}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          P&L Summary{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : " — Current Month"}
        </div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>vs prior month</div>
        {(() => {
          const pl = reportData?.pl;
          const hasLive = pl && Object.values(pl).some(v => v?.actual);
          if (hasLive) {
            return [
              { key:"revenue",     label:"Revenue"           },
              { key:"cogs",        label:"Cost of Goods Sold"},
              { key:"grossProfit", label:"Gross Profit"      },
              { key:"ebitda",      label:"EBITDA"            },
              { key:"pat",         label:"Net Profit"        },
            ].filter(r => pl[r.key]?.actual).map((r,i) => (
              <StatRow key={i} label={r.label}
                value={pl[r.key].actual}
                sub={pl[r.key].prev ? `vs ${pl[r.key].prev} last month` : ""}
                trend="up"/>
            ));
          }
          return [
            { label:"Revenue",            value:"₹84.2L", pct:"6.1%",  trend:"up",   sub:"vs ₹79.4L last month" },
            { label:"Cost of Goods Sold", value:"₹49.7L", pct:"4.2%",  trend:"down", sub:"58.9% of revenue" },
            { label:"Gross Profit",       value:"₹34.5L", pct:"41.0%", trend:"up",   sub:"GP margin 41.0%" },
            { label:"Operating Expenses", value:"₹19.8L", pct:"3.1%",  trend:"down", sub:"23.5% of revenue" },
            { label:"EBITDA",             value:"₹14.7L", pct:"17.5%", trend:"up",   sub:"EBITDA margin 17.5%" },
            { label:"Net Profit",         value:"₹10.2L", pct:"12.1%", trend:"up",   sub:"Net margin 12.1%" },
          ].map((r,i) => <StatRow key={i} {...r}/>);
        })()}
      </Card>

      {reportData?.metrics?.some(m => m.value) && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Working Capital Analysis</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="wc-g">
            {reportData.metrics.filter(m => m.value).map((m,i) => (
              <div key={i} style={{ padding:"14px 10px", borderRadius:12, background:C.bg, border:`1px solid ${C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:C.teal }}>{m.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{m.label}</div>
                {m.sub && <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {kpis?.some(k => k.value && k.value !== "—") && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>KPI Snapshot</div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>Latest figures from Garima</div>
          {kpis.filter(k => k.value && k.value !== "—").map((k,i) => (
            <StatRow key={i} label={k.label} value={k.value}
              sub={k.prev && k.prev !== "—" ? `prev: ${k.prev}` : ""} trend={k.trend||"up"}/>
          ))}
        </Card>
      )}

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>📅 Compliance Due Date Calendar — March 2026</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {COMPLIANCE_DATES.map((c,i) => {
            const [col,bg] = c.status==="critical"?[C.red,"#FEF2F2"]:c.status==="due-soon"?[C.amber,"#FFFBEB"]:[C.blue,"#EEF3FE"];
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, background:bg, border:`1px solid ${col}22` }}>
                <div style={{ fontFamily:FM, fontSize:12, fontWeight:700, color:col, minWidth:52, whiteSpace:"nowrap" }}>{c.due}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{c.item}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:1 }}>Owner: {c.owner}</div>
                </div>
                {c.status==="critical" && <Badge color={C.red} bg="#FEF2F2">Critical</Badge>}
                {c.status==="due-soon" && <Badge color={C.amber} bg="#FFFBEB">Soon</Badge>}
              </div>
            );
          })}
        </div>
      </Card>


      <div>
        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Previous MSME Packs</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="MSME Pack"/>)}
        </div>
      </div>

        <style>{`.wc-g{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-g{grid-template-columns:1fr!important}}`}</style>
      </div>
      )}

      {tab === "variance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {reportData?.variance?.some(r => r.item && (r.budget || r.actual)) ? (<>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                MSME Variance Analysis{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
              </div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>Actuals vs Budget — updated by Garima</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.navy }}>
                      {["Item","Budget","Actual","Variance"].map((h,i) => (
                        <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.variance.filter(r => r.item).map((r,i) => (
                      <tr key={i} style={{ background:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:C.text }}>{r.item}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.budget||"—"}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, fontFamily:FM }}>{r.actual||"—"}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right" }}>
                          <span style={{ padding:"3px 8px", borderRadius:100, fontSize:10, fontWeight:700,
                            background:r.fav?`${C.green}15`:`${C.red}15`, color:r.fav?C.green:C.red }}>
                            {r.fav?"▲ Fav":"▼ Unfav"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {reportData?.varianceCommentary?.some(v => v.item) && (
              <Card style={{ borderLeft:`3px solid $C.teal` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:12 }}>📝 Commentary</div>
                {reportData.varianceCommentary.filter(v => v.item).map((v,i,arr) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ width:8, height:8, borderRadius:100, background:v.favorable?C.green:C.red, flexShrink:0, marginTop:6 }}/>
                    <div>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{v.item}</div>
                      {v.note && <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>{v.note}</div>}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>) : (
            <Card style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📉</div>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>Variance Analysis</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.dim }}>Garima will update this with your variance data.</div>
            </Card>
          )}
        </div>
      )}

      {tab === "cash" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <MSMECFOPack data={data} reportData={reportData}/>
          <div style={{ textAlign:"center" }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              💬 Discuss cash health with Garima
            </a>
          </div>
          {(reportData?.cashflowNote || reportData?.packNote) && (
            <Card style={{ borderLeft:`3px solid ${C.teal}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"📝 Garima's Cash Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData?.cashflowNote || reportData?.packNote}
              </p>
            </Card>
          )}
        </div>
      )}

            {tab === "workingcap" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:14,
            background:`linear-gradient(135deg,${C.teal}10,${C.blue}06)`,
            border:`1px solid ${C.teal}20` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Are we collecting fast enough and paying smart?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"Working capital efficiency determines how much cash is trapped in operations vs available to use. Every day saved in collections = real cash freed up."}
            </div>
          </div>

          {/* CCC Calculation — the key insight */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Cash Conversion Cycle"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>
              {"How many days your cash is tied up before you collect it back"}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {[
                { label:"Debtor Days", value: reportData?.debtorDays || "46", color:C.blue,  bad: parseInt(reportData?.debtorDays||"46") > 30 },
                { label:"−", value:null, color:C.muted },
                { label:"Creditor Days", value: reportData?.creditorDays || "31", color:C.purple, bad: false },
                { label:"+", value:null, color:C.muted },
                { label:"Inventory Days", value: reportData?.inventoryDays || "22", color:C.teal, bad: false },
                { label:"=", value:null, color:C.muted },
                { label:"CCC", value: reportData?.ccc || "37 days", color: parseInt(reportData?.ccc||"37")<=30?C.green:C.amber, bad: parseInt(reportData?.ccc||"37")>30 },
              ].map((item, i) => item.value === null ? (
                <div key={i} style={{ fontFamily:FM, fontSize:24, fontWeight:700, color:item.color }}>{item.label}</div>
              ) : (
                <div key={i} style={{ padding:"12px 16px", borderRadius:12, textAlign:"center",
                  background: item.bad ? `${C.amber}08` : `${item.color}08`,
                  border:`1px solid ${item.bad ? C.amber+"30" : item.color+"20"}` }}>
                  <div style={{ fontFamily:FM, fontSize:22, fontWeight:800, color:item.color }}>{item.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:3 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 14px", borderRadius:10,
              background: parseInt(reportData?.ccc||"37")<=30 ? `${C.green}08` : `${C.amber}08`,
              border:`1px solid ${parseInt(reportData?.ccc||"37")<=30 ? C.green+"20" : C.amber+"25"}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:600,
                color: parseInt(reportData?.ccc||"37")<=30 ? C.green : C.amber }}>
                {parseInt(reportData?.ccc||"37") <= 30
                  ? `✅ CCC at ${reportData?.ccc||"37 days"} — within target. Every additional day saved frees up approx. ${reportData?.cccCashImpact || "₹2.8L"} in working capital.`
                  : `⚠️ CCC at ${reportData?.ccc||"37 days"} — above 30-day target. Reducing debtor days by 5 would free up approx. ${reportData?.cccCashImpact || "₹2.8L"} in cash immediately.`}
              </div>
            </div>
          </Card>

          {/* AR Aging — the action card */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Debtors Aging — Who Owes What"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"Money already earned but not yet collected — this is your most urgent action"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { band:"0–30 days",   value: reportData?.ar0to30   || "₹18.2L", pct:"47%", color:C.green,  action:"On track — follow standard reminder cycle" },
                { band:"31–60 days",  value: reportData?.ar31to60  || "₹12.4L", pct:"32%", color:C.amber,  action:"Send formal reminder + confirm payment date" },
                { band:"61–90 days",  value: reportData?.ar61to90  || "₹4.8L",  pct:"13%", color:C.red,    action:"Escalate to senior contact — consider credit hold" },
                { band:"90+ days",    value: reportData?.ar90plus  || "₹2.9L",  pct:"8%",  color:C.red,    action:"Legal notice or write-off decision required" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                  borderRadius:10, background:C.bg2, border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:row.color, flexShrink:0 }}/>
                  <div style={{ width:90, fontFamily:F, fontSize:12, color:C.muted, fontWeight:600 }}>{row.band}</div>
                  <div style={{ fontFamily:FM, fontSize:16, fontWeight:700, color:row.color, width:70 }}>{row.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim,
                    background:C.bg, padding:"2px 8px", borderRadius:100, marginRight:8 }}>{row.pct}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, flex:1, lineHeight:1.4 }}>{row.action}</div>
                </div>
              ))}
            </div>
            {reportData?.arNote && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10,
                background:`${C.amber}06`, border:`1px solid ${C.amber}20`,
                fontFamily:F, fontSize:12, color:C.text, lineHeight:1.6 }}>
                {"📝 "}{reportData.arNote}
              </div>
            )}
          </Card>

          {/* Working Capital Ratios — with benchmarks */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Working Capital Ratios vs Benchmarks"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"How your efficiency ratios compare to MSME sector medians"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Current Ratio",        value: reportData?.currentRatio || "1.62x", benchmark: reportData?.benchCurrentRatio || "Sector avg: 1.5–2.0x", target:1.5, actual: parseFloat(reportData?.currentRatio||"1.62"), higher:true  },
                { label:"Quick Ratio",           value: reportData?.quickRatio   || "1.18x", benchmark: reportData?.benchQuickRatio   || "Target: >1.0x",         target:1.0, actual: parseFloat(reportData?.quickRatio||"1.18"),   higher:true  },
                { label:"Inventory Turnover",    value: reportData?.invTurnover  || "6.2x",  benchmark: reportData?.benchInvTurnover  || "MSME avg: 4–8x",         target:4,   actual: parseFloat(reportData?.invTurnover||"6.2"),   higher:true  },
                { label:"Debtor Turnover",       value: reportData?.debtorTurn   || "7.8x",  benchmark: reportData?.benchDebtorTurn   || "Target: >10x",           target:10,  actual: parseFloat(reportData?.debtorTurn||"7.8"),    higher:true  },
              ].map((r, i) => {
                const good = r.higher ? r.actual >= r.target : r.actual <= r.target;
                return (
                  <div key={i} style={{ padding:"14px", borderRadius:12,
                    background: good ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${good ? C.green+"20" : C.amber+"25"}` }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                    <div style={{ fontFamily:FM, fontSize:22, fontWeight:800,
                      color: good ? C.green : C.amber, marginBottom:4 }}>{r.value}</div>
                    <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5, marginBottom:4 }}>{r.benchmark}</div>
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color: good ? C.green : C.amber }}>
                      {good ? "✅ Within benchmark" : "⚠️ Below benchmark — action needed"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Garima's working capital note */}
          {reportData?.wcNote && (
            <Card style={{ borderLeft:`3px solid ${C.teal}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.teal,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                {"📝 Garima's Working Capital Assessment"}
              </div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>
                {reportData.wcNote}
              </p>
            </Card>
          )}
        </div>
      )}

      {tab === "bankfin" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:14,
            background:`linear-gradient(135deg,${C.blue}10,${C.purple}06)`,
            border:`1px solid ${C.blue}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Are you ready to borrow — and at what terms?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"Banks don't just look at your revenue — they look at your repayment capacity, collateral, and financial hygiene. Here's exactly where you stand."}
            </div>
          </div>

          {/* Loan Eligibility Score */}
          <Card>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:16, marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                  textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{"Bank Finance Readiness Score"}</div>
                <div style={{ fontFamily:FM, fontWeight:800, fontSize:40, color:C.blue, lineHeight:1 }}>
                  {reportData?.loanScore || "—"}
                  <span style={{ fontSize:14, color:C.muted, fontWeight:500 }}>{"/100"}</span>
                </div>
                <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
                  {!reportData?.loanScore ? "Score not yet assessed by Garima" :
                    parseInt(reportData.loanScore) >= 75 ? "✅ Strong — eligible for most MSME schemes" :
                    parseInt(reportData.loanScore) >= 55 ? "⚠️ Moderate — eligible with preparation" :
                    "🔴 Early stage — address key gaps first"}
                </div>
              </div>
              {reportData?.loanScore && <ScoreGauge score={parseInt(reportData.loanScore)} color={C.blue} size={90}/>}
            </div>
            {reportData?.loanScore && (
              <div style={{ height:8, borderRadius:4, background:C.bg3 }}>
                <div style={{ height:"100%", borderRadius:4, width:`${reportData.loanScore}%`,
                  background:`linear-gradient(90deg,${C.blue},${C.purple})`, transition:"width 0.6s" }}/>
              </div>
            )}
          </Card>

          {/* Key Ratios — what the bank will look at */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"What the Bank Will Scrutinise"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"These 4 ratios determine whether your loan gets approved — and at what rate"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"DSCR",               value:reportData?.dscr,             benchmark:"Must be >1.25x for approval",   what:"Can operating income service the loan EMI?",    good: reportData?.dscr ? parseFloat(reportData.dscr)>=1.25 : null },
                { label:"Interest Coverage",  value:reportData?.interestCoverage, benchmark:"Banks want >3x",                 what:"EBIT ÷ interest — can you service existing debt?", good: reportData?.interestCoverage ? parseFloat(reportData.interestCoverage)>=3 : null },
                { label:"Current Ratio",      value:reportData?.currentRatio,     benchmark:"Minimum 1.33x for working capital",what:"Short-term assets vs liabilities",              good: reportData?.currentRatio ? parseFloat(reportData.currentRatio)>=1.33 : null },
                { label:"Debt / EBITDA",      value:reportData?.debtEbitda,       benchmark:"Banks prefer <4x for MSMEs",     what:"How many years of earnings to repay debt",      good: reportData?.debtEbitda ? parseFloat(reportData.debtEbitda)<=4 : null },
              ].map((r, i) => (
                <div key={i} style={{ padding:"16px", borderRadius:12,
                  background: r.good===true ? `${C.green}06` : r.good===false ? `${C.red}06` : C.bg2,
                  border:`1px solid ${r.good===true?C.green+"20":r.good===false?C.red+"20":C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                  <div style={{ fontFamily:FM, fontSize:24, fontWeight:800, marginBottom:4,
                    color: r.good===true?C.green:r.good===false?C.red:C.dim }}>{r.value || "Not assessed"}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.blue, marginBottom:6, lineHeight:1.4 }}>{r.benchmark}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.4, marginBottom: r.good!==null?6:0 }}>{r.what}</div>
                  {r.good !== null && (
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700,
                      color:r.good?C.green:C.red, background:r.good?`${C.green}10`:`${C.red}08`,
                      padding:"3px 10px", borderRadius:100, display:"inline-block" }}>
                      {r.good ? "✅ Meets threshold" : "❌ Below bank requirement"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Auto-flagged issues */}
          {(() => {
            const flags = [];
            if (reportData?.dscr && parseFloat(reportData.dscr)<1.25) flags.push({ text:`DSCR of ${reportData.dscr} is below the 1.25x minimum — banks will reject the application. Increase operating income or reduce existing debt first.`, severity:"high" });
            if (reportData?.currentRatio && parseFloat(reportData.currentRatio)<1.33) flags.push({ text:`Current Ratio of ${reportData.currentRatio} is below 1.33x — the minimum for working capital loans. Reduce short-term liabilities or increase current assets.`, severity:"high" });
            if (reportData?.debtEbitda && parseFloat(reportData.debtEbitda)>4) flags.push({ text:`Debt/EBITDA of ${reportData.debtEbitda} is high for an MSME. Banks may cap the loan amount or require additional collateral.`, severity:"medium" });
            if (reportData?.interestCoverage && parseFloat(reportData.interestCoverage)<3) flags.push({ text:`Interest Coverage of ${reportData.interestCoverage} is below 3x. Lenders will question repayment comfort — focus on improving EBITDA.`, severity:"medium" });
            return flags.length > 0 ? (
              <Card style={{ borderLeft:`3px solid ${C.red}`, background:`${C.red}04` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.red, marginBottom:12 }}>
                  {"Issues to Fix Before Applying"}
                </div>
                {flags.map((f, i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px",
                    borderRadius:8, background:"rgba(255,255,255,0.6)", marginBottom:8,
                    border:`1px solid ${f.severity==="high"?C.red+"20":C.amber+"20"}` }}>
                    <span style={{ color:f.severity==="high"?C.red:C.amber, flexShrink:0 }}>{"•"}</span>
                    <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{f.text}</span>
                  </div>
                ))}
              </Card>
            ) : reportData?.dscr ? (
              <Card style={{ borderLeft:`3px solid ${C.green}`, background:`${C.green}04` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.green }}>
                  {"✅ All key ratios within bank thresholds — you're ready to apply"}
                </div>
              </Card>
            ) : null;
          })()}

          {/* Recommended Schemes for MSME */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>{"MSME Loan Schemes"}</div>
            {[
              { name:"CGTMSE (Collateral-free)", amount:"Up to ₹5 Cr",   rate:"Market rate",  note:"No collateral needed — govt guarantee. Best for MSMEs without assets.", hot:true,  color:C.teal   },
              { name:"MUDRA Tarun / Shishu",     amount:"Up to ₹10L",    rate:"10–12%",       note:"Quick disbursement for small and micro enterprises.",                   hot:false, color:C.blue   },
              { name:"PSB Loan in 59 Minutes",   amount:"Up to ₹5 Cr",   rate:"8.5–11.5%",   note:"GST-linked fast approval. Useful if you have 12 months GST history.",   hot:true,  color:C.purple },
              { name:"SIDBI Direct Finance",      amount:"Up to ₹25 Cr",  rate:"9–12%",        note:"For established MSMEs with 3+ year track record.",                      hot:false, color:C.amber  },
              { name:"Bank Working Capital OD",   amount:"Based on AR",   rate:"Repo + 3–4%",  note:"Overdraft against debtors — best for managing cash gaps.",              hot:false, color:C.muted  },
            ].map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12,
                padding:"12px 14px", borderRadius:12, marginBottom:8,
                background:C.bg2, border:`1px solid ${s.hot?s.color+"25":C.border}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{s.name}</span>
                    {s.hot && <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:s.color, background:`${s.color}15`, padding:"2px 8px", borderRadius:100 }}>{"RECOMMENDED"}</span>}
                  </div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:2 }}>{s.amount}{" | "}{s.rate}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>{s.note}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* CTA */}
          <Card style={{ background:`${C.blue}06`, borderColor:`${C.blue}15` }}>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:12 }}>
              {"Garima can prepare your complete bank finance package — projections, ratios, application documents — and facilitate lender introductions."}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href={WA} target="_blank" rel="noopener"
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
                  borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                  color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
                {"💬 WhatsApp Garima"}
              </a>
              <button onClick={() => { const html = generateLoanPDF({ client, reportData, kpis }); const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
                  borderRadius:12, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`,
                  color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {"📄 Download Finance Report"}
              </button>
            </div>
          </Card>

        </div>
      )}

{tab === "packs" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="MSME Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.teal}06`, borderColor:`${C.teal}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              📅 <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
              Questions?{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>💬 WhatsApp Garima</a>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CorporatePackContent({ reportData, kpis, client }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly",   icon:"📊", label:"Monthly Report"    },
    { id:"variance",  icon:"📉", label:"Variance Analysis" },
    { id:"governance",icon:"⚖️", label:"Board Governance"  },
    { id:"ipo",       icon:"🏦", label:"IPO Readiness"     },
    { id:"packs",     icon:"📁", label:"Previous Packs"    },
  ];
  const data = CFO_PACK_DATA["corporate"];
  const archiveDocs = useLiveDocs(client);

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 18px", borderRadius:100, border:"none", cursor:"pointer",
            fontFamily:F, fontSize:13, fontWeight:600, transition:"all 0.15s",
            background: tab===t.id ? C.purple : C.bg2,
            color: tab===t.id ? "white" : C.muted,
            outline: `1.5px solid ${tab===t.id ? C.purple : C.border}`,
            boxShadow: tab===t.id ? `0 4px 14px ${C.purple}35` : "none",
            touchAction:"manipulation",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === "monthly" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <div style={{ padding:"16px 20px", borderRadius:14,
            background:`linear-gradient(135deg,${C.purple}10,${C.blue}06)`,
            border:`1px solid ${C.purple}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Board Report"}{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>
              {"Actuals vs Budget vs Prior Year · Prepared by Garima Agarwal CA"}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }} className="corp-kpi">
            {[
              { label:"Revenue",       value:reportData?.plInputs?.revenue      ||"₹842L", budget:"₹810L",  color:C.blue   },
              { label:"EBITDA",        value:reportData?.plInputs?.ebitda       ||"₹147L", budget:"₹115L",  color:C.teal   },
              { label:"EBITDA Margin", value:reportData?.plInputs?.ebitdaMargin ||"17.5%", budget:"14.2%",  color:C.purple },
              { label:"PAT",           value:reportData?.plInputs?.pat          ||"₹81L",  budget:"₹56L",   color:C.green  },
            ].map((k,i) => (
              <div key={i} style={{ padding:"14px", borderRadius:12,
                background:`${k.color}08`, border:`1px solid ${k.color}20`, textAlign:"center" }}>
                <div style={{ fontFamily:FM, fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginTop:3 }}>{k.label}</div>
                <div style={{ fontFamily:F, fontSize:10, color:C.green, marginTop:2 }}>
                  {"▲ vs budget "}{k.budget}
                </div>
              </div>
            ))}
            <style>{`.corp-kpi{grid-template-columns:1fr 1fr 1fr 1fr!important}@media(max-width:600px){.corp-kpi{grid-template-columns:1fr 1fr!important}}`}</style>
          </div>

          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"P&L — Actuals vs Budget vs Prior Year"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"Variance shown in absolute and percentage — board-ready format"}
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {["", "Actual", "Budget", "Var (₹)", "Var (%)", "Prior Year", "YoY (%)"].map((h,i) => (
                      <th key={i} style={{ padding:"10px 12px",
                        textAlign:i===0?"left":"right",
                        color:"white", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { row:"Revenue",            actual:"₹842L", budget:"₹810L", varAbs:"+₹32L", varPct:"+4.0%",  py:"₹720L", yoy:"+16.9%", bold:true  },
                    { row:"COGS",               actual:"₹497L", budget:"₹490L", varAbs:"−₹7L",  varPct:"−1.4%", py:"₹446L", yoy:"+11.4%", bold:false },
                    { row:"Gross Profit",       actual:"₹345L", budget:"₹320L", varAbs:"+₹25L", varPct:"+7.8%",  py:"₹274L", yoy:"+25.9%", bold:true  },
                    { row:"GP Margin",          actual:"41.0%", budget:"39.5%", varAbs:"+1.5pp",varPct:"",       py:"38.1%", yoy:"+2.9pp", bold:false },
                    { row:"Operating Expenses", actual:"₹198L", budget:"₹205L", varAbs:"+₹7L",  varPct:"+3.4%",  py:"₹185L", yoy:"+7.0%",  bold:false },
                    { row:"EBITDA",             actual:"₹147L", budget:"₹115L", varAbs:"+₹32L", varPct:"+27.8%", py:"₹89L",  yoy:"+65.2%", bold:true  },
                    { row:"EBITDA Margin",      actual:"17.5%", budget:"14.2%", varAbs:"+3.3pp",varPct:"",       py:"12.4%", yoy:"+5.1pp", bold:false },
                    { row:"Finance Costs",      actual:"₹22L",  budget:"₹22L",  varAbs:"—",     varPct:"—",      py:"₹24L",  yoy:"−8.3%",  bold:false },
                    { row:"PBT",                actual:"₹107L", budget:"₹75L",  varAbs:"+₹32L", varPct:"+42.7%", py:"₹49L",  yoy:"+118.4%",bold:true  },
                    { row:"PAT",                actual:"₹81L",  budget:"₹56L",  varAbs:"+₹25L", varPct:"+44.6%", py:"₹37L",  yoy:"+118.9%",bold:true  },
                  ].map((r,i) => (
                    <tr key={i} style={{ background:i%2===0?C.bg2:C.bg }}>
                      <td style={{ padding:"9px 12px", fontWeight:r.bold?700:400,
                        fontSize:12, color:C.text, borderBottom:`1px solid ${C.border}`,
                        background:r.bold?`${C.blue}04`:undefined }}>{r.row}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:r.bold?700:400,
                        fontSize:12, color:C.text, borderBottom:`1px solid ${C.border}`,
                        background:r.bold?`${C.blue}04`:undefined, fontFamily:FM, whiteSpace:"nowrap" }}>{r.actual}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontSize:12,
                        color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{r.budget}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontSize:12,
                        color:r.varAbs.startsWith("+")?C.green:r.varAbs==="—"?C.dim:C.red,
                        borderBottom:`1px solid ${C.border}`, fontWeight:700, whiteSpace:"nowrap" }}>{r.varAbs}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontSize:12,
                        color:r.varPct.startsWith("+")?C.green:r.varPct===""||r.varPct==="—"?C.dim:C.red,
                        borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{r.varPct}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontSize:12,
                        color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{r.py}</td>
                      <td style={{ padding:"9px 12px", textAlign:"right", fontSize:12,
                        color:r.yoy.startsWith("+")?C.green:C.red,
                        borderBottom:`1px solid ${C.border}`, fontWeight:600, whiteSpace:"nowrap" }}>{r.yoy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
              {"📝 Garima's Board Commentary"}
            </div>
            <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0, whiteSpace:"pre-wrap" }}>
              {reportData?.cashflowNote || reportData?.packNote || data.garimaNote}
            </p>
          </Card>

          {reportData?.boardHighlight1 && (
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>
                {"Board Highlights — 3 Things That Matter This Month"}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[reportData.boardHighlight1, reportData.boardHighlight2, reportData.boardHighlight3]
                  .filter(Boolean)
                  .map((h, i) => (
                    <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px",
                      borderRadius:10, background:C.bg2, border:`1px solid ${C.border}`,
                      alignItems:"flex-start" }}>
                      <span style={{ fontFamily:FM, fontWeight:800, color:C.purple,
                        background:`${C.purple}12`, borderRadius:6, padding:"2px 8px",
                        fontSize:11, flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{h}</span>
                    </div>
                  ))
                }
              </div>
            </Card>
          )}

        </div>
      )}

      {tab === "variance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {reportData?.variance?.some(r => r.item && (r.budget || r.actual)) ? (<>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                Board-Ready Variance Analysis{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
              </div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>Actuals vs Budget — updated by Garima</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.navy }}>
                      {["Item","Budget","Actual","Variance"].map((h,i) => (
                        <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.variance.filter(r => r.item).map((r,i) => (
                      <tr key={i} style={{ background:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:C.text }}>{r.item}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.budget||"—"}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, fontFamily:FM }}>{r.actual||"—"}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right" }}>
                          <span style={{ padding:"3px 8px", borderRadius:100, fontSize:10, fontWeight:700,
                            background:r.fav?`${C.green}15`:`${C.red}15`, color:r.fav?C.green:C.red }}>
                            {r.fav?"▲ Fav":"▼ Unfav"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {reportData?.varianceCommentary?.some(v => v.item) && (
              <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:12 }}>📝 Commentary</div>
                {reportData.varianceCommentary.filter(v => v.item).map((v,i,arr) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ width:8, height:8, borderRadius:100, background:v.favorable?C.green:C.red, flexShrink:0, marginTop:6 }}/>
                    <div>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{v.item}</div>
                      {v.note && <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>{v.note}</div>}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>) : (
            <Card style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📉</div>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>Variance Analysis</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.dim }}>Garima will update this with your variance data.</div>
            </Card>
          )}
        </div>
      )}

            {tab === "governance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:14,
            background:`linear-gradient(135deg,${C.purple}10,${C.blue}06)`,
            border:`1px solid ${C.purple}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Is the board operating at the standard investors and regulators expect?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"Governance isn't just compliance — it's the difference between a company that survives management changes and one that doesn't. This tab tracks what matters."}
            </div>
          </div>

          {/* Board Composition */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Board Composition"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Director mix and independence status"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }} className="inv-grid">
              {[
                { label:"Executive Directors",    value: reportData?.execDirectors    || "—", note:"Running day-to-day operations",            color:C.blue   },
                { label:"Independent Directors",  value: reportData?.indepDirectors   || "—", note:"SEBI requires ≥1/3 of board for listed",   color:C.teal, flag: reportData?.indepDirectors === "0" },
                { label:"Board Meetings (YTD)",   value: reportData?.boardMeetings    || "—", note:"Min 4 per year under Companies Act",        color:C.purple },
              ].map((item, i) => (
                <div key={i} style={{ padding:"14px", borderRadius:12,
                  background: item.flag ? `${C.red}06` : C.bg2,
                  border:`1px solid ${item.flag ? C.red+"20" : C.border}`, textAlign:"center" }}>
                  <div style={{ fontFamily:FM, fontSize:24, fontWeight:800, color:item.flag?C.red:item.color }}>{item.value}</div>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginTop:4 }}>{item.label}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:3, lineHeight:1.4 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Compliance Health */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>
              {"Compliance Health — Regulatory Obligations"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { item:"ROC Annual Return (MGT-7)",          status: reportData?.rocStatus       || "pending", due:"30 Nov each year"                },
                { item:"Audited Financials Filed (AOC-4)",   status: reportData?.aocStatus       || "pending", due:"30 Oct each year"                },
                { item:"Board Resolution — last AGM",        status: reportData?.agmStatus       || "pending", due:"Within 6 months of year end"      },
                { item:"Director KYC (DIR-3 KYC)",          status: reportData?.dirKycStatus    || "done",    due:"30 Sep each year"                },
                { item:"Statutory Audit Completed",          status: reportData?.auditStatus     || "pending", due:"Before AGM"                      },
                { item:"Related Party Transactions Approved",status: reportData?.rptStatus       || "pending", due:"Board approval required"          },
                { item:"CSR Compliance (if applicable)",     status: reportData?.csrStatus       || "na",      due:"2% of avg net profit"             },
                { item:"Ind AS Financial Statements",        status: reportData?.indAsStatus     || "pending", due:"As per applicable standards"      },
              ].map((row, i) => {
                const isDone = row.status === "done";
                const isNA   = row.status === "na";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    borderRadius:10,
                    background: isDone ? `${C.green}06` : isNA ? C.bg2 : `${C.amber}06`,
                    border:`1px solid ${isDone?C.green+"20":isNA?C.border:C.amber+"25"}` }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>
                      {isDone ? "✅" : isNA ? "➖" : "⏳"}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:isDone?500:600 }}>{row.item}</div>
                      <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>{row.due}</div>
                    </div>
                    <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:isDone?C.green:isNA?C.muted:C.amber,
                      background:isDone?`${C.green}15`:isNA?C.bg:`${C.amber}15`,
                      padding:"3px 10px", borderRadius:100 }}>
                      {isDone?"Done":isNA?"N/A":"Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Ind AS Readiness */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Ind AS Health Check"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"Key standards that require attention — critical for audit sign-off and investor confidence"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { std:"Ind AS 116 — Leases",           status: reportData?.indAs116 || "review", note:"All operating leases must be capitalised on balance sheet" },
                { std:"Ind AS 109 — Financial Instruments", status: reportData?.indAs109 || "review", note:"Fair value measurement of loans, derivatives, investments" },
                { std:"Ind AS 115 — Revenue Recognition", status: reportData?.indAs115 || "done",   note:"Revenue recognition policy aligned with contracts" },
                { std:"Ind AS 36 — Impairment",         status: reportData?.indAs36  || "review", note:"Annual impairment testing on goodwill and intangibles" },
                { std:"Ind AS 12 — Deferred Tax",       status: reportData?.indAs12  || "done",   note:"Deferred tax assets and liabilities properly recognised" },
                { std:"Related Party Disclosures",       status: reportData?.indAsRpt || "review", note:"All RPTs disclosed with arm's length justification" },
              ].map((item, i) => {
                const ok = item.status === "done";
                return (
                  <div key={i} style={{ padding:"12px", borderRadius:10,
                    background: ok ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${ok?C.green+"20":C.amber+"25"}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span>{ok?"✅":"⚠️"}</span>
                      <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text }}>{item.std}</span>
                    </div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.5 }}>{item.note}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Garima's governance note */}
          {reportData?.governanceNote && (
            <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.purple,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                {"📝 Garima's Governance Assessment"}
              </div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>
                {reportData.governanceNote}
              </p>
            </Card>
          )}
        </div>
      )}

      {tab === "ipo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <div style={{ padding:"16px 20px", borderRadius:14,
            background:`linear-gradient(135deg,${C.purple}10,${C.blue}06)`,
            border:`1px solid ${C.purple}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"What needs to happen before you can list?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"IPO readiness is about closing specific gaps — not a number. Here's a plain-language view of where you stand and what to focus on."}
            </div>
          </div>

          {/* Gap tracker — the real value */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Critical Gaps to Close"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
              {"SEBI and merchant bankers will check all of these before accepting your DRHP"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { gap:"3-year consecutive PAT profitability",   status:reportData?.ipoGap1||"pending", note:"SEBI mainboard requires profit in at least 2 of 3 preceding years. SME IPO is more flexible." },
                { gap:"Independent director on board",         status:reportData?.ipoGap2||"pending", note:"Mandatory before DRHP filing — minimum 1/3 of board must be independent." },
                { gap:"Category 1 auditor appointed",          status:reportData?.ipoGap3||"pending", note:"Institutional investors and merchant bankers expect a recognised audit firm." },
                { gap:"Ind AS financials restated (3 years)",  status:reportData?.ipoGap4||"pending", note:"Mandatory for DRHP. Budget 6–9 months — this is usually the longest lead item." },
                { gap:"Legal and IP clean-up complete",        status:reportData?.ipoGap5||"pending", note:"All litigation disclosed, IP registered, key contracts reviewed and assignable." },
                { gap:"ESOP scheme formalised",                status:reportData?.ipoGap6||"done",    note:"Employee stock options must be board-approved and documented before listing." },
              ].map((item, i) => {
                const done = item.status === "done";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
                    padding:"12px 14px", borderRadius:10,
                    background: done ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${done ? C.green+"20" : C.amber+"25"}` }}>
                    <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{done ? "✅" : "⭕"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600,
                        color: done ? C.text : C.text, marginBottom:3 }}>{item.gap}</div>
                      <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.5 }}>{item.note}</div>
                    </div>
                    <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color: done ? C.green : C.amber,
                      background: done ? `${C.green}15` : `${C.amber}12`,
                      padding:"3px 10px", borderRadius:100, flexShrink:0 }}>
                      {done ? "Done" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>
              {"Realistic IPO Timeline from Today"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { phase:"Now → 6 months",   action:"Address critical gaps — Ind AS restatement, independent director, auditor", color:C.red    },
                { phase:"6 → 12 months",    action:"Appoint merchant banker, due diligence, DRHP preparation begins",           color:C.amber  },
                { phase:"12 → 18 months",   action:"DRHP filing with SEBI, respond to observations, pre-IPO placement",        color:C.blue   },
                { phase:"18 → 24 months",   action:"Roadshow, book building, listing on NSE/BSE",                               color:C.green  },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"10px 14px", borderRadius:10, background:C.bg2,
                  border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:item.color, flexShrink:0 }}/>
                  <div style={{ width:110, fontFamily:F, fontSize:11, fontWeight:700, color:item.color, flexShrink:0 }}>{item.phase}</div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.text, flex:1, lineHeight:1.5 }}>{item.action}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Garima's note */}
          {(reportData?.ipoNote || reportData?.packNote || data.garimaNote) && (
            <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"📝 Garima's Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData?.ipoNote || reportData?.packNote || data.garimaNote}
              </p>
            </Card>
          )}

          <div style={{ textAlign:"center" }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:12, background:`${C.purple}10`, border:`1.5px solid ${C.purple}30`,
                color:C.purple, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              {"💬 Discuss IPO readiness with Garima"}
            </a>
          </div>

        </div>
      )}

      {tab === "packs" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>
            Monthly board packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="Corporate Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.purple}06`, borderColor:`${C.purple}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              {"📅 "}
              <strong style={{ color:C.text }}>{"Packs uploaded by the 20th of each month."}</strong>
              {" Questions? "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>{"💬 WhatsApp Garima"}</a>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}


function CFOPackContent({ reportData, client, kpis }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly",    icon:"📊", label:"Monthly Report"      },
    { id:"variance",   icon:"📉", label:"Variance Analysis"   },
    { id:"uniteco",    icon:"📐", label:"Unit Economics"      },
    { id:"fundraise",  icon:"🎯", label:"Fundraise Readiness" },
    { id:"loan",       icon:"🏦", label:"Loan Readiness"      },
    { id:"boardpacks", icon:"📁", label:"Board Packs"         },
  ];
  const data = CFO_PACK_DATA["startup"];
  const archiveDocs = useLiveDocs(client);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 18px", borderRadius:100, border:"none", cursor:"pointer",
            fontFamily:F, fontSize:13, fontWeight:600, transition:"all 0.15s",
            background: tab===t.id ? C.blue : C.bg2,
            color: tab===t.id ? "white" : C.muted,
            outline: `1.5px solid ${tab===t.id ? C.blue : C.border}`,
            boxShadow: tab===t.id ? `0 4px 14px ${C.blue}35` : "none",
            touchAction:"manipulation",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Monthly Report tab */}
      {tab === "monthly" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>📝 Note from Garima</div>
            <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0, whiteSpace:"pre-wrap" }}>
              {reportData?.reportNote || reportData?.packNote || (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.garimaNote) || PACK_CONFIG.startup.garimaNote}
            </p>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
              KPI Snapshot{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }} className="cfok-g">
              {(kpis || KPIs).map((k,i) => (
                <div key={i} style={{ padding:"14px 10px", borderRadius:12, background:k.bg, textAlign:"center" }}>
                  <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:k.color }}>{k.value}</div>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginTop:4 }}>{k.label}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:k.trend==="up"?C.green:k.trend==="down"?C.red:C.muted, marginTop:2, lineHeight:1.4 }}>
                    {kpiContext(k)}
                  </div>
                </div>
              ))}
            </div>
            <style>{`.cfok-g{grid-template-columns:repeat(3,1fr)!important}@media(max-width:480px){.cfok-g{grid-template-columns:1fr 1fr!important}}`}</style>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
              P&L at a Glance{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
            </div>
            {(() => {
              const pl = reportData?.pl;
              const hasLive = pl && Object.values(pl).some(v => v?.actual);
              if (hasLive) {
                return [
                  { key:"revenue",     label:"Revenue"      },
                  { key:"cogs",        label:"COGS"         },
                  { key:"grossProfit", label:"Gross Profit" },
                  { key:"ebitda",      label:"EBITDA"       },
                  { key:"pat",         label:"Net Profit / PAT" },
                ].filter(r => pl[r.key]?.actual).map((r,i) => (
                  <StatRow key={i} label={r.label}
                    value={pl[r.key].actual}
                    sub={pl[r.key].prev ? `vs ${pl[r.key].prev} last month` : ""}
                    trend="up"/>
                ));
              }
              return (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.plRows || PACK_CONFIG.startup.plRows).map((r,i) => <StatRow key={i} {...r}/>);
            })()}
          </Card>
          <Card style={{ borderLeft:`3px solid ${C.green}` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Action Items</div>
            {ACTIONS.map((a,i,arr) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none", alignItems:"flex-start", opacity:a.done?0.5:1 }}>
                <div style={{ width:18, height:18, borderRadius:5, background:a.done?C.green:C.bg3, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  {a.done && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
                </div>
                <div style={{ flex:1, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
                  <span style={{ fontFamily:F, fontSize:13, color:a.done?C.dim:C.text, textDecoration:a.done?"line-through":"none", lineHeight:1.5 }}>{a.text}</span>
                  <PriBadge p={a.priority}/>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Fundraise Readiness tab */}
      {tab === "variance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Budget vs Actual{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : " — Current Month"}</div>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>All figures in ₹L unless stated</div>
            <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <table style={{ width:"100%", minWidth:560, borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {["Metric","Budget","Actual","Variance","Var %","Status"].map((h,i) => (
                      <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:12, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { m:"Revenue",         bud:"790", act:"842", fav:true  },
                    { m:"Gross Profit",    bud:"316", act:"345", fav:true  },
                    { m:"Gross Margin %",  bud:"40%", act:"41%", fav:true, noCalc:true },
                    { m:"Operating Exp",   bud:"210", act:"198", fav:true  },
                    { m:"EBITDA",          bud:"130", act:"147", fav:true  },
                    { m:"EBITDA Margin %", bud:"16%", act:"17.5%",fav:true, noCalc:true },
                    { m:"Burn Rate",       bud:"52L/mo",act:"48L/mo",fav:true, noCalc:true },
                    { m:"Cash Balance",    bud:"2.4Cr",act:"2.1Cr",fav:false, noCalc:true },
                    { m:"Headcount Cost",  bud:"95",  act:"88",  fav:true  },
                  ].map((r,i) => {
                    const bv = parseFloat(r.bud), av = parseFloat(r.act);
                    const varVal = r.noCalc ? "—" : (av - bv).toFixed(1);
                    const varPct = r.noCalc ? "—" : ((av - bv)/bv*100).toFixed(1)+"%";
                    return (
                      <tr key={i} style={{ background:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:C.text }}>{r.m}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.bud}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.text, fontWeight:700, fontFamily:FM }}>{r.act}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.fav?C.green:C.red }}>{varVal}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.fav?C.green:C.red }}>{varPct}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right" }}>
                          <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700,
                            background:r.fav?`${C.green}15`:`${C.red}15`, color:r.fav?C.green:C.red }}>
                            {r.fav?"✅ Fav":"⚠️ Unfav"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{ borderLeft:`3px solid ${C.amber}` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:12 }}>📝 Variance Commentary</div>
            {[
              { item:"Revenue ₹52L above budget", note:"Driven by early renewal from Client A (+₹38L) and new logo added in mid-Feb (+₹14L). March pipeline looks equally strong.", c:C.green },
              { item:"Headcount costs ₹7L under budget", note:"2 open roles not yet filled — saving budget but creating capacity risk in engineering. Hiring to resume in March.", c:C.green },
              { item:"Cash balance ₹0.3Cr below budget", note:"Advance vendor payments pulled forward from March. Temporary — will normalise by end of March.", c:C.amber },
            ].map((v,i) => (
              <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:8, height:8, borderRadius:100, background:v.c, flexShrink:0, marginTop:6 }}/>
                <div>
                  <div style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{v.item}</div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>{v.note}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "uniteco" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Header */}
          <div style={{ padding:"18px 22px", borderRadius:16,
            background:`linear-gradient(135deg,${C.blue}10,${C.teal}08)`,
            border:`1px solid ${C.blue}18` }}>
            <div style={{ fontFamily:F, fontWeight:800, fontSize:17, color:C.text, marginBottom:4 }}>
              {"Unit Economics"}
            </div>
            <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>
              {"The metrics investors will scrutinise in your data room — CAC, LTV, payback, retention."}
            </div>
          </div>

          {/* Core Metrics — 2x2 big cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              {
                label:"CAC",
                full:"Customer Acquisition Cost",
                value: reportData?.cac || "—",
                benchmark: reportData?.cacBenchmark || "Sector avg: ₹8,000–15,000",
                note:"Total sales+marketing spend ÷ new customers acquired",
                color:C.blue,
                target: reportData?.cacTarget || null,
                good: reportData?.cac && reportData?.cacTarget ? parseFloat(reportData.cac?.replace(/[^0-9.]/g,"")) <= parseFloat(reportData.cacTarget?.replace(/[^0-9.]/g,"")) : null,
              },
              {
                label:"LTV",
                full:"Lifetime Value",
                value: reportData?.ltv || "—",
                benchmark: reportData?.ltvBenchmark || "Target: LTV:CAC > 3x",
                note:"Average revenue per customer × avg retention period × margin",
                color:C.teal,
                target: reportData?.ltvTarget || null,
                good: null,
              },
              {
                label:"LTV : CAC",
                full:"LTV to CAC Ratio",
                value: reportData?.ltvCac || "—",
                benchmark: reportData?.ltvCacBenchmark || "Series A min: 3x · Good: >5x",
                note:"How much value you get per rupee spent acquiring a customer",
                color: reportData?.ltvCac ? (parseFloat(reportData.ltvCac) >= 3 ? C.green : C.red) : C.purple,
                good: reportData?.ltvCac ? parseFloat(reportData.ltvCac) >= 3 : null,
              },
              {
                label:"Payback Period",
                full:"CAC Payback Period",
                value: reportData?.cacPayback || "—",
                benchmark: reportData?.cacPaybackBenchmark || "Investors prefer <12 months",
                note:"Months to recover acquisition cost from gross margin",
                color: reportData?.cacPayback ? (parseInt(reportData.cacPayback) <= 12 ? C.green : C.amber) : C.amber,
                good: reportData?.cacPayback ? parseInt(reportData.cacPayback) <= 12 : null,
              },
            ].map((m, i) => (
              <div key={i} style={{ padding:"18px", borderRadius:14,
                background: m.good===true ? `${C.green}08` : m.good===false ? `${C.red}06` : C.bg2,
                border:`1px solid ${m.good===true ? C.green+"25" : m.good===false ? C.red+"20" : C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                    textTransform:"uppercase", letterSpacing:"0.07em" }}>{m.label}</div>
                  {m.good !== null && (
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:F,
                      color: m.good ? C.green : C.red,
                      background: m.good ? `${C.green}15` : `${C.red}10`,
                      padding:"2px 8px", borderRadius:100 }}>
                      {m.good ? "✅ On track" : "⚠️ Watch"}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:FM, fontWeight:800, fontSize:28, color:m.value==="—"?C.dim:m.color, marginBottom:4 }}>
                  {m.value}
                </div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginBottom:6 }}>{m.full}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.blue, fontWeight:600,
                  background:`${C.blue}08`, padding:"4px 10px", borderRadius:8, marginBottom:6 }}>
                  {m.benchmark}
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.5 }}>{m.note}</div>
              </div>
            ))}
          </div>

          {/* Growth & Retention */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>
              {"Growth & Retention"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="inv-grid">
              {[
                {
                  label:"MoM Revenue Growth",
                  value: reportData?.momGrowth || kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value ? "—" : "—",
                  benchmark: reportData?.momGrowthBenchmark || "Series A: >10% MoM",
                  good: reportData?.momGrowth ? parseFloat(reportData.momGrowth) >= 10 : null,
                  color:C.blue,
                },
                {
                  label:"Net Revenue Retention",
                  value: reportData?.nrr || "—",
                  benchmark: reportData?.nrrBenchmark || "Good: >100% · Great: >120%",
                  good: reportData?.nrr ? parseFloat(reportData.nrr) >= 100 : null,
                  color:C.teal,
                },
                {
                  label:"Gross Churn (Monthly)",
                  value: reportData?.churnRate || "—",
                  benchmark: reportData?.churnBenchmark || "SaaS target: <2%/mo",
                  good: reportData?.churnRate ? parseFloat(reportData.churnRate) <= 2 : null,
                  color:C.purple,
                },
                {
                  label:"Burn Multiple",
                  value: reportData?.burnMultiple || "—",
                  benchmark: reportData?.burnMultipleBenchmark || "Good: <1.5x · Raise ready: <1x",
                  good: reportData?.burnMultiple ? parseFloat(reportData.burnMultiple) <= 1.5 : null,
                  color:C.amber,
                },
                {
                  label:"ARR",
                  value: reportData?.arr || kpis?.find(k=>k.label?.toLowerCase().includes("arr"))?.value || "—",
                  benchmark: reportData?.arrBenchmark || "Series A: ₹3–10 Cr",
                  good: null,
                  color:C.blue,
                },
                {
                  label:"Magic Number",
                  value: reportData?.magicNumber || "—",
                  benchmark: reportData?.magicNumberBenchmark || "Good: >0.75 · Efficient: >1.0",
                  good: reportData?.magicNumber ? parseFloat(reportData.magicNumber) >= 0.75 : null,
                  color:C.teal,
                },
              ].map((m, i) => (
                <div key={i} style={{ padding:"14px", borderRadius:12,
                  background: m.good===true ? `${C.green}08` : m.good===false ? `${C.amber}08` : C.bg2,
                  border:`1px solid ${m.good===true ? C.green+"20" : m.good===false ? C.amber+"25" : C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{m.label}</div>
                  <div style={{ fontFamily:FM, fontWeight:800, fontSize:22,
                    color:m.value==="—"?C.dim:m.color, marginBottom:4 }}>{m.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5 }}>{m.benchmark}</div>
                  {m.good !== null && (
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:m.good?C.green:C.amber, marginTop:4 }}>
                      {m.good ? "✅ On track" : "⚠️ Needs attention"}
                    </div>
                  )}
                  {m.value === "—" && (
                    <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:4, fontStyle:"italic" }}>
                      {"Set in admin"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Garima's UE Commentary */}
          {reportData?.ueNote && (
            <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"📝 Garima's Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData.ueNote}
              </p>
            </Card>
          )}

          {/* CTA */}
          <Card style={{ background:`${C.blue}06`, borderColor:`${C.blue}15` }}>
            <div style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7 }}>
              {"These metrics are updated by Garima after reviewing your data each month. For a full investor-ready unit economics model, "}
              <a href={WA} target="_blank" rel="noopener"
                style={{ color:C.green, fontWeight:700, textDecoration:"none" }}>
                {"💬 request a deep-dive session"}
              </a>
              {"."}
            </div>
          </Card>

        </div>
      )}


      {tab === "fundraise" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <StartupCFOPack data={data} client={client} reportData={reportData}/>
          <div style={{ textAlign:"center" }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              💬 Discuss your fundraise readiness with Garima
            </a>
          </div>
          {(reportData?.packNote || reportData?.reportNote) && (
            <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"📝 Garima's Fundraise Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData.packNote || reportData.reportNote}
              </p>
            </Card>
          )}
        </div>
      )}

{tab === "loan" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* HEADER */}
          <div style={{ padding:"20px 22px", borderRadius:16, background:`linear-gradient(135deg,${C.blue}12,${C.purple}08)`, border:`1px solid ${C.blue}20` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{"🏦"}</div>
              <div>
                <div style={{ fontFamily:F, fontWeight:800, fontSize:18, color:C.text }}>{"Loan Readiness Report"}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{reportData?.monthLabel ? `As of ${reportData.monthLabel}` : "Current Period"}{" | Prepared by Garima Agarwal CA"}</div>
              </div>
            </div>
            {reportData?.loanNote && (
              <div style={{ marginTop:10, padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.7)", border:`1px solid ${C.blue}20` }}>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{"Garima's Assessment"}</div>
                <p style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.7, margin:0 }}>{reportData.loanNote}</p>
              </div>
            )}
          </div>

          {/* SCORE */}
          <Card>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{"Loan Eligibility Score"}</div>
                <div style={{ fontFamily:F, fontWeight:800, fontSize:40, color:C.blue, lineHeight:1 }}>{reportData?.loanScore || 64}<span style={{ fontSize:14, color:C.muted, fontWeight:500 }}>{"/100"}</span></div>
                <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
                  {(reportData?.loanScore || 64) >= 75 ? "Strong Profile — Eligible for Most Schemes" : (reportData?.loanScore || 64) >= 55 ? "Moderate Profile — Eligible with Preparation" : "Early Stage — Build Track Record First"}
                </div>
              </div>
              <ScoreGauge score={parseInt(reportData?.loanScore) || 64} color={C.blue} size={100}/>
            </div>
            <div style={{ height:8, borderRadius:4, background:C.bg3 }}>
              <div style={{ height:"100%", borderRadius:4, width:`${reportData?.loanScore || 64}%`, background:`linear-gradient(90deg,${C.blue},${C.purple})`, transition:"width 0.6s" }}/>
            </div>
          </Card>

          {/* FINANCIAL SNAPSHOT */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Financial Snapshot"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Pulled from current period KPIs and P&L"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }} className="inv-grid">
              {[
                { label:"Revenue",      value: kpis?.find(k=>k.label?.toLowerCase().includes("rev"))?.value || reportData?.plInputs?.revenue || "—",     color:C.blue   },
                { label:"Gross Margin", value: kpis?.find(k=>k.label?.toLowerCase().includes("margin"))?.value || reportData?.plInputs?.gpMargin || "—", color:C.teal   },
                { label:"EBITDA",       value: reportData?.plInputs?.ebitda || "—",                                                                        color:C.purple },
                { label:"PAT",          value: reportData?.plInputs?.pat || "—",                                                                           color:C.green  },
                { label:"Cash Balance", value: kpis?.find(k=>k.label?.toLowerCase().includes("cash"))?.value || "—",                                      color:C.blue   },
                { label:"Runway",       value: kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value || "—",                                    color:C.amber  },
              ].map((item, i) => (
                <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:C.bg2, border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:item.value==="—"?C.dim:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* DEBT POSITION */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>{"Debt Position"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { label:"Existing Debt",        value: reportData?.existingDebt || "Not provided",       flag: !!(reportData?.existingDebt && reportData.existingDebt.toLowerCase()!=="nil") },
                { label:"Annual Interest Cost",  value: reportData?.interestCost || "Not provided",      flag: false },
                { label:"Loan Amount Sought",    value: reportData?.loanAmountSought || "Not provided",  flag: false },
                { label:"Purpose of Loan",       value: reportData?.loanPurpose || "Not provided",       flag: false },
              ].map((item, i) => (
                <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:item.flag?`${C.amber}08`:C.bg2, border:`1px solid ${item.flag?C.amber+"30":C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontFamily:FM, fontSize:15, fontWeight:700, color:item.value==="Not provided"?C.dim:item.flag?C.amber:C.text }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* KEY DEBT RATIOS — always visible */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Key Debt Ratios"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Assessed by Garima — set in admin"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                {
                  label:"Current Ratio",
                  value: reportData?.currentRatio || null,
                  benchmark:"Target: above 2.0x",
                  what:"Measures ability to pay short-term obligations. Banks require >2.0x before sanctioning.",
                  good: reportData?.currentRatio ? parseFloat(reportData.currentRatio)>=2 : null,
                },
                {
                  label:"DSCR",
                  value: reportData?.dscr || null,
                  benchmark:"Target: above 1.25x",
                  what:"Debt Service Coverage Ratio — can the business repay loan EMIs from operating income?",
                  good: reportData?.dscr ? parseFloat(reportData.dscr)>=1.25 : null,
                },
                {
                  label:"Interest Coverage Ratio",
                  value: reportData?.interestCoverage || null,
                  benchmark:"Target: above 3.0x",
                  what:"EBIT divided by interest expense. Shows how comfortably interest is being serviced.",
                  good: reportData?.interestCoverage ? parseFloat(reportData.interestCoverage)>=3 : null,
                },
                {
                  label:"Debt / EBITDA",
                  value: reportData?.debtEbitda || null,
                  benchmark:"Target: below 3.0x",
                  what:"How many years of EBITDA needed to repay debt. Lower is better for lenders.",
                  good: reportData?.debtEbitda ? parseFloat(reportData.debtEbitda)<=3 : null,
                },
              ].map((r, i) => (
                <div key={i} style={{
                  padding:"16px", borderRadius:14,
                  background: r.good===true ? `${C.green}08` : r.good===false ? `${C.amber}08` : C.bg2,
                  border:`1px solid ${r.good===true ? C.green+"25" : r.good===false ? C.amber+"30" : C.border}`
                }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                  <div style={{ fontFamily:FM, fontSize:24, fontWeight:800, marginBottom:4,
                    color: r.good===true ? C.green : r.good===false ? C.amber : C.dim }}>
                    {r.value || "—"}
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginBottom:6 }}>{r.benchmark}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.6, marginBottom:r.value?8:0 }}>{r.what}</div>
                  {r.value && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:F, fontSize:11, fontWeight:700,
                      color: r.good ? C.green : C.amber,
                      background: r.good ? `${C.green}15` : `${C.amber}15`,
                      padding:"3px 10px", borderRadius:100 }}>
                      {r.good ? "✅ Within range" : "⚠️ Needs attention"}
                    </div>
                  )}
                  {!r.value && (
                    <div style={{ fontFamily:F, fontSize:11, color:C.dim, fontStyle:"italic" }}>{"Not yet assessed"}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* AUTO FLAGS */}
          {(() => {
            const flags = [];
            if (reportData?.currentRatio && parseFloat(reportData.currentRatio)<2) flags.push("Current Ratio is below 2.0x — banks prefer a stronger liquidity position");
            if (reportData?.dscr && parseFloat(reportData.dscr)<1.25) flags.push("DSCR below 1.25x — lenders will question debt repayment capacity");
            if (reportData?.interestCoverage && parseFloat(reportData.interestCoverage)<3) flags.push("Interest Coverage below 3.0x — may limit eligibility for larger amounts");
            if (reportData?.debtEbitda && parseFloat(reportData.debtEbitda)>3) flags.push("Debt/EBITDA above 3.0x — lenders may view this as overleveraged relative to earnings");
            if (reportData?.existingDebt && reportData.existingDebt.toLowerCase()!=="nil" && reportData.existingDebt!=="Not provided") flags.push(`Existing debt of ${reportData.existingDebt} — lenders will factor this into total exposure`);
            const rkpi = kpis?.find(k=>k.label?.toLowerCase().includes("runway"));
            if (rkpi && parseFloat(rkpi.value)<6) flags.push("Runway below 6 months — banks may see this as distress. Consider raising equity first");
            return flags.length>0 ? (
              <Card style={{ borderLeft:`3px solid ${C.amber}`, background:`${C.amber}06` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.amber, marginBottom:12 }}>{"Auto-Flagged Issues"}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {flags.map((f,i) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"9px 12px", borderRadius:8, background:"rgba(255,255,255,0.6)", fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6 }}>
                      <span style={{ color:C.amber, flexShrink:0 }}>{"•"}</span>{f}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null;
          })()}

          {/* IMPROVEMENTS */}
          {Array.isArray(reportData?.loanImprovements) && reportData.loanImprovements.some(x=>x) && (
            <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.blue, marginBottom:12 }}>{"Recommended Improvements"}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {reportData.loanImprovements.filter(x=>x).map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 14px", borderRadius:8, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6, alignItems:"flex-start" }}>
                    <span style={{ fontFamily:FM, fontWeight:700, color:C.blue, background:`${C.blue}15`, borderRadius:6, padding:"2px 8px", fontSize:11, flexShrink:0, marginTop:1 }}>{i+1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* SCHEMES */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>{"Recommended Schemes"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { name:"SBI Startup Branch",     amount:"Up to Rs.50 Cr", rate:"Repo+2%",   note:"Dedicated startup desk. Garima has direct connect.",   color:C.blue,   hot:true  },
                { name:"SIDBI SPEED+",           amount:"Up to Rs.25 Cr", rate:"9.5-11%",  note:"For tech-enabled startups with 2+ years revenue.",     color:C.purple, hot:false },
                { name:"CGTMSE Collateral-free", amount:"Up to Rs.5 Cr",  rate:"Market",   note:"No collateral needed — govt-backed guarantee.",         color:C.teal,   hot:true  },
                { name:"Mudra Tarun",            amount:"Up to Rs.10L",   rate:"10-12%",   note:"Early stage and micro enterprises.",                    color:C.amber,  hot:false },
                { name:"NBFC / Fintech Debt",    amount:"Rs.25L-Rs.5 Cr", rate:"14-18%",  note:"Faster disbursement, lighter documentation.",           color:C.muted,  hot:false },
              ].map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 14px", borderRadius:12, background:C.bg2, border:`1px solid ${s.hot?s.color+"30":C.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0, marginTop:5 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{s.name}</span>
                      {s.hot && <span style={{ fontFamily:F, fontSize:10, fontWeight:700, color:s.color, background:`${s.color}15`, padding:"2px 8px", borderRadius:100 }}>{"RECOMMENDED"}</span>}
                    </div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:2 }}>{s.amount}{" | "}{s.rate}</div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.dim }}>{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* DOCS CHECKLIST */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>{"Documents Checklist"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { doc:"Last 2 years ITR (Company and Directors)",           done:true  },
                { doc:"Last 12 months Bank Statements",                     done:true  },
                { doc:"Audited Financials (P&L and Balance Sheet)",         done:true  },
                { doc:"GST Returns last 12 months",                         done:true  },
                { doc:"CA-certified Financial Projections (3 years)",       done:false },
                { doc:"Business Plan and Pitch Deck",                       done:false },
                { doc:"KYC — Directors and Company",                        done:true  },
                { doc:"MCA Filings and Incorporation Certificate",          done:true  },
                { doc:"Existing Loan and Liability Statement",              done:false },
                { doc:"CIBIL Credit Report (all directors)",                done:false },
              ].map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, background:item.done?`${C.green}08`:C.bg2, border:`1px solid ${item.done?C.green+"20":C.border}` }}>
                  <span style={{ fontSize:14 }}>{item.done ? "✅" : "⬜"}</span>
                  <span style={{ fontFamily:F, fontSize:13, color:item.done?C.text:C.muted }}>{item.doc}</span>
                  <span style={{ marginLeft:"auto", fontFamily:F, fontSize:10, fontWeight:700, color:item.done?C.green:C.amber, background:item.done?`${C.green}15`:`${C.amber}15`, padding:"2px 8px", borderRadius:100 }}>{item.done?"Ready":"Pending"}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <Card style={{ background:`${C.blue}06`, borderColor:`${C.blue}20` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>{"Ready to apply?"}</div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:14 }}>
              {"Garima can prepare your complete loan application package — projections, ratios, business plan, lender deck — and connect you with SBI Startup Branch or SIDBI."}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`, color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>{"💬 WhatsApp Garima"}</a>
              <button onClick={() => { const html = generateLoanPDF({ client, reportData, kpis }); const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:12, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`, color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {"📄 Download Full Report"}
              </button>
              <div style={{ display:"inline-flex", alignItems:"center", padding:"11px 20px", borderRadius:12, background:`${C.purple}10`, border:`1.5px solid ${C.purple}20`, fontFamily:F, fontSize:12, fontWeight:600, color:C.purple }}>{"Loan Package from Rs.15,000"}</div>
            </div>
          </Card>

        </div>
      )}

      {tab === "boardpacks" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          {archiveDocs.length === 0 && !isDemo && (
            <Card style={{ textAlign:"center", padding:"32px 0", marginBottom:16 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>No packs uploaded yet. Garima will upload your monthly pack here.</div>
            </Card>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="CFO Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.blue}06`, borderColor:`${C.blue}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              📅 <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
              Questions?{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>💬 WhatsApp Garima</a>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function BoardPacksTabbed() {
  const [tab, setTab] = useState("msme");
  const tabs = [
    { id:"msme",      label:"MSME Pack",     icon:"🏢", color:C.blue   },
    { id:"corporate", label:"Corporate Pack", icon:"🏦", color:C.purple },
    { id:"cfo",       label:"CFO Pack",       icon:"📊", color:C.teal   },
  ];
  const content = { msme:<MSMEPackContent/>, corporate:<CorporatePackContent/>, cfo:<CFOPackContent/> };
  return (
    <div>
      <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:20 }}>
        Monthly packs prepared by Garima — updated by the 20th of each month.
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"10px 18px", borderRadius:100, border:"none", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700, transition:"all 0.15s", background:tab===t.id?t.color:C.bg2, color:tab===t.id?"white":C.muted, outline:`1.5px solid ${tab===t.id?t.color:C.border}`, boxShadow:tab===t.id?`0 4px 14px ${t.color}35`:"none", touchAction:"manipulation" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {content[tab]}
      <Card style={{ marginTop:24, background:`${C.blue}06`, borderColor:`${C.blue}20` }}>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
          📅 <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
          Questions about the pack?{" "}
          <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>💬 WhatsApp Garima</a>
        </div>
      </Card>
    </div>
  );
}

// ─── CFO PACKS (existing component) ──────────────────────────────────────────
function CFOPacks({ client, reportData }) {
  const packType  = client.client_pack || client.clientPack || "startup";
  const data      = CFO_PACK_DATA[packType];
  const [tab, setTab] = useState("pack"); // "pack" | "boardpacks"
  const [liveDocs, setLiveDocs] = useState([]);
  const isDemo = client?.isDemo === true;

  const fetchLiveDocs = React.useCallback(() => {
    if (isDemo || !client?.id) return;
    supabase.from("documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .then(({ data: docs }) => {
        if (docs?.length) {
          // Show: Garima uploads + any client-generated packs (contain pack/report keywords)
          const packDocs = docs.filter(d =>
            ["garima", "Garima", "Garima Agarwal"].includes(d.uploaded_by) ||
            d.name?.toLowerCase().includes("pack") ||
            d.name?.toLowerCase().includes("report") ||
            d.name?.toLowerCase().includes("board")
          );
          setLiveDocs(packDocs.length > 0 ? packDocs : docs);
        }
      });
  }, [client?.id, isDemo]);

  useEffect(() => { fetchLiveDocs(); }, [fetchLiveDocs]);

  // Map live docs to ARCHIVE format, fall back to static ARCHIVE for demo
  const archiveDocs = liveDocs.length > 0
    ? liveDocs.map(d => ({
        name: d.name,
        date: d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—",
        size: d.file_size || "—",
        uploadedAt: d.created_at || "",
        file_url: d.file_url,
        new: d.created_at ? (new Date() - new Date(d.created_at)) < 35 * 24 * 60 * 60 * 1000 : false,
      }))
    : ARCHIVE;

  return (
    <div style={{ padding:24 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:data.grad,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
            {data.icon}
          </div>
          <div>
            <h2 style={{ fontFamily:F, fontWeight:700, fontSize:18, color:C.text, margin:0 }}>{data.label}</h2>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0 }}>{data.tagline}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["pack","📊 Smart Analysis"],["boardpacks","📁 Board Packs"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"9px 18px", borderRadius:100, border:"none", cursor:"pointer",
            fontFamily:F, fontSize:13, fontWeight:600, transition:"all 0.15s",
            background: tab===id ? data.color : C.bg3,
            color: tab===id ? "white" : C.muted,
            boxShadow: tab===id ? `0 4px 14px ${data.color}35` : "none",
            touchAction:"manipulation",
          }}>{label}</button>
        ))}
      </div>

      {tab === "pack" && (
        <>
          {/* Garima's note */}
          <Card style={{ marginBottom:20, borderLeft:`3px solid ${data.color}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:data.color, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
              📝 Garima's Analysis — Feb 2026
            </div>
            <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0, whiteSpace:"pre-wrap" }}>
              {reportData?.packNote || data.garimaNote}
            </p>
          </Card>

          {packType === "startup"   && <StartupCFOPack   data={data} client={client} reportData={reportData}/>}
          {packType === "msme"      && <MSMECFOPack      data={data} reportData={reportData}/>}
          {packType === "corporate" && <CorporateCFOPack data={data} reportData={reportData}/>}

          <div style={{ textAlign:"center", marginTop:8 }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13 }}>
              💬 Discuss this pack with Garima
            </a>
          </div>
        </>
      )}


      {tab === "boardpacks" && <BoardPacksTabbed/>}

      <style>{`
        @media(max-width:600px){.inv-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:400px){.inv-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}

// ─── VALUATION ENGAGEMENT ────────────────────────────────────────────────────
function Engagement({ liveData }) {
  // Merge live data from Supabase with dummy fallback
  const eng = liveData ? {
    type:         liveData.type         || ENGAGEMENT.type,
    ref:          liveData.ref_number   || ENGAGEMENT.ref,
    status:       liveData.status       ?? ENGAGEMENT.status,
    stages:       ENGAGEMENT.stages,
    expectedDate: liveData.expected_date|| ENGAGEMENT.expectedDate,
    docs:         ENGAGEMENT.docs,      // docs still from dummy until wired separately
    garimaNote:   liveData.garima_note  || null,
  } : ENGAGEMENT;
  const pct = (eng.status / (eng.stages.length - 1)) * 100;

  return (
    <div style={{ padding:24 }}>
      <SectionTitle sub="Live status of your valuation engagement.">
        Valuation Status
      </SectionTitle>

      {/* Status card */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Engagement</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text }}>{eng.type}</div>
            <div style={{ fontFamily:FM, fontSize:12, color:C.muted, marginTop:3 }}>Ref: {eng.ref}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Expected</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.blue }}>{eng.expectedDate}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position:"relative", marginBottom:24 }}>
          <div style={{ height:6, borderRadius:3, background:C.bg3, marginBottom:24 }}>
            <div style={{ height:"100%", borderRadius:3, background:C.grad1,
              width:`${pct}%`, transition:"width 0.6s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            {eng.stages.map((s,i) => (
              <div key={i} style={{ textAlign:"center", flex:1 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", margin:"0 auto 6px",
                  background: i <= eng.status ? C.blue : C.bg3,
                  border: i === eng.status ? `3px solid ${C.blue}` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: i === eng.status ? `0 0 0 4px ${C.blue}25` : "none",
                  transition:"all 0.3s" }}>
                  {i < eng.status && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
                  {i === eng.status && <span style={{ width:8, height:8, borderRadius:"50%", background:"white", display:"block" }}/>}
                </div>
                <div style={{ fontFamily:F, fontSize:10, color: i <= eng.status ? C.blue : C.dim,
                  fontWeight: i === eng.status ? 700 : 500, lineHeight:1.3 }}>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.blue}08`,
          border:`1px solid ${C.blue}20` }}>
          <span style={{ fontFamily:F, fontSize:13, color:C.blue, fontWeight:600 }}>
            📌 Currently: <strong>{eng.stages[eng.status]}</strong> — Garima is building the DCF model. On track for {eng.expectedDate}.
          </span>
        </div>
      </Card>

      {/* Document checklist */}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
          Document Checklist
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {eng.docs.map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
              borderRadius:10, background: d.done ? `${C.green}08` : C.bg,
              border:`1px solid ${d.done ? C.green+"25" : C.border}` }}>
              <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                background: d.done ? C.green : C.bg3,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {d.done && <span style={{ color:"white", fontSize:11, fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ fontFamily:F, fontSize:13, color: d.done ? C.green : C.muted,
                fontWeight: d.done ? 600 : 500 }}>{d.name}</span>
              {!d.done && <Badge color={C.amber} bg="#FFFBEB">Pending</Badge>}
            </div>
          ))}
        </div>
        {eng.docs.some(d => !d.done) && (
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10,
            background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
              ⚠️ Please upload pending documents to avoid delays. Send to garima@finzzup.com or WhatsApp.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function Calendar() {
  return (
    <div style={{ padding:24 }}>
      <SectionTitle sub="Book a 30-min Valuation call or 60-min CFO Strategy session with Garima.">
        Book a Call
      </SectionTitle>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }} className="cal-grid">
        <a href="https://calendly.com/agrgarima/30min" target="_blank" rel="noopener"
          style={{ textDecoration:"none" }}>
          <Card style={{ padding:24, borderTop:`3px solid ${C.blue}`, cursor:"pointer",
            transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(59,111,247,0.15)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ fontSize:32, marginBottom:14 }}>⚡</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:8 }}>
              30-min Valuation Call
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20 }}>
              Questions about your valuation report, methodology, UDIN, or Section 56(2)(viib) compliance.
            </p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 16px", borderRadius:10, background:C.blue }}>
              <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"white" }}>Book 30-min</span>
              <span style={{ color:"white", fontSize:16 }}>→</span>
            </div>
            <div style={{ marginTop:8, fontFamily:F, fontSize:11, color:C.dim, textAlign:"center" }}>
              Opens Calendly in a new tab
            </div>
          </Card>
        </a>

        <a href="https://calendly.com/agrgarima/cfo-strategy-call" target="_blank" rel="noopener"
          style={{ textDecoration:"none" }}>
          <Card style={{ padding:24, borderTop:`3px solid ${C.purple}`, cursor:"pointer",
            transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(124,92,245,0.15)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ fontSize:32, marginBottom:14 }}>🧠</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:8 }}>
              60-min CFO Strategy Call
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20 }}>
              Monthly CFO review, cash flow planning, investor prep, board pack walkthrough.
            </p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 16px", borderRadius:10, background:C.purple }}>
              <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"white" }}>Book 60-min</span>
              <span style={{ color:"white", fontSize:16 }}>→</span>
            </div>
            <div style={{ marginTop:8, fontFamily:F, fontSize:11, color:C.dim, textAlign:"center" }}>
              Opens Calendly in a new tab
            </div>
          </Card>
        </a>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>
          📋 What to expect
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { icon:"⚡", title:"30-min Valuation", desc:"Best for: UDIN queries, valuation report review, methodology questions, Section 56 compliance." },
            { icon:"🧠", title:"60-min CFO Strategy", desc:"Best for: Monthly review, fundraise prep, cash flow planning, board pack walkthrough, investor narrative." },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:10, background:C.bg }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{item.title}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ padding:"12px 16px", borderRadius:12,
        background:`${C.green}06`, border:`1px solid ${C.green}20` }}>
        <div style={{ fontFamily:F, fontSize:12, color:"#047857", lineHeight:1.7 }}>
          💬 Can't find a slot? WhatsApp Garima directly at{" "}
          <a href={WA} target="_blank" rel="noopener"
            style={{ color:C.green, fontWeight:700 }}>+91 98335 85810</a>
        </div>
      </div>
      <style>{`@media(max-width:500px){.cal-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

// ─── DOWNLOAD UTILITIES ───────────────────────────────────────────────────────
function downloadInvoicePDF(inv, client) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${inv.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#0F1A38;padding:48px;font-size:13px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand{font-size:26px;font-weight:800;color:#3B6FF7;letter-spacing:-0.5px}
  .brand-tag{font-size:11px;color:#6B7DB3;margin-top:2px}
  .from{margin-top:10px;font-size:12px;color:#6B7DB3;line-height:1.7}
  .inv-num{font-size:22px;font-weight:700;text-align:right}
  .badge{display:inline-block;padding:4px 14px;border-radius:100px;font-size:11px;font-weight:700;
    margin-top:6px;background:${inv.status==='paid'?'#ECFDF5':'#FFFBEB'};
    color:${inv.status==='paid'?'#10B981':'#F59E0B'}}
  .dates{font-size:12px;color:#6B7DB3;margin-top:8px;text-align:right;line-height:1.7}
  hr{border:none;border-top:1px solid #E2E7F0;margin:24px 0}
  .bill-to{margin-bottom:28px}
  .label{font-size:10px;font-weight:700;color:#6B7DB3;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
  .val{font-size:13px;line-height:1.7}
  table{width:100%;border-collapse:collapse;margin-bottom:0}
  th{font-size:10px;font-weight:700;color:#6B7DB3;text-transform:uppercase;letter-spacing:0.06em;
    padding:8px 12px;border-bottom:2px solid #E2E7F0;text-align:left}
  td{padding:12px;border-bottom:1px solid #E2E7F0}
  .total-row{display:flex;justify-content:flex-end;align-items:center;padding:16px 0;border-top:2px solid #0F1A38;margin-top:4px;gap:32px}
  .total-label{font-size:14px;font-weight:700;color:#6B7DB3}
  .total-val{font-size:24px;font-weight:800;color:#3B6FF7}
  .footer{margin-top:40px;padding:16px 20px;background:#F7F8FC;border-radius:8px;
    font-size:11px;color:#6B7DB3;line-height:1.8}
  @media print{body{padding:24px}}
</style></head>
<body>
<div class="hdr">
  <div>
    <div class="brand">Finzzup</div>
    <div class="brand-tag">Build. Value. Scale.</div>
    <div class="from">Finzzup Advisory LLP<br/>garima@finzzup.com<br/>Mumbai, India</div>
  </div>
  <div>
    <div style="font-size:10px;color:#6B7DB3;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Invoice</div>
    <div class="inv-num">${inv.id}</div>
    <div class="badge">${inv.status==='paid'?'✓ Paid':'⏳ Payment Due'}</div>
    <div class="dates">Issued: ${inv.date}<br/>Due: ${inv.due}</div>
  </div>
</div>
<hr/>
<div class="bill-to">
  <div class="label">Bill To</div>
  <div class="val"><strong>${client?.name||''}</strong><br/>${client?.company||''}<br/>${client?.email||''}</div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${(inv.items||[]).map(it=>`<tr><td>${it.desc}</td><td>${it.qty}</td><td style="text-align:right">${it.unit}</td><td style="text-align:right"><strong>${it.total}</strong></td></tr>`).join('')}
  </tbody>
</table>
<div class="total-row">
  <div class="total-label">Total Amount</div>
  <div class="total-val">${inv.amount}</div>
</div>
<div class="footer">
  <strong>Finzzup Advisory LLP</strong> · GSTIN: [Add GSTIN] · PAN: [Add PAN]<br/>
  Bank: [Bank Name] · A/C No: [Account Number] · IFSC: [IFSC Code]<br/>
  To pay: transfer to the above account and WhatsApp UTR to +91 98335 85810<br/>
  Queries: garima@finzzup.com — This is a system-generated invoice.
</div>
</body></html>`;
  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.onload = () => win.print();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── NEW REQUEST ──────────────────────────────────────────────────────────────
function NewRequest({ client, setPage }) {
  const [step, setStep]     = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm]     = useState({ name:"", company:"", email:"", phone:"", notes:"" });
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const SERVICES = [
    { id:"val-starter",  name:"Valuation · Starter",       tag:"Compliance",  tagColor:C.purple, price:"₹30,000 onwards",  desc:"DCF or NAV, IBBI-signed, 5–7 days" },
    { id:"val-pro",      name:"Valuation · Professional",  tag:"Fundraising", tagColor:C.pink,   price:"₹65,000 onwards",  desc:"Full IB-quality, peer comps, sensitivity", popular:true },
    { id:"frac-cfo",     name:"Fractional CFO",            tag:"Ongoing",     tagColor:C.amber,  price:"₹50,000 / month",  desc:"MIS, forecasting, board packs, min. 3 months" },
    { id:"esop-val",     name:"ESOP Valuation",            tag:"ESOP",        tagColor:C.teal,   price:"₹25,000 onwards",  desc:"409A-style, SEBI IPEV compliant" },
    { id:"ppa",          name:"Purchase Price Allocation",  tag:"M&A",         tagColor:C.blue,   price:"₹80,000 onwards",  desc:"Ind AS 103, intangible identification" },
    { id:"fema-fdi",     name:"FEMA / FDI Valuation",      tag:"Regulatory",  tagColor:C.red,    price:"₹40,000 onwards",  desc:"Inbound & outbound FDI compliance" },
  ];

  const handleSubmit = async () => {
    if (!agreed) { alert("Please agree to the terms to proceed."); return; }
    setLoading(true);
    try {
      // Save to Supabase requests table
      await supabase.from("requests").insert({
        client_id:   client?.id || null,
        client_name: form.name || client?.name || "",
        company:     form.company || client?.company || "",
        email:       form.email || client?.email || "",
        phone:       form.phone || "",
        service_id:  selected,
        service_name: SERVICES.find(s=>s.id===selected)?.name || selected,
        notes:       form.notes || "",
        status:      "new",
        created_at:  new Date().toISOString(),
      });
    } catch(e) {
      // If table doesn't exist yet, still complete UX flow
      console.warn("Requests table not found — request not saved to DB:", e.message);
    }
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ padding:32, maxWidth:520 }}>
      <Card style={{ textAlign:"center", padding:48 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontFamily:F, fontWeight:800, fontSize:22, color:C.text, marginBottom:8 }}>Request Submitted!</h2>
        <p style={{ fontFamily:F, fontSize:14, color:C.muted, lineHeight:1.7, marginBottom:24 }}>
          Garima will review your request and send a scoped proposal within 24 hours. You'll hear from her at <strong>{form.email || client?.email}</strong>.
        </p>
        <div style={{ padding:"12px 16px", borderRadius:12, background:`${C.green}0A`,
          border:`1px solid ${C.green}25`, marginBottom:20 }}>
          <div style={{ fontFamily:F, fontSize:13, color:C.green, fontWeight:600 }}>
            ✅ {SERVICES.find(s=>s.id===selected)?.name}
          </div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>
            Expected response: within 24 hours
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={() => { setStep(1); setSelected(null); setSubmitted(false); setForm({ name:"", company:"", email:"", phone:"", notes:"" }); setAgreed(false); }}
            style={{ padding:"10px 20px", borderRadius:10, border:`1.5px solid ${C.border}`,
              background:"none", fontFamily:F, fontWeight:600, fontSize:13, color:C.muted, cursor:"pointer" }}>
            Make another request
          </button>
          <button onClick={() => setPage("overview")}
            style={{ padding:"10px 20px", borderRadius:10, border:"none",
              background:C.grad1, color:"white", fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Back to Overview →
          </button>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ padding:24, maxWidth:900 }}>
      <SectionTitle sub="Get a scoped proposal within 24 hours.">Request a Service</SectionTitle>

      {/* Stepper */}
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28, maxWidth:500 }}>
        {[["1","Select Service"],["2","Your Details"],["3","Confirm"]].map(([n,lbl],i) => (
          <div key={n} style={{ display:"flex", alignItems:"center", flex:i<2?1:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:"50%",
                background: step>parseInt(n) ? C.green : step===parseInt(n) ? C.blue : C.bg3,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700, color: step>=parseInt(n) ? "white" : C.muted,
                flexShrink:0, transition:"all 0.3s" }}>
                {step>parseInt(n) ? "✓" : n}
              </div>
              <span style={{ fontFamily:F, fontSize:13, fontWeight:600,
                color: step===parseInt(n) ? C.text : C.muted, whiteSpace:"nowrap" }}>{lbl}</span>
            </div>
            {i < 2 && <div style={{ flex:1, height:1, background:step>i+1?C.blue:C.border, margin:"0 12px", transition:"background 0.3s" }}/>}
          </div>
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }} className="nr-grid">
            {SERVICES.map(s => (
              <div key={s.id} onClick={() => setSelected(s.id)}
                style={{ position:"relative", padding:20, borderRadius:14,
                  border:`2px solid ${selected===s.id ? C.blue : C.border}`,
                  background: selected===s.id ? `${C.blue}06` : C.bg2,
                  cursor:"pointer", transition:"all 0.2s",
                  boxShadow: selected===s.id ? `0 0 0 4px ${C.blue}15` : "none" }}>
                {s.popular && (
                  <div style={{ position:"absolute", top:-10, right:16,
                    background:C.grad3, color:"white", fontSize:10, fontWeight:800,
                    padding:"3px 10px", borderRadius:100, fontFamily:F }}>Most Popular</div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text }}>{s.name}</div>
                  <Badge color={s.tagColor}>{s.tag}</Badge>
                </div>
                <div style={{ fontFamily:FM, fontWeight:700, fontSize:18, color:C.blue, marginBottom:4 }}>{s.price}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { if (!selected) { alert("Please select a service."); return; } setStep(2); }}
            style={{ padding:"14px 32px", borderRadius:12, border:"none",
              background: selected ? C.grad1 : C.bg3, color: selected ? "white" : C.muted,
              fontFamily:F, fontWeight:700, fontSize:15, cursor: selected ? "pointer" : "default",
              boxShadow: selected ? "0 6px 20px rgba(59,111,247,0.28)" : "none", transition:"all 0.2s" }}>
            Continue →
          </button>
          <style>{`@media(max-width:600px){.nr-grid{grid-template-columns:1fr!important}}`}</style>
        </>
      )}

      {/* Step 2: Your Details */}
      {step === 2 && (
        <div style={{ maxWidth:480 }}>
          <Card style={{ marginBottom:16, padding:"12px 16px", background:`${C.blue}06`, border:`1px solid ${C.blue}20` }}>
            <div style={{ fontFamily:F, fontSize:13, color:C.blue, fontWeight:600 }}>
              Selected: {SERVICES.find(s=>s.id===selected)?.name} — {SERVICES.find(s=>s.id===selected)?.price}
            </div>
          </Card>
          {[
            { key:"name",    label:"Full Name",    type:"text",  ph:"Your name",         val:client?.name||"" },
            { key:"company", label:"Company",      type:"text",  ph:"Company name",      val:client?.company||"" },
            { key:"email",   label:"Email",        type:"email", ph:"your@email.com",    val:client?.email||"" },
            { key:"phone",   label:"Phone / WhatsApp", type:"tel", ph:"+91 98765 43210", val:"" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.08em", display:"block", marginBottom:7, fontFamily:F }}>{f.label}</label>
              <input value={form[f.key] || f.val}
                onChange={e => setForm(fv=>({...fv,[f.key]:e.target.value}))}
                type={f.type} placeholder={f.ph}
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:15,
                  border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                  background:C.bg, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
            </div>
          ))}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
              letterSpacing:"0.08em", display:"block", marginBottom:7, fontFamily:F }}>
              Additional Notes (optional)
            </label>
            <textarea rows={3} value={form.notes}
              onChange={e => setForm(f=>({...f,notes:e.target.value}))}
              placeholder="Any specific requirements, timelines, or questions..."
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:14,
                border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
            />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(1)}
              style={{ padding:"12px 20px", borderRadius:10, border:`1px solid ${C.border}`,
                background:"none", fontFamily:F, fontWeight:600, fontSize:14, color:C.muted, cursor:"pointer" }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              style={{ flex:1, padding:"13px 0", borderRadius:10, border:"none",
                background:C.grad1, color:"white", fontFamily:F, fontWeight:700, fontSize:15,
                cursor:"pointer", boxShadow:"0 6px 20px rgba(59,111,247,0.28)" }}>
              Review Request →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div style={{ maxWidth:480 }}>
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>
              Request Summary
            </div>
            {[
              ["Service",  SERVICES.find(s=>s.id===selected)?.name],
              ["Pricing",  SERVICES.find(s=>s.id===selected)?.price],
              ["Name",     form.name   || client?.name],
              ["Company",  form.company|| client?.company],
              ["Email",    form.email  || client?.email],
              ["Phone",    form.phone  || "Not provided"],
              form.notes ? ["Notes", form.notes] : null,
            ].filter(Boolean).map(([k,v],i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                padding:"8px 0", borderBottom:`1px solid ${C.border}`, gap:10 }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.muted, fontWeight:600, minWidth:80 }}>{k}</span>
                <span style={{ fontFamily:F, fontSize:13, color:C.text, textAlign:"right" }}>{v}</span>
              </div>
            ))}
          </Card>

          {/* Terms checkbox */}
          <div style={{ padding:"14px 16px", borderRadius:12, background:`${C.blue}06`,
            border:`1px solid ${C.blue}20`, marginBottom:16, display:"flex", gap:10, alignItems:"flex-start" }}>
            <input type="checkbox" id="terms-agree" checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop:3, width:16, height:16, cursor:"pointer", accentColor:C.blue }}/>
            <label htmlFor="terms-agree" style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.7, cursor:"pointer" }}>
              I agree to Finzzup's{" "}
              <button onClick={() => setPage("terms")} style={{ background:"none", border:"none", color:C.blue, fontWeight:700, cursor:"pointer", fontFamily:F, fontSize:12, padding:0 }}>
                Terms & Conditions
              </button>
              {" "}and{" "}
              <button onClick={() => setPage("terms")} style={{ background:"none", border:"none", color:C.blue, fontWeight:700, cursor:"pointer", fontFamily:F, fontSize:12, padding:0 }}>
                Privacy Policy
              </button>
              . I understand this is a request for a scoped proposal, not a confirmed engagement.
            </label>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(2)}
              style={{ padding:"12px 20px", borderRadius:10, border:`1px solid ${C.border}`,
                background:"none", fontFamily:F, fontWeight:600, fontSize:14, color:C.muted, cursor:"pointer" }}>
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex:1, padding:"13px 0", borderRadius:10, border:"none",
                background: agreed ? C.grad1 : C.bg3, color: agreed ? "white" : C.muted,
                fontFamily:F, fontWeight:700, fontSize:15,
                cursor: agreed && !loading ? "pointer" : "default",
                opacity: loading ? 0.75 : 1,
                boxShadow: agreed ? "0 6px 20px rgba(59,111,247,0.28)" : "none", transition:"all 0.2s" }}>
              {loading ? "Submitting…" : "Submit Request 🚀"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
const DEMO_INVOICES = [
  { id:"INV-2026-003", date:"20 Feb 2026", due:"05 Mar 2026", service:"Fractional CFO — February 2026", amount:"₹50,000", status:"unpaid", items:[{ desc:"Fractional CFO Retainer (Feb 2026)", qty:1, unit:"₹50,000", total:"₹50,000" }] },
  { id:"INV-2026-002", date:"20 Jan 2026", due:"05 Feb 2026", service:"Fractional CFO — January 2026",  amount:"₹50,000", status:"paid",   items:[{ desc:"Fractional CFO Retainer (Jan 2026)", qty:1, unit:"₹50,000", total:"₹50,000" }] },
  { id:"INV-2026-001", date:"15 Jan 2026", due:"30 Jan 2026", service:"DCF Valuation — Series A Pre-Funding", amount:"₹65,000", status:"paid", items:[{ desc:"Valuation Report (DCF + Comps)", qty:1, unit:"₹65,000", total:"₹65,000" }] },
];

function Invoices({ client, liveInvoices }) {
  // Use live data if provided (real client), else demo data
  const allInvoices = liveInvoices && liveInvoices.length > 0 ? liveInvoices.map(inv => ({
    id:      inv.invoice_number || inv.id,
    date:    inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—",
    due:     inv.due_date    ? new Date(inv.due_date).toLocaleDateString("en-IN",    { day:"numeric", month:"short", year:"numeric" }) : "—",
    service: inv.service || inv.description || "Service",
    amount:  inv.amount ? `₹${Number(inv.amount).toLocaleString("en-IN")}` : "—",
    status:  inv.status || "unpaid",
    items:   [{ desc: inv.description || inv.service || "Service", qty:1, unit: inv.amount ? `₹${Number(inv.amount).toLocaleString("en-IN")}` : "—", total: inv.amount ? `₹${Number(inv.amount).toLocaleString("en-IN")}` : "—" }],
  })) : DEMO_INVOICES;
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);

  const unpaid = allInvoices.filter(i=>i.status==="unpaid");
  const paid   = allInvoices.filter(i=>i.status==="paid");

  const InvoiceCard = ({ inv }) => {
    const isUnpaid = inv.status === "unpaid";
    return (
      <div style={{ padding:"16px 18px", borderRadius:12,
        border:`1.5px solid ${isUnpaid ? C.amber+"50" : C.border}`,
        background: isUnpaid ? `${C.amber}05` : C.bg2,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:10,
            background: isUnpaid ? `${C.amber}15` : `${C.green}15`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
            {isUnpaid ? "⏳" : "✅"}
          </div>
          <div>
            <div style={{ fontFamily:FM, fontSize:12, fontWeight:700, color:C.muted, marginBottom:2 }}>{inv.id}</div>
            <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{inv.service}</div>
            <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>
              Issued: {inv.date} · Due: {inv.due}
            </div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:FM, fontSize:20, fontWeight:700, color: isUnpaid ? C.amber : C.green }}>
            {inv.amount}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8, justifyContent:"flex-end" }}>
            <button onClick={() => { setSelected(inv); setView("detail"); }}
              style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${C.border}`,
                background:C.bg, fontFamily:F, fontWeight:600, fontSize:12, color:C.muted, cursor:"pointer" }}>
              View Invoice
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (view === "detail" && selected) return (
    <div style={{ padding:24, maxWidth:620 }}>
      <button onClick={() => setView("list")}
        style={{ fontFamily:F, fontSize:13, color:C.blue, background:"none", border:"none",
          cursor:"pointer", marginBottom:20, padding:0, fontWeight:600 }}>
        ← Back to Invoices
      </button>

      {/* Invoice header */}
      <div style={{ padding:"28px 32px", borderRadius:16,
        background:"linear-gradient(135deg,#0A1128 0%,#1a2a5e 100%)",
        color:"white", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120,
          borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:FM, fontSize:11, opacity:0.5, marginBottom:4, letterSpacing:"0.08em" }}>INVOICE</div>
            <div style={{ fontFamily:FM, fontWeight:700, fontSize:22, marginBottom:6 }}>{selected.id}</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>Finzzup Advisory LLP</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>garima@finzzup.com</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <Badge color={selected.status==="paid"?C.green:C.amber}
              bg={selected.status==="paid"?"#ECFDF5":"#FFFBEB"}>
              {selected.status==="paid" ? "✅ Paid" : "⏳ Due"}
            </Badge>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6, marginTop:8 }}>Issued: {selected.date}</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>Due: {selected.due}</div>
          </div>
        </div>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>Bill To</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{client?.name}</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>{client?.company}</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>{client?.email}</div>
      </Card>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>Services</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:"10px 16px",
          fontFamily:F, fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase",
          letterSpacing:"0.06em", marginBottom:10 }}>
          <span>Description</span><span>Qty</span><span>Rate</span><span>Total</span>
        </div>
        {selected.items.map((item,i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:"8px 16px",
            alignItems:"center", padding:"10px 0", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontFamily:F, fontSize:13, color:C.text }}>{item.desc}</span>
            <span style={{ fontFamily:FM, fontSize:12, color:C.muted }}>{item.qty}</span>
            <span style={{ fontFamily:FM, fontSize:12, color:C.muted }}>{item.unit}</span>
            <span style={{ fontFamily:FM, fontSize:13, fontWeight:700, color:C.text }}>{item.total}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", padding:"14px 0 0",
          borderTop:`2px solid ${C.border}`, marginTop:8 }}>
          <div style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:C.blue }}>
            Total: {selected.amount}
          </div>
        </div>
      </Card>

      {/* Contact to pay */}
      {selected.status === "unpaid" && (
        <div style={{ padding:"14px 18px", borderRadius:12, background:`${C.amber}08`,
          border:`1px solid ${C.amber}25`, marginBottom:12 }}>
          <div style={{ fontFamily:F, fontSize:13, color:C.amber, fontWeight:600, marginBottom:4 }}>
            ⏳ Payment Due: {selected.amount}
          </div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
            To pay, please transfer to Garima's bank account (details on the invoice PDF) and WhatsApp the UTR to{" "}
            <a href={WA} target="_blank" rel="noopener"
              style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          // Build a minimal invoice object if coming from live data
          downloadInvoicePDF(selected, client);
        }}
        style={{ width:"100%", padding:"13px 0", borderRadius:12, border:`1.5px solid ${C.blue}`,
          background:"transparent", color:C.blue, fontFamily:F, fontWeight:700, fontSize:14,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        ⬇️ Download Invoice PDF
      </button>
    </div>
  );

  return (
    <div style={{ padding:24 }}>
      <SectionTitle sub="Auto-generated invoices for your engagements.">Invoices</SectionTitle>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }} className="inv-sum">
        {[
          { label:"Total Outstanding", value:"₹50,000", color:C.amber, icon:"⏳" },
          { label:"Paid This Year",    value:"₹1,15,000",color:C.green, icon:"✅" },
          { label:"Total Invoices",    value:"3",         color:C.blue,  icon:"📄" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:18, textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontFamily:FM, fontSize:22, fontWeight:700, color:s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {unpaid.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:"uppercase",
            letterSpacing:"0.08em", marginBottom:12, fontFamily:F }}>Outstanding ({unpaid.length})</div>
          {unpaid.map(inv => <InvoiceCard key={inv.id} inv={inv}/>)}
        </div>
      )}

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:12, fontFamily:F }}>Paid ({paid.length})</div>
        {paid.map(inv => <InvoiceCard key={inv.id} inv={inv}/>)}
      </div>

      <style>{`@media(max-width:500px){.inv-sum{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

// ─── MY DOCUMENTS ────────────────────────────────────────────────────────────
function MyDocuments({ client }) {
  const [docs,       setDocs]       = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [dragOver,   setDragOver]   = useState(false);
  const isDemo = client?.isDemo === true;

  // Load documents from Supabase on mount
  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    supabase.from("documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDocs(data || []); setLoading(false); });
  }, [client?.id, isDemo]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (isDemo) { alert("Uploads are disabled in demo mode."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large — max 10MB."); return; }
    setUploading(true);
    const path = `${client.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("client-docs").upload(path, file);
    if (upErr) { alert("Upload failed: " + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("client-docs").getPublicUrl(path);
    const { data: docRow } = await supabase.from("documents").insert({
      client_id:   client.id,
      name:        file.name,
      file_url:    urlData.publicUrl,
      file_size:   (file.size / 1024 / 1024).toFixed(2) + " MB",
      uploaded_by: client.name,
      created_at:  new Date().toISOString(),
    }).select().single();
    if (docRow) setDocs(prev => [docRow, ...prev]);
    setUploading(false);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  const handleDownload = (doc) => {
    if (!doc.file_url) { alert("File URL not available."); return; }
    const isReport = doc.doc_type === "report" || doc.file_url?.startsWith("data:text/html");
    if (isReport) {
      // data URL reports — open in new tab so they render as a webpage
      // Then client can use browser Print → Save as PDF
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(decodeURIComponent(doc.file_url.replace("data:text/html;charset=utf-8,", "")));
        win.document.close();
      }
      return;
    }
    const a = document.createElement("a");
    a.href = doc.file_url;
    a.download = doc.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fileIcon = (name, docType) => {
    if (docType === "report") return "📊";
    const ext = name?.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext))                    return "📄";
    if (["xls","xlsx","csv"].includes(ext))       return "📊";
    if (["doc","docx"].includes(ext))             return "📝";
    if (["jpg","jpeg","png","gif"].includes(ext)) return "🖼️";
    if (["zip","rar"].includes(ext))              return "🗜️";
    return "📎";
  };

  // DEMO placeholder docs so the page isn't empty
  const DEMO_DOCS = [
    { id:"d1", name:"Board Pack — February 2026.pdf",     file_size:"2.4 MB", uploaded_by:"garima", created_at:"2026-02-20", file_url: null },
    { id:"d2", name:"DCF Valuation Report — Jan 2026.pdf",file_size:"1.8 MB", uploaded_by:"garima", created_at:"2026-01-22", file_url: null },
    { id:"d3", name:"MIS Pack — Q3 FY26.xlsx",           file_size:"0.9 MB", uploaded_by:"garima", created_at:"2026-01-05", file_url: null },
    { id:"d4", name:"Cap Table — v4.xlsx",               file_size:"0.3 MB", uploaded_by:client?.name, created_at:"2026-01-10", file_url: null },
  ];
  const displayDocs = isDemo ? DEMO_DOCS : docs;

  return (
    <div style={{ padding:24, maxWidth:700 }}>
      <SectionTitle sub="Documents shared by Garima, and files you've uploaded.">My Documents</SectionTitle>

      {isDemo && (
        <div style={{ padding:"10px 16px", borderRadius:10, background:`${C.amber}0A`,
          border:`1px solid ${C.amber}25`, marginBottom:20,
          fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
          👋 Demo mode — uploads disabled. Real clients can upload and download files here.
        </div>
      )}

      {/* Upload area */}
      {!isDemo && (
        <Card style={{ marginBottom:20 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
            Upload a Document
          </div>
          <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
            Share financial statements, agreements, or any document with Garima. Max 10MB.
          </p>
          <label style={{ display:"block", padding:"28px 20px", borderRadius:12,
            border:`2px dashed ${dragOver ? C.blue : C.border}`,
            textAlign:"center", cursor:"pointer", background: dragOver ? `${C.blue}05` : C.bg,
            transition:"all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <input type="file" style={{ display:"none" }}
              onChange={e => { handleUpload(e.target.files[0]); e.target.value=""; }}/>
            {uploading ? (
              <div style={{ fontFamily:F, fontSize:14, color:C.blue, fontWeight:600 }}>
                ⏳ Uploading…
              </div>
            ) : (
              <>
                <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
                <div style={{ fontFamily:F, fontSize:14, fontWeight:600, color:C.text }}>
                  Click to upload or drag & drop
                </div>
                <div style={{ fontFamily:F, fontSize:12, color:C.dim, marginTop:4 }}>
                  PDF, Excel, Word, Images — max 10MB
                </div>
              </>
            )}
          </label>
        </Card>
      )}

      {/* Document list */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text }}>
            All Documents ({displayDocs.length})
          </div>
          {!isDemo && !loading && displayDocs.length > 0 && (
            <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>
              📁 From Garima + your uploads
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:"32px 0", fontFamily:F, fontSize:13, color:C.dim }}>
            Loading documents…
          </div>
        )}

        {!loading && displayDocs.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>
              No documents yet. Garima will upload your reports here.
            </div>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {displayDocs.map((doc, i) => {
            const byGarima = doc.uploaded_by === "garima" || doc.uploaded_by === "Garima Agarwal";
            return (
              <div key={doc.id || i} style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"12px 14px", borderRadius:10,
                background: byGarima ? `${C.blue}10` : C.bg,
                border:`1px solid ${byGarima ? C.blue+"40" : C.border}`,
                flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                  <div style={{ width:38, height:38, borderRadius:10,
                    background: byGarima ? `${C.blue}12` : `${C.muted}0A`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:18, flexShrink:0 }}>
                    {fileIcon(doc.name, doc.file_url?.startsWith("data:text/html") ? "report" : null)}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div title={doc.name} style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text,
                      wordBreak:"break-word", lineHeight:1.4 }}>
                      {doc.name}
                    </div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span>{doc.file_size}</span>
                      <span>·</span>
                      <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—"}</span>
                      <span>·</span>
                      <span style={{ color: byGarima ? C.blue : C.muted, fontWeight:600 }}>
                        {byGarima ? "📌 From Garima" : "👤 You"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  {/* Download button */}
                  <button
                    onClick={() => isDemo
                      ? alert("Download not available in demo mode. Real clients can download their files here.")
                      : handleDownload(doc)
                    }
                    style={{ padding:"7px 14px", borderRadius:8,
                      border:`1.5px solid ${C.blue}`, background:"transparent",
                      color:C.blue, fontFamily:F, fontWeight:700, fontSize:12,
                      cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {doc.file_url?.startsWith("data:text/html") ? "👁 View Report" : "⬇ Download"}
                  </button>

                  {/* Delete — only for files the client uploaded themselves */}
                  {!isDemo && !byGarima && (
                    <button onClick={() => handleDelete(doc)}
                      style={{ padding:"7px 10px", borderRadius:8,
                        border:`1px solid ${C.border}`, background:"none",
                        color:C.red, cursor:"pointer", fontSize:14 }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginTop:16, background:`${C.green}06`, border:`1px solid ${C.green}20` }}>
        <div style={{ fontFamily:F, fontSize:12, color:"#047857", lineHeight:1.7 }}>
          💬 <strong>Need to send a large file?</strong> WhatsApp it directly to Garima at{" "}
          <a href={WA} target="_blank" rel="noopener"
            style={{ color:C.green, fontWeight:700 }}>+91 98335 85810</a>
          {" "}or email{" "}
          <a href="mailto:garima@finzzup.com" style={{ color:C.green, fontWeight:700 }}>garima@finzzup.com</a>
        </div>
      </Card>
    </div>
  );
}

// ─── TREASURY MANAGEMENT ─────────────────────────────────────────────────────
function Treasury({ client, reportData }) {
  const [tab, setTab] = useState("overview");

  // Use live admin-entered data if available, else fall back to defaults
  const rd = reportData?.treasury;
  const TREASURY_DATA = {
    totalCash:    rd?.totalCash    || "₹50.4L",
    investedPct:  rd?.investedPct  || 65,
    yieldPA:      rd?.yieldPA      || "₹3.2L",
    cashPositions: (rd?.cashPositions?.some(p=>p.bank)) ? rd.cashPositions : [
      { bank:"HDFC Bank — Current A/C",   balance:"₹14.2L", type:"Operating",   rate:"3.5%",  flag:false },
      { bank:"SBI — Fixed Deposit",        balance:"₹25.0L", type:"FD (91 days)", rate:"7.1%",  flag:false },
      { bank:"Axis Bank — Sweep Account",  balance:"₹8.4L",  type:"Sweep FD",    rate:"6.8%",  flag:false },
      { bank:"ICICI Bank — Current A/C",   balance:"₹2.8L",  type:"Reserve",     rate:"0%",    flag:true,  note:"Consider sweeping to FD" },
    ],
    maturitySchedule: (rd?.maturitySchedule?.some(m=>m.item)) ? rd.maturitySchedule : [
      { item:"SBI FD — Tranche 1", maturity:"15 Mar 2026", amount:"₹10.0L", action:"Renew"     },
      { item:"SBI FD — Tranche 2", maturity:"28 Mar 2026", amount:"₹15.0L", action:"Redeem"    },
      { item:"Axis Sweep",         maturity:"Revolving",    amount:"₹8.4L",  action:"Auto-renew"},
    ],
    recommendations: (rd?.recommendations?.some(r=>r.text)) ? rd.recommendations : [
      { priority:"High",   text:"Renew SBI FD Tranche 1 — rates likely lower post April RBI meeting. Lock in 7.1% now." },
      { priority:"High",   text:"Redeem SBI Tranche 2 (₹15L) to fund March advance tax outflow — avoid OD." },
      { priority:"Medium", text:"Sweep ₹2.8L ICICI idle balance to sweep account — earn 6.8% vs 0%." },
      { priority:"Low",    text:"Consider a 30-day liquid fund for the April surplus (₹8L projected) — yield ~7.5%." },
    ],
  };

  return (
    <div style={{ padding:24 }}>
      <SectionTitle sub="Cash visibility, FD tracking, and yield optimisation.">Treasury Management</SectionTitle>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["overview","💰 Overview"],["maturity","📅 Maturity Schedule"],["recommendations","💡 Recommendations"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"9px 18px", borderRadius:100, border:"none",
            cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700, transition:"all 0.15s",
            background: tab===id ? C.blue : C.bg2, color: tab===id ? "white" : C.muted,
            outline:`1.5px solid ${tab===id ? C.blue : C.border}`,
            boxShadow: tab===id ? `0 4px 14px ${C.blue}35` : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }} className="tr-grid">
            {[
              { label:"Total Cash",      value:TREASURY_DATA.totalCash, icon:"💵", color:C.blue   },
              { label:"Invested in FDs", value:`${TREASURY_DATA.investedPct}%`, icon:"📈", color:C.teal   },
              { label:"Annual Yield",    value:TREASURY_DATA.yieldPA,   icon:"🏦", color:C.green  },
            ].map((s,i) => (
              <Card key={i} style={{ padding:18 }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontFamily:FM, fontSize:22, fontWeight:700, color:s.color, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{s.label}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
              Cash Positions
            </div>
            {TREASURY_DATA.cashPositions.map((p,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{p.bank}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>
                    {p.type} · {p.rate} p.a.
                  </div>
                  {p.flag && <div style={{ fontFamily:F, fontSize:11, color:C.amber, marginTop:2, fontWeight:600 }}>
                    ⚠️ {p.note}
                  </div>}
                </div>
                <div style={{ fontFamily:FM, fontSize:16, fontWeight:700, color: p.flag ? C.amber : C.text }}>
                  {p.balance}
                </div>
              </div>
            ))}
          </Card>
          <style>{`.tr-grid{grid-template-columns:1fr 1fr 1fr}@media(max-width:500px){.tr-grid{grid-template-columns:1fr!important}}`}</style>
        </>
      )}

      {tab === "maturity" && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
            FD Maturity Schedule
          </div>
          {TREASURY_DATA.maturitySchedule.map((m,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{m.item}</div>
                <div style={{ fontFamily:FM, fontSize:11, color:C.muted, marginTop:2 }}>Matures: {m.maturity}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontFamily:FM, fontSize:16, fontWeight:700, color:C.blue }}>{m.amount}</div>
                <Badge color={m.action==="Redeem"?C.red:C.green}>{m.action}</Badge>
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
              ⚠️ ₹15L matures 28 Mar — time with advance tax payment to avoid overdraft facility.
            </span>
          </div>
        </Card>
      )}

      {tab === "recommendations" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {TREASURY_DATA.recommendations.map((r,i) => (
            <Card key={i} style={{ padding:"14px 18px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <PriBadge p={r.priority}/>
                <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{r.text}</span>
              </div>
            </Card>
          ))}
          <Card style={{ background:`${C.blue}06`, border:`1px solid ${C.blue}20` }}>
            <div style={{ fontFamily:F, fontSize:13, color:C.blue, lineHeight:1.7 }}>
              💬 <strong>Want a detailed treasury optimisation plan?</strong>{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
              {" "}to discuss sweep accounts, liquid funds, and yield laddering for your cash position.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── TERMS & CONDITIONS / PRIVACY ────────────────────────────────────────────
function Terms() {
  const [tab, setTab] = useState("terms");
  return (
    <div style={{ padding:24, maxWidth:720 }}>
      <SectionTitle sub="Legal documentation for Finzzup Advisory LLP">Legal & Compliance</SectionTitle>

      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[["terms","📄 Terms & Conditions"],["privacy","🔒 Privacy Policy"],["copyright","© Copyright"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"9px 18px", borderRadius:100, border:"none",
            cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700,
            background: tab===id ? C.blue : C.bg2, color: tab===id ? "white" : C.muted,
            outline:`1.5px solid ${tab===id ? C.blue : C.border}` }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "terms" && (
        <Card style={{ lineHeight:1.8 }}>
          <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:16 }}>Last updated: January 2026</div>
          {[
            { h:"1. Services", t:"Finzzup Advisory LLP ('Finzzup') provides financial advisory, valuation, and CFO services to clients. All engagements are governed by a separate Engagement Letter, which supersedes these general terms where there is any conflict." },
            { h:"2. Proposals and Pricing", t:"All prices quoted are indicative. A formal proposal with a fixed scope and price will be sent within 24 hours of a service request. Engagements begin only upon signed acceptance of the proposal and receipt of the advance payment." },
            { h:"3. Confidentiality", t:"Finzzup maintains strict confidentiality of all client data, financial information, and business information shared. Data is used solely for the purpose of the engagement and is never shared with third parties without explicit written consent." },
            { h:"4. Intellectual Property", t:"All deliverables produced by Finzzup (reports, models, presentations) remain the property of the client upon full payment. Finzzup retains the right to use anonymized methodologies and frameworks for other engagements." },
            { h:"5. Liability", t:"Finzzup's liability is limited to the fees paid for the specific engagement. Valuations and financial projections are based on information provided by the client — Finzzup is not liable for decisions made on the basis of its reports." },
            { h:"6. Payments", t:"Invoices are payable within 15 days of issuance. Late payments attract interest at 18% per annum. Finzzup reserves the right to pause services for overdue accounts." },
            { h:"7. Governing Law", t:"These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>{s.h}</div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>{s.t}</p>
            </div>
          ))}
        </Card>
      )}

      {tab === "privacy" && (
        <Card style={{ lineHeight:1.8 }}>
          <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:16 }}>Last updated: January 2026</div>
          {[
            { h:"1. Data We Collect", t:"We collect personal information (name, email, phone), company information, and financial data you share with us as part of our engagement. We also collect usage data from this portal to improve our service." },
            { h:"2. How We Use Your Data", t:"Your data is used exclusively to deliver our advisory services, communicate with you about your engagement, and send invoices. We do not sell, rent, or share your data with third parties." },
            { h:"3. Data Storage & Security", t:"Client data is stored securely in Supabase (SOC 2 Type 2 certified) with encryption at rest and in transit. Access is restricted to authorised Finzzup personnel only." },
            { h:"4. Data Retention", t:"We retain client data for 7 years as required under Indian accounting and tax regulations. Upon request, we can delete non-statutory data within 30 days." },
            { h:"5. Cookies", t:"This portal uses functional cookies only for authentication. We do not use tracking or advertising cookies." },
            { h:"6. Your Rights", t:"You have the right to access, correct, or delete your personal data at any time. Contact garima@finzzup.com for any data-related requests." },
            { h:"7. Contact", t:"For privacy concerns, contact: Garima Agarwal · garima@finzzup.com · Finzzup Advisory LLP, Mumbai, India." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>{s.h}</div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>{s.t}</p>
            </div>
          ))}
        </Card>
      )}

      {tab === "copyright" && (
        <Card style={{ lineHeight:1.8 }}>
          <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:20 }}>
            © 2024–2026 Finzzup Advisory LLP. All rights reserved.
          </div>
          {[
            { h:"Reports & Deliverables", t:"All valuation reports, financial models, MIS packs, board packs, and other deliverables produced by Finzzup are protected by copyright. Upon full payment, clients receive a non-exclusive licence to use the deliverables for their own business purposes." },
            { h:"Portal Content", t:"The content, design, and functionality of this client portal are proprietary to Finzzup Advisory LLP. Unauthorised reproduction, distribution, or modification is prohibited." },
            { h:"Trademark", t:"'Finzzup' and the Finzzup logo are trademarks of Finzzup Advisory LLP. Use of these marks without prior written consent is not permitted." },
            { h:"Third-Party Tools", t:"This portal uses Supabase, Recharts, and Google Fonts under their respective licences. Calendly is used for scheduling under its commercial licence." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>{s.h}</div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>{s.t}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── PORTAL SHELL ─────────────────────────────────────────────────────────────

// My Report component — shows correct pack based on client type

// ─── PDF REPORT GENERATOR ────────────────────────────────────────────────────
function generateReportPDF({ client, kpis, garimaNote, reportData, actions }) {
  const pack      = client?.client_pack || client?.clientPack || "startup";
  const packLabel = pack === "msme" ? "MSME Pack" : pack === "corporate" ? "Board Pack" : "CFO Pack";
  const coverColor = pack === "msme" ? "#065f46,#059669,#0891B2"
                   : pack === "corporate" ? "#4C1D95,#7C3AED,#DB2777"
                   : "#1a3a8f,#2563EB,#7C3AED";
  const accentColor = pack === "msme" ? "#059669" : pack === "corporate" ? "#7C3AED" : "#2563EB";
  const month     = reportData?.monthLabel || new Date().toLocaleDateString("en-IN", { month:"long", year:"numeric" });
  const now       = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

  // KPI cards — 2 per row grid
  const kpiCards  = (kpis || []).map(k => {
    const isUp = k.trend === "up";
    return `<div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:16px 18px;break-inside:avoid">
      <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">${k.label}</div>
      <div style="font-size:22px;font-weight:800;color:#111827;font-family:monospace;margin-bottom:4px">${k.value || "—"}</div>
      <div style="font-size:11px;font-weight:700;color:${isUp?"#059669":"#EF4444"}">
        ${isUp?"▲":"▼"} prev: ${k.prev || "—"}
      </div>
    </div>`;
  }).join("");

  const plData    = reportData?.pl || {};
  const plKeys    = ["revenue","cogs","gross_profit","opex","ebitda","pat"];
  const plLabels  = { revenue:"Revenue", cogs:"Cost of Goods Sold", gross_profit:"Gross Profit",
    opex:"Operating Expenses", ebitda:"EBITDA", pat:"Net Profit / PAT" };
  const plRows    = plKeys.filter(k => plData[k]?.actual).map((k,i) => `
    <tr style="background:${i%2===0?"#fff":"#f9fafb"}">
      <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;font-weight:${["gross_profit","ebitda","pat"].includes(k)?"700":"400"}">${plLabels[k]}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#111827;font-family:monospace;border-bottom:1px solid #F3F4F6">${plData[k].actual}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6B7280;font-family:monospace;border-bottom:1px solid #F3F4F6">${plData[k].prev || "—"}</td>
    </tr>`).join("");

  const pendingActions = (actions || []).filter(a => !a.done);
  const actionRows = pendingActions.map(a => {
    const col = a.priority==="High"?"#EF4444":a.priority==="Medium"?"#D97706":"#059669";
    const bg  = a.priority==="High"?"#FEF2F2":a.priority==="Medium"?"#FFFBEB":"#ECFDF5";
    return `<tr>
      <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6">${a.text}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #F3F4F6">
        <span style="background:${bg};color:${col};font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px">${a.priority}</span>
      </td>
    </tr>`;
  }).join("");

  const variance  = (reportData?.variance || []).filter(r => r.item && (r.budget || r.actual));
  const varianceRows = variance.map((r,i) => `
    <tr style="background:${i%2===0?"#fff":"#f9fafb"}">
      <td style="padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6">${r.item}</td>
      <td style="padding:10px 14px;font-size:12px;font-family:monospace;color:#374151;border-bottom:1px solid #F3F4F6">${r.budget||"—"}</td>
      <td style="padding:10px 14px;font-size:12px;font-family:monospace;font-weight:700;color:#111827;border-bottom:1px solid #F3F4F6">${r.actual||"—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #F3F4F6">
        <span style="color:${r.fav?"#059669":"#EF4444"};font-weight:700;font-size:12px">${r.fav?"✓ Favourable":"✗ Unfavourable"}</span>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${packLabel} — ${month} — ${client.company}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; background:#fff; font-size:12px; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-break { page-break-inside:avoid; break-inside:avoid; }
    .page-break { page-break-after:always; break-after:page; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page-break" style="background:linear-gradient(135deg,${coverColor});min-height:100vh;padding:0;display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact">

  <!-- Top bar -->
  <div style="padding:32px 48px 0;display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="data:image/png;base64,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6ete8khEOGXRqBapHF879vuL7hhcMGCHEJW2YUS16spqAVTavgHRr56m5f5u7kNj3jFKTXdDMZySEsiGBjiBAvcMj8+emP1+K6uoaFt80JCip60MKvJS9tfbWq06KOHY6eSh3q0QwlFKXT7tll/dnrHax0m/S3Q0eVY99/yPqoQQDgBhmqa9YQMQDBY+6ijnUn9OZlwwWDyotbl5X1v8YK0vqL8HYBcABPzeRiX0tehafd+znLFYxAKU+N71ddNfeC72urLkNwYPyfnWgcbE2rIvD7pkZqR8DwARiUSs7Or+Hz88d84f1+38sKGioCgwOxUXtS4t7ycPLap4LmpEtcrqSnv48MI8tycwQzmQRqmpNxTDOXAAckaksnbajxZH3Jp2LoAPAGDgwCGvCOG7JpHsGO/z5hXU1+1bb6lMe1ub86JS0aQQAsOGD4zG423XQGJSjndIoKW5uV7qysnLldu7y6i5XLttWz6HkXAAoQQnA4iITjr/wp/mf2rBmDi5y/b55H70SvvPvQ6J/r+ksQro1G7YTQmUC6BEGiiTRuhxrWbXShVB5KhGpaYG+q5d5QBKpGGEZW1tdR8Ndg3QY//sKvMSCRgim1c2P+Dwqn7DiGrFxaXayJHlcuSucjkyVC4vvHCyqK39Ua/1BApK1ISg79oVO6H7yA0jqtXWlgogpo59rkenmzBliVEia2t7nB8MrRZG13mXSQNhaaBUxHrsr6AEzHI9FusUQJkMhQxt166jj28YhlZWG5a1QFedlHRtW6MO15sSoeOXU2RX8huythYyFDK0nTtr1NGjIjHVXb+7dpXDMCbLsjJD1tZWq551YZrlIhY79vnW1tb2vAoCqNWAMgmUyRAMbWSoXPY8VxOmjHXVFXrUG1DbO1CpgR47wWtJREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREJ5v/Bj/n9fr1VVNsAAAAAElFTkSuQmCC" alt="Finzzup" style="height:44px;width:auto;object-fit:contain"/>
    </div>
    <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;background:rgba(255,255,255,0.12);padding:5px 14px;border-radius:100px;border:1px solid rgba(255,255,255,0.2)">CONFIDENTIAL</span>
  </div>

  <!-- Main content -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px 48px 0">
    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">${packLabel}</div>
    <div style="font-size:44px;font-weight:900;color:white;letter-spacing:-0.03em;line-height:1.1;margin-bottom:12px">${client.company}</div>
    <div style="font-size:18px;color:rgba(255,255,255,0.7);font-weight:400;margin-bottom:40px">${month}</div>
    <div style="width:48px;height:3px;background:rgba(255,255,255,0.4);border-radius:2px;margin-bottom:40px"></div>
    <div style="display:flex;gap:48px">
      <div>
        <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Prepared by</div>
        <div style="font-size:13px;font-weight:700;color:white">Garima Agarwal</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6)">Finzzup Advisory</div>
      </div>
      <div>
        <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Prepared for</div>
        <div style="font-size:13px;font-weight:700;color:white">${client.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6)">${client.company}</div>
      </div>
      <div>
        <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Generated</div>
        <div style="font-size:13px;font-weight:700;color:white">${now}</div>
      </div>
    </div>
  </div>

  <!-- Bottom bar -->
  <div style="padding:24px 48px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;margin-top:48px">
    <div style="font-size:10px;color:rgba(255,255,255,0.4)">garima@finzzup.com · finzzup.com</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.4)">This report is confidential and intended solely for ${client.name}</div>
  </div>
</div>

<!-- CONTENT PAGES -->
<div style="padding:0 48px">

  ${garimaNote ? `
  <!-- Garima's Note -->
  <div class="no-break" style="padding:36px 0 28px;border-bottom:1px solid #E5E7EB">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="width:4px;height:20px;background:${accentColor};border-radius:2px"></div>
      <div style="font-size:14px;font-weight:700;color:#111827">Note from Garima</div>
    </div>
    <div style="background:#f0f4ff;border-left:4px solid ${accentColor};border-radius:0 8px 8px 0;padding:18px 22px">
      <div style="font-size:10px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">CFO Commentary — ${month}</div>
      <div style="font-size:13px;color:#1f2937;line-height:1.8">${garimaNote}</div>
    </div>
  </div>` : ""}

  <!-- KPI Snapshot -->
  <div class="no-break" style="padding:36px 0 28px;border-bottom:1px solid #E5E7EB">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:4px;height:20px;background:${accentColor};border-radius:2px"></div>
      <div style="font-size:14px;font-weight:700;color:#111827">KPI Snapshot</div>
      <span style="font-size:11px;color:#6B7280;background:#F3F4F6;padding:3px 10px;border-radius:100px">${month}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${kpiCards || `<div style="color:#9CA3AF;font-style:italic">No KPI data available.</div>`}
    </div>
  </div>

  ${plRows ? `
  <!-- P&L Summary -->
  <div class="no-break" style="padding:36px 0 28px;border-bottom:1px solid #E5E7EB">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:4px;height:20px;background:${accentColor};border-radius:2px"></div>
      <div style="font-size:14px;font-weight:700;color:#111827">P&L Summary</div>
      <span style="font-size:11px;color:#6B7280;background:#F3F4F6;padding:3px 10px;border-radius:100px">${month}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Line Item</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">This Month</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Prev Month</th>
        </tr>
      </thead>
      <tbody>${plRows}</tbody>
    </table>
  </div>` : ""}

  ${varianceRows ? `
  <!-- Budget vs Actual -->
  <div class="no-break" style="padding:36px 0 28px;border-bottom:1px solid #E5E7EB">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:4px;height:20px;background:${accentColor};border-radius:2px"></div>
      <div style="font-size:14px;font-weight:700;color:#111827">Budget vs Actual</div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Item</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Budget</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Actual</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Variance</th>
        </tr>
      </thead>
      <tbody>${varianceRows}</tbody>
    </table>
  </div>` : ""}

  ${pendingActions.length > 0 ? `
  <!-- Action Items -->
  <div class="no-break" style="padding:36px 0 28px;border-bottom:1px solid #E5E7EB">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:4px;height:20px;background:${accentColor};border-radius:2px"></div>
      <div style="font-size:14px;font-weight:700;color:#111827">Action Items</div>
      <span style="font-size:11px;color:#EF4444;background:#FEF2F2;padding:3px 10px;border-radius:100px;font-weight:700">${pendingActions.length} pending</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB">Action</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB;width:100px">Priority</th>
        </tr>
      </thead>
      <tbody>${actionRows}</tbody>
    </table>
  </div>` : ""}

</div>

<!-- FOOTER -->
<div style="margin:40px 48px 0;padding:20px 0;border-top:2px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:8px">
    <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAQABgADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAECBwgDBQYECf/EAGEQAQABAwMBAwUICwoIDAYBBQABAgMEBQYRBxIhMQhBUWFxEyIydIGRsbMUIyZydZShssHR0hUWFyc3QlJWYpIzNkNTVWWTwiQlNEZUY2RzgoSV8BhERaKjw3Y1g4Xh8f/EABsBAQABBQEAAAAAAAAAAAAAAAACAQMEBQYH/8QAQREBAAEDAQMIBwUHAwQDAAAAAAECAxEEBSExBhITMkFRcYEiYZGhscHRFDM04fAVFiMkUlNyQpLxNWOCoiVEsv/aAAwDAQACEQMRAD8A3IABMSTKAAAAADkAA5ADk5AAAAAAAAAAAAAAADk5ADkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5ABKCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJyCBPzHzAgAAEggTyfMCBJ8wIEnzAgT8x8wIE/MfMCBM/IgAAAAAT8x8wIAAAABPzAgSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT8yAAAAT8wIE/MfMCBPzHzAgSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE/MCE8ISD//2Q==" alt="Finzzup" style="height:22px;width:auto;object-fit:contain"/>
    <span style="font-size:11px;font-weight:700;color:#374151">Finzzup Advisory</span>
    <span style="font-size:11px;color:#9CA3AF">· garima@finzzup.com · finzzup.com</span>
  </div>
  <div style="font-size:10px;color:#9CA3AF">Confidential — ${client.name}, ${client.company} — ${now}</div>
</div>
<div style="height:32px"></div>

</body></html>`;

  return html;
}

// Save report as HTML file to Supabase + insert documents record
async function saveReportAsDocument({ client, kpis, garimaNote, reportData, actions }) {
  const pack      = client?.client_pack || client?.clientPack || "startup";
  const packLabel = pack === "msme" ? "MSME Pack" : pack === "corporate" ? "Board Pack" : "CFO Pack";
  const month     = reportData?.monthLabel || new Date().toLocaleDateString("en-IN", { month:"long", year:"numeric" });

  const html     = generateReportPDF({ client, kpis, garimaNote, reportData, actions });
  const blob     = new Blob([html], { type:"text/html" });
  const sizeKB   = (blob.size / 1024).toFixed(0) + " KB";

  // Store as data URL directly in DB — no storage upload needed, always renders correctly
  const dataUrl  = "data:text/html;charset=utf-8," + encodeURIComponent(html);

  const { data: docRow, error: dbErr } = await supabase.from("documents").insert({
    client_id:   client.id,
    name:        `${packLabel} — ${month}`,
    file_url:    dataUrl,
    file_size:   sizeKB,
    uploaded_by: client.name,
    created_at:  new Date().toISOString(),
  }).select().single();

  if (dbErr) throw new Error("DB record failed: " + dbErr.message);
  return docRow;
}

function MyReport({ client, reportData, kpis }) {
  const pack = client?.client_pack || client?.clientPack || "startup";
  const packLabel = pack === "msme" ? "MSME Report" : pack === "corporate" ? "Board Report" : "CFO Report";
  return (
    <div>
      {/* Report header with month context */}
      <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:18, color:C.text }}>{packLabel}</div>
          {reportData?.monthLabel ? (
            <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.blue,
              background:`${C.blue}12`, padding:"4px 14px", borderRadius:100 }}>
              {reportData.monthLabel}
            </span>
          ) : (
            <span style={{ fontFamily:F, fontSize:11, color:C.dim,
              background:C.bg3, padding:"4px 12px", borderRadius:100 }}>
              Month not set
            </span>
          )}
        </div>
        {reportData?.monthLabel && (
          <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>
            📅 Data for {reportData.monthLabel} · Updated by Garima
          </div>
        )}
      </div>
      {pack === "msme"      && <MSMEPackContent      reportData={reportData} kpis={kpis} client={client}/>}
      {pack === "corporate" && <CorporatePackContent reportData={reportData} kpis={kpis} client={client}/>}
      {pack !== "msme" && pack !== "corporate" && <CFOPackContent reportData={reportData} client={client} kpis={kpis}/>}
    </div>
  );
}

function getPageTitle(page, client) {
  const pack = client?.client_pack || client?.clientPack || "startup";
  const reportLabel = pack === "msme" ? "MSME Report"
    : pack === "corporate" ? "Board Report"
    : "CFO Report";
  const map = {
    overview:    "Overview",
    dashboard:   "Dashboard",
    cashflow:    "Cash Flow",
    actions:     "Action Items",
    myreport:    reportLabel,
    engagement:  "Valuation Status",
    calendar:    "Book a Call",
    newrequest:  "New Request",
    invoices:    "Invoices",
    treasury:    "Treasury Management",
    market:      "Market Intelligence",
    documents:   "My Documents",
    terms:       "Legal & Compliance",
  };
  return map[page] || "Dashboard";
}


// ─── REPORT PDF BAR ───────────────────────────────────────────────────────────
function ReportPDFBar({ client, kpis, garimaNote, reportData, actions, F, onSaved }) {
  const [saving,   setSaving]   = React.useState(false);
  const [saved,    setSavedMsg] = React.useState(false);
  const [error,    setError]    = React.useState("");

  const handleExecSummary = () => {
    const html = generateExecSummaryPDF({ client, reportData, kpis });
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };
  const handlePreview = () => {
    const html = generateReportPDF({ client, kpis, garimaNote, reportData, actions });
    const blob = new Blob([html], { type:"text/html" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 500);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSavedMsg(false);
    try {
      await saveReportAsDocument({ client, kpis, garimaNote, reportData, actions });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 4000);
      if (onSaved) onSaved();
    } catch(e) {
      setError(e.message);
      setTimeout(() => setError(""), 5000);
    }
    setSaving(false);
  };

  const pack      = client?.client_pack || client?.clientPack || "startup";
  const packLabel = pack === "msme" ? "MSME Pack" : pack === "corporate" ? "Board Pack" : "CFO Pack";
  const month     = reportData?.monthLabel || new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end",
      padding:"10px 24px 0", gap:8, flexWrap:"wrap" }}>
      {saved && (
        <span style={{ fontFamily:F, fontSize:12, color:"#059669", fontWeight:600 }}>
          ✅ Saved to My Documents!
        </span>
      )}
      {error && (
        <span style={{ fontFamily:F, fontSize:12, color:"#EF4444", fontWeight:600 }}>
          ❌ {error}
        </span>
      )}
      {/* Preview + Print */}
      <button onClick={handlePreview}
        style={{ display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 16px", borderRadius:10,
          border:"1.5px solid #E5E7EB", background:"white",
          color:"#374151", fontFamily:F, fontWeight:600,
          fontSize:12, cursor:"pointer" }}>
        🖨 Preview & Print
      </button>
      {/* Board Executive Summary */}
      <button onClick={handleExecSummary}
        style={{ display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 16px", borderRadius:10,
          border:`1.5px solid ${C.purple}30`, background:`${C.purple}08`,
          color:C.purple, fontFamily:F, fontWeight:600,
          fontSize:12, cursor:"pointer" }}>
        {"📋 Exec Summary"}
      </button>
      {/* Save to My Documents */}
      <button onClick={handleSave} disabled={saving}
        style={{ display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 18px", borderRadius:10,
          background: saving ? "#E5E7EB" : "linear-gradient(135deg,#2563EB,#7C3AED)",
          color: saving ? "#9CA3AF" : "white",
          border:"none", fontFamily:F, fontWeight:700,
          fontSize:12, cursor: saving ? "not-allowed" : "pointer",
          boxShadow: saving ? "none" : "0 2px 10px rgba(37,99,235,0.28)" }}>
        {saving ? "⏳ Saving…" : `📥 Save ${packLabel} — ${month}`}
      </button>
    </div>
  );
}

function Portal({ client, onLogout }) {
  const [page,      setPage]      = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  // ── Live data state (only populated for real/non-demo clients) ──
  const [liveKpis,        setLiveKpis]        = useState(null);
  const [liveActions,     setLiveActions]     = useState(null);
  const [liveEngagement,  setLiveEngagement]  = useState(null);
  const [liveInvoices,    setLiveInvoices]    = useState(null);
  const [liveReportData,  setLiveReportData]  = useState(null);
  const [dataLoading,     setDataLoading]     = useState(false);

  const isDemo = client?.isDemo === true;
  const [reportSaveKey, setReportSaveKey] = React.useState(0);

  // Fetch all live data from Supabase when a real client logs in
  useEffect(() => {
    if (isDemo || !client?.id) return;
    // Safety: if client.id looks like an invite code string (not a UUID), skip fetch
    const looksLikeUUID = /^[0-9a-f-]{36}$/i.test(client.id);
    if (!looksLikeUUID) { console.warn("client.id is not a UUID — skipping live data fetch:", client.id); return; }
    const fetchAll = async () => {
      setDataLoading(true);
      const [kpiRes, actionRes, engRes, invRes, rdRes] = await Promise.all([
        supabase.from("kpis").select("*").eq("client_id", client.id)
          .order("updated_at", { ascending:false }).limit(1).single(),
        supabase.from("action_items").select("*").eq("client_id", client.id)
          .order("created_at", { ascending:false }),
        supabase.from("engagements").select("*").eq("client_id", client.id).single(),
        supabase.from("invoices").select("*").eq("client_id", client.id)
          .order("created_at", { ascending:false }),
        supabase.from("report_data").select("*").eq("client_id", client.id).single(),
      ]);
      if (kpiRes.data)    setLiveKpis(kpiRes.data);
      if (actionRes.data) setLiveActions(actionRes.data);
      if (engRes.data)    setLiveEngagement(engRes.data);
      if (invRes.data)    setLiveInvoices(invRes.data);
      if (rdRes.data?.data) { try { setLiveReportData(JSON.parse(rdRes.data.data)); } catch(e){} }
      setDataLoading(false);
    };
    fetchAll();
  }, [client?.id, isDemo]);

  // Build merged KPI array — live data + prev values from report_data
  const prevK = liveReportData?.prevKpis || {};
  const resolvedKpis = (!isDemo && liveKpis) ? [
    { label: client?.client_pack==="msme"?"Revenue":"Revenue",
      value:liveKpis.revenue||"—", prev:prevK.revenue||"—", trend:"up", color:C.blue, bg:"#EEF3FE", icon:"📈" },
    { label: client?.client_pack==="msme"?"Working Capital":client?.client_pack==="corporate"?"Gross Margin":"Gross Margin",
      value:liveKpis.gross_margin||"—", prev:prevK.gross_margin||"—", trend:"up", color:C.teal, bg:"#E6FAF7", icon:"💹" },
    { label: client?.client_pack==="corporate"?"EBITDA":"Cash Balance",
      value:liveKpis.cash_balance||"—", prev:prevK.cash_balance||"—", trend:"down", color:C.amber, bg:"#FEF7E7", icon:"🏦" },
    { label: client?.client_pack==="msme"?"Debtor Days":client?.client_pack==="corporate"?"PAT":"Burn Rate",
      value:liveKpis.burn_rate||"—", prev:prevK.burn_rate||"—", trend:"up", color:C.purple, bg:"#F3EFFF", icon: client?.client_pack==="msme"?"📅":"🔥" },
    { label: client?.client_pack==="corporate"?"Debt/Equity":"Runway",
      value:liveKpis.runway||"—", prev:prevK.runway||"—", trend:"down", color:C.pink, bg:"#FEF0F7", icon:"⏳" },
    { label: client?.client_pack==="msme"?"Cash Conversion Cycle":"ARR",
      value:liveKpis.arr||"—", prev:prevK.arr||"—", trend:"up", color:C.green, bg:"#E8FAF3", icon: client?.client_pack==="msme"?"🔄":"🎯" },
  ] : KPIs;

  const resolvedActions    = (!isDemo && liveActions)    ? liveActions    : (ACTIONS_BY_PACK[client?.client_pack||'startup'] || ACTIONS);
  const resolvedEngagement = (!isDemo && liveEngagement) ? liveEngagement : null;
  const DEMO_REPORT_DATA = {
    monthLabel: "March 2026",
    score: 72,
    varianceCommentary: "Revenue tracking slightly ahead of plan. Operating expenses within budget.",
  };
  const resolvedReportData = (!isDemo && liveReportData) ? liveReportData : DEMO_REPORT_DATA;
  const resolvedGarimaNote = (!isDemo && liveKpis?.garima_note) ? liveKpis.garima_note
    : (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.garimaNote) || PACK_CONFIG.startup.garimaNote;

  const pages = {
    overview:   <Overview   client={client} setPage={setPage} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} actions={resolvedActions} engagement={resolvedEngagement} reportData={resolvedReportData}/>,
    dashboard:  <Dashboard  client={client} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} reportData={resolvedReportData}/>,
    cashflow:   <CashFlow   reportData={resolvedReportData} client={client} kpis={resolvedKpis}/>,
    actions:    <ActionItems actions={resolvedActions} kpis={resolvedKpis} reportData={resolvedReportData}/>,
    myreport:   <MyReport   key={reportSaveKey} client={client} reportData={resolvedReportData} kpis={resolvedKpis}/>,
    engagement: <Engagement liveData={resolvedEngagement}/>,
    calendar:   <Calendar/>,
    newrequest: <NewRequest client={client} setPage={setPage}/>,
    market:     <MarketIntel client={client}/>,
    invoices:   <Invoices   client={client} liveInvoices={isDemo ? null : liveInvoices}/>,
    documents:  <MyDocuments client={client}/>,
    treasury:   <Treasury   client={client} reportData={resolvedReportData}/>,
    terms:      <Terms/>,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:F }}>
      {dataLoading && !isDemo && (
        <div style={{ position:"fixed", top:0, left:0, right:0, height:3, zIndex:9999,
          background:C.grad1, animation:"progress 1.5s ease-in-out infinite" }}/>
      )}
      <Sidebar page={page} setPage={setPage} client={client}
        onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <Topbar title={getPageTitle(page, client)} client={client} setPage={setPage}
          notifItems={[
            ...((isDemo ? null : liveInvoices) || [])
              .filter(inv => inv.status === "unpaid")
              .map(inv => ({
                icon:"🧾", page:"invoices",
                title:`Invoice due: ${inv.description || inv.invoice_number}`,
                sub:`${inv.amount} · Due ${inv.due_date || "—"}`,
              })),
            ...((isDemo ? null : liveActions) || [])
              .filter(a => !a.done && a.priority === "High")
              .map(a => ({
                icon:"⚠️", page:"actions",
                title:a.text.length > 50 ? a.text.slice(0,50)+"…" : a.text,
                sub:`High priority · ${a.month || ""}`,
              })),
          ]}
        />
        <main style={{ flex:1, overflowY:"auto" }}>
          {/* ── Report PDF buttons — shown on key report pages ── */}
          {["dashboard","myreport","cashflow","actions","overview"].includes(page) && !isDemo && (
            <ReportPDFBar
              client={client}
              kpis={resolvedKpis}
              garimaNote={resolvedGarimaNote}
              reportData={resolvedReportData}
              actions={resolvedActions}
              F={F}
              onSaved={() => setReportSaveKey(k => k + 1)}
            />
          )}
          {pages[page]}
        </main>
      </div>
      <style>{`@keyframes progress{0%{width:0%;left:0}50%{width:60%;left:20%}100%{width:0%;left:100%}}`}</style>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

// ─── ADMIN SHARED COMPONENTS (defined outside to prevent focus loss on re-render) ─
function AdminInput({ label, val, onChange, type="text", placeholder="", mono=false, C, F, FM }) {
  const [local, setLocal] = React.useState(val ?? "");
  // Sync if parent resets (e.g. client switch)
  React.useEffect(() => { setLocal(val ?? ""); }, [val]);
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>{label}</label>
      <input
        value={local}
        type={type}
        placeholder={placeholder}
        onChange={e => setLocal(e.target.value)}
        onBlur={e => { onChange(local); e.target.style.borderColor = C.border; }}
        onFocus={e => e.target.style.borderColor = C.amber}
        style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
          border:`1.5px solid ${C.border}`, fontFamily:mono?FM:F, color:C.text,
          background:C.bg, outline:"none", boxSizing:"border-box" }}
      />
    </div>
  );
}
const AdminSelect = ({ label, val, onChange, options, C, F }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>{label}</label>
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
        background:C.bg, outline:"none", boxSizing:"border-box" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const AdminSaveBtn = ({ onClick, loading, saved, label="Save Changes", F }) => (
  <button onClick={onClick} disabled={loading} style={{ padding:"11px 24px", borderRadius:10,
    border:"none", background:"linear-gradient(135deg,#F59E0B,#EF4444)", color:"white",
    fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer", opacity:loading?0.75:1,
    touchAction:"manipulation" }}>
    {loading ? "Saving…" : saved ? "✅ Saved!" : label}
  </button>
);

// ─── INLINE INPUT — for table cells, commits on blur only ─────────────────────
function InlineInput({ value, onCommit, placeholder="", style={} }) {
  const [local, setLocal] = React.useState(value ?? "");
  React.useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      placeholder={placeholder}
      style={{ padding:"6px 8px", borderRadius:7, fontSize:12, border:"1.5px solid #E5E7EB",
        fontFamily:"'DM Mono',monospace", color:"#111827", background:"#F9FAFB",
        outline:"none", width:"100%", boxSizing:"border-box", ...style }}
      onFocus={e => e.target.style.borderColor="#D97706"}
    />
  );
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    });
    if (authErr) { setLoading(false); setError("Invalid credentials."); return; }
    // Check if admin
    const { data: adminData } = await supabase
      .from("admins").select("*").eq("email", form.email).single();
    setLoading(false);
    if (!adminData) { await supabase.auth.signOut(); setError("Not authorised as admin."); return; }
    onLogin(adminData);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0A1128", display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:F }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <img src={LOGO_SRC} alt="Finzzup"
            style={{ height:60, width:"auto", objectFit:"contain", display:"block" }}/>
          <div style={{ marginTop:10, display:"inline-block", padding:"4px 14px", borderRadius:100,
            background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.3)" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#FBBF24", letterSpacing:"0.1em" }}>ADMIN ACCESS</span>
          </div>
        </div>
        <Card style={{ padding:32 }}>
          <h2 style={{ fontWeight:700, fontSize:20, color:C.text, marginBottom:20, textAlign:"center" }}>
            Garima's Admin Panel
          </h2>
          {[
            { label:"Email", key:"email", type:"email", placeholder:"garima@finzzup.com" },
            { label:"Password", key:"password", type:"password", placeholder:"Your password" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.08em", display:"block", marginBottom:7, fontFamily:F }}>{label}</label>
              <input value={form[key]}
                onChange={e => { setForm(f=>({...f,[key]:e.target.value})); setError(""); }}
                onKeyDown={e => e.key==="Enter" && signIn()}
                type={type} placeholder={placeholder}
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:16,
                  border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                  background:C.bg, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor = C.amber}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
            </div>
          ))}
          {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
          <button onClick={signIn} disabled={loading} style={{ width:"100%", marginTop:8, padding:14,
            borderRadius:12, border:"none", background:"linear-gradient(135deg,#F59E0B,#EF4444)",
            color:"white", fontFamily:F, fontWeight:700, fontSize:15, cursor:"pointer",
            opacity:loading?0.75:1, touchAction:"manipulation" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </Card>
      </div>
    </div>
  );
}

function AdminPanel({ admin, onLogout }) {
  const [tab, setTab]         = useState("clients");
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null); // selected client for editing
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [aiGenerating, setAiGen]    = useState(false);
  const [aiDraft, setAiDraft]       = useState(null);
  const [aiError, setAiError]       = useState("");

  // KPI edit state
  const [kpis, setKpis] = useState({
    month:"", revenue:"", gross_margin:"", cash_balance:"",
    burn_rate:"", runway:"", arr:"", garima_note:""
  });

  // Action items state
  const [actions, setActions] = useState([]);
  const [newAction, setNewAction] = useState({ text:"", priority:"High", month:"" });

  // New client state
  const [newClient, setNewClient] = useState({
    name:"", company:"", email:"", invite_code:"", client_pack:"startup", type:"both"
  });

  // Engagement state
  const [engagement, setEngagement] = useState({ type:"", ref_number:"", status:0, expected_date:"", garima_note:"" });
  const [requests,   setRequests]   = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [docs, setDocs]           = useState([]);
  const [docLoading, setDocLoading] = useState(false);

  // Invoice state
  const [invoices,    setInvoices]    = useState([]);
  const [newInvoice,  setNewInvoice]  = useState({
    invoice_number:"", description:"", amount:"", due_date:"", status:"unpaid"
  });

  // Report data state — cash flow, prev KPIs, pack scores, benchmarks, checklists
  const [reportData, setReportData] = useState(null);
  const defaultReportData = (pack) => ({
    // Cash flow — 6 actual + 3 forecast months
    cashflow: [
      { month:"Sep", actual:"", forecast:"" },
      { month:"Oct", actual:"", forecast:"" },
      { month:"Nov", actual:"", forecast:"" },
      { month:"Dec", actual:"", forecast:"" },
      { month:"Jan", actual:"", forecast:"" },
      { month:"Feb", actual:"", forecast:"" },
      { month:"Mar", actual:"", forecast:"" },
      { month:"Apr", actual:"", forecast:"" },
      { month:"May", actual:"", forecast:"" },
    ],
    treasury: {
      totalCash: "",
      investedPct: "",
      yieldPA: "",
      cashPositions: [
        { bank:"", balance:"", type:"Operating",    rate:"", flag:false, note:"" },
        { bank:"", balance:"", type:"FD",           rate:"", flag:false, note:"" },
        { bank:"", balance:"", type:"Sweep FD",     rate:"", flag:false, note:"" },
        { bank:"", balance:"", type:"Reserve",      rate:"", flag:true,  note:"" },
      ],
      maturitySchedule: [
        { item:"", maturity:"", amount:"", action:"Renew"   },
        { item:"", maturity:"", amount:"", action:"Redeem"  },
        { item:"", maturity:"", amount:"", action:"Auto-renew" },
      ],
      recommendations: [
        { priority:"High",   text:"" },
        { priority:"High",   text:"" },
        { priority:"Medium", text:"" },
        { priority:"Low",    text:"" },
      ],
    },
    // Previous month KPI values (for trend arrows)
    prevKpis: { revenue:"", gross_margin:"", cash_balance:"", burn_rate:"", runway:"", arr:"" },
    // Pack-specific scores
    score: "",          // fundraise / cash health / ipo score (0-100)
    scoreBreakdown: pack === "startup" ? [
      { label:"Revenue Growth",          score:"", comment:"" },
      { label:"Gross Margin",            score:"", comment:"" },
      { label:"Runway",                  score:"", comment:"" },
      { label:"Financial Documentation", score:"", comment:"" },
      { label:"Unit Economics",          score:"", comment:"" },
    ] : pack === "msme" ? [
      { label:"Cash Conversion Cycle",  score:"", comment:"" },
      { label:"Working Capital Ratio",  score:"", comment:"" },
      { label:"Debtor Days",            score:"", comment:"" },
      { label:"Creditor Days",          score:"", comment:"" },
      { label:"Inventory Turnover",     score:"", comment:"" },
    ] : [
      { label:"Revenue Scale",              score:"", comment:"" },
      { label:"Profitability Track Record", score:"", comment:"" },
      { label:"Governance & Board",         score:"", comment:"" },
      { label:"Ind AS Compliance",          score:"", comment:"" },
      { label:"Audit Quality",              score:"", comment:"" },
    ],
    // Investor/working capital metrics
    metrics: pack === "startup" ? [
      { label:"ARR",           value:"", flag:false, note:"" },
      { label:"MoM Growth",    value:"", flag:false, note:"" },
      { label:"Burn Multiple", value:"", flag:false, note:"" },
      { label:"CAC Payback",   value:"", flag:false, note:"" },
      { label:"NRR",           value:"", flag:false, note:"" },
      { label:"Gross Margin",  value:"", flag:false, note:"" },
    ] : pack === "msme" ? [
      { label:"Current Ratio",   value:"", flag:false, note:"" },
      { label:"Quick Ratio",     value:"", flag:false, note:"" },
      { label:"Debtor Days",     value:"", flag:false, note:"" },
      { label:"Creditor Days",   value:"", flag:false, note:"" },
      { label:"Inventory Days",  value:"", flag:false, note:"" },
      { label:"Cash Conversion", value:"", flag:false, note:"" },
    ] : [
      { label:"Revenue",         value:"", flag:false, note:"" },
      { label:"EBITDA Margin",   value:"", flag:false, note:"" },
      { label:"PAT",             value:"", flag:false, note:"" },
      { label:"Debt/Equity",     value:"", flag:false, note:"" },
      { label:"ROE",             value:"", flag:false, note:"" },
      { label:"Current Ratio",   value:"", flag:false, note:"" },
    ],
    // Due diligence checklist (startup) / compliance flags (corporate)
    checklist: pack === "startup" ? [
      { item:"Audited financials (3 years)",              done:false },
      { item:"5-year projections with assumptions",       done:false },
      { item:"Cap table (fully diluted)",                 done:false },
      { item:"MIS pack — last 6 months",                  done:false },
      { item:"Unit economics — cohort analysis",          done:false },
      { item:"Board resolutions for previous fundraises", done:false },
      { item:"ESOP scheme document",                      done:false },
      { item:"Shareholder agreement (all investors)",     done:false },
    ] : pack === "msme" ? [
      { item:"3-year audited financials",                 done:false },
      { item:"GST returns last 12 months",                done:false },
      { item:"Bank statements last 12 months",            done:false },
      { item:"Debtor/creditor ageing report",             done:false },
      { item:"Inventory valuation certificate",           done:false },
      { item:"Loan sanction letters",                     done:false },
    ] : [
      { item:"Ind AS 116 — Lease restatement",            done:false },
      { item:"Ind AS 109 — ECL provisioning",             done:false },
      { item:"Related party disclosure review",           done:false },
      { item:"Independent director appointment",          done:false },
      { item:"CSR spend reconciliation",                  done:false },
      { item:"LODR compliance checklist",                 done:false },
    ],
    // Market benchmarks
    benchmarks: [
      { metric:"ARR Growth YoY",   yours:"", median:"", bench:"", ok:true  },
      { metric:"Gross Margin",     yours:"", median:"", bench:"", ok:true  },
      { metric:"Burn Multiple",    yours:"", median:"", bench:"", ok:true  },
      { metric:"NRR",              yours:"", median:"", bench:"", ok:true  },
      { metric:"CAC Payback",      yours:"", median:"", bench:"", ok:false },
      { metric:"Revenue per FTE",  yours:"", median:"", bench:"", ok:true  },
    ],
    packNote: "",
    reportNote: "",
    cashflowNote: "",
    // ── NEW: Month label for KPI Snapshot header ──────────────────────────
    monthLabel: "",
    // ── NEW: P&L inputs (current month + previous month) ──────────────────
    pl: {
      revenue:      { actual:"", prev:"" },
      cogs:         { actual:"", prev:"" },
      grossProfit:  { actual:"", prev:"" },
      ebitda:       { actual:"", prev:"" },
      pat:          { actual:"", prev:"" },
      gpMargin:     { actual:"", prev:"" },
      ebitdaMargin: { actual:"", prev:"" },
      netMargin:    { actual:"", prev:"" },
    },
    // ── NEW: Variance analysis — budget vs actual ──────────────────────────
    variance: [
      { metric:"Revenue",          budget:"", actual:"", fav:true  },
      { metric:"Cost of Sales",    budget:"", actual:"", fav:false },
      { metric:"Gross Profit",     budget:"", actual:"", fav:true  },
      { metric:"GP Margin %",      budget:"", actual:"", fav:true,  noCalc:true },
      { metric:"EBITDA",           budget:"", actual:"", fav:true  },
      { metric:"EBITDA Margin %",  budget:"", actual:"", fav:true,  noCalc:true },
      { metric:"Net Profit / PAT", budget:"", actual:"", fav:true  },
    ],
    varianceCommentary: [
      { item:"", note:"", favorable:true  },
      { item:"", note:"", favorable:true  },
      { item:"", note:"", favorable:false },
    ],
  });

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending:false });
    setClients(data || []);
    // Pre-load all requests so the Requests tab works without selecting a client
    const { data: allReqs } = await supabase.from("requests").select("*").order("created_at", { ascending:false });
    if (allReqs) setRequests(allReqs);
  };

  const selectClient = async (c) => {
    setSelected(c); setSaved(false);
    // Load latest KPIs
    const { data: kpiData } = await supabase.from("kpis")
      .select("*").eq("client_id", c.id).order("updated_at", { ascending:false }).limit(1).single();
    if (kpiData) setKpis(kpiData);
    else setKpis({ month:"", revenue:"", gross_margin:"", cash_balance:"", burn_rate:"", runway:"", arr:"", garima_note:"" });
    // Load actions
    const { data: actData } = await supabase.from("action_items")
      .select("*").eq("client_id", c.id).order("created_at", { ascending:false });
    setActions(actData || []);
    // Load engagement
    const { data: engData } = await supabase.from("engagements")
      .select("*").eq("client_id", c.id).single();
    if (engData) setEngagement(engData);
    else setEngagement({ type:"", ref_number:"", status:0, expected_date:"", garima_note:"" });
    // Load documents
    const { data: docData } = await supabase.from("documents")
      .select("*").eq("client_id", c.id).order("created_at", { ascending:false });
    setDocs(docData || []);
    // Load invoices
    const { data: invData } = await supabase.from("invoices")
      .select("*").eq("client_id", c.id).order("created_at", { ascending:false });
    setInvoices(invData || []);
    // Load requests
    const { data: reqData } = await supabase.from("requests")
      .select("*").eq("client_id", c.id).order("created_at", { ascending:false });
    setRequests(reqData || []);
    // Load report data
    const { data: rdData } = await supabase.from("report_data")
      .select("*").eq("client_id", c.id).single();
    const defaults = defaultReportData(c.client_pack || "startup");
    if (rdData?.data) {
      try {
        const parsed = JSON.parse(rdData.data);
        setReportData({
          ...defaults,
          ...parsed,
          pl:                 { ...defaults.pl,       ...(parsed.pl                || {}) },
          variance:           parsed.variance           || defaults.variance,
          varianceCommentary: parsed.varianceCommentary || defaults.varianceCommentary,
          prevKpis:           { ...defaults.prevKpis, ...(parsed.prevKpis          || {}) },
        });
      } catch(e) { setReportData(defaults); }
    }
    else setReportData(defaults);
  };

  const saveKPIs = async () => {
    if (!selected) return;
    setLoading(true);
    const payload = { ...kpis, client_id: selected.id, updated_at: new Date().toISOString() };
    if (kpis.id) {
      await supabase.from("kpis").update(payload).eq("id", kpis.id);
    } else {
      const { data } = await supabase.from("kpis").insert(payload).select().single();
      if (data) setKpis(data);
    }
    setLoading(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addAction = async () => {
    if (!selected || !newAction.text) return;
    const { data } = await supabase.from("action_items")
      .insert({ ...newAction, client_id: selected.id }).select().single();
    if (data) setActions(prev => [data, ...prev]);
    setNewAction({ text:"", priority:"High", month:newAction.month });
  };

  const toggleAction = async (a) => {
    const newDone = !a.done;
    await supabase.from("action_items").update({ done: newDone }).eq("id", a.id);
    setActions(prev => prev.map(x => x.id===a.id ? {...x, done:newDone} : x));
  };

  const deleteAction = async (id) => {
    await supabase.from("action_items").delete().eq("id", id);
    setActions(prev => prev.filter(x => x.id!==id));
  };

  const saveEngagement = async () => {
    if (!selected) return;
    setLoading(true);
    if (engagement.id) {
      await supabase.from("engagements").update(engagement).eq("id", engagement.id);
    } else {
      const { data } = await supabase.from("engagements")
        .insert({ ...engagement, client_id: selected.id }).select().single();
      if (data) setEngagement(data);
    }
    setLoading(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveReportData = async () => {
    if (!selected || !reportData) return;
    setLoading(true);
    const payload = { client_id: selected.id, data: JSON.stringify(reportData), updated_at: new Date().toISOString() };
    // Check if exists first
    const { data: existing } = await supabase.from("report_data").select("id").eq("client_id", selected.id).single();
    if (existing?.id) {
      await supabase.from("report_data").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("report_data").insert(payload);
    }
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const addInvoice = async () => {
    if (!selected || !newInvoice.invoice_number || !newInvoice.amount) return;
    setLoading(true);
    const { data } = await supabase.from("invoices").insert({
      ...newInvoice, client_id: selected.id
    }).select().single();
    if (data) setInvoices(prev => [data, ...prev]);
    setNewInvoice({ invoice_number:"", description:"", amount:"", due_date:"", status:"unpaid" });
    setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    setInvoices(prev => prev.filter(x => x.id !== id));
  };

  const markInvoicePaid = async (inv) => {
    const newStatus = inv.status === "paid" ? "unpaid" : "paid";
    await supabase.from("invoices").update({
      status: newStatus,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null
    }).eq("id", inv.id);
    setInvoices(prev => prev.map(x => x.id===inv.id ? {...x, status:newStatus} : x));
  };

  const toggleClientActive = async (c) => {
    await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    setClients(prev => prev.map(x => x.id===c.id ? {...x, active:!x.active} : x));
    if (selected?.id === c.id) setSelected(s => ({...s, active:!s.active}));
  };

  const createClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.invite_code) return;
    const { data, error } = await supabase.from("clients").insert(newClient).select().single();
    if (error) { alert("Error: " + error.message); return; }
    setClients(prev => [data, ...prev]);
    setNewClient({ name:"", company:"", email:"", invite_code:"", client_pack:"startup", type:"both" });
    setTab("clients");
  };

  const genCode = () => {
    const prefix = newClient.company?.slice(0,4).toUpperCase().replace(/\s/g,"") || "CLIE";
    const year = new Date().getFullYear();
    setNewClient(c => ({ ...c, invite_code: `${prefix}${year}` }));
  };

  const ADMIN_TABS = [
    { id:"clients",    icon:"👥", label:"All Clients"     },
    { id:"addclient",  icon:"➕", label:"Add Client"      },
    { id:"kpis",       icon:"📊", label:"Update KPIs"     },
    { id:"actions",    icon:"✅", label:"Action Items"    },
    { id:"engagement", icon:"📋", label:"Valuation"       },
    { id:"invoices",   icon:"🧾", label:"Invoices"        },
    { id:"reportdata", icon:"📈", label:"Report Data"     },
    { id:"treasury",   icon:"💎", label:"Treasury"        },
    { id:"documents",  icon:"📁", label:"Documents"       },
    { id:"requests",   icon:"📩", label:"Requests"        },
    { id:"market",     icon:"🌐", label:"Market Intel"    },
  ];

  // Stable component references — prevents remount/focus-loss on every render

  // ── AI ANALYSIS GENERATOR ──────────────────────────────────────────────────
  const generateAnalysis = async () => {
    if (!selected) return;
    setAiGen(true);
    setAiError("");
    setAiDraft(null);

    const pack    = selected.client_pack || "startup";
    const company = selected.company || selected.name || "the client";
    const month   = reportData?.monthLabel || "current month";

    // Auto-calculate ratios from entered data
    const calc = calcRatios();

    // Auto-apply calculated ratios to reportData fields that aren't manually set
    const autoFields = {};
    if (calc.interestCoverageCalc && !reportData?.interestCoverage) autoFields.interestCoverage = calc.interestCoverageCalc;
    if (calc.debtEbitdaCalc && !reportData?.debtEbitda)             autoFields.debtEbitda       = calc.debtEbitdaCalc;
    if (calc.dscrCalc && !reportData?.dscr)                         autoFields.dscr             = calc.dscrCalc;
    if (calc.cccCalc && !reportData?.ccc)                           autoFields.ccc              = calc.cccCalc;
    if (calc.debtorDaysCalc && !reportData?.debtorDays)             autoFields.debtorDays       = calc.debtorDaysCalc;
    if (calc.creditorDaysCalc && !reportData?.creditorDays)         autoFields.creditorDays     = calc.creditorDaysCalc;
    if (calc.inventoryDaysCalc && !reportData?.inventoryDays)       autoFields.inventoryDays    = calc.inventoryDaysCalc;
    if (calc.ltvCacCalc && !reportData?.ltvCac)                     autoFields.ltvCac           = calc.ltvCacCalc;
    if (calc.burnMultipleCalc && !reportData?.burnMultiple)         autoFields.burnMultiple     = calc.burnMultipleCalc;
    if (calc.cacPaybackCalc && !reportData?.cacPayback)             autoFields.cacPayback       = calc.cacPaybackCalc;
    if (Object.keys(autoFields).length > 0) setReportData(r => ({...r, ...autoFields}));

    // Build a rich context from all available data
    const kpiSummary = [
      kpis.revenue      && `Revenue: ${kpis.revenue}`,
      kpis.gross_margin && `Gross Margin: ${kpis.gross_margin}`,
      kpis.cash_balance && `Cash Balance: ${kpis.cash_balance}`,
      kpis.burn_rate    && `Burn Rate: ${kpis.burn_rate}`,
      kpis.runway       && `Runway: ${kpis.runway}`,
      kpis.arr          && `ARR: ${kpis.arr}`,
    ].filter(Boolean).join(", ");

    const plSummary = reportData?.plInputs ? [
      reportData.plInputs.revenue      && `Revenue: ${reportData.plInputs.revenue}`,
      reportData.plInputs.ebitda        && `EBITDA: ${reportData.plInputs.ebitda}`,
      reportData.plInputs.pat           && `PAT: ${reportData.plInputs.pat}`,
      reportData.plInputs.gpMargin      && `GP Margin: ${reportData.plInputs.gpMargin}`,
      reportData.plInputs.ebitdaMargin  && `EBITDA Margin: ${reportData.plInputs.ebitdaMargin}`,
    ].filter(Boolean).join(", ") : "";

    const debtSummary = [
      reportData?.existingDebt      && `Existing Debt: ${reportData.existingDebt}`,
      reportData?.dscr              && `DSCR: ${reportData.dscr}`,
      reportData?.currentRatio      && `Current Ratio: ${reportData.currentRatio}`,
      reportData?.interestCoverage  && `Interest Coverage: ${reportData.interestCoverage}`,
      reportData?.debtEbitda        && `Debt/EBITDA: ${reportData.debtEbitda}`,
    ].filter(Boolean).join(", ");

    const wcSummary = [
      reportData?.debtorDays    && `Debtor Days: ${reportData.debtorDays}`,
      reportData?.creditorDays  && `Creditor Days: ${reportData.creditorDays}`,
      reportData?.ccc           && `CCC: ${reportData.ccc}`,
      reportData?.workingCapital&& `Working Capital: ${reportData.workingCapital}`,
    ].filter(Boolean).join(", ");

    const packContext = pack === "startup"
      ? `This is a startup on a CFO advisory pack. Key startup concerns: burn rate, runway, fundraising readiness, unit economics.`
      : pack === "msme"
      ? `This is an MSME on a working capital and bank finance pack. Key MSME concerns: collections, debtor days, bank loan eligibility, cash conversion cycle.`
      : `This is a corporate entity on a board reporting pack. Key concerns: board-ready financials, IPO readiness, governance, Ind AS compliance.`;


  // ── AUTO-CALCULATE RATIOS FROM ENTERED DATA ─────────────────────────────────
  const calcRatios = () => {
    if (!reportData) return {};
    const pl     = reportData?.plInputs || {};
    const rd     = reportData || {};
    // Admin kpis is a form object {revenue, gross_margin, cash_balance...}
    // Map it to match what calcRatios expects
    const kv     = {
      revenue:       kpis?.revenue       || "",
      cash_balance:  kpis?.cash_balance  || "",
      burn_rate:     kpis?.burn_rate     || "",
      runway:        kpis?.runway        || "",
      arr:           kpis?.arr           || "",
    };
    const calc   = {};

    // Helper: parse numeric value from strings like "₹84L", "₹2.1 Cr", "41%", "4.2x"
    const parse = (val) => {
      if (!val) return null;
      const s = String(val).replace(/[₹,\s]/g, "");
      let n = parseFloat(s);
      if (isNaN(n)) return null;
      if (s.toLowerCase().includes("cr"))  n = n * 100; // Cr → L
      if (s.toLowerCase().includes("%"))   n = n;       // keep as %
      return n;
    };

    const revenue   = parse(pl.revenue)      || parse(kv.revenue);
    const gp        = parse(pl.grossProfit);
    const gpMargin  = parse(pl.gpMargin);
    const ebitda    = parse(pl.ebitda);
    const pat       = parse(pl.pat);
    const cash      = parse(kv.cash_balance) || parse(rd.closingCash);
    const burn      = parse(kv.burn_rate);
    const runway    = parse(kv.runway);
    const arr       = parse(kv.arr)          || parse(rd.arr);
    const debt      = parse(rd.existingDebt);
    const interest  = parse(rd.interestCost);
    const operCF    = parse(rd.operatingCF);
    const freeCF    = parse(rd.freeCF);
    const debtors   = parse(rd.debtors);
    const creditors = parse(rd.creditors);
    const inventory = parse(rd.inventory);
    const ddays     = parse(rd.debtorDays);
    const cdays     = parse(rd.creditorDays);
    const idays     = parse(rd.inventoryDays);
    const cac       = parse(rd.cac);
    const ltv       = parse(rd.ltv);
    const momGrowth = parse(rd.momGrowth);
    const churn     = parse(rd.churnRate);
    const nrr       = parse(rd.nrr);

    // ── P&L DERIVED ──
    if (revenue && gp)          calc.gpMarginCalc      = ((gp/revenue)*100).toFixed(1) + "%";
    if (ebitda && revenue)      calc.ebitdaMarginCalc  = ((ebitda/revenue)*100).toFixed(1) + "%";
    if (pat && revenue)         calc.netMarginCalc     = ((pat/revenue)*100).toFixed(1) + "%";

    // ── DEBT RATIOS ──
    if (ebitda && interest && interest > 0)
      calc.interestCoverageCalc = (ebitda / interest).toFixed(2) + "x";

    if (debt && ebitda && ebitda > 0)
      calc.debtEbitdaCalc       = (debt / ebitda).toFixed(2) + "x";

    if (debt && pat && pat > 0 && interest)
      calc.dscrCalc             = ((ebitda - interest) / (interest)).toFixed(2) + "x";

    if (operCF && interest && interest > 0)
      calc.dscrCalc             = (operCF / interest).toFixed(2) + "x"; // override with actual CF

    // ── WORKING CAPITAL ──
    if (ddays !== null && cdays !== null && idays !== null)
      calc.cccCalc              = (ddays - cdays + idays).toFixed(0) + " days";
    else if (ddays !== null && cdays !== null)
      calc.cccCalc              = (ddays - cdays).toFixed(0) + " days";

    if (revenue && debtors)
      calc.debtorDaysCalc       = ((debtors / (revenue/30))).toFixed(0) + " days";
    if (revenue && creditors)
      calc.creditorDaysCalc     = ((creditors / (revenue/30))).toFixed(0) + " days";
    if (revenue && inventory)
      calc.inventoryDaysCalc    = ((inventory / (revenue/30))).toFixed(0) + " days";

    // ── STARTUP UNIT ECONOMICS ──
    // Calculate CAC from raw inputs if available
    const mktgSpend    = parse(rd.totalMktgSpend);
    const newCusts     = parse(rd.newCustomers);
    const avgRevCust   = parse(rd.avgRevPerCust);
    const retentionMos = parse(rd.avgRetentionMos);
    const derivedCac   = (mktgSpend && newCusts && newCusts > 0) ? mktgSpend / newCusts : cac;
    const derivedLtv   = (avgRevCust && retentionMos) ? avgRevCust * retentionMos / 12 : ltv;

    if (derivedCac && !cac)
      calc.cacCalc              = "₹" + Math.round(derivedCac * 100).toLocaleString("en-IN");
    if (derivedLtv && !ltv)
      calc.ltvCalc              = "₹" + Math.round(derivedLtv * 1000).toLocaleString("en-IN");

    if ((derivedLtv || ltv) && (derivedCac || cac) && (derivedCac || cac) > 0)
      calc.ltvCacCalc           = ((derivedLtv||ltv) / (derivedCac||cac)).toFixed(1) + "x";

    if ((derivedCac || cac) && ebitda && revenue) {
      const margin = parse(pl.gpMargin) || 40;
      calc.cacPaybackCalc       = (((derivedCac||cac) / (revenue * margin / 100)) * 12).toFixed(0) + " months";
    }

    if (burn && arr && arr > 0)
      calc.burnMultipleCalc     = (burn / (arr / 12)).toFixed(2) + "x";

    // ── RUNWAY CHECK ──
    if (cash && burn && burn > 0 && !runway)
      calc.runwayCalc           = (cash / burn).toFixed(1) + " months";

    return calc;
  };

    // Build calculated ratios summary for prompt
    const calcSummary = Object.entries(calc)
      .map(([k,v]) => `${k.replace("Calc","")}: ${v}`)
      .join(", ");

    // Fetch live market context for AI
    let marketContext = "";
    try {
      const fxRes  = await fetch("https://api.frankfurter.app/latest?from=INR");
      const fxData = await fxRes.json();
      const usd = fxData?.rates?.USD ? (1/fxData.rates.USD).toFixed(2) : null;
      const sar = fxData?.rates?.SAR ? (1/fxData.rates.SAR).toFixed(2) : null;
      const repoRate = "6.50";
      marketContext = [
        `RBI Repo Rate: ${repoRate}%`,
        `SBI effective lending rate: ~${(parseFloat(repoRate)+2.5).toFixed(2)}%`,
        usd && `USD/INR: ₹${usd}`,
        sar && `SAR/INR: ₹${sar}`,
      ].filter(Boolean).join(", ");
    } catch(e) { /* non-critical */ }

    const prompt = `You are Garima Agarwal, a Chartered Accountant and CFO advisor writing monthly financial analysis for your client ${company} for ${month}.

${packContext}

Financial data for ${month}:
${kpiSummary ? `KPIs: ${kpiSummary}` : ""}
${plSummary ? `P&L: ${plSummary}` : ""}
${debtSummary ? `Debt/Ratios: ${debtSummary}` : ""}
${wcSummary ? `Working Capital: ${wcSummary}` : ""}
${reportData?.loanScore ? `Loan Readiness Score: ${reportData.loanScore}/100` : ""}
${reportData?.varianceCommentary ? `Variance note: ${reportData.varianceCommentary}` : ""}
${calcSummary ? `Auto-calculated ratios: ${calcSummary}` : ""}
${reportData?.loanAmountSought ? `Loan sought: ${reportData.loanAmountSought} for ${reportData.loanPurpose||"unspecified purpose"}` : ""}
${marketContext ? `Current market context: ${marketContext}` : ""}
${pack==="startup" && reportData?.cac ? `Unit economics entered: CAC ${reportData.cac}, LTV ${reportData.ltv||"—"}` : ""}

Write the following analyses in Garima's voice — direct, specific, actionable. Use Indian financial context (lakhs, crores). Do NOT use generic filler. Every sentence should refer to actual numbers.

Respond ONLY with a valid JSON object (no markdown, no backticks) with these exact keys:
{
  "garimaNote": "2-3 sentence monthly dashboard note — what happened, why it matters, what to watch",
  "cashflowNote": "2-3 sentence cash flow analysis — cash position, burn/collections, forward outlook",
  "varianceCommentary": "1-2 sentence variance note — what beat or missed budget and why",
  "packNote": "3-4 sentence overall CFO pack commentary — performance narrative, key risks, recommended actions",
  "execPerformance": "2-3 sentences on performance for board executive summary",
  "execCash": "2-3 sentences on cash and liquidity for board executive summary",
  "execRisks": "2-3 key risks as numbered points",
  "execOpportunities": "2-3 opportunities as numbered points",
  "execNextSteps": "3-4 next steps as numbered points",
  "wcNote": "1-2 sentences on working capital efficiency (if MSME)",
  "ueNote": "1-2 sentences on unit economics assessment (if startup)",
  "loanNote": "1-2 sentences on loan readiness assessment",
  "forecastNote": "2-3 sentences on 3-month forward outlook"
}`;

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
      if (!apiKey) {
        setAiError("API key not configured. Add VITE_ANTHROPIC_KEY to your Vercel environment variables.");
        setAiGen(false);
        return;
      }
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20251001",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }
      const data = await res.json();
      const raw = data?.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiDraft(parsed);
    } catch(e) {
      setAiError("Generation failed — check your numbers are filled in and try again.");
      console.error(e);
    } finally {
      setAiGen(false);
    }
  };

  const applyDraft = (field) => {
    if (!aiDraft?.[field]) return;
    const updates = {[field]: aiDraft[field]};
    if (field === "garimaNote") {
      updates.packNote   = aiDraft[field];
      updates.reportNote = aiDraft[field];
    }
    setReportData(r => ({...r, ...updates}));
    if (field === "garimaNote") setKpis(k => ({...k, garima_note: aiDraft[field]}));
  };

  const applyAllDraft = () => {
    if (!aiDraft) return;
    // garimaNote from AI maps to packNote in reportData (used by monthly report)
    // also set reportNote as fallback
    const mapped = {...aiDraft};
    if (aiDraft.garimaNote) {
      mapped.packNote   = aiDraft.garimaNote;
      mapped.reportNote = aiDraft.garimaNote;
    }
    setReportData(r => ({...r, ...mapped}));
    // Also update the garima_note KPI field so Dashboard note updates
    if (aiDraft.garimaNote) {
      setKpis(k => ({...k, garima_note: aiDraft.garimaNote}));
    }
    setAiDraft(null);
    setSaved(false);
  };


  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:F }}>
      {/* Admin Sidebar */}
      <aside style={{ width:220, minHeight:"100vh", background:C.navy, flexShrink:0,
        display:"flex", flexDirection:"column", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding:"22px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <img src={LOGO_SRC} alt="Finzzup"
            style={{ height:38, width:"auto", objectFit:"contain", display:"block",
              objectFit:"contain" }}/>
          <div style={{ marginTop:10, padding:"4px 10px", borderRadius:100, display:"inline-block",
            background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.3)" }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#FBBF24", letterSpacing:"0.1em" }}>ADMIN</span>
          </div>
        </div>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:F }}>Logged in as</div>
          <div style={{ fontSize:13, fontWeight:700, color:"white", fontFamily:F, marginTop:2 }}>{admin.name}</div>
        </div>
        {/* Client selector */}
        {clients.length > 0 && (
          <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)",
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
              Active Client
            </div>
            <select value={selected?.id || ""} onChange={e => {
              const c = clients.find(x => x.id===e.target.value);
              if (c) selectClient(c);
            }} style={{ width:"100%", padding:"8px 10px", borderRadius:8, fontSize:12,
              background:"#1a2744", border:"1px solid rgba(255,255,255,0.2)",
              color:"white", fontFamily:F, outline:"none" }}>
              <option value="" style={{ background:"#1a2744", color:"white" }}>— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id} style={{ background:"#1a2744", color:"white" }}>{c.name} ({c.client_pack})</option>)}
            </select>
          </div>
        )}
        <nav style={{ flex:1, padding:"10px 0" }}>
          {ADMIN_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%",
              padding:"11px 16px", background:tab===t.id?"rgba(251,191,36,0.15)":"transparent",
              border:"none", cursor:"pointer",
              borderLeft:tab===t.id?"3px solid #FBBF24":"3px solid transparent",
              fontFamily:F }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>
              <span style={{ fontSize:13, fontWeight:600,
                color:tab===t.id?"#FBBF24":"rgba(255,255,255,0.5)" }}>{t.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8,
            width:"100%", padding:"10px 12px", background:"none", border:"none",
            cursor:"pointer", borderRadius:8, fontFamily:F, fontSize:13,
            fontWeight:600, color:"rgba(255,255,255,0.35)" }}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {/* Header */}
        <div style={{ height:58, background:C.bg2, borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", padding:"0 24px", gap:12 }}>
          <h1 style={{ fontFamily:F, fontWeight:700, fontSize:17, color:C.text, margin:0 }}>
            {ADMIN_TABS.find(t=>t.id===tab)?.label}
          </h1>
          {selected && tab !== "clients" && tab !== "addclient" && (
            <div style={{ padding:"4px 12px", borderRadius:100, background:`${C.amber}15`,
              border:`1px solid ${C.amber}30` }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.amber, fontFamily:F }}>
                {selected.name} — {selected.company}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding:24 }}>

          {/* ── ALL CLIENTS ── */}
          {tab === "clients" && (
            <div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:20 }}>
                {clients.length} client{clients.length!==1?"s":""} registered
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {clients.map(c => (
                  <Card key={c.id} style={{ padding:"16px 20px", cursor:"pointer",
                    borderLeft: selected?.id===c.id ? `3px solid ${C.amber}` : `3px solid transparent`,
                    transition:"box-shadow 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(15,26,56,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}
                    onClick={() => { selectClient(c); setTab("kpis"); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>{c.name}</div>
                        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>{c.company}</div>
                        <div style={{ fontFamily:FM, fontSize:11, color:C.dim, marginTop:4 }}>{c.email}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <Badge color={
                            c.client_pack==="msme" ? C.teal :
                            c.client_pack==="corporate" ? C.purple : C.blue
                          }>{c.client_pack?.toUpperCase()}</Badge>
                          <span style={{ fontFamily:FM, fontSize:10, fontWeight:700, color:C.amber,
                            background:`${C.amber}15`, padding:"2px 8px", borderRadius:100 }}>
                            {c.invite_code}
                          </span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleClientActive(c); }}
                          style={{ padding:"4px 12px", borderRadius:100, border:"none", cursor:"pointer",
                            fontFamily:F, fontSize:11, fontWeight:700,
                            background: c.active ? `${C.green}15` : `${C.red}15`,
                            color: c.active ? C.green : C.red }}>
                          {c.active ? "● Active" : "● Inactive"}
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {clients.length === 0 && (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
                  <div style={{ fontFamily:F, fontSize:15, color:C.muted }}>No clients yet</div>
                  <button onClick={() => setTab("addclient")} style={{ marginTop:16, padding:"10px 20px",
                    borderRadius:10, border:"none", background:C.blue, color:"white",
                    fontFamily:F, fontWeight:700, cursor:"pointer" }}>
                    Add First Client →
                  </button>
                </Card>
              )}
            </div>
          )}

          {/* ── ADD CLIENT ── */}
          {tab === "addclient" && (
            <Card style={{ maxWidth:520 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:20 }}>
                New Client Details
              </div>
              <AdminInput C={C} F={F} FM={FM} label="Client Name"    val={newClient.name}    onChange={v=>setNewClient(c=>({...c,name:v}))}    placeholder="e.g. Ravi Sharma" />
              <AdminInput C={C} F={F} FM={FM} label="Company"        val={newClient.company} onChange={v=>setNewClient(c=>({...c,company:v}))} placeholder="e.g. Sharma Textiles Pvt Ltd" />
              <AdminInput C={C} F={F} FM={FM} label="Email"          val={newClient.email}   onChange={v=>setNewClient(c=>({...c,email:v}))}   type="email" placeholder="client@company.com" />
              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                <div style={{ flex:1 }}>
                  <AdminInput C={C} F={F} FM={FM} label="Invite Code" val={newClient.invite_code}
                    onChange={v=>setNewClient(c=>({...c,invite_code:v.toUpperCase()}))}
                    placeholder="e.g. SHAR2026" mono={true} />
                </div>
                <button onClick={genCode} style={{ padding:"10px 14px", borderRadius:9, marginBottom:12,
                  border:`1px solid ${C.border}`, background:C.bg3, fontFamily:F, fontSize:12,
                  color:C.muted, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Auto-generate
                </button>
              </div>
              <AdminSelect C={C} F={F} label="Pack Type" val={newClient.client_pack}
                onChange={v=>setNewClient(c=>({...c,client_pack:v}))}
                options={[
                  {value:"startup",   label:"Startup / CFO Pack"},
                  {value:"msme",      label:"MSME Pack"},
                  {value:"corporate", label:"Corporate Pack"},
                ]}/>
              <AdminSelect C={C} F={F} label="Service Type" val={newClient.type}
                onChange={v=>setNewClient(c=>({...c,type:v}))}
                options={[
                  {value:"both",      label:"CFO + Valuation"},
                  {value:"cfo",       label:"CFO Only"},
                  {value:"valuation", label:"Valuation Only"},
                ]}/>
              <div style={{ marginTop:8 }}>
                <button onClick={createClient} style={{ padding:"12px 24px", borderRadius:10,
                  border:"none", background:C.grad1, color:"white", fontFamily:F,
                  fontWeight:700, fontSize:14, cursor:"pointer", touchAction:"manipulation" }}>
                  Create Client →
                </button>
              </div>
              <div style={{ marginTop:16, padding:"10px 14px", borderRadius:10,
                background:`${C.blue}08`, border:`1px solid ${C.blue}20` }}>
                <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0, lineHeight:1.7 }}>
                  💡 After creating, share the invite code with your client. They go to the portal,
                  enter the code, and create their own password. No manual password setup needed.
                </p>
              </div>
            </Card>
          )}

          {/* ── UPDATE KPIs ── */}
          {tab === "kpis" && (
            <div style={{ maxWidth:600 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text }}>
                        KPI Update — {selected.name}
                      </div>
                      {kpis.month && (
                        <div style={{ fontFamily:F, fontSize:11, color:C.blue, marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ background:`${C.blue}12`, padding:"2px 10px", borderRadius:100, fontWeight:700 }}>
                            📅 Currently showing: {kpis.month}
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily:F, fontSize:11, color:saved?C.green:C.muted, fontWeight:saved?700:400 }}>
                      {saved ? "✅ Saved to client portal" : "📝 Unsaved changes"}
                    </span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20 }}>
                    These numbers appear on the client's dashboard instantly after saving. Set the Month field to tell the client which period this covers.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Month" val={kpis.month} onChange={v=>setKpis(k=>({...k,month:v}))} placeholder="e.g. February 2026" />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }} className="kpi-edit-grid">
                    {(selected.client_pack === "msme" ? [
                      { label:"Revenue",           key:"revenue",      placeholder:"e.g. ₹84L"      },
                      { label:"Gross Margin",       key:"gross_margin", placeholder:"e.g. 41%"       },
                      { label:"Cash Balance",       key:"cash_balance", placeholder:"e.g. ₹26L"      },
                      { label:"Working Capital",    key:"burn_rate",    placeholder:"e.g. ₹32.4L"    },
                      { label:"Debtor Days",        key:"runway",       placeholder:"e.g. 46 days"   },
                      { label:"Cash Conv. Cycle",   key:"arr",          placeholder:"e.g. 37 days"   },
                    ] : selected.client_pack === "corporate" ? [
                      { label:"Revenue",            key:"revenue",      placeholder:"e.g. ₹842L"     },
                      { label:"EBITDA Margin",      key:"gross_margin", placeholder:"e.g. 17.5%"     },
                      { label:"Cash Balance",       key:"cash_balance", placeholder:"e.g. ₹4.2 Cr"  },
                      { label:"PAT",                key:"burn_rate",    placeholder:"e.g. ₹81L"      },
                      { label:"Net Debt",           key:"runway",       placeholder:"e.g. ₹1.8 Cr"  },
                      { label:"ROCE",               key:"arr",          placeholder:"e.g. 22.4%"     },
                    ] : [
                      { label:"Revenue",            key:"revenue",      placeholder:"e.g. ₹8.4 Cr"  },
                      { label:"Gross Margin",       key:"gross_margin", placeholder:"e.g. 41%"       },
                      { label:"Cash Balance",       key:"cash_balance", placeholder:"e.g. ₹2.1 Cr"  },
                      { label:"Burn Rate",          key:"burn_rate",    placeholder:"e.g. ₹48L/mo"  },
                      { label:"Runway",             key:"runway",       placeholder:"e.g. 4.4 months"},
                      { label:"ARR",                key:"arr",          placeholder:"e.g. ₹6.2 Cr"  },
                    ]).map(f => (
                      <AdminInput C={C} F={F} FM={FM} key={f.key} label={f.label} val={kpis[f.key]||""}
                        onChange={v=>setKpis(k=>({...k,[f.key]:v}))} placeholder={f.placeholder} mono />
                    ))}
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>
                      Garima's Note (shown on dashboard)
                    </label>
                    <textarea value={kpis.garima_note||""} onChange={e=>setKpis(k=>({...k,garima_note:e.target.value}))}
                      rows={4} placeholder="Write your monthly note for the client here..."
                      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
                        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                        background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
                      onFocus={e => e.target.style.borderColor = C.amber}
                      onBlur={e  => e.target.style.borderColor = C.border}
                    />
                  </div>
                  <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveKPIs}/>
                </Card>
              )}
              <style>{`.kpi-edit-grid{grid-template-columns:1fr 1fr!important}@media(max-width:480px){.kpi-edit-grid{grid-template-columns:1fr!important}}`}</style>
            </div>
          )}

          {/* ── ACTION ITEMS ── */}
          {tab === "actions" && (
            <div style={{ maxWidth:600 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
                    Add Action Item for {selected.name}
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="Action"
                    val={newAction.text}
                    onChange={v=>setNewAction(a=>({...a,text:v}))}
                    placeholder="e.g. File GST returns for Q3 by 15 March"/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <AdminSelect C={C} F={F} label="Priority" val={newAction.priority} onChange={v=>setNewAction(a=>({...a,priority:v}))}
                      options={[{value:"High",label:"High"},{value:"Medium",label:"Medium"},{value:"Low",label:"Low"}]}/>
                    <AdminInput C={C} F={F} FM={FM} label="Month" val={newAction.month} onChange={v=>setNewAction(a=>({...a,month:v}))} placeholder="e.g. March 2026"/>
                  </div>
                  <button onClick={addAction} style={{ padding:"10px 20px", borderRadius:10,
                    border:"none", background:C.grad1, color:"white", fontFamily:F,
                    fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    + Add Item
                  </button>
                </Card>
                <Card>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
                    Current Action Items ({actions.length})
                  </div>
                  {actions.length === 0 && (
                    <p style={{ fontFamily:F, fontSize:13, color:C.dim }}>No action items yet.</p>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {actions.map(a => (
                      <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:10,
                        padding:"10px 14px", borderRadius:10, background:a.done?`${C.green}06`:C.bg,
                        border:`1px solid ${a.done?C.green+"25":C.border}` }}>
                        <div onClick={() => toggleAction(a)} style={{ width:20, height:20, borderRadius:6,
                          background:a.done?C.green:C.bg3, display:"flex", alignItems:"center",
                          justifyContent:"center", cursor:"pointer", flexShrink:0, marginTop:2 }}>
                          {a.done && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:F, fontSize:13, color:a.done?C.dim:C.text,
                            textDecoration:a.done?"line-through":"none" }}>{a.text}</div>
                          <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                            <PriBadge p={a.priority}/>
                            {a.month && <span style={{ fontSize:11, color:C.dim, fontFamily:F }}>{a.month}</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteAction(a.id)} style={{ background:"none", border:"none",
                          color:C.dim, cursor:"pointer", fontSize:16, padding:2 }}>🗑</button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>)}
            </div>
          )}

          {/* ── VALUATION ENGAGEMENT ── */}
          {tab === "engagement" && (
            <div style={{ maxWidth:520 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (
                <Card>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:20 }}>
                    Valuation Engagement — {selected.name}
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="Engagement Type" val={engagement.type||""}
                    onChange={v=>setEngagement(e=>({...e,type:v}))}
                    placeholder="e.g. DCF Valuation — Section 56(2)(viib)"/>
                  <AdminInput C={C} F={F} FM={FM} label="Reference Number" val={engagement.ref_number||""}
                    onChange={v=>setEngagement(e=>({...e,ref_number:v}))}
                    placeholder="e.g. VAL-240216" mono/>
                  <AdminInput C={C} F={F} FM={FM} label="Expected Date" val={engagement.expected_date||""}
                    onChange={v=>setEngagement(e=>({...e,expected_date:v}))}
                    placeholder="e.g. 28 Feb 2026"/>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.08em", display:"block", marginBottom:10, fontFamily:F }}>
                      Status (Stage {engagement.status} of 5)
                    </label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["Docs Requested","Docs Received","Analysis","Draft Ready","Revision","Final Signed"].map((s,i) => (
                        <button key={i} onClick={() => setEngagement(e=>({...e,status:i}))}
                          style={{ padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer",
                            fontFamily:F, fontSize:12, fontWeight:600,
                            background: engagement.status===i ? C.blue : C.bg3,
                            color: engagement.status===i ? "white" : C.muted,
                            touchAction:"manipulation" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>
                      Status Note
                    </label>
                    <textarea value={engagement.garima_note||""} rows={3}
                      onChange={e=>setEngagement(en=>({...en,garima_note:e.target.value}))}
                      placeholder="e.g. Working on DCF model, on track for 28 Feb..."
                      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
                        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                        background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}/>
                  </div>
                  <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveEngagement}/>
                </Card>
              )}
            </div>
          )}

          {/* ── INVOICES ── */}
          {tab === "invoices" && (
            <div style={{ maxWidth:620 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
                {/* Create new invoice */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
                    Create Invoice for {selected.name}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Invoice Number" val={newInvoice.invoice_number}
                      onChange={v=>setNewInvoice(i=>({...i,invoice_number:v}))}
                      placeholder="e.g. INV-2026-001" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Amount (₹)" val={newInvoice.amount}
                      onChange={v=>setNewInvoice(i=>({...i,amount:v}))}
                      placeholder="e.g. ₹50,000"/>
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="Description" val={newInvoice.description}
                    onChange={v=>setNewInvoice(i=>({...i,description:v}))}
                    placeholder="e.g. CFO Retainer — March 2026"/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Due Date" val={newInvoice.due_date}
                      onChange={v=>setNewInvoice(i=>({...i,due_date:v}))}
                      placeholder="e.g. 31 Mar 2026"/>
                    <AdminSelect C={C} F={F} label="Status" val={newInvoice.status}
                      onChange={v=>setNewInvoice(i=>({...i,status:v}))}
                      options={[{value:"unpaid",label:"Unpaid"},{value:"paid",label:"Paid"}]}/>
                  </div>
                  <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={addInvoice} label="+ Create Invoice"/>
                </Card>

                {/* Invoice list */}
                <Card>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
                    All Invoices ({invoices.length})
                  </div>
                  {invoices.length === 0 && (
                    <p style={{ fontFamily:F, fontSize:13, color:C.dim }}>No invoices yet for this client.</p>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {invoices.map(inv => (
                      <div key={inv.id} style={{ padding:"14px 16px", borderRadius:12,
                        border:`1px solid ${inv.status==="paid" ? C.green+"30" : C.amber+"30"}`,
                        background: inv.status==="paid" ? `${C.green}04` : `${C.amber}04` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                          <div>
                            <div style={{ fontFamily:FM, fontSize:13, fontWeight:700, color:C.text }}>
                              {inv.invoice_number}
                            </div>
                            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:3 }}>
                              {inv.description}
                            </div>
                            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:3 }}>
                              Due: {inv.due_date || "—"}
                              {inv.paid_at && ` · Paid: ${new Date(inv.paid_at).toLocaleDateString("en-IN")}`}
                            </div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                            <div style={{ fontFamily:FM, fontSize:15, fontWeight:700, color:C.text }}>
                              {inv.amount}
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => markInvoicePaid(inv)}
                                style={{ padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer",
                                  fontFamily:F, fontSize:11, fontWeight:700,
                                  background: inv.status==="paid" ? `${C.green}15` : `${C.amber}15`,
                                  color: inv.status==="paid" ? C.green : C.amber }}>
                                {inv.status==="paid" ? "✓ Paid" : "Mark Paid"}
                              </button>
                              <button onClick={() => deleteInvoice(inv.id)}
                                style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${C.border}`,
                                  background:"none", color:C.red, cursor:"pointer", fontSize:13 }}>
                                🗑
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>)}
            </div>
          )}

          {/* ── REPORT DATA ── */}
          {tab === "reportdata" && (
            <div style={{ maxWidth:700 }}>
              {!selected || !reportData ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>

                {/* Pre-compute ratios once — avoids crashes from inline calls */}
                {(() => { try { window.__adminCalc = calcRatios(); } catch(e) { window.__adminCalc = {}; } return null; })()}

                {/* ══ 1: MONTH LABEL ═══════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>📅 Month Label</div>
                    {reportData?.monthLabel && (
                      <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                        background:`${C.blue}12`, padding:"3px 12px", borderRadius:100 }}>
                        Currently: {reportData.monthLabel}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    This month label appears on the client's Dashboard, Overview, and My Report pages so they always know which period they're viewing.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Month Label" val={reportData.monthLabel || ""}
                    onChange={v => setReportData(r => ({...r, monthLabel:v}))}
                    placeholder="e.g. February 2026"/>
                </Card>

                {/* ══ 2: PREVIOUS KPI VALUES ═══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📉 Previous Month KPI Values</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    Powers the <strong>▲ ▼ trend arrows</strong> and "Prev: …" text on the client dashboard.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {(selected.client_pack === "msme" ? [
                      { label:"Prev Revenue",          key:"revenue",      placeholder:"e.g. ₹79L"       },
                      { label:"Prev Gross Margin",      key:"gross_margin", placeholder:"e.g. 39%"         },
                      { label:"Prev Cash Balance",      key:"cash_balance", placeholder:"e.g. ₹24L"       },
                      { label:"Prev Working Capital",   key:"burn_rate",    placeholder:"e.g. ₹30.1L"     },
                      { label:"Prev Debtor Days",       key:"runway",       placeholder:"e.g. 51 days"    },
                      { label:"Prev Cash Conv. Cycle",  key:"arr",          placeholder:"e.g. 42 days"    },
                    ] : selected.client_pack === "corporate" ? [
                      { label:"Prev Revenue",           key:"revenue",      placeholder:"e.g. ₹810L"      },
                      { label:"Prev EBITDA Margin",     key:"gross_margin", placeholder:"e.g. 14.2%"      },
                      { label:"Prev Cash Balance",      key:"cash_balance", placeholder:"e.g. ₹3.9 Cr"   },
                      { label:"Prev PAT",               key:"burn_rate",    placeholder:"e.g. ₹56L"       },
                      { label:"Prev Net Debt",          key:"runway",       placeholder:"e.g. ₹2.1 Cr"   },
                      { label:"Prev ROCE",              key:"arr",          placeholder:"e.g. 18.3%"      },
                    ] : [
                      { label:"Prev Revenue",           key:"revenue",      placeholder:"e.g. ₹7.9 Cr"   },
                      { label:"Prev Gross Margin",      key:"gross_margin", placeholder:"e.g. 38%"        },
                      { label:"Prev Cash Balance",      key:"cash_balance", placeholder:"e.g. ₹2.6 Cr"   },
                      { label:"Prev Burn Rate",         key:"burn_rate",    placeholder:"e.g. ₹52L/mo"   },
                      { label:"Prev Runway",            key:"runway",       placeholder:"e.g. 5.0 months" },
                      { label:"Prev ARR",               key:"arr",          placeholder:"e.g. ₹5.4 Cr"   },
                    ]).map(f => (
                      <AdminInput C={C} F={F} FM={FM} key={f.key} label={f.label}
                        val={reportData.prevKpis?.[f.key] || ""}
                        onChange={v => setReportData(r => ({...r, prevKpis:{...(r.prevKpis||{}),[f.key]:v}}))}
                        placeholder={f.placeholder} mono/>
                    ))}
                  </div>
                </Card>

                {/* ══ 3: P&L INPUTS ════════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📊 P&L Inputs</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates <strong>Monthly Report → P&L Summary</strong>. "Actual" = this month. "Prev" = last month.
                    Use format like <code style={{ background:C.bg3, padding:"1px 6px", borderRadius:4, fontFamily:FM }}>₹84.2L</code>
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"150px 1fr 1fr", gap:10, marginBottom:8, paddingLeft:4 }}>
                    <div/>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.07em" }}>This Month (Actual)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prev Month</div>
                  </div>
                  {[
                    { label:"Revenue",          key:"revenue",      placeholder:"e.g. ₹84.2L", bold:false },
                    { label:"COGS",             key:"cogs",         placeholder:"e.g. ₹49.7L", bold:false },
                    { label:"Gross Profit",     key:"grossProfit",  placeholder:"e.g. ₹34.5L", bold:true  },
                    { label:"GP Margin %",      key:"gpMargin",     placeholder:"e.g. 41.0%",  bold:false, dim:true },
                    { label:"EBITDA",           key:"ebitda",       placeholder:"e.g. ₹14.7L", bold:true  },
                    { label:"EBITDA Margin %",  key:"ebitdaMargin", placeholder:"e.g. 17.5%",  bold:false, dim:true },
                    { label:"Net Profit / PAT", key:"pat",          placeholder:"e.g. ₹10.2L", bold:true  },
                    { label:"Net Margin %",     key:"netMargin",    placeholder:"e.g. 12.1%",  bold:false, dim:true },
                  ].map(row => (
                    <div key={row.key} style={{
                      display:"grid", gridTemplateColumns:"150px 1fr 1fr", gap:10, marginBottom:6,
                      padding: row.bold ? "10px 12px 10px 4px" : "3px 4px",
                      background: row.bold ? `${C.blue}06` : "transparent",
                      borderRadius: row.bold ? 10 : 0,
                      borderTop: row.bold ? `1px solid ${C.border}` : "none",
                    }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:row.bold?700:500,
                        color:row.dim?C.dim:C.text, fontStyle:row.dim?"italic":"normal",
                        display:"flex", alignItems:"center" }}>{row.label}</div>
                      <InlineInput value={reportData.pl?.[row.key]?.actual || ""}
                        onCommit={v => setReportData(r => ({...r, pl:{...(r.pl||{}), [row.key]:{...(r.pl?.[row.key]||{}), actual:v}}}))}
                        placeholder={row.placeholder}
                        style={{ fontFamily:FM, fontWeight:row.bold?700:400, color:C.text, background:row.bold?"#F0F4FF":C.bg }}/>
                      <InlineInput value={reportData.pl?.[row.key]?.prev || ""}
                        onCommit={v => setReportData(r => ({...r, pl:{...(r.pl||{}), [row.key]:{...(r.pl?.[row.key]||{}), prev:v}}}))}
                        placeholder="prev month"
                        style={{ fontFamily:FM, color:C.muted, background:C.bg }}/>
                    </div>
                  ))}
                </Card>

                {/* ══ 4: VARIANCE ANALYSIS ══════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📉 Variance Analysis — Budget vs Actual</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>Variance Analysis tab</strong> in the client's report. Variance auto-calculates. Toggle ✅/⚠️ per line.
                  </p>
                  <div style={{ overflowX:"auto", marginBottom:20 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F }}>
                      <thead>
                        <tr style={{ background:"#0A1128" }}>
                          {["P&L Line","Budget","Actual","Variance (auto)","Favourable?"].map((h,i) => (
                            <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"center",
                              color:"white", fontWeight:700, fontSize:11, letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.variance || []).map((row, i) => {
                          const bv = parseFloat(row.budget), av = parseFloat(row.actual);
                          const varNum = (!row.noCalc && !isNaN(bv) && !isNaN(av)) ? (av-bv).toFixed(1) : "—";
                          const varPct = (!row.noCalc && !isNaN(bv) && !isNaN(av) && bv!==0)
                            ? ((av-bv)/Math.abs(bv)*100).toFixed(1)+"%" : "";
                          const isBold = ["Gross Profit","EBITDA","Net Profit"].some(k => row.metric.includes(k));
                          return (
                            <tr key={i} style={{ background:isBold?`${C.blue}06`:i%2===0?"#FFFFFF":C.bg, borderBottom:`1px solid ${C.border}` }}>
                              <td style={{ padding:"10px 12px", fontWeight:isBold?700:500, fontSize:13, color:C.text }}>{row.metric}</td>
                              <td style={{ padding:"6px 8px" }}>
                                <InlineInput value={row.budget}
                                  onCommit={v => { const arr=[...reportData.variance]; arr[i]={...arr[i],budget:v}; setReportData(r=>({...r,variance:arr})); }}
                                  placeholder="budget"
                                  style={{ textAlign:"right", color:C.muted, background:C.bg }}/>
                              </td>
                              <td style={{ padding:"6px 8px" }}>
                                <InlineInput value={row.actual}
                                  onCommit={v => { const arr=[...reportData.variance]; arr[i]={...arr[i],actual:v}; setReportData(r=>({...r,variance:arr})); }}
                                  placeholder="actual"
                                  style={{ textAlign:"right", fontWeight:700, color:C.text, background:"#F0F4FF" }}/>
                              </td>
                              <td style={{ padding:"10px 12px", textAlign:"center", fontFamily:FM, fontSize:12, fontWeight:600,
                                color:varNum==="—"?C.dim:row.fav?C.green:C.red }}>
                                {varNum!=="—"?(row.fav?"+":"")+varNum:"—"}
                                {varPct && <div style={{ fontSize:10, opacity:0.7 }}>{row.fav?"+":""}{varPct}</div>}
                              </td>
                              <td style={{ padding:"8px", textAlign:"center" }}>
                                <button onClick={() => { const v=[...reportData.variance]; v[i]={...v[i],fav:!v[i].fav}; setReportData(r=>({...r,variance:v})); }}
                                  style={{ padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:700,
                                    background:row.fav?`${C.green}15`:`${C.red}15`, color:row.fav?C.green:C.red }}>
                                  {row.fav?"✅ Fav":"⚠️ Unfav"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Commentary */}
                  <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:14 }}>
                      📝 Variance Commentary — 3 key points shown in client report
                    </div>
                    {(reportData.varianceCommentary || []).map((row, i) => (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"20px 1fr 2fr 38px", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                        <div style={{ fontFamily:F, fontSize:13, color:C.muted, fontWeight:700, paddingTop:24 }}>{i+1}.</div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5, fontFamily:F }}>Heading</label>
                          <InlineInput value={row.item}
                            onCommit={v => { const arr=[...reportData.varianceCommentary]; arr[i]={...arr[i],item:v}; setReportData(r=>({...r,varianceCommentary:arr})); }}
                            placeholder="e.g. Revenue beat"
                            style={{ fontSize:13, fontFamily:F, color:C.text, background:C.bg }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5, fontFamily:F }}>Commentary</label>
                          <InlineInput value={row.note}
                            onCommit={v => { const arr=[...reportData.varianceCommentary]; arr[i]={...arr[i],note:v}; setReportData(r=>({...r,varianceCommentary:arr})); }}
                            placeholder="e.g. New contracts signed in Feb drove +6.1% MoM"
                            style={{ fontSize:13, fontFamily:F, color:C.text, background:C.bg }}/>
                        </div>
                        <div style={{ paddingTop:22 }}>
                          <button onClick={() => { const v=[...reportData.varianceCommentary]; v[i]={...v[i],favorable:!v[i].favorable}; setReportData(r=>({...r,varianceCommentary:v})); }}
                            style={{ padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:700,
                              background:row.favorable?`${C.green}15`:`${C.red}15`, color:row.favorable?C.green:C.red }}>
                            {row.favorable?"✅":"⚠️"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* ══ EXISTING: CASH FLOW DATA ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    💰 Cash Flow Chart Data
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter values in ₹L (lakhs). Actual = past months. Forecast = future. Leave blank to skip.{" "}
                    {selected.client_pack === "startup"
                      ? "For startup clients: cash balance chart shows Actual vs Forecast."
                      : selected.client_pack === "msme"
                      ? "For MSME clients: this drives the Inflows vs Outflows chart. Enter monthly inflow in Actual and outflow in Forecast."
                      : "For corporate clients: enter Operating CF in Actual and Total Net CF in Forecast."}
                  </p>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F }}>
                      <thead>
                        <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                          {(selected.client_pack==="msme"
                          ? ["Month","Inflows (₹L)","Outflows (₹L)"]
                          : selected.client_pack==="corporate"
                          ? ["Month","Operating CF (₹L)","Net CF (₹L)"]
                          : ["Month","Actual (₹L)","Forecast (₹L)"]
                        ).map((h,i) => (
                            <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:11,
                              fontWeight:700, color:C.muted, textTransform:"uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.cashflow || []).map((row, i) => (
                          <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                            <td style={{ padding:"8px 10px", fontFamily:FM, fontSize:13, fontWeight:700, color:C.text, width:80 }}>{row.month}</td>
                            <td style={{ padding:"6px 10px" }}>
                              <InlineInput value={row.actual}
                                onCommit={v => { const cf=[...reportData.cashflow]; cf[i]={...cf[i],actual:v}; setReportData(r=>({...r,cashflow:cf})); }}
                                placeholder="e.g. 220"
                                style={{ color:C.blue, background:"#EFF6FF" }}/>
                            </td>
                            <td style={{ padding:"6px 10px" }}>
                              <InlineInput value={row.forecast}
                                onCommit={v => { const cf=[...reportData.cashflow]; cf[i]={...cf[i],forecast:v}; setReportData(r=>({...r,cashflow:cf})); }}
                                placeholder="e.g. 195"
                                style={{ color:C.purple, background:"#F5F0FF" }}/>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* ══ EXISTING: PACK SCORE ══════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    🎯 {selected.client_pack==="startup"?"Fundraise":selected.client_pack==="msme"?"Cash Health":"IPO Readiness"} Score
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Overall score (0–100) shown as the big gauge on the client's report page.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Overall Score (0-100)" val={reportData.score || ""}
                    onChange={v => setReportData(r=>({...r,score:v}))} placeholder="e.g. 72" mono/>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10, marginTop:4 }}>Score Breakdown</div>
                  {(reportData.scoreBreakdown || []).map((item, i) => (
                    <div key={i} style={{ marginBottom:12, padding:"12px 14px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:8 }}>{item.label}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10 }}>
                        <InlineInput value={item.score}
                          onCommit={v => { const sb=[...reportData.scoreBreakdown]; sb[i]={...sb[i],score:v}; setReportData(r=>({...r,scoreBreakdown:sb})); }}
                          placeholder="Score 0-100" style={{ fontFamily:FM, color:C.blue, background:"#F0F4FF" }}/>
                        <InlineInput value={item.comment}
                          onCommit={v => { const sb=[...reportData.scoreBreakdown]; sb[i]={...sb[i],comment:v}; setReportData(r=>({...r,scoreBreakdown:sb})); }}
                          placeholder="Comment shown to client..." style={{ fontFamily:F, color:C.text, background:C.bg }}/>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* ══ LOAN READINESS SCORE (startup only) ══════════════════════ */}
                {selected.client_pack === "startup" && (
                  <Card style={{ marginBottom:20, border:`1px solid ${C.blue}25`, background:`${C.blue}04` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>🏦 Loan Readiness Score</div>
                      {reportData?.loanScore && (
                        <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                          background:`${C.blue}12`, padding:"3px 12px", borderRadius:100 }}>
                          Currently: {reportData.loanScore}/100
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                      Score shown on the client's <strong>Loan Readiness tab</strong>. Set this manually after reviewing the client's loan eligibility. 
                      0–54 = Early Stage · 55–74 = Moderate · 75–100 = Strong Profile.
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                      <AdminInput C={C} F={F} FM={FM} label="Loan Readiness Score (0-100)"
                        val={reportData.loanScore || ""}
                        onChange={v => setReportData(r => ({...r, loanScore: v}))}
                        placeholder="e.g. 68" mono/>
                      <div style={{ padding:"12px 14px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Score Guide</div>
                        <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.8 }}>
                          <span style={{ color:C.red }}>0–54</span> Early Stage<br/>
                          <span style={{ color:C.amber }}>55–74</span> Moderate — eligible with prep<br/>
                          <span style={{ color:C.green }}>75–100</span> Strong — eligible for most schemes
                        </div>
                      </div>
                    </div>
                    <AdminInput C={C} F={F} FM={FM} label="Garima's Loan Note (shown to client)"
                      val={reportData.loanNote || ""}
                      onChange={v => setReportData(r => ({...r, loanNote: v}))}
                      placeholder="e.g. Your profile is strong for CGTMSE. We recommend completing the financial projections before applying to SBI Startup Branch."/>
                  </Card>
                )}

                {/* ══ DEBT RATIOS (msme + corporate) ═══════════════════════════ */}
                {(selected.client_pack === "msme" || selected.client_pack === "corporate") && (
                  <Card style={{ marginBottom:20, border:`1px solid ${C.teal}20`, background:`${C.teal}03` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                      📐 Debt & Financial Ratios
                    </div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                      These ratios appear in the client's Cash Health / Board Report and are included in the downloadable PDF report.
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <AdminInput C={C} F={F} FM={FM} label="DSCR (Debt Service Coverage)"
                          val={reportData.dscr || ""}
                          onChange={v => setReportData(r => ({...r, dscr:v}))}
                          placeholder="e.g. 2.1x" mono/>
                        {!reportData.dscr && (window.__adminCalc||{}).dscrCalc && (
                          <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>
                            {"⚡ Calculated: "}{(window.__adminCalc||{}).dscrCalc}{" — will auto-fill on Generate"}
                          </div>
                        )}
                      </div>
                      <div>
                        <AdminInput C={C} F={F} FM={FM} label="Interest Coverage Ratio"
                          val={reportData.interestCoverage || ""}
                          onChange={v => setReportData(r => ({...r, interestCoverage:v}))}
                          placeholder="e.g. 4.2x" mono/>
                        {!reportData.interestCoverage && (window.__adminCalc||{}).interestCoverageCalc && (
                          <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>
                            {"⚡ Calculated: "}{(window.__adminCalc||{}).interestCoverageCalc}
                          </div>
                        )}
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Interest Margin / Net Interest"
                        val={reportData.interestMargin || ""}
                        onChange={v => setReportData(r => ({...r, interestMargin:v}))}
                        placeholder="e.g. 3.8%" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="ROE (Return on Equity)"
                        val={reportData.roe || ""}
                        onChange={v => setReportData(r => ({...r, roe:v}))}
                        placeholder="e.g. 18.4%" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="Current Ratio"
                        val={reportData.currentRatio || ""}
                        onChange={v => setReportData(r => ({...r, currentRatio:v}))}
                        placeholder="e.g. 1.8x" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="Debt / Equity Ratio"
                        val={reportData.debtEquity || ""}
                        onChange={v => setReportData(r => ({...r, debtEquity:v}))}
                        placeholder="e.g. 0.6:1" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="Cash Conversion Cycle"
                        val={reportData.ccc || ""}
                        onChange={v => setReportData(r => ({...r, ccc:v}))}
                        placeholder="e.g. 37 days" mono/>
                      <div>
                        <AdminInput C={C} F={F} FM={FM} label="Debt / EBITDA"
                          val={reportData.debtEbitda || ""}
                          onChange={v => setReportData(r => ({...r, debtEbitda:v}))}
                          placeholder="e.g. 2.4x" mono/>
                        {!reportData.debtEbitda && (window.__adminCalc||{}).debtEbitdaCalc && (
                          <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>
                            {"⚡ Calculated: "}{(window.__adminCalc||{}).debtEbitdaCalc}
                          </div>
                        )}
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Working Capital"
                        val={reportData.workingCapital || ""}
                        onChange={v => setReportData(r => ({...r, workingCapital:v}))}
                        placeholder="e.g. Rs.32.4L" mono/>
                    </div>
                  </Card>
                )}

                {/* ══ UNIT ECONOMICS (startup only) ══════════════════════════════ */}
                {selected.client_pack === "startup" && (
                  <Card style={{ marginBottom:20, border:`1px solid ${C.teal}20`, background:`${C.teal}04` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"📐 Unit Economics"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                      {"Shown on the client's Unit Economics tab. Fill in after reviewing their data. Leave blank to show — (not yet assessed)."}
                    </p>

                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>{"Core Metrics"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                      {[
                        { key:"cac",           label:"CAC",                   placeholder:"e.g. ₹12,000" },
                        { key:"ltv",           label:"LTV",                   placeholder:"e.g. ₹85,000" },
                        { key:"ltvCac",        label:"LTV:CAC Ratio",         placeholder:"e.g. 7.1x" },
                        { key:"cacPayback",    label:"CAC Payback Period",    placeholder:"e.g. 8 months" },
                        { key:"arr",           label:"ARR",                   placeholder:"e.g. ₹6.2 Cr" },
                        { key:"burnMultiple",  label:"Burn Multiple",         placeholder:"e.g. 1.4x" },
                      ].map(f => (
                        <div key={f.key}>
                          <AdminInput C={C} F={F} FM={FM} label={f.label}
                            val={reportData[f.key] || ""}
                            onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                            placeholder={f.placeholder} mono/>
                          {!reportData[f.key] && f.key==="ltvCac" && (window.__adminCalc||{}).ltvCacCalc && (
                            <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>{"⚡ Calculated: "}{(window.__adminCalc||{}).ltvCacCalc}</div>
                          )}
                          {!reportData[f.key] && f.key==="burnMultiple" && (window.__adminCalc||{}).burnMultipleCalc && (
                            <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>{"⚡ Calculated: "}{(window.__adminCalc||{}).burnMultipleCalc}</div>
                          )}
                          {!reportData[f.key] && f.key==="cacPayback" && (window.__adminCalc||{}).cacPaybackCalc && (
                            <div style={{ fontFamily:F, fontSize:10, color:C.teal, marginTop:3 }}>{"⚡ Calculated: "}{(window.__adminCalc||{}).cacPaybackCalc}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>{"Growth & Retention"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                      {[
                        { key:"momGrowth",    label:"MoM Revenue Growth",    placeholder:"e.g. 6%" },
                        { key:"nrr",          label:"Net Revenue Retention", placeholder:"e.g. 108%" },
                        { key:"churnRate",    label:"Gross Churn (Monthly)", placeholder:"e.g. 1.8%" },
                        { key:"magicNumber",  label:"Magic Number",          placeholder:"e.g. 0.82" },
                      ].map(f => (
                        <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                          val={reportData[f.key] || ""}
                          onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                          placeholder={f.placeholder} mono/>
                      ))}
                    </div>

                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>{"Benchmarks (override defaults)"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                      {[
                        { key:"cacBenchmark",        label:"CAC Benchmark",        placeholder:"e.g. Sector avg: ₹8,000–15,000" },
                        { key:"ltvCacBenchmark",      label:"LTV:CAC Benchmark",    placeholder:"e.g. Series A min: 3x" },
                        { key:"cacPaybackBenchmark",  label:"Payback Benchmark",    placeholder:"e.g. Investors prefer <12 months" },
                        { key:"nrrBenchmark",         label:"NRR Benchmark",        placeholder:"e.g. Good: >100% · Great: >120%" },
                        { key:"churnBenchmark",       label:"Churn Benchmark",      placeholder:"e.g. SaaS target: <2%/mo" },
                        { key:"arrBenchmark",         label:"ARR Benchmark",        placeholder:"e.g. Series A: ₹3–10 Cr" },
                      ].map(f => (
                        <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                          val={reportData[f.key] || ""}
                          onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                          placeholder={f.placeholder}/>
                      ))}
                    </div>

                    <AdminInput C={C} F={F} FM={FM} label="Garima's UE Assessment (shown to client)"
                      val={reportData.ueNote || ""}
                      onChange={v => setReportData(r => ({...r, ueNote:v}))}
                      placeholder="e.g. LTV:CAC of 7.1x is strong — well above Series A threshold. Focus on reducing CAC from ₹12K to ₹8K before next raise."/>
                  </Card>
                )}

                {/* ══ KPI BENCHMARKS ═══════════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"🎯 KPI Benchmarks"}</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    {"Override the default sector benchmarks shown under each KPI card. Leave blank to use the built-in defaults."}
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {[
                      { key:"benchRevenue",      label:"Revenue Benchmark",       placeholder:"e.g. Series A: ₹10 Cr ARR" },
                      { key:"benchMargin",       label:"Margin Benchmark",        placeholder:"e.g. Target: 45%+ gross margin" },
                      { key:"benchCash",         label:"Cash Benchmark",          placeholder:"e.g. Maintain 9–12 months runway" },
                      { key:"benchBurn",         label:"Burn Benchmark",          placeholder:"e.g. Efficient: <₹40L/mo" },
                      { key:"benchRunway",       label:"Runway Benchmark",        placeholder:"e.g. Fundraise trigger: <9 months" },
                      { key:"benchArr",          label:"ARR Benchmark",           placeholder:"e.g. Series A: ₹3–10 Cr" },
                      { key:"benchEbitda",       label:"EBITDA Benchmark",        placeholder:"e.g. Sector avg: 15–18% margin" },
                      { key:"benchDebtorDays",   label:"Debtor Days Benchmark",   placeholder:"e.g. Target: <30 days" },
                    ].map(f => (
                      <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                        val={reportData[f.key] || ""}
                        onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                        placeholder={f.placeholder}/>
                    ))}
                  </div>
                </Card>

                {/* ══ MSME: WORKING CAPITAL FIELDS ══════════════════════════════ */}
                {selected.client_pack === "msme" && (
                  <Card style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"⚙️ Working Capital Data"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                      {"Shown on Working Capital tab — AR aging, CCC components, ratios."}
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {[
                        { key:"debtorDays",    label:"Debtor Days",        placeholder:"e.g. 46 days" },
                        { key:"creditorDays",  label:"Creditor Days",      placeholder:"e.g. 31 days" },
                        { key:"inventoryDays", label:"Inventory Days",     placeholder:"e.g. 22 days" },
                        { key:"ccc",           label:"Cash Conversion Cycle (auto)", placeholder:"e.g. 37 days" },
                        { key:"cccCashImpact", label:"Cash per Day CCC",   placeholder:"e.g. ₹2.8L" },
                        { key:"quickRatio",    label:"Quick Ratio",        placeholder:"e.g. 1.18x" },
                        { key:"invTurnover",   label:"Inventory Turnover", placeholder:"e.g. 6.2x" },
                        { key:"debtorTurn",    label:"Debtor Turnover",    placeholder:"e.g. 7.8x" },
                        { key:"ar0to30",       label:"AR 0–30 days",       placeholder:"e.g. ₹18.2L" },
                        { key:"ar31to60",      label:"AR 31–60 days",      placeholder:"e.g. ₹12.4L" },
                        { key:"ar61to90",      label:"AR 61–90 days",      placeholder:"e.g. ₹4.8L" },
                        { key:"ar90plus",      label:"AR 90+ days",        placeholder:"e.g. ₹2.9L" },
                      ].map(f => (
                        <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                          val={reportData[f.key] || ""}
                          onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                          placeholder={f.placeholder} mono/>
                      ))}
                    </div>
                    <AdminInput C={C} F={F} FM={FM} label="AR Collections Note"
                      val={reportData.arNote || ""}
                      onChange={v => setReportData(r => ({...r, arNote:v}))}
                      placeholder="e.g. Client B (₹4.8L) overdue 90+ days — legal notice issued 12 Mar."/>
                    <AdminInput C={C} F={F} FM={FM} label="Working Capital Assessment"
                      val={reportData.wcNote || ""}
                      onChange={v => setReportData(r => ({...r, wcNote:v}))}
                      placeholder="e.g. CCC improved to 37 days but still above target. Debtor concentration in top 3 clients (64% of AR) is the primary risk — diversify collections."/>
                  </Card>
                )}

                {/* ══ CORPORATE: GOVERNANCE FIELDS ═══════════════════════════════ */}
                {selected.client_pack === "corporate" && (
                  <Card style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"⚖️ Board Governance Data"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                      {"Shown on Board Governance tab — compliance statuses, director counts, Ind AS health."}
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      {[
                        { key:"execDirectors",   label:"Executive Directors",      placeholder:"e.g. 2" },
                        { key:"indepDirectors",  label:"Independent Directors",    placeholder:"e.g. 1" },
                        { key:"boardMeetings",   label:"Board Meetings YTD",       placeholder:"e.g. 3" },
                      ].map(f => (
                        <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                          val={reportData[f.key] || ""}
                          onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                          placeholder={f.placeholder} mono/>
                      ))}
                    </div>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>{"Compliance Statuses (done / pending / na)"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      {[
                        { key:"rocStatus",    label:"ROC Annual Return"    },
                        { key:"aocStatus",    label:"AOC-4 Filing"         },
                        { key:"agmStatus",    label:"AGM Board Resolution" },
                        { key:"dirKycStatus", label:"Director KYC"         },
                        { key:"auditStatus",  label:"Statutory Audit"      },
                        { key:"rptStatus",    label:"RPT Approval"         },
                        { key:"csrStatus",    label:"CSR Compliance"       },
                        { key:"indAsStatus",  label:"Ind AS Statements"    },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{f.label}</div>
                          <select value={reportData[f.key] || "pending"}
                            onChange={e => setReportData(r => ({...r, [f.key]:e.target.value}))}
                            style={{ width:"100%", padding:"8px 10px", borderRadius:8,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">✅ Done</option>
                            <option value="pending">⏳ Pending</option>
                            <option value="na">➖ N/A</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>{"Ind AS Status"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      {[
                        { key:"indAs116", label:"Ind AS 116 — Leases"      },
                        { key:"indAs109", label:"Ind AS 109 — Fin Instruments" },
                        { key:"indAs115", label:"Ind AS 115 — Revenue"      },
                        { key:"indAs36",  label:"Ind AS 36 — Impairment"    },
                        { key:"indAs12",  label:"Ind AS 12 — Deferred Tax"  },
                        { key:"indAsRpt", label:"RPT Disclosures"           },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{f.label}</div>
                          <select value={reportData[f.key] || "review"}
                            onChange={e => setReportData(r => ({...r, [f.key]:e.target.value}))}
                            style={{ width:"100%", padding:"8px 10px", borderRadius:8,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">✅ Compliant</option>
                            <option value="review">⚠️ Needs Review</option>
                            <option value="na">➖ Not Applicable</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <AdminInput C={C} F={F} FM={FM} label="Governance Assessment"
                      val={reportData.governanceNote || ""}
                      onChange={v => setReportData(r => ({...r, governanceNote:v}))}
                      placeholder="e.g. Company is broadly compliant. Key gaps: independent director appointment pending (required before next funding round) and Ind AS 116 lease capitalisation needs to be completed before audit sign-off."/>
                  </Card>
                )}

                {/* ══ CORPORATE: BOARD HIGHLIGHTS + IPO GAPS ══════════════════ */}
                {selected.client_pack === "corporate" && (
                  <Card style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"📋 Board Monthly Highlights"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                      {"3 things the board should focus on this month — shown on Monthly Report tab."}
                    </p>
                    {[
                      { key:"boardHighlight1", placeholder:"e.g. EBITDA margin at 17.5% — highest in 4 quarters. Driven by opex discipline and revenue scale." },
                      { key:"boardHighlight2", placeholder:"e.g. PAT at ₹81L vs budget ₹56L — 44.6% ahead. Full year PAT likely to exceed plan by ₹180L." },
                      { key:"boardHighlight3", placeholder:"e.g. Finance costs stable at ₹22L despite rate environment — fixed rate loan hedging paying off." },
                    ].map((f, i) => (
                      <AdminInput key={f.key} C={C} F={F} FM={FM} label={`Board Highlight ${i+1}`}
                        val={reportData[f.key] || ""}
                        onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                        placeholder={f.placeholder}/>
                    ))}

                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, margin:"16px 0 10px" }}>{"IPO Gap Statuses"}</div>
                    <p style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:12, lineHeight:1.6 }}>{"Track progress on the 6 critical IPO readiness gaps."}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                      {[
                        { key:"ipoGap1", label:"3-year PAT profitability" },
                        { key:"ipoGap2", label:"Independent director" },
                        { key:"ipoGap3", label:"Auditor upgrade" },
                        { key:"ipoGap4", label:"Ind AS restatement" },
                        { key:"ipoGap5", label:"Legal & IP clean-up" },
                        { key:"ipoGap6", label:"ESOP formalised" },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{f.label}</div>
                          <select value={reportData[f.key] || "pending"}
                            onChange={e => setReportData(r => ({...r, [f.key]:e.target.value}))}
                            style={{ width:"100%", padding:"8px 10px", borderRadius:8,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">✅ Done</option>
                            <option value="pending">⭕ Pending</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <AdminInput C={C} F={F} FM={FM} label="Garima's IPO Note"
                      val={reportData.ipoNote || ""}
                      onChange={v => setReportData(r => ({...r, ipoNote:v}))}
                      placeholder="e.g. IPO readiness score at 65/100. Key focus for next 6 months: appoint independent director and initiate Ind AS restatement with auditors. Revenue scale is strong — the financial story is compelling once governance gaps are closed."/>
                  </Card>
                )}

                {/* ══ EXISTING: KEY METRICS ═════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📋 Key Metrics Table</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Investor metrics / working capital ratios shown in the client's pack.
                  </p>
                  {(reportData.metrics || []).map((m, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr auto", gap:8,
                      alignItems:"center", marginBottom:8, padding:"8px 12px", borderRadius:10,
                      background:C.bg, border:`1px solid ${C.border}` }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.muted }}>{m.label}</div>
                      <InlineInput value={m.value}
                        onCommit={v => { const ms=[...reportData.metrics]; ms[i]={...ms[i],value:v}; setReportData(r=>({...r,metrics:ms})); }}
                        placeholder="Value" style={{ fontFamily:FM, color:C.blue, background:"#F0F4FF" }}/>
                      <InlineInput value={m.note}
                        onCommit={v => { const ms=[...reportData.metrics]; ms[i]={...ms[i],note:v}; setReportData(r=>({...r,metrics:ms})); }}
                        placeholder="Note..." style={{ fontFamily:F, color:C.text, background:C.bg }}/>
                      <button onClick={() => {
                        const ms=[...reportData.metrics]; ms[i]={...ms[i],flag:!ms[i].flag};
                        setReportData(r=>({...r,metrics:ms}));
                      }} style={{ padding:"7px 10px", borderRadius:8, border:"none", cursor:"pointer",
                        background:m.flag?`${C.red}15`:`${C.green}15`,
                        color:m.flag?C.red:C.green, fontSize:12, fontWeight:700, fontFamily:F, whiteSpace:"nowrap" }}>
                        {m.flag?"⚠️ Flag":"✅ OK"}
                      </button>
                    </div>
                  ))}
                </Card>

                {/* ══ EXISTING: CHECKLIST ═══════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    ✅ {selected.client_pack==="corporate"?"Compliance Checklist":"Due Diligence Checklist"}
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Tick items as the client completes/provides them. Shown on their report page.
                  </p>
                  {(reportData.checklist || []).map((item, i) => (
                    <div key={i} onClick={() => {
                      const cl=[...reportData.checklist]; cl[i]={...cl[i],done:!cl[i].done};
                      setReportData(r=>({...r,checklist:cl}));
                    }} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                      borderRadius:10, marginBottom:8, cursor:"pointer",
                      background:item.done?`${C.green}06`:C.bg,
                      border:`1px solid ${item.done?C.green+"25":C.border}` }}>
                      <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                        background:item.done?C.green:C.bg3, border:`2px solid ${item.done?C.green:C.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {item.done && <span style={{ color:"white", fontSize:11, fontWeight:900 }}>✓</span>}
                      </div>
                      <div style={{ fontFamily:F, fontSize:13, color:item.done?C.dim:C.text,
                        textDecoration:item.done?"line-through":"none" }}>{item.item}</div>
                    </div>
                  ))}
                </Card>

                {/* ══ EXISTING: MARKET BENCHMARKS ══════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📊 Market Benchmarks</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown in the market benchmarks table on the client's dashboard.
                  </p>
                  {(reportData.benchmarks || []).map((b, i) => (
                    <div key={i} style={{ marginBottom:10, padding:"10px 14px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:8 }}>{b.metric}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8 }}>
                        {[
                          { key:"yours",  placeholder:"Your value",    color:"#F0F4FF", fc:C.blue },
                          { key:"median", placeholder:"Sector median",  color:C.bg,     fc:C.text },
                          { key:"bench",  placeholder:"Benchmark",      color:C.bg,     fc:C.text },
                        ].map(col => (
                          <InlineInput key={col.key} value={b[col.key]}
                            onCommit={v => { const bm=[...reportData.benchmarks]; bm[i]={...bm[i],[col.key]:v}; setReportData(r=>({...r,benchmarks:bm})); }}
                            placeholder={col.placeholder}
                            style={{ fontFamily:FM, color:col.fc, background:col.color }}/>
                        ))}
                        <button onClick={() => {
                          const bm=[...reportData.benchmarks]; bm[i]={...bm[i],ok:!bm[i].ok};
                          setReportData(r=>({...r,benchmarks:bm}));
                        }} style={{ padding:"7px 10px", borderRadius:8, border:"none", cursor:"pointer",
                          background:b.ok?`${C.green}15`:`${C.amber}15`,
                          color:b.ok?C.green:C.amber, fontSize:11, fontWeight:700, fontFamily:F }}>
                          {b.ok?"✅ Ahead":"⚠️ Gap"}
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* ══ NOTES ═══════════════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📝 Garima's Monthly Note</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.6 }}>
                    Shown at the top of the client's <strong>My Report</strong> page and dashboard.
                  </p>
                  <textarea value={reportData.reportNote || reportData.packNote || ""} rows={4}
                    onChange={e => setReportData(r=>({...r,reportNote:e.target.value,packNote:e.target.value}))}
                    placeholder="e.g. Strong month — revenue up 6.1%, EBITDA margin at 17.5%..."
                    style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
                      border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                      background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
                    onFocus={e=>e.target.style.borderColor=C.amber}
                    onBlur={e=>e.target.style.borderColor=C.border}/>
                </Card>
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>💰 Garima's Cash Flow Note</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.6 }}>
                    Shown at the bottom of the client's <strong>Cash Flow</strong> screen.
                  </p>
                  <textarea value={reportData.cashflowNote || ""} rows={4}
                    onChange={e => setReportData(r=>({...r,cashflowNote:e.target.value}))}
                    placeholder="e.g. March forecast dips due to advance tax + delayed collection from Client B..."
                    style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
                      border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                      background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
                    onFocus={e=>e.target.style.borderColor=C.amber}
                    onBlur={e=>e.target.style.borderColor=C.border}/>
                </Card>

                {/* ══ 3-MONTH FORECAST ════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"🔭 3-Month Forward View"}</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    {"Shown on the client's Dashboard. Write your outlook and optionally add 3 forward data points (e.g. projected revenue)."}
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Garima's Forward Outlook"
                    val={reportData.forecastNote || ""}
                    onChange={v => setReportData(r => ({...r, forecastNote:v}))}
                    placeholder="e.g. Revenue trajectory is strong for Q1. March may dip slightly due to advance tax outflow but April–May looks positive. Focus: close 2 enterprise deals before quarter end."/>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, margin:"14px 0 10px" }}>{"Forward Data Points (optional)"}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    {[
                      { lkey:"forecast1Label", vkey:"forecast1Value", tkey:"forecast1Trend", num:"1" },
                      { lkey:"forecast2Label", vkey:"forecast2Value", tkey:"forecast2Trend", num:"2" },
                      { lkey:"forecast3Label", vkey:"forecast3Value", tkey:"forecast3Trend", num:"3" },
                    ].map(f => (
                      <div key={f.num} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <AdminInput C={C} F={F} FM={FM} label={`Month ${f.num} Label`}
                          val={reportData[f.lkey] || ""}
                          onChange={v => setReportData(r => ({...r, [f.lkey]:v}))}
                          placeholder="e.g. April 2026"/>
                        <AdminInput C={C} F={F} FM={FM} label="Value"
                          val={reportData[f.vkey] || ""}
                          onChange={v => setReportData(r => ({...r, [f.vkey]:v}))}
                          placeholder="e.g. ₹92L" mono/>
                        <select value={reportData[f.tkey] || "stable"}
                          onChange={e => setReportData(r => ({...r, [f.tkey]:e.target.value}))}
                          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`,
                            background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                          <option value="up">▲ Improving</option>
                          <option value="stable">→ Stable</option>
                          <option value="down">▼ Watch</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* ══ EXECUTIVE SUMMARY ════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"📋 Board Executive Summary"}</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    {"One paragraph each — shown in the downloadable Board Executive Summary PDF. Write in plain English as if briefing a board member."}
                  </p>
                  {[
                    { key:"execPerformance",   label:"📈 Performance",      placeholder:"e.g. Revenue grew 6% MoM to ₹84L — tracking ahead of Q4 plan. Gross margin improved to 41% as COGS optimisation begins to reflect. EBITDA positive for second consecutive month." },
                    { key:"execCash",          label:"💰 Cash & Liquidity",  placeholder:"e.g. Cash position at ₹2.1 Cr with 4.4 months runway. March will see pressure from advance tax (₹22L) and delayed Client B collection. April outlook is positive." },
                    { key:"execRisks",         label:"⚠️ Key Risks",         placeholder:"e.g. (1) Runway below 6 months — fundraise urgently. (2) Client B overdue ₹4.8L at 90+ days. (3) Burn multiple at 1.8x — above Series A benchmark." },
                    { key:"execOpportunities", label:"🚀 Opportunities",     placeholder:"e.g. (1) SBI Startup Branch intro secured — loan application ready. (2) SIES Incubator partnership in progress — 5 potential clients. (3) EBITDA margin improving — profitability within reach." },
                    { key:"execNextSteps",     label:"✅ Next Steps",        placeholder:"e.g. (1) Close Client B collection by 15 Mar. (2) File GSTR-3B by 20 Mar. (3) Submit SBI loan application by 31 Mar. (4) Begin Series A deck preparation." },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:6 }}>{f.label}</div>
                      <textarea value={reportData[f.key] || ""} rows={3}
                        onChange={e => setReportData(r => ({...r, [f.key]:e.target.value}))}
                        placeholder={f.placeholder}
                        style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:13,
                          border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                          background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
                        onFocus={e=>e.target.style.borderColor=C.blue}
                        onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                  ))}
                </Card>

                {/* Cash Pressure Points — startup only */}
                {selected.client_pack === "startup" && (
                  <Card style={{ marginBottom:20, border:`1px solid ${C.red}20`, background:`${C.red}04` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"⚠️ Upcoming Cash Pressure Points"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                      {"Shown as red warning cards on the startup cash flow page — helps client flag upcoming cash stress."}
                    </p>
                    {[
                      { key:"cashPressure1", label:"Pressure Point 1", placeholder:"e.g. Advance tax Q4 — Rs.22L due 15 Mar" },
                      { key:"cashPressure2", label:"Pressure Point 2", placeholder:"e.g. Client B collection overdue — Rs.4.8L at risk" },
                      { key:"cashPressure3", label:"Pressure Point 3", placeholder:"e.g. Payroll + benefits — Rs.28L due 1 Apr" },
                    ].map(f => (
                      <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                        val={reportData[f.key] || ""}
                        onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                        placeholder={f.placeholder}/>
                    ))}
                  </Card>
                )}

                {/* ══ RAW INPUTS → AUTO RATIOS ═══════════════════════════════ */}
                {reportData && <Card style={{ marginBottom:20, border:`1px solid ${C.teal}20`, background:`${C.teal}04` }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    {"⚡ Raw Inputs — Ratios Auto-Calculate"}
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    {"Enter these from the client's books (Tally / bank statement). All ratios — DSCR, Interest Coverage, Debt/EBITDA, CCC, LTV:CAC, Burn Multiple — calculate automatically when you click Generate Analysis."}
                  </p>

                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>
                    {"Balance Sheet Inputs"}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    {[
                      { key:"debtors",      label:"Trade Debtors (AR)",           placeholder:"e.g. ₹38.4L" },
                      { key:"creditors",    label:"Trade Creditors (AP)",          placeholder:"e.g. ₹22.1L" },
                      { key:"inventory",    label:"Inventory / Stock",             placeholder:"e.g. ₹15.8L or Nil" },
                      { key:"existingDebt", label:"Total Existing Debt / Loans",   placeholder:"e.g. ₹45L or Nil" },
                      { key:"interestCost", label:"Annual Interest Cost",          placeholder:"e.g. ₹5.2L or Nil" },
                      { key:"operatingCF",  label:"Operating Cash Flow",           placeholder:"e.g. ₹18.4L" },
                    ].map(f => (
                      <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                        val={reportData[f.key] || ""}
                        onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                        placeholder={f.placeholder} mono/>
                    ))}
                  </div>

                  {selected.client_pack === "startup" && (<>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>
                      {"Unit Economics Inputs"}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                      {[
                        { key:"totalMktgSpend",  label:"Total Sales + Mktg Spend (month)", placeholder:"e.g. ₹8.4L" },
                        { key:"newCustomers",    label:"New Customers Acquired",            placeholder:"e.g. 70" },
                        { key:"avgRevPerCust",   label:"Avg Revenue per Customer",          placeholder:"e.g. ₹12,000/yr" },
                        { key:"avgRetentionMos", label:"Avg Customer Lifetime (months)",    placeholder:"e.g. 24" },
                        { key:"churnRate",       label:"Monthly Churn Rate",                placeholder:"e.g. 2.1%" },
                        { key:"nrr",             label:"Net Revenue Retention",             placeholder:"e.g. 108%" },
                      ].map(f => (
                        <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.label}
                          val={reportData[f.key] || ""}
                          onChange={v => setReportData(r => ({...r, [f.key]:v}))}
                          placeholder={f.placeholder} mono/>
                      ))}
                    </div>
                  </>)}

                  {/* Show auto-calculated preview */}
                  {(() => {
                    const c = window.__adminCalc || {};
                    const items = [
                      c.interestCoverageCalc && { label:"Interest Coverage", value:c.interestCoverageCalc },
                      c.debtEbitdaCalc       && { label:"Debt / EBITDA",     value:c.debtEbitdaCalc       },
                      c.dscrCalc             && { label:"DSCR",              value:c.dscrCalc             },
                      c.cccCalc              && { label:"CCC",               value:c.cccCalc              },
                      c.debtorDaysCalc       && { label:"Debtor Days",       value:c.debtorDaysCalc       },
                      c.creditorDaysCalc     && { label:"Creditor Days",     value:c.creditorDaysCalc     },
                      c.ltvCacCalc           && { label:"LTV : CAC",         value:c.ltvCacCalc           },
                      c.burnMultipleCalc     && { label:"Burn Multiple",     value:c.burnMultipleCalc     },
                      c.cacPaybackCalc       && { label:"CAC Payback",       value:c.cacPaybackCalc       },
                    ].filter(Boolean);
                    if (items.length === 0) return null;
                    return (
                      <div style={{ padding:"12px 14px", borderRadius:10,
                        background:`${C.teal}08`, border:`1px solid ${C.teal}20` }}>
                        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.teal,
                          textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
                          {"⚡ Auto-Calculated from above"}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }} className="inv-grid">
                          {items.map((item, i) => (
                            <div key={i} style={{ padding:"8px 12px", borderRadius:8,
                              background:"rgba(255,255,255,0.7)", border:`1px solid ${C.teal}15` }}>
                              <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginBottom:2 }}>{item.label}</div>
                              <div style={{ fontFamily:FM, fontSize:15, fontWeight:700, color:C.teal }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontFamily:F, fontSize:11, color:C.teal, marginTop:8 }}>
                          {"These will auto-fill into the report when you click Generate Analysis ↓"}
                        </div>
                      </div>
                    );
                  })()}
                </Card>}

                {/* ══ AI ANALYSIS GENERATOR ══════════════════════════════════ */}
                {reportData && <Card style={{ marginBottom:20, border:`1.5px solid ${C.purple}30`,
                  background:`linear-gradient(135deg,${C.purple}06,${C.blue}04)` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:36, height:36, borderRadius:10,
                      background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                      {"✨"}
                    </div>
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
                        {"Generate Analysis with AI"}
                      </div>
                      <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>
                        {"Reads all the numbers you've entered and drafts Garima's commentary — you review and approve"}
                      </div>
                    </div>
                  </div>

                  <button onClick={generateAnalysis} disabled={aiGenerating}
                    style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
                      background: aiGenerating
                        ? C.bg3
                        : `linear-gradient(135deg,${C.purple},${C.blue})`,
                      color: aiGenerating ? C.muted : "white",
                      fontFamily:F, fontWeight:700, fontSize:14, cursor: aiGenerating ? "not-allowed" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                      marginBottom: aiDraft || aiError ? 16 : 0 }}>
                    {aiGenerating
                      ? <><span>⟳</span>{" Analysing numbers..."}</>
                      : "✨ Generate Analysis Draft"
                    }
                  </button>

                  {aiError && (
                    <div style={{ padding:"10px 14px", borderRadius:8, background:`${C.red}10`,
                      border:`1px solid ${C.red}20`, fontFamily:F, fontSize:12, color:C.red }}>
                      {aiError}
                    </div>
                  )}

                  {aiDraft && (
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text,
                        marginBottom:12 }}>
                        {"📋 Draft ready — review and apply"}
                      </div>

                      {/* Show each generated field with apply button */}
                      {[
                        { key:"garimaNote",        label:"Dashboard Note",           field:"garimaNote"        },
                        { key:"cashflowNote",       label:"Cash Flow Analysis",       field:"cashflowNote"       },
                        { key:"packNote",           label:"CFO Pack Commentary",      field:"packNote"           },
                        { key:"varianceCommentary", label:"Variance Commentary",      field:"varianceCommentary" },
                        { key:"forecastNote",       label:"3-Month Forward Outlook",  field:"forecastNote"       },
                        { key:"loanNote",           label:"Loan Readiness Note",      field:"loanNote"           },
                        ...(selected?.client_pack==="startup" ? [{ key:"ueNote", label:"Unit Economics Note", field:"ueNote" }] : []),
                        ...(selected?.client_pack==="msme"    ? [{ key:"wcNote", label:"Working Capital Note", field:"wcNote" }] : []),
                        { key:"execPerformance",    label:"Board: Performance",       field:"execPerformance"    },
                        { key:"execCash",           label:"Board: Cash & Liquidity",  field:"execCash"           },
                        { key:"execRisks",          label:"Board: Key Risks",         field:"execRisks"          },
                        { key:"execOpportunities",  label:"Board: Opportunities",     field:"execOpportunities"  },
                        { key:"execNextSteps",       label:"Board: Next Steps",        field:"execNextSteps"       },
                      ].filter(f => aiDraft[f.key]).map((f, i) => (
                        <div key={i} style={{ marginBottom:10, padding:"12px 14px", borderRadius:10,
                          background:C.bg, border:`1px solid ${C.border}` }}>
                          <div style={{ display:"flex", alignItems:"center",
                            justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontFamily:F, fontSize:11, fontWeight:700,
                              color:C.purple, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                              {f.label}
                            </span>
                            <button onClick={() => applyDraft(f.field)}
                              style={{ padding:"3px 12px", borderRadius:100, border:"none",
                                background:`${C.purple}15`, color:C.purple,
                                fontFamily:F, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                              {"Apply"}
                            </button>
                          </div>
                          <div style={{ fontFamily:F, fontSize:12, color:C.text,
                            lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                            {aiDraft[f.key]}
                          </div>
                        </div>
                      ))}

                      {/* Apply All button */}
                      <div style={{ display:"flex", gap:10, marginTop:4 }}>
                        <button onClick={applyAllDraft}
                          style={{ flex:1, padding:"11px", borderRadius:10, border:"none",
                            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                            color:"white", fontFamily:F, fontWeight:700, fontSize:13,
                            cursor:"pointer" }}>
                          {"✅ Apply All & Save"}
                        </button>
                        <button onClick={() => setAiDraft(null)}
                          style={{ padding:"11px 16px", borderRadius:10,
                            border:`1px solid ${C.border}`, background:C.bg,
                            color:C.muted, fontFamily:F, fontSize:13, cursor:"pointer" }}>
                          {"Discard"}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>}

                {reportData && <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData} label="Save All Report Data"/>}
              </>)}
            </div>
          )}

          {/* ── TREASURY ── */}
          {tab === "treasury" && (
            <div style={{ maxWidth:700 }}>
              {!selected || !reportData ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
                {/* Summary KPIs */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>💎 Treasury Summary</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the client's Treasury overview tab.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Total Cash" val={reportData.treasury?.totalCash||""}
                      onChange={v=>setReportData(r=>({...r,treasury:{...(r.treasury||{}),totalCash:v}}))} placeholder="e.g. ₹50.4L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="% Invested in FDs" val={reportData.treasury?.investedPct||""}
                      onChange={v=>setReportData(r=>({...r,treasury:{...(r.treasury||{}),investedPct:v}}))} placeholder="e.g. 65" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Annual Yield" val={reportData.treasury?.yieldPA||""}
                      onChange={v=>setReportData(r=>({...r,treasury:{...(r.treasury||{}),yieldPA:v}}))} placeholder="e.g. ₹3.2L" mono/>
                  </div>
                </Card>

                {/* Cash Positions */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>🏦 Cash Positions</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Each row = one bank account or FD shown on the client's Treasury page.
                  </p>
                  {(reportData.treasury?.cashPositions || []).map((p,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8,
                      marginBottom:10, padding:"10px 12px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                      <InlineInput value={p.bank} placeholder="Bank / FD name"
                        onCommit={v=>{ const cp=[...(reportData.treasury?.cashPositions||[])]; cp[i]={...cp[i],bank:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),cashPositions:cp}})); }}
                        style={{ fontFamily:F, color:C.text }}/>
                      <InlineInput value={p.balance} placeholder="₹ balance"
                        onCommit={v=>{ const cp=[...(reportData.treasury?.cashPositions||[])]; cp[i]={...cp[i],balance:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),cashPositions:cp}})); }}
                        style={{ fontFamily:FM, color:C.blue, background:"#EEF3FE" }}/>
                      <InlineInput value={p.rate} placeholder="rate p.a."
                        onCommit={v=>{ const cp=[...(reportData.treasury?.cashPositions||[])]; cp[i]={...cp[i],rate:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),cashPositions:cp}})); }}
                        style={{ fontFamily:FM, color:C.green }}/>
                      <InlineInput value={p.note||""} placeholder="note (optional)"
                        onCommit={v=>{ const cp=[...(reportData.treasury?.cashPositions||[])]; cp[i]={...cp[i],note:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),cashPositions:cp}})); }}
                        style={{ fontFamily:F, color:C.muted }}/>
                      <button onClick={()=>{ const cp=[...(reportData.treasury?.cashPositions||[])]; cp[i]={...cp[i],flag:!cp[i].flag}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),cashPositions:cp}})); }}
                        style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:F, fontSize:11, fontWeight:700,
                          background:p.flag?`${C.amber}15`:`${C.green}15`, color:p.flag?C.amber:C.green }}>
                        {p.flag?"⚠️":"✅"}
                      </button>
                    </div>
                  ))}
                </Card>

                {/* Maturity Schedule */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📅 FD Maturity Schedule</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the Maturity Schedule tab. Enter maturing FDs and recommended action.
                  </p>
                  {(reportData.treasury?.maturitySchedule || []).map((m,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8,
                      marginBottom:10, padding:"10px 12px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                      <InlineInput value={m.item} placeholder="FD / instrument name"
                        onCommit={v=>{ const ms=[...(reportData.treasury?.maturitySchedule||[])]; ms[i]={...ms[i],item:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),maturitySchedule:ms}})); }}
                        style={{ fontFamily:F, color:C.text }}/>
                      <InlineInput value={m.maturity} placeholder="Maturity date"
                        onCommit={v=>{ const ms=[...(reportData.treasury?.maturitySchedule||[])]; ms[i]={...ms[i],maturity:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),maturitySchedule:ms}})); }}
                        style={{ fontFamily:FM, color:C.muted }}/>
                      <InlineInput value={m.amount} placeholder="Amount"
                        onCommit={v=>{ const ms=[...(reportData.treasury?.maturitySchedule||[])]; ms[i]={...ms[i],amount:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),maturitySchedule:ms}})); }}
                        style={{ fontFamily:FM, color:C.blue, background:"#EEF3FE" }}/>
                      <AdminSelect C={C} F={F} label="" val={m.action||"Renew"}
                        onChange={v=>{ const ms=[...(reportData.treasury?.maturitySchedule||[])]; ms[i]={...ms[i],action:v}; setReportData(r=>({...r,treasury:{...(r.treasury||{}),maturitySchedule:ms}})); }}
                        options={[{value:"Renew",label:"Renew"},{value:"Redeem",label:"Redeem"},{value:"Auto-renew",label:"Auto-renew"},{value:"Partial",label:"Partial"}]}/>
                    </div>
                  ))}
                </Card>

                {/* Recommendations */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>💡 Recommendations</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the client's Recommendations tab. Write specific, actionable advice.
                  </p>
                  {(reportData.treasury?.recommendations || []).map((r,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:10,
                      marginBottom:10, padding:"10px 12px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}`, alignItems:"center" }}>
                      <AdminSelect C={C} F={F} label="" val={r.priority||"Medium"}
                        onChange={v=>{ const rs=[...(reportData.treasury?.recommendations||[])]; rs[i]={...rs[i],priority:v}; setReportData(rd=>({...rd,treasury:{...(rd.treasury||{}),recommendations:rs}})); }}
                        options={[{value:"High",label:"🔴 High"},{value:"Medium",label:"🟡 Medium"},{value:"Low",label:"🟢 Low"}]}/>
                      <InlineInput value={r.text} placeholder="e.g. Renew SBI FD Tranche 1 — lock in 7.1% before April RBI review"
                        onCommit={v=>{ const rs=[...(reportData.treasury?.recommendations||[])]; rs[i]={...rs[i],text:v}; setReportData(rd=>({...rd,treasury:{...(rd.treasury||{}),recommendations:rs}})); }}
                        style={{ fontFamily:F, color:C.text }}/>
                    </div>
                  ))}
                </Card>

                <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData} label="Save Treasury Data"/>
              </>)}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === "documents" && (
            <div style={{ maxWidth:600 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
                {/* Upload area */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
                      Upload Document for {selected.name}
                    </div>
                    <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.amber,
                      background:`${C.amber}15`, padding:"3px 10px", borderRadius:100 }}>
                      {selected.client_pack?.toUpperCase()} · {selected.company?.split(" ")[0]}
                    </span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Upload board packs, valuation reports, or any client document. Max 10MB per file.
                  </p>
                  {/* Doc type selector */}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>
                      Document Type
                    </label>
                    <select id="doc-type-select" defaultValue="general"
                      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:13,
                        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                        background:C.bg, outline:"none" }}>
                      <option value="general">General Document</option>
                      <option value="board_pack">Board Pack / Monthly Report</option>
                      <option value="valuation">Valuation Report</option>
                      <option value="mis">MIS / P&L Pack</option>
                      <option value="invoice">Invoice</option>
                      <option value="legal">Legal / Compliance</option>
                    </select>
                  </div>
                  <label style={{ display:"block", padding:"28px 20px", borderRadius:12,
                    border:`2px dashed ${C.border}`, textAlign:"center", cursor:"pointer",
                    background:C.bg, transition:"border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <input type="file" style={{ display:"none" }}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file || !selected) return;
                        if (file.size > 10 * 1024 * 1024) {
                          alert("File too large — max 10MB per upload.");
                          e.target.value = "";
                          return;
                        }
                        setDocLoading(true);
                        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                        const path = `${selected.id}/${Date.now()}-${safeName}`;
                        const { error: upErr } = await supabase.storage
                          .from("client-docs").upload(path, file);
                        if (upErr) { alert("Upload failed: " + upErr.message); setDocLoading(false); return; }
                        const { data: urlData } = supabase.storage
                          .from("client-docs").getPublicUrl(path);
                        const docTypeEl = document.getElementById("doc-type-select");
                        const docType = docTypeEl ? docTypeEl.value : "general";
                        const { data: docRow, error: insertErr } = await supabase.from("documents").insert({
                          client_id: selected.id,
                          name: file.name,
                          file_url: urlData.publicUrl,
                          file_size: (file.size/1024/1024).toFixed(2) + " MB",
                          uploaded_by: "garima",
                          doc_type: docType,
                          created_at: new Date().toISOString(),
                        }).select().single();
                        if (insertErr) { alert("Saved to storage but DB record failed: " + insertErr.message); }
                        if (docRow) setDocs(prev => [docRow, ...prev]);
                        setDocLoading(false);
                        e.target.value = "";
                      }}
                    />
                    {docLoading ? (
                      <div style={{ fontFamily:F, fontSize:14, color:C.blue }}>Uploading…</div>
                    ) : (<>
                      <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
                      <div style={{ fontFamily:F, fontSize:14, fontWeight:600, color:C.text }}>
                        Click to upload a file
                      </div>
                      <div style={{ fontFamily:F, fontSize:12, color:C.dim, marginTop:4 }}>
                        PDF, Excel, Word — max 10MB
                      </div>
                    </>)}
                  </label>
                </Card>

                {/* Document list */}
                <Card>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
                    Uploaded Documents ({docs.length})
                  </div>
                  {docs.length === 0 && (
                    <p style={{ fontFamily:F, fontSize:13, color:C.dim }}>No documents uploaded yet.</p>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {docs.map((d,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"12px 14px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}`,
                        flexWrap:"wrap", gap:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:`${C.blue}12`,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📄</div>
                          <div>
                            <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{d.name}</div>
                            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                              <span>{d.file_size}</span>
                              <span>·</span>
                              <span>{d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN") : "—"}</span>
                              {d.doc_type && d.doc_type !== "general" && (
                                <span style={{ color:C.blue, fontWeight:700, textTransform:"uppercase", fontSize:10,
                                  background:`${C.blue}12`, padding:"1px 7px", borderRadius:100 }}>
                                  {d.doc_type.replace("_"," ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <a href={d.file_url} target="_blank" rel="noopener"
                            style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${C.blue}`,
                              color:C.blue, fontFamily:F, fontWeight:600, fontSize:12, textDecoration:"none" }}>
                            View
                          </a>
                          <button onClick={async () => {
                            await supabase.from("documents").delete().eq("id", d.id);
                            setDocs(prev => prev.filter(x => x.id!==d.id));
                          }} style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                            background:"none", color:C.red, cursor:"pointer", fontSize:13 }}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>)}
            </div>
          )}

          {/* ── REQUESTS ── */}
          {tab === "requests" && (
            <div style={{ padding:28 }}>
              <div style={{ fontFamily:F, fontWeight:800, fontSize:20, color:C.text, marginBottom:4 }}>
                📩 Client Requests
              </div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:24 }}>
                Service requests submitted by clients through the portal.
              </p>
              {reqLoading ? (
                <Card>
                  <p style={{ fontFamily:F, fontSize:13, color:C.dim, textAlign:"center", padding:"24px 0" }}>
                    Loading requests…
                  </p>
                </Card>
              ) : requests.length === 0 ? (
                <Card>
                  <div style={{ textAlign:"center", padding:"32px 0" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                    <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>
                      No requests from {selected.name} yet.
                    </div>
                  </div>
                </Card>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {requests.map((r, i) => (
                    <Card key={r.id || i} style={{ padding:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
                              {r.service_name || r.service_id || "Service Request"}
                            </span>
                            <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700,
                              background: r.status==="new" ? `${C.amber}18` : r.status==="in_progress" ? `${C.blue}18` : `${C.green}18`,
                              color: r.status==="new" ? C.amber : r.status==="in_progress" ? C.blue : C.green,
                              fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                              {r.status || "new"}
                            </span>
                          </div>
                          <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:6 }}>
                            <strong>{r.client_name}</strong> · {r.company} · {r.email}
                            {r.phone && <span> · {r.phone}</span>}
                          </div>
                          {r.notes && (
                            <div style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6,
                              padding:"10px 14px", borderRadius:8, background:C.bg3, marginTop:8 }}>
                              {r.notes}
                            </div>
                          )}
                          <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:8 }}>
                            Submitted: {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—"}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                          <select
                            value={r.status || "new"}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await supabase.from("requests").update({ status: newStatus }).eq("id", r.id);
                              setRequests(prev => prev.map(x => x.id===r.id ? {...x, status:newStatus} : x));
                            }}
                            style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                              fontFamily:F, fontSize:12, color:C.text, background:C.bg, cursor:"pointer" }}>
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="proposal_sent">Proposal Sent</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                          </select>
                          <button onClick={async () => {
                            if (!window.confirm("Delete this request?")) return;
                            await supabase.from("requests").delete().eq("id", r.id);
                            setRequests(prev => prev.filter(x => x.id !== r.id));
                          }} style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`,
                            background:"none", color:C.red, cursor:"pointer", fontSize:14 }}>🗑</button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "market" && (
            <div style={{ maxWidth:900 }}>
              <MarketIntel client={selected || {client_pack:"startup"}}/>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [client,  setClient]  = useState(null);
  const [admin,   setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdminRoute = window.location.pathname === "/admin";

  // Restore session on page refresh
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        if (isAdminRoute) {
          const { data: adminData } = await supabase
            .from("admins").select("*").eq("email", session.user.email).single();
          if (adminData) setAdmin(adminData);
        } else {
          // Check if this is a demo email — restore demo session without DB hit
          const demoMatch = Object.entries(INVITE_CODES).find(
            ([, d]) => d.email === session.user.email
          );
          if (demoMatch) {
            const [code, demo] = demoMatch;
            setClient({ ...demo, invite_code: code, id: code, isDemo: true,
              client_pack: demo.clientPack || demo.client_pack || "startup" });
          } else {
            // Real client — fetch from Supabase
            const { data: clientData } = await supabase
              .from("clients").select("*").eq("email", session.user.email).single();
            if (clientData) setClient(clientData);
          }
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") { setClient(null); setAdmin(null); }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClient(null); setAdmin(null);
  };

  const Loader = () => (
    <div style={{ minHeight:"100vh", background:isAdminRoute?"#0A1128":C.bg,
      display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F }}>
      <div style={{ textAlign:"center" }}>
        <img src={LOGO_SRC} alt="Finzzup"
          style={{ height:60, width:"auto", objectFit:"contain", display:"block",
            objectFit:"contain" }}/>
        <p style={{ color:C.muted, fontSize:13, marginTop:12 }}>Loading…</p>
      </div>
    </div>
  );

  if (loading) return <Loader/>;

  // Admin route
  if (isAdminRoute) {
    if (!admin) return <AdminLogin onLogin={setAdmin}/>;
    return <AdminPanel admin={admin} onLogout={handleLogout}/>;
  }

  // Client route
  if (!client) return <Login onLogin={setClient}/>;
  return <Portal client={client} onLogout={handleLogout}/>;
}

