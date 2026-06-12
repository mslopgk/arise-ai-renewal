#!/usr/bin/env bash
# [서버에서 실행됨 — 직접 실행하지 말 것. apply.sh가 /tmp에 업로드해서 돌린다]
# 절차: nginx conf.d 마운트 자동 탐지 → 백업 → 새 설정 설치 → nginx -t → reload → 검증
#       실패하면 어느 단계든 백업본 자동 복원(롤백) 후 exit 1.
set -u
SUDOPW="${SUDOPW:-ubuntu}"
if docker ps >/dev/null 2>&1; then DK(){ docker "$@"; }; else DK(){ echo "$SUDOPW" | sudo -S -p '' docker "$@"; }; fi

NGINX=$(DK ps --format '{{.Names}}' | grep -m1 nginx || true)
[ -n "$NGINX" ] || { echo "[FAIL] 실행 중인 nginx 컨테이너가 없음"; exit 1; }

# 호스트 쪽 conf.d 경로를 컨테이너 마운트에서 역추적 (경로 하드코딩 금지 — 서버 구조가 바뀌어도 동작)
CONF_DIR=$(DK inspect "$NGINX" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d"}}{{.Source}}{{end}}{{end}}')
if [ -z "$CONF_DIR" ] || [ ! -f "$CONF_DIR/arise-ai.conf" ]; then
  echo "[FAIL] conf.d 마운트에서 arise-ai.conf를 찾지 못함 (CONF_DIR='$CONF_DIR')"; exit 1
fi
echo "[info] nginx=$NGINX / 설정=$CONF_DIR/arise-ai.conf"

TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$HOME/pnug-stack/backups"
BACKUP="$HOME/pnug-stack/backups/arise-ai.conf.$TS"
cp "$CONF_DIR/arise-ai.conf" "$BACKUP" || { echo "[FAIL] 백업 실패 — 중단(설정 변경 안 함)"; exit 1; }
echo "[info] 백업: $BACKUP"

[ -f /tmp/arise-ai.conf ] || { echo "[FAIL] /tmp/arise-ai.conf 없음 — 업로드 누락"; exit 1; }
tr -d '\r' < /tmp/arise-ai.conf > /tmp/arise-ai.conf.lf   # Windows CRLF 제거
install_conf() { cp "$1" "$CONF_DIR/arise-ai.conf" 2>/dev/null || echo "$SUDOPW" | sudo -S -p '' cp "$1" "$CONF_DIR/arise-ai.conf"; }
rollback() { echo "[rollback] 이전 설정 복원 + reload"; install_conf "$BACKUP"; DK exec "$NGINX" nginx -s reload; }

install_conf /tmp/arise-ai.conf.lf
if ! DK exec "$NGINX" nginx -t; then rollback; echo "[FAIL] nginx -t 실패 — 롤백 완료"; exit 1; fi
if ! DK exec "$NGINX" nginx -s reload; then rollback; echo "[FAIL] reload 실패 — 롤백 완료"; exit 1; fi
sleep 1

HTTP=$(curl -s  -o /dev/null -w '%{http_code}'    -H 'Host: arise-ai.pusan.ac.kr' --max-time 6 http://localhost/)
LOC=$( curl -s  -o /dev/null -w '%{redirect_url}' -H 'Host: arise-ai.pusan.ac.kr' --max-time 6 http://localhost/)
HTTPS=$(curl -sk -o /dev/null -w '%{http_code}'                                   --max-time 6 https://localhost/)
echo "[verify] http -> $HTTP (기대 301, Location: $LOC) / https -> $HTTPS (기대 200)"
if [ "$HTTP" != "301" ] || [ "$HTTPS" != "200" ]; then rollback; echo "[FAIL] 검증 실패 — 롤백 완료"; exit 1; fi

# 인증서 sanity (실패해도 무시 — 참고 출력)
echo | openssl s_client -connect localhost:443 -servername arise-ai.pusan.ac.kr 2>/dev/null \
  | openssl x509 -noout -subject -enddate 2>/dev/null || true

echo "[OK] 적용 완료. 문제 시 수동 롤백: cp $BACKUP $CONF_DIR/arise-ai.conf && docker exec $NGINX nginx -s reload"
