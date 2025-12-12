const express = require('express');
const router = express.Router();

// Mock database for newsletter subscriptions
// In a real app, this would be a database model
const subscribers = [];

/**
 * @route POST /api/marketing/newsletter
 * @desc Subscribe to newsletter
 * @access Public
 */
router.post('/newsletter', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Check if already subscribed (mock check)
    if (subscribers.includes(email)) {
        return res.json({
            success: true,
            message: 'You are already subscribed!',
            alreadySubscribed: true
        });
    }

    subscribers.push(email);
    console.log(`[Newsletter] New subscriber: ${email}`);

    // Simulate network delay
    setTimeout(() => {
        res.json({
            success: true,
            message: 'Successfully subscribed to the newsletter!',
            subscribersCount: subscribers.length
        });
    }, 800);
});

/**
 * @route GET /api/marketing/stats
 * @desc Get public platform stats
 * @access Public
 */
router.get('/stats', (req, res) => {
    // Return mock stats that slightly vary to look "realtime"
    // In production, this would count actual users/bookings from DB
    const randomVariation = (base, range) => base + Math.floor(Math.random() * range);

    res.json({
        success: true,
        stats: {
            activeUsers: randomVariation(75000, 500),
            downloads: randomVariation(62000, 200),
            appointments: randomVariation(100000, 1000),
            satisfaction: 99
        }
    });
});

module.exports = router;
