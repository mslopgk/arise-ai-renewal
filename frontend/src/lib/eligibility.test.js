// frontend/src/lib/eligibility.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_TABLE, COLLEGES, bandExact, bandNearest, requiredCum,
  gradGpaThreshold, evaluateEligibility,
} from './eligibility.js';

// --- 데이터/순수함수 ---
test('CREDIT_TABLE: 16개 band, 137학점 band의 cum 보존', () => {
  assert.equal(CREDIT_TABLE.length, 16);
  assert.deepEqual(bandExact(137).cum, [17,34,51,68,85,102,119.5,137]);
});
test('bandExact: 없는 g는 null', () => { assert.equal(bandExact(999), null); });
test('bandNearest: 130 → 129band, 100 → 104band', () => {
  assert.equal(bandNearest(130).g, 129);
  assert.equal(bandNearest(100).g, 104);
});
test('requiredCum: sem이 cum 길이 이하면 누적, 초과면 졸업학점 g', () => {
  assert.equal(requiredCum(bandExact(126), 5), 80);   // 126band 5학기 = 80
  assert.equal(requiredCum(bandExact(137), 7), 119.5); // 137band 7학기 = 119.5
  assert.equal(requiredCum(bandExact(137), 9), 137);   // sem9 > len8 → g
});
test('gradGpaThreshold: 6→4.0, 7→3.5, 그 외→3.0', () => {
  assert.equal(gradGpaThreshold(6), 4.0);
  assert.equal(gradGpaThreshold(7), 3.5);
  assert.equal(gradGpaThreshold(8), 3.0);
});

// --- evaluateEligibility: 검증 에러(원본 메시지 보존) ---
const base = { manualMode:false, gradManual:NaN, resolvedG:137, collegeIndex:5, branchIndex:1, sem:5, gradSemRaw:'8', gpa:3.2, earned:85 };
test('소속 미선택(resolvedG null) → 에러', () => {
  const r = evaluateEligibility({ ...base, resolvedG:null });
  assert.equal(r.ok, false);
  assert.equal(r.error, '학부 소속을 선택하세요.');
});
test('manual 모드 빈/0 졸업학점 → 에러', () => {
  const r = evaluateEligibility({ ...base, manualMode:true, gradManual:0 });
  assert.equal(r.ok, false);
  assert.equal(r.error, '졸업 요구학점을 입력하거나 소속을 선택하세요.');
});
test('필수 누락 → 에러 메시지에 누락 항목 나열', () => {
  const r = evaluateEligibility({ ...base, sem:NaN, gpa:NaN });
  assert.equal(r.ok, false);
  assert.match(r.error, /^다음을 입력하세요: /);
  assert.match(r.error, /현재 이수 학기/);
  assert.match(r.error, /평점평균/);
});
test('gpa 범위 밖 → 에러', () => {
  assert.equal(evaluateEligibility({ ...base, gpa:4.7 }).error, '평점평균은 0~4.5 사이여야 합니다.');
});

// --- evaluateEligibility: tier 경계값(실행으로 검증) ---
test('PASS: 공대(137) 5학기 졸업8 gpa3.2 earned85 → 4요건 충족', () => {
  const r = evaluateEligibility({ ...base });
  assert.equal(r.ok, true);
  assert.equal(r.tier, 'pass');
  assert.equal(r.checks.length, 4);
  assert.ok(r.checks.every((c) => c.state === 'ok'));
});
test('FAIL: 8학기(상한 초과) → 신청 불가', () => {
  const r = evaluateEligibility({ ...base, sem:8, earned:130 });
  assert.equal(r.tier, 'fail');
  assert.equal(r.checks[0].state, 'no'); // 이수학기 체크 no
});
test('FAIL: 졸업 임박 + gpa<3.0 (7학기 졸업7 gpa2.8) → 회복불가', () => {
  const r = evaluateEligibility({ manualMode:false, resolvedG:126, collegeIndex:0, branchIndex:-1, sem:7, gradSemRaw:'7', gpa:2.8, earned:111 });
  assert.equal(r.tier, 'fail');
});
test('MAYBE: 보완여지(5학기 졸업8 gpa2.8) → 추후 가능', () => {
  const r = evaluateEligibility({ ...base, gpa:2.8, earned:80, resolvedG:126, collegeIndex:0, branchIndex:-1 });
  assert.equal(r.tier, 'maybe');
});
test('MAYBE: 수료학점 미달(earned50)은 보완 가능 → maybe (fail 아님)', () => {
  const r = evaluateEligibility({ ...base, resolvedG:126, collegeIndex:0, branchIndex:-1, earned:50 });
  assert.equal(r.tier, 'maybe');
  assert.equal(r.checks[2].state, 'warn'); // 수료학점 항목 warn
});
test('MAYBE: 조기졸업(6학기) gpaThr 4.0 미달(gpa3.9) → 졸업성적 항목 warn, tier maybe', () => {
  const r = evaluateEligibility({ ...base, resolvedG:126, collegeIndex:0, branchIndex:-1, gradSemRaw:'6', gpa:3.9, earned:80 });
  assert.equal(r.tier, 'maybe');
  assert.equal(r.checks[3].state, 'warn');
});
test('scholNote: 정규8학기는 3.8 안내, 8학기초과는 제외 안내, 그 외 빈문자열', () => {
  assert.match(evaluateEligibility({ ...base }).scholNote, /3\.8/);
  const over8 = evaluateEligibility({ ...base, gradSemRaw:'over8' });
  assert.match(over8.scholNote, /제외/);
  assert.equal(evaluateEligibility({ ...base, gradSemRaw:'7' }).scholNote, '');
});
test('basis 문자열: 소속·졸업학점 표기 포함', () => {
  const r = evaluateEligibility({ ...base });
  assert.match(r.basis, /졸업 137학점/);
});
