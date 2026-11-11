// ─── WORKBOOK BUILD HELPERS ───────────────────────────────────────────────────
// Shared look and feel for the analysis workbook. Kept apart from the sheet
// content so every sheet is drawn the same way and the convention lives in
// one place.

export const T = {
  ink:      "FF1A1A2E",   // headings, near-black navy
  paper:    "FFFFFFFF",
  band:     "FF1A1A2E",   // section band fill
  sub:      "FFF2F4F7",   // sub-header fill
  rule:     "FFE5E7EB",   // borders
  muted:    "FF6B7280",

  inputFill:"FFDDEBF7",   // pale blue — type here
  inputInk: "FF1F4E79",   // blue font, the modelling convention for an input
  calcInk:  "FF1A1A2E",   // black — worked out on this sheet
  linkInk:  "FF375623",   // green — comes from another sheet
  lockFill: "FFF8F9FA",   // grey — output, leave alone

  good:     "FF067647",
  warn:     "FFB54708",
  bad:      "FFB42318",
  goodFill: "FFECFDF3",
  warnFill: "FFFFFAEB",
  badFill:  "FFFEF3F2",

  tabCover: "FF1A1A2E",
  tabInput: "FF2E90FA",
  tabMap:   "FF15B79E",
  tabCalc:  "FF667085",
  tabAnal:  "FF7A5AF8",
  tabTax:   "FFF79009",
  tabOut:   "FF12B76A",
};

export const FONT = "Calibri";
export const MONO = "Consolas";

// Number formats, one set, used everywhere.
export const NF = {
  money:  '#,##0;[Red](#,##0);"—"',
  money2: '#,##0.00;[Red](#,##0.00);"—"',
  pct:    '0.0%;[Red](0.0%);"—"',
  pct0:   '0%;[Red](0%);"—"',
  num:    '#,##0;[Red](#,##0);"—"',
  days:   '#,##0" d";[Red](#,##0)" d";"—"',
  ratio:  '0.00"x";[Red](0.00"x");"—"',
  date:   'dd-mmm-yyyy',
  text:   '@',
};

const border = (c = T.rule) => ({ style: "thin", color: { argb: c } });

/** A new sheet with the house setup already on it. */
export function sheet(wb, name, { tab, widths = [], freeze = "A5", landscape = true } = {}) {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: tab || T.tabCalc }, defaultRowHeight: 15 },
    pageSetup: { orientation: landscape ? "landscape" : "portrait",
                 fitToPage: true, fitToWidth: 1, fitToHeight: 0,
                 margins: { left:0.4, right:0.4, top:0.5, bottom:0.5, header:0.3, footer:0.3 } },
    views: freeze ? [{ state: "frozen",
                       xSplit: colOf(freeze) - 1, ySplit: rowOf(freeze) - 1,
                       showGridLines: false }]
                  : [{ showGridLines: false }],
  });
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  return ws;
}

const colOf = (ref) => {
  const m = String(ref).match(/^([A-Z]+)/i);
  let n = 0;
  for (const ch of (m ? m[1].toUpperCase() : "A")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};
const rowOf = (ref) => parseInt(String(ref).match(/(\d+)$/)?.[1] || "1", 10);

/** The title block every sheet opens with. */
export function title(ws, heading, strap, span = 10) {
  ws.mergeCells(1, 1, 1, span);
  const h = ws.getCell(1, 1);
  h.value = heading;
  h.font = { name: FONT, size: 15, bold: true, color: { argb: T.paper } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.band } };
  h.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, span);
  const s = ws.getCell(2, 1);
  s.value = strap || "";
  s.font = { name: FONT, size: 9, italic: true, color: { argb: T.muted } };
  s.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 16;
  return 3;
}

/** A grey sub-header band across the given columns. */
export function section(ws, row, text, span = 10) {
  ws.mergeCells(row, 1, row, span);
  const c = ws.getCell(row, 1);
  c.value = String(text).toUpperCase();
  c.font = { name: FONT, size: 9, bold: true, color: { argb: T.ink } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: T.sub } };
  c.alignment = { vertical: "middle", indent: 1 };
  c.border = { bottom: border() };
  ws.getRow(row).height = 18;
  return row + 1;
}

/** A column-heading row. */
export function heads(ws, row, labels, { from = 1, align = [] } = {}) {
  labels.forEach((l, i) => {
    const c = ws.getCell(row, from + i);
    c.value = l;
    c.font = { name: FONT, size: 9, bold: true, color: { argb: T.muted } };
    c.alignment = { vertical: "bottom", horizontal: align[i] || "left", wrapText: true };
    c.border = { bottom: border(T.ink) };
  });
  ws.getRow(row).height = 24;
  return row + 1;
}

