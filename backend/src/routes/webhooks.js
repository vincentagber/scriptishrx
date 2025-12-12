// backend/src/routes/webhooks.js
const express = require('express');
const router = express.Router();
const voiceCakeService = require('../services/voiceCakeService');

/**
 * POST /api/webhooks/voicecake
 * VoiceCake webhook endpoint for call status updates
 */
router.post('/voicecake', async (req, res) => {
    try {
        console.log('📞 VoiceCake webhook received');
        console.log('Payload:', JSON.stringify(req.body, null, 2));
        
        // Process the webhook
        const result = await voiceCakeService.handleWebhook(req.body);
        
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            ...result
        });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

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
            voicecake: '/api/webhooks/voicecake'
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