// ─── ANALYSIS TEMPLATES ───────────────────────────────────────────────────────
// For the reports the books cannot answer on their own.
//
// Those used to be rows of empty boxes in the admin panel — a budget typed in
// field by field, a treasury schedule entered line by line, every month, for
// every client. That is not where a Chartered Accountant does analysis. A
// spreadsheet is.
//
// So each of these reports has a template: download it already carrying what
// the portal knows, do the work in Excel, upload it back, read what was
// parsed, and publish. The figures that DO come from Zoho are never templated —
// re-typing those would be a step backwards.

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Split one CSV line, honouring quotes. Excel quotes anything with a comma.
function splitLine(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

const num = (v) => {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[,₹\s]/g, "").replace(/AED/gi, "").replace(/[()]/g, ""));
  return isFinite(n) ? (/^\(.*\)$/.test(String(v).trim()) ? -n : n) : null;
};
const yes = (v) => /^(y|yes|true|done|1)$/i.test(String(v || "").trim());

// ── The templates ────────────────────────────────────────────────────────────
//
// key      what it writes into report data
// columns  the header row, in order
// prefill  rows generated from what the portal already knows
// example  one illustrative row, so the format is obvious in Excel
// parse    filled rows → the shape the client screens read

export const TEMPLATES = [
  {
    key: "variance",
    label: "Budget vs actual",
    writes: "variance",
    why: "A budget has to come from the client — it is nowhere in their books.",
    columns: ["Line item", "Budget", "Actual", "Favourable (Y/N)", "Comment"],
    example: ["Revenue", "9000000", "8400000", "N", "Two orders slipped to next quarter"],
    prefill: ({ reportData }) => {
      const pl = reportData?.pl || {};
      const pick = (k) => String(pl[k]?.actual ?? "").replace(/[^\d.-]/g, "");
      return [
        ["Revenue",        "", pick("revenue"),     "", ""],
        ["Cost of Sales",  "", pick("cogs"),        "", ""],
        ["Gross Profit",   "", pick("grossProfit"), "", ""],
        ["EBITDA",         "", pick("ebitda"),      "", ""],
        ["Net Profit",     "", pick("pat"),         "", ""],
      ];
    },
    parse: (rows) => rows
      .filter(r => r[0])
      .map(r => ({ item: r[0], budget: num(r[1]), actual: num(r[2]), fav: yes(r[3]), comment: r[4] || "" })),
  },

  {
    key: "treasury",
    label: "Deposits and facilities",
    writes: "treasury",
    why: "Facility terms, rates and maturities are not in the accounting records.",
    columns: ["Institution", "Type", "Amount", "Rate %", "Maturity (DD/MM/YYYY)", "Note"],
    example: ["Emirates NBD", "Fixed deposit", "500000", "4.25", "15/03/2027", "Auto-renews unless instructed"],
    prefill: () => [],
    parse: (rows) => rows
      .filter(r => r[0])
      .map(r => ({ institution: r[0], type: r[1] || "", amount: num(r[2]),
                   rate: num(r[3]), maturity: r[4] || "", note: r[5] || "" })),
  },

  {
    key: "scenarios",
    label: "Scenarios",
    writes: "scenarioBase",
    why: "Assumptions are a judgement. Nothing in the books implies them.",
    columns: ["Scenario", "Revenue change %", "Cost change %", "Collection days change", "Comment"],
    example: ["Lose largest customer", "-38", "-12", "+10", "Modelled on the Hero contract not renewing"],
    prefill: () => [
      ["Base case", "0", "0", "0", ""],
      ["Downside",  "",  "",  "",  ""],
      ["Upside",    "",  "",  "",  ""],
    ],
    parse: (rows) => rows
      .filter(r => r[0])
      .map(r => ({ name: r[0], revenuePct: num(r[1]), costPct: num(r[2]),
                   collectionDays: num(r[3]), comment: r[4] || "" })),
  },

  {
    key: "relatedparty",
    label: "Related party transactions",
    writes: "rptEntities",
    why: "Whether a price is at arm's length is a determination, not a number.",
    columns: ["Related entity", "Relationship", "Nature of transaction", "Amount", "Arm's length (Y/N)", "Basis"],
    example: ["Rashidi Holdings FZE", "Common shareholder", "Management fee", "160000", "Y", "Three third-party quotes on file"],
    prefill: () => [],
    parse: (rows) => rows
      .filter(r => r[0])
      .map(r => ({ entity: r[0], relationship: r[1] || "", nature: r[2] || "",
                   amount: num(r[3]), armsLength: yes(r[4]), basis: r[5] || "" })),
  },

  {
    key: "auditready",
    label: "Audit readiness checklist",
    writes: "auditReadiness",
    why: "Whether a document exists and satisfies the auditor is something only you know.",
    columns: ["Category", "Item", "Held (Y/N)", "Required (Y/N)", "Note"],
    example: ["Tax Documentation", "VAT returns, last four quarters", "Y", "Y", "Filed and acknowledged"],
    prefill: () => [
      ["Financial Statements", "Audited P&L (current year)",      "", "Y", ""],
      ["Financial Statements", "Audited balance sheet",           "", "Y", ""],
      ["Financial Statements", "Cash flow statement (IFRS)",      "", "Y", ""],
      ["Tax Documentation",    "VAT returns, last four quarters", "", "Y", ""],
      ["Tax Documentation",    "CT registration certificate",     "", "Y", ""],
      ["Tax Documentation",    "Free zone supporting documents",  "", "Y", ""],
    ],
    parse: (rows) => {
      const items = rows.filter(r => r[1])
        .map(r => ({ cat: r[0] || "Other", item: r[1], done: yes(r[2]), req: yes(r[3]) || r[3] === "", note: r[4] || "" }));
      const req = items.filter(i => i.req);
      return {
        checklistItems: items,
        auditScore: req.length ? Math.round((req.filter(i => i.done).length / req.length) * 100) : null,
      };
    },
  },

  {
    key: "revrecon",
    label: "Revenue reconciliation — IFRS to VAT",
    writes: "revRecon",
    why: "The reconciling items are a judgement about timing and recognition.",
    columns: ["Description", "IFRS revenue", "VAT revenue", "Explanation"],
    example: ["Advances received", "0", "85000", "VAT point on receipt; IFRS deferred until delivery"],
    prefill: ({ reportData }) => {
      const rev = String(reportData?.pl?.revenue?.actual ?? "").replace(/[^\d.-]/g, "");
      return [["Standard-rated sales", rev, rev, "Identical in both"]];
    },
    parse: (rows) => ({
      rows: rows.filter(r => r[0])
        .map(r => ({ desc: r[0], ifrs: num(r[1]), vat: num(r[2]), explanation: r[3] || "" })),
    }),
  },
];

