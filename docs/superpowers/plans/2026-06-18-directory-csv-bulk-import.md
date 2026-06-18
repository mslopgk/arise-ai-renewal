# 학과 디렉터리 CSV 일괄 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 학과 디렉터리(학과+세부전공) 텍스트 정보를 CSV로 내보내고/가져와 일괄 추가·수정한다.

**Architecture:** 순수 함수 모듈 `backend/src/directory-import.js`(CSV 파싱·인코딩 감지·diff/plan)에 단위 테스트를 붙이고, `admin.js`에 라우트 3개(export/preview/commit)로 DB와 연결. 프런트는 `DeptDirectoryAdmin.jsx`에 내보내기/가져오기 + 미리보기 모달 추가.

**Tech Stack:** Node ESM, Express, PostgreSQL(`pg`), Node 내장 `node:test`/`node:assert`, React(Vite). 외부 의존성 추가 없음.

## Global Constraints
- **의존성 0 추가** — CSV 파서·EUC-KR 디코드(`TextDecoder`)·diff 자체 구현.
- 모든 라우트 `requireAdmin`. 공개 노출 없음.
- **비파괴**: 삭제 없음(추가+수정만). **빈 칸 = 기존 값 유지**(UPDATE는 제공된 필드만 SET).
- CSV 스키마(내보내기=가져오기) 헤더 순서 고정:
  `id,구분,상위학과,계열,학과명/전공명,모집여부,홈페이지,위치,전화,BK21참여,BK21사업단명,BK21홈페이지,해시태그,소개`
- 계열 화이트리스트: `인문·사회 / 자연과학 / 공학 / 예술 / 체육 / 의학`
- DB 컬럼: `dir_departments`/`dir_majors` 공통 `gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord`; 세부전공은 `gyeyeol` 없음 + `dept_id`. `recruit` 기본 1, `bk21` 기본 0, `ord` 기본 0, `hashtags` jsonb.
- 테스트 실행: `cd backend && npm test` (= `node --test`).

---

### Task 1: 테스트 러너 + 모듈 스캐폴드

**Files:**
- Modify: `backend/package.json` (scripts에 test 추가)
- Create: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces: `GYE` (string[]), `HEADERS` (string[14]), `HEADER_KEY` (object) — 이후 모든 태스크가 사용.

- [ ] **Step 1: package.json에 test 스크립트 추가**

`backend/package.json` 의 `"scripts"` 에 추가:
```json
"test": "node --test"
```

- [ ] **Step 2: 모듈에 상수 작성**

`backend/src/directory-import.js`:
```js
// 학과 디렉터리 CSV 일괄 수정 — 순수 함수(파싱·인코딩·diff). DB 접근은 admin.js 라우트에서 주입.
export const GYE = ['인문·사회', '자연과학', '공학', '예술', '체육', '의학'];

export const HEADERS = [
  'id', '구분', '상위학과', '계열', '학과명/전공명', '모집여부',
  '홈페이지', '위치', '전화', 'BK21참여', 'BK21사업단명', 'BK21홈페이지', '해시태그', '소개',
];

// CSV 헤더(한글) → 내부 키
export const HEADER_KEY = {
  'id': 'id', '구분': 'kind', '상위학과': 'parent', '계열': 'gyeyeol',
  '학과명/전공명': 'name', '모집여부': 'recruit', '홈페이지': 'homepage', '위치': 'location',
  '전화': 'phone', 'BK21참여': 'bk21', 'BK21사업단명': 'bk21_name', 'BK21홈페이지': 'bk21_url',
  '해시태그': 'hashtags', '소개': 'intro',
};
```

- [ ] **Step 3: 스모크 테스트 작성**

`backend/src/directory-import.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GYE, HEADERS } from './directory-import.js';

test('상수: 계열 6개, 헤더 14열', () => {
  assert.equal(GYE.length, 6);
  assert.equal(HEADERS.length, 14);
  assert.equal(HEADERS[0], 'id');
  assert.equal(HEADERS[1], '구분');
});
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd backend && npm test`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "test: directory-import 모듈 스캐폴드 + node:test 러너"
```

---

### Task 2: CSV 파서 `parseCsv`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces: `parseCsv(text: string) => string[][]` — RFC4180(따옴표·이스케이프 따옴표·셀 내 쉼표/개행·CRLF). 마지막 빈 줄은 행으로 만들지 않음.

- [ ] **Step 1: 실패 테스트 작성**

`directory-import.test.js` 에 추가:
```js
import { parseCsv } from './directory-import.js';

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
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `cd backend && npm test`
Expected: FAIL (`parseCsv` is not a function)

