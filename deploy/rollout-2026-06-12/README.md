# 통합 배포 번들 (2026-06-12) — bat 한 번으로 두 작업

`nginx-redirect-rollout` + `dept-cleanup-rollout` 를 하나로 합친 번들.
이 폴더 하나만 화이트리스트 PC로 가져가면 됨.

## 수행 작업 (순서대로)
- **[A] nginx 80→443 리다이렉트** — 내부망 관리자 로그인 무한 루프 수정
  (Secure 쿠키 + 평문 HTTP 조합이 원인). 기존 설정 백업 → `nginx -t` → 무중단 reload
  → 검증, 실패 시 자동 롤백.
- **[B] 학과 디렉터리에서 협동과정(32)·계약학과(19) 제거** — 학석박사 연계과정 신청 불가
  (대학원혁신실 회신). 두 테이블 pg_dump 백업 → 단일 트랜잭션 삭제 → DB·API 검증.
  `images.tar.gz`(새 was 이미지: 관리자 계열 드롭다운·시드 JSON 정리 반영)가 폴더에 있으면
  함께 적재·기동.

[A] 실패 시 [B]는 시작하지 않음. [B] 실패 시 DB는 변경 전 상태이며 [A]는 적용된 채 유지(정상).

## 실행 방법
1. **이 폴더 통째로** 화이트리스트 PC에 복사 (이미지 포함 153MB — USB 권장)
2. (권장) SSH 개인키 `id_ed25519`를 폴더 안에 넣기 — 자동 감지·권한 교정.
   없으면 비밀번호 프롬프트 3번 (서버 비번: deploy/DEPLOYMENT.md 자격증명)
3. **`apply.bat` 더블클릭**
   - Git Bash 불필요 — Windows 10(1809+)/11 기본 내장 ssh/scp/curl만 사용

## 사전 확인 (필수, 1분)
교내 PC 브라우저에서 `https://arise-ai.pusan.ac.kr` 가 열리는지 확인.
안 열리면(교내 443 차단) [A]를 적용하면 안 됨 — bat이 자동 점검해서 중단함.
강행은 cmd에서 `set FORCE=1` 후 재실행.

## 성공 판정
```
   http  -> 301 (기대 301)  Location: https://arise-ai.pusan.ac.kr/
   https -> 200 (기대 200)
   학과 수: 96 / 협동과정·계약학과 잔존: 0 (기대 0)
 전부 완료.
```

## 되돌리기
- [A] nginx: `~/pnug-stack/backups/arise-ai.conf.<TS>` 복원 + `docker exec pnug-nginx-1 nginx -s reload`
- [B] 디렉터리: `docker exec -i pnug-postgres-1 psql -U pnug -d pnug < ~/pnug-stack/backups/dir-tables.<TS>.sql`
(정확한 백업 경로는 적용 로그에 출력됨)

## 적용 후 할 일
- 내부망 사용자에게 **`https://arise-ai.pusan.ac.kr`** (도메인)으로 접속 안내
- admin 시드 비밀번호 교체 (아직 초기값 유효)
