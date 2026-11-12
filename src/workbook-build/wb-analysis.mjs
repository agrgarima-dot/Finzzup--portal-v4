// The analysis. This is where judgement goes — budgets, assumptions, scenarios
// and determinations, none of which are in the books.
import { T, NF, sheet, title, section, heads, cell, note, rag, dropdown } from "./wb-lib.mjs";

export function variance(wb) {
  const ws = sheet(wb, "Variance", { tab: T.tabAnal, widths: [32, 16, 16, 16, 12, 12, 54], freeze: "B6" });
  let r = title(ws, "Budget against actual", "The variance matters less than the sentence explaining it.", 7);
  r++;
  r = heads(ws, r, ["Line","Budget","Actual","Variance","Var %","Fav?","Why — this is the part the client reads"],
            { align: ["left","right","right","right","right","center","left"] });
  const lines = [["Revenue","PL_Revenue",1],["Cost of Sales","PL_COGS",-1],["Gross Profit","PL_GP",1],
                 ["Operating Expenses","PL_Opex",-1],["EBITDA","PL_EBITDA",1],
                 ["Depreciation","PL_Dep",-1],["Finance Cost","PL_Fin",-1],["Net Profit","PL_PAT",1]];
  const first = r;
  for (const [label, ref, sign] of lines) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=IFERROR(INDEX(Budget,MATCH("${label}",INDEX(Budget,0,1),0),2),0)`, { kind: "link", nf: NF.money });
    cell(ws, r, 3, `=${ref}`, { kind: "link", nf: NF.money });
    cell(ws, r, 4, `=C${r}-B${r}`, { nf: NF.money });
    cell(ws, r, 5, `=IF(B${r}=0,"",(C${r}-B${r})/ABS(B${r}))`, { nf: NF.pct });
    cell(ws, r, 6, `=IF(B${r}=0,"",IF(D${r}*${sign}>=0,"Fav","Adv"))`, { align: "center", bold: true });
    cell(ws, r, 7, null, { kind: "input", wrap: true });
    ws.addConditionalFormatting({ ref: `F${r}`, rules: [
      { type:"cellIs", operator:"equal", formulae:['"Fav"'], priority:1, style:{ font:{ color:{ argb:T.good }, bold:true } } },
      { type:"cellIs", operator:"equal", formulae:['"Adv"'], priority:2, style:{ font:{ color:{ argb:T.bad }, bold:true } } },
    ]});
    r++;
  }
  r++;
  cell(ws, r, 1, "Commentary for the client", { kind: "label", bold: true });
  r++;
  ws.mergeCells(r, 1, r + 3, 7);
  cell(ws, r, 1, null, { kind: "input", wrap: true });
  ws.getRow(r).height = 60;
  wb.definedNames.add(`Variance!$A$${first}:$G$${first + lines.length - 1}`, "VarianceTable");
  wb.definedNames.add(`Variance!$A$${r}`, "VarianceNote");
  return ws;
}

export function vertical(wb) {
  const ws = sheet(wb, "Vertical", { tab: T.tabAnal, widths: [32, 18, 14, 18, 14, 50], freeze: "B6" });
  let r = title(ws, "Vertical analysis", "Every line as a share of revenue. Where the shape of the business shows.", 6);
  r++;
  r = heads(ws, r, ["Line","Current","% of revenue","Prior","% of revenue","Movement"],
            { align: ["left","right","right","right","right","left"] });
  const first = r;
  for (const [label, ref] of [["Revenue","PL_Revenue"],["Cost of Sales","PL_COGS"],["Gross Profit","PL_GP"],
                              ["Operating Expenses","PL_Opex"],["EBITDA","PL_EBITDA"],
                              ["Depreciation","PL_Dep"],["Finance Cost","PL_Fin"],
                              ["Tax","PL_Tax"],["Net Profit","PL_PAT"]]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=${ref}`, { kind: "link", nf: NF.money });
    cell(ws, r, 3, `=IF(PL_Revenue=0,"",B${r}/PL_Revenue)`, { nf: NF.pct });
    cell(ws, r, 4, null, { kind: "input", nf: NF.money });
    cell(ws, r, 5, `=IF(D$${first}=0,"",D${r}/D$${first})`, { nf: NF.pct });
    cell(ws, r, 6, `=IF(OR(C${r}="",E${r}=""),"",C${r}-E${r})`, { nf: NF.pct });
    r++;
  }
  wb.definedNames.add(`Vertical!$A$${first}:$F$${r - 1}`, "VerticalTable");
  return ws;
}

