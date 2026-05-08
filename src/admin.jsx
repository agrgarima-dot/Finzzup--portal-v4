import React, { useState, useEffect } from 'react';
import { C, F, FM, isUAE } from './tokens';
import { supabase } from './supabase';
import { Card, Skeleton, EmptyState, Logo, Badge, PriBadge } from './components';
import { normalizePack, getPackLabel } from './pdf';

// MarketIntel is passed as a prop from App.jsx to avoid circular imports
// (MarketIntel is defined in App.jsx scope)

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
 
// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
 
// ─── ADMIN SHARED COMPONENTS (defined outside to prevent focus loss on re-render) ─
// Format a raw number into Indian lakh notation for display: 100000 → "1,00,000"
function fmtLakh(val) {
  const n = Number(String(val).replace(/,/g, ""));
  if (isNaN(n)) return val;
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return (n < 0 ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  return (n < 0 ? "-" : "") + formatted;
}
 
function AdminInput({ label, val, onChange, type="text", placeholder="", mono=false, multiline=false, lakh=false, C, F, FM }) {
  const [local, setLocal] = React.useState(val ?? "");
  React.useEffect(() => { setLocal(val ?? ""); }, [val]);
 
  const sharedStyle = { width:"100%", padding:"10px 12px", borderRadius:9, fontSize:13,
    border:`1.5px solid ${C.border}`, fontFamily:mono?FM:F, color:C.text,
    background:C.bg, outline:"none", boxSizing:"border-box" };
 
  // Show lakh-formatted hint below the field when lakh=true
  const lakhHint = lakh && local && !isNaN(Number(String(local).replace(/,/g,"")))
    ? fmtLakh(local)
    : null;
 
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>{label}</label>
      {multiline ? (
        <textarea
          value={local}
          placeholder={placeholder}
          rows={3}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => { onChange(local); e.target.style.borderColor = C.border; }}
          onFocus={e => e.target.style.borderColor = C.amber}
          style={{ ...sharedStyle, resize:"vertical", lineHeight:1.6 }}
        />
      ) : (
        <input
          value={local}
          type={type}
          placeholder={placeholder}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => { onChange(local); e.target.style.borderColor = C.border; }}
          onFocus={e => e.target.style.borderColor = C.amber}
          style={sharedStyle}
        />
      )}
      {lakhHint && (
        <div style={{ fontFamily:FM, fontSize:11, color:C.muted, marginTop:3 }}>
          = {lakhHint} &nbsp;·&nbsp; {Number(String(local).replace(/,/g,"")) >= 100000
            ? (Number(String(local).replace(/,/g,"")) / 100000).toFixed(2) + "L"
            : Number(String(local).replace(/,/g,"")) >= 1000
              ? (Number(String(local).replace(/,/g,"")) / 1000).toFixed(1) + "K"
              : local}
        </div>
      )}
    </div>
  );
}
const AdminSelect = ({ label, val, onChange, options, C, F }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
      letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>{label}</label>
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", padding:"10px 12px", borderRadius:9, fontSize:13,
        border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
        background:C.bg, outline:"none", boxSizing:"border-box" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const AdminSaveBtn = ({ onClick, loading, saved, label="Save Changes", F }) => (
  <button onClick={onClick} disabled={loading} style={{ padding:"10px 22px", borderRadius:12,
    border:"none", background:C.gradDiag, color:"white",
    fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer", opacity:loading?0.75:1,
    touchAction:"manipulation", letterSpacing:"-0.01em" }}>
    {loading ? "Saving…" : saved ? "Saved ✓" : label}
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
      style={{ padding:"6px 8px", borderRadius:8, fontSize:12, border:`1.5px solid ${C.border}`,
        fontFamily:FM, color:C.text, background:C.bg,
        outline:"none", width:"100%", boxSizing:"border-box", ...style }}
      onFocus={e => e.target.style.borderColor=C.amber}
    />
  );
}
 
// ─── CSV IMPORT COMPONENT ─────────────────────────────────────────────────────
// ─── CSV IMPORT — PARSERS & COMPONENT ────────────────────────────────────────

function parseNum(s) {
  if (s === null || s === undefined || s === "") return null;
  const n = parseFloat(String(s).replace(/[₹,AED\s]/g,"").replace(/[^0-9.-]/g,""));
  return isNaN(n) ? null : n;
}

function extractField(lines, keywords, colIdx=1, colIdx2=2) {
  const kws = Array.isArray(keywords) ? keywords : [keywords];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (kws.some(k => low.includes(k.toLowerCase()))) {
      const cols = line.split(",").map(c => c.replace(/"/g,"").trim());
      const v1 = parseNum(cols[colIdx]);
      const v2 = parseNum(cols[colIdx2]);
      if (v1 !== null) return { curr: v1, prev: v2 };
    }
  }
  return { curr: null, prev: null };
}

function normaliseLines(text) {
  return text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n");
}

function parsePL(text) {
  const lines = normaliseLines(text);
  const ex = (kws, col=1, col2=2) => extractField(lines, kws, col, col2);
  const rev   = ex(["net sales","net revenue","total revenue","gross revenue","revenue from operations","sales","turnover","total income"]);
  const cogs  = ex(["cost of goods sold","cost of sales","cogs","cost of production","direct expenses","purchases","cost of revenue"]);
  const gp    = ex(["gross profit","trading profit"]);
  const ebi   = ex(["ebitda","operating profit","profit before interest and depreciation","pbit"]);
  const pat   = ex(["net profit after tax","profit after tax","net profit","pat","profit for the year","net income"]);
  const cash  = ex(["cash and cash equivalents","cash & cash equivalents","cash at bank and in hand","closing cash","cash balance"]);

  const gpMargin  = (rev.curr && gp.curr)  ? ((gp.curr/rev.curr)*100).toFixed(1)+"%" : null;
  const ebiMargin = (rev.curr && ebi.curr) ? ((ebi.curr/rev.curr)*100).toFixed(1)+"%" : null;
  const netMargin = (rev.curr && pat.curr) ? ((pat.curr/rev.curr)*100).toFixed(1)+"%" : null;

  return { type:"pl", revenue:rev, cogs:cogs, grossProfit:gp, ebitda:ebi, pat:pat, cash:cash,
    gpMargin, ebitdaMargin:ebiMargin, netMargin };
}

function parseBalanceSheet(text) {
  const lines = normaliseLines(text);
  const ex = (kws) => extractField(lines, kws);

  return {
    type: "bs",
    totalAssets:        ex(["total assets","balance sheet total","net assets"]),
    fixedAssets:        ex(["fixed assets","property, plant","property plant","non-current assets","tangible assets"]),
    currentAssets:      ex(["total current assets","current assets"]),
    inventory:          ex(["inventory","stock-in-trade","closing stock","stock in hand","inventories"]),
    tradeReceivables:   ex(["trade receivables","sundry debtors","debtors","accounts receivable"]),
    cashAndBank:        ex(["cash and cash equivalents","cash & bank","cash at bank","cash in hand and at bank","cash and bank"]),
    totalLiabilities:   ex(["total liabilities"]),
    currentLiabilities: ex(["total current liabilities","current liabilities"]),
    tradePayables:      ex(["trade payables","sundry creditors","creditors","accounts payable"]),
    shortTermDebt:      ex(["short-term borrowings","short term loans","working capital loan","short term debt"]),
    longTermDebt:       ex(["long-term borrowings","long term debt","term loans","non-current liabilities","long term borrowings"]),
    equity:             ex(["shareholders equity","net worth","capital & reserves","equity","total equity"]),
    shareCapital:       ex(["share capital","paid-up capital","equity share capital"]),
    reserves:           ex(["reserves and surplus","retained earnings","reserves & surplus","other equity"]),
  };
}

function parseCashFlow(text) {
  const lines = normaliseLines(text);
  const ex = (kws) => extractField(lines, kws);

  return {
    type: "cf",
    operatingCF:  ex(["net cash from operating","cash from operating","cash generated from operations","operating activities"]),
    investingCF:  ex(["net cash from investing","cash used in investing","investing activities"]),
    financingCF:  ex(["net cash from financing","cash from financing","financing activities"]),
    netChange:    ex(["net increase in cash","net decrease in cash","net change in cash","net increase/(decrease)"]),
    openingCash:  ex(["opening cash","cash at beginning","cash at the beginning","opening balance of cash"]),
    closingCash:  ex(["closing cash","cash at end","cash at the end","closing balance of cash","cash and cash equivalents at end"]),
  };
}

function parseBankStatement(text) {
  const lines = normaliseLines(text).filter(l => l.trim());

  let headerIdx = -1, debitCol = -1, creditCol = -1, balanceCol = -1;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = lines[i].toLowerCase().split(",").map(c => c.replace(/"/g,"").trim());
    const di = cols.findIndex(c => /debit|withdrawal|dr\b/.test(c));
    const ci = cols.findIndex(c => /credit|deposit|cr\b/.test(c));
    const bi = cols.findIndex(c => /balance/.test(c));
    if ((di >= 0 || ci >= 0) && bi >= 0) {
      headerIdx = i; debitCol = di; creditCol = ci; balanceCol = bi;
      break;
    }
  }

  if (headerIdx < 0) {
    // Fallback: keyword-based lookup for summary-style exports
    const ex = kws => extractField(lines, kws);
    return {
      type: "bank",
      openingBalance: ex(["opening balance","balance brought forward","b/f"]),
      closingBalance:  ex(["closing balance","balance carried forward","c/f"]),
      totalCredits:    ex(["total credits","total deposits","total inflow"]),
      totalDebits:     ex(["total debits","total withdrawals","total outflow"]),
      netFlow:         { curr: null, prev: null },
    };
  }

  let totalCredits = 0, totalDebits = 0;
  let openingBalance = null, closingBalance = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/"/g,"").trim());
    const debit  = debitCol  >= 0 ? parseNum(cols[debitCol])  : null;
    const credit = creditCol >= 0 ? parseNum(cols[creditCol]) : null;
    const bal    = balanceCol >= 0 ? parseNum(cols[balanceCol]) : null;

    if (debit  && debit  > 0) totalDebits  += debit;
    if (credit && credit > 0) totalCredits += credit;
    if (bal !== null) {
      if (openingBalance === null) openingBalance = bal;
      closingBalance = bal;
    }
  }

  // Look for explicit opening balance row (B/F row present in some formats)
  const bfRow = lines.find(l => /opening|b\/f|brought forward/i.test(l));
  if (bfRow) {
    const cols = bfRow.split(",").map(c => c.replace(/"/g,"").trim());
    const v = parseNum(cols[balanceCol >= 0 ? balanceCol : cols.length - 1]);
    if (v !== null) openingBalance = v;
  }

  const net = (totalCredits > 0 || totalDebits > 0) ? totalCredits - totalDebits : null;

  return {
    type: "bank",
    openingBalance: { curr: openingBalance,              prev: null },
    closingBalance:  { curr: closingBalance || null,      prev: null },
    totalCredits:    { curr: totalCredits > 0 ? totalCredits : null, prev: null },
    totalDebits:     { curr: totalDebits  > 0 ? totalDebits  : null, prev: null },
    netFlow:         { curr: net,                         prev: null },
  };
}

function fmtCrL(n, uae=false) {
  if (n === null || n === undefined) return "—";
  if (uae) {
    if (Math.abs(n) >= 1000000) return "AED " + (n/1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "AED " + (n/1000).toFixed(0) + "K";
    return "AED " + n.toLocaleString();
  }
  if (Math.abs(n) >= 10000000) return "₹" + (n/10000000).toFixed(2) + " Cr";
  if (Math.abs(n) >= 100000)   return "₹" + (n/100000).toFixed(2) + " L";
  if (Math.abs(n) >= 1000)     return "₹" + (n/1000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}

const REPORT_TYPES = [
  { id:"pl",   label:"Profit & Loss",    icon:"ti-report-analytics", parser: parsePL },
  { id:"bs",   label:"Balance Sheet",    icon:"ti-building-bank",    parser: parseBalanceSheet },
  { id:"cf",   label:"Cash Flow",        icon:"ti-cash",             parser: parseCashFlow },
  { id:"bank", label:"Bank Statement",   icon:"ti-building-community", parser: parseBankStatement },
];

const PL_FIELDS = [
  { key:"revenue",     label:"Revenue",        curr:d=>d.revenue?.curr,     prev:d=>d.revenue?.prev,     isMargin:false },
  { key:"cogs",        label:"Cost of Sales",  curr:d=>d.cogs?.curr,        prev:d=>d.cogs?.prev,        isMargin:false },
  { key:"grossProfit", label:"Gross Profit",   curr:d=>d.grossProfit?.curr, prev:d=>d.grossProfit?.prev, isMargin:false },
  { key:"gpMargin",    label:"GP Margin",      curr:d=>d.gpMargin,          prev:()=>null,               isMargin:true  },
  { key:"ebitda",      label:"EBITDA",         curr:d=>d.ebitda?.curr,      prev:d=>d.ebitda?.prev,      isMargin:false },
  { key:"ebitdaMargin",label:"EBITDA Margin",  curr:d=>d.ebitdaMargin,      prev:()=>null,               isMargin:true  },
  { key:"pat",         label:"Net Profit",     curr:d=>d.pat?.curr,         prev:d=>d.pat?.prev,         isMargin:false },
  { key:"netMargin",   label:"Net Margin",     curr:d=>d.netMargin,         prev:()=>null,               isMargin:true  },
  { key:"cash",        label:"Cash Balance",   curr:d=>d.cash?.curr,        prev:d=>d.cash?.prev,        isMargin:false },
];

const BS_FIELDS = [
  { key:"totalAssets",        label:"Total Assets"           },
  { key:"fixedAssets",        label:"Fixed / Non-Current Assets" },
  { key:"currentAssets",      label:"Total Current Assets"   },
  { key:"inventory",          label:"Inventory / Stock"      },
  { key:"tradeReceivables",   label:"Trade Receivables"      },
  { key:"cashAndBank",        label:"Cash & Bank"            },
  { key:"totalLiabilities",   label:"Total Liabilities"      },
  { key:"currentLiabilities", label:"Current Liabilities"    },
  { key:"tradePayables",      label:"Trade Payables"         },
  { key:"shortTermDebt",      label:"Short-term Debt"        },
  { key:"longTermDebt",       label:"Long-term Debt"         },
  { key:"equity",             label:"Shareholders' Equity"   },
  { key:"shareCapital",       label:"Share Capital"          },
  { key:"reserves",           label:"Reserves & Surplus"     },
];

const CF_FIELDS = [
  { key:"operatingCF", label:"Operating Cash Flow" },
  { key:"investingCF", label:"Investing Cash Flow" },
  { key:"financingCF", label:"Financing Cash Flow" },
  { key:"netChange",   label:"Net Change in Cash"  },
  { key:"openingCash", label:"Opening Cash Balance" },
  { key:"closingCash", label:"Closing Cash Balance" },
];

const BANK_FIELDS = [
  { key:"openingBalance", label:"Opening Balance"           },
  { key:"closingBalance", label:"Closing Balance"           },
  { key:"totalCredits",   label:"Total Inflows (Credits)"   },
  { key:"totalDebits",    label:"Total Outflows (Debits)"   },
  { key:"netFlow",        label:"Net Cash Flow (Period)"    },
];

const EXPORT_GUIDES = {
  pl: {
    india: [
      "Open Tally Prime → Gateway of Tally → Display More Reports → Profit & Loss A/c",
      "Set the period (e.g. 1 Apr 2025 to 31 Mar 2026)",
      "Press E (Export) → Format: CSV → Export",
    ],
    uae: [
      "Open Zoho Books → Reports → Business Overview → Profit and Loss",
      "Set date range and click Export → CSV",
      "Or: FreshBooks / QuickBooks → Reports → P&L → Export CSV",
    ],
  },
  bs: {
    india: [
      "Open Tally Prime → Display More Reports → Balance Sheet",
      "Set the as-at date, then E (Export) → CSV",
    ],
    uae: [
      "Open Zoho Books → Reports → Business Overview → Balance Sheet",
      "Set date and Export → CSV",
    ],
  },
  cf: {
    india: [
      "Open Tally Prime → Display More Reports → Cash Flow",
      "Set the period, then E (Export) → CSV",
    ],
    uae: [
      "Open Zoho Books → Reports → Business Overview → Cash Flow Statement",
      "Set date range and Export → CSV",
    ],
  },
  bank: {
    india: [
      "Log in to your bank net banking (HDFC / ICICI / SBI / Axis / Kotak)",
      "Go to Account Statement → set date range → Download as CSV or Excel",
      "If downloaded as XLS, open in Excel and Save As → CSV before uploading",
    ],
    uae: [
      "Log in to your bank portal (ENBD / ADCB / FAB / Mashreq / DIB)",
      "Go to Account Statement → set period → Export / Download as CSV",
      "Standard UAE format: Date, Description, Debit, Credit, Balance",
    ],
  },
};

function DropZone({ onFile, fileName, dragColor, F, C }) {
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef();

  const process = file => {
    if (!file) return;
    if (!file.name.match(/\.(csv|txt|xls|xlsx)$/i)) return;
    onFile(file);
  };

  return (
    <div
      onDragOver={e=>{e.preventDefault();setDragOver(true)}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();setDragOver(false);process(e.dataTransfer.files[0])}}
      onClick={()=>fileRef.current?.click()}
      style={{ border:`2px dashed ${dragOver?(dragColor||"#3B6FF7"):C.border}`, borderRadius:10,
        padding:"28px 20px", textAlign:"center", cursor:"pointer",
        background: dragOver?`${dragColor||"#3B6FF7"}08`:"#FAFAFA", transition:"all 0.2s" }}>
      <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}}
        onChange={e=>process(e.target.files[0])}/>
      <i className="ti ti-file-upload" style={{ fontSize:28, color:dragOver?(dragColor||"#3B6FF7"):C.dim, marginBottom:8, display:"block"}}/>
      <div style={{ fontFamily:F, fontWeight:600, fontSize:13, color:C.text }}>
        {fileName ? `✓ ${fileName}` : "Drop CSV here or click to browse"}
      </div>
      <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:3 }}>
        Tally, Zoho Books, Bank Statement — CSV or TXT
      </div>
    </div>
  );
}

