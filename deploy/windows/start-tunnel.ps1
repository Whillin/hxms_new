param(
    [string]$RemoteHost = "106.52.174.194",
    [int]$LocalPort = 13306,
    [int]$RemotePort = 13306,
    [string]$IdentityFile = "$env:USERPROFILE\.ssh\hxms_tunnel_ed25519"
)

# Ensure identity file exists
if (-not (Test-Path -Path $IdentityFile)) {
    Write-Error "Identity file not found: $IdentityFile"
    exit 1
}

# If a tunnel is already listening on LocalPort, skip starting
try {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction SilentlyContinue
} catch {}
if ($listener) {
    Write-Output "Tunnel already listening on 127.0.0.1:$LocalPort"
    exit 0
}

$sshExe = "ssh"
$argsList = @(
    "-i", "$IdentityFile",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=5",
    "-o", "ExitOnForwardFailure=yes",
    "-N",
    "-L", "$LocalPort:127.0.0.1:$RemotePort",
    "root@$RemoteHost"
)

# Start hidden background process
Start-Process -FilePath $sshExe -ArgumentList $argsList -WindowStyle Hidden
Write-Output "SSH tunnel started: 127.0.0.1:$LocalPort -> $($RemoteHost):$RemotePort"