// backend/src/routes/voice.js
const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');

// Check if running in mock mode
const isMockMode = process.env.MOCK_EXTERNAL_SERVICES === 'true' || !process.env.VOICECAKE_API_KEY;

// Optional JWT middleware - only applies auth if token is provided
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const user = jwt.verify(token, process.env.JWT_SECRET);
            req.user = user;
        } catch (error) {
            console.warn('Invalid token provided, continuing without auth');
        }
    }
    next();
};

/**
 * GET /api/voice/logs - Get voice call logs
 */
router.get('/logs', optionalAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || null;
        const logs = voiceService.getCallLogs(tenantId);
        
        res.json({
            success: true,
            logs: logs,
            total: logs.length,
            authenticated: !!req.user,
            mockMode: isMockMode
        });
    } catch (error) {
        console.error('Error fetching voice logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
            message: error.message
        });
    }
});

/**
 * POST /api/voice/outbound - Initiate outbound call
 * Accepts both 'to' and 'phoneNumber' for compatibility
 */
router.post('/outbound', optionalAuth, async (req, res) => {
    try {
        // Accept both 'to' and 'phoneNumber' parameters
        const phoneNumber = req.body.to || req.body.phoneNumber;
        const { agentId, campaign, context, customData } = req.body;
        
        // Validate phone number
        if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const cleanPhone = phoneNumber.trim();

        // Validate phone format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleanedForValidation = cleanPhone.replace(/[\s()-]/g, '');
        
        if (!phoneRegex.test(cleanedForValidation)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use international format (e.g., +1234567890)'
            });
        }

        const tenantId = req.user?.tenantId || 'default_tenant';

        console.log(`[Voice] Initiating outbound call to ${cleanPhone}...`);

        // Call voice service
        const result = await voiceService.initiateOutboundCall(
            cleanPhone,
            tenantId,
            { 
                agentId, 
                campaign, 
                context,
                ...customData 
            }
        );

        if (result.success) {
            res.json({
                success: true,
                message: result.message || 'Call initiated successfully',
                callId: result.callId,
                status: result.status,
                phoneNumber: cleanPhone,
                mockMode: isMockMode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to initiate call',
                message: result.message
            });
        }
    } catch (error) {
        console.error('Error initiating outbound call:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error during call initiation',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/voice - Legacy endpoint (redirects to /outbound)
 */
router.post('/', optionalAuth, async (req, res) => {
    // Forward to /outbound endpoint
    req.url = '/outbound';
    return router.handle(req, res);
});

/**
 * GET /api/voice/status/:callId - Get call status
 */
router.get('/status/:callId', optionalAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        
        // Get status from voice service
        const status = voiceService.getCallStatus(callId);
        
        if (status) {
            res.json({
                success: true,
                ...status
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Call not found',
                callId
            });
        }
    } catch (error) {
        console.error('Error fetching call status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call status',
            message: error.message
        });
    }
});

/**
 * GET /api/voice/health - Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'voice',
        status: 'operational',
        mockMode: isMockMode,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;