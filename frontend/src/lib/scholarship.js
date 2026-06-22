// scholarship.js — 장학 판정 순수 로직
// 원본: frontend/public/scholarship.html <script> (lines 170-294)
// NOTE: COLLEGES here includes sam flags; do NOT merge with eligibility.js's COLLEGES.

export var COLLEGES = [
  {c:'인문대학', gye:'인문', sam:true},
  {c:'사회과학대학', gye:'사회과학', sam:true},
  {c:'자연과학대학', gye:'자연과학', sam:true},
  {c:'경제통상대학', gye:'사회과학(경상)', sam:false},
  {c:'경영대학', gye:'사회과학(경상)', sam:false},
  {c:'공과대학', gye:'공학', sam:false},
  {c:'나노과학기술대학', gye:'자연·공학', sam:false},
  {c:'정보의생명공학대학', gye:'공학·생명', sam:false},
  {c:'생명자원과학대학', gye:'농생명', sam:false},
  {c:'생활과학대학', gye:'생활과학', sam:false},
  {c:'사범대학', gye:'사범(교과별)', sam:false},
  {c:'예술대학', gye:'예술', sam:false},
  {c:'간호대학', gye:'의약·생명', sam:false},
  {c:'약학대학', gye:'의약·생명', sam:false},
  {c:'의과대학', gye:'의약·생명', sam:false},
  {c:'치의학·한의학전문대학원 (학사과정)', gye:'의약·생명', sam:false},
  {c:'글로벌자유전공학부', gye:'자유전공', sam:false}
];

export var TRACK_LABEL = {ms:'학·석사 연계(석사)', msp:'학·석박사 통합'};
export var GRAD_LABEL = {6:'6학기(조기졸업)',7:'7학기',8:'8학기(정규)',over8:'8학기 초과'};
export var TIER_BADGE = {ok:'예상 해당', cond:'조건부 / 심사 필요', no:'미해당'};

// BK21 참여학과(교육연구단) — 출처: 부산대 BK사업단 자료(2026), 40개 사업단
export var BK21_HTML = '<div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.7">'
  +'<b>BK21 참여학과(교육연구단)</b> — 본인 <u>학부 학과</u>가 아래에 해당하면 조건부 대상:<br>'
  +'· <b>공학</b>: 전기전자공학과·데이터사이언스학과·응용화학공학부·산업공학·재료공학과·정보융합공학과·항공우주공학과·나노메카트로닉스공학과·도시공학과·건축학과·사회환경시스템공학과·인지메카트로닉스공학과·기계공학부·조선해양공학과<br>'
  +'· <b>인문·사회</b>: 사회복지학과·교육학과·관광컨벤션학과·고고학과·철학과·경영학과·문헌정보학과·경제학과·국어국문학과·특수교육학과·한문학과<br>'
  +'· <b>이학·체육</b>: 화학과·수학과·식물생명과학과·바이오소재과학과·화학소재학과·생명시스템학과·식품영양학과·지구환경시스템학부·물리학과<br>'
  +'· <b>약학</b>: 약학과·제약학과 · <b>치의·한의</b>: 치의학과·한의과학과 · <b>의학</b>: 융합의과학과 · <b>예술</b>: 디자인학과<br>'
  +'<span style="color:#7a5400">※ 데이터사이언스·융합의과학·한의과학은 대학원 학과 — 학부↔대학원 매칭은 확인 필요.</span></div>';

// ===== 장학별 판정 (학부생 예상 / 3단계: ok 예상해당 · cond 조건부 · no 미해당) =====
// 원본 lines 216-225; track 은 클로저 var 였으나 인자로 받음
export function judgeReg(gradSemRaw, gpa, contract, track) {
  var amt = '등록금 전액';
  var meta = (track === 'msp' ? '석박통합: 석사 2·3학기 + 박사 5·6학기' : '석사 2·3학기');
  if (contract === 'y') return {tier:'no', amt:amt, meta:meta, reason:'계약학과 선발 학생은 연계과정 장학금 지급 대상에서 제외됩니다.'};
  if (gradSemRaw === 'over8') return {tier:'no', amt:amt, meta:meta, reason:'8학기 초과 졸업자는 장학금 지급 대상에서 제외됩니다.'};
  if (gradSemRaw === '8') {
    if (isNaN(gpa) || gpa < 3.8) return {tier:'cond', amt:amt, meta:meta, reason:'정규 8학기 졸업 예정자는 학사 졸업 전체평점평균 <b>3.8 이상</b>일 때만 지급됩니다' + (isNaN(gpa) ? '.' : (' (현재 ' + gpa.toFixed(2) + '). 졸업 시점까지 3.8↑ 달성 시 해당.'))};
    return {tier:'ok', amt:amt, meta:meta, reason:'정규 8학기 졸업 + 학사평점 3.8 이상 — 등록금 전액 지급 대상.'};
  }
  return {tier:'ok', amt:amt, meta:meta, reason:GRAD_LABEL[gradSemRaw] + ' 졸업 예정 — 등록금 전액 지급 대상(조기·일반 졸업은 3.8 조건 미적용).'};
}

