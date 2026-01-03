"use client";

import React from "react";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";

interface TrackingTestFileProps {
  workspaceId: string;
}

export default function TrackingTestFile({ workspaceId }: TrackingTestFileProps) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const generateTestHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MorrisB Tracking Test Page</title>

    <!-- MorrisB Tracking Code -->
    <script src="${backendUrl}/track.js" async></script>
    <script>
      window.addEventListener('load', function() {
        if (window.morrisb) {
          var tracker = morrisb('${workspaceId}', {
            apiEndpoint: '${backendUrl}'
          });
          console.log('✅ MorrisB tracking initialized!');
          console.log('Visitor ID:', tracker.getVisitorId());
          console.log('Session ID:', tracker.getSessionId());
        } else {
          console.error('❌ MorrisB tracking failed to load');
        }
      });
    </script>

    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #1a202c;
            margin-bottom: 10px;
        }
        .status {
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 500;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-box h3 {
            margin-top: 0;
            color: #2d3748;
        }
        .info-item {
            margin: 10px 0;
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 10px 10px 10px 0;
            transition: background 0.2s;
        }
        button:hover {
            background: #5568d3;
        }
        .track-click {
            background: #48bb78;
        }
        .track-click:hover {
            background: #38a169;
        }
        code {
            background: #f7fafc;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            color: #e53e3e;
        }
        .instructions {
            background: #fff5e6;
            border-left: 4px solid #ed8936;
            padding: 16px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 MorrisB Tracking Test Page</h1>
        <p>This page is set up to test MorrisB lead tracking.</p>

        <div id="status" class="status">
            <span id="status-text">⏳ Checking tracking status...</span>
        </div>

        <div class="info-box">
            <h3>📊 Tracking Information</h3>
            <div class="info-item">
                <strong>Workspace ID:</strong> <span id="workspace-id">${workspaceId}</span>
            </div>
            <div class="info-item">
                <strong>Visitor ID:</strong> <span id="visitor-id">Loading...</span>
            </div>
            <div class="info-item">
                <strong>Session ID:</strong> <span id="session-id">Loading...</span>
            </div>
            <div class="info-item">
                <strong>Page Views:</strong> <span id="page-views">1</span>
            </div>
        </div>

        <div class="instructions">
            <h3>📋 What to do:</h3>
            <ol>
                <li>Open your browser's developer console (F12)</li>
                <li>Look for the message: <code>✅ MorrisB tracking initialized!</code></li>
                <li>Click the buttons below to test event tracking</li>
                <li>Check your MorrisB dashboard for visitor activity</li>
            </ol>
        </div>

        <h3>🧪 Test Actions</h3>
        <button class="track-click" onclick="testClick()">
            Test Button Click
        </button>
        <button onclick="testCustomEvent()">
            Test Custom Event
        </button>
        <button onclick="testIdentify()">
            Test Identify (Email)
        </button>

        <div id="event-log" style="margin-top: 20px;">
            <h3>📝 Event Log</h3>
            <div id="events" style="background: #f7fafc; padding: 16px; border-radius: 8px; min-height: 100px; font-family: monospace; font-size: 12px;">
                <div>Waiting for events...</div>
            </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px;">
                <strong>Next steps:</strong> If tracking is working, you should see this visitor appear in your
                <a href="/projects/${workspaceId}/visitors" style="color: #667eea;">MorrisB Dashboard → Visitors</a>
            </p>
        </div>
    </div>

    <script>
        let eventCount = 0;
        const events = [];

        // Check if tracking loaded
        window.addEventListener('load', function() {
            setTimeout(function() {
                const statusDiv = document.getElementById('status');
                const statusText = document.getElementById('status-text');

                if (window.morrisb) {
                    statusDiv.className = 'status success';
                    statusText.textContent = '✅ Tracking is working! All events are being sent to MorrisB.';

                    const tracker = window.morrisb('${workspaceId}', { apiEndpoint: '${backendUrl}' });
                    document.getElementById('visitor-id').textContent = tracker.getVisitorId();
                    document.getElementById('session-id').textContent = tracker.getSessionId();

                    logEvent('Page view tracked automatically');
                } else {
                    statusDiv.className = 'status error';
                    statusText.textContent = '❌ Tracking failed to load. Check console for errors.';
                }
            }, 1000);
        });

        function logEvent(message) {
            eventCount++;
            events.unshift(\`[\${new Date().toLocaleTimeString()}] \${message}\`);
            document.getElementById('events').innerHTML = events.slice(0, 10).map(e => \`<div>\${e}</div>\`).join('');
        }

        function testClick() {
            if (window.morrisb) {
                window.morrisb('${workspaceId}', { apiEndpoint: '${backendUrl}' }).trackClick('Test Button');
                logEvent('✅ Button click tracked');
                alert('Button click tracked! Check your dashboard.');
            }
        }

        function testCustomEvent() {
            if (window.morrisb) {
                window.morrisb('${workspaceId}', { apiEndpoint: '${backendUrl}' }).track('custom', 'Test Event', {
                    testProperty: 'Test Value',
                    timestamp: new Date().toISOString()
                });
                logEvent('✅ Custom event tracked');
                alert('Custom event tracked! Check your dashboard.');
            }
        }

        function testIdentify() {
            const email = prompt('Enter an email to test visitor identification:');
            if (email && window.morrisb) {
                window.morrisb('${workspaceId}', { apiEndpoint: '${backendUrl}' }).identify(email, {
                    firstName: 'Test',
                    lastName: 'User',
                    source: 'Test Page'
                });
                logEvent(\`✅ Visitor identified as \${email}\`);
                alert('Visitor identified! This visitor will now be linked to ' + email + ' in your dashboard.');
            }
        }
    </script>
</body>
</html>`;
  };

  const downloadTestFile = () => {
    const htmlContent = generateTestHTML();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `morrisb-tracking-test-${workspaceId.slice(0, 8)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadTestFile}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
    >
      <DocumentArrowDownIcon className="w-5 h-5" />
      Download Test Page
    </button>
  );
}
