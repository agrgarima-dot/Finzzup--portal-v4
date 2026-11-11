// ─── THE WORKBOOK ─────────────────────────────────────────────────────────────
// One Excel file. Every report. One upload.
//
// The admin panel used to ask for the whole report to be typed into it — around
// three hundred boxes across nine screens, every month, for every client. That
// is not where a Chartered Accountant does analysis. A spreadsheet is.
//
// So the portal hands over one workbook instead. It opens already carrying
// everything Zoho knows: the trial balance worked through to a P&L, the ageing
// straight off the invoices, the ratios, the corporate tax computation. The
// analysis happens in Excel, where it belongs. The filled workbook comes back,
// and every sheet lands on the screen it belongs to.
//
// Two rules hold the thing together:
//
//   1. A blank cell changes nothing. Clearing a figure is not the same as not
//      having got to it yet, and the second is far more common.
//   2. Figures marked "From Zoho" are recomputed on the next sync. They are in
//      the workbook so the analysis has something to sit on, not to be retyped.
//      Each sheet says so, because a silently overwritten edit is worse than a
//      field that was never offered.
//
// Sheets are declared here and nowhere else. Both the download and the upload
// read this one list, so a sheet cannot drift out of step with the screen it
// feeds — the bug that made half the old admin panel write to keys nothing read.

// ── Deep get/set on dotted paths ────────────────────────────────────────────
export const getPath = (obj, path) =>
  String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

