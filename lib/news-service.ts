import { NewsItem } from './news';

// MOCK DATA GENERATOR because RSS feeds are unreliable/blocked
export async function getNewsData(symbol: string, type: 'news' | 'social' | 'analyst' = 'news'): Promise<NewsItem[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const now = new Date();
    const items: NewsItem[] = [];
    const count = type === 'analyst' ? 5 : 8;

    for (let i = 0; i < count; i++) {
        const time = new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000);

        if (type === 'analyst') {
            const actions = ['Upgrade', 'Downgrade', 'Maintain', 'Initiate', 'Price Target Raise'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            const firms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Citi', 'Barclays', 'Wedbush'];
            const firm = firms[Math.floor(Math.random() * firms.length)];
            const sentiment = (action === 'Upgrade' || action === 'Price Target Raise') ? 'positive' :
                (action === 'Downgrade') ? 'negative' : 'neutral';

            items.push({
                id: `analyst-${i}`,
                title: `${firm} performs ${action} on ${symbol}: check details inside`,
                source: firm,
                time: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                sentiment: sentiment,
                url: `https://finance.yahoo.com/quote/${symbol}`
            });
        } else {
            // News & Social
            const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

            const bullishTitles = [
                `${symbol} Surges as Earnings Beat Estimates`,
                `Why ${symbol} Could Hit New Highs This Week`,
                `Options Traders Pile into ${symbol} Calls`,
                `${symbol} Announces Strategic Partnership`,
                `Major Breakout Detected on ${symbol} Chart`
            ];
            const bearishTitles = [
                `${symbol} Slides on Regulatory Concerns`,
                `Why Analysts are Cautious on ${symbol}`,
                `Profit Taking Hits ${symbol} After Rally`,
                `${symbol} faces resistance at key technical levels`,
                `Insider Selling Reported at ${symbol}`
            ];
            const neutralTitles = [
                `${symbol} Consolidates Ahead of Fed Meeting`,
                `Market Volatility Impacts ${symbol} Trading`,
                `What to Expect from ${symbol} Next Quarter`,
                `${symbol} Trading Volume Spikes`,
                `Sector Analysis: Where ${symbol} Fits In`
            ];

            const titlePool = sentiment === 'positive' ? bullishTitles : sentiment === 'negative' ? bearishTitles : neutralTitles;
            const sources = type === 'social' ? ['Reddit', 'StockTwits', 'Twitter'] : ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch', 'Yahoo Finance'];

            items.push({
                id: `news-${i}`,
                title: titlePool[Math.floor(Math.random() * titlePool.length)],
                source: sources[Math.floor(Math.random() * sources.length)],
                time: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                sentiment: sentiment,
                url: `https://finance.yahoo.com/quote/${symbol}/news`
            });
        }
    }

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
