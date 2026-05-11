// api/log-error.js — Frontend error logger, saves to Supabase error_logs table

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(200).json({ ok: false });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { message, stack, url: pageUrl, userAgent, clientId } = body;

    await fetch(`${url}/rest/v1/error_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        message: String(message || "").slice(0, 500),
        stack:   String(stack   || "").slice(0, 2000),
        page_url: String(pageUrl || "").slice(0, 300),
        user_agent: String(userAgent || "").slice(0, 300),
        client_id: clientId || null,
        created_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: false });
  }
}
