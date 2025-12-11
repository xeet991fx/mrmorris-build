
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function listModels() {
    try {
        const key = process.env.GEMINI_API_KEY;
        console.log(`Debug: Loading .env from ${path.join(__dirname, ".env")}`);
        console.log(`API Key status: ${key ? "Present (starts with " + key.substring(0, 4) + "...)" : "Missing"}`);

        if (!key) {
            console.error("❌ ERROR: GEMINI_API_KEY is missing in .env file");
            return;
        }

        const genAI = new GoogleGenerativeAI(key);
        // Test a few common models
        const modelsToTest = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

        console.log("Starting model test...");

        for (const modelName of modelsToTest) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`✅ SUCCESS: ${modelName} is working!`);
                const response = await result.response;
                console.log(`Response: ${response.text()}`);
                process.exit(0); // Exit on first success
            } catch (error) {
                console.log(`❌ FAILED: ${modelName}`);
                console.log(`Error: ${error.message}`);
            }
        }
        console.log("\n❌ All models failed.");
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

listModels();
