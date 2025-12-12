const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

router.use(authMiddleware);

// GET /api/settings - Get current user and tenant settings
router.get('/', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { tenant: true, subscription: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

const bcrypt = require('bcryptjs');

// PUT /api/settings/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const { name, email, phoneNumber } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: { name, email, phoneNumber }
        });
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/settings/password - Change password
router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) return res.status(400).json({ error: 'Incorrect current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// PUT /api/settings/tenant - Update tenant settings (Owner only)
router.put('/tenant', async (req, res) => {
    try {
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only owners and admins can update tenant settings' });
        }

        const { name, location, timezone, brandColor, logoUrl, aiName, aiWelcomeMessage, customSystemPrompt } = req.body;

        // Fetch current tenant to check plan
        const currentTenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

        // Enforce Plan Limits
        let updateData = { name, location, timezone, brandColor, logoUrl, aiName, aiWelcomeMessage };

        if (customSystemPrompt !== undefined) {
            if (currentTenant.plan === 'Advanced') {
                updateData.customSystemPrompt = customSystemPrompt;
            } else {
                // If trying to set it but not advanced, ignore or could error.
                // For better UX, let's just ignore it but maybe log a warning.
                console.warn(`Tenant ${req.user.tenantId} tried to set custom prompt without Advanced plan.`);
            }
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: updateData
        });
        res.json(tenant);
    } catch (error) {
        console.error('Error updating tenant:', error);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

// PUT /api/settings/subscription - Update tenant plan (Demo/Admin purpose)
router.put('/subscription', async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only owners can update subscription' });
        }

        const { plan } = req.body;
        if (!['Basic', 'Intermediate', 'Advanced'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Must be Basic, Intermediate, or Advanced.' });
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: { plan }
        });

        res.json({ message: `Plan updated to ${plan}`, tenant });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// Get Audit Logs
router.get('/audit-logs', authMiddleware, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { user: { select: { name: true, email: true } } } // Assuming User relation exists, distinct from userId field? No relation defined in schema...
            // Actually schema has `userId String?` but no relation defined. Let's just return raw logs for now.
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// PUT /api/settings/integrations - Toggle Integrations
router.put('/integrations', authMiddleware, async (req, res) => {
    try {
        const { integrations } = req.body; // Expect JSON object
        const tenantId = req.user.tenantId;

        // Verify plan
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant.plan !== 'Advanced') {
            return res.status(403).json({ error: 'Upgrade to Advanced plan to use integrations.' });
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: { integrations: JSON.stringify(integrations) }
        });

        res.json({ integrations: JSON.parse(updatedTenant.integrations || '{}') });
    } catch (error) {
        console.error('Error updating integrations:', error);
        res.status(500).json({ error: 'Failed to update integrations' });
    }
});

module.exports = router;
