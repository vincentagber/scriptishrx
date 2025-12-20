const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');

class BookingService {
    async getBookings(tenantId) {
        return prisma.booking.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
            include: { client: true }
        });
    }

    async createBooking(tenantId, data) {
        const { clientId, date, purpose, status } = data;
        const requestedDate = new Date(date);

        // Conflict Check
        const conflict = await prisma.booking.findFirst({
            where: {
                tenantId,
                date: requestedDate,
                status: { not: 'Cancelled' }
            }
        });

        if (conflict) {
            throw new Error('CONFLICT: This time slot is already booked.');
        }

        const booking = await prisma.booking.create({
            data: {
                clientId,
                tenantId,
                date: requestedDate,
                purpose,
                status: status || 'Scheduled'
            },
            include: { client: true, tenant: true } // Include for notifications
        });

        // Send Notifications
        if (booking.client) {
            // Email
            await notificationService.sendEmail(
                booking.client.email,
                `Booking Confirmation - ${booking.tenant.name}`,
                `<p>Hi ${booking.client.name},</p><p>Your appointment on <strong>${booking.date.toLocaleString()}</strong> is <strong>${booking.status}</strong>.</p>`
            );

            // SMS (only if phone exists)
            if (booking.client.phone) {
                await notificationService.sendSMS(
                    booking.client.phone,
                    `[${booking.tenant.name}] Appointment confirmed for ${booking.date.toLocaleDateString()} @ ${booking.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    tenantId
                );
            }
        }

        // Notify Tenant Users (Admin/Doctor) - REAL-TIME
        try {
            const tenantUsers = await prisma.user.findMany({
                where: { tenantId }
            });

            for (const user of tenantUsers) {
                await notificationService.createNotification(
                    user.id,
                    'New Booking',
                    `New appointment with ${booking.client.name} on ${booking.date.toLocaleDateString()}`,
                    'booking'
                );
            }
        } catch (err) {
            console.error('Failed to notify tenant users:', err);
        }

        return booking;
    }

    async updateBooking(tenantId, id, data) {
        const existingBooking = await prisma.booking.findFirst({
            where: { id, tenantId },
            include: { client: true, tenant: true }
        });
        if (!existingBooking) throw new Error('NOT_FOUND: Booking not found');

        const { date, purpose, status } = data;

        if (date && new Date(date).getTime() !== new Date(existingBooking.date).getTime()) {
            const requestedDate = new Date(date);
            const conflict = await prisma.booking.findFirst({
                where: {
                    tenantId,
                    date: requestedDate,
                    status: { not: 'Cancelled' },
                    id: { not: id }
                }
            });

            if (conflict) {
                throw new Error('CONFLICT: This time slot is already booked.');
            }
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                purpose,
                status
            },
            include: { client: true, tenant: true }
        });

        // Send Notifications on Status Change
        if (status && status !== existingBooking.status && updatedBooking.client) {
            // Email
            await notificationService.sendEmail(
                updatedBooking.client.email,
                `Booking Update - ${updatedBooking.tenant.name}`,
                `<p>Hi ${updatedBooking.client.name},</p><p>Your appointment status has changed to: <strong>${updatedBooking.status}</strong>.</p>`
            );

            // SMS
            if (updatedBooking.client.phone) {
                await notificationService.sendSMS(
                    updatedBooking.client.phone,
                    `[${updatedBooking.tenant.name}] Booking status updated: ${updatedBooking.status}.`,
                    tenantId
                );
            }
        }

        return updatedBooking;
    }

    async deleteBooking(tenantId, id) {
        const booking = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!booking) throw new Error('NOT_FOUND: Booking not found');

        return prisma.booking.delete({ where: { id } });
    }
}

module.exports = new BookingService();
