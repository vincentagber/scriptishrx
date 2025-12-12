const prisma = require('../lib/prisma');

class ClientService {
    async getClients(tenantId, search) {
        let where = { tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } }
            ];
        }

        return prisma.client.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { bookings: true }
        });
    }

    async getClientStats(tenantId) {
        // Consolidated stats query
        const [totalClients, bookingsCount, revenueRaw] = await Promise.all([
            prisma.client.count({ where: { tenantId } }),
            prisma.booking.count({ where: { tenantId } }),
            prisma.booking.findMany({
                where: { tenantId, status: 'Completed' },
                select: { purpose: true } // Naive revenue calc placeholder
            })
        ]);

        // Revenue Mock Calc (Same as Insights)
        const revenue = revenueRaw.length * 50; // Approx $50 per booking

        return {
            totalClients,
            bookingsCount,
            revenue,
            voiceInteractions: 0 // Placeholder
        };
    }

    async createClient(tenantId, data) {
        const { name, email, phone, notes } = data;

        // potential duplicate check could go here

        return prisma.client.create({
            data: {
                tenantId,
                name,
                email,
                phone,
                notes
            }
        });
    }


    async deleteClient(tenantId, id) {
        const client = await prisma.client.findFirst({ where: { id, tenantId } });
        if (!client) throw new Error('NOT_FOUND: Client not found');

        return prisma.client.delete({ where: { id } });
    }
}

module.exports = new ClientService();
