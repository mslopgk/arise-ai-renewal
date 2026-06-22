import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeCountdown } from './useCountdown.js';

const OPEN  = new Date('2026-07-09T09:00:00+09:00').getTime();
const CLOSE = new Date('2026-07-16T23:59:59+09:00').getTime();

describe('computeCountdown (admission intro 패리티)', () => {
  it('접수 전 100h 이상: 시계는 99:99:99 대기, D-day는 일수', () => {
    const now = new Date('2026-07-01T09:00:00+09:00').getTime(); // 8일 전
    const r = computeCountdown(now, OPEN, CLOSE);
    assert.strictEqual(r.dday, 'D-8');
    assert.deepStrictEqual([r.h, r.m, r.s], ['99','99','99']);
    assert.strictEqual(r.statusLabel, 'Status · 접수 시작까지');
  });
  it('접수 전 100h 미만: 실제 시:분:초', () => {
    const now = OPEN - (10*3600000 + 5*60000 + 3*1000); // 10:05:03 전
    const r = computeCountdown(now, OPEN, CLOSE);
    assert.strictEqual(r.dday, 'D-0');
    assert.deepStrictEqual([r.h, r.m, r.s], ['10','05','03']);
  });
  it('접수 중: 마감까지 카운트 + 라벨', () => {
    const now = new Date('2026-07-12T12:00:00+09:00').getTime();
    const r = computeCountdown(now, OPEN, CLOSE);
    assert.strictEqual(r.dday.startsWith('D-'), true);
    assert.strictEqual(r.statusLabel, 'Status · 접수 중 · 마감까지');
  });
  it('마감 후: "마감" + 00:00:00', () => {
    const now = CLOSE + 1000;
    const r = computeCountdown(now, OPEN, CLOSE);
    assert.strictEqual(r.dday, '마감');
    assert.deepStrictEqual([r.h, r.m, r.s], ['00','00','00']);
    assert.strictEqual(r.statusLabel, 'Status · 접수 마감');
  });
});
