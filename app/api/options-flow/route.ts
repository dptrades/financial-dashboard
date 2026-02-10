import { NextResponse } from 'next/server';
const yahooFinance = require('yahoo-finance2').default;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Instantiate if necessary (Same fix as OHLCV)
        let yf = yahooFinance;
        if (typeof yf === 'function') {
            try { yf = new (yahooFinance as any)(); } catch (e) { }
        } else if ((yahooFinance as any).default) {
            if (typeof (yahooFinance as any).default === 'function') {
                yf = new (yahooFinance as any).default();
            } else {
                yf = (yahooFinance as any).default;
            }
        }
        if (!yf.options && yahooFinance.options) yf = yahooFinance;

        // Fetch Initial Options Chain to get Expiration Dates
        const initialRes = await yf.options(symbol, {});
        if (!initialRes.options || initialRes.options.length === 0) {
            return NextResponse.json({ alerts: [] });
        }

        const expirations = initialRes.meta?.expirationDates || initialRes.expirationDates || [];
        // Scan up to 4 expirations (approx 1-2 months out)
        const targetExpirations = expirations.slice(0, 4);

        const allAlerts: any[] = [];
        const processedExpiries = new Set<string>();

        // Helper to process a single chain
        const processChain = (chain: any) => {
            const expiryDateStr = chain.expirationDate.toISOString().split('T')[0];
            if (processedExpiries.has(expiryDateStr)) return;
            processedExpiries.add(expiryDateStr);

            // Thresholds (Stricter)
            const MIN_VOL = 500;
            const MIN_NOTIONAL = 100000; // $100k
            const MIN_RATIO = 1.5; // Vol > 1.5x OI

            ['calls', 'puts'].forEach(type => {
                const isCall = type === 'calls';
                (chain[type] || []).forEach((opt: any) => {
                    const notional = opt.volume * opt.lastPrice * 100;
                    const oi = opt.openInterest || 1; // Avoid div by zero
                    const volumeOI = opt.volume / oi;

                    // Filter: High Conviction Only
                    // 1. Must be OTM (Out of The Money) typically indicates specualtion
                    // Actually, deep ITM can be hedging. Let's stick to high value.

                    // Logic: Huge Notional OR (High Volume AND High Ratio)
                    if (notional > MIN_NOTIONAL || (opt.volume > MIN_VOL && volumeOI > MIN_RATIO)) {

                        // Smart Score: (Notional in 100ks) * (Unusualness Factor)
                        // This prioritizes "Big Money" that is also "Unusual"
                        const score = (notional / 100000) * (Math.max(1, volumeOI));

                        // Direction Inference (Basic)
                        let sentiment = isCall ? 'BULLISH' : 'BEARISH';
                        let reason = 'Heavy Volume';

                        if (volumeOI > 3) reason = 'Aggressive Accumulation (>3x OI)';
                        else if (notional > 500000) reason = 'Major Whale Position (>$500k)';
                        else if (volumeOI > 1.5) reason = 'Unusual Activity';

                        allAlerts.push({
                            type: isCall ? 'CALL' : 'PUT',
                            strike: opt.strike,
                            expiry: chain.expirationDate,
                            volume: opt.volume,
                            oi: opt.openInterest,
                            ratio: volumeOI,
                            notional: notional,
                            sentiment: sentiment,
                            reason: reason,
                            score: score, // Internal sorting metric
                            lastPrice: opt.lastPrice
                        });
                    }
                });
            });
        };

        // Process the first chain we already have
        if (initialRes.options[0]) processChain(initialRes.options[0]);

        // Fetch remaining expirations in parallel
        const remainingExpiries = targetExpirations.slice(1);
        if (remainingExpiries.length > 0) {
            const promises = remainingExpiries.map((date: Date) =>
                yf.options(symbol, { date: date }).catch((e: any) => null)
            );

            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res && res.options && res.options[0]) {
                    processChain(res.options[0]);
                }
            });
        }

        // Sort by Smart Score (Highest Conviction first)
        allAlerts.sort((a, b) => b.score - a.score);

        const quote = initialRes.quote;

        return NextResponse.json({
            symbol,
            price: quote?.regularMarketPrice || 0,
            expiry: initialRes.options[0].expirationDate, // Nearest
            alerts: allAlerts.slice(0, 10) // Return Top 10 across all expiries
        });

    } catch (error: any) {
        console.error('Options API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
    }
}
