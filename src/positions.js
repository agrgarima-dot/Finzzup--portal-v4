// ─── POSITIONS AGAINST RULES ──────────────────────────────────────────────────
// What the client's accounting software cannot tell them.
//
// Zoho reports what happened: a cash balance, a list of invoices, a VAT
// account. Reproducing any of that inside the portal is pointless — the client
// can open Zoho and see it. What Zoho has no concept of is a threshold, a
// provision, a payment pattern or a limit. Those live in a Chartered
// Accountant's head, and they are exactly what can be evaluated every night.
//
// Each position is a sentence someone would actually say out loud, with the
// rule it is measured against stated plainly. Status is one of:
//   "ok" | "watch" | "breach" | "unknown"
//
// "unknown" is deliberate and used often. Saying "this cannot be judged from
// the books alone" is worth more than a confident number built on a guess.

const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };

// ── UAE thresholds ───────────────────────────────────────────────────────────
// Confirm these against the current law before they reach a client; they are
// gathered here rather than scattered so there is one place to correct.
export const UAE = {
  CT_RATE: 0.09,
  CT_NIL_BAND: 375_000,        // 0% on the first AED 375,000 of taxable income
  SBR_REVENUE_CAP: 3_000_000,  // Small Business Relief available at or below this revenue
  QFZP_DE_MINIMIS_PCT: 0.05,   // non-qualifying revenue must not exceed the lower of
  QFZP_DE_MINIMIS_ABS: 5_000_000, // 5% of total revenue, or AED 5,000,000
};

// ── India thresholds ─────────────────────────────────────────────────────────
export const INDIA = {
  MSME_LIMIT_DAYS: 45,         // Section 43B(h)
  ASSUMED_TAX_RATE: 0.25,      // for showing the cost of a disallowance
};

const fmtAED = (v) => {
  const x = Math.abs(n(v));
  return `AED ${x >= 1e6 ? (x/1e6).toFixed(2) + "M" : x >= 1e3 ? (x/1e3).toFixed(1) + "K" : x.toFixed(0)}`;
};
const fmtINR = (v) => {
  const x = Math.abs(n(v));
  return x >= 1e7 ? `₹${(x/1e7).toFixed(2)} Cr` : x >= 1e5 ? `₹${(x/1e5).toFixed(1)}L` : `₹${x.toLocaleString("en-IN")}`;
};

/** Sum the trial balance rows Zoho tagged with a particular account type. */
const byZohoType = (rows, ...types) => rows
  .filter(r => types.includes(r.zohoType))
  .reduce((s, r) => s + (r.dr - r.cr), 0);

const byGroup = (rows, ...groups) => rows
  .filter(r => groups.includes(r.group))
  .reduce((s, r) => s + (r.dr - r.cr), 0);

/**
 * @param {object} input
 * @param {Array}  input.trialBalance  rows from accountsToTrialBalance
 * @param {object} input.statements    from buildStatements
 * @param {Array}  input.invoices      raw Zoho invoices
 * @param {Array}  input.contacts      raw Zoho contacts
 * @param {object} input.qfzp          from qfzpSplit
 * @param {boolean} input.uae
 * @param {boolean} input.freeZone
 * @returns {Array} positions
 */