export function trend(wb) {
  const ws = sheet(wb, "Trend", { tab: T.tabAnal,
    widths: [26, ...Array(12).fill(13), 15], freeze: "B6" });
  let r = title(ws, "Twelve months", "Type each month as it closes. A trend answers questions a single month cannot.", 14);
  r++;
  const months = ["M-11","M-10","M-9","M-8","M-7","M-6","M-5","M-4","M-3","M-2","M-1","Current"];
  r = heads(ws, r, ["", ...months, "Trend"], { align: ["left", ...Array(12).fill("right"), "left"] });
  const first = r;
  for (const label of ["Revenue","Gross Profit","Gross margin %","EBITDA","Net Profit",
                       "Cash balance","Receivables","Payables","DSO","Headcount"]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    for (let c = 2; c <= 13; c++) {
      cell(ws, r, c, null, { kind: "input", nf: label.includes("%") ? NF.pct : NF.money });
    }
    cell(ws, r, 14, `=IF(OR(B${r}="",M${r}=""),"",IF(M${r}>B${r},"▲","▼"))`, { align: "center", bold: true });
    r++;
  }
  note(ws, r + 1, "Twelve typed columns rather than twelve linked files. One paste a month, and the client gets a chart that means something.", 14);
  wb.definedNames.add(`Trend!$A$${first}:$N$${r - 1}`, "TrendTable");
  return ws;
}

export function scenarios(wb) {
  const ws = sheet(wb, "Scenarios", { tab: T.tabAnal, widths: [30, 18, 18, 18, 52], freeze: "B6" });
  let r = title(ws, "Scenarios", "Assumptions are a judgement. Nothing in the books implies them.", 5);
  r++;
  r = section(ws, r, "Drivers", 5);
  r = heads(ws, r, ["", "Base", "Downside", "Upside", "What you are assuming"],
            { align: ["left","right","right","right","left"] });
  const dFirst = r;
  for (const [label, base] of [["Revenue change %", 0], ["Cost change %", 0],
                               ["Collection days change", 0], ["Capex", 0]]) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, base, { kind: "input", nf: label.includes("%") ? NF.pct : NF.num });
    cell(ws, r, 3, null, { kind: "input", nf: label.includes("%") ? NF.pct : NF.num });
    cell(ws, r, 4, null, { kind: "input", nf: label.includes("%") ? NF.pct : NF.num });
    cell(ws, r, 5, null, { kind: "input", wrap: true });
    r++;
  }

  wb.definedNames.add(`Scenarios!$B$${dFirst}:$D$${dFirst + 3}`, "SC_Drivers");
  r++;
  r = section(ws, r, "What it does", 5);
  r = heads(ws, r, ["", "Base", "Downside", "Upside", ""], { align: ["left","right","right","right","left"] });
  const out = (label, f) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    ["B","C","D"].forEach((col, i) => cell(ws, r, 2 + i, `=${f(col)}`, { nf: NF.money }));
    const at = r; r++; return at;
  };
  const rev = out("Revenue",  (c) => `PL_Revenue*(1+N(${c}${dFirst}))`);
  const cost= out("Cost base",(c) => `(PL_COGS+PL_Opex)*(1+N(${c}${dFirst + 1}))`);
  const eb  = out("EBITDA",   (c) => `${c}${rev}-${c}${cost}`);
  cell(ws, r, 1, "EBITDA margin", { kind: "label", indent: 1 });
  ["B","C","D"].forEach((c, i) => cell(ws, r, 2 + i, `=IF(${c}${rev}=0,"",${c}${eb}/${c}${rev})`, { nf: NF.pct }));
  r++;
  const cash = out("Cash impact of collection change",
    (c) => `IF(Cl_Days=0,0,-${c}${rev}/Cl_Days*N(${c}${dFirst + 2}))`);
  cell(ws, r, 1, "Closing cash", { kind: "label", indent: 1, bold: true });
  ["B","C","D"].forEach((c, i) =>
    cell(ws, r, 2 + i, `=BS_Cash+${c}${eb}-PL_EBITDA+${c}${cash}-N(${c}${dFirst + 3})`,
         { kind: "lock", nf: NF.money, bold: true }));
  const close = r; r++;
  cell(ws, r, 1, "Months of cover", { kind: "label", indent: 1 });
  ["B","C","D"].forEach((c, i) =>
    cell(ws, r, 2 + i, `=IF(PL_Opex<=0,"",${c}${close}/(PL_Opex/3))`, { nf: NF.ratio }));
  r++;

  r++;
  cell(ws, r, 1, "Your note on the scenarios", { kind: "label", bold: true }); r++;
  ws.mergeCells(r, 1, r + 3, 5);
  cell(ws, r, 1, null, { kind: "input", wrap: true });
  ws.getRow(r).height = 60;
  wb.definedNames.add(`Scenarios!$A$${r}`, "ScenarioNote");
  wb.definedNames.add(`Scenarios!$B$${close}`, "SC_BaseCash");
  return ws;
}

