param(
  [Parameter(Mandatory = $true)]
  [string]$StoreId,

  [ValidateSet("pre", "post", "full")]
  [string]$Mode = "full",

  [ValidateSet("all", "stable", "canary")]
  [string]$Channel = "all",

  [int]$Hours = 24,

  [string]$OutputDir = "dalevision-specs/70_ops/field-validation",

  [string]$PythonCmd = "python"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$ts] $Message"
}

function Ensure-Dir {
  param([string]$PathValue)
  if (-not (Test-Path -Path $PathValue)) {
    New-Item -Path $PathValue -ItemType Directory -Force | Out-Null
  }
}

function Run-ValidationPack {
  param(
    [string]$PhaseLabel
  )

  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $mdPath = Join-Path $OutputDir "S4_Field_${PhaseLabel}_${stamp}.md"
  $jsonPath = Join-Path $OutputDir "S4_Field_${PhaseLabel}_${stamp}.json"

  $args = @(
    "manage.py",
    "edge_s4_validation_pack",
    "--store-id", $StoreId,
    "--hours", $Hours,
    "--channel", $Channel,
    "--output", $mdPath,
    "--json-output", $jsonPath
  )

  Write-Step "Running edge_s4_validation_pack ($PhaseLabel)..."
  & $PythonCmd @args
  if ($LASTEXITCODE -ne 0) {
    throw "edge_s4_validation_pack failed for phase '$PhaseLabel' (exit code $LASTEXITCODE)."
  }

  Write-Step "Artifacts generated:"
  Write-Host "  - $mdPath"
  Write-Host "  - $jsonPath"
}

Ensure-Dir -PathValue $OutputDir

Write-Step "S4 field validation started."
Write-Host "  StoreId : $StoreId"
Write-Host "  Mode    : $Mode"
Write-Host "  Channel : $Channel"
Write-Host "  Hours   : $Hours"
Write-Host "  Output  : $OutputDir"

switch ($Mode) {
  "pre" {
    Run-ValidationPack -PhaseLabel "Precheck"
  }
  "post" {
    Run-ValidationPack -PhaseLabel "PostCanary"
  }
  "full" {
    Run-ValidationPack -PhaseLabel "Precheck"
    Write-Host ""
    Write-Host ">>> Execute canary/rollback steps in store, then press ENTER to continue..."
    Read-Host | Out-Null
    Run-ValidationPack -PhaseLabel "PostCanary"
  }
}

Write-Step "S4 field validation finished."
