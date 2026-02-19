export async function onRequest(context) {
  const { request } = context;
  const method = request.method.toUpperCase();

  if (method === "GET") return handleGet(context);
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

async function handleGet({ request, env }) {
  const url = new URL(request.url);
  const q = normalizeText(url.searchParams.get("q") || "", 80);
  const sort = (url.searchParams.get("sort") || "latest").toLowerCase();
  const page = clampInt(url.searchParams.get("page"), 1, 1, 200);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let orderBy = "created_at DESC";
  if (sort === "hot") orderBy = "comment_count DESC, created_at DESC";

  let where = "status='active'";
  const binds = [];

  if (q) {
    where += " AND (title LIKE ? OR body LIKE ? OR author_name LIKE ?)";
    const like = `%${q}%`;
    binds.push(like, like, like);
  }

  const sql = `SELECT id, title, author_name, created_at, comment_count,
      substr(replace(replace(body, char(10), ' '), char(13), ' '), 1, 140) AS snippet
    FROM posts
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  binds.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  const items = (rows?.results || []).map(r => ({
    id: r.id,
    title: r.title,
    author_name: r.author_name,
    created_at: r.created_at,
    comment_count: r.comment_count,
    snippet: r.snippet || ""
  }));

  return json({ ok: true, items, page });
}

async function handlePost({ request, env }) {
  const ip = getIP(request);
  const ipHash = await sha256B64Url(ip || "0.0.0.0");

  const payload = await request.json().catch(() => null);
  if (!payload) return json({ ok: false, error: "bad_json" }, 400);

  const title = normalizeText(payload.title, 80);
  const body = normalizeBody(payload.body, 5000);
  const author = normalizeText(payload.author_name || "익명", 20) || "익명";
  const token = payload.turnstileToken;

  if (title.length < 2) return json({ ok: false, error: "title_too_short" }, 400);
  if (body.length < 10) return json({ ok: false, error: "body_too_short" }, 400);

  // Turnstile verify
  const v = await verifyTurnstile(token, ip, env);
  if (!v.ok) return json({ ok: false, error: "turnstile_failed" }, 400);

  // Rate limit: 3 posts / 5 minutes / ip
  const now = Date.now();
  const since = now - 5 * 60 * 1000;
  const cntRow = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM posts WHERE ip_hash=? AND created_at>?"
  ).bind(ipHash, since).first();

  if (Number(cntRow?.c || 0) >= 3) return json({ ok: false, error: "rate_limited" }, 429);

  const stmt = env.DB.prepare(
    "INSERT INTO posts (title, body, author_name, ip_hash, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, 'active')"
  ).bind(title, body, author, ipHash, now, now);

  const res = await stmt.run();
  const id = res?.meta?.last_row_id;

  return json({ ok: true, id }, 201);
}
