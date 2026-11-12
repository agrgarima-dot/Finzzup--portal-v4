// ─── TWELVE-MONTH FORECAST ────────────────────────────────────────────────────
// A three-way forecast: profit and loss, balance sheet and cash flow, linked so
// that a change in one moves the others. Built twice — base case and downside —
// from the same drivers, so the two can only differ where the assumptions do.
//
// Everything the forecast assumes lives somewhere a person chose it: growth,
// margin, payroll, overhead and the collection and payment periods on
// Assumptions; the downside adjustments on Scenarios. This sheet only does
// arithmetic, and it checks its own arithmetic every month — the balance
// sheet has to balance, because the cash line is worked out from the
// movements on it rather than typed.
//
// Two things it deliberately holds constant, because the books do not say how
// they will move: other assets and other liabilities carried over from the
// balance sheet. Anything that matters among them should be modelled
// explicitly in the capex, borrowing or tax-paid rows below.
import { T, NF, sheet, title, section, heads, cell, note, dropdown } from "./wb-lib.mjs";

const MONTHS = 12;
const col = (n) => String.fromCharCode(66 + n);         // 0 → B (opening), 1..12 → C..N
const range = (row) => `C${row}:N${row}`;

export function forecast(wb, { uae = true } = {}) {
  const ws = sheet(wb, "12-Month Forecast", { tab: T.tabAnal,
    widths: [34, 15, ...Array(MONTHS).fill(13)], freeze: "C5" });
  let r = title(ws, "Twelve-month forecast",
    "Profit, balance sheet and cash, linked. Drivers come from Assumptions and Scenarios; nothing here is typed except the rows marked blue.", 14);
  r++;

  // ── Summary for the portal ─────────────────────────────────────────────
  // A plain table at the top so the Portal Feed can read it by its headings.
  // Its cells are links into the two blocks below.
  const sumHead = r;
  r = heads(ws, r, ["Month", "Revenue", "EBITDA", "Closing cash", "Closing cash — downside"],
            { align: ["left","right","right","right","right"] });
  const sumFirst = r;
  r += MONTHS;           // filled once the blocks exist
  r += 1;                // the blank line that ends the table for the reader

  // ── Settings ───────────────────────────────────────────────────────────
  r = section(ws, r, "Settings", 14);
  const setting = (label, value, nf, hint) => {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, value, { kind: typeof value === "string" && value.startsWith("=") ? "link" : "input", nf });
    cell(ws, r, 3, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    const at = r; r++; return at;
  };
  const sMonthly = setting("Months in the period just closed",
    "=IF(N(Cl_Days)>0,Cl_Days/30.4,1)", NF.ratio, "From the period dates on the Cover. Converts the period's figures to a monthly run rate");
  const sGM = setting("Gross margin used",
    "=IF(N(A_GM)>0,A_GM,IF(N(PL_Revenue)=0,0,PL_GP/PL_Revenue))", NF.pct, "Your target on Assumptions, or the margin just earned");
  const sOpex = setting("Monthly operating cost",
    "=IF(N(A_Payroll)+N(A_Overhead)>0,N(A_Payroll)+N(A_Overhead),N(PL_Opex)/B" + (r - 2) + ")", NF.money,
    "Payroll plus overhead from Assumptions, or the period's operating cost as a monthly rate");
  const sDSO = setting("Collection days", "=IF(N(A_DSO)>0,A_DSO,N(WC_DSO))", NF.num, "Assumptions, or the current DSO");
  const sDPO = setting("Supplier payment days", "=IF(N(A_DPO)>0,A_DPO,N(WC_DPO))", NF.num, "Assumptions, or the current DPO");
  const sDIO = setting("Inventory days", "=IF(N(A_DIO)>0,A_DIO,N(WC_DIO))", NF.num, "Assumptions, or the current DIO");
  const sVat = setting(uae ? "VAT rate on the margin" : "GST rate on the margin",
    uae ? "=R_VAT" : null, NF.pct,
    uae ? "Output VAT less input VAT on cost of sales, paid quarterly"
        : "Enter the rate that applies, or leave blank to leave indirect tax out of the forecast");
  const sTax = uae
    ? setting("Small Business Relief elected for this period?", "No", null, "If yes, no corporate tax is provided")
    : setting("Income tax rate", null, NF.pct, "Enter the rate that applies to this client");
  if (uae) dropdown(ws, `B${sTax}`, "=YesNo");
  const sGrowth = setting("Monthly revenue growth", "=N(A_Growth)", NF.pct, "From Assumptions");
  const sBuffer = setting("Minimum cash buffer", "=N(A_Buffer)", NF.money, "From Assumptions. The runway is measured against this");
  r++;

  // ── One block per scenario ─────────────────────────────────────────────
  const block = (label, scenCol, tag) => {
    r = section(ws, r, label, 14);
    r = heads(ws, r, ["", "Opening", ...Array.from({ length: MONTHS }, (_, i) => `M${i + 1}`)],
              { align: ["left", ...Array(13).fill("right")] });
    const R = {};
    const line = (key, labelText, f, { kind = "calc", nf = NF.money, bold = false, opening = null } = {}) => {
      cell(ws, r, 1, labelText, { kind: "label", indent: 1, bold });
      cell(ws, r, 2, opening, { kind: opening == null ? "calc" : (String(opening).startsWith("=") ? "link" : "input"), nf, bold });
      for (let n = 1; n <= MONTHS; n++) {
        const v = typeof f === "function" ? f(n, col(n), col(n - 1)) : f;
        cell(ws, r, n + 2, v, { kind, nf, bold });
      }
      R[key] = r; r++;
      return R[key];
    };
    const drv = (i) => `INDEX(SC_Drivers,${i},${scenCol})`;

    line("month", "Month", (n) => `=IF(N(Cl_PeriodEnd)=0,"M${n}",TEXT(EDATE(Cl_PeriodEnd,${n}),"mmm yy"))`,
         { nf: NF.text });
    r++;
    // P&L
    line("rev",   "Revenue", (n) => `=N(PL_Revenue)/$B$${sMonthly}*(1+$B$${sGrowth})^${n}*(1+N(${drv(1)}))`, { bold: true });
    line("cogs",  "Cost of sales", (n, c) => `=${c}${R.rev}*(1-$B$${sGM})`);
    line("gp",    "Gross profit", (n, c) => `=${c}${R.rev}-${c}${R.cogs}`, { bold: true });
    line("opex",  "Operating costs", () => `=$B$${sOpex}*(1+N(${drv(2)}))`);
    line("ebitda","EBITDA", (n, c) => `=${c}${R.gp}-${c}${R.opex}`, { bold: true });
    line("dep",   "Depreciation", () => `=N(PL_Dep)/$B$${sMonthly}`);
    line("fin",   "Finance cost", () => `=N(PL_Fin)/$B$${sMonthly}`);
    line("pbt",   "Profit before tax", (n, c) => `=${c}${R.ebitda}-${c}${R.dep}-${c}${R.fin}`, { bold: true });
    line("cumPbt","  Cumulative profit", (n, c, p) => n === 1 ? `=${c}${R.pbt}` : `=${p}${r - 0}+${c}${R.pbt}`);
    // fix the cumulative reference now that its own row number is known
    for (let n = 2; n <= MONTHS; n++) ws.getCell(R.cumPbt, n + 2).value = { formula: `${col(n - 1)}${R.cumPbt}+${col(n)}${R.pbt}` };
    line("tax", uae ? "Corporate tax provided" : "Income tax provided", (n, c, p) => uae
      // Corporate tax on profit above the nil band, provided as it is earned.
      ? `=IF($B$${sTax}="Yes",0,MAX(0,${c}${R.cumPbt}-R_NilBand)*R_CT-${n === 1 ? 0 : `MAX(0,${p}${R.cumPbt}-R_NilBand)*R_CT`})`
      : `=MAX(0,${c}${R.pbt})*N($B$${sTax})`);
    line("pat", "Profit after tax", (n, c) => `=${c}${R.pbt}-${c}${R.tax}`, { bold: true });
    r++;

    // Balance sheet
    line("ar",  "Receivables", (n, c) => `=${c}${R.rev}*MAX(0,$B$${sDSO}+N(${drv(3)}))/30.4`, { opening: "=N(BS_AR)" });
    line("inv", "Inventory", (n, c) => `=${c}${R.cogs}*$B$${sDIO}/30.4`, { opening: "=N(BS_Inv)" });
    line("capex", "Capital expenditure", (n) => n === 1 ? `=N(${drv(4)})` : null, { kind: "input" });
    for (let n = 2; n <= MONTHS; n++) ws.getCell(R.capex, n + 2).value = null;
    line("fa",  "Fixed assets", (n, c, p) => `=${p}${r}+${c}${R.capex}-${c}${R.dep}`, { opening: "=N(BS_FA)" });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.fa, n + 2).value =
      { formula: `${col(n - 1)}${R.fa}+${col(n)}${R.capex}-${col(n)}${R.dep}` };
    line("oa",  "Other assets", (n, c, p) => `=${p}${R.oa ?? r}`, { opening: "=N(BS_OA)" });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.oa, n + 2).value = { formula: `${col(n - 1)}${R.oa}` };
    line("ap",  "Payables", (n, c) => `=${c}${R.cogs}*$B$${sDPO}/30.4`, { opening: "=N(BS_AP)" });
    line("vatAcc", uae ? "  VAT accrued" : "  GST accrued", (n, c) => `=(${c}${R.rev}-${c}${R.cogs})*N($B$${sVat})`);
    line("vatPaid", uae ? "  VAT paid" : "  GST paid", (n, c) =>
      n % 3 === 0 ? `=SUM(${col(n - 2)}${R.vatAcc}:${c}${R.vatAcc})` : `=0`);
    line("vat", uae ? "VAT payable" : "GST payable", (n, c, p) => `=${p}${r}+${c}${R.vatAcc}-${c}${R.vatPaid}`, { opening: 0 });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.vat, n + 2).value =
      { formula: `${col(n - 1)}${R.vat}+${col(n)}${R.vatAcc}-${col(n)}${R.vatPaid}` };
    line("taxPaid", "  Tax paid", () => null, { kind: "input" });
    line("taxPay", "Tax payable", () => null, { opening: 0 });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.taxPay, n + 2).value =
      { formula: `${col(n - 1)}${R.taxPay}+${col(n)}${R.tax}-N(${col(n)}${R.taxPaid})` };
    line("ol",  "Other liabilities", () => null, { opening: "=N(BS_OL)" });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.ol, n + 2).value = { formula: `${col(n - 1)}${R.ol}` };
    line("drawn",  "  Borrowings drawn", () => null, { kind: "input" });
    line("repaid", "  Borrowings repaid", () => null, { kind: "input" });
    line("debt", "Borrowings", () => null, { opening: "=N(BS_Debt)" });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.debt, n + 2).value =
      { formula: `${col(n - 1)}${R.debt}+N(${col(n)}${R.drawn})-N(${col(n)}${R.repaid})` };
    line("eq", "Equity", () => null, { opening: "=N(BS_Eq)" });
    for (let n = 1; n <= MONTHS; n++) ws.getCell(R.eq, n + 2).value = { formula: `${col(n - 1)}${R.eq}+${col(n)}${R.pat}` };
    r++;

    // Cash flow — from the movements, never typed
    line("cfo", "Cash from operations", () => null, { bold: true });
    for (let n = 1; n <= MONTHS; n++) {
      const c = col(n), p = col(n - 1);
      ws.getCell(R.cfo, n + 2).value = { formula:
        `${c}${R.pat}+${c}${R.dep}-(${c}${R.ar}-${p}${R.ar})-(${c}${R.inv}-${p}${R.inv})` +
        `+(${c}${R.ap}-${p}${R.ap})+(${c}${R.vat}-${p}${R.vat})+(${c}${R.taxPay}-${p}${R.taxPay})` };
    }
    line("cfi", "Cash used in investing", (n, c) => `=-N(${c}${R.capex})`);
    line("cff", "Cash from financing", (n, c) => `=N(${c}${R.drawn})-N(${c}${R.repaid})`);
    line("cash", "Closing cash", () => null, { bold: true, opening: "=N(BS_Cash)" });
    for (let n = 1; n <= MONTHS; n++) {
      const c = col(n), p = col(n - 1);
      ws.getCell(R.cash, n + 2).value = { formula: `${p}${R.cash}+${c}${R.cfo}+${c}${R.cfi}+${c}${R.cff}` };
    }
    ws.addConditionalFormatting({ ref: `C${R.cash}:N${R.cash}`, rules: [
      { type:"expression", formulae:[`C${R.cash}<$B$${sBuffer}`], priority:1,
        style:{ font:{ color:{ argb:T.bad }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    ]});

    // The check: assets less liabilities and equity, less whatever the opening
    // balance sheet was already out by, must be nil every month.
    line("check", "Balance check", () => null, { nf: NF.money });
    for (let n = 0; n <= MONTHS; n++) {
      const c = col(n);
      ws.getCell(R.check, n + 2).value = { formula:
        `ROUND((${c}${R.cash}+${c}${R.ar}+${c}${R.inv}+${c}${R.fa}+${c}${R.oa})` +
        `-(${c}${R.ap}+${c}${R.vat}+${c}${R.taxPay}+${c}${R.ol}+${c}${R.debt}+${c}${R.eq})-N(BS_Diff),0)` };
    }
    ws.addConditionalFormatting({ ref: `B${R.check}:N${R.check}`, rules: [
      { type:"cellIs", operator:"notEqual", formulae:["0"], priority:1,
        style:{ font:{ color:{ argb:T.bad }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    ]});
    r++;
    return R;
  };

  const B = block("Base case", 1, "B");
  const D = block("Downside", 2, "D");

  // ── The summary table, now that the blocks exist ───────────────────────
  for (let n = 1; n <= MONTHS; n++) {
    const row = sumFirst + n - 1, c = col(n);
    cell(ws, row, 1, `=${c}${B.month}`, { kind: "link", nf: NF.text });
    cell(ws, row, 2, `=ROUND(${c}${B.rev},0)`, { kind: "link", nf: NF.money });
    cell(ws, row, 3, `=ROUND(${c}${B.ebitda},0)`, { kind: "link", nf: NF.money });
    cell(ws, row, 4, `=ROUND(${c}${B.cash},0)`, { kind: "link", nf: NF.money });
    cell(ws, row, 5, `=ROUND(${c}${D.cash},0)`, { kind: "link", nf: NF.money });
  }

  // ── What the client reads ──────────────────────────────────────────────
  r = section(ws, r, "Results", 14);
  const result = (labelText, f, nf, name) => {
    cell(ws, r, 1, labelText, { kind: "label", indent: 1, bold: true });
    cell(ws, r, 2, f, { kind: "lock", nf, bold: true });
    wb.definedNames.add(`'12-Month Forecast'!$B$${r}`, name);
    r++;
  };
  const firstBelow = (R) =>
    `=IFERROR(INDEX(${range(R.month)},MATCH(1,INDEX(--(${range(R.cash)}<$B$${sBuffer}),0),0)),"Not within 12 months")`;
  result("Cash in twelve months — base", `=ROUND(N${B.cash},0)`, NF.money, "FC_EndCash");
  result("Cash in twelve months — downside", `=ROUND(N${D.cash},0)`, NF.money, "FC_EndCashDown");
  result("Lowest cash — base", `=ROUND(MIN(${range(B.cash)}),0)`, NF.money, "FC_LowCash");
  result("Falls below the buffer — base", firstBelow(B), NF.text, "FC_Runway");
  result("Falls below the buffer — downside", firstBelow(D), NF.text, "FC_RunwayDown");
  result(uae ? "Corporate tax to set aside over the year" : "Income tax to set aside over the year",
         `=ROUND(SUM(${range(B.tax)}),0)`, NF.money, "FC_TaxReserve");
  result(uae ? "Largest single VAT payment ahead" : "Largest single GST payment ahead",
         `=ROUND(MAX(${range(B.vatPaid)}),0)`, NF.money, "FC_VatPeak");
  if (uae) {
    // Revenue to date in the tax period plus the forecast, against the cap.
    cell(ws, r, 1, "  Revenue to date in the tax period, then each month", { kind: "label", indent: 1 });
    for (let n = 1; n <= MONTHS; n++) {
      cell(ws, r, n + 2, n === 1 ? `=N(CT_RevYTD)+C${B.rev}` : `=${col(n - 1)}${r}+${col(n)}${B.rev}`, { nf: NF.money });
    }
    const cumRow = r; r++;
    result("Crosses the Small Business Relief cap",
      `=IFERROR(INDEX(${range(B.month)},MATCH(1,INDEX(--(${range(cumRow)}>R_SBRCap),0),0)),"Not within 12 months")`,
      NF.text, "FC_SBRCross");
  }
  result("Balance sheet balances every month",
    `=SUMPRODUCT(ABS(${range(B.check)}))+SUMPRODUCT(ABS(${range(D.check)}))`, NF.money, "FC_Check");
  r++;
  cell(ws, r, 1, "Your note on the forecast", { kind: "label", bold: true }); r++;
  ws.mergeCells(r, 1, r + 3, 8);
  cell(ws, r, 1, null, { kind: "input", wrap: true });
  ws.getRow(r).height = 60;
  wb.definedNames.add(`'12-Month Forecast'!$A$${r}`, "FC_Note");
  r += 5;
  note(ws, r, "The downside applies the Downside column on Scenarios: a change in revenue, a change in operating cost, extra collection days and any one-off capital spend in the first month. Other assets and liabilities from the balance sheet are held flat. Corporate tax is provided on this forecast's profit only — profit already earned earlier in the tax period is not included.", 14);
  return ws;
}
