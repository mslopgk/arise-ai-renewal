# PNU-GRAD 배포 가이드

학·석사 연계과정 신청 사이트(부산대 AI 거점대학) 배포 문서.
배포 담당자가 이 문서만 보고 처음부터 띄울 수 있도록 정리함.

---

## 1. 구성 개요

```
[브라우저] ──> (선택: 리버스 프록시 / HTTPS) ──> Express :3001 ──> PostgreSQL :5432
                                                   │
                                                   └─ frontend/dist (정적 SPA) 서빙
```

- **프론트엔드**: Vite + React. `frontend/dist`로 빌드됨. 폰트·GSAP·Plotly 차트가 **전부 로컬 번들**되어 있어 인터넷 없이도 동작(폐쇄망 OK).
- **백엔드**: Express(Node.js). `node src/server.js`. 운영 모드에선 위 `dist`를 같은 포트(3001)에서 정적 서빙 + SPA 라우팅 처리.
- **DB**: PostgreSQL **필수**. 서버가 시작하자마자 DB에 연결하므로, DB가 없으면 백엔드가 뜨지 않음.

---

## 2. 사전 준비물 (대상 서버에 설치)

| 항목 | 버전 | 비고 |
|---|---|---|
| Node.js | 20 LTS 이상 | `node -v` 로 확인 |
| PostgreSQL | 14 이상 | 5432 포트 |
| 코드 | 이 저장소 전체 | `frontend/`, `backend/` 포함 |

> 폐쇄망 서버라면 Node.js / PostgreSQL 설치 파일을 미리 받아 반입해야 함.

---

## 3. 배포 절차 (순서대로)

아래는 Windows PowerShell 기준. (리눅스도 명령만 동일 의미로 치환하면 됨)

### 3-1. PostgreSQL DB / 계정 생성

기본값으로 `user=arise / password=arise / db=arise` 를 기대함. (4-1의 `.env`에서 바꿀 수 있음)

```sql
-- psql 관리자(postgres)로 접속해서 실행
CREATE USER arise WITH PASSWORD 'arise';
CREATE DATABASE arise OWNER arise;
```

### 3-2. 백엔드 환경설정 파일 작성

`backend/.env` 파일을 새로 만든다. (예시는 `backend/.env.example` 참고)
**운영 구성** — 도메인 `arise-ai.pusan.ac.kr` + HTTPS + Google 로그인:

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://arise-ai.pusan.ac.kr

# DB (위 3-1 기본값과 일치해야 함). 다른 DB면 DATABASE_URL 한 줄로 대체 가능.
PGHOST=localhost
PGPORT=5432
PGUSER=arise
PGPASSWORD=arise
PGDATABASE=arise
# DATABASE_URL=postgres://arise:arise@localhost:5432/arise

# 관리자/인증 토큰 서명키 (반드시 임의의 긴 문자열로 교체)
JWT_SECRET=<48바이트 정도의 임의 문자열로 교체>
ADMIN_JWT_EXPIRES_IN=2h

# 최초 관리자 계정 부트스트랩 (init-db 시 1회 생성 → 생성 후 이 두 줄은 지우는 걸 권장)
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=<관리자 초기 비밀번호>

# === Google 로그인(신청자 인증) ===
# 콘솔의 리디렉션 URI와 GOOGLE_REDIRECT_URI는 글자 단위로 완전히 같아야 함 (7장 참고)
GOOGLE_CLIENT_ID=<구글 OAuth 클라이언트 ID>
GOOGLE_CLIENT_SECRET=<구글 OAuth 클라이언트 시크릿>
GOOGLE_REDIRECT_URI=https://arise-ai.pusan.ac.kr/auth/google/callback
ALLOWED_EMAIL_DOMAIN=pusan.ac.kr

