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
    // Get transcript or initialize empty
    let transcriptParts = activeTranscripts.get(streamSid);
    if (!transcriptParts) transcriptParts = []; // Safety check

    const callerInfo = activeCallers.get(streamSid);
    const tenantId = callerInfo?.tenantId;

    // Cleanup active maps immediately to prevent double-processing
    activeTranscripts.delete(streamSid);
    activeCallers.delete(streamSid);

    if (!tenantId) {
        console.log('[VoiceService] No tenant ID found for stream, skipping save.');
        return;
    }

    console.log(`[VoiceService] Finalizing Call Record for Stream ${streamSid}...`);
    const fullTranscript = transcriptParts.join(' ').trim();
    let contentToSave = "[Call Completed] Audio stream received.";

    try {
        // 1. AI Summarization (Only if we have words)
        if (fullTranscript.length > 10) {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are an expert secretary. Convert the following call transcript into a professional meeting minute summary." },
                        { role: "user", content: fullTranscript }
                    ],
                });
                contentToSave = `[AI Generated Summary]\n\n${completion.choices[0].message.content}`;
            } catch (aiError) {
                console.error('[VoiceService] AI Summary failed (using raw text):', aiError);
                contentToSave = `[Raw Transcript]\n\n${fullTranscript}`;
            }
        } else {
            contentToSave = "[Call Completed] Audio connection successful. (No speech detected or transcription disabled)";
        }

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
                content: contentToSave,
                createdAt: new Date()
            }
        });
        console.log('[VoiceService] Meeting Minute saved successfully.');

    } catch (err) {
        console.error('[VoiceService] Failed to save minute:', err);
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
                    // In a full production app, this is where we'd stream raw audio to Deepgram/OpenAI.
                    // For this architecture without external STT subscriptions, we simply track that media is flowing.
                    if (!activeTranscripts.has(streamSid)) {
                        activeTranscripts.set(streamSid, []);
                    }
                    // We only log occasionally to avoid flooding console
                    if (Math.random() < 0.01) {
                        // console.log(`[Twilio] Stream ${streamSid} is receiving audio packets...`);
                    }
                    break;
                case 'stop':
                    console.log(`[Twilio] Stream stopped: ${msg.stop.streamSid}`);
                    // Mark as stopped to prevent duplicate saves if 'close' fires immediately after
                    await saveMeetingMinute(msg.stop.streamSid);
                    break;
            }
        } catch (e) {
            console.error('[VoiceService] Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('[VoiceService] Stream disconnected');
        // socket close often happens after stop, but good fallback
        if (streamSid && activeTranscripts.has(streamSid)) {
            saveMeetingMinute(streamSid);
        }
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