import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapAnswers, buildReturnTo } from './apply-survey.js';

const survey = {
  questions: [
    { id: 10, type: 'single', options: [
      { id: 1, label: '① 학·석사 연계과정' },
      { id: 2, label: '② 학·석박사통합 연계과정' },
    ] },
    { id: 21, type: 'short_text', ord: 2 },
    { id: 20, type: 'short_text', ord: 1 },
    { id: 22, type: 'short_text', ord: 3 },
  ],
};

describe('mapAnswers', () => {
  it('트랙 라벨을 원문자/공백 무시 매칭하고, 지망을 ord 순 short_text에 채운다', () => {
    const picks = [{ text: 'A학과' }, { text: 'B학과 / 전공' }];
    const { answers } = mapAnswers(survey, '학·석사 연계과정', picks);
    assert.deepStrictEqual(answers[0], { question_id: 10, selected_option_ids: [1] });
    assert.deepStrictEqual(answers[1], { question_id: 20, text_value: 'A학과' });   // ord 1
    assert.deepStrictEqual(answers[2], { question_id: 21, text_value: 'B학과 / 전공' }); // ord 2
  });
  it('트랙 옵션 매핑 실패 시 error', () => {
    const result = mapAnswers(survey, '없는트랙', [{ text: 'x' }]);
    assert(result.error && result.error.includes('매핑할 수 없습니다'));
  });
  it('single 질문 없으면 error', () => {
    const result = mapAnswers({ questions: [] }, 'x', []);
    assert(result.error && result.error.includes('트랙 질문'));
  });
});

describe('buildReturnTo', () => {
  it('path + hash + ?modal=apply', () => {
    const result = buildReturnTo({ pathname: '/admission', hash: '#departments' });
    assert.strictEqual(result, '/admission#departments?modal=apply');
  });
});
