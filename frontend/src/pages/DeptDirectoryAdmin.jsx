import { useEffect, useState, useRef } from 'react';

// 협동과정·계약학과는 학석박사 연계과정 신청 불가(대학원혁신실 회신, 2026-06-12)로 디렉터리에서 제외
const GYE = ['인문·사회', '자연과학', '공학', '예술', '체육', '의학'];
const api = (url, opts = {}) =>
  fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

// 서버 객체 → 편집용 폼 객체
function toForm(d, isMajor) {
  return {
    id: d?.id, _isMajor: isMajor,
    gyeyeol: d?.gyeyeol || (isMajor ? undefined : GYE[0]),
    name: d?.name || '', recruit: d?.recruit !== false,
    homepage: d?.homepage || '', location: d?.location || '', phone: d?.phone || '',
    bk21: !!d?.bk21, bk21_name: d?.bk21_name || '', bk21_url: d?.bk21_url || '',
    intro: d?.intro || '', hashtags: (d?.hashtags || []).join('\n'),
    imageUrl: d?.image || '',   // 기존 이미지 URL(미리보기)
    _newImage: '', _imageCleared: false,
  };
}
// 폼 → API 본문
function toBody(f) {
  const b = {
    gyeyeol: f.gyeyeol, name: f.name.trim(), recruit: f.recruit,
    homepage: f.homepage.trim(), location: f.location.trim(), phone: f.phone.trim(),
    bk21: f.bk21, bk21_name: f.bk21_name.trim(), bk21_url: f.bk21_url.trim(),
    intro: f.intro.trim(),
    hashtags: f.hashtags.split(/[\n,]/).map(s => s.trim()).filter(Boolean).map(s => s[0] === '#' ? s : '#' + s),
  };
  if (f._isMajor) delete b.gyeyeol;
  if (f._newImage) b.image = f._newImage;
  else if (f._imageCleared) b.imageClear = true;
  return b;
}

