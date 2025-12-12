const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // 1. Create a default Tenant
    // 1. Create a default Tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        update: {},
        create: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Demo Clinic',
            location: 'New York, NY',
            timezone: 'America/New_York',
        },
    });

    console.log(`Created tenant: ${tenant.name} (${tenant.id})`);

    // 2. Create a Test User linked to the Tenant
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'test@scriptishrx.com' },
        update: {},
        create: {
            email: 'test@scriptishrx.com',
            name: 'Test User',
            password: hashedPassword,
            role: 'ADMIN',
            tenantId: tenant.id,
        },
    });

    console.log(`Created user: ${user.email} (${user.id})`);

    // 3. Create Demo Clients
    const clients = [];
    for (let i = 0; i < 5; i++) {
        clients.push(await prisma.client.create({
            data: {
                tenantId: tenant.id,
                name: [`Alice Smith`, `Bob Jones`, `Charlie Brown`, `Diana Prince`, `Evan Wright`][i],
                email: `client${i}@example.com`,
                phone: `+1555000000${i}`,
                source: i % 2 === 0 ? 'Voice Agent' : 'Chatbot',
            }
        }));
    }
    console.log(`Created ${clients.length} clients.`);

    // 4. Create Demo Bookings
    const today = new Date();
    for (const client of clients) {
        // Past Booking
        await prisma.booking.create({
            data: {
                clientId: client.id,
                tenantId: tenant.id,
                date: new Date(today.getTime() - 86400000 * Math.random() * 10), // Past 10 days
                status: 'Completed',
                purpose: 'General Wellness',
            }
        });
        // Future Booking
        await prisma.booking.create({
            data: {
                clientId: client.id,
                tenantId: tenant.id,
                date: new Date(today.getTime() + 86400000 * Math.random() * 10), // Next 10 days
                status: 'Scheduled',
                purpose: 'Follow-up',
            }
        });
    }
    console.log('Created demo bookings.');

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