export function computePositions({ trialBalance = [], statements = null, invoices = [],
                                   contacts = [], qfzp = null, uae = false, freeZone = false,
                                   msmeExposure = null, workingCapital = null,
                                   asOf = new Date() } = {}) {
  const cur = uae ? fmtAED : fmtINR;
  const out = [];

  const cash = byGroup(trialBalance, "cash");

  // ── Who is actually not paying, which is not the same as what is owed ──────
  const liveInv = invoices.filter(i => !["draft", "void"].includes(String(i?.status || "").toLowerCase()));
  const today   = asOf.toISOString().slice(0, 10);
  const overdue = liveInv.filter(i => n(i.balance) > 0 && i.due_date && i.due_date < today);

  if (overdue.length) {
    const byCustomer = new Map();
    for (const i of overdue) {
      const k = i.customer_name || i.company_name || "—";
      byCustomer.set(k, (byCustomer.get(k) || 0) + n(i.balance));
    }
    const [worstName, worstAmt] = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0];
    const oldest = overdue.reduce((a, b) => (a.due_date < b.due_date ? a : b));
    const daysLate = Math.floor((asOf - new Date(oldest.due_date)) / 864e5);
    const total = overdue.reduce((s, i) => s + n(i.balance), 0);

    out.push({
      key: "overdue",
      label: "Money past its due date",
      headline: cur(total),
      status: daysLate > 90 ? "breach" : daysLate > 45 ? "watch" : "ok",
      sentence: `${cur(total)} is past due across ${overdue.length} invoice${overdue.length === 1 ? "" : "s"}. ` +
                `The oldest is ${daysLate} days late. ${worstName} accounts for ${cur(worstAmt)} of it.`,
      rule: "Your own payment terms",
    });
  }

  // ── Concentration: one customer leaving takes the business with them ───────
  const revByCustomer = new Map();
  for (const i of liveInv) {
    const k = i.customer_name || i.company_name || "—";
    revByCustomer.set(k, (revByCustomer.get(k) || 0) + n(i.total));
  }
  const totalRev = [...revByCustomer.values()].reduce((s, v) => s + v, 0);
  if (totalRev > 0 && revByCustomer.size > 1) {
    const [topName, topVal] = [...revByCustomer.entries()].sort((a, b) => b[1] - a[1])[0];
    const pct = (topVal / totalRev) * 100;
    if (pct >= 25) out.push({
      key: "concentration",
      label: "Customer concentration",
      headline: `${pct.toFixed(0)}% — ${topName}`,
      status: pct >= 50 ? "breach" : pct >= 35 ? "watch" : "ok",
      sentence: `${topName} is ${pct.toFixed(0)}% of everything you have invoiced. ` +
                `Losing them would take ${pct >= 50 ? "half" : "a third or more"} of your income at once.`,
      rule: "Comfortable below 25%",
    });
  }

  // ── Paying suppliers faster than you are being paid is free financing
  //    left on the table, and it is invisible in any ledger ──────────────
  const dpo = n(workingCapital?.dpo);
  const dso = n(workingCapital?.dso ?? workingCapital?.debtorDays ?? workingCapital?.debtor_days);
  if (dpo > 0 && dso > 0 && dso - dpo >= 15) {
    out.push({
      key: "terms",
      label: "Supplier terms",
      headline: `${Math.round(dso - dpo)} day gap`,
      status: dso - dpo >= 45 ? "watch" : "ok",
      sentence: `You collect in ${Math.round(dso)} days and pay in ${Math.round(dpo)}. ` +
                `For ${Math.round(dso - dpo)} days you are funding the gap out of your own cash. ` +
                `Every day you extend supplier terms is a day you do not have to.`,
      rule: "Pay no sooner than you are paid",
    });
  }

  if (uae) {
    // ── VAT collected is not your money ────────────────────────────────────
    const outputVat = -byZohoType(trialBalance, "output_tax");   // credit balance
    const inputVat  =  byZohoType(trialBalance, "input_tax");
    const netVat    = outputVat - inputVat;
    if (netVat > 0) {
      const pctOfCash = cash > 0 ? (netVat / cash) * 100 : null;
      out.push({
        key: "vat",
        label: "VAT to set aside",
        headline: cur(netVat),
        status: pctOfCash == null ? "unknown" : pctOfCash >= 50 ? "breach" : pctOfCash >= 25 ? "watch" : "ok",
        sentence: pctOfCash == null
          ? `${cur(netVat)} of VAT has been collected and not yet paid over.`
          : `${cur(netVat)} of VAT has been collected and is not yours to spend — ` +
            `${pctOfCash.toFixed(0)}% of the cash in your account.`,
        rule: "Ring-fence it before the return falls due",
      });
    }

    // ── Corporate tax accruing quietly ─────────────────────────────────────
    const profit = statements?.pl?.pat;
    if (typeof profit === "number" && profit > 0) {
      const revenue = statements?.pl?.revenue || 0;
      const sbr = revenue > 0 && revenue <= UAE.SBR_REVENUE_CAP;
      const taxable = Math.max(0, profit - UAE.CT_NIL_BAND);
      const liability = sbr ? 0 : taxable * UAE.CT_RATE;
      out.push({
        key: "ct",
        label: "Corporate tax building up",
        headline: sbr ? "Nil — Small Business Relief" : cur(liability),
        status: sbr ? "ok" : liability > 0 && cash > 0 && liability / cash > 0.3 ? "watch" : "ok",
        sentence: sbr
          ? `Revenue of ${cur(revenue)} is within the AED 3M Small Business Relief cap, so corporate tax is nil — ` +
            `but the election has to be made on the return, it is not automatic.`
          : `On profit of ${cur(profit)} to date, 9% above the AED 375,000 nil band comes to ${cur(liability)}. ` +
            `Provide for it monthly rather than meeting it in one payment.`,
        rule: "9% above AED 375,000",
      });
    }

    // ── The one that costs five years if it is got wrong ───────────────────
    if (freeZone && qfzp && qfzp.total > 0) {
      const cap = Math.min(qfzp.total * UAE.QFZP_DE_MINIMIS_PCT, UAE.QFZP_DE_MINIMIS_ABS);
      const pct = qfzp.nonQualifyingPct;
      const headroom = cap - qfzp.nonQualifying;
      const unclear = qfzp.unknownCount > 0;
      out.push({
        key: "qfzp",
        label: "Free zone 0% status",
        headline: `${pct.toFixed(1)}% non-qualifying`,
        status: unclear ? "unknown" : headroom < 0 ? "breach" : pct >= 4 ? "watch" : "ok",
        sentence: headroom < 0
          ? `Non-qualifying income is ${pct.toFixed(1)}% of revenue, past the de minimis limit. ` +
            `On these figures the 0% rate is lost for this year and the next four.`
          : `Non-qualifying income is ${pct.toFixed(1)}% of revenue against a limit of 5%. ` +
            `You have ${cur(headroom)} of headroom before the 0% rate is at risk for five years.` +
            (unclear ? ` ${qfzp.unknownCount} invoice${qfzp.unknownCount === 1 ? " has" : "s have"} no customer tax treatment recorded, so this is incomplete.` : ""),
        rule: "Lower of 5% of revenue or AED 5M",
        caution: "The qualifying test also turns on the nature of the activity, which the books do not record. Treat this as a prompt to look, not a conclusion.",
      });
    }
  } else {
    // ── India: the 45-day clock, and what breaching it costs ───────────────
    if (msmeExposure && msmeExposure.atRisk > 0) {
      out.push({
        key: "msme43bh",
        label: "MSME suppliers past 45 days",
        headline: cur(msmeExposure.atRisk),
        status: "breach",
        sentence: `${cur(msmeExposure.atRisk)} owed to MSME suppliers is past the 45-day limit. ` +
                  `Under Section 43B(h) it is disallowed unless paid before year end, adding roughly ` +
                  `${cur(msmeExposure.taxImpact)} to the tax bill.`,
        rule: "Section 43B(h) — 45 days",
      });
    }
  }

  return out;
}