# === Google Sheets 미러(선택) — 비우면 비활성 ===
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_SA_KEY_PATH=./credentials/sheets-sa.json
```

> `JWT_SECRET`은 관리자 로그인 토큰 서명에 쓰이므로 **반드시 교체**. 기본값/빈 값으로 두지 말 것.
> HTTPS 운영이므로 `NODE_ENV=production`이어야 secure 쿠키가 켜진다(프록시는 4장).

### 3-3. 의존성 설치

```powershell
cd <repo>\backend
npm install
cd <repo>\frontend
npm install
```

### 3-4. DB 초기화 (스키마 + 설문/관리자 시드)

```powershell
cd <repo>\backend
npm run init-db
```

- 설문(id=1)과 `ADMIN_BOOTSTRAP_*` 계정을 생성한다.
- 완료 후 `backend/.env`에서 `ADMIN_BOOTSTRAP_USERNAME/PASSWORD` 두 줄은 지우는 걸 권장.

### 3-5. 프론트엔드 빌드

```powershell
cd <repo>\frontend
npm run build      # frontend\dist 생성
```

### 3-6. 백엔드(운영) 실행

```powershell
cd <repo>\backend
$env:NODE_ENV = "production"
node src/server.js
```

정상 로그 예:
```
Backend listening on http://localhost:3001 (production)
[prod] Static serving: ...\frontend\dist
```

→ 브라우저에서 **http://<서버주소>:3001/** 접속.
- 게이트웨이에서 `01 A.U.R.A 마스터플랜 및 데이터룸` → 다크 사이트로 이동
- 관리자: `http://<서버주소>:3001/admin/login` (3-2의 부트스트랩 계정)

> 상시 구동하려면 Windows 서비스 등록(NSSM 등) 또는 PM2/작업 스케줄러로 `node src/server.js`를 데몬화 권장.

---

## 4. 도메인 + HTTPS (운영 — `arise-ai.pusan.ac.kr`)

**구조:** 인터넷 → 리버스 프록시(443, **발급받은 SSL 인증서로 TLS 종료**) → `http://localhost:3001`(Express).
Express는 직접 HTTPS를 하지 않는다. `trust proxy`가 켜져 있어 프록시가 보내는 `X-Forwarded-Proto`를 신뢰하고, prod에서 secure 쿠키를 발급한다.

