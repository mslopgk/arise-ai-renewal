// 학과 캐스케이드 순수 로직 (상태·DOM 조작 제외)

// 6개 계열 메타 (아이콘 + 표시순서)
export const CATS = [
  { key:'인문·사회', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>' },
  { key:'자연과학', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.58 16.5h12.85"/></svg>' },
  { key:'공학',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  { key:'예술',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>' },
  { key:'체육',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>' },
  { key:'의학',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>' }
];

// 선택필드 SAMPLE (학과명 → 예시값)
export const SAMPLE = {
  '고분자공학과': {
    hashtags:['#반도체소재','#배터리','#친환경고분자','#나노복합재','#BK21'],
    homepage:'https://polymer.pusan.ac.kr',
    intro:'고분자의 합성·구조·물성을 바탕으로 반도체·이차전지·친환경 소재 등 첨단 산업의 핵심 소재를 연구·개발하는 학과입니다.',
    capacity:'석사 12명',
    image:'',
    bk21_name:'친환경 스마트 고분자소재 교육연구단'
  },
  '국어국문학과': {
    hashtags:['#한국어학','#고전문학','#현대문학','#한국어교육'],
    homepage:'https://korlang.pusan.ac.kr',
    intro:'한국어와 한국문학을 언어학·고전·현대문학의 관점에서 깊이 있게 탐구하고, 한국어교육 전문가를 양성합니다.',
    capacity:'석사 8명',
    image:''
  },
  '기계공학부': {
    hashtags:['#로보틱스','#열유체','#정밀가공','#모빌리티','#BK21'],
    homepage:'https://me.pusan.ac.kr',
    intro:'설계·생산·동역학·열유체 등 기계공학 전 분야를 아우르며 로봇·모빌리티·에너지 산업을 선도하는 인재를 길러냅니다.',
    capacity:'석사 24명',
    image:'',
    bk21_name:'미래 모빌리티 융합기계 교육연구단'
  }
};

// URL 정규화 (스킴 없으면 https 보강)
export function normUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

// 선택필드 병합: 실제 데이터 우선, 없으면 SAMPLE
export function enrich(d) {
  const s = SAMPLE[d.name] || {};
  return {
    hashtags: (d.hashtags && d.hashtags.length) ? d.hashtags : s.hashtags,
    homepage: d.homepage || s.homepage,
    intro:    d.intro || s.intro,
    capacity: (d.capacity != null && d.capacity !== '') ? d.capacity : s.capacity,
    image:    d.image || s.image,
    bk21_name: d.bk21_name || s.bk21_name || d.bk21_desc,
    isSample: !!SAMPLE[d.name] && !(d.hashtags || d.homepage || d.intro || d.capacity || d.image)
  };
}

// 검색 매칭 (이름 + 전공명 + 실제 표시 해시태그)
export function matchesQ(d, q) {
  const qTrim = (q || '').trim().toLowerCase();
  if (!qTrim) return true;

  let hay = (d.name + ' ' + (d.majors || []).map(m => m.name).join(' ')).toLowerCase();
  const tags = enrich(d).hashtags;
  if (tags && tags.length) hay += ' ' + tags.join(' ').toLowerCase();

  return hay.indexOf(qTrim) !== -1;
}

// BK21 + 검색만 적용한 후보 (계열 무시)
export function candidates(list, { q, bk21 }) {
  return list.filter(d => {
    if (bk21 && !d.bk21) return false;
    if (!matchesQ(d, q)) return false;
    return true;
  });
}

// 컬럼2에 표시할 학과 목록
// - 검색어가 있으면: 계열 무시하고 매칭 학과 전체
// - 없으면: 활성 계열의 학과 (+ BK21 토글)
export function deptsForCol(list, { gye, q, bk21 }) {
  const qTrim = (q || '').trim();
  const base = candidates(list, { q, bk21 });

  if (qTrim) return base;        // 검색 모드: 전 계열에서
  if (!gye) return [];            // 계열 미선택

  return base.filter(d => d.gyeyeol === gye);
}

// 세부전공 (학과에 전공 2개+ 일 때만)
export function deptMajors(d) {
  return (d && d.majors && d.majors.length >= 2) ? d.majors : [];
}
