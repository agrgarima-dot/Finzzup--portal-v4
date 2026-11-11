// ─── ZOHO BOOKS → FINZZUP SHAPES ──────────────────────────────────────────────
// Turns what Zoho's API actually returns into the structures the portal already
// knows how to review and publish. Written against field names read off a live
// organisation (api/zoho-preview.js), not against documentation — Zoho's own
// pages and its SDKs disagree, and a parser built on guessed names compiles
// cleanly and then produces wrong figures in silence.
//
// Nothing here publishes anything. It produces the same row shapes the manual
// importers produce, so synced data lands in the existing review screen and
// still waits for a human to press Apply.

import { guessGroup, COA_GROUPS } from "./trialbalance.js";

// Zoho stamps every account with a type, which is a far better signal than the
// account's name. Anything not listed falls back to keyword matching, so an
// unrecognised type degrades to the old behaviour rather than to nothing.
export const ZOHO_TYPE_TO_GROUP = {
  // Assets — balance is naturally a debit
  accounts_receivable:      "receivables",
  cash:                     "cash",
  bank:                     "cash",
  fixed_asset:              "fixedAssets",
  stock:                    "inventory",
  other_current_asset:      "otherAssets",
  other_asset:              "otherAssets",
  input_tax:                "otherAssets",
  payment_clearing_account: "otherAssets",

  // Liabilities and equity — balance is naturally a credit
  accounts_payable:         "payables",
  credit_card:              "borrowings",
  long_term_liability:      "borrowings",
  other_current_liability:  "otherLiab",
  other_liability:          "otherLiab",
  output_tax:               "otherLiab",
  overseas_tax_payable:     "otherLiab",
  equity:                   "equity",

  // Profit and loss
  income:                   "revenue",
  other_income:             "otherIncome",
  cost_of_goods_sold:       "cogs",
  expense:                  "admin",
  other_expense:            "admin",
};

// Which side a Zoho account type sits on, so a balance can be split into
// debit and credit the way a trial balance expects.
const CREDIT_TYPES = new Set([
  "accounts_payable", "credit_card", "long_term_liability", "other_current_liability",
  "other_liability", "output_tax", "overseas_tax_payable", "equity", "income", "other_income",
]);

const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };

/**
 * Chart of accounts (fetched with showbalance=true) → trial balance rows.
 *
 * Zoho reports one signed `current_balance` per account rather than separate
 * debit and credit columns, so the side comes from the account type and a
 * negative balance flips it — a bank account overdrawn is a credit, whatever
 * its type says.
 *
 * @returns {{rows:Array, totalDr:number, totalCr:number, skipped:number}}
 *          rows match parseTrialBalance's shape: {name, dr, cr, balance, group, confident}
 */
export function accountsToTrialBalance(accounts = []) {
  const rows = [];
  let skipped = 0;

  for (const a of accounts) {
    const name = String(a?.account_name || "").trim();
    if (!name) { skipped++; continue; }
    // Inactive accounts and placeholders (parents that only group children)
    // carry no balance of their own and would double-count if included.
    if (a.is_active === false || a.placeholder === true) { skipped++; continue; }

    const bal = n(a.current_balance);
    if (bal === 0) { skipped++; continue; }

    const type   = String(a.account_type || "").toLowerCase();
    const mapped = ZOHO_TYPE_TO_GROUP[type];
    const guess  = mapped ? null : guessGroup(name);
    const group  = mapped || guess.group;

    // Which side the balance belongs on. A known Zoho type decides it. For an
    // unrecognised type the group we guessed decides instead — otherwise an
    // account correctly identified as Reserves would still land as a debit,
    // because "not a known credit type" is not the same as "is a debit".
    const isCredit = mapped
      ? CREDIT_TYPES.has(type)
      : (COA_GROUPS.find(g => g.key === group) || {}).sign === "cr";

    // Express every balance debit-positive. A credit-natured account flips, and
    // a negative balance flips again — an overdrawn bank account is a credit
    // however its type is classified.
    const asDebit = isCredit ? -bal : bal;

    const dr = asDebit > 0 ? asDebit : 0;
    const cr = asDebit < 0 ? -asDebit : 0;

    rows.push({
      name,
      dr, cr,
      balance: dr - cr,
      group,
      // A type match is reliable. A keyword match is a first guess and must be
      // surfaced for confirmation, same as a pasted trial balance.
      confident:  mapped ? true : guess.confident,
      zohoType:   type,
      zohoCode:   a.account_code || "",
      zohoId:     a.account_id || "",
    });
  }

  return {
    rows,
    totalDr: rows.reduce((s, r) => s + r.dr, 0),
    totalCr: rows.reduce((s, r) => s + r.cr, 0),
    skipped,
  };
}

