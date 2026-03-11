param(
  [string]$CsvPath = ".\logs\edge_startup_measurements.csv",
  [double]$PassThresholdSeconds = 300,
  [double]$RequiredPassRate = 1.0,
  [int]$MinSamples = 5
)

$ErrorActionPreference = "Stop"

function Parse-Number {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  $normalized = $Value.Trim().Replace(",", ".")
  $parsed = 0.0
  if ([double]::TryParse($normalized, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
    return $parsed
  }
  return $null
}

function Get-Percentile {
  param(
    [double[]]$Values,
    [double]$Percentile
  )
  if (-not $Values -or $Values.Count -eq 0) { return $null }
  $sorted = $Values | Sort-Object
  if ($sorted.Count -eq 1) { return [double]$sorted[0] }
  $rank = ($Percentile / 100.0) * ($sorted.Count - 1)
  $low = [math]::Floor($rank)
  $high = [math]::Ceiling($rank)
  if ($low -eq $high) { return [double]$sorted[$low] }
  $w = $rank - $low
  return [double]$sorted[$low] + ($w * ([double]$sorted[$high] - [double]$sorted[$low]))
}

if (-not (Test-Path $CsvPath)) {
  throw "CSV não encontrado: $CsvPath"
}

$rows = Import-Csv -Path $CsvPath
if (-not $rows -or $rows.Count -eq 0) {
  throw "CSV vazio: $CsvPath"
}

$total = $rows.Count
$passRows = @($rows | Where-Object { $_.result -eq "PASS" })
$slowRows = @($rows | Where-Object { $_.result -eq "SLOW" })
$failRows = @($rows | Where-Object { $_.result -eq "FAIL" })

$durations = New-Object System.Collections.Generic.List[double]
foreach ($r in $rows) {
  $v = Parse-Number -Value $r.boot_to_heartbeat_seconds
  if ($null -ne $v) { [void]$durations.Add($v) }
}

$avg = $null
$p50 = $null
$p95 = $null
$max = $null
if ($durations.Count -gt 0) {
  $avg = ($durations | Measure-Object -Average).Average
  $p50 = Get-Percentile -Values $durations.ToArray() -Percentile 50
  $p95 = Get-Percentile -Values $durations.ToArray() -Percentile 95
  $max = ($durations | Measure-Object -Maximum).Maximum
}

$passRate = 0.0
if ($total -gt 0) {
  $passRate = [math]::Round(($passRows.Count / $total), 4)
}

$go = $true
$reasons = New-Object System.Collections.Generic.List[string]
if ($total -lt $MinSamples) {
  $go = $false
  [void]$reasons.Add("amostras insuficientes ($total/$MinSamples)")
}
if ($passRate -lt $RequiredPassRate) {
  $go = $false
  [void]$reasons.Add("pass_rate abaixo do mínimo ($passRate < $RequiredPassRate)")
}
if ($failRows.Count -gt 0) {
  $go = $false
  [void]$reasons.Add("há medições FAIL ($($failRows.Count))")
}
if ($null -ne $max -and $max -gt $PassThresholdSeconds) {
  $go = $false
  [void]$reasons.Add("há boot_to_heartbeat acima do limite (${PassThresholdSeconds}s), max=$([math]::Round($max,2))s")
}

$verdict = if ($go) { "GO_S1" } else { "NO_GO" }
$reasonText = if ($reasons.Count -eq 0) { "critério atendido" } else { ($reasons -join "; ") }

Write-Host "=== Edge Startup Measurements Analysis ==="
Write-Host ("csv_path                  : " + $CsvPath)
Write-Host ("samples                   : " + $total)
Write-Host ("pass / slow / fail        : {0} / {1} / {2}" -f $passRows.Count, $slowRows.Count, $failRows.Count)
Write-Host ("pass_rate                 : " + $passRate)
if ($null -ne $avg) { Write-Host ("avg_boot_to_heartbeat_sec : " + ([math]::Round($avg, 2))) }
if ($null -ne $p50) { Write-Host ("p50_boot_to_heartbeat_sec : " + ([math]::Round($p50, 2))) }
if ($null -ne $p95) { Write-Host ("p95_boot_to_heartbeat_sec : " + ([math]::Round($p95, 2))) }
if ($null -ne $max) { Write-Host ("max_boot_to_heartbeat_sec : " + ([math]::Round($max, 2))) }
Write-Host ("pass_threshold_seconds    : " + $PassThresholdSeconds)
Write-Host ("required_pass_rate        : " + $RequiredPassRate)
Write-Host ("min_samples               : " + $MinSamples)
Write-Host ("VERDICT                   : " + $verdict)
Write-Host ("VERDICT_REASON            : " + $reasonText)

if (-not $go) {
  exit 2
}
