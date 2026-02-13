import { NextResponse } from 'next/server';
import { generateOTP, createVerificationToken } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { name, email, disclaimerAccepted } = await req.json();

        if (!name || !email || !disclaimerAccepted) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Generate OTP
        const code = generateOTP();

        // 2. Create Stateless Verification Token
        // This token holds the code and user details securely (signed)
        const verificationToken = await createVerificationToken({ email, name, code });

        // 3. "Send" Email (Mock)
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