export default function DeptDirectoryAdmin() {
  const [depts, setDepts] = useState([]);
  const [gyeFilter, setGyeFilter] = useState('');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { encoding, garbled, summary, rows, csvBase64, phase, errorMsg }
  const [snapshot, setSnapshot] = useState({ exists: false });
  async function refreshSnapshot() {
    const r = await api('/api/admin/directory/snapshot');
    if (r.ok) setSnapshot(await r.json());
  }

  async function load() {
    const r = await api('/api/departments');
    const data = await r.json();
    setDepts(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); refreshSnapshot(); }, []);

  const filtered = depts
    .filter(d => (!gyeFilter || d.gyeyeol === gyeFilter) &&
      (!q || (d.name + ' ' + (d.majors || []).map(m => m.name).join(' ')).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.name).localeCompare(b.name, 'ko'));
  const current = depts.find(d => d.id === selId);

  async function saveDept(form) {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/admin/departments/${form.id}` : '/api/admin/departments';
    const r = await api(url, { method, body: JSON.stringify(toBody(form)) });
    if (!r.ok) { alert('저장 실패: ' + (await r.json().catch(() => ({}))).error); return; }
    const j = await r.json();
    await load();
    setSelId(form.id || j.id);
  }
  async function delDept(id) {
    if (!confirm('이 학과를 삭제할까요? (세부전공·이미지 포함, 되돌릴 수 없음)')) return;
    await api(`/api/admin/departments/${id}`, { method: 'DELETE' });
    setSelId(null); await load();
  }
  async function saveMajor(deptId, form) {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/admin/departments/${deptId}/majors/${form.id}` : `/api/admin/departments/${deptId}/majors`;
    const r = await api(url, { method, body: JSON.stringify(toBody(form)) });
    if (!r.ok) { alert('세부전공 저장 실패'); return; }
    await load();
  }
  async function delMajor(deptId, mid) {
    if (!confirm('이 세부전공을 삭제할까요?')) return;
    await api(`/api/admin/departments/${deptId}/majors/${mid}`, { method: 'DELETE' });
    await load();
  }

  // === CSV 일괄 가져오기 ===
  async function onPickFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const csvBase64 = btoa(bin);
    e.target.value = '';
    const r = await api('/api/admin/directory/import/preview', { method: 'POST', body: JSON.stringify({ csvBase64 }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert('미리보기 실패: ' + (j.error || '')); return; }
    setPreview({ ...j, csvBase64 });
  }
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

  return (
    <div>
      <div style={S.bulkBar}>
        <span style={S.bulkTitle}>대량 관리</span>
        <a href="/api/admin/directory/export" style={S.bulkBtn}>현재 디렉터리 내보내기 (CSV)</a>
        <button type="button" onClick={() => fileRef.current?.click()} style={S.bulkBtnPrimary}>CSV 가져오기</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onPickFile} />
        {snapshot.exists && (
          <button type="button" onClick={undoImport} style={S.bulkBtnUndo} title={snapshot.summary || ''}>↺ 마지막 가져오기 되돌리기</button>
        )}
        <span style={S.bulkHint}>학과·세부전공 텍스트 일괄 추가·수정 (이미지·삭제 제외)</span>
      </div>

      <div style={S.wrap}>
      {/* 목록 */}
      <div style={S.listPane}>
        <div style={S.listHead}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="학과·전공 검색" style={S.input} />
          <select value={gyeFilter} onChange={e => setGyeFilter(e.target.value)} style={S.select}>
            <option value="">전체 계열</option>
            {GYE.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={() => setSelId('new')} style={S.addBtn}>+ 학과 추가</button>
          <div style={S.count}>{loading ? '로딩…' : `${filtered.length}개 학과 (총 ${depts.length})`}</div>
        </div>
        <div style={S.listBody}>
          {filtered.map(d => (
            <button key={d.id} onClick={() => setSelId(d.id)}
              style={{ ...S.listItem, ...(d.id === selId ? S.listItemActive : {}) }}>
              <span style={{ fontWeight: 600 }}>{d.bk21 ? '★ ' : ''}{d.name}</span>
              <span style={S.listMeta}>{d.gyeyeol}{(d.majors || []).length ? ` · 전공 ${d.majors.length}` : ''}{d.recruit === false ? ' · 미모집' : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 편집 */}
      <div style={S.editPane}>
        {selId === 'new' ? (
          <DeptEditor key="new" initial={toForm(null, false)} onSave={saveDept} onCancel={() => setSelId(null)} />
        ) : current ? (
          <>
            <DeptEditor key={current.id} initial={toForm(current, false)} onSave={saveDept} onDelete={() => delDept(current.id)} />
            <MajorsPanel dept={current} onSaveMajor={saveMajor} onDeleteMajor={delMajor} />
          </>
        ) : (
          <div style={S.placeholder}>← 학과를 선택하거나 추가하세요.</div>
        )}
        </div>
      </div>

      {preview && (
        <ImportPreviewModal preview={preview} onClose={() => setPreview(null)} onCommit={commitImport} />
      )}
    </div>
  );
}

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
            <thead>
              <tr>
                <th style={S.th}>행</th><th style={S.th}>동작</th><th style={S.th}>구분</th><th style={S.th}>이름</th><th style={S.th}>오류</th>
              </tr>
            </thead>
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

function DeptEditor({ initial, onSave, onDelete, onCancel }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const fileRef = useRef(null);
  function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('이미지는 2MB 이하만 가능합니다.'); return; }
    const rd = new FileReader();
    rd.onload = () => setF(p => ({ ...p, _newImage: rd.result, _imageCleared: false }));
    rd.readAsDataURL(file);
  }
  const preview = f._newImage || (f._imageCleared ? '' : (f.imageUrl ? f.imageUrl + (f.imageUrl.includes('?') ? '' : '?t=' + Date.now()) : ''));
  async function save() { setSaving(true); try { await onSave(f); } finally { setSaving(false); } }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{f.id ? `학과 편집 · ${f.name}` : '새 학과 추가'}</div>
      <div style={S.formGrid}>
        <L label="학과명 *"><input style={S.input} value={f.name} onChange={e => set('name', e.target.value)} /></L>
        <L label="계열 *">
          <select style={S.select} value={f.gyeyeol} onChange={e => set('gyeyeol', e.target.value)}>
            {GYE.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </L>
        <L label="홈페이지"><input style={S.input} value={f.homepage} onChange={e => set('homepage', e.target.value)} placeholder="https://" /></L>
        <L label="위치"><input style={S.input} value={f.location} onChange={e => set('location', e.target.value)} /></L>
        <L label="전화"><input style={S.input} value={f.phone} onChange={e => set('phone', e.target.value)} /></L>
        <L label="모집 여부">
          <label style={S.check}><input type="checkbox" checked={f.recruit} onChange={e => set('recruit', e.target.checked)} /> 모집함</label>
        </L>
        <L label="BK21">
          <label style={S.check}><input type="checkbox" checked={f.bk21} onChange={e => { const on = e.target.checked; setF(p => ({ ...p, bk21: on, ...(on ? {} : { bk21_name: '', bk21_url: '' }) })); }} /> 참여학과(★)</label>
        </L>
        <L label="BK21 사업단명"><input style={{ ...S.input, ...(f.bk21 ? {} : S.inputDisabled) }} value={f.bk21_name} disabled={!f.bk21} onChange={e => set('bk21_name', e.target.value)} placeholder={f.bk21 ? '' : '참여학과 체크 시 입력'} /></L>
        <L label="BK21 URL"><input style={{ ...S.input, ...(f.bk21 ? {} : S.inputDisabled) }} value={f.bk21_url} disabled={!f.bk21} onChange={e => set('bk21_url', e.target.value)} placeholder={f.bk21 ? '' : '참여학과 체크 시 입력'} /></L>
      </div>
      <L label="소개"><textarea style={S.textarea} rows={3} value={f.intro} onChange={e => set('intro', e.target.value)} /></L>
      <L label="해시태그 (줄바꿈 또는 쉼표 구분, # 자동)"><textarea style={S.textarea} rows={3} value={f.hashtags} onChange={e => set('hashtags', e.target.value)} /></L>
      <L label="이미지 (16:9, 2MB 이하)">
        <div style={S.mediaRow}>
          <div style={S.thumb}>
            {preview ? <img src={preview} alt="" style={S.thumbImg} /> : <span style={{ color: '#666', fontSize: 12 }}>이미지 없음</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ fontSize: 12 }} />
            {preview && <button onClick={() => { setF(p => ({ ...p, _newImage: '', _imageCleared: true })); if (fileRef.current) fileRef.current.value = ''; }} style={S.ghost}>이미지 제거</button>}
          </div>
        </div>
      </L>
      <div style={S.btnRow}>
        <button onClick={save} disabled={saving} style={S.primary}>{saving ? '저장 중…' : '저장'}</button>
        {onDelete && <button onClick={onDelete} style={S.danger}>삭제</button>}
        {onCancel && <button onClick={onCancel} style={S.ghost}>취소</button>}
      </div>
    </div>
  );
}

