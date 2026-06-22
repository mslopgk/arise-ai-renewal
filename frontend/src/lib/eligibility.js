// frontend/src/lib/eligibility.js
// 원본 eligibility.html:215-391 의 순수 로직 추출 — DOM 무관.

// ===== 학년별 수료학점 표 (학칙 제69조) — 졸업학점 band별 학기 누적 =====
export var CREDIT_TABLE = [
  {g:82,  cum:[20.5,41,61.5,82]},
  {g:104, cum:[17.5,35,52.5,70,87,104]},
  {g:120, cum:[16,32,46,60,75,90,105,120]},
  {g:125, cum:[16,32,48,64,80,96,110.5,125]},
  {g:126, cum:[16,32,48,64,80,96,111,126]},
  {g:128, cum:[16,32,48,64,80,96,112,128]},
  {g:129, cum:[16,32,48,64,80,96,112.5,129]},
  {g:132, cum:[16.5,33,49.5,66,82.5,99,115.5,132]},
  {g:133, cum:[17,34,51,68,85,102,117.5,133]},
  {g:134, cum:[17,34,51,68,85,102,118,134]},
  {g:135, cum:[17,34,51,68,85,102,118.5,135]},
  {g:137, cum:[17,34,51,68,85,102,119.5,137]},
  {g:141, cum:[17.5,35,52.5,70,87.5,105,123,141]},
  {g:168, cum:[17,34,51,68,85,102,119,136,152,168]},
  {g:181, cum:[20,40,60,80,100,120,150.5,181]},
  {g:229, cum:[19.5,39,59,79,99.5,120,139,158,179.5,201,215,229]}
];

export function bandExact(g){ for(var i=0;i<CREDIT_TABLE.length;i++) if(CREDIT_TABLE[i].g===g) return CREDIT_TABLE[i]; return null; }
export function bandNearest(g){ var best=CREDIT_TABLE[0],bd=Infinity; CREDIT_TABLE.forEach(function(b){var d=Math.abs(b.g-g); if(d<bd){bd=d;best=b;}}); return best; }
export function requiredCum(band, sem){ return sem<=band.cum.length ? band.cum[sem-1] : band.g; }
export function gradGpaThreshold(g){ return g===6 ? 4.0 : (g===7 ? 3.5 : 3.0); }

// ===== 학부 소속(단과대학) → 졸업학점 band 매핑 (학칙 제69조 수료학점표 B열 근거) =====
export var COLLEGES = [
  {c:'인문대학 (전 학과)', g:126},
  {c:'사회과학대학', branches:[
    {l:'행정·정치외교·사회·심리·미디어커뮤니케이션학과', g:126},
    {l:'사회복지·문헌정보학과', g:129}]},
  {c:'경제통상대학', branches:[
    {l:'국제학부', g:125},
    {l:'국제학부 외 전 학과', g:128}]},
  {c:'경영대학 (경영학과)', g:126},
  {c:'자연과학대학 (전 학과)', g:129},
  {c:'공과대학', branches:[
    {l:'건축학과', g:168},
    {l:'건축학과 외 전 학과(부)', g:137}]},
  {c:'나노과학기술대학 (전 학과)', g:137},
  {c:'정보의생명공학대학 (전 학과)', g:133},
  {c:'생명자원과학대학', branches:[
    {l:'식품자원경제학과', g:129},
    {l:'식물생명·원예생명·동물생명자원·식품공학·생명환경화학·바이오소재과학과', g:132},
    {l:'바이오산업기계공학·IT응용공학·바이오환경에너지·조경학과', g:137},
    {l:'원예생명과학과(특성화고졸 재직자)', g:120}]},
  {c:'생활과학대학', branches:[
    {l:'스포츠과학과', g:126},
    {l:'스포츠과학과 외 전 학과', g:129}]},
  {c:'사범대학', branches:[
    {l:'국어·영어·독어·불어·교육학·일반사회·역사·지리·윤리·체육교육과', g:135},
    {l:'수학·물리·화학·생물·지구과학·유아·특수교육과', g:141}]},
  {c:'예술대학 (전 학과)', g:129},
  {c:'간호대학 (간호학과)', g:134},
  {c:'약학대학 (약학부)', g:229},
  {c:'의과대학', branches:[
    {l:'의예과', g:82},
    {l:'의학과', g:181}]},
  {c:'치의학·한의학전문대학원 (학·석사통합 학사과정)', g:104},
  {c:'글로벌자유전공학부', g:126}
];

