// ─── TRIAL BALANCE → FINANCIAL STATEMENTS ─────────────────────────────────────
// Takes a raw trial balance (Tally / Zoho / Excel export, pasted or uploaded),
// maps each ledger account to a financial-statement line, and builds the P&L
// and balance sheet from it.
//
// The mapping is the valuable part and it is saved per client, so month two is
// a review rather than a rebuild. Auto-mapping is a *first guess* only — every
// account the parser is unsure about is surfaced for a human to confirm,
// because a silently mis-mapped account produces a confident wrong margin.

// ── Statement lines an account can map to ────────────────────────────────────
export const COA_GROUPS = [
  { key:"revenue",      label:"Revenue",                side:"pl", sign:"cr" },
  { key:"otherIncome",  label:"Other Income",           side:"pl", sign:"cr" },
  { key:"cogs",         label:"Cost of Sales",          side:"pl", sign:"dr" },
  { key:"employee",     label:"Employee Cost",          side:"pl", sign:"dr" },
  { key:"admin",        label:"Admin & General",        side:"pl", sign:"dr" },
  { key:"selling",      label:"Selling & Marketing",    side:"pl", sign:"dr" },
  { key:"depreciation", label:"Depreciation",           side:"pl", sign:"dr" },
  { key:"finance",      label:"Finance Cost",           side:"pl", sign:"dr" },
  { key:"tax",          label:"Tax Expense",            side:"pl", sign:"dr" },
  { key:"fixedAssets",  label:"Fixed Assets",           side:"bs", sign:"dr" },
  { key:"inventory",    label:"Inventory",              side:"bs", sign:"dr" },
  { key:"receivables",  label:"Trade Receivables",      side:"bs", sign:"dr" },
  { key:"cash",         label:"Cash & Bank",            side:"bs", sign:"dr" },
  { key:"otherAssets",  label:"Other Assets",           side:"bs", sign:"dr" },
  { key:"payables",     label:"Trade Payables",         side:"bs", sign:"cr" },
  { key:"borrowings",   label:"Borrowings",             side:"bs", sign:"cr" },
  { key:"otherLiab",    label:"Other Liabilities",      side:"bs", sign:"cr" },
  { key:"equity",       label:"Share Capital",          side:"bs", sign:"cr" },
  { key:"reserves",     label:"Reserves & Surplus",     side:"bs", sign:"cr" },
  { key:"unmapped",     label:"— Not mapped —",         side:"",   sign:""   },
];
export const groupLabel = k => (COA_GROUPS.find(g => g.key === k) || {}).label || k;

// ── Keyword hints for the first guess ────────────────────────────────────────
const HINTS = [
  ["revenue",      ["sales","revenue","turnover","income from operations","service income","export sales","domestic sales"]],
  ["otherIncome",  ["other income","interest income","discount received","misc income","forex gain","scrap sales"]],
  ["cogs",         ["purchase","cost of goods","cost of sales","direct expense","raw material","consumable","freight inward","carriage inward","job work","packing material","opening stock","closing stock","power & fuel","direct labour"]],
  ["employee",     ["salary","salaries","wages","staff","employee","pf ","provident","esi","gratuity","bonus","director remuneration"]],
  ["selling",      ["advertis","marketing","sales promotion","commission","brokerage","freight outward","carriage outward","distribution"]],
  ["depreciation", ["depreciation","amortis","amortiz"]],
  ["finance",      ["interest on","finance cost","bank charges","interest expense","processing fee","loan interest"]],
  ["tax",          ["income tax","current tax","deferred tax","corporate tax","provision for tax"]],
  ["admin",        ["rent","electricity","telephone","internet","travel","conveyance","printing","stationery","professional","legal","audit fee","insurance","repairs","office","postage","subscription","software"]],
  ["fixedAssets",  ["plant","machinery","building","furniture","vehicle","computer","equipment","land","fixed asset","capital work"]],
  ["inventory",    ["inventory","stock in hand","stock-in-trade","finished goods","work in progress","raw material stock"]],
  ["receivables",  ["debtor","receivable","trade receivable","sundry debtor","accounts receivable"]],
  ["cash",         ["cash","bank","current account","hdfc","icici","sbi","axis","kotak","emirates nbd","adcb","mashreq","petty cash","fixed deposit"]],
  ["payables",     ["creditor","payable","sundry creditor","accounts payable","trade payable"]],
  ["borrowings",   ["loan","borrowing","cash credit","overdraft","term loan","working capital limit","cc account","debenture"]],
  ["equity",       ["share capital","equity share","capital account","partner capital","owner capital"]],
  ["reserves",     ["reserve","surplus","retained earning","profit and loss account","p&l account","general reserve"]],
  ["otherLiab",    ["gst payable","tds payable","vat payable","duties","statutory","provision","outstanding expense","advance from customer"]],
  ["otherAssets",  ["advance","deposit","prepaid","gst input","itc","tds receivable","loans and advances"]],
];