// Invoices that never represented a sale, and must not reach revenue or ageing.
const DEAD_STATUSES = new Set(["draft", "void"]);

const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s);                 // Zoho returns ISO yyyy-mm-dd
  return isNaN(d) ? null : d;
};

const daysBetween = (a, b) => Math.floor((a - b) / 864e5);

/**
 * Invoices → receivables ageing, bucketed and drillable to the invoice.
 *
 * Ageing runs from the INVOICE date, not the due date: an invoice raised 95
 * days ago on 60-day terms is 90+ days old money, even though it only became
 * overdue 35 days ago. Ageing from the due date would file it under Current.
 */
export function invoicesToReceivables(invoices = [], asOf = new Date()) {
  const buckets = [
    { name: "Current", max: 30,       rows: [] },
    { name: "31–60d",  max: 60,       rows: [] },
    { name: "61–90d",  max: 90,       rows: [] },
    { name: "90d+",    max: Infinity, rows: [] },
  ];

  for (const inv of invoices) {
    if (DEAD_STATUSES.has(String(inv?.status || "").toLowerCase())) continue;
    const outstanding = n(inv.balance);
    if (outstanding <= 0) continue;               // settled invoices are not receivables

    const d    = parseDate(inv.date);
    const age  = d ? daysBetween(asOf, d) : 0;
    const b    = buckets.find(x => age <= x.max) || buckets[buckets.length - 1];

    b.rows.push({
      id:     inv.invoice_number || inv.invoice_id || "",
      date:   inv.date || "",
      desc:   inv.customer_name || inv.company_name || "—",
      amount: outstanding,
      status: String(inv.status || "unpaid").toLowerCase(),
      // Carried through so the analysis workbook can age against the terms
      // actually given, rather than against the invoice date. Bills have
      // always carried theirs; invoices dropped it here.
      dueDate: inv.due_date || "",
      ageDays: age,
    });
  }

  return buckets.map(b => ({
    name:  b.name,
    value: b.rows.reduce((s, r) => s + r.amount, 0),
    sub:   `${b.rows.length} invoice${b.rows.length === 1 ? "" : "s"}`,
    txns:  b.rows.sort((x, y) => y.amount - x.amount),
  }));
}

/**
 * Invoices → revenue by customer.
 *
 * PAID INVOICES COUNT. An earlier version of the manual importer dropped them
 * because they had no outstanding balance, which understated revenue by more
 * than half. Revenue is what was invoiced, not what is still owed.
 */
export function invoicesToRevenue(invoices = [], { from = null, to = null } = {}) {
  const byCustomer = new Map();

  for (const inv of invoices) {
    if (DEAD_STATUSES.has(String(inv?.status || "").toLowerCase())) continue;
    const d = parseDate(inv.date);
    if (from && d && d < from) continue;
    if (to   && d && d > to)   continue;

    const key   = inv.customer_name || inv.company_name || "—";
    const total = n(inv.total);
    if (!byCustomer.has(key)) byCustomer.set(key, { name: key, value: 0, sub: "", txns: [] });
    const row = byCustomer.get(key);
    row.value += total;
    row.txns.push({
      id:     inv.invoice_number || inv.invoice_id || "",
      date:   inv.date || "",
      desc:   `Invoice ${inv.invoice_number || ""}`.trim(),
      amount: total,
      status: String(inv.status || "").toLowerCase(),
    });
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.value - a.value);
  for (const r of rows) r.sub = `${r.txns.length} invoice${r.txns.length === 1 ? "" : "s"}`;
  return rows;
}

