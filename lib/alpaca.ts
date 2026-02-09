
const BASE_URL = 'https://paper-api.alpaca.markets/v2';
const DATA_URL = 'https://data.alpaca.markets/v2';

export interface AlpacaBar {
    t: string; // Timestamp
    o: number; // Open
    h: number; // High
    l: number; // Low
    c: number; // Close
    v: number; // Volume
}

export async function fetchAlpacaBars(symbol: string, timeframe: '1Day' | '1Hour' | '15Min' = '1Day', limit: number = 100): Promise<AlpacaBar[]> {
    // Fallback to provided keys if env vars fail
    const apiKey = process.env.ALPACA_API_KEY || 'PK3ADSJ3QHTXXWDUDT7SJDQSDG';
    const apiSecret = process.env.ALPACA_API_SECRET || '2dj3HdJqjX1VSncZrygyCFRicSPonSNTyJSYh5M5Z7z1';

    if (!apiKey || !apiSecret) {
        console.warn(`[Alpaca] Missing Keys for ${symbol}`);
        return [];
    }

    try {
        // Correct Logic: Request a time window, but ensure API limit is high enough to capture ALL bars in that window.
        // We want the LATEST 'limit' bars.
        // 1. Set start date 'limit * 2' days ago (safe buffer for holidays/weekends).
        const daysBack = limit * 2 + 10;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startIso = startDate.toISOString();

        // 2. Request limit * 5 bars (overhead) to ensure we don't truncate the end (today).
        // Alpaca max is usually 10k, we just need to exceed the number of trading days in 'daysBack'.
        // daysBack is ~ limit*2. Trading days ~ limit*1.4. So requesting limit*2 is safe.
        const apiLimit = Math.min(10000, limit * 5);

        const url = `${DATA_URL}/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${apiLimit}&start=${startIso}&adjustment=raw&feed=iex`;

        console.log(`[Alpaca] Fetching ${url}`);

        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Alpaca] Error ${response.status}: ${errorText}`);
            return [];
        }

        const data = await response.json();
        const allBars = data.bars || [];

        // 3. Return only the requested number of LATEST bars
        return allBars.slice(-limit);
    } catch (e) {
        console.error("Failed to fetch Alpaca bars:", e);
        return [];
    }
}

export async function fetchAlpacaPrice(symbol: string): Promise<number | null> {
    const apiKey = process.env.ALPACA_API_KEY || 'PK3ADSJ3QHTXXWDUDT7SJDQSDG';
    const apiSecret = process.env.ALPACA_API_SECRET || '2dj3HdJqjX1VSncZrygyCFRicSPonSNTyJSYh5M5Z7z1';

    if (!apiKey || !apiSecret) return null;

    try {
        const url = `${DATA_URL}/stocks/${symbol}/quotes/latest?feed=iex`;

        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret
            },
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        // Return mid-price or last trade if quote is empty
        if (data.quote && data.quote.ap && data.quote.bp) {
            return (data.quote.ap + data.quote.bp) / 2;
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch Alpaca price:", e);
        return null;
    }
}
