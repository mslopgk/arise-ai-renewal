import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLEGES, judgeReg, judgeSAM, judgeBK, judgeResearch, evaluateScholarship,
} from './scholarship.js';

// --- 데이터 ---
test('COLLEGES: 17개, sam=true는 인문/사회과학/자연과학 3곳', () => {
  assert.equal(COLLEGES.length, 17);
  assert.equal(COLLEGES.filter((c) => c.sam).length, 3);
  assert.deepEqual(COLLEGES.filter((c) => c.sam).map((c) => c.c), ['인문대학','사회과학대학','자연과학대학']);
});

// --- judgeReg: 연계과정 장학금(등록금) ---
test('judgeReg: 계약학과 예 → no', () => { assert.equal(judgeReg('8',3.9,'y','ms').tier, 'no'); });
test('judgeReg: 8학기초과 → no', () => { assert.equal(judgeReg('over8',3.9,'n','ms').tier, 'no'); });
test('judgeReg: 정규8학기 gpa>=3.8 → ok, 3.79 → cond, NaN → cond', () => {
  assert.equal(judgeReg('8',3.8,'n','ms').tier, 'ok');
  assert.equal(judgeReg('8',3.79,'n','ms').tier, 'cond');
  assert.equal(judgeReg('8',NaN,'n','ms').tier, 'cond');
});
test('judgeReg: 조기/일반 졸업(6·7학기)은 3.8 무관 → ok', () => {
  assert.equal(judgeReg('6',2.0,'n','ms').tier, 'ok');
  assert.equal(judgeReg('7',2.0,'n','ms').tier, 'ok');
});
test('judgeReg: 석박통합 meta에 박사 학기 표기', () => {
  assert.match(judgeReg('7',3.0,'n','msp').meta, /박사/);
});

// --- judgeSAM / judgeBK / judgeResearch ---
test('judgeSAM: sam=true → cond(flag), false → no', () => {
  const ok = judgeSAM({ gye:'인문', sam:true });
  assert.equal(ok.tier, 'cond'); assert.equal(ok.flag, true);
  assert.equal(judgeSAM({ gye:'공학', sam:false }).tier, 'no');
});
test('judgeBK: 항상 cond(조건/사유만 분기)', () => {
  assert.equal(judgeBK('y','y').tier, 'cond');
  assert.equal(judgeBK('n','y').tier, 'cond');
  assert.equal(judgeBK('y','n').tier, 'cond');
});
test('judgeResearch: 항상 ok', () => { assert.equal(judgeResearch('ms').tier, 'ok'); });

// --- evaluateScholarship: 검증 + 요약 ---
const ok = { track:'ms', collegeIndex:0, gradSemRaw:'7', gpa:3.5, lastSem:'y', nextGrad:'y', contract:'n' };
test('트랙 미선택 → 에러', () => {
  const r = evaluateScholarship({ ...ok, track:null });
  assert.equal(r.ok, false);
  assert.match(r.error, /희망 트랙/);
});
test('gpa 범위 밖 → 에러', () => {
  assert.equal(evaluateScholarship({ ...ok, gpa:5 }).error, '평점평균은 0~4.5 사이여야 합니다.');
});
test('인문대(sam)·7학기·gpa3.5·계약X → reg ok, sam cond, bk cond, research ok = 해당2/조건2/미해당0', () => {
  const r = evaluateScholarship({ ...ok });
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 4);
  assert.equal(r.summary.nOk, 2);
  assert.equal(r.summary.nCond, 2);
  assert.equal(r.summary.nNo, 0);
  assert.match(r.summaryText.n, /예상 해당 2종 · 조건부 2종 · 미해당 0종/);
});
test('공대·정규8학기·계약Y → reg no, sam no, bk cond, research ok = 해당1/조건1/미해당2', () => {
  const r = evaluateScholarship({ track:'ms', collegeIndex:5, gradSemRaw:'8', gpa:3.0, lastSem:'n', nextGrad:'n', contract:'y' });
  assert.equal(r.summary.nOk, 1);
  assert.equal(r.summary.nCond, 1);
  assert.equal(r.summary.nNo, 2);
});
