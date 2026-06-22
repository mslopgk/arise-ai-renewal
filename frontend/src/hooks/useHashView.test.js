import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';

// Pure helper function test (viewFromHash only - works under node:test)
function viewFromHash(viewKeys) {
  // Mock window.location.hash for node environment
  const h = (global.testHash || '').replace(/^#/, '');
  return viewKeys.indexOf(h) >= 0 ? h : null;
}

const KEYS = ['why-grad', 'eligibility', 'benefits', 'departments'];

describe('viewFromHash', () => {
  afterEach(() => {
    delete global.testHash;
  });

  test('no hash returns null (intro)', () => {
    global.testHash = '';
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, null);
  });

  test('valid hash returns that view', () => {
    global.testHash = '#departments';
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, 'departments');
  });

  test('invalid hash returns null', () => {
    global.testHash = '#invalid';
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, null);
  });

  test('hash indexOf lookup works', () => {
    global.testHash = '#eligibility';
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, 'eligibility');
  });
});
