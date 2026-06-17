import { useEffect, useMemo, useRef, useState } from 'react';

// 학과 정보 수정/삭제 신청 — 학과 디렉터리 정보를 제출/수정/삭제 요청하는 공개 창구.
// 관리자 검토 큐로 적재되고, 승인 시 디렉터리에 반영(또는 삭제)된다.

const NEW = '__NEW__'; // "직접 입력(신규)" 센티넬

const ERR = {
  applicant_name_required: '신청자명을 입력해주세요.',
  affiliation_required: '소속을 입력해주세요.',
  dept_required: '학과를 선택하거나 신규 학과명을 입력해주세요.',
  gyeyeol_required_for_new_dept: '신규 학과는 계열을 선택해야 합니다.',
  delete_requires_existing_target: '삭제는 기존 학과/세부전공만 선택할 수 있습니다.',
  delete_reason_required: '삭제 사유를 입력해주세요.',
  bad_image: '이미지 형식을 인식할 수 없습니다.',
  not_image: '이미지 파일만 첨부할 수 있습니다.',
  image_too_large: '이미지는 2MB 이하만 가능합니다.',
};

export default function DeptEditRequest() {
  const [tree, setTree] = useState([]);
  const [action, setAction] = useState('upsert'); // 'upsert' | 'delete'

  // 신청자
  const [applicantName, setApplicantName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [extPhone, setExtPhone] = useState('');
  // 대상
  const [gyeyeol, setGyeyeol] = useState('');
  const [deptSel, setDeptSel] = useState('');     // '' | dept.id | NEW
  const [deptNameNew, setDeptNameNew] = useState('');
  const [majorSel, setMajorSel] = useState('');   // '' (학과 레벨) | major.id | NEW
  const [majorNameNew, setMajorNameNew] = useState('');
  // 내용 (수정·추가)
  const [intro, setIntro] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [homepage, setHomepage] = useState('');
  const [bk21Url, setBk21Url] = useState('');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const fileRef = useRef(null);
  // 삭제 사유
  const [note, setNote] = useState('');

  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isDelete = action === 'delete';

  useEffect(() => {
    fetch('/api/departments', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setTree(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const gyeOptions = useMemo(() => [...new Set(tree.map((d) => d.gyeyeol).filter(Boolean))], [tree]);
  const deptsInGye = useMemo(
    () => tree.filter((d) => d.gyeyeol === gyeyeol).sort((a, b) => String(a.name).localeCompare(b.name, 'ko')),
    [tree, gyeyeol],
  );
  const selectedDept = deptSel && deptSel !== NEW ? tree.find((d) => String(d.id) === String(deptSel)) : null;
  const majorsInDept = selectedDept ? selectedDept.majors || [] : [];
  const selectedMajor = majorSel && majorSel !== NEW ? majorsInDept.find((m) => String(m.id) === String(majorSel)) : null;

  function switchAction(a) {
    setAction(a); setErr('');
    if (a === 'delete') { // 삭제는 신규 불가 — 신규 선택 상태면 초기화
      if (deptSel === NEW) { setDeptSel(''); setDeptNameNew(''); }
      if (majorSel === NEW) { setMajorSel(''); setMajorNameNew(''); }
    }
  }

  function onGye(v) { setGyeyeol(v); setDeptSel(''); setDeptNameNew(''); setMajorSel(''); setMajorNameNew(''); }
  function onDept(v) {
    setDeptSel(v); setMajorSel(''); setMajorNameNew('');
    const d = v && v !== NEW ? tree.find((x) => String(x.id) === String(v)) : null;
    if (d) fillContent(d); else if (v === NEW) clearContent();
  }
  function onMajor(v) {
    setMajorSel(v);
    const m = v && v !== NEW ? majorsInDept.find((x) => String(x.id) === String(v)) : null;
    if (m) fillContent(m);
    else if (v === NEW) clearContent();
    else fillContent(selectedDept);
  }
  function fillContent(src) {
    if (!src) return;
    setIntro(src.intro || ''); setLocation(src.location || ''); setPhone(src.phone || '');
    setHomepage(src.homepage || ''); setBk21Url(src.bk21_url || '');
  }
  function clearContent() { setIntro(''); setLocation(''); setPhone(''); setHomepage(''); setBk21Url(''); }

  function pickImage(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setErr('이미지는 2MB 이하만 가능합니다.'); return; }
    const rd = new FileReader();
    rd.onload = () => { setImage(rd.result); setImageName(f.name); setErr(''); };
    rd.readAsDataURL(f);
  }
  function clearImage() { setImage(''); setImageName(''); if (fileRef.current) fileRef.current.value = ''; }

  function resetAll() {
    setAction('upsert'); setMajorSel(''); setMajorNameNew(''); setDeptSel(''); setDeptNameNew('');
    setGyeyeol(''); clearContent(); clearImage(); setNote('');
  }

  async function submit() {
    setErr('');
    if (!applicantName.trim()) return setErr(ERR.applicant_name_required);
    if (!affiliation.trim()) return setErr(ERR.affiliation_required);
    if (!gyeyeol) return setErr('계열을 선택해주세요.');

    if (isDelete) {
      if (!deptSel || deptSel === NEW) return setErr('삭제할 기존 학과를 선택해주세요.');
      if (majorSel === NEW) return setErr('삭제는 기존 세부전공만 가능합니다.');
      if (!note.trim()) return setErr('삭제 사유를 입력해주세요.');
    } else {
      if (!deptSel) return setErr('학과를 선택하거나 신규 학과를 선택해주세요.');
      if (deptSel === NEW && !deptNameNew.trim()) return setErr('신규 학과명을 입력해주세요.');
      if (majorSel === NEW && !majorNameNew.trim()) return setErr('신규 세부전공명을 입력해주세요.');
    }

    const isNewDept = deptSel === NEW;
    const payload = {
      action,
      applicant_name: applicantName.trim(),
      affiliation: affiliation.trim(),
      ext_phone: extPhone.trim(),
      gyeyeol,
      dept_id: isNewDept ? null : (selectedDept ? selectedDept.id : null),
      dept_name: isNewDept ? deptNameNew.trim() : (selectedDept ? selectedDept.name : ''),
      major_id: selectedMajor ? selectedMajor.id : null,
      major_name: majorSel === NEW ? majorNameNew.trim() : (selectedMajor ? selectedMajor.name : ''),
      note: note.trim(),
    };
    if (!isDelete) {
      Object.assign(payload, {
        intro: intro.trim(), location: location.trim(), phone: phone.trim(),
        homepage: homepage.trim(), bk21_url: bk21Url.trim(), image: image || undefined,
      });
    }

    setSubmitting(true);
    try {
      const r = await fetch('/api/dir-change-requests', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr('제출 실패: ' + (ERR[d.error] || d.error || r.status));
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErr('네트워크 오류로 제출하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 대상 라벨
  const upsertLabel = majorSel
    ? (majorSel === NEW ? `신규 세부전공 "${majorNameNew || '…'}"` : `세부전공 "${selectedMajor?.name || ''}"`)
    : (deptSel === NEW ? `신규 학과 "${deptNameNew || '…'}"` : (selectedDept ? `학과 "${selectedDept.name}"` : '대상 미선택'));
  const deleteLabel = selectedMajor
    ? `세부전공 "${selectedMajor.name}" 삭제`
    : (selectedDept ? `학과 "${selectedDept.name}" 전체 삭제 (소속 세부전공 ${majorsInDept.length}개 포함)` : '삭제 대상 미선택');

  return (
    <div className={`dreq-root${isDelete ? ' dreq-del' : ''}`}>
      <Style />
      <div className="dreq-bg" aria-hidden="true" />
      <div className="dreq-grain" aria-hidden="true" />

      <main className="dreq-wrap">
        <header className="dreq-head">
          <div className="dreq-eyebrow">PNU · 학과 디렉터리</div>
          <h1 className="dreq-title">학과 정보 수정 신청</h1>
          <p className="dreq-sub">
            학과 디렉터리 정보를 직접 제출·수정하거나, 기존 학과·세부전공의 삭제를 요청하는 창구입니다.
            제출 내용은 담당자 검토 후 디렉터리에 반영됩니다.
          </p>
        </header>

        {done ? (
          <section className="dreq-card dreq-done">
            <div className="dreq-done-mark">✓</div>
            <h2>신청이 접수되었습니다</h2>
            <p>담당자 검토 후 학과 디렉터리에 반영됩니다. 감사합니다.</p>
            <button className="dreq-btn dreq-btn-ghost" onClick={() => { setDone(false); resetAll(); }}>새 신청 작성</button>
          </section>
        ) : (
          <form className="dreq-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>

            <div className="dreq-typetoggle" role="tablist" aria-label="신청 유형">
              <button type="button" role="tab" aria-selected={!isDelete}
                className={`dreq-tt${!isDelete ? ' on' : ''}`} onClick={() => switchAction('upsert')}>정보 수정·추가</button>
              <button type="button" role="tab" aria-selected={isDelete}
                className={`dreq-tt${isDelete ? ' on del' : ''}`} onClick={() => switchAction('delete')}>삭제 요청</button>
            </div>

            <fieldset className="dreq-card">
              <legend><span className="dreq-no">01</span> 신청자</legend>
              <div className="dreq-grid">
                <Field label="신청자명" required>
                  <input className="dreq-in" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="예: 박선영" />
                </Field>
                <Field label="소속" required>
                  <input className="dreq-in" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="예: 교육혁신본부 전공디자인팀" />
                </Field>
                <Field label="내선전화번호">
                  <input className="dreq-in" value={extPhone} onChange={(e) => setExtPhone(e.target.value)} placeholder="예: 7256" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="dreq-card">
              <legend><span className="dreq-no">02</span> {isDelete ? '삭제 대상' : '대상 학과 · 세부전공'}</legend>
              <div className="dreq-grid">
                <Field label="계열" required>
                  <select className="dreq-in" value={gyeyeol} onChange={(e) => onGye(e.target.value)}>
                    <option value="">— 계열 선택 —</option>
                    {gyeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="학과" required>
                  <select className="dreq-in" value={deptSel} onChange={(e) => onDept(e.target.value)} disabled={!gyeyeol}>
                    <option value="">{gyeyeol ? '— 학과 선택 —' : '계열을 먼저 선택'}</option>
                    {deptsInGye.map((d) => <option key={d.id} value={d.id}>{d.bk21 ? '★ ' : ''}{d.name}</option>)}
                    {!isDelete && <option value={NEW}>+ 직접 입력 (목록에 없는 신규 학과)</option>}
                  </select>
                </Field>
                {!isDelete && deptSel === NEW && (
                  <Field label="신규 학과명" required>
                    <input className="dreq-in" value={deptNameNew} onChange={(e) => setDeptNameNew(e.target.value)} placeholder="예: 인공지능학과" />
                  </Field>
                )}
                <Field label="세부전공" hint={isDelete ? '선택 안 하면 학과 전체 삭제' : '없으면 학과 정보만 수정'}>
                  <select className="dreq-in" value={majorSel} onChange={(e) => onMajor(e.target.value)} disabled={!deptSel}>
                    <option value="">{isDelete ? '— 학과 전체 삭제 —' : '— 세부전공 없음 (학과 정보 수정) —'}</option>
                    {majorsInDept.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {!isDelete && <option value={NEW}>+ 직접 입력 (신규 세부전공)</option>}
                  </select>
                </Field>
                {!isDelete && majorSel === NEW && (
                  <Field label="신규 세부전공명" required>
                    <input className="dreq-in" value={majorNameNew} onChange={(e) => setMajorNameNew(e.target.value)} placeholder="예: 데이터사이언스전공" />
                  </Field>
                )}
              </div>
              <div className={`dreq-target${isDelete ? ' dreq-target-del' : ''}`}>
                {isDelete ? '삭제 대상' : '반영 대상'} · <b>{isDelete ? deleteLabel : upsertLabel}</b>
              </div>
            </fieldset>

            {isDelete ? (
              <fieldset className="dreq-card dreq-card-del">
                <legend><span className="dreq-no dreq-no-del">03</span> 삭제 사유</legend>
                <Field label="삭제 사유" required>
                  <textarea className="dreq-in dreq-ta" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="삭제를 요청하는 이유 (예: 폐과·통합·중복 등)" />
                </Field>
                <p className="dreq-tip dreq-tip-del">
                  ⚠ 승인되면 {selectedMajor
                    ? `세부전공 「${selectedMajor.name}」이(가) 디렉터리에서 삭제됩니다.`
                    : selectedDept
                      ? `학과 「${selectedDept.name}」과(와) 소속 세부전공 ${majorsInDept.length}개가 모두 삭제됩니다.`
                      : '선택한 대상이 디렉터리에서 삭제됩니다.'}
                </p>
              </fieldset>
            ) : (
              <>
                <fieldset className="dreq-card">
                  <legend><span className="dreq-no">03</span> 디렉터리 내용</legend>
                  <Field label="간략한 소개">
                    <textarea className="dreq-in dreq-ta" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="학과/전공 소개 문구" />
                  </Field>
                  <div className="dreq-grid">
                    <Field label="위치"><input className="dreq-in" value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
                    <Field label="전화번호"><input className="dreq-in" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                    <Field label="홈페이지 주소"><input className="dreq-in" value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
                    <Field label="BK21 사업단 홈페이지 주소" hint="입력 시 BK21 참여학과(★)로 표시">
                      <input className="dreq-in" value={bk21Url} onChange={(e) => setBk21Url(e.target.value)} placeholder="https://" />
                    </Field>
                  </div>
                  <p className="dreq-tip">비워 둔 항목은 기존 디렉터리 값이 유지됩니다.</p>
                </fieldset>

                <fieldset className="dreq-card">
                  <legend><span className="dreq-no">04</span> 학과 이미지</legend>
                  <div className="dreq-media">
                    <div className="dreq-thumb">
                      {image ? <img src={image} alt="미리보기" /> : <span>16:9 · 2MB 이하</span>}
                    </div>
                    <div className="dreq-media-ctl">
                      <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} />
                      {image && <button type="button" className="dreq-btn dreq-btn-ghost dreq-sm" onClick={clearImage}>이미지 제거</button>}
                      {imageName && <div className="dreq-fname">{imageName}</div>}
                    </div>
                  </div>
                </fieldset>
              </>
            )}

            {err && <div className="dreq-err">{err}</div>}

            <div className="dreq-actions">
              <button type="submit" className={`dreq-btn ${isDelete ? 'dreq-btn-rose' : 'dreq-btn-amber'}`} disabled={submitting}>
                {submitting ? '제출 중…' : (isDelete ? '삭제 요청 제출' : '수정 신청 제출')}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="dreq-field">
      <span className="dreq-label">{label}{required && <i className="dreq-req">*</i>}{hint && <em className="dreq-hint">{hint}</em>}</span>
      {children}
    </label>
  );
}

function Style() {
  return (
    <style>{`
.dreq-root{--bg:#08080A;--surface:#141418;--surface-2:#1A1A1F;--line:#26262C;--line-2:#33333A;
  --ink:#F5F5F0;--ink-2:#C8C8C0;--ink-3:#88888450;--mut:#888884;--amber:#FFB800;--amber-2:#FFD15C;--rose:#FF5A5F;--rose-2:#ff7a7e;
  --mono:'JetBrains Mono Variable','JetBrains Mono','SF Mono',monospace;
  --sans:'Pretendard Variable','Pretendard',-apple-system,sans-serif;
  position:relative;min-height:100vh;background:var(--bg);color:var(--ink-2);
  font-family:var(--sans);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
.dreq-root *{box-sizing:border-box}
.dreq-bg{position:fixed;inset:0;z-index:0;pointer-events:none;transition:background .4s ease;
  background:
    radial-gradient(1100px 540px at 50% -8%, rgba(255,184,0,.13), transparent 60%),
    radial-gradient(700px 460px at 88% 6%, rgba(255,184,0,.06), transparent 55%);}
.dreq-del .dreq-bg{
  background:
    radial-gradient(1100px 540px at 50% -8%, rgba(255,90,95,.13), transparent 60%),
    radial-gradient(700px 460px at 88% 6%, rgba(255,90,95,.06), transparent 55%);}
.dreq-grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(rgba(255,255,255,.022) 1px,transparent 1px);background-size:3px 3px;}
.dreq-wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:72px 24px 96px;}
.dreq-head{margin-bottom:36px;animation:dreq-up .6s cubic-bezier(.16,1,.3,1) both;}
.dreq-eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--amber);margin-bottom:18px;transition:color .3s;}
.dreq-del .dreq-eyebrow{color:var(--rose);}
.dreq-title{font-size:clamp(34px,6vw,52px);line-height:1.04;font-weight:800;letter-spacing:-.025em;color:var(--ink);margin:0 0 16px;}
.dreq-sub{max-width:54ch;color:var(--mut);font-size:15px;}
.dreq-form{display:flex;flex-direction:column;gap:18px;}
.dreq-typetoggle{display:inline-flex;gap:4px;padding:4px;background:#0C0C0F;border:1px solid var(--line-2);border-radius:13px;align-self:flex-start;
  animation:dreq-up .6s cubic-bezier(.16,1,.3,1) both;}
.dreq-tt{font-family:inherit;font-weight:700;font-size:13.5px;color:var(--mut);background:transparent;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;transition:background .2s,color .2s;}
.dreq-tt:hover{color:var(--ink-2);}
.dreq-tt.on{background:linear-gradient(180deg,var(--amber-2),var(--amber));color:#1A1206;}
.dreq-tt.on.del{background:linear-gradient(180deg,var(--rose-2),var(--rose));color:#2A0708;}
.dreq-card{position:relative;background:linear-gradient(180deg,var(--surface),var(--bg));
  border:1px solid var(--line);border-radius:16px;padding:24px 24px 26px;
  box-shadow:0 1px 0 rgba(255,255,255,.02) inset,0 24px 60px -40px rgba(0,0,0,.9);
  animation:dreq-up .6s cubic-bezier(.16,1,.3,1) both;}
.dreq-card-del{border-color:rgba(255,90,95,.32);}
.dreq-card>legend{display:flex;align-items:center;gap:12px;float:none;padding:0;margin-bottom:18px;
  font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.01em;}
.dreq-no{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--amber);
  border:1px solid var(--line-2);border-radius:6px;padding:3px 7px;letter-spacing:.05em;}
.dreq-no-del{color:var(--rose);border-color:rgba(255,90,95,.4);}
.dreq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px 16px;}
.dreq-field{display:flex;flex-direction:column;gap:7px;min-width:0;}
.dreq-label{display:flex;align-items:baseline;gap:7px;font-size:12.5px;color:var(--ink-2);letter-spacing:.01em;}
.dreq-req{color:var(--amber);font-style:normal;}
.dreq-del .dreq-req{color:var(--rose);}
.dreq-hint{font-size:11px;color:var(--mut);font-style:normal;}
.dreq-in{width:100%;background:#0C0C0F;border:1px solid var(--line-2);border-radius:9px;
  padding:11px 13px;color:var(--ink);font-size:14px;font-family:inherit;transition:border-color .15s,box-shadow .15s,background .15s;}
.dreq-in::placeholder{color:#5A5A5A;}
.dreq-in:hover:not(:disabled){border-color:#45454E;}
.dreq-in:focus{outline:none;border-color:var(--amber);background:#0E0D0A;box-shadow:0 0 0 3px rgba(255,184,0,.16);}
.dreq-del .dreq-in:focus{border-color:var(--rose);background:#100B0B;box-shadow:0 0 0 3px rgba(255,90,95,.16);}
.dreq-in:disabled{opacity:.45;cursor:not-allowed;}
select.dreq-in{appearance:none;-webkit-appearance:none;cursor:pointer;
  background-image:linear-gradient(45deg,transparent 50%,var(--mut) 50%),linear-gradient(135deg,var(--mut) 50%,transparent 50%);
  background-position:calc(100% - 18px) 18px,calc(100% - 13px) 18px;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:34px;}
.dreq-ta{resize:vertical;min-height:74px;line-height:1.6;}
.dreq-target{margin-top:16px;padding-top:14px;border-top:1px dashed var(--line-2);
  font-family:var(--mono);font-size:12px;color:var(--mut);letter-spacing:.02em;}
.dreq-target b{color:var(--amber-2);font-weight:600;}
.dreq-target-del{border-top-color:rgba(255,90,95,.35);}
.dreq-target-del b{color:#ff9a9d;}
.dreq-tip{margin-top:14px;font-size:12px;color:var(--mut);}
.dreq-tip-del{color:#ff9a9d;}
.dreq-media{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;}
.dreq-thumb{width:228px;aspect-ratio:16/9;flex-shrink:0;background:#0C0C0F;border:1px solid var(--line-2);
  border-radius:11px;display:grid;place-items:center;overflow:hidden;color:#55555A;font-family:var(--mono);font-size:11px;letter-spacing:.04em;}
.dreq-thumb img{width:100%;height:100%;object-fit:cover;}
.dreq-media-ctl{display:flex;flex-direction:column;gap:10px;padding-top:4px;}
.dreq-media-ctl input[type=file]{font-size:12px;color:var(--mut);max-width:240px;}
.dreq-media-ctl input[type=file]::file-selector-button{background:#1F1F25;color:var(--ink-2);
  border:1px solid var(--line-2);border-radius:7px;padding:7px 12px;margin-right:10px;cursor:pointer;font-family:inherit;}
.dreq-fname{font-family:var(--mono);font-size:11px;color:var(--mut);}
.dreq-err{background:rgba(255,90,95,.1);border:1px solid rgba(255,90,95,.4);color:#ff9a9d;
  padding:13px 15px;border-radius:11px;font-size:14px;}
.dreq-actions{display:flex;justify-content:flex-end;margin-top:6px;}
.dreq-btn{font-family:inherit;font-weight:700;font-size:14.5px;border-radius:11px;padding:13px 26px;
  cursor:pointer;border:1px solid transparent;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:transform .12s,box-shadow .2s,background .2s;}
.dreq-btn:active{transform:translateY(1px);}
.dreq-btn-amber{background:linear-gradient(180deg,var(--amber-2),var(--amber));color:#1A1206;box-shadow:0 10px 30px -12px rgba(255,184,0,.6);}
.dreq-btn-amber:hover{box-shadow:0 14px 38px -12px rgba(255,184,0,.8);}
.dreq-btn-rose{background:linear-gradient(180deg,var(--rose-2),var(--rose));color:#2A0708;box-shadow:0 10px 30px -12px rgba(255,90,95,.6);}
.dreq-btn-rose:hover{box-shadow:0 14px 38px -12px rgba(255,90,95,.85);}
.dreq-btn-amber:disabled,.dreq-btn-rose:disabled{opacity:.55;cursor:wait;box-shadow:none;}
.dreq-btn-ghost{background:transparent;color:var(--ink-2);border-color:var(--line-2);}
.dreq-btn-ghost:hover{border-color:#52525C;color:var(--ink);}
.dreq-btn.dreq-sm{padding:7px 14px;font-size:12.5px;font-weight:600;border-radius:8px;}
.dreq-done{text-align:center;padding:48px 28px;animation:dreq-up .6s cubic-bezier(.16,1,.3,1) both;}
.dreq-done h2{color:var(--ink);font-size:22px;margin:18px 0 10px;font-weight:800;letter-spacing:-.02em;}
.dreq-done p{color:var(--mut);font-size:14.5px;margin-bottom:24px;}
.dreq-done-mark{width:58px;height:58px;margin:0 auto;border-radius:50%;display:grid;place-items:center;
  font-size:28px;color:#0C2A18;background:linear-gradient(180deg,#4ade80,#16a34a);box-shadow:0 12px 34px -12px rgba(34,197,94,.7);}
@keyframes dreq-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.dreq-head,.dreq-card,.dreq-done,.dreq-typetoggle{animation:none}}
@media (max-width:560px){.dreq-wrap{padding:48px 18px 72px}.dreq-card{padding:20px}}
`}</style>
  );
}
