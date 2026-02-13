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

        // 1. Try Public.com First (Primary Source)
        const publicQuote = await publicClient.getQuote(ticker);

        // 2. Fallback to Alpaca
        const alpacaPrice = publicQuote ? null : await fetchAlpacaPrice(ticker);

        // Fetch quote data from Yahoo for change info (if Public.com didn't provide it)
        let price = publicQuote?.price || alpacaPrice;
        let change = publicQuote?.change || 0;
        let changePercent = publicQuote?.changePercent || 0;
        let previousClose = 0;

        let source = 'public.com';
        if (!publicQuote) {
            if (publicClient.lastError) {
                source = `public.com (${publicClient.lastError.toLowerCase()})`;
            } else if (alpacaPrice !== null) {
                source = 'alpaca';
            } else {
                source = 'yahoo';
            }
        }

        // 3. Fallback/Complement with Yahoo for metrics
        try {
            const quote: any = await yahooFinance.quote(ticker);
            if (quote) {
                if (price === null) price = quote.regularMarketPrice || null;
                if (!publicQuote) {
                    change = quote.regularMarketChange || 0;
                    changePercent = quote.regularMarketChangePercent || 0;
                }
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
