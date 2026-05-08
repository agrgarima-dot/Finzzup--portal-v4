// api/email.js — Transactional emails via Resend
// Templates: brief_ready, welcome
// Requires env vars: RESEND_API_KEY, NOTIFY_FROM (optional)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: "not_configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { type, to, name, company, month, inviteCode, portalUrl } = body;

  const from = process.env.NOTIFY_FROM || "Finzzup <noreply@finzzup.com>";
  const loginUrl = portalUrl || "https://finzzup-portal-v4.vercel.app";

  let subject, html;

  if (type === "brief_ready") {
    subject = `Your CFO Brief for ${month || "this month"} is ready — ${company}`;
    html = `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#111827;background:#ffffff">
  <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:28px 32px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.03em">Finz<span style="opacity:0.8">zup</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;margin-top:2px">Your CFO · On Demand</div>
  </div>
  <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827">Your CFO Brief is ready</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.6">
      Hi ${name || "there"}, Garima has published your CFO brief for <strong>${month || "this month"}</strong>.
      It covers your P&amp;L performance, variance highlights, and recommended actions for ${company || "your business"}.
    </p>
    <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#7C3AED);
      color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;
      box-shadow:0 4px 14px rgba(37,99,235,0.3)">
      View Your Brief →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.7">
      Log in with your invite code at <a href="${loginUrl}" style="color:#2563EB">${loginUrl}</a><br/>
      Questions? Reply to this email or use the chat in your portal.
    </p>
  </div>
  <div style="padding:16px 32px;font-size:11px;color:#9CA3AF;text-align:center">
    Finzzup Advisory LLP · garima@finzzup.com · Confidential
  </div>
</div>`;
  }

  else if (type === "welcome") {
    subject = `Welcome to Finzzup — your CFO portal is ready`;
    html = `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#111827;background:#ffffff">
  <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:28px 32px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.03em">Finz<span style="opacity:0.8">zup</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;margin-top:2px">Your CFO · On Demand</div>
  </div>
  <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827">Welcome, ${name || "there"}!</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;line-height:1.6">
      Your Finzzup CFO portal for <strong>${company || "your business"}</strong> is live.
      Garima will use this to share your monthly reports, financial briefs, action items, and compliance updates — all in one place.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Your login details</div>
      <div style="margin-bottom:8px">
        <span style="font-size:12px;color:#6B7280">Portal URL:</span>
        <a href="${loginUrl}" style="display:block;font-size:13px;font-weight:600;color:#2563EB;margin-top:2px">${loginUrl}</a>
      </div>
      <div>
        <span style="font-size:12px;color:#6B7280">Your invite code:</span>
        <div style="display:inline-block;margin-top:4px;padding:6px 16px;background:linear-gradient(135deg,#2563EB,#7C3AED);
          color:white;border-radius:6px;font-family:monospace;font-size:15px;font-weight:700;letter-spacing:0.1em">
          ${inviteCode || "—"}
        </div>
      </div>
    </div>
    <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#7C3AED);
      color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;
      box-shadow:0 4px 14px rgba(37,99,235,0.3)">
      Open My Portal →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.7">
      Keep your invite code private — it's your key to the portal. If you have questions,
      reply to this email or reach Garima at <a href="mailto:garima@finzzup.com" style="color:#2563EB">garima@finzzup.com</a>.
    </p>
  </div>
  <div style="padding:16px 32px;font-size:11px;color:#9CA3AF;text-align:center">
    Finzzup Advisory LLP · garima@finzzup.com
  </div>
</div>`;
  }

  else {
    return res.status(400).json({ ok: false, reason: "unknown_type" });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return res.status(200).json({ ok: r.ok });
  } catch (err) {
    return res.status(200).json({ ok: false, reason: err.message });
  }
}
