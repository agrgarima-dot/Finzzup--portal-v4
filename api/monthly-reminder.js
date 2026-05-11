// api/monthly-reminder.js — Monthly data-upload reminder to all active clients
// Triggered by Vercel cron on the 1st of every month at 07:00 UTC
// Requires: RESEND_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SUPABASE_* variants)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Allow manual POST trigger (e.g. from admin "Send Now" button) + cron GET
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const supaUrl = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL;
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM || "Garima · Finzzup <garima@finzzup.org>";
  const portalUrl = process.env.PORTAL_URL || "https://portal.finzzup.org";

  if (!supaUrl || !supaKey || !resendKey) {
    return res.status(200).json({ ok: false, reason: "missing_env_vars" });
  }

  // Fetch active clients with email addresses
  const clientsRes = await fetch(`${supaUrl}/rest/v1/clients?select=id,company,contact_name,email,client_pack,invite_code&is_active=eq.true`, {
    headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
  }).catch(() => null);

  if (!clientsRes?.ok) {
    return res.status(200).json({ ok: false, reason: "supabase_error" });
  }

  const clients = await clientsRes.json();
  const activeWithEmail = (clients || []).filter(c => c.email && c.email.includes("@"));

  if (!activeWithEmail.length) {
    return res.status(200).json({ ok: true, sent: 0, reason: "no_clients_with_email" });
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleString("en-IN", { month: "long", year: "numeric" });

  let sent = 0;
  const errors = [];

  for (const client of activeWithEmail) {
    const name = client.contact_name || client.company || "there";
    const company = client.company || "";
    const pack = client.client_pack || "startup";

    const checklistItems = {
      startup:   ["Bank statement (full month)", "Revenue invoices / MIS", "Payroll summary", "Expenses list or Tally export", "Any new loans / investments"],
      msme:      ["Tally / ERP export (P&L + Balance Sheet)", "Bank statement", "GST returns (GSTR-1 / GSTR-3B)", "Debtor / creditor ageing list", "Stock / inventory statement"],
      corporate: ["Board-approved MIS report", "Auditor review comments (if any)", "Bank statements (all accounts)", "Statutory payments made (TDS, PF, ESI, GST)", "Capex / new contracts signed"],
      uae:       ["Bank statement (AED + foreign)", "VAT return workings", "Sales invoices (UAE & export)", "Payroll WPS report", "Any related-party transactions"],
    };

    const items = (checklistItems[pack] || checklistItems.startup)
      .map(i => `<li style="margin-bottom:6px;font-size:13px;color:#374151">${i}</li>`)
      .join("");

    const subject = `Action needed: Send your ${prevMonth} financials — ${company}`;
    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;background:#ffffff">
  <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:28px 32px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.03em">Finz<span style="opacity:0.8">zup</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;margin-top:2px">Your CFO · On Demand</div>
  </div>
  <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827">Time to send your ${prevMonth} numbers 📊</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.7">
      Hi ${name},<br/><br/>
      It's that time of the month! Please share your <strong>${prevMonth}</strong> financials so I can prepare your CFO report and dashboard update for <strong>${monthName}</strong>.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">📋 What to send</div>
      <ul style="margin:0;padding-left:20px">${items}</ul>
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.7">
      Upload via the Documents section of your portal, or simply reply to this email with the files attached.
    </p>
    <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#7C3AED);
      color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;
      box-shadow:0 4px 14px rgba(37,99,235,0.3)">
      Open My Portal →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.7">
      Questions? Reply to this email or use the chat in your portal.<br/>
      Your invite code: <strong style="color:#374151">${client.invite_code || "—"}</strong>
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
      if (r.ok) sent++;
      else errors.push({ client: company, status: r.status });
    } catch (err) {
      errors.push({ client: company, error: err.message });
    }
  }

  return res.status(200).json({ ok: true, sent, total: activeWithEmail.length, errors });
}
