// ─── DERIVED REPORT DATA ──────────────────────────────────────────────────────
// Everything the books can work out on their own.
//
// The portal reads around 140 keys out of a client's report data. A sync that
// fills nine of them leaves the other screens empty and the work manual, which
// defeats the point of connecting the books at all. This computes every figure
// that genuinely follows from a trial balance, an invoice list and a bill list.
//
// What it deliberately does NOT compute, because the books do not contain it:
//   budgets and variance        — needs a budget nobody has given us
//   scenarios and forecasts     — needs assumptions, which are a judgement
//   treasury, loans, DSCR       — needs facility terms and bank balances
//   ARR, churn, CAC, LTV        — Zoho Books does not model subscriptions
//   related party, arm's length — a determination, not a number
//   every note and commentary   — the part a Chartered Accountant is paid for
//
// Guessing any of those would put invented figures back on a client's screen,
// which is the bug this project has spent two days removing.

const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
const div = (a, b) => (b ? a / b : null);
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

/**
 * @param {object} input
 * @param {object} input.statements   from buildStatements
 * @param {Array}  input.receivables  ageing buckets from invoicesToReceivables
 * @param {Array}  input.payables     ageing buckets from billsToPayables
 * @param {Array}  input.revenue      revenue drill rows
 * @param {Array}  input.supplierSpend
 * @param {object} input.registers    {customers, vendors}
 * @param {number} input.periodDays   days the P&L covers — day-based ratios are
 *                                    meaningless without it, so they are omitted
 *                                    rather than computed against a guess
 * @param {boolean} input.uae
 */
