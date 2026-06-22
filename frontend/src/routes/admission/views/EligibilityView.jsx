export function EligibilityView({ onShowView, onApply, onBack, isOpen }) {
  return (
    <section className={`view${isOpen ? ' is-open' : ''}`} id="view-eligibility" aria-label="Eligibility">
      <div className="view-scroll edx">
        <div className="ed-stage">

          <div className="wrap">
            <header className="mast rise d1">
              <div className="mast-top">
                <button type="button" className="brand" onClick={onBack}>
                  <div className="mark"><img src="/logos/pnu-symbol-color.jpg" alt="부산대학교"/></div>
                  <div className="bt"><strong>학·석사 연계과정</strong><small>ARISE PNU AI · UGLINK</small></div>
                </button>
                <div className="mast-right">
                  <span className="mast-meta">2026학년도 2학기</span>
                  <button type="button" className="apply" onClick={onApply}>희망 전공 담기 및 알람신청 <span className="a">→</span></button>
                </div>
              </div>
              <div className="crumb">
                <button type="button" className="back view-back" onClick={onBack}>← 목차</button>
                <span className="sep">/</span><span>Section 02</span>
                <span className="sep">/</span><span className="here">자격요건</span>
                <span className="idx">Eligibility</span>
              </div>
            </header>
          </div>

          <div className="wrap">
            <div className="phead">
              <div className="kicker rise d1">Section 02 — Eligibility</div>
              <h1 className="ptitle rise d2">지원 자격,<br/><span className="gold">핵심만</span> 짚었습니다.</h1>
            </div>

            {/* 자가진단 진입점 (필수 보존) */}
            <section className="block rise d3">
              <div className="note">
                <h4>자격 자가진단</h4>
                이수 학기·평점·학점 기준을 입력하면 지원 가능 여부를 1분 만에 확인할 수 있습니다.
                <div style={{ marginTop: '16px' }}>
                  <a className="apply" href="/eligibility.html">내 지원 자격 확인하기 →</a>
                </div>
              </div>
            </section>

            {/* 핵심 수치 */}
            <section className="block rise d4">
              <div className="bhead"><span className="t">핵심 수치 — At a Glance</span><span className="c">Requirements</span></div>
              <div className="grid g4">
                <div className="stat"><div className="k">이수학기</div><div className="n">4-7<span className="u">학기</span></div><div className="lbl">최소 이수학기</div><div className="sub">추후 상한학기 폐지 검토 중</div></div>
                <div className="stat"><div className="k">총 평점평균</div><div className="n">3.0<span className="u">/4.5</span></div><div className="lbl">최소 평점 기준</div><div className="sub">백분율 환산 약 66.7%</div></div>
                <div className="stat"><div className="k">학점 감면</div><div className="n">감면</div><div className="lbl">일반 선택 학점 감면</div><div className="sub">대학원 과목 선이수</div></div>
                <div className="stat"><div className="k">전형</div><div className="n">0<span className="u">시험</span></div><div className="lbl">무시험 특별전형</div><div className="sub">별도 입학시험 없음 (면접절차 있을 수 있음)</div></div>
              </div>
            </section>

            {/* 이수학기 트랙 */}
            <section className="block rise d5">
              <div className="bhead"><span className="t">이수학기 범위</span><span className="c">4~7학기 지원 가능</span></div>
              <div className="card" style={{ padding: '28px' }}>
                <div className="track">
                  <div className="cell">1</div><div className="cell">2</div><div className="cell">3</div>
                  <div className="cell on">4</div><div className="cell on">5</div><div className="cell on">6</div><div className="cell on">7</div><div className="cell">8+</div>
                </div>
                <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>■ 1–3학기 <span style={{ color: 'var(--ink-4)' }}>지원 불가</span> &nbsp;·&nbsp; <span style={{ color: 'var(--amber)' }}>■ 4-7학기 신청가능 (추후 상한학기 폐지 검토 중)</span></p>
              </div>
            </section>

            {/* 성적 게이지 */}
            <section className="block rise d6">
              <div className="bhead"><span className="t">총 평점평균 기준</span><span className="c">3.0 / 4.5</span></div>
              <div className="card" style={{ padding: '28px' }}>
                <div className="gauge"><div className="fill" style={{ width: '66.7%' }}><span>3.0 / 4.5</span></div><span className="max">4.5</span></div>
                <p style={{ marginTop: '14px', fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: '1.6' }}>총 평점평균 <strong style={{ color: 'var(--amber)' }}>3.0/4.5 이상</strong>(백분율 약 66.7%)을 충족해야 합니다. 4.5 만점 기준, 전 학기 누적 성적으로 산정합니다.</p>
              </div>
            </section>

            {/* 졸업 성적기준 (학기별) */}
            <section className="block rise d6">
              <div className="bhead"><span className="t">졸업 성적기준 — Graduation GPA</span><span className="c">학기별</span></div>
              <dl className="spec">
                <div className="spec-row"><dt>6학기 졸업</dt><dd>전 학기 누적 <strong>졸업평점 4.0 이상</strong></dd><div className="val">4.0↑</div></div>
                <div className="spec-row"><dt>7학기 졸업</dt><dd>전 학기 누적 <strong>졸업평점 3.5 이상</strong></dd><div className="val">3.5↑</div></div>
                <div className="spec-row"><dt>8학기 이상 졸업</dt><dd>전 학기 누적 <strong>졸업평점 3.25 이상</strong> (추후 규정 개정 예정 — 3.25→3.0 완화 예정)</dd><div className="val">3.25↑</div></div>
              </dl>
            </section>

            {/* 상세 사양 */}
            <section className="block rise d7">
              <div className="bhead"><span className="t">자격 상세 — Details</span><span className="c">05 items</span></div>
              <dl className="spec">
                <div className="spec-row"><dt>이수학기</dt><dd><strong>4-7학기</strong> 이수자 (추후 상한학기 폐지 예정 · 재학 중 신청 · 당해 학기 계절수업 반영 불가)</dd><div className="val">4-7학기</div></div>
                <div className="spec-row"><dt>이수학점</dt><dd>학기별 수료학점 충족 — 1학기 = 수료학점의 1/2, 2학기 = 학년 수료학점 (<strong>학칙 제69조</strong>)</dd><div className="val">제69조</div></div>
                <div className="spec-row"><dt>총 평점평균</dt><dd>전 학기 누적 <strong>총 평점평균 3.0/4.5 이상</strong></dd><div className="val">3.0/4.5</div></div>
                <div className="spec-row"><dt>추천</dt><dd>소속대학 <strong>학과(부)장 또는 지도교수의 추천</strong></dd><div className="val">추천</div></div>
                <div className="spec-row"><dt>입학전형</dt><dd><strong>무시험 특별전형</strong> — 별도 대학원 입학시험 없이 진학</dd><div className="val">무시험</div></div>
              </dl>
            </section>

            {/* 수료학점 안내 */}
            <section className="block rise d7">
              <div className="note">
                <h4>수료학점 인정</h4>
                학사과정에서 선이수한 <strong>대학원 전공 과목 6학점</strong>은 석사 또는 박사과정 수료학점으로 그대로 인정됩니다. 학년별 수료학점 및 학기별 이수 기준은 <strong>학칙 제69조</strong> 및 소속 단과대학·학과 사무실에서 확인하세요.
              </div>
            </section>

            {/* next */}
            <section className="block rise d7">
              <div className="bhead"><span className="t">다음 — Next</span><span className="c">01 · 03 · 04</span></div>
              <nav className="index">
                <button type="button" className="ix" onClick={() => onShowView('why-grad')}><span className="ix-no">01</span><span className="ix-body"><strong>왜 대학원인가</strong><span>연계과정의 진로·연구 트랙</span></span><span className="ix-tag">Why Grad</span></button>
                <button type="button" className="ix" onClick={() => onShowView('benefits')}><span className="ix-no">03</span><span className="ix-body"><strong>혜택 · 장학</strong><span>등록금 전액 장학 · 학점 6 인정</span></span><span className="ix-tag">Scholarship</span></button>
                <button type="button" className="ix main" onClick={() => onShowView('departments')}><span className="ix-no">04</span><span className="ix-body"><strong>학과 디렉터리</strong><span>모집 학과 둘러보고 희망 학과 담기</span></span><span className="ix-tag">Depts</span></button>
              </nav>
            </section>
          </div>

          <div className="cta">
            <div className="wrap">
              <h2>자격이 된다면, <em>학과부터</em> 살펴보세요.</h2>
              <p>2026.7.9~7.16 원서접수 · 무시험 특별전형</p>
              <div className="row">
                <button type="button" className="apply" onClick={() => onShowView('departments')}>학과 디렉터리 <span className="a">→</span></button>
                <a className="apply ghostbtn" href="/eligibility.html">내 지원 자격 확인하기</a>
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