function MajorsPanel({ dept, onSaveMajor, onDeleteMajor }) {
  const [adding, setAdding] = useState(false);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>세부전공 ({(dept.majors || []).length})
        <button onClick={() => setAdding(a => !a)} style={{ ...S.ghost, marginLeft: 'auto' }}>{adding ? '닫기' : '+ 세부전공 추가'}</button>
      </div>
      {adding && (
        <MajorEditor key="newmaj" initial={toForm(null, true)}
          onSave={async (form) => { await onSaveMajor(dept.id, form); setAdding(false); }} compact />
      )}
      {(dept.majors || []).map(m => (
        <MajorEditor key={m.id} initial={toForm(m, true)}
          onSave={(form) => onSaveMajor(dept.id, form)} onDelete={() => onDeleteMajor(dept.id, m.id)} collapsed />
      ))}
      {!(dept.majors || []).length && !adding && <div style={{ color: '#666', fontSize: 13, padding: '4px 2px' }}>세부전공 없음 (디렉터리에서 학과 클릭 시 바로 팝업)</div>}
    </div>
  );
}

function MajorEditor({ initial, onSave, onDelete, collapsed }) {
  const [open, setOpen] = useState(!collapsed);
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const fileRef = useRef(null);
  function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('2MB 이하'); return; }
    const rd = new FileReader(); rd.onload = () => setF(p => ({ ...p, _newImage: rd.result, _imageCleared: false })); rd.readAsDataURL(file);
  }
  const preview = f._newImage || (f._imageCleared ? '' : (f.imageUrl ? f.imageUrl + '?t=' + Date.now() : ''));
  async function save() { setSaving(true); try { await onSave(f); } finally { setSaving(false); } }

  if (!open) return (
    <div style={S.majRow}>
      <span>{f.recruit ? '' : '· '}{f.name}</span>
      <button onClick={() => setOpen(true)} style={S.ghostSm}>편집</button>
    </div>
  );
  return (
    <div style={S.majCard}>
      <div style={S.formGrid}>
        <L label="전공명 *"><input style={S.input} value={f.name} onChange={e => set('name', e.target.value)} /></L>
        <L label="홈페이지"><input style={S.input} value={f.homepage} onChange={e => set('homepage', e.target.value)} placeholder="비우면 학과값" /></L>
        <L label="위치"><input style={S.input} value={f.location} onChange={e => set('location', e.target.value)} /></L>
        <L label="전화"><input style={S.input} value={f.phone} onChange={e => set('phone', e.target.value)} /></L>
        <L label="모집"><label style={S.check}><input type="checkbox" checked={f.recruit} onChange={e => set('recruit', e.target.checked)} /> 모집함</label></L>
        <L label="BK21"><label style={S.check}><input type="checkbox" checked={f.bk21} onChange={e => set('bk21', e.target.checked)} /> 참여</label></L>
      </div>
      <L label="소개 (비우면 학과값)"><textarea style={S.textarea} rows={2} value={f.intro} onChange={e => set('intro', e.target.value)} /></L>
      <L label="해시태그 (비우면 학과값)"><textarea style={S.textarea} rows={2} value={f.hashtags} onChange={e => set('hashtags', e.target.value)} /></L>
      <L label="이미지 (비우면 학과값)">
        <div style={S.mediaRow}>
          <div style={S.thumbSm}>{preview ? <img src={preview} alt="" style={S.thumbImg} /> : <span style={{ color: '#666', fontSize: 11 }}>없음</span>}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ fontSize: 12 }} />
            {preview && <button onClick={() => { setF(p => ({ ...p, _newImage: '', _imageCleared: true })); if (fileRef.current) fileRef.current.value = ''; }} style={S.ghostSm}>제거</button>}
          </div>
        </div>
      </L>
      <div style={S.btnRow}>
        <button onClick={save} disabled={saving} style={S.primary}>{saving ? '저장 중…' : '저장'}</button>
        {onDelete && <button onClick={onDelete} style={S.danger}>삭제</button>}
        {collapsed && <button onClick={() => setOpen(false)} style={S.ghost}>접기</button>}
      </div>
    </div>
  );
}