// 라벨 맵 — 원본 319-320 그대로
export var SEM_LABEL = {4:'4학기(2학년 2학기)',5:'5학기(3학년 1학기)',6:'6학기(3학년 2학기)',7:'7학기(4학년 1학기)',8:'8학기(4학년 2학기)',9:'9학기 이상'};
export var GRAD_LABEL = {6:'6학기(조기졸업)',7:'7학기',8:'8학기(정규)',over8:'8학기 초과'};

/**
 * evaluateEligibility(input)
 *
 * input: {
 *   manualMode,    // boolean — true면 gradManual 사용
 *   gradManual,    // number  — manualMode일 때 졸업학점 직접 입력값
 *   resolvedG,     // number|null — 소속 선택으로 결정된 졸업학점 (manualMode=false)
 *   collegeIndex,  // number — COLLEGES 인덱스
 *   branchIndex,   // number — branches 인덱스 (-1이면 branches 없음)
 *   sem,           // number — 현재 이수 학기
 *   gradSemRaw,    // string — '6'|'7'|'8'|'over8'
 *   gpa,           // number — 전체 평점평균
 *   earned,        // number — 누적 취득학점
 * }
 *
 * return: { ok:false, error } | { ok:true, tier, checks, basis, scholNote, band }
 *   tier ∈ 'pass'|'maybe'|'fail'
 */