function PreviewTable({ fields, data, uae, F, FM, C }) {
  return (
    <table className="ns-table">
      <thead>
        <tr>
          <th>Field</th>
          <th className="right">Current Period</th>
          <th className="right">Previous Period</th>
          <th style={{textAlign:"center"}}>Status</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f,i) => {
          // PL fields have accessor functions; BS/CF fields use .curr/.prev on data[key]
          const currVal = f.curr ? f.curr(data) : data[f.key]?.curr ?? null;
          const prevVal = f.prev ? f.prev(data) : data[f.key]?.prev ?? null;
          const isMargin = f.isMargin;
          const displayCurr = currVal !== null && currVal !== undefined
            ? (isMargin ? currVal : fmtCrL(currVal, uae)) : "—";
          const displayPrev = prevVal !== null && prevVal !== undefined
            ? (isMargin ? prevVal : fmtCrL(prevVal, uae)) : "—";
          const detected = currVal !== null && currVal !== undefined;
          return (
            <tr key={i} className="striped">
              <td>{f.label}</td>
              <td className="right mono bold" style={{color:detected?C.text:C.dim}}>{displayCurr}</td>
              <td className="right mono muted">{displayPrev}</td>
              <td style={{textAlign:"center"}}>
                <span className={`ns-badge ${detected?"green":"grey"}`}>{detected?"Detected":"Not found"}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CsvImport({ selected, onImport, onKpiImport, kpiMonth, isUAEClient, C, F, FM, saved, loading }) {
  const [activeType, setActiveType] = React.useState("pl");
  const [month, setMonth]           = React.useState(kpiMonth || "");
  const [reports, setReports]       = React.useState({ pl:null, bs:null, cf:null, bank:null });
  const [fileNames, setFileNames]   = React.useState({ pl:"", bs:"", cf:"", bank:"" });
  const [errs, setErrs]             = React.useState({ pl:"", bs:"", cf:"", bank:"" });
  const [imported, setImported]     = React.useState({ pl:false, bs:false, cf:false, bank:false });
  const [importing, setImporting]   = React.useState(false);

  const uae = isUAEClient;
  const accentColor = uae ? "#00732F" : C.blue;

  const handleFile = (type, file) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const rt = REPORT_TYPES.find(r => r.id === type);
      const parsed = rt.parser(text);
      // Check if anything was detected
      const hasData = Object.values(parsed).some(v =>
        v !== null && typeof v === "object" && v.curr !== null
      ) || (typeof parsed.gpMargin === "string");
      if (!hasData) {
        setErrs(er => ({...er, [type]:"Could not detect financial data. Check that this is the correct report type."}));
        return;
      }
      setErrs(er => ({...er, [type]:""}));
      setReports(r => ({...r, [type]: parsed}));
      setFileNames(fn => ({...fn, [type]: file.name}));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImportType = async (type) => {
    const data = reports[type];
    if (!data || !selected) return;
    setImporting(true);

    const fmt = n => fmtCrL(n, uae);
    const fmtPair = (obj, prevObj) => obj?.curr !== null && obj?.curr !== undefined
      ? { actual: fmt(obj.curr), prev: prevObj?.curr !== null ? fmt(prevObj?.curr ?? null) : "—" }
      : undefined;

    let patch = {};

    if (type === "pl") {
      const plBlock = {
        revenue:      fmtPair(data.revenue, data.revenue),
        cogs:         fmtPair(data.cogs),
        grossProfit:  fmtPair(data.grossProfit),
        gpMargin:     data.gpMargin ? { actual:data.gpMargin, prev:"—" } : undefined,
        ebitda:       fmtPair(data.ebitda),
        ebitdaMargin: data.ebitdaMargin ? { actual:data.ebitdaMargin, prev:"—" } : undefined,
        pat:          fmtPair(data.pat),
        netMargin:    data.netMargin ? { actual:data.netMargin, prev:"—" } : undefined,
      };
      Object.keys(plBlock).forEach(k => plBlock[k]===undefined && delete plBlock[k]);
      const plInputs = {
        revenue:  data.revenue?.curr  !== null ? String(data.revenue.curr)  : undefined,
        cogs:     data.cogs?.curr     !== null ? String(data.cogs.curr)     : undefined,
        gpMargin: data.gpMargin  || undefined,
        ebitda:   data.ebitda?.curr   !== null ? String(data.ebitda.curr)   : undefined,
        pat:      data.pat?.curr      !== null ? String(data.pat.curr)      : undefined,
      };
      Object.keys(plInputs).forEach(k => plInputs[k]===undefined && delete plInputs[k]);
      patch = { pl: plBlock, plInputs, monthLabel: month || undefined };

      // KPI row for India
      if (!uae && month && onKpiImport) {
        await onKpiImport({
          month,
          revenue:      data.revenue?.curr      !== null ? fmt(data.revenue.curr)      : "",
          gross_margin: data.gpMargin            || "",
          cash_balance: data.cash?.curr          !== null ? fmt(data.cash.curr)         : "",
          burn_rate: "", runway: "", arr: "",
        });
      }
    }

    if (type === "bs") {
      const bs = {};
      BS_FIELDS.forEach(f => {
        const v = data[f.key]?.curr;
        if (v !== null && v !== undefined) bs[f.key] = v;
      });
      // Also merge into workingCapital
      const wc = {};
      if (data.tradeReceivables?.curr) wc.ar0_30 = data.tradeReceivables.curr;
      if (data.tradePayables?.curr)    wc.ap      = data.tradePayables.curr;
      if (data.inventory?.curr)        wc.inventory = data.inventory.curr;
      patch = { balanceSheet: bs, workingCapital: wc };
    }

    if (type === "cf") {
      const cfEntry = {
        month: month || "Imported",
        actual: data.closingCash?.curr !== null ? fmt(data.closingCash.curr) : undefined,
        operatingCF: data.operatingCF?.curr,
        investingCF: data.investingCF?.curr,
        financingCF: data.financingCF?.curr,
      };
      Object.keys(cfEntry).forEach(k => cfEntry[k]===undefined && delete cfEntry[k]);
      patch = { cashflow_import: cfEntry,
        plInputs: { closingCash: data.closingCash?.curr !== null ? fmt(data.closingCash.curr) : undefined } };
    }

    if (type === "bank") {
      const bs = {
        openingBalance: data.openingBalance?.curr,
        closingBalance:  data.closingBalance?.curr,
        totalCredits:    data.totalCredits?.curr,
        totalDebits:     data.totalDebits?.curr,
        netFlow:         data.netFlow?.curr,
        month:           month || "Imported",
      };
      Object.keys(bs).forEach(k => bs[k] === null || bs[k] === undefined ? delete bs[k] : null);
      patch = { bankStatement: bs };
      // Closing balance updates cash KPI
      if (data.closingBalance?.curr) {
        patch.plInputs = { closingCash: fmt(data.closingBalance.curr) };
      }
      // Inflows feed working capital analysis
      if (data.totalCredits?.curr) {
        patch.workingCapital = { cashInflow: data.totalCredits.curr };
      }
    }

    await onImport({ type, ...patch });
    setImporting(false);
    setImported(im => ({...im, [type]: true}));
    setTimeout(() => setImported(im => ({...im, [type]: false})), 3000);
  };

  if (!selected) return (
    <div style={{ maxWidth:600 }}>
      <EmptyState icon="ti-user-search" title="Select a client first"
        sub="Choose a client from the left panel to import their financial data."/>
    </div>
  );

  const activeRt = REPORT_TYPES.find(r => r.id === activeType);
  const activeData = reports[activeType];
  const activeFields = activeType==="pl" ? PL_FIELDS : activeType==="bs" ? BS_FIELDS : activeType==="cf" ? CF_FIELDS : BANK_FIELDS;
  const guide = EXPORT_GUIDES[activeType]?.[uae?"uae":"india"] || [];

  return (
    <div style={{ maxWidth:780 }}>
      {/* Header */}
      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
              CSV Import — {selected.company}
            </div>
            <div style={{ fontFamily:F, fontSize:12, color:C.muted, marginTop:2 }}>
              {uae ? "Zoho Books / FreshBooks / Bank Statement CSV" : "Tally ERP 9 / Tally Prime / Bank Statement CSV"}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <span className={`ns-badge ${uae?"green":"blue"}`}>{uae ? "UAE — AED" : "India — ₹"}</span>
            {Object.entries(imported).filter(([,v])=>v).map(([k]) => (
              <span key={k} className="ns-badge green">✓ {REPORT_TYPES.find(r=>r.id===k)?.label}</span>
            ))}
          </div>
        </div>

        {/* Month picker */}
        <div style={{ marginBottom:0 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
            letterSpacing:"0.08em", display:"block", marginBottom:6, fontFamily:F }}>
            Reporting Period — applies to all reports
          </label>
          <input value={month} onChange={e=>setMonth(e.target.value)}
            placeholder={uae ? "e.g. Q1 2026 or Mar 2026" : "e.g. Mar 2026"}
            style={{ padding:"9px 12px", borderRadius:8, border:`1.5px solid ${C.border}`,
              fontFamily:FM, fontSize:13, color:C.text, background:"#fff", outline:"none", width:220 }}
            onFocus={e=>e.target.style.borderColor=accentColor}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>
      </Card>

      {/* Report type tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={()=>setActiveType(rt.id)}
            style={{ padding:"9px 18px", borderRadius:8, border:`1.5px solid ${activeType===rt.id?accentColor:C.border}`,
              background: activeType===rt.id ? `${accentColor}10` : "#fff",
              color: activeType===rt.id ? accentColor : C.muted,
              fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer",
              display:"flex", alignItems:"center", gap:7, transition:"all 0.15s" }}>
            <i className={"ti " + rt.icon} style={{ fontSize:15 }}/>
            {rt.label}
            {reports[rt.id] && <span style={{ width:7, height:7, borderRadius:"50%",
              background: imported[rt.id] ? C.green : accentColor, display:"inline-block" }}/>}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontFamily:F, fontWeight:600, fontSize:13, color:C.text, marginBottom:12 }}>
          <i className={"ti " + activeRt.icon} style={{ marginRight:8, color:accentColor }}/>{activeRt.label} — Upload
        </div>
        <DropZone onFile={f=>handleFile(activeType,f)} fileName={fileNames[activeType]}
          dragColor={accentColor} F={F} C={C}/>
        {errs[activeType] && (
          <div style={{ color:C.red, fontFamily:F, fontSize:12, marginTop:10 }}>{errs[activeType]}</div>
        )}
      </Card>

      {/* Preview */}
      {activeData && (
        <Card style={{ marginBottom:14 }}>
          <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, marginBottom:14 }}>
            Detected Fields — {activeRt.label}
          </div>
          <PreviewTable fields={activeFields} data={activeData} uae={uae} F={F} FM={FM} C={C}/>
          <div style={{ fontFamily:F, fontSize:12, color:C.muted, margin:"14px 0", lineHeight:1.7 }}>
            Fields marked <strong>"Not found"</strong> will not overwrite existing data.
            You can manually enter missing values in the KPIs or Report Data tabs after import.
          </div>
          <button onClick={()=>handleImportType(activeType)} disabled={importing || imported[activeType]}
            style={{ padding:"11px 24px", borderRadius:8, border:"none",
              background: imported[activeType] ? C.green : accentColor, color:"white",
              fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer",
              opacity:importing?0.75:1, transition:"all 0.2s" }}>
            {importing ? "Importing…"
              : imported[activeType] ? `✓ ${activeRt.label} imported`
              : `Import ${activeRt.label}`}
          </button>
        </Card>
      )}

      {/* Export guide */}
      <Card style={{ background:`${accentColor}04`, borderColor:`${accentColor}20` }}>
        <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10 }}>
          How to export {activeRt.label} from {uae ? "Zoho Books" : "Tally Prime"}
        </div>
        <ol style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:2.1, margin:"0 0 0 -4px", paddingLeft:20 }}>
          {guide.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </Card>
    </div>
  );
}

export function AdminLogin({ onLogin }) {
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
      .from("admins").select("*").eq("email", form.email).maybeSingle();
    setLoading(false);
    if (!adminData) { await supabase.auth.signOut(); setError("Not authorised as admin."); return; }
    onLogin(adminData);
  };
 
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:F }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
            <Logo size={32} dark={false} showTagline={false}/>
          </div>
          <div style={{ display:"inline-block", padding:"4px 14px", borderRadius:60,
            background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.3)" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#FBBF24", letterSpacing:"0.1em" }}>ADMIN ACCESS</span>
          </div>
        </div>
        <Card style={{ padding:32 }}>
          <h2 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:14, textAlign:"center" }}>
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
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, fontSize:14,
                  border:`1.5px solid ${C.border}`, fontFamily:F, color:C.text,
                  background:C.bg, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor = C.amber}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
            </div>
          ))}
          {error && <p style={{ color:C.red, fontSize:12, marginTop:4 }}>{error}</p>}
          <button onClick={signIn} disabled={loading} style={{ width:"100%", marginTop:8, padding:"14px 24px",
            borderRadius:12, border:"none", background:C.gradDiag,
            color:"white", fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer",
            opacity:loading?0.75:1, touchAction:"manipulation" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </Card>
      </div>
    </div>
  );
}
 