function L({ label, children }) {
  return <label style={S.field}><span style={S.label}>{label}</span>{children}</label>;
}

const S = {
  wrap: { display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' },
  listPane: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, overflow: 'hidden' },
  listHead: { padding: 12, borderBottom: '1px solid #2a2d38', display: 'flex', flexDirection: 'column', gap: 8 },
  listBody: { maxHeight: '70vh', overflowY: 'auto' },
  listItem: { width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #20232c', color: '#e8e8ea', cursor: 'pointer', fontSize: 14 },
  listItemActive: { background: '#23262f' },
  listMeta: { fontSize: 11, color: '#7a7a82' },
  count: { fontSize: 11, color: '#7a7a82' },
  editPane: { display: 'flex', flexDirection: 'column', gap: 16 },
  placeholder: { color: '#666', padding: 40, textAlign: 'center', background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10 },
  card: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: 18 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 14, display: 'flex', alignItems: 'center' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 },
  label: { fontSize: 12, color: '#9a9aa2' },
  input: { background: '#0e0f13', border: '1px solid #3a3d48', borderRadius: 6, padding: '8px 10px', color: '#e8e8ea', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  inputDisabled: { background: '#16181f', color: '#5a5a62', borderColor: '#2a2d38', cursor: 'not-allowed' },
  select: { background: '#0e0f13', border: '1px solid #3a3d48', borderRadius: 6, padding: '8px 10px', color: '#e8e8ea', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#0e0f13', border: '1px solid #3a3d48', borderRadius: 6, padding: '8px 10px', color: '#e8e8ea', fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  check: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ccc', fontSize: 14 },
  mediaRow: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  thumb: { width: 192, aspectRatio: '16/9', background: '#0e0f13', border: '1px solid #3a3d48', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  thumbSm: { width: 128, aspectRatio: '16/9', background: '#0e0f13', border: '1px solid #3a3d48', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  btnRow: { display: 'flex', gap: 8, marginTop: 14 },
  primary: { background: '#3672b8', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  danger: { background: '#3a1c1c', color: '#ff8a8a', border: '1px solid #5a2a2a', padding: '9px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  ghost: { background: 'transparent', color: '#ccc', border: '1px solid #3a3d48', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  ghostSm: { background: 'transparent', color: '#bbb', border: '1px solid #3a3d48', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  addBtn: { background: '#1f2230', color: '#e8e8ea', border: '1px solid #3a3d48', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  majRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #20232c', fontSize: 14, color: '#ddd' },
  majCard: { background: '#0e0f13', border: '1px solid #2a2d38', borderRadius: 8, padding: 14, marginBottom: 10 },
  // 대량 관리 툴바
  bulkBar: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  bulkTitle: { fontSize: 13, fontWeight: 600, color: '#ddd', marginRight: 4 },
  bulkBtn: { background: '#1f2230', color: '#e8e8ea', border: '1px solid #3a3d48', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, textDecoration: 'none' },
  bulkBtnPrimary: { background: '#3672b8', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  bulkHint: { fontSize: 11, color: '#7a7a82' },
  // 미리보기 모달
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 12, padding: 20, width: 'min(760px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' },
  warn: { background: '#3a1c1c', color: '#ff8a8a', border: '1px solid #5a2a2a', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 },
  summaryRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  badgeAdd: { background: '#16301e', color: '#7fe0a3', border: '1px solid #265a38', borderRadius: 6, padding: '3px 10px', fontSize: 13 },
  badgeUpd: { background: '#1a2740', color: '#86b6f0', border: '1px solid #2a4a78', borderRadius: 6, padding: '3px 10px', fontSize: 13 },
  badgeErr: { background: '#3a1c1c', color: '#ff8a8a', border: '1px solid #5a2a2a', borderRadius: 6, padding: '3px 10px', fontSize: 13 },
  modalTableWrap: { overflow: 'auto', border: '1px solid #2a2d38', borderRadius: 8, flex: '1 1 auto' },
  modalTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { position: 'sticky', top: 0, background: '#0e0f13', color: '#9a9aa2', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #2a2d38', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid #20232c', color: '#ddd', verticalAlign: 'top' },
  trErr: { background: '#241416', color: '#ff8a8a' },
  bulkBtnUndo: { background: '#3a2c12', color: '#f0c070', border: '1px solid #6a4f20', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  applying: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14 },
  spinner: { width: 16, height: 16, border: '2px solid #3a3d48', borderTopColor: '#3672b8', borderRadius: '50%', display: 'inline-block', animation: 'dda-spin .7s linear infinite' },
};
