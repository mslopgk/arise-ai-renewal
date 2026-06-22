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
