// Build the Finzzup analysis workbook.
//   node tools/build-workbook.mjs [out.xlsx]
import ExcelJS from "exceljs";
import { cover, howTo, lists, checks } from "./wb-core.mjs";
import { coaMap, tbInput, arInput, apInput, assumptions } from "./wb-inputs.mjs";
import { pnl, balanceSheet, cashFlow, workingCapital, ratios } from "./wb-calc.mjs";
import { variance, vertical, trend, scenarios, cash13, unitEconomics,
         concentration, treasury } from "./wb-analysis.mjs";
import { uaeVat, uaeCT, uaeQfzp, uaeRpt, uaeRevRecon, indiaTax } from "./wb-tax.mjs";
import { portalFeed } from "./wb-feed.mjs";

const out = process.argv[2] || "Finzzup-Analysis-Workbook.xlsx";

const wb = new ExcelJS.Workbook();
wb.creator = "Finzzup";
wb.created = new Date();
wb.properties.date1904 = false;
wb.calcProperties.fullCalcOnLoad = true;   // so formulas show values on open

// Order matters: it is the order the work happens in.
cover(wb);
howTo(wb);
lists(wb);

coaMap(wb);
tbInput(wb);
arInput(wb);
apInput(wb);
assumptions(wb);

pnl(wb);
balanceSheet(wb);
cashFlow(wb);
workingCapital(wb);
ratios(wb);

variance(wb);
vertical(wb);
trend(wb);
scenarios(wb);
cash13(wb);
unitEconomics(wb);
concentration(wb);
treasury(wb);

uaeVat(wb);
uaeCT(wb);
uaeQfzp(wb);
uaeRpt(wb);
uaeRevRecon(wb);
indiaTax(wb);

portalFeed(wb);
checks(wb);

await wb.xlsx.writeFile(out);
console.log(`${out} — ${wb.worksheets.length} sheets`);
for (const ws of wb.worksheets) console.log(`  ${ws.name}`.padEnd(28), ws.rowCount, "rows");