export function cash13(wb) {
  const ws = sheet(wb, "13-Week Cash", { tab: T.tabAnal,
    widths: [26, ...Array(13).fill(12)], freeze: "B7" });
  let r = title(ws, "Thirteen weeks",
    "The only forecast that matters when cash is tight. Weekly, not monthly — a month-end average hides the week you cannot make payroll.", 14);
  r++;
  r = heads(ws, r, ["", ...Array.from({ length: 13 }, (_, i) => `W${i + 1}`)],
            { align: ["left", ...Array(13).fill("right")] });
  const rows = [
    ["Opening cash", true],
    ["Receipts — from the ageing", false],
    ["Receipts — new sales", false],
    ["Receipts — other", false],
    ["Total receipts", true],
    ["Payments — suppliers", false],
    ["Payments — payroll", false],
    ["Payments — rent and overhead", false],
    ["Payments — tax and statutory", false],
    ["Payments — loan repayment", false],
    ["Payments — capex", false],
    ["Total payments", true],
    ["Net movement", true],
    ["Closing cash", true],
    ["Minimum buffer", true],
    ["Headroom", true],
  ];
  const first = r;
  rows.forEach(([label], i) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1, bold: rows[i][1] });
    for (let c = 2; c <= 14; c++) {
      const col = String.fromCharCode(64 + c);
      let f = null;
      if (i === 0)  f = c === 2 ? `=BS_Cash` : `=${String.fromCharCode(63 + c)}${first + 13}`;
      if (i === 4)  f = `=SUM(${col}${first + 1}:${col}${first + 3})`;
      if (i === 11) f = `=SUM(${col}${first + 5}:${col}${first + 10})`;
      if (i === 12) f = `=${col}${first + 4}-${col}${first + 11}`;
      if (i === 13) f = `=${col}${first}+${col}${first + 12}`;
      if (i === 14) f = `=IFERROR(INDEX(Assumptions!$B:$B,MATCH("Minimum cash buffer",Assumptions!$A:$A,0)),0)`;
      if (i === 15) f = `=${col}${first + 13}-${col}${first + 14}`;
      cell(ws, r, c, f, { kind: f ? (i === 0 && c === 2 ? "link" : "calc") : "input", nf: NF.money,
                          bold: rows[i][1] });
    }
    r++;
  });
  ws.addConditionalFormatting({
    ref: `B${first + 15}:N${first + 15}`,
    rules: [{ type:"cellIs", operator:"lessThan", formulae:["0"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } }],
  });
  note(ws, r + 1, "Headroom going red is the week to talk about. Everything above it is arithmetic; that row is the reason the sheet exists.", 14);
  return ws;
}

