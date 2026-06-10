/**
 * Canonical ARISE PNU content — single source of truth for both final variants.
 * Primary source: PRD.md + pnu_ai_사이트분석/ (the latest authoritative proposal corpus),
 * reconciled with the A.U.R.A. masterplan page. The earlier arise_about figures that are
 * NOT in this corpus (QS rank, RoboCup, paper counts) are dropped in favor of PRD content.
 *
 * POLICY: NO person names anywhere (messages attributed by title only). Official
 * institution/product names (산지니 AI, 장영실 AI융합연구원, PNU-AXIS) are kept.
 * Existing export NAMES/SHAPES are preserved so the variants keep compiling; new
 * PRD content is added as new exports.
 */

export const overview = {
  slogan: "Arise PNU, 같이 더 높게",
  sloganKo: "같이 더 높게",
  brand: "ARISE PNU AI",
  arise: "AI Research & Innovation Synergy Ecosystem",
  badge: "부산대학교 AI 거점대학 사업",
  org: "부산대학교 AI 거점대학육성사업단",
  orgEn: "ARISE PNU",
  role: "동남권 AI 교육·연구의 구심점",
  vision: "AI 시대의 중심축, PNU Core AXIS",
  axisLine: "대학원 육성(WHY) → 구심점 확립(HOW)",
  lead:
    "부산대학교는 대학원 육성으로 한국 고등교육의 구조적 공백을 메우고, 조직·거버넌스·인프라로 동남권 AI 교육·연구의 구심점을 확립합니다.",
  // Attributed by title only — no person name (per policy).
  message: {
    title: "부산대학교",
    quote:
      "대학원 육성(WHY)에서 동남권 AI 구심점 확립(HOW)으로 — 국내 최초의 대학 AX 표준모델을 제시합니다.",
  },
};

/** Two-axis narrative (the spine of the proposal): WHY → HOW. */
export const twoAxis = [
  {
    id: "grad",
    numeral: "Ⅰ",
    title: "대학원 육성",
    en: "Graduate Expansion",
    role: "WHY",
    desc: "왜 지금 대학원인가 — 한국 고등교육의 구조적 공백을 부산대가 메운다.",
  },
  {
    id: "hub",
    numeral: "Ⅱ",
    title: "구심점 확립",
    en: "Establishing the AI Hub",
    role: "HOW",
    desc: "어떻게 구심점이 되는가 — 조직·거버넌스·인프라로 동남권 AI 허브를 짓는다.",
  },
];

/** Identity framing (4 axes) — kept for the variants' Identity section. */
export const identity = [
  { key: "SELECTED", title: "AI 거점대학 사업", body: "부산대학교 AI 교육·연구 구심점 확립" },
  { key: "REGION", title: "동남권 AX 중심축", body: "지역 산업 AI 융합 솔루션 공급" },
  { key: "MILESTONE", title: "AI대학 2027 출범", body: "학부 424명 · ADP+X 모델" },
  { key: "RANK", title: "거점국립대 1위", body: "대학원생 규모 · BK21 기반 BK5 도전" },
];

/** Headline KPIs (PRD §P1 대표 KPI). */
export const metrics = [
  { value: 1000, unit: "억 원", label: "AX 사업 투자 규모", note: "PNU AX 추진" },
  { value: 4000, unit: "명", label: "AI+X 증강인재 양성", note: "A.U.R.A 목표" },
  { value: 18, unit: "개 전공", label: "AX 융합전공", note: "9개 분야" },
  { value: 424, unit: "명", label: "AI대학 학부 정원", note: "2027년 3월 출범" },
];

/** A.U.R.A AX goal (formerly target2030; shape {headline, body} kept). */
export const target2030 = {
  headline: "AX 목표 — 국내 최초 대학 AX 표준모델 제시",
  body: "AI 인증 확보 · 글로벌 연구 네트워크 10개 · AI+X 증강인재 4,000명 · 행정 만족도 70→80→90",
};

