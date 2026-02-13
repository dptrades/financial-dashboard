import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { login } from '@/lib/auth';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const CODES_FILE = path.join(process.cwd(), 'data', 'codes.json');

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        // 1. Verify Code
        if (!fs.existsSync(CODES_FILE)) {
            return NextResponse.json({ error: 'No verification code found' }, { status: 400 });
        }

        const codes: Record<string, { code: string; expiry: number }> = JSON.parse(fs.readFileSync(CODES_FILE, 'utf-8'));
        const entry = codes[email];

        if (!entry) {
            return NextResponse.json({ error: 'No code issued for this email' }, { status: 400 });
        }

        if (Date.now() > entry.expiry) {
            delete codes[email];
            fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
            return NextResponse.json({ error: 'Code expired' }, { status: 400 });
        }

        if (entry.code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 2. Clear code
        delete codes[email];
        fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));

        // 3. Get user info
        const users: any[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find((u: any) => u.email === email);

        // 4. Create Session (4 hours)
        await login({ name: user.name, email: user.email });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Verification Error:', error);
        return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }
}
