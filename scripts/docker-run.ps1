# Uruchamia obraz TRAKTOR. Uzycie: powershell -File scripts/docker-run.ps1 [-Port 3031] [-Tag traktor:local] [-Name traktor-app]
# Klucze opcjonalne (ANTHROPIC_API_KEY, GOOGLE_MAPS_API_KEY) sa przekazywane tylko, gdy sa ustawione w powloce.
param([int]$Port = 3031, [string]$Tag = "traktor:local", [string]$Name = "traktor-app")
$ErrorActionPreference = "Stop"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Brak polecenia 'docker'. Zainstaluj Docker Desktop." }
$sha = (git rev-parse --short HEAD 2>$null); if (-not $sha) { $sha = "local" }

docker rm -f $Name 2>$null | Out-Null
$runArgs = @("run", "-d", "--name", $Name, "--init", "--restart", "unless-stopped", "-p", "${Port}:3000", "-e", "VERCEL_GIT_COMMIT_SHA=$sha")
foreach ($k in "ANTHROPIC_API_KEY", "GOOGLE_MAPS_API_KEY") {
  if ([Environment]::GetEnvironmentVariable($k)) { $runArgs += @("-e", $k) }  # przekazuje wartosc z powloki, nie wypisuje jej
}
docker @runArgs $Tag
if ($LASTEXITCODE -ne 0) { throw "docker run nie powiodl sie" }

$url = "http://localhost:$Port"
for ($i = 0; $i -lt 30; $i++) {
  try { $h = Invoke-RestMethod "$url/api/health" -TimeoutSec 3; if ($h.ok) { break } } catch { Start-Sleep -Seconds 1 }
}
if ($h.ok) { Write-Output "OK: $url/analiza (sha $($h.sha))" } else { Write-Warning "Brak odpowiedzi /api/health. Logi: docker logs $Name" }
Write-Output "Logi: docker logs -f $Name   Stop: docker rm -f $Name"