export const templateFor = (key) => TEMPLATES.find(t => t.key === key) || null;

/** Build the CSV a person downloads, carrying whatever the portal already knows. */
export function buildTemplateCsv(def, context = {}) {
  const lines = [];
  lines.push(`# ${def.label} — Finzzup`);
  lines.push(`# ${def.why}`);
  lines.push(`# Fill the rows below, save as CSV, and upload it back. Lines starting with # are ignored.`);
  lines.push(`# Example: ${def.example.map(esc).join(",")}`);
  lines.push(def.columns.map(esc).join(","));
  const rows = (def.prefill?.(context) || []);
  for (const r of rows) lines.push(r.map(esc).join(","));
  if (!rows.length) lines.push(def.columns.map(() => "").join(","));
  return lines.join("\n");
}

/**
 * Parse a filled template.
 * Comment lines and the header are skipped, so a file can be uploaded exactly
 * as downloaded without stripping anything out first.
 */
export function parseTemplateCsv(def, text) {
  const all = String(text || "").replace(/\r\n?/g, "\n").split("\n")
    .map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith("#"));
  if (!all.length) return { ok: false, reason: "The file is empty." };

  const header = splitLine(all[0]);
  const looksLikeHeader = header[0] &&
    header[0].toLowerCase() === String(def.columns[0]).toLowerCase();
  const body = looksLikeHeader ? all.slice(1) : all;
  if (!body.length) return { ok: false, reason: "No rows found under the heading." };

  const rows = body.map(splitLine).filter(r => r.some(c => c !== ""));
  if (!rows.length) return { ok: false, reason: "Every row is blank." };

  return { ok: true, rows, parsed: def.parse(rows), count: rows.length };
}
