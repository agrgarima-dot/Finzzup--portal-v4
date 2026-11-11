// What gets pasted in: the trial balance, the open invoices, the open bills,
// the chart-of-accounts map, and the assumptions that are nowhere in the books.
import { T, NF, sheet, title, section, heads, cell, row, note, dropdown } from "./wb-lib.mjs";

const ROWS = 400;   // room to paste a real ledger into

/** An input table with formulas carried down every row. */
function table(ws, headerRow, cols, rows = ROWS) {
  for (let i = 0; i < rows; i++) {
    const r = headerRow + 1 + i;
    cols.forEach((c, j) => {
      const v = typeof c.f === "function" ? c.f(r) : null;
      cell(ws, r, j + 1, v, { kind: c.f ? "calc" : "input", nf: c.nf, align: c.align });
    });
  }
  return headerRow + 1 + rows;
}

export function coaMap(wb) {
  const ws = sheet(wb, "COA Map", { tab: T.tabMap, widths: [34, 26, 12, 56], freeze: "A6" });
  let r = title(ws, "Chart of accounts — map",
    "Every account type, and the line of the statements it belongs on. The statements are SUMIFs over this.", 4);
  r++;
  r = section(ws, r, "Account type → statement group", 4);
  r = heads(ws, r, ["Account type (as the books call it)", "Statement group", "Side", "Note"],
            { align: ["left","left","center","left"] });

  // The Zoho Books account_type values, which is what a connected client's
  // ledger actually carries. Anything else can be added underneath.
  const map = [
    ["income",              "Revenue",            "Cr", "Sales and other operating income"],
    ["other_income",        "Other Income",       "Cr", ""],
    ["cost_of_goods_sold",  "Cost of Sales",      "Dr", ""],
    ["expense",             "Operating Expenses", "Dr", ""],
    ["other_expense",       "Operating Expenses", "Dr", ""],
    ["depreciation",        "Depreciation",       "Dr", ""],
    ["accounts_receivable", "Receivables",        "Dr", "Ties to the AR ageing"],
    ["bank",                "Cash and Bank",      "Dr", ""],
    ["cash",                "Cash and Bank",      "Dr", ""],
    ["stock",               "Inventory",          "Dr", ""],
    ["fixed_asset",         "Fixed Assets",       "Dr", ""],
    ["other_asset",         "Other Assets",       "Dr", ""],
    ["other_current_asset", "Other Assets",       "Dr", "Prepayments, deposits, input VAT"],
    ["accounts_payable",    "Payables",           "Cr", "Ties to the AP ageing"],
    ["credit_card",         "Payables",           "Cr", ""],
    ["other_liability",     "Other Liabilities",  "Cr", "Accruals, output VAT, statutory dues"],
    ["other_current_liability","Other Liabilities","Cr", ""],
    ["long_term_liability", "Borrowings",         "Cr", ""],
    ["equity",              "Equity",             "Cr", "Capital and reserves"],
  ];
  const first = r;
  for (const [type, group, side, hint] of map) {
    cell(ws, r, 1, type,  { kind: "input" });
    cell(ws, r, 2, group, { kind: "input" });
    cell(ws, r, 3, side,  { kind: "input", align: "center" });
    cell(ws, r, 4, hint,  { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  for (let i = 0; i < 30; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input" });
    cell(ws, r, 3, null, { kind: "input", align: "center" });
    r++;
  }
  wb.definedNames.add(`'COA Map'!$A$${first}:$C$${r - 1}`, "COA");
  note(ws, r + 1, "An account type the books use that is not listed here will show as UNMAPPED on the trial balance and will be left out of the statements. Add it above rather than forcing it.", 4);
  return ws;
}

export function tbInput(wb) {
  const ws = sheet(wb, "TB Input", {
    tab: T.tabInput, widths: [14, 36, 24, 20, 16, 16, 16, 16, 16, 16], freeze: "C6" });
  let r = title(ws, "Trial balance",
    "Paste it straight out of the books. Do not tidy it first — the mapping does that.", 10);
  r++;
  r = section(ws, r, "Ledger", 10);
  const headerRow = r;
  r = heads(ws, r, ["Code","Account name","Account type","Group","Side",
                    "Opening","Period Dr","Period Cr","Closing Dr","Closing Cr"],
            { align: ["left","left","left","left","center","right","right","right","right","right"] });

  const cols = [
    {}, {}, {},
    { f: (n) => `=IF($C${n}="","",IFERROR(INDEX(COA,MATCH($C${n},INDEX(COA,0,1),0),2),"UNMAPPED"))` },
    { f: (n) => `=IF($C${n}="","",IFERROR(INDEX(COA,MATCH($C${n},INDEX(COA,0,1),0),3),""))`, align: "center" },
    { nf: NF.money }, { nf: NF.money }, { nf: NF.money },
    { f: (n) => `=IF($B${n}="","",MAX(0,$F${n}+$G${n}-$H${n}))`, nf: NF.money },
    { f: (n) => `=IF($B${n}="","",MAX(0,-($F${n}+$G${n}-$H${n})))`, nf: NF.money },
  ];
  const after = table(ws, headerRow, cols);

  // Totals live at a fixed row so the Checks sheet can point at them.
  const tr = 9999;
  cell(ws, tr, 2, "Total", { kind: "label", bold: true });
  cell(ws, tr, 7, `=SUM(G${headerRow + 1}:G${after})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, tr, 8, `=SUM(H${headerRow + 1}:H${after})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, tr, 9, `=SUM(I${headerRow + 1}:I${after})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, tr, 10,`=SUM(J${headerRow + 1}:J${after})`, { kind: "lock", nf: NF.money, bold: true });

  wb.definedNames.add(`'TB Input'!$D$${headerRow + 1}:$D$${after}`, "TB_Group");
  wb.definedNames.add(`'TB Input'!$I$${headerRow + 1}:$I$${after}`, "TB_Dr");
  wb.definedNames.add(`'TB Input'!$J$${headerRow + 1}:$J$${after}`, "TB_Cr");

  ws.addConditionalFormatting({ ref: `D${headerRow + 1}:D${after}`, rules: [
    { type:"cellIs", operator:"equal", formulae:['"UNMAPPED"'], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
  ]});
  return ws;
}

export function arInput(wb) {
  const ws = sheet(wb, "AR Input", {
    tab: T.tabInput, widths: [16, 32, 14, 14, 16, 16, 16, 12, 14, 16], freeze: "C6" });
  let r = title(ws, "Open invoices",
    "What is owed to this client. Drives the ageing, DSO and customer concentration.", 10);
  r++;
  r = section(ws, r, "Receivables", 10);
  const hr = r;
  r = heads(ws, r, ["Invoice","Customer","Date","Due date","Amount","Received",
                    "Outstanding","Days past due","Bucket","Notes"],
            { align: ["left","left","left","left","right","right","right","right","left","left"] });

  const cols = [
    {}, {}, { nf: NF.date }, { nf: NF.date }, { nf: NF.money }, { nf: NF.money },
    { f:(n)=>`=IF($A${n}="","",$E${n}-$F${n})`, nf: NF.money },
    { f:(n)=>`=IF(OR($A${n}="",$D${n}=""),"",MAX(0,Cover!$B$12-$D${n}))`, nf: NF.num, align:"right" },
    { f:(n)=>`=IF($A${n}="","",IF($H${n}=0,"Current",IF($H${n}<=30,"1–30d",IF($H${n}<=60,"31–60d",IF($H${n}<=90,"61–90d","90d+")))))` },
    {},
  ];
  const after = table(ws, hr, cols);
  const tr = 9999;
  cell(ws, tr, 2, "Total outstanding", { kind: "label", bold: true });
  cell(ws, tr, 10, `=SUM(G${hr + 1}:G${after})`, { kind: "lock", nf: NF.money, bold: true });
  wb.definedNames.add(`'AR Input'!$B$${hr + 1}:$J$${after}`, "AR");
  wb.definedNames.add(`'AR Input'!$I$${hr + 1}:$I$${after}`, "AR_Bucket");
  wb.definedNames.add(`'AR Input'!$G$${hr + 1}:$G$${after}`, "AR_Out");
  wb.definedNames.add(`'AR Input'!$B$${hr + 1}:$B$${after}`, "AR_Cust");
  return ws;
}

export function apInput(wb) {
  const ws = sheet(wb, "AP Input", {
    tab: T.tabInput, widths: [16, 32, 14, 14, 16, 16, 16, 12, 14, 12], freeze: "C6" });
  let r = title(ws, "Open bills",
    "What this client owes. Drives the payables ageing, DPO, supplier spend and — in India — the 45-day MSME test.", 10);
  r++;
  r = section(ws, r, "Payables", 10);
  const hr = r;
  r = heads(ws, r, ["Bill","Supplier","Date","Due date","Amount","Paid",
                    "Outstanding","Days past due","Bucket","MSME?"],
            { align: ["left","left","left","left","right","right","right","right","left","center"] });
  const cols = [
    {}, {}, { nf: NF.date }, { nf: NF.date }, { nf: NF.money }, { nf: NF.money },
    { f:(n)=>`=IF($A${n}="","",$E${n}-$F${n})`, nf: NF.money },
    { f:(n)=>`=IF(OR($A${n}="",$D${n}=""),"",MAX(0,Cover!$B$12-$D${n}))`, nf: NF.num, align:"right" },
    { f:(n)=>`=IF($A${n}="","",IF($H${n}=0,"Current",IF($H${n}<=30,"1–30d",IF($H${n}<=60,"31–60d",IF($H${n}<=90,"61–90d","90d+")))))` },
    { align: "center" },
  ];
  const after = table(ws, hr, cols);
  for (let i = hr + 1; i <= after; i++) dropdown(ws, `J${i}`, "=YesNo");
  const tr = 9999;
  cell(ws, tr, 2, "Total outstanding", { kind: "label", bold: true });
  cell(ws, tr, 10, `=SUM(G${hr + 1}:G${after})`, { kind: "lock", nf: NF.money, bold: true });
  wb.definedNames.add(`'AP Input'!$I$${hr + 1}:$I$${after}`, "AP_Bucket");
  wb.definedNames.add(`'AP Input'!$G$${hr + 1}:$G$${after}`, "AP_Out");
  wb.definedNames.add(`'AP Input'!$B$${hr + 1}:$B$${after}`, "AP_Supp");
  return ws;
}

export function assumptions(wb) {
  const ws = sheet(wb, "Assumptions", { tab: T.tabInput, widths: [40, 18, 18, 60], freeze: "A6" });
  let r = title(ws, "Assumptions",
    "Nothing on this sheet is in the books. Every figure here is a judgement, and the client's report will rest on it.", 4);
  r++;

  r = section(ws, r, "Budget for the period", 4);
  r = heads(ws, r, ["Line", "Budget", "Basis", "Note"], { align: ["left","right","left","left"] });
  const budgetFirst = r;
  for (const line of ["Revenue","Cost of Sales","Gross Profit","Operating Expenses",
                      "EBITDA","Depreciation","Finance Cost","Tax","Net Profit"]) {
    cell(ws, r, 1, line, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input" });
    cell(ws, r, 4, null, { kind: "input" });
    r++;
  }
  wb.definedNames.add(`Assumptions!$A$${budgetFirst}:$B$${r - 1}`, "Budget");

  r++;
  r = section(ws, r, "Operating assumptions", 4);
  r = heads(ws, r, ["Assumption", "Value", "Unit", "Note"], { align: ["left","right","left","left"] });
  const ops = [
    ["Revenue growth, month on month", "", "%", ""],
    ["Target collection period",       "", "days", "What you are steering DSO towards"],
    ["Supplier payment period",        "", "days", ""],
    ["Inventory holding",              "", "days", ""],
    ["Gross margin target",            "", "%", ""],
    ["Monthly payroll",                "", "", "For the 13-week cash forecast"],
    ["Monthly fixed overhead",         "", "", ""],
    ["Minimum cash buffer",            "", "", "The level you do not want to go below"],
  ];
  for (const [label, v, unit, hint] of ops) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, v, { kind: "input", nf: NF.num });
    cell(ws, r, 3, unit, { kind: "label", size: 9 });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }

  r++;
  r = section(ws, r, "Rates — check these against the law for the year, not against last year's file", 4);
  r = heads(ws, r, ["Rate", "Value", "Unit", "Note"], { align: ["left","right","left","left"] });
  const rates = [
    ["UAE VAT standard rate",            0.05,    "%", "Output VAT on standard-rated supplies"],
    ["UAE Corporate Tax rate",           0.09,    "%", "Above the nil band"],
    ["UAE CT nil band",                  375000,  "AED", "Taxable income below this is at 0%"],
    ["UAE Small Business Relief cap",    3000000, "AED", "Revenue at or below this may elect SBR"],
    ["QFZP de minimis — percentage",     0.05,    "%", "Non-qualifying revenue as a share of total"],
    ["QFZP de minimis — absolute",       5000000, "AED", "The test is the lower of the two"],
    ["India MSME payment window",        45,      "days", "Section 43B(h)"],
  ];
  const rFirst = r;
  for (const [label, v, unit, hint] of rates) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, v, { kind: "input", nf: unit === "%" ? NF.pct : NF.money });
    cell(ws, r, 3, unit, { kind: "label", size: 9 });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  wb.definedNames.add(`Assumptions!$B$${rFirst}`,     "R_VAT");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 1}`, "R_CT");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 2}`, "R_NilBand");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 3}`, "R_SBRCap");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 4}`, "R_DeMinPct");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 5}`, "R_DeMinAbs");
  wb.definedNames.add(`Assumptions!$B$${rFirst + 6}`, "R_MSMEDays");

  note(ws, r + 1, "Rates move. This sheet is the only place they are written down, so a year-end change is one edit rather than a hunt through formulas.", 4);
  return ws;
}
