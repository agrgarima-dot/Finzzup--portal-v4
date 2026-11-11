import E from "exceljs";
import { buildAnalysisWorkbook } from "../src/workbook-build/index.js";
import { readPortalFeed, getPath } from "../src/workbook.js";

const client = { name:"Ahmed Al Rashidi", company:"Gulf Trading Company",
                 jurisdiction:"UAE", freezone:"DMCC" };
const sync = {
  trialBalance: { rows: [
    { code:"4000", name:"Sales",           type:"income",              debit:0,      credit:110000 },
    { code:"5000", name:"Materials",       type:"cost_of_goods_sold",  debit:40000,  credit:0 },
    { code:"1100", name:"Trade debtors",   type:"accounts_receivable", debit:115500, credit:0 },
    { code:"2100", name:"Trade creditors", type:"accounts_payable",    debit:0,      credit:21000 },
  ]},
  receivables: [{ name:"Current", txns:[
    { id:"INV-12", date:"2026-01-20", dueDate:"2026-02-19", desc:"Hero Motors", amount:84000 }]}],
  payables: [{ name:"Current", txns:[
    { id:"BILL-77", date:"2026-01-15", dueDate:"2026-02-14", desc:"Al Faris", amount:21000 }]}],
};

const path = process.argv[2];
await (buildAnalysisWorkbook({ client, sync })).xlsx.writeFile(path);

// ── Fill it in, the way a finished pack would be ──
const wb = new E.Workbook();
await wb.xlsx.readFile(path);
const feed = wb.getWorksheet("Portal Feed");

// Excel has not calculated the formulas (nothing opened the file), so the
// linked cells hold a formula and no result. Put real values on a handful of
// rows, as a saved pack would carry.
const put = (id, value) => {
  let hit = null;
  feed.eachRow({ includeEmpty:true }, r => { if (String(r.getCell(1).value || "") === id) hit = r; });
  if (!hit) throw new Error(`no feed row for ${id}`);
  hit.getCell(4).value = value;
  return true;
};
put("monthLabel", "January 2026");
put("pl.revenue.actual", "AED 110,000");
put("pl.grossProfit.actual", "AED 70,000");
put("workingCapital.dso", 38);
put("vat.vatPayable", 5500);
put("ct.liability", 0);
put("uaeGarimaNote", "Collections improved through January; VAT of AED 5,500 is due on 28 February.");
put("variance", "Variance!A:G");

// a couple of rows in the Variance table, as the analysis would leave them
const v = wb.getWorksheet("Variance");
let vr = 0;
v.eachRow({ includeEmpty:true }, r => { if (String(r.getCell(1).value || "") === "Revenue") vr = r.number; });
v.getRow(vr).getCell(2).value = 120000;
v.getRow(vr).getCell(3).value = 110000;
v.getRow(vr).getCell(7).value = "Two orders slipped into February.";
v.getRow(vr + 1).getCell(2).value = 45000;
v.getRow(vr + 1).getCell(3).value = 40000;

await wb.xlsx.writeFile(path);

// ── Now read it the way the portal will ──
const re = new E.Workbook();
await re.xlsx.readFile(path);
const byName = {};
for (const ws of re.worksheets) {
  const aoa = [];
  ws.eachRow({ includeEmpty:true }, row => {
    const r = [];
    row.eachCell({ includeEmpty:true }, c => {
      const v = c.value;
      r.push(v && typeof v === "object" && "formula" in v ? (v.result ?? "") : (v ?? ""));
    });
    aoa[row.number - 1] = r;
  });
  byName[ws.name] = aoa;
}

const out = readPortalFeed(byName, { uae:true, reportData:{}, kpis:{} });
console.log("feed found:", !!out);
console.log("figures changed:", out.changed.length);
console.log("problems:", out.problems.length ? out.problems : "none");
console.log("\nby screen:");
for (const s of out.summary) console.log(`  ${String(s.changed).padStart(2)}  ${s.screen}`);

const checks = [
  ["monthLabel",               out.reportData.monthLabel,                            "January 2026"],
  ["pl.revenue.actual",        getPath(out.reportData, "pl.revenue.actual"),          "AED 110,000"],
  ["workingCapital.dso",       String(getPath(out.reportData, "workingCapital.dso")), "38"],
  ["vat.vatPayable",           String(getPath(out.reportData, "vat.vatPayable")),     "5500"],
  ["uaeGarimaNote starts",     String(out.reportData.uaeGarimaNote || "").slice(0,19),"Collections improve"],
  ["variance rows",            String((out.reportData.variance || []).length),        "8"],
  ["variance[0].budget",       String(out.reportData.variance?.[0]?.budget),          "120000"],
  ["variance[0].comment",      String(out.reportData.variance?.[0]?.metric),          "Revenue"],
];
console.log();
let bad = 0;
for (const [n, got, want] of checks) {
  const ok = String(got) === String(want);
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${n.padEnd(24)} ${JSON.stringify(got)}${ok ? "" : `  expected ${JSON.stringify(want)}`}`);
}
console.log(bad ? `\n${bad} FAILED` : "\nround trip clean");
