# Creates one git worktree + branch per lane and installs dependencies in parallel.
# Usage (repo root): powershell -File scripts/lanes.ps1
$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel)
$wtRoot = Join-Path (Split-Path $root -Parent) "traktor-wt"
New-Item -ItemType Directory -Force -Path $wtRoot | Out-Null
$lanes = @("landing", "map", "card-api", "slides")

foreach ($lane in $lanes) {
  $dir = Join-Path $wtRoot $lane
  if (-not (Test-Path $dir)) {
    git -C $root worktree add $dir -b "feat/$lane" main
  }
}

$jobs = foreach ($lane in $lanes) {
  $web = Join-Path (Join-Path $wtRoot $lane) "web"
  Start-Job -ScriptBlock { param($w) Set-Location $w; npm ci --no-audit --no-fund 2>&1 | Select-Object -Last 3 } -ArgumentList $web
}
$jobs | Wait-Job | Receive-Job
git -C $root worktree list
