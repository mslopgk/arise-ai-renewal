# pnu-grad 배포 인수인계 (arise-ai.pusan.ac.kr)

최초 배포 2026-06-04 · **최종 현행화 2026-06-17** · 대상: `ubuntu@164.125.19.178:11097` (내부 10.125.19.178) · Ubuntu 24.04 폐쇄망

## 접근 제약 (중요)
- **SSH(11097)는 화이트리스트된 IP에서만 접속 가능** — 일반 PC/외부망에선 timeout (2026-06-12 확인).
- 화이트리스트 아닌 PC에서 작업해야 할 땐 자급자족 번들을 만들어 화이트리스트 PC에서 실행 — 패턴 예시: `deploy/rollout-2026-06-12/` (bat 더블클릭 → scp → 백업 → 적용 → 검증 → 실패 시 자동 롤백).
- 80/443은 부산대가 외부 포워딩 → 사이트 자체는 전세계 도달 가능. 서버는 폐쇄망(인터넷 불가)이라 이미지는 `docker load`로 반입.

## 현재 상태 (LIVE, 2026-06-12 확인)
- **Docker 29.5.3** 오프라인 설치(static binaries + systemd, 부팅 자동시작)
- **스택**: 서버 `~/pnug-stack/docker-compose.yml`이 원본 (레포의 docker-compose.https.yml은 8491bc3에서 삭제됨)
  = `nginx`(80/443 TLS 종단) + `was`(Express) + `postgres:16`. 컨테이너명 `pnug-{nginx,was,postgres}-1`.
- **was 이미지는 self-contained** (frontend dist 내장, bind-mount 없음; `sheets-sa.json`만 마운트) — 2026-06-08 전환.
- **인증서: 부산대 공식 와일드카드** `*.pusan.ac.kr` (GlobalSign RSA OV, SAN: `*.pusan.ac.kr`/`*.pnu.edu`/`pusan.ac.kr`), **만료 2027-01-02**.
  - 위치: `~/pnug-stack/certs/{fullchain.pem, privkey.pem}` (nginx 컨테이너에 `/etc/nginx/certs`로 마운트)
  - **갱신**: 전산팀에서 새 와일드카드 수령 → 위 두 파일 교체 → `docker exec pnug-nginx-1 nginx -s reload`
  - ~~Let's Encrypt + acme.sh (HTTP-01 stateless)~~ → **폐기됨** (2026-06-08 와일드카드로 교체. acme 스크립트·:80 챌린지 location 불필요)
  - 참고: `pusan.ac.kr`은 브라우저 **HSTS preload** 도메인 — 도메인 접속은 항상 HTTPS로 강제되며, 유효 인증서가 필수(만료 시 우회 불가 전면 차단).
- **Google OAuth: 설정 완료** — `/auth/google`이 Google로 302 (2026-06-12 확인). redirect URI `https://arise-ai.pusan.ac.kr/auth/google/callback`.
- **HTTP(80) → HTTPS 301 강제 적용됨** (2026-06-12, 검증 완료: http→301 / https→200).
- DB: PostgreSQL 마이그레이션·시드 완료. 볼륨 `pnug_pgdata`.

## 해결된 문제: 내부망 관리자 로그인 무한 루프 (2026-06-12 분석·적용 완료)
- **증상**: 부산대 내부망에서 관리자 로그인 → 다시 로그인창 무한 반복. 외부망에선 정상.
- **원인**: prod에서 admin/OAuth 쿠키가 항상 `Secure`(backend/src/admin.js, auth.js)인데, 당시 nginx가
  **80 포트를 리다이렉트 없이 평문 서빙**. 내부 사용자가 `http://`(주로 IP 직접 접속)로 들어오면
  브라우저가 Secure 쿠키 저장을 거부 → 로그인 200이어도 세션 없음 → `/api/admin/me` 401 → 루프.
  외부는 HSTS preload 때문에 항상 HTTPS라 정상이었음.
- **수정**: nginx 80→443 301 리다이렉트 적용 완료 — canonical 설정: `deploy/nginx/conf.d/arise-ai.conf`,
  적용 번들(기록): `deploy/rollout-2026-06-12/`.
- **운영 안내**: 내부 사용자는 도메인(`https://arise-ai.pusan.ac.kr`)으로 접속할 것. IP 접속은 인증서 경고(우회 가능).
  ※ 향후 유사 작업 시 사전 확인: 교내에서 443이 닿는지 — 안 닿는 상태로 80을 막으면 내부 전체 불통이 됨.

