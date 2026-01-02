# Simple ngrok starter for backend
Write-Host "Starting ngrok tunnel on port 5000..." -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
try {
    $null = Get-Command ngrok -ErrorAction Stop
} catch {
    Write-Host "ERROR: ngrok not found!" -ForegroundColor Red
    Write-Host "Install with: choco install ngrok" -ForegroundColor Yellow
    Write-Host "Or download from: https://ngrok.com/download" -ForegroundColor Yellow
    pause
    exit 1
}

# Check port 5000
$port = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if (-not $port) {
    Write-Host "WARNING: Backend is not running on port 5000" -ForegroundColor Yellow
    Write-Host "Start backend first with: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 0
    }
}

Write-Host ""
Write-Host "Starting ngrok..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop ngrok when done" -ForegroundColor Gray
Write-Host ""

# Start ngrok
ngrok http 5000
