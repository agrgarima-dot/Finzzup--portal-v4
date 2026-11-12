// Build a workbook with realistic figures, have LibreOffice calculate it, and
// report every formula that errors plus the figures that must tie.
//   node tools/calc-check.mjs <outdir> [UAE|India]
import E from "exceljs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildAnalysisWorkbook } from "../src/workbook-build/index.js";
import { accountsToTrialBalance, invoicesToReceivables, billsToPayables } from "../src/zohomap.js";

const out = process.argv[2]; const jur = process.argv[3] || "UAE";
fs.mkdirSync(out, { recursive:true });

const accounts = [
  { account_code:"4000", account_name:"Sales",               account_type:"income",              current_balance:110000 },
  { account_code:"5000", account_name:"Cost of Goods Sold",  account_type:"cost_of_goods_sold",  current_balance:28000 },
  { account_code:"6100", account_name:"Salaries",            account_type:"expense",             current_balance:30000 },
  { account_code:"6200", account_name:"Rent",                account_type:"expense",             current_balance:8000 },
  { account_code:"1100", account_name:"Accounts Receivable", account_type:"accounts_receivable", current_balance:115500 },
  { account_code:"1200", account_name:"Emirates NBD",        account_type:"bank",                current_balance:62000 },
  { account_code:"1300", account_name:"Input VAT",           account_type:"other_current_asset", current_balance:1400 },
  { account_code:"1500", account_name:"Office equipment",    account_type:"fixed_asset",         current_balance:40000 },
  { account_code:"2100", account_name:"Accounts Payable",    account_type:"accounts_payable",    current_balance:29400 },
  { account_code:"2200", account_name:"Output VAT",          account_type:"other_current_liability", current_balance:5500 },
  { account_code:"3000", account_name:"Share capital",       account_type:"equity",              current_balance:140000 },
];
const sync = {
  trialBalance: accountsToTrialBalance(accounts),
  receivables: invoicesToReceivables([
    { invoice_number:"INV-1", customer_name:"Gulf Steels", date:"2026-10-10", due_date:"2026-11-09", balance:68250, status:"sent" },
    { invoice_number:"INV-2", customer_name:"Mr. Noor",    date:"2026-09-01", due_date:"2026-10-01", balance:47250, status:"overdue" }], new Date("2026-11-30")),
  payables: billsToPayables([
    { bill_number:"B-1", vendor_name:"Emirates Steel", date:"2026-10-15", due_date:"2026-11-14", balance:29400, status:"open" }], new Date("2026-11-30")),
};
const wb = buildAnalysisWorkbook({ client:{ name:"Test", company:"Gulf Trading Company", jurisdiction:jur, freezone: jur==="UAE"?"DMCC":"" }, sync });

// Fill the Cover the way a pack would be.
const cover = wb.getWorksheet("Cover");
const setBy = (ws, label, v) => { ws.eachRow({ includeEmpty:false }, r => { if (String(r.getCell(1).value||"").trim() === label) r.getCell(2).value = v; }); };
setBy(cover, "Period of this pack", "November 2026");
setBy(cover, "Period start", new Date(Date.UTC(2026,10,1)));
setBy(cover, "Period end",   new Date(Date.UTC(2026,10,30)));
const asm = wb.getWorksheet("Assumptions");
for (const [k,v] of [["Revenue",120000],["Cost of Sales",30000],["Gross Profit",90000],["Operating Expenses",36000],
                     ["EBITDA",54000],["Net Profit",54000],["Revenue growth, month on month",0.03],
                     ["Target collection period",30],["Supplier payment period",30],["Monthly payroll",30000],
                     ["Monthly fixed overhead",8000],["Minimum cash buffer",25000]]) setBy(asm, k, v);
// A downside deep enough to test the runway warning.
const sc = wb.getWorksheet("Scenarios");
for (const [label, v] of [["Revenue change %", -0.6], ["Cost change %", 0.15], ["Collection days change", 30], ["Capex", 60000]])
  sc.eachRow({ includeEmpty:false }, r => { if (String(r.getCell(1).value||"").trim() === label) r.getCell(3).value = v; });
const ctws = wb.getWorksheet("UAE Corporate Tax");
if (ctws) setBy(ctws, "Revenue so far this tax period", 2400000);
const src = path.join(out, `wb-${jur}.xlsx`);
await wb.xlsx.writeFile(src);

// LibreOffice recalculates and saves with computed values.
const calcDir = path.join(out, "calc"); fs.mkdirSync(calcDir, { recursive:true });
execFileSync("soffice", ["--headless", "--calc", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", calcDir, src],
             { stdio:"pipe", timeout:240000 });
const done = path.join(calcDir, `wb-${jur}.xlsx`);

const re = new E.Workbook(); await re.xlsx.readFile(done);
const errors = []; let formulas = 0, computed = 0;
for (const ws of re.worksheets) ws.eachRow({ includeEmpty:false }, r => r.eachCell({ includeEmpty:false }, c => {
  const v = c.value;
  if (v && typeof v === "object" && "formula" in v) {
    formulas++;
    const res = v.result;
    if (res !== undefined && res !== null && res !== "") computed++;
    if (res && typeof res === "object" && res.error) errors.push(`${ws.name}!${c.address}  ${res.error}  =${String(v.formula).slice(0,80)}`);
  } else if (v && typeof v === "object" && v.error) errors.push(`${ws.name}!${c.address}  ${v.error}`);
}));
console.log(`${jur}: ${formulas} formulas, ${computed} with a value, ${errors.length} errors`);
const byKind = {};
for (const e of errors) { const k = e.split(/\s+/)[1]; (byKind[k] ||= []).push(e); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n  ${k} × ${list.length}`); list.slice(0,12).forEach(x => console.log("   " + x)); }

// The figures that must tie
const nm = {}; for (const d of re.definedNames.model) nm[d.name] = d.ranges?.[0];
const val = (name) => { const ref = nm[name]; if (!ref) return "(no name)";
  const m = ref.match(/^'?(.+?)'?!\$?([A-Z]+)\$?(\d+)/); if (!m) return "(?)";
  const c = re.getWorksheet(m[1])?.getCell(`${m[2]}${m[3]}`).value;
  return c && typeof c === "object" ? (c.result?.error || c.result) : c; };
console.log("\n  ties:");
for (const n of ["PL_Revenue","PL_GP","PL_EBITDA","PL_PAT","BS_TA","BS_TLE","BS_Diff","CF_Close","CF_Diff","WC_DSO","WC_CCC","VAT_Payable","CT_Charge"])
  console.log(`   ${n.padEnd(12)} ${val(n)}`);