const KIND = {
  input: { font: { color: { argb: T.inputInk }, bold: false },
           fill: { type:"pattern", pattern:"solid", fgColor:{ argb: T.inputFill } } },
  calc:  { font: { color: { argb: T.calcInk } } },
  link:  { font: { color: { argb: T.linkInk } } },
  lock:  { font: { color: { argb: T.calcInk }, bold: true },
           fill: { type:"pattern", pattern:"solid", fgColor:{ argb: T.lockFill } } },
  label: { font: { color: { argb: T.ink } } },
};

/**
 * Write one cell.
 * kind says what it is, and the colour follows from that — blue means you type
 * here, black means it is worked out here, green means it came from another
 * sheet. That convention is what makes a model readable by someone else.
 */
export function cell(ws, row, col, value, { kind = "calc", nf, bold, indent, align, wrap, size } = {}) {
  const c = ws.getCell(row, col);
  if (value != null) {
    c.value = (typeof value === "string" && value.startsWith("=")) ? { formula: value.slice(1) } : value;
  }
  const k = KIND[kind] || KIND.calc;
  c.font = { name: nf && nf !== NF.text ? FONT : FONT, size: size || 10,
             bold: bold ?? k.font.bold ?? false, color: k.font.color };
  if (k.fill) c.fill = k.fill;
  if (nf) c.numFmt = nf;
  c.alignment = { vertical: "middle", horizontal: align, indent, wrapText: wrap };
  c.border = { bottom: border() };
  return c;
}

/** A label in column A and a run of cells beside it. */
export function row(ws, r, label, cells = [], { bold, indent = 1, from = 2 } = {}) {
  cell(ws, r, 1, label, { kind: "label", bold, indent });
  cells.forEach((spec, i) => {
    if (spec == null) { cell(ws, r, from + i, null, {}); return; }
    const { v, ...opt } = typeof spec === "object" && !Array.isArray(spec) ? spec : { v: spec };
    cell(ws, r, from + i, v, { bold, ...opt });
  });
  return r + 1;
}

/** A total row — ruled above, bold, grey. */
export function total(ws, r, label, cells = [], opt = {}) {
  const out = row(ws, r, label, cells.map(s => ({ ...(typeof s === "object" ? s : { v: s }), kind: "lock" })),
                  { bold: true, ...opt });
  for (let c = 1; c <= Math.max(10, cells.length + 1); c++) {
    const cc = ws.getCell(r, c);
    cc.border = { top: border(T.ink), bottom: { style: "double", color: { argb: T.ink } } };
  }
  return out;
}

/** A note line, for explaining a working in plain words. */
export function note(ws, r, text, span = 10) {
  ws.mergeCells(r, 1, r, span);
  const c = ws.getCell(r, 1);
  c.value = text;
  c.font = { name: FONT, size: 9, italic: true, color: { argb: T.muted } };
  c.alignment = { vertical: "middle", indent: 1, wrapText: true };
  ws.getRow(r).height = 16;
  return r + 1;
}

/** A pass/fail check cell — the thing that tells you the model still ties. */
export function check(ws, r, label, formula, { tolerance = 1 } = {}) {
  cell(ws, r, 1, label, { kind: "label", indent: 1 });
  cell(ws, r, 2, `=${formula}`, { nf: NF.money });
  const c = cell(ws, r, 3, `=IF(ABS(B${r})<=${tolerance},"OK","CHECK")`, { bold: true, align: "center" });
  ws.addConditionalFormatting({
    ref: `C${r}`,
    rules: [
      { type:"cellIs", operator:"equal", formulae:['"OK"'], priority:1,
        style:{ font:{ color:{ argb:T.good }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.goodFill } } } },
      { type:"cellIs", operator:"equal", formulae:['"CHECK"'], priority:2,
        style:{ font:{ color:{ argb:T.bad }, bold:true },
                fill:{ type:"pattern", pattern:"solid", fgColor:{ argb:T.badFill } } } },
    ],
  });
  return r + 1;
}

/** A dropdown fed by a named range on Lists. */
export function dropdown(ws, ref, listFormula) {
  ws.dataValidations.add(ref, {
    type: "list", allowBlank: true, formulae: [listFormula],
    showErrorMessage: true, errorStyle: "warning",
    errorTitle: "Not on the list",
    error: "Pick one of the listed values, or add yours to the Lists sheet.",
  });
}

/** Red/amber/green on a column of scores or variances. */
export function rag(ws, ref, { good, bad, reverse = false } = {}) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      { type:"cellIs", operator: reverse ? "lessThan" : "greaterThanOrEqual",
        formulae:[String(good)], priority:1,
        style:{ font:{ color:{ argb:T.good }, bold:true } } },
      { type:"cellIs", operator: reverse ? "greaterThan" : "lessThan",
        formulae:[String(bad)], priority:2,
        style:{ font:{ color:{ argb:T.bad }, bold:true } } },
    ],
  });
}
