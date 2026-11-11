// The UAE sheets that are about what is coming rather than what has happened.
//
// Every date and threshold on these sheets is an input on Assumptions, never a
// number inside a formula. Published guidance on UAE deadlines and reliefs
// moves, and secondary sources disagree with each other — so the workbook
// states what it was told rather than asserting a date of its own.
import { T, NF, sheet, title, section, heads, cell, note, dropdown, rag } from "./wb-lib.mjs";

export function eInvoicing(wb) {
  const ws = sheet(wb, "E-Invoicing Readiness", { tab: T.tabTax,
    widths: [46, 18, 14, 18, 54], freeze: "B7" });
  let r = title(ws, "E-invoicing readiness",
    "Readiness is a data problem long before it is a software problem. Free zones are not exempt.", 5);
  r++;

  r = section(ws, r, "Where this client stands", 5);
  r = heads(ws, r, ["", "Value", "", "", "Note"], { align: ["left","right","center","left","left"] });
  const P = {};
  const fact = (label, f, hint, input = true, nf) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, input ? null : `=${f}`, { kind: input ? "input" : "calc", nf });
    cell(ws, r, 5, hint, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  P.rev   = fact("Annual revenue", "PL_Revenue*12/IF(Cl_Days=0,12,Cl_Days/30)", "Which wave this client falls into", false, NF.money);
  P.thresh= fact("Revenue threshold for the earlier wave", null, "From Assumptions — confirm against the current decision", true, NF.money);
  cell(ws, P.thresh, 2, "=R_EinvThreshold", { kind: "link", nf: NF.money });
  P.wave  = fact("Wave", `IF(B${P.rev}>=B${P.thresh},"Earlier wave","Later wave")`, "", false);
  P.date  = fact("Mandatory from", `IF(B${P.rev}>=B${P.thresh},R_EinvDate1,R_EinvDate2)`, "Set both dates on Assumptions", false, NF.date);
  P.left  = fact("Months remaining", `IF(OR(B${P.date}="",Cover!$B$12=""),"",(B${P.date}-Cover!$B$12)/30.4)`, "", false, NF.num);
  P.asp   = fact("Accredited service provider appointed", null, "Appointing late is where the cost sits", true);
  dropdown(ws, `B${P.asp}`, "=YesNo");
  P.cost  = fact("Cost of a month's delay", null, "From Assumptions", true, NF.money);
  cell(ws, P.cost, 2, "=R_EinvPenalty", { kind: "link", nf: NF.money });
  ws.addConditionalFormatting({ ref: `B${P.left}`, rules: [
    { type:"cellIs", operator:"lessThan", formulae:["6"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    { type:"cellIs", operator:"lessThan", formulae:["12"], priority:2,
      style:{ font:{ color:{ argb:T.warn }, bold:true } } },
  ]});
  r++;

  r = section(ws, r, "Data quality — what actually stops an implementation", 5);
  r = note(ws, r, "An e-invoice is rejected for a missing TRN or a malformed address, not for anything clever. These are counted off the client's own master data.", 5);
  r = heads(ws, r, ["Check", "Records", "Clean", "% clean", "What to do"],
            { align: ["left","right","right","right","left"] });
  const dFirst = r;
  for (const [label, todo] of [
    ["Customers with a valid TRN",            "Chase the missing ones before go-live, not after"],
    ["Customers with a complete address",      "Emirate and country are both required"],
    ["Suppliers with a valid TRN",             "Needed for input credit under the new flow"],
    ["Items with a tax category",              "Standard, zero, exempt or out of scope on every line"],
    ["Items with a unit of measure",           ""],
    ["Invoices carrying a unique number",      "Duplicates are rejected outright"],
    ["Credit notes linked to their invoice",   ""],
  ]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf: NF.num });
    cell(ws, r, 3, null, { kind: "input", nf: NF.num });
    cell(ws, r, 4, `=IF(N(B${r})=0,"",C${r}/B${r})`, { nf: NF.pct });
    cell(ws, r, 5, todo, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  cell(ws, r, 1, "Master data readiness", { kind: "label", bold: true });
  cell(ws, r, 4, `=IF(SUM(B${dFirst}:B${r - 1})=0,"",SUM(C${dFirst}:C${r - 1})/SUM(B${dFirst}:B${r - 1}))`,
       { kind: "lock", nf: NF.pct, bold: true });
  const dataScore = r;
  rag(ws, `D${dFirst}:D${r}`, { good: 0.95, bad: 0.8 });
  r += 2;

  r = section(ws, r, "Steps", 5);
  r = heads(ws, r, ["Step", "Owner", "Done?", "By when", "Note"],
            { align: ["left","left","center","left","left"] });
  const sFirst = r;
  for (const step of [
    "Decide the route — accredited provider, or the accounting system's own module",
    "Appoint the provider and sign",
    "Clean customer and supplier master data",
    "Map invoice fields to the required format",
    "Agree the archiving and retention arrangement",
    "Run a test submission",
    "Train whoever raises invoices",
    "Go live and reconcile the first month",
  ]) {
    cell(ws, r, 1, step, { kind: "label", indent: 1, wrap: true });
    cell(ws, r, 2, null, { kind: "input" });
    cell(ws, r, 3, null, { kind: "input", align: "center" });
    dropdown(ws, `C${r}`, "=YesNo");
    cell(ws, r, 4, null, { kind: "input", nf: NF.date });
    cell(ws, r, 5, null, { kind: "input" });
    r++;
  }
  cell(ws, r, 1, "Readiness", { kind: "label", bold: true });
  cell(ws, r, 3, `=ROUND(COUNTIF(C${sFirst}:C${r - 1},"Yes")/8*100,0)`, { kind: "lock", bold: true, align: "center" });
  const score = r;
  wb.definedNames.add(`'E-Invoicing Readiness'!$C$${score}`,    "EI_Score");
  wb.definedNames.add(`'E-Invoicing Readiness'!$D$${dataScore}`,"EI_DataQuality");
  wb.definedNames.add(`'E-Invoicing Readiness'!$B$${P.date}`,   "EI_Date");
  wb.definedNames.add(`'E-Invoicing Readiness'!$B$${P.left}`,   "EI_MonthsLeft");
  return ws;
}

export function segments(wb, uae = true) {
  const ws = sheet(wb, "Segments", { tab: T.tabAnal,
    widths: [30, 18, 18, 18, 14, 18, 14], freeze: "B7" });
  let r = title(ws, uae ? "Profit by business line, branch and emirate"
                        : "Profit by business line, branch and region",
    "Owners know what the business made. They rarely know which part of it made it.", 7);
  r++;

  const block = (name, keyCol, seeds) => {
    r = section(ws, r, name, 7);
    r = heads(ws, r, [keyCol, "Revenue", "Direct cost", "Allocated overhead",
                      "Contribution", "% of revenue", "Margin"],
              { align: ["left","right","right","right","right","right","right"] });
    const first = r;
    for (const seedName of [...seeds, "", "", ""]) {
      cell(ws, r, 1, seedName || null, { kind: "input" });
      cell(ws, r, 2, null, { kind: "input", nf: NF.money });
      cell(ws, r, 3, null, { kind: "input", nf: NF.money });
      cell(ws, r, 4, null, { kind: "input", nf: NF.money });
      cell(ws, r, 5, `=IF($A${r}="","",N(B${r})-N(C${r})-N(D${r}))`, { nf: NF.money });
      cell(ws, r, 6, `=IF(SUM($B$${first}:$B$${first + seeds.length + 2})=0,"",B${r}/SUM($B$${first}:$B$${first + seeds.length + 2}))`, { nf: NF.pct });
      cell(ws, r, 7, `=IF(N(B${r})=0,"",E${r}/B${r})`, { nf: NF.pct });
      r++;
    }
    const last = r - 1;
    cell(ws, r, 1, "Total", { kind: "label", bold: true });
    for (const c of [2, 3, 4, 5]) {
      cell(ws, r, c, `=SUM(${String.fromCharCode(64 + c)}${first}:${String.fromCharCode(64 + c)}${last})`,
           { kind: "lock", nf: NF.money, bold: true });
    }
    cell(ws, r, 7, `=IF(B${r}=0,"",E${r}/B${r})`, { kind: "lock", nf: NF.pct, bold: true });
    // A line losing money is the thing worth finding.
    ws.addConditionalFormatting({ ref: `E${first}:E${last}`, rules: [
      { type:"cellIs", operator:"lessThan", formulae:["0"], priority:1,
        style:{ font:{ color:{ argb:T.bad }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    ]});
    const totalRow = r; r += 2;
    return { first, last, totalRow };
  };

  const lines    = block("By business line", "Business line", ["", "", ""]);
  const emirates = uae
    ? block("By emirate", "Emirate",
        ["Dubai", "Abu Dhabi", "Sharjah", "Other emirates", "Outside the UAE"])
    : block("By region", "Region",
        ["North", "South", "East", "West", "Central", "International"]);
  const branches = block("By branch", "Branch", ["", ""]);

  r = note(ws, r, "Allocated overhead is a judgement. Say on the client's screen how it was allocated, or the comparison between lines is not one.", 7);
  cell(ws, r + 1, 1, "How overhead was allocated", { kind: "label", bold: true });
  ws.mergeCells(r + 2, 1, r + 4, 7);
  cell(ws, r + 2, 1, null, { kind: "input", wrap: true });
  ws.getRow(r + 2).height = 48;

  wb.definedNames.add(`Segments!$A$${lines.first}:$G$${lines.last}`,       "SegmentLines");
  wb.definedNames.add(`Segments!$A$${emirates.first}:$G$${emirates.last}`, "SegmentRegions");
  wb.definedNames.add(`Segments!$A$${branches.first}:$G$${branches.last}`, "SegmentBranches");
  wb.definedNames.add(`Segments!$A$${r + 2}`, "SegmentNote");
  return ws;
}

export function loanReadiness(wb) {
  const ws = sheet(wb, "Loan & Investor", { tab: T.tabAnal,
    widths: [42, 18, 18, 16, 12, 48], freeze: "B7" });
  let r = title(ws, "Bank and investor readiness",
    "Facilities are refused for a missing pack as often as for a weak business.", 6);
  r++;

  r = section(ws, r, "What a lender tests", 6);
  r = heads(ws, r, ["", "Current", "Prior", "Covenant", "Flag", "Why they look at it"],
            { align: ["left","right","right","right","center","left"] });
  const L = {};
  const metric = (label, f, nf, cov, good, why) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=IFERROR(${f},"")`, { nf });
    cell(ws, r, 3, null, { kind: "input", nf });
    cell(ws, r, 4, cov, { kind: "input", nf });
    cell(ws, r, 5, `=IF(B${r}="","",IF(B${r}${good}D${r},"OK","BREACH"))`, { align: "center", bold: true });
    cell(ws, r, 6, why, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
    ws.addConditionalFormatting({ ref: `E${r}`, rules: [
      { type:"cellIs", operator:"equal", formulae:['"OK"'], priority:1,
        style:{ font:{ color:{ argb:T.good }, bold:true } } },
      { type:"cellIs", operator:"equal", formulae:['"BREACH"'], priority:2,
        style:{ font:{ color:{ argb:T.bad }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    ]});
    const at = r; r++; return at;
  };
  cell(ws, r, 1, "Annual debt service — principal plus interest", { kind: "label", indent: 1 });
  cell(ws, r, 2, null, { kind: "input", nf: NF.money });
  L.service = r; r++;
  L.dscr = metric("DSCR", `(PL_EBITDA-PL_Tax)/B${L.service}`, NF.ratio, 1.25, ">=",
    "Operating cash against what has to be repaid. The first number a credit committee reads.");
  L.cover = metric("Interest cover", "PL_EBITDA/PL_Fin", NF.ratio, 3.0, ">=",
    "Below 2 and one bad quarter is a breach.");
  L.lev   = metric("Debt to EBITDA", "BS_Debt/PL_EBITDA", NF.ratio, 3.0, "<=",
    "Years of operating profit to clear the debt.");
  L.gear  = metric("Debt to equity", "BS_Debt/BS_Eq", NF.ratio, 2.0, "<=", "");
  L.cur   = metric("Current ratio", "(BS_AR+BS_Inv+BS_Cash+BS_OA)/(BS_AP+BS_OL)", NF.ratio, 1.25, ">=", "");
  r++;

  r = section(ws, r, "The pack they will ask for", 6);
  r = heads(ws, r, ["Document", "Held?", "", "", "", "Note"], { align: ["left","center","left","left","left","left"] });
  const pFirst = r;
  for (const [doc, hint] of [
    ["Audited financial statements — last two years", "Free zone renewal needs these anyway"],
    ["Management accounts — last twelve months",      "Monthly, not a year-end lump"],
    ["Bank statements — last twelve months",          ""],
    ["Trade licence and establishment card",          ""],
    ["Shareholder and UBO details",                   ""],
    ["Debtor and creditor ageing",                    "Straight out of this workbook"],
    ["Order book or contracted revenue",              "What makes the projection credible"],
    ["Projections — three years",                     "With the assumptions written down"],
    ["VAT returns — last four periods",               ""],
    ["Corporate tax registration and return",         ""],
    ["Existing facility letters and security",        ""],
  ]) {
    cell(ws, r, 1, doc, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", align: "center" });
    dropdown(ws, `B${r}`, "=YesNo");
    cell(ws, r, 6, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  cell(ws, r, 1, "Pack complete", { kind: "label", bold: true });
  cell(ws, r, 2, `=ROUND(COUNTIF(B${pFirst}:B${r - 1},"Yes")/11*100,0)`,
       { kind: "lock", bold: true, align: "center" });
  const packScore = r; r += 2;

  r = section(ws, r, "The ask", 6);
  for (const [label, nf] of [["Facility sought", NF.money], ["Purpose", NF.text],
                             ["Tenor, months", NF.num], ["Security offered", NF.text],
                             ["Rate expected", NF.pct]]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf });
    r++;
  }
  r++;
  cell(ws, r, 1, "Readiness score", { kind: "label", bold: true });
  cell(ws, r, 2, `=ROUND((B${packScore}+IF(E${L.dscr}="OK",100,0)+IF(E${L.cover}="OK",100,0)+IF(E${L.lev}="OK",100,0))/4,0)`,
       { kind: "lock", bold: true });
  const total = r;
  wb.definedNames.add(`'Loan & Investor'!$B$${L.dscr}`,   "LN_DSCR");
  wb.definedNames.add(`'Loan & Investor'!$B$${packScore}`,"LN_Pack");
  wb.definedNames.add(`'Loan & Investor'!$B$${total}`,    "LN_Score");
  return ws;
}

export function crossBorder(wb) {
  const ws = sheet(wb, "India-UAE", { tab: T.tabTax, widths: [46, 20, 16, 56], freeze: "B7" });
  let r = title(ws, "India and the UAE in one structure",
    "An Indian promoter with a UAE entity has a set of questions no single-country adviser asks.", 4);
  r++;
  r = note(ws, r, "This is a register of positions taken and evidence held, not a computation. Each line is a determination; the note is what you would say if asked to justify it.", 4);
  r++;

  const block = (name, rows) => {
    r = section(ws, r, name, 4);
    r = heads(ws, r, ["Question", "Position", "Evidence held?", "Note"],
              { align: ["left","left","center","left"] });
    for (const [q, hint] of rows) {
      cell(ws, r, 1, q, { kind: "label", indent: 1, wrap: true });
      cell(ws, r, 2, null, { kind: "input" });
      cell(ws, r, 3, null, { kind: "input", align: "center" });
      dropdown(ws, `C${r}`, "=YesNo");
      cell(ws, r, 4, hint, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
      ws.getRow(r).height = 22;
      r++;
    }
    r++;
  };

  block("Residence and management", [
    ["Where is the UAE entity actually managed from?", "Board meetings, where decisions are taken, who signs"],
    ["Is a place of effective management in India arguable?", "If so, UAE profits can be taxed in India"],
    ["Board minutes and travel records kept?", "The evidence that answers the question above"],
    ["Tax residency certificate obtained?", "Needed before any treaty position is claimed"],
  ]);
  block("Treaty positions", [
    ["Is a treaty benefit being claimed, and on what?", "Dividends, interest, royalties, capital gains"],
    ["Withholding applied on payments to India?", ""],
    ["Form 10F and no-PE declaration on file?", ""],
    ["Is there a permanent establishment in either country?", "A dependent agent or a fixed place both count"],
  ]);
  block("Money moving between the two", [
    ["Dividends repatriated this period", ""],
    ["Loans between the entities, and on what terms?", "Interest-free loans are a transfer pricing question"],
    ["Management or royalty fees charged", "Needs arm's length support on both sides"],
    ["LRS or ODI limits and filings up to date?", "FEMA — the Indian side of the same transaction"],
  ]);
  block("Reporting in both places", [
    ["UAE corporate tax return filed", ""],
    ["Indian return discloses the foreign asset or interest?", "Schedule FA — penalties here are severe"],
    ["Transfer pricing documentation prepared?", ""],
    ["Books kept to both standards where needed?", ""],
  ]);
  return ws;
}
