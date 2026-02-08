import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') || 'crypto';
    const interval = searchParams.get('interval') || '1d';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Map symbol to Yahoo Finance ticker
        let ticker = symbol.toUpperCase();
        if (market === 'crypto' && !ticker.endsWith('-USD')) {
            ticker = `${ticker}-USD`;
        }

        // Instantiate if necessary (Fix for "Call new YahooFinance() first")
        let yf = yahooFinance;
        // Check if it's the class constructor (function) or if we need to access default
        if (typeof yf === 'function') {
            try { yf = new (yahooFinance as any)(); } catch (e) { console.log("Instantiation failed", e); }
        } else if ((yahooFinance as any).default) {
            // Handle ESM default export weirdness
            if (typeof (yahooFinance as any).default === 'function') {
                yf = new (yahooFinance as any).default();
            } else {
                yf = (yahooFinance as any).default;
            }
        }

        // Final fallback: if `yf` doesn't have `chart`, but `yahooFinance` does, revert.
        if (!(yf as any).chart && (yahooFinance as any).chart) yf = yahooFinance;

        // Determine Range based on Interval
        const is4Hour = interval === '4h';
        const yahooInterval: any = is4Hour ? '1h' : interval;

        let range: any = '3mo';

        switch (yahooInterval) {
            case '1m':
                range = '5d'; // Max ~7d
                break;
            case '5m':
            case '15m':
            case '30m':
                range = '1mo'; // Max ~60d
                break;
            case '1h':
            case '60m':
            case '90m':
                range = '2y'; // Max ~730d
                break;
            case '1d':
            case '1wk':
            case '1mo':
            default:
                if (is4Hour) range = '2y';
                else range = '5y';
                break;
        }

        // Calculate period1 (Start Date) based on range
        const now = new Date();
        let period1 = new Date(); // Default

        switch (range) {
            case '5d': period1.setDate(now.getDate() - 5); break;
            case '1mo': period1.setMonth(now.getMonth() - 1); break;
            case '3mo': period1.setMonth(now.getMonth() - 3); break;
            case '6mo': period1.setMonth(now.getMonth() - 6); break;
            case '1y': period1.setFullYear(now.getFullYear() - 1); break;
            case '2y': period1.setFullYear(now.getFullYear() - 2); break;
            case '5y': period1.setFullYear(now.getFullYear() - 5); break;
            case '10y': period1.setFullYear(now.getFullYear() - 10); break;
            // For 'max', we pick a very old date
            default: period1.setFullYear(1980); break;
        }

        console.log(`Fetching ${ticker} via yahoo-finance2 (Interval: ${yahooInterval}, Period1: ${period1.toISOString().split('T')[0]})`);

        const queryOptions: any = {
            period1: period1.toISOString().split('T')[0], // format: YYYY-MM-DD
            interval: yahooInterval,
        };

        // Call chart on the instance
        const result: any = await (yf as any).chart(ticker, queryOptions);

        // The library 'chart' returns: { meta, timestamp, indicators } OR a processed array if using 'historical'
        // Wait, yahoo-finance2 'chart' returns the raw result object usually?
        // Actually, let's use 'historical' if possible? No, 'historical' only supports daily.
        // We MUST use 'chart' for intraday.
        // yahoo-finance2 'chart' returns: { meta, quotes: [{ date, open, high, low, close, volume }] }
        // Let's verify return type strictly or use 'any'. Using 'any' for safety now.

        // Actually checking docs: yahooFinance.chart(ticker, queryOptions) returns { meta, quotes }
        // quotes is an array of objects.

        if (!result || !result.quotes || result.quotes.length === 0) {
            throw new Error('No data returned from Yahoo');
        }

        const data = result.quotes.map((q: any) => ({
            time: new Date(q.date).getTime(),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume
        })).filter((d: any) => d.close !== null && d.open !== null);

        // Aggregate 4H data if requested
        if (is4Hour && data.length > 0) {
            const aggregated: any[] = [];
            let currentChunk: any[] = [];

            for (let i = 0; i < data.length; i++) {
                currentChunk.push(data[i]);

                if (currentChunk.length === 4 || i === data.length - 1) {
                    const first = currentChunk[0];
                    const last = currentChunk[currentChunk.length - 1];

                    const high = Math.max(...currentChunk.map(d => d.high));
                    const low = Math.min(...currentChunk.map(d => d.low));
                    const volume = currentChunk.reduce((acc, d) => acc + d.volume, 0);

                    aggregated.push({
                        time: first.time,
                        open: first.open,
                        high,
                        low,
                        close: last.close,
                        volume
                    });

                    currentChunk = [];
                }
            }
            return NextResponse.json(aggregated);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Yahoo Finance API Error:', error.message || error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message || error.toString() }, { status: 500 });
    }
}
