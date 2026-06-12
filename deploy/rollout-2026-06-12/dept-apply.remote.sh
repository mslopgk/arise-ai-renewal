#!/usr/bin/env bash
# [서버에서 실행됨 — 직접 실행하지 말 것. apply.bat/apply.sh가 /tmp에 업로드해서 돌린다]
# 학과 디렉터리에서 협동과정·계약학과 제거 (학석박사 연계과정 신청 불가 — 대학원혁신실 회신).
# 절차: (있으면) 새 was 이미지 적재·기동 → 두 테이블 pg_dump 백업 → cleanup.sql(트랜잭션) → DB·API 검증
set -u
SUDOPW="${SUDOPW:-ubuntu}"
if docker ps >/dev/null 2>&1; then DK(){ docker "$@"; }; else DK(){ echo "$SUDOPW" | sudo -S -p '' docker "$@"; }; fi

PG=$(DK ps --format '{{.Names}}' | grep -m1 postgres || true)
[ -n "$PG" ] || { echo "[FAIL] postgres 컨테이너 없음"; exit 1; }

DBU=$(grep -oP '^POSTGRES_USER=\K.*' ~/pnug-stack/.env 2>/dev/null || echo pnug)
DBN=$(grep -oP '^POSTGRES_DB=\K.*'   ~/pnug-stack/.env 2>/dev/null || echo pnug)
echo "[info] postgres=$PG db=$DBN user=$DBU"

# 0) (선택) 번들에 새 was 이미지가 있으면 적재 + 재기동 (was만 recreate — 무중단에 가까움)
if [ -f /tmp/images.tar.gz ]; then
  echo "[info] images.tar.gz 발견 — was 이미지 갱신 중..."
  DK load -i /tmp/images.tar.gz || { echo "[FAIL] docker load 실패 — 중단(변경 없음)"; exit 1; }
  (cd "$HOME/pnug-stack" && DK compose up -d) || { echo "[FAIL] compose up 실패"; exit 1; }
  echo "[info] was 헬스 대기..."
  for i in $(seq 1 30); do
    curl -sk --max-time 4 https://localhost/health | grep -q '"ok":true' && break
    sleep 2
  done
fi

# 1) 백업 — 삭제 대상 두 테이블 전체(이미지 bytea 포함). 복구는 psql < 백업파일 한 방.
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$HOME/pnug-stack/backups"
BK="$HOME/pnug-stack/backups/dir-tables.$TS.sql"
DK exec "$PG" pg_dump -U "$DBU" -d "$DBN" -t dir_departments -t dir_majors --clean --if-exists > "$BK" \
  || { echo "[FAIL] 백업 실패 — 중단(변경 없음)"; exit 1; }
echo "[info] 백업: $BK ($(wc -c < "$BK") bytes)"

# 2) 삭제 — cleanup.sql 자체가 BEGIN/COMMIT 트랜잭션 (실패 시 DB 변경 없음)
[ -f /tmp/cleanup.sql ] || { echo "[FAIL] /tmp/cleanup.sql 없음 — 업로드 누락"; exit 1; }
tr -d '\r' < /tmp/cleanup.sql > /tmp/cleanup.lf.sql
DK exec -i "$PG" psql -U "$DBU" -d "$DBN" -v ON_ERROR_STOP=1 < /tmp/cleanup.lf.sql \
  || { echo "[FAIL] SQL 실패 — 트랜잭션 롤백됨, DB 변경 없음"; exit 1; }

# 3) 검증 — DB 직접 + 실서비스 API 응답
LEFT=$(DK exec "$PG" psql -U "$DBU" -d "$DBN" -tAc "SELECT count(*) FROM dir_departments WHERE gyeyeol IN ('협동과정','계약학과')")
TOTAL=$(DK exec "$PG" psql -U "$DBU" -d "$DBN" -tAc "SELECT count(*) FROM dir_departments")
API=$(curl -sk --max-time 8 https://localhost/api/departments | grep -o -e 협동과정 -e 계약학과 | wc -l)
echo "[verify] DB 잔존(기대 0): $LEFT / 전체 학과: $TOTAL / API 응답 내 출현(기대 0): $API"
if [ "$LEFT" != "0" ] || [ "$API" != "0" ]; then
  echo "[FAIL] 검증 실패. 복구: docker exec -i $PG psql -U $DBU -d $DBN < $BK"
  exit 1
fi

echo "[OK] 완료 — 협동과정·계약학과 제거됨 (학과 $TOTAL개 잔존)."
echo "     되돌리기: docker exec -i $PG psql -U $DBU -d $DBN < $BK"