/**
 * Bills → payables ageing, bucketed and drillable to the bill.
 *
 * Written against field names read off a live organisation: a bill carries
 * both `balance` and `balance_due`, so the first is preferred and the second
 * used only if it is absent.
 *
 * Ageing runs from the BILL date for the same reason receivables age from the
 * invoice date — money owed for 95 days on 60-day terms is 90-day money,
 * whatever the due date says.
 */
export function billsToPayables(bills = [], asOf = new Date()) {
  const buckets = [
    { name: "Current", max: 30,       rows: [] },
    { name: "31–60d",  max: 60,       rows: [] },
    { name: "61–90d",  max: 90,       rows: [] },
    { name: "90d+",    max: Infinity, rows: [] },
  ];

  for (const bill of bills) {
    if (DEAD_STATUSES.has(String(bill?.status || "").toLowerCase())) continue;
    const outstanding = n(bill.balance ?? bill.balance_due);
    if (outstanding <= 0) continue;

    const d   = parseDate(bill.date);
    const age = d ? daysBetween(asOf, d) : 0;
    const b   = buckets.find(x => age <= x.max) || buckets[buckets.length - 1];

    b.rows.push({
      id:      bill.bill_number || bill.bill_id || "",
      date:    bill.date || "",
      desc:    bill.vendor_name || "—",
      amount:  outstanding,
      status:  String(bill.status || "open").toLowerCase(),
      dueDate: bill.due_date || "",
      ageDays: age,
    });
  }

  return buckets.map(b => ({
    name:  b.name,
    value: b.rows.reduce((s, r) => s + r.amount, 0),
    sub:   `${b.rows.length} bill${b.rows.length === 1 ? "" : "s"}`,
    txns:  b.rows.sort((x, y) => y.amount - x.amount),
  }));
}

/** Bills → spend by supplier. Paid bills count: this is spend, not what is owed. */
export function billsToSupplierSpend(bills = []) {
  const byVendor = new Map();
  for (const bill of bills) {
    if (DEAD_STATUSES.has(String(bill?.status || "").toLowerCase())) continue;
    const key = bill.vendor_name || "—";
    if (!byVendor.has(key)) byVendor.set(key, { name: key, value: 0, sub: "", txns: [] });
    const row = byVendor.get(key);
    const total = n(bill.total);
    row.value += total;
    row.txns.push({
      id:     bill.bill_number || bill.bill_id || "",
      date:   bill.date || "",
      desc:   `Bill ${bill.bill_number || ""}`.trim(),
      amount: total,
      status: String(bill.status || "").toLowerCase(),
    });
  }
  const rows = [...byVendor.values()].sort((a, b) => b.value - a.value);
  for (const r of rows) r.sub = `${r.txns.length} bill${r.txns.length === 1 ? "" : "s"}`;
  return rows;
}

/**
 * Contacts → customer and vendor registers.
 *
 * tax_treatment is the field that matters most here: it is what separates a
 * local VAT-registered customer from an export, a designated-zone party or a
 * GCC counterparty — which is the input a free-zone company's qualifying
 * income test turns on.
 */
