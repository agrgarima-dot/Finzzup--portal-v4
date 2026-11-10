// ─── DRAFTING THE REVIEW ──────────────────────────────────────────────────────
// Turns things the portal already computes into the three pieces that were
// still being typed by hand every month: proposed action items, the compliance
// calendar, and the context the CFO brief is written from.
//
// Everything here is a PROPOSAL. Nothing it produces reaches a client without
// being read, edited and published by a Chartered Accountant — which is the
// whole argument for the product, and the reason none of this auto-publishes.

// ── Alerts → proposed action items ───────────────────────────────────────────

const SEVERITY_TO_PRIORITY = { critical: "High", warning: "Medium", info: "Low" };

/**
 * The alerts engine already decides what is wrong and what to do about it:
 * "₹4.0L of receivables is over 90 days old" / "Escalate the oldest invoice to
 * a director-level call." That is an action item in all but name, so it should
 * arrive as one rather than be retyped.
 *
 * @param {Array} alerts  from computeAlerts()
 * @returns {Array} [{ text, priority, source, severity }]
 */
export function proposeActions(alerts = []) {
  return alerts.map(a => ({
    text: a.action ? `${a.title} — ${a.action}` : a.title,
    priority: SEVERITY_TO_PRIORITY[a.severity] || "Medium",
    severity: a.severity,
    source: a.id,          // so a proposal already accepted is not offered twice
    page: a.page || null,
  }));
}

/** Proposals the client has already acted on, or you have already added, are noise. */
export function newProposalsOnly(proposals = [], existingActions = []) {
  const seen = new Set(
    existingActions.map(a => String(a.text || "").toLowerCase().slice(0, 60))
  );
  return proposals.filter(p => !seen.has(String(p.text).toLowerCase().slice(0, 60)));
}

// ── Compliance calendar ──────────────────────────────────────────────────────
//
// Standard statutory dates. They are generated, not guessed, but they are still
// proposals: extensions, notifications and a client's own facts change them, so
// the calendar is offered for confirmation rather than written in.

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;   // m is 1-based

// Month after the given one, carrying the year.
const nextMonth = (y, m) => (m === 12 ? [y + 1, 1] : [y, m + 1]);

/**
 * Indian monthly and periodic filings for the month being reported.
 * @param {number} y  calendar year of the period being reported
 * @param {number} m  1-based month of the period being reported
 */
function indiaItems(y, m) {
  const [fy, fm] = nextMonth(y, m);          // most monthly filings fall due the month after
  const items = [
    { item: "GSTR-1",       detail: `Outward supplies for ${pad(m)}/${y}`,        dueDate: iso(fy, fm, 11) },
    { item: "GSTR-3B",      detail: `Summary return and tax payment for ${pad(m)}/${y}`, dueDate: iso(fy, fm, 20) },
    // March TDS is the exception: deposited by 30 April, not 7 April.
    { item: "TDS payment",  detail: `Tax deducted in ${pad(m)}/${y}`,
      dueDate: m === 3 ? iso(fy, 4, 30) : iso(fy, fm, 7) },
  ];

  // Quarterly TDS returns, due the month after the quarter closes.
  const tdsReturn = { 6: iso(y, 7, 31), 9: iso(y, 10, 31), 12: iso(y + 1, 1, 31), 3: iso(y, 5, 31) }[m];
  if (tdsReturn) items.push({ item: "TDS return (24Q/26Q)", detail: `Quarter ending ${pad(m)}/${y}`, dueDate: tdsReturn });

  // Advance tax instalments.
  const advance = { 6: ["15%", iso(y, 6, 15)], 9: ["45%", iso(y, 9, 15)],
                    12: ["75%", iso(y, 12, 15)], 3: ["100%", iso(y, 3, 15)] }[m];
  if (advance) items.push({ item: "Advance tax", detail: `${advance[0]} of estimated liability, cumulative`, dueDate: advance[1] });

  if (m === 9)  items.push({ item: "DIR-3 KYC", detail: "Annual KYC for every director", dueDate: iso(y, 9, 30) });
  if (m === 10) items.push({ item: "AOC-4", detail: "Financial statements filed with the ROC", dueDate: iso(y, 10, 30) });
  if (m === 11) items.push({ item: "MGT-7", detail: "Annual return filed with the ROC", dueDate: iso(y, 11, 29) });

  return items;
}

