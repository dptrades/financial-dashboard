import yahooFinance from 'yahoo-finance2';
import { calculateIndicators } from './indicators';
import { fetchSocialSentiment, calculateSentimentScore } from './news';

export interface ConvictionStock {
    symbol: string;
    name: string;
    price: number;
    score: number; // 0-100

    // Categories
    technicalScore: number;
    fundamentalScore: number;
    analystScore: number;
    sentimentScore: number;

    // Details
    metrics: {
        pe?: number;
        marketCap?: number;
        revenueGrowth?: number; // YoY
        rsi: number;
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        analystRating?: string; // "Strong Buy", etc.
        analystTarget?: number;
        socialSentiment: string; // "Bullish"
    };

    reasons: string[];
}

const CONVICTION_WATCHLIST = [
    'NVDA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'TSLA', 'AAPL', 'AMD', // Tech
    'JPM', 'V', // Finance
    'LLY', 'UNH', // Healthcare
    'XOM', // Energy
    'CAT', // Industrial
    'COIN', 'MSTR' // Crypto Proxies
];

export async function scanConviction(): Promise<ConvictionStock[]> {
    const results: ConvictionStock[] = [];

    // score weightings
    const W_TECH = 0.35;
    const W_FUND = 0.25;
    const W_ANALYST = 0.20;
    const W_SOCIAL = 0.20;

    const promises = CONVICTION_WATCHLIST.map(async (symbol) => {
        try {
            // 1. Fetch Data (Parallel)
            const [quote, ohlcv, socialNews] = await Promise.all([
                yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'defaultKeyStatistics', 'recommendationTrend', 'price'] }),
                yahooFinance.chart(symbol, { period1: '3mo', interval: '1d' }),
                fetchSocialSentiment(symbol) // Our existing mock/sim scheduler
            ]) as [any, any, any];

            if (!quote || !ohlcv || !ohlcv.quotes || ohlcv.quotes.length < 50) return null;

            // 2. Process Technicals
            // Convert YF chart data to our format
            const cleanData = ohlcv.quotes.map((q: any) => ({
                time: new Date(q.date).getTime(),
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
                volume: q.volume
            }));
            const indicators = calculateIndicators(cleanData);
            const latest = indicators[indicators.length - 1];

            let techScore = 50;
            let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            const rsi = latest.rsi14 || 50;

            // Trend
            if (latest.close > (latest.ema50 || 0) && (latest.ema50 || 0) > (latest.ema200 || 0)) {
                techScore += 20;
                trend = 'BULLISH';
            } else if (latest.close < (latest.ema50 || 0)) {
                techScore -= 20;
                trend = 'BEARISH';
            }

            // RSI
            if (rsi > 50 && rsi < 70) techScore += 10; // Momentum
            if (rsi < 30) techScore += 15; // Oversold bounce potential (risky but +ev)
            if (rsi > 80) techScore -= 10; // Overbought

            techScore = Math.max(0, Math.min(100, techScore));


            // 3. Process Fundamentals
            const financialData = quote.financialData || {};
            const keyStats = quote.defaultKeyStatistics || {};

            let fundScore = 50;
            const pe = financialData.trailingPE || 0;
            const revGrowth = financialData.revenueGrowth || 0; // 0.15 = 15%

            // Reward growth
            if (revGrowth > 0.10) fundScore += 15;
            if (revGrowth > 0.20) fundScore += 10;

            // Penalize insane valuations? Or reward momentum? Let's strictly reward quality.
            if (pe > 0 && pe < 40) fundScore += 10; // Reasonable PE
            if (pe > 100) fundScore -= 10; // Very expensive

            // Profit margins
            const margins = financialData.profitMargins || 0;
            if (margins > 0.20) fundScore += 10; // High margin business

            fundScore = Math.max(0, Math.min(100, fundScore));


            // 4. Process Analysts
            // recommendationTrend is usually an array. We want the latest.
            // But quoteSummary 'recommendationTrend' is complex. financialData has 'recommendationMean' (1=Strong Buy, 5=Sell)
            let analystScore = 50;
            const rating = financialData.recommendationMean; // 1.0 - 5.0
            let ratingText = "Neutral";

            if (rating) {
                // 1.0 - 1.5 = Strong Buy
                // 1.5 - 2.5 = Buy
                if (rating <= 2.0) {
                    analystScore = 90;
                    ratingText = "Strong Buy";
                } else if (rating <= 3.0) {
                    analystScore = 70;
                    ratingText = "Buy";
                } else if (rating > 4.0) {
                    analystScore = 20;
                    ratingText = "Sell";
                } else {
                    analystScore = 50;
                    ratingText = "Hold";
                }
            }

            const targetPrice = financialData.targetMeanPrice || 0;
            const currentPrice = financialData.currentPrice?.raw || latest.close;
            // Upside potential
            if (targetPrice > currentPrice) {
                const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
                if (upside > 10) analystScore += 10;
            }


            // 5. Process Social
            // Already fetched in Promise.all as socialNews
            const { score: socialScore, label: socialLabel } = calculateSentimentScore(socialNews);

            // 6. TOTAL SCORE
            const finalScore = (
                (techScore * W_TECH) +
                (fundScore * W_FUND) +
                (analystScore * W_ANALYST) +
                (socialScore * W_SOCIAL)
            );

            // Reasons
            const reasons: string[] = [];
            if (trend === 'BULLISH') reasons.push("Strong Technical Uptrend");
            if (techScore > 70) reasons.push("Bullish Momentum (RSI)");
            if (fundScore > 70) reasons.push("Solid Fundamentals (Growth/Margins)");
            if (analystScore > 80) reasons.push(`Analyst Consensus: ${ratingText}`);
            if (socialScore > 75) reasons.push("High Social Interest");

            return {
                symbol,
                name: (quote.price as any)?.longName || symbol,
                price: currentPrice,
                score: Math.round(finalScore),
                technicalScore: Math.round(techScore),
                fundamentalScore: Math.round(fundScore),
                analystScore: Math.round(analystScore),
                sentimentScore: Math.round(socialScore),
                metrics: {
                    pe: pe,
                    marketCap: (quote.price as any)?.marketCap || 0,
                    revenueGrowth: revGrowth,
                    rsi: Math.round(rsi),
                    trend,
                    analystRating: ratingText,
                    analystTarget: targetPrice,
                    socialSentiment: socialLabel
                },
                reasons
            } as ConvictionStock;  // Explicit cast to return type

        } catch (e) {
            console.error(`Failed to scan conviction for ${symbol}`, e);
            return null;
        }
    });

    const rawResults = await Promise.all(promises) as (ConvictionStock | null)[];
    const cleanResults = rawResults.filter(r => r !== null) as ConvictionStock[];

    // Sort by score desc
    return cleanResults.sort((a, b) => b.score - a.score);
}
