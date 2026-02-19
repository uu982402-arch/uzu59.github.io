export async function onRequest(context) {
  const { request } = context;
  const method = request.method.toUpperCase();
  if (method === "GET") return handleGet(context);
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

function clampInt(v, def, min, max) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

async function handleGet({ env, params }) {
  const id = clampInt(params.id, 0, 1, 1_000_000_000);
  if (!id) return json({ ok: false, error: "bad_id" }, 400);

  const post = await env.DB.prepare(
    "SELECT id, title, body, author_name, created_at, updated_at, comment_count FROM posts WHERE id=? AND status='active' LIMIT 1"
  ).bind(id).first();

  if (!post) return json({ ok: false, error: "not_found" }, 404);

  const commentsRes = await env.DB.prepare(
    "SELECT id, post_id, body, author_name, created_at FROM comments WHERE post_id=? AND status='active' ORDER BY created_at DESC LIMIT 200"
  ).bind(id).all();

  const comments = (commentsRes?.results || []).map(c => ({
    id: c.id,
    post_id: c.post_id,
    body: c.body,
    author_name: c.author_name,
    created_at: c.created_at
  }));

  return json({ ok: true, post, comments });
}
