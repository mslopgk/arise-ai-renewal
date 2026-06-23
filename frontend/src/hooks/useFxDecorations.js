import { useEffect } from 'react';

/**
 * FX 시각 장식 훅 — 원본 admission-v3-dark.html:3357-3392 IIFE 1:1 이식.
 *
 * 마운트 후 1회 실행:
 *  - 흐르는 그라데이션 타이틀(.fx-grad) / 큰 숫자 시머(.fx-shimmer) 클래스 부착
 *  - 카드류에 마우스 스포트라이트(.fx-spot) 삽입 + pointermove 추종
 *  - 뷰 배경 유성 레이어(.fx-meteors/.fx-meteor) 삽입
 *  - deptViewRoot 동적 렌더 카드 재장식(MutationObserver)
 *
 * 쿼리 스코프는 원본과 1:1로 document. admission은 SPA에서 단독 마운트되는
 * 라우트라 새 래퍼 div 없이 document 전역쿼리가 원본과 동일 결과.
 *
 * 원본의 멱등 가드(:scope > .fx-spot, :scope > .fx-meteors)는 그대로 유지하여
 * StrictMode dev 이중 호출에도 노드가 중복되지 않는다. 원본엔 없던 cleanup을
 * 추가해 React 언마운트 시 옵저버 disconnect / 추가 노드·리스너·클래스를 정리한다
 * (언마운트 시점이라 시각영향 0).
 */
export function useFxDecorations() {
  useEffect(() => {
    // 원본 3238: prefers-reduced-motion 1회 계산
    const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // cleanup 추적용: 부착한 클래스/노드/리스너를 모아둔다
    const gradEls = [];
    const shimmerEls = [];
    const spotHandlers = []; // { card, handler }
    const addedNodes = [];   // 삽입한 .fx-spot/.fx-meteors 노드
    let observer = null;

    // 흐르는 그라데이션 타이틀
    document.querySelectorAll('.view-title, .intro-slogan .em, .final-cta h2 em').forEach(function (el) {
      el.classList.add('fx-grad');
      gradEls.push(el);
    });
    // 큰 숫자 시머
    document.querySelectorAll('.stat-number, .scho-hero-amount-num').forEach(function (el) {
      el.classList.add('fx-shimmer');
      shimmerEls.push(el);
    });
    // 마우스 스포트라이트
    var SEL = '.dept-card, .scho-card, .scho-hero, .elig-card, .prog-card, .sched-card, .contact-card, .why-tile, .tile, .scho-extra';
    function attachSpot(card) {
      if (card.querySelector(':scope > .fx-spot')) return;
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      var s = document.createElement('span'); s.className = 'fx-spot'; card.appendChild(s);
      addedNodes.push(s);
      var handler = function (e) {
        var r = card.getBoundingClientRect();
        s.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        s.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      };
      card.addEventListener('pointermove', handler);
      spotHandlers.push({ card: card, handler: handler });
    }
    function decorate(root) { (root || document).querySelectorAll(SEL).forEach(attachSpot); }
    decorate(document);
    // 뷰 배경 유성(meteor) — 숨겨진 뷰는 CSS 애니메이션 일시정지라 비용 없음
    function addMeteors(host, n) {
      if (prefersReduced || host.querySelector(':scope > .fx-meteors')) return;
      var layer = document.createElement('div'); layer.className = 'fx-meteors'; layer.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < n; i++) {
        var m = document.createElement('span'); m.className = 'fx-meteor';
        m.style.left = (4 + Math.random() * 92) + '%';
        m.style.animationDuration = (3.6 + Math.random() * 4.2) + 's';
        m.style.animationDelay = (Math.random() * 9) + 's';
        layer.appendChild(m);
      }
      host.insertBefore(layer, host.firstChild);
      addedNodes.push(layer);
    }
    document.querySelectorAll('.view').forEach(function (v) { if (v.querySelector(':scope > .view-scroll.edx')) return; addMeteors(v, 12); });
    // 동적 렌더되는 학과 카드 재장식
    var dvr = document.getElementById('deptViewRoot');
    if (dvr && 'MutationObserver' in window) {
      observer = new MutationObserver(function () { decorate(dvr); });
      observer.observe(dvr, { childList: true, subtree: true });
    }

    // React 언마운트 정리 (원본엔 없음; 누수 방지)
    return function cleanup() {
      if (observer) observer.disconnect();
      spotHandlers.forEach(function (h) { h.card.removeEventListener('pointermove', h.handler); });
      addedNodes.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
      gradEls.forEach(function (el) { el.classList.remove('fx-grad'); });
      shimmerEls.forEach(function (el) { el.classList.remove('fx-shimmer'); });
    };
  }, []);
}
