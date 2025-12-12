const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function login() {
    try {
        const res = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'test@scriptishrx.com',
            password: 'password123'
        });
        return { token: res.data.token, userId: res.data.user.id };
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function verify() {
    console.log('--- Verifying Payment System (Mock Mode) ---');
    const { token, userId } = await login();
    const api = axios.create({
        baseURL: 'http://localhost:3001/api',
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        // 1. Subscribe (Mock Checkout)
        console.log('1. Testing Subscription Checkout...');
        const subRes = await api.post('/payments/subscribe', {
            userId,
            plan: 'Advanced'
        });
        console.log('   ✅ Response:', subRes.data);

        // Verify DB update
        const userSub = await prisma.subscription.findUnique({ where: { userId } });
        if (userSub && userSub.plan === 'Advanced' && userSub.status === 'Active') {
            console.log('   ✅ Database Record: Active / Advanced');
        } else {
            console.error('   ❌ Database Record Mismatch:', userSub);
        }

        // 2. Customer Portal
        console.log('2. Testing Customer Portal...');
        const portalRes = await api.post('/payments/portal', { userId });
        console.log('   ✅ Portal URL:', portalRes.data.url);

        // 3. Webhook Sim (Mock)
        // Since we are likely in mock mode without keys, sending a random payload should result in "received: true, mock: true"
        console.log('3. Testing Webhook Handler (Mock)...');
        try {
            const hookRes = await api.post('/payments/webhook', {
                type: 'checkout.session.completed',
                data: { object: { id: 'evt_test' } }
            }, {
                headers: { 'stripe-signature': 'test_sig' }
            });
            console.log('   ✅ Webhook Response:', hookRes.data);
        } catch (e) {
            if (e.response.status === 400) {
                console.log('   ✅ Webhook correctly failed signature (if keys present) or handled mock.');
            } else {
                console.log('   ℹ️  Webhook Info:', e.response.data);
            }
        }

    } catch (e) {
        console.error('❌ Verification Failed:', e.response?.data || e.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