// A guess is only "confident" when the matched keyword is reasonably specific.
export function guessGroup(name) {
  const n = ` ${String(name || "").toLowerCase().trim()} `;
  let best = null;
  for (const [group, kws] of HINTS) {
    for (const kw of kws) {
      if (n.includes(kw) && (!best || kw.length > best.kw.length)) best = { group, kw };
    }
  }
  if (!best) return { group:"unmapped", confident:false };
  return { group: best.group, confident: best.kw.length >= 5 };
}

const num = v => {
  if (v == null) return 0;
  let s = String(v).trim().replace(/[,\s₹$]/g, "").replace(/AED/gi, "");
  if (!s || s === "-") return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }          // (1,234) = negative
  if (/(cr|credit)$/i.test(s)) { neg = true; s = s.replace(/(cr|credit)$/i, ""); }
  if (/(dr|debit)$/i.test(s))  { s = s.replace(/(dr|debit)$/i, ""); }
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
};

/**
 * Parse a pasted or uploaded trial balance.
 * Accepts CSV, TSV or pipe-delimited. Handles both shapes:
 *   Account, Debit, Credit      → balance = debit − credit
 *   Account, Balance            → negative balance treated as credit
 * @returns {{rows:Array, totalDr:number, totalCr:number, skipped:number}}
 */
export function parseTrialBalance(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n")
    .map(l => l.trim()).filter(Boolean);
  const split = l => l.includes("\t") ? l.split("\t") : l.includes("|") ? l.split("|") : l.split(",");

  const rows = []; let skipped = 0;
  for (const line of lines) {
    const cells = split(line).map(c => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) { skipped++; continue; }
    const name = cells[0];
    // Skip headers and totals — they are not ledger accounts.
    if (!name || /^(account|particulars|ledger|name|description)\b/i.test(name)) { skipped++; continue; }
    if (/^(total|grand total|difference|opening balance)\b/i.test(name)) { skipped++; continue; }

    const nums = cells.slice(1).map(num);
    if (!nums.some(n => n !== 0)) { skipped++; continue; }

    let dr = 0, cr = 0;
    if (nums.length >= 2 && (nums[0] !== 0 || nums[1] !== 0)) {
      dr = Math.abs(nums[0]); cr = Math.abs(nums[1]);
      if (dr && cr) { const net = dr - cr; dr = net > 0 ? net : 0; cr = net < 0 ? -net : 0; }
    } else {
      const v = nums.find(n => n !== 0) || 0;
      if (v >= 0) dr = v; else cr = -v;
    }
    const g = guessGroup(name);
    rows.push({ name, dr, cr, balance: dr - cr, group: g.group, confident: g.confident });
  }
  return {
    rows,
    totalDr: rows.reduce((s, r) => s + r.dr, 0),
    totalCr: rows.reduce((s, r) => s + r.cr, 0),
    skipped,
  };
}

/** Apply a saved mapping ({accountName: group}) over freshly parsed rows. */
export function applySavedMapping(rows, saved = {}) {
  return rows.map(r => {
    const hit = saved[r.name.toLowerCase().trim()];
    return hit ? { ...r, group: hit, confident: true, fromSaved: true } : r;
  });
}

/** Build the mapping object to persist for next month. */
export function extractMapping(rows) {
  const m = {};
  rows.forEach(r => { if (r.group && r.group !== "unmapped") m[r.name.toLowerCase().trim()] = r.group; });
  return m;
}

