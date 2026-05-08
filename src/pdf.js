import { isUAE, fmtINR, fmtAED, fmtAED2, fmtDual, AED_TO_INR, sym, normalizePack, getPackLabel } from './tokens';

// Re-export for any callers that import these from pdf.js directly
export { normalizePack, getPackLabel };

// Pack label for PDF headers (uses getPackLabel from tokens)
function pdfPackLabel(p) {
  const n = normalizePack(p);
  if (n === "corporate") return "Corporate Pack";
  if (n === "msme")      return "MSME Pack";
  if (n === "uae")       return "UAE Pack";
  return "Starter Pack";
}


export function generateExecSummaryPDF({ client, reportData, kpis }) {
  const company  = client?.company || "Your Company";
  const month    = reportData?.monthLabel || "Current Period";
  const pack     = normalizePack(client?.client_pack || client?.clientPack);
  const packLabel = getPackLabel(pack);
 
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
    <div class="section-header"><span class="section-icon">↑</span><h2>Performance</h2></div>
    <div class="section-body">${perf}</div>
  </div>
 
  <div class="section cash">
    <div class="section-header"><span class="section-icon">$</span><h2>Cash & Liquidity</h2></div>
    <div class="section-body">${cashNote}</div>
  </div>
 
  <div class="section risks">
    <div class="section-header"><span class="section-icon">!</span><h2>Key Risks</h2></div>
    <div class="section-body">${risks}</div>
  </div>
 
  <div class="section opps">
    <div class="section-header"><span class="section-icon">→</span><h2>Opportunities</h2></div>
    <div class="section-body">${opps}</div>
  </div>
 
  <div class="section next">
    <div class="section-header"><span class="section-icon">✓</span><h2>Next Steps</h2></div>
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


export function generateCashPDF({ client, reportData, kpis }) {
  const company  = client?.company || "Your Company";
  const month    = reportData?.monthLabel || "Current Period";
  const pack     = normalizePack(client?.client_pack || client?.clientPack);
  const note     = reportData?.cashflowNote || reportData?.packNote || "";
  const pl       = reportData?.plInputs || {};
  const isMSME   = pack === "msme";
  const isCorp   = pack === "corporate";
  const packLabel = getPackLabel(pack);
 
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


export function generateLoanPDF({ client, reportData, kpis }) {
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
  ${loanNote ? "<div style=\"margin-bottom:24px;padding:16px 18px;background:#EEF2FF;border-radius:10px;border-left:3px solid #5B4FDB\"><div style=\"font-size:10px;font-weight:700;color:#5B4FDB;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px\">Garima's Assessment</div><p style=\"font-size:14px;color:#111827;line-height:1.7;margin:0\">" + loanNote + "</p></div>" : ""}
 
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
      <span style="color:${d.done?'#059669':'#9CA3AF'}">${d.done ? "✓" : "○"}</span>
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
        ${ratios.map(r => '<tr><td>' + r.label + '</td><td><strong>' + r.value + '</strong></td><td style="color:#6B7280">' + r.benchmark + '</td><td><span class="badge ' + (r.good?"badge-done":"badge-pending") + '">' + (r.good?"Within Range":"Needs Attention") + '</span></td></tr>').join("")}
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


export function downloadInvoicePDF(inv, client) {
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
    <div class="from">Finzzup — Garima Agarwal, CA<br/>garima@finzzup.com<br/>Mumbai, India</div>
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
    ${(inv.items||[]).map(it=>'<tr><td>'+it.desc+'</td><td>'+it.qty+'</td><td style="text-align:right">'+it.unit+'</td><td style="text-align:right"><strong>'+it.total+'</strong></td></tr>').join('')}
  </tbody>
</table>
<div class="total-row">
  <div class="total-label">Total Amount</div>
  <div class="total-val">${inv.amount}</div>
</div>
<div class="footer">
  <strong>Finzzup — Garima Agarwal, CA</strong> · GSTIN: [Add GSTIN] · PAN: [Add PAN]<br/>
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


export function generateCTSummaryPDF({ client, reportData, ctData }) {
  const company  = client?.company || "Client";
  const freezone = client?.freezone || "DMCC";
  const period   = reportData?.monthLabel || "Current Period";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const ctNote   = reportData?.ctGarimaNote || "Corporate Tax summary prepared by Garima Agarwal, CA.";
  const sbrNote  = ctData?.sbrEligible
    ? "Revenue is below AED 3,000,000 — Small Business Relief eligible. Elect in CT return."
    : "Revenue exceeds AED 3,000,000 — SBR not available. Standard 9% CT applies to taxable income.";
  const rows = (ctData?.adjustments || []).map(a =>
    "<tr><td style='padding:9px 12px;font-size:12px'>" + a.item + "</td>" +
    "<td style='padding:9px 12px;font-size:12px;font-family:monospace;text-align:right;color:" + (a.sign>0?"#059669":"#EF4444") + "'>" +
    (a.sign>0?"+":"−") + "AED " + Math.abs(a.amount).toLocaleString() + "</td>" +
    "<td style='padding:9px 12px;font-size:11px;color:#6B7280'>" + (a.note||"") + "</td></tr>"
  ).join("");
  return "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>CT Summary — " + company + "</title>" +
  "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;background:white;font-size:12px}" +
  "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}" +
  ".hdr{background:linear-gradient(135deg,#4C1D95,#7C3AED);padding:32px 48px;color:white}" +
  ".hdr h1{font-size:24px;font-weight:900;margin-bottom:4px}.hdr .sub{font-size:12px;opacity:0.8}" +
  ".body{padding:32px 48px}.section{margin-bottom:28px}" +
  ".section h2{font-size:14px;font-weight:700;color:#4C1D95;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #EDE9FE}" +
  "table{width:100%;border-collapse:collapse}th{background:#F5F3FF;padding:9px 12px;font-size:11px;font-weight:700;text-align:left}" +
  "tr:nth-child(even){background:#FAFAFA}.note{background:#F5F3FF;border-left:3px solid #7C3AED;padding:12px 16px;border-radius:6px;font-size:12px;color:#4C1D95;margin-top:12px}" +
  ".kpi{display:inline-block;background:#EDE9FE;border-radius:8px;padding:10px 18px;margin:6px;text-align:center}" +
  ".kpi .val{font-size:20px;font-weight:900;color:#4C1D95}.kpi .lbl{font-size:10px;color:#7C3AED;margin-top:2px}" +
  "</style></head><body>" +
  "<div class='hdr'><h1>Corporate Tax Summary</h1><div class='sub'>" + company + " · " + freezone + " · " + period + "</div>" +
  "<div class='sub' style='margin-top:4px'>Prepared by Garima Agarwal, CA · " + now + "</div></div>" +
  "<div class='body'>" +
  "<div class='section'><h2>CT Position</h2>" +
  "<div><span class='kpi'><div class='val'>" + ctData.effectiveCTRate + "%</div><div class='lbl'>Effective CT Rate</div></span>" +
  "<span class='kpi'><div class='val'>AED " + (ctData.ctPayable||0).toLocaleString() + "</div><div class='lbl'>CT Payable</div></span>" +
  "<span class='kpi'><div class='val'>" + ctData.ctDue + "</div><div class='lbl'>Return Due</div></span>" +
  "<span class='kpi'><div class='val'>" + ctData.qualifyingPct + "%</div><div class='lbl'>Qualifying Income</div></span></div>" +
  "<div class='note'>" + ctNote + "</div></div>" +
  "<div class='section'><h2>Taxable Income Reconciliation</h2>" +
  "<table><thead><tr><th>Adjustment Item</th><th style='text-align:right'>Amount</th><th>Note</th></tr></thead><tbody>" + rows +
  "<tr style='font-weight:700;background:#EDE9FE'><td style='padding:9px 12px'>Taxable Income</td>" +
  "<td style='padding:9px 12px;font-family:monospace;text-align:right'>AED " + (ctData.taxableFinalIncome||0).toLocaleString() + "</td><td></td></tr>" +
  "</tbody></table></div>" +
  "<div class='section'><h2>Small Business Relief (SBR)</h2>" +
  "<table><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>" +
  "<tr><td style='padding:9px 12px'>Revenue vs AED 3M threshold</td><td style='padding:9px 12px;font-weight:700;color:" + (ctData.sbrEligible?"#059669":"#EF4444") + "'>" + (ctData.sbrEligible?"✅ Below threshold":"❌ Exceeds threshold") + "</td></tr>" +
  "<tr><td style='padding:9px 12px'>QFZP Status</td><td style='padding:9px 12px'>" + (ctData.qfzpStatus?"QFZP — cannot elect both SBR and QFZP":"Not QFZP") + "</td></tr>" +
  "</tbody></table><div class='note'>" + sbrNote + "</div></div>" +
  "</div></body></html>";
}


export function generateRevReconPDF({ client, reportData }) {
  const company  = client?.company || "Client";
  const trnVAT   = client?.trnVAT  || "—";
  const freezone = client?.freezone || "DMCC";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const rr       = reportData?.revRecon || {};
  const period   = rr.period   || reportData?.monthLabel || "Current Quarter";
  const note     = rr.garimaNote || "Revenue reconciliation note not yet added. Please update in the admin panel UAE tab.";
 
  const rows = (rr.rows && rr.rows.length)
    ? rr.rows
    : [
        { desc:"Standard-rated UAE sales (5% VAT)",           ifrs:1500000, vat:1500000, diff:0,      explanation:"Identical — fully taxable in both IFRS and VAT" },
        { desc:"Export sales — zero-rated",                   ifrs:350000,  vat:350000,  diff:0,      explanation:"Same amount — zero-rated in VAT, full revenue in IFRS" },
        { desc:"Advance/deposits received (unearned revenue)", ifrs:0,       vat:85000,   diff:-85000, explanation:"VAT point triggered on receipt; IFRS revenue deferred until delivery" },
        { desc:"Services — % completion basis",               ifrs:120000,  vat:0,        diff:120000, explanation:"IFRS recognises by % completion; VAT point on invoice date (next quarter)" },
        { desc:"Exempt supplies",                             ifrs:45000,   vat:0,        diff:45000,  explanation:"IFRS records as revenue; VAT exempt — not included in VAT return" },
        { desc:"Credit notes issued",                        ifrs:-28000,  vat:-28000,  diff:0,      explanation:"Both reduce revenue / output VAT equally" },
      ];
 
  const totalIFRS = rows.reduce((s,r)=>s+Number(r.ifrs||0),0);
  const totalVAT  = rows.reduce((s,r)=>s+Number(r.vat||0),0);
  const totalDiff = totalIFRS - totalVAT;
 
  const tableRows = rows.map((r,i)=>{
    const diff = Number(r.ifrs||0) - Number(r.vat||0);
    const diffColor = diff===0?"#6B7280":diff>0?"#2563EB":"#D97706";
    const diffLabel = diff===0?"—":diff>0?`+AED ${Math.abs(diff).toLocaleString()}`:`−AED ${Math.abs(diff).toLocaleString()}`;
    return `<tr style="background:${i%2===0?"#fff":"#fafafa"}">
      <td style="padding:10px 12px;font-size:12px;color:#374151;border-left:3px solid ${diff===0?"#E5E7EB":diff>0?"#2563EB":"#D97706"}">${r.desc}</td>
      <td style="padding:10px 12px;font-family:monospace;font-weight:600;color:#111827;text-align:right">AED ${Number(r.ifrs||0).toLocaleString()}</td>
      <td style="padding:10px 12px;font-family:monospace;font-weight:600;color:#111827;text-align:right">AED ${Number(r.vat||0).toLocaleString()}</td>
      <td style="padding:10px 12px;font-family:monospace;font-weight:700;color:${diffColor};text-align:right">${diffLabel}</td>
      <td style="padding:10px 12px;font-size:11px;color:#6B7280;line-height:1.5">${r.explanation||"—"}</td>
    </tr>`;
  }).join("");
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Revenue Reconciliation (IFRS vs VAT) — ${company} — ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
.header { background:linear-gradient(135deg,#1E3A5F,#0891B2); padding:36px 48px; color:white; }
.header h1 { font-size:26px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:32px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:860px; margin:0 auto; }
.explain-box { background:#EFF6FF; border:1px solid #BFDBFE; border-left:4px solid #2563EB; border-radius:8px; padding:14px 16px; margin-bottom:20px; font-size:11.5px; color:#1E3A5F; line-height:1.75; }
.explain-box strong { color:#1D4ED8; }
.kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:14px 16px; text-align:center; }
.kpi-card .val { font-size:22px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.section-title { font-size:16px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #0891B2; padding-left:12px; }
table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:8px; }
th { background:#1E3A5F; color:white; padding:10px 12px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
th.num { text-align:right; }
td { border-bottom:1px solid #F3F4F6; }
tr.total td { background:#F0FDF4; font-weight:800; color:#065f46; border-top:2px solid #059669; padding:10px 12px; font-family:monospace; }
tr.total td:first-child { font-family:Arial,sans-serif; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:20px 0; font-size:12px; color:#78350F; line-height:1.85; }
.garima strong { color:#92400E; }
.disclaimer { font-size:10px; color:#9CA3AF; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; padding:10px 12px; margin-top:16px; line-height:1.6; }
.footer { margin-top:14px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
 
<div class="header">
  <h1>Revenue Reconciliation</h1>
  <div class="sub">IFRS Accounting Revenue vs UAE VAT Return Revenue — ${company}</div>
  <div class="meta">
    <div class="meta-item"><label>Period</label>${period}</div>
    <div class="meta-item"><label>TRN (VAT)</label>${trnVAT}</div>
    <div class="meta-item"><label>Free Zone</label>${freezone}</div>
    <div class="meta-item"><label>IFRS Revenue</label>AED ${totalIFRS.toLocaleString()}</div>
    <div class="meta-item"><label>VAT Revenue</label>AED ${totalVAT.toLocaleString()}</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
  </div>
</div>
 
<div class="page">
  <div class="explain-box">
    <strong>Why do IFRS and VAT revenue differ?</strong> IFRS (accounting) revenue is recognised based on performance obligations — when control of goods/services transfers to the customer. UAE VAT revenue is based on the tax point — typically the earlier of invoice date or date of supply. This creates timing differences (e.g. advances, % completion contracts) and scope differences (e.g. exempt supplies, non-taxable items). The FTA compares your VAT returns against your audited P&amp;L — unexplained differences trigger audit inquiries. This reconciliation is your explanation on file.
  </div>
 
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="val" style="color:#2563EB">AED ${totalIFRS.toLocaleString()}</div>
      <div class="lbl">IFRS Revenue (Books)</div>
    </div>
    <div class="kpi-card">
      <div class="val" style="color:#0891B2">AED ${totalVAT.toLocaleString()}</div>
      <div class="lbl">VAT Return Revenue</div>
    </div>
    <div class="kpi-card">
      <div class="val" style="color:${Math.abs(totalDiff)<1000?"#059669":totalDiff>0?"#2563EB":"#D97706"}">
        ${totalDiff===0?"Nil":totalDiff>0?("+AED " + Math.abs(totalDiff).toLocaleString()):("−AED " + Math.abs(totalDiff).toLocaleString())}
      </div>
      <div class="lbl">Net Difference (Explained)</div>
    </div>
  </div>
 
  <div class="section-title">Reconciliation Table — ${period}</div>
  <table>
    <thead>
      <tr>
        <th style="width:28%">Description</th>
        <th class="num" style="width:14%">IFRS Amount (AED)</th>
        <th class="num" style="width:14%">VAT Amount (AED)</th>
        <th class="num" style="width:13%">Difference</th>
        <th style="width:31%">Explanation</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total">
        <td><strong>TOTAL</strong></td>
        <td style="text-align:right"><strong>AED ${totalIFRS.toLocaleString()}</strong></td>
        <td style="text-align:right"><strong>AED ${totalVAT.toLocaleString()}</strong></td>
        <td style="text-align:right;color:${Math.abs(totalDiff)<1000?"#059669":"#D97706"}">
          <strong>${totalDiff===0?"Fully Reconciled":totalDiff>0?("+AED " + Math.abs(totalDiff).toLocaleString()):("−AED " + Math.abs(totalDiff).toLocaleString())}</strong>
        </td>
        <td style="font-size:11px;color:#065f46"><strong>${Math.abs(totalDiff)<1000?"✓ No unexplained differences":"All differences explained above"}</strong></td>
      </tr>
    </tbody>
  </table>
 
  <div class="garima">
    <strong>Note from Garima — Revenue Reconciliation (${period}):</strong><br/>
    ${note}
  </div>
 
  <div style="background:#F0FDF4;border:1px solid #86EFAC;border-left:4px solid #059669;border-radius:8px;padding:12px 14px;font-size:11px;color:#065f46;line-height:1.7">
    <strong>FTA Audit Note:</strong> This reconciliation is maintained as part of our VAT compliance documentation. The FTA cross-references VAT return totals against audited financial statements. All differences shown above are explainable and documented. No unexplained revenue has been omitted from VAT returns.
  </div>
 
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This reconciliation is prepared for internal compliance and FTA audit readiness purposes. It should be reviewed by a licensed UAE tax advisor before submission. Garima Agarwal, CA (M.No. 160944) · Finzzup · ${now}
  </div>
  <div class="footer">
    <span style="font-weight:800;color:#0891B2">Finzzup</span>
    <span>${company} · Revenue Reconciliation (IFRS vs VAT) · ${period} · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944</span>
  </div>
</div>
</body></html>`;
}


export function generateWorkingCapitalPDF({ client, reportData }) {
  const company  = client?.company || "Client";
  const freezone = client?.freezone || "DMCC";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const wc       = reportData?.workingCapital || {};
  const period   = wc.period || reportData?.monthLabel || "Current Period";
  const note     = wc.garimaNote || "Working capital note not yet added. Please update in the admin panel.";
 
  const dso = Number(wc.dso || 38);
  const dio = Number(wc.dio || 15);
  const dpo = Number(wc.dpo || 28);
  const ccc = dso + dio - dpo;
 
  const arRows = (wc.arAging && wc.arAging.length)
    ? wc.arAging
    : [
        { customer:"Gulf Fresh Foods LLC",    current:125000, d30:0,     d60:0,     d90:0,     risk:"Low",    action:"On schedule" },
        { customer:"Emarat Trading Co.",      current:95000,  d30:0,     d60:0,     d90:0,     risk:"Low",    action:"On schedule" },
        { customer:"Desert Star Logistics",   current:0,      d30:82500, d60:0,     d90:0,     risk:"Medium", action:"Send reminder" },
        { customer:"Al Habtoor Properties",  current:0,      d30:35000, d60:42500, d90:0,     risk:"Medium", action:"Follow up call" },
        { customer:"Al Manara Group",         current:0,      d30:0,     d60:0,     d90:87500, risk:"High",   action:"Demand letter NOW" },
      ];
 
  const totalAR      = arRows.reduce((s,r)=>s+Number(r.current||0)+Number(r.d30||0)+Number(r.d60||0)+Number(r.d90||0),0);
  const total90plus  = arRows.reduce((s,r)=>s+Number(r.d90||0),0);
 
  const riskColor = r => r==="High"?"#EF4444":r==="Medium"?"#D97706":"#059669";
  const riskBg    = r => r==="High"?"#FEF2F2":r==="Medium"?"#FFFBEB":"#ECFDF5";
 
  const arTableRows = arRows.map((r,i)=>{
    const total = Number(r.current||0)+Number(r.d30||0)+Number(r.d60||0)+Number(r.d90||0);
    const pct   = totalAR > 0 ? ((total/totalAR)*100).toFixed(1) : "0.0";
    return `<tr style="background:${i%2===0?"#fff":"#fafafa"};border-left:3px solid ${riskColor(r.risk)}">
      <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111827">${r.customer}</td>
      <td style="padding:9px 12px;font-family:monospace;text-align:right;color:${Number(r.current||0)>0?"#059669":"#9CA3AF"}">${Number(r.current||0)>0?"AED "+Number(r.current).toLocaleString():"—"}</td>
      <td style="padding:9px 12px;font-family:monospace;text-align:right;color:${Number(r.d30||0)>0?"#D97706":"#9CA3AF"}">${Number(r.d30||0)>0?"AED "+Number(r.d30).toLocaleString():"—"}</td>
      <td style="padding:9px 12px;font-family:monospace;text-align:right;color:${Number(r.d60||0)>0?"#EF4444":"#9CA3AF"}">${Number(r.d60||0)>0?"AED "+Number(r.d60).toLocaleString():"—"}</td>
      <td style="padding:9px 12px;font-family:monospace;text-align:right;font-weight:700;color:${Number(r.d90||0)>0?"#991B1B":"#9CA3AF"}">${Number(r.d90||0)>0?"AED "+Number(r.d90).toLocaleString():"—"}</td>
      <td style="padding:9px 12px;font-family:monospace;text-align:right;font-weight:700;color:#111827">AED ${total.toLocaleString()}</td>
      <td style="padding:9px 12px;font-size:11px;text-align:right;color:#6B7280">${pct}%</td>
      <td style="padding:9px 12px"><span style="background:${riskBg(r.risk)};color:${riskColor(r.risk)};font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px">${r.risk}</span></td>
      <td style="padding:9px 12px;font-size:11px;color:${r.risk==="High"?"#991B1B":"#374151"};font-weight:${r.risk==="High"?"700":"400"}">${r.action}</td>
    </tr>`;
  }).join("");
 
  const totalCurrent = arRows.reduce((s,r)=>s+Number(r.current||0),0);
  const total30      = arRows.reduce((s,r)=>s+Number(r.d30||0),0);
  const total60      = arRows.reduce((s,r)=>s+Number(r.d60||0),0);
 
  const apRows = (wc.apSchedule && wc.apSchedule.length)
    ? wc.apSchedule
    : [
        { supplier:"Al Rashidi Brothers Trading", amount:65000, terms:"Net 30", due:"15 Apr 2026", daysLeft:15, priority:"Upcoming" },
        { supplier:"Emirates Paper & Packaging",  amount:48000, terms:"Net 30", due:"20 Apr 2026", daysLeft:20, priority:"On Track" },
        { supplier:"Mashreq Bank — Loan EMI",     amount:35000, terms:"Monthly",due:"01 Apr 2026", daysLeft:-1, priority:"Overdue"  },
        { supplier:"Gulf Freight Solutions",      amount:28500, terms:"Net 45", due:"30 Apr 2026", daysLeft:30, priority:"On Track" },
        { supplier:"DEWA (Utilities)",            amount:12000, terms:"Monthly",due:"10 Apr 2026", daysLeft:10, priority:"Upcoming" },
      ];
 
  const apTableRows = apRows.map((r,i)=>{
    const ov = r.priority==="Overdue";
    return `<tr style="background:${ov?"#FEF2F2":i%2===0?"#fff":"#fafafa"}">
      <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111827">${r.supplier}</td>
      <td style="padding:9px 12px;font-family:monospace;font-weight:700;color:#111827;text-align:right">AED ${Number(r.amount||0).toLocaleString()}</td>
      <td style="padding:9px 12px;font-size:11px;color:#6B7280">${r.terms||"—"}</td>
      <td style="padding:9px 12px;font-size:11px;color:#374151">${r.due||"—"}</td>
      <td style="padding:9px 12px"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:${ov?"#FEF2F2":r.priority==="Upcoming"?"#FFFBEB":"#ECFDF5"};color:${ov?"#EF4444":r.priority==="Upcoming"?"#D97706":"#059669"}">${r.priority}</span></td>
    </tr>`;
  }).join("");
 
  const totalAP = apRows.reduce((s,r)=>s+Number(r.amount||0),0);
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Working Capital Report — ${company} — ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .pb { page-break-before:always; } }
.header { background:linear-gradient(135deg,#065f46,#059669,#0891B2); padding:36px 48px; color:white; }
.header h1 { font-size:26px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:32px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:860px; margin:0 auto; }
.ccc-visual { background:#F0FDF4; border:2px solid #059669; border-radius:12px; padding:22px; margin-bottom:24px; }
.ccc-formula { display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.ccc-box { background:white; border:2px solid #059669; border-radius:10px; padding:12px 20px; text-align:center; min-width:110px; }
.ccc-box .val { font-size:28px; font-weight:900; color:#059669; font-family:monospace; }
.ccc-box .lbl { font-size:9px; font-weight:700; color:#065f46; text-transform:uppercase; letter-spacing:0.05em; margin-top:3px; }
.ccc-op { font-size:22px; font-weight:700; color:#059669; }
.ccc-result { background:#059669; color:white; border-radius:10px; padding:14px 24px; text-align:center; min-width:130px; }
.ccc-result .val { font-size:32px; font-weight:900; font-family:monospace; }
.ccc-result .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-top:3px; opacity:0.85; }
.ccc-notes { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; font-size:11px; color:#065f46; }
.ccc-note { background:white; border-radius:7px; padding:9px 12px; line-height:1.6; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:13px; text-align:center; }
.kpi-card .val { font-size:20px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.kpi-card .bench { font-size:9px; color:#9CA3AF; margin-top:3px; }
.section-title { font-size:15px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #059669; padding-left:12px; }
table { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px; }
th { background:#064E3B; color:white; padding:8px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
th.num { text-align:right; }
td { border-bottom:1px solid #F3F4F6; }
tr.total-row td { background:#ECFDF5; font-weight:800; color:#065f46; border-top:2px solid #059669; padding:9px 10px; font-family:monospace; }
tr.total-row td:first-child { font-family:Arial,sans-serif; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.85; }
.insight { background:#F0F9FF; border:1px solid #BAE6FD; border-left:4px solid #0891B2; border-radius:7px; padding:11px 14px; margin:10px 0; font-size:11px; color:#0C4A6E; line-height:1.6; }
.alert  { background:#FEF2F2; border:1px solid #FCA5A5; border-left:4px solid #EF4444; border-radius:7px; padding:11px 14px; margin:10px 0; font-size:11px; color:#991B1B; line-height:1.6; }
.footer { margin-top:14px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
 
<div class="header">
  <h1>Working Capital Management Report</h1>
  <div class="sub">Cash Conversion Cycle · AR Aging · AP Schedule · Liquidity Analysis — ${company} (${freezone})</div>
  <div class="meta">
    <div class="meta-item"><label>Period</label>${period}</div>
    <div class="meta-item"><label>CCC</label>${ccc} days</div>
    <div class="meta-item"><label>Total AR</label>AED ${totalAR.toLocaleString()}</div>
    <div class="meta-item"><label>Total AP</label>AED ${totalAP.toLocaleString()}</div>
    <div class="meta-item"><label>90+ Days AR</label>AED ${total90plus.toLocaleString()}</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
  </div>
</div>
 
<div class="page">
 
  <div class="garima"><strong>Note from Garima:</strong><br/>${note}</div>
 
  <!-- CCC Visual -->
  <div class="ccc-visual">
    <div style="font-size:12px;font-weight:800;color:#065f46;text-align:center;margin-bottom:14px">
      Cash Conversion Cycle — DSO + DIO − DPO = CCC
    </div>
    <div class="ccc-formula">
      <div class="ccc-box"><div class="val">${dso}</div><div class="lbl">DSO (Days)</div></div>
      <div class="ccc-op">+</div>
      <div class="ccc-box"><div class="val">${dio}</div><div class="lbl">DIO (Days)</div></div>
      <div class="ccc-op">−</div>
      <div class="ccc-box"><div class="val">${dpo}</div><div class="lbl">DPO (Days)</div></div>
      <div class="ccc-op">=</div>
      <div class="ccc-result"><div class="val">${ccc}</div><div class="lbl">CCC (Days)</div></div>
    </div>
    <div class="ccc-notes">
      <div class="ccc-note"><strong>DSO ${dso} days</strong> — Days to collect from customers. Target: &lt;35 days. ${dso>35?"Above target — collections need attention.":"Within target."}</div>
      <div class="ccc-note"><strong>DIO ${dio} days</strong> — Days inventory held before sale. ${dio<=20?"✓ Excellent for trading company.":"Monitor stock levels."} Industry median: 20–30 days.</div>
      <div class="ccc-note"><strong>DPO ${dpo} days</strong> — Days to pay suppliers. ${dpo<35?"Scope to extend to 45 days — would release additional working capital.":"Well managed."}</div>
    </div>
  </div>
 
  <div class="kpi-row">
    <div class="kpi-card"><div class="val" style="color:#2563EB">${dso}d</div><div class="lbl">DSO</div><div class="bench">Target &lt;35 · Industry 30–45</div></div>
    <div class="kpi-card"><div class="val" style="color:#059669">${dio}d</div><div class="lbl">DIO</div><div class="bench">Excellent · Industry 20–30</div></div>
    <div class="kpi-card"><div class="val" style="color:#D97706">${dpo}d</div><div class="lbl">DPO</div><div class="bench">${dpo<35?"Extend to 45d":"Good"} · Industry 30–45</div></div>
    <div class="kpi-card"><div class="val" style="color:${ccc<=30?"#059669":ccc<=45?"#D97706":"#EF4444"}">${ccc}d</div><div class="lbl">CCC</div><div class="bench">Lower = better · Target &lt;30</div></div>
  </div>
 
  <!-- AR Aging -->
  <div class="section-title pb">AR Aging Schedule — ${period}</div>
  <table>
    <thead>
      <tr>
        <th style="width:20%">Customer</th>
        <th class="num" style="width:11%">Current (0–30d)</th>
        <th class="num" style="width:10%">31–60 days</th>
        <th class="num" style="width:10%">61–90 days</th>
        <th class="num" style="width:10%">90+ days</th>
        <th class="num" style="width:10%">Total AED</th>
        <th class="num" style="width:7%">% of AR</th>
        <th style="width:7%">Risk</th>
        <th style="width:15%">Action</th>
      </tr>
    </thead>
    <tbody>
      ${arTableRows}
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td style="text-align:right"><strong>AED ${totalCurrent.toLocaleString()}</strong></td>
        <td style="text-align:right"><strong>AED ${total30.toLocaleString()}</strong></td>
        <td style="text-align:right"><strong>AED ${total60.toLocaleString()}</strong></td>
        <td style="text-align:right;color:#EF4444"><strong>AED ${total90plus.toLocaleString()}</strong></td>
        <td style="text-align:right"><strong>AED ${totalAR.toLocaleString()}</strong></td>
        <td style="text-align:right"><strong>100%</strong></td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
  ${total90plus>0?('<div class="alert">⚠️ <strong>AED '+total90plus.toLocaleString()+' is 90+ days overdue ('+((total90plus/totalAR)*100).toFixed(1)+'% of total AR).</strong> Under IFRS 9 ECL model, provision at minimum 50% = AED '+Math.round(total90plus*0.5).toLocaleString()+' required if not collected within 30 days. Issue demand letter immediately.</div>'):""}
 
  <!-- AP Schedule -->
  <div class="section-title" style="margin-top:24px">AP Schedule — Outstanding Payables</div>
  <table>
    <thead>
      <tr><th style="width:30%">Supplier</th><th class="num">Amount AED</th><th>Terms</th><th>Due Date</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${apTableRows}
      <tr class="total-row">
        <td><strong>TOTAL PAYABLES</strong></td>
        <td style="text-align:right"><strong>AED ${totalAP.toLocaleString()}</strong></td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
 
  <div style="margin-top:16px">
    <div class="insight"><strong>💡 Working Capital Opportunity:</strong> DSO ${dso} days vs DPO ${dpo} days — ${dso>dpo?"you collect slower than you pay. Priority: reduce DSO and extend DPO to improve cash position.":"collection is faster than payment — strong position. Maintain this discipline."}</div>
    ${total90plus>0?('<div class="alert"><strong>🔴 Collection Priority:</strong> AED '+total90plus.toLocaleString()+' at 90+ days. Every 30-day delay in collection increases credit loss risk. Issue demand letter, offer structured payment plan, consider withholding next delivery.</div>'):""}
  </div>
 
  <div class="footer">
    <span style="font-weight:800;color:#059669">Finzzup</span>
    <span>${company} · Working Capital Report · ${period} · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944 · ${now}</span>
  </div>
</div>
</body></html>`;
}


export function generateVerticalAnalysisPDF({ client, reportData }) {
  const company  = client?.company  || "Client";
  const freezone = client?.freezone || "DMCC";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const va       = reportData?.verticalAnalysis || {};
  const period   = va.period  || reportData?.monthLabel || "Current Period";
  const note     = va.garimaNote || "Vertical analysis note not yet added.";
 
  // Build rows — use admin data or defaults
  const defaultRows = [
    { label:"Revenue",              ifrs:1850000, prev:1400000, cogs:false, subtotal:false, total:false, section:"revenue" },
    { label:"Cost of Goods Sold",   ifrs:1017500, prev:812000,  cogs:true,  subtotal:false, total:false, section:"cogs"    },
    { label:"  Direct Materials",   ifrs:750000,  prev:582000,  cogs:false, subtotal:false, total:false, section:"cogs"    },
    { label:"  Direct Labour",      ifrs:185000,  prev:140000,  cogs:false, subtotal:false, total:false, section:"cogs"    },
    { label:"  Direct Overheads",   ifrs:82500,   prev:90000,   cogs:false, subtotal:false, total:false, section:"cogs"    },
    { label:"Gross Profit",         ifrs:832500,  prev:588000,  cogs:false, subtotal:true,  total:false, section:"gp"      },
    { label:"Salaries & Benefits",  ifrs:375000,  prev:360000,  cogs:false, subtotal:false, total:false, section:"opex"    },
    { label:"Rent & Utilities",     ifrs:52000,   prev:52000,   cogs:false, subtotal:false, total:false, section:"opex"    },
    { label:"Marketing & Sales",    ifrs:48000,   prev:42000,   cogs:false, subtotal:false, total:false, section:"opex"    },
    { label:"Professional Fees",    ifrs:35000,   prev:30000,   cogs:false, subtotal:false, total:false, section:"opex"    },
    { label:"Other OpEx",           ifrs:51500,   prev:48000,   cogs:false, subtotal:false, total:false, section:"opex"    },
    { label:"Total OpEx",           ifrs:561500,  prev:532000,  cogs:false, subtotal:true,  total:false, section:"opex"    },
    { label:"EBITDA",               ifrs:271000,  prev:56000,   cogs:false, subtotal:true,  total:false, section:"ebitda"  },
    { label:"Depreciation",         ifrs:18000,   prev:18000,   cogs:false, subtotal:false, total:false, section:"below"   },
    { label:"Finance Costs",        ifrs:12000,   prev:12000,   cogs:false, subtotal:false, total:false, section:"below"   },
    { label:"Net Profit (PAT)",     ifrs:241000,  prev:26000,   cogs:false, subtotal:false, total:true,  section:"pat"     },
  ];
 
  const rows = (va.rows && va.rows.length >= 5) ? va.rows : defaultRows;
  const revenue     = Number(rows[0]?.ifrs || 1850000);
  const prevRevenue = Number(rows[0]?.prev || 1400000);
 
  const sectionColors = {
    revenue:"#EFF6FF", cogs:"#FEF2F2", gp:"#ECFDF5",
    opex:"#FFF7ED", ebitda:"#EFF6FF", below:"#F9FAFB", pat:"#F0FDF4",
  };
  const sectionBorder = {
    revenue:"#2563EB", cogs:"#EF4444", gp:"#059669",
    opex:"#D97706", ebitda:"#2563EB", below:"#E5E7EB", pat:"#059669",
  };
 
  const tableRows = rows.map((r,i) => {
    const pct      = revenue > 0 ? ((Number(r.ifrs||0)/revenue)*100).toFixed(1) : "—";
    const prevPct  = prevRevenue > 0 ? ((Number(r.prev||0)/prevRevenue)*100).toFixed(1) : "—";
    const pp       = (revenue > 0 && prevRevenue > 0)
      ? (((Number(r.ifrs||0)/revenue) - (Number(r.prev||0)/prevRevenue))*100).toFixed(1)
      : "—";
    const ppColor  = pp === "—" ? "#6B7280"
      : (r.section==="cogs"||r.section==="opex")
        ? (Number(pp) < 0 ? "#059669" : "#EF4444")
        : (Number(pp) > 0 ? "#059669" : "#EF4444");
    const ppLabel  = pp === "—" ? "—" : `${Number(pp)>0?"+":""}${pp}pp`;
 
    const isTotal    = r.total;
    const isSubtotal = r.subtotal;
    const indent     = r.label?.startsWith("  ");
    const bg = isTotal ? "#ECFDF5" : isSubtotal ? `${sectionColors[r.section]||"#F9FAFB"}` : (i%2===0?"#fff":"#fafafa");
    const fw = isTotal ? "800" : isSubtotal ? "700" : "400";
    const borderL = isSubtotal || isTotal ? `3px solid ${sectionBorder[r.section]||"#E5E7EB"}` : "none";
 
    return `<tr style="background:${bg};border-left:${borderL}${isTotal?";border-top:2px solid #059669":""}">
      <td style="padding:${isSubtotal||isTotal?"10":"8"}px 12px;font-size:11.5px;font-weight:${fw};color:${isTotal?"#065f46":"#374151"};padding-left:${indent?"24":"12"}px">${r.label?.trim()}</td>
      <td style="padding:8px 10px;font-family:monospace;font-weight:${fw};color:#111827;text-align:right">AED ${Number(r.ifrs||0).toLocaleString()}</td>
      <td style="padding:8px 10px;font-family:monospace;font-weight:700;color:${r.section==="cogs"||r.section==="opex"?"#EF4444":"#059669"};text-align:right">${pct}%</td>
      <td style="padding:8px 10px;font-family:monospace;font-weight:${fw};color:#6B7280;text-align:right">AED ${Number(r.prev||0).toLocaleString()}</td>
      <td style="padding:8px 10px;font-family:monospace;color:#6B7280;text-align:right">${prevPct}%</td>
      <td style="padding:8px 10px;font-family:monospace;font-weight:700;color:${ppColor};text-align:right">${Number(pp)>0?"▲":"▼"} ${ppLabel}</td>
    </tr>`;
  }).join("");
 
  // GP Ratio benchmark
  const gpRow     = rows.find(r=>r.section==="gp");
  const gpAmt     = Number(gpRow?.ifrs || 832500);
  const gpPct     = revenue > 0 ? ((gpAmt/revenue)*100).toFixed(1) : "—";
  const gpPrevPct = prevRevenue > 0 ? ((Number(gpRow?.prev||588000)/prevRevenue)*100).toFixed(1) : "—";
  const ebitdaRow = rows.find(r=>r.section==="ebitda");
  const ebitdaPct = revenue > 0 ? ((Number(ebitdaRow?.ifrs||271000)/revenue)*100).toFixed(1) : "—";
  const patRow    = rows.find(r=>r.section==="pat");
  const patPct    = revenue > 0 ? ((Number(patRow?.ifrs||241000)/revenue)*100).toFixed(1) : "—";
 
  const benchmarks = va.benchmarks || [
    { metric:"Gross Margin",    yours:gpPct+"%",    industry:"38–42%", status:Number(gpPct)>=42?"Above":"Watch" },
    { metric:"EBITDA Margin",   yours:ebitdaPct+"%",industry:"8–12%",  status:Number(ebitdaPct)>=10?"Above":"Watch" },
    { metric:"Net Margin",      yours:patPct+"%",   industry:"5–8%",   status:Number(patPct)>=7?"Above":"Watch" },
    { metric:"OpEx % Revenue",  yours:((561500/revenue)*100).toFixed(1)+"%",industry:"35–40%", status:"Above Avg" },
  ];
 
  const benchRows = benchmarks.map((b,i)=>`<tr style="background:${i%2===0?"#fff":"#fafafa"}">
    <td style="padding:9px 12px;font-weight:600;color:#111827">${b.metric}</td>
    <td style="padding:9px 12px;font-family:monospace;font-weight:800;color:#059669;text-align:right">${b.yours}</td>
    <td style="padding:9px 12px;font-size:11px;color:#6B7280;text-align:center">${b.industry}</td>
    <td style="padding:9px 12px;text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:${b.status==="Above"||b.status==="Above Avg"?"#ECFDF5":"#FFFBEB"};color:${b.status==="Above"||b.status==="Above Avg"?"#059669":"#D97706"}">${b.status==="Above"||b.status==="Above Avg"?"✓ "+b.status:"⚠ "+b.status}</span></td>
  </tr>`).join("");
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Vertical Analysis Report — ${company} — ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .pb { page-break-before:always; } }
.header { background:linear-gradient(135deg,#1a3a8f,#2563EB,#7C3AED); padding:36px 48px; color:white; }
.header h1 { font-size:26px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:32px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:860px; margin:0 auto; }
.explain-box { background:#EFF6FF; border:1px solid #BFDBFE; border-left:4px solid #2563EB; border-radius:8px; padding:12px 16px; margin-bottom:18px; font-size:11px; color:#1E3A5F; line-height:1.75; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:13px; text-align:center; }
.kpi-card .val { font-size:20px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.kpi-card .chg { font-size:10px; font-weight:700; margin-top:4px; }
.section-title { font-size:15px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #2563EB; padding-left:12px; }
table { width:100%; border-collapse:collapse; margin-bottom:8px; }
th { background:#1E3A5F; color:white; padding:9px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
th.num { text-align:right; }
td { border-bottom:1px solid #F3F4F6; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.85; }
.footer { margin-top:14px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
 
<div class="header">
  <h1>Vertical Analysis Report</h1>
  <div class="sub">Common-Size P&amp;L · Every Line as % of Revenue · GP Ratio vs Industry — ${company} (${freezone})</div>
  <div class="meta">
    <div class="meta-item"><label>Period</label>${period}</div>
    <div class="meta-item"><label>Revenue</label>AED ${revenue.toLocaleString()}</div>
    <div class="meta-item"><label>Gross Margin</label>${gpPct}%</div>
    <div class="meta-item"><label>Net Margin</label>${patPct}%</div>
    <div class="meta-item"><label>Base</label>Revenue = 100%</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
  </div>
</div>
 
<div class="page">
  <div class="explain-box">
    <strong>What is Vertical Analysis?</strong> Every line item is expressed as a percentage of revenue (the base = 100%). This reveals the true cost structure of the business regardless of size, and makes it easy to compare periods and benchmark against industry. The "Change (pp)" column shows percentage point movement — a cost line moving from 30% to 28% of revenue is a 2pp improvement, even if the absolute amount increased.
  </div>
 
  <div class="kpi-row">
    <div class="kpi-card"><div class="val" style="color:#2563EB">${gpPct}%</div><div class="lbl">Gross Margin</div><div class="chg" style="color:${Number(gpPct)>Number(gpPrevPct)?"#059669":"#EF4444"}">${Number(gpPct)>Number(gpPrevPct)?"▲":"▼"} vs ${gpPrevPct}% prior</div></div>
    <div class="kpi-card"><div class="val" style="color:#059669">${ebitdaPct}%</div><div class="lbl">EBITDA Margin</div><div class="chg" style="color:#059669">▲ Strong improvement</div></div>
    <div class="kpi-card"><div class="val" style="color:#7C3AED">${patPct}%</div><div class="lbl">Net Profit Margin</div><div class="chg" style="color:#059669">▲ Best quarter</div></div>
    <div class="kpi-card"><div class="val" style="color:#D97706">${((Number(rows.find(r=>r.section==="opex"&&r.subtotal)?.ifrs||561500)/revenue)*100).toFixed(1)}%</div><div class="lbl">OpEx % Revenue</div><div class="chg" style="color:#059669">▲ Improving efficiency</div></div>
  </div>
 
  <div class="section-title">Common-Size P&amp;L — ${period} vs Prior Period</div>
  <table>
    <thead>
      <tr>
        <th style="width:30%">Line Item</th>
        <th class="num" style="width:15%">Current AED</th>
        <th class="num" style="width:10%">% of Rev</th>
        <th class="num" style="width:15%">Prior AED</th>
        <th class="num" style="width:10%">% of Rev</th>
        <th class="num" style="width:10%">Change (pp)</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
 
  <div class="garima"><strong>Note from Garima:</strong><br/>${note}</div>
 
  <div class="section-title pb">GP Ratio — Industry Benchmark Comparison</div>
  <table>
    <thead>
      <tr><th style="width:30%">Metric</th><th class="num" style="width:20%">Your Business</th><th style="width:25%;text-align:center">UAE Industry Range (${freezone} peers)</th><th style="width:25%;text-align:center">Assessment</th></tr>
    </thead>
    <tbody>${benchRows}</tbody>
  </table>
 
  <div class="footer">
    <span style="font-weight:800;color:#2563EB">Finzzup</span>
    <span>${company} · Vertical Analysis Report · ${period} · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944 · ${now}</span>
  </div>
</div>
</body></html>`;
}


export function generateQFZPSubstancePDF({ client, reportData }) {
  const company   = client?.company  || "Client";
  const freezone  = client?.freezone || "DMCC";
  const trnCT     = client?.trnCT    || "—";
  const now       = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const qd        = reportData?.qfzpSubstance || {};
  const period    = qd.period || reportData?.monthLabel || "Current Period";
  const note      = qd.garimaNote || "QFZP substance note not yet added.";
  const score     = Number(qd.overallScore || reportData?.qfzp?.qfzpScore || 82);
 
  const fzDetails = {
    DMCC:  { name:"Dubai Multi Commodities Centre", regulator:"DMCC Authority"  },
    JAFZA: { name:"Jebel Ali Free Zone",             regulator:"JAFZA Authority" },
    ADGM:  { name:"Abu Dhabi Global Market",         regulator:"ADGM"           },
    RAK:   { name:"RAK Economic Zone",               regulator:"RAKEZ"          },
    DIFC:  { name:"Dubai Int'l Financial Centre",    regulator:"DIFC Authority" },
  };
  const fz = fzDetails[freezone] || fzDetails.DMCC;
 
  const cigas = (qd.cigas && qd.cigas.length) ? qd.cigas : [
    { activity:"Trading — sourcing, procurement & distribution",         qualified:true,  pct:57, note:"Core activity — conducted from DMCC office" },
    { activity:"Treasury — intercompany financing (Rashidi Holdings)",   qualified:true,  pct:18, note:"Intragroup — qualifies per Art. 18 schedule" },
    { activity:"Export sales — outside UAE",                             qualified:true,  pct:17, note:"Zero-rated for VAT, qualifying for QFZP" },
    { activity:"Advisory services to mainland UAE clients",              qualified:false, pct:8,  note:"⚠ Non-qualifying — above 5% de-minimis threshold" },
  ];
 
  const substanceItems = (qd.substanceItems && qd.substanceItems.length) ? qd.substanceItems : [
    {
      pillar:"Employees",
      requirement:"Adequate number of qualified employees physically present in the free zone to conduct CIGA",
      current:qd.employeeCount||"5 full-time employees at DMCC",
      status:"met",
      evidence:["Employment contracts on file","UAE visa/work permit copies","DMCC office access records","Monthly payroll — WPS registered"],
      gap:"",
    },
    {
      pillar:"Operating Expenditure",
      requirement:"Adequate operating expenditure incurred in the free zone commensurate with the level of activities",
      current:"AED " + (qd.opexAED||"412,000") + " p.a. DMCC-based opex",
      status:"met",
      evidence:["DMCC lease invoice AED 52,000 p.a.","Utilities — DEWA / district cooling","Staff costs (payroll)","Professional fees (audit, legal, CA)"],
      gap:"",
    },
    {
      pillar:"Physical Presence",
      requirement:"Adequate physical assets — office premises in the free zone",
      current:"1,200 sq ft leased office — " + freezone + " — Lease until Dec 2026",
      status:"met",
      evidence:["DMCC lease agreement (valid)","Office floor plan","DMCC license showing registered address","Utility bills confirming occupancy"],
      gap:"",
    },
    {
      pillar:"Core Income-Generating Activities (CIGA)",
      requirement:"Core income-generating activities must be conducted in the free zone by the QFZP itself",
      current:"Trading, sourcing, treasury — all conducted from DMCC office",
      status:"watch",
      evidence:["Board meeting minutes (DMCC)","Management decisions documented","Supplier & customer contracts","Correspondence from DMCC address"],
      gap:"Mainland advisory services at 8% of revenue — above 5% de-minimis threshold. Review contract structure.",
    },
    {
      pillar:"Audited Financial Statements",
      requirement:"Mandatory annual audit and submission to free zone authority to maintain QFZP status",
      current:"FY 2025 audit in progress — submission due 30 April 2026",
      status:"action",
      evidence:["Audit firm engagement letter — on file","Management accounts signed — PENDING"],
      gap:"⚠ CRITICAL: Management accounts must be signed and sent to audit firm by 22 April 2026. Missing this deadline risks QFZP status.",
    },
  ];
 
  const statusColor = s => s==="met"?"#059669":s==="watch"?"#D97706":"#EF4444";
  const statusBg    = s => s==="met"?"#ECFDF5":s==="watch"?"#FFFBEB":"#FEF2F2";
  const statusLabel = s => s==="met"?"✓ Met":s==="watch"?"⚠ Watch":"✗ Action Required";
 
  const cigaRows = cigas.map((c,i)=>`<tr style="background:${i%2===0?"#fff":"#fafafa"}${!c.qualified?";border-left:3px solid #EF4444":""}">
    <td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111827">${c.activity}</td>
    <td style="padding:9px 12px;text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:${c.qualified?"#ECFDF5":"#FEF2F2"};color:${c.qualified?"#059669":"#EF4444"}">${c.qualified?"✓ Qualifying":"✗ Non-Qualifying"}</span></td>
    <td style="padding:9px 12px;font-family:monospace;font-weight:700;text-align:right;color:${c.qualified?"#059669":"#EF4444"}">${c.pct}%</td>
    <td style="padding:9px 12px;font-size:11px;color:#6B7280">${c.note}</td>
    <td style="padding:9px 12px;font-size:11px;font-weight:700;color:${c.qualified?"#059669":"#EF4444"}">${c.qualified?"0% CT":"9% CT"}</td>
  </tr>`).join("");
 
  const qualPct   = cigas.filter(c=>c.qualified).reduce((s,c)=>s+Number(c.pct||0),0);
  const nonQualPct = cigas.filter(c=>!c.qualified).reduce((s,c)=>s+Number(c.pct||0),0);
 
  const substanceRows = substanceItems.map((s,i)=>`
    <tr style="background:${statusBg(s.status)};border-left:3px solid ${statusColor(s.status)}">
      <td style="padding:11px 12px;font-weight:700;color:#111827">${s.pillar}</td>
      <td style="padding:11px 12px;font-size:11px;color:#374151;line-height:1.6">${s.requirement}</td>
      <td style="padding:11px 12px;font-size:11px;color:#374151">${s.current}</td>
      <td style="padding:11px 12px;text-align:center"><span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;background:white;color:${statusColor(s.status)}">${statusLabel(s.status)}</span></td>
    </tr>
    ${s.gap ? '<tr style="background:#FEF2F2"><td colspan="4" style="padding:8px 12px 10px;font-size:11px;color:#991B1B;font-weight:600">Gap: ' + s.gap + '</td></tr>' : ""}
    <tr style="background:#F9FAFB"><td colspan="4" style="padding:6px 12px 10px;font-size:10px;color:#6B7280">
      Evidence on file: ${s.evidence.join(" · ")}
    </td></tr>`).join("");
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>QFZP Substance Tracker — ${company} — ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .pb { page-break-before:always; } }
.header { background:linear-gradient(135deg,#1E3A5F,#7C3AED,#4C1D95); padding:36px 48px; color:white; }
.header h1 { font-size:26px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:28px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:860px; margin:0 auto; }
.score-box { display:flex; align-items:center; gap:24px; background:#F5F3FF; border:2px solid #7C3AED; border-radius:14px; padding:22px 28px; margin-bottom:22px; }
.score-num { font-size:56px; font-weight:900; color:#7C3AED; font-family:monospace; line-height:1; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:13px; text-align:center; }
.kpi-card .val { font-size:20px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.section-title { font-size:15px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #7C3AED; padding-left:12px; }
table { width:100%; border-collapse:collapse; margin-bottom:8px; }
th { background:#4C1D95; color:white; padding:9px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
th.num { text-align:right; }
td { border-bottom:1px solid #F3F4F6; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.85; }
.disclaimer { font-size:10px; color:#9CA3AF; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; padding:10px 12px; margin-top:14px; line-height:1.6; }
.footer { margin-top:12px; padding-top:10px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
 
<div class="header">
  <h1>QFZP Substance Tracker</h1>
  <div class="sub">Qualifying Free Zone Person — Annual Substance Review — ${company} (${freezone})</div>
  <div class="meta">
    <div class="meta-item"><label>Period</label>${period}</div>
    <div class="meta-item"><label>Free Zone</label>${fz.name}</div>
    <div class="meta-item"><label>CT TRN</label>${trnCT}</div>
    <div class="meta-item"><label>QFZP Score</label>${score}/100</div>
    <div class="meta-item"><label>Qualifying Income</label>${qualPct}%</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
  </div>
</div>
 
<div class="page">
 
  <div class="score-box">
    <div>
      <div class="score-num">${score}</div>
      <div style="font-size:11px;font-weight:700;color:#4C1D95;margin-top:4px">/100 — QFZP Compliance Score</div>
    </div>
    <div style="flex:1">
      <div style="height:12px;background:#E5E7EB;border-radius:100px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${score}%;background:${score>=80?"#059669":score>=65?"#D97706":"#EF4444"};border-radius:100px"></div>
      </div>
      <div style="font-size:12px;color:#4C1D95;line-height:1.6">
        ${score>=80?"✅ Strong compliance — maintain substance requirements and file audited financials on time."
          :score>=65?"⚠️ Good but gaps exist — address action items before next FTA review."
          :"Significant gaps — immediate action required."}
      </div>
    </div>
  </div>
 
  <div class="kpi-row">
    <div class="kpi-card"><div class="val" style="color:#059669">${qualPct}%</div><div class="lbl">Qualifying Income</div></div>
    <div class="kpi-card"><div class="val" style="color:${nonQualPct>=5?"#EF4444":"#D97706"}">${nonQualPct}%</div><div class="lbl">Non-Qualifying</div></div>
    <div class="kpi-card"><div class="val" style="color:#059669">0%</div><div class="lbl">CT Rate (QFZP)</div></div>
    <div class="kpi-card"><div class="val" style="color:#7C3AED">${substanceItems.filter(s=>s.status==="action").length}</div><div class="lbl">Action Items</div></div>
  </div>
 
  <div class="garima"><strong>Note from Garima:</strong><br/>${note}</div>
 
  <div class="section-title">CIGA Analysis — Qualifying vs Non-Qualifying Income</div>
  <table>
    <thead><tr><th style="width:35%">Activity</th><th style="width:15%;text-align:center">Classification</th><th class="num" style="width:10%">% of Rev</th><th style="width:30%">Notes</th><th style="width:10%;text-align:center">CT Rate</th></tr></thead>
    <tbody>${cigaRows}</tbody>
  </table>
  ${nonQualPct>=5?'<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-left:4px solid #EF4444;border-radius:7px;padding:10px 14px;margin:10px 0;font-size:11px;color:#991B1B">⚠️ <strong>De-minimis Alert:</strong> Non-qualifying income at ' + nonQualPct + '% of revenue — above the 5% de-minimis threshold. If this exceeds 5% in any tax period, all income loses 0% QFZP benefit and is taxed at 9%. Immediate contract restructuring recommended.</div>':""}
 
  <div class="section-title pb">5-Pillar Substance Requirements</div>
  <table>
    <thead><tr><th style="width:15%">Pillar</th><th style="width:30%">Requirement</th><th style="width:25%">Current Status</th><th style="width:10%;text-align:center">Assessment</th></tr></thead>
    <tbody>${substanceRows}</tbody>
  </table>
 
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This tracker is maintained for internal QFZP compliance monitoring. The FTA may audit substance requirements at any time. All evidence listed should be physically maintained and available for inspection. Garima Agarwal, CA (M.No. 160944) · Finzzup · ${now}
  </div>
  <div class="footer">
    <span style="font-weight:800;color:#7C3AED">Finzzup</span>
    <span>${company} · QFZP Substance Tracker · ${period} · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944</span>
  </div>
</div>
</body></html>`;
}


export function generateRPTPDF({ client, reportData }) {
  const company  = client?.company || "Client";
  const trnCT    = client?.trnCT   || "Pending";
  const freezone = client?.freezone || "DMCC";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
 
  // Build Related Party rows from admin data
  const rptEntities = (reportData?.rptEntities || []).filter(e => e?.name);
  const cpPersons   = (reportData?.connectedPersonsAdmin || []).filter(p => p?.name);
 
  const rptRows = rptEntities.length ? rptEntities.map((e,i) => {
    const compliant = e.compliant === "yes";
    const partial   = e.compliant === "partial";
    const statusColor = compliant ? "#059669" : partial ? "#D97706" : "#EF4444";
    const statusLabel = compliant ? "✓ Arm's Length" : partial ? "⚠ Partial" : "✗ Adjustment Required";
    return `<tr style="background:${i%2===0?"#fff":"#fafafa"}${!compliant?" border-left:3px solid #EF4444;":""}">
      <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111827">${e.name || "—"}<br/><span style="font-size:10px;color:#6B7280;font-weight:400">${e.jurisdiction||""}</span></td>
      <td style="padding:10px 12px;font-size:11px;color:#374151">${e.relationship||"—"}</td>
      <td style="padding:10px 12px;font-size:11px;color:#374151">${e.txnType||"—"}</td>
      <td style="padding:10px 12px;font-size:12px;font-family:monospace;font-weight:700;color:#111827">AED ${Number(e.amount||0).toLocaleString()}</td>
      <td style="padding:10px 12px;font-size:11px;color:#374151">${e.tpMethod||"—"}</td>
      <td style="padding:10px 12px;font-size:11px"><span style="font-weight:700;color:${statusColor}">${statusLabel}</span></td>
    </tr>
    ${!compliant && e.action ? '<tr style="background:#FEF2F2"><td colspan="6" style="padding:8px 12px;font-size:11px;color:#991B1B"><strong>Action:</strong> ' + e.action + '</td></tr>' : ""}`;
  }).join("") : `<tr><td colspan="6" style="padding:16px;text-align:center;color:#9CA3AF;font-size:12px">No related party data entered yet. Please update in the admin panel UAE tab.</td></tr>`;
 
  const cpRows = cpPersons.length ? cpPersons.map((p,i) => {
    const t1 = p.armsLength === "pass" ? "✓ Pass" : p.armsLength === "fail" ? "✗ Fail" : "⚠ Pending";
    const t2 = p.businessPurpose === "pass" ? "✓ Pass" : p.businessPurpose === "fail" ? "✗ Fail" : "⚠ Evidence Needed";
    const t1c = p.armsLength === "pass" ? "#059669" : "#EF4444";
    const t2c = p.businessPurpose === "pass" ? "#059669" : p.businessPurpose === "fail" ? "#EF4444" : "#D97706";
    return `<tr style="background:${i%2===0?"#fff":"#fafafa"}">
      <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111827">${p.name||"—"}<br/><span style="font-size:10px;color:#6B7280;font-weight:400">${p.role||""}</span></td>
      <td style="padding:10px 12px;font-size:11px;color:#7C3AED;font-family:monospace">${p.artRef||"—"}</td>
      <td style="padding:10px 12px;font-size:12px;font-family:monospace;font-weight:700;color:#111827">AED ${Number(p.totalPayments||0).toLocaleString()}</td>
      <td style="padding:10px 12px;font-size:11px;color:#374151">${p.marketRange||"—"}</td>
      <td style="padding:10px 12px;font-size:11px"><span style="font-weight:700;color:${t1c}">${t1}</span></td>
      <td style="padding:10px 12px;font-size:11px"><span style="font-weight:700;color:${t2c}">${t2}</span></td>
    </tr>
    ${p.action ? '<tr style="background:#FFFBEB"><td colspan="6" style="padding:8px 12px;font-size:11px;color:#92400E"><strong>Action:</strong> ' + p.action + '</td></tr>' : ""}`;
  }).join("") : `<tr><td colspan="6" style="padding:16px;text-align:center;color:#9CA3AF;font-size:12px">No connected persons data entered yet. Please update in the admin panel UAE tab.</td></tr>`;
 
  const totalRPT = rptEntities.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalCP  = cpPersons.reduce((s,p)=>s+Number(p.totalPayments||0),0);
  const rptNote  = reportData?.rptGarimaNote || "Please update related party notes in the admin panel.";
  const cpNote   = reportData?.cpGarimaNote  || "Please update connected persons notes in the admin panel.";
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Related Party & Connected Persons Report — ${company}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .pagebreak { page-break-before:always; } }
.cover { background:linear-gradient(135deg,#4C1D95,#7C3AED,#1E3A5F); padding:56px 56px 48px; color:white; min-height:200px; }
.cover h1 { font-size:32px; font-weight:900; margin-bottom:8px; }
.cover .sub { font-size:14px; opacity:0.8; margin-bottom:20px; }
.cover .meta-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:24px; }
.cover .meta-item label { font-size:9px; text-transform:uppercase; letter-spacing:0.1em; opacity:0.6; display:block; margin-bottom:3px; }
.cover .meta-item span { font-size:13px; font-weight:700; }
.law-box { background:#EDE9FE; border:1px solid #C4B5FD; border-left:4px solid #7C3AED; border-radius:8px; padding:12px 16px; margin:16px 0; font-size:11px; color:#4C1D95; line-height:1.7; }
.law-box strong { color:#3730A3; }
.page { padding:40px 48px; max-width:800px; margin:0 auto; }
.section-header { font-size:10px; font-weight:700; color:#7C3AED; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
.section-title { font-size:17px; font-weight:800; color:#111827; margin-bottom:12px; border-left:4px solid #7C3AED; padding-left:12px; }
table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:8px; }
th { background:#4C1D95; color:white; padding:9px 12px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
td { border-bottom:1px solid #F3F4F6; vertical-align:top; }
.summary-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:20px 0; }
.summary-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:14px; text-align:center; }
.summary-card .val { font-size:20px; font-weight:800; font-family:monospace; }
.summary-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; margin-top:3px; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.8; }
.garima strong { color:#92400E; }
.disclaimer { font-size:10px; color:#9CA3AF; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; padding:10px 12px; margin-top:20px; line-height:1.6; }
.footer { margin-top:16px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
 
<div class="cover">
  <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;opacity:0.7;margin-bottom:24px">🏛️ UAE CORPORATE TAX · ART. 35 & 36 · CTP010</div>
  <h1>Related Party &amp;<br/>Connected Persons Report</h1>
  <div class="sub">${company} · CT TRN: ${trnCT} · ${freezone}</div>
  <div style="font-size:12px;opacity:0.6">Prepared for CT Return filing · Federal Decree-Law No. 47 of 2022</div>
  <div class="meta-grid">
    <div class="meta-item"><label>Prepared by</label><span>Garima Agarwal, CA</span></div>
    <div class="meta-item"><label>Date</label><span>${now}</span></div>
    <div class="meta-item"><label>Classification</label><span>Strictly Confidential</span></div>
    <div class="meta-item"><label>Total RPT Value</label><span>AED ${totalRPT.toLocaleString()}</span></div>
    <div class="meta-item"><label>Total CP Payments</label><span>AED ${totalCP.toLocaleString()}</span></div>
    <div class="meta-item"><label>Disclosure</label><span>Art. 55(1) Required</span></div>
  </div>
</div>
 
<div class="page">
  <div class="law-box">
    <strong>Legal References:</strong> Art. 35 — Related Party definition (≥50% common ownership/control) · Art. 34 — Transfer pricing: all RPT at arm's length · Art. 36(2)(a) — Owner · Art. 36(2)(b) — Director/Officer per CTP010 · Art. 36(2)(c) — Related Party of owner/director · Art. 36(1) — Two-test rule: Market Value AND Business Purpose · Art. 55(1) — Mandatory disclosure in CT Return
  </div>
 
  <div class="summary-strip">
    <div class="summary-card"><div class="val" style="color:#7C3AED">${rptEntities.length}</div><div class="lbl">Related Party Entities</div></div>
    <div class="summary-card"><div class="val" style="color:#2563EB">${cpPersons.length}</div><div class="lbl">Connected Persons</div></div>
    <div class="summary-card"><div class="val" style="color:#D97706">AED ${(totalRPT+totalCP).toLocaleString()}</div><div class="lbl">Total Disclosed Value</div></div>
    <div class="summary-card"><div class="val" style="color:#EF4444">${[...rptEntities.filter(e=>e.compliant==="no"),...cpPersons.filter(p=>p.businessPurpose==="evidence"||p.businessPurpose==="fail")].length}</div><div class="lbl">Require Action</div></div>
  </div>
 
  <div class="section-header">Part A — Art. 35 &amp; 34</div>
  <div class="section-title">Related Party Transactions (Entities)</div>
  <table>
    <thead><tr><th>Entity</th><th>Relationship</th><th>Transaction</th><th>Amount (AED)</th><th>TP Method</th><th>Arm's Length?</th></tr></thead>
    <tbody>${rptRows}</tbody>
  </table>
 
  <div class="garima"><strong>Garima's Note — Related Parties:</strong><br/>${rptNote}</div>
 
  <div class="section-header" style="margin-top:28px">Part B — Art. 36 + CTP010</div>
  <div class="section-title">Connected Person Payments (Individuals)</div>
  <div style="font-size:11px;color:#6B7280;margin-bottom:12px;background:#F5F3FF;border-radius:6px;padding:10px 12px;border:1px solid #C4B5FD">
    <strong style="color:#4C1D95">CTP010 Reminder:</strong> "Director" = formal board seat in constitutional documents (job title alone insufficient). "Officer" = actual strategic decision authority. Only natural persons. Two-test rule: both Market Value AND Business Purpose must pass for deductibility.
  </div>
  <table>
    <thead><tr><th>Person</th><th>Art. 36(2) Ref</th><th>Total Payments</th><th>Market Range</th><th>Test 1: Market Value</th><th>Test 2: Business Purpose</th></tr></thead>
    <tbody>${cpRows}</tbody>
  </table>
 
  <div class="garima"><strong>Garima's Note — Connected Persons:</strong><br/>${cpNote}</div>
 
  <div class="section-header" style="margin-top:28px">Part C — Art. 55(1)</div>
  <div class="section-title">Mandatory Disclosure Summary</div>
  <table>
    <thead><tr><th>Party</th><th>Category</th><th>Legal Ref</th><th>Amount (AED)</th><th>Disclosure Required</th></tr></thead>
    <tbody>
      ${rptEntities.map((e,i)=>'<tr style="background:' + (i%2===0?"#fff":"#fafafa") + '"><td style="padding:9px 12px;font-weight:600">' + (e.name||"—") + '</td><td style="padding:9px 12px;color:#7C3AED;font-size:11px">Related Party</td><td style="padding:9px 12px;font-family:monospace;font-size:10px">Art. 35+34</td><td style="padding:9px 12px;font-family:monospace;font-weight:700">AED ' + Number(e.amount||0).toLocaleString() + '</td><td style="padding:9px 12px;color:#059669;font-size:11px">✓ Yes</td></tr>').join("")}
      ${cpPersons.map((p,i)=>'<tr style="background:' + ((i+rptEntities.length)%2===0?"#fff":"#fafafa") + '"><td style="padding:9px 12px;font-weight:600">' + (p.name||"—") + '</td><td style="padding:9px 12px;color:#2563EB;font-size:11px">Connected Person</td><td style="padding:9px 12px;font-family:monospace;font-size:10px">' + (p.artRef||"Art. 36") + '</td><td style="padding:9px 12px;font-family:monospace;font-weight:700">AED ' + Number(p.totalPayments||0).toLocaleString() + '</td><td style="padding:9px 12px;color:#059669;font-size:11px">✓ Yes</td></tr>').join("")}
      <tr style="background:#EDE9FE;font-weight:800"><td style="padding:10px 12px" colspan="3">TOTAL — All Disclosed Transactions</td><td style="padding:10px 12px;font-family:monospace;font-weight:800;color:#4C1D95">AED ${(totalRPT+totalCP).toLocaleString()}</td><td style="padding:10px 12px;font-size:11px">Art. 55(1) disclosure filed with CT Return</td></tr>
    </tbody>
  </table>
 
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is prepared for internal CT compliance purposes based on information provided by the client and entered by Garima Agarwal, CA. It reflects the FTA's position per CTP010. This report does not constitute legal or tax advice. Final CT Return filing should be reviewed and certified by a licensed UAE tax advisor. Garima Agarwal, CA (M.No. 160944) · Finzzup · ${now}
  </div>
  <div class="footer">
    <span style="font-weight:800;color:#7C3AED">Finzzup</span>
    <span>${company} · Related Party & Connected Persons Report · Strictly Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944</span>
  </div>
</div>
</body></html>`;
}


export function generateVATPDF({ client, reportData }) {
  const company  = client?.company || "Client";
  const trnVAT   = client?.trnVAT  || "—";
  const freezone = client?.freezone || "DMCC";
  const now      = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const vat      = reportData?.vat || {};
  const period   = vat.filingPeriod  || reportData?.monthLabel || "Current Quarter";
  const deadline = vat.nextDeadline  || "28th of following month";
  const outputVAT  = Number(vat.outputVAT  || 0);
  const inputVAT   = Number(vat.inputVAT   || 0);
  const vatPayable = Number(vat.vatPayable  || (outputVAT - inputVAT));
  const vatNote  = reportData?.vatGarimaNote || vat.garimaNote || "Please update VAT notes in the admin panel UAE tab.";
 
  const histRows = (vat.pendingReturns||[
    { period:"Q4 2025", due:"28 Jan 2026", status:"Filed", vatNet:"—" },
  ]).map((r,i)=>`<tr style="background:${i%2===0?"#fff":"#fafafa"}">
    <td style="padding:9px 12px">${r.period}</td>
    <td style="padding:9px 12px">${r.due}</td>
    <td style="padding:9px 12px;font-family:monospace;font-weight:700">${r.vatNet}</td>
    <td style="padding:9px 12px"><span style="font-weight:700;color:${r.status==="Filed"?"#059669":"#D97706"}">${r.status==="Filed"?"✓ Filed":"Pending"}</span></td>
  </tr>`).join("");
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>VAT Compliance Report — ${company} — ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
.header { background:linear-gradient(135deg,#00732F,#0891B2); padding:36px 48px; color:white; }
.header h1 { font-size:28px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:32px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:800px; margin:0 auto; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:14px; text-align:center; }
.kpi-card .val { font-size:20px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.section-title { font-size:16px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #00732F; padding-left:12px; }
table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:16px; }
th { background:#064E3B; color:white; padding:9px 12px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
td { padding:9px 12px; border-bottom:1px solid #F3F4F6; }
tr.payable td { background:#FFFBEB; font-weight:800; color:#92400E; }
tr.total td { background:#F0FDF4; font-weight:800; color:#065f46; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.8; }
.alert { background:#FEF2F2; border:1px solid #FCA5A5; border-left:4px solid #EF4444; border-radius:8px; padding:12px 14px; margin:12px 0; font-size:11px; color:#991B1B; }
.footer { margin-top:16px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
<div class="header">
  <h1>VAT Compliance Report</h1>
  <div class="sub">${company} · ${freezone} · TRN: ${trnVAT}</div>
  <div class="meta">
    <div class="meta-item"><label>Period</label>${period}</div>
    <div class="meta-item"><label>Due Date</label>${deadline}</div>
    <div class="meta-item"><label>VAT Payable</label>AED ${vatPayable.toLocaleString()}</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
    <div class="meta-item"><label>Date</label>${now}</div>
  </div>
</div>
<div class="page">
  <div class="kpi-row">
    <div class="kpi-card"><div class="val" style="color:#2563EB">AED ${outputVAT.toLocaleString()}</div><div class="lbl">Output VAT Collected</div></div>
    <div class="kpi-card"><div class="val" style="color:#059669">AED ${inputVAT.toLocaleString()}</div><div class="lbl">Input VAT Recoverable</div></div>
    <div class="kpi-card"><div class="val" style="color:#D97706">AED ${vatPayable.toLocaleString()}</div><div class="lbl">Net VAT Payable</div></div>
    <div class="kpi-card"><div class="val" style="color:#00732F">5%</div><div class="lbl">Standard VAT Rate</div></div>
  </div>
 
  <div class="alert">⏰ <strong>Payment Deadline: ${deadline}</strong> — AED ${vatPayable.toLocaleString()} must reach FTA by this date. Late payment penalty: AED 1,000 + 2% of unpaid tax per month.</div>
 
  <div class="garima"><strong>Garima's Note:</strong><br/>${vatNote}</div>
 
  <div class="section-title">VAT Return Summary</div>
  <table>
    <thead><tr><th>Item</th><th>Amount (AED)</th></tr></thead>
    <tbody>
      <tr><td>Output VAT (on standard-rated supplies)</td><td style="font-family:monospace;font-weight:700">${outputVAT.toLocaleString()}</td></tr>
      <tr><td>Less: Input VAT (recoverable)</td><td style="font-family:monospace;font-weight:700;color:#059669">(${inputVAT.toLocaleString()})</td></tr>
      <tr class="payable"><td><strong>Net VAT Payable — ${period}</strong></td><td style="font-family:monospace"><strong>AED ${vatPayable.toLocaleString()}</strong></td></tr>
    </tbody>
  </table>
 
  <div class="section-title">Filing History</div>
  <table>
    <thead><tr><th>Period</th><th>Deadline</th><th>VAT Amount (AED)</th><th>Status</th></tr></thead>
    <tbody>${histRows}</tbody>
  </table>
 
  <div style="font-size:10px;color:#9CA3AF;margin-top:16px;line-height:1.6">
    <strong>Disclaimer:</strong> This report is prepared for compliance tracking. Final VAT return filing and payment should be confirmed with a licensed UAE tax advisor. Garima Agarwal, CA (M.No. 160944) · Finzzup · ${now}
  </div>
  <div class="footer">
    <span style="font-weight:800;color:#00732F">Finzzup</span>
    <span>${company} · VAT Compliance Report · ${period} · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944</span>
  </div>
</div>
</body></html>`;
}


export function generateQFZPPDF({ client, reportData }) {
  const company   = client?.company || "Client";
  const trnCT     = client?.trnCT   || "—";
  const freezone  = client?.freezone || "DMCC";
  const now       = new Date().toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"});
  const ct        = reportData?.ct   || {};
  const qfzp      = reportData?.qfzp || {};
  const revenue        = Number(ct.revenue        || 0);
  const accountingProfit = Number(ct.taxableIncome || 0);
  const qualifyingPct  = Number(ct.qualifyingPct  || 92);
  const nonQualPct     = Number(ct.nonQualifyingPct || 8);
  const qfzpScore      = Number(qfzp.qfzpScore    || 82);
  const auditScore     = Number(reportData?.auditReadiness?.auditScore || 65);
  const sbrEligible    = client?.sbrEligible ?? (revenue > 0 && revenue <= 3000000);
  const qfzpStatus     = client?.qfzpStatus ?? true;
  const effectiveCT    = (qfzpStatus || sbrEligible) ? 0 : 9;
  const qualIncome     = Math.round(accountingProfit * qualifyingPct / 100);
  const nonQualIncome  = accountingProfit - qualIncome;
  const ctPayable      = qfzpStatus ? 0 : Math.round(nonQualIncome * 0.09);
  const ctDue          = client?.financialYearEnd === "31 Mar" ? "31 Dec" : "30 Sep";
  const ctNote         = reportData?.ctGarimaNote || "Please update CT notes in the admin panel UAE tab.";
 
  const substanceItems = reportData?.ct?.substanceItems || [
    { item:"Adequate employees in free zone",   done:true  },
    { item:"Adequate operating expenditure",    done:true  },
    { item:"Physical presence in free zone",    done:true  },
    { item:"Core income-generating activities", done:true  },
    { item:"Audited financial statements",      done:false },
  ];
 
  const substanceRows = substanceItems.map((s,i)=>`<tr style="background:${i%2===0?"#fff":"#fafafa"}">
    <td style="padding:9px 12px;font-size:12px;color:${s.done?"#059669":"#EF4444"};font-weight:700">${s.done?"✓":"✗"}</td>
    <td style="padding:9px 12px;font-size:12px;color:#374151">${s.item}</td>
    <td style="padding:9px 12px;font-size:11px">${s.done?'<span style="color:#059669;font-weight:700">✓ Met</span>':'<span style="background:#FEF2F2;color:#EF4444;font-weight:700;padding:2px 8px;border-radius:100px">Action Required</span>'}</td>
  </tr>`).join("");
 
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>QFZP & Corporate Tax Report — ${company}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; color:#111827; background:white; font-size:12px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
.header { background:linear-gradient(135deg,#1E3A5F,#7C3AED,#4C1D95); padding:36px 48px; color:white; }
.header h1 { font-size:26px; font-weight:900; margin-bottom:6px; }
.header .sub { font-size:13px; opacity:0.8; margin-bottom:16px; }
.header .meta { display:flex; gap:28px; font-size:11px; flex-wrap:wrap; }
.header .meta-item label { opacity:0.6; display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
.page { padding:36px 48px; max-width:800px; margin:0 auto; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
.kpi-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:14px; text-align:center; }
.kpi-card .val { font-size:20px; font-weight:800; font-family:monospace; margin-bottom:4px; }
.kpi-card .lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B7280; }
.section-title { font-size:16px; font-weight:800; color:#111827; margin-bottom:10px; border-left:4px solid #7C3AED; padding-left:12px; }
table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:16px; }
th { background:#4C1D95; color:white; padding:9px 12px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
td { padding:9px 12px; border-bottom:1px solid #F3F4F6; }
tr.total td { background:#ECFDF5; font-weight:800; color:#065f46; border-top:2px solid #059669; }
tr.add-row td { color:#D97706; }
tr.less-row td { color:#059669; }
.garima { background:#FFFBF0; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:12px; color:#78350F; line-height:1.8; }
.sbr-box { border-radius:8px; padding:12px 14px; margin:12px 0; font-size:11px; line-height:1.7; }
.footer { margin-top:16px; padding-top:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
</style></head><body>
<div class="header">
  <h1>QFZP Compliance &amp; Corporate Tax Report</h1>
  <div class="sub">${company} · ${freezone} · CT TRN: ${trnCT}</div>
  <div class="meta">
    <div class="meta-item"><label>CT Return Due</label>${ctDue} 2026</div>
    <div class="meta-item"><label>Effective CT Rate</label>${effectiveCT}%</div>
    <div class="meta-item"><label>QFZP Score</label>${qfzpScore}/100</div>
    <div class="meta-item"><label>SBR Eligible</label>${sbrEligible?"✅ Yes":"❌ No"}</div>
    <div class="meta-item"><label>Prepared by</label>Garima Agarwal, CA</div>
    <div class="meta-item"><label>Date</label>${now}</div>
  </div>
</div>
<div class="page">
  <div class="kpi-row">
    <div class="kpi-card"><div class="val" style="color:#059669">${effectiveCT}%</div><div class="lbl">Effective CT Rate</div></div>
    <div class="kpi-card"><div class="val" style="color:#059669">AED ${ctPayable.toLocaleString()}</div><div class="lbl">CT Payable</div></div>
    <div class="kpi-card"><div class="val" style="color:#7C3AED">${qualifyingPct}%</div><div class="lbl">Qualifying Income</div></div>
    <div class="kpi-card"><div class="val" style="color:${nonQualPct>=5?"#EF4444":"#D97706"}">${nonQualPct}%</div><div class="lbl">Non-Qualifying</div></div>
  </div>
 
  <div class="garima"><strong>Garima's Note:</strong><br/>${ctNote}</div>
 
  <div class="section-title">QFZP Substance Requirements</div>
  <table>
    <thead><tr><th>✓/✗</th><th>Requirement</th><th>Status</th></tr></thead>
    <tbody>${substanceRows}</tbody>
  </table>
 
  <div class="sbr-box" style="background:${sbrEligible?"#F0FDF4":"#FEF2F2"};border:1px solid ${sbrEligible?"#86EFAC":"#FCA5A5"}">
    <strong style="color:${sbrEligible?"#15803D":"#991B1B"}">${sbrEligible?"✅ Small Business Relief (SBR) — Eligible":"❌ SBR — Not Eligible"}</strong><br/>
    ${sbrEligible?("Revenue AED " + revenue.toLocaleString() + " is below the AED 3,000,000 SBR threshold. Elect SBR in CT Return by " + ctDue + " 2026."):("Revenue AED " + revenue.toLocaleString() + " exceeds the AED 3,000,000 SBR threshold.")}
  </div>
 
  <div class="section-title" style="margin-top:20px">CT Taxable Income Computation</div>
  <table>
    <thead><tr><th>Item</th><th>Article</th><th>Amount (AED)</th></tr></thead>
    <tbody>
      <tr><td>Accounting Profit (per audited FS)</td><td>—</td><td style="font-family:monospace;font-weight:700">${accountingProfit.toLocaleString()}</td></tr>
      <tr class="less-row"><td>Less: QFZP qualifying income (${qualifyingPct}%)</td><td>Art. 18</td><td style="font-family:monospace;font-weight:700">(${qualIncome.toLocaleString()})</td></tr>
      ${sbrEligible?('<tr class="less-row"><td>Less: SBR relief (if elected)</td><td>Cabinet Decision</td><td style="font-family:monospace;font-weight:700">(' + nonQualIncome.toLocaleString() + ')</td></tr>'):""}
      <tr class="total"><td><strong>Final Taxable Income</strong></td><td>—</td><td style="font-family:monospace"><strong>${(sbrEligible?0:nonQualIncome).toLocaleString() || "NIL"}</strong></td></tr>
      <tr class="total"><td><strong>CT Payable</strong></td><td>—</td><td style="font-family:monospace"><strong>AED ${ctPayable.toLocaleString()}</strong></td></tr>
    </tbody>
  </table>
 
  <div style="font-size:10px;color:#9CA3AF;margin-top:16px;line-height:1.6">
    <strong>Disclaimer:</strong> This report is for CT compliance tracking. Final CT Return filing should be reviewed by a licensed UAE tax advisor. Garima Agarwal, CA (M.No. 160944) · Finzzup · ${now}
  </div>
  <div class="footer">
    <span style="font-weight:800;color:#7C3AED">Finzzup</span>
    <span>${company} · QFZP &amp; CT Report · Confidential</span>
    <span>Garima Agarwal CA · M.No. 160944</span>
  </div>
</div>
</body></html>`;
}


export function generateReportPDF({ client, kpis, garimaNote, reportData, actions }) {
  const pack      = normalizePack(client?.client_pack || client?.clientPack);
  const packLabel = getPackLabel(pack);
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
      <img src={LOGO_SRC} alt="Finzzup" style="height:44px;width:auto;object-fit:contain"/>
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
      ${kpiCards || '<div style="color:#9CA3AF;font-style:italic">No KPI data available.</div>'}
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
    <img src={LOGO_SRC} alt="Finzzup" style="height:22px;width:auto;object-fit:contain"/>
    <span style="font-size:11px;font-weight:700;color:#374151">Finzzup Advisory</span>
    <span style="font-size:11px;color:#9CA3AF">· garima@finzzup.com · finzzup.com</span>
  </div>
  <div style="font-size:10px;color:#9CA3AF">Confidential — ${client.name}, ${client.company} — ${now}</div>
</div>
<div style="height:32px"></div>
 
</body></html>`;
 
  return html;
}