- [ ] **Step 3: 구현**

`directory-import.js` 에 추가:
```js
export function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c === '\r') { /* skip CR */ }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `cd backend && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: parseCsv (RFC4180 소형 파서)"
```

---

### Task 3: CSV 직렬화 `serializeCsv`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces: `serializeCsv(rows: string[][]) => string` — 쉼표/따옴표/개행 포함 셀은 따옴표로 감싸고 `"`→`""`. 행 구분 `\r\n`, 끝에 `\r\n`.

- [ ] **Step 1: 실패 테스트**
```js
import { serializeCsv, parseCsv } from './directory-import.js';

test('serializeCsv: 쉼표 포함 셀은 따옴표로 감싼다 + 왕복', () => {
  const rows = [['id', '해시태그'], ['1', '#x,#y']];
  const csv = serializeCsv(rows);
  assert.ok(csv.includes('"#x,#y"'));
  assert.deepEqual(parseCsv(csv), rows);
});

test('serializeCsv: 따옴표 이스케이프', () => {
  assert.equal(serializeCsv([['a"b']]), '"a""b"\r\n');
});
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
export function serializeCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: serializeCsv (왕복 가능 직렬화)"
```

---

### Task 4: 인코딩 감지 `decodeUpload`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces: `decodeUpload(buffer: Buffer|Uint8Array) => { text: string, encoding: 'utf-8'|'euc-kr', garbled: boolean }` — UTF-8 BOM 제거, UTF-8 디코드 후 치환문자(U+FFFD) 있으면 EUC-KR 폴백(치환문자가 줄면 채택).

- [ ] **Step 1: 실패 테스트**
```js
import { decodeUpload } from './directory-import.js';

test('decodeUpload: UTF-8 BOM 제거', () => {
  const buf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('학과', 'utf8')]);
  const r = decodeUpload(buf);
  assert.equal(r.text, '학과');
  assert.equal(r.encoding, 'utf-8');
  assert.equal(r.garbled, false);
});

test('decodeUpload: EUC-KR 폴백', () => {
  // "한글" in EUC-KR = C7 D1 B1 DB
  const buf = Buffer.from([0xC7, 0xD1, 0xB1, 0xDB]);
  const r = decodeUpload(buf);
  assert.equal(r.text, '한글');
  assert.equal(r.encoding, 'euc-kr');
});
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
function countReplacement(s) { return (s.match(/�/g) || []).length; }

export function decodeUpload(buffer) {
  let buf = buffer;
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.subarray(3);
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  const u = countReplacement(utf8);
  if (u === 0) return { text: utf8, encoding: 'utf-8', garbled: false };
  const euckr = new TextDecoder('euc-kr', { fatal: false }).decode(buf);
  const e = countReplacement(euckr);
  if (e < u) return { text: euckr, encoding: 'euc-kr', garbled: e > 0 };
  return { text: utf8, encoding: 'utf-8', garbled: true };
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: decodeUpload (UTF-8 BOM/EUC-KR 자동 감지)"
```

---

### Task 5: 디렉터리 → CSV 행 `treeToRows`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Consumes: `getDirectoryTree()` 형태의 배열 — `{id,gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,majors:[...]}`. 비어있는 선택 필드는 객체에서 생략될 수 있음.
- Produces: `treeToRows(tree) => string[][]` — 1행 헤더 + 학과/세부전공 행. 세부전공은 부모 학과명을 `상위학과`에, `계열`은 빈칸.