/**
 * Build P&L and balance sheet totals from mapped rows.
 * P&L groups: income is credit-positive, expense is debit-positive.
 */
export function buildStatements(rows, { openingReserves = 0 } = {}) {
  const t = {};
  COA_GROUPS.forEach(g => { t[g.key] = 0; });
  rows.forEach(r => {
    const g = COA_GROUPS.find(x => x.key === r.group);
    if (!g || g.key === "unmapped") { t.unmapped += Math.abs(r.balance); return; }
    // Credit-natured lines are stored positive, debit-natured likewise.
    t[r.group] += g.sign === "cr" ? -r.balance : r.balance;
  });

  const revenue     = t.revenue + t.otherIncome;
  const cogs        = t.cogs;
  const grossProfit = revenue - cogs;
  const opex        = t.employee + t.admin + t.selling;
  const ebitda      = grossProfit - opex;
  const pbt         = ebitda - t.depreciation - t.finance;
  const pat         = pbt - t.tax;

  const assets      = t.fixedAssets + t.inventory + t.receivables + t.cash + t.otherAssets;
  const liabilities = t.payables + t.borrowings + t.otherLiab;
  // Reserves carried in the TB plus this period's profit.
  const equity      = t.equity + t.reserves + pat + openingReserves;

  const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + "%" : null;

  return {
    totals: t,
    pl: {
      revenue, otherIncome: t.otherIncome, cogs, grossProfit, opex, ebitda,
      depreciation: t.depreciation, finance: t.finance, pbt, tax: t.tax, pat,
      gpMargin: pct(grossProfit, revenue),
      ebitdaMargin: pct(ebitda, revenue),
      netMargin: pct(pat, revenue),
    },
    bs: {
      fixedAssets:t.fixedAssets, inventory:t.inventory, receivables:t.receivables,
      cash:t.cash, otherAssets:t.otherAssets, assets,
      payables:t.payables, borrowings:t.borrowings, otherLiab:t.otherLiab, liabilities,
      shareCapital:t.equity, reserves:t.reserves + pat + openingReserves, equity,
      tieOut: assets - (liabilities + equity),
    },
  };
}

/**
 * Validation — run before anything reaches a client.
 * Returns [{level:'error'|'warn'|'ok', label, detail}]
 */
export function validate(parsed, statements) {
  const out = [];
  const money = n => Math.round(n).toLocaleString();
  const diff = parsed.totalDr - parsed.totalCr;

  out.push(Math.abs(diff) < 1
    ? { level:"ok",    label:"Debits equal credits", detail:`Both sides ${money(parsed.totalDr)}` }
    : { level:"error", label:"Trial balance does not balance", detail:`Debits ${money(parsed.totalDr)} vs credits ${money(parsed.totalCr)} — difference ${money(Math.abs(diff))}` });

  const tie = statements.bs.tieOut;
  out.push(Math.abs(tie) < 1
    ? { level:"ok",    label:"Balance sheet ties", detail:"Assets equal liabilities plus equity" }
    : { level:"error", label:"Balance sheet does not tie", detail:`Out by ${money(Math.abs(tie))} — usually an account mapped to the wrong side` });

  const unmapped = parsed.rows.filter(r => r.group === "unmapped");
  out.push(unmapped.length === 0
    ? { level:"ok",   label:"Every account is mapped", detail:`${parsed.rows.length} accounts` }
    : { level:"error", label:`${unmapped.length} account${unmapped.length>1?"s":""} not mapped`, detail: unmapped.slice(0,3).map(r=>r.name).join(", ") + (unmapped.length>3?"…":"") });

  const unsure = parsed.rows.filter(r => r.group !== "unmapped" && !r.confident);
  if (unsure.length) out.push({ level:"warn", label:`${unsure.length} mapping${unsure.length>1?"s":""} worth checking`, detail:"Guessed from the account name — confirm before publishing" });

  if (statements.pl.revenue <= 0)
    out.push({ level:"warn", label:"No revenue found", detail:"Check that sales accounts are mapped to Revenue" });

  return out;
}
