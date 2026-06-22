import { useEffect, useRef } from 'react';
import './admission-v3-dark.css';
import { useHashView } from '../../hooks/useHashView';
import IntroView from './IntroView';
import WhyGradView from './views/WhyGradView';
import { EligibilityView } from './views/EligibilityView';
import BenefitsView from './views/BenefitsView';

const VIEW_KEYS = ['why-grad', 'eligibility', 'benefits', 'departments'];

export default function AdmissionPage() {
  const { view, showView, showIntro } = useHashView(VIEW_KEYS);

  // Ref to the intro video element rendered by IntroView
  const videoRef = useRef(null);

  // Play/pause intro video based on whether a view is open (mirror original setIntroVideo)
  useEffect(() => {
    // IntroView renders <video id="introVideo"> — locate it via DOM
    const video = document.getElementById('introVideo');
    if (!video) return;
    if (view === null) {
      // intro is showing: play video
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      // a view is open: pause video
      try { video.pause(); } catch (e) {}
    }
  }, [view]);

  // Mirror original showView: reset scroll + recalculate open accordion heights
  // when a view becomes active (is-open). (playViewMotion equivalent is handled
  // by CSS transitions triggered by the is-open class; the mo/mo-on animation
  // classes from the original are not ported here — view entry motion is CSS-driven.)
  useEffect(() => {
    if (view === null) return;
    const el = document.getElementById('view-' + view);
    if (!el) return;
    const sc = el.querySelector('.view-scroll');
    if (sc) sc.scrollTop = 0;
    // Recalculate open accordion pane heights (mirrors original line 3260)
    el.querySelectorAll('.qitem.open .qpane').forEach((p) => {
      p.style.maxHeight = p.scrollHeight + 'px';
    });
  }, [view]);

  const onApply = () => {}; // Task 9 will wire real OAuth openApply

  return (
    <>
      {/* Intro — always mounted; hidden via display:none when a view is open (mirrors original intro.style.display toggle) */}
      <main id="intro" style={{ display: view === null ? '' : 'none' }}>
        <IntroView onShowView={showView} onApply={onApply} onBack={showIntro} />
      </main>

      {/* Views — always mounted; active view gets is-open class (mirrors .view.is-open toggle) */}
      <WhyGradView
        isOpen={view === 'why-grad'}
        onShowView={showView}
        onApply={onApply}
        onBack={showIntro}
      />
      <EligibilityView
        isOpen={view === 'eligibility'}
        onShowView={showView}
        onApply={onApply}
        onBack={showIntro}
      />
      <BenefitsView
        isOpen={view === 'benefits'}
        onShowView={showView}
        onApply={onApply}
        onBack={showIntro}
      />

      {/* departments — placeholder for Task 8 */}
      <section
        className={`view${view === 'departments' ? ' is-open' : ''}`}
        id="view-departments"
        aria-label="Departments"
      />
    </>
  );
}
