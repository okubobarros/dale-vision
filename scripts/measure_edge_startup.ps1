param(
  [string]$InstallDir = "",
  [string]$AgentLogPath = "",
  [string]$RunAgentLogPath = "",
  [string]$OutputCsvPath = ".\logs\edge_startup_measurements.csv",
  [int]$WarmupSeconds = 0
)

$ErrorActionPreference = "Stop"

function Parse-LogTimestamp {
  param([string]$Line)
  if ($Line -notmatch '^(?<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d{3}') { return $null }
  try {
    return [datetime]::ParseExact($Matches.ts, "yyyy-MM-dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture)
  } catch {
    return $null
  }
}

function Parse-RunAgentHeaderTimestamp {
  param([string]$Line)
  if ($Line -notmatch '^====\s*(?<d>\d{2}/\d{2}/\d{4})\s+(?<t>\d{1,2}:\d{2}:\d{2})') { return $null }
  $raw = "$($Matches.d) $($Matches.t)"
  $formats = @("dd/MM/yyyy H:mm:ss", "dd/MM/yyyy HH:mm:ss")
  foreach ($fmt in $formats) {
    try {
      return [datetime]::ParseExact($raw, $fmt, [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {}
  }
  return $null
}

function Get-LastBootTime {
  try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    return [System.Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)
  } catch {}
  try {
    $evt = Get-WinEvent -FilterHashtable @{ LogName = "System"; Id = 6005 } -MaxEvents 1 -ErrorAction Stop
    if ($evt -and $evt.TimeCreated) { return $evt.TimeCreated }
  } catch {}
  throw "Não foi possível determinar o horário de boot. Execute em PowerShell com permissões de leitura do log do sistema."
}

function Try-GetInstallDirFromTask {
  try {
    $q = schtasks /Query /TN "DaleVisionEdgeAgent" /V /FO LIST 2>$null
    if (-not $q) { return $null }
    $line = $q | Where-Object { $_ -match '^Tarefa a ser executada:\s*(.+)$' } | Select-Object -First 1
    if (-not $line) { return $null }
    if ($line -match '-InstallDir\s+"(?<dir>[^"]+)"') { return $Matches.dir }
    if ($line -match '-InstallDir\s+(?<dir>[^\s]+)') { return $Matches.dir.Trim() }
  } catch {}
  return $null
}

function Try-GetInstallDirFromRunAgentLog {
  param([string]$Path)
  if (-not $Path) { return $null }
  if (-not (Test-Path $Path)) { return $null }
  try {
    $tail = Get-Content -Path $Path -Tail 120 -ErrorAction Stop
    $root = $tail | Where-Object { $_ -match '^ROOT=(.+)$' } | Select-Object -Last 1
    if ($root -and $root -match '^ROOT=(.+)$') { return $Matches[1].Trim() }
  } catch {}
  return $null
}

function Try-LoadEnvMap {
  param([string]$EnvPath)
  $map = @{}
  if (-not $EnvPath) { return $map }
  if (-not (Test-Path $EnvPath)) { return $map }
  try {
    $lines = Get-Content -Path $EnvPath -ErrorAction Stop
    foreach ($line in $lines) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      $trim = $line.Trim()
      if ($trim.StartsWith("#")) { continue }
      $idx = $trim.IndexOf("=")
      if ($idx -lt 1) { continue }
      $k = $trim.Substring(0, $idx).Trim()
      $v = $trim.Substring($idx + 1).Trim()
      if ($k) { $map[$k] = $v }
    }
  } catch {}
  return $map
}

function Resolve-PathFromInstallDir {
  param([string]$Dir, [string]$RelativePath)
  if (-not $Dir) { return $null }
  try {
    return (Join-Path -Path $Dir -ChildPath $RelativePath)
  } catch {
    return $null
  }
}

function Get-FirstRunAgentStartAfter {
  param([datetime]$After)
  if (-not (Test-Path $RunAgentLogPath)) { return $null }
  $lines = Get-Content -Path $RunAgentLogPath -ErrorAction SilentlyContinue
  $candidates = New-Object System.Collections.Generic.List[datetime]
  foreach ($line in $lines) {
    if ($line -notlike "====*") { continue }
    $dt = Parse-RunAgentHeaderTimestamp -Line $line
    if ($null -ne $dt -and $dt -ge $After) {
      [void]$candidates.Add($dt)
    }
  }
  if ($candidates.Count -eq 0) { return $null }
  return ($candidates | Sort-Object | Select-Object -First 1)
}

function Get-FirstHeartbeatAfter {
  param([datetime]$After)
  if (-not (Test-Path $AgentLogPath)) { return $null }
  $lines = Get-Content -Path $AgentLogPath -ErrorAction SilentlyContinue
  $candidates = New-Object System.Collections.Generic.List[datetime]
  foreach ($line in $lines) {
    if ($line -notmatch "Heartbeat -> .* status=201") { continue }
    $dt = Parse-LogTimestamp -Line $line
    if ($null -ne $dt -and $dt -ge $After) {
      [void]$candidates.Add($dt)
    }
  }
  if ($candidates.Count -eq 0) { return $null }
  return ($candidates | Sort-Object | Select-Object -First 1)
}

function Ensure-OutputPath {
  $dir = Split-Path -Path $OutputCsvPath -Parent
  if ([string]::IsNullOrWhiteSpace($dir)) { return }
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

function To-Iso {
  param($Value)
  if ($null -eq $Value) { return "" }
  return ([datetime]$Value).ToString("s")
}

function To-NumberText {
  param($Value)
  if ($null -eq $Value) { return "" }
  return ([double]$Value).ToString("0.##", [System.Globalization.CultureInfo]::InvariantCulture)
}

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = Try-GetInstallDirFromTask
}

if ([string]::IsNullOrWhiteSpace($RunAgentLogPath)) {
  if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
    $RunAgentLogPath = Resolve-PathFromInstallDir -Dir $InstallDir -RelativePath "logs\run_agent.log"
  }
  if ([string]::IsNullOrWhiteSpace($RunAgentLogPath)) {
    $legacy = "C:\Users\$env:USERNAME\Downloads\dalevision-edge-agent-windows\logs\run_agent.log"
    $RunAgentLogPath = $legacy
  }
}

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = Try-GetInstallDirFromRunAgentLog -Path $RunAgentLogPath
}

