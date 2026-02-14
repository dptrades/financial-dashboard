import { NextResponse } from 'next/server';
import { generateOTP, createVerificationToken } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { name, email, disclaimerAccepted } = await req.json();

        if (!name || !email || !disclaimerAccepted) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Generate OTP
        const code = generateOTP();

        // 2. Create Stateless Verification Token
        const verificationToken = await createVerificationToken({ email, name, code });

        // 3. Send Real Email via Resend
        const emailResult = await sendOTPEmail(email, code, name);

        if (!emailResult.success) {
            console.error('Failed to send email:', emailResult.error);

            // Provide a specific error message if it's a domain/onboarding restriction
            const errorMessage = (emailResult.error as any)?.message || '';
            if (errorMessage.includes('onboarding@resend.dev')) {
                return NextResponse.json({
                    error: 'Resend Restriction: Since you are using a test account (onboarding@resend.dev), you can ONLY send emails to the address you signed up with. Please verify your domain in Resend to send to any address.'
                }, { status: 403 });
            }

            return NextResponse.json({ error: 'Failed to send verification email. Please check your Resend API Key and dashboard.' }, { status: 500 });
        }

        // 4. Redundant "Send" Email (Mock/Log for server visibility)
        console.log(`\n--- [AUTH DEBUG] ---\nVERIFICATION CODE FOR ${email}: ${code}\n--------------------\n`);

        // Return the token to the client so it can pass it back during verification
        return NextResponse.json({
            success: true,
            message: 'Verification code sent',
            verificationToken
        });
    } catch (error) {
        console.error('Auth Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
