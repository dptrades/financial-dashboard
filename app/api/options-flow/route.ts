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

        // Fetch Options Chain (Nearest Expiry)
        const result = await yf.options(symbol, {});

        if (!result.options || result.options.length === 0) {
            return NextResponse.json({ alerts: [] });
        }

        const chain = result.options[0]; // Nearest expiry
        const alerts: any[] = [];

        // Thresholds
        const MIN_VOL = 500;
        const MIN_NOTIONAL = 50000; // $50k

        // Process Calls
        chain.calls.forEach((opt: any) => {
            const notional = opt.volume * opt.lastPrice * 100;
            const volumeOI = opt.openInterest > 0 ? (opt.volume / opt.openInterest) : 0;

            // Whale Logic: High Volume OR High Vol/OI Ratio
            if ((opt.volume > MIN_VOL || notional > MIN_NOTIONAL) && opt.inTheMoney === false) {
                alerts.push({
                    type: 'CALL',
                    strike: opt.strike,
                    expiry: chain.expirationDate,
                    volume: opt.volume,
                    oi: opt.openInterest,
                    ratio: volumeOI,
                    notional: notional,
                    sentiment: 'BULLISH',
                    reason: volumeOI > 2 ? 'Aggressive Opening' : 'Heavy Volume'
                });
            }
        });

        // Process Puts
        chain.puts.forEach((opt: any) => {
            const notional = opt.volume * opt.lastPrice * 100;
            const volumeOI = opt.openInterest > 0 ? (opt.volume / opt.openInterest) : 0;

            if ((opt.volume > MIN_VOL || notional > MIN_NOTIONAL) && opt.inTheMoney === false) {
                alerts.push({
                    type: 'PUT',
                    strike: opt.strike,
                    expiry: chain.expirationDate,
                    volume: opt.volume,
                    oi: opt.openInterest,
                    ratio: volumeOI,
                    notional: notional,
                    sentiment: 'BEARISH',
                    reason: volumeOI > 2 ? 'Aggressive Hedging' : 'Heavy Volume'
                });
            }
        });

        // Sort by Notional Value (Biggest money first)
        alerts.sort((a, b) => b.notional - a.notional);

        const quote = result.quote;

        return NextResponse.json({
            symbol,
            price: quote?.regularMarketPrice || 0,
            expiry: chain.expirationDate,
            alerts: alerts.slice(0, 5) // Return Top 5 
        });

    } catch (error: any) {
        console.error('Options API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
    }
}
