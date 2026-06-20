# Stops the local (no-admin) PostgreSQL 16 cluster under C:\pglocal.
$bin  = "C:\pglocal\pg\bin"
$data = "C:\pglocal\data"
& "$bin\pg_ctl.exe" -D $data stop -m fast
Write-Host "Postgres stopped." -ForegroundColor Yellow
