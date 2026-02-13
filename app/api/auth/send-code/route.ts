import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateOTP } from '@/lib/auth';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const CODES_FILE = path.join(process.cwd(), 'data', 'codes.json');

export async function POST(req: Request) {
    try {
        const { name, email, disclaimerAccepted } = await req.json();

        if (!name || !email || !disclaimerAccepted) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Register/Store User Info
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            const content = fs.readFileSync(USERS_FILE, 'utf-8');
            users = content ? JSON.parse(content) : [];
        }

        // Update or Add user
        const existingUserIndex = users.findIndex((u: any) => u.email === email);
        const userData = { name, email, disclaimerAccepted, lastAccess: new Date().toISOString() };

        if (existingUserIndex > -1) {
            users[existingUserIndex] = userData;
        } else {
            users.push(userData);
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        // 2. Generate and Store OTP
        const code = generateOTP();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        let codes: Record<string, { code: string; expiry: number }> = {};
        if (fs.existsSync(CODES_FILE)) {
            const content = fs.readFileSync(CODES_FILE, 'utf-8');
            codes = content ? JSON.parse(content) : {};
        }

        codes[email] = { code, expiry };
        fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));

        // 3. "Send" Email (Mock)
        console.log(`\n--- [AUTH DEBUG] ---\nVERIFICATION CODE FOR ${email}: ${code}\n--------------------\n`);

        return NextResponse.json({ success: true, message: 'Verification code sent' });
    } catch (error) {
        console.error('Auth Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