export function contactsToRegisters(contacts = []) {
  const customers = [], vendors = [];
  for (const c of contacts) {
    const row = {
      name:         c.company_name || c.contact_name || "—",
      contactName:  c.contact_name || "",
      taxTreatment: c.tax_treatment || "",
      currency:     c.currency_code || "",
      paymentTerms: c.payment_terms_label || (c.payment_terms != null ? `${c.payment_terms} days` : ""),
      receivable:   n(c.outstanding_receivable_amount),
      payable:      n(c.outstanding_payable_amount),
      status:       c.status || "",
      zohoId:       c.contact_id || "",
    };
    const type = String(c.contact_type || "").toLowerCase();
    if (type === "vendor")   vendors.push(row);
    else if (type === "customer") customers.push(row);
    else { if (row.receivable) customers.push(row); if (row.payable) vendors.push(row); }
  }
  return {
    customers: customers.sort((a, b) => b.receivable - a.receivable),
    vendors:   vendors.sort((a, b) => b.payable - a.payable),
  };
}

/**
 * The facts layer: figures that carry no judgement and can therefore refresh on
 * their own, without a Chartered Accountant reading them first.
 *
 * The line matters. A bank balance is either right or Zoho is wrong — there is
 * nothing to review. A margin, a forecast or a recommendation is a different
 * thing entirely, and none of those belong here. Anything requiring an opinion
 * stays on the publish cycle.
 */
export function liveSnapshot(trialBalanceRows = [], invoices = [], asOf = new Date()) {
  const sumGroup = (g) => trialBalanceRows
    .filter(r => r.group === g)
    .reduce((s, r) => s + (r.dr - r.cr), 0);

  const live = invoices.filter(i => !DEAD_STATUSES.has(String(i?.status || "").toLowerCase()));
  const outstanding = live.reduce((s, i) => s + Math.max(0, n(i.balance)), 0);

  const today = asOf.toISOString().slice(0, 10);
  const overdue = live.filter(i => n(i.balance) > 0 && i.due_date && i.due_date < today);

  const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1).toISOString().slice(0, 10);
  const invoicedThisMonth = live
    .filter(i => (i.date || "") >= monthStart)
    .reduce((s, i) => s + n(i.total), 0);

  return {
    asOf: asOf.toISOString(),
    cash:               sumGroup("cash"),
    receivables:        outstanding,
    payables:          -sumGroup("payables"),      // held as a credit; report it positive
    overdueCount:       overdue.length,
    overdueValue:       overdue.reduce((s, i) => s + n(i.balance), 0),
    invoicedThisMonth,
    invoiceCount:       live.length,
  };
}

/**
 * Free-zone qualifying income split, from invoices joined to their customer's
 * tax treatment.
 *
 * This is a FIRST CUT and it is deliberately conservative: it reports what the
 * data supports and says what it cannot see. The real qualifying income test
 * under the UAE CT law turns on the nature of the activity as well as the
 * counterparty, which no accounting system records. Treat the output as a
 * prompt to look, never as a conclusion.
 */
export function qfzpSplit(invoices = [], contacts = []) {
  const treatmentById = new Map(
    contacts.map(c => [String(c.contact_id), String(c.tax_treatment || "").toLowerCase()])
  );

  // Supplies to mainland UAE parties are the usual source of non-qualifying
  // income for a free-zone company. Exports and free-zone counterparties are
  // the usual qualifying cases.
  const MAINLAND = new Set(["vat_registered", "non_vat_registered"]);

  let qualifying = 0, nonQualifying = 0, unknown = 0;
  const unknownRows = [], nonQualifyingRows = [];

  for (const inv of invoices) {
    if (DEAD_STATUSES.has(String(inv?.status || "").toLowerCase())) continue;
    const total = n(inv.total);
    const t     = treatmentById.get(String(inv.customer_id));

    if (!t)                   { unknown += total;       unknownRows.push(inv.invoice_number || inv.invoice_id); }
    else if (MAINLAND.has(t)) { nonQualifying += total; nonQualifyingRows.push({ id: inv.invoice_number || inv.invoice_id, customer: inv.customer_name, amount: total }); }
    else                      { qualifying += total; }
  }

  const total = qualifying + nonQualifying + unknown;
  return {
    qualifying, nonQualifying, unknown, total,
    nonQualifyingPct: total ? (nonQualifying / total) * 100 : 0,
    nonQualifyingRows,
    unknownCount: unknownRows.length,
  };
}
