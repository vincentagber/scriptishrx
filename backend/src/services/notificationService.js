const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

class NotificationService {
    constructor() {
        // Email Setup
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.emailProvider = sgMail;
        } else {
            console.warn('⚠️ NotificationService: SENDGRID_API_KEY missing. Email will be logged to console.');
        }

        // SMS Setup
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.smsProvider = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        } else {
            console.warn('⚠️ NotificationService: TWILIO_CREDS missing. SMS will be logged to console.');
        }
    }

    async sendEmail(to, subject, html) {
        if (!to) return;

        if (this.emailProvider) {
            try {
                await this.emailProvider.send({
                    to,
                    from: process.env.EMAIL_FROM || 'noreply@scriptishrx.com',
                    subject,
                    html,
                });
                console.log(`📧 Email sent to ${to}`);
            } catch (error) {
                console.error(`❌ Email Failed (${to}):`, error.message);
            }
        } else {
            console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${html.substring(0, 50)}...`);
        }
    }

    async sendSMS(to, body) {
        if (!to) return;

        if (this.smsProvider && this.twilioPhone) {
            try {
                await this.smsProvider.messages.create({
                    body,
                    from: this.twilioPhone,
                    to
                });
                console.log(`📱 SMS sent to ${to}`);
            } catch (error) {
                console.error(`❌ SMS Failed (${to}):`, error.message);
            }
        } else {
            console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
        }
    }
}

module.exports = new NotificationService();
