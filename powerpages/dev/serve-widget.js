#!/usr/bin/env node
/*
 * Local dev server for the Create-New-Proposal widget.
 *
 * Serves powerpages/web-templates/create-new-proposal.html over http://localhost
 * so the Google Places autocomplete can initialize (it can't on a file:// page —
 * Google rejects the null referrer). It:
 *   - injects your Google Maps key at serve time (never written to the file,
 *     never committed) — pass it via --key or the GOOGLE_MAPS_KEY env var;
 *   - rewrites the jsdelivr CDN <script> tags to your LOCAL repo copies, so you
 *     test the exact components in your working tree (no CDN, no version drift).
 *
 * Usage:
 *   node powerpages/dev/serve-widget.js --key AIza...            # default port 8000
 *   node powerpages/dev/serve-widget.js --key AIza... --port 8080
 *   GOOGLE_MAPS_KEY=AIza... node powerpages/dev/serve-widget.js
 *
 * Then open the URL it prints. See the "referrer" note it prints — your key must
 * allow the localhost origin, or set the key to unrestricted while testing.
 *
 * No dependencies — Node built-ins only.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- args ----
const argv = process.argv.slice(2);
function argVal(name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}
const KEY = argVal('--key') || process.env.GOOGLE_MAPS_KEY || '';
const PORT = Number(argVal('--port') || process.env.PORT || 8000);

const REPO_ROOT = path.resolve(__dirname, '../..');
const WIDGET = path.join(REPO_ROOT, 'powerpages/web-templates/create-new-proposal.html');
const CDN_PREFIX = 'https://cdn.jsdelivr.net/gh/ldjacobs72-create/brichaus-ui-kit@main/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function serveWidgetHtml(res) {
  let html;
  try { html = fs.readFileSync(WIDGET, 'utf8'); }
  catch (e) { res.writeHead(500); res.end('Cannot read widget: ' + e.message); return; }

  // Point the CDN component tags at this server's /core and /components routes.
  html = html.split(CDN_PREFIX).join('/');

  // Inject the Maps key (in memory only). Matches: GOOGLE_MAPS_KEY: '' or "".
  if (KEY) {
    html = html.replace(/GOOGLE_MAPS_KEY:\s*['"][^'"]*['"]/, "GOOGLE_MAPS_KEY: '" + KEY.replace(/'/g, "") + "'");
  }

  res.writeHead(200, { 'Content-Type': MIME['.html'] });
  res.end(html);
}

function serveRepoFile(urlPath, res) {
  // Only allow /core/* and /components/* out of the repo (no traversal).
  const clean = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (!/^\/(core|components)\//.test(clean)) { res.writeHead(404); res.end('not found'); return; }
  const file = path.join(REPO_ROOT, clean);
  if (!file.startsWith(REPO_ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + clean); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '/create-new-proposal.html') return serveWidgetHtml(res);
  return serveRepoFile(urlPath, res);
});

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT + '/';
  console.log('\n  Create-New-Proposal widget — local dev server');
  console.log('  ---------------------------------------------');
  console.log('  Serving:  ' + url);
  console.log('  Widget:   ' + path.relative(REPO_ROOT, WIDGET));
  console.log('  Maps key: ' + (KEY ? '(injected — ' + KEY.slice(0, 6) + '…)' : 'NOT SET — autocomplete will be inert'));
  console.log('  Components: served from your local repo (/core, /components)\n');
  if (!KEY) {
    console.log('  ⚠  No key. Pass one:  node powerpages/dev/serve-widget.js --key AIza...\n');
  }
  console.log('  ⚠  Google key referrer: your Maps API key must ALLOW this origin.');
  console.log('     In Google Cloud Console → the key → Application restrictions →');
  console.log('     HTTP referrers, add:  ' + url + '*');
  console.log('     (or set the key to "None" while testing). A restricted key will');
  console.log('     otherwise silently reject the autocomplete requests.\n');
  console.log('  Ctrl+C to stop.\n');
});
