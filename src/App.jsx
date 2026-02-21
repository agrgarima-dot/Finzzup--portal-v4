import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#F7F8FC",
  bg2:     "#FFFFFF",
  bg3:     "#EEF1F8",
  border:  "#E2E7F0",
  text:    "#0F1A38",
  muted:   "#6B7DB3",
  dim:     "#A0AECF",
  blue:    "#3B6FF7",
  purple:  "#7C5CF5",
  teal:    "#0CB8A4",
  pink:    "#E8509A",
  amber:   "#F59E0B",
  green:   "#10B981",
  red:     "#EF4444",
  navy:    "#0A1128",
  grad1:   "linear-gradient(135deg,#3B6FF7,#7C5CF5)",
  grad2:   "linear-gradient(135deg,#0CB8A4,#3B6FF7)",
  grad3:   "linear-gradient(135deg,#E8509A,#7C5CF5)",
  grad4:   "linear-gradient(135deg,#F59E0B,#E8509A)",
};
const F  = "'Plus Jakarta Sans', sans-serif";
const FM = "'DM Mono', monospace";

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

const ACTIONS = [
  { id:1, text:"File GST returns for Q3 — deadline 15 March", priority:"High",   done:false },
  { id:2, text:"Send updated projections to Series A lead investor", priority:"High",   done:false },
  { id:3, text:"Review and approve revised marketing budget", priority:"Medium", done:true  },
  { id:4, text:"Delay equipment purchase to April — cash is tight in March", priority:"Medium", done:false },
  { id:5, text:"Share board pack with all directors before 28 Feb", priority:"Low",    done:true  },
];

