// frontend/src/routes/EligibilityCheck.jsx
// Task 2.2 — eligibility.html DOM 1:1 미러 + 스코프 CSS
// DOM 원본: eligibility.html lines 86-208
// 로직: frontend/src/lib/eligibility.js (Task 2.1)
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { COLLEGES, evaluateEligibility, bandExact, bandNearest } from '../lib/eligibility.js';
import './EligibilityCheck.css';

// verdict 표시 맵 (원본 396-400)
const VERDICT_MAP = {
  pass: {
    tag: 'Eligible',
    title: '신청 가능',
    msg: '입력하신 값 기준으로 개정 지원 자격을 모두 충족합니다(추천 절차 제외). 최종 확인 후 희망 제출을 진행하세요.'
  },
  maybe: {
    tag: 'Maybe later',
    title: '추후 신청 가능성 있음',
    msg: '현재 일부 기준에 미달하나 재학 중 보완하거나 졸업 시점 조정으로 지원 가능합니다. 전공설계 상담을 권장합니다.'
  },
  fail: {
    tag: 'Not eligible',
    title: '신청 불가',
    msg: '졸업 시점 기준으로 지원 자격(평점·수료학점)을 충족하기 어렵습니다. 전공설계 상담으로 경로를 확인하세요.'
  }
};

