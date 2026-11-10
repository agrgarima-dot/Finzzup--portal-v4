// api/keepalive.js — Supabase activity ping (called by Vercel cron every 3 days)
// Prevents Supabase free tier from pausing the project due to inactivity

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../src/supabaseConfig.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Falls back to the public project coordinates. A keepalive that silently
  // does nothing because an env var is missing is worse than useless: the
  // project pauses and the portal goes down, which is the exact thing this
  // endpoint exists to prevent.
  const url  = process.env.VITE_SUPABASE_URL      || process.env.SUPABASE_URL      || SUPABASE_URL;
  const key  = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(200).json({ ok: false, reason: "supabase_not_configured" });
  }

  try {
    const r = await fetch(`${url}/rest/v1/clients?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    const alive = r.status < 500;
    return res.status(200).json({
      ok: alive,
      status: r.status,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(200).json({ ok: false, reason: err.message });
  }
}
