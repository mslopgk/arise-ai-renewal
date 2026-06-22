import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveChromePath, DEFAULT_CHROME_CANDIDATES } from './lib/chrome-path.mjs';
test('env override wins when it exists', () => {
  assert.equal(resolveChromePath({ CHROME_PATH: 'X:/c/chrome.exe' }, DEFAULT_CHROME_CANDIDATES, p => p === 'X:/c/chrome.exe'), 'X:/c/chrome.exe');
});
test('falls back to first existing candidate', () => {
  assert.equal(resolveChromePath({}, ['A/none.exe','B/chrome.exe'], p => p === 'B/chrome.exe'), 'B/chrome.exe');
});
test('throws when nothing found', () => {
  assert.throws(() => resolveChromePath({}, ['A/x.exe'], () => false), /Chrome not found/);
});
test('candidates include known Chrome path', () => {
  assert.ok(DEFAULT_CHROME_CANDIDATES.some(p => p.includes('Google/Chrome/Application/chrome.exe')));
});

// ── Task 2: targets module ──────────────────────────────────────────────────
import { TARGETS, resolveTargets } from './lib/targets.mjs';

test('TARGETS defines exactly 4 entries', () => {
  assert.equal(TARGETS.length, 4);
});

test('each target has key, livePath, localPath, and scenarios array', () => {
  for (const t of TARGETS) {
    assert.ok(typeof t.key === 'string' && t.key.length > 0, `key missing on ${t.key}`);
    assert.ok(typeof t.livePath === 'string' && t.livePath.length > 0, `livePath missing on ${t.key}`);
    assert.ok(typeof t.localPath === 'string' && t.localPath.length > 0, `localPath missing on ${t.key}`);
    assert.ok(Array.isArray(t.scenarios), `scenarios not array on ${t.key}`);
  }
});

test('resolveTargets with empty filter returns all targets', () => {
  assert.deepEqual(resolveTargets([]), TARGETS);
  assert.deepEqual(resolveTargets(null), TARGETS);
  assert.deepEqual(resolveTargets(undefined), TARGETS);
});

test('resolveTargets with known keys returns matching subset', () => {
  const result = resolveTargets(['arise', 'admission']);
  assert.equal(result.length, 2);
  assert.equal(result[0].key, 'arise');
  assert.equal(result[1].key, 'admission');
});

test('resolveTargets throws /unknown target/i for unknown key', () => {
  assert.throws(() => resolveTargets(['nope']), /unknown target/i);
});

test('admission scenarios include countdown (#cd-status + #dday), directory, and modal', () => {
  const admission = TARGETS.find(t => t.key === 'admission');
  assert.ok(admission, 'admission target not found');

  const countdown = admission.scenarios.find(s => s.type === 'countdown-freeze');
  assert.ok(countdown, 'countdown-freeze scenario missing');
  assert.ok(
    countdown.selectors.includes('#cd-status'),
    '#cd-status not in countdown-freeze selectors'
  );
  assert.ok(
    countdown.selectors.includes('#dday'),
    '#dday not in countdown-freeze selectors'
  );

  const directory = admission.scenarios.find(s => s.type === 'directory');
  assert.ok(directory, 'directory scenario missing');

  const modal = admission.scenarios.find(s => s.type === 'modal');
  assert.ok(modal, 'modal scenario missing');
});

// ── Task 3: compare module ─────────────────────────────────────────────────
import { normalizeText, diffTextMap, diffCountMap, decodePngRaw, pixelDiff } from './lib/compare.mjs';

// ── test-only helpers ──────────────────────────────────────────────────────
import zlib from 'node:zlib';

