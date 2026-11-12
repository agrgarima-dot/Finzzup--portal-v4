// Cover, conventions, lists and the integrity checks.
import { T, NF, sheet, title, section, heads, cell, row, note, check, dropdown } from "./wb-lib.mjs";

export function cover(wb, client = null) {
  const ws = sheet(wb, "Cover", { tab: T.tabCover, widths: [34, 30, 4, 34, 30], freeze: null });
  let r = title(ws, "Finzzup — Virtual CFO Analysis Workbook",
    "One file. The analysis happens here; the portal reads the Portal Feed sheet.", 5);

  r++;
  r = section(ws, r, "Engagement", 5);
  const uae = /uae|cross/i.test(client?.jurisdiction || "UAE");
  const eng = [
    ["Client name",        client?.name    || "", "The name shown on their portal"],
    ["Legal entity",       client?.company || "", "Full registered name"],
    ["Jurisdiction",       client?.jurisdiction || "UAE", "UAE · India · Cross-Border — drives which tax sheets apply"],
    ["Free zone",          client?.freezone || "", "Blank for mainland. Drives the QFZP sheets"],
    ["Reporting currency", uae ? "AED" : "INR", "Set from jurisdiction unless you override"],
    ["Units",              "Actual", "Actual · Thousands · Lakhs · Millions"],
    ["Financial year end", "31-Dec", ""],
    ["Period of this pack","", "e.g. January 2026 — appears on every client screen"],
    ["Period start",       "", ""],
    ["Period end",         "", ""],
    ["Days in period",     "", "Worked out from the period start and end. DSO, DPO and DIO need it"],
    ["Prepared by",        "", ""],
    ["Reviewed by",        "", ""],
    ["Date prepared",      "", ""],
    ["Version",            "1.0", ""],
  ];
  const first = r;
  // Dates are dates. These were all formatted as text, so a period end typed
  // here was stored as a string and every "days overdue" formula that
  // subtracted from it failed.
  const DATE_ROWS = new Set(["Period start", "Period end", "Date prepared"]);
  for (const [label, val, hint] of eng) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    if (label === "Days in period") {
      // Worked out from the two dates, so it cannot disagree with them.
      cell(ws, r, 2, `=IF(OR(B${r - 2}="",B${r - 1}=""),"",B${r - 1}-B${r - 2}+1)`, { kind: "calc", nf: NF.num });
    } else {
      cell(ws, r, 2, val, { kind: "input", nf: DATE_ROWS.has(label) ? NF.date : NF.text });
    }
    cell(ws, r, 4, hint, { kind: "label", size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    r++;
  }
  dropdown(ws, `B${first + 2}`, "=Jurisdictions");
  dropdown(ws, `B${first + 3}`, "=FreeZones");
  dropdown(ws, `B${first + 4}`, "=Currencies");
  dropdown(ws, `B${first + 5}`, "=UnitsList");
  wb.definedNames.add(`Cover!$B$${first}`,      "Cl_Name");
  wb.definedNames.add(`Cover!$B$${first + 2}`,  "Cl_Jurisdiction");
  wb.definedNames.add(`Cover!$B$${first + 3}`,  "Cl_FreeZone");
  wb.definedNames.add(`Cover!$B$${first + 4}`,  "Cl_Currency");
  wb.definedNames.add(`Cover!$B$${first + 7}`,  "Cl_Period");
  wb.definedNames.add(`Cover!$B$${first + 8}`,  "Cl_PeriodStart");
  wb.definedNames.add(`Cover!$B$${first + 9}`,  "Cl_PeriodEnd");
  wb.definedNames.add(`Cover!$B$${first + 10}`, "Cl_Days");

  r++;
  r = section(ws, r, "Modules — switch off what this client does not have", 5);
  r = note(ws, r, "A trading company has no ARR and a free zone company has no GST. Switching a module off leaves its sheets blank rather than asking you to fill them.", 5);
  const mods = [
    ["Inventory",                 "Yes", "Adds DIO, stock turns and inventory to working capital"],
    ["Subscription / SaaS metrics","No",  "ARR, churn, NRR, CAC, LTV, burn multiple"],
    ["Borrowings and facilities", "Yes", "Debt ratios, DSCR, interest cover, loan readiness"],
    ["Treasury — deposits",       "Yes", "Deposit schedule, maturities, weighted yield"],
    ["Departments / segments",    "Yes", "Department and geography analysis"],
    ["Related party transactions","Yes", "Art. 35/36 schedules and arm's length tests"],
    ["Group / consolidation",     "No",  "Adds an entity column to the trial balance"],
    ["Multi-currency",            "No",  "Adds a rate column and translation"],
  ];
  const mFirst = r;
  for (const [label, val, hint] of mods) {
    cell(ws, r, 1, label, { kind: "label", indent: 1 });
    cell(ws, r, 2, val, { kind: "input", align: "center" });
    cell(ws, r, 4, hint, { size: 9 }).font = { size: 9, italic: true, color: { argb: T.muted } };
    dropdown(ws, `B${r}`, "=YesNo");
    r++;
  }
  wb.definedNames.add(`Cover!$B$${mFirst}`,     "M_Inventory");
  wb.definedNames.add(`Cover!$B$${mFirst + 1}`, "M_SaaS");
  wb.definedNames.add(`Cover!$B$${mFirst + 2}`, "M_Debt");
  wb.definedNames.add(`Cover!$B$${mFirst + 3}`, "M_Treasury");
  wb.definedNames.add(`Cover!$B$${mFirst + 4}`, "M_Segments");
  wb.definedNames.add(`Cover!$B$${mFirst + 5}`, "M_RPT");

  r++;
  r = section(ws, r, "Status", 5);
  cell(ws, r, 1, "Checks passing", { kind: "label", indent: 1, bold: true });
  cell(ws, r, 2, "=IF(COUNTIF(Checks!C:C,\"CHECK\")=0,\"All checks pass\",COUNTIF(Checks!C:C,\"CHECK\")&\" check(s) failing — see Checks\")",
       { bold: true });
  ws.addConditionalFormatting({ ref: `B${r}`, rules: [
    { type:"containsText", operator:"containsText", text:"All checks", priority:1,
      style:{ font:{ color:{ argb:T.good }, bold:true } } },
    { type:"containsText", operator:"containsText", text:"failing", priority:2,
      style:{ font:{ color:{ argb:T.bad }, bold:true } } },
  ]});
  return ws;
}

export function howTo(wb) {
  const ws = sheet(wb, "How to use", { tab: T.tabCover, widths: [3, 26, 86], freeze: null });
  let r = title(ws, "How this workbook works", "Read once. It will save an argument later.", 3);

  r++;
  r = section(ws, r, "The colour convention", 3);
  const conv = [
    ["input", "Blue on pale blue", "You type here. Every number the workbook cannot work out for itself is blue."],
    ["calc",  "Black",             "Worked out on this sheet. Do not overtype it — you would break the sheet silently."],
    ["link",  "Green",             "Comes from another sheet. Change it at its source."],
    ["lock",  "Bold on grey",      "A total or an output. Nothing should be typed over it."],
  ];
  for (const [kind, name, what] of conv) {
    cell(ws, r, 2, name, { kind, align: "center" });
    cell(ws, r, 3, what, { kind: "label", wrap: true });
    ws.getRow(r).height = 17;
    r++;
  }

  r++;
  r = section(ws, r, "The order of work", 3);
  const steps = [
    ["1", "Fill the Cover", "Client, jurisdiction, period, and the days in the period. Day-based ratios are meaningless without the last one, so they stay blank until it is set."],
    ["2", "Switch modules off", "A trading company has no ARR. Turn off what does not apply and those sheets stop asking."],
    ["3", "Paste the inputs", "Trial balance, open invoices, open bills. Straight out of the accounting system — do not tidy them first."],
    ["4", "Check the COA map", "Every account needs a group. Unmapped accounts are listed on Checks and will not reach the statements."],
    ["5", "Do the analysis", "The calc sheets build themselves. The analysis sheets are where your judgement goes — budgets, scenarios, determinations."],
    ["6", "Read the Checks sheet", "It ties the trial balance, the balance sheet, the cash flow and the tax workings. If anything says CHECK, stop."],
    ["7", "Upload to the portal", "The portal reads the Portal Feed sheet. Nothing else."],
  ];
  for (const [n, head, body] of steps) {
    cell(ws, r, 2, `${n}. ${head}`, { kind: "label", bold: true });
    cell(ws, r, 3, body, { kind: "label", wrap: true });
    ws.getRow(r).height = 28;
    r++;
  }

  r++;
  r = section(ws, r, "Making it fit a bigger client", 3);
  const grow = [
    ["Add rows", "Every input sheet is an Excel table. Click the last row and press Tab — formulas, formats and the totals all follow on their own."],
    ["Add departments, regions, customers", "Add them on the Lists sheet. The dropdowns and the analysis sheets pick them up."],
    ["Add P&L or balance sheet lines", "Add the account on the COA map with its group. The statements are SUMIFs over the group, so a new account lands in the right place without a new formula."],
    ["More than one entity", "Switch Group / consolidation on. The trial balance gains an entity column and the statements gain a filter."],
    ["More than one currency", "Switch Multi-currency on. A rate column appears on each input sheet."],
  ];
  for (const [head, body] of grow) {
    cell(ws, r, 2, head, { kind: "label", bold: true });
    cell(ws, r, 3, body, { kind: "label", wrap: true });
    ws.getRow(r).height = 28;
    r++;
  }

  r++;
  r = section(ws, r, "The one rule", 3);
  cell(ws, r, 2, "Do not rename a sheet", { kind: "label", bold: true });
  cell(ws, r, 3, "The portal finds its figures by sheet name and cell reference. Renaming 'Portal Feed', or moving its rows about, breaks the link — and it breaks quietly, reading whatever is in the cell now. Add rows below the table, never above it.",
       { kind: "label", wrap: true });
  ws.getRow(r).height = 44;
  return ws;
}

export function lists(wb) {
  const ws = sheet(wb, "Lists", { tab: T.tabMap, widths: [22,22,22,22,22,22,22,22], freeze: "A4" });
  let r = title(ws, "Lists", "What the dropdowns offer. Add to a column and it appears in the dropdown.", 8);
  const cols = [
    ["Jurisdictions", ["UAE","India","Cross-Border"]],
    ["FreeZones",     ["DMCC","JAFZA","ADGM","DIFC","RAKEZ","Other / Mainland",""]],
    ["Currencies",    ["AED","INR","USD","EUR","GBP"]],
    ["UnitsList",     ["Actual","Thousands","Lakhs","Millions"]],
    ["YesNo",         ["Yes","No"]],
    ["Departments",   ["Sales","Marketing","Operations","Technology","Finance","HR"]],
    ["Regions",       ["North","South","East","West","Central","International"]],
    ["Priorities",    ["High","Medium","Low"]],
  ];
  r = heads(ws, r, cols.map(c => c[0]));
  const top = r;
  let deepest = 0;
  cols.forEach(([name, vals], i) => {
    vals.forEach((v, j) => cell(ws, top + j, i + 1, v, { kind: "input" }));
    deepest = Math.max(deepest, vals.length);
    // A generous range, so adding a value lower down still feeds the dropdown.
    wb.definedNames.add(`Lists!$${String.fromCharCode(65+i)}$${top}:$${String.fromCharCode(65+i)}$${top+40}`, name);
  });
  note(ws, top + deepest + 2,
    "Named ranges run 40 rows deep, so there is room to add without touching the names.", 8);
  return ws;
}

export function checks(wb, uae = true) {
  const ws = sheet(wb, "Checks", { tab: T.tabOut, widths: [52, 18, 14, 60], freeze: "A5" });
  let r = title(ws, "Checks",
    "Everything that must tie. Read this before anything leaves the building.", 4);
  r++;
  r = section(ws, r, "Integrity", 4);
  r = heads(ws, r, ["What is being checked", "Difference", "Status", "What it means if it fails"], { align: ["left","right","center","left"] });

  // Every check reads a named figure. These used to point at fixed cell
  // addresses that had drifted: the trial balance compared period credits with
  // closing debits, "balance sheet balances" read two empty cells far below
  // the balance sheet, and "every account is mapped" counted the wrong column
  // — so three of them could never fail. A check that cannot fail is worse
  // than no check, because it says the model ties when nobody has looked.
  const items = [
    ["Trial balance balances", "TB_DrTotal-TB_CrTotal",
     "Debits do not equal credits. Nothing downstream can be trusted."],
    ["Every account is mapped to a group", "COUNTIF(TB_Group,\"UNMAPPED\")",
     "An unmapped account is left out of the statements entirely."],
    ["Balance sheet balances", "BS_Diff",
     "Assets do not equal liabilities plus equity."],
    ["Cash flow ties to the balance sheet", "CF_Diff",
     "Closing cash on the cash flow is not the cash on the balance sheet. Fill the opening cash and movements."],
    ["Receivables tie to the open invoices", "BS_AR-AR_Total",
     "The ledger and the open invoice list disagree."],
    ["Payables tie to the open bills", "BS_AP-AP_Total",
     "The ledger and the open bill list disagree."],
    ...(uae ? [
      ["VAT split by emirate adds up", "VAT_EmirateDiff",
       "Standard-rated supplies split by emirate do not add up to the total."],
      ["IFRS revenue reconciles to the P&L", "RR_Unexplained",
       "The reconciling items do not explain the whole difference."],
    ] : []),
    ["Twelve-month forecast balances every month", "FC_Check",
     "The forecast balance sheet does not balance — a formula on the forecast sheet has been overtyped."],
    ["Days in the period are set", "IF(N(Cl_Days)>0,0,1)",
     "DSO, DPO and DIO cannot be worked out. Set the period start and end on the Cover."],
  ];
  for (const [label, formula, meaning] of items) {
    const at = r;
    r = check(ws, r, label, formula);
    cell(ws, at, 4, meaning, { kind: "label", size: 9, wrap: true });
  }
  r++;
  note(ws, r, "A check compares two numbers that must agree and shows the difference. A difference of zero is OK; anything else is CHECK. Rounding of up to 1 is allowed.", 4);
  return ws;
}
