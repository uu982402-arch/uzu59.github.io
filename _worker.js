// 88ST Cloud Pages Advanced Mode Worker (_worker.js)
// Community board API: D1 + Turnstile
// - /api/posts        GET(list) / POST(create)
// - /api/posts/:id    GET(detail)
// - /api/posts/:id/comments  POST(create)
// - /api/health       GET(debug)

let __schemaReady = false;

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      // Normalize: collapse repeated trailing slashes (but keep root '/').
      const rawPath = url.pathname || '/';
      const path = rawPath.replace(/\/+$/, '') || '/';
      const method = request.method.toUpperCase();

      // Fix: Chrome/Edge speculative prefetch can receive a Cloudflare "speculation refused" 503 and then
      // poison subsequent navigations ("503 from prefetch cache").
      // We normalize speculative requests by stripping purpose headers before serving from Pages assets.
      if (method === 'GET') {
        const secPurpose = (request.headers.get('Sec-Purpose') || request.headers.get('sec-purpose') || '').toLowerCase();
        const purpose = (request.headers.get('Purpose') || request.headers.get('purpose') || '').toLowerCase();
        const dest = (request.headers.get('Sec-Fetch-Dest') || request.headers.get('sec-fetch-dest') || '').toLowerCase();
        const accept = (request.headers.get('Accept') || request.headers.get('accept') || '').toLowerCase();
        const isPrefetch = secPurpose.includes('prefetch') || purpose === 'prefetch';
        const isDoc = dest === 'document' || accept.includes('text/html');
        if (isPrefetch && isDoc) {
          const h = new Headers(request.headers);
          // Strip speculation/prefetch intent headers so Pages asset serving treats it as a normal navigation.
          h.delete('Purpose');
          h.delete('purpose');
          h.delete('Sec-Purpose');
          h.delete('sec-purpose');
          h.delete('Sec-Speculation-Tags');
          h.delete('sec-speculation-tags');
          const cleanReq = new Request(url.toString(), { method: 'GET', headers: h, redirect: 'follow' });
          return env.ASSETS.fetch(cleanReq);
        }
      }

      // Preflight / defensive
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }

      // Debug endpoint (lets you confirm worker is active)
      if (path === '/api/health') {
        const hasDB = !!getDB(env);
        const hasTS = !!String(env.TURNSTILE_SECRET || '').trim();
        return json({ ok: true, service: '88st-community', hasDB, hasTurnstileSecret: hasTS, ts: Date.now() }, 200, corsHeaders(request));
      }

      // API routing (never fall through to static for /api/*)
      if (path === '/api/posts') {
        if (method === 'GET') return handlePostsGet(request, env);
        if (method === 'POST') return handlePostsPost(request, env);
        return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      const mPost = path.match(/^\/api\/posts\/(\d+)$/);
      if (mPost) {
        if (method === 'GET') return handlePostGet(request, env, Number(mPost[1]));
        return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      const mC = path.match(/^\/api\/posts\/(\d+)\/comments$/);
      if (mC) {
        if (method === 'POST') return handleCommentPost(request, env, Number(mC[1]));
        return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      if (path.startsWith('/api/')) {
        return json({ ok: false, error: 'not_found' }, 404, corsHeaders(request));
      }

// TEMP: Community routes disabled (redirect to home)
if (path === '/community' || path.startsWith('/community/')) {
  const target = url.origin + '/';
  return Response.redirect(target, 302);
}


      // OPS deploy patch config: always no-store (fast operations)
      if (path === '/assets/config/ops.dom.patch.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }

      // CERT landing deploy config: always no-store (operational swaps)
      if (path === '/assets/config/cert.landing.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }
      // Static fallthrough
      return env.ASSETS.fetch(request);

    } catch (e) {
      return json({ ok: false, error: 'worker_error', message: String(e?.message || e) }, 500);
    }
  }
};

function corsHeaders(request) {
  // Same-origin is expected, but keep permissive for safety.
  const origin = request.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400'
  };
}

function json(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders
  });
  return new Response(JSON.stringify(body), { status, headers });
}

function getDB(env) {
  // primary binding name is expected to be "DB"
  return env.DB || env["88stcloud"] || env.db || env.D1 || null;
}

