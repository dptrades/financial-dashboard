import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { fetchAlpacaPrice } from '@/lib/alpaca';

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

        // Try to get live price from Alpaca first
        const alpacaPrice = await fetchAlpacaPrice(ticker);

        // Fetch quote data from Yahoo for change info
        let change = 0;
        let changePercent = 0;
        let previousClose = 0;
        let price = alpacaPrice;

        try {
            const quote: any = await yahooFinance.quote(ticker);
            if (quote) {
                change = quote.regularMarketChange || 0;
                changePercent = quote.regularMarketChangePercent || 0;
                previousClose = quote.regularMarketPreviousClose || 0;

                // Use Yahoo price if Alpaca isn't available
                if (price === null) {
                    price = quote.regularMarketPrice || null;
                }
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
            source: alpacaPrice !== null ? 'alpaca' : 'yahoo',
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