const BOARD_PACKS = [
  { name:"Board Pack — February 2026", date:"20 Feb 2026", size:"2.4 MB", new:true  },
  { name:"Board Pack — January 2026",  date:"22 Jan 2026", size:"2.1 MB", new:false },
  { name:"Board Pack — December 2025", date:"19 Dec 2025", size:"1.9 MB", new:false },
  { name:"Board Pack — November 2025", date:"21 Nov 2025", size:"2.0 MB", new:false },
];

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
const Logo = ({ size=28 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#3B6FF7"/><stop offset="1" stopColor="#7C5CF5"/>
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#lg)"/>
      <rect x="8"  y="24" width="5" height="10" rx="2" fill="white" opacity="0.5"/>
      <rect x="15" y="18" width="5" height="16" rx="2" fill="white" opacity="0.75"/>
      <rect x="22" y="11" width="5" height="23" rx="2" fill="white"/>
      <polyline points="29,8 35,8 35,14" stroke="white" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="22" y1="17" x2="35" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    <div style={{ lineHeight:1 }}>
      <div style={{ fontFamily:F, fontWeight:800, fontSize:size*0.65, color:C.navy, letterSpacing:"-0.02em" }}>Finzzup</div>
      <div style={{ fontFamily:F, fontSize:8.5, color:C.muted, letterSpacing:"0.07em", marginTop:1 }}>CLIENT PORTAL</div>
    </div>
  </div>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [step, setStep]     = useState("code"); // "code" | "register" | "signin"
  const [code, setCode]     = useState("");
  const [client, setClient] = useState(null);
  const [form, setForm]     = useState({ email:"", password:"", confirm:"" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Check invite code against Supabase
  const checkCode = async () => {
    if (!code.trim()) { setError("Please enter an invite code."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase
      .from("clients")
      .select("*")
      .eq("invite_code", code.trim().toUpperCase())
      .eq("active", true)
      .single();
    setLoading(false);
    if (err || !data) { setError("Invalid invite code. Please contact garima@finzzup.com"); return; }
    setClient(data);
    setForm(f => ({ ...f, email: data.email }));
    setStep("register");
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
    // Account created — log them straight in
    onLogin(client);
  };

  // Sign in existing account
  const signIn = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    });
    if (authErr) { setLoading(false); setError("Incorrect email or password."); return; }
    // Fetch client record by email
    const { data, error: dbErr } = await supabase
      .from("clients").select("*").eq("email", form.email).single();
    setLoading(false);
    if (dbErr || !data) { setError("Account not found. Please register first."); return; }
    onLogin(data);
  };

  const InputField = ({ label, fkey, type="text", placeholder="" }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:"0.08em", display:"block", marginBottom:7, fontFamily:F }}>{label}</label>
      <input value={form[fkey]}
        onChange={e => { setForm(f=>({...f,[fkey]:e.target.value})); setError(""); }}
        type={type} placeholder={placeholder}
        style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:16,
          border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
          background:C.bg, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e  => e.target.style.borderColor = C.border}
      />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:F }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none",
        background:`radial-gradient(ellipse 60% 50% at 20% 30%, rgba(59,111,247,0.07) 0%, transparent 60%),
                   radial-gradient(ellipse 40% 40% at 80% 70%, rgba(124,92,245,0.06) 0%, transparent 60%)` }}/>

      <div style={{ width:"100%", maxWidth:420, position:"relative" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Logo size={36}/>
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
            <InputField label="Email"            fkey="email"    type="email"    placeholder="your@email.com" />
            <InputField label="Password"         fkey="password" type="password" placeholder="Min 6 characters" />
            <InputField label="Confirm Password" fkey="confirm"  type="password" placeholder="Repeat password" />
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
            <InputField label="Email"    fkey="email"    type="email"    placeholder="your@email.com" />
            <InputField label="Password" fkey="password" type="password" placeholder="Your password" />
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
          Powered by Finzzup · garima@finzzup.com
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
// Dynamic nav based on client pack type
function getNav(client) {
  const pack = client?.client_pack || "startup";
  const type = client?.type || "both";

  const base = [
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

  base.push({ id:"calendar", icon:"📅", label:"Book a Call" });
  return base;
}

function Sidebar({ page, setPage, client, onLogout, collapsed, setCollapsed }) {
  return (
    <aside style={{ width:collapsed?64:220, minHeight:"100vh", background:C.navy, flexShrink:0,
      display:"flex", flexDirection:"column", transition:"width 0.25s", overflow:"hidden",
      borderRight:`1px solid rgba(255,255,255,0.06)` }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? "20px 0" : "22px 20px", display:"flex",
        alignItems:"center", justifyContent:collapsed?"center":"space-between",
        borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        {!collapsed && <Logo size={26}/>}
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
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            display:"flex", alignItems:"center", gap:10,
            width:"100%", padding: collapsed ? "12px 0" : "11px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: page===n.id ? "rgba(59,111,247,0.18)" : "transparent",
            border:"none", cursor:"pointer", borderLeft: page===n.id ? `3px solid ${C.blue}` : "3px solid transparent",
            transition:"all 0.15s", fontFamily:F,
          }}>
            <span style={{ fontSize:17 }}>{n.icon}</span>
            {!collapsed && <span style={{ fontSize:13, fontWeight:600,
              color: page===n.id ? "white" : "rgba(255,255,255,0.5)" }}>
              {n.label}
            </span>}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: collapsed?"10px 0":"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
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
function Topbar({ title, client }) {
  const now = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  return (
    <header style={{ height:58, background:C.bg2, borderBottom:`1px solid ${C.border}`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 24px", flexShrink:0 }}>
      <h1 style={{ fontFamily:F, fontWeight:700, fontSize:17, color:C.text, margin:0 }}>{title}</h1>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:12, color:C.dim, fontFamily:F }}>{now}</span>
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
function Dashboard({ client }) {
  return (
    <div style={{ padding:24 }}>
      {/* Welcome */}
      <div style={{ marginBottom:24, padding:"20px 24px", borderRadius:16,
        background:C.grad1, color:"white", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:140, height:140,
          borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontFamily:F, fontSize:11, fontWeight:700, opacity:0.75, letterSpacing:"0.08em", marginBottom:4 }}>
            WELCOME BACK
          </div>
          <div style={{ fontFamily:F, fontWeight:800, fontSize:22, marginBottom:4 }}>{client.name}</div>
          <div style={{ fontFamily:F, fontSize:13, opacity:0.75 }}>
            {client.company} · Last updated by Garima: 20 Feb 2026
          </div>
        </div>
      </div>

      {/* Garima's note */}
      <Card style={{ marginBottom:24, borderLeft:`3px solid ${C.blue}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
          📝 Note from Garima — Feb 2026
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.75, fontFamily:F, margin:0 }}>
          Revenue is up 6% MoM which is great. However cash balance has dipped — March forecast is tight due to the advance tax payment and the delayed collection from Client B. I'd recommend holding off on the equipment purchase until April. Full analysis in Cash Flow. Action items updated for this month.
        </p>
      </Card>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }} className="kpi-grid">
        {KPIs.map((k,i) => (
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

      {/* Quick links row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }} className="quick-grid">
        {[
          { icon:"📁", label:"Latest Report",      sub:"February 2026", color:C.purple, action:"myreport"  },
          { icon:"✅", label:"Action Items",       sub:"2 pending (High priority)", color:C.red,    action:"actions"    },
          { icon:"📋", label:"Valuation Status",   sub:"Analysis in progress", color:C.teal,   action:"engagement" },
        ].map((q,i) => (
          <Card key={i} style={{ padding:16, cursor:"pointer", transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(15,26,56,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ fontSize:22, marginBottom:8 }}>{q.icon}</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{q.label}</div>
            <div style={{ fontFamily:F, fontSize:11, color:q.color, fontWeight:600 }}>{q.sub}</div>
          </Card>
        ))}
      </div>

      <style>{`
        @media(max-width:640px){
          .kpi-grid{grid-template-columns:1fr 1fr!important}
          .quick-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:400px){.kpi-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}

// ─── CASH FLOW ────────────────────────────────────────────────────────────────
function CashFlow() {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10,
        padding:"10px 14px", fontFamily:F, boxShadow:"0 4px 16px rgba(15,26,56,0.1)" }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:700, color:d.name==="forecast"?C.purple:C.blue }}>
          ₹{d.value}L
        </div>
        <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>
          {d.name==="forecast" ? "Forecast" : "Actual"}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding:24 }}>
      <SectionTitle>Cash Flow — 9 Month View</SectionTitle>

      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", gap:16, marginBottom:20, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:C.blue }}/>
            <span style={{ fontSize:12, color:C.muted, fontFamily:F }}>Actual</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:C.purple, opacity:0.6 }}/>
            <span style={{ fontSize:12, color:C.muted, fontFamily:F }}>Forecast</span>
          </div>
        </div>

        <div style={{ height:260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CASHFLOW} margin={{ top:5, right:10, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue}   stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={C.blue}   stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.purple} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontFamily:F, fontSize:11, fill:C.dim }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontFamily:FM, fontSize:10, fill:C.dim }} axisLine={false} tickLine={false}
                tickFormatter={v=>`₹${v}L`} width={48}/>
              <Tooltip content={<CustomTooltip/>}/>
              <ReferenceLine x="Feb" stroke={C.border} strokeDasharray="4 4" label={{ value:"Today", position:"top", fontSize:10, fill:C.dim, fontFamily:F }}/>
              <Area type="monotone" dataKey="value"    name="actual"   stroke={C.blue}   strokeWidth={2} fill="url(#ga)" connectNulls={false} dot={{ fill:C.blue, r:3 }}/>
              <Area type="monotone" dataKey="forecast" name="forecast" stroke={C.purple} strokeWidth={2} fill="url(#gf)" strokeDasharray="5 5" connectNulls={false} dot={{ fill:C.purple, r:3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Garima's commentary */}
      <Card style={{ borderLeft:`3px solid ${C.amber}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
          ⚠️ Garima's Analysis — March Watch
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:"0 0 12px" }}>
          March forecast shows a dip to ₹175L — lowest in 6 months. This is driven by:
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            ["Advance tax payment due 15 March", "~₹32L outflow"],
            ["Delayed collection from Client B (payment expected April)", "₹45L pushed out"],
            ["Quarterly vendor payments coinciding", "₹18L"],
          ].map(([reason, impact], i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"9px 12px", borderRadius:8, background:C.bg }}>
              <span style={{ fontSize:13, color:C.muted, fontFamily:F }}>{reason}</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.red, fontFamily:FM, whiteSpace:"nowrap", marginLeft:10 }}>{impact}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10,
          background:`${C.green}0A`, border:`1px solid ${C.green}20` }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.green, fontFamily:F }}>
            ✅ April–May outlook is positive. Hold off on discretionary capex until April.
          </span>
        </div>
      </Card>
    </div>
  );
}

// ─── ACTION ITEMS ─────────────────────────────────────────────────────────────
function ActionItems() {
  const [items, setItems] = useState(ACTIONS);
  const toggle = id => setItems(prev => prev.map(a => a.id===id ? {...a, done:!a.done} : a));
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

function StartupCFOPack({ data, client }) {
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
              Overall: {data.fundraiseScore}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {data.fundraiseScore >= 75 ? "✅ Series A ready" : data.fundraiseScore >= 55 ? "⚠️ Almost there — a few gaps to close" : "🔴 Significant prep needed"}
            </p>
          </div>
          <ScoreGauge score={data.fundraiseScore} color={C.blue} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.fundraiseBreakdown.map((item, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"140px 1fr auto", gap:12, alignItems:"center" }}>
              <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
              <div style={{ height:6, borderRadius:3, background:C.bg3, flex:1 }}>
                <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                  background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                  transition:"width 0.8s ease" }}/>
              </div>
              <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Investor Metrics */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Key metrics investors will ask about in your data room">Investor Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="inv-grid">
          {data.investorMetrics.map((m, i) => (
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
          {data.dueDiligence.map((d, i) => (
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

function MSMECFOPack({ data }) {
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
              Overall: {data.cashHealth}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {data.cashHealth >= 75 ? "✅ Strong working capital position" : "⚠️ A few areas to tighten up"}
            </p>
          </div>
          <ScoreGauge score={data.cashHealth} color={C.teal} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.cashBreakdown.map((item, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"160px 1fr auto", gap:12, alignItems:"center" }}>
              <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
              <div style={{ height:6, borderRadius:3, background:C.bg3 }}>
                <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                  background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                  transition:"width 0.8s ease" }}/>
              </div>
              <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Working Capital */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Working capital ratios vs benchmarks">Working Capital Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="inv-grid">
          {data.workingCapital.map((m, i) => (
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
    </>
  );
}

function CorporateCFOPack({ data }) {
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
          <ScoreGauge score={data.ipoScore} color={C.purple} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.ipoBreakdown.map((item, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"180px 1fr auto", gap:12, alignItems:"center" }}>
              <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
              <div style={{ height:6, borderRadius:3, background:C.bg3 }}>
                <div style={{ height:"100%", borderRadius:3, width:`${item.score}%`,
                  background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                  transition:"width 0.8s ease" }}/>
              </div>
              <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
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

const ARCHIVE = [
  { name:"February 2026", date:"20 Feb 2026", size:"2.4 MB", new:true  },
  { name:"January 2026",  date:"22 Jan 2026", size:"2.1 MB", new:false },
  { name:"December 2025", date:"19 Dec 2025", size:"1.9 MB", new:false },
];

function ArchiveRow({ p, label }) {
  return (
    <Card style={{ padding:"14px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:p.new?`${C.blue}12`:`${C.muted}0A`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📄</div>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, display:"flex", alignItems:"center", gap:7 }}>
              {label} — {p.name} {p.new && <Badge color={C.blue}>New</Badge>}
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>{p.date} · {p.size}</div>
          </div>
        </div>
        <button style={{ padding:"8px 18px", borderRadius:9, border:`1.5px solid ${C.blue}`, background:p.new?C.blue:"transparent", color:p.new?"white":C.blue, fontFamily:F, fontWeight:700, fontSize:12, cursor:"pointer", touchAction:"manipulation" }}>↓ Download</button>
      </div>
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

function MSMEPackContent() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>P&L Summary — February 2026</div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>vs January 2026 and Feb 2025</div>
        {[
          { label:"Revenue",            value:"₹84.2L", pct:"6.1%",  trend:"up",   sub:"vs ₹79.4L last month" },
          { label:"Cost of Goods Sold", value:"₹49.7L", pct:"4.2%",  trend:"down", sub:"58.9% of revenue (was 60.4%)" },
          { label:"Gross Profit",       value:"₹34.5L", pct:"41.0%", trend:"up",   sub:"GP margin improved +1.4pp" },
          { label:"Operating Expenses", value:"₹19.8L", pct:"3.1%",  trend:"down", sub:"23.5% of revenue" },
          { label:"EBITDA",             value:"₹14.7L", pct:"17.5%", trend:"up",   sub:"EBITDA margin 17.5% (was 15.2%)" },
          { label:"Net Profit",         value:"₹10.2L", pct:"12.1%", trend:"up",   sub:"Net margin 12.1% (was 10.3%)" },
        ].map((r,i) => <StatRow key={i} {...r}/>)}
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
  );
}

function CorporatePackContent() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Board-Ready P&L — February 2026</div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:16 }}>Actuals vs Budget vs Prior Year</div>
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

      <div>
        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Previous Corporate Packs</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="Corporate Pack"/>)}
        </div>
      </div>
    </div>
  );
}

function CFOPackContent() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card style={{ borderLeft:`3px solid ${C.blue}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>📝 Note from Garima — Feb 2026</div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
          Strong month — revenue up 6.1%, EBITDA margin at 17.5% (best in 12 months). The concern is March cash: advance tax + debt repayment + delayed Client B collection creates a tight window. Mitigation plan is in place. Two decisions need board attention before 10 March.
        </p>
      </Card>
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>KPI Snapshot — February 2026</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }} className="cfok-g">
          {KPIs.map((k,i) => (
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
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>P&L at a Glance</div>
        {[
          { label:"Revenue",      value:"₹842L", pct:"6.1%",  trend:"up", sub:"MoM growth" },
          { label:"Gross Profit", value:"₹345L", pct:"41.0%", trend:"up", sub:"GP margin" },
          { label:"EBITDA",       value:"₹147L", pct:"17.5%", trend:"up", sub:"Best in 12 months" },
          { label:"Net Profit",   value:"₹102L", pct:"12.1%", trend:"up", sub:"Net margin" },
        ].map((r,i) => <StatRow key={i} {...r}/>)}
      </Card>
      <Card style={{ borderLeft:`3px solid ${C.green}` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Action Items — March 2026</div>
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
      <div>
        <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Previous CFO Packs</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ARCHIVE.map((p,i) => <ArchiveRow key={i} p={p} label="CFO Pack"/>)}
        </div>
      </div>
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
          <a href="https://wa.me/919833585820" target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>💬 WhatsApp Garima</a>
        </div>
      </Card>
    </div>
  );
}

// ─── CFO PACKS (existing component) ──────────────────────────────────────────
function CFOPacks({ client }) {
  const packType  = client.clientPack || "startup";
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
            <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
              {data.garimaNote}
            </p>
          </Card>

          {packType === "startup"   && <StartupCFOPack   data={data} client={client}/>}
          {packType === "msme"      && <MSMECFOPack      data={data}/>}
          {packType === "corporate" && <CorporateCFOPack data={data}/>}

          <div style={{ textAlign:"center", marginTop:8 }}>
            <a href="https://wa.me/919833585820" target="_blank" rel="noopener"
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
function Engagement() {
  const pct = (ENGAGEMENT.status / (ENGAGEMENT.stages.length - 1)) * 100;

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
            <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text }}>{ENGAGEMENT.type}</div>
            <div style={{ fontFamily:FM, fontSize:12, color:C.muted, marginTop:3 }}>Ref: {ENGAGEMENT.ref}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Expected</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.blue }}>{ENGAGEMENT.expectedDate}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position:"relative", marginBottom:24 }}>
          <div style={{ height:6, borderRadius:3, background:C.bg3, marginBottom:24 }}>
            <div style={{ height:"100%", borderRadius:3, background:C.grad1,
              width:`${pct}%`, transition:"width 0.6s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            {ENGAGEMENT.stages.map((s,i) => (
              <div key={i} style={{ textAlign:"center", flex:1 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", margin:"0 auto 6px",
                  background: i <= ENGAGEMENT.status ? C.blue : C.bg3,
                  border: i === ENGAGEMENT.status ? `3px solid ${C.blue}` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: i === ENGAGEMENT.status ? `0 0 0 4px ${C.blue}25` : "none",
                  transition:"all 0.3s" }}>
                  {i < ENGAGEMENT.status && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
                  {i === ENGAGEMENT.status && <span style={{ width:8, height:8, borderRadius:"50%", background:"white", display:"block" }}/>}
                </div>
                <div style={{ fontFamily:F, fontSize:10, color: i <= ENGAGEMENT.status ? C.blue : C.dim,
                  fontWeight: i === ENGAGEMENT.status ? 700 : 500, lineHeight:1.3 }}>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.blue}08`,
          border:`1px solid ${C.blue}20` }}>
          <span style={{ fontFamily:F, fontSize:13, color:C.blue, fontWeight:600 }}>
            📌 Currently: <strong>{ENGAGEMENT.stages[ENGAGEMENT.status]}</strong> — Garima is building the DCF model. On track for {ENGAGEMENT.expectedDate}.
          </span>
        </div>
      </Card>

      {/* Document checklist */}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
          Document Checklist
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ENGAGEMENT.docs.map((d,i) => (
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
        {ENGAGEMENT.docs.some(d => !d.done) && (
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
      <SectionTitle sub="Book a 30-min or 60-min call with Garima directly.">
        Book a Call
      </SectionTitle>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }} className="cal-grid">
        {[
          { icon:"⚡", title:"30-min Valuation Query", desc:"Questions about your report, methodology, or UDIN.", color:C.blue,   bg:`${C.blue}0A` },
          { icon:"🧠", title:"60-min CFO Strategy Call",  desc:"Monthly review, cash flow planning, board prep.", color:C.purple, bg:`${C.purple}0A` },
        ].map((t,i) => (
          <Card key={i} style={{ padding:20, borderTop:`3px solid ${t.color}` }}>
            <div style={{ fontSize:28, marginBottom:12 }}>{t.icon}</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>{t.title}</div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:16 }}>{t.desc}</p>
            <button style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none",
              background:t.color, color:"white", fontFamily:F, fontWeight:700, fontSize:13,
              cursor:"pointer", touchAction:"manipulation" }}>
              Book this →
            </button>
          </Card>
        ))}
      </div>

      {/* Calendly placeholder */}
      <Card style={{ textAlign:"center", padding:40 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:8 }}>
          Calendly Booking
        </div>
        <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20, maxWidth:380, margin:"0 auto 20px" }}>
          To enable live calendar booking, add your Calendly embed URL. Takes 5 minutes.
        </p>
        <div style={{ padding:"12px 16px", borderRadius:10, background:C.bg,
          border:`1px solid ${C.border}`, fontFamily:FM, fontSize:12, color:C.muted,
          textAlign:"left", marginBottom:20 }}>
          {`// In your Calendly account, get your embed URL and replace below:`}<br/>
          {`// <iframe src="https://calendly.com/YOUR_LINK" .../>`}
        </div>
        <a href="https://wa.me/919833585820" target="_blank" rel="noopener" style={{ display:"inline-flex",
          alignItems:"center", gap:8, padding:"11px 20px", borderRadius:10,
          background:`${C.green}12`, border:`1.5px solid ${C.green}30`,
          color:C.green, fontFamily:F, fontWeight:700, fontSize:13 }}>
          💬 WhatsApp Garima to schedule
        </a>
      </Card>
      <style>{`@media(max-width:500px){.cal-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

// ─── PORTAL SHELL ─────────────────────────────────────────────────────────────

// My Report component — shows correct pack based on client type
function MyReport({ client }) {
  const pack = client?.client_pack || "startup";
  if (pack === "msme")      return <MSMEPackContent/>;
  if (pack === "corporate") return <CorporatePackContent/>;
  return <CFOPackContent/>;  // startup / default
}

function getPageTitle(page, client) {
  const pack = client?.client_pack || "startup";
  const reportLabel = pack === "msme" ? "MSME Report"
    : pack === "corporate" ? "Board Report"
    : "CFO Report";
  const map = {
    dashboard:  "Dashboard",
    cashflow:   "Cash Flow",
    actions:    "Action Items",
    myreport:   reportLabel,
    engagement: "Valuation Status",
    calendar:   "Book a Call",
  };
  return map[page] || "Dashboard";
}

function Portal({ client, onLogout }) {
  const [page,      setPage]      = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const pages = {
    dashboard:  <Dashboard  client={client}/>,
    cashflow:   <CashFlow/>,
    actions:    <ActionItems/>,
    myreport:   <MyReport client={client}/>,
    engagement: <Engagement/>,
    calendar:   <Calendar/>,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:F }}>
      <Sidebar page={page} setPage={setPage} client={client}
        onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <Topbar title={getPageTitle(page, client)} client={client}/>
        <main style={{ flex:1, overflowY:"auto" }}>
          {pages[page]}
        </main>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

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

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending:false });
    setClients(data || []);
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
    await supabase.from("action_items").update({ done: !a.done }).eq("id", a.id);
    setActions(prev => prev.map(x => x.id===a.id ? {...x, done:!x.done} : x));
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
  ];

  const Input = ({ label, val, onChange, type="text", placeholder="", mono=false }) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>{label}</label>
      <input value={val} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
          border:`1.5px solid ${C.border}`, fontFamily:mono?FM:F, color:C.text,
          background:C.bg, outline:"none", boxSizing:"border-box" }}
        onFocus={e => e.target.style.borderColor = C.amber}
        onBlur={e  => e.target.style.borderColor = C.border}
      />
    </div>
  );

  const Select = ({ label, val, onChange, options }) => (
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

  const SaveBtn = ({ onClick, label="Save Changes" }) => (
    <button onClick={onClick} disabled={loading} style={{ padding:"11px 24px", borderRadius:10,
      border:"none", background:"linear-gradient(135deg,#F59E0B,#EF4444)", color:"white",
      fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer", opacity:loading?0.75:1,
      touchAction:"manipulation" }}>
      {loading ? "Saving…" : saved ? "✅ Saved!" : label}
    </button>
  );

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
              background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
              color:"white", fontFamily:F, outline:"none" }}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client_pack})</option>)}
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
                        <div style={{ fontSize:11, color:c.active?C.green:C.red, fontWeight:700, fontFamily:F }}>
                          {c.active ? "● Active" : "● Inactive"}
                        </div>
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
              <Input label="Client Name"    val={newClient.name}    onChange={v=>setNewClient(c=>({...c,name:v}))}    placeholder="e.g. Ravi Sharma" />
              <Input label="Company"        val={newClient.company} onChange={v=>setNewClient(c=>({...c,company:v}))} placeholder="e.g. Sharma Textiles Pvt Ltd" />
              <Input label="Email"          val={newClient.email}   onChange={v=>setNewClient(c=>({...c,email:v}))}   type="email" placeholder="client@company.com" />
              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                <div style={{ flex:1 }}>
                  <Input label="Invite Code" val={newClient.invite_code}
                    onChange={v=>setNewClient(c=>({...c,invite_code:v.toUpperCase()}))}
                    placeholder="e.g. SHAR2026" mono={true} />
                </div>
                <button onClick={genCode} style={{ padding:"10px 14px", borderRadius:9, marginBottom:12,
                  border:`1px solid ${C.border}`, background:C.bg3, fontFamily:F, fontSize:12,
                  color:C.muted, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Auto-generate
                </button>
              </div>
              <Select label="Pack Type" val={newClient.client_pack}
                onChange={v=>setNewClient(c=>({...c,client_pack:v}))}
                options={[
                  {value:"startup",   label:"Startup / CFO Pack"},
                  {value:"msme",      label:"MSME Pack"},
                  {value:"corporate", label:"Corporate Pack"},
                ]}/>
              <Select label="Service Type" val={newClient.type}
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:16, color:C.text, marginBottom:4 }}>
                    KPI Update — {selected.name}
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20 }}>
                    These numbers appear on the client's dashboard instantly after saving.
                  </p>
                  <Input label="Month" val={kpis.month} onChange={v=>setKpis(k=>({...k,month:v}))} placeholder="e.g. February 2026" />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }} className="kpi-edit-grid">
                    {[
                      { label:"Revenue",      key:"revenue",      placeholder:"e.g. ₹8.4 Cr"  },
                      { label:"Gross Margin", key:"gross_margin", placeholder:"e.g. 41%"       },
                      { label:"Cash Balance", key:"cash_balance", placeholder:"e.g. ₹2.1 Cr"  },
                      { label:"Burn Rate",    key:"burn_rate",    placeholder:"e.g. ₹48L/mo"  },
                      { label:"Runway",       key:"runway",       placeholder:"e.g. 4.4 months"},
                      { label:"ARR",          key:"arr",          placeholder:"e.g. ₹6.2 Cr"  },
                    ].map(f => (
                      <Input key={f.key} label={f.label} val={kpis[f.key]||""}
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
                  <SaveBtn onClick={saveKPIs}/>
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
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>Action</label>
                    <input value={newAction.text} onChange={e=>setNewAction(a=>({...a,text:e.target.value}))}
                      placeholder="e.g. File GST returns for Q3 by 15 March"
                      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:14,
                        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                        background:C.bg, outline:"none", boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Select label="Priority" val={newAction.priority} onChange={v=>setNewAction(a=>({...a,priority:v}))}
                      options={[{value:"High",label:"High"},{value:"Medium",label:"Medium"},{value:"Low",label:"Low"}]}/>
                    <Input label="Month" val={newAction.month} onChange={v=>setNewAction(a=>({...a,month:v}))} placeholder="e.g. March 2026"/>
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
                  <Input label="Engagement Type" val={engagement.type||""}
                    onChange={v=>setEngagement(e=>({...e,type:v}))}
                    placeholder="e.g. DCF Valuation — Section 56(2)(viib)"/>
                  <Input label="Reference Number" val={engagement.ref_number||""}
                    onChange={v=>setEngagement(e=>({...e,ref_number:v}))}
                    placeholder="e.g. VAL-240216" mono/>
                  <Input label="Expected Date" val={engagement.expected_date||""}
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
                  <SaveBtn onClick={saveEngagement}/>
                </Card>
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
          // Check admin table
          const { data: adminData } = await supabase
            .from("admins").select("*").eq("email", session.user.email).single();
          if (adminData) setAdmin(adminData);
        } else {
          // Check clients table
          const { data: clientData } = await supabase
            .from("clients").select("*").eq("email", session.user.email).single();
          if (clientData) setClient(clientData);
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
        <Logo size={36}/>
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
