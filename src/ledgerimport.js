// ─── LEDGER IMPORT: AGEING / INVOICE REGISTERS → DRILL DATA ───────────────────
// A trial balance stops at "Sundry Debtors — 98,00,000". The detail a client
// actually wants to drill into lives in a different export: the bill-wise
// outstanding report, or the sales register.
//
// This turns either of those into the drill structure the portal renders, and
// reconciles the total back to the trial balance — because a customer list that
// does not tie to the ledger is not something a CA should sign off.

const CANON = {
  customer: ["party","party name","customer","customer name","account","ledger","name","buyer","vendor","supplier","payee"],
  invoice:  ["invoice","invoice no","invoice number","bill no","bill number","voucher no","voucher","ref","reference","doc no","invoice#"],
  date:     ["date","invoice date","bill date","voucher date","doc date"],
  due:      ["due date","due on","maturity","payable on"],
  amount:   ["amount","invoice amount","bill amount","total","invoice total","value","debit","gross"],
  balance:  ["balance","outstanding","pending","amount due","closing balance","balance due","o/s"],
  status:   ["status","payment status","state"],
};

const norm = h => String(h||"").toLowerCase().trim().replace(/[_.]/g," ").replace(/\s+/g," ");

/** Match a header row against the canonical fields above. */
export function detectColumns(headerCells) {
  const map = {};
  headerCells.forEach((raw, i) => {
    const h = norm(raw);
    for (const [field, names] of Object.entries(CANON)) {
      if (map[field] != null) continue;
      if (names.some(n => h === n) || names.some(n => h.includes(n) && n.length > 3)) { map[field] = i; break; }
    }
  });
  return map;
}

const money = v => {
  if (v == null) return NaN;
  let s = String(v).trim().replace(/[,\s₹$]/g,"").replace(/AED/gi,"");
  if (!s || s === "-") return NaN;
  let neg = /^\(.*\)$/.test(s);
  if (neg) s = s.slice(1,-1);
  s = s.replace(/(dr|cr)$/i,"");
  const n = parseFloat(s);
  if (!isFinite(n)) return NaN;
  return neg ? -n : n;
};

// Accepts 12/07/2026, 12-07-2026, 2026-07-12, "12 Jul 2026". Day-first, which
// is how Indian and UAE accounting packages export.
export function parseDate(v) {
  const s = String(v||"").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2]-1, +m[1]); }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

const daysBetween = (a,b) => Math.floor((a - b) / 864e5);
export const AGE_BUCKETS = ["Current", "31–60d", "61–90d", "90d+"];
export function bucketFor(days) {
  if (days == null) return 0;
  if (days <= 30) return 0;
  if (days <= 60) return 1;
  if (days <= 90) return 2;
  return 3;
}

/**
 * Parse an ageing / invoice register.
 * @param text  pasted CSV, TSV or pipe-delimited content (header row required)
 * @param opts.asOn  reference date for ageing (defaults to today)
 * @returns {{rows, columns, totalOutstanding, skipped, unmatchedHeaders}}
 */
