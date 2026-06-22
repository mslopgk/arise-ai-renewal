import { useCountdown } from '../../hooks/useCountdown';

export default function IntroView({ onShowView, onApply, onBack }) {
  const { dday, h, m, s, statusLabel } = useCountdown({
    openTime: Date.parse('2026-07-09T09:00:00+09:00'),
    closeTime: Date.parse('2026-07-16T23:59:59+09:00'),
  });

  return (
    <>
      <video className="bg-video" id="introVideo" autoPlay muted loop playsInline preload="auto" aria-hidden="true" src="/media/pnu80-intro.mp4"></video>
      <div className="bg-scrim" aria-hidden="true"></div>
      <div className="ghost" aria-hidden="true">연계</div>

      <div className="wrap">
        <header className="mast rise d1">
          <div className="mast-top">
            <div className="brand">
              <div className="mark"><img src="/logos/pnu-symbol-color.jpg" alt="부산대학교" /></div>
              <div className="bt"><strong>학·석사 연계과정</strong><small>ARISE PNU AI · UGLINK</small></div>
            </div>
            <div className="mast-right">
              <span className="mast-meta">2026학년도 2학기</span>
              <button type="button" className="apply" onClick={onApply}>희망 전공 담기 및 알람신청 <span className="a">→</span></button>
            </div>
          </div>
          <div className="dateline">
            <span className="dl-tag amb dot">Admission Prospectus</span>
            <span className="dl-sep"></span>
            <span className="dl-tag dot">Vol. 2026 · 2학기</span>
            <span className="dl-tag hideS">Pusan National University</span>
            <span className="dl-sep hideS"></span>
            <span className="dl-tag">학·석사 연계과정</span>
            <span className="dl-tag">ARISE · UGLINK</span>
          </div>
        </header>
      </div>

      <div className="wrap wrap-hero">
        <section className="hero">
          <div className="hero-main">
            <div className="kicker rise d2" aria-hidden="true" style={{ visibility: 'hidden' }}>학·석사 연계 특별 트랙</div>
            <h1 className="rise d2">석사·박사를<br /><span className="gold">더 빠르게.</span></h1>
            <p className="lead rise d3">연계과정으로 미래를 앞당기세요.</p>
            <p className="desc rise d3">학부 재학 중 대학원 과목을 미리 이수하고, 석사·박사 학위를 단기간에 취득하는 패스트 트랙입니다.</p>
            <div className="cd rise d4" aria-label="원서접수 카운트다운">
              <span className="dday" id="dday">{dday}</span>
              <span className="info"><b id="cd-title">원서접수 2026.7.9(목)~7.16(목)</b><span id="cd-status">{statusLabel}</span></span>
              <span className="clock"><i>T-</i><span id="cd-h">{h}</span>:<span id="cd-m">{m}</span>:<span id="cd-s">{s}</span></span>
            </div>
          </div>

          <div className="rise d5">
            <div className="toc-head"><span className="t">목차 — Contents</span><span className="c">Select ↓</span></div>
            <nav className="index" aria-label="안내 메뉴">
              <button type="button" className="ix" onClick={() => onShowView('why-grad')}>
                <span className="ix-no">01</span>
                <span className="ix-body"><strong>왜 대학원인가</strong><span>학부의 끝이 아닌 시작 — 네 가지 이유</span></span>
                <span className="ix-tag">Reasons</span>
              </button>
              <button type="button" className="ix" onClick={() => onShowView('eligibility')}>
                <span className="ix-no">02</span>
                <span className="ix-body"><strong>자격요건</strong><span>4~7학기 · 졸업평점 3.0/4.5 이상</span></span>
                <span className="ix-tag">Eligibility</span>
              </button>
              <button type="button" className="ix" onClick={() => onShowView('benefits')}>
                <span className="ix-no">03</span>
                <span className="ix-body"><strong>혜택 · 장학</strong><span>등록금 전액 장학 · 학점 6 인정</span></span>
                <span className="ix-tag">Scholarship</span>
              </button>
              <button type="button" className="ix main" onClick={() => onShowView('departments')}>
                <span className="ix-no">04</span>
                <span className="ix-body"><strong>학과 디렉터리</strong><span>모집 학과·전공 둘러보고 희망 학과 담기</span></span>
                <span className="ix-tag">Depts</span>
              </button>
            </nav>
          </div>
        </section>
      </div>

      <div className="wrap">
        <footer className="foot rise d7">
          <span>학사과(학적) ☎ 510-1212~3</span>
          <span>학생과 ☎ 510-1282</span>
          <span>대학원혁신실 ☎ 510-7930</span>
          <span>© 2026 Pusan National University</span>
        </footer>
      </div>
    </>
  );
}
