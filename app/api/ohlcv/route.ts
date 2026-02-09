import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { fetchAlpacaBars } from '@/lib/alpaca';

const yahooFinance = new YahooFinance();

// Check if ticker is a US stock (eligible for Alpaca)
function isUSStock(ticker: string): boolean {
    // Indices, forex, and futures use special characters
    if (ticker.startsWith('^')) return false; // Indices (^VIX, ^GSPC)
    if (ticker.includes('=')) return false; // Forex (EURUSD=X, JPY=X)
    if (ticker.includes('-USD')) return false; // Crypto (BTC-USD)
    if (ticker.endsWith('=F')) return false; // Futures/Commodities (GC=F)
    return true;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') || 'crypto';
    const interval = searchParams.get('interval') || '1d';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Map symbol to ticker
        let ticker = symbol.toUpperCase();
        if (market === 'crypto' && !ticker.endsWith('-USD')) {
            ticker = `${ticker}-USD`;
        }

        // Determine timeframe for Alpaca
        let alpacaTimeframe: '1Day' | '1Hour' | '15Min' = '1Day';
        let alpacaLimit = 253; // ~1 year of trading days

        switch (interval) {
            case '1m':
            case '5m':
            case '15m':
                alpacaTimeframe = '15Min';
                alpacaLimit = 500;
                break;
            case '30m':
            case '1h':
            case '60m':
            case '4h':
                alpacaTimeframe = '1Hour';
                alpacaLimit = 500;
                break;
            case '1d':
            case '1wk':
            case '1mo':
            default:
                alpacaTimeframe = '1Day';
                alpacaLimit = 1000; // ~4 years
                break;
        }

        // ===== TRY ALPACA FIRST (for US Stocks only) =====
        if (isUSStock(ticker) && market === 'stocks') {
            try {
                console.log(`[OHLCV] Trying Alpaca for ${ticker} (${alpacaTimeframe})`);
                const alpacaBars = await fetchAlpacaBars(ticker, alpacaTimeframe, alpacaLimit);

                if (alpacaBars && alpacaBars.length > 0) {
                    console.log(`[OHLCV] Alpaca returned ${alpacaBars.length} bars for ${ticker}`);

                    const data = alpacaBars.map((bar) => ({
                        time: new Date(bar.t).getTime(),
                        open: bar.o,
                        high: bar.h,
                        low: bar.l,
                        close: bar.c,
                        volume: bar.v
                    }));

                    // 4H aggregation if needed
                    if (interval === '4h' && data.length > 0) {
                        return NextResponse.json(aggregate4H(data));
                    }

                    return NextResponse.json(data);
                }
                console.log(`[OHLCV] Alpaca returned no data for ${ticker}, falling back to Yahoo`);
            } catch (alpacaError: any) {
                console.warn(`[OHLCV] Alpaca error for ${ticker}:`, alpacaError.message);
            }
        }

        // ===== FALLBACK TO YAHOO FINANCE =====
        console.log(`[OHLCV] Using Yahoo for ${ticker}`);

        const is4Hour = interval === '4h';
        const yahooInterval: any = is4Hour ? '1h' : interval;

        let range: any = '3mo';
        switch (yahooInterval) {
            case '1m': range = '5d'; break;
            case '5m':
            case '15m':
            case '30m': range = '1mo'; break;
            case '1h':
            case '60m':
            case '90m': range = '2y'; break;
            case '1d':
            case '1wk':
            case '1mo':
            default:
                range = is4Hour ? '2y' : '5y';
                break;
        }

        // Calculate period1
        const now = new Date();
        let period1 = new Date();
        switch (range) {
            case '5d': period1.setDate(now.getDate() - 5); break;
            case '1mo': period1.setMonth(now.getMonth() - 1); break;
            case '3mo': period1.setMonth(now.getMonth() - 3); break;
            case '6mo': period1.setMonth(now.getMonth() - 6); break;
            case '1y': period1.setFullYear(now.getFullYear() - 1); break;
            case '2y': period1.setFullYear(now.getFullYear() - 2); break;
            case '5y': period1.setFullYear(now.getFullYear() - 5); break;
            default: period1.setFullYear(1980); break;
        }

        const queryOptions: any = {
            period1: period1.toISOString().split('T')[0],
            interval: yahooInterval,
        };

        const result: any = await yahooFinance.chart(ticker, queryOptions);

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

        if (is4Hour && data.length > 0) {
            return NextResponse.json(aggregate4H(data));
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[OHLCV] Error:', error.message || error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message || error.toString() }, { status: 500 });
    }
}

// Helper: Aggregate 1H data into 4H candles
function aggregate4H(data: any[]): any[] {
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
    return aggregated;
}
