import { describe, it } from 'node:test';
import assert from 'node:assert';
import { enrich, matchesQ, candidates, deptsForCol, deptMajors, normUrl } from './deptLogic.js';

const depts = [
  { id:1, name:'고분자공학과', gyeyeol:'공학', recruit:true, bk21:true, hashtags:['#배터리'], majors:[] },
  { id:2, name:'국어국문학과', gyeyeol:'인문·사회', recruit:true, bk21:false, majors:[{name:'국어학'},{name:'문학'}] },
  { id:3, name:'미모집과', gyeyeol:'공학', recruit:false, bk21:false, majors:[] },
];

describe('deptLogic', () => {
  it('matchesQ: 이름+전공명+해시태그(표시값) 검색', () => {
    assert.strictEqual(matchesQ(depts[0], '배터리'), true);   // 해시태그
    assert.strictEqual(matchesQ(depts[1], '문학'), true);      // 전공명
    assert.strictEqual(matchesQ(depts[0], '없는키워드'), false);
    assert.strictEqual(matchesQ(depts[0], ''), true);          // 빈 검색=전부
  });

  it('candidates: bk21 토글 + 검색', () => {
    const c1 = candidates(depts, { q:'', bk21:true }).map(d=>d.id);
    assert.deepStrictEqual(c1, [1]);

    const c2 = candidates(depts, { q:'', bk21:false });
    assert.strictEqual(c2.length, 3);
  });

  it('deptsForCol: 검색 모드는 전 계열, 아니면 활성 계열', () => {
    const d1 = deptsForCol(depts, { gye:null, q:'국문', bk21:false }).map(d=>d.id);
    assert.deepStrictEqual(d1, [2]);

    const d2 = deptsForCol(depts, { gye:'공학', q:'', bk21:false }).map(d=>d.id).sort((a,b)=>a-b);
    assert.deepStrictEqual(d2, [1,3]);

    const d3 = deptsForCol(depts, { gye:null, q:'', bk21:false });
    assert.deepStrictEqual(d3, []);  // 계열 미선택
  });

  it('deptMajors: 2개 이상일 때만 노출', () => {
    const m1 = deptMajors(depts[1]);
    assert.strictEqual(m1.length, 2);

    const m2 = deptMajors(depts[0]);
    assert.strictEqual(m2.length, 0);
  });

  it('enrich: 실제값 우선, 없으면 SAMPLE 폴백', () => {
    const x = enrich({ name:'고분자공학과' });  // 실데이터 비어있음 → SAMPLE
    assert.strictEqual(x.isSample, true);
    assert(x.homepage.includes('polymer.pusan'));
  });

  it('normUrl: 스킴 없으면 https 보강', () => {
    assert.strictEqual(normUrl('a.b'), 'https://a.b');
    assert.strictEqual(normUrl('http://x'), 'http://x');
    assert.strictEqual(normUrl(''), '');
  });
});
