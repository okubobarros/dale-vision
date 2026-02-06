param(
  [Parameter(Mandatory = $true)][string]$BASE,
  [Parameter(Mandatory = $true)][string]$EDGE_STORE_ID,
  [Parameter(Mandatory = $true)][string]$USER_TOKEN,
  [int]$EverySec = 20,
  [int]$TimeoutSec = 15,
  [string]$LogPath = ""
)

$ErrorActionPreference = "Continue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path (Join-Path $RepoRoot "logs") "monitor_edge_status.log"
}

$logDir = Split-Path $LogPath -Parent
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function LogLine([string]$line) {
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $full = "$ts $line"
  Write-Host $full
  Add-Content -Path $LogPath -Value $full -Encoding UTF8
}

function TryReadBody($err) {
  try {
    if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
      return ($err.ErrorDetails.Message | ConvertFrom-Json)
    }
  } catch {}
  return $null
}

LogLine "START monitor BASE=$BASE store=$EDGE_STORE_ID every=${EverySec}s timeout=${TimeoutSec}s log=$LogPath"

while ($true) {
  $url = "$BASE/api/v1/stores/$EDGE_STORE_ID/edge-status/"
  try {
    $resp = Invoke-RestMethod -Method Get -Uri $url -Headers @{ Authorization = "Token $USER_TOKEN" } -TimeoutSec $TimeoutSec
    $status = $resp.store_status
    $online = "$($resp.cameras_online)/$($resp.cameras_total)"
    $age = $resp.store_status_age_seconds
    $reason = $resp.store_status_reason
    LogLine "OK status=$status online=$online age=$age reason=$reason"
  } catch {
    $msg = $_.Exception.Message
    $body = TryReadBody $_

    $statusCode = $null
    try { $statusCode = $_.Exception.Response.StatusCode.value__ } catch {}

    if ($statusCode -eq 503) {
      $reason = $null
      try { $reason = $body.store_status_reason } catch {}
      if ($reason -eq "db_unavailable") {
        LogLine "WARN edge-status HTTP 503 (db_unavailable) -> DB instavel (monitor continua)"
      } else {
        LogLine "WARN edge-status HTTP 503 -> Service Unavailable (monitor continua)"
      }
    }
    elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
      LogLine "ERR edge-status HTTP $statusCode -> Unauthorized/Forbidden (ver USER_TOKEN/perm)"
    }
    else {
      if ($body) {
        LogLine "ERR edge-status -> $msg | body=$($body | ConvertTo-Json -Depth 6 -Compress)"
      } else {
        LogLine "ERR edge-status -> $msg"
      }
    }
  }

  Start-Sleep -Seconds $EverySec
}
