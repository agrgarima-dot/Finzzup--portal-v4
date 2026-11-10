// api/zoho-refresh.js — scheduled refresh of the live figures.
//
// Runs daily. For every client with a Zoho connection it pulls the chart of
// accounts and invoices and writes the facts layer — cash, receivables,
// payables, overdue invoices, invoiced this month — to live_snapshots.
//
// IT DOES NOT TOUCH report_data. Statements, commentary and action points are
// reviewed work and are written only when a Chartered Accountant publishes.
// A job that could quietly change what a client reads as advice would undo the
// whole point of the product.
//
// Also keeps the Supabase project awake: it queries the database on every run,
// which is what /api/keepalive exists for, so this replaces that cron rather
// than adding a fourth one.
//
// POST { dryRun: true } to see what it would write without writing it.
//
// Requires: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, SUPABASE_URL,
//           SUPABASE_SERVICE_ROLE_KEY

import { getAccessToken, zohoList, markSync } from "./_zoho.js";
import { accountsToTrialBalance, liveSnapshot } from "../src/zohomap.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) return res.status(200).json({ ok: false, reason: "not_configured" });

  const body = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
    : {};
  const dryRun = body.dryRun === true;

  const sb = (method, path, payload) => fetch(`${supaUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: supaKey, Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  }).catch(() => null);

  const connRes = await sb("GET", "zoho_connections?select=*");
  if (!connRes || !connRes.ok) return res.status(200).json({ ok: false, reason: "connections_unreadable" });
  const connections = await connRes.json().catch(() => []);

  const results = [];
  for (const conn of connections) {
    const token = await getAccessToken(conn);
    if (!token) {
      await markSync(supaUrl, supaKey, conn.id, "Zoho refused the stored credentials — the connection may have been revoked.");
      results.push({ client_id: conn.client_id, ok: false, reason: "token_refresh_failed" });
      continue;
    }

    // Only what the facts layer needs. Bills and contacts are not read here —
    // nothing on the live strip depends on them, and every call costs rate limit.
    const accounts = await zohoList(conn, token, "chartofaccounts", "chartofaccounts", { showbalance: "true" });
    const invoices = await zohoList(conn, token, "invoices", "invoices");

    if (accounts.error) {
      await markSync(supaUrl, supaKey, conn.id, `Live refresh failed: ${accounts.error}`);
      results.push({ client_id: conn.client_id, ok: false, reason: accounts.error });
      continue;
    }

    const tb   = accountsToTrialBalance(accounts.rows);
    const snap = liveSnapshot(tb.rows, invoices.rows);

    if (!dryRun) {
      await sb("POST", "live_snapshots", {
        client_id: conn.client_id,
        data: snap,
        updated_at: new Date().toISOString(),
        error: invoices.error || null,
      });
      await markSync(supaUrl, supaKey, conn.id, null);
    }
    results.push({ client_id: conn.client_id, ok: true, snapshot: snap });
  }

  return res.status(200).json({
    ok: true, dryRun, connections: connections.length,
    refreshed: results.filter(r => r.ok).length,
    results,
  });
}
