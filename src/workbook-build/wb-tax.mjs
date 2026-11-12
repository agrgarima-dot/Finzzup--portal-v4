// Tax workings. UAE and India sit on separate sheets; the Cover says which
// apply, and the ones that do not stay blank rather than asking to be filled.
import { T, NF, sheet, title, section, heads, cell, note, dropdown } from "./wb-lib.mjs";

export function uaeVat(wb) {
  const ws = sheet(wb, "UAE VAT", { tab: T.tabTax, widths: [40, 20, 20, 50], freeze: "B6" });
  let r = title(ws, "VAT return working", "Standard rate from Assumptions. Filed within 28 days of the period end.", 4);
  r++;
  r = section(ws, r, "Supplies", 4);
  r = heads(ws, r, ["", "Amount", "VAT", "Note"], { align: ["left","right","right","left"] });
  const V = {};
  const supply = (label, rate, hint) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, rate === null ? null : `=B${r}*${rate}`, { kind: rate === null ? "input" : "calc", nf: NF.money });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  V.std    = supply("Standard-rated supplies", "R_VAT", "5% output VAT");
  V.zero   = supply("Zero-rated supplies", 0, "Exports, certain services");
  V.exempt = supply("Exempt supplies", 0, "No output VAT and input VAT is not recoverable");
  V.rcm    = supply("Reverse charge — imports", "R_VAT", "Output and input in the same return");
  cell(ws, r, 1, "Total supplies", { kind: "label", bold: true });
  cell(ws, r, 2, `=SUM(B${V.std}:B${V.rcm})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 3, `=SUM(C${V.std}:C${V.rcm})`, { kind: "lock", nf: NF.money, bold: true });
  V.outputTotal = r; r += 2;

  r = section(ws, r, "Input VAT", 4);
  r = heads(ws, r, ["", "Amount", "VAT", "Note"], { align: ["left","right","right","left"] });
  V.purch = supply("Standard-rated purchases", "R_VAT", "");
  V.imp   = supply("Reverse charge — input side", "R_VAT", "Mirrors the output above");
  V.block = supply("Blocked input VAT", null, "Entertainment, certain motor vehicles — not recoverable");
  cell(ws, r, 1, "Recoverable input VAT", { kind: "label", bold: true });
  cell(ws, r, 3, `=C${V.purch}+C${V.imp}-N(C${V.block})`, { kind: "lock", nf: NF.money, bold: true });
  V.inputTotal = r; r += 2;

  r = section(ws, r, "Net", 4);
  cell(ws, r, 1, "VAT payable to the FTA", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=C${V.outputTotal}-C${V.inputTotal}`, { kind: "lock", nf: NF.money, bold: true });
  V.net = r; r++;
  cell(ws, r, 1, "Filing period", { kind: "label", indent: 1 });
  cell(ws, r, 2, null, { kind: "input" });
  V.period = r; r++;
  cell(ws, r, 1, "Due date", { kind: "label", indent: 1 });
  cell(ws, r, 2, null, { kind: "input", nf: NF.date });
  V.due = r; r++;
  cell(ws, r, 1, "Set aside for this", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=MAX(0,B${V.net})`, { kind: "lock", nf: NF.money, bold: true });
  r++;
  r = note(ws, r, "Cash that is already owed to the FTA is not cash available to spend. This figure is why a client with money in the bank can still be short.", 4);

  r = section(ws, r, "Allocation by emirate", 4);
  r = note(ws, r, "Standard-rated supplies are reported by the emirate of the fixed establishment making them. Putting the lot under one emirate is among the commonest errors on the return, and it is the one the FTA can see from the outside.", 4);
  r = heads(ws, r, ["Emirate", "Standard-rated supplies", "Output VAT", "Note"],
            { align: ["left","right","right","left"] });
  const eFirst = r;
  for (const em of ["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"]) {
    cell(ws, r, 1, em, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, `=N(B${r})*R_VAT`, { nf: NF.money });
    cell(ws, r, 4, null, { kind: "input" });
    r++;
  }
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 2, `=SUM(B${eFirst}:B${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 3, `=SUM(C${eFirst}:C${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  const emTotal = r; r++;
  cell(ws, r, 1, "Against standard-rated supplies above", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=B${emTotal}-B${V.std}`, { kind: "lock", nf: NF.money, bold: true });
  const emDiff = r;
  ws.addConditionalFormatting({ ref: `B${emDiff}`, rules: [
    { type:"cellIs", operator:"notEqual", formulae:["0"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
  ]});
  wb.definedNames.add(`'UAE VAT'!$A$${eFirst}:$D$${emTotal - 1}`, "EmirateTable");
  wb.definedNames.add(`'UAE VAT'!$B$${emDiff}`, "VAT_EmirateDiff");

  cell(ws, V.std, 2, `=PL_Revenue`, { kind: "link", nf: NF.money });
  wb.definedNames.add(`'UAE VAT'!$C$${V.outputTotal}`, "VAT_Output");
  wb.definedNames.add(`'UAE VAT'!$C$${V.inputTotal}`,  "VAT_Input");
  wb.definedNames.add(`'UAE VAT'!$B$${V.net}`,         "VAT_Payable");
  wb.definedNames.add(`'UAE VAT'!$B$${V.period}`,      "VAT_Period");
  wb.definedNames.add(`'UAE VAT'!$B$${V.due}`,         "VAT_Due");
  return ws;
}

export function uaeCT(wb) {
  const ws = sheet(wb, "UAE Corporate Tax", { tab: T.tabTax, widths: [46, 20, 20, 50], freeze: "B6" });
  let r = title(ws, "Corporate tax computation",
    "Accounting profit to taxable income, then the reliefs. Rates and bands come from Assumptions.", 4);
  r++;
  r = section(ws, r, "Taxable income", 4);
  r = heads(ws, r, ["", "Amount", "", "Note"], { align: ["left","right","right","left"] });
  const C2 = {};
  const line = (label, f, hint, input = false) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, input ? null : `=${f}`, { kind: input ? "input" : (f?.startsWith("PL_") ? "link" : "calc"), nf: NF.money });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  C2.rev    = line("Revenue", "PL_Revenue", "");
  C2.profit = line("Accounting profit before tax", "PL_PAT+PL_Tax", "");
  r = section(ws, r, "Add back", 4);
  C2.ent    = line("Entertainment — disallowed portion", null, "50% of entertainment expenditure", true);
  C2.fines  = line("Fines and penalties", null, "", true);
  C2.donate = line("Donations to non-approved bodies", null, "", true);
  C2.rptAdj = line("Related party adjustment", null, "Where pricing is not at arm's length", true);
  C2.other  = line("Other add-backs", null, "", true);
  r = section(ws, r, "Deduct", 4);
  C2.exempt = line("Exempt income", null, "Dividends, qualifying foreign PE", true);
  C2.loss   = line("Brought forward losses used", null, "Capped at 75% of taxable income", true);
  cell(ws, r, 1, "Taxable income", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=B${C2.profit}+SUM(B${C2.ent}:B${C2.other})-B${C2.exempt}-B${C2.loss}`,
       { kind: "lock", nf: NF.money, bold: true });
  C2.taxable = r; r += 2;

  r = section(ws, r, "Reliefs", 4);
  cell(ws, r, 1, "Small Business Relief — revenue within the cap?", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=IF(B${C2.rev}<=R_SBRCap,"Eligible","Not eligible")`, { bold: true });
  cell(ws, r, 4, "Revenue at or below the cap may elect SBR and pay nil", { size: 9 })
    .font = { size: 9, italic: true, color: { argb: T.muted } };
  C2.sbr = r; r++;
  cell(ws, r, 1, "Elected?", { kind: "label", indent: 1 });
  cell(ws, r, 2, "No", { kind: "input", align: "center" });
  dropdown(ws, `B${r}`, "=YesNo");
  C2.elected = r; r++;

  r++;
  r = section(ws, r, "The charge", 4);
  cell(ws, r, 1, "Income above the nil band", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=MAX(0,B${C2.taxable}-R_NilBand)`, { nf: NF.money });
  C2.above = r; r++;
  cell(ws, r, 1, "Corporate tax", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=IF(AND(B${C2.sbr}="Eligible",B${C2.elected}="Yes"),0,B${C2.above}*R_CT)`,
       { kind: "lock", nf: NF.money, bold: true });
  C2.charge = r; r++;
  cell(ws, r, 1, "Effective rate", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=IF(B${C2.taxable}<=0,"",B${C2.charge}/B${C2.taxable})`, { nf: NF.pct });
  r++;
  cell(ws, r, 1, "Basis", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=IF(AND(B${C2.sbr}="Eligible",B${C2.elected}="Yes"),"Small Business Relief elected","9% above the nil band")`,
       { align: "left" });
  C2.basis = r; r += 2;

  // ── Watching the threshold rather than discovering it ──
  // An owner near the cap finds out at year end, by which point the election
  // is gone. Revenue to date against the cap, with the run rate, says it in
  // month three instead.
  r = section(ws, r, "Small Business Relief — watching the threshold", 4);
  const sbrLine = (label, f, hint, input = false, nf = NF.money) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, input ? null : `=${f}`, { kind: input ? "input" : "calc", nf });
    cell(ws, r, 4, hint, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  const ytd    = sbrLine("Revenue so far this tax period", null, "Year to date, not just this month", true);
  const months = sbrLine("Months elapsed", null, "Of the tax period", true, NF.num);
  const run    = sbrLine("Full-year run rate", `IF(N(B${months})=0,"",B${ytd}/B${months}*12)`,
                         "What this year lands at if nothing changes", false);
  const head   = sbrLine("Headroom against the cap", `R_SBRCap-B${ytd}`, "Revenue left before the relief is gone");
  const when   = sbrLine("Crosses the cap in month",
    `IF(OR(N(B${months})=0,B${run}<=R_SBRCap),"",ROUNDUP(R_SBRCap/(B${ytd}/B${months}),0))`,
    "On the current run rate", false, NF.num);
  cell(ws, r, 1, "Position", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=IF(B${ytd}="","",IF(B${ytd}>R_SBRCap,"Cap already crossed — the relief is gone for this period",` +
                 `IF(N(B${run})>R_SBRCap,"On course to cross the cap — plan for 9% now","Within the cap")))`,
       { bold: true });
  const sbrPos = r;
  ws.addConditionalFormatting({ ref: `B${sbrPos}`, rules: [
    { type:"containsText", operator:"containsText", text:"already crossed", priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    { type:"containsText", operator:"containsText", text:"On course", priority:2,
      style:{ font:{ color:{ argb:T.warn }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.warnFill } } } },
    { type:"containsText", operator:"containsText", text:"Within", priority:3,
      style:{ font:{ color:{ argb:T.good }, bold:true } } },
  ]});
  r++;
  cell(ws, r, 1, "Relief available until", { kind: "label", indent: 1 });
  cell(ws, r, 2, "=R_SBRUntil", { kind: "link", nf: NF.date });
  cell(ws, r, 4, "Set on Assumptions from the decision itself. Summaries of this date disagree with each other.",
       { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
  r += 2;

  // ── Provision, so the year end is not a surprise ──
  r = section(ws, r, "Monthly provision", 4);
  r = note(ws, r, "Carrying the charge month by month is the difference between a client who has the cash in March and one who does not.", 4);
  const chargeYr = sbrLine("Expected charge for the full year", `B${C2.charge}`, "", false);
  const accrued  = sbrLine("Provided so far", null, "What is already in the books", true);
  const thisMo   = sbrLine("To provide this month",
    `IF(N(B${months})=0,"",MAX(0,B${chargeYr}*N(B${months})/12-N(B${accrued})))`, "", false);
  cell(ws, r, 1, "Set aside for tax", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=MAX(0,B${chargeYr}-N(B${accrued}))`, { kind: "lock", nf: NF.money, bold: true });
  const setAside = r;

  wb.definedNames.add(`'UAE Corporate Tax'!$B$${ytd}`,      "CT_RevYTD");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${head}`,     "CT_SBRHeadroom");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${sbrPos}`,   "CT_SBRPosition");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${thisMo}`,   "CT_Provision");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${setAside}`, "CT_SetAside");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${C2.rev}`,     "CT_Revenue");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${C2.taxable}`, "CT_Taxable");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${C2.charge}`,  "CT_Charge");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${C2.sbr}`,     "CT_SBR");
  wb.definedNames.add(`'UAE Corporate Tax'!$B$${C2.basis}`,   "CT_Basis");
  return ws;
}

