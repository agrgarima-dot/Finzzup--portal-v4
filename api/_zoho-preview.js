// api/zoho-preview.js — ask a connected Zoho Books org what its data looks like.
//
//   GET /api/zoho-preview?clientId=<uuid>&adminEmail=<email>
//
// Returns, for each endpoint the sync will use: whether it answered, how many
// rows came back, and the FIELD NAMES of the first row. Never the values.
//
// Why field names only: the mapping has to be written against what Zoho
// actually returns, and its published docs and SDKs disagree. This reads the
// answer off a live org instead of guessing — without the client's figures
// leaving their own books.
//
// Requires: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, SUPABASE_URL,
//           SUPABASE_SERVICE_ROLE_KEY

import { getAccessToken, zohoGet, getConnection } from "./_zoho.js";

// Each entry: the path, and the key the list is expected to arrive under.
// A wrong key still reports the envelope's own keys, which is the useful part.
const PROBES = [
  { path: "organizations",    key: "organizations" },
  { path: "chartofaccounts",  key: "chartofaccounts", params: { showbalance: "true" } },
  { path: "invoices",         key: "invoices" },
  { path: "bills",            key: "bills" },
  { path: "contacts",         key: "contacts" },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) return res.status(200).json({ ok: false, reason: "not_configured" });

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

  const pattern = adminEmail.replace(/[%_]/g, (ch) => `\\${ch}`);
  const admins  = await sbGet(`admins?email=ilike.${encodeURIComponent(pattern)}&select=email&limit=1`);
  if (!Array.isArray(admins) || !admins.length) return res.status(401).json({ ok: false, reason: "not_admin" });

  const conn = await getConnection(supaUrl, supaKey, clientId);
  if (!conn) return res.status(200).json({ ok: false, reason: "not_connected" });

  const token = await getAccessToken(conn);
  if (!token) return res.status(200).json({ ok: false, reason: "token_refresh_failed" });

  const out = {};
  for (const probe of PROBES) {
    const body = await zohoGet(conn, token, probe.path, { per_page: 1, ...(probe.params || {}) });
    if (!body) { out[probe.path] = { ok: false, note: "no response — endpoint, scope or permission" }; continue; }

    const rows  = Array.isArray(body[probe.key]) ? body[probe.key] : null;
    const first = rows && rows[0];
    out[probe.path] = {
      ok: true,
      // Zoho reports its own failures in the body, so carry those through.
      code:        body.code ?? null,
      message:     body.message ?? null,
      envelopeKeys: Object.keys(body),
      listKey:     rows ? probe.key : null,
      rowCount:    rows ? rows.length : 0,
      // The whole point of this endpoint. Values are deliberately omitted.
      fields:      first && typeof first === "object" ? Object.keys(first).sort() : [],
    };
  }

  return res.status(200).json({
    ok: true,
    organization: conn.organization_name || conn.organization_id,
    apiDomain:    conn.api_domain,
    location:     conn.location,
    probes:       out,
  });
}
