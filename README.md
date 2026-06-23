# pnu-grad

부산대학교 **학·석사 연계과정 사전 신청 시스템**.
일반대학원 학과 디렉터리를 탐색하고, 자격·장학을 자가 점검하고, 사전 신청서를 제출하는 공개 사이트 + 운영 관리자 콘솔.

라이브: **https://arise-ai.pusan.ac.kr**

> 📦 **이 저장소(arise-ai-renewal)는 정적 HTML을 React SPA로 전면 통합한 버전입니다.**
> 무엇이 어떻게 바뀌었는지는 [`MIGRATION.md`](./MIGRATION.md) 참고. (원본 프로덕션: `arise-pnu-ai`)

---

## 주요 기능

**공개 (학생·학과 관계자)**
- **학과 디렉터리** — 계열 → 학과 → 세부전공 3단계 탐색, BK21 참여학과(★)·키워드 필터 (`/admission-v3-dark.html`)
- **자격 자가진단** — 학부 소속·이수학기·평점 등으로 연계과정 지원 가능 여부 즉시 확인, 클라이언트 계산만(미저장) (`/eligibility.html`)
- **장학 해당 여부 확인** — 학부생 관점에서 4종 장학 예상 판정 (`/scholarship.html`)
- **사전 신청(응답)** — Google OAuth(`@pusan.ac.kr` 도메인 게이트) 후 희망 트랙 + 3지망 제출. 1인 1응답
- **학과 정보 수정/삭제 신청** — 학과 관계자가 디렉터리 정보 수정·추가 또는 학과/세부전공 삭제를 요청(로그인 불필요). 검토 큐 적재 (`/dept-edit-request`)

**관리자 (`/admin`, 자체 ID/PW)**
- 신청 현황 통계 + Google Sheets 미러 게이트웨이 + CSV 다운로드
- 학과 디렉터리 CRUD(학과·세부전공·이미지)
- **학과 수정 신청 검토 큐** — 제출 검토 후 승인 시 디렉터리에 자동 반영(또는 삭제)

도메인 용어·정책은 [`CONTEXT.md`](./CONTEXT.md), 설계 결정은 [`docs/adr/`](./docs/adr/) 참고.

---

## 기술 스택
- **프론트엔드**: Vite + React SPA(관리자·게이트웨이·데이터룸) + 정적 공개 페이지(`frontend/public/*.html`). 폰트·차트·애니메이션 전부 로컬 번들 → **폐쇄망(인터넷 차단)에서도 동작**.
- **백엔드**: Express(Node 22). 운영 모드에선 `frontend/dist`를 같은 포트(3001)에서 정적 서빙 + SPA 라우팅.
- **DB**: **PostgreSQL** (단일 진실 공급원). `pg` 풀 사용. 부팅 시 `initSchema()`가 `CREATE TABLE IF NOT EXISTS`로 스키마 보장.
- **인증**: 신청자 = Google OAuth(`@pusan.ac.kr`) / 관리자 = username + bcrypt PW. 두 토큰(쿠키) 격리.
- **미러(선택)**: 응답을 Google Sheets에 일방향 append(시트는 거울, SoT 아님 — [`docs/adr/0001`](./docs/adr/0001-sheets-as-mirror-not-source-of-truth.md)).

```
[브라우저] ─HTTPS─▶ nginx(80/443, TLS 종단) ─▶ Express :3001 ─▶ PostgreSQL :5432
                                                  └─ frontend/dist (정적 SPA) 서빙
```

---

## 로컬 개발

**사전 준비**: Node 20+, PostgreSQL 14+ 실행 중.

```bash
# 1) DB (최초 1회) — psql 관리자로
#    CREATE USER arise WITH PASSWORD 'arise';  CREATE DATABASE arise OWNER arise;

# 2) 의존성
cd backend  && npm install
cd ../frontend && npm install

# 3) 백엔드 .env (backend/.env.example 복사 — dev 기본값 그대로 OK)

# 4) 스키마 + 설문/관리자 시드
cd ../backend && npm run init-db

# 5) 실행 (각 터미널) — 또는 루트의 start.bat
cd backend  && npm run dev    # Express  http://localhost:3001
cd frontend && npm run dev    # Vite     http://localhost:5173
```

