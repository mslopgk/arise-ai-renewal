#!/usr/bin/env bash
# nginx 80→443 리다이렉트 적용 — 화이트리스트 IP PC(git-bash)에서 실행
# 사용법: README.md 참조. 기본은  bash <(tr -d '\r' < apply.sh)
set -euo pipefail
cd "$(dirname "$0")"

HOST="${HOST:-164.125.19.178}"
PORT="${PORT:-11097}"
SSH_USER="${SSH_USER:-ubuntu}"
KEY="${KEY:-}"          # SSH 개인키 경로(권장). 없으면 비밀번호 인증으로 진행.

SSH_OPTS=(-p "$PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
SCP_OPTS=(-P "$PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
if [ -n "$KEY" ]; then SSH_OPTS+=(-i "$KEY"); SCP_OPTS+=(-i "$KEY"); fi

echo "== [0/3] 사전 점검: 이 PC에서 HTTPS(443) 도달 확인 =="
if curl -sk -m 8 -o /dev/null "https://arise-ai.pusan.ac.kr/" || curl -sk -m 8 -o /dev/null "https://$HOST/"; then
  echo "   OK: 443 도달 가능"
else
  echo "   [중단] 이 PC에서 443에 연결 불가."
  echo "   교내에서 443이 막혀 있는 상태로 리다이렉트를 적용하면 내부 사용자는 사이트 전체에 접속 못 하게 됨."
  echo "   교내 PC 브라우저에서 https://arise-ai.pusan.ac.kr 가 열리는 것을 확인한 뒤,"
  echo "   그래도 진행하려면 FORCE=1 을 붙여 재실행:  FORCE=1 bash <(tr -d '\r' < apply.sh)"
  [ "${FORCE:-0}" = "1" ] || exit 1
  echo "   (FORCE=1 — 경고 무시하고 진행)"
fi

echo "== [1/3] 파일 업로드 =="
scp "${SCP_OPTS[@]}" arise-ai.conf remote-apply.sh "$SSH_USER@$HOST:/tmp/"

echo "== [2/3] 서버에서 적용 (백업 → nginx -t → reload → 검증, 실패 시 자동 롤백) =="
ssh -t "${SSH_OPTS[@]}" "$SSH_USER@$HOST" "tr -d '\r' < /tmp/remote-apply.sh > /tmp/remote-apply.lf.sh && bash /tmp/remote-apply.lf.sh"

echo "== [3/3] 외부 최종 확인 =="
curl -s -o /dev/null -w "   http  -> %{http_code} (기대 301) Location: %{redirect_url}\n" -m 10 "http://arise-ai.pusan.ac.kr/"
curl -s -o /dev/null -w "   https -> %{http_code} (기대 200)\n" -m 10 "https://arise-ai.pusan.ac.kr/"
echo "완료. 이제 내부망 사용자에게 https://arise-ai.pusan.ac.kr 로 접속하라고 안내할 것."