export function evaluateEligibility(input) {
  var manualMode = input.manualMode;
  var gradManual = input.gradManual;
  var resolvedG  = input.resolvedG;
  var collegeIndex = input.collegeIndex;
  var branchIndex  = input.branchIndex;
  var sem         = input.sem;
  var gradSemRaw  = input.gradSemRaw;
  var gpa         = input.gpa;
  var earned      = input.earned;

  // band(졸업학점) 결정: 소속 선택 또는 수동 입력 (원본 332-342)
  var band = null, basisSrc = '';
  if (manualMode) {
    var gm = parseFloat(gradManual);
    if (isNaN(gm) || gm <= 0) return {ok:false, error:'졸업 요구학점을 입력하거나 소속을 선택하세요.'};
    band = bandNearest(gm);
    basisSrc = '직접 입력 ' + gm + '학점 → ' + band.g + '학점 band(근사)';
  } else {
    if (resolvedG === null) return {ok:false, error:'학부 소속을 선택하세요.'};
    band = bandExact(resolvedG) || bandNearest(resolvedG);
    var co = COLLEGES[collegeIndex];
    basisSrc = co.c + (branchIndex !== -1 && co.branches ? (' · ' + co.branches[branchIndex].l) : '') + ' → 졸업 ' + band.g + '학점';
  }

  // 필수/범위 검증 (원본 344-351)
  var missing = [];
  if (!sem) missing.push('현재 이수 학기');
  if (!gradSemRaw) missing.push('졸업 예정 시점');
  if (isNaN(gpa)) missing.push('평점평균');
  if (isNaN(earned)) missing.push('누적 취득학점');
  if (missing.length) return {ok:false, error:'다음을 입력하세요: ' + missing.join(', ')};
  if (gpa < 0 || gpa > 4.5) return {ok:false, error:'평점평균은 0~4.5 사이여야 합니다.'};
  if (earned < 0) return {ok:false, error:'취득학점을 올바르게 입력하세요.'};

  // 파생값 (원본 353-364)
  var over8   = gradSemRaw === 'over8';
  var gradSem = over8 ? 9 : parseInt(gradSemRaw, 10);
  var gpaThr  = gradGpaThreshold(over8 ? 8 : gradSem);
  var reqCum  = requiredCum(band, sem);
  var reqR    = Math.round(reqCum * 10) / 10;

  var g1 = sem >= 4 && sem <= 7;
  var g2 = gpa >= 3.0;
  var g3 = earned >= reqCum;
  var g4 = gpa >= gpaThr;
  var imminent = over8 ? false : (sem >= gradSem);

  // checks 4종 (원본 366-378)
  var checks = [];
  checks.push({
    state: g1 ? 'ok' : (sem > 7 ? 'no' : 'warn'),
    title: '이수 학기 (4~7학기)',
    detail: '현재 <b>' + (SEM_LABEL[sem] || sem + '학기') + '</b> · 기준 4~7학기',
    reason: g1 ? '' : (sem > 7 ? '8학기 이상은 신청 대상이 아닙니다. 4~7학기 재학생만 지원 가능합니다.' : '아직 4학기 미만입니다. 4학기 이수 후 지원 가능합니다.')
  });
  checks.push({
    state: g2 ? 'ok' : (imminent ? 'no' : 'warn'),
    title: '지원 평점 (3.0 이상)',
    detail: '입력 <b>' + gpa.toFixed(2) + '</b> / 4.5 · 기준 3.00 이상',
    reason: g2 ? '' : (imminent ? '졸업 시점 기준 평점이 3.0에 미달합니다.' : '현재 3.0 미만이나 남은 학기에 보완 여지가 있습니다.')
  });
  checks.push({
    state: g3 ? 'ok' : 'warn',
    title: '학기 누적 수료학점 충족 (학칙 제69조)',
    detail: '취득 <b>' + earned + '</b>(당해 학기 계절수업 제외) · ' + (SEM_LABEL[sem] || sem + '학기') + ' 요구 누적 약 <b>' + reqR + '</b> (졸업 ' + band.g + '학점 기준)',
    reason: g3 ? '' : ('현재 학기 요구 누적학점에 약 ' + (Math.round((reqCum - earned) * 10) / 10) + '학점 부족합니다.')
  });
  checks.push({
    state: g4 ? 'ok' : (imminent && gpa < 3.0 ? 'no' : 'warn'),
    title: '졸업 성적기준 (' + GRAD_LABEL[gradSemRaw] + ' → 평점 ' + gpaThr.toFixed(1) + ' 이상)',
    detail: '입력 <b>' + gpa.toFixed(2) + '</b> · 기준 ' + gpaThr.toFixed(1) + ' 이상',
    reason: g4 ? '' : (gradSemRaw === '6' ? '조기졸업(6학기) 기준 4.0에 미달 — 7·8학기 졸업으로 조정하거나 평점 상향이 필요합니다.' : '졸업 성적기준에 미달합니다. 평점 상향 또는 졸업 시점 조정이 필요합니다.')
  });

  // tier (원본 380-388)
  var allOk = g1 && g2 && g3 && g4;
  var tier;
  if (allOk) tier = 'pass';
  else if (sem > 7) tier = 'fail';
  else if (imminent && gpa < 3.0) tier = 'fail';
  else tier = 'maybe';

  // scholNote (원본 416-420)
  var scholNote = over8
    ? '<div class="schol-note"><b>장학 안내</b> · 8학기 초과 졸업자는 연계과정 장학금 지급 대상에서 <b>제외</b>됩니다.</div>'
    : (gradSemRaw === '8'
      ? '<div class="schol-note"><b>장학 안내</b> · 정규 8학기(정규졸업 예정) 이수자는 학사 졸업 전체평점평균 <b>3.8 이상</b>인 경우에만 장학금이 지급됩니다(입학 자격과는 무관).</div>'
      : '');

  return { ok:true, tier, checks, basis:basisSrc, scholNote, band };
}
