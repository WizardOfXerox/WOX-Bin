/**
 * WOX-Bin server: accounts + pastes, SQLite (sql.js), session auth.
 * No native build required – runs on Windows without Visual Studio.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

// Console styling (like npx serve)
const g = (s) => `\x1b[32m${s}\x1b[0m`;
const r = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
function getNetworkUrl() {
  const port = PORT;
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const n of nets[name]) {
        if (n.family === 'IPv4' && !n.internal) return `http://${n.address}:${port}`;
      }
    }
  } catch (_) {}
  return null;
}
function formatLog(status, ms) {
  const ok = status >= 200 && status < 400;
  return ok ? g(`${status} in ${ms} ms`) : r(`${status} in ${ms} ms`);
}

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'woxbin-change-in-production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'woxbin.db');
/** Session inactivity timeout in minutes. Cookie expires after this long with no requests (rolling). */
const SESSION_TIMEOUT_MINUTES = Math.max(1, parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10) || 30);
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

const app = express();
let db;

// Helpers for sql.js (similar API to better-sqlite3)
function dbExec(sql) {
  db.run(sql);
  saveDb();
}
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function saveDb() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.warn('Could not save DB:', e.message);
  }
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    folders TEXT NOT NULL DEFAULT '["Notes","Code","Snippets"]',
    created_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS pastes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      language TEXT,
      folder TEXT,
      category TEXT,
      tags TEXT,
      expiration TEXT,
      exposure INTEGER,
      password TEXT,
      burn_after_read INTEGER,
      views INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS paste_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paste_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY(paste_id) REFERENCES pastes(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  try { db.run('ALTER TABLE paste_comments ADD COLUMN parent_id INTEGER'); } catch (_) {}
  db.run(`CREATE TABLE IF NOT EXISTS paste_stars (
    paste_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (paste_id, user_id),
    FOREIGN KEY(paste_id) REFERENCES pastes(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    label TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    sid TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    last_ip TEXT,
    user_agent TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  try { db.run('ALTER TABLE pastes ADD COLUMN claim_token TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE pastes ADD COLUMN forked_from_id TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE pastes ADD COLUMN reply_to_id TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE pastes ADD COLUMN burn_after_views INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN webhook_url TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE users ADD COLUMN display_name TEXT'); } catch (_) {}
  db.run(`CREATE TABLE IF NOT EXISTS paste_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paste_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    language TEXT DEFAULT 'none',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(paste_id) REFERENCES pastes(id) ON DELETE CASCADE
  )`);
  // Anonymous pasting: ensure a system user exists (no login; used for unauthenticated pastes)
  if (!dbGet("SELECT id FROM users WHERE username = 'anonymous'")) {
    dbRun("INSERT INTO users (username, password_hash, created_at) VALUES ('anonymous', '', ?)", [Date.now()]);
  }
  saveDb();
}

// Request logging (serve-style)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const ts = new Date().toLocaleString('en-US', { month: 'numeric', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const addr = (req.connection.remoteAddress || req.socket?.remoteAddress || '::1').replace(/^::ffff:/, '');
    const status = formatLog(res.statusCode, ms);
    console.log(`${blue('HTTP')}  ${ts}  ${addr}  ${req.method} ${req.originalUrl || req.url}  ${status}`);
  });
  next();
});

// Security headers (before other middleware)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  }
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  name: 'woxbin.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT_MS
  }
}));

// Session inactivity timeout: destroy session if last activity is too long ago
app.use((req, res, next) => {
  const sess = req.session;
  if (sess && sess.userId) {
    const active = dbGet('SELECT sid FROM user_sessions WHERE sid = ? AND user_id = ?', [req.sessionID, sess.userId]);
    if (!active) {
      req.session.destroy(() => {
        res.status(401).json({ error: 'Session revoked', code: 'SESSION_REVOKED' });
      });
      return;
    }
    const now = Date.now();
    sess.lastActivity = sess.lastActivity || now;
    if (now - sess.lastActivity > SESSION_TIMEOUT_MS) {
      req.session.destroy(() => {
        res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
      });
      return;
    }
    sess.lastActivity = now;
    touchSession(req);
  }
  next();
});

app.use(express.static(path.join(__dirname, '..')));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}
function apiKeyHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
function requireApiKey(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing API key' });
  const key = m[1].trim();
  if (!key || key.length > 256) return res.status(401).json({ error: 'Invalid API key' });
  const row = dbGet('SELECT id, user_id FROM api_keys WHERE key_hash = ?', [apiKeyHash(key)]);
  if (!row) return res.status(401).json({ error: 'Invalid API key' });
  req.apiKeyId = row.id;
  req.apiUserId = row.user_id;
  dbRun('UPDATE api_keys SET last_used_at = ? WHERE id = ?', [Date.now(), row.id]);
  next();
}
function touchSession(req) {
  if (!req.session || !req.session.userId || !req.sessionID) return;
  const now = Date.now();
  const ip = (req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
  const ua = sanitizeString(req.headers['user-agent'] || '', 300) || '';
  const row = dbGet('SELECT sid FROM user_sessions WHERE sid = ? AND user_id = ?', [req.sessionID, req.session.userId]);
  if (row) {
    dbRun('UPDATE user_sessions SET last_seen_at = ?, last_ip = ?, user_agent = ? WHERE sid = ?', [now, ip, ua, req.sessionID]);
  } else {
    dbRun('INSERT OR REPLACE INTO user_sessions (sid, user_id, created_at, last_seen_at, last_ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)', [req.sessionID, req.session.userId, now, now, ip, ua]);
  }
}

// --- Auth
function getClientIp(req) {
  return (req.ip || req.connection?.remoteAddress || '::1').replace(/^::ffff:/, '');
}
app.post('/api/register', (req, res) => {
  const ip = getClientIp(req);
  if (!checkAuthRateLimit(ip, 'register')) return res.status(429).json({ error: 'Too many registration attempts. Try again in a minute.' });
  const { username, password } = req.body || {};
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const u = username.trim().toLowerCase();
  const p = password.trim();
  if (u.length < 2 || u.length > 32) return res.status(400).json({ error: 'Username 2–32 characters' });
  if (!/^[a-z0-9_]+$/.test(u)) return res.status(400).json({ error: 'Username only letters, numbers, underscore' });
  if (p.length < 6) return res.status(400).json({ error: 'Password at least 6 characters' });
  const hash = bcrypt.hashSync(p, 10);
  try {
    dbRun('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [u, hash, Date.now()]);
    const row = dbGet('SELECT id, username FROM users WHERE username = ?', [u]);
    req.session.userId = row.id;
    req.session.username = row.username;
    touchSession(req);
    return res.status(201).json({ user: { id: row.id, username: row.username } });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username taken' });
    throw e;
  }
});

app.post('/api/login', (req, res) => {
  const ip = getClientIp(req);
  if (!checkAuthRateLimit(ip, 'login')) return res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const u = String(username).trim().toLowerCase();
  if (u.length > 256) return res.status(400).json({ error: 'Invalid request' });
  const row = dbGet('SELECT id, username, password_hash FROM users WHERE username = ?', [u]);
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = row.id;
  req.session.username = row.username;
  touchSession(req);
  return res.json({ user: { id: row.id, username: row.username } });
});

app.post('/api/logout', (req, res) => {
  if (req.session && req.session.userId && req.sessionID) {
    dbRun('DELETE FROM user_sessions WHERE sid = ? AND user_id = ?', [req.sessionID, req.session.userId]);
  }
  req.session.destroy(() => {});
  return res.json({ ok: true });
});

let examplePasteTemplatesCache = null;
function loadExamplePasteTemplates() {
  if (examplePasteTemplatesCache) return examplePasteTemplatesCache;
  try {
    const filePath = path.join(__dirname, '..', 'example-pastes.json');
    if (!fs.existsSync(filePath)) return (examplePasteTemplatesCache = []);
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw || '{}');
    const pastes = Array.isArray(json.pastes) ? json.pastes : [];
    examplePasteTemplatesCache = pastes;
    return examplePasteTemplatesCache;
  } catch (_) {
    return (examplePasteTemplatesCache = []);
  }
}

// Ensure each signed-in user starts with default example pastes.
// We generate per-user IDs to avoid global ID collisions (paste.id is UNIQUE across all users).
function ensureSeededExamplePastesForUser(userId) {
  const templates = loadExamplePasteTemplates();
  if (!templates.length) return;

  for (const tpl of templates) {
    if (!tpl || typeof tpl.id !== 'string') continue;
    const seedId = `example-seed-${tpl.id}-${userId}`;
    if (seedId.length > 64) continue;
    if (!PASTE_ID_REGEX.test(seedId)) continue;
    const exists = dbGet('SELECT id FROM pastes WHERE id = ? AND user_id = ?', [seedId, userId]);
    if (exists) continue;

    const title = sanitizeString(tpl.title, 500) || 'Untitled';
    const content = typeof tpl.content === 'string' ? tpl.content.slice(0, 10 * 1024 * 1024) : '';
    const language = (tpl.language && ALLOWED_LANGS.has(tpl.language)) ? tpl.language : 'none';
    const folder = tpl.folder !== undefined ? sanitizeString(tpl.folder, 32) : null;
    const category = tpl.category !== undefined ? sanitizeString(tpl.category, 64) : null;

    let tagsArr = Array.isArray(tpl.tags) ? tpl.tags : [];
    tagsArr = tagsArr.filter(t => typeof t === 'string' && t.length <= 32).slice(0, 50);

    const expiration = (tpl.expiration && EXPIRATION_CODES.has(tpl.expiration)) ? tpl.expiration : 'N';
    const exposure = (typeof tpl.exposure === 'number' && tpl.exposure >= 0 && tpl.exposure <= 2) ? tpl.exposure : 0;
    const password = (tpl.password != null && String(tpl.password).trim() !== '') ? sanitizeString(String(tpl.password).trim(), 128) : null;

    const burnAfterRead = !!tpl.burnAfterRead;
    const burnAfterViews = (typeof tpl.burnAfterViews === 'number' && tpl.burnAfterViews >= 0) ? Math.min(tpl.burnAfterViews, 100) : 0;
    const pinned = !!tpl.pinned;
    const views = (typeof tpl.views === 'number' && tpl.views >= 0) ? Math.min(tpl.views, 1000000) : 0;

    const createdAt = (typeof tpl.createdAt === 'number' && tpl.createdAt > 0) ? tpl.createdAt : Date.now();
    const updatedAt = (typeof tpl.updatedAt === 'number' && tpl.updatedAt > 0) ? tpl.updatedAt : createdAt;

    dbRun(`
      INSERT INTO pastes
        (id, user_id, title, content, language, folder, category, tags, expiration, exposure, password,
         burn_after_read, burn_after_views, pinned, views, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?)
    `, [
      seedId, userId, title, content, language, folder, category, JSON.stringify(tagsArr), expiration, exposure, password,
      burnAfterRead ? 1 : 0, burnAfterViews, pinned ? 1 : 0, views, createdAt, updatedAt
    ]);
  }
}

app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const row = dbGet('SELECT id, username, display_name, folders, webhook_url FROM users WHERE id = ?', [req.session.userId]);
  if (!row) return res.status(401).json({ error: 'Not logged in' });

  // Default example pastes (per user).
  try { ensureSeededExamplePastesForUser(row.id); } catch (_) {}

  return res.json({
    user: { id: row.id, username: row.username, displayName: row.display_name || null },
    folders: JSON.parse(row.folders || '[]'),
    webhookUrl: row.webhook_url || null
  });
});

app.patch('/api/me', requireAuth, (req, res) => {
  const body = req.body || {};
  const { folders, currentPassword, newPassword } = body;
  if (currentPassword !== undefined || newPassword !== undefined) {
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'currentPassword and newPassword required to change password' });
    }
    const p = newPassword.trim();
    if (p.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const row = dbGet('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
    if (!row || !bcrypt.compareSync(String(currentPassword), row.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(p, 10);
    dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
  }
  if (folders !== undefined) {
    if (!Array.isArray(folders)) return res.status(400).json({ error: 'folders must be array' });
    const safe = folders.slice(0, 100).filter(f => typeof f === 'string' && f.length <= 32 && /^[\x20-\x7E]*$/.test(f));
    const str = JSON.stringify(safe);
    dbRun('UPDATE users SET folders = ? WHERE id = ?', [str, req.session.userId]);
  }
  if (body.webhookUrl !== undefined) {
    const url = body.webhookUrl === null || body.webhookUrl === '' ? null : sanitizeString(String(body.webhookUrl), 2048);
    if (url !== null && (!url.startsWith('http://') && !url.startsWith('https://'))) return res.status(400).json({ error: 'webhookUrl must be http or https' });
    dbRun('UPDATE users SET webhook_url = ? WHERE id = ?', [url, req.session.userId]);
  }
  if (body.displayName !== undefined) {
    const dn = body.displayName === null || body.displayName === '' ? null : sanitizeString(String(body.displayName), 64);
    dbRun('UPDATE users SET display_name = ? WHERE id = ?', [dn, req.session.userId]);
  }
  const row = dbGet('SELECT folders, webhook_url FROM users WHERE id = ?', [req.session.userId]);
  const out = { folders: row && row.folders ? JSON.parse(row.folders) : [], webhookUrl: row && row.webhook_url ? row.webhook_url : null };
  return res.json(out);
});

app.get('/api/me/sessions', requireAuth, (req, res) => {
  const rows = dbAll('SELECT sid, created_at, last_seen_at, last_ip, user_agent FROM user_sessions WHERE user_id = ? ORDER BY last_seen_at DESC', [req.session.userId]);
  return res.json({
    sessions: rows.map(r => ({
      sid: r.sid,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      lastIp: r.last_ip || '',
      userAgent: r.user_agent || '',
      current: r.sid === req.sessionID
    }))
  });
});
app.delete('/api/me/sessions/:sid', requireAuth, (req, res) => {
  const sid = String(req.params.sid || '');
  if (!sid || sid.length > 256) return res.status(400).json({ error: 'Invalid session id' });
  dbRun('DELETE FROM user_sessions WHERE sid = ? AND user_id = ?', [sid, req.session.userId]);
  if (sid === req.sessionID) {
    req.session.destroy(() => {});
    return res.json({ ok: true, loggedOut: true });
  }
  return res.json({ ok: true });
});
app.post('/api/me/sessions/revoke-others', requireAuth, (req, res) => {
  dbRun('DELETE FROM user_sessions WHERE user_id = ? AND sid != ?', [req.session.userId, req.sessionID]);
  return res.json({ ok: true });
});
app.post('/api/me/claim-anonymous', requireAuth, (req, res) => {
  const items = Array.isArray((req.body || {}).items) ? req.body.items : [];
  if (!items.length) return res.json({ claimed: 0 });
  const anon = dbGet("SELECT id FROM users WHERE username = 'anonymous'");
  if (!anon) return res.status(503).json({ error: 'Anonymous account missing' });
  let claimed = 0;
  for (const it of items.slice(0, 500)) {
    if (!it || typeof it.id !== 'string' || typeof it.token !== 'string') continue;
    const id = it.id.trim();
    const token = it.token.trim();
    if (!PASTE_ID_REGEX.test(id) || token.length < 8 || token.length > 256) continue;
    const row = dbGet('SELECT id FROM pastes WHERE id = ? AND user_id = ? AND claim_token = ?', [id, anon.id, token]);
    if (!row) continue;
    dbRun('UPDATE pastes SET user_id = ?, claim_token = NULL, updated_at = ? WHERE id = ?', [req.session.userId, Date.now(), id]);
    claimed++;
  }
  return res.json({ claimed });
});
app.delete('/api/me', requireAuth, (req, res) => {
  const password = typeof (req.body || {}).password === 'string' ? req.body.password : '';
  if (!password) return res.status(400).json({ error: 'Password required' });
  const row = dbGet('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: 'Invalid password' });
  const userId = req.session.userId;
  dbRun('DELETE FROM paste_comments WHERE user_id = ?', [userId]);
  dbRun('DELETE FROM paste_stars WHERE user_id = ?', [userId]);
  dbRun('DELETE FROM api_keys WHERE user_id = ?', [userId]);
  dbRun('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
  dbRun('DELETE FROM paste_comments WHERE paste_id IN (SELECT id FROM pastes WHERE user_id = ?)', [userId]);
  dbRun('DELETE FROM paste_stars WHERE paste_id IN (SELECT id FROM pastes WHERE user_id = ?)', [userId]);
  dbRun('DELETE FROM paste_files WHERE paste_id IN (SELECT id FROM pastes WHERE user_id = ?)', [userId]);
  dbRun('DELETE FROM pastes WHERE user_id = ?', [userId]);
  dbRun('DELETE FROM users WHERE id = ?', [userId]);
  req.session.destroy(() => {});
  return res.json({ ok: true });
});

app.get('/api/keys', requireAuth, (req, res) => {
  const rows = dbAll('SELECT id, label, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
  return res.json({ keys: rows.map(r => ({ id: r.id, label: r.label || '', createdAt: r.created_at, lastUsedAt: r.last_used_at || null })) });
});
app.post('/api/keys', requireAuth, (req, res) => {
  const label = sanitizeString((req.body || {}).label, 64) || 'Default key';
  const token = 'wox_' + crypto.randomBytes(24).toString('hex');
  const h = apiKeyHash(token);
  dbRun('INSERT INTO api_keys (user_id, key_hash, label, created_at) VALUES (?, ?, ?, ?)', [req.session.userId, h, label, Date.now()]);
  const row = dbGet('SELECT id, label, created_at FROM api_keys WHERE key_hash = ?', [h]);
  return res.status(201).json({ key: { id: row.id, label: row.label || '', createdAt: row.created_at }, token });
});
app.delete('/api/keys/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid key id' });
  dbRun('DELETE FROM api_keys WHERE id = ? AND user_id = ?', [id, req.session.userId]);
  return res.json({ ok: true });
});

// --- Pastes
function rowToPaste(row, opts = {}) {
  if (!row) return null;
  const out = {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    language: row.language || 'none',
    folder: row.folder || null,
    category: row.category || null,
    tags: row.tags ? (function () { try { return JSON.parse(row.tags); } catch (_) { return []; } })() : [],
    expiration: row.expiration || 'N',
    exposure: row.exposure ?? 0,
    password: (row.password != null && String(row.password).trim() !== '') ? row.password : null,
    burnAfterRead: !!row.burn_after_read,
    burnAfterViews: row.burn_after_views != null ? row.burn_after_views : 0,
    views: row.views || 0,
    pinned: !!row.pinned,
    forkedFromId: row.forked_from_id || null,
    replyToId: row.reply_to_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (opts.forkCount !== undefined) out.forkCount = opts.forkCount;
  if (opts.forkedFromTitle !== undefined) out.forkedFromTitle = opts.forkedFromTitle;
  if (opts.files) out.files = opts.files;
  return out;
}

function userDisplayName(userRow) {
  if (!userRow) return '';
  const d = userRow.display_name != null && String(userRow.display_name).trim() !== '' ? String(userRow.display_name).trim() : null;
  return d || userRow.username || '';
}

/** List all public pastes (exposure 0) from all users. No auth. For "Everyone's public" feed. */
app.get('/api/pastes/public', (req, res) => {
  const sort = String((req.query && req.query.sort) || 'newest');
  const rows = dbAll(`
    SELECT p.id, p.title, p.language, p.folder, p.category, p.views, p.created_at, p.updated_at, u.username, u.display_name,
      COALESCE(s.star_count, 0) AS stars
    FROM pastes p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT paste_id, COUNT(*) AS star_count
      FROM paste_stars
      GROUP BY paste_id
    ) s ON s.paste_id = p.id
    WHERE p.exposure = 0
    ORDER BY ${sort === 'trending' ? 'COALESCE(s.star_count, 0) DESC, p.views DESC, p.updated_at DESC' : 'p.updated_at DESC'}
    LIMIT 500
  `);
  const list = rows.map(r => ({
    id: r.id,
    title: r.title || 'Untitled',
    language: r.language || 'none',
    folder: r.folder || null,
    category: r.category || null,
    views: r.views || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    username: userDisplayName(r),
    stars: r.stars || 0
  }));
  return res.json({ pastes: list });
});
app.get('/api/pastes', requireAuth, (req, res) => {
  const rows = dbAll('SELECT * FROM pastes WHERE user_id = ? ORDER BY updated_at DESC', [req.session.userId]);
  return res.json({ pastes: rows.map(rowToPaste) });
});

const PASTE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const ALLOWED_LANGS = new Set(['none', 'auto', 'markup', 'css', 'javascript', 'typescript', 'json', 'python', 'bash', 'sql', 'xml', 'cpp', 'csharp', 'java', 'php', 'powershell', 'yaml', 'markdown', 'go', 'rust', 'ruby', 'swift', 'kotlin']);
const EXPIRATION_CODES = new Set(['N', 'B', '10M', '1H', '1D', '1W', '2W', '1M', '6M', '1Y']);

// Anonymous paste rate limit: per IP, 20 pastes per hour
const anonymousRateLimit = new Map();
const ANON_RATE_WINDOW_MS = 60 * 60 * 1000;
const ANON_RATE_MAX = 20;
function checkAnonymousRateLimit(ip) {
  const now = Date.now();
  let entry = anonymousRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + ANON_RATE_WINDOW_MS };
    anonymousRateLimit.set(ip, entry);
  }
  entry.count++;
  return entry.count <= ANON_RATE_MAX;
}

// Auth rate limits: login 10/min, register 5/min per IP
const authRateLimit = new Map();
const AUTH_WINDOW_MS = 60 * 1000;
function checkAuthRateLimit(ip, kind) {
  const key = ip + ':' + kind;
  const now = Date.now();
  let entry = authRateLimit.get(key);
  const max = kind === 'login' ? 10 : 5;
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + AUTH_WINDOW_MS };
    authRateLimit.set(key, entry);
  }
  entry.count++;
  return entry.count <= max;
}

function sanitizeString(s, maxLen) {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

app.post('/api/pastes', requireAuth, (req, res) => {
  const p = req.body || {};
  let id = p.id;
  if (id != null) {
    if (typeof id !== 'string' || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id format' });
  } else {
    id = require('crypto').randomBytes(8).toString('hex');
  }
  const now = Date.now();
  const title = sanitizeString(p.title, 500) || 'Untitled';
  const content = typeof p.content === 'string' ? p.content.slice(0, 10 * 1024 * 1024) : '';
  const language = ALLOWED_LANGS.has(p.language) ? p.language : 'none';
  const folder = sanitizeString(p.folder, 32);
  const category = sanitizeString(p.category, 64);
  const tags = Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string' && t.length <= 32).slice(0, 50) : [];
  const expiration = EXPIRATION_CODES.has(p.expiration) ? p.expiration : 'N';
  const exposure = typeof p.exposure === 'number' && p.exposure >= 0 && p.exposure <= 2 ? p.exposure : 0;
  const password = p.password != null ? sanitizeString(String(p.password), 128) : null;
  const burnAfterViews = typeof p.burnAfterViews === 'number' && p.burnAfterViews >= 0 ? Math.min(p.burnAfterViews, 100) : 0;
  const forkedFromId = p.forkedFromId && typeof p.forkedFromId === 'string' && PASTE_ID_REGEX.test(p.forkedFromId) ? p.forkedFromId : null;
  const replyToId = p.replyToId && typeof p.replyToId === 'string' && PASTE_ID_REGEX.test(p.replyToId) ? p.replyToId : null;
  dbRun(`
    INSERT INTO pastes (id, user_id, title, content, language, folder, category, tags, expiration, exposure, password, burn_after_read, burn_after_views, views, pinned, forked_from_id, reply_to_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, req.session.userId,
    title, content, language, folder, category,
    JSON.stringify(tags), expiration, exposure, password,
    p.burnAfterRead ? 1 : 0, burnAfterViews, 0, p.pinned ? 1 : 0, forkedFromId, replyToId, p.createdAt || now, now
  ]);
  const inserted = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  const files = Array.isArray(p.files) ? p.files : [];
  for (let i = 0; i < Math.min(files.length, 50); i++) {
    const f = files[i];
    if (f && typeof f.filename === 'string' && f.filename.trim()) {
      const fn = sanitizeString(f.filename.trim(), 255) || 'file.txt';
      const cnt = typeof f.content === 'string' ? f.content.slice(0, 5 * 1024 * 1024) : '';
      const lang = ALLOWED_LANGS.has(f.language) ? f.language : 'none';
      dbRun('INSERT INTO paste_files (paste_id, filename, content, language, sort_order) VALUES (?, ?, ?, ?, ?)', [id, fn, cnt, lang, i]);
    }
  }
  const fileRows = dbAll('SELECT filename, content, language, sort_order FROM paste_files WHERE paste_id = ? ORDER BY sort_order ASC, id ASC', [id]);
  const outFiles = fileRows.map(f => ({ filename: f.filename || '', content: f.content || '', language: f.language || 'none' }));
  const out = rowToPaste(inserted, { files: outFiles.length ? outFiles : undefined });
  const userRow = dbGet('SELECT webhook_url FROM users WHERE id = ?', [req.session.userId]);
  if (userRow && userRow.webhook_url && typeof userRow.webhook_url === 'string' && userRow.webhook_url.startsWith('http')) {
    const payload = JSON.stringify({ event: 'paste.created', paste: out });
    require('http').request(userRow.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, () => {}).on('error', () => {}).end(payload);
  }
  return res.status(201).json(out);
});

