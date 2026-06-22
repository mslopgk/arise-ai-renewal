#!/usr/bin/env node
/**
 * parity-check.mjs — 패리티 검증 하니스 진입점
 *
 * 사용법:
 *   node scripts/parity-check.mjs [targets] [options]
 *
 * targets: comma-separated keys (arise,eligibility,scholarship,admission)
 *          생략 시 전체 실행
 *
 * Options:
 *   --live <base>      라이브 base URL (기본: https://arise-ai.pusan.ac.kr)
 *   --local <base>     로컬 base URL  (기본: http://localhost:5173)
 *   --viewport WxH,…  뷰포트 목록     (기본: 1280x800,390x844)
 *   --out <dir>        스크린샷 출력 디렉터리 (기본: frontend/.shot)
 *   --threshold <n>    픽셀 diff 임계값 (기본: 12)
 *   --no-live          라이브 사이트 비교 생략
 *
 * 종료코드: 0=통과 / 1=회귀
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { resolveChromePath, DEFAULT_CHROME_CANDIDATES } from './lib/chrome-path.mjs';
import { resolveTargets } from './lib/targets.mjs';
import { diffTextMap, diffCountMap, pixelDiff, decodePngRaw } from './lib/compare.mjs';

// ── CLI 파싱 ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

// positional: args that are NOT --flag and NOT a value immediately following --flag
const flagsWithValues = new Set(['--live', '--local', '--viewport', '--out', '--threshold']);
const positionalKeys = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (flagsWithValues.has(a)) {
    i++; // skip the value
  } else if (!a.startsWith('--')) {
    positionalKeys.push(...a.split(',').filter(Boolean));
  }
  // else: --no-live and other boolean flags are skipped
}

const liveBase = getFlag('--live') ?? 'https://arise-ai.pusan.ac.kr';
const localBase = getFlag('--local') ?? 'http://localhost:5173';
const outDir = getFlag('--out') ?? path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.shot'
);
const threshold = Number(getFlag('--threshold') ?? '12');
const noLive = hasFlag('--no-live');

const viewportArg = getFlag('--viewport') ?? '1280x800,390x844';
const viewports = viewportArg.split(',').map((v) => {
  const [w, h] = v.split('x').map(Number);
  if (!w || !h) throw new Error(`invalid viewport spec: ${v}`);
  return { width: w, height: h };
});

// ── target 해석 ───────────────────────────────────────────────────────────────
const targets = resolveTargets(positionalKeys.length ? positionalKeys : undefined);

// ── Chrome 경로 해결 ──────────────────────────────────────────────────────────
const exe = resolveChromePath(process.env, DEFAULT_CHROME_CANDIDATES, fs.existsSync);
console.log(`[parity] chrome: ${exe}`);

// ── 출력 디렉터리 확보 ────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true });

// ── Date 동결 스크립트 (2026-06-22 고정) ─────────────────────────────────────
// 카운트다운 등 시간 의존 요소를 고정해 패리티 비교 오염 방지
const FROZEN_TS = new Date('2026-06-22T00:00:00+09:00').getTime();
const DATE_FREEZE_SCRIPT = `
(function () {
  const FROZEN = ${FROZEN_TS};
  const _Date = Date;
  class FrozenDate extends _Date {
    constructor(...args) {
      if (args.length === 0) { super(FROZEN); } else { super(...args); }
    }
    static now() { return FROZEN; }
  }
  // copy static members
  Object.getOwnPropertyNames(_Date).forEach(k => {
    if (!(k in FrozenDate)) {
      try { FrozenDate[k] = _Date[k]; } catch (_) {}
    }
  });
  Object.defineProperty(window, 'Date', { value: FrozenDate, configurable: true, writable: true });
})();
`;

// ── helper: page → screenshot Buffer ─────────────────────────────────────────
async function captureFullPage(page, url, viewport) {
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(DATE_FREEZE_SCRIPT);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
  const buf = await page.screenshot({ fullPage: true, type: 'png' });
  return buf;
}

// ── helper: extract text map from page ───────────────────────────────────────
async function extractTextMap(page, selectors) {
  return page.evaluate((sels) => {
    const out = {};
    for (const sel of sels) {
      try {
        const el = document.querySelector(sel);
        out[sel] = el ? (el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
      } catch (_) {
        out[sel] = '';
      }
    }
    return out;
  }, selectors);
}

// ── helper: extract count map from page ──────────────────────────────────────
async function extractCountMap(page, selectors) {
  return page.evaluate((sels) => {
    const out = {};
    for (const sel of sels) {
      try {
        out[sel] = document.querySelectorAll(sel).length;
      } catch (_) {
        out[sel] = 0;
      }
    }
    return out;
  }, selectors);
}

// ── 메인 실행 ─────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const summary = {
  generated: new Date().toISOString(),
  frozenDate: '2026-06-22',
  localBase,
  liveBase: noLive ? null : liveBase,
  threshold,
  results: [],
};

let hasRegression = false;

try {
  for (const target of targets) {
    for (const vp of viewports) {
      const vpStr = `${vp.width}x${vp.height}`;
      const prefix = `${target.key}_${vpStr}`;
      console.log(`\n[parity] ── ${target.key} @ ${vpStr} ──`);

      // local capture
      const localUrl = localBase.replace(/\/$/, '') + target.localPath;
      const localPngPath = path.join(outDir, `${prefix}_local.png`);

      let localBuf, localTextMap, localCountMap;
      {
        const page = await browser.newPage();
        try {
          localBuf = await captureFullPage(page, localUrl, vp);
          localTextMap = await extractTextMap(page, target.textSelectors ?? []);
          localCountMap = await extractCountMap(page, target.domCountSelectors ?? []);
          fs.writeFileSync(localPngPath, localBuf);
          console.log(`[parity]   local  → ${localPngPath}`);
        } finally {
          await page.close();
        }
      }

      // live capture (unless --no-live)
      let liveTextMap = null, liveCountMap = null, livePngPath = null;
      let pixelResult = null, textDiffs = [], countDiffs = [];

      if (!noLive) {
        const liveUrl = liveBase.replace(/\/$/, '') + target.livePath;
        livePngPath = path.join(outDir, `${prefix}_live.png`);
        let liveBuf;
        {
          const page = await browser.newPage();
          try {
            liveBuf = await captureFullPage(page, liveUrl, vp);
            liveTextMap = await extractTextMap(page, target.textSelectors ?? []);
            liveCountMap = await extractCountMap(page, target.domCountSelectors ?? []);
            fs.writeFileSync(livePngPath, liveBuf);
            console.log(`[parity]   live   → ${livePngPath}`);
          } finally {
            await page.close();
          }
        }

        // compare
        const localImg = decodePngRaw(localBuf);
        const liveImg = decodePngRaw(liveBuf);
        pixelResult = pixelDiff(localImg, liveImg, { threshold });
        textDiffs = diffTextMap(liveTextMap, localTextMap);
        countDiffs = diffCountMap(liveCountMap, localCountMap);

        const pctStr = (pixelResult.ratio * 100).toFixed(2);
        const pixelPass = pixelResult.ratio < 0.05; // <5% diff = pass
        console.log(`[parity]   pixel  : ${pixelResult.mismatched}/${pixelResult.total} diff pixels (${pctStr}%) ${pixelPass ? '✓' : '✗'}`);
        if (pixelResult.sizeMismatch) {
          console.log(`[parity]   ⚠ size mismatch local=${localImg.width}x${localImg.height} live=${liveImg.width}x${liveImg.height}`);
        }
        if (textDiffs.length) {
          console.log(`[parity]   text diffs (${textDiffs.length}):`);
          for (const d of textDiffs) {
            console.log(`[parity]     ${d.selector}: live="${d.live}" local="${d.local}"`);
          }
        }
        if (countDiffs.length) {
          console.log(`[parity]   count diffs (${countDiffs.length}):`);
          for (const d of countDiffs) {
            console.log(`[parity]     ${d.selector}: live=${d.live} local=${d.local}`);
          }
        }

        const regression = !pixelPass || textDiffs.length > 0 || countDiffs.length > 0;
        if (regression) hasRegression = true;
      }

      // scenario checklist
      console.log(`[parity]   scenarios:`);
      for (const sc of target.scenarios ?? []) {
        // In this tool, scenarios are enumerated (not executed as puppeteer flows).
        // The checklist is informational; actual scenario execution is out of scope
        // for the static parity capture pass.
        console.log(`[parity]     [ ] ${sc.type}: ${sc.description}`);
      }

      // accumulate summary
      summary.results.push({
        target: target.key,
        viewport: vpStr,
        localUrl,
        liveUrl: noLive ? null : (liveBase.replace(/\/$/, '') + target.livePath),
        localPng: localPngPath,
        livePng: livePngPath,
        pixel: pixelResult,
        textDiffs,
        countDiffs,
        scenarios: (target.scenarios ?? []).map((s) => ({ type: s.type, description: s.description, status: 'pending' })),
      });
    }
  }
} finally {
  await browser.close();
}

// ── 결과 출력 ─────────────────────────────────────────────────────────────────
console.log('\n[parity] ══ SCENARIO CHECKLIST ══');
for (const r of summary.results) {
  console.log(`\n  ${r.target} @ ${r.viewport}`);
  if (r.pixel) {
    const pct = (r.pixel.ratio * 100).toFixed(2);
    const pass = r.pixel.ratio < 0.05;
    console.log(`    pixel diff: ${r.pixel.mismatched}/${r.pixel.total} (${pct}%) ${pass ? 'PASS' : 'FAIL'}`);
  }
  if (r.textDiffs.length) console.log(`    text diffs: ${r.textDiffs.length}`);
  if (r.countDiffs.length) console.log(`    count diffs: ${r.countDiffs.length}`);
  for (const sc of r.scenarios) {
    console.log(`    [ ] ${sc.type}: ${sc.description}`);
  }
}

// ── parity-summary.json 기록 ──────────────────────────────────────────────────
const summaryPath = path.join(outDir, 'parity-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\n[parity] summary written → ${summaryPath}`);

if (noLive) {
  console.log('[parity] --no-live: live comparison skipped');
}

const status = hasRegression ? 'REGRESSION' : 'PASS';
console.log(`[parity] result: ${status}`);
process.exit(hasRegression ? 1 : 0);
