import React, { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { C, F, FM, fmtINR, fmtAED, fmtAED2, fmtDual, AED_TO_INR, isUAE, sym } from './tokens';
import { Card, Skeleton, EmptyState, Logo, Badge, PriBadge } from './components';
// PDF module loaded lazily — only fetched when a user first clicks a PDF button.
// window.open() must always be called BEFORE the await to avoid popup blockers.
const _pdfMod = import('./pdf'); // prefetch in background immediately, no bundle impact
import { AdminLogin, AdminPanel } from './admin';
// ─── CHART STUBS (no recharts dependency) ─────────────────────────────────────
const ResponsiveContainer = ({ children, width, height }) => (
  <div style={{ width: width||"100%", height: height||200, position:"relative" }}>{children}</div>
);
const _ChartBase = ({ data=[], height=180, children, margin={} }) => (
  <div style={{ width:"100%", height, position:"relative", display:"flex", alignItems:"flex-end", gap:2, padding:"8px 4px 20px" }}>
    {children}
  </div>
);
// Simple bar chart renderer
const SimpleBarChart = ({ data=[], bars=[], height=180 }) => {
  const maxVal = Math.max(...data.flatMap(d => bars.map(b => Math.abs(d[b.key]||0))), 1);
  return (
    <div style={{ width:"100%", height, display:"flex", alignItems:"flex-end", gap:3, padding:"4px 0 20px" }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
          {bars.map(b => (
            <div key={b.key} style={{ width:"100%", height: Math.max(2,(Math.abs(d[b.key]||0)/maxVal)*(height-24)),
              background: b.fill||"#3B6FF7", borderRadius:"3px 3px 0 0", opacity: b.opacity||1 }}/>
          ))}
          <div style={{ fontSize:9, color:C.dim, marginTop:2, textAlign:"center", whiteSpace:"nowrap" }}>{d.month||d.name||""}</div>
        </div>
      ))}
    </div>
  );
};
// Simple line chart renderer  
const SimpleLineChart = ({ data=[], lines=[], height=180 }) => {
  const allVals = data.flatMap(d => lines.map(l => d[l.key]||0));
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;
  const w = 100, h = height - 30;
  return (
    <div style={{ width:"100%", height, position:"relative" }}>
      <svg viewBox={`0 0 ${data.length*20} ${h}`} style={{ width:"100%", height:h }} preserveAspectRatio="none">
        {lines.map(l => {
          const pts = data.map((d,i) => `${i*20+10},${h - ((d[l.key]||0)-minVal)/range*h}`).join(" ");
          return <polyline key={l.key} points={pts} fill="none" stroke={l.stroke||"#3B6FF7"} strokeWidth="2"/>;
        })}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", padding:"0 4px" }}>
        {data.map((d,i) => <span key={i} style={{ fontSize:9, color:C.dim }}>{d.month||""}</span>)}
      </div>
    </div>
  );
};
// Stubs for unused recharts components (keep JSX valid)
const AreaChart = ({children,...p}) => <SimpleLineChart data={p.data||[]} lines={[]} height={p.height||180}/>;
const BarChart = ({children,...p}) => <SimpleBarChart data={p.data||[]} bars={[]} height={p.height||180}/>;
const LineChart = ({children,...p}) => <SimpleLineChart data={p.data||[]} lines={[]} height={p.height||180}/>;
const Area = () => null;
const Bar = () => null;
const Line = () => null;
const XAxis = () => null;
const YAxis = () => null;
const CartesianGrid = () => null;
const Legend = () => null;
const Tooltip = () => null;
const ReferenceLine = () => null;
import LOGO_SRC from "./logo.png";
 
// Tokens imported from ./tokens (C, F, FM, fmtINR, fmtAED, fmtAED2, fmtDual, AED_TO_INR, isUAE, sym)
// Components imported from ./components (Card, Skeleton, EmptyState, Logo, Badge, PriBadge)
// PDF generators imported from ./pdf
// Admin components imported from ./admin

// ─── APP-LOCAL HELPERS ────────────────────────────────────────────────────────
const WA = "https://wa.me/919833585810";  // Garima's WhatsApp — single source of truth
const UAE_DISCLAIMER = "UAE figures are prepared by Garima Agarwal (CA, IBBI Registered Valuer) based on data provided by the client. This report is for informational purposes only and does not constitute financial, tax, or legal advice. All amounts in AED unless stated otherwise.";
 
 
 
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
    jurisdiction: "India",
  },
  "DEMO-UAE": {
    name: "Ahmed Al Rashidi", company: "Rashidi Trading LLC (DMCC)",
    type: "both", clientPack: "startup", email: "demo-uae@finzzup.com",
    jurisdiction: "UAE", freezone: "DMCC",
    trnVAT: "100345678900003", trnCT: "900012345678901",
    vatRegistered: true, qfzpStatus: true, sbrEligible: true,
    financialYearEnd: "31 Dec",
  },
  "DEMO-XBORDER": {
    name: "Priya Shah", company: "Shah Industries (India + UAE)",
    type: "both", clientPack: "msme", email: "demo-xborder@finzzup.com",
    jurisdiction: "Cross-Border", freezone: "JAFZA",
    trnVAT: "100987654300001", vatRegistered: true,
    qfzpStatus: false, sbrEligible: true, financialYearEnd: "31 Mar",
  },
};
 
// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const KPIs = [
  { label:"Revenue",      value:"₹8.4 Cr",  prev:"₹7.9 Cr",  trend:"up",   color:C.blue,   bg:"#EEF3FE", emoji:"ti-trending-up"    },
  { label:"Gross Margin", value:"41%",       prev:"38%",       trend:"up",   color:C.teal,   bg:"#E6FAF7", icon:"margin" },
  { label:"Cash Balance", value:"₹2.1 Cr",  prev:"₹2.6 Cr",  trend:"down", color:C.amber,  bg:"#FEF7E7", icon:"cash"   },
  { label:"Burn Rate",    value:"₹48L/mo",  prev:"₹52L/mo",  trend:"up",   color:C.purple, bg:"#F3EFFF", icon:"burn"   },
  { label:"Runway",       value:"4.4 mo",   prev:"5.0 mo",   trend:"down", color:C.pink,   bg:"#FEF0F7", icon:"runway" },
  { label:"ARR",          value:"₹6.2 Cr",  prev:"₹5.4 Cr",  trend:"up",   color:C.green,  bg:"#E8FAF3", icon:"arr"    },
];
 
const KPIs_UAE = [
  { label:"Revenue",           value:"AED 1.85M", prev:"AED 1.40M", trend:"up",   color:C.blue,   bg:"#EEF3FE", icon:"rev"      },
  { label:"Gross Margin",      value:"45%",        prev:"42%",        trend:"up",   color:C.teal,   bg:"#E6FAF7", icon:"margin"   },
  { label:"Cash Balance",      value:"AED 620K",   prev:"AED 580K",   trend:"up",   color:C.green,  bg:"#E8FAF3", icon:"cash"     },
  { label:"Burn Rate",         value:"AED 75K/mo", prev:"AED 82K/mo", trend:"up",   color:C.purple, bg:"#F3EFFF", icon:"burn"     },
  { label:"Runway",            value:"8.3 mo",     prev:"7.1 mo",     trend:"up",   color:C.purple, bg:"#F3EFFF", icon:"runway"   },
  { label:"VAT Payable",       value:"AED 92.5K",  prev:"AED 78K",    trend:"down", color:C.amber,  bg:"#FEF7E7", icon:"invoice"  },
  { label:"CT Effective Rate", value:"0%", prev:"9% (std rate)", trend:"up", color:C.green, bg:"#E8FAF3", icon:"chart_pie"},
  { label:"QFZP Score",        value:"82/100",      prev:"75/100",     trend:"up",   color:C.blue,   bg:"#EEF3FE", icon:"star"     },
];
 
// ─── SVG ICON SYSTEM ──────────────────────────────────────────────────────────
// Replaces all emojis with clean SVG icons throughout the portal
function Icon({ name, size=16, color="currentColor", style={} }) {
  const s = { width:size, height:size, display:"inline-block", flexShrink:0, ...style };
  const icons = {
    rev:        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    margin:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    cash:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    burn:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 6v6l4 2"/></svg>,
    runway:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    arr:        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    home:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    dashboard:  <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    cashflow:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    actions:    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    report:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    valuation:  <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    market:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    calendar:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    plus:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    documents:  <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    invoice:    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    treasury:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    bi:         <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    scenario:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="21 6 15 12 9 6 3 12"/><polyline points="21 12 15 18 9 12 3 18"/></svg>,
    spend:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    trend_up:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    trend_down: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
    alert:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    check:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
    info:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    note:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    request:    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    chart_bar:  <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    chart_pie:  <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
    users:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    settings:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    logout:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    collapse:   <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
    expand:     <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
    send:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    close:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    whatsapp:   <svg {...s} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
    star:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    flag:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    board:      <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    bank:       <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
    ai:         <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1" fill={color}/><circle cx="15" cy="14" r="1" fill={color}/></svg>,
  };
  return icons[name] || icons["info"];
}
// Generates a one-line meaningful insight for any KPI based on label, value, trend, prev
function kpiContext(k) {
  const label = (k.label || "").toLowerCase();
  const up    = k.trend === "up";
  const prev  = k.prev && k.prev !== "—" ? k.prev : null;
  const val   = k.value || "";
 
  // UAE-specific
  if (label.includes("vat payable")) {
    return "File by 28th of month following quarter end";
  }
  if (label.includes("ct effective") || label.includes("ct rate")) {
    return "0% via QFZP status — maintain substance requirements";
  }
  if (label.includes("qfzp")) {
    const num = parseFloat(val);
    if (num >= 85) return "Strong QFZP compliance — maintain documentation";
    if (num >= 70) return "Good — address audit readiness to improve";
    return "Action needed — review substance requirements";
  }
 
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
    if (num >= 3)  return "Under 6 months — act immediately";
    return "Critical — fundraise or cut costs now";
  }
  if (label.includes("arr") || label.includes("mrr")) {
    return up ? ("Growing — " + (prev ? "up from " + prev : "positive trend")) : prev ? ("Declined from " + prev + " — check churn") : "Annual recurring revenue";
  }
  if (label.includes("ebitda")) {
    return up ? "Improving profitability" : prev ? `Down from ${prev} — review opex` : "Earnings before interest & tax";
  }
  if (label.includes("debtor") || label.includes("receivable")) {
    const num = parseFloat(val);
    if (num > 45) return "High — chase collections urgently";
    if (num > 30) return "Above target · follow up overdue invoices";
    return "Within target range";
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
  { month:"Sep", value:185, forecast:null },
  { month:"Oct", value:192, forecast:null },
  { month:"Nov", value:210, forecast:null },
  { month:"Dec", value:228, forecast:null },
  { month:"Jan", value:196, forecast:null },
  { month:"Feb", value:215, forecast:null },
  { month:"Mar", value:242, forecast:null },
  { month:"Apr", value:null, forecast:220 },
  { month:"May", value:null, forecast:248 },
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
  uae: [
    { id:1, text:"File VAT return for Q1 — deadline 28 April",                        priority:"High",   done:false },
    { id:2, text:"Elect Small Business Relief (SBR) in CT return — 0% tax",          priority:"High",   done:false },
    { id:3, text:"Prepare QFZP substance documentation (staff, lease, activities)",   priority:"High",   done:false },
    { id:4, text:"Review related-party transactions for CT arm's-length compliance",  priority:"High",   done:false },
    { id:5, text:"Delay non-essential spend — cash tight due to Q1 VAT payment",     priority:"Medium", done:false },
    { id:6, text:"Renew DMCC trade license — due 15 May",                             priority:"Medium", done:false },
    { id:7, text:"Prepare audited financials — mandatory for QFZP status",            priority:"Medium", done:false },
    { id:8, text:"Check de-minimis rule: non-qualifying income < 5% or AED 5M",     priority:"Low",    done:true  },
  ],
};
const ACTIONS = ACTIONS_BY_PACK.startup; // fallback
 
const BOARD_PACKS = [
  { name:"Board Pack — February 2026", date:"20 Feb 2026", size:"2.4 MB", uploadedAt:"2026-02-20" },
  { name:"Board Pack — January 2026",  date:"22 Jan 2026", size:"2.1 MB", uploadedAt:"2026-01-22" },
  { name:"Board Pack — December 2025", date:"19 Dec 2025", size:"1.9 MB", uploadedAt:"2025-12-19" },
  { name:"Board Pack — November 2025", date:"21 Nov 2025", size:"2.0 MB", uploadedAt:"2025-11-21" },
];
// "new" badge computed at render time, not module load
 
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
 
// Shared UI components imported from ./components (Card, Skeleton, EmptyState, Logo, Badge, PriBadge)

// ─── APP-ONLY UI COMPONENTS ───────────────────────────────────────────────────
// StatCard — treasury-style: icon + coloured value + muted label
const StatCard = ({ icon, iconColor, value, label, sub, hover=true }) => (
  <Card hover={hover}>
    {icon && <i className={"ti " + icon} style={{ fontSize:18, color:iconColor||C.blue, marginBottom:10, display:"block" }}/>}
    <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
      color:iconColor||C.blue, lineHeight:1.2, marginBottom:4 }}>{value}</div>
    <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{label}</div>
    {sub && <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2 }}>{sub}</div>}
  </Card>
);
 
const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:14 }}>
    <h2 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, margin:0, letterSpacing:"-0.01em" }}>{children}</h2>
    {sub && <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>{sub}</p>}
  </div>
);
 
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
        style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:14,
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
  const isMobile            = useMobile();
  const [code, setCode]     = useState("");
  const [client, setClient] = useState(null);
  const [form, setForm]     = useState({ email:"", password:"", confirm:"" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
 
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
      .from("clients").select("*").eq("email", form.email.trim()).maybeSingle();
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
      .from("clients").select("*").eq("email", form.email.trim()).maybeSingle();
    setLoading(false);
    if (dbErr || !data) { setError("Account not found. Please register first."); return; }
    onLogin(data);
  };
 
  return (
    <div style={{ minHeight:"100vh", display:"flex", fontFamily:F }}>
      {/* ── Left branding panel — hidden on mobile ── */}
      {!isMobile && (
      <div className="login-left-panel" style={{ width:420, flexShrink:0, background:"linear-gradient(160deg,#0A1128 0%,#1a2a5e 100%)",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding:"48px 44px", position:"relative", overflow:"hidden" }}>
        {/* Subtle circle decorations */}
        <div style={{ position:"absolute", right:-60, top:-60, width:220, height:220,
          borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", left:-40, bottom:-40, width:160, height:160,
          borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }}/>
        {/* Logo */}
        <div>
          <Logo size={32} dark={true} showTagline={false} darkText={false}/>
        </div>
        {/* Main pitch */}
        <div>
          <div style={{ fontFamily:F, fontSize:26, fontWeight:800, color:"white",
            lineHeight:1.25, marginBottom:16, letterSpacing:"-0.02em" }}>
            Your CFO.<br/>On demand.
          </div>
          <div style={{ fontFamily:F, fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginBottom:32 }}>
            Real-time financial visibility, AI-powered<br/>
            analysis, and expert CFO guidance — all in<br/>
            one secure portal.
          </div>
          {/* Trust strip */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { icon:"ti-shield-check",   text:"Bank-grade security"           },
              { icon:"ti-robot",          text:"AI analysis via Anthropic"      },
              { icon:"ti-chart-bar",      text:"India & UAE tax compliance"     },
            ].map((t,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8,
                  background:"rgba(255,255,255,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className={"ti " + t.icon} style={{ fontSize:14, color:"rgba(255,255,255,0.7)" }}/>
                </div>
                <span style={{ fontFamily:F, fontSize:12, color:"rgba(255,255,255,0.55)" }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.28)" }}>
          © {new Date().getFullYear()} Finzzup Advisory LLP
        </div>
      </div>
      )}

      {/* ── Right form panel ── */}
      <div className="login-right-panel" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        background: isMobile ? "#fff" : "#F8FAFC", padding: isMobile ? "32px 20px" : "40px 24px",
        minHeight:"100vh" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none",
          background:`radial-gradient(ellipse 50% 40% at 75% 30%, rgba(59,111,247,0.05) 0%, transparent 60%)` }}/>

        <div style={{ width:"100%", maxWidth:400, position:"relative" }}>
          {isMobile && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
              <Logo size={32} showTagline={false}/>
            </div>
          )}
          <div style={{ marginBottom:32 }}>
            <div style={{ fontFamily:F, fontSize:22, fontWeight:800, color:C.text,
              letterSpacing:"-0.02em", marginBottom:6 }}>
              {step==="code" ? "Sign in to your portal" : step==="signin" ? "Welcome back" : "Set your password"}
            </div>
            <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>
              {step==="code"
                ? "Enter your invite code to continue."
                : step==="signin"
                  ? "Sign in with your email and password."
                  : `Setting up access for ${client?.company||"your account"}.`}
            </div>
          </div>

        <Card style={{ padding:28 }}>

          {/* ── STEP 1: Enter invite code ── */}
          {step === "code" && <>
            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
              letterSpacing:"0.08em", display:"block", marginBottom:8, fontFamily:F }}>
              Invite Code
            </label>
            <input value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={e => e.key === "Enter" && checkCode()}
              placeholder="e.g. NEXO2026"
              style={{ width:"100%", padding:"12px 14px", borderRadius:8, fontSize:15,
                border:`1.5px solid ${error ? C.red : C.border}`, fontFamily:FM,
                fontWeight:600, letterSpacing:"0.1em", color:C.text, background:"#fff",
                outline:"none", boxSizing:"border-box", textTransform:"uppercase",
                textAlign:"center", transition:"border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e  => e.target.style.borderColor = error ? C.red : C.border}
            />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:8 }}>{error}</p>}

            {/* ── AI & Data Consent ── */}
            <div onClick={() => setConsent(c => !c)}
              style={{ display:"flex", alignItems:"flex-start", gap:10, marginTop:16,
                padding:"12px 14px", borderRadius:8, cursor:"pointer",
                background: consent ? `${C.blue}06` : C.bg3,
                border:`1.5px solid ${consent ? C.blue+"60" : C.border}`,
                transition:"all 0.2s" }}>
              <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, marginTop:2,
                border:`2px solid ${consent ? C.blue : C.dim}`,
                background: consent ? C.blue : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.2s" }}>
                {consent && <i className="ti ti-check" style={{ fontSize:10, color:"white", fontWeight:900 }}/>}
              </div>
              <p style={{ margin:0, fontSize:11.5, color:C.muted, lineHeight:1.6, fontFamily:F }}>
                I understand this portal uses <strong>AI (Anthropic/Claude)</strong> to generate financial
                analysis. Data is processed securely and <strong>not used for AI training</strong>.
              </p>
            </div>

            <button onClick={checkCode} disabled={loading || !consent}
              style={{ width:"100%", marginTop:14, padding:"13px 16px",
                borderRadius:8, border:"none", background: consent ? C.grad1 : C.bg3,
                color: consent ? "white" : C.dim,
                fontFamily:F, fontWeight:700, fontSize:14,
                cursor: consent ? "pointer" : "not-allowed",
                opacity:loading ? 0.75 : 1,
                boxShadow: consent ? "0 2px 8px rgba(59,111,247,0.22)" : "none",
                transition:"all 0.2s" }}>
              {loading ? "Checking…" : "Continue →"}
            </button>

            <div style={{ textAlign:"center", marginTop:16, fontFamily:F, fontSize:13, color:C.muted }}>
              Already have an account?{" "}
              <button onClick={() => setStep("signin")}
                style={{ background:"none", border:"none", color:C.blue, fontWeight:700,
                  fontSize:13, cursor:"pointer", fontFamily:F, padding:0 }}>
                Sign in
              </button>
            </div>

            {/* Demo accounts */}
            <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:10, fontFamily:F }}>Try a demo</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  { code:"DEMO-STARTUP",  label:"Startup / CFO",      icon:"ti-rocket",        color:C.blue   },
                  { code:"DEMO-MSME",     label:"MSME",                icon:"ti-building",      color:C.teal   },
                  { code:"DEMO-CORP",     label:"Corporate",           icon:"ti-building-bank", color:C.purple },
                  { code:"DEMO-UAE",      label:"UAE / Dubai",         icon:"ti-flag",          color:"#00732F"},
                  { code:"DEMO-XBORDER", label:"Cross-Border",        icon:"ti-world",         color:C.amber  },
                ].map(d => (
                  <button key={d.code} onClick={() => setCode(d.code)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"8px 11px", borderRadius:7, border:`1px solid ${d.color}20`,
                      background:`${d.color}07`, cursor:"pointer", fontFamily:F, width:"100%",
                      touchAction:"manipulation" }}>
                    <span style={{ fontSize:12, color:C.text, fontWeight:600, display:"flex",
                      alignItems:"center", gap:7 }}>
                      <i className={"ti " + d.icon} style={{ fontSize:14, color:d.color }}/>{d.label}
                    </span>
                    <span style={{ fontFamily:FM, fontSize:10, fontWeight:700, color:d.color }}>{d.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </>}
 
          {/* ── STEP 2: Register ── */}
          {step === "register" && <>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14,
              padding:"12px 14px", borderRadius:16, background:`${C.green}0A`, border:`1px solid ${C.green}25` }}>
              <span style={{ fontSize:22 }}>✓</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Code accepted!</div>
                <div style={{ fontSize:12, color:C.muted }}>{client?.company}</div>
              </div>
            </div>
            <h2 style={{ fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:20 }}>Create your account</h2>
            <LoginInput label="Email"            value={form.email}    onChange={e => { setForm(f=>({...f,email:e.target.value}));    setError(""); }} type="email"    placeholder="your@email.com" />
            <LoginInput label="Password"         value={form.password} onChange={e => { setForm(f=>({...f,password:e.target.value})); setError(""); }} type="password" placeholder="Min 6 characters" />
            <LoginInput label="Confirm Password" value={form.confirm}  onChange={e => { setForm(f=>({...f,confirm:e.target.value}));  setError(""); }} type="password" placeholder="Repeat password" />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
            <button onClick={register} disabled={loading} style={{ width:"100%", marginTop:8, padding:"13px 16px",
              borderRadius:8, border:"none", background:C.grad1, color:"white",
              fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer", opacity:loading?0.75:1,
              boxShadow:"0 2px 8px rgba(59,111,247,0.22)", touchAction:"manipulation" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
            <button onClick={() => { setStep("code"); setError(""); }} style={{ width:"100%",
              marginTop:8, padding:"11px 16px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:C.muted, fontFamily:F, fontSize:13, cursor:"pointer" }}>
              ← Back
            </button>
          </>}
 
          {/* ── STEP 3: Sign in (returning client) ── */}
          {step === "signin" && <>
            <h2 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>Welcome back</h2>
            <p style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
              Sign in to your Finzzup portal.
            </p>
            <LoginInput label="Email"    value={form.email}    onChange={e => { setForm(f=>({...f,email:e.target.value}));    setError(""); }} type="email"    placeholder="your@email.com" />
            <LoginInput label="Password" value={form.password} onChange={e => { setForm(f=>({...f,password:e.target.value})); setError(""); }} type="password" placeholder="Your password" />
            {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
            <button onClick={signIn} disabled={loading} style={{ width:"100%", marginTop:8, padding:"13px 16px",
              borderRadius:8, border:"none", background:C.grad1, color:"white",
              fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer", opacity:loading?0.75:1,
              boxShadow:"0 2px 8px rgba(59,111,247,0.22)", touchAction:"manipulation" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
            <button onClick={() => { setStep("code"); setError(""); }} style={{ width:"100%",
              marginTop:8, padding:"11px 16px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"transparent", color:C.muted, fontFamily:F, fontSize:13, cursor:"pointer" }}>
              ← New client? Enter invite code
            </button>
          </>}
 
        </Card>
        <p style={{ textAlign:"center", fontSize:11, color:C.dim, marginTop:20 }}>
          <a href="mailto:garima@finzzup.com" style={{ color:C.blue }}>garima@finzzup.com</a>
          {" · "}© 2026 Garima Agarwal, CA (M.No. 160944)
        </p>
      </div>
      </div>
    </div>
  );
}
 
// ─── PACK TIER HELPERS ────────────────────────────────────────────────────────
function normalizePack(p) {
  if (p === "growth")   return "msme";
  if (p === "premium")  return "corporate";
  return p || "startup";
}
// Returns 1 (Starter/₹25k), 2 (MSME/₹60k), 3 (Corporate/₹1.25L)
function packTier(p) {
  const n = normalizePack(p);
  if (n === "corporate") return 3;
  if (n === "msme")      return 2;
  return 1;
}
function getPackLabel(p) {
  const n = normalizePack(p);
  if (n === "corporate") return "Corporate Pack";
  if (n === "msme")      return "MSME Pack";
  if (n === "uae")       return "UAE Pack";
  return "Starter Pack";
}
function getReportLabel(p) {
  const n = normalizePack(p);
  if (n === "corporate") return "Corporate Report";
  if (n === "msme")      return "MSME Report";
  return "CFO Report";
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
// Dynamic nav based on client pack type
function getNav(client) {
  const rawPack = client?.client_pack || client?.clientPack || "startup";
  const pack = normalizePack(rawPack);
  const tier = packTier(rawPack);
  const type = client?.type || "both";
  const uae  = isUAE(client);
 
  const base = [
    { id:"overview",  icon:"ti-home", label:"Overview"  },
    { id:"dashboard", icon:"ti-layout-dashboard", label:"Dashboard" },
  ];
 
  if (type === "cfo" || type === "both") {
    base.push({ id:"cashflow", icon:"ti-trending-up", label:"Cash Flow" });
    // Treasury: Growth+ or UAE
    if (tier >= 2 || uae) {
      base.push({ id:"treasury", icon:"ti-building-bank", label:"Treasury" });
    }
    // Action Items: Growth+
    if (tier >= 2) {
      base.push({ id:"actions", icon:"ti-checkbox", label:"Action Items" });
    }
  }

  base.push({ id:"myreport", icon:"ti-report-analytics", label:getReportLabel(rawPack) });

  // Valuation Status — Growth+, India only
  if (!uae && tier >= 2 && (type === "valuation" || type === "both")) {
    base.push({ id:"engagement", icon:"ti-scale", label:"Valuation Status" });
  }

  // UAE-specific modules
  if (uae) {
    base.push({ id:"corptax",    icon:"ti-receipt-tax",     label:"Corporate Tax"   });
    base.push({ id:"compliance", icon:"ti-calendar-event",  label:"Compliance Cal." });
    base.push({ id:"auditready", icon:"ti-shield-check",    label:"Audit Readiness" });
  }

  base.push({ id:"market",   icon:"ti-world",          label:"Market Intel" });
  base.push({ id:"calendar", icon:"ti-calendar-check", label:"Book a Call"  });
  if (!uae) {
    base.push({ id:"newrequest", icon:"ti-circle-plus", label:"New Request"  });
    base.push({ id:"invoices",   icon:"ti-receipt",     label:"Invoices", badge:2 });
  }
  base.push({ id:"documents", icon:"ti-folder", label:"My Documents" });
  return base;
}
 
function Sidebar({ page, setPage, client, onLogout, collapsed, setCollapsed }) {
  const nav = getNav(client);
  const groups = [
    { label:"Home",         ids:["overview","dashboard"] },
    { label:"Financial",    ids:["cashflow","treasury","myreport","corptax"] },
    { label:"Operations",   ids:["actions","compliance","auditready"] },
    { label:"Intelligence", ids:["market"] },
    { label:"Account",      ids:["calendar","newrequest","documents","invoices","engagement"] },
  ];
  return (
    <aside className={`main-sidebar${collapsed?"":" sidebar-open"}`}
      style={{ width:collapsed?52:220, minHeight:"100vh", background:"#fff",
      flexShrink:0, display:"flex", flexDirection:"column", transition:"width 0.2s",
      overflow:"hidden", borderRight:`1px solid ${C.border}` }}>
 
      {/* Logo */}
      <div style={{ padding:collapsed?"14px 0":"12px 16px", display:"flex",
        alignItems:"center", justifyContent:collapsed?"center":"space-between",
        borderBottom:`1px solid ${C.border}`, minHeight:46, overflow:"visible" }}>
        {!collapsed && <Logo size={24} showTagline={false}/>}
        {collapsed && <Logo size={18} collapsed/>}
        <button onClick={()=>setCollapsed(c=>!c)} style={{ background:"none", border:"none",
          cursor:"pointer", color:C.dim, fontSize:18, lineHeight:1,
          padding:"2px 0", display:"flex", alignItems:"center" }}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>
 
      {/* Client chip */}
      {!collapsed && (
        <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`,
          background:"#fff" }}>
          <div style={{ fontSize:9, color:C.dim, fontFamily:F,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>Client</div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text,
            fontFamily:F, lineHeight:1.3 }}>{client?.name}</div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:F,
            marginTop:1 }}>{client?.company}</div>
        </div>
      )}
 
      {/* Nav groups */}
      <nav style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {groups.map((g, gi) => {
          const items = nav.filter(n => g.ids.includes(n.id));
          if (!items.length) return null;
          return (
            <div key={gi} style={{ marginBottom:6 }}>
              {!collapsed && (
                <div style={{ padding:"6px 16px 3px", fontSize:9, fontWeight:600,
                  color:C.dim, textTransform:"uppercase",
                  letterSpacing:"0.12em", fontFamily:F }}>{g.label}</div>
              )}
              {items.map(n => (
                <button key={n.id} onClick={()=>setPage(n.id)}
                  title={collapsed ? n.label : undefined}
                  style={{ display:"flex", alignItems:"center",
                    gap:collapsed?0:9, width:"100%",
                    padding:collapsed?"9px 0":"6px 16px",
                    justifyContent:collapsed?"center":"flex-start",
                    background:page===n.id?C.accentLight:"transparent",
                    border:"none", cursor:"pointer",
                    borderLeft:page===n.id?`3px solid ${C.blue}`:"3px solid transparent",
                    transition:"all 0.12s", fontFamily:F }}>
                  <i className={"ti " + n.icon}
                    style={{ fontSize:15,
                      color:page===n.id?C.blue:C.muted,
                      display:"inline-block", width:collapsed?undefined:16,
                      textAlign:"center" }}/>
                  {!collapsed && (
                    <span style={{ fontSize:12, fontWeight:page===n.id?500:400,
                      color:page===n.id?C.blue:C.muted,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {n.label}
                    </span>
                  )}
                  {!collapsed && n.badge && (
                    <span style={{ marginLeft:"auto", background:C.red, color:"white",
                      borderRadius:12, padding:"0 5px", fontSize:9, fontWeight:700,
                      fontFamily:F }}>{n.badge}</span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
 
      {/* Footer */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:collapsed?"8px 0":"8px 12px", flexShrink:0 }}>
        {!collapsed && (
          <button onClick={()=>setPage("terms")}
            style={{ width:"100%", padding:"5px 8px", background:"none", border:"none",
              cursor:"pointer", fontFamily:F, fontSize:10,
              color:C.dim, textAlign:"left",
              display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <i className="ti ti-license" style={{ fontSize:13 }}/>
            Terms & Privacy
          </button>
        )}
        <button onClick={onLogout}
          title="Sign Out"
          style={{ display:"flex", alignItems:"center", gap:8, width:"100%",
            padding:collapsed?"10px 0":"8px 10px",
            justifyContent:collapsed?"center":"flex-start",
            background:"none", border:`1px solid ${C.red}22`, borderRadius:8, cursor:"pointer",
            fontFamily:F, fontSize:12, fontWeight:600,
            color:C.red }}>
          <i className="ti ti-logout" style={{ fontSize:15 }}/>
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
 
 
// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function useMobile() {
  const [mob, setMob] = React.useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", h, { passive:true });
    return () => window.removeEventListener("resize", h);
  }, []);
  return mob;
}

function Topbar({ title, client, setPage, notifItems=[], onMenuToggle }) {
  const now  = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"short",year:"numeric"});
  const uae  = isUAE(client);
  const [open, setOpen] = React.useState(false);
  const count = notifItems.length;
  const initials = (client?.name||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <header style={{ height:52, background:"#fff", borderBottom:`1px solid #EAECF0`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 14px", flexShrink:0, zIndex:50,
      boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>

      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {/* Hamburger — visible on mobile via CSS */}
        <button onClick={onMenuToggle} className="hamburger-btn"
          style={{ background:"none", border:"none", cursor:"pointer",
            width:32, height:32, display:"none", alignItems:"center",
            justifyContent:"center", borderRadius:8, color:C.muted }}>
          <i className="ti ti-menu-2" style={{ fontSize:18 }}/>
        </button>
        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:5, fontFamily:F, fontSize:11 }}>
          <span style={{ color:C.muted }} className="bc-home">Home</span>
          <span style={{ color:C.dim }} className="bc-home">›</span>
          <span style={{ color:C.text, fontWeight:500 }}>{title}</span>
        </div>
      </div>
 
      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>
        <span style={{ fontSize:10, color:C.dim, fontFamily:F }}>{now}</span>
 
        {/* Bell */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>setOpen(o=>!o)}
            style={{ background:"none", border:"none", cursor:"pointer",
              width:28, height:28, display:"flex", alignItems:"center",
              justifyContent:"center", borderRadius:12, color:C.muted,
              transition:"background 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg3}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <i className="ti ti-bell" style={{ fontSize:16 }}/>
            {count>0 && (
              <span style={{ position:"absolute", top:3, right:3, width:7, height:7,
                background:C.red, borderRadius:"50%",
                border:"1.5px solid white" }}/>
            )}
          </button>
          {open && count>0 && (
            <div style={{ position:"absolute", top:34, right:0, width:260,
              background:"white", borderRadius:16,
              boxShadow:"0 4px 16px rgba(0,0,0,0.12)",
              border:`1px solid ${C.border}`, overflow:"hidden", zIndex:100 }}>
              <div style={{ padding:"8px 12px", borderBottom:`1px solid ${C.border}`,
                fontFamily:F, fontWeight:600, fontSize:11, color:C.text }}>
                Notifications
              </div>
              {notifItems.slice(0,5).map((n,i) => (
                <div key={i} onClick={()=>{setPage&&setPage(n.page);setOpen(false);}}
                  style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}`,
                    cursor:"pointer", display:"flex", gap:9, alignItems:"flex-start" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background="white"}>
                  <i className="ti ti-info-circle"
                    style={{ fontSize:14, color:C.blue, marginTop:1 }}/>
                  <div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:500,
                      color:C.text }}>{n.title}</div>
                    <div style={{ fontFamily:F, fontSize:10, color:C.muted,
                      marginTop:1 }}>{n.sub||n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* User chip */}
        <div style={{ display:"flex", alignItems:"center", gap:7,
          padding:"4px 10px", borderRadius:12,
          border:`1px solid ${C.border}`, cursor:"pointer",
          background:"#fff", fontFamily:F }}>
          <div style={{ width:22, height:22, borderRadius:"50%",
            background:uae?"#00732F":C.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:9, fontWeight:700, color:"white" }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:C.text, lineHeight:1.2 }}>
              {client?.name?.split(" ")[0]||"User"}
            </div>
            <div style={{ fontSize:9, color:C.muted }}>
              {uae?"UAE CFO":"CFO Client"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
 
 
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
 
// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
const OVERVIEW_REVEXP = [
  { month:"Sep", revenue:72, expenses:58 },
  { month:"Oct", revenue:75, expenses:60 },
  { month:"Nov", revenue:78, expenses:62 },
  { month:"Dec", revenue:81, expenses:63 },
  { month:"Jan", revenue:79, expenses:61 },
  { month:"Feb", revenue:84, expenses:66 },
];
const OVERVIEW_CF = [
  { month:"Sep", net:14 },
  { month:"Oct", net:15 },
  { month:"Nov", net:16 },
  { month:"Dec", net:18 },
  { month:"Jan", net:18 },
  { month:"Feb", net:18 },
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
      { label:"Monthly Revenue", value:"₹84.2L", prev:"₹79.1L", pct:"+6.5%",  up:true,  color:C.blue,   bg:"#EEF3FE", icon:"rev"  },
      { label:"ARR",             value:"₹10.1 Cr",prev:"₹8.5 Cr",pct:"+18.8%",up:true,  color:C.purple, bg:"#F3EFFF", icon:"arr"  },
      { label:"Cash Balance",    value:"₹2.1 Cr", prev:"₹2.6 Cr",pct:"−₹50L", up:false, color:C.teal,   bg:"#E6FAF7", icon:"cash" },
    ],
    benchmarkTitle: "Market Benchmarks — SaaS / Fintech Sector",
    benchmarkCols: ["Metric","Your Value","Sector Median","Series A Benchmark","Status"],
    benchmarks: [
      { metric:"ARR Growth YoY",  yours:"78%",   median:"28%",   bench:"40%+",   ok:true  },
      { metric:"Gross Margin",     yours:"41%",   median:"38%",   bench:"45%+",   ok:false },
      { metric:"Burn Multiple",    yours:"1.2x",  median:"2.1x",  bench:"<1.5x",  ok:true  },
      { metric:"NRR",              yours:"112%",  median:"104%",  bench:">110%",  ok:true  },
      { metric:"CAC Payback",      yours:"8 mo",  median:"22 mo", bench:"<12 mo", ok:true  },
      { metric:"Revenue per FTE",  yours:"₹48L",  median:"₹42L",  bench:"₹60L+",  ok:false },
    ],
    garimaNote: "March was a breakout month — revenue hit ₹84.2L (+6.5% MoM), best in FY26, and burn improved to ₹48L from ₹52L. The ARR growth at 78% YoY puts you well ahead of Series A benchmarks. Two immediate priorities: cash is tight — advance tax of ~₹18L due 15 March plus Client B's overdue ₹4.8L (90+ days) must be resolved this week. I'd hold the AWS infra upgrade to April. On fundraise: your NRR of 112% is the strongest metric in your deck — lead with that. CAC payback now at 8 months is a major improvement from 18 months. Let's update the Series A deck with Q1 actuals before April investor conversations.",
    plRows: [
      { label:"Revenue",      value:"₹84.2L", pct:"+6.5%", trend:"up",   sub:"Best month in FY26 · Gulf client uplift" },
      { label:"Gross Profit", value:"₹34.5L", pct:"41.0%", trend:"up",   sub:"GP margin +2.1pp MoM · vendor savings" },
      { label:"EBITDA",       value:"₹14.7L", pct:"17.5%", trend:"up",   sub:"Best EBITDA margin this year" },
      { label:"Net Profit",   value:"₹10.2L", pct:"12.1%", trend:"up",   sub:"First double-digit net margin in FY26" },
      { label:"Burn Rate",    value:"₹48L/mo",pct:"−7.7%", trend:"up",   sub:"Improved from ₹52L — 2 months in a row" },
      { label:"Runway",       value:"4.4 mo", pct:"−12%",  trend:"down", sub:"Fundraise conversations must start now" },
    ],
  },
  msme: {
    overviewKpis: [
      { label:"Monthly Revenue",    value:"₹84L",  prev:"₹79L",  pct:"+6.1%",  up:true,  color:C.blue,   bg:"#EEF3FE", emoji:"ti-trending-up" },
      { label:"Working Capital",    value:"₹32.4L",prev:"₹30.1L",pct:"+₹2.3L", up:true,  color:C.teal,   bg:"#E6FAF7", emoji:"ti-building-bank" },
      { label:"Debtor Days",        value:"46 days",prev:"51 days",pct:"−5 days",up:true,  color:C.green,  bg:"#ECFDF5", icon:"calendar" },
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
    garimaNote: "February was solid overall, but three things need your attention this week. First — debtor days at 46 is improving (down from 51) but Client B's ₹4.8L has crossed 90 days. Chase this before 15 March or we'll have a cash gap during advance tax week. Second — SBI FD Tranche 1 (₹10L) matures 15 March; let's renew at 7.1% before the April RBI meeting potentially cuts rates. Third — GSTR-3B for February is due 20 March; documents are ready from my end, I just need your digital signature approval by 17th. GP margin improvement to 41% from 38% is real progress — vendor renegotiation is working.",
    plRows: [
      { label:"Revenue",            value:"₹84.2L", pct:"+6.1%",  trend:"up",   sub:"vs ₹79.4L last month" },
      { label:"Cost of Goods Sold", value:"₹49.7L", pct:"58.9%",  trend:"down", sub:"Vendor savings of ₹2.3L this month" },
      { label:"Gross Profit",       value:"₹34.5L", pct:"41.0%",  trend:"up",   sub:"GP margin +2.6pp vs last month" },
      { label:"Operating Expenses", value:"₹19.8L", pct:"23.5%",  trend:"down", sub:"Within budget — well controlled" },
      { label:"EBITDA",             value:"₹14.7L", pct:"17.5%",  trend:"up",   sub:"EBITDA margin best in 6 months" },
      { label:"Debtor Days",        value:"46 days", pct:"−5 days",trend:"up",   sub:"Improving · target <30 days by Jun" },
    ],
  },
  corporate: {
    overviewKpis: [
      { label:"Revenue (Feb)",   value:"₹842L", prev:"₹810L", pct:"+4.0%",   up:true,  color:C.blue,   bg:"#EEF3FE", emoji:"ti-trending-up" },
      { label:"EBITDA",          value:"₹147L", prev:"₹115L", pct:"+27.8%",  up:true,  color:C.purple, bg:"#F3EFFF", icon:"margin" },
      { label:"PAT",             value:"₹81L",  prev:"₹56L",  pct:"+44.6%",  up:true,  color:C.green,  bg:"#ECFDF5", emoji:"ti-building-bank" },
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
    garimaNote: "February was the strongest month in FY26 — EBITDA at ₹147L, up 27.8% vs budget, and PAT nearly doubled year-on-year to ₹81L. The revenue beat of ₹32L vs budget is partly structural (new SKU mix) and partly timing — don't model it forward without adjustment. Two compliance items are time-sensitive: (1) Ind AS 116 lease restatement must be completed before Q1 close — I need the lease schedule from Finance by 20 March; (2) related-party transaction disclosures in the annual report need a legal review before filing. On IPO readiness: EBITDA margin at 17.5% needs to cross 18% — one more quarter like this and we're there. ROCE at 22.4% is already above sector median. Please confirm director availability for 18 March board meeting — I'll circulate the draft pack by 12 March.",
    plRows: [
      { label:"Revenue",         value:"₹842L",  pct:"+4.0%",  trend:"up", sub:"Beat budget ₹810L by ₹32L" },
      { label:"Gross Profit",    value:"₹345L",  pct:"41.0%",  trend:"up", sub:"GP margin up 1.2pp vs prior year" },
      { label:"EBITDA",          value:"₹147L",  pct:"17.5%",  trend:"up", sub:"+27.8% vs budget of ₹115L" },
      { label:"Finance Costs",   value:"₹22L",   pct:"2.6%",   trend:"up", sub:"Debt reduction target on track" },
      { label:"PAT",             value:"₹81L",   pct:"9.6%",   trend:"up", sub:"PAT +44.6% YoY — best in 4 years" },
      { label:"ROCE",            value:"22.4%",  pct:"+4.1pp", trend:"up", sub:"vs 18.3% last year · above sector" },
    ],
  },
};
// Aliases so new pricing names resolve to the same config
PACK_CONFIG.starter  = PACK_CONFIG.startup;
PACK_CONFIG.growth   = PACK_CONFIG.msme;
PACK_CONFIG.premium  = PACK_CONFIG.corporate;

// FIXED: Overview now shows Financial Health Score + Story of Month + Actions only.
// Removed: Revenue/Expenses chart, Cash Flow chart, KPI cards (all moved to Dashboard).
// This page is the executive landing — no detailed tables or repeated metrics.
function Overview({ client, setPage, kpis, garimaNote, actions=[], engagement=null, reportData=null, invoices=[], isDemo=false, liveKpis=null, liveReportData=null }) {
  const displayKpis  = kpis || KPIs;
  const ovPack       = normalizePack(client?.client_pack || client?.clientPack);
  const uaeClient    = isUAE(client);
  const isMobile     = useMobile();
  const pendingActions = actions.filter(a => !a.done);
  const highPriority   = pendingActions.filter(a => a.priority === "High");
  const displayNote  = uaeClient
    ? (reportData?.uaeGarimaNote || "Q1 2026 closed strongly. Review priorities in your CFO Report.")
    : (garimaNote || PACK_CONFIG[ovPack]?.garimaNote || PACK_CONFIG.startup.garimaNote);
 
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
 
  const healthScore = reportData?.healthScore || 72;
  const healthColor = healthScore >= 80 ? C.green : healthScore >= 60 ? C.amber : C.red;
  const healthLabel = healthScore >= 80 ? "Strong" : healthScore >= 60 ? "Moderate" : "Needs Attention";
 
  // ── KPI 1 (primary — revenue or AED revenue) ──────────────────────────────
  const primaryKpi  = displayKpis[0] || {};
  const secondaryKpi = displayKpis[1] || {};
  const tertiaryKpi  = displayKpis[2] || {};
 
  // ── AR aging (from invoices or reportData) ────────────────────────────────
  const wc = reportData?.workingCapital || {};
  const arBuckets = [
    { label:"Current",  val: Number(wc.ar0_30   || reportData?.ar0to30   || 0), color: C.green  },
    { label:"31–60d",   val: Number(wc.ar31_60  || reportData?.ar31to60  || 0), color: C.amber  },
    { label:"61–90d",   val: Number(wc.ar61_90  || reportData?.ar61to90  || 0), color: C.orange || "#F97316" },
    { label:"90d+",     val: Number(wc.ar90plus || reportData?.ar90plus  || 0), color: C.red    },
  ];
  const arTotal = arBuckets.reduce((s,b) => s+b.val, 0);
  const hasAR   = arTotal > 0;
 
  // ── Recent invoices ───────────────────────────────────────────────────────
  const recentInv = (invoices || []).slice(0, 5);
 
  // ── Cashflow sparkline data ───────────────────────────────────────────────
  const cfData = (reportData?.cashflow || []).filter(m => m.actual || m.forecast);
  const cfVals = cfData.map(m => {
    const s = String(m.actual || m.forecast || "0").replace(/[^0-9.-]/g,"");
    return parseFloat(s) || 0;
  });
  const cfMax  = Math.max(...cfVals, 1);
  const cfMin  = Math.min(...cfVals, 0);
  const cfRange = cfMax - cfMin || 1;
  const sparkH = 40, sparkW = 140;
 
  // ── P&L summary rows ─────────────────────────────────────────────────────
  const pl = reportData?.pl || {};
  const plRows = uaeClient ? [
    { label:"Revenue",       curr: pl.revenue?.actual    || "—", prev: pl.revenue?.prev    || "—" },
    { label:"Gross Profit",  curr: pl.grossProfit?.actual || "—", prev: pl.grossProfit?.prev || "—" },
    { label:"EBITDA",        curr: pl.ebitda?.actual      || "—", prev: pl.ebitda?.prev      || "—" },
    { label:"Net Profit",    curr: pl.pat?.actual         || "—", prev: pl.pat?.prev         || "—" },
  ] : [
    { label:"Revenue",       curr: pl.revenue?.actual    || "—", prev: pl.revenue?.prev    || "—" },
    { label:"Gross Profit",  curr: pl.grossProfit?.actual || "—", prev: pl.grossProfit?.prev || "—" },
    { label:"EBITDA",        curr: pl.ebitda?.actual      || "—", prev: pl.ebitda?.prev      || "—" },
    { label:"PAT",           curr: pl.pat?.actual         || "—", prev: pl.pat?.prev         || "—" },
  ];
 
  const accentColor = uaeClient ? "#00732F" : C.blue;

  // ── Proactive alerts ───────────────────────────────────────────────────────
  const [dismissedAlerts, setDismissedAlerts] = React.useState(new Set());
  const proAlerts = React.useMemo(() => {
    if (isDemo || !liveKpis) return [];
    const out = [];
    // Cash runway
    const runwayKpi = (kpis||[]).find(k => k.label?.toLowerCase().includes("runway"));
    if (runwayKpi?.value && runwayKpi.value !== "—") {
      const months = parseFloat(String(runwayKpi.value).replace(/[^0-9.]/g,""));
      if (!isNaN(months) && months < 3)
        out.push({ id:"runway-critical", severity:"critical", icon:"ti-flame",
          title:`Cash runway critical — ${runwayKpi.value} remaining`,
          sub:"Immediate action required. Review burn rate and explore bridge options.",
          page:"cashflow" });
      else if (!isNaN(months) && months < 6)
        out.push({ id:"runway-low", severity:"high", icon:"ti-alert-circle",
          title:`Cash runway below 6 months — ${runwayKpi.value}`,
          sub:"Start fundraising conversations or reduce monthly burn.",
          page:"cashflow" });
    }
    // UAE VAT due
    if (uaeClient && liveReportData?.vat?.pendingReturns) {
      const today = new Date();
      (liveReportData.vat.pendingReturns || []).forEach(r => {
        if ((r.status === "Due" || r.status === "Overdue") && r.due) {
          const days = Math.ceil((new Date(r.due) - today) / 86400000);
          if (days <= 14)
            out.push({ id:`vat-${r.period}`, severity: days<=0?"critical":"high", icon:"ti-file-invoice",
              title:`VAT return due: ${r.period}${days<=0?" — OVERDUE":""}`,
              sub:`Filing deadline: ${r.due}${r.vatNet ? ` · AED ${Number(r.vatNet).toLocaleString()} payable` : ""}`,
              page:"uaetax" });
        }
      });
    }
    // Low health score
    const score = reportData?.healthScore;
    if (score && score < 50)
      out.push({ id:"health-low", severity:"high", icon:"ti-heartbeat",
        title:`Financial health score low: ${score}/100`,
        sub:"Multiple KPIs are below benchmark. Review the dashboard.",
        page:"dashboard" });
    return out.filter(a => !dismissedAlerts.has(a.id));
  }, [isDemo, liveKpis, kpis, liveReportData, reportData, uaeClient, dismissedAlerts]);

  const severityStyle = s => s==="critical"
    ? { background:"#FFF1F0", border:"1px solid #FCA5A5", color:C.red }
    : { background:"#FFFBEB", border:"1px solid #FCD34D", color:C.amber };

  return (
    <div className="ns-page">

      {/* ── Page header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div className="ns-page-title">{greeting}, {client?.name?.split(" ")[0] || "there"}</div>
          <div className="ns-sub" style={{ marginTop:2 }}>
            {client?.company} · {uaeClient ? "UAE CFO Dashboard" : `${ovPack.charAt(0).toUpperCase()+ovPack.slice(1)} Pack`}
            {reportData?.monthLabel ? ` · ${reportData.monthLabel}` : ""}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {highPriority.length > 0 && (
            <span className="ns-badge red">
              <i className="ti ti-alert-triangle" style={{ fontSize:11 }}/> {highPriority.length} High Priority
            </span>
          )}
          <span className="ns-badge" style={{ background:`${accentColor}12`, color:accentColor, border:`1px solid ${accentColor}30` }}>
            Health Score: {healthScore}/100 — {healthLabel}
          </span>
        </div>
      </div>

      {/* ── Proactive alert banners ── */}
      {proAlerts.map(alert => (
        <div key={alert.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
          borderRadius:9, ...severityStyle(alert.severity) }}>
          <i className={"ti " + alert.icon} style={{ fontSize:18, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13 }}>{alert.title}</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.8, marginTop:1 }}>{alert.sub}</div>
          </div>
          <button onClick={() => setPage(alert.page)}
            style={{ padding:"5px 12px", borderRadius:6, border:"1px solid currentColor",
              background:"transparent", color:"inherit", fontFamily:F, fontSize:12,
              fontWeight:700, cursor:"pointer", flexShrink:0 }}>
            View →
          </button>
          <button onClick={() => setDismissedAlerts(s => new Set([...s, alert.id]))}
            style={{ padding:"4px 8px", borderRadius:6, border:"none",
              background:"rgba(0,0,0,0.06)", color:"inherit", fontFamily:F,
              fontSize:13, cursor:"pointer", flexShrink:0, lineHeight:1 }}>
            ×
          </button>
        </div>
      ))}

      {/* ── Row 1: KPI tiles ── */}
      <div className="ns-grid-6">
        {displayKpis.slice(0,6).map((kpi,i) => (
          <div key={i} className="ns-kpi-tile">
            <div className="label">{kpi.label}</div>
            <div className="value" style={{ color:kpi.color||C.text }}>{kpi.value}</div>
            {kpi.prev && kpi.prev !== "—" && (
              <div className="trend">
                <span style={{ color:kpi.trend==="up"?C.green:C.red, fontWeight:700 }}>
                  {kpi.trend==="up"?"↑":"↓"}
                </span>
                <span style={{ color:"#9CA3AF" }}>prev: {kpi.prev}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 2: P&L + Health Score + Garima Note ── */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 188px 1fr", gap:14 }}>

        {/* P&L Summary */}
        <div className="ns-panel" style={{ margin:0 }}>
          <div className="ns-panel-header">
            <h3>P&L Summary</h3>
            <span className="ns-badge grey">{reportData?.monthLabel || "Current vs Prior"}</span>
          </div>
          <table className="ns-table">
            <thead>
              <tr><th>Line</th><th className="right">Current</th><th className="right">Prior</th></tr>
            </thead>
            <tbody>
              {plRows.map((r,i) => (
                <tr key={i} className={i===plRows.length-1?"total":"striped"}>
                  <td className={i===0||i===plRows.length-1?"bold":""}>{r.label}</td>
                  <td className="right mono bold">{r.curr}</td>
                  <td className="right mono muted">{r.prev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Health Score gauge */}
        <div className="ns-panel" style={{ margin:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:16 }}>
          <div className="ns-label" style={{ marginBottom:12 }}>Financial Health</div>
          <svg width="116" height="66" viewBox="0 0 120 68">
            <path d="M10,60 A50,50 0 0,1 110,60" stroke="#E5E7EB" strokeWidth="10" fill="none" strokeLinecap="round"/>
            <path d="M10,60 A50,50 0 0,1 110,60"
              stroke={healthColor} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={`${(healthScore/100)*157} 157`}/>
            <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="900"
              fill={healthColor} fontFamily="monospace">{healthScore}</text>
          </svg>
          <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:healthColor, marginTop:4 }}>{healthLabel}</div>
          <div className="ns-sub" style={{ marginTop:4, textAlign:"center" }}>{highPriority.length} high-priority action{highPriority.length!==1?"s":""}</div>
        </div>

        {/* Garima's Note */}
        <div className="ns-panel" style={{ margin:0, borderLeft:`3px solid ${accentColor}` }}>
          <div className="ns-panel-header">
            <h3 style={{ color:accentColor }}>Garima's CFO Note</h3>
            {reportData?.lastReviewedAt && !isDemo && (
              <span style={{ display:"flex", alignItems:"center", gap:5,
                fontSize:11, fontWeight:600, color:C.green }}>
                <i className="ti ti-circle-check" style={{ fontSize:13 }}/>
                Reviewed {new Date(reportData.lastReviewedAt).toLocaleDateString("en-GB",
                  { day:"numeric", month:"short", year:"numeric" })}
              </span>
            )}
          </div>
          <div style={{ padding:"0 16px 16px" }}>
            <p style={{ fontFamily:F, fontSize:12.5, color:C.text, lineHeight:1.8, margin:"0 0 12px" }}>
              {displayNote}
            </p>
            <button onClick={() => setPage("myreport")}
              style={{ padding:"7px 14px", borderRadius:7, border:`1px solid ${accentColor}`,
                background:"transparent", color:accentColor, fontFamily:F, fontSize:12,
                fontWeight:700, cursor:"pointer" }}>
              Full Report →
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Action Items + AR Aging + Cash Flow ── */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:14 }}>

        {/* Action Items */}
        <div className="ns-panel" style={{ margin:0 }}>
          <div className="ns-panel-header">
            <h3>Action Items</h3>
            <span className="ns-badge red">{pendingActions.length} pending</span>
          </div>
          <div className="ns-panel-body no-pad" style={{ maxHeight:220, overflowY:"auto" }}>
            {pendingActions.length === 0
              ? <EmptyState icon="ti-circle-check" title="All clear!" sub="No pending actions."/>
              : pendingActions.slice(0,6).map((a,i) => (
                <div key={i} style={{ padding:"9px 16px", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"flex-start", gap:10,
                  background:a.priority==="High"?"#FFF5F5":"white" }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, marginTop:5,
                    background:a.priority==="High"?C.red:a.priority==="Medium"?C.amber:C.green }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:500, lineHeight:1.4 }}>
                      {a.title||a.text||a.action}
                    </div>
                    {a.due && <div className="ns-sub" style={{ marginTop:1 }}>Due: {a.due}</div>}
                  </div>
                  <span className={`ns-badge ${a.priority==="High"?"red":a.priority==="Medium"?"amber":"green"}`}
                    style={{ fontSize:9 }}>
                    {a.priority||"Low"}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* AR Aging */}
        <div className="ns-panel" style={{ margin:0 }}>
          <div className="ns-panel-header">
            <h3>A/R Aging</h3>
            {hasAR && <span className="ns-label" style={{ fontFamily:FM }}>
              Total: {uaeClient?"AED ":"₹"}{arTotal.toLocaleString()}
            </span>}
          </div>
          {!hasAR
            ? <EmptyState icon="ti-receipt" title="No A/R data" sub="Working capital data not entered yet."/>
            : <div style={{ padding:16 }}>
                {arBuckets.map((b,i) => {
                  const pct = arTotal > 0 ? (b.val/arTotal*100) : 0;
                  return (
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontFamily:F, fontSize:11, color:C.text }}>{b.label}</span>
                        <span style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:b.color }}>
                          {uaeClient?"AED ":"₹"}{b.val.toLocaleString()}
                          <span className="muted" style={{ fontWeight:400 }}> ({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height:5, background:"#F3F4F6", borderRadius:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:b.color, borderRadius:10, transition:"width 0.5s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* Cash Flow sparkline */}
        <div className="ns-panel" style={{ margin:0 }}>
          <div className="ns-panel-header"><h3>Cash Flow Trend</h3></div>
          {cfVals.length < 2
            ? <EmptyState icon="ti-chart-line" title="No cash flow data" sub="Cash flow data not entered yet."/>
            : <div style={{ padding:16 }}>
                <svg width="100%" height={sparkH+20} viewBox={`0 0 ${sparkW} ${sparkH+20}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accentColor} stopOpacity="0.25"/>
                      <stop offset="100%" stopColor={accentColor} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {(() => {
                    const pts = cfVals.map((v,i) => {
                      const x = cfVals.length > 1 ? (i/(cfVals.length-1))*(sparkW-4)+2 : sparkW/2;
                      const y = sparkH - ((v-cfMin)/cfRange)*(sparkH-4) + 2;
                      return [x,y];
                    });
                    const lineD = pts.map((p,i) => (i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`)).join(" ");
                    const fillD = lineD + ` L${pts[pts.length-1][0]},${sparkH+2} L${pts[0][0]},${sparkH+2} Z`;
                    return (<>
                      <path d={fillD} fill="url(#sparkGrad)"/>
                      <path d={lineD} stroke={accentColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2.5" fill={accentColor}/>)}
                    </>);
                  })()}
                </svg>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  {cfData.slice(0,4).map((m,i) => (
                    <span key={i} style={{ fontFamily:F, fontSize:9, color:C.muted }}>{m.month}</span>
                  ))}
                </div>
              </div>
          }
        </div>
      </div>

      {/* ── Row 4: KPI Variance table ── */}
      {(reportData?.variance||[]).length > 0 && (
        <div className="ns-panel">
          <div className="ns-panel-header"><h3>Key Performance Indicators — Budget vs Actual</h3></div>
          <table className="ns-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th className="right">Budget</th>
                <th className="right">Actual</th>
                <th className="right">Variance</th>
                <th style={{ textAlign:"center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.variance||[]).slice(0,6).map((v,i) => {
                const diff = v.noCalc ? null : (() => {
                  const b = parseFloat(String(v.budget||"0").replace(/[^0-9.-]/g,""));
                  const a = parseFloat(String(v.actual||"0").replace(/[^0-9.-]/g,""));
                  if (!b) return null;
                  return (((a-b)/Math.abs(b))*100).toFixed(1);
                })();
                const favourable = v.fav ? (diff===null||parseFloat(diff)>=0) : (diff===null||parseFloat(diff)<=0);
                return (
                  <tr key={i} className="striped">
                    <td>{v.metric}</td>
                    <td className="right mono muted">{v.budget}</td>
                    <td className="right mono bold">{v.actual}</td>
                    <td className="right mono" style={{ color:diff===null?C.muted:favourable?C.green:C.red, fontWeight:700 }}>
                      {diff===null?"—":(parseFloat(diff)>0?"+":"")+diff+"%"}
                    </td>
                    <td style={{ textAlign:"center" }}>
                      <span className={`ns-badge ${favourable?"green":"red"}`}>
                        {favourable?"On Track":"Watch"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
 
 
function Dashboard({ client, kpis, garimaNote, reportData, loading }) {
  const displayKpis = kpis || KPIs;
  const pack    = normalizePack(client?.client_pack || client?.clientPack);
  const accent  = pack==="msme" ? C.blue : pack==="corporate" ? C.purple : C.blue;
  const pl      = reportData?.pl || {};
  const uae     = isUAE(client);
 
  // Period-over-period P&L rows
  const plRows = [
    { label:"Revenue",       curr:pl.revenue?.actual||"—",     prev:pl.revenue?.prev||"—",     key:"revenue"    },
    { label:"Cost of Sales", curr:pl.cogs?.actual||"—",        prev:pl.cogs?.prev||"—",        key:"cogs"       },
    { label:"Gross Profit",  curr:pl.grossProfit?.actual||"—", prev:pl.grossProfit?.prev||"—", key:"gp"         },
    { label:"GP Margin %",   curr:pl.gpMargin?.actual||"—",    prev:pl.gpMargin?.prev||"—",    key:"gpmargin"   },
    { label:"EBITDA",        curr:pl.ebitda?.actual||"—",      prev:pl.ebitda?.prev||"—",      key:"ebitda"     },
    { label:"EBITDA Margin", curr:pl.ebitdaMargin?.actual||"—",prev:pl.ebitdaMargin?.prev||"—",key:"ebitdamargin"},
    { label:"Net Profit",    curr:pl.pat?.actual||"—",         prev:pl.pat?.prev||"—",         key:"pat"        },
    { label:"Net Margin %",  curr:pl.netMargin?.actual||"—",   prev:pl.netMargin?.prev||"—",   key:"netmargin"  },
  ];
 
  // Variance rows
  const varRows = (reportData?.variance||[]).slice(0,6);
 
  // Key metric summary (NetSuite "Financials" strip)
  const summaryMetrics = [
    { label:"Gross Profit %",         value:pl.gpMargin?.actual||"—"     },
    { label:"Net Income as % Revenue", value:pl.netMargin?.actual||"—"    },
    { label:"EBITDA",                  value:pl.ebitda?.actual||"—"       },
    { label:"Cash Balance",            value:displayKpis.find(k=>k.label?.toLowerCase().includes("cash"))?.value||"—" },
  ];
 
  return (
    <div className="ns-page">
      {/* Page title */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div className="ns-page-title">KPI Dashboard</div>
          <div className="ns-sub" style={{ marginTop:2 }}>{client?.company} · {reportData?.monthLabel||new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
        </div>
        {reportData?.monthLabel && (
          <span className="ns-badge blue">{reportData.monthLabel}</span>
        )}
      </div>
 
      {/* Summary metrics strip — NetSuite Financials Overview */}
      <div className="ns-panel">
        <div className="ns-panel-header"><h3>Financials Overview</h3></div>
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #E5E7EB" }}>
          {summaryMetrics.map((m,i) => (
            <div key={i} style={{ flex:1, padding:"14px 18px",
              borderRight:i<summaryMetrics.length-1?"1px solid #E5E7EB":"none" }}>
              <div className="ns-label">{m.label}</div>
              <div style={{ fontFamily:FM, fontSize:16, fontWeight:900, color:"#111827", marginTop:4 }}>{m.value}</div>
            </div>
          ))}
        </div>
        {/* Multi-period P&L table */}
        <table className="ns-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th className="right">This Period</th>
              <th className="right">Last Period</th>
            </tr>
          </thead>
          <tbody>
            {plRows.map((r,i) => {
              const isMargin = r.key.includes("margin");
              const isSubtot = ["gp","ebitda","pat"].includes(r.key);
              const isTotal  = r.key === "pat";
              return (
                <tr key={i} className={isTotal?"total":isSubtot?"subtotal":"striped"}>
                  <td className={isTotal||isSubtot?"bold":""}>{r.label}</td>
                  <td className="right mono bold">{r.curr}</td>
                  <td className="right mono muted">{r.prev}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
 
      {/* KPI grid — 6 tiles */}
      <div className="ns-grid-6">
        {loading
          ? Array.from({length:6}).map((_,i) => (
              <div key={i} className="ns-kpi-tile">
                <Skeleton width="55%" height={11} style={{ marginBottom:10 }}/>
                <Skeleton width="70%" height={22} style={{ marginBottom:8 }}/>
                <Skeleton width="45%" height={10}/>
              </div>
            ))
          : displayKpis.slice(0,6).map((k,i) => (
              <div key={i} className="ns-kpi-tile">
                <div className="label">{k.label}</div>
                <div className="value" style={{ color: k.color || "#111827" }}>{k.value}</div>
                {k.prev && k.prev!=="—" && (
                  <div className="trend">
                    <span style={{ color:k.trend==="up"?C.green:C.red, fontWeight:700 }}>
                      {k.trend==="up"?"↑":"↓"}
                    </span>
                    <span style={{ color:"#9CA3AF" }}>prev: {k.prev}</span>
                  </div>
                )}
              </div>
            ))
        }
      </div>
 
      {/* Variance table */}
      {varRows.length > 0 && (
        <div className="ns-panel">
          <div className="ns-panel-header"><h3>Budget vs Actual — Key Performance Indicators</h3></div>
          <table className="ns-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="right">Budget</th>
                <th className="right">Actual</th>
                <th className="right">Variance</th>
                <th style={{ textAlign:"center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {varRows.map((v,i) => {
                const diff = v.noCalc ? null : (() => {
                  const b = parseFloat(String(v.budget||"0").replace(/[^0-9.-]/g,""));
                  const a = parseFloat(String(v.actual||"0").replace(/[^0-9.-]/g,""));
                  if (!b) return null;
                  return (((a-b)/Math.abs(b))*100).toFixed(1);
                })();
                const fav = v.fav ? (diff===null||parseFloat(diff)>=0) : (diff===null||parseFloat(diff)<=0);
                return (
                  <tr key={i} className="striped">
                    <td>{v.metric}</td>
                    <td className="right mono">{v.budget}</td>
                    <td className="right mono bold">{v.actual}</td>
                    <td className="right mono" style={{ color:diff===null?"#9CA3AF":fav?C.green:C.red, fontWeight:700 }}>
                      {diff===null?"—":(parseFloat(diff)>0?"+":"")+diff+"%"}
                    </td>
                    <td style={{ textAlign:"center" }}>
                      <span className={`ns-badge ${fav?"green":"red"}`}>{fav?"On Track":"✗ Watch"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
 
      {/* Score breakdown if available */}
      {(reportData?.scoreBreakdown||[]).length > 0 && (
        <div className="ns-panel">
          <div className="ns-panel-header"><h3>Financial Health Score — Breakdown</h3>
            <span className="ns-badge blue">{reportData.score||reportData.healthScore||"—"}/100</span>
          </div>
          <table className="ns-table">
            <thead><tr><th>Category</th><th className="right">Score</th><th>Comment</th></tr></thead>
            <tbody>
              {reportData.scoreBreakdown.map((s,i) => (
                <tr key={i} className="striped">
                  <td className="bold">{s.label}</td>
                  <td className="right mono" style={{ color:parseInt(s.score)>=70?C.green:parseInt(s.score)>=50?C.amber:C.red, fontWeight:800 }}>{s.score}</td>
                  <td className="muted">{s.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
 
 
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
 
function CashFlow({ reportData, client, kpis }) {
  const pack = normalizePack(client?.client_pack || client?.clientPack);
 
  // ── Shared tooltip ──────────────────────────────────────────────────────────
  const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:16,
        padding:"10px 14px", fontFamily:F, boxShadow:"0 8px 30px rgba(37,99,235,0.10)" }}>
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
    <div style={{ display:"grid", gap:12, marginBottom:20 }} className="cf-kpi">
      {items.map((k,i) => (
        <Card key={i} style={{ padding:"14px 16px" }}>
          <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.muted,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{k.label}</div>
          <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:k.color||C.text, lineHeight:1.2 }}>{k.value}</div>
          {k.sub && (
            <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:4, display:"flex", alignItems:"center", gap:3 }}>
              {k.trend && (
                <span style={{ color:k.trend==="up"?C.green:k.trend==="down"?C.red:C.muted, fontWeight:700 }}>
                  {k.trend==="up"?"↑":k.trend==="down"?"↓":""}
                </span>
              )}
              {k.sub}
            </div>
          )}
        </Card>
      ))}
      <style>{`.cf-kpi{grid-template-columns:repeat(4,1fr)!important}@media(max-width:500px){.cf-kpi{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
 
  // ── FIXED: Garima note — always shown at top, unique forward-looking insight ──
  const GarimaNoteCF = ({ note }) => (
    <Card style={{ marginBottom:14, background:"#FFFBF0", border:"1px solid #FDE68A", borderLeft:`4px solid #F59E0B` }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#F59E0B,#D97706)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:F, fontWeight:800, fontSize:15, color:"white" }}>G</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.warning, marginBottom:2 }}>
            Note from Garima — Cash Flow Forecast
          </div>
          <div style={{ fontFamily:F, fontSize:11, color:"#B45309", marginBottom:8 }}>
            Forward-looking cash position · {reportData?.monthLabel || "Current Period"}
          </div>
          <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.85, margin:"0 0 10px" }}>{note}</p>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#25D366",
              color:"white", borderRadius:16, padding:"7px 14px", fontFamily:F,
              fontWeight:700, fontSize:12, textDecoration:"none" }}>
            WhatsApp Garima
          </a>
        </div>
      </div>
    </Card>
  );
 
  // ── Garima note defaults — FIXED: forward-looking only, no historical repeat ──
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
    // FIXED: title now says "Cash Flow Forecast" — clearly future-focused
    return (
      <div className="ns-page">
        {/* FIXED: Garima note at very top — forward-looking insight, not in Overview */}
        <GarimaNoteCF note={reportData?.cashflowNote || reportData?.packNote || garimaDefaults.startup}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Projected runway, burn rate and 6-month cash forecast — forward-looking only">Cash Flow Forecast</SectionTitle>
          <button
            onClick={async () => {
              const w = window.open("","_blank");
              const { generateCashPDF } = await _pdfMod;
              const html = generateCashPDF({ client, reportData, kpis });
              w.document.write(html); w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:16, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`,
              color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            <i className="ti ti-download" style={{fontSize:13}}/> Download Cash Report
          </button>
        </div>
 
        <KpiBar items={[
          { label:"Current Cash",  value:"₹2.1 Cr", color:C.blue,   bg:"#EEF3FE", sub:"▼ vs ₹2.6 Cr last month", trend:"down" },
          { label:"Monthly Burn",  value:"₹48L/mo", color:C.purple, bg:"#F3EFFF", sub:"▲ Improved from ₹52L", trend:"up" },
          { label:"Runway",        value:"4.4 mo",  color:C.red,    bg:"#FEF2F2", border:`${C.red}30`, sub:" Below 6 months", trend:"down" },
          { label:"Mar Forecast",  value: nextForecast ? `₹${nextForecast.forecast}L` : "₹175L", color:C.muted, bg:C.bg, sub:"Next month cash" },
        ]}/>
 
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:4 }}>
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
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:14 }}>
            Monthly Cash Movement — Feb 2026
          </div>
          {[
            { label:"Opening Balance",       value:"₹2.4 Cr",  color:C.text,   bold:true },
            { label:"+ Collections received",value:"+₹81.8L",  color:C.green  },
            { label:"− Payroll & benefits",  value:"−₹28.4L",  color:C.red    },
            { label:"− Vendor payments",     value:"−₹22.1L",  color:C.red    },
            { label:"− Advance tax (Q4)",    value:"−₹11.6L",  color:C.red    },
            { label:"− Other opex",          value:"−₹9.3L",   color:C.red    },
            { label:"Closing Balance",        value:"₹2.1 Cr",  color:C.blue,   bold:true },
          ].map((r,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              borderBottom:i<6?`1px solid ${C.border}`:"none",
              background:r.bold?`${C.blue}04`:"transparent", margin:r.bold?"0 -4px":"0", padding:r.bold?"9px 4px":"9px 0" }}>
              <span style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:r.bold?700:400 }}>{r.label}</span>
              <span style={{ fontFamily:FM, fontSize:18, fontWeight:600, color:r.color }}>{r.value}</span>
            </div>
          ))}
        </Card>
 
        {/* Inflow vs Outflow bar chart */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:4 }}>
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
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
            Working Capital Positions — {reportData?.monthLabel || "Current Month"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf-s">
            {[
              { label:"Debtors (AR)",   value: reportData?.debtors   || "₹38.4L", days: reportData?.debtorDays   || "—", color:C.blue,   flag: !!(reportData?.debtorDays  && parseInt(reportData.debtorDays)>30),  note: reportData?.debtorDays  ? `${reportData.debtorDays} debtor days` : "Target: <30 days" },
              { label:"Creditors (AP)", value: reportData?.creditors  || "₹22.1L", days: reportData?.creditorDays || "—", color:C.purple, flag: false,                                                              note: reportData?.creditorDays ? `${reportData.creditorDays} creditor days` : "Well managed" },
              { label:"Inventory",      value: reportData?.inventory  || "—",       days: reportData?.inventoryDays|| "—", color:C.teal,   flag: false,                                                              note: "Stock on hand" },
            ].map((w,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:16,
                background: w.flag ? `${C.amber}08` : C.bg,
                border:`1px solid ${w.flag ? C.amber+"40" : C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:w.color }}>{w.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{w.label}</div>
                {w.days !== "—" && <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:w.color, marginTop:2 }}>{w.days}</div>}
                <div style={{ fontFamily:F, fontSize:10, color:w.flag?C.amber:C.green, marginTop:3 }}>
                  {w.flag ? "! " : "✓ "}{w.note}
                </div>
              </div>
            ))}
            <style>{`.wc-cf-s{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-cf-s{grid-template-columns:1fr!important}}`}</style>
          </div>
          {(reportData?.debtorDays || reportData?.creditorDays) && (
            <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.blue}06`, border:`1px solid ${C.blue}20` }}>
              <span style={{ fontFamily:F, fontSize:12, color:C.blue, fontWeight:600 }}>
                Cash Conversion Cycle: AR {reportData?.debtorDays || "—"} − AP {reportData?.creditorDays || "—"} + Inv {reportData?.inventoryDays || "—"} = <strong>{reportData?.ccc || "—"}</strong>
                {reportData?.ccc && parseInt(reportData.ccc) > 30 ? " — Above 30-day target" : " ✓"}
              </span>
            </div>
          )}
        </Card>
 
        {/* Burn Rate Analysis */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
            Burn Rate & Runway Analysis
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf-s">
            {[
              { label:"Gross Burn",    value: kpis?.find(k=>k.label?.toLowerCase().includes("burn"))?.value || "₹48L/mo",  color:C.red,   note:"Total monthly spend" },
              { label:"Net Burn",      value: kpis?.find(k=>k.label?.toLowerCase().includes("net"))?.value  || "₹31L/mo",  color:C.amber, note:"After revenue" },
              { label:"Runway",        value: kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value|| "4.4 mo",  color: (kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value && parseFloat(kpis.find(k=>k.label?.toLowerCase().includes("runway")).value) < 6) ? C.red : C.green, note: (kpis?.find(k=>k.label?.toLowerCase().includes("runway"))?.value && parseFloat(kpis.find(k=>k.label?.toLowerCase().includes("runway")).value) < 6) ? "⚠️ Below 6 months" : "✅ Healthy" },
            ].map((b,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:16, background:"#fff", border:`1px solid ${C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:b.color }}>{b.value}</div>
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
                borderRadius:16, background:m.flag?`${C.amber}08`:C.bg,
                border:`1px solid ${m.flag?C.amber+"25":C.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:m.flag?C.amber:C.green }}>{m.value}</div>
                </div>
                <div style={{ fontFamily:F, fontSize:10, color:C.dim, maxWidth:120, textAlign:"right", lineHeight:1.4 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </Card>
 
        {/* Cash Pressure Points */}
        {(reportData?.cashPressure1 || reportData?.cashPressure2) && (
          <Card style={{ marginBottom:14, borderLeft:`4px solid ${C.red}` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
              {"Upcoming Cash Pressure Points"}
            </div>
            {[reportData?.cashPressure1, reportData?.cashPressure2, reportData?.cashPressure3]
              .filter(Boolean)
              .map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  borderRadius:16, background:`${C.red}06`, border:`1px solid ${C.red}15`, marginBottom:8,
                  fontFamily:F, fontSize:13, color:C.text }}>
                  <span style={{ color:C.red }}>{"•"}</span>{p}
                </div>
            ))}
          </Card>
        )}
 
        <Card style={{ borderLeft:`4px solid ${C.amber}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
            Garima's Analysis
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
      <div className="ns-page">
        {/* FIXED: Garima note at top — forward-looking, not shown in Overview/Dashboard */}
        <GarimaNoteCF note={reportData?.cashflowNote || reportData?.packNote || garimaDefaults.msme}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Projected collections, payments and 6-month cash outlook — forward-looking only">Cash Flow Forecast</SectionTitle>
          <button
            onClick={async () => {
              const w = window.open("","_blank");
              const { generateCashPDF } = await _pdfMod;
              const html = generateCashPDF({ client, reportData, kpis });
              w.document.write(html); w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:16, background:`${C.teal}10`, border:`1.5px solid ${C.teal}25`,
              color:C.teal, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            <i className="ti ti-download" style={{fontSize:13}}/> Download Cash Report
          </button>
        </div>
 
        <KpiBar items={[
          { label:"Cash Inflows (Feb)",   value:"₹84L",    color:C.green,  bg:"#ECFDF5", sub:"▲ +6.1% vs Jan", trend:"up" },
          { label:"Cash Outflows (Feb)",  value:"₹67L",    color:C.red,    bg:"#FEF2F2", sub:"▼ −4.3% vs Jan", trend:"up" },
          { label:"Net Cash Flow",        value:"+₹17L",   color:C.blue,   bg:"#EEF3FE", sub:"Feb closing" },
          { label:"Cash Conv. Cycle",     value:"37 days", color:C.amber,  bg:"#FFFBEB", border:`${C.amber}30`, sub:" Target <30 days", trend:"down" },
        ]}/>
 
        {/* Inflow vs Outflow chart */}
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:4 }}>
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
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
            Working Capital Positions — Feb 2026
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }} className="wc-cf">
            {[
              { label:"Debtors (AR)",   value:"₹38.4L", days:"46 days", color:C.blue,   flag:true,  note:"Target: <30 days" },
              { label:"Creditors (AP)", value:"₹22.1L", days:"31 days", color:C.purple, flag:false, note:"Well managed" },
              { label:"Inventory",      value:"₹15.8L", days:"22 days", color:C.teal,   flag:false, note:"6.2x turnover" },
            ].map((w,i) => (
              <div key={i} style={{ padding:"14px 12px", borderRadius:16, background:w.flag?`${C.amber}08`:C.bg,
                border:`1px solid ${w.flag?C.amber+"40":C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:w.color }}>{w.value}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.text, fontWeight:600, marginTop:4 }}>{w.label}</div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:w.color, marginTop:2 }}>{w.days}</div>
                <div style={{ fontFamily:F, fontSize:10, color:w.flag?C.amber:C.green, marginTop:3 }}>{w.flag?"! ":"✓ "}{w.note}</div>
              </div>
            ))}
            <style>{`.wc-cf{grid-template-columns:1fr 1fr 1fr!important}@media(max-width:480px){.wc-cf{grid-template-columns:1fr!important}}`}</style>
          </div>
          <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
              Cash Conversion Cycle: AR 46 − AP 31 + Inv 22 = <strong>37 days</strong>. Every 1-day reduction in debtor days = ~₹2.8L freed up in cash.
            </span>
          </div>
        </Card>
 
        {/* March cash pressure */}
        <Card style={{ marginBottom:14, borderLeft:`4px solid ${C.red}` }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
            Cash Pressure Points
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
 
        <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
            Garima's Analysis
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
    <div className="ns-page">
        {/* FIXED: Garima note at top — forward-looking only, not in Overview/Dashboard */}
        <GarimaNoteCF note={reportData?.cashflowNote || reportData?.packNote || garimaDefaults.corporate}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <SectionTitle sub="Projected operating, investing and financing cash flows — forward-looking">Cash Flow Forecast</SectionTitle>
          <button
            onClick={async () => {
              const w = window.open("","_blank");
              const { generateCashPDF } = await _pdfMod;
              const html = generateCashPDF({ client, reportData, kpis });
              w.document.write(html); w.document.close();
              setTimeout(() => w.print(), 600);
            }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
              borderRadius:16, background:`${C.purple}10`, border:`1.5px solid ${C.purple}25`,
              color:C.purple, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            <i className="ti ti-download" style={{fontSize:13}}/> Download Cash Report
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
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:4 }}>
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
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
          EBITDA → Free Cash Flow Bridge — Feb 2026
        </div>
        {[
          { label:"EBITDA",                   value:"₹147L",  color:C.blue,   base:true  },
          { label:"− Interest paid",           value:"−₹22L",  color:C.red,    base:false },
          { label:"− Tax paid",                value:"−₹18L",  color:C.red,    base:false, note:"Q4 advance tax" },
          { label:"± Working capital changes", value:"+₹3L",   color:C.green,  base:false },
          { label:"= Operating Cash Flow",     value:"₹110L",  color:C.green,  base:true  },
          { label:"− Capex",                   value:"−₹7L",   color:C.red,    base:false },
          { label:"+ Asset disposal",          value:"+₹4L",   color:C.teal,   base:false },
          { label:"= Free Cash Flow",          value:"₹107L",  color:C.purple, base:true  },
        ].map((b,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"9px 12px", borderRadius:9, margin:"2px 0",
            background:b.base?`${b.color}10`:C.bg,
            border:`1px solid ${b.base?b.color+"30":C.border}` }}>
            <span style={{ fontFamily:F, fontSize:13, color:b.base?b.color:C.text, fontWeight:b.base?700:400 }}>
              {b.label}{b.note&&<span style={{ fontSize:11, color:C.dim, marginLeft:8 }}>({b.note})</span>}
            </span>
            <span style={{ fontFamily:F, fontSize:16, fontWeight:700, color:b.color }}>{b.value}</span>
          </div>
        ))}
      </Card>
 
      {/* Q1 forecast table */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
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
 
      <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
          Garima's Analysis
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
  useEffect(() => { if (actionsProp) setItems(actionsProp); }, [actionsProp]);
 
  const toggle = async (id) => {
    setItems(prev => prev.map(a => a.id===id ? {...a, done:!a.done} : a));
    try {
      const item = items.find(a => a.id === id);
      if (item && item.id && typeof item.id === "string") {
        await supabase.from("action_items").update({ done: !item.done }).eq("id", id);
      }
    } catch(e) {}
  };
 
  const pending  = items.filter(a => !a.done);
  const done     = items.filter(a => a.done);
  const high     = pending.filter(a => a.priority==="High");
  const med      = pending.filter(a => a.priority==="Medium");
  const low      = pending.filter(a => !a.priority || a.priority==="Low");
 
  const priorityColor = (p) => p==="High"?C.red:p==="Medium"?C.amber:C.green;
  const priorityBadge = (p) => p==="High"?"red":p==="Medium"?"amber":"green";
 
  return (
    <div className="ns-page">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div className="ns-page-title">Action Items</div>
        <div style={{ display:"flex", gap:8 }}>
          <span className="ns-badge red">{high.length} High</span>
          <span className="ns-badge amber">{med.length} Medium</span>
          <span className="ns-badge green">{low.length} Low</span>
          <span className="ns-badge blue">{done.length} Done</span>
        </div>
      </div>
 
      {/* Summary strip */}
      <div className="ns-grid-4">
        {[
          { label:"Total Pending",    value:pending.length, color:C.blue   },
          { label:"High Priority",    value:high.length,    color:C.red    },
          { label:"Due This Week",    value:pending.filter(a=>a.due).length, color:C.amber },
          { label:"Completed",        value:done.length,    color:C.green  },
        ].map((s,i) => (
          <div key={i} className="ns-kpi-tile" style={{  }}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
 
      {/* Pending actions table */}
      <div className="ns-panel">
        <div className="ns-panel-header">
          <h3>Pending Actions ({pending.length})</h3>
        </div>
        <div className="ns-panel-body no-pad">
          {pending.length === 0 ? (
            <EmptyState icon="ti-circle-check" title="All actions complete!" sub="Great work — no pending items right now."/>
          ) : (
            <table className="ns-table">
              <thead>
                <tr>
                  <th style={{ width:32 }}></th>
                  <th>Action</th>
                  <th>Category</th>
                  <th style={{ textAlign:"center" }}>Priority</th>
                  <th className="right">Due</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((a,i) => (
                  <tr key={a.id||i} className="striped" style={{ cursor:"pointer" }}
                    onClick={()=>toggle(a.id||i)}>
                    <td>
                      <div style={{ width:16, height:16, borderRadius:12,
                        border:`2px solid ${priorityColor(a.priority)}`,
                        background:"white", cursor:"pointer", flexShrink:0 }}/>
                    </td>
                    <td className="bold">{a.title||a.text||a.action}</td>
                    <td className="muted">{a.category||a.type||"—"}</td>
                    <td style={{ textAlign:"center" }}>
                      <span className={`ns-badge ${priorityBadge(a.priority)}`}>{a.priority||"Low"}</span>
                    </td>
                    <td className="right mono muted">{a.due||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
 
      {/* Completed actions */}
      {done.length > 0 && (
        <div className="ns-panel">
          <div className="ns-panel-header"><h3>Completed ({done.length})</h3></div>
          <table className="ns-table">
            <thead><tr><th style={{width:32}}></th><th>Action</th><th>Category</th><th className="right">Completed</th></tr></thead>
            <tbody>
              {done.map((a,i) => (
                <tr key={a.id||i} className="striped" style={{ opacity:0.6, cursor:"pointer" }}
                  onClick={()=>toggle(a.id||i)}>
                  <td><div style={{ width:16, height:16, borderRadius:12, background:C.green,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, color:"white", fontWeight:900 }}>✓</div></td>
                  <td style={{ textDecoration:"line-through", color:"#9CA3AF" }}>{a.title||a.text||a.action}</td>
                  <td className="muted">{a.category||"—"}</td>
                  <td className="right mono muted">{a.due||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
 
 
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
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:16, color:C.text, margin:"0 0 4px" }}>
              Overall: {reportData?.score || data.fundraiseScore}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {(parseInt(reportData?.score)||data.fundraiseScore) >= 75 ? "Series A ready" : (parseInt(reportData?.score)||data.fundraiseScore) >= 55 ? "⚠️ Almost there — a few gaps to close" : "🔴 Significant prep needed"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.fundraiseScore} color={C.blue} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(Array.isArray(reportData?.scoreBreakdown) && reportData.scoreBreakdown.some(s=>s.score) ? reportData.scoreBreakdown : data.fundraiseBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"140px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:12, background:"#fff", flex:1 }}>
                  <div style={{ height:"100%", borderRadius:12, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:152, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:152 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.blue, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:60,
                      border:`1px solid ${C.blue}40`, background:`${C.blue}08` }}>
                    Discuss with Garima →
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
              <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
                color: m.flag ? C.red : C.blue, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11,
                color: m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "! " : "✓ "}{m.note}
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
              borderRadius:12, background:d.done ? `${C.green}08` : "#FFFBEB",
              border:`1px solid ${d.done ? C.green+"25" : C.amber+"40"}` }}>
              <div style={{ width:20, height:20, borderRadius:16, flexShrink:0,
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
    <div className="ns-page">
      {/* Cash Health Score */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:20, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>Cash Flow Health Score</div>
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:16, color:C.text, margin:"0 0 4px" }}>
              Overall: {reportData?.score || data.cashHealth}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {(parseInt(reportData?.score)||data.cashHealth) >= 75 ? "Strong working capital position" : "⚠️ A few areas to tighten up"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.cashHealth} color={C.teal} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(reportData?.scoreBreakdown?.some(s=>s.score) ? reportData.scoreBreakdown : data.cashBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:12, background:"#fff" }}>
                  <div style={{ height:"100%", borderRadius:12, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:172, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:172 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.teal, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:60,
                      border:`1px solid ${C.teal}40`, background:`${C.teal}08` }}>
                    Discuss with Garima →
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
              <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
                color: m.flag ? C.red : C.teal, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "! " : "✓ "}{m.note}
              </div>
            </div>
          ))}
        </div>
      </Card>
 
      {/* Growth Metrics */}
      <Card style={{ marginBottom:20 }}>
        <SectionTitle sub="Growth and profitability indicators">Growth Metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {data.growth.map((m, i) => (
            <div key={i} style={{ padding:"14px 16px", borderRadius:12,
              background: m.flag ? "#FEF2F2" : C.bg, border:`1px solid ${m.flag ? C.red+"40" : C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
                <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                  {m.flag ? "! " : "✓ "}{m.note}
                </div>
              </div>
              <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
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
              <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
                color: m.flag ? C.red : C.teal, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontFamily:F, fontSize:11, color:m.flag ? C.red : C.green, fontWeight:600 }}>
                {m.flag ? "! " : "✓ "}{m.note}
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
              borderRadius:12, background:d.done ? `${C.green}08` : "#FFFBEB",
              border:`1px solid ${d.done ? C.green+"25" : C.amber+"40"}` }}>
              <div style={{ width:20, height:20, borderRadius:16, flexShrink:0,
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
    </div>
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
            <h3 style={{ fontFamily:F, fontWeight:800, fontSize:16, color:C.text, margin:"0 0 4px" }}>
              Preliminary: {data.ipoScore}/100
            </h3>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>
              {data.ipoScore >= 75 ? "Strong IPO foundation" : data.ipoScore >= 55 ? "Targeted prep required" : "🔴 Significant gaps to address"}
            </p>
          </div>
          <ScoreGauge score={parseInt(reportData?.score)||data.ipoScore} color={C.purple} size={100}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(reportData?.scoreBreakdown?.some(s=>s.score) ? reportData.scoreBreakdown : data.ipoBreakdown).map((item, i) => (
            <div key={i} style={{ marginBottom: item.score < 70 ? 12 : 8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"180px 1fr auto", gap:12, alignItems:"center" }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{item.label}</span>
                <div style={{ height:6, borderRadius:12, background:"#fff" }}>
                  <div style={{ height:"100%", borderRadius:12, width:`${item.score}%`,
                    background: item.score>=75 ? C.green : item.score>=55 ? C.amber : C.red,
                    transition:"width 0.8s ease" }}/>
                </div>
                <span style={{ fontFamily:FM, fontSize:11, color:C.muted, minWidth:28, textAlign:"right" }}>{item.score}</span>
              </div>
              {item.comment && (
                <div style={{ marginTop:4, marginLeft:192, fontSize:11, color:C.muted, fontFamily:F, lineHeight:1.5 }}>
                  {item.comment}
                </div>
              )}
              {item.score < 70 && (
                <div style={{ marginTop:6, marginLeft:192 }}>
                  <a href={WA} target="_blank" rel="noopener"
                    style={{ fontSize:11, fontWeight:700, color:C.purple, fontFamily:F,
                      textDecoration:"none", padding:"3px 10px", borderRadius:60,
                      border:`1px solid ${C.purple}40`, background:`${C.purple}08` }}>
                    Discuss with Garima →
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
              flexWrap:"wrap", gap:10, padding:"11px 14px", borderRadius:12,
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
const ARCHIVE = _archiveRaw; // "new" badge computed at render time
 
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
        padding:"10px 14px", borderRadius:16,
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
        borderLeft:`4px solid ${C.blue}`, marginBottom:12 }}>
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
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ width:38, height:38, borderRadius:16, background:((new Date()-new Date(p.uploadedAt))<35*24*60*60*1000)?`${C.blue}12`:`${C.muted}0A`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="ti ti-report-analytics" style={{ fontSize:18, color:((new Date()-new Date(p.uploadedAt))<35*24*60*60*1000)?C.blue:C.muted }}/>
          </div>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, display:"flex", alignItems:"center", gap:7 }}>
              {label} — {p.name} {((new Date()-new Date(p.uploadedAt))<35*24*60*60*1000) && <Badge color={C.blue}>New</Badge>}
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
            {showPreview ? "▲ Hide" : "Preview"}
          </button>
          {p.file_url ? (
            <button onClick={() => {
              if (p.file_url.startsWith("data:text/html")) {
                const win = window.open("", "_blank");
                if (win) { win.document.write(decodeURIComponent(p.file_url.replace("data:text/html;charset=utf-8,",""))); win.document.close(); }
              } else { window.open(p.file_url, "_blank"); }
            }} style={{ padding:"8px 18px", borderRadius:9, border:`1.5px solid ${C.blue}`,
                background:((new Date()-new Date(p.uploadedAt))<35*24*60*60*1000)?C.blue:"transparent", color:((new Date()-new Date(p.uploadedAt))<35*24*60*60*1000)?"white":C.blue,
                fontFamily:F, fontWeight:700, fontSize:12, cursor:"pointer",
                touchAction:"manipulation" }}>
              {p.file_url.startsWith("data:text/html") ? "View Report" : "↓ Download"}
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
      <span style={{ fontFamily:FM, fontSize:18, fontWeight:600, color:C.text }}>{value}</span>
      {pct && <span style={{ fontSize:11, fontWeight:700, color:trend==="up"?C.green:C.red, background:trend==="up"?"#ECFDF5":"#FEF2F2", padding:"2px 8px", borderRadius:60, fontFamily:F }}>{trend==="up"?"▲":"▼"} {pct}</span>}
    </div>
  </div>
);
 
const AgeingTable = ({ title, rows, color }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color, marginBottom:10 }}>{title}</div>
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
        <thead>
          <tr style={{ background:"#fff" }}>
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
 
        // Nifty removed — CORS blocked from browser
        let nifty = null, niftyChg = null;
 
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
                    note:"SBI lending = Repo + 2–3%",          emoji:"ti-building-bank" },
    m.nifty    && { label:"Nifty 50",       value:m.nifty,
                    color: m.niftyChg >= 0 ? C.green : C.red,
                    note: m.niftyChg ? `${m.niftyChg >= 0 ? "▲" : "▼"} ${Math.abs(m.niftyChg)}% today` : "Today",
                    emoji:"ti-trending-up" },
    (isCrossBorder || true) && m.usd && { label:"USD / INR", value:m.usd, color:C.purple,
                    note:"Live rate",                           icon:"ti-currency-dollar" },
    (isCrossBorder) && m.sar && { label:"SAR / INR", value:m.sar, color:C.teal,
                    note:"Saudi Riyal",                         icon:"ti-map-pin" },
    (isCrossBorder) && m.aed && { label:"AED / INR", value:m.aed, color:C.amber,
                    note:"UAE Dirham",                          icon:"ti-map-pin" },
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
          <div key={i} style={{ padding:"12px 14px", borderRadius:16,
            background:`${item.color}08`, border:`1px solid ${item.color}18` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <i className={"ti " + (item.icon||"ti-circle")} style={{fontSize:14}}/>
              <span style={{ fontFamily:F, fontSize:10, color:C.muted, fontWeight:600,
                textTransform:"uppercase", letterSpacing:"0.05em" }}>{item.label}</span>
            </div>
            <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:item.color }}>
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
  const pack  = normalizePack(client?.client_pack || client?.clientPack);
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
    <div className="ns-page">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:4 }}>
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
              sub:`SBI lending ~${(parseFloat(m.repo)+2.5).toFixed(2)}%`, color:C.blue,  emoji:"ti-building-bank" },
            m.nifty && { label:"Nifty 50",      value:m.nifty,
              sub: m.niftyChg ? `${parseFloat(m.niftyChg)>=0?"▲":"▼"} ${Math.abs(m.niftyChg)}% today` : "Live",
              color:parseFloat(m.niftyChg)>=0?C.green:C.red, emoji:"ti-trending-up" },
            m.usd   && { label:"USD / INR",      value:m.usd,   sub:"Live rate", color:C.purple,icon:"ti-currency-dollar" },
            m.sar   && { label:"SAR / INR",       value:m.sar,   sub:"Saudi Riyal",color:C.teal, icon:"ti-map-pin" },
          ].filter(Boolean).map((item,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:16,
              background:`${item.color}08`, border:`1px solid ${item.color}18` }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                <i className={"ti " + (item.icon||"ti-circle")} style={{fontSize:14}}/>
                <span style={{ fontFamily:F, fontSize:10, color:C.muted, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.05em" }}>{item.label}</span>
              </div>
              <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.color }}>{item.value}</div>
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
            <div key={i} style={{ padding:"12px 14px", borderRadius:16,
              background:"#fff", border:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600,
                marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                {item.label}
              </div>
              <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.blue }}>
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
              padding:"10px 14px", borderRadius:16,
              background: item.priority==="high" ? `${C.red}06` : item.priority==="medium" ? `${C.amber}06` : C.bg2,
              border:`1px solid ${item.priority==="high"?C.red+"20":item.priority==="medium"?C.amber+"20":C.border}` }}>
              <div style={{ width:52, fontFamily:FM, fontSize:12, fontWeight:700,
                color: item.priority==="high"?C.red:item.priority==="medium"?C.amber:C.muted,
                flexShrink:0 }}>{item.date}</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.text, flex:1 }}>{item.item}</div>
              <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                color: item.priority==="high"?C.red:item.priority==="medium"?C.amber:C.green,
                background: item.priority==="high"?`${C.red}12`:item.priority==="medium"?`${C.amber}12`:`${C.green}12`,
                padding:"3px 10px", borderRadius:60, flexShrink:0 }}>
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
    : isDemo ? ARCHIVE : [];
 
  return archiveDocs;
}
 
// ─── PACK LAYOUT — sidebar on desktop, dropdown on mobile ─────────────────────
function PackLayout({ tab, setTab, groups, accent, children }) {
  const [open, setOpen] = React.useState(false);
  const allItems = groups.flatMap(g => g.items);
  const current  = allItems.find(t => t.id === tab);
  const dropRef  = React.useRef(null);
 
  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
 
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
 
      {/* ── Dropdown nav — always shown ── */}
      <div style={{ padding:"8px 16px", background:"white",
        borderBottom:"1px solid #E5E7EB", display:"flex", alignItems:"center", gap:20 }}>
        <div ref={dropRef} style={{ position:"relative", maxWidth:320 }}>
 
          {/* Trigger button */}
          <button onClick={() => setOpen(o => !o)} style={{
            width:"100%", padding:"10px 14px", borderRadius:16,
            border:`1.5px solid ${open ? accent : "#E5E7EB"}`,
            background:"white", display:"flex", alignItems:"center",
            justifyContent:"space-between", cursor:"pointer",
            fontFamily:F, boxShadow: open ? `0 0 0 3px ${accent}20` : "none",
            transition:"all 0.15s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}><i className={"ti " + (current?.emoji||"ti-circle")} style={{fontSize:14}}/></span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.dim,
                  textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1 }}>
                  {groups.find(g => g.items.some(t => t.id === tab))?.label}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, marginTop:2 }}>
                  {current?.label}
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
 
          {/* Dropdown panel */}
          {open && (
            <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:200,
              background:"white", borderRadius:16, border:`1px solid #E5E7EB`,
              boxShadow:"0 4px 20px rgba(0,0,0,0.12)", overflow:"hidden", minWidth:260 }}>
              {groups.map((g, gi) => (
                <div key={gi}>
                  <div style={{ padding:"9px 14px 5px", fontSize:10, fontWeight:700,
                    color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em",
                    background:"#fff", borderBottom:"1px solid #F3F4F6" }}>
                    {g.label}
                  </div>
                  {g.items.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setOpen(false); }}
                      style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                        padding:"10px 14px", border:"none",
                        background: tab===t.id ? `${accent}10` : "white",
                        borderLeft: tab===t.id ? `3px solid ${accent}` : "3px solid transparent",
                        cursor:"pointer", fontFamily:F, textAlign:"left",
                        transition:"background 0.1s" }}
                      onMouseEnter={e => { if(tab!==t.id) e.currentTarget.style.background="#F9FAFB"; }}
                      onMouseLeave={e => { if(tab!==t.id) e.currentTarget.style.background="white"; }}>
                      <span style={{ fontSize:15, opacity: tab===t.id ? 1 : 0.65 }}><i className={"ti " + (t.emoji||"ti-circle")} style={{fontSize:13}}/></span>
                      <span style={{ fontSize:13, fontWeight: tab===t.id ? 700 : 500,
                        color: tab===t.id ? accent : "#374151" }}>{t.label}</span>
                      {tab===t.id && (
                        <svg style={{ marginLeft:"auto" }} width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  {gi < groups.length-1 && <div style={{ borderTop:"1px solid #F3F4F6" }}/>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* ── Content area ── */}
      <div style={{ padding:"20px 20px 32px" }}>
        {children}
      </div>
    </div>
  );
}
 
const CFO_PACK_DATA = {
  startup: {
    label: "Starter Pack",
    icon: "rev",
    color: C.blue,
    bg: "#EEF3FE",
    grad: "linear-gradient(135deg,#3B6FF7,#7C5CF5)",
    tagline: "Fundraise-ready financials for your next round",
    fundraiseScore: 74,
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
      { label:"Burn Multiple",value:"1.2x",      flag:false, note:"Improved — target <1.5x ✅" },
      { label:"CAC Payback",  value:"8 mo",      flag:false, note:"Down from 18mo — healthy ✅" },
      { label:"NRR",          value:"112%",      flag:false, note:"Expansion revenue positive ✅" },
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
    garimaNote: "Your NRR at 112% is the single strongest metric in your deck — it tells investors that customers are expanding, not just renewing. Lead every investor conversation with this. The burn multiple at 1.2x is excellent and has improved from 1.8x six months ago — make sure this trend is visible in your deck. The one gap to address before serious investor conversations: unit economics by cohort. Most Series A investors will ask for a 12-month LTV/CAC by acquisition channel — let's build this together. CAC payback at 8 months is already strong; we just need to show it cleanly. I'd suggest scheduling a 2-hour working session this month to finalise the deck before you start outreach in May.",
  },
  msme: {
    label: "Growth Pack",
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
    garimaNote: "Working capital is healthy overall but the debtor concentration is your biggest risk right now — your top 3 clients represent 64% of accounts receivable. If any one of them delays payment, it cascades into a cash crunch during advance tax weeks. I've flagged Client B's ₹4.8L (90+ days) as Priority 1 this month. On the positive side: your creditor days at 52 are very well managed — that discipline is protecting your cash flow. For Q1 focus: reduce debtor days from 38 to under 30, and the cash conversion cycle improves automatically. The SBI FD renewal on 15 March is also time-sensitive — let's lock in 7.1% before any RBI rate action.",
  },
  corporate: {
    label: "Premium Pack",
    icon: "users",
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
    garimaNote: "The IPO readiness score of 58 reflects real gaps — but they're all fixable within 6 months if we move now. The two Ind AS items (116 and 109) should be your immediate priority: commission a Big 4 firm to run the restatement project in parallel with your Q1 close. This typically takes 8–10 weeks. The governance gap (independent director) takes longer — start the search now, not after you've engaged bankers. On the positive side: EBITDA margin at 17.5% and ROCE at 22.4% are genuinely strong metrics that will resonate with QIBs. Revenue scale at ₹85 Cr is approaching the ₹100 Cr threshold that makes the IPO story cleaner. One more quarter like February and we're there.",
  },
};
 
function MSMEPackContent({ reportData, kpis, client }) {
  const [tab, setTab] = useState("monthly");
  const data = CFO_PACK_DATA.msme;
 
  // Grouped nav — cleaner than 11 pills in a row
  const groups = [
    {
      label: "Financial Reports",
      items: [
        { id:"monthly",    emoji:"ti-chart-bar",  label:"Monthly Report"    },
        { id:"variance",   emoji:"ti-trending-down", label:"Variance Analysis" },
        { id:"verticalpnl",emoji:"ti-trending-up",        label:"Vertical P&L"      },
      ]
    },
    {
      label: "Cash & Working Capital",
      items: [
        { id:"cash",       emoji:"ti-currency-rupee",   label:"Cash Health"       },
        { id:"workingcap", emoji:"ti-chart-bar",  label:"Working Capital"   },
        { id:"fundutil",   emoji:"ti-building-bank",   label:"Fund Utilisation"  },
      ]
    },
    {
      label: "Strategy & Planning",
      items: [
        { id:"scenario",   emoji:"ti-target",   label:"Scenarios"         },
        { id:"bizintel",   emoji:"ti-world",         label:"BI Analysis"       },
        { id:"spend",      emoji:"ti-chart-bar",  label:"Spend Intel"       },
        { id:"bankfin",    emoji:"ti-building-bank",       label:"Bank Finance"      },
      ]
    },
    {
      label: "Documents",
      items: [
        { id:"packs",      emoji:"ti-folder",  label:"Previous Packs"    },
      ]
    },
  ];

  const archiveDocs = useLiveDocs(client);

  return (
    <PackLayout tab={tab} setTab={setTab} groups={groups} accent={C.teal}>
      <div>
 
      {tab === "monthly" && (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {(reportData?.reportNote || reportData?.packNote) && (
        <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>Note from Garima</div>
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
        {(function() {
          var pl = reportData?.pl;
          var hasLive = pl && Object.values(pl).some(v => v?.actual);
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
        }())}
      </Card>
 
      {reportData?.metrics?.some(m => m.value) && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Working Capital Analysis</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }} className="wc-g">
            {reportData.metrics.filter(m => m.value).map((m,i) => (
              <div key={i} style={{ padding:"14px 10px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}`, textAlign:"center" }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:C.teal }}>{m.value}</div>
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
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>Compliance Due Date Calendar — March 2026</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {COMPLIANCE_DATES.map((c,i) => {
            const [col,bg] = c.status==="critical"?[C.red,"#FEF2F2"]:c.status==="due-soon"?[C.amber,"#FFFBEB"]:[C.blue,"#EEF3FE"];
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:16, background:bg, border:`1px solid ${col}22` }}>
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
          {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="Growth Pack"/>)}
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
                          <span style={{ padding:"3px 8px", borderRadius:60, fontSize:10, fontWeight:700,
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
              <Card style={{ borderLeft:`3px solid ${C.teal}` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>Commentary</div>
                {reportData.varianceCommentary.filter(v => v.item).map((v,i,arr) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ width:8, height:8, borderRadius:60, background:v.favorable?C.green:C.red, flexShrink:0, marginTop:6 }}/>
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
              <div style={{ fontSize:36, marginBottom:12 }}>—</div>
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
                borderRadius:16, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              Discuss cash health with Garima
            </a>
          </div>
          {(reportData?.cashflowNote || reportData?.packNote) && (
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"Garima's Cash Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData?.cashflowNote || reportData?.packNote}
              </p>
            </Card>
          )}
        </div>
      )}
 
            {tab === "workingcap" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:16,
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
                <div key={i} style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:item.color }}>{item.label}</div>
              ) : (
                <div key={i} style={{ padding:"12px 16px", borderRadius:16, textAlign:"center",
                  background: item.bad ? `${C.amber}08` : `${item.color}08`,
                  border:`1px solid ${item.bad ? C.amber+"30" : item.color+"20"}` }}>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.color }}>{item.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:3 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 14px", borderRadius:16,
              background: parseInt(reportData?.ccc||"37")<=30 ? `${C.green}08` : `${C.amber}08`,
              border:`1px solid ${parseInt(reportData?.ccc||"37")<=30 ? C.green+"20" : C.amber+"25"}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:600,
                color: parseInt(reportData?.ccc||"37")<=30 ? C.green : C.amber }}>
                {parseInt(reportData?.ccc||"37") <= 30
                  ? `CCC at ${reportData?.ccc||"37 days"} — within target. Every additional day saved frees up approx. ${reportData?.cccCashImpact || "₹2.8L"} in working capital.`
                  : `CCC at — above target. ${reportData?.ccc||"37 days"} — above 30-day target. Reducing debtor days by 5 would free up approx. ${reportData?.cccCashImpact || "₹2.8L"} in cash immediately.`}
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
                  borderRadius:16, background:"#fff", border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:row.color, flexShrink:0 }}/>
                  <div style={{ width:90, fontFamily:F, fontSize:12, color:C.muted, fontWeight:600 }}>{row.band}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:row.color, width:70 }}>{row.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim,
                    background:C.bg, padding:"2px 8px", borderRadius:60, marginRight:8 }}>{row.pct}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, flex:1, lineHeight:1.4 }}>{row.action}</div>
                </div>
              ))}
            </div>
            {reportData?.arNote && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:16,
                background:`${C.amber}06`, border:`1px solid ${C.amber}20`,
                fontFamily:F, fontSize:12, color:C.text, lineHeight:1.6 }}>
                {reportData.arNote}
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[
                { label:"Current Ratio",        value: reportData?.currentRatio || "1.62x", benchmark: reportData?.benchCurrentRatio || "Sector avg: 1.5–2.0x", target:1.5, actual: parseFloat(reportData?.currentRatio||"1.62"), higher:true  },
                { label:"Quick Ratio",           value: reportData?.quickRatio   || "1.18x", benchmark: reportData?.benchQuickRatio   || "Target: >1.0x",         target:1.0, actual: parseFloat(reportData?.quickRatio||"1.18"),   higher:true  },
                { label:"Inventory Turnover",    value: reportData?.invTurnover  || "6.2x",  benchmark: reportData?.benchInvTurnover  || "MSME avg: 4–8x",         target:4,   actual: parseFloat(reportData?.invTurnover||"6.2"),   higher:true  },
                { label:"Debtor Turnover",       value: reportData?.debtorTurn   || "7.8x",  benchmark: reportData?.benchDebtorTurn   || "Target: >10x",           target:10,  actual: parseFloat(reportData?.debtorTurn||"7.8"),    higher:true  },
              ].map((r, i) => {
                const good = r.higher ? r.actual >= r.target : r.actual <= r.target;
                return (
                  <div key={i} style={{ padding:"14px", borderRadius:16,
                    background: good ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${good ? C.green+"20" : C.amber+"25"}` }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                    <div style={{ fontFamily:F, fontSize:16, fontWeight:700,
                      color: good ? C.green : C.amber, marginBottom:4 }}>{r.value}</div>
                    <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5, marginBottom:4 }}>{r.benchmark}</div>
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color: good ? C.green : C.amber }}>
                      {good ? "Within benchmark" : "Below benchmark"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
 
          {/* Garima's working capital note */}
          {reportData?.wcNote && (
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.teal,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                {"Garima's Working Capital Assessment"}
              </div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>
                {reportData.wcNote}
              </p>
            </Card>
          )}
        </div>
      )}
 
      {tab === "bankfin" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:16,
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
                <div style={{ fontFamily:FM, fontWeight:700, fontSize:22, color:C.blue, lineHeight:1 }}>
                  {reportData?.loanScore || "—"}
                  <span style={{ fontSize:14, color:C.muted, fontWeight:500 }}>{"/100"}</span>
                </div>
                <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
                  {!reportData?.loanScore ? "Score not yet assessed by Garima" :
                    parseInt(reportData.loanScore) >= 75 ? "Strong — eligible for most MSME schemes" :
                    parseInt(reportData.loanScore) >= 55 ? "Moderate — eligible with preparation" :
                    "Early stage — address key gaps first"}
                </div>
              </div>
              {reportData?.loanScore && <ScoreGauge score={parseInt(reportData.loanScore)} color={C.blue} size={90}/>}
            </div>
            {reportData?.loanScore && (
              <div style={{ height:8, borderRadius:12, background:"#fff" }}>
                <div style={{ height:"100%", borderRadius:12, width:`${reportData.loanScore}%`,
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[
                { label:"DSCR",               value:reportData?.dscr,             benchmark:"Must be >1.25x for approval",   what:"Can operating income service the loan EMI?",    good: reportData?.dscr ? parseFloat(reportData.dscr)>=1.25 : null },
                { label:"Interest Coverage",  value:reportData?.interestCoverage, benchmark:"Banks want >3x",                 what:"EBIT ÷ interest — can you service existing debt?", good: reportData?.interestCoverage ? parseFloat(reportData.interestCoverage)>=3 : null },
                { label:"Current Ratio",      value:reportData?.currentRatio,     benchmark:"Minimum 1.33x for working capital",what:"Short-term assets vs liabilities",              good: reportData?.currentRatio ? parseFloat(reportData.currentRatio)>=1.33 : null },
                { label:"Debt / EBITDA",      value:reportData?.debtEbitda,       benchmark:"Banks prefer <4x for MSMEs",     what:"How many years of earnings to repay debt",      good: reportData?.debtEbitda ? parseFloat(reportData.debtEbitda)<=4 : null },
              ].map((r, i) => (
                <div key={i} style={{ padding:"16px", borderRadius:16,
                  background: r.good===true ? `${C.green}06` : r.good===false ? `${C.red}06` : C.bg2,
                  border:`1px solid ${r.good===true?C.green+"20":r.good===false?C.red+"20":C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, marginBottom:4,
                    color: r.good===true?C.green:r.good===false?C.red:C.dim }}>{r.value || "Not assessed"}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.blue, marginBottom:6, lineHeight:1.4 }}>{r.benchmark}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.4, marginBottom: r.good!==null?6:0 }}>{r.what}</div>
                  {r.good !== null && (
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700,
                      color:r.good?C.green:C.red, background:r.good?`${C.green}10`:`${C.red}08`,
                      padding:"3px 10px", borderRadius:60, display:"inline-block" }}>
                      {r.good ? "Meets threshold" : "Below requirement"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
 
          {/* Auto-flagged issues */}
          {(function() {
            var flags = [];
            if (reportData?.dscr && parseFloat(reportData.dscr)<1.25) flags.push({ text:`DSCR of ${reportData.dscr} is below the 1.25x minimum — banks will reject the application. Increase operating income or reduce existing debt first.`, severity:"high" });
            if (reportData?.currentRatio && parseFloat(reportData.currentRatio)<1.33) flags.push({ text:`Current Ratio of ${reportData.currentRatio} is below 1.33x — the minimum for working capital loans. Reduce short-term liabilities or increase current assets.`, severity:"high" });
            if (reportData?.debtEbitda && parseFloat(reportData.debtEbitda)>4) flags.push({ text:`Debt/EBITDA of ${reportData.debtEbitda} is high for an MSME. Banks may cap the loan amount or require additional collateral.`, severity:"medium" });
            if (reportData?.interestCoverage && parseFloat(reportData.interestCoverage)<3) flags.push({ text:`Interest Coverage of ${reportData.interestCoverage} is below 3x. Lenders will question repayment comfort — focus on improving EBITDA.`, severity:"medium" });
            return flags.length > 0 ? (
              <Card style={{ borderLeft:`4px solid ${C.red}`, background:`${C.red}04` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.red, marginBottom:12 }}>
                  {"Issues to Fix Before Applying"}
                </div>
                {flags.map((f, i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px",
                    borderRadius:16, background:"rgba(255,255,255,0.6)", marginBottom:8,
                    border:`1px solid ${f.severity==="high"?C.red+"20":C.amber+"20"}` }}>
                    <span style={{ color:f.severity==="high"?C.red:C.amber, flexShrink:0 }}>{"•"}</span>
                    <span style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.6 }}>{f.text}</span>
                  </div>
                ))}
              </Card>
            ) : reportData?.dscr ? (
              <Card style={{ borderLeft:`4px solid ${C.green}`, background:`${C.green}04` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.green }}>
                  {"All key ratios within bank thresholds — you're ready to apply"}
                </div>
              </Card>
            ) : null;
          }())}
 
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
                padding:"12px 14px", borderRadius:16, marginBottom:8,
                background:"#fff", border:`1px solid ${s.hot?s.color+"25":C.border}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{s.name}</span>
                    {s.hot && <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:s.color, background:`${s.color}15`, padding:"2px 8px", borderRadius:60 }}>{"RECOMMENDED"}</span>}
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
                  borderRadius:16, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                  color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
                {"WhatsApp Garima"}
              </a>
              <button onClick={async () => { const w=window.open("","_blank"); const { generateLoanPDF } = await _pdfMod; const html = generateLoanPDF({ client, reportData, kpis }); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px",
                  borderRadius:16, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`,
                  color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {"Download Finance Report"}
              </button>
            </div>
          </Card>
 
        </div>
      )}
 
      {tab === "fundutil" && <FundUtilisation reportData={reportData} accentColor={C.teal}/>}
      {tab === "verticalpnl" && <VerticalPnL reportData={reportData} accentColor={C.teal}/>}
      {tab === "scenario" && <ScenarioModelling reportData={reportData} accentColor={C.teal} client={client}/>}
      {tab === "spend" && <SpendIntelligence reportData={reportData} accentColor={C.teal} client={client}/> }
      {tab === "bizintel" && <BusinessIntelligence reportData={reportData} accentColor={C.teal} client={client}/>}
 
      {tab === "packs" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="Growth Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.teal}06`, borderColor:`${C.teal}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
              Questions?{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
            </div>
          </Card>
        </div>
      )}
      </div>
    </PackLayout>
  );
}
 
function CorporatePackContent({ reportData, kpis, client }) {
  const [tab, setTab] = useState("monthly");
 
  const groups = [
    {
      label: "Financial Reports",
      items: [
        { id:"monthly",    emoji:"ti-chart-bar",  label:"Monthly Report"    },
        { id:"variance",   emoji:"ti-trending-down", label:"Variance Analysis" },
        { id:"verticalpnl",emoji:"ti-trending-up",        label:"Vertical P&L"      },
      ]
    },
    {
      label: "Cash & Working Capital",
      items: [
        { id:"workingcap", emoji:"ti-chart-bar", label:"Working Capital"   },
      ]
    },
    {
      label: "Governance & Growth",
      items: [
        { id:"governance", emoji:"ti-scale",  label:"Board Governance"  },
        { id:"ipo",        emoji:"ti-building-bank",       label:"IPO Readiness"     },
        { id:"fundutil",   emoji:"ti-building-bank",   label:"Fund Utilisation"  },
      ]
    },
    {
      label: "Strategy & Planning",
      items: [
        { id:"scenario",   emoji:"ti-target",   label:"Scenarios"         },
        { id:"bizintel",   emoji:"ti-world",         label:"BI Analysis"       },
        { id:"spend",      emoji:"ti-chart-bar",  label:"Spend Intel"       },
      ]
    },
    {
      label: "Documents",
      items: [
        { id:"packs",      emoji:"ti-folder",  label:"Previous Packs"    },
      ]
    },
  ];
 
  const archiveDocs = useLiveDocs(client);
 
  return (
    <PackLayout tab={tab} setTab={setTab} groups={groups} accent={C.purple}>
      <div>
 
      {tab === "monthly" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          <div style={{ padding:"16px 20px", borderRadius:16,
            background:`linear-gradient(135deg,${C.purple}10,${C.blue}06)`,
            border:`1px solid ${C.purple}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Corporate Report"}{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
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
              <div key={i} style={{ padding:"14px", borderRadius:16,
                background:`${k.color}08`, border:`1px solid ${k.color}20`, textAlign:"center" }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:k.color }}>{k.value}</div>
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
 
          <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
              {"Garima's Board Commentary"}
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
                      borderRadius:16, background:"#fff", border:`1px solid ${C.border}`,
                      alignItems:"flex-start" }}>
                      <span style={{ fontFamily:FM, fontWeight:800, color:C.purple,
                        background:`${C.purple}12`, borderRadius:16, padding:"2px 8px",
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

      {tab === "workingcap" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <div style={{ padding:"16px 20px", borderRadius:16,
            background:`linear-gradient(135deg,${C.purple}10,${C.blue}06)`,
            border:`1px solid ${C.purple}20` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Are we collecting fast enough and paying smart?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"Working capital efficiency determines how much cash is trapped in operations vs available to use."}
            </div>
          </div>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Cash Conversion Cycle"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>{"Days your cash is tied up before you collect it back"}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {[
                { label:"Debtor Days",    value:reportData?.debtorDays   || "46",       color:C.blue,   bad:parseInt(reportData?.debtorDays||"46")>30 },
                { label:"−",             value:null, color:C.muted },
                { label:"Creditor Days",  value:reportData?.creditorDays  || "31",       color:C.purple, bad:false },
                { label:"+",             value:null, color:C.muted },
                { label:"Inventory Days", value:reportData?.inventoryDays || "22",       color:C.teal,   bad:false },
                { label:"=",             value:null, color:C.muted },
                { label:"CCC",            value:reportData?.ccc           || "37 days",  color:parseInt(reportData?.ccc||"37")<=30?C.green:C.amber, bad:parseInt(reportData?.ccc||"37")>30 },
              ].map((item, i) => item.value === null ? (
                <div key={i} style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:item.color }}>{item.label}</div>
              ) : (
                <div key={i} style={{ padding:"12px 16px", borderRadius:16, textAlign:"center",
                  background:item.bad?`${C.amber}08`:`${item.color}08`,
                  border:`1px solid ${item.bad?C.amber+"30":item.color+"20"}` }}>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.color }}>{item.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:3 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Debtors Aging — Who Owes What"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Money earned but not yet collected"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { band:"0–30 days",  value:reportData?.ar0to30  || "₹18.2L", pct:"47%", color:C.green, action:"On track — follow standard reminder cycle" },
                { band:"31–60 days", value:reportData?.ar31to60 || "₹12.4L", pct:"32%", color:C.amber, action:"Send formal reminder + confirm payment date" },
                { band:"61–90 days", value:reportData?.ar61to90 || "₹4.8L",  pct:"13%", color:C.red,   action:"Escalate to senior contact — consider credit hold" },
                { band:"90+ days",   value:reportData?.ar90plus || "₹2.9L",  pct:"8%",  color:C.red,   action:"Legal notice or write-off decision required" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                  borderRadius:16, background:"#fff", border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:row.color, flexShrink:0 }}/>
                  <div style={{ width:90, fontFamily:F, fontSize:12, color:C.muted, fontWeight:600 }}>{row.band}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:row.color, width:70 }}>{row.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim, background:C.bg, padding:"2px 8px", borderRadius:60, marginRight:8 }}>{row.pct}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, flex:1, lineHeight:1.4 }}>{row.action}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Working Capital Ratios vs Benchmarks"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"How your efficiency ratios compare to sector medians"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[
                { label:"Current Ratio",     value:reportData?.currentRatio || "1.62x", benchmark:reportData?.benchCurrentRatio || "Sector avg: 1.5–2.0x", target:1.5, actual:parseFloat(reportData?.currentRatio||"1.62"), higher:true },
                { label:"Quick Ratio",        value:reportData?.quickRatio   || "1.18x", benchmark:reportData?.benchQuickRatio   || "Target: >1.0x",         target:1.0, actual:parseFloat(reportData?.quickRatio||"1.18"),   higher:true },
                { label:"Inventory Turnover", value:reportData?.invTurnover  || "6.2x",  benchmark:reportData?.benchInvTurnover  || "Sector avg: 4–8x",       target:4,   actual:parseFloat(reportData?.invTurnover||"6.2"),   higher:true },
                { label:"Debtor Turnover",    value:reportData?.debtorTurn   || "7.8x",  benchmark:reportData?.benchDebtorTurn   || "Target: >10x",           target:10,  actual:parseFloat(reportData?.debtorTurn||"7.8"),    higher:true },
              ].map((r, i) => {
                const good = r.higher ? r.actual >= r.target : r.actual <= r.target;
                return (
                  <div key={i} style={{ padding:"14px", borderRadius:16,
                    background:good?`${C.green}06`:`${C.amber}06`,
                    border:`1px solid ${good?C.green+"20":C.amber+"25"}` }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                    <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:good?C.green:C.amber, marginBottom:4 }}>{r.value}</div>
                    <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5, marginBottom:4 }}>{r.benchmark}</div>
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:good?C.green:C.amber }}>{good?"Within benchmark":"Below benchmark"}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          {reportData?.wcNote && (
            <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{"Garima's Working Capital Assessment"}</div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>{reportData.wcNote}</p>
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
                          <span style={{ padding:"3px 8px", borderRadius:60, fontSize:10, fontWeight:700,
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
              <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>Commentary</div>
                {reportData.varianceCommentary.filter(v => v.item).map((v,i,arr) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ width:8, height:8, borderRadius:60, background:v.favorable?C.green:C.red, flexShrink:0, marginTop:6 }}/>
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
              <div style={{ fontSize:36, marginBottom:12 }}>—</div>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>Variance Analysis</div>
              <div style={{ fontFamily:F, fontSize:13, color:C.dim }}>Garima will update this with your variance data.</div>
            </Card>
          )}
        </div>
      )}
 
            {tab === "governance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          {/* Question this tab answers */}
          <div style={{ padding:"16px 20px", borderRadius:16,
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
                <div key={i} style={{ padding:"14px", borderRadius:16,
                  background: item.flag ? `${C.red}06` : C.bg2,
                  border:`1px solid ${item.flag ? C.red+"20" : C.border}`, textAlign:"center" }}>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.flag?C.red:item.color }}>{item.value}</div>
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
                    borderRadius:16,
                    background: isDone ? `${C.green}06` : isNA ? C.bg2 : `${C.amber}06`,
                    border:`1px solid ${isDone?C.green+"20":isNA?C.border:C.amber+"25"}` }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>
                      {isDone ? "✓" : isNA ? "—" : "○"}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:isDone?500:600 }}>{row.item}</div>
                      <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>{row.due}</div>
                    </div>
                    <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:isDone?C.green:isNA?C.muted:C.amber,
                      background:isDone?`${C.green}15`:isNA?C.bg:`${C.amber}15`,
                      padding:"3px 10px", borderRadius:60 }}>
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
                  <div key={i} style={{ padding:"12px", borderRadius:16,
                    background: ok ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${ok?C.green+"20":C.amber+"25"}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span style={{color:ok?C.green:C.amber}}>{ok?"✓":"!"}</span>
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
            <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.purple,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                {"Garima's Governance Assessment"}
              </div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>
                {reportData.governanceNote}
              </p>
            </Card>
          )}
        </div>
      )}
 
      {tab === "ipo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          <div style={{ padding:"16px 20px", borderRadius:16,
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
                    padding:"12px 14px", borderRadius:16,
                    background: done ? `${C.green}06` : `${C.amber}06`,
                    border:`1px solid ${done ? C.green+"20" : C.amber+"25"}` }}>
                    <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{done ? "✓" : "○"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600,
                        color: done ? C.text : C.text, marginBottom:3 }}>{item.gap}</div>
                      <div style={{ fontFamily:F, fontSize:11, color:C.dim, lineHeight:1.5 }}>{item.note}</div>
                    </div>
                    <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color: done ? C.green : C.amber,
                      background: done ? `${C.green}15` : `${C.amber}12`,
                      padding:"3px 10px", borderRadius:60, flexShrink:0 }}>
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
                  padding:"10px 14px", borderRadius:16, background:"#fff",
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
            <Card style={{ borderLeft:`4px solid ${C.purple}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"Garima's Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData?.ipoNote || reportData?.packNote || data.garimaNote}
              </p>
            </Card>
          )}
 
          <div style={{ textAlign:"center" }}>
            <a href={WA} target="_blank" rel="noopener"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px",
                borderRadius:16, background:`${C.purple}10`, border:`1.5px solid ${C.purple}30`,
                color:C.purple, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              {"Discuss IPO readiness with Garima"}
            </a>
          </div>
 
        </div>
      )}
 
      {tab === "fundutil" && <FundUtilisation reportData={reportData} accentColor={C.purple}/>}
      {tab === "verticalpnl" && <VerticalPnL reportData={reportData} accentColor={C.purple}/>}
      {tab === "scenario" && <ScenarioModelling reportData={reportData} accentColor={C.purple} client={client}/>}
      {tab === "spend" && <SpendIntelligence reportData={reportData} accentColor={C.purple} client={client}/>}
      {tab === "bizintel" && <BusinessIntelligence reportData={reportData} accentColor={C.purple} client={client}/>}
 
      {tab === "packs" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.7 }}>
            Monthly board packs prepared by Garima — updated by the 20th of each month.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="Premium Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.purple}06`, borderColor:`${C.purple}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>
              {" Questions? "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
            </div>
          </Card>
        </div>
      )}
      </div>
    </PackLayout>
  );
}
 
 
// ─── BUSINESS INTELLIGENCE ────────────────────────────────────────────────────
function BusinessIntelligence({ reportData, accentColor, client }) {
  const acc = accentColor || C.blue;
  const [view, setView] = React.useState("geography"); // geography | department
 
 
 
  // ── Parse helpers ──────────────────────────────────────────────────────────
  const parse = (val) => {
    if (!val) return 0;
    const s = String(val).replace(/[₹,\s]/g,"");
    let n = parseFloat(s); if (isNaN(n)) return 0;
    if (s.toLowerCase().includes("cr"))  n *= 10000000;
    else if (s.toLowerCase().includes("l")) n *= 100000;
    else if (s.toLowerCase().includes("k")) n *= 1000;
    return n;
  };
 
  const fmt = (n) => {
    if (!n && n !== 0) return "—";
    const abs = Math.abs(n), sign = n < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs/10000000).toFixed(1)}Cr`;
    if (abs >= 100000)   return `${sign}₹${(abs/100000).toFixed(1)}L`;
    if (abs >= 1000)     return `${sign}₹${(abs/1000).toFixed(0)}K`;
    return `${sign}₹${abs.toFixed(0)}`;
  };
 
  const pctDiff = (curr, prev) => {
    if (!prev || prev === 0) return null;
    return (((curr - prev) / Math.abs(prev)) * 100).toFixed(1);
  };
 
  // ── Pull from existing reportData ─────────────────────────────────────────
  const pl       = reportData?.pl || {};
  const variance = reportData?.variance || [];
  const metrics  = reportData?.metrics  || [];
  const benchmarks = reportData?.benchmarks || [];
  const cashflow = reportData?.cashflow || [];
 
  const rev      = parse(pl.revenue?.actual);
  const prevRev  = parse(pl.revenue?.prev);
  const cogs     = parse(pl.cogs?.actual);
  const gp       = parse(pl.grossProfit?.actual) || (rev - cogs);
  const ebitda   = parse(pl.ebitda?.actual);
  const pat      = parse(pl.pat?.actual);
  const prevEbitda = parse(pl.ebitda?.prev);
 
  const gpMargin     = rev > 0 ? ((gp / rev) * 100).toFixed(1)     : 0;
  const ebitdaMargin = rev > 0 ? ((ebitda / rev) * 100).toFixed(1) : 0;
  const patMargin    = rev > 0 ? ((pat / rev) * 100).toFixed(1)     : 0;
  const revGrowth    = pctDiff(rev, prevRev);
  const ebitdaGrowth = pctDiff(ebitda, prevEbitda);
 
  // ── Geography data from admin ─────────────────────────────────────────────
  const indiaRegions = [
    { name:"North", icon:"ti-map-pin", color:"#2563EB" },
    { name:"South", icon:"ti-map-pin", color:"#7C3AED" },
    { name:"West",  icon:"ti-map-pin", color:"#059669"  },
    { name:"East",  icon:"ti-map-pin", color:"#D97706"  },
    { name:"Metro", icon:"ti-map-pin", color:"#0891B2"  },
  ].map(r => ({...r,
    revenue: parse(reportData?.geoIndia?.[r.name]?.revenue),
    cost:    parse(reportData?.geoIndia?.[r.name]?.cost),
  })).filter(r => r.revenue > 0 || r.cost > 0);
 
  const globalRegions = [
    { name:"India",  icon:"ti-map-pin", color:"#FF6B35" },
    { name:"GCC",    icon:"ti-map-pin", color:"#2563EB" },
    { name:"USA",    icon:"ti-map-pin", color:"#7C3AED" },
    { name:"Europe", icon:"ti-map-pin", color:"#059669" },
    { name:"Other",  icon:"ti-map-pin", color:"#9CA3AF" },
  ].map(r => ({...r,
    revenue: parse(reportData?.geoGlobal?.[r.name]?.revenue),
    cost:    parse(reportData?.geoGlobal?.[r.name]?.cost),
  })).filter(r => r.revenue > 0 || r.cost > 0);
 
  // ── Department data from admin ────────────────────────────────────────────
  const deptList = [
    { name:"Sales",       icon:"ti-briefcase", color:"#2563EB" },
    { name:"Marketing",   icon:"ti-speakerphone", color:"#7C3AED" },
    { name:"Technology",  icon:"ti-device-laptop", color:"#059669"  },
    { name:"Operations",  icon:"settings", color:"#D97706"  },
    { name:"HR & Admin",  icon:"ti-users", color:"#EF4444"  },
    { name:"Finance",     emoji:"ti-chart-bar", color:"#0891B2"  },
  ].map(d => ({...d,
    revenue: parse(reportData?.depts?.[d.name]?.revenue),
    cost:    parse(reportData?.depts?.[d.name]?.cost),
    budget:  parse(reportData?.depts?.[d.name]?.budget),
  })).filter(d => d.revenue > 0 || d.cost > 0);
 
  // ── Auto-generate flags/insights from data ────────────────────────────────
  const flags = [];
  if (revGrowth !== null && parseFloat(revGrowth) < 0)
    flags.push({ type:"danger",  icon:"ti-alert-triangle", text:`Revenue declined ${Math.abs(revGrowth)}% vs last month` });
  if (revGrowth !== null && parseFloat(revGrowth) > 15)
    flags.push({ type:"success", icon:"ti-rocket", text:`Strong revenue growth of ${revGrowth}% MoM` });
  if (parseFloat(gpMargin) < 30)
    flags.push({ type:"warning", emoji:"ti-trending-down", text:`Gross margin at ${gpMargin}% — below healthy threshold of 30%` });
  if (parseFloat(ebitdaMargin) < 0)
    flags.push({ type:"danger",  icon:"ti-alert-circle", text:`EBITDA negative at ${ebitdaMargin}% — business burning cash at operating level` });
  if (ebitdaGrowth !== null && parseFloat(ebitdaGrowth) > 20)
    flags.push({ type:"success", icon:"ti-circle-check", text:`EBITDA improved ${ebitdaGrowth}% vs last month` });
 
  // Variance flags
  variance.forEach(v => {
    const budget = parse(v.budget), actual = parse(v.actual);
    if (!budget || !actual) return;
    const diff = ((actual - budget) / Math.abs(budget) * 100).toFixed(1);
    const unfav = v.fav ? actual < budget : actual > budget;
    if (unfav && Math.abs(diff) > 10)
      flags.push({ type:"warning", emoji:"ti-chart-bar", text:`${v.metric}: ${Math.abs(diff)}% ${unfav ? "below" : "above"} budget` });
  });
 
  // Dept flags
  deptList.forEach(d => {
    if (d.budget > 0 && d.cost > d.budget * 1.15)
      flags.push({ type:"warning", emoji:"ti-currency-rupee", text:`${d.name} overspending budget by ${(((d.cost-d.budget)/d.budget)*100).toFixed(0)}%` });
  });
 
  // ── Reusable chart components ─────────────────────────────────────────────
  const DonutChart = ({ data, valueKey="revenue", size=150 }) => {
    const items = data.filter(d => (d[valueKey]||0) > 0);
    const total = items.reduce((s,d) => s + (d[valueKey]||0), 0);
    if (!items.length || !total) return (
      <div style={{ width:size, height:size, borderRadius:"50%", background:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:F, fontSize:11, color:C.muted }}>No data</div>
    );
    const cx = size/2, cy = size/2, r = size*0.38, inner = size*0.22;
    let cum = -Math.PI/2;
    const slices = items.map((d,i) => {
      const angle = ((d[valueKey]||0)/total)*2*Math.PI;
      const s = cum; cum += angle;
      const large = angle > Math.PI ? 1 : 0;
      const x1=cx+r*Math.cos(s), y1=cy+r*Math.sin(s);
      const x2=cx+r*Math.cos(cum), y2=cy+r*Math.sin(cum);
      const xi1=cx+inner*Math.cos(s), yi1=cy+inner*Math.sin(s);
      const xi2=cx+inner*Math.cos(cum), yi2=cy+inner*Math.sin(cum);
      return { path:`M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`,
        color: d.color, name: d.name, val: d[valueKey], pct: ((d[valueKey]/total)*100).toFixed(0) };
    });
    return (
      <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <svg width={size} height={size}>
          {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"/>)}
          <text x={cx} y={cy-5} textAnchor="middle" style={{ fontFamily:F, fontSize:size*0.08, fill:C.muted }}>Total</text>
          <text x={cx} y={cy+10} textAnchor="middle" style={{ fontFamily:F, fontSize:size*0.1, fontWeight:700, fill:C.text }}>{fmt(total)}</text>
        </svg>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {slices.map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }}/>
              <span style={{ fontFamily:F, fontSize:11, color:C.text }}>{s.name}</span>
              <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:s.color, marginLeft:2 }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
 
  const HBarChart = ({ data, valueKey, total, label="" }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {data.filter(d => (d[valueKey]||0) > 0)
        .sort((a,b) => (b[valueKey]||0)-(a[valueKey]||0))
        .map((d,i) => {
          const p = total > 0 ? (((d[valueKey]||0)/total)*100).toFixed(1) : 0;
          const margin = (d.revenue||0) > 0 ? ((((d.revenue||0)-(d.cost||0))/(d.revenue||0))*100).toFixed(0) : null;
          return (
            <div key={i}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}><i className={"ti " + (d.icon||"ti-map-pin")} style={{fontSize:13, flexShrink:0}}/>{d.name}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {margin !== null && (
                    <span style={{ fontFamily:F, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:60,
                      background: parseFloat(margin)>=20?`${C.green}15`:parseFloat(margin)>=0?`${acc}15`:`${C.red}15`,
                      color: parseFloat(margin)>=20?C.green:parseFloat(margin)>=0?acc:C.red }}>
                      {margin}% margin
                    </span>
                  )}
                  <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>{fmt(d[valueKey]||0)} <strong style={{color:acc}}>{p}%</strong></span>
                </div>
              </div>
              <div style={{ position:"relative", height:10, borderRadius:5, background:C.border, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${p}%`, background:d.color||acc, borderRadius:5, transition:"width 0.4s" }}/>
                {d.budget > 0 && d.cost > 0 && valueKey==="cost" && (
                  <div style={{ position:"absolute", top:0, left:`${Math.min((d.budget/total)*100,100)}%`,
                    width:2, height:"100%", background:"#1F2937", opacity:0.4 }}/>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
 
  const ProfitTable = ({ data, label }) => {
    const rows = data.filter(d => (d.revenue||0)>0 || (d.cost||0)>0)
      .sort((a,b) => ((b.revenue||0)-(b.cost||0)) - ((a.revenue||0)-(a.cost||0)));
    if (!rows.length) return <div style={{ fontFamily:F, fontSize:13, color:C.muted, padding:"16px 0" }}>No data entered yet.</div>;
    return (
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid ${C.border}` }}>
              {[label,"Revenue","Cost","Gross Profit","Margin","vs Budget"].map(h => (
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:700, fontSize:11, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d,i) => {
              const gp = (d.revenue||0)-(d.cost||0);
              const margin = d.revenue>0 ? ((gp/d.revenue)*100).toFixed(1) : "—";
              const budgetStatus = d.budget > 0
                ? d.cost <= d.budget ? { label:"On track", color:C.green }
                  : d.cost <= d.budget*1.15 ? { label:"Watch", color:"#D97706" }
                  : { label:"Over budget", color:C.red }
                : null;
              return (
                <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?"white":C.bg2 }}>
                  <td style={{ padding:"9px 10px", fontWeight:600, color:C.text }}><i className={"ti " + (d.icon||"ti-map-pin")} style={{fontSize:13, marginRight:5}}/>{d.name}</td>
                  <td style={{ padding:"9px 10px", color:C.green, fontWeight:600 }}>{fmt(d.revenue||0)}</td>
                  <td style={{ padding:"9px 10px", color:C.red, fontWeight:600 }}>{fmt(d.cost||0)}</td>
                  <td style={{ padding:"9px 10px", color:gp>=0?C.green:C.red, fontWeight:700 }}>{fmt(gp)}</td>
                  <td style={{ padding:"9px 10px" }}>
                    {margin !== "—" && (
                      <span style={{ padding:"2px 8px", borderRadius:60, fontSize:11, fontWeight:700,
                        background:parseFloat(margin)>=20?`${C.green}15`:parseFloat(margin)>=0?`${acc}15`:`${C.red}15`,
                        color:parseFloat(margin)>=20?C.green:parseFloat(margin)>=0?acc:C.red }}>{margin}%</span>
                    )}
                  </td>
                  <td style={{ padding:"9px 10px" }}>
                    {budgetStatus && <span style={{ fontSize:11, fontWeight:600, color:budgetStatus.color }}>{budgetStatus.label}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
 
 
  // ── AI Analysis ───────────────────────────────────────────────────────────
  const generateAI = async () => {
    setLoadingAI(true);
    const summary = [
      rev     ? `Revenue: ${fmt(rev)} (${revGrowth ? revGrowth+"% MoM" : "no prev data"})` : "",
      gp      ? `Gross Profit: ${fmt(gp)} (${gpMargin}% margin)` : "",
      ebitda  ? `EBITDA: ${fmt(ebitda)} (${ebitdaMargin}% margin)` : "",
      pat     ? `Net Profit: ${fmt(pat)} (${patMargin}% margin)` : "",
      deptList.length ? ("Departments: " + deptList.map(d=>d.name+" rev="+fmt(d.revenue)+" cost="+fmt(d.cost)).join(", ")) : "",
      indiaRegions.length ? ("India Regions: " + indiaRegions.map(r=>r.name+" rev="+fmt(r.revenue)+" cost="+fmt(r.cost)).join(", ")) : "",
      globalRegions.length ? ("Global Regions: " + globalRegions.map(r=>r.name+" rev="+fmt(r.revenue)+" cost="+fmt(r.cost)).join(", ")) : "",
      variance.filter(v=>v.budget&&v.actual).map(v=>`${v.metric}: budget=${v.budget} actual=${v.actual}`).join(", "),
    ].filter(Boolean).join("\n");
 
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1200,
          system:`You are a CFO advisor. Analyse business performance data and give 4-5 sharp, specific, actionable insights. Focus on: which areas are performing well, which need attention, specific recommendations for the CEO. Use Indian business context. Format as short bullet points starting with an emoji. Be direct and specific — no generic advice.`,
          messages:[{ role:"user", content:`Analyse this business data and give CFO-level insights:\n\n${summary}` }]
        })
      });
      const data = await res.json();
      setAiInsight(data?.content?.[0]?.text || "Could not generate insights.");
    } catch { setAiInsight("API error. Please try again."); }
    setLoadingAI(false);
  };
 
  const hasData = rev > 0 || deptList.length > 0 || indiaRegions.length > 0;
 
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <style>{`
        .bi-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .bi-4col{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:700px){.bi-2col{grid-template-columns:1fr!important}.bi-4col{grid-template-columns:1fr 1fr!important}}
      `}</style>
 
      {/* View toggle */}
      <div style={{ display:"flex", gap:8 }}>
        {[
          { id:"geography",  label:"Geography",  emoji:"ti-world"      },
          { id:"department", label:"Department",  icon:"users"   },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:"6px 14px", borderRadius:12, border:"none", cursor:"pointer",
            fontFamily:F, fontSize:13, fontWeight:600, transition:"all 0.15s",
            background: view===v.id ? acc : C.bg2,
            color: view===v.id ? "white" : C.muted,
            outline:`1.5px solid ${view===v.id ? acc : C.border}`,
            display:"flex", alignItems:"center", gap:6,
          }}>
            <i className={"ti " + (v.icon||"ti-circle")} style={{fontSize:14}}/>
            {v.label}
          </button>
        ))}
      </div>
 
      {!hasData && (
        <Card>
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ marginBottom:12 }}><i className="ti ti-chart-bar" style={{fontSize:28, color:C.blue}}/></div>
            <div style={{ fontFamily:F, fontSize:14, color:C.muted, marginBottom:6 }}>No financial data entered yet.</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.dim }}>Ask Garima to update your report data in the admin panel.</div>
          </div>
        </Card>
      )}
 
 
      {/* ── GEOGRAPHY VIEW ── */}
      {view === "geography" && (<>
        {indiaRegions.length === 0 && globalRegions.length === 0 ? (
          <Card>
            <div style={{ textAlign:"center", padding:"24px 0", fontFamily:F, fontSize:13, color:C.muted }}>
              No geography data entered. Ask Garima to update in the admin panel under BI & Scenarios.
            </div>
          </Card>
        ) : (<>
          {indiaRegions.length > 0 && (<>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>India Regions — Revenue & Cost</div>
              <div className="bi-2col">
                <div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Revenue Contribution</div>
                  <DonutChart data={indiaRegions} valueKey="revenue"/>
                </div>
                <div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Cost Distribution</div>
                  <DonutChart data={indiaRegions} valueKey="cost"/>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>India Region — Profit Contribution</div>
              <ProfitTable data={indiaRegions} label="Region"/>
            </Card>
            <div className="bi-2col">
              <Card>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:12 }}>Revenue by Region</div>
                <HBarChart data={indiaRegions} valueKey="revenue" total={indiaRegions.reduce((s,r)=>s+r.revenue,0)}/>
              </Card>
              <Card>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:12 }}>Cost by Region</div>
                <HBarChart data={indiaRegions} valueKey="cost" total={indiaRegions.reduce((s,r)=>s+r.cost,0)}/>
              </Card>
            </div>
          </>)}
 
          {globalRegions.length > 0 && (<>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>Global Regions — Revenue & Cost</div>
              <div className="bi-2col">
                <div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Revenue Contribution</div>
                  <DonutChart data={globalRegions} valueKey="revenue"/>
                </div>
                <div>
                  <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Cost Distribution</div>
                  <DonutChart data={globalRegions} valueKey="cost"/>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>Global Region — Profit Contribution</div>
              <ProfitTable data={globalRegions} label="Region"/>
            </Card>
          </>)}
        </>)}
      </>)}
 
      {/* ── DEPARTMENT VIEW ── */}
      {view === "department" && (<>
        {deptList.length === 0 ? (
          <Card>
            <div style={{ textAlign:"center", padding:"24px 0", fontFamily:F, fontSize:13, color:C.muted }}>
              No department data entered. Ask Garima to update in the admin panel under BI & Scenarios.
            </div>
          </Card>
        ) : (<>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>Department — Revenue & Cost</div>
            <div className="bi-2col">
              <div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Revenue by Department</div>
                <DonutChart data={deptList} valueKey="revenue"/>
              </div>
              <div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10 }}>Cost by Department</div>
                <DonutChart data={deptList} valueKey="cost"/>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>Department — Profit Contribution & Budget</div>
            <ProfitTable data={deptList} label="Department"/>
          </Card>
          <div className="bi-2col">
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:12 }}>Revenue by Department</div>
              <HBarChart data={deptList} valueKey="revenue" total={deptList.reduce((s,d)=>s+d.revenue,0)}/>
            </Card>
            <Card>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:12 }}>Cost vs Budget</div>
              <HBarChart data={deptList} valueKey="cost" total={deptList.reduce((s,d)=>s+(d.budget||d.cost),0)}/>
            </Card>
          </div>
        </>)}
      </>)}
 
 
    </div>
  );
}
 
 
 
// ─── SCENARIO MODELLING ───────────────────────────────────────────────────────
function ScenarioModelling({ reportData, accentColor, client }) {
  const acc    = accentColor || C.blue;
  const pack   = normalizePack(client?.client_pack || client?.clientPack);
 
  // Pull base figures from admin-entered P&L data
  const parse = (v) => {
    if (!v) return 0;
    const s = String(v).replace(/[₹,\s]/g,"");
    let n = parseFloat(s); if (isNaN(n)) return 0;
    if (s.toLowerCase().includes("cr"))  n *= 10000000;
    else if (s.toLowerCase().includes("l")) n *= 100000;
    else if (s.toLowerCase().includes("k")) n *= 1000;
    return n;
  };
 
  const fmt = (n) => {
    if (!n && n !== 0) return "—";
    const abs = Math.abs(n), sign = n < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs/10000000).toFixed(1)}Cr`;
    if (abs >= 100000)   return `${sign}₹${(abs/100000).toFixed(1)}L`;
    if (abs >= 1000)     return `${sign}₹${(abs/1000).toFixed(0)}K`;
    return `${sign}₹${abs.toFixed(0)}`;
  };
 
  const baseRev  = parse(reportData?.scenarioBase?.revenue || reportData?.pl?.revenue?.actual);
  const baseCogs = parse(reportData?.scenarioBase?.cogs    || reportData?.pl?.cogs?.actual);
  const baseOpex = parse(reportData?.scenarioBase?.opex    || reportData?.pl?.opex?.actual);
  const cashBal  = parse(reportData?.pl?.cashBalance || "");
  const burnRate = parse(reportData?.pl?.burnRate || "");
 
  const hasData = baseRev > 0;
 
  // Three fixed scenarios — meaningful, not arbitrary sliders
  const SCENARIOS = [
    {
      id: "base",
      name: "Base Case",
      subtitle: "Current trajectory continues",
      color: "#059669",
      bg: "#F0FDF4",
      revDelta: 0,
      cogsDelta: 0,
      opexDelta: 0,
      icon: "ti-chart-bar",
    },
    {
      id: "stress",
      name: "Revenue Stress",
      subtitle: "20% revenue decline, costs sticky",
      color: "#D97706",
      bg: "#FFFBEB",
      revDelta: -20,
      cogsDelta: -8,   // COGS partially variable
      opexDelta: 5,    // Opex tends to increase under stress
      icon: "ti-alert-triangle",
    },
    {
      id: "worst",
      name: "Downturn",
      subtitle: "40% revenue drop, emergency cuts",
      color: "#EF4444",
      bg: "#FEF2F2",
      revDelta: -40,
      cogsDelta: -20,
      opexDelta: -15,  // Assumes cost-cutting measures
      icon: "ti-alert-circle",
    },
  ];
 
  const calc = (s) => {
    const rev   = baseRev   * (1 + s.revDelta/100);
    const cogs  = baseCogs  * (1 + s.cogsDelta/100);
    const opex  = baseOpex  * (1 + s.opexDelta/100);
    const gp    = rev - cogs;
    const ebitda = gp - opex;
    const gpMargin     = rev > 0 ? (gp/rev*100)     : 0;
    const ebitdaMargin = rev > 0 ? (ebitda/rev*100) : 0;
    // Runway: how many months does cash last at this burn rate?
    const effectiveBurn = opex + Math.max(0, cogs - rev*0.5); // rough
    const runway = cashBal > 0 && effectiveBurn > 0
      ? (cashBal / Math.abs(Math.min(ebitda, -effectiveBurn))).toFixed(1)
      : null;
    return { rev, cogs, opex, gp, ebitda, gpMargin, ebitdaMargin, runway };
  };
 
  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = React.useState("");
  const [loadingAI, setLoadingAI]   = React.useState(false);
  const [activeScenario, setActiveScenario] = React.useState("stress");
 
  const generateAnalysis = async (scenarioId) => {
    const s = SCENARIOS.find(s => s.id === scenarioId);
    const r = calc(s);
    setLoadingAI(true);
    setActiveScenario(scenarioId);
 
    const context = [
      `Company type: ${pack}`,
      `Scenario: ${s.name} — ${s.subtitle}`,
      `Base Revenue: ${fmt(baseRev)} → Scenario Revenue: ${fmt(r.rev)} (${s.revDelta > 0 ? "+" : ""}${s.revDelta}%)`,
      `Gross Profit: ${fmt(r.gp)} (${r.gpMargin.toFixed(1)}% margin)`,
      `EBITDA: ${fmt(r.ebitda)} (${r.ebitdaMargin.toFixed(1)}% margin)`,
      r.ebitda < 0 ? `Monthly cash burn: ${fmt(Math.abs(r.ebitda))}` : "",
      cashBal ? `Current cash balance: ${fmt(cashBal)}` : "",
      r.runway ? `Implied runway: ~${r.runway} months` : "",
    ].filter(Boolean).join("\n");
 
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 900,
          system: `You are a CFO advisor giving a CEO a crisp scenario briefing. 
For the given scenario, provide:
1. The KEY RISK in 1 sentence
2. IMMEDIATE ACTIONS — 3 specific things the CEO should do NOW (numbered)
3. WATCH METRICS — 2 numbers to track weekly
Be direct. Use ₹ amounts. Indian business context. No fluff.`,
          messages: [{ role: "user", content: context }],
        }),
      });
      const data = await res.json();
      setAiAnalysis(data?.content?.[0]?.text || "Could not generate analysis.");
    } catch {
      setAiAnalysis("API error. Please try again.");
    }
    setLoadingAI(false);
  };
 
  if (!hasData) return (
    <Card>
      <div style={{ textAlign:"center", padding:"32px 0" }}>
        <div style={{ marginBottom:12 }}><i className="ti ti-chart-bar" style={{fontSize:28, color:C.blue}}/></div>
        <div style={{ fontFamily:F, fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>
          No financial data available
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>
          Garima will add your base P&L figures to enable scenario analysis.
        </div>
      </div>
    </Card>
  );
 
  const baseCalc = calc(SCENARIOS[0]);
 
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
 
      {/* Header */}
      <div style={{ padding:"16px 20px", borderRadius:16,
        background:`linear-gradient(135deg,${acc}12,${acc}06)`,
        border:`1px solid ${acc}20` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
          Scenario Analysis
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
          Based on {reportData?.monthLabel || "current"} actuals — Revenue {fmt(baseRev)} · COGS {fmt(baseCogs)} · OpEx {fmt(baseOpex)}
        </div>
      </div>
 
      {/* Three scenario cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }} className="scenario-grid">
        {SCENARIOS.map((s) => {
          const r = calc(s);
          const isActive = activeScenario === s.id;
          return (
            <div key={s.id} style={{ borderRadius:16, overflow:"hidden",
              border:`2px solid ${isActive ? s.color : C.border}`,
              boxShadow: isActive ? `0 4px 20px ${s.color}25` : "none",
              transition:"all 0.2s", background:"white" }}>
 
              {/* Card header */}
              <div style={{ padding:"12px 16px", background:s.bg,
                borderBottom:`1px solid ${s.color}20` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                  <i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:16}}/>
                  <div style={{ fontFamily:F, fontWeight:800, fontSize:13, color:s.color }}>
                    {s.name}
                  </div>
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.4 }}>
                  {s.subtitle}
                </div>
              </div>
 
              {/* Metrics */}
              <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { label:"Revenue",    val:r.rev,    base:baseRev,       delta:s.revDelta   },
                  { label:"Gross Profit",val:r.gp,   base:baseCalc.gp,   delta:null         },
                  { label:"EBITDA",     val:r.ebitda, base:baseCalc.ebitda,delta:null        },
                ].map((row,i) => {
                  const isNeg = row.val < 0;
                  const diffFromBase = baseCalc[['rev','gp','ebitda'][i]] > 0
                    ? ((row.val - baseCalc[['rev','gp','ebitda'][i]]) / Math.abs(baseCalc[['rev','gp','ebitda'][i]]) * 100).toFixed(0)
                    : null;
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                        <span style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600 }}>
                          {row.label}
                        </span>
                        {s.id !== "base" && diffFromBase && (
                          <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                            color: parseFloat(diffFromBase) >= 0 ? C.green : C.red }}>
                            {parseFloat(diffFromBase) >= 0 ? "▲" : "▼"}{Math.abs(diffFromBase)}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily:F, fontSize:14, fontWeight:800,
                        color: isNeg ? C.red : i === 0 ? s.color : C.text }}>
                        {fmt(row.val)}
                      </div>
                    </div>
                  );
                })}
 
                {/* EBITDA margin badge */}
                <div style={{ padding:"6px 10px", borderRadius:16, background:
                  r.ebitdaMargin >= 15 ? `${C.green}12` : r.ebitdaMargin >= 0 ? `${C.amber}12` : `${C.red}12`,
                  display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
                  <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>EBITDA margin</span>
                  <span style={{ fontFamily:F, fontSize:13, fontWeight:800,
                    color: r.ebitdaMargin >= 15 ? C.green : r.ebitdaMargin >= 0 ? "#D97706" : C.red }}>
                    {r.ebitdaMargin.toFixed(1)}%
                  </span>
                </div>
 
                {/* Runway if negative */}
                {r.ebitda < 0 && cashBal > 0 && (
                  <div style={{ padding:"6px 10px", borderRadius:16, background:`${C.red}08`,
                    border:`1px solid ${C.red}20` }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.red, fontWeight:600 }}>
                      Cash runway: ~{(cashBal / Math.abs(r.ebitda)).toFixed(1)} months
                    </div>
                  </div>
                )}
              </div>
 
              {/* Analyse button */}
              <div style={{ padding:"0 16px 14px" }}>
                <button onClick={() => generateAnalysis(s.id)}
                  disabled={loadingAI && activeScenario === s.id}
                  style={{ width:"100%", padding:"9px", borderRadius:16, border:"none",
                    background: isActive ? s.color : `${s.color}15`,
                    color: isActive ? "white" : s.color,
                    fontFamily:F, fontSize:12, fontWeight:700, cursor:"pointer",
                    transition:"all 0.15s" }}>
                  {loadingAI && activeScenario === s.id ? "Analysing..." : "Get CFO Insights →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`.scenario-grid{grid-template-columns:repeat(3,1fr)!important}@media(max-width:700px){.scenario-grid{grid-template-columns:1fr!important}}`}</style>
 
      {/* Comparison table */}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
          Side-by-Side Comparison
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["Metric", ...SCENARIOS.map(s => s.name)].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left",
                    color:C.muted, fontWeight:700, fontSize:11,
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label:"Revenue",       key:"rev"         },
                { label:"Gross Profit",  key:"gp"          },
                { label:"EBITDA",        key:"ebitda"       },
                { label:"GP Margin",     key:"gpMargin",    pct:true },
                { label:"EBITDA Margin", key:"ebitdaMargin",pct:true },
              ].map((row, ri) => (
                <tr key={row.key} style={{ borderBottom:`1px solid ${C.border}`,
                  background: ri%2===0 ? "white" : C.bg2 }}>
                  <td style={{ padding:"10px 12px", fontWeight:600, color:C.text }}>{row.label}</td>
                  {SCENARIOS.map((s) => {
                    const r = calc(s);
                    const val = r[row.key];
                    const isNeg = val < 0;
                    return (
                      <td key={s.id} style={{ padding:"10px 12px", fontWeight:700,
                        color: isNeg ? C.red : s.id === "base" ? C.green : s.color }}>
                        {row.pct ? `${val.toFixed(1)}%` : fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
 
      {/* AI CFO Insights */}
      {aiAnalysis && (
        <Card style={{ border:`1.5px solid ${SCENARIOS.find(s=>s.id===activeScenario)?.color}30` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:16,
              background:`${SCENARIOS.find(s=>s.id===activeScenario)?.color}15`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
              <i className={"ti " + (SCENARIOS.find(s=>s.id===activeScenario)?.icon||"ti-circle")} style={{fontSize:16}}/>
            </div>
            <div>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>
                CFO Insights — {SCENARIOS.find(s=>s.id===activeScenario)?.name}
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>
                Based on your actual {reportData?.monthLabel || "current"} data
              </div>
            </div>
          </div>
          <div style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.85,
            whiteSpace:"pre-wrap", background:"#fff", borderRadius:16, padding:"14px 16px" }}>
            {aiAnalysis}
          </div>
        </Card>
      )}
    </div>
  );
}
 
 
 
// ─── SPEND INTELLIGENCE ───────────────────────────────────────────────────────
function SpendIntelligence({ reportData, accentColor, client }) {
  const acc = accentColor || C.blue;
  const pack = normalizePack(client?.client_pack || client?.clientPack);
 
  const defaultDepts = [
    { name:"Marketing & Sales",   benchmark:15, icon:"ti-speakerphone" },
    { name:"Technology / Product",benchmark:20, icon:"ti-device-laptop" },
    { name:"Operations",          benchmark:25, icon:"ti-settings" },
    { name:"HR & People",         benchmark:20, icon:"ti-users" },
    { name:"Admin & G&A",         benchmark:10, icon:"ti-building" },
    { name:"Finance & Legal",     benchmark:5,  icon:"ti-scale" },
  ];
 
  // Pull from admin-entered data — clients don't enter this themselves
  const depts = defaultDepts.map(d => ({
    ...d,
    actual: parseFloat(reportData?.spendDepts?.[d.name]?.actual || 0),
    budget: parseFloat(reportData?.spendDepts?.[d.name]?.budget || 0),
  }));
 
  const rev = parseFloat(reportData?.spendRevenue || reportData?.pl?.revenue?.actual?.replace(/[^0-9.]/g,"") || 0);
  const totalSpend = depts.reduce((s,d) => s + (d.actual||0), 0);
  const hasData = depts.some(d => d.actual > 0);
 
  const [aiInsight, setAiInsight] = React.useState("");
  const [loadingInsight, setLoadingInsight] = React.useState(false);
 
  const fmt = (n) => {
    if (!n) return "—";
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
    if (n >= 1000)     return `₹${(n/1000).toFixed(0)}K`;
    return `₹${n.toFixed(0)}`;
  };
 
  const getFlag = (d) => {
    if (!d.actual || !rev) return null;
    const pct = (d.actual / rev) * 100;
    const diff = pct - d.benchmark;
    if (diff > 10) return { label:"Overspending", color:C.red };
    if (diff > 5)  return { label:"Watch",        color:"#D97706" };
    if (diff < -8) return { label:"Underfunded",  color:C.blue };
    return { label:"On Track", color:C.green };
  };
 
  const generateInsight = async () => {
    if (!rev) return;
    setLoadingInsight(true);
    const summary = depts.filter(d => d.actual > 0)
      .map(d => `${d.name}: ${fmt(d.actual)} (${((d.actual/rev)*100).toFixed(1)}% of revenue, benchmark ${d.benchmark}%)`)
      .join("\n");
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:800,
          system:"You are a CFO advisor. Analyse department spend vs benchmarks and give 3-4 sharp, actionable recommendations. Indian business context. Short bullet points with emoji.",
          messages:[{ role:"user", content:`Revenue: ${fmt(rev)}\nIndustry: ${pack}\n\n${summary}` }]
        })
      });
      const data = await res.json();
      setAiInsight(data?.content?.[0]?.text || "");
    } catch { setAiInsight("Could not generate insights. Please try again."); }
    setLoadingInsight(false);
  };
 
  if (!hasData) return (
    <Card>
      <div style={{ textAlign:"center", padding:"32px 0" }}>
        <div style={{ marginBottom:12 }}><i className="ti ti-chart-bar" style={{fontSize:28, color:C.blue}}/></div>
        <div style={{ fontFamily:F, fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>
          No spend data available yet
        </div>
        <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>
          Garima will update your department spend breakdown in the next pack.
        </div>
      </div>
    </Card>
  );
 
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
      {/* Header summary */}
      {rev > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }} className="spend-hdr">
          {[
            { label:"Monthly Revenue",  val: fmt(rev),        color: acc          },
            { label:"Total Spend",       val: fmt(totalSpend), color: C.text       },
            { label:"Spend / Revenue",   val: `${((totalSpend/rev)*100).toFixed(1)}%`,
              color: (totalSpend/rev)>0.7 ? C.red : (totalSpend/rev)>0.5 ? "#D97706" : C.green },
          ].map((s,i) => (
            <div key={i} style={{ padding:"14px 16px", borderRadius:16, background:"white",
              border:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.muted,
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}
 
      {/* Department breakdown */}
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
          Department Spend vs Benchmarks
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {depts.filter(d => d.actual > 0).map((d, i) => {
            const flag     = getFlag(d);
            const pct      = rev > 0 ? ((d.actual/rev)*100).toFixed(1) : null;
            const budgetPct= d.budget > 0 ? Math.min((d.actual/d.budget)*100, 150) : null;
            const barW     = rev > 0 ? Math.min((d.actual/rev)*100 / d.benchmark * 100, 150) : 0;
 
            return (
              <div key={i} style={{ padding:"14px 16px", borderRadius:16,
                background:"#fff", border:`1px solid ${C.border}` }}>
                {/* Row header */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <i className={"ti " + (d.icon||"ti-circle")} style={{fontSize:18}}/>
                  <div style={{ fontFamily:F, fontWeight:600, fontSize:13, color:C.text, flex:1 }}>
                    {d.name}
                  </div>
                  <div style={{ fontFamily:F, fontSize:14, fontWeight:800, color:C.text }}>
                    {fmt(d.actual)}
                  </div>
                  {flag && (
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 10px",
                      borderRadius:60, background:`${flag.color}15`, color:flag.color,
                      letterSpacing:"0.05em", flexShrink:0 }}>
                      {flag.label}
                    </span>
                  )}
                </div>
 
                {/* Progress bar — actual vs benchmark */}
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontFamily:F, fontSize:10, color:C.muted }}>
                      {pct ? `${pct}% of revenue` : ""}
                    </span>
                    <span style={{ fontFamily:F, fontSize:10, color:C.dim }}>
                      benchmark {d.benchmark}%
                    </span>
                  </div>
                  <div style={{ height:6, borderRadius:12, background:C.border, overflow:"hidden", position:"relative" }}>
                    <div style={{ height:"100%", width:`${Math.min(parseFloat(pct)||0, 50)}%`,
                      background: flag?.color === C.red ? C.red : flag?.color === "#D97706" ? "#D97706" : acc,
                      borderRadius:12, transition:"width 0.4s" }}/>
                    {/* Benchmark marker */}
                    <div style={{ position:"absolute", top:0, left:`${Math.min(d.benchmark,50)}%`,
                      width:2, height:"100%", background:"rgba(0,0,0,0.25)" }}/>
                  </div>
                </div>
 
                {/* Budget comparison */}
                {budgetPct !== null && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>
                      vs Budget {fmt(d.budget)}
                    </span>
                    <span style={{ fontFamily:F, fontSize:11, fontWeight:700,
                      color: budgetPct > 110 ? C.red : budgetPct > 95 ? "#D97706" : C.green }}>
                      {budgetPct.toFixed(0)}% utilised
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
 
      {/* AI Recommendations */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>
            AI Spend Recommendations
          </div>
          <button onClick={generateInsight} disabled={loadingInsight}
            style={{ padding:"7px 16px", borderRadius:12, border:"none",
              background: !loadingInsight ? acc : C.border,
              color:"white", fontFamily:F, fontSize:12, fontWeight:600,
              cursor: !loadingInsight ? "pointer" : "not-allowed" }}>
            {loadingInsight ? "Analysing..." : "Generate"}
          </button>
        </div>
        {aiInsight ? (
          <div style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.8,
            whiteSpace:"pre-wrap", background:"#fff", borderRadius:16, padding:"14px 16px" }}>
            {aiInsight}
          </div>
        ) : (
          <div style={{ fontFamily:F, fontSize:13, color:C.muted, textAlign:"center", padding:"20px 0" }}>
            Click Generate for AI-powered spend recommendations based on your data.
          </div>
        )}
      </Card>
 
      <style>{`.spend-hdr{grid-template-columns:repeat(3,1fr)!important}@media(max-width:600px){.spend-hdr{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
 
// ─── FUND UTILISATION COMPONENT ──────────────────────────────────────────────
function FundUtilisation({ reportData, accentColor }) {
  const acc = accentColor || C.blue;
  const defaultFunds = [
    { category:"Salaries & People", allocated:0, deployed:0 },
    { category:"Marketing & Growth", allocated:0, deployed:0 },
    { category:"Technology & Product", allocated:0, deployed:0 },
    { category:"Operations & Logistics", allocated:0, deployed:0 },
    { category:"General & Admin", allocated:0, deployed:0 },
  ];
  const [totalRaised, setTotalRaised] = React.useState(
    reportData?.fundUtil?.totalRaised || ""
  );
  const [funds, setFunds] = React.useState(
    reportData?.fundUtil?.categories || defaultFunds
  );
 
  const totalAllocated = funds.reduce((s,f) => s + (parseFloat(f.allocated)||0), 0);
  const totalDeployed = funds.reduce((s,f) => s + (parseFloat(f.deployed)||0), 0);
  const raised = parseFloat(totalRaised) || 0;
  const unallocated = raised - totalAllocated;
  const deployedPct = totalAllocated > 0 ? Math.round((totalDeployed/totalAllocated)*100) : 0;
  const runwayMonths = totalDeployed > 0 && raised > 0
    ? Math.round((raised - totalDeployed) / (totalDeployed / Math.max(funds.length,1)))
    : null;
 
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>
          Fund Utilisation Tracker
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          <div style={{ padding:"14px 16px", borderRadius:16, background:`${acc}10`, border:`1px solid ${acc}25` }}>
            <div style={{ fontSize:11, fontWeight:700, color:acc, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Total Raised</div>
            <input
              type="number"
              placeholder="Enter amount (₹)"
              value={totalRaised}
              onChange={e => setTotalRaised(e.target.value)}
              style={{ width:"100%", border:"none", background:"transparent", fontSize:14, fontWeight:700,
                color:C.text, fontFamily:FM, marginTop:4, outline:"none" }}
            />
          </div>
          <div style={{ padding:"14px 16px", borderRadius:16, background:`${C.green}10`, border:`1px solid ${C.green}25` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Deployed</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FM, marginTop:4 }}>
              {totalDeployed > 0 ? `₹${(totalDeployed/100000).toFixed(1)}L` : "—"}
              {deployedPct > 0 && <span style={{ fontSize:12, color:C.muted, fontFamily:F, marginLeft:6 }}>{deployedPct}%</span>}
            </div>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:16, background:`${C.orange||"#F59E0B"}10`, border:`1px solid ${C.orange||"#F59E0B"}25` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.orange||"#F59E0B", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Unallocated</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FM, marginTop:4 }}>
              {raised > 0 ? `₹${(unallocated/100000).toFixed(1)}L` : "—"}
            </div>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:16, background:`${C.purple}10`, border:`1px solid ${C.purple}25` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Est. Runway</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FM, marginTop:4 }}>
              {runwayMonths ? `${runwayMonths}mo` : "—"}
            </div>
          </div>
        </div>
 
        {/* Category breakdown */}
        <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F, marginBottom:12 }}>
          Allocation by Category
        </div>
        {funds.map((f,i) => {
          const pct = totalAllocated > 0 ? Math.round(((parseFloat(f.allocated)||0)/totalAllocated)*100) : 0;
          const depPct = (parseFloat(f.allocated)||0) > 0
            ? Math.round(((parseFloat(f.deployed)||0)/(parseFloat(f.allocated)||1))*100) : 0;
          return (
            <div key={i} style={{ marginBottom:16, paddingBottom:16,
              borderBottom: i < funds.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{f.category}</div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:F }}>{pct}% of total</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:F, marginBottom:2 }}>Allocated (₹)</div>
                  <input type="number" placeholder="0"
                    value={f.allocated || ""}
                    onChange={e => {
                      const nf = [...funds];
                      nf[i] = {...nf[i], allocated: e.target.value};
                      setFunds(nf);
                    }}
                    style={{ width:"100%", padding:"6px 10px", borderRadius:16,
                      border:`1px solid ${C.border}`, fontFamily:F, fontSize:13, color:C.text,
                      background:"#fff", outline:"none" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:F, marginBottom:2 }}>Deployed (₹)</div>
                  <input type="number" placeholder="0"
                    value={f.deployed || ""}
                    onChange={e => {
                      const nf = [...funds];
                      nf[i] = {...nf[i], deployed: e.target.value};
                      setFunds(nf);
                    }}
                    style={{ width:"100%", padding:"6px 10px", borderRadius:16,
                      border:`1px solid ${C.border}`, fontFamily:F, fontSize:13, color:C.text,
                      background:"#fff", outline:"none" }}
                  />
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height:6, borderRadius:12, background:C.border, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(depPct,100)}%`,
                  background: depPct > 90 ? C.red : depPct > 60 ? C.orange||"#F59E0B" : acc,
                  borderRadius:12, transition:"width 0.3s" }}/>
              </div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:F, marginTop:3 }}>
                {depPct}% deployed
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
 
// ─── VERTICAL P&L COMPONENT ───────────────────────────────────────────────────
function VerticalPnL({ reportData, accentColor }) {
  const acc = accentColor || C.blue;
  const defaultVerticals = [
    { name:"Vertical / Region 1", revenue:0, cogs:0, opex:0 },
    { name:"Vertical / Region 2", revenue:0, cogs:0, opex:0 },
    { name:"Vertical / Region 3", revenue:0, cogs:0, opex:0 },
  ];
  const [verticals, setVerticals] = React.useState(
    reportData?.verticalPnL || defaultVerticals
  );
  const [month, setMonth] = React.useState(reportData?.monthLabel || "");
 
  const updateVertical = (i, field, value) => {
    const nv = [...verticals];
    nv[i] = {...nv[i], [field]: value};
    setVerticals(nv);
  };
 
  const addVertical = () => {
    setVerticals([...verticals, { name:"New Vertical", revenue:0, cogs:0, opex:0 }]);
  };
 
  const calcGP = v => (parseFloat(v.revenue)||0) - (parseFloat(v.cogs)||0);
  const calcContrib = v => calcGP(v) - (parseFloat(v.opex)||0);
  const calcMargin = v => {
    const r = parseFloat(v.revenue)||0;
    return r > 0 ? Math.round((calcContrib(v)/r)*100) : 0;
  };
 
  const totalRevenue = verticals.reduce((s,v) => s + (parseFloat(v.revenue)||0), 0);
  const totalContrib = verticals.reduce((s,v) => s + calcContrib(v), 0);
  const bestVertical = [...verticals].sort((a,b) => calcContrib(b) - calcContrib(a))[0];
  const worstVertical = [...verticals].sort((a,b) => calcContrib(a) - calcContrib(b))[0];
 
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
            Vertical / Regional P&L
          </div>
          <input
            type="text"
            placeholder="Month (e.g. Mar 2026)"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding:"6px 12px", borderRadius:16, border:`1px solid ${C.border}`,
              fontFamily:F, fontSize:12, color:C.text, background:"#fff", outline:"none" }}
          />
        </div>
 
        {/* Summary cards */}
        {totalRevenue > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
            <div style={{ padding:"12px 14px", borderRadius:16, background:`${acc}10`, border:`1px solid ${acc}25` }}>
              <div style={{ fontSize:10, fontWeight:700, color:acc, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Total Revenue</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:FM, marginTop:4 }}>
                ₹{(totalRevenue/100000).toFixed(1)}L
              </div>
            </div>
            <div style={{ padding:"12px 14px", borderRadius:16, background:`${C.green}10`, border:`1px solid ${C.green}25` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Best Performer</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F, marginTop:4 }}>
                {bestVertical?.name}
              </div>
            </div>
            <div style={{ padding:"12px 14px", borderRadius:16, background:`${C.red}10`, border:`1px solid ${C.red}25` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:F }}>Needs Attention</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F, marginTop:4 }}>
                {worstVertical?.name}
              </div>
            </div>
          </div>
        )}
 
        {/* Vertical rows */}
        {verticals.map((v,i) => {
          const gp = calcGP(v);
          const contrib = calcContrib(v);
          const margin = calcMargin(v);
          const revenueShare = totalRevenue > 0
            ? Math.round(((parseFloat(v.revenue)||0)/totalRevenue)*100) : 0;
 
          return (
            <div key={i} style={{ marginBottom:14, padding:"16px", borderRadius:16,
              background:"#fff", border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <input
                  type="text"
                  value={v.name}
                  onChange={e => updateVertical(i, "name", e.target.value)}
                  style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em",
                    border:"none", background:"transparent", outline:"none", flex:1 }}
                />
                <div style={{ fontSize:11, color:C.muted, fontFamily:F }}>
                  {revenueShare}% of total revenue
                </div>
              </div>
 
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                {[
                  { label:"Revenue (₹)", field:"revenue" },
                  { label:"COGS (₹)", field:"cogs" },
                  { label:"OpEx (₹)", field:"opex" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:F, marginBottom:2 }}>{label}</div>
                    <input
                      type="number"
                      placeholder="0"
                      value={v[field] || ""}
                      onChange={e => updateVertical(i, field, e.target.value)}
                      style={{ width:"100%", padding:"6px 10px", borderRadius:16,
                        border:`1px solid ${C.border}`, fontFamily:F, fontSize:13,
                        color:C.text, background:C.bg, outline:"none" }}
                    />
                  </div>
                ))}
              </div>
 
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                <div style={{ padding:"8px 10px", borderRadius:16,
                  background: gp >= 0 ? `${C.green}10` : `${C.red}10` }}>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:F }}>Gross Profit</div>
                  <div style={{ fontSize:13, fontWeight:700,
                    color: gp >= 0 ? C.green : C.red, fontFamily:FM }}>
                    ₹{(gp/100000).toFixed(1)}L
                  </div>
                </div>
                <div style={{ padding:"8px 10px", borderRadius:16,
                  background: contrib >= 0 ? `${C.green}10` : `${C.red}10` }}>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:F }}>Contribution</div>
                  <div style={{ fontSize:13, fontWeight:700,
                    color: contrib >= 0 ? C.green : C.red, fontFamily:FM }}>
                    ₹{(contrib/100000).toFixed(1)}L
                  </div>
                </div>
                <div style={{ padding:"8px 10px", borderRadius:16,
                  background: margin >= 0 ? `${acc}10` : `${C.red}10` }}>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:F }}>Margin %</div>
                  <div style={{ fontSize:13, fontWeight:700,
                    color: margin >= 15 ? C.green : margin >= 0 ? C.orange||"#F59E0B" : C.red,
                    fontFamily:FM }}>
                    {margin}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
 
        <button onClick={addVertical} style={{
          width:"100%", padding:"10px", borderRadius:16,
          border:`1.5px dashed ${C.border}`, background:"transparent",
          fontFamily:F, fontSize:13, fontWeight:600, color:C.muted, cursor:"pointer" }}>
          + Add Vertical / Region
        </button>
      </Card>
 
      {/* Summary table */}
      {totalRevenue > 0 && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>
            Comparative Summary
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F, fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                  {["Vertical","Revenue","Gross Profit","Contribution","Margin %"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", textAlign:"left",
                      color:C.muted, fontWeight:700, fontSize:11, textTransform:"uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...verticals]
                  .sort((a,b) => calcContrib(b) - calcContrib(a))
                  .map((v,i) => {
                    const gp = calcGP(v);
                    const contrib = calcContrib(v);
                    const margin = calcMargin(v);
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"10px", fontWeight:600, color:C.text }}>{v.name}</td>
                        <td style={{ padding:"10px", color:C.text }}>₹{((parseFloat(v.revenue)||0)/100000).toFixed(1)}L</td>
                        <td style={{ padding:"10px", color: gp >= 0 ? C.green : C.red, fontWeight:600 }}>
                          ₹{(gp/100000).toFixed(1)}L
                        </td>
                        <td style={{ padding:"10px", color: contrib >= 0 ? C.green : C.red, fontWeight:600 }}>
                          ₹{(contrib/100000).toFixed(1)}L
                        </td>
                        <td style={{ padding:"10px" }}>
                          <span style={{
                            padding:"2px 8px", borderRadius:60, fontSize:11, fontWeight:700,
                            background: margin >= 15 ? `${C.green}15` : margin >= 0 ? "#FEF3C715" : `${C.red}15`,
                            color: margin >= 15 ? C.green : margin >= 0 ? "#D97706" : C.red
                          }}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                <tr style={{ borderTop:`2px solid ${C.border}`, background:"#fff" }}>
                  <td style={{ padding:"10px", fontWeight:700, color:C.text }}>Total</td>
                  <td style={{ padding:"10px", fontWeight:700, color:C.text }}>₹{(totalRevenue/100000).toFixed(1)}L</td>
                  <td colSpan={2} style={{ padding:"10px", fontWeight:700,
                    color: totalContrib >= 0 ? C.green : C.red }}>
                    Contribution: ₹{(totalContrib/100000).toFixed(1)}L
                  </td>
                  <td style={{ padding:"10px", fontWeight:700, color:C.text }}>
                    {totalRevenue > 0 ? Math.round((totalContrib/totalRevenue)*100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
 
function CFOPackContent({ reportData, client, kpis }) {
  const [tab, setTab] = useState("monthly");
 
  const groups = [
    {
      label: "Financial Reports",
      items: [
        { id:"monthly",    emoji:"ti-chart-bar",      label:"Monthly Report"      },
        { id:"variance",   emoji:"ti-trending-down",  label:"Variance Analysis"   },
        { id:"verticalpnl",emoji:"ti-trending-up",    label:"Vertical P&L"        },
        { id:"uniteco",    emoji:"ti-chart-bar",      label:"Unit Economics"      },
      ]
    },
    {
      label: "Cash & Working Capital",
      items: [
        { id:"workingcap", emoji:"ti-chart-bar",      label:"Working Capital"     },
      ]
    },
    {
      label: "Fundraise & Finance",
      items: [
        { id:"fundraise",  emoji:"ti-flag",           label:"Fundraise Readiness" },
        { id:"loan",       emoji:"ti-building-bank",  label:"Loan Readiness"      },
        { id:"fundutil",   emoji:"ti-building-bank",  label:"Fund Utilisation"    },
      ]
    },
    {
      label: "Strategy & Planning",
      items: [
        { id:"scenario",   emoji:"ti-target",         label:"Scenarios"           },
        { id:"bizintel",   emoji:"ti-world",          label:"BI Analysis"         },
        { id:"spend",      emoji:"ti-chart-bar",      label:"Spend Intel"         },
      ]
    },
    {
      label: "Documents",
      items: [
        { id:"boardpacks", emoji:"ti-folder",         label:"Board Packs"         },
      ]
    },
  ];

  const archiveDocs = useLiveDocs(client);

  return (
    <PackLayout tab={tab} setTab={setTab} groups={groups} accent={C.blue}>
      <div>
      {/* FIXED: Monthly Report tab — historical profitability ONLY.
          KPI Snapshot removed (lives in Dashboard). Cash metrics removed (live in CashFlow Forecast).
          This tab = Vertical P&L + cost analysis + Garima note. */}
      {tab === "monthly" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* FIXED: Garima Note — prominent at top, unique insight not in Overview */}
          <Card style={{ borderLeft:`3px solid #F59E0B`, background:"#FFFBF0", border:"1px solid #FDE68A" }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                background:"linear-gradient(135deg,#F59E0B,#D97706)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:F, fontWeight:800, fontSize:14, color:"white" }}>G</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.warning, fontFamily:F, marginBottom:4 }}>
                  Note from Garima — Profitability Analysis
                </div>
                <p style={{ fontSize:13, color:C.text, lineHeight:1.8, fontFamily:F, margin:0, whiteSpace:"pre-wrap" }}>
                  {reportData?.reportNote || reportData?.packNote || (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.garimaNote) || PACK_CONFIG.startup.garimaNote}
                </p>
              </div>
            </div>
          </Card>
          {/* P&L Deep Dive — historical data, no duplication with Overview/CashFlow */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              P&L Deep Dive{reportData?.monthLabel ? ` — ${reportData.monthLabel}` : ""}
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:14 }}>
              Historical profitability · For KPI trends see Dashboard · For cash outlook see Cash Flow Forecast
            </div>
            {(function() {
              var pl = reportData?.pl;
              var hasLive = pl && Object.values(pl).some(v => v?.actual);
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
            }())}
          </Card>
          <Card style={{ borderLeft:`4px solid ${C.green}` }}>
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
 
      {tab === "workingcap" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <div style={{ padding:"16px 20px", borderRadius:16,
            background:`linear-gradient(135deg,${C.blue}10,${C.teal}06)`,
            border:`1px solid ${C.blue}20` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              {"Are we collecting fast enough and paying smart?"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {"Working capital efficiency determines how much cash is trapped in operations vs available to use."}
            </div>
          </div>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Cash Conversion Cycle"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16 }}>{"Days your cash is tied up before you collect it back"}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {[
                { label:"Debtor Days",   value:reportData?.debtorDays   || "46",        color:C.blue,   bad:parseInt(reportData?.debtorDays||"46")>30 },
                { label:"−",            value:null, color:C.muted },
                { label:"Creditor Days", value:reportData?.creditorDays  || "31",        color:C.purple, bad:false },
                { label:"+",            value:null, color:C.muted },
                { label:"Inventory Days",value:reportData?.inventoryDays || "22",        color:C.teal,   bad:false },
                { label:"=",            value:null, color:C.muted },
                { label:"CCC",           value:reportData?.ccc           || "37 days",   color:parseInt(reportData?.ccc||"37")<=30?C.green:C.amber, bad:parseInt(reportData?.ccc||"37")>30 },
              ].map((item, i) => item.value === null ? (
                <div key={i} style={{ fontFamily:FM, fontSize:18, fontWeight:700, color:item.color }}>{item.label}</div>
              ) : (
                <div key={i} style={{ padding:"12px 16px", borderRadius:16, textAlign:"center",
                  background:item.bad?`${C.amber}08`:`${item.color}08`,
                  border:`1px solid ${item.bad?C.amber+"30":item.color+"20"}` }}>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.color }}>{item.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:3 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Debtors Aging — Who Owes What"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Money earned but not yet collected"}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { band:"0–30 days",  value:reportData?.ar0to30  || "₹18.2L", pct:"47%", color:C.green, action:"On track — follow standard reminder cycle" },
                { band:"31–60 days", value:reportData?.ar31to60 || "₹12.4L", pct:"32%", color:C.amber, action:"Send formal reminder + confirm payment date" },
                { band:"61–90 days", value:reportData?.ar61to90 || "₹4.8L",  pct:"13%", color:C.red,   action:"Escalate to senior contact — consider credit hold" },
                { band:"90+ days",   value:reportData?.ar90plus || "₹2.9L",  pct:"8%",  color:C.red,   action:"Legal notice or write-off decision required" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                  borderRadius:16, background:"#fff", border:`1px solid ${C.border}` }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:row.color, flexShrink:0 }}/>
                  <div style={{ width:90, fontFamily:F, fontSize:12, color:C.muted, fontWeight:600 }}>{row.band}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:row.color, width:70 }}>{row.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.dim, background:C.bg, padding:"2px 8px", borderRadius:60, marginRight:8 }}>{row.pct}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, flex:1, lineHeight:1.4 }}>{row.action}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Working Capital Ratios vs Benchmarks"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"How your efficiency ratios compare to sector medians"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[
                { label:"Current Ratio",     value:reportData?.currentRatio || "1.62x", benchmark:reportData?.benchCurrentRatio || "Sector avg: 1.5–2.0x", target:1.5, actual:parseFloat(reportData?.currentRatio||"1.62"), higher:true },
                { label:"Quick Ratio",        value:reportData?.quickRatio   || "1.18x", benchmark:reportData?.benchQuickRatio   || "Target: >1.0x",         target:1.0, actual:parseFloat(reportData?.quickRatio||"1.18"),   higher:true },
                { label:"Inventory Turnover", value:reportData?.invTurnover  || "6.2x",  benchmark:reportData?.benchInvTurnover  || "Sector avg: 4–8x",       target:4,   actual:parseFloat(reportData?.invTurnover||"6.2"),   higher:true },
                { label:"Debtor Turnover",    value:reportData?.debtorTurn   || "7.8x",  benchmark:reportData?.benchDebtorTurn   || "Target: >10x",           target:10,  actual:parseFloat(reportData?.debtorTurn||"7.8"),    higher:true },
              ].map((r, i) => {
                const good = r.higher ? r.actual >= r.target : r.actual <= r.target;
                return (
                  <div key={i} style={{ padding:"14px", borderRadius:16,
                    background:good?`${C.green}06`:`${C.amber}06`,
                    border:`1px solid ${good?C.green+"20":C.amber+"25"}` }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                    <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:good?C.green:C.amber, marginBottom:4 }}>{r.value}</div>
                    <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5, marginBottom:4 }}>{r.benchmark}</div>
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:good?C.green:C.amber }}>{good?"Within benchmark":"Below benchmark"}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          {reportData?.wcNote && (
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{"Garima's Working Capital Assessment"}</div>
              <p style={{ fontFamily:F, fontSize:14, color:C.text, lineHeight:1.8, margin:0 }}>{reportData.wcNote}</p>
            </Card>
          )}
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
                          <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700,
                            background:r.fav?`${C.green}15`:`${C.red}15`, color:r.fav?C.green:C.red }}>
                            {r.fav?"Fav":"Unfav"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{ borderLeft:`4px solid ${C.amber}` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>Variance Commentary</div>
            {[
              { item:"Revenue ₹52L above budget", note:"Driven by early renewal from Client A (+₹38L) and new logo added in mid-Feb (+₹14L). March pipeline looks equally strong.", c:C.green },
              { item:"Headcount costs ₹7L under budget", note:"2 open roles not yet filled — saving budget but creating capacity risk in engineering. Hiring to resume in March.", c:C.green },
              { item:"Cash balance ₹0.3Cr below budget", note:"Advance vendor payments pulled forward from March. Temporary — will normalise by end of March.", c:C.amber },
            ].map((v,i) => (
              <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:8, height:8, borderRadius:60, background:v.c, flexShrink:0, marginTop:6 }}/>
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
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          {/* Header */}
          <div style={{ padding:"18px 22px", borderRadius:16,
            background:`linear-gradient(135deg,${C.blue}10,${C.teal}08)`,
            border:`1px solid ${C.blue}18` }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:4 }}>
              {"Unit Economics"}
            </div>
            <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>
              {"The metrics investors will scrutinise in your data room — CAC, LTV, payback, retention."}
            </div>
          </div>
 
          {/* Core Metrics — 2x2 big cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
              <div key={i} style={{ padding:"18px", borderRadius:16,
                background: m.good===true ? `${C.green}08` : m.good===false ? `${C.red}06` : C.bg2,
                border:`1px solid ${m.good===true ? C.green+"25" : m.good===false ? C.red+"20" : C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                    textTransform:"uppercase", letterSpacing:"0.07em" }}>{m.label}</div>
                  {m.good !== null && (
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:F,
                      color: m.good ? C.green : C.red,
                      background: m.good ? `${C.green}15` : `${C.red}10`,
                      padding:"2px 8px", borderRadius:60 }}>
                      {m.good ? "On track" : "Watch"}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:FM, fontWeight:700, fontSize:18, color:m.value==="—"?C.dim:m.color, marginBottom:4 }}>
                  {m.value}
                </div>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:600, color:C.text, marginBottom:6 }}>{m.full}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.blue, fontWeight:600,
                  background:`${C.blue}08`, padding:"4px 10px", borderRadius:16, marginBottom:6 }}>
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
                <div key={i} style={{ padding:"14px", borderRadius:16,
                  background: m.good===true ? `${C.green}08` : m.good===false ? `${C.amber}08` : C.bg2,
                  border:`1px solid ${m.good===true ? C.green+"20" : m.good===false ? C.amber+"25" : C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{m.label}</div>
                  <div style={{ fontFamily:FM, fontWeight:800, fontSize:16,
                    color:m.value==="—"?C.dim:m.color, marginBottom:4 }}>{m.value}</div>
                  <div style={{ fontFamily:F, fontSize:10, color:C.blue, lineHeight:1.5 }}>{m.benchmark}</div>
                  {m.good !== null && (
                    <div style={{ fontFamily:F, fontSize:10, fontWeight:700,
                      color:m.good?C.green:C.amber, marginTop:4 }}>
                      {m.good ? "On track" : "Needs attention"}
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
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"Garima's Assessment"}
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
                {"Request a deep-dive session"}
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
                borderRadius:16, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>
              Discuss your fundraise readiness with Garima
            </a>
          </div>
          {(reportData?.packNote || reportData?.reportNote) && (
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8, fontFamily:F }}>
                {"Garima's Fundraise Assessment"}
              </div>
              <p style={{ fontSize:14, color:C.text, lineHeight:1.8, fontFamily:F, margin:0 }}>
                {reportData.packNote || reportData.reportNote}
              </p>
            </Card>
          )}
        </div>
      )}
 
{tab === "loan" && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
          {/* HEADER */}
          <div style={{ padding:"20px 22px", borderRadius:16, background:`linear-gradient(135deg,${C.blue}12,${C.purple}08)`, border:`1px solid ${C.blue}20` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{ width:44, height:52, borderRadius:16, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{"🏦"}</div>
              <div>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{"Loan Readiness Report"}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{reportData?.monthLabel ? `As of ${reportData.monthLabel}` : "Current Period"}{" | Prepared by Garima Agarwal CA"}</div>
              </div>
            </div>
            {reportData?.loanNote && (
              <div style={{ marginTop:10, padding:"12px 14px", borderRadius:16, background:"rgba(255,255,255,0.7)", border:`1px solid ${C.blue}20` }}>
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
                <div style={{ fontFamily:F, fontWeight:700, fontSize:22, color:C.blue, lineHeight:1 }}>{reportData?.loanScore || 64}<span style={{ fontSize:14, color:C.muted, fontWeight:500 }}>{"/100"}</span></div>
                <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
                  {(reportData?.loanScore || 64) >= 75 ? "Strong Profile — Eligible for Most Schemes" : (reportData?.loanScore || 64) >= 55 ? "Moderate Profile — Eligible with Preparation" : "Early Stage — Build Track Record First"}
                </div>
              </div>
              <ScoreGauge score={parseInt(reportData?.loanScore) || 64} color={C.blue} size={100}/>
            </div>
            <div style={{ height:8, borderRadius:12, background:"#fff" }}>
              <div style={{ height:"100%", borderRadius:12, width:`${reportData?.loanScore || 64}%`, background:`linear-gradient(90deg,${C.blue},${C.purple})`, transition:"width 0.6s" }}/>
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
                <div key={i} style={{ padding:"12px 14px", borderRadius:16, background:"#fff", border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.value==="—"?C.dim:item.color }}>{item.value}</div>
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
                <div key={i} style={{ padding:"12px 14px", borderRadius:16, background:item.flag?`${C.amber}08`:C.bg2, border:`1px solid ${item.flag?C.amber+"30":C.border}` }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:item.value==="Not provided"?C.dim:item.flag?C.amber:C.text }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>
 
          {/* KEY DEBT RATIOS — always visible */}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Key Debt Ratios"}</div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14 }}>{"Assessed by Garima — set in admin"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                  padding:"16px", borderRadius:16,
                  background: r.good===true ? `${C.green}08` : r.good===false ? `${C.amber}08` : C.bg2,
                  border:`1px solid ${r.good===true ? C.green+"25" : r.good===false ? C.amber+"30" : C.border}`
                }}>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{r.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, marginBottom:4,
                    color: r.good===true ? C.green : r.good===false ? C.amber : C.dim }}>
                    {r.value || "—"}
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginBottom:6 }}>{r.benchmark}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.6, marginBottom:r.value?8:0 }}>{r.what}</div>
                  {r.value && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:F, fontSize:11, fontWeight:700,
                      color: r.good ? C.green : C.amber,
                      background: r.good ? `${C.green}15` : `${C.amber}15`,
                      padding:"3px 10px", borderRadius:60 }}>
                      {r.good ? "Within range" : "Needs attention"}
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
          {(function() {
            var flags = [];
            if (reportData?.currentRatio && parseFloat(reportData.currentRatio)<2) flags.push("Current Ratio is below 2.0x — banks prefer a stronger liquidity position");
            if (reportData?.dscr && parseFloat(reportData.dscr)<1.25) flags.push("DSCR below 1.25x — lenders will question debt repayment capacity");
            if (reportData?.interestCoverage && parseFloat(reportData.interestCoverage)<3) flags.push("Interest Coverage below 3.0x — may limit eligibility for larger amounts");
            if (reportData?.debtEbitda && parseFloat(reportData.debtEbitda)>3) flags.push("Debt/EBITDA above 3.0x — lenders may view this as overleveraged relative to earnings");
            if (reportData?.existingDebt && reportData.existingDebt.toLowerCase()!=="nil" && reportData.existingDebt!=="Not provided") flags.push(`Existing debt of ${reportData.existingDebt} — lenders will factor this into total exposure`);
            var rkpi = kpis?.find(k=>k.label?.toLowerCase().includes("runway"));
            if (rkpi && parseFloat(rkpi.value)<6) flags.push("Runway below 6 months — banks may see this as distress. Consider raising equity first");
            return flags.length>0 ? (
              <Card style={{ borderLeft:`4px solid ${C.amber}`, background:`${C.amber}06` }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.amber, marginBottom:12 }}>{"Auto-Flagged Issues"}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {flags.map((f,i) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"9px 12px", borderRadius:16, background:"rgba(255,255,255,0.6)", fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6 }}>
                      <span style={{ color:C.amber, flexShrink:0 }}>{"•"}</span>{f}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null;
          }())}
 
          {/* IMPROVEMENTS */}
          {Array.isArray(reportData?.loanImprovements) && reportData.loanImprovements.some(x=>x) && (
            <Card style={{ borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.blue, marginBottom:12 }}>{"Recommended Improvements"}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {reportData.loanImprovements.filter(x=>x).map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 14px", borderRadius:16, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, fontSize:13, color:C.text, fontFamily:F, lineHeight:1.6, alignItems:"flex-start" }}>
                    <span style={{ fontFamily:FM, fontWeight:700, color:C.blue, background:`${C.blue}15`, borderRadius:16, padding:"2px 8px", fontSize:11, flexShrink:0, marginTop:1 }}>{i+1}</span>
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
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 14px", borderRadius:16, background:"#fff", border:`1px solid ${s.hot?s.color+"30":C.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0, marginTop:5 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{s.name}</span>
                      {s.hot && <span style={{ fontFamily:F, fontSize:10, fontWeight:700, color:s.color, background:`${s.color}15`, padding:"2px 8px", borderRadius:60 }}>{"RECOMMENDED"}</span>}
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
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:16, background:item.done?`${C.green}08`:C.bg2, border:`1px solid ${item.done?C.green+"20":C.border}` }}>
                  <span style={{ fontSize:14 }}>{item.done ? "✓" : "⬜"}</span>
                  <span style={{ fontFamily:F, fontSize:13, color:item.done?C.text:C.muted }}>{item.doc}</span>
                  <span style={{ marginLeft:"auto", fontFamily:F, fontSize:10, fontWeight:700, color:item.done?C.green:C.amber, background:item.done?`${C.green}15`:`${C.amber}15`, padding:"2px 8px", borderRadius:60 }}>{item.done?"Ready":"Pending"}</span>
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
              <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:16, background:`${C.green}10`, border:`1.5px solid ${C.green}30`, color:C.green, fontFamily:F, fontWeight:700, fontSize:13, textDecoration:"none" }}>{"WhatsApp Garima"}</a>
              <button onClick={() => { const html = generateLoanPDF({ client, reportData, kpis }); const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:16, background:`${C.blue}10`, border:`1.5px solid ${C.blue}25`, color:C.blue, fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {"Download Full Report"}
              </button>
              <div style={{ display:"inline-flex", alignItems:"center", padding:"11px 20px", borderRadius:16, background:`${C.purple}10`, border:`1.5px solid ${C.purple}20`, fontFamily:F, fontSize:12, fontWeight:600, color:C.purple }}>{"Loan Package from Rs.15,000"}</div>
            </div>
          </Card>
 
        </div>
      )}
 
      {tab === "fundutil" && <FundUtilisation reportData={reportData} accentColor={C.blue}/>}
      {tab === "verticalpnl" && <VerticalPnL reportData={reportData} accentColor={C.blue}/>}
      {tab === "scenario" && <ScenarioModelling reportData={reportData} accentColor={C.blue} client={client}/>}
      {tab === "spend" && <SpendIntelligence reportData={reportData} accentColor={C.blue} client={client}/>}
      {tab === "bizintel" && <BusinessIntelligence reportData={reportData} accentColor={C.blue} client={client}/>}
 
      {tab === "boardpacks" && (
        <div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.7 }}>
            Monthly packs prepared by Garima — updated by the 20th of each month.
          </div>
          {archiveDocs.length === 0 && !isDemo && (
            <EmptyState icon="ti-chart-bar" title="No packs uploaded yet" sub="Garima will upload your monthly pack here by the 20th of each month."/>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {archiveDocs.map((p,i) => <ArchiveRow key={i} p={p} label="Starter Pack"/>)}
          </div>
          <Card style={{ marginTop:20, background:`${C.blue}06`, borderColor:`${C.blue}20` }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
              <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
              Questions?{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
            </div>
          </Card>
        </div>
      )}
      </div>
    </PackLayout>
  );
}
 
function BoardPacksTabbed() {
  const [tab, setTab] = useState("msme");
  const tabs = [
    { id:"msme",      label:"Growth Pack",   icon:"users", color:C.blue   },
    { id:"corporate", label:"Premium Pack",  emoji:"ti-building-bank", color:C.purple },
    { id:"cfo",       label:"Starter Pack",  emoji:"ti-chart-bar", color:C.teal   },
  ];
  const content = { msme:<MSMEPackContent/>, corporate:<CorporatePackContent/>, cfo:<CFOPackContent/> };
  return (
    <div>
      <div style={{ fontSize:12, color:C.muted, fontFamily:F, marginBottom:20 }}>
        Monthly packs prepared by Garima — updated by the 20th of each month.
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"10px 18px", borderRadius:60, border:"none", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700, transition:"all 0.15s", background:tab===t.id?t.color:C.bg2, color:tab===t.id?"white":C.muted, outline:`1.5px solid ${tab===t.id?t.color:C.border}`, boxShadow:tab===t.id?`0 4px 14px ${t.color}35`:"none", touchAction:"manipulation" }}>
            <><i className={"ti " + (t.icon||"ti-circle")} style={{fontSize:13, marginRight:5}}/>{t.label}</>
          </button>
        ))}
      </div>
      {content[tab]}
      <Card style={{ marginTop:24, background:`${C.blue}06`, borderColor:`${C.blue}20` }}>
        <div style={{ fontSize:12, color:C.muted, fontFamily:F, lineHeight:1.7 }}>
          <strong style={{ color:C.text }}>Packs uploaded by the 20th of each month.</strong>{" "}
          Questions about the pack?{" "}
          <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
        </div>
      </Card>
    </div>
  );
}
 
// ─── CFO PACKS (existing component) ──────────────────────────────────────────
function CFOPacks({ client, reportData }) {
  const packType  = client.client_pack || client.clientPack || "startup";
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
 
  // Map live docs to ARCHIVE format; demo clients see sample packs, real clients see [] when empty
  const archiveDocs = liveDocs.length > 0
    ? liveDocs.map(d => ({
        name: d.name,
        date: d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—",
        size: d.file_size || "—",
        uploadedAt: d.created_at || "",
        file_url: d.file_url,
        new: d.created_at ? (new Date() - new Date(d.created_at)) < 35 * 24 * 60 * 60 * 1000 : false,
      }))
    : isDemo ? ARCHIVE : [];
 
  return (
    <div className="ns-page">
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:40, height:52, borderRadius:16, background:data.grad,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
            <i className={"ti " + (data.icon||"ti-circle")} style={{fontSize:20}}/>
          </div>
          <div>
            <h2 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", margin:0 }}>{data.label}</h2>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0 }}>{data.tagline}</p>
          </div>
        </div>
      </div>
 
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["pack","Smart Analysis"],["boardpacks","Board Packs"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"9px 18px", borderRadius:60, border:"none", cursor:"pointer",
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
          <Card style={{ marginBottom:14, borderLeft:`3px solid ${data.color}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:data.color, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
              Garima's Analysis — Feb 2026
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
                borderRadius:16, background:`${C.green}10`, border:`1.5px solid ${C.green}30`,
                color:C.green, fontFamily:F, fontWeight:700, fontSize:13 }}>
              Discuss this pack with Garima
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
    <div className="ns-page">
      <SectionTitle sub="Live status of your valuation engagement.">
        Valuation Status
      </SectionTitle>
 
      {/* Status card */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Engagement</div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{eng.type}</div>
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
          <div style={{ height:6, borderRadius:12, background:"#fff", marginBottom:24 }}>
            <div style={{ height:"100%", borderRadius:12, background:C.grad1,
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
 
        <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.blue}08`,
          border:`1px solid ${C.blue}20` }}>
          <span style={{ fontFamily:F, fontSize:13, color:C.blue, fontWeight:600 }}>
            Currently: <strong>{eng.stages[eng.status]}</strong> — Garima is building the DCF model. On track for {eng.expectedDate}.
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
              borderRadius:16, background: d.done ? `${C.green}08` : C.bg,
              border:`1px solid ${d.done ? C.green+"25" : C.border}` }}>
              <div style={{ width:20, height:20, borderRadius:16, flexShrink:0,
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
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:16,
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
    <div className="ns-page">
      <SectionTitle sub="Book a 30-min Valuation call or 60-min CFO Strategy session with Garima.">
        Book a Call
      </SectionTitle>
 
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }} className="cal-grid">
        <a href="https://calendly.com/agrgarima/30min" target="_blank" rel="noopener"
          style={{ textDecoration:"none" }}>
          <Card style={{ padding:24, cursor:"pointer",
            transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(59,111,247,0.15)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ marginBottom:14 }}><i className="ti ti-bolt" style={{fontSize:28, color:C.blue}}/></div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:8 }}>
              30-min Valuation Call
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20 }}>
              Questions about your valuation report, methodology, UDIN, or Section 56(2)(viib) compliance.
            </p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 16px", borderRadius:16, background:C.blue }}>
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
          <Card style={{ padding:24, cursor:"pointer",
            transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(124,92,245,0.15)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}>
            <div style={{ marginBottom:14 }}><i className="ti ti-brain" style={{fontSize:28, color:C.purple}}/></div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:8 }}>
              60-min CFO Strategy Call
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20 }}>
              Monthly CFO review, cash flow planning, investor prep, board pack walkthrough.
            </p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 16px", borderRadius:16, background:C.purple }}>
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
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
          What to expect
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { icon:"ti-bolt", title:"30-min Valuation", desc:"Best for: UDIN queries, valuation report review, methodology questions, Section 56 compliance." },
            { icon:"ti-brain", title:"60-min CFO Strategy", desc:"Best for: Monthly review, fundraise prep, cash flow planning, board pack walkthrough, investor narrative." },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:16, background:C.bg }}>
              <i className={"ti " + (item.icon||"ti-circle")} style={{fontSize:20, color:C.blue}}/>
              <div>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{item.title}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
 
      <div style={{ padding:"12px 16px", borderRadius:16,
        background:`${C.green}06`, border:`1px solid ${C.green}20` }}>
        <div style={{ fontFamily:F, fontSize:12, color:"#047857", lineHeight:1.7 }}>
          Can't find a slot? WhatsApp Garima directly at{" "}
          <a href={WA} target="_blank" rel="noopener"
            style={{ color:C.green, fontWeight:700 }}>+91 98335 85810</a>
        </div>
      </div>
      <style>{`@media(max-width:500px){.cal-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
 
// ─── DOWNLOAD UTILITIES ───────────────────────────────────────────────────────
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
      console.warn("Requests table not found — request not saved to DB:", e.message);
    }
    // Notify Garima — fire and forget, never blocks UX
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: form.name || client?.name || "Unknown",
        company:    form.company || client?.company || "",
        service:    SERVICES.find(s=>s.id===selected)?.name || selected,
        email:      form.email || client?.email || "",
        notes:      form.notes || "",
      }),
    }).catch(() => {});
    setLoading(false);
    setSubmitted(true);
  };
 
  if (submitted) return (
    <div style={{ padding:32, maxWidth:520 }}>
      <Card style={{ textAlign:"center", padding:48 }}>
        <div style={{ marginBottom:16 }}><i className="ti ti-circle-check" style={{fontSize:48, color:C.green}}/></div>
        <h2 style={{ fontFamily:F, fontWeight:800, fontSize:13, color:C.text, marginBottom:8 }}>Request Submitted!</h2>
        <p style={{ fontFamily:F, fontSize:14, color:C.muted, lineHeight:1.7, marginBottom:24 }}>
          Garima will review your request and send a scoped proposal within 24 hours. You'll hear from her at <strong>{form.email || client?.email}</strong>.
        </p>
        <div style={{ padding:"12px 16px", borderRadius:16, background:`${C.green}0A`,
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
            style={{ padding:"10px 20px", borderRadius:16, border:`1.5px solid ${C.border}`,
              background:"none", fontFamily:F, fontWeight:600, fontSize:13, color:C.muted, cursor:"pointer" }}>
            Make another request
          </button>
          <button onClick={() => setPage("overview")}
            style={{ padding:"10px 20px", borderRadius:16, border:"none",
              background:C.grad1, color:"white", fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Back to Overview →
          </button>
        </div>
      </Card>
    </div>
  );
 
  return (
    <div className="ns-page" style={{ maxWidth:900 }}>
      <SectionTitle sub="Get a scoped proposal within 24 hours.">Request a Service</SectionTitle>
 
      {/* Stepper */}
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:16, maxWidth:500 }}>
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
                style={{ position:"relative", padding:20, borderRadius:16,
                  border:`2px solid ${selected===s.id ? C.blue : C.border}`,
                  background: selected===s.id ? `${C.blue}06` : C.bg2,
                  cursor:"pointer", transition:"all 0.2s",
                  boxShadow: selected===s.id ? `0 0 0 4px ${C.blue}15` : "none" }}>
                {s.popular && (
                  <div style={{ position:"absolute", top:-10, right:16,
                    background:C.grad3, color:"white", fontSize:10, fontWeight:800,
                    padding:"3px 10px", borderRadius:60, fontFamily:F }}>Most Popular</div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{s.name}</div>
                  <Badge color={s.tagColor}>{s.tag}</Badge>
                </div>
                <div style={{ fontFamily:FM, fontWeight:700, fontSize:14, color:C.blue, marginBottom:4 }}>{s.price}</div>
                <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { if (!selected) { alert("Please select a service."); return; } setStep(2); }}
            style={{ padding:"14px 32px", borderRadius:16, border:"none",
              background: selected ? C.grad1 : C.bg3, color: selected ? "white" : C.muted,
              fontFamily:F, fontWeight:700, fontSize:13, cursor: selected ? "pointer" : "default",
              boxShadow: selected ? "0 2px 8px rgba(59,111,247,0.18)" : "none", transition:"all 0.2s" }}>
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
                style={{ width:"100%", padding:"10px 13px", borderRadius:16, fontSize:13,
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
              style={{ width:"100%", padding:"10px 13px", borderRadius:16, fontSize:13,
                border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}
            />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(1)}
              style={{ padding:"12px 20px", borderRadius:16, border:`1px solid ${C.border}`,
                background:"none", fontFamily:F, fontWeight:600, fontSize:14, color:C.muted, cursor:"pointer" }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              style={{ flex:1, padding:"13px 0", borderRadius:16, border:"none",
                background:C.grad1, color:"white", fontFamily:F, fontWeight:700, fontSize:15,
                cursor:"pointer", boxShadow:"0 2px 8px rgba(59,111,247,0.18)" }}>
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
              style={{ padding:"12px 20px", borderRadius:16, border:`1px solid ${C.border}`,
                background:"none", fontFamily:F, fontWeight:600, fontSize:14, color:C.muted, cursor:"pointer" }}>
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex:1, padding:"13px 0", borderRadius:16, border:"none",
                background: agreed ? C.grad1 : C.bg3, color: agreed ? "white" : C.muted,
                fontFamily:F, fontWeight:700, fontSize:15,
                cursor: agreed && !loading ? "pointer" : "default",
                opacity: loading ? 0.75 : 1,
                boxShadow: agreed ? "0 2px 8px rgba(59,111,247,0.18)" : "none", transition:"all 0.2s" }}>
              {loading ? "Submitting…" : "Submit Request"}
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
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ width:40, height:52, borderRadius:16,
            background: isUnpaid ? `${C.amber}15` : `${C.green}15`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
            {isUnpaid ? "○" : "✓"}
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
          <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color: isUnpaid ? C.amber : C.green }}>
            {inv.amount}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8, justifyContent:"flex-end" }}>
            <button onClick={() => { setSelected(inv); setView("detail"); }}
              style={{ padding:"7px 14px", borderRadius:16, border:`1px solid ${C.border}`,
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
          cursor:"pointer", marginBottom:14, padding:0, fontWeight:600 }}>
        ← Back to Invoices
      </button>
 
      {/* Invoice header */}
      <div style={{ padding:"28px 32px", borderRadius:12,
        background:"linear-gradient(135deg,#0A1128 0%,#1a2a5e 100%)",
        color:"white", marginBottom:14, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120,
          borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:20 }}>
          <div>
            <div style={{ fontFamily:FM, fontSize:11, opacity:0.5, marginBottom:4, letterSpacing:"0.08em" }}>INVOICE</div>
            <div style={{ fontFamily:FM, fontWeight:700, fontSize:18, marginBottom:6 }}>{selected.id}</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>Finzzup Advisory LLP</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>garima@finzzup.com</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <Badge color={selected.status==="paid"?C.green:C.amber}
              bg={selected.status==="paid"?"#ECFDF5":"#FFFBEB"}>
              {selected.status==="paid" ? "Paid" : "Pending"}
            </Badge>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6, marginTop:8 }}>Issued: {selected.date}</div>
            <div style={{ fontFamily:F, fontSize:12, opacity:0.6 }}>Due: {selected.due}</div>
          </div>
        </div>
      </div>
 
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>Bill To</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:600 }}>{client?.name}</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>{client?.company}</div>
        <div style={{ fontFamily:F, fontSize:13, color:C.muted }}>{client?.email}</div>
      </Card>
 
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>Services</div>
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
            <span style={{ fontFamily:FM, fontSize:18, fontWeight:600, color:C.text }}>{item.total}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", padding:"14px 0 0",
          borderTop:`2px solid ${C.border}`, marginTop:8 }}>
          <div style={{ fontFamily:F, fontSize:14, fontWeight:700, color:C.blue }}>
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
        onClick={async () => {
          const { downloadInvoicePDF } = await _pdfMod;
          downloadInvoicePDF(selected, client);
        }}
        style={{ width:"100%", padding:"13px 0", borderRadius:16, border:`1.5px solid ${C.blue}`,
          background:"transparent", color:C.blue, fontFamily:F, fontWeight:700, fontSize:14,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        ⬇️ Download Invoice PDF
      </button>
    </div>
  );
 
  return (
    <div className="ns-page">
      <SectionTitle sub="Auto-generated invoices for your engagements.">Invoices</SectionTitle>
 
      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }} className="inv-sum">
        {[
          { label:"Total Outstanding", value:"₹50,000", color:C.amber, icon:"ti-clock" },
          { label:"Paid This Year",    value:"₹1,15,000",color:C.green, icon:"ti-circle-check" },
          { label:"Total Invoices",    value:"3",         color:C.blue,  icon:"▤" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:18, textAlign:"center" }}>
            <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
            <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:s.color, marginBottom:4 }}>{s.value}</div>
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
    if (docType === "report") return "ti-chart-bar";
    const ext = name?.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext))                    return "ti-file-type-pdf";
    if (["xls","xlsx","csv"].includes(ext))       return "ti-table";
    if (["doc","docx"].includes(ext))             return "ti-file-text";
    if (["jpg","jpeg","png","gif"].includes(ext)) return "ti-photo";
    if (["zip","rar"].includes(ext))              return "ti-file-zip";
    return "ti-file";
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
    <div className="ns-page" style={{ maxWidth:700 }}>
      <SectionTitle sub="Documents shared by Garima, and files you've uploaded.">My Documents</SectionTitle>
 
      {isDemo && (
        <div style={{ padding:"10px 16px", borderRadius:12, background:`${C.amber}0A`,
          border:`1px solid ${C.amber}25`, marginBottom:14,
          fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
          Demo mode — uploads disabled. Real clients can upload and download files here.
        </div>
      )}
 
      {/* Upload area */}
      {!isDemo && (
        <Card style={{ marginBottom:20 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:4 }}>
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
                <div style={{ fontSize:32, marginBottom:8 }}>↑</div>
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
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>
            All Documents ({displayDocs.length})
          </div>
          {!isDemo && !loading && displayDocs.length > 0 && (
            <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>
              From Garima + your uploads
            </div>
          )}
        </div>
 
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Array.from({length:4}).map((_,i) => (
              <div key={i} style={{ padding:"16px 18px", borderRadius:10, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:14 }}>
                <Skeleton width={36} height={36} radius={8}/>
                <div style={{ flex:1 }}>
                  <Skeleton width="50%" height={12} style={{ marginBottom:8 }}/>
                  <Skeleton width="30%" height={10}/>
                </div>
                <Skeleton width={70} height={28} radius={14}/>
              </div>
            ))}
          </div>
        )}

        {!loading && displayDocs.length === 0 && (
          <EmptyState icon="ti-folder-off" title="No documents yet" sub="Garima will upload your reports here."/>
        )}
 
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {displayDocs.map((doc, i) => {
            const byGarima = doc.uploaded_by === "garima" || doc.uploaded_by === "Garima Agarwal";
            return (
              <div key={doc.id || i} style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"12px 14px", borderRadius:12,
                background: byGarima ? `${C.blue}08` : C.bg,
                border:`1px solid ${byGarima ? C.blue+"25" : C.border}`,
                flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                  <div style={{ width:38, height:38, borderRadius:10,
                    background: byGarima ? `${C.blue}12` : `${C.muted}0A`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className={"ti " + fileIcon(doc.name, doc.file_url?.startsWith("data:text/html") ? "report" : null)}
                      style={{ fontSize:18, color: byGarima ? C.blue : C.muted }}/>
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
                        {byGarima ? "From Garima" : "You"}
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
                    style={{ padding:"7px 14px", borderRadius:16,
                      border:`1.5px solid ${C.blue}`, background:"transparent",
                      color:C.blue, fontFamily:F, fontWeight:700, fontSize:12,
                      cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {doc.file_url?.startsWith("data:text/html") ? "View Report" : "⬇ Download"}
                  </button>
 
                  {/* Delete — only for files the client uploaded themselves */}
                  {!isDemo && !byGarima && (
                    <button onClick={() => handleDelete(doc)}
                      style={{ padding:"7px 10px", borderRadius:16,
                        border:`1px solid ${C.border}`, background:"none",
                        color:C.red, cursor:"pointer", fontSize:14 }}>
                      ×
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
          <strong>Need to send a large file?</strong> WhatsApp it directly to Garima at{" "}
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
  const uae = isUAE(client);
 
  // Use live admin-entered data if available, else fall back to defaults
  const rd = reportData?.treasury;
 
  const UAE_T = {
    totalCash:   rd?.totalCash   || "AED 620K",
    investedPct: rd?.investedPct || 55,
    yieldPA:     rd?.yieldPA     || "AED 22K",
    dso: 38, dpo: 28, dio: 15,
    cashPositions: (rd?.cashPositions?.some(p=>p.bank)) ? rd.cashPositions : [
      { bank:"Emirates NBD — Current A/C",  balance:"AED 210K", type:"Operating",    rate:"0%",   flag:false },
      { bank:"Mashreq — Term Deposit",       balance:"AED 300K", type:"Term Deposit", rate:"5.2%", flag:false },
      { bank:"ADCB — Islamic Wakala",        balance:"AED 80K",  type:"Islamic Inv.", rate:"4.8%", flag:false },
      { bank:"FAB — Current A/C",            balance:"AED 30K",  type:"Reserve",      rate:"0%",   flag:true,  note:"Consider moving to Wakala" },
    ],
    maturitySchedule: (rd?.maturitySchedule?.some(m=>m.item)) ? rd.maturitySchedule : [
      { item:"Mashreq Term Deposit",    maturity:"15 Apr 2026", amount:"AED 150K", action:"Renew"      },
      { item:"ADCB Islamic Wakala",     maturity:"30 Apr 2026", amount:"AED 80K",  action:"Redeem"     },
      { item:"Mashreq TD — Tranche 2", maturity:"31 May 2026", amount:"AED 150K", action:"Auto-renew" },
    ],
    recommendations: (rd?.recommendations?.some(r=>r.text)) ? rd.recommendations : [
      { priority:"High",   text:"Hold AED 92.5K cash reserve for Q1 VAT payment due 28 April — don't lock in FDs." },
      { priority:"High",   text:"Renew Mashreq TD at 5.2% — UAE rates stabilising. Lock in before potential CBUAE cut." },
      { priority:"Medium", text:"Move FAB idle AED 30K to ADCB Wakala — earn 4.8% profit share on Islamic structure." },
      { priority:"Low",    text:"Consider ENBD Emirates Islamic Murabaha for April surplus — projected AED 50K." },
    ],
  };
 
  const TREASURY_DATA = uae ? UAE_T : {
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
    <div className="ns-page">
      <SectionTitle sub={uae ? "Multi-currency cash, term deposits, and yield optimisation." : "Cash visibility, FD tracking, and yield optimisation."}>
        {uae ? "Treasury Management (AED)" : "Treasury Management"}
      </SectionTitle>
 
      {/* UAE: Cash Conversion Cycle */}
      {uae && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Days Sales Outstanding (DSO)", value:`${UAE_T.dso} days`, color:C.blue,  icon:"↑" },
            { label:"Days Payable Outstanding (DPO)",value:`${UAE_T.dpo} days`, color:C.green, icon:"↓" },
            { label:"Cash Conversion Cycle",         value:`${UAE_T.dso - UAE_T.dpo + UAE_T.dio} days`, color:C.amber, icon:"🔄" },
          ].map((s,i) => (
            <Card key={i} style={{ padding:18 }}>
              <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
              <div style={{ fontFamily:F, fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}
 
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:14 }}>
        {[["overview","Overview"],["maturity","Maturity Schedule"],["recommendations","Recommendations"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"7px 16px", background:"none", border:"none",
            borderBottom: tab===id ? `2px solid ${C.blue}` : "2px solid transparent",
            cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:tab===id?600:400,
            color: tab===id ? C.blue : C.muted, marginBottom:-1, transition:"all 0.1s" }}>
            {lbl}
          </button>
        ))}
      </div>
 
      {tab === "overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }} className="tr-grid">
            {[
              { label:"Total Cash",      value:TREASURY_DATA.totalCash,              icon:"ti-wallet", color:C.blue  },
              { label:uae?"In Term Deposits":"Invested in FDs", value:`${TREASURY_DATA.investedPct}%`, icon:"ti-trending-up", color:C.teal  },
              { label:"Annual Yield",    value:TREASURY_DATA.yieldPA,                icon:"ti-building-bank", color:C.green },
            ].map((s,i) => (
              <Card key={i} style={{ padding:18 }}>
                <div style={{ marginBottom:10 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:s.color, marginBottom:4 }}>{s.value}</div>
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
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color: p.flag ? C.amber : C.text }}>
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
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:C.blue }}>{m.amount}</div>
                <Badge color={m.action==="Redeem"?C.red:C.green}>{m.action}</Badge>
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:16, background:`${C.amber}08`, border:`1px solid ${C.amber}25` }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.amber, fontWeight:600 }}>
              ⚠️ ₹15L matures 28 Mar — time with advance tax payment to avoid overdraft facility.
            </span>
          </div>
        </Card>
      )}
 
      {tab === "recommendations" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
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
              <strong>Want a detailed treasury optimisation plan?</strong>{" "}
              <a href={WA} target="_blank" rel="noopener" style={{ color:C.green, fontWeight:700 }}>WhatsApp Garima</a>
              {" "}to discuss sweep accounts, liquid funds, and yield laddering for your cash position.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
 
// ─── UAE DISCLAIMER BANNER ────────────────────────────────────────────────────
function UAEDisclaimer() {
  return (
    <div style={{ margin:"0 0 20px", padding:"10px 16px", borderRadius:12,
      background:C.warningBg, border:`1px solid ${C.warningBorder}`,
      display:"flex", gap:10, alignItems:"flex-start" }}>
      <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
      <p style={{ fontFamily:F, fontSize:12, color:C.warning, lineHeight:1.6, margin:0 }}>
        {UAE_DISCLAIMER}
      </p>
    </div>
  );
}
 
// ─── VAT DASHBOARD ────────────────────────────────────────────────────────────
function VATDashboard({ client, reportData }) {
  const [tab, setTab] = useState("overview");
  const rd = reportData?.vat || {};
 
  const vatData = {
    trnVAT:             client?.trnVAT || rd.trnVAT || "Not registered",
    registrationStatus: client?.vatRegistered ? "Active" : "Not Registered",
    outputVAT:          rd.outputVAT    || 185000,
    inputVAT:           rd.inputVAT     || 92500,
    vatPayable:         rd.vatPayable   || 92500,
    nextDeadline:       rd.nextDeadline || "28 Apr 2026",
    filingPeriod:       rd.filingPeriod || "Q1 2026 (Jan–Mar)",
    pendingReturns: rd.pendingReturns || [
      { period:"Q4 2025 (Oct–Dec)", due:"28 Jan 2026", status:"Filed", vatNet:"AED 74,200" },
      { period:"Q3 2025 (Jul–Sep)", due:"28 Oct 2025", status:"Filed", vatNet:"AED 68,500" },
      { period:"Q1 2026 (Jan–Mar)", due:"28 Apr 2026", status:"Due",   vatNet:"AED 92,500" },
    ],
    cashImpact: rd.cashImpact || [
      { month:"Oct", collected:58000, paid:24000, net:34000 },
      { month:"Nov", collected:64000, paid:27000, net:37000 },
      { month:"Dec", collected:71000, paid:32000, net:39000 },
      { month:"Jan", collected:62000, paid:28000, net:34000 },
      { month:"Feb", collected:68000, paid:31000, net:37000 },
      { month:"Mar", collected:55000, paid:33000, net:22000 },
      { month:"Apr", collected:null,  paid:null,  forecast:25000 },
    ],
  };
 
  const tabs = [["overview","Overview"],["returns","Returns"],["cashimpact","Cash Impact"],["invoices","🧾 VAT Invoices"]];
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:20 }}>
        <div>
          <h2 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", margin:0 }}>VAT Dashboard</h2>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>UAE VAT tracking, filing reminders, and cash impact.</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:60,
            background:"#E8F5EE", border:"1px solid #86EFAC", color:"#15803D", fontSize:12, fontWeight:700, fontFamily:F }}>
            ✅ {vatData.registrationStatus}
          </span>
          <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>TRN: {vatData.trnVAT}</span>
        </div>
      </div>
 
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:14 }}>
        {tabs.map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"7px 16px", background:"none", border:"none",
            borderBottom: tab===id ? `2px solid ${C.green}` : "2px solid transparent",
            cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:tab===id?600:400,
            color: tab===id ? C.green : C.muted, marginBottom:-1, transition:"all 0.1s" }}>
            {lbl}
          </button>
        ))}
      </div>
 
      {tab === "overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
            {[
              { label:"Output VAT (Collected)", value:fmtAED(vatData.outputVAT), color:C.blue,  icon:"↑" },
              { label:"Input VAT (Paid)",        value:fmtAED(vatData.inputVAT),  color:C.green, icon:"↓" },
              { label:"VAT Payable",             value:fmtAED(vatData.vatPayable),color:C.amber, icon:"ti-cash" },
            ].map((s,i) => (
              <Card key={i} style={{ padding:18 }}>
                <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
              </Card>
            ))}
          </div>
          <Card style={{ background:"#FFFBEB", border:"1px solid #FCD34D" }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:6 }}>📅 Next Filing Deadline</div>
            <div style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.7 }}>
              <strong>{vatData.filingPeriod}</strong> — Due <strong>{vatData.nextDeadline}</strong><br/>
              VAT Payable: <strong>{fmtAED(vatData.vatPayable)}</strong> — ensure cash is available 3–5 days before filing date.
            </div>
            <button onClick={() => window.open(WA,"_blank")} style={{ marginTop:12, padding:"9px 20px",
              borderRadius:16, border:"none", background:"#00732F", color:"white",
              fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Discuss with Garima
            </button>
          </Card>
          {/* Garima's VAT note */}
          <Card style={{ borderLeft:"3px solid #00732F", background:"#F0FDF4" }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"#15803D", marginBottom:8 }}>
              Note from Garima
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:"#166534", lineHeight:1.8, margin:0 }}>
              Q1 VAT payable of {fmtAED(vatData.vatPayable)} is due {vatData.nextDeadline}. Keep this amount in your Emirates NBD current account — do not lock it in a term deposit. I recommend filing by 24 April (4 days early) to avoid any last-minute portal issues. If your input VAT increases in Q2 due to planned equipment purchases, we can optimise timing to reduce the net payable.
            </p>
          </Card>
        </>
      )}
 
      {tab === "returns" && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>VAT Return History</div>
          {vatData.pendingReturns.map((r,i) => {
            const due = r.status === "Due";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{r.period}</div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>Due: {r.due}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                  <div style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text }}>{r.vatNet}</div>
                  <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                    background:due?"#FFFBEB":"#ECFDF5", color:due?C.amber:C.green }}>
                    {due ? "⏰ Due" : "✅ Filed"}
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:16, background:"#FEF2F2", border:"1px solid #FCA5A5" }}>
            <span style={{ fontFamily:F, fontSize:12, color:C.red, fontWeight:600 }}>
              ⚠️ Late filing penalty: AED 1,000 for first offence, AED 2,000 for repeat. File on time!
            </span>
          </div>
        </Card>
      )}
 
      {tab === "cashimpact" && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:16 }}>VAT Cash Flow Impact</div>
          {vatData.cashImpact.map((m,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:10 }}>
              <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>
                {m.month} 2026 {m.forecast && <span style={{ fontSize:10, color:C.muted, marginLeft:6 }}>(Forecast)</span>}
              </div>
              <div style={{ display:"flex", gap:24 }}>
                <span style={{ fontFamily:F, fontSize:12, color:C.blue }}>In: {m.collected ? fmtAED(m.collected) : "—"}</span>
                <span style={{ fontFamily:F, fontSize:12, color:C.red }}>Out: {m.paid ? fmtAED(m.paid) : "—"}</span>
                <span style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.green }}>Net: {fmtAED(m.net || m.forecast)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
 
      {tab === "invoices" && (
        <Card>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:8 }}>VAT-Compliant Invoice Requirements</div>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.7 }}>
            All UAE tax invoices must include the following to be FTA-compliant:
          </p>
          {[
            "The word 'Tax Invoice' prominently displayed",
            `Your Tax Registration Number (TRN): ${client?.trnVAT || "—"}`,
            "Customer's TRN (if registered for VAT)",
            "Invoice date and unique sequential invoice number",
            "Supply description, quantity, unit price",
            "Tax rate applied (5%) and VAT amount per line item",
            "Total excl. VAT, VAT amount, and total incl. VAT",
            "Currency: AED (or foreign currency with AED equivalent)",
          ].map((item,i) => (
            <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.green, fontWeight:700, flexShrink:0 }}>✓</span>
              <span style={{ fontFamily:F, fontSize:13, color:C.text }}>{item}</span>
            </div>
          ))}
          <button onClick={() => window.open(WA,"_blank")} style={{ marginTop:16, padding:"9px 20px",
            borderRadius:16, border:"none", background:C.blue, color:"white",
            fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Get VAT Invoice Template from Garima
          </button>
        </Card>
      )}
    </div>
  );
}
 
// ─── CORPORATE TAX MODULE ─────────────────────────────────────────────────────
function CorporateTax({ client, reportData, initialTab }) {
  const [tab, setTab] = useState(initialTab || "overview");
  const rd = reportData?.ct || {};
 
  const revenue       = rd.revenue     || 1850000;
  const sbrThreshold  = 3000000;
  const sbrEligible   = client?.sbrEligible ?? (revenue <= sbrThreshold);
  const qfzpStatus    = client?.qfzpStatus ?? true;
 
  const ctData = {
    trnCT:               client?.trnCT || rd.trnCT || "Pending registration",
    sbrEligible, revenue, qfzpStatus,
    taxableIncome:       rd.taxableIncome || 271000,
    adjustments: rd.adjustments || [
      { item:"Accounting Profit (per audited FS)", amount: 271000, sign: 1, note:"Net profit before CT adjustments" },
      { item:"Add: Non-deductible expenses",        amount:  12000, sign: 1, note:"Entertainment, fines, and non-business costs" },
      { item:"Less: Exempt dividend income",        amount:  18000, sign:-1, note:"Dividends from UAE subsidiary — exempt under Art. 22" },
      { item:"Less: QFZP qualifying income",        amount: 265000, sign:-1, note:"Income from qualifying activities — 0% CT rate" },
    ],
    taxableFinalIncome:  rd.taxableFinalIncome  || 0,
    effectiveCTRate:     (qfzpStatus || sbrEligible) ? 0 : 9,
    ctPayable:           (qfzpStatus || sbrEligible) ? 0 : rd.ctPayable || 24390,
    ctDue:               ctDeadline(client?.financialYearEnd),
    qualifyingPct:       rd.qualifyingPct     || 92,
    nonQualifyingPct:    rd.nonQualifyingPct  || 8,
    substanceItems: (() => {
      if (rd.substanceItems && Array.isArray(rd.substanceItems)) return rd.substanceItems;
      const si = rd.substanceItems || reportData?.ct?.substanceItems;
      if (si && typeof si === "object" && !Array.isArray(si)) return [
        { item:"Adequate employees in free zone",   done:!!si.employees },
        { item:"Adequate operating expenditure",    done:!!si.opex      },
        { item:"Physical presence in free zone",    done:!!si.presence  },
        { item:"Core income-generating activities", done:!!si.ciga      },
        { item:"Audited financial statements",      done:!!si.auditedFS },
      ];
      return [
        { item:"Adequate employees in free zone",   done:true  },
        { item:"Adequate operating expenditure",    done:true  },
        { item:"Physical presence in free zone",    done:true  },
        { item:"Core income-generating activities", done:true  },
        { item:"Audited financial statements",      done:false },
      ];
    })(),
  };
 
  const ctGroups = [
    { label:"Corporate Tax", items:[
      { id:"overview",   emoji:"ti-building-bank", label:"CT Overview"         },
      { id:"sbr",        emoji:"ti-bulb", label:"SBR Eligibility"      },
      { id:"recon",      emoji:"ti-chart-bar", label:"Tax Reconciliation"   },
    ]},
    { label:"QFZP & Substance", items:[
      { id:"qfzp",       emoji:"ti-city", label:"QFZP Tracker"        },
    ]},
    { label:"Related Party & Transfer Pricing", items:[
      { id:"rpt",        emoji:"ti-building", label:"Related Party Report" },
      { id:"connected",  emoji:"ti-user", label:"Connected Persons"    },
      { id:"armslength", emoji:"ti-scale", label:"Arm's Length Tests"   },
    ]},
  ];
 
  // Download handlers per CT section
  const downloadCT = async (section) => {
    const w = window.open("","_blank");
    const { generateRPTPDF, generateRevReconPDF, generateQFZPPDF, generateCTSummaryPDF } = await _pdfMod;
    let html = "";
    if (section === "rpt" || section === "connected" || section === "armslength") {
      html = generateRPTPDF({client, reportData});
    } else if (section === "recon") {
      html = generateRevReconPDF({client, reportData});
    } else if (section === "qfzp") {
      html = generateQFZPPDF({client, reportData});
    } else {
      html = generateCTSummaryPDF({client, reportData, ctData});
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };
 
  return (
    <PackLayout tab={tab} setTab={setTab} groups={ctGroups} accent={C.purple}>
      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12, padding:"4px 0" }}>
        <div>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>Corporate Tax (CT)</div>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>UAE Corporate Tax — effective June 2023</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ padding:"4px 12px", borderRadius:60, background:"#E8FAF3", border:"1px solid #86EFAC",
            color:C.green, fontSize:12, fontWeight:700, fontFamily:F }}>CT Rate: {ctData.effectiveCTRate}%</span>
          <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>TRN: {ctData.trnCT}</span>
          <button onClick={() => downloadCT(tab)} style={{ display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:16, border:"none", cursor:"pointer",
            background:C.purple, color:"white", fontFamily:F, fontWeight:700, fontSize:12 }}>
            Download Report
          </button>
        </div>
      </div>
      <UAEDisclaimer/>
 
 
 
 
 
      {tab === "overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
            {[
              { label:"Effective CT Rate", value:`${ctData.effectiveCTRate}%`, color:C.green, icon:"ti-building-bank" },
              { label:"CT Payable",        value:fmtAED(ctData.ctPayable),     color:ctData.ctPayable>0?C.amber:C.green, icon:"ti-cash" },
              { label:"CT Return Due",     value:ctData.ctDue,                  color:C.blue, icon:"ti-calendar" },
            ].map((s,i) => (
              <Card key={i} style={{ padding:18 }}>
                <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
              </Card>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <Card style={{ background:sbrEligible?"#F0FDF4":"#FEF2F2", border:`1px solid ${sbrEligible?"#86EFAC":"#FCA5A5"}` }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:sbrEligible?"#15803D":C.red }}>
                {sbrEligible ? "SBR Eligible" : "Not Eligible"}
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:6, lineHeight:1.6 }}>
                Revenue {fmtAED(ctData.revenue)} vs threshold AED 3M.
                {sbrEligible ? " Elect SBR in CT return → 0% tax." : " Exceeds SBR threshold."}
              </p>
            </Card>
            <Card style={{ background:qfzpStatus?"#EFF6FF":"#FEF2F2", border:`1px solid ${qfzpStatus?"#93C5FD":"#FCA5A5"}` }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:qfzpStatus?C.blue:C.red }}>
                {qfzpStatus ? "QFZP Active" : "Not Qualified"}
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:6, lineHeight:1.6 }}>
                Qualifying income taxed at 0%. Non-qualifying income at 9%.
              </p>
            </Card>
          </div>
        </>
      )}
 
      {tab === "sbr" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card style={{ background:sbrEligible?"#F0FDF4":"#FFF7ED", border:`1px solid ${sbrEligible?"#86EFAC":"#FCD34D"}` }}>
            <div style={{ fontFamily:F, fontWeight:800, fontSize:16, color:sbrEligible?"#15803D":"#92400E", marginBottom:8 }}>
              {sbrEligible ? "✅ Small Business Relief Eligible" : "⚠️ Check SBR Eligibility"}
            </div>
            <div style={{ fontFamily:F, fontSize:13, color:C.text, lineHeight:1.8 }}>
              <div>Revenue (current period): <strong>{fmtAED(ctData.revenue)}</strong></div>
              <div>SBR Revenue Threshold: <strong>AED 3,000,000</strong></div>
              <div>Status: <strong>{sbrEligible ? "✅ Below threshold" : "❌ Exceeds threshold"}</strong></div>
              <div>Regime valid until: <strong>31 December 2026</strong></div>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>SBR Rules Checklist</div>
            {[
              { rule:"Revenue ≤ AED 3M in current tax period",                              met:revenue <= sbrThreshold },
              { rule:"Revenue ≤ AED 3M in ALL previous periods (from 1 Jun 2023)",          met:true  },
              { rule:"Not member of a qualifying group (related-party threshold)",           met:true  },
              { rule:"Not a Qualifying Free Zone Person (cannot elect both SBR and QFZP)", met:!qfzpStatus },
              { rule:"SBR election must be made in CT return within 9 months of FYE",       met:false },
            ].map((r,i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ color:r.met?C.green:C.amber, fontWeight:700, flexShrink:0 }}>{r.met?"✓":"⚠"}</span>
                <span style={{ fontFamily:F, fontSize:13, color:C.text }}>{r.rule}</span>
              </div>
            ))}
          </Card>
          <Card style={{ borderLeft:"3px solid #00732F", background:"#F0FDF4" }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"#15803D", marginBottom:8 }}>Note from Garima — SBR</div>
            <p style={{ fontFamily:F, fontSize:13, color:"#166534", lineHeight:1.8, margin:"0 0 12px" }}>
              {sbrEligible
                ? "You are eligible for Small Business Relief — I recommend electing SBR in your CT return. This reduces your CT liability to AED 0 on all income (not just qualifying income). The election window is open until 9 months after your financial year-end. Important: if revenue crosses AED 3M in any future period, SBR eligibility is permanently lost for that period. Monitor monthly."
                : "Revenue has exceeded the AED 3M SBR threshold. Focus on QFZP status — ensure qualifying income stays above 95% of total revenue to maintain 0% CT on that portion. The 9% standard rate will apply on any non-qualifying income."}
            </p>
            <button onClick={() => window.open(WA,"_blank")} style={{ padding:"9px 20px",
              borderRadius:16, border:"none", background:"#00732F", color:"white",
              fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Discuss SBR with Garima
            </button>
          </Card>
        </div>
      )}
 
      {tab === "qfzp" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <Card>
              <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:4 }}>Qualifying Income %</div>
              <div style={{ fontFamily:F, fontSize:18, fontWeight:700, color:C.green }}>{ctData.qualifyingPct}%</div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:4 }}>Taxed at 0% CT</div>
            </Card>
            <Card>
              <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:4 }}>Non-Qualifying %</div>
              <div style={{ fontFamily:F, fontSize:18, fontWeight:700, color:ctData.nonQualifyingPct>=5?C.red:C.amber }}>{ctData.nonQualifyingPct}%</div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:4 }}>De-minimis: must be &lt;5% or &lt;AED 5M</div>
            </Card>
          </div>
          {ctData.nonQualifyingPct >= 5 && (
            <Card style={{ background:"#FEF2F2", border:"1px solid #FCA5A5" }}>
              <div style={{ fontFamily:F, fontWeight:700, color:C.red, marginBottom:6 }}>⚠️ De-minimis Rule at Risk</div>
              <p style={{ fontFamily:F, fontSize:13, color:"#7F1D1D", lineHeight:1.6 }}>
                Non-qualifying income at {ctData.nonQualifyingPct}% — at the de-minimis boundary. If this exceeds 5% of total revenue OR AED 5M, all income is taxed at 9%.
              </p>
            </Card>
          )}
          <Card>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:12 }}>Substance Requirements</div>
            {ctData.substanceItems.map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <span style={{ color:s.done?C.green:C.red, fontWeight:700, flexShrink:0 }}>{s.done?"✓":"✗"}</span>
                <span style={{ fontFamily:F, fontSize:13, color:C.text, flex:1 }}>{s.item}</span>
                {!s.done && <span style={{ padding:"2px 8px", borderRadius:60, background:"#FFFBEB", color:C.amber, fontSize:10, fontWeight:700 }}>Action Needed</span>}
              </div>
            ))}
          </Card>
        </div>
      )}
 
      {tab === "recon" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            {/* Table header */}
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
              Taxable Income Reconciliation
            </div>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
              Accounting profit adjusted to arrive at UAE Corporate Tax base — per Federal Decree-Law No. 47 of 2022.
            </p>
 
            {/* Column headers */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8,
              padding:"8px 12px", background:"#fff", borderRadius:16, marginBottom:4 }}>
              <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Item</span>
              <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"right", minWidth:80 }}>Sign</span>
              <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"right", minWidth:110 }}>Amount (AED)</span>
            </div>
 
            {/* Rows */}
            {ctData.adjustments.map((a,i) => {
              const isAdd = a.sign > 0;
              const isFirst = i === 0;
              return (
                <div key={i} style={{
                  display:"grid", gridTemplateColumns:"1fr auto auto", gap:8,
                  padding:"11px 12px",
                  background: isFirst ? `${C.blue}06` : "transparent",
                  borderBottom:`1px solid ${C.border}`,
                  alignItems:"center",
                }}>
                  <div>
                    <span style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight: isFirst ? 700 : 400 }}>{a.item}</span>
                    {a.note && <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>{a.note}</div>}
                  </div>
                  <div style={{ textAlign:"right", minWidth:80 }}>
                    <span style={{
                      display:"inline-block", padding:"2px 10px", borderRadius:60,
                      fontSize:11, fontWeight:700, fontFamily:F,
                      background: isFirst ? `${C.blue}12` : isAdd ? `${C.green}12` : `${C.red}12`,
                      color: isFirst ? C.blue : isAdd ? C.green : C.red,
                    }}>
                      {isFirst ? "Base" : isAdd ? "+ Add" : "− Deduct"}
                    </span>
                  </div>
                  <div style={{ textAlign:"right", minWidth:110 }}>
                    <span style={{
                      fontFamily:FM, fontSize:18, fontWeight:600,
                      color: isFirst ? C.text : isAdd ? C.red : C.green,
                    }}>
                      {isAdd && !isFirst ? "+" : isAdd ? "" : "−"} {fmtAED(Math.abs(a.amount))}
                    </span>
                  </div>
                </div>
              );
            })}
 
            {/* Subtotal line */}
            <div style={{
              display:"grid", gridTemplateColumns:"1fr auto auto", gap:8,
              padding:"14px 12px", marginTop:2,
              borderTop:`2px solid ${C.text}`,
              background: ctData.taxableFinalIncome === 0 ? "#F0FDF4" : "#FFFBEB",
              borderRadius:"0 0 10px 10px",
            }}>
              <span style={{ fontFamily:F, fontSize:14, fontWeight:800, color:C.text }}>
                Taxable Income
              </span>
              <div/>
              <span style={{
                fontFamily:FM, fontSize:16, fontWeight:900, textAlign:"right", minWidth:110,
                color: ctData.taxableFinalIncome === 0 ? C.green : C.amber,
              }}>
                {fmtAED(ctData.taxableFinalIncome || 0)}
              </span>
            </div>
 
            {/* CT calculation */}
            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ padding:"12px 14px", borderRadius:16, background:`${C.purple}08`, border:`1px solid ${C.purple}18` }}>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>CT Rate Applied</div>
                <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.purple }}>
                  {ctData.effectiveCTRate}%
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>
                  {ctData.effectiveCTRate === 0 ? "QFZP / SBR exemption" : "Standard rate"}
                </div>
              </div>
              <div style={{ padding:"12px 14px", borderRadius:16,
                background: ctData.ctPayable === 0 ? "#F0FDF4" : "#FFFBEB",
                border:`1px solid ${ctData.ctPayable===0?"#86EFAC":"#FCD34D"}` }}>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>CT Payable</div>
                <div style={{ fontFamily:FM, fontSize:14, fontWeight:600,
                  color: ctData.ctPayable === 0 ? C.green : C.amber }}>
                  {fmtAED(ctData.ctPayable || 0)}
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>
                  Due {ctData.ctDue}
                </div>
              </div>
            </div>
 
            {ctData.taxableFinalIncome === 0 && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:16, background:"#F0FDF4", border:"1px solid #86EFAC" }}>
                <span style={{ fontFamily:F, fontSize:12, color:"#15803D", fontWeight:600 }}>
                  ✅ With QFZP qualifying income exclusion and SBR election, CT payable = <strong>AED 0</strong>. Ensure QFZP documentation is audit-ready.
                </span>
              </div>
            )}
          </Card>
        </div>
      )}
 
      {/* ── RELATED PARTY TRANSACTIONS ── */}
      {tab === "rpt" && (() => {
        const rptData = rd.rpt || {
          totalRPT: 485000,
          revenueRatio: 26.2,
          transactions: [
            {
              party:       "Ahmed Al Rashidi (Shareholder/Director)",
              relation:    "Shareholder >25% + Senior Officer",
              type:        "Salary & Management Fees",
              amount:      240000,
              armslength:  true,
              benchmark:   "AED 180K–280K market range for equivalent role",
              risk:        "Low",
              action:      "Document board resolution approving remuneration",
            },
            {
              party:       "Rashidi Holdings Ltd (UAE)",
              relation:    "Common shareholder (>50% ownership)",
              type:        "Intercompany loan — interest receivable",
              amount:      85000,
              armslength:  true,
              benchmark:   "EIBOR + 2.5% = 7.8% — charged at 7.5% (within range)",
              risk:        "Medium",
              action:      "Prepare transfer pricing documentation — loan agreement needed",
            },
            {
              party:       "Al Rashidi Brothers Trading (Mainland UAE)",
              relation:    "Related company — common director",
              type:        "Service fee income",
              amount:      120000,
              armslength:  false,
              benchmark:   "Similar services billed at AED 160K–200K to third parties",
              risk:        "High",
              action:      "Price adjustment required — rebill at arm's length or document commercial justification",
            },
            {
              party:       "Rashidi Family Trust",
              relation:    "Connected person — beneficial owner",
              type:        "Rent — office premises",
              amount:      40000,
              armslength:  true,
              benchmark:   "DMCC comparable office: AED 38K–45K/yr — within range",
              risk:        "Low",
              action:      "Obtain independent rental valuation and retain on file",
            },
          ],
        };
 
        const riskColor = r => r === "High" ? C.red : r === "Medium" ? C.amber : C.green;
        const riskBg    = r => r === "High" ? "#FEF2F2" : r === "Medium" ? "#FFFBEB" : "#F0FDF4";
 
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
              {[
                { label:"Total RPT Value",       value:fmtAED(rptData.totalRPT), color:C.blue,  icon:"ti-arrows-exchange" },
                { label:"% of Revenue",           value:`${rptData.revenueRatio}%`, color:rptData.revenueRatio>25?C.amber:C.green, icon:"ti-chart-bar" },
                { label:"High-Risk Transactions", value:rptData.transactions.filter(t=>t.risk==="High").length, color:C.red, icon:"ti-alert-triangle" },
              ].map((s,i) => (
                <Card key={i} style={{ padding:18 }}>
                  <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
                </Card>
              ))}
            </div>
 
            {/* RPT Definition */}
            <Card style={{ background:"#EFF6FF", border:"1px solid #93C5FD", padding:"14px 18px" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.blue, marginBottom:6 }}>
                Who is a Connected Person under UAE CT Law?
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  "Shareholder holding ≥ 25% of shares or voting rights",
                  "Director or senior officer of the company",
                  "Related companies with common ownership > 50%",
                  "Family members of any of the above (spouse, children, parents)",
                  "Trusts or foundations controlled by connected persons",
                  "Partner in a partnership arrangement",
                ].map((r,i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <span style={{ color:C.blue, fontWeight:700, flexShrink:0, fontSize:12 }}>•</span>
                    <span style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
 
            {/* Transaction List */}
            {rptData.transactions.map((t,i) => (
              <Card key={i} style={{ borderLeft:`4px solid ${riskColor(t.risk)}`, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{t.party}</div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>{t.relation}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.text }}>{fmtAED(t.amount)}</span>
                    <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                      background:riskBg(t.risk), color:riskColor(t.risk) }}>{t.risk} Risk</span>
                    <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                      background:t.armslength?"#ECFDF5":"#FEF2F2", color:t.armslength?C.green:C.red }}>
                      {t.armslength ? "✓ Arm's Length" : "✗ Not Arm's Length"}
                    </span>
                  </div>
                </div>
 
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                  <div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>Transaction Type</div>
                    <div style={{ fontFamily:F, fontSize:13, color:C.text }}>{t.type}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>Benchmark</div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.5 }}>{t.benchmark}</div>
                  </div>
                </div>
 
                <div style={{ marginTop:12, padding:"10px 14px", borderRadius:16,
                  background:riskBg(t.risk), border:`1px solid ${riskColor(t.risk)}33` }}>
                  <span style={{ fontFamily:F, fontSize:12, color:riskColor(t.risk), fontWeight:600 }}>
                    Action: {t.action}
                  </span>
                </div>
              </Card>
            ))}
 
            {/* Garima Note */}
            <Card style={{ background:"#FFFBEB", border:"1px solid #FCD34D" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:8 }}>
                💬 Garima's Note on RPT Compliance
              </div>
              <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.8, margin:0 }}>
                Your RPT total at AED {fmtAED(rptData.totalRPT, false)} ({rptData.revenueRatio}% of revenue) is above the threshold where the FTA expects formal transfer pricing documentation.
                The most urgent issue is the <strong>Al Rashidi Brothers service fee</strong> — billed at AED 120K vs market rate of AED 160–200K.
                This underpricing is a CT audit red flag and must be corrected before your return.
                For all other RPTs, ensure you have signed agreements, board resolutions, and benchmarking studies on file.
                I'll prepare the RPT schedule for your CT return — please send me the signed loan agreement with Rashidi Holdings.
              </p>
              <button onClick={() => window.open(WA,"_blank")} style={{ marginTop:12, padding:"9px 20px",
                borderRadius:16, border:"none", background:"#D97706", color:"white",
                fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Discuss RPT with Garima
              </button>
            </Card>
          </div>
        );
      })()}
 
      {/* ── RELATED PARTIES (entities / companies) ── */}
      {tab === "rpt" && (() => {
        const rptData = rd.rpt || {
          totalRPT: 325000,
          revenueRatio: 17.6,
          entities: [
            {
              name:        "Rashidi Holdings Ltd",
              jurisdiction:"UAE (Abu Dhabi)",
              relationship:"Common shareholder — Ahmed Al Rashidi holds >50% in both entities",
              ownershipPct: 80,
              transactions:[
                { desc:"Intercompany loan — principal AED 850,000 @ 7.5% p.a.", amount:63750, type:"Interest income" },
              ],
              tpMethod:    "CUP — EIBOR + 2.5% benchmark",
              compliant:   true,
              risk:        "Medium",
              docStatus:   ["Loan agreement — PENDING signed copy", "Board approval minute — ✓ on file", "Interest calculation schedule — ✓ prepared"],
              action:      "Obtain signed loan agreement urgently — FTA requires this as primary documentation.",
            },
            {
              name:        "Al Rashidi Brothers Trading LLC",
              jurisdiction:"UAE Mainland (Dubai)",
              relationship:"Common director — Ahmed Al Rashidi is director of both entities",
              ownershipPct: 0,
              transactions:[
                { desc:"Management & advisory services provided by DMCC entity", amount:120000, type:"Service fee income" },
              ],
              tpMethod:    "CUP — compared to 3rd party service agreements",
              compliant:   false,
              risk:        "High",
              docStatus:   ["Service agreement — needs repricing to AED 160K+", "Third-party comparables — 3 quotes required", "Scope of services document — PENDING"],
              action:      "Underpriced by AED 40–80K vs market. Revise fee to AED 160K minimum or document commercial justification — this is the #1 CT audit risk.",
            },
            {
              name:        "Rashidi Family Trust",
              jurisdiction:"UAE (DIFC registered)",
              relationship:"Connected entity — beneficial owner is Ahmed Al Rashidi",
              ownershipPct: 100,
              transactions:[
                { desc:"Office premises lease — 1,200 sq ft DMCC office", amount:40000, type:"Rent expense" },
              ],
              tpMethod:    "CUP — DMCC market rent comparables",
              compliant:   true,
              risk:        "Low",
              docStatus:   ["Lease agreement — ✓ valid until Dec 2026", "Independent valuation — PENDING", "DIFC trust deed — ✓ on file"],
              action:      "Obtain independent DMCC rental valuation and retain on audit file.",
            },
          ],
        };
 
        const riskColor = r => r==="High"?C.red:r==="Medium"?C.amber:C.green;
        const riskBg    = r => r==="High"?"#FEF2F2":r==="Medium"?"#FFFBEB":"#F0FDF4";
        const totalRPT  = rptData.entities.reduce((s,e) => s + e.transactions.reduce((a,t)=>a+t.amount,0), 0);
 
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
            {/* Legal definition banner */}
            <Card style={{ background:"#EFF6FF", border:"1px solid #93C5FD", padding:"14px 18px" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.blue, marginBottom:6 }}>
                Related Party — UAE CT Law Definition (Art. 35 & 34)
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.7, margin:"0 0 10px" }}>
                A <strong>Related Party</strong> is an entity (company, trust, partnership) where there is common ownership or control of <strong>≥50%</strong>, or where one entity controls the other.
                All transactions between related parties must be priced on <strong>arm's length terms</strong> and supported by transfer pricing documentation.
                This is separate from Connected Persons (individuals) which is governed by Art. 36.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  "Common shareholder owning ≥50% in both entities",
                  "Parent company / subsidiary relationships",
                  "Sister companies under same holding structure",
                  "Trusts / foundations with common beneficial owner",
                  "Joint ventures with ≥50% common ownership",
                  "Partnerships with controlling common partner",
                ].map((r,i) => (
                  <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                    <span style={{ color:C.blue, fontWeight:700, fontSize:12, flexShrink:0 }}>•</span>
                    <span style={{ fontFamily:F, fontSize:11, color:C.text, lineHeight:1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
 
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
              {[
                { label:"Total RPT Value",         value:fmtAED(totalRPT),                                                        color:C.blue,  icon:"ti-arrows-exchange" },
                { label:"% of Revenue",            value:`${((totalRPT/1850000)*100).toFixed(1)}%`,                               color:C.amber, icon:"ti-chart-bar" },
                { label:"Non-Compliant Entities",  value:rptData.entities.filter(e=>!e.compliant).length,                         color:C.red,   icon:"ti-alert-triangle" },
              ].map((s,i) => (
                <Card key={i} style={{ padding:18 }}>
                  <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
                </Card>
              ))}
            </div>
 
            {/* Entity cards */}
            {rptData.entities.map((e,i) => (
              <Card key={i} style={{ borderLeft:`4px solid ${riskColor(e.risk)}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>{e.name}</div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>
                      {e.jurisdiction} · {e.relationship}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                      background:riskBg(e.risk), color:riskColor(e.risk) }}>{e.risk} Risk</span>
                    <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                      background:e.compliant?"#ECFDF5":"#FEF2F2", color:e.compliant?C.green:C.red }}>
                      {e.compliant ? "✓ Arm's Length" : "✗ Non-Compliant"}
                    </span>
                  </div>
                </div>
 
                {/* Transactions */}
                <div style={{ background:`${C.border}66`, borderRadius:16, padding:"10px 14px", marginBottom:12 }}>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>
                    Transactions
                  </div>
                  {e.transactions.map((t,j) => (
                    <div key={j} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ fontFamily:F, fontSize:13, color:C.text }}>{t.desc}</div>
                        <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>{t.type}</div>
                      </div>
                      <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.text }}>{fmtAED(t.amount)}</div>
                    </div>
                  ))}
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:8 }}>TP Method: {e.tpMethod}</div>
                </div>
 
                {/* Documentation */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>
                    Documentation Status
                  </div>
                  {e.docStatus.map((d,j) => {
                    const pending = d.includes("PENDING") || d.includes("needs") || d.includes("required");
                    return (
                      <div key={j} style={{ display:"flex", gap:8, padding:"4px 0", alignItems:"flex-start" }}>
                        <span style={{ color:pending?C.amber:C.green, fontWeight:700, fontSize:13, flexShrink:0 }}>{pending?"⚠":"✓"}</span>
                        <span style={{ fontFamily:F, fontSize:12, color:pending?C.amber:C.text }}>{d.replace("✓ ","")}</span>
                      </div>
                    );
                  })}
                </div>
 
                {/* Action */}
                <div style={{ padding:"10px 14px", borderRadius:16, background:riskBg(e.risk), border:`1px solid ${riskColor(e.risk)}33` }}>
                  <span style={{ fontFamily:F, fontSize:12, color:riskColor(e.risk), fontWeight:600 }}>
                    {e.action}
                  </span>
                </div>
              </Card>
            ))}
 
            <Card style={{ background:"#FFFBEB", border:"1px solid #FCD34D" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:8 }}>💬 Garima's Note</div>
              <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.8, margin:"0 0 12px" }}>
                Your most urgent related party issue is the <strong>Al Rashidi Brothers service fee</strong> — underpriced at AED 120K vs AED 160–200K market rate.
                The FTA can adjust this upward during audit and disallow the deduction in Al Rashidi Brothers' return.
                I need three third-party quotes for comparable advisory services and a revised service agreement at AED 160K minimum before we file the CT return.
                The Rashidi Holdings loan agreement is also outstanding — please send me a signed copy this week.
              </p>
              <button onClick={() => window.open(WA,"_blank")} style={{ padding:"9px 20px",
                borderRadius:16, border:"none", background:"#D97706", color:"white",
                fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Discuss Related Parties with Garima
              </button>
            </Card>
          </div>
        );
      })()}
 
      {/* ── CONNECTED PERSONS (individuals) ── */}
      {tab === "connected" && (() => {
        // CTP010 — FTA Public Clarification on "director" and "officer" under Art. 36(2)(b)
        const cpData = rd.connectedPersons || {
          totalPayments: 340000,
          persons: [
            {
              name:       "Ahmed Al Rashidi",
              role:       "Managing Director & Shareholder",
              // CTP010: shareholder = Art.36(2)(a); director on board = Art.36(2)(b)
              // If both, treated as Connected Person under Art.36(2)(a) owner rule
              connectionType: "owner+officer",
              connectionRef:  "Art. 36(2)(a) — Owner + Art. 36(2)(b) — Director on Board",
              ctp010Note:     "Ahmed holds a position on the board of directors (DMCC constitutional documents). He is also >25% shareholder. Per CTP010: where a Person is both a Related Party and Connected Person, they are treated as Related Party only if that applies — but here he is owner + officer. Job title includes 'Director' AND he holds a board seat, so both tests are satisfied.",
              isNaturalPerson: true,
              payments: [
                { type:"Annual Salary",     amount:200000, basis:"Employment contract — Board approved Nov 2025" },
                { type:"Performance Bonus", amount:30000,  basis:"Board resolution Dec 2025 — linked to AED 1.5M revenue target" },
                { type:"Health Insurance",  amount:8000,   basis:"UAE standard package — market norm" },
                { type:"Housing Allowance", amount:24000,  basis:"AED 2,000/month — part of total comp package" },
              ],
              totalComp:   262000,
              marketLow:   200000,
              marketHigh:  300000,
              armslength:  true,
              businessPurpose: true,
              risk:        "Low",
              // CTP010 s.4: title alone insufficient — must hold actual board position
              titleNote:   "Job title 'Managing Director' + formal DMCC board appointment confirmed. Per CTP010: title alone insufficient — board seat in constitutional documents is the test.",
              action:      "Maintain board appointment documents, employment contract, job description, and KPI-linked bonus framework on file. FTA will verify board seat against DMCC constitutional documents.",
              docStatus: [
                { item:"DMCC constitutional documents confirming board appointment", done:true  },
                { item:"Employment contract — signed",                                done:true  },
                { item:"Board resolution approving remuneration",                     done:true  },
                { item:"Detailed job description with scope of authority",            done:false },
                { item:"KPI framework linked to bonus (board-approved)",              done:false },
                { item:"Payroll records (WPS or equivalent)",                         done:true  },
                { item:"Market benchmarking study for MD role",                       done:false },
              ],
            },
            {
              name:       "Fatima Al Rashidi",
              role:       "Marketing Consultant",
              connectionType: "connected-spouse",
              connectionRef:  "Art. 36(2)(c) — Related Party of owner/director (spouse)",
              ctp010Note:     "Fatima is Ahmed's spouse. Under Art. 36(2)(c), a Related Party of an owner or director is also a Connected Person. She has no board seat and no C-suite title — so she is not a 'director' or 'officer' under CTP010. She is a Connected Person solely by virtue of being spouse of the owner.",
              isNaturalPerson: true,
              payments: [
                { type:"Consultancy Fee", amount:60000, basis:"Consultancy agreement — Jan 2026 · 12-month retainer" },
              ],
              totalComp:   60000,
              marketLow:   48000,
              marketHigh:  90000,
              armslength:  true,
              businessPurpose: null, // needs evidence
              risk:        "High",
              titleNote:   "Per CTP010: Fatima has no board appointment and no strategic decision-making authority — she is NOT a 'director' or 'officer'. She is a Connected Person under Art. 36(2)(c) as spouse of owner.",
              action:      "The risk is not the amount — it is proving business purpose. FTA will ask: what did she actually deliver? Collect all campaign reports, meeting records, content output, and deliverables for Q1 2026 immediately.",
              docStatus: [
                { item:"Consultancy agreement — signed Jan 2026",              done:true  },
                { item:"Scope of work / deliverables defined in agreement",    done:false },
                { item:"Q1 2026 work output evidence (reports, campaigns)",    done:false },
                { item:"Time records or activity log",                         done:false },
                { item:"Market rate benchmarking (3 comparable quotes)",       done:true  },
                { item:"Business purpose memo — why external consultant",      done:false },
                { item:"Invoice and payment trail",                            done:true  },
              ],
            },
          ],
        };
 
        const riskColor = r => r==="High"?C.red:r==="Medium"?C.amber:C.green;
        const riskBg    = r => r==="High"?"#FEF2F2":r==="Medium"?"#FFFBEB":"#F0FDF4";
 
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
            {/* CTP010 Official Source Banner */}
            <Card style={{ background:"#1E3A5F", border:"1px solid #2563EB", padding:"14px 18px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:16, background:"#2563EB",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}><i className="ti ti-user" style={{fontSize:16, color:"white"}}/></div>
                <div>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"white", marginBottom:4 }}>
                    FTA Public Clarification — CTP010
                  </div>
                  <div style={{ fontFamily:F, fontSize:12, color:"#93C5FD", lineHeight:1.6 }}>
                    This tab reflects the official FTA clarification on the terms "director" and "officer"
                    under <strong style={{color:"white"}}>Article 36(2)(b)</strong> of Federal Decree-Law No. 47 of 2022.
                    Last updated: CTP010 (effective from CT Law implementation date).
                  </div>
                </div>
              </div>
            </Card>
 
            {/* Legal definition — Art. 36 correct */}
            <Card style={{ background:"#F5F3FF", border:"1px solid #C4B5FD", padding:"14px 18px" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.purple, marginBottom:8 }}>
                Connected Person — Art. 36(2) UAE CT Law (Federal Decree-Law No. 47 of 2022)
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.7, margin:"0 0 12px" }}>
                A <strong>Connected Person</strong> is an individual linked to the taxable person.
                Payments to connected persons are deductible <em>only if</em> they satisfy
                <strong> both</strong> conditions simultaneously (Art. 36(1)):
                (1) the amount corresponds to <strong>Market Value</strong>, AND
                (2) incurred <strong>wholly and exclusively for business purposes</strong>.
              </p>
 
              {/* Who qualifies — corrected Art. 36(2) */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {[
                  { who:"Owner of the Taxable Person (any %)",                   ref:"Art. 36(2)(a)" },
                  { who:"Director — holds position on board of directors",        ref:"Art. 36(2)(b)" },
                  { who:"Officer — C-suite with strategic decision authority",    ref:"Art. 36(2)(b)" },
                  { who:"Related Party of owner/director/officer",                ref:"Art. 36(2)(c)" },
                ].map((r,i) => (
                  <div key={i} style={{ padding:"8px 10px", borderRadius:16, background:"white", border:"1px solid #DDD6FE" }}>
                    <div style={{ fontFamily:F, fontSize:12, color:C.text, fontWeight:600 }}>{r.who}</div>
                    <div style={{ fontFamily:FM, fontSize:10, color:C.purple, marginTop:2 }}>{r.ref}</div>
                  </div>
                ))}
              </div>
 
              {/* Director vs Officer distinction — CTP010 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div style={{ padding:"12px 14px", borderRadius:16, background:"white", border:"1px solid #C4B5FD" }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:12, color:C.purple, marginBottom:6 }}>
                    🪑 "DIRECTOR" — CTP010 Definition
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, lineHeight:1.7 }}>
                    Holds a position on the <strong>board of directors</strong> (executive, non-executive,
                    temporary, permanent, or alternate). Must be formally <strong>appointed in constitutional
                    documents</strong> (MOA, AOA, trust deed).
                  </div>
                  <div style={{ marginTop:8, padding:"6px 10px", borderRadius:16, background:"#FEF2F2" }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.red, fontWeight:600 }}>
                      ⚠️ Job title "Director" alone does NOT qualify — must hold actual board seat
                    </div>
                  </div>
                </div>
                <div style={{ padding:"12px 14px", borderRadius:16, background:"white", border:"1px solid #C4B5FD" }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:12, color:C.purple, marginBottom:6 }}>
                    👔 "OFFICER" — CTP010 Definition
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.text, lineHeight:1.7 }}>
                    Any person who: (a) has authority to <strong>plan, direct, and control</strong> the
                    business (IAS 24 framework), OR (b) makes <strong>final strategic decisions</strong>
                    on financial/operational matters, OR (c) has authority to <strong>legally bind</strong>
                    the company.
                  </div>
                  <div style={{ marginTop:8, padding:"6px 10px", borderRadius:16, background:"#ECFDF5" }}>
                    <div style={{ fontFamily:F, fontSize:11, color:C.green, fontWeight:600 }}>
                      ✓ Based on actual conduct, not just title — interim CEO = officer
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Two-test rule */}
              <div style={{ padding:"12px 14px", borderRadius:16, background:"#4C1D95" }}>
                <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:"#C4B5FD",
                  textAlign:"center", marginBottom:8, letterSpacing:"0.05em" }}>
                  ART. 36(1) — TWO TESTS MUST BOTH PASS FOR DEDUCTIBILITY
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
                  <div style={{ textAlign:"center", padding:"10px", background:"rgba(255,255,255,0.1)", borderRadius:8 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:"#C4B5FD", marginBottom:3 }}>TEST 1</div>
                    <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:"white" }}>Market Value</div>
                    <div style={{ fontFamily:F, fontSize:10, color:"#DDD6FE", marginTop:2 }}>Amount ≤ arm's length price</div>
                  </div>
                  <div style={{ fontFamily:F, fontSize:14, fontWeight:800, color:"#7C3AED", textAlign:"center" }}>AND</div>
                  <div style={{ textAlign:"center", padding:"10px", background:"rgba(255,255,255,0.1)", borderRadius:8 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:"#C4B5FD", marginBottom:3 }}>TEST 2</div>
                    <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:"white" }}>Business Purpose</div>
                    <div style={{ fontFamily:F, fontSize:10, color:"#DDD6FE", marginTop:2 }}>Wholly & exclusively for business</div>
                  </div>
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:"#DDD6FE", textAlign:"center", marginTop:8 }}>
                  Only natural persons can be directors/officers · If also a Related Party → treated as Related Party only
                </div>
              </div>
            </Card>
 
            {/* Summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
              {[
                { label:"Total Payments to Connected Persons", value:"AED " + cpData.totalPayments.toLocaleString(), color:C.purple, icon:"👤" },
                { label:"Persons Identified",                  value:cpData.persons.length,                           color:C.blue,   icon:"🔍" },
                { label:"High Risk — Evidence Gaps",           value:cpData.persons.filter(p=>p.risk==="High").length, color:C.red,    icon:"ti-alert-triangle" },
              ].map((s,i) => (
                <Card key={i} style={{ padding:18 }}>
                  <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:F, fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
                </Card>
              ))}
            </div>
 
            {/* Person cards */}
            {cpData.persons.map((p,i) => {
              const doneCount = p.docStatus.filter(d=>d.done).length;
              const docPct    = Math.round((doneCount/p.docStatus.length)*100);
              return (
                <Card key={i} style={{ borderLeft:`4px solid ${riskColor(p.risk)}` }}>
                  {/* Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    marginBottom:12, flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>{p.name}</div>
                      <div style={{ fontFamily:F, fontSize:13, color:C.purple, fontWeight:600, marginTop:1 }}>{p.role}</div>
                      <div style={{ fontFamily:FM, fontSize:11, color:C.blue, marginTop:2 }}>{p.connectionRef}</div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                        background:riskBg(p.risk), color:riskColor(p.risk) }}>{p.risk} Risk</span>
                      <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                        background:"#F5F3FF", color:C.purple }}>
                        {doneCount}/{p.docStatus.length} docs ({docPct}%)
                      </span>
                    </div>
                  </div>
 
                  {/* CTP010 classification note */}
                  <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.blue}08`,
                    border:`1px solid ${C.blue}20`, marginBottom:14 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                      textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>
                      CTP010 Classification
                    </div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.6 }}>{p.ctp010Note}</div>
                  </div>
 
                  {/* Job title nuance */}
                  <div style={{ padding:"8px 12px", borderRadius:16,
                    background:p.connectionType==="owner+officer"?"#ECFDF5":"#FEF2F2",
                    border:`1px solid ${p.connectionType==="owner+officer"?"#86EFAC":"#FCA5A5"}`,
                    marginBottom:14 }}>
                    <div style={{ fontFamily:F, fontSize:12, color:p.connectionType==="owner+officer"?C.green:C.red }}>
                      {p.titleNote}
                    </div>
                  </div>
 
                  {/* Payments breakdown */}
                  <div style={{ background:`${C.border}66`, borderRadius:16, padding:"10px 14px", marginBottom:14 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>
                      Payments — AED {p.totalComp.toLocaleString()} total
                    </div>
                    {p.payments.map((pay,j) => (
                      <div key={j} style={{ display:"flex", justifyContent:"space-between",
                        padding:"6px 0", borderBottom:j<p.payments.length-1?`1px dashed ${C.border}`:"none",
                        flexWrap:"wrap", gap:4 }}>
                        <div>
                          <div style={{ fontFamily:F, fontSize:13, color:C.text }}>{pay.type}</div>
                          <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:1 }}>{pay.basis}</div>
                        </div>
                        <div style={{ fontFamily:FM, fontSize:18, fontWeight:600, color:C.text }}>
                          AED {pay.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8,
                      marginTop:4, borderTop:`1px solid ${C.text}` }}>
                      <span style={{ fontFamily:F, fontSize:13, fontWeight:700, color:C.text }}>Total</span>
                      <span style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.purple }}>
                        AED {p.totalComp.toLocaleString()}
                      </span>
                    </div>
                  </div>
 
                  {/* Two tests */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                    <div style={{ padding:"10px 14px", borderRadius:16,
                      background:p.armslength?"#F0FDF4":"#FEF2F2",
                      border:`1px solid ${p.armslength?"#86EFAC":"#FCA5A5"}` }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, marginBottom:4 }}>
                        TEST 1 — MARKET VALUE (Art. 36(1))
                      </div>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:700,
                        color:p.armslength?C.green:C.red }}>
                        {p.armslength ? "✓ Within market range" : "✗ Adjust pricing"}
                      </div>
                      <div style={{ fontFamily:FM, fontSize:11, color:C.muted, marginTop:4 }}>
                        Market: AED {p.marketLow.toLocaleString()} – {p.marketHigh.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding:"10px 14px", borderRadius:16,
                      background:p.businessPurpose===true?"#F0FDF4":p.businessPurpose===false?"#FEF2F2":"#FFFBEB",
                      border:`1px solid ${p.businessPurpose===true?"#86EFAC":p.businessPurpose===false?"#FCA5A5":"#FCD34D"}` }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, marginBottom:4 }}>
                        TEST 2 — BUSINESS PURPOSE (Art. 36(1))
                      </div>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:700,
                        color:p.businessPurpose===true?C.green:p.businessPurpose===false?C.red:C.amber }}>
                        {p.businessPurpose===true ? "✓ Wholly for business"
                         : p.businessPurpose===false ? "✗ Personal element present"
                         : "⚠️ Evidence required"}
                      </div>
                      <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:4 }}>
                        Both tests required for deductibility
                      </div>
                    </div>
                  </div>
 
                  {/* Documentation checklist */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Documentation Checklist
                      </div>
                      <span style={{ fontFamily:F, fontSize:11, fontWeight:700,
                        color:docPct>=80?C.green:docPct>=50?C.amber:C.red }}>
                        {docPct}% complete
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height:6, borderRadius:16, background:C.border, marginBottom:10, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${docPct}%`, borderRadius:16,
                        background:docPct>=80?C.green:docPct>=50?C.amber:C.red,
                        transition:"width 0.4s" }}/>
                    </div>
                    {p.docStatus.map((d,j) => (
                      <div key={j} style={{ display:"flex", gap:8, padding:"6px 0",
                        borderBottom:j<p.docStatus.length-1?`1px dashed ${C.border}`:"none",
                        alignItems:"flex-start" }}>
                        <span style={{ color:d.done?C.green:C.amber, fontWeight:700,
                          fontSize:13, flexShrink:0, marginTop:1 }}>{d.done?"✓":"✗"}</span>
                        <span style={{ fontFamily:F, fontSize:12,
                          color:d.done?C.text:C.amber, flex:1, lineHeight:1.4 }}>{d.item}</span>
                        {!d.done && (
                          <span style={{ padding:"2px 8px", borderRadius:60, background:"#FFFBEB",
                            color:C.amber, fontSize:10, fontWeight:700, flexShrink:0 }}>Action</span>
                        )}
                      </div>
                    ))}
                  </div>
 
                  {/* Action */}
                  <div style={{ padding:"10px 14px", borderRadius:16,
                    background:riskBg(p.risk), border:`1px solid ${riskColor(p.risk)}33` }}>
                    <span style={{ fontFamily:F, fontSize:12, color:riskColor(p.risk), fontWeight:600 }}>
                      {p.action}
                    </span>
                  </div>
                </Card>
              );
            })}
 
            {/* Garima note */}
            <Card style={{ background:"#F5F3FF", border:"1px solid #C4B5FD" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.purple, marginBottom:8 }}>
                💬 Garima's Note — Connected Persons (CTP010)
              </div>
              <p style={{ fontFamily:F, fontSize:13, color:"#4C1D95", lineHeight:1.85, margin:"0 0 12px" }}>
                The FTA issued CTP010 specifically because many businesses were mis-classifying who counts as a
                "director" or "officer". The key change: <strong>having "Director" in your job title
                is not enough</strong> — the person must hold a formal board seat in your DMCC constitutional
                documents. Ahmed qualifies on both counts, so we're fine there. The bigger risk is
                <strong> Fatima's consultancy</strong>. The amount is within market range — but the FTA
                will ask for work output evidence, not just a signed agreement. I need all Q1 deliverables
                — campaign reports, meeting notes, content produced — by 20 April so I can prepare the
                Connected Persons disclosure for the CT return. Also note: FTA requires disclosure of
                all connected person payments in the Tax Return under Art. 55(1) if they exceed the
                specified threshold. With AED 340K total payments, we are above that threshold.
                I will prepare the full disclosure schedule.
              </p>
              <button onClick={() => window.open(WA,"_blank")} style={{ padding:"9px 20px",
                borderRadius:16, border:"none", background:C.purple, color:"white",
                fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Discuss Connected Persons with Garima
              </button>
            </Card>
          </div>
        );
      })()}
 
 
      {/* ── ARM'S LENGTH TEST ── */}
      {tab === "armslength" && (() => {
        const alData = rd.armsLength || reportData?.armsLength || {
          totalTransactions: 4,
          compliant: 3,
          nonCompliant: 1,
          tests: [
            {
              category:    "Director / Shareholder Salary",
              transaction: "Ahmed Al Rashidi — Annual remuneration AED 240,000",
              method:      "Comparable Uncontrolled Price (CUP)",
              marketRange: "AED 180,000 – AED 280,000",
              actual:      240000,
              marketLow:   180000,
              marketHigh:  280000,
              compliant:   true,
              notes:       "Within DMCC CEO/MD market range for trading company with AED 1.85M revenue. Benchmarked against 12 comparable UAE free zone entities.",
              evidence:    ["Board resolution — Nov 2025", "Employment contract signed", "DMCC salary benchmarking report"],
            },
            {
              category:    "Intercompany Loan Interest",
              transaction: "Loan to Rashidi Holdings — AED 850,000 @ 7.5% p.a.",
              method:      "Comparable Uncontrolled Price (CUP) — market rate",
              marketRange: "EIBOR + 2% to EIBOR + 3% = 7.3% – 8.3%",
              actual:      63750, // interest charged
              marketLow:   62050,
              marketHigh:  70550,
              compliant:   true,
              notes:       "Rate of 7.5% p.a. is within the EIBOR + 2–3% range applicable to UAE dirham-denominated intercompany loans. Loan agreement required.",
              evidence:    ["Loan agreement — PENDING", "EIBOR rate confirmation (CBUAE)", "Board approval minute"],
            },
            {
              category:    "Service Fee to Related Company",
              transaction: "Service fees from Al Rashidi Brothers — AED 120,000",
              method:      "Comparable Uncontrolled Price (CUP)",
              marketRange: "AED 160,000 – AED 200,000",
              actual:      120000,
              marketLow:   160000,
              marketHigh:  200000,
              compliant:   false,
              notes:       "Charged at AED 120K vs market rate of AED 160–200K. Under-pricing of related party services is non-deductible under Art. 34 UAE CT Law and may be adjusted by FTA during audit.",
              evidence:    ["Service agreement — needs revision", "Market comparables — 3 third-party quotes required"],
            },
            {
              category:    "Related Party Rent",
              transaction: "Office rent paid to Rashidi Family Trust — AED 40,000",
              method:      "Comparable Uncontrolled Price (CUP) — market rent",
              marketRange: "AED 38,000 – AED 45,000 (DMCC comparable)",
              actual:      40000,
              marketLow:   38000,
              marketHigh:  45000,
              compliant:   true,
              notes:       "Rent of AED 40K p.a. is within the DMCC market range for equivalent floor space. Independent valuation recommended for audit file.",
              evidence:    ["Lease agreement — valid until Dec 2026", "Independent valuation — PENDING"],
            },
          ],
        };
 
        const pct = Math.round((alData.compliant / alData.totalTransactions) * 100);
 
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
 
            {/* Score header */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
              {[
                { label:"Transactions Tested",      value:alData.totalTransactions, color:C.blue,  icon:"ti-search" },
                { label:"Arm's Length Compliant",   value:alData.compliant,          color:C.green, icon:"ti-circle-check" },
                { label:"Require Adjustment",        value:alData.nonCompliant,       color:alData.nonCompliant>0?C.red:C.green, icon:"ti-alert-triangle" },
              ].map((s,i) => (
                <Card key={i} style={{ padding:18 }}>
                  <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
                </Card>
              ))}
            </div>
 
            {/* Compliance bar */}
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>
                  Overall Arm's Length Compliance
                </div>
                <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:pct===100?C.green:pct>=75?C.amber:C.red }}>
                  {pct}%
                </div>
              </div>
              <div style={{ height:10, borderRadius:16, background:C.border, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, borderRadius:16,
                  background:pct===100?"#10B981":pct>=75?"#F59E0B":"#EF4444",
                  transition:"width 0.5s" }}/>
              </div>
              <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:8 }}>
                {pct < 100
                  ? `${alData.nonCompliant} transaction${alData.nonCompliant>1?"s":""} require pricing adjustment before CT return filing`
                  : "All tested transactions meet the arm's length standard"}
              </div>
            </Card>
 
            {/* Test method explainer */}
            <Card style={{ background:"#EFF6FF", border:"1px solid #93C5FD", padding:"14px 18px" }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.blue, marginBottom:8 }}>
                Transfer Pricing Methods — UAE CT Law (Art. 34)
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  { method:"CUP (Comparable Uncontrolled Price)", desc:"Compare price of RPT to identical/similar transactions with third parties — most commonly used and preferred by FTA" },
                  { method:"Cost Plus Method", desc:"Cost of supply + appropriate gross margin — used for intragroup services and manufacturing" },
                  { method:"Resale Price Method", desc:"Resale price to third party minus gross margin — used for distribution arrangements" },
                  { method:"TNMM (Transactional Net Margin)", desc:"Compare net margin of RPT to comparable third-party transactions — used when CUP is unavailable" },
                ].map((m,i) => (
                  <div key={i} style={{ padding:"8px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
                    <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text }}>{m.method}</div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2, lineHeight:1.5 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
 
            {/* Individual tests */}
            {alData.tests.map((t,i) => (
              <Card key={i} style={{ borderLeft:`4px solid ${t.compliant?C.green:C.red}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{t.category}</div>
                    <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>{t.transaction}</div>
                  </div>
                  <span style={{ padding:"4px 12px", borderRadius:60, fontSize:12, fontWeight:700, fontFamily:F,
                    background:t.compliant?"#ECFDF5":"#FEF2F2", color:t.compliant?C.green:C.red,
                    border:`1px solid ${t.compliant?"#86EFAC":"#FCA5A5"}` }}>
                    {t.compliant ? "✓ Compliant" : "✗ Adjustment Required"}
                  </span>
                </div>
 
                {/* Visual range bar */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontFamily:F, fontSize:11, color:C.muted, fontWeight:600 }}>Market Range</span>
                    <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>{t.marketRange}</span>
                  </div>
                  <div style={{ position:"relative", height:10, borderRadius:16, background:C.border }}>
                    {/* Market range band */}
                    <div style={{
                      position:"absolute",
                      left:`${Math.max(0, ((t.marketLow - t.marketLow * 0.8) / (t.marketHigh * 1.2 - t.marketLow * 0.8)) * 100)}%`,
                      width:`${((t.marketHigh - t.marketLow) / (t.marketHigh * 1.2 - t.marketLow * 0.8)) * 100}%`,
                      height:"100%", borderRadius:16,
                      background:"#BBF7D0",
                    }}/>
                    {/* Actual marker */}
                    <div style={{
                      position:"absolute",
                      left:`${Math.min(95, Math.max(2, ((t.actual - t.marketLow * 0.8) / (t.marketHigh * 1.2 - t.marketLow * 0.8)) * 100))}%`,
                      top:-3, width:16, height:16, borderRadius:"50%",
                      background:t.compliant?C.green:C.red,
                      border:"2px solid white",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
                      transform:"translateX(-50%)",
                    }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontFamily:FM, fontSize:11, color:C.dim }}>{fmtAED(t.marketLow)}</span>
                    <span style={{ fontFamily:FM, fontSize:12, fontWeight:700, color:t.compliant?C.green:C.red }}>
                      Actual: {fmtAED(t.actual)}
                    </span>
                    <span style={{ fontFamily:FM, fontSize:11, color:C.dim }}>{fmtAED(t.marketHigh)}</span>
                  </div>
                </div>
 
                <div style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.7, marginBottom:12 }}>
                  <strong style={{ color:C.text }}>Method:</strong> {t.method}<br/>
                  <strong style={{ color:C.text }}>Assessment:</strong> {t.notes}
                </div>
 
                {/* Evidence checklist */}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                  <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>
                    Documentation Required
                  </div>
                  {t.evidence.map((e,j) => {
                    const pending = e.includes("PENDING") || e.includes("needs") || e.includes("required");
                    return (
                      <div key={j} style={{ display:"flex", gap:8, padding:"4px 0", alignItems:"center" }}>
                        <span style={{ color:pending?C.amber:C.green, fontWeight:700, fontSize:13, flexShrink:0 }}>
                          {pending ? "⚠" : "✓"}
                        </span>
                        <span style={{ fontFamily:F, fontSize:12, color:pending?C.amber:C.text }}>{e}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
 
            <button onClick={() => window.open(WA,"_blank")} style={{ width:"100%", padding:24,
              borderRadius:16, border:"none", background:C.purple, color:"white",
              fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Get Transfer Pricing Documentation from Garima
            </button>
          </div>
        );
      })()}
 
    </PackLayout>
  );
}
 
// ─── CT SUMMARY PDF (Overview + SBR) ─────────────────────────────────────────
// ─── NEW: REVENUE RECONCILIATION (IFRS vs VAT) ───────────────────────────────
function RevenueReconciliation({ client, reportData }) {
  const rr      = reportData?.revRecon || {};
  const period  = rr.period  || reportData?.monthLabel || "Current Quarter";
  const note    = rr.garimaNote || "";
 
  // Default demo rows if admin hasn't entered data yet
  const demoRows = [
    { desc:"Standard-rated UAE sales (5% VAT)",            ifrs:1500000, vat:1500000, explanation:"Identical — fully taxable in both IFRS and VAT" },
    { desc:"Export sales — zero-rated",                    ifrs:350000,  vat:350000,  explanation:"Same amount — zero-rated in VAT, full revenue in IFRS" },
    { desc:"Advance/deposits received (unearned revenue)",  ifrs:0,       vat:85000,   explanation:"VAT point triggered on receipt; IFRS revenue deferred until delivery" },
    { desc:"Services — % completion basis",                ifrs:120000,  vat:0,        explanation:"IFRS recognises by % completion; VAT point on invoice date (next quarter)" },
    { desc:"Exempt supplies",                              ifrs:45000,   vat:0,        explanation:"IFRS records as revenue; VAT exempt — not included in VAT return" },
    { desc:"Credit notes issued",                         ifrs:-28000,  vat:-28000,   explanation:"Both reduce revenue / output VAT equally" },
  ];
 
  const rows = (rr.rows && rr.rows.length > 0) ? rr.rows : demoRows;
  const isDemo = !(rr.rows && rr.rows.length > 0);
 
  const totalIFRS = rows.reduce((s,r)=>s+Number(r.ifrs||0),0);
  const totalVAT  = rows.reduce((s,r)=>s+Number(r.vat||0),0);
  const totalDiff = totalIFRS - totalVAT;
  const fullyReconciled = Math.abs(totalDiff) < 1000;
 
  const diffColor = (ifrs, vat) => {
    const d = Number(ifrs||0) - Number(vat||0);
    return d === 0 ? C.muted : d > 0 ? C.blue : C.amber;
  };
  const diffLabel = (ifrs, vat) => {
    const d = Number(ifrs||0) - Number(vat||0);
    if (d === 0) return "—";
    return d > 0
      ? `+${fmtAED(Math.abs(d))}`
      : `−${fmtAED(Math.abs(d))}`;
  };
 
  const handlePrint = async () => {
    const w = window.open("","_blank");
    const { generateRevReconPDF } = await _pdfMod;
    const html = generateRevReconPDF({ client, reportData });
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 600);
  };
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
 
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:14, flexWrap:"wrap", gap:20 }}>
        <div>
          <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.blue,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            NEW · UAE VAT Compliance
          </div>
          <h2 style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, margin:0 }}>
            Revenue Reconciliation
          </h2>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4, lineHeight:1.5 }}>
            IFRS accounting revenue vs UAE VAT return revenue — {period}
          </p>
        </div>
        <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:8,
          padding:"10px 20px", borderRadius:16, border:"none", cursor:"pointer",
          background:C.blue, color:"white", fontFamily:F, fontWeight:700, fontSize:13,
          boxShadow:`0 2px 8px ${C.blue}20` }}>
          Download PDF
        </button>
      </div>
 
      {/* What & Why explanation */}
      <Card style={{ marginBottom:14, background:`${C.blue}06`, borderLeft:`4px solid ${C.blue}` }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:36, height:36, borderRadius:16, background:C.blue, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💡</div>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:6 }}>
              Why does IFRS revenue differ from VAT revenue?
            </div>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.75, margin:0 }}>
              <strong style={{color:C.text}}>IFRS</strong> recognises revenue when performance obligations are met (goods/services delivered).
              <strong style={{color:C.text}}> UAE VAT</strong> uses the "tax point" — the earlier of invoice date or date of supply.
              This creates timing differences (advances, % completion contracts) and scope differences (exempt supplies, unearned revenue).
              The FTA cross-references your VAT returns against your audited P&L — <strong style={{color:C.text}}>unexplained differences trigger audit inquiries.</strong>
              This reconciliation is your documented explanation.
            </p>
          </div>
        </div>
      </Card>
 
      {/* KPI Summary strip */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
        {[
          { label:"IFRS Revenue (Books)", value:fmtAED(totalIFRS), color:C.blue,  icon:"ti-book-2", sub:"Per audited accounts" },
          { label:"VAT Return Revenue",   value:fmtAED(totalVAT),  color:C.teal,  icon:"ti-receipt", sub:"Declared to FTA" },
          {
            label: fullyReconciled ? "✅ Fully Reconciled" : "Net Difference",
            value: fullyReconciled ? "Nil" : (totalDiff>0?"+":"")+fmtAED(Math.abs(totalDiff)),
            color: fullyReconciled ? C.green : C.amber,
            icon:  fullyReconciled ? "✓" : "⚠️",
            sub:   fullyReconciled ? "No unexplained differences" : "All differences explained below"
          },
        ].map((s,i) => (
          <Card key={i} style={{ padding:18 }}>
            <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
            <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:FM||"monospace", fontSize:15, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:4 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
 
      {/* Demo data notice */}
      {isDemo && (
        <div style={{ padding:"10px 16px", borderRadius:16, background:"#FFFBEB",
          border:"1px solid #FCD34D", marginBottom:16,
          fontFamily:F, fontSize:12, color:C.warning }}>
          ⚠️ Showing demo data. Garima should enter actual reconciliation figures in the admin panel → UAE / Tax tab → Revenue Reconciliation.
        </div>
      )}
 
      {/* Reconciliation Table */}
      <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
        {/* Table header */}
        <div style={{ display:"grid", gridTemplateColumns:"28fr 14fr 14fr 12fr 32fr",
          gap:0, background:"#1E3A5F", padding:"10px 16px" }}>
          {["Description","IFRS Amount","VAT Amount","Difference","Explanation"].map((h,i) => (
            <div key={i} style={{ fontFamily:F, fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.8)",
              textTransform:"uppercase", letterSpacing:"0.07em",
              textAlign:i>=1&&i<=3?"right":"left" }}>{h}</div>
          ))}
        </div>
 
        {rows.map((r,i) => {
          const d = Number(r.ifrs||0) - Number(r.vat||0);
          const rowBorderColor = d===0 ? "transparent" : d>0 ? C.blue : C.amber;
          return (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"28fr 14fr 14fr 12fr 32fr",
              gap:0, padding:"11px 16px",
              background:i%2===0?"white":"#FAFAFA",
              borderBottom:`1px solid #F3F4F6`,
              borderLeft:`3px solid ${rowBorderColor}` }}>
              <div style={{ fontFamily:F, fontSize:12.5, color:C.text, lineHeight:1.4, paddingRight:8 }}>
                {r.desc || "—"}
              </div>
              <div style={{ fontFamily:FM, fontSize:12, fontWeight:600, color:C.text,
                textAlign:"right" }}>
                {r.ifrs !== undefined ? fmtAED(Number(r.ifrs)) : "—"}
              </div>
              <div style={{ fontFamily:FM, fontSize:12, fontWeight:600, color:C.text,
                textAlign:"right" }}>
                {r.vat !== undefined ? fmtAED(Number(r.vat)) : "—"}
              </div>
              <div style={{ fontFamily:FM, fontSize:12, fontWeight:700,
                color:diffColor(r.ifrs, r.vat), textAlign:"right" }}>
                {diffLabel(r.ifrs, r.vat)}
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.5, paddingLeft:8 }}>
                {r.explanation || "—"}
              </div>
            </div>
          );
        })}
 
        {/* Total row */}
        <div style={{ display:"grid", gridTemplateColumns:"28fr 14fr 14fr 12fr 32fr",
          gap:0, padding:"13px 16px", background:"#F0FDF4",
          borderTop:`2px solid ${C.green}` }}>
          <div style={{ fontFamily:F, fontSize:13, fontWeight:800, color:C.text }}>TOTAL</div>
          <div style={{ fontFamily:FM, fontSize:13, fontWeight:600, color:C.text, textAlign:"right" }}>
            {fmtAED(totalIFRS)}
          </div>
          <div style={{ fontFamily:FM, fontSize:13, fontWeight:600, color:C.text, textAlign:"right" }}>
            {fmtAED(totalVAT)}
          </div>
          <div style={{ fontFamily:FM, fontSize:13, fontWeight:600,
            color:fullyReconciled?C.green:C.amber, textAlign:"right" }}>
            {fullyReconciled ? "Nil" : fmtAED(Math.abs(totalDiff))}
          </div>
          <div style={{ fontFamily:F, fontSize:11, fontWeight:700,
            color:fullyReconciled?C.green:C.amber, paddingLeft:8 }}>
            {fullyReconciled ? "✅ Fully Reconciled — no unexplained differences" : "⚠️ All differences explained above"}
          </div>
        </div>
      </Card>
 
      {/* Difference legend */}
      <div style={{ display:"flex", gap:20, marginBottom:14, flexWrap:"wrap" }}>
        {[
          { color:"transparent", border:C.border, label:"No difference — IFRS = VAT" },
          { color:C.blue,        label:"IFRS higher than VAT (timing/scope)" },
          { color:C.amber,       label:"VAT higher than IFRS (advance receipts)" },
        ].map((l,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:12, height:12, borderRadius:2,
              background:l.color==="transparent"?"transparent":l.color,
              border:l.color==="transparent"?`2px solid ${C.border}`:"none" }}/>
            <span style={{ fontFamily:F, fontSize:11, color:C.muted }}>{l.label}</span>
          </div>
        ))}
      </div>
 
      {/* Note from Garima */}
      <Card style={{ background:"#FFFBF0", border:"1px solid #FDE68A" }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:40, height:52, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#F59E0B,#D97706)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:F, fontWeight:800, fontSize:16, color:"white" }}>G</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:2 }}>
              Note from Garima
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:"#B45309", marginBottom:10 }}>
              Garima Agarwal · CA · Revenue Reconciliation Analysis
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.85, margin:"0 0 14px" }}>
              {note || "Revenue reconciliation note not yet added. Garima will update this section each quarter explaining the specific differences for this client."}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href={WA} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#25D366", color:"white", borderRadius:16,
                  padding:"8px 16px", fontFamily:F, fontWeight:700,
                  fontSize:12, textDecoration:"none" }}>
                WhatsApp Garima
              </a>
              <button onClick={handlePrint}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#FEF3C7", color:C.warning, borderRadius:16,
                  padding:"8px 16px", fontFamily:F, fontWeight:700,
                  fontSize:12, border:"1px solid #FDE68A", cursor:"pointer" }}>
                Download Full Report
              </button>
            </div>
          </div>
        </div>
      </Card>
 
      {/* FTA Audit note */}
      <div style={{ marginTop:16, padding:"12px 16px", borderRadius:16,
        background:"#F0FDF4", border:"1px solid #86EFAC" }}>
        <div style={{ fontFamily:F, fontSize:12, color:C.green, fontWeight:700, marginBottom:4 }}>
          FTA Audit Readiness
        </div>
        <p style={{ fontFamily:F, fontSize:11, color:"#065f46", lineHeight:1.6, margin:0 }}>
          This reconciliation is maintained as part of your VAT compliance file. The FTA cross-references VAT return totals against
          audited financial statements under its risk-based audit selection. All differences are documented and explainable.
          Keep this reconciliation on file for a minimum of 5 years per UAE VAT regulations.
        </p>
      </div>
    </div>
  );
}
 
// ─── NEW: WORKING CAPITAL MANAGEMENT ─────────────────────────────────────────
 
function WorkingCapital({ client, reportData }) {
  const wc     = reportData?.workingCapital || {};
  const period = wc.period || reportData?.monthLabel || "Current Period";
  const note   = wc.garimaNote || "";
 
  const dso = Number(wc.dso || 38);
  const dio = Number(wc.dio || 15);
  const dpo = Number(wc.dpo || 28);
  const ccc = dso + dio - dpo;
 
  const isDemo = !wc.dso;
 
  const arRows = (wc.arAging && wc.arAging.length) ? wc.arAging : [
    { customer:"Gulf Fresh Foods LLC",   current:125000, d30:0,     d60:0,     d90:0,     risk:"Low",    action:"On schedule" },
    { customer:"Emarat Trading Co.",     current:95000,  d30:0,     d60:0,     d90:0,     risk:"Low",    action:"On schedule" },
    { customer:"Desert Star Logistics",  current:0,      d30:82500, d60:0,     d90:0,     risk:"Medium", action:"Send reminder" },
    { customer:"Al Habtoor Properties", current:0,      d30:35000, d60:42500, d90:0,     risk:"Medium", action:"Follow up call" },
    { customer:"Al Manara Group",        current:0,      d30:0,     d60:0,     d90:87500, risk:"High",   action:"Demand letter NOW" },
  ];
 
  const apRows = (wc.apSchedule && wc.apSchedule.length) ? wc.apSchedule : [
    { supplier:"Al Rashidi Brothers Trading", amount:65000, terms:"Net 30", due:"15 Apr 2026", priority:"Upcoming" },
    { supplier:"Emirates Paper & Packaging",  amount:48000, terms:"Net 30", due:"20 Apr 2026", priority:"On Track" },
    { supplier:"Mashreq Bank — Loan EMI",     amount:35000, terms:"Monthly",due:"01 Apr 2026", priority:"Overdue"  },
    { supplier:"Gulf Freight Solutions",      amount:28500, terms:"Net 45", due:"30 Apr 2026", priority:"On Track" },
    { supplier:"DEWA (Utilities)",            amount:12000, terms:"Monthly",due:"10 Apr 2026", priority:"Upcoming" },
  ];
 
  const totalAR     = arRows.reduce((s,r)=>s+Number(r.current||0)+Number(r.d30||0)+Number(r.d60||0)+Number(r.d90||0),0);
  const total90     = arRows.reduce((s,r)=>s+Number(r.d90||0),0);
  const totalAP     = apRows.reduce((s,r)=>s+Number(r.amount||0),0);
  const totalCurrent= arRows.reduce((s,r)=>s+Number(r.current||0),0);
  const total30     = arRows.reduce((s,r)=>s+Number(r.d30||0),0);
  const total60     = arRows.reduce((s,r)=>s+Number(r.d60||0),0);
 
  const riskColor = r => r==="High"?C.red:r==="Medium"?C.amber:C.green;
  const riskBg    = r => r==="High"?"#FEF2F2":r==="Medium"?"#FFFBEB":"#ECFDF5";
 
  const handlePrint = async () => {
    const w = window.open("","_blank");
    const { generateWorkingCapitalPDF } = await _pdfMod;
    const html = generateWorkingCapitalPDF({ client, reportData });
    w.document.write(html); w.document.close();
    setTimeout(()=>w.print(),600);
  };
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
 
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:14, flexWrap:"wrap", gap:20 }}>
        <div>
          <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.green,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            NEW · Liquidity & Collections
          </div>
          <h2 style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, margin:0 }}>
            Working Capital Management
          </h2>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
            Cash Conversion Cycle · AR Aging · AP Schedule — {period}
          </p>
        </div>
        <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:8,
          padding:"10px 20px", borderRadius:16, border:"none", cursor:"pointer",
          background:C.green, color:"white", fontFamily:F, fontWeight:700, fontSize:13,
          boxShadow:`0 2px 8px ${C.green}20` }}>
          Download PDF
        </button>
      </div>
 
      {isDemo && (
        <div style={{ padding:"10px 16px", borderRadius:16, background:"#FFFBEB",
          border:"1px solid #FCD34D", marginBottom:16, fontFamily:F, fontSize:12, color:C.warning }}>
          ⚠️ Showing demo data. Enter actual figures in admin panel → UAE / Tax tab → Working Capital.
        </div>
      )}
 
      {/* CCC Visual */}
      <Card style={{ marginBottom:14, background:"#F0FDF4", border:`2px solid ${C.green}` }}>
        <div style={{ fontFamily:F, fontWeight:800, fontSize:14, color:"#065f46",
          textAlign:"center", marginBottom:16 }}>
          Cash Conversion Cycle — How Long Cash is Tied Up
        </div>
 
        {/* Formula */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:12, marginBottom:14, flexWrap:"wrap" }}>
          {[
            { val:dso, lbl:"DSO", sub:"Days to collect", color:C.blue },
            { op:"+" },
            { val:dio, lbl:"DIO", sub:"Days in inventory", color:C.teal },
            { op:"−" },
            { val:dpo, lbl:"DPO", sub:"Days to pay", color:C.amber },
            { op:"=" },
          ].map((item,i) => item.op ? (
            <div key={i} style={{ fontFamily:F, fontSize:16, fontWeight:700, color:C.green }}>{item.op}</div>
          ) : (
            <div key={i} style={{ background:"white", border:`2px solid ${C.green}`,
              borderRadius:16, padding:"14px 22px", textAlign:"center", minWidth:110 }}>
              <div style={{ fontFamily:FM, fontSize:30, fontWeight:900, color:item.color, lineHeight:1 }}>{item.val}</div>
              <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:"#065f46",
                textTransform:"uppercase", letterSpacing:"0.05em", marginTop:4 }}>{item.lbl}</div>
              <div style={{ fontFamily:F, fontSize:10, color:C.muted, marginTop:2 }}>{item.sub}</div>
            </div>
          ))}
          <div style={{ background:C.green, borderRadius:16, padding:"14px 24px", textAlign:"center", minWidth:130 }}>
            <div style={{ fontFamily:FM, fontSize:34, fontWeight:900, color:"white", lineHeight:1 }}>{ccc}</div>
            <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.85)",
              textTransform:"uppercase", letterSpacing:"0.05em", marginTop:4 }}>CCC (Days)</div>
            <div style={{ fontFamily:F, fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:2 }}>Lower = better</div>
          </div>
        </div>
 
        {/* Insight strips */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { title:`DSO ${dso} days`, ok:dso<=35, note:dso<=35?"✓ Within 35-day target":"Above target — chase collections", bench:"Industry: 30–45 days" },
            { title:`DIO ${dio} days`, ok:dio<=20, note:dio<=20?"✓ Excellent inventory velocity":"Monitor stock levels", bench:"Industry: 20–30 days" },
            { title:`DPO ${dpo} days`, ok:dpo>=35, note:dpo<35?"Extend to 45 days — free up cash":"✓ Good supplier terms", bench:"Industry: 30–45 days" },
          ].map((s,i) => (
            <div key={i} style={{ background:"white", borderRadius:16, padding:"10px 14px" }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:"#065f46", marginBottom:4 }}>{s.title}</div>
              <div style={{ fontFamily:F, fontSize:11, color:s.ok?C.green:C.amber, fontWeight:600, marginBottom:2 }}>{s.note}</div>
              <div style={{ fontFamily:F, fontSize:10, color:C.dim }}>{s.bench}</div>
            </div>
          ))}
        </div>
      </Card>
 
      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { lbl:"Total AR",    val:fmtAED(totalAR),   color:C.blue,  sub:"Total receivables" },
          { lbl:"90+ Days",    val:fmtAED(total90),   color:total90>0?C.red:C.green, sub:total90>0?"Escalate now":"Clean" },
          { lbl:"Total AP",    val:fmtAED(totalAP),   color:C.amber, sub:"Total payables" },
          { lbl:"Net WC",      val:fmtAED(totalAR-totalAP), color:totalAR>totalAP?C.green:C.red, sub:"AR minus AP" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:16 }}>
            <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.lbl}</div>
            <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:s.color }}>{s.val}</div>
            <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:3 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
 
      {/* AR Aging Table */}
      <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", background:"#064E3B" }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>
            AR Aging Schedule — {period}
          </div>
          <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
            Total outstanding: {fmtAED(totalAR)} · {arRows.length} customers
          </div>
        </div>
 
        {/* Column headers */}
        <div style={{ display:"grid",
          gridTemplateColumns:"22fr 11fr 11fr 11fr 11fr 11fr 8fr 8fr 15fr",
          background:"#fff", padding:"8px 16px",
          borderBottom:`1px solid ${C.border}` }}>
          {["Customer","Current","31–60d","61–90d","90+d","Total","% AR","Risk","Action"].map((h,i) => (
            <div key={i} style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.06em",
              textAlign:i>=1&&i<=6?"right":"left" }}>{h}</div>
          ))}
        </div>
 
        {arRows.map((r,i) => {
          const total = Number(r.current||0)+Number(r.d30||0)+Number(r.d60||0)+Number(r.d90||0);
          const pct   = totalAR>0?((total/totalAR)*100).toFixed(1):"0.0";
          const borderCol = r.risk==="High"?C.red:r.risk==="Medium"?C.amber:"transparent";
          return (
            <div key={i} style={{ display:"grid",
              gridTemplateColumns:"22fr 11fr 11fr 11fr 11fr 11fr 8fr 8fr 15fr",
              padding:"10px 16px", background:i%2===0?"white":"#FAFAFA",
              borderBottom:`1px solid ${C.border}`,
              borderLeft:`3px solid ${borderCol}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text }}>{r.customer}</div>
              <div style={{ fontFamily:FM, fontSize:11, color:Number(r.current||0)>0?C.green:C.dim, textAlign:"right" }}>
                {Number(r.current||0)>0?fmtAED(Number(r.current)):"—"}</div>
              <div style={{ fontFamily:FM, fontSize:11, color:Number(r.d30||0)>0?C.amber:C.dim, textAlign:"right" }}>
                {Number(r.d30||0)>0?fmtAED(Number(r.d30)):"—"}</div>
              <div style={{ fontFamily:FM, fontSize:11, color:Number(r.d60||0)>0?C.red:C.dim, textAlign:"right" }}>
                {Number(r.d60||0)>0?fmtAED(Number(r.d60)):"—"}</div>
              <div style={{ fontFamily:FM, fontSize:11, fontWeight:700,
                color:Number(r.d90||0)>0?"#991B1B":C.dim, textAlign:"right" }}>
                {Number(r.d90||0)>0?fmtAED(Number(r.d90)):"—"}</div>
              <div style={{ fontFamily:FM, fontSize:12, fontWeight:700, color:C.text, textAlign:"right" }}>
                {fmtAED(total)}</div>
              <div style={{ fontFamily:F, fontSize:11, color:C.muted, textAlign:"right" }}>{pct}%</div>
              <div style={{ textAlign:"right" }}>
                <span style={{ padding:"2px 8px", borderRadius:60, fontSize:10,
                  fontWeight:700, fontFamily:F, background:riskBg(r.risk), color:riskColor(r.risk) }}>
                  {r.risk}
                </span>
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:r.risk==="High"?C.red:C.muted,
                fontWeight:r.risk==="High"?700:400, paddingLeft:6 }}>{r.action}</div>
            </div>
          );
        })}
 
        {/* Total row */}
        <div style={{ display:"grid",
          gridTemplateColumns:"22fr 11fr 11fr 11fr 11fr 11fr 8fr 8fr 15fr",
          padding:"11px 16px", background:"#ECFDF5",
          borderTop:`2px solid ${C.green}`, borderLeft:`4px solid ${C.green}` }}>
          <div style={{ fontFamily:F, fontSize:13, fontWeight:800, color:C.text }}>TOTAL</div>
          <div style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:C.green, textAlign:"right" }}>{fmtAED(totalCurrent)}</div>
          <div style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:C.amber, textAlign:"right" }}>{fmtAED(total30)}</div>
          <div style={{ fontFamily:FM, fontSize:11, fontWeight:700, color:C.red, textAlign:"right" }}>{fmtAED(total60)}</div>
          <div style={{ fontFamily:FM, fontSize:12, fontWeight:600, color:"#991B1B", textAlign:"right" }}>{fmtAED(total90)}</div>
          <div style={{ fontFamily:FM, fontSize:12, fontWeight:600, color:C.text, textAlign:"right" }}>{fmtAED(totalAR)}</div>
          <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.green, textAlign:"right" }}>100%</div>
          <div/><div/>
        </div>
      </Card>
 
      {/* 90+ alert */}
      {total90 > 0 && (
        <div style={{ padding:"12px 16px", borderRadius:16, background:"#FEF2F2",
          border:"1px solid #FCA5A5", borderLeft:`4px solid ${C.red}`,
          marginBottom:14, fontFamily:F, fontSize:12, color:C.red }}>
          <strong>⚠️ IFRS 9 ECL Provision Required:</strong> AED {fmtAED(total90)} is 90+ days overdue.
          Provision AED {fmtAED(Math.round(total90*0.5))} (50% ECL) in accounts if not collected within 30 days.
          Issue formal demand letter immediately.
        </div>
      )}
 
      {/* AP Schedule */}
      <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", background:"#064E3B" }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>AP Schedule — Outstanding Payables</div>
          <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
            Total: {fmtAED(totalAP)} · DPO: {dpo} days
          </div>
        </div>
        {apRows.map((r,i) => {
          const ov = r.priority==="Overdue";
          const priColor = ov?C.red:r.priority==="Upcoming"?C.amber:C.green;
          const priBg    = ov?"#FEF2F2":r.priority==="Upcoming"?"#FFFBEB":"#ECFDF5";
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"11px 18px", background:ov?"#FEF2F2":i%2===0?"white":"#FAFAFA",
              borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{r.supplier}</div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>
                  {r.terms} · Due: {r.due}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.text }}>
                  {fmtAED(Number(r.amount||0))}
                </div>
                <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11,
                  fontWeight:700, fontFamily:F, background:priBg, color:priColor }}>
                  {r.priority}
                </span>
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"12px 18px", background:"#ECFDF5", borderTop:`2px solid ${C.green}` }}>
          <div style={{ fontFamily:F, fontSize:13, fontWeight:800, color:C.text }}>TOTAL PAYABLES</div>
          <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.green }}>
            {fmtAED(totalAP)}
          </div>
        </div>
      </Card>
 
      {/* Recommendations */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
          Working Capital Recommendations
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {total90 > 0 && (
            <div style={{ padding:"11px 14px", borderRadius:16, background:"#FEF2F2",
              border:"1px solid #FCA5A5", borderLeft:`4px solid ${C.red}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.red, marginBottom:3 }}>
                Immediate — 90+ Day Debtors
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:"#7F1D1D", lineHeight:1.6 }}>
                Issue formal demand letter, offer structured payment plan (50% now, balance in 45 days),
                withhold next delivery until settled.
              </div>
            </div>
          )}
          {dpo < 35 && (
            <div style={{ padding:"11px 14px", borderRadius:16, background:"#FFFBEB",
              border:"1px solid #FCD34D", borderLeft:`4px solid ${C.amber}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.amber, marginBottom:3 }}>
                Quick Win — Extend Supplier Payment Terms
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:"#78350F", lineHeight:1.6 }}>
                Current DPO {dpo} days vs industry norm 45 days. Negotiating extended terms
                with key suppliers could release AED 60–80K of additional working capital without cost.
              </div>
            </div>
          )}
          {dso > 35 && (
            <div style={{ padding:"11px 14px", borderRadius:16, background:"#EFF6FF",
              border:"1px solid #BFDBFE", borderLeft:`4px solid ${C.blue}` }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.blue, marginBottom:3 }}>
                Target — Reduce DSO from {dso} to 32 Days
              </div>
              <div style={{ fontFamily:F, fontSize:11, color:"#1E3A5F", lineHeight:1.6 }}>
                Introduce 2% early payment discount for &lt;15 day settlement. Move repeat-offender
                clients to upfront deposit model for new orders. Monthly AR review call.
              </div>
            </div>
          )}
          <div style={{ padding:"11px 14px", borderRadius:16, background:"#ECFDF5",
            border:"1px solid #86EFAC", borderLeft:`4px solid ${C.green}` }}>
            <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.green, marginBottom:3 }}>
              Maintain — Inventory Management
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:"#065f46", lineHeight:1.6 }}>
              DIO {dio} days is excellent (top quartile for UAE trading companies).
              Continue current just-in-time approach. No action required.
            </div>
          </div>
        </div>
      </Card>
 
      {/* Note from Garima */}
      <Card style={{ background:"#FFFBF0", border:"1px solid #FDE68A" }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:40, height:52, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#F59E0B,#D97706)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:F, fontWeight:800, fontSize:16, color:"white" }}>G</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:2 }}>Note from Garima</div>
            <div style={{ fontFamily:F, fontSize:11, color:"#B45309", marginBottom:10 }}>
              Garima Agarwal · CA · Working Capital Analysis
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.85, margin:"0 0 14px" }}>
              {note || "Working capital analysis note not yet added. Garima will update this section each period with specific recommendations."}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href={WA} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#25D366", color:"white", borderRadius:16, padding:"8px 16px",
                  fontFamily:F, fontWeight:700, fontSize:12, textDecoration:"none" }}>
                WhatsApp Garima
              </a>
              <button onClick={handlePrint}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#FEF3C7", color:C.warning, borderRadius:16, padding:"8px 16px",
                  fontFamily:F, fontWeight:700, fontSize:12,
                  border:"1px solid #FDE68A", cursor:"pointer" }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
 
// ─── NEW: VERTICAL ANALYSIS & GP RATIO ───────────────────────────────────────
 
function VerticalAnalysis({ client, reportData }) {
  const acc = "#00732F"; // UAE green accent
  const [view, setView] = React.useState("pnl"); // pnl | geography | department
 
  // ── AED formatter ──────────────────────────────────────────────────────────
  const fmtAED2 = (n) => {
    if (!n && n !== 0) return "—";
    const abs = Math.abs(n), sign = n < 0 ? "-" : "";
    if (abs >= 1000000) return `${sign}AED ${(abs/1000000).toFixed(2)}M`;
    if (abs >= 1000)    return `${sign}AED ${(abs/1000).toFixed(0)}K`;
    return `${sign}AED ${abs.toFixed(0)}`;
  };
 
  // ── Geography & Department data (same keys as India admin BI tab) ──────────
  const parseAmt = (v) => { const n = Number(String(v||0).replace(/[^0-9.-]/g,"")); return isNaN(n)?0:n; };
 
  const geoIndia   = reportData?.geoIndia   || {};
  const geoGlobal  = reportData?.geoGlobal  || {};
  const deptRaw    = reportData?.depts       || {};
 
  const indiaRegions = Object.entries(geoIndia).map(([name,d])=>({
    name, revenue:parseAmt(d.revenue), cost:parseAmt(d.cost)
  })).filter(d=>d.revenue>0||d.cost>0);
 
  const globalRegions = Object.entries(geoGlobal).map(([name,d])=>({
    name, revenue:parseAmt(d.revenue), cost:parseAmt(d.cost)
  })).filter(d=>d.revenue>0||d.cost>0);
 
  const deptList = Object.entries(deptRaw).map(([name,d])=>({
    name, revenue:parseAmt(d.revenue), cost:parseAmt(d.cost), budget:parseAmt(d.budget)
  })).filter(d=>d.revenue>0||d.cost>0);
 
  const hasGeo  = indiaRegions.length > 0 || globalRegions.length > 0;
  const hasDept = deptList.length > 0;
 
  // ── P&L Vertical Analysis data ─────────────────────────────────────────────
  const va      = reportData?.verticalAnalysis || {};
  const period  = va.period || reportData?.monthLabel || "Current Period";
  const vaNote  = va.garimaNote || reportData?.verticalGarimaNote || "";
 
  const defaultRows = [
    { label:"Revenue",             ifrs:1850000, prev:1400000, subtotal:false, total:false, section:"revenue" },
    { label:"Cost of Goods Sold",  ifrs:1017500, prev:812000,  subtotal:true,  total:false, section:"cogs"    },
    { label:"  Direct Materials",  ifrs:750000,  prev:582000,  subtotal:false, total:false, section:"cogs"    },
    { label:"  Direct Labour",     ifrs:185000,  prev:140000,  subtotal:false, total:false, section:"cogs"    },
    { label:"  Direct Overheads",  ifrs:82500,   prev:90000,   subtotal:false, total:false, section:"cogs"    },
    { label:"Gross Profit",        ifrs:832500,  prev:588000,  subtotal:true,  total:false, section:"gp"      },
    { label:"Salaries & Benefits", ifrs:375000,  prev:360000,  subtotal:false, total:false, section:"opex"    },
    { label:"Rent & Utilities",    ifrs:52000,   prev:52000,   subtotal:false, total:false, section:"opex"    },
    { label:"Marketing & Sales",   ifrs:48000,   prev:42000,   subtotal:false, total:false, section:"opex"    },
    { label:"Professional Fees",   ifrs:35000,   prev:30000,   subtotal:false, total:false, section:"opex"    },
    { label:"Other OpEx",          ifrs:51500,   prev:48000,   subtotal:false, total:false, section:"opex"    },
    { label:"Total OpEx",          ifrs:561500,  prev:532000,  subtotal:true,  total:false, section:"opex"    },
    { label:"EBITDA",              ifrs:271000,  prev:56000,   subtotal:true,  total:false, section:"ebitda"  },
    { label:"Depreciation",        ifrs:18000,   prev:18000,   subtotal:false, total:false, section:"below"   },
    { label:"Finance Costs",       ifrs:12000,   prev:12000,   subtotal:false, total:false, section:"below"   },
    { label:"Net Profit (PAT)",    ifrs:241000,  prev:26000,   subtotal:false, total:true,  section:"pat"     },
  ];
 
  const rows    = (va.rows && va.rows.length >= 5) ? va.rows : defaultRows;
  const isDemo  = !(va.rows && va.rows.length >= 5);
  const revenue = Number(rows.find(r=>r.section==="revenue")?.ifrs || 1850000);
  const prevRev = Number(rows.find(r=>r.section==="revenue")?.prev || 1400000);
 
  // ── Donut chart (reused from India BI) ────────────────────────────────────
  const DonutChart = ({ data, valueKey="revenue", size=140 }) => {
    const items = data.filter(d=>(d[valueKey]||0)>0);
    const total = items.reduce((s,d)=>s+(d[valueKey]||0),0);
    if (!items.length||!total) return <div style={{fontFamily:F,fontSize:12,color:C.muted,padding:16}}>No data</div>;
    const COLORS=["#00732F","#7C3AED","#3B6FF7","#F59E0B","#EF4444","#10B981","#8B5CF6"];
    const cx=size/2,cy=size/2,r=size*0.38,inner=size*0.22;
    let cum=0;
    const slices=items.map((d,i)=>{
      const angle=((d[valueKey]||0)/total)*2*Math.PI;
      const s=cum; cum+=angle;
      const large=angle>Math.PI?1:0;
      const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s);
      const x2=cx+r*Math.cos(cum),y2=cy+r*Math.sin(cum);
      const xi1=cx+inner*Math.cos(s),yi1=cy+inner*Math.sin(s);
      const xi2=cx+inner*Math.cos(cum),yi2=cy+inner*Math.sin(cum);
      return {d:`M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large},0 ${xi1},${yi1}Z`,
        color:COLORS[i%COLORS.length],pct:((d[valueKey]||0)/total*100).toFixed(1),name:d.name};
    });
    return (
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s,i)=><path key={i} d={s.d} fill={s.color}/>)}
        </svg>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {slices.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0}}/>
              <span style={{fontFamily:F,fontSize:11,color:C.text}}>{s.name}</span>
              <span style={{fontFamily:FM,fontSize:11,color:C.muted,marginLeft:"auto"}}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
 
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,padding:24}}>
      <UAEDisclaimer/>
 
      {/* View toggle */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {id:"pnl",        label:"P&L Analysis",    emoji:"ti-chart-bar"},
          {id:"geography",  label:"Geography",        emoji:"ti-world"},
          {id:"department", label:"By Department",    emoji:"ti-building"},
        ].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{
            padding:"8px 18px",borderRadius:12,border:"none",cursor:"pointer",
            fontFamily:F,fontSize:13,fontWeight:600,transition:"all 0.15s",
            background:view===v.id?acc:"#F3F4F6",
            color:view===v.id?"white":C.muted,
            outline:`1.5px solid ${view===v.id?acc:C.border}`,
          }}>
            <i className={"ti " + (v.emoji||"ti-circle")} style={{fontSize:13, marginRight:4}}/>{v.label}
          </button>
        ))}
      </div>
 
      {/* ── P&L VIEW ── */}
      {view === "pnl" && (
        <>
          {isDemo && (
            <div style={{padding:"10px 16px",background:C.warningBg,border:`1px solid ${C.warningBorder}`,borderRadius:12,fontFamily:F,fontSize:12,color:C.warning}}>
              ⚠️ Showing demo data. Enter actual figures in admin panel → UAE / Tax tab → Vertical Analysis.
            </div>
          )}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{fontFamily:F,fontWeight:700,fontSize:15,color:C.text}}>Common-Size P&L — {period}</div>
              <button onClick={async()=>{const w=window.open("","_blank");const{generateVerticalAnalysisPDF}=await _pdfMod;const html=generateVerticalAnalysisPDF({client,reportData});w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);}}
                style={{padding:"7px 14px",borderRadius:16,border:"none",cursor:"pointer",background:acc,color:"white",fontFamily:F,fontWeight:700,fontSize:12}}>
                Download PDF
              </button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:F}}>
                <thead>
                  <tr style={{background:"#fff"}}>
                    <th style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>Line Item</th>
                    <th style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>Current (AED)</th>
                    <th style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>% of Rev</th>
                    <th style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>Prior (AED)</th>
                    <th style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>Prior %</th>
                    <th style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:C.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${C.border}`}}>Δ pp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row,i)=>{
                    const pct     = revenue>0 ? ((Number(row.ifrs)/revenue)*100).toFixed(1) : "—";
                    const prevPct = prevRev>0 ? ((Number(row.prev)/prevRev)*100).toFixed(1) : "—";
                    const delta   = (pct!=="—"&&prevPct!=="—") ? (parseFloat(pct)-parseFloat(prevPct)).toFixed(1) : "—";
                    const isTot   = row.total || row.subtotal;
                    const isRev   = row.section==="revenue";
                    const bg      = isRev?"#F0FDF4":isTot?"#F9FAFB":"white";
                    const fwt     = isTot||isRev?700:400;
                    const deltaColor = delta==="—"?"#9CA3AF":parseFloat(delta)>0?C.green:parseFloat(delta)<0?C.red:C.muted;
                    return (
                      <tr key={i} style={{background:bg,borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"8px 12px",fontWeight:fwt,color:C.text,paddingLeft:row.label.startsWith("  ")?24:12}}>{row.label.trim()}</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,fontWeight:fwt,color:C.text}}>{Number(row.ifrs).toLocaleString()}</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,fontWeight:fwt,color:isRev?acc:C.text}}>{isRev?"100.0%":pct+"%"}</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,color:C.muted}}>{Number(row.prev).toLocaleString()}</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,color:C.muted}}>{isRev?"100.0%":prevPct+"%"}</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,fontWeight:700,color:deltaColor}}>{delta==="—"?"—":(parseFloat(delta)>0?"+":"")+delta+"pp"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {vaNote && (
            <Card style={{background:"#F0FDF4",borderLeft:`4px solid ${acc}`}}>
              <div style={{fontFamily:F,fontWeight:700,fontSize:13,color:"#14532D",marginBottom:6}}>💬 Note from Garima</div>
              <p style={{fontFamily:F,fontSize:13,color:"#166534",lineHeight:1.8,margin:0}}>{vaNote}</p>
            </Card>
          )}
        </>
      )}
 
      {/* ── GEOGRAPHY VIEW ── */}
      {view === "geography" && (
        <>
          {!hasGeo ? (
            <Card><div style={{textAlign:"center",padding:"32px 0",fontFamily:F,fontSize:13,color:C.muted}}>
              No geography data entered yet. Ask Garima to update in the admin panel under BI & Scenarios.
            </div></Card>
          ) : (
            <>
              {globalRegions.length > 0 && (
                <Card>
                  <div style={{fontFamily:F,fontWeight:700,fontSize:14,color:C.text,marginBottom:16}}>Global Revenue Split</div>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
                    <DonutChart data={globalRegions} valueKey="revenue" size={140}/>
                    <div style={{flex:1,minWidth:200}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:F}}>
                        <thead><tr style={{background:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",color:C.muted,fontSize:10,fontWeight:700}}>Region</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Revenue</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Cost</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Margin</th>
                        </tr></thead>
                        <tbody>
                          {globalRegions.map((r,i)=>{
                            const gp = r.revenue - r.cost;
                            const margin = r.revenue>0 ? ((gp/r.revenue)*100).toFixed(0) : "—";
                            return (
                              <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":"#FAFAFA"}}>
                                <td style={{padding:"7px 10px",fontWeight:600,color:C.text}}>{r.name}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,color:C.text}}>{fmtAED2(r.revenue)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,color:C.muted}}>{fmtAED2(r.cost)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,fontWeight:700,color:parseFloat(margin)>=40?acc:parseFloat(margin)>=20?C.amber:C.red}}>{margin}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}
              {indiaRegions.length > 0 && (
                <Card>
                  <div style={{fontFamily:F,fontWeight:700,fontSize:14,color:C.text,marginBottom:16}}>India Regional Split</div>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
                    <DonutChart data={indiaRegions} valueKey="revenue" size={140}/>
                    <div style={{flex:1,minWidth:200}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:F}}>
                        <thead><tr style={{background:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",color:C.muted,fontSize:10,fontWeight:700}}>Region</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Revenue</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Cost</th>
                          <th style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Margin</th>
                        </tr></thead>
                        <tbody>
                          {indiaRegions.map((r,i)=>{
                            const gp = r.revenue - r.cost;
                            const margin = r.revenue>0 ? ((gp/r.revenue)*100).toFixed(0) : "—";
                            return (
                              <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":"#FAFAFA"}}>
                                <td style={{padding:"7px 10px",fontWeight:600,color:C.text}}>{r.name}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,color:C.text}}>{fmtAED2(r.revenue)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,color:C.muted}}>{fmtAED2(r.cost)}</td>
                                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:FM,fontWeight:700,color:parseFloat(margin)>=40?acc:parseFloat(margin)>=20?C.amber:C.red}}>{margin}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
 
      {/* ── DEPARTMENT VIEW ── */}
      {view === "department" && (
        <>
          {!hasDept ? (
            <Card><div style={{textAlign:"center",padding:"32px 0",fontFamily:F,fontSize:13,color:C.muted}}>
              No department data entered yet. Ask Garima to update in the admin panel under BI & Scenarios.
            </div></Card>
          ) : (
            <>
              <Card>
                <div style={{fontFamily:F,fontWeight:700,fontSize:14,color:C.text,marginBottom:16}}>Revenue & Margin by Department</div>
                <DonutChart data={deptList} valueKey="revenue" size={140}/>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:F,marginTop:16}}>
                  <thead><tr style={{background:"#fff"}}>
                    <th style={{padding:"8px 12px",textAlign:"left",color:C.muted,fontSize:10,fontWeight:700}}>Department</th>
                    <th style={{padding:"8px 12px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Revenue</th>
                    <th style={{padding:"8px 12px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Cost</th>
                    <th style={{padding:"8px 12px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>Budget</th>
                    <th style={{padding:"8px 12px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>GP Margin</th>
                    <th style={{padding:"8px 12px",textAlign:"right",color:C.muted,fontSize:10,fontWeight:700}}>vs Budget</th>
                  </tr></thead>
                  <tbody>
                    {deptList.map((d,i)=>{
                      const gp = d.revenue - d.cost;
                      const margin = d.revenue>0 ? ((gp/d.revenue)*100).toFixed(0) : "—";
                      const budgetDiff = d.budget>0 ? d.cost - d.budget : null;
                      const budgetOk = budgetDiff !== null && budgetDiff <= 0;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":"#FAFAFA"}}>
                          <td style={{padding:"8px 12px",fontWeight:600,color:C.text}}>{d.name}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,color:C.text}}>{fmtAED2(d.revenue)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,color:C.muted}}>{fmtAED2(d.cost)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,color:C.muted}}>{d.budget>0?fmtAED2(d.budget):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,fontWeight:700,color:parseFloat(margin)>=40?acc:parseFloat(margin)>=20?C.amber:C.red}}>{margin==="—"?"—":margin+"%"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:FM,fontWeight:700,color:budgetDiff===null?"#9CA3AF":budgetOk?acc:C.red}}>
                            {budgetDiff===null?"—":budgetOk?"✓ Under":`+${fmtAED2(budgetDiff)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
 
 
// ─── UNIFIED COMPLIANCE CALENDAR ─────────────────────────────────────────────
function ComplianceCalendar({ client }) {
  const [filter, setFilter] = useState("all");
  const freezone = client?.freezone || "DMCC";
  const fye      = client?.financialYearEnd || "31 Dec";
 
  const deadlines = [
    { date:"28 Apr 2026", label:"VAT Return — Q1 2026",          category:"vat",     priority:"High",   desc:"File Q1 VAT return (Jan–Mar 2026) and pay AED 92.5K to FTA." },
    { date:"30 Apr 2026", label:"Audit Report Submission",        category:"audit",   priority:"High",   desc:`Submit audited financial statements to ${freezone}.` },
    { date:"15 May 2026", label:`${freezone} License Renewal`,    category:"license", priority:"High",   desc:`Renew annual trade license. Prepare documents early.` },
    { date:"28 Jul 2026", label:"VAT Return — Q2 2026",           category:"vat",     priority:"Medium", desc:"File Q2 VAT return (Apr–Jun 2026) and settle net VAT." },
    { date:"30 Sep 2026", label:"CT Return Filing",               category:"ct",      priority:"High",   desc:`CT return due 9 months after FYE (${fye}). Elect SBR if eligible.` },
    { date:"28 Oct 2026", label:"VAT Return — Q3 2026",           category:"vat",     priority:"Medium", desc:"File Q3 VAT return (Jul–Sep 2026)." },
    { date:"31 Dec 2026", label:"SBR Election Window Closes",     category:"ct",      priority:"High",   desc:"Last period for Small Business Relief election under current regime." },
    { date:"28 Jan 2027", label:"VAT Return — Q4 2026",           category:"vat",     priority:"Medium", desc:"File Q4 VAT return (Oct–Dec 2026)." },
    { date:"30 Jun 2026", label:"ESR Annual Notification",        category:"other",   priority:"Low",    desc:"Economic Substance Regulations notification (if applicable)." },
  ].sort((a,b) => new Date(a.date) - new Date(b.date));
 
  const catColors = { vat:"#3B82F6", ct:"#8B5CF6", audit:"#10B981", license:"#F59E0B", other:"#6B7280" };
  const catLabels = { vat:"VAT", ct:"Corp Tax", audit:"Audit", license:"License", other:"Other" };
  const filtered  = filter === "all" ? deadlines : deadlines.filter(d => d.category === filter);
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
      <h2 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:6 }}>Compliance Calendar</h2>
      <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:20 }}>All UAE deadlines — VAT, Corporate Tax, Audit, License — in one view.</p>
 
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["all","All"],["vat","VAT"],["ct","Corp Tax"],["audit","Audit"],["license","License"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding:"8px 16px", borderRadius:60, border:"none",
            cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700,
            background:filter===id?(catColors[id]||C.blue):"#F3F4F6",
            color:filter===id?"white":C.muted,
            outline:`1.5px solid ${filter===id?(catColors[id]||C.blue):C.border}` }}>
            {lbl}
          </button>
        ))}
      </div>
 
      {/* Garima's compliance note */}
      <Card style={{ borderLeft:"3px solid #00732F", background:"#F0FDF4", marginBottom:4 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"#15803D", marginBottom:6 }}>Note from Garima</div>
        <p style={{ fontFamily:F, fontSize:13, color:"#166534", lineHeight:1.8, margin:0 }}>
          Three high-priority deadlines in the next 90 days: VAT return (28 Apr), DMCC audit submission (30 Apr), and license renewal (15 May). I recommend addressing them in this order — VAT first as it has a financial penalty, then audit as it unlocks QFZP confirmation, then license. I'll send you a document checklist for each one week before the deadline.
        </p>
      </Card>
 
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {filtered.map((d,i) => {
          const isPast = new Date(d.date) < new Date();
          return (
            <Card key={i} style={{ padding:"14px 18px", opacity:isPast?0.55:1 }}>
              <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div style={{ minWidth:80, textAlign:"center" }}>
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.muted }}>
                    {new Date(d.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>{new Date(d.date).getFullYear()}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{d.label}</span>
                    <span style={{ padding:"2px 8px", borderRadius:60, fontSize:10, fontWeight:700, fontFamily:F,
                      background:`${catColors[d.category]}22`, color:catColors[d.category], border:`1px solid ${catColors[d.category]}44` }}>
                      {catLabels[d.category]}
                    </span>
                    <span style={{ padding:"2px 8px", borderRadius:60, fontSize:10, fontWeight:700, fontFamily:F,
                      background:d.priority==="High"?"#FEF2F2":d.priority==="Medium"?"#FFFBEB":"#ECFDF5",
                      color:d.priority==="High"?C.red:d.priority==="Medium"?C.amber:C.green }}>
                      {d.priority}
                    </span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0, lineHeight:1.6 }}>{d.desc}</p>
                </div>
                {isPast && <span style={{ padding:"2px 8px", borderRadius:60, background:"#ECFDF5", color:C.green, fontSize:10, fontWeight:700 }}>✓ Past</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
 
// ─── QFZP / FREE ZONE MODULE ──────────────────────────────────────────────────
function QFZPModule({ client, reportData }) {
  const qd       = reportData?.qfzpSubstance || {};
  const rd       = reportData?.qfzp          || {};
  const freezone = client?.freezone           || "DMCC";
  const period   = qd.period || reportData?.monthLabel || "Current Period";
  const note     = qd.garimaNote || "";
  const score    = Number(qd.overallScore || rd.qfzpScore || 82);
  const isDemo   = !qd.overallScore && !rd.qfzpScore;
 
  const fzDetails = {
    DMCC:  { name:"Dubai Multi Commodities Centre", regulator:"DMCC Authority",  deadline:"30 April" },
    JAFZA: { name:"Jebel Ali Free Zone",             regulator:"JAFZA Authority", deadline:"30 April" },
    ADGM:  { name:"Abu Dhabi Global Market",         regulator:"ADGM",           deadline:"30 June"  },
    RAK:   { name:"RAK Economic Zone",               regulator:"RAKEZ",          deadline:"30 June"  },
    DIFC:  { name:"Dubai Int'l Financial Centre",    regulator:"DIFC Authority",  deadline:"30 April" },
  };
  const fz = fzDetails[freezone] || fzDetails.DMCC;
 
  const cigas = (qd.cigas && qd.cigas.length) ? qd.cigas : [
    { activity:"Trading — sourcing, procurement & distribution",        qualified:true,  pct:57, note:"Core activity — conducted from DMCC office" },
    { activity:"Treasury — intercompany financing (Rashidi Holdings)",  qualified:true,  pct:18, note:"Intragroup — qualifies per Art. 18 schedule" },
    { activity:"Export sales — outside UAE",                            qualified:true,  pct:17, note:"Zero-rated VAT, qualifying for QFZP" },
    { activity:"Advisory services to mainland UAE clients",             qualified:false, pct:8,  note:"⚠ Non-qualifying — above 5% de-minimis threshold" },
  ];
 
  const substanceItems = (qd.substanceItems && qd.substanceItems.length) ? qd.substanceItems : [
    {
      pillar:"Employees",
      requirement:"Adequate qualified employees physically present in the free zone to conduct CIGA",
      current:qd.employeeCount ? `${qd.employeeCount} employees at ${freezone}` : "5 full-time employees at DMCC",
      status:"met",
      evidence:["Employment contracts","UAE visa/work permits","DMCC office access records","Monthly payroll (WPS)"],
      gap:"",
    },
    {
      pillar:"Operating Expenditure",
      requirement:"Adequate opex incurred in the free zone commensurate with level of activities",
      current:`AED ${qd.opexAED||"412,000"} p.a. ${freezone}-based opex`,
      status:"met",
      evidence:["DMCC lease invoice","Utilities (DEWA/district cooling)","Payroll costs","Professional fees"],
      gap:"",
    },
    {
      pillar:"Physical Presence",
      requirement:"Adequate physical assets — office premises in the free zone",
      current:`${qd.officeSqft||"1,200"} sq ft leased office — ${freezone} — Lease until Dec 2026`,
      status:"met",
      evidence:["Lease agreement (valid)","Office floor plan","License showing registered address","Utility bills"],
      gap:"",
    },
    {
      pillar:"Core Income-Generating Activities",
      requirement:"CIGA must be conducted in the free zone by the QFZP — not outsourced to mainland/related parties",
      current:"Trading, sourcing, treasury — DMCC office",
      status:Number(cigas.find(c=>!c.qualified)?.pct||0)>=5?"watch":"met",
      evidence:["Board meeting minutes (DMCC)","Management decisions documented","Supplier/customer contracts from DMCC address"],
      gap:Number(cigas.find(c=>!c.qualified)?.pct||0)>=5
        ? `Mainland services at ${cigas.find(c=>!c.qualified)?.pct||8}% — above 5% de-minimis threshold. Restructure contracts.`
        : "",
    },
    {
      pillar:"Audited Financial Statements",
      requirement:"Mandatory annual audit & submission to free zone authority to maintain QFZP status",
      current:`FY 2025 audit in progress — submission due ${fz.deadline} 2026`,
      status: qd.auditSubmitted ? "met" : "action",
      evidence:["Audit firm engagement letter","Management accounts — PENDING sign-off"],
      gap:qd.auditSubmitted ? "" : `⚠ CRITICAL: Sign management accounts and send to audit firm before ${fz.deadline} 2026. Missing this risks retroactive 9% CT on all income.`,
    },
  ];
 
  const qualPct    = cigas.filter(c=>c.qualified).reduce((s,c)=>s+Number(c.pct||0),0);
  const nonQualPct = cigas.filter(c=>!c.qualified).reduce((s,c)=>s+Number(c.pct||0),0);
  const actionCount = substanceItems.filter(s=>s.status==="action").length;
  const watchCount  = substanceItems.filter(s=>s.status==="watch").length;
 
  const statusColor = s => s==="met"?C.green:s==="watch"?C.amber:C.red;
  const statusBg    = s => s==="met"?"#ECFDF5":s==="watch"?"#FFFBEB":"#FEF2F2";
  const statusLabel = s => s==="met"?"✓ Met":s==="watch"?"⚠ Watch":"✗ Action Required";
 
  const handlePrint = async () => {
    const w = window.open("","_blank");
    const { generateQFZPSubstancePDF } = await _pdfMod;
    const html = generateQFZPSubstancePDF({ client, reportData });
    w.document.write(html); w.document.close();
    setTimeout(()=>w.print(),600);
  };
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
 
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:14, flexWrap:"wrap", gap:20 }}>
        <div>
          <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.purple,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            NEW · QFZP Compliance · Federal Decree-Law No. 47 of 2022
          </div>
          <h2 style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, margin:0 }}>
            QFZP Substance Tracker
          </h2>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
            {fz.name} ({freezone}) · {fz.regulator} · Audit deadline: {fz.deadline}
          </p>
        </div>
        <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:8,
          padding:"10px 20px", borderRadius:16, border:"none", cursor:"pointer",
          background:C.purple, color:"white", fontFamily:F, fontWeight:700, fontSize:13,
          boxShadow:`0 4px 14px ${C.purple}40` }}>
          Download PDF
        </button>
      </div>
 
      {isDemo && (
        <div style={{ padding:"10px 16px", borderRadius:16, background:"#FFFBEB",
          border:"1px solid #FCD34D", marginBottom:16, fontFamily:F, fontSize:12, color:C.warning }}>
          ⚠️ Showing demo data. Enter actual substance data in admin panel → UAE / Tax tab → QFZP Substance.
        </div>
      )}
 
      {/* Score + Status */}
      <Card style={{ marginBottom:14, background:"#F5F3FF", border:`2px solid ${C.purple}` }}>
        <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ textAlign:"center", minWidth:120 }}>
            <div style={{ fontFamily:FM, fontSize:56, fontWeight:900,
              color:score>=80?C.green:score>=65?C.amber:C.red, lineHeight:1 }}>{score}</div>
            <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.purple, marginTop:4 }}>
              /100 · QFZP Score
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ height:12, background:C.border, borderRadius:60,
              overflow:"hidden", marginBottom:10 }}>
              <div style={{ height:"100%", width:`${score}%`, borderRadius:60,
                background:score>=80?C.green:score>=65?C.amber:C.red,
                transition:"width 0.5s" }}/>
            </div>
            <div style={{ fontFamily:F, fontSize:13, color:"#4C1D95", lineHeight:1.7, marginBottom:10 }}>
              {score>=80
                ? "✅ Strong compliance — maintain substance requirements and file audited financials on time."
                : score>=65
                ? "⚠️ Good but gaps exist — address action items before next FTA review."
                : "Significant gaps — immediate action required."}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[
                { label:`${substanceItems.filter(s=>s.status==="met").length} Met`, color:C.green,  bg:"#ECFDF5" },
                { label:`${watchCount} Watch`,                                       color:C.amber,  bg:"#FFFBEB" },
                { label:`${actionCount} Action Required`,                            color:C.red,    bg:"#FEF2F2" },
              ].map((s,i) => (
                <span key={i} style={{ padding:"4px 12px", borderRadius:60, fontSize:12,
                  fontWeight:700, fontFamily:F, background:s.bg, color:s.color }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
 
      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Qualifying Income",     val:`${qualPct}%`,    color:C.green,  sub:"0% CT rate" },
          { label:"Non-Qualifying Income", val:`${nonQualPct}%`, color:nonQualPct>=5?C.red:C.amber, sub:nonQualPct>=5?"⚠ Above 5% de-minimis":"Below 5% threshold" },
          { label:"Effective CT Rate",     val:"0%",             color:C.green,  sub:"QFZP status active" },
          { label:"Action Items",          val:actionCount,      color:actionCount>0?C.red:C.green, sub:actionCount>0?"Need resolution":"All clear" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:16 }}>
            <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:s.color }}>{s.val}</div>
            <div style={{ fontFamily:F, fontSize:10, color:C.dim, marginTop:4 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
 
      {/* What is QFZP box */}
      <Card style={{ marginBottom:14, background:`${C.purple}06`, borderLeft:`4px solid ${C.purple}` }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:36, height:36, borderRadius:16, background:C.purple, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏙️</div>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:6 }}>
              What is QFZP & Why Does Substance Matter?
            </div>
            <p style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.75, margin:0 }}>
              A <strong style={{color:C.text}}>Qualifying Free Zone Person</strong> pays <strong style={{color:C.green}}>0% Corporate Tax</strong> on qualifying income
              instead of the standard 9%. To maintain this status, the company must satisfy 5 substance requirements
              every year — employees, opex, physical presence, CIGA in the free zone, and audited financials.
              The FTA audits substance requirements and can <strong style={{color:C.red}}>revoke QFZP status retroactively</strong> if
              any pillar fails — triggering 9% CT on all income for that period.
              Non-qualifying income must stay below <strong style={{color:C.text}}>5% of revenue OR AED 5M</strong> (whichever is lower).
            </p>
          </div>
        </div>
      </Card>
 
      {/* CIGA Table */}
      <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", background:"#4C1D95" }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>
            CIGA Analysis — Core Income-Generating Activities
          </div>
          <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
            Qualifying income taxed at 0% · Non-qualifying at 9% · De-minimis: non-qualifying &lt;5% or &lt;AED 5M
          </div>
        </div>
 
        {/* Column headers */}
        <div style={{ display:"grid", gridTemplateColumns:"35fr 13fr 9fr 30fr 9fr",
          background:"#F5F3FF", padding:"8px 18px", borderBottom:`1px solid ${C.border}` }}>
          {["Activity","Classification","% Rev","Notes","CT Rate"].map((h,i) => (
            <div key={i} style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.07em",
              textAlign:i===2||i===4?"right":"left" }}>{h}</div>
          ))}
        </div>
 
        {cigas.map((c,i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"35fr 13fr 9fr 30fr 9fr",
            padding:"11px 18px", background:i%2===0?"white":"#FAFAFA",
            borderBottom:`1px solid ${C.border}`,
            borderLeft:c.qualified?"none":`3px solid ${C.red}` }}>
            <div style={{ fontFamily:F, fontSize:13, color:C.text, fontWeight:c.qualified?400:500 }}>{c.activity}</div>
            <div>
              <span style={{ padding:"3px 8px", borderRadius:60, fontSize:10, fontWeight:700, fontFamily:F,
                background:c.qualified?"#ECFDF5":"#FEF2F2", color:c.qualified?C.green:C.red }}>
                {c.qualified?"✓ Qualifying":"✗ Non-Qual."}
              </span>
            </div>
            <div style={{ fontFamily:FM, fontSize:13, fontWeight:700,
              color:c.qualified?C.green:C.red, textAlign:"right" }}>{c.pct}%</div>
            <div style={{ fontFamily:F, fontSize:11, color:c.qualified?C.muted:C.amber, paddingLeft:8, lineHeight:1.5 }}>
              {c.note}
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontFamily:F, fontSize:11, fontWeight:700,
                color:c.qualified?C.green:C.red }}>{c.qualified?"0% CT":"9% CT"}</span>
            </div>
          </div>
        ))}
 
        {/* Totals */}
        <div style={{ display:"grid", gridTemplateColumns:"35fr 13fr 9fr 30fr 9fr",
          padding:"12px 18px", background:"#F0FDF4", borderTop:`2px solid ${C.green}` }}>
          <div style={{ fontFamily:F, fontSize:13, fontWeight:800, color:C.text }}>Total Qualifying</div>
          <div/>
          <div style={{ fontFamily:FM, fontSize:14, fontWeight:600, color:C.green, textAlign:"right" }}>{qualPct}%</div>
          <div/>
          <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.green, textAlign:"right" }}>0%</div>
        </div>
        {nonQualPct > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"35fr 13fr 9fr 30fr 9fr",
            padding:"12px 18px", background:nonQualPct>=5?"#FEF2F2":"#FFFBEB",
            borderTop:`1px solid ${nonQualPct>=5?C.red:C.amber}` }}>
            <div style={{ fontFamily:F, fontSize:13, fontWeight:800, color:nonQualPct>=5?C.red:C.amber }}>
              Non-Qualifying {nonQualPct>=5?"⚠ ABOVE DE-MINIMIS":""}
            </div>
            <div/>
            <div style={{ fontFamily:FM, fontSize:14, fontWeight:600,
              color:nonQualPct>=5?C.red:C.amber, textAlign:"right" }}>{nonQualPct}%</div>
            <div style={{ fontFamily:F, fontSize:11, color:nonQualPct>=5?C.red:C.amber, paddingLeft:8 }}>
              {nonQualPct>=5?"⚠ De-minimis breach — restructure contracts immediately":"✓ Within de-minimis threshold"}
            </div>
            <div style={{ fontFamily:F, fontSize:12, fontWeight:700,
              color:nonQualPct>=5?C.red:C.amber, textAlign:"right" }}>9%</div>
          </div>
        )}
      </Card>
 
      {/* 5-Pillar Substance Requirements */}
      <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", background:"#4C1D95" }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>
            5-Pillar Substance Requirements
          </div>
          <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
            All 5 must be satisfied every year to maintain QFZP status and 0% CT rate
          </div>
        </div>
 
        {substanceItems.map((s,i) => (
          <div key={i} style={{ borderBottom:`1px solid ${C.border}`,
            borderLeft:`4px solid ${statusColor(s.status)}`,
            background:statusBg(s.status)+"33" }}>
 
            {/* Pillar header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 18px", flexWrap:"wrap", gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:2 }}>
                  {s.pillar}
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.5 }}>
                  {s.requirement}
                </div>
              </div>
              <span style={{ padding:"5px 14px", borderRadius:60, fontSize:12, fontWeight:700,
                fontFamily:F, background:statusBg(s.status), color:statusColor(s.status),
                flexShrink:0 }}>
                {statusLabel(s.status)}
              </span>
            </div>
 
            {/* Current status */}
            <div style={{ padding:"0 18px 12px" }}>
              <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, marginBottom:8 }}>
                Current: {s.current}
              </div>
 
              {/* Evidence checklist */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:s.gap?10:0 }}>
                {s.evidence.map((e,j) => (
                  <div key={j} style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ color:e.includes("PENDING")||e.includes("⚠")?C.amber:C.green,
                      fontSize:12, fontWeight:700, flexShrink:0 }}>
                      {e.includes("PENDING")||e.includes("⚠")?"⚠":"✓"}
                    </span>
                    <span style={{ fontFamily:F, fontSize:11,
                      color:e.includes("PENDING")||e.includes("⚠")?C.amber:C.muted }}>{e}</span>
                  </div>
                ))}
              </div>
 
              {/* Gap / Action */}
              {s.gap && (
                <div style={{ padding:"10px 14px", borderRadius:16, background:"#FEF2F2",
                  border:`1px solid ${C.red}33` }}>
                  <div style={{ fontFamily:F, fontSize:12, color:C.red, fontWeight:600, lineHeight:1.6 }}>
                    {s.gap}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>
 
      {/* Note from Garima */}
      <Card style={{ background:"#FFFBF0", border:"1px solid #FDE68A" }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:40, height:52, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#F59E0B,#D97706)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:F, fontWeight:800, fontSize:16, color:"white" }}>G</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.warning, marginBottom:2 }}>
              Note from Garima
            </div>
            <div style={{ fontFamily:F, fontSize:11, color:"#B45309", marginBottom:10 }}>
              Garima Agarwal · CA · QFZP Substance Analysis
            </div>
            <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.85, margin:"0 0 14px" }}>
              {note || "QFZP substance analysis not yet added. Garima will update this section with specific compliance observations and action items."}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href={WA} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#25D366", color:"white", borderRadius:16, padding:"8px 16px",
                  fontFamily:F, fontWeight:700, fontSize:12, textDecoration:"none" }}>
                WhatsApp Garima
              </a>
              <button onClick={handlePrint}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"#FEF3C7", color:C.warning, borderRadius:16, padding:"8px 16px",
                  fontFamily:F, fontWeight:700, fontSize:12,
                  border:"1px solid #FDE68A", cursor:"pointer" }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
 
 
// ─── AUDIT READINESS ──────────────────────────────────────────────────────────
function AuditReadiness({ client, reportData }) {
  const rd        = reportData?.auditReadiness || {};
  const freezone  = client?.freezone || "DMCC";
  const auditScore = rd.auditScore || 68;
 
  const checklistItems = rd.checklistItems || [
    { cat:"Financial Statements",  item:"Audited P&L (current year)",                done:false, req:true  },
    { cat:"Financial Statements",  item:"Audited Balance Sheet",                     done:false, req:true  },
    { cat:"Financial Statements",  item:"Cash Flow Statement (IFRS)",                done:true,  req:true  },
    { cat:"Financial Statements",  item:"Notes to Accounts",                         done:true,  req:true  },
    { cat:"Tax Documentation",     item:"VAT Returns (last 4 quarters)",             done:true,  req:true  },
    { cat:"Tax Documentation",     item:"CT Registration Certificate",               done:true,  req:true  },
    { cat:"Tax Documentation",     item:"QFZP Supporting Documentation",             done:false, req:true  },
    { cat:"Tax Documentation",     item:"Transfer Pricing Documentation",            done:false, req:true  },
    { cat:"Free Zone Docs",        item:`${freezone} License (current)`,             done:true,  req:true  },
    { cat:"Free Zone Docs",        item:`${freezone} Substance Evidence`,            done:false, req:true  },
    { cat:"Free Zone Docs",        item:"Lease Agreement (physical presence)",       done:true,  req:true  },
    { cat:"Corporate Governance",  item:"Board Resolutions",                         done:true,  req:false },
    { cat:"Corporate Governance",  item:"Shareholders Agreement",                    done:true,  req:false },
    { cat:"Other",                 item:"Related Party Transactions Schedule",       done:false, req:true  },
    { cat:"Other",                 item:"Bank Statements (12 months)",               done:true,  req:true  },
  ];
 
  const cats       = [...new Set(checklistItems.map(c => c.cat))];
  const totalReq   = checklistItems.filter(c => c.req).length;
  const doneReq    = checklistItems.filter(c => c.req && c.done).length;
 
  return (
    <div className="ns-page">
      <UAEDisclaimer/>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:20 }}>
        <div>
          <h2 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", margin:0 }}>Audit Readiness</h2>
          <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:4 }}>
            QFZP audit pack checklist — {doneReq}/{totalReq} required docs ready
          </p>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:F, fontSize:20, fontWeight:700,
            color:auditScore>=80?C.green:auditScore>=60?C.amber:C.red }}>{auditScore}/100</div>
          <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>Audit Readiness Score</div>
        </div>
      </div>
 
      {cats.map(cat => {
        const items    = checklistItems.filter(c => c.cat === cat);
        const doneCount = items.filter(c => c.done).length;
        return (
          <Card key={cat} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{cat}</div>
              <span style={{ padding:"2px 8px", borderRadius:60, fontSize:11, fontWeight:700, fontFamily:F,
                background:doneCount===items.length?"#ECFDF5":"#FFFBEB",
                color:doneCount===items.length?C.green:C.amber }}>
                {doneCount}/{items.length}
              </span>
            </div>
            {items.map((item,i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <span style={{ color:item.done?C.green:C.red, fontWeight:700, flexShrink:0 }}>{item.done?"✓":"✗"}</span>
                <span style={{ fontFamily:F, fontSize:13, color:C.text, flex:1 }}>{item.item}</span>
                {item.req && !item.done && (
                  <span style={{ padding:"2px 8px", borderRadius:60, background:"#FEF2F2", color:C.red, fontSize:10, fontWeight:700 }}>Required</span>
                )}
              </div>
            ))}
          </Card>
        );
      })}
 
      <Card style={{ borderLeft:"3px solid #059669", background:"#F0FDF4", marginBottom:14 }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:"#15803D", marginBottom:8 }}>Note from Garima — Audit Readiness</div>
        <p style={{ fontFamily:F, fontSize:13, color:"#166534", lineHeight:1.8, margin:"0 0 12px" }}>
          Your audit readiness score of {auditScore}/100 is encouraging, but there are 5 required documents still outstanding. The highest-priority gap is QFZP Supporting Documentation — without this, your free zone status cannot be confirmed in the audit. I'd suggest we schedule a 45-minute working session to close these items before the 30 April DMCC deadline. I can prepare the first draft of the CT computation and transfer pricing documentation if you share the relevant contracts.
        </p>
      </Card>
      <button onClick={() => window.open(WA,"_blank")} style={{ width:"100%", padding:24,
        borderRadius:16, border:"none", background:C.green, color:"white",
        fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer" }}>
        Get Audit Prep Support from Garima
      </button>
    </div>
  );
}
 
// ─── TERMS & CONDITIONS / PRIVACY ────────────────────────────────────────────
function Terms() {
  const [tab, setTab] = useState("terms");
  return (
    <div style={{ padding:24, maxWidth:720 }}>
      <SectionTitle sub="Legal documentation for Finzzup — Garima Agarwal, CA (M.No. 160944)">Legal & Compliance</SectionTitle>
 
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:14 }}>
        {[["terms","Terms & Conditions"],["privacy","Privacy Policy"],["copyright","© Copyright"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"7px 16px", background:"none", border:"none",
            borderBottom: tab===id ? `2px solid ${C.blue}` : "2px solid transparent",
            cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:tab===id?600:400,
            color: tab===id ? C.blue : C.muted, marginBottom:-1 }}>
            {lbl}
          </button>
        ))}
      </div>
 
      {tab === "terms" && (
        <Card style={{ lineHeight:1.8 }}>
          <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:16 }}>Last updated: January 2026</div>
          {[
            { h:"1. Services", t:"Finzzup™ is a trademark of Garima Agarwal, Chartered Accountant (Membership No. 160944) (TM Application Nos. 7636571 & 7636572). All CFO advisory services, financial analysis, and valuation services are provided by Garima Agarwal, CA. All engagements are governed by a separate Engagement Letter, which supersedes these general terms where there is any conflict." },
            { h:"2. Proposals and Pricing", t:"All prices quoted are indicative. A formal proposal with a fixed scope and price will be sent within 24 hours of a service request. Engagements begin only upon signed acceptance of the proposal and receipt of the advance payment." },
            { h:"3. Confidentiality", t:"Finzzup maintains strict confidentiality of all client data, financial information, and business information shared. Data is used solely for the purpose of the engagement and is never shared with third parties without explicit written consent." },
            { h:"4. Intellectual Property", t:"All deliverables produced by Finzzup (reports, models, presentations) remain the property of the client upon full payment. Finzzup retains the right to use anonymized methodologies and frameworks for other engagements." },
            { h:"5. Liability", t:"Finzzup's liability is limited to the fees paid for the specific engagement. Valuations and financial projections are based on information provided by the client — Finzzup is not liable for decisions made on the basis of its reports." },
            { h:"6. Payments", t:"Invoices are payable within 15 days of issuance. Late payments attract interest at 18% per annum. Finzzup reserves the right to pause services for overdue accounts." },
            { h:"7. Governing Law", t:"These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:6 }}>{s.h}</div>
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
            { h:"7. Contact", t:"For privacy concerns, contact: Garima Agarwal, CA (M.No. 160944) · garima@finzzup.com · Finzzup, Mumbai, India." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:6 }}>{s.h}</div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, margin:0 }}>{s.t}</p>
            </div>
          ))}
        </Card>
      )}
 
      {tab === "copyright" && (
        <Card style={{ lineHeight:1.8 }}>
          <div style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:20 }}>
            © 2024–2026 Finzzup™. All rights reserved. Finzzup is a trademark of Garima Agarwal, Chartered Accountant (Membership No. 160944). TM Application Nos. 7636571 & 7636572.
          </div>
          {[
            { h:"Reports & Deliverables", t:"All valuation reports, financial models, MIS packs, board packs, and other deliverables produced by Finzzup are protected by copyright. Upon full payment, clients receive a non-exclusive licence to use the deliverables for their own business purposes." },
            { h:"Portal Content", t:"The content, design, and functionality of this client portal are proprietary to Finzzup™. Finzzup is a trademark of Garima Agarwal (TM Application Nos. 7636571 & 7636572). All CFO advisory services and financial analysis are provided by Garima Agarwal, Chartered Accountant (Membership No. 160944). This portal is a proprietary client reporting platform of Finzzup. Unauthorised reproduction, distribution, or modification is prohibited." },
            { h:"Trademark", t:"'Finzzup™' is a trademark of Garima Agarwal (TM Application Nos. 7636571 & 7636572, Classes 36 & 42). Use of this mark without prior written consent is not permitted." },
            { h:"Third-Party Tools", t:"This portal uses Supabase, Recharts, and Google Fonts under their respective licences. Calendly is used for scheduling under its commercial licence." },
          ].map((s,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:6 }}>{s.h}</div>
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
 
// ─── UAE PDF GENERATORS ───────────────────────────────────────────────────────
 
// ─── PDF REPORT GENERATOR ────────────────────────────────────────────────────
function UAECFOReport({ client, reportData, kpis }) {
  const [tab, setTab] = useState("cashflow");
  const freezone = client?.freezone || "DMCC";
  const period   = reportData?.monthLabel || "Current Period";
  const uaeNote  = reportData?.uaeGarimaNote || reportData?.cashflowNote || "Your CFO report for this period has been prepared by Garima. Review each section using the tabs below — each covers a distinct area of your UAE financial management.";
 
  // FIXED: UAE reports only — no India packs, no KPI duplicates from Overview/Dashboard
  const groups = [
    {
      label: "Cash & Liquidity",
      items: [
        { id:"cashflow",    emoji:"ti-trending-up",  label:"Cash Flow Forecast"      },
        { id:"workingcap",  emoji:"ti-chart-area",   label:"Working Capital & AR"    },
      ]
    },
    {
      label: "UAE Tax & Compliance",
      items: [
        { id:"vatreport",   emoji:"ti-receipt", label:"VAT Compliance Report"    },
        { id:"revrecon",    emoji:"ti-scale", label:"Revenue Reconciliation"  },
        { id:"qfzp",        emoji:"ti-building-skyscraper", label:"QFZP Tracker" },
      ]
    },
    {
      label: "Profitability",
      items: [
        { id:"vertical",    emoji:"ti-chart-bar", label:"Vertical Analysis"        },
      ]
    },
  ];
 
  // Tab navigation — same PackLayout style as India packs
  const allItems = groups.flatMap(g => g.items);
 
  return (
    <div>
      {/* Header */}
      <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>UAE CFO Report</div>
          <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:"#00732F",
            background:"#E8F5EE", padding:"4px 12px", borderRadius:60 }}>
            {freezone}
          </span>
          {period && (
            <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
              background:`${C.blue}12`, padding:"4px 12px", borderRadius:60 }}>
              {period}
            </span>
          )}
        </div>
        <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>Updated by Garima</div>
      </div>
 
      <PackLayout tab={tab} setTab={setTab} groups={groups} accent={"#00732F"}>
        <div>
 
          {/* ── CASH FLOW FORECAST ── */}
          {/* FIXED: Future-only. No historical revenue/GM/AR (those are in Dashboard/Working Capital) */}
          {tab === "cashflow" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, padding:20 }}>
              {/* Garima Note — prominent at top */}
              <Card style={{ background:"#FFFBF0", border:"1px solid #FDE68A", borderLeft:`4px solid #F59E0B` }}>
                <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                    background:"linear-gradient(135deg,#F59E0B,#D97706)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:F, fontWeight:800, fontSize:15, color:"white" }}>G</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.warning, marginBottom:2 }}>Note from Garima — Cash Flow</div>
                    <div style={{ fontFamily:F, fontSize:11, color:"#B45309", marginBottom:8 }}>Forward-looking cash position · {period}</div>
                    <p style={{ fontFamily:F, fontSize:13, color:"#78350F", lineHeight:1.85, margin:0 }}>
                      {reportData?.cashflowGarimaNote || "Cash flow forecast for the next 3–6 months. This section covers projected cash inflows, outflows, and ending balance only. For historical cash performance, see the Full Dashboard."}
                    </p>
                  </div>
                </div>
              </Card>
 
              {/* Forecast KPIs — future only, styled like Related Party report */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
                {[
                  { label:"Projected Cash — End of Quarter", value:reportData?.projectedCash    || reportData?.treasury?.totalCash || "AED 580K", color:C.teal,   icon:"ti-cash" },
                  { label:"VAT Reserve Required",            value:reportData?.vatReserve       || "AED 92.5K",                                   color:C.amber,  icon:"ti-receipt" },
                  { label:"Net Cash After Obligations",      value:reportData?.netCashAfterObl  || "AED 487K",                                    color:C.green,  icon:"ti-circle-check" },
                ].map((s,i) => (
                  <Card key={i} style={{ padding:18,  }}>
                    <div style={{ marginBottom:8 }}><i className={"ti " + (s.icon||"ti-circle")} style={{fontSize:18, color:s.color||"currentColor"}}/></div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:F, fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
                  </Card>
                ))}
              </div>
 
              {/* 6-Month Cash Projection Table — FIXED: future-only, no past revenue/GM */}
              <Card style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"12px 18px", background:"#065f46" }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>
                    6-Month Cash Flow Projection
                  </div>
                  <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
                    Forward-looking only · Historical data available on Full Dashboard
                  </div>
                </div>
                {/* Column headers */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                  background:"#F0FDF4", padding:"8px 16px", borderBottom:`1px solid ${C.border}` }}>
                  {["Item","M+1","M+2","M+3","M+4","M+5","M+6"].map((h,i) => (
                    <div key={i} style={{ fontFamily:F, fontSize:9, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.07em",
                      textAlign:i===0?"left":"right" }}>{h}</div>
                  ))}
                </div>
                {[
                  { label:"Opening Balance",     values:["620K","587K","561K","598K","642K","705K"], type:"neutral" },
                  { label:"+ Expected Inflows",  values:["185K","190K","210K","195K","220K","215K"], type:"in"      },
                  { label:"− VAT Payment",        values:["92.5K","—","—","88K","—","—"],            type:"out"     },
                  { label:"− Operating Costs",    values:["125K","125K","125K","125K","125K","125K"], type:"out"     },
                  { label:"− Other Obligations",  values:["—","91K","48K","26K","32K","—"],           type:"out"     },
                  { label:"= Closing Balance",   values:["587K","561K","598K","554K","705K","795K"], type:"total"   },
                ].map((r,i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                    padding:"9px 16px",
                    background:r.type==="total"?"#ECFDF5":r.type==="in"?"#F0FDF4":i%2===0?"white":"#FAFAFA",
                    borderBottom:`1px solid ${C.border}`,
                    borderTop:r.type==="total"?`2px solid ${C.green}`:"none" }}>
                    <div style={{ fontFamily:F, fontSize:12,
                      fontWeight:r.type==="total"?800:r.type==="neutral"?700:400,
                      color:r.type==="total"?C.green:C.text }}>
                      {r.label}
                    </div>
                    {r.values.map((v,j) => (
                      <div key={j} style={{ fontFamily:FM, fontSize:11,
                        fontWeight:r.type==="total"?800:600,
                        color:r.type==="total"?C.green:r.type==="out"?C.red:r.type==="in"?C.green:C.text,
                        textAlign:"right" }}>
                        {v==="—"?"—":`AED ${v}`}
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
 
              {/* What-If Scenarios */}
              <Card>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", marginBottom:14 }}>
                  What-If Scenarios
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { scenario:"Al Manara Group pays AED 87.5K this month",          impact:"Cash improves to AED 675K by month-end", color:C.green, tag:"Upside" },
                    { scenario:"VAT return delayed — penalty AED 1K + 2%/month",      impact:"Cash position reduces by ~AED 12.7K over 3 months", color:C.amber, tag:"Risk" },
                    { scenario:"Mainland contracts restructured — non-qualifying drops below 5%", impact:"QFZP status secured, no CT exposure", color:C.blue, tag:"Action" },
                    { scenario:"Two new client contracts close in M+2",               impact:"Inflows increase AED 180K — closing balance AED 741K",  color:C.green, tag:"Upside" },
                  ].map((s,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12,
                      padding:"11px 14px", borderRadius:16,
                      background:s.color===C.green?"#F0FDF4":s.color===C.amber?"#FFFBEB":"#EFF6FF",
                      border:`1px solid ${s.color}33` }}>
                      <span style={{ padding:"2px 8px", borderRadius:60, fontSize:10,
                        fontWeight:700, fontFamily:F, flexShrink:0,
                        background:s.color===C.green?"#ECFDF5":s.color===C.amber?"#FEF3C7":"#EFF6FF",
                        color:s.color }}>{s.tag}</span>
                      <div>
                        <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, marginBottom:3 }}>{s.scenario}</div>
                        <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>{s.impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
 
              {/* Download */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={async() => { const w=window.open("","_blank"); const{generateVATPDF}=await _pdfMod; const html=generateVATPDF({client,reportData}); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }}
                  style={{ padding:"10px 20px", borderRadius:16, border:"none", cursor:"pointer",
                    background:C.teal, color:"white", fontFamily:F, fontWeight:700, fontSize:13 }}>
                  Download Cash Report
                </button>
                <a href={WA} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"10px 20px", borderRadius:16, border:`1px solid ${C.border}`,
                    background:"white", color:C.text, fontFamily:F, fontWeight:700, fontSize:13,
                    textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
                  Ask Garima
                </a>
              </div>
            </div>
          )}
 
          {/* ── WORKING CAPITAL (redirect to dedicated page) ── */}
          {tab === "cashflow" && <CashFlow client={client} reportData={reportData} liveInvoices={[]}/>}
 
          {tab === "workingcap" && <WorkingCapital client={client} reportData={reportData}/>}
 
          {/* ── AR MANAGEMENT ── */}
          {tab === "ar" && <WorkingCapital client={client} reportData={reportData}/>}
 
          {/* ── VAT REPORT ── */}
          {tab === "vatreport" && <VATDashboard client={client} reportData={reportData}/>}
 
          {/* ── REVENUE RECONCILIATION ── */}
          {tab === "revrecon" && <RevenueReconciliation client={client} reportData={reportData}/>}
 
          {/* ── RELATED PARTY REPORT ── */}
          {tab === "rpt" && <CorporateTax client={client} reportData={reportData} initialTab="rpt"/>}
 
          {/* ── CONNECTED PERSONS ── */}
          {tab === "connected" && <CorporateTax client={client} reportData={reportData} initialTab="connected"/>}
 
          {/* ── QFZP ── */}
          {tab === "qfzp" && <QFZPModule client={client} reportData={reportData}/>}
 
          {/* ── VERTICAL ANALYSIS ── */}
          {tab === "vertical" && <VerticalAnalysis client={client} reportData={reportData}/>}
 
        </div>
      </PackLayout>
    </div>
  );
}
 
// FIXED: MyReport now shows UAE-specific CFO Report for UAE clients (no India reports)
// and India pack content for India clients. No duplication with Overview/Dashboard/CashFlow.
function MyReport({ client, reportData, kpis }) {
  const pack      = normalizePack(client?.client_pack || client?.clientPack);
  const uaeClient = isUAE(client);
 
  // UAE clients get a dedicated UAE CFO Report — NOT the India packs
  if (uaeClient) {
    return <UAECFOReport client={client} reportData={reportData} kpis={kpis}/>;
  }
 
  const packLabel = getReportLabel(pack);
  return (
    <div>
      {/* Report header with month context */}
      <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{packLabel}</div>
          {reportData?.monthLabel ? (
            <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.blue,
              background:`${C.blue}12`, padding:"4px 14px", borderRadius:60 }}>
              {reportData.monthLabel}
            </span>
          ) : (
            <span style={{ fontFamily:F, fontSize:11, color:C.dim,
              background:"#fff", padding:"4px 12px", borderRadius:60 }}>
              Month not set
            </span>
          )}
        </div>
        {reportData?.monthLabel && (
          <div style={{ fontFamily:F, fontSize:11, color:C.dim }}>
            Data for {reportData.monthLabel} · Updated by Garima
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
  const pack = normalizePack(client?.client_pack || client?.clientPack);
  const reportLabel = getReportLabel(pack);
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
 
  const handleExecSummary = async () => {
    const w = window.open("","_blank");
    const { generateExecSummaryPDF } = await _pdfMod;
    const html = generateExecSummaryPDF({ client, reportData, kpis });
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 600);
  };
  const handlePreview = async () => {
    const win = window.open("","_blank");
    const { generateReportPDF } = await _pdfMod;
    const html = generateReportPDF({ client, kpis, garimaNote, reportData, actions });
    const blob = new Blob([html], { type:"text/html" });
    const url  = URL.createObjectURL(blob);
    win.location.href = url;
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
 
  const pack      = normalizePack(client?.client_pack || client?.clientPack);
  const packLabel = getPackLabel(pack);
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
          padding:"8px 16px", borderRadius:16,
          border:"1.5px solid #E5E7EB", background:"white",
          color:"#374151", fontFamily:F, fontWeight:600,
          fontSize:12, cursor:"pointer" }}>
        Preview & Print
      </button>
      {/* Board Executive Summary */}
      <button onClick={handleExecSummary}
        style={{ display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 16px", borderRadius:16,
          border:`1.5px solid ${C.purple}30`, background:`${C.purple}08`,
          color:C.purple, fontFamily:F, fontWeight:600,
          fontSize:12, cursor:"pointer" }}>
        {"Exec Summary"}
      </button>
      {/* Save to My Documents */}
      <button onClick={handleSave} disabled={saving}
        style={{ display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 18px", borderRadius:16,
          background: saving ? "#E5E7EB" : "linear-gradient(135deg,#2563EB,#7C3AED)",
          color: saving ? "#9CA3AF" : "white",
          border:"none", fontFamily:F, fontWeight:700,
          fontSize:12, cursor: saving ? "not-allowed" : "pointer",
          boxShadow: saving ? "none" : "0 2px 10px rgba(37,99,235,0.28)" }}>
        {saving ? "Saving…" : `↓ Save ${packLabel} — ${month}`}
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
          .order("updated_at", { ascending:false }).limit(1).maybeSingle(),
        supabase.from("action_items").select("*").eq("client_id", client.id)
          .order("created_at", { ascending:false }),
        supabase.from("engagements").select("*").eq("client_id", client.id).maybeSingle(),
        supabase.from("invoices").select("*").eq("client_id", client.id)
          .order("created_at", { ascending:false }),
        supabase.from("report_data").select("*").eq("client_id", client.id).maybeSingle(),
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
  const resolvedKpis = isUAE(client)
    ? (!isDemo && liveKpis) ? [
      { label:"Revenue",      value:liveKpis.revenue||"—",      prev:prevK.revenue||"—",      trend:"up",   color:C.blue,   bg:"#EEF3FE", icon:"rev"       },
      { label:"Gross Margin", value:liveKpis.gross_margin||"—", prev:prevK.gross_margin||"—", trend:"up",   color:C.teal,   bg:"#E6FAF7", icon:"margin"    },
      { label:"Cash Balance", value:liveKpis.cash_balance||"—", prev:prevK.cash_balance||"—", trend:"up",   color:C.green,  bg:"#E8FAF3", icon:"cash"      },
      { label:"Burn Rate",    value:liveKpis.burn_rate||"—",    prev:prevK.burn_rate||"—",    trend:"down", color:C.purple, bg:"#F3EFFF", icon:"burn"      },
      { label:"Runway",       value:liveKpis.runway||"—",       prev:prevK.runway||"—",       trend:"up",   color:C.purple, bg:"#F3EFFF", icon:"runway"    },
      { label:"VAT Payable",  value:liveReportData?.vat?.vatPayable ? fmtAED2(liveReportData.vat.vatPayable) : (liveKpis.arr||"—"), prev:"—", trend:"down", color:C.amber, bg:"#FEF7E7", icon:"invoice" },
      { label:"CT Eff. Rate", value:liveReportData?.ct?.qualifyingPct != null ? (liveReportData.ct.qualifyingPct >= 100 ? "0%" : `${(9*(100-liveReportData.ct.qualifyingPct)/100).toFixed(0)}%`) : "0%", prev:"—", trend:"up", color:C.green, bg:"#E8FAF3", icon:"chart_pie" },
      { label:"QFZP Score",   value:liveReportData?.qfzp?.qfzpScore ? `${liveReportData.qfzp.qfzpScore}/100` : "—", prev:"—", trend:"up", color:C.blue, bg:"#EEF3FE", icon:"star" },
    ] : KPIs_UAE
    : (!isDemo && liveKpis) ? [
    { label: client?.client_pack==="msme"?"Revenue":"Revenue",
      value:liveKpis.revenue||"—", prev:prevK.revenue||"—", trend:"up", color:C.blue, bg:"#EEF3FE", emoji:"ti-trending-up" },
    { label: client?.client_pack==="msme"?"Working Capital":client?.client_pack==="corporate"?"Gross Margin":"Gross Margin",
      value:liveKpis.gross_margin||"—", prev:prevK.gross_margin||"—", trend:"up", color:C.teal, bg:"#E6FAF7", icon:"margin" },
    { label: client?.client_pack==="corporate"?"EBITDA":"Cash Balance",
      value:liveKpis.cash_balance||"—", prev:prevK.cash_balance||"—", trend:"down", color:C.amber, bg:"#FEF7E7", emoji:"ti-building-bank" },
    { label: client?.client_pack==="msme"?"Debtor Days":client?.client_pack==="corporate"?"PAT":"Burn Rate",
      value:liveKpis.burn_rate||"—", prev:prevK.burn_rate||"—", trend:"up", color:C.purple, bg:"#F3EFFF", icon: "ti-flame" },
    { label: client?.client_pack==="corporate"?"Debt/Equity":"Runway",
      value:liveKpis.runway||"—", prev:prevK.runway||"—", trend:"down", color:C.pink, bg:"#FEF0F7", icon:"runway" },
    { label: client?.client_pack==="msme"?"Cash Conversion Cycle":"ARR",
      value:liveKpis.arr||"—", prev:prevK.arr||"—", trend:"up", color:C.green, bg:"#E8FAF3", icon: "ti-target" },
  ] : KPIs;
 
  const resolvedActions = isUAE(client)
    ? ACTIONS_BY_PACK.uae
    : (!isDemo && liveActions) ? liveActions : (ACTIONS_BY_PACK[client?.client_pack||"startup"] || ACTIONS);
  const resolvedEngagement = (!isDemo && liveEngagement) ? liveEngagement : null;
  const DEMO_REPORT_DATA = {
    monthLabel: "March 2026",
    healthScore: 72,
    varianceSummary: "Revenue beat plan by ₹4.2L driven by new Gulf client onboarded in Feb. COGS savings of ₹2.3L from vendor renegotiation boosted GP margin to 41.0%. Watch: HR costs up 12% due to 2 new hires — keep Q2 opex tight.",
    pl: {
      revenue:      { actual:"₹84.2L",  prev:"₹79.1L"  },
      cogs:         { actual:"₹49.7L",  prev:"₹48.3L"  },
      grossProfit:  { actual:"₹34.5L",  prev:"₹30.8L"  },
      ebitda:       { actual:"₹14.7L",  prev:"₹12.1L"  },
      pat:          { actual:"₹10.2L",  prev:"₹8.4L"   },
      gpMargin:     { actual:"41.0%",   prev:"38.9%"   },
      ebitdaMargin: { actual:"17.5%",   prev:"15.3%"   },
      netMargin:    { actual:"12.1%",   prev:"10.6%"   },
    },
    variance: [
      { metric:"Revenue",          budget:"₹80L",   actual:"₹84.2L", fav:true  },
      { metric:"Cost of Sales",    budget:"₹52L",   actual:"₹49.7L", fav:false },
      { metric:"Gross Profit",     budget:"₹28L",   actual:"₹34.5L", fav:true  },
      { metric:"GP Margin %",      budget:"35%",    actual:"41.0%",  fav:true, noCalc:true },
      { metric:"EBITDA",           budget:"₹12L",   actual:"₹14.7L", fav:true  },
      { metric:"EBITDA Margin %",  budget:"15%",    actual:"17.5%",  fav:true, noCalc:true },
      { metric:"Net Profit / PAT", budget:"₹8L",    actual:"₹10.2L", fav:true  },
    ],
    varianceCommentary: [
      { item:"Revenue beat",     note:"New Gulf client onboarded in Feb drove ₹4.2L uplift",  favorable:true  },
      { item:"COGS efficiency",  note:"Vendor renegotiation saved ₹2.3L on direct costs",      favorable:true  },
      { item:"Opex watch",       note:"HR costs up 12% due to 2 new hires — monitor Q2",       favorable:false },
    ],
    cashflow: [
      { month:"Sep", actual:"₹21L",  forecast:""     },
      { month:"Oct", actual:"₹18.5L",forecast:""     },
      { month:"Nov", actual:"₹24L",  forecast:""     },
      { month:"Dec", actual:"₹26L",  forecast:""     },
      { month:"Jan", actual:"₹19.5L",forecast:""     },
      { month:"Feb", actual:"₹22L",  forecast:""     },
      { month:"Mar", actual:"₹28L",  forecast:""     },
      { month:"Apr", actual:"",      forecast:"₹24L" },
      { month:"May", actual:"",      forecast:"₹27L" },
    ],
    prevKpis: {
      revenue:"₹79.1L", gross_margin:"38.9%", cash_balance:"₹2.6 Cr",
      burn_rate:"₹52L/mo", runway:"5.0 mo", arr:"₹5.4 Cr"
    },
    metrics: [
      { label:"ARR",           value:"₹6.2 Cr",  flag:false, note:"Growing at 15% QoQ"         },
      { label:"MoM Growth",    value:"6.5%",      flag:false, note:"Above target of 5%"          },
      { label:"Burn Multiple", value:"1.2x",      flag:false, note:"Healthy — target <1.5x"      },
      { label:"CAC Payback",   value:"8 months",  flag:false, note:"Improving from 11 months"    },
      { label:"NRR",           value:"112%",       flag:false, note:"Expansion revenue positive"  },
      { label:"Gross Margin",  value:"41%",        flag:false, note:"On track for 45% target"     },
    ],
    benchmarks: [
      { metric:"ARR Growth YoY",   yours:"78%",  median:"45%",  bench:"60%",  ok:true  },
      { metric:"Gross Margin",     yours:"41%",  median:"38%",  bench:"40%",  ok:true  },
      { metric:"Burn Multiple",    yours:"1.2x", median:"1.5x", bench:"1.3x", ok:true  },
      { metric:"NRR",              yours:"112%", median:"105%", bench:"110%", ok:true  },
      { metric:"CAC Payback",      yours:"8 mo", median:"9 mo", bench:"10 mo",ok:true  },
      { metric:"Revenue per FTE",  yours:"₹28L", median:"₹22L", bench:"₹25L",ok:true  },
    ],
    geoIndia: {
      North: { revenue:"1200000", cost:"800000"  },
      South: { revenue:"2100000", cost:"1100000" },
      West:  { revenue:"3400000", cost:"1800000" },
      East:  { revenue:"800000",  cost:"550000"  },
      Metro: { revenue:"1100000", cost:"650000"  },
    },
    geoGlobal: {
      India:  { revenue:"8600000", cost:"4900000" },
      GCC:    { revenue:"2800000", cost:"1200000" },
      USA:    { revenue:"900000",  cost:"400000"  },
      Europe: { revenue:"500000",  cost:"250000"  },
      Other:  { revenue:"200000",  cost:"100000"  },
    },
    depts: {
      Sales:       { revenue:"3200000", cost:"1100000", budget:"1200000" },
      Marketing:   { revenue:"1800000", cost:"980000",  budget:"900000"  },
      Technology:  { revenue:"2100000", cost:"1400000", budget:"1500000" },
      Operations:  { revenue:"1400000", cost:"820000",  budget:"800000"  },
      "HR & Admin":{ revenue:"600000",  cost:"480000",  budget:"450000"  },
      Finance:     { revenue:"500000",  cost:"220000",  budget:"230000"  },
    },
    scenarioBase: { revenue:"8420000", cogs:"4970000", opex:"1980000" },
    spendRevenue: "8420000",
    spendDepts: {
      "Marketing & Sales":   { actual:"2080000", budget:"2100000" },
      "Technology / Product":{ actual:"1400000", budget:"1500000" },
      "Operations":          { actual:"820000",  budget:"800000"  },
      "HR & People":         { actual:"480000",  budget:"450000"  },
      "Admin & G&A":         { actual:"220000",  budget:"230000"  },
      "Finance & Legal":     { actual:"180000",  budget:"200000"  },
    },
    packNote: "Strong month across the board. Revenue beat plan by ₹4.2L, EBITDA margin at best level this year. Three priorities for Q1: close two Gulf pipeline deals (₹18L combined), complete FEMA filing for GCC revenue, and bring debtor days below 40. Runway needs attention — start fundraise conversations now.",
    reportNote: "All figures reviewed and certified by Garima Agarwal, CA (M.No. 160944). Data as at 31 March 2026. Next CFO review scheduled 20 April 2026.",
    score: 74,
    scoreBreakdown: [
      { label:"Revenue Growth",          score:"84", comment:"78% YoY — well above Series A median of 28%" },
      { label:"Gross Margin",            score:"76", comment:"At 41% — target 45%+ before raise; improving" },
      { label:"Runway",                  score:"52", comment:"4.4 months — urgent. Begin fundraise now." },
      { label:"Financial Documentation", score:"88", comment:"3yr audited P&L, MIS pack current, FEMA filed" },
      { label:"Unit Economics",          score:"78", comment:"CAC payback 8mo (was 18mo) — major improvement" },
    ],
  };
 
  // UAE-specific demo report data
  const DEMO_REPORT_DATA_UAE = {
    ...DEMO_REPORT_DATA,
    monthLabel: "Q1 2026 (Jan–Mar)",
    score: 79,
    packNote: "Q1 2026 was a strong quarter — revenue at AED 1.85M, up 32% YoY, and QFZP compliance score at 82/100. VAT return for Q1 is due 28 April (AED 92.5K payable — ensure this is ring-fenced now). Key priorities: elect Small Business Relief in your CT return, finalise the DMCC audited accounts by 30 April, and keep mainland sales below 5% of revenue to protect QFZP status.",
    reportNote: "All figures reviewed and certified by Garima Agarwal, CA (M.No. 160944). UAE VAT & CT data as at 31 March 2026. Final tax advice should be confirmed with a licensed UAE tax advisor. Next review: 20 April 2026.",
    vat: {
      outputVAT: 185000, inputVAT: 92500, vatPayable: 92500,
      filingPeriod: "Q1 2026 (Jan–Mar)", nextDeadline: "28 Apr 2026",
      pendingReturns: [
        { period:"Q2 2025 (Apr–Jun)", due:"28 Jul 2025",  status:"Filed", vatNet:"AED 58,400" },
        { period:"Q3 2025 (Jul–Sep)", due:"28 Oct 2025",  status:"Filed", vatNet:"AED 68,500" },
        { period:"Q4 2025 (Oct–Dec)", due:"28 Jan 2026",  status:"Filed", vatNet:"AED 74,200" },
        { period:"Q1 2026 (Jan–Mar)", due:"28 Apr 2026",  status:"Due",   vatNet:"AED 92,500" },
      ],
      cashImpact: [
        { month:"Jan", collected:62000, paid:28000, net:34000  },
        { month:"Feb", collected:68000, paid:31000, net:37000  },
        { month:"Mar", collected:55000, paid:33500, net:21500  },
        { month:"Apr", collected:null,  paid:null,  forecast:26000 },
        { month:"May", collected:null,  paid:null,  forecast:31000 },
      ],
    },
    ct: {
      revenue: 1850000, taxableIncome: 271000,
      qualifyingPct: 92, nonQualifyingPct: 8,
      taxableFinalIncome: 0,
      adjustments: [
        { item:"Accounting Profit (per audited P&L)",           amount:271000, sign:1,  note:"Per IFRS financial statements" },
        { item:"Add: Non-deductible entertainment expenses",    amount:12400,  sign:1,  note:"50% disallowance per Art. 33" },
        { item:"Add: Penalties & fines (non-deductible)",       amount:3600,   sign:1,  note:"Per Art. 33 UAE CT Law" },
        { item:"Less: Exempt dividend income",                  amount:18200,  sign:-1, note:"From qualifying FZ subsidiary" },
        { item:"Less: QFZP qualifying income (0% CT rate)",    amount:268800, sign:-1, note:"92% of total income — QFZP" },
      ],
    },
    qfzp: { qfzpScore: 82 },
    auditReadiness: { auditScore: 65 },
    treasury: { totalCash:"AED 620K", investedPct:55, yieldPA:"AED 22K" },
    pl: {
      revenue:      { actual:"AED 1.85M",  prev:"AED 1.40M" },
      cogs:         { actual:"AED 1.02M",  prev:"AED 0.84M" },
      grossProfit:  { actual:"AED 832.5K", prev:"AED 588K"  },
      ebitda:       { actual:"AED 407.5K", prev:"AED 280K"  },
      pat:          { actual:"AED 271K",   prev:"AED 196K"  },
      gpMargin:     { actual:"45.0%",      prev:"42.0%"     },
      ebitdaMargin: { actual:"22.0%",      prev:"20.0%"     },
      netMargin:    { actual:"14.6%",      prev:"14.0%"     },
    },
    scoreBreakdown: [
      { label:"Revenue Growth",   score:"86", comment:"32% YoY — strong for DMCC trading SME" },
      { label:"QFZP Compliance",  score:"82", comment:"Non-qualifying at 8% — keep mainland under 5%" },
      { label:"VAT Compliance",   score:"95", comment:"All returns filed on time, zero penalties" },
      { label:"Audit Readiness",  score:"65", comment:"Audited FS not yet ready — critical for QFZP" },
      { label:"Cash Position",    score:"80", comment:"8.3 months runway — healthy buffer" },
    ],
  };
 
  const resolvedReportData = isUAE(client)
    ? ((!isDemo && liveReportData) ? liveReportData : DEMO_REPORT_DATA_UAE)
    : ((!isDemo && liveReportData) ? liveReportData : DEMO_REPORT_DATA);
  const resolvedGarimaNote = (!isDemo && liveKpis?.garima_note) ? liveKpis.garima_note
    : isUAE(client)
      ? "Q1 2026 closed strongly — AED 1.85M revenue, up 32% YoY, with gross margin at 45% (best quarter since inception). Four things need your attention this week: (1) VAT return for Q1 is due 28 April — AED 92.5K payable to FTA. Confirm this is sitting in your Emirates NBD current account and not locked in the Mashreq term deposit maturing 15 April. (2) DMCC audited financial statements must be submitted by 30 April to maintain QFZP status — your audit firm needs your signed management accounts by 22 April. Do not miss this: losing QFZP status triggers 9% CT retroactively. (3) Your mainland UAE sales are at 8% of revenue — above the 5% de-minimis threshold. Review the two mainland contracts due for renewal in Q2 and restructure them as DMCC-to-DMCC to bring this back under 5%. (4) SBR election must be made in your CT return by 30 September — I'll prepare this. Confirm your Q2 revenue won't cross AED 3M YTD."
      : (PACK_CONFIG[client?.client_pack||client?.clientPack||"startup"]?.garimaNote) || PACK_CONFIG.startup.garimaNote;
 
  const pages = {
    overview:   <Overview   client={client} setPage={setPage} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} actions={resolvedActions} engagement={resolvedEngagement} reportData={resolvedReportData} isDemo={isDemo} liveKpis={liveKpis} liveReportData={liveReportData}/>,
    dashboard:  <Dashboard  client={client} kpis={resolvedKpis} garimaNote={resolvedGarimaNote} reportData={resolvedReportData} loading={dataLoading}/>,
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
    // ── UAE modules (only rendered for UAE/Cross-Border clients) ──
    vat:             <VATDashboard          client={client} reportData={resolvedReportData}/>,
    revrecon:        <RevenueReconciliation client={client} reportData={resolvedReportData}/>,
    workingcapital:  <WorkingCapital        client={client} reportData={resolvedReportData}/>,
    verticalanalysis:<VerticalAnalysis      client={client} reportData={resolvedReportData}/>, // NEW
    corptax:         <CorporateTax          client={client} reportData={resolvedReportData}/>,
    compliance:      <ComplianceCalendar    client={client}/>,
    qfzp:            <QFZPModule            client={client} reportData={resolvedReportData}/>,
    auditready:      <AuditReadiness        client={client} reportData={resolvedReportData}/>,
  };
 
  return (
    <>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.29.0/dist/tabler-icons.min.css"/>
    <div style={{ display:"flex", minHeight:"100vh", background:"#fff", fontFamily:F }}>
      <style>{`
        /* ── NetSuite Global Design System ── */
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F0F1F3; }
 
        /* Typography scale */
        .ns-page-title { font-size:15px; font-weight:800; color:#1a1a2e; letter-spacing:-0.01em; }
        .ns-section-title { font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.08em; }
        .ns-label { font-size:10px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.07em; }
        .ns-value { font-size:20px; font-weight:900; color:#1a1a2e; font-family:'DM Mono',monospace; }
        .ns-sub { font-size:11px; color:#9CA3AF; }
 
        /* Panel / Card */
        .ns-panel {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .ns-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background: #F8F9FA;
          border-bottom: 1px solid #E5E7EB;
        }
        .ns-panel-header h3 {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .ns-panel-body { padding: 14px; }
        .ns-panel-body.no-pad { padding: 0; }
 
        /* Tables */
        .ns-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ns-table thead tr { background: #F0F1F3; }
        .ns-table thead th {
          padding: 6px 12px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid #E5E7EB;
          white-space: nowrap;
        }
        .ns-table thead th.right { text-align: right; }
        .ns-table tbody tr { border-bottom: 1px solid #F3F4F6; }
        .ns-table tbody tr:hover { background: #F9FAFB; }
        .ns-table tbody tr.striped:nth-child(even) { background: #FAFAFA; }
        .ns-table tbody td {
          padding: 7px 12px;
          color: #374151;
          font-size: 12px;
          vertical-align: middle;
        }
        .ns-table tbody td.right { text-align: right; }
        .ns-table tbody td.mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
        .ns-table tbody td.bold { font-weight: 700; color: #111827; }
        .ns-table tbody td.muted { color: #9CA3AF; }
        .ns-table tbody tr.subtotal td { background: #F9FAFB; font-weight: 700; color: #111827; }
        .ns-table tbody tr.total td { background: #EEF2FF; font-weight: 800; color: #1E3A8A; border-top: 2px solid #C7D2FE; }
 
        /* KPI Tiles */
        .ns-kpi-tile {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 12px 14px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .ns-kpi-tile .label { font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:6px; }
        .ns-kpi-tile .value { font-size:16px; font-weight:700; color:#111827; font-family:'Inter',sans-serif; line-height:1.2; }
        .ns-kpi-tile .trend { font-size:10px; margin-top:4px; display:flex; align-items:center; gap:3px; }
 
        /* Badges */
        .ns-badge { display:inline-flex; align-items:center; padding:1px 7px; border-radius:10px; font-size:10px; font-weight:700; }
        .ns-badge.green { background:#DCFCE7; color:#15803D; }
        .ns-badge.red { background:#FEF2F2; color:#DC2626; }
        .ns-badge.amber { background:#FEF3C7; color:#D97706; }
        .ns-badge.blue { background:#DBEAFE; color:#1D4ED8; }
        .ns-badge.purple { background:#EDE9FE; color:#6D28D9; }
 
        /* Stat bar (like NetSuite's performance bars) */
        .ns-stat-row { display:flex; align-items:center; justify-content:space-between; padding:7px 14px; border-bottom:1px solid #F3F4F6; font-size:12px; }
        .ns-stat-row:last-child { border-bottom:none; }
        .ns-stat-row .stat-label { color:#374151; flex:1; }
        .ns-stat-row .stat-period { color:#9CA3AF; font-size:11px; flex:1; }
        .ns-stat-row .stat-value { font-family:'DM Mono',monospace; font-weight:700; color:#111827; min-width:80px; text-align:right; }
        .ns-stat-row .stat-change { min-width:50px; text-align:right; font-size:11px; font-weight:700; }
        .ns-stat-row .stat-change.up { color:#059669; }
        .ns-stat-row .stat-change.down { color:#EF4444; }
 
        /* Tiles (shortcut buttons) */
        .ns-tile-row { display:flex; gap:10px; }
        .ns-tile {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:8px; padding:16px 10px; border-radius:6px; border:none; cursor:pointer;
          color:white; font-weight:700; font-size:11px; transition:opacity 0.15s;
          box-shadow:0 1px 3px rgba(0,0,0,0.15);
        }
        .ns-tile:hover { opacity:0.88; }
        .ns-tile .tile-icon { font-size:20px; }
 
        /* Scrollbar */
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:#9CA3AF; }
 
        /* Page padding wrapper */
        .ns-page { padding:16px; display:flex; flex-direction:column; gap:14px; background:#F0F1F3; min-height:calc(100vh - 44px); }
        .ns-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .ns-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .ns-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .ns-grid-6 { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; }
        @media(max-width:900px){
          .ns-grid-6{grid-template-columns:repeat(3,1fr)!important}
          .ns-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .ns-grid-3{grid-template-columns:1fr!important}
          .ns-grid-2{grid-template-columns:1fr!important}
        }

        /* ── Mobile (< 768px) ── */
        @media(max-width:768px){
          /* Sidebar becomes a fixed overlay */
          .main-sidebar {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            height: 100vh !important;
            z-index: 1000 !important;
            width: 260px !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.18) !important;
          }
          .main-sidebar.sidebar-open {
            transform: translateX(0) !important;
          }
          /* Show mobile backdrop when sidebar open */
          .main-sidebar.sidebar-open ~ * .mobile-backdrop,
          .mobile-backdrop { display: block !important; }

          /* Hamburger visible on mobile */
          .hamburger-btn { display: flex !important; }

          /* Hide breadcrumb home on tiny screens */
          .bc-home { display: none !important; }

          /* Grids stack on mobile */
          .ns-grid-6 { grid-template-columns: 1fr 1fr !important; }
          .ns-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .ns-grid-3 { grid-template-columns: 1fr !important; }
          .ns-grid-2 { grid-template-columns: 1fr !important; }

          /* Page padding tighter on mobile */
          .ns-page { padding: 12px !important; gap: 10px !important; }

          /* Tables scroll horizontally on mobile */
          .ns-panel { overflow-x: auto !important; }
          .ns-table { min-width: 480px; }

          /* KPI tiles smaller on mobile */
          .ns-kpi-tile { padding: 12px 12px !important; }
          .ns-kpi-tile .value { font-size: 15px !important; }
        }

        @media(max-width:480px){
          .ns-grid-6 { grid-template-columns: 1fr !important; }
          .ns-grid-4 { grid-template-columns: 1fr !important; }
        }

        /* Login responsive */
        @media(max-width:700px){
          .login-left-panel { display:none !important; }
          .login-right-panel { padding:24px 16px !important; }
        }

        /* Sidebar hover */
        nav button:hover { background:rgba(255,255,255,0.06)!important; }
 
        /* Topbar */
        header a { text-decoration:none; }
 
        /* Admin panel table */
        .admin-table { width:100%; border-collapse:collapse; font-size:12px; }
        .admin-table th { background:#F3F4F6; padding:8px 12px; text-align:left; font-size:10px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #E5E7EB; }
        .admin-table td { padding:8px 12px; border-bottom:1px solid #F3F4F6; color:#374151; font-size:12px; }
        .admin-table tr:hover td { background:#F9FAFB; }
 
        /* Smooth transitions */
        button { transition:all 0.12s ease; }
        input, textarea, select { font-family:inherit; }
      `}</style>
      {dataLoading && !isDemo && (
        <div style={{ position:"fixed", top:0, left:0, right:0, height:3, zIndex:9999,
          background:C.grad1, animation:"progress 1.5s ease-in-out infinite" }}/>
      )}
      {/* Mobile sidebar backdrop */}
      {!collapsed && (
        <div className="mobile-backdrop" onClick={()=>setCollapsed(true)}
          style={{ display:"none", position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
            zIndex:999, backdropFilter:"blur(2px)" }}/>
      )}
      <Sidebar page={page} setPage={setPage} client={client}
        onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden", background:"#fff" }}>
        <Topbar title={getPageTitle(page, client)} client={client} setPage={setPage}
          onMenuToggle={()=>setCollapsed(c=>!c)}
          notifItems={(() => {
            const items = [];
            // Unpaid invoices
            ((isDemo ? null : liveInvoices) || [])
              .filter(inv => inv.status === "unpaid")
              .forEach(inv => items.push({
                icon:"ti-receipt", page:"invoices", severity:"medium",
                title:`Invoice due: ${inv.description || inv.invoice_number}`,
                sub:`${inv.amount} · Due ${inv.due_date || "—"}`,
              }));
            // High-priority actions
            ((isDemo ? null : liveActions) || [])
              .filter(a => !a.done && a.priority === "High")
              .forEach(a => items.push({
                icon:"ti-alert-triangle", page:"actions", severity:"high",
                title:(a.text||a.title||"").length > 50 ? (a.text||a.title||"").slice(0,50)+"…" : (a.text||a.title||""),
                sub:`High priority · ${a.month || ""}`,
              }));
            if (!isDemo && liveKpis) {
              // Cash runway warning
              const runwayKpi = resolvedKpis.find(k => k.label?.toLowerCase().includes("runway"));
              if (runwayKpi && runwayKpi.value && runwayKpi.value !== "—") {
                const months = parseFloat(String(runwayKpi.value).replace(/[^0-9.]/g,""));
                if (!isNaN(months) && months < 3)
                  items.unshift({ icon:"ti-flame", page:"cashflow", severity:"critical",
                    title:`Cash runway critical: ${runwayKpi.value}`,
                    sub:"Take immediate action — under 3 months remaining" });
                else if (!isNaN(months) && months < 6)
                  items.unshift({ icon:"ti-alert-circle", page:"cashflow", severity:"high",
                    title:`Cash runway below 6 months: ${runwayKpi.value}`,
                    sub:"Review burn rate and fundraising plan" });
              }
              // UAE VAT due
              if (isUAE(client) && liveReportData?.vat?.pendingReturns) {
                const today = new Date();
                (liveReportData.vat.pendingReturns || []).forEach(r => {
                  if ((r.status === "Due" || r.status === "Overdue") && r.due) {
                    const days = Math.ceil((new Date(r.due) - today) / 86400000);
                    if (days <= 14)
                      items.unshift({ icon:"ti-file-invoice", page:"uaetax", severity:"high",
                        title:`VAT return due: ${r.period}`,
                        sub:`Due ${r.due}${days <= 0 ? " — OVERDUE" : ` (${days}d)`}` });
                  }
                });
              }
              // Low health score
              const score = resolvedReportData?.healthScore;
              if (score && score < 50)
                items.push({ icon:"ti-heartbeat", page:"dashboard", severity:"high",
                  title:`Financial health score: ${score}/100`,
                  sub:"Review KPI dashboard for details" });
            }
            return items;
          })()}
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
          <div key={page} className="ns-page-enter">
            {pages[page]}
          </div>
        </main>
      </div>
      <style>{`@keyframes progress{0%{width:0%;left:0}50%{width:60%;left:20%}100%{width:0%;left:100%}}
@keyframes popIn{0%{opacity:0;transform:scale(0.85) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4)}50%{box-shadow:0 0 0 8px rgba(124,58,237,0)}}
@keyframes typing{0%,100%{opacity:0.3}50%{opacity:1}}
`}</style>
      <AIChatbot client={client} reportData={resolvedReportData} kpis={resolvedKpis}/>
    </div>
  </>
  );
}
 
// ─── AI CHATBOT ───────────────────────────────────────────────────────────────
function AIChatbot({ client, reportData, kpis }) {
  const GARIMA_AVATAR = "data:image/png;base64,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";
  const [open, setOpen] = React.useState(false);
  const [msgs, setMsgs] = React.useState([
    { role:"assistant", text:"Hi" + (client?.name ? " " + client.name.split(" ")[0] : "") + "! I'm Garima's AI assistant. Ask me anything about your finances, valuations, or CFO advisory." }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showBubble, setShowBubble] = React.useState(true);
  const bottomRef = React.useRef(null);
 
  // Hide welcome bubble after 4s
  React.useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 4000);
    return () => clearTimeout(t);
  }, []);
 
  React.useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, open]);
 
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs(m => [...m, { role:"user", text }]);
    setLoading(true);
 
    // Build rich context from live client data
    const uae = isUAE(client);
    const pl  = reportData?.pl || {};
    const ctx = [
      `Client: ${client?.name || "Unknown"} | Company: ${client?.company || "—"} | Pack: ${client?.client_pack || "—"}`,
      uae ? `Region: UAE | Freezone: ${reportData?.uaeProfile?.freezone || "DMCC"}` : `Region: India`,
      reportData?.monthLabel ? `Reporting Period: ${reportData.monthLabel}` : "",
      // KPIs
      (kpis||[]).length ? `KPIs: ${(kpis||[]).map(k=>`${k.label}=${k.value}`).join(", ")}` : "",
      // P&L
      pl.revenue?.actual   ? `Revenue: ${pl.revenue.actual} (prev: ${pl.revenue.prev||"—"})` : "",
      pl.grossProfit?.actual ? `Gross Profit: ${pl.grossProfit.actual} | GP Margin: ${pl.gpMargin?.actual||"—"}` : "",
      pl.ebitda?.actual    ? `EBITDA: ${pl.ebitda.actual} | EBITDA Margin: ${pl.ebitdaMargin?.actual||"—"}` : "",
      pl.pat?.actual       ? `Net Profit: ${pl.pat.actual} | Net Margin: ${pl.netMargin?.actual||"—"}` : "",
      // Cash & treasury
      reportData?.treasury?.totalCash ? `Cash: ${uae ? "AED " : "₹"}${reportData.treasury.totalCash?.toLocaleString()}` : "",
      // UAE specific
      uae && reportData?.vat?.vatPayable ? `VAT Payable: AED ${reportData.vat.vatPayable?.toLocaleString()}` : "",
      uae && reportData?.ct ? `CT Qualifying Income: ${reportData.ct.qualifyingPct||0}%` : "",
      uae && reportData?.qfzp?.qfzpScore ? `QFZP Score: ${reportData.qfzp.qfzpScore}/100` : "",
      // Health score
      reportData?.healthScore ? `Financial Health Score: ${reportData.healthScore}/100` : "",
      // Garima's note (summarised)
      reportData?.garimaNote ? `Advisor note summary: ${String(reportData.garimaNote).slice(0,300)}` : "",
      // Pending actions
      (reportData?.actions||[]).filter(a=>!a.done).length
        ? `Pending actions: ${(reportData.actions||[]).filter(a=>!a.done).map(a=>a.text||a.title).slice(0,5).join("; ")}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = uae
      ? `You are Garima's AI CFO assistant on the Finzzup portal. Garima Agarwal is a CA, IBBI Registered Valuer and Fractional CFO specialising in UAE and India cross-border finance. Help the client understand their UAE finances — VAT, Corporate Tax, QFZP compliance, DMCC/DIFC structure, AED cash management. Be concise, accurate and professional. Use AED for UAE amounts. Never guess specific numbers not in the context below.\n\nLive client data:\n${ctx}`
      : `You are Garima's AI CFO assistant on the Finzzup portal. Garima Agarwal is a CA, IBBI Registered Valuer and Fractional CFO. Help the client understand their business finances — P&L, cash, burn rate, runway, working capital, valuations and Indian accounting. Be concise, friendly and professional. Use ₹ and Indian financial context (Crores, Lakhs). Never guess specific numbers not in the context below.\n\nLive client data:\n${ctx}`;

    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: systemPrompt,
          messages: msgs.concat({ role:"user", content: text })
            .filter(m => m.role !== "typing")
            .map(m => ({ role: m.role, content: m.text }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgs(m => [...m, { role:"assistant", text:`Error ${res.status}: ${data?.error || "Unknown error"}. Check that api/chat.js is deployed to your Vercel project.` }]);
      } else {
        const reply = data?.content?.[0]?.text || "I couldn't process that. Please try again.";
        setMsgs(m => [...m, { role:"assistant", text: reply }]);
      }
    } catch(err) {
      setMsgs(m => [...m, { role:"assistant", text:`Connection error: ${err.message}. Make sure api/chat.js exists in your GitHub repo root.` }]);
    }
    setLoading(false);
  };
 
  // Avatar SVG — abstract AI
  const Avatar = ({ size=36, pulse=false }) => (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      overflow:"hidden",
      border:"2px solid rgba(124,58,237,0.4)",
      animation: pulse ? "pulse 2s infinite" : "none",
      boxShadow:"0 2px 12px rgba(124,58,237,0.4)",
      background:"linear-gradient(135deg,#2563EB,#7C3AED)",
    }}>
      <img src={GARIMA_AVATAR} alt="Garima" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
    </div>
  );
 
  return (
    <>
      {/* Welcome bubble */}
      {showBubble && !open && (
        <div style={{
          position:"fixed", bottom:90, right:24, zIndex:9998,
          background:"white", borderRadius:16, padding:"10px 14px",
          boxShadow:"0 4px 20px rgba(0,0,0,0.12)", maxWidth:220,
          fontSize:13, color:"#374151", fontFamily:F, lineHeight:1.5,
          animation:"popIn 0.3s ease",
          border:"1px solid rgba(124,58,237,0.15)"
        }}>
          <strong style={{color:C.purple}}>Ask Garima</strong><br/>
          Your AI CFO is here
          <div style={{
            position:"absolute", bottom:-6, right:20,
            width:12, height:12, background:"white",
            transform:"rotate(45deg)",
            borderRight:"1px solid rgba(124,58,237,0.15)",
            borderBottom:"1px solid rgba(124,58,237,0.15)"
          }}/>
        </div>
      )}
 
      {/* Floating button */}
      {!open && (
        <button onClick={() => { setOpen(true); setShowBubble(false); }} style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          width:56, height:56, borderRadius:"50%", border:"2px solid rgba(124,58,237,0.5)",
          cursor:"pointer", padding:0, overflow:"hidden",
          boxShadow:"0 4px 20px rgba(124,58,237,0.45)",
          animation:"pulse 2.5s infinite",
          transition:"transform 0.2s"
        }}>
          <img src={GARIMA_AVATAR} alt="Ask Garima" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
        </button>
      )}
 
      {/* Chat window */}
      {open && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          width:360, height:520, borderRadius:12,
          background:"white", boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
          display:"flex", flexDirection:"column", overflow:"hidden",
          animation:"popIn 0.25s ease",
          border:"1px solid rgba(124,58,237,0.12)"
        }}>
          {/* Header */}
          <div style={{
            padding:"14px 16px", display:"flex", alignItems:"center", gap:10,
            background:"linear-gradient(135deg,#2563EB,#7C3AED)",
            flexShrink:0
          }}>
            <Avatar size={38}/>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:"white" }}>Ask Garima</div>
              <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.75)" }}>CA · IBBI Valuer · CFO Advisor · Online</div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background:"rgba(255,255,255,0.15)", border:"none", borderRadius:"50%",
              width:28, height:28, cursor:"pointer", color:"white", fontSize:16,
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>×</button>
          </div>
 
          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", display:"flex", flexDirection:"column", gap:20 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start",
                flexDirection: m.role==="user" ? "row-reverse" : "row" }}>
                {m.role === "assistant" && <Avatar size={28}/>}
                {m.role === "user" && (
                  <div style={{
                    width:28, height:28, borderRadius:"50%", flexShrink:0,
                    background:"#fff", display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:12, fontWeight:700, color:C.muted
                  }}>
                    {client?.name ? client.name[0].toUpperCase() : "U"}
                  </div>
                )}
                <div style={{
                  maxWidth:"75%", padding:"9px 12px", borderRadius:16,
                  background: m.role==="user"
                    ? "linear-gradient(135deg,#2563EB,#7C3AED)"
                    : C.bg2,
                  color: m.role==="user" ? "white" : C.text,
                  fontFamily:F, fontSize:13, lineHeight:1.55,
                  borderBottomRightRadius: m.role==="user" ? 4 : 14,
                  borderBottomLeftRadius: m.role==="assistant" ? 4 : 14,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
 
            {loading && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <Avatar size={28}/>
                <div style={{ padding:"10px 14px", borderRadius:16, borderBottomLeftRadius:4, background:"#fff" }}>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width:6, height:6, borderRadius:"50%", background:C.purple,
                        animation:`typing 1.2s ease ${i*0.2}s infinite`
                      }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
 
          {/* Input */}
          <div style={{
            padding:"12px 14px", borderTop:`1px solid ${C.border}`,
            display:"flex", gap:8, alignItems:"center", flexShrink:0,
            background:"white"
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about your finances..."
              style={{
                flex:1, padding:"9px 12px", borderRadius:12,
                border:`1.5px solid ${C.border}`, fontFamily:F, fontSize:13,
                outline:"none", color:C.text, background:"#fff",
                transition:"border 0.2s"
              }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
              width:36, height:36, borderRadius:"50%", border:"none",
              background: input.trim() && !loading
                ? "linear-gradient(135deg,#2563EB,#7C3AED)"
                : C.border,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background 0.2s", flexShrink:0
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
 

// Admin components imported from ./admin (AdminLogin, AdminPanel)

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
            .from("admins").select("*").eq("email", session.user.email).maybeSingle();
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
              .from("clients").select("*").eq("email", session.user.email).maybeSingle();
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
        <div style={{ display:"flex", justifyContent:"center" }}>
          <Logo size={36} dark={isAdminRoute} showTagline={false}/>
        </div>
        <p style={{ color:C.muted, fontSize:13, marginTop:12 }}>Loading…</p>
      </div>
    </div>
  );
 
  if (loading) return <Loader/>;
 
  // Admin route
  if (isAdminRoute) {
    if (!admin) return <AdminLogin onLogin={setAdmin}/>;
    return <AdminPanel admin={admin} onLogout={handleLogout} MarketIntelComponent={MarketIntel}/>;
  }
 
  // Client route
  if (!client) return <Login onLogin={setClient}/>;
  return <Portal client={client} onLogout={handleLogout}/>;
}
 
 
