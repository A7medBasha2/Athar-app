import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

process.env.DISABLE_HMR = 'true';

dotenv.config({ quiet: true });

process.on('uncaughtException', (err) => {
  console.warn('[Athar Server] Handled uncaught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Athar Server] Handled unhandled rejection:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio requires port 3000 regardless of container environment PORT variable
  const PORT = 3000;

  // Security headers for public deployment
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // API health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Athar', timestamp: Date.now() });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Intercept any stale/cached browser request to /@vite/client and return a harmless ES module stub
    // so the browser never attempts a WebSocket connection that could fail with 'WebSocket closed without opened'
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(
        `export function createHotContext() { return { accept() {}, dispose() {}, prune() {}, invalidate() {}, on() {}, off() {}, send() {} }; }
export function updateStyle(id, content) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!el) {
    el = document.createElement('style');
    el.setAttribute('type', 'text/css');
    el.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(el);
  }
  el.textContent = content;
}
export function removeStyle(id) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (el) el.remove();
}
export function injectQuery(url) { return url; }
`
      );
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '30d',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Athar server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[Athar Server] Server listen error:', err);
  });
}

startServer();
