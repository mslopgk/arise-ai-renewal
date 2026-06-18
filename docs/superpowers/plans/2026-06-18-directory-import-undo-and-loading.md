# 디렉터리 CSV 가져오기 — 되돌리기 + 적용 로딩/에러 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSV 가져오기에 ① 직전 가져오기 되돌리기(디렉터리 테이블 스냅샷/복원) ② 적용 중 로딩 표시 + 실패 원인 표시를 추가한다.

**Architecture:** 커밋 직전 같은 트랜잭션에서 `dir_departments`/`dir_majors`를 백업 테이블로 스냅샷(최근 1건). 되돌리기는 트랜잭션 내 wipe+restore. 프런트 모달은 phase(applying/error) 상태로 로딩/에러 표시, 툴바에 되돌리기 버튼.

**Tech Stack:** Node ESM, Express, PostgreSQL(`pg`), `node:test`, React(Vite). 외부 의존성 추가 없음.

## Global Constraints
- 의존성 0 추가. 모든 라우트 `requireAdmin`.
- 스냅샷/적용/복원은 **단일 트랜잭션**. 최근 스냅샷 **1건만** 보관. 되돌리기는 **1회성**(복원 후 스냅샷 삭제).
- 백업/복원은 이미지(`image_data bytea`) 포함 네이티브 행 복사. 디렉터리 외 테이블 미접촉.
- `exec`는 db.js `tx()` 주입형: `exec.get(sql, ...params)`, `exec.run(sql, ...params)`. SQL은 `?` 플레이스홀더(toPg가 $n 변환).
- 컬럼 순서(백업/복원 시 명시):
  - dept: `id,gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord,image_mime,image_data,created_at`
  - major: `id,dept_id,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord,image_mime,image_data`
- 테스트: `cd backend && npm test`.

---

### Task 1: 스냅샷 스키마 추가

**Files:**
- Modify: `backend/src/db.js` (initSchema SQL — `idx_dir_maj_dept` 인덱스 줄 뒤)

- [ ] **Step 1: 테이블 3개 추가**

`backend/src/db.js`의 `CREATE INDEX IF NOT EXISTS idx_dir_maj_dept ON dir_majors(dept_id);` 줄 **바로 뒤**에 삽입:
```sql

    -- === CSV 가져오기 되돌리기용 스냅샷 (최근 1건) ===
    CREATE TABLE IF NOT EXISTS dir_snapshots (
      id SERIAL PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      summary TEXT
    );
    CREATE TABLE IF NOT EXISTS dir_dept_backup (
      snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
      id INTEGER, gyeyeol TEXT, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
      location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
      ord INTEGER, image_mime TEXT, image_data bytea, created_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS dir_major_backup (
      snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
      id INTEGER, dept_id INTEGER, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
      location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
      ord INTEGER, image_mime TEXT, image_data bytea
    );
```

- [ ] **Step 2: 스키마 적용 확인**

백엔드 재시작(`initSchema()`가 기동 시 실행) 후 테이블 존재 확인:
```bash
cd backend && node --input-type=module <<'EOF'
import { pool } from './src/db.js';
const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name IN ('dir_snapshots','dir_dept_backup','dir_major_backup') ORDER BY table_name`);
console.log(rows.map(r => r.table_name));
await pool.end();
EOF
```
Expected: `[ 'dir_dept_backup', 'dir_major_backup', 'dir_snapshots' ]`

- [ ] **Step 3: Commit**
```bash
git add backend/src/db.js
git commit -m "feat(directory): 가져오기 되돌리기용 스냅샷 테이블 추가"
```

---

### Task 2: 모듈 함수 `snapshotDirectory` / `restoreLatestSnapshot`

**Files:**
- Modify: `backend/src/directory-import.js`
- Test: `backend/src/directory-import.test.js`

**Interfaces:**
- Produces:
  - `snapshotDirectory(exec, summary) => Promise<number>` (새 snapshot id). 호출 순서: `DELETE dir_snapshots` → `INSERT dir_snapshots RETURNING id` → 백업 2테이블 `INSERT ... SELECT`.
  - `restoreLatestSnapshot(exec) => Promise<{ok:true,depts,majors} | {ok:false,error:'no_snapshot'}>`.

- [ ] **Step 1: 실패 테스트 (fake exec)**

`directory-import.test.js` 에 추가:
```js
import { snapshotDirectory, restoreLatestSnapshot } from './directory-import.js';

