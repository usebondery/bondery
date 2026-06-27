# Enable PostgreSQL SSL on the local Supabase DB container for PowerSync + ngrok.
#
# Local Supabase does not ship with SSL enabled. PowerSync Cloud requires SSL
# (verify-ca) when connecting through an ngrok TCP tunnel.
#
# Usage (from apps/supabase-db):
#   npm run powersync:ssl
#   ./scripts/enable-powersync-ssl.ps1
#   ./scripts/enable-powersync-ssl.ps1 -Force   # regenerate certs even if present
#
# See docs/powersync-local-development.md for the full workflow.

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Resolve-Path (Join-Path $ScriptDir "..")
$CertDir = Join-Path $AppRoot "certs"
$LocalCert = Join-Path $CertDir "server.cert"
$PgCustomDir = "/etc/postgresql-custom"
$SslMarker = "ssl = on"

function Write-Step([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "  OK  $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    Write-Host "  !!  $Message" -ForegroundColor Yellow
}

function Write-Err([string]$Message) {
    Write-Host "  ERR $Message" -ForegroundColor Red
}

function Get-ProjectId {
    $configPath = Join-Path $AppRoot "supabase\config.toml"
    if (-not (Test-Path $configPath)) {
        throw "Missing supabase/config.toml. Run this script from apps/supabase-db."
    }

    $match = Select-String -Path $configPath -Pattern '^\s*project_id\s*=\s*"([^"]+)"' | Select-Object -First 1
    if (-not $match) {
        throw "Could not read project_id from supabase/config.toml"
    }

    return $match.Matches[0].Groups[1].Value
}

function Get-DbPort {
    $configPath = Join-Path $AppRoot "supabase\config.toml"
    $match = Select-String -Path $configPath -Pattern '^\s*port\s*=\s*(\d+)' -Context 0, 0 |
        Where-Object { $_.Line -match '^\s*port\s*=' -and $_.Filename -eq 'config.toml' } |
        Select-Object -First 1

    # [db] section port is the first port= after [db] in config.toml (default 54322).
    $content = Get-Content $configPath -Raw
    if ($content -match '(?s)\[db\].*?^\s*port\s*=\s*(\d+)') {
        return [int]$Matches[1]
    }

    return 54322
}

function Get-DbContainerName([string]$ProjectId) {
    $expected = "supabase_db_$ProjectId"
    $running = docker ps --format "{{.Names}}" 2>$null |
        Where-Object { $_ -eq $expected }

    if ($running) {
        return $expected
    }

    # Fallback: any container whose name starts with supabase_db_
    $fallback = docker ps --format "{{.Names}}" 2>$null |
        Where-Object { $_ -match '^supabase_db_' } |
        Select-Object -First 1

    if ($fallback) {
        Write-Warn "Expected container '$expected' not found; using '$fallback'."
        return $fallback
    }

    return $null
}

function Test-ContainerSslEnabled([string]$Container) {
    $result = docker exec $Container psql -U postgres -d postgres -tAc "SHOW ssl;" 2>$null
    return ($result.Trim() -eq "on")
}

function Test-ContainerCertExists([string]$Container) {
    docker exec $Container test -f "$PgCustomDir/server.cert" 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Test-ContainerSslConfigured([string]$Container) {
    docker exec $Container grep -q $SslMarker "$PgCustomDir/supautils.conf" 2>$null
    return ($LASTEXITCODE -eq 0)
}

Write-Host "`nPowerSync SSL setup (local Supabase)" -ForegroundColor Cyan

# Docker available?
try {
    docker version *> $null
} catch {
    throw "Docker is not available. Start Docker Desktop and try again."
}

$projectId = Get-ProjectId
$dbPort = Get-DbPort
$container = Get-DbContainerName -ProjectId $projectId

if (-not $container) {
    Write-Err "No local Supabase DB container found (supabase_db_*)."
    Write-Host "Start Supabase first: npm run start" -ForegroundColor Yellow
    exit 1
}

Write-Ok "Project: $projectId"
Write-Ok "Container: $container"
Write-Ok "DB port: $dbPort"

$sslOn = Test-ContainerSslEnabled -Container $container
$certExists = Test-ContainerCertExists -Container $container
$sslConfigured = Test-ContainerSslConfigured -Container $container

if ($sslOn -and $certExists -and $sslConfigured -and -not $Force) {
    Write-Ok "SSL is already enabled and certificates exist."
} else {
    if ($Force) {
        Write-Warn "Force flag set - regenerating certificates."
    }

    Write-Step "Generating self-signed certificate in container..."
    $genCmd = 'cd /etc/postgresql-custom && openssl req -days 3650 -new -text -nodes -subj "/C=US/O=Dev/CN=supabase_dev" -keyout server.key -out server.csr && openssl req -days 3650 -x509 -text -in server.csr -key server.key -out server.cert && chown postgres:postgres server.key server.csr server.cert'
    docker exec $container sh -c $genCmd
    if ($LASTEXITCODE -ne 0) { throw "Failed to generate SSL certificate inside container." }
    Write-Ok "Certificate created at $PgCustomDir/server.cert"

    if (-not (Test-ContainerSslConfigured -Container $container)) {
        Write-Step "Enabling SSL in PostgreSQL config..."
        docker exec $container sh -c "grep -q 'ssl = on' /etc/postgresql-custom/supautils.conf || printf '\n\nssl = on\nssl_ciphers = '\''HIGH:MEDIUM:+3DES:!aNULL'\''\nssl_prefer_server_ciphers = on\nssl_cert_file = '\''/etc/postgresql-custom/server.cert'\''\nssl_key_file = '\''/etc/postgresql-custom/server.key'\''\n' >> /etc/postgresql-custom/supautils.conf"
        if ($LASTEXITCODE -ne 0) { throw "Failed to append SSL settings to supautils.conf." }
        Write-Ok "SSL settings appended to supautils.conf"
    } else {
        Write-Ok "SSL settings already present in supautils.conf"
    }

    Write-Step "Restarting database container..."
    docker restart $container | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to restart container $container." }

    Start-Sleep -Seconds 5

    $sslOn = Test-ContainerSslEnabled -Container $container
    if (-not $sslOn) {
        Write-Err "SSL is still off after restart. Check logs:"
        Write-Host "  docker logs $container" -ForegroundColor Yellow
        exit 1
    }
    Write-Ok "PostgreSQL SSL is on"
}

Write-Step "Copying server.cert to certs/server.cert..."
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null
docker cp "${container}:${PgCustomDir}/server.cert" $LocalCert
if ($LASTEXITCODE -ne 0) { throw "Failed to copy server.cert from container." }
Write-Ok "Saved to $LocalCert"

Write-Host "`nDone." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor DarkGray
Write-Host "  1. Run SQL setup if not done yet (see supabase/snippets/Setup/powersync_publication.sql)" -ForegroundColor DarkGray
Write-Host "  2. Start ngrok:  ngrok tcp $dbPort" -ForegroundColor DarkGray
Write-Host "  3. In PowerSync, connect with ngrok host (no tcp://), ngrok port, password postgres," -ForegroundColor DarkGray
Write-Host "     SSL verify-ca, cert at certs/server.cert" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Full guide: docs/powersync-local-development.md" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Note: SSL config is lost after supabase stop/start or db reset. Re-run: npm run powersync:ssl" -ForegroundColor DarkGray
