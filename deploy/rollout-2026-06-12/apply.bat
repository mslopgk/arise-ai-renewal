@echo off
setlocal EnableExtensions
chcp 949 >nul
cd /d "%~dp0"
title 통합 배포: nginx 301 + 학과 디렉터리 정리 (arise-ai.pusan.ac.kr)

if not defined HOST set "HOST=164.125.19.178"
if not defined PORT set "PORT=11097"
if not defined SSHUSER set "SSHUSER=ubuntu"

echo ============================================================
echo  통합 배포 (2026-06-12) - 두 작업을 순서대로 수행:
echo   [A] nginx 80-443 리다이렉트 (내부망 로그인 루프 수정)
echo   [B] 학과 디렉터리에서 협동과정·계약학과 제거 (+was 이미지 갱신)
echo  각 단계는 백업-검증-실패시 자동 롤백.
echo ============================================================
echo.

REM -- 0. 도구 확인 (Windows 10 1809+ / 11 기본 내장)
where ssh  >nul 2>nul || goto :no_tools
where scp  >nul 2>nul || goto :no_tools
where curl >nul 2>nul || goto :no_tools

REM -- 1. SSH 키 자동 감지 (이 폴더의 id_ed25519) + 권한 교정
set "KEYFILE="
if exist "%~dp0id_ed25519" (
  set "KEYFILE=%~dp0id_ed25519"
  echo [info] SSH 키 발견 - 파일 권한 교정 중...
  icacls "%~dp0id_ed25519" /inheritance:r >nul 2>nul
  icacls "%~dp0id_ed25519" /grant:r "%USERNAME%:R" >nul 2>nul
) else (
  echo [info] SSH 키 없음 - 비밀번호 인증으로 진행 ^(프롬프트가 3번 뜸^)
)

REM -- 2. 새 was 이미지 동봉 여부
set "FILES=arise-ai.conf nginx-apply.remote.sh cleanup.sql dept-apply.remote.sh"
if exist "%~dp0images.tar.gz" (
  set "FILES=arise-ai.conf nginx-apply.remote.sh cleanup.sql dept-apply.remote.sh images.tar.gz"
  echo [info] images.tar.gz 발견 - was 이미지도 함께 갱신함 ^(업로드 수 분 소요^)
) else (
  echo [info] images.tar.gz 없음 - was 이미지 갱신은 생략, DB 정리만 수행
)
echo.

REM -- 3. 사전 점검: 이 PC에서 HTTPS(443) 도달 확인 (nginx 리다이렉트 안전장치)
echo == [1/5] 사전 점검: 443 도달 확인 ==
curl -sk -m 8 -o NUL "https://arise-ai.pusan.ac.kr/"
if not errorlevel 1 goto :preflight_ok
curl -sk -m 8 -o NUL "https://%HOST%/"
if not errorlevel 1 goto :preflight_ok
if "%FORCE%"=="1" (
  echo    [경고] 443 연결 실패했지만 FORCE=1 - 강행
  goto :preflight_ok
)
echo    [중단] 이 PC에서 443에 연결할 수 없음.
echo    교내 443이 막힌 상태로 리다이렉트를 적용하면 내부 사용자가 사이트 전체 접속 불가가 됨.
echo    교내 브라우저에서 https://arise-ai.pusan.ac.kr 가 열리는지 먼저 확인할 것.
echo    그래도 진행하려면: cmd 창에서  set FORCE=1  입력 후 이 bat 재실행.
goto :fail
:preflight_ok
echo    OK
echo.

REM -- 4. 업로드
echo == [2/5] 서버로 파일 업로드 ==
if defined KEYFILE (
  scp -i "%KEYFILE%" -P %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %FILES% %SSHUSER%@%HOST%:/tmp/
) else (
  scp -P %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %FILES% %SSHUSER%@%HOST%:/tmp/
)
if errorlevel 1 (
  echo    [중단] 업로드 실패 - 이 PC가 화이트리스트인지/포트 %PORT% 도달하는지 확인.
  goto :fail
)
echo.

REM -- 5. [A] nginx 리다이렉트 적용
echo == [3/5] [A] nginx 301 적용 (백업-검증-실패시 자동 롤백) ==
if defined KEYFILE (
  ssh -t -i "%KEYFILE%" -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/nginx-apply.remote.sh > /tmp/nginx.lf.sh && bash /tmp/nginx.lf.sh"
) else (
  ssh -t -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/nginx-apply.remote.sh > /tmp/nginx.lf.sh && bash /tmp/nginx.lf.sh"
)
if errorlevel 1 (
  echo    [중단] [A] nginx 적용 실패 - 서버는 자동 롤백됨. [B]는 시작 안 함.
  echo    위 [FAIL] 로그를 전달할 것.
  goto :fail
)
echo.

REM -- 6. [B] 학과 디렉터리 정리 (+이미지 갱신)
echo == [4/5] [B] 디렉터리 정리 적용 (백업-트랜잭션-검증) ==
if defined KEYFILE (
  ssh -t -i "%KEYFILE%" -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/dept-apply.remote.sh > /tmp/dept.lf.sh && bash /tmp/dept.lf.sh"
) else (
  ssh -t -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/dept-apply.remote.sh > /tmp/dept.lf.sh && bash /tmp/dept.lf.sh"
)
if errorlevel 1 (
  echo    [중단] [B] 디렉터리 정리 실패 - 트랜잭션이라 DB는 변경 전 상태.
  echo    ^([A] nginx 리다이렉트는 이미 적용된 상태로 유지됨 - 문제 없음^)
  goto :fail
)
echo.

REM -- 7. 외부 최종 확인
echo == [5/5] 외부 최종 확인 ==
curl -s -o NUL -m 10 -w "   http  -> %%{http_code} (기대 301)  Location: %%{redirect_url}\n" "http://arise-ai.pusan.ac.kr/"
curl -s -o NUL -m 10 -w "   https -> %%{http_code} (기대 200)\n" "https://arise-ai.pusan.ac.kr/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify.ps1"
if errorlevel 1 (
  echo    [중단] 디렉터리 외부 검증 실패 - 위 출력을 전달할 것.
  goto :fail
)
echo.
echo ============================================================
echo  전부 완료.
echo   - 내부망 사용자: https://arise-ai.pusan.ac.kr (도메인)으로 접속 안내.
echo     IP 접속은 이제 인증서 경고가 뜸(정상).
echo   - 학과 디렉토리에서 협동과정·계약학과 제거 확인: Ctrl+F5
echo ============================================================
echo.
pause
exit /b 0

:no_tools
echo [중단] ssh/scp/curl 을 찾을 수 없음.
echo   Windows 10(1809+)/11 이면 기본 내장임. 없다면:
echo   설정 - 앱 - 선택적 기능 - "OpenSSH 클라이언트" 추가.
goto :fail

:fail
echo.
pause
exit /b 1
