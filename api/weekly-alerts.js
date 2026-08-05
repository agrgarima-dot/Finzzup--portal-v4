// api/weekly-alerts.js — Weekly "what needs your attention" email
// Triggered by Vercel cron every Monday 07:00 UTC. Also accepts a manual POST
// (admin "Send Now"), optionally with { clientId } to target one client and
// { dryRun: true } to compute without sending.
//
// Only clients with at least one CRITICAL alert are emailed — a weekly note that
// fires every week regardless of state trains people to ignore it.
//
// Requires: RESEND_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// Missing env vars → {ok:false, reason:"missing_env_vars"}, never a 500.

import { computeAlerts } from "../src/alerts.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const supaUrl   = process.env.VITE_SUPABASE_URL      || process.env.SUPABASE_URL;
  const supaKey   = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from      = process.env.NOTIFY_FROM || "Garima · Finzzup <garima@finzzup.org>";
  const portalUrl = process.env.PORTAL_URL  || "https://portal.finzzup.org";

  if (!supaUrl || !supaKey) return res.status(200).json({ ok: false, reason: "missing_env_vars" });

  const body    = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
    : {};
  const dryRun  = body.dryRun === true || !resendKey;
  const onlyOne = body.clientId || null;

  const sbGet = async (path) => {
    const r = await fetch(`${supaUrl}/rest/v1/${path}`, {
      headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
    }).catch(() => null);
    return r?.ok ? r.json() : null;
  };

  const clients = await sbGet(
    `clients?select=id,company,contact_name,email,client_pack,jurisdiction,invite_code&is_active=eq.true`
  );
  if (!clients) return res.status(200).json({ ok: false, reason: "supabase_error" });

  const targets = clients.filter(c =>
    c.email && c.email.includes("@") && (!onlyOne || String(c.id) === String(onlyOne))
  );
  if (!targets.length) return res.status(200).json({ ok: true, sent: 0, reason: "no_clients_with_email" });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  let sent = 0, skipped = 0;
  const errors = [], preview = [];

  for (const client of targets) {
    const uae = client.jurisdiction === "UAE" || client.jurisdiction === "Cross-Border";

    const [kpiRows, rdRows, docRows] = await Promise.all([
      sbGet(`kpis?select=*&client_id=eq.${client.id}&order=updated_at.desc&limit=1`),
      sbGet(`report_data?select=data&client_id=eq.${client.id}&limit=1`),
      sbGet(`documents?select=name,expiry_date&client_id=eq.${client.id}&expiry_date=not.is.null&expiry_date=lte.${cutoffISO}`),
    ]);

    let reportData = {};
    const raw = rdRows?.[0]?.data;
    if (raw) { try { reportData = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { /* keep {} */ } }

    const k = kpiRows?.[0] || {};
    const kpis = [
      { label: "Revenue",      value: k.revenue },
      { label: "Gross Margin", value: k.gross_margin },
      { label: "Cash Balance", value: k.cash_balance },
      { label: "Burn Rate",    value: k.burn_rate },
      { label: "Runway",       value: k.runway },
      { label: uae ? "VAT Payable" : "ARR", value: k.arr },
    ].filter(x => x.value != null && x.value !== "");

    const alerts = computeAlerts({ kpis, reportData, uae, expiringDocs: docRows || [] });
    const critical = alerts.filter(a => a.severity === "critical");

    // Only email when something is genuinely critical.
    if (!critical.length) { skipped++; preview.push({ company: client.company, alerts: alerts.length, emailed: false }); continue; }
    preview.push({ company: client.company, alerts: alerts.length, critical: critical.length, emailed: !dryRun });
    if (dryRun) continue;

    const name = client.contact_name || client.company || "there";
    const rows = alerts.slice(0, 6).map(a => {
      const isCrit = a.severity === "critical";
      const bg = isCrit ? "#FEF2F2" : "#FFFBEB";
      const bd = isCrit ? "#FCA5A5" : "#FCD34D";
      const fg = isCrit ? "#DC2626" : "#D97706";
      return `
      <div style="background:${bg};border:1px solid ${bd};border-radius:10px;padding:14px 16px;margin-bottom:10px">
        <div style="font-size:10px;font-weight:800;color:${fg};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">
          ${isCrit ? "Critical" : "Watch"}
        </div>
        <div style="font-size:14px;font-weight:800;color:#111827;line-height:1.4">${esc(a.title)}</div>
        ${a.detail ? `<div style="font-size:12.5px;color:#6B7280;margin-top:4px;line-height:1.6">${esc(a.detail)}</div>` : ""}
        ${a.action ? `<div style="font-size:12.5px;color:${fg};font-weight:700;margin-top:6px">→ ${esc(a.action)}</div>` : ""}
      </div>`;
    }).join("");

    const subject = critical.length === 1
      ? `${critical[0].title} — ${client.company}`
      : `${critical.length} things need your attention — ${client.company}`;

    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;background:#ffffff">
  <div style="background:linear-gradient(90deg,#2563EB,#7C3AED);padding:28px 32px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.03em">Finz<span style="opacity:0.75">zup</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;margin-top:2px">Your CFO · On Demand</div>
  </div>
  <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827">This week's financial watchlist</h2>
    <p style="margin:0 0 22px;font-size:13px;color:#6B7280;line-height:1.7">
      Hi ${esc(name)}, here is what stood out in ${esc(client.company || "your business")} this week.
      Everything below is drawn from your latest numbers in the portal.
    </p>
    ${rows}
    ${alerts.length > 6 ? `<div style="font-size:12px;color:#9CA3AF;margin:-2px 0 16px">…and ${alerts.length - 6} more in your portal.</div>` : ""}
    <a href="${portalUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;
      background:linear-gradient(90deg,#2563EB,#7C3AED);color:white;text-decoration:none;
      border-radius:8px;font-weight:700;font-size:13px">Open My Dashboard →</a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.7">
      Want to talk any of these through? Just reply to this email.
    </p>
  </div>
  <div style="padding:16px 32px;font-size:11px;color:#9CA3AF;text-align:center">
    Finzzup Advisory LLP · garima@finzzup.org · Confidential
  </div>
</div>`;

    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to: [client.email], subject, html }),
      });
      if (r.ok) sent++; else errors.push({ client: client.company, status: r.status });
    } catch (err) {
      errors.push({ client: client.company, error: err.message });
    }
  }

  return res.status(200).json({
    ok: true, dryRun, sent, skipped, total: targets.length, preview, errors,
  });
}