export function setPath(obj, path, value) {
  const keys = String(path).split(".");
  const out = { ...(obj || {}) };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = (cur[k] && typeof cur[k] === "object" && !Array.isArray(cur[k])) ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

const str = (v) => (v == null ? "" : String(v).trim());
const blank = (v) => str(v) === "";

/** A number from a cell that may be "AED 1,850,000", "(4,200)" or already numeric. */
export function cellNum(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = str(v);
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s);
  const n = parseFloat(s.replace(/[(),₹\s]/g, "").replace(/AED/gi, "").replace(/%/g, ""));
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

const yes = (v) => /^(y|yes|true|done|1|✅)$/i.test(str(v));
const yn  = (v) => (v === true ? "Y" : v === false ? "N" : str(v));

// ── Sheet declarations ──────────────────────────────────────────────────────
//
// kind "kv"    — Field / Value, one row per figure. Blank value = leave alone.
// kind "table" — a header row then rows. Any row present replaces the list.
// kind "map"   — a fixed row per named thing (region, department), several
//                columns each, stored as an object keyed by that name.
//
// `only` limits a sheet to one jurisdiction. `from:"zoho"` marks a figure the
// sync computes, so the sheet can say plainly that an edit to it will not last.

const ZOHO = "From Zoho — recomputed on each sync";
const YOU  = "Your analysis";

export const SHEETS = [
  // ───────────────────────────────────────────────────────── dashboard ──
  {
    name: "Dashboard KPIs",
    screen: "Client dashboard — the six tiles and your note",
    kind: "kv",
    target: "kpis",                       // the kpis table, not report data
    fields: [
      { key: "month",        label: "Month this covers",  source: YOU, help: "e.g. February 2026" },
      { key: "revenue",      label: "Revenue",            source: YOU },
      { key: "gross_margin", label: "Gross margin",       source: YOU },
      { key: "cash_balance", label: "Cash balance",       source: YOU },
      { key: "burn_rate",    label: "Burn rate / working capital", source: YOU },
      { key: "runway",       label: "Runway / debtor days",        source: YOU },
      { key: "arr",          label: "ARR / cash conversion / VAT payable", source: YOU },
      { key: "garima_note",  label: "Note on the dashboard", source: YOU, long: true },
    ],
  },
  {
    name: "Previous KPIs",
    screen: "Client dashboard — the ▲▼ arrows and 'Prev:' line",
    kind: "kv",
    path: "prevKpis",
    fields: [
      { key: "revenue",      label: "Previous revenue",      source: YOU },
      { key: "gross_margin", label: "Previous gross margin", source: YOU },
      { key: "cash_balance", label: "Previous cash balance", source: YOU },
      { key: "burn_rate",    label: "Previous burn / working capital", source: YOU },
      { key: "runway",       label: "Previous runway / debtor days",   source: YOU },
      { key: "arr",          label: "Previous ARR / cash conversion",  source: YOU },
    ],
  },

  // ─────────────────────────────────────────────────────────────── P&L ──
  {
    name: "P&L",
    screen: "Monthly Report → P&L summary",
    kind: "table",
    path: "pl",
    columns: ["Line item", "This month", "Previous month"],
    note: "Filled from the trial balance. Both columns are text, so write them as the client should read them.",
    rows: (rd) => {
      const pl = rd?.pl || {};
      const L = [
        ["revenue", "Revenue"], ["cogs", "Cost of sales"], ["grossProfit", "Gross profit"],
        ["gpMargin", "GP margin %"], ["ebitda", "EBITDA"], ["ebitdaMargin", "EBITDA margin %"],
        ["pat", "Net profit / PAT"], ["netMargin", "Net margin %"],
      ];
      return L.map(([k, label]) => [label, str(pl[k]?.actual), str(pl[k]?.prev)]);
    },
    parse: (rows, draft) => {
      const byLabel = {
        "revenue": "revenue", "cost of sales": "cogs", "gross profit": "grossProfit",
        "gp margin %": "gpMargin", "ebitda": "ebitda", "ebitda margin %": "ebitdaMargin",
        "net profit / pat": "pat", "net margin %": "netMargin",
      };
      let out = draft;
      let touched = 0;
      for (const r of rows) {
        const k = byLabel[str(r[0]).toLowerCase()];
        if (!k) continue;
        // The P&L sheet is a table only in shape — it is a fixed list of lines,
        // so what matters is which ones you changed, not how many came back.
        if (!blank(r[1])) {
          if (str(getPath(out, `pl.${k}.actual`)) !== str(r[1])) touched++;
          out = setPath(out, `pl.${k}.actual`, str(r[1]));
        }
        if (!blank(r[2])) {
          if (str(getPath(out, `pl.${k}.prev`)) !== str(r[2])) touched++;
          out = setPath(out, `pl.${k}.prev`, str(r[2]));
        }
      }
      return { draft: out, changed: touched };
    },
  },

  // ──────────────────────────────────────────────────── working capital ──
  {
    name: "Working Capital",
    screen: "Working Capital tab, and the cash conversion cycle",
    kind: "kv",
    fields: [
      { key: "workingCapital.period",       label: "Period",                source: YOU, help: "e.g. Q1 2026" },
      { key: "workingCapital.debtors",      label: "Debtors (AR total)",    source: ZOHO },
      { key: "workingCapital.creditors",    label: "Creditors (AP total)",  source: ZOHO },
      { key: "workingCapital.inventory",    label: "Inventory",             source: ZOHO },
      { key: "workingCapital.cashBank",     label: "Cash and bank",         source: ZOHO },
      { key: "workingCapital.dso",          label: "DSO (days)",            source: ZOHO },
      { key: "workingCapital.dio",          label: "DIO (days)",            source: ZOHO },
      { key: "workingCapital.dpo",          label: "DPO (days)",            source: ZOHO },
      { key: "workingCapital.ccc",          label: "Cash conversion cycle", source: ZOHO },
      { key: "workingCapital.currentRatio", label: "Current ratio",         source: ZOHO },
      { key: "workingCapital.quickRatio",   label: "Quick ratio",           source: ZOHO },
      { key: "workingCapital.ar0_30",       label: "AR 0–30 days",          source: ZOHO },
      { key: "workingCapital.ar31_60",      label: "AR 31–60 days",         source: ZOHO },
      { key: "workingCapital.ar61_90",      label: "AR 61–90 days",         source: ZOHO },
      { key: "workingCapital.ar90plus",     label: "AR 90+ days",           source: ZOHO },
      { key: "workingCapital.cccCashImpact", label: "Cash freed if CCC falls 5 days", source: YOU },
      { key: "arNote",  label: "Note under the ageing table",   source: YOU, long: true },
      { key: "wcNote",  label: "Your working capital assessment", source: YOU, long: true },
    ],
  },
  {
    name: "AR Ageing",
    screen: "Working Capital → who owes what",
    kind: "table",
    path: "workingCapital.arAging",
    columns: ["Customer", "Amount", "Action required", "Risk"],
    note: "Customers and amounts come from the open invoices. The action and the risk are yours.",
    rows: (rd) => (getPath(rd, "workingCapital.arAging") || [])
      .map(r => [str(r.name), str(r.total), str(r.action), str(r.risk)]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        name: str(r[0]), total: cellNum(r[1]) ?? str(r[1]),
        action: str(r[2]), risk: str(r[3]),
      }));
      return { draft: setPath(draft, "workingCapital.arAging", list), changed: list.length };
    },
  },
  {
    name: "AP Schedule",
    screen: "Working Capital → what is owed, and when",
    kind: "table",
    path: "workingCapital.apSchedule",
    columns: ["Supplier", "Amount", "Payment terms", "Due date", "Status"],
    note: "Suppliers and amounts come from the open bills. Terms and status are yours.",
    rows: (rd) => (getPath(rd, "workingCapital.apSchedule") || [])
      .map(r => [str(r.vendor), str(r.amount), str(r.terms), str(r.dueDate), str(r.priority)]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        vendor: str(r[0]), amount: cellNum(r[1]) ?? str(r[1]),
        terms: str(r[2]), dueDate: str(r[3]), priority: str(r[4]),
      }));
      return { draft: setPath(draft, "workingCapital.apSchedule", list), changed: list.length };
    },
  },

  // ──────────────────────────────────────────────────────────── budget ──
  {
    name: "Budget vs Actual",
    screen: "Variance Analysis",
    kind: "table",
    path: "variance",
    columns: ["Line item", "Budget", "Actual", "Favourable (Y/N)"],
    note: "A budget is nowhere in the books — it only exists here. Actuals are pre-filled from the P&L.",
    rows: (rd) => {
      const v = rd?.variance;
      if (Array.isArray(v) && v.length) {
        return v.map(r => [str(r.metric), str(r.budget), str(r.actual), yn(r.fav)]);
      }
      const pl = rd?.pl || {};
      return [["Revenue", "", str(pl.revenue?.actual), ""],
              ["Cost of sales", "", str(pl.cogs?.actual), ""],
              ["Gross profit", "", str(pl.grossProfit?.actual), ""],
              ["EBITDA", "", str(pl.ebitda?.actual), ""],
              ["Net profit", "", str(pl.pat?.actual), ""]];
    },
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        metric: str(r[0]), budget: str(r[1]), actual: str(r[2]), fav: yes(r[3]),
      }));
      return { draft: { ...draft, variance: list }, changed: list.length };
    },
  },
  {
    name: "Key Metrics",
    screen: "Monthly Report → the metric strip",
    kind: "table",
    path: "metrics",
    columns: ["Metric", "Value", "Note", "Flag (good/watch/bad)"],
    rows: (rd) => (Array.isArray(rd?.metrics) ? rd.metrics : [])
      .map(m => [str(m.label), str(m.value), str(m.note), str(m.flag)]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        label: str(r[0]), value: str(r[1]), note: str(r[2]), flag: str(r[3]).toLowerCase(),
      }));
      return { draft: { ...draft, metrics: list }, changed: list.length };
    },
  },
  {
    name: "Checklist",
    screen: "Monthly Report → the month's checklist",
    kind: "table",
    path: "checklist",
    columns: ["Item", "Done (Y/N)"],
    rows: (rd) => (Array.isArray(rd?.checklist) ? rd.checklist : [])
      .map(c => [str(c.item), yn(c.done)]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({ item: str(r[0]), done: yes(r[1]) }));
      return { draft: { ...draft, checklist: list }, changed: list.length };
    },
  },
  {
    name: "Benchmarks",
    screen: "Shown beside each KPI as the peer comparison",
    kind: "kv",
    fields: [
      { key: "benchRevenue",    label: "Revenue benchmark",     source: YOU },
      { key: "benchMargin",     label: "Margin benchmark",      source: YOU },
      { key: "benchCash",       label: "Cash benchmark",        source: YOU },
      { key: "benchBurn",       label: "Burn benchmark",        source: YOU },
      { key: "benchRunway",     label: "Runway benchmark",      source: YOU },
      { key: "benchArr",        label: "ARR benchmark",         source: YOU },
      { key: "benchEbitda",     label: "EBITDA benchmark",      source: YOU },
      { key: "benchDebtorDays", label: "Debtor days benchmark", source: YOU },
    ],
  },
  {
    name: "Unit Economics",
    screen: "Unit Economics tab",
    kind: "kv",
    fields: [
      { key: "cac",          label: "CAC",                      source: YOU },
      { key: "ltv",          label: "LTV",                      source: YOU },
      { key: "ltvCac",       label: "LTV : CAC ratio",          source: YOU },
      { key: "cacPayback",   label: "CAC payback period",       source: YOU },
      { key: "arr",          label: "ARR",                      source: YOU },
      { key: "burnMultiple", label: "Burn multiple",            source: YOU },
      { key: "momGrowth",    label: "MoM revenue growth",       source: YOU },
      { key: "nrr",          label: "Net revenue retention",    source: YOU },
      { key: "churnRate",    label: "Gross churn (monthly)",    source: YOU },
      { key: "magicNumber",  label: "Magic number",             source: YOU },
      { key: "cacBenchmark",       label: "CAC benchmark",      source: YOU },
      { key: "ltvCacBenchmark",    label: "LTV:CAC benchmark",  source: YOU },
      { key: "cacPaybackBenchmark",label: "Payback benchmark",  source: YOU },
      { key: "nrrBenchmark",       label: "NRR benchmark",      source: YOU },
      { key: "churnBenchmark",     label: "Churn benchmark",    source: YOU },
      { key: "arrBenchmark",       label: "ARR benchmark",      source: YOU },
      { key: "ueNote", label: "Your unit economics assessment", source: YOU, long: true },
    ],
  },
  {
    name: "Bank Finance",
    screen: "Bank Finance Readiness / Loan Readiness",
    kind: "kv",
    fields: [
      { key: "loanScore",        label: "Loan readiness score (0–100)", source: YOU },
      { key: "dscr",             label: "DSCR",                     source: YOU },
      { key: "interestCoverage", label: "Interest coverage",        source: YOU },
      { key: "interestMargin",   label: "Interest margin",          source: YOU },
      { key: "existingDebt",     label: "Existing debt",            source: YOU },
      { key: "interestCost",     label: "Interest cost (monthly)",  source: YOU },
      { key: "collateral",       label: "Collateral available",     source: YOU },
      { key: "debtEquity",       label: "Debt / equity",            source: ZOHO },
      { key: "debtEbitda",       label: "Debt / EBITDA",            source: YOU },
      { key: "roe",              label: "Return on equity",         source: ZOHO },
      { key: "loanNote", label: "Your loan readiness note",  source: YOU, long: true },
    ],
  },
  {
    name: "Forecast",
    screen: "Cash Flow → the three-month forward view",
    kind: "table",
    path: "forecast",
    columns: ["Label", "Value", "Trend (up/down/flat)"],
    rows: (rd) => [1, 2, 3].map(n => [
      str(rd?.[`forecast${n}Label`]), str(rd?.[`forecast${n}Value`]), str(rd?.[`forecast${n}Trend`]),
    ]),
    parse: (rows, draft) => {
      let out = { ...draft }, touched = 0;
      rows.slice(0, 3).forEach((r, i) => {
        const n = i + 1;
        if (!blank(r[0])) { out[`forecast${n}Label`] = str(r[0]); touched++; }
        if (!blank(r[1])) { out[`forecast${n}Value`] = str(r[1]); touched++; }
        if (!blank(r[2])) { out[`forecast${n}Trend`] = str(r[2]).toLowerCase(); touched++; }
      });
      return { draft: out, changed: touched };
    },
  },
  {
    name: "Executive Summary",
    screen: "The summary at the top of the report, and the board pack",
    kind: "kv",
    fields: [
      { key: "execPerformance",   label: "Performance",      source: YOU, long: true },
      { key: "execCash",          label: "Cash and liquidity", source: YOU, long: true },
      { key: "execRisks",         label: "Key risks",        source: YOU, long: true },
      { key: "execOpportunities", label: "Opportunities",    source: YOU, long: true },
      { key: "execNextSteps",     label: "Next steps",       source: YOU, long: true },
      { key: "cashPressure1",     label: "Cash pressure point 1", source: YOU },
      { key: "cashPressure2",     label: "Cash pressure point 2", source: YOU },
      { key: "cashPressure3",     label: "Cash pressure point 3", source: YOU },
    ],
  },
  {
    name: "Commentary",
    screen: "Your written commentary, wherever it appears",
    kind: "kv",
    note: "This is the part that is yours alone. Leave a cell blank and whatever is published now stays.",
    fields: [
      { key: "monthLabel",       label: "Month label on every screen", source: YOU },
      { key: "reportNote",       label: "Note on the report",       source: YOU, long: true },
      { key: "garimaNote",       label: "Note on the dashboard",    source: YOU, long: true },
      { key: "cashflowNote",     label: "Cash flow commentary",     source: YOU, long: true },
      { key: "forecastNote",     label: "Forward outlook",          source: YOU, long: true },
      { key: "governanceNote",   label: "Governance assessment",    source: YOU, long: true },
      { key: "ipoNote",          label: "IPO readiness note",       source: YOU, long: true },
    ],
  },

  // ──────────────────────────────────────────────── analytics / spend ──
  {
    name: "Geography",
    screen: "BI & Scenarios → revenue by region",
    kind: "map",
    path: "geoIndia",
    keyColumn: "Region",
    columns: ["Revenue", "Cost"],
    fieldKeys: ["revenue", "cost"],
    seed: ["North", "South", "East", "West", "Central", "International"],
  },
  {
    name: "Departments",
    screen: "BI & Scenarios → department analysis",
    kind: "map",
    path: "depts",
    keyColumn: "Department",
    columns: ["Revenue", "Cost"],
    fieldKeys: ["revenue", "cost"],
    seed: ["Sales", "Marketing", "Operations", "Technology", "Finance", "HR"],
  },
  {
    name: "Spend",
    screen: "Spend Intelligence → budget against actual",
    kind: "map",
    path: "spendDepts",
    keyColumn: "Department",
    columns: ["Actual", "Budget"],
    fieldKeys: ["actual", "budget"],
    seed: ["Sales", "Marketing", "Operations", "Technology", "Finance", "HR"],
    extra: [{ key: "spendRevenue", label: "Monthly revenue, for the % benchmarks", source: ZOHO }],
  },
  {
    name: "Scenarios",
    screen: "Scenario Modelling",
    kind: "kv",
    note: "The base case is pre-filled from the P&L. The assumptions on top of it are a judgement, so they are yours.",
    fields: [
      { key: "scenarioBase.revenue", label: "Base revenue", source: ZOHO },
      { key: "scenarioBase.cogs",    label: "Base cost of sales", source: ZOHO },
      { key: "scenarioBase.opex",    label: "Base operating expenses", source: ZOHO },
      { key: "scenarioDownside",     label: "Downside case — what changes", source: YOU, long: true },
      { key: "scenarioUpside",       label: "Upside case — what changes",   source: YOU, long: true },
      { key: "scenarioNote",         label: "Your note on the scenarios",   source: YOU, long: true },
    ],
  },
  {
    name: "Treasury",
    screen: "Treasury",
    kind: "kv",
    note: "Facility terms, rates and maturities are not in the accounting records at all.",
    fields: [
      { key: "treasury.totalCash",   label: "Total cash",        source: ZOHO },
      { key: "treasury.investedPct", label: "% held in deposits", source: YOU },
      { key: "treasury.yieldPA",     label: "Annual yield",      source: YOU },
    ],
  },
  {
    name: "Deposits",
    screen: "Treasury → the deposit and facility schedule",
    kind: "table",
    path: "treasury.deposits",
    columns: ["Institution", "Type", "Amount", "Rate %", "Maturity", "Note"],
    rows: (rd) => (getPath(rd, "treasury.deposits") || [])
      .map(d => [str(d.institution), str(d.type), str(d.amount), str(d.rate), str(d.maturity), str(d.note)]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        institution: str(r[0]), type: str(r[1]), amount: cellNum(r[2]),
        rate: cellNum(r[3]), maturity: str(r[4]), note: str(r[5]),
      }));
      return { draft: setPath(draft, "treasury.deposits", list), changed: list.length };
    },
  },
  {
    name: "Action Items",
    screen: "The client's action list",
    kind: "table",
    target: "actions",                    // the action_items table, not report data
    columns: ["Action", "Priority (High/Medium/Low)", "Month", "Done (Y/N)"],
    note: "Rows here replace the client's action list. Leave the sheet untouched and the list is left alone.",
    rows: (rd, ctx) => (ctx?.actions || [])
      .map(a => [str(a.text), str(a.priority), str(a.month), yn(a.done)]),
    parse: (rows) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        text: str(r[0]), priority: str(r[1]) || "Medium", month: str(r[2]), done: yes(r[3]),
      }));
      return { actions: list, changed: list.length };
    },
  },

  // ──────────────────────────────────────────────────────────── UAE ──
  {
    name: "UAE VAT",
    screen: "VAT Dashboard",
    only: "uae",
    kind: "kv",
    fields: [
      { key: "vat.outputVAT",    label: "Output VAT (AED)",  source: ZOHO },
      { key: "vat.inputVAT",     label: "Input VAT (AED)",   source: ZOHO },
      { key: "vat.vatPayable",   label: "VAT payable (AED)", source: ZOHO },
      { key: "vat.filingPeriod", label: "Filing period",     source: YOU },
      { key: "vat.nextDeadline", label: "Next deadline",     source: YOU },
      { key: "vatGarimaNote",    label: "Your note on the VAT tab", source: YOU, long: true },
    ],
  },
  {
    name: "UAE Corporate Tax",
    screen: "Corporate Tax",
    only: "uae",
    kind: "kv",
    fields: [
      { key: "ct.revenue",           label: "Revenue (AED)",            source: ZOHO },
      { key: "ct.taxableIncome",     label: "Accounting profit (AED)",  source: ZOHO },
      { key: "ct.liability",         label: "CT liability (AED)",       source: ZOHO },
      { key: "ct.sbrEligible",       label: "Small Business Relief eligible (Y/N)", source: ZOHO },
      { key: "ct.qualifyingPct",     label: "Qualifying income %",      source: YOU },
      { key: "ct.nonQualifyingPct",  label: "Non-qualifying income %",  source: YOU },
      { key: "ct.revenueYTD",        label: "Revenue so far this tax period", source: YOU },
      { key: "ct.sbrHeadroom",       label: "Headroom before the SBR cap",    source: ZOHO },
      { key: "ct.sbrPosition",       label: "Position against the SBR cap",   source: ZOHO },
      { key: "ct.provision",         label: "To provide this month",          source: ZOHO },
      { key: "ct.setAside",          label: "Set aside for tax",              source: ZOHO },
      { key: "ctGarimaNote",         label: "Your note on the CT tab",  source: YOU, long: true },
    ],
  },
  {
    name: "UAE E-Invoicing",
    screen: "Audit Readiness — e-invoicing",
    only: "uae",
    kind: "kv",
    note: "Free zones are not exempt. Readiness is a data problem long before it is a software problem.",
    fields: [
      { key: "einv.wave",        label: "Which wave this client is in",   source: YOU },
      { key: "einv.date",        label: "Mandatory from",                 source: YOU },
      { key: "einv.monthsLeft",  label: "Months remaining",               source: ZOHO },
      { key: "einv.score",       label: "Readiness (0–100)",              source: YOU },
      { key: "einv.dataQuality", label: "Master data clean",              source: YOU },
      { key: "einv.provider",    label: "Service provider appointed",     source: YOU },
      { key: "einv.note",        label: "Your note on e-invoicing",       source: YOU, long: true },
    ],
  },
  {
    name: "UAE QFZP",
    screen: "QFZP compliance and substance",
    only: "uae",
    kind: "kv",
    fields: [
      { key: "qfzp.qfzpScore",            label: "QFZP score (0–100)",     source: YOU },
      { key: "qfzpSubstance.period",      label: "Period",                 source: YOU },
      { key: "qfzpSubstance.overallScore",label: "Substance score (0–100)",source: YOU },
      { key: "qfzpSubstance.auditSubmitted", label: "Audited FS submitted (Y/N)", source: YOU },
      { key: "qfzpSubstance.employeeCount",  label: "Employee count",      source: YOU },
      { key: "qfzpSubstance.opexAED",        label: "Annual OpEx (AED)",   source: ZOHO },
      { key: "qfzpSubstance.officeSqft",     label: "Office size (sq ft)", source: YOU },
      { key: "qfzpSubstance.garimaNote",     label: "Your note on QFZP",   source: YOU, long: true },
    ],
  },
  {
    name: "UAE Related Party",
    screen: "Related Party Transactions (Art. 35 & 34)",
    only: "uae",
    kind: "table",
    path: "rptEntities",
    columns: ["Entity", "Jurisdiction", "Relationship", "Transaction type",
              "Amount (AED)", "TP method", "Market range", "Arm's length (Y/N)", "Action / risk"],
    note: "Whether a price is at arm's length is a determination, not a number — nothing can fill this for you.",
    rows: (rd) => (rd?.rptEntities || []).map(e => [
      str(e.name), str(e.jurisdiction), str(e.relationship), str(e.txnType),
      str(e.amount), str(e.tpMethod), str(e.marketRange), yn(e.armsLength), str(e.note),
    ]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        name: str(r[0]), jurisdiction: str(r[1]), relationship: str(r[2]), txnType: str(r[3]),
        amount: cellNum(r[4]), tpMethod: str(r[5]), marketRange: str(r[6]),
        armsLength: yes(r[7]), note: str(r[8]),
      }));
      return { draft: { ...draft, rptEntities: list }, changed: list.length };
    },
  },
  {
    name: "UAE Connected Persons",
    screen: "Connected Persons (Art. 36 + CTP010)",
    only: "uae",
    kind: "table",
    path: "connectedPersonsAdmin",
    columns: ["Name", "Role", "Art. 36(2) reference", "Total payments (AED)",
              "Market range (AED)", "Arm's length (Y/N)", "Business purpose (Y/N)", "Action / risk"],
    rows: (rd) => (rd?.connectedPersonsAdmin || []).map(p => [
      str(p.name), str(p.role), str(p.ref), str(p.payments),
      str(p.marketRange), yn(p.armsLength), yn(p.businessPurpose), str(p.note),
    ]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        name: str(r[0]), role: str(r[1]), ref: str(r[2]), payments: cellNum(r[3]),
        marketRange: str(r[4]), armsLength: yes(r[5]), businessPurpose: yes(r[6]), note: str(r[7]),
      }));
      return { draft: { ...draft, connectedPersonsAdmin: list }, changed: list.length };
    },
  },
  {
    name: "UAE Arms Length",
    screen: "Arm's Length Tests",
    only: "uae",
    kind: "table",
    path: "armsLength.tests",
    columns: ["Category", "Transaction", "TP method", "Market range",
              "Actual amount (AED)", "Compliant (Y/N)", "Notes"],
    rows: (rd) => (getPath(rd, "armsLength.tests") || []).map(t => [
      str(t.category), str(t.description), str(t.tpMethod), str(t.marketRange),
      str(t.amount), yn(t.compliant), str(t.notes),
    ]),
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0]) || !blank(r[1])).map(r => ({
        category: str(r[0]), description: str(r[1]), tpMethod: str(r[2]), marketRange: str(r[3]),
        amount: cellNum(r[4]), compliant: yes(r[5]), notes: str(r[6]),
      }));
      let out = setPath(draft, "armsLength.tests", list);
      out = setPath(out, "armsLength.totalTransactions", list.length);
      out = setPath(out, "armsLength.compliant", list.filter(t => t.compliant).length);
      return { draft: out, changed: list.length };
    },
  },
  {
    name: "UAE Revenue Recon",
    screen: "Revenue Reconciliation — IFRS to VAT",
    only: "uae",
    kind: "table",
    path: "revRecon.rows",
    columns: ["Description", "IFRS revenue", "VAT revenue", "Explanation"],
    note: "The reconciling items are a judgement about timing and recognition.",
    rows: (rd) => {
      const list = getPath(rd, "revRecon.rows") || [];
      if (list.length) return list.map(r => [str(r.desc), str(r.ifrs), str(r.vat), str(r.explanation)]);
      const rev = str(rd?.pl?.revenue?.actual);
      return [["Standard-rated sales", rev, rev, "Identical in both"]];
    },
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[0])).map(r => ({
        desc: str(r[0]), ifrs: cellNum(r[1]), vat: cellNum(r[2]), explanation: str(r[3]),
      }));
      return { draft: setPath(draft, "revRecon.rows", list), changed: list.length };
    },
  },
  {
    name: "UAE Audit Readiness",
    screen: "Audit Readiness",
    only: "uae",
    kind: "table",
    path: "auditReadiness.checklistItems",
    columns: ["Category", "Item", "Held (Y/N)", "Required (Y/N)", "Note"],
    note: "The score on the client's screen is worked out from these rows — held, out of required.",
    rows: (rd) => {
      const list = getPath(rd, "auditReadiness.checklistItems") || [];
      if (list.length) return list.map(i => [str(i.cat), str(i.item), yn(i.done), yn(i.req), str(i.note)]);
      return [
        ["Financial Statements", "Audited P&L (current year)", "", "Y", ""],
        ["Financial Statements", "Audited balance sheet", "", "Y", ""],
        ["Financial Statements", "Cash flow statement (IFRS)", "", "Y", ""],
        ["Tax Documentation", "VAT returns, last four quarters", "", "Y", ""],
        ["Tax Documentation", "CT registration certificate", "", "Y", ""],
        ["Tax Documentation", "Free zone supporting documents", "", "Y", ""],
      ];
    },
    parse: (rows, draft) => {
      const list = rows.filter(r => !blank(r[1])).map(r => ({
        cat: str(r[0]) || "Other", item: str(r[1]), done: yes(r[2]),
        req: blank(r[3]) ? true : yes(r[3]), note: str(r[4]),
      }));
      const req = list.filter(i => i.req);
      let out = setPath(draft, "auditReadiness.checklistItems", list);
      out = setPath(out, "auditReadiness.auditScore",
        req.length ? Math.round((req.filter(i => i.done).length / req.length) * 100) : null);
      return { draft: out, changed: list.length };
    },
  },
  {
    name: "UAE Vertical Analysis",
    screen: "Vertical Analysis",
    only: "uae",
    kind: "kv",
    note: "Every P&L line as a share of revenue is worked out from the trial balance. The period label and the note are yours.",
    fields: [
      { key: "verticalAnalysis.period",     label: "Period",         source: YOU },
      { key: "verticalAnalysis.garimaNote", label: "Your note",      source: YOU, long: true },
    ],
  },
  {
    name: "UAE Cash & Notes",
    screen: "UAE CFO Report → cash flow forecast and headers",
    only: "uae",
    kind: "kv",
    fields: [
      { key: "projectedCash",       label: "Projected cash, end of quarter", source: YOU },
      { key: "vatReserve",          label: "VAT reserve required",           source: ZOHO },
      { key: "netCashAfterObl",     label: "Net cash after obligations",     source: YOU },
      { key: "uaeGarimaNote",       label: "Note on Overview and the report header", source: YOU, long: true },
      { key: "cashflowGarimaNote",  label: "Note at the top of Cash Flow Forecast",  source: YOU, long: true },
      { key: "revRecon.period",     label: "Revenue reconciliation period",  source: YOU },
      { key: "revRecon.garimaNote", label: "Revenue reconciliation note",    source: YOU, long: true },
      { key: "rptGarimaNote",       label: "Related party note",             source: YOU, long: true },
      { key: "cpGarimaNote",        label: "Connected persons note",         source: YOU, long: true },
    ],
  },
];

