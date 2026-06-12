# 외부에서 실서비스 API를 호출해 협동과정·계약학과가 사라졌는지 확인
$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
try {
  $r = Invoke-RestMethod 'https://arise-ai.pusan.ac.kr/api/departments' -TimeoutSec 20
} catch {
  Write-Host "   [FAIL] API 호출 실패: $_"
  exit 1
}
$bad = @($r | Where-Object { $_.gyeyeol -in @('협동과정', '계약학과') })
Write-Host ("   학과 수: {0} / 협동과정·계약학과 잔존: {1} (기대 0)" -f $r.Count, $bad.Count)
if ($bad.Count -ne 0) { exit 1 }
exit 0
