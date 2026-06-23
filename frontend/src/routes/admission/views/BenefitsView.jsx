import { Link } from 'react-router-dom';

export default function BenefitsView({ onShowView, onApply, onBack, isOpen }) {
  return (
    <section className={`view${isOpen ? ' is-open' : ''}`} id="view-benefits" aria-label="Benefits & Scholarships">
      <div className="view-scroll edx">
        <div className="ed-stage">

          <div className="wrap">
            <header className="mast rise d1">
              <div className="mast-top">
                <button type="button" className="brand" onClick={onBack} aria-label="목차로 돌아가기">
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
                <span className="sep">/</span><span>Section 03</span>
                <span className="sep">/</span><span className="here">혜택 · 장학</span>
                <span className="idx">Scholarship</span>
              </div>
            </header>
          </div>

          <div className="wrap">
            <div className="phead">
              <div className="kicker rise d1">Section 03 — Benefits &amp; Scholarship</div>
              <h1 className="ptitle rise d2">학비 걱정 없이,<br/><span className="gold">연구에만</span> 집중하도록.</h1>
              <p className="plead rise d3">연계과정 선발자에게는 <strong style={{color:"var(--ink)"}}>등록금 전액 장학</strong>을 비롯해 진흥장려금·BK21 Bridge·연구지원장려금이 <strong style={{color:"var(--ink)"}}>중복 지원</strong>되며, 학점 인정과 졸업요건 면제 등 비금전 혜택도 함께 주어집니다.</p>
            </div>

            {/* 핵심 혜택 빅넘버 리스트 */}
            <section className="block rise d4">
              <div className="bhead"><span className="t">핵심 혜택 — Key Benefits</span><span className="c">04 items</span></div>
              <div className="blist">
                <div className="brow"><span className="bn">100<span style={{fontSize:".5em"}}>%</span></span><span className="bt2"><strong>특정학기 장학금 지급</strong><span>연계과정 장학</span></span><span className="tag">Tuition</span></div>
                <div className="brow"><span className="bn">6<span style={{fontSize:".5em"}}>학점</span></span><span className="bt2"><strong>대학원 학점 인정</strong><span>학사에서 이수한 대학원 전공 6학점을 석·박사 수료학점으로 그대로 인정</span></span><span className="tag">Credit</span></div>
                <div className="brow"><span className="bn" style={{fontFamily:"var(--sans)",fontWeight:800,letterSpacing:"-.02em",fontVariantNumeric:"normal"}}>면제</span><span className="bt2"><strong>졸업요건 면제</strong><span>졸업논문 또는 졸업시험 등 학과(부) 또는 전공별 졸업요건 면제. 단, 학과(부)별 영어 표준외국어능력시험(TOEIC) 졸업요건 및 각종 교육인증제 해당 학생은 인증요건을 충족하여야 함</span></span><span className="tag">Waiver</span></div>
                <div className="brow"><span className="bn">0<span style={{fontSize:".5em"}}>시험</span></span><span className="bt2"><strong>무시험 특별전형</strong><span>별도 대학원 입학시험 없이 진학 (면접시험은 있을 수 있음)</span></span><span className="tag">Direct</span></div>
              </div>
            </section>

            {/* 장학 종류 + 큰 수치 */}
            <section className="block rise d5">
              <div className="bhead"><span className="t">장학 종류 — Scholarships</span><span className="c">04</span></div>

              {/* ①②③④ 장학 4종 — 가로 일렬 */}
              <div className="grid g4">
                <article className="card">
                  <div className="card-head"><span className="no">/ 01</span></div>
                  <h3>연계과정 등록금 전액</h3>
                  <p><strong>학·석사 트랙</strong> — 석사과정(총 3학기) 중 <strong>2·3학기</strong> 등록금 전액 지원.</p>
                  <p style={{marginTop:"8px"}}><strong>학·석박사통합 트랙</strong> — 석사 <strong>2·3학기</strong> + 박사 <strong>5·6학기</strong> 등록금 전액 지원.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ 02</span></div>
                  <h3>SAM분야 진흥장려금</h3>
                  <p><strong>학기당 50만원</strong> 내외 — 기초보호학문(인문·사회·자연) 연계과정 재학생 대상.</p>
                  <p style={{marginTop:"8px"}}>심사학기 <strong>평균평점 3.7 이상</strong> + 학업계획서·전공 실적 제출. 마지막 학기자·초과학기자·졸업(수료)예정자 제외.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ 03</span></div>
                  <h3>BK21 Bridge 장학금</h3>
                  <p>학사과정 <strong>최종학기</strong> 재학생(BK21 참여학과) 대상 — 매월 <strong>70만원 × 최대 3개월</strong>.</p>
                  <p style={{marginTop:"8px"}}>다음 학기 대학원 입학예정자만 신청 가능. 담당 · 대학원혁신실 510-7930.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ 04</span></div>
                  <h3>연구지원장려금</h3>
                  <p>석사·석박통합 연계과정 재학생 대상 — <strong>학기당 50만원</strong> 지급.</p>
                  <p style={{marginTop:"8px"}}>학회참석·자료수집·연구경비 용도. 담당 · 대학원혁신실 510-1901.</p>
                </article>
              </div>
            </section>

            {/* 지급 단서 / 주의 */}
            <section className="block rise d6">
              <div className="bhead"><span className="t">지급 조건 — Conditions</span><span className="c">필독</span></div>
              <div className="grid g2" style={{alignItems:"start"}}>
                <div className="note">
                  <h4>지급 기준</h4>
                  <ul>
                    <li>8학기 이수자(정규졸업 예정자)는 학사 졸업 <strong>전체평점평균 3.8 이상</strong>일 경우에만 지급</li>
                    <li>등록기간에 자비 등록 후 학기 중 개별 계좌로 지급</li>
                  </ul>
                </div>
                <div className="note warn">
                  <h4>지급 제외</h4>
                  <ul>
                    <li><strong>8학기 초과 졸업자는 장학금 지급 대상에서 제외</strong></li>
                    <li><strong>계약학과 선발 학생</strong>은 지급 제외</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 비금전 혜택 */}
            <section className="block rise d7">
              <div className="bhead"><span className="t">비금전 혜택 — Academic Benefits</span><span className="c">04</span></div>
              <div className="grid g4">
                <article className="card">
                  <div className="card-head"><span className="no">/ A</span></div>
                  <h3>졸업논문·시험 면제</h3>
                  <p>학과(부)·전공별 졸업요건 면제. <strong>영어시험·교육인증</strong> 요건은 충족 필요.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ B</span></div>
                  <h3>졸업학점 6학점 감면</h3>
                  <p>학부 졸업에 필요한 <strong>일반선택 6학점</strong>이 감면됩니다.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ C</span></div>
                  <h3>무시험 특별전형</h3>
                  <p>별도의 대학원 입학시험 없이 <strong>무시험</strong>으로 진학.</p>
                </article>
                <article className="card">
                  <div className="card-head"><span className="no">/ D</span></div>
                  <h3>조기 졸업 가능</h3>
                  <p><strong>6학기 졸업</strong> 후 바로 석사과정 진입이 가능합니다.</p>
                </article>
              </div>
            </section>

            {/* next */}
            <section className="block rise d8">
              <div className="bhead"><span className="t">다음 — Next</span><span className="c">03</span></div>
              <nav className="index">
                <button type="button" className="ix main" onClick={() => onShowView('departments')}><span className="ix-no">03</span><span className="ix-body"><strong>학과 디렉터리</strong><span>모집 학과 둘러보고 희망 학과 담기</span></span><span className="ix-tag">Depts</span></button>
                <button type="button" className="ix" onClick={() => onShowView('eligibility')}><span className="ix-no">02</span><span className="ix-body"><strong>자격요건</strong><span>지원 자격과 8학기 졸업 조건 확인</span></span><span className="ix-tag">Eligibility</span></button>
                <button type="button" className="ix" onClick={() => onShowView('why-grad')}><span className="ix-no">01</span><span className="ix-body"><strong>왜 연계과정인가</strong><span>연계과정의 의미와 진로 경로</span></span><span className="ix-tag">Why</span></button>
              </nav>
            </section>
          </div>

          <div className="cta">
            <div className="wrap">
              <h2>내 장학, <em>해당될까?</em> 먼저 확인해 보세요.</h2>
              <p>등록금 100% · 진흥 50만 · BK21 70만×4 · 연구지원 50만</p>
              <div className="row">
                <Link className="apply" to="/scholarship">내 장학 해당 여부 확인 →</Link>
                <button type="button" className="apply ghostbtn" onClick={() => onShowView('eligibility')}>자격요건 다시 보기</button>
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