export function parseLedger(text, { asOn = new Date() } = {}) {
  const lines = String(text||"").replace(/\r\n?/g,"\n").split("\n").map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return { rows:[], columns:{}, totalOutstanding:0, skipped:0, unmatchedHeaders:[] };
  const split = l => l.includes("\t") ? l.split("\t") : l.includes("|") ? l.split("|") : l.split(",");
  const cut = c => c.trim().replace(/^"|"$/g,"");

  const header = split(lines[0]).map(cut);
  const columns = detectColumns(header);
  const unmatchedHeaders = header.filter((h,i) => !Object.values(columns).includes(i) && h);

  const rows = []; let skipped = 0;
  for (const line of lines.slice(1)) {
    const c = split(line).map(cut);
    const get = f => columns[f] != null ? c[columns[f]] : undefined;

    const customer = (get("customer") || "").trim();
    if (!customer || /^(total|grand total|closing)\b/i.test(customer)) { skipped++; continue; }

    // Outstanding is what we age; fall back to invoice amount when the export
    // only carries one figure.
    const bal = money(get("balance"));
    const amt = money(get("amount"));
    const outstanding = isFinite(bal) ? bal : (isFinite(amt) ? amt : NaN);
    // A settled invoice still belongs in a sales register even though nothing is
    // outstanding — dropping it would understate revenue. The receivables drill
    // filters paid rows out separately.
    if (!isFinite(outstanding) && !isFinite(amt)) { skipped++; continue; }
    if (outstanding === 0 && !isFinite(amt)) { skipped++; continue; }

    const date = parseDate(get("date"));
    const due  = parseDate(get("due"));
    // Ageing runs from the invoice date, matching the Current / 31–60 / 61–90 /
    // 90d+ buckets used throughout the portal. The due date decides only whether
    // an item is overdue — a 40-day-old invoice on 60-day terms is not.
    const days = date ? daysBetween(asOn, date) : (due ? daysBetween(asOn, due) : null);
    const daysPastDue = due ? daysBetween(asOn, due) : null;

    const rawStatus = String(get("status")||"").toLowerCase();
    const settled = /paid|settled|closed/.test(rawStatus) || (isFinite(bal) && bal === 0);
    const status = settled ? "paid"
                 : (daysPastDue != null && daysPastDue > 0) || /overdue/.test(rawStatus) ? "overdue"
                 : "unpaid";

    rows.push({
      customer,
      invoice: (get("invoice") || "").trim() || "—",
      date, due, days, daysPastDue,
      amount: isFinite(amt) ? amt : outstanding,
      outstanding: settled ? 0 : outstanding,
      status,
      bucket: bucketFor(days),
    });
  }
  return {
    rows, columns, unmatchedHeaders, skipped,
    totalOutstanding: rows.reduce((s,r)=>s + (r.status==="paid" ? 0 : r.outstanding), 0),
  };
}

const fmtDate = d => d ? d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";

/**
 * Build the receivables drill: rows are ageing buckets, transactions are the
 * invoices sitting in each. Matches the shape DrillDownPanel renders.
 */
export function buildReceivablesDrill(parsed, { currency = "₹", label = "Receivables", note = "" } = {}) {
  const open = parsed.rows.filter(r => r.status !== "paid");
  const rows = AGE_BUCKETS.map((name, i) => {
    const inBucket = open.filter(r => r.bucket === i);
    return {
      name,
      value: inBucket.reduce((s,r)=>s+r.outstanding,0),
      sub: inBucket.length ? `${inBucket.length} invoice${inBucket.length>1?"s":""}` : "None",
      txns: inBucket
        .sort((a,b)=>(b.daysPastDue||b.days||0)-(a.daysPastDue||a.days||0))
        .slice(0,12)
        .map(r => ({
          id: r.invoice, date: fmtDate(r.date),
          desc: r.customer + (r.daysPastDue > 0 ? ` · ${r.daysPastDue} days overdue` : ""),
          amount: currency + Math.round(r.outstanding).toLocaleString(),
          status: r.status,
        })),
    };
  });
  return { label, total:"", period:"outstanding invoices", note,
           dims:[{ key:"aging", title:"By Age", rows }] };
}

/**
 * Build the revenue-by-customer drill from a sales register (all invoices in
 * the period, paid or not). Top 8 by value, remainder grouped.
 */
export function buildRevenueDrill(parsed, { currency = "₹", label = "Revenue", period = "", note = "" } = {}) {
  const byCustomer = {};
  parsed.rows.forEach(r => {
    (byCustomer[r.customer] ||= { name:r.customer, value:0, txns:[] });
    byCustomer[r.customer].value += r.amount;
    byCustomer[r.customer].txns.push({
      id: r.invoice, date: fmtDate(r.date), desc: r.invoice === "—" ? "Invoice" : `Invoice ${r.invoice}`,
      amount: currency + Math.round(r.amount).toLocaleString(),
      status: r.status,
    });
  });
  const all = Object.values(byCustomer).sort((a,b)=>b.value-a.value);
  const top = all.slice(0,8).map(c => ({ ...c, sub:`${c.txns.length} invoice${c.txns.length>1?"s":""}`, txns:c.txns.slice(0,10) }));
  const rest = all.slice(8);
  if (rest.length) top.push({
    name:`Others (${rest.length} customers)`,
    value: rest.reduce((s,c)=>s+c.value,0),
    sub:`Avg ${currency}${Math.round(rest.reduce((s,c)=>s+c.value,0)/rest.length).toLocaleString()}/customer`,
    txns:[],
  });
  return { label, total:"", period, note, dims:[{ key:"customer", title:"By Customer", rows:top }] };
}

