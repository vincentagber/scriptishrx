// backend/src/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

const isMockMode = process.env.MOCK_EXTERNAL_SERVICES === 'true' || 
                   (!process.env.VOICECAKE_API_KEY && !process.env.OPENAI_API_KEY);

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
        status: 'online',
        mockMode: isMockMode,
        provider: providerInfo.provider,
        timestamp: new Date().toISOString(),
        capabilities: providerInfo.capabilities,
        aiProviders: {
            voicecake: providerInfo.hasVoiceCake,
            openai: providerInfo.hasOpenAI,
            active: providerInfo.provider
        }
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
        
        // Get AI response
        const result = await chatService.processMessage(message.trim(), userTenantId);
        
        if (result.success) {
            res.json({
                success: true,
                response: result.response,
                audioUrl: result.audioUrl,
                metadata: result.metadata,
                mockMode: isMockMode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to process message'
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
 * POST /api/chat/voice - Process voice input
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
        
        // Process voice input
        const result = await chatService.processVoiceInput(audioData, userTenantId);
        
        if (result.success) {
            res.json({
                success: true,
                transcript: result.transcript,
                response: result.response,
                audioUrl: result.audioUrl,
                provider: result.provider
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to process voice input'
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