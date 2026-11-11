// ─── PORTAL FEED ──────────────────────────────────────────────────────────────
// The one sheet the portal reads.
//
// Every figure the client's screens show sits on a fixed row here, pulled from
// the workings by formula. The mapping binds to this sheet and nothing else, so
// the workings can be restructured — rows inserted, schedules rebuilt, whole
// sheets rearranged — without the portal ever reading the wrong cell.
//
// Without it the mapping would point at a hundred-odd cells scattered across
// thirty tabs, and the first inserted row would silently shift half of them.
import { T, NF, sheet, title, section, heads, cell, note } from "./wb-lib.mjs";
import { sheetsFor } from "../src/workbook.js";

// Where a figure comes from, when the workbook can work it out. Anything not
// listed is left blue for you to point at a cell in your own workings.
const FORMULA = {
  "monthLabel":                  "=Cl_Period",
  "kpis.month":                  "=Cl_Period",
  "kpis.revenue":                "=TEXT(PL_Revenue,\"#,##0\")",
  "kpis.gross_margin":           "=TEXT(PL_GPPct,\"0.0%\")",
  "kpis.cash_balance":           "=TEXT(BS_Cash,\"#,##0\")",

  "pl.revenue.actual":           "=TEXT(PL_Revenue,\"#,##0\")",
  "pl.cogs.actual":              "=TEXT(PL_COGS,\"#,##0\")",
  "pl.grossProfit.actual":       "=TEXT(PL_GP,\"#,##0\")",
  "pl.gpMargin.actual":          "=TEXT(PL_GPPct,\"0.0%\")",
  "pl.ebitda.actual":            "=TEXT(PL_EBITDA,\"#,##0\")",
  "pl.ebitdaMargin.actual":      "=TEXT(PL_EBITDAPct,\"0.0%\")",
  "pl.pat.actual":               "=TEXT(PL_PAT,\"#,##0\")",
  "pl.netMargin.actual":         "=TEXT(PL_PATPct,\"0.0%\")",

  "workingCapital.period":       "=Cl_Period",
  "workingCapital.debtors":      "=BS_AR",
  "workingCapital.creditors":    "=BS_AP",
  "workingCapital.inventory":    "=BS_Inv",
  "workingCapital.cashBank":     "=BS_Cash",
  "workingCapital.dso":          "=WC_DSO",
  "workingCapital.dio":          "=WC_DIO",
  "workingCapital.dpo":          "=WC_DPO",
  "workingCapital.ccc":          "=WC_CCC",
  "workingCapital.ar0_30":       "=AG_Current+AG_30",
  "workingCapital.ar31_60":      "=AG_60",
  "workingCapital.ar61_90":      "=AG_90",
  "workingCapital.ar90plus":     "=AG_90plus",
  "workingCapital.cccCashImpact":"=WC_Release",

  "treasury.totalCash":          "=TR_Cash",
  "treasury.investedPct":        "=TEXT(TR_Pct,\"0%\")",
  "treasury.yieldPA":            "=TEXT(TR_Yield,\"0.0%\")",

  "cac":                         "=UE_CAC",
  "ltv":                         "=UE_LTV",
  "arr":                         "=UE_ARR",
  "churnRate":                   "=TEXT(UE_Churn,\"0.0%\")",

  "vat.outputVAT":               "=VAT_Output",
  "vat.inputVAT":                "=VAT_Input",
  "vat.vatPayable":              "=VAT_Payable",
  "vat.filingPeriod":            "=VAT_Period",
  "vat.nextDeadline":            "=IF(VAT_Due=\"\",\"\",TEXT(VAT_Due,\"dd mmm yyyy\"))",

  "ct.revenue":                  "=CT_Revenue",
  "ct.taxableIncome":            "=CT_Taxable",
  "ct.liability":                "=CT_Charge",
  "ct.sbrEligible":              "=IF(CT_SBR=\"Eligible\",\"Y\",\"N\")",

  "qfzp.qfzpScore":              "=QF_Score",
  "qfzpSubstance.period":        "=Cl_Period",
  "qfzpSubstance.overallScore":  "=QF_Score",
  "qfzpSubstance.opexAED":       "=PL_Opex",

  "verticalAnalysis.period":     "=Cl_Period",
  "revRecon.period":             "=Cl_Period",

  "scenarioBase.revenue":        "=PL_Revenue",
  "scenarioBase.cogs":           "=PL_COGS",
  "scenarioBase.opex":           "=PL_Opex",
  "spendRevenue":                "=PL_Revenue",
};

