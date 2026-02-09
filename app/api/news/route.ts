import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'news'; // 'news' or 'social'

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        let query = encodeURIComponent(symbol + " stock");
        if (type === 'social') {
            query = "site:reddit.com OR site:stocktwits.com " + encodeURIComponent(symbol + " stock discussion");
        } else if (type === 'analyst') {
            query = encodeURIComponent(symbol) + " (upgrade OR downgrade OR \"price target\" OR \"buy rating\" OR \"sell rating\")";
        }

        const rssUrl = "https://news.google.com/rss/search?q=" + query + "&hl=en-US&gl=US&ceid=US:en";
        const response = await fetch(rssUrl);
        const xmlText = await response.text();

        // Simple Regex Parser for RSS (avoiding heavier libraries)
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xmlText)) !== null) {
            const itemContent = match[1];

            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            const sourceMatch = itemContent.match(/<source url=".*?">(.*?)<\/source>/);

            if (titleMatch && linkMatch && pubDateMatch) {
                let title = titleMatch[1].replace(' - ' + (sourceMatch ? sourceMatch[1] : ''), ''); // Clean title
                let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
                let source = sourceMatch ? sourceMatch[1] : 'Google News';

                // Override Source for Social
                if (type === 'social') {
                    if (linkMatch[1].includes('reddit.com')) source = 'Reddit';
                    else if (linkMatch[1].includes('stocktwits.com')) source = 'StockTwits';
                    else if (linkMatch[1].includes('twitter.com') || linkMatch[1].includes('x.com')) source = 'X (Twitter)';
                }

                // Basic Sentiment Analysis
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.match(/surge|jump|soar|rally|beat|active|buy|upgrade|record|high|moon|yolo|calls/)) {
                    sentiment = 'positive';
                } else if (lowerTitle.match(/drop|fall|plunge|miss|slide|sell|downgrade|risk|low|crash|dumps|puts/)) {
                    sentiment = 'negative';
                }

                const pubDate = new Date(pubDateMatch[1]);

                items.push({
                    id: Math.random().toString(36).substr(2, 9),
                    title: title,
                    source: source,
                    time: pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    timestamp: pubDate.getTime(), // For sorting
                    sentiment: sentiment,
                    url: linkMatch[1]
                });
            }
        }

        // Filter to last 48 hours and sort by newest first
        const now = Date.now();
        const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

        const filteredItems = items
            .filter((item: any) => item.timestamp >= fortyEightHoursAgo)
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .map(({ timestamp, ...rest }: any) => rest); // Remove timestamp from response

        return NextResponse.json(filteredItems.slice(0, 10)); // Return top 10

    } catch (error) {
        console.error("News Fetch Error:", error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
