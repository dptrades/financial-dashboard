
const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET;
const BASE_URL = 'https://paper-api.alpaca.markets/v2';
const DATA_URL = 'https://data.alpaca.markets/v2';

if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    console.warn("⚠️ Alpaca API Keys missing. Using fallback data.");
}

export interface AlpacaBar {
    t: string; // Timestamp
    o: number; // Open
    h: number; // High
    l: number; // Low
    c: number; // Close
    v: number; // Volume
}

export async function fetchAlpacaBars(symbol: string, timeframe: '1Day' | '1Hour' | '15Min' = '1Day', limit: number = 100): Promise<AlpacaBar[]> {
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) return [];

    try {
        const url = `${DATA_URL}/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}&adjustment=raw&feed=iex`;

        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': ALPACA_API_KEY,
                'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Alpaca API Error ${response.status}: ${await response.text()}`);
            return [];
        }

        const data = await response.json();
        return data.bars || [];
    } catch (e) {
        console.error("Failed to fetch Alpaca bars:", e);
        return [];
    }
}

export async function fetchAlpacaPrice(symbol: string): Promise<number | null> {
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) return null;

    try {
        const url = `${DATA_URL}/stocks/${symbol}/quotes/latest?feed=iex`;

        const response = await fetch(url, {
            headers: {
                'APCA-API-KEY-ID': ALPACA_API_KEY,
                'APCA-API-SECRET-KEY': ALPACA_API_SECRET
            }
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
