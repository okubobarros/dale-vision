param(
  [string]$OutDir = ".\_snapshot"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$md = Join-Path $OutDir "snapshot_$ts.md"
$json = Join-Path $OutDir "snapshot_$ts.json"
$treeFile = Join-Path $OutDir "tree_$ts.txt"

function Run($cmd) {
  try { return Invoke-Expression $cmd | Out-String }
  catch { return "ERROR running: $cmd`n$($_.Exception.Message)`n" }
}

# Tree (paths only)
$exclude = @(
  ".git","venv",".venv","__pycache__","node_modules",".pytest_cache",
  "staticfiles",".mypy_cache",".ruff_cache",".vscode","_snapshot"
)

$items = Get-ChildItem -Recurse -Force -ErrorAction SilentlyContinue |
  Where-Object {
    $p = $_.FullName.ToLower()
    foreach ($e in $exclude) {
      if ($p -like "*\$e\*" -or $p -like "*/$e/*") { return $false }
    }
    return $true
  }

$paths = $items | ForEach-Object {
  $_.FullName.Replace((Get-Location).Path + "\", "")
} | Sort-Object

$paths | Set-Content -Encoding UTF8 $treeFile

# Env snapshot (sem vazar segredo)
$envSample = @(
  "DJANGO_SETTINGS_MODULE=$env:DJANGO_SETTINGS_MODULE",
  "DB_HOST=$env:DB_HOST",
  "DB_NAME=$env:DB_NAME",
  "DB_USER=$env:DB_USER",
  "DB_PORT=$env:DB_PORT",
  "DB_SSLMODE=$env:DB_SSLMODE",
  "EDGE_AGENT_TOKEN=(hidden)",
  "EDGE_SHARED_TOKEN=(hidden)",
  "SUPABASE_URL=$env:SUPABASE_URL"
) -join "`n"

# Versions
$git = Run "git rev-parse --abbrev-ref HEAD; git rev-parse HEAD; git status -sb"
$py = Run "python --version"
$pip = Run "pip --version"
$freeze = Run "pip freeze"
$docker = Run "docker version"

# JSON summary
$obj = [ordered]@{
  timestamp   = (Get-Date).ToString("s")
  cwd         = (Get-Location).Path
  python      = $py.Trim()
  pip         = $pip.Trim()
  git         = $git.Trim()
  docker      = $docker.Trim()
  env_sample  = $envSample
  files_count = $paths.Count
  tree_file   = $treeFile
}

$obj | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $json

# Markdown report (AQUI é onde entram $git, $py, etc.)
$freezeTop = ((($freeze -split "`n") | Select-Object -First 120) -join "`n")

@"
# DALE VISION — Project Snapshot ($ts)

## CWD
$($obj.cwd)

## Git
$git

## Python / Pip
$py
$pip

## Pip freeze (first 120 lines)
$freezeTop

## Docker version
$docker

## Env (redacted)
$envSample

## Tree file
$treeFile
"@ | Set-Content -Encoding UTF8 $md

Write-Host "OK: $md"
Write-Host "OK: $json"
Write-Host "OK: $treeFile"
