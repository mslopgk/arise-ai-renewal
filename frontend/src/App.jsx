import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages & Auth
import Gateway from './pages/Gateway.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// Bymonolog variant
import BymonologPage from './variants/bymonolog/page.jsx';
import BymonologHubPage from './variants/bymonolog/hub/page.jsx';
import BymonologGradPage from './variants/bymonolog/grad/page.jsx';
import BymonologAuraPage from './variants/bymonolog/aura/page.jsx';

// Google variant (PNU × Google AI Ecosystem)
import GooglePage from './variants/google/page.jsx';

// Datarooms
import Regional from './datarooms/Regional.jsx';
import Comparison from './datarooms/Comparison.jsx';
import Faculty from './datarooms/Faculty.jsx';
import UGLinkDashboard from './datarooms/UGLinkDashboard.jsx';
import UGLinkGuide from './datarooms/UGLinkGuide.jsx';
import AXMajors from './datarooms/AXMajors.jsx';

function RedirectToAdmission() {
  useEffect(() => { window.location.replace('/admission-v3-dark.html'); }, []);
  return <div className="container">이동 중...</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Gateway */}
      <Route path="/" element={<Gateway />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Auth / Login */}
      <Route path="/login" element={<Login />} />

      {/* Bymonolog routes */}
      <Route path="/bymonolog" element={<BymonologPage />} />
      <Route path="/bymonolog/hub" element={<BymonologHubPage />} />
      <Route path="/bymonolog/grad" element={<BymonologGradPage />} />
      <Route path="/bymonolog/aura" element={<BymonologAuraPage />} />

      {/* Google variant */}
      <Route path="/google" element={<GooglePage />} />

      {/* Datarooms */}
      <Route path="/dataroom/regional" element={<Regional />} />
      <Route path="/dataroom/comparison" element={<Comparison />} />
      <Route path="/dataroom/faculty" element={<Faculty />} />
      <Route path="/dataroom/uglink-dashboard" element={<UGLinkDashboard />} />
      <Route path="/dataroom/uglink-guide" element={<UGLinkGuide />} />
      <Route path="/dataroom/ax-majors" element={<AXMajors />} />

      {/* Fallback to gateway */}
      <Route path="*" element={<Gateway />} />
    </Routes>
  );
}