async function ensureSchema(db) {
  if (!db) return;
  if (__schemaReady) return;

  // Safe: CREATE IF NOT EXISTS. Runs once per isolate.
  const schemaSQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board TEXT NOT NULL DEFAULT 'promo',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  ip_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  ip_hash TEXT,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_board_created ON posts(board, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_board_created ON posts(status, board, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
`;

  try {
    // D1 supports multi-statement exec.
    await db.exec(schemaSQL);
  } catch (e) {
    // If exec isn't available or fails, fall back to single statements.
    // (Keeps compatibility across D1 API changes.)
    try {
      await db.prepare("PRAGMA foreign_keys = ON").run();
      await db.prepare("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, board TEXT NOT NULL DEFAULT 'promo', title TEXT NOT NULL, body TEXT NOT NULL, author_name TEXT NOT NULL, ip_hash TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', like_count INTEGER NOT NULL DEFAULT 0, comment_count INTEGER NOT NULL DEFAULT 0)").run();
      await db.prepare("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, body TEXT NOT NULL, author_name TEXT NOT NULL, ip_hash TEXT, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active')").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, created_at DESC)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_posts_board_created ON posts(board, created_at DESC)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_posts_status_board_created ON posts(status, board, created_at DESC)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC)").run();
    } catch (_) {}
  }

  // If you created schema earlier without board column, ensure it's present.
  try { await db.prepare("ALTER TABLE posts ADD COLUMN board TEXT NOT NULL DEFAULT 'promo'").run(); } catch (_) {}

  __schemaReady = true;
}

function normBoard(v) {
  const b = String(v || '').trim().toLowerCase();
  return (b === 'promo') ? 'promo' : 'free';
}

function clampInt(v, def = 0, min = 0, max = 999999999) {
  const n = parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function normalizeText(v, maxLen) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s.slice(0, maxLen);
}

function normalizeBody(v, maxLen) {
  let s = String(v ?? '').trim();
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/[ \t]{3,}/g, '  ');
  return s.slice(0, maxLen);
}

function getIP(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || '';
}

async function sha256B64Url(input) {
  const buf = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(hash);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function verifyTurnstile(token, ip, env) {
  const secret = String(env.TURNSTILE_SECRET || '').trim();
  if (!secret) return { ok: false, reason: 'missing_secret' };

  const t = String(token || '').trim();
  if (!t) return { ok: false, reason: 'missing_token' };

  const fd = new FormData();
  fd.append('secret', secret);
  fd.append('response', t);
  if (ip) fd.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: fd
  });
  const data = await res.json().catch(() => null);
  return { ok: !!data?.success, data };
}

async function handlePostsGet(request, env) {
  const db = getDB(env);
  if (!db) return json({ ok: false, error: 'missing_db_binding' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const url = new URL(request.url);
  const q = normalizeText(url.searchParams.get('q') || '', 80);
  const sort = String(url.searchParams.get('sort') || 'latest').toLowerCase();
  const board = normBoard(url.searchParams.get('board') || url.searchParams.get('b') || 'free');
  const page = clampInt(url.searchParams.get('page'), 1, 1, 200);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let orderBy = 'created_at DESC';
  if (sort === 'hot') orderBy = 'comment_count DESC, created_at DESC';

  let where = "status='active' AND board=?";
  const binds = [board];

  if (q) {
    where += " AND (title LIKE ? OR body LIKE ? OR author_name LIKE ?)";
    const like = `%${q}%`;
    binds.push(like, like, like);
  }

  const sql = `SELECT id, board, title, author_name, created_at, comment_count,
      substr(replace(replace(body, char(10), ' '), char(13), ' '), 1, 140) AS snippet
    FROM posts
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  binds.push(pageSize, offset);

  const rows = await db.prepare(sql).bind(...binds).all();
  const items = (rows?.results || []).map(r => ({
    id: r.id,
    board: r.board || board,
    title: r.title,
    author_name: r.author_name,
    created_at: r.created_at,
    comment_count: r.comment_count,
    snippet: r.snippet || ''
  }));

  return json({ ok: true, items, page, board }, 200, corsHeaders(request));
}

async function handlePostsPost(request, env) {
  const db = getDB(env);
  if (!db) return json({ ok: false, error: 'missing_db_binding' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const ip = getIP(request);
  const ipHash = await sha256B64Url(ip || '0.0.0.0');

  const payload = await request.json().catch(() => null);
  if (!payload) return json({ ok: false, error: 'bad_json' }, 400, corsHeaders(request));

  const board = normBoard(payload.board || 'free');
  const title = normalizeText(payload.title, 80);
  const body = normalizeBody(payload.body, 5000);
  const author = normalizeText(payload.author_name || '익명', 20) || '익명';
  const token = payload.turnstileToken;

  if (title.length < 2) return json({ ok: false, error: 'title_too_short' }, 400, corsHeaders(request));
  if (body.length < 10) return json({ ok: false, error: 'body_too_short' }, 400, corsHeaders(request));

  const v = await verifyTurnstile(token, ip, env);
  if (!v.ok) return json({ ok: false, error: 'turnstile_failed', reason: v.reason }, 400, corsHeaders(request));

  // rate limit: 3 posts / 5m / ip
  const now = Date.now();
  const since = now - 5 * 60 * 1000;
  const cntRow = await db.prepare(
    'SELECT COUNT(*) AS c FROM posts WHERE ip_hash=? AND created_at>?'
  ).bind(ipHash, since).first();

  if (Number(cntRow?.c || 0) >= 3) return json({ ok: false, error: 'rate_limited' }, 429, corsHeaders(request));

  const res = await db.prepare(
    "INSERT INTO posts (board, title, body, author_name, ip_hash, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')"
  ).bind(board, title, body, author, ipHash, now, now).run();

  const id = res?.meta?.last_row_id;
  return json({ ok: true, id, board }, 201, corsHeaders(request));
}

async function handlePostGet(request, env, id) {
  const db = getDB(env);
  if (!db) return json({ ok: false, error: 'missing_db_binding' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const pid = clampInt(id, 0, 1, 1_000_000_000);
  if (!pid) return json({ ok: false, error: 'bad_id' }, 400, corsHeaders(request));

  const post = await db.prepare(
    "SELECT id, board, title, body, author_name, created_at, updated_at, comment_count FROM posts WHERE id=? AND status='active' LIMIT 1"
  ).bind(pid).first();

  if (!post) return json({ ok: false, error: 'not_found' }, 404, corsHeaders(request));

  const commentsRes = await db.prepare(
    "SELECT id, post_id, body, author_name, created_at FROM comments WHERE post_id=? AND status='active' ORDER BY created_at DESC LIMIT 200"
  ).bind(pid).all();

  const comments = (commentsRes?.results || []).map(c => ({
    id: c.id,
    post_id: c.post_id,
    body: c.body,
    author_name: c.author_name,
    created_at: c.created_at
  }));

  return json({ ok: true, post, comments }, 200, corsHeaders(request));
}

async function handleCommentPost(request, env, id) {
  const db = getDB(env);
  if (!db) return json({ ok: false, error: 'missing_db_binding' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const pid = clampInt(id, 0, 1, 1_000_000_000);
  if (!pid) return json({ ok: false, error: 'bad_id' }, 400, corsHeaders(request));

  const ip = getIP(request);
  const ipHash = await sha256B64Url(ip || '0.0.0.0');

  const payload = await request.json().catch(() => null);
  if (!payload) return json({ ok: false, error: 'bad_json' }, 400, corsHeaders(request));

  const body = normalizeBody(payload.body, 2000);
  const author = normalizeText(payload.author_name || '익명', 20) || '익명';
  const token = payload.turnstileToken;

  if (body.length < 2) return json({ ok: false, error: 'body_too_short' }, 400, corsHeaders(request));

  const v = await verifyTurnstile(token, ip, env);
  if (!v.ok) return json({ ok: false, error: 'turnstile_failed', reason: v.reason }, 400, corsHeaders(request));

  const post = await db.prepare(
    "SELECT id FROM posts WHERE id=? AND status='active' LIMIT 1"
  ).bind(pid).first();

  if (!post) return json({ ok: false, error: 'not_found' }, 404, corsHeaders(request));

  // rate limit: 8 comments / 5m / ip
  const now = Date.now();
  const since = now - 5 * 60 * 1000;
  const recent = await db.prepare(
    'SELECT COUNT(*) AS c FROM comments WHERE ip_hash=? AND created_at>?'
  ).bind(ipHash, since).first();

  if (Number(recent?.c || 0) >= 8) return json({ ok: false, error: 'rate_limited' }, 429, corsHeaders(request));

  const ins = await db.prepare(
    "INSERT INTO comments (post_id, body, author_name, ip_hash, created_at, status) VALUES (?, ?, ?, ?, ?, 'active')"
  ).bind(pid, body, author, ipHash, now).run();

  await db.prepare('UPDATE posts SET comment_count = comment_count + 1, updated_at=? WHERE id=?')
    .bind(now, pid).run();

  const cid = ins?.meta?.last_row_id;
  return json({ ok: true, id: cid }, 201, corsHeaders(request));
}