function fakeExec2() {
  const calls = []; let seq = 10;
  return {
    calls,
    get: async (sql, ...p) => { calls.push({ sql, p }); return /INSERT INTO dir_snapshots/.test(sql) ? { id: ++seq } : (/ORDER BY id DESC/.test(sql) ? null : { c: 0 }); },
    run: async (sql, ...p) => { calls.push({ sql, p }); },
  };
}

test('snapshotDirectory: 최근1건 유지 + 백업 복사 순서', async () => {
  const ex = fakeExec2();
  const sid = await snapshotDirectory(ex, '백업요약');
  assert.equal(sid, 11);
  const sqls = ex.calls.map((c) => c.sql);
  assert.match(sqls[0], /^DELETE FROM dir_snapshots/);
  assert.match(sqls[1], /INSERT INTO dir_snapshots .* RETURNING id/);
  assert.ok(sqls.some((s) => /INSERT INTO dir_dept_backup .* SELECT/.test(s)));
  assert.ok(sqls.some((s) => /INSERT INTO dir_major_backup .* SELECT/.test(s)));
});

test('restoreLatestSnapshot: 스냅샷 없으면 ok:false', async () => {
  const ex = fakeExec2(); // get(ORDER BY id DESC) → null
  const r = await restoreLatestSnapshot(ex);
  assert.deepEqual(r, { ok: false, error: 'no_snapshot' });
});
```

- [ ] **Step 2: 실행 → 실패 확인** — Run: `cd backend && npm test` / Expected: FAIL (함수 없음)

- [ ] **Step 3: 구현**

`directory-import.js` 맨 아래에 추가:
```js
// === 가져오기 되돌리기 (스냅샷/복원) ===
const DEPT_ALL = ['id', 'gyeyeol', 'name', 'recruit', 'homepage', 'hashtags', 'location', 'phone', 'bk21', 'bk21_name', 'bk21_url', 'intro', 'ord', 'image_mime', 'image_data', 'created_at'];
const MAJOR_ALL = ['id', 'dept_id', 'name', 'recruit', 'homepage', 'hashtags', 'location', 'phone', 'bk21', 'bk21_name', 'bk21_url', 'intro', 'ord', 'image_mime', 'image_data'];

export async function snapshotDirectory(exec, summary) {
  await exec.run('DELETE FROM dir_snapshots');          // 최근 1건만 유지
  const row = await exec.get('INSERT INTO dir_snapshots (summary) VALUES (?) RETURNING id', summary);
  const sid = row.id;
  await exec.run(`INSERT INTO dir_dept_backup (snapshot_id, ${DEPT_ALL.join(',')}) SELECT ?, ${DEPT_ALL.join(',')} FROM dir_departments`, sid);
  await exec.run(`INSERT INTO dir_major_backup (snapshot_id, ${MAJOR_ALL.join(',')}) SELECT ?, ${MAJOR_ALL.join(',')} FROM dir_majors`, sid);
  return sid;
}

