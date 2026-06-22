import { useState, useEffect, useRef, useCallback } from 'react';
import { mapAnswers } from '../../lib/apply-survey.js';

const MAX_PICKS = 3;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function buildPickText(dept, major) {
  return major ? dept + ' / ' + major : dept;
}

// ── Picks list (mirrors renderPicks ~3052-3072) ──
function PicksList({ picks, onRemove, onGotoDept }) {
  const rank = ['1지망', '2지망', '3지망'];
  if (!picks.length) {
    return (
      <div className="picks-list">
        <div className="picks-empty">
          위에서 학과를 선택하거나{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onGotoDept(); }}>
            학과 디렉터리
          </a>
          에서 담아주세요.
        </div>
      </div>
    );
  }
  return (
    <div className="picks-list">
      {picks.map((p, i) => (
        <div className="pick-item" key={i}>
          <span className="pick-rank">{i + 1}</span>
          <span className="pick-text">
            {p.text}
            <small>{rank[i]}</small>
          </span>
          <button
            type="button"
            className="pick-remove"
            aria-label={`${rank[i]} 제거`}
            onClick={() => onRemove(i)}
          >✕</button>
        </div>
      ))}
    </div>
  );
}

/**
 * ApplyModal — 원본 2977–3017 + picks/picker/submit 로직 1:1 이식
 * Props: { open, onClose, departments, onSubmitted }
 * showToast is injected via prop to use AdmissionPage's global toast
 */
