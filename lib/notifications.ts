/**
 * Notification Service
 * Sends email and SMS alerts for trading discoveries
 */

export interface NotificationPayload {
    subject: string;
    message: string;
    stocks?: Array<{
        symbol: string;
        signal: string;
        strength: number;
    }>;
}

// Email configuration
const ALERT_EMAIL = 'options.trade.email@gmail.com';
const ALERT_PHONE = '+14108040291'; // Format for Twilio

/**
 * Send email notification via Resend
 * Requires: RESEND_API_KEY environment variable
 */
export async function sendEmailAlert(payload: NotificationPayload): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.log('[Notify] Email skipped - RESEND_API_KEY not configured');
        return false;
    }

    try {
        // Format stock list as HTML table
        let stocksHtml = '';
        if (payload.stocks && payload.stocks.length > 0) {
            stocksHtml = `
                <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                    <tr style="background: #1e293b; color: white;">
                        <th style="padding: 10px; text-align: left;">Symbol</th>
                        <th style="padding: 10px; text-align: left;">Signal</th>
                        <th style="padding: 10px; text-align: right;">Strength</th>
                    </tr>
                    ${payload.stocks.map((s, i) => `
                        <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#e2e8f0'};">
                            <td style="padding: 10px; font-weight: bold;">${s.symbol}</td>
                            <td style="padding: 10px;">${s.signal}</td>
                            <td style="padding: 10px; text-align: right; color: ${s.strength >= 70 ? '#16a34a' : '#f59e0b'};">${s.strength}%</td>
                        </tr>
                    `).join('')}
                </table>
            `;
        }

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🎯 DP TradeDesk Alert</h1>
                </div>
                <div style="padding: 20px; background: #f8fafc;">
                    <p style="font-size: 16px; color: #334155;">${payload.message}</p>
                    ${stocksHtml}
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <a href="https://financial-dashboard-ten-sigma.vercel.app/conviction" 
                           style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            View Alpha Hunter →
                        </a>
                    </div>
                </div>
                <div style="padding: 15px; background: #1e293b; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">DP TradeDesk • Automated Trading Alerts</p>
                </div>
            </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'DP TradeDesk <alerts@resend.dev>',
                to: [ALERT_EMAIL],
                subject: payload.subject,
                html: html
            })
        });

        if (response.ok) {
            console.log(`[Notify] Email sent to ${ALERT_EMAIL}`);
            return true;
        } else {
            const error = await response.text();
            console.error('[Notify] Email failed:', error);
            return false;
        }
    } catch (e) {
        console.error('[Notify] Email error:', e);
        return false;
    }
}

/**
 * Send SMS notification via Twilio
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
export async function sendSMSAlert(payload: NotificationPayload): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
        console.log('[Notify] SMS skipped - Twilio credentials not configured');
        return false;
    }

    try {
        // Format SMS message (keep it short)
        let smsBody = `🎯 ${payload.subject}\n\n`;

        if (payload.stocks && payload.stocks.length > 0) {
            const topStocks = payload.stocks.slice(0, 5);
            smsBody += topStocks.map(s => `${s.symbol}: ${s.signal} (${s.strength}%)`).join('\n');
            if (payload.stocks.length > 5) {
                smsBody += `\n+${payload.stocks.length - 5} more...`;
            }
        } else {
            smsBody += payload.message;
        }

        smsBody += '\n\n📱 DP TradeDesk';

        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                To: ALERT_PHONE,
                From: fromPhone,
                Body: smsBody
            })
        });

        if (response.ok) {
            console.log(`[Notify] SMS sent to ${ALERT_PHONE}`);
            return true;
        } else {
            const error = await response.text();
            console.error('[Notify] SMS failed:', error);
            return false;
        }
    } catch (e) {
        console.error('[Notify] SMS error:', e);
        return false;
    }
}

/**
 * Send both email and SMS alerts
 */
export async function sendAlerts(payload: NotificationPayload): Promise<{ email: boolean; sms: boolean }> {
    const [emailResult, smsResult] = await Promise.all([
        sendEmailAlert(payload),
        sendSMSAlert(payload)
    ]);

    return {
        email: emailResult,
        sms: smsResult
    };
}
