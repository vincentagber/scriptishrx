const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');
const ctaService = require('../services/ctaService');
const guideService = require('../services/guideService');

const clientService = require('../services/clientService');

router.post('/', async (req, res) => {
    try {
        const { message, sessionId, tenantId, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Gather Context from Services (RAG, CTA, Guide)
        let context = "";

        // RAG Context
        const ragResponse = await ragService.query(message);
        if (ragResponse) {
            context += `\n[Internal Knowledge Base]: ${ragResponse}\n`;
        }

        // CTA Context (Directions)
        const ctaResponse = ctaService.getDirections(message);
        if (ctaResponse) {
            context += `\n[Directions Info]: ${ctaResponse}\n`;
        }

        // Guide Context (Sightseeing)
        const guideResponse = guideService.getRecommendation(message);
        if (guideResponse) {
            context += `\n[Sightseeing Info]: ${guideResponse}\n`;
        }

        // 2. Setup OpenAI and DB
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prisma = require('../lib/prisma');

        // Fetch Conversation History
        let history = [];
        if (sessionId) {
            const previousMessages = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { createdAt: 'desc' },
                take: 10 // Last 10 messages for context
            });
            // Reverse to chronological order
            history = previousMessages.reverse().map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        }

        // Save Current User Message
        if (tenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: message,
                    tenantId,
                    userId: userId || null
                }
            });
        }

        // Fetch Tenant for Customization
        let tenantParams = { aiName: 'ScriptishRx AI', customSystemPrompt: null, plan: 'Basic' };
        if (tenantId) {
            const tenantData = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenantData) {
                tenantParams = tenantData;
            }
        }

        // 3. Construct System Prompt
        // We include the full Knowledge Base text from RAG service's faqs logic implicitly via 'context' 
        // OR we can embed the core text directly if we want it to be super robust.
        // For now, let's make the System Prompt very strong.

        const systemPrompt = `You are ${tenantParams.aiName}, a sophisticated, humble, and polite AI concierge for ScriptishRx Wellness and Travel in Chicago.
        
        CORE BUSINESS INFO:
        - WE ARE: A wellness center for travelers (luggage storage, lounge, workspaces).
        - LOCATION: 111 N Wabash Ave, Chicago, IL 60602 (Garland Building).
        - CONTACT: info@scriptishrx.com, +1 (872) 873-2880.
        - SERVICES:
          1. Wellness Lounge ($49.99/2hr): Relax, WiFi, refreshments.
          2. Luggage Drop-off ($4.99/hr): Secure storage.
          3. Hourly Workspace ($24.99/hr): Private desk, WiFi, outlets.
        
        See below for specific context retrieved for this query:
        ${context ? context : "No specific internal KB match found for this turn."}

        INSTRUCTIONS:
        1. BE ROBUST & INTELLIGENT: Respond like a high-end concierge. Be helpful, proactive, and knowledgeable.
        2. USE HISTORY: The conversation history is provided. Refer back to previous things the user said.
        3. LEAD CAPTURE: If the user wants to book or asking about prices extensively, casually ask for their Name and Email to "have a consultant reach out". Trigger 'saveLead' tool if they provide it.
        4. TONE: Kind, warm, professional, humble.
        5. UNKNOWN: If you don't know, offer to connect them with a human (info@scriptishrx.com). Do not hallucinate prices.

        ${tenantParams.customSystemPrompt ? `CUSTOM INSTRUCTIONS: ${tenantParams.customSystemPrompt}` : ''}
        `;

        // 4. OpenAI Call with History + Tools
        const messages = [
            { role: "system", content: systemPrompt },
            ...history, // Insert history here
            { role: "user", content: message }
        ];

        const tools = [
            {
                type: "function",
                function: {
                    name: "saveLead",
                    description: "Save a new lead to the CRM. Extract name/email from conversation.",
                    parameters: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" },
                            notes: { type: "string" }
                        },
                        required: ["name", "email"]
                    }
                }
            }
        ];

        let completion = await openai.chat.completions.create({
            model: "gpt-4o", // Strongest model for robustness
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        let aiMessage = completion.choices[0].message;

        // 5. Handle Tool Calls
        if (aiMessage.tool_calls) {
            const toolCalls = aiMessage.tool_calls;
            for (const toolCall of toolCalls) {
                if (toolCall.function.name === 'saveLead') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log('🤖 Chatbot triggering saveLead:', args);

                    const targetTenantId = tenantId || (await prisma.tenant.findFirst())?.id;
                    let toolResult = "Failed to save lead.";

                    if (targetTenantId) {
                        const success = await clientService.captureClient(args, targetTenantId, 'Chatbot');
                        toolResult = success ? "Lead saved successfully." : "Failed to save lead in database.";
                    } else {
                        toolResult = "No tenant context found.";
                    }

                    // Feed result back
                    messages.push(aiMessage); // Add original tool call msg
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });

                    completion = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: messages
                    });
                    aiMessage = completion.choices[0].message;
                }
            }
        }

        const aiContent = aiMessage.content || "I'm listening.";

        // 6. Save AI Response
        if (tenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: aiContent,
                    tenantId,
                    userId: userId || null
                }
            });
        }

        return res.json({
            role: 'assistant',
            content: aiContent
        });

    } catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
