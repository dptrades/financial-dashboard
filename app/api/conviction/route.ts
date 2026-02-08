import { NextResponse } from 'next/server';
import { scanConviction } from '@/lib/conviction';

// Force dynamic mode so it fetches live data
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await scanConviction();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in conviction API:", error);
        return NextResponse.json({ error: "Failed to fetch conviction scores" }, { status: 500 });
    }
}