- [ ] **Step 1: 실패 테스트**
```js
import { treeToRows, HEADERS } from './directory-import.js';

test('treeToRows: 학과 + 세부전공 행 생성', () => {
  const tree = [{
    id: 34, gyeyeol: '인문·사회', name: '외국어교육학과', recruit: true, homepage: 'http://x',
    hashtags: ['#영어교육', '#문법교육'], bk21: false,
    majors: [{ id: 1, name: '영어교육학', recruit: true, hashtags: ['#영어교육'], bk21: false }],
  }];
  const rows = treeToRows(tree);
  assert.deepEqual(rows[0], HEADERS);
  // 학과 행
  assert.deepEqual(rows[1], ['34', '학과', '', '인문·사회', '외국어교육학과', 'Y', 'http://x', '', '', 'N', '', '', '#영어교육,#문법교육', '']);
  // 세부전공 행 (상위학과 채움, 계열 빈칸)
  assert.deepEqual(rows[2], ['1', '세부전공', '외국어교육학과', '', '영어교육학', 'Y', '', '', '', 'N', '', '', '#영어교육', '']);
});
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
const yn = (b) => (b ? 'Y' : 'N');
const ht = (a) => (Array.isArray(a) ? a : []).join(',');

function deptRow(d) {
  return ['' + d.id, '학과', '', d.gyeyeol || '', d.name || '', yn(d.recruit !== false),
    d.homepage || '', d.location || '', d.phone || '', yn(!!d.bk21),
    d.bk21_name || '', d.bk21_url || '', ht(d.hashtags), d.intro || ''];
}
function majorRow(m, parentName) {
  return ['' + m.id, '세부전공', parentName || '', '', m.name || '', yn(m.recruit !== false),
    m.homepage || '', m.location || '', m.phone || '', yn(!!m.bk21),
    m.bk21_name || '', m.bk21_url || '', ht(m.hashtags), m.intro || ''];
}

export function treeToRows(tree) {
  const rows = [HEADERS.slice()];
  for (const d of tree || []) {
    rows.push(deptRow(d));
    for (const m of (d.majors || [])) rows.push(majorRow(m, d.name));
  }
  return rows;
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: treeToRows (디렉터리 CSV 내보내기 직렬화)"
```

---

### Task 6: 행 정규화/검증 `rowToRecord`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces:
  - `parseYesNo(v) => true | false | undefined | null` (빈값→undefined=유지, 매칭→bool, 잘못→null)
  - `parseHashtags(v) => string[] | undefined` (빈값→undefined=유지)
  - `headerIndex(headerCells) => { [key]: colIndex }`
  - `rowToRecord(idx, cells, lineNo) => { lineNo, id|null, kind:'dept'|'major'|null, parent, gyeyeol, name, fields:{...}, errors:string[] }`
    - `fields`는 **제공된(비지 않은) 필드만** 담는다(빈칸=유지). DB 컬럼 키 사용(`recruit,bk21`은 boolean, `hashtags`는 배열, 나머지 문자열). `gyeyeol`은 dept일 때만 fields에 포함.

- [ ] **Step 1: 실패 테스트**
```js
import { parseYesNo, parseHashtags, headerIndex, rowToRecord, HEADERS } from './directory-import.js';

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
  assert.ok(!('location' in r.fields)); // 빈칸은 fields에 없음(유지)
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
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
export function parseYesNo(v) {
  const s = (v == null ? '' : String(v)).trim().toLowerCase();
  if (!s) return undefined;
  if (['y', 'yes', '예', '1', 'true', 'o', '모집'].includes(s)) return true;
  if (['n', 'no', '아니오', '아니요', '0', 'false', 'x', '미모집'].includes(s)) return false;
  return null;
}

export function parseHashtags(v) {
  const s = v == null ? '' : String(v);
  if (!s.trim()) return undefined;
  return s.split(/[,\n]/).map((t) => t.trim()).filter(Boolean).map((t) => (t[0] === '#' ? t : '#' + t));
}

export function headerIndex(headerCells) {
  const idx = {};
  headerCells.forEach((h, i) => { const k = HEADER_KEY[(h || '').trim()]; if (k) idx[k] = i; });
  return idx;
}

const TEXT_FIELDS = ['homepage', 'location', 'phone', 'bk21_name', 'bk21_url', 'intro'];

export function rowToRecord(idx, cells, lineNo) {
  const get = (k) => { const i = idx[k]; return i == null ? '' : (cells[i] == null ? '' : String(cells[i]).trim()); };
  const errors = [];
  const kindRaw = get('kind');
  const kind = kindRaw === '학과' ? 'dept' : kindRaw === '세부전공' ? 'major' : null;
  if (!kind) errors.push(`구분은 '학과' 또는 '세부전공'이어야 합니다 (입력: '${kindRaw}')`);

  const name = get('name');
  if (!name) errors.push('학과명/전공명이 비어 있습니다');

  const idStr = get('id');
  const id = idStr ? Number(idStr) : null;
  if (idStr && !Number.isInteger(id)) errors.push(`id가 숫자가 아닙니다 (입력: '${idStr}')`);

  const parent = get('parent');
  const gyeyeol = get('gyeyeol');
  if (kind === 'dept' && gyeyeol && !GYE.includes(gyeyeol)) errors.push(`계열이 올바르지 않습니다 (입력: '${gyeyeol}')`);
  if (kind === 'dept' && !id && !gyeyeol) errors.push('신규 학과는 계열이 필요합니다');
  if (kind === 'major' && !parent) errors.push('세부전공은 상위학과가 필요합니다');

  const fields = {};
  if (kind === 'dept' && gyeyeol) fields.gyeyeol = gyeyeol;
  if (name) fields.name = name;
  const recruit = parseYesNo(get('recruit'));
  if (recruit === null) errors.push('모집여부는 Y/N 이어야 합니다');
  else if (recruit !== undefined) fields.recruit = recruit;
  const bk21 = parseYesNo(get('bk21'));
  if (bk21 === null) errors.push('BK21참여는 Y/N 이어야 합니다');
  else if (bk21 !== undefined) fields.bk21 = bk21;
  const tags = parseHashtags(get('hashtags'));
  if (tags !== undefined) fields.hashtags = tags;
  for (const f of TEXT_FIELDS) { const val = get(f); if (val) fields[f] = val; }

  return { lineNo, id: Number.isInteger(id) ? id : null, kind, parent, gyeyeol, name, fields, errors };
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: rowToRecord (행 정규화·검증, 빈칸=유지)"
```