/** The sheets that apply to one client. */
export const sheetsFor = (uae) => SHEETS.filter(s => !s.only || (s.only === "uae") === !!uae);

// ── Building the workbook ───────────────────────────────────────────────────

const READ_ME = (clientName, uae, sheetNames) => [
  ["Finzzup — analysis workbook"],
  [clientName || ""],
  [],
  ["How this works"],
  ["1.", "Figures already in the sheets came from the accounting records when you downloaded this."],
  ["2.", "Do the analysis here, in Excel, the way you would anyway."],
  ["3.", "Upload this same file back to the portal. Every sheet lands on the screen it belongs to."],
  ["4.", "Read the summary the portal shows you, then publish."],
  [],
  ["Two things worth knowing"],
  ["", "A blank cell changes nothing. To leave a figure as it is, leave the cell alone."],
  ["", "Rows marked \"" + ZOHO + "\" are worked out from the books on every sync."],
  ["", "They are here so your analysis has something to sit on. An edit to one will not survive the next sync."],
  ["", "Do not rename a sheet, or delete the heading row — that is how the portal finds its way around."],
  [],
  ["Sheets in this workbook", String(sheetNames.length)],
  ...sheetNames.map(([n, where]) => ["", n, where]),
  [],
  ["Jurisdiction", uae ? "UAE — AED, VAT, Corporate Tax, QFZP" : "India — ₹, GST, TDS, Section 43B(h)"],
  ["Downloaded", new Date().toISOString().slice(0, 10)],
];

