import { NextResponse } from 'next/server';
import { login, verifyVerificationToken } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, code, verificationToken } = await req.json();

        if (!email || !code || !verificationToken) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify the Stateless Token
        const payload = await verifyVerificationToken(verificationToken);

        if (!payload) {
            return NextResponse.json({ error: 'Verification session expired or invalid' }, { status: 400 });
        }

        // 2. Security Check: Ensure email matches the token
        if (payload.email !== email) {
            return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });
        }

        // 3. Verify the 6-digit code
        if (payload.code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 4. Create Session (4 hours)
        // Note: Using payload.name to ensure we use the name from the verified token
        await login({ name: payload.name, email: payload.email });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Verification Error:', error);
        return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }
}
