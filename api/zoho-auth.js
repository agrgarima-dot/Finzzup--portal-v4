// api/zoho-auth.js — Zoho Books OAuth: start the connect flow, and handle the
// callback Zoho redirects to.
//
//   GET /api/zoho-auth?action=start&clientId=<uuid>   → 302 to Zoho's consent screen
//   GET /api/zoho-auth?code=…&location=…&state=…      → Zoho's redirect back here
//
// Why the refresh token never leaves this file's reach: it grants read access
// to a client's books for as long as it lives, so it is written with the
// Supabase SERVICE ROLE key into a table that has RLS on and no policies. The
// anon key in the browser bundle cannot read it.
//
// Multi-datacentre: a Dubai client's org may sit in any of Zoho's regions. The
// callback carries `location` and `accounts-server`, and the token response
// carries `api_domain` — so the right hosts are learned at runtime and stored
// per connection rather than hardcoded.
//
// Requires: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI,
//           SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: ZOHO_SCOPES, PORTAL_URL

// Read-only scopes. Kept configurable because Zoho's scope names differ between
// its own pages and its SDKs — if the consent screen reports an invalid scope,
// correct it in ZOHO_SCOPES rather than in code.
const DEFAULT_SCOPES = [
  "ZohoBooks.accountants.READ",
  "ZohoBooks.settings.READ",
  "ZohoBooks.invoices.READ",
  "ZohoBooks.bills.READ",
  "ZohoBooks.contacts.READ",
].join(",");

const AUTH_HOST = "https://accounts.zoho.com";   // multi-DC: Zoho redirects to the org's own region

// Zoho sends back a bare location code; map it to that region's accounts host.
// `accounts-server` on the callback is authoritative when present — this is
// only the fallback.
const ACCOUNTS_BY_LOCATION = {
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  ca: "https://accounts.zohocloud.ca",
  sa: "https://accounts.zoho.sa",
  uk: "https://accounts.zoho.uk",
};

const page = (title, detail, ok) => `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"/>
<style>
  body{font-family:Inter,system-ui,sans-serif;background:#F8F9FA;color:#0F172A;margin:0;
       display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:32px;max-width:420px;text-align:center}
  h1{font-size:17px;font-weight:800;margin:0 0 8px;letter-spacing:-0.02em}
  p{font-size:13px;color:#475569;line-height:1.7;margin:0}
  .dot{width:40px;height:40px;border-radius:50%;margin:0 auto 16px;
       background:${ok ? "#05966915" : "#EF444415"};color:${ok ? "#059669" : "#EF4444"};
       font-size:20px;line-height:40px;font-weight:800}
</style></head>
<body><div class="card"><div class="dot">${ok ? "✓" : "!"}</div>
<h1>${title}</h1><p>${detail}</p></div></body></html>`;