/**
 * Every sheet, as arrays of arrays, ready for SheetJS.
 * @param {object} ctx {client, reportData, kpis, actions, uae}
 */
export function buildWorkbook(ctx = {}) {
  const { client, reportData = {}, kpis = {}, uae } = ctx;
  const isUae = uae != null ? uae : /uae|cross/i.test(client?.jurisdiction || "");
  const specs = sheetsFor(isUae);

  const out = [{
    name: "Read me",
    aoa: READ_ME(
      [client?.company, client?.name].filter(Boolean).join(" — "),
      isUae,
      specs.map(s => [s.name, s.screen]),
    ),
  }];

  for (const s of specs) {
    const aoa = [];
    if (s.note) { aoa.push([s.note]); aoa.push([]); }

    if (s.kind === "kv") {
      aoa.push(["Field", "Value", "Where it comes from", "id — do not edit"]);
      const src = s.target === "kpis" ? kpis : reportData;
      for (const f of s.fields) {
        const v = s.path ? getPath(src, `${s.path}.${f.key}`) : getPath(src, f.key);
        // A key holding a list or an object belongs on a table sheet. Writing
        // String(v) here printed "[object Object],[object Object]" into a cell
        // that then looked editable — and editing it would have replaced the
        // list with a sentence.
        const scalar = v == null || typeof v === "object" ? "" : (typeof v === "boolean" ? yn(v) : String(v));
        aoa.push([f.label, scalar, f.source, f.key]);
      }
    } else if (s.kind === "table") {
      aoa.push([...s.columns]);
      const rows = s.rows ? s.rows(reportData, ctx) : [];
      for (const r of rows) aoa.push(r);
      // Always leave room to add more.
      for (let i = 0; i < 8; i++) aoa.push(s.columns.map(() => ""));
    } else if (s.kind === "map") {
      aoa.push([s.keyColumn, ...s.columns]);
      const stored = getPath(reportData, s.path) || {};
      const names = Array.from(new Set([...Object.keys(stored), ...(s.seed || [])]));
      for (const n of names) {
        aoa.push([n, ...s.fieldKeys.map(k => str(stored[n]?.[k]))]);
      }
      for (let i = 0; i < 4; i++) aoa.push(["", ...s.columns.map(() => "")]);
      if (s.extra?.length) {
        aoa.push([]);
        aoa.push(["Field", "Value", "Where it comes from", "id — do not edit"]);
        for (const f of s.extra) {
          aoa.push([f.label, str(getPath(reportData, f.key)), f.source, f.key]);
        }
      }
    }
    out.push({ name: s.name, aoa });
  }
  return out;
}

