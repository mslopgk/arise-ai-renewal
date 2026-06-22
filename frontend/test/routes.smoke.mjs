// 라우팅/리다이렉트 스모크: 빌드된 dist를 정적 서빙(SPA fallback 포함)하고
// puppeteer로 경로별 최종 URL·핵심 DOM을 확인한다. node --test로 구동.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const DIST = resolve(__dirname, '..', 'dist');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.woff2':'font/woff2', '.jpg':'image/jpeg',
  '.png':'image/png', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.ico':'image/x-icon' };

// prod Express와 동일한 규칙을 최소 재현: 정적 우선 → 없으면 index.html(SPA fallback)
let server, browser, base;
before(async () => {
  server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = join(DIST, path === '/' ? 'index.html' : path);
    try {
      const st = await stat(file);
      if (st.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(DIST, 'index.html'); // SPA fallback
    }
    try {
      const buf = await readFile(file);
      res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] || 'application/octet-stream');
      res.end(buf);
    } catch { res.statusCode = 404; res.end('nf'); }
  });
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  // CHROME_PATH 환경변수로 크롬 실행파일 지정(폐쇄망/Windows 대응)
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: 'new', args: ['--no-sandbox'],
  });
});
after(async () => { await browser?.close(); server?.close(); });

async function gotoFinalPath(path) {
  const page = await browser.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle0' });
  // React Router의 클라이언트 Navigate(replace)가 networkidle0 이후에 실행될 수 있으므로
  // URL이 안정될 때까지 최대 3초 대기 (SPA 리다이렉트 대응)
  await page.waitForFunction(
    (initial) => location.pathname !== initial || document.getElementById('root')?.children.length > 0,
    { timeout: 3000, polling: 50 },
    path
  ).catch(() => {}); // timeout은 무시 — 최종 pathname을 그대로 반환
  // RR replace 후 클라이언트 URL
  const finalPath = await page.evaluate(() => location.pathname);
  const html = await page.content();
  await page.close();
  return { finalPath, html };
}

test('게이트웨이 /가 렌더된다', async () => {
  const { finalPath } = await gotoFinalPath('/');
  assert.equal(finalPath, '/');
});

test('/eligibility.html → /eligibility 로 리다이렉트', async () => {
  const { finalPath } = await gotoFinalPath('/eligibility.html');
  assert.equal(finalPath, '/eligibility');
});

test('/scholarship.html → /scholarship 로 리다이렉트', async () => {
  const { finalPath } = await gotoFinalPath('/scholarship.html');
  assert.equal(finalPath, '/scholarship');
});

// TODO: public/admission-v3-dark.html 삭제 후 GREEN (단계 3에서 skip 해제)
test('/admission-v3-dark.html → /admission 로 리다이렉트', { skip: 'TODO: 대응 .html 삭제 후 GREEN' }, async () => {
  const { finalPath } = await gotoFinalPath('/admission-v3-dark.html');
  assert.equal(finalPath, '/admission');
});

test('/arise.html → / 로 리다이렉트(보강)', async () => {
  const { finalPath } = await gotoFinalPath('/arise.html');
  assert.equal(finalPath, '/');
});
