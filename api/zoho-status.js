// api/zoho-status.js — is this client's Zoho Books connected, and how did the
// last sync go?
//
// The admin screen cannot read zoho_connections directly: that table has RLS on
// with no policies, so the anon key in the browser is refused. This endpoint
// reads it with the service role key and returns only the harmless fields.
// The refresh token is never part of a response.
//
//   GET /api/zoho-status?clientId=<uuid>&adminEmail=<email>
//
// NOTE ON AUTH: the caller is checked against the admins table. That is the same
// level of protection the rest of the portal's endpoints use — it stops casual
// probing, not a determined attacker. Worth hardening once there are real
// clients behind it.
//
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Zoho not set up yet is a normal state, not an error. Name the variables that
  // are actually missing rather than listing all of them — otherwise the screen
  // sends you hunting through settings you have already filled in. Only names
  // are reported, never values.
  const missing = [
    !supaUrl                        && "SUPABASE_URL",
    !supaKey                        && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.ZOHO_CLIENT_ID     && "ZOHO_CLIENT_ID",
    !process.env.ZOHO_CLIENT_SECRET && "ZOHO_CLIENT_SECRET",
    !process.env.ZOHO_REDIRECT_URI  && "ZOHO_REDIRECT_URI",
  ].filter(Boolean);

  if (missing.length) {
    return res.status(200).json({ ok: true, configured: false, connected: false, missing });
  }

  const clientId   = String(req.query?.clientId   || "");
  const adminEmail = String(req.query?.adminEmail || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return res.status(400).json({ ok: false, reason: "bad_client_id" });
  if (!adminEmail) return res.status(401).json({ ok: false, reason: "no_admin" });

  const sbGet = async (path) => {
    const r = await fetch(`${supaUrl}/rest/v1/${path}`, {
      headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
    }).catch(() => null);
    return r?.ok ? r.json().catch(() => null) : null;
  };

  // Case-insensitive, because the admins row was typed by hand and the sign-in
  // path does not lowercase. Matching exactly against a lowercased email would
  // reject "Garima@..." and report the account as not an admin, which it is.
  // % and _ are PostgREST wildcards, so neutralise them before the match.
  const pattern = adminEmail.replace(/[%_]/g, (ch) => `\\${ch}`);
  const admins = await sbGet(`admins?email=ilike.${encodeURIComponent(pattern)}&select=email&limit=1`);
  if (!Array.isArray(admins) || !admins.length) return res.status(401).json({ ok: false, reason: "not_admin" });

  const rows = await sbGet(
    `zoho_connections?client_id=eq.${encodeURIComponent(clientId)}` +
    `&select=organization_id,organization_name,location,connected_by,last_sync_at,last_sync_error,created_at&limit=1`
  );
  const conn = Array.isArray(rows) ? rows[0] : null;

  return res.status(200).json({
    ok: true,
    configured: true,
    connected: !!conn,
    connection: conn || null,
  });
}
