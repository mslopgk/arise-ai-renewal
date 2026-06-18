#!/usr/bin/env bash
# 서버에서 실행: 라이브 스택 검증
set -u
SUDOPW="${SUDOPW:-ubuntu}"
if docker ps >/dev/null 2>&1; then DK(){ docker "$@"; }; else DK(){ echo "$SUDOPW" | sudo -S -p '' docker "$@"; }; fi

echo "=== docker group effective in this session? ==="
id -nG | tr ' ' '\n' | grep -qx docker && echo "yes (sudo 불필요)" || echo "no (현재 세션은 sudo 경유; 재로그인 시 해제)"

echo "=== compose ps ==="
cd ~/arise-stack && DK compose ps

echo "=== was 헬스 대기 ==="
for i in $(seq 1 20); do
  st=$(DK inspect -f '{{.State.Health.Status}}' arise-was-1 2>/dev/null || echo none)
  if [ "$st" = healthy ]; then echo "was healthy"; break; fi
  sleep 2
done

echo "=== local HTTP (:80) — 리다이렉트 적용 후엔 전부 301이 정상 ==="
for p in /health /; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 6 -H 'Host: arise-ai.pusan.ac.kr' "http://localhost:80$p")
  echo "  $p -> $code (기대 301)"
done

echo "=== local HTTPS (:443) ==="
for p in /health /api/departments / /admission-v3-dark.html /login; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 6 "https://localhost$p")
  echo "  $p -> $code"
done

echo "=== E2E (읽기전용, 실 JWT_SECRET) ==="
DK cp ~/arise-deploy/server-verify.mjs arise-was-1:/app/backend/server-verify.mjs
DK compose exec -T was node server-verify.mjs || true

echo "=== ufw status ==="
echo "$SUDOPW" | sudo -S -p '' ufw status 2>/dev/null | head -6

echo "=== docker 부팅 자동시작 ==="
systemctl is-enabled docker 2>/dev/null || true

echo "=== listening :80 ==="
ss -tlnH 2>/dev/null | grep ':80 ' || echo "(:80 not found)"
echo "=== SERVER-VERIFY DONE ==="