export default function ApplyModal({ open, onClose, departments, onSubmitted, showToast }) {
  // Picks store (mirrors ~3037-3050)
  const [picks, setPicks] = useState([]);

  // Picker state
  const [deptVal, setDeptVal] = useState('');
  const [majorVal, setMajorVal] = useState('');

  const formRef = useRef(null);

  // Reset form + picks when modal closes
  const reset = useCallback(() => {
    setPicks([]);
    setDeptVal('');
    setMajorVal('');
    if (formRef.current) formRef.current.reset();
  }, []);

  // Close modal and restore scroll (mirrors closeModal ~3169)
  const handleClose = useCallback(() => {
    document.body.style.overflow = '';
    onClose();
  }, [onClose]);

  // Lock/unlock scroll when open changes (mirrors openApplyModal/closeModal)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  // Backdrop click (mirrors modal.addEventListener('click') ~3183)
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

  // ESC key (mirrors keydown Escape ~3291-3293)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // ── Derived picker values ──
  const selectedDept = departments.find((d) => String(d.id) === deptVal) || null;
  const majors = selectedDept
    ? (selectedDept.majors || []).filter((m) => m.recruit !== false)
    : [];
  const needMajor = majors.length >= 2;
  const full = picks.length >= MAX_PICKS;

  // updatePickAddState equivalents (mirrors ~3128-3147)
  const showMajorSelect = selectedDept && majors.length > 0;
  const majorOptional = majors.length === 1;
  const ready = !!selectedDept && (!needMajor || !!majorVal);
  const addDisabled = full || !ready;

  let hintText = '';
  let hintWarn = false;
  if (full) {
    hintText = '지망은 최대 3개까지 담을 수 있습니다.';
    hintWarn = true;
  } else if (selectedDept && needMajor && !majorVal) {
    hintText = '전공을 선택한 뒤 추가하세요.';
    hintWarn = false;
  }

  // addPick (mirrors ~3042-3050)
  const addPick = useCallback(() => {
    if (full) { showToast('⚠ 지망은 최대 3개까지 담을 수 있습니다.'); return; }
    const d = departments.find((x) => String(x.id) === deptVal);
    if (!d) { showToast('⚠ 학과를 선택하세요.'); return; }
    const dMajors = (d.majors || []).filter((m) => m.recruit !== false);
    let major = '';
    if (dMajors.length >= 2) {
      major = majorVal;
      if (!major) { showToast('⚠ 전공을 선택하세요.'); return; }
    } else if (dMajors.length === 1) {
      major = majorVal;
    }
    const text = buildPickText(d.name, major);
    if (picks.some((p) => p.text === text)) { showToast('이미 담은 학과·전공입니다.'); return; }
    const newPick = { dept: d.name, major: major || '', text };
    setPicks((prev) => {
      if (prev.length >= MAX_PICKS) {
        showToast('⚠ 지망은 최대 3개까지 담을 수 있습니다.');
        return prev;
      }
      return [...prev, newPick];
    });
    showToast(`'${text}' 을(를) 담았습니다.`);
    setDeptVal('');
    setMajorVal('');
  }, [full, departments, deptVal, majorVal, picks, showToast]);

  // removePick (mirrors ~3051)
  const removePick = useCallback((i) => {
    setPicks((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  // Handle dept select change (mirrors ~3184)
  const handleDeptChange = useCallback((e) => {
    setDeptVal(e.target.value);
    setMajorVal('');
  }, []);

  // Handle major select change (mirrors ~3185)
  const handleMajorChange = useCallback((e) => {
    setMajorVal(e.target.value);
  }, []);

  // Submit handler (mirrors ~3189-3231)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agreeEl = e.target.querySelector('#applyAgree');
    if (!agreeEl || !agreeEl.checked) {
      showToast('⚠ 이메일 수집·이용 동의가 필요합니다.');
      return;
    }
    const trackLabel = (fd.get('track') || '').trim();
    if (!trackLabel) { showToast('⚠ 희망 트랙을 선택해주세요.'); return; }
    if (!picks.length) { showToast('⚠ 1지망 학과를 담아주세요.'); return; }

    try {
      // Step 1: fetch survey schema (mirrors ~3199-3201)
      const sRes = await fetch('/api/surveys/1', { credentials: 'include' });
      if (sRes.status === 401) {
        window.location.href = '/auth/google?returnTo=' + encodeURIComponent(window.location.pathname + '?modal=apply');
        return;
      }
      if (!sRes.ok) { showToast('⚠ 설문 정보를 불러올 수 없습니다.'); return; }
      const survey = await sRes.json();

      // Step 2: map answers (mirrors ~3203-3213 via mapAnswers)
      const mapped = mapAnswers(survey, trackLabel, picks);
      if (mapped.error) { showToast(mapped.error); return; }

      // Step 3: POST response (mirrors ~3214-3217)
      const res = await fetch('/api/surveys/1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: mapped.answers }),
      });

      // Step 4: handle response (mirrors ~3218-3229)
      if (res.status === 201) {
        showToast('희망 제출이 완료되었습니다');
        document.body.style.overflow = '';
        reset();
        onClose();
        if (onSubmitted) onSubmitted();
      } else if (res.status === 409) {
        showToast('이미 희망 제출을 완료하셨습니다.');
      } else if (res.status === 401) {
        // submit 401: NO hash, NO buildReturnTo — pathname + ?modal=apply only
        window.location.href = '/auth/google?returnTo=' + encodeURIComponent(window.location.pathname + '?modal=apply');
      } else {
        try {
          const d = await res.json();
          showToast('⚠ 제출 실패: ' + (d.error || res.status));
        } catch (_) {
          showToast('⚠ 제출 실패: ' + res.status);
        }
      }
    } catch (_) {
      showToast('⚠ 네트워크 오류. 잠시 후 다시 시도해주세요.');
    }
  }, [picks, onClose, onSubmitted, reset, showToast]);

  // Build dept select optgroups (mirrors buildPickDeptSelect ~3086-3109)
  const groups = [];
  const byGye = new Map();
  departments.forEach((d) => {
    if (d.recruit === false) return;
    const key = d.gyeyeol || '기타';
    if (!byGye.has(key)) { byGye.set(key, []); groups.push(key); }
    byGye.get(key).push(d);
  });

  return (
    /* Always in DOM — open class controls visibility (mirrors modal-backdrop + show) */
    <div
      className={`modal-backdrop${open ? ' show' : ''}`}
      id="applyModal"
      aria-hidden={open ? 'false' : 'true'}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="modal">
        <button className="modal-close" aria-label="닫기" onClick={handleClose}>✕</button>
        <div className="modal-head">
          <div className="eyebrow">2026학년도 2학기 사전 희망 조사</div>
          <h3>연계과정 희망 제출</h3>
          <p>
            로그인한{' '}
            <strong style={{ color: 'var(--amber)' }}>@pusan.ac.kr</strong>{' '}
            계정 이메일로 접수됩니다. 정식 지원서 양식은 소속 단과대학 홈페이지에서 받아 행정실에 제출하세요.
          </p>
        </div>
        <form id="applyForm" ref={formRef} onSubmit={handleSubmit}>
          <div className="form-group">
            <label>희망 트랙 <span className="req">*</span></label>
            <select name="track" required>
              <option value="">선택하세요</option>
              <option>① 학·석사 연계과정</option>
              <option>② 학·석박사통합 연계과정</option>
              <option>③ 연계과정 전환</option>
            </select>
          </div>
          <div className="form-group">
            <label>지망 학과·전공 <span className="req">*</span></label>
            <div className="pick-picker" id="pickPicker">
              {/* Dept select with optgroups (mirrors buildPickDeptSelect) */}
              <select
                id="pickDeptSelect"
                aria-label="학과 선택"
                value={deptVal}
                disabled={full}
                onChange={handleDeptChange}
              >
                <option value="">학과를 선택하세요</option>
                {groups.map((key) => (
                  <optgroup key={key} label={key}>
                    {byGye.get(key).map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {(d.bk21 ? '★ ' : '') + d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Major select (mirrors renderPickMajorSelect ~3111-3126) */}
              {showMajorSelect && (
                <select
                  id="pickMajorSelect"
                  aria-label="전공 선택"
                  value={majorVal}
                  onChange={handleMajorChange}
                >
                  <option value="">
                    {majorOptional ? '전공(학과 단위로 담기)' : '전공을 선택하세요'}
                  </option>
                  {majors.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="pick-add-btn"
                id="pickAddBtn"
                disabled={addDisabled}
                onClick={addPick}
              >지망 추가</button>

              {/* Hint (mirrors updatePickAddState hint ~3142-3146) */}
              {hintText && (
                <p
                  className={`pick-picker-hint${hintWarn ? ' warn' : ''}`}
                  id="pickPickerHint"
                >
                  {hintText}
                </p>
              )}
            </div>

            <PicksList
              picks={picks}
              onRemove={removePick}
              onGotoDept={() => {
                handleClose();
                // Navigate to departments view via hash
                window.location.hash = 'departments';
              }}
            />

            <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '8px', lineHeight: '1.5' }}>
              1지망은 필수이며 최대 3지망까지 담을 수 있습니다. 위에서 직접 고르거나{' '}
              <a
                href="#"
                data-goto-dept
                style={{ color: 'var(--amber)' }}
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                  window.location.hash = 'departments';
                }}
              >
                학과 디렉터리
              </a>
              에서 추가하세요.
            </p>
          </div>

          <div className="checkbox-row">
            <input type="checkbox" id="applyAgree" required />
            <label
              htmlFor="applyAgree"
              style={{ margin: 0, fontWeight: 500, fontFamily: 'var(--font-sans)', letterSpacing: 0, textTransform: 'none' }}
            >
              로그인 계정 이메일 수집·이용에 동의합니다. (이름·사진은 저장하지 않습니다)
            </label>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-md btn-outline" onClick={handleClose}>취소</button>
            <button type="submit" className="btn btn-md btn-primary">희망 제출하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
