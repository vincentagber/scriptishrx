const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

router.use(authMiddleware);

// GET /api/minutes - Get all minutes for tenant
router.get('/', async (req, res) => {
    try {
        const minutes = await prisma.meetingMinute.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' },
            include: { client: true }
        });
        res.json(minutes);
    } catch (error) {
        console.error('Error fetching minutes:', error);
        res.status(500).json({ error: 'Failed to fetch minutes' });
    }
});

// POST /api/minutes - Create minute
router.post('/', async (req, res) => {
    try {
        const { clientId, content } = req.body;
        const minute = await prisma.meetingMinute.create({
            data: {
                clientId,
                tenantId: req.user.tenantId,
                content
            }
        });
        res.status(201).json(minute);
    } catch (error) {
        console.error('Error creating minute:', error);
        res.status(500).json({ error: 'Failed to create minute' });
    }
});

// PUT /api/minutes/:id - Update minute
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        // Verify ownership
        const minute = await prisma.meetingMinute.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!minute) return res.status(404).json({ error: 'Minute not found' });

        const updatedMinute = await prisma.meetingMinute.update({
            where: { id },
            data: { content }
        });
        res.json(updatedMinute);
    } catch (error) {
        console.error('Error updating minute:', error);
        res.status(500).json({ error: 'Failed to update minute' });
    }
});

// DELETE /api/minutes/:id - Delete minute
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const minute = await prisma.meetingMinute.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!minute) return res.status(404).json({ error: 'Minute not found' });

        await prisma.meetingMinute.delete({ where: { id } });
        res.json({ message: 'Minute deleted successfully' });
    } catch (error) {
        console.error('Error deleting minute:', error);
        res.status(500).json({ error: 'Failed to delete minute' });
    }
});

module.exports = router;
