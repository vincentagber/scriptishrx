const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

router.use(authMiddleware);

// Helper to calculate revenue based on purpose
const calculateRevenue = (bookings) => {
    let total = 0;
    bookings.forEach(b => {
        const p = b.purpose.toLowerCase();
        if (p.includes('wellness') || p.includes('lounge')) total += 49.99;
        else if (p.includes('luggage')) total += 4.99; // Hourly estimation
        else if (p.includes('work') || p.includes('desk')) total += 24.99;
        else total += 29.99; // Default consultation fee
    });
    return Math.round(total);
};

// GET /api/insights - Aggregate Real Data
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Fetch Data
        const bookings = await prisma.booking.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' }
        });

        const clients = await prisma.client.findMany({
            where: { tenantId },
            include: { bookings: true }
        });

        const messages = await prisma.message.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' }
        });

        // 2. Calculate Revenue (grouped by month for chart)
        const revenueByMonth = {};
        let totalRevenue = 0;
        bookings.forEach(b => {
            const date = new Date(b.date);
            const month = date.toLocaleString('default', { month: 'short' });

            // Value
            let val = 29.99;
            const p = b.purpose.toLowerCase();
            if (p.includes('wellness')) val = 49.99;
            else if (p.includes('luggage')) val = 14.99; // Assume ~3hrs avg
            else if (p.includes('work')) val = 24.99;

            totalRevenue += val;

            if (!revenueByMonth[month]) revenueByMonth[month] = 0;
            revenueByMonth[month] += val;
        });

        const revenueChartData = Object.keys(revenueByMonth).map(month => ({
            month,
            revenue: Math.round(revenueByMonth[month])
        }));


        // 3. Client Retention
        const returningClients = clients.filter(c => c.bookings.length > 1).length;
        const retentionRate = clients.length > 0 ? Math.round((returningClients / clients.length) * 100) : 0;


        // 4. Booking Conversion (Bookings / Unique Clients or Leads)
        // Simple proxy: Bookings / (Clients + 1) to avoid div/0
        const convRate = clients.length > 0 ? Math.round((bookings.length / clients.length) * 100) : 0;
        // Real conversion would need "Leads vs Customers", here we just use Booked Clients ratio


        // 5. Behavior (Weekly Activity)
        const activityByDay = { 'Mon': { visits: 0, bookings: 0 }, 'Tue': { visits: 0, bookings: 0 }, 'Wed': { visits: 0, bookings: 0 }, 'Thu': { visits: 0, bookings: 0 }, 'Fri': { visits: 0, bookings: 0 }, 'Sat': { visits: 0, bookings: 0 }, 'Sun': { visits: 0, bookings: 0 } };

        // Count Messages as "Visits/Interactions"
        messages.forEach(m => {
            const day = new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            if (activityByDay[day]) activityByDay[day].visits++;
        });

        // Count Bookings
        bookings.forEach(b => {
            const day = new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (activityByDay[day]) activityByDay[day].bookings++;
        });

        const behaviorChartData = Object.keys(activityByDay).map(day => ({
            name: day,
            Visits: activityByDay[day].visits,
            Bookings: activityByDay[day].bookings
        }));


        // 6. AI Recommendation Logic
        // Simple rule-based generation for MVP
        let aiRec = "";
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const busyDay = Object.keys(activityByDay).reduce((a, b) => activityByDay[a].bookings > activityByDay[b].bookings ? a : b);
        const slowDay = Object.keys(activityByDay).reduce((a, b) => activityByDay[a].bookings < activityByDay[b].bookings ? a : b);

        // 7. Outbound Campaign Stats
        const campaigns = await prisma.campaign.findMany({
            where: { tenantId }
        });

        const outboundStats = {
            totalCampaigns: campaigns.length,
            totalSent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
            avgOpenRate: campaigns.length > 0
                ? Math.round(campaigns.reduce((sum, c) => sum + (c.sentCount > 0 ? (c.openCount / c.sentCount) * 100 : 0), 0) / campaigns.length)
                : 0
        };

        if (retentionRate < 20) {
            aiRec = "Client retention is below optimal levels (20%). Suggest launching a loyalty program or follow-up email campaign for first-time visitors.";
        } else if (activityByDay['Sat'].bookings < 2 && activityByDay['Sun'].bookings < 2) {
            aiRec = "Weekend bookings are lower than expected. Target the \"Weekend Traveler\" segment with a 15% discount on Luggage Storage to boost utilization.";
        } else if (outboundStats.totalSent === 0) {
            aiRec = "No outbound campaigns detected. Launch an email blast to your 50+ dormant clients to re-engage them and boost weekday traffic.";
        } else {
            aiRec = `Traffic is highest on ${busyDay}. Consider adding extra staff or extending hours. To boost ${slowDay}, consider a flash sale or 'Happy Hour' promotion.`;
        }

        res.json({
            metrics: {
                totalRevenue: Math.round(totalRevenue),
                retentionRate,
                aiEfficiency: 94, // Hardcoded for now as we don't track "AI Success" explicitly yet
                convRate,
                outbound: outboundStats
            },
            revenueChart: revenueChartData,
            behaviorChart: behaviorChartData,
            aiRecommendation: aiRec
        });

    } catch (error) {
        console.error('Error calculating insights:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

module.exports = router;