// ── Reading it back ─────────────────────────────────────────────────────────

const headerIndex = (aoa, wanted) => {
  for (let i = 0; i < Math.min(aoa.length, 6); i++) {
    const row = (aoa[i] || []).map(c => str(c).toLowerCase());
    if (row.some(c => c === wanted)) return i;
  }
  return -1;
};

/**
 * Turn a filled workbook into a report-data patch.
 *
 * Nothing is written anywhere here — this returns what WOULD change, so the
 * admin screen can show it before anything is published. A sheet that is
 * missing, renamed or empty is reported and skipped, never guessed at.
 *
 * @param {object} byName {sheetName: aoa}
 * @param {object} ctx {reportData, kpis, uae}
 * @returns {{reportData, kpis, actions, summary, problems}}
 */
export function readWorkbook(byName = {}, ctx = {}) {
  const isUae = !!ctx.uae;
  const specs = sheetsFor(isUae);
  let draft = { ...(ctx.reportData || {}) };
  let kpisOut = { ...(ctx.kpis || {}) };
  let actions = null;
  const summary = [];
  const problems = [];

  for (const s of specs) {
    const aoa = byName[s.name];
    if (!aoa) { problems.push(`The sheet "${s.name}" is not in the file — ${s.screen} was left as it is.`); continue; }

    if (s.kind === "kv" || (s.kind === "map" && s.extra)) {
      const hdr = headerIndex(aoa, "field");
      if (s.kind === "kv" && hdr < 0) { problems.push(`"${s.name}" has no "Field" heading row, so it was skipped.`); continue; }
      if (hdr >= 0) {
        const head = (aoa[hdr] || []).map(c => str(c).toLowerCase());
        const vi = head.findIndex(c => c === "value");
        const ki = head.findIndex(c => c.startsWith("id"));
        const li = head.findIndex(c => c === "field");
        const all = s.kind === "map" ? s.extra : s.fields;
        const byLabel = Object.fromEntries(all.map(f => [f.label.toLowerCase(), f.key]));
        let n = 0;
        for (let i = hdr + 1; i < aoa.length; i++) {
          const row = aoa[i] || [];
          const key = (ki >= 0 && !blank(row[ki])) ? str(row[ki]) : byLabel[str(row[li]).toLowerCase()];
          if (!key) continue;
          if (vi < 0 || blank(row[vi])) continue;       // blank changes nothing
          const full = (s.kind === "kv" && s.path) ? `${s.path}.${key}` : key;
          const val  = str(row[vi]);
          // Only count a figure that actually differs. Most cells come back
          // holding the same Zoho figure they were downloaded with, and
          // reporting those as changes would bury the handful that are real.
          const before = s.target === "kpis" ? kpisOut[key] : getPath(draft, full);
          if (wouldClobber(before, val)) continue;
          if (str(before) !== val) n++;
          if (s.target === "kpis") kpisOut[key] = val;
          else draft = setPath(draft, full, val);
        }
        if (s.kind === "kv") { summary.push({ sheet: s.name, screen: s.screen, changed: n, unit: "figures" }); continue; }
        summary.push({ sheet: s.name, screen: s.screen, changed: n, unit: "figures", partial: true });
      }
    }

    if (s.kind === "table") {
      const hdr = headerIndex(aoa, str(s.columns[0]).toLowerCase());
      if (hdr < 0) { problems.push(`"${s.name}" has no "${s.columns[0]}" heading row, so it was skipped.`); continue; }
      const rows = aoa.slice(hdr + 1).filter(r => (r || []).some(c => !blank(c)));
      if (!rows.length) { summary.push({ sheet: s.name, screen: s.screen, changed: 0, unit: "rows" }); continue; }

      // A sheet downloaded and uploaded untouched comes back holding exactly
      // what it left with, and reporting those rows as changes would drown the
      // few that are real. The uploaded rows are compared against the rows the
      // sheet would be built with right now — comparing the parsed objects
      // instead would flag every row, because parsing normalises their shape.
      const asText = (rr) => JSON.stringify(
        (rr || []).map(r => (r || []).map(c => str(c))).filter(r => r.some(Boolean)));
      const untouched = asText(s.rows ? s.rows(ctx.reportData || {}, ctx) : []) === asText(rows);

      const res = s.parse(rows, draft, ctx);
      if (res.draft) draft = res.draft;
      if (res.actions) actions = res.actions;

      summary.push({ sheet: s.name, screen: s.screen, unit: s.name === "P&L" ? "figures" : "rows",
                     changed: untouched ? 0 : res.changed });
    }

    if (s.kind === "map") {
      const hdr = headerIndex(aoa, str(s.keyColumn).toLowerCase());
      if (hdr < 0) { problems.push(`"${s.name}" has no "${s.keyColumn}" heading row, so it was skipped.`); continue; }
      const obj = { ...(getPath(draft, s.path) || {}) };
      let n = 0;
      for (let i = hdr + 1; i < aoa.length; i++) {
        const row = aoa[i] || [];
        const name = str(row[0]);
        if (!name || name.toLowerCase() === "field") break;    // the extra block starts here
        const entry = { ...(obj[name] || {}) };
        let touched = false, differs = false;
        s.fieldKeys.forEach((k, j) => {
          if (blank(row[j + 1])) return;
          const val = str(row[j + 1]);
          if (str(entry[k]) !== val) differs = true;
          entry[k] = val; touched = true;
        });
        if (touched) { obj[name] = entry; if (differs) n++; }
      }
      draft = setPath(draft, s.path, obj);
      const prev = summary.find(x => x.sheet === s.name && x.partial);
      if (prev) { prev.changed += n; delete prev.partial; }
      else summary.push({ sheet: s.name, screen: s.screen, changed: n, unit: "figures" });
    }
  }

  return { reportData: draft, kpis: kpisOut, actions, summary, problems };
}

