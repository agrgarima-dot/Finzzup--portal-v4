// Build an empty analysis workbook from the command line.
//   node tools/build-workbook.mjs [out.xlsx]
import { buildAnalysisWorkbook } from "../src/workbook-build/index.js";

const out = process.argv[2] || "Finzzup-Analysis-Workbook.xlsx";
const wb = buildAnalysisWorkbook({});
await wb.xlsx.writeFile(out);
console.log(`${out} — ${wb.worksheets.length} sheets`);