$envPath = $null
$envMap = @{}
if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
  $envPath = Resolve-PathFromInstallDir -Dir $InstallDir -RelativePath ".env"
  $envMap = Try-LoadEnvMap -EnvPath $envPath
}

if ([string]::IsNullOrWhiteSpace($AgentLogPath)) {
  $daleLogDir = $null
  if ($envMap.ContainsKey("DALE_LOG_DIR")) { $daleLogDir = $envMap["DALE_LOG_DIR"] }
  if (-not [string]::IsNullOrWhiteSpace($daleLogDir)) {
    if ([System.IO.Path]::IsPathRooted($daleLogDir)) {
      $AgentLogPath = Join-Path -Path $daleLogDir -ChildPath "agent.log"
    } elseif (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
      $AgentLogPath = Resolve-PathFromInstallDir -Dir $InstallDir -RelativePath (Join-Path $daleLogDir "agent.log")
    }
  }
  if ([string]::IsNullOrWhiteSpace($AgentLogPath)) {
    $programDataLog = "C:\ProgramData\DaleVision\logs\agent.log"
    $localLog = $null
    if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
      $localLog = Resolve-PathFromInstallDir -Dir $InstallDir -RelativePath "logs\agent.log"
    }
    if ($localLog -and (Test-Path $localLog)) {
      $AgentLogPath = $localLog
    } else {
      $AgentLogPath = $programDataLog
    }
  }
}

Ensure-OutputPath

if ($WarmupSeconds -gt 0) {
  Start-Sleep -Seconds $WarmupSeconds
}

$bootTime = Get-LastBootTime
$runStart = Get-FirstRunAgentStartAfter -After $bootTime
$heartbeat = Get-FirstHeartbeatAfter -After $bootTime

$bootToRunSec = if ($runStart) { [math]::Round((New-TimeSpan -Start $bootTime -End $runStart).TotalSeconds, 2) } else { $null }
$runToHeartbeatSec = if ($runStart -and $heartbeat) { [math]::Round((New-TimeSpan -Start $runStart -End $heartbeat).TotalSeconds, 2) } else { $null }
$bootToHeartbeatSec = if ($heartbeat) { [math]::Round((New-TimeSpan -Start $bootTime -End $heartbeat).TotalSeconds, 2) } else { $null }

$result = "FAIL"
if ($heartbeat) {
  if ($bootToHeartbeatSec -le 300) {
    $result = "PASS"
  } else {
    $result = "SLOW"
  }
}

$row = [pscustomobject]@{
  measured_at_local = (Get-Date).ToString("s")
  boot_time_local = To-Iso $bootTime
  run_agent_start_local = To-Iso $runStart
  first_heartbeat_201_local = To-Iso $heartbeat
  boot_to_run_seconds = To-NumberText $bootToRunSec
  run_to_heartbeat_seconds = To-NumberText $runToHeartbeatSec
  boot_to_heartbeat_seconds = To-NumberText $bootToHeartbeatSec
  result = $result
  install_dir = $InstallDir
  env_path = $envPath
  agent_log_path = $AgentLogPath
  run_agent_log_path = $RunAgentLogPath
}

if (-not (Test-Path $OutputCsvPath)) {
  $row | Export-Csv -Path $OutputCsvPath -NoTypeInformation -Encoding UTF8
} else {
  $row | Export-Csv -Path $OutputCsvPath -NoTypeInformation -Encoding UTF8 -Append
}

Write-Host "Measurement written to $OutputCsvPath"
Write-Host ("boot_time_local          : " + (To-Iso $bootTime))
Write-Host ("run_agent_start_local    : " + (To-Iso $runStart))
Write-Host ("first_heartbeat_201_local: " + (To-Iso $heartbeat))
$bootToHeartbeatText = ""
if ($null -ne $bootToHeartbeatSec) { $bootToHeartbeatText = [string]$bootToHeartbeatSec }
Write-Host ("boot_to_heartbeat_seconds: " + $bootToHeartbeatText)
Write-Host ("result                   : " + $result)
Write-Host ("install_dir              : " + $InstallDir)
Write-Host ("env_path                 : " + $envPath)
