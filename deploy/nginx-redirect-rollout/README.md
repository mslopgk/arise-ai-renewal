# nginx 80→443 리다이렉트 적용 번들 (2026-06-12)

> ※ 학과 디렉터리 정리와 한 번에 적용하려면 `deploy/rollout-2026-06-12/` (통합 번들) 사용.

## 무엇을 고치나
부산대 **내부망에서 관리자 페이지가 로그인창으로 무한 리다이렉션**되는 문제의 수정.
원인: prod에서 admin/OAuth 쿠키가 `Secure` 플래그인데, 현재 라이브 nginx가 80 포트를
리다이렉트 없이 평문 서빙 중 → 내부에서 `http://`(주로 IP 직접 접속)로 들어오면 브라우저가
쿠키 저장을 거부 → 로그인 무한 루프. (외부는 `pusan.ac.kr`이 HSTS preload 도메인이라
항상 HTTPS로 강제되어 정상이었음.)

이 번들은 라이브 nginx 설정을 **80 → 443 301 리다이렉트** 버전으로 교체한다.
부수 수정: `client_max_body_size 10m` (기존엔 nginx 기본 1m이라 관리자 이미지 업로드가
큰 파일에서 413으로 막힐 수 있었음) + 보안 헤더(HSTS 등).

인증서는 건드리지 않는다 (부산대 와일드카드 그대로, 만료 2027-01-02).

## 사전 확인 (필수, 1분)
**교내 PC 브라우저에서 `https://arise-ai.pusan.ac.kr` 가 열리는지 확인.**
열리면 진행. 안 열리면(교내에서 443 차단) 적용 금지 — 리다이렉트가 내부 사용자 전체를
사이트 접속 불가로 만든다. apply.sh가 이를 자동 점검하고 안 되면 중단한다.

## 실행 방법 (화이트리스트 IP PC에서)

### 방법 A — `apply.bat` 더블클릭 (권장, 가장 간단)
1. **이 폴더 통째로** 화이트리스트 PC에 복사 (USB/메신저).
2. (권장) SSH 개인키 `id_ed25519`를 **이 폴더 안에** 같이 넣기 — bat이 자동 감지하고
   파일 권한도 자동 교정함. 키가 없으면 비밀번호 프롬프트 2번 (서버 비번은
   deploy/DEPLOYMENT.md 자격증명 참조).
3. `apply.bat` 더블클릭. 끝.
   - Git Bash 불필요 — Windows 10(1809+)/11 기본 내장 ssh/scp/curl만 사용.
   - 443 사전 점검에 걸려 중단됐는데 강행해야 하면: cmd 창에서 `set FORCE=1` 후 재실행.

### 방법 B — Git Bash에서 apply.sh (대안)
```bash
cd /c/경로/nginx-redirect-rollout

# 키 인증 (권장)
KEY=/c/Users/<나>/.ssh/id_ed25519 bash <(tr -d '\r' < apply.sh)

# 또는 비밀번호 인증
bash <(tr -d '\r' < apply.sh)
```

`tr -d '\r'`는 Windows 줄바꿈(CRLF) 제거용 — 항상 이 형태로 실행할 것.

## 스크립트가 하는 일 (apply.bat/apply.sh → 서버의 remote-apply.sh)
1. 이 PC에서 443 도달 사전 점검 (실패 시 중단; `FORCE=1`로만 강행 가능)
2. 새 설정·스크립트를 서버 `/tmp`로 업로드
3. 서버에서: nginx 컨테이너의 conf.d 마운트 경로 자동 탐지 → 기존 설정을
   `~/pnug-stack/backups/arise-ai.conf.<타임스탬프>` 로 백업 → 새 설정 설치
   → `nginx -t` 문법 검증 → `nginx -s reload`(무중단) → http 301/https 200 검증
4. **어느 단계든 실패하면 백업본 자동 복원(롤백)**
5. 이 PC에서 외부 최종 확인 (http→301, https→200)

## 성공 판정
마지막 출력이 아래와 같으면 끝:
```
   http  -> 301 (기대 301) Location: https://arise-ai.pusan.ac.kr/
   https -> 200 (기대 200)
```

## 수동 롤백 (만약의 경우)
```bash
ssh -p 11097 ubuntu@164.125.19.178
ls ~/pnug-stack/backups/                          # 백업 확인
cp ~/pnug-stack/backups/arise-ai.conf.<TS> <conf.d 경로>/arise-ai.conf
docker exec pnug-nginx-1 nginx -s reload          # 권한 오류 시 sudo
```
(conf.d 경로는 remote-apply.sh 실행 로그의 `[info] 설정=...` 줄에 출력됨)

## 적용 후 할 일
- 내부망 사용자에게 **`https://arise-ai.pusan.ac.kr`** (도메인!)으로 접속 안내.
  IP로 접속하면 이제 301 → `https://IP` → 인증서 경고가 뜬다(우회하면 동작은 함).
- admin 시드 비밀번호 교체 권장 (2026-06-12 기준 아직 초기값 유효 확인됨).
