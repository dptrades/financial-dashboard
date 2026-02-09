import { NextResponse } from 'next/server';
import { fetchAlpacaPrice } from '@/lib/alpaca';

// Force dynamic mode for fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const price = await fetchAlpacaPrice(symbol.toUpperCase());

        if (price === null) {
            return NextResponse.json({
                price: null,
                source: 'unavailable',
                message: 'Market may be closed or data unavailable'
            });
        }

        return NextResponse.json({
            price,
            source: 'alpaca',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Live Price API] Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch live price',
            price: null
        }, { status: 500 });
    }
}