function crc32(buf) {
  const table = crc32._table || (crc32._table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function makeSolidPng(r, g, b, a) {
  // 1x1 PNG, colorType 6 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8;              // bit depth
  ihdrData[9] = 6;              // colorType RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const rawPixel = Buffer.from([0, r, g, b, a]); // filter byte 0 + RGBA
  const compressed = zlib.deflateSync(rawPixel);

  const iend = Buffer.alloc(0);

  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', iend)]);
}

// ── normalizeText ──────────────────────────────────────────────────────────
test('normalizeText: null/undefined returns empty string', () => {
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(undefined), '');
});

test('normalizeText: collapses whitespace and trims', () => {
  assert.equal(normalizeText('  hello   world  '), 'hello world');
});

test('normalizeText: NBSP ( ) replaced by space', () => {
  assert.equal(normalizeText('a b'), 'a b');
});

// ── diffTextMap ────────────────────────────────────────────────────────────
test('diffTextMap: identical maps return empty array', () => {
  assert.deepEqual(diffTextMap({ a: 'hello' }, { a: 'hello' }), []);
});

test('diffTextMap: different values reported', () => {
  const result = diffTextMap({ a: 'foo' }, { a: 'bar' });
  assert.equal(result.length, 1);
  assert.equal(result[0].selector, 'a');
  assert.equal(result[0].live, 'foo');
  assert.equal(result[0].local, 'bar');
});

test('diffTextMap: key present in only one side reported', () => {
  const result = diffTextMap({ a: 'x' }, {});
  assert.equal(result.length, 1);
  assert.equal(result[0].selector, 'a');
  assert.equal(result[0].local, '');
});

// ── diffCountMap ───────────────────────────────────────────────────────────
test('diffCountMap: identical maps return empty array', () => {
  assert.deepEqual(diffCountMap({ a: 3 }, { a: 3 }), []);
});

test('diffCountMap: differing counts reported', () => {
  const result = diffCountMap({ a: 2 }, { a: 5 });
  assert.equal(result.length, 1);
  assert.equal(result[0].live, 2);
  assert.equal(result[0].local, 5);
});

test('diffCountMap: missing key defaults to 0', () => {
  const result = diffCountMap({ a: 1 }, {});
  assert.equal(result.length, 1);
  assert.equal(result[0].local, 0);
});

// ── pixelDiff ──────────────────────────────────────────────────────────────
test('pixelDiff: identical images return mismatched=0', () => {
  const img = { width: 1, height: 1, data: new Uint8Array([100, 150, 200, 255]) };
  const r = pixelDiff(img, img);
  assert.equal(r.mismatched, 0);
  assert.equal(r.sizeMismatch, false);
});

test('pixelDiff: sub-threshold difference ignored', () => {
  const a = { width: 1, height: 1, data: new Uint8Array([100, 100, 100, 255]) };
  const b = { width: 1, height: 1, data: new Uint8Array([101, 100, 100, 255]) }; // diff=1, threshold default 12
  const r = pixelDiff(a, b);
  assert.equal(r.mismatched, 0);
});

test('pixelDiff: over-threshold difference counted', () => {
  const a = { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 255]) };
  const b = { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }; // diff=255 > 12
  const r = pixelDiff(a, b);
  assert.equal(r.mismatched, 1);
});

test('pixelDiff: size mismatch sets sizeMismatch=true, compares smaller overlap', () => {
  const a = { width: 2, height: 1, data: new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]) };
  const b = { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 255]) };
  const r = pixelDiff(a, b);
  assert.equal(r.sizeMismatch, true);
  assert.equal(r.width, 1);
  assert.equal(r.height, 1);
});

// ── decodePngRaw round-trip ────────────────────────────────────────────────
test('decodePngRaw: 1x1 solid PNG round-trip (RGBA)', () => {
  const png = makeSolidPng(255, 128, 64, 200);
  const img = decodePngRaw(png);
  assert.equal(img.width, 1);
  assert.equal(img.height, 1);
  assert.equal(img.data[0], 255); // R
  assert.equal(img.data[1], 128); // G
  assert.equal(img.data[2], 64);  // B
  assert.equal(img.data[3], 200); // A
});

test('decodePngRaw: throws on invalid PNG signature', () => {
  assert.throws(() => decodePngRaw(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])), /not a PNG/);
});