---

### Task 7: diff/plan 계산 `buildPlan`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Consumes: `rowToRecord` 출력 배열, `getDirectoryTree()` 형태 `tree`.
- Produces: `buildPlan(records, tree) => { ops, summary, reports }`
  - `ops`: `{ kind:'dept'|'major', op:'insert'|'update', id?, newRef?, parentId?, parentNewRef?, body }[]`
    - `body`는 DB 컬럼 키만 담은 객체(`rowToRecord.fields` 그대로). insert dept는 `gyeyeol` 포함.
    - 신규 학과 insert op에 `newRef`(정수) 부여. 같은 파일에서 그 학과를 부모로 삼는 신규 세부전공 op은 `parentNewRef`로 참조.
  - `summary`: `{ added, updated, skipped }`
  - `reports`: `{ lineNo, action:'add'|'update'|'error', kind, name, errors }[]`
- 규칙: id 있으면 id로(없으면 오류). 없으면 자연키(dept: gyeyeol+name, major: parentDeptId+name)로 매칭→update, 없으면 insert. 부모 미해석/자연키 중복→오류·스킵.

- [ ] **Step 1: 실패 테스트**
```js
import { buildPlan, rowToRecord, headerIndex, HEADERS } from './directory-import.js';

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
  assert.equal(mOp.parentNewRef, dOp.newRef); // 신규 부모 참조 연결
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
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
export function buildPlan(records, tree) {
  const depts = tree || [];
  const deptById = new Map();
  const deptByKey = new Map();   // `${gyeyeol}␟${name}` -> dept
  const deptByName = new Map();  // name -> [dept,...] (세부전공 부모 해석용)
  const majorById = new Map();   // id -> { major, deptId }
  const majorByKey = new Map();  // `${deptId}␟${name}` -> major
  for (const d of depts) {
    deptById.set(d.id, d);
    deptByKey.set(`${d.gyeyeol}␟${d.name}`, d);
    (deptByName.get(d.name) || deptByName.set(d.name, []).get(d.name)).push(d);
    for (const m of (d.majors || [])) {
      majorById.set(m.id, { major: m, deptId: d.id });
      majorByKey.set(`${d.id}␟${m.name}`, m);
    }
  }

  const ops = [], reports = [];
  let added = 0, updated = 0, skipped = 0;
  let refSeq = 1;
  const newDeptRefByName = new Map(); // 같은 파일 신규 학과 name -> newRef

  const fail = (r, extra) => {
    skipped++;
    reports.push({ lineNo: r.lineNo, action: 'error', kind: r.kind, name: r.name, errors: extra ? [...r.errors, extra] : r.errors });
  };

  // Pass A: 학과
  for (const r of records) {
    if (r.kind !== 'dept') continue;
    if (r.errors.length) { fail(r); continue; }
    if (r.id != null) {
      if (!deptById.has(r.id)) { fail(r, `id ${r.id} 학과를 찾을 수 없습니다`); continue; }
      ops.push({ kind: 'dept', op: 'update', id: r.id, body: r.fields });
      updated++; reports.push({ lineNo: r.lineNo, action: 'update', kind: 'dept', name: r.name, errors: [] });
    } else {
      const match = deptByKey.get(`${r.gyeyeol}␟${r.name}`);
      if (match) {
        ops.push({ kind: 'dept', op: 'update', id: match.id, body: r.fields });
        updated++; reports.push({ lineNo: r.lineNo, action: 'update', kind: 'dept', name: r.name, errors: [] });
      } else {
        const newRef = refSeq++;
        newDeptRefByName.set(r.name, newRef);
        ops.push({ kind: 'dept', op: 'insert', newRef, body: r.fields });
        added++; reports.push({ lineNo: r.lineNo, action: 'add', kind: 'dept', name: r.name, errors: [] });
      }
    }
  }

  // Pass B: 세부전공
  for (const r of records) {
    if (r.kind !== 'major') continue;
    if (r.errors.length) { fail(r); continue; }
    // 부모 해석: 기존 학과(이름 유일) 우선, 없으면 같은 파일 신규 학과
    const existing = deptByName.get(r.parent) || [];
    let parentId = null, parentNewRef = null;
    if (existing.length === 1) parentId = existing[0].id;
    else if (existing.length > 1) { fail(r, `상위학과 '${r.parent}'가 둘 이상입니다(계열로 모호)`); continue; }
    else if (newDeptRefByName.has(r.parent)) parentNewRef = newDeptRefByName.get(r.parent);
    else { fail(r, `상위학과 '${r.parent}'를 찾을 수 없습니다`); continue; }

    if (r.id != null) {
      const hit = majorById.get(r.id);
      if (!hit || (parentId != null && hit.deptId !== parentId)) { fail(r, `id ${r.id} 세부전공을 상위학과 아래에서 찾을 수 없습니다`); continue; }
      ops.push({ kind: 'major', op: 'update', id: r.id, body: r.fields });
      updated++; reports.push({ lineNo: r.lineNo, action: 'update', kind: 'major', name: r.name, errors: [] });
    } else if (parentId != null && majorByKey.has(`${parentId}␟${r.name}`)) {
      ops.push({ kind: 'major', op: 'update', id: majorByKey.get(`${parentId}␟${r.name}`).id, body: r.fields });
      updated++; reports.push({ lineNo: r.lineNo, action: 'update', kind: 'major', name: r.name, errors: [] });
    } else {
      ops.push({ kind: 'major', op: 'insert', parentId, parentNewRef, body: r.fields });
      added++; reports.push({ lineNo: r.lineNo, action: 'add', kind: 'major', name: r.name, errors: [] });
    }
  }

  return { ops, summary: { added, updated, skipped }, reports };
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: buildPlan (하이브리드 매칭·diff, 신규 부모 참조)"
```