export function unitEconomics(wb) {
  const ws = sheet(wb, "Unit Economics", { tab: T.tabAnal, widths: [34, 18, 18, 18, 52], freeze: "B6" });
  let r = title(ws, "Unit economics",
    "Switch this module off on the Cover for a client who does not sell subscriptions.", 5);
  r++;
  r = heads(ws, r, ["", "Current", "Prior", "Benchmark", "What it is telling you"],
            { align: ["left","right","right","right","left"] });
  const rows = [
    ["Customers at period start", NF.num, ""],
    ["New customers", NF.num, ""],
    ["Churned customers", NF.num, ""],
    ["Customers at period end", NF.num, "Start plus new less churned"],
    ["Gross churn, monthly", NF.pct, "Churned over opening. Above 3% a month and growth is a leaking bucket."],
    ["Net revenue retention", NF.pct, "Above 100% means the existing base grows without new sales."],
    ["MRR", NF.money, ""],
    ["ARR", NF.money, "MRR times twelve"],
    ["Sales and marketing spend", NF.money, ""],
    ["CAC", NF.money, "Spend over new customers"],
    ["Average revenue per customer", NF.money, ""],
    ["Gross margin per customer", NF.money, ""],
    ["Average customer life, months", NF.num, "One over monthly churn"],
    ["LTV", NF.money, "Gross margin per customer times life"],
    ["LTV : CAC", NF.ratio, "Under 3 and growth is being bought rather than earned"],
    ["CAC payback, months", NF.num, "Under 12 for most, under 18 for enterprise"],
    ["Monthly burn", NF.money, ""],
    ["Runway, months", NF.num, "Cash over burn"],
    ["Burn multiple", NF.ratio, "Burn over net new ARR. Under 1.5 is healthy"],
  ];
  const first = r;
  for (const [label, nf, meaning] of rows) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, null, { kind: "input", nf });
    cell(ws, r, 3, null, { kind: "input", nf });
    cell(ws, r, 4, null, { kind: "input", nf });
    cell(ws, r, 5, meaning, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  // The ones that genuinely follow from the others are formulas, not inputs.
  cell(ws, first + 3, 2, `=IF(B${first}="","",B${first}+B${first+1}-B${first+2})`, { nf: NF.num });
  cell(ws, first + 4, 2, `=IF(N(B${first})=0,"",N(B${first+2})/B${first})`, { nf: NF.pct });
  cell(ws, first + 7, 2, `=IF(B${first+6}="","",B${first+6}*12)`, { nf: NF.money });
  cell(ws, first + 9, 2, `=IF(OR(N(B${first+1})=0,N(B${first+8})=0),"",B${first+8}/B${first+1})`, { nf: NF.money });
  cell(ws, first + 12,2, `=IF(N(B${first+4})=0,"",1/B${first+4})`, { nf: NF.num });
  cell(ws, first + 13,2, `=IF(OR(N(B${first+11})=0,N(B${first+12})=0),"",B${first+11}*B${first+12})`, { nf: NF.money });
  cell(ws, first + 14,2, `=IF(OR(N(B${first+9})=0,N(B${first+13})=0),"",B${first+13}/B${first+9})`, { nf: NF.ratio });
  cell(ws, first + 15,2, `=IF(OR(N(B${first+11})=0,N(B${first+9})=0),"",B${first+9}/B${first+11})`, { nf: NF.num });
  cell(ws, first + 17,2, `=IF(N(B${first+16})=0,"",BS_Cash/B${first+16})`, { nf: NF.num });
  wb.definedNames.add(`'Unit Economics'!$B$${first + 7}`,  "UE_ARR");
  wb.definedNames.add(`'Unit Economics'!$B$${first + 9}`,  "UE_CAC");
  wb.definedNames.add(`'Unit Economics'!$B$${first + 13}`, "UE_LTV");
  wb.definedNames.add(`'Unit Economics'!$B$${first + 4}`,  "UE_Churn");
  wb.definedNames.add(`'Unit Economics'!$B$${first + 17}`, "UE_Runway");
  return ws;
}

