// api/_zoho.js — shared Zoho Books plumbing. Underscore-prefixed, so Vercel
// does not expose it as a route.
//
// Everything here is about getting bytes out of Zoho safely: refreshing the
// short-lived access token, calling the right regional host, and walking
// paginated lists. Turning those bytes into Finzzup's shapes happens elsewhere.

const TOKEN_TTL_MS = 55 * 60 * 1000;   // Zoho access tokens last an hour; refresh at 55 min

// Access tokens are cached per connection for the life of the warm function
// instance. A cold start just refreshes again, which is cheap; what this avoids
// is a refresh on every single request during a sync.
const tokenCache = new Map();

/**
 * Exchange a stored refresh token for a usable access token.
 * Zoho does not rotate refresh tokens on this flow, so the stored one stays valid.
 * @returns {Promise<string|null>} access token, or null with the reason logged by the caller
 */
export async function getAccessToken(conn, { clientId, clientSecret } = {}) {
  const key    = conn.id || `${conn.client_id}:${conn.organization_id}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.token;

  const r = await fetch(`${conn.accounts_server}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: conn.refresh_token,
      client_id:     clientId     || process.env.ZOHO_CLIENT_ID,
      client_secret: clientSecret || process.env.ZOHO_CLIENT_SECRET,
    }),
  }).catch(() => null);

  // Zoho answers 200 with an `error` field on failure, so the status tells us nothing.
  const j = r ? await r.json().catch(() => null) : null;
  if (!j || !j.access_token) return null;

  tokenCache.set(key, { token: j.access_token, expires: Date.now() + TOKEN_TTL_MS });
  return j.access_token;
}

/** One Books API call. Returns the parsed body, or null on any failure. */
export async function zohoGet(conn, accessToken, path, params = {}) {
  const url = new URL(`${conn.api_domain}/books/v3/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("organization_id", conn.organization_id);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  }).catch(() => null);
  if (!r || !r.ok) return null;
  return r.json().catch(() => null);
}

/**
 * Walk a paginated Books list endpoint and return every row.
 * Books wraps lists under a key named after the resource ("invoices", "bills"…)
 * and reports more pages via page_context.has_more_page.
 *
 * `cap` exists so a client with years of history cannot run the function out of
 * time or memory — the caller is told when it bit by the `truncated` flag.
 */
export async function zohoList(conn, accessToken, path, key, params = {}, cap = 5000) {
  const out = [];
  let page = 1;
  let truncated = false;

  // Bounded rather than while(true): a malformed page_context should not loop forever.
  for (; page <= 200; page++) {
    const j = await zohoGet(conn, accessToken, path, { ...params, page, per_page: 200 });
    if (!j) return { rows: out, truncated, error: `failed on page ${page}` };

    const rows = Array.isArray(j[key]) ? j[key] : [];
    out.push(...rows);

    if (out.length >= cap) { truncated = true; break; }
    if (!j.page_context?.has_more_page) break;
  }
  return { rows: out.slice(0, cap), truncated, error: null };
}

/** Read a client's connection row. Service role key only — these rows are invisible to anon. */
export async function getConnection(supaUrl, serviceKey, clientId) {
  const r = await fetch(
    `${supaUrl}/rest/v1/zoho_connections?client_id=eq.${encodeURIComponent(clientId)}&select=*&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  ).catch(() => null);
  if (!r || !r.ok) return null;
  const rows = await r.json().catch(() => null);
  return Array.isArray(rows) ? rows[0] || null : null;
}

/** Record how the last sync went, so the admin screen can show it. */
export async function markSync(supaUrl, serviceKey, connId, error) {
  await fetch(`${supaUrl}/rest/v1/zoho_connections?id=eq.${encodeURIComponent(connId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_error: error || null }),
  }).catch(() => null);
}
