import React from 'react';
import { Link } from 'react-router-dom';
import './gateway.css';

export default function Gateway() {
  return (
    <div className="gateway-container">
      <div className="gateway-wrap">
        
        {/* Brand Header */}
        <div className="brand">
          <img className="mark" src="/logos/pnu-symbol-color.jpg" alt="부산대학교" />
          <div>
            <h1>부산대학교 <span>AI 거점대학육성사업단</span></h1>
            <div className="sub">A.U.R.A · Busan National University</div>
          </div>
        </div>

        {/* Hero Content Area */}
        <div className="gateway-box">
          <div className="gateway-video">
            <video 
              muted 
              autoPlay 
              loop 
              playsInline 
              preload="auto" 
              src="/media/pnu80-intro.mp4" 
              aria-label="부산대학교 소개 영상"
            />
          </div>

          <ul className="gateway-right" id="main">
            <li className="gateway-slogan">
              <span className="eyebrow">ARISE · AI University</span>
              <h2>AI로 여는 부산대학교의<br />다음 100년</h2>
              <p>원하는 메뉴를 선택하세요.</p>
            </li>

            {/* Menu 1: Direct routing to dark site */}
            <li>
              <Link className="gateway-btn aura" to="/bymonolog">
                <span className="num">01</span>
                <span className="org">AI 거점대학육성사업단</span>
                <strong>A.U.R.A 마스터플랜 및 데이터룸</strong>
                <span className="desc">부산대학교 AI 대전환 추진 전략 및 성과 분석 데이터룸</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </Link>
            </li>

            {/* Menu 2: Google Partnership */}
            <li>
              <Link className="gateway-btn google" to="/google">
                <span className="num">02</span>
                <strong>PNU × Google AI Eco System</strong>
                <span className="desc">Google과 함께하는 AI 교육·연구 협력</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </Link>
            </li>

            {/* Menu 3: Application process (Direct static page routing) */}
            <li>
              <a className="gateway-btn apply" href="/admission-v3-dark.html">
                <span className="num">03</span>
                <strong>학·석사 연계과정 신청</strong>
                <span className="desc">대학원 연계과정 안내 · 학과 디렉터리 · 사전 신청</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </a>
            </li>
          </ul>
        </div>

        <footer>ARISE PNU AI · 부산대학교 AI 거점대학</footer>
      </div>
    </div>
  );
}