/**
 * Reconcile the ledger total against the trial balance figure.
 * A customer list that does not tie to the ledger should not be published.
 */
export function reconcile(parsed, tbFigure, { label = "Sundry Debtors", tolerance = 1 } = {}) {
  const money = n => Math.round(n).toLocaleString();
  if (tbFigure == null || !isFinite(tbFigure)) {
    return { level:"warn", label:"No trial balance figure to reconcile against",
             detail:`Import a trial balance first to verify this against ${label}.` };
  }
  const diff = parsed.totalOutstanding - tbFigure;
  if (Math.abs(diff) <= tolerance) {
    return { level:"ok", label:`Reconciles to ${label}`, detail:`Both ${money(tbFigure)}` };
  }
  return {
    level:"error",
    label:`Does not reconcile to ${label}`,
    detail:`Ledger ${money(parsed.totalOutstanding)} vs trial balance ${money(tbFigure)} — out by ${money(Math.abs(diff))}. Usually a missing invoice, an unposted credit note, or a different cut-off date.`,
  };
}

/** Checks shown before anything is published. */
export function validateLedger(parsed, reconciliation) {
  const out = [];
  out.push(parsed.rows.length
    ? { level:"ok", label:`${parsed.rows.length} invoices read`, detail: parsed.skipped ? `${parsed.skipped} rows skipped (headers, totals or blanks)` : "No rows skipped" }
    : { level:"error", label:"No invoices found", detail:"Check the file has a header row naming the customer and amount columns." });

  const missing = ["customer","amount"].filter(f => parsed.columns[f] == null && parsed.columns.balance == null);
  if (missing.length) out.push({ level:"error", label:"Required columns not found", detail:`Could not identify: ${missing.join(", ")}` });

  const noInvoice = parsed.rows.filter(r => r.invoice === "—").length;
  if (noInvoice) out.push({ level:"warn", label:`${noInvoice} rows have no invoice reference`, detail:"They will still total correctly, but the client cannot trace them individually." });

  const noDate = parsed.rows.filter(r => !r.date && !r.due).length;
  if (noDate) out.push({ level:"warn", label:`${noDate} rows have no usable date`, detail:"These cannot be aged and will fall into the Current bucket." });

  if (reconciliation) out.push(reconciliation);
  return out;
}

// ─── PAYABLES ─────────────────────────────────────────────────────────────────
// The mirror of receivables, plus the thing that makes it worth building:
// Section 43B(h). Since FY 2023-24, a payment to an MSME-registered supplier
// not settled within 45 days is disallowed as an expense in that year — the
// taxable income rises and the tax bill follows. It is discovered at assessment,
// months too late. Flagged live, it is still fixable.

export const MSME_LIMIT_DAYS = 45;

/**
 * Payables by age — same shape as the receivables drill.
 */
export function buildPayablesDrill(parsed, { currency = "₹", label = "Payables", note = "", vendorRegister = {} } = {}) {
  const open = parsed.rows.filter(r => r.status !== "paid");
  const rows = AGE_BUCKETS.map((name, i) => {
    const inBucket = open.filter(r => r.bucket === i);
    return {
      name,
      value: inBucket.reduce((s,r)=>s+r.outstanding,0),
      sub: inBucket.length ? `${inBucket.length} bill${inBucket.length>1?"s":""}` : "None",
      betterWhen: "lower",
      txns: inBucket
        .sort((a,b)=>(b.days||0)-(a.days||0))
        .slice(0,12)
        .map(r => {
          const msme = isMsme(r.customer, vendorRegister);
          const breach = msme && r.days > MSME_LIMIT_DAYS;
          return {
            id: r.invoice, date: fmtDate(r.date),
            desc: r.customer + (msme ? " · MSME" : "") + (breach ? ` · ${r.days - MSME_LIMIT_DAYS}d past 45-day limit` : ""),
            amount: currency + Math.round(r.outstanding).toLocaleString(),
            status: breach ? "overdue" : r.status,
          };
        }),
    };
  });
  return { label, total:"", period:"outstanding bills", note, betterWhen:"lower",
           dims:[{ key:"aging", title:"By Age", rows }] };
}