export function uaeQfzp(wb) {
  const ws = sheet(wb, "UAE QFZP", { tab: T.tabTax, widths: [48, 20, 16, 50], freeze: "B6" });
  let r = title(ws, "Qualifying Free Zone Person",
    "Losing this status is retrospective and expensive. The de minimis test is the lower of the two limits.", 4);
  r++;
  r = section(ws, r, "Revenue split", 4);
  r = heads(ws, r, ["", "Amount", "% of revenue", "Note"], { align: ["left","right","right","left"] });
  const Q = {};
  const line = (label, f, hint, input = false) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, input ? null : `=${f}`, { kind: input ? "input" : "calc", nf: NF.money });
    cell(ws, r, 3, `=IF(CT_Revenue=0,"",B${r}/CT_Revenue)`, { nf: NF.pct });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  Q.qual = line("Qualifying income", null, "Free zone to free zone, and qualifying activities", true);
  Q.non  = line("Non-qualifying income", null, "Mainland UAE customers, and excluded activities", true);
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 2, `=B${Q.qual}+B${Q.non}`, { kind: "lock", nf: NF.money, bold: true });
  Q.total = r; r += 2;

  r = section(ws, r, "De minimis test", 4);
  cell(ws, r, 1, "Limit — percentage of revenue", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=CT_Revenue*R_DeMinPct`, { nf: NF.money });
  Q.limPct = r; r++;
  cell(ws, r, 1, "Limit — absolute", { kind: "label", indent: 1 });
  cell(ws, r, 2, "=R_DeMinAbs", { kind: "link", nf: NF.money });
  Q.limAbs = r; r++;
  cell(ws, r, 1, "The limit that applies", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=MIN(B${Q.limPct},B${Q.limAbs})`, { kind: "lock", nf: NF.money, bold: true });
  Q.limit = r; r++;
  cell(ws, r, 1, "Headroom before status is lost", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=B${Q.limit}-B${Q.non}`, { kind: "lock", nf: NF.money, bold: true });
  Q.head = r; r++;
  cell(ws, r, 1, "Status", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=IF(B${Q.head}>=0,"Within the limit","BREACHED — 9% applies to all income")`, { bold: true });
  Q.status = r;
  ws.addConditionalFormatting({ ref: `B${Q.status}`, rules: [
    { type:"containsText", operator:"containsText", text:"BREACHED", priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    { type:"containsText", operator:"containsText", text:"Within", priority:2,
      style:{ font:{ color:{ argb:T.good }, bold:true } } },
  ]});
  ws.addConditionalFormatting({ ref: `B${Q.head}`, rules: [
    { type:"cellIs", operator:"lessThan", formulae:["0"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true } } },
  ]});
  r += 2;

  r = section(ws, r, "Substance", 4);
  r = heads(ws, r, ["Requirement", "Position", "Met?", "Note"], { align: ["left","right","center","left"] });
  const sFirst = r;
  for (const [label, hint] of [
    ["Core income-generating activity in the free zone", "The activity itself, not just the licence"],
    ["Adequate full-time employees", ""],
    ["Adequate operating expenditure in the zone", ""],
    ["Adequate physical premises", "Square feet, and a lease in the entity's name"],
    ["Audited financial statements prepared", "Required to keep the status"],
    ["Transfer pricing documentation maintained", ""],
  ]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input" });
    cell(ws, r, 3, null, { kind: "input", align: "center" });
    dropdown(ws, `C${r}`, "=YesNo");
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  cell(ws, r, 1, "Substance score", { kind: "label", bold: true });
  cell(ws, r, 3, `=ROUND(COUNTIF(C${sFirst}:C${r - 1},"Yes")/6*100,0)`, { kind: "lock", bold: true });
  const score = r;
  wb.definedNames.add(`'UAE QFZP'!$B$${Q.qual}`,  "QF_Qual");
  wb.definedNames.add(`'UAE QFZP'!$B$${Q.non}`,   "QF_NonQual");
  wb.definedNames.add(`'UAE QFZP'!$B$${Q.limit}`, "QF_Limit");
  wb.definedNames.add(`'UAE QFZP'!$B$${Q.head}`,  "QF_Headroom");
  wb.definedNames.add(`'UAE QFZP'!$B$${Q.status}`,"QF_Status");
  wb.definedNames.add(`'UAE QFZP'!$C$${score}`,   "QF_Score");
  return ws;
}

