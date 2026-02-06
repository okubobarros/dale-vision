param(
  [string]$BASE = "http://127.0.0.1:8000",
  [string]$EDGE_SHARED_TOKEN = "dev-edge-123",
  [string]$STORE_ID,
  [string]$USERNAME = "alexandre",
  [string]$PASSWORD,
  [int]$STALE_AFTER_SECONDS = 120,
  [int]$EXPIRED_AFTER_SECONDS = 300
)

if (-not $STORE_ID) { throw "STORE_ID is required" }
if (-not $PASSWORD) { throw "PASSWORD is required" }

Write-Host "== LOGIN =="
$resp = Invoke-RestMethod -Method Post -Uri "$BASE/api/accounts/login/" -ContentType "application/json" `
  -Body (@{username=$USERNAME; password=$PASSWORD} | ConvertTo-Json)
$TOKEN = $resp.token
if (-not $TOKEN) { throw "Login failed: token missing" }
Write-Host "✅ token ok"

Write-Host "== POST edge_camera_heartbeat =="
$cam = @{
  event_name = "edge_camera_heartbeat"
  receipt_id = ("cam01-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  data = @{
    store_id    = $STORE_ID
    camera_id   = "cam01"
    external_id = "cam01"
    name        = "Balcao"
    rtsp_url    = "rtsp://127.0.0.1:18554/cam01"
    ts          = (Get-Date -AsUTC -Format o)
  }
} | ConvertTo-Json -Depth 10

$r = curl.exe -s -X POST "$BASE/api/edge/events/" `
  -H "X-EDGE-TOKEN: $EDGE_SHARED_TOKEN" `
  -H "Content-Type: application/json" `
  -d $cam

Write-Host "ingest: $r"
if ($r -notmatch '"ok":true') { throw "Ingest failed" }

Write-Host "== GET edge-status (should be online/degraded) =="
$st = curl.exe -s "$BASE/api/v1/stores/$STORE_ID/edge-status/" -H "Authorization: Token $TOKEN" | ConvertFrom-Json
Write-Host ("store_status={0} reason={1}" -f $st.store_status, $st.store_status_reason)
if (@("online","degraded") -notcontains $st.store_status) { throw "Unexpected store_status" }

Write-Host ("cameras={0}" -f ($st.cameras | Measure-Object).Count)
Write-Host "✅ edge-status ok"

Write-Host "== WAIT -> STALE =="
Start-Sleep -Seconds ($STALE_AFTER_SECONDS + 10)
$st2 = curl.exe -s "$BASE/api/v1/stores/$STORE_ID/edge-status/" -H "Authorization: Token $TOKEN" | ConvertFrom-Json
Write-Host ("after stale: store_status={0} age={1} reason={2}" -f $st2.store_status, $st2.store_status_age_seconds, $st2.store_status_reason)

Write-Host "== WAIT -> EXPIRED =="
Start-Sleep -Seconds ($EXPIRED_AFTER_SECONDS - $STALE_AFTER_SECONDS + 10)
$st3 = curl.exe -s "$BASE/api/v1/stores/$STORE_ID/edge-status/" -H "Authorization: Token $TOKEN" | ConvertFrom-Json
Write-Host ("after expired: store_status={0} age={1} reason={2}" -f $st3.store_status, $st3.store_status_age_seconds, $st3.store_status_reason)

Write-Host "== RUN TICK (offline without ingest) =="
# Requires you added management command apps/edge/management/commands/status_tick.py
python manage.py status_tick --store-id $STORE_ID

Write-Host "== DONE =="
Write-Host "🎉 Smoke Contract C OK"