---

### Task 8: 트랜잭션 적용 `applyPlan`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Consumes: `exec` = `{ get(sql,...p), run(sql,...p) }` (db.js `tx()`가 주입하는 형태; `?` 플레이스홀더 사용), `buildPlan` 출력 `plan`.
- Produces: `applyPlan(exec, plan) => Promise<{ added, updated }>`
  - dept insert 먼저(신규 id 확보) → dept update → major insert(부모 id 해석) → major update.
  - INSERT는 전체 컬럼(누락 필드 기본값: recruit=1,bk21=0,ord=0,hashtags='[]',나머지 null). UPDATE는 **body에 있는 컬럼만** SET.

- [ ] **Step 1: 실패 테스트 (가짜 exec)**
```js
import { applyPlan } from './directory-import.js';

function fakeExec() {
  const calls = [];
  let seq = 100;
  return {
    calls,
    get: async (sql, ...p) => { calls.push({ sql, p }); return { id: ++seq }; }, // RETURNING id
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
  assert.equal(major.p[0], 101); // 첫 INSERT(dept)가 RETURNING id=101 → major.dept_id
});

test('applyPlan: 부분 UPDATE는 제공 컬럼만 SET', async () => {
  const ex = fakeExec();
  const plan = { ops: [{ kind: 'dept', op: 'update', id: 34, body: { recruit: false } }], summary: { added: 0, updated: 1, skipped: 0 } };
  await applyPlan(ex, plan);
  const upd = ex.calls.find((c) => /UPDATE dir_departments/.test(c.sql));
  assert.match(upd.sql, /SET recruit=\?/);
  assert.doesNotMatch(upd.sql, /name=/);
  assert.deepEqual(upd.p, [0, 34]); // recruit false→0, id
});
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL

- [ ] **Step 3: 구현**
```js
const INSERT_DEPT_COLS = ['gyeyeol', 'name', 'recruit', 'homepage', 'hashtags', 'location', 'phone', 'bk21', 'bk21_name', 'bk21_url', 'intro', 'ord'];
const INSERT_MAJOR_COLS = ['dept_id', 'name', 'recruit', 'homepage', 'hashtags', 'location', 'phone', 'bk21', 'bk21_name', 'bk21_url', 'intro', 'ord'];

