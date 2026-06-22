import { useState, useRef, useCallback } from 'react';
import { useDepartments } from '../../../hooks/useDepartments';
import { CATS, candidates, deptsForCol, deptMajors } from '../deptLogic';
import DeptDetailModal from '../DeptDetailModal';

// ── helper: mirrors emptyCol(~2751-2753) ──
function EmptyCol({ ico, msg }) {
  return (
    <div className="cas-col-empty">
      <span className="ico" aria-hidden="true">{ico}</span>
      <span>{msg}</span>
    </div>
  );
}

// ── Column 1: 계열 — mirrors renderGye(~2621-2645) ──
function GyeCol({ departments, st, onSelectGye }) {
  const cands = candidates(departments, { q: st.q, bk21: st.bk21 });
  return (
    <div className="cas-col-body" id="casColGye" role="listbox" aria-label="계열 목록" tabIndex={0}>
      {CATS.map((c) => {
        const inCat = cands.filter((d) => d.gyeyeol === c.key);
        const n = inCat.length;
        const bk = inCat.filter((d) => d.bk21).length;
        const active = st.gye === c.key && !st.q.trim();
        return (
          <button
            key={c.key}
            type="button"
            className={`cas-item${active ? ' is-active' : ''}`}
            role="option"
            aria-selected={active}
            aria-current={active ? 'true' : undefined}
            data-gye={c.key}
            onClick={() => onSelectGye(c.key)}
          >
            <span
              className="cas-item-ico"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: c.ico }}
            />
            <span className="cas-item-body">
              <span className="cas-item-name">{c.key}</span>
              <span className="cas-item-meta">
                <span>{n}개 학과</span>
                {bk > 0 && <span className="star">★ {bk}</span>}
              </span>
            </span>
            <span className="cas-item-chev" aria-hidden="true">›</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Column 2: 학과 — mirrors renderDept(~2648-2695) ──
function DeptCol({ departments, st, onSelectDept, colRef }) {
  const q = st.q.trim();

  if (!departments.length) {
    return (
      <div className="cas-col-body" id="casColDept" role="listbox" aria-label="학과 목록" tabIndex={0} aria-live="polite" ref={colRef}>
        <EmptyCol ico="🏛️" msg="학과 정보를 불러올 수 없습니다." />
      </div>
    );
  }
  if (!q && !st.gye) {
    return (
      <div className="cas-col-body" id="casColDept" role="listbox" aria-label="학과 목록" tabIndex={0} aria-live="polite" ref={colRef}>
        <EmptyCol ico="←" msg="왼쪽에서 계열을 선택하세요." />
      </div>
    );
  }

  const list = deptsForCol(departments, { gye: st.gye, q: st.q, bk21: st.bk21 })
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));

  if (!list.length) {
    return (
      <div className="cas-col-body" id="casColDept" role="listbox" aria-label="학과 목록" tabIndex={0} aria-live="polite" ref={colRef}>
        <EmptyCol ico="🔍" msg={q ? '검색 결과가 없습니다.' : '이 계열에 표시할 학과가 없습니다.'} />
      </div>
    );
  }

  return (
    <div className="cas-col-body" id="casColDept" role="listbox" aria-label="학과 목록" tabIndex={0} aria-live="polite" ref={colRef}>
      {list.map((d) => {
        const noRec = d.recruit === false;
        const active = String(d.id) === String(st.deptId);
        return (
          <button
            key={d.id}
            type="button"
            className={`cas-item cas-item-dept${active ? ' is-active' : ''}${noRec ? ' no-recruit' : ''}`}
            role="option"
            aria-selected={active}
            aria-current={active ? 'true' : undefined}
            data-id={d.id}
            onClick={() => onSelectDept(d.id)}
          >
            <span className="cas-item-body">
              <span className="cas-item-name cas-item-name--lg">
                {d.bk21 && <span className="star" style={{ color: 'var(--amber)' }}>★ </span>}
                {d.name}
              </span>
              {(q || noRec) && (
                <span className="cas-item-meta">
                  {q && <span>{d.gyeyeol}</span>}
                  {noRec && <span className="norec">미모집</span>}
                </span>
              )}
            </span>
            <span className="cas-item-chev" aria-hidden="true">›</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Column 3: 세부전공 — mirrors renderMajor(~2710-2740) ──
function MajorCol({ departments, st, onSelectMajor, colRef }) {
  const d = st.deptId != null
    ? departments.find((x) => String(x.id) === String(st.deptId))
    : null;

  if (!d) {
    return (
      <div className="cas-col-body" id="casColMajor" role="listbox" aria-label="세부전공 목록" tabIndex={0} aria-live="polite" ref={colRef}>
        <EmptyCol ico="←" msg="학과를 선택하세요." />
      </div>
    );
  }

  const majors = deptMajors(d);
  if (!majors.length) {
    return (
      <div className="cas-col-body" id="casColMajor" role="listbox" aria-label="세부전공 목록" tabIndex={0} aria-live="polite" ref={colRef}>
        <EmptyCol ico="🎓" msg="세부전공 구분이 없는 학과입니다." />
      </div>
    );
  }

  const list = majors.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));

  return (
    <div className="cas-col-body" id="casColMajor" role="listbox" aria-label="세부전공 목록" tabIndex={0} aria-live="polite" ref={colRef}>
      {list.map((m) => {
        const noRec = m.recruit === false;
        const active = st.majorName === m.name;
        return (
          <button
            key={m.name}
            type="button"
            className={`cas-item cas-item-dept cas-info${active ? ' is-active' : ''}${noRec ? ' no-recruit' : ''}`}
            role="option"
            aria-selected={active}
            aria-current={active ? 'true' : undefined}
            data-major={m.name}
            onClick={() => onSelectMajor(m.name, d)}
          >
            <span className="cas-item-body">
              <span className="cas-item-name cas-item-name--lg">{m.name}</span>
              {noRec && (
                <span className="cas-item-meta"><span className="norec">미모집</span></span>
              )}
            </span>
            <span className="cas-item-chev" aria-hidden="true">›</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * DepartmentsView — mirrors #deptViewRoot section + 3-column cascade
 * (renderGye/renderDept/renderMajor, selectGye/selectDept/selectMajor,
 * bindOnce search/bk21, casCount — original ~2464-2966)
 */
export default function DepartmentsView({ onBack, isOpen }) {
  const { departments } = useDepartments();

  // State mirrors original `state` object (2568)
  const [st, setSt] = useState({ gye: null, deptId: null, majorName: null, q: '', bk21: false });

  // Modal state: { dept, major } or null
  const [modal, setModal] = useState(null);

  // Refs for focusFirst (mirror focusFirst ~2763-2767)
  const deptColRef = useRef(null);
  const majorColRef = useRef(null);

  const focusFirst = useCallback((ref) => {
    if (!ref.current) return;
    const first = ref.current.querySelector('.cas-item:not([disabled])');
    if (first) first.focus();
  }, []);

  // selectGye (mirror ~2756-2762)
  const selectGye = useCallback((gye) => {
    setSt((s) => ({ ...s, gye, deptId: null, majorName: null }));
    // focusFirst on deptCol happens via layout effect but we trigger imperatively
    setTimeout(() => focusFirst(deptColRef), 0);
  }, [focusFirst]);

  // selectDept (mirror ~2700-2708)
  const selectDept = useCallback((id) => {
    const d = departments.find((x) => String(x.id) === String(id));
    const hasMajors = deptMajors(d).length > 0;
    setSt((s) => ({ ...s, deptId: id, majorName: null }));
    if (hasMajors) {
      setTimeout(() => focusFirst(majorColRef), 0);
    } else {
      // no majors → open dept modal immediately (mirror 2707)
      setModal({ dept: d, major: null });
    }
  }, [departments, focusFirst]);

  // selectMajor (mirror ~2732-2738)
  const selectMajor = useCallback((majorName, dept) => {
    setSt((s) => ({ ...s, majorName }));
    const m = (dept.majors || []).find((x) => x.name === majorName);
    if (m) setModal({ dept, major: m });
  }, []);

  // Search (mirror bindOnce input 2901-2907)
  const onSearch = useCallback((v) => {
    setSt((s) => ({ ...s, q: v, deptId: null, majorName: null }));
  }, []);

  // BK21 toggle (mirror bindOnce bk21 2910-2920)
  const toggleBk21 = useCallback(() => {
    setSt((s) => {
      const next = !s.bk21;
      let deptId = s.deptId;
      if (next && deptId != null) {
        const d = departments.find((x) => String(x.id) === String(deptId));
        if (d && !d.bk21) deptId = null;
      }
      return { ...s, bk21: next, deptId };
    });
  }, [departments]);

  const closeModal = useCallback(() => setModal(null), []);

  // casCount (mirror ~2949-2953)
  const casCount = departments.length ? `총 ${departments.length}개 학과` : '';

  // Sub counts for column headers
  const deptList = deptsForCol(departments, { gye: st.gye, q: st.q, bk21: st.bk21 });
  const deptCount = deptList.length;

  const activeDept = st.deptId != null
    ? departments.find((x) => String(x.id) === String(st.deptId))
    : null;
  const majorList = activeDept ? deptMajors(activeDept) : [];
  const majorCount = majorList.length;

  return (
    <section
      className={`view${isOpen ? ' is-open' : ''}`}
      id="view-departments"
      aria-label="학과 디렉터리"
    >
      <div className="view-scroll edx">
        <div className="ed-stage">

          <div className="wrap">
            <header className="mast rise d1">
              <div className="mast-top">
                <button type="button" className="brand" onClick={onBack} aria-label="목차로 돌아가기">
                  <div className="mark"><img src="/logos/pnu-symbol-color.jpg" alt="부산대학교" /></div>
                  <div className="bt"><strong>학·석사 연계과정</strong><small>ARISE PNU AI · UGLINK</small></div>
                </button>
                <div className="mast-right">
                  <span className="mast-meta">2026학년도 2학기</span>
                </div>
              </div>
              <div className="crumb">
                <button type="button" className="back view-back" onClick={onBack}>← 목차</button>
                <span className="sep">/</span><span>Section 04</span>
                <span className="sep">/</span><span className="here">학과 디렉터리</span>
                <span className="idx">Departments</span>
              </div>
            </header>
          </div>

          <div className="wrap">
            <h2 className="view-title">어떤 학과가 있는가</h2>
            <p className="view-desc">계열 → 학과 → 세부전공 순으로 탐색해 보세요.</p>

            <div className="view-hero">
              <img src="/media/gen/dept-hero.png" alt="" aria-hidden="true" />
              <div className="view-hero-cap">
                <strong>계열에서 <em>학과</em>로, 학과에서 <em>전공</em>으로.</strong>
                <span>왼쪽 컬럼부터 차례로 눌러 탐색하세요. 학과를 클릭하면 상세 정보가 팝업으로 열립니다.</span>
              </div>
            </div>

            <div id="deptViewRoot">
              {/* 검색 + BK21 토글 (mirror .cas-bar ~2467-2473) */}
              <div className="cas-bar">
                <div className="dept-search-wrap">
                  <input
                    type="text"
                    className="dept-search"
                    id="casSearch"
                    placeholder="학과·전공 키워드 검색 (전체에서)"
                    aria-label="학과 검색"
                    autoComplete="off"
                    value={st.q}
                    onChange={(e) => onSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`dept-chip bk21-toggle${st.bk21 ? ' active' : ''}`}
                  id="casBk21"
                  aria-pressed={st.bk21}
                  onClick={toggleBk21}
                >★ BK21 참여학과</button>
                <div className="cas-count" id="casCount" aria-live="polite">{casCount}</div>
              </div>

              {/* 3컬럼 캐스케이드 (mirror .cas-cols ~2476-2503) */}
              <div className="cas-cols">
                {/* 컬럼1: 계열 */}
                <section className="cas-col" aria-label="계열 선택">
                  <div className="cas-col-head">
                    <span className="cas-col-label">계열</span>
                    <span className="cas-col-sub" id="casColSub1">{CATS.length}개 계열</span>
                  </div>
                  <GyeCol departments={departments} st={st} onSelectGye={selectGye} />
                </section>

                {/* 컬럼2: 학과 */}
                <section className="cas-col" aria-label="학과 선택">
                  <div className="cas-col-head">
                    <span className="cas-col-label">학과</span>
                    <span className="cas-col-sub" id="casColSub2">
                      {(deptCount > 0 && (st.gye || st.q.trim())) ? `${deptCount}개` : ''}
                    </span>
                  </div>
                  <DeptCol
                    departments={departments}
                    st={st}
                    onSelectDept={selectDept}
                    colRef={deptColRef}
                  />
                </section>

                {/* 컬럼3: 세부전공 */}
                <section className="cas-col" aria-label="세부전공 선택">
                  <div className="cas-col-head">
                    <span className="cas-col-label">세부전공</span>
                    <span className="cas-col-sub" id="casColSub3">
                      {majorCount > 0 ? `${majorCount}개` : ''}
                    </span>
                  </div>
                  <MajorCol
                    departments={departments}
                    st={st}
                    onSelectMajor={selectMajor}
                    colRef={majorColRef}
                  />
                </section>
              </div>

              {/* 짧은 미선택 안내 (mirror .cas-hint ~2506-2509) */}
              <p className="cas-hint" id="casHint">
                <span className="ico" aria-hidden="true">🎓</span>{' '}
                학과를 클릭하면 상세 정보가 팝업으로 열립니다. 전공이 여럿인 학과는 세부전공까지 선택하세요.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 학과 상세 팝업 — rendered when modal state is set */}
      {modal && (
        <DeptDetailModal
          dept={modal.dept}
          major={modal.major}
          onClose={closeModal}
        />
      )}
    </section>
  );
}
