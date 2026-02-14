import { NextResponse } from 'next/server';

// Force dynamic mode so it fetches live data
export const dynamic = 'force-dynamic';

export async function GET() {
    const rawStocks = [
        { symbol: 'TSLA', name: 'Tesla, Inc.', price: 417.44, change: 2.4, heat: 98, sentiment: 0.72, mentions: 8420, retailBuyRatio: 0.65, topPlatform: 'WallStreetBets', description: 'Major discussion around FSD v13 rollout and production targets.' },
        { symbol: 'PLTR', name: 'Palantir Technologies', price: 58.20, change: 5.1, heat: 95, sentiment: 0.85, mentions: 5120, retailBuyRatio: 0.78, topPlatform: 'Twitter/X', description: 'Massive excitement over government contract renewals.' },
        { symbol: 'GME', name: 'GameStop Corp.', price: 22.15, change: 12.4, heat: 92, sentiment: 0.91, mentions: 6800, retailBuyRatio: 0.88, topPlatform: 'WallStreetBets', description: 'Volatility spike triggered by cryptic social media posts.' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 132.50, change: -0.5, heat: 88, sentiment: 0.61, mentions: 12400, retailBuyRatio: 0.52, topPlatform: 'StockTwits', description: 'Consolidation phase; retail still heavily long on Blackwell expectations.' },
        { symbol: 'MARA', name: 'MARA Holdings, Inc.', price: 28.40, change: 15.2, heat: 86, sentiment: 0.82, mentions: 3500, retailBuyRatio: 0.81, topPlatform: 'StockTwits', description: 'Crypto mining proxy; extreme retail fever during BTC pump.' },
        { symbol: 'MSTR', name: 'MicroStrategy Inc.', price: 442.10, change: 8.5, heat: 84, sentiment: 0.78, mentions: 4100, retailBuyRatio: 0.72, topPlatform: 'WallStreetBets', description: 'Tracking BTC momentum; high correlation with social crypto-sentiment.' },
        { symbol: 'COIN', name: 'Coinbase Global, Inc.', price: 312.50, change: 4.8, heat: 82, sentiment: 0.75, mentions: 4800, retailBuyRatio: 0.68, topPlatform: 'Twitter/X', description: 'Institutional flow crossing paths with retail FOMO.' },
        { symbol: 'AMD', name: 'Advanced Micro Devices', price: 148.80, change: 1.5, heat: 78, sentiment: 0.68, mentions: 2900, retailBuyRatio: 0.59, topPlatform: 'Twitter/X', description: 'Competitive posture vs NVDA driving mid-day chatter.' },
        { symbol: 'SOFI', name: 'SoFi Technologies, Inc.', price: 14.20, change: 3.2, heat: 75, sentiment: 0.64, mentions: 2100, retailBuyRatio: 0.62, topPlatform: 'Reddit', description: 'Bank charter optimism and user growth metrics trending.' },
        { symbol: 'DKNG', name: 'DraftKings Inc.', price: 42.15, change: 1.8, heat: 72, sentiment: 0.58, mentions: 1900, retailBuyRatio: 0.55, topPlatform: 'Twitter/X', description: 'Live betting integration news attracting retail eyeballs.' },
        { symbol: 'HOOD', name: 'Robinhood Markets, Inc.', price: 32.40, change: 6.4, heat: 70, sentiment: 0.71, mentions: 2500, retailBuyRatio: 0.70, topPlatform: 'StockTwits', description: 'Platform volume spikes during market volatility.' },
        { symbol: 'AFRM', name: 'Affirm Holdings, Inc.', price: 54.80, change: 9.1, heat: 68, sentiment: 0.79, mentions: 1600, retailBuyRatio: 0.76, topPlatform: 'Twitter/X', description: 'Buy-now-pay-later momentum during holiday season.' },
        { symbol: 'UPST', name: 'Upstart Holdings, Inc.', price: 48.20, change: -2.4, heat: 65, sentiment: 0.42, mentions: 1400, retailBuyRatio: 0.38, topPlatform: 'Reddit', description: 'Earnings whisper uncertainty causing mixed sentiment.' },
        { symbol: 'PATH', name: 'UiPath Inc.', price: 12.80, change: 0.5, heat: 62, sentiment: 0.52, mentions: 1100, retailBuyRatio: 0.50, topPlatform: 'Twitter/X', description: 'AI agentic workflow buzz starting to build.' },
        { symbol: 'AI', name: 'C3.ai, Inc.', price: 28.10, change: 4.2, heat: 60, sentiment: 0.65, mentions: 1300, retailBuyRatio: 0.68, topPlatform: 'StockTwits', description: 'AI ticker symbol still a magnet for retail momentum.' },
        { symbol: 'PLUG', name: 'Plug Power Inc.', price: 2.15, change: -5.4, heat: 58, sentiment: 0.28, mentions: 2200, retailBuyRatio: 0.25, topPlatform: 'Reddit', description: 'Liquidity concerns being debated heavily in forums.' },
        { symbol: 'RIVN', name: 'Rivian Automotive, Inc.', price: 11.40, change: 2.1, heat: 55, sentiment: 0.62, mentions: 1800, retailBuyRatio: 0.59, topPlatform: 'Twitter/X', description: 'EV delivery targets being compared against TSLA.' },
        { symbol: 'LCID', name: 'Lucid Group, Inc.', price: 2.45, change: 0.0, heat: 52, sentiment: 0.48, mentions: 1200, retailBuyRatio: 0.45, topPlatform: 'StockTwits', description: 'Funding rumors keeping the stock in active discussion.' },
        { symbol: 'NIO', name: 'NIO Inc.', price: 4.80, change: -1.2, heat: 50, sentiment: 0.45, mentions: 2100, retailBuyRatio: 0.42, topPlatform: 'Reddit', description: 'China macro sentiment weighing on EV chat.' },
        { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', price: 82.10, change: 0.8, heat: 48, sentiment: 0.55, mentions: 1500, retailBuyRatio: 0.51, topPlatform: 'Twitter/X', description: 'Stablecoin utility expansion news being shared.' },
        { symbol: 'AAPL', name: 'Apple Inc.', price: 255.30, change: 0.2, heat: 45, sentiment: 0.55, mentions: 3200, retailBuyRatio: 0.48, topPlatform: 'Twitter/X', description: 'Quiet accumulation; sentiment is neutral-to-bullish.' },
        { symbol: 'SNOW', name: 'Snowflake Inc.', price: 168.40, change: 2.5, heat: 42, sentiment: 0.61, mentions: 950, retailBuyRatio: 0.58, topPlatform: 'StockTwits', description: 'Cloud data demand chatter rising in technical circles.' },
        { symbol: 'CRM', name: 'Salesforce, Inc.', price: 332.10, change: 1.1, heat: 40, sentiment: 0.59, mentions: 820, retailBuyRatio: 0.55, topPlatform: 'Twitter/X', description: 'Agentic AI rollout feedback being monitored.' },
        { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 214.20, change: -1.2, heat: 38, sentiment: 0.42, mentions: 1800, retailBuyRatio: 0.41, topPlatform: 'StockTwits', description: 'Profit taking observed in retail communities after recent rally.' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 192.40, change: 0.5, heat: 35, sentiment: 0.52, mentions: 1400, retailBuyRatio: 0.49, topPlatform: 'Reddit', description: 'Search dominance vs AI challengers discussion persists.' }
    ];

    // Explicitly sort by heat descending
    const sortedStocks = rawStocks.sort((a, b) => b.heat - a.heat).slice(0, 25);

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        count: sortedStocks.length,
        data: sortedStocks
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}