/** Anonymous pasting: no auth. Creates paste under system user "anonymous". Public or unlisted only; rate limited by IP. */
app.post('/api/public/pastes', (req, res) => {
  const anonRow = dbGet("SELECT id FROM users WHERE username = 'anonymous'");
  if (!anonRow) return res.status(503).json({ error: 'Anonymous pasting not configured' });
  const ip = (req.ip || req.connection?.remoteAddress || '::1').replace(/^::ffff:/, '');
  if (!checkAnonymousRateLimit(ip)) return res.status(429).json({ error: 'Too many anonymous pastes. Try again in an hour.' });
  const p = req.body || {};
  const id = crypto.randomBytes(8).toString('hex');
  const now = Date.now();
  const title = sanitizeString(p.title, 500) || 'Untitled';
  const content = typeof p.content === 'string' ? p.content.slice(0, 10 * 1024 * 1024) : '';
  const language = ALLOWED_LANGS.has(p.language) ? p.language : 'none';
  const folder = sanitizeString(p.folder, 32);
  const category = sanitizeString(p.category, 64);
  const tags = Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string' && t.length <= 32).slice(0, 50) : [];
  const expiration = EXPIRATION_CODES.has(p.expiration) ? p.expiration : 'N';
  const exposure = typeof p.exposure === 'number' && (p.exposure === 0 || p.exposure === 1) ? p.exposure : 0;
  const password = p.password != null ? sanitizeString(String(p.password), 128) : null;
  const claimToken = 'claim_' + crypto.randomBytes(16).toString('hex');
  dbRun(`
    INSERT INTO pastes (id, user_id, title, content, language, folder, category, tags, expiration, exposure, password, burn_after_read, views, pinned, created_at, updated_at, claim_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, anonRow.id,
    title, content, language, folder, category,
    JSON.stringify(tags), expiration, exposure, password,
    p.burnAfterRead ? 1 : 0, 0, 0, p.createdAt || now, now, claimToken
  ]);
  const out = rowToPaste(dbGet('SELECT * FROM pastes WHERE id = ?', [id]));
  out.claimToken = claimToken;
  return res.status(201).json(out);
});

app.get('/api/pastes/:id', (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Paste not found' });
  const isOwner = req.session && req.session.userId === row.user_id;
  const hasPassword = row.password != null && String(row.password).trim() !== '';
  if (!isOwner && hasPassword) {
    const provided = (req.query && req.query.password != null) ? String(req.query.password) : '';
    if (provided.trim() !== row.password) return res.status(403).json({ error: 'Password required', requiresPassword: true });
  }
  if (!isOwner) {
    dbRun('UPDATE pastes SET views = views + 1 WHERE id = ?', [id]);
    row.views = (row.views || 0) + 1;
    const burnViews = row.burn_after_views != null ? row.burn_after_views : 0;
    if (burnViews > 0 && row.views >= burnViews) {
      dbRun('DELETE FROM pastes WHERE id = ?', [id]);
      dbRun('DELETE FROM paste_files WHERE paste_id = ?', [id]);
      return res.status(410).json({ error: 'Paste has been burned after view limit', burned: true });
    }
  }
  const forkCount = (dbGet('SELECT COUNT(*) AS c FROM pastes WHERE forked_from_id = ?', [id]) || {}).c || 0;
  let forkedFromTitle = null;
  if (row.forked_from_id) {
    const src = dbGet('SELECT title FROM pastes WHERE id = ?', [row.forked_from_id]);
    if (src) forkedFromTitle = src.title || '';
  }
  const fileRows = dbAll('SELECT filename, content, language, sort_order FROM paste_files WHERE paste_id = ? ORDER BY sort_order ASC, id ASC', [id]);
  const files = fileRows.map(f => ({ filename: f.filename || '', content: f.content || '', language: f.language || 'none' }));
  const out = rowToPaste(row, { forkCount, forkedFromTitle, files: files.length ? files : undefined });
  if (!isOwner) {
    const userRow = dbGet('SELECT username, display_name FROM users WHERE id = ?', [row.user_id]);
    if (userRow) out.username = userDisplayName(userRow);
  }
  out.stars = (dbGet('SELECT COUNT(*) AS c FROM paste_stars WHERE paste_id = ?', [id]) || {}).c || 0;
  out.starred = !!(req.session && req.session.userId && dbGet('SELECT 1 AS ok FROM paste_stars WHERE paste_id = ? AND user_id = ?', [id, req.session.userId]));
  return res.json(out);
});

app.get('/api/pastes/:id/replies', (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const parent = dbGet('SELECT id, user_id FROM pastes WHERE id = ?', [id]);
  if (!parent) return res.status(404).json({ error: 'Paste not found' });
  const isOwner = req.session && req.session.userId === parent.user_id;
  const rows = dbAll(`
    SELECT p.id, p.title, p.language, p.views, p.created_at, u.username
    FROM pastes p
    JOIN users u ON u.id = p.user_id
    WHERE p.reply_to_id = ?
    ORDER BY p.created_at ASC
    LIMIT 200
  `, [id]);
  return res.json({ replies: rows.map(r => ({ id: r.id, title: r.title || '', language: r.language || 'none', views: r.views || 0, createdAt: r.created_at, username: r.username || '' })) });
});

app.put('/api/pastes/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: 'Paste not found' });
  const p = req.body || {};
  const now = Date.now();
  const title = p.title !== undefined ? (sanitizeString(p.title, 500) || 'Untitled') : (row.title || 'Untitled');
  const content = p.content !== undefined ? (typeof p.content === 'string' ? p.content.slice(0, 10 * 1024 * 1024) : '') : (row.content || '');
  const language = ALLOWED_LANGS.has(p.language) ? p.language : (row.language || 'none');
  const folder = p.folder !== undefined ? sanitizeString(p.folder, 32) : row.folder;
  const category = p.category !== undefined ? sanitizeString(p.category, 64) : row.category;
  let tags = row.tags ? (function () { try { const a = JSON.parse(row.tags); return Array.isArray(a) ? a : []; } catch (_) { return []; } })() : [];
  if (Array.isArray(p.tags)) tags = p.tags.filter(t => typeof t === 'string' && t.length <= 32).slice(0, 50);
  const expiration = EXPIRATION_CODES.has(p.expiration) ? p.expiration : (row.expiration || 'N');
  const exposure = p.exposure !== undefined ? (typeof p.exposure === 'number' && p.exposure >= 0 && p.exposure <= 2 ? p.exposure : row.exposure) : row.exposure;
  const password = p.password !== undefined
    ? (p.password != null && String(p.password).trim() !== '' ? sanitizeString(String(p.password).trim(), 128) : null)
    : row.password;
  const burnAfterViews = p.burnAfterViews !== undefined ? (typeof p.burnAfterViews === 'number' && p.burnAfterViews >= 0 ? Math.min(p.burnAfterViews, 100) : row.burn_after_views) : (row.burn_after_views != null ? row.burn_after_views : 0);
  dbRun(`
    UPDATE pastes SET title=?, content=?, language=?, folder=?, category=?, tags=?, expiration=?, exposure=?, password=?, burn_after_read=?, burn_after_views=?, pinned=?, updated_at=?
    WHERE id = ?
  `, [
    title, content, language, folder, category,
    JSON.stringify(tags), expiration, exposure, password,
    p.burnAfterRead !== undefined ? (p.burnAfterRead ? 1 : 0) : row.burn_after_read,
    burnAfterViews,
    p.pinned !== undefined ? (p.pinned ? 1 : 0) : row.pinned,
    now, id
  ]);
  if (Array.isArray(p.files)) {
    dbRun('DELETE FROM paste_files WHERE paste_id = ?', [id]);
    for (let i = 0; i < Math.min(p.files.length, 50); i++) {
      const f = p.files[i];
      if (f && typeof f.filename === 'string' && f.filename.trim()) {
        const fn = sanitizeString(f.filename.trim(), 255) || 'file.txt';
        const cnt = typeof f.content === 'string' ? f.content.slice(0, 5 * 1024 * 1024) : '';
        const lang = ALLOWED_LANGS.has(f.language) ? f.language : 'none';
        dbRun('INSERT INTO paste_files (paste_id, filename, content, language, sort_order) VALUES (?, ?, ?, ?, ?)', [id, fn, cnt, lang, i]);
      }
    }
  }
  const updated = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  const fileRows = dbAll('SELECT filename, content, language, sort_order FROM paste_files WHERE paste_id = ? ORDER BY sort_order ASC, id ASC', [id]);
  const outFiles = fileRows.map(f => ({ filename: f.filename || '', content: f.content || '', language: f.language || 'none' }));
  return res.json(rowToPaste(updated, { files: outFiles.length ? outFiles : undefined }));
});

app.delete('/api/pastes/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT user_id FROM pastes WHERE id = ?', [id]);
  if (!row || row.user_id !== req.session.userId) return res.status(404).json({ error: 'Paste not found' });
  if (String(id).startsWith('example-seed-')) return res.status(403).json({ error: 'Default example paste cannot be deleted' });
  dbRun('DELETE FROM paste_files WHERE paste_id = ?', [id]);
  dbRun('DELETE FROM pastes WHERE id = ?', [id]);
  return res.json({ ok: true });
});
app.post('/api/pastes/:id/star', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Paste not found' });
  const isOwner = req.session && req.session.userId === row.user_id;
  const existing = dbGet('SELECT 1 AS ok FROM paste_stars WHERE paste_id = ? AND user_id = ?', [id, req.session.userId]);
  if (existing) dbRun('DELETE FROM paste_stars WHERE paste_id = ? AND user_id = ?', [id, req.session.userId]);
  else dbRun('INSERT INTO paste_stars (paste_id, user_id, created_at) VALUES (?, ?, ?)', [id, req.session.userId, Date.now()]);
  const stars = (dbGet('SELECT COUNT(*) AS c FROM paste_stars WHERE paste_id = ?', [id]) || {}).c || 0;
  return res.json({ starred: !existing, stars });
});
app.get('/api/pastes/:id/comments', (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Paste not found' });
  const isOwner = req.session && req.session.userId === row.user_id;
  const rows = dbAll(`
    SELECT c.id, c.content, c.created_at, c.parent_id, u.username
    FROM paste_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.paste_id = ?
    ORDER BY c.created_at ASC
    LIMIT 200
  `, [id]);
  return res.json({ comments: rows.map(r => ({ id: r.id, content: r.content || '', username: r.username || '', createdAt: r.created_at, parentId: r.parent_id || null })) });
});
app.post('/api/pastes/:id/comments', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id' });
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Paste not found' });
  const isOwner = req.session && req.session.userId === row.user_id;
  const content = sanitizeString((req.body || {}).content, 1000) || '';
  if (!content) return res.status(400).json({ error: 'Comment is required' });
  let parentId = (req.body || {}).parentId;
  if (parentId != null) {
    parentId = parseInt(parentId, 10);
    if (!Number.isInteger(parentId) || parentId < 1) parentId = null;
    else {
      const parentRow = dbGet('SELECT id FROM paste_comments WHERE paste_id = ? AND id = ?', [id, parentId]);
      if (!parentRow) parentId = null;
    }
  } else parentId = null;
  dbRun('INSERT INTO paste_comments (paste_id, user_id, content, created_at, parent_id) VALUES (?, ?, ?, ?, ?)', [id, req.session.userId, content, Date.now(), parentId]);
  return res.status(201).json({ ok: true });
});
app.post('/api/v1/pastes', requireApiKey, (req, res) => {
  const p = req.body || {};
  let id = p.id;
  if (id != null) {
    if (typeof id !== 'string' || !PASTE_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid paste id format' });
  } else {
    id = crypto.randomBytes(8).toString('hex');
  }
  const now = Date.now();
  const title = sanitizeString(p.title, 500) || 'Untitled';
  const content = typeof p.content === 'string' ? p.content.slice(0, 10 * 1024 * 1024) : '';
  const language = ALLOWED_LANGS.has(p.language) ? p.language : 'none';
  const folder = sanitizeString(p.folder, 32);
  const category = sanitizeString(p.category, 64);
  const tags = Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string' && t.length <= 32).slice(0, 50) : [];
  const expiration = EXPIRATION_CODES.has(p.expiration) ? p.expiration : 'N';
  const exposure = typeof p.exposure === 'number' && p.exposure >= 0 && p.exposure <= 2 ? p.exposure : 0;
  const password = p.password != null ? sanitizeString(String(p.password), 128) : null;
  dbRun(`
    INSERT INTO pastes (id, user_id, title, content, language, folder, category, tags, expiration, exposure, password, burn_after_read, burn_after_views, views, pinned, forked_from_id, reply_to_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, req.apiUserId, title, content, language, folder, category,
    JSON.stringify(tags), expiration, exposure, password, p.burnAfterRead ? 1 : 0, 0, 0, p.pinned ? 1 : 0, null, null, now, now
  ]);
  return res.status(201).json({ id, url: `/p/${id}`, rawUrl: `/raw/${id}` });
});

