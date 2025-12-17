// backend/src/services/voiceService.js
const voiceCakeService = require('./voiceCakeService');

// In-memory storage for call logs (replace with database in production)
const callLogs = [];

/**
 * Get call logs for a tenant
 */
function getCallLogs(tenantId = null) {
    if (tenantId) {
        return callLogs.filter(log => log.tenantId === tenantId);
    }
    return callLogs;
}

/**
 * Get call status by ID (with tenant isolation)
 * SECURITY FIX: Added tenantId parameter to prevent cross-tenant access
 */
function getCallStatus(callId, tenantId = null) {
    const log = callLogs.find(log => {
        if (tenantId) {
            // Filter by both callId AND tenantId
            return log.callId === callId && log.tenantId === tenantId;
        }
        // Only for super admin or internal use
        return log.callId === callId;
    });

    if (!log) return null;

    return {
        callId: log.callId,
        status: log.status,
        phoneNumber: log.phoneNumber,
        duration: log.duration,
        timestamp: log.timestamp,
        tenantId: log.tenantId
    };
}

/**
 * Add a call log entry
 */
function addCallLog(callData) {
    const log = {
        id: `log_${Date.now()}`,
        callId: callData.callId,
        tenantId: callData.tenantId,
        phoneNumber: callData.phoneNumber,
        status: callData.status || 'initiated',
        duration: callData.duration || 0,
        timestamp: new Date().toISOString(),
        ...callData
    };

    callLogs.push(log);
    return log;
}

/**
 * Initiate outbound call
 */
async function initiateOutboundCall(phoneNumber, tenantId, customData = {}) {
    try {
        // Get the linked agent for this tenant
        const agent = await voiceCakeService.getTenantAgent(tenantId);

        if (!agent && !voiceCakeService.isMockMode()) {
            return {
                success: false,
                error: 'No voice agent configured',
                message: 'Please configure your voice agent before making calls.'
            };
        }

        const agentId = agent?.id || customData.agentId || 'agent_001';

        // Initiate call via VoiceCake
        const result = await voiceCakeService.initiateOutboundCall(
            phoneNumber,
            agentId,
            customData
        );

        // Add to call logs
        const logEntry = addCallLog({
            callId: result.callId,
            tenantId,
            phoneNumber,
            status: result.status || 'initiated',
            agentId,
            customData
        });

        return {
            success: true,
            message: 'Call initiated successfully',
            callId: result.callId,
            status: result.status,
            phoneNumber: phoneNumber,
            provider: 'voicecake',
            logId: logEntry.id
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

/**
 * Handle WebSocket connection for real-time voice
 */
function handleConnection(ws, req) {
    console.log('[Voice] WebSocket connection established');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('[Voice] Received message:', data.type);

            // Handle different message types
            switch (data.type) {
                case 'start':
                    ws.send(JSON.stringify({
                        type: 'started',
                        callId: `ws_call_${Date.now()}`
                    }));
                    break;

                case 'audio':
                    // Handle audio data
                    break;

                case 'stop':
                    ws.send(JSON.stringify({ type: 'stopped' }));
                    break;

                default:
                    console.warn('[Voice] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[Voice] Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('[Voice] WebSocket connection closed');
    });

    ws.on('error', (error) => {
        console.error('[Voice] WebSocket error:', error);
    });
}

module.exports = {
    getCallLogs,
    getCallStatus,
    addCallLog,
    initiateOutboundCall,
    handleConnection
};