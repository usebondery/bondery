#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Point this laptop's .test domains at the WSL Portless proxy on the PC.

.DESCRIPTION
  Dev servers stay on the PC. This script writes the Windows hosts file,
  trusts the Portless CA from the PC, and forwards local TCP 443 into WSL.

  Keep the window open while you browse. Ctrl+C stops the tunnel.

.PARAMETER SshTarget
  SSH login for the PC WSL. Defaults to BONDERY_DEV_SSH_TARGET, then to the
  online Linux Tailscale peer (MagicDNS name, not a remembered IP).

.PARAMETER InstallOnly
  Write hosts and trust the CA. Do not start the tunnel.

.PARAMETER RemoveHosts
  Remove the Bondery hosts block. Does not close a running tunnel.
#>
[CmdletBinding()]
param(
  [string]$SshTarget = $env:BONDERY_DEV_SSH_TARGET,
  [switch]$InstallOnly,
  [switch]$RemoveHosts
)

$ErrorActionPreference = "Stop"

$HostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$MarkerBegin = "# BEGIN BONDERY-REMOTE-PORTLESS"
$MarkerEnd = "# END BONDERY-REMOTE-PORTLESS"
# Fallback when node_modules is missing. Keep in lockstep with DEV_URLS.
$FallbackHostnames = @(
  "api.usebondery.test",
  "app.usebondery.test",
  "mail.usebondery.test",
  "usebondery.test"
)

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-TailscaleExe {
  $cmd = Get-Command tailscale.exe -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $candidates = @(
    (Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Tailscale\tailscale.exe")
  )
  foreach ($path in $candidates) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }
  throw "tailscale.exe not found. Install Tailscale or pass -SshTarget."
}

function Get-MagicDnsName {
  param([string]$Value)
  return ([string]$Value).Trim().TrimEnd(".")
}

function Get-InferredSshUser {
  param(
    [string]$HostName,
    [string]$DnsName
  )
  $source = if ($HostName) { $HostName } else { (Get-MagicDnsName $DnsName).Split(".")[0] }
  $first = ($source -split "[^A-Za-z0-9]+")[0]
  return $first.ToLower()
}

function Get-OnlineLinuxPeers {
  param($Status)
  if (-not $Status.Peer) {
    return @()
  }
  return @(
    $Status.Peer.PSObject.Properties.Value |
      Where-Object { $_.Online -and ([string]$_.OS).ToLower() -eq "linux" }
  )
}

function Get-LinuxDevPeer {
  param($Peers)
  if ($Peers.Count -eq 1) {
    return $Peers[0]
  }
  $wsl = @(
    $Peers | Where-Object {
      $name = "$( $_.HostName ) $( Get-MagicDnsName $_.DNSName )"
      $name -match "wsl"
    }
  )
  if ($wsl.Count -eq 1) {
    return $wsl[0]
  }
  $names = ($Peers | ForEach-Object { Get-MagicDnsName $_.DNSName }) -join ", "
  throw "Found $($Peers.Count) online Linux Tailscale peers ($names). Set BONDERY_DEV_SSH_TARGET."
}

function Resolve-TailscaleSshTarget {
  $fromNode = $null
  $repoRoot = Get-RepoRoot
  $helper = Join-Path $repoRoot "scripts\dev\connect-remote-portless.mjs"
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node -and (Test-Path $helper)) {
    Push-Location $repoRoot
    try {
      $output = & node $helper target 2>$null
      if ($LASTEXITCODE -eq 0 -and $output) {
        $fromNode = ([string]$output).Trim()
      }
    } finally {
      Pop-Location
    }
  }
  if ($fromNode) {
    return $fromNode
  }

  $status = & (Get-TailscaleExe) status --json | ConvertFrom-Json
  if (-not $status.Self) {
    throw "Tailscale status has no Self node. Is Tailscale running?"
  }
  $node = $status.Self
  if (([string]$status.Self.OS).ToLower() -ne "linux") {
    $peers = Get-OnlineLinuxPeers -Status $status
    if ($peers.Count -eq 0) {
      throw "No online Linux Tailscale peer. Start WSL Tailscale on the PC."
    }
    $node = Get-LinuxDevPeer -Peers $peers
  }
  $hostName = Get-MagicDnsName $node.DNSName
  if (-not $hostName) {
    throw "Tailscale node has no MagicDNS name. Enable MagicDNS on the tailnet."
  }
  $user = $env:BONDERY_DEV_SSH_USER
  if (-not $user) {
    $user = Get-InferredSshUser -HostName $node.HostName -DnsName $hostName
  }
  if (-not $user) {
    throw "Could not infer the SSH user. Set BONDERY_DEV_SSH_USER."
  }
  return "$user@$hostName"
}

