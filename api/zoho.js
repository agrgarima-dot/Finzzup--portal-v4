// api/zoho.js — one route for the Zoho read endpoints.
//
//   /api/zoho?action=status   — is this client connected, and how did it go
//   /api/zoho?action=sync     — pull the books and map them for review
//   /api/zoho?action=preview  — report the field names a connected org returns
//
// They are behind a single route because Vercel turns every file in api/ into
// its own Serverless Function, and the Hobby plan allows twelve. Three separate
// files here pushed the deployment over that limit and every production build
// failed at the deploy step — after a clean build, which is why it looked like
// the code was fine.
//
// Two Zoho endpoints deliberately keep their own paths: zoho-auth is the
// redirect URI registered with Zoho, and zoho-refresh is the cron target.
// Changing either would mean re-registering or re-scheduling.

import status  from "./_zoho-status.js";
import sync    from "./_zoho-sync.js";
import preview from "./_zoho-preview.js";

const ACTIONS = { status, sync, preview };

export default async function handler(req, res) {
  const action = String(req.query?.action || "");
  const run = ACTIONS[action];
  if (!run) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(400).json({ ok: false, reason: "unknown_action", expected: Object.keys(ACTIONS) });
  }
  return run(req, res);
}
