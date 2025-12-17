// backend/src/routes/chat.routes.js
/**
 * Chat Routes - Production OpenAI Integration
 * NO MOCK MODE - Real OpenAI API only
 */

const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

// Optional authentication middleware
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
 * GET /api/chat/status - Check chat service status
 */
router.get('/status', optionalAuth, (req, res) => {
    const providerInfo = chatService.getProviderInfo();

    res.json({
        success: true,
        status: providerInfo.configured ? 'online' : 'not_configured',
        provider: providerInfo.provider,
        timestamp: new Date().toISOString(),
        capabilities: providerInfo.capabilities
    });
});

/**
 * GET /api/chat/history - Get chat history for user
 */
router.get('/history', optionalAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const messages = await chatService.getChatHistory(tenantId);

        res.json({
            success: true,
            messages: messages,
            total: messages.length
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat history',
            message: error.message
        });
    }
});

/**
 * POST /api/chat/message - Send message and get AI response
 */
router.post('/message', optionalAuth, async (req, res) => {
    try {
        const { message, tenantId } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const userTenantId = tenantId || req.user?.tenantId || 'default';

        console.log(`[Chat] Processing message for tenant: ${userTenantId}`);

        // Get AI response from OpenAI
        const result = await chatService.processMessage(message.trim(), userTenantId);

        if (result.success) {
            res.json({
                success: true,
                response: result.response,
                metadata: result.metadata
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to process message',
                code: result.code
            });
        }
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * POST /api/chat/voice - Process voice input with OpenAI Whisper
 */
router.post('/voice', optionalAuth, async (req, res) => {
    try {
        const { audioData, tenantId } = req.body;

        if (!audioData) {
            return res.status(400).json({
                success: false,
                error: 'Audio data is required'
            });
        }

        const userTenantId = tenantId || req.user?.tenantId || 'default';

        console.log(`[Chat] Processing voice input for tenant: ${userTenantId}`);

        // Process voice input with OpenAI Whisper
        const result = await chatService.processVoiceInput(audioData, userTenantId);

        if (result.success) {
            res.json({
                success: true,
                transcript: result.transcript,
                response: result.response,
                provider: result.provider,
                metadata: result.metadata
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to process voice input',
                code: result.code
            });
        }
    } catch (error) {
        console.error('Error processing voice input:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * DELETE /api/chat/history - Clear chat history
 */
router.delete('/history', optionalAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        await chatService.clearChatHistory(tenantId);

        res.json({
            success: true,
            message: 'Chat history cleared'
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear chat history',
            message: error.message
        });
    }
});

module.exports = router;