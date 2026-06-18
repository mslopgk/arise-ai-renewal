import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GYE, HEADERS, parseCsv, serializeCsv, decodeUpload, treeToRows,
  parseYesNo, parseHashtags, headerIndex, rowToRecord, buildPlan, applyPlan,
} from './directory-import.js';

// --- 상수 ---
test('상수: 계열 6개, 헤더 14열', () => {
  assert.equal(GYE.length, 6);
  assert.equal(HEADERS.length, 14);
  assert.equal(HEADERS[0], 'id');
  assert.equal(HEADERS[1], '구분');
});

// --- parseCsv ---
test('parseCsv: 따옴표 안의 쉼표는 분리하지 않는다', () => {
  const rows = parseCsv('a,"b,c",d\r\n1,"#x,#y",3\r\n');
  assert.deepEqual(rows, [['a', 'b,c', 'd'], ['1', '#x,#y', '3']]);
});
test('parseCsv: 이스케이프된 따옴표("")', () => {
  const rows = parseCsv('"he said ""hi""",ok\n');
  assert.deepEqual(rows, [['he said "hi"', 'ok']]);
});
test('parseCsv: 빈 셀과 후행 개행', () => {
  const rows = parseCsv('a,,c\n');
  assert.deepEqual(rows, [['a', '', 'c']]);
});

// --- serializeCsv ---
test('serializeCsv: 쉼표 포함 셀은 따옴표로 감싼다 + 왕복', () => {
  const rows = [['id', '해시태그'], ['1', '#x,#y']];
  const csv = serializeCsv(rows);
  assert.ok(csv.includes('"#x,#y"'));
  assert.deepEqual(parseCsv(csv), rows);
});
test('serializeCsv: 따옴표 이스케이프', () => {
  assert.equal(serializeCsv([['a"b']]), '"a""b"\r\n');
});

// --- decodeUpload ---
test('decodeUpload: UTF-8 BOM 제거', () => {
  const buf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('학과', 'utf8')]);
  const r = decodeUpload(buf);
  assert.equal(r.text, '학과');
  assert.equal(r.encoding, 'utf-8');
  assert.equal(r.garbled, false);
});
test('decodeUpload: EUC-KR 폴백', () => {
  const buf = Buffer.from([0xC7, 0xD1, 0xB1, 0xDB]); // "한글" in EUC-KR
  const r = decodeUpload(buf);
  assert.equal(r.text, '한글');
  assert.equal(r.encoding, 'euc-kr');
});

// --- treeToRows ---
test('treeToRows: 학과 + 세부전공 행 생성', () => {
  const tree = [{
    id: 34, gyeyeol: '인문·사회', name: '외국어교육학과', recruit: true, homepage: 'http://x',
    hashtags: ['#영어교육', '#문법교육'], bk21: false,
    majors: [{ id: 1, name: '영어교육학', recruit: true, hashtags: ['#영어교육'], bk21: false }],
  }];
  const rows = treeToRows(tree);
  assert.deepEqual(rows[0], HEADERS);
  assert.deepEqual(rows[1], ['34', '학과', '', '인문·사회', '외국어교육학과', 'Y', 'http://x', '', '', 'N', '', '', '#영어교육,#문법교육', '']);
  assert.deepEqual(rows[2], ['1', '세부전공', '외국어교육학과', '', '영어교육학', 'Y', '', '', '', 'N', '', '', '#영어교육', '']);
});

// --- 정규화/검증 ---
test('parseYesNo', () => {
  assert.equal(parseYesNo('Y'), true);
  assert.equal(parseYesNo('n'), false);
  assert.equal(parseYesNo(''), undefined);
  assert.equal(parseYesNo('아무거나'), null);
});
test('parseHashtags: # 접두 보정 + 빈값 유지', () => {
  assert.deepEqual(parseHashtags('영어, #문법 '), ['#영어', '#문법']);
  assert.equal(parseHashtags('  '), undefined);
});
test('rowToRecord: 학과 행 정상', () => {
  const idx = headerIndex(HEADERS);
  const cells = ['34', '학과', '', '인문·사회', '외국어교육학과', 'Y', 'http://x', '', '', 'N', '', '', '#a,#b', ''];
  const r = rowToRecord(idx, cells, 2);
  assert.equal(r.kind, 'dept');
  assert.equal(r.id, 34);
  assert.equal(r.name, '외국어교육학과');
  assert.deepEqual(r.errors, []);
  assert.equal(r.fields.gyeyeol, '인문·사회');
  assert.equal(r.fields.recruit, true);
  assert.deepEqual(r.fields.hashtags, ['#a', '#b']);
  assert.ok(!('location' in r.fields));
});
test('rowToRecord: 잘못된 계열 → 오류', () => {
  const idx = headerIndex(HEADERS);
  const cells = ['', '학과', '', '없는계열', 'X학과', '', '', '', '', '', '', '', '', ''];
  const r = rowToRecord(idx, cells, 3);
  assert.ok(r.errors.some((e) => e.includes('계열')));
});
test('rowToRecord: 세부전공은 상위학과 필수', () => {
  const idx = headerIndex(HEADERS);
  const cells = ['', '세부전공', '', '', '영어교육학', '', '', '', '', '', '', '', '', ''];
  const r = rowToRecord(idx, cells, 4);
  assert.ok(r.errors.some((e) => e.includes('상위학과')));
});

