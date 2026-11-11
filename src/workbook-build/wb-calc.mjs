// The statements. Nothing is typed on these sheets — every figure is a SUMIF
// over the mapped trial balance, so a new account lands in the right place
// without anyone writing a formula.
import { T, NF, sheet, title, section, heads, cell, note, rag } from "./wb-lib.mjs";

// Credit-side group (income, liabilities, equity) and debit-side group.
const cr = (g) => `SUMIF(TB_Group,"${g}",TB_Cr)-SUMIF(TB_Group,"${g}",TB_Dr)`;
const dr = (g) => `SUMIF(TB_Group,"${g}",TB_Dr)-SUMIF(TB_Group,"${g}",TB_Cr)`;

export function pnl(wb) {
  const ws = sheet(wb, "P&L", { tab: T.tabCalc, widths: [34, 18, 18, 18, 18, 14, 14], freeze: "B6" });
  let r = title(ws, "Profit and loss",
    "Built from the trial balance. The budget comes from Assumptions; prior period is typed in.", 7);
  r++;
  r = section(ws, r, "For the period", 7);
  r = heads(ws, r, ["", "Prior period", "Budget", "Actual", "Variance", "Var %", "% of revenue"],
            { align: ["left","right","right","right","right","right","right"] });

  const L = {};   // remember each line's row, so later sheets can point at it
  const line = (label, formula, { bold = false, budgetRow = null, pct = true } = {}) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1, bold });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, budgetRow ? `=IFERROR(INDEX(Budget,MATCH("${budgetRow}",INDEX(Budget,0,1),0),2),0)` : null,
         { kind: budgetRow ? "link" : "input", nf: NF.money });
    cell(ws, r, 4, `=${formula}`, { kind: "calc", nf: NF.money, bold });
    cell(ws, r, 5, `=IF(C${r}=0,"",D${r}-C${r})`, { nf: NF.money });
    cell(ws, r, 6, `=IF(C${r}=0,"",(D${r}-C${r})/ABS(C${r}))`, { nf: NF.pct });
    cell(ws, r, 7, pct ? `=IF($D$${L.rev || r}=0,"",D${r}/$D$${L.rev || r})` : null, { nf: NF.pct });
    const at = r; r++;
    return at;
  };

  L.rev = line("Revenue", cr("Revenue"), { bold: true, budgetRow: "Revenue" });
  L.cogs = line("Cost of Sales", dr("Cost of Sales"), { budgetRow: "Cost of Sales" });
  L.gp = line("Gross Profit", `D${L.rev}-D${L.cogs}`, { bold: true, budgetRow: "Gross Profit" });
  cell(ws, r, 1, "Gross margin", { kind: "label", indent: 2 });
  cell(ws, r, 4, `=IF(D${L.rev}=0,"",D${L.gp}/D${L.rev})`, { nf: NF.pct });
  L.gpPct = r; r++;

  r++;
  L.opex = line("Operating Expenses", dr("Operating Expenses"), { budgetRow: "Operating Expenses" });
  L.oth  = line("Other Income", cr("Other Income"));
  L.ebitda = line("EBITDA", `D${L.gp}-D${L.opex}+D${L.oth}`, { bold: true, budgetRow: "EBITDA" });
  cell(ws, r, 1, "EBITDA margin", { kind: "label", indent: 2 });
  cell(ws, r, 4, `=IF(D${L.rev}=0,"",D${L.ebitda}/D${L.rev})`, { nf: NF.pct });
  L.ebitdaPct = r; r++;

  r++;
  L.dep = line("Depreciation and amortisation", dr("Depreciation"), { budgetRow: "Depreciation" });
  L.ebit = line("EBIT", `D${L.ebitda}-D${L.dep}`, { bold: true });
  L.fin = line("Finance cost", dr("Finance Cost"), { budgetRow: "Finance Cost" });
  L.pbt = line("Profit before tax", `D${L.ebit}-D${L.fin}`, { bold: true });
  L.tax = line("Tax", dr("Tax"), { budgetRow: "Tax" });
  L.pat = line("Profit after tax", `D${L.pbt}-D${L.tax}`, { bold: true, budgetRow: "Net Profit" });
  cell(ws, r, 1, "Net margin", { kind: "label", indent: 2 });
  cell(ws, r, 4, `=IF(D${L.rev}=0,"",D${L.pat}/D${L.rev})`, { nf: NF.pct });
  L.patPct = r; r++;

  rag(ws, `F${L.rev}:F${L.pat}`, { good: 0, bad: -0.1 });

  for (const [name, key] of [["PL_Revenue","rev"],["PL_COGS","cogs"],["PL_GP","gp"],["PL_GPPct","gpPct"],
                             ["PL_Opex","opex"],["PL_EBITDA","ebitda"],["PL_EBITDAPct","ebitdaPct"],
                             ["PL_Dep","dep"],["PL_Fin","fin"],["PL_Tax","tax"],
                             ["PL_PAT","pat"],["PL_PATPct","patPct"]]) {
    wb.definedNames.add(`'P&L'!$D$${L[key]}`, name);
  }
  note(ws, r + 1, "Prior period is blue because it is typed in — last month's pack is the source. Everything in the Actual column is worked out here.", 7);
  return ws;
}

