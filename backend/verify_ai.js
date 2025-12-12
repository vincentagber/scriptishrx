const path = require('path');
// Load .env from project root (one level up from backend/)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const ragService = require('./src/services/ragService');

async function verify() {
    console.log('--- Verifying AI Integration ---');
    console.log('Checking Environment: OPENAI_API_KEY is', process.env.OPENAI_API_KEY ? 'SET' : 'MISSING');

    const queries = [
        "How much is the wellness lounge?",
        "Tell me a joke about Chicago",
        "Where are you located?"
    ];

    for (const q of queries) {
        console.log(`\nUser: "${q}"`);
        const start = Date.now();
        const response = await ragService.query(q);
        const duration = Date.now() - start;
        console.log(`AI: "${response}" (took ${duration}ms)`);
    }
}

verify();