// ─── THE P&L, LINE BY LINE ────────────────────────────────────────────────────
// The P&L is declared as a table because that is how it reads on a sheet, but
// the portal stores it as named figures and the feed has to carry it that way.
// One list, used by the sheet that writes the feed and the reader that reads
// it, so the two cannot disagree about what an id is called.
export const PL_LINES = [
  ["revenue",      "Revenue"],
  ["cogs",         "Cost of sales"],
  ["grossProfit",  "Gross profit"],
  ["gpMargin",     "GP margin %"],
  ["ebitda",       "EBITDA"],
  ["ebitdaMargin", "EBITDA margin %"],
  ["pat",          "Net profit / PAT"],
  ["netMargin",    "Net margin %"],
];

export const PL_POINTS = PL_LINES.flatMap(([key, label]) => ([
  { id: `pl.${key}.actual`, label: `${label} — this month`,     screen: "Monthly Report → P&L summary" },
  { id: `pl.${key}.prev`,   label: `${label} — previous month`, screen: "Monthly Report → P&L summary" },
]));

const wouldClobber = (before, value) =>
  before != null && typeof before === "object" && typeof value !== "object";

// ─── READING THE PORTAL FEED ──────────────────────────────────────────────────
// The analysis workbook carries one sheet the portal reads: Portal Feed, with
// a data point id in the first column and its value in the Value column.
//
// That one fixed sheet is the whole mapping. The workings behind it can be
// restructured freely — rows inserted, schedules rebuilt, sheets renamed —
// and the portal still reads the right figure, because it never looks at them.
// Binding to cells scattered across thirty tabs would break on the first
// inserted row, and break silently.