/** 교육부 AI 거점대학 사업 3대 과업 (출처: index.html). 본 사업은 과업Ⅰ에 집중. */
export const govTasks = {
  title: "교육부 3대 과업",
  subtitle: "AI 거점대학 사업",
  items: [
    {
      no: "Ⅰ",
      title: "대학 AI 교육·연구의 구심점 확립 및 기반 확충",
      focus: true,
    },
    { no: "Ⅱ", title: "AI 전문·융합교육과정 설계 및 운영", focus: false },
    { no: "Ⅲ", title: "지역 AX 교육·연구 생태계 조성", focus: false },
  ],
};

/** 누적 국책사업 재원 (real national-grant portfolio; the liked allocation viz). */
export const fundingTotal = { amount: 3111, unit: "억 원", count: 8 };
export const funding = [
  { name: "글로컬대학30", amount: 1500, pct: 48.2 },
  { name: "RISE 지역혁신", amount: 956, pct: 30.7 },
  { name: "반도체 특성화대학", amount: 328, pct: 10.5 },
  { name: "SW중심대학 2단계", amount: 142, pct: 4.6 },
  { name: "AI 첨단산업 부트캠프", amount: 75, pct: 2.4 },
  { name: "AI 융합대학원 2기", amount: 63, pct: 2.0 },
  { name: "양자과학기술 원천연구", amount: 47, pct: 1.5 },
];
export const fundingSource = "출처: 부산대 기획처 (누적 국책사업)";

/* ───────────────────────── 대학원 육성 (WHY) ───────────────────────── */

export const gradReality = {
  title: "한국 고등교육의 역설",
  lead: "양은 세계 최고, 깊이는 OECD 최저 — 동남권은 그 격차의 최전선입니다.",
  stats: [
    { value: "70.6%", label: "고등교육 취학률", note: "세계 최고 수준" },
    { value: "3.1%", label: "석사학위 비율", note: "OECD 최저" },
    { value: "−22.4%", label: "동남권 학부 감소폭", note: "2016–2025" },
    { value: "4.37 : 7.79", label: "인구 1,000명당 대학원생", note: "동남권 vs 수도권" },
  ],
  // 3 진단 토픽 (원천 §1.1 / §1.2 / §1.3)
  topics: [
    {
      no: "1.1",
      title: "학부 중심의 대중 교육",
      points: [
        "세계 최고 수준의 고등교육 취학률 70.6%",
        "그러나 OECD 국가 중 석사학위 비율 최저 3.1%",
        "‘양은 최고, 깊이는 최저’ — 석사가 유럽·미국·일본에선 기본, 한국에선 선택",
      ],
    },
    {
      no: "1.2",
      title: "AI와 노동시장 전환",
      points: [
        "AI 주도 채용 변화로 산업 연계 대학원 교육 수요 증가",
        "기업은 즉시 투입 가능한 문제해결형 인재 선호",
        "대학원 패러다임 전환: ‘연구자 양성’ → ‘산업 문제해결 경험’",
        "청년 체감 실업률 20% · 졸업 유예율 증가",
      ],
    },
    {
      no: "1.3",
      title: "지역 고등교육 격차",
      points: [
        "동남권 학부 감소폭 최대 −22.4% (2016–2025)",
        "대학원 재적: 동남권 −2.8% vs 전국 평균 +5.7%",
        "인구 1,000명당 대학원생: 동남권 4.37명 vs 수도권 7.79명",
      ],
    },
  ],
  // OECD 석사 비율 비교
  oecd: [
    { label: "한국", value: 3.1, self: true },
    { label: "OECD 평균", value: 16.7 },
    { label: "EU 평균", value: 20.8 },
  ],
  source: "OECD Education at a Glance 2025",
};

