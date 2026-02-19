export async function onRequest(context) {
  const { request } = context;
  const method = request.method.toUpperCase();
  if (method === "POST") return handlePost(context);
  return json({ ok: false, error: "method_not_allowed" }, 405);
}

function json(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  return new Response(JSON.stringify(body), { status, headers });
}

function getIP(req) {
  return req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "";
}

async function sha256B64Url(input) {
  const data = new TextEncoder().encode(String(input || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyTurnstile(token, ip, env) {
  const secret = String(env.TURNSTILE_SECRET || "").trim();
  if (!secret) return { ok: false, reason: "missing_secret" };
  const t = String(token || "").trim();
  if (!t) return { ok: false, reason: "missing_token" };

  const fd = new FormData();
  fd.append("secret", secret);
  fd.append("response", t);
  if (ip) fd.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: fd
  });

  const data = await res.json().catch(() => null);
  return { ok: !!data?.success, data };
}

function clampInt(v, def, min, max) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function normalizeText(s, maxLen) {
  const out = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!out) return "";
  return out.length > maxLen ? out.slice(0, maxLen) : out;
}

function normalizeBody(s, maxLen) {
  const out = String(s ?? "").replace(/\r\n/g, "\n").trim();
  if (!out) return "";
  return out.length > maxLen ? out.slice(0, maxLen) : out;
}

export async function handlePost({ request, env, params }) {
  const id = clampInt(params.id, 0, 1, 1_000_000_000);
  if (!id) return json({ ok: false, error: "bad_id" }, 400);

  const ip = getIP(request);
  const ipHash = await sha256B64Url(ip || "0.0.0.0");

  const payload = await request.json().catch(() => null);
  if (!payload) return json({ ok: false, error: "bad_json" }, 400);

  const body = normalizeBody(payload.body, 2000);
  const author = normalizeText(payload.author_name || "익명", 20) || "익명";
  const token = payload.turnstileToken;

  if (body.length < 2) return json({ ok: false, error: "body_too_short" }, 400);

  const v = await verifyTurnstile(token, ip, env);
  if (!v.ok) return json({ ok: false, error: "turnstile_failed" }, 400);

  // Ensure post exists
  const post = await env.DB.prepare(
    "SELECT id FROM posts WHERE id=? AND status='active' LIMIT 1"
  ).bind(id).first();
  if (!post) return json({ ok: false, error: "not_found" }, 404);

  // Rate limit: 8 comments / 5 minutes / ip
  const now = Date.now();
  const since = now - 5 * 60 * 1000;
  const cntRow = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM comments WHERE ip_hash=? AND created_at>?"
  ).bind(ipHash, since).first();
  if (Number(cntRow?.c || 0) >= 8) return json({ ok: false, error: "rate_limited" }, 429);

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO comments (post_id, body, author_name, ip_hash, created_at, status) VALUES (?, ?, ?, ?, ?, 'active')"
    ).bind(id, body, author, ipHash, now),
    env.DB.prepare(
      "UPDATE posts SET comment_count = comment_count + 1, updated_at=? WHERE id=?"
    ).bind(now, id)
  ]);

  return json({ ok: true }, 201);
}
