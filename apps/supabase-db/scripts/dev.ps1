# Check if Supabase is running and start if needed
Write-Host "Checking Supabase status..." -ForegroundColor Cyan

$statusOutput = npx supabase status 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "Supabase is not running. Starting Supabase..." -ForegroundColor Yellow
    npx supabase start
} else {
    Write-Host "Supabase is already running!" -ForegroundColor Green
    Write-Host $statusOutput
}
