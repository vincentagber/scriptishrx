const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // req.rawBody must be available. 
        // Note: In app.js, ensure rawBody is captured or use express.raw() here if not processed yet.
        // But app.js likely applies bodyParser globally. 
        // The safest way with global JSON parser is to verify signature using the raw buffer captured.
        // Assuming app.js captures `req.rawBody` as seen in previous view_file of app.js.
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
    } catch (err) {
        logger.error(`Webhook Signature Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await paymentService.handleCheckoutSuccess(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await paymentService.handleInvoicePaid(event.data.object);
                break;
            default:
            // console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (err) {
        logger.error(`Webhook Processing Failed: ${err.message}`);
        res.status(500).send(`Server Error: ${err.message}`);
    }
});

// Create Checkout Session
router.post('/create-session', authenticateToken, async (req, res, next) => {
    try {
        const { plan, cycle } = req.body;
        if (!plan) throw new AppError('Plan is required', 400);

        const { url, reference } = await paymentService.initiateTransaction(req.user.userId, plan, cycle);

        res.json({ url, reference });
    } catch (error) {
        next(error);
    }
});

// Portal
router.post('/portal', authenticateToken, async (req, res, next) => {
    try {
        const { url } = await paymentService.createPortalSession(req.user.userId);
        res.json({ url });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
