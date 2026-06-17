import { useEffect, useState } from 'react';

// 학과 정보 수정 신청 — 관리자 검토 큐. 승인 시 디렉터리 자동 반영.
const api = (url, opts = {}) => fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

const STATUS = {
  pending: { label: '검토 대기', color: '#ffd76e', bg: '#2f2810', bd: '#5a4a1c' },
  approved: { label: '승인 · 반영됨', color: '#5dc99e', bg: '#10241b', bd: '#1d4435' },
  rejected: { label: '반려됨', color: '#ff8a8a', bg: '#3a1c1c', bd: '#5a2a2a' },
};
const fmtDate = (s) => { try { return new Date(s).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return s; } };

function targetText(r) {
  if (r.target_level === 'major') {
    const m = r.major_id ? `세부전공 「${r.major_name || `#${r.major_id}`}」` : `신규 세부전공 「${r.major_name || ''}」`;
    const d = r.dept_id ? r.dept_name : `신규 학과 「${r.dept_name || ''}」`;
    return `${m} · ${d}`;
  }
  return r.dept_id ? `학과 「${r.dept_name || `#${r.dept_id}`}」 수정` : `신규 학과 「${r.dept_name || ''}」`;
}

export default function DeptChangeRequestsAdmin({ onPendingChange }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selId, setSelId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api(`/api/admin/dir-change-requests?status=${filter}`);
      const d = await r.json();
      setList(d.requests || []);
      onPendingChange?.(d.pending_count || 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function openDetail(id) {
    setSelId(id); setDetail(null);
    const r = await api(`/api/admin/dir-change-requests/${id}`);
    if (r.ok) setDetail((await r.json()).request);
  }
  async function approve(id) {
    if (!confirm('이 신청을 승인하고 디렉터리에 반영할까요?')) return;
    setBusy(true);
    try {
      const r = await api(`/api/admin/dir-change-requests/${id}/approve`, { method: 'POST' });
      if (!r.ok) { alert('승인 실패: ' + ((await r.json().catch(() => ({}))).error || r.status)); return; }
      await load(); await openDetail(id);
    } finally { setBusy(false); }
  }
  async function reject(id) {
    const reason = prompt('반려 사유 (선택, 비워도 됩니다)');
    if (reason === null) return; // 취소
    setBusy(true);
    try {
      const r = await api(`/api/admin/dir-change-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (!r.ok) { alert('반려 실패: ' + ((await r.json().catch(() => ({}))).error || r.status)); return; }
      await load(); await openDetail(id);
    } finally { setBusy(false); }
  }

  return (
    <div style={S.wrap}>
      <div style={S.listPane}>
        <div style={S.listHead}>
          <div style={S.filterRow}>
            {['pending', 'all', 'approved', 'rejected'].map((f) => (
              <button key={f} onClick={() => { setFilter(f); setSelId(null); setDetail(null); }}
                style={{ ...S.filterBtn, ...(filter === f ? S.filterBtnOn : {}) }}>
                {f === 'pending' ? '검토 대기' : f === 'all' ? '전체' : STATUS[f].label}
              </button>
            ))}
          </div>
          <div style={S.count}>{loading ? '로딩…' : `${list.length}건`}</div>
        </div>
        <div style={S.listBody}>
          {!loading && list.length === 0 && <div style={S.empty}>해당 신청이 없습니다.</div>}
          {list.map((r) => (
            <button key={r.id} onClick={() => openDetail(r.id)}
              style={{ ...S.item, ...(r.id === selId ? S.itemOn : {}) }}>
              <div style={S.itemTop}>
                <span style={S.itemName}>{r.applicant_name || '(이름 없음)'}</span>
                <Badge status={r.status} small />
              </div>
              <div style={S.itemTarget}>{targetText(r)}</div>
              <div style={S.itemMeta}>{r.affiliation || ''} · {fmtDate(r.created_at)}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={S.detailPane}>
        {!detail ? (
          <div style={S.placeholder}>← 신청을 선택하세요.</div>
        ) : (
          <div style={S.card}>
            <div style={S.detailHead}>
              <div>
                <div style={S.detailTitle}>{targetText(detail)}</div>
                <div style={S.detailSub}>신청 #{detail.id} · {fmtDate(detail.created_at)}</div>
              </div>
              <Badge status={detail.status} />
            </div>

            <Group title="신청자">
              <Row k="신청자명" v={detail.applicant_name} />
              <Row k="소속" v={detail.affiliation} />
              <Row k="내선전화" v={detail.ext_phone} />
              <Row k="제출자 이메일" v={detail.submitter_email} />
            </Group>

            <Group title="반영 대상">
              <Row k="계열" v={detail.gyeyeol} />
              <Row k="학과" v={`${detail.dept_name || '-'}${detail.dept_id ? ` (기존 #${detail.dept_id})` : ' (신규)'}`} />
              {detail.target_level === 'major' && (
                <Row k="세부전공" v={`${detail.major_name || '-'}${detail.major_id ? ` (기존 #${detail.major_id})` : ' (신규)'}`} />
              )}
            </Group>

            <Group title="디렉터리 내용 (비운 항목은 기존값 유지)">
              <Row k="소개" v={detail.intro} pre />
              <Row k="위치" v={detail.location} />
              <Row k="전화번호" v={detail.phone} />
              <Row k="홈페이지" v={detail.homepage} link />
              <Row k="BK21 사업단 홈페이지" v={detail.bk21_url} link />
            </Group>

            {detail.has_image && (
              <Group title="첨부 이미지">
                <img src={`/api/admin/dir-change-requests/${detail.id}/image`} alt="첨부 이미지" style={S.img} />
              </Group>
            )}

            {detail.status !== 'pending' && (
              <Group title="검토 결과">
                <Row k="처리 시각" v={fmtDate(detail.reviewed_at)} />
                {detail.reject_reason && <Row k="반려 사유" v={detail.reject_reason} pre />}
              </Group>
            )}

            {detail.status === 'pending' && (
              <div style={S.btnRow}>
                <button disabled={busy} onClick={() => approve(detail.id)} style={S.approve}>✓ 승인 · 디렉터리 반영</button>
                <button disabled={busy} onClick={() => reject(detail.id)} style={S.reject}>반려</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ status, small }) {
  const s = STATUS[status] || STATUS.pending;
  return <span style={{ ...S.badge, color: s.color, background: s.bg, borderColor: s.bd, ...(small ? S.badgeSm : {}) }}>{s.label}</span>;
}
function Group({ title, children }) {
  return <div style={S.group}><div style={S.groupTitle}>{title}</div>{children}</div>;
}
function Row({ k, v, pre, link }) {
  const empty = v == null || String(v).trim() === '';
  return (
    <div style={S.row}>
      <div style={S.rowK}>{k}</div>
      <div style={{ ...S.rowV, ...(empty ? S.rowEmpty : {}), ...(pre ? { whiteSpace: 'pre-wrap' } : {}) }}>
        {empty ? '—' : (link ? <a href={v} target="_blank" rel="noreferrer" style={S.a}>{v}</a> : v)}
      </div>
    </div>
  );
}

const S = {
  wrap: { display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 16, alignItems: 'start' },
  listPane: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, overflow: 'hidden' },
  listHead: { padding: 12, borderBottom: '1px solid #2a2d38', display: 'flex', flexDirection: 'column', gap: 10 },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn: { background: 'transparent', color: '#9a9aa2', border: '1px solid #2a2d38', padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12 },
  filterBtnOn: { background: '#23262f', color: '#fff', borderColor: '#3a3d48' },
  count: { fontSize: 11, color: '#7a7a82' },
  listBody: { maxHeight: '72vh', overflowY: 'auto' },
  empty: { padding: 28, textAlign: 'center', color: '#666', fontSize: 13 },
  item: { width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '11px 13px', background: 'transparent', border: 'none', borderBottom: '1px solid #20232c', color: '#e8e8ea', cursor: 'pointer' },
  itemOn: { background: '#23262f' },
  itemTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemName: { fontWeight: 600, fontSize: 14 },
  itemTarget: { fontSize: 12.5, color: '#bcdcff' },
  itemMeta: { fontSize: 11, color: '#7a7a82' },
  detailPane: { minWidth: 0 },
  placeholder: { color: '#666', padding: 40, textAlign: 'center', background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10 },
  card: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: 20 },
  detailHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingBottom: 14, marginBottom: 6, borderBottom: '1px solid #2a2d38' },
  detailTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },
  detailSub: { fontSize: 12, color: '#7a7a82', marginTop: 4 },
  group: { marginTop: 18 },
  groupTitle: { fontSize: 12, fontWeight: 600, color: '#88aadd', letterSpacing: '0.04em', marginBottom: 8, textTransform: 'uppercase' },
  row: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, padding: '6px 0', borderTop: '1px solid #20232c', fontSize: 14 },
  rowK: { color: '#8a8a92', fontSize: 13 },
  rowV: { color: '#e8e8ea', wordBreak: 'break-word' },
  rowEmpty: { color: '#55555c' },
  a: { color: '#5d9cd5', textDecoration: 'none' },
  img: { maxWidth: '100%', borderRadius: 8, border: '1px solid #2a2d38' },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid' },
  badgeSm: { fontSize: 10.5, padding: '2px 8px' },
  btnRow: { display: 'flex', gap: 10, marginTop: 22 },
  approve: { background: '#1d7a4d', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  reject: { background: '#3a1c1c', color: '#ff8a8a', border: '1px solid #5a2a2a', padding: '11px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
};
