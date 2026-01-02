# Start Backend with ngrok HTTPS Tunnel
# Run this script instead of npm run dev for OAuth development

Write-Host "🔧 Starting Backend with ngrok HTTPS..." -ForegroundColor Cyan

# Check if ngrok is installed
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "❌ ngrok not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install ngrok:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install ngrok" -ForegroundColor White
    Write-Host "  Option 2: Download from https://ngrok.com/download" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if backend is already running on port 5000
$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 5000 is already in use" -ForegroundColor Yellow
    $choice = Read-Host "Kill existing process and continue? (y/n)"
    if ($choice -eq 'y') {
        $pid = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
        Stop-Process -Id $pid -Force
        Write-Host "✅ Killed process $pid" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        exit 0
    }
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start backend in background
Write-Host "1️⃣  Starting backend server on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal

# Wait for backend to start
Write-Host "   Waiting for backend to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start ngrok
Write-Host ""
Write-Host "2️⃣  Starting ngrok tunnel..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000" -WindowStyle Normal

# Wait for ngrok to start
Start-Sleep -Seconds 3

# Get ngrok URL
Write-Host ""
Write-Host "3️⃣  Fetching ngrok URL..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
    $httpsUrl = ($ngrokApi.tunnels | Where-Object { $_.proto -eq 'https' }).public_url

    if ($httpsUrl) {
        Write-Host ""
        Write-Host "✅ ngrok tunnel is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  🔗 Your HTTPS URL:" -ForegroundColor Cyan
        Write-Host "     $httpsUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Update backend/.env:" -ForegroundColor White
        Write-Host "   BACKEND_URL=$httpsUrl" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Update Slack App Redirect URI:" -ForegroundColor White
        Write-Host "   $httpsUrl/api/integrations/slack/oauth/callback" -ForegroundColor Gray
        Write-Host "   https://api.slack.com/apps" -ForegroundColor Blue
        Write-Host ""
        Write-Host "3. Restart backend server to load new BACKEND_URL" -ForegroundColor White
        Write-Host ""

        # Copy URL to clipboard
        Set-Clipboard -Value $httpsUrl
        Write-Host "📋 HTTPS URL copied to clipboard!" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "⚠️  Could not fetch ngrok URL automatically" -ForegroundColor Yellow
    Write-Host "   Check the ngrok terminal window for your HTTPS URL" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both services are running in separate windows" -ForegroundColor Cyan
Write-Host "Press any key to exit this script..." -ForegroundColor Gray
Write-Host "(The services will keep running in their own windows)" -ForegroundColor Gray
Write-Host ""
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