export function balanceSheet(wb) {
  const ws = sheet(wb, "Balance Sheet", { tab: T.tabCalc, widths: [40, 18, 18, 18], freeze: "B6" });
  let r = title(ws, "Balance sheet", "Built from the trial balance. It must balance; the Checks sheet says whether it does.", 4);
  r++;
  r = section(ws, r, "As at the period end", 4);
  r = heads(ws, r, ["", "Prior", "Current", ""], { align: ["left","right","right","left"] });

  const B = {};
  const line = (label, formula, { bold = false } = {}) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1, bold });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, `=${formula}`, { nf: NF.money, bold });
    const at = r; r++; return at;
  };

  r = section(ws, r, "Assets", 4);
  B.fa   = line("Fixed assets", dr("Fixed Assets"));
  B.inv  = line("Inventory", dr("Inventory"));
  B.ar   = line("Receivables", dr("Receivables"));
  B.cash = line("Cash and bank", dr("Cash and Bank"));
  B.oa   = line("Other assets", dr("Other Assets"));
  B.ta   = line("Total assets", `SUM(C${B.fa}:C${B.oa})`, { bold: true });

  r++;
  r = section(ws, r, "Liabilities", 4);
  B.ap   = line("Payables", cr("Payables"));
  B.ol   = line("Other liabilities", cr("Other Liabilities"));
  B.debt = line("Borrowings", cr("Borrowings"));
  B.tl   = line("Total liabilities", `SUM(C${B.ap}:C${B.debt})`, { bold: true });

  r++;
  r = section(ws, r, "Equity", 4);
  B.eq   = line("Share capital and reserves", cr("Equity"));
  B.ret  = line("Profit for the period", `PL_PAT`);
  B.te   = line("Total equity", `C${B.eq}+C${B.ret}`, { bold: true });

  r++;
  B.tle  = line("Total liabilities and equity", `C${B.tl}+C${B.te}`, { bold: true });
  cell(ws, r, 1, "Difference", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 3, `=C${B.ta}-C${B.tle}`, { kind: "lock", nf: NF.money, bold: true });
  const diff = r; r++;
  ws.addConditionalFormatting({ ref: `C${diff}`, rules: [
    { type:"cellIs", operator:"notEqual", formulae:["0"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
  ]});

  for (const [name, key] of [["BS_FA","fa"],["BS_Inv","inv"],["BS_AR","ar"],["BS_Cash","cash"],
                             ["BS_OA","oa"],["BS_TA","ta"],["BS_AP","ap"],["BS_OL","ol"],
                             ["BS_Debt","debt"],["BS_TL","tl"],["BS_Eq","te"],["BS_TLE","tle"]]) {
    wb.definedNames.add(`'Balance Sheet'!$C$${B[key]}`, name);
  }
  wb.definedNames.add(`'Balance Sheet'!$C$${diff}`, "BS_Diff");
  return ws;
}

export function cashFlow(wb) {
  const ws = sheet(wb, "Cash Flow", { tab: T.tabCalc, widths: [44, 18, 18], freeze: "B6" });
  let r = title(ws, "Cash flow", "Indirect method, from the movement between the two balance sheets.", 3);
  r++;
  r = heads(ws, r, ["", "Prior", "Current"], { align: ["left","right","right"] });

  const F = {};
  const line = (label, formula, { bold = false, input = false } = {}) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1, bold });
    cell(ws, r, 2, null, { kind: "input", nf: NF.money });
    cell(ws, r, 3, input ? null : `=${formula}`, { kind: input ? "input" : "calc", nf: NF.money, bold });
    const at = r; r++; return at;
  };

  r = section(ws, r, "Operating", 3);
  F.pat = line("Profit after tax", "PL_PAT");
  F.dep = line("Add back depreciation", "PL_Dep");
  F.fin = line("Add back finance cost", "PL_Fin");
  F.dAR = line("Movement in receivables", `'Balance Sheet'!B${0}`, { input: true });
  F.dIn = line("Movement in inventory", "", { input: true });
  F.dAP = line("Movement in payables", "", { input: true });
  F.ops = line("Cash from operations", `SUM(C${F.pat}:C${F.dAP})`, { bold: true });

  r++;
  r = section(ws, r, "Investing", 3);
  F.capex = line("Purchase of fixed assets", "", { input: true });
  F.other = line("Other investing", "", { input: true });
  F.inv   = line("Cash used in investing", `SUM(C${F.capex}:C${F.other})`, { bold: true });

  r++;
  r = section(ws, r, "Financing", 3);
  F.draw = line("Borrowings drawn", "", { input: true });
  F.repay= line("Borrowings repaid", "", { input: true });
  F.int  = line("Finance cost paid", "", { input: true });
  F.eqIn = line("Equity introduced", "", { input: true });
  F.fine = line("Cash from financing", `SUM(C${F.draw}:C${F.eqIn})`, { bold: true });

  r++;
  F.net  = line("Net movement in cash", `C${F.ops}+C${F.inv}+C${F.fine}`, { bold: true });
  F.open = line("Opening cash", "", { input: true });
  F.close= line("Closing cash", `C${F.net}+C${F.open}`, { bold: true });
  cell(ws, r, 1, "Cash on the balance sheet", { kind: "label", indent: 1 });
  cell(ws, r, 3, "=BS_Cash", { kind: "link", nf: NF.money });
  r++;
  cell(ws, r, 1, "Difference", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 3, `=C${F.close}-BS_Cash`, { kind: "lock", nf: NF.money, bold: true });
  const diff = r;
  ws.addConditionalFormatting({ ref: `C${diff}`, rules: [
    { type:"cellIs", operator:"notEqual", formulae:["0"], priority:1,
      style:{ font:{ color:{ argb:T.bad }, bold:true },
              fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
  ]});
  wb.definedNames.add(`'Cash Flow'!$C$${F.ops}`,   "CF_Ops");
  wb.definedNames.add(`'Cash Flow'!$C$${F.close}`, "CF_Close");
  wb.definedNames.add(`'Cash Flow'!$C$${diff}`,    "CF_Diff");
  note(ws, r + 2, "The movements are blue because a balance sheet movement is not always a cash movement — a receivable written off is not cash collected. Work them out and type them.", 3);
  return ws;
}

export function workingCapital(wb) {
  const ws = sheet(wb, "Working Capital", { tab: T.tabCalc, widths: [40, 18, 18, 18, 46], freeze: "B6" });
  let r = title(ws, "Working capital", "Where the cash is tied up, and what freeing it is worth.", 5);
  r++;
  r = section(ws, r, "Position", 5);
  r = heads(ws, r, ["", "Current", "Prior", "Movement", "Note"], { align: ["left","right","right","right","left"] });

  const W = {};
  const line = (label, formula) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=${formula}`, { kind: "link", nf: NF.money });
    cell(ws, r, 3, null, { kind: "input", nf: NF.money });
    cell(ws, r, 4, `=B${r}-C${r}`, { nf: NF.money });
    cell(ws, r, 5, null, { kind: "input" });
    const at = r; r++; return at;
  };
  W.ar = line("Receivables", "BS_AR");
  W.inv= line("Inventory", "BS_Inv");
  W.ap = line("Payables", "BS_AP");
  W.wc = line("Working capital", `B${W.ar}+B${W.inv}-B${W.ap}`);

  r++;
  r = section(ws, r, "Days — these need the days in the period, set on the Cover", 5);
  r = heads(ws, r, ["", "Current", "Prior", "Target", "Note"], { align: ["left","right","right","right","left"] });
  const day = (label, formula, target) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=IF(OR(Cl_Days=0,${formula.split("/")[1]}=0),"",${formula})`, { nf: NF.num });
    cell(ws, r, 3, null, { kind: "input", nf: NF.num });
    cell(ws, r, 4, target ? `=${target}` : null, { kind: "link", nf: NF.num });
    cell(ws, r, 5, null, { kind: "input" });
    const at = r; r++; return at;
  };
  W.dso = day("DSO — collection", "BS_AR/PL_Revenue*Cl_Days");
  W.dio = day("DIO — inventory held", "BS_Inv/PL_COGS*Cl_Days");
  W.dpo = day("DPO — supplier payment", "BS_AP/PL_COGS*Cl_Days");
  cell(ws, r, 1, "Cash conversion cycle", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, `=IF(OR(B${W.dso}="",B${W.dpo}=""),"",B${W.dso}+N(B${W.dio})-B${W.dpo})`,
       { kind: "lock", nf: NF.num, bold: true });
  W.ccc = r; r++;

  r++;
  r = section(ws, r, "What a shorter cycle is worth", 5);
  cell(ws, r, 1, "Cash released if the cycle shortens by 5 days", { kind: "label", indent: 1 });
  cell(ws, r, 2, `=IF(Cl_Days=0,"",PL_Revenue/Cl_Days*5)`, { kind: "lock", nf: NF.money, bold: true });
  W.release = r; r++;
  r = note(ws, r, "Revenue per day times the days saved. It is the figure worth putting in front of a client who thinks collection is an admin problem.", 5);

  r++;
  r = section(ws, r, "Ageing — straight off the open items", 5);
  r = heads(ws, r, ["Bucket", "Receivable", "Payable", "% of receivables", ""],
            { align: ["left","right","right","right","left"] });
  const bFirst = r;
  for (const b of ["Current","1–30d","31–60d","61–90d","90d+"]) {
    cell(ws, r, 1, b, { kind: "label", indent: 1 });
    cell(ws, r, 2, `=SUMIF(AR_Bucket,"${b}",AR_Out)`, { kind: "link", nf: NF.money });
    cell(ws, r, 3, `=SUMIF(AP_Bucket,"${b}",AP_Out)`, { kind: "link", nf: NF.money });
    cell(ws, r, 4, `=IF(SUM(AR_Out)=0,"",B${r}/SUM(AR_Out))`, { nf: NF.pct });
    r++;
  }
  cell(ws, r, 1, "Total", { kind: "label", bold: true });
  cell(ws, r, 2, `=SUM(B${bFirst}:B${r - 1})`, { kind: "lock", nf: NF.money, bold: true });
  cell(ws, r, 3, `=SUM(C${bFirst}:C${r - 1})`, { kind: "lock", nf: NF.money, bold: true });

  wb.definedNames.add(`'Working Capital'!$B$${W.dso}`, "WC_DSO");
  wb.definedNames.add(`'Working Capital'!$B$${W.dio}`, "WC_DIO");
  wb.definedNames.add(`'Working Capital'!$B$${W.dpo}`, "WC_DPO");
  wb.definedNames.add(`'Working Capital'!$B$${W.ccc}`, "WC_CCC");
  wb.definedNames.add(`'Working Capital'!$B$${W.wc}`,  "WC_Total");
  wb.definedNames.add(`'Working Capital'!$B$${W.release}`, "WC_Release");
  wb.definedNames.add(`'Working Capital'!$B$${bFirst}`,     "AG_Current");
  wb.definedNames.add(`'Working Capital'!$B$${bFirst + 1}`, "AG_30");
  wb.definedNames.add(`'Working Capital'!$B$${bFirst + 2}`, "AG_60");
  wb.definedNames.add(`'Working Capital'!$B$${bFirst + 3}`, "AG_90");
  wb.definedNames.add(`'Working Capital'!$B$${bFirst + 4}`, "AG_90plus");
  return ws;
}

