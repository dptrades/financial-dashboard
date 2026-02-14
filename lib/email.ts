import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.AUTH_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Sends a 6-digit verification code to the specified email address.
 * 
 * @param email The recipient's email address
 * @param code The 6-digit OTP code
 * @param name The recipient's name (optional)
 */
export async function sendOTPEmail(email: string, code: string, name?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `DP Trade Desk <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Verify your identity - DP Trade Desk',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; color: #ffffff;">
          <h2 style="color: #3b82f6; text-align: center; font-size: 24px;">Verify Your Identity</h2>
          <p style="text-align: center; color: #94a3b8;">Hello ${name || 'Trader'},</p>
          <p style="text-align: center; color: #94a3b8;">Enter the 6-digit verification code below to access the DP Trade Desk dashboard.</p>
          
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.5em; color: #ffffff;">${code}</span>
          </div>
          
          <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 32px;">
            This code will expire in 10 minutes.<br>
            If you did not request this code, please ignore this email.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0;">
          
          <p style="text-align: center; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
            DP Trade Desk • Scientific Price Analysis & Intelligence
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception in sendOTPEmail:', err);
    return { success: false, error: err };
  }
}