- 인덱스 http://localhost:5173/ · 학과 디렉터리 `/admission-v3-dark.html` · 관리자 `/admin/login`
- dev에선 OAuth 미구성 시 신청자 로그인은 비활성(관리자 로그인·디렉터리·자가진단은 정상).

---

## 환경변수 (`backend/.env`)
전체 목록은 [`backend/.env.example`](./backend/.env.example). 핵심:

| 변수 | dev | prod (arise-ai.pusan.ac.kr) |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://arise-ai.pusan.ac.kr` |
| `PGHOST/PGUSER/PGPASSWORD/PGDATABASE` | 로컬 Postgres | compose `postgres` 서비스 |
| `JWT_SECRET` | dev placeholder | `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI` | (선택) | OAuth 클라이언트 + `…/auth/google/callback` |
| `ADMIN_BOOTSTRAP_USERNAME/PASSWORD` | 시드 후 비움 | 시드 후 비움 |
| `GOOGLE_SHEETS_ID`, `…SA_KEY_PATH` | 비우면 미러 OFF | (선택) |

> `NODE_ENV=production`이어야 secure 쿠키가 켜진다(HTTPS 프록시 뒤 `trust proxy`).

---

## 프로덕션 — arise-ai.pusan.ac.kr

부산대 내부 서버(Ubuntu, 폐쇄망)에서 **Docker compose**로 운영: `nginx`(80→443 강제, 부산대 와일드카드 TLS) + `was`(Express, self-contained 이미지에 `frontend/dist` 내장) + `postgres:16`(`arise_pgdata` 볼륨).

**재배포 요약** (무중단 — `was`만 재생성, DB·nginx 보존):
```bash
docker build --provenance=false -t arise-was:latest .
docker save arise-was:latest | gzip > images.tar.gz
# → 서버 ~/arise-deploy 로 scp → docker load → (cd ~/arise-stack && docker compose up -d)
```
새 컬럼/테이블은 부팅 시 `initSchema()`가 자동 반영(별도 마이그레이션 불필요).

**부속 사이트(서브도메인)**: 같은 nginx·와일드카드 인증서로 부속 AI 기관 사이트도 호스팅 — `airc`/`axrc`(AI융합연구원)·`aiedu`/`axedu`(AI융합교육원)·`aigs`/`axgs`(AI대학원). 현재 "준비 중" 정적 플레이스홀더이며 공개 접속은 DNS A레코드(전산팀) 대기. 빌드물을 서버 `~/arise-stack/sites/<name>/`에 두면 즉시 서빙(상세 → DEPLOYMENT.md).

**접속 제약·자격증명·운영 명령 등 상세는 → [`deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md)** (현행 인수인계 문서). 일반 설치 가이드는 [`DEPLOY.md`](./DEPLOY.md).

---

## 보안 체크리스트
- [ ] `JWT_SECRET` 랜덤 48+ 바이트
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` 강한 PW로 시드 후 `.env`에서 제거
- [ ] `NODE_ENV=production` (secure 쿠키)
- [ ] OAuth redirect URI / consent에 prod 도메인 등록
- [ ] DB 볼륨 백업(`arise_pgdata`)
- [ ] (검토) 공개 제출 엔드포인트 rate-limit — `/dept-edit-request`는 로그인 없이 제출 가능하므로 스팸 유입 시 관리자 검토 큐에서 정리

---

## 문서
- [`CONTEXT.md`](./CONTEXT.md) — 도메인 용어, 인증 모델, 저장/미러 정책
- [`deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md) — 운영 서버 인수인계(접속·스택·재배포·변경 이력)
- [`docs/adr/`](./docs/adr/) — 설계 결정 기록(시트 미러·관리자 인증·데이터 최소화 등)
</content>
