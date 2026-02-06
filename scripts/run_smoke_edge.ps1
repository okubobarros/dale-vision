param(
  [string]$BASE = "http://127.0.0.1:8000",
  [Parameter(Mandatory = $true)][string]$STORE_ID,
  [Parameter(Mandatory = $true)][string]$USER_TOKEN,
  [Parameter(Mandatory = $true)][string]$EDGE_TOKEN,
  [switch]$NoNewWindows
)

$ErrorActionPreference = "Stop"

function MaskToken([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  return "***"
}

function LogLine([string]$line) {
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $full = "$ts $line"
  Write-Host $full
  Add-Content -Path $SmokeLog -Value $full -Encoding UTF8
}

function LogBlock([string]$title, [string]$content) {
  LogLine $title
  if (-not [string]::IsNullOrWhiteSpace($content)) {
    $content -split "`r?`n" | ForEach-Object {
      if (-not [string]::IsNullOrWhiteSpace($_)) { LogLine $_ }
    }
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EdgeRoot = Join-Path $RepoRoot "edge-agent"
$LogsDir = Join-Path $RepoRoot "logs"
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$SmokeLog = Join-Path $LogsDir "smoke.log"

$backendOut = Join-Path $LogsDir "backend.out.log"
$backendErr = Join-Path $LogsDir "backend.err.log"
$agentOut   = Join-Path $LogsDir "agent.out.log"
$agentErr   = Join-Path $LogsDir "agent.err.log"
$monOut     = Join-Path $LogsDir "monitor.out.log"
$monErr     = Join-Path $LogsDir "monitor.err.log"
$monStatusLog = Join-Path $LogsDir "monitor_edge_status.log"

LogLine "SMOKE start BASE=$BASE STORE_ID=$STORE_ID USER_TOKEN=$(MaskToken $USER_TOKEN) EDGE_TOKEN=$(MaskToken $EDGE_TOKEN) NoNewWindows=$NoNewWindows"
LogLine "Logs dir: $LogsDir"
LogLine "Logs: backend(out/err)=$backendOut / $backendErr"
LogLine "Logs: agent(out/err)=$agentOut / $agentErr"
LogLine "Logs: monitor(out/err)=$monOut / $monErr"
LogLine "Logs: monitor_status=$monStatusLog smoke=$SmokeLog"

# 1) Backend (Django) - cwd repo root para load_dotenv()
$backendCmd = "python manage.py runserver 0.0.0.0:8000 --noreload"

# 2) Edge Agent (env EDGE_TOKEN + run)
$edgeTokenEscaped = $EDGE_TOKEN.Replace('"', '`"')
$agentCmd = "& { `$env:EDGE_TOKEN = `"$edgeTokenEscaped`"; python -m src.agent run --config .\config\agent.yaml }"

# 3) Monitor (edge-status com USER_TOKEN)
$monScript = (Resolve-Path (Join-Path $RepoRoot "scripts\monitor_edge_status.ps1")).Path
$monCmd = "& `"$monScript`" -BASE `"$BASE`" -EDGE_STORE_ID `"$STORE_ID`" -USER_TOKEN `"$USER_TOKEN`" -EverySec 20 -TimeoutSec 15 -LogPath `"$monStatusLog`""

if ($NoNewWindows) {
  LogLine "Starting workers as Start-Job in current console..."

  $backendJob = Start-Job -Name "backend" -ScriptBlock {
    param($cwd, $out, $err)
    Set-Location $cwd
    python manage.py runserver 0.0.0.0:8000 --noreload 1>> $out 2>> $err
  } -ArgumentList $RepoRoot, $backendOut, $backendErr

  $agentJob = Start-Job -Name "agent" -ScriptBlock {
    param($cwd, $out, $err, $token)
    Set-Location $cwd
    $env:EDGE_TOKEN = $token
    python -m src.agent run --config .\config\agent.yaml 1>> $out 2>> $err
  } -ArgumentList $EdgeRoot, $agentOut, $agentErr, $EDGE_TOKEN

  $monitorJob = Start-Job -Name "monitor" -ScriptBlock {
    param($cwd, $out, $err, $script, $base, $store, $token, $logPath)
    Set-Location $cwd
    & $script -BASE $base -EDGE_STORE_ID $store -USER_TOKEN $token -EverySec 20 -TimeoutSec 15 -LogPath $logPath 1>> $out 2>> $err
  } -ArgumentList $RepoRoot, $monOut, $monErr, $monScript, $BASE, $STORE_ID, $USER_TOKEN, $monStatusLog

  LogLine "Jobs: backend=$($backendJob.Id) agent=$($agentJob.Id) monitor=$($monitorJob.Id)"
} else {
  Start-Process -FilePath "powershell" `
    -WorkingDirectory $RepoRoot `
    -ArgumentList @("-NoExit","-NoProfile","-ExecutionPolicy","Bypass","-Command",$backendCmd) `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError  $backendErr

  Start-Sleep -Seconds 2

  Start-Process -FilePath "powershell" `
    -WorkingDirectory $EdgeRoot `
    -ArgumentList @("-NoExit","-NoProfile","-ExecutionPolicy","Bypass","-Command",$agentCmd) `
    -RedirectStandardOutput $agentOut `
    -RedirectStandardError  $agentErr

  Start-Sleep -Seconds 2

  Start-Process -FilePath "powershell" `
    -WorkingDirectory $RepoRoot `
    -ArgumentList @("-NoExit","-NoProfile","-ExecutionPolicy","Bypass","-Command",$monCmd) `
    -RedirectStandardOutput $monOut `
    -RedirectStandardError  $monErr

  Start-Sleep -Seconds 3
}

# 4) Sanity checks
try {
  $testScript = Join-Path $RepoRoot "scripts\test_edge_event.ps1"
  $testOutput = & $testScript -BASE $BASE -STORE_ID $STORE_ID -EDGE_TOKEN $EDGE_TOKEN 2>&1 | Out-String
  LogBlock "SANITY test_edge_event output:" $testOutput
} catch {
  LogLine "SANITY test_edge_event ERROR: $($_.Exception.Message)"
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    LogLine $_.ErrorDetails.Message
  }
}

try {
  $url = "$BASE/api/v1/stores/$STORE_ID/edge-status/"
  $resp = Invoke-RestMethod -Method Get -Uri $url -Headers @{ Authorization = "Token $USER_TOKEN" } -TimeoutSec 15
  $respJson = $resp | ConvertTo-Json -Depth 6 -Compress
  LogLine "SANITY edge-status OK: $respJson"
} catch {
  $msg = $_.Exception.Message
  $body = $null
  try {
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $body = ($_.ErrorDetails.Message | ConvertFrom-Json)
    }
  } catch {}

  if ($body) {
    LogLine "SANITY edge-status ERROR: $msg | body=$($body | ConvertTo-Json -Depth 6 -Compress)"
  } else {
    LogLine "SANITY edge-status ERROR: $msg"
  }
}
