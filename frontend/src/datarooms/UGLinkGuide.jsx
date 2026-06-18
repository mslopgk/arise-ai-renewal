import React, { useState } from 'react';

export default function UGLinkGuide() {
  const [openFaq, setOpenFaq] = useState({});

  const toggleFaq = (index) => {
    setOpenFaq(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqList = [
    {
      q: 'Q. 학사과정 전공과 진학희망 대학원 학과가 달라도 지원이 가능한가요?',
      a: 'A. 네, 지원 가능합니다. 학사과정 학과와 진학희망 대학원 석·박사과정의 학과가 일치하지 않아도 추천과 승인을 거쳐 지원 및 진학이 가능합니다. 단, 진학 학과에서 지정한 대학원 선수과목을 학사과정 졸업 전까지 반드시 이수하셔야 합니다. 또한 복수지원은 불가능합니다.'
    },
    {
      q: 'Q. 평점평균 3.0 이상 기준은 어떻게 계산되나요?',
      a: 'A. F학점을 포함한 총 평점평균이 3.0 이상이어야 합니다. 성적 증명서상에 표시되는 전체 학기 평점평균을 기준으로 삼으며, 당해 학기의 계절수업 성적은 반영되지 않으니 지원 시점에 수료한 학기 성적을 정확히 확인하셔야 합니다.'
    },
    {
      q: 'Q. 연계과정 장학금 수혜 조건인 평점 3.8 이상은 졸업 평점인가요?',
      a: 'A. 네, 그렇습니다. 8학기 이수자(정규졸업 예정자)의 경우 학사과정 최종 졸업 평점평균이 3.8 이상(소수점 셋째자리 절사)이어야 대학원 진학 후 2, 3학기에 등록금 전액 장학금을 지급받을 수 있습니다. 성적 미달 시 장학금 지급 대상에서 제외되므로 성적 관리가 매우 중요합니다.'
    },
    {
      q: 'Q. 연계과정에 합격한 후 중도 포기할 수 있나요?',
      a: 'A. 네, 부득이한 사정으로 중도 포기하고자 하는 경우 학사과정 졸업 마지막 학기 전까지 중도포기 신청서를 소속 대학원 및 학부 학과 행정실에 제출하여 승인을 받아야 합니다. 중도 포기 시 일반 학부생 졸업 요건(졸업시험/논문 등)을 충족해야 졸업이 가능합니다.'
    },
    {
      q: 'Q. 대학원 과목 선이수 6학점은 학부 졸업학점과 대학원 수료학점에 중복 인정되나요?',
      a: 'A. 중복 인정은 되지 않습니다. 학사과정 졸업이수학점 중 일반선택 학점(6학점)으로 감면 혜택을 받으며, 이수한 대학원 6학점은 진학 후 대학원(석사 또는 박사) 수료를 위한 학점으로 고스란히 인정받게 됩니다.'
    }
  ];

  return (
    <div style={{ backgroundColor: '#eef2fa', color: '#0f1f3d', fontFamily: '"Noto Sans KR", sans-serif', padding: '20px' }}>
      {/* Styles */}
      <style>{`
        .guide-container {
          max-width: 1100px;
          margin: 0 auto;
        }
        .hero {
          text-align: center;
          padding: 50px 20px;
          background: linear-gradient(135deg, #001233 0%, #003087 45%, #1565c0 75%, #0a3d82 100%);
          border-radius: 12px;
          color: white;
          margin-bottom: 24px;
        }
        .hero h1 { font-size: 2.2rem; font-weight: 900; margin-bottom: 12px; }
        .hero p { font-size: 1rem; opacity: 0.85; line-height: 1.6; }
        .hero .gold { color: #ffd166; font-weight: 700; }

        .stats-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          background: white;
          border: 1px solid #d8e2f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 12px rgba(0,40,120,0.06);
        }
        .stat-card { text-align: center; padding: 12px; border-right: 1px solid #d8e2f0; }
        .stat-card:last-child { border-right: none; }
        @media(max-width: 768px) {
          .stat-card { border-right: none; border-bottom: 1px solid #d8e2f0; }
          .stat-card:last-child { border-bottom: none; }
        }
        .stat-card .num { font-size: 1.6rem; font-weight: 900; color: #003087; }
        .stat-card .lbl { font-size: 0.8rem; color: #7a8baa; margin-top: 4px; }

        .section-title {
          font-size: 1.6rem; font-weight: 800; color: #003087; margin-top: 40px; margin-bottom: 10px;
          border-bottom: 2px solid #003087; padding-bottom: 8px;
        }
        .section-desc { font-size: 0.95rem; color: #3a4f72; line-height: 1.6; margin-bottom: 24px; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media(max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }

        .program-card {
          background: white; border: 1.5px solid #d8e2f0; border-radius: 12px;
          padding: 24px; box-shadow: 0 4px 12px rgba(0,40,120,0.04);
        }
        .program-card.c1 { border-top: 4px solid #003087; }
        .program-card.c2 { border-top: 4px solid #0d9488; }
        .program-card h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 12px; }
        .program-card p { font-size: 0.9rem; color: #3a4f72; line-height: 1.6; }
        
        .flow-box {
          background: #f0f4f8; padding: 12px; border-radius: 8px; margin-top: 16px;
          font-size: 0.85rem; border-left: 4px solid #003087;
        }
        .flow-box.c2 { border-left-color: #0d9488; }

        .benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .benefit-card {
          background: white; border: 1px solid #d8e2f0; border-radius: 8px; padding: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .benefit-card h4 { font-size: 1rem; font-weight: 700; color: #003087; margin-bottom: 8px; }
        .benefit-card p { font-size: 0.85rem; color: #3a4f72; line-height: 1.5; }

        .schol-card {
          background: white; border: 1px solid #d8e2f0; border-radius: 12px; padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
        }
        .schol-card h4 { font-size: 1.05rem; font-weight: 800; color: #003087; margin-bottom: 12px; }
        .schol-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 8px; }
        .schol-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .schol-table td:first-child { font-weight: 700; color: #003087; width: 120px; }
        .schol-note { background: #fbf0d8; padding: 10px; border-radius: 6px; font-size: 0.8rem; margin-top: 12px; color: #6d4c06; }

        .faq-item { background: white; border: 1px solid #d8e2f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
        .faq-question {
          width: 100%; background: none; border: none; text-align: left; padding: 16px;
          font-size: 0.95rem; font-weight: 700; color: #0f1f3d; cursor: pointer;
          display: flex; justify-content: space-between; align-items: center;
        }
        .faq-question:hover { background: #f7fafc; }
        .faq-answer { padding: 0 16px 16px 16px; font-size: 0.88rem; color: #3a4f72; line-height: 1.6; border-top: 1px solid #f0f4f8; }

        .timeline { position: relative; padding: 10px 0 10px 20px; border-left: 2px solid #003087; margin-top: 20px; }
        .timeline-item { margin-bottom: 20px; position: relative; }
        .timeline-item::before {
          content: ''; position: absolute; left: -25px; top: 4px;
          width: 8px; height: 8px; border-radius: 50%; background: #003087; border: 2px solid white;
        }
        .timeline-title { font-weight: 700; font-size: 0.95rem; color: #003087; }
        .timeline-date { font-size: 0.8rem; color: #7a8baa; margin-bottom: 4px; }
        .timeline-desc { font-size: 0.85rem; color: #3a4f72; }
      `}</style>

      <div className="guide-container">
        {/* Hero Banner */}
        <div className="hero">
          <h1>🎓 학·석사 및 학·석박사통합 연계과정 안내</h1>
          <p>
            학부 재학 중 대학원 교과목을 이수하여 석사·박사 학위를 단기간에 취득하는 특별 연계 제도입니다.<br />
            <span className="gold">모집 기간: 2026. 1. 7.(수) ~ 1. 14.(수)</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="num">4~7학기</div>
            <div className="lbl">학부 재학생 지원 가능</div>
          </div>
          <div className="stat-card">
            <div className="num">3.0점 이상</div>
            <div className="lbl">총 평점평균 기준 (4.5 만점)</div>
          </div>
          <div className="stat-card">
            <div className="num">최대 6학점</div>
            <div className="lbl">매 학기 추가 수강 신청 가능</div>
          </div>
          <div className="stat-card">
            <div className="num">무시험 선발</div>
            <div className="lbl">대학원 입학 특별전형 연계</div>
          </div>
        </div>

        {/* Programs Overviews */}
        <div id="programs">
          <h2 className="section-title">과정별 요약 안내</h2>
          <p className="section-desc">부산대학교 AI거점대학에서 운영하는 2개 핵심 연계 전형 트랙을 소개합니다.</p>
          <div className="grid-2">
            <div className="program-card c1">
              <h3>① 학·석사 연계과정</h3>
              <p>학부 재학 중 대학원 교과목(6학점)을 미리 이수하여 석사 과정을 3학기(1.5년) 만에 마치는 조기 학위 취득 트랙입니다. 대학원 입학시험 없이 100% 무시험 특별전형으로 입학이 허가됩니다.</p>
              <div className="flow-box">
                <strong>📋 전형 흐름</strong>
                <div style={{ marginTop: '4px' }}>
                  학부 4~7학기 선발 → 대학원 과목 선이수 → 학부 조기 졸업(또는 정규졸업) → 대학원 석사 진입 (3학기 수료) → 석사학위 취득
                </div>
              </div>
            </div>

            <div className="program-card c2">
              <h3>② 학·석박사통합 연계과정</h3>
              <p>학부에서 출발하여 석사과정을 거쳐 박사학위까지 다이렉트로 연계되는 초고속 통합 트랙입니다. 석박사 통합과정(총 6학기)으로 진입하여 석사학위 및 박사학위를 최단 기간 내에 취득할 수 있습니다.</p>
              <div className="flow-box c2">
                <strong>📋 전형 흐름</strong>
                <div style={{ marginTop: '4px' }}>
                  학부 4~7학기 선발 → 대학원 과목 선이수 → 학부 조기 졸업(또는 정규졸업) → 대학원 석박통합 진입 (6학기 수료) → 박사학위 취득
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div id="benefits">
          <h2 className="section-title">연계과정 핵심 혜택</h2>
          <p className="section-desc">연계과정에 합격한 학생들에게 주어지는 차별화된 학업 및 행정적 혜택입니다.</p>
          <div className="benefits-grid">
            <div className="benefit-card">
              <h4>⏱ 학위 취득 기간 단축</h4>
              <p>석사과정은 3학기, 석박사 통합과정은 6학기로 단축되어 최단 기간에 학위 취득이 가능합니다.</p>
            </div>
            <div className="benefit-card">
              <h4>📝 졸업요건 및 학점 감면</h4>
              <p>학부 졸업 시 졸업논문 및 졸업시험이 면제되며, 학부 졸업이수학점 중 일반선택 6학점이 감면됩니다.</p>
            </div>
            <div className="benefit-card">
              <h4>📚 매 학기 6학점 추가 수강</h4>
              <p>연계과정 합격 후 학부 졸업 시까지 매 학기 최대 6학점까지 추가로 수강신청을 할 수 있습니다.</p>
            </div>
            <div className="benefit-card">
              <h4>🔬 대학원 학점 이중인정</h4>
              <p>학사과정에서 이수한 대학원 전공과목 6학점은 대학원 진학 후 수료학점으로 고스란히 인정됩니다.</p>
            </div>
          </div>
        </div>

        {/* Scholarship Section */}
        <div id="scholarships">
          <h2 className="section-title">장학 혜택 안내</h2>
          <p className="section-desc">풍부한 대학원 장학금 연계를 통해 연구와 학업에 전념할 수 있도록 재정적으로 지원합니다.</p>
          
          <div className="schol-card">
            <h4>① 연계과정 장학금 (학생과: 510-1282)</h4>
            <table className="schol-table">
              <tbody>
                <tr>
                  <td>지원 대상</td>
                  <td>학·석사 연계과정생 (석사과정 중 2, 3학기 등록금 전액 지원)</td>
                </tr>
                <tr>
                  <td>통합 과정</td>
                  <td>학·석박사통합 연계과정생 (석사 2, 3학기 및 박사 5, 6학기 등록금 전액 지원)</td>
                </tr>
              </tbody>
            </table>
            <div className="schol-note">
              ※ 졸업 평점평균 3.8 이상(소수점 셋째자리 절사)을 유지해야 장학금이 지급됩니다.<br />
              ※ 계약학과 등 일부 학생은 제외될 수 있습니다.
            </div>
          </div>

          <div className="schol-card">
            <h4>② BK21 Bridge 장학금 &amp; 연구지원 장려금 (대학원혁신실: 510-7930)</h4>
            <table className="schol-table">
              <tbody>
                <tr>
                  <td>BK21 Bridge</td>
                  <td>학사과정 최종학기 재학생 중 BK21 참여 학과 학생 대상 월 70만원 (최대 3개월 지급)</td>
                </tr>
                <tr>
                  <td>연구지원 장려금</td>
                  <td>연계과정생 대학원 진학 후 학기당 50만원 (학회 참가비, 연구 자료 수집비 등 연구 활동비 지원)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule / Process Section */}
        <div id="schedule">
          <h2 className="section-title">지원 방법 및 전형 일정</h2>
          <p className="section-desc">2026학년도 1학기 선발 절차 및 전형 일정입니다.</p>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-title">1단계. 지원서 작성 및 제출</div>
              <div className="timeline-date">2026. 1. 7. (수) ~ 1. 14. (수) 18:00까지</div>
              <div className="timeline-desc">소속 학과 행정실 또는 대학원 지원 학과 사무실로 지원서 및 추천서를 제출합니다.</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-title">2단계. 서류 심사 및 면접</div>
              <div className="timeline-date">2026. 1. 19. (월) ~ 1. 23. (금)</div>
              <div className="timeline-desc">각 학과별 전형 기준에 따라 서류 심사 및 면접 고사를 진행합니다.</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-title">3단계. 합격자 발표</div>
              <div className="timeline-date">2026. 2. 6. (금) 예정</div>
              <div className="timeline-desc">부산대학교 대학원 홈페이지 및 소속 단과대학을 통해 합격자가 공고됩니다.</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq">
          <h2 className="section-title">자주 묻는 질문 (FAQ)</h2>
          <p className="section-desc">학석사 연계과정에 관한 대표적인 의문점들에 대한 답변입니다.</p>
          <div className="faq-list">
            {faqList.map((item, index) => {
              const isOpen = !!openFaq[index];
              return (
                <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button className="faq-question" onClick={() => toggleFaq(index)}>
                    <span>{item.q}</span>
                    <span style={{ fontSize: '1.2rem', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>＋</span>
                  </button>
                  {isOpen && <div className="faq-answer">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
