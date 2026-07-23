import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProjectSummary, getAllProjects } from './storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(__dirname, '..', 'ui');
const PORT = parseInt(process.env.TOKEN_WUER_PORT ?? '4872', 10);

function sendJSON(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function serveFile(res: ServerResponse, filePath: string, contentType: string) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const content = readFileSync(filePath, 'utf-8');
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API
  if (url.pathname === '/api/current') {
    const cwd = process.cwd();
    const summary = getProjectSummary(cwd);
    sendJSON(res, summary ?? { project: cwd, totals: { waterMl: 0, tokens: 0, liters: 0 }, sessions: [], sessionCount: 0 });
    return;
  }

  if (url.pathname === '/api/projects') {
    const projects = getAllProjects().map(p => ({
      name: p.name,
      platform: p.platform,
      path: p.path,
      totals: {
        waterMl: Math.round(p.totals.waterMl * 100) / 100,
        tokens: p.totals.tokens,
      },
      sessionCount: p.sessions.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    sendJSON(res, projects);
    return;
  }

  if (url.pathname === '/api/project') {
    const projectPath = url.searchParams.get('path');
    if (!projectPath) {
      sendJSON(res, { error: 'path param required' }, 400);
      return;
    }
    const summary = getProjectSummary(projectPath);
    sendJSON(res, summary ?? { error: 'not found' }, summary ? 200 : 404);
    return;
  }

  // Static pages
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    serveFile(res, join(UI_DIR, 'dashboard.html'), 'text/html');
    return;
  }
  if (url.pathname === '/bottle') {
    serveFile(res, join(UI_DIR, 'bottle.html'), 'text/html');
    return;
  }
  if (url.pathname === '/widget') {
    serveFile(res, join(UI_DIR, 'widget.html'), 'text/html');
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

export function openWidget(): void {
  const widgetUrl = `http://localhost:${PORT}/widget`;
  import('node:child_process').then(({ execSync }) => {
    const browsers = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'];
    for (const bin of browsers) {
      try {
        execSync(`which ${bin}`, { stdio: 'ignore' });
        execSync(`${bin} --app="${widgetUrl}" --window-size=140,210 --window-position=12,12 &`, { stdio: 'ignore' });
        setTimeout(() => {
          try { execSync('wmctrl -r "Token-WUEr" -b add,above', { stdio: 'ignore' }); } catch { /* not X11 */ }
        }, 1500);
        return;
      } catch { /* try next browser */ }
    }
    try { execSync(`xdg-open "${widgetUrl}"`, { stdio: 'ignore' }); } catch { /* no luck */ }
  }).catch(() => { /* child_process unavailable */ });
}

export function startHTTPServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(handleRequest);
    server.on('error', (err: Error) => {
      process.stderr.write(`[token-wuer] HTTP server error: ${err.message}\n`);
      reject(err);
    });
    server.listen(PORT, () => {
      process.stderr.write(`[token-wuer] Dashboard: http://localhost:${PORT}\n`);
      if (process.env.TOKEN_WUER_WIDGET === '1') {
        setTimeout(() => openWidget(), 500);
      }
      resolve();
    });
  });
}