export default function EligibilityCheck() {
  // ── 소속 / band ──
  const [collegeIndex, setCollegeIndex] = useState('');   // string index into COLLEGES
  const [branchIndex, setBranchIndex]   = useState('');   // string index into branches
  const [resolvedG, setResolvedG]       = useState(null); // number | null
  const [bandPillText, setBandPillText] = useState('');
  const [bandPillShow, setBandPillShow] = useState(false);

  // ── manual mode ──
  const [manualMode, setManualMode]     = useState(false);
  const [gradManual, setGradManual]     = useState('');

  // ── 입력 ──
  const [sem, setSem]           = useState('');
  const [gradSemRaw, setGradSemRaw] = useState('');
  const [gpa, setGpa]           = useState('');
  const [earned, setEarned]     = useState('');

  // ── 결과 ──
  const [formErr, setFormErr]   = useState('');
  const [result, setResult]     = useState(null); // null | { tier, checks, basis, scholNote }

  const resultRef = useRef(null);

  // ── tier 변경 시 스크롤 (원본 426) ──
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // ── 소속 선택 핸들러 (원본 291-302) ──
  function handleCollegeChange(e) {
    const i = e.target.value;
    setCollegeIndex(i);
    setBranchIndex('');
    clearBand();
    if (i === '') return;
    const co = COLLEGES[+i];
    if (!co.branches) {
      showBand(co.g, co.c);
    }
    // branches 있으면 branch 선택 대기 → bandPill은 clearBand 상태 유지
  }

  // ── 세부 소속 선택 핸들러 (원본 303-308) ──
  function handleBranchChange(e) {
    const j = e.target.value;
    setBranchIndex(j);
    if (collegeIndex === '' || j === '') { clearBand(); return; }
    const br = COLLEGES[+collegeIndex].branches[+j];
    showBand(br.g, COLLEGES[+collegeIndex].c + ' · ' + br.l);
  }

  function showBand(g, src) {
    setResolvedG(g);
    const b = bandExact(g) || bandNearest(g);
    setBandPillText('→ 졸업(수료) ' + b.g + '학점 기준 적용' + (src ? (' · ' + src) : ''));
    setBandPillShow(true);
  }

  function clearBand() {
    setResolvedG(null);
    setBandPillShow(false);
    setBandPillText('');
  }

  // ── manual 토글 (원본 311-316) ──
  function handleManualToggle() {
    setManualMode(true);
    clearBand();
  }

  function handleManualBack() {
    setManualMode(false);
    setGradManual('');
    clearBand();
  }

  // ── 확인 버튼 (원본 324-390) ──
  function handleCheck() {
    setFormErr('');

    const res = evaluateEligibility({
      manualMode,
      gradManual: gradManual === '' ? NaN : parseFloat(gradManual),
      resolvedG,
      collegeIndex: collegeIndex === '' ? -1 : +collegeIndex,
      branchIndex:  branchIndex  === '' ? -1 : +branchIndex,
      sem:          sem          === '' ? NaN : parseInt(sem, 10),
      gradSemRaw,
      gpa:          gpa          === '' ? NaN : parseFloat(gpa),
      earned:       earned       === '' ? NaN : parseFloat(earned),
    });

    if (!res.ok) {
      setFormErr(res.error);
      return;
    }

    setResult(res);
  }

  // ── 현재 단과대학의 branches (branch select 표시 여부) ──
  const currentCollege   = collegeIndex !== '' ? COLLEGES[+collegeIndex] : null;
  const hasBranches      = currentCollege && currentCollege.branches;

  return (
    <div className="elig-root">
      <div className="wrap">
        <header>
          <img src="/logos/pnu-signature.jpg" alt="부산대학교" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="brand">
            <div className="kicker">PNU · 학·석사 연계과정</div>
            <div className="org">나의 지원 자격 확인 · 학칙 제69조 기반</div>
          </div>
        </header>

        <h1>나의 지원 자격 확인하기</h1>
        <p className="lead">학·석사 연계과정 지원 가능 여부를 미리 확인해 보세요. 모든 계산은 이 브라우저 안에서만 이루어지며, 입력값은 서버로 전송·저장되지 않습니다.</p>
        <span className="privacy">🔒 개인정보 미수집 · 브라우저 내 계산</span>

        {/* 입력 */}
        <div className="card" id="formCard">
          <h2><span className="step-no">✓</span> 요건 입력</h2>
          <p className="sub">아래 항목을 입력하면 개정 규정 기준으로 즉시 판정합니다. 학번·이름은 받지 않습니다.</p>

          {/* ① 학부 소속 */}
          <div className={`field${manualMode ? ' hidden' : ''}`} id="collegeField">
            <label htmlFor="college">① 현재 <b>학부(학사) 소속</b><span className="req">*</span></label>
            <select id="college" value={collegeIndex} onChange={handleCollegeChange}>
              <option value="">단과대학 선택</option>
              {COLLEGES.map((co, i) => (
                <option key={i} value={String(i)}>{co.c}</option>
              ))}
            </select>
            <select
              id="branch"
              className={hasBranches ? '' : 'hidden'}
              style={{ marginTop: '10px' }}
              value={branchIndex}
              onChange={handleBranchChange}
            >
              <option value="">세부 소속 선택</option>
              {hasBranches && currentCollege.branches.map((br, j) => (
                <option key={j} value={String(j)}>{br.l}</option>
              ))}
            </select>
            <div className={`band-pill${bandPillShow ? ' show' : ''}`} id="bandPill">{bandPillText}</div>
            <button type="button" className="linkish" id="manualToggle" onClick={handleManualToggle}>목록에 없거나 졸업학점을 직접 알고 있어요 →</button>
            <div className="hint">졸업(수료) 학점은 <b>학과(부)별로 정해져</b> 있어, 소속만 고르면 자동 계산됩니다. <u>지망하는 대학원 학과가 아니라 지금 다니는 학부 소속</u>을 고르세요.</div>
          </div>

          {/* fallback: 졸업학점 직접 입력 */}
          <div className={`field${manualMode ? '' : ' hidden'}`} id="manualBox">
            <label htmlFor="gradManual"><b>지금 다니는 학부</b>의 졸업(수료) 요구학점 직접 입력</label>
            <input
              type="number"
              id="gradManual"
              min="0"
              step="1"
              placeholder="예: 130"
              value={gradManual}
              onChange={(e) => setGradManual(e.target.value)}
            />
            <button type="button" className="linkish" id="manualBack" onClick={handleManualBack}>← 소속 선택으로 돌아가기</button>
            <div className="hint">목록에 학과가 없을 때만 사용하세요. <u>지망 대학원이 아니라 현재 학부</u>의 졸업학점입니다. 가장 가까운 기준표 band로 환산합니다(정확도 ↓).</div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="sem">② 현재 이수 학기<span className="req">*</span></label>
              <select id="sem" value={sem} onChange={(e) => setSem(e.target.value)}>
                <option value="">선택</option>
                <option value="4">4학기 (2학년 2학기)</option>
                <option value="5">5학기 (3학년 1학기)</option>
                <option value="6">6학기 (3학년 2학기)</option>
                <option value="7">7학기 (4학년 1학기)</option>
                <option value="8">8학기 (4학년 2학기)</option>
                <option value="9">9학기 이상</option>
              </select>
              <div className="hint">지원은 <b>4~7학기</b> 재학생만 가능합니다.</div>
            </div>
            <div className="field">
              <label htmlFor="gradSem">③ 졸업(연계 입학) 예정 시점<span className="req">*</span></label>
              <select id="gradSem" value={gradSemRaw} onChange={(e) => setGradSemRaw(e.target.value)}>
                <option value="">선택</option>
                <option value="6">6학기 (조기졸업)</option>
                <option value="7">7학기</option>
                <option value="8">8학기 (정규)</option>
                <option value="over8">8학기 초과</option>
              </select>
              <div className="hint">졸업 시점에 따라 성적기준이 다릅니다.</div>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="gpa">④ 전체 평점평균<span className="req">*</span></label>
              <input
                type="number"
                id="gpa"
                min="0"
                max="4.5"
                step="0.01"
                placeholder="예: 3.42"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
              />
              <div className="hint">4.5 만점. <a href="https://pusan.korus.ac.kr/poc/mi/IndxCtr/indx.do" target="_blank" rel="noopener">학생지원시스템(KORUS)</a>에서 확인.</div>
            </div>
            <div className="field">
              <label htmlFor="earned">⑤ 누적 취득학점<span className="req">*</span></label>
              <input
                type="number"
                id="earned"
                min="0"
                step="1"
                placeholder="예: 95"
                value={earned}
                onChange={(e) => setEarned(e.target.value)}
              />
              <div className="hint">지금까지 실제 취득한 총 학점(당해 학기 계절수업 제외).</div>
            </div>
          </div>

          <button className="btn" id="checkBtn" onClick={handleCheck}>내 자격 확인하기</button>
          <div className="err" id="formErr" style={formErr ? { display: 'block' } : {}}>{formErr}</div>
        </div>

        {/* 결과 */}
        <div id="result" ref={resultRef} style={result ? { display: 'block', marginTop: '24px' } : { display: 'none' }}>
          {result && (
            <>
              <div className={`verdict ${result.tier}`} id="verdict">
                <div className="vtag" id="verdictTag">{VERDICT_MAP[result.tier].tag}</div>
                <div className="vtitle" id="verdictTitle">{VERDICT_MAP[result.tier].title}</div>
                <div className="vmsg" id="verdictMsg">{VERDICT_MAP[result.tier].msg}</div>
              </div>
              <div className="card">
                <h2>항목별 확인</h2>
                <p className="sub" id="resultBasis">기준(학부 소속): {result.basis}</p>
                <ul className="checklist" id="checklist">
                  {result.checks.map((c, idx) => {
                    const icon   = c.state === 'ok' ? '✓' : (c.state === 'warn' ? '!' : '✕');
                    const rcls   = c.state === 'no' ? 'no' : 'warn';
                    return (
                      <li key={idx} className="check">
                        <span className={`ico ${c.state}`}>{icon}</span>
                        <div>
                          <div className="ctitle">{c.title}</div>
                          <div className="cdetail">
                            <span dangerouslySetInnerHTML={{ __html: c.detail }} />
                            {c.state !== 'ok' && (
                              <div
                                className={`reason ${rcls}`}
                                dangerouslySetInnerHTML={{ __html: (c.state === 'no' ? '⚠ ' : '• ') + c.reason }}
                              />
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {result.scholNote && (
                  <div id="scholNote" dangerouslySetInnerHTML={{ __html: result.scholNote }} />
                )}
                <div className="reco-note">참고 · <b>지원 자격 3번</b>(소속 학과(부)장 또는 지도교수 추천)은 자가진단으로 확인할 수 없습니다. 위 항목을 충족하더라도 <b>추천 절차는 별도로 진행</b>해야 최종 지원이 가능합니다.</div>
              </div>
              {/* 상담 (추후/불가 시) */}
              <div className={`consult${result.tier === 'pass' ? ' hidden' : ''}`} id="consultBox">
                <div className="consult-txt">
                  <strong>전공설계 상담 받기</strong>
                  <p>학생지원시스템(KORUS)에서 전공설계 상담을 신청하고, 소속 학과(부)장·지도교수와 상담하세요. 상담을 통해 지원 가능성을 높일 수 있습니다.</p>
                  <a className="consult-btn" href="https://pusan.korus.ac.kr/poc/mi/IndxCtr/indx.do" target="_blank" rel="noopener">전공설계 상담 바로가기 →</a>
                  <div className="consult-tel">대학원혁신실 ☎ 051-510-7930 · 학사과 510-1212~3</div>
                </div>
                <div className="consult-qr">
                  <img src="/media/qr-korus.png" alt="학생지원시스템(KORUS) QR" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span>학생지원시스템<br />모바일 스캔</span>
                </div>
              </div>
              {/* 다음 단계 (가능 시) */}
              <div className={`next${result.tier !== 'pass' ? ' hidden' : ''}`} id="nextBox">
                <Link to="/admission">→ 연계과정 안내 · 희망 제출하러 가기</Link>
              </div>
            </>
          )}
        </div>

        {/* 안내 */}
        <div className="notice">
          <b>안내</b> · 본 결과는 <b>참고용 자가 진단</b>입니다(2026 개정 규정 반영). 졸업(수료) 요구학점은 학칙 제69조 학년별 수료학점표에 근거하며, 학과 개편·입학연도에 따라 다를 수 있습니다. 최종 지원 자격은 반드시 소속 학과 및 대학원혁신실에 확인하세요.
        </div>

        <footer>
          <Link to="/scholarship">장학금 해당 여부 확인하기</Link> ·
          {' '}<Link to="/admission">← 연계과정 안내로 돌아가기</Link>
        </footer>
      </div>
    </div>
  );
}