export default async function handler(req, res) {
  const clientId     = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri  = process.env.ZOHO_REDIRECT_URI;
  const supaUrl      = process.env.SUPABASE_URL      || process.env.VITE_SUPABASE_URL;
  const supaKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !redirectUri || !supaUrl || !supaKey) {
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(page(
      "Zoho is not configured yet",
      "The portal is missing its Zoho credentials. Add them in Vercel and try again.", false));
  }

  // Supabase REST with the service role key — these two tables are invisible to anon.
  const sb = async (method, path, body) => {
    const r = await fetch(`${supaUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
        "Content-Type": "application/json",
        Prefer: method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    if (!r || !r.ok) return null;
    const text = await r.text();
    return text ? JSON.parse(text) : [];
  };

  const q = req.query || {};

  // ── Start: hand the browser to Zoho's consent screen ──────────────────────
  if (q.action === "start") {
    const forClient = String(q.clientId || "");
    if (!/^[0-9a-f-]{36}$/i.test(forClient)) return res.status(400).json({ ok: false, reason: "bad_client_id" });

    // Opaque, single-use, and tied to the client being connected — so a
    // callback cannot be replayed, or pointed at a different client's books.
    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const saved = await sb("POST", "zoho_oauth_states", { state, client_id: forClient });
    if (!saved) return res.status(500).json({ ok: false, reason: "state_not_saved" });

    const url = new URL(`${AUTH_HOST}/oauth/v2/auth`);
    url.searchParams.set("scope",         process.env.ZOHO_SCOPES || DEFAULT_SCOPES);
    url.searchParams.set("client_id",     clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri",  redirectUri);
    url.searchParams.set("state",         state);
    // offline + consent together are what actually yield a refresh token:
    // without prompt=consent Zoho returns only an access token on reconnect.
    url.searchParams.set("access_type",   "offline");
    url.searchParams.set("prompt",        "consent");

    res.setHeader("Location", url.toString());
    return res.status(302).end();
  }

  // ── Callback: exchange the code, store the connection ─────────────────────
  res.setHeader("Content-Type", "text/html");

  if (q.error) {
    return res.status(200).send(page("Connection cancelled",
      "Zoho did not grant access. Nothing was saved — you can start again from the portal.", false));
  }

  const code  = String(q.code  || "");
  const state = String(q.state || "");
  if (!code || !state) {
    return res.status(400).send(page("Something is missing",
      "Zoho's reply did not include an authorisation code. Please start again.", false));
  }

  // Redeem the state: read it, then delete it, so a second callback fails.
  const rows = await sb("GET", `zoho_oauth_states?state=eq.${encodeURIComponent(state)}&select=client_id,created_at`);
  const row  = Array.isArray(rows) ? rows[0] : null;
  await sb("DELETE", `zoho_oauth_states?state=eq.${encodeURIComponent(state)}`);
  if (!row) {
    return res.status(400).send(page("This link has expired",
      "The connection request was already used, or it is too old. Please start again from the portal.", false));
  }
  if (Date.now() - new Date(row.created_at).getTime() > 3600e3) {
    return res.status(400).send(page("This link has expired",
      "The connection request is more than an hour old. Please start again from the portal.", false));
  }

  // The org's own region — `accounts-server` is authoritative, `location` is the fallback.
  const accountsServer =
    (q["accounts-server"] && String(q["accounts-server"]).replace(/\/+$/, "")) ||
    ACCOUNTS_BY_LOCATION[String(q.location || "").toLowerCase()] ||
    AUTH_HOST;

  const tokenRes = await fetch(`${accountsServer}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      code,
    }),
  }).catch(() => null);

  const token = tokenRes ? await tokenRes.json().catch(() => null) : null;
  if (!token || !token.refresh_token) {
    // Zoho reports failures as 200 with an `error` field, so status is no guide.
    return res.status(200).send(page("Zoho did not return a refresh token",
      `The books were not connected${token?.error ? ` (${String(token.error)})` : ""}. ` +
      "This usually means the app is not set to offline access. Please start again.", false));
  }

  const apiDomain = String(token.api_domain || "https://www.zohoapis.com").replace(/\/+$/, "");

  // Which organisation(s) this login can see. An accountant's login often has
  // several — that is the point for a firm like Earningo — so the first is
  // stored to get the connection working and the rest are picked in admin.
  const orgRes = await fetch(`${apiDomain}/books/v3/organizations`, {
    headers: { Authorization: `Zoho-oauthtoken ${token.access_token}` },
  }).catch(() => null);
  const orgJson = orgRes ? await orgRes.json().catch(() => null) : null;
  const orgs    = Array.isArray(orgJson?.organizations) ? orgJson.organizations : [];
  const org     = orgs[0] || null;

  if (!org) {
    return res.status(200).send(page("No organisation found",
      "The Zoho login worked, but no Books organisation came back. Check that this login has access to the books.", false));
  }

  const stored = await sb("POST", "zoho_connections", {
    client_id:         row.client_id,
    organization_id:   String(org.organization_id),
    organization_name: org.name || null,
    refresh_token:     token.refresh_token,
    api_domain:        apiDomain,
    accounts_server:   accountsServer,
    location:          q.location ? String(q.location).toLowerCase() : null,
    connected_by:      org.email || null,
    last_sync_error:   null,
  });

  if (!stored) {
    return res.status(500).send(page("Could not save the connection",
      "Zoho authorised the connection but the portal could not store it. Please try once more.", false));
  }

  return res.status(200).send(page("Zoho Books connected",
    `${org.name || "The organisation"} is now linked. You can close this window — ` +
    `the books will appear in the portal after the first sync.`, true));
}
