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

        let price: number | null = null;
        let change = 0;
        let changePercent = 0;
        let previousClose = 0;
        let source = 'alpaca';

        // 1. Try Public.com First for High-Fidelity & Extended Hours
        const publicQuote = await publicClient.getQuote(ticker, true); // forceRefresh
        if (publicQuote) {
            price = publicQuote.price;
            change = publicQuote.change;
            changePercent = publicQuote.changePercent;
            source = 'public.com (professional)';
        }

        // 2. If Regular Session, try Alpaca for even lower latency
        if (marketSession === 'REG') {
            try {
                const alpacaPrice = await fetchAlpacaPrice(ticker);
                if (alpacaPrice) {
                    price = alpacaPrice;
                    source = 'alpaca (real-time)';
                }
            } catch (e) {
                console.warn(`[Live Price] Alpaca fetch failed for ${ticker}`);
            }
        }

        let regularMarketPrice = 0;
        let regularMarketChange = 0;
        let regularMarketChangePercent = 0;
        let postMarketPrice = 0;
        let postMarketChange = 0;
        let postMarketChangePercent = 0;

        // 3. Fallback/Metadata from Yahoo Finance
        try {
            const quote: any = await yahooFinance.quote(ticker);
            if (quote) {
                regularMarketPrice = quote.regularMarketPrice || 0;
                regularMarketChange = quote.regularMarketChange || 0;
                regularMarketChangePercent = quote.regularMarketChangePercent || 0;

                postMarketPrice = quote.postMarketPrice || quote.regularMarketPrice || 0;
                postMarketChange = quote.postMarketChange || 0;
                postMarketChangePercent = quote.postMarketChangePercent || 0;

                if (price === null) {
                    // During OFF sessions, we prefer the most recent price (Post > Regular)
                    price = (marketSession !== 'REG' && quote.postMarketPrice) ? quote.postMarketPrice : quote.regularMarketPrice;
                    change = (marketSession !== 'REG' && quote.postMarketChange) ? quote.postMarketChange : quote.regularMarketChange;
                    changePercent = (marketSession !== 'REG' && quote.postMarketChangePercent) ? quote.postMarketChangePercent : quote.regularMarketChangePercent;
                    source = 'yahoo finance';
                }
                previousClose = quote.regularMarketPreviousClose || 0;
            }
        } catch (yahooError) {
            console.warn('[Live Price] Yahoo quote error:', yahooError);
        }

        // If Yahoo failed to provide regular values, use current as fallback
        if (!regularMarketPrice && price) regularMarketPrice = price;
        if (!regularMarketChange && change) regularMarketChange = change;
        if (!regularMarketChangePercent && changePercent) regularMarketChangePercent = changePercent;

        if (price === null) {
            return NextResponse.json({
                price: null,
                change: 0,
                changePercent: 0,
                source: 'unavailable',
                message: 'Data unavailable'
            });
        }

        return NextResponse.json({
            price,
            regularMarketPrice,
            postMarketPrice,
            change,
            changePercent,
            regularMarketChange,
            regularMarketChangePercent,
            postMarketChange,
            postMarketChangePercent,
            previousClose,
            marketSession,
            source,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
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
