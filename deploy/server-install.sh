#!/usr/bin/env bash
# 폐쇄망 서버(ubuntu@10.125.19.178)에서 실행 — Docker 오프라인 설치 + 스택 기동.
# 비대화형 sudo: 비밀번호를 파이프로 주입 (SUDOPW 기본 'ubuntu').
set -euo pipefail
SUDOPW="${SUDOPW:-ubuntu}"
S(){ echo "$SUDOPW" | sudo -S -p '' "$@"; }
BUNDLE="${BUNDLE:-$HOME/arise-deploy}"
STACK="$HOME/arise-stack"

cd "$BUNDLE"
echo "=== [1/5] Docker 엔진 설치 (static binaries) ==="
if command -v dockerd >/dev/null 2>&1 && S systemctl is-active --quiet docker; then
  echo "docker 이미 설치/가동 중 — 스킵"
else
  tar xzf docker-*.tgz
  S install -m0755 docker/dockerd docker/docker docker/containerd docker/containerd-shim-runc-v2 docker/ctr docker/runc docker/docker-init docker/docker-proxy /usr/local/bin/
  S mkdir -p /usr/local/lib/docker/cli-plugins
  S install -m0755 docker-compose-linux-x86_64 /usr/local/lib/docker/cli-plugins/docker-compose
  S groupadd -f docker
  S usermod -aG docker "$USER"
  # 일부 Ubuntu 이미지는 docker.service/socket을 마스킹(→/dev/null) 해둠. 해제 후 유닛 작성.
  S systemctl unmask docker.service docker.socket 2>/dev/null || true
  S rm -f /etc/systemd/system/docker.service
  printf '%s\n' \
'[Unit]' \
'Description=Docker Application Container Engine' \
'After=network-online.target' \
'Wants=network-online.target' \
'[Service]' \
'Type=notify' \
'ExecStart=/usr/local/bin/dockerd -H unix:///var/run/docker.sock' \
'Restart=always' \
'RestartSec=2' \
'Delegate=yes' \
'KillMode=process' \
'LimitNOFILE=1048576' \
'[Install]' \
'WantedBy=multi-user.target' > /tmp/docker.service
  S install -m0644 /tmp/docker.service /etc/systemd/system/docker.service
  S systemctl daemon-reload
  S systemctl enable --now docker
  sleep 4
fi
S docker version --format 'server={{.Server.Version}}'
S docker compose version

echo "=== [2/5] 이미지 적재 (docker load) ==="
S docker load -i images.tar.gz

echo "=== [3/5] 스택 배치 ==="
mkdir -p "$STACK"
cp "$BUNDLE/docker-compose.prod.yml" "$STACK/docker-compose.yml"
cp "$BUNDLE/env.prod" "$STACK/.env"
# Sheets SA 키 — compose가 ./sheets-sa.json 으로 컨테이너에 마운트 (이미지엔 미포함)
[ -f "$BUNDLE/sheets-sa.json" ] && cp "$BUNDLE/sheets-sa.json" "$STACK/sheets-sa.json"

echo "=== [4/5] 기동 ==="
cd "$STACK"
S docker compose up -d
echo "postgres 헬스 대기..."
for i in $(seq 1 40); do
  st=$(S docker inspect -f '{{.State.Health.Status}}' arise-postgres-1 2>/dev/null || echo none)
  if [ "$st" = healthy ]; then echo "postgres healthy (~$((i*2))s)"; break; fi
  sleep 2
done

echo "=== [5/5] DB 시드 (init-db) + 검증 ==="
S docker compose exec -T was node src/init-db.js || true
sleep 2
echo -n "  local /health -> "; curl -s --max-time 5 localhost:80/health || echo "(no response)"; echo
S docker compose ps
echo "=== 완료 ==="
