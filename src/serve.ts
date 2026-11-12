// Local preview: builds the site, serves _site/ on http://localhost:4000,
// and rebuilds whenever content, code, styles or scripts change.
// A failed build is reported here; the last good build keeps being served.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, extname, dirname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '127.0.0.1';   // set HOST=0.0.0.0 to preview from a phone on the same network
const WATCH = ['content', 'src', 'css', 'js', 'fonts', 'img'];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// Each build runs in a fresh process, so edits to src/ take effect too.
function rebuild(reason: string): void {
  const r = spawnSync(process.execPath, [join(ROOT, 'src/build.ts')], { encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim();
  console.log(`[${new Date().toLocaleTimeString()}] ${reason}\n${out}\n`);
}

rebuild('starting');

let timer: NodeJS.Timeout | undefined;
for (const dir of WATCH) {
  if (!existsSync(join(ROOT, dir))) continue;
  watch(join(ROOT, dir), { recursive: true }, (_event, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(`changed ${dir}/${file ?? ''}`), 120);
  });
}

createServer((req, res) => {
  let url: string;
  try {
    url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad request');
    return;
  }
  let path = normalize(join(OUT, url));
  // Only files inside _site/ (the separator stops look-alikes such as _site-old/).
  if (path !== OUT && !path.startsWith(OUT + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(path) && statSync(path).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: url + '/' }).end(); return; }
    path = join(path, 'index.html');
  }
  if (!existsSync(path)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(path));
}).listen(PORT, HOST, () => console.log(`Serving _site/ at http://${HOST}:${PORT}  (Ctrl+C to stop)\n`));