export async function restoreLatestSnapshot(exec) {
  const snap = await exec.get('SELECT id FROM dir_snapshots ORDER BY id DESC LIMIT 1');
  if (!snap) return { ok: false, error: 'no_snapshot' };
  const sid = snap.id;
  await exec.run('DELETE FROM dir_departments');         // dir_majors는 FK CASCADE로 함께 삭제
  await exec.run(`INSERT INTO dir_departments (${DEPT_ALL.join(',')}) SELECT ${DEPT_ALL.join(',')} FROM dir_dept_backup WHERE snapshot_id=?`, sid);
  await exec.run(`INSERT INTO dir_majors (${MAJOR_ALL.join(',')}) SELECT ${MAJOR_ALL.join(',')} FROM dir_major_backup WHERE snapshot_id=?`, sid);
  await exec.run(`SELECT setval(pg_get_serial_sequence('dir_departments','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM dir_departments), 1))`);
  await exec.run(`SELECT setval(pg_get_serial_sequence('dir_majors','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM dir_majors), 1))`);
  const depts = (await exec.get('SELECT COUNT(*)::int AS c FROM dir_departments')).c;
  const majors = (await exec.get('SELECT COUNT(*)::int AS c FROM dir_majors')).c;
  await exec.run('DELETE FROM dir_snapshots WHERE id=?', sid);
  return { ok: true, depts, majors };
}
```

- [ ] **Step 4: 실행 → 통과 확인** — Run: `cd backend && npm test` / Expected: PASS (총 23건)

- [ ] **Step 5: Commit**
```bash
git add backend/src/directory-import.js backend/src/directory-import.test.js
git commit -m "feat(directory): snapshotDirectory/restoreLatestSnapshot (되돌리기 코어)"
```

---

### Task 3: 실제 Postgres 롤백 통합 검증

**Files:** (임시 스크립트 — 커밋 안 함)

- [ ] **Step 1: 통합 검증 스크립트 작성·실행**

백엔드 dev 서버가 떠 있는 상태에서 `backend/_snaptest.mjs` 작성:
```js
import { pool, tx, getDirectoryTree } from './src/db.js';
import { headerIndex, rowToRecord, buildPlan, applyPlan, snapshotDirectory, restoreLatestSnapshot, HEADERS } from './src/directory-import.js';
const idx = headerIndex(HEADERS);
const before = await getDirectoryTree();
const beforeCount = before.length;
const d1 = before.find((d) => d.id === 1);
const recs = [
  rowToRecord(idx, ['1', '학과', '', d1.gyeyeol, d1.name, '', '', '', '', '', '', '', '', '__스냅테스트변경__'], 2),
  rowToRecord(idx, ['', '학과', '', '공학', '__스냅신규__', 'Y', '', '', '', 'N', '', '', '', ''], 3),
];
const plan = buildPlan(recs, before);
try {
  await tx(async (t) => {
    await snapshotDirectory(t, '테스트백업');
    await applyPlan(t, plan);
    const afterApply = (await t.get('SELECT COUNT(*)::int c FROM dir_departments')).c;
    const d1mid = (await t.get('SELECT intro FROM dir_departments WHERE id=1')).intro;
    console.log('적용 후 학과수:', afterApply, '| d1.intro:', d1mid);
    const r = await restoreLatestSnapshot(t);
    const restored = (await t.get('SELECT COUNT(*)::int c FROM dir_departments')).c;
    const d1after = (await t.get('SELECT intro FROM dir_departments WHERE id=1')).intro;
    const newGone = (await t.get(`SELECT COUNT(*)::int c FROM dir_departments WHERE name='__스냅신규__'`)).c;
    const snapsLeft = (await t.get('SELECT COUNT(*)::int c FROM dir_snapshots')).c;
    console.log('복원 결과:', r, '| 복원 후 학과수:', restored, '| d1.intro:', d1after, '| 신규 잔존:', newGone, '| 스냅샷 잔존:', snapsLeft);
    if (restored !== beforeCount) throw new Error('FAIL: 학과수 불일치');
    if (d1after === '__스냅테스트변경__') throw new Error('FAIL: intro 미복원');
    if (newGone !== 0) throw new Error('FAIL: 신규 미삭제');
    if (snapsLeft !== 0) throw new Error('FAIL: 스냅샷 미삭제(1회성)');
    console.log('✔ 스냅샷/복원 검증 통과 — 롤백');
    throw new Error('__ROLLBACK__');
  });
} catch (e) { if (e.message !== '__ROLLBACK__') { console.error('실패:', e.message); process.exitCode = 1; } else console.log('✔ 롤백 완료'); }
await pool.end();
```
Run: `cd backend && node _snaptest.mjs && rm -f _snaptest.mjs`
Expected: "✔ 스냅샷/복원 검증 통과" + 복원 후 학과수 = 변경 전 수, intro 복원, 신규 삭제, 스냅샷 0건. (데이터 변경 없음 — 롤백)

- [ ] **Step 2: 임시 스크립트 삭제 확인** (위 명령에 `rm -f` 포함)

---

### Task 4: 라우트 — commit(스냅샷+에러개선) / undo / snapshot status

**Files:**
- Modify: `backend/src/admin.js`

**Interfaces:**
- Consumes: `snapshotDirectory`, `restoreLatestSnapshot` (directory-import.js); `db`, `tx`.
- Produces: `POST /api/admin/directory/import/undo`, `GET /api/admin/directory/snapshot`; commit 라우트 동작 변경.

- [ ] **Step 1: import에 함수 추가**

`admin.js`의 directory-import import 구문에 `snapshotDirectory, restoreLatestSnapshot` 추가:
```js
import {
  treeToRows, serializeCsv, decodeUpload, parseCsv,
  headerIndex, rowToRecord, buildPlan, applyPlan,
  snapshotDirectory, restoreLatestSnapshot,
} from './directory-import.js';
```

- [ ] **Step 2: commit 라우트 — 스냅샷 + 에러 메시지**

`admin.js`의 기존 commit 라우트 전체를 아래로 교체:
```js
router.post('/directory/import/commit', requireAdmin, async (req, res) => {
  try {
    if (!req.body || req.body.confirm !== true) return res.status(400).json({ error: 'confirm_required' });
    const r = await parseUpload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    const s = r.plan.summary;
    const result = await tx(async (t) => {
      await snapshotDirectory(t, `가져오기 직전 백업 · 추가 ${s.added}·수정 ${s.updated}`);
      return applyPlan(t, r.plan);
    });
    res.json({ ...result, skipped: s.skipped });
  } catch (e) {
    console.error('[dir import commit]', e.message);
    res.status(500).json({ error: 'commit_failed', message: e.message });
  }
});
```

- [ ] **Step 3: undo + snapshot 라우트 추가**

commit 라우트 바로 뒤에 추가:
```js
// 마지막 가져오기 되돌리기 (직전 스냅샷 복원, 1회성)
router.post('/directory/import/undo', requireAdmin, async (req, res) => {
  try {
    const result = await tx((t) => restoreLatestSnapshot(t));
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('[dir import undo]', e.message);
    res.status(500).json({ error: 'undo_failed', message: e.message });
  }
});

