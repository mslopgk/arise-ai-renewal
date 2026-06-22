// 원본 admission-v3-dark.html:3205 norm() 그대로 — 공백 제거 + 원문자 제거
const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[①②③]/g, '');

// 원본:3203-3213 매핑 로직 1:1. 실패 시 {error} 반환(원본은 toast+reject).
export function mapAnswers(survey, trackLabel, picks) {
  const questions = (survey && survey.questions) || [];
  const trackQ = questions.find((q) => q.type === 'single');
  const textQs = questions.filter((q) => q.type === 'short_text')
    .sort((a, b) => (a.ord || 0) - (b.ord || 0));
  if (!trackQ) return { error: '⚠ 트랙 질문을 찾을 수 없습니다.' };
  const trackOpt = (trackQ.options || []).find((o) => norm(o.label) === norm(trackLabel));
  if (!trackOpt) return { error: '⚠ 선택한 트랙을 매핑할 수 없습니다.' };
  if (textQs.length < 1) return { error: '⚠ 지망 입력 항목을 찾을 수 없습니다.' };
  const answers = [{ question_id: trackQ.id, selected_option_ids: [trackOpt.id] }];
  picks.forEach((p, i) => { if (textQs[i]) answers.push({ question_id: textQs[i].id, text_value: p.text }); });
  return { answers };
}

// 원본:3173 openApply 의 returnTo — path + hash + '?modal=apply'
export function buildReturnTo({ pathname, hash, search } = {}) {
  return pathname + (hash || '') + '?modal=apply';
}
