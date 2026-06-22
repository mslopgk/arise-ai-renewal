import { useState, useRef, useEffect } from 'react';

function QItem({ qKey, initialOpen, children }) {
  const [open, setOpen] = useState(initialOpen);
  const paneRef = useRef(null);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (open) {
      pane.style.maxHeight = pane.scrollHeight + 'px';
    } else {
      pane.style.maxHeight = '0px';
    }
  }, [open]);

  // On mount, set initial maxHeight after paint so scrollHeight is available
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (open) {
      pane.style.maxHeight = pane.scrollHeight + 'px';
    } else {
      pane.style.maxHeight = '0px';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`qitem${open ? ' open' : ''}`} data-q={qKey}>
      <button
        className="qbar"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
      >
        {children[0]}
      </button>
      <div className="qpane" ref={paneRef}>
        {children[1]}
      </div>
    </div>
  );
}

export default function WhyGradView({ onShowView, onApply, onBack, isOpen }) {
  return (
    <section className={`view${isOpen ? ' is-open' : ''}`} id="view-why-grad" aria-label="Why Graduate School">
      <div className="view-scroll edx">
        <div className="ed-stage">

          <div className="wrap">
            <header className="mast rise d1">
              <div className="mast-top">
                <button type="button" className="brand" onClick={onBack}>
                  <div className="mark"><img src="/logos/pnu-symbol-color.jpg" alt="부산대학교" /></div>
                  <div className="bt"><strong>학·석사 연계과정</strong><small>ARISE PNU AI · UGLINK</small></div>
                </button>
                <div className="mast-right">
                  <span className="mast-meta">2026학년도 2학기</span>
                  <button type="button" className="apply" onClick={onApply}>희망 전공 담기 및 알람신청 <span className="a">→</span></button>
                </div>
              </div>
              <div className="crumb">
                <button type="button" className="back view-back" onClick={onBack}>← 목차</button>
                <span className="sep">/</span><span>Section 01</span>
                <span className="sep">/</span><span className="here">왜 대학원인가</span>
                <span className="idx">Reasons</span>
              </div>
            </header>
          </div>

          <div className="wrap">
            <div className="acchead">
              <div className="kicker rise d1">두 가지 질문 — Two Questions</div>
              <h1 className="ptitle rise d2" style={{ fontSize: 'clamp(34px,4.6vw,60px)' }}>질문을 열어,<br /><span className="gold">답을 펼치세요.</span></h1>
              <p className="plead rise d3">두 질문은 다른 이야기를 합니다. 각 질문을 클릭하면 그 자리에서 답이 펼쳐집니다 — 원하면 둘 다 함께 열어 비교하세요.</p>
            </div>

            <div className="acc rise d4">
              {/* Q1 */}
              <QItem qKey="grad" initialOpen={true}>
                <>
                  <span className="bigno">01</span>
                  <span className="qmid"><span className="qt">왜 대학원인가?</span><span className="qd">대학원 진학, 그 자체의 이유 — 전문성 · 연구 · 진로 · AI 시대</span></span>
                  <span className="toggle">+</span>
                </>
                <div className="qpane-in">
                  <p className="lede">도구가 답을 대신 찾아 주는 시대일수록, <b>좋은 질문을 설계하는 힘</b>이 사람의 몫으로 남습니다. 대학원은 답을 외우는 곳이 아니라, 그 질문을 만드는 훈련을 하는 곳입니다.</p>
                  <div className="grid g4">
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>01</div><h3>전문성 심화</h3><p>학부 전공을 <strong>그대로 이어 심화</strong>. 한 분야를 깊이 파고드는 전문가의 시야.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v6l3.5 9.5A2 2 0 0 1 15.6 20H8.4a2 2 0 0 1-1.9-2.5L10 8V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>02</div><h3>연구 역량 · 실적</h3><p>문제정의·실험·논증 훈련으로 <strong>연구하는 사고법</strong>과 논문·프로젝트 실적.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>03</div><h3>진로 경쟁력</h3><p>석사 학위·연구 경험은 <strong>대체되지 않는 차별점</strong>. 더 넓은 선택지.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>04</div><h3>AI 시대 대응</h3><p>답을 찾는 시대일수록 <strong>좋은 질문을 설계하는 힘</strong>이 결정적.</p></article>
                  </div>
                </div>
              </QItem>

              {/* Q2 */}
              <QItem qKey="link" initialOpen={true}>
                <>
                  <span className="bigno">02</span>
                  <span className="qmid"><span className="qt">왜 연계과정인가?</span><span className="qd">왜 하필 이 길인가 — 기간 단축 · 장학 혜택 · 학점 인정 · 무시험</span></span>
                  <span className="toggle">+</span>
                </>
                <div className="qpane-in">
                  <p className="lede">같은 학위라도 <b>더 빠르게, 더 가볍게, 더 유리하게</b> 도달할 수 있습니다. 연계과정은 학부 4학년이라는 가장 이른 시점에 대학원을 시작하는 특별 트랙입니다.</p>
                  <div className="grid g4">
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>01</div><h3>학위 기간 단축</h3><p>대학원 과목을 미리 이수해 일반 경로 대비 <strong>약 1년</strong> 단축.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2c0-1.2 1.1-1.9 2.5-1.9s2.5.8 2.5 2-1 1.7-2.5 1.7-2.5.6-2.5 1.8 1.1 2 2.5 2 2.5-.8 2.5-1.9"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>02</div><h3>장학금 혜택</h3><p>연계과정 장학금, SAM 분야 장학금, BK21 Bridge 장학금, 연구지원장려금 등.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M9 9h6M9 13h4"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>03</div><h3>6학점 인정</h3><p>학부 졸업 이수학점 중 <strong>일반선택 6학점</strong> 감면.</p></article>
                    <article className="card"><div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div className="no" style={{ marginBottom: '6px' }}>04</div><h3>무시험 특별전형</h3><p>입학시험 없음. 학부 <strong>졸업논문·시험 면제</strong> (면접시험은 있을 수 있음).</p></article>
                  </div>
                </div>
              </QItem>
            </div>
          </div>

          <div className="cta">
            <div className="wrap">
              <h2>준비됐다면, <em>가장 빠른 시점</em>에 시작하세요.</h2>
              <p>학부 4학년 · 연계 진입 · 2026.7.9~7.16 원서접수</p>
              <div className="row">
                <button type="button" className="apply" onClick={onApply}>희망 전공 담기 및 알람신청 <span className="a">→</span></button>
                <button type="button" className="apply ghostbtn" onClick={() => onShowView('departments')}>대학원 학과 보기</button>
              </div>
            </div>
          </div>

          <div className="wrap">
            <footer className="foot">
              <span>학사과(학적) ☎ 510-1212~3</span><span>학생과 ☎ 510-1282</span><span>대학원혁신실 ☎ 510-7930</span><span>© 2026 Pusan National University</span>
            </footer>
          </div>

        </div>
      </div>
    </section>
  );
}