**선행 조건**
- DNS: `arise-ai.pusan.ac.kr` A 레코드가 이 서버 공인/내부 IP를 가리킬 것 (pusan.ac.kr 망 담당 부서 협조).
- 방화벽: 외부 → 서버 **443 inbound** 허용. (HTTP→HTTPS 리다이렉트를 쓰면 80도)
- 인증서 파일 2개 준비: 인증서(체인 포함) + 개인키. 예) `arise-ai.pusan.ac.kr.crt`(또는 `fullchain.pem`), `arise-ai.pusan.ac.kr.key`.
  - `.pfx`(PKCS#12) 한 파일로 받았다면 IIS는 그대로 쓰고, Caddy/nginx는 crt/key(PEM)로 변환 필요:
    `openssl pkcs12 -in cert.pfx -clcerts -nokeys -out fullchain.pem` / `openssl pkcs12 -in cert.pfx -nocerts -nodes -out privkey.pem`

### 옵션 A — Caddy (권장, Windows에서 간단)

`caddy.exe`와 아래 `Caddyfile`을 같은 폴더(예: `<repo>\caddy\`)에 두고 실행.
**발급받은 인증서를 직접 지정**하므로 Let's Encrypt(인터넷 ACME) 없이 동작한다.

```
arise-ai.pusan.ac.kr {
    tls C:\certs\fullchain.pem C:\certs\privkey.pem
    encode zstd gzip
    reverse_proxy localhost:3001
}
```

```powershell
cd <repo>\caddy
.\caddy.exe run        # 또는 서비스 등록: caddy start
```

> `start-caddy.bat`은 기존에 Let's Encrypt 자동발급을 가정했었음. 위처럼 `tls <crt> <key>` 줄을 넣은 Caddyfile을 쓰면 받은 인증서로 동작한다. (repo에 caddy.exe/Caddyfile은 미포함 — 담당자가 배치)

### 옵션 B — nginx

```nginx
server {
    listen 443 ssl;
    server_name arise-ai.pusan.ac.kr;

    ssl_certificate     /etc/ssl/arise-ai/fullchain.pem;
    ssl_certificate_key /etc/ssl/arise-ai/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # secure 쿠키에 필수
    }
}
server {                      # http → https 리다이렉트
    listen 80;
    server_name arise-ai.pusan.ac.kr;
    return 301 https://$host$request_uri;
}
```

### 옵션 C — IIS (Windows)

1. 받은 `.pfx`를 서버 인증서로 가져오기(인증서 관리자).
2. 사이트에 **https 443 바인딩** + 해당 인증서 선택.
3. **URL Rewrite + ARR**로 리버스 프록시: 모든 요청 → `http://localhost:3001`. `X-Forwarded-Proto=https` 헤더가 전달되도록 설정.

> 어떤 프록시든 핵심은 **(1) 443에서 받은 인증서로 TLS 종료, (2) `localhost:3001`로 평문 전달, (3) `X-Forwarded-Proto: https` 헤더 전달** 세 가지다.

---

## 5. 폐쇄망(인터넷 차단) 환경에서의 동작 정리

| 기능 | 폐쇄망 동작 | 비고 |
|---|---|---|
| 페이지/레이아웃 | ✅ 정상 | |
| 폰트(Pretendard, JetBrains Mono 등) | ✅ 정상 | 로컬 번들됨 |
| GSAP 스크롤 애니메이션 | ✅ 정상 | JS 번들 포함 |
| Plotly 차트(지역 데이터룸) | ✅ 정상 | `public/vendor/plotly-2.26.0.min.js` 로컬 |
| 관리자 로그인(자체 ID/PW) | ✅ 정상 | DB만 있으면 됨 |
| Google 로그인(신청자) | ❌ 실패 | 구글 서버 접속 필요 — 정상적인 제약 |
| Google Sheets 미러 | ❌ 비활성 | 〃 |
| 관리자 화면의 "시트 열기" 링크 | ❌ 안 열림 | 외부 링크라 정상 |

> 폐쇄망 동작을 사전 검증하려면 인터넷 되는 PC에서 `closednet-sim.bat`(관리자 권한)로 구글 도메인만 차단 → 사이트 확인 → 끝나면 `[2] Block OFF`로 복구.

---

## 6. 제공된 배치 파일(.bat) 요약 (Windows, repo 루트)

| 파일 | 용도 |
|---|---|
| `start.bat` | 개발 모드. 백엔드(:3001)+프론트(:5173) 각각 dev 서버로 실행 |
| `build-test.bat` | 로컬에서 운영 흉내: 빌드 → 백엔드(prod) 실행 (DB 필요) |
| `start-prod.bat` | 운영 실행: 프론트 빌드 → 백엔드 실행 |
| `start-caddy.bat` | Caddy HTTPS 리버스 프록시 (caddy.exe/Caddyfile 별도 필요) |
| `closednet-sim.bat` | 폐쇄망 흉내 테스트(hosts로 구글 차단/복구, 관리자 권한) |
| `stop.bat` | 3001/5173 포트 점유 프로세스 종료 |

> 위 .bat은 보조용. 운영 서버에서는 3장 절차(특히 3-6)를 직접 실행하는 것을 권장.

---

## 7. Google OAuth 화이트리스트 (확정)

OAuth는 **두 종류의 "허용 주소"** 가 모두 맞아야 동작한다. 헷갈리기 쉬우니 분리한다.

### (A) 방화벽/프록시 egress 화이트리스트 — 전부 TCP **443(HTTPS)**

서버와 사용자 브라우저가 구글로 나가는 연결. 폐쇄망이라면 아래를 **outbound 허용** 해야 OAuth가 된다.
(코드가 실제로 호출하는 엔드포인트 기준 — `auth.js`, `sheets.js` 확인)

| 도메인 | 연결 주체 | 용도 | 필요 시점 |
|---|---|---|---|
| `accounts.google.com` | **사용자 브라우저** → Google | 로그인/동의 화면 | OAuth (필수) |
| `oauth2.googleapis.com` | **백엔드 서버** → Google | 인가코드→토큰 교환, 서비스계정 토큰 | OAuth (필수) + Sheets |
| `www.googleapis.com` | **백엔드 서버** → Google | ID 토큰 서명 검증용 공개키(cert) 조회 | OAuth (필수) |
| `sheets.googleapis.com` | **백엔드 서버** → Google | 응답을 스프레드시트에 기록 | Sheets 미러 쓸 때만 |
| `*.googleusercontent.com` | 사용자 브라우저 | 프로필 사진 표시 | 선택(미관용) |
| `*.gstatic.com` | 사용자 브라우저 | 로그인 화면 정적 리소스 | 선택(미관용) |

> 위 4개(`accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`, `sheets.googleapis.com`)가
> 프로젝트 기준 핵심 화이트리스트다. `build-test.bat` / `closednet-sim.bat`가 점검하는 도메인과 동일하다.
> **이 주소들이 막히면 Google 로그인은 동작하지 않는다(설계상 정상).** 자체 관리자 로그인은 영향 없음.

### (B) Google Cloud Console — OAuth 클라이언트에 등록할 주소

[Google Cloud Console] → API 및 서비스 → 사용자 인증 정보 → 해당 OAuth 2.0 클라이언트:

- **승인된 리디렉션 URI (Authorized redirect URIs)** — `backend/.env`의 `GOOGLE_REDIRECT_URI` 와 **문자 단위로 완전히 동일**해야 함:
  ```
  https://arise-ai.pusan.ac.kr/auth/google/callback
  ```
  (개발용으로 `http://localhost:3001/auth/google/callback` 도 함께 등록 가능)

- **승인된 JavaScript 원본 (Authorized JavaScript origins)** — 이 프로젝트는 서버사이드 리다이렉트 방식이라 필수는 아니지만, 등록한다면 스킴+호스트만:
  ```
  https://arise-ai.pusan.ac.kr
  ```

- **스코프**: `openid`, `email`, `profile` (코드에 고정)
- **도메인 게이트**: `@pusan.ac.kr` 메일만 허용(`.env`의 `ALLOWED_EMAIL_DOMAIN`, 서버측 검증). `hd` 힌트도 동일 값.

### ⚠ 반드시 알아둘 제약

1. **리디렉션 URI는 HTTPS여야 함.** Google은 `http://` 리디렉션을 **거부**한다(예외: `http://localhost`).
   → 내부망 IP(`http://192.168.x.x:3001/...`)로는 Google 로그인이 **불가**. 도메인 + HTTPS(사내 인증서 포함)가 필요.
2. `.env`의 `GOOGLE_REDIRECT_URI` 와 콘솔의 리디렉션 URI가 **단 한 글자라도 다르면**(끝 슬래시, http/https, 포트 포함) `redirect_uri_mismatch` 로 실패.
3. **완전 폐쇄망(인터넷 차단)에서는 Google 로그인 자체가 불가능**하다. 위 (A) 주소를 열 수 없는 환경이면, 신청자 인증은 Google 로그인 대신 다른 방식이 필요하다(현재 코드는 Google 로그인 전용). 관리자 화면은 자체 ID/PW라 영향 없음.

---

## 8. 자주 나는 오류

| 증상 | 원인 / 조치 |
|---|---|
| `Cannot find package 'express'` | 백엔드 의존성 미설치 → `cd backend && npm install` |
| `ECONNREFUSED ... :5432` | PostgreSQL 미실행/미생성 → 3-1 수행, 서비스 기동 확인 |
| 화면은 뜨는데 차트가 "로딩 중"에서 멈춤 | `public/vendor/plotly-2.26.0.min.js` 누락 → 빌드 다시(`npm run build`) |
| 관리자 로그인 토큰 오류 | `.env`의 `JWT_SECRET` 미설정 → 임의 문자열로 설정 후 재시작 |
| prod인데 정적 서빙 안 됨/`dist 없음` 경고 | `frontend`에서 `npm run build` 먼저 |
