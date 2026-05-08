// ─── TOKENS ──────────────────────────────────────────────────────────────────
export const C = {
  canvas:  "#F8F9FA",   // DESIGN: Brex-style light grey canvas
  bg:      "#FFFFFF",
  bg2:     "#F8F9FA",   // DESIGN: unified light grey
  bg3:     "#F1F5F9",
  card:    "#FFFFFF",
  border:  "#E5E7EB",   // DESIGN: slightly softer border like Brex
  borderStrong: "#D1D5DB",
  text:    "#0F172A",
  muted:   "#475569",
  dim:     "#94A3B8",
  accent:  "#2563EB",
  accentHover: "#1D4ED8",
  accentLight: "#EFF6FF",
  grad:    "linear-gradient(90deg,#2563EB,#7C3AED)",
  gradDiag:"linear-gradient(135deg,#2563EB,#7C3AED)",
  blue:    "#2563EB",
  teal:    "#2563EB",
  green:   "#059669",
  amber:   "#D97706",
  red:     "#EF4444",
  purple:  "#7C3AED",
  pink:    "#7C3AED",
  yellow:  "#D97706",
  lime:    "#2563EB",
  orange:  "#D97706",
  grad1:   "linear-gradient(90deg,#2563EB,#7C3AED)",
  grad2:   "linear-gradient(90deg,#2563EB,#7C3AED)",
  grad3:   "linear-gradient(90deg,#7C3AED,#2563EB)",
  grad4:   "linear-gradient(90deg,#2563EB,#7C3AED)",
  navy:    "#0F172A",
  navyBorder: "#1E293B",
  warning:   "#92400E",
  warningBg: "#FFF7ED",
  warningBorder: "#FED7AA",
};
export const F  = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
export const FM = "'JetBrains Mono', 'SF Mono', monospace";

// ── Smart Number Formatters ────────────────────────────────────────────────
export const fmtINR = (n) => {
  const num = Number(String(n).replace(/[^0-9.-]/g,""));
  if (isNaN(num)||n===""||n==="—") return n||"—";
  const abs=Math.abs(num),sign=num<0?"-":"";
  if(abs>=10000000) return `${sign}₹ ${(abs/10000000).toFixed(2)} Cr`;
  if(abs>=100000)   return `${sign}₹ ${(abs/100000).toFixed(1)} L`;
  if(abs>=1000)     return `${sign}₹ ${(abs/1000).toFixed(0)}K`;
  return `${sign}₹ ${abs.toLocaleString("en-IN")}`;
};
export const fmtAED2 = (n) => {
  const num = Number(String(n).replace(/[^0-9.-]/g,""));
  if (isNaN(num)||n===""||n==="—") return n||"—";
  const abs=Math.abs(num),sign=num<0?"-":"";
  if(abs>=1000000) return `${sign}AED ${(abs/1000000).toFixed(2)}M`;
  if(abs>=1000)    return `${sign}AED ${(abs/1000).toFixed(0)}K`;
  return `${sign}AED ${abs.toLocaleString("en-AE")}`;
};


// ─── JURISDICTION HELPERS ─────────────────────────────────────────────────────
export const isUAE         = c => c?.jurisdiction === "UAE" || c?.jurisdiction === "Cross-Border";
export const sym           = c => isUAE(c) ? "AED" : "₹";
export const fmtAED        = (v, showSym=true) => {
  if (!v && v !== 0) return "—";
  const n = Number(v);
  const s = showSym ? "AED " : "";
  if (Math.abs(n) >= 1000000) return `${s}${(n/1000000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000)    return `${s}${(n/1000).toFixed(0)}K`;
  return `${s}${n.toLocaleString()}`;
};
export const AED_TO_INR  = 22.8;
export const fmtDual     = (aed) => `AED ${Number(aed).toLocaleString()} (≈ ₹${(Number(aed)*AED_TO_INR).toLocaleString()})`;
