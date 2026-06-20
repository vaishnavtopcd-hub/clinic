# Starts the local (no-admin) PostgreSQL 16 cluster installed under C:\pglocal.
# Use this after a reboot, since it is not a Windows service.
$bin  = "C:\pglocal\pg\bin"
$data = "C:\pglocal\data"
$log  = "C:\pglocal\pg.log"

if (-not (Test-Path "$data\PG_VERSION")) {
  Write-Host "No cluster found at $data. Run the initial setup first." -ForegroundColor Red
  exit 1
}

$running = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
if ($running.TcpTestSucceeded) {
  Write-Host "Postgres already running on :5432" -ForegroundColor Green
  exit 0
}

& "$bin\pg_ctl.exe" -D $data -l $log -o "-p 5432" start
Start-Sleep -Seconds 2
Write-Host "Postgres started on localhost:5432 (db: physio_clinic, user: postgres)" -ForegroundColor Green