/** 섹션 2 — 부산대 vs 경쟁대학 (타대 비교). */
export const gradCompare = {
  title: "부산대 vs 경쟁대학",
  lead: "지역 거점국립대 1위, 그러나 전국 톱티어와의 격차는 벌어지고 있다.",
  regional: {
    title: "지역 거점국립대 1위",
    points: [
      "대학원생 5,525명 (2025) — 거점국립대 중 1위",
      "2위 경북대(4,224명)를 1,301명 차이로 앞섬",
      "BK21 4단계 사업 전국 2위 (서울대 다음)",
      "외국인 대학원생 비율 7.67% — 거점대학 중 최저 (개선 과제)",
    ],
  },
  national: {
    title: "전국 주요대학 비교 (10년 추이)",
    points: [
      "부산대 −10.7% (6,191 → 5,525명)",
      "KAIST +25.2% 성장 (6,701 → 8,388명) — 부산대 추월",
      "연세대와 격차 2배 확대 (2,012 → 4,088명)",
      "성균관대 우위 역전: +363 → −2,208명 열세 전환",
    ],
  },
  // 차트형 표시용 (대학원생 규모 + 10년 증감)
  bars: [
    { name: "KAIST", value: 8388, delta: "+25.2%" },
    { name: "부산대", value: 5525, delta: "−10.7%", self: true },
    { name: "경북대", value: 4224, delta: "" },
    { name: "연세대", value: 4088, delta: "" },
  ],
  source: "부산대 대학원 재학생 DB",
};

export const gradPlan = {
  title: "부산대 대학원 발전계획",
  intro: "BK4 성과를 기반으로 BK5에 도전 — Top-Down 정책과 Bottom-Up 학과 전략의 이중 구조.",
  targets: [
    { value: "+1,000명", label: "단기(2년) 대학원생 증원" },
    { value: "+2,000명", label: "중기(5년) 증원 · BK5 도전" },
  ],
  // 현황 분석 — 학과별 대학원생 변화
  status: {
    title: "현황 분석 — 학과별 대학원생 변화",
    points: [
      "교원당 대학원생 비율 뚜렷한 하락세 → BK5 경쟁력 핵심 지표",
      "기계공학: 1위 유지하나 소폭 감소 (305 → 287)",
      "경영학: 2위 → 12위 급락 (181 → 83명)",
      "정보융합공학: 성공 모델 — 2위 상승 (148 → 216명), AI·데이터 수요 반영",
    ],
    source: "부산대 대학원 재학생 DB (2017·2021·2026.3)",
  },
  // A. Top-Down 기관 정책
  topdown: {
    title: "Top-Down 기관 정책",
    items: [
      {
        name: "PNU 1000 AX 인재양성",
        body: "진학 의향 3·4학년 1,000명 · 월 25만원/학기 150만원/연 최대 30억원 · URP·패스트트랙 · AX-PBL 체화형 학습",
      },
      {
        name: "학석사 연계 트랙 완화",
        body: "가속 프로그램 입학 기준 간소화 · 학부 모집 단계의 학석사 통합학위 경로",
      },
      {
        name: "지역 국립대 대학원 통합 검토",
        body: "BK5 제출 전 일부 학과 통합 가능성 (부산대–부경대–부산과학기술원)",
      },
    ],
  },
  // B. Bottom-Up 학과 주도 3단계
  bottomup: {
    title: "Bottom-Up 학과 주도 3단계",
    steps: [
      { k: "1", name: "현황 진단", body: "재적 추이·교원 지도비율·미지도 교원 식별" },
      { k: "2", name: "원인 분석", body: "감소 원인·성장 가능 학과·제도적 장벽 식별" },
      { k: "3", name: "발전계획 제출", body: "BK5/AX 시대 수요 부합 학과별 전략" },
    ],
  },
  // backward-compat for existing sections
  program: {
    name: "PNU 1000 AX 인재양성",
    points: [
      "대학원 진학 의향 3·4학년 학부생 1,000명",
      "월 25만원 / 학기 150만원 / 연 최대 30억원",
      "연구소–대학원–산업–학생 URP·패스트트랙 생태계",
      "체화형 학습 (AX-PBL 모델)",
    ],
  },
  approach: "Top-Down 기관정책 + Bottom-Up 학과주도 3단계 (진단 → 분석 → 발전계획)",
};

