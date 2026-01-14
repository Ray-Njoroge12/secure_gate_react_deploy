# start-server.ps1
# Usage:
#   .\start-server.ps1             # starts on default port 8080
#   .\start-server.ps1 -Port 8080  # explicit port
#   powershell -ExecutionPolicy Bypass -File .\start-server.ps1 -Port 8080

param(
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

function Throw-ErrorAndExit($message, $code=1) {
    Write-Error $message
    exit $code
}

Write-Host "1/5 - Checking Node.js availability and version..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Throw-ErrorAndExit "Node.js is not installed or not on PATH. Install Node.js >= 18 and re-run."
}

$nodeVersion = (& node --version) -replace '\r|\n',''
if ($nodeVersion -match '^v(\d+)\.(\d+)\.(\d+)') {
    $major = [int]$matches[1]
    if ($major -lt 18) {
        Throw-ErrorAndExit "Detected Node.js version $nodeVersion. Node >= 18 is required."
    } else {
        Write-Host "Detected Node.js $nodeVersion (OK)."
    }
} else {
    Write-Warning "Could not parse Node version output: '$nodeVersion'. Proceeding anyway."
}

$root = Get-Location
$serverPath = Join-Path $root "secure-gate-access\server"

if (-not (Test-Path $serverPath)) {
    Throw-ErrorAndExit "Server folder not found at '$serverPath'. Ensure you're running this from the repo root."
}

try {
    Write-Host "2/5 - Installing dependencies at repo root (this will run postinstall too)..."
    npm install

    Write-Host "3/5 - Setting PORT environment variable for this process to $Port..."
    # This sets the environment variable for the current PowerShell process and child processes (npm/node)
    $env:PORT = [string]$Port

    Write-Host "4/5 - Changing to server folder: $serverPath"
    Set-Location $serverPath

    Write-Host "5/5 - Starting the server (npm start). The process will log to this console."
    Write-Host "➡️ Server will try to bind to port $Port (if available). If PORT is in use, startup will fail."
    npm start
}
catch {
    Write-Error "Script failed: $_"
    exit 2
}
finally {
    # Optionally return to repo root
    # Set-Location $root
}
