import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const ERROR_MESSAGES = {
  domain_not_allowed: '허용되지 않은 이메일 도메인입니다. (@pusan.ac.kr 만 가능)',
  invalid_state: '인증 상태가 유효하지 않습니다. 다시 시도해주세요.',
  oauth_failed: 'Google 인증에 실패했습니다.',
};

function safeReturnTo(raw) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch {}
  return null;
}

export default function Login() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  useEffect(() => {
    api.config().then(setConfig);
    const e = params.get('error');
    if (e) setError(ERROR_MESSAGES[e] || e);
  }, [params]);

  if (!config) return <div className="container">로딩...</div>;

  const googleHref = returnTo
    ? `/auth/google?returnTo=${encodeURIComponent(returnTo)}`
    : '/auth/google';

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>
      <p className="muted">부산대학교 이메일(@{config.allowedDomain})로만 로그인 가능합니다.</p>
      {returnTo && (
        <p className="muted" style={{ fontSize: 13 }}>
          로그인 후 <code>{returnTo}</code> 으로 이동합니다.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {config.oauthEnabled ? (
        <div className="card">
          <a href={googleHref}>
            <button className="primary" style={{ width: '100%' }}>Google로 로그인</button>
          </a>
        </div>
      ) : (
        <div className="error">로그인이 구성되지 않았습니다. 관리자에게 문의하세요.</div>
      )}
    </div>
  );
}