// 되돌리기 가능 여부(직전 스냅샷 정보)
router.get('/directory/snapshot', requireAdmin, async (req, res) => {
  const row = await db.prepare('SELECT id, created_at, summary FROM dir_snapshots ORDER BY id DESC LIMIT 1').get();
  res.json(row ? { exists: true, created_at: row.created_at, summary: row.summary } : { exists: false });
});
```

- [ ] **Step 4: HTTP 왕복 검증 (임시 관리자)**

`backend/_undotest.mjs` 작성·실행 (임시 관리자 생성→로그인→commit(추가전용)→snapshot exists→undo→복원·snapshot 없음→정리):
```js
import bcrypt from 'bcryptjs';
import { db, pool } from './src/db.js';
const BASE = 'http://localhost:3001'; const U = '__undo_admin__', P = 'undo-pw';
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const HDR = 'id,구분,상위학과,계열,학과명/전공명,모집여부,홈페이지,위치,전화,BK21참여,BK21사업단명,BK21홈페이지,해시태그,소개';
await db.prepare('DELETE FROM admins WHERE username=?').run(U);
await db.prepare('INSERT INTO admins (username,password_hash) VALUES (?,?)').run(U, bcrypt.hashSync(P, 10));
try {
  const login = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: U, password: P }) });
  const cookie = (login.headers.get('set-cookie') || '').split(',').map((c) => c.split(';')[0]).join('; ');
  const auth = { Cookie: cookie, 'Content-Type': 'application/json' };
  const before = (await (await fetch(`${BASE}/api/departments`)).json()).length;
  const csv = [HDR, ',학과,,공학,__되돌리기테스트__,Y,,,,N,,,,'].join('\r\n');
  const com = await (await fetch(`${BASE}/api/admin/directory/import/commit`, { method: 'POST', headers: auth, body: JSON.stringify({ csvBase64: b64(csv), confirm: true }) })).json();
  const afterAdd = (await (await fetch(`${BASE}/api/departments`)).json()).length;
  const snap1 = await (await fetch(`${BASE}/api/admin/directory/snapshot`, { headers: { Cookie: cookie } })).json();
  const undo = await (await fetch(`${BASE}/api/admin/directory/import/undo`, { method: 'POST', headers: auth })).json();
  const afterUndo = (await (await fetch(`${BASE}/api/departments`)).json()).length;
  const snap2 = await (await fetch(`${BASE}/api/admin/directory/snapshot`, { headers: { Cookie: cookie } })).json();
  console.log({ before, commit: com, afterAdd, snap1, undo, afterUndo, snap2 });
  console.log('검증:', afterAdd === before + 1, snap1.exists === true, afterUndo === before, snap2.exists === false);
} finally {
  await db.prepare('DELETE FROM admins WHERE username=?').run(U);
  await pool.end();
}
```
Run: `cd backend && node _undotest.mjs && rm -f _undotest.mjs`
Expected: `afterAdd=before+1`, `snap1.exists=true`, `afterUndo=before`, `snap2.exists=false` → 검증 라인 `true true true true`.

- [ ] **Step 5: Commit**
```bash
git add backend/src/admin.js
git commit -m "feat(directory): 되돌리기/스냅샷 라우트 + commit 스냅샷·에러메시지"
```

---

### Task 5: 프런트 — 되돌리기 버튼 + 적용 로딩/에러 모달

**Files:**
- Modify: `frontend/src/pages/DeptDirectoryAdmin.jsx`

**REQUIRED SUB-SKILL:** UI 변경 전 `frontend-design` 적용(메모리 규칙).

**Interfaces:**
- Consumes: `GET /api/admin/directory/snapshot`, `POST /api/admin/directory/import/undo`, 개선된 commit 응답(`{error,message}`).

- [ ] **Step 1: frontend-design 적용** — 되돌리기 버튼·스피너·에러 패널을 기존 다크 인라인 스타일에 정합.

- [ ] **Step 2: 스냅샷 상태 + 로드 시 조회**

`const [preview, setPreview] = useState(null);` 아래에 추가:
```js
  const [snapshot, setSnapshot] = useState({ exists: false });
  async function refreshSnapshot() {
    const r = await api('/api/admin/directory/snapshot');
    if (r.ok) setSnapshot(await r.json());
  }