/* ───────────────────────── 구심점 확립 (HOW) ───────────────────────── */

export const hub = {
  org: {
    title: "AI대학 (ADP+X 모델)",
    launch: "2027년 3월 출범",
    quota: "학부 424명",
    note: "동종 기관 대비 대규모 (일반 150명 · 전남대 250명)",
    frame: [
      { k: "D", name: "Data", body: "데이터사이언스학부 + 통계 (기반)" },
      { k: "A", name: "AI", body: "AI컴퓨터과학 (지능 생성)" },
      { k: "P", name: "Process", body: "산업공학 (현실 적용)" },
      { k: "X", name: "AX", body: "융합대학 (도메인 혁신·확산)" },
    ],
    majorsNote: "9개 분야 18개 융합전공 · 대학원 연계 BK21 (300명+)",
  },
  governance: {
    title: "AI 거버넌스",
    body: "총장 직속 4대 전담 기구 가동 중 — 기획 단계가 아닌 실제 운영 조직.",
    lead: "총장(최고 권한) · 교육부총장(AI 거점대학 사업 집행 총괄) · 운영위원회(전략·의사결정 조정).",
    bodies: [
      { name: "AI대학", body: "핵심 학사 교육 (2027 출범)" },
      { name: "AI융합교육원", body: "전교생 기초 AI 리터러시 교육 확산" },
      { name: "장영실 AI융합연구원", body: "연구 리더십·혁신 · AX-PBL · 소버린 AI" },
      { name: "AX 디지털혁신본부", body: "인프라·플랫폼 구현 · 산지니 AI · 데이터 거버넌스" },
    ],
    status: "3개 기구 모두 실제 가동 중",
  },
  infra: {
    title: "AI 인프라 확충·통합",
    motto: "AI for All, Secure for Strategic",
    stats: [
      { value: "303 → 800", label: "GPU (분산 → 통합 허브)" },
      { value: "5,000억 원", label: "인프라 확장 계획" },
      { value: "10,067㎡", label: "AI 혁신 허브 스페이스" },
    ],
    pillars: [
      { name: "PNU-AXIS", body: "분산 자원 통합 GPU 허브" },
      { name: "AI 혁신 허브 스페이스", body: "물리적 융합 공간 10,067㎡" },
      { name: "MLOps 플랫폼", body: "클라우드 기반 AIaaS 하이브리드" },
      { name: "MLSecOps", body: "이중 존 보안 (폐쇄/개방)" },
    ],
  },
};

/** AX 융합학부 — 9개 분야 18개 융합전공. */
export const majors = [
  { domain: "바이오·제약", items: ["AI-바이오테크 융합전공", "AX 신약개발 융합전공"] },
  { domain: "푸드테크", items: ["에그테크 AX 융합전공"] },
  { domain: "인문·사회", items: ["AX 인문 융합전공", "AX·소셜 데이터 분석 융합전공"] },
  { domain: "경영·경제", items: ["AX 전략경영 융합전공", "해양산업·금융 융합전공"] },
  {
    domain: "제조 AI",
    items: ["피지컬 AI 빅데이터 융합전공", "제조 AI 융합전공 (기계)", "제조 AI 융합전공 (산업)"],
  },
  { domain: "항만·물류 AI", items: ["해양물류 AI 융합전공"] },
  {
    domain: "계산과학·디지털트윈",
    items: [
      "AI 반도체 소자공정 전공",
      "AI·수리 데이터사이언스 전공",
      "AI 융합 계산과학",
      "디지털트윈 융합전공",
    ],
  },
  { domain: "스마트시티·환경", items: ["AI·지구환경 융합전공", "라이프케어 AX 융합전공"] },
  { domain: "조선·해양", items: ["조선·해양 AX 융합전공"] },
];

