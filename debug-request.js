// Run this in your browser console to debug
async function testRegistration() {
  console.clear();
  console.log("🧪 Testing registration endpoint...");

  const testData = {
    email: `test${Date.now()}@test.com`,
    password: "Test1234!",
    name: "Test User"
  };

  console.log("📤 Sending data:", testData);

  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(testData)
    });

    console.log("📥 Response status:", response.status);
    console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log("📥 Response data:", data);

    if (response.ok) {
      console.log("✅ Success!");
    } else {
      console.log("❌ Failed!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testRegistration();