/**
 * UAE filings. VAT runs on the organisation's own tax period, and corporate tax
 * on its financial year, so both are derived rather than assumed monthly.
 *
 * @param {number} y
 * @param {number} m
 * @param {object} opts
 * @param {"monthly"|"quarterly"} opts.vatPeriod   default quarterly
 * @param {number} opts.fyEndMonth                 1-based, default 12 (31 December)
 */
function uaeItems(y, m, { vatPeriod = "quarterly", fyEndMonth = 12 } = {}) {
  const items = [];

  // VAT: due within 28 days of the end of the tax period.
  const isPeriodEnd = vatPeriod === "monthly" || m % 3 === 0;
  if (isPeriodEnd) {
    const [vy, vm] = nextMonth(y, m);
    items.push({
      item: "VAT return",
      detail: vatPeriod === "monthly" ? `Month ending ${pad(m)}/${y}` : `Quarter ending ${pad(m)}/${y}`,
      dueDate: iso(vy, vm, 28),
    });
  }

  // Corporate tax: return and payment within 9 months of the financial year end.
  if (m === fyEndMonth) {
    let cy = y, cm = fyEndMonth + 9;
    while (cm > 12) { cm -= 12; cy += 1; }
    items.push({ item: "Corporate Tax return", detail: `Financial year ended ${pad(fyEndMonth)}/${y}`, dueDate: iso(cy, cm, 30), annual: true });
  }

  // Economic Substance: notification at 6 months, report at 12 months after year end.
  if (m === fyEndMonth) {
    let ny = y, nm = fyEndMonth + 6;
    while (nm > 12) { nm -= 12; ny += 1; }
    const lastDay = new Date(y + 1, fyEndMonth, 0).getDate();   // day 0 of next month = last of this
    items.push({ item: "ESR notification", detail: `Financial year ended ${pad(fyEndMonth)}/${y}`, dueDate: iso(ny, nm, 30), annual: true });
    items.push({ item: "ESR report",       detail: `Financial year ended ${pad(fyEndMonth)}/${y}`, dueDate: iso(y + 1, fyEndMonth, lastDay), annual: true });
  }

  return items;
}

/**
 * Build the calendar for a reporting period.
 *
 * @param {object} opts
 * @param {string} opts.jurisdiction  "UAE" | "Cross-Border" | anything else = India
 * @param {Date}   opts.period        a date inside the month being reported
 * @param {string} opts.vatPeriod     "monthly" | "quarterly"
 * @param {number} opts.fyEndMonth    1-based month the financial year ends
 * @returns {Array} [{ item, detail, dueDate, owner, done }]
 */
export function complianceCalendar({ jurisdiction = "India", period = new Date(),
                                     vatPeriod = "quarterly", fyEndMonth,
                                     lookAheadMonths = 3, horizonDays = 120 } = {}) {
  const uae   = jurisdiction === "UAE" || jurisdiction === "Cross-Border";
  const india = jurisdiction !== "UAE";              // cross-border files in both

  // Walk the reported month and the next few, not just the reported one. A UAE
  // company reviewed in November sits between quarter ends, and a calendar that
  // comes back empty reads as broken rather than as "nothing arose this month".
  const items = [];
  for (let i = 0; i < Math.max(1, lookAheadMonths); i++) {
    const d = new Date(period.getFullYear(), period.getMonth() + i, 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    if (india) items.push(...indiaItems(y, m));
    if (uae)   items.push(...uaeItems(y, m, { vatPeriod, fyEndMonth: fyEndMonth || 12 }));
  }

  const cutoff = new Date(period.getTime() + horizonDays * 864e5).toISOString().slice(0, 10);
  const floor  = new Date(period.getFullYear(), period.getMonth(), 1).toISOString().slice(0, 10);

  const seen = new Set();
  return items
    // Annual filings are exempt from the near-term window: a corporate tax
    // return falls due nine months out, and it should appear the moment the
    // year ends rather than three months before the deadline.
    .filter(i => i.dueDate >= floor && (i.annual || i.dueDate <= cutoff))
    .filter(i => { const k = `${i.item}|${i.dueDate}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ annual, ...i }) => ({ ...i, owner: "Finzzup", done: false }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Items already on the calendar should not be offered again. */
export function newComplianceOnly(proposed = [], existing = []) {
  const seen = new Set(existing.map(e => `${String(e.item||"").toLowerCase()}|${e.dueDate||""}`));
  return proposed.filter(p => !seen.has(`${p.item.toLowerCase()}|${p.dueDate}`));
}
