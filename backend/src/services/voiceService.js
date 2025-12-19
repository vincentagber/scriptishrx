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
 * Get call status by ID (with tenant isolation)
 */
function getCallStatus(callId, tenantId = null) {
    const log = callLogs.find(log => {
        if (tenantId) {
            return log.callId === callId && log.tenantId === tenantId;
        }
        return log.callId === callId;
    });

    if (!log) return null;

    return {
        callId: log.callId,
        status: log.status, // In real-time, query Twilio API via twilioService
        phoneNumber: log.phoneNumber,
        duration: log.duration,
        timestamp: log.timestamp,
        tenantId: log.tenantId
    };
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
    initiateOutboundCall
};