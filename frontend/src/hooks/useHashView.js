import { useState, useEffect, useCallback, useRef } from 'react';

export function viewFromHash(viewKeys) {
  const h = window.location.hash.replace(/^#/, '');
  return viewKeys.indexOf(h) >= 0 ? h : null; // null = intro
}

export function useHashView(viewKeys) {
  const keysRef = useRef(viewKeys); keysRef.current = viewKeys;
  const [view, setView] = useState(() => viewFromHash(viewKeys));

  useEffect(() => {
    const onHash = () => setView(viewFromHash(keysRef.current));
    window.addEventListener('hashchange', onHash);
    onHash(); // 마운트 시 초기 라우팅(원본 routeFromHash)
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const showView = useCallback((key) => {
    if (keysRef.current.indexOf(key) < 0) { // 원본:3250 무효 키 → intro
      if (window.location.hash) history.replaceState(null, '', location.pathname + location.search);
      setView(null); return;
    }
    if (location.hash.slice(1) !== key) location.hash = key; // 원본:3262
    setView(key);
  }, []);

  const showIntro = useCallback(() => {
    if (window.location.hash) history.replaceState(null, '', location.pathname + location.search); // 원본:3276
    setView(null);
  }, []);

  return { view, showView, showIntro };
}
