// frontend/src/lib 단위테스트 러너 sanity (Task 2.1 통과 후 삭제 가능)
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node --test 러너 동작 확인', () => {
  assert.equal(1 + 1, 2);
});