function escapeXml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Atom feed: GET /feed or /feed.xml — public pastes only. ?user=username filters by user. */
function serveFeed(req, res) {
  const userFilter = sanitizeString((req.query && req.query.user) || '', 64);
  let rows;
  if (userFilter) {
    const u = dbGet('SELECT id FROM users WHERE username = ?', [userFilter]);
    if (!u) { res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8'); return res.send('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>WOX-Bin</title><entry><title>No pastes</title></entry></feed>'); }
    rows = dbAll(`
      SELECT p.id, p.title, p.content, p.language, p.updated_at, u.username
      FROM pastes p
      JOIN users u ON u.id = p.user_id
      WHERE p.exposure = 0 AND p.user_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 50
    `, [u.id]);
  } else {
    rows = dbAll(`
      SELECT p.id, p.title, p.content, p.language, p.updated_at, u.username
      FROM pastes p
      JOIN users u ON u.id = p.user_id
      WHERE p.exposure = 0
      ORDER BY p.updated_at DESC
      LIMIT 50
    `);
  }
  const baseUrl = (req.protocol || 'http') + '://' + (req.get('host') || 'localhost');
  const feedTitle = userFilter ? `WOX-Bin – ${escapeXml(userFilter)}` : 'WOX-Bin – Public pastes';
  let xml = '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">';
  xml += '<title>' + escapeXml(feedTitle) + '</title><link href="' + escapeXml(baseUrl + req.originalUrl) + '" rel="self"/>';
  xml += '<updated>' + new Date().toISOString() + '</updated>';
  for (const r of rows) {
    const link = baseUrl + '/p/' + r.id;
    const updated = r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString();
    xml += '<entry>';
    xml += '<id>urn:woxbin:' + escapeXml(r.id) + '</id>';
    xml += '<title>' + escapeXml(r.title || 'Untitled') + '</title>';
    xml += '<link href="' + escapeXml(link) + '"/>';
    xml += '<updated>' + updated + '</updated>';
    xml += '<author><name>' + escapeXml(r.username || '') + '</name></author>';
    xml += '<summary type="text">' + escapeXml((r.content || '').slice(0, 500)) + '</summary>';
    xml += '</entry>';
  }
  xml += '</feed>';
  res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
  return res.send(xml);
}
app.get('/feed', serveFeed);
app.get('/feed.xml', serveFeed);

/** Pastebin-style raw endpoint: /raw/:id. Supports ?password= for password-protected pastes. */
app.get('/raw/:id', (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).type('text/plain').send('Invalid paste id');
  const row = dbGet('SELECT * FROM pastes WHERE id = ?', [id]);
  if (!row) return res.status(404).type('text/plain').send('Paste not found');
  const isOwner = req.session && req.session.userId === row.user_id;
  const hasPassword = row.password != null && String(row.password).trim() !== '';
  if (!isOwner && hasPassword) {
    const provided = (req.query && req.query.password != null) ? String(req.query.password) : '';
    if (provided.trim() !== row.password) return res.status(403).type('text/plain').send('This paste is password-protected');
  }
  if (!isOwner) dbRun('UPDATE pastes SET views = views + 1 WHERE id = ?', [id]);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(row.content || '');
});
app.get('/p/:id', (req, res) => {
  const id = req.params.id;
  if (!id || !PASTE_ID_REGEX.test(id)) return res.status(400).type('text/plain').send('Invalid paste id');
  return res.redirect('/?p=' + encodeURIComponent(id));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    const local = `http://localhost:${PORT}`;
    const network = getNetworkUrl();
    const w = 42;
    console.log('');
    console.log(g('  \u2554' + '\u2550'.repeat(w - 2) + '\u2557'));
    console.log(g('  \u2551') + '  Serving!' + ' '.repeat(w - 12) + g('\u2551'));
    console.log(g('  \u2551') + `  Local:   ${local}` + ' '.repeat(Math.max(0, w - 12 - local.length)) + g('\u2551'));
    if (network) console.log(g('  \u2551') + `  Network: ${network}` + ' '.repeat(Math.max(0, w - 12 - network.length)) + g('\u2551'));
    console.log(g('  \u2551') + ' ' + dim('Copied local address to clipboard!') + ' '.repeat(Math.max(0, w - 32)) + g('\u2551'));
    console.log(g('  \u255A' + '\u2550'.repeat(w - 2) + '\u255D'));
    console.log('');
    try {
      const { exec } = require('child_process');
      exec(`echo ${local} | clip`, { shell: true, windowsHide: true }, () => {});
    } catch (_) {}
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
