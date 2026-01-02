#!/bin/bash
# Start Backend with ngrok HTTPS Tunnel
# Run this script instead of npm run dev for OAuth development

echo "🔧 Starting Backend with ngrok HTTPS..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found!"
    echo ""
    echo "Please install ngrok:"
    echo "  Option 1: choco install ngrok"
    echo "  Option 2: Download from https://ngrok.com/download"
    echo ""
    exit 1
fi

# Kill existing processes on port 5000
echo "Checking for existing processes on port 5000..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Killing existing process on port 5000..."
    kill -9 $(lsof -t -i:5000) 2>/dev/null || taskkill //F //PID $(netstat -ano | findstr :5000 | findstr LISTENING | awk '{print $5}' | head -1) 2>/dev/null
    sleep 2
fi

echo ""
echo "Starting services..."
echo ""

# Start backend in background
echo "1️⃣  Starting backend server on port 5000..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 5

# Start ngrok in background
echo ""
echo "2️⃣  Starting ngrok tunnel..."
ngrok http 5000 > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
echo ""
echo "3️⃣  Fetching ngrok URL..."
sleep 2

NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*ngrok[^"]*' | head -1)

if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "✅ ngrok tunnel is ready!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  🔗 Your HTTPS URL:"
    echo "     $NGROK_URL"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Update backend/.env:"
    echo "   BACKEND_URL=$NGROK_URL"
    echo ""
    echo "2. Update Slack App Redirect URI:"
    echo "   $NGROK_URL/api/integrations/slack/oauth/callback"
    echo "   https://api.slack.com/apps"
    echo ""
    echo "3. Restart backend server to load new BACKEND_URL"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo ""
    echo "⚠️  Could not fetch ngrok URL automatically"
    echo "   Open http://127.0.0.1:4040 in your browser to see your HTTPS URL"
    echo ""
fi

# Keep script running
echo "Both services are running (Backend PID: $BACKEND_PID, ngrok PID: $NGROK_PID)"
echo ""
echo "Press Ctrl+C to stop all services..."
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $NGROK_PID 2>/dev/null; echo 'Services stopped'; exit 0" INT

wait