export function ratios(wb) {
  const ws = sheet(wb, "Ratios", { tab: T.tabCalc, widths: [38, 16, 16, 16, 12, 50], freeze: "B6" });
  let r = title(ws, "Ratios", "With a benchmark beside each, because a ratio on its own says nothing.", 6);
  r++;
  const band = (name, rows) => {
    r = section(ws, r, name, 6);
    r = heads(ws, r, ["", "Current", "Prior", "Benchmark", "Flag", "What it is telling you"],
              { align: ["left","right","right","right","center","left"] });
    for (const [label, formula, nf, bench, good, meaning] of rows) {
      cell(ws, r, 1, label, { kind: "label", indent: 1 });
      cell(ws, r, 2, `=IFERROR(${formula},"")`, { nf });
      cell(ws, r, 3, null, { kind: "input", nf });
      cell(ws, r, 4, bench, { kind: "input", nf });
      cell(ws, r, 5, `=IF(B${r}="","",IF(B${r}${good}D${r},"OK","WATCH"))`, { align: "center", bold: true });
      cell(ws, r, 6, meaning, { size: 9, wrap: true }).font = { size: 9, italic: true, color: { argb: T.muted } };
      ws.addConditionalFormatting({ ref: `E${r}`, rules: [
        { type:"cellIs", operator:"equal", formulae:['"OK"'], priority:1,
          style:{ font:{ color:{ argb:T.good }, bold:true } } },
        { type:"cellIs", operator:"equal", formulae:['"WATCH"'], priority:2,
          style:{ font:{ color:{ argb:T.warn }, bold:true } } },
      ]});
      r++;
    }
    r++;
  };

  band("Liquidity", [
    ["Current ratio", "(BS_AR+BS_Inv+BS_Cash+BS_OA)/(BS_AP+BS_OL)", NF.ratio, 1.5, ">=",
     "Short-term assets against short-term obligations. Below 1 means the next quarter is funded by something other than the balance sheet."],
    ["Quick ratio", "(BS_AR+BS_Cash+BS_OA)/(BS_AP+BS_OL)", NF.ratio, 1.0, ">=",
     "The same without inventory, which may not convert quickly."],
  ]);
  band("Profitability", [
    ["Gross margin", "PL_GP/PL_Revenue", NF.pct, 0.35, ">=", "What is left after the cost of delivering."],
    ["EBITDA margin", "PL_EBITDA/PL_Revenue", NF.pct, 0.15, ">=", "Operating profitability before the financing and accounting choices."],
    ["Net margin", "PL_PAT/PL_Revenue", NF.pct, 0.10, ">=", ""],
    ["Return on equity", "PL_PAT/BS_Eq", NF.pct, 0.15, ">=", "What the owners' capital earned."],
    ["Return on capital employed", "PL_EBITDA/(BS_Eq+BS_Debt)", NF.pct, 0.15, ">=", ""],
  ]);
  band("Efficiency", [
    ["Debtor days", "WC_DSO", NF.num, 45, "<=", "Longer than your payment terms means the terms are not being enforced."],
    ["Creditor days", "WC_DPO", NF.num, 45, "<=", "Much longer than terms is free funding that costs goodwill."],
    ["Inventory days", "WC_DIO", NF.num, 60, "<=", ""],
    ["Asset turnover", "PL_Revenue/BS_TA", NF.ratio, 1.0, ">=", "Revenue generated per unit of assets."],
  ]);
  band("Leverage", [
    ["Debt to equity", "BS_Debt/BS_Eq", NF.ratio, 2.0, "<=", "How much of the business is funded by lenders."],
    ["Debt to EBITDA", "BS_Debt/PL_EBITDA", NF.ratio, 3.0, "<=", "Years of operating profit to clear the debt. Lenders look here first."],
    ["Interest cover", "PL_EBITDA/PL_Fin", NF.ratio, 3.0, ">=", "Below 2 and a bad quarter becomes a covenant breach."],
  ]);
  return ws;
}
