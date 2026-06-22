import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';
import { existsSync, statSync, createReadStream } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const S30_DIST = resolve(__dirname, '..', 's30', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// dev 전용: /s30/* 를 s30/dist 정적 서빙(통합 미리보기). 프로덕션은 Express가 동일 역할.
const serveS30 = {
  name: 'serve-s30',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = (req.url || '').split('?')[0];
      if (url !== '/s30' && !url.startsWith('/s30/')) return next();
      try {
        const rel = decodeURIComponent(url.slice(4).replace(/^\/+/, ''));
        let file = join(S30_DIST, rel);
        if (!existsSync(file)) {
          if (existsSync(file + '.html')) {
            file = file + '.html';
          } else {
            return next();
          }
        }
        let st = statSync(file);
        if (st.isDirectory()) { file = join(file, 'index.html'); if (!existsSync(file)) return next(); st = statSync(file); }
        const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        const range = req.headers.range;
        if (range && type.startsWith('video')) {
          const m = /bytes=(\d+)-(\d*)/.exec(range);
          const start = parseInt(m[1], 10);
          const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Length', end - start + 1);
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader('Content-Length', st.size);
        return createReadStream(file).pipe(res);
      } catch { return next(); }
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), serveS30],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,           // 0.0.0.0 — LAN 전역 노출
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/api':  { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