/* ───────────────────────── A.U.R.A (시그니처) ───────────────────────── */

export const aura = {
  title: "A.U.R.A 2.0",
  subtitle: "AX 추진 마스터플랜 프레임워크",
  fullName: "PNU AX 마스터플랜 A.U.R.A. 2.0",
  period: "2025 – 2027",
  investment: "100억 원 (2년간)",
  // Vision diagram hierarchy: 비전 → 목표 → 4축 → 8블록.
  vision: "AI 시대의 중심축, PNU Core AXIS",
  goal: "국내 최초 대학 AX 표준모델 제시",
  goalTargets: [
    { label: "대학 AI 인증 확보", tag: "국내 최초" },
    { label: "AI 연구 네트워크 10개", tag: "글로벌" },
    { label: "AI+X 증강인재 4,000명", tag: "인재" },
    { label: "행정 만족도 70 → 80 → 90", tag: "행정" },
  ],
  // 8 / 22 / 47 — the framework scale.
  pillars: [
    { value: 8, label: "전략 목표", labelEn: "Strategic Goals" },
    { value: 22, label: "핵심 전략 과제", labelEn: "Strategic Tasks" },
    { value: 47, label: "현장 실행 과제", labelEn: "Action Items" },
  ],
  // The four A.U.R.A. letters (전략방향). `tasks` summarizes each axis's 전략과제.
  framework: [
    {
      letter: "A",
      en: "AI Philosophy",
      ko: "AI 철학",
      desc: "AI 기반 대학 철학과 리더십 재정립",
      tasks: [
        "AX 철학·정책 재정립",
        "AI 기반 리더십 설정",
        "전사적 AX 확산·관리",
        "글로벌 AX 거버넌스 수립",
        "AI 인증 도입 (AI-MASTER)",
      ],
    },
    {
      letter: "U",
      en: "Unified Research",
      ko: "융합 연구",
      desc: "AI 융합연구원 중심 연구 생태계 구축",
      tasks: [
        "AI 융합주권 강화",
        "AI 융합연구원·ACTS 연구",
        "AI 혁신 생태계 거점화",
        "통합 융합 장비·첨단공간 재구축",
      ],
    },
    {
      letter: "R",
      en: "Reinforced Education",
      ko: "증강 인재 양성",
      desc: "AI+X 증강인재 4,000명 양성",
      tasks: [
        "AI 교육 표준화",
        "AI 기반 교수학습 역량 강화",
        "AI 네이티브 교육 혁신",
        "학생중심 맞춤 서비스 강화",
      ],
    },
    {
      letter: "A",
      en: "Adaptive Administration",
      ko: "적응형 행정",
      desc: "AI 기반 지능형 행정 체계 구축",
      tasks: [
        "AI 행정 표준화",
        "지능형 행정체계 구축",
        "AI 기반 행정 효율화",
        "AI 스마트캠퍼스 구현",
      ],
    },
  ],
  // 8 전략·실행 블록 (각 축 2블록).
  blocks: [
    {
      axis: "A",
      title: "PNU AX 철학·정책 재정립",
      items: ["AI 기반 철학·리더십 설정", "전사적 AX 확산·관리", "AI 시대 사회적 책임"],
    },
    {
      axis: "A",
      title: "글로벌선도형 AX 거버넌스 수립",
      items: ["AI 글로벌 거버넌스 구축", "AI 데이터 거버넌스 재설계", "AI 인증 도입 (AI-MASTER)"],
    },
    {
      axis: "U",
      title: "AI 융합주권 강화",
      items: ["AI 연구 Boost-Up 기반", "AI 융합연구원 설립 · ACTS 연구"],
    },
    {
      axis: "U",
      title: "AI 혁신 생태계 거점화",
      items: ["AI 연구 공유협력", "통합 AI 융합 장비 도입", "AI 융합 첨단공간 재구축"],
    },
    {
      axis: "R",
      title: "AI 증강형 인재 양성",
      items: ["AI 교육 표준화", "AI 기반 교수학습 역량 강화", "AI 네이티브 교육 혁신"],
    },
    {
      axis: "R",
      title: "학생중심 서비스 강화",
      items: ["전주기 학생생활 지원", "AI 개인맞춤 상담", "외국인 유학생 맞춤 지원"],
    },
    {
      axis: "A",
      title: "지능형 행정체계 구축",
      items: ["AI 행정 표준화", "교직원 AI 역량 강화", "AI 기반 행정 효율화"],
    },
    {
      axis: "A",
      title: "AI 스마트캠퍼스 구현",
      items: ["AI 기반 캠퍼스 환경 조성", "AI 기반 캠퍼스 공간 구축"],
    },
  ],
  // Masterplan quantitative targets.
  targets: [
    { value: "4,000명", label: "AI+X 증강인재 양성 목표" },
    { value: "70→80→90점", label: "행정 만족도 목표" },
    { value: "10개", label: "글로벌 연구네트워크 목표" },
  ],
};

