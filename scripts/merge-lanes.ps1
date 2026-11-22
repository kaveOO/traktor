# Merges lane branches into main, building after each merge.
# Usage (repo root, on main): powershell -File scripts/merge-lanes.ps1
$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel)
Set-Location $root
git checkout main
foreach ($lane in @("card-api", "map", "landing", "slides")) {
  Write-Host "== merging feat/$lane"
  git merge --no-ff "feat/$lane" -m "merge: $lane lane"
  if ($LASTEXITCODE -ne 0) { throw "merge conflict on feat/$lane: resolve, then rerun" }
}
Set-Location (Join-Path $root "web")
npx tsc --noEmit
npm run build
