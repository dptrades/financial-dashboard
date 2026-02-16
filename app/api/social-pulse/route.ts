import { NextResponse } from 'next/server';
import { runSmartScan, DiscoveredStock } from '@/lib/smart-scanner';
import { publicClient } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

// Global cache for Social Pulse
interface SocialPulseCache {
    data: any[];
    timestamp: number;
}

declare global {
    var _socialPulseCache: SocialPulseCache | null;
}

if (!global._socialPulseCache) {
    global._socialPulseCache = null;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET() {
    const now = Date.now();
    const marketSession = publicClient.getMarketSession();

    // 1. Market Closed Logic: Return preserved cache if available
    if (marketSession === 'OFF' && global._socialPulseCache) {
        console.log("🌙 Market Closed: Serving preserved Social Pulse cache.");
        return NextResponse.json({
            timestamp: new Date(global._socialPulseCache.timestamp).toISOString(),
            count: global._socialPulseCache.data.length,
            data: global._socialPulseCache.data,
            isMarketClosed: true
        });
    }

    // 2. Cache Logic: Return fresh cache if within TTL
    if (global._socialPulseCache && (now - global._socialPulseCache.timestamp < CACHE_TTL)) {
        console.log("⚡ Serving cached Social Pulse data.");
        return NextResponse.json({
            timestamp: new Date(global._socialPulseCache.timestamp).toISOString(),
            count: global._socialPulseCache.data.length,
            data: global._socialPulseCache.data,
            isMarketClosed: false
        });
    }

    // 3. Fresh Scan
    try {
        console.log("🔍 Triggering dynamic Social Pulse scan...");
        const discoveries = await runSmartScan();

        // Fetch live quotes for all discovered symbols in a single batch
        const symbols = discoveries.map(d => d.symbol);
        const quotes = await publicClient.getQuotes(symbols);
        const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

        // Transform discoveries into the format expected by the UI
        const formattedData = discoveries.map(d => {
            const quote = quoteMap.get(d.symbol);
            return {
                symbol: d.symbol,
                name: d.name || d.symbol,
                price: quote?.price || 0,
                change: quote?.changePercent || 0,
                heat: d.strength,
                sentiment: 0.5 + (Math.random() * 0.4), // NLP placeholder for now
                mentions: Math.round(d.strength * 50),
                retailBuyRatio: 0.5 + (Math.random() * 0.3),
                topPlatform: d.source === 'social' ? 'Twitter/X' : d.source === 'news' ? 'Google News' : 'Screener',
                description: d.signal
            };
        });

        // Update Cache
        global._socialPulseCache = {
            data: formattedData,
            timestamp: now
        };

        return NextResponse.json({
            timestamp: new Date(now).toISOString(),
            count: formattedData.length,
            data: formattedData,
            isMarketClosed: marketSession === 'OFF'
        });
    } catch (e) {
        console.error("Social Pulse scan failed:", e);
        return NextResponse.json({ error: "Failed to fetch pulse" }, { status: 500 });
    }
}
