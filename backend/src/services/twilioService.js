const twilio = require('twilio');
const prisma = require('../lib/prisma');
const chatService = require('./chatService');

class TwilioService {
    /**
     * Get Twilio Client for a specific tenant
     * Falls back to global env vars if tenant has no specific config
     */
    async getClientForTenant(tenantId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { twilioConfig: true }
        });

        const config = tenant?.twilioConfig || {};
        const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not found for tenant or environment.');
        }

        return {
            client: twilio(accountSid, authToken),
            phoneNumber: config.phoneNumber || process.env.TWILIO_PHONE_NUMBER,
            accountSid
        };
    }

    /**
     * Send SMS
     */
    async sendSms(tenantId, to, body) {
        try {
            const { client, phoneNumber } = await this.getClientForTenant(tenantId);

            if (!phoneNumber) {
                throw new Error('No Twilio phone number configured.');
            }

            const message = await client.messages.create({
                body,
                from: phoneNumber,
                to
            });

            console.log(`[Twilio] SMS sent for Tenant ${tenantId}: ${message.sid}`);
            return message;
        } catch (error) {
            console.error('[Twilio] SMS Error:', error);
            throw error;
        }
    }

    /**
     * Make Outbound Call
     */
    async makeCall(tenantId, to, script) {
        try {
            const { client, phoneNumber } = await this.getClientForTenant(tenantId);
            const webhookUrl = `${process.env.APP_URL}/api/twilio/webhook/voice/outbound`; // We need to create this route

            const call = await client.calls.create({
                url: `${webhookUrl}?script=${encodeURIComponent(script)}`,
                to,
                from: phoneNumber
            });

            console.log(`[Twilio] Call initiated for Tenant ${tenantId}: ${call.sid}`);
            return call;
        } catch (error) {
            console.error('[Twilio] Call Error:', error);
            throw error;
        }
    }

    /**
     * Handle Inbound Voice Webhook
     * This is called by Twilio when a number receives a call
     */
    async handleInboundVoice(params) {
        const { To, From, CallSid } = params;
        console.log(`[Twilio] Inbound call from ${From} to ${To} (Sid: ${CallSid})`);

        // Find tenant by phone number
        // We search users or tenants who own this number.
        // For now, assuming exact match on Tenant.twilioConfig->phoneNumber (This requires a JSON query or finding all tenants and checking, which is slow.
        // Better: Query Tenant where phoneNumber string matches. But we moved it to JSON.
        // Fallback: Check if we still have phoneNumber column? Yes, schema had `phoneNumber String? @unique` on Tenant. We should use that for lookups!

        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { phoneNumber: To }, // Main column
                    { twilioConfig: { path: ['phoneNumber'], equals: To } } // JSON path query (Postgres)
                ]
            }
        });

        const voiceResponse = new twilio.twiml.VoiceResponse();

        if (!tenant) {
            console.warn(`[Twilio] Unknown number ${To}. Playing default error.`);
            voiceResponse.say('We are sorry, but this number is not currently assigned to a valid organization.');
            return voiceResponse.toString();
        }

        // Fetch AI Config
        const aiConfig = tenant.aiConfig || {};
        const welcomeMessage = aiConfig.welcomeMessage || tenant.aiWelcomeMessage || 'Thank you for calling. How can I help you today?';

        // Simple Logic: Say welcome message and record (or Gather)
        // For advanced AI, we would <Connect><Stream> here.

        voiceResponse.say({
            voice: aiConfig.voiceId || 'alice', // 'alice' is a standard voice, customizable
        }, welcomeMessage);

        // Record the user's response to process later (Simple voicemail / interaction)
        // OR Gather for IVR
        const gather = voiceResponse.gather({
            input: 'speech',
            action: `${process.env.APP_URL}/api/twilio/webhook/voice/gather?tenantId=${tenant.id}`,
            timeout: 3,
            language: 'en-US'
        });

        // If they don't say anything
        voiceResponse.say('I did not hear anything. Please try again.');

        return voiceResponse.toString();
    }

    /**
     * Handle Inbound SMS Webhook
     */
    async handleInboundSms(params) {
        const { To, From, Body } = params;
        console.log(`[Twilio] Inbound SMS from ${From} to ${To}: ${Body}`);

        const tenant = await prisma.tenant.findFirst({
            where: { phoneNumber: To } // Using the indexed column for lookup
        });

        if (!tenant) {
            console.warn(`[Twilio] Inbound SMS to unknown number: ${To}`);
            return null; // Ignore or auto-reply error
        }

        // Process with ChatService
        const response = await chatService.processMessage(Body, tenant.id);

        if (response.success && response.response) {
            // Reply via SMS
            await this.sendSms(tenant.id, From, response.response);
        }
    }
}

module.exports = new TwilioService();
