const express = require('express');
const router = express.Router();

// VoiceCake webhook removed as part of migration to Twilio

/**
 * GET /api/webhooks/health
 * Health check endpoint for webhook service
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'webhooks',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhookStatus: '/api/twilio/webhook/status'
        }
    });
});

/**
 * POST /api/webhooks/test
 * Test endpoint for webhook functionality
 */
router.post('/test', async (req, res) => {
    try {
        console.log('🧪 Test webhook received');
        console.log('Test payload:', req.body);

        res.json({
            success: true,
            message: 'Test webhook received',
            receivedData: req.body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;