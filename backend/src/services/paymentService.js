const axios = require('axios');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
    logger.warn('⚠️ PaymentService: PAYSTACK_SECRET_KEY missing. Payments unavailable.');
}

// Plan Configurations (Hardcoded for now, can be moved to DB/Env)
const PLANS = {
    'Basic': { amount: 2900, planCode: process.env.PAYSTACK_PLAN_BASIC }, // Amount in kobo/cents. 29.00
    'Intermediate': { amount: 7900, planCode: process.env.PAYSTACK_PLAN_INTERMEDIATE },
    'Advanced': { amount: 19900, planCode: process.env.PAYSTACK_PLAN_ADVANCED }
};

class PaymentService {
    /**
     * Initiate a Paystack Transaction (Checkout)
     */
    async initiateTransaction(userId, planName, cycle = 'monthly') {
        if (!PAYSTACK_SECRET_KEY) {
            throw new AppError('Payment processing unavailable: Paystack configuration missing.', 503);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true }
        });

        if (!user) throw new AppError('User not found', 404);

        const planConfig = PLANS[planName];
        if (!planConfig) throw new AppError('Invalid plan selected', 400);

        // Metadata to track user and plan in webhook
        const metadata = {
            userId: user.id,
            tenantId: user.tenantId,
            planName: planName,
            cycle: cycle
        };

        try {
            const payload = {
                email: user.email,
                amount: planConfig.amount * 100, // Paystack expects lowest currency unit (kobo)
                currency: 'USD', // Defaulting to USD as per SaaS likelyhood.
                metadata: metadata,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?status=success`,
                channels: ['card']
            };

            // If utilizing Paystack Plans (Subscriptions):
            if (planConfig.planCode) {
                payload.plan = planConfig.planCode;
            }

            const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status) {
                logger.info(`Paystack transaction initialized for user ${userId}`);
                return {
                    url: response.data.data.authorization_url,
                    access_code: response.data.data.access_code,
                    reference: response.data.data.reference
                };
            } else {
                throw new Error(response.data.message || 'Paystack initialization failed');
            }

        } catch (error) {
            logger.error('Paystack Init Error:', error.response?.data || error.message);
            throw new AppError('Failed to initiate payment', 502);
        }
    }

    /**
     * Verify Transaction (can be called manually or via webhook)
     */
    async verifyTransaction(reference) {
        if (!PAYSTACK_SECRET_KEY) throw new AppError('Paystack config missing', 503);

        try {
            const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
            });

            if (response.data.status && response.data.data.status === 'success') {
                return response.data.data;
            }
            return null;
        } catch (error) {
            logger.error('Paystack Verify Error:', error.message);
            throw new AppError('Payment verification failed', 502);
        }
    }

    /**
     * Handle Webhook Success
     */
    async handleWebhookSuccess(data) {
        const { metadata, reference, customer } = data;

        if (!metadata || !metadata.userId) {
            logger.warn(`Webhook: Missing metadata for reference ${reference}`);
            return;
        }

        const { userId, planName } = metadata;

        logger.info(`Webhook: Processing success for user ${userId}, plan ${planName}`);

        await prisma.$transaction(async (tx) => {
            // Update Tenant Subscription
            const user = await tx.user.findUnique({ where: { id: userId }, include: { tenant: true } });
            if (!user) return;

            // Calculate Next Billing Date
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await tx.tenant.update({
                where: { id: user.tenantId },
                data: {
                    plan: planName,
                    subscriptionStatus: 'active',
                    stripeId: `${customer.customer_code}`, // Reusing column for Paystack Customer Code or Email
                    nextBillingDate: nextBillingDate
                }
            });

            logger.info(`Webhook: Updated tenant ${user.tenantId} to ${planName}`);
        });
    }

    async createPortalSession(userId) {
        // For Paystack, return a link to manage subscriptions or a message
        return { url: 'https://dashboard.paystack.com/#/subscriptions' };
    }
}

module.exports = new PaymentService();