export function uaeRpt(wb) {
  const ws = sheet(wb, "UAE Related Party", { tab: T.tabTax,
    widths: [28, 18, 20, 22, 18, 18, 20, 12, 36], freeze: "B7" });
  let r = title(ws, "Related parties and connected persons",
    "Whether a price is at arm's length is a determination, not a number. Nothing can fill this for you.", 9);
  r++;
  r = section(ws, r, "Related party transactions — Art. 34 and 35", 9);
  r = heads(ws, r, ["Entity","Jurisdiction","Relationship","Nature","Amount",
                    "TP method","Market range","Arm's length?","Action"],
            { align: ["left","left","left","left","right","left","left","center","left"] });
  const rFirst = r;
  for (let i = 0; i < 15; i++) {
    for (let c = 1; c <= 9; c++) {
      cell(ws, r, c, null, { kind: "input", nf: c === 5 ? NF.money : undefined, align: c === 8 ? "center" : undefined });
    }
    dropdown(ws, `H${r}`, "=YesNo");
    r++;
  }
  cell(ws, r, 4, "Total", { kind: "label", bold: true });
  cell(ws, r, 5, `=SUM(E${rFirst}:E${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  r += 2;

  r = section(ws, r, "Connected persons — Art. 36", 9);
  r = note(ws, r, "Owners, directors and their relatives. Payments to them are deductible only so far as they are at market value for a genuine business purpose.", 9);
  r = heads(ws, r, ["Name","Role","Art. 36(2) ref","Payment type","Total paid",
                    "Market range","Business purpose?","Arm's length?","Action"],
            { align: ["left","left","left","left","right","left","center","center","left"] });
  const cFirst = r;
  for (let i = 0; i < 12; i++) {
    for (let c = 1; c <= 9; c++) {
      cell(ws, r, c, null, { kind: "input", nf: c === 5 ? NF.money : undefined,
                             align: (c === 7 || c === 8) ? "center" : undefined });
    }
    dropdown(ws, `G${r}`, "=YesNo");
    dropdown(ws, `H${r}`, "=YesNo");
    r++;
  }
  cell(ws, r, 4, "Total", { kind: "label", bold: true });
  cell(ws, r, 5, `=SUM(E${cFirst}:E${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  r += 2;
  cell(ws, r, 1, "Transactions tested", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=COUNTA(A${rFirst}:A${rFirst + 14})+COUNTA(A${cFirst}:A${cFirst + 11})`, { kind: "lock", bold: true });
  const tested = r; r++;
  cell(ws, r, 1, "Within range", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=COUNTIF(H${rFirst}:H${rFirst + 14},"Yes")+COUNTIF(H${cFirst}:H${cFirst + 11},"Yes")`,
       { kind: "lock", bold: true });
  const within = r;
  wb.definedNames.add(`'UAE Related Party'!$A$${rFirst}:$I$${rFirst + 14}`, "RPTTable");
  wb.definedNames.add(`'UAE Related Party'!$A$${cFirst}:$I$${cFirst + 11}`, "CPTable");
  wb.definedNames.add(`'UAE Related Party'!$B$${tested}`, "RPT_Tested");
  wb.definedNames.add(`'UAE Related Party'!$B$${within}`, "RPT_Within");
  return ws;
}

export function uaeRevRecon(wb) {
  const ws = sheet(wb, "UAE Rev Recon", { tab: T.tabTax, widths: [42, 20, 20, 20, 50], freeze: "B6" });
  let r = title(ws, "Revenue — IFRS to VAT",
    "The two rarely agree, and the auditor will ask why. The reconciling items are a judgement about timing.", 5);
  r++;
  r = heads(ws, r, ["Description","IFRS revenue","VAT revenue","Difference","Explanation"],
            { align: ["left","right","right","right","left"] });
  const first = r;
  const seed = [
    ["Standard-rated sales", "", "Identical in both unless timing differs"],
    ["Advances received", "", "VAT point on receipt; IFRS deferred until delivery"],
    ["Revenue recognised over time", "", "IFRS 15 over time; VAT on invoice"],
    ["Credit notes", "", ""],
    ["Zero-rated exports", "", ""],
    ["Out-of-scope income", "", ""],
  ];
  for (const [desc, , hint] of seed) {
    cell(ws, r, 1, desc, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input", nf: NF.money });
    cell(ws, r, 4, `=IF(AND(B${r}="",C${r}=""),"",N(B${r})-N(C${r}))`, { nf: NF.money });
    cell(ws, r, 5, hint, { kind: "input" });
    r++;
  }
  for (let i = 0; i < 8; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input", nf: NF.money });
    cell(ws, r, 4, `=IF(AND(B${r}="",C${r}=""),"",N(B${r})-N(C${r}))`, { nf: NF.money });
    cell(ws, r, 5, null, { kind: "input" });
    r++;
  }
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 2, `=SUM(B${first}:B${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 3, `=SUM(C${first}:C${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 4, `=B${r}-C${r}`, { kind: "lock", nf: NF.money, bold: true });
  const totalRow = r; r += 2;
  cell(ws, r, 1, "Revenue per the P&L", { kind: "label", indent: 1 });
  cell(ws, r, 2, "=PL_Revenue", { kind: "link", nf: NF.money });
  r++;
  cell(ws, r, 1, "Unexplained difference", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=B${totalRow}-PL_Revenue`, { kind: "lock", nf: NF.money, bold: true });
  wb.definedNames.add(`'UAE Rev Recon'!$B$${r}`, "RR_Unexplained");
  wb.definedNames.add(`'UAE Rev Recon'!$A$${first}:$E$${totalRow - 1}`, "RevReconTable");
  wb.definedNames.add(`'UAE Rev Recon'!$D$${totalRow}`, "RR_Diff");
  return ws;
}

export function indiaTax(wb) {
  const ws = sheet(wb, "India Tax", { tab: T.tabTax, widths: [40, 18, 18, 18, 18, 46], freeze: "B6" });
  let r = title(ws, "India — GST, TDS and the 45-day rule",
    "Switch to this sheet for an India client. UAE sheets stay blank and vice versa.", 6);
  r++;

  r = section(ws, r, "GST reconciliation", 6);
  r = heads(ws, r, ["", "Per books", "Per GSTR-1", "Per GSTR-3B", "Difference", "Explanation"],
            { align: ["left","right","right","right","right","left"] });
  const gFirst = r;
  for (const label of ["Outward supplies — taxable value","Output tax","Inward supplies","Input tax credit claimed"]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input", nf: NF.money });
    cell(ws, r, 4, null, { kind: "input", nf: NF.money });
    cell(ws, r, 5, `=IF(COUNT(B${r}:D${r})=0,"",MAX(B${r}:D${r})-MIN(B${r}:D${r}))`, { nf: NF.money });
    cell(ws, r, 6, null, { kind: "input" });
    r++;
  }
  r++;
  cell(ws, r, 1, "ITC per 2B not claimed", { kind: "label", indent: 1 });
  cell(ws, r, 2, null, { kind: "input", nf: NF.money });
  cell(ws, r, 6, "Supplier has filed but the credit has not been taken — this is cash", { size: 9 })
    .font = { size: 9, italic: true, color: { argb: T.muted } };
  r++;
  cell(ws, r, 1, "ITC claimed but not in 2B", { kind: "label", indent: 1 });
  cell(ws, r, 2, null, { kind: "input", nf: NF.money });
  cell(ws, r, 6, "Supplier has not filed — at risk of reversal with interest", { size: 9 })
    .font = { size: 9, italic: true, color: { argb: T.muted } };
  r += 2;

  r = section(ws, r, "TDS", 6);
  r = heads(ws, r, ["Section","Base amount","Rate","Deducted","Deposited","Due date"],
            { align: ["left","right","right","right","right","left"] });
  const tFirst = r;
  for (const sec of ["194C — contractors","194J — professional","194I — rent","194Q — purchase of goods","192 — salary",""]) {
    cell(ws, r, 1, sec, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input", nf: NF.pct });
    cell(ws, r, 4, `=IF(COUNT(B${r}:C${r})<2,"",B${r}*C${r})`, { nf: NF.money });
    cell(ws, r, 5, null, { kind: "input", nf: NF.money });
    cell(ws, r, 6, null, { kind: "input", nf: NF.date });
    r++;
  }
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 4, `=SUM(D${tFirst}:D${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 5, `=SUM(E${tFirst}:E${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  r++;
  cell(ws, r, 1, "Deducted but not deposited", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=D${r - 1}-E${r - 1}`, { kind: "lock", nf: NF.money, bold: true });
  r += 2;

  r = section(ws, r, "Section 43B(h) — payments to MSME suppliers", 6);
  r = note(ws, r, "An amount owed to a registered MSME beyond the window is disallowed in the year it was incurred. It is a tax cost, not just a late payment.", 6);
  r = heads(ws, r, ["Supplier","MSME registered?","Invoice date","Due (45 days)","Days outstanding","At risk"],
            { align: ["left","center","left","left","right","right"] });
  const mFirst = r;
  for (let i = 0; i < 15; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", align: "center" });
    dropdown(ws, `B${r}`, "=YesNo");
    cell(ws, r, 3, null, { kind: "input", nf: NF.date });
    cell(ws, r, 4, `=IF(C${r}="","",C${r}+R_MSMEDays)`, { nf: NF.date });
    cell(ws, r, 5, `=IF(C${r}="","",MAX(0,Cl_PeriodEnd-C${r}))`, { nf: NF.num });
    cell(ws, r, 6, null, { kind: "input", nf: NF.money });
    r++;
  }
  cell(ws, r, 1, "Total at risk of disallowance", { kind: "label", bold: true });
  cell(ws, r, 6, `=SUMIFS(F${mFirst}:F${r - 1},B${mFirst}:B${r - 1},"Yes",E${mFirst}:E${r - 1},">"&R_MSMEDays)`,
       { kind: "lock", nf: NF.money, bold: true });
  const risk = r; r += 2;

  r = section(ws, r, "Advance tax", 6);
  r = heads(ws, r, ["Instalment","Due by","Cumulative %","Payable","Paid","Shortfall"],
            { align: ["left","left","right","right","right","right"] });
  const aFirst = r;
  for (const [q, due, pct] of [["First","15 June",0.15],["Second","15 September",0.45],
                               ["Third","15 December",0.75],["Fourth","15 March",1.00]]) {
    cell(ws, r, 1, q, { kind: "label", indent: 1 });
    cell(ws, r, 2, due, { kind: "label" });
    cell(ws, r, 3, pct, { kind: "calc", nf: NF.pct0 });
    cell(ws, r, 4, `=$B$${aFirst - 2}*C${r}`, { nf: NF.money });
    cell(ws, r, 5, null, { kind: "input", nf: NF.money });
    cell(ws, r, 6, `=MAX(0,D${r}-E${r})`, { nf: NF.money });
    r++;
  }
  wb.definedNames.add(`'India Tax'!$F$${risk}`, "IN_MSMERisk");
  wb.definedNames.add(`'India Tax'!$A$${mFirst}:$F$${risk - 1}`, "MSMETable");
  return ws;
}