function Get-PortlessHostnames {
  $repoRoot = Get-RepoRoot
  $helper = Join-Path $repoRoot "scripts\dev\connect-remote-portless.mjs"
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node -and (Test-Path $helper)) {
    Push-Location $repoRoot
    try {
      $output = & node $helper hosts 2>$null
      if ($LASTEXITCODE -eq 0 -and $output) {
        return @($output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
      }
    } finally {
      Pop-Location
    }
  }
  return $FallbackHostnames
}

function Get-HostsContent {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Hosts file not found: $Path"
  }
  return [System.IO.File]::ReadAllText($Path)
}

function Set-HostsContent {
  param(
    [string]$Path,
    [string]$Content
  )
  $normalized = $Content -replace "`r`n", "`n" -replace "`n", "`r`n"
  if (-not $normalized.EndsWith("`r`n")) {
    $normalized += "`r`n"
  }
  [System.IO.File]::WriteAllText($Path, $normalized)
}

function Remove-BonderyHostsBlock {
  param([string]$Content)
  $pattern = "(?ms)^$([regex]::Escape($MarkerBegin)).*?^$([regex]::Escape($MarkerEnd))\r?\n?"
  return [regex]::Replace($Content, $pattern, "")
}

function Write-BonderyHostsBlock {
  param(
    [string]$Content,
    [string[]]$Hostnames
  )
  $without = (Remove-BonderyHostsBlock -Content $Content).TrimEnd()
  $lines = @($MarkerBegin) + ($Hostnames | ForEach-Object { "127.0.0.1 $_" }) + @($MarkerEnd)
  return $without + "`r`n`r`n" + ($lines -join "`r`n") + "`r`n"
}

function Install-PortlessCa {
  param([string]$Target)
  $scp = Get-Command scp.exe -ErrorAction SilentlyContinue
  if (-not $scp) {
    throw "scp.exe not found. Install OpenSSH Client."
  }
  $caPath = Join-Path $env:TEMP "bondery-portless-ca.pem"
  & scp.exe -q "${Target}:.portless/ca.pem" $caPath
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $caPath)) {
    throw "Could not copy ${Target}:.portless/ca.pem. Start Portless on the PC first."
  }
  & certutil.exe -user -addstore Root $caPath | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "certutil failed to trust the Portless CA."
  }
}

function Test-LocalPort443Free {
  $listeners = Get-NetTCPConnection -LocalPort 443 -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    throw "TCP 443 is already in use on this laptop. Stop that process, then re-run."
  }
}

function Start-PortlessTunnel {
  param([string]$Target)
  $ssh = Get-Command ssh.exe -ErrorAction SilentlyContinue
  if (-not $ssh) {
    throw "ssh.exe not found. Install OpenSSH Client."
  }
  Test-LocalPort443Free
  Write-Host "Tunneling 127.0.0.1:443 -> ${Target}:127.0.0.1:443"
  Write-Host "Leave this window open. Ctrl+C stops the tunnel."
  Write-Host "Open https://usebondery.test/"
  & ssh.exe -N -o ExitOnForwardFailure=yes -L "127.0.0.1:443:127.0.0.1:443" $Target
  if ($LASTEXITCODE -ne 0) {
    throw "SSH tunnel exited with code $LASTEXITCODE."
  }
}

if ($RemoveHosts) {
  $current = Get-HostsContent -Path $HostsPath
  Set-HostsContent -Path $HostsPath -Content (Remove-BonderyHostsBlock -Content $current)
  Write-Host "Removed the Bondery remote Portless hosts block."
  exit 0
}

if (-not $SshTarget) {
  $SshTarget = Resolve-TailscaleSshTarget
  Write-Host "SSH target: $SshTarget"
}

$hostnames = Get-PortlessHostnames
$current = Get-HostsContent -Path $HostsPath
Set-HostsContent -Path $HostsPath -Content (Write-BonderyHostsBlock -Content $current -Hostnames $hostnames)
Write-Host "Wrote $($hostnames.Count) hostname(s) to $HostsPath"

Install-PortlessCa -Target $SshTarget
Write-Host "Trusted the Portless CA for this Windows user."

if ($InstallOnly) {
  Write-Host "Install finished. Re-run without -InstallOnly to start the tunnel."
  exit 0
}

Start-PortlessTunnel -Target $SshTarget