export function deriveReportData({ statements, receivables = [], payables = [],
                                   revenue = [], supplierSpend = [], registers = null,
                                   periodDays = null, uae = false } = {}) {
  if (!statements) return {};
  const pl = statements.pl, bs = statements.bs;
  const cur = (v) => (uae ? "AED " : "₹") + Math.round(n(v)).toLocaleString(uae ? "en-AE" : "en-IN");

  // ── Ratios that need no period ──────────────────────────────────────────
  const currentAssets = n(bs.receivables) + n(bs.inventory) + n(bs.cash) + n(bs.otherAssets);
  const currentLiab   = n(bs.payables) + n(bs.otherLiab);
  const currentRatio  = div(currentAssets, currentLiab);
  const quickRatio    = div(currentAssets - n(bs.inventory), currentLiab);
  const debtEquity    = div(n(bs.borrowings), n(bs.equity));
  const roe           = div(n(pl.pat), n(bs.equity));

  // ── Ratios that need one ────────────────────────────────────────────────
  // Days outstanding is receivables over revenue times days. Without knowing
  // how many days the revenue covers, the answer is arbitrary — so these stay
  // null and the screens show a dash.
  const debtorDays   = periodDays ? div(n(bs.receivables), n(pl.revenue)) * periodDays : null;
  const creditorDays = periodDays ? div(n(bs.payables),    n(pl.cogs))    * periodDays : null;
  const inventoryDays= periodDays && n(pl.cogs) ? div(n(bs.inventory), n(pl.cogs)) * periodDays : null;
  const ccc = (debtorDays != null && creditorDays != null)
    ? debtorDays + (inventoryDays || 0) - creditorDays : null;

  const bucket = (rows, name) => rows.find(b => b.name === name)?.value || 0;

  // ── Vertical analysis: every P&L line as a share of revenue ─────────────
  const vLine = (label, value) => ({
    label, value: Math.round(n(value)),
    pct: pl.revenue ? r1((n(value) / n(pl.revenue)) * 100) : null,
  });
  const verticalRows = [
    vLine("Revenue",            pl.revenue),
    vLine("Cost of Sales",      pl.cogs),
    vLine("Gross Profit",       pl.grossProfit),
    vLine("Operating Expenses", pl.opex),
    vLine("EBITDA",             pl.ebitda),
    vLine("Depreciation",       pl.depreciation),
    vLine("Finance Cost",       pl.finance),
    vLine("Tax",                pl.tax),
    vLine("Net Profit",         pl.pat),
  ];

  const out = {
    pl: {
      revenue:      { actual: cur(pl.revenue) },
      cogs:         { actual: cur(pl.cogs) },
      grossProfit:  { actual: cur(pl.grossProfit) },
      ebitda:       { actual: cur(pl.ebitda) },
      pat:          { actual: cur(pl.pat) },
      gpMargin:     { actual: pl.gpMargin     || "—" },
      ebitdaMargin: { actual: pl.ebitdaMargin || "—" },
      netMargin:    { actual: pl.netMargin    || "—" },
    },

    workingCapital: {
      receivables: Math.round(n(bs.receivables)),
      inventory:   Math.round(n(bs.inventory)),
      payables:    Math.round(n(bs.payables)),
      cashBank:    Math.round(n(bs.cash)),
      debtors:     Math.round(n(bs.receivables)),
      creditors:   Math.round(n(bs.payables)),
      currentRatio: currentRatio == null ? null : `${r1(currentRatio)}x`,
      quickRatio:   quickRatio   == null ? null : `${r1(quickRatio)}x`,
      dso: debtorDays   == null ? null : Math.round(debtorDays),
      dpo: creditorDays == null ? null : Math.round(creditorDays),
      dio: inventoryDays== null ? null : Math.round(inventoryDays),
      debtorDays:   debtorDays   == null ? null : Math.round(debtorDays),
      creditorDays: creditorDays == null ? null : Math.round(creditorDays),
      inventoryDays:inventoryDays== null ? null : Math.round(inventoryDays),
      ccc: ccc == null ? null : Math.round(ccc),
      // Ageing, straight from the invoices and bills themselves.
      ar0_30:   bucket(receivables, "Current"),
      ar31_60:  bucket(receivables, "31–60d"),
      ar61_90:  bucket(receivables, "61–90d"),
      ar90plus: bucket(receivables, "90d+"),
      arAging:  (registers?.customers || []).map(c => ({ name: c.name, total: c.receivable })).filter(x => x.total > 0),
      apSchedule: payables.flatMap(b => b.txns.map(t => ({
        vendor: t.desc, amount: t.amount, dueDate: t.dueDate,
        priority: b.name === "Current" ? "On Track" : b.name === "90d+" ? "Overdue" : "Upcoming",
      }))),
    },

    // What the client clicks through to.
    drill: {
      revenue:       { label:"Revenue",        dims:[{ key:"customer", title:"By customer", rows: revenue }] },
      receivables:   { label:"Receivables",    dims:[{ key:"age",      title:"By age",      rows: receivables }] },
      payables:      { label:"Payables",       dims:[{ key:"age",      title:"By age",      rows: payables }] },
      supplierSpend: { label:"Supplier spend", dims:[{ key:"vendor",   title:"By supplier", rows: supplierSpend }] },
    },

    vendorRegister: (registers?.vendors || []).map(v => ({
      name: v.name, outstanding: v.payable, terms: v.paymentTerms || "", currency: v.currency || "",
    })),

    verticalPnL: verticalRows,
    verticalAnalysis: { rows: verticalRows, period: null },

    metrics: {
      currentRatio: r1(currentRatio), quickRatio: r1(quickRatio),
      debtEquity:   r1(debtEquity),
      roe:          roe == null ? null : r1(roe * 100),
      debtorTurn:   periodDays ? r1(div(n(pl.revenue), n(bs.receivables))) : null,
      invTurnover:  periodDays && n(bs.inventory) ? r1(div(n(pl.cogs), n(bs.inventory))) : null,
    },

    derivedAt: new Date().toISOString(),
    derivedPeriodDays: periodDays,
  };

  // Corporate tax, for a UAE client, from the profit just computed.
  if (uae) {
    const revenueNum = n(pl.revenue), profit = n(pl.pat);
    const sbr = revenueNum > 0 && revenueNum <= 3_000_000;
    out.ct = {
      revenue: Math.round(revenueNum),
      taxableIncome: Math.round(Math.max(0, profit)),
      sbrEligible: sbr,
      liability: sbr ? 0 : Math.round(Math.max(0, profit - 375_000) * 0.09),
      basis: sbr ? "Small Business Relief — revenue within the AED 3M cap"
                 : "9% above the AED 375,000 nil band",
    };
  }

  return out;
}

/**
 * Merge derived figures into a client's report data without touching anything
 * a person wrote. Notes, commentary, budgets and determinations survive a
 * resync; computed figures are replaced.
 */
export function mergeDerived(existing = {}, derived = {}) {
  const out = { ...existing };
  for (const [k, v] of Object.entries(derived)) {
    if (v && typeof v === "object" && !Array.isArray(v) && existing[k] && typeof existing[k] === "object" && !Array.isArray(existing[k])) {
      out[k] = { ...existing[k], ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}
