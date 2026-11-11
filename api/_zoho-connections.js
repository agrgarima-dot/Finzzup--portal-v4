// api/_zoho-connections.js — every Zoho Books connection on the account, and
// which client record each one belongs to.
//
// This exists because of a failure that is almost impossible to diagnose from
// the outside. A connection is attached to one client record. Create the same
// company twice — "Zoho test" and "ZOHO TEST" — connect one, then select the
// other, and every screen says there is no connection. The connection is
// right there; it is on the other record, and nothing on the screen says so.
//
// Admin only, and it never returns a token or a refresh token.

import { isAdmin } from "./_zoho.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) return res.status(200).json({ ok: false, reason: "not_configured" });

  const adminEmail = String(req.query?.adminEmail || "");
  if (!await isAdmin(supaUrl, supaKey, adminEmail)) {
    return res.status(401).json({ ok: false, reason: "not_admin" });
  }

  const r = await fetch(
    `${supaUrl}/rest/v1/zoho_connections` +
      `?select=client_id,organization_id,organization_name,last_sync_at,last_sync_error,clients(name,company,jurisdiction)`,
    { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } },
  ).catch(() => null);
  if (!r || !r.ok) return res.status(200).json({ ok: false, reason: "unreadable" });

  const rows = await r.json().catch(() => []);
  return res.status(200).json({
    ok: true,
    connections: (Array.isArray(rows) ? rows : []).map(c => ({
      clientId:     c.client_id,
      organisation: c.organization_name || c.organization_id || "",
      name:         c.clients?.name    || "",
      company:      c.clients?.company || "",
      jurisdiction: c.clients?.jurisdiction || "",
      lastSyncAt:   c.last_sync_at || null,
      lastSyncError:c.last_sync_error || null,
    })),
  });
}