export function AdminPanel({ admin, onLogout, MarketIntelComponent }) {
  const [tab, setTab]         = useState("clients");
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null); // selected client for editing
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [markingReview, setMarkingReview] = useState(false);
  const [reviewedAt, setReviewedAt]       = useState(null);
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
    const DEMO_CLIENTS = [
      { id:"DEMO-STARTUP", name:"Riya Kapoor", company:"BrightAI Technologies", type:"both",
        client_pack:"startup", email:"demo-startup@finzzup.com", jurisdiction:"India",
        invite_code:"DEMO-STARTUP", active:true },
      { id:"DEMO-MSME", name:"Suresh Gupta", company:"Gupta Exports Pvt Ltd", type:"both",
        client_pack:"msme", email:"demo-msme@finzzup.com", jurisdiction:"India",
        invite_code:"DEMO-MSME", active:true },
      { id:"DEMO-CORP", name:"Anita Desai", company:"Horizon Manufacturing Ltd", type:"both",
        client_pack:"corporate", email:"demo-corp@finzzup.com", jurisdiction:"India",
        invite_code:"DEMO-CORP", active:true },
      { id:"DEMO-UAE", name:"Ahmed Al Rashidi", company:"Rashidi Trading LLC (DMCC)", type:"both",
        client_pack:"startup", email:"demo-uae@finzzup.com", jurisdiction:"UAE",
        freezone:"DMCC", trnVAT:"100345678900003", trnCT:"900012345678901",
        vatRegistered:true, qfzpStatus:true, sbrEligible:true,
        financialYearEnd:"31 Dec", invite_code:"DEMO-UAE", active:true },
      { id:"DEMO-XBORDER", name:"Priya Shah", company:"Shah Industries (India + UAE)", type:"both",
        client_pack:"msme", email:"demo-xborder@finzzup.com", jurisdiction:"Cross-Border",
        freezone:"JAFZA", trnVAT:"100987654300001", vatRegistered:true,
        qfzpStatus:false, sbrEligible:true, financialYearEnd:"31 Mar",
        invite_code:"DEMO-XBORDER", active:true },
    ];
    const live = data || [];
    const liveIds = new Set(live.map(c => c.invite_code));
    setClients([...live, ...DEMO_CLIENTS.filter(d => !liveIds.has(d.invite_code))]);
    // Pre-load all requests so the Requests tab works without selecting a client
    const { data: allReqs } = await supabase.from("requests").select("*").order("created_at", { ascending:false });
    if (allReqs) setRequests(allReqs);
  };
 
  const selectClient = async (c) => {
    setSelected(c); setSaved(false);
    // Load latest KPIs
    const { data: kpiData } = await supabase.from("kpis")
      .select("*").eq("client_id", c.id).order("updated_at", { ascending:false }).limit(1).maybeSingle();
    if (kpiData) setKpis(kpiData);
    else setKpis({ month:"", revenue:"", gross_margin:"", cash_balance:"", burn_rate:"", runway:"", arr:"", garima_note:"" });
    // Load actions
    const { data: actData } = await supabase.from("action_items")
      .select("*").eq("client_id", c.id).order("created_at", { ascending:false });
    setActions(actData || []);
    // Load engagement
    const { data: engData } = await supabase.from("engagements")
      .select("*").eq("client_id", c.id).maybeSingle();
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
      .select("*").eq("client_id", c.id).maybeSingle();
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
        setReviewedAt(parsed.lastReviewedAt || null);
      } catch(e) { setReportData(defaults); setReviewedAt(null); }
    }
    else { setReportData(defaults); setReviewedAt(null); }
    // Smart tab switch: UAE clients default to UAE tab, India clients to KPIs
    const currentTabIsNeutral = ["clients","addclient"].includes(tab);
    if (currentTabIsNeutral || !tab) {
      setTab(isUAE(c) ? "uae" : "kpis");
    }
  };

  const markReviewed = async () => {
    if (!selected) return;
    setMarkingReview(true);
    const ts = new Date().toISOString();
    const { data: rdData } = await supabase.from("report_data")
      .select("data").eq("client_id", selected.id).maybeSingle();
    const existing = rdData?.data
      ? (typeof rdData.data === "string" ? JSON.parse(rdData.data) : rdData.data)
      : {};
    const { error } = await supabase.from("report_data").upsert(
      { client_id: selected.id, data: { ...existing, lastReviewedAt: ts } },
      { onConflict: "client_id" }
    );
    if (!error) setReviewedAt(ts);
    setMarkingReview(false);
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
    const { data: existing } = await supabase.from("report_data").select("id").eq("client_id", selected.id).maybeSingle();
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
    // ── Client Management ──
    { id:"clients",    icon:"ti-users", label:"All Clients",    group:"Clients"    },
    { id:"addclient",  icon:"ti-user-plus", label:"Add Client",     group:"Clients"    },
    // ── India Client Data ──
    { id:"import",     icon:"ti-file-upload", label:"CSV Import",     group:"Shared"     },
    { id:"kpis",       icon:"ti-chart-bar", label:"KPIs",           group:"India"      },
    { id:"actions",    icon:"ti-checkbox", label:"Action Items",   group:"India"      },
    { id:"reportdata", icon:"ti-report-analytics", label:"Report Data",    group:"India"      },
    { id:"engagement", icon:"ti-scale", label:"Valuation",      group:"India"      },
    { id:"analytics",  icon:"ti-world", label:"BI & Scenarios", group:"India"      },
    { id:"treasury",   icon:"ti-building-bank", label:"Treasury",       group:"India"      },
    // ── UAE Client Data ──
    { id:"uae",        icon:"ti-flag", label:"UAE Profile & Tax", group:"UAE"   },
    { id:"uaecashflow",icon:"ti-cash", label:"UAE Cash & Notes",   group:"UAE"   },
    // ── Shared ──
    { id:"invoices",   icon:"ti-receipt", label:"Invoices",       group:"Shared"     },
    { id:"documents",  icon:"ti-folder", label:"Documents",      group:"Shared"     },
    { id:"requests",   icon:"ti-mail", label:"Requests",       group:"Shared"     },
    { id:"market",     icon:"ti-world", label:"Market Intel",   group:"Shared"     },
  ];
 
  // Stable component references — prevents remount/focus-loss on every render
 
  // ── AUTO-CALCULATE RATIOS FROM ENTERED DATA ─────────────────────────────────
  const calcRatios = () => {
    if (!reportData) return {};
    var pl     = reportData?.plInputs || {};
    var rd     = reportData || {};
    // Admin kpis is a form object {revenue, gross_margin, cash_balance...}
    // Map it to match what calcRatios expects
    var kv     = {
      revenue:       kpis?.revenue       || "",
      cash_balance:  kpis?.cash_balance  || "",
      burn_rate:     kpis?.burn_rate     || "",
      runway:        kpis?.runway        || "",
      arr:           kpis?.arr           || "",
    };
    var calc   = {};
 
    // Helper: parse numeric value from strings like "₹84L", "₹2.1 Cr", "41%", "4.2x"
    var parse = (val) => {
      if (!val) return null;
      var s = String(val).replace(/[₹,\s]/g, "");
      var n = parseFloat(s);
      if (isNaN(n)) return null;
      if (s.toLowerCase().includes("cr"))  n = n * 100; // Cr → L
      if (s.toLowerCase().includes("%"))   n = n;       // keep as %
      return n;
    };
 
    var revenue   = parse(pl.revenue)      || parse(kv.revenue);
    var gp        = parse(pl.grossProfit);
    var gpMargin  = parse(pl.gpMargin);
    var ebitda    = parse(pl.ebitda);
    var pat       = parse(pl.pat);
    var cash      = parse(kv.cash_balance) || parse(rd.closingCash);
    var burn      = parse(kv.burn_rate);
    var runway    = parse(kv.runway);
    var arr       = parse(kv.arr)          || parse(rd.arr);
    var debt      = parse(rd.existingDebt);
    var interest  = parse(rd.interestCost);
    var operCF    = parse(rd.operatingCF);
    var freeCF    = parse(rd.freeCF);
    var debtors   = parse(rd.debtors);
    var creditors = parse(rd.creditors);
    var inventory = parse(rd.inventory);
    var ddays     = parse(rd.debtorDays);
    var cdays     = parse(rd.creditorDays);
    var idays     = parse(rd.inventoryDays);
    var cac       = parse(rd.cac);
    var ltv       = parse(rd.ltv);
    var momGrowth = parse(rd.momGrowth);
    var churn     = parse(rd.churnRate);
    var nrr       = parse(rd.nrr);
 
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
    // Calculate CAC and LTV from raw inputs if available
    var mktgSpend    = parse(rd.totalMktgSpend);
    var newCusts     = parse(rd.newCustomers);
    var avgRevCust   = parse(rd.avgRevPerCust);
    var retentionMos = parse(rd.avgRetentionMos);
    var derivedCac   = (mktgSpend && newCusts && newCusts > 0) ? mktgSpend / newCusts : cac;
    var derivedLtv   = (avgRevCust && retentionMos) ? avgRevCust * retentionMos / 12 : ltv;
 
    if (derivedCac && !cac)
      calc.cacCalc = "Rs." + Math.round(derivedCac * 100).toLocaleString("en-IN");
    if (derivedLtv && !ltv)
      calc.ltvCalc = "Rs." + Math.round(derivedLtv * 1000).toLocaleString("en-IN");
    if ((derivedLtv || ltv) && (derivedCac || cac) && (derivedCac || cac) > 0)
      calc.ltvCacCalc = ((derivedLtv||ltv) / (derivedCac||cac)).toFixed(1) + "x";
    if ((derivedCac || cac) && ebitda && revenue) {
      var margin = parse(pl.gpMargin) || 40;
      calc.cacPaybackCalc = (((derivedCac||cac) / (revenue * margin / 100)) * 12).toFixed(0) + " months";
    }
 
    if (burn && arr && arr > 0)
      calc.burnMultipleCalc     = (burn / (arr / 12)).toFixed(2) + "x";
 
    // ── RUNWAY CHECK ──
    if (cash && burn && burn > 0 && !runway)
      calc.runwayCalc           = (cash / burn).toFixed(1) + " months";
 
    return calc;
  };
 
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
${kpiSummary ? "KPIs: " + kpiSummary : ""}
${plSummary ? "P&L: " + plSummary : ""}
${debtSummary ? "Debt/Ratios: " + debtSummary : ""}
${wcSummary ? "Working Capital: " + wcSummary : ""}
${reportData?.loanScore ? "Loan Readiness Score: " + reportData.loanScore + "/100" : ""}
${reportData?.varianceCommentary ? "Variance note: " + reportData.varianceCommentary : ""}
${calcSummary ? "Auto-calculated ratios: " + calcSummary : ""}
${reportData?.loanAmountSought ? "Loan sought: " + reportData.loanAmountSought + " for " + (reportData.loanPurpose||"unspecified purpose") : ""}
${marketContext ? "Current market context: " + marketContext : ""}
${pack==="startup" && reportData?.cac ? "Unit economics entered: CAC " + reportData.cac + ", LTV " + (reportData.ltv||"—") : ""}
 
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
      const apiKey = true; // Key is handled server-side via /api/chat
      if (!apiKey) {
        setAiError("API key not configured. Add VITE_ANTHROPIC_KEY to your Vercel environment variables.");
        setAiGen(false);
        return;
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4000,
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
 
  const generateUAEAnalysis = async () => {
    if (!selected) return;
    setAiGen(true);
    setAiError("");
    setAiDraft(null);

    const company  = selected.company || selected.name || "the client";
    const month    = reportData?.monthLabel || "current period";
    const freezone = selected.freezone || "DMCC";

    const vatSummary = reportData?.vat ? [
      `Output VAT: AED ${Number(reportData.vat.outputVAT||0).toLocaleString()}`,
      `Input VAT: AED ${Number(reportData.vat.inputVAT||0).toLocaleString()}`,
      `VAT Payable: AED ${Number(reportData.vat.vatPayable||0).toLocaleString()}`,
      `Filing Period: ${reportData.vat.filingPeriod||"—"}`,
      `Next Deadline: ${reportData.vat.nextDeadline||"—"}`,
    ].join(", ") : "";

    const ctSummary = reportData?.ct ? [
      `Revenue: AED ${Number(reportData.ct.revenue||0).toLocaleString()}`,
      `Accounting Profit: AED ${Number(reportData.ct.taxableIncome||0).toLocaleString()}`,
      `Qualifying Income: ${reportData.ct.qualifyingPct||"—"}%`,
      `Non-Qualifying Income: ${reportData.ct.nonQualifyingPct||"—"}%`,
    ].join(", ") : "";

    const qfzpSummary = reportData?.qfzpSubstance ? [
      `QFZP Score: ${reportData.qfzpSubstance.overallScore || reportData?.qfzp?.qfzpScore || "—"}/100`,
      `Employees: ${reportData.qfzpSubstance.employeeCount||"—"}`,
      `OpEx: AED ${reportData.qfzpSubstance.opexAED||"—"}`,
      `Office: ${reportData.qfzpSubstance.officeSqft||"—"} sq ft`,
    ].join(", ") : "";

    const cashSummary = [
      reportData?.projectedCash   && `Projected Cash: ${reportData.projectedCash}`,
      reportData?.vatReserve      && `VAT Reserve Required: ${reportData.vatReserve}`,
      reportData?.netCashAfterObl && `Net Cash After Obligations: ${reportData.netCashAfterObl}`,
    ].filter(Boolean).join(", ");

    const kpiSummary = [
      kpis.revenue      && `Revenue: ${kpis.revenue}`,
      kpis.gross_margin && `Gross Margin: ${kpis.gross_margin}`,
      kpis.cash_balance && `Cash Balance: ${kpis.cash_balance}`,
      kpis.runway       && `Runway: ${kpis.runway}`,
    ].filter(Boolean).join(", ");

    const prompt = `You are Garima Agarwal, a Chartered Accountant and UAE CFO advisor writing monthly financial analysis for your UAE client ${company} based in ${freezone} for ${month}.

Financial & Tax Data:
${kpiSummary  ? "KPIs: " + kpiSummary : ""}
${vatSummary  ? "VAT: " + vatSummary : ""}
${ctSummary   ? "Corporate Tax: " + ctSummary : ""}
${qfzpSummary ? "QFZP Substance: " + qfzpSummary : ""}
${cashSummary ? "Cash Position: " + cashSummary : ""}

Write in Garima's voice — direct, specific, actionable. Reference actual AED figures. Focus on UAE concerns: VAT filing compliance, QFZP substance maintenance, CT effective rate, and cash management.

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "uaeGarimaNote": "2-3 sentence overall note for this period — performance, top 1-2 priority actions for the client",
  "cashflowGarimaNote": "2-3 sentences on cash position, VAT reserve adequacy, and forward cash outlook",
  "vatGarimaNote": "2-3 sentences on VAT position, next filing deadline, and any compliance actions",
  "ctGarimaNote": "2-3 sentences on CT effective rate, QFZP qualifying income split, and any CT return actions",
  "qfzpNote": "2-3 sentences on QFZP substance score, any pillars at risk, recommended actions to protect 0% CT status"
}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:2000, messages:[{ role:"user", content:prompt }] }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error?.message || `API error ${res.status}`); }
      const data  = await res.json();
      const raw   = data?.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g,"").trim();
      setAiDraft(JSON.parse(clean));
    } catch(e) {
      setAiError("Generation failed — fill in UAE data above and try again.");
      console.error(e);
    } finally {
      setAiGen(false);
    }
  };

  // Convert AI string response for varianceCommentary into the array format the UI expects
  const normalizeAiDraft = (draft) => {
    if (!draft) return draft;
    const out = {...draft};
    // varianceCommentary: AI returns a string, UI expects [{item, note, favorable}]
    if (typeof out.varianceCommentary === "string") {
      const lines = out.varianceCommentary
        .split(/\n|\.(?=\s)/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      out.varianceCommentary = lines.map(line => ({
        item: line.replace(/^\d+[\.\)]\s*/, "").substring(0, 40),
        note: line,
        favorable: !line.toLowerCase().includes("miss") && !line.toLowerCase().includes("below") && !line.toLowerCase().includes("down"),
      }));
    }
    return out;
  };
 
  const applyDraft = (field) => {
    if (!aiDraft?.[field]) return;
    const normalized = normalizeAiDraft({[field]: aiDraft[field]});
    const updates = normalized;
    if (field === "garimaNote") {
      updates.packNote   = aiDraft[field];
      updates.reportNote = aiDraft[field];
    }
    setReportData(r => ({...r, ...updates}));
    if (field === "garimaNote") setKpis(k => ({...k, garima_note: aiDraft[field]}));
  };
 
  const applyAllDraft = () => {
    if (!aiDraft) return;
    const mapped = normalizeAiDraft({...aiDraft});
    if (aiDraft.garimaNote) {
      mapped.packNote   = aiDraft.garimaNote;
      mapped.reportNote = aiDraft.garimaNote;
    }
    setReportData(r => ({...r, ...mapped}));
    if (aiDraft.garimaNote) {
      setKpis(k => ({...k, garima_note: aiDraft.garimaNote}));
    }
    setAiDraft(null);
    setSaved(false);
  };
 
 
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:F }}>
      {/* Admin Sidebar */}
      <aside style={{ width:220, minHeight:"100vh", background:"#F3F4F6", flexShrink:0,
        display:"flex", flexDirection:"column", borderRight:`1px solid ${C.border}` }}>
        <div style={{ padding:"22px 20px", borderBottom:`1px solid ${C.border}` }}>
          <Logo size={28} dark={false} showTagline={false}/>
          <div style={{ marginTop:10, padding:"4px 10px", borderRadius:60, display:"inline-block",
            background:`${C.amber}15`, border:`1px solid ${C.amber}30` }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:"0.1em" }}>ADMIN</span>
          </div>
        </div>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:C.dim, fontFamily:F }}>Logged in as</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:F, marginTop:2 }}>{admin.name}</div>
        </div>
        {/* Client selector */}
        {clients.length > 0 && (
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:F }}>
              Active Client
            </div>
            <select value={selected?.id || ""} onChange={e => {
              const c = clients.find(x => x.id===e.target.value);
              if (c) selectClient(c);
            }} style={{ width:"100%", padding:"8px 10px", borderRadius:9, fontSize:12,
              background:"#fff", border:`1.5px solid ${C.border}`,
              color:C.text, fontFamily:F, outline:"none" }}>
              <option value="">— Select client —</option>
              {clients.filter(c=>isUAE(c)).length > 0 && (
                <optgroup label="UAE Clients">
                  {clients.filter(c=>isUAE(c)).map(c => (
                    <option key={c.id} value={c.id}>
                      UAE · {c.name} — {c.freezone||c.jurisdiction} ({getPackLabel(c.client_pack)})
                    </option>
                  ))}
                </optgroup>
              )}
              {clients.filter(c=>!isUAE(c)).length > 0 && (
                <optgroup label="India Clients">
                  {clients.filter(c=>!isUAE(c)).map(c => (
                    <option key={c.id} value={c.id}>
                      India · {c.name} — {c.company} ({getPackLabel(c.client_pack)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
          {["Clients","India","UAE","Shared"].map(group => {
            const groupTabs = ADMIN_TABS.filter(t => t.group === group);
            return (
              <div key={group}>
                <div style={{ padding:"10px 16px 4px", fontFamily:F, fontSize:9,
                  fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"0.12em" }}>
                  {group}
                </div>
                {groupTabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    display:"flex", alignItems:"center", gap:10, width:"100%",
                    padding:"10px 16px", background:tab===t.id?`${C.amber}12`:"transparent",
                    border:"none", cursor:"pointer",
                    borderLeft:tab===t.id?`3px solid ${C.amber}`:"3px solid transparent",
                    fontFamily:F }}>
                    <i className={"ti " + (t.icon||"ti-circle")} style={{ fontSize:14,
                      color:tab===t.id?C.amber:C.muted }}/>
                    <span style={{ fontSize:12, fontWeight:600,
                      color:tab===t.id?C.amber:C.muted }}>{t.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}` }}>
          <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8,
            width:"100%", padding:"10px 12px", background:"none", border:"none",
            cursor:"pointer", borderRadius:9, fontFamily:F, fontSize:13,
            fontWeight:600, color:C.muted }}>
            <i className="ti ti-logout" style={{ fontSize:14 }}/>
            Sign Out
          </button>
        </div>
      </aside>
 
      {/* Main content */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {/* Header */}
        <div style={{ height:58, background:"#fff", borderBottom:`1px solid #EAECF0`,
          display:"flex", alignItems:"center", padding:"0 24px", gap:20 }}>
          <h1 style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em", margin:0 }}>
            {ADMIN_TABS.find(t=>t.id===tab)?.label}
          </h1>
          {selected && tab !== "clients" && tab !== "addclient" && (
            <div style={{ padding:"4px 12px", borderRadius:60, background:`${C.amber}15`,
              border:`1px solid ${C.amber}30` }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.amber, fontFamily:F }}>
                {selected.name} — {selected.company}
              </span>
            </div>
          )}
          {selected && (
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
              {reviewedAt && (
                <span style={{ fontFamily:F, fontSize:11, color:C.green }}>
                  <i className="ti ti-circle-check" style={{ marginRight:4 }}/>
                  Reviewed {new Date(reviewedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
                </span>
              )}
              <button onClick={markReviewed} disabled={markingReview}
                style={{ padding:"7px 16px", borderRadius:8, border:`1.5px solid ${C.green}`,
                  background: markingReview ? "#F0FDF4" : C.green, color:"white",
                  fontFamily:F, fontWeight:700, fontSize:12, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}>
                <i className="ti ti-circle-check" style={{ fontSize:14 }}/>
                {markingReview ? "Marking…" : "Mark Reviewed"}
              </button>
            </div>
          )}
        </div>
 
        <div className="ns-page">
 
          {/* ── HOME DASHBOARD ── */}
          {tab === "home" && (() => {
            const now = Date.now();
            const daysSince = iso => iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : 999;
            const stalenessColor = days => days < 7 ? C.green : days < 30 ? C.amber : C.red;
            const stalenessLabel = days => days < 7 ? "Updated recently" : days < 30 ? `${days}d ago` : days > 200 ? "Never updated" : `${days}d ago — stale`;

            const activeClients = clients.filter(c => c.active !== false && !c.id?.startsWith("DEMO"));
            const demoClients   = clients.filter(c => c.id?.startsWith("DEMO"));

            const sorted = [...activeClients].sort((a, b) => {
              const dA = daysSince((staleness[a.id]?.kpiAt || staleness[a.id]?.rdAt));
              const dB = daysSince((staleness[b.id]?.kpiAt || staleness[b.id]?.rdAt));
              return dB - dA; // most stale first
            });

            const staleCount   = sorted.filter(c => daysSince(staleness[c.id]?.kpiAt || staleness[c.id]?.rdAt) >= 30).length;
            const freshCount   = sorted.filter(c => daysSince(staleness[c.id]?.kpiAt || staleness[c.id]?.rdAt) < 7).length;

            return (
              <div>
                {/* Summary strip */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                  {[
                    { icon:"ti-users",         label:"Active Clients", value:activeClients.length, color:C.blue  },
                    { icon:"ti-circle-check",  label:"Up to date",     value:freshCount,            color:C.green },
                    { icon:"ti-alert-triangle",label:"Needs update",   value:staleCount,            color:C.red   },
                    { icon:"ti-clock",         label:"Demo clients",   value:demoClients.length,    color:C.muted },
                  ].map((s,i) => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
                      padding:"16px 18px", display:"flex", alignItems:"center", gap:14 }}>
                      <i className={"ti " + s.icon} style={{ fontSize:22, color:s.color }}/>
                      <div>
                        <div style={{ fontFamily:F, fontWeight:800, fontSize:22, color:s.color, lineHeight:1 }}>{s.value}</div>
                        <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:3 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Client cards — sorted by most stale first */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:12 }}>
                  {sorted.map(c => {
                    const kpiAt = staleness[c.id]?.kpiAt;
                    const rdAt  = staleness[c.id]?.rdAt;
                    const lastAt = kpiAt || rdAt;
                    const days   = daysSince(lastAt);
                    const sc     = stalenessColor(days);
                    const sl     = stalenessLabel(days);
                    const uae    = isUAE(c);
                    return (
                      <div key={c.id} style={{ background:"#fff", border:`1px solid ${C.border}`,
                        borderRadius:12, padding:"16px 18px", borderTop:`3px solid ${sc}`,
                        display:"flex", flexDirection:"column", gap:10 }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                          <div>
                            <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>{c.name}</div>
                            <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:1 }}>{c.company}</div>
                          </div>
                          <span style={{ padding:"3px 10px", borderRadius:60, fontSize:10, fontWeight:700,
                            background: uae ? "#E8F5EE" : `${C.blue}12`,
                            color: uae ? "#00732F" : C.blue, whiteSpace:"nowrap", flexShrink:0 }}>
                            {uae ? "UAE" : "India"} · {getPackLabel(c.client_pack)}
                          </span>
                        </div>

                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:sc, flexShrink:0 }}/>
                          <div style={{ fontFamily:F, fontSize:11, color:sc, fontWeight:600 }}>{sl}</div>
                        </div>

                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => { selectClient(c); setTab(uae?"uae":"kpis"); }}
                            style={{ flex:1, padding:"8px 0", borderRadius:8, border:`1.5px solid ${C.amber}`,
                              background:"transparent", color:C.amber, fontFamily:F, fontSize:11,
                              fontWeight:700, cursor:"pointer" }}>
                            <i className="ti ti-edit" style={{ marginRight:5 }}/>Update Data
                          </button>
                          <button onClick={() => {
                            setQuickUpdate(c);
                            setQuickForm({ garima_note:"", revenue:"", cash_balance:"" });
                          }}
                            style={{ padding:"8px 14px", borderRadius:8, border:`1.5px solid ${C.border}`,
                              background:`${C.blue}08`, color:C.blue, fontFamily:F, fontSize:11,
                              fontWeight:700, cursor:"pointer" }}>
                            <i className="ti ti-bolt" style={{ marginRight:4 }}/>Quick
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {demoClients.length > 0 && (
                  <div style={{ marginTop:24, padding:"12px 16px", borderRadius:10, background:"#F8FAFC",
                    border:`1px dashed ${C.border}`, fontFamily:F, fontSize:12, color:C.muted }}>
                    <strong>{demoClients.length} demo client{demoClients.length!==1?"s":""}</strong> — read-only, not shown here
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── ALL CLIENTS ── */}
          {tab === "clients" && (
            <div>
              <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginBottom:20 }}>
                {clients.length} client{clients.length!==1?"s":""} registered
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {/* Filter: separate UAE and India clients visually */}
                {[
                  { label:"UAE Clients", filter: c => isUAE(c) },
                  { label:"India Clients", filter: c => !isUAE(c) },
                ].map(group => {
                  const groupClients = clients.filter(group.filter);
                  if (!groupClients.length) return null;
                  return (
                    <div key={group.label} style={{ marginBottom:8 }}>
                      <div style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.1em",
                        padding:"8px 4px 4px" }}>
                        {group.label} ({groupClients.length})
                      </div>
                      {groupClients.map(c => (
                        <Card key={c.id} style={{ padding:"14px 18px", cursor:"pointer", marginBottom:8,
                          borderLeft: selected?.id===c.id
                            ? `3px solid ${C.amber}`
                            : isUAE(c) ? `3px solid #00732F` : `3px solid ${C.blue}30`,
                          transition:"box-shadow 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(15,26,56,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(15,26,56,0.06)"}
                          onClick={() => { selectClient(c); setTab(isUAE(c)?"uae":"kpis"); }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                            <div>
                              <div style={{ fontFamily:F, fontWeight:700, fontSize:14, color:C.text, letterSpacing:"-0.02em" }}>{c.name}</div>
                              <div style={{ fontFamily:F, fontSize:12, color:C.muted }}>{c.company}</div>
                              <div style={{ fontFamily:FM, fontSize:10, color:C.dim, marginTop:2 }}>{c.email}</div>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                              <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
                                {isUAE(c) && (
                                  <span style={{ fontFamily:F, fontSize:10, fontWeight:700,
                                    background:"#E8F5EE", color:"#00732F",
                                    padding:"2px 8px", borderRadius:60, border:"1px solid #86EFAC" }}>
                                    {c.jurisdiction === "Cross-Border" ? "Cross-Border" : `UAE ${c.freezone||"UAE"}`}
                                  </span>
                                )}
                                <Badge color={
                                  normalizePack(c.client_pack)==="msme" ? C.teal :
                                  normalizePack(c.client_pack)==="corporate" ? C.purple : C.blue
                                }>{getPackLabel(c.client_pack)}</Badge>
                                <span style={{ fontFamily:FM, fontSize:10, fontWeight:700, color:C.amber,
                                  background:`${C.amber}15`, padding:"2px 7px", borderRadius:60 }}>
                                  {c.invite_code}
                                </span>
                              </div>
                              <button onClick={e => { e.stopPropagation(); toggleClientActive(c); }}
                                style={{ padding:"3px 10px", borderRadius:60, border:"none", cursor:"pointer",
                                  fontFamily:F, fontSize:10, fontWeight:700,
                                  background: c.active ? `${C.green}15` : `${C.red}15`,
                                  color: c.active ? C.green : C.red }}>
                                {c.active ? "● Active" : "● Inactive"}
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
              {clients.length === 0 && (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
                  <div style={{ fontFamily:F, fontSize:15, color:C.muted }}>No clients yet</div>
                  <button onClick={() => setTab("addclient")} style={{ marginTop:16, padding:"10px 20px",
                    borderRadius:16, border:"none", background:C.blue, color:"white",
                    fontFamily:F, fontWeight:700, cursor:"pointer" }}>
                    Add First Client →
                  </button>
                </Card>
              )}
            </div>
          )}
 
          {/* ── ADD CLIENT ── */}
          {tab === "addclient" && (
            <Card style={{ maxWidth:900 }}>
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:20 }}>
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
                  border:`1px solid ${C.border}`, background:"#fff", fontFamily:F, fontSize:12,
                  color:C.muted, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Auto-generate
                </button>
              </div>
              <AdminSelect C={C} F={F} label="Pack Type" val={newClient.client_pack}
                onChange={v=>setNewClient(c=>({...c,client_pack:v}))}
                options={[
                  {value:"startup",   label:"Starter — ₹25,000/mo (P&L + Working Capital)"},
                  {value:"msme",      label:"MSME — ₹60,000/mo (+ Fundraise Readiness, Finance)"},
                  {value:"corporate", label:"Corporate — ₹1,25,000/mo (+ Full Strategic Suite)"},
                  {value:"uae",       label:"UAE — 4,000 AED/mo"},
                ]}/>
              <AdminSelect C={C} F={F} label="Service Type" val={newClient.type}
                onChange={v=>setNewClient(c=>({...c,type:v}))}
                options={[
                  {value:"both",      label:"CFO + Valuation"},
                  {value:"cfo",       label:"CFO Only"},
                  {value:"valuation", label:"Valuation Only"},
                ]}/>
              {/* ── UAE fields ── */}
              <AdminSelect C={C} F={F} label="Jurisdiction" val={newClient.jurisdiction||"India"}
                onChange={v=>setNewClient(c=>({...c,jurisdiction:v}))}
                options={[
                  {value:"India",        label:"India"},
                  {value:"UAE",          label:"UAE / Dubai"},
                  {value:"Cross-Border", label:"Cross-Border (India + UAE)"},
                ]}/>
              {(newClient.jurisdiction === "UAE" || newClient.jurisdiction === "Cross-Border") && (<>
                <AdminSelect C={C} F={F} label="Free Zone" val={newClient.freezone||"DMCC"}
                  onChange={v=>setNewClient(c=>({...c,freezone:v}))}
                  options={[
                    {value:"DMCC",  label:"DMCC — Dubai Multi Commodities Centre"},
                    {value:"JAFZA", label:"JAFZA — Jebel Ali Free Zone"},
                    {value:"ADGM",  label:"ADGM — Abu Dhabi Global Market"},
                    {value:"DIFC",  label:"DIFC — Dubai Int'l Financial Centre"},
                    {value:"RAK",   label:"RAKEZ — RAK Economic Zone"},
                    {value:"Other", label:"Other / Mainland"},
                  ]}/>
                <AdminInput C={C} F={F} FM={FM} label="VAT TRN" val={newClient.trnVAT||""}
                  onChange={v=>setNewClient(c=>({...c,trnVAT:v}))} placeholder="e.g. 100345678900003" mono/>
                <AdminInput C={C} F={F} FM={FM} label="CT TRN (Corporate Tax)" val={newClient.trnCT||""}
                  onChange={v=>setNewClient(c=>({...c,trnCT:v}))} placeholder="e.g. 900012345678901" mono/>
                <AdminSelect C={C} F={F} label="Financial Year End" val={newClient.financialYearEnd||"31 Dec"}
                  onChange={v=>setNewClient(c=>({...c,financialYearEnd:v}))}
                  options={[
                    {value:"31 Dec", label:"31 December (Calendar Year)"},
                    {value:"31 Mar", label:"31 March (India-aligned)"},
                  ]}/>
                <AdminSelect C={C} F={F} label="VAT Registered?" val={newClient.vatRegistered?"yes":"no"}
                  onChange={v=>setNewClient(c=>({...c,vatRegistered:v==="yes"}))}
                  options={[{value:"yes",label:"✅ Yes — VAT Registered"},{value:"no",label:"❌ Not Registered"}]}/>
                <AdminSelect C={C} F={F} label="QFZP Status?" val={newClient.qfzpStatus?"yes":"no"}
                  onChange={v=>setNewClient(c=>({...c,qfzpStatus:v==="yes"}))}
                  options={[{value:"yes",label:"✅ Active QFZP"},{value:"no",label:"❌ Not a QFZP"}]}/>
                <AdminSelect C={C} F={F} label="SBR Eligible?" val={newClient.sbrEligible?"yes":"no"}
                  onChange={v=>setNewClient(c=>({...c,sbrEligible:v==="yes"}))}
                  options={[{value:"yes",label:"✅ SBR Eligible (revenue ≤ AED 3M)"},{value:"no",label:"❌ Not Eligible"}]}/>
              </>)}
              <div style={{ marginTop:8 }}>
                <button onClick={createClient} style={{ padding:"12px 24px", borderRadius:16,
                  border:"none", background:C.grad1, color:"white", fontFamily:F,
                  fontWeight:700, fontSize:14, cursor:"pointer", touchAction:"manipulation" }}>
                  Create Client →
                </button>
              </div>
              <div style={{ marginTop:16, padding:"10px 14px", borderRadius:16,
                background:`${C.blue}08`, border:`1px solid ${C.blue}20` }}>
                <p style={{ fontFamily:F, fontSize:12, color:C.muted, margin:0, lineHeight:1.7 }}>
                  💡 After creating, share the invite code with your client. They go to the portal,
                  enter the code, and create their own password. No manual password setup needed.
                </p>
              </div>
            </Card>
          )}
 
          {/* ── CSV IMPORT ── */}
          {tab === "import" && (
            <CsvImport
              selected={selected}
              isUAEClient={isUAE(selected)}
              onImport={async (patch) => {
                if (!selected) return;
                const existing = reportData || {};
                let merged = { ...existing };
                if (patch.type === "pl") {
                  merged = { ...merged,
                    pl: { ...(existing.pl||{}), ...(patch.pl||{}) },
                    plInputs: { ...(existing.plInputs||{}), ...(patch.plInputs||{}) },
                    ...(patch.monthLabel ? { monthLabel: patch.monthLabel } : {}),
                  };
                } else if (patch.type === "bs") {
                  merged = { ...merged,
                    balanceSheet: { ...(existing.balanceSheet||{}), ...(patch.balanceSheet||{}) },
                    workingCapital: { ...(existing.workingCapital||{}), ...(patch.workingCapital||{}) },
                  };
                } else if (patch.type === "cf") {
                  const existingCf = existing.cashflow || [];
                  const entry = patch.cashflow_import;
                  const cfMerged = entry
                    ? [...existingCf.filter(c=>c.month !== entry.month), entry]
                    : existingCf;
                  merged = { ...merged,
                    cashflow: cfMerged,
                    plInputs: { ...(existing.plInputs||{}), ...(patch.plInputs||{}) },
                  };
                } else if (patch.type === "bank") {
                  merged = { ...merged,
                    bankStatement: { ...(existing.bankStatement||{}), ...(patch.bankStatement||{}) },
                    ...(patch.workingCapital ? { workingCapital: { ...(existing.workingCapital||{}), ...patch.workingCapital } } : {}),
                    ...(patch.plInputs ? { plInputs: { ...(existing.plInputs||{}), ...patch.plInputs } } : {}),
                  };
                }
                const { error } = await supabase.from("report_data")
                  .upsert({ client_id: selected.id, data: merged }, { onConflict:"client_id" });
                if (!error) {
                  setReportData(merged);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                } else {
                  alert("Save failed: " + error.message);
                }
              }}
              kpiMonth={kpiMonth}
              onKpiImport={async (kpiRow) => {
                if (!selected) return;
                const payload = { client_id:selected.id, month:kpiRow.month,
                  revenue:kpiRow.revenue, gross_margin:kpiRow.gross_margin,
                  cash_balance:kpiRow.cash_balance, burn_rate:kpiRow.burn_rate,
                  runway:kpiRow.runway, arr:kpiRow.arr };
                const { error } = await supabase.from("kpis")
                  .upsert(payload, { onConflict:"client_id,month" });
                if (!error) { setSaved(true); setTimeout(()=>setSaved(false),2500); }
                else alert("KPI save failed: " + error.message);
              }}
              C={C} F={F} FM={FM} saved={saved} loading={loading}
            />
          )}

          {/* ── UPDATE KPIs ── */}
          {tab === "kpis" && (
            <div style={{ maxWidth:900 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (
                <>
                {/* UAE client guidance banner */}
                {isUAE(selected) && (
                  <div style={{ padding:"12px 16px", borderRadius:16, background:"#E8F5EE",
                    border:"1px solid #86EFAC", marginBottom:16,
                    display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:18 }}>UAE</span>
                    <div style={{ fontFamily:F, fontSize:12, color:"#065f46", flex:1 }}>
                      <strong>UAE client selected</strong> — KPIs below are in AED.
                      For VAT, CT, QFZP, and reconciliation data go to the <strong>UAE Profile & Tax</strong> tab.
                      For cash forecasts and Garima notes go to <strong>💰 UAE Cash & Notes</strong>.
                    </div>
                    <button onClick={()=>setTab("uae")} style={{ padding:"6px 14px", borderRadius:16,
                      border:"none", background:"#00732F", color:"white",
                      fontFamily:F, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      Go to UAE Tab →
                    </button>
                  </div>
                )}
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text }}>
                        KPI Update — {selected.name}
                      </div>
                      {kpis.month && (
                        <div style={{ fontFamily:F, fontSize:11, color:C.blue, marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ background:`${C.blue}12`, padding:"2px 10px", borderRadius:60, fontWeight:700 }}>
                            Currently showing: {kpis.month}
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily:F, fontSize:11, color:saved?C.green:C.muted, fontWeight:saved?700:400 }}>
                      {saved ? "Saved to client portal" : "Unsaved changes"}
                    </span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:20 }}>
                    These numbers appear on the client's dashboard instantly after saving. Set the Month field to tell the client which period this covers.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Month" val={kpis.month} onChange={v=>setKpis(k=>({...k,month:v}))} placeholder="e.g. February 2026" />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }} className="kpi-edit-grid">
                    {(isUAE(selected) ? [
                      { label:"Revenue (AED)",        key:"revenue",      placeholder:"e.g. AED 1.85M"  },
                      { label:"Gross Margin",          key:"gross_margin", placeholder:"e.g. 45%"         },
                      { label:"Cash Balance (AED)",   key:"cash_balance", placeholder:"e.g. AED 620K"   },
                      { label:"Burn Rate (AED/mo)",   key:"burn_rate",    placeholder:"e.g. AED 75K/mo" },
                      { label:"Runway (months)",       key:"runway",       placeholder:"e.g. 8.3 mo"     },
                      { label:"VAT Payable (AED)",    key:"arr",          placeholder:"e.g. AED 92.5K"  },
                    ] : selected.client_pack === "msme" ? [
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
                </>
              )}
              <style>{`.kpi-edit-grid{grid-template-columns:1fr 1fr!important}@media(max-width:480px){.kpi-edit-grid{grid-template-columns:1fr!important}}`}</style>
            </div>
          )}
 
          {/* ── ACTION ITEMS ── */}
          {tab === "actions" && (
            <div style={{ maxWidth:900 }}>
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
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    <AdminSelect C={C} F={F} label="Priority" val={newAction.priority} onChange={v=>setNewAction(a=>({...a,priority:v}))}
                      options={[{value:"High",label:"High"},{value:"Medium",label:"Medium"},{value:"Low",label:"Low"}]}/>
                    <AdminInput C={C} F={F} FM={FM} label="Month" val={newAction.month} onChange={v=>setNewAction(a=>({...a,month:v}))} placeholder="e.g. March 2026"/>
                  </div>
                  <button onClick={addAction} style={{ padding:"10px 20px", borderRadius:16,
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
                        padding:"10px 14px", borderRadius:12, background:a.done?`${C.green}06`:C.bg,
                        border:`1px solid ${a.done?C.green+"25":C.border}` }}>
                        <div onClick={() => toggleAction(a)} style={{ width:20, height:20, borderRadius:16,
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
                          color:C.dim, cursor:"pointer", fontSize:16, padding:2 }}>×</button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>)}
            </div>
          )}
 
          {/* ── VALUATION ENGAGEMENT ── */}
          {tab === "engagement" && (
            <div style={{ maxWidth:900 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (
                <Card>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:20 }}>
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
                          style={{ padding:"7px 12px", borderRadius:16, border:"none", cursor:"pointer",
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
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                    <EmptyState icon="ti-receipt-off" title="No invoices yet" sub="Invoices will appear here once raised."/>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {invoices.map(inv => (
                      <div key={inv.id} style={{ padding:"14px 16px", borderRadius:12,
                        border:`1px solid ${inv.status==="paid" ? C.green+"30" : C.amber+"30"}`,
                        background: inv.status==="paid" ? `${C.green}04` : `${C.amber}04` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                          <div>
                            <div style={{ fontFamily:FM, fontSize:18, fontWeight:600, color:C.text }}>
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
                            <div style={{ fontFamily:FM, fontSize:12, fontWeight:700, color:"#374151" }}>
                              {inv.amount}
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => markInvoicePaid(inv)}
                                style={{ padding:"5px 12px", borderRadius:16, border:"none", cursor:"pointer",
                                  fontFamily:F, fontSize:11, fontWeight:700,
                                  background: inv.status==="paid" ? `${C.green}15` : `${C.amber}15`,
                                  color: inv.status==="paid" ? C.green : C.amber }}>
                                {inv.status==="paid" ? "Paid ✓" : "Mark Paid"}
                              </button>
                              <button onClick={() => deleteInvoice(inv.id)}
                                style={{ padding:"5px 10px", borderRadius:16, border:`1px solid ${C.border}`,
                                  background:"none", color:C.red, cursor:"pointer", fontSize:13 }}>
                                ×
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
            <div style={{ maxWidth:900 }}>
              {!selected || !reportData ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
 
 
 
                {/* ══ 1: MONTH LABEL ═══════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-calendar" style={{fontSize:16,color:C.blue}}/> Month Label</div>
                    {reportData?.monthLabel && (
                      <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                        background:`${C.blue}12`, padding:"3px 12px", borderRadius:60 }}>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Previous Month KPI Values</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    Powers the <strong>▲ ▼ trend arrows</strong> and "Prev: …" text on the client dashboard.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>P&L Inputs</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates <strong>{isUAE(selected)?"UAE CFO Report → Dashboard":"Monthly Report → P&L Summary"}</strong>. "Actual" = this month. "Prev" = last month.
                    Use format like <code style={{ background:"#fff", padding:"1px 6px", borderRadius:12, fontFamily:FM }}>{isUAE(selected)?"AED 1.85M":"₹84.2L"}</code>
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"150px 1fr 1fr", gap:10, marginBottom:8, paddingLeft:4 }}>
                    <div/>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.07em" }}>This Month (Actual)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prev Month</div>
                  </div>
                  {(isUAE(selected) ? [
                    { label:"Revenue",          key:"revenue",      placeholder:"e.g. AED 1.85M", bold:false },
                    { label:"COGS",             key:"cogs",         placeholder:"e.g. AED 1.02M", bold:false },
                    { label:"Gross Profit",     key:"grossProfit",  placeholder:"e.g. AED 832K",  bold:true  },
                    { label:"GP Margin %",      key:"gpMargin",     placeholder:"e.g. 45.0%",     bold:false, dim:true },
                    { label:"EBITDA",           key:"ebitda",       placeholder:"e.g. AED 407K",  bold:true  },
                    { label:"EBITDA Margin %",  key:"ebitdaMargin", placeholder:"e.g. 22.0%",     bold:false, dim:true },
                    { label:"Net Profit / PAT", key:"pat",          placeholder:"e.g. AED 271K",  bold:true  },
                    { label:"Net Margin %",     key:"netMargin",    placeholder:"e.g. 14.6%",     bold:false, dim:true },
                  ] : [
                    { label:"Revenue",          key:"revenue",      placeholder:"e.g. ₹84.2L", bold:false },
                    { label:"COGS",             key:"cogs",         placeholder:"e.g. ₹49.7L", bold:false },
                    { label:"Gross Profit",     key:"grossProfit",  placeholder:"e.g. ₹34.5L", bold:true  },
                    { label:"GP Margin %",      key:"gpMargin",     placeholder:"e.g. 41.0%",  bold:false, dim:true },
                    { label:"EBITDA",           key:"ebitda",       placeholder:"e.g. ₹14.7L", bold:true  },
                    { label:"EBITDA Margin %",  key:"ebitdaMargin", placeholder:"e.g. 17.5%",  bold:false, dim:true },
                    { label:"Net Profit / PAT", key:"pat",          placeholder:"e.g. ₹10.2L", bold:true  },
                    { label:"Net Margin %",     key:"netMargin",    placeholder:"e.g. 12.1%",  bold:false, dim:true },
                  ]).map(row => (
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Variance Analysis — Budget vs Actual</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>Variance Analysis tab</strong> in the client's report. Variance auto-calculates. Toggle ✅/⚠️ per line.
                  </p>
                  <div style={{ overflowX:"auto", marginBottom:20 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:F }}>
                      <thead>
                        <tr style={{ background:C.text }}>
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
                                  style={{ padding:"5px 12px", borderRadius:16, border:"none", cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:700,
                                    background:row.fav?`${C.green}15`:`${C.red}15`, color:row.fav?C.green:C.red }}>
                                  {row.fav?"Fav":"Unfav"}
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
                      <span style={{display:"flex",alignItems:"center",gap:8}}><i className="ti ti-notes" style={{fontSize:15,color:C.blue}}/>Variance Commentary — 3 key points shown in client report</span>
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
                            style={{ padding:"8px 10px", borderRadius:16, border:"none", cursor:"pointer", fontSize:14, fontWeight:700,
                              background:row.favorable?`${C.green}15`:`${C.red}15`, color:row.favorable?C.green:C.red }}>
                            {row.favorable?"✅":"⚠️"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
 
                {/* ══ 5: WORKING CAPITAL & AR ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Working Capital & Cash Conversion</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Drives the <strong>Cash Flow → Working Capital positions</strong> bar and the <strong>Working Capital tab</strong> in the client report.
                  </p>

                  {/* Days metrics */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Days Metrics</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Debtor Days" val={reportData.debtorDays||""} onChange={v=>setReportData(r=>({...r,debtorDays:v}))} placeholder="e.g. 46" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Creditor Days" val={reportData.creditorDays||""} onChange={v=>setReportData(r=>({...r,creditorDays:v}))} placeholder="e.g. 31" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Inventory Days" val={reportData.inventoryDays||""} onChange={v=>setReportData(r=>({...r,inventoryDays:v}))} placeholder="e.g. 22" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Cash Conversion Cycle (CCC)" val={reportData.ccc||""} onChange={v=>setReportData(r=>({...r,ccc:v}))} placeholder="e.g. 37 days" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Working Capital (total)" val={reportData.workingCapital||""} onChange={v=>setReportData(r=>({...r,workingCapital:v}))} placeholder="e.g. ₹32.4L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Cash Freed if CCC ↓5d" val={reportData.cccCashImpact||""} onChange={v=>setReportData(r=>({...r,cccCashImpact:v}))} placeholder="e.g. ₹2.8L" mono/>
                  </div>

                  {/* Raw debtors/creditors for ratio calc */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Balance Sheet Figures (for auto-ratio calc)</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Debtors (AR total)" val={reportData.debtors||""} onChange={v=>setReportData(r=>({...r,debtors:v}))} placeholder="e.g. ₹38.2L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Creditors (AP total)" val={reportData.creditors||""} onChange={v=>setReportData(r=>({...r,creditors:v}))} placeholder="e.g. ₹21.4L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Inventory" val={reportData.inventory||""} onChange={v=>setReportData(r=>({...r,inventory:v}))} placeholder="e.g. ₹18.6L" mono/>
                  </div>

                  {/* Working capital ratios */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Working Capital Ratios (shown in WC tab)</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Current Ratio" val={reportData.currentRatio||""} onChange={v=>setReportData(r=>({...r,currentRatio:v}))} placeholder="e.g. 1.62x" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Quick Ratio" val={reportData.quickRatio||""} onChange={v=>setReportData(r=>({...r,quickRatio:v}))} placeholder="e.g. 1.18x" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Inventory Turnover" val={reportData.invTurnover||""} onChange={v=>setReportData(r=>({...r,invTurnover:v}))} placeholder="e.g. 6.2x" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Debtor Turnover" val={reportData.debtorTurn||""} onChange={v=>setReportData(r=>({...r,debtorTurn:v}))} placeholder="e.g. 7.8x" mono/>
                  </div>

                  {/* AR Aging */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Debtors Aging Buckets</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    <AdminInput C={C} F={F} FM={FM} label="0–30 Days" val={reportData.ar0to30||""} onChange={v=>setReportData(r=>({...r,ar0to30:v}))} placeholder="e.g. ₹18.2L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="31–60 Days" val={reportData.ar31to60||""} onChange={v=>setReportData(r=>({...r,ar31to60:v}))} placeholder="e.g. ₹12.4L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="61–90 Days" val={reportData.ar61to90||""} onChange={v=>setReportData(r=>({...r,ar61to90:v}))} placeholder="e.g. ₹4.8L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="90+ Days" val={reportData.ar90plus||""} onChange={v=>setReportData(r=>({...r,ar90plus:v}))} placeholder="e.g. ₹2.9L" mono/>
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="AR Note (shown under aging table)" val={reportData.arNote||""} onChange={v=>setReportData(r=>({...r,arNote:v}))} placeholder="e.g. Client B ₹4.8L crossed 90 days — chase before 15 March." multiline/>
                  <AdminInput C={C} F={F} FM={FM} label="Garima's Working Capital Assessment (shown in WC tab)" val={reportData.wcNote||""} onChange={v=>setReportData(r=>({...r,wcNote:v}))} placeholder="Write your working capital commentary here…" multiline/>
                </Card>

                {/* ══ 6: BANK FINANCE READINESS ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Bank Finance Readiness</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Drives the <strong>Bank Finance / Loan Readiness tab</strong>. Loan score appears as a gauge (0–100).
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Loan Readiness Score (0–100)" val={reportData.loanScore||""} onChange={v=>setReportData(r=>({...r,loanScore:v}))} placeholder="e.g. 72" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="DSCR" val={reportData.dscr||""} onChange={v=>setReportData(r=>({...r,dscr:v}))} placeholder="e.g. 2.1x" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Interest Coverage" val={reportData.interestCoverage||""} onChange={v=>setReportData(r=>({...r,interestCoverage:v}))} placeholder="e.g. 4.2x" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Existing Debt" val={reportData.existingDebt||""} onChange={v=>setReportData(r=>({...r,existingDebt:v}))} placeholder="e.g. ₹42L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Interest Cost (monthly)" val={reportData.interestCost||""} onChange={v=>setReportData(r=>({...r,interestCost:v}))} placeholder="e.g. ₹3.5L" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Collateral Available" val={reportData.collateral||""} onChange={v=>setReportData(r=>({...r,collateral:v}))} placeholder="e.g. ₹1.2 Cr" mono/>
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="Loan Eligibility Note (shown below score)" val={reportData.loanNote||""} onChange={v=>setReportData(r=>({...r,loanNote:v}))} placeholder="e.g. Eligible for CGTMSE-backed term loan up to ₹2 Cr at ~9.5% given current DSCR." multiline/>
                </Card>

                {/* ══ EXISTING: CASH FLOW DATA ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    <span style={{display:"flex",alignItems:"center",gap:8}}><i className="ti ti-trending-up" style={{fontSize:16,color:C.blue}}/>Cash Flow Chart Data</span>
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
                            <td style={{ padding:"8px 10px", fontFamily:FM, fontSize:18, fontWeight:600, color:C.text, width:80 }}>{row.month}</td>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                    <i className="ti ti-target" style={{fontSize:15,color:C.blue}}/>{selected.client_pack==="startup"?"Fundraise":selected.client_pack==="msme"?"Cash Health":"IPO Readiness"} Score
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Overall score (0–100) shown as the big gauge on the client's report page.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Overall Score (0-100)" val={reportData.score || ""}
                    onChange={v => setReportData(r=>({...r,score:v}))} placeholder="e.g. 72" mono/>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:10, marginTop:4 }}>Score Breakdown</div>
                  {(reportData.scoreBreakdown || []).map((item, i) => (
                    <div key={i} style={{ marginBottom:12, padding:"12px 14px", borderRadius:12, background:C.bg, border:`1px solid ${C.border}` }}>
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
                  <Card style={{ marginBottom:14, border:`1px solid ${C.blue}25`, background:`${C.blue}04` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>Loan Readiness Score</div>
                      {reportData?.loanScore && (
                        <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue,
                          background:`${C.blue}12`, padding:"3px 12px", borderRadius:60 }}>
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
                      <div style={{ padding:"12px 14px", borderRadius:12, background:C.bg, border:`1px solid ${C.border}` }}>
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
                  <Card style={{ marginBottom:14, border:`1px solid ${C.teal}20`, background:`${C.teal}03` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                      📐 Debt & Financial Ratios
                    </div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                      These ratios appear in the client's Cash Health / Board Report and are included in the downloadable PDF report.
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                      <div>
                        <AdminInput C={C} F={F} FM={FM} label="DSCR (Debt Service Coverage)"
                          val={reportData.dscr || ""}
                          onChange={v => setReportData(r => ({...r, dscr:v}))}
                          placeholder="e.g. 2.1x" mono/>
                      </div>
                      <div>
                        <AdminInput C={C} F={F} FM={FM} label="Interest Coverage Ratio"
                          val={reportData.interestCoverage || ""}
                          onChange={v => setReportData(r => ({...r, interestCoverage:v}))}
                          placeholder="e.g. 4.2x" mono/>
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
                  <Card style={{ marginBottom:14, border:`1px solid ${C.teal}20`, background:`${C.teal}04` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Unit Economics"}</div>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"KPI Benchmarks"}</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    {"Override the default sector benchmarks shown under each KPI card. Leave blank to use the built-in defaults."}
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Working Capital Data"}</div>
                    <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                      {"Shown on Working Capital tab — AR aging, CCC components, ratios."}
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
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
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-scale" style={{fontSize:15,color:C.blue}}/>Board Governance Data</div>
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
                            style={{ width:"100%", padding:"8px 10px", borderRadius:16,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">Done</option>
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
                            style={{ width:"100%", padding:"8px 10px", borderRadius:16,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">Compliant</option>
                            <option value="review">Needs Review</option>
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
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Board Monthly Highlights"}</div>
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
                            style={{ width:"100%", padding:"8px 10px", borderRadius:16,
                              border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:F, fontSize:12 }}>
                            <option value="done">Done</option>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-table" style={{fontSize:15,color:C.blue}}/>Key Metrics Table</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Investor metrics / working capital ratios shown in the client's pack.
                  </p>
                  {(reportData.metrics || []).map((m, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr auto", gap:8,
                      alignItems:"center", marginBottom:8, padding:"8px 12px", borderRadius:16,
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
                      }} style={{ padding:"7px 10px", borderRadius:16, border:"none", cursor:"pointer",
                        background:m.flag?`${C.red}15`:`${C.green}15`,
                        color:m.flag?C.red:C.green, fontSize:12, fontWeight:700, fontFamily:F, whiteSpace:"nowrap" }}>
                        {m.flag?"⚠️ Flag":"✅ OK"}
                      </button>
                    </div>
                  ))}
                </Card>
 
                {/* ══ EXISTING: CHECKLIST ═══════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                    <i className="ti ti-checklist" style={{fontSize:15,color:C.blue}}/>{selected.client_pack==="corporate"?"Compliance Checklist":"Due Diligence Checklist"}
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Tick items as the client completes/provides them. Shown on their report page.
                  </p>
                  {(reportData.checklist || []).map((item, i) => (
                    <div key={i} onClick={() => {
                      const cl=[...reportData.checklist]; cl[i]={...cl[i],done:!cl[i].done};
                      setReportData(r=>({...r,checklist:cl}));
                    }} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                      borderRadius:16, marginBottom:8, cursor:"pointer",
                      background:item.done?`${C.green}06`:C.bg,
                      border:`1px solid ${item.done?C.green+"25":C.border}` }}>
                      <div style={{ width:22, height:22, borderRadius:16, flexShrink:0,
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Market Benchmarks</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown in the market benchmarks table on the client's dashboard.
                  </p>
                  {(reportData.benchmarks || []).map((b, i) => (
                    <div key={i} style={{ marginBottom:10, padding:"10px 14px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}` }}>
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
                        }} style={{ padding:"7px 10px", borderRadius:16, border:"none", cursor:"pointer",
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Garima's Monthly Note</div>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-message" style={{fontSize:15,color:C.blue}}/>Cash Flow Forecast Note (from Garima)</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.6 }}>
                    Shown <strong>at the very top</strong> of the client's <strong>Cash Flow Forecast</strong> page — this is Garima's forward-looking insight. Write about upcoming projections, not past performance.
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"3-Month Forward View"}</div>
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
                          style={{ padding:"8px 10px", borderRadius:16, border:`1px solid ${C.border}`,
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Board Executive Summary"}</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
                    {"One paragraph each — shown in the downloadable Board Executive Summary PDF. Write in plain English as if briefing a board member."}
                  </p>
                  {[
                    { key:"execPerformance",   label:"Performance",      placeholder:"e.g. Revenue grew 6% MoM to ₹84L — tracking ahead of Q4 plan. Gross margin improved to 41% as COGS optimisation begins to reflect. EBITDA positive for second consecutive month." },
                    { key:"execCash",          label:"Cash & Liquidity",  placeholder:"e.g. Cash position at ₹2.1 Cr with 4.4 months runway. March will see pressure from advance tax (₹22L) and delayed Client B collection. April outlook is positive." },
                    { key:"execRisks",         label:"Key Risks",         placeholder:"e.g. (1) Runway below 6 months — fundraise urgently. (2) Client B overdue ₹4.8L at 90+ days. (3) Burn multiple at 1.8x — above Series A benchmark." },
                    { key:"execOpportunities", label:"Opportunities",     placeholder:"e.g. (1) SBI Startup Branch intro secured — loan application ready. (2) SIES Incubator partnership in progress — 5 potential clients. (3) EBITDA margin improving — profitability within reach." },
                    { key:"execNextSteps",     label:"Next Steps",        placeholder:"e.g. (1) Close Client B collection by 15 Mar. (2) File GSTR-3B by 20 Mar. (3) Submit SBI loan application by 31 Mar. (4) Begin Series A deck preparation." },
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
                  <Card style={{ marginBottom:14, border:`1px solid ${C.red}20`, background:`${C.red}04` }}>
                    <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{"Upcoming Cash Pressure Points"}</div>
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
                {reportData && <Card style={{ marginBottom:14, border:`1px solid ${C.teal}20`, background:`${C.teal}04` }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    {"Raw Inputs — Ratios Auto-Calculate"}
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
 
                                    <div style={{ padding:"10px 14px", borderRadius:16,
                    background:`${C.teal}08`, border:`1px solid ${C.teal}20`,
                    fontFamily:F, fontSize:12, color:C.teal }}>
                    {"Ratios auto-calculate when you click Generate Analysis below"}
                  </div>
                </Card>}
 
                {/* ══ AI ANALYSIS GENERATOR ══════════════════════════════════ */}
                {reportData && <Card style={{ marginBottom:14, border:`1.5px solid ${C.purple}30`,
                  background:`linear-gradient(135deg,${C.purple}06,${C.blue}04)` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:36, height:36, borderRadius:16,
                      background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                      <i className="ti ti-sparkles" style={{fontSize:18,color:"#fff"}}/>
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
                    style={{ width:"100%", padding:"12px", borderRadius:16, border:"none",
                      background: aiGenerating
                        ? C.bg3
                        : `linear-gradient(135deg,${C.purple},${C.blue})`,
                      color: aiGenerating ? C.muted : "white",
                      fontFamily:F, fontWeight:700, fontSize:14, cursor: aiGenerating ? "not-allowed" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                      marginBottom: aiDraft || aiError ? 16 : 0 }}>
                    {aiGenerating
                      ? <><span>⟳</span>{" Analysing numbers..."}</>
                      : "Generate Analysis Draft"
                    }
                  </button>
 
                  {aiError && (
                    <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.red}10`,
                      border:`1px solid ${C.red}20`, fontFamily:F, fontSize:12, color:C.red }}>
                      {aiError}
                    </div>
                  )}
 
                  {aiDraft && (
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text,
                        marginBottom:12 }}>
                        {"Draft ready — review and apply"}
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
                        <div key={i} style={{ marginBottom:10, padding:"12px 14px", borderRadius:16,
                          background:C.bg, border:`1px solid ${C.border}` }}>
                          <div style={{ display:"flex", alignItems:"center",
                            justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontFamily:F, fontSize:11, fontWeight:700,
                              color:C.purple, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                              {f.label}
                            </span>
                            <button onClick={() => applyDraft(f.field)}
                              style={{ padding:"3px 12px", borderRadius:60, border:"none",
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
                          style={{ flex:1, padding:"11px", borderRadius:16, border:"none",
                            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                            color:"white", fontFamily:F, fontWeight:700, fontSize:13,
                            cursor:"pointer" }}>
                          {"Apply All & Save"}
                        </button>
                        <button onClick={() => setAiDraft(null)}
                          style={{ padding:"11px 16px", borderRadius:16,
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
 
          {/* ── UAE / TAX ── */}
          {tab === "uae" && (
            <div style={{ maxWidth:900 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a UAE client from the sidebar first</div>
                </Card>
              ) : !isUAE(selected) ? (
                <Card style={{ textAlign:"center", padding:40, background:"#FFFBEB", border:"1px solid #FCD34D" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>India</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.warning, fontWeight:600 }}>
                    Selected client is an India client
                  </div>
                  <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:8 }}>
                    Switch to a UAE or Cross-Border client to edit UAE/Tax data.
                  </p>
                </Card>
              ) : (<>
 
                {/* Client UAE Profile */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>UAE Client Profile</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Update jurisdiction settings and tax registration details.
                  </p>
                  <AdminSelect C={C} F={F} label="Free Zone" val={selected.freezone||"DMCC"}
                    onChange={async v => {
                      await supabase.from("clients").update({ freezone:v }).eq("id", selected.id);
                      setSelected(s=>({...s,freezone:v}));
                    }}
                    options={[
                      {value:"DMCC",  label:"DMCC — Dubai Multi Commodities Centre"},
                      {value:"JAFZA", label:"JAFZA — Jebel Ali Free Zone"},
                      {value:"ADGM",  label:"ADGM — Abu Dhabi Global Market"},
                      {value:"DIFC",  label:"DIFC — Dubai Int'l Financial Centre"},
                      {value:"RAK",   label:"RAKEZ — RAK Economic Zone"},
                      {value:"Other", label:"Other / Mainland"},
                    ]}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="VAT TRN"
                      val={selected.trnVAT||""} placeholder="e.g. 100345678900003" mono
                      onChange={async v => {
                        await supabase.from("clients").update({ trnVAT:v }).eq("id", selected.id);
                        setSelected(s=>({...s,trnVAT:v}));
                      }}/>
                    <AdminInput C={C} F={F} FM={FM} label="CT TRN"
                      val={selected.trnCT||""} placeholder="e.g. 900012345678901" mono
                      onChange={async v => {
                        await supabase.from("clients").update({ trnCT:v }).eq("id", selected.id);
                        setSelected(s=>({...s,trnCT:v}));
                      }}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
                    <AdminSelect C={C} F={F} label="VAT Registered?"
                      val={selected.vatRegistered?"yes":"no"}
                      onChange={async v => {
                        const val = v==="yes";
                        await supabase.from("clients").update({ vatRegistered:val }).eq("id", selected.id);
                        setSelected(s=>({...s,vatRegistered:val}));
                      }}
                      options={[{value:"yes",label:"✅ Yes"},{value:"no",label:"❌ No"}]}/>
                    <AdminSelect C={C} F={F} label="QFZP Status?"
                      val={selected.qfzpStatus?"yes":"no"}
                      onChange={async v => {
                        const val = v==="yes";
                        await supabase.from("clients").update({ qfzpStatus:val }).eq("id", selected.id);
                        setSelected(s=>({...s,qfzpStatus:val}));
                      }}
                      options={[{value:"yes",label:"✅ Active"},{value:"no",label:"❌ No"}]}/>
                    <AdminSelect C={C} F={F} label="SBR Eligible?"
                      val={selected.sbrEligible?"yes":"no"}
                      onChange={async v => {
                        const val = v==="yes";
                        await supabase.from("clients").update({ sbrEligible:val }).eq("id", selected.id);
                        setSelected(s=>({...s,sbrEligible:val}));
                      }}
                      options={[{value:"yes",label:"✅ Eligible"},{value:"no",label:"❌ No"}]}/>
                  </div>
                  <AdminSelect C={C} F={F} label="Financial Year End"
                    val={selected.financialYearEnd||"31 Dec"}
                    onChange={async v => {
                      await supabase.from("clients").update({ financialYearEnd:v }).eq("id", selected.id);
                      setSelected(s=>({...s,financialYearEnd:v}));
                    }}
                    options={[
                      {value:"31 Dec", label:"31 December (Calendar Year)"},
                      {value:"31 Mar", label:"31 March (India-aligned)"},
                    ]}/>
                </Card>
 
                {/* VAT Data */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-receipt" style={{fontSize:15,color:C.blue}}/>VAT Dashboard Data</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the client's VAT Dashboard tab.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Output VAT (AED)" val={reportData?.vat?.outputVAT||""}
                      onChange={v=>setReportData(r=>({...r,vat:{...(r.vat||{}),outputVAT:Number(v)||v}}))} placeholder="e.g. 185000" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Input VAT (AED)" val={reportData?.vat?.inputVAT||""}
                      onChange={v=>setReportData(r=>({...r,vat:{...(r.vat||{}),inputVAT:Number(v)||v}}))} placeholder="e.g. 92500" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="VAT Payable (AED)" val={reportData?.vat?.vatPayable||""}
                      onChange={v=>setReportData(r=>({...r,vat:{...(r.vat||{}),vatPayable:Number(v)||v}}))} placeholder="e.g. 92500" mono/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Filing Period" val={reportData?.vat?.filingPeriod||""}
                      onChange={v=>setReportData(r=>({...r,vat:{...(r.vat||{}),filingPeriod:v}}))} placeholder="e.g. Q1 2026 (Jan–Mar)"/>
                    <AdminInput C={C} F={F} FM={FM} label="Next Deadline" val={reportData?.vat?.nextDeadline||""}
                      onChange={v=>setReportData(r=>({...r,vat:{...(r.vat||{}),nextDeadline:v}}))} placeholder="e.g. 28 Apr 2026"/>
                  </div>
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima — VAT (shown on client VAT tab)"
                    val={reportData?.vatGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,vatGarimaNote:v}))}
                    placeholder="e.g. Your Q1 VAT return of AED 92.5K is due 28 April. Ensure funds are ring-fenced now."
                    multiline/>
                </Card>

                {/* VAT Filing History */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                    <i className="ti ti-calendar-due" style={{fontSize:15,color:C.blue}}/>VAT Filing History
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>Returns</strong> tab on the client's VAT Dashboard. Enter up to 4 recent quarters.
                  </p>
                  {[0,1,2,3].map(i => {
                    const row = reportData?.vat?.pendingReturns?.[i] || {};
                    const upd = (key,val) => setReportData(r => {
                      const arr = [...(r.vat?.pendingReturns || [{},{},{},{}])];
                      while(arr.length <= i) arr.push({});
                      arr[i] = {...arr[i], [key]:val};
                      return {...r, vat:{...(r.vat||{}), pendingReturns:arr}};
                    });
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:10, marginBottom:8,
                        padding:"10px 12px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                        <AdminInput C={C} F={F} FM={FM} label={`Period ${i+1}`} val={row.period||""}
                          onChange={v=>upd("period",v)} placeholder="e.g. Q1 2026 (Jan–Mar)"/>
                        <AdminInput C={C} F={F} FM={FM} label="Due Date" val={row.due||""}
                          onChange={v=>upd("due",v)} placeholder="e.g. 28 Apr 2026"/>
                        <AdminSelect C={C} F={F} label="Status" val={row.status||"Filed"}
                          onChange={v=>upd("status",v)}
                          options={[{value:"Filed",label:"Filed"},{value:"Due",label:"Due"},{value:"Overdue",label:"Overdue"}]}/>
                        <AdminInput C={C} F={F} FM={FM} label="VAT Net (AED)" val={row.vatNet||""}
                          onChange={v=>upd("vatNet",v)} placeholder="e.g. AED 92,500" mono/>
                      </div>
                    );
                  })}
                </Card>

                {/* VAT Cash Impact */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                    <i className="ti ti-chart-bar" style={{fontSize:15,color:C.blue}}/>VAT Cash Impact (Monthly)
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>Cash Impact</strong> chart on the client's VAT Dashboard. Leave Collected/Paid blank for future months and enter Forecast instead.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 1fr 1fr", gap:8, marginBottom:6 }}>
                    {["Month","Collected (AED)","Paid (AED)","Net (AED)","Forecast (AED)"].map(h => (
                      <div key={h} style={{ fontFamily:F, fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
                    ))}
                  </div>
                  {[0,1,2,3,4,5,6].map(i => {
                    const row = reportData?.vat?.cashImpact?.[i] || {};
                    const upd = (key,val) => setReportData(r => {
                      const arr = [...(r.vat?.cashImpact || [{},{},{},{},{},{},{}])];
                      while(arr.length <= i) arr.push({});
                      arr[i] = {...arr[i], [key]: val === "" ? null : Number(val)||null};
                      return {...r, vat:{...(r.vat||{}), cashImpact:arr}};
                    });
                    const updMonth = val => setReportData(r => {
                      const arr = [...(r.vat?.cashImpact || [{},{},{},{},{},{},{}])];
                      while(arr.length <= i) arr.push({});
                      arr[i] = {...arr[i], month:val};
                      return {...r, vat:{...(r.vat||{}), cashImpact:arr}};
                    });
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 1fr 1fr", gap:8, marginBottom:6 }}>
                        <AdminInput C={C} F={F} FM={FM} label="" val={row.month||""} onChange={updMonth} placeholder="Jan"/>
                        <AdminInput C={C} F={F} FM={FM} label="" val={row.collected != null ? row.collected : ""} onChange={v=>upd("collected",v)} placeholder="62000" mono/>
                        <AdminInput C={C} F={F} FM={FM} label="" val={row.paid != null ? row.paid : ""} onChange={v=>upd("paid",v)} placeholder="28000" mono/>
                        <AdminInput C={C} F={F} FM={FM} label="" val={row.net != null ? row.net : ""} onChange={v=>upd("net",v)} placeholder="34000" mono/>
                        <AdminInput C={C} F={F} FM={FM} label="" val={row.forecast != null ? row.forecast : ""} onChange={v=>upd("forecast",v)} placeholder="future only" mono/>
                      </div>
                    );
                  })}
                </Card>

                {/* CT Data */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-building-bank" style={{fontSize:15,color:C.blue}}/>Corporate Tax Data</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the client's Corporate Tax tab.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Revenue (AED)" val={reportData?.ct?.revenue||""}
                      onChange={v=>setReportData(r=>({...r,ct:{...(r.ct||{}),revenue:Number(v)||v}}))} placeholder="e.g. 1850000" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Accounting Profit (AED)" val={reportData?.ct?.taxableIncome||""}
                      onChange={v=>setReportData(r=>({...r,ct:{...(r.ct||{}),taxableIncome:Number(v)||v}}))} placeholder="e.g. 271000" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Qualifying Income %" val={reportData?.ct?.qualifyingPct||""}
                      onChange={v=>setReportData(r=>({...r,ct:{...(r.ct||{}),qualifyingPct:Number(v)||v}}))} placeholder="e.g. 92" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Non-Qualifying Income %" val={reportData?.ct?.nonQualifyingPct||""}
                      onChange={v=>setReportData(r=>({...r,ct:{...(r.ct||{}),nonQualifyingPct:Number(v)||v}}))} placeholder="e.g. 8" mono/>
                  </div>
                  {/* CT Tax Reconciliation Adjustments */}
                  <div style={{ marginTop:20, marginBottom:8, fontFamily:F, fontWeight:700, fontSize:12, color:C.text }}>
                    CT Tax Reconciliation Adjustments <span style={{ fontWeight:400, color:C.muted }}>(shown on Tax Recon tab)</span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:11, color:C.muted, marginBottom:10, lineHeight:1.5 }}>
                    Each line: description, amount (AED), sign. Use + for add-backs, − for deductions.
                  </p>
                  {[0,1,2,3,4].map(i => {
                    const adj = reportData?.ct?.adjustments?.[i] || {};
                    const updAdj = (key,val) => setReportData(r => {
                      const arr = [...(r.ct?.adjustments || [{},{},{},{},{}])];
                      while(arr.length <= i) arr.push({});
                      arr[i] = {...arr[i], [key]:val};
                      return {...r, ct:{...(r.ct||{}), adjustments:arr}};
                    });
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"3fr 1fr 80px", gap:8, marginBottom:6,
                        padding:"8px 10px", borderRadius:10, background:C.bg, border:`1px solid ${C.border}` }}>
                        <AdminInput C={C} F={F} FM={FM} label={`Line ${i+1} — Description`} val={adj.item||""}
                          onChange={v=>updAdj("item",v)}
                          placeholder={i===0?"e.g. Accounting Profit (per audited FS)":i===1?"e.g. Add: Non-deductible entertainment expenses":i===2?"e.g. Less: Exempt dividend income":i===3?"e.g. Less: QFZP qualifying income":"e.g. Other adjustment"}/>
                        <AdminInput C={C} F={F} FM={FM} label="Amount (AED)" val={adj.amount != null ? adj.amount : ""} mono
                          onChange={v=>updAdj("amount",Number(v)||0)} placeholder="e.g. 12400"/>
                        <AdminSelect C={C} F={F} label="Sign" val={String(adj.sign ?? 1)}
                          onChange={v=>updAdj("sign",Number(v))}
                          options={[{value:"1",label:"+ Add"},{value:"-1",label:"− Less"}]}/>
                      </div>
                    );
                  })}
                  <div style={{ marginTop:16, marginBottom:4, fontFamily:"system-ui", fontWeight:700, fontSize:12, color:"#6B7280" }}>CT Substance Checklist (shown on CT Overview)</div>
                  {[
                    { key:"employees",   label:"Adequate employees in free zone" },
                    { key:"opex",        label:"Adequate operating expenditure" },
                    { key:"presence",    label:"Physical presence in free zone" },
                    { key:"ciga",        label:"Core income-generating activities" },
                    { key:"auditedFS",   label:"Audited financial statements" },
                  ].map(item => (
                    <div key={item.key} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontFamily:"system-ui", fontSize:13, color:C.text, flex:1 }}>{item.label}</span>
                      <AdminSelect C={C} F={F} label=""
                        val={String(reportData?.ct?.substanceItems?.[item.key] ?? "false")}
                        onChange={v=>setReportData(r=>({...r,ct:{...(r.ct||{}),substanceItems:{...(r.ct?.substanceItems||{}), [item.key]:v==="true"}}}))}
                        options={[{val:"true",label:"✅ Done"},{val:"false",label:"⬜ Pending"}]}/>
                    </div>
                  ))}
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima — CT (shown on client CT tab)"
                    val={reportData?.ctGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,ctGarimaNote:v}))}
                    placeholder="e.g. With QFZP status, your effective CT rate is 0%. Ensure audited FS are submitted to DMCC by 30 April."
                    multiline/>
                </Card>
 
                {/* QFZP Score */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-building-community" style={{fontSize:15,color:C.blue}}/>QFZP Compliance Score</div>
                  <AdminInput C={C} F={F} FM={FM} label="QFZP Score (0–100)" val={reportData?.qfzp?.qfzpScore||""}
                    onChange={v=>setReportData(r=>({...r,qfzp:{...(r.qfzp||{}),qfzpScore:Number(v)||v}}))} placeholder="e.g. 82" mono/>
                  <AdminInput C={C} F={F} FM={FM} label="Audit Readiness Score (0–100)" val={reportData?.auditReadiness?.auditScore||""}
                    onChange={v=>setReportData(r=>({...r,auditReadiness:{...(r.auditReadiness||{}),auditScore:Number(v)||v}}))} placeholder="e.g. 65" mono/>
                </Card>
 
                {/* ── NEW: QFZP SUBSTANCE ADMIN ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                    <i className="ti ti-building-community" style={{fontSize:15,color:C.blue}}/>QFZP Substance Tracker
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Track all 5 substance pillars for QFZP compliance. Used in the Substance Tracker page and downloadable PDF.
                  </p>
 
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Period"
                      val={reportData?.qfzpSubstance?.period||""}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),period:v}}))}
                      placeholder="e.g. FY 2025"/>
                    <AdminInput C={C} F={F} FM={FM} label="Overall Score (0–100)" mono
                      val={reportData?.qfzpSubstance?.overallScore||""}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),overallScore:Number(v)||v}}))}
                      placeholder="e.g. 82"/>
                    <AdminSelect C={C} F={F} label="Audited FS Submitted?"
                      val={reportData?.qfzpSubstance?.auditSubmitted?"yes":"no"}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),auditSubmitted:v==="yes"}}))}
                      options={[{value:"no",label:"❌ No — Action Required"},{value:"yes",label:"✅ Yes — Submitted"}]}/>
                  </div>
 
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Employee Count" mono
                      val={reportData?.qfzpSubstance?.employeeCount||""}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),employeeCount:v}}))}
                      placeholder="e.g. 5"/>
                    <AdminInput C={C} F={F} FM={FM} label="Annual OpEx (AED)" mono
                      val={reportData?.qfzpSubstance?.opexAED||""}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),opexAED:v}}))}
                      placeholder="e.g. 412000"/>
                    <AdminInput C={C} F={F} FM={FM} label="Office Size (sq ft)" mono
                      val={reportData?.qfzpSubstance?.officeSqft||""}
                      onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),officeSqft:v}}))}
                      placeholder="e.g. 1200"/>
                  </div>
 
                  {/* CIGA rows */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text,
                    margin:"14px 0 10px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    CIGA — Income Activities (qualifying vs non-qualifying)
                  </div>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`,
                      borderRadius:16, padding:20, marginBottom:8 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr", gap:8 }}>
                        <AdminInput C={C} F={F} FM={FM} label={`Activity ${i+1}`}
                          val={reportData?.qfzpSubstance?.cigas?.[i]?.activity||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.qfzpSubstance?.cigas)||[{},{},{},{}])];
                            arr[i]={...arr[i],activity:v};
                            return {...r,qfzpSubstance:{...(r.qfzpSubstance||{}),cigas:arr}};
                          })}
                          placeholder="e.g. Trading — sourcing & distribution"/>
                        <AdminInput C={C} F={F} FM={FM} label="% of Revenue" mono
                          val={reportData?.qfzpSubstance?.cigas?.[i]?.pct||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.qfzpSubstance?.cigas)||[{},{},{},{}])];
                            arr[i]={...arr[i],pct:Number(v)||0};
                            return {...r,qfzpSubstance:{...(r.qfzpSubstance||{}),cigas:arr}};
                          })}
                          placeholder="e.g. 57"/>
                        <AdminSelect C={C} F={F} label="Qualifying?"
                          val={reportData?.qfzpSubstance?.cigas?.[i]?.qualified===false?"no":"yes"}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.qfzpSubstance?.cigas)||[{},{},{},{}])];
                            arr[i]={...arr[i],qualified:v==="yes"};
                            return {...r,qfzpSubstance:{...(r.qfzpSubstance||{}),cigas:arr}};
                          })}
                          options={[{value:"yes",label:"✅ Qualifying (0% CT)"},{value:"no",label:"❌ Non-Qualifying (9%)"}]}/>
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Notes"
                        val={reportData?.qfzpSubstance?.cigas?.[i]?.note||""}
                        onChange={v=>setReportData(r=>{
                          const arr=[...((r.qfzpSubstance?.cigas)||[{},{},{},{}])];
                          arr[i]={...arr[i],note:v};
                          return {...r,qfzpSubstance:{...(r.qfzpSubstance||{}),cigas:arr}};
                        })}
                        placeholder="e.g. Core activity — conducted from DMCC office"/>
                    </div>
                  ))}
 
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima (shown on client page & PDF)"
                    val={reportData?.qfzpSubstance?.garimaNote||""}
                    onChange={v=>setReportData(r=>({...r,qfzpSubstance:{...(r.qfzpSubstance||{}),garimaNote:v}}))}
                    placeholder="QFZP substance analysis — gaps, audit risks, de-minimis watch, action items..."/>
                </Card>
 
                {/* ── NEW: VERTICAL ANALYSIS ADMIN ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    <span style={{display:"flex",alignItems:"center",gap:8}}><i className="ti ti-chart-bar" style={{fontSize:15,color:C.blue}}/>Vertical Analysis — P&L Lines</span>
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter P&L line items with current and prior period amounts. % of revenue and change (pp) are calculated automatically. Minimum 5 rows required to override demo data.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Period"
                    val={reportData?.verticalAnalysis?.period||""}
                    onChange={v=>setReportData(r=>({...r,verticalAnalysis:{...(r.verticalAnalysis||{}),period:v}}))}
                    placeholder="e.g. Q1 2026 (Jan–Mar)"/>
 
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`,
                      borderRadius:16, padding:20, marginBottom:8 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:8 }}>
                        <AdminInput C={C} F={F} FM={FM} label={`Row ${i+1} — Label`}
                          val={reportData?.verticalAnalysis?.rows?.[i]?.label||""}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.verticalAnalysis?.rows)||Array(16).fill({}))];
                            rows[i]={...rows[i],label:v};
                            return {...r,verticalAnalysis:{...(r.verticalAnalysis||{}),rows}};
                          })}
                          placeholder={["Revenue","Cost of Goods Sold","Gross Profit","Salaries & Benefits","EBITDA","Net Profit (PAT)"][i]||"Line item"}/>
                        <AdminInput C={C} F={F} FM={FM} label="Current (AED)" mono
                          val={reportData?.verticalAnalysis?.rows?.[i]?.ifrs||""}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.verticalAnalysis?.rows)||Array(16).fill({}))];
                            rows[i]={...rows[i],ifrs:Number(v)||0};
                            return {...r,verticalAnalysis:{...(r.verticalAnalysis||{}),rows}};
                          })}
                          placeholder="0"/>
                        <AdminInput C={C} F={F} FM={FM} label="Prior Period (AED)" mono
                          val={reportData?.verticalAnalysis?.rows?.[i]?.prev||""}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.verticalAnalysis?.rows)||Array(16).fill({}))];
                            rows[i]={...rows[i],prev:Number(v)||0};
                            return {...r,verticalAnalysis:{...(r.verticalAnalysis||{}),rows}};
                          })}
                          placeholder="0"/>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
                        <AdminSelect C={C} F={F} label="Section"
                          val={reportData?.verticalAnalysis?.rows?.[i]?.section||"opex"}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.verticalAnalysis?.rows)||Array(16).fill({}))];
                            rows[i]={...rows[i],section:v};
                            return {...r,verticalAnalysis:{...(r.verticalAnalysis||{}),rows}};
                          })}
                          options={[
                            {value:"revenue",label:"Revenue"},
                            {value:"cogs",   label:"COGS / Direct Costs"},
                            {value:"gp",     label:"Gross Profit"},
                            {value:"opex",   label:"Operating Expenses"},
                            {value:"ebitda", label:"EBITDA"},
                            {value:"below",  label:"Below EBITDA (D&A, Finance)"},
                            {value:"pat",    label:"Net Profit (PAT)"},
                          ]}/>
                        <AdminSelect C={C} F={F} label="Row Type"
                          val={reportData?.verticalAnalysis?.rows?.[i]?.subtotal?"subtotal":reportData?.verticalAnalysis?.rows?.[i]?.total?"total":"normal"}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.verticalAnalysis?.rows)||Array(16).fill({}))];
                            rows[i]={...rows[i],subtotal:v==="subtotal",total:v==="total"};
                            return {...r,verticalAnalysis:{...(r.verticalAnalysis||{}),rows}};
                          })}
                          options={[
                            {value:"normal",   label:"Normal line item"},
                            {value:"subtotal", label:"Subtotal / Key metric (bold)"},
                            {value:"total",    label:"Grand total (Net Profit)"},
                          ]}/>
                      </div>
                    </div>
                  ))}
 
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima (shown on client page & PDF)"
                    val={reportData?.verticalAnalysis?.garimaNote||""}
                    onChange={v=>setReportData(r=>({...r,verticalAnalysis:{...(r.verticalAnalysis||{}),garimaNote:v}}))}
                    placeholder="Your margin analysis — GP trend, cost structure insights, benchmark vs industry..."/>
                </Card>
 
                {/* ── NEW: WORKING CAPITAL ADMIN ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    Working Capital — CCC & AR Aging
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter DSO/DIO/DPO and AR aging by customer. Shown on Working Capital page and in downloadable PDF report.
                  </p>
 
                  {/* Period + CCC inputs */}
                  <AdminInput C={C} F={F} FM={FM} label="Period (e.g. Q1 2026)"
                    val={reportData?.workingCapital?.period||""}
                    onChange={v=>setReportData(r=>({...r,workingCapital:{...(r.workingCapital||{}),period:v}}))}
                    placeholder="e.g. Q1 2026 (Jan–Mar)"/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    <AdminInput C={C} F={F} FM={FM} label="DSO (Days)" mono
                      val={reportData?.workingCapital?.dso||""}
                      onChange={v=>setReportData(r=>({...r,workingCapital:{...(r.workingCapital||{}),dso:Number(v)||v}}))}
                      placeholder="e.g. 38"/>
                    <AdminInput C={C} F={F} FM={FM} label="DIO (Days)" mono
                      val={reportData?.workingCapital?.dio||""}
                      onChange={v=>setReportData(r=>({...r,workingCapital:{...(r.workingCapital||{}),dio:Number(v)||v}}))}
                      placeholder="e.g. 15"/>
                    <AdminInput C={C} F={F} FM={FM} label="DPO (Days)" mono
                      val={reportData?.workingCapital?.dpo||""}
                      onChange={v=>setReportData(r=>({...r,workingCapital:{...(r.workingCapital||{}),dpo:Number(v)||v}}))}
                      placeholder="e.g. 28"/>
                  </div>
 
                  {/* AR Aging rows */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text,
                    margin:"16px 0 10px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    AR Aging by Customer
                  </div>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`,
                      borderRadius:16, padding:20, marginBottom:10 }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                        marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Customer {i+1}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Customer Name"
                          val={reportData?.workingCapital?.arAging?.[i]?.customer||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],customer:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="e.g. Gulf Fresh Foods LLC"/>
                        <AdminInput C={C} F={F} FM={FM} label="Action Required"
                          val={reportData?.workingCapital?.arAging?.[i]?.action||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],action:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="e.g. On schedule / Send reminder / Demand letter"/>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Current 0–30d (AED)" mono
                          val={reportData?.workingCapital?.arAging?.[i]?.current||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],current:Number(v)||0};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="0"/>
                        <AdminInput C={C} F={F} FM={FM} label="31–60 days (AED)" mono
                          val={reportData?.workingCapital?.arAging?.[i]?.d30||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],d30:Number(v)||0};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="0"/>
                        <AdminInput C={C} F={F} FM={FM} label="61–90 days (AED)" mono
                          val={reportData?.workingCapital?.arAging?.[i]?.d60||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],d60:Number(v)||0};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="0"/>
                        <AdminInput C={C} F={F} FM={FM} label="90+ days (AED)" mono
                          val={reportData?.workingCapital?.arAging?.[i]?.d90||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],d90:Number(v)||0};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          placeholder="0"/>
                      </div>
                      <div style={{ marginTop:8 }}>
                        <AdminSelect C={C} F={F} label="Risk Level"
                          val={reportData?.workingCapital?.arAging?.[i]?.risk||"Low"}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.arAging)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],risk:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),arAging:arr}};
                          })}
                          options={[
                            {value:"Low",    label:"Low — current, on schedule"},
                            {value:"Medium", label:"Medium — 30–60 days, follow up"},
                            {value:"High",   label:"High — 90+ days, escalate"},
                          ]}/>
                      </div>
                    </div>
                  ))}
 
                  {/* AP Schedule rows */}
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text,
                    margin:"16px 0 10px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    AP Schedule (Outstanding Payables)
                  </div>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`,
                      borderRadius:16, padding:20, marginBottom:10 }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                        marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Supplier {i+1}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Supplier Name"
                          val={reportData?.workingCapital?.apSchedule?.[i]?.supplier||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.apSchedule)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],supplier:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),apSchedule:arr}};
                          })}
                          placeholder="e.g. Emirates Paper & Packaging"/>
                        <AdminInput C={C} F={F} FM={FM} label="Amount (AED)" mono
                          val={reportData?.workingCapital?.apSchedule?.[i]?.amount||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.apSchedule)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],amount:Number(v)||0};
                            return {...r,workingCapital:{...(r.workingCapital||{}),apSchedule:arr}};
                          })}
                          placeholder="e.g. 48000"/>
                        <AdminInput C={C} F={F} FM={FM} label="Payment Terms"
                          val={reportData?.workingCapital?.apSchedule?.[i]?.terms||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.apSchedule)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],terms:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),apSchedule:arr}};
                          })}
                          placeholder="e.g. Net 30"/>
                        <AdminInput C={C} F={F} FM={FM} label="Due Date"
                          val={reportData?.workingCapital?.apSchedule?.[i]?.due||""}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.apSchedule)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],due:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),apSchedule:arr}};
                          })}
                          placeholder="e.g. 20 Apr 2026"/>
                      </div>
                      <div style={{ marginTop:8 }}>
                        <AdminSelect C={C} F={F} label="Status"
                          val={reportData?.workingCapital?.apSchedule?.[i]?.priority||"On Track"}
                          onChange={v=>setReportData(r=>{
                            const arr=[...((r.workingCapital?.apSchedule)||[{},{},{},{},{}])];
                            arr[i]={...arr[i],priority:v};
                            return {...r,workingCapital:{...(r.workingCapital||{}),apSchedule:arr}};
                          })}
                          options={[
                            {value:"On Track", label:"On Track"},
                            {value:"Upcoming", label:"Upcoming — pay soon"},
                            {value:"Overdue",  label:"Overdue — pay now"},
                          ]}/>
                      </div>
                    </div>
                  ))}
 
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima (shown on client page & PDF)"
                    val={reportData?.workingCapital?.garimaNote||""}
                    onChange={v=>setReportData(r=>({...r,workingCapital:{...(r.workingCapital||{}),garimaNote:v}}))}
                    placeholder="Your working capital analysis — DSO trends, collection priorities, AP optimisation..."/>
                </Card>
 
                {/* ── NEW: REVENUE RECONCILIATION ADMIN ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    Revenue Reconciliation (IFRS vs VAT)
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter each reconciling line. IFRS Amount = per audited books. VAT Amount = per VAT return. Difference is auto-calculated. Shown on client's Revenue Reconciliation page and in downloadable PDF.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Period (e.g. Q1 2026)"
                    val={reportData?.revRecon?.period||""}
                    onChange={v=>setReportData(r=>({...r,revRecon:{...(r.revRecon||{}),period:v}}))}
                    placeholder="e.g. Q1 2026 (Jan–Mar)"/>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`,
                      borderRadius:16, padding:20, marginBottom:10 }}>
                      <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                        marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Row {i+1}
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Description"
                        val={reportData?.revRecon?.rows?.[i]?.desc||""}
                        onChange={v=>setReportData(r=>{
                          const rows=[...((r.revRecon?.rows)||[{},{},{},{},{},{}])];
                          rows[i]={...rows[i],desc:v};
                          return {...r,revRecon:{...(r.revRecon||{}),rows}};
                        })}
                        placeholder="e.g. Standard-rated UAE sales (5% VAT)"/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <AdminInput C={C} F={F} FM={FM} label="IFRS Amount (AED)" mono
                          val={reportData?.revRecon?.rows?.[i]?.ifrs||""}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.revRecon?.rows)||[{},{},{},{},{},{}])];
                            rows[i]={...rows[i],ifrs:Number(v)||0};
                            return {...r,revRecon:{...(r.revRecon||{}),rows}};
                          })}
                          placeholder="e.g. 1500000"/>
                        <AdminInput C={C} F={F} FM={FM} label="VAT Return Amount (AED)" mono
                          val={reportData?.revRecon?.rows?.[i]?.vat||""}
                          onChange={v=>setReportData(r=>{
                            const rows=[...((r.revRecon?.rows)||[{},{},{},{},{},{}])];
                            rows[i]={...rows[i],vat:Number(v)||0};
                            return {...r,revRecon:{...(r.revRecon||{}),rows}};
                          })}
                          placeholder="e.g. 1500000"/>
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Explanation (shown in report)"
                        val={reportData?.revRecon?.rows?.[i]?.explanation||""}
                        onChange={v=>setReportData(r=>{
                          const rows=[...((r.revRecon?.rows)||[{},{},{},{},{},{}])];
                          rows[i]={...rows[i],explanation:v};
                          return {...r,revRecon:{...(r.revRecon||{}),rows}};
                        })}
                        placeholder="e.g. VAT point triggered on receipt; IFRS defers to delivery"/>
                    </div>
                  ))}
                  <AdminInput C={C} F={F} FM={FM} label="Note from Garima (shown on client page & PDF)"
                    val={reportData?.revRecon?.garimaNote||""}
                    onChange={v=>setReportData(r=>({...r,revRecon:{...(r.revRecon||{}),garimaNote:v}}))}
                    placeholder="Your analysis — key timing differences, FTA audit risks, action items..."/>
                </Card>
 
                {/* ── RELATED PARTY TRANSACTIONS ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-building" style={{fontSize:15,color:C.blue}}/>Related Party Transactions (Art. 35 &amp; 34)</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter each related party entity and transaction. Used to generate the RPT & Connected Persons Report for CT Return filing.
                  </p>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:12 }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10 }}>
                        Related Party {i+1}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Entity Name"
                          val={reportData?.rptEntities?.[i]?.name||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],name:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. Rashidi Holdings Ltd"/>
                        <AdminInput C={C} F={F} FM={FM} label="Jurisdiction"
                          val={reportData?.rptEntities?.[i]?.jurisdiction||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],jurisdiction:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. UAE (Abu Dhabi)"/>
                        <AdminInput C={C} F={F} FM={FM} label="Relationship"
                          val={reportData?.rptEntities?.[i]?.relationship||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],relationship:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. Common shareholder >50%"/>
                        <AdminInput C={C} F={F} FM={FM} label="Transaction Type"
                          val={reportData?.rptEntities?.[i]?.txnType||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],txnType:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. Intercompany loan — interest"/>
                        <AdminInput C={C} F={F} FM={FM} label="Amount (AED)" mono
                          val={reportData?.rptEntities?.[i]?.amount||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],amount:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. 63750"/>
                        <AdminInput C={C} F={F} FM={FM} label="TP Method"
                          val={reportData?.rptEntities?.[i]?.tpMethod||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],tpMethod:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. CUP — EIBOR + 2.5%"/>
                        <AdminInput C={C} F={F} FM={FM} label="Market Range"
                          val={reportData?.rptEntities?.[i]?.marketRange||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],marketRange:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. AED 160,000–200,000"/>
                        <AdminInput C={C} F={F} FM={FM} label="Action / Risk Note"
                          val={reportData?.rptEntities?.[i]?.action||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],action:v}; return {...r,rptEntities:arr}; })}
                          placeholder="e.g. Obtain signed loan agreement"/>
                      </div>
                      <div style={{ marginTop:10 }}>
                        <AdminSelect C={C} F={F} label="Arm's Length?"
                          val={reportData?.rptEntities?.[i]?.compliant||"yes"}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.rptEntities||[{},{},{}])]; arr[i]={...arr[i],compliant:v}; return {...r,rptEntities:arr}; })}
                          options={[{value:"yes",label:"✅ Yes — Arm's Length"},{value:"no",label:"❌ No — Adjustment Required"},{value:"partial",label:"⚠️ Partially Compliant"}]}/>
                      </div>
                    </div>
                  ))}
                  <AdminInput C={C} F={F} FM={FM} label="RPT Garima Note (shown in report)"
                    val={reportData?.rptGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,rptGarimaNote:v}))}
                    placeholder="Your analysis and action items for related party transactions..."/>
                </Card>
 
                {/* ── CONNECTED PERSONS ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-users" style={{fontSize:15,color:C.blue}}/>Connected Persons (Art. 36 + CTP010)</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter each individual connected person. Per CTP010: only natural persons. Director = board seat in constitutional docs. Officer = actual strategic authority.
                  </p>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:12 }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, marginBottom:10 }}>
                        Connected Person {i+1}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Full Name"
                          val={reportData?.connectedPersonsAdmin?.[i]?.name||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],name:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. Ahmed Al Rashidi"/>
                        <AdminInput C={C} F={F} FM={FM} label="Role / Title"
                          val={reportData?.connectedPersonsAdmin?.[i]?.role||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],role:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. Managing Director & Shareholder"/>
                        <AdminInput C={C} F={F} FM={FM} label="Art. 36(2) Reference"
                          val={reportData?.connectedPersonsAdmin?.[i]?.artRef||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],artRef:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. Art. 36(2)(a) Owner + 36(2)(b) Director"/>
                        <AdminInput C={C} F={F} FM={FM} label="Total Payments (AED)" mono
                          val={reportData?.connectedPersonsAdmin?.[i]?.totalPayments||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],totalPayments:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. 262000"/>
                        <AdminInput C={C} F={F} FM={FM} label="Market Range (AED)"
                          val={reportData?.connectedPersonsAdmin?.[i]?.marketRange||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],marketRange:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. AED 200,000 – AED 300,000"/>
                        <AdminInput C={C} F={F} FM={FM} label="Payment Breakdown (summary)"
                          val={reportData?.connectedPersonsAdmin?.[i]?.paymentBreakdown||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],paymentBreakdown:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. Salary 200K + Bonus 30K + Benefits 32K"/>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                        <AdminSelect C={C} F={F} label="Test 1 — Arm's Length?"
                          val={reportData?.connectedPersonsAdmin?.[i]?.armsLength||"pass"}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],armsLength:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          options={[{value:"pass",label:"✅ Pass — within market range"},{value:"fail",label:"❌ Fail — above market value"},{value:"pending",label:"⚠️ Pending benchmarking"}]}/>
                        <AdminSelect C={C} F={F} label="Test 2 — Business Purpose?"
                          val={reportData?.connectedPersonsAdmin?.[i]?.businessPurpose||"pass"}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],businessPurpose:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          options={[{value:"pass",label:"✅ Pass — business purpose confirmed"},{value:"fail",label:"❌ Fail — personal element"},{value:"evidence",label:"⚠️ Evidence required"}]}/>
                      </div>
                      <div style={{ marginTop:10 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Action / Risk Note"
                          val={reportData?.connectedPersonsAdmin?.[i]?.action||""}
                          onChange={v=>setReportData(r=>{ const arr=[...(r.connectedPersonsAdmin||[{},{},{}])]; arr[i]={...arr[i],action:v}; return {...r,connectedPersonsAdmin:arr}; })}
                          placeholder="e.g. Collect Q1 deliverables evidence by 20 April"/>
                      </div>
                    </div>
                  ))}
                  <AdminInput C={C} F={F} FM={FM} label="Connected Persons Garima Note"
                    val={reportData?.cpGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,cpGarimaNote:v}))}
                    placeholder="Your analysis of connected person payments and compliance risks..."/>
                </Card>
 
                {/* ── ARM'S LENGTH TESTS ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-scale" style={{fontSize:15,color:C.blue}}/>Arm's Length Tests</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Enter each related-party transaction tested for arm's length compliance. Shown on the client's Arm's Length tab.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Total Transactions Tested" mono
                      val={reportData?.armsLength?.totalTransactions||""}
                      onChange={v=>setReportData(r=>({...r,armsLength:{...(r.armsLength||{}),totalTransactions:Number(v)||v}}))}
                      placeholder="e.g. 4"/>
                    <AdminInput C={C} F={F} FM={FM} label="Compliant Transactions" mono
                      val={reportData?.armsLength?.compliant||""}
                      onChange={v=>setReportData(r=>({...r,armsLength:{...(r.armsLength||{}),compliant:Number(v)||v}}))}
                      placeholder="e.g. 3"/>
                  </div>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:12, background:"#fff" }}>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:12, color:C.muted, marginBottom:10 }}>Transaction {i+1}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <AdminInput C={C} F={F} FM={FM} label="Category"
                          val={reportData?.armsLength?.tests?.[i]?.category||""}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],category:v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          placeholder="e.g. Director Salary"/>
                        <AdminInput C={C} F={F} FM={FM} label="TP Method"
                          val={reportData?.armsLength?.tests?.[i]?.method||""}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],method:v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          placeholder="e.g. CUP"/>
                        <AdminInput C={C} F={F} FM={FM} label="Transaction Description"
                          val={reportData?.armsLength?.tests?.[i]?.transaction||""}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],transaction:v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          placeholder="e.g. Ahmed Al Rashidi — AED 240,000 salary"/>
                        <AdminInput C={C} F={F} FM={FM} label="Market Range"
                          val={reportData?.armsLength?.tests?.[i]?.marketRange||""}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],marketRange:v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          placeholder="e.g. AED 180,000 – AED 280,000"/>
                        <AdminInput C={C} F={F} FM={FM} label="Actual Amount (AED)" mono
                          val={reportData?.armsLength?.tests?.[i]?.actual||""}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],actual:Number(v)||v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          placeholder="e.g. 240000"/>
                        <AdminSelect C={C} F={F} label="Compliant?"
                          val={reportData?.armsLength?.tests?.[i]?.compliant ?? "true"}
                          onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],compliant:v==="true"}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                          options={[{val:"true",label:"✅ Compliant"},{val:"false",label:"❌ Non-Compliant"}]}/>
                      </div>
                      <AdminInput C={C} F={F} FM={FM} label="Notes / Analysis"
                        val={reportData?.armsLength?.tests?.[i]?.notes||""}
                        onChange={v=>setReportData(r=>{ const t=[...(r.armsLength?.tests||[{},{},{},{}])]; t[i]={...t[i],notes:v}; return {...r,armsLength:{...(r.armsLength||{}),tests:t}}; })}
                        placeholder="Analysis of arm's length compliance..." multiline/>
                    </div>
                  ))}
                </Card>
 
                {/* UAE AI ANALYSIS GENERATOR */}
                {reportData && <Card style={{ marginBottom:14, border:`1.5px solid #00732F30`,
                  background:`linear-gradient(135deg,#00732F06,#00B45408)` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:36, height:36, borderRadius:16,
                      background:`linear-gradient(135deg,#00732F,#00B454)`,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <i className="ti ti-sparkles" style={{fontSize:18,color:"#fff"}}/>
                    </div>
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>Generate UAE Analysis with AI</div>
                      <div style={{ fontFamily:F, fontSize:11, color:C.muted }}>Reads VAT, CT, QFZP and cash data above — drafts Garima's UAE commentary for you to review</div>
                    </div>
                  </div>

                  <button onClick={generateUAEAnalysis} disabled={aiGenerating}
                    style={{ width:"100%", padding:"12px", borderRadius:16, border:"none",
                      background: aiGenerating ? C.bg3 : `linear-gradient(135deg,#00732F,#00B454)`,
                      color: aiGenerating ? C.muted : "white",
                      fontFamily:F, fontWeight:700, fontSize:14, cursor: aiGenerating ? "not-allowed" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                      marginBottom: (aiDraft || aiError) ? 16 : 0 }}>
                    {aiGenerating ? <><span>⟳</span>{" Analysing UAE data..."}</> : "Generate UAE Analysis Draft"}
                  </button>

                  {aiError && (
                    <div style={{ padding:"10px 14px", borderRadius:16, background:`${C.red}10`,
                      border:`1px solid ${C.red}20`, fontFamily:F, fontSize:12, color:C.red }}>
                      {aiError}
                    </div>
                  )}

                  {aiDraft && (
                    <div>
                      <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:12 }}>Draft ready — review and apply</div>
                      {[
                        { key:"uaeGarimaNote",     label:"Overall UAE Note",      field:"uaeGarimaNote"     },
                        { key:"cashflowGarimaNote", label:"Cash Flow Note",        field:"cashflowGarimaNote" },
                        { key:"vatGarimaNote",      label:"VAT Note",              field:"vatGarimaNote"      },
                        { key:"ctGarimaNote",       label:"Corporate Tax Note",    field:"ctGarimaNote"       },
                        { key:"qfzpNote",           label:"QFZP Substance Note",   field:"qfzpSubstance.garimaNote" },
                      ].filter(f => aiDraft[f.key]).map((f, i) => (
                        <div key={i} style={{ marginBottom:10, padding:"12px 14px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}` }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontFamily:F, fontSize:11, fontWeight:700, color:"#00732F", textTransform:"uppercase", letterSpacing:"0.06em" }}>{f.label}</span>
                            <button onClick={() => {
                              if (f.field.includes(".")) {
                                const [obj, key] = f.field.split(".");
                                setReportData(r => ({...r, [obj]:{...(r[obj]||{}), [key]:aiDraft[f.key]}}));
                              } else {
                                setReportData(r => ({...r, [f.field]:aiDraft[f.key]}));
                              }
                            }} style={{ padding:"3px 12px", borderRadius:60, border:"none",
                              background:"#00732F15", color:"#00732F",
                              fontFamily:F, fontSize:11, fontWeight:700, cursor:"pointer" }}>Apply</button>
                          </div>
                          <div style={{ fontFamily:F, fontSize:12, color:C.text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                            {aiDraft[f.key]}
                          </div>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:10, marginTop:4 }}>
                        <button onClick={() => {
                          const d = aiDraft;
                          setReportData(r => ({...r,
                            uaeGarimaNote:     d.uaeGarimaNote     || r.uaeGarimaNote,
                            cashflowGarimaNote:d.cashflowGarimaNote|| r.cashflowGarimaNote,
                            vatGarimaNote:     d.vatGarimaNote     || r.vatGarimaNote,
                            ctGarimaNote:      d.ctGarimaNote      || r.ctGarimaNote,
                            qfzpSubstance:     d.qfzpNote ? {...(r.qfzpSubstance||{}), garimaNote:d.qfzpNote} : r.qfzpSubstance,
                          }));
                          setAiDraft(null);
                          saveReportData();
                        }} style={{ flex:1, padding:"11px", borderRadius:16, border:"none",
                          background:`linear-gradient(135deg,#00732F,#00B454)`,
                          color:"white", fontFamily:F, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                          Apply All & Save
                        </button>
                        <button onClick={() => setAiDraft(null)}
                          style={{ padding:"11px 16px", borderRadius:16, border:`1px solid ${C.border}`,
                            background:C.bg, color:C.muted, fontFamily:F, fontSize:13, cursor:"pointer" }}>
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </Card>}

                <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData}
                  label="Save UAE Data →"/>
              </>)}
            </div>
          )}
 
          {/* ── UAE CASH & NOTES ── (new tab - synced with UAE CFO Report) */}
          {tab === "uaecashflow" && (
            <div style={{ maxWidth:900 }}>
              {!selected ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a UAE client from the sidebar first</div>
                </Card>
              ) : !isUAE(selected) ? (
                <Card style={{ textAlign:"center", padding:40, background:"#FFFBEB", border:"1px solid #FCD34D" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>India</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.warning, fontWeight:600 }}>India client selected</div>
                  <p style={{ fontFamily:F, fontSize:13, color:C.muted, marginTop:8 }}>Switch to a UAE client to edit UAE cash data.</p>
                </Card>
              ) : !reportData ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Loading report data...</div>
                </Card>
              ) : (<>
 
                {/* ── Garima Notes for each UAE section ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    Garima Notes — UAE Sections
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    These notes appear prominently at the top of each UAE client section. Write in first person — e.g. "Your Q1 VAT is due...". Shown in both the portal view and downloadable PDFs.
                  </p>
 
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, margin:"0 0 6px",
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Overall UAE Note (Overview page)
                  </div>
                  <AdminInput C={C} F={F} FM={FM}
                    label="Note shown on Overview and UAE CFO Report header"
                    val={reportData?.uaeGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,uaeGarimaNote:v}))}
                    placeholder="Q1 2026 closed strongly — revenue at AED 1.85M... (2–3 sentences max for Overview)"/>
 
                  <div style={{ height:1, background:C.border, margin:"16px 0" }}/>
 
                  <div style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.text, margin:"0 0 6px",
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Cash Flow Forecast Note
                  </div>
                  <AdminInput C={C} F={F} FM={FM}
                    label="Shown at top of Cash Flow Forecast tab in UAE CFO Report"
                    val={reportData?.cashflowGarimaNote||""}
                    onChange={v=>setReportData(r=>({...r,cashflowGarimaNote:v}))}
                    placeholder="Cash flow forecast for next 3–6 months. VAT payment of AED 92.5K due 28 April — ensure Emirates NBD current account is funded..."/>
                </Card>
 
                {/* ── Cash Projection KPIs ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    Cash Position — Projected (shown on UAE CFO Report → Cash tab)
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    These 3 figures appear as KPI cards on the Cash Flow Forecast tab. Format: AED 580K or AED 487,000.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Projected Cash — End of Quarter" mono
                      val={reportData?.projectedCash||""}
                      onChange={v=>setReportData(r=>({...r,projectedCash:v}))}
                      placeholder="e.g. AED 580K"/>
                    <AdminInput C={C} F={F} FM={FM} label="VAT Reserve Required" mono
                      val={reportData?.vatReserve||""}
                      onChange={v=>setReportData(r=>({...r,vatReserve:v}))}
                      placeholder="e.g. AED 92.5K"/>
                    <AdminInput C={C} F={F} FM={FM} label="Net Cash After Obligations" mono
                      val={reportData?.netCashAfterObl||""}
                      onChange={v=>setReportData(r=>({...r,netCashAfterObl:v}))}
                      placeholder="e.g. AED 487K"/>
                  </div>
                </Card>
 
                {/* ── Forward Forecast (also used by Overview 3-Month View) ── */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>
                    3-Month Forward View (appears on Overview page)
                  </div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    If filled, this appears as a forward-looking panel on the Overview page. Leave blank to hide.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Forward View Note"
                    val={reportData?.forecastNote||""}
                    onChange={v=>setReportData(r=>({...r,forecastNote:v}))}
                    placeholder="Q2 outlook: revenue expected AED 1.9–2.1M. Two new contracts in pipeline..."/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    {[
                      { lbl:"Forecast 1 — Label", key:"forecast1Label", ph:"e.g. Q2 Revenue Forecast" },
                      { lbl:"Value",               key:"forecast1Value", ph:"e.g. AED 1.9M" },
                      { lbl:"Trend",               key:"forecast1Trend", ph:"up / down / stable" },
                      { lbl:"Forecast 2 — Label", key:"forecast2Label", ph:"e.g. Q2 Gross Margin" },
                      { lbl:"Value",               key:"forecast2Value", ph:"e.g. 44%" },
                      { lbl:"Trend",               key:"forecast2Trend", ph:"up / down / stable" },
                      { lbl:"Forecast 3 — Label", key:"forecast3Label", ph:"e.g. VAT Payable Q2" },
                      { lbl:"Value",               key:"forecast3Value", ph:"e.g. AED 88K" },
                      { lbl:"Trend",               key:"forecast3Trend", ph:"up / down / stable" },
                    ].map(f=>(
                      <AdminInput key={f.key} C={C} F={F} FM={FM} label={f.lbl}
                        val={reportData?.[f.key]||""}
                        onChange={v=>setReportData(r=>({...r,[f.key]:v}))}
                        placeholder={f.ph}/>
                    ))}
                  </div>
                </Card>
 
                <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData} label="Save UAE Cash & Notes →"/>
              </>)}
            </div>
          )}
 
          {/* ── BI & SCENARIOS ── */}
          {tab === "analytics" && (
            <div style={{ maxWidth:900 }}>
              {!selected || !reportData ? (
                <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>👆</div>
                  <div style={{ fontFamily:F, fontSize:14, color:C.muted }}>Select a client from the sidebar first</div>
                </Card>
              ) : (<>
 
                {/* ══ GEOGRAPHY — INDIA REGIONS ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>India Regions — Revenue & Cost</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>BI Analysis → Geography</strong> tab. Enter monthly figures in ₹.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:8, marginBottom:8 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Region</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase" }}>Revenue (₹)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase" }}>Cost (₹)</div>
                  </div>
                  {["North","South","West","East","Metro"].map(region => (
                    <div key={region} style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:8, marginBottom:8 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text, display:"flex", alignItems:"center" }}>{region}</div>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.geoIndia?.[region]?.revenue || ""}
                        onChange={v => setReportData(r => ({...r, geoIndia:{...(r.geoIndia||{}), [region]:{...(r.geoIndia?.[region]||{}), revenue:v}}}))}
                        placeholder="₹0" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.geoIndia?.[region]?.cost || ""}
                        onChange={v => setReportData(r => ({...r, geoIndia:{...(r.geoIndia||{}), [region]:{...(r.geoIndia?.[region]||{}), cost:v}}}))}
                        placeholder="₹0" mono/>
                    </div>
                  ))}
                </Card>
 
                {/* ══ GEOGRAPHY — GLOBAL REGIONS ══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Global Regions — Revenue & Cost</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Cross-border split — especially useful for Gulf and India clients.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:8, marginBottom:8 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Region</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase" }}>Revenue (₹)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase" }}>Cost (₹)</div>
                  </div>
                  {[
                    { name:"India",  icon:"ti-map-pin" },
                    { name:"GCC",    icon:"ti-map-pin"  },
                    { name:"USA",    icon:"ti-map-pin" },
                    { name:"Europe", icon:"ti-map-pin" },
                    { name:"Other",  icon:"ti-map-pin"  },
                  ].map(r => (
                    <div key={r.name} style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:8, marginBottom:8 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text, display:"flex", alignItems:"center" }}>{r.icon} {r.name}</div>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.geoGlobal?.[r.name]?.revenue || ""}
                        onChange={v => setReportData(rd => ({...rd, geoGlobal:{...(rd.geoGlobal||{}), [r.name]:{...(rd.geoGlobal?.[r.name]||{}), revenue:v}}}))}
                        placeholder="₹0" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.geoGlobal?.[r.name]?.cost || ""}
                        onChange={v => setReportData(rd => ({...rd, geoGlobal:{...(rd.geoGlobal||{}), [r.name]:{...(rd.geoGlobal?.[r.name]||{}), cost:v}}}))}
                        placeholder="₹0" mono/>
                    </div>
                  ))}
                </Card>
 
                {/* ══ DEPARTMENT ANALYSIS ═══════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Department — Revenue & Cost</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Populates the <strong>BI Analysis → Department</strong> tab. Enter monthly figures.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Department</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase" }}>Revenue (₹)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase" }}>Cost (₹)</div>
                    <div style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Budget (₹)</div>
                  </div>
                  {[
                    { name:"Sales",       icon:"ti-briefcase" },
                    { name:"Marketing",   icon:"ti-speakerphone" },
                    { name:"Technology",  icon:"ti-device-laptop" },
                    { name:"Operations",  icon:"settings" },
                    { name:"HR & Admin",  icon:"ti-users" },
                    { name:"Finance",     emoji:"ti-chart-bar" },
                  ].map(d => (
                    <div key={d.name} style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                      <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text, display:"flex", alignItems:"center" }}>{d.icon} {d.name}</div>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.depts?.[d.name]?.revenue || ""}
                        onChange={v => setReportData(r => ({...r, depts:{...(r.depts||{}), [d.name]:{...(r.depts?.[d.name]||{}), revenue:v}}}))}
                        placeholder="₹0" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.depts?.[d.name]?.cost || ""}
                        onChange={v => setReportData(r => ({...r, depts:{...(r.depts||{}), [d.name]:{...(r.depts?.[d.name]||{}), cost:v}}}))}
                        placeholder="₹0" mono/>
                      <AdminInput C={C} F={F} FM={FM} label="" val={reportData?.depts?.[d.name]?.budget || ""}
                        onChange={v => setReportData(r => ({...r, depts:{...(r.depts||{}), [d.name]:{...(r.depts?.[d.name]||{}), budget:v}}}))}
                        placeholder="₹0" mono/>
                    </div>
                  ))}
                </Card>
 
                {/* ══ SCENARIO MODELLING BASE ═══════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Scenario Modelling — Base Figures</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Pre-fills the base inputs for the <strong>Scenarios tab</strong>. Client can then adjust sliders.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
                    <AdminInput C={C} F={F} FM={FM} label="Base Revenue (₹)"
                      val={reportData?.scenarioBase?.revenue || ""}
                      onChange={v => setReportData(r => ({...r, scenarioBase:{...(r.scenarioBase||{}), revenue:v}}))}
                      placeholder="e.g. 5000000" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Base COGS (₹)"
                      val={reportData?.scenarioBase?.cogs || ""}
                      onChange={v => setReportData(r => ({...r, scenarioBase:{...(r.scenarioBase||{}), cogs:v}}))}
                      placeholder="e.g. 2000000" mono/>
                    <AdminInput C={C} F={F} FM={FM} label="Base OpEx (₹)"
                      val={reportData?.scenarioBase?.opex || ""}
                      onChange={v => setReportData(r => ({...r, scenarioBase:{...(r.scenarioBase||{}), opex:v}}))}
                      placeholder="e.g. 1500000" mono/>
                  </div>
                </Card>
 
                {/* ══ SPEND INTELLIGENCE ════════════════════════════════════════ */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Spend Intelligence — Department Budgets</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Pre-fills the <strong>Spend Intel tab</strong> with actual vs budget data for AI analysis.
                  </p>
                  <AdminInput C={C} F={F} FM={FM} label="Monthly Revenue (₹) — for % benchmarks"
                    val={reportData?.spendRevenue || ""}
                    onChange={v => setReportData(r => ({...r, spendRevenue:v}))}
                    placeholder="e.g. 5000000" mono/>
                  <div style={{ marginTop:12 }}>
                    {[
                      { name:"Marketing & Sales",   bench:15 },
                      { name:"Technology / Product",bench:20 },
                      { name:"Operations",          bench:25 },
                      { name:"HR & People",         bench:20 },
                      { name:"Admin & G&A",         bench:10 },
                      { name:"Finance & Legal",     bench:5  },
                    ].map(d => (
                      <div key={d.name} style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr", gap:8, marginBottom:8, alignItems:"center" }}>
                        <div style={{ fontFamily:F, fontSize:12, fontWeight:600, color:C.text }}>{d.name}</div>
                        <AdminInput C={C} F={F} FM={FM} label="Actual (₹)"
                          val={reportData?.spendDepts?.[d.name]?.actual || ""}
                          onChange={v => setReportData(r => ({...r, spendDepts:{...(r.spendDepts||{}), [d.name]:{...(r.spendDepts?.[d.name]||{}), actual:v}}}))}
                          placeholder="₹0" mono/>
                        <AdminInput C={C} F={F} FM={FM} label="Budget (₹)"
                          val={reportData?.spendDepts?.[d.name]?.budget || ""}
                          onChange={v => setReportData(r => ({...r, spendDepts:{...(r.spendDepts||{}), [d.name]:{...(r.spendDepts?.[d.name]||{}), budget:v}}}))}
                          placeholder="₹0" mono/>
                      </div>
                    ))}
                  </div>
                </Card>
 
                <AdminSaveBtn loading={loading} saved={saved} F={F} onClick={saveReportData} label="Save Analytics Data"/>
              </>)}
            </div>
          )}
 
          {/* ── TREASURY ── */}
          {tab === "treasury" && (
            <div style={{ maxWidth:900 }}>
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
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Cash Positions</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Each row = one bank account or FD shown on the client's Treasury page.
                  </p>
                  {(reportData.treasury?.cashPositions || []).map((p,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8,
                      marginBottom:10, padding:"10px 12px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}` }}>
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
                        style={{ padding:"6px 10px", borderRadius:16, border:"none", cursor:"pointer", fontFamily:F, fontSize:11, fontWeight:700,
                          background:p.flag?`${C.amber}15`:`${C.green}15`, color:p.flag?C.amber:C.green }}>
                        {p.flag?"⚠️":"✅"}
                      </button>
                    </div>
                  ))}
                </Card>
 
                {/* Maturity Schedule */}
                <Card style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-calendar-due" style={{fontSize:15,color:C.blue}}/>FD Maturity Schedule</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the Maturity Schedule tab. Enter maturing FDs and recommended action.
                  </p>
                  {(reportData.treasury?.maturitySchedule || []).map((m,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8,
                      marginBottom:10, padding:"10px 12px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}` }}>
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
                  <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>Recommendations</div>
                  <p style={{ fontFamily:F, fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                    Shown on the client's Recommendations tab. Write specific, actionable advice.
                  </p>
                  {(reportData.treasury?.recommendations || []).map((r,i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:10,
                      marginBottom:10, padding:"10px 12px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}`, alignItems:"center" }}>
                      <AdminSelect C={C} F={F} label="" val={r.priority||"Medium"}
                        onChange={v=>{ const rs=[...(reportData.treasury?.recommendations||[])]; rs[i]={...rs[i],priority:v}; setReportData(rd=>({...rd,treasury:{...(rd.treasury||{}),recommendations:rs}})); }}
                        options={[{value:"High",label:"High"},{value:"Medium",label:"Medium"},{value:"Low",label:"Low"}]}/>
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
            <div style={{ maxWidth:900 }}>
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
                      background:`${C.amber}15`, padding:"3px 10px", borderRadius:60 }}>
                      {getPackLabel(selected.client_pack)} · {selected.company?.split(" ")[0]}
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
                      <div style={{ fontSize:32, marginBottom:8 }}>↑</div>
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
                        padding:"12px 14px", borderRadius:16, background:C.bg, border:`1px solid ${C.border}`,
                        flexWrap:"wrap", gap:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:`${C.blue}12`,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <i className={"ti " + (()=>{const ext=d.name?.split(".").pop()?.toLowerCase();if(["pdf"].includes(ext))return"ti-file-type-pdf";if(["xls","xlsx","csv"].includes(ext))return"ti-table";if(["doc","docx"].includes(ext))return"ti-file-text";return"ti-file-analytics";})()}
                              style={{ fontSize:16, color:C.blue }}/>
                          </div>
                          <div>
                            <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:C.text }}>{d.name}</div>
                            <div style={{ fontFamily:F, fontSize:11, color:C.dim, marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                              <span>{d.file_size}</span>
                              <span>·</span>
                              <span>{d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN") : "—"}</span>
                              {d.doc_type && d.doc_type !== "general" && (
                                <span style={{ color:C.blue, fontWeight:700, textTransform:"uppercase", fontSize:10,
                                  background:`${C.blue}12`, padding:"1px 7px", borderRadius:60 }}>
                                  {d.doc_type.replace("_"," ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <a href={d.file_url} target="_blank" rel="noopener"
                            style={{ padding:"7px 14px", borderRadius:16, border:`1px solid ${C.blue}`,
                              color:C.blue, fontFamily:F, fontWeight:600, fontSize:12, textDecoration:"none" }}>
                            View
                          </a>
                          <button onClick={async () => {
                            await supabase.from("documents").delete().eq("id", d.id);
                            setDocs(prev => prev.filter(x => x.id!==d.id));
                          }} style={{ padding:"7px 12px", borderRadius:16, border:`1px solid ${C.border}`,
                            background:"none", color:C.red, cursor:"pointer", fontSize:13 }}>×</button>
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
              <div style={{ fontFamily:F, fontWeight:700, fontSize:13, color:C.text, marginBottom:4 }}>
                Client Requests
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
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {requests.map((r, i) => (
                    <Card key={r.id || i} style={{ padding:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
                              {r.service_name || r.service_id || "Service Request"}
                            </span>
                            <span style={{ padding:"3px 10px", borderRadius:60, fontSize:11, fontWeight:700,
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
                              padding:"10px 14px", borderRadius:16, background:"#fff", marginTop:8 }}>
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
                            style={{ padding:"7px 12px", borderRadius:16, border:`1px solid ${C.border}`,
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
                          }} style={{ padding:"7px 10px", borderRadius:16, border:`1px solid ${C.border}`,
                            background:"none", color:C.red, cursor:"pointer", fontSize:14 }}>×</button>
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
              {MarketIntelComponent && <MarketIntelComponent client={selected || {client_pack:"startup"}}/>}
            </div>
          )}
 
        </div>
      </div>

      {/* ── QUICK-UPDATE BOTTOM SHEET ── */}
      {quickUpdate && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", flexDirection:"column",
          justifyContent:"flex-end", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)" }}
          onClick={e => { if (e.target === e.currentTarget) setQuickUpdate(null); }}>
          <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 20px 32px",
            maxWidth:520, width:"100%", margin:"0 auto", boxShadow:"0 -8px 40px rgba(0,0,0,0.18)" }}>
            {/* Handle */}
            <div style={{ width:40, height:4, borderRadius:2, background:C.border,
              margin:"0 auto 20px" }}/>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <div>
                <div style={{ fontFamily:F, fontWeight:700, fontSize:15, color:C.text }}>
                  Quick Update — {quickUpdate.name}
                </div>
                <div style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:2 }}>
                  {quickUpdate.company}
                </div>
              </div>
              <button onClick={() => setQuickUpdate(null)}
                style={{ background:"none", border:"none", fontSize:20, color:C.muted, cursor:"pointer", padding:"4px 8px" }}>
                ×
              </button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>
                  Garima's CFO Note
                </label>
                <textarea value={quickForm.garima_note}
                  onChange={e => setQuickForm(f => ({...f, garima_note: e.target.value}))}
                  placeholder="Forward-looking insight for this client…"
                  rows={3}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${C.border}`,
                    fontFamily:F, fontSize:13, color:C.text, resize:"vertical", outline:"none",
                    boxSizing:"border-box", lineHeight:1.6 }}
                  onFocus={e => e.target.style.borderColor = C.amber}
                  onBlur={e  => e.target.style.borderColor = C.border}
                />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { key:"revenue",      label:"Revenue",       ph: isUAE(quickUpdate) ? "AED 850K" : "₹42L" },
                  { key:"cash_balance", label:"Cash Balance",  ph: isUAE(quickUpdate) ? "AED 210K" : "₹18L" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>
                      {f.label}
                    </label>
                    <input value={quickForm[f.key]}
                      onChange={e => setQuickForm(q => ({...q, [f.key]: e.target.value}))}
                      placeholder={f.ph}
                      style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${C.border}`,
                        fontFamily:F, fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" }}
                      onFocus={e => e.target.style.borderColor = C.amber}
                      onBlur={e  => e.target.style.borderColor = C.border}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button disabled={quickSaving}
              onClick={async () => {
                if (!quickForm.garima_note && !quickForm.revenue && !quickForm.cash_balance) return;
                setQuickSaving(true);
                const month = new Date().toLocaleString("en-IN", { month:"short", year:"numeric" });
                const payload = { client_id: quickUpdate.id, month };
                if (quickForm.revenue)      payload.revenue      = quickForm.revenue;
                if (quickForm.cash_balance) payload.cash_balance = quickForm.cash_balance;
                if (quickForm.garima_note)  payload.garima_note  = quickForm.garima_note;
                await supabase.from("kpis").upsert(payload, { onConflict:"client_id,month" });
                // Also update report_data garimaNote for visibility on client overview
                if (quickForm.garima_note) {
                  const { data: rd } = await supabase.from("report_data")
                    .select("data").eq("client_id", quickUpdate.id).maybeSingle();
                  const existing = rd?.data ? (typeof rd.data === "string" ? JSON.parse(rd.data) : rd.data) : {};
                  await supabase.from("report_data").upsert(
                    { client_id: quickUpdate.id, data: { ...existing, garimaNote: quickForm.garima_note } },
                    { onConflict:"client_id" }
                  );
                }
                setQuickSaving(false);
                setQuickUpdate(null);
                // Refresh staleness
                fetchClients();
              }}
              style={{ width:"100%", marginTop:18, padding:"14px", borderRadius:10, border:"none",
                background: quickSaving ? C.muted : C.amber, color:"white",
                fontFamily:F, fontWeight:700, fontSize:14, cursor:"pointer", transition:"background 0.2s" }}>
              {quickSaving ? "Saving…" : "Save Update"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminPanel;
