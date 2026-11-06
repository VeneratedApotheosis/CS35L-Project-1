Set-Location $PSScriptRoot
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
$p = Start-Process -FilePath "npx" -ArgumentList "next dev -p 5178" -PassThru -RedirectStandardOutput dev.out.log -RedirectStandardError dev.err.log -NoNewWindow
Start-Sleep -Seconds 15
try {
  $r = Invoke-WebRequest -Uri "http://localhost:5178/plants" -UseBasicParsing -TimeoutSec 25
  Write-Output ("HTTP " + $r.StatusCode)
} catch {
  Write-Output ("REQUEST ERROR: " + $_.Exception.Message)
}
Start-Sleep -Seconds 2
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Output "=== dev stderr tail ==="
Get-Content dev.err.log -ErrorAction SilentlyContinue | Select-Object -Last 40
Write-Output "=== dev stdout tail ==="
Get-Content dev.out.log -ErrorAction SilentlyContinue | Select-Object -Last 25