// Tables are a range rather than a cell, so they are listed separately with
// the range on the workbook that holds them.
const RANGES = {
  "variance":                      "Variance!A:G",
  "verticalPnL":                   "Vertical!A:F",
  "treasury.deposits":             "Treasury!A:H",
  "rptEntities":                   "'UAE Related Party'!A:I",
  "connectedPersonsAdmin":         "'UAE Related Party'!A:I",
  "revRecon.rows":                 "'UAE Rev Recon'!A:E",
  "workingCapital.arAging":        "Concentration!A:F",
  "workingCapital.apSchedule":     "Concentration!A:F",
};

export function portalFeed(wb) {
  const ws = sheet(wb, "Portal Feed", {
    tab: T.tabOut, widths: [34, 40, 44, 22, 34], freeze: "A6" });
  let r = title(ws, "Portal Feed",
    "The only sheet the portal reads. Leave the ids alone; fill or repoint the Value column.", 5);
  r++;
  r = note(ws, r,
    "Green values come from your workings. Blue ones are waiting for you — either type the figure or point the cell at wherever it lives in your own schedules.", 5);
  r++;

  // Both jurisdictions on one sheet. The ones that do not apply simply stay
  // empty, which is cheaper than maintaining two workbooks.
  const seen = new Set();
  const all = [...sheetsFor(true), ...sheetsFor(false)];
  let group = null;

  for (const s of all) {
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    if (s.name !== group) {
      r = section(ws, r, `${s.name} — ${s.screen}`, 5);
      r = heads(ws, r, ["id (do not edit)", "Figure", "Where it shows", "Value", "Where it came from"],
                { align: ["left","left","left","right","left"] });
      group = s.name;
    }
    const emit = (id, label, kind) => {
      cell(ws, r, 1, id, { kind: "label", size: 9 }).font =
        { name: "Consolas", size: 9, color: { argb: T.muted } };
      cell(ws, r, 2, label, { kind: "label" });
      cell(ws, r, 3, s.screen, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
      if (kind === "range") {
        cell(ws, r, 4, RANGES[id] || null, { kind: RANGES[id] ? "link" : "input" });
        cell(ws, r, 5, "A range of rows", { size: 9 }).font =
          { size: 9, italic: true, color: { argb: T.muted } };
      } else if (FORMULA[id]) {
        cell(ws, r, 4, FORMULA[id], { kind: "link" });
        cell(ws, r, 5, FORMULA[id].replace(/^=/, "").replace(/TEXT\(|,"[^"]*"\)/g, ""),
             { size: 9 }).font = { name: "Consolas", size: 8, color: { argb: T.linkInk } };
      } else {
        cell(ws, r, 4, null, { kind: "input" });
        cell(ws, r, 5, null, { kind: "input", size: 9 });
      }
      r++;
    };

    if (s.kind === "kv") {
      for (const f of s.fields) {
        emit(s.target === "kpis" ? `kpis.${f.key}` : (s.path ? `${s.path}.${f.key}` : f.key),
             f.label, "scalar");
      }
    } else if (s.kind === "table") {
      emit(s.target === "actions" ? "actions" : s.path, s.name, "range");
    } else if (s.kind === "map") {
      emit(s.path, s.name, "range");
      for (const f of (s.extra || [])) emit(f.key, f.label, "scalar");
    }
    r++;
  }

  note(ws, r, "Adding a row above the first section, or renaming this sheet, breaks the link to the portal — and it breaks quietly, reading whatever happens to be in the cell afterwards.", 5);
  return ws;
}
