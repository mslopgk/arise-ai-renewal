/**
 * targets.mjs — 패리티 검증 대상·셀렉터·시나리오 정의
 *
 * TARGETS: 4종 (arise / eligibility / scholarship / admission)
 * resolveTargets(keys): 빈 배열/null/undefined → 전체 반환, 알 수 없는 key → throw
 */

export const TARGETS = [
  {
    key: 'arise',
    livePath: '/arise.html',
    localPath: '/arise.html',
    textSelectors: ['title', 'h1', 'h2', '.lead'],
    domCountSelectors: ['.card', 'section', 'nav'],
    scenarios: [
      {
        type: 'redirect-301',
        description: 'prod / → arise.html 301 리다이렉트 확인',
      },
    ],
  },
  {
    key: 'eligibility',
    livePath: '/eligibility.html',
    localPath: '/eligibility.html',
    textSelectors: ['title', 'h1', '.lead', '#result', '#resultBasis'],
    domCountSelectors: ['select', 'input', '.card'],
    scenarios: [
      {
        type: 'select-band',
        description: '계열/단과대학 선택 → 밴드 pill 렌더',
      },
      {
        type: 'manual-input-toggle',
        description: '수동입력 토글 전환',
      },
      {
        type: 'same-input-result',
        description: '동일 입력 → tier·#resultBasis 동일 판정',
        selectors: ['#result', '#resultBasis'],
      },
      {
        type: 'form-error',
        description: '미입력 폼 에러 표시',
      },
    ],
  },
  {
    key: 'scholarship',
    livePath: '/scholarship.html',
    localPath: '/scholarship.html',
    textSelectors: ['title', 'h1', '.lead', '#result'],
    domCountSelectors: ['select', 'input', '.card', '.seg'],
    scenarios: [
      {
        type: 'segment-toggle',
        description: '세그먼트 토글 분기',
      },
      {
        type: 'same-input-result',
        description: '동일 입력 → 연계·SAM·BK21·연구지원 판정 동일',
        selectors: ['#result'],
      },
      {
        type: 'form-error',
        description: '미입력 폼 에러 표시',
      },
    ],
  },
  {
    key: 'admission',
    livePath: '/admission-v3-dark.html',
    localPath: '/admission-v3-dark.html',
    textSelectors: ['title', '#cd-title', '#cd-status', 'h1', 'h2', 'h3'],
    domCountSelectors: ['[data-view]', '.dept-card', '.ix', '.dbadge'],
    scenarios: [
      {
        type: 'data-view-switch',
        description: 'data-view 타일 전환 + location.hash 동기화',
      },
      {
        type: 'hashchange-direct',
        description: 'hashchange 직접 진입',
      },
      {
        type: 'countdown-freeze',
        description: '카운트다운 시간 동결 비교 (#cd-status · #dday)',
        selectors: ['#cd-status', '#dday'],
      },
      {
        type: 'directory',
        description: '/api/departments → 계열 → 학과 → 세부전공 필터',
      },
      {
        type: 'bk21-toggle',
        description: 'BK21 토글',
      },
      {
        type: 'modal',
        description: '신청 모달 미인증 → /auth/google?returnTo=…&modal=apply 리다이렉트 / 학과·세부전공 담기·제거',
      },
    ],
  },
];

export function resolveTargets(filterKeys, all = TARGETS) {
  if (!filterKeys || filterKeys.length === 0) return all;
  return filterKeys.map((k) => {
    const t = all.find((x) => x.key === k);
    if (!t) throw new Error(`unknown target: ${k} (valid: ${all.map((x) => x.key).join(',')})`);
    return t;
  });
}