/** Spend by supplier — the cost-side equivalent of revenue by customer. */
export function buildSupplierSpendDrill(parsed, { currency = "₹", label = "Supplier Spend", period = "", note = "" } = {}) {
  const d = buildRevenueDrill(parsed, { currency, label, period, note });
  d.betterWhen = "lower";
  d.dims[0].title = "By Supplier";
  d.dims[0].key = "supplier";
  return d;
}

const vkey = n => String(n||"").toLowerCase().trim();
/** A vendor is MSME when the saved register says so. */
export function isMsme(vendor, register = {}) { return register[vkey(vendor)] === true; }

/** Build the register to persist: { "vendor name": true|false }. */
export function extractVendorRegister(rows, flags = {}) {
  const reg = {};
  rows.forEach(r => { const k = vkey(r.customer); if (k) reg[k] = flags[k] === true; });
  return reg;
}

/**
 * Section 43B(h) exposure.
 * @param taxRate  effective rate applied to the disallowance (India: 0.25 / 0.30)
 */
export function computeMsmeExposure(parsed, { vendorRegister = {}, taxRate = 0.25, currency = "₹" } = {}) {
  const open = parsed.rows.filter(r => r.status !== "paid");
  const msmeRows = open.filter(r => isMsme(r.customer, vendorRegister));
  const breached = msmeRows.filter(r => r.days != null && r.days > MSME_LIMIT_DAYS);
  const approaching = msmeRows.filter(r => r.days != null && r.days > MSME_LIMIT_DAYS - 15 && r.days <= MSME_LIMIT_DAYS);

  const atRisk = breached.reduce((s,r)=>s+r.outstanding,0);
  const soon   = approaching.reduce((s,r)=>s+r.outstanding,0);
  const byVendor = {};
  breached.forEach(r => {
    (byVendor[r.customer] ||= { name:r.customer, value:0, days:0, count:0 });
    byVendor[r.customer].value += r.outstanding;
    byVendor[r.customer].days = Math.max(byVendor[r.customer].days, r.days);
    byVendor[r.customer].count++;
  });

  return {
    msmeVendors: new Set(msmeRows.map(r => r.customer)).size,
    atRisk, taxImpact: atRisk * taxRate,
    approaching: soon, approachingCount: approaching.length,
    breachedCount: breached.length,
    vendors: Object.values(byVendor).sort((a,b)=>b.value-a.value),
    currency,
  };
}

/** Turn 43B(h) exposure into a drill panel. */
export function buildMsmeDrill(exposure, { label = "MSME Payments — Section 43B(h)" } = {}) {
  const c = exposure.currency;
  return {
    label, total: c + Math.round(exposure.atRisk).toLocaleString(),
    period: `past ${MSME_LIMIT_DAYS} days · ${exposure.breachedCount} bill${exposure.breachedCount===1?"":"s"}`,
    betterWhen: "lower",
    note: exposure.atRisk > 0
      ? `Paying these before year end keeps the expense allowable. Left unpaid, roughly ${c}${Math.round(exposure.taxImpact).toLocaleString()} is added to your tax bill.`
      : "No MSME supplier is past the 45-day limit.",
    dims: [{ key:"vendor", title:"By Supplier", rows: exposure.vendors.map(v => ({
      name: v.name, value: v.value, betterWhen:"lower",
      sub: `${v.count} bill${v.count>1?"s":""} · oldest ${v.days} days`, txns: [],
    })) }],
  };
}