/** Core AI services & infrastructure. */
export const services = [
  {
    name: "산지니 AI",
    tag: "PNU 자체 AI 서비스 플랫폼",
    points: [
      "국립대 최초 자체 구축",
      "LLM 기반 생성형 AI 서비스",
      "전 구성원 및 지역사회 대상",
      "개인정보 보호·보안 강화 PNU 전용 환경",
    ],
  },
  {
    name: "장영실 AI융합연구원",
    tag: "산학 협력 AI 융합연구 허브",
    points: ["2025년 12월 개원", "지역 산업 연계 현장 중심 연구·개발", "산학 협력 중심 융합연구"],
  },
  {
    name: "지도교수상담 AI 도우미",
    tag: "국립대 최초 자체 개발",
    points: ["성적·이전 상담 요약", "상담 방향 제시", "취업 정보 자동 분석", "상담 결과 초안 자동 생성"],
  },
  {
    name: "AI 통번역 스마트글라스",
    tag: "국내 최초 도입",
    points: ["외국인 유학생·글로벌 연구자 대상", "교육·연구 언어 장벽 해소", "국제화 캠퍼스 가속화"],
  },
];

export const achievements = {
  headline: [
    { value: "경영대상", label: "2025 한국의 경영대상 AI 혁신 부문 대상 (대학 중 유일)" },
    { value: "AI-MASTER", label: "University AI-MASTER 국내 대학 최초 인증" },
    { value: "국립대 최초", label: "지도교수상담 AI 도우미 자체 구축" },
    { value: "2027.03", label: "AI대학 정식 출범 (학부 424명)" },
  ],
  list: [
    "산지니 AI — 국립대 최초 자체 생성형 AI 플랫폼",
    "장영실 AI융합연구원 2025년 12월 개원",
    "AI 통번역 스마트글라스 국내 최초 도입",
    "University AI-MASTER 인증 — EU AI Act 준수 평가",
  ],
  timeline: [
    {
      date: "2025.07.31",
      title: "A.U.R.A. 프로젝트 공식 선언",
      detail: "총장 직속 AX 선도위원회 구성 · 3개년 로드맵 공개 · 투자 계획 발표",
    },
    {
      date: "2025.12.09",
      title: "2025 한국의 경영대상 AI 혁신 부문 대상",
      detail: "대학 중 유일 수상 (주관: KMAC) · 장영실 연구원·산지니 AI·스마트글라스 성과 인정",
    },
    {
      date: "2025.12.24",
      title: "지도교수상담 AI 도우미 국립대 최초 구축",
      detail: "성적·상담 요약, 상담 방향 제시, 취업 도우미 정보 시범 오픈",
    },
    {
      date: "2026.03.05",
      title: "University AI-MASTER 국내 대학 최초 인증",
      detail: "시스템 신뢰성·알고리즘 윤리성·기술적 안정성 모두 ‘적합’ · EU AI Act 준수 평가",
    },
  ],
};

