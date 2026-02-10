const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;

if (!key) {
    console.error("No key found!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);

const models = ["gemini-pro", "gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro"];

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`✅ Success with ${modelName}:`, response.text());
        return true;
    } catch (e) {
        console.error(`❌ Failed with ${modelName}:`, e.message);
        return false;
    }
}

(async () => {
    for (const m of models) {
        if (await testModel(m)) break;
    }
})();
