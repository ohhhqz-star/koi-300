#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'web');
const DEFAULT_DATA_DIR = process.env.FUPAN_DATA_DIR
  ? path.resolve(process.env.FUPAN_DATA_DIR)
  : path.join(ROOT, 'data');
const HOST = '127.0.0.1';
const MAX_BODY = 8 * 1024 * 1024;
const BACKUP_LIMIT = 80;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function emptyData() {
  return {
    schemaVersion: 1,
    assets: [],
    trades: [],
    reviews: [],
    plans: [],
    snapshots: [],
    lastModified: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  };
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateData(data) {
  if (!isPlainObject(data)) throw new Error('数据必须是一个 JSON 对象');
  const arrays = ['assets', 'trades', 'reviews', 'plans', 'snapshots'];
  for (const key of arrays) {
    if (!Array.isArray(data[key])) throw new Error(`字段 ${key} 必须是数组`);
    if (data[key].length > 50000) throw new Error(`字段 ${key} 的记录过多`);
  }
  if (data.schemaVersion != null && !Number.isFinite(Number(data.schemaVersion))) {
    throw new Error('schemaVersion 必须是数字');
  }
  return data;
}

function stamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function createApi({ dataDir }) {
  const dataFile = path.join(dataDir, 'portfolio.json');
  const backupDir = path.join(dataDir, 'backups');
  let queue = Promise.resolve();

  async function ensureDataFile() {
    await fsp.mkdir(backupDir, { recursive: true });
    try {
      await fsp.access(dataFile);
    } catch {
      await atomicWrite(JSON.stringify(emptyData(), null, 2) + '\n');
    }
  }

  async function atomicWrite(text) {
    await fsp.mkdir(dataDir, { recursive: true });
    const temp = path.join(dataDir, `.portfolio-${process.pid}-${Date.now()}.tmp`);
    await fsp.writeFile(temp, text, { encoding: 'utf8', mode: 0o600 });
    await fsp.rename(temp, dataFile);
  }

  async function readData() {
    await ensureDataFile();
    const raw = await fsp.readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  }

  async function statData() {
    await ensureDataFile();
    const info = await fsp.stat(dataFile);
    let parsed;
    try {
      parsed = JSON.parse(await fsp.readFile(dataFile, 'utf8'));
    } catch {
      parsed = null;
    }
    return {
      app: 'fupan-300',
      mode: 'local-file',
      dataFile,
      dataDir,
      mtimeMs: info.mtimeMs,
      size: info.size,
      counts: parsed
        ? {
            assets: Array.isArray(parsed.assets) ? parsed.assets.length : 0,
            trades: Array.isArray(parsed.trades) ? parsed.trades.length : 0,
            reviews: Array.isArray(parsed.reviews) ? parsed.reviews.length : 0,
            plans: Array.isArray(parsed.plans) ? parsed.plans.length : 0
          }
        : null
    };
  }

  async function backupData() {
    await ensureDataFile();
    const name = `portfolio-${stamp()}.json`;
    const target = path.join(backupDir, name);
    await fsp.copyFile(dataFile, target);
    await pruneBackups();
    return { name, path: target };
  }

  async function pruneBackups() {
    let names = [];
    try {
      names = (await fsp.readdir(backupDir))
        .filter((name) => /^portfolio-.*\.json$/.test(name))
        .sort();
    } catch {
      return;
    }
    for (const name of names.slice(0, Math.max(0, names.length - BACKUP_LIMIT))) {
      await fsp.unlink(path.join(backupDir, name)).catch(() => {});
    }
  }

  async function saveData(data) {
    const body = validateData(data);
    await ensureDataFile();
    await backupData();
    const mtimeBefore = (await fsp.stat(dataFile)).mtimeMs;
    await atomicWrite(JSON.stringify(body, null, 2) + '\n');
    const info = await fsp.stat(dataFile);
    // Some file systems have coarse mtime. Force a distinct change marker.
    if (Math.abs(info.mtimeMs - mtimeBefore) < 1) {
      await fsp.utimes(dataFile, new Date(), new Date(Date.now() + 5));
    }
    return statData();
  }

  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  void ensureDataFile().catch((error) => {
    console.error('[fupan-300] 无法初始化数据文件：', error.message);
  });

  return {
    dataFile,
    dataDir,
    readData,
    statData,
    backupData,
    saveData: (data) => enqueue(() => saveData(data)),
    backup: () => enqueue(() => backupData())
  };
}

function safeStaticPath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (pathname === '/') pathname = '/index.html';
  if (pathname.includes('\0')) return null;
  const target = path.resolve(WEB_DIR, '.' + pathname);
  if (target !== WEB_DIR && !target.startsWith(WEB_DIR + path.sep)) return null;
  return target;
}

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('请求内容超过 8 MB 限制'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sameOrigin(req, port) {
  // Reject DNS-rebinding hosts: only loopback names on our own port are valid.
  const allowed = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`
  ]);
  const host = String(req.headers.host || '').toLowerCase();
  if (!allowed.has(host)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && allowed.has(url.host.toLowerCase());
  } catch {
    return false;
  }
}

async function serveStatic(req, res, pathname) {
  const target = safeStaticPath(pathname);
  if (!target) {
    sendJSON(res, 400, { error: '无效路径' });
    return;
  }
  let file = target;
  try {
    let info = await fsp.stat(file);
    if (info.isDirectory()) {
      file = path.join(file, 'index.html');
      info = await fsp.stat(file);
    }
    if (!info.isFile()) throw new Error('not a file');
    const ext = path.extname(file).toLowerCase();
    const isHTML = ext === '.html';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': isHTML ? 'no-cache' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...(isHTML
        ? {
            'Content-Security-Policy':
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
          }
        : {})
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end('404 Not Found');
  }
}

function startServer(options = {}) {
  const dataDir = options.dataDir
    ? path.resolve(options.dataDir)
    : DEFAULT_DATA_DIR;
  const api = createApi({ dataDir });

  const server = http.createServer(async (req, res) => {
    const port = server.address()?.port || options.port || 0;
    const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);
    const pathname = url.pathname;

    try {
      if (pathname.startsWith('/api/')) {
        if (!sameOrigin(req, port)) {
          sendJSON(res, 403, { error: '只允许本机同源请求' });
          return;
        }
        if (req.method === 'GET' && pathname === '/api/status') {
          const status = await api.statData();
          sendJSON(res, 200, { ...status, port });
          return;
        }
        if (req.method === 'GET' && pathname === '/api/data') {
          const data = await api.readData();
          sendJSON(res, 200, data);
          return;
        }
        if (req.method === 'PUT' && pathname === '/api/data') {
          if (!(req.headers['content-type'] || '').includes('application/json')) {
            sendJSON(res, 415, { error: 'Content-Type 必须是 application/json' });
            return;
          }
          const raw = await readBody(req);
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            sendJSON(res, 400, { error: 'JSON 解析失败' });
            return;
          }
          const status = await api.saveData(parsed);
          sendJSON(res, 200, { ok: true, ...status, port });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/backup') {
          const result = await api.backup();
          sendJSON(res, 200, { ok: true, ...result });
          return;
        }
        sendJSON(res, 404, { error: '接口不存在' });
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJSON(res, 405, { error: '只支持 GET' });
        return;
      }
      await serveStatic(req, res, pathname);
    } catch (error) {
      const status = error.status || 500;
      sendJSON(res, status, { error: error.message || '服务器内部错误' });
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 4877, HOST, () => {
      server.off('error', reject);
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const url = `http://${HOST}:${port}/`;
      console.log('');
      console.log('  复盘 300 · 本地文件模式');
      console.log(`  打开：${url}`);
      console.log(`  数据：${api.dataFile}`);
      console.log('  只监听 127.0.0.1，关闭窗口或按 Ctrl+C 停止。');
      console.log('');
      resolve({ server, port, url, api, dataFile: api.dataFile });
      if (options.open) openBrowser(url);
    });
  });
}

function openBrowser(url) {
  const command =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(command, () => {});
}

async function startWithFallback(options = {}) {
  const preferred = Number(options.port || process.env.PORT || 4877);
  let lastError;
  for (let offset = 0; offset < 10; offset += 1) {
    try {
      return await startServer({ ...options, port: preferred + offset });
    } catch (error) {
      lastError = error;
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw lastError;
}

module.exports = { startServer, startWithFallback, emptyData, createApi };

if (require.main === module) {
  const noOpen = process.argv.includes('--no-open');
  startWithFallback({ open: !noOpen }).catch((error) => {
    console.error('启动失败：', error.message);
    process.exit(1);
  });
}
