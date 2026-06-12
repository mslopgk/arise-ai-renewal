@echo off
setlocal EnableExtensions
chcp 949 >nul
cd /d "%~dp0"
title dept directory cleanup rollout (arise-ai.pusan.ac.kr)

if not defined HOST set "HOST=164.125.19.178"
if not defined PORT set "PORT=11097"
if not defined SSHUSER set "SSHUSER=ubuntu"

echo ============================================================
echo  학과 디렉터리에서 협동과정·계약학과 제거
echo  (백업 - 트랜잭션 삭제 - 검증 / 실패시 DB 변경 없음)
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
  echo [info] SSH 키 없음 - 비밀번호 인증으로 진행 ^(프롬프트가 2번 뜸^)
)

REM -- 2. 새 was 이미지 동봉 여부 (있으면 같이 배포)
set "FILES=cleanup.sql remote-apply.sh"
if exist "%~dp0images.tar.gz" (
  set "FILES=cleanup.sql remote-apply.sh images.tar.gz"
  echo [info] images.tar.gz 발견 - was 이미지도 함께 갱신함 ^(업로드에 시간 걸림^)
) else (
  echo [info] images.tar.gz 없음 - DB 정리만 수행 ^(공개 사이트 반영은 이걸로 충분^)
)
echo.

REM -- 3. 업로드
echo == [1/3] 서버로 파일 업로드 ==
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

REM -- 4. 서버에서 적용 (원격 스크립트가 백업/삭제/검증 전부 수행)
echo == [2/3] 서버에서 적용 ==
if defined KEYFILE (
  ssh -t -i "%KEYFILE%" -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/remote-apply.sh > /tmp/remote-apply.lf.sh && bash /tmp/remote-apply.lf.sh"
) else (
  ssh -t -p %PORT% -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 %SSHUSER%@%HOST% "tr -d '\r' < /tmp/remote-apply.sh > /tmp/remote-apply.lf.sh && bash /tmp/remote-apply.lf.sh"
)
if errorlevel 1 (
  echo    [중단] 서버 적용 실패 - 트랜잭션이라 DB는 변경 전 상태 그대로. 위 [FAIL] 로그를 전달할 것.
  goto :fail
)
echo.

REM -- 5. 외부 최종 확인 (실서비스 API)
echo == [3/3] 외부 최종 확인 ==
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify.ps1"
if errorlevel 1 (
  echo    [중단] 외부 검증 실패 - 위 출력을 전달할 것.
  goto :fail
)
echo.
echo ============================================================
echo  완료. 학과 디렉터리에서 협동과정·계약학과가 제거됨.
echo  브라우저에서 직접 보려면: https://arise-ai.pusan.ac.kr 의
echo  학과 디렉토리 메뉴 (캐시 무시: Ctrl+F5)
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