/** "Variance!A:G" or "'UAE Rev Recon'!A5:E20" → {sheet, r1, c1, r2, c2} */
export function parseRef(ref) {
  const s = String(ref || "").trim();
  const m = s.match(/^(?:'((?:[^']|'')+)'|([^'!]+))!\s*([A-Za-z]+)(\d*)(?:\s*:\s*([A-Za-z]+)(\d*))?$/);
  if (!m) return null;
  const col = (letters) => {
    let n = 0;
    for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  const sheet = (m[1] != null ? m[1].replace(/''/g, "'") : m[2]).trim();
  const c1 = col(m[3]), c2 = m[5] ? col(m[5]) : c1;
  // A whole-column reference ("A:G") has no row numbers; take the lot.
  const r1 = m[4] ? parseInt(m[4], 10) - 1 : 0;
  const r2 = m[6] ? parseInt(m[6], 10) - 1 : Infinity;
  return { sheet, r1: Math.min(r1, r2), c1: Math.min(c1, c2),
                  r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
}

const norm = (v) => str(v).toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9%]+/g, "");

/** Do a heading and a wanted column mean the same thing? */
const sameColumn = (head, want) => {
  const a = norm(head), b = norm(want);
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length < b.length ? a : b;
  return short.length >= 3 && (a.startsWith(b) || b.startsWith(a));
};

/**
 * Rows out of a range, lined up with the columns the portal expects.
 *
 * The workbook's own tables are written to be read by a person — the variance
 * sheet puts the variance and the percentage between the actual and the
 * verdict, because that is the order you want them in when you are looking at
 * it. The portal wants four specific columns. Rather than forcing one layout
 * on the other, this finds the heading row and matches by name, so columns can
 * be reordered, inserted or renamed a little and the figures still land.
 *
 * With no heading row it falls back to reading the columns in order, which is
 * what a plain pasted range is.
 */