// --- buildPlan ---
const idx = headerIndex(HEADERS);
const rec = (cells, line) => rowToRecord(idx, cells, line);
const tree = [
  { id: 34, gyeyeol: '인문·사회', name: '외국어교육학과', recruit: true, bk21: false,
    majors: [{ id: 1, name: '영어교육학', recruit: true, bk21: false }] },
];

test('buildPlan: id로 학과 수정', () => {
  const r = rec(['34', '학과', '', '인문·사회', '외국어교육학과', 'N', '', '', '', 'N', '', '', '', ''], 2);
  const plan = buildPlan([r], tree);
  assert.equal(plan.summary.updated, 1);
  const op = plan.ops[0];
  assert.equal(op.op, 'update'); assert.equal(op.kind, 'dept'); assert.equal(op.id, 34);
  assert.equal(op.body.recruit, false);
});
test('buildPlan: 신규 학과 + 그 학과 소속 신규 세부전공', () => {
  const dept = rec(['', '학과', '', '공학', '인공지능학과', 'Y', '', '', '', 'N', '', '', '', ''], 2);
  const major = rec(['', '세부전공', '인공지능학과', '', '데이터사이언스전공', 'Y', '', '', '', 'N', '', '', '', ''], 3);
  const plan = buildPlan([dept, major], tree);
  assert.equal(plan.summary.added, 2);
  const dOp = plan.ops.find((o) => o.kind === 'dept');
  const mOp = plan.ops.find((o) => o.kind === 'major');
  assert.equal(dOp.op, 'insert');
  assert.equal(mOp.op, 'insert');
  assert.equal(mOp.parentNewRef, dOp.newRef);
});
test('buildPlan: 자연키로 세부전공 수정', () => {
  const major = rec(['', '세부전공', '외국어교육학과', '', '영어교육학', 'N', '', '', '', 'N', '', '', '', ''], 2);
  const plan = buildPlan([major], tree);
  assert.equal(plan.summary.updated, 1);
  assert.equal(plan.ops[0].op, 'update');
  assert.equal(plan.ops[0].id, 1);
});
test('buildPlan: 부모 미해석 세부전공 → 오류 스킵', () => {
  const major = rec(['', '세부전공', '없는학과', '', '뭐시기', 'Y', '', '', '', 'N', '', '', '', ''], 2);
  const plan = buildPlan([major], tree);
  assert.equal(plan.summary.skipped, 1);
  assert.equal(plan.ops.length, 0);
  assert.equal(plan.reports[0].action, 'error');
});
test('buildPlan: id 있으나 없는 id → 오류', () => {
  const r = rec(['9999', '학과', '', '공학', 'X', 'Y', '', '', '', 'N', '', '', '', ''], 2);
  const plan = buildPlan([r], tree);
  assert.equal(plan.summary.skipped, 1);
  assert.ok(plan.reports[0].errors.some((e) => e.includes('id')));
});

// --- applyPlan ---
function fakeExec() {
  const calls = [];
  let seq = 100;
  return {
    calls,
    get: async (sql, ...p) => { calls.push({ sql, p }); return { id: ++seq }; },
    run: async (sql, ...p) => { calls.push({ sql, p }); },
  };
}
test('applyPlan: 신규 학과 → 신규 세부전공 부모 id 연결', async () => {
  const ex = fakeExec();
  const plan = { ops: [
    { kind: 'dept', op: 'insert', newRef: 1, body: { gyeyeol: '공학', name: '인공지능학과', bk21: false } },
    { kind: 'major', op: 'insert', parentId: null, parentNewRef: 1, body: { name: '데이터사이언스전공' } },
  ], summary: { added: 2, updated: 0, skipped: 0 } };
  const res = await applyPlan(ex, plan);
  assert.equal(res.added, 2);
  const major = ex.calls.find((c) => /INSERT INTO dir_majors/.test(c.sql));
  assert.equal(major.p[0], 101);
});
test('applyPlan: 부분 UPDATE는 제공 컬럼만 SET', async () => {
  const ex = fakeExec();
  const plan = { ops: [{ kind: 'dept', op: 'update', id: 34, body: { recruit: false } }], summary: { added: 0, updated: 1, skipped: 0 } };
  await applyPlan(ex, plan);
  const upd = ex.calls.find((c) => /UPDATE dir_departments/.test(c.sql));
  assert.match(upd.sql, /SET recruit=\?/);
  assert.doesNotMatch(upd.sql, /name=/);
  assert.deepEqual(upd.p, [0, 34]);
});
