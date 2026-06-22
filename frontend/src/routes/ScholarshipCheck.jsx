// frontend/src/routes/ScholarshipCheck.jsx
// Task 2.4 — scholarship.html DOM 1:1 미러 + 스코프 CSS
// DOM 원본: scholarship.html lines 66-162
// 로직: frontend/src/lib/scholarship.js (Task 2.3)
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { COLLEGES, TIER_BADGE, evaluateScholarship } from '../lib/scholarship.js';
import './ScholarshipCheck.css';

export default function ScholarshipCheck() {
  // ── 입력 상태 ──
  const [track, setTrack]         = useState(null);   // 'ms' | 'msp' | null
  const [collegeIndex, setCollegeIndex] = useState('');
  const [gradSemRaw, setGradSemRaw]     = useState('');
  const [gpa, setGpa]             = useState('');
  const [lastSem, setLastSem]     = useState('');
  const [nextGrad, setNextGrad]   = useState('');
  const [contract, setContract]   = useState('');

  // ── 결과 상태 ──
  const [formErr, setFormErr]   = useState('');
  const [result, setResult]     = useState(null); // null | { items, summaryText }

  const resultRef = useRef(null);

  // 결과 표시 시 scrollIntoView (원본 292)
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // 트랙 세그먼트 클릭 핸들러 (원본 195-199)
  function handleTrackClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    setTrack(b.getAttribute('data-track'));
  }

  // 확인 버튼 (원본 242-269)
  function evaluateScholarshipHandler() {
    setFormErr('');

    const gpaNum = gpa === '' ? NaN : parseFloat(gpa);

    const res = evaluateScholarship({
      track,
      collegeIndex: collegeIndex === '' ? '' : collegeIndex,
      gradSemRaw,
      gpa: gpaNum,
      lastSem,
      nextGrad,
      contract,
    });

    if (!res.ok) {
      setFormErr(res.error);
      return;
    }

    setResult(res);
  }

  return (
    <div className="schol-root">
      <div className="wrap">
        {/* header (원본 68-74) */}
        <header>
          <img src="/logos/pnu-signature.jpg" alt="부산대학교" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="brand">
            <div className="kicker">PNU · 학·석사 연계과정</div>
            <div className="org">장학금 해당 여부 확인 · 학부생 예상 안내</div>
          </div>
        </header>

        {/* h1/lead/privacy (원본 76-78) */}
        <h1>장학금 해당 여부 확인하기</h1>
        <p className="lead">연계과정에 <b>선발·진학하면 받게 될 장학금</b>을 미리 확인해 보세요. 학부생 입력값 기준의 <b>예상 안내</b>이며, 모든 계산은 이 브라우저 안에서만 이루어집니다(입력값 미저장).</p>
        <span className="privacy">🔒 개인정보 미수집 · 브라우저 내 계산</span>

        {/* 입력 (원본 81-139) */}
        <div className="card" id="formCard">
          <h2><span className="step-no">✓</span> 요건 입력</h2>
          <p className="sub">연계과정 진학을 가정한 예상 판정입니다.</p>

          {/* ① 트랙 세그먼트 (원본 85-91) */}
          <div className="field">
            <label>① 희망 트랙<span className="req">*</span></label>
            <div className="seg" id="trackSeg" onClick={handleTrackClick}>
              <button type="button" data-track="ms" aria-pressed={track === 'ms' ? 'true' : 'false'}>학·석사 연계 (석사)</button>
              <button type="button" data-track="msp" aria-pressed={track === 'msp' ? 'true' : 'false'}>학·석박사 통합</button>
            </div>
          </div>

          {/* ② 단과대학 선택 (원본 93-97) */}
          <div className="field">
            <label htmlFor="college">② 현재 <b>학부(학사) 소속</b> 단과대학<span className="req">*</span></label>
            <select id="college" value={collegeIndex} onChange={(e) => setCollegeIndex(e.target.value)}>
              <option value="">단과대학 선택</option>
              {COLLEGES.map((co, i) => (
                <option key={i} value={String(i)}>{co.c + ' (' + co.gye + ')'}</option>
              ))}
            </select>
            <div className="hint">계열(SAM 진흥장려금)·BK21 참여 여부 판정에 사용합니다. <u>지망 대학원이 아니라 현재 학부</u> 소속.</div>
          </div>

          {/* ③ 졸업 예정 시점 / ④ 학사 평점평균 (원본 99-116) */}
          <div className="row">
            <div className="field">
              <label htmlFor="gradSem">③ 졸업 예정 시점<span className="req">*</span></label>
              <select id="gradSem" value={gradSemRaw} onChange={(e) => setGradSemRaw(e.target.value)}>
                <option value="">선택</option>
                <option value="6">6학기 (조기졸업)</option>
                <option value="7">7학기</option>
                <option value="8">8학기 (정규)</option>
                <option value="over8">8학기 초과</option>
              </select>
              <div className="hint">8학기 초과 졸업자는 등록금 장학 제외.</div>
            </div>
            <div className="field">
              <label htmlFor="gpa">④ 학사 평점평균<span className="req">*</span></label>
              <input type="number" id="gpa" min="0" max="4.5" step="0.01" placeholder="예: 3.82"
                value={gpa} onChange={(e) => setGpa(e.target.value)} />
              <div className="hint">4.5 만점. 정규 8학기 졸업자 등록금 장학은 졸업평점 3.8↑ 필요.</div>
            </div>
          </div>

          {/* ⑤ 최종학기 / ⑥ 다음 학기 입학예정 (원본 118-129) */}
          <div className="row">
            <div className="field">
              <label htmlFor="lastSem">⑤ 학사 최종학기 재학 중?<span className="req">*</span></label>
              <select id="lastSem" value={lastSem} onChange={(e) => setLastSem(e.target.value)}>
                <option value="">선택</option>
                <option value="y">예 (마지막 학기)</option>
                <option value="n">아니오</option>
              </select>
              <div className="hint">BK21 Bridge 장학(최종학기 대상) 판정용.</div>
            </div>
            <div className="field">
              <label htmlFor="nextGrad">⑥ 다음 학기 대학원 입학 예정?<span className="req">*</span></label>
              <select id="nextGrad" value={nextGrad} onChange={(e) => setNextGrad(e.target.value)}>
                <option value="">선택</option>
                <option value="y">예</option>
                <option value="n">아니오</option>
              </select>
              <div className="hint">BK21 Bridge 장학 신청 조건.</div>
            </div>
          </div>

          {/* ⑦ 계약학과 (원본 131-135) */}
          <div className="field">
            <label htmlFor="contract">⑦ 계약학과 선발 학생?<span className="req">*</span></label>
            <select id="contract" value={contract} onChange={(e) => setContract(e.target.value)}>
              <option value="">선택</option>
              <option value="n">아니오</option>
              <option value="y">예 (계약학과)</option>
            </select>
            <div className="hint">계약학과(대학원) 선발 학생은 등록금 장학 지급 제외. <b>계약학과 예</b>: Techno-MBA·디지털MBA·경영컨설팅·글로벌경제컨설팅·디지털융합전략·공공감사·부동산학전공, 스마트가전공학과·발전공학과·원자력공학·에너지융합발전연소·기계부품시스템·ICT융합·나노반도체 공정장비·푸드테크·산업데이터사이언스융합·AI융합교육, 전기전자/응용화학공학부/나노융합기술/인지메카트로닉스(석) 등.</div>
          </div>

          {/* 확인 버튼 (원본 137-138) */}
          <button className="btn" id="checkBtn" onClick={evaluateScholarshipHandler}>내 장학 해당 여부 확인</button>
          <div className="err" id="formErr" style={formErr ? { display: 'block' } : {}}>{formErr}</div>
        </div>

        {/* 결과 (원본 142-156) */}
        <div id="result" ref={resultRef} style={result ? { display: 'block', marginTop: '24px' } : { display: 'none' }}>
          {result && (
            <>
              <div className="rsum" id="rsum">
                <div className="t">Scholarship Estimate</div>
                <div className="n" id="rsumN">{result.summaryText.n}</div>
                <div className="d" id="rsumD">{result.summaryText.d}</div>
              </div>
              <div className="scards" id="scards">
                {result.items.map((it, idx) => {
                  const r = it.r;
                  return (
                    <div key={idx} className={'scard ' + r.tier}>
                      <div className="scard-top">
                        <div>
                          <h3>{it.name}</h3>
                          <div className="amt">{r.amt}</div>
                        </div>
                        <span className={'badge ' + r.tier}>{TIER_BADGE[r.tier]}</span>
                      </div>
                      <div className="reason" dangerouslySetInnerHTML={{ __html: r.reason }} />
                      {r.flag && <span className="verify-chip">⚑ 보호학문 세부 학과 확인</span>}
                      <div className="meta">{r.meta}</div>
                    </div>
                  );
                })}
              </div>

              <div className="contact" id="contactBox">
                <b>문의</b> · 학생과 ☎ 051-510-1282 · 대학원혁신실 510-7930 · 연구지원장려금 510-1901
              </div>
              <div className="notice">
                <b>안내</b> · 장학 금액·조건(등록금 전액 / SAM 50만·심사 3.7↑ / BK21 70만×3개월 / 연구지원 50만 / 8학기 정규 3.8↑ / 계약학과 제외)은 <b>공식 연계과정 안내 기준</b>입니다. SAM 진흥장려금 대상은 <b>기초보호학문(인문·사회·자연) 계열</b>이며(공식 확인), 보호학문 <u>세부 학과 범위</u>는 소속 학과·대학원혁신실에 최종 확인하세요. 계약학과(등록금 장학 제외) 목록은 해시태그 자료 기준으로 반영했습니다. BK21 참여학과는 BK사업단 자료(2026) 반영(학부↔대학원 매칭 확인 권장). 본 결과는 참고용 예상 안내입니다.
              </div>
            </>
          )}
        </div>

        {/* footer (원본 158-161) — /eligibility.html → <Link to="/eligibility"> */}
        <footer>
          <Link to="/eligibility">지원 자격 확인하기</Link> ·
          <a href="/admission-v3-dark.html">← 연계과정 안내로</a>
        </footer>
      </div>
    </div>
  );
}
