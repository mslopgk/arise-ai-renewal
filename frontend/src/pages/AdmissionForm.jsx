import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './admission.css';

const DEADLINE_TIME = new Date('2026-07-16T23:59:59+09:00').getTime();

export default function AdmissionForm() {
  const navigate = useNavigate();

  // Authentication & Response Status
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState(null);

  // Form States
  const [agree, setAgree] = useState(false);
  const [track, setTrack] = useState('학.석사연계과정'); // Default track
  const [picks, setPicks] = useState([]); // Array of { dept, major, text }
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Dropdown States
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedMajorName, setSelectedMajorName] = useState('');

  // Countdown States
  const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });

  // Show temporary toast
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 1. Initial Checks
  useEffect(() => {
    // Check Auth Status
    api.me()
      .then(user => {
        setCurrentUser(user);
        // If logged in, check if user has already submitted the response
        api.myResponse()
          .then(res => {
            if (res) setHasSubmitted(true);
          })
          .catch(() => {});
      })
      .catch(err => {
        // If 401, they need to log in to submit
        if (err.status === 401) {
          setAuthError('unauthenticated');
        } else {
          setAuthError('error');
        }
      });

    // Load Departments
    api.departments()
      .then(data => {
        setDepartments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setDepartments([]);
      });

    // Load Survey Structure
    api.survey()
      .then(info => {
        setSurveyInfo(info);
      })
      .catch(() => {});
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
    const tick = () => {
      const diff = Math.max(0, DEADLINE_TIME - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Picks System
  const activeDept = departments.find(d => String(d.id) === selectedDeptId);
  const majors = activeDept ? (activeDept.majors || []).filter(m => m.recruit !== false) : [];
  const needMajorSelection = majors.length >= 2;

  const handleAddPick = () => {
    if (picks.length >= 3) {
      triggerToast('⚠ 지망은 최대 3개까지 담을 수 있습니다.');
      return;
    }
    if (!activeDept) {
      triggerToast('⚠ 학과를 선택하세요.');
      return;
    }
    if (needMajorSelection && !selectedMajorName) {
      triggerToast('⚠ 전공을 선택하세요.');
      return;
    }

    const majorName = needMajorSelection ? selectedMajorName : (majors.length === 1 ? majors[0].name : '');
    const displayText = majorName ? `${activeDept.name} / ${majorName}` : activeDept.name;

    if (picks.some(p => p.text === displayText)) {
      triggerToast('이미 담은 학과·전공입니다.');
      return;
    }

    setPicks([...picks, { dept: activeDept.name, major: majorName, text: displayText }]);
    setSelectedDeptId('');
    setSelectedMajorName('');
    triggerToast(`'${displayText}' 을(를) 담았습니다.`);
  };

  const handleRemovePick = (index) => {
    setPicks(picks.filter((_, i) => i !== index));
  };

  // 4. Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agree) {
      triggerToast('⚠ 이메일 수집 및 이용 동의가 필요합니다.');
      return;
    }
    if (!track) {
      triggerToast('⚠ 희망 트랙을 선택해 주세요.');
      return;
    }
    if (picks.length === 0) {
      triggerToast('⚠ 최소 1개 이상의 지망 학과를 담아주세요.');
      return;
    }
    if (authError === 'unauthenticated') {
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.href = `/auth/google?returnTo=${returnTo}`;
      return;
    }

    setSubmitting(true);

    // Prepare Answers Payload mapping to Survey Questions
    const questions = surveyInfo?.questions || [];
    const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[①②③]/g, '');

    const trackQ = questions.find(q => q.type === 'single');
    const textQs = questions.filter(q => q.type === 'short_text').sort((a, b) => (a.ord || 0) - (b.ord || 0));

    if (!trackQ) {
      triggerToast('⚠ 설문 설정 오류: 희망 트랙 문항을 찾을 수 없습니다.');
      setSubmitting(false);
      return;
    }

    const trackOpt = (trackQ.options || []).find(o => norm(o.label) === norm(track));
    if (!trackOpt) {
      triggerToast('⚠ 설문 설정 오류: 매핑할 수 없는 트랙입니다.');
      setSubmitting(false);
      return;
    }

    const answers = [
      { question_id: trackQ.id, selected_option_ids: [trackOpt.id] }
    ];

    picks.forEach((p, i) => {
      if (textQs[i]) {
        answers.push({ question_id: textQs[i].id, text_value: p.text });
      }
    });

    api.submitResponse({ answers })
      .then(() => {
        triggerToast('희망 제출이 성공적으로 완료되었습니다.');
        setHasSubmitted(true);
        setPicks([]);
        setAgree(false);
      })
      .catch(err => {
        if (err.status === 409) {
          triggerToast('이미 희망 제출을 완료하셨습니다.');
          setHasSubmitted(true);
        } else if (err.status === 401) {
          const returnTo = encodeURIComponent(window.location.pathname);
          window.location.href = `/auth/google?returnTo=${returnTo}`;
        } else {
          triggerToast(`⚠ 제출 실패: ${err.message || '알 수 없는 오류'}`);
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  // Grouping departments by gyeyeol
  const deptGroups = {};
  departments.forEach(d => {
    if (d.recruit === false) return;
    const g = d.gyeyeol || '기타';
    if (!deptGroups[g]) deptGroups[g] = [];
    deptGroups[g].push(d);
  });

  return (
    <div className="admission-container">
      <div className="admission-inner">
        {/* Header */}
        <header className="admission-header">
          <img src="/logos/pnu-signature.jpg" alt="부산대학교" onError={(e) => e.target.style.display = 'none'} />
          <div className="brand-info">
            <div className="kicker">PNU · 학·석사 연계과정</div>
            <div className="org">부산대학교 AI 거점대학육성사업단</div>
          </div>
        </header>

        {/* Title */}
        <div className="title-section">
          <h1>연계과정 <span>희망 신청서 제출</span></h1>
          <p className="lead">
            부산대학교 AI거점대학원(학석사 연계과정)에 관심이 있는 학생들은 희망 신청 정보를 제출해 주세요. 
            해당 정보는 대학원 진학 정보 분석 및 BK21 Bridge 장학금 연계 등에 활용됩니다.
          </p>
          <div className="privacy-badge">🔒 개인정보 최소화 (이메일 및 지망 학과만 수집)</div>
        </div>

        {/* Countdown Timer */}
        <div className="countdown-box">
          <div className="countdown-label">
            <small>APPLICATION DEADLINE</small>
            <strong>2026학년도 1학기 모집 마감</strong>
          </div>
          <div className="countdown-cells">
            <div className="cd-cell">
              <div className="cd-num">{timeLeft.d}</div>
              <div className="cd-lbl">일</div>
            </div>
            <div className="cd-cell">
              <div className="cd-num">{timeLeft.h}</div>
              <div className="cd-lbl">시간</div>
            </div>
            <div className="cd-cell">
              <div className="cd-num">{timeLeft.m}</div>
              <div className="cd-lbl">분</div>
            </div>
            <div className="cd-cell">
              <div className="cd-num">{timeLeft.s}</div>
              <div className="cd-lbl">초</div>
            </div>
          </div>
        </div>

        {/* Authentication Warnings */}
        {authError === 'unauthenticated' && (
          <div className="auth-notice">
            ⚠ 희망 신청서를 제출하시려면 <strong>Google 로그인</strong>이 필요합니다.{' '}
            <a href={`/auth/google?returnTo=${encodeURIComponent(window.location.pathname)}`}>구글 계정으로 로그인하기</a>
          </div>
        )}

        {hasSubmitted && (
          <div className="auth-notice" style={{ background: 'rgba(0, 199, 90, 0.08)', borderColor: 'rgba(0, 199, 90, 0.25)', color: '#00c75a' }}>
            ✓ <strong>희망 제출 완료:</strong> 회원님은 이미 희망 신청서 제출을 완료하셨습니다. 성원해주셔서 감사합니다!
          </div>
        )}

        {/* Main Form */}
        {!hasSubmitted && (
          <form className="form-card" onSubmit={handleSubmit}>
            <h2><span className="step-no">1</span> 희망 트랙 선택</h2>
            <p className="sub">신청하고자 하는 대학원 연계 과정을 한 가지 선택하세요.</p>
            
            <div className="field">
              <div className="radio-group">
                <label className={`radio-label ${track === '학.석사연계과정' ? 'checked' : ''}`}>
                  <input 
                    type="radio" 
                    name="track" 
                    value="학.석사연계과정"
                    checked={track === '학.석사연계과정'} 
                    onChange={(e) => setTrack(e.target.value)}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#f5f5f0' }}>① 학·석사 연계과정 (1.5년 석사)</strong>
                    <span style={{ fontSize: '12px', color: '#888884' }}>학부 졸업 요건(논문/시험) 일부 면제 및 대학원 6학점 중복 인정</span>
                  </div>
                </label>
                <label className={`radio-label ${track === '학.석박사통합 연계과정' ? 'checked' : ''}`}>
                  <input 
                    type="radio" 
                    name="track" 
                    value="학.석박사통합 연계과정"
                    checked={track === '학.석박사통합 연계과정'} 
                    onChange={(e) => setTrack(e.target.value)}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#f5f5f0' }}>② 학·석박사통합 연계과정 (3년 통합)</strong>
                    <span style={{ fontSize: '12px', color: '#888884' }}>학부에서 박사학위까지 다이렉트 융합 연구 특별 조기 트랙</span>
                  </div>
                </label>
              </div>
            </div>

            <h2 style={{ marginTop: '30px' }}><span className="step-no">2</span> 지망 학과 담기</h2>
            <p className="sub">대학원 진학을 희망하는 학과를 선택한 후 추가해 주세요. (최대 3지망)</p>

            <div className="field">
              <label>학과 선택 <span className="req">*</span></label>
              <select 
                value={selectedDeptId} 
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedMajorName('');
                }}
                disabled={picks.length >= 3}
              >
                <option value="">학문을 선택하세요</option>
                {Object.keys(deptGroups).map(group => (
                  <optgroup key={group} label={group}>
                    {deptGroups[group].map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.bk21 ? '★ ' : ''}{dept.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {needMajorSelection && (
              <div className="field">
                <label>세부 전공 선택 <span className="req">*</span></label>
                <select 
                  value={selectedMajorName}
                  onChange={(e) => setSelectedMajorName(e.target.value)}
                  disabled={picks.length >= 3}
                >
                  <option value="">세부 전공을 선택하세요</option>
                  {majors.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="add-picker-row">
              <button 
                type="button" 
                className="btn-add-pick"
                onClick={handleAddPick}
                disabled={picks.length >= 3 || !selectedDeptId || (needMajorSelection && !selectedMajorName)}
              >
                지망 목록에 추가
              </button>
            </div>

            {/* Picks List */}
            <div className="picks-box">
              <div className="picks-header">
                <span>지망 선택 목록 ({picks.length} / 3)</span>
                {picks.length > 0 && <span style={{ color: '#ffb800', fontSize: '12px' }}>순서대로 1, 2, 3지망으로 반영됩니다.</span>}
              </div>
              <div className="picks-list">
                {picks.length === 0 ? (
                  <div className="picks-empty">
                    선택한 학과가 없습니다. 위 필터에서 학과를 찾아 담아주세요.
                  </div>
                ) : (
                  picks.map((p, index) => (
                    <div className="pick-item" key={index}>
                      <span className="pick-rank">{index + 1}</span>
                      <span className="pick-text">
                        {p.text}
                        <small>{index + 1}지망</small>
                      </span>
                      <button 
                        type="button" 
                        className="pick-remove"
                        onClick={() => handleRemovePick(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Email collection agreement */}
            <label className="agree-label">
              <input 
                type="checkbox" 
                checked={agree} 
                onChange={(e) => setAgree(e.target.checked)} 
              />
              <span>
                (필수) 구글 로그인 이메일 주소의 제출 및 학업 전형 연계 수집에 동의합니다.
              </span>
            </label>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit"
              disabled={submitting || picks.length === 0 || !agree || authError === 'unauthenticated'}
            >
              {submitting ? '제출 중...' : '희망 신청서 제출하기'}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div className="footer-link">
          <Link to="/">← 메인 게이트웨이 페이지로 돌아가기</Link>
        </div>
      </div>

      {/* Success Toast */}
      {toast && <div className="success-toast">{toast}</div>}
    </div>
  );
}
