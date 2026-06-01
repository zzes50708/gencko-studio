#requires -Version 5.1

$ErrorActionPreference = 'Stop'

function Assert-GitRepo {
  $gitDir = Join-Path (Get-Location) '.git'
  if (-not (Test-Path $gitDir)) {
    throw "Not a git repo (missing .git). Please cd to D:\\Users\\User\\Desktop\\gencko-vercel"
  }
}

function Exec([string]$cmd, [string[]]$cmdArgs) {
  & $cmd @cmdArgs
  if ($LASTEXITCODE -ne 0) {
    throw ("Command failed: " + $cmd + " " + ($cmdArgs -join ' '))
  }
}

Assert-GitRepo

$status = & git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "git status failed" }

if ($status) {
  Exec git @('add','.')
  Exec git @('commit','-m','redeploy')
} else {
  Write-Host "No changes; skipping commit."
}

Exec git @('push','origin','main')
