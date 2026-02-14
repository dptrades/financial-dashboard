const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY environment variable is not set.');
    process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function testEmail() {
    console.log('⏳ Attempting to send test email via Resend...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'DP Trade Desk <onboarding@resend.dev>',
            to: ['delivered@resend.dev'], // Resend test email
            subject: 'Diagnostic Test - DP Trade Desk',
            html: '<p>Resend API is working correctly!</p>'
        });

        if (error) {
            console.error('❌ Resend API Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Success! Resend Response:', data);
            console.log('\n--- IMPORTANT NOTE ---');
            console.log('If you used "onboarding@resend.dev", you can ONLY send to your own registered email.');
            console.log('To send to anyone else, you MUST verify a domain in the Resend dashboard.');
        }
    } catch (err) {
        console.error('❌ Unexpected Exception:', err);
    }
}

testEmail();
