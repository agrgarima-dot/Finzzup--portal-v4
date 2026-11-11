// What is in the analysis workbook, as plain data.
//
// The admin screen lists the sheets without pulling in ExcelJS to do it — that
// is a megabyte of spreadsheet writer, and naming the tabs does not need one.
// Kept beside the builders so the two are edited together.
export const WORKBOOK_SHEETS = [
  { group: "Start here", sheets: [
    ["Cover",            "Client, period, currency, and which modules apply"],
    ["How to use",       "The colour convention and the order of work"],
    ["Lists",            "What the dropdowns offer"],
  ]},
  { group: "What goes in", sheets: [
    ["COA Map",          "Account type to statement line"],
    ["TB Input",         "The trial balance"],
    ["AR Input",         "Open invoices"],
    ["AP Input",         "Open bills"],
    ["Assumptions",      "Budget, operating assumptions, and every rate in one place"],
  ]},
  { group: "Worked out for you", sheets: [
    ["P&L",              "SUMIFs over the mapped trial balance"],
    ["Balance Sheet",    "With a difference row that has to be nil"],
    ["Cash Flow",        "Indirect, tied back to the balance sheet"],
    ["Working Capital",  "Ageing, DSO/DIO/DPO, and what a shorter cycle is worth"],
    ["Ratios",           "Liquidity, profitability, efficiency, leverage — each against a benchmark"],
  ]},
  { group: "Your analysis", sheets: [
    ["Variance",         "Budget against actual, with the sentence that explains it"],
    ["Vertical",         "Every line as a share of revenue"],
    ["Trend",            "Twelve months across"],
    ["Scenarios",        "Base, downside, upside"],
    ["13-Week Cash",     "Weekly, with the headroom row that turns red"],
    ["Unit Economics",   "CAC, LTV, churn, runway — off for a client without subscriptions"],
    ["Concentration",    "Who the business depends on, customer and supplier"],
    ["Segments",         "Profit by business line, emirate and branch"],
    ["Treasury",         "Deposits, rates, maturities"],
    ["Loan & Investor",  "DSCR and covenants, and the pack a lender asks for"],
  ]},
  { group: "Tax", sheets: [
    ["UAE VAT",            "The return working, and what to set aside"],
    ["UAE Corporate Tax",  "Accounting profit to the charge, with SBR and the nil band"],
    ["UAE QFZP",           "De minimis headroom in dirhams, and substance"],
    ["UAE Related Party",  "Art. 34, 35 and 36 schedules"],
    ["UAE Rev Recon",      "IFRS revenue to VAT revenue"],
    ["E-Invoicing Readiness","Which wave, master data quality, and the steps to go live"],
    ["India Tax",          "GST reconciliation, TDS, 43B(h) ageing, advance tax"],
    ["India-UAE",          "Residence, treaty positions, money moving, reporting in both places"],
  ]},
  { group: "Out to the portal", sheets: [
    ["Portal Feed",      "Every figure the client sees, on a fixed row. The only sheet the portal reads"],
    ["Checks",           "Everything that must tie, and what it means when it does not"],
  ]},
];

export const SHEET_COUNT = WORKBOOK_SHEETS.reduce((n, g) => n + g.sheets.length, 0);
