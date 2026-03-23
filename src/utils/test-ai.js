const fetch = require('node-fetch');
require('dotenv').config();

const testOpenRouter = async () => {
    console.log("--- OpenRouter Diagnostic ---");
    console.log("API Key found in .env:", process.env.OPENROUTER_API_KEY ? "YES (stars: " + process.env.OPENROUTER_API_KEY.substring(0, 10) + "...)" : "NO");
    console.log("Model requested:", process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
        });

        const data = await response.json();

        if (response.status === 200) {
            console.log("\n✅ Success! Your API key is valid.");
            console.log("Available models (count):", data.data?.length || 0);
        } else if (response.status === 401) {
            console.error("\n❌ Error 401: Unauthorized (User not found).");
            console.error("This means the API key starting with '" + process.env.OPENROUTER_API_KEY.substring(0, 10) + "' is NOT recognized by OpenRouter.");
            console.error("Please re-generate a new key at https://openrouter.ai/settings/keys");
        } else {
            console.error("\n❌ Other Error:", response.status, JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("\n❌ Network Error:", error.message);
    }
};

testOpenRouter();
