# Buduje obraz TRAKTOR. Uzycie (katalog glowny repo): powershell -File scripts/docker-build.ps1 [-Tag traktor:local]
param([string]$Tag = "traktor:local")
$ErrorActionPreference = "Stop"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Brak polecenia 'docker'. Zainstaluj Docker Desktop." }
$root = (git rev-parse --show-toplevel)
$sha = (git -C $root rev-parse --short HEAD)
$repo = $Tag.Split(":")[0]
$sw = [Diagnostics.Stopwatch]::StartNew()
docker build -t $Tag -t "${repo}:$sha" $root
if ($LASTEXITCODE -ne 0) { throw "docker build nie powiodl sie" }
Write-Output ("Zbudowano {0} (+ {1}:{2}) w {3:N0} s" -f $Tag, $repo, $sha, $sw.Elapsed.TotalSeconds)
docker images $repo
