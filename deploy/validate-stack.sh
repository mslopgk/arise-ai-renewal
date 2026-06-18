#!/usr/bin/env bash
# WSL: 전체 compose 스택 기동 + 검증 (인프라 이미지도 이 과정에서 pull됨)
set -u
# 최신 deploy 파일 동기화 (compose/nginx/certs/.env)
rsync -a --exclude node_modules --exclude '**/dist' /mnt/c/Users/user/pnu-grad/deploy/ ~/arise/deploy/ >/dev/null 2>&1
cd ~/arise/deploy || exit 1

echo "=== compose config validate ==="
docker compose config >/dev/null && echo "config OK" || { docker compose config; exit 1; }

echo "=== compose up -d ==="
docker compose up -d 2>&1 | tail -25

echo
echo "=== wait postgres healthy ==="
for i in $(seq 1 30); do
  s=$(docker inspect -f '{{.State.Health.Status}}' arise-postgres-1 2>/dev/null || echo none)
  if [ "$s" = healthy ]; then echo "postgres healthy (~$((i*2))s)"; break; fi
  sleep 2
done

echo
echo "=== init-db (seed) ==="
docker compose exec -T was node src/init-db.js 2>&1 | tail -6

echo
echo "=== validate via nginx (TLS, Host: arise-ai.pusan.ac.kr) ==="
H='Host: arise-ai.pusan.ac.kr'
curl -s  http://localhost/health   -H "$H" -o /dev/null -w "  http  /health         -> HTTP %{http_code} (expect 301)\n"
curl -sk https://localhost/health  -H "$H" -o /dev/null -w "  https /health         -> HTTP %{http_code} (expect 200)\n"
curl -sk https://localhost/api/departments -H "$H" -o /dev/null -w "  https /api/departments-> HTTP %{http_code}\n"
curl -sk https://localhost/        -H "$H" -o /dev/null -w "  https /  (arise.html) -> HTTP %{http_code}\n"
curl -sk https://localhost/s30/    -H "$H" -o /dev/null -w "  https /s30/           -> HTTP %{http_code}\n"

echo
echo "=== container states ==="
docker compose ps --format '{{.Name}}\t{{.State}}\t{{.Status}}'