export const roadmap = [
  {
    year: "2025",
    phase: "기반 구축",
    phaseEn: "Foundation",
    active: false,
    items: [
      { tag: "정책", text: "A.U.R.A. 프로젝트 선언 및 추진단 발족" },
      { tag: "행정", text: "AX·정보화혁신본부 확대 신설" },
      { tag: "인프라", text: "산지니 AI 플랫폼 자체 구축" },
      { tag: "연구", text: "장영실 AI융합연구원 개원" },
      { tag: "수상", text: "2025 한국의 경영대상 AI 혁신 대상 수상" },
    ],
  },
  {
    year: "2026",
    phase: "확산·고도화",
    phaseEn: "Acceleration",
    active: true,
    items: [
      { tag: "정책", text: "University AI-MASTER 국내 대학 최초 인증" },
      { tag: "교육", text: "AI 기반 학생 맞춤형 교과·비교과 추천" },
      { tag: "행정", text: "AI 기반 학사행정 시스템 에이전트" },
      { tag: "인프라", text: "PNU-AXIS GPU 허브 통합·고도화" },
      { tag: "연구", text: "글로벌 AI 연구 네트워크 구축" },
    ],
  },
  {
    year: "2027",
    phase: "선도 생태계 완성",
    phaseEn: "Leadership",
    active: false,
    items: [
      { tag: "교육", text: "AI대학 정식 출범 (학부 424명) · 18개 융합전공" },
      { tag: "교육", text: "AI+X 증강인재 4,000명 양성" },
      { tag: "행정", text: "행정 효율화 만족도 90점 달성" },
      { tag: "연구", text: "글로벌 AI 연구 네트워크 10개" },
      { tag: "정책", text: "동남권 AX 종합 허브 구축 완성" },
    ],
  },
];

export const contact = {
  address: "부산광역시 금정구 부산대학로 63번길 2, IT관 AI 거점사업단",
  phone: "051-510-0000",
  email: "arise@pusan.ac.kr",
  hours: "평일 09:00 ~ 18:00 (주말 및 공휴일 휴무)",
};

/** Official PNU brand assets (in /public/pnu). Use these — never fabricate logos/wordmarks. */
export const brandAssets = {
  // Transparent (background-removed) PNGs — sit cleanly on any theme, no white chip needed.
  symbolColor: "/pnu/pnu-symbol-color-removebg-preview.png",
  symbolLine: "/pnu/pnu-symbol-grid-removebg-preview.png",
  emblem: "/pnu/pnu-emblem-removebg-preview.png",
  signature: "/pnu/pnu-signature-removebg-preview.png",
  wordmarkKr: "/pnu/pnu-wordmark-kr-removebg-preview.png",
};

export const heroVideo = "/video/hero.mp4";

/** Sticky top-nav links (relative to the variant root, e.g. /tresmares + path). */
export const nav = [
  { label: "홈", path: "", star: false },
  { label: "대학원 육성", path: "/grad", star: false },
  { label: "구심점 확립", path: "/hub", star: false },
  { label: "A.U.R.A.", path: "/aura", star: true },
];

/** 최종 승인 변형 (다크 1). */
export const variants = [
  {
    slug: "bymonolog",
    name: "ARISE · Dark",
    vibe: "Dark Cinematic (최종)",
    desc: "차콜 시네마틱 · 스택 스크롤 · 골드 액센트",
    accent: "#c9a227",
    bg: "#0e0e0f",
  },
];
