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
function handleConnection(ws, req) {
    console.log('[VoiceService] New Media Stream Connection');

    // Here we would handle the bidirectional audio stream:
    // 1. Receive 'media' events with audio chunks (base64)
    // 2. Send to OpenAI Realtime API or Transcriber
    // 3. Receive audio back
    // 4. Send 'media' events back to Twilio

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            switch (msg.event) {
                case 'connected':
                    console.log('[Twilio] Stream connected protocol: ' + msg.protocol);
                    break;
                case 'start':
                    console.log(`[Twilio] Stream started: ${msg.start.streamSid}`);
                    // We could initiate OpenAI session here
                    break;
                case 'media':
                    // msg.media.payload is base64 audio (mulaw 8000Hz usually)
                    // TODO: Process Audio
                    break;
                case 'stop':
                    console.log(`[Twilio] Stream stopped: ${msg.stop.streamSid}`);
                    break;
            }
        } catch (e) {
            console.error('[VoiceService] Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('[VoiceService] Stream disconnected');
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