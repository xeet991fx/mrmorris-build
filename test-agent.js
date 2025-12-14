const https = require('https');
const http = require('http');

// Test the agent endpoint
async function testAgent() {
  const message = "Hello! Can you search for all contacts in my CRM?";

  const data = JSON.stringify({
    message: message,
    context: {
      workspaceId: "test-workspace-id", // You'll need a real workspace ID
      autonomousMode: true,
      model: "gemini"
    },
    conversationHistory: []
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/agent/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      // You'll need to add: 'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Headers:', res.headers);
      console.log('\n--- Agent Response (SSE Stream) ---\n');

      res.on('data', (chunk) => {
        const text = chunk.toString();
        console.log(text);
      });

      res.on('end', () => {
        console.log('\n--- Stream Ended ---');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Note: This test won't work without proper authentication
console.log('⚠️  To test the agent properly, you need:');
console.log('1. A valid JWT token (login via /api/auth/login)');
console.log('2. A valid workspace/project ID');
console.log('3. Proper GEMINI_API_KEY in .env\n');

console.log('Attempting test (will likely fail with 401 Unauthorized)...\n');

testAgent().catch(err => {
  console.error('Test failed:', err.message);
});
