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

// === CSV 파싱/직렬화 (RFC4180, 의존성 0) ===
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

export function serializeCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

// === 인코딩 감지 (UTF-8 BOM 제거 + EUC-KR 폴백) ===
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

// === 디렉터리 → CSV 행 (내보내기) ===
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

// === 행 정규화/검증 ===
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
  if (kind === 'dept' && !idStr && !gyeyeol) errors.push('신규 학과는 계열이 필요합니다');
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

// === diff/plan 계산 (하이브리드 매칭) ===
export function buildPlan(records, tree) {
  const depts = tree || [];
  const deptById = new Map();
  const deptByKey = new Map();   // `${gyeyeol}␟${name}` -> dept
  const deptByName = new Map();  // name -> [dept,...]
  const majorById = new Map();   // id -> { major, deptId }
  const majorByKey = new Map();  // `${deptId}␟${name}` -> major
  for (const d of depts) {
    deptById.set(d.id, d);
    deptByKey.set(`${d.gyeyeol}␟${d.name}`, d);
    if (!deptByName.has(d.name)) deptByName.set(d.name, []);
    deptByName.get(d.name).push(d);
    for (const m of (d.majors || [])) {
      majorById.set(m.id, { major: m, deptId: d.id });
      majorByKey.set(`${d.id}␟${m.name}`, m);
    }
  }

  const ops = [], reports = [];
  let added = 0, updated = 0, skipped = 0;
  let refSeq = 1;
  const newDeptRefByName = new Map();

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

// === 트랜잭션 적용 ===
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

  // 1) dept insert (신규 id 확보)
  for (const op of plan.ops) {
    if (op.kind !== 'dept' || op.op !== 'insert') continue;
    const placeholders = INSERT_DEPT_COLS.map((c) => (c === 'hashtags' ? '?::jsonb' : '?')).join(',');
    const vals = INSERT_DEPT_COLS.map((c) => insertVal(c, op.body));
    const row = await exec.get(`INSERT INTO dir_departments (${INSERT_DEPT_COLS.join(',')}) VALUES (${placeholders}) RETURNING id`, ...vals);
    if (op.newRef != null) newIds.set(op.newRef, row.id);
    added++;
  }
  // 2) dept update (부분 SET)
  for (const op of plan.ops) {
    if (op.kind !== 'dept' || op.op !== 'update') continue;
    const { sql, vals } = buildSet(op.body, true);
    if (sql) await exec.run(`UPDATE dir_departments SET ${sql} WHERE id=?`, ...vals, op.id);
    updated++;
  }
  // 3) major insert (부모 id 해석)
  for (const op of plan.ops) {
    if (op.kind !== 'major' || op.op !== 'insert') continue;
    const deptId = op.parentId != null ? op.parentId : newIds.get(op.parentNewRef);
    const placeholders = INSERT_MAJOR_COLS.map((c) => (c === 'hashtags' ? '?::jsonb' : '?')).join(',');
    const vals = INSERT_MAJOR_COLS.map((c) => (c === 'dept_id' ? deptId : insertVal(c, op.body)));
    await exec.run(`INSERT INTO dir_majors (${INSERT_MAJOR_COLS.join(',')}) VALUES (${placeholders})`, ...vals);
    added++;
  }
  // 4) major update (부분 SET)
  for (const op of plan.ops) {
    if (op.kind !== 'major' || op.op !== 'update') continue;
    const { sql, vals } = buildSet(op.body, false);
    if (sql) await exec.run(`UPDATE dir_majors SET ${sql} WHERE id=?`, ...vals, op.id);
    updated++;
  }
  return { added, updated };
}

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
