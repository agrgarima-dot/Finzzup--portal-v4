// api/zoho-sync.js — pull a connected client's books from Zoho and return them
// in the shapes the review screen already understands.
//
//   GET /api/zoho-sync?clientId=<uuid>&adminEmail=<email>
//
// THIS ENDPOINT PUBLISHES NOTHING. It fetches, maps, and hands the result back
// for review. What reaches a client's dashboard is still decided by a person
// pressing Apply — the machine prepares, the Chartered Accountant signs.
//
// Requires: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, SUPABASE_URL,
//           SUPABASE_SERVICE_ROLE_KEY

import { getAccessToken, zohoList, getConnection, isAdmin, markSync } from "./_zoho.js";
import { accountsToTrialBalance, invoicesToReceivables, invoicesToRevenue,
         contactsToRegisters, qfzpSplit, billsToPayables, billsToSupplierSpend } from "../src/zohomap.js";

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
  const adminEmail = String(req.query?.adminEmail || "");
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return res.status(400).json({ ok: false, reason: "bad_client_id" });
  if (!await isAdmin(supaUrl, supaKey, adminEmail)) return res.status(401).json({ ok: false, reason: "not_admin" });

  const conn = await getConnection(supaUrl, supaKey, clientId);
  if (!conn) return res.status(200).json({ ok: false, reason: "not_connected" });

  const token = await getAccessToken(conn);
  if (!token) {
    await markSync(supaUrl, supaKey, conn.id, "Could not refresh the Zoho token — the connection may have been revoked.");
    return res.status(200).json({ ok: false, reason: "token_refresh_failed" });
  }

  // Fetched in series rather than in parallel: Zoho rate-limits per org, and a
  // burst of four concurrent paginated walks is the quickest way to get a 429
  // halfway through a sync.
  const accountsRes = await zohoList(conn, token, "chartofaccounts", "chartofaccounts", { showbalance: "true" });
  const invoicesRes = await zohoList(conn, token, "invoices", "invoices");
  const billsRes    = await zohoList(conn, token, "bills", "bills");
  const contactsRes = await zohoList(conn, token, "contacts", "contacts");

  const firstError = [accountsRes, invoicesRes, billsRes, contactsRes].find(r => r.error);
  if (accountsRes.error) {
    await markSync(supaUrl, supaKey, conn.id, `Chart of accounts could not be read: ${accountsRes.error}`);
    return res.status(200).json({ ok: false, reason: "fetch_failed", detail: accountsRes.error });
  }

  const tb        = accountsToTrialBalance(accountsRes.rows);
  const receivab  = invoicesToReceivables(invoicesRes.rows);
  const revenue   = invoicesToRevenue(invoicesRes.rows);
  const payables  = billsToPayables(billsRes.rows);
  const supplier  = billsToSupplierSpend(billsRes.rows);
  const registers = contactsToRegisters(contactsRes.rows);
  const qfzp      = qfzpSplit(invoicesRes.rows, contactsRes.rows);

  // A partial read is reported, not hidden. Reviewing a sync that silently
  // stopped at page three is worse than knowing it did.
  const truncated = [
    accountsRes.truncated && "chart of accounts",
    invoicesRes.truncated && "invoices",
    billsRes.truncated    && "bills",
    contactsRes.truncated && "contacts",
  ].filter(Boolean);

  await markSync(supaUrl, supaKey, conn.id, firstError ? `Partial sync: ${firstError.error}` : null);

  return res.status(200).json({
    ok: true,
    organisation: conn.organization_name || conn.organization_id,
    fetchedAt: new Date().toISOString(),
    counts: {
      accounts: accountsRes.rows.length,
      invoices: invoicesRes.rows.length,
      bills:    billsRes.rows.length,
      contacts: contactsRes.rows.length,
    },
    truncated,
    // Errors on the secondary endpoints do not stop the sync — a missing bills
    // scope should not cost you the trial balance.
    partialErrors: {
      invoices: invoicesRes.error || null,
      bills:    billsRes.error    || null,
      contacts: contactsRes.error || null,
    },
    trialBalance: tb,
    receivables:  receivab,
    payables,
    supplierSpend: supplier,
    revenue,
    registers,
    qfzp,
  });
}
