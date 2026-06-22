import { useState, useEffect, useRef } from 'react';

const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

// 순수 계산: 원본 admission-v3-dark.html:1794-1814 tick() 그대로
export function computeCountdown(now, openTime, closeTime) {
  let target, label;
  if (now < openTime) { target = openTime; label = '접수 시작까지'; }
  else if (now <= closeTime) { target = closeTime; label = '접수 중 · 마감까지'; }
  else { target = null; label = '접수 마감'; }

  if (target === null) {
    return { dday: '마감', h: '00', m: '00', s: '00', statusLabel: 'Status · ' + label };
  }
  const t = Math.max(0, target - now);
  const dday = 'D-' + Math.floor(t / 86400000);
  const totalH = Math.floor(t / 3600000);
  if (totalH >= 100) {
    return { dday, h: '99', m: '99', s: '99', statusLabel: 'Status · ' + label };
  }
  return {
    dday,
    h: pad(totalH),
    m: pad(Math.floor(t / 60000) % 60),
    s: pad(Math.floor(t / 1000) % 60),
    statusLabel: 'Status · ' + label,
  };
}

export function useCountdown({ openTime, closeTime }) {
  const [state, setState] = useState(() => computeCountdown(Date.now(), openTime, closeTime));
  const ref = useRef({ openTime, closeTime });
  ref.current = { openTime, closeTime };
  useEffect(() => {
    const tick = () => setState(computeCountdown(Date.now(), ref.current.openTime, ref.current.closeTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return state;
}