export function concentration(wb) {
  const ws = sheet(wb, "Concentration", { tab: T.tabAnal, widths: [34, 18, 14, 14, 18, 44], freeze: "B7" });
  let r = title(ws, "Who the business depends on",
    "A customer at a fifth of revenue is not a customer, it is a risk with a purchase order.", 6);
  r++;
  r = section(ws, r, "Customers", 6);
  r = heads(ws, r, ["Customer","Revenue","% of total","Cumulative","Receivable","Note"],
            { align: ["left","right","right","right","right","left"] });
  const cFirst = r;
  for (let i = 0; i < 20; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, `=IF(SUM($B$${cFirst}:$B$${cFirst + 19})=0,"",B${r}/SUM($B$${cFirst}:$B$${cFirst + 19}))`, { nf: NF.pct });
    cell(ws, r, 4, `=IF(C${r}="","",SUM($C$${cFirst}:C${r}))`, { nf: NF.pct });
    cell(ws, r, 5, `=IF($A${r}="","",SUMIF(AR_Cust,$A${r},AR_Out))`, { kind: "link", nf: NF.money });
    cell(ws, r, 6, null, { kind: "input" });
    r++;
  }
  ws.addConditionalFormatting({ ref: `C${cFirst}:C${cFirst + 19}`, rules: [
    { type:"cellIs", operator:"greaterThan", formulae:["0.2"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
  ]});
  cell(ws, r, 1, "Largest customer", { kind: "label", bold: true });
  cell(ws, r, 3, `=IF(SUM($B$${cFirst}:$B$${cFirst + 19})=0,"",MAX($C$${cFirst}:$C$${cFirst + 19}))`,
       { kind: "lock", nf: NF.pct, bold: true });
  const top = r; r++;
  cell(ws, r, 1, "Top five", { kind: "label", bold: true });
  cell(ws, r, 3, `=IF(SUM($B$${cFirst}:$B$${cFirst + 19})=0,"",SUM(LARGE($C$${cFirst}:$C$${cFirst + 19},{1;2;3;4;5})))`,
       { kind: "lock", nf: NF.pct, bold: true });
  r += 2;

  r = section(ws, r, "Suppliers", 6);
  r = heads(ws, r, ["Supplier","Spend","% of total","Cumulative","Payable","Terms"],
            { align: ["left","right","right","right","right","left"] });
  const sFirst = r;
  for (let i = 0; i < 20; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, `=IF(SUM($B$${sFirst}:$B$${sFirst + 19})=0,"",B${r}/SUM($B$${sFirst}:$B$${sFirst + 19}))`, { nf: NF.pct });
    cell(ws, r, 4, `=IF(C${r}="","",SUM($C$${sFirst}:C${r}))`, { nf: NF.pct });
    cell(ws, r, 5, `=IF($A${r}="","",SUMIF(AP_Supp,$A${r},AP_Out))`, { kind: "link", nf: NF.money });
    cell(ws, r, 6, null, { kind: "input" });
    r++;
  }
  wb.definedNames.add(`Concentration!$C$${top}`, "CN_Largest");
  wb.definedNames.add(`Concentration!$A$${cFirst}:$F$${cFirst + 19}`, "CustomerTable");
  wb.definedNames.add(`Concentration!$A$${sFirst}:$F$${sFirst + 19}`, "SupplierTable");
  return ws;
}

export function treasury(wb) {
  const ws = sheet(wb, "Treasury", { tab: T.tabAnal, widths: [30, 18, 18, 12, 14, 14, 16, 36], freeze: "B7" });
  let r = title(ws, "Treasury",
    "Facility terms, rates and maturities are nowhere in the accounting records. They only exist here.", 8);
  r++;
  r = section(ws, r, "Deposits and facilities", 8);
  r = heads(ws, r, ["Institution","Type","Amount","Rate %","Start","Maturity","Interest to date","Action"],
            { align: ["left","left","right","right","left","left","right","left"] });
  const first = r;
  for (let i = 0; i < 20; i++) {
    cell(ws, r, 1, null, { kind: "input" });
    cell(ws, r, 2, null, { kind: "input" });
    cell(ws, r, 3, null, { kind: "input", nf: NF.money });
    cell(ws, r, 4, null, { kind: "input", nf: NF.pct });
    cell(ws, r, 5, null, { kind: "input", nf: NF.date });
    cell(ws, r, 6, null, { kind: "input", nf: NF.date });
    cell(ws, r, 7, `=IF(OR($C${r}="",$D${r}="",$E${r}=""),"",$C${r}*$D${r}*(Cl_PeriodEnd-$E${r})/365)`,
         { nf: NF.money });
    cell(ws, r, 8, null, { kind: "input" });
    r++;
  }
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 3, `=SUM(C${first}:C${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 7, `=SUM(G${first}:G${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  const totalRow = r; r += 2;

  r = section(ws, r, "Position", 8);
  const pos = (label, f, nf) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=${f}`, { kind: "lock", nf, bold: true });
    const at = r; r++; return at;
  };
  const cash  = pos("Total cash", "BS_Cash", NF.money);
  const inDep = pos("Held in deposits", `C${totalRow}`, NF.money);
  const pct   = pos("Share in deposits", `IF(B${cash}=0,"",B${inDep}/B${cash})`, NF.pct);
  const yld   = pos("Weighted yield",
    `IF(C${totalRow}=0,"",SUMPRODUCT(C${first}:C${r - 4},D${first}:D${r - 4})/C${totalRow})`, NF.pct);
  const next  = pos("Next maturity", `IFERROR(TEXT(MIN(F${first}:F${totalRow - 1}),"dd mmm yyyy"),"—")`, NF.text);
  wb.definedNames.add(`Treasury!$B$${cash}`,  "TR_Cash");
  wb.definedNames.add(`Treasury!$B$${pct}`,   "TR_Pct");
  wb.definedNames.add(`Treasury!$B$${yld}`,   "TR_Yield");
  wb.definedNames.add(`Treasury!$A$${first}:$H$${totalRow - 1}`, "DepositTable");
  return ws;
}
