import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv";
import { getSession } from "@/lib/auth";

const TRADER_ACCESS_KEY = process.env.TRADER_ACCESS_KEY || 'TRADER2026';

/**
 * Admin API to list all registered users.
 * Requires the Trader Access Key to be passed in a custom header 'x-admin-key'
 * or for the requester to have an active session.
 */
export async function GET(req: Request) {
    try {
        const adminKey = req.headers.get('x-admin-key');
        const session = await getSession();

        // Security check
        if (adminKey !== TRADER_ACCESS_KEY && !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get all email addresses from the 'users' set
        const emails = await kv.smembers('users');

        if (!emails || emails.length === 0) {
            return NextResponse.json({ users: [] });
        }

        // 2. Fetch details for each user
        const userPromises = emails.map(email => kv.hgetall(`user:${email}`));
        const users = await Promise.all(userPromises);

        // 3. Filter out any nulls and return
        return NextResponse.json({
            count: users.length,
            users: users.filter(u => u !== null)
        });
    } catch (error) {
        console.error('Admin API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
