import { NextResponse } from 'next/server';
import { getSession, getUsersFromCSV, syncToGitHub } from "@/lib/auth";

const TRADER_ACCESS_KEY = process.env.TRADER_ACCESS_KEY || 'TRADER2026';

/**
 * Admin API to manually force a sync of the local CSV to GitHub.
 */
export async function POST(req: Request) {
    try {
        const adminKey = req.headers.get('x-admin-key');
        const session = await getSession();

        // Security check
        if (adminKey !== TRADER_ACCESS_KEY && !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get current CSV content
        const users = await getUsersFromCSV();
        const headers = ['Name', 'Email', 'LastLogin'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [u.name, u.email, u.lastlogin || u.lastLogin].join(','))
        ].join('\n');

        // 2. Trigger Sync (Await it for the manual trigger)
        console.log('[Admin] Force Sync requested');
        await syncToGitHub(csvContent);

        return NextResponse.json({
            message: 'Force sync completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin Sync API Error:', error);
        return NextResponse.json({ error: 'Failed to perform force sync' }, { status: 500 });
    }
}
