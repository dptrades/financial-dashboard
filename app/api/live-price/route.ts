import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { fetchAlpacaPrice } from '@/lib/alpaca';
import { publicClient } from '@/lib/public-api';

const yahooFinance = new YahooFinance();

// Force dynamic mode for fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const ticker = symbol.toUpperCase();

        const marketSession = publicClient.getMarketSession();

        // ROUTING:
        // Regular Hours -> Alpaca (Live)
        // Extended Hours -> Locked to Close (for Headers)

        let price: number | null = null;
        let change = 0;
        let changePercent = 0;
        let previousClose = 0;
        let source = 'alpaca';

        if (marketSession === 'REG') {
            price = await fetchAlpacaPrice(ticker);
            source = 'alpaca';
        } else {
            // During off-hours, we want the "Header" to stay at close.
            // We'll fetch from Yahoo to get the official regular market close.
            source = 'yahoo (market close)';
        }

        // Always fallback to Yahoo for metadata or if Alpaca failed
        try {
            const quote: any = await yahooFinance.quote(ticker);
            if (quote) {
                if (price === null) {
                    price = quote.regularMarketPrice || null;
                }
                change = quote.regularMarketChange || 0;
                changePercent = quote.regularMarketChangePercent || 0;
                previousClose = quote.regularMarketPreviousClose || 0;
            }
        } catch (yahooError) {
            console.warn('[Live Price] Yahoo quote error:', yahooError);
        }

        if (price === null) {
            return NextResponse.json({
                price: null,
                change: 0,
                changePercent: 0,
                source: 'unavailable',
                message: 'Market may be closed or data unavailable'
            });
        }

        return NextResponse.json({
            price,
            change,
            changePercent,
            previousClose,
            marketSession,
            source,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Live Price API] Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch live price',
            price: null,
            change: 0,
            changePercent: 0
        }, { status: 500 });
    }
}