export function readRange(sheets, ref, columns = []) {
  const p = parseRef(ref);
  if (!p) return [];
  const aoa = sheets[p.sheet];
  if (!aoa) return [];

  const slice = [];
  const last = Math.min(p.r2, aoa.length - 1);
  for (let r = p.r1; r <= last; r++) {
    const row = [];
    for (let c = p.c1; c <= p.c2; c++) row.push((aoa[r] || [])[c] ?? "");
    slice.push(row);
  }

  // The heading row is the one that names the most of what we are looking for.
  let headAt = -1, bestHits = 0;
  if (columns.length) {
    for (let i = 0; i < Math.min(slice.length, 40); i++) {
      let hits = 0;
      for (const want of columns) if (slice[i].some(cellv => sameColumn(cellv, want))) hits++;
      if (hits > bestHits && hits >= Math.min(2, columns.length)) { bestHits = hits; headAt = i; }
    }
  }

  if (headAt < 0) return slice.filter(r => r.some(v => str(v) !== ""));

  // Which column of the sheet holds each column the portal wants.
  const head = slice[headAt];
  const index = columns.map(want => head.findIndex(cellv => sameColumn(cellv, want)));

  const out = [];
  for (let i = headAt + 1; i < slice.length; i++) {
    const row = slice[i];
    // A blank line ends the table. Sheets carry other things below their
    // tables — a commentary box, a note, a second block — and a whole-column
    // reference would otherwise sweep them in as data.
    if (!row.some(v => str(v) !== "")) { if (out.length) break; else continue; }
    // A second heading row, or a total, is not data.
    if (columns.some(want => sameColumn(row[0], want))) continue;
    if (/^(total|sum)\b/i.test(str(row[0]))) continue;
    out.push(index.map((at, j) => (at >= 0 ? (row[at] ?? "") : "")));
  }
  return out;
}

/**
 * Read an uploaded analysis workbook through its Portal Feed sheet.
 *
 * A blank value changes nothing, as everywhere else — clearing a figure is not
 * the same as not having got to it yet. A row whose id the portal no longer
 * shows is reported rather than dropped silently.
 *
 * @param {object} byName {sheetName: aoa}
 * @returns {{reportData, kpis, actions, summary, problems}|null} null when
 *          the file has no Portal Feed sheet at all
 */
export function readPortalFeed(byName = {}, ctx = {}) {
  const feed = byName["Portal Feed"];
  if (!feed) return null;

  const uae   = !!ctx.uae;
  const specs = sheetsFor(uae);
  const byId  = {};
  for (const s of specs) {
    if (s.kind === "kv") {
      for (const f of s.fields) {
        const id = s.target === "kpis" ? `kpis.${f.key}` : (s.path ? `${s.path}.${f.key}` : f.key);
        byId[id] = { spec: s, field: f, kind: "scalar" };
      }
    } else if (s.kind === "table") {
      byId[s.target === "actions" ? "actions" : s.path] = { spec: s, kind: "table" };
    } else if (s.kind === "map") {
      byId[s.path] = { spec: s, kind: "map" };
      for (const f of (s.extra || [])) byId[f.key] = { spec: s, field: f, kind: "scalar" };
    }
  }

  // The P&L travels as named figures rather than as a range.
  for (const p of PL_POINTS) {
    byId[p.id] = { spec: { screen: p.screen, target: "report" }, field: { label: p.label }, kind: "scalar" };
  }

  let draft   = { ...(ctx.reportData || {}) };
  let kpisOut = { ...(ctx.kpis || {}) };
  let actions = null;
  const changed  = [];
  const problems = [];
  const unknown  = [];

  for (const rowArr of feed) {
    const row = rowArr || [];
    const id  = str(row[0]);
    if (!id || id.startsWith("id") || id === "Figure") continue;
    const point = byId[id];
    // Section bands and notes live in the first column too. Only something
    // shaped like an id is worth reporting as one the portal no longer shows.
    if (!point) {
      if (/^[a-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/.test(id) && id.length < 60) unknown.push(id);
      continue;
    }

    const raw = row[3];
    if (blank(raw)) continue;                       // blank changes nothing

    if (point.kind === "scalar") {
      const val = typeof raw === "number" ? String(raw) : str(raw);
      const key = id.replace(/^kpis\./, "");
      const before = point.spec.target === "kpis" ? kpisOut[key] : getPath(draft, id);
      // The client screens walk some of these as lists. Replacing one with a
      // sentence does not look wrong here and crashes the page that reads it.
      if (wouldClobber(before, val)) {
        problems.push(`${point.field?.label || id} holds a list on this client's report, so the single value in the feed was ignored.`);
        continue;
      }
      if (str(before) === val) continue;
      if (point.spec.target === "kpis") kpisOut[key] = val;
      else draft = setPath(draft, id, val);
      changed.push({ id, label: point.field?.label || id, screen: point.spec.screen,
                     from: str(before), to: val });
      continue;
    }

    // A table or a map says where its rows live rather than holding them.
    const ref = str(raw);
    const parsed = parseRef(ref);
    if (!parsed) { problems.push(`${point.spec.name}: "${ref}" is not a range the portal understands.`); continue; }
    if (!byName[parsed.sheet]) {
      problems.push(`${point.spec.name}: this workbook has no sheet called "${parsed.sheet}", so it was left as it was.`);
      continue;
    }
    const rows = readRange(byName, ref, point.spec.columns || [point.spec.keyColumn]);
    if (!rows.length) { problems.push(`${point.spec.name}: ${ref} has no filled rows.`); continue; }

    if (point.kind === "table") {
      const res = point.spec.parse(rows, draft, ctx);
      if (res.draft) draft = res.draft;
      if (res.actions) actions = res.actions;
      changed.push({ id, label: point.spec.name, screen: point.spec.screen,
                     from: "", to: `${rows.length} row${rows.length === 1 ? "" : "s"}` });
    } else {
      const obj = { ...(getPath(draft, id) || {}) };
      let n = 0;
      for (const rr of rows) {
        const name = str(rr[0]);
        if (!name) continue;
        const entry = { ...(obj[name] || {}) };
        point.spec.fieldKeys.forEach((k, j) => {
          if (!blank(rr[j + 1])) entry[k] = str(rr[j + 1]);
        });
        obj[name] = entry; n++;
      }
      draft = setPath(draft, id, obj);
      changed.push({ id, label: point.spec.name, screen: point.spec.screen,
                     from: "", to: `${n} row${n === 1 ? "" : "s"}` });
    }
  }

  if (unknown.length) {
    problems.push(`${unknown.length} row${unknown.length === 1 ? "" : "s"} in the feed name a figure the portal no longer shows (${unknown.slice(0, 3).join(", ")}${unknown.length > 3 ? "…" : ""}). They were ignored.`);
  }

  // Grouped the way the admin screen shows it: by the screen each figure feeds.
  const byScreen = {};
  for (const c of changed) (byScreen[c.screen] ||= []).push(c);
  const summary = Object.entries(byScreen)
    .map(([screen, items]) => ({ screen, changed: items.length, items }))
    .sort((a, b) => b.changed - a.changed);

  return { reportData: draft, kpis: kpisOut, actions, changed, summary, problems };
}
