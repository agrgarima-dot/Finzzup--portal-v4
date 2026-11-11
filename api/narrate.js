// api/narrate.js — AI CFO brief generation
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.VITE_ANTHROPIC_KEY || process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { client, reportData, kpis, topic, rows } = body;

  const company = client?.company || client?.name || "the client";
  const pack = client?.client_pack || "startup";
  const month = reportData?.monthLabel || "this month";

  // Build financial context from the data
  const pl = reportData?.pl || {};
  const plLines = [
    pl.revenue?.actual    ? `Revenue: ${pl.revenue.actual} (prev: ${pl.revenue.prev || "—"})` : null,
    pl.grossProfit?.actual ? `Gross Profit: ${pl.grossProfit.actual} (prev: ${pl.grossProfit.prev || "—"})` : null,
    pl.ebitda?.actual     ? `EBITDA: ${pl.ebitda.actual} (prev: ${pl.ebitda.prev || "—"})` : null,
    pl.pat?.actual        ? `Net Profit: ${pl.pat.actual} (prev: ${pl.pat.prev || "—"})` : null,
    pl.gpMargin?.actual   ? `GP Margin: ${pl.gpMargin.actual}` : null,
    pl.ebitdaMargin?.actual ? `EBITDA Margin: ${pl.ebitdaMargin.actual}` : null,
    pl.netMargin?.actual  ? `Net Margin: ${pl.netMargin.actual}` : null,
  ].filter(Boolean).join("\n");

  const varianceLines = (reportData?.variance || [])
    .filter(v => v.item && (v.budget || v.actual))
    .map(v => `  ${v.item}: Budget ${v.budget || "—"} vs Actual ${v.actual || "—"} (${v.fav ? "Favourable" : "Unfavourable"})`)
    .join("\n");

  const cashflowLines = (reportData?.cashflow || [])
    .filter(m => m.actual || m.forecast)
    .map(m => `  ${m.month}: Actual ${m.actual || "—"}, Forecast ${m.forecast || "—"}`)
    .join("\n");

  const kpiLines = Array.isArray(kpis)
    ? kpis.filter(k => k.label && k.value && k.value !== "—")
        .map(k => `  ${k.label}: ${k.value}${k.change ? ` (${k.change})` : ""}`)
        .join("\n")
    : "";

  const garimaNote = reportData?.garimaNote || reportData?.packNote || reportData?.cashflowNote || "";

  const packContext = {
    startup: "early-stage funded startup (CFO Pack)",
    msme: "growing MSME business (MSME Pack)",
    corporate: "mid-market corporate (Corporate Pack)",
    uae: "UAE-based business (UAE CFO Pack)",
    "cross-border": "cross-border India-UAE business",
  }[pack] || "business";

  // ── Commentary on an uploaded analysis ────────────────────────────────
  // A second mode: the figures come from a template the CA filled in, and the
  // job is to write about them, not to work them out. It is told so in as many
  // words — the determination is the part being paid for, and an invented
  // explanation of someone else's variance is worse than no explanation.
  if (topic && Array.isArray(rows) && rows.length) {
    const table = rows.map(r => Array.isArray(r) ? r.join(" | ") : JSON.stringify(r)).join("\n");
    const topicPrompt = `You are Garima Agarwal, a Chartered Accountant, writing a short commentary for ${company} on the ${topic} you have just prepared.

The figures below are YOUR analysis. Write about them. Do not recompute them, do not
add figures that are not here, and do not speculate about causes the data does not show.
Where an explanation has been given in the rows, use it; where none has, say what the
movement is without inventing a reason for it.

${table}

Write 100 to 160 words in British English, in the first person, plainly. Lead with the
single thing that matters most. No headings, no bullet points, no greeting or sign-off.`;

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
          max_tokens: 600,
          messages: [{ role: "user", content: topicPrompt }],
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json(d);
      return res.status(200).json({ narration: d.content?.[0]?.text || "" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const prompt = `You are Garima Agarwal, a CA and virtual CFO writing a monthly CFO brief for ${company}, a ${packContext}.

Write a concise, professional CFO commentary for ${month}. It should:
- Be 3-4 paragraphs, written in first person as Garima
- Lead with the most important financial highlight or concern
- Reference specific numbers from the data (don't be vague)
- Identify 2-3 specific action items the client should take this month
- Be honest — flag concerns clearly, don't sugarcoat
- Sound like a trusted CFO, not a chatbot
- End with one forward-looking sentence about next month

Financial data for ${month}:

P&L SUMMARY:
${plLines || "No P&L data provided"}

VARIANCE ANALYSIS (Budget vs Actual):
${varianceLines || "No variance data provided"}

CASH FLOW:
${cashflowLines || "No cashflow data provided"}

KEY METRICS:
${kpiLines || "No KPI data provided"}

${garimaNote ? `GARIMA'S EXISTING NOTES (incorporate if relevant):\n${garimaNote}` : ""}

Write the CFO brief now. No preamble, no labels — just the commentary text.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const narration = data.content?.[0]?.text || "";
    return res.status(200).json({ narration });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