function insertVal(col, body) {
  switch (col) {
    case 'recruit': return body.recruit === false ? 0 : 1;
    case 'bk21': return body.bk21 ? 1 : 0;
    case 'ord': return 0;
    case 'hashtags': return JSON.stringify(Array.isArray(body.hashtags) ? body.hashtags : []);
    case 'gyeyeol': return body.gyeyeol || '';
    case 'name': return body.name || '';
    default: return body[col] == null ? null : body[col];
  }
}

function buildSet(body, allowGyeyeol) {
  const cols = [], vals = [];
  for (const [k, v] of Object.entries(body)) {
    if (k === 'gyeyeol' && !allowGyeyeol) continue;
    if (k === 'hashtags') { cols.push('hashtags=?::jsonb'); vals.push(JSON.stringify(Array.isArray(v) ? v : [])); }
    else if (k === 'recruit') { cols.push('recruit=?'); vals.push(v ? 1 : 0); }
    else if (k === 'bk21') { cols.push('bk21=?'); vals.push(v ? 1 : 0); }
    else { cols.push(`${k}=?`); vals.push(v == null ? null : v); }
  }
  return { sql: cols.join(','), vals };
}

export async function applyPlan(exec, plan) {
  let added = 0, updated = 0;
  const newIds = new Map(); // newRef -> id

  // 1) dept insert
  for (const op of plan.ops) {
    if (op.kind !== 'dept' || op.op !== 'insert') continue;
    const placeholders = INSERT_DEPT_COLS.map((c) => (c === 'hashtags' ? '?::jsonb' : '?')).join(',');
    const vals = INSERT_DEPT_COLS.map((c) => insertVal(c, op.body));
    const row = await exec.get(`INSERT INTO dir_departments (${INSERT_DEPT_COLS.join(',')}) VALUES (${placeholders}) RETURNING id`, ...vals);
    if (op.newRef != null) newIds.set(op.newRef, row.id);
    added++;
  }
  // 2) dept update
  for (const op of plan.ops) {
    if (op.kind !== 'dept' || op.op !== 'update') continue;
    const { sql, vals } = buildSet(op.body, true);
    if (sql) { await exec.run(`UPDATE dir_departments SET ${sql} WHERE id=?`, ...vals, op.id); updated++; }
    else updated++;
  }
  // 3) major insert
  for (const op of plan.ops) {
    if (op.kind !== 'major' || op.op !== 'insert') continue;
    const deptId = op.parentId != null ? op.parentId : newIds.get(op.parentNewRef);
    const placeholders = INSERT_MAJOR_COLS.map((c) => (c === 'hashtags' ? '?::jsonb' : '?')).join(',');
    const vals = INSERT_MAJOR_COLS.map((c) => (c === 'dept_id' ? deptId : insertVal(c, op.body)));
    await exec.run(`INSERT INTO dir_majors (${INSERT_MAJOR_COLS.join(',')}) VALUES (${placeholders})`, ...vals);
    added++;
  }
  // 4) major update
  for (const op of plan.ops) {
    if (op.kind !== 'major' || op.op !== 'update') continue;
    const { sql, vals } = buildSet(op.body, false);
    if (sql) { await exec.run(`UPDATE dir_majors SET ${sql} WHERE id=?`, ...vals, op.id); }
    updated++;
  }
  return { added, updated };
}
```
> 주의: 위 `insertVal`은 INSERT에서 누락 필드 기본값을 채운다(UPDATE의 "빈칸 유지"와 구분). 테스트의 첫 INSERT가 `exec.get`이라 RETURNING id가 101이 되도록 `fakeExec`가 seq를 올린다.

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat: applyPlan (트랜잭션 INSERT/부분 UPDATE)"
```

---

### Task 9: 관리자 라우트 3개 (`admin.js`) + 왕복 수동 검증

**Files:**
- Modify: `backend/src/admin.js` (라우트 추가, 상단에 import)

**Interfaces:**
- Consumes: `directory-import.js`의 `treeToRows, serializeCsv, decodeUpload, parseCsv, headerIndex, rowToRecord, buildPlan, applyPlan`; `db.js`의 `getDirectoryTree`, `tx`.
- Produces: HTTP — `GET /api/admin/directory/export`, `POST /api/admin/directory/import/preview`, `POST /api/admin/directory/import/commit`.

- [ ] **Step 1: import 추가**

