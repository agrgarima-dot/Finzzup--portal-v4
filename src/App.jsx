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
const Logo = ({ size=32, darkText=false, showTagline=false }) => {
  const lime = "#5B4FDB";
  const iconBg = "white";
  const textColor = darkText ? "#111827" : "white";
  const s = (size/32)*40;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill={lime}/>
          <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
            style={{ fontFamily:"'Inter Tight', 'Inter', sans-serif", fontWeight:800, fontSize:22, fill:iconBg }}>
            F
          </text>
          <circle cx="30" cy="10" r="5" fill={iconBg}/>
          <circle cx="32" cy="10" r="2" fill="white"/>
        </svg>
        <span style={{ fontFamily:"'Inter Tight', 'Inter', sans-serif", fontWeight:800,
          fontSize:size*0.69, color:textColor, letterSpacing:"-0.02em" }}>
          Finzzup
        </span>
      </div>
      {showTagline && (
        <div style={{ fontFamily:"'Plus Jakarta Sans', sans-serif", fontSize:10,
          color: darkText ? "#9CA3AF" : "rgba(255,255,255,0.45)",
          marginTop:2, letterSpacing:"0.04em" }}>
          Smart Finance · Trusted Insights
        </div>
      )}
    </div>
  );
};

// ─── LOGIN INPUT — defined OUTSIDE Login so it never remounts on re-render ────
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
              <svg width={44} height={44} viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="#5B4FDB"/>
                <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
                  style={{ fontFamily:"'Inter Tight', 'Inter', sans-serif", fontWeight:800, fontSize:22, fill:"white" }}>
                  F
                </text>
                <circle cx="30" cy="10" r="5" fill="white"/>
                <circle cx="32" cy="10" r="2" fill="#5B4FDB"/>
              </svg>
              <span style={{ fontFamily:"'Inter Tight', 'Inter', sans-serif", fontWeight:800,
                fontSize:28, color:C.text, letterSpacing:"-0.02em" }}>Finzzup</span>
            </div>
            <p style={{ fontSize:12, color:C.muted, margin:0, letterSpacing:"0.03em" }}>
              Smart Finance · Trusted Insights
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
        {!collapsed && <Logo size={26} showTagline={true}/>}
        {collapsed && (
          <div style={{ width:32, height:32, borderRadius:8,
            background:"linear-gradient(135deg,#3B6FF7,#7C5CF5)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:900, color:"white" }}>F</div>
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
        {(PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.overviewKpis || PACK_CONFIG.startup.overviewKpis).map((k,i) => (
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
            <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>Prev: {k.prev}</div>
          </Card>
        ))}
      </div>

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
            {displayKpis?.[0]?.value && displayKpis[0].value !== "—" ? ` · Updated: ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}` : ""}
          </div>
        </div>
      </div>

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

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }} className="kpi-grid">
        {displayKpis.map((k,i) => (
          <Card key={i} style={{ padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:k.bg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                {k.icon}
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:k.trend==="up"?C.green:C.red,
                background:k.trend==="up"?"#ECFDF5":"#FEF2F2", padding:"3px 8px",
                borderRadius:100, fontFamily:F }}>
                {k.trend==="up" ? "▲" : "▼"} vs last month
              </span>
            </div>
            <div style={{ fontFamily:FM, fontWeight:600, fontSize:22, color:k.color, marginBottom:2 }}>
              {k.value}
            </div>
            <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, marginBottom:2 }}>
              {k.label}
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>
              Prev: {k.prev}
            </div>
          </Card>
        ))}
      </div>

      {/* Quick links row — pack-aware */}
      {(() => {
        const qpack = client?.client_pack || client?.clientPack || "startup";
        const quickItems = qpack === "msme" ? [
          { icon:"📊", label:"MSME Report", color:C.teal, action:"myreport",
            sub: reportData?.monthLabel || new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"}) },
          { icon:"✅", label:"Action Items", color:C.red, action:"actions",
            sub: `${pendingActions.length} pending · ${highPriority.length} high priority` },
          { icon:"💎", label:"Treasury", color:C.blue, action:"treasury",
            sub:"Cash visibility & FD tracking" },
        ] : qpack === "corporate" ? [
          { icon:"🏦", label:"Board Report", color:C.purple, action:"myreport",
            sub: reportData?.monthLabel || new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"}) },
          { icon:"✅", label:"Action Items", color:C.red, action:"actions",
            sub: `${pendingActions.length} pending · ${highPriority.length} high priority` },
          { icon:"📋", label:"Valuation Status", color:C.teal, action:"engagement",
            sub: engagement?.garima_note?.slice(0,40)+"…" || "Active engagement" },
        ] : [
          { icon:"📁", label:"Latest CFO Report", color:C.purple, action:"myreport",
            sub: reportData?.monthLabel || new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"}) },
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
      <Card style={{ marginTop:20, borderTop:`3px solid ${C.purple}` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
          📊 {packCfg.benchmarkTitle}
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>
          How your key metrics compare to sector medians (Source: public filings & industry databases)
        </div>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%", minWidth:520, borderCollapse:"collapse", fontFamily:F }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {packCfg.benchmarkCols.map((h,i) => (
                  <th key={i} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, fontWeight:700,
                    color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em",
                    whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reportData?.benchmarks && reportData.benchmarks.some(b=>b.yours) ? reportData.benchmarks : packCfg.benchmarks).map((r,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 12px", fontWeight:600, fontSize:13, color:C.text }}>{r.metric}</td>
                  <td style={{ padding:"10px 12px", fontFamily:FM, fontSize:13, fontWeight:700, color:C.blue }}>{r.yours}</td>
                  <td style={{ padding:"10px 12px", fontFamily:FM, fontSize:12, color:C.muted }}>{r.median}</td>
                  <td style={{ padding:"10px 12px", fontFamily:FM, fontSize:12, color:C.muted }}>{r.bench}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <Badge color={r.ok?C.green:C.amber} bg={r.ok?"#ECFDF5":"#FFFBEB"}>
                      {r.ok ? "✅ Ahead" : "⚠️ Gap"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10,
          background:`${C.purple}08`, border:`1px solid ${C.purple}20` }}>
          <span style={{ fontFamily:F, fontSize:12, color:C.purple, fontWeight:600 }}>
            💡 <strong>API Integration:</strong> Market data can be connected via Screener.in, Moneycontrol, or custom APIs. Contact Garima to set up live competitor benchmarking for your sector.
          </span>
        </div>
      </Card>
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
function CashFlow({ reportData, client }) {
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
        <SectionTitle sub="Burn rate, runway and 9-month cash position">Cash Flow</SectionTitle>

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
        <SectionTitle sub="Collections, payments, working capital and cash conversion">Cash Flow</SectionTitle>

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
      <SectionTitle sub="Operating, investing and financing cash flows — board-ready format">Cash Flow</SectionTitle>

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
function ActionItems({ actions: actionsProp }) {
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

  return (
    <div style={{ padding:24 }}>
      <SectionTitle
        sub={`${pending.length} pending · ${done.length} completed`}>
        Action Items from Garima
      </SectionTitle>

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
          {(reportData?.scoreBreakdown?.some(s=>s.score) ? reportData.scoreBreakdown : data.fundraiseBreakdown).map((item, i) => (
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
          {(reportData?.metrics?.some(m=>m.value) ? reportData.metrics : data.investorMetrics).map((m, i) => (
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
          {(reportData?.checklist?.length ? reportData.checklist : data.dueDiligence).map((d, i) => (
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
            { label:"DSCR",              value:"2.1x",    flag:false, note:"Banks prefer >1.5x" },
            { label:"Debt:Equity Ratio", value:"0.8:1",   flag:false, note:"Conservative — good" },
            { label:"Current Ratio",     value:"1.62x",   flag:false, note:"Meets bank norms" },
            { label:"Promoter Equity",   value:"68%",     flag:false, note:"Strong skin in game" },
            { label:"External Ratings",  value:"BBB+",    flag:false, note:"Investment grade" },
            { label:"Overdue to Banks",  value:"None",    flag:false, note:"Clean track record" },
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
          <button style={{ padding:"8px 18px", borderRadius:9, border:`1.5px solid ${C.blue}`,
            background:p.new?C.blue:"transparent", color:p.new?"white":C.blue,
            fontFamily:F, fontWeight:700, fontSize:12, cursor:"pointer", touchAction:"manipulation" }}>
            ↓ Download
          </button>
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

function MSMEPackContent({ reportData, kpis }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly",  icon:"📊", label:"Monthly Report"   },
    { id:"variance", icon:"📉", label:"Variance Analysis"  },
    { id:"cash",     icon:"💰", label:"Cash Health Score" },
    { id:"packs",    icon:"📁", label:"Previous Packs"    },
  ];
  const data = CFO_PACK_DATA["msme"];

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

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Working Capital Analysis</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-g">
          {[
            { label:"Debtors (AR)",   value:"₹38.4L", days:"46 days", color:C.blue   },
            { label:"Creditors (AP)", value:"₹22.1L", days:"31 days", color:C.purple },
            { label:"Inventory",      value:"₹15.8L", days:"22 days", color:C.teal   },
          ].map((w,i) => (
            <div key={i} style={{ padding:"14px 10px", borderRadius:12, background:C.bg, border:`1px solid ${C.border}`, textAlign:"center" }}>
              <div style={{ fontFamily:FM, fontSize:20, fontWeight:700, color:w.color }}>{w.value}</div>
              <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{w.label}</div>
              <div style={{ fontFamily:F, fontSize:11, color:w.color, marginTop:2 }}>{w.days}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
          <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>⚠️ Cash Conversion Cycle: 37 days (AR 46 − AP 31 + Inventory 22). Target: below 30 days.</span>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Ageing Analysis</div>
        <AgeingTable title="Receivables (Debtors)" color={C.blue} rows={[
          ["Client A — Retail",  "₹8.2L","₹4.1L","₹2.0L","—",     "₹14.3L","37.2%"],
          ["Client B — Exports", "₹6.5L","₹3.2L","—",    "₹4.8L", "₹14.5L","37.8%"],
          ["Client C — SME",     "₹4.1L","₹2.2L","₹1.5L","—",     "₹7.8L", "20.3%"],
          ["Others",             "₹1.8L","—",    "—",    "—",     "₹1.8L", "4.7%" ],
          ["Total",              "₹20.6L","₹9.5L","₹3.5L","₹4.8L","₹38.4L","100%" ],
        ]}/>
        <AgeingTable title="Payables (Creditors)" color={C.purple} rows={[
          ["Supplier X — Raw Material","₹9.2L","₹3.4L","—",    "—","₹12.6L","57.0%"],
          ["Supplier Y — Packaging",   "₹4.8L","₹2.1L","₹1.2L","—","₹8.1L", "36.7%"],
          ["Others",                   "₹1.4L","—",    "—",    "—","₹1.4L", "6.3%" ],
          ["Total",                    "₹15.4L","₹5.5L","₹1.2L","—","₹22.1L","100%" ],
        ]}/>
        <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.red}08`, border:`1px solid ${C.red}25` }}>
          <span style={{ fontFamily:F, fontSize:12, color:C.red, fontWeight:600 }}>🔴 ₹4.8L from Client B is 90+ days overdue. Follow-up required immediately — risk of bad debt.</span>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Cash Flow & Runway</div>
        {[
          { label:"Opening Cash Balance",   value:"₹26.4L", sub:"1 Feb 2026" },
          { label:"Cash Inflows (Feb)",      value:"+₹81.8L",sub:"Collections from clients" },
          { label:"Cash Outflows (Feb)",     value:"−₹82.1L",sub:"COGS + opex + taxes" },
          { label:"Closing Cash Balance",    value:"₹26.1L", sub:"28 Feb 2026" },
          { label:"Monthly Burn Rate",       value:"₹48L",   pct:"7.7%", trend:"up",   sub:"Improved from ₹52L" },
          { label:"Cash Runway",             value:"4.4 mo", pct:"12%",  trend:"down", sub:"Based on current burn" },
        ].map((r,i) => <StatRow key={i} {...r}/>)}
        <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
          <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>⚠️ Runway below 6 months. March advance tax (₹32L) will reduce cash further.</span>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>GST & Compliance Status</div>
        {[
          { item:"GSTR-1 (Jan)",                  due:"11 Feb", status:"done"     },
          { item:"GSTR-3B (Jan)",                 due:"20 Feb", status:"done"     },
          { item:"TDS Payment (Jan deductions)",  due:"07 Feb", status:"done"     },
          { item:"PF & ESI (Jan)",                due:"15 Feb", status:"done"     },
          { item:"GSTR-1 (Feb)",                  due:"11 Mar", status:"upcoming" },
          { item:"GSTR-3B (Feb)",                 due:"20 Mar", status:"due-soon" },
          { item:"Advance Tax Q4",                due:"15 Mar", status:"due-soon" },
        ].map((g,i) => {
          const [c,bg,lbl] = g.status==="done"?[C.green,"#ECFDF5","Filed ✓"]:g.status==="due-soon"?[C.red,"#FEF2F2","Due Soon"]:[C.amber,"#FFFBEB","Upcoming"];
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
              <div>
                <span style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:500 }}>{g.item}</span>
                <span style={{ fontFamily:F, fontSize:11, color:C.dim, marginLeft:8 }}>Due: {g.due}</span>
              </div>
              <Badge color={c} bg={bg}>{lbl}</Badge>
            </div>
          );
        })}
      </Card>

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

      <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Action Items from Garima — March 2026</div>
        {[
          { p:"High",   t:"Follow up Client B on ₹4.8L overdue — escalate if no response by 5 Mar" },
          { p:"High",   t:"Arrange ₹32L for advance tax by 15 March — do not miss this" },
          { p:"Medium", t:"Negotiate extended credit with Supplier X (push from 30 to 45 days)" },
          { p:"Medium", t:"Review and cut discretionary opex by 10% — details shared separately" },
          { p:"Low",    t:"Begin FY close reconciliation checklist — target completion by 25 March" },
        ].map((a,i,arr) => (
          <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none", alignItems:"flex-start" }}>
            <PriBadge p={a.p}/>
            <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{a.t}</span>
          </div>
        ))}
      </Card>

      <div>
        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Previous MSME Packs</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="MSME Pack"/>)}
        </div>
      </div>

        <style>{`.wc-g{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-g{grid-template-columns:1fr!important}}`}</style>
      </div>
      )}

      {tab === "variance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Budget vs Actual vs Prior Year — February 2026</div>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>All figures in ₹L</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {["P&L Line","Budget","Actual","Var ₹","Var %","PY Feb","YoY %"].map((h,i) => (
                      <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:12, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { m:"Revenue",       bud:79.4, act:84.2, py:74.1, favBud:true, favPY:true },
                    { m:"COGS",          bud:48.1, act:49.7, py:45.8, favBud:false,favPY:false },
                    { m:"Gross Profit",  bud:31.3, act:34.5, py:28.3, favBud:true, favPY:true },
                    { m:"Operating Exp", bud:20.4, act:19.8, py:18.9, favBud:true, favPY:false },
                    { m:"EBITDA",        bud:12.1, act:14.7, py:11.2, favBud:true, favPY:true },
                    { m:"Net Profit",    bud:8.4,  act:10.2, py:7.6,  favBud:true, favPY:true },
                  ].map((r,i) => {
                    const varBud = (r.act - r.bud).toFixed(1);
                    const varBudPct = ((r.act - r.bud)/r.bud*100).toFixed(1)+"%";
                    const varPY = ((r.act - r.py)/r.py*100).toFixed(1)+"%";
                    return (
                      <tr key={i} style={{ background:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:C.text }}>{r.m}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.bud}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, fontFamily:FM }}>{r.act}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favBud?C.green:C.red }}>{r.favBud?"+":""}{varBud}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favBud?C.green:C.red }}>{r.favBud?"+":""}{varBudPct}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.py}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favPY?C.green:C.red }}>{r.favPY?"+":""}{varPY}</td>
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
              { item:"Revenue ₹4.8L above budget (+6.0%)", note:"Strong secondary sales from existing customers. New distributor onboarded in Pune contributing ₹2.1L.", c:C.green },
              { item:"COGS ₹1.6L over budget", note:"Raw material price increase of ~3.2% not captured in budget. Need to renegotiate with Supplier X or pass through in Q1 pricing.", c:C.red },
              { item:"EBITDA ₹2.6L above budget — margin 17.5% vs 15.2% budgeted", note:"Operating leverage kicking in as revenue scales. Sustaining this requires holding opex flat in March.", c:C.green },
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
        </div>
      )}

      {tab === "packs" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="MSME Pack"/>)}
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

function CorporatePackContent({ reportData, kpis }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly", icon:"📊", label:"Monthly Report"    },
    { id:"variance",icon:"📉", label:"Variance Analysis"  },
    { id:"ipo",     icon:"🏦", label:"IPO Readiness"     },
    { id:"packs",   icon:"📁", label:"Previous Packs"    },
  ];
  const data = CFO_PACK_DATA["corporate"];

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
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          Board-Ready P&L{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : " — Current Month"}
        </div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom: reportData?.pl && Object.values(reportData.pl).some(v=>v?.actual) ? 8 : 16 }}>Actuals vs Budget vs Prior Year</div>
        {reportData?.pl && Object.values(reportData.pl).some(v=>v?.actual) && (
          <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:9, background:`${C.blue}08`, border:`1px solid ${C.blue}20` }}>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Live Data from Admin</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
              {[
                { key:"revenue", label:"Revenue" }, { key:"grossProfit", label:"Gross Profit" },
                { key:"ebitda", label:"EBITDA" }, { key:"pat", label:"PAT" },
              ].filter(r => reportData.pl[r.key]?.actual).map((r,i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:FM, fontSize:14, fontWeight:700, color:C.blue }}>{reportData.pl[r.key].actual}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.muted }}>{r.label}</div>
                  {reportData.pl[r.key].prev && <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>vs {reportData.pl[r.key].prev}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
            <thead>
              <tr style={{ background:C.navy }}>
                {["","Actual Feb","Budget Feb","Variance","% Var","PY Feb","YoY %"].map((h,i) => (
                  <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Revenue",            "₹842L","₹810L","+₹32L","+4.0%","₹720L","+16.9%"],
                ["COGS",               "₹497L","₹490L","−₹7L", "−1.4%","₹446L","+11.4%"],
                ["Gross Profit",       "₹345L","₹320L","+₹25L","+7.8%","₹274L","+25.9%"],
                ["GP Margin",          "41.0%","39.5%","+1.5pp","",    "38.1%","+2.9pp"],
                ["Operating Expenses", "₹198L","₹205L","+₹7L", "+3.4%","₹185L","+7.0%"],
                ["EBITDA",             "₹147L","₹115L","+₹32L","+27.8%","₹89L","+65.2%"],
                ["EBITDA Margin",      "17.5%","14.2%","+3.3pp","",    "12.4%","+5.1pp"],
                ["EBIT",               "₹129L","₹97L", "+₹32L","+33.0%","₹73L","+76.7%"],
                ["Finance Costs",      "₹22L", "₹22L", "—",    "—",   "₹24L", "−8.3%"],
                ["PBT",                "₹107L","₹75L", "+₹32L","+42.7%","₹49L","+118.4%"],
                ["PAT",                "₹81L", "₹56L", "+₹25L","+44.6%","₹37L","+118.9%"],
              ].map((r,i) => {
                const bold = ["Revenue","Gross Profit","EBITDA","PAT"].includes(r[0]);
                return (
                  <tr key={i} style={{ background:i%2===0?C.bg2:C.bg }}>
                    {r.map((cell,j) => (
                      <td key={j} style={{ padding:"9px 12px", textAlign:j===0?"left":"right",
                        fontWeight:bold||j===0?700:400, fontSize:12, color:
                          j===3?(cell.startsWith("+")?C.green:cell==="—"?C.dim:C.red):
                          j===4?(cell.startsWith("+")?C.green:cell===""?C.dim:C.red):
                          j===5?C.muted:C.text,
                        borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap",
                        background:bold?`${C.blue}06`:undefined }}>{cell}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>EBITDA Bridge — Jan to Feb 2026</div>
        {[
          { label:"January EBITDA",  value:"₹115L", delta:"",      color:C.navy,   base:true  },
          { label:"+ Revenue growth",value:"+₹26L", delta:"+22.6%",color:C.green,  base:false },
          { label:"− COGS increase", value:"−₹8L",  delta:"",      color:C.red,    base:false },
          { label:"+ Opex savings",  value:"+₹7L",  delta:"3.4%",  color:C.green,  base:false },
          { label:"− Misc one-offs", value:"−₹1L",  delta:"",      color:C.red,    base:false },
          { label:"February EBITDA", value:"₹139L", delta:"+20.9%",color:C.blue,   base:true  },
        ].map((b,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:10, margin:"2px 0", background:b.base?`${b.color}12`:C.bg, border:b.base?`1px solid ${b.color}30`:`1px solid ${C.border}` }}>
            <span style={{ fontFamily:F, fontSize:13, color:b.base?b.color:C.muted, fontWeight:b.base?700:500 }}>{b.label}</span>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              {b.delta && <span style={{ fontFamily:F, fontSize:11, color:b.color, fontWeight:700 }}>{b.delta}</span>}
              <span style={{ fontFamily:FM, fontSize:14, fontWeight:700, color:b.base?b.color:C.text }}>{b.value}</span>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Cash Flow Forecast — Q1 FY27 (Mar–May 2026)</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg3 }}>
                {["","March","April","May","Q1 Total"].map((h,i) => (
                  <th key={i} style={{ padding:"9px 12px", textAlign:i===0?"left":"right", color:C.muted, fontWeight:700, fontSize:11, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Opening Cash",       "₹261L","₹143L","₹137L","₹261L"],
                ["Operating Inflows",  "₹818L","₹880L","₹920L","₹2,618L"],
                ["Operating Outflows", "−₹821L","−₹790L","−₹810L","−₹2,421L"],
                ["Capex",              "—",   "−₹45L","—",    "−₹45L"],
                ["Debt Repayment",     "−₹83L","−₹83L","−₹83L","−₹249L"],
                ["Tax Payment",        "−₹32L","—",   "—",    "−₹32L"],
                ["Closing Cash",       "₹143L","₹105L","₹164L","₹122L"],
              ].map((r,i) => (
                <tr key={i} style={{ background:i%2===0?C.bg2:C.bg }}>
                  {r.map((cell,j) => (
                    <td key={j} style={{ padding:"9px 12px", textAlign:j===0?"left":"right", fontWeight:["Opening Cash","Closing Cash"].includes(r[0])||j===0?700:400, color:C.text, borderBottom:`1px solid ${C.border}`, background:r[0]==="Closing Cash"?`${C.blue}06`:undefined }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:`${C.red}08`, border:`1px solid ${C.red}25` }}>
          <span style={{ fontFamily:F, fontSize:12, color:C.red, fontWeight:600 }}>⚠️ March closing cash ₹143L — lowest in 12 months. No discretionary capex in March.</span>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Key Risks & Mitigants</div>
        {[
          { risk:"Client B collection (₹4.8L overdue 90+ days)", impact:"High",   mitigant:"Legal notice issued. Board authorised write-off if unpaid by 31 Mar.", c:C.red    },
          { risk:"March cash dip below ₹150L",                   impact:"Medium", mitigant:"CC limit of ₹50L available with HDFC. Not drawn — emergency buffer.",  c:C.amber  },
          { risk:"GST notice on FY24 ITC claims",                 impact:"Medium", mitigant:"CA response submitted. Hearing 12 March. Provision made.",              c:C.amber  },
          { risk:"Revenue concentration — Client A = 37%",        impact:"Low",    mitigant:"3 new accounts in pipeline. Target <25% by Q2.",                        c:C.green  },
        ].map((r,i) => (
          <div key={i} style={{ padding:"12px 14px", borderRadius:10, marginBottom:10, background:`${r.c}06`, border:`1px solid ${r.c}22` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:8 }}>
              <span style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text }}>{r.risk}</span>
              <Badge color={r.impact==="High"?C.red:r.impact==="Medium"?C.amber:C.green} bg={r.impact==="High"?"#FEF2F2":r.impact==="Medium"?"#FFFBEB":"#ECFDF5"}>{r.impact} Impact</Badge>
            </div>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0, lineHeight:1.6 }}><strong style={{ color:C.text }}>Mitigant:</strong> {r.mitigant}</p>
          </div>
        ))}
      </Card>

      <Card style={{ borderLeft:`3px solid ${C.purple}` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Board Decisions Required</div>
        {[
          { p:"High",   t:"Approve write-off of Client B receivable (₹4.8L) if not recovered by 31 March" },
          { p:"High",   t:"Approve Q1 FY27 budget — revised upward given Feb outperformance" },
          { p:"Medium", t:"Authorise April capex of ₹45L for production equipment" },
          { p:"Medium", t:"Review and approve FY24 GST response filed by CA — board sign-off needed" },
        ].map((a,i,arr) => (
          <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none", alignItems:"flex-start" }}>
            <PriBadge p={a.p}/>
            <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{a.t}</span>
          </div>
        ))}
      </Card>


        </div>
      )}

      {tab === "variance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Board-Ready Variance Analysis — February 2026</div>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>Actuals vs Budget vs Prior Year (₹Cr)</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {["","Act Feb","Bud Feb","Var ₹","Var %","PY Feb","YoY %","Status"].map((h,i) => (
                      <th key={i} style={{ padding:"10px 12px", textAlign:i===0?"left":"right", color:"white", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { m:"Revenue",          act:84.2, bud:79.4, py:74.1, favBud:true,  favPY:true  },
                    { m:"Cost of Sales",    act:49.7, bud:48.1, py:45.8, favBud:false, favPY:false },
                    { m:"Gross Profit",     act:34.5, bud:31.3, py:28.3, favBud:true,  favPY:true  },
                    { m:"GP Margin %",      act:"41%",bud:"39%",py:"38%",favBud:true,  favPY:true, noCalc:true },
                    { m:"EBITDA",           act:14.7, bud:12.1, py:11.2, favBud:true,  favPY:true  },
                    { m:"EBITDA Margin %",  act:"17.5%",bud:"15.2%",py:"15.1%",favBud:true,favPY:true,noCalc:true },
                    { m:"Depreciation",     act:3.2,  bud:3.1,  py:2.8,  favBud:false, favPY:false },
                    { m:"EBIT",             act:11.5, bud:9.0,  py:8.4,  favBud:true,  favPY:true  },
                    { m:"Finance Costs",    act:1.8,  bud:2.0,  py:2.1,  favBud:true,  favPY:true  },
                    { m:"PBT",              act:9.7,  bud:7.0,  py:6.3,  favBud:true,  favPY:true  },
                    { m:"Tax",              act:2.4,  bud:1.8,  py:1.6,  favBud:false, favPY:false },
                    { m:"PAT",              act:7.3,  bud:5.2,  py:4.7,  favBud:true,  favPY:true  },
                  ].map((r,i) => {
                    const av = parseFloat(r.act), bv = parseFloat(r.bud), pv = parseFloat(r.py);
                    const varBud = r.noCalc ? "—" : (av-bv).toFixed(1);
                    const varBudPct = r.noCalc ? "—" : ((av-bv)/bv*100).toFixed(1)+"%";
                    const varPY = r.noCalc ? "—" : ((av-pv)/pv*100).toFixed(1)+"%";
                    const isBold = ["Gross Profit","EBITDA","PAT"].includes(r.m);
                    return (
                      <tr key={i} style={{ background:isBold?`${C.blue}06`:i%2===0?C.bg2:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:isBold?700:500, color:C.text }}>{r.m}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:isBold?700:400, fontFamily:FM }}>{r.act}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.bud}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favBud?C.green:C.red }}>{r.noCalc?"—":(r.favBud?"+":"")+varBud}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favBud?C.green:C.red }}>{r.noCalc?"—":(r.favBud?"+":"")+varBudPct}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", color:C.muted, fontFamily:FM }}>{r.py}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontFamily:FM, color:r.favPY?C.green:C.red }}>{r.noCalc?"—":(r.favPY?"+":"")+varPY}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right" }}>
                          <span style={{ padding:"3px 8px", borderRadius:100, fontSize:10, fontWeight:700,
                            background:r.favBud?`${C.green}15`:`${C.red}15`, color:r.favBud?C.green:C.red }}>
                            {r.favBud?"▲ Fav":"▼ Unfav"}
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
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:12 }}>📝 Board Commentary</div>
            {[
              { item:"Revenue ₹4.8Cr above budget (+6.0%); +₹10.1Cr YoY (+13.6%)", note:"Outperformance driven by Q4 order book pull-forward and new institutional account. Sustainable if pipeline converts — 3 proposals worth ₹28Cr outstanding.", c:C.green },
              { item:"PAT ₹2.1Cr above budget — Net margin 8.7% vs 6.5% budgeted", note:"Finance cost savings (lower utilisation of CC facility) + operating leverage. Management to review whether to re-invest or declare interim dividend.", c:C.green },
              { item:"Cost of Sales 1.6% above budget — margin pressure to watch", note:"Input cost inflation (steel, packaging) not fully passed through. Pricing review recommended for Q1 FY27. Finance team modelling break-even scenarios.", c:C.amber },
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

      {tab === "ipo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <CorporateCFOPack data={data} reportData={reportData}/>
          <div style={{ textAlign:"center" }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:12, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              💬 Discuss IPO readiness with Garima
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
            {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="Corporate Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.purple}06`, borderColor:`${C.purple}20` }}>
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

function CFOPackContent({ reportData, client, kpis }) {
  const [tab, setTab] = useState("monthly");
  const tabs = [
    { id:"monthly",    icon:"📊", label:"Monthly Report"      },
    { id:"variance",   icon:"📉", label:"Variance Analysis"   },
    { id:"fundraise",  icon:"🎯", label:"Fundraise Readiness" },
    { id:"boardpacks", icon:"📁", label:"Board Packs"         },
  ];
  const data = CFO_PACK_DATA["startup"];

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
                  <div style={{ fontFamily:F, fontSize:10, color:k.trend==="up"?C.green:C.red, marginTop:2 }}>{k.trend==="up"?"▲":"▼"} vs {k.prev}</div>
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
        </div>
      )}

      {/* Board Packs tab */}
      {tab === "boardpacks" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="CFO Pack"/>)}
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
    <div class="brand-tag">Smart Finance · Trusted Insights</div>
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
    const a = document.createElement("a");
    a.href = doc.file_url;
    a.download = doc.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fileIcon = (name) => {
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
                    {fileIcon(doc.name)}
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
                    ⬇ Download
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
function MyReport({ client, reportData, kpis }) {
  const pack = client?.client_pack || client?.clientPack || "startup";
  if (pack === "msme")      return <MSMEPackContent      reportData={reportData} kpis={kpis}/>;
  if (pack === "corporate") return <CorporatePackContent reportData={reportData} kpis={kpis}/>;
  return <CFOPackContent reportData={reportData} client={client} kpis={kpis}/>;
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
    documents:   "My Documents",
    terms:       "Legal & Compliance",
  };
  return map[page] || "Dashboard";
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
  const resolvedReportData = (!isDemo && liveReportData) ? liveReportData : null;
  const resolvedGarimaNote = (!isDemo && liveKpis?.garima_note) ? liveKpis.garima_note
    : "Revenue is up 6% MoM which is great. However cash balance has dipped — March forecast is tight due to the advance tax payment and the delayed collection from Client B. I'd recommend holding off on the equipment purchase until April. Full analysis in Cash Flow. Action items updated for this month.";

  const pages = {
    overview:   <Overview   client={client} setPage={setPage} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} actions={resolvedActions} engagement={resolvedEngagement} reportData={resolvedReportData}/>,
    dashboard:  <Dashboard  client={client} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} reportData={resolvedReportData}/>,
    cashflow:   <CashFlow   reportData={resolvedReportData} client={client}/>,
    actions:    <ActionItems actions={resolvedActions}/>,
    myreport:   <MyReport   client={client} reportData={resolvedReportData} kpis={resolvedKpis}/>,
    engagement: <Engagement liveData={resolvedEngagement}/>,
    calendar:   <Calendar/>,
    newrequest: <NewRequest client={client} setPage={setPage}/>,
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
          <Logo size={36}/>
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
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);

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
    if (rdData?.data) {
      try {
        const parsed = JSON.parse(rdData.data);
        const defaults = defaultReportData(c.client_pack || "startup");
        setReportData({
          ...defaults,
          ...parsed,
          pl:                 { ...defaults.pl,       ...(parsed.pl                || {}) },
          variance:           parsed.variance           || defaults.variance,
          varianceCommentary: parsed.varianceCommentary || defaults.varianceCommentary,
          prevKpis:           { ...defaults.prevKpis, ...(parsed.prevKpis          || {}) },
        });
      } catch(e) { setReportData(defaultReportData(c.client_pack || "startup")); }
    }
    else setReportData(defaultReportData(c.client_pack || "startup"));
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
  ];

  // Stable component references — prevents remount/focus-loss on every render

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:F }}>
      {/* Admin Sidebar */}
      <aside style={{ width:220, minHeight:"100vh", background:C.navy, flexShrink:0,
        display:"flex", flexDirection:"column", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding:"22px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <Logo size={26}/>
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
                    borderLeft: selected?.id===c.id ? `3px solid ${C.amber}` : `3px solid transparent` }}
                    onClick={() => { selectClient(c); setTab("kpis"); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>{c.name}</div>
                        <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>{c.company}</div>
                        <div style={{ fontFamily:FM, fontSize:11, color:C.dim, marginTop:4 }}>{c.email}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                        <Badge color={C.blue}>{c.client_pack}</Badge>
                        <div style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:C.amber }}>
                          {c.invite_code}
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleClientActive(c); }}
                          style={{ padding:"4px 12px", borderRadius:100, border:"none", cursor:"pointer",
                            fontFamily:F, fontSize:11, fontWeight:700,
                            background: c.active ? `${C.green}15` : `${C.red}15`,
                            color: c.active ? C.green : C.red }}>
                          {c.active ? "● Active" : "● Inactive"} — toggle
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
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text }}>
                      KPI Update — {selected.name}
                    </div>
                    <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>
                      {saved ? "✅ Saved" : "📝 Unsaved changes"}
                    </span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20 }}>
                    These numbers appear on the client's dashboard instantly after saving.
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

                {/* ══ 1: MONTH LABEL ═══════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>📅 Month Label</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    Shown as "KPI Snapshot — <strong>[Month]</strong>" and "Last updated by Garima: <strong>[Month]</strong>" on the portal.
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

                <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData} label="Save All Report Data"/>
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
                        const { data: docRow, error: insertErr } = await supabase.from("documents").insert({
                          client_id: selected.id,
                          name: file.name,
                          file_url: urlData.publicUrl,
                          file_size: (file.size/1024/1024).toFixed(2) + " MB",
                          uploaded_by: "garima",
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
                            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>
                              {d.file_size} · {d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN") : "—"}
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
        <Logo size={36} darkText={!isAdminRoute}/>
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