## 자격증명 (서버 ~/pnug-stack/.env)
- admin 계정: `admin` / `SiBwlZc81BAV0TtB` (시드값 — 2026-06-12 유지 결정)
- PostgreSQL: `pnug` / `6k4P06iXKBHQwlarsoyWBJPA` (DB `pnug`)
- SSH: `ubuntu` 계정, 키 인증(2026-06-08 등록) 또는 비밀번호 — sudo 비번 동일. JWT_SECRET 등은 `.env` 참조. **이 파일은 git 커밋 금지.**

## 운영 명령 (서버에서; 권한 오류 시 sudo)
```bash
cd ~/pnug-stack
docker compose ps                 # 상태
docker compose logs -f was        # 앱 로그
docker compose restart was        # 앱 재시작
docker exec pnug-nginx-1 nginx -t           # nginx 설정 문법 검증
docker exec pnug-nginx-1 nginx -s reload    # nginx 무중단 재적용 (설정/인증서 교체 후)
docker compose down               # 중지 (DB 볼륨 pnug_pgdata 보존)
docker compose up -d              # 기동
docker compose exec -T was node src/init-db.js   # 재시드(주의: 기존 응답 삭제)
```
DB 접속: `docker compose exec postgres psql -U pnug -d pnug`

## 재배포
### 코드(이미지) 재배포 — 빌드는 인터넷 되는 PC/WSL, 반입은 화이트리스트 PC에서
1. `docker build --provenance=false -t pnug-was:latest .`
2. `docker save pnug-was:latest | gzip > images.tar.gz`
3. scp(포트 11097)로 서버 `~/pnug-deploy/` 반입 → `docker load -i images.tar.gz` → `cd ~/pnug-stack && docker compose up -d`
   - was 컨테이너만 recreate되는 무중단 배포(2026-06-08 검증). `down` 불필요. DB·nginx 보존.
   - 화이트리스트 PC용 원클릭 패턴: `deploy/rollout-2026-06-12/apply.bat` 참고 (이미지를 폴더에 두면 자동 감지·적재)
### nginx 설정만 변경
- `deploy/rollout-2026-06-12/` 방식(scp + 백업 + nginx -t + reload + 자동 롤백). 이미지 재빌드 불필요.
- 레포 canonical(`deploy/nginx/conf.d/arise-ai.conf`)과 서버 적용본을 항상 동기화할 것.

## 파일 위치
- 서버: 스택 `~/pnug-stack/` (compose·`.env`·`certs/`·nginx conf.d·`backups/`) · 반입물 `~/pnug-deploy/` · 소스 `~/pnu-grad/`
- 레포: `deploy/` — compose 참고본·nginx conf(canonical)·검증 스크립트(`server-verify.sh`, `validate-stack.sh`, `smoke.mjs`)·self-signed placeholder 인증서(`certs/`, 로컬 검증용)

## 변경 이력
- 2026-06-17: 「학과 정보 수정 신청」 2차 — **공개 제출(로그인 제거)·디렉터리 진입 FAB·학과/세부전공 삭제 요청 기능** 라이브 배포. `dir_change_requests`에 `action`·`note` 컬럼 추가(부팅 시 `ALTER ... IF NOT EXISTS`로 기존 테이블 호환). 검증: was healthy·공개 제출 422 검증·삭제 사유 필수·FAB/문구 라이브 반영. (코드 커밋 114c99c)
- 2026-06-17: 「학과 정보 수정 신청」 기능 **라이브 배포 완료**. 신규 페이지 `/dept-edit-request`(@pusan.ac.kr OAuth 게이트) + 관리자 "학과 수정 신청" 검토 탭(승인 시 디렉터리 자동 반영). DB `dir_change_requests` 테이블 추가(`initSchema` 자동 생성 — 무중단 was 재생성, postgres·nginx·DB볼륨 보존). 디렉터리 안내 문구 2곳 수정(대제목 하단·검색창 옆 칩). 검증: was healthy·문구 반영·제출/관리자 API 정상. (코드 커밋 e7361b6)
- 2026-06-12: nginx 301·디렉터리 정리 **라이브 적용 완료**(통합 번들 실행, 검증 통과). 일회성 스크립트(remediate-live, verify-migration, run-install)·구식 compose(prod.yml)·중복 단독 번들 2종 삭제.
- 2026-06-12: 학과 디렉터리에서 협동과정·계약학과 제거(학석박사 연계과정 신청 불가 — 대학원혁신실 회신) — 라이브 DB 정리 번들 `deploy/dept-cleanup-rollout/` + 시드 JSON·관리자 드롭다운 정리.
- 2026-06-12: 문서 현행화(와일드카드 인증서·OAuth 완료·접근 제약 반영, acme 절차 폐기 표기). 내부망 로그인 루프 분석·수정 번들 추가.
- 2026-06-08: TLS를 Let's Encrypt → 부산대 와일드카드로 교체. was 이미지 self-contained 전환(s30 bind-mount 제거).
- 2026-06-04: 최초 배포.