`admin.js` 상단 import 구역에:
```js
import { getDirectoryTree, tx } from './db.js';
import {
  treeToRows, serializeCsv, decodeUpload, parseCsv,
  headerIndex, rowToRecord, buildPlan, applyPlan,
} from './directory-import.js';
```
> `getDirectoryTree`가 이미 import돼 있으면 중복 추가하지 말 것. 없으면 추가.

- [ ] **Step 2: export 라우트**

세부전공 삭제 라우트 아래(`router.delete('/departments/:id/majors/:mid'...)` 뒤)에 추가:
```js
// === 디렉터리 CSV 일괄 수정 ===
router.get('/directory/export', requireAdmin, async (req, res) => {
  const tree = await getDirectoryTree();
  const csv = '﻿' + serializeCsv(treeToRows(tree)); // UTF-8 BOM
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="directory.csv"');
  res.send(csv);
});

// 업로드 본문 → 파싱·검증·plan. body: { csvBase64: string }
async function parseUpload(body) {
  const b64 = (body && body.csvBase64) || '';
  const buf = Buffer.from(b64, 'base64');
  const { text, encoding, garbled } = decodeUpload(buf);
  const rows = parseCsv(text);
  if (!rows.length) return { error: 'empty' };
  const idx = headerIndex(rows[0]);
  const records = rows.slice(1)
    .filter((r) => r.some((c) => (c || '').trim() !== '')) // 빈 줄 무시
    .map((cells, i) => rowToRecord(idx, cells, i + 2));
  const tree = await getDirectoryTree();
  const plan = buildPlan(records, tree);
  return { encoding, garbled, plan };
}

router.post('/directory/import/preview', requireAdmin, async (req, res) => {
  try {
    const r = await parseUpload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ encoding: r.encoding, garbled: r.garbled, summary: r.plan.summary, rows: r.plan.reports });
  } catch (e) { console.error('[dir import preview]', e.message); res.status(500).json({ error: 'internal' }); }
});

router.post('/directory/import/commit', requireAdmin, async (req, res) => {
  try {
    if (!req.body || req.body.confirm !== true) return res.status(400).json({ error: 'confirm_required' });
    const r = await parseUpload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    const result = await tx(async (t) => applyPlan(t, r.plan));
    res.json({ ...result, skipped: r.plan.summary.skipped });
  } catch (e) { console.error('[dir import commit]', e.message); res.status(500).json({ error: 'internal' }); }
});
```

- [ ] **Step 3: 서버 재시작 후 왕복 수동 검증**

백엔드 dev 서버가 떠 있는 상태에서(로그인 쿠키 필요). 관리자 로그인 후 브라우저/관리도구로:
1. `GET /api/admin/directory/export` → BOM 포함 CSV 다운로드, 147개 학과 + 세부전공 행 확인.
2. 그 CSV에서 한 학과의 `소개`만 바꿔 base64로 인코딩 → `POST /preview` → `summary.updated===1` 확인.
3. `POST /commit` (`confirm:true`) → 200, `/api/departments`에서 변경 반영 확인.

Run(예: PowerShell 로그인 세션 또는 관리자 UI 구현 후):
```
# 구현 후 Task 10 UI로 검증해도 됨. 백엔드만 확인하려면 admin 쿠키로 curl.
```
Expected: export 다운로드 OK / preview summary 정확 / commit 후 반영.

- [ ] **Step 4: Commit**
```bash
git add backend/src/admin.js
git commit -m "feat: 디렉터리 CSV export/preview/commit 라우트"
```

---

### Task 10: 관리자 UI — 내보내기/가져오기 + 미리보기 모달

**Files:**
- Modify: `frontend/src/pages/DeptDirectoryAdmin.jsx`

**REQUIRED SUB-SKILL:** UI 변경 전 `frontend-design` 스킬을 적용한다(메모리 규칙: 모든 UI/디자인 변경 전 frontend-design).

**Interfaces:**
- Consumes: `GET /api/admin/directory/export`, `POST /api/admin/directory/import/preview`, `POST /api/admin/directory/import/commit`.

- [ ] **Step 1: frontend-design 스킬 적용** — 툴바 버튼·미리보기 모달의 시각 디자인 방향 확정(기존 admin 스타일과 정합).

- [ ] **Step 2: 툴바 + 내보내기**

`DeptDirectoryAdmin` 상단 필터 영역 옆에 버튼 추가:
```jsx
<a className="..." href="/api/admin/directory/export">현재 디렉터리 내보내기(CSV)</a>
<button type="button" onClick={() => fileRef.current?.click()}>CSV 가져오기</button>
<input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onPickFile} />
```
(상단에 `const fileRef = useRef(null);` 추가)