```
기존 `useEffect(() => { load(); }, []);` 를 아래로 교체:
```js
  useEffect(() => { load(); refreshSnapshot(); }, []);
```

- [ ] **Step 3: 적용 흐름 — phase(applying/error) + 되돌리기/undo 핸들러**

기존 `commitImport` 함수를 아래로 교체하고, 이어서 `undoImport` 추가:
```js
  async function commitImport() {
    setPreview((p) => ({ ...p, phase: 'applying', errorMsg: '' }));
    let r, j;
    try {
      r = await api('/api/admin/directory/import/commit', { method: 'POST', body: JSON.stringify({ csvBase64: preview.csvBase64, confirm: true }) });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      setPreview((p) => ({ ...p, phase: 'error', errorMsg: '네트워크 오류: ' + e.message })); return;
    }
    if (!r.ok) {
      setPreview((p) => ({ ...p, phase: 'error', errorMsg: j.message || j.error || ('알 수 없는 오류 (HTTP ' + r.status + ')') })); return;
    }
    setPreview(null);
    await refreshSnapshot();
    await load();
    alert(`반영 완료 — 추가 ${j.added} · 수정 ${j.updated} · 스킵 ${j.skipped}`);
  }
  async function undoImport() {
    if (!confirm('마지막 가져오기를 되돌립니다.\n⚠ 이 가져오기 이후의 디렉터리 변경도 함께 되돌아갑니다. 계속할까요?')) return;
    const r = await api('/api/admin/directory/import/undo', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert('되돌리기 실패: ' + (j.message || j.error || '')); return; }
    alert(`되돌리기 완료 — 학과 ${j.depts} · 세부전공 ${j.majors} 복원`);
    await refreshSnapshot();
    await load();
  }
```

- [ ] **Step 4: 툴바에 되돌리기 버튼**

`<input ref={fileRef} ... onChange={onPickFile} />` 줄 바로 뒤(같은 `S.bulkBar` 안)에 추가:
```jsx
        {snapshot.exists && (
          <button type="button" onClick={undoImport} style={S.bulkBtnUndo} title={snapshot.summary || ''}>↺ 마지막 가져오기 되돌리기</button>
        )}
