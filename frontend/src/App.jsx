import { Routes, Route, Navigate } from 'react-router-dom';

// Pages & Auth
import Gateway from './pages/Gateway.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DeptEditRequest from './pages/DeptEditRequest.jsx';

// 계산기 2종 (Task 2.4 — 실제 컴포넌트로 교체)
import EligibilityCheck from './routes/EligibilityCheck.jsx';
import ScholarshipCheck from './routes/ScholarshipCheck.jsx';

// Bymonolog variant
import BymonologPage from './variants/bymonolog/page.jsx';
import BymonologHubPage from './variants/bymonolog/hub/page.jsx';
import BymonologGradPage from './variants/bymonolog/grad/page.jsx';
import BymonologAuraPage from './variants/bymonolog/aura/page.jsx';

// Google variant
import GooglePage from './variants/google/page.jsx';

// 단계 3에서 실제 컴포넌트로 교체할 placeholder (admission 전용)
function Placeholder({ name }) {
  return <div className="container">[{name}] 준비 중 — 단계별 이식 대기</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Gateway */}
      <Route path="/" element={<Gateway />} />

      {/* 계산기 2종 */}
      <Route path="/eligibility" element={<EligibilityCheck />} />
      <Route path="/scholarship" element={<ScholarshipCheck />} />

      {/* admission (단계 3에서 element 교체) */}
      <Route path="/admission" element={<Placeholder name="AdmissionPage" />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Auth / Login */}
      <Route path="/login" element={<Login />} />

      {/* 학과 정보 수정 신청 */}
      <Route path="/dept-edit-request" element={<DeptEditRequest />} />

      {/* Bymonolog routes */}
      <Route path="/bymonolog" element={<BymonologPage />} />
      <Route path="/bymonolog/hub" element={<BymonologHubPage />} />
      <Route path="/bymonolog/grad" element={<BymonologGradPage />} />
      <Route path="/bymonolog/aura" element={<BymonologAuraPage />} />

      {/* Google variant */}
      <Route path="/google" element={<GooglePage />} />

      {/* === 레거시 .html URL 보존(외부 링크·QR·북마크) === */}
      {/* 전제: 대응 public/*.html 파일이 삭제되어 있어야 발동(단계 2·3에서 같은 커밋으로 삭제) */}
      <Route path="/eligibility.html" element={<Navigate to="/eligibility" replace />} />
      <Route path="/scholarship.html" element={<Navigate to="/scholarship" replace />} />
      <Route path="/admission-v3-dark.html" element={<Navigate to="/admission" replace />} />
      {/* arise는 nginx에서 이미 301(/) — RR 보강(dev 포함) */}
      <Route path="/arise.html" element={<Navigate to="/" replace />} />

      {/* Fallback to gateway */}
      <Route path="*" element={<Gateway />} />
    </Routes>
  );
}
