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
import { eInvoicing, segments, loanReadiness, crossBorder } from "./wb-uae2.mjs";
import { forecast } from "./wb-forecast.mjs";
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

  // Trial balance → code, name, type, (group), (side), opening, Dr, Cr.
  //
  // The field names are the mapper's, not Zoho's: it returns zohoCode,
  // zohoType, dr and cr. Reading code/type/debit/credit instead produced a
  // sheet with the account names filled in and everything else blank — which
  // looked like a sync that had half worked, and was really a sync that had
  // worked and a seeding step that was looking in the wrong place. The
  // alternatives are kept so a rename in the mapper degrades rather than
  // silently empties the column.
  const trialBalance = (sync.trialBalance?.rows || []).map(row => ([
    row.zohoCode ?? row.code ?? "",
    row.name ?? row.account ?? "",
    row.zohoType ?? row.type ?? "",
    null, null,                               // group and side are formulas
    null,                                     // opening is not in the feed
    n(row.dr ?? row.debit),
    n(row.cr ?? row.credit),
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

  // A free zone company has no GST and an Indian company has no QFZP. Building
  // both sets and leaving half of them blank would be asking a Chartered
  // Accountant to scroll past a dozen sheets that can never apply, every
  // month, for every client.
  const j     = String(client?.jurisdiction || "UAE");
  const cross = /cross/i.test(j);
  const uae   = cross || /uae/i.test(j);
  const india = cross || !uae;
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
  forecast(wb, { uae });
  unitEconomics(wb);
  concentration(wb);
  segments(wb, uae);
  treasury(wb);
  loanReadiness(wb);

  if (uae) {
    uaeVat(wb);
    uaeCT(wb);
    uaeQfzp(wb);
    uaeRpt(wb);
    uaeRevRecon(wb);
    eInvoicing(wb);
  }
  if (india) indiaTax(wb);
  // An Indian promoter with a UAE entity is the case this answers. It belongs
  // with the UAE set, not with the Indian one.
  if (uae) crossBorder(wb);

  portalFeed(wb, uae);
  checks(wb, uae);
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
