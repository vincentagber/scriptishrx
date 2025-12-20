// backend/src/services/voiceService.js
const twilioService = require('./twilioService');
const prisma = require('../lib/prisma');

// In-memory storage for call logs (TODO: Move to Database 'CommunicationLogs')
const callLogs = [];

/**
 * Get call logs for a tenant
 */
function getCallLogs(tenantId = null) {
    // In production, query the database
    if (tenantId) {
        return callLogs.filter(log => log.tenantId === tenantId);
    }
    return callLogs;
}

/**
 * Get Call Status
 */
async function getCallStatus(callId, tenantId = null) {
    // First check local logs
    const log = callLogs.find(log => {
        if (tenantId) {
            return log.callId === callId && log.tenantId === tenantId;
        }
        return log.callId === callId;
    });

    if (log) {
        return {
            callId: log.callId,
            status: log.status,
            phoneNumber: log.phoneNumber,
            duration: log.duration,
            timestamp: log.timestamp,
            tenantId: log.tenantId,
            source: 'local_log'
        };
    }

    // If not found locally, check Twilio
    try {
        const status = await twilioService.getCallStatus(tenantId, callId);
        return {
            ...status,
            source: 'twilio_api'
        };
    } catch (e) {
        return null;
    }
}

/**
 * Handle WebSocket Connection for Twilio Media Stream
 */
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Map to store active transcripts: streamSid -> string[]
const activeTranscripts = new Map();
const activeCallers = new Map(); // streamSid -> { phoneNumber, tenantId }

// Helper to save minute
async function saveMeetingMinute(streamSid) {
    const transcriptParts = activeTranscripts.get(streamSid);
    if (!transcriptParts || transcriptParts.length === 0) {
        activeTranscripts.delete(streamSid);
        activeCallers.delete(streamSid);
        return;
    }

    const fullTranscript = transcriptParts.join(' ');
    const callerInfo = activeCallers.get(streamSid);

    // Default tenant if not found (e.g. for demo)
    const tenantId = callerInfo?.tenantId;

    console.log(`[VoiceService] Generating Minute for Stream ${streamSid}...`);

    try {
        // 1. AI Summarization
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert secretary. Convert the following call transcript into a professional meeting minute summary." },
                { role: "user", content: fullTranscript }
            ],
        });
        const summary = completion.choices[0].message.content;

        if (tenantId) {
            // 2. Find Client
            let client = null;
            if (callerInfo?.phoneNumber) {
                client = await prisma.client.findFirst({
                    where: { phone: callerInfo.phoneNumber, tenantId }
                });
            }

            // 3. Save to DB
            await prisma.meetingMinute.create({
                data: {
                    tenantId,
                    clientId: client ? client.id : undefined, // Link if client found
                    content: `[AI Generated from Call]\n\n${summary}`,
                    createdAt: new Date()
                }
            });
            console.log('[VoiceService] Meeting Minute saved successfully.');
        }

    } catch (err) {
        console.error('[VoiceService] Failed to save minute:', err);
    } finally {
        activeTranscripts.delete(streamSid);
        activeCallers.delete(streamSid);
    }
}

/**
 * Handle WebSocket Connection for Twilio Media Stream
 */
function handleConnection(ws, req) {
    console.log('[VoiceService] New Media Stream Connection');
    let streamSid = null;

    ws.on('message', async (message) => {
        try {
            const msg = JSON.parse(message);
            switch (msg.event) {
                case 'connected':
                    console.log('[Twilio] Stream connected protocol: ' + msg.protocol);
                    break;
                case 'start':
                    streamSid = msg.start.streamSid;
                    console.log(`[Twilio] Stream started: ${streamSid}`);
                    activeTranscripts.set(streamSid, []); // Initialize transcript array

                    // Identify caller (Custom Parameter parsing or DB lookup would happen here)
                    if (msg.start.customParameters && msg.start.customParameters.tenantId) {
                        activeCallers.set(streamSid, {
                            tenantId: msg.start.customParameters.tenantId,
                            phoneNumber: msg.start.customParameters.phoneNumber
                        });
                    }
                    break;
                case 'media':
                    // Here we would receive base64 audio.
                    // For DEMO PURPOSES, if we had a text stream we would push to activeTranscripts.
                    // Since we don't have a real STT engine connected here yet, we leave this placeholder.
                    // activeTranscripts.get(streamSid).push("Demo transcript line.");
                    break;
                case 'stop':
                    console.log(`[Twilio] Stream stopped: ${msg.stop.streamSid}`);
                    await saveMeetingMinute(msg.stop.streamSid);
                    break;
            }
        } catch (e) {
            console.error('[VoiceService] Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('[VoiceService] Stream disconnected');
        if (streamSid) saveMeetingMinute(streamSid);
    });

    ws.on('error', (err) => {
        console.error('[VoiceService] WebSocket Error:', err);
    });
}

/**
 * Initiate outbound call via Twilio
 */
async function initiateOutboundCall(phoneNumber, tenantId, customData = {}) {
    try {
        // Fetch Tenant configuration for AI Script
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { aiConfig: true, name: true }
        });

        // Determine script/prompt
        const aiConfig = tenant?.aiConfig || {};
        const script = customData.script || aiConfig.welcomeMessage || `Hello, this is a call from ${tenant?.name || 'ScriptishRx'}.`;

        console.log(`[VoiceService] Initiating Twilio call for Tenant ${tenantId} to ${phoneNumber}`);

        const call = await twilioService.makeCall(tenantId, phoneNumber, script);

        const logEntry = {
            id: `log_${Date.now()}`,
            callId: call.sid,
            tenantId,
            phoneNumber,
            status: call.status,
            provider: 'twilio',
            timestamp: new Date().toISOString(),
            ...customData
        };
        callLogs.push(logEntry);

        return {
            success: true,
            message: 'Call initiated successfully via Twilio',
            callId: call.sid,
            status: call.status,
            phoneNumber,
            provider: 'twilio'
        };

    } catch (error) {
        console.error('Voice service error:', error);
        return {
            success: false,
            error: error.message || 'Failed to initiate call',
            message: 'An error occurred while initiating the call'
        };
    }
}

module.exports = {
    getCallLogs,
    getCallStatus,
    initiateOutboundCall,
    handleConnection
};