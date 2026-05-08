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
  const { client, reportData, kpis } = body;

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
        model: "claude-opus-4-7",
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
