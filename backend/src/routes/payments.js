const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// Paystack Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret || !signature) {
        return res.status(400).send('Webhook Error: Configuration missing');
    }

    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

    if (hash !== signature) {
        logger.warn('Webhook Error: Invalid Signature');
        return res.status(400).send('Invalid Signature');
    }

    let event;
    try {
        event = JSON.parse(req.body.toString());
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.event === 'charge.success') {
            await paymentService.handleWebhookSuccess(event.data);
        }
        res.status(200).send({ received: true });
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

        const { url, reference } = await paymentService.initiateTransaction(req.user.id, plan, cycle);

        res.json({ url, reference });
    } catch (error) {
        next(error);
    }
});

// Portal
router.post('/portal', authenticateToken, async (req, res, next) => {
    try {
        const { url } = await paymentService.createPortalSession(req.user.id);
        res.json({ url });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