- [ ] **Step 3: 파일 선택 → preview 호출 + 모달 상태**
```jsx
const [preview, setPreview] = useState(null); // { encoding, garbled, summary, rows, csvBase64 }
async function onPickFile(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const buf = await file.arrayBuffer();
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const csvBase64 = btoa(bin);
  const r = await api('/api/admin/directory/import/preview', { method: 'POST', body: JSON.stringify({ csvBase64 }) });
  const j = await r.json();
  if (!r.ok) { alert('미리보기 실패: ' + (j.error || '')); return; }
  setPreview({ ...j, csvBase64 });
  e.target.value = '';
}
```

- [ ] **Step 4: 미리보기 모달 + 적용**
```jsx
async function commitImport() {
  const r = await api('/api/admin/directory/import/commit', { method: 'POST', body: JSON.stringify({ csvBase64: preview.csvBase64, confirm: true }) });
  const j = await r.json();
  if (!r.ok) { alert('적용 실패: ' + (j.error || '')); return; }
  alert(`반영 완료 — 추가 ${j.added} · 수정 ${j.updated} · 스킵 ${j.skipped}`);
  setPreview(null); await load();
}
```
모달 렌더(요약 + 깨짐 경고 + 행 표):
```jsx
{preview && (
  <div className="modal-overlay" onClick={() => setPreview(null)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>CSV 가져오기 미리보기</h3>
      {preview.garbled && <p style={{ color: 'crimson' }}>⚠ 한글이 깨져 보입니다. 적용하지 말고 "CSV UTF-8"로 다시 저장해 올려주세요. (인코딩: {preview.encoding})</p>}
      <p>추가 {preview.summary.added} · 수정 {preview.summary.updated} · 오류/스킵 {preview.summary.skipped} (인코딩 {preview.encoding})</p>
      <table><thead><tr><th>행</th><th>동작</th><th>구분</th><th>이름</th><th>오류</th></tr></thead>
        <tbody>{preview.rows.map((r) => (
          <tr key={r.lineNo} style={r.action === 'error' ? { color: 'crimson' } : null}>
            <td>{r.lineNo}</td><td>{r.action}</td><td>{r.kind}</td><td>{r.name}</td><td>{(r.errors || []).join('; ')}</td>
          </tr>))}</tbody></table>
      <div>
        <button onClick={() => setPreview(null)}>취소</button>
        <button onClick={commitImport} disabled={preview.summary.added + preview.summary.updated === 0}>적용</button>
      </div>
    </div>
  </div>
)}
```
> 모달/버튼 클래스·스타일은 Step 1에서 정한 디자인에 맞춘다. 한글 미리보기(이름 열)로 깨짐을 육안 확인.

- [ ] **Step 5: 브라우저 검증(스크린샷)**

dev 서버에서 관리자 로그인 → 학과 디렉터리 관리 탭 → 내보내기 다운로드 → 일부 수정 → 가져오기 → 미리보기 모달 확인 → 적용 → 목록 반영. 헤드리스 Chrome 스크린샷으로 모달·결과 확인.

- [ ] **Step 6: Commit**
```bash
git add frontend/src/pages/DeptDirectoryAdmin.jsx
git commit -m "feat: 관리자 디렉터리 CSV 내보내기/가져오기 UI + 미리보기 모달"
```

---

## Self-Review

**Spec coverage:** export(Task5,9)·preview/commit(Task9)·인코딩 감지(Task4)·하이브리드 매칭(Task7)·비파괴 업서트/빈칸 유지(Task6,8)·세부전공 부모 해석(Task7,8)·검증/오류 스킵(Task6,7)·관리자 UI/깨짐 확인(Task10)·BOM(Task9)·의존성0(전 태스크) — 모두 태스크에 매핑됨.

**Placeholder scan:** "적절히 처리" 류 없음. 모든 코드 스텝에 실제 코드 포함.

**Type consistency:** `decodeUpload→{text,encoding,garbled}`, `rowToRecord.fields`(DB 컬럼 키)→`buildPlan.body`→`applyPlan`(insertVal/buildSet) 일관. `newRef`/`parentNewRef` 참조 일관. `exec.get/run` 시그니처 = db.js `tx()` 주입형과 일치.

**범위 외(YAGNI):** 이미지·ord·삭제·.xlsx·이력 미포함(스펙 명시).
