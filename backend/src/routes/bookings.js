const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const authMiddleware = require('../lib/authMiddleware');
const { createBookingSchema, updateBookingSchema } = require('../schemas/validation');

router.use(authMiddleware);

// GET /api/bookings
router.get('/', async (req, res) => {
    try {
        const bookings = await bookingService.getBookings(req.user.tenantId);
        res.json(bookings);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// POST /api/bookings
router.post('/', async (req, res) => {
    try {
        const validated = createBookingSchema.parse(req.body);
        const booking = await bookingService.createBooking(req.user.tenantId, validated);
        res.status(201).json(booking);
    } catch (error) {
        if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
        if (error.message.startsWith('CONFLICT')) return res.status(409).json({ error: error.message.split(': ')[1] });
        console.error('Create error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// PUT /api/bookings/:id
router.put('/:id', async (req, res) => {
    try {
        const validated = updateBookingSchema.parse(req.body);
        const booking = await bookingService.updateBooking(req.user.tenantId, req.params.id, validated);
        res.json(booking);
    } catch (error) {
        if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
        if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ error: 'Booking not found' });
        if (error.message.startsWith('CONFLICT')) return res.status(409).json({ error: error.message.split(': ')[1] });
        console.error('Update error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
    try {
        await bookingService.deleteBooking(req.user.tenantId, req.params.id);
        res.json({ message: 'Booking deleted' });
    } catch (error) {
        if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ error: 'Booking not found' });
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

module.exports = router;
