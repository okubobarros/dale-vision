param(
  [string]$BASE = "http://127.0.0.1:8000",
  [string]$STORE_ID,
  [string]$EDGE_TOKEN = "dev-edge-123",
  [string]$CAMERA_ID = "cam01"
)

$ErrorActionPreference = "Stop"

$payload = @{
  event_name = "edge_camera_heartbeat"
  store_id   = $STORE_ID
  camera_id  = $CAMERA_ID
  ts         = (Get-Date).ToString("o")
  payload    = @{ ok = $true }
} | ConvertTo-Json -Depth 10

Write-Host "POST $BASE/api/edge/events/  store=$STORE_ID camera=$CAMERA_ID token=***"

try {
  $r = Invoke-RestMethod -Method Post -Uri "$BASE/api/edge/events/" `
    -Headers @{ "X-EDGE-TOKEN" = $EDGE_TOKEN } `
    -ContentType "application/json" -Body $payload

  $r | ConvertTo-Json -Depth 10
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  if ($_.ErrorDetails) { $_.ErrorDetails.Message }
  throw
}
