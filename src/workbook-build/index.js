// ─── BUILDING THE WORKBOOK ────────────────────────────────────────────────────
// One entry point, used by both the admin panel and the command line.
//
// ExcelJS is imported here and nowhere else. The admin panel loads this module
// on demand, so the client portal never carries a spreadsheet writer it has no
// use for.
import ExcelJS from "exceljs";
import { cover, howTo, lists, checks } from "./wb-core.mjs";
import { coaMap, tbInput, arInput, apInput, assumptions } from "./wb-inputs.mjs";
import { pnl, balanceSheet, cashFlow, workingCapital, ratios } from "./wb-calc.mjs";
import { variance, vertical, trend, scenarios, cash13, unitEconomics,
         concentration, treasury } from "./wb-analysis.mjs";
import { uaeVat, uaeCT, uaeQfzp, uaeRpt, uaeRevRecon, indiaTax } from "./wb-tax.mjs";
import { portalFeed } from "./wb-feed.mjs";

const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
const d = (v) => {
  if (!v) return null;
  const t = new Date(v);
  return isFinite(t.getTime()) ? t : null;
};

/**
 * A sync payload → the rows the input sheets open with.
 *
 * The sync has already read the chart of accounts, the open invoices and the
 * open bills. Asking for them to be exported and pasted again would be asking
 * for the same work twice, and the paste is where transcription errors live.
 *
 * Only what the books actually said is carried. Nothing is inferred to fill a
 * column — a missing due date stays empty, and the ageing formula shows a
 * blank rather than ageing against a date nobody gave.
 */
export function seedFromSync(sync) {
  if (!sync) return {};

  // Trial balance → code, name, type, (group), (side), opening, Dr, Cr
  const trialBalance = (sync.trialBalance?.rows || []).map(row => ([
    row.code || row.accountCode || "",
    row.name || row.account || "",
    row.type || row.accountType || "",
    null, null,                               // group and side are formulas
    null,                                     // opening is not in the feed
    n(row.debit), n(row.credit),
  ]));

  const fromBuckets = (buckets, received) => (buckets || []).flatMap(b =>
    (b.txns || []).map(t => ([
      t.id || "",
      t.desc || "",
      d(t.date),
      d(t.dueDate),
      n(t.amount),                            // what is still outstanding
      received,                               // nothing further received yet
      null, null, null, null,                 // outstanding, days, bucket are formulas
    ])));

  return {
    trialBalance,
    receivables: fromBuckets(sync.receivables, 0),
    payables:    fromBuckets(sync.payables, 0),
  };
}

/**
 * Build the workbook.
 * @param {object} opts
 * @param {object} opts.client  for the cover
 * @param {object} opts.sync    a sync payload, or nothing for an empty workbook
 * @returns {Promise<ExcelJS.Workbook>}
 */
export function buildAnalysisWorkbook({ client, sync } = {}) {
  const seed = seedFromSync(sync);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finzzup";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;   // formulas show values on open

  // The order is the order the work happens in.
  cover(wb, client);
  howTo(wb);
  lists(wb);

  coaMap(wb);
  tbInput(wb, seed);
  arInput(wb, seed);
  apInput(wb, seed);
  assumptions(wb);

  pnl(wb);
  balanceSheet(wb);
  cashFlow(wb);
  workingCapital(wb);
  ratios(wb);

  variance(wb);
  vertical(wb);
  trend(wb);
  scenarios(wb);
  cash13(wb);
  unitEconomics(wb);
  concentration(wb);
  treasury(wb);

  uaeVat(wb);
  uaeCT(wb);
  uaeQfzp(wb);
  uaeRpt(wb);
  uaeRevRecon(wb);
  indiaTax(wb);

  portalFeed(wb);
  checks(wb);
  return wb;
}

/** What was carried over, for saying so plainly before the download. */
export function describeSeed(seed = {}) {
  return {
    accounts:    (seed.trialBalance || []).length,
    receivables: (seed.receivables  || []).length,
    payables:    (seed.payables     || []).length,
  };
}
