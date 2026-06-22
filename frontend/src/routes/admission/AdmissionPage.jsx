import { useEffect, useRef, useState, useCallback } from 'react';
import './admission-v3-dark.css';
import { useHashView } from '../../hooks/useHashView';
import { DepartmentsProvider, useDepartments } from '../../hooks/useDepartments';
import { buildReturnTo } from '../../lib/apply-survey.js';
import IntroView from './IntroView';
import WhyGradView from './views/WhyGradView';
import { EligibilityView } from './views/EligibilityView';
import BenefitsView from './views/BenefitsView';
import DepartmentsView from './views/DepartmentsView';
import ApplyModal from './ApplyModal';

const VIEW_KEYS = ['why-grad', 'eligibility', 'benefits', 'departments'];

// Google 폼 URL (원본 3514)
const FEEDBACK_FORM_URL = 'https://forms.gle/CNRTG8U52ZDzmi5u8';

function AdmissionPageInner() {
  const { view, showView, showIntro } = useHashView(VIEW_KEYS);
  const { departments } = useDepartments();

  // ApplyModal open state (Task 9)
  const [applyOpen, setApplyOpen] = useState(false);

  // Global toast state (원본 showToast ~3029-3033)
  const toastTimerRef = useRef(null);
  const toastRef = useRef(null);
  const showToast = useCallback((msg, duration = 3000) => {
    const el = toastRef.current;
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      el.classList.remove('show');
    }, duration);
  }, []);

  // Expose window.showToast for legacy compatibility (원본 3308)
  useEffect(() => {
    window.showToast = showToast;
    return () => { delete window.showToast; };
  }, [showToast]);

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
  useEffect(() => {
    if (view === null) return;
    const el = document.getElementById('view-' + view);
    if (!el) return;
    const sc = el.querySelector('.view-scroll');
    if (sc) sc.scrollTop = 0;
    el.querySelectorAll('.qitem.open .qpane').forEach((p) => {
      p.style.maxHeight = p.scrollHeight + 'px';
    });
  }, [view]);

  // openApply OAuth gate (원본 3171-3179)
  const openApply = useCallback(async () => {
    try {
      const meRes = await fetch('/auth/me', { credentials: 'include' });
      if (meRes.status === 401) {
        // openApply uses buildReturnTo (includes hash) — NOT pathname+'?modal=apply'
        window.location.href = '/auth/google?returnTo=' + encodeURIComponent(buildReturnTo(window.location));
        return;
      }
      if (!meRes.ok) { showToast('⚠ 사용자 정보를 불러올 수 없습니다.'); return; }
      const myRes = await fetch('/api/surveys/1/my-response', { credentials: 'include' });
      if (myRes && myRes.status === 200) { showToast('이미 희망 제출을 완료하셨습니다.'); return; }
      setApplyOpen(true);
    } catch (_) {
      showToast('⚠ 네트워크 오류. 잠시 후 다시 시도해주세요.');
    }
  }, [showToast]);

  // ?modal=apply on mount → auto-open modal (원본 3395 OAuth 복귀 처리)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('modal') === 'apply') {
      const t = setTimeout(openApply, 200);
      return () => clearTimeout(t);
    }
  // intentional mount-only: auto-open once on OAuth return; openApply is stable but re-runs not desired
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feedback FAB click handler (원본 3518-3524)
  const handleFbFabClick = useCallback((e) => {
    if (/^https?:\/\//.test(FEEDBACK_FORM_URL)) {
      // valid URL — let href work (handled by <a href>)
    } else {
      e.preventDefault();
      alert('의견·질문 창구를 준비 중입니다. 곧 열립니다 🙏');
    }
  }, []);

  return (
    <>
      {/* Intro — always mounted; hidden via display:none when a view is open */}
      <main id="intro" style={{ display: view === null ? '' : 'none' }}>
        <IntroView onShowView={showView} onApply={openApply} onBack={showIntro} />
      </main>

      {/* Views — always mounted; active view gets is-open class */}
      <WhyGradView
        isOpen={view === 'why-grad'}
        onShowView={showView}
        onApply={openApply}
        onBack={showIntro}
      />
      <EligibilityView
        isOpen={view === 'eligibility'}
        onShowView={showView}
        onApply={openApply}
        onBack={showIntro}
      />
      <BenefitsView
        isOpen={view === 'benefits'}
        onShowView={showView}
        onApply={openApply}
        onBack={showIntro}
      />

      <DepartmentsView
        isOpen={view === 'departments'}
        onBack={showIntro}
      />

      {/* ApplyModal — always mounted, open prop controls CSS class */}
      <ApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        departments={departments}
        onSubmitted={() => setApplyOpen(false)}
        showToast={showToast}
      />

      {/* Global toast (원본 3019) */}
      <div className="toast" id="toast" ref={toastRef}></div>

      {/* 수정신청 FAB (원본 3450-3456) */}
      <a className="dr-fab" href="/dept-edit-request" aria-label="학과 정보 수정 신청 페이지로 이동">
        <svg className="dr-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span>학과 정보 수정 신청</span>
      </a>

      {/* 피드백 FAB (원본 3503-3510) */}
      <a
        className="fb-fab"
        id="fbFab"
        href={/^https?:\/\//.test(FEEDBACK_FORM_URL) ? FEEDBACK_FORM_URL : '#'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="의견 또는 질문 남기기 (새 창에서 열림)"
        onClick={/^https?:\/\//.test(FEEDBACK_FORM_URL) ? undefined : handleFbFabClick}
      >
        <span className="fb-dot" aria-hidden="true"></span>
        <svg className="fb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
        <span>의견·질문</span>
      </a>
    </>
  );
}

export default function AdmissionPage() {
  return (
    <DepartmentsProvider>
      <AdmissionPageInner />
    </DepartmentsProvider>
  );
}
