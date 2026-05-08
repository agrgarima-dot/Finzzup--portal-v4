// api/notify.js — Vercel serverless function
// Sends an email to Garima when a client submits a new request.
// Requires env vars: RESEND_API_KEY, GARIMA_EMAIL (optional, defaults to env)
// If RESEND_API_KEY is not set, returns {ok:false} without erroring — no UX impact.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).end();

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: "not_configured" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { clientName, company, service, email, notes } = body;

    const to   = process.env.GARIMA_EMAIL || "garima@finzzup.org";
    const from  = process.env.NOTIFY_FROM  || "Finzzup Portal <garima@finzzup.org>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New request — ${service} · ${clientName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
            <div style="background:#3B6FF7;padding:20px 28px;border-radius:10px 10px 0 0">
              <h1 style="margin:0;color:white;font-size:18px;font-weight:800">New Client Request</h1>
              <p style="margin:4px 0 0;color:#c7d7ff;font-size:13px">via Finzzup Client Portal</p>
            </div>
            <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:24px 28px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;font-size:12px;color:#6B7280;width:110px">Client</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600">${clientName}</td></tr>
                <tr><td style="padding:6px 0;font-size:12px;color:#6B7280">Company</td>
                    <td style="padding:6px 0;font-size:13px">${company}</td></tr>
                <tr><td style="padding:6px 0;font-size:12px;color:#6B7280">Service</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#3B6FF7">${service}</td></tr>
                <tr><td style="padding:6px 0;font-size:12px;color:#6B7280">Email</td>
                    <td style="padding:6px 0;font-size:13px">${email}</td></tr>
                ${notes ? `<tr><td style="padding:6px 0;font-size:12px;color:#6B7280;vertical-align:top">Notes</td>
                    <td style="padding:6px 0;font-size:13px">${notes}</td></tr>` : ""}
              </table>
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #F3F4F6;font-size:12px;color:#9CA3AF">
                Respond within 24 hours — client expects a scoped proposal.
              </div>
            </div>
          </div>
        `,
      }),
    });

    return res.status(200).json({ ok: response.ok });
  } catch (err) {
    return res.status(200).json({ ok: false, reason: err.message });
  }
}
