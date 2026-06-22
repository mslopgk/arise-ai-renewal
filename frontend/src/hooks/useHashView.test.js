import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { viewFromHash } from './useHashView.js';

const KEYS = ['why-grad', 'eligibility', 'benefits', 'departments'];

describe('viewFromHash', () => {
  afterEach(() => {
    delete globalThis.window;
  });

  test('no hash returns null (intro)', () => {
    globalThis.window = { location: { hash: '' } };
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, null);
  });

  test('valid hash returns that view', () => {
    globalThis.window = { location: { hash: '#departments' } };
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, 'departments');
  });

  test('invalid hash returns null', () => {
    globalThis.window = { location: { hash: '#invalid' } };
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, null);
  });

  test('hash indexOf lookup works', () => {
    globalThis.window = { location: { hash: '#eligibility' } };
    const result = viewFromHash(KEYS);
    assert.strictEqual(result, 'eligibility');
  });
});
