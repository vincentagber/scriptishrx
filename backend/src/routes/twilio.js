const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');

// Middleware to validate Twilio Request Signature (Optional for now, good for security later)
// const twilio = require('twilio');
// const validateTwilio = twilio.webhook({ validate: process.env.NODE_ENV === 'production' });

// Inbound Voice Webhook
router.post('/webhook/voice', async (req, res) => {
    try {
        const twiml = await twilioService.handleInboundVoice(req.body);
        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error('Twilio Voice Webhook Error:', error);
        res.status(500).send('Error');
    }
});

// Inbound SMS Webhook
router.post('/webhook/sms', async (req, res) => {
    try {
        await twilioService.handleInboundSms(req.body);
        res.type('text/xml');
        res.send('<Response></Response>'); // Empty response as we reply asynchronously via API if needed
    } catch (error) {
        console.error('Twilio SMS Webhook Error:', error);
        res.status(500).send('Error');
    }
});

// Gather Action (User spoke something)
router.post('/webhook/voice/gather', async (req, res) => {
    try {
        const tenantId = req.query.tenantId;
        const speechResult = req.body.SpeechResult;

        console.log(`[Twilio] Gather Result for Tenant ${tenantId}: ${speechResult}`);

        // Use ChatService/OpenAI to determine next response
        const chatService = require('../services/chatService'); // Lazy load to avoid circular dependency if any
        // Actually, we should use a proper controller logic here or in Service.
        // For now, let's just echo or say generic.

        const VoiceResponse = require('twilio').twiml.VoiceResponse;
        const response = new VoiceResponse();

        response.say(`You said: ${speechResult}. We will connect you to an agent shortly.`);
        // response.dial(...)

        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Twilio Gather Error:', error);
        res.status(500).send('Error');
    }
});

// Outbound Call Webhook (Called when Twilio connects the call)
router.post('/webhook/voice/outbound', (req, res) => {
    try {
        const script = req.query.script || 'Hello from ScriptishRx.';
        const VoiceResponse = require('twilio').twiml.VoiceResponse;
        const response = new VoiceResponse();

        response.say({ voice: 'alice' }, script);
        // Keep line open or record? For now, pause then hangup.
        response.pause({ length: 1 });

        // Optional: Stream for AI analysis if desired
        // const startStream = response.connect();
        // startStream.stream({ url: `wss://${req.get('host')}/media-stream` });

        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Twilio Outbound Webhook Error:', error);
        res.status(500).send('Error');
    }
});

// Status Callback
router.post('/webhook/status', async (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration } = req.body;
        console.log(`[Twilio] Call Status ${CallSid}: ${CallStatus} (${CallDuration}s)`);

        // Here we could update database status
        // await voiceService.updateCallStatus(CallSid, CallStatus, CallDuration);

        res.status(200).end();
    } catch (error) {
        console.error('Twilio Status Callback Error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;