// 원본 lines 226-230
export function judgeSAM(co) {
  var amt = '학기당 50만원 내외', meta = '학생과 510-1282 · 대학원 재학 중 신청';
  if (!co.sam) return {tier:'no', amt:amt, meta:meta, flag:true, reason:'<b>' + co.gye + '</b> 계열은 기초보호학문(인문·사회·자연) 대상이 아닌 것으로 가정했습니다.'};
  return {tier:'cond', amt:amt, meta:meta, flag:true, reason:'기초보호학문(인문·사회·자연) 해당. 대학원 재학 중 <b>심사학기 평점 3.7 이상</b> + 학업계획서·전공 실적 서류 심사로 선발됩니다. (마지막 학기·초과학기·졸업예정자 제외)'};
}

// 원본 lines 231-237
export function judgeBK(lastSem, nextGrad) {
  var amt = '월 70만원 × 최대 3개월', meta = '대학원혁신실 510-7930';
  var base = 'BK21 참여학과의 학사 최종학기 재학생 + 다음 학기 대학원 입학예정자가 대상입니다.' + BK21_HTML;
  if (lastSem === 'y' && nextGrad === 'y') return {tier:'cond', amt:amt, meta:meta, reason:'최종학기 + 다음 학기 입학예정 — <b>소속 학부가 BK21 참여학과라면</b> 신청 가능(사업단 선발·예산 범위 내). ' + base};
  if (lastSem !== 'y') return {tier:'cond', amt:amt, meta:meta, reason:'아직 학사 최종학기가 아닙니다. <b>최종학기</b>에 신청 가능. ' + base};
  return {tier:'cond', amt:amt, meta:meta, reason:'다음 학기 대학원 입학예정자만 신청 가능합니다. ' + base};
}

// 원본 lines 238-240; track 은 클로저 var 였으나 인자로 받음
export function judgeResearch(track) {
  return {tier:'ok', amt:'학기당 50만원', meta:'대학원혁신실 510-1901', reason:'연계과정(' + TRACK_LABEL[track] + ') 재학 중 학기당 50만원(학회참석·자료수집·연구경비). 선발·재학 시 해당.'};
}

// summarize — 원본 lines 274-277
export function summarize(items, track) {
  var nOk = items.filter(function(x){ return x.r.tier === 'ok'; }).length;
  var nCond = items.filter(function(x){ return x.r.tier === 'cond'; }).length;
  var nNo = items.length - nOk - nCond;
  return {
    nOk: nOk,
    nCond: nCond,
    nNo: nNo,
    summaryText: {
      n: '예상 해당 ' + nOk + '종 · 조건부 ' + nCond + '종 · 미해당 ' + nNo + '종',
      d: '연계과정 ' + (TRACK_LABEL[track]) + ' 진학 가정. "조건부"는 서류·심사·향후 평점·절차가 남은 항목, "미해당"은 현재 대상이 아닌 항목입니다.'
    }
  };
}

// evaluateScholarship — 원본 checkBtn 핸들러 (lines 242-269) 순수화
// input: { track, collegeIndex, gradSemRaw, gpa, lastSem, nextGrad, contract }
// return: { ok:false, error } | { ok:true, items, summary:{nOk,nCond,nNo}, summaryText:{n,d} }
export function evaluateScholarship(input) {
  var track = input.track;
  var ci = input.collegeIndex;
  var gradSemRaw = input.gradSemRaw;
  var gpa = input.gpa;
  var lastSem = input.lastSem;
  var nextGrad = input.nextGrad;
  var contract = input.contract;

  var miss = [];
  if (!track) miss.push('희망 트랙');
  if (ci === '' || ci === null || ci === undefined) miss.push('학부 소속');
  if (!gradSemRaw) miss.push('졸업 예정 시점');
  if (isNaN(gpa)) miss.push('학사 평점');
  if (!lastSem) miss.push('최종학기 여부');
  if (!nextGrad) miss.push('다음 학기 입학예정');
  if (!contract) miss.push('계약학과 여부');
  if (miss.length) return {ok: false, error: '다음을 입력하세요: ' + miss.join(', ')};
  if (gpa < 0 || gpa > 4.5) return {ok: false, error: '평점평균은 0~4.5 사이여야 합니다.'};

  var co = COLLEGES[+ci];
  var items = [
    {name:'① 연계과정 장학금', r:judgeReg(gradSemRaw, gpa, contract, track)},
    {name:'② SAM분야 진흥장려금', r:judgeSAM(co)},
    {name:'③ BK21 Bridge 장학금', r:judgeBK(lastSem, nextGrad)},
    {name:'④ 연구지원장려금', r:judgeResearch(track)}
  ];

  var s = summarize(items, track);
  return {
    ok: true,
    items: items,
    summary: {nOk: s.nOk, nCond: s.nCond, nNo: s.nNo},
    summaryText: s.summaryText
  };
}
