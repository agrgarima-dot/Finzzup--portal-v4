import E from 'exceljs';
const wb = new E.Workbook();
await wb.xlsx.readFile(process.argv[2]);
console.log('reopened ok —', wb.worksheets.length, 'sheets');
const names = wb.definedNames.model.map(m => m.name);
console.log('named ranges:', names.length);
const want = ['PL_Revenue','BS_Cash','WC_DSO','VAT_Payable','CT_Charge','QF_Headroom','COA','TB_Group','Budget','R_VAT','Cl_Days'];
const missing = want.filter(n => !names.includes(n));
console.log('key names:', missing.length ? 'MISSING ' + missing.join(', ') : 'all present');

const feed = wb.getWorksheet('Portal Feed');
let ids = 0, linked = 0, waiting = 0, ranges = 0;
feed.eachRow(row => {
  const id = row.getCell(1).value;
  if (typeof id !== 'string' || id === 'id (do not edit)') return;
  const v = row.getCell(4).value;
  ids++;
  if (v && v.formula) linked++;
  else if (typeof v === 'string' && v.includes('!')) ranges++;
  else waiting++;
});
console.log(`portal feed: ${ids} data points · ${linked} pull from the workings · ${ranges} ranges · ${waiting} waiting for you`);

// Colour convention actually applied?
const pl = wb.getWorksheet('P&L');
const blue = [], green = [];
pl.eachRow({ includeEmpty:true }, r => r.eachCell({ includeEmpty:true }, c => {
  const col = c.font?.color?.argb;
  if (col === 'FF1F4E79') blue.push(c.address);
  if (col === 'FF375623') green.push(c.address);
}));
console.log(`P&L: ${blue.length} input cells (blue), ${green.length} linked (green)`);
const cover = wb.getWorksheet('Cover');
console.log('cover dropdowns:', Object.keys(cover.dataValidations?.model || {}).length);
console.log('checks rows:', wb.getWorksheet('Checks').rowCount);
