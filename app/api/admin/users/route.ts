import { NextResponse } from 'next/server';
import { getSession, getUsersFromCSV } from "@/lib/auth";

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

        // 1. Get all users from CSV
        const users = await getUsersFromCSV();

        // 3. Return the list
        return NextResponse.json({
            count: users.length,
            users: users
        });
    } catch (error) {
        console.error('Admin API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
