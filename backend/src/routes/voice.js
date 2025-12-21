// backend/src/routes/voice.js
const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');
const prisma = require('../lib/prisma'); // Access DB directly for resource helpers
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');
const { checkSubscriptionAccess, checkFeature } = require('../middleware/subscription');
const { voiceLimiter } = require('../middleware/rateLimiting');

// Mock Mode removed for production


/**
 * GET /api/voice/health - Health check endpoint (public)
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'voice',
        provider: 'twilio',
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/voice/logs - Get voice call logs
 */
router.get('/logs',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('voice_agents', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const logs = voiceService.getCallLogs(tenantId);

            res.json({
                success: true,
                logs: logs,
                total: logs.length
            });
        } catch (error) {
            console.error('Error fetching voice logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch logs',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/voice/outbound - Initiate outbound call
 */
router.post('/outbound',
    voiceLimiter,
    authenticateToken,
    verifyTenantAccess,
    checkSubscriptionAccess,
    checkFeature('voice_agent'),
    checkPermission('voice_agents', 'configure'),
    async (req, res) => {
        try {
            const phoneNumber = req.body.to || req.body.phoneNumber;
            const { customData } = req.body;

            if (!phoneNumber) {
                return res.status(400).json({ success: false, error: 'Phone number is required' });
            }

            const tenantId = req.scopedTenantId;

            // Clean phone number
            const cleanPhone = phoneNumber.replace(/[\s()-]/g, '');

            console.log(`[Voice] Initiating Twilio call to ${cleanPhone} for tenant ${tenantId}...`);

            const result = await voiceService.initiateOutboundCall(
                cleanPhone,
                tenantId,
                customData || {}
            );

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    callId: result.callId,
                    status: result.status,
                    provider: 'twilio' // Explicitly state provider
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error initiating outbound call:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/voice/status/:callId
 */
router.get('/status/:callId',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('voice_agents', 'read'),
    async (req, res) => {
        const { callId } = req.params;
        const tenantId = req.scopedTenantId;

        const status = voiceService.getCallStatus(callId, tenantId);

        if (status) {
            res.json({ success: true, ...status });
        } else {
            res.status(404).json({ success: false, error: 'Call not found' });
        }
    }
);

/**
 * GET /api/voice/agents - Get AI Configuration (replaces "Agents")
 */
router.get('/agents',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        // Return the Tenant's AI Config as the "Agent"
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: req.scopedTenantId },
                select: { aiConfig: true, id: true }
            });

            const aiConfig = tenant.aiConfig || {};

            // Construct a virtual agent based on config
            const virtualAgent = {
                id: `ai_${tenant.id}`,
                name: aiConfig.aiName || 'Twilio AI Assistant',
                status: 'active',
                type: 'artificial_intelligence',
                model: aiConfig.model || 'gpt-4'
            };

            res.json({
                success: true,
                agents: [virtualAgent]
            });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to fetch agent info' });
        }
    }
);

/**
 * GET /api/voice/phone-numbers - Get Tenant's Twilio Number
 */
router.get('/phone-numbers',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: req.scopedTenantId },
                select: { twilioConfig: true, phoneNumber: true }
            });

            const config = tenant.twilioConfig || {};
            // Prefer config phoneNumber, fallback to tenant.phoneNumber
            const number = config.phoneNumber || tenant.phoneNumber;

            res.json({
                success: true,
                phoneNumbers: number ? [{ phoneNumber: number, friendlyName: 'Business Line' }] : []
            });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to fetch phone numbers' });
        }
    }
);

module.exports = router;