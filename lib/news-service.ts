import { NewsItem } from './news';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function getNewsData(symbol: string, type: 'news' | 'social' | 'analyst' = 'news'): Promise<NewsItem[]> {
    try {
        const results = await yahooFinance.search(symbol, { newsCount: 20 });

        if (!results.news || results.news.length === 0) {
            return [];
        }

        const now = Date.now();
        const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
        const symbolUpper = symbol.toUpperCase();

        const seen = new Set<string>();
        const items: NewsItem[] = results.news
            .filter((article: any) => {
                if (!article.title || !article.link) return false;

                // Deduplicate by title
                const key = article.title.toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);

                // Filter: only articles from the last 72 hours
                if (article.providerPublishTime) {
                    // providerPublishTime is already a Date object in yahoo-finance2 v3
                    const publishedMs = new Date(article.providerPublishTime).getTime();
                    if (now - publishedMs > SEVENTY_TWO_HOURS) return false;
                }

                return true;
            })
            .sort((a: any, b: any) => {
                // Prioritize: related articles first, then by recency
                const aTitle = (a.title || '').toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                const symLower = symbol.toLowerCase();
                const aRelated = aTitle.includes(symLower) ||
                    (a.relatedTickers || []).some((t: string) => t.toUpperCase() === symbolUpper);
                const bRelated = bTitle.includes(symLower) ||
                    (b.relatedTickers || []).some((t: string) => t.toUpperCase() === symbolUpper);

                if (aRelated && !bRelated) return -1;
                if (!aRelated && bRelated) return 1;

                // Then sort by recency
                const aTime = new Date(a.providerPublishTime || 0).getTime();
                const bTime = new Date(b.providerPublishTime || 0).getTime();
                return bTime - aTime;
            })
            .slice(0, 6) // Top 6 articles
            .map((article: any, i: number) => {
                const title = article.title || '';
                const titleLower = title.toLowerCase();
                let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';

                const bullishWords = ['surge', 'jump', 'rally', 'gain', 'up', 'rise', 'high', 'beat', 'bull', 'grow', 'boost', 'soar', 'upgrade', 'breakout', 'record', 'strong'];
                const bearishWords = ['drop', 'fall', 'decline', 'down', 'slip', 'loss', 'bear', 'cut', 'warn', 'crash', 'plunge', 'sell', 'downgrade', 'risk', 'concern', 'weak'];

                if (bullishWords.some(w => titleLower.includes(w))) sentiment = 'positive';
                else if (bearishWords.some(w => titleLower.includes(w))) sentiment = 'negative';

                // providerPublishTime is already a Date object
                const publishedAt = article.providerPublishTime
                    ? new Date(article.providerPublishTime)
                    : new Date();

                // Relative time
                const diffMs = now - publishedAt.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                let timeStr: string;
                if (diffMins < 60) {
                    timeStr = `${Math.max(1, diffMins)}m ago`;
                } else if (diffHours < 24) {
                    timeStr = `${diffHours}h ago`;
                } else {
                    const diffDays = Math.floor(diffHours / 24);
                    timeStr = `${diffDays}d ago`;
                }

                return {
                    id: `news-${i}-${article.uuid || i}`,
                    title,
                    source: article.publisher || 'Yahoo Finance',
                    time: timeStr,
                    sentiment,
                    url: article.link
                };
            });

        return items;

    } catch (error) {
        console.error(`Failed to fetch news for ${symbol}:`, error);
        return [];
    }
}
