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
