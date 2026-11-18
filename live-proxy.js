/**
 * =========================================================
 *  ANARCHY — Live Proxy + Static Server
 * =========================================================
 *  بيخلي الموقع يعرف إذا Shenzoe لايف على Kick، وبيقدّم
 *  ملفات الموقع من نفس السيرفر.
 *
 *  التشغيل:
 *     node live-proxy.js
 *  ثم افتح:
 *     http://localhost:8080
 *
 *  متطلبات: Node.js 18 أو أحدث (fetch مدمج)
 *
 *  متغيرات اختيارية:
 *     PORT=8080
 *     KICK_SLUG=shenzoe
 *     CACHE_MS=20000
 * =========================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const SLUG = process.env.KICK_SLUG || 'shenzoe';
const CACHE_MS = Number(process.env.CACHE_MS || 20000);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4'
};

let cache = { at: 0, body: null };

async function getKick() {
  const now = Date.now();
  if (cache.body && now - cache.at < CACHE_MS) return cache.body;

  const res = await fetch(`https://kick.com/api/v2/channels/${SLUG}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://kick.com/'
    }
  });

  if (!res.ok) throw new Error('Kick responded ' + res.status);

  const text = await res.text();
  // تأكيد إن الرد JSON فعلاً
  JSON.parse(text);
  cache = { at: now, body: text };
  return text;
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (url.pathname === '/api/live' || url.pathname === '/api/live/') {
    try {
      const body = await getKick();
      return send(res, 200, body);
    } catch (err) {
      return send(res, 502, JSON.stringify({ ok: false, error: String(err.message || err) }));
    }
  }

  // ملفات الموقع
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/' || filePath === '') filePath = '/index.html';

  const full = path.join(ROOT, path.normalize(filePath).replace(/^(\.\.[/\\])+/, ''));

  if (!full.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');

  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
    send(res, 200, data, type);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ANARCHY live proxy`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  Kick channel: ${SLUG}\n`);
});
