import { NextResponse } from 'next/server';
import { getDayDreamPicks } from '@/lib/daydream';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log("🚀 [API/DayDream] GET request received");
    try {
        const picks = await getDayDreamPicks();
        console.log(`✅ [API/DayDream] Returning ${picks.length} picks`);
        return NextResponse.json(picks);
    } catch (error: any) {
        console.error("❌ [API/DayDream] Error:", error.message || error);
        return NextResponse.json({ error: "Failed to fetch DayDream picks", details: error.message }, { status: 500 });
    }
}
