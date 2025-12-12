const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

// Get all workflows for tenant
router.get('/', authMiddleware, async (req, res) => {
    try {
        const workflows = await prisma.workflow.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// Create new workflow
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, trigger, actions } = req.body;

        if (!name || !trigger) {
            return res.status(400).json({ error: 'Name and Trigger are required' });
        }

        const workflow = await prisma.workflow.create({
            data: {
                name,
                trigger,
                actions: actions ? JSON.stringify(actions) : '[]',
                tenantId: req.user.tenantId
            }
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action: 'Create Workflow',
                details: `Created workflow: ${name}`
            }
        });

        res.status(201).json(workflow);
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});

// Toggle Workflow Status
router.put('/:id/toggle', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const workflow = await prisma.workflow.findUnique({
            where: { id }
        });

        if (!workflow || workflow.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        const updated = await prisma.workflow.update({
            where: { id },
            data: { isActive: !workflow.isActive }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error toggling workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

// Delete Workflow
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const workflow = await prisma.workflow.findUnique({
            where: { id }
        });

        if (!workflow || workflow.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        await prisma.workflow.delete({ where: { id } });
        res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});

module.exports = router;