```

- [ ] **Step 5: 모달 — 로딩/에러 렌더 + 스피너**

`ImportPreviewModal` 컴포넌트를 아래로 교체:
```jsx
function ImportPreviewModal({ preview, onClose, onCommit }) {
  const { summary, rows, encoding, garbled, phase, errorMsg } = preview;
  const applying = phase === 'applying';
  const nothing = summary.added + summary.updated === 0;
  const actionKo = (a) => (a === 'add' ? '추가' : a === 'update' ? '수정' : '오류');
  const kindKo = (k) => (k === 'dept' ? '학과' : k === 'major' ? '세부전공' : '-');
  return (
    <div style={S.modalOverlay} onClick={applying ? undefined : onClose}>
      <style>{`@keyframes dda-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.cardTitle}>CSV 가져오기 미리보기</div>
        {garbled && (
          <div style={S.warn}>⚠ 한글이 깨져 보입니다. 적용하지 말고 엑셀에서 "CSV UTF-8"로 다시 저장해 올려주세요. (감지 인코딩: {encoding})</div>
        )}
        <div style={S.summaryRow}>
          <span style={S.badgeAdd}>추가 {summary.added}</span>
          <span style={S.badgeUpd}>수정 {summary.updated}</span>
          <span style={S.badgeErr}>오류/스킵 {summary.skipped}</span>
          <span style={S.bulkHint}>인코딩 {encoding}</span>
        </div>
        <div style={S.modalTableWrap}>
          <table style={S.modalTable}>
            <thead><tr>
              <th style={S.th}>행</th><th style={S.th}>동작</th><th style={S.th}>구분</th><th style={S.th}>이름</th><th style={S.th}>오류</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.lineNo} style={r.action === 'error' ? S.trErr : null}>
                  <td style={S.td}>{r.lineNo}</td>
                  <td style={S.td}>{actionKo(r.action)}</td>
                  <td style={S.td}>{kindKo(r.kind)}</td>
                  <td style={S.td}>{r.name}</td>
                  <td style={S.td}>{(r.errors || []).join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {phase === 'error' && (
          <div style={S.warn}>적용 실패 — {errorMsg}</div>
        )}
        <div style={S.btnRow}>
          {applying ? (
            <span style={S.applying}><span style={S.spinner} /> 적용 중입니다…</span>
          ) : (
            <>
              <button onClick={onCommit} disabled={nothing} style={{ ...S.primary, ...(nothing ? S.inputDisabled : {}) }}>{phase === 'error' ? '다시 시도' : '적용'}</button>
              <button onClick={onClose} style={S.ghost}>취소</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 스타일 토큰 추가**

`S` 객체 마지막(`trErr` 줄 뒤, 닫는 `};` 앞)에 추가:
```js
  bulkBtnUndo: { background: '#3a2c12', color: '#f0c070', border: '1px solid #6a4f20', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  applying: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14 },
  spinner: { width: 16, height: 16, border: '2px solid #3a3d48', borderTopColor: '#3672b8', borderRadius: '50%', display: 'inline-block', animation: 'dda-spin .7s linear infinite' },
```

- [ ] **Step 7: 브라우저 검증(스크린샷)**

dev 서버 + 임시 관리자 쿠키(CDP)로: ① 가져오기 → 미리보기 → 적용 클릭 시 "적용 중입니다…" 스피너 ② 성공 후 툴바에 "↺ 마지막 가져오기 되돌리기" 노출 ③ (가능하면) 실패 시 빨간 에러 패널. 스크린샷 확인.

- [ ] **Step 8: Commit**
```bash
git add frontend/src/pages/DeptDirectoryAdmin.jsx
git commit -m "feat(directory): 되돌리기 버튼 + 적용 로딩/에러 표시 모달"
```

---

## Self-Review

**Spec coverage:** 스냅샷 스키마(T1)·스냅샷/복원 코어(T2)·실DB 검증(T3)·commit 스냅샷+에러메시지·undo·snapshot status 라우트(T4)·되돌리기 버튼·로딩/에러 모달(T5) — 스펙의 스키마/백엔드/프런트/테스트 항목 모두 매핑.

**Placeholder scan:** "적절히" 류 없음. 모든 코드 스텝에 실제 코드.

**Type consistency:** `snapshotDirectory(exec,summary)→number`, `restoreLatestSnapshot(exec)→{ok,depts,majors}|{ok:false,error}` 일관. exec.get/run = db.js `tx()` 주입형. 프런트 `preview.phase`('applying'|'error'), `snapshot.{exists,summary}` 일관. commit 응답 `{error,message}` ↔ 모달 `errorMsg` 일관.

**범위 외:** 다단계 이력·redo·전체 DB 백업 미포함(스펙 명시).
