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


      // SEO Console API (GSC -> D1)
      if (path === '/api/seo/summary') {
        if (method === 'GET') return handleSeoSummary(request, env);
        return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      if (path === '/api/seo/opportunities') {
        if (method === 'GET') return handleSeoOpportunities(request, env);
        return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      if (path === '/api/seo/sync') {
        if (method === 'POST') return handleSeoSync(request, env, ctx);
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

      // EVENT popup deploy config: always no-store (operational swaps)
      if (path === '/assets/config/popup.event.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }

      
      // SITE runtime deploy config: always no-store (operational swaps)
      if (path === '/assets/config/site.runtime.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }

// SEO keyword bank: always no-store (operational swaps)
      if (path === '/assets/config/seo.bank.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }

      // SEO meta deploy file: always no-store (operational swaps)
      if (path === '/assets/config/seo.meta.json') {
        const res = await env.ASSETS.fetch(request);
        const h = new Headers(res.headers);
        h.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('pragma', 'no-cache');
        h.set('expires', '0');
        return new Response(res.body, { status: res.status, headers: h });
      }

      // EVENT popup image: fixed path swap (image replace only, no config changes)
      if (path === '/img/popup/event-popup.jpg') {
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
  },
  async scheduled(event, env, ctx) {
    // Optional: set a Cron Trigger in Cloudflare to run this daily.
    // Recommended: schedule around 03:10 KST to avoid peak traffic.
    try{
      await seoSyncCore(env, ctx, { days: 28, reason: 'cron' });
    }catch(e){}
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

CREATE TABLE IF NOT EXISTS seo_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at INTEGER NOT NULL,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  message TEXT
);

CREATE TABLE IF NOT EXISTS seo_gsc_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  page TEXT NOT NULL,
  page_path TEXT NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_gsc_date ON seo_gsc_rows(date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_gsc_page ON seo_gsc_rows(page_path, date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_gsc_query ON seo_gsc_rows(query, date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_gsc_page_query ON seo_gsc_rows(page_path, query, date DESC);

CREATE TABLE IF NOT EXISTS seo_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  computed_at INTEGER NOT NULL,
  page TEXT NOT NULL,
  page_path TEXT NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0,
  expected_ctr REAL NOT NULL DEFAULT 0,
  potential_clicks REAL NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  reco TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_opp_score ON seo_opportunities(score DESC, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_opp_page ON seo_opportunities(page_path, score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_opp_query ON seo_opportunities(query, score DESC);
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

function clampIntDefaultFirst(v, def = 0, min = 0, max = 999999999) {
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
  const page = clampIntDefaultFirst(url.searchParams.get('page'), 1, 1, 200);
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


// -------------------------
// SEO Console (GSC -> D1)
// -------------------------

function getBearerToken(request){
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? String(m[1]||'').trim() : '';
}

function isAuthorized(request, env){
  const want = String(env.ADMIN_TOKEN || '').trim();
  if(!want) return false;
  const got = getBearerToken(request);
  return !!got && got === want;
}

function requireAuth(request, env){
  if(!isAuthorized(request, env)){
    return json({ ok:false, error:'unauthorized' }, 401, corsHeaders(request));
  }
  return null;
}

function isoDate(d){
  // YYYY-MM-DD (UTC)
  try{ return new Date(d).toISOString().slice(0,10); }catch(e){ return ''; }
}

function clampIntRange(v, min, max, def){
  const n = Number(v);
  if(!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function expectedCtrByPosition(pos){
  // Conservative CTR curve (rough heuristic). Tune later using your own data.
  const p = Number(pos||0);
  if(!Number.isFinite(p) || p<=0) return 0.01;
  if(p<=1) return 0.28;
  if(p<=2) return 0.16;
  if(p<=3) return 0.11;
  if(p<=4) return 0.08;
  if(p<=5) return 0.065;
  if(p<=6) return 0.055;
  if(p<=7) return 0.048;
  if(p<=8) return 0.042;
  if(p<=9) return 0.038;
  if(p<=10) return 0.035;
  if(p<=12) return 0.028;
  if(p<=15) return 0.022;
  if(p<=20) return 0.016;
  return 0.01;
}

async function handleSeoSummary(request, env){
  const denied = requireAuth(request, env);
  if(denied) return denied;

  const db = getDB(env);
  if(!db) return json({ ok:false, error:'db_not_configured' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const last = await db.prepare('SELECT date AS d FROM seo_gsc_rows ORDER BY date DESC LIMIT 1').first();
  const d = String(last?.d || '').trim();
  const sum = d ? await db.prepare('SELECT SUM(clicks) AS clicks, SUM(impressions) AS impressions FROM seo_gsc_rows WHERE date=?').bind(d).first()
                : { clicks:0, impressions:0 };

  const run = await db.prepare('SELECT run_at, range_start, range_end, rows, status, message FROM seo_sync_runs ORDER BY run_at DESC LIMIT 1').first();
  const clicks = Number(sum?.clicks || 0);
  const impressions = Number(sum?.impressions || 0);
  const ctr = impressions ? (clicks / impressions) : 0;

  return json({
    ok:true,
    site_url: String(env.GSC_SITE_URL || '').trim(),
    range: d ? (d + ' (snapshot)') : '-',
    clicks, impressions, ctr,
    last_sync: run?.run_at ? new Date(Number(run.run_at)).toISOString() : null,
    last_sync_status: run?.status || null,
    last_sync_rows: Number(run?.rows || 0),
    last_sync_message: run?.message || null
  }, 200, corsHeaders(request));
}

async function handleSeoOpportunities(request, env){
  const denied = requireAuth(request, env);
  if(denied) return denied;

  const db = getDB(env);
  if(!db) return json({ ok:false, error:'db_not_configured' }, 500, corsHeaders(request));
  await ensureSchema(db);

  const url = new URL(request.url);
  const limit = clampIntRange(url.searchParams.get('limit'), 1, 200, 50);

  const rs = await db.prepare(
    'SELECT score, query, page_path, page, clicks, impressions, ctr, position, reco FROM seo_opportunities ORDER BY score DESC, computed_at DESC LIMIT ?'
  ).bind(limit).all();

  return json({ ok:true, items: rs?.results || [] }, 200, corsHeaders(request));
}

async function handleSeoSync(request, env, ctx){
  const denied = requireAuth(request, env);
  if(denied) return denied;

  let body = null;
  try{ body = await request.json(); }catch(e){ body = {}; }
  const days = clampIntRange(body?.days, 7, 90, 28);

  try{
    const out = await seoSyncCore(env, ctx, { days, reason:'manual' });
    return json({ ok:true, ...out }, 200, corsHeaders(request));
  }catch(e){
    return json({ ok:false, error:'sync_failed', message: String(e?.message || e) }, 500, corsHeaders(request));
  }
}

async function seoSyncCore(env, ctx, opts){
  const db = getDB(env);
  if(!db) throw new Error('DB binding not configured');
  await ensureSchema(db);

  const siteUrl = String(env.GSC_SITE_URL || '').trim();
  const cid = String(env.GSC_CLIENT_ID || '').trim();
  const csec = String(env.GSC_CLIENT_SECRET || '').trim();
  const rtk = String(env.GSC_REFRESH_TOKEN || '').trim();
  if(!siteUrl || !cid || !csec || !rtk) throw new Error('Missing env: GSC_SITE_URL / GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN');

  const days = clampIntRange(opts?.days, 7, 90, 28);

  // GSC data often lags 1~2 days. Use endDate = today-3days (UTC) for stability.
  const end = new Date(Date.now() - 3*864e5);
  const start = new Date(end.getTime() - (days-1)*864e5);
  const startDate = isoDate(start);
  const endDate = isoDate(end);

  const runAt = Date.now();
  let rows = [];
  let status = 'ok';
  let msg = null;

  try{
    rows = await gscFetchQueryPage(env, siteUrl, startDate, endDate);
    // Keep only top N by impressions to avoid D1 timeouts.
    rows.sort((a,b)=> (Number(b.impressions||0) - Number(a.impressions||0)));
    const MAX_ROWS = 5000;
    if(rows.length > MAX_ROWS) rows = rows.slice(0, MAX_ROWS);

    // Refresh snapshot for endDate
    await db.prepare('DELETE FROM seo_gsc_rows WHERE date=?').bind(endDate).run();

    // Batch insert
    const chunkSize = 50;
    for(let i=0; i<rows.length; i+=chunkSize){
      const chunk = rows.slice(i, i+chunkSize);
      const stmts = chunk.map(r => db.prepare(
        'INSERT INTO seo_gsc_rows (date, page, page_path, query, clicks, impressions, ctr, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        endDate,
        r.page,
        r.page_path,
        r.query,
        Number(r.clicks||0),
        Number(r.impressions||0),
        Number(r.ctr||0),
        Number(r.position||0),
        runAt
      ));
      // D1 supports batch execution
      await db.batch(stmts);
    }

    // Recompute opportunities (keep it small)
    await db.prepare('DELETE FROM seo_opportunities').run();

    const opp = [];
    for(const r of rows){
      const imp = Number(r.impressions||0);
      const clk = Number(r.clicks||0);
      const pos = Number(r.position||0);
      const ctr = Number(r.ctr||0);

      if(!imp || imp < 120) continue;         // minimum exposure
      if(!(pos >= 3 && pos <= 15)) continue;  // quick-win zone

      const exp = expectedCtrByPosition(pos);
      const pot = (imp * exp) - clk;
      if(pot < 3) continue;

      const score = Math.max(1, Math.round(pot));
      let reco = '본문 보강 + 내부링크';
      if(pos <= 10 && ctr < exp*0.7) reco = '타이틀/메타 CTR 개선';
      if(pos > 10) reco = '콘텐츠 보강(의도/FAQ)';

      opp.push({
        page: r.page,
        page_path: r.page_path,
        query: r.query,
        clicks: clk,
        impressions: imp,
        ctr,
        position: pos,
        expected_ctr: exp,
        potential_clicks: pot,
        score,
        reco
      });
    }
    opp.sort((a,b)=> (b.score - a.score));
    const top = opp.slice(0, 200);

    const computedAt = Date.now();
    for(let i=0; i<top.length; i+=50){
      const chunk = top.slice(i, i+50);
      const stmts = chunk.map(o => db.prepare(
        'INSERT INTO seo_opportunities (computed_at, page, page_path, query, clicks, impressions, ctr, position, expected_ctr, potential_clicks, score, reco) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        computedAt,
        o.page,
        o.page_path,
        o.query,
        o.clicks,
        o.impressions,
        o.ctr,
        o.position,
        o.expected_ctr,
        o.potential_clicks,
        o.score,
        o.reco
      ));
      await db.batch(stmts);
    }

  }catch(e){
    status = 'error';
    msg = String(e?.message || e);
    throw e;
  }finally{
    // Log run
    try{
      await db.prepare(
        'INSERT INTO seo_sync_runs (run_at, range_start, range_end, rows, status, message) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(runAt, startDate, endDate, rows.length, status, msg).run();
    }catch(e){}
  }

  return { startDate, endDate, rows: rows.length };
}

async function gscFetchQueryPage(env, siteUrl, startDate, endDate){
  const token = await gscAccessToken(env);
  const api = 'https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(siteUrl) + '/searchAnalytics/query';

  const payload = {
    startDate,
    endDate,
    dimensions: ['query','page'],
    rowLimit: 25000
  };

  const res = await fetch(api, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + token },
    body: JSON.stringify(payload)
  });

  const j = await res.json().catch(()=>null);
  if(!res.ok){
    const msg = (j && (j.error && (j.error.message || JSON.stringify(j.error)))) || ('HTTP_'+res.status);
    throw new Error('GSC API error: ' + msg);
  }

  const rows = Array.isArray(j?.rows) ? j.rows : [];
  const out = [];
  for(const r of rows){
    const keys = Array.isArray(r?.keys) ? r.keys : [];
    const query = String(keys[0]||'').trim();
    const page = String(keys[1]||'').trim();
    if(!query || !page) continue;

    let pagePath = page;
    try{ pagePath = new URL(page).pathname || '/'; }catch(e){}

    out.push({
      query,
      page,
      page_path: pagePath,
      clicks: Number(r?.clicks || 0),
      impressions: Number(r?.impressions || 0),
      ctr: Number(r?.ctr || 0),
      position: Number(r?.position || 0)
    });
  }
  return out;
}

async function gscAccessToken(env){
  const cid = String(env.GSC_CLIENT_ID || '').trim();
  const csec = String(env.GSC_CLIENT_SECRET || '').trim();
  const rtk = String(env.GSC_REFRESH_TOKEN || '').trim();

  const form = new URLSearchParams();
  form.set('client_id', cid);
  form.set('client_secret', csec);
  form.set('refresh_token', rtk);
  form.set('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const j = await res.json().catch(()=>null);
  if(!res.ok){
    const msg = (j && (j.error_description || j.error)) || ('HTTP_'+res.status);
    throw new Error('OAuth token error: ' + msg);
  }
  const tok = String(j?.access_token || '').trim();
  if(!tok) throw new Error('OAuth token missing access_token');
  return tok;
}
