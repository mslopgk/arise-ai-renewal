import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        navigate('/admin');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'invalid_credentials' ? '아이디 또는 비밀번호가 올바르지 않습니다.' : `로그인 실패: ${data.error || res.status}`);
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/logos/pnu-signature.jpg" alt="부산대학교" style={styles.signature} />
        <div style={styles.label}>PNU · 관리자</div>
        <h1 style={styles.title}>학·석사 연계과정<br/>관리자 콘솔</h1>
        <p style={styles.muted}>학사사무실 전용. 신청 결과 조회 및 시트 미러링.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.lbl}>아이디</label>
          <input style={styles.input} type="text" value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" />
          <label style={styles.lbl}>비밀번호</label>
          <input style={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
      <img src="/logos/pnu-symbol-grid.jpg" alt="" aria-hidden="true" style={styles.cornerSymbol} />
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', background:'#0e0f13', color:'#e8e8ea', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif', position:'relative', overflow:'hidden' },
  card: { background:'#16181f', border:'1px solid #2a2d38', borderRadius:12, padding:32, width:'100%', maxWidth:380, position:'relative', zIndex:2 },
  signature: { display:'block', height:38, width:'auto', background:'#fff', padding:'6px 10px', borderRadius:6, marginBottom:18 },
  cornerSymbol: { position:'absolute', right:-50, bottom:-50, width:280, height:'auto', opacity:0.06, pointerEvents:'none', zIndex:1, filter:'grayscale(1)' },
  label: { fontSize:11, letterSpacing:'0.2em', color:'#888', textTransform:'uppercase', marginBottom:8 },
  title: { fontSize:22, fontWeight:700, marginBottom:6, lineHeight:1.3 },
  muted: { color:'#7a7a82', fontSize:13, marginBottom:20, lineHeight:1.5 },
  error: { background:'#3a1c1c', border:'1px solid #5a2a2a', color:'#ff8a8a', padding:10, borderRadius:6, marginBottom:12, fontSize:14 },
  lbl: { display:'block', fontSize:12, color:'#aaa', marginTop:10, marginBottom:4 },
  input: { width:'100%', padding:10, background:'#0e0f13', border:'1px solid #2a2d38', borderRadius:6, color:'#fff', fontSize:14, fontFamily:'inherit' },
  button: { width:'100%', marginTop:18, padding:'12px 16px', background:'#3672b8', color:'#fff', border:'none', borderRadius:6, fontSize:15, fontWeight:600, cursor:'pointer' },
};
