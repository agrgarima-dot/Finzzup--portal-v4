// ─── ALERT ENGINE ─────────────────────────────────────────────────────────────
// Pure, dependency-free alert computation shared by the client portal
// (Dashboard alert strip) and the weekly alert email (api/weekly-alerts.js).
//
// Every alert: { id, severity, title, detail, action, page }
//   severity: "critical" | "warning" | "info"  (sorted in that order)

const SEV_RANK = { critical: 0, warning: 1, info: 2 };

// "₹4.8L" / "AED 92.5K" / "1.2 Cr" → number. Returns NaN when unparseable.
export function parseAmount(v) {
  if (v == null || v === "" || v === "—") return NaN;
  if (typeof v === "number") return v;
  // Grab the first number and the unit suffix attached to it ("₹4.8L", "AED 92.5K",
  // "₹1.2 Cr"). The trailing \b stops "2.4 mo" being read as 2.4 million.
  const m = String(v).replace(/,/g, "").match(/(-?[\d.]+)\s*(crore|cr|lakh|l|k|mn|m)?\b/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return NaN;
  switch ((m[2] || "").toLowerCase()) {
    case "crore": case "cr":   return n * 1e7;
    case "lakh":  case "l":    return n * 1e5;
    case "k":                  return n * 1e3;
    case "mn":    case "m":    return n * 1e6;
    default:                   return n;
  }
}

const daysUntil = (d) => {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  if (isNaN(t)) return null;
  return Math.ceil((t - new Date()) / 864e5);
};

const findKpi = (kpis, ...needles) =>
  (kpis || []).find(k => {
    const l = String(k.label || "").toLowerCase();
    return needles.some(n => l.includes(n));
  });

/**
 * Compute alerts for a client.
 * @param {object}   opts
 * @param {Array}    opts.kpis          Dashboard KPI tiles
 * @param {object}   opts.reportData    Report payload (pl, workingCapital, compliance, drill…)
 * @param {boolean}  opts.uae           UAE jurisdiction
 * @param {Array}    opts.expiringDocs  [{ name, expiry_date }]
 * @param {Array}    opts.compliance    Resolved compliance list; falls back to
 *                                      reportData.compliance / .checklist when omitted
 * @param {string}   opts.currency      Symbol for formatting, e.g. "₹" or "AED "
 * @returns {Array}  severity-sorted alerts
 */
export function computeAlerts({ kpis = [], reportData = {}, uae = false, expiringDocs = [], compliance = null, currency } = {}) {
  const out = [];
  const sym = currency || (uae ? "AED " : "₹");
  const fmt = (n) => {
    if (!isFinite(n)) return "—";
    if (uae) return n >= 1e6 ? `AED ${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `AED ${(n / 1e3).toFixed(0)}K` : `AED ${n.toLocaleString()}`;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
    return `₹${n.toLocaleString()}`;
  };

  // ── 1. Cash runway ──────────────────────────────────────────────────────
  const runway = findKpi(kpis, "runway");
  const runwayMonths = runway ? parseFloat(String(runway.value).replace(/[^0-9.]/g, "")) : NaN;
  if (!isNaN(runwayMonths)) {
    if (runwayMonths < 3) {
      out.push({ id: "runway-critical", severity: "critical",
        title: `Cash runway is ${runway.value}`,
        detail: "At the current burn rate you have under three months of cover.",
        action: "Review burn and start a bridge conversation this week.", page: "cashflow" });
    } else if (runwayMonths < 6) {
      out.push({ id: "runway-low", severity: "warning",
        title: `Cash runway below six months — ${runway.value}`,
        detail: "Comfortable today, tight by next quarter.",
        action: "Plan fundraising or trim monthly burn now.", page: "cashflow" });
    }
  }

  // ── 2. Receivables concentration & ageing ───────────────────────────────
  const wc = reportData.workingCapital || {};
  const ar90 = Number(wc.ar90plus ?? reportData.ar90plus ?? 0);
  const arTotal = ["ar0_30", "ar31_60", "ar61_90", "ar90plus"]
    .reduce((s, k) => s + Number(wc[k] ?? 0), 0)
    || ["ar0to30", "ar31to60", "ar61to90", "ar90plus"].reduce((s, k) => s + Number(reportData[k] ?? 0), 0);
  if (ar90 > 0 && arTotal > 0) {
    const pct = Math.round((ar90 / arTotal) * 100);
    out.push({ id: "ar-90plus", severity: pct >= 20 ? "critical" : "warning",
      title: `${fmt(ar90)} of receivables is over 90 days old`,
      detail: `That is ${pct}% of everything outstanding.`,
      action: "Escalate the oldest invoice to a director-level call.", page: "dashboard" });
  }
  const debtorDays = Number(wc.debtorDays ?? wc.debtor_days ?? NaN);
  if (!isNaN(debtorDays) && debtorDays > 60) {
    out.push({ id: "debtor-days", severity: debtorDays > 90 ? "critical" : "warning",
      title: `Customers are taking ${Math.round(debtorDays)} days to pay`,
      detail: "Cash is sitting with your customers instead of in your account.",
      action: "Tighten credit terms on the slowest accounts.", page: "dashboard" });
  }

  // ── 3. Customer concentration (from the revenue drill) ──────────────────
  const revRows = reportData.drill?.revenue?.dims?.[0]?.rows || [];
  if (revRows.length > 1) {
    const total = revRows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    const top = revRows.reduce((a, b) => (Number(b.value) || 0) > (Number(a.value) || 0) ? b : a, revRows[0]);
    const pct = total ? Math.round(((Number(top.value) || 0) / total) * 100) : 0;
    if (pct >= 30 && !/^other/i.test(top.name || "")) {
      out.push({ id: "concentration", severity: pct >= 45 ? "critical" : "warning",
        title: `${top.name} is ${pct}% of your revenue`,
        detail: "Losing this one customer would take a third or more of your income with it.",
        action: "Protect the relationship and build a second anchor account.", page: "dashboard" });
    }
  }

  // ── 4. Margin compression (current vs prior) ────────────────────────────
  const pl = reportData.pl || {};
  const gmNow = parseFloat(String(pl.gpMargin?.actual ?? "").replace(/[^0-9.]/g, ""));
  const gmPrev = parseFloat(String(pl.gpMargin?.prev ?? "").replace(/[^0-9.]/g, ""));
  if (!isNaN(gmNow) && !isNaN(gmPrev) && gmPrev - gmNow >= 3) {
    out.push({ id: "margin-drop", severity: gmPrev - gmNow >= 6 ? "critical" : "warning",
      title: `Gross margin fell from ${gmPrev.toFixed(1)}% to ${gmNow.toFixed(1)}%`,
      detail: "Revenue can grow while profit quietly shrinks — this is that pattern.",
      action: "Check input costs and pricing on recent orders.", page: "myreport" });
  }

  // ── 5. Overdue & imminent compliance ────────────────────────────────────
  const comps = Array.isArray(compliance) ? compliance
    : Array.isArray(reportData.compliance) ? reportData.compliance
    : Array.isArray(reportData.checklist) ? reportData.checklist : [];
  // Document renewals are already covered by the expiring-documents rule below —
  // skip them here so a licence about to lapse doesn't raise two alerts.
  const pending = comps.filter(c =>
    !c.done && c.status !== "done" && !/^renewal\s+—/i.test(String(c.item || c.title || "")));
  const overdue = pending.filter(c => { const d = daysUntil(c.dueDate || c.due); return d != null && d < 0; });
  const dueSoon = pending.filter(c => { const d = daysUntil(c.dueDate || c.due); return d != null && d >= 0 && d <= 7; });
  const nameList = (list) => list.slice(0, 3).map(c => c.item || c.title).filter(Boolean).join(" · ");
  if (overdue.length) {
    const one = overdue.length === 1;
    out.push({ id: "compliance-overdue", severity: "critical",
      title: one ? `${overdue[0].item || overdue[0].title} is overdue`
                 : `${overdue.length} compliance filings are overdue`,
      // Avoid repeating the title back when there is only one item.
      detail: one ? (overdue[0].detail || "This filing has passed its due date.") : nameList(overdue),
      action: "Late filings attract interest and penalties — clear these first.", page: "compliance" });
  }
  if (dueSoon.length) {
    const one = dueSoon.length === 1;
    out.push({ id: "compliance-duesoon", severity: "warning",
      title: one ? `${dueSoon[0].item || dueSoon[0].title} is due within 7 days`
                 : `${dueSoon.length} compliance filings are due within 7 days`,
      detail: one ? (dueSoon[0].detail || "Due date is this week.") : nameList(dueSoon),
      action: "Confirm the working papers are ready.", page: "compliance" });
  }

  // ── 6. Expiring documents ───────────────────────────────────────────────
  (expiringDocs || []).forEach((d, i) => {
    const days = daysUntil(d.expiry_date);
    if (days == null || days > 60) return;
    const name = String(d.name || "Document").replace(/\.[a-z0-9]+$/i, "");
    out.push({ id: `doc-expiry-${i}`, severity: days <= 30 ? "critical" : "warning",
      title: days < 0 ? `${name} has expired` : `${name} expires in ${days} days`,
      detail: "Renewals can take weeks — starting late risks a lapse.",
      action: "Begin the renewal now.", page: "documents" });
  });

  // ── 7. UAE: VAT payable with no cash cover ──────────────────────────────
  if (uae) {
    const vatKpi = findKpi(kpis, "vat");
    const cashKpi = findKpi(kpis, "cash");
    const vat = parseAmount(vatKpi?.value);
    const cash = parseAmount(cashKpi?.value);
    if (isFinite(vat) && isFinite(cash) && vat > 0 && cash > 0 && vat / cash >= 0.25) {
      out.push({ id: "vat-cover", severity: vat / cash >= 0.5 ? "critical" : "warning",
        title: `VAT payable is ${Math.round((vat / cash) * 100)}% of your cash balance`,
        detail: `${fmt(vat)} due against ${fmt(cash)} on hand.`,
        action: "Ring-fence the VAT amount so it is not spent on operations.", page: "uaetax" });
    }
  }

  return out.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
}

export const alertCounts = (alerts = []) => ({
  critical: alerts.filter(a => a.severity === "critical").length,
  warning:  alerts.filter(a => a.severity === "warning").length,
  total:    alerts.length,
});
