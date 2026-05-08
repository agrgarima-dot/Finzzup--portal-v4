import React from 'react';
import { C, F, FM } from './tokens';

// ─── SHARED UI ────────────────────────────────────────────────────────────────
export const Card = ({ children, style={}, accent, hover=true }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={hover ? ()=>setHov(true) : undefined}
      onMouseLeave={hover ? ()=>setHov(false) : undefined}
      style={{
        background:"#FFFFFF",
        border:`1px solid ${C.border}`,
        borderRadius:12,   // DESIGN: Brex uses 12px
        padding:24,
        boxShadow: hov ? "0 4px 12px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition:"box-shadow 0.2s ease, transform 0.2s ease",
        ...style }}>
      {children}
    </div>
  );
};

export const Skeleton = ({ width="100%", height=16, radius=4, style={} }) => (
  <div style={{
    width, height, borderRadius:radius,
    background:"linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",
    backgroundSize:"200% 100%",
    animation:"skeleton-shimmer 1.5s infinite",
    ...style
  }}/>
);

export const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign:"center", padding:"40px 24px", color:C.muted }}>
    {icon && <i className={"ti " + icon} style={{ fontSize:32, marginBottom:12, display:"block", color:C.dim }}/>}
    <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>{title}</div>
    {sub && <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{sub}</div>}
  </div>
);

export const Badge = ({ children, color=C.blue, bg }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:60,
    background:bg||`${color}18`, fontSize:11, fontWeight:700, color,
    fontFamily:F, letterSpacing:"0.05em" }}>
    {children}
  </span>
);

export const PriBadge = ({ p }) => {
  const map = { High:[C.red,"#FEF2F2"], Medium:[C.amber,"#FFFBEB"], Low:[C.green,"#ECFDF5"] };
  const [c,bg] = map[p]||map.Low;
  return <Badge color={c} bg={bg}>{p}</Badge>;
};

// ─── SVG LOGO COMPONENT ───────────────────────────────────────────────────────
const FinzzupIcon = ({ size=44, collapsed=false }) => (
  <svg width={collapsed ? size*0.8 : size} height={collapsed ? size*0.8 : size}
    viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icon-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2563EB"/>
        <stop offset="100%" stopColor="#7C3AED"/>
      </linearGradient>
    </defs>
    <rect width="44" height="44" rx="11" fill="url(#icon-grad)"/>
    <path d="M11 9h22v5.5H17.5v6.5H26v5.5h-8.5V35H11V9Z" fill="white"/>
  </svg>
);

export const Logo = ({ size=32, darkText=false, showTagline=false, dark=false, collapsed=false }) => {
  const iconSize = size * 1.35;
  if (collapsed) {
    return <FinzzupIcon size={iconSize} collapsed/>;
  }
  return (
    <div style={{ display:"flex", alignItems:"center", gap: size * 0.35 }}>
      <FinzzupIcon size={iconSize}/>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <div style={{
          fontFamily:"'Inter', -apple-system, sans-serif",
          fontWeight:900,
          fontSize: size * 0.72,
          lineHeight:1,
          letterSpacing:"-0.03em",
          display:"flex",
          alignItems:"baseline",
        }}>
          <span style={{ color: dark ? "white" : "#111827" }}>Finz</span>
          <span style={{ background:"linear-gradient(90deg,#2563EB,#7C3AED)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundClip:"text" }}>zup</span>
          <span style={{ fontSize: size * 0.35, color: dark ? "rgba(255,255,255,0.5)" : "#9CA3AF",
            WebkitTextFillColor: dark ? "rgba(255,255,255,0.5)" : "#9CA3AF",
            fontWeight:400, marginLeft:1, alignSelf:"flex-start", marginTop:2 }}>™</span>
        </div>
        {showTagline && (
          <div style={{
            fontFamily:"'Inter', -apple-system, sans-serif",
            fontSize: Math.max(8, size * 0.22),
            fontWeight:600,
            color: dark ? "rgba(255,255,255,0.4)" : (darkText ? "#9CA3AF" : "rgba(255,255,255,0.4)"),
            letterSpacing:"0.12em",
            textTransform:"uppercase",
          }}>
            Build · Value · Scale
          </div>
        )}
      </div>
    </div>
  );
};
